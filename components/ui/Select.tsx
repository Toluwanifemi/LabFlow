'use client';
import React, { useId } from 'react';
import styles from './Select.module.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}

export function Select({ label, error, helperText, children, className, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const feedbackId = `${selectId}-feedback`;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
      <div className={styles.wrapper}>
        <select
          id={selectId}
          aria-describedby={error || helperText ? feedbackId : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={`${styles.select} ${error ? styles.selectError : ''}`}
          {...props}
        >
          {children}
        </select>
        <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {(error || helperText) && (
        <span id={feedbackId} className={`${styles.feedback} ${error ? styles.errorText : styles.helperText}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}
