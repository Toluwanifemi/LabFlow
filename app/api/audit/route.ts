import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { getAuditLogsForLab } from '@/lib/db/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'view_audit_log')) {
      return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
    }

    const logs = await getAuditLogsForLab(session.user.labId);
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error('[GET /api/audit]', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
