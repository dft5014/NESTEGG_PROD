// Hook for managing quantity draft values in the Update Modal
import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing quantity drafts
 * Tracks changes to position quantities before submission
 */
export const useQuantityDrafts = (quantityPositions = []) => {
  // Draft values: Map of lotKey -> { quantity, originalQuantity, positionId, assetType }
  const [drafts, setDrafts] = useState({});

  // Set a draft value for a specific position
  const setDraft = useCallback((lotKey, newQuantity, position) => {
    setDrafts(prev => {
      const current = prev[lotKey];
      const originalQuantity = current?.originalQuantity ?? position?.quantity ?? 0;

      // Parse the new quantity
      const parsedQuantity = typeof newQuantity === 'string'
        ? parseFloat(newQuantity) || 0
        : newQuantity || 0;

      // If quantity matches original, remove the draft
      if (Math.abs(parsedQuantity - originalQuantity) < 0.0000001) {
        const { [lotKey]: removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [lotKey]: {
          quantity: parsedQuantity,
          originalQuantity,
          positionId: position?.id,
          assetType: position?.assetType,
          identifier: position?.identifier,
          accountId: position?.accountId,
          purchaseDate: position?.purchaseDate,
          costPerUnit: position?.costPerUnit || 0,
          currentPrice: position?.currentPrice || 0
        }
      };
    });
  }, []);

  // Get draft value for a position (returns original if no draft)
  const getDraft = useCallback((lotKey, originalQuantity = 0) => {
    return drafts[lotKey]?.quantity ?? originalQuantity;
  }, [drafts]);

  // Check if a position has a draft
  const hasDraft = useCallback((lotKey) => {
    return lotKey in drafts;
  }, [drafts]);

  // Clear a single draft
  const clearDraft = useCallback((lotKey) => {
    setDrafts(prev => {
      const { [lotKey]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    setDrafts({});
  }, []);

  // Get all changed rows
  const getChangedRows = useCallback(() => {
    return Object.entries(drafts).map(([lotKey, draft]) => ({
      lotKey,
      ...draft,
      delta: draft.quantity - draft.originalQuantity,
      deltaPercent: draft.originalQuantity !== 0
        ? ((draft.quantity - draft.originalQuantity) / draft.originalQuantity) * 100
        : draft.quantity !== 0 ? 100 : 0
    }));
  }, [drafts]);

  // Calculate draft totals
  const draftTotals = useMemo(() => {
    const changedRows = Object.values(drafts);

    return {
      changedCount: changedRows.length,
      totalOriginal: changedRows.reduce((sum, d) => sum + (d.originalQuantity * d.currentPrice), 0),
      totalNew: changedRows.reduce((sum, d) => sum + (d.quantity * d.currentPrice), 0),
      totalDelta: changedRows.reduce((sum, d) => sum + ((d.quantity - d.originalQuantity) * d.currentPrice), 0),
      byAssetType: {
        security: changedRows.filter(d => d.assetType === 'security').length,
        crypto: changedRows.filter(d => d.assetType === 'crypto').length,
        metal: changedRows.filter(d => d.assetType === 'metal').length
      }
    };
  }, [drafts]);

  // Bulk paste handler for quantities
  // Expects data in format: identifier\tquantity per line
  const handleBulkPaste = useCallback((pastedText, gridRows, relevantAccounts, getPosition) => {
    if (!pastedText?.trim()) return { success: 0, failed: 0, errors: [] };

    const lines = pastedText.trim().split('\n');
    let success = 0;
    let failed = 0;
    const errors = [];

    // Check if first line looks like a header
    const firstLine = lines[0]?.toLowerCase() || '';
    const hasHeader = firstLine.includes('ticker') ||
                      firstLine.includes('symbol') ||
                      firstLine.includes('quantity') ||
                      firstLine.includes('identifier');

    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, idx) => {
      const parts = line.split('\t');
      if (parts.length < 2) {
        // Try comma separation
        const commaParts = line.split(',').map(p => p.trim());
        if (commaParts.length >= 2) {
          parts.length = 0;
          parts.push(...commaParts);
        }
      }

      if (parts.length < 2) {
        failed++;
        errors.push(`Line ${idx + 1}: Invalid format (need identifier and quantity)`);
        return;
      }

      const [identifier, quantityStr, accountHint] = parts.map(p => p.trim());
      const quantity = parseFloat(quantityStr);

      if (isNaN(quantity)) {
        failed++;
        errors.push(`Line ${idx + 1}: Invalid quantity "${quantityStr}"`);
        return;
      }

      // Find matching rows
      const matchingRows = gridRows.filter(row =>
        row.identifier.toLowerCase() === identifier.toLowerCase()
      );

      if (matchingRows.length === 0) {
        failed++;
        errors.push(`Line ${idx + 1}: No position found for "${identifier}"`);
        return;
      }

      // If account hint provided, try to match specific account
      if (accountHint && matchingRows.length > 0) {
        const accountMatch = relevantAccounts.find(acc =>
          acc.name.toLowerCase().includes(accountHint.toLowerCase()) ||
          acc.institution.toLowerCase().includes(accountHint.toLowerCase())
        );

        if (accountMatch) {
          matchingRows.forEach(row => {
            const position = row.positions.get(accountMatch.id);
            if (position) {
              setDraft(position.lotKey, quantity, position);
              success++;
            }
          });
          return;
        }
      }

      // Apply to all matching rows (all accounts with this ticker)
      matchingRows.forEach(row => {
        row.positions.forEach((position) => {
          setDraft(position.lotKey, quantity, position);
          success++;
        });
      });
    });

    return { success, failed, errors, hasHeader };
  }, [setDraft]);

  // Revert all drafts for a specific identifier
  const revertByIdentifier = useCallback((identifier) => {
    setDrafts(prev => {
      const filtered = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (value.identifier !== identifier) {
          filtered[key] = value;
        }
      });
      return filtered;
    });
  }, []);

  // Check if any drafts exist
  const hasChanges = useMemo(() => {
    return Object.keys(drafts).length > 0;
  }, [drafts]);

  return {
    drafts,
    setDraft,
    getDraft,
    hasDraft,
    clearDraft,
    clearAllDrafts,
    getChangedRows,
    draftTotals,
    handleBulkPaste,
    revertByIdentifier,
    hasChanges
  };
};

export default useQuantityDrafts;
