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
          Immutable record of all lab activities. Showing {totalCount === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} of {totalCount} entries.
        </p>
      </header>

      <ActivityLog logs={serializedLogs} />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Link
            href={{
              pathname: '/activity',
              query: { page: Math.max(1, page - 1) },
            }}
            className={`${styles.pageBtn} ${page <= 1 ? styles.disabled : ''}`}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
          >
            &larr; Previous
          </Link>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <Link
            href={{
              pathname: '/activity',
              query: { page: Math.min(totalPages, page + 1) },
            }}
            className={`${styles.pageBtn} ${page >= totalPages ? styles.disabled : ''}`}
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : undefined}
          >
            Next &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
