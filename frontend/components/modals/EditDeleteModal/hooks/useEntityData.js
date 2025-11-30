import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';

/**
 * Hook for managing entity data from DataStore
 */
export const useEntityData = (isOpen) => {
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

  // DataStore hooks
  const {
    accounts: dataStoreAccounts,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts
  } = useAccounts();

  const {
    positions: dataStorePositions,
    loading: positionsLoading,
    error: positionsError,
    refresh: refreshPositions
  } = useDetailedPositions();

  const {
    liabilities: dataStoreLiabilities,
    loading: liabilitiesLoading,
    error: liabilitiesError,
    refreshData: refreshLiabilities
  } = useGroupedLiabilities();

  const { actions } = useDataStore();

  /**
   * Transform accounts from DataStore format
   */
  const loadAccounts = useCallback(() => {
    if (dataStoreAccounts && Array.isArray(dataStoreAccounts)) {
      setAccounts(dataStoreAccounts);
    }
  }, [dataStoreAccounts]);

  /**
   * Transform positions from DataStore format
   */
  const loadPositions = useCallback(() => {
    if (dataStorePositions && Array.isArray(dataStorePositions)) {
      const unifiedPositions = dataStorePositions.map(pos => ({
        id: pos.itemId || pos.id,
        unified_id: pos.unifiedId || pos.id,
        item_id: pos.itemId,
        account_id: pos.accountId,
        identifier: pos.identifier,
        name: pos.name,
        asset_type: pos.assetType,
        quantity: pos.quantity,
        current_value: pos.currentValue,
        cost_basis: pos.costBasis,
        total_cost_basis: pos.costBasis,
        gain_loss: pos.gainLoss,
        gain_loss_percent: pos.gainLossPercent,
        gain_loss_amt: pos.gainLoss,
        gain_loss_pct: pos.gainLossPercent,
        account_name: pos.accountName || 'Unknown Account',
        institution: pos.institution,
        purchase_date: pos.purchaseDate,
        current_price: pos.currentPrice,
        current_price_per_unit: pos.currentPrice,
        cost_per_unit: pos.costPerUnit || (pos.costBasis / (pos.quantity || 1)),
        sector: pos.sector,
        industry: pos.industry,
        holding_term: pos.holdingTerm,
        account_type: pos.account_type || ''
      }));
      setPositions(unifiedPositions);
    }
  }, [dataStorePositions]);

  /**
   * Transform liabilities from DataStore format
   */
  const loadLiabilities = useCallback(() => {
    if (dataStoreLiabilities && Array.isArray(dataStoreLiabilities)) {
      const unifiedLiabilities = dataStoreLiabilities.map(liability => {
        const liabilityDetails = liability.liability_details || {};
        const liabilityId = liabilityDetails.liability_id || liabilityDetails.item_id;

        return {
          id: liabilityId,
          name: liability.name,
          liability_type: liability.liability_type,
          current_balance: liability.total_current_balance || liability.current_balance,
          original_amount: liability.total_original_amount || liability.original_amount,
          interest_rate: liability.weighted_avg_interest_rate || liability.interest_rate,
          credit_limit: liability.total_credit_limit || liabilityDetails.credit_limit,
          institution_name: liability.institution || liability.institution_name,
          minimum_payment: liability.minimum_payment,
          due_date: liability.due_date,
          notes: liability.notes || ''
        };
      });
      setLiabilities(unifiedLiabilities);
    }
  }, [dataStoreLiabilities]);

  // Auto-sync when DataStore updates
  useEffect(() => {
    if (dataStoreAccounts?.length > 0) {
      loadAccounts();
    }
  }, [dataStoreAccounts, loadAccounts]);

  useEffect(() => {
    if (dataStorePositions?.length > 0) {
      loadPositions();
    }
  }, [dataStorePositions, loadPositions]);

  useEffect(() => {
    if (dataStoreLiabilities?.length > 0) {
      loadLiabilities();
    }
  }, [dataStoreLiabilities, loadLiabilities]);

  // Load all data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      loadPositions();
      loadLiabilities();
    }
  }, [isOpen, loadAccounts, loadPositions, loadLiabilities]);

  /**
   * Refresh all related data after mutations
   */
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshAccounts(),
      refreshPositions(),
      actions.fetchGroupedPositionsData(true),
      actions.fetchPortfolioData(true)
    ]);
    if (refreshLiabilities) {
      await refreshLiabilities();
    }
  }, [refreshAccounts, refreshPositions, refreshLiabilities, actions]);

  /**
   * Get loading state for a specific view
   */
  const getLoadingState = useCallback((view) => {
    switch (view) {
      case 'accounts':
        return accountsLoading;
      case 'positions':
        return positionsLoading;
      case 'liabilities':
        return liabilitiesLoading;
      default:
        return false;
    }
  }, [accountsLoading, positionsLoading, liabilitiesLoading]);

  /**
   * Portfolio summary for dashboard
   */
  const portfolioSummary = useMemo(() => {
    const accountsData = accounts.length > 0 ? accounts : (dataStoreAccounts || []);
    const positionsData = positions.length > 0 ? positions : (dataStorePositions || []);
    const liabilitiesData = liabilities.length > 0 ? liabilities : (dataStoreLiabilities || []);

    const totalAssets = positionsData.reduce(
      (sum, pos) => sum + parseFloat(pos.currentValue || pos.current_value || 0), 0
    );
    const totalLiabilities = liabilitiesData.reduce(
      (sum, l) => sum + parseFloat(l.current_balance || 0), 0
    );

    return {
      accountCount: accountsData.length,
      positionCount: positionsData.length,
      liabilityCount: liabilitiesData.length,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    };
  }, [accounts, positions, liabilities, dataStoreAccounts, dataStorePositions, dataStoreLiabilities]);

  return {
    // Data
    accounts,
    positions,
    liabilities,
    portfolioSummary,

    // Loading states
    accountsLoading,
    positionsLoading,
    liabilitiesLoading,
    getLoadingState,

    // Errors
    accountsError,
    positionsError,
    liabilitiesError,

    // Refresh functions
    refreshAccounts,
    refreshPositions,
    refreshLiabilities,
    refreshAllData,

    // DataStore actions
    actions
  };
};

export default useEntityData;
