// pages/index.js
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
  Eye, Gift, Clock, ArrowUp, ArrowDown, Calculator
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
  const [showModernDashboard, setShowModernDashboard] = useState(true);
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
  
// Modern Dashboard Component
  const ModernDashboard = () => {
        if (!portfolioData) return null;
    
        // Extract data needed for visualizations
        const totalValue = portfolioData.current_value || 0;
        const totalCostBasis = portfolioData.total_cost_basis || 0;
        const unrealizedGain = portfolioData.unrealized_gain || 0;
        const unrealizedGainPercent = portfolioData.unrealized_gain_percent || 0;
        const annualIncome = portfolioData.annual_income || 0;
        const yieldPercentage = portfolioData.yield_percentage || 0;
        const periodChanges = portfolioData.period_changes || {};
        
        // Get period change metrics
        const dailyChange = periodChanges['1d'] || { value_change: 0, percent_change: 0 };
        const weeklyChange = periodChanges['1w'] || { value_change: 0, percent_change: 0 };
        const monthlyChange = periodChanges['1m'] || { value_change: 0, percent_change: 0 };
        const ytdChange = periodChanges['ytd'] || { value_change: 0, percent_change: 0 };
        const yearlyChange = periodChanges['1y'] || { value_change: 0, percent_change: 0 };
        
        // Calculate additional portfolio stats
        const positionCount = portfolioData?.top_positions?.length || 0;
        const accountCount = portfolioData?.account_allocation?.length || 0;
        
        // Get top positions
        const topPositions = portfolioData?.top_positions?.slice(0, 5) || [];
    
        // Custom tooltip for the line chart
        const CustomAreaTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                <span className="font-medium">Value: </span> 
                {formatCurrency(payload[0].value)}
                </p>
            </div>
            );
        }
        return null;
        };
    
        // Time period badge component
        const TimePeriodBadge = ({ label, changeValue, changePercent }) => (
        <div className="flex flex-col p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</span>
            <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(changeValue)}</span>
            <span className={`text-xs flex items-center ${changePercent > 0 ? 'text-green-500' : changePercent < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {changePercent > 0 ? (
                <ArrowUp className="h-3 w-3 mr-1" />
                ) : changePercent < 0 ? (
                <ArrowDown className="h-3 w-3 mr-1" />
                ) : null}
                {formatPercentage(changePercent)}
            </span>
            </div>
        </div>
        );
    
        return (
        <div className="bg-gray-50 dark:bg-gray-900 py-4 rounded-xl mb-8">
            {/* Main dashboard grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
            {/* Left column - Summary */}
            <div className="lg:col-span-8 space-y-4">
                {/* Main metrics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total value */}
                    <div>
                    <div className="flex items-center space-x-2">
                        <DollarSign className="h-5 w-5 text-indigo-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                    </div>
                    <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(totalValue)}</h3>
                    <div className="flex items-center mt-1">
                        {dailyChange.percent_change > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                        ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ml-1 ${dailyChange.percent_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercentage(dailyChange.percent_change)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        Today
                        </span>
                    </div>
                    </div>
                    
                    {/* Cost basis */}
                    <div>
                    <div className="flex items-center space-x-2">
                        <Database className="h-5 w-5 text-purple-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cost Basis</p>
                    </div>
                    <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(totalCostBasis)}</h3>
                    <div className="flex items-center mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                        Invested capital
                        </span>
                    </div>
                    </div>
                    
                    {/* Unrealized gain */}
                    <div>
                    <div className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Unrealized Gain</p>
                    </div>
                    <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(unrealizedGain)}</h3>
                    <div className="flex items-center mt-1">
                        {unrealizedGainPercent > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                        ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm ml-1 ${unrealizedGainPercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercentage(unrealizedGainPercent)}
                        </span>
                    </div>
                    </div>
                    
                    {/* Annual income */}
                    <div>
                    <div className="flex items-center space-x-2">
                        <Gift className="h-5 w-5 text-amber-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Annual Income</p>
                    </div>
                    <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(annualIncome)}</h3>
                    <div className="flex items-center mt-1">
                        <Percent className="h-4 w-4 text-gray-400" />
                        <span className="text-sm ml-1 text-gray-500 dark:text-gray-400">
                        {formatPercentage(yieldPercentage)} yield
                        </span>
                    </div>
                    </div>
                </div>
                </div>
                
                {/* Time period performance metrics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Performance Over Time</h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                    Value Change
                    </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <TimePeriodBadge 
                    label="1 Day" 
                    changeValue={dailyChange.value_change} 
                    changePercent={dailyChange.percent_change} 
                    />
                    <TimePeriodBadge 
                    label="1 Week" 
                    changeValue={weeklyChange.value_change} 
                    changePercent={weeklyChange.percent_change} 
                    />
                    <TimePeriodBadge 
                    label="1 Month" 
                    changeValue={monthlyChange.value_change} 
                    changePercent={monthlyChange.percent_change} 
                    />
                    <TimePeriodBadge 
                    label="YTD" 
                    changeValue={ytdChange.value_change} 
                    changePercent={ytdChange.percent_change} 
                    />
                    <TimePeriodBadge 
                    label="1 Year" 
                    changeValue={yearlyChange.value_change} 
                    changePercent={yearlyChange.percent_change} 
                    />
                </div>
                </div>
                
                {/* Portfolio Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Portfolio Insights</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Left column - stats */}
                    <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
                        <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Positions</span>
                        <p className="font-medium text-gray-900 dark:text-white">{positionCount}</p>
                        </div>
                        <Layers className="h-5 w-5 text-indigo-500" />
                    </div>
                    
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
                        <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Accounts</span>
                        <p className="font-medium text-gray-900 dark:text-white">{accountCount}</p>
                        </div>
                        <Briefcase className="h-5 w-5 text-indigo-500" />
                    </div>
                    
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
                        <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Avg. Position Size</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(positionCount ? totalValue / positionCount : 0)}
                        </p>
                        </div>
                        <Calculator className="h-5 w-5 text-indigo-500" />
                    </div>
                    </div>
                    
                    {/* Right column - insights */}
                    <div className="flex flex-col justify-between">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-750 mb-4">
                        <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Top Gainer</span>
                        </div>
                        {portfolioData?.top_positions?.length > 0 && (
                        <div>
                            {/* Find top gainer */}
                            {(() => {
                            const topGainer = [...(portfolioData.top_positions || [])]
                                .sort((a, b) => b.gain_loss_percent - a.gain_loss_percent)[0];
                            return topGainer ? (
                                <div className="flex justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300">{topGainer.ticker}</span>
                                <span className="text-green-500">{formatPercentage(topGainer.gain_loss_percent * 100)}</span>
                                </div>
                            ) : <span className="text-sm text-gray-500">No data available</span>;
                            })()}
                        </div>
                        )}
                    </div>
                    
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-750">
                        <div className="flex items-center space-x-2 mb-1">
                        <Landmark className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Largest Position</span>
                        </div>
                        {portfolioData?.top_positions?.length > 0 && (
                        <div>
                            {/* First position is already largest */}
                            <div className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{portfolioData.top_positions[0].ticker}</span>
                            <span className="text-gray-700 dark:text-gray-300">{formatCurrency(portfolioData.top_positions[0].value)}</span>
                            </div>
                        </div>
                        )}
                    </div>
                    </div>
                </div>
                </div>
                
                {/* Performance chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Portfolio Value</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
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
                        </defs>
                        <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#6b7280' }} 
                        axisLine={{ stroke: '#e5e7eb' }}
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
                        <Tooltip content={<CustomAreaTooltip />} />
                        <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
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
                        stroke="#e5e7eb" 
                        strokeDasharray="3 3" 
                        />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
                </div>
                
                {/* Top holdings */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Top Holdings</h3>
                    <a href="/positions" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-medium flex items-center">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                </div>
                
                <div className="space-y-4">
                    {topPositions.map((position, index) => (
                    <div key={index} className="flex justify-between items-center">
                        <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
                            style={{ backgroundColor: `${assetColors[position.asset_type.toLowerCase()] || assetColors.other}25` }}>
                            <span style={{ color: assetColors[position.asset_type.toLowerCase()] || assetColors.other }}>
                            {position.asset_type === 'security' && <Layers className="h-5 w-5" />}
                            {position.asset_type === 'crypto' && <Diamond className="h-5 w-5" />}
                            {position.asset_type === 'cash' && <DollarSign className="h-5 w-5" />}
                            {position.asset_type === 'metal' && <Database className="h-5 w-5" />}
                            </span>
                        </div>
                        <div>
                            <p className="font-medium dark:text-white">{position.ticker}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{position.name}</p>
                        </div>
                        </div>
                        <div className="text-right">
                        <p className="font-medium dark:text-white">{formatCurrency(position.value)}</p>
                        <div className={`text-sm flex items-center justify-end ${
                            position.gain_loss_percent > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                            {position.gain_loss_percent > 0 ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                            ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                            )}
                            {formatPercentage(position.gain_loss_percent * 100)}
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            </div>
            
            {/* Right column - Allocation */}
            <div className="lg:col-span-4 space-y-4">
                {/* Asset allocation */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Asset Allocation</h3>
                    <a href="/allocation" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-medium flex items-center">
                    Details <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                </div>
                
                {/* Donut chart */}
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={assetAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        >
                        {assetAllocationData.map((entry, index) => (
                            <Cell 
                            key={`cell-${index}`} 
                            fill={assetColors[entry.name.toLowerCase()] || assetColors.other} 
                            stroke="none"
                            />
                        ))}
                        </Pie>
                        <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(index) => assetAllocationData[index]?.name}
                        />
                    </PieChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="mt-2 space-y-2">
                    {assetAllocationData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                        <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: assetColors[entry.name.toLowerCase()] || assetColors.other }}
                        />
                        <span className="text-sm dark:text-white">{entry.name}</span>
                        </div>
                        <div className="text-right">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{entry.percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
                
                {/* Net worth breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Net Worth</h3>
                    <div className="h-8 px-3 rounded-md bg-indigo-100 dark:bg-indigo-900 flex items-center">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        {formatCurrency(totalValue)}
                    </span>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Assets</span>
                        <span className="font-medium dark:text-white">{formatCurrency(totalValue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    </div>
                    
                    <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Debts</span>
                        <span className="font-medium dark:text-white">$0</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                    </div>
                    
                    <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between">
                        <span className="font-medium dark:text-white">Net Worth</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalValue)}</span>
                    </div>
                    </div>
                </div>
                </div>
                
                {/* Retirement tracker */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Retirement Progress</h3>
                    <a href="/planning" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-medium flex items-center">
                    Plan <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                </div>
                
                <div className="space-y-3">
                    <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Current</span>
                    <span className="font-medium dark:text-white">{formatCurrency(totalValue)}</span>
                    </div>
                    
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '37%' }}></div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Goal</span>
                    <span className="font-medium dark:text-white">$1,500,000</span>
                    </div>
                    
                    <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <Clock className="h-4 w-4 text-indigo-500 mr-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                        On track to reach goal by <span className="font-medium">2048</span>
                        </span>
                    </div>
                    </div>
                </div>
                </div>
                
                {/* Portfolio change insight */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold dark:text-white">Portfolio Growth</h3>
                </div>
                
                <div className="space-y-4">
                    {/* Year-over-year growth */}
                    <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">YOY Growth</span>
                        <span className={`font-medium ${yearlyChange.percent_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercentage(yearlyChange.percent_change)}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                        className={`h-full ${yearlyChange.percent_change > 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full`} 
                        style={{ width: `${Math.min(Math.abs(yearlyChange.percent_change), 25)}%` }}
                        ></div>
                    </div>
                    </div>
                    
                    {/* Average monthly contribution */}
                    <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Monthly Contribution</span>
                        <span className="font-medium dark:text-white">~{formatCurrency(totalValue * 0.02)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    </div>
                    
                    {/* Portfolio growth rate */}
                    <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-indigo-500 mr-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                        Portfolio CAGR: <span className="font-medium">8.4%</span>
                        </span>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
        );
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
            <div className="flex space-x-4 items-center mt-4 md:mt-0">
              <button
                onClick={() => setShowModernDashboard(!showModernDashboard)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  showModernDashboard
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {showModernDashboard ? 'Classic View' : 'Modern View'}
              </button>
              <TimeframeSelector
                options={timeframeOptions}
                selected={selectedTimeframe}
                onChange={setSelectedTimeframe}
              />
            </div>
          </div>

          {/* Modern Dashboard */}
          {showModernDashboard && <ModernDashboard />}

          {/* Legacy Dashboard Elements */}
          {!showModernDashboard && (
            <>
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
            </>
          )}
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