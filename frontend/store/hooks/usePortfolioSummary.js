// store/hooks/usePortfolioSummary.js
import { useMemo } from 'react';
import { useDataStore } from '../DataStore';

export const usePortfolioSummary = () => {
  const { state, actions } = useDataStore();
  const { portfolioSummary } = state;

  // Process and return all summary data
  const summaryData = useMemo(() => {
    if (!portfolioSummary.data) return null;

    return {
      // Core Financial Metrics
      netWorth: parseFloat(portfolioSummary.data.net_worth) || 0,
      totalAssets: parseFloat(portfolioSummary.data.total_assets) || 0,
      totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities) || 0,
      liquidAssets: parseFloat(portfolioSummary.data.liquid_assets) || 0,
      otherAssets: parseFloat(portfolioSummary.data.other_assets) || 0,
      
      // Cost Basis
      totalCostBasis: parseFloat(portfolioSummary.data.total_cost_basis) || 0,
      liquidCostBasis: parseFloat(portfolioSummary.data.liquid_cost_basis) || 0,
      otherAssetsCostBasis: parseFloat(portfolioSummary.data.other_assets_cost_basis) || 0,
      
      // Alternative Net Worth Components
      altNetWorth: {
        realEstate: parseFloat(portfolioSummary.data.alt_net_worth_value_real_estate) || 0,
        netCash: parseFloat(portfolioSummary.data.alt_net_worth_net_cash_value) || 0,
        netOtherAssets: parseFloat(portfolioSummary.data.alt_net_worth_net_other_assets) || 0,
      },
      
      // Gains
      unrealizedGain: parseFloat(portfolioSummary.data.total_unrealized_gain) || 0,
      unrealizedGainPercent: parseFloat(portfolioSummary.data.total_unrealized_gain_percent) || 0,
      liquidUnrealizedGain: parseFloat(portfolioSummary.data.liquid_unrealized_gain) || 0,
      liquidUnrealizedGainPercent: parseFloat(portfolioSummary.data.liquid_unrealized_gain_percent) || 0,
      
      // Asset Classes with Full Details
      assetAllocation: {
        securities: {
          value: parseFloat(portfolioSummary.data.security_value) || 0,
          percentage: parseFloat(portfolioSummary.data.security_mix) || 0,
          costBasis: parseFloat(portfolioSummary.data.security_cost_basis) || 0,
          gainLoss: parseFloat(portfolioSummary.data.security_gain_loss) || 0,
          gainLossPercent: parseFloat(portfolioSummary.data.security_gain_loss_percent) || 0,
          count: portfolioSummary.data.security_count || 0,
          annualIncome: parseFloat(portfolioSummary.data.security_annual_income) || 0,
        },
        cash: {
          value: parseFloat(portfolioSummary.data.cash_value) || 0,
          percentage: parseFloat(portfolioSummary.data.cash_mix) || 0,
          costBasis: parseFloat(portfolioSummary.data.cash_cost_basis) || 0,
          count: portfolioSummary.data.cash_count || 0,
        },
        crypto: {
          value: parseFloat(portfolioSummary.data.crypto_value) || 0,
          percentage: parseFloat(portfolioSummary.data.crypto_mix) || 0,
          costBasis: parseFloat(portfolioSummary.data.crypto_cost_basis) || 0,
          gainLoss: parseFloat(portfolioSummary.data.crypto_gain_loss) || 0,
          gainLossPercent: parseFloat(portfolioSummary.data.crypto_gain_loss_percent) || 0,
          count: portfolioSummary.data.crypto_count || 0,
        },
        metals: {
          value: parseFloat(portfolioSummary.data.metal_value) || 0,
          percentage: parseFloat(portfolioSummary.data.metal_mix) || 0,
          costBasis: parseFloat(portfolioSummary.data.metal_cost_basis) || 0,
          gainLoss: parseFloat(portfolioSummary.data.metal_gain_loss) || 0,
          gainLossPercent: parseFloat(portfolioSummary.data.metal_gain_loss_percent) || 0,
          count: portfolioSummary.data.metal_count || 0,
        },
        otherAssets: {
          value: parseFloat(portfolioSummary.data.other_assets_value) || 0,
          percentage: parseFloat(portfolioSummary.data.other_assets_mix) || 0,
          costBasis: parseFloat(portfolioSummary.data.other_assets_cost_basis) || 0,
          gainLoss: parseFloat(portfolioSummary.data.other_assets_gain_loss) || 0,
          gainLossPercent: parseFloat(portfolioSummary.data.other_assets_gain_loss_percent) || 0,
          count: portfolioSummary.data.other_assets_count || 0,
          annualIncome: parseFloat(portfolioSummary.data.other_assets_annual_income) || 0,
        },
      },
      
      // Net Worth Mix (using nw_ fields)
      netWorthMix: {
        securities: parseFloat(portfolioSummary.data.nw_securities_mix) || 0,
        crypto: parseFloat(portfolioSummary.data.nw_crypto_mix) || 0,
        metals: parseFloat(portfolioSummary.data.nw_metals_mix) || 0,
        netCash: parseFloat(portfolioSummary.data.nw_net_cash_mix) || 0,
        realEstateEquity: parseFloat(portfolioSummary.data.nw_real_estate_equity_mix) || 0,
        netOtherAssets: parseFloat(portfolioSummary.data.nw_net_other_assets_mix) || 0,
      },
      
      // Liability Breakdown
      liabilities: {
        total: parseFloat(portfolioSummary.data.total_liabilities) || 0,
        mortgage: parseFloat(portfolioSummary.data.mortgage_liabilities) || 0,
        creditCard: parseFloat(portfolioSummary.data.credit_card_liabilities) || 0,
        loan: parseFloat(portfolioSummary.data.loan_liabilities) || 0,
        other: parseFloat(portfolioSummary.data.other_liabilities_value) || 0,
        counts: {
          total: portfolioSummary.data.liability_count || 0,
          mortgage: portfolioSummary.data.mortgage_count || 0,
          creditCard: portfolioSummary.data.credit_card_count || 0,
          loan: portfolioSummary.data.loan_count || 0,
          other: portfolioSummary.data.other_liabilities_count || 0,
        },
      },
      
      // Period Changes - Complete Set
      periodChanges: {
        '1d': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_1d_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_1d_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_1d_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_1d_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_1d_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_1d_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_1d_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_1d_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_1d_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_1d_change_pct) || 0,
        },
        '1w': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_1w_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_1w_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_1w_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_1w_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_1w_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_1w_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_1w_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_1w_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_1w_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_1w_change_pct) || 0,
        },
        '1m': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_1m_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_1m_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_1m_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_1m_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_1m_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_1m_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_1m_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_1m_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_1m_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_1m_change_pct) || 0,
        },
        '3m': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_3m_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_3m_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_3m_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_3m_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_3m_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_3m_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_3m_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_3m_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_3m_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_3m_change_pct) || 0,
        },
        'ytd': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_ytd_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_ytd_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_ytd_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_ytd_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_ytd_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_ytd_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_ytd_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_ytd_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_ytd_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_ytd_change_pct) || 0,
        },
        '1y': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_1y_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_1y_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_1y_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_1y_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_1y_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_1y_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_1y_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_1y_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_1y_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_1y_change_pct) || 0,
        },
        '2y': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_2y_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_2y_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_2y_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_2y_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_2y_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_2y_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_2y_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_2y_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_2y_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_2y_change_pct) || 0,
        },
        '3y': {
          netWorth: parseFloat(portfolioSummary.data.net_worth_3y_change) || 0,
          netWorthPercent: parseFloat(portfolioSummary.data.net_worth_3y_change_pct) || 0,
          totalAssets: parseFloat(portfolioSummary.data.total_assets_3y_change) || 0,
          totalAssetsPercent: parseFloat(portfolioSummary.data.total_assets_3y_change_pct) || 0,
          liquidAssets: parseFloat(portfolioSummary.data.liquid_assets_3y_change) || 0,
          liquidAssetsPercent: parseFloat(portfolioSummary.data.liquid_assets_3y_change_pct) || 0,
          otherAssets: parseFloat(portfolioSummary.data.other_assets_3y_change) || 0,
          otherAssetsPercent: parseFloat(portfolioSummary.data.other_assets_3y_change_pct) || 0,
          totalLiabilities: parseFloat(portfolioSummary.data.total_liabilities_3y_change) || 0,
          totalLiabilitiesPercent: parseFloat(portfolioSummary.data.total_liabilities_3y_change_pct) || 0,
        },
      },
      
      // Income Metrics
      income: {
        annual: parseFloat(portfolioSummary.data.annual_income) || 0,
        yield: parseFloat(portfolioSummary.data.yield_percentage) || 0,
        yieldLiquid: parseFloat(portfolioSummary.data.yield_percentage_liquid) || 0,
        securityIncome: parseFloat(portfolioSummary.data.security_annual_income) || 0,
        otherAssetsIncome: parseFloat(portfolioSummary.data.other_assets_annual_income) || 0,
      },
      
      // Portfolio Ratios
      ratios: {
        liquidRatio: parseFloat(portfolioSummary.data.liquid_ratio) || 0,
        debtToAssetRatio: parseFloat(portfolioSummary.data.debt_to_asset_ratio) || 0,
      },
      
      // Position Statistics
      positionStats: {
        totalCount: portfolioSummary.data.total_position_count || 0,
        liquidCount: portfolioSummary.data.liquid_position_count || 0,
        otherCount: portfolioSummary.data.other_position_count || 0,
        activeAccountCount: portfolioSummary.data.active_account_count || 0,
        avgPositionSize: parseFloat(portfolioSummary.data.avg_position_size) || 0,
        avgLiquidPositionSize: parseFloat(portfolioSummary.data.avg_liquid_position_size) || 0,
        avgSecurityPositionSize: parseFloat(portfolioSummary.data.avg_security_position_size) || 0,
      },
      
      // Metadata
      timestamp: portfolioSummary.data.as_of_timestamp,
      snapshotDate: portfolioSummary.data.snapshot_date,
      dataSource: portfolioSummary.data.data_source,
      userId: portfolioSummary.data.user_id,
    };
  }, [portfolioSummary.data]);

  return {
    // Processed summary
    summary: summaryData,
    
    // Rich JSON fields (already processed by DataStore)
    topPositions: portfolioSummary.topLiquidPositions,
    topPerformersAmount: portfolioSummary.topPerformersAmount,
    topPerformersPercent: portfolioSummary.topPerformersPercent,
    accountDiversification: portfolioSummary.accountDiversification,
    assetPerformance: portfolioSummary.assetPerformanceDetail,
    sectorAllocation: portfolioSummary.sectorAllocation,
    institutionAllocation: portfolioSummary.institutionAllocation,
    riskMetrics: portfolioSummary.riskMetrics,
    concentrationMetrics: portfolioSummary.concentrationMetrics,
    dividendMetrics: portfolioSummary.dividendMetrics,
    taxEfficiencyMetrics: portfolioSummary.taxEfficiencyMetrics,
    
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