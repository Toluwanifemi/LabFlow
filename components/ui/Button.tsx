import React from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  isLoading, 
  className, 
  disabled, 
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className={styles.loader} /> : children}
    </button>
  );
}
