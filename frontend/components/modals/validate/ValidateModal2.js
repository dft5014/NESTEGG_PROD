// ValidateModal2 - Enhanced Account Reconciliation Modal
// Modern, modular architecture with institution-grouped validation
import React, { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Target, Eye, EyeOff, CheckCircle, ArrowLeft,
  Keyboard, HelpCircle
} from 'lucide-react';
import FixedModal from '../FixedModal';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useDataStore } from '@/store/DataStore';
import toast from 'react-hot-toast';

// State Management
import { validateReducer, initialState, actions, VIEWS } from './state/reducer';

// Utils
import { calculateValidationStats, KEYBOARD_SHORTCUTS } from './utils/constants';

// Views
import OverviewView from './views/OverviewView';
import AccountDetailView from './views/AccountDetailView';

// ============================================================================
// KEYBOARD SHORTCUTS MODAL
// ============================================================================

function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-700 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          <div className="space-y-3">
            {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

function ProgressBar({ stats }) {
  const { totalAccounts, pendingAccounts, completionRate } = stats;
  const completed = totalAccounts - pendingAccounts;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Progress:</span>
        <span className="font-bold text-white">{completed}/{totalAccounts}</span>
      </div>
      <div className="flex-1 max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completionRate}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
        />
      </div>
      <span className="text-sm font-semibold text-white tabular-nums">
        {completionRate.toFixed(0)}%
      </span>
    </div>
  );
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export default function ValidateModal2({ isOpen, onClose }) {
  const [state, dispatch] = useReducer(validateReducer, initialState);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Data hooks
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: allPositions = [], loading: positionsLoading } = useDetailedPositions();
  const { markStale } = useDataStore();

  // Import modal state (for integration with AddStatementImportModal)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importAccount, setImportAccount] = useState(null);

  // Sync external data with state
  useEffect(() => {
    if (!accountsLoading) {
      dispatch(actions.setAccounts(accounts));
    }
  }, [accounts, accountsLoading]);

  useEffect(() => {
    if (!positionsLoading) {
      dispatch(actions.setPositions(allPositions));
    }
  }, [allPositions, positionsLoading]);

  useEffect(() => {
    dispatch(actions.setLoading(accountsLoading || positionsLoading));
  }, [accountsLoading, positionsLoading]);

  // Calculate summary stats
  const stats = useMemo(() =>
    calculateValidationStats(state.accounts, state.statementBalances, state.reconciliationStatus),
    [state.accounts, state.statementBalances, state.reconciliationStatus]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't capture if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Escape - go back or close
      if (e.key === 'Escape') {
        e.preventDefault();
        if (state.currentView !== VIEWS.overview) {
          dispatch(actions.goBack());
        } else {
          onClose?.();
        }
      }

      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('institution-search')?.focus();
      }

      // Cmd/Ctrl + E - Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        // Export handled in OverviewView
      }

      // ? - Show shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state.currentView, onClose]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    dispatch(actions.setLoading(true));
    await refreshAccounts();
    markStale('detailedPositions');
    toast.success('Data refreshed');
  }, [refreshAccounts, markStale]);

  const handleClose = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm(
        'You have unsaved validation data. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    dispatch(actions.resetAll());
    onClose?.();
  }, [state.isDirty, onClose]);

  const handleOpenImportModal = useCallback((account) => {
    setImportAccount(account);
    setImportModalOpen(true);
  }, []);

  const handleImportComplete = useCallback((results) => {
    if (results?.accountId && results?.statementBalance !== undefined) {
      dispatch(actions.setStatementBalance(results.accountId, results.statementBalance));
      toast.success('Statement imported successfully');
    }
    setImportModalOpen(false);
    setImportAccount(null);
  }, []);

  // Get modal title based on view
  const getModalTitle = () => {
    switch (state.currentView) {
      case VIEWS.overview:
        return 'Account Validation';
      case VIEWS.institution:
        return state.activeInstitution || 'Institution Details';
      case VIEWS.account:
        return state.activeAccount?.name || 'Account Details';
      case VIEWS.analysis:
        return 'Validation Analysis';
      default:
        return 'Account Validation';
    }
  };

  // Render current view
  const renderView = () => {
    switch (state.currentView) {
      case VIEWS.overview:
        return (
          <OverviewView
            state={state}
            dispatch={dispatch}
            actions={actions}
            accounts={state.accounts}
            positions={state.positions}
            onRefresh={handleRefresh}
            onOpenImportModal={handleOpenImportModal}
          />
        );
      case VIEWS.account:
        return (
          <AccountDetailView
            state={state}
            dispatch={dispatch}
            actions={actions}
            positions={state.positions}
            onOpenImportModal={handleOpenImportModal}
          />
        );
      default:
        return (
          <OverviewView
            state={state}
            dispatch={dispatch}
            actions={actions}
            accounts={state.accounts}
            positions={state.positions}
            onRefresh={handleRefresh}
            onOpenImportModal={handleOpenImportModal}
          />
        );
    }
  };

  return (
    <>
      <FixedModal
        isOpen={isOpen}
        onClose={handleClose}
        title={getModalTitle()}
        size="max-w-7xl"
        disableBackdropClose={state.isDirty}
      >
        <div className="h-[80vh] flex flex-col overflow-hidden -m-6">
          {/* Custom Header with Actions */}
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{getModalTitle()}</h2>
                <p className="text-xs text-gray-400">Reconcile your accounts with confidence</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Shortcuts help */}
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Keyboard shortcuts (?)"
              >
                <HelpCircle className="w-5 h-5 text-gray-400" />
              </button>
              {/* Hide values toggle */}
              <button
                onClick={() => dispatch(actions.setHideValues(!state.hideValues))}
                className={`p-2 rounded-lg transition-colors ${
                  state.hideValues ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-400'
                }`}
                title={state.hideValues ? 'Show values' : 'Hide values'}
              >
                {state.hideValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {/* View Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-900/70 border-t border-gray-800 flex items-center justify-between">
            <ProgressBar stats={stats} />
            <div className="flex items-center gap-3">
              {state.currentView !== VIEWS.overview && (
                <button
                  onClick={() => dispatch(actions.goBack())}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Done
              </button>
            </div>
          </div>
        </div>
      </FixedModal>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Import Statement Modal Integration */}
      {/* Note: You can integrate the AddStatementImportModal here */}
      {/* For now, this shows where the integration point would be */}
    </>
  );
}

// ============================================================================
// BUTTON EXPORT
// ============================================================================

export function ValidateButton2({ className = '', label = 'Validate V2' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 ${className}`}
        title="Validate accounts against statements (V2)"
      >
        <Target className="w-4 h-4" />
        <span>{label}</span>
      </button>

      <ValidateModal2
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
