// pages/position-comparison.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft, Download, ChevronDown, ArrowUpDown,
  TrendingUp, TrendingDown, TrendingFlat, BarChart2,
  LineChart as LineChartIcon, Banknote, Coins, Package, 
  Home, MoreVertical, FileText, DollarSign
} from 'lucide-react';

import { fetchWithAuth } from '@/utils/api';

// Color palettes
const assetColors = {
  security: '#4f46e5',
  cash: '#10b981',
  crypto: '#8b5cf6',
  bond: '#ec4899',
  metal: '#f97316',
  currency: '#3b82f6',
  realestate: '#ef4444',
  other: '#6b7280'
};

// Asset type icons
const assetIcons = {
  security: <LineChartIcon className="h-4 w-4" />,
  cash: <Banknote className="h-4 w-4" />,
  crypto: <Coins className="h-4 w-4" />,
  bond: <FileText className="h-4 w-4" />,
  metal: <Package className="h-4 w-4" />,
  currency: <DollarSign className="h-4 w-4" />,
  realestate: <Home className="h-4 w-4" />,
  other: <MoreVertical className="h-4 w-4" />
};

export default function PositionComparisonPage() {
  const router = useRouter();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPositions, setCurrentPositions] = useState([]);
  const [comparePositions, setComparePositions] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [valueType, setValueType] = useState('market_value');
  const [expandedAssetTypes, setExpandedAssetTypes] = useState(new Set(['security', 'crypto', 'cash', 'metal', 'realestate']));
  const [sortConfig, setSortConfig] = useState({ key: 'currentValue', direction: 'desc' });
  
  // Format utilities
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Fetch current positions
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch current positions
        console.log('Fetching current positions...');
        const response = await fetchWithAuth('/positions/unified');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch positions: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received positions:', data.positions?.length || 0);
        
        setCurrentPositions(data.positions || []);
        
        // Extract unique accounts
        const accountMap = new Map();
        (data.positions || []).forEach(p => {
          if (p.account_id && !accountMap.has(p.account_id)) {
            accountMap.set(p.account_id, {
              id: p.account_id,
              name: p.account_name || 'Unknown Account'
            });
          }
        });
        setAvailableAccounts(Array.from(accountMap.values()));
        
        // Create simulated historical data for comparison
        const simulatedHistorical = (data.positions || []).map(pos => ({
          ...pos,
          current_value: pos.current_value * (0.7 + Math.random() * 0.5),
          cost_basis: pos.cost_basis * (0.9 + Math.random() * 0.2),
          quantity: pos.quantity * (0.8 + Math.random() * 0.3),
          current_price: pos.current_price * (0.7 + Math.random() * 0.5)
        }));
        
        setComparePositions(simulatedHistorical);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Calculate comparison data when positions change
  useEffect(() => {
    if (!currentPositions.length || !comparePositions.length) return;
    
    console.log('Calculating comparison data...');
    const comparison = calculatePositionComparison(currentPositions, comparePositions, selectedAccount, valueType);
    setComparisonData(comparison);
  }, [currentPositions, comparePositions, selectedAccount, valueType]);
  
  // Calculate position comparison
  const calculatePositionComparison = (current, compare, accountFilter, valueField) => {
    // Filter by account if needed
    let filteredCurrent = current;
    let filteredCompare = compare;
    
    if (accountFilter !== 'all') {
      filteredCurrent = current.filter(p => p.account_id === accountFilter);
      filteredCompare = compare.filter(p => p.account_id === accountFilter);
    }
    
    // Create a map for easy lookup
    const compareMap = new Map();
    filteredCompare.forEach(pos => {
      const key = `${pos.ticker || pos.identifier}_${pos.account_id}`;
      compareMap.set(key, pos);
    });
    
    // Group by asset type
    const grouped = {};
    
    filteredCurrent.forEach(currentPos => {
      const assetType = currentPos.asset_type || 'other';
      if (!grouped[assetType]) {
        grouped[assetType] = [];
      }
      
      const key = `${currentPos.ticker || currentPos.identifier}_${currentPos.account_id}`;
      const comparePos = compareMap.get(key);
      
      const currentValue = valueField === 'market_value' ? 
        (currentPos.current_value || 0) : 
        (currentPos.cost_basis || 0);
        
      const compareValue = comparePos ? 
        (valueField === 'market_value' ? 
          (comparePos.current_value || 0) : 
          (comparePos.cost_basis || 0)
        ) : 0;
      
      const currentQuantity = currentPos.quantity || 0;
      const compareQuantity = comparePos ? (comparePos.quantity || 0) : 0;
      
      grouped[assetType].push({
        id: currentPos.id,
        ticker: currentPos.ticker || currentPos.identifier,
        name: currentPos.name,
        account_name: currentPos.account_name,
        asset_type: assetType,
        currentValue,
        compareValue,
        currentQuantity,
        compareQuantity,
        valueChange: currentValue - compareValue,
        percentChange: compareValue ? ((currentValue - compareValue) / compareValue) * 100 : (currentValue > 0 ? 100 : 0),
        quantityChange: currentQuantity - compareQuantity,
        isNew: !comparePos,
        currentPrice: currentPos.current_price || 0,
        comparePrice: comparePos ? (comparePos.current_price || 0) : 0,
      });
      
      if (comparePos) {
        compareMap.delete(key);
      }
    });
    
    // Add sold positions
    compareMap.forEach((comparePos, key) => {
      const assetType = comparePos.asset_type || 'other';
      if (!grouped[assetType]) {
        grouped[assetType] = [];
      }
      
      const compareValue = valueField === 'market_value' ? 
        (comparePos.current_value || 0) : 
        (comparePos.cost_basis || 0);
      
      grouped[assetType].push({
        id: `sold_${comparePos.id}`,
        ticker: comparePos.ticker || comparePos.identifier,
        name: comparePos.name,
        account_name: comparePos.account_name,
        asset_type: assetType,
        currentValue: 0,
        compareValue,
        currentQuantity: 0,
        compareQuantity: comparePos.quantity || 0,
        valueChange: -compareValue,
        percentChange: -100,
        quantityChange: -(comparePos.quantity || 0),
        isSold: true,
        currentPrice: 0,
        comparePrice: comparePos.current_price || 0,
      });
    });
    
    // Sort and calculate totals
    const result = [];
    Object.entries(grouped).forEach(([assetType, positions]) => {
      positions.sort((a, b) => b.currentValue - a.currentValue);
      
      const totals = positions.reduce((acc, pos) => ({
        currentValue: acc.currentValue + pos.currentValue,
        compareValue: acc.compareValue + pos.compareValue,
        valueChange: acc.valueChange + pos.valueChange,
        newPositions: acc.newPositions + (pos.isNew ? 1 : 0),
        soldPositions: acc.soldPositions + (pos.isSold ? 1 : 0)
      }), { currentValue: 0, compareValue: 0, valueChange: 0, newPositions: 0, soldPositions: 0 });
      
      totals.percentChange = totals.compareValue ? 
        ((totals.currentValue - totals.compareValue) / totals.compareValue) * 100 : 
        (totals.currentValue > 0 ? 100 : 0);
      
      result.push({
        assetType,
        positions,
        totals,
        color: assetColors[assetType] || assetColors.other,
        icon: assetIcons[assetType] || assetIcons.other
      });
    });
    
    result.sort((a, b) => b.totals.currentValue - a.totals.currentValue);
    
    return result;
  };
  
  // Handle sorting
  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  // Sort comparison data
  const sortComparisonData = (data) => {
    const sorted = [...data];
    
    sorted.forEach(group => {
      group.positions.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'ticker':
            aValue = a.ticker || '';
            bValue = b.ticker || '';
            break;
          case 'currentValue':
            aValue = a.currentValue;
            bValue = b.currentValue;
            break;
          case 'compareValue':
            aValue = a.compareValue;
            bValue = b.compareValue;
            break;
          case 'valueChange':
            aValue = a.valueChange;
            bValue = b.valueChange;
            break;
          case 'percentChange':
            aValue = a.percentChange;
            bValue = b.percentChange;
            break;
          default:
            aValue = a.currentValue;
            bValue = b.currentValue;
        }
        
        if (sortConfig.direction === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    });
    
    return sorted;
  };
  
  // Toggle asset type expansion
  const toggleAssetType = (assetType) => {
    const newExpanded = new Set(expandedAssetTypes);
    if (newExpanded.has(assetType)) {
      newExpanded.delete(assetType);
    } else {
      newExpanded.add(assetType);
    }
    setExpandedAssetTypes(newExpanded);
  };
  
  // Export to CSV
  const exportToCSV = () => {
    let csv = 'Asset Type,Ticker,Name,Account,Current Value,Compare Value,Value Change,Percent Change\n';
    
    comparisonData.forEach(group => {
      group.positions.forEach(pos => {
        csv += `${group.assetType},${pos.ticker},${pos.name},${pos.account_name},${pos.currentValue},${pos.compareValue},${pos.valueChange},${pos.percentChange}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `position_comparison_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-300">Loading position data...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800">
        <h1 className="text-2xl font-bold text-white mb-4">Error Loading Positions</h1>
        <p className="text-gray-300 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Calculate grand totals
  const sortedData = sortComparisonData(comparisonData);
  const grandTotals = sortedData.reduce((acc, group) => ({
    currentValue: acc.currentValue + group.totals.currentValue,
    compareValue: acc.compareValue + group.totals.compareValue,
    valueChange: acc.valueChange + group.totals.valueChange
  }), { currentValue: 0, compareValue: 0, valueChange: 0 });
  
  grandTotals.percentChange = grandTotals.compareValue ? 
    ((grandTotals.currentValue - grandTotals.compareValue) / grandTotals.compareValue) * 100 : 
    (grandTotals.currentValue > 0 ? 100 : 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white">
      <Head>
        <title>Position Comparison | NestEgg</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/reports')}
              className="mr-3 p-2 rounded-full bg-gray-800 hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold">Position Comparison</h1>
          </div>
          <p className="text-gray-400 mt-1">Isolated comparison view for debugging</p>
        </div>
        
        {/* Controls */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Account Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Account:</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm"
              >
                <option value="all">All Accounts</option>
                {availableAccounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
            
            {/* Value Type Toggle */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setValueType('market_value')}
                className={`px-3 py-1 text-sm rounded-md ${
                  valueType === 'market_value' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                }`}
              >
                Market Value
              </button>
              <button
                onClick={() => setValueType('cost_basis')}
                className={`px-3 py-1 text-sm rounded-md ${
                  valueType === 'cost_basis' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                }`}
              >
                Cost Basis
              </button>
            </div>
            
            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
        
        {/* Table */}
        <div className="bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Asset / Position
                  </th>
                  <th onClick={() => handleSort('currentValue')} className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white">
                    <div className="flex items-center justify-end gap-1">
                      Current
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('compareValue')} className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white">
                    <div className="flex items-center justify-end gap-1">
                      Compare
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('valueChange')} className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white">
                    <div className="flex items-center justify-end gap-1">
                      $ Change
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('percentChange')} className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white">
                    <div className="flex items-center justify-end gap-1">
                      % Change
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedData.map((group, groupIdx) => (
                  <React.Fragment key={groupIdx}>
                    {/* Asset Type Header Row */}
                    <tr className="bg-gray-750 hover:bg-gray-700 cursor-pointer" onClick={() => toggleAssetType(group.assetType)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                            expandedAssetTypes.has(group.assetType) ? '' : '-rotate-90'
                          }`} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                          {group.icon}
                          <span className="text-sm font-medium text-white capitalize">
                            {group.assetType} ({group.positions.length})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-white">
                        {formatCurrency(group.totals.currentValue)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                        {formatCurrency(group.totals.compareValue)}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${
                        group.totals.valueChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(group.totals.valueChange)}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${
                        group.totals.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(group.totals.percentChange)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {group.totals.newPositions > 0 && (
                          <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
                            +{group.totals.newPositions} new
                          </span>
                        )}
                        {group.totals.soldPositions > 0 && (
                          <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full ml-1">
                            -{group.totals.soldPositions} sold
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Position Rows */}
                    {expandedAssetTypes.has(group.assetType) && group.positions.map((position, posIdx) => (
                      <tr key={posIdx} className={`hover:bg-gray-750 ${position.isSold ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-2 pl-12">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{position.ticker}</span>
                            <span className="text-xs text-gray-400">{position.name}</span>
                            {selectedAccount === 'all' && (
                              <span className="text-xs text-gray-500">{position.account_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex flex-col">
                            <span className="text-sm text-white">{formatCurrency(position.currentValue)}</span>
                            {valueType === 'market_value' && position.currentPrice > 0 && (
                              <span className="text-xs text-gray-400">@{formatCurrency(position.currentPrice)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-300">{formatCurrency(position.compareValue)}</span>
                            {valueType === 'market_value' && position.comparePrice > 0 && (
                              <span className="text-xs text-gray-500">@{formatCurrency(position.comparePrice)}</span>
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-2 text-right text-sm ${
                          position.valueChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(position.valueChange)}
                        </td>
                        <td className={`px-4 py-2 text-right text-sm ${
                          position.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <div className="flex items-center justify-end gap-1">
                            {position.percentChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : position.percentChange < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <TrendingFlat className="h-3 w-3" />
                            )}
                            {formatPercentage(position.percentChange)}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {position.isNew && (
                            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">New</span>
                          )}
                          {position.isSold && (
                            <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">Sold</span>
                          )}
                          {!position.isNew && !position.isSold && Math.abs(position.percentChange) > 20 && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              position.percentChange > 0 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                            }`}>
                              {position.percentChange > 0 ? 'Hot' : 'Cold'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                
                {/* Grand Total Row */}
                <tr className="bg-gray-900 font-bold">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm text-white">Portfolio Total</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-white">
                    {formatCurrency(grandTotals.currentValue)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-300">
                    {formatCurrency(grandTotals.compareValue)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm ${
                    grandTotals.valueChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(grandTotals.valueChange)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm ${
                    grandTotals.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatPercentage(grandTotals.percentChange)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Debug Info */}
        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
          <p className="text-sm text-gray-400">Current Positions: {currentPositions.length}</p>
          <p className="text-sm text-gray-400">Compare Positions: {comparePositions.length}</p>
          <p className="text-sm text-gray-400">Asset Types: {comparisonData.length}</p>
          <p className="text-sm text-gray-400">Total Positions in Comparison: {comparisonData.reduce((sum, g) => sum + g.positions.length, 0)}</p>
        </div>
      </main>
    </div>
  );
}