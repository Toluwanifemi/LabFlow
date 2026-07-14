'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { PasswordToggle } from './PasswordToggle';
import { PasswordRules, validatePassword } from './passwordRules';
import styles from '@/app/(auth)/auth/auth.module.css';

interface VerifyPasswordFormProps {
  token: string;
  onSwitchMode: (mode: string) => void;
}

export function VerifyPasswordForm({ token, onSwitchMode }: VerifyPasswordFormProps) {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const clearErrors = () => {
    setPasswordError('');
    setConfirmError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    const pwErr = validatePassword(password);
    if (pwErr) { setPasswordError(pwErr); valid = false; } else { setPasswordError(''); }

    if (!confirmPassword) { setConfirmError('This field cannot be empty'); valid = false; }
    else if (password !== confirmPassword) { setConfirmError('Passwords do not match'); valid = false; }
    else { setConfirmError(''); }

    if (!valid) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ message: data.error || 'Something went wrong. Please try again later.', type: 'error' });
      } else {
        showToast({ message: 'Email verified and password set.', type: 'success' });
        const signInRes = await signIn('credentials', {
          redirect: false,
          email: data.email,
          password,
        });
        window.location.href = signInRes?.ok ? '/dashboard' : '/auth';
      }
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <h1 className={styles.title}>Set your password</h1>
        <p className={styles.subtitle}>Verify your email and create a new password</p>
        <div className={styles.successMessage}>
          <p>Invalid or missing verification link. Please ask your admin to resend the invite.</p>
          <Button onClick={() => onSwitchMode('login')} className={styles.submitBtn}>
            Back to Log In
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.title}>Set your password</h1>
      <p className={styles.subtitle}>Verify your email and create a new password</p>
      <form noValidate onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onFocus={() => { setPasswordFocused(true); clearErrors(); }}
          onBlur={() => setPasswordFocused(false)}
          error={passwordError}
          required
          autoFocus
          suffix={password ? <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} /> : undefined}
        />
        <PasswordRules password={password} focused={passwordFocused} />
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          onFocus={clearErrors}
          error={confirmError}
          required
          suffix={confirmPassword ? <PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} /> : undefined}
        />
        <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
          Verify and Set Password
        </Button>
      </form>
    </>
  );
}
