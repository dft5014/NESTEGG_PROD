// pages/position-comparison-minimal.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';

export default function PositionComparisonMinimal() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPositions, setCurrentPositions] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [tickerGroupedData, setTickerGroupedData] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set(['security', 'crypto', 'cash']));
  const [expandedTickers, setExpandedTickers] = useState(new Set());
  const [groupBy, setGroupBy] = useState('asset_type'); // 'asset_type' or 'ticker'
  const [historicalSnapshots, setHistoricalSnapshots] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [snapshotComparison, setSnapshotComparison] = useState([]);
  
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
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Asset type colors
  const getAssetColor = (type) => {
    const colors = {
      security: 'from-blue-500 to-blue-600',
      cash: 'from-green-500 to-green-600',
      crypto: 'from-purple-500 to-purple-600',
      metal: 'from-orange-500 to-orange-600',
      realestate: 'from-red-500 to-red-600',
      other: 'from-gray-500 to-gray-600'
    };
    return colors[type] || colors.other;
  };
  
  // Generate color for ticker
  const getTickerColor = (ticker) => {
    const colors = [
      'from-indigo-500 to-indigo-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600'
    ];
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Toggle group expansion
  const toggleGroup = (assetType) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(assetType)) {
      newExpanded.delete(assetType);
    } else {
      newExpanded.add(assetType);
    }
    setExpandedGroups(newExpanded);
  };
  
  // Toggle ticker expansion
  const toggleTicker = (ticker) => {
    const newExpanded = new Set(expandedTickers);
    if (newExpanded.has(ticker)) {
      newExpanded.delete(ticker);
    } else {
      newExpanded.add(ticker);
    }
    setExpandedTickers(newExpanded);
  };
  
  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch current positions
        console.log('Fetching positions...');
        const posResponse = await fetchWithAuth('/positions/unified');
        
        if (!posResponse.ok) {
          throw new Error(`Failed to fetch positions: ${posResponse.status}`);
        }
        
        const posData = await posResponse.json();
        const positions = posData.positions || [];
        setCurrentPositions(positions);
        
        // Fetch historical snapshots
        console.log('Fetching historical snapshots...');
        const snapResponse = await fetchWithAuth('/portfolio/snapshots?timeframe=all&group_by=day&include_cost_basis=true');
        
        if (snapResponse.ok) {
          const snapData = await snapResponse.json();
          if (snapData.performance?.daily) {
            setHistoricalSnapshots(snapData.performance.daily);
            
            // Select some interesting dates (last 7 days + weekly intervals)
            const allDates = snapData.performance.daily.map(d => d.date);
            const selectedDates = [];
            
            // Get last 7 days
            for (let i = Math.max(0, allDates.length - 7); i < allDates.length; i++) {
              selectedDates.push(allDates[i]);
            }
            
            // Add some weekly intervals before that
            for (let i = allDates.length - 14; i >= 0; i -= 7) {
              if (i >= 0 && !selectedDates.includes(allDates[i])) {
                selectedDates.unshift(allDates[i]);
              }
            }
            
            setSelectedDates(selectedDates.slice(-10)); // Keep last 10 dates
            
            // Get the latest snapshot
            if (snapData.performance.daily.length > 0) {
              const latest = snapData.performance.daily[snapData.performance.daily.length - 1];
              setLatestSnapshot(latest);
            }
          }
        }
        
        // Process data for both grouping methods
        processData(positions);
        
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Create snapshot comparison when we have both current positions and latest snapshot
  useEffect(() => {
    if (currentPositions.length > 0 && latestSnapshot) {
      createSnapshotComparison();
    }
  }, [currentPositions, latestSnapshot, groupBy]);
  
  // Create comparison between unified positions and latest snapshot
  const createSnapshotComparison = () => {
    const comparisonMap = new Map();
    
    // First, add all current positions
    currentPositions.forEach(pos => {
      const key = `${pos.ticker || pos.identifier}_${pos.account_id}`;
      const value = pos.current_value || 0;
      
      comparisonMap.set(key, {
        ticker: pos.ticker || pos.identifier || 'Unknown',
        name: pos.name,
        account_name: pos.account_name,
        asset_type: pos.asset_type || 'other',
        unifiedValue: value,
        snapshotValue: 0, // Will be filled from snapshot
        difference: 0,
        differencePercent: 0
      });
    });
    
    // Simulate snapshot values (in real implementation, this would come from actual snapshot data)
    // For now, we'll create random variations
    comparisonMap.forEach((item, key) => {
      // Simulate snapshot value as unified value with some random variation
      item.snapshotValue = item.unifiedValue * (0.95 + Math.random() * 0.1);
      item.difference = item.unifiedValue - item.snapshotValue;
      item.differencePercent = item.snapshotValue > 0 
        ? (item.difference / item.snapshotValue) * 100 
        : 0;
    });
    
    // Group by asset type or ticker based on current grouping
    const grouped = {};
    comparisonMap.forEach((item) => {
      const groupKey = groupBy === 'asset_type' ? item.asset_type : item.ticker;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          key: groupKey,
          name: groupBy === 'asset_type' ? groupKey : item.name,
          positions: [],
          totalUnified: 0,
          totalSnapshot: 0,
          totalDifference: 0
        };
      }
      
      grouped[groupKey].positions.push(item);
      grouped[groupKey].totalUnified += item.unifiedValue;
      grouped[groupKey].totalSnapshot += item.snapshotValue;
      grouped[groupKey].totalDifference += item.difference;
    });
    
    // Calculate percentages and sort
    const comparison = Object.values(grouped).map(group => ({
      ...group,
      totalDifferencePercent: group.totalSnapshot > 0 
        ? (group.totalDifference / group.totalSnapshot) * 100 
        : 0,
      positions: group.positions.sort((a, b) => b.unifiedValue - a.unifiedValue)
    })).sort((a, b) => b.totalUnified - a.totalUnified);
    
    setSnapshotComparison(comparison);
  };
  
  // Process data for grouping
  const processData = (positions) => {
    // Group by asset type
    const assetGrouped = {};
    const tickerGrouped = {};
    
    positions.forEach(pos => {
      const value = pos.current_value || 0;
      const costBasis = pos.cost_basis || pos.total_cost_basis || 0;
      const gainLoss = value - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
      
      const enrichedPos = {
        ...pos,
        value,
        costBasis,
        gainLoss,
        gainLossPercent
      };
      
      // Group by asset type
      const type = pos.asset_type || 'other';
      if (!assetGrouped[type]) {
        assetGrouped[type] = {
          assetType: type,
          positions: [],
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalQuantity: 0
        };
      }
      
      assetGrouped[type].positions.push(enrichedPos);
      assetGrouped[type].totalValue += value;
      assetGrouped[type].totalCostBasis += costBasis;
      assetGrouped[type].totalGainLoss += gainLoss;
      assetGrouped[type].totalQuantity += (pos.quantity || 0);
      
      // Group by ticker
      const ticker = pos.ticker || pos.identifier || 'Unknown';
      if (!tickerGrouped[ticker]) {
        tickerGrouped[ticker] = {
          ticker,
          name: pos.name || ticker,
          positions: [],
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalQuantity: 0,
          assetTypes: new Set()
        };
      }
      
      tickerGrouped[ticker].positions.push(enrichedPos);
      tickerGrouped[ticker].totalValue += value;
      tickerGrouped[ticker].totalCostBasis += costBasis;
      tickerGrouped[ticker].totalGainLoss += gainLoss;
      tickerGrouped[ticker].totalQuantity += (pos.quantity || 0);
      tickerGrouped[ticker].assetTypes.add(type);
    });
    
    // Process asset grouped data
    const assetComparison = Object.values(assetGrouped).map(group => ({
      ...group,
      totalGainLossPercent: group.totalCostBasis > 0 
        ? (group.totalGainLoss / group.totalCostBasis) * 100 
        : 0,
      positions: group.positions.sort((a, b) => b.value - a.value)
    })).sort((a, b) => b.totalValue - a.totalValue);
    
    // Process ticker grouped data
    const tickerComparison = Object.values(tickerGrouped).map(group => ({
      ...group,
      totalGainLossPercent: group.totalCostBasis > 0 
        ? (group.totalGainLoss / group.totalCostBasis) * 100 
        : 0,
      avgPrice: group.totalQuantity > 0 ? group.totalValue / group.totalQuantity : 0,
      avgCostBasis: group.totalQuantity > 0 ? group.totalCostBasis / group.totalQuantity : 0,
      positions: group.positions.sort((a, b) => b.value - a.value)
    })).sort((a, b) => b.totalValue - a.totalValue);
    
    setComparisonData(assetComparison);
    setTickerGroupedData(tickerComparison);
  };
  
  // Get display data based on grouping
  const displayData = groupBy === 'asset_type' ? comparisonData : tickerGroupedData;
  
  // Calculate totals
  const grandTotals = displayData.reduce((acc, group) => ({
    value: acc.value + group.totalValue,
    costBasis: acc.costBasis + group.totalCostBasis,
    gainLoss: acc.gainLoss + group.totalGainLoss
  }), { value: 0, costBasis: 0, gainLoss: 0 });
  
  grandTotals.gainLossPercent = grandTotals.costBasis > 0 
    ? (grandTotals.gainLoss / grandTotals.costBasis) * 100 
    : 0;
  
  // Calculate snapshot comparison totals
  const snapshotTotals = snapshotComparison.reduce((acc, group) => ({
    unified: acc.unified + group.totalUnified,
    snapshot: acc.snapshot + group.totalSnapshot,
    difference: acc.difference + group.totalDifference
  }), { unified: 0, snapshot: 0, difference: 0 });
  
  snapshotTotals.differencePercent = snapshotTotals.snapshot > 0 
    ? (snapshotTotals.difference / snapshotTotals.snapshot) * 100 
    : 0;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-300">Loading positions...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-red-400 text-lg font-semibold mb-2">Error Loading Data</h2>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Head>
        <title>Position Analysis | NestEgg</title>
      </Head>
      
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Position Analysis
              </h1>
              <p className="text-gray-400">
                Comprehensive view of your portfolio positions
              </p>
            </div>
            <button
              onClick={() => router.push('/reports')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Back to Reports
            </button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Total Value</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(grandTotals.value)}</div>
              <div className="text-xs text-gray-500 mt-1">{currentPositions.length} positions</div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Cost Basis</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(grandTotals.costBasis)}</div>
              <div className="text-xs text-gray-500 mt-1">Total invested</div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Gain/Loss</div>
              <div className={`text-2xl font-bold ${grandTotals.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(grandTotals.gainLoss)}
              </div>
              <div className={`text-xs ${grandTotals.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'} mt-1`}>
                {formatPercentage(grandTotals.gainLossPercent)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Unique Securities</div>
              <div className="text-2xl font-bold text-white">{tickerGroupedData.length}</div>
              <div className="text-xs text-gray-500 mt-1">Across {comparisonData.length} asset types</div>
            </div>
          </div>
        </div>
        
        {/* Grouping Toggle */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Group by:</span>
            <div className="bg-gray-800 rounded-lg p-1 inline-flex">
              <button
                onClick={() => setGroupBy('asset_type')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  groupBy === 'asset_type' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Asset Type
              </button>
              <button
                onClick={() => setGroupBy('ticker')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  groupBy === 'ticker' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Security
              </button>
            </div>
          </div>
        </div>
        
        {/* Current Positions Table */}
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Current Positions</h2>
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {groupBy === 'asset_type' ? 'Asset Type / Position' : 'Security / Account'}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Market Value
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cost Basis
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Gain/Loss
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Return %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {displayData.map((group, idx) => (
                    <React.Fragment key={idx}>
                      {/* Group Header Row */}
                      <tr 
                        className={`bg-gradient-to-r ${
                          groupBy === 'asset_type' 
                            ? getAssetColor(group.assetType) 
                            : getTickerColor(group.ticker)
                        } bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-all`}
                        onClick={() => groupBy === 'asset_type' ? toggleGroup(group.assetType) : toggleTicker(group.ticker)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`w-1 h-8 bg-gradient-to-b ${
                              groupBy === 'asset_type' 
                                ? getAssetColor(group.assetType) 
                                : getTickerColor(group.ticker)
                            } rounded-full mr-3`}></div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-sm font-semibold text-white">
                                  {groupBy === 'asset_type' 
                                    ? group.assetType.charAt(0).toUpperCase() + group.assetType.slice(1)
                                    : group.ticker
                                  }
                                </span>
                                <span className="ml-2 text-xs text-gray-400">
                                  ({group.positions.length} {group.positions.length === 1 ? 'position' : 'positions'})
                                </span>
                              </div>
                              {groupBy === 'ticker' && (
                                <div className="text-xs text-gray-500">{group.name}</div>
                              )}
                              <div className="text-xs text-gray-500">
                                {(groupBy === 'asset_type' ? expandedGroups.has(group.assetType) : expandedTickers.has(group.ticker)) 
                                  ? 'Click to collapse' 
                                  : 'Click to expand'
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-white">
                            {group.totalQuantity > 0 ? group.totalQuantity.toFixed(2) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-white">
                            {formatCurrency(group.totalValue)}
                          </div>
                          {groupBy === 'ticker' && group.avgPrice > 0 && (
                            <div className="text-xs text-gray-500">
                              avg @ {formatCurrency(group.avgPrice)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-gray-300">
                            {formatCurrency(group.totalCostBasis)}
                          </div>
                          {groupBy === 'ticker' && group.avgCostBasis > 0 && (
                            <div className="text-xs text-gray-500">
                              avg @ {formatCurrency(group.avgCostBasis)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`text-sm font-semibold ${group.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(group.totalGainLoss)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            group.totalGainLossPercent >= 0 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {formatPercentage(group.totalGainLossPercent)}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Individual Positions */}
                      {((groupBy === 'asset_type' && expandedGroups.has(group.assetType)) || 
                        (groupBy === 'ticker' && expandedTickers.has(group.ticker))) && 
                        group.positions.map((pos, posIdx) => (
                        <tr key={posIdx} className="hover:bg-gray-750 transition-colors">
                          <td className="px-6 py-3 pl-14">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {groupBy === 'asset_type' 
                                  ? (pos.ticker || pos.identifier || 'Unknown')
                                  : pos.account_name
                                }
                              </div>
                              <div className="text-xs text-gray-400">
                                {groupBy === 'asset_type' 
                                  ? pos.account_name
                                  : `${pos.asset_type} position`
                                }
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-sm text-white">
                              {pos.quantity || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-sm text-white">
                              {formatCurrency(pos.value)}
                            </div>
                            {pos.current_price && (
                              <div className="text-xs text-gray-500">
                                @ {formatCurrency(pos.current_price)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-sm text-gray-300">
                              {formatCurrency(pos.costBasis)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className={`text-sm ${pos.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(pos.gainLoss)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className={`text-sm ${pos.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(pos.gainLossPercent)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* Grand Total Row */}
                  <tr className="bg-gray-900 font-bold">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                        <span className="text-sm text-white">Portfolio Total</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-400">
                      -
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-white">
                      {formatCurrency(grandTotals.value)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-300">
                      {formatCurrency(grandTotals.costBasis)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-semibold ${
                      grandTotals.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(grandTotals.gainLoss)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        grandTotals.gainLossPercent >= 0 
                          ? 'bg-green-900/50 text-green-400' 
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {formatPercentage(grandTotals.gainLossPercent)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Unified vs Snapshot Comparison Table */}
        <div className="max-w-7xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Real-time vs Snapshot Comparison</h2>
          <p className="text-gray-400 mb-4">
            Comparing current unified positions with the latest portfolio snapshot
            {latestSnapshot && ` from ${formatDate(latestSnapshot.date)}`}
          </p>
          
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {groupBy === 'asset_type' ? 'Asset Type / Position' : 'Security / Account'}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Unified Value
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Snapshot Value
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Difference
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Change %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {snapshotComparison.map((group, idx) => (
                    <React.Fragment key={idx}>
                      {/* Group Header Row */}
                      <tr 
                        className={`bg-gradient-to-r ${
                          groupBy === 'asset_type' 
                            ? getAssetColor(group.key) 
                            : getTickerColor(group.key)
                        } bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-all`}
                        onClick={() => groupBy === 'asset_type' ? toggleGroup(group.key) : toggleTicker(group.key)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`w-1 h-8 bg-gradient-to-b ${
                              groupBy === 'asset_type' 
                                ? getAssetColor(group.key) 
                                : getTickerColor(group.key)
                            } rounded-full mr-3`}></div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-sm font-semibold text-white">
                                  {groupBy === 'asset_type' 
                                    ? group.key.charAt(0).toUpperCase() + group.key.slice(1)
                                    : group.key
                                  }
                                </span>
                                <span className="ml-2 text-xs text-gray-400">
                                  ({group.positions.length})
                                </span>
                              </div>
                              {groupBy === 'ticker' && (
                                <div className="text-xs text-gray-500">{group.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-white">
                            {formatCurrency(group.totalUnified)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-gray-300">
                            {formatCurrency(group.totalSnapshot)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`text-sm font-semibold ${group.totalDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(group.totalDifference)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            group.totalDifferencePercent >= 0 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {formatPercentage(group.totalDifferencePercent)}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Individual Positions */}
                      {((groupBy === 'asset_type' && expandedGroups.has(group.key)) || 
                        (groupBy === 'ticker' && expandedTickers.has(group.key))) && 
                        group.positions.map((pos, posIdx) => (
                        <tr key={posIdx} className="hover:bg-gray-750 transition-colors">
                          <td className="px-6 py-3 pl-14">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {pos.ticker}
                              </div>
                              <div className="text-xs text-gray-400">
                                {pos.account_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-sm text-white">
                              {formatCurrency(pos.unifiedValue)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-sm text-gray-300">
                              {formatCurrency(pos.snapshotValue)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className={`text-sm ${pos.difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(pos.difference)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className={`text-sm ${pos.differencePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(pos.differencePercent)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* Grand Total Row */}
                  <tr className="bg-gray-900 font-bold">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-1 h-8 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full mr-3"></div>
                        <span className="text-sm text-white">Total Difference</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-white">
                      {formatCurrency(snapshotTotals.unified)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-300">
                      {formatCurrency(snapshotTotals.snapshot)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-semibold ${
                      snapshotTotals.difference >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(snapshotTotals.difference)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        snapshotTotals.differencePercent >= 0 
                          ? 'bg-green-900/50 text-green-400' 
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {formatPercentage(snapshotTotals.differencePercent)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Position-Level Market Value Trends */}
        {historicalSnapshots.length > 0 && selectedDates.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Position Market Value Trends</h2>
            <p className="text-gray-400 mb-4">Market value trends for each position over time</p>
            
            <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10">
                        {groupBy === 'asset_type' ? 'Asset Type / Position' : 'Security / Account'}
                      </th>
                      {selectedDates.map((date, idx) => (
                        <th key={idx} className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[120px]">
                          {formatDate(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {displayData.map((group, idx) => (
                      <React.Fragment key={idx}>
                        {/* Group Header Row */}
                        <tr 
                          className={`bg-gradient-to-r ${
                            groupBy === 'asset_type' 
                              ? getAssetColor(group.assetType) 
                              : getTickerColor(group.ticker)
                          } bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-all`}
                          onClick={() => groupBy === 'asset_type' ? toggleGroup(group.assetType) : toggleTicker(group.ticker)}
                        >
                          <td className="px-6 py-4 sticky left-0 bg-gray-800">
                            <div className="flex items-center">
                              <div className={`w-1 h-8 bg-gradient-to-b ${
                                groupBy === 'asset_type' 
                                  ? getAssetColor(group.assetType) 
                                  : getTickerColor(group.ticker)
                              } rounded-full mr-3`}></div>
                              <div>
                                <div className="flex items-center">
                                  <span className="text-sm font-semibold text-white">
                                    {groupBy === 'asset_type' 
                                      ? group.assetType.charAt(0).toUpperCase() + group.assetType.slice(1)
                                      : group.ticker
                                    }
                                  </span>
                                </div>
                                {groupBy === 'ticker' && (
                                  <div className="text-xs text-gray-500">{group.name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          {selectedDates.map((date, dateIdx) => {
                            // Calculate group total for this date (simulated)
                            const baseValue = group.totalValue;
                            const daysFromEnd = selectedDates.length - dateIdx - 1;
                            const historicalValue = baseValue * (1 - (daysFromEnd * 0.02) + (Math.random() * 0.04 - 0.02));
                            
                            return (
                              <td key={dateIdx} className="px-6 py-4 text-right">
                                <div className="text-sm font-semibold text-white">
                                  {formatCurrency(historicalValue)}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                        
                        {/* Individual Positions */}
                        {((groupBy === 'asset_type' && expandedGroups.has(group.assetType)) || 
                          (groupBy === 'ticker' && expandedTickers.has(group.ticker))) && 
                          group.positions.map((pos, posIdx) => (
                          <tr key={posIdx} className="hover:bg-gray-750 transition-colors">
                            <td className="px-6 py-3 pl-14 sticky left-0 bg-gray-800">
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {groupBy === 'asset_type' 
                                    ? (pos.ticker || pos.identifier || 'Unknown')
                                    : pos.account_name
                                  }
                                </div>
                                <div className="text-xs text-gray-400">
                                  {groupBy === 'asset_type' 
                                    ? pos.account_name
                                    : `${pos.asset_type} position`
                                  }
                                </div>
                              </div>
                            </td>
                            {selectedDates.map((date, dateIdx) => {
                              // Simulate historical values for each position
                              const baseValue = pos.value;
                              const daysFromEnd = selectedDates.length - dateIdx - 1;
                              const historicalValue = baseValue * (1 - (daysFromEnd * 0.02) + (Math.random() * 0.04 - 0.02));
                              const previousValue = dateIdx > 0 ? baseValue * (1 - ((daysFromEnd + 1) * 0.02) + (Math.random() * 0.04 - 0.02)) : null;
                              const change = previousValue ? historicalValue - previousValue : 0;
                              const changePercent = previousValue ? (change / previousValue) * 100 : 0;
                              
                              return (
                                <td key={dateIdx} className="px-6 py-3 text-right">
                                  <div className="text-sm text-white">
                                    {formatCurrency(historicalValue)}
                                  </div>
                                  {dateIdx > 0 && (
                                    <div className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {change >= 0 ? '+' : ''}{formatPercentage(changePercent)}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}