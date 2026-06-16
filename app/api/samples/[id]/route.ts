import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { getSampleById, softDeleteSample, restoreSample, updateSample } from '@/lib/db/samples';
import { writeAuditLog } from '@/lib/db/audit';
import { createSampleSchema } from '@/lib/validators/sample';
import { getIpAddress } from '@/lib/api/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sample = await getSampleById(params.id, session.user.labId);
    
    if (!sample) {
      return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
    }

    return NextResponse.json(sample, { status: 200 });
  } catch (error) {
    console.error('[GET /api/samples/[id]]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    if (body.isDeleted === true) {
      if (!canPerformAction(session.user.role, 'soft_delete_sample')) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
      }
      const updated = await softDeleteSample(params.id, session.user.id, session.user.labId);
      
      await writeAuditLog({
        userId: session.user.id,
        actionType: 'DELETE',
        sampleId: params.id,
        ipAddress: getIpAddress(req),
      });
      
      return NextResponse.json(updated, { status: 200 });
    }

    if (body.isDeleted === false) {
      if (!canPerformAction(session.user.role, 'restore_sample')) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
      }
      
      const updated = await restoreSample(params.id, session.user.labId);

      await writeAuditLog({
        userId: session.user.id,
        actionType: 'RESTORE',
        sampleId: params.id,
        ipAddress: getIpAddress(req),
      });

      return NextResponse.json(updated, { status: 200 });
    }

    // Handle editing sample fields
    if (!canPerformAction(session.user.role, 'edit_sample')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const parsed = createSampleSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await getSampleById(params.id, session.user.labId);

    if (!existing) {
      return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
    }

    const data = parsed.data;
    const updateData: any = { ...data };
    if (data.collectionDate) {
      updateData.collectionDate = new Date(data.collectionDate);
    }

    const updated = await updateSample(params.id, session.user.labId, updateData);

    const changedFields: Record<string, { oldValue: string; newValue: string }> = {};
    const trackedFields: Array<keyof typeof data> = ['sampleType', 'source', 'description', 'experimentType', 'collectionDate'];

    for (const field of trackedFields) {
      if (field in data && data[field] !== undefined) {
        const oldVal = existing[field as keyof typeof existing];
        const newVal = data[field];
        const oldStr = String(oldVal ?? '');
        const newStr = String(newVal ?? '');

        if (oldStr !== newStr) {
          changedFields[field] = { oldValue: oldStr, newValue: newStr };
        }
      }
    }

    for (const [field, vals] of Object.entries(changedFields)) {
      await writeAuditLog({
        userId: session.user.id,
        actionType: 'UPDATE',
        sampleId: params.id,
        fieldChanged: field,
        oldValue: vals.oldValue,
        newValue: vals.newValue,
        ipAddress: getIpAddress(req),
      });
    }

    if (Object.keys(changedFields).length === 0) {
      await writeAuditLog({
        userId: session.user.id,
        actionType: 'UPDATE',
        sampleId: params.id,
        ipAddress: getIpAddress(req),
      });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/samples/[id]]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
