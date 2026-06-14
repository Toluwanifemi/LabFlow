'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [labName, setLabName] = useState('');
  const [institution, setInstitution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user?.labName) {
      setLabName(session.user.labName);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/lab', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: labName, institution }),
      });

      if (res.ok) {
        showToast({ message: 'Lab settings updated.', type: 'success' });
        router.refresh();
      } else {
        const data = await res.json();
        showToast({ message: data.error || 'Failed to update settings.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lab Settings</h1>
        <p className={styles.subtitle}>Manage your lab profile and preferences.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Lab Name"
          value={labName}
          onChange={e => setLabName(e.target.value)}
          required
        />
        <Input
          label="Institution"
          value={institution}
          onChange={e => setInstitution(e.target.value)}
          placeholder="e.g. University of Lagos"
        />

        <Button type="submit" isLoading={isSubmitting} className={styles.submitBtn}>
          Save Settings
        </Button>
      </form>
    </div>
  );
}
