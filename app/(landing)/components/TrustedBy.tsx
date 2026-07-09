'use client';
import styles from '../landing.module.css';

const labs = [
  { initials: 'UNILAG', name: 'University of Lagos' },
  { initials: 'UI', name: 'University of Ibadan' },
  { initials: 'OAU', name: 'Obafemi Awolowo University' },
  { initials: 'UNN', name: 'University of Nigeria, Nsukka' },
];

export function TrustedBy() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.trustedLabel}>Trusted by research labs at</p>
      </div>
      <div className={styles.trustedGrid}>
        {labs.map((lab) => (
          <div key={lab.initials} className={styles.trustedItem}>
            <div className={styles.trustedLogo}>
              <span className={styles.trustedInitials}>{lab.initials}</span>
            </div>
            <span className={styles.trustedName}>{lab.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
