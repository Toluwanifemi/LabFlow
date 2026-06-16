import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { batchUpdatePhase } from '@/lib/db/phases';
import { getSamplesByIds } from '@/lib/db/samples';
import { getUserByEmailWithLab } from '@/lib/db/users';
import { writeAuditLog } from '@/lib/db/audit';
import { getIpAddress } from '@/lib/api/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getUserByEmailWithLab(session.user.email);

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    if (!canPerformAction(dbUser.role, 'update_phase')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { sampleIds, phaseName } = body;

    if (!Array.isArray(sampleIds) || sampleIds.length === 0 || !phaseName?.trim()) {
      return NextResponse.json(
        { error: 'Invalid input. Provide sampleIds array and phaseName.' },
        { status: 400 }
      );
    }

    const existingSamples = await getSamplesByIds(sampleIds, dbUser.labId);
    const oldPhaseMap = new Map(existingSamples.map((s) => [s.id, s.currentPhase]));

    const updated = await batchUpdatePhase(
      sampleIds, phaseName.trim(), dbUser.id, dbUser.name, dbUser.labId,
    );

    for (const sample of updated) {
      await writeAuditLog({
        userId: dbUser.id,
        actionType: 'PHASE_CHANGE',
        sampleId: sample.id,
        fieldChanged: 'currentPhase',
        oldValue: oldPhaseMap.get(sample.id) ?? null,
        newValue: phaseName.trim(),
        ipAddress: getIpAddress(req),
      });
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
