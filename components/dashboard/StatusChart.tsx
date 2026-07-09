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
  Collection: 'var(--color-secondary)',
  Experiment: 'var(--color-experiment)',
  Completion: 'var(--color-tertiary)',
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
            <span className={styles.dot}             style={{ backgroundColor: PHASE_COLORS[p.phase] || 'var(--color-outline)' }} />
            <span className={styles.phaseName}>{p.phase}</span>
            <span className={styles.count}>{p.count}</span>
            <span className={styles.percentage}>{p.percentage}%</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{
                width: `${p.percentage}%`,
                backgroundColor: PHASE_COLORS[p.phase] || 'var(--color-outline)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
