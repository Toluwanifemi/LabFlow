import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { getAuditLogsForLab, getAuditLogsCountForLab } from '@/lib/db/audit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'view_audit_log')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 25;

    const [logs, total] = await Promise.all([
      getAuditLogsForLab(session.user.labId, page, limit),
      getAuditLogsCountForLab(session.user.labId),
    ]);
    return NextResponse.json({ data: logs, total, page, limit }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/audit]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
