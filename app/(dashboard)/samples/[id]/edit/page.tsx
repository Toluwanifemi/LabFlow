'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './edit.module.css';

export default function EditSamplePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [formData, setFormData] = useState({
    sampleType: '',
    source: '',
    collectionDate: '',
    description: '',
    experimentType: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSample = async () => {
      try {
        const res = await fetch(`/api/samples/${params.id}`);
        if (!res.ok) throw new Error('Not found');
        const sample = await res.json();
        setFormData({
          sampleType: sample.sampleType || '',
          source: sample.source || '',
          collectionDate: sample.collectionDate?.split('T')[0] || '',
          description: sample.description || '',
          experimentType: sample.experimentType || '',
        });
      } catch (err) {
        showToast({ message: 'This sample does not exist.', type: 'error' });
        router.push('/samples');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSample();
  }, [params.id, router, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/samples/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast({ message: data.error || 'Update failed.', type: 'error' });
        return;
      }

      showToast({ message: 'Sample updated.', type: 'success' });
      router.push(`/samples/${params.id}`);
      router.refresh();
    } catch (err) {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Edit Sample</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Sample Type"
          value={formData.sampleType}
          onChange={e => setFormData({ ...formData, sampleType: e.target.value })}
          required
        />
        <Input
          label="Source"
          value={formData.source}
          onChange={e => setFormData({ ...formData, source: e.target.value })}
          required
        />
        <Input
          label="Collection Date"
          type="date"
          value={formData.collectionDate}
          onChange={e => setFormData({ ...formData, collectionDate: e.target.value })}
          required
        />
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

        <div className={styles.actions}>
          <Button variant="ghost" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
