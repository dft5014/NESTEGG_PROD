import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';
import { 
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  TrendingUp,
  Grid,
  BarChart3,
  Moon,
  Sun
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Report = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null);
  const [unifiedPositions, setUnifiedPositions] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [selectedGrouping, setSelectedGrouping] = useState('identifier');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set(['security', 'cash', 'crypto', 'metal']));
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [darkMode, setDarkMode] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [compareDate1, setCompareDate1] = useState(null);
  const [compareDate2, setCompareDate2] = useState(null);
  const [viewMode, setViewMode] = useState('overview');

  // Format utilities
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    const percent = value * 100;
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Asset type colors
  const getAssetColor = (type) => {
    const colors = {
      security: '#3b82f6',
      cash: '#10b981',
      crypto: '#8b5cf6',
      metal: '#f97316',
      realestate: '#ef4444',
      other: '#6b7280'
    };
    return colors[type] || colors.other;
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch snapshot data
        const snapResponse = await fetchWithAuth(`/portfolio/snapshots/raw?days=${selectedTimeframe}`);
        if (snapResponse.ok) {
          const snapData = await snapResponse.json();
          setRawData(snapData);
          
          // Set compare dates if available
          if (snapData.summary?.dates?.length > 0) {
            const dates = snapData.summary.dates;
            setCompareDate1(dates[0]);
            setCompareDate2(dates[dates.length - 1]);
            
            // Initialize selected accounts
            if (snapData.summary.accounts) {
              setSelectedAccounts(new Set(snapData.summary.accounts.map(acc => acc.id.toString())));
            }
          }
        }

        // Fetch unified positions
        const unifiedResponse = await fetchWithAuth('/positions/unified');
        if (unifiedResponse.ok) {
          const unifiedData = await unifiedResponse.json();
          setUnifiedPositions(unifiedData.positions || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTimeframe]);

  // Get latest positions from snapshots or unified positions
  const currentPositions = useMemo(() => {
    if (rawData?.summary?.dates?.length > 0) {
      const latestDate = rawData.summary.dates[rawData.summary.dates.length - 1];
      const latestSnapshot = rawData.snapshots_by_date[latestDate];
      if (latestSnapshot?.positions) {
        return Object.values(latestSnapshot.positions);
      }
    }
    return unifiedPositions;
  }, [rawData, unifiedPositions]);

  // Process grouped data
  const processedData = useMemo(() => {
    const positions = currentPositions.filter(position => {
      if (!selectedAssetTypes.has(position.asset_type)) return false;
      if (!selectedAccounts.has(position.account_id?.toString())) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          position.identifier?.toLowerCase().includes(search) ||
          position.name?.toLowerCase().includes(search) ||
          position.ticker?.toLowerCase().includes(search)
        );
      }
      return true;
    });

    const grouped = {};
    
    positions.forEach(position => {
      let groupKey;
      switch (selectedGrouping) {
        case 'identifier':
          groupKey = position.identifier || position.ticker || 'Cash/Other';
          break;
        case 'asset_type':
          groupKey = position.asset_type || 'Other';
          break;
        case 'account':
          groupKey = position.account_name || 'Unknown Account';
          break;
        case 'sector':
          groupKey = position.sector || 'Other';
          break;
        default:
          groupKey = 'All';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          key: groupKey,
          name: groupKey,
          positions: [],
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalIncome: 0,
          totalQuantity: 0
        };
      }

      grouped[groupKey].positions.push(position);
      grouped[groupKey].totalValue += position.current_value || 0;
      grouped[groupKey].totalCostBasis += position.total_cost_basis || 0;
      grouped[groupKey].totalGainLoss += position.gain_loss_amt || 0;
      grouped[groupKey].totalIncome += position.position_income || 0;
      grouped[groupKey].totalQuantity += position.quantity || 0;
    });

    // Calculate totals
    const totals = {
      value: 0,
      costBasis: 0,
      gainLoss: 0,
      income: 0
    };

    Object.values(grouped).forEach(group => {
      totals.value += group.totalValue;
      totals.costBasis += group.totalCostBasis;
      totals.gainLoss += group.totalGainLoss;
      totals.income += group.totalIncome;
    });

    return { grouped, totals };
  }, [currentPositions, selectedGrouping, selectedAssetTypes, selectedAccounts, searchTerm]);

  // Get trend data
  const trendData = useMemo(() => {
    if (!rawData?.snapshots_by_date) return null;

    const dates = Object.keys(rawData.snapshots_by_date).sort();
    const data = dates.map(date => {
      const snapshot = rawData.snapshots_by_date[date];
      return {
        date,
        marketValue: snapshot.total_value || 0,
        costBasis: snapshot.total_cost_basis || 0,
        gainLoss: snapshot.total_gain_loss || 0
      };
    });

    return {
      labels: data.map(d => formatDate(d.date)),
      datasets: [
        {
          label: 'Market Value',
          data: data.map(d => d.marketValue),
          borderColor: darkMode ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)',
          backgroundColor: darkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Cost Basis',
          data: data.map(d => d.costBasis),
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [rawData, darkMode]);

  // Get allocation data
  const allocationData = useMemo(() => {
    const { grouped } = processedData;
    const sortedGroups = Object.entries(grouped)
      .sort((a, b) => b[1].totalValue - a[1].totalValue)
      .slice(0, 8);
    
    return {
      labels: sortedGroups.map(([key]) => key),
      datasets: [{
        data: sortedGroups.map(([, data]) => data.totalValue),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#8b5cf6',
          '#f97316',
          '#ef4444',
          '#14b8a6',
          '#f59e0b',
          '#6b7280'
        ],
        borderWidth: 2,
        borderColor: darkMode ? '#1f2937' : '#fff'
      }]
    };
  }, [processedData, darkMode]);

  // Get comparison data
  const comparisonData = useMemo(() => {
    if (!rawData || !compareDate1 || !compareDate2) return [];

    const snapshot1 = rawData.snapshots_by_date[compareDate1];
    const snapshot2 = rawData.snapshots_by_date[compareDate2];
    
    if (!snapshot1 || !snapshot2) return [];

    const results = [];
    const allKeys = new Set([
      ...Object.keys(snapshot1.positions || {}),
      ...Object.keys(snapshot2.positions || {})
    ]);

    allKeys.forEach(key => {
      const pos1 = snapshot1.positions[key];
      const pos2 = snapshot2.positions[key];
      
      if (!selectedAssetTypes.has(pos1?.asset_type || pos2?.asset_type)) return;
      
      results.push({
        key,
        identifier: pos1?.identifier || pos2?.identifier,
        name: pos1?.name || pos2?.name,
        account_name: pos1?.account_name || pos2?.account_name,
        value1: pos1?.current_value || 0,
        value2: pos2?.current_value || 0,
        quantity1: pos1?.quantity || 0,
        quantity2: pos2?.quantity || 0,
        change: (pos2?.current_value || 0) - (pos1?.current_value || 0),
        changePercent: pos1?.current_value > 0 
          ? (((pos2?.current_value || 0) - pos1.current_value) / pos1.current_value) 
          : 0,
        isNew: !pos1 && pos2,
        isSold: pos1 && !pos2
      });
    });

    return results.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [rawData, compareDate1, compareDate2, selectedAssetTypes]);

  const toggleGroup = (key) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <RefreshCw className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin mx-auto`} />
          <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading report data...</p>
        </div>
      </div>
    );
  }

  const { grouped, totals } = processedData;

  return (
    <>
      <Head>
        <title>Portfolio Report - NestEgg</title>
      </Head>

      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow mb-6 p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Portfolio Report
              </h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-md ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button
                  className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => window.print()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button
                  className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>

            {/* View Tabs */}
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <nav className="-mb-px flex space-x-8">
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'overview'
                      ? `${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600'}`
                      : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                  onClick={() => setViewMode('overview')}
                >
                  <Grid className="h-5 w-5 inline-block mr-2" />
                  Overview
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'comparison'
                      ? `${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600'}`
                      : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                  onClick={() => setViewMode('comparison')}
                >
                  <TrendingUp className="h-5 w-5 inline-block mr-2" />
                  Comparison
                </button>
              </nav>
            </div>
          </div>

          {/* Controls */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow mb-6 p-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ticker or name..."
                    className={`w-full pl-10 pr-3 py-2 border rounded-md ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 text-gray-100' 
                        : 'border-gray-300'
                    }`}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Timeframe */}
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Timeframe
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-md ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-gray-100' 
                      : 'border-gray-300'
                  }`}
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="180">Last 6 Months</option>
                  <option value="365">Last Year</option>
                </select>
              </div>

              {/* Group By */}
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Group By
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-md ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700 text-gray-100' 
                      : 'border-gray-300'
                  }`}
                  value={selectedGrouping}
                  onChange={(e) => setSelectedGrouping(e.target.value)}
                >
                  <option value="identifier">Ticker/Identifier</option>
                  <option value="asset_type">Asset Type</option>
                  <option value="account">Account</option>
                  <option value="sector">Sector</option>
                </select>
              </div>

              {/* Details Toggle */}
              <div className="flex items-end">
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    showDetails
                      ? 'bg-blue-600 text-white'
                      : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`
                  }`}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  Show Details
                </button>
              </div>
            </div>

            {/* Asset Type Filters */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Asset Types:</span>
              {['security', 'cash', 'crypto', 'metal'].map(type => (
                <button
                  key={type}
                  onClick={() => {
                    const newSelected = new Set(selectedAssetTypes);
                    if (newSelected.has(type)) {
                      newSelected.delete(type);
                    } else {
                      newSelected.add(type);
                    }
                    setSelectedAssetTypes(newSelected);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedAssetTypes.has(type)
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Overview Mode */}
          {viewMode === 'overview' && (
            <>
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
                  <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    Portfolio Trend
                  </h3>
                  <div className="h-64">
                    {trendData && (
                      <Line
                        data={trendData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'bottom',
                              labels: {
                                color: darkMode ? '#e5e7eb' : '#374151'
                              }
                            }
                          },
                          scales: {
                            x: {
                              ticks: { color: darkMode ? '#9ca3af' : '#6b7280' },
                              grid: { color: darkMode ? '#374151' : '#e5e7eb' }
                            },
                            y: {
                              ticks: {
                                callback: function(value) {
                                  return '$' + value.toLocaleString();
                                },
                                color: darkMode ? '#9ca3af' : '#6b7280'
                              },
                              grid: { color: darkMode ? '#374151' : '#e5e7eb' }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
                  <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    Allocation by {selectedGrouping.replace('_', ' ')}
                  </h3>
                  <div className="h-64">
                    <Doughnut
                      data={allocationData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'right',
                            labels: {
                              color: darkMode ? '#e5e7eb' : '#374151'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Main Table */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {selectedGrouping.replace('_', ' ')}
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Quantity
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Market Value
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Cost Basis
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Gain/Loss
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Gain/Loss %
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {Object.entries(grouped)
                        .sort((a, b) => b[1].totalValue - a[1].totalValue)
                        .map(([groupKey, groupData]) => (
                          <React.Fragment key={groupKey}>
                            <tr 
                              className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer`}
                              onClick={() => toggleGroup(groupKey)}
                            >
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                <div className="flex items-center">
                                  {expandedGroups.has(groupKey) ? (
                                    <ChevronDown className="h-4 w-4 mr-2 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                                  )}
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ 
                                      backgroundColor: selectedGrouping === 'asset_type' 
                                        ? getAssetColor(groupKey) 
                                        : '#6b7280'
                                    }}
                                  />
                                  {groupKey}
                                  <span className={`ml-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    ({groupData.positions.length})
                                  </span>
                                </div>
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                {groupData.totalQuantity > 0 ? formatNumber(groupData.totalQuantity, 2) : '-'}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                {formatCurrency(groupData.totalValue)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                {formatCurrency(groupData.totalCostBasis)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                                groupData.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(groupData.totalGainLoss)}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                                groupData.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {groupData.totalCostBasis > 0 
                                  ? formatPercent(groupData.totalGainLoss / groupData.totalCostBasis)
                                  : '-'}
                              </td>
                            </tr>
                            {expandedGroups.has(groupKey) && groupData.positions.map((position, idx) => (
                              <tr key={`${groupKey}-${idx}`} className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                                <td className={`px-6 py-3 whitespace-nowrap text-sm pl-14 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                  <div>
                                    <div className="font-medium">{position.identifier || 'Cash'}</div>
                                    {showDetails && (
                                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {position.name} • {position.account_name}
                                        {position.purchase_date && ` • ${formatFullDate(position.purchase_date)}`}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                  {position.quantity ? formatNumber(position.quantity, 4) : '-'}
                                </td>
                                <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                  {formatCurrency(position.current_value)}
                                  {showDetails && position.current_price && (
                                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      @ {formatCurrency(position.current_price)}
                                    </div>
                                  )}
                                </td>
                                <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                  {formatCurrency(position.total_cost_basis)}
                                  {showDetails && position.cost_per_unit && (
                                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      @ {formatCurrency(position.cost_per_unit)}
                                    </div>
                                  )}
                                </td>
                                <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${
                                  position.gain_loss_amt >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(position.gain_loss_amt)}
                                </td>
                                <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${
                                  position.gain_loss_pct >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatPercent(position.gain_loss_pct)}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                    </tbody>
                    <tfoot className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      <tr>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          Total
                        </td>
                        <td></td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {formatCurrency(totals.value)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {formatCurrency(totals.costBasis)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                          totals.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(totals.gainLoss)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                          totals.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {totals.costBasis > 0 ? formatPercent(totals.gainLoss / totals.costBasis) : '-'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Comparison Mode */}
          {viewMode === 'comparison' && rawData?.summary?.dates?.length > 0 && (
            <div>
              {/* Date Selectors */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 mb-6`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      From Date
                    </label>
                    <select
                      className={`w-full px-3 py-2 border rounded-md ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-100' 
                          : 'border-gray-300'
                      }`}
                      value={compareDate1 || ''}
                      onChange={(e) => setCompareDate1(e.target.value)}
                    >
                      {rawData.summary.dates.map(date => (
                        <option key={date} value={date}>{formatFullDate(date)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      To Date
                    </label>
                    <select
                      className={`w-full px-3 py-2 border rounded-md ${
                        darkMode 
                          ? 'border-gray-600 bg-gray-700 text-gray-100' 
                          : 'border-gray-300'
                      }`}
                      value={compareDate2 || ''}
                      onChange={(e) => setCompareDate2(e.target.value)}
                    >
                      {rawData.summary.dates.map(date => (
                        <option key={date} value={date}>{formatFullDate(date)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Position
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(compareDate1)}
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(compareDate2)}
                        </th>
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Change
                        </th>
                        <th className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {comparisonData.map((item, idx) => (
                        <tr key={idx} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            <div>
                              <div className="font-medium">{item.identifier}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.name}
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatCurrency(item.value1)}
                            {showDetails && item.quantity1 > 0 && (
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatNumber(item.quantity1, 2)} shares
                              </div>
                            )}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                            {formatCurrency(item.value2)}
                            {showDetails && item.quantity2 > 0 && (
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatNumber(item.quantity2, 2)} shares
                              </div>
                            )}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                            item.change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(item.change)}
                            <div className="text-xs">
                              {item.changePercent !== 0 ? formatPercent(item.changePercent) : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {item.isNew && (
                              <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full">
                                New
                              </span>
                            )}
                            {item.isSold && (
                              <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded-full">
                                Sold
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Report;