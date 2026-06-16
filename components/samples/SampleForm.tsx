'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useToast } from '@/hooks/useToast';
import styles from './SampleForm.module.css';

interface SampleFormData {
  sampleType: string;
  source: string;
  collectionDate: string;
  description?: string;
  experimentType?: string;
  childCount: number;
}

export function SampleForm() {
  const router = useRouter();
  const { addToQueue, isOnline } = useSyncQueue();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<SampleFormData>({
    sampleType: '',
    source: '',
    collectionDate: new Date().toISOString().split('T')[0],
    description: '',
    experimentType: '',
    childCount: 1,
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof SampleFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replicatesText, setReplicatesText] = useState('1');

  const validate = () => {
    const newErrors: any = {};
    if (!formData.sampleType) newErrors.sampleType = 'This field is required.';
    if (!formData.source) newErrors.source = 'This field is required.';
    if (!formData.collectionDate) newErrors.collectionDate = 'This field is required.';
    
    const countVal = parseInt(replicatesText);
    if (!replicatesText) {
      newErrors.childCount = 'Replicates count is required.';
    } else if (isNaN(countVal) || countVal < 1 || countVal > 10) {
      newErrors.childCount = 'Must be between 1 and 10.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);

    const payload: Record<string, any> = {
      sampleType: formData.sampleType.trim(),
      source: formData.source.trim(),
      collectionDate: formData.collectionDate.trim(),
      description: formData.description?.trim() || undefined,
      experimentType: formData.experimentType?.trim() || undefined,
      childCount: formData.childCount,
    };

    try {
      if (!isOnline) {
        const localId = `local-${Math.random().toString(36).substring(2, 9)}`;
        await addToQueue({
          id: localId,
          endpoint: '/api/samples',
          method: 'POST',
          payload,
        });
        router.push('/dashboard');
        return;
      }

      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          showToast({ message: 'This sample ID already exists in your lab.', type: 'error' });
        } else {
          showToast({ message: data.error || 'Something went wrong. Please try again later.', type: 'error' });
        }
        return;
      }

      if (data.children) {
        showToast({ message: `${data.children.length + 1} samples saved (${data.parent.humanId} + ${data.children.length} replicates).`, type: 'success' });
        router.push(`/samples/${data.parent.id}`);
      } else {
        showToast({ message: `Sample ${data.humanId} saved.`, type: 'success' });
        router.push(`/samples/${data.id}`);
      }

    } catch (err) {
      console.error('[SampleForm] Submit error, falling back to offline queue:', err);
      const localId = `local-${Math.random().toString(36).substring(2, 9)}`;
      await addToQueue({
        id: localId,
        endpoint: '/api/samples',
        method: 'POST',
        payload,
      });
      showToast({ message: 'Saved offline. Will sync when connected.', type: 'warning' });
      router.push('/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Sample Type"
        value={formData.sampleType}
        onChange={e => setFormData({ ...formData, sampleType: e.target.value })}
        error={errors.sampleType}
        placeholder="e.g. Blood, Tissue"
      />
      <Input
        label="Source"
        value={formData.source}
        onChange={e => setFormData({ ...formData, source: e.target.value })}
        error={errors.source}
        placeholder="e.g. Patient A, Mouse 1"
      />
      <Input
        label="Collection Date"
        type="date"
        value={formData.collectionDate}
        onChange={e => setFormData({ ...formData, collectionDate: e.target.value })}
        error={errors.collectionDate}
      />
      <Input
        label="Replicates (1–10)"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={replicatesText}
        onChange={e => {
          const val = e.target.value.replace(/[^0-9]/g, '');
          setReplicatesText(val);
          if (val) {
            const num = parseInt(val);
            if (!isNaN(num) && num >= 1 && num <= 10) {
              setFormData(prev => ({ ...prev, childCount: num }));
            }
          }
        }}
        onBlur={() => {
          const val = Math.max(1, Math.min(10, parseInt(replicatesText) || 1));
          setReplicatesText(String(val));
          setFormData(prev => ({ ...prev, childCount: val }));
        }}
        error={errors.childCount}
      />
      
      <div className={styles.optionalSection}>
        <h3 className={styles.optionalTitle}>Optional Fields</h3>
        <Input
          label="Description"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
        <Input
          label="Experiment Type"
          value={formData.experimentType}
          onChange={e => setFormData({ ...formData, experimentType: e.target.value })}
        />
      </div>

      <Button type="submit" isLoading={isSubmitting} className={styles.submitBtn}>
        {formData.childCount > 1 ? `Save ${formData.childCount} Samples` : 'Save Sample'}
      </Button>
    </form>
  );
}
