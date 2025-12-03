// QuantityCell - Editable cell for quantity grid
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, AlertCircle } from 'lucide-react';

/**
 * Format quantity for display (2 decimal places)
 */
const formatQuantity = (value, compact = true) => {
  const num = parseFloat(value) || 0;
  if (compact) {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }
  // Full precision
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  });
};

/**
 * Parse user input to number
 */
const parseInput = (value) => {
  if (!value) return 0;
  // Remove commas and spaces
  const cleaned = String(value).replace(/[,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * QuantityCell Component
 */
const QuantityCell = ({
  position,
  draftValue,
  onDraftChange,
  onAddPosition,
  disabled = false,
  hasPosition = false,
  showFullPrecision = false,
  tabIndex = 0,
  onKeyNavigation
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [showPrecision, setShowPrecision] = useState(false);
  const inputRef = useRef(null);

  // Get the current quantity value
  const originalQuantity = position?.quantity || 0;
  const currentValue = draftValue ?? originalQuantity;
  const hasChange = draftValue !== undefined && Math.abs(draftValue - originalQuantity) > 0.0000001;
  const delta = hasChange ? draftValue - originalQuantity : 0;

  // Start editing
  const startEdit = useCallback(() => {
    if (disabled || !hasPosition) return;
    setIsEditing(true);
    setLocalValue(currentValue.toString());
  }, [disabled, hasPosition, currentValue]);

  // Commit the edit
  const commitEdit = useCallback(() => {
    const newValue = parseInput(localValue);
    if (onDraftChange && position) {
      onDraftChange(position.lotKey, newValue, position);
    }
    setIsEditing(false);
  }, [localValue, onDraftChange, position]);

  // Cancel the edit
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setLocalValue('');
  }, []);

  // Handle key events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab') {
      commitEdit();
      // Let tab continue to next cell
    } else if (onKeyNavigation) {
      // Arrow key navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        commitEdit();
        onKeyNavigation('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        commitEdit();
        onKeyNavigation('down');
      } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
        e.preventDefault();
        commitEdit();
        onKeyNavigation('left');
      } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
        e.preventDefault();
        commitEdit();
        onKeyNavigation('right');
      }
    }
  }, [commitEdit, cancelEdit, onKeyNavigation]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Empty cell (no position in this account)
  if (!hasPosition) {
    return (
      <td className="px-2 py-1 text-center border-r border-gray-700/50 bg-gray-900/30">
        <button
          onClick={() => onAddPosition?.()}
          disabled={disabled}
          className="w-full h-full min-h-[32px] flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 rounded transition-colors"
          title="Add position"
        >
          <Plus className="w-4 h-4" />
        </button>
      </td>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <td className="px-1 py-1 border-r border-gray-700/50 bg-gray-800">
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            className="w-full px-2 py-1 text-sm text-right bg-gray-700 border border-cyan-500 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            style={{ minWidth: '80px' }}
          />
          <button
            onClick={commitEdit}
            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancelEdit}
            className="p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-600/50 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    );
  }

  // Display mode
  return (
    <td
      className={`
        px-2 py-1 text-right border-r border-gray-700/50 cursor-pointer
        transition-colors group relative
        ${hasChange
          ? delta > 0
            ? 'bg-emerald-900/20 hover:bg-emerald-900/30'
            : 'bg-red-900/20 hover:bg-red-900/30'
          : 'hover:bg-gray-800/50'
        }
      `}
      onClick={startEdit}
      onMouseEnter={() => setShowPrecision(true)}
      onMouseLeave={() => setShowPrecision(false)}
      tabIndex={tabIndex}
      onFocus={startEdit}
    >
      <div className="flex items-center justify-end gap-1">
        {/* Main value */}
        <span className={`
          text-sm font-mono
          ${hasChange
            ? delta > 0 ? 'text-emerald-400' : 'text-red-400'
            : 'text-gray-300'
          }
        `}>
          {showPrecision || showFullPrecision
            ? formatQuantity(currentValue, false)
            : formatQuantity(currentValue, true)
          }
        </span>

        {/* Change indicator */}
        <AnimatePresence>
          {hasChange && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`
                text-xs font-medium
                ${delta > 0 ? 'text-emerald-500' : 'text-red-500'}
              `}
            >
              {delta > 0 ? '+' : ''}{formatQuantity(delta, true)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Hover tooltip with full precision */}
      {showPrecision && originalQuantity !== 0 && (
        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-400 whitespace-nowrap shadow-lg">
          Original: {formatQuantity(originalQuantity, false)}
        </div>
      )}
    </td>
  );
};

export default QuantityCell;
