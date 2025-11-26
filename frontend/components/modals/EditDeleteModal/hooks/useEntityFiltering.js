import { useState, useMemo, useCallback } from 'react';
import { normalizeAssetType } from '../config';

/**
 * Hook for filtering entities (accounts, positions, liabilities)
 */
export const useEntityFiltering = (entities, entityType, accounts = []) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set());
  const [selectedLiabilityTypes, setSelectedLiabilityTypes] = useState(new Set());
  const [selectedAccountFilter, setSelectedAccountFilter] = useState(new Set());
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedAccountTypes, setSelectedAccountTypes] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedAssetTypes(new Set());
    setSelectedLiabilityTypes(new Set());
    setSelectedAccountFilter(new Set());
    setSelectedInstitutionFilter(new Set());
    setSelectedCategories(new Set());
    setSelectedAccountTypes(new Set());
  }, []);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return searchQuery ||
      selectedAssetTypes.size > 0 ||
      selectedLiabilityTypes.size > 0 ||
      selectedAccountFilter.size > 0 ||
      selectedInstitutionFilter.size > 0 ||
      selectedCategories.size > 0 ||
      selectedAccountTypes.size > 0;
  }, [
    searchQuery, selectedAssetTypes, selectedLiabilityTypes,
    selectedAccountFilter, selectedInstitutionFilter,
    selectedCategories, selectedAccountTypes
  ]);

  /**
   * Sort function
   */
  const sortItems = useCallback((items, config) => {
    if (!config.key) return items;

    return [...items].sort((a, b) => {
      let aVal = a[config.key];
      let bVal = b[config.key];

      // Handle field mapping for common keys
      if (config.key === 'account_name') {
        aVal = a.name || a.account_name || '';
        bVal = b.name || b.account_name || '';
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return config.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();

      if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, []);

  /**
   * Toggle sort direction
   */
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  /**
   * Filtered and sorted entities
   */
  const filteredEntities = useMemo(() => {
    let filtered = [...entities];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();

      if (entityType === 'accounts') {
        filtered = filtered.filter(acc =>
          acc.name?.toLowerCase().includes(query) ||
          acc.institution?.toLowerCase().includes(query) ||
          acc.type?.toLowerCase().includes(query)
        );
      } else if (entityType === 'positions') {
        filtered = filtered.filter(pos => {
          const searchableFields = [
            pos.identifier,
            pos.name,
            pos.account_name,
            pos.sector,
            pos.industry
          ];
          return searchableFields.some(field =>
            field && field.toLowerCase().includes(query)
          );
        });
      } else if (entityType === 'liabilities') {
        filtered = filtered.filter(l =>
          l.name?.toLowerCase().includes(query) ||
          l.liability_type?.toLowerCase().includes(query)
        );
      }
    }

    // Entity-specific filters
    if (entityType === 'accounts') {
      if (selectedCategories.size > 0) {
        filtered = filtered.filter(acc => selectedCategories.has(acc.category));
      }
      if (selectedInstitutionFilter.size > 0) {
        filtered = filtered.filter(acc => selectedInstitutionFilter.has(acc.institution));
      }
      if (selectedAccountTypes.size > 0) {
        filtered = filtered.filter(acc => selectedAccountTypes.has(acc.type));
      }
    } else if (entityType === 'positions') {
      if (selectedAssetTypes.size > 0) {
        filtered = filtered.filter(pos => {
          const assetType = normalizeAssetType(pos.asset_type || pos.item_type);
          return selectedAssetTypes.has(assetType);
        });
      }
      if (selectedAccountFilter.size > 0) {
        filtered = filtered.filter(pos => selectedAccountFilter.has(pos.account_id));
      }
      if (selectedInstitutionFilter.size > 0) {
        filtered = filtered.filter(pos => {
          const account = accounts.find(acc => acc.id === pos.account_id);
          return account && selectedInstitutionFilter.has(account.institution);
        });
      }
    } else if (entityType === 'liabilities') {
      if (selectedLiabilityTypes.size > 0) {
        filtered = filtered.filter(l => selectedLiabilityTypes.has(l.liability_type));
      }
    }

    // Apply sorting
    return sortItems(filtered, sortConfig);
  }, [
    entities, entityType, accounts, searchQuery, sortConfig,
    selectedAssetTypes, selectedLiabilityTypes, selectedAccountFilter,
    selectedInstitutionFilter, selectedCategories, selectedAccountTypes,
    sortItems
  ]);

  return {
    // Filtered results
    filteredEntities,

    // Search
    searchQuery,
    setSearchQuery,

    // Asset type filters (positions)
    selectedAssetTypes,
    setSelectedAssetTypes,

    // Liability type filters
    selectedLiabilityTypes,
    setSelectedLiabilityTypes,

    // Account filters (positions)
    selectedAccountFilter,
    setSelectedAccountFilter,

    // Institution filters
    selectedInstitutionFilter,
    setSelectedInstitutionFilter,

    // Category filters (accounts)
    selectedCategories,
    setSelectedCategories,

    // Account type filters
    selectedAccountTypes,
    setSelectedAccountTypes,

    // Sorting
    sortConfig,
    handleSort,

    // Utilities
    clearFilters,
    hasActiveFilters
  };
};

export default useEntityFiltering;
