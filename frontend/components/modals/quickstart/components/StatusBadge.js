// Status Badge Component for QuickStart Modal
import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { ROW_STATUS } from '../utils/constants';

export default function StatusBadge({ status, size = 'sm', showIcon = true }) {
  const config = ROW_STATUS[status] || ROW_STATUS.draft;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getIcon = () => {
    if (!showIcon) return null;

    switch (status) {
      case 'submitting':
        return <Loader2 className={`${iconSizes[size]} animate-spin mr-1`} />;
      case 'added':
        return <Check className={`${iconSizes[size]} mr-1`} />;
      case 'error':
        return <AlertCircle className={`${iconSizes[size]} mr-1`} />;
      default:
        return null;
    }
  };

  return (
    <span className={`inline-flex items-center font-medium rounded border ${sizeClasses[size]} ${config.bgClass}`}>
      {getIcon()}
      {config.label}
    </span>
  );
}
