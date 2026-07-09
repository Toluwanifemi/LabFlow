import Link from 'next/link';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: number;
  trend?: number;
  invertTrendColor?: boolean;
  variant?: 'default' | 'warning';
  href?: string;
}

export function StatCard({ title, value, trend, invertTrendColor, variant = 'default', href }: StatCardProps) {
  const hasTrend = trend !== undefined;

  const trendDirection = hasTrend
    ? trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'
    : null;

  const isGood = invertTrendColor
    ? trendDirection === 'down'
    : trendDirection === 'up';

  const trendClass = trendDirection === 'neutral'
    ? styles.trendNeutral
    : isGood ? styles.trendUp : styles.trendDown;

  const card = (
    <div className={`${styles.card} ${variant === 'warning' ? styles.warning : ''}`}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {trendDirection && (
          <span className={`${styles.trend} ${trendClass}`}>
            {trendDirection === 'up' && (
              <svg className={styles.trendIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            )}
            {trendDirection === 'down' && (
              <svg className={styles.trendIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {trendDirection === 'neutral' && (
              <svg className={styles.trendIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
            <span>{Math.abs(trend!)}%</span>
          </span>
        )}
      </div>
      <p className={styles.value}>{value.toLocaleString()}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={styles.link}>
        {card}
      </Link>
    );
  }

  return card;
}