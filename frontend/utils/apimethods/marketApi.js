// frontend/utils/apimethods/marketApi.js
import { fetchWithAuth } from '@/utils/api';

/**
 * Triggers an update of market prices using the v2 endpoint.
 * @returns {Promise<object>} Server response (e.g., { message, details }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const updateMarketPricesV2 = async () => {
    const response = await fetchWithAuth('/market/update-prices-v2', {
        method: "POST"
    });
    const responseData = await response.json();
    if (!response.ok) {
        throw new Error(responseData.detail || `HTTP error ${response.status}`);
    }
    return responseData;
};

// Add other market update functions if needed (metrics, history, stale)
// export const updateMarketMetrics = async () => { ... };
// export const updateMarketHistory = async (days) => { ... };