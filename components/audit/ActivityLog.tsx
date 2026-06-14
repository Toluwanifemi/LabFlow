import styles from './ActivityLog.module.css';

interface AuditLogEntry {
  id: string;
  actionType: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  user: { name: string; email: string };
  sample: { humanId: string } | null;
}

interface ActivityLogProps {
  logs: AuditLogEntry[];
}

const FIELD_LABELS: Record<string, string> = {
  sampleType: 'sample type',
  source: 'source',
  description: 'description',
  experimentType: 'experiment type',
  collectionDate: 'collection date',
  currentPhase: 'phase',
  role: 'role',
};

function getFirstName(name: string) {
  return name.split(' ')[0];
}

function formatCompactTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatDescription(log: AuditLogEntry): string {
  const sampleId = log.sample?.humanId || 'a sample';

  switch (log.actionType) {
    case 'CREATE':
      return `Created sample ${sampleId}`;

    case 'DELETE':
      return `Archived sample ${sampleId}`;

    case 'RESTORE':
      return `Restored sample ${sampleId}`;

    case 'PHASE_CHANGE': {
      const fieldLabel = FIELD_LABELS[log.fieldChanged ?? ''] || log.fieldChanged || 'phase';
      if (log.oldValue && log.newValue) {
        return `Changed ${fieldLabel} of ${sampleId} from "${log.oldValue}" to "${log.newValue}"`;
      }
      if (log.newValue) {
        return `Set ${fieldLabel} of ${sampleId} to "${log.newValue}"`;
      }
      return `Updated ${fieldLabel} of ${sampleId}`;
    }

    case 'IMAGE_ATTACH':
      return `Attached an image to ${sampleId}`;

    case 'UPDATE': {
      if (log.fieldChanged) {
        const fieldLabel = FIELD_LABELS[log.fieldChanged] || log.fieldChanged;
        if (log.oldValue !== null && log.newValue !== null) {
          return `Changed ${fieldLabel} of ${sampleId} from "${log.oldValue}" to "${log.newValue}"`;
        }
        return `Updated ${fieldLabel} of ${sampleId}`;
      }
      return `Updated ${sampleId}`;
    }

    default:
      return `${log.actionType} on ${sampleId}`;
  }
}

export function ActivityLog({ logs }: ActivityLogProps) {
  if (logs.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>What happened</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className={styles.timestampCol}>
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className={styles.whoCol}>
                <div className={styles.user}>
                  <span className={styles.userName}>{log.user.name}</span>
                  <span className={styles.userEmail}>{log.user.email}</span>
                </div>
              </td>
              <td className={styles.descCol}>
                <span className={styles.descText}>
                  <span className={styles.mobileName}>{getFirstName(log.user.name)} </span>
                  {formatDescription(log)}
                </span>
                <span className={styles.mobileTime}>{formatCompactTime(log.timestamp)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
