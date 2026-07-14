import { auth } from '@/lib/auth/config';
import { getAuditLogsForLab, getAuditLogsCountForLab } from '@/lib/db/audit';
import { canPerformAction } from '@/lib/auth/permissions';
import { redirect } from 'next/navigation';
import { ActivityLog } from '@/components/audit/ActivityLog';
import Link from 'next/link';
import styles from './activity.module.css';

interface ActivityPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ActivityPage(props: ActivityPageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) return null;

  if (!canPerformAction(session.user.role, 'view_audit_log')) {
    redirect('/dashboard');
  }

  const page = Math.max(1, Number(searchParams?.page) || 1);
  const limit = 25;

  const [logs, totalCount] = await Promise.all([
    getAuditLogsForLab(session.user.labId, page, limit),
    getAuditLogsCountForLab(session.user.labId),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

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
        <p className={styles.subtitle}>
          Immutable record of all lab activities. {totalCount} entr{totalCount === 1 ? 'y' : 'ies'}.
        </p>
      </header>

      <ActivityLog logs={serializedLogs} />

      {totalCount > limit && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            {(page - 1) * limit + 1} &mdash; {Math.min(page * limit, totalCount)} of {totalCount}
          </span>
          <div className={styles.paginationButtons}>
            {page > 1 ? (
              <Link
                href={{ pathname: '/activity', query: { page: page - 1 } }}
                className={styles.paginationBtn}
                aria-label="Previous page"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
            ) : (
              <span className={`${styles.paginationBtn} ${styles.disabled}`} aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={{ pathname: '/activity', query: { page: page + 1 } }}
                className={styles.paginationBtn}
                aria-label="Next page"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ) : (
              <span className={`${styles.paginationBtn} ${styles.disabled}`} aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
