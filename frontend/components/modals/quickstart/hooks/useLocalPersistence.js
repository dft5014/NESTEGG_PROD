// Local Persistence Hook for QuickStart Modal
// Handles auto-saving and restoring drafts to localStorage
import { useEffect, useRef, useCallback } from 'react';
import { actions } from '../state/reducer';

const STORAGE_KEY = 'nestegg_quickstart_draft_v2';
const SAVE_DEBOUNCE_MS = 1000;

export default function useLocalPersistence({ state, dispatch, enabled = true }) {
  const saveTimeoutRef = useRef(null);
  const hasRestoredRef = useRef(false);

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(() => {
    if (!enabled) return;

    const dataToSave = {
      accounts: state.accounts.filter(a => a.status !== 'added'),
      positions: {
        security: state.positions.security.filter(p => p.status !== 'added'),
        cash: state.positions.cash.filter(p => p.status !== 'added'),
        crypto: state.positions.crypto.filter(p => p.status !== 'added'),
        metal: state.positions.metal.filter(p => p.status !== 'added'),
        other: state.positions.other.filter(p => p.status !== 'added')
      },
      liabilities: state.liabilities.filter(l => l.status !== 'added'),
      positionSections: state.positionSections,
      savedAt: new Date().toISOString()
    };

    // Check if there's anything to save
    const hasData = dataToSave.accounts.length > 0 ||
      Object.values(dataToSave.positions).some(arr => arr.length > 0) ||
      dataToSave.liabilities.length > 0;

    if (hasData) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        console.log('Draft saved to localStorage');
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
    } else {
      // Clear storage if nothing to save
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [enabled, state.accounts, state.positions, state.liabilities, state.positionSections]);

  // Restore draft from localStorage
  const restoreDraft = useCallback(() => {
    if (!enabled || hasRestoredRef.current) return false;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;

      const data = JSON.parse(saved);

      // Check if draft is not too old (24 hours)
      const savedAt = new Date(data.savedAt);
      const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSave > 24) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // Verify there's actual data
      const hasData = data.accounts?.length > 0 ||
        Object.values(data.positions || {}).some(arr => arr?.length > 0) ||
        data.liabilities?.length > 0;

      if (!hasData) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      // Restore the data
      dispatch(actions.restoreDraft({
        accounts: data.accounts || [],
        positions: data.positions || {
          security: [],
          cash: [],
          crypto: [],
          metal: [],
          other: []
        },
        liabilities: data.liabilities || [],
        positionSections: data.positionSections || {
          security: true,
          cash: false,
          crypto: false,
          metal: false,
          other: false
        }
      }));

      hasRestoredRef.current = true;
      console.log('Draft restored from localStorage');

      return true;
    } catch (e) {
      console.error('Failed to restore draft:', e);
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
  }, [enabled, dispatch]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      hasRestoredRef.current = false;
      console.log('Draft cleared from localStorage');
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, []);

  // Check if there's a draft to restore
  const hasDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;

      const data = JSON.parse(saved);
      return data.accounts?.length > 0 ||
        Object.values(data.positions || {}).some(arr => arr?.length > 0) ||
        data.liabilities?.length > 0;
    } catch {
      return false;
    }
  }, []);

  // Auto-save when state changes (debounced)
  useEffect(() => {
    if (!enabled || !state.isDirty) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(saveDraft, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [enabled, state.isDirty, saveDraft]);

  // Restore draft on mount
  useEffect(() => {
    if (enabled && !hasRestoredRef.current) {
      restoreDraft();
    }
  }, [enabled, restoreDraft]);

  return {
    saveDraft,
    restoreDraft,
    clearDraft,
    hasDraft
  };
}
