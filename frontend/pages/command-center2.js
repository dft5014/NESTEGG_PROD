// pages/command-center2.js
import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, ComposedChart, ReferenceLine, Brush, ScatterChart, Scatter,
  FunnelChart, Funnel, LabelList, Sector, RadialBarChart, RadialBar
} from 'recharts';

// Import DataStore hooks
import { useSnapshots } from '@/store/hooks/useSnapshots';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { useAccounts } from '@/store/hooks/useAccounts';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, staggerChildren: 0.1 }
  }
};

const itemVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4 }
  },
  hover: { 
    scale: 1.02,
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
    transition: { duration: 0.2 }
  }
};

// Utility functions
const formatCurrency = (value, compact = false, decimals = 0) => {
  if (!value && value !== 0) return '-';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: compact ? decimals : 2,
    maximumFractionDigits: compact ? decimals : 2,
    notation: compact && Math.abs(value) > 1000000 ? 'compact' : 'standard'
  });
  return formatter.format(value);
};

const formatPercentage = (value, showSign = true) => {
  if (!value && value !== 0) return '-';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const formatDate = (dateStr, format = 'short') => {
  const date = new Date(dateStr);
  if (format === 'short') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Color schemes
const colors = {
  asset: {
    security: '#6366f1',
    cash: '#10b981',
    crypto: '#8b5cf6',
    metal: '#f59e0b',
    realestate: '#ef4444',
    bond: '#ec4899',
    commodity: '#06b6d4',
    other: '#64748b'
  },
  performance: {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280'
  },
  chart: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    tertiary: '#06b6d4',
    quaternary: '#10b981',
    quinary: '#f59e0b',
    senary: '#ef4444'
  },
  gradient: {
    purple: ['#8b5cf6', '#6366f1'],
    green: ['#10b981', '#06b6d4'],
    orange: ['#f59e0b', '#ef4444'],
    blue: ['#06b6d4', '#3b82f6']
  }
};

// Animated number component
const AnimatedNumber = ({ value, format = 'currency', duration = 1000, decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value || 0;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animate();
  }, [value, duration]);

  if (format === 'currency') {
    return <>{formatCurrency(displayValue, true, decimals)}</>;
  } else if (format === 'percentage') {
    return <>{formatPercentage(displayValue)}</>;
  }
  return <>{displayValue.toFixed(decimals)}</>;
};

