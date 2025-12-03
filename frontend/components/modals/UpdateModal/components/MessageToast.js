// Toast Message Component for Update Modal
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Toast message component
 */
const MessageToast = ({ message, onClear }) => {
  if (!message) return null;

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-600',
      iconColor: 'text-emerald-200',
      borderColor: 'border-emerald-500/50'
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-rose-600',
      iconColor: 'text-rose-200',
      borderColor: 'border-rose-500/50'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-600',
      iconColor: 'text-amber-200',
      borderColor: 'border-amber-500/50'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-600',
      iconColor: 'text-blue-200',
      borderColor: 'border-blue-500/50'
    }
  };

  const { icon: Icon, bg, iconColor, borderColor } = config[message.type] || config.info;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-20 right-4 z-[10002]"
      >
        <div className={`
          flex items-center gap-3 px-4 py-3
          ${bg} text-white rounded-xl shadow-2xl
          border ${borderColor}
        `}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <span className="text-sm font-medium">{message.text}</span>
          <button
            onClick={onClear}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MessageToast;
