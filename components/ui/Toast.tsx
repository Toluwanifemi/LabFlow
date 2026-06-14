'use client';
import { useToast } from '@/hooks/useToast';
import styles from './Toast.module.css';

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
