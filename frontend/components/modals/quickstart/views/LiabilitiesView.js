// Liabilities View - Add and manage liabilities
import React, { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Check, Loader2, X, HelpCircle, Keyboard
} from 'lucide-react';
import DataTable from '../components/DataTable';
import StatsBar from '../components/StatsBar';
import { KeyboardShortcutsPanel, useKeyboardShortcuts } from '../components/KeyboardShortcuts';
import { LIABILITY_FIELDS, LIABILITY_TYPES } from '../utils/constants';
import { formatCurrency } from '@/utils/formatters';

export default function LiabilitiesView({
  state,
  dispatch,
  actions,
  institutions,
  liabilityTypes,
  onSubmitLiabilities,
  isSubmitting,
  goBack
}) {
  const liabilities = state.liabilities;
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Add new liability row
  const handleAddLiability = useCallback(() => {
    dispatch(actions.addLiability());
  }, [dispatch, actions]);

  // Update liability field
  const handleUpdateLiability = useCallback((id, data) => {
    dispatch(actions.updateLiability(id, data));
  }, [dispatch, actions]);

  // Delete liability
  const handleDeleteLiability = useCallback((id) => {
    dispatch(actions.deleteLiability(id));
  }, [dispatch, actions]);

  // Duplicate liability
  const handleDuplicateLiability = useCallback((id) => {
    dispatch(actions.duplicateLiability(id));
  }, [dispatch, actions]);

  // Toggle selection
  const handleToggleSelect = useCallback((id) => {
    dispatch(actions.toggleSelect(id));
  }, [dispatch, actions]);

  // Select/deselect all
  const handleSelectAll = useCallback((selectAll) => {
    liabilities.forEach(lib => {
      const isSelected = state.selectedIds.has(lib.id);
      if (selectAll && !isSelected) {
        dispatch(actions.toggleSelect(lib.id));
      } else if (!selectAll && isSelected) {
        dispatch(actions.toggleSelect(lib.id));
      }
    });
  }, [liabilities, state.selectedIds, dispatch, actions]);

  // Delete selected
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = liabilities
      .filter(lib => state.selectedIds.has(lib.id))
      .map(lib => lib.id);

    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected liability/liabilities?`
    );
    if (confirmed) {
      dispatch(actions.deleteSelected(selectedIds));
    }
  }, [liabilities, state.selectedIds, dispatch, actions]);

  // Clear all
  const handleClearAll = useCallback(() => {
    if (liabilities.length === 0) return;

    const confirmed = window.confirm(
      `Clear all ${liabilities.length} liability/liabilities?`
    );
    if (confirmed) {
      dispatch(actions.clearLiabilities());
    }
  }, [liabilities.length, dispatch, actions]);

  // Submit liabilities
  const handleSubmit = useCallback(async () => {
    await onSubmitLiabilities();
  }, [onSubmitLiabilities]);

  // Get filtered fields based on liability type
  const getFieldsForLiability = useCallback((liability) => {
    const liabilityType = LIABILITY_TYPES.find(t => t.value === liability.liability_type);

    return LIABILITY_FIELDS.filter(field => {
      // Always show non-conditional fields
      if (!field.conditional) return true;

      // Check conditional fields
      if (field.conditional === 'showCreditLimit') {
        return liabilityType?.showCreditLimit;
      }
      if (field.conditional === 'showOriginalAmount') {
        return liabilityType?.showOriginalAmount;
      }

      return true;
    });
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const total = liabilities.length;
    const ready = liabilities.filter(l =>
      l.name && l.liability_type && l.institution_name && l.current_balance && l.status !== 'added'
    ).length;

    let totalBalance = 0;
    let rateSum = 0;
    let rateCount = 0;

    liabilities.forEach(l => {
      totalBalance += parseFloat(l.current_balance) || 0;
      if (l.interest_rate) {
        rateSum += parseFloat(l.interest_rate);
        rateCount++;
      }
    });

    const avgRate = rateCount > 0 ? rateSum / rateCount : 0;

    return { total, ready, totalBalance, avgRate };
  }, [liabilities]);

  const selectedCount = liabilities.filter(lib => state.selectedIds.has(lib.id)).length;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    viewType: 'liabilities',
    onAddNew: handleAddLiability,
    onToggleHelp: () => dispatch(actions.toggleHelp()),
    onSubmit: () => stats.ready > 0 && handleSubmit(),
    onEscape: () => {
      if (state.showHelp) dispatch(actions.toggleHelp());
      if (selectedCount > 0) dispatch(actions.deselectAll());
    },
    showShortcuts,
    setShowShortcuts
  });

  // Group by type for summary
  const liabilitiesByType = useMemo(() => {
    return liabilities.reduce((acc, lib) => {
      const type = lib.liability_type || 'other';
      if (!acc[type]) acc[type] = { count: 0, total: 0 };
      acc[type].count++;
      acc[type].total += parseFloat(lib.current_balance) || 0;
      return acc;
    }, {});
  }, [liabilities]);

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
            <h2 className="text-xl font-bold text-white">Add Liabilities</h2>
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
              onClick={handleClearAll}
              disabled={liabilities.length === 0}
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
        {liabilities.length > 0 && (
          <StatsBar data={liabilities} type="liabilities" />
        )}

        {/* Type summary */}
        {liabilities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {LIABILITY_TYPES.map(type => {
              const typeData = liabilitiesByType[type.value];
              if (!typeData) return null;
              const Icon = type.icon;
              return (
                <div
                  key={type.value}
                  className="flex items-center px-2 py-1 bg-gray-800 rounded text-xs text-gray-300"
                >
                  <Icon className="w-3 h-3 mr-1.5 text-gray-400" />
                  {type.label}: {typeData.count} ({formatCurrency(typeData.total)})
                </div>
              );
            })}
          </div>
        )}

        {/* Keyboard shortcuts panel */}
        <KeyboardShortcutsPanel
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          viewType="liabilities"
        />

        {/* Help panel */}
        {state.showHelp && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-blue-300">
                <p className="font-semibold mb-1">How to Add Liabilities</p>
                <ul className="space-y-1 text-blue-400/80">
                  <li>Click "Add Liability" to create a new row</li>
                  <li>Select a type - additional fields will appear based on type</li>
                  <li>Credit cards show credit limit field</li>
                  <li>Loans show original amount field</li>
                  <li>Fill all required fields, then click "Save"</li>
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
            onClick={handleAddLiability}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Liability</span>
          </button>
        </div>

        {/* Data table */}
        <DataTable
          fields={LIABILITY_FIELDS.filter(f => !f.conditional)}
          rows={liabilities}
          selectedIds={state.selectedIds}
          onUpdate={handleUpdateLiability}
          onDelete={handleDeleteLiability}
          onDuplicate={handleDuplicateLiability}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          institutions={institutions}
          liabilityTypes={liabilityTypes}
          showCheckboxes={true}
          showActions={true}
          showStatus={true}
          emptyMessage="No liabilities yet. Click 'Add Liability' to get started."
        />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {liabilities.length > 0 && (
            <span>
              {stats.ready} of {stats.total} ready |
              Total balance: {formatCurrency(stats.totalBalance)}
              {stats.avgRate > 0 && ` | Avg rate: ${stats.avgRate.toFixed(1)}%`}
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
