// frontend/components/tables/UnifiedAccountTable2.js
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, TrendingUp, TrendingDown, ChevronRight, ChevronDown,
  DollarSign, Briefcase, Eye, EyeOff, ArrowUpDown, Search,
  Wallet, RefreshCw, AlertCircle, PiggyBank, Landmark,
  CreditCard, Shield, X, Filter
} from 'lucide-react';
import { useAccounts } from '@/store/hooks';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { 
  ACCOUNT_CATEGORIES, 
  ASSET_TYPES, 
  INSTITUTION_ICONS,
  INSTITUTION_COLORS 
} from '@/utils/constants';

// Helper function to get institution icon
const getInstitutionIcon = (institutionName) => {
  const IconComponent = INSTITUTION_ICONS[institutionName] || Building2;
  return IconComponent;
};

// Helper function to get institution color
const getInstitutionColor = (institutionName) => {
  return INSTITUTION_COLORS[institutionName] || 'gray';
};

const UnifiedAccountTable2 = () => {
  const { 
    accounts, 
    summary, 
    loading, 
    error, 
    refresh,
    isStale 
  } = useAccounts();

  const [showValues, setShowValues] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'totalValue', direction: 'desc' });
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedInstitutions, setSelectedInstitutions] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Time period mapping
  const timeframePeriods = {
    '1D': '1d',
    '1W': '1w', 
    '1M': '1m',
    '3M': '3m',
    'YTD': 'ytd',
    '1Y': '1y',
    '2Y': '2y',
    '3Y': '3y'
  };

  // Get unique institutions and categories
  const uniqueInstitutions = useMemo(() => {
    return [...new Set(accounts.map(acc => acc.institution))].sort();
  }, [accounts]);

  const uniqueCategories = useMemo(() => {
    return [...new Set(accounts.map(acc => acc.category))].sort();
  }, [accounts]);

  // Get performance data based on selected timeframe
  const getPerformanceData = (account) => {
    const period = timeframePeriods[selectedTimeframe];
    const changeKey = `value${period.charAt(0).toUpperCase() + period.slice(1)}Change`;
    const changePctKey = `value${period.charAt(0).toUpperCase() + period.slice(1)}ChangePct`;
    
    return {
      change: account[changeKey] || 0,
      changePct: account[changePctKey] || 0
    };
  };

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.institution.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(account => 
        selectedCategories.has(account.category)
      );
    }

    // Institution filter
    if (selectedInstitutions.size > 0) {
      filtered = filtered.filter(account => 
        selectedInstitutions.has(account.institution)
      );
    }

    return filtered;
  }, [accounts, searchTerm, selectedCategories, selectedInstitutions]);

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    if (!filteredAccounts) return [];
    
    const sorted = [...filteredAccounts].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'performance') {
        const aPref = getPerformanceData(a);
        const bPref = getPerformanceData(b);
        aValue = aPref.changePct;
        bValue = bPref.changePct;
      } else if (sortConfig.key === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortConfig.key === 'institution') {
        aValue = a.institution.toLowerCase();
        bValue = b.institution.toLowerCase();
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }
      
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  }, [filteredAccounts, sortConfig, selectedTimeframe]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Toggle row expansion
  const toggleRow = (accountId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedRows(newExpanded);
  };

  // Toggle category filter
  const toggleCategory = (category) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
  };

  // Toggle institution filter
  const toggleInstitution = (institution) => {
    const newInstitutions = new Set(selectedInstitutions);
    if (newInstitutions.has(institution)) {
      newInstitutions.delete(institution);
    } else {
      newInstitutions.add(institution);
    }
    setSelectedInstitutions(newInstitutions);
  };

  if (loading && !accounts.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-500">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">Error loading accounts</p>
          <button 
            onClick={refresh}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Accounts</h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowValues(!showValues)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={refresh}
              disabled={loading}
              className={`p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center gap-2 ${
              (selectedCategories.size > 0 || selectedInstitutions.size > 0) ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {(selectedCategories.size > 0 || selectedInstitutions.size > 0) && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2">
                {selectedCategories.size + selectedInstitutions.size}
              </span>
            )}
          </button>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategories.has(category)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Institutions</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueInstitutions.map(institution => (
                  <button
                    key={institution}
                    onClick={() => toggleInstitution(institution)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedInstitutions.has(institution)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    {institution}
                  </button>
                ))}
              </div>
            </div>

            {(selectedCategories.size > 0 || selectedInstitutions.size > 0) && (
              <button
                onClick={() => {
                  setSelectedCategories(new Set());
                  setSelectedInstitutions(new Set());
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Time Period Selector */}
      <div className="px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-1">
          {Object.keys(timeframePeriods).map(period => (
            <button
              key={period}
              onClick={() => setSelectedTimeframe(period)}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                selectedTimeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Account
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right py-2 px-4">
                <button
                  onClick={() => handleSort('totalValue')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto text-sm font-medium"
                >
                  Total Value
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right py-2 px-4">
                <button
                  onClick={() => handleSort('totalGainLoss')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto text-sm font-medium"
                >
                  Gain/Loss
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right py-2 px-4">
                <button
                  onClick={() => handleSort('performance')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto text-sm font-medium"
                >
                  {selectedTimeframe} Performance
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-right py-2 px-4">
                <button
                  onClick={() => handleSort('allocationPercent')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto text-sm font-medium"
                >
                  Allocation
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-center py-2 px-4 text-sm font-medium text-gray-400">Assets</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => {
              const perf = getPerformanceData(account);
              const isExpanded = expandedRows.has(account.id);
              const categoryConfig = ACCOUNT_CATEGORIES.find(cat => cat.id === account.category);
              const CategoryIcon = categoryConfig?.icon || Wallet;
              const InstitutionIcon = getInstitutionIcon(account.institution);
              const institutionColor = getInstitutionColor(account.institution);
              
              return (
                <React.Fragment key={account.id}>
                  <motion.tr 
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => toggleRow(account.id)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 bg-${institutionColor}-100 dark:bg-${institutionColor}-900/20 rounded-lg`}>
                          <InstitutionIcon className={`w-5 h-5 text-${institutionColor}-600 dark:text-${institutionColor}-400`} />
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">{account.name}</div>
                          <div className="text-xs text-gray-400">{account.institution} • {account.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="text-white font-medium text-sm">
                        {showValues ? formatCurrency(account.totalValue) : '••••'}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className={`flex items-center justify-end gap-1 text-sm ${
                        account.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {account.totalGainLoss >= 0 ? 
                          <TrendingUp className="w-3 h-3" /> : 
                          <TrendingDown className="w-3 h-3" />
                        }
                        <span className="font-medium">
                          {showValues ? formatCurrency(Math.abs(account.totalGainLoss)) : '••••'}
                        </span>
                        <span className="text-xs">
                          ({formatPercentage(account.totalGainLossPercent)})
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className={`text-sm ${
                        perf.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <span className="font-medium">
                          {showValues ? formatCurrency(Math.abs(perf.change)) : '••••'}
                        </span>
                        <span className="text-xs ml-1">
                          ({perf.changePct >= 0 ? '+' : ''}{formatPercentage(perf.changePct)})
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="text-gray-300 text-sm">
                        {formatPercentage(account.allocationPercent)}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {account.securityPositions > 0 && (
                          <span className="text-xs bg-blue-900/20 text-blue-400 px-2 py-0.5 rounded">
                            {account.securityPositions}
                          </span>
                        )}
                        {account.cryptoPositions > 0 && (
                          <span className="text-xs bg-purple-900/20 text-purple-400 px-2 py-0.5 rounded">
                            {account.cryptoPositions}
                          </span>
                        )}
                        {account.cashPositions > 0 && (
                          <span className="text-xs bg-green-900/20 text-green-400 px-2 py-0.5 rounded">
                            {account.cashPositions}
                          </span>
                        )}
                        {account.otherPositions > 0 && (
                          <span className="text-xs bg-gray-900/20 text-gray-400 px-2 py-0.5 rounded">
                            {account.otherPositions}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <ChevronRight className={`w-4 h-4 text-gray-400 transform transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    </td>
                  </motion.tr>

                  {/* Expanded row with account details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td colSpan={7} className="bg-gray-750 px-4 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {/* Asset breakdown */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Asset Breakdown</h4>
                              <div className="space-y-0.5">
                                {account.securityValue > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Securities</span>
                                    <span className="text-white">{formatCurrency(account.securityValue)}</span>
                                  </div>
                                )}
                                {account.cryptoValue > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Crypto</span>
                                    <span className="text-white">{formatCurrency(account.cryptoValue)}</span>
                                  </div>
                                )}
                                {account.cashValue > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Cash</span>
                                    <span className="text-white">{formatCurrency(account.cashValue)}</span>
                                  </div>
                                )}
                                {account.metalValue > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Metals</span>
                                    <span className="text-white">{formatCurrency(account.metalValue)}</span>
                                  </div>
                                )}
                                {account.otherAssetsValue > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Other</span>
                                    <span className="text-white">{formatCurrency(account.otherAssetsValue)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Metrics */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Metrics</h4>
                              <div className="space-y-0.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Cost Basis</span>
                                  <span className="text-white">{formatCurrency(account.totalCostBasis)}</span>
                                </div>
                                {account.yieldPercent > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Yield</span>
                                    <span className="text-white">{formatPercentage(account.yieldPercent)}</span>
                                  </div>
                                )}
                                {account.dividendIncomeAnnual > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Annual Income</span>
                                    <span className="text-white">{formatCurrency(account.dividendIncomeAnnual)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Liquidity */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Liquidity</h4>
                              <div className="space-y-0.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Liquid</span>
                                  <span className="text-white">{formatCurrency(account.liquidValue)}</span>
                                </div>
                                {account.illiquidValue > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Illiquid</span>
                                    <span className="text-white">{formatCurrency(account.illiquidValue)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Performance Summary */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-400 mb-1">Performance</h4>
                              <div className="space-y-0.5">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">1W</span>
                                  <span className={account.value1wChangePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {formatPercentage(account.value1wChangePct)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">1M</span>
                                  <span className={account.value1mChangePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {formatPercentage(account.value1mChangePct)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">YTD</span>
                                  <span className={account.valueYtdChangePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {formatPercentage(account.valueYtdChangePct)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      {summary && (
        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">
              {filteredAccounts.length} of {accounts.length} accounts
            </span>
            <span className="text-white font-medium">
              Total: {showValues ? formatCurrency(summary.totalPortfolioValue) : '••••'}
            </span>
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {isStale && (
        <div className="px-4 py-2 bg-yellow-900/20 border-t border-yellow-900/40">
          <p className="text-xs text-yellow-500 text-center">
            Data is being refreshed...
          </p>
        </div>
      )}
    </div>
  );
};

export default UnifiedAccountTable2;