import { useMemo, useEffect, useCallback } from 'react';
import { useDataStore } from '../DataStore';

export const usePositionHistory = (identifier, options = {}) => {
  const { state, actions } = useDataStore();
  const { positionHistory } = state;
  const { fetchPositionHistory } = actions;

  const { days = 90, enabled = true } = options;

  // Fetch history when identifier changes and enabled
  useEffect(() => {
    if (identifier && enabled && !positionHistory.data[identifier] && !positionHistory.loading[identifier]) {
      console.log(`[usePositionHistory] Fetching history for ${identifier}`);
      actions.fetchPositionHistory(identifier, days);
    }
  }, [identifier, enabled]); // Minimal deps to prevent re-fetches

  // Get history data for this identifier
  const history = useMemo(() => {
    return positionHistory.data[identifier] || [];
  }, [positionHistory.data, identifier]);

  // Get loading state for this identifier
  const loading = useMemo(() => {
    return positionHistory.loading[identifier] || false;
  }, [positionHistory.loading, identifier]);

  // Get error state for this identifier
  const error = useMemo(() => {
    return positionHistory.error[identifier] || null;
  }, [positionHistory.error, identifier]);

  // Get last fetched time for this identifier
  const lastFetched = useMemo(() => {
    return positionHistory.lastFetched[identifier] || null;
  }, [positionHistory.lastFetched, identifier]);

  // Refresh function
  const refresh = useCallback(() => {
    if (identifier) {
      fetchPositionHistory(identifier, days, true);
    }
  }, [identifier, days, fetchPositionHistory]);

  return {
    history,
    loading,
    error,
    lastFetched,
    refresh,
    hasData: history.length > 0,
  };
};