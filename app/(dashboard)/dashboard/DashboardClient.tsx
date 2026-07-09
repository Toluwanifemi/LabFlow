'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { RecentSamplesTable } from '@/components/dashboard/RecentSamplesTable';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { Modal } from '@/components/ui/Modal';
import { signOut } from 'next-auth/react';
import styles from './page.module.css';

interface Stats {
  totalSamples: number;
  totalSamplesTrend: number;
  samplesAddedToday: number;
  samplesAddedTodayTrend: number;
  activeExperiments: number;
  activeExperimentsTrend: number;
}

interface ActivityItem {
  id: string;
  userName: string;
  actionType: string;
  sampleHumanId: string | null;
  timestamp: string;
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
  updatedAt: string;
  createdByName: string | null;
}

interface PhaseDistItem {
  phase: string;
  count: number;
  percentage: number;
}

interface DashboardClientProps {
  stats: Stats;
  recentActivity: ActivityItem[];
  attentionItems: AttentionItem[];
  recentSamples: SampleItem[];
  phaseDistribution: PhaseDistItem[];
  userName: string;
  role: string;
}

export function DashboardClient({
  stats: initialStats,
  recentActivity: initialRecentActivity,
  attentionItems: initialAttentionItems,
  recentSamples: initialRecentSamples,
  phaseDistribution: initialPhaseDistribution,
  userName,
  role,
}: DashboardClientProps) {
  const { conflicts, discardConflict, resolveConflict } = useSyncQueue();
  const [stats, setStats] = useState(initialStats);
  const [recentActivity, setRecentActivity] = useState(initialRecentActivity);
  const [attentionItems, setAttentionItems] = useState(initialAttentionItems);
  const [recentSamples, setRecentSamples] = useState(initialRecentSamples);
  const [phaseDistribution, setPhaseDistribution] = useState(initialPhaseDistribution);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
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
      if (data.phaseDistribution) setPhaseDistribution(data.phaseDistribution);
    } catch {
      // silent fail
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
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchLiveData]);

  const isStudent = role === 'STUDENT';
  const totalAttention = attentionItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <section className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.greeting}>Welcome back, {userName}</h1>
        </div>
        <div className={styles.headerRight}>
          {conflicts.length > 0 && (
            <button
              className={styles.conflictBadge}
              onClick={() => setConflictModalOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
            </button>
          )}
          {isLiveUpdating && <span className={styles.liveBadge}>Live</span>}
        </div>
      </section>

      <section className={styles.statsRow}>
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
        {!isStudent && totalAttention > 0 && (
          <StatCard
            title="Needs Attention"
            value={totalAttention}
            variant="warning"
            href="/samples?attention=all"
          />
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Phase Distribution</h2>
        <div className={styles.card}>
          <StatusChart phases={phaseDistribution} />
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
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
      </div>

      <Modal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        title={`Sync Conflicts (${conflicts.length})`}
        secondaryAction={{
          label: 'Close',
          onClick: () => setConflictModalOpen(false),
        }}
      >
        <div className={styles.conflictModalBody}>
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onDiscard={discardConflict}
              onResolve={resolveConflict}
              onResolved={() => {
                if (conflicts.length <= 1) setConflictModalOpen(false);
              }}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}

function ConflictCard({
  conflict,
  onDiscard,
  onResolve,
  onResolved,
}: {
  conflict: any;
  onDiscard: (id: string) => void;
  onResolve: (id: string, payload: any) => void;
  onResolved: () => void;
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
    onResolved();
  };

  const handleDiscard = () => {
    onDiscard(conflict.id);
    onResolved();
  };

  return (
    <div className={styles.conflictModalCard}>
      <div className={styles.conflictModalHeader}>
        <strong>Sync Error:</strong> {conflict.conflictDetails || 'Duplicate ID or conflicting update'}
      </div>
      <div className={styles.conflictModalForm}>
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
      <div className={styles.conflictModalActions}>
        <button className={styles.discardBtn} onClick={handleDiscard}>
          Discard
        </button>
        <button className={styles.retryBtn} onClick={handleRetry}>
          Update & Retry
        </button>
      </div>
    </div>
  );
}
