'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRScanner } from '@/components/qr/QRScanner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import styles from './scan.module.css';

export default function ScanPage() {
  const [humanId, setHumanId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanId.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/samples?humanId=${encodeURIComponent(humanId.trim())}`);
      if (res.status === 404) {
        showToast({ message: 'This sample does not exist.', type: 'error' });
        return;
      }
      if (!res.ok) throw new Error();
      
      const sample = await res.json();
      if (sample && sample.id) {
        router.push(`/samples/${sample.id}`);
      } else {
        showToast({ message: 'This sample does not exist.', type: 'error' });
      }
    } catch (err) {
      showToast({ message: 'Error searching for sample.', type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Scan QR Code</h1>
        <p className={styles.subtitle}>Point your camera at a sample QR code.</p>
      </header>

      <div className={styles.scannerSection}>
        <QRScanner />
      </div>

      <div className={styles.divider}>
        <span>OR</span>
      </div>

      <form className={styles.manualSection} onSubmit={handleSearch}>
        <h2 className={styles.manualTitle}>Search by ID</h2>
        <div className={styles.searchRow}>
          <Input
            label=""
            placeholder="e.g. TIS001"
            value={humanId}
            onChange={(e) => setHumanId(e.target.value)}
          />
          <Button type="submit" isLoading={isSearching}>Search</Button>
        </div>
      </form>
    </div>
  );
}
