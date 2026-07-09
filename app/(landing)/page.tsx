'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { HeroSection } from './components/HeroSection';
import { HowItWorks } from './components/HowItWorks';
import { TrustedBy } from './components/TrustedBy';
import { FeatureCardLogger } from './components/FeatureCardLogger';
import { FeatureCardSync } from './components/FeatureCardSync';
import { FeatureCardAudit } from './components/FeatureCardAudit';
import { FooterSection } from './components/FooterSection';
import styles from './landing.module.css';

export default function LandingPage() {
  const { data: session } = useSession();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.active);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll(`.${styles.reveal}`);
    elements.forEach((el) => observer.observe(el));
    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <svg className={styles.logoIcon} viewBox="0 0 24 24">
              <path d="M4.5 16.5c-1.5 1.25-2.5 3-2.5 5.5h20c0-2.5-1-4.25-2.5-5.5" />
              <path d="M12 2C7.5 2 6 5.5 6 9c0 3.5 1.5 7.5 6 7.5s6-4 6-7.5c0-3.5-1.5-7-6-7z" />
            </svg>
            LabFlow
          </Link>
          <nav className={styles.headerNav}>
            {session?.user ? (
              <Link href="/dashboard" className={styles.ctaLink}>Dashboard</Link>
            ) : (
              <Link href="/auth" className={styles.headerLink}>Sign In</Link>
            )}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <HeroSection />

        <HowItWorks />

        <section id="features" className={styles.featureSection}>
          <div className={`${styles.sectionHeader} ${styles.reveal}`}>
            <h2 className={styles.sectionTitle}>Try it yourself</h2>
            <p className={styles.sectionSubtitle}>
              These interactive demos work exactly like the real thing. No account needed.
            </p>
          </div>
          <div className={styles.featureGrid}>
            <FeatureCardLogger />
            <FeatureCardSync />
            <FeatureCardAudit />
          </div>
        </section>

      </main>

      <FooterSection />
    </div>
  );
}
