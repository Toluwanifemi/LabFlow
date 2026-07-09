'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { PREDEFINED_PHASES } from '@/lib/validators/sample';
import type { PhaseEntry } from '@/types';
import styles from './PhaseTracker.module.css';
import { usePermissions } from '@/hooks/usePermissions';

interface PhaseTrackerProps {
  sampleId: string;
  currentPhase: string | null;
  phaseHistory: PhaseEntry[];
  experimentType?: string | null;
}

export function PhaseTracker({ sampleId, currentPhase, phaseHistory, experimentType }: PhaseTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(currentPhase || 'Collection');
  const [experimentName, setExperimentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const router = useRouter();

  const isExperimentSelected = selectedPhase === 'Experiment';

  const handleOpen = () => {
    setSelectedPhase(currentPhase || 'Collection');
    setExperimentName(currentPhase === 'Experiment' && experimentType ? experimentType : '');
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (isExperimentSelected && !experimentName.trim()) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = { phase: selectedPhase };
      if (isExperimentSelected) body.experimentName = experimentName.trim();

      const res = await fetch(`/api/samples/${sampleId}/phases`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update phase');
      }

      const displayPhase = isExperimentSelected
        ? `Experiment — ${experimentName.trim()}`
        : selectedPhase;
      showToast({ message: `Phase updated to ${displayPhase}.`, type: 'success' });
      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Failed to update phase.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !isExperimentSelected || (isExperimentSelected && experimentName.trim().length > 0);

  const formatPhaseForDisplay = (entry: PhaseEntry) => {
    if (entry.experimentName) return `Experiment — ${entry.experimentName}`;
    return entry.phase;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Current Phase</h3>
        {hasPermission('update_phase') && (
          <Button size="small" onClick={handleOpen}>Update Phase</Button>
        )}
      </div>

      <div className={styles.currentPhaseBadge}>
        {currentPhase === 'Experiment' && experimentType
          ? `Experiment — ${experimentType}`
          : currentPhase || 'Collection'}
      </div>

      {phaseHistory.length > 0 && (
        <div className={styles.history}>
          <h4 className={styles.historyTitle}>History</h4>
          <ul className={styles.timeline}>
            {phaseHistory.map((entry, idx) => (
              <li key={idx} className={styles.timelineItem}>
                <div className={styles.timelineContent}>
                  <span className={styles.timelinePhase}>{formatPhaseForDisplay(entry)}</span>
                  <span className={styles.timelineMeta}>
                    {entry.updatedBy} &bull; {new Date(entry.timestamp).toLocaleDateString()}
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
          isLoading: isSubmitting,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsModalOpen(false),
        }}
      >
        <fieldset className={styles.radioGroup}>
          <legend className={styles.radioLegend}>Select phase</legend>
          {PREDEFINED_PHASES.map((phase) => (
            <label key={phase} className={`${styles.radioLabel} ${selectedPhase === phase ? styles.radioSelected : ''}`}>
              <input
                type="radio"
                name="phase"
                value={phase}
                checked={selectedPhase === phase}
                onChange={() => setSelectedPhase(phase)}
                className={styles.radioInput}
              />
              <span className={styles.radioDot} />
              <span className={styles.radioText}>{phase}</span>
            </label>
          ))}
        </fieldset>

        {isExperimentSelected && (
          <div className={styles.experimentField}>
            <Input
              label="Experiment name"
              value={experimentName}
              onChange={(e) => setExperimentName(e.target.value)}
              placeholder="e.g. PCR, Western Blot, ELISA"
              autoFocus
            />
          </div>
        )}

        <p className={styles.modalWarning}>
          Set phase to <strong>
            {isExperimentSelected
              ? `Experiment — ${experimentName || '...'}`
              : selectedPhase}
          </strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
