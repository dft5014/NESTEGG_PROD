// Hook for submitting updates in the Update Modal
import { useState, useCallback, useRef } from 'react';
import {
  updateCashPosition,
  updateLiability,
  updateOtherAsset
} from '@/utils/apimethods/positionMethods';

const MAX_RETRIES = 2;
const RETRY_DELAYS = [300, 600];
const MAX_CONCURRENT = 3;

/**
 * Hook for handling update submissions
 */
export const useUpdateSubmit = (refreshAllData) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [failedRows, setFailedRows] = useState([]);
  const abortRef = useRef(false);

  // Convert ID to proper format
  const normalizeId = (id) => {
    if (typeof id === 'number') return id;
    const s = String(id ?? '');
    return /^\s*-?\d+\s*$/.test(s) ? parseInt(s, 10) : s;
  };

  // Submit a single row with retry logic
  const submitOne = useCallback(async (row) => {
    const id = normalizeId(row.id);
    const newValue = Number(row.newValue);

    const attempt = async () => {
      switch (row._kind) {
        case 'cash':
          // Try cash endpoint first, fall back to other asset
          return updateCashPosition(id, { amount: newValue })
            .catch(() => updateOtherAsset(id, { current_value: newValue }));

        case 'liability':
          return updateLiability(id, { current_balance: newValue });

        case 'other':
          return updateOtherAsset(id, { current_value: newValue });

        default:
          throw new Error(`Unknown item type: ${row._kind}`);
      }
    };

    // Retry logic
    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      try {
        await attempt();
        return { success: true, row };
      } catch (error) {
        if (retry < MAX_RETRIES) {
          await new Promise(res => setTimeout(res, RETRY_DELAYS[retry]));
        } else {
          return { success: false, row, error };
        }
      }
    }
  }, []);

  // Submit all changed rows
  const submitAll = useCallback(async (changedRows) => {
    if (changedRows.length === 0) {
      return { success: true, successCount: 0, failedCount: 0, failed: [] };
    }

    setIsSubmitting(true);
    setProgress({ current: 0, total: changedRows.length });
    setFailedRows([]);
    abortRef.current = false;

    const failed = [];
    let successCount = 0;
    let currentIndex = 0;

    try {
      // Create worker pool
      const workers = Array.from({ length: Math.min(MAX_CONCURRENT, changedRows.length) }, async () => {
        while (currentIndex < changedRows.length && !abortRef.current) {
          const idx = currentIndex++;
          const row = changedRows[idx];

          const result = await submitOne(row);

          if (result.success) {
            successCount++;
          } else {
            failed.push(result.row._key);
          }

          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      });

      await Promise.all(workers);

      // Refresh data
      if (refreshAllData) {
        await refreshAllData();
      }

      setFailedRows(failed);

      return {
        success: failed.length === 0,
        successCount,
        failedCount: failed.length,
        failed
      };
    } catch (error) {
      console.error('Submit error:', error);
      return {
        success: false,
        successCount,
        failedCount: changedRows.length - successCount,
        failed,
        error
      };
    } finally {
      setIsSubmitting(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [submitOne, refreshAllData]);

  // Retry failed rows
  const retryFailed = useCallback(async (changedRows) => {
    if (failedRows.length === 0) return { success: true, successCount: 0, failedCount: 0 };

    const rowsToRetry = changedRows.filter(r => failedRows.includes(r._key));
    const result = await submitAll(rowsToRetry);

    return result;
  }, [failedRows, submitAll]);

  // Abort current submission
  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  // Clear failed rows
  const clearFailed = useCallback(() => {
    setFailedRows([]);
  }, []);

  return {
    isSubmitting,
    progress,
    failedRows,
    submitAll,
    retryFailed,
    abort,
    clearFailed
  };
};

export default useUpdateSubmit;
