// Bulk Submit Hook for QuickStart Modal
// Handles submission of accounts, positions, and liabilities
import { useCallback } from 'react';
import { createAccount } from '@/utils/apimethods/accountMethods';
import {
  addSecurityPositionBulk,
  addCashPositionBulk,
  addCryptoPositionBulk,
  addMetalPositionBulk,
  addOtherAssetBulk,
  addLiability
} from '@/utils/apimethods/positionMethods';
import { actions } from '../state/reducer';
import { VIEWS } from '../utils/constants';

export default function useBulkSubmit({ state, dispatch, onSuccess }) {

  // Submit accounts
  const submitAccounts = useCallback(async (accountsToSubmit = null) => {
    const items = accountsToSubmit || state.accounts.filter(a =>
      a.status === 'ready' || (a.accountName && a.institution && a.accountCategory && a.accountType)
    );

    if (items.length === 0) {
      return { success: false, message: 'No valid accounts to submit' };
    }

    dispatch(actions.setSubmitting(true));

    const results = {
      success: [],
      failed: []
    };

    for (const account of items) {
      try {
        // Update status to submitting
        dispatch(actions.updateAccount(account.id, { status: 'submitting' }));

        const payload = {
          account_name: account.accountName,
          institution: account.institution,
          account_category: account.accountCategory,
          account_type: account.accountType
        };

        const result = await createAccount(payload);

        // Mark as added
        dispatch(actions.updateAccount(account.id, { status: 'added', serverId: result.id }));
        results.success.push({ ...account, ...result });

      } catch (error) {
        console.error('Failed to add account:', error);
        dispatch(actions.updateAccount(account.id, { status: 'error', error: error.message }));
        results.failed.push({ ...account, error: error.message });
      }
    }

    dispatch(actions.setSubmitting(false));

    if (results.success.length > 0) {
      // Show success screen
      dispatch(actions.setSuccessData({
        type: 'accounts',
        count: results.success.length,
        items: results.success,
        failed: results.failed.length
      }));

      // Refresh existing accounts
      onSuccess?.('accounts', results.success);
    }

    return {
      success: results.success.length > 0,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    };
  }, [state.accounts, dispatch, onSuccess]);

  // Submit positions
  const submitPositions = useCallback(async (mode = 'ready') => {
    // Collect positions to submit
    const toSubmit = [];
    Object.entries(state.positions).forEach(([assetType, typePositions]) => {
      typePositions.forEach(pos => {
        if (mode === 'all' || pos.status === 'ready') {
          toSubmit.push({ ...pos, assetType });
        }
      });
    });

    if (toSubmit.length === 0) {
      return { success: false, message: 'No valid positions to submit' };
    }

    dispatch(actions.setSubmitting(true));

    const results = {
      success: [],
      failed: []
    };

    // Group by asset type then by account
    const grouped = toSubmit.reduce((acc, pos) => {
      const key = `${pos.assetType}-${pos.data.account_id || 'none'}`;
      if (!acc[key]) {
        acc[key] = {
          assetType: pos.assetType,
          accountId: pos.data.account_id,
          positions: []
        };
      }
      acc[key].positions.push(pos);
      return acc;
    }, {});

    // Submit each group
    for (const group of Object.values(grouped)) {
      const { assetType, accountId, positions } = group;

      // Mark all as submitting
      for (const pos of positions) {
        dispatch(actions.updatePositionStatus(assetType, pos.id, 'submitting'));
      }

      try {
        // Prepare payload - strip account_id from individual items since it's in the URL
        const payload = positions.map(pos => {
          const { account_id, ...rest } = pos.data;
          return rest;
        });

        // Call appropriate bulk API - most take (accountId, data) except other assets
        let response;
        switch (assetType) {
          case 'security':
            response = await addSecurityPositionBulk(accountId, payload);
            break;
          case 'cash':
            response = await addCashPositionBulk(accountId, payload);
            break;
          case 'crypto':
            response = await addCryptoPositionBulk(accountId, payload);
            break;
          case 'metal':
            response = await addMetalPositionBulk(accountId, payload);
            break;
          case 'other':
            // Other assets expects account_id in each payload item
            const otherPayload = positions.map(pos => pos.data);
            response = await addOtherAssetBulk(otherPayload);
            break;
          default:
            throw new Error(`Unknown asset type: ${assetType}`);
        }

        // Mark all as added
        for (const pos of positions) {
          dispatch(actions.updatePositionStatus(assetType, pos.id, 'added'));
          results.success.push({ ...pos, response });
        }

      } catch (error) {
        console.error(`Failed to add ${assetType} positions:`, error);
        for (const pos of positions) {
          dispatch(actions.updatePositionStatus(assetType, pos.id, 'error', error.message));
          results.failed.push({ ...pos, error: error.message });
        }
      }
    }

    dispatch(actions.setSubmitting(false));

    if (results.success.length > 0) {
      // Show success screen
      dispatch(actions.setSuccessData({
        type: 'positions',
        count: results.success.length,
        items: results.success,
        failed: results.failed.length
      }));

      // Clear successful positions from localStorage
      onSuccess?.('positions', results.success);
    }

    return {
      success: results.success.length > 0,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    };
  }, [state.positions, dispatch, onSuccess]);

  // Submit liabilities
  const submitLiabilities = useCallback(async (liabilitiesToSubmit = null) => {
    const items = liabilitiesToSubmit || state.liabilities.filter(l =>
      l.status === 'ready' || (l.name && l.liability_type && l.institution_name && l.current_balance)
    );

    if (items.length === 0) {
      return { success: false, message: 'No valid liabilities to submit' };
    }

    dispatch(actions.setSubmitting(true));

    const results = {
      success: [],
      failed: []
    };

    for (const liability of items) {
      try {
        // Update status to submitting
        dispatch(actions.updateLiabilityStatus(liability.id, 'submitting'));

        const payload = {
          name: liability.name,
          liability_type: liability.liability_type,
          institution_name: liability.institution_name,
          current_balance: parseFloat(liability.current_balance)
        };

        // Add optional fields
        if (liability.original_amount) {
          payload.original_amount = parseFloat(liability.original_amount);
        }
        if (liability.credit_limit) {
          payload.credit_limit = parseFloat(liability.credit_limit);
        }
        if (liability.interest_rate) {
          payload.interest_rate = parseFloat(liability.interest_rate);
        }

        const result = await addLiability(payload);

        // Mark as added
        dispatch(actions.updateLiabilityStatus(liability.id, 'added'));
        results.success.push({ ...liability, ...result });

      } catch (error) {
        console.error('Failed to add liability:', error);
        dispatch(actions.updateLiabilityStatus(liability.id, 'error', error.message));
        results.failed.push({ ...liability, error: error.message });
      }
    }

    dispatch(actions.setSubmitting(false));

    if (results.success.length > 0) {
      // Show success screen
      dispatch(actions.setSuccessData({
        type: 'liabilities',
        count: results.success.length,
        items: results.success,
        failed: results.failed.length
      }));

      onSuccess?.('liabilities', results.success);
    }

    return {
      success: results.success.length > 0,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    };
  }, [state.liabilities, dispatch, onSuccess]);

  // Get counts for ready items
  const getReadyCounts = useCallback(() => {
    const accountsReady = state.accounts.filter(a =>
      a.accountName && a.institution && a.accountCategory && a.accountType && a.status !== 'added'
    ).length;

    let positionsReady = 0;
    Object.values(state.positions).forEach(typePositions => {
      positionsReady += typePositions.filter(p =>
        p.status === 'ready' && p.status !== 'added'
      ).length;
    });

    const liabilitiesReady = state.liabilities.filter(l =>
      l.name && l.liability_type && l.institution_name && l.current_balance && l.status !== 'added'
    ).length;

    return { accountsReady, positionsReady, liabilitiesReady };
  }, [state.accounts, state.positions, state.liabilities]);

  return {
    submitAccounts,
    submitPositions,
    submitLiabilities,
    getReadyCounts,
    isSubmitting: state.isSubmitting
  };
}
