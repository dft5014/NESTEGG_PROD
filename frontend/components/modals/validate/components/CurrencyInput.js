// CurrencyInput - Enhanced currency input with visual feedback
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, Check, AlertCircle } from 'lucide-react';
import { parseNumber, fmtCurrency } from '../utils/constants';

export default function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = 'Enter amount',
  autoFocus = false,
  disabled = false,
  size = 'md', // 'sm', 'md', 'lg'
  showIcon = false,
  status = null, // null, 'matched', 'discrepancy'
  className = ''
}) {
  const [focused, setFocused] = useState(false);
  const [rawValue, setRawValue] = useState('');
  const inputRef = useRef(null);

  // Sync with external value when not focused
  useEffect(() => {
    if (!focused) {
      setRawValue(value != null && value !== 0 ? String(value) : '');
    }
  }, [value, focused]);

  // Auto-focus support
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handleChange = useCallback((e) => {
    const cleaned = e.target.value.replace(/[^0-9.\-]/g, '');
    setRawValue(cleaned);
    onChange(parseNumber(cleaned));
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 50);
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Allow Tab to move to next field
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }, []);

  const displayValue = focused
    ? rawValue
    : (value != null && value !== 0) ? fmtCurrency(value) : '';

  // Size classes
  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base'
  };

  // Status indicator colors
  const statusColors = {
    matched: 'ring-emerald-500/50 border-emerald-500/30',
    discrepancy: 'ring-amber-500/50 border-amber-500/30'
  };

  const hasValue = value != null && value !== 0 && value !== '';

  return (
    <div className={`relative ${className}`}>
      {showIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <DollarSign className="w-4 h-4 text-gray-500" />
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full rounded-lg border text-right
          bg-gray-800/80 text-white placeholder-gray-500
          transition-all duration-200
          font-semibold tabular-nums
          focus:outline-none focus:ring-2 focus:bg-gray-700
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${showIcon ? 'pl-8' : ''}
          ${focused
            ? 'border-indigo-500 ring-indigo-500/20'
            : hasValue && status
              ? statusColors[status]
              : 'border-gray-700 hover:border-gray-600'
          }
        `}
      />

      {/* Status indicator */}
      {hasValue && status && !focused && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {status === 'matched' ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400" />
          )}
        </div>
      )}
    </div>
  );
}

// Inline variant for table cells
export function InlineCurrencyInput({
  value,
  onChange,
  placeholder = '$0.00',
  disabled = false,
  status = null
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef(null);

  const handleClick = () => {
    if (!disabled) {
      setTempValue(value != null && value !== 0 ? String(value) : '');
      setEditing(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseNumber(tempValue);
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value.replace(/[^0-9.\-]/g, ''))}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="
          w-full h-8 px-2 text-sm text-right
          bg-gray-700 text-white border border-indigo-500 rounded
          font-semibold tabular-nums
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20
        "
      />
    );
  }

  const hasValue = value != null && value !== 0 && value !== '';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full h-8 px-2 text-sm text-right rounded
        transition-all duration-150
        font-semibold tabular-nums
        disabled:opacity-50 disabled:cursor-not-allowed
        ${hasValue
          ? status === 'matched'
            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            : status === 'discrepancy'
              ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          : 'bg-gray-800/50 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
        }
      `}
    >
      {hasValue ? fmtCurrency(value) : placeholder}
    </button>
  );
}
