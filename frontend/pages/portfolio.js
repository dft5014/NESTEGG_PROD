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
  Eye, Gift, Clock, ArrowUp, ArrowDown, Calculator,
  Banknote, Coins, Package, Home, Building2, BarChart3, Sparkles, Wallet, FileText, MessageCircle 
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
  const [institutionMixData, setInstitutionMixData] = useState([]);
  const [topPositionsData, setTopPositionsData] = useState([]);
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
        
        // Calculate institution mix data for Top Institutions card
        const institutionMix = calculateInstitutionMix(data.account_allocation || []);
        setInstitutionMixData(institutionMix);
        
        // Calculate top positions data for Top Positions card
        const topPositions = calculateTopPositions(data.top_positions || [], data.current_value || 0);
        setTopPositionsData(topPositions);
        
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
      totalcostBasis: day.cost_basis || 0
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
  
  // Calculate institution mix data for Top 5 Institutions card
  const calculateInstitutionMix = (accounts) => {
    if (!accounts || !accounts.length) return [];
    
    // Group by institution
    const institutionMap = accounts.reduce((acc, account) => {
      const institution = account.institution || 'Other';
      const value = parseFloat(account.value || account.total_value || account.balance || 0);
      
      if (!acc[institution]) {
        acc[institution] = {
          name: institution,
          value: 0,
          color: getInstitutionColor(institution)
        };
      }
      
      acc[institution].value += value;
      return acc;
    }, {});
    
    // Convert to array and sort by value
    let result = Object.values(institutionMap).sort((a, b) => b.value - a.value);
    
    // Calculate total value
    const totalValue = result.reduce((sum, item) => sum + item.value, 0);
    
    // Calculate percentages and limit to top 5 + Other
    if (result.length > 5) {
      const top5 = result.slice(0, 5);
      const others = result.slice(5);
      
      const otherValue = others.reduce((sum, item) => sum + item.value, 0);
      const otherItem = {
        name: 'Other',
        value: otherValue,
        color: '#6B7280', // Gray color for Other
        percentage: totalValue > 0 ? otherValue / totalValue : 0
      };
      
      result = [...top5, otherItem];
    }
    
    // Add percentage to each item
    result = result.map(item => ({
      ...item,
      percentage: totalValue > 0 ? item.value / totalValue : 0
    }));
    
    return result;
  };
  
  // Get institution color
  function getInstitutionColor(name) {
    const colorMap = {
      'Vanguard': '#C94227',
      'Fidelity': '#569A38',
      'Charles Schwab': '#027BC7',
      'Robinhood': '#00C805',
      'TD Ameritrade': '#4F5B65',
      'Chase': '#117ACA',
      'Bank of America': '#E11B3C', 
      'Wells Fargo': '#D71E28',
      'E*TRADE': '#6633CC',
      'Interactive Brokers': '#F79125',
      'Coinbase': '#0052FF',
      'Merrill Lynch': '#0073CF',
      'Morgan Stanley': '#0073CF',
      'Betterment': '#0A9ACF',
      'Wealthfront': '#3ECBBC',
      'Citibank': '#057CC0',
      'SoFi': '#A7A8AA',
    };
    
    return colorMap[name] || getRandomColor(name);
  }
  
  // Calculate top positions data for Top 5 Positions card
  const calculateTopPositions = (positions, totalPortfolioValue) => {
    if (!positions || !positions.length) return [];
    
    // Convert to array form if it's already an array of position objects
    const positionArray = positions.map(position => ({
      key: position.ticker || position.identifier || 'Unknown',
      identifier: position.ticker || position.identifier || 'Unknown',
      name: position.name || position.ticker || position.identifier || 'Unknown',
      assetType: position.asset_type || 'unknown',
      value: parseFloat(position.value || position.current_value || 0),
      color: getPositionColor(position.asset_type || 'unknown', position.ticker || position.identifier || 'Unknown')
    }));
    
    // Sort by value (descending)
    let result = positionArray.sort((a, b) => b.value - a.value);
    
    // Limit to top 5 + Other
    if (result.length > 5) {
      const top5 = result.slice(0, 5);
      const others = result.slice(5);
      
      const otherValue = others.reduce((sum, item) => sum + item.value, 0);
      const otherItem = {
        key: 'other',
        identifier: 'Other',
        name: 'Other',
        assetType: 'other',
        value: otherValue,
        color: '#6B7280', // Gray color for Other
        percentage: totalPortfolioValue > 0 ? otherValue / totalPortfolioValue : 0
      };
      
      result = [...top5, otherItem];
    }
    
    // Add percentage to each item
    result = result.map(item => ({
      ...item,
      percentage: totalPortfolioValue > 0 ? item.value / totalPortfolioValue : 0
    }));
    
    return result;
  };
  
  // Get position color
  function getPositionColor(assetType, identifier) {
    // Different color palettes based on asset type
    if (assetType === 'security') {
      // Blue palette for securities
      return getRandomColor(identifier, { hue: 220, saturation: 70, lightness: 55 });
    } else if (assetType === 'crypto') {
      // Purple palette for crypto
      return getRandomColor(identifier, { hue: 270, saturation: 70, lightness: 50 });
    } else if (assetType === 'metal') {
      // Gold/amber palette for metals
      return getRandomColor(identifier, { hue: 45, saturation: 80, lightness: 55 });
    } else if (assetType === 'realestate') {
      // Teal palette for real estate
      return getRandomColor(identifier, { hue: 180, saturation: 70, lightness: 45 });
    } else {
      // Default color generation
      return getRandomColor(identifier);
    }
  }
  
  // Generate a consistent color from a string with optional color parameters
  function getRandomColor(str, opts = {}) {
    const { hue, saturation = 70, lightness = 50 } = opts;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use provided hue or generate from hash
    const h = hue !== undefined ? hue : Math.abs(hash) % 360;
    return `hsl(${h}, ${saturation}%, ${lightness}%)`;
  }
  
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
  
  // Timeframe Selector Component
  const TimeframeSelector = ({ options, selected, onChange, className = "" }) => {
    return (
      <div className={`flex p-1 space-x-1 bg-gray-700 dark:bg-gray-800 rounded-lg ${className}`}>
        {options.map((option) => (
          <button
            key={option.id}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${selected === option.id 
                ? 'bg-gray-600 dark:bg-gray-700 text-white shadow-sm' 
                : 'text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-white hover:bg-gray-600/50 dark:hover:bg-gray-700/50'
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
        <div className="bg-gray-800 dark:bg-gray-800 p-3 border border-gray-700 dark:border-gray-700 rounded-lg shadow-lg text-white">
          <p className="font-medium text-white">{label}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-indigo-400 dark:text-indigo-400">
              <span className="font-medium">Value: </span> 
              {formatCurrency(payload[0].value)}
            </p>
            {selectedChartType === 'costBasis' && payload.length > 1 && (
              <p className="text-sm text-purple-400 dark:text-purple-400">
                <span className="font-medium">Cost Basis: </span> 
                {formatCurrency(payload[1].value)}
              </p>
            )}
            {selectedChartType === 'costBasis' && payload.length > 1 && (
              <p className={`text-sm ${payload[0].value > payload[1].value ? 'text-green-400 dark:text-green-400' : 'text-red-400 dark:text-red-400'}`}>
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
        <div className="bg-gray-800 dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-700 dark:border-gray-700 text-white">
          <p className="font-medium">{data.name}</p>
          <p className="text-indigo-400 dark:text-indigo-400">{data.percentage.toFixed(1)}%</p>
          <p className="text-gray-300 dark:text-gray-400">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };
  
  // Dashboard Display Component
  const Dashboard = () => {
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

    // Create asset class data similar to portfolio.js
    const assetClassData = {};
    if (portfolioData.asset_allocation) {
      Object.entries(portfolioData.asset_allocation).forEach(([type, data]) => {
        assetClassData[type] = {
          value: data.value || 0,
          name: type.charAt(0).toUpperCase() + type.slice(1),
          percentage: data.percentage || 0,
          cost_basis: data.cost_basis || 0,
          cost_basis_percentage: (data.cost_basis || 0) / (totalCostBasis || 1),
          gain_loss: (data.value || 0) - (data.cost_basis || 0),
          gain_loss_percent: data.cost_basis ? ((data.value - data.cost_basis) / data.cost_basis) : 0,
        };
      });
    }

    // Asset class icon mapping
    const assetIcons = {
      security: <LineChart className="h-5 w-5 text-indigo-400" />,
      cash: <Banknote className="h-5 w-5 text-green-400" />,
      crypto: <Coins className="h-5 w-5 text-purple-400" />,
      metal: <Package className="h-5 w-5 text-amber-400" />,
      realestate: <Home className="h-5 w-5 text-teal-400" />
    };

    // Custom tooltip for the line chart
    const CustomAreaTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-gray-800 dark:bg-gray-800 p-3 border border-gray-700 dark:border-gray-700 rounded-lg shadow-lg text-white">
            <p className="font-medium text-white">{label}</p>
            <p className="text-sm text-indigo-400 dark:text-indigo-400">
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
      <div className="flex flex-col p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
        <span className="text-xs text-gray-300 dark:text-gray-400 mb-1">{label}</span>
        <div className="flex items-center justify-between">
          <span className="font-medium text-white dark:text-white">{formatCurrency(changeValue)}</span>
          <span className={`text-xs flex items-center ${changePercent > 0 ? 'text-green-500' : changePercent < 0 ? 'text-red-500' : 'text-gray-400'}`}>
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
      <div className="bg-gray-900 dark:bg-gray-900 py-4 rounded-xl mb-8">
        {/* Main dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
          {/* Left column - Summary */}
          <div className="lg:col-span-8 space-y-4">
            {/* Main metrics */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total value */}
                <div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-indigo-400" />
                    <p className="text-sm text-gray-300">Total Value</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(totalValue)}</h3>
                  <div className="flex items-center mt-1">
                    {dailyChange.percent_change > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ml-1 ${dailyChange.percent_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(dailyChange.percent_change)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      Today
                    </span>
                  </div>
                </div>
                
                {/* Cost basis */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-purple-400" />
                    <p className="text-sm text-gray-300">Cost Basis</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(totalCostBasis)}</h3>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-400">
                      Invested capital
                    </span>
                  </div>
                </div>
                
                {/* Unrealized gain */}
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
                      {formatPercentage(unrealizedGainPercent)}
                    </span>
                  </div>
                </div>
                
                {/* Annual income */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Gift className="h-5 w-5 text-amber-400" />
                    <p className="text-sm text-gray-300">Annual Income</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 text-white">{formatCurrency(annualIncome)}</h3>
                  <div className="flex items-center mt-1">
                    <Percent className="h-4 w-4 text-gray-400" />
                    <span className="text-sm ml-1 text-gray-400">
                      {formatPercentage(yieldPercentage)} yield
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Time period performance metrics */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Performance Over Time</h3>
                <span className="text-sm text-gray-400">
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
            
            {/* Performance chart */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Portfolio Value</h3>
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
                    <Tooltip content={<CustomAreaTooltip />} />
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
            </div>
                        
            {/* Asset Class Allocation Section */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <h2 className="text-lg font-semibold mb-4 text-white">Asset Class Allocation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Securities */}
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/10 -mr-10 -mt-10"></div>
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                      <LineChart className="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Securities</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">Market Value</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(assetClassData.security?.value)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.security?.percentage * 100 || 0)} of portfolio</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Cost Basis</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(assetClassData.security?.cost_basis)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.security?.cost_basis_percentage * 100 || 0)} of total cost</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Performance</p>
                      <p className={`text-lg font-semibold ${assetClassData.security?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {assetClassData.security?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.security?.gain_loss)}
                        <span className="text-sm ml-1">
                          ({assetClassData.security?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.security?.gain_loss_percent * 100)})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Cash */}
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-green-500/10 -mr-10 -mt-10"></div>
                  <div className="flex items-center mb-2">
                    <div className="bg-green-500/20 p-2 rounded-lg mr-3">
                      <Banknote className="h-5 w-5 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Cash</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">Market Value</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(assetClassData.cash?.value)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.cash?.percentage * 100 || 0)} of portfolio</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Cost Basis</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(assetClassData.cash?.cost_basis)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.cash?.cost_basis_percentage * 100 || 0)} of total cost</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Performance</p>
                      <p className="text-lg font-semibold text-gray-400">
                        N/A
                      </p>
                    </div>
                  </div>
                </div>

                {/* Crypto */}
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/10 -mr-10 -mt-10"></div>
                  <div className="flex items-center mb-2">
                    <div className="bg-purple-500/20 p-2 rounded-lg mr-3">
                      <Coins className="h-5 w-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Crypto</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">Market Value</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(assetClassData.crypto?.value)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.crypto?.percentage * 100 || 0)} of portfolio</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Cost Basis</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(assetClassData.crypto?.cost_basis)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.crypto?.cost_basis_percentage * 100 || 0)} of total cost</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Performance</p>
                      <p className={`text-lg font-semibold ${assetClassData.crypto?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {assetClassData.crypto?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.crypto?.gain_loss)}
                        <span className="text-sm ml-1">
                          ({assetClassData.crypto?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.crypto?.gain_loss_percent * 100)})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metals */}
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden md:col-span-3 lg:col-span-1">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/10 -mr-10 -mt-10"></div>
                  <div className="flex items-center mb-2">
                    <div className="bg-amber-500/20 p-2 rounded-lg mr-3">
                      <Package className="h-5 w-5 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Metals</h3>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-400">Market Value</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(assetClassData.metal?.value)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.metal?.percentage * 100 || 0)} of portfolio</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Cost Basis</p>
                      <p className="text-lg font-semibold text-white">{formatCurrency(assetClassData.metal?.cost_basis)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(assetClassData.metal?.cost_basis_percentage * 100 || 0)} of total cost</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Performance</p>
                      <p className={`text-lg font-semibold ${assetClassData.metal?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {assetClassData.metal?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.metal?.gain_loss)}
                        <span className="text-sm ml-1">
                          ({assetClassData.metal?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.metal?.gain_loss_percent * 100)})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real Estate */}
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden md:col-span-3 lg:col-span-2">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-teal-500/10 -mr-10 -mt-10"></div>
                  <div className="flex items-center mb-2">
                    <div className="bg-teal-500/20 p-2 rounded-lg mr-3">
                      <Home className="h-5 w-5 text-teal-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Real Estate</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column - Same as other asset cards */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400">Market Value</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(assetClassData.realestate?.value || 0)}</p>
                        <p className="text-xs text-gray-500">{formatPercentage((assetClassData.realestate?.percentage || 0) * 100)} of portfolio</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Cost Basis</p>
                        <p className="text-lg font-semibold text-white">{formatCurrency(assetClassData.realestate?.cost_basis || 0)}</p>
                        <p className="text-xs text-gray-500">{formatPercentage((assetClassData.realestate?.cost_basis_percentage || 0) * 100)} of total cost</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Performance</p>
                        <p className={`text-lg font-semibold ${(assetClassData.realestate?.gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(assetClassData.realestate?.gain_loss || 0) >= 0 ? '+' : ''}{formatCurrency(assetClassData.realestate?.gain_loss || 0)}
                          <span className="text-sm ml-1">
                            ({(assetClassData.realestate?.gain_loss || 0) >= 0 ? '+' : ''}{formatPercentage((assetClassData.realestate?.gain_loss_percent || 0) * 100)})
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Right Column - Real Estate Specific */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400">Properties</p>
                        <p className="text-xl font-bold text-white">{assetClassData.realestate?.properties_count || 0}</p>
                        <p className="text-xs text-gray-500">Total owned properties</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Mortgage Balance</p>
                        <p className="text-lg font-semibold text-white">{formatCurrency(assetClassData.realestate?.mortgage_value || 0)}</p>
                        <p className="text-xs text-gray-500">Total outstanding mortgages</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Net Equity</p>
                        <p className="text-lg font-semibold text-teal-400">
                          {formatCurrency(assetClassData.realestate?.net_equity || 0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(((assetClassData.realestate?.net_equity || 0) / (assetClassData.realestate?.value || 1)) * 100)} equity ratio
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Portfolio Stats */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Portfolio Insights</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Left column - stats */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div>
                      <span className="text-xs text-gray-300 dark:text-gray-400">Positions</span>
                      <p className="font-medium text-white dark:text-white">{positionCount}</p>
                    </div>
                    <Layers className="h-5 w-5 text-indigo-400" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div>
                      <span className="text-xs text-gray-300 dark:text-gray-400">Accounts</span>
                      <p className="font-medium text-white dark:text-white">{accountCount}</p>
                    </div>
                    <Briefcase className="h-5 w-5 text-indigo-400" />
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div>
                      <span className="text-xs text-gray-300 dark:text-gray-400">Avg. Position Size</span>
                      <p className="font-medium text-white dark:text-white">
                        {formatCurrency(positionCount ? totalValue / positionCount : 0)}
                      </p>
                    </div>
                    <Calculator className="h-5 w-5 text-indigo-400" />
                  </div>
                </div>
                
                {/* Right column - insights */}
                <div className="flex flex-col justify-between">
                  <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750 mb-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-white dark:text-white">Top Gainer</span>
                    </div>
                    {portfolioData?.top_positions?.length > 0 && (
                      <div>
                        {/* Find top gainer */}
                        {(() => {
                          const topGainer = [...(portfolioData.top_positions || [])]
                            .sort((a, b) => b.gain_loss_percent - a.gain_loss_percent)[0];
                          return topGainer ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300 dark:text-gray-300">{topGainer.ticker}</span>
                              <span className="text-green-500">{formatPercentage(topGainer.gain_loss_percent * 100)}</span>
                            </div>
                          ) : <span className="text-sm text-gray-400">No data available</span>;
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                    <div className="flex items-center space-x-2 mb-1">
                      <Landmark className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm font-medium text-white dark:text-white">Largest Position</span>
                    </div>
                    {portfolioData?.top_positions?.length > 0 && (
                      <div>
                        {/* First position is already largest */}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300 dark:text-gray-300">{portfolioData.top_positions[0].ticker}</span>
                          <span className="text-gray-300 dark:text-gray-300">{formatCurrency(portfolioData.top_positions[0].value)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Allocation */}
          <div className="lg:col-span-4 space-y-4">
            {/* Asset allocation */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Asset Allocation</h3>
                <a href="/Positions" className="text-indigo-400 dark:text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center">
                  Details <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
              
              {/* Donut chart */}
              <div className="h-64">
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
                      <span className="text-sm text-white">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">{entry.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Net worth breakdown */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Net Worth</h3>
                <div className="h-8 px-3 rounded-md bg-indigo-900 dark:bg-indigo-900 flex items-center">
                  <span className="text-sm font-medium text-indigo-300 dark:text-indigo-300">
                    {formatCurrency(totalValue)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400 dark:text-gray-400">Assets</span>
                    <span className="font-medium text-white">{formatCurrency(totalValue)}</span>
                  </div>
                  <div className="h-2 bg-gray-700 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400 dark:text-gray-400">Debts</span>
                    <span className="font-medium text-white">$0</span>
                  </div>
                  <div className="h-2 bg-gray-700 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
                
                <div className="pt-2 mt-2 border-t border-gray-700 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Net Worth</span>
                    <span className="font-bold text-indigo-400 dark:text-indigo-400">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Retirement tracker */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Retirement Progress</h3>
                <a href="/planning" className="text-indigo-400 dark:text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center">
                  Plan <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400 dark:text-gray-400">Current</span>
                  <span className="font-medium text-white">{formatCurrency(totalValue)}</span>
                </div>
                
                <div className="h-2.5 bg-gray-700 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '37%' }}></div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 dark:text-gray-400">Goal</span>
                  <span className="font-medium text-white">$1,500,000</span>
                </div>
                
                <div className="pt-3 mt-2 border-t border-gray-700 dark:border-gray-700">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-indigo-400 mr-2" />
                    <span className="text-sm text-gray-300 dark:text-gray-300">
                      On track to reach goal by <span className="font-medium">2048</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Portfolio change insight */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Portfolio Growth</h3>
              </div>
              
              <div className="space-y-4">
                {/* Year-over-year growth */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400 dark:text-gray-400">YOY Growth</span>
                    <span className={`font-medium ${yearlyChange.percent_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentage(yearlyChange.percent_change)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${yearlyChange.percent_change > 0 ? 'bg-green-500' : 'bg-red-500'} rounded-full`} 
                      style={{ width: `${Math.min(Math.abs(yearlyChange.percent_change), 25)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Average monthly contribution */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400 dark:text-gray-400">Monthly Contribution</span>
                    <span className="font-medium text-white">~{formatCurrency(totalValue * 0.02)}</span>
                  </div>
                  <div className="h-2 bg-gray-700 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                
                {/* Portfolio growth rate */}
                <div className="pt-2 mt-2 border-t border-gray-700 dark:border-gray-700">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-indigo-400 mr-2" />
                    <span className="text-sm text-gray-300 dark:text-gray-300">
                      Portfolio CAGR: <span className="font-medium">8.4%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 5 Positions Card */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5 relative">
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
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: position.color }}
                        ></div>
                        <span className="text-sm text-gray-300">{position.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">{formatPercentage(position.percentage * 100)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-400">No position data available</div>
                )}
              </div>
              
              <div className="mt-3 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500 text-center">
                  Showing top {Math.min((topPositionsData?.length || 0), 5)} positions by market value
                </div>
              </div>
            </div>
            
            {/* Top 5 Institutions Card */}
            <div className="bg-gray-800 dark:bg-gray-900 rounded-xl shadow-md p-5 relative">
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
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: institution.color }}
                        ></div>
                        <span className="text-sm text-gray-300">{institution.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">{formatPercentage(institution.percentage * 100)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-400">No institution data available</div>
                )}
              </div>
              
              <div className="mt-3 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500 text-center">
                  Based on {institutionMixData?.length || 0} financial institutions
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
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-300 dark:text-gray-300">Loading your financial dashboard...</p>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <AlertCircle size={48} />
        </div>
        <h1 className="text-2xl font-bold text-white dark:text-white mb-2">Unable to Load Dashboard</h1>
        <p className="text-gray-300 dark:text-gray-300 mb-6 text-center max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl p-1 mb-8 shadow-2xl"
          >
            <div className="bg-gray-900 rounded-2xl p-6 md:p-8">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white">
                        Welcome to NestEgg - Ready to grow your wealth? 🚀
                      </h1>
                      <p className="text-gray-400 mt-1">
                        Your investment journey starts here. Track, analyze, and optimize your portfolio.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <motion.button 
                      whileHover={{ y: -2 }}
                      className="group relative bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-all duration-200 border border-gray-700 hover:border-blue-500"
                      onClick={() => router.push('/positions')}
                    >
                      <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
                      <div className="text-white font-medium">Positions</div>
                      <div className="text-gray-400 text-xs">View holdings</div>
                    </motion.button>
                    
                    <motion.button 
                      whileHover={{ y: -2 }}
                      className="group relative bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-all duration-200 border border-gray-700 hover:border-green-500"
                      onClick={() => router.push('/accounts')}
                    >
                      <Wallet className="w-5 h-5 text-green-400 mb-2" />
                      <div className="text-white font-medium">Accounts</div>
                      <div className="text-gray-400 text-xs">Manage funds</div>
                    </motion.button>
                    
                    <motion.button 
                      whileHover={{ y: -2 }}
                      className="group relative bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-all duration-200 border border-gray-700 hover:border-purple-500"
                      onClick={() => router.push('/portfolio-command-center')}
                    >
                      <BarChart3 className="w-5 h-5 text-purple-400 mb-2" />
                      <div className="text-white font-medium">Analytics</div>
                      <div className="text-gray-400 text-xs">Deep insights</div>
                    </motion.button>
                    
                    <motion.button 
                      whileHover={{ y: -2 }}
                      className="group relative bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-all duration-200 border border-gray-700 hover:border-orange-500"
                      onClick={() => router.push('/reports')}
                    >
                      <FileText className="w-5 h-5 text-orange-400 mb-2" />
                      <div className="text-white font-medium">Reports</div>
                      <div className="text-gray-400 text-xs">Performance</div>
                    </motion.button>

                    <motion.button 
                      whileHover={{ y: -2 }}
                      className="group relative bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-all duration-200 border border-gray-700 hover:border-orange-500"
                      onClick={() => router.push('/overview')}
                    >
                      <MessageCircle className="w-5 h-5 text-orange-400 mb-2" />
                      <div className="text-white font-medium">Overview</div>
                      <div className="text-gray-400 text-xs">How does NestEgg work?</div>
                    </motion.button>

                  </div>
                  
                  <div className="flex items-center justify-between">

                    
                    <button 
                      onClick={() => setShowWelcomeBanner(false)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <X size={18} />
                    </button>
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
                Last updated: {portfolioData?.last_updated ? new Date(portfolioData.last_updated).toLocaleDateString() : 'Not available'}
              </p>
            </div>
            <div className="flex space-x-4 items-center mt-4 md:mt-0">
              <TimeframeSelector
                options={timeframeOptions}
                selected={selectedTimeframe}
                onChange={setSelectedTimeframe}
              />
            </div>
          </div>

          {/* Dashboard Content */}
          <Dashboard />
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
            onClick={() => router.push('/positions')}  
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
          >
            <DollarSign className="h-5 w-5" />
            <span>View Positions</span> 
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