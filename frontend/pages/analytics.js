// pages/analytics.js - Premium Analytics Studio (Complete & Fully Functional)
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, ReferenceLine, Treemap, ScatterChart, Scatter
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Activity,
  Layers, Filter, Download, RefreshCw, Calendar, Zap, Target, Shield,
  DollarSign, Percent, Award, AlertTriangle, Eye, EyeOff, Maximize2,
  Grid, List, Settings, Search, X, ChevronDown, ChevronUp, ArrowUpRight,
  ArrowDownRight, Sparkles, Gauge, Droplets, Flame, Wind, Building2,
  Wallet, Gift, Package, Home, Coins, Banknote, MinusCircle, Info,
  Calculator, TrendingUpDown, PiggyBank, Receipt, Repeat, Loader2
} from 'lucide-react';

import { useDataStore } from '@/store/DataStore';
import {
  usePortfolioSummary,
  usePortfolioTrends,
  useGroupedPositions,
  useDetailedPositions,
  useAccounts
} from '@/store/hooks';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const THEME_COLORS = {
  asset: {
    security: '#6366f1',
    securities: '#6366f1',
    cash: '#10b981',
    crypto: '#8b5cf6',
    bond: '#ec4899',
    metal: '#f59e0b',
    metals: '#f59e0b',
    currency: '#3b82f6',
    real_estate: '#14b8a6',
    other: '#64748b',
    other_assets: '#64748b',
  },
  performance: {
    positive: '#10b981',
    negative: '#ef4444',
    neutral: '#6b7280'
  },
  gradient: {
    primary: 'from-indigo-500 to-purple-600',
    success: 'from-green-500 to-emerald-600',
    danger: 'from-red-500 to-rose-600',
    warning: 'from-amber-500 to-orange-600',
    info: 'from-cyan-500 to-blue-600',
    purple: 'from-purple-500 to-pink-600',
  }
};

const SECTOR_COLORS = {
  Technology: '#6366f1',
  'Financial Services': '#0ea5e9',
  Healthcare: '#10b981',
  'Consumer Cyclical': '#f59e0b',
  'Communication Services': '#8b5cf6',
  Industrials: '#64748b',
  'Consumer Defensive': '#14b8a6',
  Energy: '#f97316',
  'Basic Materials': '#f43f5e',
  'Real Estate': '#84cc16',
  Utilities: '#0284c7',
  Unknown: '#9ca3af',
  Other: '#9ca3af'
};

const TIMEFRAME_OPTIONS = [
  { id: '1w', label: '1W', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '6m', label: '6M', days: 180 },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'All' }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value, compact = false) => {
  if (value === null || value === undefined) return '—';
  const v = Number(value) || 0;
  if (compact && Math.abs(v) >= 1000000) {
    return `$${(v / 1000000).toFixed(2)}M`;
  }
  if (compact && Math.abs(v) >= 1000) {
    return `$${(v / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(v);
};

const formatPercent = (v, sign = true, digits = 2) => {
  if (v === null || v === undefined || isNaN(v)) return '0%';
  const val = Number(v);
  return `${sign && val > 0 ? '+' : ''}${val.toFixed(digits)}%`;
};

const formatNumber = (v, decimals = 2) => {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(decimals);
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const toFrac = (x) => {
  const n = Number(x ?? 0);
  return Math.abs(n) > 1 ? n / 100 : n;
};

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, staggerChildren: 0.05 }
  },
  exit: { opacity: 0, y: -20 }
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4 }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  }
};

// ============================================================================
// ANIMATED NUMBER COMPONENT
// ============================================================================

const AnimatedNumber = ({ value, format = 'currency', duration = 1000 }) => {
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

  if (format === 'currency') return <>{formatCurrency(displayValue)}</>;
  if (format === 'percent') return <>{formatPercent(displayValue)}</>;
  return <>{displayValue.toFixed(0)}</>;
};

// ============================================================================
// PREMIUM METRIC CARD
// ============================================================================

const PremiumMetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  subtitle,
  sparklineData,
  onClick,
  infoText
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const isPositive = (change || 0) >= 0;

  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl p-6 overflow-hidden group cursor-pointer border border-gray-700/50 hover:border-gray-600/50 transition-all shadow-xl ${
        onClick ? 'hover:shadow-2xl' : ''
      }`}
    >
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
        animate={{ opacity: isHovered ? 0.1 : 0 }}
      />

      <div className="absolute top-0 right-0 w-40 h-40 transform translate-x-16 -translate-y-16 opacity-5">
        <motion.div
          animate={{ rotate: isHovered ? 360 : 0 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className={`w-full h-full rounded-full bg-gradient-to-br ${gradient}`}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">
                {title}
              </p>
              {infoText && (
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="p-0.5 rounded-full hover:bg-gray-700/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTooltip(!showTooltip);
                    }}
                  >
                    <Info className="w-3.5 h-3.5 text-gray-500 hover:text-indigo-400 transition-colors" />
                  </button>
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-6 z-50 w-64 p-3 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl"
                      >
                        <p className="text-xs text-gray-300 leading-relaxed">{infoText}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {change !== undefined && change !== null && !isNaN(change) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    isPositive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  )}
                  {formatPercent(Math.abs(change * 100), false, 1)}
                </motion.span>
              )}
            </div>
            {subtitle && <p className="text-gray-500 text-xs mb-2">{subtitle}</p>}
            <h3 className="text-3xl font-bold text-white tracking-tight">
              <AnimatedNumber value={value} format="currency" />
            </h3>
          </div>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} opacity-20 group-hover:opacity-30 transition-opacity`}
          >
            {Icon && <Icon className="w-6 h-6 text-white" />}
          </motion.div>
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="h-16 -mx-2 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`sparkline-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={
                        isPositive
                          ? THEME_COLORS.performance.positive
                          : THEME_COLORS.performance.negative
                      }
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={
                        isPositive
                          ? THEME_COLORS.performance.positive
                          : THEME_COLORS.performance.negative
                      }
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={
                    isPositive
                      ? THEME_COLORS.performance.positive
                      : THEME_COLORS.performance.negative
                  }
                  fill={`url(#sparkline-${title})`}
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

// ============================================================================
// FILTER PANEL
// ============================================================================

