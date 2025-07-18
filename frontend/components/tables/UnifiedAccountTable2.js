// frontend/components/tables/UnifiedAccountTable2.js
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, TrendingUp, TrendingDown, ChevronRight, 
  DollarSign, Briefcase, Eye, EyeOff, ArrowUpDown,
  Wallet, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAccounts } from '@/store/hooks';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

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
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Timeframe options
  const timeframes = [
    { id: '1d', label: '1D' },
    { id: '1w', label: '1W' },
    { id: '1m', label: '1M' },
    { id: '3m', label: '3M' },
    { id: 'ytd', label: 'YTD' },
    { id: '1y', label: '1Y' }
  ];

  // Get performance data based on selected timeframe
  const getPerformanceData = (account) => {
    const perfMap = {
      '1d': { change: account.value1dChange, changePct: account.value1dChangePct },
      '1w': { change: account.value1wChange, changePct: account.value1wChangePct },
      '1m': { change: account.value1mChange, changePct: account.value1mChangePct },
      '3m': { change: account.value3mChange, changePct: account.value3mChangePct },
      'ytd': { change: account.valueYtdChange, changePct: account.valueYtdChangePct },
      '1y': { change: account.value1yChange, changePct: account.value1yChangePct }
    };
    return perfMap[selectedTimeframe] || perfMap['1d'];
  };

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    if (!accounts) return [];
    
    const sorted = [...accounts].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'performance') {
        const aPref = getPerformanceData(a);
        const bPref = getPerformanceData(b);
        aValue = aPref.changePct;
        bValue = bPref.changePct;
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
  }, [accounts, sortConfig, selectedTimeframe]);

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
    <div className="bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Account Summary</h2>
          {summary && (
            <p className="text-gray-400 text-sm">
              {summary.totalAccounts} accounts • Total value: {formatCurrency(summary.totalPortfolioValue)}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Timeframe selector */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            {timeframes.map(tf => (
              <button
                key={tf.id}
                onClick={() => setSelectedTimeframe(tf.id)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTimeframe === tf.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Show/Hide values */}
          <button
            onClick={() => setShowValues(!showValues)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            title={showValues ? 'Hide values' : 'Show values'}
          >
            {showValues ? <Eye className="w-5 h-5 text-gray-300" /> : <EyeOff className="w-5 h-5 text-gray-300" />}
          </button>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={loading}
            className={`p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  Account
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('totalValue')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto"
                >
                  Total Value
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('totalGainLoss')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto"
                >
                  Gain/Loss
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('performance')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto"
                >
                  {selectedTimeframe.toUpperCase()} Change
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('allocationPercent')}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors ml-auto"
                >
                  Allocation
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th className="text-center py-3 px-4">Positions</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedAccounts.map((account) => {
              const perf = getPerformanceData(account);
              const isExpanded = expandedRows.has(account.id);
              
              return (
                <React.Fragment key={account.id}>
                  <motion.tr 
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => toggleRow(account.id)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-700 rounded-lg">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{account.name}</div>
                          <div className="text-sm text-gray-400">{account.institution} • {account.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="text-white font-medium">
                        {showValues ? formatCurrency(account.totalValue) : '••••'}
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className={`flex items-center justify-end gap-1 ${
                        account.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {account.totalGainLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="font-medium">
                          {showValues ? formatCurrency(Math.abs(account.totalGainLoss)) : '••••'}
                        </span>
                        <span className="text-sm">
                          ({formatPercentage(account.totalGainLossPercent)})
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className={`font-medium ${
                        perf.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {showValues ? formatCurrency(Math.abs(perf.change)) : '••••'}
                        <span className="text-sm ml-1">
                          ({perf.changePct >= 0 ? '+' : ''}{formatPercentage(perf.changePct)})
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="text-gray-300">
                        {formatPercentage(account.allocationPercent)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="text-gray-300">
                        {account.totalPositions}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <ChevronRight className={`w-5 h-5 text-gray-400 transform transition-transform ${
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
                        <td colSpan={7} className="bg-gray-750 p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Asset breakdown */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">Asset Breakdown</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Securities</span>
                                  <span className="text-white">{formatCurrency(account.securityValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Crypto</span>
                                  <span className="text-white">{formatCurrency(account.cryptoValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Cash</span>
                                  <span className="text-white">{formatCurrency(account.cashValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Metals</span>
                                  <span className="text-white">{formatCurrency(account.metalValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Other</span>
                                  <span className="text-white">{formatCurrency(account.otherAssetsValue)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Position counts */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">Positions</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Securities</span>
                                  <span className="text-white">{account.securityPositions}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Crypto</span>
                                  <span className="text-white">{account.cryptoPositions}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Cash</span>
                                  <span className="text-white">{account.cashPositions}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Other</span>
                                  <span className="text-white">{account.otherPositions}</span>
                                </div>
                              </div>
                            </div>

                            {/* Additional metrics */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">Metrics</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Cost Basis</span>
                                  <span className="text-white">{formatCurrency(account.totalCostBasis)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Cash Balance</span>
                                  <span className="text-white">{formatCurrency(account.cashBalance)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Yield</span>
                                  <span className="text-white">{formatPercentage(account.yieldPercent)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Annual Income</span>
                                  <span className="text-white">{formatCurrency(account.dividendIncomeAnnual)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Liquidity */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">Liquidity</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Liquid</span>
                                  <span className="text-white">{formatCurrency(account.liquidValue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Illiquid</span>
                                  <span className="text-white">{formatCurrency(account.illiquidValue)}</span>
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

      {/* Auto-refresh indicator */}
      {isStale && (
        <div className="mt-4 text-center text-sm text-yellow-500">
          Data is stale and will refresh automatically...
        </div>
      )}
    </div>
  );
};

export default UnifiedAccountTable2;