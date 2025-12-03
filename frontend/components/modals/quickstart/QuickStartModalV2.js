// QuickStart Modal V2 - Unified Data Entry Modal
// A modern, clean interface for adding accounts, positions, and liabilities
import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
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

// Draft restore banner component
function DraftRestoreBanner({ draftInfo, onRestore, onDismiss }) {
  if (!draftInfo) return null;

  const { accountCount, positionCount, liabilityCount, savedAt } = draftInfo;
  const timeAgo = getTimeAgo(savedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4 p-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg border border-amber-600/40"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-amber-200 font-medium">You have an unsaved draft</p>
          <p className="text-sm text-gray-400 mt-1">
            Saved {timeAgo}: {' '}
            {[
              accountCount > 0 && `${accountCount} account${accountCount !== 1 ? 's' : ''}`,
              positionCount > 0 && `${positionCount} position${positionCount !== 1 ? 's' : ''}`,
              liabilityCount > 0 && `${liabilityCount} liabilit${liabilityCount !== 1 ? 'ies' : 'y'}`
            ].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Start Fresh
          </button>
          <button
            onClick={onRestore}
            className="px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
          >
            Restore Draft
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Helper to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const savedDate = new Date(date);
  const diffMs = now - savedDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return savedDate.toLocaleDateString();
}

export default function QuickStartModalV2({ isOpen, onClose, onSuccess, initialPositions = null }) {
  const [state, dispatch] = useReducer(quickStartReducer, initialState);
  const { markStale } = useDataStore();
  const hasSeededPositionsRef = React.useRef(false);

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
    onSuccess: async (type, items) => {
      // Mark relevant data as stale to trigger refresh
      if (type === 'accounts') {
        markStale('accounts');
        markStale('portfolioSummary');

        // Reload existing accounts so they're available for positions
        try {
          const accounts = await fetchAllAccounts();
          dispatch(actions.setExistingAccounts(accounts || []));
        } catch (error) {
          console.error('Failed to refresh accounts:', error);
        }
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

  const {
    restoreDraft,
    dismissDraft,
    clearDraft,
    hasDraft,
    hasPendingDraft,
    draftInfo
  } = useLocalPersistence({
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

  // Seed initial positions when provided (from UpdateModal grid)
  useEffect(() => {
    if (!isOpen || !initialPositions?.length || hasSeededPositionsRef.current) return;

    // Only seed once per modal open
    hasSeededPositionsRef.current = true;

    // Add each position from the seeded data
    initialPositions.forEach(pos => {
      const assetType = pos.assetType || 'security';

      // Map the seeded data to the position format expected by the reducer
      let positionData = {};

      if (assetType === 'security') {
        positionData = {
          account_id: pos.accountId,
          ticker: pos.ticker || pos.identifier, // Use ticker (symbol) for search/hydration
          name: pos.name || pos.ticker || pos.identifier,
          shares: pos.quantity,
          purchase_date: pos.purchaseDate,
          // cost_basis will need to be filled by user or fetched
        };
      } else if (assetType === 'crypto') {
        positionData = {
          account_id: pos.accountId,
          symbol: pos.ticker || pos.identifier, // Use ticker (symbol) for search/hydration
          name: pos.name || pos.ticker || pos.identifier,
          quantity: pos.quantity,
          purchase_date: pos.purchaseDate,
          // purchase_price will need to be filled by user
        };
      } else if (assetType === 'metal') {
        positionData = {
          account_id: pos.accountId,
          metal_type: pos.ticker || pos.identifier, // Metal type code
          quantity: pos.quantity,
          purchase_date: pos.purchaseDate,
          // purchase_price will need to be filled by user
        };
      }

      dispatch(actions.addPosition(assetType, positionData));
    });

    // Navigate to positions view
    dispatch(actions.setView(VIEWS.positions));
  }, [isOpen, initialPositions]);

  // Reset seeding ref when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasSeededPositionsRef.current = false;
    }
  }, [isOpen]);

  // Auto-hydrate prices when entering positions view (e.g., after import)
  const hasTriggeredHydrationRef = React.useRef(false);
  useEffect(() => {
    if (!isOpen || state.currentView !== VIEWS.positions) {
      hasTriggeredHydrationRef.current = false;
      return;
    }

    // Check if there are positions needing hydration
    const needsHydration = Object.entries(state.positions).some(([assetType, typePositions]) => {
      if (!Array.isArray(typePositions)) return false;
      return typePositions.some(pos => {
        if (pos.status === 'added' || pos.status === 'submitting') return false;
        if (assetType === 'security' && pos.data.ticker && !pos.data.price) return true;
        if (assetType === 'crypto' && pos.data.symbol && !pos.data.current_price) return true;
        if (assetType === 'metal' && pos.data.metal_type && !pos.data.current_price_per_unit) return true;
        return false;
      });
    });

    if (needsHydration && !hasTriggeredHydrationRef.current) {
      hasTriggeredHydrationRef.current = true;
      // Delay slightly to let the UI render first
      const timer = setTimeout(() => {
        hydrateAllPending();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, state.currentView, state.positions, hydrateAllPending]);

  // Note: We no longer auto-restore drafts. Instead, we show a banner
  // that lets the user choose to restore or start fresh.

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
        return <ImportView {...viewProps} importTarget={state.importTarget} />;
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
        {/* Draft restore banner - only show on welcome view */}
        <AnimatePresence>
          {hasPendingDraft && state.currentView === VIEWS.welcome && (
            <DraftRestoreBanner
              draftInfo={draftInfo}
              onRestore={restoreDraft}
              onDismiss={clearDraft}  // Clear draft entirely when starting fresh
            />
          )}
        </AnimatePresence>

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
export function QuickStartModalV2Button({ className = '', onSuccess, label = 'Add' }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center">
          <Plus className="w-4 h-4 mr-1.5 text-emerald-400 group-hover:text-white transition-colors" />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">{label}</span>
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
