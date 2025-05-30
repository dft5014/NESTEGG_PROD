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
  const [accountGroupedData, setAccountGroupedData] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set()); // Start collapsed
  const [expandedPositions, setExpandedPositions] = useState(new Set()); // For position expansion
  const [expandedTaxLots, setExpandedTaxLots] = useState(new Set()); // For tax lot expansion
  const [groupBy, setGroupBy] = useState('asset_type'); // 'asset_type' or 'account'
  const [historicalSnapshots, setHistoricalSnapshots] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [snapshotComparison, setSnapshotComparison] = useState([]);
  const [dateRangeOption, setDateRangeOption] = useState('last7'); // For market trends date range
  const [taxLots, setTaxLots] = useState({}); // Store tax lots by position
  
  // Date range options for market trends
  const dateRangeOptions = [
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'last90', label: 'Last 90 Days' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'all', label: 'All Time' }
  ];
  
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
  
  // Generate color for account
  const getAccountColor = (account) => {
    const colors = [
      'from-indigo-500 to-indigo-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600'
    ];
    let hash = 0;
    for (let i = 0; i < account.length; i++) {
      hash = account.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Toggle group expansion
  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };
  
  // Toggle position expansion
  const togglePosition = (positionKey) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(positionKey)) {
      newExpanded.delete(positionKey);
    } else {
      newExpanded.add(positionKey);
    }
    setExpandedPositions(newExpanded);
  };
  
  // Toggle tax lot expansion
  const toggleTaxLot = (taxLotKey) => {
    const newExpanded = new Set(expandedTaxLots);
    if (newExpanded.has(taxLotKey)) {
      newExpanded.delete(taxLotKey);
    } else {
      newExpanded.add(taxLotKey);
    }
    setExpandedTaxLots(newExpanded);
  };
  
  // Update selected dates based on date range option
  useEffect(() => {
    if (historicalSnapshots.length === 0) return;
    
    const allDates = historicalSnapshots.map(d => d.date);
    let dates = [];
    
    const today = new Date();
    const startDate = new Date();
    
    switch (dateRangeOption) {
      case 'last7':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'last30':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last90':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'ytd':
        startDate.setMonth(0, 1);
        break;
      case 'all':
        dates = allDates.slice(-10); // Show last 10 for all time
        setSelectedDates(dates);
        return;
    }
    
    // Filter dates within range
    dates = allDates.filter(dateStr => new Date(dateStr) >= startDate);
    
    // Limit to reasonable number of columns
    if (dates.length > 10) {
      // Sample dates evenly
      const step = Math.floor(dates.length / 10);
      dates = dates.filter((_, idx) => idx % step === 0 || idx === dates.length - 1);
    }
    
    setSelectedDates(dates);
  }, [dateRangeOption, historicalSnapshots]);
  
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
        
        // Fetch tax lots for each position (simulated for now)
        const taxLotData = {};
        positions.forEach(pos => {
          const posKey = `${pos.ticker || pos.identifier}_${pos.account_id}`;
          // Simulate tax lots
          const numLots = Math.floor(Math.random() * 3) + 1;
          taxLotData[posKey] = Array.from({ length: numLots }, (_, i) => ({
            id: `${posKey}_lot_${i}`,
            quantity: pos.quantity ? pos.quantity / numLots : 0,
            cost_basis: pos.cost_basis ? pos.cost_basis / numLots : 0,
            purchase_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            value: pos.current_value ? pos.current_value / numLots : 0
          }));
        });
        setTaxLots(taxLotData);
        
        // Fetch historical snapshots
        console.log('Fetching historical snapshots...');
        const snapResponse = await fetchWithAuth('/portfolio/snapshots?timeframe=all&group_by=day&include_cost_basis=true');
        
        if (snapResponse.ok) {
          const snapData = await snapResponse.json();
          if (snapData.performance?.daily) {
            setHistoricalSnapshots(snapData.performance.daily);
            
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
    // For real data, we would match positions from the snapshot
    // For now, calculate based on portfolio totals and distribute proportionally
    const currentTotal = currentPositions.reduce((sum, pos) => sum + (pos.current_value || 0), 0);
    const snapshotTotal = latestSnapshot.value || 0;
    const ratio = snapshotTotal / currentTotal;
    
    const comparisonMap = new Map();
    
    // Create comparison data for each position
    currentPositions.forEach(pos => {
      const key = `${pos.ticker || pos.identifier}_${pos.account_id}`;
      const unifiedValue = pos.current_value || 0;
      const snapshotValue = unifiedValue * ratio; // Proportional distribution
      
      comparisonMap.set(key, {
        ticker: pos.ticker || pos.identifier || 'Unknown',
        name: pos.name,
        account_name: pos.account_name,
        account_id: pos.account_id,
        asset_type: pos.asset_type || 'other',
        unifiedValue,
        snapshotValue,
        difference: unifiedValue - snapshotValue,
        differencePercent: snapshotValue > 0 
          ? ((unifiedValue - snapshotValue) / snapshotValue) * 100 
          : 0
      });
    });
    
    // Group by asset type or account based on current grouping
    const grouped = {};
    comparisonMap.forEach((item) => {
      const groupKey = groupBy === 'asset_type' ? item.asset_type : item.account_id;
      const groupName = groupBy === 'asset_type' ? item.asset_type : item.account_name;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          key: groupKey,
          name: groupName,
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
    const accountGrouped = {};
    
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
      
      // Group by account
      const accountId = pos.account_id || 'unknown';
      const accountName = pos.account_name || 'Unknown Account';
      if (!accountGrouped[accountId]) {
        accountGrouped[accountId] = {
          accountId,
          accountName,
          positions: [],
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalQuantity: 0,
          assetTypes: new Set()
        };
      }
      
      accountGrouped[accountId].positions.push(enrichedPos);
      accountGrouped[accountId].totalValue += value;
      accountGrouped[accountId].totalCostBasis += costBasis;
      accountGrouped[accountId].totalGainLoss += gainLoss;
      accountGrouped[accountId].totalQuantity += (pos.quantity || 0);
      accountGrouped[accountId].assetTypes.add(type);
    });
    
    // Process asset grouped data
    const assetComparison = Object.values(assetGrouped).map(group => ({
      ...group,
      totalGainLossPercent: group.totalCostBasis > 0 
        ? (group.totalGainLoss / group.totalCostBasis) * 100 
        : 0,
      positions: group.positions.sort((a, b) => b.value - a.value)
    })).sort((a, b) => b.totalValue - a.totalValue);
    
    // Process account grouped data
    const accountComparison = Object.values(accountGrouped).map(group => ({
      ...group,
      totalGainLossPercent: group.totalCostBasis > 0 
        ? (group.totalGainLoss / group.totalCostBasis) * 100 
        : 0,
      positions: group.positions.sort((a, b) => b.value - a.value)
    })).sort((a, b) => b.totalValue - a.totalValue);
    
    setComparisonData(assetComparison);
    setAccountGroupedData(accountComparison);
  };
  
  // Get display data based on grouping
  const displayData = groupBy === 'asset_type' ? comparisonData : accountGroupedData;
  
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
  
  // Get historical value for a position on a specific date
  const getHistoricalValue = (position, date, dateIndex) => {
    // Use actual snapshot data if available
    if (historicalSnapshots[dateIndex]) {
      const snapshot = historicalSnapshots[dateIndex];
      const portfolioRatio = snapshot.value / grandTotals.value;
      return position.value * portfolioRatio;
    }
    return position.value;
  };
  
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
              <div className="text-gray-400 text-sm mb-1">Accounts</div>
              <div className="text-2xl font-bold text-white">{accountGroupedData.length}</div>
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
                onClick={() => setGroupBy('account')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  groupBy === 'account' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Account
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
                      {groupBy === 'asset_type' ? 'Asset Type / Position / Tax Lots' : 'Account / Position / Tax Lots'}
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
                  {displayData.map((group, idx) => {
                    const groupKey = groupBy === 'asset_type' ? group.assetType : group.accountId;
                    return (
                      <React.Fragment key={idx}>
                        {/* Group Header Row */}
                        <tr 
                          className={`bg-gradient-to-r ${
                            groupBy === 'asset_type' 
                              ? getAssetColor(group.assetType) 
                              : getAccountColor(group.accountName)
                          } bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-all`}
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`w-1 h-8 bg-gradient-to-b ${
                                groupBy === 'asset_type' 
                                  ? getAssetColor(group.assetType) 
                                  : getAccountColor(group.accountName)
                              } rounded-full mr-3`}></div>
                              <div>
                                <div className="flex items-center">
                                  <span className="text-sm font-semibold text-white">
                                    {groupBy === 'asset_type' 
                                      ? group.assetType.charAt(0).toUpperCase() + group.assetType.slice(1)
                                      : group.accountName
                                    }
                                  </span>
                                  <span className="ml-2 text-xs text-gray-400">
                                    ({group.positions.length} {group.positions.length === 1 ? 'position' : 'positions'})
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {expandedGroups.has(groupKey) ? 'Click to collapse' : 'Click to expand'}
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
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-semibold text-gray-300">
                              {formatCurrency(group.totalCostBasis)}
                            </div>
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
                        {expandedGroups.has(groupKey) && group.positions.map((pos, posIdx) => {
                          const posKey = `${pos.ticker || pos.identifier}_${pos.account_id}`;
                          const positionKey = `${groupKey}_${posKey}`;
                          const hasTaxLots = taxLots[posKey] && taxLots[posKey].length > 1;
                          
                          return (
                            <React.Fragment key={posIdx}>
                              <tr className="hover:bg-gray-750 transition-colors">
                                <td className="px-6 py-3 pl-14">
                                  <div className="flex items-center">
                                    {hasTaxLots && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePosition(positionKey);
                                        }}
                                        className="mr-2 text-gray-400 hover:text-white"
                                      >
                                        {expandedPositions.has(positionKey) ? '▼' : '▶'}
                                      </button>
                                    )}
                                    <div>
                                      <div className="text-sm font-medium text-white">
                                        {pos.ticker || pos.identifier || 'Unknown'}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {groupBy === 'asset_type' 
                                          ? pos.account_name
                                          : pos.asset_type
                                        }
                                        {hasTaxLots && ` (${taxLots[posKey].length} lots)`}
                                      </div>
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
                              
                              {/* Tax Lots */}
                              {expandedPositions.has(positionKey) && taxLots[posKey] && taxLots[posKey].map((lot, lotIdx) => (
                                <tr key={lotIdx} className="bg-gray-850 hover:bg-gray-750 transition-colors">
                                  <td className="px-6 py-2 pl-20">
                                    <div className="text-xs text-gray-400">
                                      Lot {lotIdx + 1} • {formatDate(lot.purchase_date)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-2 text-right">
                                    <div className="text-xs text-gray-400">
                                      {lot.quantity.toFixed(2)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-2 text-right">
                                    <div className="text-xs text-gray-400">
                                      {formatCurrency(lot.value)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-2 text-right">
                                    <div className="text-xs text-gray-400">
                                      {formatCurrency(lot.cost_basis)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-2 text-right">
                                    <div className={`text-xs ${lot.value - lot.cost_basis >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatCurrency(lot.value - lot.cost_basis)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-2 text-right">
                                    <div className={`text-xs ${lot.value - lot.cost_basis >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {formatPercentage(lot.cost_basis > 0 ? ((lot.value - lot.cost_basis) / lot.cost_basis) * 100 : 0)}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  
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
                      {groupBy === 'asset_type' ? 'Asset Type / Position' : 'Account / Position'}
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
                            : getAccountColor(group.name)
                        } bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-all`}
                        onClick={() => toggleGroup(group.key)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`w-1 h-8 bg-gradient-to-b ${
                              groupBy === 'asset_type' 
                                ? getAssetColor(group.key) 
                                : getAccountColor(group.name)
                            } rounded-full mr-3`}></div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-sm font-semibold text-white">
                                  {groupBy === 'asset_type' 
                                    ? group.key.charAt(0).toUpperCase() + group.key.slice(1)
                                    : group.name
                                  }
                                </span>
                                <span className="ml-2 text-xs text-gray-400">
                                  ({group.positions.length})
                                </span>
                              </div>
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
                      {expandedGroups.has(group.key) && group.positions.map((pos, posIdx) => (
                        <tr key={posIdx} className="hover:bg-gray-750 transition-colors">
                          <td className="px-6 py-3 pl-14">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {pos.ticker}
                              </div>
                              <div className="text-xs text-gray-400">
                                {groupBy === 'asset_type' 
                                  ? pos.account_name
                                  : pos.asset_type
                                }
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Position Market Value Trends</h2>
                <p className="text-gray-400">Market value trends for each position over time</p>
              </div>
              <select
                value={dateRangeOption}
                onChange={(e) => setDateRangeOption(e.target.value)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10">
                        {groupBy === 'asset_type' ? 'Asset Type / Position' : 'Account / Position'}
                      </th>
                      {selectedDates.map((date, idx) => (
                        <th key={idx} className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[120px]">
                          {formatDate(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {displayData.map((group, idx) => {
                      const groupKey = groupBy === 'asset_type' ? group.assetType : group.accountId;
                      
                      return (
                        <React.Fragment key={idx}>
                          {/* Group Header Row */}
                          <tr 
                            className={`bg-gradient-to-r ${
                              groupBy === 'asset_type' 
                                ? getAssetColor(group.assetType) 
                                : getAccountColor(group.accountName)
                            } bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-all`}
                            onClick={() => toggleGroup(groupKey)}
                          >
                            <td className="px-6 py-4 sticky left-0 bg-gray-800">
                              <div className="flex items-center">
                                <div className={`w-1 h-8 bg-gradient-to-b ${
                                  groupBy === 'asset_type' 
                                    ? getAssetColor(group.assetType) 
                                    : getAccountColor(group.accountName)
                                } rounded-full mr-3`}></div>
                                <div>
                                  <div className="flex items-center">
                                    <span className="text-sm font-semibold text-white">
                                      {groupBy === 'asset_type' 
                                        ? group.assetType.charAt(0).toUpperCase() + group.assetType.slice(1)
                                        : group.accountName
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            {selectedDates.map((date, dateIdx) => {
                              // Calculate group total from actual snapshot data
                              const snapshot = historicalSnapshots.find(s => s.date === date);
                              const portfolioRatio = snapshot ? snapshot.value / grandTotals.value : 1;
                              const historicalValue = group.totalValue * portfolioRatio;
                              
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
                          {expandedGroups.has(groupKey) && group.positions.map((pos, posIdx) => (
                            <tr key={posIdx} className="hover:bg-gray-750 transition-colors">
                              <td className="px-6 py-3 pl-14 sticky left-0 bg-gray-800">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {pos.ticker || pos.identifier || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {groupBy === 'asset_type' 
                                      ? pos.account_name
                                      : pos.asset_type
                                    }
                                  </div>
                                </div>
                              </td>
                              {selectedDates.map((date, dateIdx) => {
                                const historicalValue = getHistoricalValue(pos, date, dateIdx);
                                const prevDateIdx = dateIdx > 0 ? dateIdx - 1 : null;
                                const previousValue = prevDateIdx !== null ? getHistoricalValue(pos, selectedDates[prevDateIdx], prevDateIdx) : null;
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
                      );
                    })}
                    
                    {/* Portfolio Total Row */}
                    <tr className="bg-gray-900 font-bold">
                      <td className="px-6 py-4 sticky left-0 bg-gray-900">
                        <div className="flex items-center">
                          <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                          <span className="text-sm text-white">Portfolio Total</span>
                        </div>
                      </td>
                      {selectedDates.map((date, idx) => {
                        const snapshot = historicalSnapshots.find(s => s.date === date);
                        const value = snapshot ? snapshot.value : grandTotals.value;
                        
                        return (
                          <td key={idx} className="px-6 py-4 text-right">
                            <div className="text-sm font-semibold text-white">
                              {formatCurrency(value)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
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