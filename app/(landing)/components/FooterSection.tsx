'use client';
import styles from '../landing.module.css';

export function FooterSection() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/labflow-logo.png"
              alt="Labflow"
              className={styles.footerLogoImage}
            />
          </span>
          <p className={styles.footerDesc}>
            Mobile-first biological sample logging for researchers across Africa.
          </p>
        </div>
        <div className={styles.footerCopyright}>
          <p>&copy; {new Date().getFullYear()} LabFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
