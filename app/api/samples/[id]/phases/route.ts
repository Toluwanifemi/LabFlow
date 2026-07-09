import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { addPhaseToSample, getSamplePhase } from '@/lib/db/phases';
import { writeAuditLog } from '@/lib/db/audit';
import { updatePhaseSchema } from '@/lib/validators/sample';
import { getIpAddress } from '@/lib/api/utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'update_phase')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updatePhaseSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { phase, experimentName } = parsed.data;

    const existing = await getSamplePhase(params.id, session.user.labId);

    if (!existing) {
      return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
    }

    const updated = await addPhaseToSample(params.id, phase, session.user.name || 'Unknown User', session.user.labId, {
      experimentName,
      userId: session.user.id,
    });

    const auditNewValue = experimentName ? `Experiment — ${experimentName}` : phase;

    await writeAuditLog({
      userId: session.user.id,
      actionType: 'PHASE_CHANGE',
      sampleId: params.id,
      fieldChanged: 'currentPhase',
      oldValue: existing.currentPhase,
      newValue: auditNewValue,
      ipAddress: getIpAddress(req),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/samples/[id]/phases]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
