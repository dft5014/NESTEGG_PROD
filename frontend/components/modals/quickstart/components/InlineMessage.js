// Inline Message Component for QuickStart Modal
// Displays success, error, warning, and info messages inline
import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// Message types configuration
const MESSAGE_TYPES = {
  success: {
    icon: CheckCircle,
    className: 'bg-emerald-900/30 border-emerald-600/50 text-emerald-300',
    iconClassName: 'text-emerald-400'
  },
  error: {
    icon: AlertCircle,
    className: 'bg-rose-900/30 border-rose-600/50 text-rose-300',
    iconClassName: 'text-rose-400'
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-amber-900/30 border-amber-600/50 text-amber-300',
    iconClassName: 'text-amber-400'
  },
  info: {
    icon: Info,
    className: 'bg-blue-900/30 border-blue-600/50 text-blue-300',
    iconClassName: 'text-blue-400'
  }
};

// Single message component
export function InlineMessage({ message, onDismiss }) {
  if (!message) return null;

  const { type = 'info', text, details, autoDismiss = true, duration = 5000 } = message;
  const config = MESSAGE_TYPES[type] || MESSAGE_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className={`rounded-lg border p-3 mb-3 ${config.className}`}
    >
      <div className="flex items-start">
        <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconClassName}`} />
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{text}</p>
          {details && (
            <p className="mt-1 text-xs opacity-80">{details}</p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Message list component (for multiple messages)
export function InlineMessageList({ messages = [], onDismiss }) {
  return (
    <AnimatePresence>
      {messages.map((message, index) => (
        <InlineMessage
          key={message.id || index}
          message={message}
          onDismiss={() => onDismiss?.(message.id || index)}
        />
      ))}
    </AnimatePresence>
  );
}

// Hook for managing inline messages
export function useInlineMessages(maxMessages = 3) {
  const [messages, setMessages] = useState([]);

  // Add a message
  const addMessage = useCallback((message) => {
    const id = Date.now() + Math.random();
    const newMessage = { id, ...message };

    setMessages(prev => {
      const updated = [newMessage, ...prev];
      // Keep only the latest maxMessages
      return updated.slice(0, maxMessages);
    });

    return id;
  }, [maxMessages]);

  // Remove a message by id
  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((text, details, options = {}) => {
    return addMessage({ type: 'success', text, details, ...options });
  }, [addMessage]);

  const showError = useCallback((text, details, options = {}) => {
    return addMessage({ type: 'error', text, details, autoDismiss: false, ...options });
  }, [addMessage]);

  const showWarning = useCallback((text, details, options = {}) => {
    return addMessage({ type: 'warning', text, details, ...options });
  }, [addMessage]);

  const showInfo = useCallback((text, details, options = {}) => {
    return addMessage({ type: 'info', text, details, ...options });
  }, [addMessage]);

  return {
    messages,
    addMessage,
    removeMessage,
    clearMessages,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}

export default InlineMessage;
