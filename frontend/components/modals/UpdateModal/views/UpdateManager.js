// Update Manager View for Update Modal
import React, { useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Database, Building2, Loader2,
  ArrowUpDown, ChevronDown, ChevronRight, Info,
  Check, AlertTriangle, RotateCcw, X
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import StatsBar from '../components/StatsBar';
import FilterBar from '../components/FilterBar';
import UpdateRow from '../components/UpdateRow';

/**
 * Collapsible group component
 */
const GroupSection = ({
  groupName,
  items,
  isExpanded,
  onToggle,
  children,
  showValues = true
}) => {
  const groupTotal = useMemo(() =>
    items.reduce((sum, item) => sum + Math.abs(item.currentValue), 0),
    [items]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/70 rounded-xl border border-gray-800 overflow-hidden"
    >
      {/* Group header */}
      <button
        onClick={onToggle}
        className="
          w-full flex items-center justify-between
          px-4 py-3 bg-gray-800/50
          hover:bg-gray-800/70 transition-colors
        "
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </motion.div>
          <Building2 className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-gray-200">{groupName}</span>
          <span className="px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-700/50 rounded-full">
            {items.length}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-400 tabular-nums">
          {showValues ? formatCurrency(groupTotal) : '••••'}
        </span>
      </button>

      {/* Group content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Update manager view with table and editing
 */
const UpdateManager = ({
  // Data
  totals,
  filteredRows,
  groupedRows,
  draftTotals,

  // Drafts
  drafts,
  setDraft,
  getChangedRows,
  clearAllDrafts,
  handleBulkPaste,

  // Filtering
  showCash,
  setShowCash,
  showLiabilities,
  setShowLiabilities,
  showOther,
  setShowOther,
  hideZeros,
  setHideZeros,
  onlyChanged,
  setOnlyChanged,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortDir,
  toggleSort,
  groupBy,
  setGroupBy,
  hasActiveFilters,
  clearFilters,

  // Display
  showValues,
  setShowValues,
  selectedInstitution,

  // Drilldown data
  positionsByInstitution,
  liabilitiesByInstitution,

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

  // Utilities
  getInstitutionLogo,

  // Messages
  showSuccess,
  showError,
  showWarning
}) => {
  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = React.useState(() => {
    // Default all groups to expanded
    return new Set(Object.keys(groupedRows));
  });

  // Update expanded groups when groupedRows changes
  useEffect(() => {
    setExpandedGroups(new Set(Object.keys(groupedRows)));
  }, [groupBy]);

  const toggleGroup = useCallback((groupName) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    const changes = getChangedRows();
    if (changes.length === 0) {
      showWarning('No changes to save');
      return;
    }

    const result = await submitAll(changes);

    if (result.success) {
      showSuccess(`Updated ${result.successCount} item${result.successCount !== 1 ? 's' : ''}`);
      clearAllDrafts();
    } else if (result.failedCount > 0) {
      showWarning(`Updated ${result.successCount}, ${result.failedCount} failed`);
    } else {
      showError('Failed to save changes');
    }
  }, [getChangedRows, submitAll, showSuccess, showWarning, showError, clearAllDrafts]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    const changes = getChangedRows();
    const result = await retryFailed(changes);

    if (result.success) {
      showSuccess('All failed items updated');
      clearAllDrafts();
    } else if (result.failedCount > 0) {
      showWarning(`${result.failedCount} still failing`);
    }
  }, [getChangedRows, retryFailed, showSuccess, showWarning, clearAllDrafts]);

  // Handle paste
  const handlePaste = useCallback((e) => {
    const isField = e.target?.closest?.('input, textarea, [contenteditable="true"]');
    if (isField && !(e.metaKey || e.altKey)) return;

    const text = e.clipboardData?.getData('text');
    if (!text) return;

    e.preventDefault();

    const visibleKeys = filteredRows.map(r => r._key);
    const result = handleBulkPaste(text, visibleKeys);

    if (result.success) {
      showSuccess(`Pasted ${result.count} value${result.count !== 1 ? 's' : ''}`);
      if (result.headerWarning) {
        showWarning('First value looked like a header - was skipped');
      }
    }
  }, [filteredRows, handleBulkPaste, showSuccess, showWarning]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  // Table headers
  const tableHeaders = [
    { key: 'institution', label: 'Institution', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'identifier', label: 'Identifier', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'updated', label: 'Updated', sortable: true },
    { key: 'value', label: 'Current', sortable: true, align: 'right' },
    { key: 'input', label: 'New Value', sortable: false, align: 'center' },
    { key: 'delta', label: 'Change', sortable: true, align: 'right' },
    { key: 'pct', label: '%', sortable: true, align: 'right' }
  ];

  const renderTableHeader = () => (
    <thead className="bg-gray-800/50 sticky top-0 z-10">
      <tr>
        {tableHeaders.map(header => (
          <th
            key={header.key}
            className={`
              px-4 py-3 text-xs font-semibold uppercase tracking-wider
              ${header.align === 'right' ? 'text-right' : header.align === 'center' ? 'text-center' : 'text-left'}
              ${header.sortable ? 'cursor-pointer hover:text-white' : ''}
              text-gray-400 transition-colors
            `}
            onClick={header.sortable ? () => toggleSort(header.key) : undefined}
          >
            <span className="inline-flex items-center gap-1">
              {header.label}
              {header.sortable && sortBy === header.key && (
                <ArrowUpDown className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );

  const renderTableBody = (items, startIndex = 0) => (
    <tbody className="divide-y divide-gray-800/50">
      {items.map((row, idx) => {
        const globalIndex = startIndex + idx;
        const nextRow = items[idx + 1];
        const nextInputId = nextRow ? `update-input-${nextRow._key}` : undefined;

        return (
          <UpdateRow
            key={row._key}
            row={row}
            index={globalIndex}
            draftValue={drafts[row._key]}
            onValueChange={setDraft}
            nextInputId={nextInputId}
            getInstitutionLogo={getInstitutionLogo}
            showValues={showValues}
            isFailed={failedRows.includes(row._key)}
            isNew={row.currentValue === 0 && drafts[row._key] !== undefined}
          />
        );
      })}
    </tbody>
  );

  return (
    <div
      className="flex flex-col h-full"
      onPaste={handlePaste}
    >
      {/* Filter bar */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <FilterBar
          showCash={showCash}
          setShowCash={setShowCash}
          showLiabilities={showLiabilities}
          setShowLiabilities={setShowLiabilities}
          showOther={showOther}
          setShowOther={setShowOther}
          hideZeros={hideZeros}
          setHideZeros={setHideZeros}
          onlyChanged={onlyChanged}
          setOnlyChanged={setOnlyChanged}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortDir={sortDir}
          toggleSort={toggleSort}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          showValues={showValues}
          setShowValues={setShowValues}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
          onRefresh={onRefresh}
          isLoading={loading}
        />
      </div>

      {/* Stats bar */}
      <StatsBar
        totals={totals}
        draftTotals={draftTotals}
        showValues={showValues}
      />

      {/* Inline action bar - appears when there are changes */}
      <AnimatePresence>
        {(draftTotals.changedCount > 0 || failedRows.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 border-b border-gray-800"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/50">
              {/* Left: Status info */}
              <div className="flex items-center gap-4">
                {draftTotals.changedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                      <Check className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-sm text-gray-300">
                      <span className="font-semibold text-indigo-400">{draftTotals.changedCount}</span> change{draftTotals.changedCount !== 1 ? 's' : ''}
                    </span>
                    <span className={`text-sm font-medium ${draftTotals.totalDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {showValues
                        ? `${draftTotals.totalDelta >= 0 ? '+' : ''}${formatCurrency(draftTotals.totalDelta)}`
                        : '••••'
                      }
                    </span>
                  </div>
                )}
                {failedRows.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-sm text-amber-400">
                      <span className="font-semibold">{failedRows.length}</span> failed
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center gap-2">
                {/* Progress indicator */}
                {isSubmitting && progress.total > 0 && (
                  <div className="flex items-center gap-2 mr-2">
                    <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      />
                    </div>
                    <span className="text-xs text-gray-400 tabular-nums">{progress.current}/{progress.total}</span>
                  </div>
                )}

                {/* Retry failed */}
                {failedRows.length > 0 && !isSubmitting && (
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}

                {/* Update All button */}
                {draftTotals.changedCount > 0 && (
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                {draftTotals.changedCount > 0 && !isSubmitting && (
                  <button
                    onClick={clearAllDrafts}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}

                {/* Keyboard hint */}
                {draftTotals.changedCount > 0 && !isSubmitting && (
                  <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-500 ml-2">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">
                      {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}
                    </kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">Enter</kbd>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64"
            >
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Loading...</p>
            </motion.div>
          ) : filteredRows.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64"
            >
              <div className="p-4 bg-gray-800/50 rounded-2xl mb-4">
                <Database className="w-12 h-12 text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg font-medium">No items found</p>
              <p className="text-gray-500 text-sm mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Add some accounts to get started'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          ) : groupBy === 'none' ? (
            // Flat table
            <motion.div
              key="flat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gray-900/70 rounded-xl border border-gray-800 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  {renderTableHeader()}
                  {renderTableBody(filteredRows)}
                </table>
              </div>
            </motion.div>
          ) : (
            // Grouped tables
            <motion.div
              key="grouped"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {Object.entries(groupedRows).map(([groupName, items], groupIdx) => {
                let startIndex = 0;
                Object.entries(groupedRows).slice(0, groupIdx).forEach(([, prevItems]) => {
                  startIndex += prevItems.length;
                });

                return (
                  <GroupSection
                    key={groupName}
                    groupName={groupName}
                    items={items}
                    isExpanded={expandedGroups.has(groupName)}
                    onToggle={() => toggleGroup(groupName)}
                    showValues={showValues}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1000px]">
                        {renderTableHeader()}
                        {renderTableBody(items, startIndex)}
                      </table>
                    </div>
                  </GroupSection>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drilldown section when institution selected */}
        {selectedInstitution && positionsByInstitution && liabilitiesByInstitution && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl border border-gray-800 overflow-hidden bg-gray-900/50"
          >
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-800/50 border-b border-gray-800">
              <Info className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-white">
                Detailed positions in {selectedInstitution}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {positionsByInstitution.get(selectedInstitution)?.length || 0} positions
                {' • '}
                {liabilitiesByInstitution.get(selectedInstitution)?.length || 0} liabilities
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
              {/* Positions */}
              <div className="min-h-[180px]">
                <div className="px-5 py-2.5 text-xs uppercase text-gray-400 bg-gray-800/30 font-semibold">
                  Positions (Cash & Other)
                </div>
                <div className="max-h-[32vh] overflow-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800/30 sticky top-0">
                      <tr className="text-xs uppercase text-gray-500">
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Identifier</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {(positionsByInstitution.get(selectedInstitution) || []).map(p => (
                        <tr key={p.id} className="hover:bg-gray-800/30">
                          <td className="px-4 py-2.5 text-sm text-gray-200">
                            {p.name}
                            {p.accountName && (
                              <div className="text-xs text-gray-500 mt-0.5">{p.accountName}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-400">{p.identifier || '-'}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-400">{p.type || '-'}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-200 text-right tabular-nums">
                            {showValues ? formatCurrency(p.value) : '••••'}
                          </td>
                        </tr>
                      ))}
                      {(positionsByInstitution.get(selectedInstitution) || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-sm text-gray-500 text-center">
                            No positions
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Liabilities */}
              <div className="min-h-[180px]">
                <div className="px-5 py-2.5 text-xs uppercase text-gray-400 bg-gray-800/30 font-semibold">
                  Liabilities
                </div>
                <div className="max-h-[32vh] overflow-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800/30 sticky top-0">
                      <tr className="text-xs uppercase text-gray-500">
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Identifier</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {(liabilitiesByInstitution.get(selectedInstitution) || []).map(l => (
                        <tr key={l.id} className="hover:bg-gray-800/30">
                          <td className="px-4 py-2.5 text-sm text-gray-200">
                            {l.name}
                            {l.accountName && (
                              <div className="text-xs text-gray-500 mt-0.5">{l.accountName}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-400">{l.identifier || '-'}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-400">{l.type || '-'}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-200 text-right tabular-nums">
                            {showValues ? formatCurrency(l.value) : '••••'}
                          </td>
                        </tr>
                      ))}
                      {(liabilitiesByInstitution.get(selectedInstitution) || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-sm text-gray-500 text-center">
                            No liabilities
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
};

export default UpdateManager;
