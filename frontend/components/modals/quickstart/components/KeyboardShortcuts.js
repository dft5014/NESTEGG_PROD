// Keyboard Shortcuts Panel and Hook
import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

// Shortcuts configuration by view type
export const SHORTCUTS_CONFIG = {
  positions: [
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'n', description: 'Add new security position' },
    { key: 'c', description: 'Add cash position' },
    { key: 'h', description: 'Toggle help panel' },
    { key: 'Esc', description: 'Close panels / deselect' },
    { key: 'Ctrl+S', description: 'Save ready positions' }
  ],
  accounts: [
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'n', description: 'Add new account' },
    { key: 'h', description: 'Toggle help panel' },
    { key: 'Esc', description: 'Close panels / deselect' },
    { key: 'Ctrl+S', description: 'Save ready accounts' }
  ],
  liabilities: [
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'n', description: 'Add new liability' },
    { key: 'h', description: 'Toggle help panel' },
    { key: 'Esc', description: 'Close panels / deselect' },
    { key: 'Ctrl+S', description: 'Save ready liabilities' }
  ],
  default: [
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Esc', description: 'Close panels' }
  ]
};

// Keyboard Shortcuts Panel Component
export function KeyboardShortcutsPanel({ isOpen, onClose, viewType = 'default' }) {
  const shortcuts = SHORTCUTS_CONFIG[viewType] || SHORTCUTS_CONFIG.default;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gray-800/95 border border-gray-600 rounded-lg p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Keyboard className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-white">Keyboard Shortcuts</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <kbd className="px-2 py-0.5 bg-gray-700 border border-gray-600 rounded text-gray-300 font-mono text-xs min-w-[40px] text-center">
                  {shortcut.key}
                </kbd>
                <span className="text-gray-400">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Keyboard Shortcuts Hook
export function useKeyboardShortcuts({
  enabled = true,
  viewType = 'default',
  onAddNew,
  onAddCash,
  onToggleHelp,
  onToggleShortcuts,
  onSubmit,
  onEscape,
  showShortcuts,
  setShowShortcuts
}) {
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);

    // Handle escape regardless of focus
    if (e.key === 'Escape') {
      if (showShortcuts) {
        setShowShortcuts(false);
        return;
      }
      onEscape?.();
      return;
    }

    // Don't trigger other shortcuts when typing
    if (isInputFocused) return;

    // ? - Show shortcuts
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      setShowShortcuts((prev) => !prev);
      return;
    }

    // n - Add new item
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      onAddNew?.();
      return;
    }

    // c - Add cash (positions view only)
    if ((e.key === 'c' || e.key === 'C') && viewType === 'positions') {
      e.preventDefault();
      onAddCash?.();
      return;
    }

    // h - Toggle help
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      onToggleHelp?.();
      return;
    }

    // Ctrl+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSubmit?.();
      return;
    }
  }, [enabled, viewType, onAddNew, onAddCash, onToggleHelp, onSubmit, onEscape, showShortcuts, setShowShortcuts]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return { showShortcuts, setShowShortcuts };
}

export default KeyboardShortcutsPanel;
