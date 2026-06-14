import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let listeners: ((toasts: ToastMessage[]) => void)[] = [];
let toasts: ToastMessage[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener([...toasts]));
};

export const showToast = ({ message, type = 'info' }: { message: string, type?: ToastType }) => {
  const id = Math.random().toString(36).substr(2, 9);
  toasts = [...toasts, { id, message, type }];
  notifyListeners();
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  }, 3000);
};

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    listeners.push(setCurrentToasts);
    return () => {
      listeners = listeners.filter(l => l !== setCurrentToasts);
    };
  }, []);

  return { toasts: currentToasts, showToast };
}
