// UpdateModal - Main orchestrator component for balance updates
// Features:
// - Modular, scalable architecture following EditDeleteModal pattern
// - Institution-based selection and grouping
// - Inline editing with keyboard navigation
// - Bulk paste support
// - Real-time stats and delta tracking
// - Retry logic for failed updates
// - Beautiful animations with framer-motion

import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FixedModal from '../FixedModal';
import MessageToast from './components/MessageToast';
import { SelectionDashboard, UpdateManager } from './views';
import {
  useUpdateData,
  useUpdateFiltering,
  useUpdateDrafts,
  useUpdateSubmit,
  useMessage
} from './hooks';

/**
 * UpdateModal - Modern balance update interface
 *
 * Features:
 * - Institution cards with net value summaries
 * - Grouped/flat table view with inline editing
 * - Bulk paste from spreadsheets
 * - Filter by type (cash, liabilities, other)
 * - Sort by institution, value, change, etc.
 * - Keyboard shortcuts (Cmd+Enter to save, Escape to close)
 * - Progress tracking and retry logic
 * - Privacy toggle (hide values)
 */
const UpdateModal = ({
  isOpen,
  onClose,
  initialView = 'dashboard', // 'dashboard' | 'manager'
  initialInstitution = null,
  onDataChange = null
}) => {
  // View state
  const [currentView, setCurrentView] = useState(initialView);
  const [showValues, setShowValues] = useState(true);

  // Data hook
  const {
    rows,
    institutionSummaries,
    totals,
    loading,
    refreshAllData,
    getInstitutionLogo
  } = useUpdateData(isOpen);

  // Drafts hook
  const drafts = useUpdateDrafts(rows);

  // Filtering hook
  const filtering = useUpdateFiltering(rows, drafts.drafts);

  // Submit hook
  const submit = useUpdateSubmit(refreshAllData);

  // Message hook
  const { message, showSuccess, showError, showWarning, clearMessage } = useMessage();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentView(initialView);
      filtering.setSelectedInstitution(initialInstitution);
      drafts.clearAllDrafts();
      submit.clearFailed();
      filtering.clearFilters();
    }
  }, [isOpen, initialView, initialInstitution]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Handle institution selection from dashboard
  const handleSelectInstitution = useCallback((institution) => {
    filtering.setSelectedInstitution(institution);
  }, [filtering]);

  // Handle continue from dashboard
  const handleContinue = useCallback(() => {
    setCurrentView('manager');
  }, []);

  // Handle back to dashboard
  const handleBack = useCallback(() => {
    setCurrentView('dashboard');
    filtering.clearFilters();
    drafts.clearAllDrafts();
  }, [filtering, drafts]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refreshAllData();
      showSuccess('Data refreshed');
    } catch (error) {
      showError('Failed to refresh data');
    }
  }, [refreshAllData, showSuccess, showError]);

  // Handle successful save
  const handleDataChange = useCallback(() => {
    if (onDataChange) {
      onDataChange();
    }
  }, [onDataChange]);

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
          {currentView === 'dashboard' ? (
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
                showValues={showValues}
                onRefresh={handleRefresh}
                loading={loading}
              />
            </motion.div>
          ) : (
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
                draftTotals={drafts.draftTotals}

                // Drafts
                drafts={drafts.drafts}
                setDraft={drafts.setDraft}
                getChangedRows={drafts.getChangedRows}
                clearAllDrafts={drafts.clearAllDrafts}
                handleBulkPaste={drafts.handleBulkPaste}

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

                // Submit
                isSubmitting={submit.isSubmitting}
                progress={submit.progress}
                failedRows={submit.failedRows}
                submitAll={submit.submitAll}
                retryFailed={submit.retryFailed}

                // Navigation
                onBack={handleBack}
                onRefresh={handleRefresh}
                loading={loading}

                // Utilities
                getInstitutionLogo={getInstitutionLogo}

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
