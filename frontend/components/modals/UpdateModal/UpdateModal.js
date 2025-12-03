// UpdateModal - Main orchestrator component for balance and quantity updates
// Features:
// - Workflow selector: Choose between balance updates or quantity updates
// - Modular, scalable architecture following EditDeleteModal pattern
// - Institution-based selection and grouping
// - Inline editing with keyboard navigation
// - Bulk paste support
// - Real-time stats and delta tracking
// - Retry logic for failed updates
// - Beautiful animations with framer-motion
// - Quantity grid with freeze panes for securities/crypto/metals

import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FixedModal from '../FixedModal';
import MessageToast from './components/MessageToast';
import { SelectionDashboard, UpdateManager, WorkflowSelector, QuantityManager } from './views';
import {
  useUpdateData,
  useUpdateFiltering,
  useUpdateDrafts,
  useUpdateSubmit,
  useMessage,
  useQuantityData,
  useQuantityDrafts,
  useQuantitySubmit
} from './hooks';

/**
 * UpdateModal - Modern update interface for balances and quantities
 *
 * Workflows:
 * 1. Balances: Update cash accounts, liabilities, other asset values
 * 2. Quantities: Update position quantities for securities, crypto, metals
 *
 * Features:
 * - Institution cards with net value summaries
 * - Grouped/flat table view with inline editing
 * - Pivot table grid for quantities
 * - Bulk paste from spreadsheets
 * - Filter by type (cash, liabilities, other / securities, crypto, metals)
 * - Sort by institution, value, change, etc.
 * - Keyboard shortcuts (Cmd+Enter to save, Escape to close)
 * - Progress tracking and retry logic
 * - Privacy toggle (hide values)
 */
