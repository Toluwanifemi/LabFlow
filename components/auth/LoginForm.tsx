'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordToggle } from './PasswordToggle';
import styles from '@/app/(auth)/auth/auth.module.css';

interface LoginFormProps {
  onSwitchMode: (mode: string) => void;
}

export function LoginForm({ onSwitchMode }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setLoginError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    let valid = true;
    if (!email.trim()) {
      setEmailError('This field cannot be empty');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!password.trim()) {
      setPasswordError('This field cannot be empty');
      valid = false;
    } else {
      setPasswordError('');
    }
    if (!valid) return;

    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      try {
        const statusRes = await fetch('/api/auth/session-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        const statusData = await statusRes.json();
        if (statusData?.unverified) {
          setLoginError('Please check your email to verify your account before logging in.');
          setIsLoading(false);
          return;
        }
      } catch {
        // fall through
      }

      const res = await signIn('credentials', {
        redirect: false,
        email: normalizedEmail,
        password,
      });
      if (res?.error) {
        setLoginError('Invalid email or password.');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setLoginError('Something went wrong. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>Welcome back</h1>
      <p className={styles.subtitle}>Log in to LabFlow</p>
      {loginError && <div className={styles.errorBox} role="alert">{loginError}</div>}
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setLoginError(''); if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) { setEmailError('Enter a valid email address'); } else { setEmailError(''); } }}
          onFocus={clearErrors}
          onBlur={() => { if (!email.trim()) setEmailError('This field cannot be empty'); }}
          error={emailError}
          required
          autoFocus
        />
        <Input
          label="Password"
          labelAction={<a onClick={() => onSwitchMode('forgot-password')} className={styles.forgotLink}>Forgot password?</a>}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => { setPassword(e.target.value); setLoginError(''); setPasswordError(''); }}
          onFocus={clearErrors}
          onBlur={() => { if (!password.trim()) setPasswordError('This field cannot be empty'); }}
          error={passwordError}
          required
          suffix={password ? <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} /> : undefined}
        />
        <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
          Log In
        </Button>
      </form>
      <p className={styles.footer}>
        Don&apos;t have an account?{' '}
        <a onClick={() => onSwitchMode('signup')}>Sign up</a>
      </p>
    </>
  );
}
