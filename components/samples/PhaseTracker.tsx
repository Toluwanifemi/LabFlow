'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { PhaseEntry } from '@/types';
import styles from './PhaseTracker.module.css';
import { usePermissions } from '@/hooks/usePermissions';

interface PhaseTrackerProps {
  sampleId: string;
  currentPhase: string | null;
  phaseHistory: PhaseEntry[];
}

export function PhaseTracker({ sampleId, currentPhase, phaseHistory }: PhaseTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPhase, setNewPhase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const handleUpdate = async () => {
    if (!newPhase.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/samples/${sampleId}/phases`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase.trim() })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update phase');
      }

      showToast({ message: `Phase updated to ${newPhase.trim()}.`, type: 'success' });
      setIsModalOpen(false);
      setNewPhase('');
      router.refresh();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Failed to update phase.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Current Phase</h3>
        {hasPermission('update_phase') && (
          <Button size="small" onClick={() => setIsModalOpen(true)}>Update Phase</Button>
        )}
      </div>
      
      {currentPhase ? (
        <div className={styles.currentPhaseBadge}>{currentPhase}</div>
      ) : (
        <div className={styles.empty}>No phase set</div>
      )}

      {phaseHistory.length > 0 && (
        <div className={styles.history}>
          <h4 className={styles.historyTitle}>History</h4>
          <ul className={styles.timeline}>
            {phaseHistory.map((entry, idx) => (
              <li key={idx} className={styles.timelineItem}>
                <div className={styles.timelineContent}>
                  <span className={styles.timelinePhase}>{entry.phase}</span>
                  <span className={styles.timelineMeta}>
                    {entry.updatedBy} • {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Phase"
        primaryAction={{
          label: 'Update Phase',
          onClick: handleUpdate,
          isLoading: isSubmitting
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsModalOpen(false)
        }}
      >
        <p>Set phase to {newPhase || '...'}? This cannot be undone.</p>
        <Input 
          label="New Phase" 
          value={newPhase} 
          onChange={(e) => setNewPhase(e.target.value)} 
          placeholder="e.g. Processing, In Transit"
          autoFocus
        />
      </Modal>
    </div>
  );
}
