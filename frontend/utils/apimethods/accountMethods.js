// frontend/utils/apimethods/accountMethods.js
import { fetchWithAuth } from '@/utils/api';

/**
 * Create a new account
 * @param {Object} accountData - Account data object containing account_name, institution, type, etc.
 * @returns {Promise} - Promise resolving to the created account object
 */
export const createAccount = async (accountData) => {
  try {
    const response = await fetchWithAuth('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create account');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

/**
 * Update an existing account
 * @param {number} accountId - ID of the account to update
 * @param {Object} accountData - Updated account data
 * @returns {Promise} - Promise resolving to the updated account object
 */
export const updateAccount = async (accountId, accountData) => {
  try {
    const response = await fetchWithAuth(`/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(accountData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update account');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

/**
 * Delete an account
 * @param {number} accountId - ID of the account to delete
 * @returns {Promise} - Promise resolving when account is deleted
 */
export const deleteAccount = async (accountId) => {
  try {
    const response = await fetchWithAuth(`/accounts/${accountId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || 'Failed to delete account');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

/**
 * Fetch all accounts for the authenticated user
 * @returns {Promise} - Promise resolving to an array of account objects
 */
export const fetchAccounts = async () => {
  try {
    const response = await fetchWithAuth('/accounts');
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || 'Failed to fetch accounts');
    }
    
    const data = await response.json();
    return data.accounts || [];
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
};

/**
 * Fetch a single account by ID
 * @param {number} accountId - ID of the account to fetch
 * @returns {Promise} - Promise resolving to the account object
 */
export const fetchAccountById = async (accountId) => {
  try {
    const response = await fetchWithAuth(`/accounts/${accountId}`);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || 'Failed to fetch account');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching account:', error);
    throw error;
  }
};

/**
 * Fetch all accounts for the authenticated user WITH detailed calculated metrics
 * and nested basic position info.
 * @returns {Promise<Array>} - Promise resolving to an array of detailed account objects
 */
export const fetchAccountsWithDetails = async () => {
  try {
    // Ensure this path matches the new endpoint in main.py
    const response = await fetchWithAuth('/accounts/all/detailed');

    if (!response.ok) {
      const errorData = await response.text();
      console.error("fetchAccountsWithDetails raw error:", errorData);
      // Try parsing as JSON, fallback to text
      let detail = errorData;
      try {
        const jsonError = JSON.parse(errorData);
        detail = jsonError.detail || JSON.stringify(jsonError);
      } catch(e) {
        // Keep text error if JSON parse fails
      }
      throw new Error(`Failed to fetch detailed accounts: ${response.status} ${detail}`);
    }

    const data = await response.json();
    // The response structure should be { accounts: [...] } based on AccountsDetailedResponse
    if (!data || !Array.isArray(data.accounts)) {
        console.warn("Unexpected data format received from /accounts/all/detailed:", data);
        return []; // Return empty array if format is wrong
    }
    return data.accounts;
  } catch (error) {
    console.error('Error fetching detailed accounts:', error);
    // Re-throw the error so the component's catch block can handle it
    throw error;
  }
};

/**
 * Fetch all accounts with their unified position data
 * This combines account details with position data in a single method
 * @param {string} assetType - Optional filter for asset type
 * @param {number} accountId - Optional filter for a specific account
 * @returns {Promise<Array>} - Promise resolving to array of accounts with position data
 */
export const fetchAccountsWithAllPositions = async (assetType = null, accountId = null) => {
  try {
    // Step 1: Fetch basic account details
    const accounts = await fetchAccountsWithDetails();
    
    // Step 2: Fetch all unified positions
    const allPositions = await fetchUnifiedPositions(assetType, accountId);
    
    // Step 3: Group positions by account ID
    const positionsByAccount = {};
    
    allPositions.forEach(position => {
      const accountId = position.account_id;
      
      if (!positionsByAccount[accountId]) {
        positionsByAccount[accountId] = {
          positions: [],
          total_value: 0,
          total_cost_basis: 0,
          total_gain_loss: 0,
          positions_count: 0,
          cash_balance: 0
        };
      }
      
      // Add position to the account's positions array
      positionsByAccount[accountId].positions.push(position);
      
      // Update account metrics
      positionsByAccount[accountId].positions_count++;
      
      const currentValue = parseFloat(position.current_value || 0);
      const costBasis = parseFloat(position.total_cost_basis || 0);
      
      positionsByAccount[accountId].total_value += currentValue;
      positionsByAccount[accountId].total_cost_basis += costBasis;
      positionsByAccount[accountId].total_gain_loss += (currentValue - costBasis);
      
      // Track cash balance separately
      if (position.asset_type === 'cash') {
        positionsByAccount[accountId].cash_balance += currentValue;
      }
    });
    
    // Step 4: Merge account data with position data
    const enrichedAccounts = accounts.map(account => {
      const positionData = positionsByAccount[account.id] || {
        positions: [],
        total_value: 0,
        total_cost_basis: 0,
        total_gain_loss: 0,
        positions_count: 0,
        cash_balance: account.cash_balance || 0
      };
      
      // Calculate gain/loss percent
      const gainLossPercent = positionData.total_cost_basis > 0 
        ? (positionData.total_gain_loss / positionData.total_cost_basis) * 100 
        : 0;
      
      // Return enhanced account object
      return {
        ...account,
        positions: positionData.positions,
        total_value: positionData.total_value,
        total_cost_basis: positionData.total_cost_basis,
        total_gain_loss: positionData.total_gain_loss,
        total_gain_loss_percent: gainLossPercent,
        positions_count: positionData.positions_count,
        cash_balance: positionData.cash_balance
      };
    });
    
    // If accountId filter is provided, return only that account
    if (accountId) {
      const filteredAccount = enrichedAccounts.find(acc => acc.id === accountId);
      return filteredAccount ? [filteredAccount] : [];
    }
    
    return enrichedAccounts;
  } catch (error) {
    console.error('Error fetching accounts with positions:', error);
    throw error;
  }
};