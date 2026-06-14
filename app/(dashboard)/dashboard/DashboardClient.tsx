'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AttentionPanel } from '@/components/dashboard/AttentionPanel';
import { RecentSamplesTable } from '@/components/dashboard/RecentSamplesTable';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { signOut } from 'next-auth/react';
import styles from './page.module.css';

interface Stats {
  totalSamples: number;
  totalSamplesTrend: number;
  samplesAddedToday: number;
  samplesAddedTodayTrend: number;
  activeExperiments: number;
  activeExperimentsTrend: number;
  pendingUpdates: number;
  pendingUpdatesTrend: number;
}

interface ActivityItem {
  id: string;
  userName: string;
  actionType: string;
  sampleHumanId: string | null;
  timestamp: Date;
}

interface AttentionItem {
  type: string;
  count: number;
  message: string;
  actionLabel: string;
  actionHref: string;
}

interface SampleItem {
  id: string;
  humanId: string;
  slug: string;
  sampleType: string;
  source: string;
  currentPhase: string | null;
  updatedAt: Date;
  createdByName: string | null;
}

interface DashboardClientProps {
  stats: Stats;
  recentActivity: ActivityItem[];
  attentionItems: AttentionItem[];
  recentSamples: SampleItem[];
  userName: string;
  labName: string;
  dateStr: string;
  role: string;
  userId: string;
}


export function DashboardClient({
  stats: initialStats,
  recentActivity: initialRecentActivity,
  attentionItems: initialAttentionItems,
  recentSamples: initialRecentSamples,
  userName,
  labName,
  dateStr,
  role,
}: DashboardClientProps) {
  const { conflicts, discardConflict, resolveConflict } = useSyncQueue();
  const [stats, setStats] = useState(initialStats);
  const [recentActivity, setRecentActivity] = useState(initialRecentActivity);
  const [attentionItems, setAttentionItems] = useState(initialAttentionItems);
  const [recentSamples, setRecentSamples] = useState(initialRecentSamples);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const mountedRef = useRef(true);

  const fetchLiveData = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok || !mountedRef.current) {
        if (res.status === 401) {
          await signOut({ redirect: false });
          window.location.href = '/auth';
          return;
        }
        return;
      }
      const data = await res.json();
      if (!mountedRef.current) return;
      setIsLiveUpdating(true);
      setStats(data.stats);
      setRecentActivity(data.recentActivity);
      setAttentionItems(data.attentionItems || []);
      setRecentSamples(data.recentSamples);
    } catch {
      // silent fail — keep showing last known data
    } finally {
      if (mountedRef.current) {
        setIsLiveUpdating(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30_000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchLiveData]);

  const hasAttention = attentionItems.length > 0;
  const isAdmin = role === 'ADMIN';
  const isStudent = role === 'STUDENT';

  return (
    <>
      <section className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.greeting}>Welcome back, {userName}</h1>
          <p className={styles.headerMeta}>
            <span>{dateStr}</span>
          </p>
        </div>
        <div className={styles.headerRight}>
          {isLiveUpdating && <span className={styles.liveBadge}>Live</span>}
        </div>
      </section>

      {conflicts.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle} style={{ color: '#B91C1C' }}>
            Sync Conflicts Detected ({conflicts.length})
          </h2>
          <div className={styles.conflictsContainer}>
            {conflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onDiscard={discardConflict}
                onResolve={resolveConflict}
              />
            ))}
          </div>
        </section>
      )}

      <section className={styles.statsGrid}>
        <StatCard
          title="Total Samples"
          value={stats.totalSamples}
          trend={stats.totalSamplesTrend}
        />
        <StatCard
          title="Samples Added Today"
          value={stats.samplesAddedToday}
          trend={stats.samplesAddedTodayTrend}
        />
        {!isStudent && (
          <StatCard
            title="Active Experiments"
            value={stats.activeExperiments}
            trend={stats.activeExperimentsTrend}
          />
        )}
      </section>

      {hasAttention && !isStudent && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Attention Required</h2>
          <AttentionPanel items={attentionItems} />
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
        </div>
        <div className={styles.card}>
          <ActivityFeed activities={recentActivity} role={role} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Samples</h2>
          <Link href="/samples" prefetch={false} className={styles.viewAll}>
            View All
          </Link>
        </div>
        <div className={styles.card}>
          <RecentSamplesTable samples={recentSamples} />
        </div>
      </section>
    </>
  );
}

function ConflictCard({
  conflict,
  onDiscard,
  onResolve,
}: {
  conflict: any;
  onDiscard: (id: string) => void;
  onResolve: (id: string, payload: any) => void;
}) {
  const [sampleType, setSampleType] = useState(conflict.payload?.sampleType || '');
  const [source, setSource] = useState(conflict.payload?.source || '');
  const [collectionDate, setCollectionDate] = useState(conflict.payload?.collectionDate || '');

  const handleRetry = () => {
    onResolve(conflict.id, {
      ...conflict.payload,
      sampleType,
      source,
      collectionDate,
    });
  };

  return (
    <div className={styles.conflictCard}>
      <div className={styles.conflictHeader}>
        <div className={styles.conflictTitle}>
          <strong>Sync Error:</strong> {conflict.conflictDetails || 'Duplicate ID or conflicting update'}
        </div>
        <button className={styles.discardBtn} onClick={() => onDiscard(conflict.id)}>
          Discard Local Record
        </button>
      </div>
      <div className={styles.conflictBody}>
        <div className={styles.conflictForm}>
          <div className={styles.inputGroup}>
            <label>Sample Type</label>
            <input
              type="text"
              value={sampleType}
              onChange={(e) => setSampleType(e.target.value)}
              className={styles.conflictInput}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={styles.conflictInput}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Collection Date</label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className={styles.conflictInput}
            />
          </div>
        </div>
        <button className={styles.retryBtn} onClick={handleRetry}>
          Update & Retry Sync
        </button>
      </div>
    </div>
  );
}
