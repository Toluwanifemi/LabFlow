'use client';
import styles from '../landing.module.css';

const steps = [
  {
    num: '01',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
    title: 'Create Your Lab',
    desc: 'Register your lab in under 30 seconds. Invite your team. No credit card required.',
  },
  {
    num: '02',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    title: 'Log Samples',
    desc: 'Three required fields, one tap. Get a unique sample ID and QR code instantly — even offline.',
  },
  {
    num: '03',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Track & Audit',
    desc: 'Phase changes, image uploads, every action is immutably recorded. Export for ethics boards and grants.',
  },
];

export function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={`${styles.sectionHeader} ${styles.reveal}`}>
        <h2 className={styles.sectionTitle}>Three steps to lab compliance</h2>
        <p className={styles.sectionSubtitle}>
          From sample collection to audit export — Labflow handles the paper trail so you can focus on the science.
        </p>
      </div>
      <div className={styles.stepsGrid}>
        {steps.map((step, i) => (
          <div key={step.num} className={`${styles.stepCard} ${styles.reveal} ${i === 0 ? styles.stagger1 : i === 1 ? styles.stagger2 : styles.stagger3}`}>
            <div className={styles.stepNumber}>{step.num}</div>
            <div className={styles.stepIcon}>{step.icon}</div>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepDesc}>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
