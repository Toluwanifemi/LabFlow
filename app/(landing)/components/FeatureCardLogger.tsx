'use client';
import { useState } from 'react';
import styles from '../landing.module.css';

export function FeatureCardLogger() {
  const [sampleType, setSampleType] = useState('Blood');
  const [source, setSource] = useState('Patient');
  const [logCount, setLogCount] = useState(41);
  const [isLogging, setIsLogging] = useState(false);
  const [logFeedback, setLogFeedback] = useState<string | null>(null);

  const getPrefix = (type: string) => type.slice(0, 3).toUpperCase();
  const generatedId = `${getPrefix(sampleType)}-${String(logCount + 1).padStart(3, '0')}`;

  const handleQuickLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogging) return;
    setIsLogging(true);
    setLogFeedback(null);
    setTimeout(() => {
      setLogCount(prev => prev + 1);
      setIsLogging(false);
      setLogFeedback(`Saved: ${generatedId}`);
      setTimeout(() => setLogFeedback(null), 2500);
    }, 800);
  };

  return (
    <div className={`${styles.card} ${styles.reveal} ${styles.stagger1}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <svg viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
          </svg>
        </div>
        <h3 className={styles.cardTitle}>Log a Sample in Under 60 Seconds</h3>
        <p className={styles.cardDesc}>
          Three fields, one tap. Designed for mid-experiment logging with one hand.
        </p>
      </div>
      <div className={styles.cardInteractive}>
        <form onSubmit={handleQuickLog} className={styles.loggerForm}>
          <div className={styles.loggerField}>
            <label className={styles.loggerLabel}>Specimen Type</label>
            <select value={sampleType} onChange={e => setSampleType(e.target.value)} className={styles.loggerSelect}>
              <option value="Blood">Blood (BLD)</option>
              <option value="Tissue">Tissue (TIS)</option>
              <option value="DNA">DNA Extract (DNA)</option>
              <option value="Saliva">Saliva (SAL)</option>
            </select>
          </div>
          <div className={styles.loggerField}>
            <label className={styles.loggerLabel}>Sample Source</label>
            <input type="text" value={source} onChange={e => setSource(e.target.value)} className={styles.loggerInput} placeholder="e.g. Patient ID, Control" />
          </div>
          <div className={styles.loggerPreview}>
            <span className={styles.loggerIdLabel}>Next ID:</span>
            <span className={styles.loggerBadge}>{generatedId}</span>
          </div>
          <button type="submit" disabled={isLogging} className={styles.loggerBtn}>
            {isLogging ? (
              <span className={styles.loggerBtnLoader}>
                <span className={styles.spinner} />
                Saving Record...
              </span>
            ) : logFeedback ? (
              <span className={styles.loggerBtnSuccess}>{logFeedback}</span>
            ) : (
              'Log Specimen'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
