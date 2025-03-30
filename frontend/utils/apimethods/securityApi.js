// frontend/utils/apimethods/securityApi.js
import { fetchWithAuth } from '@/utils/api';

/**
 * Searches for securities based on a query string.
 * @param {string} query - The search term (ticker, company name).
 * @returns {Promise<Array>} A promise that resolves to an array of search result objects.
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const searchSecurities = async (query) => {
  if (!query || query.length < 1) {
    return []; // Return empty if query is too short
  }
  
  const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to search securities' }));
    throw new Error(errorData.detail || `HTTP error ${response.status}`);
  }
  const data = await response.json();
  return data.results || []; // Ensure returning an array
};

// Add functions for getSecurityDetails, getSecurityHistory etc. if needed
// export const getSecurityDetails = async (ticker) => { ... };