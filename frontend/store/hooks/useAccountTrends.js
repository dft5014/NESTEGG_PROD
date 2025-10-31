import { useMemo } from 'react';
import { useAccounts } from './useAccounts';

/**
 * Hook to get historical trend data for a specific account
 * @param {string} accountId - The account ID to get trends for
 * @returns {Object} Account trend data and metadata
 */
export const useAccountTrends = (accountId) => {
  const { history, loading, error } = useAccounts();

  // Get trend data for the specific account
  const accountTrends = useMemo(() => {
    if (!accountId || !history || !history[accountId]) {
      return [];
    }

    return history[accountId].map(point => ({
      date: point.date,
      value: point.total_value,
      costBasis: point.total_cost_basis,
      gainLoss: point.total_gain_loss,
      gainLossPercent: point.total_gain_loss_percent,
      cashBalance: point.cash_balance,
      securityValue: point.security_value,
      cryptoValue: point.crypto_value
    }));
  }, [accountId, history]);

  // Calculate performance metrics from trends
  const metrics = useMemo(() => {
    if (!accountTrends || accountTrends.length === 0) {
      return {
        firstValue: 0,
        lastValue: 0,
        totalChange: 0,
        totalChangePercent: 0,
        minValue: 0,
        maxValue: 0,
        avgValue: 0
      };
    }

    const values = accountTrends.map(t => t.value);
    const firstValue = values[0] || 0;
    const lastValue = values[values.length - 1] || 0;
    const totalChange = lastValue - firstValue;
    const totalChangePercent = firstValue > 0 ? (totalChange / firstValue) * 100 : 0;

    return {
      firstValue,
      lastValue,
      totalChange,
      totalChangePercent,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      avgValue: values.reduce((sum, v) => sum + v, 0) / values.length
    };
  }, [accountTrends]);

  return {
    trends: accountTrends,
    metrics,
    loading,
    error,
    hasData: accountTrends.length > 0
  };
};
