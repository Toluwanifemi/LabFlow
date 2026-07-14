import styles from './loading.module.css';

export default function DashboardLoading() {
  return (
    <div>
      {/* Greeting Skeleton */}
      <div style={{ marginBottom: '24px' }}>
        <div className={`${styles.titleSkeleton} ${styles.pulse}`} />
      </div>

      {/* Stats Cards Skeleton */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statSkeleton} ${styles.pulse}`} />
        <div className={`${styles.statSkeleton} ${styles.pulse}`} />
        <div className={`${styles.statSkeleton} ${styles.pulse}`} />
      </div>

      {/* Chart Skeleton */}
      <div>
        <div className={styles.sectionTitleSkeleton} />
        <div className={`${styles.chartSkeleton} ${styles.pulse}`} />
      </div>

      {/* Two-Column List Skeleton */}
      <div className={styles.twoCol}>
        <div>
          <div className={styles.sectionTitleSkeleton} />
          <div className={`${styles.listSkeleton} ${styles.pulse}`} />
        </div>
        <div>
          <div className={styles.sectionTitleSkeleton} />
          <div className={`${styles.listSkeleton} ${styles.pulse}`} />
        </div>
      </div>
    </div>
  );
}
