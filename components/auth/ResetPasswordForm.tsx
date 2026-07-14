'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { PasswordToggle } from './PasswordToggle';
import { PasswordRules, validatePassword } from './passwordRules';
import styles from '@/app/(auth)/auth/auth.module.css';

interface ResetPasswordFormProps {
  token: string;
  onSwitchMode: (mode: string) => void;
}

export function ResetPasswordForm({ token, onSwitchMode }: ResetPasswordFormProps) {
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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ message: data.error || 'Something went wrong. Please try again later.', type: 'error' });
      } else {
        showToast({ message: 'Password reset successfully. You can now log in.', type: 'success' });
        onSwitchMode('login');
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
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.subtitle}>Enter your new password below</p>
        <div className={styles.successMessage}>
          <p>Invalid or missing reset token. Please request a new reset link.</p>
          <Button onClick={() => onSwitchMode('forgot-password')} className={styles.submitBtn}>
            Request Reset Link
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.title}>Set new password</h1>
      <p className={styles.subtitle}>Enter your new password below</p>
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
          Reset Password
        </Button>
      </form>
    </>
  );
}
