import { useMemo, useEffect } from 'react';
import { useDataStore } from '../DataStore';

/**
 * Hook for accessing accounts summary positions data from rept_summary_accounts_positions
 * This provides detailed position data grouped by account and identifier with comprehensive historical trends
 */
export const useAccountsSummaryPositions = (accountId = null, assetType = null) => {
  const { state, actions } = useDataStore();
  const { accountsSummaryPositions } = state;
  const { fetchAccountsSummaryPositionsData, markAccountsSummaryPositionsStale } = actions;

  // Auto-fetch when filters change or when stale
  useEffect(() => {
    if (accountsSummaryPositions.isStale && !accountsSummaryPositions.loading) {
      console.log('[useAccountsSummaryPositions] Refreshing stale accounts summary positions');
      fetchAccountsSummaryPositionsData(accountId, assetType);
    }
  }, [accountsSummaryPositions.isStale, accountsSummaryPositions.loading, accountId, assetType, fetchAccountsSummaryPositionsData]);

  // Auto-fetch on mount if no data exists
  useEffect(() => {
    if (!accountsSummaryPositions.loading && !accountsSummaryPositions.lastFetched) {
      console.log('[useAccountsSummaryPositions] Initial fetch for accounts summary positions');
      fetchAccountsSummaryPositionsData(accountId, assetType);
    }
  }, []); // Run once on mount

  // Re-fetch when filters change (accountId or assetType)
  useEffect(() => {
    if (accountsSummaryPositions.lastFetched && (accountId || assetType)) {
      console.log('[useAccountsSummaryPositions] Filters changed, refetching with new parameters');
      fetchAccountsSummaryPositionsData(accountId, assetType, true); // Force refresh
    }
  }, [accountId, assetType]); // Only run when filters change

  // Process positions data with proper field mapping to camelCase
  const positions = useMemo(() => {
    if (!accountsSummaryPositions.data || !Array.isArray(accountsSummaryPositions.data)) return [];

    return accountsSummaryPositions.data.map(position => ({
      // Identifiers
      userId: position.user_id,
      accountId: position.inv_account_id,
      accountName: position.inv_account_name,
      accountType: position.inv_account_type,
      institution: position.institution,
      assetType: position.asset_type,
      identifier: position.identifier,
      name: position.name,

      // Core metrics
      positionCount: position.position_count,
      accountCount: position.account_count,
      totalQuantity: position.total_quantity,
      totalCurrentValue: position.total_current_value,
      totalCostBasis: position.total_cost_basis,
      totalGainLossAmt: position.total_gain_loss_amt,
      totalGainLossPct: position.total_gain_loss_pct,

      // Holding term breakdown
      longTermPositions: position.long_term_positions,
      shortTermPositions: position.short_term_positions,
      longTermValue: position.long_term_value,
      shortTermValue: position.short_term_value,
      longTermValuePct: position.long_term_value_pct,
      predominantHoldingTerm: position.predominant_holding_term,

      // Pricing
      weightedAvgPrice: position.weighted_avg_price,
      weightedAvgCost: position.weighted_avg_cost,
      latestPricePerUnit: position.latest_price_per_unit,

      // Income
      dividendRate: position.dividend_rate,
      dividendYield: position.dividend_yield,
      totalAnnualIncome: position.total_annual_income,

      // Dates
      earliestPurchaseDate: position.earliest_purchase_date,
      latestPurchaseDate: position.latest_purchase_date,
      avgPositionAgeDays: position.avg_position_age_days,
      snapshotDate: position.snapshot_date,
      earliestSnapshotDate: position.earliest_snapshot_date,

      // Allocation
      portfolioAllocationPct: position.portfolio_allocation_pct,
      accountAllocationPct: position.account_allocation_pct,

      // Sector/Industry (for securities)
      sector: position.sector,
      industry: position.industry,
      dataSource: position.data_source,

      // Timestamps
      lastUpdated: position.last_updated,
      priceLastUpdated: position.price_last_updated,

      // Lot details
      lotDetails: position.lot_details,

      // 1-day trends
      value1dAgo: position.value_1d_ago,
      quantity1dAgo: position.quantity_1d_ago,
      price1dAgo: position.price_1d_ago,
      value1dChange: position.value_1d_change,
      value1dChangePct: position.value_1d_change_pct,
      quantity1dChange: position.quantity_1d_change,
      quantity1dChangePct: position.quantity_1d_change_pct,
      gainLoss1dChange: position.gain_loss_1d_change,
      gainLoss1dChangePct: position.gain_loss_1d_change_pct,

      // 1-week trends
      value1wAgo: position.value_1w_ago,
      quantity1wAgo: position.quantity_1w_ago,
      price1wAgo: position.price_1w_ago,
      value1wChange: position.value_1w_change,
      value1wChangePct: position.value_1w_change_pct,
      quantity1wChange: position.quantity_1w_change,
      quantity1wChangePct: position.quantity_1w_change_pct,
      gainLoss1wChange: position.gain_loss_1w_change,
      gainLoss1wChangePct: position.gain_loss_1w_change_pct,

      // 1-month trends
      value1mAgo: position.value_1m_ago,
      quantity1mAgo: position.quantity_1m_ago,
      price1mAgo: position.price_1m_ago,
      value1mChange: position.value_1m_change,
      value1mChangePct: position.value_1m_change_pct,
      quantity1mChange: position.quantity_1m_change,
      quantity1mChangePct: position.quantity_1m_change_pct,
      gainLoss1mChange: position.gain_loss_1m_change,
      gainLoss1mChangePct: position.gain_loss_1m_change_pct,

      // 3-month trends
      value3mAgo: position.value_3m_ago,
      quantity3mAgo: position.quantity_3m_ago,
      price3mAgo: position.price_3m_ago,
      value3mChange: position.value_3m_change,
      value3mChangePct: position.value_3m_change_pct,
      quantity3mChange: position.quantity_3m_change,
      quantity3mChangePct: position.quantity_3m_change_pct,
      gainLoss3mChange: position.gain_loss_3m_change,
      gainLoss3mChangePct: position.gain_loss_3m_change_pct,

      // YTD trends
      valueYtdAgo: position.value_ytd_ago,
      quantityYtdAgo: position.quantity_ytd_ago,
      priceYtdAgo: position.price_ytd_ago,
      valueYtdChange: position.value_ytd_change,
      valueYtdChangePct: position.value_ytd_change_pct,
      quantityYtdChange: position.quantity_ytd_change,
      quantityYtdChangePct: position.quantity_ytd_change_pct,
      gainLossYtdChange: position.gain_loss_ytd_change,
      gainLossYtdChangePct: position.gain_loss_ytd_change_pct,

      // 1-year trends
      value1yAgo: position.value_1y_ago,
      quantity1yAgo: position.quantity_1y_ago,
      price1yAgo: position.price_1y_ago,
      value1yChange: position.value_1y_change,
      value1yChangePct: position.value_1y_change_pct,
      quantity1yChange: position.quantity_1y_change,
      quantity1yChangePct: position.quantity_1y_change_pct,
      gainLoss1yChange: position.gain_loss_1y_change,
      gainLoss1yChangePct: position.gain_loss_1y_change_pct,

      // 2-year trends
      value2yAgo: position.value_2y_ago,
      quantity2yAgo: position.quantity_2y_ago,
      price2yAgo: position.price_2y_ago,
      value2yChange: position.value_2y_change,
      value2yChangePct: position.value_2y_change_pct,
      quantity2yChange: position.quantity_2y_change,
      quantity2yChangePct: position.quantity_2y_change_pct,
      gainLoss2yChange: position.gain_loss_2y_change,
      gainLoss2yChangePct: position.gain_loss_2y_change_pct,

      // 3-year trends
      value3yAgo: position.value_3y_ago,
      quantity3yAgo: position.quantity_3y_ago,
      price3yAgo: position.price_3y_ago,
      value3yChange: position.value_3y_change,
      value3yChangePct: position.value_3y_change_pct,
      quantity3yChange: position.quantity_3y_change,
      quantity3yChangePct: position.quantity_3y_change_pct,
      gainLoss3yChange: position.gain_loss_3y_change,
      gainLoss3yChangePct: position.gain_loss_3y_change_pct,

      // 5-year trends
      value5yAgo: position.value_5y_ago,
      quantity5yAgo: position.quantity_5y_ago,
      price5yAgo: position.price_5y_ago,
      value5yChange: position.value_5y_change,
      value5yChangePct: position.value_5y_change_pct,
      quantity5yChange: position.quantity_5y_change,
      quantity5yChangePct: position.quantity_5y_change_pct,
      gainLoss5yChange: position.gain_loss_5y_change,
      gainLoss5yChangePct: position.gain_loss_5y_change_pct,

      // Max trends (since earliest snapshot)
      valueMaxAgo: position.value_max_ago,
      quantityMaxAgo: position.quantity_max_ago,
      priceMaxAgo: position.price_max_ago,
      valueMaxChange: position.value_max_change,
      valueMaxChangePct: position.value_max_change_pct,
      quantityMaxChange: position.quantity_max_change,
      quantityMaxChangePct: position.quantity_max_change_pct,
      gainLossMaxChange: position.gain_loss_max_change,
      gainLossMaxChangePct: position.gain_loss_max_change_pct,

      // Keep raw data for direct access
      ...position
    }));
  }, [accountsSummaryPositions.data]);

  // Process summary with calculations
  const summary = useMemo(() => {
    if (!accountsSummaryPositions.summary) return {
      total_positions: 0,
      total_accounts: 0,
      total_value: 0,
      total_cost_basis: 0,
      total_gain_loss: 0,
      total_gain_loss_pct: 0,
      total_annual_income: 0,
      long_term_value: 0,
      short_term_value: 0,
      asset_type_breakdown: {},
      account_breakdown: {}
    };

    return {
      totalPositions: accountsSummaryPositions.summary.total_positions,
      totalAccounts: accountsSummaryPositions.summary.total_accounts,
      totalValue: accountsSummaryPositions.summary.total_value,
      totalCostBasis: accountsSummaryPositions.summary.total_cost_basis,
      totalGainLoss: accountsSummaryPositions.summary.total_gain_loss,
      totalGainLossPct: accountsSummaryPositions.summary.total_gain_loss_pct,
      totalAnnualIncome: accountsSummaryPositions.summary.total_annual_income,
      snapshotDate: accountsSummaryPositions.summary.snapshot_date,
      longTermValue: accountsSummaryPositions.summary.long_term_value,
      shortTermValue: accountsSummaryPositions.summary.short_term_value,
      assetTypeBreakdown: accountsSummaryPositions.summary.asset_type_breakdown || {},
      accountBreakdown: accountsSummaryPositions.summary.account_breakdown || {}
    };
  }, [accountsSummaryPositions.summary]);

  // Calculate additional metrics for analysis
  const metrics = useMemo(() => {
    if (!positions.length) return {
      topPerformers: [],
      underperformers: [],
      highestIncome: [],
      recentActivity: [],
      byAccount: {},
      byAssetType: {},
      bySector: {}
    };

    // Top performers by gain %
    const sortedByGain = [...positions]
      .filter(p => p.totalGainLossPct !== null && p.totalGainLossPct !== undefined)
      .sort((a, b) => (b.totalGainLossPct || 0) - (a.totalGainLossPct || 0));

    const topPerformers = sortedByGain.slice(0, 10);
    const underperformers = sortedByGain.slice(-10).reverse();

    // Highest income generators
    const highestIncome = [...positions]
      .filter(p => p.totalAnnualIncome && p.totalAnnualIncome > 0)
      .sort((a, b) => (b.totalAnnualIncome || 0) - (a.totalAnnualIncome || 0))
      .slice(0, 10);

    // Recent activity (positions with quantity changes in last day)
    const recentActivity = positions
      .filter(p => Math.abs(p.quantity1dChange || 0) > 0.001)
      .sort((a, b) => Math.abs(b.quantity1dChangePct || 0) - Math.abs(a.quantity1dChangePct || 0));

    // Group by account
    const byAccount = positions.reduce((acc, p) => {
      const key = p.accountId || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          accountName: p.accountName,
          accountType: p.accountType,
          institution: p.institution,
          value: 0,
          costBasis: 0,
          gainLoss: 0,
          annualIncome: 0,
          count: 0,
          positions: []
        };
      }
      acc[key].value += p.totalCurrentValue || 0;
      acc[key].costBasis += p.totalCostBasis || 0;
      acc[key].gainLoss += p.totalGainLossAmt || 0;
      acc[key].annualIncome += p.totalAnnualIncome || 0;
      acc[key].count += 1;
      acc[key].positions.push(p);
      return acc;
    }, {});

    // Group by asset type
    const byAssetType = positions.reduce((acc, p) => {
      const key = p.assetType || 'Unknown';
      if (!acc[key]) {
        acc[key] = { value: 0, costBasis: 0, gainLoss: 0, count: 0 };
      }
      acc[key].value += p.totalCurrentValue || 0;
      acc[key].costBasis += p.totalCostBasis || 0;
      acc[key].gainLoss += p.totalGainLossAmt || 0;
      acc[key].count += 1;
      return acc;
    }, {});

    // Group by sector (for securities)
    const bySector = positions.reduce((acc, p) => {
      if (!p.sector) return acc;
      const key = p.sector;
      if (!acc[key]) {
        acc[key] = { value: 0, costBasis: 0, gainLoss: 0, count: 0 };
      }
      acc[key].value += p.totalCurrentValue || 0;
      acc[key].costBasis += p.totalCostBasis || 0;
      acc[key].gainLoss += p.totalGainLossAmt || 0;
      acc[key].count += 1;
      return acc;
    }, {});

    return {
      topPerformers,
      underperformers,
      highestIncome,
      recentActivity,
      byAccount,
      byAssetType,
      bySector
    };
  }, [positions]);

  return {
    positions,
    summary,
    metrics,
    loading: accountsSummaryPositions.loading,
    error: accountsSummaryPositions.error,
    lastFetched: accountsSummaryPositions.lastFetched,
    isStale: accountsSummaryPositions.isStale,
    refresh: (accId = null, assetType = null) => fetchAccountsSummaryPositionsData(accId || accountId, assetType, true),
    markStale: () => markAccountsSummaryPositionsStale()
  };
};
