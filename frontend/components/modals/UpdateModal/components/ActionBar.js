// Sticky Action Bar Component for Update Modal
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

/**
 * Progress indicator component
 */
const ProgressBar = ({ current, total }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.2 }}
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums">
        {current}/{total}
      </span>
    </div>
  );
};

/**
 * Sticky action bar that appears when there are pending changes
 */
const ActionBar = ({
  changedCount,
  totalDelta,
  failedCount = 0,
  isSubmitting,
  progress,
  showValues = true,
  onSave,
  onClear,
  onRetryFailed
}) => {
  const hasChanges = changedCount > 0;
  const hasFailed = failedCount > 0;

  return (
    <AnimatePresence>
      {(hasChanges || hasFailed) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001]"
        >
          <div className="flex items-center gap-4 px-5 py-3 rounded-2xl shadow-2xl border border-gray-700/50 bg-gray-900/95 backdrop-blur-lg">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {isSubmitting ? (
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              ) : hasFailed ? (
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
              ) : (
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                  <Check className="w-4 h-4 text-indigo-400" />
                </div>
              )}
            </div>

            {/* Progress or stats */}
            {isSubmitting && progress.total > 0 ? (
              <ProgressBar current={progress.current} total={progress.total} />
            ) : (
              <div className="flex items-center gap-4 text-sm">
                {hasChanges && (
                  <>
                    <span className="text-gray-300">
                      <span className="font-semibold text-indigo-400">{changedCount}</span> change{changedCount !== 1 ? 's' : ''}
                    </span>

                    <span className={`font-medium ${
                      totalDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {showValues
                        ? `${totalDelta >= 0 ? '+' : ''}${formatCurrency(totalDelta)}`
                        : '••••'
                      }
                    </span>
                  </>
                )}

                {hasFailed && (
                  <span className="text-amber-400">
                    <span className="font-semibold">{failedCount}</span> failed
                  </span>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 ml-2">
              {/* Retry failed button */}
              {hasFailed && !isSubmitting && (
                <button
                  onClick={onRetryFailed}
                  className="
                    inline-flex items-center gap-1.5 px-3 py-1.5
                    text-sm font-medium text-amber-400
                    bg-amber-500/10 hover:bg-amber-500/20
                    border border-amber-500/30 rounded-lg
                    transition-colors duration-150
                  "
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}

              {/* Save button */}
              {hasChanges && (
                <button
                  onClick={onSave}
                  disabled={isSubmitting}
                  className="
                    inline-flex items-center gap-1.5 px-4 py-1.5
                    text-sm font-semibold text-white
                    bg-gradient-to-r from-blue-600 to-indigo-600
                    hover:from-blue-500 hover:to-indigo-500
                    rounded-lg shadow-lg shadow-blue-500/25
                    transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Saving...' : 'Update All'}
                </button>
              )}

              {/* Clear button */}
              {hasChanges && !isSubmitting && (
                <button
                  onClick={onClear}
                  className="
                    inline-flex items-center gap-1.5 px-3 py-1.5
                    text-sm font-medium text-gray-400
                    hover:text-gray-200 hover:bg-gray-800
                    rounded-lg transition-colors duration-150
                  "
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            {/* Keyboard hint */}
            {hasChanges && !isSubmitting && (
              <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-500 ml-2">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">
                  Enter
                </kbd>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionBar;
