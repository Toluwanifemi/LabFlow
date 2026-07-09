import { auth } from '@/lib/auth/config';
import {
  getDashboardStats,
  getRecentActivity,
  getAttentionItems,
  getRecentSamples,
  getPhaseDistribution,
} from '@/lib/db/dashboard';
import { DashboardClient } from './DashboardClient';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const labId = session.user.labId;
  const role = session.user.role;

  const isStudent = role === 'STUDENT';
  const userId = isStudent ? session.user.id : undefined;

  const [stats, recentActivity, attentionItems, recentSamples, phaseDistribution] = await Promise.all([
    getDashboardStats(labId, userId),
    getRecentActivity(labId, 10, userId),
    isStudent ? Promise.resolve([]) : getAttentionItems(labId),
    getRecentSamples(labId, 10, userId),
    getPhaseDistribution(labId, userId),
  ]);

  return (
    <div className={styles.container}>
      <DashboardClient
        stats={stats}
        recentActivity={recentActivity}
        attentionItems={attentionItems}
        recentSamples={recentSamples}
        phaseDistribution={phaseDistribution}
        userName={session.user.name || 'Researcher'}
        role={role}
      />
    </div>
  );
}
