// Local Persistence Hook for QuickStart Modal
// Handles auto-saving and restoring drafts to localStorage
import { useEffect, useRef, useCallback, useState } from 'react';
import { actions } from '../state/reducer';

const STORAGE_KEY = 'nestegg_quickstart_draft_v2';
const SAVE_DEBOUNCE_MS = 1000;
const DRAFT_EXPIRATION_HOURS = 8; // Drafts expire after 8 hours

export default function useLocalPersistence({ state, dispatch, enabled = true }) {
  const saveTimeoutRef = useRef(null);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState(null);

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

  // Check for draft and return info (without restoring)
  const checkForDraft = useCallback(() => {
    if (!enabled) return null;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const data = JSON.parse(saved);

      // Check if draft is not too old
      const savedAt = new Date(data.savedAt);
      const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSave > DRAFT_EXPIRATION_HOURS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // Verify there's actual data
      const accountCount = data.accounts?.length || 0;
      const positionCount = Object.values(data.positions || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      const liabilityCount = data.liabilities?.length || 0;

      if (accountCount === 0 && positionCount === 0 && liabilityCount === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return {
        accountCount,
        positionCount,
        liabilityCount,
        savedAt,
        data
      };
    } catch (e) {
      console.error('Failed to check draft:', e);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, [enabled]);

  // Restore draft from localStorage (user-initiated)
  const restoreDraft = useCallback(() => {
    const info = checkForDraft();
    if (!info) return false;

    try {
      const { data } = info;

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

      setHasPendingDraft(false);
      setDraftInfo(null);
      console.log('Draft restored from localStorage');

      return true;
    } catch (e) {
      console.error('Failed to restore draft:', e);
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
  }, [checkForDraft, dispatch]);

  // Dismiss draft (don't restore, just clear the notification)
  const dismissDraft = useCallback(() => {
    setHasPendingDraft(false);
    setDraftInfo(null);
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasPendingDraft(false);
      setDraftInfo(null);
      console.log('Draft cleared from localStorage');
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  }, []);

  // Check if there's a draft to restore (sync version for quick checks)
  const hasDraft = useCallback(() => {
    return checkForDraft() !== null;
  }, [checkForDraft]);

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

  // Check for draft on mount (don't auto-restore, just notify)
  useEffect(() => {
    if (enabled) {
      const info = checkForDraft();
      if (info) {
        setHasPendingDraft(true);
        setDraftInfo(info);
      }
    }
  }, [enabled]); // Only run once on mount - checkForDraft is stable

  return {
    saveDraft,
    restoreDraft,
    dismissDraft,
    clearDraft,
    hasDraft,
    hasPendingDraft,
    draftInfo
  };
}
