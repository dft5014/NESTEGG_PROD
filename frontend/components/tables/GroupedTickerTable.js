// components/tables/GroupedTickerTable.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllPositionsWithDetails } from '@/utils/apimethods/positionMethods';
import PositionDetailModal from '@/components/modals/PositionDetailModal';
import { BarChart4, Settings, Trash, TrendingUp, TrendingDown, Loader, Info, Search, SlidersHorizontal, Filter } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';

const GroupedTickerTable = ({ initialSort = "value-high", title = "Consolidated Positions" }) => {
  const [positions, setPositions] = useState([]);
  const [groupedPositions, setGroupedPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedTickerDetail, setSelectedTickerDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Sorting and Filtering State
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [accounts, setAccounts] = useState([]);

  // Fetch data
  const fetchData = async () => {
    console.log("GroupedTickerTable: Fetching data...");
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPositions = await fetchAllPositionsWithDetails('security');
      console.log("GroupedTickerTable: Data received:", fetchedPositions);
      setPositions(fetchedPositions);
      
      // Extract unique accounts for filter
      const uniqueAccounts = [...new Set(fetchedPositions.map(pos => pos.account_id))].map(id => {
        const account = fetchedPositions.find(pos => pos.account_id === id);
        return { 
          id: account.account_id, 
          name: account.account_name 
        };
      });
      
      setAccounts(uniqueAccounts);
      
      // Group positions by ticker
      groupPositionsByTicker(fetchedPositions);
    } catch (err) {
      console.error("GroupedTickerTable fetch error:", err);
      setError(err.message || "Failed to load positions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group positions by ticker
  const groupPositionsByTicker = (positionsData) => {
    const groupedData = positionsData.reduce((acc, position) => {
      const ticker = position.ticker?.toUpperCase() || 'UNKNOWN';
      
      if (!acc[ticker]) {
        acc[ticker] = {
          ticker: ticker,
          name: position.name || ticker,
          positions: [],
          totalShares: 0,
          totalValue: 0,
          totalCostBasis: 0,
          accountsCount: 0,
          uniqueAccounts: new Set(),
          estimatedAnnualDividend: 0,
          estimatedAnnualIncome: 0,
          currentPrice: position.price || 0
        };
      }
      
      acc[ticker].positions.push(position);
      acc[ticker].totalShares += parseFloat(position.shares || 0);
      acc[ticker].totalValue += parseFloat(position.value || 0);
      acc[ticker].totalCostBasis += parseFloat(position.shares || 0) * parseFloat(position.cost_basis || position.price || 0);
      acc[ticker].uniqueAccounts.add(position.account_id);
      
      // Use the most recent price data
      if (position.price) {
        acc[ticker].currentPrice = position.price;
      }
      
      // Calculate estimated dividend if dividend_yield is available
      if (position.dividend_yield) {
        const annualDividend = parseFloat(position.value || 0) * parseFloat(position.dividend_yield || 0);
        acc[ticker].estimatedAnnualDividend = (acc[ticker].estimatedAnnualDividend || 0) + annualDividend;
        acc[ticker].estimatedAnnualIncome = (acc[ticker].estimatedAnnualIncome || 0) + annualDividend;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate additional metrics
    const groupedArray = Object.values(groupedData).map(group => {
      group.accountsCount = group.uniqueAccounts.size;
      group.avgCostBasis = group.totalShares > 0 ? group.totalCostBasis / group.totalShares : 0;
      group.totalGainLoss = group.totalValue - group.totalCostBasis;
      group.totalGainLossPercent = group.totalCostBasis > 0 ? (group.totalGainLoss / group.totalCostBasis) * 100 : 0;
      
      // Remove Set as it's not needed anymore
      delete group.uniqueAccounts;
      
      return group;
    });
    
    setGroupedPositions(groupedArray);
  };

  // Apply account filtering and search to grouped positions
  const filteredPositions = useMemo(() => {
    let filtered = [...groupedPositions];
    
    // Apply account filter
    if (accountFilter !== "all") {
      filtered = filtered.filter(group => 
        group.positions.some(pos => pos.account_id.toString() === accountFilter)
      );
      
      // Recalculate totals for filtered positions
      filtered = filtered.map(group => {
        const filteredPositions = group.positions.filter(pos => 
          pos.account_id.toString() === accountFilter
        );
        
        const totalShares = filteredPositions.reduce((sum, pos) => sum + parseFloat(pos.shares || 0), 0);
        const totalValue = filteredPositions.reduce((sum, pos) => sum + parseFloat(pos.value || 0), 0);
        const totalCostBasis = filteredPositions.reduce((sum, pos) => 
          sum + (parseFloat(pos.shares || 0) * parseFloat(pos.cost_basis || pos.price || 0)), 0
        );
        
        return {
          ...group,
          totalShares,
          totalValue,
          totalCostBasis,
          avgCostBasis: totalShares > 0 ? totalCostBasis / totalShares : 0,
          totalGainLoss: totalValue - totalCostBasis,
          totalGainLossPercent: totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0,
          accountsCount: filteredPositions.length
        };
      });
    }
    
    // Apply search query
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(group => 
        (group.ticker && group.ticker.toLowerCase().includes(lowerCaseQuery)) ||
        (group.name && group.name.toLowerCase().includes(lowerCaseQuery))
      );
    }
    
    return filtered;
  }, [groupedPositions, searchQuery, accountFilter]);
  
  // Sorting logic
  const sortedPositions = useMemo(() => {
    return [...filteredPositions].sort((a, b) => {
      switch (sortOption) {
        case "value-high": return b.totalValue - a.totalValue;
        case "value-low": return a.totalValue - b.totalValue;
        case "shares-high": return b.totalShares - a.totalShares;
        case "shares-low": return a.totalShares - b.totalShares;
        case "price-high": return b.currentPrice - a.currentPrice;
        case "price-low": return a.currentPrice - b.currentPrice;
        case "cost-high": return b.totalCostBasis - a.totalCostBasis;
        case "cost-low": return a.totalCostBasis - b.totalCostBasis;
        case "gain-high": return b.totalGainLoss - a.totalGainLoss;
        case "gain-low": return a.totalGainLoss - b.totalGainLoss;
        case "gain_percent-high": return b.totalGainLossPercent - a.totalGainLossPercent;
        case "gain_percent-low": return a.totalGainLossPercent - b.totalGainLossPercent;
        case "accounts-high": return b.accountsCount - a.accountsCount;
        case "accounts-low": return a.accountsCount - b.accountsCount;
        case "dividend-high": return b.estimatedAnnualDividend - a.estimatedAnnualDividend;
        case "dividend-low": return a.estimatedAnnualDividend - b.estimatedAnnualDividend;
        case "ticker": return a.ticker.localeCompare(b.ticker);
        case "name": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [filteredPositions, sortOption]);

  // Handle row click to show detail modal
  const handleRowClick = (groupedPosition) => {
    setSelectedTickerDetail(groupedPosition);
    setIsDetailModalOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center min-h-[300px] flex items-center justify-center">
        <div>
          <Loader className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading positions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/60 p-4 rounded-lg text-red-200">
        <div className="font-medium mb-1">Error Loading Positions</div>
        <div className="text-sm">{error}</div>
        <button onClick={fetchData} className="mt-2 text-xs bg-red-800/80 hover:bg-red-700/80 py-1 px-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
        {/* Header with Controls */}
        <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
          <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
            <BarChart4 className="w-5 h-5 mr-2 text-purple-400" />
            {title}
          </h2>
          <div className='flex flex-wrap items-center gap-4'>
            {/* Account Filter Dropdown */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <option value="all">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id.toString()}>
                    {account.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="bg-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Search Ticker/Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="value-high">Sort: Value (High-Low)</option>
                <option value="value-low">Sort: Value (Low-High)</option>
                <option value="ticker">Sort: Ticker (A-Z)</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="shares-high">Sort: Shares (High-Low)</option>
                <option value="shares-low">Sort: Shares (Low-High)</option>
                <option value="price-high">Sort: Price (High-Low)</option>
                <option value="price-low">Sort: Price (Low-High)</option>
                <option value="cost-high">Sort: Cost Basis (High-Low)</option>
                <option value="cost-low">Sort: Cost Basis (Low-High)</option>
                <option value="gain-high">Sort: Gain $ (High-Low)</option>
                <option value="gain-low">Sort: Gain $ (Low-High)</option>
                <option value="gain_percent-high">Sort: Gain % (High-Low)</option>
                <option value="gain_percent-low">Sort: Gain % (Low-High)</option>
                <option value="accounts-high">Sort: # Accounts (High-Low)</option>
                <option value="accounts-low">Sort: # Accounts (Low-High)</option>
                <option value="dividend-high">Sort: Est. Dividend (High-Low)</option>
                <option value="dividend-low">Sort: Est. Dividend (Low-High)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {sortedPositions.length === 0 ? (
          <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
            <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <BarChart4 className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium mb-2">No positions found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchQuery || accountFilter !== "all" ? "No positions match your criteria." : "Add security positions to see them here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ticker / Name</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Shares</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Current Price</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Current Value</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Avg Cost/Share</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Total Cost</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Accounts</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden xl:table-cell">Est. Annual Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedPositions.map((group) => (
                  <tr
                    key={group.ticker}
                    className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(group)}
                  >
                    {/* Ticker/Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center mr-3">
                          <span className="font-bold text-xs">{group.ticker?.charAt(0) || '?'}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{group.ticker}</div>
                          <div className="text-xs text-gray-400">{group.name}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Shares */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {formatNumber(group.totalShares, { maximumFractionDigits: 4 })}
                    </td>
                    
                    {/* Current Price */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {formatCurrency(group.currentPrice)}
                    </td>
                    
                    {/* Current Value */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {formatCurrency(group.totalValue)}
                    </td>
                    
                    {/* Avg Cost/Share */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden md:table-cell">
                      {formatCurrency(group.avgCostBasis)}
                    </td>
                    
                    {/* Total Cost */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden lg:table-cell">
                      {formatCurrency(group.totalCostBasis)}
                    </td>
                    
                    {/* Gain/Loss */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <div className={`text-sm font-medium ${group.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {group.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(group.totalGainLoss)}
                        </div>
                        <div className={`text-xs ${group.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {group.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(group.totalGainLossPercent)}
                        </div>
                      </div>
                    </td>
                    
                    {/* # Accounts */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm hidden sm:table-cell">
                      {group.accountsCount}
                    </td>
                    
                    {/* Est. Annual Income */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                      {formatCurrency(group.estimatedAnnualDividend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create a custom detail modal for grouped positions */}
      {isDetailModalOpen && selectedTickerDetail && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full text-white">
              {/* Header */}
              <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-gradient-to-r from-green-900 to-blue-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-4">
                    <span className="font-bold text-green-800 text-lg">{selectedTickerDetail.ticker?.charAt(0) || '?'}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedTickerDetail.ticker} <span className="text-base font-normal text-gray-300">- {selectedTickerDetail.name}</span></h3>
                    <div className="flex flex-wrap items-center text-sm text-blue-200">
                      <span>{formatNumber(selectedTickerDetail.totalShares, { maximumFractionDigits: 4 })} shares</span>
                      <span className="mx-2">•</span>
                      <span>{formatCurrency(selectedTickerDetail.currentPrice)} / share</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="text-white hover:text-blue-200 transition-colors p-1 -m-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 bg-gray-800 text-sm">
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Current Value</div>
                    <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedTickerDetail.totalValue)}</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Total Cost</div>
                    <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedTickerDetail.totalCostBasis)}</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Gain/Loss ($)</div>
                    <div className={`text-lg font-semibold truncate ${selectedTickerDetail.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedTickerDetail.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(selectedTickerDetail.totalGainLoss)}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Gain/Loss (%)</div>
                    <div className={`text-lg font-semibold truncate ${selectedTickerDetail.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedTickerDetail.totalGainLoss >= 0 ? '+' : ''}{selectedTickerDetail.totalGainLossPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-700/50 p-4 rounded-lg mb-6">
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Accounts</div>
                    <div className="font-medium text-white break-words">{selectedTickerDetail.accountsCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Avg Cost Basis / Share</div>
                    <div className="font-medium text-white break-words">{formatCurrency(selectedTickerDetail.avgCostBasis)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Est. Annual Dividend</div>
                    <div className="font-medium text-white break-words">{formatCurrency(selectedTickerDetail.estimatedAnnualDividend)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Est. Dividend Yield</div>
                    <div className="font-medium text-white break-words">
                      {selectedTickerDetail.totalValue > 0
                        ? ((selectedTickerDetail.estimatedAnnualDividend / selectedTickerDetail.totalValue) * 100).toFixed(2) + '%'
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Individual Positions */}
                <div>
                  <h4 className="font-medium text-lg mb-3">Positions By Account</h4>
                  <div className="bg-gray-700/50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-gray-800">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Shares</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost/Share</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-600">
                        {selectedTickerDetail.positions.map((position) => {
                          const positionCostBasis = parseFloat(position.shares || 0) * parseFloat(position.cost_basis || position.price || 0);
                          const positionValue = parseFloat(position.value || 0);
                          const positionGainLoss = positionValue - positionCostBasis;
                          const positionGainLossPercent = positionCostBasis > 0 ? (positionGainLoss / positionCostBasis) * 100 : 0;
                          
                          return (
                            <tr key={position.id} className="hover:bg-gray-600/50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{position.account_name}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                {formatNumber(position.shares, { maximumFractionDigits: 4 })}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                {formatCurrency(position.cost_basis || position.price)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                {formatCurrency(positionValue)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                <div className={`${positionGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {positionGainLoss >= 0 ? '+' : ''}{formatCurrency(positionGainLoss)}
                                  <div className="text-xs">
                                    ({positionGainLoss >= 0 ? '+' : ''}{positionGainLossPercent.toFixed(2)}%)
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-900 text-right">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupedTickerTable;