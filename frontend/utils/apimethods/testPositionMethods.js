// nestegg/frontend/utils/apimethods/testPositionMethods.js
import { fetchWithAuth } from '@/utils/api'; // Assuming fetchWithAuth is in this path

/**
 * [TEST VERSION] Fetch all security positions for the user, enriched with account details.
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