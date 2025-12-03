// Hook for managing new positions to be added from the quantity grid
import { useState, useCallback, useMemo } from 'react';

/**
 * Create a unique key for a new position
 */
const createNewPositionKey = (identifier, purchaseDate, accountId) => {
  return `new::${identifier}::${purchaseDate || 'today'}::${accountId}`;
};

/**
 * Hook for managing pending new positions
 * These are positions that don't exist yet but will be created via QuickStart
 */
export const useNewPositions = () => {
  // Map of newPositionKey -> { ticker, identifier, name, purchaseDate, assetType, accountId, accountName, institution, quantity }
  const [newPositions, setNewPositions] = useState({});

  // Set or update a new position
  const setNewPosition = useCallback((data) => {
    const { identifier, purchaseDate, accountId, quantity, ...rest } = data;
    const key = createNewPositionKey(identifier, purchaseDate, accountId);

    setNewPositions(prev => {
      // If quantity is 0 or empty, remove the position
      if (!quantity || quantity <= 0) {
        const { [key]: removed, ...remaining } = prev;
        return remaining;
      }

      return {
        ...prev,
        [key]: {
          key,
          identifier,
          purchaseDate,
          accountId,
          quantity,
          ...rest
        }
      };
    });
  }, []);

  // Get new position value for a specific cell
  const getNewPositionValue = useCallback((identifier, purchaseDate, accountId) => {
    const key = createNewPositionKey(identifier, purchaseDate, accountId);
    return newPositions[key]?.quantity;
  }, [newPositions]);

  // Check if a cell has a new position
  const hasNewPosition = useCallback((identifier, purchaseDate, accountId) => {
    const key = createNewPositionKey(identifier, purchaseDate, accountId);
    return key in newPositions && newPositions[key].quantity > 0;
  }, [newPositions]);

  // Remove a new position
  const removeNewPosition = useCallback((identifier, purchaseDate, accountId) => {
    const key = createNewPositionKey(identifier, purchaseDate, accountId);
    setNewPositions(prev => {
      const { [key]: removed, ...remaining } = prev;
      return remaining;
    });
  }, []);

  // Clear all new positions
  const clearAllNewPositions = useCallback(() => {
    setNewPositions({});
  }, []);

  // Get all new positions as an array
  const newPositionsList = useMemo(() => {
    return Object.values(newPositions).filter(p => p.quantity > 0);
  }, [newPositions]);

  // Get count of new positions
  const newPositionsCount = useMemo(() => {
    return newPositionsList.length;
  }, [newPositionsList]);

  // Get new positions grouped by account
  const newPositionsByAccount = useMemo(() => {
    const grouped = {};
    newPositionsList.forEach(pos => {
      if (!grouped[pos.accountId]) {
        grouped[pos.accountId] = {
          accountId: pos.accountId,
          accountName: pos.accountName,
          institution: pos.institution,
          positions: []
        };
      }
      grouped[pos.accountId].positions.push(pos);
    });
    return Object.values(grouped);
  }, [newPositionsList]);

  // Prepare data for QuickStart modal import
  // Returns array suitable for seeding the add position form
  const prepareForImport = useCallback(() => {
    return newPositionsList.map(pos => ({
      accountId: pos.accountId,
      accountName: pos.accountName,
      institution: pos.institution,
      ticker: pos.ticker || pos.identifier, // Use ticker (symbol) for QuickStart seeding
      identifier: pos.identifier,
      name: pos.name || pos.identifier,
      assetType: pos.assetType,
      quantity: pos.quantity,
      purchaseDate: pos.purchaseDate || new Date().toISOString().split('T')[0]
    }));
  }, [newPositionsList]);

  return {
    // State
    newPositions,
    newPositionsList,
    newPositionsCount,
    newPositionsByAccount,

    // Actions
    setNewPosition,
    getNewPositionValue,
    hasNewPosition,
    removeNewPosition,
    clearAllNewPositions,
    prepareForImport
  };
};

export default useNewPositions;
