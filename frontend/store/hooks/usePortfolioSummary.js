import { useMemo } from 'react';
import { useDataStore } from '../DataStore';

export const usePortfolioSummary = () => {
  const { state, actions } = useDataStore();
  const { portfolioSummary } = state;

  // Process and return all summary data
  const summaryData = useMemo(() => {
    if (!portfolioSummary.data) return null;

    return {
      // Core metrics
      netWorth: portfolioSummary.data.net_worth,
      totalAssets: portfolioSummary.data.total_assets,
      totalLiabilities: portfolioSummary.data.total_liabilities,
      liquidAssets: portfolioSummary.data.liquid_assets,
      otherAssets: portfolioSummary.data.other_assets,
      
      // Gains
      unrealizedGain: portfolioSummary.data.total_unrealized_gain,
      unrealizedGainPercent: portfolioSummary.data.total_unrealized_gain_percent,
      
      // Asset allocation
      assetAllocation: {
        securities: {
          value: portfolioSummary.data.security_value,
          percentage: portfolioSummary.data.security_mix,
          costBasis: portfolioSummary.data.security_cost_basis,
          gainLoss: portfolioSummary.data.security_gain_loss,
          gainLossPercent: portfolioSummary.data.security_gain_loss_percent,
          count: portfolioSummary.data.security_count,
        },
        cash: {
          value: portfolioSummary.data.cash_value,
          percentage: portfolioSummary.data.cash_mix,
          costBasis: portfolioSummary.data.cash_cost_basis,
          count: portfolioSummary.data.cash_count,
        },
        crypto: {
          value: portfolioSummary.data.crypto_value,
          percentage: portfolioSummary.data.crypto_mix,
          costBasis: portfolioSummary.data.crypto_cost_basis,
          gainLoss: portfolioSummary.data.crypto_gain_loss,
          gainLossPercent: portfolioSummary.data.crypto_gain_loss_percent,
          count: portfolioSummary.data.crypto_count,
        },
        metals: {
          value: portfolioSummary.data.metal_value,
          percentage: portfolioSummary.data.metal_mix,
          costBasis: portfolioSummary.data.metal_cost_basis,
          gainLoss: portfolioSummary.data.metal_gain_loss,
          gainLossPercent: portfolioSummary.data.metal_gain_loss_percent,
          count: portfolioSummary.data.metal_count,
        },
        other: {
          value: portfolioSummary.data.other_assets_value,
          percentage: portfolioSummary.data.other_assets_mix,
          costBasis: portfolioSummary.data.other_assets_cost_basis,
          gainLoss: portfolioSummary.data.other_assets_gain_loss,
          gainLossPercent: portfolioSummary.data.other_assets_gain_loss_percent,
          count: portfolioSummary.data.other_assets_count,
        },
      },
      
      // Period changes
      periodChanges: {
        '1d': {
          netWorth: portfolioSummary.data.net_worth_1d_change,
          netWorthPercent: portfolioSummary.data.net_worth_1d_change_pct,
          totalAssets: portfolioSummary.data.total_assets_1d_change,
          totalAssetsPercent: portfolioSummary.data.total_assets_1d_change_pct,
        },
        '1w': {
          netWorth: portfolioSummary.data.net_worth_1w_change,
          netWorthPercent: portfolioSummary.data.net_worth_1w_change_pct,
          totalAssets: portfolioSummary.data.total_assets_1w_change,
          totalAssetsPercent: portfolioSummary.data.total_assets_1w_change_pct,
        },
        '1m': {
          netWorth: portfolioSummary.data.net_worth_1m_change,
          netWorthPercent: portfolioSummary.data.net_worth_1m_change_pct,
          totalAssets: portfolioSummary.data.total_assets_1m_change,
          totalAssetsPercent: portfolioSummary.data.total_assets_1m_change_pct,
        },
        'ytd': {
          netWorth: portfolioSummary.data.net_worth_ytd_change,
          netWorthPercent: portfolioSummary.data.net_worth_ytd_change_pct,
          totalAssets: portfolioSummary.data.total_assets_ytd_change,
          totalAssetsPercent: portfolioSummary.data.total_assets_ytd_change_pct,
        },
        '1y': {
          netWorth: portfolioSummary.data.net_worth_1y_change,
          netWorthPercent: portfolioSummary.data.net_worth_1y_change_pct,
          totalAssets: portfolioSummary.data.total_assets_1y_change,
          totalAssetsPercent: portfolioSummary.data.total_assets_1y_change_pct,
        },
      },
      
      // Income
      annualIncome: portfolioSummary.data.annual_income,
      yieldPercentage: portfolioSummary.data.yield_percentage,
      
      // Raw data for custom processing
      raw: portfolioSummary.data,
    };
  }, [portfolioSummary.data]);

  return {
    // Processed summary
    summary: summaryData,
    
    // Rich JSON fields
    topPositions: portfolioSummary.topLiquidPositions,
    topPerformers: portfolioSummary.topPerformersAmount,
    topPerformersPercent: portfolioSummary.topPerformersPercent,
    accountDiversification: portfolioSummary.accountDiversification,
    assetPerformance: portfolioSummary.assetPerformanceDetail,
    sectorAllocation: portfolioSummary.sectorAllocation,
    institutionAllocation: portfolioSummary.institutionAllocation,
    riskMetrics: portfolioSummary.riskMetrics,
    concentrationMetrics: portfolioSummary.concentrationMetrics,
    dividendMetrics: portfolioSummary.dividendMetrics,
    
    // History for trends
    history: portfolioSummary.history,
    
    // Meta
    loading: portfolioSummary.loading,
    error: portfolioSummary.error,
    lastFetched: portfolioSummary.lastFetched,
    isStale: portfolioSummary.isStale,
    
    // Actions
    refresh: actions.refreshData,
    markStale: actions.markDataStale,
  };
};