import { useMemo } from 'react';
import { ASSET_TYPES, normalizeAssetType, ACCOUNT_CATEGORIES, LIABILITY_TYPES } from '../config';

/**
 * Hook for grouping entities by various dimensions
 */
export const useEntityGrouping = (entities, entityType, groupBy, accounts = []) => {
  const groupedEntities = useMemo(() => {
    if (!entities || entities.length === 0) {
      return {};
    }

    // No grouping - return all items in a single group
    if (groupBy === 'none') {
      const label = entityType === 'accounts' ? 'All Accounts' :
                    entityType === 'positions' ? 'All Positions' :
                    'All Liabilities';
      return { [label]: entities };
    }

    // Group accounts
    if (entityType === 'accounts') {
      if (groupBy === 'institution') {
        return entities.reduce((acc, account) => {
          const key = account.institution || 'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(account);
          return acc;
        }, {});
      }

      if (groupBy === 'category') {
        return entities.reduce((acc, account) => {
          const category = ACCOUNT_CATEGORIES.find(c => c.id === account.category);
          const key = category ? category.name : 'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(account);
          return acc;
        }, {});
      }
    }

    // Group positions
    if (entityType === 'positions') {
      if (groupBy === 'asset_type') {
        return entities.reduce((acc, position) => {
          const assetType = normalizeAssetType(position.asset_type || position.item_type);
          const assetTypeConfig = ASSET_TYPES[assetType];
          const key = assetTypeConfig ? assetTypeConfig.name : 'Other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      }

      if (groupBy === 'account') {
        return entities.reduce((acc, position) => {
          const key = position.account_name || 'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      }

      if (groupBy === 'institution') {
        return entities.reduce((acc, position) => {
          const key = position.institution ||
            accounts.find(a => a.id === position.account_id)?.institution ||
            'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      }

      if (groupBy === 'account_institution') {
        return entities.reduce((acc, position) => {
          const institution = position.institution ||
            accounts.find(a => a.id === position.account_id)?.institution ||
            'Unknown';
          const key = `${position.account_name || 'Unknown'} (${institution})`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      }
    }

    // Group liabilities
    if (entityType === 'liabilities') {
      if (groupBy === 'liability_type') {
        return entities.reduce((acc, liability) => {
          const type = LIABILITY_TYPES[liability.liability_type];
          const key = type ? type.label : 'Other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(liability);
          return acc;
        }, {});
      }
    }

    // Default: no grouping
    const label = entityType === 'accounts' ? 'All Accounts' :
                  entityType === 'positions' ? 'All Positions' :
                  'All Liabilities';
    return { [label]: entities };
  }, [entities, entityType, groupBy, accounts]);

  /**
   * Get group statistics
   */
  const groupStats = useMemo(() => {
    const stats = {};

    Object.entries(groupedEntities).forEach(([groupName, items]) => {
      if (entityType === 'accounts') {
        stats[groupName] = {
          count: items.length,
          total: items.reduce((sum, acc) => sum + (acc.totalValue || 0), 0)
        };
      } else if (entityType === 'positions') {
        stats[groupName] = {
          count: items.length,
          total: items.reduce((sum, pos) => sum + (pos.current_value || 0), 0),
          costBasis: items.reduce((sum, pos) => sum + (pos.total_cost_basis || 0), 0)
        };
      } else if (entityType === 'liabilities') {
        stats[groupName] = {
          count: items.length,
          total: items.reduce((sum, l) => sum + (l.current_balance || 0), 0)
        };
      }
    });

    return stats;
  }, [groupedEntities, entityType]);

  /**
   * Grand total across all groups
   */
  const grandTotal = useMemo(() => {
    if (entityType === 'accounts') {
      return entities.reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
    } else if (entityType === 'positions') {
      return {
        value: entities.reduce((sum, pos) => sum + (pos.current_value || 0), 0),
        costBasis: entities.reduce((sum, pos) => sum + (pos.total_cost_basis || 0), 0)
      };
    } else if (entityType === 'liabilities') {
      return entities.reduce((sum, l) => sum + (l.current_balance || 0), 0);
    }
    return 0;
  }, [entities, entityType]);

  return {
    groupedEntities,
    groupStats,
    grandTotal,
    groupCount: Object.keys(groupedEntities).length
  };
};

export default useEntityGrouping;
