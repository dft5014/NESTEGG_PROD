// hooks/useToast.js
import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((title, message, type = 'info', duration = 3000) => {
    setToast({ title, message, type });
    
    setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  return { toast, showToast };
}