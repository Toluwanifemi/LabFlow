'use client';
import { useState, useEffect } from 'react';
import styles from '../landing.module.css';

interface QueueItem {
  id: string;
  type: string;
  status: 'Pending' | 'Synced';
}

export function FeatureCardSync() {
  const [isOnline, setIsOnline] = useState(false);
  const [syncQueue, setSyncQueue] = useState<QueueItem[]>([
    { id: 'local-203', type: 'DNA', status: 'Pending' },
    { id: 'local-204', type: 'Saliva', status: 'Pending' },
  ]);
  const [isSyncing, setIsSyncing] = useState(false);

  const addOfflineSample = () => {
    const types = ['Blood', 'DNA', 'Saliva'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const newLocalId = `local-${Math.floor(Math.random() * 900) + 100}`;
    setSyncQueue(prev => [...prev, { id: newLocalId, type: randomType, status: 'Pending' }]);
  };

  useEffect(() => {
    if (isOnline && syncQueue.some(item => item.status === 'Pending') && !isSyncing) {
      setIsSyncing(true);
      let currentQueue = [...syncQueue];
      let delay = 600;
      currentQueue.forEach((item, index) => {
        if (item.status === 'Pending') {
          setTimeout(() => {
            setSyncQueue(prev =>
              prev.map(q => q.id === item.id ? { ...q, status: 'Synced' } : q)
            );
            if (index === currentQueue.length - 1 || !currentQueue.slice(index + 1).some(q => q.status === 'Pending')) {
              setIsSyncing(false);
            }
          }, delay);
          delay += 600;
        }
      });
    }
  }, [isOnline, syncQueue, isSyncing]);

  const pendingCount = syncQueue.filter(i => i.status === 'Pending').length;

  return (
    <div className={`${styles.card} ${styles.reveal} ${styles.stagger2}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <svg viewBox="0 0 24 24">
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5a9 9 0 0 1-10.3 8.87M1 1l22 22" />
            <path d="M12.5 6.5a9 9 0 0 1 5.3 1.9M4.3 4.3A9 9 0 0 0 3 12.5a9 9 0 0 0 1.2 4.4" />
          </svg>
        </div>
        <h3 className={styles.cardTitle}>Offline-First. Always.</h3>
        <p className={styles.cardDesc}>
          Network dropped? No problem. Log samples offline — they sync automatically when you reconnect.
        </p>
      </div>
      <div className={styles.cardInteractive}>
        <div className={styles.syncStatusSection}>
          <div className={styles.syncToggle}>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`${styles.syncToggleBtn} ${isOnline ? styles.syncToggleBtnActive : ''}`}
              aria-label={isOnline ? 'Go offline' : 'Go online'}
            >
              <span className={`${styles.syncToggleBall} ${isOnline ? styles.syncToggleBallActive : ''}`} />
            </button>
            <span className={styles.syncLabel}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <span className={styles.syncStatusIndicator} data-online={isOnline}>
            {isOnline ? (isSyncing ? 'Syncing...' : pendingCount === 0 ? 'All synced' : 'Connected') : 'Disconnected'}
          </span>
        </div>

        <div className={styles.syncList}>
          {syncQueue.length === 0 ? (
            <div className={styles.syncEmpty}>All items synced. Queue empty.</div>
          ) : (
            syncQueue.map(item => (
              <div key={item.id} className={styles.syncItem}>
                <span className={styles.syncItemId}>{item.id} <span className={styles.syncItemType}>({item.type})</span></span>
                <span className={`${styles.syncTag} ${item.status === 'Synced' ? styles.tagSynced : styles.tagPending}`}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          onClick={addOfflineSample}
          disabled={isOnline}
          className={styles.syncBtn}
        >
          {isOnline ? 'Go offline to test' : 'Create Offline Entry'}
        </button>
      </div>
    </div>
  );
}
