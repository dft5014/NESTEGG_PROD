// OverviewView - Main institution-grouped validation view
import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Info, Sparkles, Target, Loader2 } from 'lucide-react';
import StatsHeader from '../components/StatsHeader';
import FilterBar, { QuickTipBanner } from '../components/FilterBar';
import InstitutionCard from '../components/InstitutionCard';
import {
  groupAccountsByInstitution,
  sortAccounts,
  calculateValidationStats,
  getValidationStatus,
  exportToCSV,
  parseImportCSV,
  TOLERANCE
} from '../utils/constants';
import { VIEWS } from '../state/reducer';
import toast from 'react-hot-toast';

export default function OverviewView({
  state,
  dispatch,
  actions,
  accounts,
  positions,
  isLoading = false, // Accept loading state as prop
  onRefresh,
  onOpenImportModal
}) {
  const [showTip, setShowTip] = useState(true);

  // Use passed loading state or fallback to state.isLoading
  const loading = isLoading || state.isLoading;

  // Group accounts by institution
  const accountsByInstitution = useMemo(() =>
    groupAccountsByInstitution(accounts),
    [accounts]
  );

  // Calculate summary stats
  const stats = useMemo(() =>
    calculateValidationStats(accounts, state.statementBalances, state.reconciliationStatus),
    [accounts, state.statementBalances, state.reconciliationStatus]
  );

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts = { all: accounts.length, pending: 0, matched: 0, discrepancy: 0, reconciled: 0 };

    accounts.forEach(acc => {
      const status = getValidationStatus(
        acc.totalValue || 0,
        state.statementBalances[acc.id],
        state.reconciliationStatus[acc.id]?.reconciled
      );
      if (status.key === 'pending') counts.pending++;
      else if (status.key === 'matched') counts.matched++;
      else if (status.key === 'reconciled') counts.reconciled++;
      else counts.discrepancy++;
    });

    return counts;
  }, [accounts, state.statementBalances, state.reconciliationStatus]);

  // Filter institutions based on search and filter
  const filteredInstitutions = useMemo(() => {
    let institutions = Array.from(accountsByInstitution.keys());

    // Search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      institutions = institutions.filter(inst =>
        inst.toLowerCase().includes(query)
      );
    }

    // Status filter - filter institutions that have matching accounts
    if (state.filter !== 'all') {
      institutions = institutions.filter(inst => {
        const instAccounts = accountsByInstitution.get(inst) || [];
        return instAccounts.some(acc => {
          const status = getValidationStatus(
            acc.totalValue || 0,
            state.statementBalances[acc.id],
            state.reconciliationStatus[acc.id]?.reconciled
          );
          if (state.filter === 'pending') return status.key === 'pending';
          if (state.filter === 'matched') return status.key === 'matched';
          if (state.filter === 'discrepancy') return status.key === 'minor_discrepancy' || status.key === 'major_discrepancy';
          if (state.filter === 'reconciled') return status.key === 'reconciled';
          return true;
        });
      });
    }

    // Sort institutions by total value
    institutions.sort((a, b) => {
      const aTotal = (accountsByInstitution.get(a) || []).reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
      const bTotal = (accountsByInstitution.get(b) || []).reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
      return bTotal - aTotal;
    });

    return institutions;
  }, [accountsByInstitution, state.searchQuery, state.filter, state.statementBalances, state.reconciliationStatus]);

  // Handlers
  const handleStatementChange = useCallback((accountId, value) => {
    dispatch(actions.setStatementBalance(accountId, value));
  }, [dispatch, actions]);

  const handleToggleReconciled = useCallback((accountId) => {
    dispatch(actions.toggleReconciled(accountId));
  }, [dispatch, actions]);

  const handleToggleExpand = useCallback((institution) => {
    dispatch(actions.toggleExpandInstitution(institution));
  }, [dispatch, actions]);

  const handleExpandAll = useCallback(() => {
    dispatch(actions.expandAllInstitutions());
  }, [dispatch, actions]);

  const handleCollapseAll = useCallback(() => {
    dispatch(actions.collapseAllInstitutions());
  }, [dispatch, actions]);

  const handleInvestigate = useCallback((account) => {
    dispatch(actions.setActiveAccount(account));
    dispatch(actions.setView(VIEWS.account));
  }, [dispatch, actions]);

  const handleImport = useCallback((account) => {
    onOpenImportModal(account);
  }, [onOpenImportModal]);

  const handleViewDetails = useCallback((institution) => {
    dispatch(actions.setActiveInstitution(institution));
    dispatch(actions.setView(VIEWS.institution));
  }, [dispatch, actions]);

  const handleExport = useCallback(() => {
    exportToCSV(accounts, state.statementBalances, state.reconciliationStatus, state.validationDate);
    toast.success('Exported validation data to CSV');
  }, [accounts, state.statementBalances, state.reconciliationStatus, state.validationDate]);

  const handleImportCSV = useCallback(async (file) => {
    try {
      const text = await file.text();
      const { balances, importCount } = parseImportCSV(text);
      dispatch(actions.setBulkStatementBalances(balances));
      dispatch(actions.expandAllInstitutions());
      toast.success(`Imported ${importCount} statement balances`);
    } catch (error) {
      toast.error(error.message || 'Failed to import CSV');
    }
  }, [dispatch, actions]);

  const handleToggleHideValues = useCallback(() => {
    dispatch(actions.setHideValues(!state.hideValues));
  }, [dispatch, actions, state.hideValues]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact Filter Bar - Fixed at top */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <FilterBar
          searchQuery={state.searchQuery}
          onSearchChange={(q) => dispatch(actions.setSearchQuery(q))}
          filter={state.filter}
          onFilterChange={(f) => dispatch(actions.setFilter(f))}
          sort={state.sort}
          onSortChange={(s) => dispatch(actions.setSort(s))}
          hideValues={state.hideValues}
          onToggleHideValues={handleToggleHideValues}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onExport={handleExport}
          onImportCSV={handleImportCSV}
          onRefresh={onRefresh}
          isLoading={loading}
          filterCounts={filterCounts}
        />
      </div>

      {/* Scrollable Content Area - Stats + Quick Tip + Institutions */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-950">
        {/* Stats Header - Now in scrollable area */}
        <div className="mb-4">
          <StatsHeader stats={stats} hideValues={state.hideValues} />
        </div>

        {/* Quick Tip - Now in scrollable area */}
        <AnimatePresence>
          {showTip && (
            <div className="mb-4">
              <QuickTipBanner onDismiss={() => setShowTip(false)} />
            </div>
          )}
        </AnimatePresence>

        {/* Institution Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading your accounts...</p>
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-16 h-16 text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">No institutions found</h3>
            <p className="text-sm text-gray-500">
              {state.searchQuery
                ? 'Try a different search term'
                : state.filter !== 'all'
                  ? 'No accounts match the selected filter'
                  : 'Add some accounts to get started'
              }
            </p>
            {state.searchQuery && (
              <button
                onClick={() => dispatch(actions.setSearchQuery(''))}
                className="mt-4 text-sm text-indigo-400 hover:text-indigo-300"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredInstitutions.map((institution) => (
                <InstitutionCard
                  key={institution}
                  institution={institution}
                  accounts={accountsByInstitution.get(institution) || []}
                  statementBalances={state.statementBalances}
                  reconciliationStatus={state.reconciliationStatus}
                  expanded={state.expandedInstitutions.has(institution)}
                  hideValues={state.hideValues}
                  onToggleExpand={handleToggleExpand}
                  onStatementChange={handleStatementChange}
                  onToggleReconciled={handleToggleReconciled}
                  onInvestigate={handleInvestigate}
                  onImport={handleImport}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Help Text */}
        {!loading && filteredInstitutions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 p-4 bg-gray-900/70 rounded-xl border border-gray-800"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-2">Pro Tips</h4>
                <ul className="text-xs text-gray-400 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Click an institution to expand and enter statement balances for each account
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Green = Match (&lt;$1 diff), Amber = Minor (&lt;$100), Red = Major (&gt;$100)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Click the import icon to validate an account against a brokerage statement file
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span>
                    Use Export → Fill in Excel → Import workflow for bulk entry
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
