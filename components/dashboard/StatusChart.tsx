'use client';
import styles from './StatusChart.module.css';

interface PhaseItem {
  phase: string;
  count: number;
  percentage: number;
}

interface StatusChartProps {
  phases: PhaseItem[];
}

const PHASE_COLORS: Record<string, string> = {
  Collection: '#2563EB',
  Processing: '#F59E0B',
  Analysis: '#8B5CF6',
  Completed: '#16A34A',
  Archived: '#6B7280',
};

export function StatusChart({ phases }: StatusChartProps) {
  const total = phases.reduce((sum, p) => sum + p.count, 0);

  if (total === 0) {
    return (
      <div className={styles.empty}>
        <p>No samples recorded yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.chart}>
      {phases.map((p) => (
        <div key={p.phase} className={styles.row}>
          <div className={styles.labelRow}>
            <span className={styles.dot} style={{ backgroundColor: PHASE_COLORS[p.phase] || '#999' }} />
            <span className={styles.phaseName}>{p.phase}</span>
            <span className={styles.count}>{p.count}</span>
            <span className={styles.percentage}>{p.percentage}%</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${p.percentage}%`,
                backgroundColor: PHASE_COLORS[p.phase] || '#999',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
