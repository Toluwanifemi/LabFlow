'use client';
import Link from 'next/link';
import { canPerformAction } from '@/lib/auth/permissions';
import styles from './ActivityFeed.module.css';

interface ActivityItem {
  id: string;
  userName: string;
  actionType: string;
  sampleHumanId: string | null;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  role: string;
}

function getActionLabel(actionType: string, sampleHumanId: string | null): string {
  const sample = sampleHumanId || 'a sample';
  const labels: Record<string, string> = {
    CREATE: `Sample ${sample} created`,
    UPDATE: `Sample ${sample} updated`,
    DELETE: `Sample ${sample} archived`,
    RESTORE: `Sample ${sample} restored`,
    PHASE_CHANGE: `Phase changed for ${sample}`,
    IMAGE_ATTACH: `Image uploaded to ${sample}`,
  };
  return labels[actionType] || `Action on ${sample}`;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ActivityFeed({ activities, role }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No activity has been recorded yet.</p>
      </div>
    );
  }

  const canViewFullLog = canPerformAction(role as any, 'view_audit_log');

  return (
    <div className={styles.feed}>
      <div className={styles.list}>
        {activities.map((a) => (
          <div key={a.id} className={styles.item}>
            <div className={styles.dot} />
            <div className={styles.content}>
              <p className={styles.action}>{getActionLabel(a.actionType, a.sampleHumanId)}</p>
              <p className={styles.meta}>
                <span className={styles.user}>{a.userName}</span>
                <span className={styles.time}>{formatTimeAgo(a.timestamp)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      {canViewFullLog && (
        <div className={styles.footer}>
          <Link href="/activity" className={styles.viewAll}>
            View Full Activity Log
          </Link>
        </div>
      )}
    </div>
  );
}
