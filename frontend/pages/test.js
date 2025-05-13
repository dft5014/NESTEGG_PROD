// pages/index.js
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';
import AccountTable from '@/components/tables/UnifiedAccountTable';
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
  LineChart as LineChartIcon, Banknote, Coins, Package, Home, Building2, BarChart3, BarChart4, Users
} from 'lucide-react';

import KpiCard from '@/components/ui/KpiCard';
import UpdateMarketDataButton from '@/components/UpdateMarketDataButton'; 
import AddSecurityButton from '@/components/AddSecurityButton';
import UpdateOtherDataButton from '@/components/UpdateOtherDataButton';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { 
  InstitutionDiversityChart,
  SectorDiversityChart
} from '@/components/charts/DiversificationCharts';

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

  // Added for portfolio.js integration
  const [summaryData, setSummaryData] = useState(null);
  const [assetClassData, setAssetClassData] = useState({});
  const [allPositions, setAllPositions] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
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

  // Integrating portfolio.js functionality
  useEffect(() => {
    const loadSummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);
      try {
        // Fetch all positions using the unified API method
        const positionsResponse = await fetchWithAuth('/positions/unified');
        const positions = await positionsResponse.json();
        console.log("Dashboard: Fetched unified positions:", positions.length);
        setAllPositions(positions);
        
        // Fetch all accounts
        const accountsResponse = await fetchWithAuth('/accounts');
        const accounts = await accountsResponse.json();
        console.log("Dashboard: Fetched accounts:", accounts.length);
        setAllAccounts(accounts);
        
        // Calculate summary metrics
        const calculatedSummary = calculatePortfolioSummary(positions, accounts);
        setSummaryData(calculatedSummary);
        
        // Calculate asset class metrics
        const assetClasses = calculateAssetClassMetrics(positions, calculatedSummary.total_value, calculatedSummary.total_cost_basis);
        setAssetClassData(assetClasses);
        
        // Calculate institution mix data
        const institutionMix = calculateInstitutionMix(accounts);
        setInstitutionMixData(institutionMix);
        
        // Calculate top positions data
        const topPositions = calculateTopPositions(positions, calculatedSummary.total_value);
        setTopPositionsData(topPositions);
        
      } catch (error) {
        console.error("Error loading summary data:", error);
        setSummaryError(error.message || "Failed to load summary");
      } finally {
        setIsSummaryLoading(false);
      }
    };
    loadSummary();
  }, []);
  
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

  // Portfolio summary calculation (from portfolio.js)
  const calculatePortfolioSummary = (positions, accounts) => {
    // Initialize summary object with default values
    const summary = {
      total_value: 0,
      total_cost_basis: 0,
      total_gain_loss: 0,
      total_gain_loss_percent: 0,
      total_positions: positions.length,
      total_accounts: accounts.length,
      unique_securities: new Set(),
    };
    
    // Calculate totals from positions
    positions.forEach(position => {
      // Safely parse numeric values
      const currentValue = parseFloat(position.current_value || 0);
      const costBasis = parseFloat(position.total_cost_basis || 0);
      
      // Accumulate totals
      summary.total_value += currentValue;
      summary.total_cost_basis += costBasis;
      summary.total_gain_loss += (currentValue - costBasis);
      
      // Track unique securities/assets (by composite key for accurate counting)
      const assetKey = `${position.asset_type}:${position.identifier}`;
      summary.unique_securities.add(assetKey);
    });
    
    // Calculate gain/loss percent
    summary.total_gain_loss_percent = summary.total_cost_basis > 0 
      ? (summary.total_gain_loss / summary.total_cost_basis) 
      : 0;
      
    // Convert Set to count for unique securities
    summary.unique_securities_count = summary.unique_securities.size;
    delete summary.unique_securities; // Remove the Set object
    
    return summary;
  };

  // Calculate top positions data function (from portfolio.js)
  const calculateTopPositions = (positions, totalPortfolioValue) => {
    if (!positions || !positions.length) return [];
    
    // Group by asset identifier (e.g., ticker)
    const positionMap = positions.reduce((acc, position) => {
      // Create a composite key for the position
      const identifier = position.identifier || position.ticker || position.coin_symbol || 'Unknown';
      const name = position.name || identifier;
      const value = parseFloat(position.current_value || 0);
      const assetType = position.asset_type || 'unknown';
      
      // Skip positions with no value
      if (value <= 0) return acc;
      
      const key = `${assetType}:${identifier}`;
      
      if (!acc[key]) {
        acc[key] = {
          key,
          identifier,
          name,
          assetType,
          value: 0,
          color: getPositionColor(assetType, identifier)
        };
      }
      
      acc[key].value += value;
      return acc;
    }, {});
    
    // Convert to array and sort by value
    let result = Object.values(positionMap).sort((a, b) => b.value - a.value);
    
    // Calculate total value for percentage calculation
    const totalValue = result.reduce((sum, item) => sum + item.value, 0);
    
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

  // Calculate institution mix data (from portfolio.js)
  const calculateInstitutionMix = (accounts) => {
    if (!accounts || !accounts.length) return [];
    
    // Group by institution
    const institutionMap = accounts.reduce((acc, account) => {
      const institution = account.institution || 'Other';
      const value = parseFloat(account.total_value || account.balance || 0);
      
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

  // Get institution color (from portfolio.js)
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

  // Calculate asset class metrics (from portfolio.js)
  const calculateAssetClassMetrics = (positions, totalPortfolioValue, totalCostBasis) => {
    // Initialize asset class categories
    const assetClasses = {
      security: { 
        value: 0, 
        name: 'Securities', 
        icon: <LineChartIcon />, 
        color: 'blue',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0
      },
      cash: { 
        value: 0, 
        name: 'Cash', 
        icon: <Banknote />, 
        color: 'green',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0 
      },
      crypto: { 
        value: 0, 
        name: 'Crypto', 
        icon: <Coins />, 
        color: 'purple',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0
      },
      metal: { 
        value: 0, 
        name: 'Metals', 
        icon: <Package />, 
        color: 'amber',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0
      },
      realestate: {
        value: 0,
        name: 'Real Estate',
        icon: <Home />,
        color: 'teal',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0,
        properties_count: 0,
        mortgage_value: 0,
        net_equity: 0
      }
    };
    
    // Calculate value and cost basis for each asset class
    positions.forEach(position => {
      const assetType = position.asset_type || 'unknown';
      const value = parseFloat(position.current_value || 0);
      const costBasis = parseFloat(position.total_cost_basis || 0);
      
      if (assetClasses[assetType]) {
        assetClasses[assetType].value += value;
        assetClasses[assetType].cost_basis += costBasis;
        assetClasses[assetType].gain_loss += (value - costBasis);
      }
    });
    
    // Calculate percentages and gain/loss for each asset class
    Object.keys(assetClasses).forEach(key => {
      const assetClass = assetClasses[key];
      
      // Calculate percentage of total portfolio value
      assetClass.percentage = totalPortfolioValue > 0 
        ? (assetClass.value / totalPortfolioValue) 
        : 0;
      
      // Calculate percentage of total cost basis
      assetClass.cost_basis_percentage = totalCostBasis > 0
        ? (assetClass.cost_basis / totalCostBasis)
        : 0;
        
      // Calculate gain/loss percentage
      assetClass.gain_loss_percent = assetClass.cost_basis > 0
        ? (assetClass.gain_loss / assetClass.cost_basis)
        : 0;
    });
    
    return assetClasses;
  };

  // Get position color (from portfolio.js)
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
  
  // Generate a consistent color from a string (from portfolio.js)
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
  const formatCurrencyFunc = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatPercentageFunc = (value) => {
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
          <span>{formatPercentageFunc(value)}</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center text-red-500">
          <TrendingDown className={`${sizeClasses[size]} mr-1`} />
          <span>{formatPercentageFunc(value)}</span>
        </div>
      );
    } else {
      return <span className="text-gray-500">0.00%</span>;
    }
  };
  
  // Dashboard Card Component with FIXED CONTRAST
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
  
  // Timeframe Selector Component with FIXED CONTRAST
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
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
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
              {formatCurrencyFunc(payload[0].value)}
            </p>
            {selectedChartType === 'costBasis' && payload.length > 1 && (
              <p className="text-sm text-purple-600 dark:text-purple-400">
                <span className="font-medium">Cost Basis: </span> 
                {formatCurrencyFunc(payload[1].value)}
              </p>
            )}
            {selectedChartType === 'costBasis' && payload.length > 1 && (
              <p className={`text-sm ${payload[0].value > payload[1].value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <span className="font-medium">Gain/Loss: </span> 
                {formatCurrencyFunc(payload[0].value - payload[1].value)}
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
          <p className="text-gray-600 dark:text-gray-400">{formatCurrencyFunc(data.value)}</p>
        </div>
      );
    }
    return null;
  };
  
  // Modern Dashboard Component with FIXED CONTRAST ISSUES
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
              {formatCurrencyFunc(payload[0].value)}
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
          <span className="font-medium text-gray-900 dark:text-white">{formatCurrencyFunc(changeValue)}</span>
          <span className={`text-xs flex items-center ${changePercent > 0 ? 'text-green-500' : changePercent < 0 ? 'text-red-500' : 'text-gray-500'}`}>
            {changePercent > 0 ? (
              <ArrowUp className="h-3 w-3 mr-1" />
            ) : changePercent < 0 ? (
              <ArrowDown className="h-3 w-3 mr-1" />
            ) : null}
            {formatPercentageFunc(changePercent)}
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
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrencyFunc(totalValue)}</h3>
                  <div className="flex items-center mt-1">
                    {dailyChange.percent_change > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ml-1 ${dailyChange.percent_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentageFunc(dailyChange.percent_change)}
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
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrencyFunc(totalCostBasis)}</h3>
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
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrencyFunc(unrealizedGain)}</h3>
                  <div className="flex items-center mt-1">
                    {unrealizedGainPercent > 0 ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ml-1 ${unrealizedGainPercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercentageFunc(unrealizedGainPercent)}
                    </span>
                  </div>
                </div>
                
                {/* Annual income */}
                <div>
                  <div className="flex items-center space-x-2">
                    <Gift className="h-5 w-5 text-amber-500" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Annual Income</p>
                  </div>
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">{formatCurrencyFunc(annualIncome)}</h3>
                  <div className="flex items-center mt-1">
                    <Percent className="h-4 w-4 text-gray-400" />
                    <span className="text-sm ml-1 text-gray-500 dark:text-gray-400">
                      {formatPercentageFunc(yieldPercentage)} yield
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
                        {formatCurrencyFunc(positionCount ? totalValue / positionCount : 0)}
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
                              <span className="text-green-500">{formatPercentageFunc(topGainer.gain_loss_percent * 100)}</span>
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
                          <span className="text-gray-700 dark:text-gray-300">{formatCurrencyFunc(portfolioData.top_positions[0].value)}</span>
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
                      <p className="font-medium dark:text-white">{formatCurrencyFunc(position.value)}</p>
                      <div className={`text-sm flex items-center justify-end ${
                        position.gain_loss_percent > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {position.gain_loss_percent > 0 ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {formatPercentageFunc(position.gain_loss_percent * 100)}
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
                      formatter={(value) => formatCurrencyFunc(value)}
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
                    {formatCurrencyFunc(totalValue)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Assets</span>
                    <span className="font-medium dark:text-white">{formatCurrencyFunc(totalValue)}</span>
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
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrencyFunc(totalValue)}</span>
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
                  <span className="font-medium dark:text-white">{formatCurrencyFunc(totalValue)}</span>
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
                      {formatPercentageFunc(yearlyChange.percent_change)}
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
                    <span className="font-medium dark:text-white">~{formatCurrencyFunc(totalValue * 0.02)}</span>
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

  // Portfolio Summary Section from portfolio.js
  const PortfolioSummarySection = () => {
    // Determine overall gain/loss icon and color
    const gainLossValue = summaryData?.total_gain_loss ?? 0;
    const gainLossPercentValue = summaryData?.total_gain_loss_percent ?? 0;
    const GainLossIcon = gainLossValue >= 0 ? TrendingUp : TrendingDown;
    const gainLossColor = gainLossValue >= 0 ? 'green' : 'red';

    return (
      <div className="bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8 rounded-xl mb-8">
        <div className="container mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">NestEgg Portfolio</h1>
            <p className="text-gray-400 mt-2">Consolidated view of your investment portfolio across all asset classes.</p>
          </header>
          
          <section className="mb-10">
            <div className="flex space-x-4">
              <UpdateMarketDataButton className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg" />
              <AddSecurityButton className="bg-green-600 hover:bg-green-700 text-white rounded-lg" />
              <UpdateOtherDataButton className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg" />
            </div>
          </section>

          {/* KPI Section */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">Portfolio Summary</h2>
            {summaryError && (
              <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200">
                Error loading summary: {summaryError}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard
                title="Total Value"
                value={summaryData?.total_value}
                icon={<DollarSign />}
                isLoading={isSummaryLoading}
                format={(v) => formatCurrency(v)}
                color="blue"
              />
              <KpiCard
                title="Cost Basis"
                value={summaryData?.total_cost_basis}
                icon={<DollarSign />}
                isLoading={isSummaryLoading}
                format={(v) => formatCurrency(v)}
                color="purple"
              />
              <KpiCard
                title="Total Gain/Loss"
                value={gainLossValue}
                icon={<GainLossIcon />}
                isLoading={isSummaryLoading}
                format={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
                color={gainLossColor}
              />
              <KpiCard
                title="Total Gain/Loss %"
                value={gainLossPercentValue}
                icon={<Percent />}
                isLoading={isSummaryLoading}
                format={(v) => `${v >= 0 ? '+' : ''}${formatPercentage(v, {maximumFractionDigits: 2})}`}
                color={gainLossColor}
              />
              <KpiCard
                title="Unique Assets"
                value={summaryData?.unique_securities_count}
                icon={<BarChart4 />}
                isLoading={isSummaryLoading}
                format={(v) => v?.toLocaleString() ?? '0'}
                color="amber"
              />
              <KpiCard
                title="Total Accounts"
                value={summaryData?.total_accounts}
                icon={<Users />}
                isLoading={isSummaryLoading}
                format={(v) => v?.toLocaleString() ?? '0'}
                color="indigo"
              />
            </div>
          </section>

          {/* Asset Class Allocation KPIs */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">Asset Class Allocation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Asset class cards from portfolio.js would go here */}
              {/* I'll include just the Securities card as an example */}
<div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/10 -mr-10 -mt-10"></div>
                <div className="flex items-center mb-2">
                  <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                    <LineChartIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Securities</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Market Value</p>
                    <p className="text-xl font-bold">{formatCurrency(assetClassData.security?.value)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.security?.percentage || 0)} of portfolio</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cost Basis</p>
                    <p className="text-lg font-semibold">{formatCurrency(assetClassData.security?.cost_basis)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.security?.cost_basis_percentage || 0)} of total cost</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Performance</p>
                    <p className={`text-lg font-semibold ${assetClassData.security?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {assetClassData.security?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.security?.gain_loss)}
                      <span className="text-sm ml-1">
                        ({assetClassData.security?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.security?.gain_loss_percent)})
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
                  <h3 className="text-lg font-semibold">Cash</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Market Value</p>
                    <p className="text-xl font-bold">{formatCurrency(assetClassData.cash?.value)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.cash?.percentage || 0)} of portfolio</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cost Basis</p>
                    <p className="text-lg font-semibold">{formatCurrency(assetClassData.cash?.cost_basis)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.cash?.cost_basis_percentage || 0)} of total cost</p>
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
                  <h3 className="text-lg font-semibold">Crypto</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Market Value</p>
                    <p className="text-xl font-bold">{formatCurrency(assetClassData.crypto?.value)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.crypto?.percentage || 0)} of portfolio</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cost Basis</p>
                    <p className="text-lg font-semibold">{formatCurrency(assetClassData.crypto?.cost_basis)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.crypto?.cost_basis_percentage || 0)} of total cost</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Performance</p>
                    <p className={`text-lg font-semibold ${assetClassData.crypto?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {assetClassData.crypto?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.crypto?.gain_loss)}
                      <span className="text-sm ml-1">
                        ({assetClassData.crypto?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.crypto?.gain_loss_percent)})
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Metals */}
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/10 -mr-10 -mt-10"></div>
                <div className="flex items-center mb-2">
                  <div className="bg-amber-500/20 p-2 rounded-lg mr-3">
                    <Package className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Metals</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Market Value</p>
                    <p className="text-xl font-bold">{formatCurrency(assetClassData.metal?.value)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.metal?.percentage || 0)} of portfolio</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cost Basis</p>
                    <p className="text-lg font-semibold">{formatCurrency(assetClassData.metal?.cost_basis)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.metal?.cost_basis_percentage || 0)} of total cost</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Performance</p>
                    <p className={`text-lg font-semibold ${assetClassData.metal?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {assetClassData.metal?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.metal?.gain_loss)}
                      <span className="text-sm ml-1">
                        ({assetClassData.metal?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.metal?.gain_loss_percent)})
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Diversification Section */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">Portfolio Diversification</h2>
            
            {isSummaryLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 h-[300px] animate-pulse flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Financial Institution Diversity Chart */}
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 text-white">Institution Exposure</h3>
                  <div className="h-[350px]">
                    <InstitutionDiversityChart accounts={allAccounts} />
                  </div>
                </div>
                
                {/* Industry/Sector Diversity Chart */}
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 text-white">Sector Exposure (Securities)</h3>
                  <div className="h-[350px]">
                    <SectorDiversityChart positions={allPositions} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Links to new dedicated pages */}
          <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="/accounts" className="block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 p-5 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">View Accounts</h3>
                  <p className="text-indigo-200">Manage and track all your financial accounts</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
              </div>
            </a>
            
            <a href="/positions" className="block bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 p-5 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">View Positions</h3>
                  <p className="text-emerald-200">Track all your investment positions in detail</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Layers className="h-6 w-6 text-white" />
                </div>
              </div>
            </a>
          </section>
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
  const totalValue = formatCurrencyFunc(portfolioData?.current_value || 0);
  const totalCostBasis = formatCurrencyFunc(portfolioData?.total_cost_basis || 0);
  const unrealizedGain = formatCurrencyFunc(portfolioData?.unrealized_gain || 0);
  const unrealizedGainPercent = formatPercentageFunc(portfolioData?.unrealized_gain_percent || 0);
  const annualIncome = formatCurrencyFunc(portfolioData?.annual_income || 0);
  const yieldPercentage = formatPercentageFunc(portfolioData?.yield_percentage || 0);
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

        {/* Portfolio Summary Section from portfolio.js */}
        <PortfolioSummarySection />

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
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
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
                  changeValue={formatCurrencyFunc(periodChanges['1d']?.value_change || 0)}
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
                  value={formatPercentageFunc(periodChanges[selectedTimeframe]?.percent_change || 0)}
                  changeValue={formatCurrencyFunc(periodChanges[selectedTimeframe]?.value_change || 0)}
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
                          : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Value
                    </button>
                    <button
                      onClick={() => setSelectedChartType('costBasis')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        selectedChartType === 'costBasis' 
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                          : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
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
                          {formatCurrencyFunc(position.price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrencyFunc(position.value)}
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
                          {formatCurrencyFunc(account.value)}
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

