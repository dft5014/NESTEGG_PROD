// QuickStart Modal V2 - Unified Data Entry Modal
// A modern, clean interface for adding accounts, positions, and liabilities
import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FixedModal from '../FixedModal';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import { popularBrokerages } from '@/utils/constants';
import { useDataStore } from '@/store/DataStore';

// State Management
import { quickStartReducer, initialState, actions } from './state/reducer';
import { VIEWS, ACCOUNT_CATEGORIES, ACCOUNT_TYPES_BY_CATEGORY, LIABILITY_TYPES } from './utils/constants';

// Hooks
import useSecuritySearch from './hooks/useSecuritySearch';
import useBulkSubmit from './hooks/useBulkSubmit';
import useLocalPersistence from './hooks/useLocalPersistence';

// Views
import WelcomeView from './views/WelcomeView';
import AccountsView from './views/AccountsView';
import PositionsView from './views/PositionsView';
import LiabilitiesView from './views/LiabilitiesView';
import ImportView from './views/ImportView';
import SuccessView from './views/SuccessView';

// Animation variants for view transitions
const viewVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export default function QuickStartModalV2({ isOpen, onClose, onSuccess }) {
  const [state, dispatch] = useReducer(quickStartReducer, initialState);
  const { markStale } = useDataStore();

  // Format institutions for dropdowns
  const institutions = useMemo(() =>
    popularBrokerages.map(inst => ({
      name: inst.name,
      logo: inst.logo,
      value: inst.name
    })),
    []
  );

  // Custom hooks
  const { search, selectResult, hydrateAllPending } = useSecuritySearch({
    dispatch,
    positions: state.positions,
    enabled: isOpen
  });

  const { submitAccounts, submitPositions, submitLiabilities, getReadyCounts, isSubmitting } = useBulkSubmit({
    state,
    dispatch,
    onSuccess: (type, items) => {
      // Mark relevant data as stale to trigger refresh
      if (type === 'accounts') {
        markStale('accounts');
        markStale('portfolioSummary');
      } else if (type === 'positions') {
        markStale('positions');
        markStale('portfolioSummary');
        markStale('groupedPositions');
      } else if (type === 'liabilities') {
        markStale('liabilities');
        markStale('portfolioSummary');
      }

      // Call parent callback
      onSuccess?.(type, items);
    }
  });

  const { restoreDraft, clearDraft, hasDraft } = useLocalPersistence({
    state,
    dispatch,
    enabled: isOpen
  });

  // Load existing accounts on mount
  useEffect(() => {
    if (!isOpen) return;

    async function loadExistingAccounts() {
      try {
        const accounts = await fetchAllAccounts();
        dispatch(actions.setExistingAccounts(accounts || []));
      } catch (error) {
        console.error('Failed to load accounts:', error);
        dispatch(actions.setExistingAccounts([]));
      }
    }

    loadExistingAccounts();
  }, [isOpen]);

  // Restore draft on open
  useEffect(() => {
    if (isOpen) {
      restoreDraft();
    }
  }, [isOpen, restoreDraft]);

  // Handle close with dirty check
  const handleClose = useCallback(() => {
    if (state.isDirty) {
      const hasUnsavedWork = state.accounts.some(a => a.status !== 'added') ||
        Object.values(state.positions).some(arr => arr.some(p => p.status !== 'added')) ||
        state.liabilities.some(l => l.status !== 'added');

      if (hasUnsavedWork) {
        const confirmClose = window.confirm(
          'You have unsaved changes. Your draft will be saved locally. Are you sure you want to close?'
        );
        if (!confirmClose) return;
      }
    }

    // Reset to welcome view
    dispatch(actions.setView(VIEWS.welcome));
    onClose();
  }, [state.isDirty, state.accounts, state.positions, state.liabilities, onClose]);

  // Handle successful completion
  const handleComplete = useCallback(() => {
    clearDraft();
    dispatch(actions.resetAll());
    onClose();
  }, [clearDraft, onClose]);

  // Navigation helpers
  const goToView = useCallback((view) => {
    dispatch(actions.setView(view));
  }, []);

  const goBack = useCallback(() => {
    dispatch(actions.goBack());
  }, []);

  // Get modal title based on current view
  const getModalTitle = () => {
    switch (state.currentView) {
      case VIEWS.welcome: return 'QuickStart';
      case VIEWS.accounts: return 'Add Accounts';
      case VIEWS.positions: return 'Add Positions';
      case VIEWS.liabilities: return 'Add Liabilities';
      case VIEWS.import: return 'Import from Excel';
      case VIEWS.success: return 'Success';
      default: return 'QuickStart';
    }
  };

  // Props for views
  const viewProps = {
    state,
    dispatch,
    actions,
    institutions,
    accountCategories: ACCOUNT_CATEGORIES,
    accountTypesByCategory: ACCOUNT_TYPES_BY_CATEGORY,
    liabilityTypes: LIABILITY_TYPES,
    accounts: state.existingAccounts,
    searchResults: state.searchResults,
    isSearching: state.isSearching,
    onSearch: search,
    onSelectSearchResult: selectResult,
    onSubmitAccounts: submitAccounts,
    onSubmitPositions: submitPositions,
    onSubmitLiabilities: submitLiabilities,
    onHydratePrices: hydrateAllPending,
    getReadyCounts,
    isSubmitting,
    goToView,
    goBack,
    onComplete: handleComplete,
    onClose: handleClose
  };

  // Render current view
  const renderView = () => {
    switch (state.currentView) {
      case VIEWS.welcome:
        return <WelcomeView {...viewProps} />;
      case VIEWS.accounts:
        return <AccountsView {...viewProps} />;
      case VIEWS.positions:
        return <PositionsView {...viewProps} />;
      case VIEWS.liabilities:
        return <LiabilitiesView {...viewProps} />;
      case VIEWS.import:
        return <ImportView {...viewProps} />;
      case VIEWS.success:
        return <SuccessView {...viewProps} />;
      default:
        return <WelcomeView {...viewProps} />;
    }
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={getModalTitle()}
      size="max-w-6xl"
      disableBackdropClose={state.isDirty}
    >
      <div className="h-[80vh] flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentView}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </FixedModal>
  );
}

// Self-contained button + modal component (manages its own state)
export function QuickStartModalV2Button({ className = '', onSuccess }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center">
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">QuickStart V2</span>
        </div>
      </button>

      <QuickStartModalV2
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
