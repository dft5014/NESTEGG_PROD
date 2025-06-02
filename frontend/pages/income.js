// pages/portfolio-snapshots-analysis.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';

// Import icons individually
import Download from 'lucide-react/dist/esm/icons/download';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Activity from 'lucide-react/dist/esm/icons/activity';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import Percent from 'lucide-react/dist/esm/icons/percent';
import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Minus from 'lucide-react/dist/esm/icons/minus';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ArrowDownRight from 'lucide-react/dist/esm/icons/arrow-down-right';
import Shield from 'lucide-react/dist/esm/icons/shield';

// Format utilities
const formatCurrency = (value, compact = false) => {
  if (value === null || value === undefined || value === 0) return '-';
  
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercentage = (value, showSign = true) => {
  if (value === null || value === undefined) return '-';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const formatDate = (dateStr, format = 'short') => {
  const date = new Date(dateStr);
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (format === 'full') {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString();
};

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

// Constants
const ASSET_TYPE_CONFIG = {
  security: { color: '#4f46e5', label: 'Securities' },
  cash: { color: '#10b981', label: 'Cash' },
  crypto: { color: '#8b5cf6', label: 'Cryptocurrency' },
  metal: { color: '#f97316', label: 'Precious Metals' },
  realestate: { color: '#ef4444', label: 'Real Estate' },
  other: { color: '#6b7280', label: 'Other' }
};

const SECTOR_COLORS = {
  'Technology': '#6366f1',
  'Financial Services': '#0ea5e9',
  'Healthcare': '#10b981',
  'Consumer Cyclical': '#f59e0b',
  'Communication Services': '#8b5cf6',
  'Industrials': '#64748b',
  'Consumer Defensive': '#14b8a6',
  'Energy': '#f97316',
  'Basic Materials': '#f43f5e',
  'Real Estate': '#84cc16',
  'Utilities': '#0284c7',
  'Unknown': '#9ca3af'
};

export default function PortfolioSnapshotsAnalysis() {
  const router = useRouter();
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [unifiedPositions, setUnifiedPositions] = useState([]);
  const [displayDates, setDisplayDates] = useState([]);
  const [dateRange, setDateRange] = useState({ start: 0, end: 30 });
  const [groupBy, setGroupBy] = useState('asset_type');
  const [valueDisplay, setValueDisplay] = useState('current');
  const [showDetails, setShowDetails] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set(['security', 'cash', 'crypto', 'metal', 'realestate']));
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [dateRangeOption, setDateRangeOption] = useState('last30');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [compareDate1, setCompareDate1] = useState(null);
  const [compareDate2, setCompareDate2] = useState(null);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({ gain: 20, loss: -10 });
  const [dataIntegrityIssues, setDataIntegrityIssues] = useState([]);

  // Date range options
  const dateRangeOptions = [
    { value: 'last7', label: 'Last 7 Days', days: 7 },
    { value: 'last14', label: 'Last 14 Days', days: 14 },
    { value: 'last30', label: 'Last 30 Days', days: 30 },
    { value: 'last90', label: 'Last 90 Days', days: 90 },
    { value: 'ytd', label: 'Year to Date', days: 'ytd' },
    { value: 'all', label: 'All Time', days: 'all' }
  ];

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch snapshot data
      const snapResponse = await fetchWithAuth('/portfolio/snapshots/raw?days=90');
      if (!snapResponse.ok) {
        throw new Error(`Failed to fetch snapshots: ${snapResponse.status}`);
      }
      const snapData = await snapResponse.json();
      setRawData(snapData);

      // Fetch unified positions
      const unifiedResponse = await fetchWithAuth('/positions/unified');
      if (!unifiedResponse.ok) {
        throw new Error(`Failed to fetch unified positions: ${unifiedResponse.status}`);
      }
      const unifiedData = await unifiedResponse.json();
      setUnifiedPositions(unifiedData.positions || []);

      // Set initial dates
      if (snapData.summary.dates.length > 0) {
        const dates = snapData.summary.dates;
        setDisplayDates(dates);
        setCompareDate1(dates[Math.max(0, dates.length - 30)]);
        setCompareDate2(dates[dates.length - 1]);

        // Initialize selected accounts
        if (snapData.summary.accounts) {
          setSelectedAccounts(new Set(snapData.summary.accounts.map(acc => acc.id.toString())));
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update visible date range
  useEffect(() => {
    if (!displayDates.length) return;

    let start, end;
    const option = dateRangeOptions.find(opt => opt.value === dateRangeOption);
    
    if (dateRangeOption === 'ytd') {
      const currentYear = new Date().getFullYear();
      const ytdIndex = displayDates.findIndex(date => new Date(date).getFullYear() === currentYear);
      start = ytdIndex >= 0 ? ytdIndex : 0;
      end = displayDates.length;
    } else if (dateRangeOption === 'all') {
      start = 0;
      end = displayDates.length;
    } else if (option && typeof option.days === 'number') {
      start = Math.max(0, displayDates.length - option.days);
      end = displayDates.length;
    } else {
      start = Math.max(0, displayDates.length - 30);
      end = displayDates.length;
    }

    setDateRange({ start, end });
  }, [dateRangeOption, displayDates]);

  // Check data integrity
  useEffect(() => {
    if (!rawData || !unifiedPositions.length) return;
    
    const issues = [];
    const latestDate = displayDates[displayDates.length - 1];
    const latestSnapshot = latestDate ? rawData.snapshots_by_date[latestDate] : null;
    
    if (!latestSnapshot) return;

    // Check for value discrepancies
    unifiedPositions.forEach(pos => {
      const key = `${pos.asset_type}|${pos.ticker || pos.identifier}|${pos.account_id}`;
      const snapPos = latestSnapshot.positions[key];
      
      if (snapPos) {
        const valueDiff = Math.abs((pos.current_value || 0) - snapPos.current_value);
        const percentDiff = snapPos.current_value > 0 ? (valueDiff / snapPos.current_value) * 100 : 0;

        if (percentDiff > 1) {
          issues.push({
            type: 'value_mismatch',
            severity: percentDiff > 5 ? 'error' : 'warning',
            position: snapPos.identifier,
            message: `Value mismatch for ${snapPos.identifier}: ${formatCurrency(valueDiff)} (${formatPercentage(percentDiff)})`
          });
        }
      }
    });

    setDataIntegrityIssues(issues);
  }, [rawData, unifiedPositions, displayDates]);

  // Process data for display
  const processedData = useMemo(() => {
    if (!rawData || !displayDates.length) return { rows: [], totals: {}, visibleDates: [] };

    const visibleDates = displayDates.slice(dateRange.start, dateRange.end);
    const rows = [];
    const totals = {};

    // Initialize totals
    visibleDates.forEach(date => {
      totals[date] = {
        value: 0,
        costBasis: 0,
        gainLoss: 0,
        positionCount: 0
      };
    });

    // Get all unique positions
    const positionMap = new Map();

    visibleDates.forEach(date => {
      const snapshot = rawData.snapshots_by_date[date];
      if (snapshot && snapshot.positions) {
        Object.entries(snapshot.positions).forEach(([key, position]) => {
          // Apply filters
          if (!selectedAssetTypes.has(position.asset_type)) return;
          if (!selectedAccounts.has(position.account_id.toString())) return;
          if (searchTerm && !position.identifier.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !position.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

          if (!positionMap.has(key)) {
            positionMap.set(key, {
              key,
              asset_type: position.asset_type,
              identifier: position.identifier,
              name: position.name,
              account_name: position.account_name,
              account_id: position.account_id,
              sector: position.sector,
              values: {}
            });
          }

          positionMap.get(key).values[date] = {
            value: position.current_value,
            costBasis: position.total_cost_basis,
            gainLoss: position.gain_loss_amt,
            gainLossPct: position.gain_loss_pct,
            quantity: position.quantity,
            price: position.current_price
          };

          // Add to totals
          totals[date].value += position.current_value;
          totals[date].costBasis += position.total_cost_basis;
          totals[date].gainLoss += position.gain_loss_amt;
          totals[date].positionCount += 1;
        });
      }
    });

    // Convert to array and sort if needed
    let allRows = Array.from(positionMap.values());

    if (sortColumn && visibleDates.includes(sortColumn)) {
      allRows.sort((a, b) => {
        const aValue = a.values[sortColumn]?.value || 0;
        const bValue = b.values[sortColumn]?.value || 0;
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      });
    }

    // Group data
    if (groupBy !== 'none') {
      const grouped = {};
      
      allRows.forEach(row => {
        let groupKey, groupName;
        
        if (groupBy === 'asset_type') {
          groupKey = row.asset_type;
          groupName = ASSET_TYPE_CONFIG[row.asset_type]?.label || row.asset_type;
        } else if (groupBy === 'account') {
          groupKey = row.account_id.toString();
          groupName = row.account_name;
        } else if (groupBy === 'sector') {
          groupKey = row.sector || 'Unknown';
          groupName = groupKey;
        }

        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            key: groupKey,
            name: groupName,
            type: 'group',
            children: [],
            values: {}
          };

          visibleDates.forEach(date => {
            grouped[groupKey].values[date] = {
              value: 0,
              costBasis: 0,
              gainLoss: 0,
              positionCount: 0
            };
          });
        }

        grouped[groupKey].children.push(row);

        Object.entries(row.values).forEach(([date, data]) => {
          grouped[groupKey].values[date].value += data.value;
          grouped[groupKey].values[date].costBasis += data.costBasis;
          grouped[groupKey].values[date].gainLoss += data.gainLoss;
          grouped[groupKey].values[date].positionCount += 1;
        });
      });

      // Add groups to rows
      Object.values(grouped).forEach(group => {
        rows.push(group);
        if (expandedGroups.has(group.key)) {
          rows.push(...group.children);
        }
      });
    } else {
      rows.push(...allRows);
    }

    return { rows, totals, visibleDates };
  }, [rawData, displayDates, dateRange, groupBy, expandedGroups, searchTerm, selectedAssetTypes, selectedAccounts, sortColumn, sortDirection]);

  // Comparison data
  const comparisonData = useMemo(() => {
    if (!rawData || !compareDate1 || !compareDate2) return { positions: [], summary: {} };

    const snapshot1 = rawData.snapshots_by_date[compareDate1];
    const snapshot2 = rawData.snapshots_by_date[compareDate2];
    if (!snapshot1 || !snapshot2) return { positions: [], summary: {} };

    const positions = [];
    const summary = {
      date1Total: 0,
      date2Total: 0,
      totalChange: 0,
      totalChangePercent: 0,
      winners: 0,
      losers: 0
    };

    // Process all positions
    const allKeys = new Set([
      ...Object.keys(snapshot1.positions || {}),
      ...Object.keys(snapshot2.positions || {})
    ]);

    allKeys.forEach(key => {
      const pos1 = snapshot1.positions[key];
      const pos2 = snapshot2.positions[key];

      const position = pos1 || pos2;
      if (!selectedAssetTypes.has(position.asset_type)) return;
      if (!selectedAccounts.has(position.account_id.toString())) return;

      const date1Value = pos1?.current_value || 0;
      const date2Value = pos2?.current_value || 0;
      const change = date2Value - date1Value;
      const changePercent = date1Value > 0 ? (change / date1Value) * 100 : 0;

      positions.push({
        key,
        identifier: position.identifier,
        name: position.name,
        account_name: position.account_name,
        asset_type: position.asset_type,
        date1Value,
        date2Value,
        change,
        changePercent,
        isNew: !pos1 && pos2,
        isClosed: pos1 && !pos2
      });

      summary.date1Total += date1Value;
      summary.date2Total += date2Value;
      if (change > 0) summary.winners++;
      if (change < 0) summary.losers++;
    });

    summary.totalChange = summary.date2Total - summary.date1Total;
    summary.totalChangePercent = summary.date1Total > 0 
      ? (summary.totalChange / summary.date1Total) * 100 
      : 0;

    positions.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return { positions, summary };
  }, [rawData, compareDate1, compareDate2, selectedAssetTypes, selectedAccounts]);

  // Event handlers
  const handleDateSort = (date) => {
    if (sortColumn === date) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(date);
      setSortDirection('desc');
    }
  };

  const toggleGroup = (key) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleAssetType = (type) => {
    setSelectedAssetTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const toggleAccount = (accountId) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      const idStr = accountId.toString();
      if (newSet.has(idStr)) {
        newSet.delete(idStr);
      } else {
        newSet.add(idStr);
      }
      return newSet;
    });
  };

  const exportData = () => {
    const { rows, visibleDates } = processedData;
    
    let csv = 'Position,Type,Account';
    visibleDates.forEach(date => {
      csv += `,${formatDate(date, 'full')}`;
    });
    csv += '\n';

    rows.forEach(row => {
      csv += `"${row.identifier || row.name}","${row.asset_type || 'Group'}","${row.account_name || ''}"`;
      visibleDates.forEach(date => {
        const value = row.values[date]?.value || 0;
        csv += `,${value}`;
      });
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-analysis-${formatDate(new Date().toISOString(), 'full')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/portfolio/snapshots/raw?days=365');
      if (response.ok) {
        const data = await response.json();
        setRawData(data);
        setDisplayDates(data.summary.dates);
      }
    } catch (err) {
      console.error('Error loading all data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state
  if (isLoading && !rawData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-300">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  // Render error state
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

  const { rows, totals, visibleDates } = processedData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Head>
        <title>Portfolio Analysis | NestEgg</title>
      </Head>

      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="max-w-full mx-auto mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Portfolio Analysis
              </h1>
              <p className="text-gray-400">
                Comprehensive portfolio analytics and position tracking
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportData}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors text-gray-300"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => router.push('/reports')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
              >
                Back to Reports
              </button>
            </div>
          </div>
        </div>

        {/* Data Integrity Alert */}
        {dataIntegrityIssues.length > 0 && (
          <div className="max-w-full mx-auto mb-6">
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-yellow-400 font-semibold">Data Integrity Issues</h3>
              </div>
              <div className="space-y-1">
                {dataIntegrityIssues.slice(0, 3).map((issue, idx) => (
                  <p key={idx} className="text-sm text-gray-300">{issue.message}</p>
                ))}
                {dataIntegrityIssues.length > 3 && (
                  <p className="text-sm text-gray-400">
                    ...and {dataIntegrityIssues.length - 3} more issues
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="max-w-full mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Value Card */}
            <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Value</p>
                  <DollarSign className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totals[visibleDates[visibleDates.length - 1]]?.value || 0, true)}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {totals[visibleDates[visibleDates.length - 1]]?.positionCount || 0} positions
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent"></div>
            </div>

            {/* Total Gain/Loss Card */}
            <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Gain/Loss</p>
                  <Percent className="w-4 h-4 text-gray-500" />
                </div>
                <p className={`text-2xl font-bold ${
                  totals[visibleDates[visibleDates.length - 1]]?.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(totals[visibleDates[visibleDates.length - 1]]?.gainLoss || 0, true)}
                </p>
                <p className={`text-sm mt-2 ${
                  totals[visibleDates[visibleDates.length - 1]]?.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPercentage(
                    totals[visibleDates[visibleDates.length - 1]]?.costBasis > 0
                      ? (totals[visibleDates[visibleDates.length - 1]]?.gainLoss / totals[visibleDates[visibleDates.length - 1]]?.costBasis) * 100
                      : 0
                  )}
                </p>
              </div>
              <div className={`absolute inset-0 bg-gradient-to-br ${
                totals[visibleDates[visibleDates.length - 1]]?.gainLoss >= 0 
                  ? 'from-green-600/10' 
                  : 'from-red-600/10'
              } to-transparent`}></div>
            </div>

            {/* Period Performance Card */}
            <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Period Performance</p>
                  <Activity className="w-4 h-4 text-gray-500" />
                </div>
                <p className={`text-2xl font-bold ${
                  comparisonData.summary.totalChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPercentage(comparisonData.summary.totalChangePercent)}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {comparisonData.summary.winners} winners, {comparisonData.summary.losers} losers
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="max-w-full mx-auto mb-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <label className="text-xs text-gray-400 mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search positions..."
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Date Range</label>
                <select
                  value={dateRangeOption}
                  onChange={(e) => setDateRangeOption(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group By */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Group By</label>
                <div className="flex gap-1">
                  {[
                    { value: 'asset_type', label: 'Type' },
                    { value: 'account', label: 'Account' },
                    { value: 'sector', label: 'Sector' },
                    { value: 'none', label: 'None' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setGroupBy(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm flex-1 transition-colors ${
                        groupBy === option.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value Display */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Show Values</label>
                <div className="flex gap-1">
                  {[
                    { value: 'current', label: 'Market' },
                    { value: 'cost_basis', label: 'Cost' },
                    { value: 'gain_loss', label: 'Gain/Loss' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setValueDisplay(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm flex-1 transition-colors ${
                        valueDisplay === option.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {/* Asset Type Filters */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Asset Types:</span>
                {Object.entries(ASSET_TYPE_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => toggleAssetType(type)}
                    className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                      selectedAssetTypes.has(type)
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </button>
                ))}
              </div>

              {/* Account Filters */}
              {rawData?.summary?.accounts && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Accounts:</span>
                  {rawData.summary.accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        selectedAccounts.has(account.id.toString())
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-between items-center border-t border-gray-700 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    showDetails ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {showDetails ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Details
                </button>
                <button
                  onClick={() => setShowHeatMap(!showHeatMap)}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                    showHeatMap ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  Heat Map
                </button>
                <button
                  onClick={() => setExpandedGroups(new Set())}
                  className="px-3 py-1 bg-gray-700 text-gray-400 hover:text-white rounded text-sm"
                >
                  Collapse All
                </button>
              </div>
              <button
                onClick={loadAllData}
                disabled={isLoading}
                className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load Full Year'}
              </button>
            </div>
          </div>
        </div>

        {/* Historical Position Table */}
        <div className="max-w-full mx-auto mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Historical Position Values</h2>
          
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10 min-w-[250px]">
                      {groupBy === 'asset_type' && 'Asset Type / Position'}
                      {groupBy === 'account' && 'Account / Position'}
                      {groupBy === 'sector' && 'Sector / Position'}
                      {groupBy === 'none' && 'Position'}
                    </th>
                    {visibleDates.map((date, idx) => (
                      <th 
                        key={idx} 
                        onClick={() => handleDateSort(date)}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[120px] cursor-pointer hover:text-white"
                      >
                        <div className="flex items-center justify-end gap-1">
                          {formatDate(date)}
                          {sortColumn === date && (
                            <span className="text-indigo-400">
                              {sortDirection === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {rows.map((row, rowIdx) => {
                    const isGroup = row.type === 'group';
                    const rowKey = row.key || rowIdx;

                    return (
                      <tr 
                        key={rowKey}
                        className={`${
                          isGroup ? 'bg-gray-850 hover:bg-gray-750' : 'hover:bg-gray-750'
                        } transition-colors`}
                      >
                        <td className={`px-4 py-2 sticky left-0 ${
                          isGroup ? 'bg-gray-850' : 'bg-gray-800'
                        }`}>
                          <div className={`flex items-center ${isGroup ? '' : 'pl-6'}`}>
                            {isGroup && (
                              <button
                                onClick={() => toggleGroup(row.key)}
                                className="mr-2 text-gray-400 hover:text-white"
                              >
                                {expandedGroups.has(row.key) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ 
                                backgroundColor: isGroup 
                                  ? (groupBy === 'asset_type' ? ASSET_TYPE_CONFIG[row.key]?.color : 
                                     groupBy === 'sector' ? SECTOR_COLORS[row.key] : '#6b7280')
                                  : ASSET_TYPE_CONFIG[row.asset_type]?.color || '#6b7280'
                              }}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white">
                                {isGroup ? row.name : row.identifier}
                              </div>
                              {!isGroup && (
                                <div className="text-xs text-gray-400">
                                  {row.name}
                                  {showDetails && (
                                    <span>
                                      {' • '}{row.account_name}
                                      {row.sector && ` • ${row.sector}`}
                                    </span>
                                  )}
                                </div>
                              )}
                              {isGroup && (
                                <div className="text-xs text-gray-400">
                                  {row.children.length} positions
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {visibleDates.map((date, idx) => {
                          const data = row.values[date] || {};
                          const prevDate = idx > 0 ? visibleDates[idx - 1] : null;
                          const prevData = prevDate ? (row.values[prevDate] || {}) : {};

                          let primaryValue, secondaryValue, changePercent;

                          if (valueDisplay === 'current') {
                            primaryValue = data.value;
                            secondaryValue = showDetails && data.quantity ? `${formatNumber(data.quantity, 2)} @ ${formatCurrency(data.price)}` : null;
                            changePercent = prevData.value ? ((data.value - prevData.value) / prevData.value) * 100 : 0;
                          } else if (valueDisplay === 'cost_basis') {
                            primaryValue = data.costBasis;
                            changePercent = prevData.costBasis ? ((data.costBasis - prevData.costBasis) / prevData.costBasis) * 100 : 0;
                          } else if (valueDisplay === 'gain_loss') {
                            primaryValue = data.gainLoss;
                            secondaryValue = data.gainLossPct;
                            changePercent = null;
                          }

                          // Heat map color
                          let cellColor = 'transparent';
                          if (showHeatMap && primaryValue) {
                            if (valueDisplay === 'gain_loss') {
                              const intensity = Math.min(Math.abs(data.gainLossPct || 0) / 50, 1);
                              cellColor = data.gainLoss >= 0 
                                ? `rgba(34, 197, 94, ${intensity * 0.2})`
                                : `rgba(239, 68, 68, ${intensity * 0.2})`;
                            } else if (changePercent !== null) {
                              const intensity = Math.min(Math.abs(changePercent) / 10, 1);
                              cellColor = changePercent >= 0 
                                ? `rgba(34, 197, 94, ${intensity * 0.2})`
                                : `rgba(239, 68, 68, ${intensity * 0.2})`;
                            }
                          }

                          return (
                            <td 
                              key={idx} 
                              className="px-4 py-2 text-right"
                              style={{ backgroundColor: cellColor }}
                            >
                              <div className={`text-sm ${
                                valueDisplay === 'gain_loss' 
                                  ? (primaryValue >= 0 ? 'text-green-400' : 'text-red-400')
                                  : 'text-white'
                              }`}>
                                {formatCurrency(primaryValue)}
                              </div>
                              {secondaryValue && (
                                <div className={`text-xs ${
                                  valueDisplay === 'gain_loss' 
                                    ? (secondaryValue >= 0 ? 'text-green-500' : 'text-red-500')
                                    : 'text-gray-500'
                                }`}>
                                  {valueDisplay === 'gain_loss' ? formatPercentage(secondaryValue) : secondaryValue}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr className="bg-gray-900 font-bold">
                    <td className="px-4 py-3 sticky left-0 bg-gray-900">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2 bg-indigo-500" />
                        <span className="text-sm text-white">Portfolio Total</span>
                      </div>
                    </td>
                    {visibleDates.map((date, idx) => {
                      const total = totals[date] || {};
                      
                      return (
                        <td key={idx} className="px-4 py-3 text-right">
                          <div className="text-sm text-white">
                            {valueDisplay === 'current' && formatCurrency(total.value)}
                            {valueDisplay === 'cost_basis' && formatCurrency(total.costBasis)}
                            {valueDisplay === 'gain_loss' && (
                              <span className={total.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatCurrency(total.gainLoss)}
                              </span>
                            )}
                          </div>
                          {valueDisplay === 'gain_loss' && total.costBasis > 0 && (
                            <div className={`text-xs ${total.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPercentage((total.gainLoss / total.costBasis) * 100)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Position Comparison */}
        <div className="max-w-full mx-auto">
          <h2 className="text-xl font-bold text-white mb-4">Position Comparison Analysis</h2>

          {/* Date Selectors */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">From Date</label>
                <select
                  value={compareDate1 || ''}
                  onChange={(e) => setCompareDate1(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                >
                  {displayDates.map(date => (
                    <option key={date} value={date}>{formatDate(date, 'full')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">To Date</label>
                <select
                  value={compareDate2 || ''}
                  onChange={(e) => setCompareDate2(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                >
                  {displayDates.map(date => (
                    <option key={date} value={date}>{formatDate(date, 'full')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {compareDate1 && formatDate(compareDate1)}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {compareDate2 && formatDate(compareDate2)}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Change %
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {comparisonData.positions.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-white">{row.identifier}</div>
                          <div className="text-xs text-gray-400">
                            {row.name} • {row.account_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-white">{formatCurrency(row.date1Value)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-white">{formatCurrency(row.date2Value)}</div>
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${
                        row.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(row.change)}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${
                        row.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(row.changePercent)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.isNew && (
                          <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                        {row.isClosed && (
                          <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">
                            Closed
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
      </div>
    </div>
  );
}