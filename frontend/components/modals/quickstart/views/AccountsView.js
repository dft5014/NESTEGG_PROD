// Accounts View - Add and manage accounts
import React, { useCallback } from 'react';
import {
  ArrowLeft, Plus, Trash2, Check, Loader2,
  Upload, Download, FileSpreadsheet, HelpCircle, X
} from 'lucide-react';
import DataTable from '../components/DataTable';
import StatsBar from '../components/StatsBar';
import { VIEWS, ACCOUNT_FIELDS, ACCOUNT_CATEGORIES, ACCOUNT_TYPES_BY_CATEGORY } from '../utils/constants';

export default function AccountsView({
  state,
  dispatch,
  actions,
  institutions,
  goToView,
  goBack,
  onSubmitAccounts,
  isSubmitting
}) {
  const accounts = state.accounts;

  // Add new account row
  const handleAddAccount = useCallback(() => {
    dispatch(actions.addAccount());
  }, [dispatch, actions]);

  // Update account field
  const handleUpdateAccount = useCallback((id, data) => {
    dispatch(actions.updateAccount(id, data));
  }, [dispatch, actions]);

  // Delete account
  const handleDeleteAccount = useCallback((id) => {
    dispatch(actions.deleteAccount(id));
  }, [dispatch, actions]);

  // Duplicate account
  const handleDuplicateAccount = useCallback((id) => {
    dispatch(actions.duplicateAccount(id));
  }, [dispatch, actions]);

  // Toggle selection
  const handleToggleSelect = useCallback((id) => {
    dispatch(actions.toggleSelect(id));
  }, [dispatch, actions]);

  // Select/deselect all
  const handleSelectAll = useCallback((selectAll) => {
    if (selectAll) {
      accounts.forEach(acc => {
        if (!state.selectedIds.has(acc.id)) {
          dispatch(actions.toggleSelect(acc.id));
        }
      });
    } else {
      accounts.forEach(acc => {
        if (state.selectedIds.has(acc.id)) {
          dispatch(actions.toggleSelect(acc.id));
        }
      });
    }
  }, [accounts, state.selectedIds, dispatch, actions]);

  // Delete selected
  const handleDeleteSelected = useCallback(() => {
    const selectedAccountIds = accounts
      .filter(acc => state.selectedIds.has(acc.id))
      .map(acc => acc.id);

    if (selectedAccountIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedAccountIds.length} selected account(s)?`
    );
    if (confirmed) {
      dispatch(actions.deleteSelected(selectedAccountIds));
    }
  }, [accounts, state.selectedIds, dispatch, actions]);

  // Clear all
  const handleClearAll = useCallback(() => {
    if (accounts.length === 0) return;

    const confirmed = window.confirm(
      `Clear all ${accounts.length} account(s)? This won't affect already saved accounts.`
    );
    if (confirmed) {
      dispatch(actions.clearAccounts());
    }
  }, [accounts.length, dispatch, actions]);

  // Submit accounts
  const handleSubmit = useCallback(async () => {
    await onSubmitAccounts();
  }, [onSubmitAccounts]);

  // Download template
  const downloadTemplate = useCallback(() => {
    const headers = ['Account Name', 'Institution', 'Account Category', 'Account Type'];
    const sampleRows = [
      ['My Retirement', 'Fidelity', 'retirement', '401k'],
      ['Trading Account', 'TD Ameritrade', 'investment', 'brokerage'],
      ['Savings', 'Chase', 'cash', 'savings']
    ];

    const csv = [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nestegg-accounts-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Count ready accounts
  const readyCount = accounts.filter(a =>
    a.accountName && a.institution && a.accountCategory && a.accountType && a.status !== 'added'
  ).length;

  const selectedCount = accounts.filter(acc => state.selectedIds.has(acc.id)).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 space-y-4">
        {/* Top row - navigation and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white">Add Accounts</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadTemplate}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Template</span>
            </button>

            <button
              onClick={() => goToView(VIEWS.import)}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center space-x-1.5 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={accounts.length === 0}
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
              onClick={handleSubmit}
              disabled={isSubmitting || readyCount === 0}
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
                  <span>Save {readyCount > 0 ? `(${readyCount})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {accounts.length > 0 && (
          <StatsBar data={accounts} type="accounts" />
        )}

        {/* Help panel */}
        {state.showHelp && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-blue-300">
                <p className="font-semibold mb-1">How to Add Accounts</p>
                <ul className="space-y-1 text-blue-400/80">
                  <li>Click "Add Account" to create a new row</li>
                  <li>Fill in all required fields (marked with *)</li>
                  <li>Status changes from Draft to Ready when complete</li>
                  <li>Use Tab to move between fields quickly</li>
                  <li>Click "Save" to add all ready accounts</li>
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
      <div className="flex-1 overflow-auto p-4">
        {/* Add button */}
        <div className="mb-4">
          <button
            onClick={handleAddAccount}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>

        {/* Data table */}
        <DataTable
          fields={ACCOUNT_FIELDS}
          rows={accounts}
          selectedIds={state.selectedIds}
          onUpdate={handleUpdateAccount}
          onDelete={handleDeleteAccount}
          onDuplicate={handleDuplicateAccount}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          institutions={institutions}
          accountCategories={ACCOUNT_CATEGORIES}
          accountTypesByCategory={ACCOUNT_TYPES_BY_CATEGORY}
          showCheckboxes={true}
          showActions={true}
          showStatus={true}
          emptyMessage="No accounts yet. Click 'Add Account' to get started."
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {accounts.length > 0 && (
            <span>
              {readyCount} of {accounts.length} account{accounts.length !== 1 ? 's' : ''} ready to save
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
          {readyCount > 0 && (
            <button
              onClick={() => goToView(VIEWS.positions)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2 transition-colors"
            >
              <span>Continue to Positions</span>
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
