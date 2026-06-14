import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import {
  getDashboardStats,
  getRecentActivity,
  getAttentionItems,
  getRecentSamples,
} from '@/lib/db/dashboard';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const labId = session.user.labId;
    const role = session.user.role;

    const isStudent = role === 'STUDENT';
    const userId = isStudent ? session.user.id : undefined;

    const { searchParams } = new URL(req.url);
    const activityLimit = Math.min(Number(searchParams.get('activityLimit')) || 10, 50);
    const sampleLimit = Math.min(Number(searchParams.get('sampleLimit')) || 10, 50);

    const [stats, recentActivity, attentionItems, recentSamples] = await Promise.all([
      getDashboardStats(labId, userId),
      getRecentActivity(labId, activityLimit, userId),
      isStudent ? Promise.resolve([]) : getAttentionItems(labId),
      getRecentSamples(labId, sampleLimit, userId),
    ]);

    return NextResponse.json({
      stats,
      recentActivity,
      attentionItems: isStudent ? [] : attentionItems,
      recentSamples,
      role,
    });
  } catch (error) {
    console.error('[GET /api/dashboard]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
