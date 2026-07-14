'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { VerifyPasswordForm } from '@/components/auth/VerifyPasswordForm';
import styles from './auth.module.css';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify';

function AuthForms() {
  const searchParams = useSearchParams();
  const rawMode = searchParams.get('mode') || 'login';
  const resetToken = searchParams.get('token') || '';

  const mode: AuthMode = rawMode === 'signup' ? 'signup'
    : rawMode === 'forgot-password' ? 'forgot-password'
    : rawMode === 'reset-password' ? 'reset-password'
    : rawMode === 'verify' ? 'verify'
    : 'login';

  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  const switchMode = (newMode: string) => {
    const mode = newMode as AuthMode;
    setCurrentMode(mode);
    const sp = new URLSearchParams(window.location.search);
    if (mode !== 'login') {
      sp.set('mode', mode);
    } else {
      sp.delete('mode');
    }
    const qs = sp.toString();
    window.history.replaceState(null, '', qs ? `/auth?${qs}` : '/auth');
  };

  return (
    <main className={styles.main}>
      <a href="/" className={styles.logo}>LabFlow</a>
      <div className={styles.card}>
        {currentMode === 'login' && <LoginForm onSwitchMode={switchMode} />}
        {currentMode === 'signup' && <SignupForm onSwitchMode={switchMode} />}
        {currentMode === 'forgot-password' && <ForgotPasswordForm onSwitchMode={switchMode} />}
        {currentMode === 'reset-password' && <ResetPasswordForm token={resetToken} onSwitchMode={switchMode} />}
        {currentMode === 'verify' && <VerifyPasswordForm token={resetToken} onSwitchMode={switchMode} />}
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForms />
    </Suspense>
  );
}
