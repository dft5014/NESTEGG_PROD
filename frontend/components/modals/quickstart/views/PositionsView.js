// Positions View - Add positions across all asset types
import React, { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Check, Loader2,
  Upload, Download, X, HelpCircle, Keyboard
} from 'lucide-react';
import DataTable, { CollapsibleSection } from '../components/DataTable';
import StatsBar, { PositionTypeStats } from '../components/StatsBar';
import { KeyboardShortcutsPanel, useKeyboardShortcuts } from '../components/KeyboardShortcuts';
import { VIEWS, ASSET_TYPES } from '../utils/constants';
import { formatCurrency } from '@/utils/formatters';
import { downloadTemplate } from '../utils/excelUtils';

export default function PositionsView({
  state,
  dispatch,
  actions,
  accounts,
  institutions,
  searchResults,
  isSearching,
  onSearch,
  onSelectSearchResult,
  onSubmitPositions,
  isSubmitting,
  goToView,
  goBack
}) {
  const positions = state.positions;
  const positionSections = state.positionSections;
  const recentAccountIds = state.recentAccountIds || [];
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Add new position
  const handleAddPosition = useCallback((assetType) => {
    dispatch(actions.addPosition(assetType, {}));
  }, [dispatch, actions]);

  // Update position - track account usage for recents
  const handleUpdatePosition = useCallback((assetType, id, data) => {
    dispatch(actions.updatePosition(assetType, id, data));
    // Track account selection for recent accounts feature
    if (data.account_id) {
      dispatch(actions.trackRecentAccount(data.account_id));
    }
  }, [dispatch, actions]);

  // Delete position
  const handleDeletePosition = useCallback((assetType, id) => {
    dispatch(actions.deletePosition(assetType, id));
  }, [dispatch, actions]);

  // Duplicate position
  const handleDuplicatePosition = useCallback((assetType, id) => {
    dispatch(actions.duplicatePosition(assetType, id));
  }, [dispatch, actions]);

  // Toggle section
  const handleToggleSection = useCallback((assetType) => {
    dispatch(actions.togglePositionSection(assetType));
  }, [dispatch, actions]);

  // Toggle selection
  const handleToggleSelect = useCallback((id) => {
    dispatch(actions.toggleSelect(id));
  }, [dispatch, actions]);

  // Select/deselect all for a type
  const handleSelectAllForType = useCallback((assetType, selectAll) => {
    const typePositions = positions[assetType] || [];
    typePositions.forEach(pos => {
      const isSelected = state.selectedIds.has(pos.id);
      if (selectAll && !isSelected) {
        dispatch(actions.toggleSelect(pos.id));
      } else if (!selectAll && isSelected) {
        dispatch(actions.toggleSelect(pos.id));
      }
    });
  }, [positions, state.selectedIds, dispatch, actions]);

  // Delete selected
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = Array.from(state.selectedIds);
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected position(s)?`
    );
    if (confirmed) {
      dispatch(actions.deleteSelected(selectedIds));
    }
  }, [state.selectedIds, dispatch, actions]);

  // Clear all positions
  const handleClearAll = useCallback(() => {
    const totalCount = Object.values(positions).reduce((sum, arr) => sum + arr.length, 0);
    if (totalCount === 0) return;

    const confirmed = window.confirm(
      `Clear all ${totalCount} position(s)? This won't affect already saved positions.`
    );
    if (confirmed) {
      dispatch(actions.clearPositions());
    }
  }, [positions, dispatch, actions]);

  // Submit positions
  const handleSubmit = useCallback(async (mode = 'ready') => {
    await onSubmitPositions(mode);
  }, [onSubmitPositions]);

  // Download template via API
  const handleDownloadTemplate = useCallback(async () => {
    try {
      await downloadTemplate('positions', setIsDownloading);
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template. Please try again.');
    }
  }, []);

  // Handle search for ticker/symbol
  const handleSearch = useCallback((positionId, fieldKey, query) => {
    // Determine asset type from position
    let assetType = null;
    for (const [type, typePositions] of Object.entries(positions)) {
      if (typePositions.some(p => p.id === positionId)) {
        assetType = type;
        break;
      }
    }
    if (assetType) {
      onSearch(positionId, query, assetType);
    }
  }, [positions, onSearch]);

  // Handle search result selection
  const handleSelectResult = useCallback((positionId, result) => {
    // Find which asset type this position belongs to
    let assetType = null;
    for (const [type, typePositions] of Object.entries(positions)) {
      if (typePositions.some(p => p.id === positionId)) {
        assetType = type;
        break;
      }
    }
    if (assetType) {
      onSelectSearchResult(assetType, positionId, result);
    }
  }, [positions, onSelectSearchResult]);

  // Calculate stats
  const stats = useMemo(() => {
    let total = 0;
    let ready = 0;
    let value = 0;

    Object.entries(positions).forEach(([assetType, typePositions]) => {
      typePositions.forEach(pos => {
        total++;
        if (pos.status === 'ready') ready++;

        // Calculate value based on type
        if (assetType === 'security') {
          value += (parseFloat(pos.data.shares) || 0) * (parseFloat(pos.data.price) || 0);
        } else if (assetType === 'cash') {
          value += parseFloat(pos.data.amount) || 0;
        } else if (assetType === 'crypto') {
          value += (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price) || 0);
        } else if (assetType === 'metal') {
          value += (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price_per_unit) || 0);
        } else if (assetType === 'other') {
          value += parseFloat(pos.data.current_value) || 0;
        }
      });
    });

    return { total, ready, value };
  }, [positions]);

  const selectedCount = state.selectedIds.size;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    viewType: 'positions',
    onAddNew: () => handleAddPosition('security'),
    onAddCash: () => handleAddPosition('cash'),
    onToggleHelp: () => dispatch(actions.toggleHelp()),
    onSubmit: () => stats.ready > 0 && handleSubmit('ready'),
    onEscape: () => {
      if (state.showHelp) dispatch(actions.toggleHelp());
      if (selectedCount > 0) dispatch(actions.deselectAll());
    },
    showShortcuts,
    setShowShortcuts
  });

  // Calculate value for each type
  const getTypeValue = (assetType) => {
    const typePositions = positions[assetType] || [];
    return typePositions.reduce((sum, pos) => {
      if (assetType === 'security') {
        return sum + (parseFloat(pos.data.shares) || 0) * (parseFloat(pos.data.price) || 0);
      } else if (assetType === 'cash') {
        return sum + (parseFloat(pos.data.amount) || 0);
      } else if (assetType === 'crypto') {
        return sum + (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price) || 0);
      } else if (assetType === 'metal') {
        return sum + (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price_per_unit) || 0);
      } else if (assetType === 'other') {
        return sum + (parseFloat(pos.data.current_value) || 0);
      }
      return sum;
    }, 0);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 space-y-4">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white">Add Positions</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowShortcuts(s => !s)}
              className={`p-2 rounded-lg transition-colors ${showShortcuts ? 'text-indigo-400 bg-indigo-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            <button
              onClick={() => dispatch(actions.toggleHelp())}
              className={`p-2 rounded-lg transition-colors ${state.showHelp ? 'text-blue-400 bg-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              title="Help (H)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Template</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                dispatch(actions.setImportTarget('positions'));
                dispatch(actions.setImportMethod('excel'));
                goToView(VIEWS.import);
              }}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center space-x-1.5 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={stats.total === 0}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>

            {selectedCount > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center space-x-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete {selectedCount}</span>
              </button>
            )}

            <button
              onClick={() => handleSubmit('ready')}
              disabled={isSubmitting || stats.ready === 0}
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save {stats.ready > 0 ? `(${stats.ready})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats.total > 0 && (
          <StatsBar data={positions} type="positions" />
        )}

        {/* Keyboard shortcuts panel */}
        <KeyboardShortcutsPanel
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          viewType="positions"
        />

        {/* Help panel */}
        {state.showHelp && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-blue-300">
                <p className="font-semibold mb-1">How to Add Positions</p>
                <ul className="space-y-1 text-blue-400/80">
                  <li>Click an asset type button to add a position of that type</li>
                  <li>Type a ticker symbol to search and auto-fill current price</li>
                  <li>Fill all required fields - status changes to Ready when complete</li>
                  <li>Use the Import button to bulk import from Excel</li>
                  <li>Click "Save" to add all ready positions to your portfolio</li>
                </ul>
              </div>
              <button
                onClick={() => dispatch(actions.toggleHelp())}
                className="p-1 hover:bg-blue-500/20 rounded"
              >
                <X className="w-3 h-3 text-blue-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Import banner - always visible, more compact when positions exist */}
        <div className={`bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-xl border border-purple-700/50 ${stats.total === 0 ? 'p-5' : 'p-3'}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 flex items-center space-x-4">
              {stats.total === 0 ? (
                <>
                  <div className="hidden md:flex items-center justify-center w-12 h-12 bg-purple-900/30 rounded-lg flex-shrink-0">
                    <Upload className="w-6 h-6 text-purple-400/60" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center">
                      <Upload className="w-4 h-4 mr-2 text-purple-400 md:hidden" />
                      Bulk Import from Excel
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      Download template, fill in offline, import all at once
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">Have more positions in a spreadsheet?</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadTemplate}
                disabled={isDownloading}
                className={`${stats.total === 0 ? 'px-4 py-2' : 'px-3 py-1.5'} bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors text-sm font-medium disabled:opacity-50`}
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className={stats.total === 0 ? '' : 'hidden sm:inline'}>Template</span>
              </button>
              <button
                onClick={() => {
                  dispatch(actions.setImportTarget('positions'));
                  dispatch(actions.setImportMethod('excel'));
                  goToView(VIEWS.import);
                }}
                className={`${stats.total === 0 ? 'px-4 py-2' : 'px-3 py-1.5'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors text-sm font-medium`}
              >
                <Upload className="w-4 h-4" />
                <span className={stats.total === 0 ? '' : 'hidden sm:inline'}>Import</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add buttons */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(ASSET_TYPES).map(([key, config]) => {
            const Icon = config.icon;
            const count = positions[key]?.length || 0;
            const colorClasses = {
              blue: 'bg-blue-600 hover:bg-blue-700 border-blue-500',
              purple: 'bg-purple-600 hover:bg-purple-700 border-purple-500',
              orange: 'bg-orange-600 hover:bg-orange-700 border-orange-500',
              yellow: 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500',
              green: 'bg-green-600 hover:bg-green-700 border-green-500'
            };

            return (
              <button
                key={key}
                onClick={() => handleAddPosition(key)}
                className={`
                  px-3 py-2 rounded-lg flex items-center space-x-2
                  transition-all duration-200 border-2
                  ${count > 0
                    ? `${colorClasses[config.color]} text-white`
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{config.name}</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                    {count}
                  </span>
                )}
                <Plus className="w-3 h-3" />
              </button>
            );
          })}
        </div>

        {/* Position sections */}
        {stats.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Plus className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">No positions yet</p>
            <p className="text-sm">Click a button above to add positions, or import from Excel</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(ASSET_TYPES).map(([assetType, config]) => {
              const typePositions = positions[assetType] || [];
              if (typePositions.length === 0) return null;

              const Icon = config.icon;
              const typeValue = getTypeValue(assetType);
              const isExpanded = positionSections[assetType];

              return (
                <CollapsibleSection
                  key={assetType}
                  title={config.name}
                  icon={Icon}
                  count={typePositions.length}
                  value={typeValue}
                  isExpanded={isExpanded}
                  onToggle={() => handleToggleSection(assetType)}
                  color={config.color}
                >
                  <div className="p-4">
                    <DataTable
                      fields={config.fields}
                      rows={typePositions}
                      selectedIds={state.selectedIds}
                      onUpdate={(id, data) => handleUpdatePosition(assetType, id, data)}
                      onDelete={(id) => handleDeletePosition(assetType, id)}
                      onDuplicate={(id) => handleDuplicatePosition(assetType, id)}
                      onToggleSelect={handleToggleSelect}
                      onSelectAll={(selectAll) => handleSelectAllForType(assetType, selectAll)}
                      accounts={accounts}
                      recentAccountIds={recentAccountIds}
                      searchResults={searchResults}
                      isSearching={isSearching}
                      onSearch={handleSearch}
                      onSelectSearchResult={handleSelectResult}
                      institutions={institutions}
                      showCheckboxes={true}
                      showActions={true}
                      showStatus={true}
                      emptyMessage={`No ${config.name.toLowerCase()} positions`}
                    />
                    {/* Add button within section */}
                    <button
                      onClick={() => handleAddPosition(assetType)}
                      className={`
                        mt-3 w-full px-3 py-2 rounded-lg flex items-center justify-center space-x-2
                        bg-gray-800/50 border border-dashed border-gray-600 text-gray-400
                        hover:bg-gray-800 hover:border-gray-500 hover:text-gray-300
                        transition-all duration-200
                      `}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Add {config.name.replace(/s$/, '')}</span>
                    </button>
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {stats.total > 0 && (
            <span>
              {stats.ready} of {stats.total} position{stats.total !== 1 ? 's' : ''} ready |
              Est. value: {formatCurrency(stats.value)}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={goBack}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
