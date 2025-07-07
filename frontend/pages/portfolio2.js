// pages/portfolio2.js
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, 
  Activity, Calendar, Info, ArrowRight, BarChart2, Settings,
  Briefcase, X, AlertCircle, ChevronRight, CreditCard, Droplet, 
  Diamond, Cpu, Landmark, Layers, Shield, Database, Percent, 
  Eye, Gift, Clock, ArrowUp, ArrowDown, Calculator,
  Banknote, Coins, Package, Home, Building2, BarChart3, Sparkles, 
  Wallet, FileText, MessageCircle, Zap, Target, PieChart as PieChartIcon,
  TrendingDownIcon, Gauge, AlertTriangle, DollarSignIcon, MinusCircle, RefreshCw
} from 'lucide-react';

// Import data store hooks
import { usePortfolioSummary, usePortfolioTrends } from '@/store/hooks';

// Time period options for charts
const timeframeOptions = [
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' }
];

// Enhanced color palettes
const assetColors = {
  securities: '#4f46e5', // Indigo
  security: '#4f46e5', // Indigo
  cash: '#10b981',    // Emerald
  crypto: '#8b5cf6',  // Purple
  bond: '#ec4899',    // Pink
  metal: '#f59e0b',   // Amber
  metals: '#f59e0b',   // Amber
  currency: '#3b82f6', // Blue
  real_estate: '#ef4444', // Red
  other: '#6b7280',   // Gray
  other_assets: '#6b7280' // Gray
};

const liabilityColors = {
  credit_card: '#dc2626',
  mortgage: '#7c2d12',
  auto_loan: '#f97316',
  personal_loan: '#ea580c',
  student_loan: '#fb923c',
  home_equity: '#fed7aa',
  other: '#fbbf24'
};

const sectorColors = {
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
  'Unknown': '#9ca3af',
  'Other': '#9ca3af'
};