// Overview Stats Card Component
const OverviewCard = ({ data }) => {
  const stats = [
    { label: 'Total Value', value: data.totalValue, format: 'currency' },
    { label: 'Cost Basis', value: data.costBasis, format: 'currency' },
    { label: 'Total Gain/Loss', value: data.totalGainLoss, format: 'currency', colored: true },
    { label: 'Total Return', value: data.totalReturn, format: 'percentage', colored: true },
    { label: 'Annual Income', value: data.annualIncome, format: 'currency' },
    { label: 'Yield %', value: data.yieldPercent, format: 'percentage' }
  ];

  return (
    <motion.div
      variants={itemVariants}
      whileHover="hover"
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
    >
      <h3 className="text-xl font-bold text-white mb-4">Portfolio Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index}>
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold ${
              stat.colored ? (stat.value >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white'
            }`}>
              {stat.format === 'currency' ? formatCurrency(stat.value, true) : formatPercentage(stat.value)}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Performance Metrics Card
const PerformanceMetricsCard = ({ data }) => {
  const metrics = [
    { label: 'Sharpe Ratio', value: data.sharpeRatio },
    { label: 'Volatility', value: data.volatility },
    { label: 'Max Drawdown', value: data.maxDrawdown },
    { label: 'Beta', value: data.beta }
  ];

  return (
    <motion.div
      variants={itemVariants}
      whileHover="hover"
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
    >
      <h3 className="text-xl font-bold text-white mb-4">Risk Metrics</h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <div key={index}>
            <p className="text-gray-400 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold text-white">
              {metric.value ? metric.value.toFixed(2) : '-'}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Main Portfolio Command Center Component
export default function PortfolioCommandCenter() {
  const router = useRouter();
  
  // Use DataStore hooks
  const { 
    snapshots, 
    summary: snapshotSummary, 
    loading: snapshotLoading, 
    error: snapshotError,
    refresh: refreshSnapshots 
  } = useSnapshots();
  
  const { 
    summary: portfolioSummary,
    topPositions,
    assetPerformance,
    sectorAllocation,
    riskMetrics,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary
  } = usePortfolioSummary();
  
  const {
    positions: groupedPositions,
    summary: positionsSummary,
    loading: positionsLoading,
    error: positionsError,
    refresh: refreshPositions
  } = useGroupedPositions();
  
  const {
    accounts,
    summary: accountsSummary,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts
  } = useAccounts();
  
  const {
    trends,
    loading: trendsLoading,
    error: trendsError
  } = usePortfolioTrends();
  
  // Combine loading states
  const isLoading = snapshotLoading || summaryLoading || positionsLoading || accountsLoading || trendsLoading;
  const error = snapshotError || summaryError || positionsError || accountsError || trendsError;
  
  // State management
  const [activeSection, setActiveSection] = useState('overview');
  const [filters, setFilters] = useState({
    dateRange: '30d',
    selectedAccounts: new Set(),
    selectedAssetTypes: new Set(['security', 'crypto', 'cash', 'metal', 'realestate']),
    groupBy: 'asset',
    searchTerm: ''
  });
  const [compareOptions, setCompareOptions] = useState({
    date1: null,
    date2: null,
    showDifference: true
  });
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [theme, setTheme] = useState('dark');
  const [selectedMetric, setSelectedMetric] = useState('value');

  // Initialize dates when data loads
  useEffect(() => {
    if (snapshots && snapshots.dates && snapshots.dates.length > 0) {
      const dates = snapshots.dates;
      setCompareOptions({
        date1: dates[0],
        date2: dates[dates.length - 1],
        showDifference: true
      });
      
      // Initialize account filter
      if (accounts && accounts.length > 0) {
        setFilters(prev => ({
          ...prev,
          selectedAccounts: new Set(accounts.map(acc => acc.id.toString()))
        }));
      }
    }
  }, [snapshots, accounts]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshSnapshots(),
      refreshSummary(),
      refreshPositions(),
      refreshAccounts()
    ]);
  }, [refreshSnapshots, refreshSummary, refreshPositions, refreshAccounts]);

  // Overview data from portfolio summary
  const overviewData = useMemo(() => {
    if (!portfolioSummary) return null;

    return {
      totalValue: portfolioSummary.netWorth,
      costBasis: portfolioSummary.totalCostBasis,
      totalGainLoss: portfolioSummary.unrealizedGain,
      totalReturn: portfolioSummary.unrealizedGainPercent,
      annualIncome: portfolioSummary.totalDividendIncomeAnnual,
      yieldPercent: portfolioSummary.portfolioYield,
      liquidAssets: portfolioSummary.liquidAssets,
      periodChanges: {
        '1d': { value: portfolioSummary.netWorth1dChange, percent: portfolioSummary.netWorth1dChangePct },
        '1w': { value: portfolioSummary.netWorth1wChange, percent: portfolioSummary.netWorth1wChangePct },
        '1m': { value: portfolioSummary.netWorth1mChange, percent: portfolioSummary.netWorth1mChangePct },
        '3m': { value: portfolioSummary.netWorth3mChange, percent: portfolioSummary.netWorth3mChangePct },
        'ytd': { value: portfolioSummary.netWorthYTDChange, percent: portfolioSummary.netWorthYTDChangePct },
        '1y': { value: portfolioSummary.netWorth1yChange, percent: portfolioSummary.netWorth1yChangePct }
      }
    };
  }, [portfolioSummary]);

  // Time series data from trends
  const timeSeriesData = useMemo(() => {
    if (!trends || !trends.chartData) return { dates: [], series: [], totals: [], yDomain: [0, 100000] };

    const filteredData = trends.chartData.filter(point => {
      // Apply date range filter
      const pointDate = new Date(point.date);
      const now = new Date();
      const daysDiff = (now - pointDate) / (1000 * 60 * 60 * 24);
      
      switch (filters.dateRange) {
        case '30d': return daysDiff <= 30;
        case '90d': return daysDiff <= 90;
        case '180d': return daysDiff <= 180;
        case '365d': return daysDiff <= 365;
        default: return true;
      }
    });

    const dates = filteredData.map(p => p.date);
    const series = {
      totalValue: filteredData.map(p => p.netWorth),
      totalAssets: filteredData.map(p => p.totalAssets),
      totalLiabilities: filteredData.map(p => p.totalLiabilities),
      liquidAssets: filteredData.map(p => p.liquidAssets)
    };
    
    const totals = filteredData.map(p => ({
      date: p.date,
      value: p.netWorth,
      assets: p.totalAssets,
      liabilities: p.totalLiabilities,
      liquid: p.liquidAssets,
      unrealizedGain: p.unrealizedGain,
      unrealizedGainPercent: p.unrealizedGainPercent
    }));

    // Calculate y-axis domain
    const allValues = [
      ...series.totalValue,
      ...series.totalAssets
    ].filter(v => v != null);
    
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;
    const yDomain = [Math.max(0, minValue - padding), maxValue + padding];

    return { dates, series, totals, yDomain };
  }, [trends, filters.dateRange]);

  // Comparison data using snapshots
  const comparisonData = useMemo(() => {
    if (!snapshots || !compareOptions.date1 || !compareOptions.date2) return [];

    const snapshot1 = snapshots.byDate[compareOptions.date1];
    const snapshot2 = snapshots.byDate[compareOptions.date2];
    
    if (!snapshot1 || !snapshot2) return [];

    const positionMap = new Map();

    // Process positions from both snapshots
    const processPositions = (snapshot, dateKey) => {
      Object.entries(snapshot.positions || {}).forEach(([key, position]) => {
        const originalId = position.original_id || key;
        
        if (!positionMap.has(originalId)) {
          positionMap.set(originalId, {
            original_id: originalId,
            [dateKey]: position
          });
        } else {
          positionMap.get(originalId)[dateKey] = position;
        }
      });
    };

    processPositions(snapshot1, 'pos1');
    processPositions(snapshot2, 'pos2');

    // Process all positions
    const processedPositions = [];
    positionMap.forEach((data, originalId) => {
      const pos1 = data.pos1;
      const pos2 = data.pos2;
      const position = pos1 || pos2;

      // Apply filters
      if (!filters.selectedAssetTypes.has(position.asset_type)) return;
      if (!filters.selectedAccounts.has(position.account_id.toString())) return;

      const processed = {
        original_id: originalId,
        identifier: pos2?.identifier || pos1?.identifier,
        name: pos2?.name || pos1?.name,
        account_name: pos2?.account_name || pos1?.account_name,
        asset_type: position.asset_type,
        sector: position.sector,
        value1: pos1?.current_value || 0,
        value2: pos2?.current_value || 0,
        quantity1: pos1?.quantity || 0,
        quantity2: pos2?.quantity || 0,
        price1: pos1?.current_price || 0,
        price2: pos2?.current_price || 0,
        isNew: !pos1 && pos2,
        isSold: pos1 && !pos2,
        valueDelta: (pos2?.current_value || 0) - (pos1?.current_value || 0),
        valueChangePercent: pos1?.current_value > 0 
          ? ((pos2?.current_value || 0) - pos1.current_value) / pos1.current_value * 100
          : (pos2?.current_value > 0 ? 100 : 0)
      };

      processedPositions.push(processed);
    });

    return processedPositions
      .filter(p => p.valueDelta !== 0 || p.isNew || p.isSold)
      .sort((a, b) => Math.abs(b.valueDelta) - Math.abs(a.valueDelta));
  }, [snapshots, compareOptions, filters]);

  // Grouped comparison data
  const groupedComparisonData = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return [];

    const groups = new Map();

    comparisonData.forEach(position => {
      const groupKey = filters.groupBy === 'asset' ? position.asset_type : position.sector || 'Unknown';
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          name: groupKey,
          value1: 0,
          value2: 0,
          valueDelta: 0,
          positions: []
        });
      }

      const group = groups.get(groupKey);
      group.value1 += position.value1;
      group.value2 += position.value2;
      group.valueDelta += position.valueDelta;
      group.positions.push(position);
    });

    return Array.from(groups.values()).map(group => ({
      ...group,
      valueChangePercent: group.value1 > 0 
        ? (group.valueDelta / group.value1) * 100 
        : (group.value2 > 0 ? 100 : 0),
      positions: group.positions.sort((a, b) => Math.abs(b.valueDelta) - Math.abs(a.valueDelta))
    })).sort((a, b) => b.value2 - a.value2);
  }, [comparisonData, filters.groupBy]);

  // Reconciliation data
  const reconciliationData = useMemo(() => {
    if (!groupedPositions || groupedPositions.length === 0 || !snapshots) return [];

    const latestDate = snapshots.dates?.[snapshots.dates.length - 1];
    const latestSnapshot = snapshots.byDate?.[latestDate];
    
    if (!latestSnapshot) return [];

    const reconMap = new Map();

    // Add all grouped positions (current unified view)
    groupedPositions.forEach(pos => {
      const key = pos.original_id || `${pos.assetType}|${pos.identifier}|${pos.accounts[0]?.accountId}`;
      
      // Apply filters
      if (!filters.selectedAssetTypes.has(pos.assetType)) return;
      
      reconMap.set(key, {
        key,
        original_id: pos.original_id,
        identifier: pos.identifier,
        name: pos.name,
        account_name: pos.accounts[0]?.accountName,
        asset_type: pos.assetType,
        unifiedValue: pos.totalValue || 0,
        unifiedQuantity: pos.totalQuantity || 0,
        unifiedPrice: pos.currentPrice || 0,
        snapshotValue: 0,
        snapshotQuantity: 0,
        snapshotPrice: 0,
        status: 'unified_only'
      });
    });

    // Match with snapshot positions
    Object.entries(latestSnapshot.positions).forEach(([key, pos]) => {
      const originalId = pos.original_id || key;
      
      if (reconMap.has(originalId)) {
        const item = reconMap.get(originalId);
        item.snapshotValue = pos.current_value;
        item.snapshotQuantity = pos.quantity;
        item.snapshotPrice = pos.current_price;
        item.status = 'matched';
        item.valueDelta = item.unifiedValue - item.snapshotValue;
        item.valueChangePercent = item.snapshotValue > 0 
          ? (item.valueDelta / item.snapshotValue) * 100 : 0;
      } else {
        // Position exists in snapshot but not in unified
        if (!filters.selectedAssetTypes.has(pos.asset_type)) return;
        if (!filters.selectedAccounts.has(pos.account_id.toString())) return;

        reconMap.set(originalId, {
          key: originalId,
          original_id: originalId,
          identifier: pos.identifier,
          name: pos.name,
          account_name: pos.account_name,
          asset_type: pos.asset_type,
          unifiedValue: 0,
          unifiedQuantity: 0,
          unifiedPrice: 0,
          snapshotValue: pos.current_value,
          snapshotQuantity: pos.quantity,
          snapshotPrice: pos.current_price,
          valueDelta: -pos.current_value,
          valueChangePercent: -100,
          status: 'snapshot_only'
        });
      }
    });

    return Array.from(reconMap.values())
      .filter(item => Math.abs(item.valueDelta || 0) > 0.01 || item.status !== 'matched')
      .sort((a, b) => Math.abs(b.valueDelta || 0) - Math.abs(a.valueDelta || 0));
  }, [groupedPositions, snapshots, filters]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setShowFilters(!showFilters);
            break;
          case 'r':
            e.preventDefault();
            refreshAllData();
            break;
          case '1':
            e.preventDefault();
            setActiveSection('overview');
            break;
          case '2':
            e.preventDefault();
            setActiveSection('trends');
            break;
          case '3':
            e.preventDefault();
            setActiveSection('comparison');
            break;
          case '4':
            e.preventDefault();
            setActiveSection('reconciliation');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showFilters, refreshAllData]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  if (isLoading && !portfolioSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border-4 border-purple-500 border-t-transparent"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full border-4 border-cyan-500 border-t-transparent"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Command Center</h2>
          <p className="text-gray-400">Analyzing your portfolio...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="bg-red-500/20 rounded-full p-6 mx-auto w-24 h-24 flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Data</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshAllData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Portfolio Command Center - NestEgg</title>
        <meta name="description" content="Comprehensive portfolio analytics and insights" />
      </Head>

      <motion.div
        initial="initial"
        animate="animate"
        variants={pageVariants}
        className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4"
      >
        {/* Header */}
        <motion.header
          variants={itemVariants}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Portfolio Command Center</h1>
              <p className="text-gray-400">
                Last updated: {portfolioSummary?.timestamp ? new Date(portfolioSummary.timestamp).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filters
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshAllData}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Section Tabs */}
        <motion.div
          variants={itemVariants}
          className="flex gap-4 mb-8 overflow-x-auto pb-2"
        >
          {['overview', 'trends', 'comparison', 'reconciliation'].map((section) => (
            <motion.button
              key={section}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveSection(section)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeSection === section
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </motion.button>
          ))}
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && overviewData && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <OverviewCard data={overviewData} />
              
              {riskMetrics && (
                <PerformanceMetricsCard data={riskMetrics} />
              )}
              
              {/* Asset Allocation Chart */}
              <motion.div
                variants={itemVariants}
                whileHover="hover"
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
              >
                <h3 className="text-xl font-bold text-white mb-4">Asset Allocation</h3>
                {assetPerformance && assetPerformance.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={assetPerformance}
                        dataKey="currentValue"
                        nameKey="assetType"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.assetType}: ${formatCurrency(entry.currentValue, true)}`}
                      >
                        {assetPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colors.asset[entry.assetType.toLowerCase()] || colors.asset.other} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Sector Allocation */}
              {sectorAllocation && sectorAllocation.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  whileHover="hover"
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
                >
                  <h3 className="text-xl font-bold text-white mb-4">Sector Allocation</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sectorAllocation.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="sector" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#9CA3AF" tickFormatter={(value) => formatCurrency(value, true)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Period Performance */}
              <motion.div
                variants={itemVariants}
                whileHover="hover"
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl lg:col-span-2"
              >
                <h3 className="text-xl font-bold text-white mb-4">Period Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(overviewData.periodChanges).map(([period, data]) => (
                    <div key={period} className="text-center">
                      <p className="text-gray-400 text-sm mb-1">{period.toUpperCase()}</p>
                      <p className={`text-lg font-bold ${data.percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercentage(data.percent)}
                      </p>
                      <p className="text-sm text-gray-500">{formatCurrency(data.value, true)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Top Positions */}
              {topPositions && topPositions.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  whileHover="hover"
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl lg:col-span-2"
                >
                  <h3 className="text-xl font-bold text-white mb-4">Top Positions</h3>
                  <div className="space-y-3">
                    {topPositions.slice(0, 5).map((position, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{position.identifier}</p>
                          <p className="text-sm text-gray-400">{position.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">{formatCurrency(position.value)}</p>
                          <p className={`text-sm ${position.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatPercentage(position.gainLossPercent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeSection === 'trends' && timeSeriesData && (
            <motion.div
              key="trends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Date Range Selector */}
              <div className="flex gap-2">
                {['30d', '90d', '180d', '365d', 'all'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setFilters(prev => ({ ...prev, dateRange: range }))}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      filters.dateRange === range
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Main Chart */}
              <motion.div
                variants={itemVariants}
                whileHover="hover"
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
              >
                <h3 className="text-xl font-bold text-white mb-4">Portfolio Value Over Time</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={timeSeriesData.totals}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tickFormatter={(date) => formatDate(date)}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      domain={timeSeriesData.yDomain}
                      tickFormatter={(value) => formatCurrency(value, true)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      labelFormatter={(date) => formatDate(date, 'long')}
                      formatter={(value, name) => [
                        formatCurrency(value),
                        name === 'value' ? 'Net Worth' : name
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Asset Breakdown Chart */}
              <motion.div
                variants={itemVariants}
                whileHover="hover"
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
              >
                <h3 className="text-xl font-bold text-white mb-4">Assets vs Liabilities</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={timeSeriesData.totals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tickFormatter={(date) => formatDate(date)}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => formatCurrency(value, true)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      labelFormatter={(date) => formatDate(date, 'long')}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Bar dataKey="assets" fill="#10b981" />
                    <Bar dataKey="liabilities" fill="#ef4444" />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Performance Metrics Over Time */}
              <motion.div
                variants={itemVariants}
                whileHover="hover"
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
              >
                <h3 className="text-xl font-bold text-white mb-4">Unrealized Gains Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData.totals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tickFormatter={(date) => formatDate(date)}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#9CA3AF"
                      tickFormatter={(value) => formatCurrency(value, true)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#9CA3AF"
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      labelFormatter={(date) => formatDate(date, 'long')}
                      formatter={(value, name) => [
                        name === 'unrealizedGainPercent' ? `${value.toFixed(2)}%` : formatCurrency(value),
                        name === 'unrealizedGain' ? 'Gain/Loss' : 'Gain/Loss %'
                      ]}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="unrealizedGain" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="unrealizedGainPercent" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </motion.div>
          )}

          {activeSection === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Date Selection */}
              <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                <label className="text-white">Compare:</label>
                <input
                  type="date"
                  value={compareOptions.date1 || ''}
                  onChange={(e) => setCompareOptions(prev => ({ ...prev, date1: e.target.value }))}
                  className="bg-gray-700 text-white rounded px-3 py-2"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={compareOptions.date2 || ''}
                  onChange={(e) => setCompareOptions(prev => ({ ...prev, date2: e.target.value }))}
                  className="bg-gray-700 text-white rounded px-3 py-2"
                />
                <button
                  onClick={() => setFilters(prev => ({ ...prev, groupBy: filters.groupBy === 'asset' ? 'sector' : 'asset' }))}
                  className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Group by: {filters.groupBy === 'asset' ? 'Asset Type' : 'Sector'}
                </button>
              </div>

              {/* Summary Stats */}
              {groupedComparisonData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Value Start</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(groupedComparisonData.reduce((sum, g) => sum + g.value1, 0))}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Value End</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(groupedComparisonData.reduce((sum, g) => sum + g.value2, 0))}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Total Change</p>
                    <p className={`text-2xl font-bold ${
                      groupedComparisonData.reduce((sum, g) => sum + g.valueDelta, 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(groupedComparisonData.reduce((sum, g) => sum + g.valueDelta, 0))}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Change %</p>
                    <p className={`text-2xl font-bold ${
                      ((groupedComparisonData.reduce((sum, g) => sum + g.valueDelta, 0) / 
                        groupedComparisonData.reduce((sum, g) => sum + g.value1, 0)) * 100) >= 0 
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercentage(
                        (groupedComparisonData.reduce((sum, g) => sum + g.valueDelta, 0) / 
                         groupedComparisonData.reduce((sum, g) => sum + g.value1, 0)) * 100
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Comparison Results */}
              {groupedComparisonData.map((group) => (
                <motion.div
                  key={group.key}
                  variants={itemVariants}
                  whileHover="hover"
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{group.name}</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">{formatCurrency(group.value1)}</span>
                      <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="text-white font-bold">{formatCurrency(group.value2)}</span>
                      <span className={`ml-2 ${group.valueDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(group.valueDelta, true)} ({formatPercentage(group.valueChangePercent)})
                      </span>
                    </div>
                  </div>

                  {expandedGroups.has(group.key) && (
                    <div className="space-y-2">
                      {group.positions.map((position) => (
                        <div key={position.original_id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{position.identifier}</p>
                            <p className="text-sm text-gray-400">{position.name}</p>
                            {position.accountChanged && (
                              <p className="text-xs text-yellow-400">
                                Account: {position.previousAccountName} → {position.account_name}
                              </p>
                            )}
                            {position.isNew && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">NEW</span>
                            )}
                            {position.isSold && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">SOLD</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-400">{formatCurrency(position.value1)}</p>
                              <p className="text-xs text-gray-500">{position.quantity1} @ {formatCurrency(position.price1)}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <div className="text-right">
                              <p className="text-sm text-white">{formatCurrency(position.value2)}</p>
                              <p className="text-xs text-gray-500">{position.quantity2} @ {formatCurrency(position.price2)}</p>
                            </div>
                            <span className={`ml-2 ${position.valueDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(position.valueChangePercent)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedGroups(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(group.key)) {
                        newSet.delete(group.key);
                      } else {
                        newSet.add(group.key);
                      }
                      return newSet;
                    })}
                    className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm"
                  >
                    {expandedGroups.has(group.key) ? 'Show Less' : `Show ${group.positions.length} Positions`}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeSection === 'reconciliation' && (
            <motion.div
              key="reconciliation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                <p className="text-yellow-400">
                  Showing differences between current positions and latest snapshot. 
                  Items shown need reconciliation.
                </p>
              </div>

              {reconciliationData.length === 0 ? (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-8 text-center">
                  <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-bold text-green-400 mb-2">All Positions Reconciled</h3>
                  <p className="text-gray-400">Your positions are in sync with the latest snapshot.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                      <p className="text-blue-400 text-sm">Positions Only in Current</p>
                      <p className="text-2xl font-bold text-white">
                        {reconciliationData.filter(item => item.status === 'unified_only').length}
                      </p>
                    </div>
                    <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                      <p className="text-orange-400 text-sm">Positions Only in Snapshot</p>
                      <p className="text-2xl font-bold text-white">
                        {reconciliationData.filter(item => item.status === 'snapshot_only').length}
                      </p>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                      <p className="text-yellow-400 text-sm">Value Mismatches</p>
                      <p className="text-2xl font-bold text-white">
                        {reconciliationData.filter(item => item.status === 'matched' && Math.abs(item.valueDelta) > 0.01).length}
                      </p>
                    </div>
                  </div>

                  {/* Reconciliation Items */}
                  {reconciliationData.map((item) => (
                    <motion.div
                      key={item.key}
                      variants={itemVariants}
                      whileHover="hover"
                      className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border ${
                        item.status === 'unified_only' ? 'border-blue-500' : 
                        item.status === 'snapshot_only' ? 'border-orange-500' : 'border-yellow-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-white text-lg">{item.identifier}</p>
                            {item.status === 'unified_only' && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">CURRENT ONLY</span>
                            )}
                            {item.status === 'snapshot_only' && (
                              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">SNAPSHOT ONLY</span>
                            )}
                            {item.status === 'matched' && Math.abs(item.valueDelta) > 0.01 && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">MISMATCH</span>
                            )}
                          </div>
                          <p className="text-gray-400">{item.name}</p>
                          <p className="text-sm text-gray-500 mt-1">{item.account_name}</p>
                        </div>
                        <div className="text-right">
                          <div className="mb-2">
                            <p className="text-sm text-gray-400">Current</p>
                            <p className="text-white font-bold">{formatCurrency(item.unifiedValue)}</p>
                            <p className="text-xs text-gray-500">
                              {item.unifiedQuantity} @ {formatCurrency(item.unifiedPrice)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Snapshot</p>
                            <p className="text-white font-bold">{formatCurrency(item.snapshotValue)}</p>
                            <p className="text-xs text-gray-500">
                              {item.snapshotQuantity} @ {formatCurrency(item.snapshotPrice)}
                            </p>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <p className={`font-bold ${item.valueDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(item.valueDelta)} ({formatPercentage(item.valueChangePercent)})
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="fixed right-0 top-0 h-full w-80 bg-gray-900 shadow-2xl p-6 overflow-y-auto z-50"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Asset Type Filter */}
              <div className="mb-6">
                <label className="block text-gray-400 mb-2">Asset Types</label>
                <div className="space-y-2">
                  {['security', 'crypto', 'cash', 'metal', 'realestate'].map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.selectedAssetTypes.has(type)}
                        onChange={(e) => {
                          const newTypes = new Set(filters.selectedAssetTypes);
                          if (e.target.checked) {
                            newTypes.add(type);
                          } else {
                            newTypes.delete(type);
                          }
                          setFilters(prev => ({ ...prev, selectedAssetTypes: newTypes }));
                        }}
                        className="mr-2"
                      />
                      <span className="text-white capitalize">{type}</span>
                    </label>
                  ))}
                </div>
                </div>

             {/* Account Filter */}
             <div className="mb-6">
               <label className="block text-gray-400 mb-2">Accounts</label>
               <div className="space-y-2 max-h-60 overflow-y-auto">
                 {accounts.map((account) => (
                   <label key={account.id} className="flex items-center">
                     <input
                       type="checkbox"
                       checked={filters.selectedAccounts.has(account.id.toString())}
                       onChange={(e) => {
                         const newAccounts = new Set(filters.selectedAccounts);
                         if (e.target.checked) {
                           newAccounts.add(account.id.toString());
                         } else {
                           newAccounts.delete(account.id.toString());
                         }
                         setFilters(prev => ({ ...prev, selectedAccounts: newAccounts }));
                       }}
                       className="mr-2"
                     />
                     <span className="text-white text-sm">{account.name}</span>
                   </label>
                 ))}
               </div>
             </div>

             {/* Group By */}
             <div className="mb-6">
               <label className="block text-gray-400 mb-2">Group By</label>
               <select
                 value={filters.groupBy}
                 onChange={(e) => setFilters(prev => ({ ...prev, groupBy: e.target.value }))}
                 className="w-full bg-gray-800 text-white rounded px-3 py-2"
               >
                 <option value="asset">Asset Type</option>
                 <option value="sector">Sector</option>
               </select>
             </div>

             {/* Search */}
             <div className="mb-6">
               <label className="block text-gray-400 mb-2">Search</label>
               <input
                 type="text"
                 value={filters.searchTerm}
                 onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                 placeholder="Search positions..."
                 className="w-full bg-gray-800 text-white rounded px-3 py-2"
               />
             </div>

             {/* Reset Filters */}
             <button
               onClick={() => {
                 setFilters({
                   dateRange: '30d',
                   selectedAccounts: new Set(accounts.map(acc => acc.id.toString())),
                   selectedAssetTypes: new Set(['security', 'crypto', 'cash', 'metal', 'realestate']),
                   groupBy: 'asset',
                   searchTerm: ''
                 });
               }}
               className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
             >
               Reset Filters
             </button>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Keyboard Shortcuts Modal */}
       <AnimatePresence>
         {false && ( // Set to true to show keyboard shortcuts
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
           >
             <motion.div
               initial={{ scale: 0.9 }}
               animate={{ scale: 1 }}
               exit={{ scale: 0.9 }}
               className="bg-gray-800 rounded-lg p-6 max-w-md"
             >
               <h3 className="text-xl font-bold text-white mb-4">Keyboard Shortcuts</h3>
               <div className="space-y-2">
                 <div className="flex justify-between">
                   <span className="text-gray-400">Toggle Filters</span>
                   <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Ctrl/⌘ + K</kbd>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">Refresh Data</span>
                   <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Ctrl/⌘ + R</kbd>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">Overview</span>
                   <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Ctrl/⌘ + 1</kbd>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">Trends</span>
                   <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Ctrl/⌘ + 2</kbd>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">Comparison</span>
                   <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Ctrl/⌘ + 3</kbd>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">Reconciliation</span>
                   <kbd className="bg-gray-700 px-2 py-1 rounded text-sm">Ctrl/⌘ + 4</kbd>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </motion.div>
   </>
 );
}