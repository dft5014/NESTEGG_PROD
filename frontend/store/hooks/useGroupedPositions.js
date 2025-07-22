import { useMemo, useEffect } from 'react';
import { useDataStore } from '../DataStore';

export const useGroupedPositions = () => {
  const { state, actions } = useDataStore();
  const { groupedPositions } = state;
  const { fetchGroupedPositionsData, markDataStale } = actions;

  // Auto-fetch on mount if needed
  useEffect(() => {
    if (!groupedPositions.data.length && !groupedPositions.loading && !groupedPositions.error) {
      fetchGroupedPositionsData();
    }
  }, []);

  // Process positions data
  const positions = useMemo(() => {
    return groupedPositions.data || [];
  }, [groupedPositions.data]);

  // Process summary data
  const summary = useMemo(() => {
    return groupedPositions.summary || {
      total_positions: 0,
      unique_assets: 0,
      total_value: 0,
      total_gain_loss: 0,
      total_gain_loss_pct: 0,
      total_annual_income: 0,
      asset_type_breakdown: {}
    };
  }, [groupedPositions.summary]);

  // Calculate additional metrics
  const metrics = useMemo(() => {
    if (!positions.length) return {
      totalLongTermValue: 0,
      totalShortTermValue: 0,
      longTermPercentage: 0,
      topGainers: [],
      topLosers: [],
      recentChanges: []
    };

    const totalLongTermValue = positions.reduce((sum, p) => sum + (p.long_term_value || 0), 0);
    const totalShortTermValue = positions.reduce((sum, p) => sum + (p.short_term_value || 0), 0);
    const totalValue = totalLongTermValue + totalShortTermValue;

    // Get top gainers and losers
    const sortedByGain = [...positions].sort((a, b) => b.total_gain_loss_pct - a.total_gain_loss_pct);
    const topGainers = sortedByGain.slice(0, 5);
    const topLosers = sortedByGain.slice(-5).reverse();

    // Get positions with recent activity (quantity changes)
    const recentChanges = positions
      .filter(p => p.quantity_1d_change !== 0 || p.quantity_1w_change !== 0)
      .sort((a, b) => Math.abs(b.quantity_1d_change_pct || 0) - Math.abs(a.quantity_1d_change_pct || 0));

    return {
      totalLongTermValue,
      totalShortTermValue,
      longTermPercentage: totalValue > 0 ? (totalLongTermValue / totalValue) * 100 : 0,
      topGainers,
      topLosers,
      recentChanges
    };
  }, [positions]);

  return {
    positions,
    summary,
    metrics,
    loading: groupedPositions.loading,
    error: groupedPositions.error,
    lastFetched: groupedPositions.lastFetched,
    isStale: groupedPositions.isStale,
    refreshData: () => fetchGroupedPositionsData(true),
    markStale: () => markDataStale(),
  };
};