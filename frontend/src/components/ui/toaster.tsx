import { useEffect } from 'react';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from './toast';
import { useToastState } from '@/hooks/useToast';

export function Toaster() {
  const { items, subscribe } = useToastState();

  useEffect(() => {
    return subscribe();
  }, [subscribe]);

  return (
    <ToastProvider>
      {items.map((item) => (
        <Toast key={item.id} variant={item.variant}>
          {item.title && <ToastTitle>{item.title}</ToastTitle>}
          {item.description && <ToastDescription>{item.description}</ToastDescription>}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
