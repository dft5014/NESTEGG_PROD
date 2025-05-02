// pages/index.js
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, 
  Activity, Calendar, Info, ArrowRight, BarChart2, Settings,
  Briefcase, X, AlertCircle, ChevronRight, CreditCard, Droplet, 
  Diamond, Cpu, Landmark, Layers, Shield, Database, Percent, 
  Eye, Gift, Clock
} from 'lucide-react';

import { fetchWithAuth } from '@/utils/api';

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

// Color palettes
const assetColors = {
  security: '#4f46e5', // Indigo
  cash: '#10b981',    // Emerald
  crypto: '#8b5cf6',  // Purple
  bond: '#ec4899',    // Pink
  metal: '#f97316',   // Orange
  currency: '#3b82f6', // Blue
  realestate: '#ef4444', // Red
  other: '#6b7280'    // Gray
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
  'Unknown': '#9ca3af'
};

// Main Dashboard Component
export default function Dashboard() {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState('3m');
  const [selectedChartType, setSelectedChartType] = useState('value');
  const [portfolioData, setPortfolioData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  const router = useRouter();
  
  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolioData = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithAuth(`/portfolio/snapshots?timeframe=${selectedTimeframe}&group_by=day&include_cost_basis=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data');
        }
        
        const data = await response.json();
        setPortfolioData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError('Unable to load your portfolio data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPortfolioData();
  }, [selectedTimeframe]);
  
  // Process chart data for visualization
  const chartData = useMemo(() => {
    if (!portfolioData?.performance?.daily) return [];
    
    return portfolioData.performance.daily.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: day.value,
      costBasis: day.cost_basis || 0
    }));
  }, [portfolioData]);
  
  // Get asset allocation data for pie chart
  const assetAllocationData = useMemo(() => {
    if (!portfolioData?.asset_allocation) return [];
    
    return Object.entries(portfolioData.asset_allocation).map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data.value,
      percentage: data.percentage * 100
    }));
  }, [portfolioData]);
  
  // Get sector allocation data for pie chart
  const sectorAllocationData = useMemo(() => {
    if (!portfolioData?.sector_allocation) return [];
    
    return Object.entries(portfolioData.sector_allocation).map(([sector, data]) => ({
      name: sector,
      value: data.value,
      percentage: data.percentage * 100
    }));
  }, [portfolioData]);
  
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
        <div className="flex items-center text-green-500">
          <TrendingUp className={`${sizeClasses[size]} mr-1`} />
          <span>{formatPercentage(value)}</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-500">
          <TrendingDown className={`${sizeClasses[size]} mr-1`} />
          <span>{formatPercentage(value)}</span>
        </div>
      );
    } else {
      return <span className="text-gray-500">0.00%</span>;
    }
  };
  
  // Dashboard Card Component
  const DashboardCard = ({ 
    title, 
    value, 
    change, 
    changeValue, 
    changeLabel, 
    icon, 
    tooltipText,
    gradientColors = "from-indigo-500 to-blue-500" 
  }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 transition-all hover:shadow-xl">
        <div className={`h-1 w-full bg-gradient-to-r ${gradientColors}`}></div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              {icon && <span className="mr-2">{icon}</span>}
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
            </div>
            {tooltipText && (
              <div className="group relative">
                <button className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400">
                  <Info className="h-4 w-4" />
                </button>
                <div className="absolute right-0 w-60 p-2 mt-2 text-xs bg-gray-900 text-white rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  {tooltipText}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
            <div className="flex items-center">
              <TrendIndicator value={change} />
              {changeValue && (
                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                  {changeValue} ({changeLabel})
                </span>
              )}
              {!changeValue && changeLabel && (
                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                  {changeLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Timeframe Selector Component
  const TimeframeSelector = ({ options, selected, onChange, className = "" }) => {
    return (
      <div className={`flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        {options.map((option) => (
          <button
            key={option.id}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${selected === option.id 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }
            `}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              <span className="font-medium">Value: </span> 
              {formatCurrency(payload[0].value)}
            </p>
            {selectedChartType === 'costBasis' && payload.length > 1 && (
              <p className="text-sm text-purple-600 dark:text-purple-400">
                <span className="font-medium">Cost Basis: </span> 
                {formatCurrency(payload[1].value)}
              </p>
            )}
            {selectedChartType === 'costBasis' && payload.length > 1 && (
              <p className={`text-sm ${payload[0].value > payload[1].value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <span className="font-medium">Gain/Loss: </span> 
                {formatCurrency(payload[0].value - payload[1].value)}
                {' '}
                ({((payload[0].value / payload[1].value - 1) * 100).toFixed(2)}%)
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Allocation Chart Tooltip
  const AllocationTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium">{data.name}</p>
          <p className="text-indigo-600 dark:text-indigo-400">{data.percentage.toFixed(1)}%</p>
          <p className="text-gray-600 dark:text-gray-400">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };
  
  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your financial dashboard...</p>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <AlertCircle size={48} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unable to Load Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-center max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Calculate period changes for display
  const periodChanges = portfolioData?.period_changes || {};
  const dailyChange = periodChanges['1d']?.percent_change || 0;
  const weeklyChange = periodChanges['1w']?.percent_change || 0;
  const monthlyChange = periodChanges['1m']?.percent_change || 0;
  const ytdChange = periodChanges['ytd']?.percent_change || 0;
  
  // Format values for display
  const totalValue = formatCurrency(portfolioData?.current_value || 0);
  const totalCostBasis = formatCurrency(portfolioData?.total_cost_basis || 0);
  const unrealizedGain = formatCurrency(portfolioData?.unrealized_gain || 0);
  const unrealizedGainPercent = formatPercentage(portfolioData?.unrealized_gain_percent || 0);
  const annualIncome = formatCurrency(portfolioData?.annual_income || 0);
  const yieldPercentage = formatPercentage(portfolioData?.yield_percentage || 0);
  const lastUpdated = portfolioData?.last_updated ? new Date(portfolioData.last_updated).toLocaleDateString() : 'Not available';
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 mb-8 text-white shadow-xl"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Welcome to Your NestEgg Dashboard</h1>
                  <p className="text-indigo-100 mb-4">Track your portfolio's performance and make informed investment decisions.</p>
                  <button 
                    className="px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                    onClick={() => router.push('/accounts')}
                  >
                    View Your Accounts
                  </button>
                </div>
                <button 
                  onClick={() => setShowWelcomeBanner(false)}
                  className="text-white/80 hover:text-white"
                  aria-label="Close welcome banner"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Portfolio Summary */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Portfolio Overview</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Last updated: {lastUpdated}
              </p>
            </div>
            <TimeframeSelector
              options={timeframeOptions}
              selected={selectedTimeframe}
              onChange={setSelectedTimeframe}
              className="mt-4 md:mt-0"
            />
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <DashboardCard 
              title="Total Portfolio Value"
              value={totalValue}
              change={dailyChange}
              changeValue={formatCurrency(periodChanges['1d']?.value_change || 0)}
              changeLabel="Today"
              icon={<DollarSign className="h-5 w-5 text-indigo-500" />}
              tooltipText="The current total value of all positions in your portfolio"
              gradientColors="from-indigo-500 to-blue-500"
            />
            
            <DashboardCard 
              title="Unrealized Gain/Loss"
              value={unrealizedGain}
              change={portfolioData?.unrealized_gain_percent || 0}
              changeLabel="Total"
              icon={<Activity className="h-5 w-5 text-purple-500" />}
              tooltipText="Difference between current value and cost basis across all positions"
              gradientColors="from-purple-500 to-pink-500"
            />
            
            <DashboardCard 
              title="Annual Income"
              value={annualIncome}
              change={portfolioData?.yield_percentage || 0}
              changeLabel="Yield"
              icon={<Gift className="h-5 w-5 text-green-500" />}
              tooltipText="Estimated annual income from dividends and interest"
              gradientColors="from-emerald-500 to-teal-500"
            />
            
            <DashboardCard 
              title={`${selectedTimeframe.toUpperCase()} Performance`}
              value={formatPercentage(periodChanges[selectedTimeframe]?.percent_change || 0)}
              changeValue={formatCurrency(periodChanges[selectedTimeframe]?.value_change || 0)}
              changeLabel="Change"
              icon={<BarChart2 className="h-5 w-5 text-amber-500" />}
              tooltipText={`Performance over the selected time period (${selectedTimeframe})`}
              gradientColors="from-amber-500 to-orange-500"
            />
          </div>

          {/* Portfolio Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Portfolio Performance</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedChartType('value')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    selectedChartType === 'value' 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  Value
                </button>
                <button
                  onClick={() => setSelectedChartType('costBasis')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    selectedChartType === 'costBasis' 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  Value vs Cost
                </button>
              </div>
            </div>
            
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    {selectedChartType === 'costBasis' && (
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6b7280' }} 
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4f46e5" 
                    fill="url(#valueGradient)" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#4f46e5', strokeWidth: 2, fill: '#f9fafb' }}
                  />
                  {selectedChartType === 'costBasis' && (
                    <Area 
                      type="monotone" 
                      dataKey="costBasis" 
                      stroke="#8b5cf6" 
                      fill="url(#costGradient)" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: '#f9fafb' }}
                      strokeDasharray="5 5"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Positions, Allocation, Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Position Groups and Performance Cards */}
          <div className="lg:col-span-2">
            {/* Top Positions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Top Positions</h3>
                <a href="/positions" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center">
                  View All Positions <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticker</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {portfolioData?.top_positions?.slice(0, 5).map((position, index) => (
                      <tr key={`${position.ticker}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <div className="h-6 w-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 mr-2">
                              {position.asset_type === 'security' && <Layers className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                              {position.asset_type === 'crypto' && <Diamond className="h-3 w-3 text-purple-600 dark:text-purple-400" />}
                              {position.asset_type === 'cash' && <DollarSign className="h-3 w-3 text-green-600 dark:text-green-400" />}
                              {position.asset_type === 'metal' && <Database className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />}
                            </div>
                            {position.ticker}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {position.name || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(position.price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(position.value)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <TrendIndicator value={position.gain_loss_percent * 100} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Account Allocation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Allocation</h3>
                <a href="/accounts" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center">
                  Manage Accounts <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Institution</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {portfolioData?.account_allocation?.slice(0, 5).map((account, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {account.account_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {account.institution}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            {account.account_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(account.value)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                          {(account.percentage * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Right Column: Asset Allocation and Sector Allocation */}
          <div>
            {/* Asset Allocation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Asset Allocation</h3>
                <a href="/allocation" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center">
                  View Details <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetAllocationData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={assetColors[entry.name.toLowerCase()] || assetColors.other} 
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                {assetAllocationData.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: assetColors[entry.name.toLowerCase()] || assetColors.other }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{entry.name}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{entry.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Sector Allocation */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sector Allocation</h3>
                <a href="/sectors" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium flex items-center">
                  View Details <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sectorAllocationData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={sectorColors[entry.name] || sectorColors.Unknown} 
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                {sectorAllocationData.slice(0, 8).map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: sectorColors[entry.name] || sectorColors.Unknown }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{entry.name}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{entry.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/accounts')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            <Briefcase className="h-5 w-5" />
            <span>Manage Accounts</span>
          </button>
          
          <button 
            onClick={() => router.push('/transactions/new')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
          >
            <DollarSign className="h-5 w-5" />
            <span>New Transaction</span>
          </button>
          
          <button 
            onClick={() => router.push('/reports')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            <BarChart2 className="h-5 w-5" />
            <span>View Reports</span>
          </button>
          
          <button 
            onClick={() => router.push('/settings')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </div>
      </main>
    </div>
  );
}