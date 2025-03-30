// frontend/utils/apimethods/portfolioApi.js
import { fetchWithAuth } from '@/utils/api';

/**
 * Fetches the portfolio summary for the logged-in user.
 * @returns {Promise<object|null>} A promise that resolves to the portfolio summary object or null if fetch fails.
 */
export const getPortfolioSummary = async () => {
  try {
      const response = await fetchWithAuth('/portfolio/summary');
      if (!response.ok) {
          console.error(`Failed to fetch portfolio summary: ${response.status}`);
          return null; // Return null instead of throwing for summary failures
      }
      return await response.json();
  } catch (error) {
      console.error("Error fetching portfolio summary:", error);
      return null;
  }
};

/**
 * Triggers the calculation of the current user's portfolio value.
 * @returns {Promise<object>} Server response (e.g., { message, details }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const calculateUserPortfolio = async () => {
    const response = await fetchWithAuth('/portfolios/calculate/user', {
      method: "POST"
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.detail || `HTTP error ${response.status}`);
    }
    return responseData;
};

// Add getPortfolioHistory etc. if needed
// export const getPortfolioHistory = async (period) => { ... };