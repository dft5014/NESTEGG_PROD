// Update Manager View for Update Modal
import React, { useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Database, Building2, Loader2,
  ArrowUpDown, ChevronDown, ChevronRight
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import StatsBar from '../components/StatsBar';
import FilterBar from '../components/FilterBar';
import UpdateRow from '../components/UpdateRow';
import ActionBar from '../components/ActionBar';

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
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedInstitution ? `Update ${selectedInstitution}` : 'Update All'}
                </h2>
                <p className="text-xs text-gray-400">
                  {filteredRows.length} items to update
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24">
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
                <table className="w-full min-w-[900px]">
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
                      <table className="w-full min-w-[900px]">
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
      </div>

      {/* Sticky action bar */}
      <ActionBar
        changedCount={draftTotals.changedCount}
        totalDelta={draftTotals.totalDelta}
        failedCount={failedRows.length}
        isSubmitting={isSubmitting}
        progress={progress}
        showValues={showValues}
        onSave={handleSave}
        onClear={clearAllDrafts}
        onRetryFailed={handleRetry}
      />
    </div>
  );
};

export default UpdateManager;
