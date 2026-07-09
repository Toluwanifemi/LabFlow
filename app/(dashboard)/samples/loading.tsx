import styles from './sampleList.module.css';

export default function SamplesLoading() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.skeletonLine} style={{ width: '160px', height: '28px' }} />
          <div className={styles.skeletonLine} style={{ width: '80px', height: '14px', marginTop: '8px' }} />
        </div>
      </header>
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeleton}>
            <div className={styles.skeletonLine} style={{ width: '40%' }} />
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
            <div className={styles.skeletonLine} style={{ width: '30%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
