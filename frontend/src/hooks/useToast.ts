import { useState, useCallback } from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

let toastCount = 0;

// Simple global toast state — avoids a full Context for something this lightweight
const listeners: Set<(toasts: ToastItem[]) => void> = new Set();
let toasts: ToastItem[] = [];

function notifyListeners() {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(item: Omit<ToastItem, 'id'>) {
  const id = String(++toastCount);
  const newToast: ToastItem = { ...item, id, duration: item.duration ?? 4000 };
  toasts = [...toasts, newToast];
  notifyListeners();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, newToast.duration);
}

export function useToastState() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const subscribe = useCallback(() => {
    const listener = (updated: ToastItem[]) => setItems(updated);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { items, subscribe };
}

export type { ToastItem };
