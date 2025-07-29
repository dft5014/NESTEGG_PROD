// pages/command-center2.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDataStore } from '@/store/DataStore';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, ComposedChart, ReferenceLine, Brush, ScatterChart, Scatter,
  FunnelChart, Funnel, LabelList, Sector, RadialBarChart, RadialBar
} from 'recharts';

// Custom hook for DataStore integration
const usePortfolioData = () => {
  const { 
    snapshots,
    accounts,
    fetchSnapshotsData,
    fetchAccountsData,
    fetchGroupedPositionsData,
    groupedPositions
  } = useDataStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isInitialized) {
        await Promise.all([
          fetchSnapshotsData(90), // 90 days of data
          fetchAccountsData(),
          fetchGroupedPositionsData()
        ]);
        setIsInitialized(true);
      }
    };
    loadInitialData();
  }, [isInitialized, fetchSnapshotsData, fetchAccountsData, fetchGroupedPositionsData]);

  // Transform DataStore data to match expected format
  const rawData = useMemo(() => {
    if (!snapshots.data) return null;

    // Build the raw data structure to match original format exactly
    const summary = {
      dates: snapshots.dates || [],
      accounts: accounts.data || [],
      asset_types: snapshots.assetTypes || ['security', 'crypto', 'cash', 'metal', 'realestate']
    };

    // Transform snapshots.byDate to match expected structure
    const snapshots_by_date = {};
    if (snapshots.byDate) {
      Object.entries(snapshots.byDate).forEach(([date, snapshot]) => {
        // Ensure positions are keyed by original_id for consistency
        const positions = {};
        if (snapshot.positions) {
          Object.entries(snapshot.positions).forEach(([key, position]) => {
            positions[position.original_id || key] = position;
          });
        }
        
        snapshots_by_date[date] = {
          ...snapshot,
          positions
        };
      });
    }

    return {
      summary,
      snapshots_by_date
    };
  }, [snapshots.data, snapshots.dates, snapshots.byDate, snapshots.assetTypes, accounts.data]);

  // Get unified positions from grouped positions data
  const unifiedPositions = useMemo(() => {
    if (!groupedPositions.data) return [];
    
    // Flatten grouped positions into unified array
    const positions = [];
    Object.values(groupedPositions.data).forEach(group => {
      if (Array.isArray(group)) {
        positions.push(...group);
      } else if (group.positions) {
        positions.push(...group.positions);
      }
    });
    
    return positions;
  }, [groupedPositions.data]);

  const refetch = useCallback(async (days = 90) => {
    await Promise.all([
      fetchSnapshotsData(days, true), // force refresh
      fetchAccountsData(true),
      fetchGroupedPositionsData(true)
    ]);
  }, [fetchSnapshotsData, fetchAccountsData, fetchGroupedPositionsData]);

  const isLoading = snapshots.loading || accounts.loading || groupedPositions.loading;
  const error = snapshots.error || accounts.error || groupedPositions.error;
  const dataAge = snapshots.lastFetched ? new Date(snapshots.lastFetched) : null;

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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Asset Type Filter */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Asset Types</label>
          <div className="mt-1 relative">
            <button className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-600 transition-colors">
              <span>{filters.selectedAssetTypes.size === assetTypes.length ? 'All Types' : `${filters.selectedAssetTypes.size} Selected`}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Group By */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Group By</label>
          <select
            value={filters.groupBy}
            onChange={(e) => onChange({ ...filters, groupBy: e.target.value })}
            className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          >
            <option value="asset">Asset Type</option>
            <option value="account">Account</option>
            <option value="sector">Sector</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
};

