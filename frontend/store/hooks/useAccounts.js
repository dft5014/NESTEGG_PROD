import { useMemo, useEffect } from 'react';
import { useDataStore } from '../DataStore';

export const useAccounts = () => {
  const { state, actions } = useDataStore();
  const { accounts } = state;

  // Fallback: Retry if data is stale or in error state
  // (DataStore handles initial fetch in Phase 1, this is recovery only)
  useEffect(() => {
    if ((accounts?.isStale || accounts?.error) && !accounts?.loading) {
      console.log('[useAccounts] Refetching due to stale/error state');
      actions.fetchAccountsData();
    }
  }, [accounts?.isStale, accounts?.error, accounts?.loading, actions]);

  // Process accounts data
  const processedAccounts = useMemo(() => {
    if (!accounts.data) return [];

    return accounts.data.map(account => ({
      // Core fields
      id: account.account_id,
      name: account.account_name,
      institution: account.institution,
      type: account.account_type,
      category: account.account_category,
      
      // Values
      totalValue: account.total_value,
      totalCostBasis: account.total_cost_basis,
      cashBalance: account.cash_balance,
      totalGainLoss: account.total_gain_loss,
      totalGainLossPercent: account.total_gain_loss_percent,
      
      // Asset breakdown
      securityValue: account.security_value,
      cryptoValue: account.crypto_value,
      cashValue: account.cash_value,
      metalValue: account.metal_value,
      otherAssetsValue: account.other_assets_value,
      
      // Position counts
      totalPositions: account.total_positions,
      securityPositions: account.security_positions,
      cryptoPositions: account.crypto_positions,
      cashPositions: account.cash_positions,
      metalPositions: account.metal_positions,
      otherPositions: account.other_positions,
      
      // Performance
      value1dChange: account.value_1d_change,
      value1dChangePct: account.value_1d_change_pct,
      value1wChange: account.value_1w_change,
      value1wChangePct: account.value_1w_change_pct,
      value1mChange: account.value_1m_change,
      value1mChangePct: account.value_1m_change_pct,
      value3mChange: account.value_3m_change,
      value3mChangePct: account.value_3m_change_pct,
      valueYtdChange: account.value_ytd_change,
      valueYtdChangePct: account.value_ytd_change_pct,
      value1yChange: account.value_1y_change,
      value1yChangePct: account.value_1y_change_pct,
      
      // Additional metrics
      liquidValue: account.liquid_value,
      illiquidValue: account.illiquid_value,
      allocationPercent: account.allocation_percent,
      yieldPercent: account.yield_percent,
      dividendIncomeAnnual: account.dividend_income_annual,
      
      // Metadata
      lastUpdated: account.as_of_timestamp,
      snapshotDate: account.snapshot_date
    }));
  }, [accounts.data]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    if (!accounts.summary) return null;

    return {
      totalAccounts: accounts.summary.total_accounts,
      totalPortfolioValue: accounts.summary.total_portfolio_value,
      snapshotDate: accounts.summary.snapshot_date
    };
  }, [accounts.summary]);

  return {
    accounts: Array.isArray(processedAccounts) ? processedAccounts : [],
    summary: summaryMetrics || null,
    history: accounts?.history || {}, // Account history indexed by account_id
    loading: Boolean(accounts?.loading),
    error: accounts?.error || null,
    lastFetched: accounts?.lastFetched || null,
    isStale: Boolean(accounts?.isStale),
    refresh: actions.refreshAccounts,
    markStale: actions.markAccountsStale
  };
};