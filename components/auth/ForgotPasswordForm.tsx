'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import styles from '@/app/(auth)/auth/auth.module.css';

interface ForgotPasswordFormProps {
  onSwitchMode: (mode: string) => void;
}

export function ForgotPasswordForm({ onSwitchMode }: ForgotPasswordFormProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error || 'Something went wrong. Please try again later.', type: 'error' });
      } else {
        setSent(true);
      }
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className={styles.title}>Reset password</h1>
      <p className={styles.subtitle}>We&apos;ll send you a reset link</p>
      {sent ? (
        <div className={styles.successMessage}>
          <p>If an account with that email exists, a reset link has been sent.</p>
          <Button onClick={() => onSwitchMode('login')} className={styles.submitBtn}>
            Back to Log In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(''); }}
            onFocus={() => setEmailError('')}
            onBlur={() => { if (!email.trim()) setEmailError('This field cannot be empty'); }}
            error={emailError}
            required
            autoFocus
          />
          <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
            Send Reset Link
          </Button>
        </form>
      )}
      {!sent && (
        <p className={styles.footer}>
          Remember your password?{' '}
          <a onClick={() => onSwitchMode('login')}>Log in</a>
        </p>
      )}
    </>
  );
}
