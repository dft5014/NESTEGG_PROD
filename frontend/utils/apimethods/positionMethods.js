// frontend/utils/apimethods/positionMethods.js
import { fetchWithAuth } from '@/utils/api';

/**
 * Fetch positions for a specific account
 * @param {number} accountId - ID of the account to fetch positions for
 * @returns {Promise} - Promise resolving to an array of position objects
 */
export const fetchPositions = async (accountId) => {
  try {
    const response = await fetchWithAuth(`/positions/${accountId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch positions for account ${accountId}`);
    }
    
    const data = await response.json();
    return data.positions || [];
  } catch (error) {
    console.error(`Error fetching positions for account ${accountId}:`, error);
    throw error;
  }
};

/**
 * Add a security position to an account
 * @param {number} accountId - ID of the account to add position to
 * @param {Object} positionData - Position data (ticker, shares, price, etc.)
 * @returns {Promise} - Promise resolving to the created position object
 */
export const addSecurityPosition = async (accountId, positionData) => {
  try {
    const response = await fetchWithAuth(`/positions/${accountId}`, {
      method: 'POST',
      body: JSON.stringify(positionData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add security position');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding security position:', error);
    throw error;
  }
};

/**
 * Add a cryptocurrency position to an account
 * @param {number} accountId - ID of the account to add position to
 * @param {Object} cryptoData - Crypto position data
 * @returns {Promise} - Promise resolving to the created position object
 */
export const addCryptoPosition = async (accountId, cryptoData) => {
  try {
    const response = await fetchWithAuth(`/crypto/${accountId}`, {
      method: 'POST',
      body: JSON.stringify(cryptoData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add crypto position');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding crypto position:', error);
    throw error;
  }
};

/**
 * Add a precious metal position to an account
 * @param {number} accountId - ID of the account to add position to
 * @param {Object} metalData - Metal position data
 * @returns {Promise} - Promise resolving to the created position object
 */
export const addMetalPosition = async (accountId, metalData) => {
  try {
    const response = await fetchWithAuth(`/metals/${accountId}`, {
      method: 'POST',
      body: JSON.stringify(metalData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add metal position');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding metal position:', error);
    throw error;
  }
};

/**
 * Add a real estate position to an account
 * @param {number} accountId - ID of the account to add position to
 * @param {Object} realEstateData - Real estate position data
 * @returns {Promise} - Promise resolving to the created position object
 */
export const addRealEstatePosition = async (accountId, realEstateData) => {
  try {
    const response = await fetchWithAuth(`/realestate/${accountId}`, {
      method: 'POST',
      body: JSON.stringify(realEstateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add real estate position');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding real estate position:', error);
    throw error;
  }
};

/**
 * Update an existing position
 * @param {number} positionId - ID of the position to update
 * @param {Object} positionData - Updated position data
 * @param {string} type - Type of position ('security', 'crypto', 'metal', 'realestate')
 * @returns {Promise} - Promise resolving to the updated position object
 */
export const updatePosition = async (positionId, positionData, type = 'security') => {
  try {
    let endpoint = '';
    
    // Determine the correct endpoint based on position type
    switch (type) {
      case 'crypto':
        endpoint = `/crypto/${positionId}`;
        break;
      case 'metal':
        endpoint = `/metals/${positionId}`;
        break;
      case 'realestate':
        endpoint = `/realestate/${positionId}`;
        break;
      case 'security':
      default:
        endpoint = `/positions/${positionId}`;
        break;
    }
    
    const response = await fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(positionData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update ${type} position`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating ${type} position:`, error);
    throw error;
  }
};

/**
 * Delete a position
 * @param {number} positionId - ID of the position to delete
 * @param {string} type - Type of position ('security', 'crypto', 'metal', 'realestate')
 * @returns {Promise} - Promise resolving when position is deleted
 */
export const deletePosition = async (positionId, type = 'security') => {
  try {
    let endpoint = '';
    
    // Determine the correct endpoint based on position type
    switch (type) {
      case 'crypto':
        endpoint = `/crypto/${positionId}`;
        break;
      case 'metal':
        endpoint = `/metals/${positionId}`;
        break;
      case 'realestate':
        endpoint = `/realestate/${positionId}`;
        break;
      case 'security':
      default:
        endpoint = `/positions/${positionId}`;
        break;
    }
    
    const response = await fetchWithAuth(endpoint, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to delete ${type} position`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting ${type} position:`, error);
    throw error;
  }
};

/**
 * Search for securities
 * @param {string} query - Search query string (ticker or name)
 * @returns {Promise} - Promise resolving to an array of security objects
 */
export const searchSecurities = async (query) => {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Security search failed');
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching securities:', error);
    throw error;
  }
};