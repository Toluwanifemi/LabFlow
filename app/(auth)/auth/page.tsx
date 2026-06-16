'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import styles from './auth.module.css';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify';

function AuthForms() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
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

  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [labName, setLabName] = useState('');

  const [signupStep, setSignupStep] = useState(1);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');

  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetConfirmError, setResetConfirmError] = useState('');

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [verifyPasswordFocused, setVerifyPasswordFocused] = useState(false);
  const [resetPasswordFocused, setResetPasswordFocused] = useState(false);

  const [forgotSent, setForgotSent] = useState(false);

  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyConfirmPassword, setVerifyConfirmPassword] = useState('');
  const [verifyPasswordError, setVerifyPasswordError] = useState('');
  const [verifyConfirmError, setVerifyConfirmError] = useState('');

  const clearFormState = () => {
    setName('');
    setEmail('');
    setPassword('');
    setLabName('');
    setSignupStep(1);
    setNameError('');
    setEmailError('');
    setLoginEmailError('');
    setLoginPasswordError('');
    setLoginError('');
    setResetPassword('');
    setResetConfirmPassword('');
    setResetPasswordError('');
    setResetConfirmError('');
    setVerifyPassword('');
    setVerifyConfirmPassword('');
    setVerifyPasswordError('');
    setVerifyConfirmError('');
    setForgotSent(false);
  };

  const clearAllErrors = () => {
    setNameError('');
    setEmailError('');
    setLoginEmailError('');
    setLoginPasswordError('');
    setLoginError('');
    setResetPasswordError('');
    setResetConfirmError('');
    setVerifyPasswordError('');
    setVerifyConfirmError('');
  };

  const switchMode = (newMode: AuthMode) => {
    clearFormState();
    setCurrentMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    let valid = true;
    if (!email.trim()) {
      setLoginEmailError('This field cannot be empty');
      valid = false;
    } else {
      setLoginEmailError('');
    }
    if (!password.trim()) {
      setLoginPasswordError('This field cannot be empty');
      valid = false;
    } else {
      setLoginPasswordError('');
    }
    if (!valid) return;
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if email exists but is unverified
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
        // fall through to normal login
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

  const handleNext = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError('This field cannot be empty');
      valid = false;
    } else {
      setNameError('');
    }
    if (!email.trim()) {
      setEmailError('This field cannot be empty');
      valid = false;
    } else {
      setEmailError('');
    }
    if (valid) setSignupStep(2);
  };

  const handleSignup = async (e: React.FormEvent) => {
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
        // Auto-login and redirect to onboarding
        const signInRes = await signIn('credentials', {
          redirect: false,
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInRes?.ok) {
          router.push('/onboarding');
        } else {
          showToast({ message: 'Account created. Please log in.', type: 'success' });
          switchMode('login');
          setPassword('');
        }
      }
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLoginEmailError('Enter a valid email address');
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
        setForgotSent(true);
      }
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!resetPassword) {
      setResetPasswordError('This field cannot be empty');
      valid = false;
    } else if (!/[A-Z]/.test(resetPassword)) {
      setResetPasswordError('Must include an uppercase letter.');
      valid = false;
    } else if (!/[a-z]/.test(resetPassword)) {
      setResetPasswordError('Must include a lowercase letter.');
      valid = false;
    } else if (!/[0-9]/.test(resetPassword)) {
      setResetPasswordError('Must include a number.');
      valid = false;
    } else if (resetPassword.length < 8) {
      setResetPasswordError('Minimum of 8 characters.');
      valid = false;
    } else {
      setResetPasswordError('');
    }

    if (!resetConfirmPassword) {
      setResetConfirmError('This field cannot be empty');
      valid = false;
    } else if (resetPassword !== resetConfirmPassword) {
      setResetConfirmError('Passwords do not match');
      valid = false;
    } else {
      setResetConfirmError('');
    }

    if (!valid) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ message: data.error || 'Something went wrong. Please try again later.', type: 'error' });
      } else {
        showToast({ message: 'Password reset successfully. You can now log in.', type: 'success' });
        switchMode('login');
      }
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <a href="/" className={styles.logo}>LabFlow</a>
      <div className={styles.card}>
        {currentMode === 'login' && (
          <>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Log in to LabFlow</p>
            {loginError && <div className={styles.errorBox} role="alert">{loginError}</div>}
            <form onSubmit={handleLogin} className={styles.form} noValidate>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setLoginError(''); if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) { setLoginEmailError('Enter a valid email address'); } else { setLoginEmailError(''); } }}
                onFocus={clearAllErrors}
                onBlur={() => { if (!email.trim()) setLoginEmailError('This field cannot be empty'); }}
                error={loginEmailError}
                required
                autoFocus
              />
              <Input
                label="Password"
                labelAction={<a onClick={() => switchMode('forgot-password')} className={styles.forgotLink}>Forgot password?</a>}
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(''); setLoginPasswordError(''); }}
                onFocus={clearAllErrors}
                onBlur={() => { if (!password.trim()) setLoginPasswordError('This field cannot be empty'); }}
                error={loginPasswordError}
                required
              />
              <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
                Log In
              </Button>
            </form>
            <p className={styles.footer}>
              Don&apos;t have an account?{' '}
              <a onClick={() => switchMode('signup')}>Sign up</a>
            </p>
          </>
        )}

        {currentMode === 'signup' && (
          <>
            <h1 className={styles.title}>Create your Lab</h1>
            <p className={styles.subtitle}>Register for LabFlow</p>

            <div className={styles.steps}>
              <span className={signupStep === 1 ? styles.stepActive : styles.step} />
              <span className={signupStep === 2 ? styles.stepActive : styles.step} />
            </div>

            <form onSubmit={handleSignup} className={styles.form}>
              {signupStep === 1 ? (
                <>
                  <Input label="Enter Full Name" value={name}
                    onChange={e => { setName(e.target.value); setNameError(''); }}
                    onFocus={clearAllErrors}
                    onBlur={() => { if (!name.trim()) setNameError('This field cannot be empty'); }}
                    required autoFocus error={nameError} />
                  <Input label="Enter Email" type="email" value={email}
                    onChange={e => { setEmail(e.target.value); if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) { setEmailError('Enter a valid email address'); } else { setEmailError(''); } }}
                    onFocus={clearAllErrors}
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
                  <Input label="Password" type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => { setPasswordFocused(true); clearAllErrors(); }}
                    onBlur={() => setPasswordFocused(false)}
                    required />
                  {passwordFocused && (
                    <ul className={styles.passwordRules}>
                      {!/[A-Z]/.test(password) && <li>Must include an uppercase letter</li>}
                      {/[A-Z]/.test(password) && !/[a-z]/.test(password) && <li>Must include a lowercase letter</li>}
                      {/[A-Z]/.test(password) && /[a-z]/.test(password) && !/[0-9]/.test(password) && <li>Must include a number</li>}
                      {/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && password.length < 8 && <li>Minimum of 8 characters</li>}
                    </ul>
                  )}
                  <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
                    Sign Up
                  </Button>
                  <div className={styles.backRow}>
                    <a className={styles.forgotLink} onClick={() => setSignupStep(1)}>Back</a>
                  </div>
                </>
              )}
            </form>
            <p className={styles.footer}>
              Already have an account?{' '}
              <a onClick={() => switchMode('login')}>Log in</a>
            </p>
          </>
        )}

        {currentMode === 'forgot-password' && (
          <>
            <h1 className={styles.title}>Reset password</h1>
            <p className={styles.subtitle}>We&apos;ll send you a reset link</p>
            {forgotSent ? (
              <div className={styles.successMessage}>
                <p>If an account with that email exists, a reset link has been sent.</p>
                <Button onClick={() => switchMode('login')} className={styles.submitBtn}>
                  Back to Log In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className={styles.form}>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setLoginEmailError(''); }}
                   onFocus={clearAllErrors}
onBlur={() => { if (!email.trim()) setLoginEmailError('This field cannot be empty'); }}
                  error={loginEmailError}
                  required
                  autoFocus
                />
                <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
                  Send Reset Link
                </Button>
              </form>
            )}
            {!forgotSent && (
              <p className={styles.footer}>
                Remember your password?{' '}
                <a onClick={() => switchMode('login')}>Log in</a>
              </p>
            )}
          </>
        )}

        {currentMode === 'verify' && (
          <>
            <h1 className={styles.title}>Set your password</h1>
            <p className={styles.subtitle}>Verify your email and create a new password</p>
            {!resetToken ? (
              <div className={styles.successMessage}>
                <p>Invalid or missing verification link. Please ask your admin to resend the invite.</p>
                <Button onClick={() => switchMode('login')} className={styles.submitBtn}>
                  Back to Log In
                </Button>
              </div>
            ) : (
              <form noValidate onSubmit={async (e) => {
                e.preventDefault();
                let valid = true;
                if (!verifyPassword) {
                  setVerifyPasswordError('This field cannot be empty');
                  valid = false;
                } else if (!/[A-Z]/.test(verifyPassword)) {
                  setVerifyPasswordError('Must include an uppercase letter.');
                  valid = false;
                } else if (!/[a-z]/.test(verifyPassword)) {
                  setVerifyPasswordError('Must include a lowercase letter.');
                  valid = false;
                } else if (!/[0-9]/.test(verifyPassword)) {
                  setVerifyPasswordError('Must include a number.');
                  valid = false;
                } else if (verifyPassword.length < 8) {
                  setVerifyPasswordError('Minimum of 8 characters.');
                  valid = false;
                } else {
                  setVerifyPasswordError('');
                }
                if (!verifyConfirmPassword) {
                  setVerifyConfirmError('This field cannot be empty');
                  valid = false;
                } else if (verifyPassword !== verifyConfirmPassword) {
                  setVerifyConfirmError('Passwords do not match');
                  valid = false;
                } else {
                  setVerifyConfirmError('');
                }
                if (!valid) return;
                setIsLoading(true);
                try {
                  const res = await fetch('/api/auth/verify-invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: resetToken, password: verifyPassword }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    showToast({ message: data.error || 'Something went wrong. Please try again later.', type: 'error' });
                  } else {
                    showToast({ message: 'Email verified and password set.', type: 'success' });
                    const signInRes = await signIn('credentials', {
                      redirect: false,
                      email: data.email,
                      password: verifyPassword,
                    });
                    window.location.href = signInRes?.ok ? '/dashboard' : '/auth';
                  }
                } catch {
                  showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
                } finally {
                  setIsLoading(false);
                }
              }} className={styles.form}>
                <Input
                  label="New Password"
                  type="password"
                  value={verifyPassword}
                  onChange={e => setVerifyPassword(e.target.value)}
                  onFocus={() => { setVerifyPasswordFocused(true); clearAllErrors(); }}
                  onBlur={() => setVerifyPasswordFocused(false)}
                  error={verifyPasswordError}
                  required
                  autoFocus
                />
                {verifyPasswordFocused && (
                  <ul className={styles.passwordRules}>
                    {!/[A-Z]/.test(verifyPassword) && <li>Must include an uppercase letter</li>}
                    {/[A-Z]/.test(verifyPassword) && !/[a-z]/.test(verifyPassword) && <li>Must include a lowercase letter</li>}
                    {/[A-Z]/.test(verifyPassword) && /[a-z]/.test(verifyPassword) && !/[0-9]/.test(verifyPassword) && <li>Must include a number</li>}
                    {/[A-Z]/.test(verifyPassword) && /[a-z]/.test(verifyPassword) && /[0-9]/.test(verifyPassword) && verifyPassword.length < 8 && <li>Minimum of 8 characters</li>}
                  </ul>
                )}
                <Input
                  label="Confirm Password"
                  type="password"
                  value={verifyConfirmPassword}
                  onChange={e => setVerifyConfirmPassword(e.target.value)}
                  onFocus={clearAllErrors}
                  error={verifyConfirmError}
                  required
                />
                <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
                  Verify and Set Password
                </Button>
              </form>
            )}
          </>
        )}

        {currentMode === 'reset-password' && (
          <>
            <h1 className={styles.title}>Set new password</h1>
            <p className={styles.subtitle}>Enter your new password below</p>
            {!resetToken ? (
              <div className={styles.successMessage}>
                <p>Invalid or missing reset token. Please request a new reset link.</p>
                <Button onClick={() => switchMode('forgot-password')} className={styles.submitBtn}>
                  Request Reset Link
                </Button>
              </div>
            ) : (
              <form noValidate onSubmit={handleResetPassword} className={styles.form}>
                <Input
                  label="New Password"
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  onFocus={() => { setResetPasswordFocused(true); clearAllErrors(); }}
                  onBlur={() => setResetPasswordFocused(false)}
                  error={resetPasswordError}
                  required
                  autoFocus
                />
                {resetPasswordFocused && (
                  <ul className={styles.passwordRules}>
                    {!/[A-Z]/.test(resetPassword) && <li>Must include an uppercase letter</li>}
                    {/[A-Z]/.test(resetPassword) && !/[a-z]/.test(resetPassword) && <li>Must include a lowercase letter</li>}
                    {/[A-Z]/.test(resetPassword) && /[a-z]/.test(resetPassword) && !/[0-9]/.test(resetPassword) && <li>Must include a number</li>}
                    {/[A-Z]/.test(resetPassword) && /[a-z]/.test(resetPassword) && /[0-9]/.test(resetPassword) && resetPassword.length < 8 && <li>Minimum of 8 characters</li>}
                  </ul>
                )}
                <Input
                  label="Confirm Password"
                  type="password"
                  value={resetConfirmPassword}
                  onChange={e => setResetConfirmPassword(e.target.value)}
                  onFocus={clearAllErrors}
                  error={resetConfirmError}
                  required
                />
                <Button type="submit" isLoading={isLoading} className={styles.submitBtn}>
                  Reset Password
                </Button>
              </form>
            )}
          </>
        )}
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
