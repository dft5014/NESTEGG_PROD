// Hook for submitting quantity updates in the Update Modal
import { useState, useCallback } from 'react';
import { updatePosition } from '@/utils/apimethods/positions';

/**
 * Prepare the API payload based on asset type
 */
const preparePayload = (draft) => {
  const { assetType, quantity, costPerUnit, purchaseDate, currentPrice } = draft;

  switch (assetType) {
    case 'security':
      return {
        shares: parseFloat(quantity),
        price: parseFloat(currentPrice) || undefined,
        cost_basis: parseFloat(costPerUnit) || undefined,
        purchase_date: purchaseDate || undefined
      };

    case 'crypto':
      return {
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(costPerUnit) || undefined,
        purchase_date: purchaseDate || undefined
      };

    case 'metal':
      return {
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(costPerUnit) || undefined,
        purchase_date: purchaseDate || undefined
      };

    default:
      return { quantity: parseFloat(quantity) };
  }
};

/**
 * Hook for submitting quantity updates
 */
export const useQuantitySubmit = (refreshAllData) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [failedRows, setFailedRows] = useState([]);
  const [successCount, setSuccessCount] = useState(0);

  // Submit all changed drafts
  const submitAll = useCallback(async (changedRows) => {
    if (!changedRows?.length) return { success: 0, failed: 0 };

    setIsSubmitting(true);
    setProgress({ current: 0, total: changedRows.length });
    setFailedRows([]);
    setSuccessCount(0);

    const failed = [];
    let successCounter = 0;

    // Process sequentially to avoid rate limiting
    for (let i = 0; i < changedRows.length; i++) {
      const row = changedRows[i];
      setProgress({ current: i + 1, total: changedRows.length });

      try {
        const payload = preparePayload(row);
        await updatePosition(row.positionId, payload, row.assetType);
        successCounter++;
        setSuccessCount(successCounter);
      } catch (error) {
        console.error(`Failed to update position ${row.positionId}:`, error);
        failed.push({
          ...row,
          error: error.message || 'Update failed'
        });
      }

      // Small delay between requests to avoid overwhelming the API
      if (i < changedRows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setFailedRows(failed);
    setIsSubmitting(false);

    // Refresh data after updates
    if (successCounter > 0 && refreshAllData) {
      try {
        await refreshAllData();
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }

    return {
      success: successCounter,
      failed: failed.length,
      failedRows: failed
    };
  }, [refreshAllData]);

  // Retry failed updates
  const retryFailed = useCallback(async () => {
    if (!failedRows.length) return { success: 0, failed: 0 };

    const rowsToRetry = [...failedRows];
    setFailedRows([]);

    return submitAll(rowsToRetry);
  }, [failedRows, submitAll]);

  // Submit a single position update
  const submitSingle = useCallback(async (draft) => {
    try {
      const payload = preparePayload(draft);
      await updatePosition(draft.positionId, payload, draft.assetType);

      // Refresh data after single update
      if (refreshAllData) {
        await refreshAllData();
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to update position ${draft.positionId}:`, error);
      return { success: false, error: error.message || 'Update failed' };
    }
  }, [refreshAllData]);

  // Clear failed rows
  const clearFailed = useCallback(() => {
    setFailedRows([]);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setIsSubmitting(false);
    setProgress({ current: 0, total: 0 });
    setFailedRows([]);
    setSuccessCount(0);
  }, []);

  return {
    isSubmitting,
    progress,
    failedRows,
    successCount,
    submitAll,
    submitSingle,
    retryFailed,
    clearFailed,
    reset
  };
};

export default useQuantitySubmit;
