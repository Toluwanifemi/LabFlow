import Link from 'next/link';
import { SampleForm } from '@/components/samples/SampleForm';
import styles from './newSample.module.css';

export default function NewSamplePage() {
  return (
    <div className={styles.container}>
      <Link href="/samples" prefetch={false} className={styles.back}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.backIcon}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Samples
      </Link>
      <header className={styles.header}>
        <h1 className={styles.title}>Log New Sample</h1>
        <p className={styles.subtitle}>Enter details below. Saved automatically if offline.</p>
      </header>
      <div className={styles.formWrapper}>
        <SampleForm />
      </div>
    </div>
  );
}
