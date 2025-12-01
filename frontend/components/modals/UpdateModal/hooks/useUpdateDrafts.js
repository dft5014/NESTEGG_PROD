// Hook for managing draft edits in the Update Modal
import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing draft value changes
 */
export const useUpdateDrafts = (rows) => {
  const [drafts, setDrafts] = useState({});
  const [focusedKey, setFocusedKey] = useState(null);

  // Set a single draft value
  const setDraft = useCallback((key, value) => {
    setDrafts(prev => ({
      ...prev,
      [key]: Number.isFinite(value) ? value : 0
    }));
  }, []);

  // Remove a single draft
  const clearDraft = useCallback((key) => {
    setDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    setDrafts({});
  }, []);

  // Bulk set drafts (for paste operations)
  const setBulkDrafts = useCallback((updates) => {
    setDrafts(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Get changed rows
  const getChangedRows = useCallback(() => {
    return rows.filter(r => {
      const draft = drafts[r._key];
      if (draft == null || !Number.isFinite(Number(draft))) return false;
      return Number(draft) !== r.currentValue;
    }).map(r => ({
      ...r,
      newValue: Number(drafts[r._key])
    }));
  }, [rows, drafts]);

  // Check if a specific row has changes
  const hasChanges = useCallback((key) => {
    const row = rows.find(r => r._key === key);
    if (!row) return false;
    const draft = drafts[key];
    if (draft == null) return false;
    return Number(draft) !== row.currentValue;
  }, [rows, drafts]);

  // Get draft value for a row
  const getDraftValue = useCallback((key) => {
    return drafts[key];
  }, [drafts]);

  // Get display value (draft or current)
  const getDisplayValue = useCallback((row) => {
    const draft = drafts[row._key];
    return draft != null ? Number(draft) : row.currentValue;
  }, [drafts]);

  // Calculate totals including drafts
  const draftTotals = useMemo(() => {
    let originalCash = 0, newCash = 0;
    let originalLiab = 0, newLiab = 0;
    let originalOther = 0, newOther = 0;
    let changedCount = 0;

    for (const r of rows) {
      const draft = drafts[r._key];
      const newVal = draft != null ? Number(draft) : r.currentValue;
      const hasChange = newVal !== r.currentValue;

      if (hasChange) changedCount++;

      if (r._kind === 'cash') {
        originalCash += r.currentValue;
        newCash += newVal;
      } else if (r._kind === 'liability') {
        originalLiab += r.currentValue;
        newLiab += newVal;
      } else {
        originalOther += r.currentValue;
        newOther += newVal;
      }
    }

    const originalNet = originalCash + originalOther - originalLiab;
    const newNet = newCash + newOther - newLiab;

    return {
      originalCash,
      newCash,
      cashDelta: newCash - originalCash,
      originalLiabilities: originalLiab,
      newLiabilities: newLiab,
      liabilitiesDelta: newLiab - originalLiab,
      originalOther,
      newOther,
      otherDelta: newOther - originalOther,
      originalNet,
      newNet,
      netDelta: newNet - originalNet,
      changedCount,
      totalDelta: (newCash - originalCash) + (newOther - originalOther) - (newLiab - originalLiab)
    };
  }, [rows, drafts]);

  // Handle bulk paste
  const handleBulkPaste = useCallback((pastedText, visibleKeys) => {
    if (!pastedText) return { success: false, count: 0 };

    const toNum = (s) => {
      if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
      const n = Number(String(s ?? '').replace(/[^\d.-]/g, '').trim());
      return Number.isFinite(n) ? n : null;
    };

    // Parse pasted text
    const hasTabs = pastedText.includes('\t');
    const lines = pastedText.trim().split(/\r?\n/).map(row =>
      hasTabs ? row.split('\t') : (row.includes(',') ? row.split(',') : [row])
    );
    const flatRaw = lines.flat().map(s => String(s).trim());
    const nums = flatRaw.map(toNum).filter(n => n !== null && Number.isFinite(n));

    if (!nums.length) return { success: false, count: 0 };

    // Apply to visible rows
    const updates = {};
    for (let i = 0; i < visibleKeys.length && i < nums.length; i++) {
      updates[visibleKeys[i]] = nums[i];
    }

    setBulkDrafts(updates);

    // Check if first value was non-numeric (likely header)
    const firstWasNumeric = Number.isFinite(toNum(flatRaw[0])) && /\d/.test(flatRaw[0]);

    return {
      success: true,
      count: Math.min(visibleKeys.length, nums.length),
      headerWarning: !firstWasNumeric
    };
  }, [setBulkDrafts]);

  return {
    drafts,
    setDraft,
    clearDraft,
    clearAllDrafts,
    setBulkDrafts,
    getChangedRows,
    hasChanges,
    getDraftValue,
    getDisplayValue,
    draftTotals,
    handleBulkPaste,
    focusedKey,
    setFocusedKey
  };
};

export default useUpdateDrafts;
