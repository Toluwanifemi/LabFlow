'use client';
import styles from '../landing.module.css';

export function FooterSection() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLogo}>
            <svg className={styles.footerLogoIcon} viewBox="0 0 24 24">
              <path d="M4.5 16.5c-1.5 1.25-2.5 3-2.5 5.5h20c0-2.5-1-4.25-2.5-5.5" />
              <path d="M12 2C7.5 2 6 5.5 6 9c0 3.5 1.5 7.5 6 7.5s6-4 6-7.5c0-3.5-1.5-7-6-7z" />
            </svg>
            LabFlow
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
