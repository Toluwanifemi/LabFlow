'use client';
import Link from 'next/link';
import styles from '../landing.module.css';

export function HeroSection() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroLayout}>
        <div className={styles.heroContent}>
          <h1 className={`${styles.heroTitle} ${styles.reveal} ${styles.stagger1}`}>
            Never lose track of <span className={styles.heroHighlight}>a sample</span> again.
          </h1>
          <p className={`${styles.heroSubtitle} ${styles.reveal} ${styles.stagger2}`}>
            Log biological samples in seconds — in the lab, in the field, even offline.
            One screen. Three fields. Permanent audit trail.
          </p>
          <div className={`${styles.heroActions} ${styles.reveal} ${styles.stagger3}`}>
            <Link href="/auth?mode=signup" prefetch={false} className={styles.ctaPrimary}>
              Start Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link href="#features" className={styles.ctaSecondary}>
              See How It Works
            </Link>
          </div>
          <div className={`${styles.heroStats} ${styles.reveal} ${styles.stagger3}`}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>1,200+</span>
              <span className={styles.heroStatLabel}>samples logged</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>50+</span>
              <span className={styles.heroStatLabel}>active labs</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>99.9%</span>
              <span className={styles.heroStatLabel}>uptime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
