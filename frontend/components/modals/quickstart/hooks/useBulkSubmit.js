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
        const errorMessage = typeof error === 'object'
          ? (error?.message || error?.detail || JSON.stringify(error))
          : String(error);
        console.error('Failed to add account:', errorMessage);
        dispatch(actions.updateAccount(account.id, { status: 'error', error: errorMessage }));
        results.failed.push({ ...account, error: errorMessage });
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
        // Call appropriate bulk API with properly transformed payload
        let response;
        switch (assetType) {
          case 'security': {
            // Transform to match API expected format
            const securityPayload = positions.map(pos => ({
              ticker: pos.data.ticker,
              shares: parseFloat(pos.data.shares) || 0,
              price: parseFloat(pos.data.price) || 0,
              cost_basis: parseFloat(pos.data.cost_basis) || (parseFloat(pos.data.shares) * parseFloat(pos.data.price)) || 0,
              purchase_date: pos.data.purchase_date || null,
              notes: pos.data.notes || null
            }));
            response = await addSecurityPositionBulk(accountId, securityPayload);
            break;
          }
          case 'cash': {
            // Transform to match API expected format
            const cashPayload = positions.map(pos => ({
              cash_type: pos.data.cash_type,
              name: pos.data.cash_type,
              amount: parseFloat(pos.data.amount) || 0,
              interest_rate: pos.data.interest_rate ? parseFloat(pos.data.interest_rate) / 100 : null,
              interest_period: pos.data.interest_period || null,
              maturity_date: pos.data.maturity_date || null,
              notes: pos.data.notes || null
            }));
            response = await addCashPositionBulk(accountId, cashPayload);
            break;
          }
          case 'crypto': {
            // Transform to match API expected format
            const cryptoPayload = positions.map(pos => ({
              coin_type: pos.data.name || pos.data.symbol,
              coin_symbol: pos.data.symbol,
              quantity: parseFloat(pos.data.quantity) || 0,
              purchase_price: parseFloat(pos.data.purchase_price) || parseFloat(pos.data.current_price) || 0,
              purchase_date: pos.data.purchase_date || null,
              storage_type: pos.data.storage_type || 'Exchange',
              notes: pos.data.notes || null,
              tags: pos.data.tags || [],
              is_favorite: pos.data.is_favorite || false
            }));
            response = await addCryptoPositionBulk(accountId, cryptoPayload);
            break;
          }
          case 'metal': {
            // Transform to match API expected format
            const metalPayload = positions.map(pos => ({
              metal_type: pos.data.metal_type,
              coin_symbol: pos.data.symbol || '',
              quantity: parseFloat(pos.data.quantity) || 0,
              unit: pos.data.unit || 'oz',
              purity: pos.data.purity || null,
              purchase_price: parseFloat(pos.data.purchase_price) || parseFloat(pos.data.current_price_per_unit) || 0,
              cost_basis: parseFloat(pos.data.cost_basis) ||
                (parseFloat(pos.data.quantity) * (parseFloat(pos.data.purchase_price) || parseFloat(pos.data.current_price_per_unit))) || 0,
              purchase_date: pos.data.purchase_date || null,
              storage_location: pos.data.storage_location || null,
              description: pos.data.description || `${pos.data.symbol || ''} - ${pos.data.name || pos.data.metal_type || ''}`
            }));
            response = await addMetalPositionBulk(accountId, metalPayload);
            break;
          }
          case 'other': {
            // Other assets expects account_id in each payload item
            const otherPayload = positions.map(pos => ({
              account_id: pos.data.account_id,
              asset_name: pos.data.asset_name,
              description: pos.data.description || '',
              current_value: parseFloat(pos.data.current_value) || 0,
              cost_basis: parseFloat(pos.data.cost_basis) || 0,
              purchase_date: pos.data.purchase_date || null,
              category: pos.data.category || 'other'
            }));
            response = await addOtherAssetBulk(otherPayload);
            break;
          }
          default:
            throw new Error(`Unknown asset type: ${assetType}`);
        }

        // Mark all as added
        for (const pos of positions) {
          dispatch(actions.updatePositionStatus(assetType, pos.id, 'added'));
          results.success.push({ ...pos, response });
        }

      } catch (error) {
        // Extract error message properly - handle both Error objects and plain objects
        const errorMessage = typeof error === 'object'
          ? (error?.message || error?.detail || JSON.stringify(error))
          : String(error);
        console.error(`Failed to add ${assetType} positions:`, errorMessage);
        for (const pos of positions) {
          dispatch(actions.updatePositionStatus(assetType, pos.id, 'error', errorMessage));
          results.failed.push({ ...pos, error: errorMessage });
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
        const errorMessage = typeof error === 'object'
          ? (error?.message || error?.detail || JSON.stringify(error))
          : String(error);
        console.error('Failed to add liability:', errorMessage);
        dispatch(actions.updateLiabilityStatus(liability.id, 'error', errorMessage));
        results.failed.push({ ...liability, error: errorMessage });
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
