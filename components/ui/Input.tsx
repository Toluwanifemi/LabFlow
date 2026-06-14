import React, { useId } from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelAction?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export function Input({ label, labelAction, error, helperText, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const feedbackId = `${inputId}-feedback`;
  const hasValue = props.value !== undefined && props.value !== '';

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {labelAction && <span className={styles.labelAction}>{labelAction}</span>}
      </div>
      <input
        id={inputId}
        aria-describedby={error || helperText ? feedbackId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={`${styles.input} ${error ? styles.inputError : ''} ${hasValue ? styles.inputFilled : ''}`}
        {...props}
      />
      {(error || helperText) && (
        <span 
          id={feedbackId} 
          className={`${styles.feedback} ${error ? styles.errorText : styles.helperText}`}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
}
