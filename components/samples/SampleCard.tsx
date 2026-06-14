import Link from 'next/link';
import { Sample } from '@/types';
import styles from './SampleCard.module.css';

interface SampleCardProps {
  sample: Sample;
}

export function SampleCard({ sample }: SampleCardProps) {
  return (
    <Link href={`/samples/${sample.id}`} prefetch={false} className={styles.card}>
      <div className={styles.header}>
        <span className={styles.id}>{sample.humanId}</span>
        {sample.currentPhase && <span className={styles.phase}>{sample.currentPhase}</span>}
      </div>
      <div className={styles.details}>
        <div className={styles.row}>
          <span className={styles.label}>Type:</span>
          <span className={styles.value}>{sample.sampleType}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Source:</span>
          <span className={styles.value}>{sample.source}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Date:</span>
          <span className={styles.value}>{new Date(sample.collectionDate).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}
