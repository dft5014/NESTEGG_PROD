import { useMemo, useEffect } from 'react';
import { useDataStore } from '../DataStore';

export const useDetailedPositions = () => {
  const { state, actions } = useDataStore();
  const { detailedPositions } = state;

  // Auto-fetch on mount
  useEffect(() => {
    if (!detailedPositions.lastFetched && !detailedPositions.loading) {
      actions.fetchDetailedPositionsData();
    }
  }, []);

  // Auto-refresh when stale
  useEffect(() => {
    if (detailedPositions.isStale && !detailedPositions.loading) {
      actions.fetchDetailedPositionsData();
    }
  }, [detailedPositions.isStale, detailedPositions.loading]);

  // Process positions data
  const processedPositions = useMemo(() => {
    if (!detailedPositions.data) return [];

    return detailedPositions.data.map(position => ({
      // Core identifiers
      id: position.id,
      accountId: position.account_id,
      identifier: position.identifier,
      name: position.name || position.identifier,
      assetType: position.asset_type,
      
      // Values
      quantity: position.quantity,
      currentPrice: position.current_price,
      currentValue: position.current_value,
      costBasis: position.cost_basis,
      gainLoss: position.gain_loss,
      gainLossPercent: position.gain_loss_pct,
      
      // Dates
      purchaseDate: position.purchase_date,
      snapshotDate: position.snapshot_date,
      
      // Account info
      accountName: position.account_name,
      institution: position.institution,
      
      // Additional fields
      currency: position.currency,
      sector: position.sector,
      industry: position.industry,
      
      // Raw data for other fields
      ...position
    }));
  }, [detailedPositions.data]);

  return {
    positions: processedPositions,
    loading: detailedPositions.loading,
    error: detailedPositions.error,
    lastFetched: detailedPositions.lastFetched,
    isStale: detailedPositions.isStale,
    refresh: () => actions.fetchDetailedPositionsData(true),
    markStale: () => actions.dispatch({ type: 'MARK_DETAILED_POSITIONS_STALE' })
  };
};