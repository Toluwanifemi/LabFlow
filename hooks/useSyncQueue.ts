'use client';
import { useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';
import { useToast } from './useToast';

const DB_NAME = 'labflow-sync';
const STORE_NAME = 'sync-queue';

export interface SyncAction {
  id: string; // temporary local id
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: any;
  timestamp: number;
  hasConflict?: boolean;
  conflictDetails?: string;
}

export function useSyncQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [conflicts, setConflicts] = useState<SyncAction[]>([]);
  const { showToast } = useToast();

  const getDB = async () => {
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  };

  const updateQueueCount = useCallback(async () => {
    try {
      const db = await getDB();
      const count = await db.count(STORE_NAME);
      setQueueCount(count);

      const items = (await db.getAll(STORE_NAME)) as SyncAction[];
      setConflicts(items.filter((i) => i.hasConflict));
    } catch (e) {
      console.error('Failed to get queue count or conflicts', e);
    }
  }, []);

  const addToQueue = async (action: Omit<SyncAction, 'timestamp'>) => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, { ...action, timestamp: Date.now() });
      await updateQueueCount();
      showToast({ message: 'Saved offline. Will sync when connected.', type: 'warning' });
    } catch (error) {
      console.error('Failed to add to sync queue', error);
      showToast({ message: 'Failed to save offline.', type: 'error' });
    }
  };

  const processQueue = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const db = await getDB();
      const items = (await db.getAll(STORE_NAME)) as SyncAction[];

      // Filter out items already marked as conflicted to prevent queue blocking
      const activeItems = items.filter((i) => !i.hasConflict);

      if (activeItems.length === 0) {
        setIsSyncing(false);
        return;
      }

      activeItems.sort((a, b) => a.timestamp - b.timestamp);

      let successCount = 0;
      for (const item of activeItems) {
        try {
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });

          if (res.ok) {
            await db.delete(STORE_NAME, item.id);
            successCount++;
          } else if (res.status === 409) {
            // Mark the item as conflicted and update IndexedDB
            const conflictMsg = 'This sample ID already exists in your lab.';
            await db.put(STORE_NAME, {
              ...item,
              hasConflict: true,
              conflictDetails: conflictMsg,
            });
            showToast({
              message: 'Sync conflict detected. Please resolve on the dashboard.',
              type: 'error',
            });
          } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            // Client/validation/auth errors - remove from queue to prevent blocking subsequent records
            await db.delete(STORE_NAME, item.id);
            showToast({
              message: 'Sync failed for record: invalid data or unauthorized action.',
              type: 'error',
            });
          } else {
            console.error(`Sync failed for ${item.id}`, await res.text());
          }
        } catch (fetchError) {
          console.error(`Network error syncing ${item.id}`, fetchError);
          break; // Stop loop if offline again
        }
      }

      await updateQueueCount();
      if (successCount > 0) {
        showToast({ message: `Synced ${successCount} records.`, type: 'success' });
      }
    } catch (error) {
      console.error('Sync process failed', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, showToast, updateQueueCount]);

  const discardConflict = async (id: string) => {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, id);
      await updateQueueCount();
      showToast({ message: 'Conflicted local record discarded.', type: 'success' });
    } catch (e) {
      console.error('Failed to discard conflict', e);
      showToast({ message: 'Failed to discard conflict.', type: 'error' });
    }
  };

  const resolveConflict = async (id: string, updatedPayload: any) => {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const item = (await store.get(id)) as SyncAction | undefined;
      if (item) {
        item.payload = updatedPayload;
        delete item.hasConflict;
        delete item.conflictDetails;
        await store.put(item);
      }
      await tx.done;
      await updateQueueCount();
      showToast({ message: 'Conflict resolved. Re-trying synchronization...', type: 'success' });
      // Trigger sync sweep
      setTimeout(processQueue, 100);
    } catch (e) {
      console.error('Failed to resolve conflict', e);
      showToast({ message: 'Failed to resolve conflict.', type: 'error' });
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updateQueueCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue, updateQueueCount]);

  return {
    isOnline,
    isSyncing,
    queueCount,
    conflicts,
    addToQueue,
    processQueue,
    discardConflict,
    resolveConflict,
  };
}
