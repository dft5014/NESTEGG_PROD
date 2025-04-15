// Placeholder for fetching user's portfolio summary ("NestEgg") data

export const fetchPortfolioSummary = async () => {
    console.log("API CALL (mock): fetchPortfolioSummary");
    // Example: Could use the existing /portfolio/summary/all endpoint
    // Or a dedicated endpoint: GET /api/portfolio/summary/trends
    // const response = await fetch('/api/portfolio/summary/all'); // Adjust endpoint if needed
    // if (!response.ok) {
    //   throw new Error('Failed to fetch portfolio summary');
    // }
    // const data = await response.json();
    // // Adapt the response data to match the structure needed for the dashboard item
    // return {
    //     price: `$${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, // Format value as price
    //     change1d: data.change1dPercent, // Assuming endpoint provides % changes
    //     change1w: data.change1wPercent,
    //     changeYTD: data.changeYTDPercent,
    //     // ... map other periods if available from the endpoint
    // };

    // --- Mock Implementation ---
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
    return {
        price: "$123,456.78",
        change1d: 0.55,
        change1w: 1.15,
        changeYTD: 7.80,
        change1y: 19.50,
        change2y: 14.20,
        change3y: 30.00,
    };
    // --- End Mock ---
};

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