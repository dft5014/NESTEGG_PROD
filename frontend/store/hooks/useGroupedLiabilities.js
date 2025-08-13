import { useMemo, useEffect } from 'react';
import { useDataStore } from '../DataStore';

export const useGroupedLiabilities = () => {
  const { state, actions } = useDataStore();
  const { groupedLiabilities } = state;
  const { fetchGroupedLiabilitiesData, markDataStale } = actions;

  // Auto-fetch on mount only if no data exists
  // Auto-fetch on mount only if no data exists
  useEffect(() => {
    if ((!groupedLiabilities.data || groupedLiabilities.data.length === 0) && !groupedLiabilities.lastFetched && !groupedLiabilities.loading) {
      console.log('[useGroupedLiabilities] Auto-fetching grouped liabilities data');
      actions.fetchGroupedLiabilitiesData();
    }
  }, []); // Empty deps

  // Auto-refresh when stale
  useEffect(() => {
    if (groupedLiabilities.isStale && !groupedLiabilities.loading) {
      console.log('[useGroupedLiabilities] Refreshing stale grouped liabilities');
      actions.fetchGroupedLiabilitiesData();
    }
  }, [groupedLiabilities.isStale, groupedLiabilities.loading]);

  // Process liabilities data
  const liabilities = useMemo(() => {
    return groupedLiabilities.data || [];
  }, [groupedLiabilities.data]);

  // Process summary data
  const summary = useMemo(() => {
    return groupedLiabilities.summary || {
      total_liabilities: 0,
      unique_liabilities: 0,
      total_debt: 0,
      total_original_debt: 0,
      total_paid_down: 0,
      avg_interest_rate: 0,
      total_annual_interest: 0,
      liability_type_breakdown: {}
    };
  }, [groupedLiabilities.summary]);

  // Calculate additional metrics
  const metrics = useMemo(() => {
    if (!liabilities.length) return {
      totalHighInterestDebt: 0,
      totalLowInterestDebt: 0,
      highestInterestRate: 0,
      lowestInterestRate: 100,
      mostReduced: [],
      leastReduced: [],
      creditUtilization: null
    };

    // High interest threshold (e.g., > 10%)
    const highInterestThreshold = 10;
    
    const totalHighInterestDebt = liabilities.reduce((sum, l) => 
      l.weighted_avg_interest_rate > highInterestThreshold ? sum + (l.total_current_balance || 0) : sum, 0
    );
    const totalLowInterestDebt = liabilities.reduce((sum, l) => 
      l.weighted_avg_interest_rate <= highInterestThreshold ? sum + (l.total_current_balance || 0) : sum, 0
    );

    // Get highest and lowest rates
    const highestInterestRate = Math.max(...liabilities.map(l => l.max_interest_rate || 0));
    const lowestInterestRate = Math.min(...liabilities.filter(l => l.min_interest_rate > 0).map(l => l.min_interest_rate));

    // Sort by paydown percentage
    const sortedByPaydown = [...liabilities].sort((a, b) => b.paydown_percentage - a.paydown_percentage);
    const mostReduced = sortedByPaydown.slice(0, 5);
    const leastReduced = sortedByPaydown.slice(-5).reverse();

    // Calculate overall credit utilization
    const totalCreditBalance = liabilities.reduce((sum, l) => 
      l.liability_type === 'credit_card' ? sum + (l.total_credit_card_balance || 0) : sum, 0
    );
    const totalCreditLimit = liabilities.reduce((sum, l) => 
      l.liability_type === 'credit_card' ? sum + (l.total_credit_limit || 0) : sum, 0
    );
    const creditUtilization = totalCreditLimit > 0 ? (totalCreditBalance / totalCreditLimit) * 100 : null;

    return {
      totalHighInterestDebt,
      totalLowInterestDebt,
      highestInterestRate,
      lowestInterestRate,
      mostReduced,
      leastReduced,
      creditUtilization
    };
  }, [liabilities]);

  return {
    liabilities,
    summary,
    metrics,
    loading: groupedLiabilities.loading,
    error: groupedLiabilities.error,
    lastFetched: groupedLiabilities.lastFetched,
    isStale: groupedLiabilities.isStale,
    refreshData: () => fetchGroupedLiabilitiesData(true),
    markStale: () => markDataStale(),
  };
};