'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SampleCard } from '@/components/samples/SampleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import styles from './sampleList.module.css';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'type_asc', label: 'Type A–Z' },
  { value: 'type_desc', label: 'Type Z–A' },
] as const;

interface Sample {
  id: string;
  humanId: string;
  sampleType: string;
  source: string;
  currentPhase: string | null;
  collectionDate: string;
  createdAt: string;
  images: any[];
  description: string | null;
}

interface SampleListClientProps {
  initialSamples: Sample[];
  initialTotal: number;
  initialPage: number;
  initialQ: string;
  initialSort: string;
  initialArchived: boolean;
  initialAttention?: string;
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
  initialAttention,
  role,
}: SampleListClientProps) {
  const router = useRouter();
  const isAdmin = role === 'ADMIN' || role === 'PI';

  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState(initialSort);
  const [archived, setArchived] = useState(initialArchived);
  const [attention, setAttention] = useState(initialAttention);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [hasMore, setHasMore] = useState(initialSamples.length < initialTotal);
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
    append?: boolean;
  }) => {
    const sp = new URLSearchParams();
    if (opts.q) sp.set('q', opts.q);
    if (opts.sort && opts.sort !== 'newest') sp.set('sort', opts.sort);
    if (opts.archived) sp.set('archived', 'true');
    sp.set('page', String(opts.page || 1));

    const append = opts.append || false;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/samples?${sp.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (append) {
        setSamples(prev => [...prev, ...data.data]);
      } else {
        setSamples(data.data);
      }
      setTotal(data.total);
      setHasMore(data.page * data.limit < data.total);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSamples({ q, sort, archived, page: nextPage, append: true });
  };

  const handleRowClick = (sampleId: string) => {
    router.push(`/samples/${sampleId}`);
  };

  const hasActiveFilters = !!(q || sort !== 'newest' || archived);

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
            placeholder="Search by ID, type, source\u2026"
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
              <SampleCard key={sample.id} sample={sample as any} searchQuery={q || undefined} />
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
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className={styles.loadMoreWrapper}>
              <Button
                variant="outline"
                size="large"
                isLoading={loadingMore}
                onClick={handleLoadMore}
              >
                Load more
              </Button>
            </div>
          )}

          {!hasMore && samples.length > 0 && (
            <p className={styles.endMessage}>
              Showing all {total} sample{total !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
