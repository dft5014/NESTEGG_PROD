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
      case 'cash':  
        endpoint = `/cash/${accountId}`;
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
    } else if (type === 'cash' && data.positions) {
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
    const [securities, crypto, metals, cash, realEstate] = await Promise.allSettled([
      fetchPositionsByType(accountId, 'security'),
      fetchPositionsByType(accountId, 'crypto'),
      fetchPositionsByType(accountId, 'metal'),
      fetchPositionsByType(accountId, 'cash'),
      fetchPositionsByType(accountId, 'realestate')
    ]);
    
    return {
      securities: securities.status === 'fulfilled' ? securities.value : [],
      crypto: crypto.status === 'fulfilled' ? crypto.value : [],
      metals: metals.status === 'fulfilled' ? metals.value : [],
      cash: cash.status === 'fulfilled' ? cash.value : [],
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
      case 'cash':  
        endpoint = `/cash/${positionId}`;
        break;
      case 'security':
      default:
        endpoint = `/positions/${positionId}`;
        break;
    }
    
    // Try PATCH first, fallback to PUT if needed
    const response = await fetchWithAuth(endpoint, {
      method: 'PATCH',  // Changed from PUT to PATCH
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
      case 'cash':
        endpoint = `/cash/${positionId}`;
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

/**
 * Fetch all security positions for the user, enriched with account details.
 * Assumes a backend endpoint like '/positions/all/detailed' exists.
 * This is isolated for testing purposes.
 * @returns {Promise<Array>} - Promise resolving to an array of enriched position objects.
 * Each object should include position details AND account details (e.g., account_name).
 */
export const fetchAllPositionsWithDetails = async () => {
  console.log("Using testPositionMethods.fetchAllPositionsWithDetails"); // Log for confirmation
  try {
    // *** NOTE: Adjust '/positions/all/detailed' if your actual backend endpoint is different ***
    // This endpoint needs to return ALL positions for the user, joined with account_name etc.
    const response = await fetchWithAuth('/positions/all/detailed');

    if (!response.ok) {
      const errorText = await response.text();
      console.error("testPositionMethods fetch error:", response.status, errorText);
      throw new Error(`Failed to fetch all positions: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Assuming the backend returns data in the shape { positions: [...] }
    if (data && Array.isArray(data.positions)) {
       // Perform basic data cleaning/transformation
       return data.positions.map(pos => ({
         ...pos,
         // Ensure critical numeric fields are numbers
         shares: parseFloat(pos.shares || 0),
         price: parseFloat(pos.price || 0),
         cost_basis: parseFloat(pos.cost_basis || pos.price || 0), // Default cost_basis to price if null
         value: parseFloat(pos.value || (pos.shares * pos.price) || 0), // Use calculated value or calculate
         // Ensure IDs are numbers if needed downstream
         id: parseInt(pos.id),
         account_id: parseInt(pos.account_id || pos.accountId), // Allow for different key names
         // Ensure account_name exists
         account_name: pos.account_name || 'Unknown Account',
         // Format date (optional, could be done in component)
         purchase_date: pos.purchase_date ? new Date(pos.purchase_date).toISOString().split('T')[0] : null,
       }));
    } else {
       console.warn("testPositionMethods: Unexpected data format received:", data);
       return []; // Return empty array on unexpected format
    }

  } catch (error) {
    console.error('Error in testPositionMethods.fetchAllPositionsWithDetails:', error);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
};

/**
 * Fetch all crypto positions for the user, enriched with account details.
 * Assumes a backend endpoint like '/crypto/all/detailed' exists.
 * @returns {Promise<Array>} - Promise resolving to an array of enriched crypto position objects.
 */
export const fetchAllCryptoWithDetails = async () => {
    console.log("Using testPositionMethods.fetchAllCryptoWithDetails");
    try {
      // *** Call the NEW backend endpoint ***
      const response = await fetchWithAuth('/crypto/all/detailed');
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("testPositionMethods (Crypto) fetch error:", response.status, errorText);
        throw new Error(`Failed to fetch all crypto positions: ${response.status} ${errorText}`);
      }
  
      const data = await response.json();
  
      // Assuming the backend returns data in the shape { crypto_positions: [...] }
      // Adjust data.crypto_positions if your backend returns a different structure
      if (data && Array.isArray(data.crypto_positions)) {
         // Perform basic data cleaning/transformation if needed (similar to securities)
          return data.crypto_positions.map(pos => ({
              ...pos,
              quantity: parseFloat(pos.quantity || 0),
              purchase_price: parseFloat(pos.purchase_price || 0),
              current_price: parseFloat(pos.current_price || 0),
              total_value: parseFloat(pos.total_value || 0), // Use pre-calculated if available
              gain_loss: parseFloat(pos.gain_loss || 0),
              gain_loss_percent: parseFloat(pos.gain_loss_percent || 0),
              account_id: parseInt(pos.account_id || pos.accountId || 0),
              tags: Array.isArray(pos.tags) ? pos.tags : [], // Ensure tags is an array
          }));
      } else {
         console.warn("fetchAllCryptoWithDetails: Unexpected data format received:", data);
         return [];
      }
  
    } catch (error) {
      console.error('Error in testPositionMethods.fetchAllCryptoWithDetails:', error);
      throw error;
    }
  };

/**
 * [TEST VERSION] Fetch all metal positions for the user, enriched with account details.
 * Assumes a backend endpoint like '/metals/all/detailed' exists.
 * @returns {Promise<Array>} - Promise resolving to an array of enriched metal position objects.
 */
export const fetchAllMetalsWithDetails = async () => {
    console.log("Using testPositionMethods.fetchAllMetalsWithDetails");
    try {
      const response = await fetchWithAuth('/metals/all/detailed'); // Call the new metals endpoint
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("testPositionMethods (Metals) fetch error:", response.status, errorText);
        throw new Error(`Failed to fetch all metal positions: ${response.status} ${errorText}`);
      }
  
      const data = await response.json();
  
      // Assuming the backend returns data in the shape { metal_positions: [...] }
      if (data && Array.isArray(data.metal_positions)) {
         return data.metal_positions.map(pos => ({
             ...pos,
             // Ensure numeric types if necessary (Python endpoint should handle this with Pydantic)
             quantity: parseFloat(pos.quantity || 0),
             purchase_price: parseFloat(pos.purchase_price || 0),
             cost_basis: parseFloat(pos.cost_basis || 0),
             current_price_per_unit: parseFloat(pos.current_price_per_unit || 0),
             total_value: parseFloat(pos.total_value || 0),
             gain_loss: parseFloat(pos.gain_loss || 0),
             gain_loss_percent: parseFloat(pos.gain_loss_percent || 0),
             account_id: parseInt(pos.account_id || pos.accountId || 0),
         }));
      } else {
         console.warn("fetchAllMetalsWithDetails: Unexpected data format received:", data);
         return [];
      }
  
    } catch (error) {
      console.error('Error in testPositionMethods.fetchAllMetalsWithDetails:', error);
      throw error;
    }
  };

/**
 * [TEST VERSION] Fetch all real estate positions for the user, enriched with account details.
 * Assumes a backend endpoint like '/realestate/all/detailed' exists.
 * @returns {Promise<Array>} - Promise resolving to an array of enriched real estate position objects.
 */
export const fetchAllRealEstateWithDetails = async () => {
    console.log("Using testPositionMethods.fetchAllRealEstateWithDetails");
    try {
      const response = await fetchWithAuth('/realestate/all/detailed'); // Call the new real estate endpoint
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("testPositionMethods (Real Estate) fetch error:", response.status, errorText);
        throw new Error(`Failed to fetch all real estate positions: ${response.status} ${errorText}`);
      }
  
      const data = await response.json();
  
      // Assuming the backend returns data in the shape { real_estate_positions: [...] }
      if (data && Array.isArray(data.real_estate_positions)) {
         return data.real_estate_positions.map(pos => ({
             ...pos,
              // Ensure numeric types if necessary
              purchase_price: parseFloat(pos.purchase_price || 0),
              estimated_value: parseFloat(pos.estimated_value || 0),
              gain_loss: parseFloat(pos.gain_loss || 0),
              gain_loss_percent: parseFloat(pos.gain_loss_percent || 0),
             account_id: parseInt(pos.account_id || pos.accountId || 0),
         }));
      } else {
         console.warn("fetchAllRealEstateWithDetails: Unexpected data format received:", data);
         return [];
      }
  
    } catch (error) {
      console.error('Error in testPositionMethods.fetchAllRealEstateWithDetails:', error);
      throw error;
    }
  };

/**
 * [TEST VERSION] Fetch overall portfolio summary metrics.
 * Assumes backend endpoint '/portfolio/summary/all'.
 * @returns {Promise<object>} - Promise resolving to summary data.
 */
export const fetchPortfolioSummary = async () => {
    console.log("Using testPositionMethods.fetchPortfolioSummary");
    try {
      // *** Make sure this endpoint matches your backend ***
      const response = await fetchWithAuth('/portfolio/summary/all');
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("testPositionMethods (Summary) fetch error:", response.status, errorText);
        throw new Error(`Failed to fetch portfolio summary: ${response.status} ${errorText}`);
      }
  
      const data = await response.json();
      return data; // Expecting object like { total_value, total_cost_basis, ... }
  
    } catch (error) {
      console.error('Error in testPositionMethods.fetchPortfolioSummary:', error);
      throw error;
    }
  };

  /**
 * Fetch cash positions for a specific account
 * @param {number} accountId - ID of the account to fetch cash positions for
 * @returns {Promise} - Promise resolving to an array of cash position objects
 */
export const fetchCashPositions = async (accountId) => {
  try {
    const response = await fetchWithAuth(`/cash/${accountId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch cash positions for account ${accountId}`);
    }
    
    const data = await response.json();
    return data.cash_positions || [];
  } catch (error) {
    console.error(`Error fetching cash positions for account ${accountId}:`, error);
    throw error;
  }
};

/**
 * Add a cash position to an account
 * @param {number} accountId - ID of the account to add position to
 * @param {Object} cashData - Cash position data
 * @returns {Promise} - Promise resolving to the created position object
 */
export const addCashPosition = async (accountId, cashData) => {
  try {
    const response = await fetchWithAuth(`/cash/${accountId}`, {
      method: 'POST',
      body: JSON.stringify(cashData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add cash position');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding cash position:', error);
    throw error;
  }
};

/**
 * Update an existing cash position
 * @param {number} positionId - ID of the position to update
 * @param {Object} cashData - Updated cash position data
 * @returns {Promise} - Promise resolving to the updated position object
 */
export const updateCashPosition = async (positionId, cashData) => {
  try {
    const response = await fetchWithAuth(`/cash/${positionId}`, {
      method: 'PUT',
      body: JSON.stringify(cashData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update cash position');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating cash position:', error);
    throw error;
  }
};

/**
 * Delete a cash position
 * @param {number} positionId - ID of the position to delete
 * @returns {Promise} - Promise resolving when position is deleted
 */
export const deleteCashPosition = async (positionId) => {
  try {
    const response = await fetchWithAuth(`/cash/${positionId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete cash position');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting cash position:', error);
    throw error;
  }
};

/**
 * Fetch all cash positions for the user, enriched with account details
 * @returns {Promise<Array>} - Promise resolving to array of enriched cash positions
 */
export const fetchAllCashWithDetails = async () => {
  try {
    const response = await fetchWithAuth('/cash/all/detailed');
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch all cash positions: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data && Array.isArray(data.cash_positions)) {
      return data.cash_positions;
    } else {
      console.warn("fetchAllCashWithDetails: Unexpected data format received:", data);
      return [];
    }
  } catch (error) {
    console.error('Error in fetchAllCashWithDetails:', error);
    throw error;
  }
};

/**
 * Fetch all positions from the unified view for the authenticated user
 * Optional filtering by asset type or account
 * @param {string} assetType - Optional filter for asset type ('security', 'crypto', 'metal', 'cash')
 * @param {number} accountId - Optional filter for a specific account
 * @returns {Promise<Array>} - Promise resolving to an array of position objects
 */
export const fetchUnifiedPositions = async (assetType = null, accountId = null) => {
  try {
    // Build the query string for optional filters
    let queryParams = [];
    if (assetType) {
      queryParams.push(`asset_type=${encodeURIComponent(assetType)}`);
    }
    if (accountId) {
      queryParams.push(`account_id=${encodeURIComponent(accountId)}`);
    }
    
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    const response = await fetchWithAuth(`/positions/unified${queryString}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch unified positions');
    }
    
    const data = await response.json();
    return data.positions || [];
  } catch (error) {
    console.error('Error fetching unified positions:', error);
    // Return empty array instead of throwing to improve resilience
    return [];
  }
};

/**
 * Fetch all positions from all asset types using the unified view
 * Groups results by asset type for easier handling in components
 * @returns {Promise<Object>} - Promise resolving to an object with positions grouped by asset type
 */
export const fetchAllUnifiedPositionsByType = async () => {
  try {
    const allPositions = await fetchUnifiedPositions();
    
    // Group positions by asset type
    const grouped = {
      securities: allPositions.filter(pos => pos.asset_type === 'security'),
      crypto: allPositions.filter(pos => pos.asset_type === 'crypto'),
      metals: allPositions.filter(pos => pos.asset_type === 'metal'),
      cash: allPositions.filter(pos => pos.asset_type === 'cash'),
      // Add other types as needed
    };
    
    return grouped;
  } catch (error) {
    console.error('Error fetching all unified positions by type:', error);
    return {
      securities: [],
      crypto: [],
      metals: [],
      cash: []
    };
  }
};

/**
 * Fetch all positions for a specific account using the unified view
 * @param {number} accountId - ID of the account to fetch positions for
 * @returns {Promise<Array>} - Promise resolving to an array of position objects
 */
export const fetchUnifiedPositionsForAccount = async (accountId) => {
  if (!accountId) {
    console.error('Account ID is required for fetchUnifiedPositionsForAccount');
    return [];
  }
  
  return await fetchUnifiedPositions(null, accountId);
};

/**
 * Fetch positions of a specific type for a specific account using the unified view
 * @param {number} accountId - ID of the account 
 * @param {string} assetType - Type of position ('security', 'crypto', 'metal', 'cash')
 * @returns {Promise<Array>} - Promise resolving to an array of position objects
 */
export const fetchUnifiedPositionsByTypeForAccount = async (accountId, assetType) => {
  if (!accountId) {
    console.error('Account ID is required for fetchUnifiedPositionsByTypeForAccount');
    return [];
  }
  
  if (!assetType) {
    console.error('Asset type is required for fetchUnifiedPositionsByTypeForAccount');
    return [];
  }
  
  return await fetchUnifiedPositions(assetType, accountId);
};

/**
/**
 * Search for FX assets (crypto, metals, etc.)
 * @param {string} query - Search query string (symbol or name)
 * @param {string} assetType - Type of asset to search for (crypto, metal, currency)
 * @returns {Promise} - Promise resolving to an array of asset objects
 */
export const searchFXAssets = async (query, assetType = 'crypto') => {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetchWithAuth(`/fx/search?query=${encodeURIComponent(query)}&asset_type=${assetType}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'FX asset search failed');
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching FX assets:', error);
    throw error;
  }
};

/**
 * Fetch all other assets for the user
 * @returns {Promise<Object>} - Promise resolving to object with assets array, total value, and summary
 */
export const fetchOtherAssets = async () => {
  try {
    const response = await fetchWithAuth('/other-assets');
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch other assets');
    }
    
    const data = await response.json();
    return {
      assets: data.other_assets || [],
      totalValue: data.total_value || 0,
      summaryByType: data.summary_by_type || {}
    };
  } catch (error) {
    console.error('Error fetching other assets:', error);
    throw error;
  }
};

/**
 * Fetch a specific other asset
 * @param {string} assetId - ID of the asset to fetch
 * @returns {Promise<Object>} - Promise resolving to the asset object
 */
export const fetchOtherAsset = async (assetId) => {
  try {
    const response = await fetchWithAuth(`/other-assets/${assetId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch other asset');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching other asset ${assetId}:`, error);
    throw error;
  }
};

/**
 * Add a new other asset
 * @param {Object} assetData - Asset data (asset_name, asset_type, cost, purchase_date, current_value, notes)
 * @returns {Promise<Object>} - Promise resolving to the created asset object
 */
export const addOtherAsset = async (assetData) => {
  try {
    const response = await fetchWithAuth('/other-assets', {
      method: 'POST',
      body: JSON.stringify(assetData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add other asset');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding other asset:', error);
    throw error;
  }
};

/**
 * Update an existing other asset
 * @param {string} assetId - ID of the asset to update
 * @param {Object} assetData - Updated asset data (any fields can be updated)
 * @returns {Promise<Object>} - Promise resolving to the update result
 */
export const updateOtherAsset = async (assetId, assetData) => {
  try {
    const response = await fetchWithAuth(`/other-assets/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(assetData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update other asset');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating other asset ${assetId}:`, error);
    throw error;
  }
};

/**
 * Update just the value of an other asset (simplified workflow)
 * @param {string} assetId - ID of the asset to update
 * @param {number} newValue - New current value
 * @returns {Promise<Object>} - Promise resolving to the update result with change info
 */
export const updateOtherAssetValue = async (assetId, newValue) => {
  try {
    const response = await fetchWithAuth(`/other-assets/${assetId}/value`, {
      method: 'PUT',
      body: JSON.stringify({ current_value: newValue })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update asset value');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating asset value for ${assetId}:`, error);
    throw error;
  }
};

/**
 * Delete an other asset (soft delete)
 * @param {string} assetId - ID of the asset to delete
 * @returns {Promise<Object>} - Promise resolving to deletion result
 */
export const deleteOtherAsset = async (assetId) => {
  try {
    const response = await fetchWithAuth(`/other-assets/${assetId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete other asset');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error deleting other asset ${assetId}:`, error);
    throw error;
  }
};

/**
 * Get valid asset types for other assets
 * @returns {Array<Object>} - Array of asset type objects with value and label
 */
export const getOtherAssetTypes = () => {
  return [
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'collectible', label: 'Collectible' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'art', label: 'Art' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'other', label: 'Other' }
  ];
};

/**
 * Get asset name suggestions based on asset type
 * @param {string} assetType - The asset type
 * @returns {Array<string>} - Array of suggested names
 */
export const getAssetNameSuggestions = (assetType) => {
  const suggestions = {
    real_estate: [
      'Primary Residence',
      'Vacation Home - Lake Tahoe',
      'Rental Property - Main St',
      'Investment Property',
      'Commercial Building'
    ],
    vehicle: [
      '2019 Tesla Model 3',
      '2018 Honda CRV',
      '1967 Mustang Classic',
      'Motorcycle - Harley Davidson',
      'RV - Winnebago'
    ],
    collectible: [
      'Baseball Card Collection',
      'Vintage Watch Collection',
      'Comic Book Collection',
      'Coin Collection',
      'Stamp Collection'
    ],
    jewelry: [
      'Wedding Ring Set',
      'Rolex Submariner',
      'Diamond Necklace',
      'Antique Jewelry Collection',
      'Gold Bracelet'
    ],
    art: [
      'Monet Print Collection',
      'Local Artist Paintings',
      'Sculpture Collection',
      'Photography Collection',
      'Digital Art NFTs'
    ],
    equipment: [
      'Home Gym Equipment',
      'Photography Gear',
      'Workshop Tools',
      'Musical Instruments',
      'Computer Equipment'
    ],
    other: [
      'Wine Collection',
      'Designer Handbags',
      'Musical Instruments',
      'Antique Furniture',
      'Sports Memorabilia'
    ]
  };
  
  return suggestions[assetType] || [];
};

/**
 * Format currency value for display
 * @param {number} value - The value to format
 * @returns {string} - Formatted currency string
 */
export const formatAssetValue = (value) => {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Fetch all liabilities for the user
 * @returns {Promise<Object>} - Promise resolving to object with liabilities array, total balance, and summary
 */
export const fetchLiabilities = async () => {
  try {
    const response = await fetchWithAuth('/liabilities');
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch liabilities');
    }
    
    const data = await response.json();
    return {
      liabilities: data.liabilities || [],
      totalBalance: data.total_balance || 0,
      summaryByType: data.summary_by_type || {}
    };
  } catch (error) {
    console.error('Error fetching liabilities:', error);
    throw error;
  }
};

/**
 * Fetch a specific liability
 * @param {string} liabilityId - ID of the liability to fetch
 * @returns {Promise<Object>} - Promise resolving to the liability object
 */
export const fetchLiability = async (liabilityId) => {
  try {
    const response = await fetchWithAuth(`/liabilities/${liabilityId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch liability');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching liability ${liabilityId}:`, error);
    throw error;
  }
};

/**
 * Add a new liability
 * @param {Object} liabilityData - Liability data (name, liability_type, current_balance, etc.)
 * @returns {Promise<Object>} - Promise resolving to the created liability object
 */
export const addLiability = async (liabilityData) => {
  try {
    const response = await fetchWithAuth('/liabilities', {
      method: 'POST',
      body: JSON.stringify(liabilityData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add liability');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding liability:', error);
    throw error;
  }
};

/**
 * Update an existing liability
 * @param {string} liabilityId - ID of the liability to update
 * @param {Object} liabilityData - Updated liability data (any fields can be updated)
 * @returns {Promise<Object>} - Promise resolving to the update result
 */
export const updateLiability = async (liabilityId, liabilityData) => {
  try {
    const response = await fetchWithAuth(`/liabilities/${liabilityId}`, {
      method: 'PUT',
      body: JSON.stringify(liabilityData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update liability');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating liability ${liabilityId}:`, error);
    throw error;
  }
};

/**
 * Update just the balance of a liability (simplified workflow)
 * @param {string} liabilityId - ID of the liability to update
 * @param {number} newBalance - New current balance
 * @returns {Promise<Object>} - Promise resolving to the update result with change info
 */
export const updateLiabilityBalance = async (liabilityId, newBalance) => {
  try {
    const response = await fetchWithAuth(`/liabilities/${liabilityId}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ current_balance: newBalance })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update liability balance');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating liability balance for ${liabilityId}:`, error);
    throw error;
  }
};

/**
 * Delete a liability (soft delete)
 * @param {string} liabilityId - ID of the liability to delete
 * @returns {Promise<Object>} - Promise resolving to deletion result
 */
export const deleteLiability = async (liabilityId) => {
  try {
    const response = await fetchWithAuth(`/liabilities/${liabilityId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete liability');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error deleting liability ${liabilityId}:`, error);
    throw error;
  }
};

/**
 * Get valid liability types
 * @returns {Array<Object>} - Array of liability type objects with value and label
 */
export const getLiabilityTypes = () => {
  return [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'auto_loan', label: 'Auto Loan' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'student_loan', label: 'Student Loan' },
    { value: 'home_equity', label: 'Home Equity' },
    { value: 'other', label: 'Other' }
  ];
};

/**
 * Format liability balance for display with appropriate negative sign
 * @param {number} balance - The balance to format
 * @returns {string} - Formatted balance string
 */
export const formatLiabilityBalance = (balance) => {
  if (balance === null || balance === undefined) return '-$0';
  // Liabilities are negative values for net worth, so show with negative sign
  return `-$${Math.abs(balance).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};