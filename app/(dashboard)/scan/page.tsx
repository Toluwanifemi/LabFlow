'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRScanner } from '@/components/qr/QRScanner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import styles from './scan.module.css';

export default function ScanPage() {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
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
    } catch {
      showToast({ message: 'Error searching for sample.', type: 'error' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Scan QR Code</h1>
        <p className={styles.subtitle}>
          {activeTab === 'camera'
            ? 'Point your camera at a sample QR code.'
            : 'Enter the sample ID to locate the record.'}
        </p>
      </header>

      <div className={styles.tabContainer} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'camera'}
          className={`${styles.tabButton} ${activeTab === 'camera' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('camera')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Scan Camera
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manual'}
          className={`${styles.tabButton} ${activeTab === 'manual' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search by ID
        </button>
      </div>

      <div className={styles.tabContent} key={activeTab}>
        {activeTab === 'camera' ? (
          <div className={styles.scannerSection}>
            <QRScanner onCameraError={() => setActiveTab('manual')} />
          </div>
        ) : (
          <form className={styles.manualSection} onSubmit={handleSearch}>
            <div className={styles.searchRow}>
              <Input
                label="Sample ID"
                placeholder="e.g. TIS001"
                value={humanId}
                onChange={(e) => setHumanId(e.target.value)}
              />
              <Button type="submit" isLoading={isSearching}>
                Search
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