// Risk metrics card component
const RiskMetricsCard = ({ data }) => {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-2xl p-6 border border-purple-500/20"
    >
      <h3 className="text-xl font-bold text-white mb-4">Risk Metrics</h3>
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-sm">Sharpe Ratio</p>
          <p className="text-2xl font-bold text-white">{data.sharpeRatio ? data.sharpeRatio.toFixed(2) : '-'}</p>
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
  // NOTE: These calculations should be moved server-side
  const overviewData = useMemo(() => {
    if (!rawData || !rawData.snapshots_by_date) return null;

    const dates = rawData.summary.dates;
    const latestDate = dates[dates.length - 1];
    const latestSnapshot = rawData.snapshots_by_date[latestDate];
    
    if (!latestSnapshot) return null;

    // SERVER-SIDE REQUIRED: Period changes calculation
    // This should be pre-computed in the database using JSON fields
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

    // SERVER-SIDE REQUIRED: Risk metrics calculation (Sharpe ratio, beta, max drawdown)
    // These require complex calculations that should be done server-side
    const returns = [];
    for (let i = 1; i < dates.length; i++) {
      const current = rawData.snapshots_by_date[dates[i]]?.total_value;
      const previous = rawData.snapshots_by_date[dates[i-1]]?.total_value;
      if (current && previous && previous > 0) {
        returns.push((current - previous) / previous);
      }
    }

    // SERVER-SIDE REQUIRED: Max drawdown calculation
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

    // SERVER-SIDE REQUIRED: Asset allocation aggregation
    // This should be pre-computed and stored in snapshot metadata
    const assetAllocation = {};
    const sectorAllocation = {};
    const accountAllocation = {};
    
    const positions = Object.values(latestSnapshot.positions || {});
    positions.forEach(position => {
      // Asset allocation
      if (!assetAllocation[position.asset_type]) {
        assetAllocation[position.asset_type] = { value: 0, count: 0, gainLoss: 0 };
      }
      assetAllocation[position.asset_type].value += position.current_value;
      assetAllocation[position.asset_type].count += 1;
      assetAllocation[position.asset_type].gainLoss += position.gain_loss_amt || 0;

      // Sector allocation
      const sector = position.sector || 'Unknown';
      if (!sectorAllocation[sector]) {
        sectorAllocation[sector] = { value: 0, count: 0 };
      }
      sectorAllocation[sector].value += position.current_value;
      sectorAllocation[sector].count += 1;

      // Account allocation
      if (!accountAllocation[position.account_name]) {
        accountAllocation[position.account_name] = { value: 0, count: 0 };
      }
      accountAllocation[position.account_name].value += position.current_value;
      accountAllocation[position.account_name].count += 1;
    });

    // SERVER-SIDE REQUIRED: Top positions sorting and income calculation
    // Sort positions by value and calculate dividend income
    const sortedPositions = positions.sort((a, b) => b.current_value - a.current_value);
    const topPositions = sortedPositions.slice(0, 20);
    
    // Calculate total income from dividends
    const totalIncome = positions.reduce((sum, pos) => {
      return sum + (pos.dividend_amount || 0) * 12; // Annualized
    }, 0);

    // Calculate concentration metrics
    const totalValue = latestSnapshot.total_value;
    const top5Value = topPositions.slice(0, 5).reduce((sum, pos) => sum + pos.current_value, 0);
    const top5Concentration = (top5Value / totalValue) * 100;

    return {
      totalValue,
      totalGainLoss: latestSnapshot.total_gain_loss,
      totalGainLossPercent: latestSnapshot.total_cost_basis > 0 
        ? (latestSnapshot.total_gain_loss / latestSnapshot.total_cost_basis) * 100 
        : 0,
      totalCostBasis: latestSnapshot.total_cost_basis,
      totalIncome,
      totalDividends: totalIncome, // Same as income for now
      positionCount: latestSnapshot.position_count,
      periodChanges,
      trendData,
      assetAllocation,
      sectorAllocation,
      accountAllocation,
      topPositions: positions.slice(0, 10),
      returns,
      maxDrawdown: maxDrawdown * 100,
      top5Concentration,
      dailyChange: periodChanges.day || { value: 0, absolute: 0 },
      // These would be calculated server-side
      sharpeRatio: null,
      beta: null
    };
  }, [rawData]);

  // Process trend data with filters and auto-scaling
  // SERVER-SIDE REQUIRED: Time-series aggregation by grouping
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
        gainLossPercent: snapshot.total_cost_basis > 0 ? 
          (snapshot.total_gain_loss / snapshot.total_cost_basis) * 100 : 0
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
  // SERVER-SIDE REQUIRED: Position comparison between dates
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
  // SERVER-SIDE REQUIRED: Position reconciliation logic
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
              {/* Trend Charts content would go here */}
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white mb-4">Trends Section</h2>
                <p className="text-gray-400">Portfolio trend analysis and charts</p>
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
              {/* Comparison content would go here */}
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white mb-4">Comparison Section</h2>
                <p className="text-gray-400">Compare portfolio across different time periods</p>
              </div>
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
              {/* Reconciliation content would go here */}
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white mb-4">Reconciliation Section</h2>
                <p className="text-gray-400">Reconcile live positions with snapshots</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Keyboard shortcuts hint */}
      <AnimatePresence>
        {!showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 bg-gray-800 rounded-lg px-4 py-2 text-sm text-gray-400"
          >
            Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl+K</kbd> for filters
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

// Disable static generation for this page
export const getServerSideProps = async () => {
  return {
    props: {}, // Will be passed to the page component as props
  };
};