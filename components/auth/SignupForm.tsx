'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { PasswordToggle } from './PasswordToggle';
import { PasswordRules } from './passwordRules';
import styles from '@/app/(auth)/auth/auth.module.css';

interface SignupFormProps {
  onSwitchMode: (mode: string) => void;
}

export function SignupForm({ onSwitchMode }: SignupFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [labName, setLabName] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const clearErrors = () => {
    setNameError('');
    setEmailError('');
  };

  const handleNext = () => {
    let valid = true;
    if (!name.trim()) { setNameError('This field cannot be empty'); valid = false; } else { setNameError(''); }
    if (!email.trim()) { setEmailError('This field cannot be empty'); valid = false; } else { setEmailError(''); }
    if (valid) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim().toLowerCase(), password, labName }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ message: data.error || 'Registration failed.', type: 'error' });
      } else {
        showToast({ message: 'Account created! Setting up your lab...', type: 'success' });
        const signInRes = await signIn('credentials', {
          redirect: false,
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInRes?.ok) {
          router.push('/onboarding');
        } else {
          showToast({ message: 'Account created. Please log in.', type: 'success' });
          onSwitchMode('login');
          setPassword('');
        }
      }
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>Create your Lab</h1>
      <p className={styles.subtitle}>Register for LabFlow</p>

      <div className={styles.steps}>
        <span className={step === 1 ? styles.stepActive : styles.step} />
        <span className={step === 2 ? styles.stepActive : styles.step} />
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {step === 1 ? (
          <>
            <Input label="Enter Full Name" value={name}
              onChange={e => { setName(e.target.value); setNameError(''); }}
              onFocus={clearErrors}
              onBlur={() => { if (!name.trim()) setNameError('This field cannot be empty'); }}
              required autoFocus error={nameError} />
            <Input label="Enter Email" type="email" value={email}
              onChange={e => { setEmail(e.target.value); if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) { setEmailError('Enter a valid email address'); } else { setEmailError(''); } }}
              onFocus={clearErrors}
              onBlur={() => { if (!email.trim()) setEmailError('This field cannot be empty'); }}
              required error={emailError} />
            <Button type="button" onClick={handleNext} className={styles.submitBtn}>
              Next
              <svg className={styles.arrowIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Button>
          </>
        ) : (
          <>
            <Input label="Lab Name" value={labName}
              onChange={e => setLabName(e.target.value)} required />
            <Input label="Password" type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => { setPasswordFocused(true); clearErrors(); }}
              onBlur={() => setPasswordFocused(false)}
              required
              suffix={password ? <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} /> : undefined} />
            <PasswordRules password={password} focused={passwordFocused} />
            <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
              Sign Up
            </Button>
            <div className={styles.backRow}>
              <a className={styles.forgotLink} onClick={() => setStep(1)}>Back</a>
            </div>
          </>
        )}
      </form>
      <p className={styles.footer}>
        Already have an account?{' '}
        <a onClick={() => onSwitchMode('login')}>Log in</a>
      </p>
    </>
  );
}
