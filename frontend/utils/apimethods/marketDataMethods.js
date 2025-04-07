// utils/apimethods/marketDataMethods.js
import { fetchWithAuth } from '@/utils/api';


export const fetchDashboardData = async (symbols) => {
    console.log("API CALL (mock): fetchDashboardData for symbols:", symbols);
    // Example: GET /api/marketdata/quotes?symbols=SPX,DJI,BTC,GC=F,^TNX
    // const response = await fetch(`/api/marketdata/quotes?symbols=${symbols.join(',')}`);
    // if (!response.ok) {
    //   throw new Error('Failed to fetch dashboard data');
    // }
    // const data = await response.json();
    // return data; // Should return an object like { SPX: {...}, DJI: {...}, ... }

    // --- Mock Implementation ---
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    // Return mock data matching the structure needed
     const mockData = {
         "SPX": { price: "5,990.10", change1d: -0.45, /* other changes */ },
         "DJI": { price: "43,495.50", change1d: 0.12, /* other changes */ },
         "BTC": { price: "$94,105.00", change1d: -1.80, /* other changes */ },
         "GC=F": { price: "$2,455.80", change1d: 0.25, /* other changes */ },
         "TNX": { price: "4.385%", change1d: -0.04, /* other changes */ },
    };
    // Only return data for requested symbols
    const result = symbols.reduce((acc, symbol) => {
        if (mockData[symbol]) {
            acc[symbol] = mockData[symbol];
        }
        return acc;
    }, {});
    return result;
    // --- End Mock ---
};

export const fetchHistoricalData = async (symbol, timeframe) => {
    console.log(`API CALL (mock): fetchHistoricalData for ${symbol}, timeframe: ${timeframe}`);
    // Example: GET /api/marketdata/history?symbol=SPX&period=1y
    // const response = await fetch(`/api/marketdata/history?symbol=${symbol}&period=${timeframe}`);
    // if (!response.ok) {
    //   throw new Error(`Failed to fetch historical data for ${symbol}`);
    // }
    // const data = await response.json();
    // return data; // Should return an object like { labels: [...], data: [...] }

     // --- Mock Implementation ---
     await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay

     // Generate simple mock based on timeframe
     const points = { '1d': 24, '1w': 7, 'ytd': new Date().getMonth() + 1, '1y': 12, '2y': 24, '3y': 36 }[timeframe] || 10;
     const labels = Array.from({ length: points }, (_, i) => `Label ${i + 1}`); // Replace with actual date labels
     const data = Array.from({ length: points }, () => 100 + Math.random() * 20 - 10); // Very basic random data

     // Simulate failure sometimes for testing
     // if (Math.random() > 0.8) {
     //    throw new Error(`Mock API Error for ${symbol}`);
     // }

     return { labels, data };
    // --- End Mock ---
};

// Add other potential API methods like search
export const searchMarketData = async (query) => {
    console.log(`API CALL (mock): searchMarketData for query: ${query}`);
    // Example: GET /api/marketdata/search?query=Apple
    // ... fetch logic ...
    // return results; // e.g., [{ symbol: 'AAPL', name: 'Apple Inc.' }, ...]

    // --- Mock Implementation ---
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockResults = [
         { symbol: 'AAPL', name: 'Apple Inc.' },
         { symbol: 'MSFT', name: 'Microsoft Corp.' },
         { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)' },
         { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
    ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()) || item.symbol.toLowerCase().includes(query.toLowerCase()));
    return mockResults;
    // --- End Mock ---
}

/**
 * Trigger an update of all security prices
 * @returns {Promise} - Promise resolving to the update result
 */
export const triggerPriceUpdate = async () => {
    try {
      console.log("API CALL: Triggering price update");
      const response = await fetchWithAuth('/market/update-prices-v2', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update prices');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating prices:', error);
      throw error;
    }
  };
  
  /**
   * Trigger an update of all company metrics
   * @returns {Promise} - Promise resolving to the update result
   */
  export const triggerMetricsUpdate = async () => {
    try {
      console.log("API CALL: Triggering metrics update");
      const response = await fetchWithAuth('/market/update-metrics', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update metrics');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating metrics:', error);
      throw error;
    }
  };
  
  /**
   * Trigger an update of historical prices
   * @param {number} days - Number of days of history to update
   * @returns {Promise} - Promise resolving to the update result
   */
  export const triggerHistoryUpdate = async (days = 30) => {
    try {
      console.log(`API CALL: Triggering history update for ${days} days`);
      const response = await fetchWithAuth(`/market/update-history?days=${days}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update historical prices');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating historical prices:', error);
      throw error;
    }
  };
  
  /**
   * Update a specific security
   * @param {string} ticker - The ticker symbol to update
   * @param {Object} updateData - Update parameters
   * @param {string} updateData.update_type - Type of update: 'metrics', 'current_price', or 'history'
   * @param {number} [updateData.days] - Days of history to update (for 'history' type)
   * @returns {Promise} - Promise resolving to the update result
   */
  export const updateSpecificSecurity = async (ticker, updateData) => {
    try {
      console.log(`API CALL: Updating specific security ${ticker} with type ${updateData.update_type}`);
      const response = await fetchWithAuth(`/securities/${ticker}/update`, {
        method: 'POST',
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to update ${ticker}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error updating security ${ticker}:`, error);
      throw error;
    }
  };

  /**
 * Add a new security to track
 * @param {Object} securityData - Security data object
 * @param {string} securityData.ticker - Ticker symbol to add
 * @returns {Promise} - Promise resolving to the created security object
 */
export const addSecurity = async (securityData) => {
    try {
      console.log("API CALL: Adding security", securityData);
      const response = await fetchWithAuth('/securities', {
        method: 'POST',
        body: JSON.stringify(securityData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add security');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adding security:', error);
      throw error;
    }
  };