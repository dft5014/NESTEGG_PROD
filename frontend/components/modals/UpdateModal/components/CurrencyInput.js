// Enhanced Currency Input Component for Update Modal
import React, { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';

/**
 * Format number as currency
 */
const formatCurrency = (n) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
    : '';

/**
 * Parse string to number
 */
const toNum = (s) => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const n = Number(String(s ?? '').replace(/[^\d.-]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

/**
 * Enhanced currency input with smart formatting
 */
const CurrencyInput = memo(({
  id,
  value,
  onValueChange,
  onFocus,
  onBlur,
  nextFocusId,
  originalValue,
  'aria-label': ariaLabel,
  className = '',
  size = 'default', // 'default' | 'small' | 'large'
  showDelta = false,
  disabled = false
}) => {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(Number.isFinite(value) ? String(value) : '');
  const inputRef = useRef(null);

  // Sync raw value when value prop changes (and not focused)
  useEffect(() => {
    if (!focused) {
      const next = Number.isFinite(value) ? String(value) : '';
      if (toNum(raw) !== toNum(next)) setRaw(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  // Sanitize input
  const sanitize = (s) => {
    const cleaned = String(s).replace(/[$,\s]/g, '').replace(/[^0-9.\-]/g, '');
    const parts = cleaned.split('.');
    const withOneDot = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    return withOneDot.replace(/(?!^)-/g, '');
  };

  const handleChange = (e) => {
    const nextRaw = sanitize(e.target.value);
    setRaw(nextRaw);
    onValueChange?.(Number(nextRaw || 0));
  };

  const handlePaste = (e) => {
    const txt = e.clipboardData.getData('text') || '';
    const cleaned = sanitize(txt);
    e.preventDefault();
    e.stopPropagation();
    setRaw(cleaned);
    onValueChange?.(Number(cleaned || 0));

    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        const end = el.value.length;
        try { el.setSelectionRange(end, end); } catch {}
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && nextFocusId) {
      e.preventDefault();
      const nextEl = document.getElementById(nextFocusId);
      if (nextEl) {
        try { nextEl.focus({ preventScroll: true }); } catch { nextEl.focus(); }
      }
    }
    if (['e', 'E'].includes(e.key)) e.preventDefault();
  };

  const handleFocus = (e) => {
    setFocused(true);
    onFocus?.(e);
    requestAnimationFrame(() => {
      try {
        const end = e.target.value?.length ?? 0;
        e.target.setSelectionRange(end, end);
      } catch {}
    });
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  // Calculate delta if showing
  const delta = showDelta && originalValue != null
    ? value - originalValue
    : null;

  const hasChange = delta !== null && delta !== 0;

  // Size classes
  const sizeClasses = {
    small: 'w-24 px-2 py-1 text-sm',
    default: 'w-28 px-3 py-1.5',
    large: 'w-32 px-4 py-2 text-lg'
  };

  const baseClasses = `
    text-center rounded-lg border font-medium tabular-nums
    bg-gray-800 text-white placeholder-gray-500
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const stateClasses = hasChange
    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5'
    : focused
      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
      : 'border-gray-700 hover:border-gray-600';

  return (
    <div className="relative inline-flex flex-col items-center gap-1">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={focused ? raw : formatCurrency(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder="$0.00"
        aria-label={ariaLabel}
        disabled={disabled}
        className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${className}`}
      />

      {/* Delta indicator */}
      {showDelta && hasChange && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            text-xs font-medium px-1.5 py-0.5 rounded-full
            ${delta > 0
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-rose-400 bg-rose-500/10'
            }
          `}
        >
          {delta > 0 ? '+' : ''}{formatCurrency(delta)}
        </motion.div>
      )}
    </div>
  );
});

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
