import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 3000 }: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = { id, title, description, variant, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    toast,
    dismiss,
    dismissAll,
  };
}

// Simple toast function for direct usage
export const toast = {
  success: (title: string, description?: string) => {
    console.log(`[SUCCESS] ${title}`, description || '');
  },
  error: (title: string, description?: string) => {
    console.error(`[ERROR] ${title}`, description || '');
  },
  warning: (title: string, description?: string) => {
    console.warn(`[WARNING] ${title}`, description || '');
  },
  info: (title: string, description?: string) => {
    console.info(`[INFO] ${title}`, description || '');
  },
};
