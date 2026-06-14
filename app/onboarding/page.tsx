'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import styles from './onboarding.module.css';

const RESEARCH_FIELDS = [
  'Cancer Biology',
  'Molecular Biology',
  'Genetics',
  'Microbiology',
  'Immunology',
  'Neuroscience',
  'Pharmacology',
  'Biochemistry',
  'Cell Biology',
  'Developmental Biology',
  'Ecology',
  'Other',
];

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [institution, setInstitution] = useState('');
  const [researchFields, setResearchFields] = useState<string[]>([]);
  const [role, setRole] = useState(session?.user?.role || 'ADMIN');
  const [institutionError, setInstitutionError] = useState('');
  const [researchFieldsError, setResearchFieldsError] = useState('');

  useEffect(() => {
    if (session?.user?.onboardingCompleted) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleStep1Next = (e: FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!institution.trim()) {
      setInstitutionError('This field is required');
      valid = false;
    } else {
      setInstitutionError('');
    }
    if (researchFields.length === 0) {
      setResearchFieldsError('Select at least one research field');
      valid = false;
    } else {
      setResearchFieldsError('');
    }
    if (valid) setStep(2);
  };

  const handleStep2Next = (e: FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution: institution.trim(), researchFields, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error || 'Failed to save onboarding data.', type: 'error' });
        return;
      }
      await update({ onboardingCompleted: true });
      router.push('/dashboard');
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const userName = session?.user?.name || 'Researcher';

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Header */}
        <Link href="/" className={styles.logo}>LabFlow</Link>

        {/* Progress */}
        <div className={styles.progressContainer}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
          </div>
          <div className={styles.steps}>
            {[1, 2, 3].map((s) => {
              const isCompleted = step > s;
              const isActive = step === s;
              return (
                <button
                  key={s}
                  type="button"
                  className={`${styles.stepDot} ${isActive ? styles.stepDotActive : ''} ${isCompleted ? styles.stepDotCompleted : ''}`}
                  disabled={s > step}
                  onClick={() => {
                    if (s < step) {
                      setStep(s);
                    }
                  }}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${s}`}
                >
                  {isCompleted ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 1: Lab Profile */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className={styles.card}>
            <div className={styles.cardHeader}>
              <h1 className={styles.title}>Welcome, {userName}</h1>
              <p className={styles.subtitle}>Tell us about your lab to get started</p>
            </div>
            <div className={styles.form}>
              <Input
                label="Institution"
                placeholder="e.g. University of Lagos"
                value={institution}
                onChange={e => { setInstitution(e.target.value); setInstitutionError(''); }}
                onBlur={() => { if (!institution.trim()) setInstitutionError('This field is required'); }}
                error={institutionError}
                required
              />
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Research Fields</label>
                <div className={styles.chipGrid}>
                  {RESEARCH_FIELDS.map((field) => {
                    const isSelected = researchFields.includes(field);
                    return (
                      <button
                        key={field}
                        type="button"
                        className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setResearchFields(prev =>
                            isSelected
                              ? prev.filter(f => f !== field)
                              : [...prev, field]
                          );
                          setResearchFieldsError('');
                        }}
                      >
                        {field}
                      </button>
                    );
                  })}
                </div>
                {researchFieldsError && (
                  <span className={styles.fieldError}>{researchFieldsError}</span>
                )}
              </div>
            </div>
            <div className={styles.buttonRow}>
              <Button type="submit">
                Continue
              </Button>
            </div>
            <div className={`${styles.skipRow} ${styles.skipRowCenter}`}>
              <button type="button" className={styles.skipLink} onClick={() => setStep(2)}>
                Skip For Now
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Your Role */}
        {step === 2 && (
          <form onSubmit={handleStep2Next} className={styles.card}>
            <div className={styles.cardHeader}>
              <h1 className={styles.title}>Your Role</h1>
              <p className={styles.subtitle}>Confirm how you&apos;ll use LabFlow</p>
            </div>
            <div className={styles.form}>
              <div className={styles.fieldGroup}>
                <div className={styles.roleGrid} role="radiogroup" aria-labelledby="role-group-label">
                  {([
                    { value: 'RESEARCHER', label: 'Researcher', desc: 'Log samples, track experiments, manage data' },
                    { value: 'PI', label: 'Principal Investigator', desc: 'Oversee lab, review data, manage team' },
                    { value: 'STUDENT', label: 'Student', desc: 'Log samples, learn the process' },
                    { value: 'ADMIN', label: 'Lab Manager', desc: 'Full access to manage lab operations' },
                  ] as const).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      role="radio"
                      aria-checked={role === r.value}
                      className={`${styles.roleCard} ${role === r.value ? styles.roleCardActive : ''}`}
                      onClick={() => setRole(r.value)}
                    >
                      <span className={styles.roleLabel}>{r.label}</span>
                      <span className={styles.roleDesc}>{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.buttonRow}>
              <Button type="submit">
                Continue
              </Button>
            </div>
            <div className={styles.skipRow}>
              <button type="button" className={styles.skipLink} onClick={() => setStep(1)}>Go Back</button>
              <button type="button" className={styles.skipLink} onClick={() => setStep(3)}>Skip</button>
            </div>
          </form>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.checkmark}>✓</div>
              <h1 className={styles.title}>You&apos;re all set!</h1>
              <p className={styles.subtitle}>Here&apos;s a quick overview of your lab</p>
            </div>
            <dl className={styles.summary}>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryLabel}>Lab</dt>
                <dd className={styles.summaryValue}>{session?.user?.labName || 'Not specified'}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryLabel}>Institution</dt>
                <dd className={styles.summaryValue}>{institution.trim() || 'Not specified'}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryLabel}>Research</dt>
                <dd className={styles.summaryValue}>{researchFields.join(', ') || 'Not specified'}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryLabel}>Role</dt>
                <dd className={styles.summaryValue}>{role || 'Not specified'}</dd>
              </div>
            </dl>
            <div className={styles.buttonRow}>
              <Button onClick={handleComplete} isLoading={isLoading}>
                Go to Dashboard
              </Button>
            </div>
            <div className={`${styles.skipRow} ${styles.skipRowCenter}`}>
              <button type="button" className={styles.skipLink} onClick={() => setStep(2)}>Go Back</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}