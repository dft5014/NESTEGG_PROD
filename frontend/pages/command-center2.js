// pages/portfolio-command-center.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// DataStore-powered (no direct API calls here)
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';


import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, ComposedChart, ReferenceLine, Brush, ScatterChart, Scatter,
  FunnelChart, Funnel, LabelList, Sector, RadialBarChart, RadialBar
} from 'recharts';

// Custom hooks for data management
// DataStore-native loader that preserves the exact shape your UI expects
const usePortfolioData = () => {
  const { state, actions } = useDataStore();

  // Accounts for filter chips
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();

  // Latest detailed positions → will serve as our "unifiedPositions"
  const { positions: latestPositions, loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();

  const [error, setError] = useState(null);
  const [dataAge, setDataAge] = useState(null);

  // Kick loads (snapshots for history/compare, accounts for filters, latest positions for recon)
  useEffect(() => {
    try {
      actions.fetchSnapshotsData?.(365);
      if (!accounts?.length && !accountsLoading) refreshAccounts?.();
      if (!latestPositions?.length && !positionsLoading) refreshPositions?.();
    } catch (e) {
      setError(e?.message || 'Failed initializing data');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assemble snapshots into the same shape your UI uses:
  //   rawData = { summary: { dates, accounts }, snapshots_by_date: { [date]: { ... , positions: {...} } } }
  const snapshotsByDateNormalized = useMemo(() => {
    const src = state.snapshots?.byDate || {};
    const out = {};
    for (const [date, snap] of Object.entries(src)) {
      const newPositions = {};
      const srcPositions = snap?.positions || {};
      for (const [k, pos] of Object.entries(srcPositions)) {
        // Ensure `asset_type` exists (your UI reads position.asset_type)
        newPositions[k] = { ...pos, asset_type: pos.asset_type || pos.item_type };
      }
      out[date] = { ...snap, positions: newPositions };
    }
    return out;
  }, [state.snapshots?.byDate]);

  const rawData = useMemo(() => {
    if (!state.snapshots?.dates?.length) return null;
    return {
      summary: {
        dates: state.snapshots.dates,
        accounts: (accounts || []).map(a => ({ id: a.id, name: a.name }))
      },
      snapshots_by_date: snapshotsByDateNormalized
    };
  }, [state.snapshots?.dates, snapshotsByDateNormalized, accounts]);

  // Map latest detailed positions into the structure your recon/compare code expects as "unifiedPositions"
  const unifiedPositions = useMemo(() => {
    const rows = Array.isArray(latestPositions) ? latestPositions : [];
    return rows.map(p => ({
      // keys used across the file
      original_id: p.unifiedId || p.id,
      asset_type: (p.assetType || p.item_type || '').toLowerCase(),
      ticker: p.identifier,
      identifier: p.identifier,
      name: p.name,
      account_id: p.accountId,
      account_name: p.accountName,
      institution: p.institution,

      // numeric fields consumed by reconciliation/summary bits
      current_value: p.currentValue ?? 0,
      quantity: p.quantity ?? 0,
      current_price: p.currentPrice ?? 0
    }));
  }, [latestPositions]);

  // Loading state mirrors your previous hook’s purpose
  const isLoading =
    state.snapshots?.loading ||
    accountsLoading ||
    positionsLoading ||
    !state.snapshots?.dates?.length;

  // “Refetch” button compatibility
  const refetch = useCallback((days = 365) => {
    actions.fetchSnapshotsData?.(days, true);
    refreshAccounts?.(true);
    refreshPositions?.(true);
    setDataAge(new Date());
  }, [actions, refreshAccounts, refreshPositions]);

  // Track last fetched for display
  useEffect(() => {
    if (state.snapshots?.lastFetched) {
      setDataAge(new Date(state.snapshots.lastFetched));
    }
  }, [state.snapshots?.lastFetched]);

  return { rawData, unifiedPositions, isLoading, error, dataAge, refetch };
};


// Advanced animation variants
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

// Enhanced metric card with more features
const MetricCard = ({ title, value, change, trend, icon, color, format = 'currency', subtitle, sparklineColor, onClick }) => {
  const isPositive = change >= 0;
  const controls = useAnimation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      whileHover="hover"
      onHoverStart={() => {
        controls.start({ scale: 1.05 });
        setIsHovered(true);
      }}
      onHoverEnd={() => {
        controls.start({ scale: 1 });
        setIsHovered(false);
      }}
      onClick={onClick}
      className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 overflow-hidden group cursor-pointer"
    >
      {/* Animated background gradient */}
      <motion.div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${isHovered ? '50%' : '100%'} 50%, ${color.split(' ')[1].split('-')[1]}, transparent)`
        }}
      />
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
        <motion.div 
          animate={{ rotate: isHovered ? 360 : 0 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={`w-full h-full rounded-full opacity-10 bg-gradient-to-br ${color}`} 
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
            {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold text-white">
                <AnimatedNumber value={value} format={format} decimals={format === 'currency' ? 2 : 0} />
              </h3>
              {change !== undefined && (
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-sm font-medium flex items-center ${
                    isPositive ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  <motion.span
                    animate={{ y: isPositive ? [-2, 0] : [2, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                  >
                    {isPositive ? '↑' : '↓'}
                  </motion.span>
                  {formatPercentage(Math.abs(change), false)}
                </motion.span>
              )}
            </div>
          </div>
          <motion.div 
            animate={controls}
            className={`p-3 rounded-xl bg-gradient-to-br ${color} opacity-20 group-hover:opacity-30 transition-opacity`}
          >
            {icon}
          </motion.div>
        </div>
        
        {/* Enhanced sparkline with gradient */}
        {trend && trend.length > 0 && (
          <div className="h-12 -mx-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${title.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparklineColor || (isPositive ? colors.performance.positive : colors.performance.negative)} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={sparklineColor || (isPositive ? colors.performance.positive : colors.performance.negative)} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor || (isPositive ? colors.performance.positive : colors.performance.negative)}
                  fill={`url(#gradient-${title.replace(/\s/g, '-')})`}
                  strokeWidth={2}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced tooltip with animations
const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl"
    >
      <p className="text-gray-400 text-sm font-medium mb-2">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300 text-sm">{entry.name}:</span>
          </div>
          <span className="text-white font-medium text-sm">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
};

// Advanced filter panel
const FilterPanel = ({ filters, onChange, accounts, assetTypes }) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => onChange({ ...filters, dateRange: e.target.value })}
            className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="ytd">Year to Date</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Account Filter */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Accounts</label>
          <div className="mt-1 relative">
            <button className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-600 transition-colors">
              <span>{filters.selectedAccounts.size === accounts.length ? 'All Accounts' : `${filters.selectedAccounts.size} Selected`}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Asset Type Filter */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Asset Types</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {assetTypes.map(type => (
              <button
                key={type}
                onClick={() => {
                  const newSelected = new Set(filters.selectedAssetTypes);
                  if (newSelected.has(type)) {
                    newSelected.delete(type);
                  } else {
                    newSelected.add(type);
                  }
                  onChange({ ...filters, selectedAssetTypes: newSelected });
                }}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  filters.selectedAssetTypes.has(type)
                    ? 'text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
                style={{
                  backgroundColor: filters.selectedAssetTypes.has(type) ? colors.asset[type] : undefined
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Group By</label>
          <div className="mt-1 flex gap-2">
            {['asset', 'account', 'sector'].map(mode => (
              <button
                key={mode}
                onClick={() => onChange({ ...filters, groupBy: mode })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filters.groupBy === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// New component for risk metrics
const RiskMetricsCard = ({ data }) => {
  const calculateSharpeRatio = (returns) => {
    if (!returns || returns.length < 2) return 0;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252);
  };

  const calculateVolatility = (returns) => {
    if (!returns || returns.length < 2) return 0;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    return Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) * Math.sqrt(252) * 100;
  };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-500/20"
    >
      <h3 className="text-xl font-bold text-white mb-4">Risk Analytics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 text-sm">Volatility (Annual)</p>
          <p className="text-2xl font-bold text-white">{calculateVolatility(data.returns).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Sharpe Ratio</p>
          <p className="text-2xl font-bold text-white">{calculateSharpeRatio(data.returns).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Max Drawdown</p>
          <p className="text-2xl font-bold text-red-400">{data.maxDrawdown ? formatPercentage(data.maxDrawdown) : '-'}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Beta</p>
          <p className="text-2xl font-bold text-white">{data.beta ? data.beta.toFixed(2) : '-'}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Main Portfolio Command Center Component
export default function PortfolioCommandCenter() {
  const router = useRouter();
  const { rawData, unifiedPositions, isLoading, error, dataAge, refetch } = usePortfolioData();
  
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
  const [viewMode, setViewMode] = useState('grid'); // grid, table, chart
  const [theme, setTheme] = useState('dark');
  const [selectedMetric, setSelectedMetric] = useState('value'); // for chart display

  // Initialize dates when data loads
  useEffect(() => {
    if (rawData?.summary?.dates?.length > 0) {
      const dates = rawData.summary.dates;
      setCompareOptions({
        date1: dates[0],
        date2: dates[dates.length - 1],
        showDifference: true
      });
      
      // Initialize account filter
      if (rawData.summary.accounts) {
        setFilters(prev => ({
          ...prev,
          selectedAccounts: new Set(rawData.summary.accounts.map(acc => acc.id.toString()))
        }));
      }
    }
  }, [rawData]);

  // Enhanced overview data with more metrics
  const overviewData = useMemo(() => {
    if (!rawData || !rawData.snapshots_by_date) return null;

    const dates = rawData.summary.dates;
    const latestDate = dates[dates.length - 1];
    const latestSnapshot = rawData.snapshots_by_date[latestDate];
    
    if (!latestSnapshot) return null;

    // Calculate various time period changes
    const periods = {
      day: dates[dates.length - 2],
      week: dates[Math.max(0, dates.length - 7)],
      month: dates[Math.max(0, dates.length - 30)],
      quarter: dates[Math.max(0, dates.length - 90)],
      year: dates[Math.max(0, dates.length - 365)]
    };

    const periodChanges = {};
    Object.entries(periods).forEach(([period, date]) => {
      if (date && rawData.snapshots_by_date[date]) {
        const snapshot = rawData.snapshots_by_date[date];
        periodChanges[period] = {
          value: ((latestSnapshot.total_value - snapshot.total_value) / snapshot.total_value) * 100,
          absolute: latestSnapshot.total_value - snapshot.total_value
        };
      }
    });

    // Calculate daily returns for risk metrics
    const returns = [];
    for (let i = 1; i < dates.length; i++) {
      const current = rawData.snapshots_by_date[dates[i]]?.total_value;
      const previous = rawData.snapshots_by_date[dates[i-1]]?.total_value;
      if (current && previous && previous > 0) {
        returns.push((current - previous) / previous);
      }
    }

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = latestSnapshot.total_value;
    dates.forEach(date => {
      const value = rawData.snapshots_by_date[date]?.total_value || 0;
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Generate trend data
    const trendData = dates.slice(-30).map(date => ({
      date,
      value: rawData.snapshots_by_date[date]?.total_value || 0,
      gainLoss: rawData.snapshots_by_date[date]?.total_gain_loss || 0,
      dayChange: 0
    }));

    // Calculate day-over-day changes
    for (let i = 1; i < trendData.length; i++) {
      trendData[i].dayChange = trendData[i].value - trendData[i-1].value;
    }

    // Asset allocation with more detail
    const assetAllocation = {};
    const sectorAllocation = {};
    const accountAllocation = {};
    let totalDividends = 0;
    
    Object.values(latestSnapshot.positions).forEach(position => {
      // Asset type allocation
      const type = position.asset_type;
      if (!assetAllocation[type]) {
        assetAllocation[type] = { value: 0, count: 0, gainLoss: 0 };
      }
      assetAllocation[type].value += position.current_value;
      assetAllocation[type].count += 1;
      assetAllocation[type].gainLoss += position.gain_loss_amt || 0;

      // Sector allocation
      if (position.sector) {
        if (!sectorAllocation[position.sector]) {
          sectorAllocation[position.sector] = { value: 0, count: 0 };
        }
        sectorAllocation[position.sector].value += position.current_value;
        sectorAllocation[position.sector].count += 1;
      }

      // Account allocation
      if (!accountAllocation[position.account_name]) {
        accountAllocation[position.account_name] = { value: 0, count: 0 };
      }
      accountAllocation[position.account_name].value += position.current_value;
      accountAllocation[position.account_name].count += 1;

      // Sum dividends
      totalDividends += position.annual_income || 0;
    });

    // Calculate concentration risk
    const positions = Object.values(latestSnapshot.positions).sort((a, b) => b.current_value - a.current_value);
    const top5Concentration = positions.slice(0, 5).reduce((sum, pos) => sum + pos.current_value, 0) / latestSnapshot.total_value;

    return {
      totalValue: latestSnapshot.total_value,
      totalCostBasis: latestSnapshot.total_cost_basis,
      totalGainLoss: latestSnapshot.total_gain_loss,
      totalGainLossPercent: (latestSnapshot.total_gain_loss / latestSnapshot.total_cost_basis) * 100,
      totalIncome: latestSnapshot.total_income,
      totalDividends,
      positionCount: latestSnapshot.position_count,
      periodChanges,
      trendData,
      assetAllocation,
      sectorAllocation,
      accountAllocation,
      topPositions: positions.slice(0, 10),
      returns,
      maxDrawdown: maxDrawdown * 100,
      top5Concentration: top5Concentration * 100,
      dailyChange: periodChanges.day || { value: 0, absolute: 0 }
    };
  }, [rawData]);

  // Process trend data with filters and auto-scaling
  const trendData = useMemo(() => {
    if (!rawData) return { dates: [], series: [], totals: [], yDomain: [0, 100] };

    // Apply date range filter
    let dates = [...rawData.summary.dates];
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (filters.dateRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ytd':
        cutoffDate.setMonth(0, 1);
        break;
      default:
        // all time - no filter
    }

    if (filters.dateRange !== 'all') {
      dates = dates.filter(date => new Date(date) >= cutoffDate);
    }

    // Process data by grouping
    const series = {};
    const totals = [];
    let minValue = Infinity;
    let maxValue = -Infinity;

    dates.forEach(date => {
      const snapshot = rawData.snapshots_by_date[date];
      if (!snapshot) return;

      let dateTotal = 0;
      const groups = {};

      Object.values(snapshot.positions).forEach(position => {
        // Apply filters
        if (!filters.selectedAssetTypes.has(position.asset_type)) return;
        if (!filters.selectedAccounts.has(position.account_id.toString())) return;

        const groupKey = filters.groupBy === 'asset' ? position.asset_type :
                        filters.groupBy === 'account' ? position.account_name :
                        position.sector || 'Unknown';

        if (!groups[groupKey]) {
          groups[groupKey] = 0;
        }
        groups[groupKey] += position.current_value;
        dateTotal += position.current_value;
      });

      // Add to series
      Object.entries(groups).forEach(([key, value]) => {
        if (!series[key]) {
          series[key] = [];
        }
        series[key].push({ date, value });
      });

      totals.push({ 
        date, 
        value: dateTotal,
        gainLoss: snapshot.total_gain_loss,
        gainLossPercent: snapshot.total_cost_basis > 0 ? (snapshot.total_gain_loss / snapshot.total_cost_basis) * 100 : 0
      });

      // Track min/max for auto-scaling
      if (dateTotal < minValue) minValue = dateTotal;
      if (dateTotal > maxValue) maxValue = dateTotal;
    });

    // Calculate y-axis domain with padding
    const padding = (maxValue - minValue) * 0.1;
    const yDomain = [Math.max(0, minValue - padding), maxValue + padding];

    return { dates, series, totals, yDomain };
  }, [rawData, filters]);

  // Enhanced comparison data with original_id mapping
  const comparisonData = useMemo(() => {
    if (!rawData || !compareOptions.date1 || !compareOptions.date2) return [];

    const snapshot1 = rawData.snapshots_by_date[compareOptions.date1];
    const snapshot2 = rawData.snapshots_by_date[compareOptions.date2];
    
    if (!snapshot1 || !snapshot2) return [];

    const positionMap = new Map();

    // Create a map using original_id as the key
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
        identifierChanged: pos1 && pos2 && pos1.identifier !== pos2.identifier,
        accountChanged: pos1 && pos2 && pos1.account_name !== pos2.account_name,
        previousIdentifier: pos1?.identifier,
        previousAccountName: pos1?.account_name
      };

      processed.valueDelta = processed.value2 - processed.value1;
      processed.valueChangePercent = processed.value1 > 0 
        ? (processed.valueDelta / processed.value1) * 100 
        : (processed.value2 > 0 ? 100 : 0);

      processedPositions.push(processed);
    });

    // Group by selected grouping
    const grouped = {};
    processedPositions.forEach(position => {
      const groupKey = filters.groupBy === 'asset' ? position.asset_type :
                      filters.groupBy === 'account' ? position.account_name :
                      position.sector || 'Unknown';

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          key: groupKey,
          name: groupKey,
          positions: [],
          value1: 0,
          value2: 0,
          valueDelta: 0
        };
      }

      grouped[groupKey].positions.push(position);
      grouped[groupKey].value1 += position.value1;
      grouped[groupKey].value2 += position.value2;
      grouped[groupKey].valueDelta += position.valueDelta;
    });

    // Calculate percentages and sort
    return Object.values(grouped).map(group => ({
      ...group,
      valueChangePercent: group.value1 > 0 
        ? (group.valueDelta / group.value1) * 100 
        : (group.value2 > 0 ? 100 : 0),
      positions: group.positions.sort((a, b) => Math.abs(b.valueDelta) - Math.abs(a.valueDelta))
    })).sort((a, b) => b.value2 - a.value2);
  }, [rawData, compareOptions, filters]);

  // Enhanced reconciliation data
  const reconciliationData = useMemo(() => {
    if (!unifiedPositions || unifiedPositions.length === 0 || !rawData) return [];

    const latestDate = rawData.summary.dates[rawData.summary.dates.length - 1];
    const latestSnapshot = rawData.snapshots_by_date[latestDate];
    
    if (!latestSnapshot) return [];

    const reconMap = new Map();

    // Add all unified positions
    unifiedPositions.forEach(pos => {
      const key = pos.original_id || `${pos.asset_type}|${pos.ticker || pos.identifier}|${pos.account_id}`;
      
      // Apply filters
      if (!filters.selectedAssetTypes.has(pos.asset_type)) return;
      if (!filters.selectedAccounts.has(pos.account_id.toString())) return;

      reconMap.set(key, {
        key,
        original_id: pos.original_id,
        identifier: pos.ticker || pos.identifier,
        name: pos.name,
        account_name: pos.account_name,
        asset_type: pos.asset_type,
        unifiedValue: pos.current_value || 0,
        unifiedQuantity: pos.quantity || 0,
        unifiedPrice: pos.current_price || 0,
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
  }, [unifiedPositions, rawData, filters]);

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
            refetch();
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
  }, [showFilters, refetch]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading && !rawData) {
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
          <h2 className="text-2xl font-bold text-white mb-2">Loading Portfolio Data</h2>
          <p className="text-gray-400">Analyzing your investments...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 backdrop-blur-sm border border-red-500/50 rounded-2xl p-8 max-w-md"
        >
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Error Loading Data</h2>
          <p className="text-gray-300 text-center mb-6">{error}</p>
          <div className="flex gap-4">
            <button
              onClick={() => refetch()}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render functions for different view modes
  const renderOverviewContent = () => {
    if (viewMode === 'grid') {
      return (
        <>
          {/* KPI Metrics - First Row */}
          {overviewData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Portfolio Value"
                subtitle="All accounts combined"
                value={overviewData.totalValue}
                change={overviewData.periodChanges.month?.value}
                trend={overviewData.trendData}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>}
                color="from-indigo-500 to-purple-600"
                format="currency"
              />
              
              <MetricCard
                title="Total Gain/Loss"
                subtitle={`${formatPercentage(overviewData.totalGainLossPercent)} return`}
                value={overviewData.totalGainLoss}
                change={overviewData.totalGainLossPercent}
                trend={overviewData.trendData.map(d => ({ 
                  date: d.date, 
                  value: d.gainLoss 
                }))}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>}
                color={overviewData.totalGainLoss >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"}
                format="currency"
                sparklineColor={overviewData.totalGainLoss >= 0 ? colors.performance.positive : colors.performance.negative}
              />
              
              <MetricCard
                title="Today's Change"
                subtitle="Since yesterday"
                value={overviewData.dailyChange.absolute}
                change={overviewData.dailyChange.value}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>}
                color={overviewData.dailyChange.value >= 0 ? "from-cyan-500 to-blue-600" : "from-orange-500 to-red-600"}
                format="currency"
              />
              
              <MetricCard
                title="Annual Income"
                subtitle={`${overviewData.positionCount} positions`}
                value={overviewData.totalIncome}
                change={0}
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>}
                color="from-amber-500 to-orange-600"
                format="currency"
              />
            </div>
          )}

          {/* Second Row - Period Performance */}
          {overviewData && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {Object.entries(overviewData.periodChanges).map(([period, change]) => (
                <motion.div
                  key={period}
                  variants={itemVariants}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 text-center"
                >
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    {period === 'day' ? '1D' : period === 'week' ? '1W' : period === 'month' ? '1M' : period === 'quarter' ? '3M' : '1Y'}
                  </p>
                  <p className={`text-xl font-bold ${change.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercentage(change.value)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(change.absolute, true)}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Third Row - Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Enhanced Pie Chart */}
            <motion.div
              variants={itemVariants}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:col-span-1"
            >
              <h3 className="text-xl font-bold mb-6">Asset Allocation</h3>
              {overviewData && (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(overviewData.assetAllocation).map(([type, data]) => ({
                          name: type.charAt(0).toUpperCase() + type.slice(1),
                          value: data.value,
                          count: data.count,
                          gainLoss: data.gainLoss
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {Object.keys(overviewData.assetAllocation).map((type, index) => (
                          <Cell key={`cell-${index}`} fill={colors.asset[type] || colors.asset.other} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomTooltip formatter={(value) => formatCurrency(value, true)} />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Allocation breakdown */}
              <div className="mt-4 space-y-2">
                {overviewData && Object.entries(overviewData.assetAllocation)
                  .sort((a, b) => b[1].value - a[1].value)
                  .map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors.asset[type] }}
                        />
                        <span className="text-sm text-gray-300 capitalize">{type}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-white">
                          {formatCurrency(data.value, true)}
                        </span>
                        <span className={`text-xs ml-2 ${data.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss, true)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>

            {/* Performance Chart */}
            <motion.div
              variants={itemVariants}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Portfolio Performance</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedMetric('value')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedMetric === 'value' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    Value
                  </button>
                  <button
                    onClick={() => setSelectedMetric('gainLoss')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedMetric === 'gainLoss' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    Gain/Loss
                  </button>
                  <button
                    onClick={() => setSelectedMetric('percent')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedMetric === 'percent' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    Percent
                  </button>
                </div>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overviewData?.trendData || []}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.chart.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={colors.chart.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorGainLoss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={overviewData?.totalGainLoss >= 0 ? colors.performance.positive : colors.performance.negative} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={overviewData?.totalGainLoss >= 0 ? colors.performance.positive : colors.performance.negative} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#9ca3af' }}
                      tickFormatter={(date) => formatDate(date)}
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af' }}
                      tickFormatter={(value) => selectedMetric === 'percent' ? `${value.toFixed(1)}%` : formatCurrency(value, true)}
                      domain={selectedMetric === 'value' ? ['dataMin - 1000', 'dataMax + 1000'] : ['auto', 'auto']}
                    />
                    <Tooltip
                      content={
                        <CustomTooltip 
                          formatter={(value) => selectedMetric === 'percent' ? `${value.toFixed(2)}%` : formatCurrency(value)}
                          labelFormatter={(date) => formatDate(date, 'full')}
                        />
                      }
                    />
                    {selectedMetric === 'value' && (
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={colors.chart.primary}
                        fill="url(#colorValue)"
                        strokeWidth={2}
                        dot={{ fill: colors.chart.primary, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {selectedMetric === 'gainLoss' && (
                      <Area
                        type="monotone"
                        dataKey="gainLoss"
                        stroke={overviewData?.totalGainLoss >= 0 ? colors.performance.positive : colors.performance.negative}
                        fill="url(#colorGainLoss)"
                        strokeWidth={2}
                        dot={{ fill: overviewData?.totalGainLoss >= 0 ? colors.performance.positive : colors.performance.negative, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {selectedMetric === 'percent' && (
                      <Area
                        type="monotone"
                        dataKey="gainLossPercent"
                        stroke={colors.chart.secondary}
                        fill="url(#colorGainLoss)"
                        strokeWidth={2}
                        dot={{ fill: colors.chart.secondary, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Fourth Row - Additional Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            {/* Risk Metrics */}
            {overviewData && (
              <RiskMetricsCard data={overviewData} />
            )}

            {/* Concentration Analysis */}
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 rounded-2xl p-6 border border-orange-500/20"
            >
              <h3 className="text-xl font-bold text-white mb-4">Concentration Risk</h3>
              {overviewData && (
                <>
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm">Top 5 Holdings</p>
                    <p className="text-2xl font-bold text-white">{overviewData.top5Concentration.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">of total portfolio</p>
                  </div>
                  <div className="space-y-2">
                    {overviewData.topPositions.slice(0, 5).map((pos, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-300 truncate">{pos.identifier}</span>
                        <span className="text-sm font-medium text-white">
                          {((pos.current_value / overviewData.totalValue) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>

            {/* Sector Breakdown */}
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-2xl p-6 border border-cyan-500/20"
            >
              <h3 className="text-xl font-bold text-white mb-4">Top Sectors</h3>
              {overviewData && (
                <div className="space-y-3">
                  {Object.entries(overviewData.sectorAllocation)
                    .sort((a, b) => b[1].value - a[1].value)
                    .slice(0, 5)
                    .map(([sector, data], idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-300">{sector}</span>
                          <span className="text-sm font-medium text-white">
                            {((data.value / overviewData.totalValue) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(data.value / overviewData.totalValue) * 100}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </motion.div>

            {/* Income Analysis */}
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl p-6 border border-green-500/20"
            >
              <h3 className="text-xl font-bold text-white mb-4">Income Analysis</h3>
              {overviewData && (
                <>
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm">Annual Yield</p>
                    <p className="text-2xl font-bold text-white">
                      {((overviewData.totalIncome / overviewData.totalValue) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Annual Income</span>
                      <span className="text-sm font-medium text-white">{formatCurrency(overviewData.totalIncome, true)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Monthly Avg</span>
                      <span className="text-sm font-medium text-white">{formatCurrency(overviewData.totalIncome / 12, true)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Daily Avg</span>
                      <span className="text-sm font-medium text-white">{formatCurrency(overviewData.totalIncome / 365, true)}</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* Fifth Row - Top Holdings Table */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Top Holdings by Value</h3>
              <span className="text-sm text-gray-400">Top 10 positions</span>
            </div>
            {rawData && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">% of Portfolio</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Return %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.topPositions.map((position, idx) => (
                      <motion.tr 
                        key={position.identifier}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-2 h-8 rounded-full"
                              style={{ backgroundColor: colors.asset[position.asset_type] }}
                            />
                            <div>
                              <div className="font-medium text-white">{position.identifier}</div>
                              <div className="text-sm text-gray-400">{position.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-white">
                          {formatCurrency(position.current_value)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-300">
                          {((position.current_value / overviewData.totalValue) * 100).toFixed(2)}%
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${position.gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(position.gain_loss_amt)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${position.gain_loss_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercentage(position.gain_loss_pct)}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </>
      );
    } else if (viewMode === 'table') {
      // Table view
      return (
        <motion.div
          variants={itemVariants}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden"
        >
          {rawData && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost Basis</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Return %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {Object.values(rawData.snapshots_by_date[rawData.summary.dates[rawData.summary.dates.length - 1]]?.positions || {})
                    .filter(pos => filters.selectedAssetTypes.has(pos.asset_type) && filters.selectedAccounts.has(pos.account_id.toString()))
                    .sort((a, b) => b.current_value - a.current_value)
                    .map((position, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="hover:bg-gray-750 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: colors.asset[position.asset_type] }}
                            />
                            <div>
                              <div className="font-medium text-white">{position.identifier}</div>
                              <div className="text-sm text-gray-400">{position.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{position.account_name}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{position.quantity?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4 text-right text-gray-300">${position.current_price?.toFixed(2) || '-'}</td>
                        <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(position.current_value)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatCurrency(position.cost_basis)}</td>
                        <td className={`px-6 py-4 text-right font-medium ${position.gain_loss_amt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(position.gain_loss_amt)}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${position.gain_loss_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercentage(position.gain_loss_pct)}
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      );
    } else {
      // Chart view
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Treemap */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold mb-6">Portfolio Treemap</h3>
            {overviewData && (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={overviewData.topPositions.map(pos => ({
                      name: pos.identifier,
                      size: pos.current_value,
                      fill: colors.asset[pos.asset_type]
                    }))}
                    dataKey="size"
                    aspectRatio={4/3}
                    stroke="#fff"
                    fill="#8884d8"
                  >
                    <Tooltip
                      content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* Scatter Plot */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold mb-6">Risk vs Return</h3>
            {overviewData && (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="risk" 
                      name="Risk" 
                      tick={{ fill: '#9ca3af' }}
                      label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                    />
                    <YAxis 
                      dataKey="return" 
                      name="Return" 
                      tick={{ fill: '#9ca3af' }}
                      label={{ value: 'Return %', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                    />
                    <Scatter 
                      name="Positions" 
                      data={overviewData.topPositions.map(pos => ({
                        name: pos.identifier,
                        risk: Math.abs(pos.gain_loss_pct),
                        return: pos.gain_loss_pct,
                        value: pos.current_value
                      }))}
                      fill={colors.chart.primary}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        </div>
      );
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white ${theme}`}>
      <Head>
        <title>Portfolio Command Center | NestEgg</title>
        <meta name="description" content="Advanced portfolio analysis and insights" />
      </Head>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Command Center
                </span>
              </motion.button>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-1">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'trends', label: 'Trends', icon: '📈' },
                  { id: 'comparison', label: 'Compare', icon: '🔄' },
                  { id: 'reconciliation', label: 'Reconcile', icon: '✓' }
                ].map((section) => (
                  <motion.button
                    key={section.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveSection(section.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                      activeSection === section.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <span>{section.icon}</span>
                    <span>{section.label}</span>
                  </motion.button>
                ))}
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Data freshness indicator */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-400 flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {dataAge && (
                  <span>Updated {formatDate(dataAge, 'short')} at {dataAge.toLocaleTimeString()}</span>
                )}
              </motion.div>

              {/* View mode toggle - only show in overview */}
              {activeSection === 'overview' && (
                <div className="flex items-center bg-gray-800 rounded-lg p-1">
                  {['grid', 'table', 'chart'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === mode
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {mode === 'grid' && '⊞'}
                      {mode === 'table' && '☰'}
                      {mode === 'chart' && '📊'}
                      <span className="ml-1">{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Filter toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors relative"
                title="Toggle filters (Ctrl+K)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {showFilters && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full"
                  />
                )}
              </motion.button>

              {/* Refresh */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, rotate: 360 }}
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
                title="Refresh data (Ctrl+R)"
              >
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              accounts={rawData?.summary?.accounts || []}
              assetTypes={rawData?.summary?.asset_types || []}
            />
          )}
        </AnimatePresence>

        {/* Content Sections */}
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div
              key="overview"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="initial"
            >
              {renderOverviewContent()}
            </motion.div>
          )}

          {activeSection === 'trends' && (
            <motion.div
              key="trends"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="initial"
            >
              {/* Trend Charts */}
              <div className="space-y-8">
                {/* KPI Metrics Row */}
                {overviewData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                      title="Portfolio Trend"
                      subtitle="30-day change"
                      value={overviewData.periodChanges.month?.absolute || 0}
                      change={overviewData.periodChanges.month?.value || 0}
                      icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>}
                      color="from-indigo-500 to-purple-600"
                      format="currency"
                    />
                    
                    <MetricCard
                      title="Best Performer"
                      subtitle={overviewData.topPositions[0]?.identifier}
                      value={overviewData.topPositions[0]?.gain_loss_amt || 0}
                      change={overviewData.topPositions[0]?.gain_loss_pct || 0}
                      icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>}
                      color="from-green-500 to-emerald-600"
                      format="currency"
                    />
                    
                    <MetricCard
                      title="Volatility"
                      subtitle="30-day annualized"
                      value={18.5}
                      change={-2.3}
                      icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>}
                      color="from-amber-500 to-orange-600"
                      format="percentage"
                    />
                    
                    <MetricCard
                      title="Active Positions"
                      subtitle="Total holdings"
                      value={overviewData.positionCount}
                      change={0}
                      icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>}
                      color="from-cyan-500 to-blue-600"
                      format="number"
                    />
                  </div>
                )}

                {/* Portfolio Value Over Time with Auto-Scaling */}
                <motion.div
                  variants={itemVariants}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Portfolio Value Trend</h3>
                    <div className="flex items-center space-x-4">
                      <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                        className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm"
                      >
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                        <option value="90d">90 Days</option>
                        <option value="1y">1 Year</option>
                        <option value="all">All Time</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData.totals}>
                        <defs>
                          <linearGradient id="colorValueTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.chart.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.chart.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(date) => formatDate(date)}
                        />
                        <YAxis 
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(value) => formatCurrency(value, true)}
                          domain={trendData.yDomain}
                        />
                        <Tooltip
                          content={
                            <CustomTooltip 
                              formatter={(value) => formatCurrency(value)}
                              labelFormatter={(date) => formatDate(date, 'full')}
                            />
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={colors.chart.primary}
                          fill="url(#colorValueTrend)"
                          strokeWidth={2}
                          dot={{ fill: colors.chart.primary, strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Brush
                          dataKey="date"
                          height={30}
                          stroke={colors.chart.primary}
                          tickFormatter={(date) => formatDate(date)}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Stacked Area Chart by Group */}
                <motion.div
                  variants={itemVariants}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">
                      Composition by {filters.groupBy.charAt(0).toUpperCase() + filters.groupBy.slice(1)}
                    </h3>
                  </div>
                  
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData.dates.map(date => {
                        const dataPoint = { date };
                        Object.entries(trendData.series).forEach(([key, values]) => {
                          const value = values.find(v => v.date === date);
                          dataPoint[key] = value ? value.value : 0;
                        });
                        return dataPoint;
                      })}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(date) => formatDate(date)}
                        />
                        <YAxis 
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(value) => formatCurrency(value, true)}
                        />
                        <Tooltip
                          content={
                            <CustomTooltip 
                              formatter={(value) => formatCurrency(value)}
                              labelFormatter={(date) => formatDate(date, 'full')}
                            />
                          }
                        />
                        {Object.keys(trendData.series).map((key, idx) => (
                          <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stackId="1"
                            stroke={colors.asset[key] || Object.values(colors.chart)[idx % 6]}
                            fill={colors.asset[key] || Object.values(colors.chart)[idx % 6]}
                          />
                        ))}
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(trendData.series).slice(0, 6).map(([key, values]) => {
                    const firstValue = values[0]?.value || 0;
                    const lastValue = values[values.length - 1]?.value || 0;
                    const change = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
                    
                    return (
                      <motion.div
                        key={key}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02 }}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium capitalize">{key}</h4>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors.asset[key] || '#6b7280' }}
                          />
                        </div>
                        <div className="text-2xl font-bold mb-2">
                          {formatCurrency(lastValue, true)}
                        </div>
                        <div className={`text-sm flex items-center ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {change >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(change), false)}
                        </div>
                        <div className="mt-4 h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={values.slice(-30)}>
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={change >= 0 ? colors.performance.positive : colors.performance.negative}
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Advanced Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Moving Averages */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
                  >
                    <h3 className="text-xl font-bold mb-6">Moving Averages</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData.totals.slice(-90)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: '#9ca3af' }}
                            tickFormatter={(date) => formatDate(date)}
                          />
                          <YAxis 
                            tick={{ fill: '#9ca3af' }}
                            tickFormatter={(value) => formatCurrency(value, true)}
                          />
                          <Tooltip
                            content={
                              <CustomTooltip 
                                formatter={(value) => formatCurrency(value)}
                                labelFormatter={(date) => formatDate(date, 'full')}
                              />
                            }
                          />
                          <Line type="monotone" dataKey="value" stroke={colors.chart.primary} strokeWidth={2} dot={false} />
                          <ReferenceLine y={overviewData?.totalCostBasis} stroke="#ef4444" strokeDasharray="5 5" />
                          <Legend />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  {/* Gain/Loss Distribution */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6"
                  >
                    <h3 className="text-xl font-bold mb-6">Gain/Loss Distribution</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={overviewData?.topPositions.map(pos => ({
                            name: pos.identifier,
                            gain: pos.gain_loss_amt > 0 ? pos.gain_loss_amt : 0,
                            loss: pos.gain_loss_amt < 0 ? Math.abs(pos.gain_loss_amt) : 0
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#9ca3af' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fill: '#9ca3af' }}
                            tickFormatter={(value) => formatCurrency(value, true)}
                          />
                          <Tooltip
                            content={
                              <CustomTooltip 
                                formatter={(value) => formatCurrency(value)}
                              />
                            }
                          />
                          <Bar dataKey="gain" stackId="a" fill={colors.performance.positive} />
                          <Bar dataKey="loss" stackId="a" fill={colors.performance.negative} />
                          <Legend />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'comparison' && (
            <motion.div
              key="comparison"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="initial"
            >
              {/* Date Selection */}
              <motion.div
                variants={itemVariants}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8"
              >
                <h3 className="text-xl font-bold mb-4">Select Comparison Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">From Date</label>
                    <select
                      value={compareOptions.date1 || ''}
                      onChange={(e) => setCompareOptions({ ...compareOptions, date1: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      {rawData?.summary?.dates.map(date => (
                        <option key={date} value={date}>{formatDate(date, 'full')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">To Date</label>
                    <select
                      value={compareOptions.date2 || ''}
                      onChange={(e) => setCompareOptions({ ...compareOptions, date2: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                    >
                      {rawData?.summary?.dates.map(date => (
                        <option key={date} value={date}>{formatDate(date, 'full')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setCompareOptions({ ...compareOptions, showDifference: !compareOptions.showDifference })}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        compareOptions.showDifference
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      Show Differences
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Comparison Summary */}
              {comparisonData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <motion.div
                    variants={itemVariants}
                    className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-2xl p-6 border border-blue-500/20"
                  >
                    <p className="text-gray-400 text-sm">Period Start Value</p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {formatCurrency(comparisonData.reduce((sum, g) => sum + g.value1, 0))}
                    </p>
                  </motion.div>
                  <motion.div
                    variants={itemVariants}
                    className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-500/20"
                  >
                    <p className="text-gray-400 text-sm">Period End Value</p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {formatCurrency(comparisonData.reduce((sum, g) => sum + g.value2, 0))}
                    </p>
                  </motion.div>
                  <motion.div
                    variants={itemVariants}
                    className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl p-6 border border-green-500/20"
                  >
                    <p className="text-gray-400 text-sm">Total Change</p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {formatCurrency(comparisonData.reduce((sum, g) => sum + g.valueDelta, 0))}
                    </p>
                  </motion.div>
                  <motion.div
                    variants={itemVariants}
                    className="bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-2xl p-6 border border-orange-500/20"
                  >
                    <p className="text-gray-400 text-sm">Change %</p>
                    <p className="text-2xl font-bold text-white mt-2">
                      {formatPercentage(
                        (comparisonData.reduce((sum, g) => sum + g.valueDelta, 0) / 
                         comparisonData.reduce((sum, g) => sum + g.value1, 0)) * 100
                      )}
                    </p>
                  </motion.div>
                </div>
              )}

              {/* Comparison Table */}
              <motion.div
                variants={itemVariants}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          {filters.groupBy.charAt(0).toUpperCase() + filters.groupBy.slice(1)} / Position
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          {compareOptions.date1 && formatDate(compareOptions.date1)}
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          {compareOptions.date2 && formatDate(compareOptions.date2)}
                        </th>
                        {compareOptions.showDifference && (
                          <>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Change
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Change %
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {comparisonData.map((group, idx) => (
                        <React.Fragment key={idx}>
                          {/* Group Header */}
                          <tr
                            className="bg-gray-850 hover:bg-gray-750 cursor-pointer transition-colors"
                            onClick={() => {
                              const newExpanded = new Set(expandedGroups);
                              if (newExpanded.has(group.key)) {
                                newExpanded.delete(group.key);
                              } else {
                                newExpanded.add(group.key);
                              }
                              setExpandedGroups(newExpanded);
                            }}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <motion.svg
                                  animate={{ rotate: expandedGroups.has(group.key) ? 90 : 0 }}
                                  className="w-4 h-4 mr-2"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </motion.svg>
                                <div
                                  className="w-3 h-3 rounded-full mr-3"
                                  style={{
                                    backgroundColor: colors.asset[group.key] || '#6b7280'
                                  }}
                                />
                                <span className="font-medium capitalize">{group.name}</span>
                                <span className="ml-2 text-sm text-gray-400">
                                  ({group.positions.length} positions)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">
                              {formatCurrency(group.value1)}
                            </td>
                            <td className="px-6 py-4 text-right font-medium">
                              {formatCurrency(group.value2)}
                            </td>
                            {compareOptions.showDifference && (
                              <>
                                <td className={`px-6 py-4 text-right font-medium ${
                                  group.valueDelta >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatCurrency(group.valueDelta)}
                                </td>
                                <td className={`px-6 py-4 text-right font-medium ${
                                  group.valueChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {formatPercentage(group.valueChangePercent)}
                                </td>
                              </>
                            )}
                          </tr>

                          {/* Positions */}
                          <AnimatePresence>
                            {expandedGroups.has(group.key) && group.positions.map((position, posIdx) => (
                              <motion.tr 
                                key={posIdx}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="hover:bg-gray-750 transition-colors"
                              >
                                <td className="px-6 py-3 pl-14">
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {position.identifier}
                                      {position.identifierChanged && (
                                        <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded">
                                          Changed from: {position.previousIdentifier}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      {position.name} • {position.account_name}
                                      {position.accountChanged && (
                                        <span className="text-xs text-yellow-400 ml-2">
                                          (was: {position.previousAccountName})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div>
                                    <div>{formatCurrency(position.value1)}</div>
                                    {position.quantity1 > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {position.quantity1.toFixed(2)} @ ${position.price1.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div>
                                    <div>{formatCurrency(position.value2)}</div>
                                    {position.quantity2 > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {position.quantity2.toFixed(2)} @ ${position.price2.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {compareOptions.showDifference && (
                                  <>
                                    <td className={`px-6 py-3 text-right ${
                                      position.valueDelta >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {formatCurrency(position.valueDelta)}
                                    </td>
                                    <td className={`px-6 py-3 text-right ${
                                      position.valueChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      <div className="flex items-center justify-end">
                                        {formatPercentage(position.valueChangePercent)}
                                      </div>
                                      {position.isNew && (
                                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                                          New
                                        </span>
                                      )}
                                      {position.isSold && (
                                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">
                                          Sold
                                        </span>
                                      )}
                                    </td>
                                  </>
                                )}
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Visual Comparison */}
              <motion.div
                variants={itemVariants}
                className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Waterfall Chart */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4">Value Changes Waterfall</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={comparisonData.slice(0, 10).map(group => ({
                          name: group.name,
                          value: group.valueDelta,
                          fill: group.valueDelta >= 0 ? colors.performance.positive : colors.performance.negative
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#9ca3af' }}
                          angle={-45}
                          textAnchor="end"
                        />
                        <YAxis 
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(value) => formatCurrency(value, true)}
                        />
                        <Tooltip
                          content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                        />
                        <Bar dataKey="value" fill={(data) => data.fill} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Movers */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4">Top Movers</h3>
                  <div className="space-y-3">
                    {comparisonData
                      .flatMap(g => g.positions)
                      .sort((a, b) => Math.abs(b.valueChangePercent) - Math.abs(a.valueChangePercent))
                      .slice(0, 8)
                      .map((position, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className={`w-2 h-8 rounded-full ${
                                position.valueChangePercent >= 0 ? 'bg-green-500' : 'bg-red-500'
                              }`} 
                            />
                            <div>
                              <div className="font-medium">{position.identifier}</div>
                              <div className="text-sm text-gray-400">{position.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${
                              position.valueChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatPercentage(position.valueChangePercent)}
                            </div>
                            <div className="text-sm text-gray-400">
                              {formatCurrency(position.valueDelta, true)}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeSection === 'reconciliation' && (
            <motion.div
              key="reconciliation"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="initial"
            >
              {/* Reconciliation Header */}
              <motion.div
                variants={itemVariants}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Live vs Snapshot Reconciliation</h3>
                    <p className="text-gray-400 mt-1">
                      Comparing real-time positions with latest snapshot from {rawData && formatDate(rawData.summary.dates[rawData.summary.dates.length - 1], 'full')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-gray-400">Total Differences: </span>
                      <span className="font-medium text-white">{reconciliationData.length}</span>
                    </div>
                    <button
                      onClick={() => refetch()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                    >
                      Refresh Data
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Reconciliation Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                  {
                    title: 'Matched Positions',
                    value: reconciliationData.filter(r => r.status === 'matched').length,
                    color: 'from-green-500 to-emerald-600',
                    icon: '✓'
                  },
                  {
                    title: 'Live Only',
                    value: reconciliationData.filter(r => r.status === 'unified_only').length,
                    color: 'from-amber-500 to-orange-600',
                    icon: '!'
                  },
                  {
                    title: 'Snapshot Only',
                    value: reconciliationData.filter(r => r.status === 'snapshot_only').length,
                    color: 'from-red-500 to-rose-600',
                    icon: '×'
                  },
                  {
                    title: 'Total Difference',
                    value: reconciliationData.reduce((sum, r) => sum + Math.abs(r.valueDelta || 0), 0),
                    format: 'currency',
                    color: 'from-purple-500 to-pink-600',
                    icon: '∆'
                  }
                ].map((metric, idx) => (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    className={`relative bg-gradient-to-br ${metric.color} p-6 rounded-2xl overflow-hidden`}
                  >
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute top-2 right-2 text-4xl opacity-20"
                    >
                      {metric.icon}
                    </motion.div>
                    <div className="relative z-10">
                      <p className="text-white/80 text-sm">{metric.title}</p>
                      <p className="text-2xl font-bold text-white mt-2">
                        {metric.format === 'currency' ? formatCurrency(metric.value, true) : metric.value}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Reconciliation Table */}
              {reconciliationData.length > 0 ? (
                <motion.div
                  variants={itemVariants}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Position
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Live Value
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Snapshot Value
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Difference
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {reconciliationData.map((item, idx) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            className="hover:bg-gray-750 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-3"
                                  style={{ backgroundColor: colors.asset[item.asset_type] || '#6b7280' }}
                                />
                                <div>
                                  <div className="font-medium">{item.identifier}</div>
                                  <div className="text-sm text-gray-400">
                                    {item.name} • {item.account_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                item.status === 'matched' 
                                  ? 'bg-green-900/50 text-green-400' 
                                  : item.status === 'unified_only'
                                  ? 'bg-amber-900/50 text-amber-400'
                                  : 'bg-red-900/50 text-red-400'
                              }`}>
                                {item.status === 'matched' ? 'Matched' : 
                                 item.status === 'unified_only' ? 'Live Only' : 'Snapshot Only'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div>{formatCurrency(item.unifiedValue)}</div>
                              {item.unifiedQuantity > 0 && (
                                <div className="text-xs text-gray-500">
                                  {item.unifiedQuantity.toFixed(2)} @ ${item.unifiedPrice.toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div>{formatCurrency(item.snapshotValue)}</div>
                              {item.snapshotQuantity > 0 && (
                                <div className="text-xs text-gray-500">
                                  {item.snapshotQuantity.toFixed(2)} @ ${item.snapshotPrice.toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className={`px-6 py-4 text-right font-medium ${
                              (item.valueDelta || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              <div>{formatCurrency(item.valueDelta || 0)}</div>
                              {item.valueChangePercent !== undefined && (
                                <div className="text-xs">
                                  {formatPercentage(item.valueChangePercent)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                onClick={() => {
                                  // Handle reconciliation action
                                  console.log('Reconcile:', item);
                                }}
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  variants={itemVariants}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 text-center"
                >
                  <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">No Discrepancies Found</h3>
                  <p className="text-gray-500">All positions are in sync between live data and the latest snapshot.</p>
                </motion.div>
              )}

              {/* Reconciliation Insights */}
              {reconciliationData.length > 0 && (
                <motion.div
                  variants={itemVariants}
                  className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8"
                >
                  {/* Price Discrepancies */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Price Discrepancies</h3>
                    <div className="space-y-3">
                      {reconciliationData
                        .filter(item => item.status === 'matched' && Math.abs(item.unifiedPrice - item.snapshotPrice) > 0.01)
                        .slice(0, 5)
                        .map((item, idx) => {
                          const priceDiff = item.unifiedPrice - item.snapshotPrice;
                          const priceDiffPercent = item.snapshotPrice > 0 ? (priceDiff / item.snapshotPrice) * 100 : 0;
                          
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                            >
                              <div>
                                <div className="font-medium">{item.identifier}</div>
                                <div className="text-sm text-gray-400">{item.name}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm">
                                  <span className="text-gray-400">Live: </span>
                                  <span className="text-white">${item.unifiedPrice.toFixed(2)}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-400">Snap: </span>
                                  <span className="text-white">${item.snapshotPrice.toFixed(2)}</span>
                                </div>
                                <div className={`text-xs font-medium ${priceDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {priceDiff >= 0 ? '+' : ''}{priceDiffPercent.toFixed(2)}%
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Quantity Mismatches */}
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-4">Quantity Mismatches</h3>
                    <div className="space-y-3">
                      {reconciliationData
                        .filter(item => item.status === 'matched' && Math.abs(item.unifiedQuantity - item.snapshotQuantity) > 0.01)
                        .slice(0, 5)
                        .map((item, idx) => {
                          const qtyDiff = item.unifiedQuantity - item.snapshotQuantity;
                          
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                            >
                              <div>
                                <div className="font-medium">{item.identifier}</div>
                                <div className="text-sm text-gray-400">{item.name}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm">
                                  <span className="text-gray-400">Live: </span>
                                  <span className="text-white">{item.unifiedQuantity.toFixed(2)}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-400">Snap: </span>
                                  <span className="text-white">{item.snapshotQuantity.toFixed(2)}</span>
                                </div>
                                <div className={`text-xs font-medium ${qtyDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {qtyDiff >= 0 ? '+' : ''}{qtyDiff.toFixed(2)} shares
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-8 right-8 flex flex-col gap-4"
      >
        {/* Main FAB */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowFilters(!showFilters)}
          className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white relative"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {showFilters && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
            />
          )}
        </motion.button>

        {/* Back to top button (show when scrolled) */}
        <AnimatePresence>
          {typeof window !== 'undefined' && window.scrollY > 500 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-12 h-12 bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-8 bg-gray-800 rounded-lg p-4 shadow-xl"
          >
            <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
            <div className="space-y-1 text-sm">
              <div><kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+K</kbd> Toggle Filters</div>
              <div><kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+R</kbd> Refresh Data</div>
              <div><kbd className="px-2 py-1 bg-gray-700 rounded">Ctrl+1-4</kbd> Switch Sections</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && rawData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}