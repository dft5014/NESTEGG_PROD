import React, { useState, useMemo, useEffect } from 'react';
import { BarChart4, Loader, Search, Filter, TrendingUp, TrendingDown, X, RefreshCw, Info, DollarSign, Home, Package, ChevronDown, Check, ChevronUp, ArrowUpDown, Briefcase } from 'lucide-react';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from '@/utils/formatters';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Multi-select dropdown component
const MultiSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (option) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };
  
  const selectedText = value.length === 0 
    ? placeholder 
    : value.length === options.length 
    ? "All Selected" 
    : `${value.length} Selected`;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-sm flex items-center space-x-2"
      >
        <span>{selectedText}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-1 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              <button
                onClick={() => {
                  onChange(value.length === options.length ? [] : options);
                }}
                className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded"
              >
                {value.length === options.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border-t border-gray-700">
              {options.map(option => (
                <label
                  key={option}
                  className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const UnifiedGroupPositionsTable2 = ({ 
  initialSort = "value-high", 
  title = "NestEgg Assets - Position Detail",
  showHistoricalColumns = false 
}) => {
  // Use DataStore hook
  const { 
    positions, 
    summary, 
    metrics, 
    loading, 
    error, 
    lastFetched, 
    isStale, 
    refreshData 
  } = useGroupedPositions();
  
  // Local UI State
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState([]);
  const [holdingTermFilter, setHoldingTermFilter] = useState([]);
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [accountDetailSort, setAccountDetailSort] = useState("value");
  const [positionDetailSort, setPositionDetailSort] = useState("value");

  // Get unique values for filters
  const uniqueAssetTypes = useMemo(() => {
    return [...new Set(positions.map(p => p.asset_type))].filter(Boolean);
  }, [positions]);

  const uniqueHoldingTerms = useMemo(() => {
    return [...new Set(positions.map(p => p.predominant_holding_term))].filter(Boolean);
  }, [positions]);

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let filtered = positions.filter(position => {
      // Search filter
      if (searchQuery && !position.identifier?.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !position.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Asset type filter
      if (assetTypeFilter.length > 0 && !assetTypeFilter.includes(position.asset_type)) {
        return false;
      }
      
      // Holding term filter
      if (holdingTermFilter.length > 0 && !holdingTermFilter.includes(position.predominant_holding_term)) {
        return false;
      }
      
      // Show only changed filter
      if (showOnlyChanged) {
        const hasChange = position.value_1d_change_pct !== 0 || position.quantity_1d_change_pct !== 0;
        if (!hasChange) return false;
      }
      
      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.identifier?.toLowerCase().localeCompare(b.identifier?.toLowerCase() || '') || 0;
        case 'value-high':
          return (b.total_current_value || 0) - (a.total_current_value || 0);
        case 'value-low':
          return (a.total_current_value || 0) - (b.total_current_value || 0);
        case 'gain-high':
          return (b.total_gain_loss_amt || 0) - (a.total_gain_loss_amt || 0);
        case 'gain-low':
          return (a.total_gain_loss_amt || 0) - (b.total_gain_loss_amt || 0);
        case 'allocation':
          return (b.portfolio_allocation_pct || 0) - (a.portfolio_allocation_pct || 0);
        case 'quantity':
          return (b.total_quantity || 0) - (a.total_quantity || 0);
        default:
          return 0;
      }
    });
  }, [positions, searchQuery, assetTypeFilter, holdingTermFilter, showOnlyChanged, sortOption]);

  // Calculate filtered summary
  const filteredSummary = useMemo(() => {
    return filteredPositions.reduce((acc, position) => {
      acc.totalValue += position.total_current_value || 0;
      acc.totalCost += position.total_cost_basis || 0;
      acc.totalGainLoss += position.total_gain_loss_amt || 0;
      acc.totalIncome += position.total_annual_income || 0;
      acc.count += 1;
      
      // Asset type breakdown
      const assetType = position.asset_type;
      if (assetType === 'security' || assetType === 'crypto' || assetType === 'cash') {
        acc.liquidValue += position.total_current_value || 0;
        acc.liquidIncome += position.total_annual_income || 0;
        acc.liquidCount += 1;
      } else {
        acc.illiquidValue += position.total_current_value || 0;
        acc.illiquidIncome += position.total_annual_income || 0;
        acc.illiquidCount += 1;
      }
      
      return acc;
    }, {
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalIncome: 0,
      count: 0,
      liquidValue: 0,
      liquidIncome: 0,
      liquidCount: 0,
      illiquidValue: 0,
      illiquidIncome: 0,
      illiquidCount: 0
    });
  }, [filteredPositions]);

  // Process positions for display
  const processedPositions = useMemo(() => {
    return filteredPositions.map((position, index) => ({
      ...position,
      displayIndex: index + 1
    }));
  }, [filteredPositions]);

  // Handle sorting
  const handleSort = (option) => {
    setSortOption(option);
  };

  // Sort icon helper
  const getSortIcon = (option) => {
    if (sortOption !== option) return <ArrowUpDown className="w-3 h-3 text-gray-500" />;
    return <ChevronUp className="w-3 h-3" />;
  };

  // Format price change with proper color handling for zero values
  const formatPriceChange = (priceChange, percentChange) => {
    if (!priceChange || priceChange === 0) return null;
    
    const isPositive = priceChange > 0;
    const isZero = priceChange === 0 || percentChange === 0;
    const colorClass = isZero ? 'text-gray-400' : (isPositive ? 'text-green-400' : 'text-red-400');
    
    return (
      <div className={`text-xs ${colorClass}`}>
        {isPositive && !isZero ? '+' : ''}{formatCurrency(priceChange)} 
        ({isPositive && !isZero ? '+' : ''}{percentChange.toFixed(2)}%)
      </div>
    );
  };

  // Format quantity change
  const formatQuantityChange = (quantityChange, percentChange) => {
    if (!quantityChange || quantityChange === 0) return null;
    
    const isPositive = quantityChange > 0;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    
    return (
      <div className={`text-xs ${colorClass}`}>
        {isPositive ? '+' : ''}{formatNumber(quantityChange, { maximumFractionDigits: 2 })} 
        ({isPositive ? '+' : ''}{percentChange.toFixed(2)}%)
      </div>
    );
  };

  const getAssetIcon = (assetType) => {
    switch (assetType) {
      case 'security':
        return <BarChart4 className="w-4 h-4 mr-2 text-blue-400" />;
      case 'crypto':
        return <span className="w-4 h-4 mr-2 text-orange-400">₿</span>;
      case 'metal':
        return <span className="w-4 h-4 mr-2 text-yellow-400">Au</span>;
      case 'cash':
        return <DollarSign className="w-4 h-4 mr-2 text-green-400" />;
      case 'real_estate':
        return <Home className="w-4 h-4 mr-2 text-purple-400" />;
      case 'other_asset':
      case 'vehicle':
        return <Package className="w-4 h-4 mr-2 text-gray-400" />;
      default:
        return <Package className="w-4 h-4 mr-2 text-gray-400" />;
    }
  };

  // Group account details by account for modal
  const groupedAccountDetails = useMemo(() => {
    if (!selectedPosition?.account_details) return [];
    
    const grouped = selectedPosition.account_details.reduce((acc, detail) => {
      const key = detail.account_id || 'other';
      if (!acc[key]) {
        acc[key] = {
          account_id: detail.account_id,
          account_name: detail.account_name || 'Other Asset',
          institution: detail.institution,
          account_type: detail.account_type,
          positions: [],
          totalQuantity: 0,
          totalValue: 0,
          totalCost: 0,
          totalGainLoss: 0,
          totalGainLossPct: 0
        };
      }
      
      acc[key].positions.push(detail);
      acc[key].totalQuantity += detail.quantity || 0;
      acc[key].totalValue += detail.value || 0;
      acc[key].totalCost += detail.cost || 0;
      acc[key].totalGainLoss += detail.gain_loss_amt || 0;
      
      return acc;
    }, {});
    
    // Calculate gain/loss percentage for each account
    Object.values(grouped).forEach(account => {
      account.totalGainLossPct = account.totalCost > 0 
        ? (account.totalGainLoss / account.totalCost) * 100 
        : 0;
    });
    
    return Object.values(grouped).sort((a, b) => {
      switch (accountDetailSort) {
        case 'account':
          return a.account_name.localeCompare(b.account_name);
        case 'value':
        default:
          return b.totalValue - a.totalValue;
      }
    });
  }, [selectedPosition, accountDetailSort]);

  // Sort position details within each account
  const sortedPositionDetails = useMemo(() => {
    if (!selectedPosition?.account_details) return [];
    
    return [...selectedPosition.account_details].sort((a, b) => {
      let compareValue = 0;
      
      switch (positionDetailSort) {
        case 'account':
          compareValue = (a.account_name || '').localeCompare(b.account_name || '');
          break;
        case 'quantity':
          compareValue = (a.quantity || 0) - (b.quantity || 0);
          break;
        case 'cost':
          compareValue = (a.cost_per_unit || 0) - (b.cost_per_unit || 0);
          break;
        case 'value':
        default:
          compareValue = (a.value || 0) - (b.value || 0);
          break;
      }
      
      return compareValue > 0 ? -compareValue : -compareValue;
    });
  }, [selectedPosition, positionDetailSort]);

  // Format performance period data for modal
  const formatPerformancePeriod = (value, pct, label) => {
    // Check if it's a 100% change which typically means no prior data
    if (pct === 100 || (pct === null && value !== null && value !== 0)) {
      return { label, value: 'n.a.', pct: '', color: 'text-gray-500' };
    }
    
    const hasValue = value !== null && value !== undefined && value !== 0;
    const hasPct = pct !== null && pct !== undefined && pct !== 0;
    
    if (!hasValue && !hasPct) {
      return { label, value: 'n.a.', pct: '', color: 'text-gray-500' };
    }
    
    const isPositive = (pct || 0) >= 0;
    const isZero = (pct || 0) === 0 && (value || 0) === 0;
    const color = isZero ? 'text-gray-400' : (isPositive ? 'text-green-400' : 'text-red-400');
    
    return {
      label,
      value: hasValue ? `${isPositive && !isZero ? '+' : ''}${formatCurrency(value)}` : 'n.a.',
      pct: hasPct ? `(${isPositive && !isZero ? '+' : ''}${pct.toFixed(2)}%)` : '',
      color
    };
  };

  // Prepare chart data for historical performance
  const prepareChartData = (position) => {
    if (!position || !position.account_details) return [];
    
    // Mock historical data - in real implementation, this would come from API
    const periods = [
      { period: '6M Ago', value: position.total_current_value * 0.85, cost: position.total_cost_basis },
      { period: '3M Ago', value: position.total_current_value * 0.92, cost: position.total_cost_basis },
      { period: '1M Ago', value: position.total_current_value * 0.98, cost: position.total_cost_basis },
      { period: 'Today', value: position.total_current_value, cost: position.total_cost_basis }
    ];
    
    return periods;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>Error loading positions: {error}</p>
        <button 
          onClick={refreshData} 
          className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button 
              onClick={refreshData}
              disabled={loading}
              className={`px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 transition-colors flex items-center space-x-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            
            <div className="flex gap-3">
              <MultiSelect
                options={uniqueAssetTypes}
                value={assetTypeFilter}
                onChange={setAssetTypeFilter}
                placeholder="Asset Types"
              />
              
              <MultiSelect
                options={uniqueHoldingTerms}
                value={holdingTermFilter}
                onChange={setHoldingTermFilter}
                placeholder="Holding Terms"
              />
              
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="value-high">Value (High)</option>
                <option value="value-low">Value (Low)</option>
                <option value="gain-high">Gain (High)</option>
                <option value="gain-low">Gain (Low)</option>
                <option value="allocation">Allocation</option>
                <option value="quantity">Quantity</option>
                <option value="name">Name</option>
              </select>
              
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyChanged}
                  onChange={(e) => setShowOnlyChanged(e.target.checked)}
                  className="rounded"
                />
                <span>Changed Today</span>
              </label>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-700/50 p-3 rounded">
              <div className="text-gray-400 mb-1">Total Value</div>
              <div className="font-semibold">{formatCurrency(filteredSummary.totalValue)}</div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded">
              <div className="text-gray-400 mb-1">Total Gain/Loss</div>
              <div className={`font-semibold ${
                filteredSummary.totalGainLoss === 0 ? 'text-gray-400' : 
                (filteredSummary.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400')
              }`}>
                {filteredSummary.totalGainLoss >= 0 && filteredSummary.totalGainLoss !== 0 ? '+' : ''}{formatCurrency(filteredSummary.totalGainLoss)}
              </div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded">
              <div className="text-gray-400 mb-1">Annual Income</div>
              <div className="font-semibold">{formatCurrency(filteredSummary.totalIncome)}</div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded">
              <div className="text-gray-400 mb-1">Positions</div>
              <div className="font-semibold">{filteredSummary.count}</div>
              <div className="text-xs text-gray-500">
                Last updated: {lastFetched ? new Date(lastFetched).toLocaleTimeString() : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {processedPositions.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart4 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No positions found</h3>
            <p className="text-gray-400">
              {searchQuery || assetTypeFilter.length > 0 || holdingTermFilter.length > 0 
                ? "Try adjusting your filters" 
                : "Positions will appear here once added"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-white">
                      <span>Position</span>
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('quantity')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Quantity</span>
                      {getSortIcon('quantity')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('value-high')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Value</span>
                      {getSortIcon('value-high')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('gain-high')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Gain/Loss</span>
                      {getSortIcon('gain-high')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Income
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('allocation')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>%</span>
                      {getSortIcon('allocation')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Accounts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {/* Liquid Assets Total Row */}
                {filteredSummary.liquidCount > 0 && (
                  <tr className="bg-blue-900/20 border-t-2 border-blue-600">
                    <td className="px-2 py-2 text-center text-xs font-medium text-blue-400">-</td>
                    <td className="px-2 py-2 text-sm font-semibold text-blue-400">
                      <div className="flex items-center">
                        <BarChart4 className="w-4 h-4 mr-2" />
                        Liquid Assets Total
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center text-sm">-</td>
                    <td className="px-2 py-2 text-center text-sm">-</td>
                    <td className="px-2 py-2 text-right text-sm font-medium">
                      {formatCurrency(filteredSummary.liquidValue)}
                    </td>
                    <td className="px-2 py-2 text-right text-sm">-</td>
                    <td className="px-2 py-2 text-right text-sm">
                      {filteredSummary.liquidIncome > 0 ? formatCurrency(filteredSummary.liquidIncome) : '-'}
                    </td>
                    <td className="px-2 py-2 text-right text-sm">
                      {((filteredSummary.liquidValue / filteredSummary.totalValue) * 100).toFixed(1)}%
                    </td>
                    <td className="px-2 py-2 text-center text-sm">{filteredSummary.liquidCount}</td>
                  </tr>
                )}

                {/* Illiquid Assets Total Row */}
                {filteredSummary.illiquidCount > 0 && (
                  <tr className="bg-purple-900/20 border-t border-purple-600">
                    <td className="px-2 py-2 text-center text-xs font-medium text-purple-400">-</td>
                    <td className="px-2 py-2 text-sm font-semibold text-purple-400">
                      <div className="flex items-center">
                        <Home className="w-4 h-4 mr-2" />
                        Illiquid Assets Total
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center text-sm">-</td>
                    <td className="px-2 py-2 text-center text-sm">-</td>
                    <td className="px-2 py-2 text-right text-sm font-medium">
                      {formatCurrency(filteredSummary.illiquidValue)}
                    </td>
                    <td className="px-2 py-2 text-right text-sm">-</td>
                    <td className="px-2 py-2 text-right text-sm">
                      {filteredSummary.illiquidIncome > 0 ? formatCurrency(filteredSummary.illiquidIncome) : '-'}
                    </td>
                    <td className="px-2 py-2 text-right text-sm">
                      {((filteredSummary.illiquidValue / filteredSummary.totalValue) * 100).toFixed(1)}%
                    </td>
                    <td className="px-2 py-2 text-center text-sm">{filteredSummary.illiquidCount}</td>
                  </tr>
                )}

                {/* Individual Position Rows */}
                {processedPositions.map((position, index) => (
                  <tr 
                    key={`${position.user_id}-${position.identifier}`}
                    className="hover:bg-gray-700/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedPosition(position);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <td className="px-2 py-2 text-center text-xs text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <div className="flex items-center">
                        {getAssetIcon(position.asset_type)}
                        <div>
                          <div className="font-medium">{position.identifier}</div>
                          <div className="text-xs text-gray-400">{position.name}</div>
                          {position.sector && (
                            <div className="text-xs text-gray-500">{position.sector}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      <div>{formatNumber(position.total_quantity, { maximumFractionDigits: 4 })}</div>
                      {formatQuantityChange(position.quantity_1d_change, position.quantity_1d_change_pct)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      {position.latest_price_per_unit ? (
                        <div>
                          <div>{formatCurrency(position.latest_price_per_unit)}</div>
                          {formatPriceChange(position.price_1d_change, position.price_1d_change_pct)}
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      <div className="font-medium">{formatCurrency(position.total_current_value)}</div>
                      {position.value_1d_change && (
                        <div className={`text-xs ${
                          position.value_1d_change === 0 ? 'text-gray-400' : 
                          (position.value_1d_change >= 0 ? 'text-green-400' : 'text-red-400')
                        }`}>
                          {position.value_1d_change > 0 && position.value_1d_change !== 0 ? '+' : ''}{formatCurrency(position.value_1d_change)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      <div className={`font-medium ${
                        position.total_gain_loss_amt === 0 ? 'text-gray-400' : 
                        (position.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400')
                      }`}>
                        {position.total_gain_loss_amt >= 0 && position.total_gain_loss_amt !== 0 ? '+' : ''}{formatCurrency(position.total_gain_loss_amt)}
                      </div>
                      <div 
                        className={`text-xs ${
                          position.total_gain_loss_pct === 0 ? 'text-gray-400' : 
                          (position.total_gain_loss_pct >= 0 ? 'text-green-400' : 'text-red-400')
                        }`}
                        title={`${position.total_gain_loss_pct >= 0 && position.total_gain_loss_pct !== 0 ? '+' : ''}${formatCurrency(position.total_gain_loss_amt)}`}
                      >
                        {position.total_gain_loss_pct >= 0 && position.total_gain_loss_pct !== 0 ? '+' : ''}{formatPercentage(position.total_gain_loss_pct)}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      {position.asset_type === 'security' && position.dividend_yield > 0 ? (
                        <div>
                          <div>{formatCurrency(position.total_annual_income)}</div>
                          <div className="text-xs text-gray-400">
                            {position.dividend_rate > 0 ? `$${position.dividend_rate}/unit` : `${position.dividend_yield}%`}
                          </div>
                        </div>
                      ) : position.asset_type === 'cash' && position.dividend_yield > 0 ? (
                        <div>
                          <div>{formatCurrency(position.total_annual_income)}</div>
                          <div className="text-xs text-gray-400">{position.dividend_yield}% APY</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      <div className="font-medium">{formatPercentage(position.portfolio_allocation_pct / 100)}</div>
                      <div className="text-xs text-gray-400">
                        {position.long_term_value_pct > 0 && `${position.long_term_value_pct.toFixed(0)}% LT`}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full text-xs">
                        {position.account_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedPosition && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsDetailModalOpen(false)} />
          
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[80vh] bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-700 rounded-lg">
                      {getAssetIcon(selectedPosition.asset_type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedPosition.identifier}</h3>
                      <p className="text-sm text-gray-400">{selectedPosition.name}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedPosition.predominant_holding_term === 'Long Term' 
                            ? 'bg-green-900/30 text-green-400' 
                            : 'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {selectedPosition.predominant_holding_term}
                        </span>
                        <span className="text-xs text-gray-500">
                          {selectedPosition.long_term_positions} LT / {selectedPosition.short_term_positions} ST
                        </span>
                        <span className="text-xs text-gray-500">
                          Price: {formatCurrency(selectedPosition.latest_price_per_unit || 0)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Avg Cost: {formatCurrency(selectedPosition.weighted_avg_cost || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800/50 p-4 rounded">
                    <div className="text-xs text-gray-400">Total Value</div>
                    <div className="text-xl font-semibold">{formatCurrency(selectedPosition.total_current_value)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatPercentage(selectedPosition.portfolio_allocation_pct / 100)} of portfolio
                    </div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded">
                    <div className="text-xs text-gray-400">Total Gain/Loss</div>
                    <div className={`text-xl font-semibold ${
                      selectedPosition.total_gain_loss_amt === 0 ? 'text-gray-400' : 
                      (selectedPosition.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400')
                    }`}>
                      {selectedPosition.total_gain_loss_amt >= 0 && selectedPosition.total_gain_loss_amt !== 0 && '+'}{formatCurrency(selectedPosition.total_gain_loss_amt)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedPosition.total_gain_loss_amt >= 0 && selectedPosition.total_gain_loss_amt !== 0 && '+'}{formatPercentage(selectedPosition.total_gain_loss_pct)}
                    </div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded">
                    <div className="text-xs text-gray-400">Annual Income</div>
                    <div className="text-xl font-semibold">{formatCurrency(selectedPosition.total_annual_income)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedPosition.dividend_yield}% yield
                    </div>
                  </div>
                </div>

                {/* Performance Periods */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Performance History (based on available historical data in NestEgg)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      formatPerformancePeriod(selectedPosition.value_1d_change, selectedPosition.value_1d_change_pct, '1 Day'),
                      formatPerformancePeriod(selectedPosition.value_1w_change, selectedPosition.value_1w_change_pct, '1 Week'),
                      formatPerformancePeriod(selectedPosition.value_1m_change, selectedPosition.value_1m_change_pct, '1 Month'),
                      formatPerformancePeriod(selectedPosition.value_3m_change, selectedPosition.value_3m_change_pct, '3 Months'),
                      formatPerformancePeriod(selectedPosition.value_ytd_change, selectedPosition.value_ytd_change_pct, 'YTD'),
                      formatPerformancePeriod(selectedPosition.value_1y_change, selectedPosition.value_1y_change_pct, '1 Year'),
                      formatPerformancePeriod(selectedPosition.value_2y_change, selectedPosition.value_2y_change_pct, '2 Years'),
                      formatPerformancePeriod(selectedPosition.value_3y_change, selectedPosition.value_3y_change_pct, '3 Years'),
                      formatPerformancePeriod(selectedPosition.value_5y_change, selectedPosition.value_5y_change_pct, '5 Years'),
                      formatPerformancePeriod(selectedPosition.value_max_change, selectedPosition.value_max_change_pct, 'Max')
                    ].map((period, idx) => (
                      <div key={idx} className="bg-gray-800/30 p-3 rounded">
                        <div className="text-xs text-gray-400 mb-1">{period.label}</div>
                        <div className={`text-sm font-medium ${period.color}`}>
                          {period.value}
                        </div>
                        {period.pct && (
                          <div className={`text-xs ${period.color}`}>
                            {period.pct}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historical Chart */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Historical Value vs Cost Basis</h4>
                  <div className="bg-gray-800/30 p-4 rounded">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareChartData(selectedPosition)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="period" 
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '6px'
                          }}
                          formatter={(value, name) => [
                            formatCurrency(value), 
                            name === 'value' ? 'Position Value' : 'Cost Basis'
                          ]}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          name="Position Value"
                          dot={{ fill: '#3B82F6' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cost" 
                          stroke="#9CA3AF" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Cost Basis"
                          dot={{ fill: '#9CA3AF' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Account Summary */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-400">Account Summary</h4>
                    <select
                      value={accountDetailSort}
                      onChange={(e) => setAccountDetailSort(e.target.value)}
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs"
                    >
                      <option value="value">Sort by Value</option>
                      <option value="account">Sort by Account</option>
                    </select>
                  </div>
                  
                  <div className="space-y-3">
                    {groupedAccountDetails.map((account) => (
                      <div key={account.account_id} className="bg-gray-800/30 p-4 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <div className="font-medium">{account.account_name}</div>
                            <div className="text-xs text-gray-400">
                              {account.institution} • {account.account_type}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(account.totalValue)}</div>
                            <div className={`text-xs ${
                              account.totalGainLoss === 0 ? 'text-gray-400' : 
                              (account.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400')
                            }`}>
                              {account.totalGainLoss >= 0 && account.totalGainLoss !== 0 ? '+' : ''}{formatCurrency(account.totalGainLoss)} 
                              ({account.totalGainLoss >= 0 && account.totalGainLoss !== 0 ? '+' : ''}{account.totalGainLossPct.toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                        
                        {/* Position Details Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-700">
                                <th className="text-left py-1 text-gray-400">Date</th>
                                <th className="text-right py-1 text-gray-400">Quantity</th>
                                <th className="text-right py-1 text-gray-400">Cost/Unit</th>
                                <th className="text-right py-1 text-gray-400">Value</th>
                                <th className="text-right py-1 text-gray-400">Gain/Loss</th>
                                <th className="text-right py-1 text-gray-400">%</th>
                                <th className="text-center py-1 text-gray-400">Term</th>
                              </tr>
                            </thead>
                            <tbody>
                              {account.positions.map((detail, idx) => (
                                <tr key={idx} className="border-b border-gray-700/50">
                                  <td className="py-1">
                                    {detail.purchase_date ? formatDate(detail.purchase_date) : '-'}
                                  </td>
                                  <td className="text-right py-1">
                                    {formatNumber(detail.quantity || 0, { maximumFractionDigits: 4 })}
                                  </td>
                                  <td className="text-right py-1">
                                    {formatCurrency(detail.cost_per_unit || 0)}
                                  </td>
                                  <td className="text-right py-1 font-medium">
                                    {formatCurrency(detail.value || 0)}
                                  </td>
                                  <td className="text-right py-1">
                                    <span className={
                                      (detail.gain_loss_amt || 0) === 0 ? 'text-gray-400' : 
                                      ((detail.gain_loss_amt || 0) >= 0 ? 'text-green-400' : 'text-red-400')
                                    }>
                                      {(detail.gain_loss_amt || 0) >= 0 && (detail.gain_loss_amt || 0) !== 0 && '+'}{formatCurrency(detail.gain_loss_amt || 0)}
                                    </span>
                                  </td>
                                  <td className="text-right py-1">
                                    <span className={
                                      (detail.gain_loss_pct || 0) === 0 ? 'text-gray-400' : 
                                      ((detail.gain_loss_pct || 0) >= 0 ? 'text-green-400' : 'text-red-400')
                                    }>
                                      {(detail.gain_loss_pct || 0) >= 0 && (detail.gain_loss_pct || 0) !== 0 && '+'}{formatPercentage(detail.gain_loss_pct || 0)}
                                    </span>
                                  </td>
                                  <td className="text-center py-1">
                                    <span className={`px-1 py-0.5 rounded text-xs ${
                                      detail.holding_term === 'Long Term' 
                                        ? 'bg-green-900/30 text-green-400' 
                                        : 'bg-yellow-900/30 text-yellow-400'
                                    }`}>
                                      {detail.holding_term === 'Long Term' ? 'LT' : 'ST'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historical Data Info */}
                {selectedPosition.earliest_snapshot_date && (
                  <div className="mt-6 p-3 bg-gray-800/30 rounded">
                    <div className="text-xs text-gray-400">Historical Data Available Since</div>
                    <div className="text-sm">{selectedPosition.earliest_snapshot_date}</div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-white font-medium"
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

export default UnifiedGroupPositionsTable2;