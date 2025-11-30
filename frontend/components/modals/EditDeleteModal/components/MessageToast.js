import React from 'react';
import { X, XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Toast-style message display
 */
const MessageToast = ({ message, onClear }) => {
  if (!message.text) return null;

  const getIcon = () => {
    switch (message.type) {
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (message.type) {
      case 'error':
        return 'bg-red-600 text-white';
      case 'warning':
        return 'bg-amber-600 text-white';
      case 'success':
        return 'bg-green-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  return (
    <div className={`
      absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg
      flex items-center space-x-3 animate-in slide-in-from-bottom duration-300 z-40
      ${getStyles()}
    `}>
      {getIcon()}
      <span className="font-medium">{message.text}</span>
      <button
        onClick={onClear}
        className="ml-4 p-1 hover:bg-gray-900/20 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MessageToast;
