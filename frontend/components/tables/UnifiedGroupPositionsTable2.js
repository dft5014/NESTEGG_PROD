import React, { useState, useMemo, useEffect } from 'react';
import { BarChart4, Loader, Search, Filter, TrendingUp, TrendingDown, X, RefreshCw, Info, DollarSign, Home, Package, ChevronDown, Check, ChevronUp, ArrowUpDown, Briefcase } from 'lucide-react';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from '@/utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';

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
  title = "Consolidated Portfolio",
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
  const [accountDetailSort, setAccountDetailSort] = useState({ field: 'value', direction: 'desc' });
  const [positionDetailSort, setPositionDetailSort] = useState({ field: 'value', direction: 'desc' });

  // Get unique asset types
  const assetTypes = useMemo(() => {
    const types = [...new Set(positions.map(pos => pos.asset_type))].filter(Boolean);
    return types.sort();
  }, [positions]);

  // Initialize default filter (everything except real_estate, vehicles, other_assets)
  useEffect(() => {
    if (assetTypes.length > 0 && assetTypeFilter.length === 0) {
      setAssetTypeFilter(assetTypes.filter(type => 
        type !== 'real_estate' && 
        type !== 'vehicle' && 
        type !== 'other_asset'
      ));
    }
  }, [assetTypes]);

  // Process positions with filters and sorting
  const processedPositions = useMemo(() => {
    let filtered = [...positions];
    
    // Apply asset type filter
    if (assetTypeFilter.length > 0 && assetTypeFilter.length < assetTypes.length) {
      filtered = filtered.filter(pos => assetTypeFilter.includes(pos.asset_type));
    }
    
    // Apply holding term filter
    if (holdingTermFilter.length > 0 && holdingTermFilter.length < 2) {
      filtered = filtered.filter(pos => holdingTermFilter.includes(pos.predominant_holding_term));
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pos => 
        (pos.identifier && pos.identifier.toLowerCase().includes(query)) ||
        (pos.name && pos.name.toLowerCase().includes(query)) ||
        (pos.sector && pos.sector.toLowerCase().includes(query)) ||
        (pos.industry && pos.industry.toLowerCase().includes(query))
      );
    }
    
    // Show only positions with recent changes
    if (showOnlyChanged) {
      filtered = filtered.filter(pos => 
        pos.quantity_1d_change !== 0 || 
        pos.quantity_1w_change !== 0 ||
        pos.value_1d_change_pct > 5 || 
        pos.value_1d_change_pct < -5
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      const [field, direction] = sortOption.split('-');
      
      switch (field) {
        case 'value':
          compareValue = (a.total_current_value || 0) - (b.total_current_value || 0);
          break;
        case 'gain_pct':
          compareValue = (a.total_gain_loss_pct || 0) - (b.total_gain_loss_pct || 0);
          break;
        case 'gain_amt':
          compareValue = (a.total_gain_loss_amt || 0) - (b.total_gain_loss_amt || 0);
          break;
        case 'allocation':
          compareValue = (a.portfolio_allocation_pct || 0) - (b.portfolio_allocation_pct || 0);
          break;
        case 'income':
          compareValue = (a.total_annual_income || 0) - (b.total_annual_income || 0);
          break;
        case 'quantity':
          compareValue = (a.total_quantity || 0) - (b.total_quantity || 0);
          break;
        case '1d_change':
          compareValue = (a.value_1d_change_pct || 0) - (b.value_1d_change_pct || 0);
          break;
        case 'age':
          compareValue = (a.avg_position_age_days || 0) - (b.avg_position_age_days || 0);
          break;
        default:
          compareValue = (a.total_current_value || 0) - (b.total_current_value || 0);
      }
      
      return direction === 'low' ? compareValue : -compareValue;
    });
    
    return filtered;
  }, [positions, sortOption, searchQuery, assetTypeFilter, holdingTermFilter, showOnlyChanged, assetTypes]);

  // Calculate filtered summary
  const filteredSummary = useMemo(() => {
    const totalValue = processedPositions.reduce((sum, p) => sum + (p.total_current_value || 0), 0);
    const totalCost = processedPositions.reduce((sum, p) => sum + (p.total_cost_basis || 0), 0);
    const totalGainLoss = processedPositions.reduce((sum, p) => sum + (p.total_gain_loss_amt || 0), 0);
    const totalIncome = processedPositions.reduce((sum, p) => sum + (p.total_annual_income || 0), 0);
    
    return {
      count: processedPositions.length,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPct: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
      totalIncome,
      avgYield: totalValue > 0 ? (totalIncome / totalValue) * 100 : 0
    };
  }, [processedPositions]);

  // Calculate liquid assets summary (excluding real_estate and other non-liquid assets)
  const liquidSummary = useMemo(() => {
    const liquidPositions = processedPositions.filter(p => 
      p.asset_type !== 'real_estate' && 
      p.asset_type !== 'other_asset' && 
      p.asset_type !== 'vehicle'
    );
    const totalValue = liquidPositions.reduce((sum, p) => sum + (p.total_current_value || 0), 0);
    const totalCost = liquidPositions.reduce((sum, p) => sum + (p.total_cost_basis || 0), 0);
    const totalGainLoss = liquidPositions.reduce((sum, p) => sum + (p.total_gain_loss_amt || 0), 0);
    const totalIncome = liquidPositions.reduce((sum, p) => sum + (p.total_annual_income || 0), 0);
    
    return {
      count: liquidPositions.length,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPct: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
      totalIncome,
      avgYield: totalValue > 0 ? (totalIncome / totalValue) * 100 : 0
    };
  }, [processedPositions]);

  // Calculate illiquid assets summary (only other_asset)
    const illiquidSummary = useMemo(() => {
    const illiquidPositions = processedPositions.filter(p => 
        p.asset_type === 'other_asset' || 
        p.asset_type === 'real_estate' || 
        p.asset_type === 'vehicle'
    );
        const totalValue = illiquidPositions.reduce((sum, p) => sum + (p.total_current_value || 0), 0);
    const totalCost = illiquidPositions.reduce((sum, p) => sum + (p.total_cost_basis || 0), 0);
    const totalGainLoss = illiquidPositions.reduce((sum, p) => sum + (p.total_gain_loss_amt || 0), 0);
    const totalIncome = illiquidPositions.reduce((sum, p) => sum + (p.total_annual_income || 0), 0);
    
    return {
      count: illiquidPositions.length,
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPct: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0,
      totalIncome,
      avgYield: totalValue > 0 ? (totalIncome / totalValue) * 100 : 0
    };
  }, [processedPositions]);

  // Sort handler for table headers
  const handleSort = (field) => {
    const newDirection = sortOption.startsWith(field) && sortOption.endsWith('high') ? 'low' : 'high';
    setSortOption(`${field}-${newDirection}`);
  };

  // Get sort icon for headers
  const getSortIcon = (field) => {
    if (!sortOption.startsWith(field)) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortOption.endsWith('high') ? 
      <ChevronDown className="w-3 h-3" /> : 
      <ChevronUp className="w-3 h-3" />;
  };

  // Format helpers
  const formatChange = (value, isPercent = false) => {
    if (value === null || value === undefined || value === 0) return <span className="text-gray-500">n.a.</span>;
    
    const formatted = isPercent ? formatPercentage(value / 100) : formatCurrency(value);
    const isPositive = value > 0;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    
    return (
      <span className={colorClass}>
        {isPositive && '+'}{formatted}
      </span>
    );
  };

  // Format performance change with proper n.a. handling
  const formatPerformanceChange = (percentChange, valueChange) => {
    // Check if it's a 100% change which typically means no prior data
    if (percentChange === 100 || percentChange === null || percentChange === undefined) {
      return <span className="text-gray-500 text-xs">n.a.</span>;
    }
    
    if (percentChange === 0) {
      return <span className="text-gray-500 text-xs">-</span>;
    }
    
    const isPositive = percentChange > 0;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    
    return (
      <div className={`text-xs ${colorClass}`}>
        {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
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
    
    return Object.values(grouped);
  }, [selectedPosition]);

  // Sort grouped account details
  const sortedAccountDetails = useMemo(() => {
    return [...groupedAccountDetails].sort((a, b) => {
      let compareValue = 0;
      const { field, direction } = accountDetailSort;
      
      switch (field) {
        case 'account':
          compareValue = (a.account_name || '').localeCompare(b.account_name || '');
          break;
        case 'quantity':
          compareValue = a.totalQuantity - b.totalQuantity;
          break;
        case 'value':
          compareValue = a.totalValue - b.totalValue;
          break;
        case 'cost':
          compareValue = a.totalCost - b.totalCost;
          break;
        case 'gain':
          compareValue = a.totalGainLoss - b.totalGainLoss;
          break;
        case 'gain_pct':
          compareValue = a.totalGainLossPct - b.totalGainLossPct;
          break;
        default:
          compareValue = a.totalValue - b.totalValue;
      }
      
      return direction === 'asc' ? compareValue : -compareValue;
    });
  }, [groupedAccountDetails, accountDetailSort]);

  // Sort position details for modal
  const sortedPositionDetails = useMemo(() => {
    if (!selectedPosition?.account_details) return [];
    
    return [...selectedPosition.account_details].sort((a, b) => {
      let compareValue = 0;
      const { field, direction } = positionDetailSort;
      
      switch (field) {
        case 'account':
          compareValue = (a.account_name || '').localeCompare(b.account_name || '');
          break;
        case 'date':
          compareValue = new Date(a.purchase_date || 0) - new Date(b.purchase_date || 0);
          break;
        case 'age':
          compareValue = (a.position_age_days || 0) - (b.position_age_days || 0);
          break;
        case 'quantity':
          compareValue = (a.quantity || 0) - (b.quantity || 0);
          break;
        case 'value':
          compareValue = (a.value || 0) - (b.value || 0);
          break;
        case 'cost':
          compareValue = (a.cost || 0) - (b.cost || 0);
          break;
        case 'gain':
          compareValue = (a.gain_loss_amt || 0) - (b.gain_loss_amt || 0);
          break;
        case 'gain_pct':
          compareValue = (a.gain_loss_pct || 0) - (b.gain_loss_pct || 0);
          break;
        default:
          compareValue = (a.value || 0) - (b.value || 0);
      }
      
      return direction === 'asc' ? compareValue : -compareValue;
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
    const color = isPositive ? 'text-green-400' : 'text-red-400';
    
    return {
      label,
      value: hasValue ? `${isPositive ? '+' : ''}${formatCurrency(value)}` : 'n.a.',
      pct: hasPct ? `(${isPositive ? '+' : ''}${pct.toFixed(2)}%)` : '',
      color
    };
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

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search positions..."
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <MultiSelect
              options={assetTypes}
              value={assetTypeFilter}
              onChange={setAssetTypeFilter}
              placeholder="Asset Types"
            />
            
            <MultiSelect
              options={['Long Term', 'Short Term']}
              value={holdingTermFilter}
              onChange={setHoldingTermFilter}
              placeholder="Holding Term"
            />
            
            <button
              onClick={() => setShowOnlyChanged(!showOnlyChanged)}
              className={`px-3 py-2 text-sm border rounded transition-colors flex items-center space-x-2 ${
                showOnlyChanged 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Changed</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-900/50 border-b border-gray-700">
          <div>
            <div className="text-xs text-gray-400">Total Value</div>
            <div className="text-lg font-semibold">{formatCurrency(filteredSummary.totalValue)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Gain/Loss</div>
            <div className={`text-lg font-semibold ${filteredSummary.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {filteredSummary.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(filteredSummary.totalGainLoss)}
              <span className="text-xs ml-1">({formatPercentage(filteredSummary.totalGainLossPct / 100)})</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Annual Income</div>
            <div className="text-lg font-semibold">
              {formatCurrency(filteredSummary.totalIncome)}
              <span className="text-xs text-gray-400 ml-1">({filteredSummary.avgYield.toFixed(2)}%)</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Long Term %</div>
            <div className="text-lg font-semibold text-green-400">
              {metrics.longTermPercentage.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Last Updated</div>
            <div className="text-sm">
              {lastFetched ? new Date(lastFetched).toLocaleTimeString() : '-'}
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
                    <button onClick={() => handleSort('value')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Value</span>
                      {getSortIcon('value')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Cost Basis
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('gain_amt')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Gain/Loss</span>
                      {getSortIcon('gain_amt')}
                    </button>
                  </th>
                  <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    1D
                  </th>
                  <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    1W
                  </th>
                  <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    1M
                  </th>
                  <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    YTD
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('income')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Income</span>
                      {getSortIcon('income')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('allocation')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Weight</span>
                      {getSortIcon('allocation')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Accounts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {/* Total Portfolio Row */}
                <tr className="bg-gray-900/70 font-semibold">
                  <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                  <td className="px-2 py-2 text-sm">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2 text-blue-400" />
                      Total Portfolio
                    </div>
                  </td>
                  <td colSpan="2" className="px-2 py-2"></td>
                  <td className="px-2 py-2 text-right text-sm">
                    {formatCurrency(filteredSummary.totalValue)}
                  </td>
                  <td className="px-2 py-2 text-right text-sm text-gray-400">
                    {formatCurrency(filteredSummary.totalCost)}
                  </td>
                  <td className="px-2 py-2 text-right text-sm">
                    <div className={filteredSummary.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {filteredSummary.totalGainLoss >= 0 && '+'}{formatCurrency(filteredSummary.totalGainLoss)}
                      <div className="text-xs">
                        {filteredSummary.totalGainLoss >= 0 && '+'}{formatPercentage(filteredSummary.totalGainLossPct / 100)}
                      </div>
                    </div>
                  </td>
                  <td colSpan="4" className="px-2 py-2"></td>
                  <td className="px-2 py-2 text-right text-sm">
                    {formatCurrency(filteredSummary.totalIncome)}
                    <div className="text-xs text-gray-400">{filteredSummary.avgYield.toFixed(2)}%</div>
                  </td>
                  <td className="px-2 py-2 text-right text-sm">100%</td>
                  <td className="px-2 py-2 text-center text-sm">{filteredSummary.count}</td>
                </tr>

                {/* Liquid Assets Row */}
                <tr className="bg-gray-900/50 font-medium">
                  <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                  <td className="px-2 py-2 text-sm">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                      Liquid Assets
                    </div>
                  </td>
                  <td colSpan="2" className="px-2 py-2"></td>
                  <td className="px-2 py-2 text-right text-sm">
                    {formatCurrency(liquidSummary.totalValue)}
                  </td>
                  <td className="px-2 py-2 text-right text-sm text-gray-400">
                    {formatCurrency(liquidSummary.totalCost)}
                  </td>
                  <td className="px-2 py-2 text-right text-sm">
                    <div className={liquidSummary.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {liquidSummary.totalGainLoss >= 0 && '+'}{formatCurrency(liquidSummary.totalGainLoss)}
                      <div className="text-xs">
                        {liquidSummary.totalGainLoss >= 0 && '+'}{formatPercentage(liquidSummary.totalGainLossPct / 100)}
                      </div>
                    </div>
                  </td>
                  <td colSpan="4" className="px-2 py-2"></td>
                  <td className="px-2 py-2 text-right text-sm">
                    {formatCurrency(liquidSummary.totalIncome)}
                    <div className="text-xs text-gray-400">{liquidSummary.avgYield.toFixed(2)}%</div>
                  </td>
                  <td className="px-2 py-2 text-right text-sm">
                    {((liquidSummary.totalValue / filteredSummary.totalValue) * 100).toFixed(1)}%
                  </td>
                  <td className="px-2 py-2 text-center text-sm">{liquidSummary.count}</td>
                </tr>

                {/* Illiquid Assets Row */}
                {illiquidSummary.count > 0 && (
                  <tr className="bg-gray-900/50 font-medium">
                    <td className="px-2 py-2 text-center text-xs text-gray-400">-</td>
                    <td className="px-2 py-2 text-sm">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 mr-2 text-gray-400" />
                        Illiquid Assets
                      </div>
                    </td>
                    <td colSpan="2" className="px-2 py-2"></td>
                    <td className="px-2 py-2 text-right text-sm">
                      {formatCurrency(illiquidSummary.totalValue)}
                    </td>
                    <td className="px-2 py-2 text-right text-sm text-gray-400">
                      {formatCurrency(illiquidSummary.totalCost)}
                    </td>
                    <td className="px-2 py-2 text-right text-sm">
                      {illiquidSummary.totalGainLoss !== 0 ? (
                        <div className={illiquidSummary.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {illiquidSummary.totalGainLoss >= 0 && '+'}{formatCurrency(illiquidSummary.totalGainLoss)}
                          <div className="text-xs">
                            {illiquidSummary.totalGainLoss >= 0 && '+'}{formatPercentage(illiquidSummary.totalGainLossPct / 100)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td colSpan="4" className="px-2 py-2"></td>
                    <td className="px-2 py-2 text-right text-sm">
                      {illiquidSummary.totalIncome > 0 ? (
                        <>
                          {formatCurrency(illiquidSummary.totalIncome)}
                          <div className="text-xs text-gray-400">{illiquidSummary.avgYield.toFixed(2)}%</div>
                        </>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-sm">
                      {((illiquidSummary.totalValue / filteredSummary.totalValue) * 100).toFixed(1)}%
                    </td>
                    <td className="px-2 py-2 text-center text-sm">{illiquidSummary.count}</td>
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
                      {position.latest_price_per_unit ? formatCurrency(position.latest_price_per_unit) : '-'}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      <div className="font-medium">{formatCurrency(position.total_current_value)}</div>
                      <div className="text-xs text-gray-400">
                        {formatPercentage(position.value_1d_change_pct / 100)}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right text-gray-400">
                      {formatCurrency(position.total_cost_basis)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      {position.total_gain_loss_amt !== null ? (
                        <>
                          <div className={position.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {position.total_gain_loss_amt >= 0 && '+'}{formatCurrency(position.total_gain_loss_amt)}
                          </div>
                          <div className={`text-xs ${position.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {position.total_gain_loss_amt >= 0 && '+'}{formatPercentage(position.total_gain_loss_pct)}
                          </div>
                        </>
                      ) : null}
                    </td>
                    <td className="px-1 py-2 text-center text-sm">
                      {formatPerformanceChange(position.value_1d_change_pct, position.value_1d_change)}
                    </td>
                    <td className="px-1 py-2 text-center text-sm">
                      {formatPerformanceChange(position.value_1w_change_pct, position.value_1w_change)}
                    </td>
                    <td className="px-1 py-2 text-center text-sm">
                      {formatPerformanceChange(position.value_1m_change_pct, position.value_1m_change)}
                    </td>
                    <td className="px-1 py-2 text-center text-sm">
                      {formatPerformanceChange(position.value_ytd_change_pct, position.value_ytd_change)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                      {position.asset_type !== 'cash' && position.total_annual_income > 0 ? (
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
            <div 
                className="w-full max-w-5xl max-h-[75vh] bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                >
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
              <div className="flex-1 overflow-y-auto p-6 max-h-[calc(75vh-8rem)]">
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
                      selectedPosition.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedPosition.total_gain_loss_amt >= 0 && '+'}{formatCurrency(selectedPosition.total_gain_loss_amt)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedPosition.total_gain_loss_amt >= 0 && '+'}{formatPercentage(selectedPosition.total_gain_loss_pct)}
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
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Performance History</h4>
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


                {/* Position Value vs Cost Basis Chart */}
                {selectedPosition.performance_history && selectedPosition.performance_history.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Value vs Cost Basis Over Time</h4>
                    <div className="bg-gray-800/50 p-4 rounded" style={{ height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={selectedPosition.performance_history.map(h => ({
                            date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            value: h.value,
                            costBasis: selectedPosition.total_cost_basis
                          }))}
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} />
                          <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            formatter={(value) => formatCurrency(value)}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="line"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            name="Market Value"
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="costBasis" 
                            stroke="#60A5FA" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Cost Basis"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}


                {/* Account Summary Table */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Account Summary</h4>
                  <div className="bg-gray-800/30 rounded overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-900/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                            <button
                              onClick={() => setAccountDetailSort({
                                field: 'account',
                                direction: accountDetailSort.field === 'account' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                              })}
                              className="flex items-center space-x-1 hover:text-white"
                            >
                              <span>Account</span>
                              {accountDetailSort.field === 'account' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                              onClick={() => setAccountDetailSort({
                                field: 'quantity',
                                direction: accountDetailSort.field === 'quantity' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                              })}
                              className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                              <span>Shares</span>
                              {accountDetailSort.field === 'quantity' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                              onClick={() => setAccountDetailSort({
                                field: 'value',
                                direction: accountDetailSort.field === 'value' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                              })}
                              className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                              <span>Market Value</span>
                              {accountDetailSort.field === 'value' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                              onClick={() => setAccountDetailSort({
                                field: 'cost',
                                direction: accountDetailSort.field === 'cost' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                              })}
                              className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                              <span>Cost Basis</span>
                              {accountDetailSort.field === 'cost' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                              onClick={() => setAccountDetailSort({
                                field: 'gain',
                                direction: accountDetailSort.field === 'gain' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                              })}
                              className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                              <span>Gain/Loss</span>
                              {accountDetailSort.field === 'gain' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                              onClick={() => setAccountDetailSort({
                                field: 'gain_pct',
                                direction: accountDetailSort.field === 'gain_pct' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                              })}
                              className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                              <span>%</span>
                              {accountDetailSort.field === 'gain_pct' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                              )}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {sortedAccountDetails.map((account, idx) => (
                          <tr key={idx} className="hover:bg-gray-700/30">
                            <td className="px-3 py-2 text-sm">
                              <div>
                                <div className="font-medium">{account.account_name}</div>
                                {account.institution && (
                                  <div className="text-xs text-gray-400">{account.institution}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-right">
                              {formatNumber(account.totalQuantity, { maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-3 py-2 text-sm text-right font-medium">
                              {formatCurrency(account.totalValue)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-gray-400">
                              {formatCurrency(account.totalCost)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right">
                              <span className={account.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {account.totalGainLoss >= 0 && '+'}{formatCurrency(account.totalGainLoss)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-right">
                              <span className={account.totalGainLossPct >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {account.totalGainLossPct >= 0 && '+'}{formatPercentage(account.totalGainLossPct / 100)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Position Details Table */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Position Details</h4>
                  <div className="bg-gray-800/30 rounded overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900/50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'account',
                                direction: accountDetailSort.field === 'account' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white"
                            >
                                <span>Account</span>
                                {accountDetailSort.field === 'account' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>

                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'quantity',
                                direction: accountDetailSort.field === 'quantity' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                                <span>Purchase Date</span>
                                {accountDetailSort.field === 'quantity' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>

                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'quantity',
                                direction: accountDetailSort.field === 'quantity' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                                <span>Position Age</span>
                                {accountDetailSort.field === 'quantity' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>

                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'quantity',
                                direction: accountDetailSort.field === 'quantity' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                                <span>Shares</span>
                                {accountDetailSort.field === 'quantity' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'value',
                                direction: accountDetailSort.field === 'value' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                                <span>Market Value</span>
                                {accountDetailSort.field === 'value' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'cost',
                                direction: accountDetailSort.field === 'cost' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                                <span>Cost Basis</span>
                                {accountDetailSort.field === 'cost' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'gain',
                                direction: accountDetailSort.field === 'gain' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                                <span>Gain/Loss</span>
                                {accountDetailSort.field === 'gain' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                            <button
                                onClick={() => setAccountDetailSort({
                                field: 'gain_pct',
                                direction: accountDetailSort.field === 'gain_pct' && accountDetailSort.direction === 'desc' ? 'asc' : 'desc'
                                })}
                                className="flex items-center space-x-1 hover:text-white ml-auto"
                            >
                                <span>%</span>
                                {accountDetailSort.field === 'gain_pct' && (
                                accountDetailSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                )}
                            </button>
                            </th>
                        </tr>
                        </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedPositionDetails.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-gray-700/30">
                            <td className="px-2 py-2 text-xs">{detail.account_name || 'Other'}</td>
                            <td className="px-2 py-2 text-xs">{detail.purchase_date || '-'}</td>
                            <td className="px-2 py-2 text-xs text-right">{detail.position_age_days || 0}d</td>
                            <td className="px-2 py-2 text-xs text-right">
                            {formatNumber(detail.quantity || 0, { maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-2 py-2 text-xs text-right">
                            {formatCurrency(selectedPosition.latest_price_per_unit || 0)}
                            </td>
                            <td className="px-2 py-2 text-xs text-right font-medium">
                            {formatCurrency(detail.value)}
                            </td>
                            <td className="px-2 py-2 text-xs text-right text-gray-400">
                            {formatCurrency(detail.cost / (detail.quantity || 1))}
                            </td>
                            <td className="px-2 py-2 text-xs text-right">
                            <span className={detail.gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {detail.gain_loss_amt >= 0 && '+'}{formatCurrency(detail.gain_loss_amt)}
                            </span>
                            </td>
                            <td className="px-2 py-2 text-xs text-right">
                            <span className={detail.gain_loss_pct >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {detail.gain_loss_pct >= 0 && '+'}{formatPercentage(detail.gain_loss_pct)}
                            </span>
                            </td>
                            <td className="px-2 py-2 text-xs text-center">
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