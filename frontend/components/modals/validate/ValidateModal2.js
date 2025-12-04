// ValidateModal2 - Enhanced Account Reconciliation Modal
// Modern, modular architecture with institution-grouped validation
import React, { useReducer, useEffect, useCallback, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Target, Eye, EyeOff, CheckCircle, ArrowLeft,
  Keyboard, HelpCircle, BookOpen, FileSpreadsheet, MousePointer,
  Upload, Download, Shield, AlertTriangle, Search
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
// CUSTOM HEADER FOR FIXEDMODAL
// ============================================================================

function ValidateModalHeader({ state, dispatch, actions, onShowShortcuts, onShowInstructions, onClose }) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white leading-tight">Account Validation</h2>
          <p className="text-xs text-gray-400">Reconcile your accounts with confidence</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Instructions */}
        <button
          onClick={onShowInstructions}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="How to use"
        >
          <BookOpen className="w-5 h-5 text-gray-400" />
        </button>
        {/* Keyboard shortcuts */}
        <button
          onClick={onShowShortcuts}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-5 h-5 text-gray-400" />
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors ml-1"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// OVERLAY MODAL (Portal-based for proper z-index stacking)
// ============================================================================

function OverlayModal({ isOpen, onClose, title, icon: Icon, children, maxWidth = 'max-w-md' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-gray-900 rounded-2xl shadow-2xl ${maxWidth} w-full border border-gray-700 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-indigo-400" />}
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ============================================================================
// KEYBOARD SHORTCUTS MODAL
// ============================================================================

function KeyboardShortcutsModal({ isOpen, onClose }) {
  return (
    <OverlayModal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" icon={Keyboard}>
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
    </OverlayModal>
  );
}

// ============================================================================
// INSTRUCTIONS MODAL
// ============================================================================

function InstructionsModal({ isOpen, onClose }) {
  const instructions = [
    {
      icon: MousePointer,
      title: 'Click to Expand',
      description: 'Click on any institution card to expand it and see all accounts. Click again to collapse.'
    },
    {
      icon: FileSpreadsheet,
      title: 'Enter Statement Balances',
      description: 'For each account, enter the balance shown on your statement. The system will compare it with NestEgg\'s calculated value.'
    },
    {
      icon: Search,
      title: 'Search & Filter',
      description: 'Use the search bar to find specific institutions. Filter by status (Pending, Matched, Discrepancies, Reconciled).'
    },
    {
      icon: Download,
      title: 'Export to CSV',
      description: 'Export all accounts to a CSV file. Fill in statement balances in Excel, then import back for bulk entry.'
    },
    {
      icon: Upload,
      title: 'Import CSV',
      description: 'Import a CSV file with statement balances to populate multiple accounts at once.'
    },
    {
      icon: Shield,
      title: 'Mark as Reconciled',
      description: 'Once you\'ve verified an account matches (or investigated a discrepancy), mark it as reconciled with the checkmark button.'
    },
    {
      icon: AlertTriangle,
      title: 'Investigate Discrepancies',
      description: 'Click the magnifying glass on any account to drill down and see position-level details to identify mismatches.'
    }
  ];

  const statusLegend = [
    { color: 'bg-gray-500', label: 'Pending', description: 'No statement balance entered yet' },
    { color: 'bg-emerald-500', label: 'Matched', description: 'Difference is less than $1' },
    { color: 'bg-amber-500', label: 'Minor Discrepancy', description: 'Difference is $1 - $100' },
    { color: 'bg-rose-500', label: 'Major Discrepancy', description: 'Difference is greater than $100' },
    { color: 'bg-indigo-500', label: 'Reconciled', description: 'Manually marked as verified' }
  ];

  return (
    <OverlayModal isOpen={isOpen} onClose={onClose} title="How to Use" icon={BookOpen} maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Overview */}
        <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <p className="text-sm text-indigo-300">
            <strong>Account Validation</strong> helps you reconcile your NestEgg portfolio with your actual brokerage statements.
            Compare balances, identify discrepancies, and ensure your data is accurate.
          </p>
        </div>

        {/* Instructions */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Step-by-Step Guide</h4>
          <div className="space-y-3">
            {instructions.map((item, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="p-2 bg-gray-700 rounded-lg h-fit">
                  <item.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-white">{item.title}</h5>
                  <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Legend */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Status Colors</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {statusLegend.map((status, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${status.color}`} />
                <div>
                  <span className="text-sm font-medium text-white">{status.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{status.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Tips */}
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <h4 className="text-sm font-semibold text-white mb-2">💡 Pro Tips</h4>
          <ul className="text-xs text-gray-400 space-y-1.5">
            <li>• Use <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Cmd/Ctrl + K</kbd> to quickly focus the search bar</li>
            <li>• Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">?</kbd> to view keyboard shortcuts</li>
            <li>• Export → Fill in Excel → Import is the fastest way to enter multiple balances</li>
            <li>• Click the eye icon to hide/show sensitive dollar amounts</li>
          </ul>
        </div>
      </div>
    </OverlayModal>
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
  const [showInstructions, setShowInstructions] = useState(false);

  // Data hooks - Use directly from DataStore like the old modal does
  // This ensures data is always fresh when modal opens
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: allPositions = [], loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();
  const { markStale } = useDataStore();

  // Import modal state (for integration with AddStatementImportModal)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importAccount, setImportAccount] = useState(null);

  // Derive loading state - don't copy to reducer
  const isLoading = accountsLoading || positionsLoading;

  // Calculate summary stats - use accounts directly from DataStore
  const stats = useMemo(() =>
    calculateValidationStats(accounts, state.statementBalances, state.reconciliationStatus),
    [accounts, state.statementBalances, state.reconciliationStatus]
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
    await Promise.all([
      refreshAccounts(),
      refreshPositions?.()
    ]);
    markStale('detailedPositions');
    toast.success('Data refreshed');
  }, [refreshAccounts, refreshPositions, markStale]);

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

  // Render current view - pass accounts/positions directly from DataStore hooks
  const renderView = () => {
    switch (state.currentView) {
      case VIEWS.overview:
        return (
          <OverviewView
            state={state}
            dispatch={dispatch}
            actions={actions}
            accounts={accounts}
            positions={allPositions}
            isLoading={isLoading}
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
            positions={allPositions}
            onOpenImportModal={handleOpenImportModal}
          />
        );
      default:
        return (
          <OverviewView
            state={state}
            dispatch={dispatch}
            actions={actions}
            accounts={accounts}
            positions={allPositions}
            isLoading={isLoading}
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
        customHeader={true}
        title={
          <ValidateModalHeader
            state={state}
            dispatch={dispatch}
            actions={actions}
            onShowShortcuts={() => setShowShortcuts(true)}
            onShowInstructions={() => setShowInstructions(true)}
            onClose={handleClose}
          />
        }
        size="max-w-7xl"
        disableBackdropClose={state.isDirty}
      >
        {/* Main content container - uses FixedModal's p-6 padding for edge spacing */}
        <div className="h-[75vh] flex flex-col overflow-hidden">
          {/* View Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentView}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-1 overflow-hidden flex flex-col border border-gray-800 bg-gray-900/30"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>

          {/* Footer - Progress bar and actions */}
          <div className="pt-4 flex items-center justify-between flex-shrink-0">
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
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-lg"
              >
                <CheckCircle className="w-4 h-4" />
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

      {/* Instructions Modal */}
      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
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
