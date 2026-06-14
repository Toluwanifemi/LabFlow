'use client';
import React, { useEffect, useRef } from 'react';
import styles from './Modal.module.css';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    isLoading?: boolean;
    danger?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function Modal({ isOpen, onClose, title, children, primaryAction, secondaryAction }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} className={styles.dialog} onCancel={onClose}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.body}>{children}</div>
        
        <div className={styles.actions}>
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button 
              variant={primaryAction.danger ? 'danger' : 'primary'}
              onClick={primaryAction.onClick}
              isLoading={primaryAction.isLoading}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