const FilterPanel = ({ filters, onFilterChange, availableAssetTypes }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden mb-6"
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/40 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20">
            <Filter className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Filters & Options</h3>
            <p className="text-xs text-gray-400">
              {filters.selectedAssetTypes.size} asset types • {filters.timeframe}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-700/50"
          >
            <div className="p-6 space-y-6">
              {/* Timeframe Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                  Time Period
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_OPTIONS.map((tf) => (
                    <motion.button
                      key={tf.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onFilterChange({ ...filters, timeframe: tf.id })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        filters.timeframe === tf.id
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {tf.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Asset Type Filter */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                  Asset Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableAssetTypes.map((type) => {
                    const isSelected = filters.selectedAssetTypes.has(type);
                    return (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const newSet = new Set(filters.selectedAssetTypes);
                          if (isSelected) {
                            newSet.delete(type);
                          } else {
                            newSet.add(type);
                          }
                          onFilterChange({ ...filters, selectedAssetTypes: newSet });
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                          isSelected
                            ? 'text-white shadow-lg'
                            : 'bg-gray-700/50 text-gray-400 hover:text-white'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? THEME_COLORS.asset[type] || THEME_COLORS.asset.other
                            : undefined
                        }}
                      >
                        {type}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// MAIN ANALYTICS COMPONENT
// ============================================================================

export default function Analytics() {
  // Initialize DataStore
  useDataStore();

  // Hooks
  const {
    summary,
    topPositions,
    topPerformersAmount,
    topPerformersPercent,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation,
    riskMetrics,
    concentrationMetrics,
    dividendMetrics,
    taxEfficiencyMetrics,
    assetPerformance,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
    lastFetched,
    isStale
  } = usePortfolioSummary();

  const { trends, loading: trendsLoading } = usePortfolioTrends();
  const {
    positions: groupedPositions,
    summary: positionsSummary,
    metrics: positionsMetrics,
    loading: positionsLoading
  } = useGroupedPositions();
  const { positions: detailedPositions } = useDetailedPositions();
  const { accounts } = useAccounts();

  // Debug logging
  useEffect(() => {
    console.log('=== ANALYTICS DEBUG ===');
    console.log('Summary Loading:', summaryLoading, 'Summary:', summary);
    console.log('Trends Loading:', trendsLoading, 'Trends:', trends);
    console.log('Positions Loading:', positionsLoading, 'Positions:', groupedPositions);
    console.log('Top Positions:', topPositions);
    console.log('Sector Allocation:', rawSectorAllocation);
    console.log('Institution Allocation:', institutionAllocation);
    console.log('=====================');
  }, [summaryLoading, trendsLoading, positionsLoading, summary, trends, groupedPositions, topPositions, rawSectorAllocation, institutionAllocation]);

  // State
  const [activeTab, setActiveTab] = useState('overview');

  // Log tab changes
  useEffect(() => {
    console.log('Active Tab Changed:', activeTab);
  }, [activeTab]);
  const [filters, setFilters] = useState({
    timeframe: '1m',
    selectedAssetTypes: new Set(['security', 'crypto', 'cash', 'metal'])
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('area');
  const [selectedMetrics, setSelectedMetrics] = useState(['netWorth', 'totalAssets']);

  // Derive available asset types
  const availableAssetTypes = useMemo(() => {
    const types = new Set();
    if (groupedPositions) {
      groupedPositions.forEach((pos) => types.add(pos.asset_type));
    }
    return Array.from(types);
  }, [groupedPositions]);

  // Combined loading state
  const isLoading = summaryLoading || trendsLoading || positionsLoading;

  // Process chart data based on timeframe
  const chartData = useMemo(() => {
    if (!trends?.chartData) {
      console.log('Chart Data: No trends data available');
      return [];
    }

    let data = [...trends.chartData];
    console.log('Chart Data: Processing', data.length, 'data points for timeframe:', filters.timeframe);

    // Apply timeframe filter
    if (filters.timeframe !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (filters.timeframe) {
        case '1w':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '1m':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '3m':
          cutoff.setDate(now.getDate() - 90);
          break;
        case '6m':
          cutoff.setDate(now.getDate() - 180);
          break;
        case '1y':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
        case 'ytd':
          cutoff.setMonth(0, 1);
          break;
        default:
          break;
      }

      data = data.filter((d) => new Date(d.date) >= cutoff);
    }

    console.log('Chart Data: Filtered to', data.length, 'points');
    return data;
  }, [trends, filters.timeframe]);

  // Calculate period change for selected timeframe
  const periodChange = useMemo(() => {
    if (!chartData || chartData.length < 2) {
      return { value: 0, percent: 0 };
    }
    const first = chartData[0].netWorth || 0;
    const last = chartData[chartData.length - 1].netWorth || 0;
    const delta = last - first;
    const percent = first !== 0 ? delta / first : 0;
    return { value: delta, percent };
  }, [chartData]);

  // Process sector allocation
  const sectorData = useMemo(() => {
    if (!rawSectorAllocation) {
      console.log('Sector Data: No raw sector allocation');
      return [];
    }
    const sectors = Object.entries(rawSectorAllocation)
      .filter(([, d]) => d?.value > 0)
      .map(([name, d]) => ({
        name,
        value: d.value,
        percentage: (d.percentage || 0) * 100,
        positionCount: d.position_count || 0
      }))
      .sort((a, b) => b.value - a.value);
    console.log('Sector Data: Processed', sectors.length, 'sectors');
    return sectors;
  }, [rawSectorAllocation]);

  // Calculate comprehensive risk metrics
  const enhancedRiskMetrics = useMemo(() => {
    if (!chartData || chartData.length < 2) {
      console.log('Risk Metrics: Insufficient chart data');
      return null;
    }
    console.log('Risk Metrics: Calculating from', chartData.length, 'data points');

    const returns = [];
    for (let i = 1; i < chartData.length; i++) {
      const curr = chartData[i].netWorth || 0;
      const prev = chartData[i - 1].netWorth || 0;
      if (prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }

    if (returns.length === 0) return null;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

    const sharpeRatio = volatility !== 0 ? (avgReturn * 252) / (volatility / 100) : 0;

    let peak = chartData[0].netWorth || 0;
    let maxDrawdown = 0;
    chartData.forEach((d) => {
      const value = d.netWorth || 0;
      if (value > peak) peak = value;
      const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      volatility: volatility,
      sharpeRatio: sharpeRatio,
      maxDrawdown: maxDrawdown,
      beta: riskMetrics?.portfolio_beta || 1.0,
      liquidityRatio: riskMetrics?.liquidity_ratio || 0
    };
  }, [chartData, riskMetrics]);

  // Process asset allocation data
  const assetAllocationData = useMemo(() => {
    if (!summary?.assetAllocation) {
      console.log('Asset Allocation: No summary asset allocation');
      return [];
    }
    const allocation = Object.entries(summary.assetAllocation)
      .filter(([, d]) => d.value > 0)
      .map(([type, d]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: d.value,
        percentage: (d.percentage || 0) * 100,
        costBasis: d.costBasis || 0,
        gainLoss: d.gainLoss || 0,
        gainLossPercent: (d.gainLossPercent || 0) * 100,
        count: d.count || 0
      }))
      .sort((a, b) => b.value - a.value);
    console.log('Asset Allocation: Processed', allocation.length, 'asset classes');
    return allocation;
  }, [summary]);

  // Loading state - show loading if ANY data source is still loading
  if (isLoading && !summary) {
    console.log('RENDERING: Initial loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-2 rounded-full border-4 border-purple-500 border-t-transparent"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Analytics</h2>
          <p className="text-gray-400">Preparing your premium insights...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (summaryError && !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-900/20 backdrop-blur-xl border border-rose-500/50 rounded-3xl p-8 max-w-md text-center"
        >
          <AlertTriangle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Analytics</h2>
          <p className="text-gray-300 mb-6">{summaryError}</p>
          <button
            onClick={refreshSummary}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // Main render
  console.log('RENDERING: Main analytics component, activeTab:', activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <Head>
        <title>NestEgg | Analytics Studio</title>
        <meta name="description" content="Premium portfolio analytics and insights" />
      </Head>

      <motion.main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="container mx-auto px-4 py-8 max-w-[1800px]"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Analytics Studio
              </h1>
            </motion.div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">
                Last updated: {lastFetched ? new Date(lastFetched).toLocaleString() : '—'}
              </span>
              {isStale && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                  Data may be stale
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                showFilters
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={refreshSummary}
              disabled={summaryLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${summaryLoading ? 'animate-spin' : ''}`} />
              {summaryLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            availableAssetTypes={availableAssetTypes}
          />
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8 overflow-x-auto pb-2"
        >
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'performance', label: 'Performance', icon: TrendingUp },
            { id: 'allocation', label: 'Allocation', icon: PieChartIcon },
            { id: 'risk', label: 'Risk Analysis', icon: Shield },
            { id: 'planning', label: 'Financial Planning', icon: Calculator },
            { id: 'holdings', label: 'Top Holdings', icon: Award },
            { id: 'builder', label: 'Chart Builder', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Content - Continued in next message due to length */}
        <div className="min-h-[600px]">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <OverviewTab
              key="overview-tab"
              summary={summary}
              chartData={chartData}
              periodChange={periodChange}
              sectorData={sectorData}
              assetAllocationData={assetAllocationData}
              topPositions={topPositions}
              institutionAllocation={institutionAllocation}
              riskMetrics={riskMetrics}
              concentrationMetrics={concentrationMetrics}
              dividendMetrics={dividendMetrics}
              timeframe={filters.timeframe}
            />
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <PerformanceTab
              key="performance-tab"
              summary={summary}
              chartData={chartData}
              topPerformersAmount={topPerformersAmount}
              topPerformersPercent={topPerformersPercent}
              assetPerformance={assetPerformance}
              timeframe={filters.timeframe}
            />
          )}

          {/* ALLOCATION TAB */}
          {activeTab === 'allocation' && (
            <AllocationTab
              key="allocation-tab"
              summary={summary}
              sectorData={sectorData}
              assetAllocationData={assetAllocationData}
              institutionAllocation={institutionAllocation}
            />
          )}

          {/* RISK ANALYSIS TAB */}
          {activeTab === 'risk' && (
            <RiskAnalysisTab
              key="risk-tab"
              enhancedRiskMetrics={enhancedRiskMetrics}
              concentrationMetrics={concentrationMetrics}
              taxEfficiencyMetrics={taxEfficiencyMetrics}
              summary={summary}
            />
          )}

          {/* FINANCIAL PLANNING TAB */}
          {activeTab === 'planning' && (
            <PlanningTab
              key="planning-tab"
              summary={summary}
              chartData={chartData}
            />
          )}

          {/* TOP HOLDINGS TAB */}
          {activeTab === 'holdings' && (
            <TopHoldingsTab
              key="holdings-tab"
              topPositions={topPositions}
              groupedPositions={groupedPositions}
              summary={summary}
              filters={filters}
            />
          )}

          {/* CHART BUILDER TAB */}
          {activeTab === 'builder' && (
            <ChartBuilderTab
              key="builder-tab"
              chartData={chartData}
              selectedMetrics={selectedMetrics}
              setSelectedMetrics={setSelectedMetrics}
              selectedChartType={selectedChartType}
              setSelectedChartType={setSelectedChartType}
            />
          )}
        </div>
      </motion.main>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS - OVERVIEW
// ============================================================================

const OverviewTab = ({
  summary,
  chartData,
  periodChange,
  sectorData,
  assetAllocationData,
  topPositions,
  institutionAllocation,
  riskMetrics,
  concentrationMetrics,
  dividendMetrics,
  timeframe
}) => {
  console.log('OverviewTab: Rendering with data:', {
    hasSummary: !!summary,
    chartDataLength: chartData?.length,
    sectorDataLength: sectorData?.length,
    assetAllocationLength: assetAllocationData?.length
  });

  // Show loading if critical data is missing
  if (!summary || !chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading overview data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumMetricCard
          title="Net Worth"
          subtitle={`${timeframe.toUpperCase()} change`}
          value={summary?.netWorth || 0}
          change={periodChange.percent}
          icon={DollarSign}
          gradient={THEME_COLORS.gradient.primary}
          sparklineData={chartData.map((d) => ({ date: d.date, value: d.netWorth }))}
          infoText="Your net worth is the total value of all your assets minus all liabilities. It's the most important number for tracking your overall financial health and progress toward financial independence. A growing net worth indicates you're building wealth over time."
        />
        <PremiumMetricCard
          title="Total Assets"
          subtitle="All accounts"
          value={summary?.totalAssets || 0}
          change={toFrac(summary?.periodChanges?.['1d']?.totalAssetsPercent)}
          icon={Layers}
          gradient={THEME_COLORS.gradient.success}
          sparklineData={chartData.map((d) => ({ date: d.date, value: d.totalAssets }))}
          infoText="Total Assets represents the sum of everything you own: investments, real estate, cash, cryptocurrencies, and other valuable holdings. Monitoring asset growth helps you understand how your portfolio is expanding before considering debts."
        />
        <PremiumMetricCard
          title="Unrealized Gain/Loss"
          subtitle={
            formatPercent((summary?.unrealizedGainPercent || 0) * 100, false) + ' return'
          }
          value={summary?.unrealizedGain || 0}
          change={toFrac(summary?.periodChanges?.['1d']?.netWorthPercent)}
          icon={TrendingUp}
          gradient={
            (summary?.unrealizedGain || 0) >= 0
              ? THEME_COLORS.gradient.success
              : THEME_COLORS.gradient.danger
          }
          sparklineData={chartData.map((d) => ({
            date: d.date,
            value: d.unrealizedGain || 0
          }))}
          infoText="Unrealized Gain/Loss shows how much profit or loss you have on your investments that you haven't sold yet. This helps you understand your investment performance and whether your strategy is working. Positive gains mean your investments are performing well."
        />
        <PremiumMetricCard
          title="Annual Income"
          subtitle={`${formatPercent((summary?.income?.yield || 0) * 100, false)} yield`}
          value={summary?.income?.annual || 0}
          icon={Droplets}
          gradient={THEME_COLORS.gradient.warning}
          infoText="Annual Income is the total dividends and interest you receive from your investments each year. This passive income is crucial for financial independence - it's money you earn without active work. Higher annual income accelerates your path to FIRE (Financial Independence, Retire Early)."
        />
      </div>

      {/* Performance Rails */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <h3 className="text-lg font-bold text-white mb-4">Performance Across Periods</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['1d', '1w', '1m', 'ytd', '1y'].map((period, idx) => {
            const change = summary?.periodChanges?.[period];
            const isPositive = (change?.netWorth || 0) >= 0;
            return (
              <motion.div
                key={period}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-gray-900/60 rounded-2xl p-4 text-center backdrop-blur-sm border border-gray-700/30"
              >
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {period === '1d'
                    ? '1 Day'
                    : period === '1w'
                    ? '1 Week'
                    : period === '1m'
                    ? '1 Month'
                    : period === 'ytd'
                    ? 'YTD'
                    : '1 Year'}
                </p>
                <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPercent(toFrac(change?.netWorthPercent || 0) * 100, false)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(change?.netWorth || 0, true)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Main Chart */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Portfolio Trend</h3>
          </div>
          <span className="text-sm text-gray-400">{timeframe.toUpperCase()}</span>
        </div>
        <div className="h-96 bg-gray-900/40 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={formatDate}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(v, true)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  padding: '12px'
                }}
                labelFormatter={(date) =>
                  new Date(date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                }
                formatter={(value) => [formatCurrency(value), 'Net Worth']}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#6366f1"
                fill="url(#netWorthGradient)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Asset Allocation & Sector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Pie */}
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <PieChartIcon className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Asset Allocation</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetAllocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetAllocationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        THEME_COLORS.asset[entry.name.toLowerCase()] ||
                        THEME_COLORS.asset.other
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Sector Breakdown */}
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Layers className="w-6 h-6 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Sector Breakdown</h3>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {sectorData.map((sector, idx) => (
              <motion.div
                key={sector.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{sector.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(sector.value, true)}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {sector.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sector.percentage}%` }}
                    transition={{ duration: 1, delay: idx * 0.05 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: SECTOR_COLORS[sector.name] || SECTOR_COLORS.Other
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Institutions */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Top Institutions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutionAllocation?.slice(0, 6).map((inst, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  {inst.institution}
                </span>
                <span className="text-xs text-gray-400">{inst.account_count} accts</span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatCurrency(inst.value, true)}
              </p>
              <p className="text-xs text-gray-500">
                {((inst.percentage || 0) * 100).toFixed(1)}% of portfolio
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS - PERFORMANCE
// ============================================================================

const PerformanceTab = ({
  summary,
  chartData,
  topPerformersAmount,
  topPerformersPercent,
  assetPerformance,
  timeframe
}) => {
  console.log('PerformanceTab: Rendering with data:', {
    hasSummary: !!summary,
    chartDataLength: chartData?.length,
    hasTopPerformersAmount: !!topPerformersAmount,
    hasTopPerformersPercent: !!topPerformersPercent
  });

  if (!summary || !chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  console.log('PerformanceTab: About to render full content');

  return (
    <div className="space-y-6">
      {/* Multi-Metric Chart */}
      <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Net Worth Components</h3>
        </div>
        <div className="h-96 bg-gray-900/40 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="liquidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="retirementGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={formatDate}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(v, true)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '12px'
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value) => [formatCurrency(value), '']}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="altLiquidNetWorth"
                name="Liquid Net Worth"
                stroke="#10b981"
                fill="url(#liquidGradient)"
                strokeWidth={2}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="altRetirementAssets"
                name="Retirement Assets"
                stroke="#8b5cf6"
                fill="url(#retirementGradient)"
                strokeWidth={2}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="altIlliquidNetWorth"
                name="Illiquid Net Worth"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Amount */}
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 backdrop-blur-xl rounded-3xl border border-emerald-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Top Gainers by Amount</h3>
          </div>
          <div className="space-y-3">
            {topPerformersAmount?.slice(0, 5).map((pos, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-900/40 rounded-xl hover:bg-gray-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono text-sm">#{idx + 1}</span>
                  <div>
                    <p className="text-white font-medium">{pos.name || pos.identifier}</p>
                    <p className="text-xs text-gray-400">{pos.asset_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">
                    {formatCurrency(pos.delta || 0)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* By Percent */}
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Percent className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Top Gainers by Percent</h3>
          </div>
          <div className="space-y-3">
            {topPerformersPercent?.slice(0, 5).map((pos, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-900/40 rounded-xl hover:bg-gray-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-mono text-sm">#{idx + 1}</span>
                  <div>
                    <p className="text-white font-medium">{pos.name || pos.identifier}</p>
                    <p className="text-xs text-gray-400">{pos.asset_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-purple-400 font-bold">
                    {formatPercent((pos.percent || 0) * 100, false)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Asset Class Performance */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Asset Class Performance</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary &&
            Object.entries(summary.assetAllocation)
              .filter(([, d]) => d.value > 0)
              .map(([assetType, data]) => {
                const perf = assetPerformance?.[assetType] || {};
                const hasGainLoss = data.gainLoss !== undefined && data.gainLoss !== null;
                return (
                  <motion.div
                    key={assetType}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            THEME_COLORS.asset[assetType] || THEME_COLORS.asset.other
                        }}
                      />
                      <h4 className="text-sm font-semibold text-white capitalize">
                        {assetType}
                      </h4>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">
                      {formatCurrency(data.value, true)}
                    </p>
                    {hasGainLoss && (
                      <p
                        className={`text-sm font-medium ${
                          data.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(data.gainLoss, true)} (
                        {formatPercent((data.gainLossPercent || 0) * 100, false)})
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {['1D', '1W', '1M', 'YTD'].map((period) => {
                          const key =
                            period === '1D'
                              ? 'daily'
                              : period === '1W'
                              ? 'weekly'
                              : period === '1M'
                              ? 'monthly'
                              : 'ytd';
                          const val = perf[key]?.percent_change || 0;
                          return (
                            <div key={period} className="text-center">
                              <p className="text-gray-500">{period}</p>
                              <p
                                className={`font-semibold ${
                                  val >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {val > 0 ? '+' : ''}
                                {val.toFixed(1)}%
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS - ALLOCATION
// ============================================================================

const AllocationTab = ({
  summary,
  sectorData,
  assetAllocationData,
  institutionAllocation
}) => {
  console.log('AllocationTab: Rendering with data:', {
    hasSummary: !!summary,
    sectorDataLength: sectorData?.length,
    assetAllocationLength: assetAllocationData?.length,
    institutionAllocationLength: institutionAllocation?.length
  });

  if (!summary || !assetAllocationData || assetAllocationData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading allocation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asset Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <PieChartIcon className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Asset Allocation</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetAllocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetAllocationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        THEME_COLORS.asset[entry.name.toLowerCase()] ||
                        THEME_COLORS.asset.other
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation Table */}
          <div className="mt-6 space-y-2">
            {assetAllocationData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-900/40 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        THEME_COLORS.asset[item.name.toLowerCase()] ||
                        THEME_COLORS.asset.other
                    }}
                  />
                  <span className="text-sm text-gray-300">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(item.value, true)}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sector Allocation */}
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Layers className="w-6 h-6 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Sector Breakdown</h3>
          </div>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {sectorData.map((sector, idx) => (
              <motion.div
                key={sector.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{sector.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(sector.value, true)}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {sector.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sector.percentage}%` }}
                    transition={{ duration: 1, delay: idx * 0.05 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: SECTOR_COLORS[sector.name] || SECTOR_COLORS.Other
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Institution Allocation */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Institution Allocation</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutionAllocation?.map((inst, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  {inst.institution}
                </span>
                <span className="text-xs text-gray-400">{inst.account_count} accts</span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {formatCurrency(inst.value, true)}
              </p>
              <p className="text-xs text-gray-500">
                {((inst.percentage || 0) * 100).toFixed(1)}% of portfolio
              </p>
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                <p className="text-xs text-gray-400">
                  {inst.position_count || 0} positions
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Asset Class Detail Cards */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Asset Class Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assetAllocationData.map((asset, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor:
                      THEME_COLORS.asset[asset.name.toLowerCase()] ||
                      THEME_COLORS.asset.other
                  }}
                />
                <h4 className="text-base font-semibold text-white">{asset.name}</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Market Value</span>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(asset.value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Cost Basis</span>
                  <span className="text-sm text-gray-300">
                    {formatCurrency(asset.costBasis)}
                  </span>
                </div>
                {asset.gainLoss !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Gain/Loss</span>
                    <span
                      className={`text-sm font-semibold ${
                        asset.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(asset.gainLoss)} (
                      {formatPercent(asset.gainLossPercent, false)})
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-700/50">
                  <span className="text-xs text-gray-400">Positions</span>
                  <span className="text-sm text-gray-300">{asset.count}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS - RISK ANALYSIS
// ============================================================================

const RiskAnalysisTab = ({
  enhancedRiskMetrics,
  concentrationMetrics,
  taxEfficiencyMetrics,
  summary
}) => {
  console.log('RiskAnalysisTab: Rendering with data:', {
    hasEnhancedRiskMetrics: !!enhancedRiskMetrics,
    hasConcentrationMetrics: !!concentrationMetrics,
    hasTaxEfficiencyMetrics: !!taxEfficiencyMetrics,
    hasSummary: !!summary
  });

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading risk analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-red-900/20 to-rose-900/20 backdrop-blur-xl rounded-3xl border border-red-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Wind className="w-6 h-6 text-red-400" />
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Volatility
            </h4>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            {enhancedRiskMetrics
              ? `${enhancedRiskMetrics.volatility.toFixed(2)}%`
              : '—'}
          </p>
          <p className="text-xs text-gray-500">Annualized standard deviation</p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Gauge className="w-6 h-6 text-purple-400" />
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Sharpe Ratio
            </h4>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            {enhancedRiskMetrics ? enhancedRiskMetrics.sharpeRatio.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-gray-500">Risk-adjusted return</p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 backdrop-blur-xl rounded-3xl border border-orange-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="w-6 h-6 text-orange-400" />
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Max Drawdown
            </h4>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            {enhancedRiskMetrics
              ? `-${enhancedRiskMetrics.maxDrawdown.toFixed(2)}%`
              : '—'}
          </p>
          <p className="text-xs text-gray-500">Peak to trough decline</p>
        </motion.div>

        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl border border-blue-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-blue-400" />
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Portfolio Beta
            </h4>
          </div>
          <p className="text-3xl font-bold text-white mb-2">
            {enhancedRiskMetrics ? enhancedRiskMetrics.beta.toFixed(2) : '—'}
          </p>
          <p className="text-xs text-gray-500">Market correlation</p>
        </motion.div>
      </div>

      {/* Concentration Analysis */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Concentration Risk</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-400 mb-2">Top 5 Concentration</p>
            <p className="text-3xl font-bold text-white mb-2">
              {concentrationMetrics?.top_5_concentration
                ? `${(concentrationMetrics.top_5_concentration * 100).toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Of total portfolio</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Largest Position</p>
            <p className="text-3xl font-bold text-white mb-2">
              {concentrationMetrics?.largest_position_weight
                ? `${(concentrationMetrics.largest_position_weight * 100).toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Single holding weight</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Diversification Score</p>
            <p className="text-3xl font-bold text-white mb-2">
              {concentrationMetrics?.herfindahl_index
                ? (100 - concentrationMetrics.herfindahl_index * 100).toFixed(0)
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Higher is better</p>
          </div>
        </div>
      </motion.div>

      {/* Tax Efficiency */}
      {taxEfficiencyMetrics && (
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 backdrop-blur-xl rounded-3xl border border-emerald-500/20 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Tax Efficiency</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-2">Long-Term Holdings</p>
              <p className="text-3xl font-bold text-emerald-400 mb-2">
                {taxEfficiencyMetrics.long_term_percentage
                  ? `${(taxEfficiencyMetrics.long_term_percentage * 100).toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-gray-500">Eligible for lower tax rate</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Tax-Advantaged</p>
              <p className="text-3xl font-bold text-white mb-2">
                {taxEfficiencyMetrics.tax_advantaged_percentage
                  ? `${(taxEfficiencyMetrics.tax_advantaged_percentage * 100).toFixed(
                      1
                    )}%`
                  : '—'}
              </p>
              <p className="text-xs text-gray-500">In retirement accounts</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Unrealized Gains</p>
              <p className="text-3xl font-bold text-white mb-2">
                {taxEfficiencyMetrics.unrealized_gains
                  ? formatCurrency(taxEfficiencyMetrics.unrealized_gains, true)
                  : '—'}
              </p>
              <p className="text-xs text-gray-500">Tax-deferred growth</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Additional Risk Insights */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Portfolio Health Metrics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-400 mb-2">Liquidity Ratio</p>
            <p className="text-3xl font-bold text-white mb-2">
              {summary?.ratios?.liquidRatio
                ? `${(summary.ratios.liquidRatio * 100).toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Liquid assets vs total assets</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Debt-to-Asset Ratio</p>
            <p className="text-3xl font-bold text-white mb-2">
              {summary?.ratios?.debtToAssetRatio
                ? `${(summary.ratios.debtToAssetRatio * 100).toFixed(1)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Total liabilities vs assets</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Total Positions</p>
            <p className="text-3xl font-bold text-white mb-2">
              {summary?.positionStats?.totalCount || '—'}
            </p>
            <p className="text-xs text-gray-500">
              Across {summary?.positionStats?.activeAccountCount || 0} accounts
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS - TOP HOLDINGS
// ============================================================================

const TopHoldingsTab = ({ topPositions, groupedPositions, summary, filters }) => {
  console.log('TopHoldingsTab: Rendering with data:', {
    topPositionsLength: topPositions?.length,
    groupedPositionsLength: groupedPositions?.length,
    hasSummary: !!summary
  });

  const [sortBy, setSortBy] = useState('value');
  const [sortDirection, setSortDirection] = useState('desc');

  const sortedPositions = useMemo(() => {
    if (!topPositions) return [];

    const sorted = [...topPositions].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'value':
          aVal = a.current_value || a.value || 0;
          bVal = b.current_value || b.value || 0;
          break;
        case 'gainLoss':
          aVal = a.gain_loss_amt || 0;
          bVal = b.gain_loss_amt || 0;
          break;
        case 'gainLossPercent':
          aVal = a.gain_loss_percent || 0;
          bVal = b.gain_loss_percent || 0;
          break;
        case 'name':
          aVal = (a.name || a.identifier || '').toLowerCase();
          bVal = (b.name || b.identifier || '').toLowerCase();
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        default:
          aVal = a.current_value || a.value || 0;
          bVal = b.current_value || b.value || 0;
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [topPositions, sortBy, sortDirection]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  if (!topPositions || topPositions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading holdings data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Top Holdings by Value</h3>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Showing {sortedPositions.length} positions
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/60">
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('name')}
                >
                  Position {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('value')}
                >
                  Value {sortBy === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  % Portfolio
                </th>
                <th
                  className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('gainLoss')}
                >
                  Gain/Loss {sortBy === 'gainLoss' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                  onClick={() => handleSort('gainLossPercent')}
                >
                  Return {sortBy === 'gainLossPercent' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {sortedPositions.map((pos, idx) => {
                const portfolioPercent = summary?.totalAssets > 0
                  ? ((pos.current_value || pos.value) / summary.totalAssets) * 100
                  : 0;
                const gainLoss = pos.gain_loss_amt || ((pos.current_value || pos.value) - (pos.cost_basis || 0));
                const gainLossPercent = pos.gain_loss_percent || (pos.cost_basis > 0 ? (gainLoss / pos.cost_basis) * 100 : 0);
                const isPositive = gainLoss >= 0;

                return (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              THEME_COLORS.asset[pos.asset_type] || THEME_COLORS.asset.other
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {pos.name || pos.identifier}
                          </p>
                          <p className="text-xs text-gray-500">{pos.account_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(pos.current_value || pos.value)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm text-gray-300">{portfolioPercent.toFixed(2)}%</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(gainLoss)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(gainLossPercent, false)}
                      </p>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS - CHART BUILDER
// ============================================================================

const ChartBuilderTab = ({
  chartData,
  selectedMetrics,
  setSelectedMetrics,
  selectedChartType,
  setSelectedChartType
}) => {
  console.log('ChartBuilderTab: Rendering with data:', {
    chartDataLength: chartData?.length,
    selectedMetricsCount: selectedMetrics?.length,
    selectedChartType
  });

  // Show loading if critical data is missing
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading chart data...</p>
        </div>
      </div>
    );
  }

  const availableMetrics = [
    { id: 'netWorth', label: 'Net Worth', color: '#6366f1' },
    { id: 'totalAssets', label: 'Total Assets', color: '#10b981' },
    { id: 'liquidAssets', label: 'Liquid Assets', color: '#3b82f6' },
    { id: 'totalLiabilities', label: 'Total Liabilities', color: '#ef4444' },
    { id: 'altLiquidNetWorth', label: 'Liquid Net Worth', color: '#14b8a6' },
    { id: 'altRetirementAssets', label: 'Retirement Assets', color: '#8b5cf6' },
    { id: 'altIlliquidNetWorth', label: 'Illiquid Net Worth', color: '#f59e0b' },
    { id: 'unrealizedGain', label: 'Unrealized Gain/Loss', color: '#ec4899' }
  ];

  const toggleMetric = (metricId) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(metricId)) {
        return prev.filter((m) => m !== metricId);
      }
      return [...prev, metricId].slice(0, 4); // Max 4 metrics
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Custom Chart Builder</h3>
          </div>
          <div className="flex gap-2">
            {['area', 'line', 'bar'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedChartType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  selectedChartType === type
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selection */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
            Select Metrics (max 4)
          </label>
          <div className="flex flex-wrap gap-2">
            {availableMetrics.map((metric) => {
              const isSelected = selectedMetrics.includes(metric.id);
              return (
                <button
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  disabled={!isSelected && selectedMetrics.length >= 4}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'text-white shadow-lg'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                  style={{
                    backgroundColor: isSelected ? metric.color : undefined
                  }}
                >
                  {metric.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div className="h-96 bg-gray-900/40 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            {selectedChartType === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  {selectedMetrics.map((metricId) => {
                    const metric = availableMetrics.find((m) => m.id === metricId);
                    return (
                      <linearGradient
                        key={metricId}
                        id={`gradient-${metricId}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={metric?.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={metric?.color} stopOpacity={0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={formatDate}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Legend />
                {selectedMetrics.map((metricId) => {
                  const metric = availableMetrics.find((m) => m.id === metricId);
                  return (
                    <Area
                      key={metricId}
                      type="monotone"
                      dataKey={metricId}
                      name={metric?.label || metricId}
                      stroke={metric?.color}
                      fill={`url(#gradient-${metricId})`}
                      strokeWidth={2}
                    />
                  );
                })}
              </AreaChart>
            ) : selectedChartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={formatDate}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Legend />
                {selectedMetrics.map((metricId) => {
                  const metric = availableMetrics.find((m) => m.id === metricId);
                  return (
                    <Line
                      key={metricId}
                      type="monotone"
                      dataKey={metricId}
                      name={metric?.label || metricId}
                      stroke={metric?.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  );
                })}
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={formatDate}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => formatCurrency(v, true)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px'
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value) => [formatCurrency(value), '']}
                />
                <Legend />
                {selectedMetrics.map((metricId) => {
                  const metric = availableMetrics.find((m) => m.id === metricId);
                  return (
                    <Bar
                      key={metricId}
                      dataKey={metricId}
                      name={metric?.label || metricId}
                      fill={metric?.color}
                    />
                  );
                })}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-4 p-4 bg-gray-900/40 rounded-xl border border-gray-700/30">
          <p className="text-xs text-gray-400">
            <strong>Tip:</strong> Select up to 4 metrics to compare, and choose between area,
            line, or bar chart types. Click on a metric to add/remove it from the chart.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// TAB COMPONENTS - FINANCIAL PLANNING
// ============================================================================

const PlanningTab = ({ summary, chartData }) => {
  console.log('PlanningTab: Rendering with data:', {
    hasSummary: !!summary,
    chartDataLength: chartData?.length,
    currentNetWorth: summary?.netWorth
  });

  // Show loading if critical data is missing
  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading planning data...</p>
        </div>
      </div>
    );
  }

  // Personal Information State
  const [age, setAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);

  // Income & Expenses State
  const [annualIncome, setAnnualIncome] = useState(100000);
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [annualIncomeGrowth, setAnnualIncomeGrowth] = useState(3);
  const [maxIncome, setMaxIncome] = useState(200000);
  const [cashFlowToMarket, setCashFlowToMarket] = useState(70);
  const [emergencyFund, setEmergencyFund] = useState(10000);
  const [emergencyFundGrowth, setEmergencyFundGrowth] = useState(3);

  // Calculate derived values
  const cashFlow = useMemo(() => annualIncome - annualExpenses, [annualIncome, annualExpenses]);
  const marketInvestment = useMemo(() => (cashFlow * cashFlowToMarket) / 100, [cashFlow, cashFlowToMarket]);
  const cashSavings = useMemo(() => cashFlow - marketInvestment, [cashFlow, marketInvestment]);
  const yearsToRetirement = useMemo(() => retirementAge - age, [retirementAge, age]);
  const retirementYears = useMemo(() => lifeExpectancy - retirementAge, [lifeExpectancy, retirementAge]);

  // FIRE calculation
  const fireNumber = useMemo(() => annualExpenses * 25, [annualExpenses]);
  const currentNetWorth = summary?.netWorth || 0;
  const percentToFire = useMemo(() =>
    fireNumber > 0 ? (currentNetWorth / fireNumber) * 100 : 0,
    [currentNetWorth, fireNumber]
  );

  // Emergency Fund Projection
  const emergencyFundProjection = useMemo(() => {
    const projection = [];
    let currentFund = emergencyFund;
    for (let i = 0; i <= 10; i++) {
      projection.push({
        year: new Date().getFullYear() + i,
        value: currentFund
      });
      currentFund = currentFund * (1 + emergencyFundGrowth / 100);
    }
    return projection;
  }, [emergencyFund, emergencyFundGrowth]);

  return (
    <div className="space-y-6">
      {/* Personal Information Section */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-indigo-500/20">
            <Calculator className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Personal Information</h3>
            <p className="text-sm text-gray-400">Configure your personal details for financial planning</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Current Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Target Retirement Age</label>
            <input
              type="number"
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Life Expectancy</label>
            <input
              type="number"
              value={lifeExpectancy}
              onChange={(e) => setLifeExpectancy(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </motion.div>

      {/* FIRE Explanation & Progress */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 backdrop-blur-xl rounded-3xl border border-emerald-500/20 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <Flame className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">FIRE Progress</h3>
            <p className="text-sm text-gray-400">Financial Independence, Retire Early</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-900/40 rounded-xl border border-emerald-500/10">
          <p className="text-sm text-gray-300 leading-relaxed">
            <strong className="text-emerald-400">What is FIRE?</strong> FIRE (Financial Independence, Retire Early) is achieved when your investment portfolio generates enough passive income to cover your living expenses. The most common rule is the <strong className="text-white">4% Safe Withdrawal Rate</strong>, which means you need approximately <strong className="text-white">25 times your annual expenses</strong> invested to maintain your lifestyle indefinitely without working.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30">
            <p className="text-sm text-gray-400 mb-2">Your FIRE Number</p>
            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(fireNumber)}</p>
            <p className="text-xs text-gray-500 mt-1">25x annual expenses</p>
          </div>
          <div className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30">
            <p className="text-sm text-gray-400 mb-2">Current Net Worth</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(currentNetWorth)}</p>
            <p className="text-xs text-gray-500 mt-1">Total portfolio value</p>
          </div>
          <div className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30">
            <p className="text-sm text-gray-400 mb-2">Progress to FIRE</p>
            <p className="text-3xl font-bold text-indigo-400">{percentToFire.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(fireNumber - currentNetWorth)} to go</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">FIRE Progress</span>
            <span className="text-white font-semibold">{percentToFire.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentToFire, 100)}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Income & Expenses Planning */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-cyan-500/20">
            <Receipt className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Income & Expenses</h3>
            <p className="text-sm text-gray-400">Track your cash flow and investment allocation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              Annual Income
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                <div className="absolute left-0 top-6 hidden group-hover:block w-64 p-3 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-50">
                  <p className="text-xs text-gray-300">Your total yearly income from all sources before taxes</p>
                </div>
              </div>
            </label>
            <input
              type="number"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              Annual Expenses
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                <div className="absolute left-0 top-6 hidden group-hover:block w-64 p-3 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-50">
                  <p className="text-xs text-gray-300">Your total yearly spending on all living expenses</p>
                </div>
              </div>
            </label>
            <input
              type="number"
              value={annualExpenses}
              onChange={(e) => setAnnualExpenses(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              Annual Income Growth Rate (%)
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                <div className="absolute left-0 top-6 hidden group-hover:block w-64 p-3 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-50">
                  <p className="text-xs text-gray-300">Expected yearly increase in your income (raises, promotions, etc.)</p>
                </div>
              </div>
            </label>
            <input
              type="number"
              step="0.1"
              value={annualIncomeGrowth}
              onChange={(e) => setAnnualIncomeGrowth(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              Maximum Expected Income
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                <div className="absolute left-0 top-6 hidden group-hover:block w-64 p-3 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-50">
                  <p className="text-xs text-gray-300">The highest income you realistically expect to reach in your career</p>
                </div>
              </div>
            </label>
            <input
              type="number"
              value={maxIncome}
              onChange={(e) => setMaxIncome(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Cash Flow Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-emerald-900/20 to-green-900/20 rounded-2xl border border-emerald-500/20">
            <p className="text-sm text-gray-400 mb-2">Annual Cash Flow</p>
            <p className={`text-2xl font-bold ${cashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(cashFlow)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Income - Expenses</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl border border-indigo-500/20">
            <p className="text-sm text-gray-400 mb-2">Savings Rate</p>
            <p className="text-2xl font-bold text-indigo-400">
              {annualIncome > 0 ? ((cashFlow / annualIncome) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Cash flow / Income</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-500/20">
            <p className="text-sm text-gray-400 mb-2">Years to FIRE</p>
            <p className="text-2xl font-bold text-amber-400">
              {marketInvestment > 0 && fireNumber > currentNetWorth
                ? Math.ceil((fireNumber - currentNetWorth) / marketInvestment)
                : '∞'}
            </p>
            <p className="text-xs text-gray-500 mt-1">At current rate</p>
          </div>
        </div>

        {/* Investment Allocation */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-400 mb-2 block">
            Cash Flow to Market (%) - Remaining goes to Cash Savings
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={cashFlowToMarket}
              onChange={(e) => setCashFlowToMarket(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-white font-semibold w-16">{cashFlowToMarket}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30">
            <p className="text-sm text-gray-400 mb-2">Annual Market Investment</p>
            <p className="text-2xl font-bold text-indigo-400">{formatCurrency(marketInvestment)}</p>
            <p className="text-xs text-gray-500 mt-1">{cashFlowToMarket}% of cash flow</p>
          </div>
          <div className="p-4 bg-gray-900/40 rounded-2xl border border-gray-700/30">
            <p className="text-sm text-gray-400 mb-2">Annual Cash Savings</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(cashSavings)}</p>
            <p className="text-xs text-gray-500 mt-1">{100 - cashFlowToMarket}% of cash flow</p>
          </div>
        </div>
      </motion.div>

      {/* Emergency Fund Planning */}
      <motion.div
        variants={cardVariants}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-orange-500/20">
            <PiggyBank className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Emergency Fund</h3>
            <p className="text-sm text-gray-400">Build and track your financial safety net</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              Current Emergency Fund
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                <div className="absolute left-0 top-6 hidden group-hover:block w-64 p-3 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-50">
                  <p className="text-xs text-gray-300">Cash reserves for unexpected expenses. Experts recommend 3-6 months of expenses.</p>
                </div>
              </div>
            </label>
            <input
              type="number"
              value={emergencyFund}
              onChange={(e) => setEmergencyFund(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              Annual Growth Rate (%)
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                <div className="absolute left-0 top-6 hidden group-hover:block w-64 p-3 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl z-50">
                  <p className="text-xs text-gray-300">Expected growth from high-yield savings account. Defaults to inflation rate (3%).</p>
                </div>
              </div>
            </label>
            <input
              type="number"
              step="0.1"
              value={emergencyFundGrowth}
              onChange={(e) => setEmergencyFundGrowth(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-orange-900/20 to-amber-900/20 rounded-2xl border border-orange-500/20">
            <p className="text-sm text-gray-400 mb-2">Months of Expenses Covered</p>
            <p className="text-3xl font-bold text-orange-400">
              {annualExpenses > 0 ? ((emergencyFund / (annualExpenses / 12))).toFixed(1) : 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Target: 3-6 months ({formatCurrency((annualExpenses / 12) * 6)})
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-emerald-900/20 to-green-900/20 rounded-2xl border border-emerald-500/20">
            <p className="text-sm text-gray-400 mb-2">Fund Status</p>
            <p className="text-3xl font-bold text-emerald-400">
              {emergencyFund >= (annualExpenses / 12) * 6 ? 'Secure' :
               emergencyFund >= (annualExpenses / 12) * 3 ? 'Good' : 'Build'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Financial safety level</p>
          </div>
        </div>

        {/* Emergency Fund Growth Projection */}
        <div className="h-64 bg-gray-900/40 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={emergencyFundProjection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(v, true)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '12px'
                }}
                formatter={(value) => [formatCurrency(value), 'Emergency Fund']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f97316' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};
