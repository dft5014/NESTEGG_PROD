import { useState, useCallback, useRef } from 'react';

/**
 * Hook for managing toast-like messages
 */
export const useMessage = () => {
  const [message, setMessage] = useState({ type: '', text: '' });
  const timeoutRef = useRef(null);

  /**
   * Show a message
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {string} text - Message text
   * @param {number} duration - Auto-dismiss duration in ms (0 for no auto-dismiss)
   */
  const showMessage = useCallback((type, text, duration = 5000) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage({ type, text });

    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, duration);
    }
  }, []);

  /**
   * Clear the current message
   */
  const clearMessage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessage({ type: '', text: '' });
  }, []);

  /**
   * Helper methods for common message types
   */
  const showSuccess = useCallback((text, duration) => {
    showMessage('success', text, duration);
  }, [showMessage]);

  const showError = useCallback((text, duration) => {
    showMessage('error', text, duration);
  }, [showMessage]);

  const showWarning = useCallback((text, duration) => {
    showMessage('warning', text, duration);
  }, [showMessage]);

  const showInfo = useCallback((text, duration) => {
    showMessage('info', text, duration);
  }, [showMessage]);

  return {
    message,
    showMessage,
    clearMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default useMessage;
