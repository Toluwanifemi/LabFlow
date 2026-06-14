import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { addPhaseToSample } from '@/lib/db/samples';
import { writeAuditLog } from '@/lib/db/audit';
import { updatePhaseSchema } from '@/lib/validators/sample';
import { prisma } from '@/lib/db/client';

function getIpAddress(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'update_phase')) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updatePhaseSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { phase } = parsed.data;

    const existing = await prisma.sample.findUnique({
      where: { id: params.id, labId: session.user.labId },
      select: { currentPhase: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    const updated = await addPhaseToSample(params.id, phase, session.user.name || 'Unknown User', session.user.labId, session.user.id);

    await writeAuditLog({
      userId: session.user.id,
      actionType: 'PHASE_CHANGE',
      sampleId: params.id,
      fieldChanged: 'currentPhase',
      oldValue: existing.currentPhase,
      newValue: phase,
      ipAddress: getIpAddress(req),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/samples/[id]/phases]', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
