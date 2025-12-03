// QuantityCell - Editable cell for quantity grid
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, Sparkles } from 'lucide-react';

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
 * Supports three modes:
 * 1. Existing position editing (green/red highlights)
 * 2. New position entry (blue highlight) - for empty cells
 * 3. Empty cell with + button
 */
const QuantityCell = ({
  position,
  draftValue,
  onDraftChange,
  onAddPosition,
  // New position props
  newPositionValue,
  onNewPositionChange,
  rowData, // { identifier, purchaseDate, assetType, name }
  accountData, // { id, name, institution }
  disabled = false,
  hasPosition = false,
  showFullPrecision = false,
  tabIndex = 0,
  onKeyNavigation,
  rowIndex,
  cellIndex
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [showPrecision, setShowPrecision] = useState(false);
  const inputRef = useRef(null);

  // Check if this is a pending new position
  const isNewPosition = newPositionValue !== undefined && newPositionValue > 0;

  // Get the current quantity value
  const originalQuantity = position?.quantity || 0;
  const currentValue = draftValue ?? originalQuantity;
  const hasChange = draftValue !== undefined && Math.abs(draftValue - originalQuantity) > 0.0000001;
  const delta = hasChange ? draftValue - originalQuantity : 0;

  // Start editing existing position
  const startEdit = useCallback(() => {
    if (disabled || !hasPosition) return;
    setIsEditing(true);
    setLocalValue(currentValue.toString());
  }, [disabled, hasPosition, currentValue]);

  // Start editing new position (empty cell)
  const startNewPositionEdit = useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    setLocalValue(newPositionValue ? newPositionValue.toString() : '');
  }, [disabled, newPositionValue]);

  // Commit the edit for existing position
  const commitEdit = useCallback(() => {
    const newValue = parseInput(localValue);
    if (hasPosition && onDraftChange && position) {
      onDraftChange(position.lotKey, newValue, position);
    }
    setIsEditing(false);
  }, [localValue, onDraftChange, position, hasPosition]);

  // Commit new position entry
  const commitNewPosition = useCallback(() => {
    const newValue = parseInput(localValue);
    if (onNewPositionChange && rowData && accountData) {
      onNewPositionChange({
        identifier: rowData.identifier,
        name: rowData.name,
        purchaseDate: rowData.purchaseDate,
        assetType: rowData.assetType,
        accountId: accountData.id,
        accountName: accountData.name,
        institution: accountData.institution,
        quantity: newValue
      });
    }
    setIsEditing(false);
  }, [localValue, onNewPositionChange, rowData, accountData]);

  // Cancel the edit
  const cancelEdit = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsEditing(false);
    setLocalValue('');
  }, []);

  // Cancel and remove new position
  const cancelNewPosition = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (onNewPositionChange && rowData && accountData) {
      onNewPositionChange({
        identifier: rowData.identifier,
        purchaseDate: rowData.purchaseDate,
        accountId: accountData.id,
        quantity: 0 // Setting to 0 removes it
      });
    }
    setIsEditing(false);
    setLocalValue('');
  }, [onNewPositionChange, rowData, accountData]);

  // Handle key events
  const handleKeyDown = useCallback((e) => {
    const isNew = !hasPosition;
    if (e.key === 'Enter') {
      e.preventDefault();
      isNew ? commitNewPosition() : commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isNew ? cancelNewPosition() : cancelEdit();
    } else if (e.key === 'Tab') {
      isNew ? commitNewPosition() : commitEdit();
    } else if (onKeyNavigation) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        isNew ? commitNewPosition() : commitEdit();
        onKeyNavigation('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        isNew ? commitNewPosition() : commitEdit();
        onKeyNavigation('down');
      } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
        e.preventDefault();
        isNew ? commitNewPosition() : commitEdit();
        onKeyNavigation('left');
      } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
        e.preventDefault();
        isNew ? commitNewPosition() : commitEdit();
        onKeyNavigation('right');
      }
    }
  }, [commitEdit, commitNewPosition, cancelEdit, cancelNewPosition, onKeyNavigation, hasPosition]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // ===== EMPTY CELL WITH PENDING NEW POSITION (blue) =====
  if (!hasPosition && isNewPosition && !isEditing) {
    return (
      <div
        className="w-full h-full px-2 py-1 text-right border-r border-gray-700/50 cursor-pointer
          bg-blue-900/30 hover:bg-blue-900/40 transition-colors relative z-10"
        onClick={startNewPositionEdit}
      >
        <div className="flex items-center justify-end gap-1 h-full">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span className="text-sm font-mono text-blue-400">
            {formatQuantity(newPositionValue, true)}
          </span>
          <button
            onClick={cancelNewPosition}
            onMouseDown={(e) => e.preventDefault()}
            className="ml-1 p-0.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded"
            title="Remove new position"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // ===== EMPTY CELL - EDITING NEW POSITION =====
  if (!hasPosition && isEditing) {
    return (
      <div className="w-full h-full px-1 py-1 border-r border-gray-700/50 bg-blue-900/40 relative z-50">
        <div className="flex items-center gap-1 h-full">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitNewPosition}
            placeholder="Qty"
            className="flex-1 min-w-0 px-2 py-1 text-sm text-right bg-gray-700 border border-blue-500 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              commitNewPosition();
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded z-50"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancelNewPosition}
            onMouseDown={(e) => e.preventDefault()}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-600/50 rounded z-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ===== EMPTY CELL - SHOW + BUTTON =====
  if (!hasPosition) {
    return (
      <div className="w-full h-full px-2 py-1 text-center border-r border-gray-700/50 bg-gray-900/30 relative z-0">
        <button
          onClick={startNewPositionEdit}
          disabled={disabled}
          className="w-full h-full min-h-[32px] flex items-center justify-center text-gray-600 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-colors"
          title="Add new position"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ===== EXISTING POSITION - EDITING =====
  if (isEditing) {
    return (
      <div className="w-full h-full px-1 py-1 border-r border-gray-700/50 bg-gray-800 relative z-50">
        <div className="flex items-center gap-1 h-full">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            className="flex-1 min-w-0 px-2 py-1 text-sm text-right bg-gray-700 border border-cyan-500 rounded text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              commitEdit();
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="flex-shrink-0 p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded z-50"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cancelEdit}
            onMouseDown={(e) => e.preventDefault()}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-300 hover:bg-gray-600/50 rounded z-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ===== EXISTING POSITION - DISPLAY MODE =====
  return (
    <div
      className={`
        w-full h-full px-2 py-1 text-right border-r border-gray-700/50 cursor-pointer
        transition-colors group relative z-10
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
      <div className="flex items-center justify-end gap-1 h-full">
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
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-400 whitespace-nowrap shadow-lg">
          Original: {formatQuantity(originalQuantity, false)}
        </div>
      )}
    </div>
  );
};

export default QuantityCell;
