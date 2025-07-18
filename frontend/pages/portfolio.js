// pages/portfolio2.js
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDataStore } from '@/store/DataStore';
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
  real_estate: '#14b8a6', // Teal
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
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  const [showInThousands, setShowInThousands] = useState(true);
  const router = useRouter();
  const { state } = useDataStore();
  
  // Get data from the store
  const {
    summary,
    topPositions,
    topPerformersAmount,  // Add this
    topPerformersPercent, // Add this
    accountDiversification,
    assetPerformance,     // This is assetPerformanceDetail from the store
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    riskMetrics,
    concentrationMetrics,
    dividendMetrics,
    taxEfficiencyMetrics, // Add this if you want to use it
    netCashBasisMetrics,
    history,
    loading: isLoading,
    error,
    refresh: refreshData,
    lastFetched,
    isStale,             // Add this
    markStale            // Add this
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
      costBasis: summary?.totalCostBasis || 0,
      liquidAssets: day.liquidAssets
    }));
  }, [trends?.chartData, summary]);
  
  const cashFlowTrendData = useMemo(() => {
    const historyData = [];
    
    // Process historical data if available
    if (history && history.length > 0) {
      historyData.push(...history
        .filter(item => item.net_cash_basis_metrics?.net_cash_position !== null && 
                        item.net_cash_basis_metrics?.net_cash_position !== undefined)
        .map(item => ({
          date: item.date || item.snapshot_date,
          displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          netCashPosition: item.net_cash_basis_metrics.net_cash_position,
          change: item.net_cash_basis_metrics.cash_flow_1d || 0,
          changePercent: item.net_cash_basis_metrics.cash_flow_1d_pct || 0
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date)));
    }
    
    // If we have current netCashBasisMetrics but no history, create a single point
    if (historyData.length === 0 && netCashBasisMetrics?.net_cash_position) {
      historyData.push({
        date: new Date().toISOString().split('T')[0],
        displayDate: 'Today',
        netCashPosition: netCashBasisMetrics.net_cash_position,
        change: 0,
        changePercent: 0
      });
    }
    
    console.log('Cash flow trend data:', historyData); // Debug log
    return historyData;
  }, [history, netCashBasisMetrics]);



      // Add this right after you destructure from usePortfolioSummary
      useEffect(() => {
        console.log('Raw history data:', history);
        console.log('History length:', history?.length);
        
        // Log first few history items to see structure
        if (history && history.length > 0) {
          console.log('First history item:', history[0]);
          console.log('First history net_cash_basis_metrics:', history[0].net_cash_basis_metrics);
          
          // Check if we have net_cash_position in history
          const itemsWithCashPosition = history.filter(item => 
            item.net_cash_basis_metrics?.net_cash_position !== null && 
            item.net_cash_basis_metrics?.net_cash_position !== undefined
          );
          console.log('Items with net_cash_position:', itemsWithCashPosition.length);
        }
      }, [history]);

      // Add this near the top of your component
      useEffect(() => {
        console.log('Portfolio Summary State:', {
          loading: isLoading,
          error: error,
          hasHistory: history && history.length > 0,
          hasNetCashMetrics: !!netCashBasisMetrics,
          historySample: history?.[0]
        });
      }, [isLoading, error, history, netCashBasisMetrics]);

      // Also add this right after cashFlowTrendData is created
      useEffect(() => {
        console.log('Processed cashFlowTrendData:', cashFlowTrendData);
        console.log('cashFlowTrendData length:', cashFlowTrendData.length);
      }, [cashFlowTrendData]);
  // Process Net Worth Mix data
  const netWorthMixData = useMemo(() => {
    if (!summary) return [];
    
    const mixData = [
      {
        name: 'Securities',
        value: summary.assetAllocation.securities.value,
        percentage: summary.netWorthMix.securities * 100,
        color: assetColors.securities
      },
      {
        name: 'Net Cash',
        value: summary.altNetWorth.netCash,
        percentage: summary.netWorthMix.netCash * 100,
        color: assetColors.cash
      },
      {
        name: 'Crypto',
        value: summary.assetAllocation.crypto.value,
        percentage: summary.netWorthMix.crypto * 100,
        color: assetColors.crypto
      },
      {
        name: 'Metals',
        value: summary.assetAllocation.metals.value,
        percentage: summary.netWorthMix.metals * 100,
        color: assetColors.metals
      },
      {
        name: 'Real Estate',
        value: summary.altNetWorth.realEstate,
        percentage: summary.netWorthMix.realEstateEquity * 100,
        color: assetColors.real_estate
      },
      {
        name: 'Other Assets',
        value: summary.altNetWorth.netOtherAssets,
        percentage: summary.netWorthMix.netOtherAssets * 100,
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
  const formatCurrency = (value, inThousands = false) => {
    if (value === null || value === undefined) return '-';
    
    if (inThousands) {
      const thousands = value / 1000;
      return `$${thousands.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })}k`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true 
    }).format(value);
  };
  
  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
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
  
  // Custom tooltip for asset chart
  const AssetTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const assetValue = payload.find(p => p.dataKey === 'totalAssets')?.value || 0;
      const costBasis = payload.find(p => p.dataKey === 'costBasis')?.value || 0;
      const unrealizedGain = assetValue - costBasis;
      const unrealizedGainPercent = costBasis > 0 ? ((unrealizedGain / costBasis) * 100) : 0;

      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 dark:bg-gray-800 p-3 border border-gray-700 dark:border-gray-700 rounded-lg shadow-lg text-white"
        >
          <p className="font-medium text-white mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-indigo-400 dark:text-indigo-400">
              <span className="font-medium">Asset Value: </span> 
              {formatCurrency(assetValue)}
            </p>
            <p className="text-sm text-emerald-400 dark:text-emerald-400">
              <span className="font-medium">Cost Basis: </span> 
              {formatCurrency(costBasis)}
            </p>
            <div className="border-t border-gray-600 mt-2 pt-2">
              <p className={`text-sm font-medium ${unrealizedGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span>Unrealized: </span> 
                {formatCurrency(unrealizedGain)} ({formatPercentage(unrealizedGainPercent)})
              </p>
            </div>
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

  // Asset class card component
  const AssetClassCard = ({ type, data, icon, colorClass }) => {
    // Get performance data for different periods
      const performanceData = {
        '1D': data.daily?.percent_change || 0,
        '1W': data.weekly?.percent_change || 0,
        '1M': data.monthly?.percent_change || 0,
        'YTD': data.ytd?.percent_change || 0,
        '1Y': data.yearly?.percent_change || 0,
      };

    return (
      <motion.div 
        whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
        className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden hover:border-gray-600 transition-all duration-300"
      >
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${colorClass}/10 -mr-10 -mt-10`}></div>
        <div className="flex justify-between items-start">
          <div className="flex-1">
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
                <p className="text-sm text-gray-400">
                  {type === 'liability' ? 'Outstanding Balance' : 'Market Value'}
                </p>
                <p className="text-xl font-bold text-white">
                  {type === 'liability' ? '-' : ''}{formatCurrency(Math.abs(data.value))}
                </p>
                <p className="text-xs text-gray-500">
                  {data.percentage > 0 ? `${formatPercentage(data.percentage * 100)} of ${type === 'liability' ? 'liabilities' : 'portfolio'}` : 'No holdings'}
                </p>
              </div>
              
              {/* Show cost basis for assets and liabilities */}
              {(type !== 'cash' || type === 'liability') && data.costBasis !== undefined && (
                <div>
                  <p className="text-sm text-gray-400">
                    {type === 'liability' ? 'Original Amount' : 'Cost Basis'}
                  </p>
                  <p className="text-lg font-semibold text-white">{formatCurrency(data.costBasis)}</p>
                </div>
              )}
              
              {/* Show performance for non-cash assets */}
              {type !== 'cash' && type !== 'liability' && data.gainLoss !== undefined && (
                <div>
                  <p className="text-sm text-gray-400">Gain or Loss</p>
                  <p className={`text-lg font-semibold ${data.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss)}
                    {data.gainLossPercent !== undefined && (
                      <span className="text-sm ml-1">
                        ({formatPercentage(data.gainLossPercent * 100)})
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              {/* Show count if available */}
              {data.count !== undefined && data.count > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {data.count} {type === 'liability' ? 'liabilities' : 'positions'}
                </p>
              )}
            </div>
          </div>

          {/* Performance Timeline - Right Side */}
          {type !== 'liability' && (
            <div className="ml-4 flex-col space-y-1.5 min-w-[80px] hidden sm:flex">
              <div className="text-xs font-medium text-gray-500 mb-1 text-right">Performance</div>
              {Object.entries(performanceData).map(([period, value]) => (
                <motion.div 
                  key={period}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between space-x-2"
                >
                  <span className="text-xs text-gray-500">{period}</span>
                  <motion.span 
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      value > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : value < 0 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-gray-600/20 text-gray-400'
                    }`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {value > 0 ? '+' : ''}{value.toFixed(1)}%
                  </motion.span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Mobile Performance - Show below main content */}
          {type !== 'liability' && (
            <div className="mt-3 pt-3 border-t border-gray-700 flex sm:hidden">
              <div className="flex flex-wrap gap-2 w-full">
                {Object.entries(performanceData).map(([period, value]) => (
                  <div key={period} className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">{period}:</span>
                    <span className={`text-xs font-medium ${
                      value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {value > 0 ? '+' : ''}{value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // Dashboard Display Component
  const DashboardContent = () => {
    if (!summary) return null;
    
    // Extract data from processed summary
    const totalAssets = summary.totalAssets;
    const totalLiabilities = summary.liabilities.total;
    const netWorth = summary.netWorth;
    const totalCostBasis = summary.totalCostBasis;
    const unrealizedGain = summary.unrealizedGain;
    const unrealizedGainPercent = summary.unrealizedGainPercent;
    const annualIncome = summary.income.annual;
    const yieldPercentage = summary.income.yield;
    const liquidAssets = summary.liquidAssets;
    const otherAssets = summary.otherAssets;
    
    // Get period changes
    const periodChanges = summary.periodChanges;
    
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
            {formatPercentage((changePercent?.netWorthPercent || 0) * 100)}
          </span>
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
                      {(periodChanges['1d']?.netWorthPercent || 0) > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (periodChanges['1d']?.netWorthPercent || 0) < 0 ? (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span className={`text-sm ml-1 ${(periodChanges['1d']?.netWorthPercent || 0) > 0 ? 'text-green-500' : (periodChanges['1d']?.netWorthPercent || 0) < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {periodChanges['1d']?.netWorthPercent !== null && periodChanges['1d']?.netWorthPercent !== undefined 
                          ? formatPercentage(periodChanges['1d'].netWorthPercent * 100)
                          : 'N/A'
                        } Today
                      </span>
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
                <h3 className="text-lg font-semibold text-white">Trended Net Worth</h3>
                <div className="text-sm text-gray-400">
                  {selectedTimeframe.toUpperCase()}
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
                    <ReferenceLine 
                      y={chartData[0]?.value || 0} 
                      stroke="#374151" 
                      strokeDasharray="3 3" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
            
            {/* Asset Value Chart - NEW */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Asset Value & Cost Basis</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 mr-1"></div>
                      <span className="text-gray-400">Asset Value</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 mr-1"></div>
                      <span className="text-gray-400">Cost Basis</span>
                    </div>
                  </div>
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
                      <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBasis" x1="0" y1="0" x2="0" y2="1">
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
                    <Tooltip content={<AssetTooltip />} />
                    <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="totalAssets" 
                      stroke="#4f46e5" 
                      fill="url(#colorAssets)" 
                      strokeWidth={2}
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="costBasis" 
                      stroke="#10b981" 
                      fill="url(#colorBasis)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    {/* Reference line for starting asset value */}
                    <ReferenceLine 
                      y={chartData[0]?.totalAssets || 0} 
                      stroke="#374151" 
                      strokeDasharray="3 3" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Summary metrics below chart */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Current Assets</p>
                  <p className="text-lg font-semibold text-white">{formatCurrency(summary.totalAssets)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Total Cost Basis</p>
                  <p className="text-lg font-semibold text-white">{formatCurrency(summary.totalCostBasis)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Unrealized Gain</p>
                  <p className={`text-lg font-semibold ${summary.unrealizedGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.unrealizedGain)}
                    <span className="text-xs ml-1">({formatPercentage(summary.unrealizedGainPercent * 100)})</span>
                  </p>
                </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Securities - Always show */}
                <AssetClassCard
                  type="security"
                  data={{
                    ...summary.assetAllocation.securities,
                    name: 'Securities',
                    ...assetPerformance?.security
                  }}
                  icon={<LineChart className="h-5 w-5 text-blue-400" />}
                  colorClass="bg-blue-500"
                />
                
                {/* Cash - Always show */}
                <AssetClassCard
                  type="cash"
                  data={{
                    ...summary.assetAllocation.cash,
                    name: 'Cash'
                  }}
                  icon={<Banknote className="h-5 w-5 text-green-400" />}
                  colorClass="bg-green-500"
                />

                {/* Crypto - Always show */}
                <AssetClassCard
                  type="crypto"
                  data={{
                    ...summary.assetAllocation.crypto,
                    name: 'Crypto',
                    ...assetPerformance?.crypto
                  }}
                  icon={<Coins className="h-5 w-5 text-purple-400" />}
                  colorClass="bg-purple-500"
                />
                {/* Metals - Always show */}
                <AssetClassCard
                  type="metal"
                  data={{
                    ...summary.assetAllocation.metals,
                    name: 'Metals',
                    ...assetPerformance?.metal
                  }}
                  icon={<Package className="h-5 w-5 text-amber-400" />}
                  colorClass="bg-amber-500"
                />

                {/* Other Assets - Always show */}
                <AssetClassCard
                  type="other"
                  data={{
                    ...summary.assetAllocation.otherAssets,
                    name: 'Other Assets',
                    ...assetPerformance?.other_assets
                  }}
                  icon={<Home className="h-5 w-5 text-red-400" />}
                  colorClass="bg-red-500"
                />

                {/* Liabilities - Show as a card if any exist */}
                {summary.liabilities.total > 0 && (
                  <AssetClassCard
                    type="liability"
                    data={{
                      value: summary.liabilities.total,
                      percentage: summary.ratios.debtToAssetRatio,
                      costBasis: summary.liabilities.total,
                      count: summary.liabilities.counts.total,
                      name: 'Total Liabilities'
                    }}
                    icon={<MinusCircle className="h-5 w-5 text-red-400" />}
                    colorClass="bg-red-500"
                  />
                )}
              </div>
            </motion.div>

            {/* Personal Cash Flow - ADD THIS ENTIRE SECTION */}
            {netCashBasisMetrics && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-xl bg-gray-800 dark:bg-gray-800 p-6 shadow-xl backdrop-blur-sm bg-opacity-90 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white dark:text-white flex items-center">
                    <Wallet className="w-5 h-5 mr-2 text-green-400" />
                    Personal Cash Flow
                  </h3>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(netCashBasisMetrics.net_cash_position)}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Day', flow: netCashBasisMetrics.cash_flow_1d, pct: netCashBasisMetrics.cash_flow_1d_pct },
                    { label: 'Week', flow: netCashBasisMetrics.cash_flow_1w, pct: netCashBasisMetrics.cash_flow_1w_pct },
                    { label: 'Month', flow: netCashBasisMetrics.cash_flow_1m, pct: netCashBasisMetrics.cash_flow_1m_pct, highlight: true }
                  ].map(({ label, flow, pct, highlight }) => (
                    <div key={label} className={`p-3 rounded-lg ${highlight ? 'bg-gray-700/50 ring-1 ring-gray-600' : 'bg-gray-700/30'}`}>
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className={`text-sm font-semibold flex items-center ${
                        flow > 0 ? 'text-green-400' : flow < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {flow !== 0 && (flow > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />)}
                        {formatCurrency(flow)}
                      </p>
                      <p className={`text-xs ${
                        pct > 0 ? 'text-green-400' : pct < 0 ? 'text-red-400' : 'text-gray-500'
                      }`}>
                        {pct ? `${pct > 0 ? '+' : ''}${(pct * 100).toFixed(1)}%` : '-'}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'YTD', flow: netCashBasisMetrics.cash_flow_ytd },
                      { label: '1 Year', flow: netCashBasisMetrics.cash_flow_1y },
                      { label: '3 Years', flow: netCashBasisMetrics.cash_flow_3y }
                    ].map(({ label, flow }) => (
                      <div key={label}>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`text-sm font-medium ${
                          flow > 0 ? 'text-green-400' : flow < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {formatCurrency(flow)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Cash Flow Trend */}
            {cashFlowTrendData && cashFlowTrendData.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="rounded-xl bg-gray-800 dark:bg-gray-800 p-6 shadow-xl backdrop-blur-sm bg-opacity-90 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white dark:text-white flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-green-400" />
                    Cash Flow Trend
                  </h3>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowTrendData}>
                      <defs>
                        <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                          color: '#e5e7eb'
                        }}
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Net Cash Position']}
                        labelStyle={{ color: '#9ca3af' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="netCashPosition"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#cashFlowGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Start</p>
                    <p className="text-sm font-medium text-gray-300">
                      {cashFlowTrendData[0] && formatCurrency(cashFlowTrendData[0].netCashPosition)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current</p>
                    <p className="text-sm font-medium text-gray-300">
                      {cashFlowTrendData[cashFlowTrendData.length - 1] && 
                        formatCurrency(cashFlowTrendData[cashFlowTrendData.length - 1].netCashPosition)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Change</p>
                    <p className={`text-sm font-medium ${
                      cashFlowTrendData[0] && cashFlowTrendData[cashFlowTrendData.length - 1] &&
                      (cashFlowTrendData[cashFlowTrendData.length - 1].netCashPosition - cashFlowTrendData[0].netCashPosition) > 0
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {cashFlowTrendData[0] && cashFlowTrendData[cashFlowTrendData.length - 1] &&
                        formatCurrency(cashFlowTrendData[cashFlowTrendData.length - 1].netCashPosition - cashFlowTrendData[0].netCashPosition)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Cash Flow Trend */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="rounded-xl bg-gray-800 dark:bg-gray-800 p-6 shadow-xl backdrop-blur-sm bg-opacity-90 hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white dark:text-white flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-green-400" />
                  Cash Flow Trend
                </h3>
              </div>
              
              {cashFlowTrendData && cashFlowTrendData.length > 1 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowTrendData}>
                        <defs>
                          <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="displayDate" 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af', fontSize: 12 }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '0.5rem',
                            color: '#e5e7eb'
                          }}
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Net Cash Position']}
                          labelStyle={{ color: '#9ca3af' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="netCashPosition"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#cashFlowGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Start</p>
                      <p className="text-sm font-medium text-gray-300">
                        {formatCurrency(cashFlowTrendData[0].netCashPosition)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current</p>
                      <p className="text-sm font-medium text-gray-300">
                        {formatCurrency(cashFlowTrendData[cashFlowTrendData.length - 1].netCashPosition)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Change</p>
                      <p className={`text-sm font-medium ${
                        (cashFlowTrendData[cashFlowTrendData.length - 1].netCashPosition - cashFlowTrendData[0].netCashPosition) > 0
                          ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(cashFlowTrendData[cashFlowTrendData.length - 1].netCashPosition - cashFlowTrendData[0].netCashPosition)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {cashFlowTrendData.length === 1 
                        ? "Only current data available. Trend will appear as history accumulates."
                        : "No cash flow data available yet."}
                    </p>
                    {netCashBasisMetrics?.net_cash_position && (
                      <p className="text-gray-500 text-xs mt-2">
                        Current Position: {formatCurrency(netCashBasisMetrics.net_cash_position)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

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
                      <p className="font-medium text-white dark:text-white">{summary.positionStats.totalCount}</p>
                    </div>
                    <Layers className="h-5 w-5 text-indigo-400" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div>
                      <span className="text-xs text-gray-300 dark:text-gray-400">Active Accounts</span>
                      <p className="font-medium text-white dark:text-white">{summary.positionStats.activeAccountCount}</p>
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
           
          {/* Net Worth Mix */}
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
            
            {/* Enhanced Legend with Asset/Liability Breakdown */}
            <div className="mt-4 space-y-1">
              {/* Format Toggle and Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">
                  Values in {showInThousands ? 'thousands (k)' : 'dollars ($)'}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowInThousands(!showInThousands)}
                  className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors duration-200"
                >
                  {showInThousands ? 'Show $' : 'Show k'}
                </motion.button>
              </div>

              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-2 py-2 text-xs font-medium text-gray-400 border-b border-gray-700">
                <div className="col-span-3">Category</div>
                <div className="col-span-3 text-right">% of Net Worth</div>
                <div className="col-span-2 text-right">Net Worth</div>
                <div className="col-span-2 text-right">Assets</div>
                <div className="col-span-2 text-right">Liabilities</div>
              </div>

              {/* Securities Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-blue-500" />
                  <span className="text-sm text-white font-medium">Securities</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-blue-400">
                    {(summary.netWorthMix.securities * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.securities.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-green-400">
                    {formatCurrency(summary.assetAllocation.securities.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-500">$0</span>
                </div>
              </motion.div>

              {/* Net Cash Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-green-500" />
                  <span className="text-sm text-white font-medium">Net Cash</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-green-400">
                    {(summary.netWorthMix.netCash * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.altNetWorth.netCash, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-green-400">
                    {formatCurrency(summary.assetAllocation.cash.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-red-400">
                    {summary.liabilities.creditCard > 0 
                      ? `-${formatCurrency(summary.liabilities.creditCard, showInThousands).substring(1)}`
                      : '$0'
                    }
                  </span>
                </div>
              </motion.div>

              {/* Crypto Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-purple-500" />
                  <span className="text-sm text-white font-medium">Crypto</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-purple-400">
                    {(summary.netWorthMix.crypto * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.crypto.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-purple-400">
                    {formatCurrency(summary.assetAllocation.crypto.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-500">$0</span>
                </div>
              </motion.div>

              {/* Metals Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-amber-500" />
                  <span className="text-sm text-white font-medium">Metals</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-amber-400">
                    {(summary.netWorthMix.metals * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.metals.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-amber-400">
                    {formatCurrency(summary.assetAllocation.metals.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-500">$0</span>
                </div>
              </motion.div>

              {/* Real Estate Row - Changed color from red to teal */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-teal-500" />
                  <span className="text-sm text-white font-medium">Real Estate</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-teal-400">
                    {(summary.netWorthMix.realEstateEquity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.altNetWorth.realEstate, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-teal-400">
                    {formatCurrency((summary.altNetWorth.realEstate || 0) + (summary.liabilities.mortgage || 0), showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-red-400">
                    {summary.liabilities.mortgage > 0 
                      ? `-${formatCurrency(summary.liabilities.mortgage, showInThousands).substring(1)}`
                      : '$0'
                    }
                  </span>
                </div>
              </motion.div>

              {/* Net Other Assets Row - Updated logic */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer group"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-gray-500" />
                  <span className="text-sm text-white font-medium">Net Other Assets</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm font-semibold text-gray-400">
                    {(summary.netWorthMix.netOtherAssets * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.altNetWorth.netOtherAssets, showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-gray-400">
                    {/* Other Assets minus Real Estate assets to avoid double counting */}
                    {formatCurrency(
                          (summary.assetAllocation.otherAssets.value || 0) - 
                          ((summary.altNetWorth.realEstate || 0) + (summary.liabilities.mortgage || 0))
                        , showInThousands)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-red-400">
                    {/* Other liabilities = total liabilities - credit card - mortgage */}
                    {(() => {
                      const otherLiabilities = (summary.liabilities.total || 0) - 
                                            (summary.liabilities.creditCard || 0) - 
                                            (summary.liabilities.mortgage || 0);
                      return otherLiabilities > 0 
                        ? (`-${formatCurrency(otherLiabilities, showInThousands)}`)
                        : '$0';
                    })()}
                  </span>
                </div>
              </motion.div>

              {/* Totals Row */}
              <div className="border-t border-gray-600 mt-2 pt-2">
                <motion.div 
                  className="grid grid-cols-12 gap-2 px-2 py-2 bg-gray-700/30 rounded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-white font-bold">Total</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-bold text-indigo-400">100.0%</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-indigo-400">
                      {formatCurrency(summary.netWorth, showInThousands)}
                      
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-green-400">
                      {formatCurrency(summary.totalAssets, showInThousands)}
                      
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-red-400">
                      {summary.liabilities.total > 0 
                        ? `-${formatCurrency(summary.liabilities.total, showInThousands).substring(1)}`
                        : '$0'
                      }
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Interactive hover hint */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500 italic">Hover over rows to see detailed breakdown</p>
              </div>
            </div>
          </motion.div>

          {/* NEW: Invested Amount Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5 mt-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Invested Amount</h3>
              <Calculator className="h-5 w-5 text-indigo-400" />
            </div>
            
            <div className="space-y-1">
              {/* Format Toggle */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">
                  Values in {showInThousands ? 'thousands (k)' : 'dollars ($)'}
                </span>
              </div>

              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-2 py-2 text-xs font-medium text-gray-400 border-b border-gray-700">
                <div className="col-span-3">Asset Class</div>
                <div className="col-span-3 text-right">Market Value</div>
                <div className="col-span-3 text-right">Cost Basis</div>
                <div className="col-span-3 text-right">Gain/Loss</div>
              </div>

              {/* Securities Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-blue-500" />
                  <span className="text-sm text-white font-medium">Securities</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.securities.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-gray-300">
                    {formatCurrency(summary.assetAllocation.securities.costBasis, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm ${summary.assetAllocation.securities.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.assetAllocation.securities.gainLoss, showInThousands)}
                    <span className="text-xs ml-1">
                      ({(summary.assetAllocation.securities.gainLossPercent * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </motion.div>

              {/* Cash Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-green-500" />
                  <span className="text-sm text-white font-medium">Cash</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.cash.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-gray-300">
                    {formatCurrency(summary.assetAllocation.cash.costBasis, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-gray-400">-</span>
                </div>
              </motion.div>

              {/* Crypto Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-purple-500" />
                  <span className="text-sm text-white font-medium">Crypto</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.crypto.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-gray-300">
                    {formatCurrency(summary.assetAllocation.crypto.costBasis, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm ${summary.assetAllocation.crypto.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.assetAllocation.crypto.gainLoss, showInThousands)}
                    <span className="text-xs ml-1">
                      ({(summary.assetAllocation.crypto.gainLossPercent * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </motion.div>

              {/* Metals Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-amber-500" />
                  <span className="text-sm text-white font-medium">Metals</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.metals.value, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-gray-300">
                    {formatCurrency(summary.assetAllocation.metals.costBasis, showInThousands)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm ${summary.assetAllocation.metals.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.assetAllocation.metals.gainLoss, showInThousands)}
                    <span className="text-xs ml-1">
                      ({(summary.assetAllocation.metals.gainLossPercent * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </motion.div>

              {/* Other Assets Row */}
              <motion.div 
                className="grid grid-cols-12 gap-2 px-2 py-2 hover:bg-gray-700/50 rounded transition-all cursor-pointer"
                whileHover={{ x: 2 }}
              >
                <div className="col-span-3 flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-gray-500" />
                  <span className="text-sm text-white font-medium">Other Assets</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-white">
                    {formatCurrency(summary.assetAllocation.otherAssets.value, showInThousands)}
                    
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-sm text-gray-300">
                    {formatCurrency(summary.assetAllocation.otherAssets.costBasis, showInThousands)}
                    
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className={`text-sm ${summary.assetAllocation.otherAssets.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {summary.assetAllocation.otherAssets.gainLoss !== null 
                      ? (
                        <>
                          {formatCurrency(summary.assetAllocation.otherAssets.gainLoss, showInThousands)}
                          <span className="text-xs ml-1">
                            ({(summary.assetAllocation.otherAssets.gainLossPercent * 100).toFixed(1)}%)
                          </span>
                        </>
                      )
                      : '-'
                    }
                  </span>
                </div>
              </motion.div>

              {/* Totals Row */}
              <div className="border-t border-gray-600 mt-2 pt-2">
                <motion.div 
                  className="grid grid-cols-12 gap-2 px-2 py-2 bg-gray-700/30 rounded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="col-span-3 flex items-center">
                    <span className="text-sm text-white font-bold">Total</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-bold text-indigo-400">
                      {formatCurrency(summary.totalAssets, showInThousands)}
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-bold text-gray-300">
                      {formatCurrency(summary.totalCostBasis, showInThousands)}
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`text-sm font-bold ${summary.unrealizedGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(summary.unrealizedGain, showInThousands)}
                      <span className="text-xs ml-1">
                        ({(summary.unrealizedGainPercent * 100).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                </motion.div>
              </div>
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
                
                {/* Total Assets Summary - New Addition */}
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Total Assets</span>
                    <span className="text-xl font-bold text-white">{formatCurrency(totalAssets)}</span>
                  </div>
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
                <h3 className="text-lg font-semibold text-white">Top Individual Positions</h3>
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