// Hook for managing quantity grid data in the Update Modal
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useAccounts } from '@/store/hooks/useAccounts';

// Asset types that have editable quantities
const QUANTITY_ASSET_TYPES = new Set(['security', 'crypto', 'metal']);

/**
 * Normalize asset type to standard format
 */
const normalizeAssetType = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'stock' || t === 'etf' || t === 'equity' || t === 'fund' || t === 'bond') return 'security';
  if (t === 'cryptocurrency') return 'crypto';
  if (t === 'precious_metal' || t === 'metals') return 'metal';
  return t;
};

/**
 * Create a unique key for a tax lot (position)
 */
const createLotKey = (position) => {
  const identifier = position.identifier || position.name || 'unknown';
  const purchaseDate = position.purchaseDate || position.purchase_date || 'no-date';
  const accountId = position.accountId || position.inv_account_id || 'no-account';
  return `${identifier}::${purchaseDate}::${accountId}`;
};

/**
 * Create a row key for grouping (ticker + purchase_date)
 */
const createRowKey = (position) => {
  const identifier = position.identifier || position.name || 'unknown';
  const purchaseDate = position.purchaseDate || position.purchase_date || 'no-date';
  return `${identifier}::${purchaseDate}`;
};

/**
 * Hook for managing quantity grid data
 */
export const useQuantityData = (isOpen) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['security', 'crypto', 'metal']);

  const {
    positions: rawPositions = [],
    loading: positionsLoading,
    refresh: refreshPositions
  } = useDetailedPositions();

  const {
    accounts = [],
    loading: accountsLoading,
    refresh: refreshAccounts
  } = useAccounts();

  // Filter positions to only quantity-editable types
  const quantityPositions = useMemo(() => {
    if (!rawPositions?.length) return [];

    return rawPositions
      .filter(p => {
        const assetType = normalizeAssetType(p.assetType || p.item_type);
        return QUANTITY_ASSET_TYPES.has(assetType);
      })
      .map(p => {
        const assetType = normalizeAssetType(p.assetType || p.item_type);
        return {
          // Core identifiers
          id: p.itemId || p.id,
          lotKey: createLotKey(p),
          rowKey: createRowKey(p),

          // Position info
          identifier: p.identifier || '',
          name: p.name || p.identifier || 'Unknown',
          assetType,

          // Account info
          accountId: p.accountId || p.inv_account_id,
          accountName: p.accountName || p.inv_account_name || '',
          institution: p.institution || '',

          // Quantity data
          quantity: parseFloat(p.quantity) || 0,
          currentPrice: parseFloat(p.currentPrice || p.current_price_per_unit) || 0,
          currentValue: parseFloat(p.currentValue || p.current_value) || 0,
          costBasis: parseFloat(p.costBasis || p.cost) || 0,
          costPerUnit: parseFloat(p.costPerUnit || p.inv_cost_per_unit) || 0,

          // Dates
          purchaseDate: p.purchaseDate || p.purchase_date || null,

          // Additional fields for display
          sector: p.sector || p.inv_sector || '',
          holdingTerm: p.holdingTerm || p.inv_holding_term || '',
          gainLoss: parseFloat(p.gainLoss || p.gain_loss_amt) || 0,
          gainLossPercent: parseFloat(p.gainLossPercent || p.gain_loss_pct) || 0
        };
      });
  }, [rawPositions]);

  // Build account map for quick lookup
  const accountMap = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach(acc => {
      map.set(acc.id, {
        id: acc.id,
        name: acc.name,
        institution: acc.institution,
        type: acc.type,
        category: acc.category
      });
    });
    return map;
  }, [accounts]);

  // Get unique accounts that have quantity positions
  const relevantAccounts = useMemo(() => {
    const accountIds = new Set(quantityPositions.map(p => p.accountId));
    return accounts
      .filter(acc => accountIds.has(acc.id))
      .sort((a, b) => {
        // Sort by institution, then by name
        const instCmp = (a.institution || '').localeCompare(b.institution || '');
        if (instCmp !== 0) return instCmp;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [accounts, quantityPositions]);

  // Build grid rows (unique ticker + purchase_date combinations)
  const gridRows = useMemo(() => {
    const rowMap = new Map();

    quantityPositions.forEach(pos => {
      // Apply type filter
      if (!selectedTypes.includes(pos.assetType)) return;

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchable = `${pos.identifier} ${pos.name}`.toLowerCase();
        if (!searchable.includes(query)) return;
      }

      const rowKey = pos.rowKey;

      if (!rowMap.has(rowKey)) {
        rowMap.set(rowKey, {
          rowKey,
          identifier: pos.identifier,
          name: pos.name,
          assetType: pos.assetType,
          purchaseDate: pos.purchaseDate,
          positions: new Map(), // accountId -> position
          totalQuantity: 0,
          totalValue: 0,
          totalCostBasis: 0,
          accountCount: 0
        });
      }

      const row = rowMap.get(rowKey);
      row.positions.set(pos.accountId, pos);
      row.totalQuantity += pos.quantity;
      row.totalValue += pos.currentValue;
      row.totalCostBasis += pos.costBasis;
      row.accountCount += 1;
    });

    // Convert to array and sort
    return Array.from(rowMap.values())
      .sort((a, b) => {
        // Sort by identifier, then by purchase date (newest first)
        const idCmp = a.identifier.localeCompare(b.identifier);
        if (idCmp !== 0) return idCmp;

        const dateA = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
        const dateB = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
        return dateB - dateA; // Newest first
      });
  }, [quantityPositions, selectedTypes, searchQuery]);

  // Build the full grid matrix
  const gridMatrix = useMemo(() => {
    return gridRows.map(row => ({
      ...row,
      cells: relevantAccounts.map(acc => {
        const position = row.positions.get(acc.id);
        return {
          accountId: acc.id,
          accountName: acc.name,
          position: position || null,
          quantity: position?.quantity || 0,
          hasPosition: !!position,
          positionId: position?.id || null
        };
      })
    }));
  }, [gridRows, relevantAccounts]);

  // Calculate column totals
  const columnTotals = useMemo(() => {
    return relevantAccounts.map(acc => {
      let totalQuantity = 0;
      let totalValue = 0;
      let positionCount = 0;

      gridRows.forEach(row => {
        const pos = row.positions.get(acc.id);
        if (pos) {
          totalQuantity += pos.quantity;
          totalValue += pos.currentValue;
          positionCount += 1;
        }
      });

      return {
        accountId: acc.id,
        totalQuantity,
        totalValue,
        positionCount
      };
    });
  }, [relevantAccounts, gridRows]);

  // Calculate row totals (already in gridRows)

  // Grand totals
  const grandTotals = useMemo(() => {
    return {
      totalPositions: quantityPositions.length,
      totalValue: quantityPositions.reduce((sum, p) => sum + p.currentValue, 0),
      totalCostBasis: quantityPositions.reduce((sum, p) => sum + p.costBasis, 0),
      uniqueSecurities: new Set(quantityPositions.map(p => p.identifier)).size,
      uniqueAccounts: relevantAccounts.length,
      byType: {
        security: quantityPositions.filter(p => p.assetType === 'security').length,
        crypto: quantityPositions.filter(p => p.assetType === 'crypto').length,
        metal: quantityPositions.filter(p => p.assetType === 'metal').length
      }
    };
  }, [quantityPositions, relevantAccounts]);

  // Get position by lot key
  const getPositionByLotKey = useCallback((lotKey) => {
    return quantityPositions.find(p => p.lotKey === lotKey) || null;
  }, [quantityPositions]);

  // Get position by row key and account
  const getPosition = useCallback((rowKey, accountId) => {
    const row = gridRows.find(r => r.rowKey === rowKey);
    return row?.positions.get(accountId) || null;
  }, [gridRows]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshPositions?.(),
      refreshAccounts?.()
    ]);
  }, [refreshPositions, refreshAccounts]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTypes(['security', 'crypto', 'metal']);
  }, []);

  // Toggle asset type filter
  const toggleAssetType = useCallback((type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow removing all types
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  return {
    // Grid data
    gridRows,
    gridMatrix,
    relevantAccounts,
    columnTotals,
    grandTotals,

    // Raw data
    quantityPositions,
    accountMap,

    // Filters
    searchQuery,
    setSearchQuery,
    selectedTypes,
    setSelectedTypes,
    toggleAssetType,
    resetFilters,

    // Loading states
    loading: positionsLoading || accountsLoading,
    positionsLoading,
    accountsLoading,

    // Actions
    refreshAllData,
    getPositionByLotKey,
    getPosition
  };
};

export default useQuantityData;
