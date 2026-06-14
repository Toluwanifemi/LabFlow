'use client';
import { useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useSessionCheck() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session-check');
        if (res.status === 401) {
          await signOut({ redirect: false });
          window.location.href = '/auth';
        }
      } catch {
        // Network error — don't log out, browser will retry
      }
    };

    // Check immediately on mount
    checkSession();
    intervalRef.current = setInterval(checkSession, CHECK_INTERVAL);

    // Also check on visibility change (user returning to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
