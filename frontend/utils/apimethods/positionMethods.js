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

// Optimized fetchPositionsByType in positionMethods.js
export const fetchPositionsByType = async (accountId, type = 'security') => {
  if (!accountId) {
    console.error('Account ID is required for fetchPositionsByType');
    return [];
  }

  try {
    let endpoint = '';
    
    // Determine the correct endpoint based on position type
    switch (type) {
      case 'crypto':
        endpoint = `/crypto/${accountId}`;
        break;
      case 'metal':
        endpoint = `/metals/${accountId}`;
        break;
      case 'realestate':
        endpoint = `/realestate/${accountId}`;
        break;
      case 'security':
      default:
        endpoint = `/positions/${accountId}`;
        break;
    }
    
    const response = await fetchWithAuth(endpoint);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch ${type} positions for account ${accountId}`);
    }
    
    const data = await response.json();
    
    // Handle different response structures based on position type
    if (type === 'crypto' && data.positions) {
      return data.positions || [];
    } else if (type === 'metal' && data.positions) {
      return data.positions || [];
    } else if (type === 'realestate' && data.positions) {
      return data.positions || [];
    } else if (data.positions) {
      return data.positions || [];
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn(`Unexpected response format for ${type} positions:`, data);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching ${type} positions for account ${accountId}:`, error);
    // Return empty array instead of throwing to improve resilience
    return [];
  }
};

// Add this as a utility function to the positionMethods.js file
export const fetchAllPositionTypes = async (accountId) => {
  try {
    const [securities, crypto, metals, realEstate] = await Promise.allSettled([
      fetchPositionsByType(accountId, 'security'),
      fetchPositionsByType(accountId, 'crypto'),
      fetchPositionsByType(accountId, 'metal'),
      fetchPositionsByType(accountId, 'realestate')
    ]);
    
    return {
      securities: securities.status === 'fulfilled' ? securities.value : [],
      crypto: crypto.status === 'fulfilled' ? crypto.value : [],
      metals: metals.status === 'fulfilled' ? metals.value : [],
      realEstate: realEstate.status === 'fulfilled' ? realEstate.value : []
    };
  } catch (error) {
    console.error(`Error fetching all position types for account ${accountId}:`, error);
    throw error;
  }
};

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

// Add this function to positionMethods.js or a new utility file
export const getDefaultAccountForPositionType = async (positionType, userId) => {
  switch (positionType) {
    case 'realestate':
      // Find or create a default "Real Estate Portfolio" account
      return await findOrCreateDefaultAccount(
        userId, 
        "Real Estate Portfolio",
        "realestate"
      );
    // Add other defaults as needed
    default:
      return null; // No default, require selection
  }
};

// Helper function to find or create default accounts
const findOrCreateDefaultAccount = async (userId, accountName, accountCategory) => {
  try {
    // Try to find an existing default account
    const response = await fetchWithAuth('/accounts');
    if (response.ok) {
      const data = await response.json();
      const existingAccount = data.accounts.find(
        account => account.account_name === accountName
      );
      
      if (existingAccount) {
        return existingAccount;
      }
    }
    
    // If not found, create the default account
    const createResponse = await fetchWithAuth('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        account_name: accountName,
        institution: "Default",
        type: "Portfolio",
        account_category: accountCategory,
        balance: 0
      })
    });
    
    if (createResponse.ok) {
      const newAccount = await createResponse.json();
      return { id: newAccount.account_id, account_name: accountName };
    }
    
    throw new Error("Failed to create default account");
  } catch (error) {
    console.error("Error getting default account:", error);
    throw error;
  }
};