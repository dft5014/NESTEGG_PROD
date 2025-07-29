import { useMemo } from 'react';
import { useDataStore } from '../DataStore';

export const usePortfolioTrends = () => {
  const { state } = useDataStore();
  const { portfolioSummary } = state;

  // Process history data for charts
  const trendData = useMemo(() => {
    if (!portfolioSummary.history || portfolioSummary.history.length === 0) {
      return {
        dates: [],
        netWorth: [],
        totalAssets: [],
        totalLiabilities: [],
        liquidAssets: [],
        chartData: [],
      };
    }

    const chartData = portfolioSummary.history.map(point => ({
      date: point.date,
      netWorth: point.net_worth,
      totalAssets: point.total_assets,
      totalLiabilities: point.total_liabilities,
      liquidAssets: point.liquid_assets,
      unrealizedGain: point.unrealized_gain,
      unrealizedGainPercent: point.unrealized_gain_percent,
      netCashPosition: point.net_cash_position || null,
      altLiquidNetWorth: point.alt_liquid_net_worth || 0,
      altRetirementAssets: point.alt_retirement_assets || 0,
      altIlliquidNetWorth: point.alt_illiquid_net_worth || 0,
    }));

    return {
      dates: portfolioSummary.history.map(p => p.date),
      netWorth: portfolioSummary.history.map(p => p.net_worth),
      totalAssets: portfolioSummary.history.map(p => p.total_assets),
      totalLiabilities: portfolioSummary.history.map(p => p.total_liabilities),
      liquidAssets: portfolioSummary.history.map(p => p.liquid_assets),
      netCashPosition: portfolioSummary.history.map(p => p.net_cash_position || null), 
      chartData,
    };
  }, [portfolioSummary.history]);

  return {
    trends: trendData,
    loading: portfolioSummary.loading,
    error: portfolioSummary.error,
  };
};