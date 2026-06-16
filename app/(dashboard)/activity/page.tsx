import { auth } from '@/lib/auth/config';
import { getAuditLogsForLab } from '@/lib/db/audit';
import { canPerformAction } from '@/lib/auth/permissions';
import { redirect } from 'next/navigation';
import { ActivityLog } from '@/components/audit/ActivityLog';
import styles from './activity.module.css';

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user) return null;

  if (!canPerformAction(session.user.role, 'view_audit_log')) {
    redirect('/dashboard');
  }

  const logs = await getAuditLogsForLab(session.user.labId);
  const serializedLogs = logs.map((log) => ({
    id: log.id,
    actionType: log.actionType,
    fieldChanged: log.fieldChanged,
    oldValue: log.oldValue,
    newValue: log.newValue,
    timestamp: log.timestamp.toISOString(),
    user: log.user,
    sample: log.sample,
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Audit Log</h1>
        <p className={styles.subtitle}>Immutable record of all lab activities.</p>
      </header>

      <ActivityLog logs={serializedLogs} />
    </div>
  );
}
