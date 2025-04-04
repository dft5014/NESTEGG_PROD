// Placeholder functions for fetching market data
// Replace with actual API calls to your backend

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