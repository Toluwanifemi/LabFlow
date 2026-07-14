'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SampleCard } from '@/components/samples/SampleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import styles from './sampleList.module.css';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'type_asc', label: 'Type A–Z' },
  { value: 'type_desc', label: 'Type Z–A' },
] as const;

import type { SampleSummary } from '@/types';

interface SampleListClientProps {
  initialSamples: SampleSummary[];
  initialTotal: number;
  initialPage: number;
  initialQ: string;
  initialSort: string;
  initialArchived: boolean;
  role: string;
}

const PHASE_COLORS: Record<string, string> = {
  COLLECTION: 'var(--color-secondary)',
  INDUCTION: '#7c3aed',
  MONITORING: '#0891b2',
  TREATMENT: '#d97706',
  SAMPLE_COLLECTION: 'var(--color-secondary)',
  ANALYSIS: '#d97706',
  EXPERIMENT: 'var(--color-experiment)',
  COMPLETED: 'var(--color-tertiary)',
  COMPLETION: 'var(--color-tertiary)',
  ARCHIVED: '#6b7280',
};

function getPhaseColor(phase: string | null): string {
  if (!phase) return 'var(--color-secondary)';
  return PHASE_COLORS[phase.toUpperCase()] || 'var(--color-secondary)';
}

function highlightText(text: string, query: string | undefined) {
  if (!query || !query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className={styles.highlight}>{part}</mark>
      : part
  );
}

