import Link from 'next/link';
import { Button } from './Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
        {actionLabel && actionHref && (
          <Link href={actionHref} prefetch={false} tabIndex={-1}>
            <Button variant="primary">{actionLabel}</Button>
          </Link>
        )}
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
        )}
      </div>
    </div>
  );
}
