// Hook for toast messages in the Update Modal
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing toast messages
 */
export const useMessage = () => {
  const [message, setMessage] = useState(null);
  const timeoutRef = useRef(null);

  // Clear any existing timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Show a message
  const showMessage = useCallback((type, text, duration = 3000) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage({ type, text });

    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        setMessage(null);
      }, duration);
    }
  }, []);

  // Convenience methods
  const showSuccess = useCallback((text, duration = 3000) => {
    showMessage('success', text, duration);
  }, [showMessage]);

  const showError = useCallback((text, duration = 4000) => {
    showMessage('error', text, duration);
  }, [showMessage]);

  const showWarning = useCallback((text, duration = 3500) => {
    showMessage('warning', text, duration);
  }, [showMessage]);

  const showInfo = useCallback((text, duration = 3000) => {
    showMessage('info', text, duration);
  }, [showMessage]);

  // Clear message
  const clearMessage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessage(null);
  }, []);

  return {
    message,
    showMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearMessage
  };
};

export default useMessage;
