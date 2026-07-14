'use client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCreateSample } from '@/hooks/useCreateSample';
import { ALL_SAMPLE_TYPES } from '@/lib/constants';
import styles from './SampleForm.module.css';

export function SampleForm() {
  const {
    formData,
    setFormData,
    errors,
    isSubmitting,
    isCustomType,
    customTypeText,
    setCustomTypeText,
    optionalOpen,
    setOptionalOpen,
    setSourceFocused,
    sourceBlurRef,
    filteredSources,
    handleBlur,
    selectSource,
    setSampleType,
    handleSubmit,
  } = useCreateSample();

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isCustomType ? (
        <Input
          label="Sample Type"
          value={customTypeText}
          onChange={e => setCustomTypeText(e.target.value)}
          onBlur={() => handleBlur('customType')}
          placeholder="Type custom sample type..."
          error={errors.sampleType}
        />
      ) : (
        <Select
          label="Sample Type"
          value={formData.sampleType}
          onChange={e => setSampleType(e.target.value)}
          onBlur={() => handleBlur('sampleType')}
          error={errors.sampleType}
        >
          <option value="">Select type…</option>
          {ALL_SAMPLE_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
      )}
      <div className={styles.sourceGroup}>
        <Input
          label="Source"
          value={formData.source}
          onChange={e => setFormData({ ...formData, source: e.target.value })}
          onFocus={() => {
            if (sourceBlurRef.current) clearTimeout(sourceBlurRef.current);
            setSourceFocused(true);
          }}
          onBlur={() => {
            handleBlur('source');
            sourceBlurRef.current = setTimeout(() => setSourceFocused(false), 180);
          }}
          error={errors.source}
          placeholder="e.g. Patient A, Mouse 1"
        />
        {filteredSources.length > 0 && (
          <div className={styles.sourceDropdown}>
            {filteredSources.map(s => (
              <button
                key={s}
                type="button"
                className={styles.sourceOption}
                onMouseDown={e => {
                  e.preventDefault();
                  selectSource(s);
                }}
              >
                <svg className={styles.sourceOptionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <Input
        label="Collection Date"
        type="date"
        value={formData.collectionDate}
        onChange={e => setFormData({ ...formData, collectionDate: e.target.value })}
        onBlur={() => handleBlur('collectionDate')}
        error={errors.collectionDate}
      />
      <div className={styles.stepperGroup}>
        <label className={styles.stepperLabel}>Replicates</label>
        <div className={styles.stepper}>
          <button
            type="button"
            className={`${styles.stepperBtn} ${formData.childCount <= 1 ? styles.stepperBtnDisabled : ''}`}
            disabled={formData.childCount <= 1}
            onClick={() => {
              if (formData.childCount > 1) {
                setFormData(prev => ({ ...prev, childCount: prev.childCount - 1 }));
              }
            }}
            aria-label="Decrease replicates"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className={styles.stepperValue}>{formData.childCount}</span>
          <button
            type="button"
            className={`${styles.stepperBtn} ${formData.childCount >= 10 ? styles.stepperBtnDisabled : ''}`}
            disabled={formData.childCount >= 10}
            onClick={() => {
              if (formData.childCount < 10) {
                setFormData(prev => ({ ...prev, childCount: prev.childCount + 1 }));
              }
            }}
            aria-label="Increase replicates"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </button>
        </div>
        {errors.childCount && <span className={styles.stepperError}>{errors.childCount}</span>}
      </div>
      
      <div className={`${styles.optionalSection} ${optionalOpen ? styles.optionalSectionOpen : ''}`}>
        <button
          type="button"
          className={styles.optionalToggle}
          onClick={() => setOptionalOpen(prev => !prev)}
        >
          <span className={styles.optionalTitle}>Optional Fields</span>
          <svg
            className={`${styles.optionalChevron} ${optionalOpen ? styles.optionalChevronOpen : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {optionalOpen && (
          <div className={styles.optionalContent}>
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
        )}
      </div>

      <Button type="submit" isLoading={isSubmitting} className={styles.submitBtn}>
        {formData.childCount > 1 ? `Save ${formData.childCount} Samples` : 'Save Sample'}
      </Button>
    </form>
  );
}
