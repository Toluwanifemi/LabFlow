'use client';
import Link from 'next/link';
import styles from './RecentSamplesTable.module.css';

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

interface RecentSamplesTableProps {
  samples: SampleItem[];
}

const PHASE_CLASS: Record<string, string> = {
  Collection: styles.phaseCollection,
  Experiment: styles.phaseProcessing,
  Completion: styles.phaseCompleted,
};

function getPhaseClass(phase: string | null): string {
  return PHASE_CLASS[phase || 'Collection'] || styles.phaseCollection;
}

function formatDate(d: string): string {
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
  if (samples.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Start tracking your research samples.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sample ID</th>
              <th>Type</th>
              <th>Phase</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {samples.slice(0, 5).map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/samples/${s.id}`} prefetch={false} className={styles.sampleId}>
                    {s.humanId}
                  </Link>
                </td>
                <td className={styles.cellText}>{s.sampleType}</td>
                <td>
                  <span className={`${styles.phaseBadge} ${getPhaseClass(s.currentPhase)}`}>
                    {s.currentPhase || 'Collection'}
                  </span>
                </td>
                <td className={styles.cellDate}>{formatDate(s.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cardList}>
        {samples.slice(0, 5).map((s) => (
          <Link href={`/samples/${s.id}`} key={s.id} prefetch={false} className={styles.cardLink}>
            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.sampleId}>{s.humanId}</span>
                <span className={`${styles.phaseBadge} ${getPhaseClass(s.currentPhase)}`}>
                  {s.currentPhase || 'Collection'}
                </span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardMeta}>
                  {s.sampleType} <span className={styles.bullet}>&bull;</span>
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