// Main Dashboard Component
export default function Dashboard() {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [selectedChartType, setSelectedChartType] = useState('value');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  const router = useRouter();
  
  // Get data from the store
  const {
    summary,
    topPositions,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    accountDiversification,
    assetPerformance,
    riskMetrics,
    concentrationMetrics,
    dividendMetrics,
    history,
    loading: isLoading,
    error,
    refresh: refreshData,
    lastFetched
  } = usePortfolioSummary();


  // Get trend data
  const { trends } = usePortfolioTrends();
  
    // Process chart data for visualization
    const chartData = useMemo(() => {
    if (!trends?.chartData || !Array.isArray(trends.chartData)) return [];
    
    return trends.chartData.map(day => ({
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: day.netWorth,
        totalAssets: day.totalAssets,
        totalLiabilities: day.totalLiabilities,
        costBasis: summary?.raw?.total_cost_basis || 0,
        liquidAssets: day.liquidAssets
    }));
    }, [trends?.chartData, summary]);
  
    // Process Net Worth Mix data using alt_ fields
    const netWorthMixData = useMemo(() => {
    if (!summary?.raw) return [];
    
    const raw = summary.raw;
    
    // Use alt_ fields for net values and nw_ fields for percentages
    const mixData = [
        {
        name: 'Securities',
        value: parseFloat(raw.security_value) || 0,
        percentage: parseFloat(raw.nw_securities_mix || 0) * 100,
        color: assetColors.securities
        },
        {
        name: 'Net Cash',
        value: parseFloat(raw.alt_net_worth_net_cash_value) || 0,
        percentage: parseFloat(raw.nw_net_cash_mix || 0) * 100,
        color: assetColors.cash
        },
        {
        name: 'Crypto',
        value: parseFloat(raw.crypto_value) || 0,
        percentage: parseFloat(raw.nw_crypto_mix || 0) * 100,
        color: assetColors.crypto
        },
        {
        name: 'Metals',
        value: parseFloat(raw.metal_value) || 0,
        percentage: parseFloat(raw.nw_metals_mix || 0) * 100,
        color: assetColors.metals
        },
        {
        name: 'Real Estate',
        value: parseFloat(raw.alt_net_worth_value_real_estate) || 0,
        percentage: parseFloat(raw.nw_real_estate_equity_mix || 0) * 100,
        color: assetColors.real_estate
        },
        {
        name: 'Other Assets',
        value: parseFloat(raw.alt_net_worth_net_other_assets) || 0,
        percentage: parseFloat(raw.nw_net_other_assets_mix || 0) * 100,
        color: assetColors.other
        }
    ].filter(item => item.value > 0 || item.percentage > 0);
    
    return mixData;
    }, [summary]);
  
    // Process sector allocation data
    const sectorAllocationData = useMemo(() => {
    if (!rawSectorAllocation || typeof rawSectorAllocation !== 'object') return [];
    
    return Object.entries(rawSectorAllocation)
        .filter(([sector, data]) => data && data.value > 0)
        .map(([sector, data]) => ({
        name: sector || 'Unknown',
        value: data.value,
        percentage: (data.percentage || 0) * 100,
        positionCount: data.position_count || 0
        }))
        .sort((a, b) => b.value - a.value);
    }, [rawSectorAllocation]);

    // Process institution mix data
    const institutionMixData = useMemo(() => {
    if (!rawInstitutionAllocation || !Array.isArray(rawInstitutionAllocation)) return [];
    
    return rawInstitutionAllocation
        .filter(inst => inst && inst.value > 0)
        .map(inst => ({
        name: inst.institution,
        value: inst.value,
        percentage: inst.percentage || 0,
        accountCount: inst.account_count || 0,
        positionCount: inst.position_count || 0,
        color: inst.primary_color || '#6B7280'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    }, [rawInstitutionAllocation]);

    // Process top positions data
    const topPositionsData = useMemo(() => {
    if (!topPositions || !Array.isArray(topPositions)) return [];
    
    return topPositions
        .slice(0, 5)
        .map(pos => ({
        name: pos.name || pos.identifier,
        identifier: pos.identifier,
        value: pos.current_value || pos.value,
        gainLoss: pos.gain_loss || 0,
        gainLossPercent: pos.gain_loss_percent || 0,
        accountName: pos.account_name,
        assetType: pos.asset_type || 'security',
        percentage: pos.percentage || 0
        }));
    }, [topPositions]);
  
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
  
  // Render trend indicator component
  const TrendIndicator = ({ value, size = 'md' }) => {
    if (value === null || value === undefined) return <span className="text-gray-500">-</span>;
    
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };
    
    if (value > 0) {
      return (
        <motion.div 
          className="flex items-center text-green-500"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TrendingUp className={`${sizeClasses[size]} mr-1`} />
          <span>{formatPercentage(value)}</span>
        </motion.div>
      );
    } else if (value < 0) {
      return (
        <motion.div 
          className="flex items-center text-red-500"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TrendingDown className={`${sizeClasses[size]} mr-1`} />
          <span>{formatPercentage(value)}</span>
        </motion.div>
      );
    } else {
      return <span className="text-gray-500">0.00%</span>;
    }
  };
  
  // Timeframe Selector Component
  const TimeframeSelector = ({ options, selected, onChange, className = "" }) => {
    return (
      <div className={`flex p-1 space-x-1 bg-gray-700 dark:bg-gray-800 rounded-lg ${className}`}>
        {options.map((option) => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
              ${selected === option.id 
                ? 'bg-gray-600 dark:bg-gray-700 text-white shadow-sm' 
                : 'text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-white hover:bg-gray-600/50 dark:hover:bg-gray-700/50'
              }
            `}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    );
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 dark:bg-gray-800 p-3 border border-gray-700 dark:border-gray-700 rounded-lg shadow-lg text-white"
        >
          <p className="font-medium text-white">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-indigo-400 dark:text-indigo-400">
              <span className="font-medium">Net Worth: </span> 
              {formatCurrency(payload[0].value)}
            </p>
            {payload.find(p => p.dataKey === 'totalAssets') && (
              <p className="text-sm text-green-400 dark:text-green-400">
                <span className="font-medium">Assets: </span> 
                {formatCurrency(payload.find(p => p.dataKey === 'totalAssets').value)}
              </p>
            )}
            {payload.find(p => p.dataKey === 'totalLiabilities') && payload.find(p => p.dataKey === 'totalLiabilities').value > 0 && (
              <p className="text-sm text-red-400 dark:text-red-400">
                <span className="font-medium">Liabilities: </span> 
                {formatCurrency(payload.find(p => p.dataKey === 'totalLiabilities').value)}
              </p>
            )}
          </div>
        </motion.div>
      );
    }
    return null;
  };
  
  // Allocation Chart Tooltip
  const AllocationTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-700 dark:border-gray-700 text-white"
        >
          <p className="font-medium">{data.name}</p>
          <p className="text-indigo-400 dark:text-indigo-400">{data.percentage.toFixed(1)}%</p>
          <p className="text-gray-300 dark:text-gray-400">{formatCurrency(data.value)}</p>
          {data.count !== undefined && (
            <p className="text-gray-400 text-xs mt-1">{data.count} positions</p>
          )}
        </motion.div>
      );
    }
    return null;
  };
  
  // Dashboard Display Component
  const DashboardContent = () => {
    if (!summary) return null;
    
    // Extract data from processed summary
    const totalAssets = summary.totalAssets || 0;
    const totalLiabilities = summary.totalLiabilities || 0;
    const netWorth = summary.netWorth || 0;
    const totalCostBasis = summary.raw?.total_cost_basis || 0;
    const unrealizedGain = summary.unrealizedGain || 0;
    const unrealizedGainPercent = summary.unrealizedGainPercent || 0;
    const annualIncome = summary.annualIncome || 0;
    const yieldPercentage = summary.yieldPercentage || 0;
    const liquidAssets = summary.liquidAssets || 0;
    const otherAssets = summary.raw?.other_assets_value || 0;
    
    // Get period changes
    const periodChanges = summary.periodChanges || {};
    
    // Time period badge component
    const TimePeriodBadge = ({ label, change, changePercent }) => (
      <motion.div 
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="flex flex-col p-3 rounded-lg bg-gray-700 dark:bg-gray-750 hover:bg-gray-650 transition-all duration-200 cursor-pointer"
      >
        <span className="text-xs text-gray-300 dark:text-gray-400 mb-1">{label}</span>
        <div className="flex items-center justify-between">
          <span className="font-medium text-white dark:text-white">{formatCurrency(change?.netWorth || 0)}</span>
          <span className={`text-xs flex items-center ${(changePercent?.netWorthPercent || 0) > 0 ? 'text-green-500' : (changePercent?.netWorthPercent || 0) < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {(changePercent?.netWorthPercent || 0) > 0 ? (
              <ArrowUp className="h-3 w-3 mr-1" />
            ) : (changePercent?.netWorthPercent || 0) < 0 ? (
              <ArrowDown className="h-3 w-3 mr-1" />
            ) : null}
            {formatPercentage(changePercent?.netWorthPercent || 0)}
          </span>
        </div>
      </motion.div>
    );

    // Asset class card component
    const AssetClassCard = ({ type, data, icon, colorClass }) => (
      <motion.div 
        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
        className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden hover:border-gray-600 transition-all duration-300"
      >
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${colorClass}/10 -mr-10 -mt-10`}></div>
        <div className="flex items-center mb-2">
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className={`${colorClass}/20 p-2 rounded-lg mr-3`}
          >
            {icon}
          </motion.div>
          <h3 className="text-lg font-semibold text-white">{data.name}</h3>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-400">Market Value</p>
            <p className="text-xl font-bold text-white">{formatCurrency(data.value)}</p>
            <p className="text-xs text-gray-500">{formatPercentage(data.percentage * 100)} of portfolio</p>
          </div>
          {type !== 'cash' && type !== 'other' && (
            <>
              <div>
                <p className="text-sm text-gray-400">Cost Basis</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(data.cost_basis)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Performance</p>
                <p className={`text-lg font-semibold ${data.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.gain_loss >= 0 ? '+' : ''}{formatCurrency(data.gain_loss)}
                  <span className="text-sm ml-1">
                    ({data.gain_loss >= 0 ? '+' : ''}{formatPercentage(data.gain_loss_percent * 100)})
                  </span>
                </p>
              </div>
            </>
          )}
          {data.count > 0 && (
            <p className="text-xs text-gray-500 mt-1">{data.count} positions</p>
          )}
        </div>
      </motion.div>
    );

    return (
      <div className="bg-gray-900 dark:bg-gray-900 py-4 rounded-xl mb-8">
        {/* Main dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
          {/* Left column - Summary */}
          <div className="lg:col-span-8 space-y-4">
            {/* Main metrics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Net Worth */}
                <div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-indigo-400" />
                    <p className="text-sm text-gray-300">Net Worth</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(netWorth)}</h3>
                  <div className="flex items-center mt-1">
                    {periodChanges['1d']?.netWorthPercent > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : periodChanges['1d']?.netWorthPercent < 0 ? (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className={`text-sm ml-1 ${periodChanges['1d']?.netWorthPercent > 0 ? 'text-green-500' : periodChanges['1d']?.netWorthPercent < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {formatPercentage(periodChanges['1d']?.netWorthPercent || 0)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">Today</span>
                  </div>
                </div>
                
                {/* Total Assets */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5 text-green-400" />
                    <p className="text-sm text-gray-300">Total Assets</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(totalAssets)}</h3>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-400">
                      {formatCurrency(liquidAssets)} liquid
                    </span>
                  </div>
                </div>
                
                {/* Unrealized Gain */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    <p className="text-sm text-gray-300">Unrealized Gain</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(unrealizedGain)}</h3>
                  <div className="flex items-center mt-1">
                    {unrealizedGainPercent > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ml-1 ${unrealizedGainPercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(unrealizedGainPercent * 100)}
                    </span>
                  </div>
                </div>
                
                {/* Annual Income */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Gift className="h-5 w-5 text-amber-400" />
                    <p className="text-sm text-gray-300">Annual Income</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(annualIncome)}</h3>
                  <div className="flex items-center mt-1">
                    <Percent className="h-4 w-4 text-gray-400" />
                    <span className="text-sm ml-1 text-gray-400">
                      {formatPercentage(yieldPercentage * 100)} yield
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Time period performance metrics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Performance Over Time</h3>
                <span className="text-sm text-gray-400">Net Worth Change</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <TimePeriodBadge 
                  label="1 Day" 
                  change={periodChanges['1d']} 
                  changePercent={periodChanges['1d']} 
                />
                <TimePeriodBadge 
                  label="1 Week" 
                  change={periodChanges['1w']} 
                  changePercent={periodChanges['1w']} 
                />
                <TimePeriodBadge 
                  label="1 Month" 
                  change={periodChanges['1m']} 
                  changePercent={periodChanges['1m']} 
                />
                <TimePeriodBadge 
                  label="YTD" 
                  change={periodChanges['ytd']} 
                  changePercent={periodChanges['ytd']} 
                />
                <TimePeriodBadge 
                  label="1 Year" 
                  change={periodChanges['1y']} 
                  changePercent={periodChanges['1y']} 
                />
              </div>
            </motion.div>
            
            {/* Performance chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Portfolio Value</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedChartType(selectedChartType === 'value' ? 'costBasis' : 'value')}
                    className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors duration-200"
                  >
                    {selectedChartType === 'value' ? 'Show Cost Basis' : 'Hide Cost Basis'}
                  </button>
                  <div className="text-sm text-gray-400">
                    {selectedTimeframe.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#6b7280' }} 
                      axisLine={{ stroke: '#374151' }}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#4f46e5" 
                      fill="url(#colorValue)" 
                      strokeWidth={2}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                    {selectedChartType === 'costBasis' && (
                      <Area 
                        type="monotone" 
                        dataKey="costBasis" 
                        stroke="#10b981" 
                        fill="url(#colorCost)" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    )}
                    <ReferenceLine 
                      y={chartData[0]?.value || 0} 
                      stroke="#374151" 
                      strokeDasharray="3 3" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
            
            {/* Asset Class Allocation Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <h2 className="text-lg font-semibold mb-4 text-white">Asset Allocation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Securities */}
                {summary.assetAllocation?.securities && (
                  <AssetClassCard
                    type="security"
                    data={{
                      ...summary.assetAllocation.securities,
                      name: 'Securities'
                    }}
                    icon={<LineChart className="h-5 w-5 text-blue-400" />}
                    colorClass="bg-blue-500"
                  />
                )}
                
                {/* Cash */}
                {summary.assetAllocation?.cash && (
                  <AssetClassCard
                    type="cash"
                    data={{
                      ...summary.assetAllocation.cash,
                      name: 'Cash'
                    }}
                    icon={<Banknote className="h-5 w-5 text-green-400" />}
                    colorClass="bg-green-500"
                  />
                )}

                {/* Crypto */}
                {summary.assetAllocation?.crypto && (
                  <AssetClassCard
                    type="crypto"
                    data={{
                      ...summary.assetAllocation.crypto,
                      name: 'Crypto'
                    }}
                    icon={<Coins className="h-5 w-5 text-purple-400" />}
                    colorClass="bg-purple-500"
                  />
                )}

                {/* Metals */}
                {summary.assetAllocation?.metals && summary.assetAllocation.metals.value > 0 && (
                  <AssetClassCard
                    type="metal"
                    data={{
                      ...summary.assetAllocation.metals,
                      name: 'Metals'
                    }}
                    icon={<Package className="h-5 w-5 text-amber-400" />}
                    colorClass="bg-amber-500"
                  />
                )}

                {/* Other Assets */}
                {summary.assetAllocation?.other && summary.assetAllocation.other.value > 0 && (
                  <AssetClassCard
                    type="other"
                    data={{
                      ...summary.assetAllocation.other,
                      name: 'Other Assets'
                    }}
                    icon={<Home className="h-5 w-5 text-red-400" />}
                    colorClass="bg-red-500"
                  />
                )}
              </div>
            </motion.div>

            {/* Other Assets and Liabilities Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Other Assets Card */}
              {otherAssets > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Home className="h-5 w-5 text-red-400 mr-2" />
                      Other Assets
                    </h3>
                    <span className="text-lg font-bold text-red-400">
                      {formatCurrency(otherAssets)}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Total Value</span>
                      <span className="text-white font-medium">{formatCurrency(otherAssets)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Cost Basis</span>
                      <span className="text-white font-medium">{formatCurrency(summary.raw?.other_assets_cost_basis || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Gain/Loss</span>
                      <span className={`font-medium ${summary.raw?.other_assets_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(summary.raw?.other_assets_gain_loss || 0)}
                        <span className="text-xs ml-1">
                          ({formatPercentage((summary.raw?.other_assets_gain_loss_percent || 0) * 100)})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Count</span>
                      <span className="text-white font-medium">{summary.raw?.other_assets_count || 0}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-500">
                        {formatPercentage((otherAssets / totalAssets) * 100)} of total assets
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Liabilities Card */}
              {totalLiabilities > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <MinusCircle className="h-5 w-5 text-red-400 mr-2" />
                      Liabilities
                    </h3>
                    <span className="text-lg font-bold text-red-400">
                      -{formatCurrency(totalLiabilities)}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Liability breakdown */}
                    {summary.raw?.credit_card_liabilities > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 text-red-400 mr-2" />
                          <span className="text-sm text-gray-300">Credit Cards</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(summary.raw.credit_card_liabilities)}</span>
                      </div>
                    )}
                    {summary.raw?.mortgage_liabilities > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Home className="h-4 w-4 text-orange-400 mr-2" />
                          <span className="text-sm text-gray-300">Mortgage</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(summary.raw.mortgage_liabilities)}</span>
                      </div>
                    )}
                    {summary.raw?.loan_liabilities > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-yellow-400 mr-2" />
                          <span className="text-sm text-gray-300">Loans</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(summary.raw.loan_liabilities)}</span>
                      </div>
                    )}
                    {summary.raw?.other_liabilities_value > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-300">Other</span>
                        </div>
                        <span className="text-white font-medium">{formatCurrency(summary.raw.other_liabilities_value)}</span>
                      </div>
                    )}
                    
                    {/* Debt to Asset Ratio */}
                    <div className="pt-3 mt-3 border-t border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Debt to Asset Ratio</span>
                        <span className={`font-medium ${(riskMetrics?.debt_to_asset_ratio || 0) < 0.3 ? 'text-green-400' : (riskMetrics?.debt_to_asset_ratio || 0) < 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {formatPercentage((riskMetrics?.debt_to_asset_ratio || 0) * 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Portfolio Insights with Risk Metrics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Portfolio Insights</h3>
                <Shield className="h-5 w-5 text-indigo-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Left column - stats */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div>
                      <span className="text-xs text-gray-300 dark:text-gray-400">Total Positions</span>
                      <p className="font-medium text-white dark:text-white">{summary.raw?.total_position_count || 0}</p>
                    </div>
                    <Layers className="h-5 w-5 text-indigo-400" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div>
                      <span className="text-xs text-gray-300 dark:text-gray-400">Active Accounts</span>
                      <p className="font-medium text-white dark:text-white">{summary.raw?.active_account_count || 0}</p>
                    </div>
                    <Briefcase className="h-5 w-5 text-indigo-400" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div>
                      <span className="text-xs text-gray-300 dark:text-gray-400">Liquidity Ratio</span>
                      <p className="font-medium text-white dark:text-white">
                        {formatPercentage((riskMetrics?.liquidity_ratio || 0) * 100)}
                      </p>
                    </div>
                    <Droplet className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
                
                {/* Right column - risk metrics */}
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div className="flex items-center space-x-2 mb-1">
                      <Gauge className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-white dark:text-white">Concentration Risk</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 dark:text-gray-300">Top 5 Positions</span>
                        <span className={`${(concentrationMetrics?.top_5_concentration || 0) > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {formatPercentage((concentrationMetrics?.top_5_concentration || 0) * 100)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 dark:text-gray-300">Largest Position</span>
                        <span className={`${(concentrationMetrics?.largest_position_weight || 0) > 0.2 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {formatPercentage((concentrationMetrics?.largest_position_weight || 0) * 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm font-medium text-white dark:text-white">Risk Metrics</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 dark:text-gray-300">Portfolio Beta</span>
                        <span className="text-gray-300">{(riskMetrics?.portfolio_beta || 1).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 dark:text-gray-300">Est. Volatility</span>
                        <span className="text-gray-300">{formatPercentage((riskMetrics?.volatility_estimate || 0) * 100)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Right column - Allocation & Details */}
          <div className="lg:col-span-4 space-y-4">
            {/* Net Worth Mix - Updated to use alt_ fields */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Net Worth Mix</h3>
                <PieChartIcon className="h-5 w-5 text-indigo-400" />
              </div>
              
              {/* Donut chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={netWorthMixData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {netWorthMixData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="mt-2 space-y-2">
                {netWorthMixData.map((entry, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-white">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">{entry.percentage.toFixed(1)}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Net worth breakdown */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Net Worth</h3>
                <div className="h-8 px-3 rounded-md bg-indigo-900 dark:bg-indigo-900 flex items-center">
                  <span className="text-sm font-medium text-indigo-300 dark:text-indigo-300">
                    {formatCurrency(netWorth)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400 dark:text-gray-400">Total Assets</span>
                    <span className="font-medium text-white">{formatCurrency(totalAssets)}</span>
                  </div>
                  <div className="h-2 bg-gray-700 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
                
                {totalLiabilities > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400 dark:text-gray-400">Liabilities</span>
                      <span className="font-medium text-white">{formatCurrency(totalLiabilities)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((totalLiabilities / totalAssets) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        className="h-full bg-red-500 rounded-full"
                      />
                    </div>
                  </div>
                )}
                
                <div className="pt-2 mt-2 border-t border-gray-700 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Net Worth</span>
                    <span className="font-bold text-indigo-400 dark:text-indigo-400">{formatCurrency(netWorth)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Liquid vs Illiquid */}
            {liquidAssets > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Liquidity Analysis</h3>
                  <Droplet className="h-5 w-5 text-blue-400" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Liquid Assets</span>
                    <span className="font-medium text-white">{formatCurrency(liquidAssets)}</span>
                  </div>
                  
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(liquidAssets / totalAssets) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                  
                  {otherAssets > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Illiquid Assets</span>
                        <span className="font-medium text-white">{formatCurrency(otherAssets)}</span>
                      </div>
                      
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(otherAssets / totalAssets) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                          className="h-full bg-gray-500 rounded-full"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="pt-2 mt-2 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      {formatPercentage((liquidAssets / totalAssets) * 100)} of assets are liquid
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Top Positions Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5 relative"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-rose-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-3">
                <div className="bg-rose-500/20 p-2 rounded-lg mr-3">
                  <BarChart3 className="h-5 w-5 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Top Positions</h3>
              </div>
              
              <div className="space-y-3">
                {topPositionsData && topPositionsData.length > 0 ? (
                  topPositionsData.map((position, index) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors"
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div 
                          className="h-3 w-3 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: assetColors[position.assetType] || assetColors.other }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-300 truncate">{position.name || position.identifier}</p>
                          <p className="text-xs text-gray-500">{position.accountName}</p>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-medium text-white">{formatCurrency(position.value)}</p>
                        <p className={`text-xs ${position.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercentage(position.gainLossPercent * 100)}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-400">No position data available</div>
                )}
              </div>
            </motion.div>
            
            {/* Top Institutions Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5 relative"
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg mr-3">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Top Institutions</h3>
              </div>
              
              <div className="space-y-3">
                {institutionMixData && institutionMixData.length > 0 ? (
                  institutionMixData.map((institution, index) => (
                    <motion.div 
                      key={index} 
                      className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors"
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-center">
                        <div 
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: institution.color }}
                        />
                        <div>
                          <p className="text-sm text-gray-300">{institution.name}</p>
                          <p className="text-xs text-gray-500">
                            {institution.accountCount} {institution.accountCount === 1 ? 'account' : 'accounts'} • {institution.positionCount} positions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{formatPercentage(institution.percentage * 100)}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-400">No institution data available</div>
                )}
              </div>
            </motion.div>

            {/* Dividend Metrics */}
            {dividendMetrics && annualIncome > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Income Analysis</h3>
                  <Gift className="h-5 w-5 text-amber-400" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Annual Income</span>
                    <span className="font-medium text-white">{formatCurrency(annualIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Quarterly Income</span>
                    <span className="font-medium text-white">{formatCurrency(dividendMetrics.quarterly_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Dividend Yield</span>
                    <span className="font-medium text-amber-400">{formatPercentage(yieldPercentage * 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Income Positions</span>
                    <span className="font-medium text-white">{dividendMetrics.dividend_count}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Sector Allocation */}
            {sectorAllocationData.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.5, delay: 0.6 }}
               className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
             >
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-white">Sector Breakdown</h3>
                 <PieChartIcon className="h-5 w-5 text-indigo-400" />
               </div>
               
               <div className="space-y-2">
                 {sectorAllocationData.map((sector, index) => (
                   <motion.div 
                     key={index} 
                     className="flex items-center justify-between hover:bg-gray-700/50 p-1 rounded transition-colors"
                     whileHover={{ x: 2 }}
                   >
                     <div className="flex items-center flex-1">
                       <div 
                         className="h-2 w-2 rounded-full mr-2" 
                         style={{ backgroundColor: sectorColors[sector.name] || sectorColors.Other }}
                       />
                       <span className="text-xs text-gray-300">{sector.name}</span>
                     </div>
                     <div className="flex items-center space-x-2">
                       <span className="text-xs text-gray-500">{sector.positionCount} pos</span>
                       <span className="text-xs font-medium text-white w-12 text-right">
                         {sector.percentage.toFixed(1)}%
                       </span>
                     </div>
                   </motion.div>
                 ))}
               </div>
             </motion.div>
           )}
         </div>
       </div>
     </div>
   );
 };

 // Loading State
 if (isLoading && !summary) {
   return (
     <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800">
       <motion.div
         animate={{ rotate: 360 }}
         transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
         className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full"
       />
       <motion.p 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.5 }}
         className="mt-4 text-gray-300 dark:text-gray-300"
       >
         Loading your financial dashboard...
       </motion.p>
     </div>
   );
 }
 
 // Error State
 if (error && !summary) {
   return (
     <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800 p-4">
       <motion.div 
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         transition={{ type: "spring", stiffness: 260, damping: 20 }}
         className="text-red-500 dark:text-red-400 mb-4"
       >
         <AlertCircle size={48} />
       </motion.div>
       <h1 className="text-2xl font-bold text-white dark:text-white mb-2">Unable to Load Dashboard</h1>
       <p className="text-gray-300 dark:text-gray-300 mb-6 text-center max-w-md">{error}</p>
       <motion.button 
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         onClick={refreshData}
         className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
       >
         Retry
       </motion.button>
     </div>
   );
 }
 
 return (
   <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white transition-colors duration-200">
     <Head>
       <title>NestEgg | Financial Dashboard</title>
       <meta name="description" content="Your personal financial dashboard" />
       <link rel="icon" href="/favicon.ico" />
     </Head>

     <main className="container mx-auto px-4 py-8">
       {/* Welcome Banner */}
       <AnimatePresence>
         {showWelcomeBanner && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="relative bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl p-0.5 mb-6 shadow-2xl"
           >
             <div className="bg-gray-900 rounded-2xl p-4 md:p-5 relative overflow-hidden">
               {/* Animated background pattern */}
               <div className="absolute inset-0 opacity-10">
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20"></div>
               </div>
               
               {/* Close button in top right */}
               <button 
                 onClick={() => setShowWelcomeBanner(false)}
                 className="absolute top-3 right-3 z-10 p-1.5 bg-gray-800/80 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/80 transition-all duration-200"
               >
                 <X size={16} />
               </button>
               
               <div className="relative z-10">
                 <div className="flex items-center space-x-3 mb-3">
                   <motion.div
                     animate={{ rotate: [0, 10, -10, 0] }}
                     transition={{ duration: 4, repeat: Infinity }}
                     className="p-2 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl shadow-lg"
                   >
                     <Sparkles className="w-5 h-5 text-white" />
                   </motion.div>
                   <div className="pr-8">
                     <h1 className="text-lg md:text-xl font-bold text-white">
                       Welcome to NestEgg - Your Financial Command Center 🚀
                     </h1>
                     <p className="text-gray-400 text-sm mt-0.5">
                       Track net worth, analyze performance, and optimize your portfolio.
                     </p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-5 gap-2">
                   <motion.button 
                     whileHover={{ y: -2, scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     className="group relative bg-gray-800/50 hover:bg-gray-700/70 rounded-xl p-3 transition-all duration-200 border border-gray-700 hover:border-blue-500 overflow-hidden"
                     onClick={() => router.push('/positions')}
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     <div className="relative z-10">
                       <TrendingUp className="w-4 h-4 text-blue-400 mb-1.5 mx-auto" />
                       <div className="text-white font-medium text-sm">Positions</div>
                       <div className="text-gray-400 text-xs">View holdings</div>
                     </div>
                   </motion.button>
                   
                   <motion.button 
                     whileHover={{ y: -2, scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     className="group relative bg-gray-800/50 hover:bg-gray-700/70 rounded-xl p-3 transition-all duration-200 border border-gray-700 hover:border-green-500 overflow-hidden"
                     onClick={() => router.push('/accounts')}
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     <div className="relative z-10">
                       <Wallet className="w-4 h-4 text-green-400 mb-1.5 mx-auto" />
                       <div className="text-white font-medium text-sm">Accounts</div>
                       <div className="text-gray-400 text-xs">Manage funds</div>
                     </div>
                   </motion.button>
                   
                   <motion.button 
                     whileHover={{ y: -2, scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     className="group relative bg-gray-800/50 hover:bg-gray-700/70 rounded-xl p-3 transition-all duration-200 border border-gray-700 hover:border-purple-500 overflow-hidden"
                     onClick={() => router.push('/portfolio-command-center')}
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     <div className="relative z-10">
                       <BarChart3 className="w-4 h-4 text-purple-400 mb-1.5 mx-auto" />
                       <div className="text-white font-medium text-sm">Analytics</div>
                       <div className="text-gray-400 text-xs">Deep insights</div>
                     </div>
                   </motion.button>
                   
                   <motion.button 
                     whileHover={{ y: -2, scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     className="group relative bg-gray-800/50 hover:bg-gray-700/70 rounded-xl p-3 transition-all duration-200 border border-gray-700 hover:border-orange-500 overflow-hidden"
                     onClick={() => router.push('/reports')}
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     <div className="relative z-10">
                       <FileText className="w-4 h-4 text-orange-400 mb-1.5 mx-auto" />
                       <div className="text-white font-medium text-sm">Reports</div>
                       <div className="text-gray-400 text-xs">Performance</div>
                     </div>
                   </motion.button>

                   <motion.button 
                     whileHover={{ y: -2, scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     className="group relative bg-gray-800/50 hover:bg-gray-700/70 rounded-xl p-3 transition-all duration-200 border border-gray-700 hover:border-pink-500 overflow-hidden"
                     onClick={() => router.push('/overview')}
                   >
                     <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     <div className="relative z-10">
                       <MessageCircle className="w-4 h-4 text-pink-400 mb-1.5 mx-auto" />
                       <div className="text-white font-medium text-sm">Overview</div>
                       <div className="text-gray-400 text-xs">How it works</div>
                     </div>
                   </motion.button>
                 </div>
                 
                 {/* Animated dots indicator */}
                 <div className="mt-3 flex justify-center">
                   <div className="flex space-x-1">
                     {[0, 1, 2, 3, 4].map((i) => (
                       <motion.div
                         key={i}
                         animate={{ opacity: [0.3, 1, 0.3] }}
                         transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                         className="w-1 h-1 bg-gray-600 rounded-full"
                       />
                     ))}
                   </div>
                 </div>
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Portfolio Summary */}
       <div className="mb-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
           <div>
             <h2 className="text-3xl font-bold text-white mb-1">Portfolio Overview</h2>
             <p className="text-gray-400">
               Last updated: {lastFetched ? new Date(lastFetched).toLocaleString() : 'Not available'}
             </p>
           </div>
           <div className="flex space-x-4 items-center mt-4 md:mt-0">
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={refreshData}
               disabled={isLoading}
               className={`px-4 py-2 bg-indigo-600 text-white rounded-lg transition-all flex items-center space-x-2 ${
                 isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
               }`}
             >
               <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
               <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
             </motion.button>
             <TimeframeSelector
               options={timeframeOptions}
               selected={selectedTimeframe}
               onChange={setSelectedTimeframe}
             />
           </div>
         </div>

         {/* Dashboard Content */}
         <DashboardContent />
       </div>

       {/* Quick Actions Footer */}
       <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <motion.button 
           whileHover={{ scale: 1.02, y: -2 }}
           whileTap={{ scale: 0.98 }}
           onClick={() => router.push('/accounts')}
           className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
         >
           <Briefcase className="h-5 w-5" />
           <span>Manage Accounts</span>
         </motion.button>
         
         <motion.button 
           whileHover={{ scale: 1.02, y: -2 }}
           whileTap={{ scale: 0.98 }}
           onClick={() => router.push('/positions')}  
           className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
         >
           <DollarSign className="h-5 w-5" />
           <span>View Positions</span> 
         </motion.button>
         
         <motion.button 
           whileHover={{ scale: 1.02, y: -2 }}
           whileTap={{ scale: 0.98 }}
           onClick={() => router.push('/reports')}
           className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
         >
           <BarChart2 className="h-5 w-5" />
           <span>View Reports</span>
         </motion.button>
         
         <motion.button 
           whileHover={{ scale: 1.02, y: -2 }}
           whileTap={{ scale: 0.98 }}
           onClick={() => router.push('/settings')}
           className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg"
         >
           <Settings className="h-5 w-5" />
           <span>Settings</span>
         </motion.button>
       </div>
     </main>
   </div>
 );
}