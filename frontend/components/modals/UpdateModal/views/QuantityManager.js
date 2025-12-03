// QuantityManager View - Main view for quantity updates
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Search, Save, X,
  TrendingUp, Coins, CircleDollarSign, Plus,
  ClipboardPaste, AlertTriangle, Info,
  Sparkles, Grid3x3, Import, FileDown
} from 'lucide-react';
import { QuantityGrid, AnimatedCurrency } from '../components';

// Asset type config
const ASSET_TYPE_CONFIG = {
  security: {
    label: 'Securities',
    icon: TrendingUp,
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30'
  },
  crypto: {
    label: 'Crypto',
    icon: Coins,
    color: 'orange',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30'
  },
  metal: {
    label: 'Metals',
    icon: CircleDollarSign,
    color: 'yellow',
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30'
  }
};

/**
 * Filter toggle button component
 */
const FilterToggle = ({ type, config, active, onClick, count = 0 }) => {
  const Icon = config.icon;
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium
        transition-all duration-200
        ${active
          ? `${config.bgClass} ${config.textClass} ${config.borderClass}`
          : 'bg-gray-800/50 text-gray-500 border-gray-700 hover:bg-gray-800'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
      <span className={`
        px-1.5 py-0.5 rounded text-xs
        ${active ? 'bg-gray-800/50' : 'bg-gray-700/50'}
      `}>
        {count}
      </span>
    </button>
  );
};

/**
 * Info tooltip component
 */
const InfoTooltip = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 top-full mt-2 w-80 p-4 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50"
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
      <h4 className="text-sm font-semibold text-white mb-3">How this works</h4>
      <div className="space-y-3 text-xs text-gray-400">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/30 flex-shrink-0 mt-0.5" />
          <p><span className="text-emerald-400 font-medium">Green cells:</span> Edit existing position quantities. Click "Save Changes" to update.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/30 flex-shrink-0 mt-0.5" />
          <p><span className="text-blue-400 font-medium">Blue cells:</span> New positions to add. Click the "+" in empty cells to enter a quantity, then click "Import" to add them.</p>
        </div>
        <div className="flex gap-2">
          <Plus className="w-3 h-3 text-gray-500 flex-shrink-0 mt-0.5" />
          <p><span className="text-gray-300 font-medium">+ buttons:</span> Click to add a new position in that account for the selected ticker/date.</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * QuantityManager - Main view for quantity updates
 */