const UpdateModal = ({
  isOpen,
  onClose,
  initialView = 'workflow', // 'workflow' | 'dashboard' | 'manager' | 'quantities'
  initialWorkflow = null, // 'balances' | 'quantities'
  initialInstitution = null,
  onDataChange = null,
  onAddPosition = null // Callback to open QuickStart modal
}) => {
  // View state: 'workflow' -> 'dashboard' -> 'manager' (for balances)
  //            'workflow' -> 'quantities' (for quantities)
  const [currentView, setCurrentView] = useState(initialView);
  const [currentWorkflow, setCurrentWorkflow] = useState(initialWorkflow);
  const [showValues, setShowValues] = useState(true);

  // ============================================
  // Balance Workflow Hooks
  // ============================================
  const {
    rows,
    institutionSummaries,
    totals,
    positionsByInstitution,
    liabilitiesByInstitution,
    loading: balanceLoading,
    refreshAllData: refreshBalanceData,
    getInstitutionLogo
  } = useUpdateData(isOpen);

  const balanceDrafts = useUpdateDrafts(rows);
  const filtering = useUpdateFiltering(rows, balanceDrafts.drafts);
  const balanceSubmit = useUpdateSubmit(refreshBalanceData);

  // ============================================
  // Quantity Workflow Hooks
  // ============================================
  const {
    gridMatrix,
    relevantAccounts,
    columnTotals,
    grandTotals,
    quantityPositions,
    searchQuery: qtySearchQuery,
    setSearchQuery: setQtySearchQuery,
    selectedTypes,
    toggleAssetType,
    resetFilters: resetQtyFilters,
    loading: quantityLoading,
    refreshAllData: refreshQuantityData
  } = useQuantityData(isOpen);

  const quantityDrafts = useQuantityDrafts(quantityPositions);
  const quantitySubmit = useQuantitySubmit(refreshQuantityData);

  // ============================================
  // Message Hook (shared)
  // ============================================
  const { message, showSuccess, showError, showWarning, clearMessage } = useMessage();

  // ============================================
  // Reset state when modal closes
  // ============================================
  useEffect(() => {
    if (!isOpen) {
      setCurrentView(initialView);
      setCurrentWorkflow(initialWorkflow);
      filtering.setSelectedInstitution(initialInstitution);
      balanceDrafts.clearAllDrafts();
      balanceSubmit.clearFailed();
      filtering.clearFilters();
      quantityDrafts.clearAllDrafts();
      quantitySubmit.reset();
      resetQtyFilters();
    }
  }, [isOpen, initialView, initialWorkflow, initialInstitution]);

  // ============================================
  // Keyboard shortcuts
  // ============================================
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
      // Cmd/Ctrl + Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentWorkflow === 'balances' && currentView === 'manager') {
          handleBalanceSave();
        } else if (currentWorkflow === 'quantities' && currentView === 'quantities') {
          handleQuantitySave();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, currentView, currentWorkflow]);

  // ============================================
  // Workflow Selection Handlers
  // ============================================
  const handleSelectBalances = useCallback(() => {
    setCurrentWorkflow('balances');
    setCurrentView('dashboard');
  }, []);

  const handleSelectQuantities = useCallback(() => {
    setCurrentWorkflow('quantities');
    setCurrentView('quantities');
  }, []);

  // ============================================
  // Balance Workflow Handlers
  // ============================================
  const handleSelectInstitution = useCallback((institution) => {
    filtering.setSelectedInstitution(institution);
  }, [filtering]);

  const handleContinue = useCallback(() => {
    setCurrentView('manager');
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    filtering.clearFilters();
    balanceDrafts.clearAllDrafts();
  }, [filtering, balanceDrafts]);

  const handleBackToWorkflow = useCallback(() => {
    setCurrentView('workflow');
    setCurrentWorkflow(null);
    filtering.clearFilters();
    balanceDrafts.clearAllDrafts();
    quantityDrafts.clearAllDrafts();
    resetQtyFilters();
  }, [filtering, balanceDrafts, quantityDrafts, resetQtyFilters]);

  const handleBalanceRefresh = useCallback(async () => {
    try {
      await refreshBalanceData();
      showSuccess('Data refreshed');
    } catch (error) {
      showError('Failed to refresh data');
    }
  }, [refreshBalanceData, showSuccess, showError]);

  const handleBalanceSave = useCallback(async () => {
    const changedRows = balanceDrafts.getChangedRows();
    if (!changedRows.length) return;

    const result = await balanceSubmit.submitAll(changedRows);
    if (result.success > 0) {
      balanceDrafts.clearAllDrafts();
      onDataChange?.();
    }
  }, [balanceDrafts, balanceSubmit, onDataChange]);

  // ============================================
  // Quantity Workflow Handlers
  // ============================================
  const handleQuantityRefresh = useCallback(async () => {
    try {
      await refreshQuantityData();
      showSuccess('Data refreshed');
    } catch (error) {
      showError('Failed to refresh data');
    }
  }, [refreshQuantityData, showSuccess, showError]);

  const handleQuantitySave = useCallback(async () => {
    const changedRows = quantityDrafts.getChangedRows();
    if (!changedRows.length) return;

    const result = await quantitySubmit.submitAll(changedRows);
    if (result.success > 0) {
      quantityDrafts.clearAllDrafts();
      onDataChange?.();
    }
    return result;
  }, [quantityDrafts, quantitySubmit, onDataChange]);

  const handleAddPosition = useCallback((row, cell) => {
    // Open QuickStart modal if callback provided
    onAddPosition?.();
  }, [onAddPosition]);

  // ============================================
  // Calculate stats for workflow selector
  // ============================================
  const balanceStats = {
    count: rows?.length || 0
  };

  const quantityStats = {
    count: quantityPositions?.length || 0
  };

  // ============================================
  // Render
  // ============================================
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="max-w-6xl"
      disableBackdropClose={true}
    >
      <div className="relative flex flex-col h-[85vh]">
        <AnimatePresence mode="wait">
          {/* Workflow Selector */}
          {currentView === 'workflow' && (
            <motion.div
              key="workflow"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <WorkflowSelector
                onSelectBalances={handleSelectBalances}
                onSelectQuantities={handleSelectQuantities}
                balanceStats={balanceStats}
                quantityStats={quantityStats}
                loading={balanceLoading || quantityLoading}
              />
            </motion.div>
          )}

          {/* Balance Dashboard */}
          {currentView === 'dashboard' && currentWorkflow === 'balances' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <SelectionDashboard
                institutionSummaries={institutionSummaries}
                totals={totals}
                selectedInstitution={filtering.selectedInstitution}
                onSelectInstitution={handleSelectInstitution}
                onContinue={handleContinue}
                onBack={handleBackToWorkflow}
                showValues={showValues}
                onRefresh={handleBalanceRefresh}
                loading={balanceLoading}
              />
            </motion.div>
          )}

          {/* Balance Manager */}
          {currentView === 'manager' && currentWorkflow === 'balances' && (
            <motion.div
              key="manager"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <UpdateManager
                // Data
                totals={filtering.stats}
                filteredRows={filtering.filteredRows}
                groupedRows={filtering.groupedRows}
                draftTotals={balanceDrafts.draftTotals}

                // Drafts
                drafts={balanceDrafts.drafts}
                setDraft={balanceDrafts.setDraft}
                getChangedRows={balanceDrafts.getChangedRows}
                clearAllDrafts={balanceDrafts.clearAllDrafts}
                handleBulkPaste={balanceDrafts.handleBulkPaste}

                // Filtering
                showCash={filtering.showCash}
                setShowCash={filtering.setShowCash}
                showLiabilities={filtering.showLiabilities}
                setShowLiabilities={filtering.setShowLiabilities}
                showOther={filtering.showOther}
                setShowOther={filtering.setShowOther}
                hideZeros={filtering.hideZeros}
                setHideZeros={filtering.setHideZeros}
                onlyChanged={filtering.onlyChanged}
                setOnlyChanged={filtering.setOnlyChanged}
                searchQuery={filtering.searchQuery}
                setSearchQuery={filtering.setSearchQuery}
                sortBy={filtering.sortBy}
                setSortBy={filtering.setSortBy}
                sortDir={filtering.sortDir}
                toggleSort={filtering.toggleSort}
                groupBy={filtering.groupBy}
                setGroupBy={filtering.setGroupBy}
                hasActiveFilters={filtering.hasActiveFilters}
                clearFilters={filtering.clearFilters}
                selectedInstitution={filtering.selectedInstitution}

                // Display
                showValues={showValues}
                setShowValues={setShowValues}

                // Drilldown data
                positionsByInstitution={positionsByInstitution}
                liabilitiesByInstitution={liabilitiesByInstitution}

                // Submit
                isSubmitting={balanceSubmit.isSubmitting}
                progress={balanceSubmit.progress}
                failedRows={balanceSubmit.failedRows}
                submitAll={balanceSubmit.submitAll}
                retryFailed={balanceSubmit.retryFailed}

                // Navigation
                onBack={handleBackToDashboard}
                onRefresh={handleBalanceRefresh}
                loading={balanceLoading}

                // Utilities
                getInstitutionLogo={getInstitutionLogo}

                // Messages
                showSuccess={showSuccess}
                showError={showError}
                showWarning={showWarning}
              />
            </motion.div>
          )}

          {/* Quantity Manager */}
          {currentView === 'quantities' && currentWorkflow === 'quantities' && (
            <motion.div
              key="quantities"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <QuantityManager
                // Data
                gridMatrix={gridMatrix}
                relevantAccounts={relevantAccounts}
                columnTotals={columnTotals}
                grandTotals={grandTotals}

                // Drafts
                drafts={quantityDrafts.drafts}
                setDraft={quantityDrafts.setDraft}
                draftTotals={quantityDrafts.draftTotals}
                getChangedRows={quantityDrafts.getChangedRows}
                clearAllDrafts={quantityDrafts.clearAllDrafts}
                handleBulkPaste={quantityDrafts.handleBulkPaste}
                hasChanges={quantityDrafts.hasChanges}

                // Filtering
                searchQuery={qtySearchQuery}
                setSearchQuery={setQtySearchQuery}
                selectedTypes={selectedTypes}
                toggleAssetType={toggleAssetType}
                resetFilters={resetQtyFilters}

                // Submit
                isSubmitting={quantitySubmit.isSubmitting}
                progress={quantitySubmit.progress}
                failedRows={quantitySubmit.failedRows}
                submitAll={handleQuantitySave}
                retryFailed={quantitySubmit.retryFailed}

                // Navigation
                onBack={handleBackToWorkflow}
                onRefresh={handleQuantityRefresh}
                onAddPosition={handleAddPosition}
                loading={quantityLoading}

                // Messages
                showSuccess={showSuccess}
                showError={showError}
                showWarning={showWarning}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast messages */}
        <MessageToast message={message} onClear={clearMessage} />
      </div>
    </FixedModal>
  );
};

export default UpdateModal;
