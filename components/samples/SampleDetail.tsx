'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRDisplay } from '@/components/qr/QRDisplay';
import { PhaseTracker } from '@/components/samples/PhaseTracker';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './SampleDetail.module.css';
import type { PhaseEntry } from '@/types';

interface SampleDetailProps {
  sample: {
    id: string;
    humanId: string;
    slug: string;
    sampleType: string;
    source: string;
    collectionDate: string;
    description: string | null;
    experimentType: string | null;
    currentPhase: string | null;
    phaseHistory: PhaseEntry[];
    qrCodeUrl: string | null;
    createdBy: { name: string };
    parentSample?: { id: string; humanId: string } | null;
  };
  childSamples?: {
    id: string;
    humanId: string;
    currentPhase: string | null;
  }[];
}

export function SampleDetail({ sample, childSamples }: SampleDetailProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());
  const [batchPhase, setBatchPhase] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  const toggleChild = (id: string) => {
    setSelectedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchUpdate = async () => {
    if (!batchPhase.trim() || selectedChildren.size === 0) return;
    setIsBatchSubmitting(true);
    try {
      const res = await fetch('/api/samples/phases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleIds: Array.from(selectedChildren),
          phaseName: batchPhase.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Batch update failed');
      }

      showToast({ message: `Phase updated for ${selectedChildren.size} sample(s).`, type: 'success' });
      setIsBatchModalOpen(false);
      setBatchPhase('');
      setSelectedChildren(new Set());
      router.refresh();
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Failed to update phases.', type: 'error' });
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  return (
    <div className={styles.grid}>
      <div className={styles.mainCol}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <dl className={styles.list}>
            <div className={styles.row}>
              <dt>Type</dt>
              <dd>{sample.sampleType}</dd>
            </div>
            <div className={styles.row}>
              <dt>Source</dt>
              <dd>{sample.source}</dd>
            </div>
            <div className={styles.row}>
              <dt>Collection Date</dt>
              <dd>{new Date(sample.collectionDate).toLocaleDateString()}</dd>
            </div>
            {sample.description && (
              <div className={styles.row}>
                <dt>Description</dt>
                <dd>{sample.description}</dd>
              </div>
            )}
            {sample.experimentType && (
              <div className={styles.row}>
                <dt>Experiment</dt>
                <dd>{sample.experimentType}</dd>
              </div>
            )}
          </dl>
        </section>

        <PhaseTracker
          sampleId={sample.id}
          currentPhase={sample.currentPhase}
          phaseHistory={sample.phaseHistory}
        />

        {childSamples && childSamples.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Child Samples ({childSamples.length})</h2>
            <div className={styles.childrenSection}>
              {childSamples.map((child) => (
                <div key={child.id} className={styles.childItem}>
                  {hasPermission('update_phase') && (
                    <input
                      type="checkbox"
                      className={styles.childCheckbox}
                      checked={selectedChildren.has(child.id)}
                      onChange={() => toggleChild(child.id)}
                    />
                  )}
                  <Link href={`/samples/${child.id}`} className={styles.childLabel}>
                    {child.humanId}
                  </Link>
                  {child.currentPhase && (
                    <span>{child.currentPhase}</span>
                  )}
                </div>
              ))}
            </div>

            {hasPermission('update_phase') && selectedChildren.size > 0 && (
              <div className={styles.batchActions}>
                <input
                  className={styles.batchInput}
                  placeholder="New phase name"
                  value={batchPhase}
                  onChange={(e) => setBatchPhase(e.target.value)}
                  aria-label="New phase name"
                />
                <Button size="small" onClick={() => setIsBatchModalOpen(true)}>
                  Update {selectedChildren.size}
                </Button>
              </div>
            )}
          </section>
        )}
      </div>

      <div className={styles.sideCol}>
        <QRDisplay url={sample.qrCodeUrl} humanId={sample.humanId} />
      </div>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Batch Update Phase"
        primaryAction={{
          label: 'Update Phase',
          onClick: handleBatchUpdate,
          isLoading: isBatchSubmitting,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsBatchModalOpen(false),
        }}
      >
        <p>Set phase to &ldquo;{batchPhase}&rdquo; for {selectedChildren.size} sample(s)? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
