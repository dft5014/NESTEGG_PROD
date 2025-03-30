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