export function SampleListClient({
  initialSamples,
  initialTotal,
  initialPage,
  initialQ,
  initialSort,
  initialArchived,
  role,
}: SampleListClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = role === 'ADMIN' || role === 'PI';

  const [samples, setSamples] = useState<SampleSummary[]>(initialSamples);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState(initialSort);
  const [archived, setArchived] = useState(initialArchived);
  const [loading, setLoading] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<SampleSummary | null>(null);
  const [isArchiveSubmitting, setIsArchiveSubmitting] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();
  const sortRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const syncUrl = useCallback((params: Record<string, string>, extraAttention?: string) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    if (extraAttention) sp.set('attention', extraAttention);
    const qs = sp.toString();
    window.history.replaceState(null, '', qs ? `/samples?${qs}` : '/samples');
  }, []);

  const fetchSamples = useCallback(async (opts: {
    q?: string;
    sort?: string;
    archived?: boolean;
    page?: number;
  }) => {
    const sp = new URLSearchParams();
    if (opts.q) sp.set('q', opts.q);
    if (opts.sort && opts.sort !== 'newest') sp.set('sort', opts.sort);
    if (opts.archived) sp.set('archived', 'true');
    sp.set('page', String(opts.page || 1));

    setLoading(true);

    try {
      const res = await fetch(`/api/samples?${sp.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setSamples(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (initialQ || initialSort !== 'newest' || initialArchived || initialPage > 1) {
      syncUrl({
        ...(initialQ ? { q: initialQ } : {}),
        ...(initialSort !== 'newest' ? { sort: initialSort } : {}),
        ...(initialArchived ? { archived: 'true' } : {}),
        ...(initialPage > 1 ? { page: String(initialPage) } : {}),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sortOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortOpen]);

  const handleSearch = (value: string) => {
    setQ(value);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      fetchSamples({ q: value, sort, archived, page: 1 });
      syncUrl({
        ...(value ? { q: value } : {}),
        ...(sort !== 'newest' ? { sort } : {}),
        ...(archived ? { archived: 'true' } : {}),
      });
    }, 300);
  };

  const handleSort = (value: string) => {
    setSort(value);
    setSortOpen(false);
    setPage(1);
    fetchSamples({ q, sort: value, archived, page: 1 });
    syncUrl({
      ...(q ? { q } : {}),
      ...(value !== 'newest' ? { sort: value } : {}),
      ...(archived ? { archived: 'true' } : {}),
    });
  };

  const handleColumnSort = (column: string) => {
    const asc = `${column}_asc`;
    const desc = `${column}_desc`;
    if (sort === asc) {
      handleSort(desc);
    } else if (sort === desc) {
      handleSort('newest');
    } else {
      handleSort(asc);
    }
  };

  const getSortIndicator = (column: string) => {
    if (sort === `${column}_asc`) return '\u25B2';
    if (sort === `${column}_desc`) return '\u25BC';
    return '';
  };

  const handleArchivedToggle = () => {
    const newArchived = !archived;
    setArchived(newArchived);
    setPage(1);
    setSamples([]);
    fetchSamples({ q, sort, archived: newArchived, page: 1 });
    syncUrl({
      ...(q ? { q } : {}),
      ...(sort !== 'newest' ? { sort } : {}),
      ...(newArchived ? { archived: 'true' } : {}),
    });
  };

  const goToPage = (pageNum: number) => {
    setPage(pageNum);
    fetchSamples({ q, sort, archived, page: pageNum });
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiveSubmitting(true);
    try {
      const res = await fetch(`/api/samples/${archiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to archive sample.');
      }

      showToast({ message: `Sample ${archiveTarget.humanId} archived.`, type: 'success' });
      setArchiveTarget(null);
      setSamples((prev) => prev.filter((s) => s.id !== archiveTarget.id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Failed to archive sample.', type: 'error' });
      setArchiveTarget(null);
    } finally {
      setIsArchiveSubmitting(false);
    }
  };

  const handleRowClick = (sampleId: string) => {
    router.push(`/samples/${sampleId}`);
  };

  const hasActiveFilters = !!(q || sort !== 'newest' || archived);

  const startRange = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRange = Math.min(page * PAGE_SIZE, total);
  const showPagination = total > PAGE_SIZE;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{archived ? 'Archived Samples' : 'All Samples'}</h1>
          <p className={styles.subtitle}>
            {loading
              ? 'Loading\u2026'
              : total === 0
              ? '0 results'
              : `${total} sample${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && (
            <button
              className={`${styles.archivedToggle} ${archived ? styles.archivedToggleActive : ''}`}
              onClick={handleArchivedToggle}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.archivedIcon}>
                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
              </svg>
              {archived ? 'Active' : 'Archived'}
            </button>
          )}
          <div className={styles.addBtnDesktopWrapper}>
            <Link href="/samples/new" prefetch={false} tabIndex={-1}>
              <Button variant="primary">New Sample</Button>
            </Link>
          </div>
        </div>
        <Link href="/samples/new" className={styles.addBtnMobile} prefetch={false} aria-label="New sample">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </header>

      {/* Search + Sort row */}
      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by ID, type, source"
            value={q}
            onChange={e => handleSearch(e.target.value)}
          />
          {q && (
            <button
              className={styles.searchClear}
              onClick={() => handleSearch('')}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.filterWrapper} ref={sortRef}>
          <button
            type="button"
            className={`${styles.filterBtn} ${sortOpen ? styles.filterBtnActive : ''}`}
            onClick={() => setSortOpen(prev => !prev)}
            aria-label="Sort options"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="12" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          {sortOpen && (
            <div className={styles.filterDropdown}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.filterOption} ${sort === opt.value ? styles.filterOptionActive : ''}`}
                  onClick={() => handleSort(opt.value)}
                >
                  <span className={styles.filterOptionLabel}>{opt.label}</span>
                  {sort === opt.value && (
                    <svg className={styles.filterCheck} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && samples.length === 0 ? (
        <>
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skeletonLine} style={{ width: '40%' }} />
                <div className={styles.skeletonLine} style={{ width: '60%' }} />
                <div className={styles.skeletonLine} style={{ width: '30%' }} />
              </div>
            ))}
          </div>
          <div className={styles.skeletonTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Phase</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className={styles.skelCell} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : samples.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No samples match your filters' : 'No samples logged yet'}
          actionLabel={hasActiveFilters ? 'Clear filters' : 'Log your first sample'}
          onAction={hasActiveFilters ? () => { setQ(''); setSort('newest'); setArchived(false); fetchSamples({ page: 1 }); syncUrl({}); } : undefined}
          actionHref={!hasActiveFilters ? '/samples/new' : undefined}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className={styles.grid}>
            {samples.map(sample => (
              <SampleCard
                key={sample.id}
                sample={sample}
                searchQuery={q || undefined}
                onArchive={isAdmin ? () => setArchiveTarget(sample) : undefined}
              />
            ))}
          </div>

          {/* Desktop: table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thId} onClick={() => handleColumnSort('id')}>
                    Sample ID<span className={styles.sortArrow}>{getSortIndicator('id')}</span>
                  </th>
                  <th className={styles.thType} onClick={() => handleColumnSort('type')}>
                    Type<span className={styles.sortArrow}>{getSortIndicator('type')}</span>
                  </th>
                  <th className={styles.thSource} onClick={() => handleColumnSort('source')}>
                    Source<span className={styles.sortArrow}>{getSortIndicator('source')}</span>
                  </th>
                  <th className={styles.thDate} onClick={() => handleColumnSort('date')}>
                    Date<span className={styles.sortArrow}>{getSortIndicator('date')}</span>
                  </th>
                  <th className={styles.thPhase} onClick={() => handleColumnSort('phase')}>
                    Phase<span className={styles.sortArrow}>{getSortIndicator('phase')}</span>
                  </th>
                  <th className={styles.thActions}></th>
                </tr>
              </thead>
              <tbody>
                {samples.map(sample => {
                  const phaseColor = getPhaseColor(sample.currentPhase);
                  const imageCount = Array.isArray(sample.images) ? sample.images.length : 0;
                  return (
                    <tr
                      key={sample.id}
                      className={styles.tableRow}
                      onClick={() => handleRowClick(sample.id)}
                    >
                      <td className={styles.tdId}>{highlightText(sample.humanId, q || undefined)}</td>
                      <td className={styles.tdType}>
                        <span>{highlightText(sample.sampleType, q || undefined)}</span>
                      </td>
                      <td className={styles.tdSource}>{sample.source}</td>
                      <td className={styles.tdDate}>{formatDate(sample.collectionDate)}</td>
                      <td className={styles.tdPhase}>
                        <span
                          className={styles.tablePhase}
                          style={{ backgroundColor: `color-mix(in srgb, ${phaseColor}, transparent 90%)`, color: phaseColor }}
                        >
                          {sample.currentPhase || 'Collection'}
                        </span>
                      </td>
                      <td className={styles.tdActions}>
                        <span className={styles.tableMeta}>
                          {imageCount > 0 && (
                            <span className={styles.tableMetaItem}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.tableMetaIcon}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                              </svg>
                              {imageCount}
                            </span>
                          )}
                          {sample.description && (
                            <span className={styles.tableMetaItem}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.tableMetaIcon}>
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              className={styles.archiveBtn}
                              onClick={(e) => { e.stopPropagation(); setArchiveTarget(sample); }}
                              aria-label={`Archive ${sample.humanId}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                                <path d="M21 8v13H3V8" />
                                <path d="M1 3h22v5H1z" />
                                <path d="M10 12h4" />
                              </svg>
                              Archive
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {showPagination && (
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                {startRange} &mdash; {endRange} of {total}
              </span>
              <div className={styles.paginationButtons}>
                <button
                  className={styles.paginationBtn}
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  className={styles.paginationBtn}
                  disabled={endRange >= total || loading}
                  onClick={() => goToPage(page + 1)}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiveSubmitting && setArchiveTarget(null)}
        title="Archive Sample"
        primaryAction={{
          label: 'Archive',
          onClick: handleArchiveConfirm,
          isLoading: isArchiveSubmitting,
          danger: true,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setArchiveTarget(null),
        }}
      >
        <p>Archive this sample? It can be restored later.</p>
      </Modal>
    </div>
  );
}
