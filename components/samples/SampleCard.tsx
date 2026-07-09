import Link from 'next/link';
import { Sample } from '@/types';
import styles from './SampleCard.module.css';

interface SampleCardProps {
  sample: Sample;
  searchQuery?: string;
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

export function SampleCard({ sample, searchQuery }: SampleCardProps) {
  const phaseColor = getPhaseColor(sample.currentPhase);
  const imageCount = Array.isArray(sample.images) ? sample.images.length : 0;

  return (
    <Link href={`/samples/${sample.id}`} prefetch={false} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.id}>{highlightText(sample.humanId, searchQuery)}</span>
          <span
            className={styles.phase}
            style={{ backgroundColor: `color-mix(in srgb, ${phaseColor}, transparent 90%)`, color: phaseColor, borderColor: `color-mix(in srgb, ${phaseColor}, transparent 81%)` }}
          >
            {sample.currentPhase || 'Collection'}
          </span>
      </div>
      <div className={styles.middle}>
        <span className={styles.typeDot} style={{ backgroundColor: phaseColor }} />
        <span className={styles.typeLabel}>{highlightText(sample.sampleType, searchQuery)}</span>
        <span className={styles.separator}>&middot;</span>
        <span className={styles.source}>{highlightText(sample.source, searchQuery)}</span>
      </div>
      <div className={styles.bottom}>
        <span className={styles.date}>
          {new Date(sample.collectionDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <div className={styles.meta}>
          {imageCount > 0 && (
            <span className={styles.metaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.metaIcon}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              {imageCount}
            </span>
          )}
          {sample.description && (
            <span className={styles.metaItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.metaIcon}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
