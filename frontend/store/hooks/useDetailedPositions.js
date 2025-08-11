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
        // Core identifiers - keep both unified_id and actual item_id
        id: position.unified_id || position.history_id,
        itemId: position.item_id || position.position_id,  // The actual position ID for updates
        unifiedId: position.unified_id,  // Keep for reference
        accountId: position.inv_account_id,
        identifier: position.identifier,
        name: position.name || position.identifier,
        assetType: position.item_type,  // Use item_type not asset_type
        
        // Values - map from inv_ prefixed fields
        quantity: parseFloat(position.inv_quantity || 0),
        currentPrice: parseFloat(position.inv_price_per_unit || 0),
        currentValue: parseFloat(position.current_value || 0),
        costBasis: parseFloat(position.cost || 0),
        gainLoss: parseFloat(position.gain_loss_amt || 0),
        gainLossPercent: parseFloat(position.gain_loss_pct || 0),
        
        // Dates
        purchaseDate: position.purchase_date,
        snapshotDate: position.snapshot_date,
        
        // Account info - use inv_ prefixed fields
        accountName: position.inv_account_name,
        institution: position.institution,
        accountType: position.inv_account_type,
        accountCategory: position.inv_account_category,
        
        // Additional fields from inv_ prefix
        sector: position.inv_sector,
        industry: position.inv_industry,
        holdingTerm: position.inv_holding_term,
        dividendRate: position.inv_dividend_rate,
        dividendYield: position.inv_dividend_yield,
        income: position.inv_income,
        costPerUnit: parseFloat(position.inv_cost_per_unit || 0),
        
        // Keep raw data for other fields
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