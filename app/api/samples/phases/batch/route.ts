import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { batchUpdatePhase } from '@/lib/db/phases';
import { getSamplesByIds } from '@/lib/db/samples';
import { writeAuditLog } from '@/lib/db/audit';
import { getIpAddress } from '@/lib/api/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.labId || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userLabId = session.user.labId;
    const userRole = session.user.role;
    const userName = session.user.name || 'Unknown User';

    if (!canPerformAction(userRole, 'update_phase')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { sampleIds, phaseName, experimentName } = body;

    const PREDEFINED_PHASES = ['Collection', 'Experiment', 'Completion'];
    if (
      !Array.isArray(sampleIds) || sampleIds.length === 0 ||
      !phaseName?.trim() || !PREDEFINED_PHASES.includes(phaseName)
    ) {
      return NextResponse.json(
        { error: 'Invalid input. Provide sampleIds array and a valid phaseName.' },
        { status: 400 }
      );
    }

    if (phaseName === 'Experiment' && !experimentName?.trim()) {
      return NextResponse.json(
        { error: 'Experiment name is required when phase is Experiment.' },
        { status: 400 }
      );
    }

    const existingSamples = await getSamplesByIds(sampleIds, userLabId);

    if (existingSamples.length !== sampleIds.length) {
      const foundIds = new Set(existingSamples.map((s) => s.id));
      const missingIds = sampleIds.filter((id: string) => !foundIds.has(id));
      return NextResponse.json(
        { error: `This sample does not exist.`, missingIds },
        { status: 400 }
      );
    }

    const oldPhaseMap = new Map(existingSamples.map((s) => [s.id, s.currentPhase]));

    const updated = await batchUpdatePhase(
      sampleIds, phaseName.trim(), userName, userLabId,
      { experimentName: experimentName?.trim() },
    );

    const auditNewValue = experimentName?.trim() ? `Experiment — ${experimentName.trim()}` : phaseName.trim();

    const auditResults = await Promise.allSettled(
      updated.map((sample) =>
        writeAuditLog({
          userId,
          actionType: 'PHASE_CHANGE',
          sampleId: sample.id,
          fieldChanged: 'currentPhase',
          oldValue: oldPhaseMap.get(sample.id) ?? null,
          newValue: auditNewValue,
          ipAddress: getIpAddress(req),
          labId: userLabId,
        })
      )
    );
    for (const r of auditResults) {
      if (r.status === 'rejected') {
        console.error('[POST /api/samples/phases/batch] Audit log write failed:', r.reason);
      }
    }

    return NextResponse.json({ updated: updated.length }, { status: 200 });

  } catch (error) {
    console.error('[POST /api/samples/phases/batch]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
