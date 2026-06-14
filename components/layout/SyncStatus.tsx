'use client';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import styles from './SyncStatus.module.css';

export function SyncStatus() {
  const { isOnline, isSyncing, queueCount } = useSyncQueue();

  if (isOnline && queueCount === 0 && !isSyncing) return null;

  return (
    <div className={`${styles.bar} ${isOnline ? (isSyncing ? styles.syncing : styles.online) : styles.offline}`}>
      {!isOnline && <span>Offline - Changes will sync automatically</span>}
      {isOnline && isSyncing && <span>Syncing {queueCount} records...</span>}
      {isOnline && !isSyncing && queueCount > 0 && <span>{queueCount} pending syncs</span>}
    </div>
  );
}
