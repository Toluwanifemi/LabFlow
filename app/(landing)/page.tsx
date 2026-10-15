'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { HeroSection } from './components/HeroSection';
import { HowItWorks } from './components/HowItWorks';
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/labflow-logo.png"
              alt="Labflow"
              className={styles.logoImage}
            />
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

      </main>

      <FooterSection />
    </div>
  );
}
