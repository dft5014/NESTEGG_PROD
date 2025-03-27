import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Clock,
  Bookmark,
  ArrowUpRight,
  Briefcase,
  BarChart4,
  SlidersHorizontal,
  X,
  Plus
} from 'lucide-react';

export default function Securities() {
  const [isLoading, setIsLoading] = useState(true);
  const [securities, setSecurities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOption, setSortOption] = useState("popularity");
  const [watchlistModal, setWatchlistModal] = useState(false);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  
  // Mock security data - in a real app, this would come from an API call
  const mockSecurities = [
    {
      id: "aapl",
      name: "Apple Inc.",
      symbol: "AAPL",
      type: "stock",
      price: 213.07,
      change: 1.25,
      marketCap: "3.5T",
      sector: "Technology",
      popularity: 98,
      description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
      pe: 33.27,
      dividend: 0.52,
      beta: 1.28,
      isWatchlisted: true
    },
    {
      id: "msft",
      name: "Microsoft Corp.",
      symbol: "MSFT",
      type: "stock",
      price: 416.38,
      change: -0.42,
      marketCap: "3.1T",
      sector: "Technology",
      popularity: 96,
      description: "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.",
      pe: 35.82,
      dividend: 0.68,
      beta: 0.93,
      isWatchlisted: false
    },
    {
      id: "amzn",
      name: "Amazon.com Inc.",
      symbol: "AMZN",
      type: "stock",
      price: 179.63,
      change: 1.83,
      marketCap: "1.9T",
      sector: "Consumer Cyclical",
      popularity: 95,
      description: "Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.",
      pe: 61.45,
      dividend: 0,
      beta: 1.22,
      isWatchlisted: true
    },
    {
      id: "nvda",
      name: "NVIDIA Corp.",
      symbol: "NVDA",
      type: "stock",
      price: 122.46,
      change: 3.21,
      marketCap: "3.0T",
      sector: "Technology",
      popularity: 99,
      description: "NVIDIA Corporation provides graphics, and compute and networking solutions in the United States, Taiwan, China, and internationally.",
      pe: 72.15,
      dividend: 0.04,
      beta: 1.75,
      isWatchlisted: false
    },
    {
      id: "vti",
      name: "Vanguard Total Stock Market ETF",
      symbol: "VTI",
      type: "etf",
      price: 252.89,
      change: 0.54,
      marketCap: "386.4B",
      sector: "Broad Market",
      popularity: 91,
      description: "The investment seeks to track the performance of the CRSP US Total Market Index.",
      pe: null,
      dividend: 1.38,
      beta: 1.01,
      isWatchlisted: true
    },
    {
      id: "agg",
      name: "iShares Core U.S. Aggregate Bond ETF",
      symbol: "AGG",
      type: "etf",
      price: 99.23,
      change: -0.12,
      marketCap: "89.2B",
      sector: "Fixed Income",
      popularity: 87,
      description: "The investment seeks to track the investment results of the Bloomberg U.S. Aggregate Bond Index.",
      pe: null,
      dividend: 2.93,
      beta: 0.42,
      isWatchlisted: false
    },
    {
      id: "googl",
      name: "Alphabet Inc.",
      symbol: "GOOGL",
      type: "stock",
      price: 172.46,
      change: -0.78,
      marketCap: "2.1T",
      sector: "Communication Services",
      popularity: 94,
      description: "Alphabet Inc. provides various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.",
      pe: 26.15,
      dividend: 0,
      beta: 1.06,
      isWatchlisted: true
    },
    {
      id: "meta",
      name: "Meta Platforms Inc.",
      symbol: "META",
      type: "stock",
      price: 515.83,
      change: 2.57,
      marketCap: "1.3T",
      sector: "Communication Services",
      popularity: 93,
      description: "Meta Platforms, Inc. engages in the development of products that enable people to connect and share with friends and family through mobile devices, personal computers, virtual reality headsets, and wearables worldwide.",
      pe: 29.73,
      dividend: 0,
      beta: 1.42,
      isWatchlisted: false
    },
    {
      id: "brkb",
      name: "Berkshire Hathaway Inc.",
      symbol: "BRK.B",
      type: "stock",
      price: 428.97,
      change: 0.23,
      marketCap: "932.5B",
      sector: "Financial Services",
      popularity: 90,
      description: "Berkshire Hathaway Inc. engages in the insurance, freight rail transportation, and utility businesses worldwide.",
      pe: 21.08,
      dividend: 0,
      beta: 0.85,
      isWatchlisted: false
    },
    {
      id: "schd",
      name: "Schwab US Dividend Equity ETF",
      symbol: "SCHD",
      type: "etf",
      price: 78.41,
      change: 0.05,
      marketCap: "52.7B",
      sector: "Dividend",
      popularity: 89,
      description: "The investment seeks to track the total return of the Dow Jones U.S. Dividend 100 Index.",
      pe: null,
      dividend: 3.42,
      beta: 0.88,
      isWatchlisted: true
    },
  ];

  useEffect(() => {
    // Simulate API call to fetch securities
    setTimeout(() => {
      setSecurities(mockSecurities);
      setIsLoading(false);
    }, 800);
  }, []);

  // Filter securities based on search query and filter type
  const filteredSecurities = securities.filter(security => {
    const matchesSearch = 
      security.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      security.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterType === "all" || 
      (filterType === "stocks" && security.type === "stock") ||
      (filterType === "etfs" && security.type === "etf") ||
      (filterType === "watchlist" && security.isWatchlisted);
    
    return matchesSearch && matchesFilter;
  });

  // Sort securities based on sort option
  const sortedSecurities = [...filteredSecurities].sort((a, b) => {
    switch (sortOption) {
      case "popularity":
        return b.popularity - a.popularity;
      case "price-high":
        return b.price - a.price;
      case "price-low":
        return a.price - b.price;
      case "change-high":
        return b.change - a.change;
      case "change-low":
        return a.change - b.change;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Toggle watchlist status
  const toggleWatchlist = (id) => {
    setSecurities(securities.map(security => 
      security.id === id 
        ? { ...security, isWatchlisted: !security.isWatchlisted }
        : security
    ));
  };

  // Open security detail modal
  const openSecurityDetail = (security) => {
    setSelectedSecurity(security);
  };

  // Close security detail modal
  const closeSecurityDetail = () => {
    setSelectedSecurity(null);
  };

  // Render trend indicator based on change value
  const renderTrend = (change) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-500">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>+{change.toFixed(2)}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-500">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span>{change.toFixed(2)}%</span>
        </div>
      );
    } else {
      return <span className="text-gray-500">0.00%</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white">
      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center">
              <Briefcase className="w-8 h-8 text-blue-400 mr-3" />
              Securities Explorer
            </h1>
            <button 
              onClick={() => setWatchlistModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <Star className="w-4 h-4 mr-2" />
              Manage Watchlists
            </button>
          </div>
          <p className="text-gray-300 max-w-3xl mb-4">
            Discover, analyze, and track securities to build a well-balanced retirement portfolio. 
            Add securities to your watchlist or directly to your portfolio.
          </p>
        </header>

        {/* Search and Filter Controls */}
        <div className="bg-gray-800/80 p-6 rounded-xl mb-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="bg-gray-700 text-white w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Search stocks, ETFs by name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Type */}
            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-1">
              <button
                className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                  filterType === "all" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setFilterType("all")}
              >
                All
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                  filterType === "stocks" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setFilterType("stocks")}
              >
                Stocks
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                  filterType === "etfs" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setFilterType("etfs")}
              >
                ETFs
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                  filterType === "watchlist" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setFilterType("watchlist")}
              >
                <Star className="h-4 w-4 inline mr-1" />
                Watchlist
              </button>
            </div>

            {/* Sort Options */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SlidersHorizontal className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="bg-gray-700 text-white w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="popularity">Sort by Popularity</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="change-high">% Change (High to Low)</option>
                <option value="change-low">% Change (Low to High)</option>
                <option value="name">Name (A-Z)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Filter className="h-4 w-4" />
            <span>Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {filterType !== "all" && (
                <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded-md">
                  {filterType === "stocks" ? "Stocks" : filterType === "etfs" ? "ETFs" : "Watchlist"}
                </span>
              )}
              {searchQuery && (
                <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded-md">
                  Search: "{searchQuery}"
                </span>
              )}
              {(filterType !== "all" || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterType("all");
                    setSearchQuery("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Securities List */}
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">Loading securities data...</p>
            </div>
          ) : sortedSecurities.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">No securities found</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Security
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Change (24h)
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Market Cap
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Sector
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sortedSecurities.map((security) => (
                    <tr 
                      key={security.id}
                      className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => openSecurityDetail(security)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="font-bold">{security.symbol.charAt(0)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <div className="text-sm font-medium">
                                {security.name}
                              </div>
                              {security.isWatchlisted && (
                                <Star className="h-4 w-4 text-yellow-400 ml-2" fill="currentColor" />
                              )}
                            </div>
                            <div className="text-sm text-gray-400 flex items-center">
                              <span className="mr-2">{security.symbol}</span>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700">
                                {security.type === "stock" ? "Stock" : "ETF"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium">${security.price.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {renderTrend(security.change)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{security.marketCap}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{security.sector}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleWatchlist(security.id)}
                            className={`p-2 rounded-full transition-colors ${
                              security.isWatchlisted 
                                ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" 
                                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                            }`}
                            title={security.isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star className="h-5 w-5" fill={security.isWatchlisted ? "currentColor" : "none"} />
                          </button>
                          <button
                            className="p-2 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/30 transition-colors"
                            title="Add to portfolio"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                          <button
                            className="p-2 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/30 transition-colors"
                            title="View charts"
                          >
                            <BarChart4 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recently Viewed Section */}
        <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-400" />
            Recently Viewed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[mockSecurities[0], mockSecurities[3], mockSecurities[6], mockSecurities[4]].map((security) => (
              <div 
                key={`recent-${security.id}`}
                className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => openSecurityDetail(security)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{security.symbol}</h3>
                    <p className="text-sm text-gray-400 truncate">{security.name}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(security.id);
                    }}
                    className="text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    <Star className="h-5 w-5" fill={security.isWatchlisted ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">${security.price.toFixed(2)}</span>
                  {renderTrend(security.change)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Popular Sectors</h2>
            <div className="space-y-4">
              {[
                { name: "Technology", value: 34, color: "bg-blue-500" },
                { name: "Healthcare", value: 18, color: "bg-green-500" },
                { name: "Financial Services", value: 15, color: "bg-purple-500" },
                { name: "Consumer Cyclical", value: 12, color: "bg-yellow-500" },
                { name: "Communication Services", value: 10, color: "bg-red-500" }
              ].map((sector) => (
                <div key={sector.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{sector.name}</span>
                    <span>{sector.value}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`${sector.color} h-2.5 rounded-full`}
                      style={{ width: `${sector.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Top Performers</h2>
            <div className="space-y-3">
              {mockSecurities
                .sort((a, b) => b.change - a.change)
                .slice(0, 5)
                .map((security) => (
                  <div 
                    key={`top-${security.id}`}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => openSecurityDetail(security)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mr-3">
                        <span className="text-xs font-bold">{security.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium">{security.symbol}</div>
                        <div className="text-xs text-gray-400">{security.sector}</div>
                      </div>
                    </div>
                    <div className="text-green-500 font-medium flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +{security.change.toFixed(2)}%
                    </div>
                  </div>
                ))}
            </div>
            <button className="w-full mt-4 py-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center">
              View More <ArrowUpRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Security Detail Modal */}
      {selectedSecurity && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-4">
                    <span className="font-bold text-lg">{selectedSecurity.symbol.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedSecurity.name}</h3>
                    <div className="flex items-center mt-1">
                      <span className="text-gray-400 mr-2">{selectedSecurity.symbol}</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700">
                        {selectedSecurity.type === "stock" ? "Stock" : "ETF"}
                      </span>
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-900/70 text-blue-300">
                        {selectedSecurity.sector}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeSecurityDetail}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* Price Overview */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-gray-400 text-sm mb-2">Current Price</h4>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-3xl font-bold">${selectedSecurity.price.toFixed(2)}</span>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedSecurity.change > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                      {selectedSecurity.change > 0 ? '+' : ''}{selectedSecurity.change.toFixed(2)}%
                    </div>
                  </div>
                  
                  {/* Chart Placeholder */}
                  <div className="bg-gray-800/70 h-48 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center text-gray-500">
                      <BarChart4 className="h-8 w-8 mx-auto mb-2" />
                      <p>Price chart loading...</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y'].map((period) => (
                      <button
                        key={period}
                        className={`py-1 text-center rounded ${
                          period === '1M' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Key Statistics */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-gray-400 text-sm mb-4">Key Statistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Market Cap</p>
                      <p className="font-medium">{selectedSecurity.marketCap}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">P/E Ratio</p>
                      <p className="font-medium">{selectedSecurity.pe ? selectedSecurity.pe.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Dividend Yield</p>
                      <p className="font-medium">{selectedSecurity.dividend ? selectedSecurity.dividend.toFixed(2) + '%' : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Beta</p>
                      <p className="font-medium">{selectedSecurity.beta.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">52-Week High</p>
                      <p className="font-medium">${(selectedSecurity.price * 1.2).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">52-Week Low</p>
                      <p className="font-medium">${(selectedSecurity.price * 0.8).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Average Volume</p>
                      <p className="font-medium">5.2M</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Popularity</p>
                      <p className="font-medium">{selectedSecurity.popularity}/100</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Description */}
              <div className="p-6 border-t border-gray-700">
                <h4 className="text-gray-400 text-sm mb-2">About</h4>
                <p className="text-gray-300 mb-6">{selectedSecurity.description}</p>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      toggleWatchlist(selectedSecurity.id);
                      closeSecurityDetail();
                    }}
                    className={`px-4 py-2 rounded-lg flex items-center ${
                      selectedSecurity.isWatchlisted
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    } transition-colors`}
                  >
                    <Star className="h-5 w-5 mr-2" fill={selectedSecurity.isWatchlisted ? "currentColor" : "none"} />
                    {selectedSecurity.isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Add to Portfolio
                  </button>
                  <button className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center">
                    <BarChart4 className="h-5 w-5 mr-2" />
                    View Detailed Charts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Management Modal */}
      {watchlistModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <Star className="w-6 h-6 text-yellow-400 mr-3" />
                  <h3 className="text-xl font-semibold">Manage Watchlists</h3>
                </div>
                <button
                  onClick={() => setWatchlistModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="bg-gray-700/50 rounded-lg mb-6">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h4 className="font-medium">Default Watchlist</h4>
                    <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded-full">
                      {securities.filter(s => s.isWatchlisted).length} items
                    </span>
                  </div>

                  <div className="p-2 max-h-64 overflow-y-auto">
                    {securities.filter(s => s.isWatchlisted).map(security => (
                      <div key={`watchlist-${security.id}`} className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                            <span className="text-xs font-bold">{security.symbol.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="font-medium">{security.symbol}</div>
                            <div className="text-xs text-gray-400">{security.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`text-sm ${security.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {security.change > 0 ? '+' : ''}{security.change.toFixed(2)}%
                          </div>
                          <button
                            onClick={() => toggleWatchlist(security.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {securities.filter(s => s.isWatchlisted).length === 0 && (
                      <div className="text-center py-6 text-gray-400">
                        <Bookmark className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>Your watchlist is empty</p>
                        <p className="text-sm">Add securities to track them here</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Create New Watchlist (Placeholder) */}
                <div className="bg-blue-900/20 border border-blue-800/30 border-dashed rounded-lg p-4 text-center">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-blue-400">Create New Watchlist</p>
                  <p className="text-sm text-blue-500/70 mt-1">Organize securities by strategy or goal</p>
                </div>
              </div>

              <div className="bg-gray-900/50 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setWatchlistModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}