const QuantityManager = ({
  // Data
  gridMatrix,
  relevantAccounts,
  columnTotals,
  grandTotals,

  // Drafts (for editing existing positions)
  drafts,
  setDraft,
  draftTotals,
  getChangedRows,
  clearAllDrafts,
  handleBulkPaste,
  hasChanges,

  // New positions
  newPositions = {},
  newPositionsCount = 0,
  newPositionsList = [],
  setNewPosition,
  getNewPositionValue,
  clearAllNewPositions,
  onImportNewPositions,

  // Filtering
  searchQuery,
  setSearchQuery,
  selectedTypes,
  toggleAssetType,
  resetFilters,

  // Submit
  isSubmitting,
  progress,
  failedRows,
  submitAll,
  retryFailed,

  // Navigation
  onBack,
  onRefresh,
  loading,

  // Messages
  showSuccess,
  showError,
  showWarning
}) => {
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // Handle save for existing positions
  const handleSave = useCallback(async () => {
    const changedRows = getChangedRows();
    if (!changedRows.length) {
      showWarning('No changes to save');
      return;
    }

    const result = await submitAll(changedRows);

    if (result.failed === 0) {
      showSuccess(`Updated ${result.success} position${result.success !== 1 ? 's' : ''}`);
      clearAllDrafts();
    } else if (result.success > 0) {
      showWarning(`Updated ${result.success}, ${result.failed} failed`);
    } else {
      showError(`Failed to update ${result.failed} position${result.failed !== 1 ? 's' : ''}`);
    }
  }, [getChangedRows, submitAll, clearAllDrafts, showSuccess, showWarning, showError]);

  // Handle paste
  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) {
      showWarning('Please paste some data first');
      return;
    }

    const result = handleBulkPaste(pasteText, gridMatrix, relevantAccounts, null);

    if (result.success > 0) {
      showSuccess(`Parsed ${result.success} value${result.success !== 1 ? 's' : ''}${result.hasHeader ? ' (header detected)' : ''}`);
    }
    if (result.failed > 0) {
      showWarning(`${result.failed} line${result.failed !== 1 ? 's' : ''} could not be parsed`);
    }

    setPasteText('');
    setShowPasteInput(false);
  }, [pasteText, handleBulkPaste, gridMatrix, relevantAccounts, showSuccess, showWarning]);

  // Handle import new positions
  const handleImport = useCallback(() => {
    if (newPositionsCount === 0) return;
    onImportNewPositions?.(newPositionsList);
  }, [newPositionsCount, newPositionsList, onImportNewPositions]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <Grid3x3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Position Quantities
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h2>
                <p className="text-xs text-gray-500">
                  {grandTotals?.uniqueSecurities || 0} securities across {grandTotals?.uniqueAccounts || 0} accounts
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Info button */}
            <div className="relative">
              <button
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${showInfoTooltip
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
                title="How this works"
              >
                <Info className="w-5 h-5" />
              </button>
              <AnimatePresence>
                <InfoTooltip show={showInfoTooltip} onClose={() => setShowInfoTooltip(false)} />
              </AnimatePresence>
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Paste */}
            <button
              onClick={() => setShowPasteInput(!showPasteInput)}
              className={`
                flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${showPasteInput
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700'
                }
              `}
            >
              <ClipboardPaste className="w-4 h-4" />
              Paste
            </button>

            {/* Import New Positions */}
            {newPositionsCount > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg shadow-lg shadow-blue-500/25 transition-all"
              >
                <FileDown className="w-4 h-4" />
                Import {newPositionsCount} New Position{newPositionsCount !== 1 ? 's' : ''}
              </motion.button>
            )}

            {/* Save Changes (for existing positions) */}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSubmitting}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all
                ${hasChanges && !isSubmitting
                  ? 'text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25'
                  : 'text-gray-500 bg-gray-800 cursor-not-allowed'
                }
              `}
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? `Saving ${progress.current}/${progress.total}` : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Paste input area */}
        <AnimatePresence>
          {showPasteInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-start gap-3">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste data here (format: ticker, quantity per line)"
                    className="flex-1 h-24 px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handlePaste}
                      className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        setPasteText('');
                        setShowPasteInput(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Format: One position per line. Separate ticker and quantity with tab or comma.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticker..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-2">
            {Object.entries(ASSET_TYPE_CONFIG).map(([type, config]) => (
              <FilterToggle
                key={type}
                type={type}
                config={config}
                active={selectedTypes.includes(type)}
                onClick={() => toggleAssetType(type)}
                count={grandTotals?.byType?.[type] || 0}
              />
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            {/* New positions indicator */}
            {newPositionsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium">
                  {newPositionsCount} new position{newPositionsCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearAllNewPositions}
                  className="ml-1 text-blue-500 hover:text-blue-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Unsaved changes indicator */}
            {hasChanges && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">
                  {draftTotals.changedCount} unsaved change{draftTotals.changedCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearAllDrafts}
                  className="ml-1 text-amber-500 hover:text-amber-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="text-gray-500">
              <span className="text-gray-300 font-medium">{grandTotals?.totalPositions || 0}</span> positions
            </div>
            <div className="text-gray-500">
              <AnimatedCurrency value={grandTotals?.totalValue || 0} className="text-gray-300 font-medium" />
            </div>
          </div>
        </div>
      </div>

      {/* Failed rows warning */}
      <AnimatePresence>
        {failedRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 px-4 py-3 bg-red-900/20 border-b border-red-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{failedRows.length} update{failedRows.length !== 1 ? 's' : ''} failed</span>
              </div>
              <button
                onClick={retryFailed}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-sm font-medium text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                Retry Failed
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <QuantityGrid
          gridMatrix={gridMatrix}
          relevantAccounts={relevantAccounts}
          columnTotals={columnTotals}
          drafts={drafts}
          setDraft={setDraft}
          newPositions={newPositions}
          onNewPositionChange={setNewPosition}
          getNewPositionValue={getNewPositionValue}
          loading={loading}
        />
      </div>

      {/* Footer with delta summary */}
      {(hasChanges || newPositionsCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 px-4 py-3 border-t border-gray-800 bg-gray-900/80"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              {hasChanges && (
                <div className="text-gray-500">
                  Value change:
                  <span className={`ml-2 font-medium ${draftTotals.totalDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {draftTotals.totalDelta >= 0 ? '+' : ''}
                    <AnimatedCurrency value={draftTotals.totalDelta} />
                  </span>
                </div>
              )}
              <div className="text-gray-500">
                {draftTotals?.byAssetType?.security > 0 && (
                  <span className="mr-3">
                    <span className="text-emerald-400">{draftTotals.byAssetType.security}</span> edits
                  </span>
                )}
                {newPositionsCount > 0 && (
                  <span className="mr-3">
                    <span className="text-blue-400">{newPositionsCount}</span> new
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {hasChanges && 'Cmd/Ctrl + Enter to save edits'}
              {hasChanges && newPositionsCount > 0 && ' · '}
              {newPositionsCount > 0 && 'Click Import to add new positions'}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default QuantityManager;
