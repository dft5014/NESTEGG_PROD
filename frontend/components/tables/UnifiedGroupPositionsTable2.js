import React, { useState, useMemo, useEffect } from 'react';
import { BarChart4, Loader, Search, Filter, TrendingUp, TrendingDown, X, RefreshCw, Info } from 'lucide-react';
import { formatCurrency, formatPercentage, formatNumber, formatDate } from '@/utils/formatters';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';

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
  const [assetTypeFilter, setAssetTypeFilter] = useState("all");
  const [holdingTermFilter, setHoldingTermFilter] = useState("all");
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);

  // Get unique asset types
  const assetTypes = useMemo(() => {
    const types = [...new Set(positions.map(pos => pos.asset_type))].filter(Boolean);
    return types.sort();
  }, [positions]);

  // Process positions with filters and sorting
  const processedPositions = useMemo(() => {
    let filtered = [...positions];
    
    // Apply asset type filter
    if (assetTypeFilter !== 'all') {
      filtered = filtered.filter(pos => pos.asset_type === assetTypeFilter);
    }
    
    // Apply holding term filter
    if (holdingTermFilter !== 'all') {
      filtered = filtered.filter(pos => pos.predominant_holding_term === holdingTermFilter);
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
  }, [positions, sortOption, searchQuery, assetTypeFilter, holdingTermFilter, showOnlyChanged]);

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

  // Format helpers
  const formatChange = (value, isPercent = false) => {
    if (value === null || value === undefined || value === 0) return <span className="text-gray-500">-</span>;
    
    const formatted = isPercent ? formatPercentage(value / 100) : formatCurrency(value);
    const isPositive = value > 0;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    
    return (
      <span className={colorClass}>
        {isPositive && '+'}{formatted}
      </span>
    );
  };

  const formatQuantityChange = (change, changePct) => {
    if (!change || change === 0) return null;
    
    const isPositive = change > 0;
    const colorClass = isPositive ? 'text-blue-400' : 'text-orange-400';
    
    return (
      <div className={`text-xs ${colorClass}`}>
        {isPositive && '+'}{formatNumber(change, { maximumFractionDigits: 2 })}
        <span className="ml-1">({isPositive && '+'}{changePct.toFixed(1)}%)</span>
      </div>
    );
  };

  // Handle refresh
  const handleRefresh = () => {
    refreshData();
  };

  // Loading state
  if (loading && !positions.length) {
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
  if (error && !positions.length) {
    return (
      <div className="bg-red-900/60 p-4 rounded-lg text-red-200">
        <div className="font-medium mb-1">Error Loading Positions</div>
        <div className="text-sm">{error}</div>
        <button onClick={handleRefresh} className="mt-2 text-xs bg-red-800/80 hover:bg-red-700/80 py-1 px-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center p-3 border-b border-gray-700 gap-4">
          <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
            <BarChart4 className="w-5 h-5 mr-2 text-purple-400" />
            {title}
            {isStale && <span className="ml-2 text-xs text-yellow-500">(Stale)</span>}
          </h2>
          
          <div className='flex flex-wrap items-center gap-3'>
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                loading 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Filters */}
            <select
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
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

            <select
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
              value={holdingTermFilter}
              onChange={(e) => setHoldingTermFilter(e.target.value)}
            >
              <option value="all">All Terms</option>
              <option value="Long Term">Long Term</option>
              <option value="Short Term">Short Term</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none w-40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort */}
            <select
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="value-high">Value ↓</option>
              <option value="value-low">Value ↑</option>
              <option value="gain_pct-high">Gain % ↓</option>
              <option value="gain_pct-low">Gain % ↑</option>
              <option value="1d_change-high">1D Change ↓</option>
              <option value="1d_change-low">1D Change ↑</option>
              <option value="allocation-high">Weight ↓</option>
              <option value="income-high">Income ↓</option>
              <option value="age-high">Age ↓</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-gray-900/30 border-b border-gray-700">
          <div>
            <div className="text-xs text-gray-400">Positions</div>
            <div className="text-lg font-semibold">{filteredSummary.count} / {summary.total_positions}</div>
          </div>
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
              {searchQuery || assetTypeFilter !== "all" || holdingTermFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Positions will appear here once added"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Cost Basis
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Gain/Loss
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    1D Change
                  </th>
                  {showHistoricalColumns && (
                    <>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        1W Change
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        1M Change
                      </th>
                    </>
                  )}
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Accounts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                {processedPositions.map((position) => (
                  <tr 
                    key={`${position.user_id}-${position.asset_type}-${position.identifier}`}
                    onClick={() => {
                      setSelectedPosition(position);
                      setIsDetailModalOpen(true);
                    }}
                    className="hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {position.asset_type === 'security' && <BarChart4 className="w-4 h-4 mr-2 text-blue-400" />}
                        {position.asset_type === 'crypto' && <span className="w-4 h-4 mr-2 text-orange-400">₿</span>}
                        {position.asset_type === 'metal' && <span className="w-4 h-4 mr-2 text-yellow-400">Au</span>}
                        {position.asset_type === 'cash' && <span className="w-4 h-4 mr-2 text-green-400">$</span>}
                        <div>
                          <div className="text-sm font-medium text-white">{position.identifier}</div>
                          <div className="text-xs text-gray-400">{position.name}</div>
                          {position.sector && (
                            <div className="text-xs text-gray-500">{position.sector}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                      <div>{formatNumber(position.total_quantity, { 
                        maximumFractionDigits: position.asset_type === 'crypto' ? 8 : 2 
                      })}</div>
                      {formatQuantityChange(position.quantity_1d_change, position.quantity_1d_change_pct)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrency(position.latest_price_per_unit)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-medium">
                      {formatCurrency(position.total_current_value)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-400">
                      {formatCurrency(position.total_cost_basis)}
                      {position.weighted_avg_cost > 0 && (
                        <div className="text-xs">@ {formatCurrency(position.weighted_avg_cost)}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                      <div className={position.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {position.total_gain_loss_amt >= 0 && '+'}{formatCurrency(position.total_gain_loss_amt)}
                      </div>
                      <div className={`text-xs ${position.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {position.total_gain_loss_amt >= 0 && '+'}{formatPercentage(position.total_gain_loss_pct)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                      <div>{formatChange(position.value_1d_change)}</div>
                      <div className="text-xs">{formatChange(position.value_1d_change_pct, true)}</div>
                    </td>
                    {showHistoricalColumns && (
                      <>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                          <div>{formatChange(position.value_1w_change)}</div>
                          <div className="text-xs">{formatChange(position.value_1w_change_pct, true)}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                          <div>{formatChange(position.value_1m_change)}</div>
                          <div className="text-xs">{formatChange(position.value_1m_change_pct, true)}</div>
                        </td>
                      </>
                    )}
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right">
                      {formatPercentage(position.portfolio_allocation_pct / 100)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  {selectedPosition.asset_type === 'security' && <BarChart4 className="w-5 h-5 mr-2 text-blue-400" />}
                  {selectedPosition.asset_type === 'crypto' && <span className="w-5 h-5 mr-2 text-orange-400">₿</span>}
                  {selectedPosition.asset_type === 'metal' && <span className="w-5 h-5 mr-2 text-yellow-400">Au</span>}
                  {selectedPosition.asset_type === 'cash' && <span className="w-5 h-5 mr-2 text-green-400">$</span>}
                  {selectedPosition.identifier} - {selectedPosition.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  {selectedPosition.sector && <span>{selectedPosition.sector} • {selectedPosition.industry}</span>}
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    selectedPosition.predominant_holding_term === 'Long Term' 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {selectedPosition.predominant_holding_term}
                  </span>
                  <span>{selectedPosition.long_term_positions} LT / {selectedPosition.short_term_positions} ST</span>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Performance Grid */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Performance Over Time</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-3">
                  {[
                    { label: '1D', value: selectedPosition.value_1d_change_pct, amount: selectedPosition.value_1d_change },
                    { label: '1W', value: selectedPosition.value_1w_change_pct, amount: selectedPosition.value_1w_change },
                    { label: '1M', value: selectedPosition.value_1m_change_pct, amount: selectedPosition.value_1m_change },
                    { label: '3M', value: selectedPosition.value_3m_change_pct, amount: selectedPosition.value_3m_change },
                    { label: 'YTD', value: selectedPosition.value_ytd_change_pct, amount: selectedPosition.value_ytd_change },
                    { label: '1Y', value: selectedPosition.value_1y_change_pct, amount: selectedPosition.value_1y_change },
                    { label: '2Y', value: selectedPosition.value_2y_change_pct, amount: selectedPosition.value_2y_change },
                    { label: '3Y', value: selectedPosition.value_3y_change_pct, amount: selectedPosition.value_3y_change },
                    { label: '5Y', value: selectedPosition.value_5y_change_pct, amount: selectedPosition.value_5y_change },
                    { label: 'Max', value: selectedPosition.value_max_change_pct, amount: selectedPosition.value_max_change },
                  ].map((period) => (
                    <div key={period.label} className="bg-gray-700/30 p-3 rounded">
                      <div className="text-xs text-gray-400 mb-1">{period.label}</div>
                      <div className={`text-sm font-semibold ${
                        period.value > 0 ? 'text-green-400' : period.value < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {period.value ? `${period.value > 0 ? '+' : ''}${period.value.toFixed(2)}%` : '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {period.amount ? formatCurrency(period.amount) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700/30 p-4 rounded">
                  <div className="text-xs text-gray-400">Total Value</div>
                  <div className="text-xl font-semibold">{formatCurrency(selectedPosition.total_current_value)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatPercentage(selectedPosition.portfolio_allocation_pct / 100)} of portfolio
                  </div>
                </div>
                <div className="bg-gray-700/30 p-4 rounded">
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
                <div className="bg-gray-700/30 p-4 rounded">
                  <div className="text-xs text-gray-400">Annual Income</div>
                  <div className="text-xl font-semibold">{formatCurrency(selectedPosition.total_annual_income)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatPercentage(selectedPosition.dividend_yield)} yield
                  </div>
                </div>
                <div className="bg-gray-700/30 p-4 rounded">
                  <div className="text-xs text-gray-400">Position Age</div>
                  <div className="text-xl font-semibold">
                    {Math.round(selectedPosition.avg_position_age_days / 365 * 10) / 10} years
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Since {selectedPosition.earliest_purchase_date}
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Account Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Account</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Quantity</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Cost Basis</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Gain/Loss</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase">Holding Term</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase">Purchase Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                      {selectedPosition.account_details.map((account, idx) => (
                        <tr key={idx} className="hover:bg-gray-700/20">
                          <td className="px-3 py-2 text-sm">
                            <div>{account.account_name}</div>
                            <div className="text-xs text-gray-500">{account.account_type}</div>
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            {formatNumber(account.quantity, { 
                              maximumFractionDigits: selectedPosition.asset_type === 'crypto' ? 8 : 2 
                            })}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-medium">
                            {formatCurrency(account.value)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-400">
                            {formatCurrency(account.cost)}
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            <div className={account.gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {account.gain_loss_amt >= 0 && '+'}{formatCurrency(account.gain_loss_amt)}
                            </div>
                            <div className={`text-xs ${account.gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {account.gain_loss_pct >= 0 && '+'}{formatPercentage(account.gain_loss_pct)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-center">
                            <span className={`text-xs px-2 py-1 rounded ${
                              account.holding_term === 'Long Term' 
                                ? 'bg-green-900/30 text-green-400' 
                                : 'bg-yellow-900/30 text-yellow-400'
                            }`}>
                              {account.holding_term || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-center text-gray-400">
                            {account.purchase_date || '-'}
                          </td>
                        </tr>
                      ))}
                      {/* Summary Row */}
                      <tr className="bg-gray-900/30 font-medium">
                        <td className="px-3 py-2 text-sm">Total</td>
                        <td className="px-3 py-2 text-sm text-right">
                          {formatNumber(selectedPosition.total_quantity, { 
                            maximumFractionDigits: selectedPosition.asset_type === 'crypto' ? 8 : 2 
                          })}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {formatCurrency(selectedPosition.total_current_value)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {formatCurrency(selectedPosition.total_cost_basis)}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <div className={selectedPosition.total_gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {selectedPosition.total_gain_loss_amt >= 0 && '+'}{formatCurrency(selectedPosition.total_gain_loss_amt)}
                          </div>
                        </td>
                        <td colSpan="2" className="px-3 py-2 text-sm text-center text-gray-400">
                          {selectedPosition.account_count} accounts
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Info */}
              {selectedPosition.earliest_snapshot_date && (
                <div className="mt-6 p-4 bg-gray-700/20 rounded">
                  <div className="text-xs text-gray-400 mb-1">Historical Data Available Since</div>
                  <div className="text-sm">{selectedPosition.earliest_snapshot_date}</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-900 border-t border-gray-700 text-right">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-white font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnifiedGroupPositionsTable2;