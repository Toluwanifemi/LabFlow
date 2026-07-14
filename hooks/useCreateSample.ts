import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSyncQueue } from './useSyncQueue';
import { useToast } from './useToast';

export interface SampleFormData {
  sampleType: string;
  source: string;
  collectionDate: string;
  description?: string;
  experimentType?: string;
  childCount: number;
}

export function useCreateSample() {
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
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeText, setCustomTypeText] = useState('');
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [recentSources, setRecentSources] = useState<string[]>([]);
  const [sourceFocused, setSourceFocused] = useState(false);
  const sourceBlurRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('labflow_recent_sources');
      if (stored) setRecentSources(JSON.parse(stored));
    } catch {}
  }, []);

  const filteredSources = sourceFocused && formData.source.length >= 0
    ? recentSources.filter(s =>
        s.toLowerCase().includes(formData.source.toLowerCase())
      )
    : [];

  const saveRecentSource = (source: string) => {
    const trimmed = source.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSources.filter(s => s !== trimmed)].slice(0, 10);
    setRecentSources(updated);
    try {
      localStorage.setItem('labflow_recent_sources', JSON.stringify(updated));
    } catch {}
  };

  const validateField = (field: keyof SampleFormData | 'customType'): string | undefined => {
    switch (field) {
      case 'sampleType':
      case 'customType': {
        const effectiveType = isCustomType ? customTypeText.trim() : formData.sampleType;
        if (!effectiveType) return 'This field is required.';
        return;
      }
      case 'source':
        if (!formData.source.trim()) return 'This field is required.';
        return;
      case 'collectionDate':
        if (!formData.collectionDate.trim()) return 'This field is required.';
        return;
      default:
        return;
    }
  };

  const handleBlur = (field: keyof SampleFormData | 'customType') => {
    const error = validateField(field);
    setErrors(prev => ({ ...prev, [field === 'customType' ? 'sampleType' : field]: error }));
  };

  const selectSource = (value: string) => {
    setFormData(prev => ({ ...prev, source: value }));
    setErrors(prev => ({ ...prev, source: undefined }));
    setSourceFocused(false);
    if (sourceBlurRef.current) clearTimeout(sourceBlurRef.current);
  };

  const setSampleType = (type: string) => {
    if (type === 'Other') {
      setIsCustomType(true);
      setFormData(prev => ({ ...prev, sampleType: '' }));
    } else {
      setIsCustomType(false);
      setCustomTypeText('');
      setFormData(prev => ({ ...prev, sampleType: type }));
    }
    setErrors(prev => ({ ...prev, sampleType: undefined }));
  };

  const validate = () => {
    const newErrors: any = {};
    const effectiveType = isCustomType ? customTypeText.trim() : formData.sampleType;
    if (!effectiveType) newErrors.sampleType = 'This field is required.';
    if (!formData.source) newErrors.source = 'This field is required.';
    if (!formData.collectionDate) newErrors.collectionDate = 'This field is required.';

    if (formData.childCount < 1 || formData.childCount > 10) {
      newErrors.childCount = 'Must be between 1 and 10.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getEffectiveSampleType = () => {
    return isCustomType ? customTypeText.trim() : formData.sampleType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const effectiveType = getEffectiveSampleType();
    const payload: Record<string, any> = {
      sampleType: effectiveType,
      source: formData.source.trim(),
      collectionDate: formData.collectionDate.trim(),
      description: formData.description?.trim() || undefined,
      experimentType: formData.experimentType?.trim() || undefined,
      childCount: formData.childCount,
    };

    try {
      if (!isOnline) {
        saveRecentSource(formData.source);
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

      saveRecentSource(formData.source);
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

  return {
    formData,
    setFormData,
    errors,
    isSubmitting,
    isCustomType,
    customTypeText,
    setCustomTypeText,
    optionalOpen,
    setOptionalOpen,
    recentSources,
    sourceFocused,
    setSourceFocused,
    sourceBlurRef,
    filteredSources,
    handleBlur,
    selectSource,
    setSampleType,
    handleSubmit,
  };
}
