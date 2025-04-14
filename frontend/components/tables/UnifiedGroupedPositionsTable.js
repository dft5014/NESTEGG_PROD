// components/tables/UnifiedGroupedPositionsTable.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchUnifiedPositions } from '@/utils/apimethods/positionMethods';
import PositionDetailModal from '@/components/modals/PositionDetailModal';
import { BarChart4, Settings, Trash, TrendingUp, TrendingDown, Loader, Info, Search, SlidersHorizontal, Filter } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';

const UnifiedGroupedPositionsTable = ({ initialSort = "value-high", title = "Consolidated Portfolio" }) => {
  const [positions, setPositions] = useState([]);
  const [groupedPositions, setGroupedPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Sorting and Filtering State
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [accounts, setAccounts] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [detailSortOption, setDetailSortOption] = useState("value-high");
  const [detailSortOrder, setDetailSortOrder] = useState("desc");

  // Fetch data
  const fetchData = async () => {
    console.log("UnifiedGroupedPositionsTable: Fetching data...");
    setIsLoading(true);
    setError(null);
    try {
      // Use the new unified positions endpoint
      const fetchedPositions = await fetchUnifiedPositions();
      console.log("UnifiedGroupedPositionsTable: Data received:", fetchedPositions);
      setPositions(fetchedPositions);
      
      // Extract unique accounts and asset types for filters
      const uniqueAccounts = [...new Set(fetchedPositions.map(pos => pos.account_id))].map(id => {
        const account = fetchedPositions.find(pos => pos.account_id === id);
        return { 
          id: account.account_id, 
          name: account.account_name 
        };
      });
      
      const uniqueAssetTypes = [...new Set(fetchedPositions.map(pos => pos.asset_type))];
      
      setAccounts(uniqueAccounts);
      setAssetTypes(uniqueAssetTypes);
      
      // Group positions by identifier (ticker, coin_symbol, etc.)
      groupPositionsByIdentifier(fetchedPositions);
    } catch (err) {
      console.error("UnifiedGroupedPositionsTable fetch error:", err);
      setError(err.message || "Failed to load positions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group positions by identifier (ticker, symbol, etc.)
  const groupPositionsByIdentifier = (positionsData) => {
    const groupedData = positionsData.reduce((acc, position) => {
      // Create a composite key for grouping that includes asset type and identifier
      const groupKey = `${position.asset_type}:${position.identifier}`;
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          assetType: position.asset_type,
          identifier: position.identifier,
          name: position.name || position.identifier,
          positions: [],
          totalQuantity: 0,
          totalValue: 0,
          totalCostBasis: 0,
          accountsCount: 0,
          uniqueAccounts: new Set(),
          estimatedAnnualIncome: 0,
          currentPricePerUnit: position.current_price_per_unit || 0,
          dividendRate: 0,
          incomePerUnit: 0
        };
      }
      
      acc[groupKey].positions.push(position);
      acc[groupKey].totalQuantity += parseFloat(position.quantity || 0);
      acc[groupKey].totalValue += parseFloat(position.current_value || 0);
      acc[groupKey].totalCostBasis += parseFloat(position.total_cost_basis || 0);
      acc[groupKey].uniqueAccounts.add(position.account_id);
      
      // Use the most recent price data
      if (position.current_price_per_unit) {
        acc[groupKey].currentPricePerUnit = position.current_price_per_unit;
      }
      
      // For cash, use the dividend_rate from the API
      if (position.asset_type === 'cash' && position.dividend_rate) {
        acc[groupKey].dividendRate = parseFloat(position.dividend_rate);
        const annualIncome = parseFloat(position.current_value || 0) * (parseFloat(position.dividend_rate) / 100);
        acc[groupKey].estimatedAnnualIncome = (acc[groupKey].estimatedAnnualIncome || 0) + annualIncome;
      } 
      // For securities, use dividend_yield from the API
      else if (position.dividend_yield) {
        const annualIncome = parseFloat(position.current_value || 0) * (parseFloat(position.dividend_yield) / 100);
        acc[groupKey].estimatedAnnualIncome = (acc[groupKey].estimatedAnnualIncome || 0) + annualIncome;
      }
      
      return acc;
    }, {});
    
    // Convert to array and calculate additional metrics
    const groupedArray = Object.values(groupedData).map(group => {
      group.accountsCount = group.uniqueAccounts.size;
      group.avgCostBasisPerUnit = group.totalQuantity > 0 ? group.totalCostBasis / group.totalQuantity : 0;
      group.totalGainLoss = group.totalValue - group.totalCostBasis;
      
      // Fix the gain/loss percentage calculation
      group.totalGainLossPercent = group.totalCostBasis > 0 
        ? (group.totalGainLoss / group.totalCostBasis) * 100 
        : 0;
      
      // Calculate income per unit
      if (group.totalQuantity > 0 && group.estimatedAnnualIncome > 0) {
        group.incomePerUnit = group.estimatedAnnualIncome / group.totalQuantity;
      }
      
      // Remove Set as it's not needed anymore
      delete group.uniqueAccounts;
      
      return group;
    });
    
    setGroupedPositions(groupedArray);
  };

  // Apply account filtering, asset type filtering, and search to grouped positions
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
        
        const totalQuantity = filteredPositions.reduce((sum, pos) => sum + parseFloat(pos.quantity || 0), 0);
        const totalValue = filteredPositions.reduce((sum, pos) => sum + parseFloat(pos.current_value || 0), 0);
        const totalCostBasis = filteredPositions.reduce((sum, pos) => sum + parseFloat(pos.total_cost_basis || 0), 0);
        
        return {
          ...group,
          totalQuantity,
          totalValue,
          totalCostBasis,
          avgCostBasisPerUnit: totalQuantity > 0 ? totalCostBasis / totalQuantity : 0,
          totalGainLoss: totalValue - totalCostBasis,
          totalGainLossPercent: totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0,
          accountsCount: filteredPositions.length
        };
      });
    }
    
    // Apply asset type filter
    if (assetTypeFilter !== "all") {
      filtered = filtered.filter(group => group.assetType === assetTypeFilter);
    }
    
    // Apply search query
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(group => 
        (group.identifier && group.identifier.toLowerCase().includes(lowerCaseQuery)) ||
        (group.name && group.name.toLowerCase().includes(lowerCaseQuery))
      );
    }
    
    return filtered;
  }, [groupedPositions, searchQuery, accountFilter, assetTypeFilter]);
  
  // Sorting logic
  const sortedPositions = useMemo(() => {
    return [...filteredPositions].sort((a, b) => {
      switch (sortOption) {
        case "value-high": return b.totalValue - a.totalValue;
        case "value-low": return a.totalValue - b.totalValue;
        case "quantity-high": return b.totalQuantity - a.totalQuantity;
        case "quantity-low": return a.totalQuantity - b.totalQuantity;
        case "price-high": return b.currentPricePerUnit - a.currentPricePerUnit;
        case "price-low": return a.currentPricePerUnit - b.currentPricePerUnit;
        case "cost-high": return b.totalCostBasis - a.totalCostBasis;
        case "cost-low": return a.totalCostBasis - b.totalCostBasis;
        case "gain-high": return b.totalGainLoss - a.totalGainLoss;
        case "gain-low": return a.totalGainLoss - b.totalGainLoss;
        case "gain_percent-high": return b.totalGainLossPercent - a.totalGainLossPercent;
        case "gain_percent-low": return a.totalGainLossPercent - b.totalGainLossPercent;
        case "accounts-high": return b.accountsCount - a.accountsCount;
        case "accounts-low": return a.accountsCount - b.accountsCount;
        case "income-high": return b.estimatedAnnualIncome - a.estimatedAnnualIncome;
        case "income-low": return a.estimatedAnnualIncome - b.estimatedAnnualIncome;
        case "identifier": return a.identifier.localeCompare(b.identifier);
        case "name": return a.name.localeCompare(b.name);
        case "asset_type": return a.assetType.localeCompare(b.assetType);
        default: return 0;
      }
    });
  }, [filteredPositions, sortOption]);

  const handleDetailSortChange = (column) => {
    if (detailSortOption === column) {
      // Toggle sort order if clicking the same column
      setDetailSortOrder(detailSortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setDetailSortOption(column);
      setDetailSortOrder("desc");
    }
  };
  
  // Add this function to get sorted positions for the detail modal
  const getSortedDetailPositions = () => {
    if (!selectedPositionDetail) return [];
    
    return [...selectedPositionDetail.positions].sort((a, b) => {
      let comparison = 0;
      
      switch (detailSortOption) {
        case "account":
          comparison = a.account_name.localeCompare(b.account_name);
          break;
        case "quantity":
          comparison = parseFloat(a.quantity || 0) - parseFloat(b.quantity || 0);
          break;
        case "cost":
          comparison = (parseFloat(a.cost_basis || 0) || parseFloat(a.current_price_per_unit || 0)) - 
                       (parseFloat(b.cost_basis || 0) || parseFloat(b.current_price_per_unit || 0));
          break;
        case "value":
          comparison = parseFloat(a.current_value || 0) - parseFloat(b.current_value || 0);
          break;
        case "gain":
          const aGain = parseFloat(a.current_value || 0) - parseFloat(a.total_cost_basis || 0);
          const bGain = parseFloat(b.current_value || 0) - parseFloat(b.total_cost_basis || 0);
          comparison = aGain - bGain;
          break;
        default:
          comparison = 0;
      }
      
      return detailSortOrder === "asc" ? comparison : -comparison;
    });
  };

  // Calculate portfolio totals
  const portfolioTotals = useMemo(() => {
    return filteredPositions.reduce((acc, position) => {
      acc.totalQuantity += position.totalQuantity || 0;
      acc.totalValue += position.totalValue || 0;
      acc.totalCostBasis += position.totalCostBasis || 0;
      acc.totalGainLoss += position.totalGainLoss || 0;
      acc.estimatedAnnualIncome += position.estimatedAnnualIncome || 0;
      // Count unique positions
      acc.positionCount++;
      return acc;
    }, {
      totalQuantity: 0,
      totalValue: 0,
      totalCostBasis: 0,
      totalGainLoss: 0,
      estimatedAnnualIncome: 0,
      positionCount: 0
    });
  }, [filteredPositions]);

  // Calculate total gain/loss percent
  const totalGainLossPercent = portfolioTotals.totalCostBasis > 0 
    ? (portfolioTotals.totalGainLoss / portfolioTotals.totalCostBasis) * 100 
    : 0;

  // Handle row click to show detail modal
  const handleRowClick = (groupedPosition) => {
    setSelectedPositionDetail(groupedPosition);
    setIsDetailModalOpen(true);
  };

  // Get asset type icon
  const getAssetTypeIcon = (assetType) => {
    switch (assetType) {
      case 'security':
        return <BarChart4 className="w-3 h-3 mr-1" />;
      case 'crypto':
        return <div className="w-3 h-3 mr-1 text-xs">₿</div>;
      case 'metal':
        return <div className="w-3 h-3 mr-1 text-xs">Au</div>;
      case 'cash':
        return <div className="w-3 h-3 mr-1 text-xs">$</div>;
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex items-center justify-center">
        <div>
          <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
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
        <div className="flex flex-wrap justify-between items-center p-3 border-b border-gray-700 gap-4">
          <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
            <BarChart4 className="w-5 h-5 mr-2 text-purple-400" />
            {title}
          </h2>
          <div className='flex flex-wrap items-center gap-4'>
            {/* Asset Type Filter Dropdown */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
              >
                <option value="all">All Assets</option>
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
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
                placeholder="Search Name/ID..."
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
                <option value="identifier">Sort: Identifier (A-Z)</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="asset_type">Sort: Asset Type (A-Z)</option>
                <option value="quantity-high">Sort: Quantity (High-Low)</option>
                <option value="quantity-low">Sort: Quantity (Low-High)</option>
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
                <option value="income-high">Sort: Est. Income (High-Low)</option>
                <option value="income-low">Sort: Est. Income (Low-High)</option>
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
          <div className="p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
            <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <BarChart4 className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium mb-2">No positions found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchQuery || accountFilter !== "all" || assetTypeFilter !== "all" ? 
                "No positions match your criteria." : 
                "Add positions to see them here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-10">#</th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset / Name</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Current Price</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Current Value</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Avg Cost/Unit</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Total Cost</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden xl:table-cell">Income/Unit</th>
                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Accounts</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden xl:table-cell">Est. Annual Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {/* Portfolio Summary Row */}
                <tr className="bg-purple-900/30 font-medium border-b-2 border-purple-700">
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="font-bold">•</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium text-white">Total Portfolio</div>
                    <div className="text-xs text-gray-400">{portfolioTotals.positionCount} unique positions</div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                    {/* Cannot meaningfully display total quantity across different assets */}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                    {/* Cannot calculate avg price */}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                    {formatCurrency(portfolioTotals.totalValue)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden md:table-cell">
                    {/* Cannot calculate avg cost/unit for portfolio */}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden lg:table-cell">
                    {formatCurrency(portfolioTotals.totalCostBasis)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <div className={`font-medium ${portfolioTotals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {portfolioTotals.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolioTotals.totalGainLoss)}
                      </div>
                      <div className={`text-xs ${portfolioTotals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({portfolioTotals.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(totalGainLossPercent)})
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden xl:table-cell">
                    {/* Cannot calculate income/unit for portfolio */}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap text-sm hidden sm:table-cell">
                    {/* Leave accounts cell empty */}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden xl:table-cell">
                    {formatCurrency(portfolioTotals.estimatedAnnualIncome)}
                  </td>
                </tr>

                {/* Individual position rows */}
                {sortedPositions.map((group, index) => (
                  <tr
                    key={`${group.assetType}-${group.identifier}-${index}`}
                    className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(group)}
                  >
                    {/* Rank # */}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="text-sm text-gray-300">{index + 1}</span>
                    </td>
                    
                    {/* Asset/Name */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-medium text-white flex items-center">
                        {getAssetTypeIcon(group.assetType)}
                        {group.identifier}
                      </div>
                      <div className="text-xs text-gray-400">{group.name}</div>
                    </td>
                    
                    {/* Quantity */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                      {/* Format quantity differently for each asset type */}
                      {group.assetType === 'cash' ? 
                        '' : 
                        formatNumber(group.totalQuantity, { maximumFractionDigits: 4 })}
                    </td>
                    
                    {/* Current Price */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                      {group.assetType === 'cash' ? 
                        '' : 
                        formatCurrency(group.currentPricePerUnit)}
                    </td>
                    
                    {/* Current Value */}
                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                      {formatCurrency(group.totalValue)}
                    </td>
                    
                    {/* Avg Cost/Unit */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden md:table-cell">
                      {group.assetType === 'cash' ? 
                        '' : 
                        formatCurrency(group.avgCostBasisPerUnit)}
                    </td>
                    
                    {/* Total Cost */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden lg:table-cell">
                      {formatCurrency(group.totalCostBasis)}
                    </td>
                    
                    {/* Gain/Loss */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {group.assetType === 'cash' ? (
                        <div className="text-gray-500">N/A</div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <div className={`text-sm font-medium ${group.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {group.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(group.totalGainLoss)}
                          </div>
                          <div className={`text-xs ${group.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({group.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(group.totalGainLossPercent)})
                          </div>
                        </div>
                      )}
                    </td>
                    
                    {/* Income/Unit */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-sm hidden xl:table-cell">
                      {group.assetType === 'cash' 
                        ? (group.dividendRate > 0 ? formatPercentage(group.dividendRate) : 'N/A')
                        : (group.incomePerUnit > 0 ? formatCurrency(group.incomePerUnit) : 'N/A')}
                    </td>
                    
                    {/* # Accounts */}
                    <td className="px-3 py-2 text-center whitespace-nowrap text-sm hidden sm:table-cell">
                      {group.accountsCount}
                    </td>
                    
                    {/* Est. Annual Income */}
                    <td className="px-3 py-2 text-right whitespace-nowrap text-sm hidden xl:table-cell">
                      {formatCurrency(group.estimatedAnnualIncome)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedPositionDetail && (
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
                    <span className="font-bold text-green-800 text-lg">
                      {selectedPositionDetail.assetType === 'security' ? selectedPositionDetail.identifier?.charAt(0) || '?' :
                       selectedPositionDetail.assetType === 'crypto' ? '₿' :
                       selectedPositionDetail.assetType === 'metal' ? 'Au' :
                       selectedPositionDetail.assetType === 'cash' ? '$' : '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedPositionDetail.identifier} 
                      <span className="text-base font-normal text-gray-300 ml-2">
                        - {selectedPositionDetail.name}
                      </span>
                      <span className="ml-2 text-xs bg-blue-900/50 px-2 py-0.5 rounded-full">
                        {selectedPositionDetail.assetType.charAt(0).toUpperCase() + selectedPositionDetail.assetType.slice(1)}
                      </span>
                    </h3>
                    {selectedPositionDetail.assetType !== 'cash' && (
                      <div className="flex flex-wrap items-center text-sm text-blue-200">
                        <span>{formatNumber(selectedPositionDetail.totalQuantity, { maximumFractionDigits: 4 })} units</span>
                        {selectedPositionDetail.currentPricePerUnit > 0 && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{formatCurrency(selectedPositionDetail.currentPricePerUnit)} / unit</span>
                          </>
                        )}
                      </div>
                    )}
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
                    <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedPositionDetail.totalValue)}</div>
                  </div>
                  
                  {selectedPositionDetail.assetType !== 'cash' ? (
                    <>
                      {/* Total Cost Basis KPI */}
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Total Cost Basis</div>
                        <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedPositionDetail.totalCostBasis)}</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Gain/Loss ($)</div>
                        <div className={`text-lg font-semibold truncate ${selectedPositionDetail.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedPositionDetail.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(selectedPositionDetail.totalGainLoss)}
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Gain/Loss (%)</div>
                        <div className={`text-lg font-semibold truncate ${selectedPositionDetail.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedPositionDetail.totalGainLoss >= 0 ? '+' : ''}{selectedPositionDetail.totalGainLossPercent.toFixed(2)}%
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Type</div>
                      <div className="text-lg font-semibold truncate text-white">Cash</div>
                    </div>
                  )}
                  
                  {selectedPositionDetail.estimatedAnnualIncome > 0 && (
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Est. Annual Income</div>
                      <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedPositionDetail.estimatedAnnualIncome)}</div>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-700/50 p-4 rounded-lg mb-6">
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Accounts</div>
                    <div className="font-medium text-white break-words">{selectedPositionDetail.accountsCount}</div>
                  </div>
                  
                  {selectedPositionDetail.assetType !== 'cash' ? (
                    <>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wider">Avg Cost Basis / Unit</div>
                        <div className="font-medium text-white break-words">{formatCurrency(selectedPositionDetail.avgCostBasisPerUnit)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wider">Current Price Per Unit</div>
                        <div className="font-medium text-white break-words">{formatCurrency(selectedPositionDetail.currentPricePerUnit)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wider">Average Interest Rate</div>
                        <div className="font-medium text-white break-words">
                        {selectedPositionDetail.totalValue > 0 && selectedPositionDetail.estimatedAnnualIncome > 0
                          ? ((selectedPositionDetail.estimatedAnnualIncome / selectedPositionDetail.totalValue) * 100).toFixed(2) + '%'
                          : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wider">Est. Annual Income</div>
                        <div className="font-medium text-white break-words">{formatCurrency(selectedPositionDetail.estimatedAnnualIncome)}</div>
                      </div>
                    </>
                  )}
                  
                  {selectedPositionDetail.estimatedAnnualIncome > 0 && selectedPositionDetail.assetType !== 'cash' && (
                    <>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wider">Est. Annual Income</div>
                        <div className="font-medium text-white break-words">{formatCurrency(selectedPositionDetail.estimatedAnnualIncome)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wider">Est. Yield</div>
                        <div className="font-medium text-white break-words">
                          {selectedPositionDetail.totalValue > 0
                            ? ((selectedPositionDetail.estimatedAnnualIncome / selectedPositionDetail.totalValue) * 100).toFixed(2) + '%'
                            : 'N/A'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Individual Positions */}
                <div>
                  <h4 className="font-medium text-lg mb-3">Positions By Account</h4>
                  <div className="bg-gray-700/50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-600">
                      <thead className="bg-gray-800">
                        <tr>
                          {/* Account column - for all asset types */}
                          <th 
                            scope="col" 
                            className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                            onClick={() => handleDetailSortChange("account")}
                          >
                            Account
                            {detailSortOption === "account" && (
                              <span className="ml-1">{detailSortOrder === "asc" ? "↑" : "↓"}</span>
                            )}
                          </th>
                          
                          {/* Conditional columns based on asset type */}
                          {selectedPositionDetail.assetType !== 'cash' ? (
                            <>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleDetailSortChange("quantity")}
                              >
                                Quantity
                                {detailSortOption === "quantity" && (
                                  <span className="ml-1">{detailSortOrder === "asc" ? "↑" : "↓"}</span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleDetailSortChange("value")}
                              >
                                Value
                                {detailSortOption === "value" && (
                                  <span className="ml-1">{detailSortOrder === "asc" ? "↑" : "↓"}</span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider"
                              >
                                Current Price
                              </th>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider"
                              >
                                Cost Basis
                              </th>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleDetailSortChange("cost")}
                              >
                                Cost/Unit
                                {detailSortOption === "cost" && (
                                  <span className="ml-1">{detailSortOrder === "asc" ? "↑" : "↓"}</span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleDetailSortChange("gain")}
                              >
                                Gain/Loss
                                {detailSortOption === "gain" && (
                                  <span className="ml-1">{detailSortOrder === "asc" ? "↑" : "↓"}</span>
                                )}
                              </th>
                            </>
                          ) : (
                            <>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hover:bg-gray-700"
                              >
                                Interest Rate
                              </th>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hover:bg-gray-700"
                              >
                                Annual Income
                              </th>
                              <th 
                                scope="col" 
                                className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleDetailSortChange("value")}
                              >
                                Value
                                {detailSortOption === "value" && (
                                  <span className="ml-1">{detailSortOrder === "asc" ? "↑" : "↓"}</span>
                                )}
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-600">
                        {getSortedDetailPositions().map((position) => {
                          const positionCostBasis = parseFloat(position.total_cost_basis || 0);
                          const positionValue = parseFloat(position.current_value || 0);
                          const positionGainLoss = positionValue - positionCostBasis;
                          const positionGainLossPercent = positionCostBasis > 0 ? (positionGainLoss / positionCostBasis) * 100 : 0;
                          // Calculate annual income for cash positions
                          const annualIncome = selectedPositionDetail.assetType === 'cash' && position.dividend_rate 
                            ? (positionValue * (parseFloat(position.dividend_rate) / 100)) 
                            : 0;
                          
                          return (
                            <tr key={position.id} className="hover:bg-gray-600/50">
                              {/* Account name - for all asset types */}
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{position.account_name}</td>
                              
                              {/* Conditional cells based on asset type */}
                              {selectedPositionDetail.assetType !== 'cash' ? (
                                <>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {formatNumber(position.quantity, { maximumFractionDigits: 4 })}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {formatCurrency(positionValue)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {formatCurrency(position.current_price_per_unit || 0)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {formatCurrency(positionCostBasis)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {formatCurrency(position.cost_basis || position.current_price_per_unit || 0)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    <div className={`${positionGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {positionGainLoss >= 0 ? '+' : ''}{formatCurrency(positionGainLoss)}
                                      <div className="text-xs">
                                        ({positionGainLoss >= 0 ? '+' : ''}{positionGainLossPercent.toFixed(2)}%)
                                      </div>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {position.dividend_rate ? `${parseFloat(position.dividend_rate).toFixed(2)}%` : 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {formatCurrency(annualIncome)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                    {formatCurrency(positionValue)}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                        
                        {/* Total Row */}
                        <tr className="bg-gray-600/80 font-medium">
                          <td className="px-3 py-2 whitespace-nowrap text-sm">Total</td>
                          
                          {selectedPositionDetail.assetType !== 'cash' ? (
                            <>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                {formatNumber(selectedPositionDetail.totalQuantity, { maximumFractionDigits: 4 })}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium">
                                {formatCurrency(selectedPositionDetail.totalValue)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                {/* Leave price cell empty for total row */}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium">
                                {formatCurrency(selectedPositionDetail.totalCostBasis)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                {/* Leave avg cost cell empty for total row */}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                <div className={`font-medium ${selectedPositionDetail.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {selectedPositionDetail.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(selectedPositionDetail.totalGainLoss)}
                                  <div className="text-xs">
                                    ({selectedPositionDetail.totalGainLoss >= 0 ? '+' : ''}{selectedPositionDetail.totalGainLossPercent.toFixed(2)}%)
                                  </div>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                                {/* Leave avg rate cell empty for total row */}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium">
                                {formatCurrency(selectedPositionDetail.estimatedAnnualIncome)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium">
                                {formatCurrency(selectedPositionDetail.totalValue)}
                              </td>
                            </>
                          )}
                        </tr>
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

export default UnifiedGroupedPositionsTable;