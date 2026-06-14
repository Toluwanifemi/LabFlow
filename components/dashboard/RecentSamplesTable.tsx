'use client';
import Link from 'next/link';
import { useState } from 'react';
import styles from './RecentSamplesTable.module.css';

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

interface RecentSamplesTableProps {
  samples: SampleItem[];
}

function getPhaseBadgeClass(phase: string | null): string {
  const p = phase || 'Collection';
  const map: Record<string, string> = {
    Collection: styles.phaseCollection,
    Processing: styles.phaseProcessing,
    Analysis: styles.phaseAnalysis,
    Completed: styles.phaseCompleted,
    Archived: styles.phaseArchived,
  };
  return map[p] || styles.phaseCollection;
}

function formatDate(d: Date): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function RecentSamplesTable({ samples }: RecentSamplesTableProps) {
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const filtered = samples.filter((s) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      s.humanId.toLowerCase().includes(q) ||
      s.sampleType.toLowerCase().includes(q) ||
      s.source.toLowerCase().includes(q) ||
      (s.currentPhase || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'humanId':
        cmp = a.humanId.localeCompare(b.humanId);
        break;
      case 'sampleType':
        cmp = a.sampleType.localeCompare(b.sampleType);
        break;
      case 'source':
        cmp = a.source.localeCompare(b.source);
        break;
      case 'currentPhase':
        cmp = (a.currentPhase || '').localeCompare(b.currentPhase || '');
        break;
      default:
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className={styles.sortIcon}>↕</span>;
    return <span className={styles.sortIconActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (samples.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Start tracking your research samples.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.searchBar}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Filter by ID, type, source, phase..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('humanId')}>
                Sample ID <SortIcon field="humanId" />
              </th>
              <th onClick={() => handleSort('sampleType')}>
                Type <SortIcon field="sampleType" />
              </th>
              <th onClick={() => handleSort('source')}>
                Source <SortIcon field="source" />
              </th>
              <th onClick={() => handleSort('currentPhase')}>
                Phase <SortIcon field="currentPhase" />
              </th>
              <th onClick={() => handleSort('updatedAt')}>
                Updated <SortIcon field="updatedAt" />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/samples/${s.id}`} prefetch={false} className={styles.sampleId}>
                    {s.humanId}
                  </Link>
                </td>
                <td className={styles.cellText}>{s.sampleType}</td>
                <td className={styles.cellText}>{s.source}</td>
                <td>
                  <span className={`${styles.phaseBadge} ${getPhaseBadgeClass(s.currentPhase)}`}>
                    {s.currentPhase || 'Collection'}
                  </span>
                </td>
                <td className={styles.cellDate}>{formatDate(s.updatedAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <Link href={`/samples/${s.id}`} prefetch={false} className={styles.actionBtn} title="View">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    </Link>
                    <Link href={`/samples/${s.id}/edit`} prefetch={false} className={styles.actionBtn} title="Edit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </Link>
                    <Link href={`/samples/${s.id}?scan=1`} prefetch={false} className={styles.actionBtn} title="Scan QR">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                    </Link>
                    <Link href={`/samples/${s.id}?history=1`} prefetch={false} className={styles.actionBtn} title="History">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cardList}>
        {sorted.map((s) => (
          <Link href={`/samples/${s.id}`} key={s.id} prefetch={false} className={styles.cardLink}>
            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.sampleId}>{s.humanId}</span>
                <span className={`${styles.phaseBadge} ${getPhaseBadgeClass(s.currentPhase)}`}>
                  {s.currentPhase || 'Collection'}
                </span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardMeta}>
                  {s.sampleType} <span className={styles.bullet}>•</span> {s.source}
                </span>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.cardDate}>Updated {formatDate(s.updatedAt)}</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
