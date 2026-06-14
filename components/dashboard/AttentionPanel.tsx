'use client';
import Link from 'next/link';
import styles from './AttentionPanel.module.css';

interface AttentionItem {
  type: string;
  count: number;
  message: string;
  actionLabel: string;
  actionHref: string;
}

interface AttentionPanelProps {
  items: AttentionItem[];
  onSync?: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  missing_images: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  stale_samples: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  sync_issues: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
};

export function AttentionPanel({ items, onSync }: AttentionPanelProps) {
  if (items.length === 0) return null;

  return (
    <div className={styles.panel}>
      {items.map((item) => (
        <div key={item.type} className={styles.card}>
          <div className={styles.icon}>{ICONS[item.type] || ICONS.missing_images}</div>
          <div className={styles.content}>
            <p className={styles.message}>{item.message}</p>
            {item.type === 'sync_issues' ? (
              <button onClick={onSync} className={styles.action}>
                {item.actionLabel}
              </button>
            ) : (
              <Link href={item.actionHref} className={styles.action}>
                {item.actionLabel}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
