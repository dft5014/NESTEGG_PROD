// pages/reports.js
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, 
  Activity, Calendar, Info, ArrowRight, BarChart2, Settings,
  Briefcase, X, AlertCircle, ChevronRight, CreditCard, Droplet, 
  Diamond, Cpu, Landmark, Layers, Shield, Database, Percent, 
  Eye, Gift, Clock, ArrowUp, ArrowDown, Calculator,
  Banknote, Coins, Package, Home, LayoutDashboard
} from 'lucide-react';

import { fetchWithAuth } from '@/utils/api';

// Import the AssetTypeTrendChart component
// You'll need to create this component in your components/charts/ directory
import AssetTypeTrendChart from '@/components/charts/AssetTypeTrendChart';

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

// Color palettes matching your existing theme
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

// Main Dashboard Component
export default function ReportsPage() {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState('3m');
  const [selectedTab, setSelectedTab] = useState('insights');
  const [portfolioData, setPortfolioData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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
  
  // Timeframe Selector Component
  const TimeframeSelector = ({ options, selected, onChange, className = "" }) => {
    return (
      <div className={`flex p-1 space-x-1 bg-gray-200 rounded-lg ${className}`}>
        {options.map((option) => (
          <button
            key={option.id}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${selected === option.id 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
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
  
  // Report Card component matching your existing styling
  const ReportCard = ({ title, subtitle, children, className = "", actions = null }) => {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 ${className}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
        {children}
      </div>
    );
  };
  
  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading your reports...</p>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4">
        <div className="text-red-500 mb-4">
          <AlertCircle size={48} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Unable to Load Reports</h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Portfolio Reports | NestEgg</title>
        <meta name="description" content="Detailed reports and analytics for your investment portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/')}
                className="mr-3 p-2 rounded-full bg-white hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <ArrowRight className="h-5 w-5 transform rotate-180" />
              </button>
              <h1 className="text-3xl font-bold text-gray-800">Portfolio Reports</h1>
            </div>
            <p className="text-gray-600 mt-1">
              Analyze trends and track changes in your investment portfolio
            </p>
          </div>
          <div className="flex mt-4 md:mt-0">
            <TimeframeSelector
              options={timeframeOptions}
              selected={selectedTimeframe}
              onChange={setSelectedTimeframe}
            />
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-1">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                selectedTab === 'insights' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTab('insights')}
            >
              Portfolio Insights
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                selectedTab === 'trends' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTab('trends')}
            >
              Asset Type Trends
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        {selectedTab === 'insights' && (
          <div className="space-y-6">
            {/* Portfolio Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <ReportCard title="Total Portfolio Value" className="col-span-1">
                <div className="text-3xl font-bold text-gray-800">
                  {formatCurrency(portfolioData?.current_value || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {portfolioData?.period_changes?.['1d'] ? 
                    <span className={portfolioData.period_changes['1d'].percent_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercentage(portfolioData.period_changes['1d'].percent_change)} today
                    </span>
                    : 'No change data'
                  }
                </div>
              </ReportCard>
              
              <ReportCard title="Cost Basis" className="col-span-1">
                <div className="text-3xl font-bold text-gray-800">
                  {formatCurrency(portfolioData?.total_cost_basis || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Total invested
                </div>
              </ReportCard>
              
              <ReportCard title="Unrealized Gain" className="col-span-1">
                <div className={`text-3xl font-bold ${
                  (portfolioData?.unrealized_gain || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(portfolioData?.unrealized_gain || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatPercentage(portfolioData?.unrealized_gain_percent || 0)}
                </div>
              </ReportCard>
              
              <ReportCard title="Annual Income" className="col-span-1">
                <div className="text-3xl font-bold text-gray-800">
                  {formatCurrency(portfolioData?.annual_income || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatPercentage(portfolioData?.yield_percentage || 0)} yield
                </div>
              </ReportCard>
            </div>
            
            {/* Charts and detailed analysis would go here */}
            <ReportCard 
              title="Portfolio Performance" 
              subtitle={`Performance over ${selectedTimeframe.toUpperCase()}`}
            >
              <div className="h-80">
                {portfolioData?.performance?.daily ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart2 className="h-12 w-12 mx-auto mb-2" />
                      <p>Portfolio performance chart would be rendered here</p>
                      <p className="text-sm">Using data from {portfolioData.performance.daily.length} days</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                      <p>No performance data available</p>
                    </div>
                  </div>
                )}
              </div>
            </ReportCard>
          </div>
        )}
        
        {selectedTab === 'trends' && (
          <div className="space-y-6">
            <ReportCard 
              title="Asset Type Performance Trends" 
              subtitle="Track how each asset class is performing over time"
            >
              <AssetTypeTrendChart />
            </ReportCard>
          </div>
        )}
        
        {/* Quick Actions Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setSelectedTab('insights')}
            className="flex items-center justify-center space-x-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Portfolio Insights</span>
          </button>
          
          <button 
            onClick={() => setSelectedTab('trends')}
            className="flex items-center justify-center space-x-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <TrendingUp className="h-5 w-5" />
            <span>Asset Type Trends</span>
          </button>
          
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center space-x-2 p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
          >
            <ArrowRight className="h-5 w-5 transform rotate-180" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </main>
    </div>
  );
}

// Import the new AssetTypeTrendChart component
// Note: You'll need to create this as a separate component file
const AssetTypeTrendChart = () => {
  // Placeholder for the asset trend chart
  // In your actual implementation, this would be imported from the component file
  return (
    <div className="h-96 flex items-center justify-center text-gray-400">
      Asset Type Trend Chart Component
      <br />
      <small>Import the AssetTypeTrendChart component here</small>
    </div>
  );
};

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

const chartTypeOptions = [
  { id: 'line', label: 'Line Chart', icon: <LineChartIcon className="h-4 w-4" /> },
  { id: 'bar', label: 'Bar Chart', icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'area', label: 'Area Chart', icon: <Activity className="h-4 w-4" /> },
  { id: 'pie', label: 'Pie Chart', icon: <PieChartIcon className="h-4 w-4" /> }
];

// Reports Page Component
export default function ReportsPage() {
  const router = useRouter();
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('insights');
  const [selectedTimeframe, setSelectedTimeframe] = useState('3m');
  const [portfolioData, setPortfolioData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [assetTypeHistory, setAssetTypeHistory] = useState({});
  const [positionCountHistory, setPositionCountHistory] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  // Custom report builder state
  const [customReportConfig, setCustomReportConfig] = useState({
    title: 'My Custom Report',
    timeframe: '3m',
    chartType: 'line',
    metrics: ['value'], // Available options: value, costBasis, unrealizedGain, etc.
    groupBy: 'day', // day, week, month
    filterAssetTypes: [], // Empty means all
    filterAccounts: [], // Empty means all
    compareWithBenchmark: false,
    benchmark: 'SP500',
    showYieldAnalysis: false,
    percentageView: false
  });
  
  const [savedReports, setSavedReports] = useState([
    {
      id: 'report-1',
      title: 'Cryptocurrency Performance',
      chartType: 'area',
      metrics: ['value', 'costBasis'],
      timeframe: '1y',
      filterAssetTypes: ['crypto'],
      percentageView: false
    },
    {
      id: 'report-2',
      title: 'Sector Allocation Trends',
      chartType: 'pie',
      timeframe: '6m',
      metrics: ['sectorAllocation'],
      groupBy: 'month'
    },
    {
      id: 'report-3',
      title: 'YTD Portfolio Performance (%)',
      chartType: 'line',
      metrics: ['percentChange'],
      timeframe: 'ytd',
      compareWithBenchmark: true,
      benchmark: 'SP500',
      percentageView: true
    }
  ]);
  
  // Fetch portfolio data on mount and when timeframe changes
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
        
        // Process historical data for charts
        if (data?.performance?.daily) {
          const histData = data.performance.daily.map(day => ({
            date: new Date(day.date),
            formattedDate: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: day.value,
            costBasis: day.cost_basis || 0,
            unrealizedGain: day.value - (day.cost_basis || 0),
            unrealizedGainPercent: day.cost_basis ? ((day.value - day.cost_basis) / day.cost_basis) * 100 : 0
          }));
          
          setHistoricalData(histData);
          setDateRange({
            start: histData.length > 0 ? histData[0].date : null,
            end: histData.length > 0 ? histData[histData.length - 1].date : null
          });
          
          // Calculate position count history (mocked data for now)
          // In a real scenario, you'd get this from the API
          const positionCountData = histData.map((day, index) => ({
            date: day.date,
            formattedDate: day.formattedDate,
            count: Math.round(15 + Math.random() * 5 + index * 0.1) // Simulated growth in positions
          }));
          setPositionCountHistory(positionCountData);
          
          // Process asset type allocation history
          const assetTypes = data.asset_allocation ? Object.keys(data.asset_allocation) : [];
          const assetHistoryData = {};
          
          // Simulate historical asset allocation data
          // In a real scenario, you'd get this from the API
          assetTypes.forEach(assetType => {
            assetHistoryData[assetType] = histData.map((day, index) => {
              const currentValue = data.asset_allocation[assetType].value;
              const currentPct = data.asset_allocation[assetType].percentage;
              
              // Create a trend with some random variation
              const factor = 1 + ((index / histData.length) - 0.5) * 0.2 * (Math.random() - 0.5);
              
              return {
                date: day.date,
                formattedDate: day.formattedDate,
                value: currentValue * factor,
                percentage: currentPct * factor
              };
            });
          });
          
          setAssetTypeHistory(assetHistoryData);
          
          // Calculate top movers
          // In a real scenario, you'd get complete position history from the API
          const simulatedPositions = (data.top_positions || []).map(position => {
            const startValue = position.value * (0.7 + Math.random() * 0.3);
            const percentChange = ((position.value - startValue) / startValue) * 100;
            
            return {
              ...position,
              startValue,
              endValue: position.value,
              valueChange: position.value - startValue,
              percentChange
            };
          });
          
          // Sort by absolute percent change to get top movers
          const sortedMovers = [...simulatedPositions].sort((a, b) => 
            Math.abs(b.percentChange) - Math.abs(a.percentChange)
          ).slice(0, 10);
          
          setTopMovers(sortedMovers);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError('Unable to load report data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPortfolioData();
  }, [selectedTimeframe]);
  
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
  
  // Custom date formatter
  const formatDate = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
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
            {payload.map((entry, index) => (
              <p key={index} className={`text-sm text-${entry.color.replace('#', '')}`} style={{ color: entry.color }}>
                <span className="font-medium">{entry.name}: </span> 
                {entry.name.toLowerCase().includes('percent') ? formatPercentage(entry.value) : formatCurrency(entry.value)}
              </p>
            ))}
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Calculate portfolio performance stats
  const calculatePerformanceStats = () => {
    if (!portfolioData || !historicalData || historicalData.length === 0) {
      return {
        totalValue: 0,
        totalGain: 0,
        totalGainPercent: 0,
        periodChange: 0,
        periodChangePercent: 0,
        maxValue: 0,
        minValue: 0,
        volatility: 0
      };
    }
    
    const latestValue = historicalData[historicalData.length - 1].value;
    const startValue = historicalData[0].value;
    const values = historicalData.map(d => d.value);
    
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    // Calculate volatility (standard deviation of daily returns)
    let sumReturns = 0;
    let sumSquaredReturns = 0;
    let countReturns = 0;
    
    for (let i = 1; i < values.length; i++) {
      const dailyReturn = (values[i] - values[i-1]) / values[i-1];
      sumReturns += dailyReturn;
      sumSquaredReturns += dailyReturn * dailyReturn;
      countReturns++;
    }
    
    const meanReturn = countReturns > 0 ? sumReturns / countReturns : 0;
    const variance = countReturns > 0 ? (sumSquaredReturns / countReturns) - (meanReturn * meanReturn) : 0;
    const volatility = Math.sqrt(variance) * 100; // Convert to percentage
    
    return {
      totalValue: latestValue,
      periodChange: latestValue - startValue,
      periodChangePercent: ((latestValue - startValue) / startValue) * 100,
      maxValue,
      minValue,
      volatility
    };
  };
  
  // Performance stats for the selected timeframe
  const performanceStats = useMemo(() => calculatePerformanceStats(), [historicalData]);
  
  // Calculate contribution to growth by asset type
  const calculateAssetTypeContribution = () => {
    if (!assetTypeHistory || Object.keys(assetTypeHistory).length === 0) {
      return [];
    }
    
    const assetTypes = Object.keys(assetTypeHistory);
    const contributions = assetTypes.map(type => {
      const data = assetTypeHistory[type];
      if (!data || data.length < 2) return { type, contribution: 0, percentChange: 0 };
      
      const startValue = data[0].value;
      const endValue = data[data.length - 1].value;
      const contribution = endValue - startValue;
      const percentChange = (contribution / startValue) * 100;
      
      return {
        type,
        startValue,
        endValue,
        contribution,
        percentChange,
        color: assetColors[type] || assetColors.other
      };
    });
    
    // Sort by absolute contribution
    return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  };
  
  // Asset type contribution data
  const assetContributionData = useMemo(() => calculateAssetTypeContribution(), [assetTypeHistory]);
  
  // Get asset allocation data for pie chart
  const assetAllocationData = useMemo(() => {
    if (!portfolioData?.asset_allocation) return [];
    
    return Object.entries(portfolioData.asset_allocation).map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data.value,
      percentage: data.percentage * 100,
      color: assetColors[type.toLowerCase()] || assetColors.other
    }));
  }, [portfolioData]);
  
  // Chart data for custom report
  const getCustomReportChartData = () => {
    let data = [...historicalData];
    
    // Apply custom filters if needed
    if (customReportConfig.filterAssetTypes.length > 0) {
      // In a real app, you would filter the data based on asset types
      // For now, we'll just use a simulated approach
      const filteredData = data.map(day => {
        let multiplier = 0.8; // Reduce the values to simulate filtered data
        return {
          ...day,
          value: day.value * multiplier,
          costBasis: day.costBasis * multiplier,
          unrealizedGain: day.unrealizedGain * multiplier
        };
      });
      data = filteredData;
    }
    
    // Apply group by if needed (day, week, month)
    if (customReportConfig.groupBy !== 'day') {
      // This would require actual date grouping logic
      // For demo, we'll just reduce the number of data points
      const step = customReportConfig.groupBy === 'week' ? 7 : 30;
      data = data.filter((_, index) => index % step === 0);
    }
    
    // Add benchmark data if comparing
    if (customReportConfig.compareWithBenchmark) {
      // Simulate benchmark data
      data = data.map(day => {
        // Create a slightly different trend for benchmark
        const benchmarkValue = day.value * (0.9 + Math.random() * 0.2);
        return {
          ...day,
          benchmark: benchmarkValue,
          benchmarkPercent: ((benchmarkValue / data[0].value) - 1) * 100
        };
      });
    }
    
    // Add percentage change calculation if in percentage view
    if (customReportConfig.percentageView) {
      const baseValue = data[0].value;
      const baseBenchmark = data[0].benchmark;
      
      data = data.map(day => ({
        ...day,
        percentChange: ((day.value / baseValue) - 1) * 100,
        benchmarkPercentChange: customReportConfig.compareWithBenchmark ? 
          ((day.benchmark / baseBenchmark) - 1) * 100 : 0
      }));
    }
    
    return data;
  };
  
  // Custom report chart data
  const customReportData = useMemo(() => getCustomReportChartData(), [customReportConfig, historicalData]);
  
  // Handle saving a custom report
  const handleSaveCustomReport = () => {
    const newReport = {
      id: `report-${Date.now()}`,
      ...customReportConfig
    };
    
    setSavedReports([...savedReports, newReport]);
    
    // Show a success message
    alert('Report configuration saved successfully!');
  };
  
  // Handle loading a saved report
  const handleLoadSavedReport = (reportId) => {
    const report = savedReports.find(r => r.id === reportId);
    if (report) {
      setCustomReportConfig(report);
      setSelectedTimeframe(report.timeframe);
    }
  };
  
  // Custom ReportCard component
  const ReportCard = ({ title, subtitle, children, className = "", actions = null }) => {
    return (
      <div className={`bg-gray-800 dark:bg-gray-800 rounded-xl shadow-md p-5 ${className}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
        {children}
      </div>
    );
  };
  
  // Render portfolio insights dashboard
  const renderInsightsDashboard = () => {
    if (!portfolioData) return null;
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main insights column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Performance metrics */}
          <div className="grid grid-cols-3 gap-4">
            <ReportCard 
              title="Total Value" 
              subtitle={`${selectedTimeframe.toUpperCase()} Performance`}
              className="col-span-1"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold text-white">{formatCurrency(performanceStats.totalValue)}</span>
                  <span className={`flex items-center ${performanceStats.periodChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {performanceStats.periodChangePercent >= 0 ? 
                      <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    }
                    {formatPercentage(performanceStats.periodChangePercent)}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {formatCurrency(performanceStats.periodChange)} change
                </div>
              </div>
            </ReportCard>
            
            <ReportCard 
              title="Value Range" 
              subtitle="Min & Max Values"
              className="col-span-1"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Highest</div>
                    <div className="text-lg font-semibold text-white">{formatCurrency(performanceStats.maxValue)}</div>
                  </div>
                  <ArrowUp className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Lowest</div>
                    <div className="text-lg font-semibold text-white">{formatCurrency(performanceStats.minValue)}</div>
                  </div>
                  <ArrowDown className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </ReportCard>
            
            <ReportCard 
              title="Volatility" 
              subtitle="Daily Price Movement"
              className="col-span-1"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold text-white">{formatPercentage(performanceStats.volatility)}</span>
                  <Activity className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="text-sm text-gray-400">
                  Standard deviation of returns
                </div>
              </div>
            </ReportCard>
          </div>
          
          {/* Portfolio value chart */}
          <ReportCard 
            title="Portfolio Value Over Time" 
            subtitle={`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`}
            actions={
              <TimeframeSelector
                options={timeframeOptions}
                selected={selectedTimeframe}
                onChange={setSelectedTimeframe}
              />
            }
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={historicalData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCostBasis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fill: '#6b7280' }} 
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Area 
                    type="monotone" 
                    name="Portfolio Value"
                    dataKey="value" 
                    stroke="#4f46e5" 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    type="monotone" 
                    name="Cost Basis"
                    dataKey="costBasis" 
                    stroke="#8b5cf6" 
                    fill="url(#colorCostBasis)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ReportCard>
          
          {/* Asset Type Performance Trends */}
          <ReportCard 
            title="Asset Type Performance Trends" 
            subtitle="Market value and cost basis trends by asset class"
          >
            <AssetTypeTrendChart />
          </ReportCard>
          
          {/* Asset type contribution */}
          <ReportCard 
            title="Contribution to Growth by Asset Type" 
            subtitle="How Each Asset Type Contributed to Overall Growth"
          >
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={assetContributionData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  layout="vertical"
                >
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    dataKey="type" 
                    type="category"
                    tick={{ fill: '#d1d5db' }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar 
                    dataKey="contribution" 
                    name="$ Contribution"
                    radius={[4, 4, 4, 4]}
                  >
                    {assetContributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.contribution >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                  <Line 
                    type="monotone" 
                    dataKey="percentChange" 
                    name="% Change"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ReportCard>
          
          {/* Position count trend */}
          <ReportCard 
            title="Number of Positions Over Time" 
            subtitle="Tracking Portfolio Diversification"
          >
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={positionCountHistory}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fill: '#6b7280' }} 
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    name="Position Count"
                    dataKey="count" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ReportCard>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Asset allocation pie chart */}
          <ReportCard 
            title="Current Asset Allocation" 
            subtitle="Distribution by Asset Type"
          >
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
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    labelLine={false}
                  >
                    {assetAllocationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
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
          </ReportCard>
          
          {/* Top movers */}
          <ReportCard 
            title="Top Movers" 
            subtitle="Biggest Value Changes"
          >
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {topMovers.map((position, index) => (
                <div key={index} className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      <div 
                        className="h-6 w-6 rounded-full mr-2 flex items-center justify-center"
                        style={{ backgroundColor: `${assetColors[position.asset_type] || assetColors.other}30` }}
                      >
                        <span style={{ color: assetColors[position.asset_type] || assetColors.other }}>
                          {position.asset_type === 'security' ? 'S' : 
                           position.asset_type === 'crypto' ? 'C' : 
                           position.asset_type === 'cash' ? '$' : 
                           position.asset_type === 'metal' ? 'M' : 'O'}
                        </span>
                      </div>
                      <span className="font-medium text-white">{position.ticker || position.name}</span>
                    </div>
                    <span className={`text-sm font-medium ${position.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(position.percentChange)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">From {formatCurrency(position.startValue)}</span>
                    <span className="text-gray-400">To {formatCurrency(position.endValue)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${position.percentChange >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ 
                        width: `${Math.min(Math.abs(position.percentChange) * 2, 100)}%`,
                        marginLeft: position.percentChange < 0 ? `${100 - Math.min(Math.abs(position.percentChange) * 2, 100)}%` : '0'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </ReportCard>
          
          {/* Historical stats */}
          <ReportCard 
            title="Historical Statistics" 
            subtitle={`For ${selectedTimeframe.toUpperCase()} Period`}
          >
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Date Range</span>
                <span className="text-white">{formatDate(dateRange.start)} - {formatDate(dateRange.end)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Starting Value</span>
                <span className="text-white">{historicalData.length > 0 ? formatCurrency(historicalData[0].value) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ending Value</span>
                <span className="text-white">{historicalData.length > 0 ? formatCurrency(historicalData[historicalData.length - 1].value) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Absolute Change</span>
                <span className="text-white">{formatCurrency(performanceStats.periodChange)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Percent Change</span>
                <span className={`font-medium ${performanceStats.periodChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(performanceStats.periodChangePercent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Volatility</span>
                <span className="text-white">{formatPercentage(performanceStats.volatility)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Points</span>
                <span className="text-white">{historicalData.length}</span>
              </div>
            </div>
          </ReportCard>
        </div>
      </div>
    );
  };
  
  // Render custom report builder
  const renderCustomReportBuilder = () => {
    // Determine which chart to display based on the selected chart type
    const renderCustomChart = () => {
      const data = customReportData;
      const isPercentageView = customReportConfig.percentageView;
      
      // Determine which data points to display
      const metrics = customReportConfig.metrics;
      const showValue = metrics.includes('value');
      const showCostBasis = metrics.includes('costBasis');
      const showUnrealizedGain = metrics.includes('unrealizedGain');
      
      // Apply value transformation for percentage view
      const getYAxisFormatter = () => {
        if (isPercentageView) {
          return (value) => `${value.toFixed(0)}%`;
        } else {
          return (value) => `$${(value / 1000).toFixed(0)}k`;
        }
      };
      
      switch (customReportConfig.chartType) {
        case 'line':
          return (
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fill: '#6b7280' }} 
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={getYAxisFormatter()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              
              {isPercentageView ? (
                <>
                  <Line 
                    type="monotone" 
                    name="Portfolio Value %"
                    dataKey="percentChange" 
                    stroke="#4f46e5" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  {customReportConfig.compareWithBenchmark && (
                    <Line 
                      type="monotone" 
                      name="Benchmark %"
                      dataKey="benchmarkPercentChange" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </>
              ) : (
                <>
                  {showValue && (
                    <Line 
                      type="monotone" 
                      name="Portfolio Value"
                      dataKey="value" 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {showCostBasis && (
                    <Line 
                      type="monotone" 
                      name="Cost Basis"
                      dataKey="costBasis" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {showUnrealizedGain && (
                    <Line 
                      type="monotone" 
                      name="Unrealized Gain"
                      dataKey="unrealizedGain" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {customReportConfig.compareWithBenchmark && (
                    <Line 
                      type="monotone" 
                      name="Benchmark"
                      dataKey="benchmark" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </>
              )}
            </LineChart>
          );
          
        case 'area':
          return (
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCostBasis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fill: '#6b7280' }} 
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={getYAxisFormatter()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              
              {isPercentageView ? (
                <>
                  <Area 
                    type="monotone" 
                    name="Portfolio Value %"
                    dataKey="percentChange" 
                    stroke="#4f46e5" 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                  {customReportConfig.compareWithBenchmark && (
                    <Area 
                      type="monotone" 
                      name="Benchmark %"
                      dataKey="benchmarkPercentChange" 
                      stroke="#f59e0b" 
                      fill="url(#colorBenchmark)" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </>
              ) : (
                <>
                  {showValue && (
                    <Area 
                      type="monotone" 
                      name="Portfolio Value"
                      dataKey="value" 
                      stroke="#4f46e5" 
                      fill="url(#colorValue)" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {showCostBasis && (
                    <Area 
                      type="monotone" 
                      name="Cost Basis"
                      dataKey="costBasis" 
                      stroke="#8b5cf6" 
                      fill="url(#colorCostBasis)" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {showUnrealizedGain && (
                    <Area 
                      type="monotone" 
                      name="Unrealized Gain"
                      dataKey="unrealizedGain" 
                      stroke="#10b981" 
                      fill="url(#colorGain)" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {customReportConfig.compareWithBenchmark && (
                    <Area 
                      type="monotone" 
                      name="Benchmark"
                      dataKey="benchmark" 
                      stroke="#f59e0b" 
                      fill="url(#colorBenchmark)" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </>
              )}
            </AreaChart>
          );
          
        case 'bar':
          return (
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fill: '#6b7280' }} 
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={getYAxisFormatter()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              
              {isPercentageView ? (
                <>
                  <Bar 
                    name="Portfolio Value %"
                    dataKey="percentChange" 
                    fill="#4f46e5" 
                    radius={[4, 4, 0, 0]}
                  />
                  {customReportConfig.compareWithBenchmark && (
                    <Bar 
                      name="Benchmark %"
                      dataKey="benchmarkPercentChange" 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </>
              ) : (
                <>
                  {showValue && (
                    <Bar 
                      name="Portfolio Value"
                      dataKey="value" 
                      fill="#4f46e5" 
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  {showCostBasis && (
                    <Bar 
                      name="Cost Basis"
                      dataKey="costBasis" 
                      fill="#8b5cf6" 
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  {showUnrealizedGain && (
                    <Bar 
                      name="Unrealized Gain"
                      dataKey="unrealizedGain" 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  {customReportConfig.compareWithBenchmark && (
                    <Bar 
                      name="Benchmark"
                      dataKey="benchmark" 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                </>
              )}
            </BarChart>
          );
          
        case 'pie':
          // For pie chart, we'll show the latest snapshot
          const latestData = data.length > 0 ? data[data.length - 1] : null;
          
          if (!latestData) return <div className="text-center text-gray-400 py-10">No data available</div>;
          
          // Generate pie chart data from the latest snapshot
          // For demo purposes, we'll use asset allocation data
          return (
            <PieChart>
              <Pie
                data={assetAllocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                labelLine={false}
              >
                {assetAllocationData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => isPercentageView ? `${(value / data[0].value * 100).toFixed(2)}%` : formatCurrency(value)}
                labelFormatter={(index) => assetAllocationData[index]?.name}
              />
              <Legend verticalAlign="bottom" />
            </PieChart>
          );
          
        default:
          return <div className="text-center text-gray-400 py-10">Select a chart type</div>;
      }
    };
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Configuration panel */}
        <div className="lg:col-span-4 space-y-4">
          <ReportCard 
            title="Report Configuration" 
            subtitle="Customize Your Report"
          >
            <div className="space-y-4">
              {/* Report title */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Report Title</label>
                <input
                  type="text"
                  className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={customReportConfig.title}
                  onChange={(e) => setCustomReportConfig({
                    ...customReportConfig,
                    title: e.target.value
                  })}
                  placeholder="Enter report title"
                />
              </div>
              
              {/* Timeframe */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Time Period</label>
                <div className="w-full flex p-1 bg-gray-700 rounded-md">
                  {timeframeOptions.map((option) => (
                    <button
                      key={option.id}
                      className={`
                        flex-1 px-2 py-1.5 text-xs rounded-md transition-colors
                        ${customReportConfig.timeframe === option.id 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-300 hover:text-white hover:bg-gray-600'
                        }
                      `}
                      onClick={() => {
                        setCustomReportConfig({
                          ...customReportConfig,
                          timeframe: option.id
                        });
                        setSelectedTimeframe(option.id);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chart type */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Chart Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {chartTypeOptions.map((option) => (
                    <button
                      key={option.id}
                      className={`
                        p-2 rounded-md flex items-center justify-center space-x-2 text-sm
                        ${customReportConfig.chartType === option.id 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        }
                      `}
                      onClick={() => setCustomReportConfig({
                        ...customReportConfig,
                        chartType: option.id
                      })}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Metrics */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Metrics to Display</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="metric-value"
                      checked={customReportConfig.metrics.includes('value')}
                      onChange={(e) => {
                        const metrics = e.target.checked
                          ? [...customReportConfig.metrics, 'value']
                          : customReportConfig.metrics.filter(m => m !== 'value');
                        setCustomReportConfig({
                          ...customReportConfig,
                          metrics
                        });
                      }}
                      className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-opacity-25"
                    />
                    <label htmlFor="metric-value" className="ml-2 text-sm text-gray-300">
                      Portfolio Value
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="metric-costbasis"
                      checked={customReportConfig.metrics.includes('costBasis')}
                      onChange={(e) => {
                        const metrics = e.target.checked
                          ? [...customReportConfig.metrics, 'costBasis']
                          : customReportConfig.metrics.filter(m => m !== 'costBasis');
                        setCustomReportConfig({
                          ...customReportConfig,
                          metrics
                        });
                      }}
                      className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-opacity-25"
                    />
                    <label htmlFor="metric-costbasis" className="ml-2 text-sm text-gray-300">
                      Cost Basis
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="metric-gain"
                      checked={customReportConfig.metrics.includes('unrealizedGain')}
                      onChange={(e) => {
                        const metrics = e.target.checked
                          ? [...customReportConfig.metrics, 'unrealizedGain']
                          : customReportConfig.metrics.filter(m => m !== 'unrealizedGain');
                        setCustomReportConfig({
                          ...customReportConfig,
                          metrics
                        });
                      }}
                      className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-opacity-25"
                    />
                    <label htmlFor="metric-gain" className="ml-2 text-sm text-gray-300">
                      Unrealized Gain
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Group by */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Group By</label>
                <select
                  value={customReportConfig.groupBy}
                  onChange={(e) => setCustomReportConfig({
                    ...customReportConfig,
                    groupBy: e.target.value
                  })}
                  className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
              
              {/* Display options */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Display Options</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="option-percentage"
                      checked={customReportConfig.percentageView}
                      onChange={(e) => setCustomReportConfig({
                        ...customReportConfig,
                        percentageView: e.target.checked
                      })}
                      className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-opacity-25"
                    />
                    <label htmlFor="option-percentage" className="ml-2 text-sm text-gray-300">
                      Percentage View
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="option-benchmark"
                      checked={customReportConfig.compareWithBenchmark}
                      onChange={(e) => setCustomReportConfig({
                        ...customReportConfig,
                        compareWithBenchmark: e.target.checked
                      })}
                      className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:ring-opacity-25"
                    />
                    <label htmlFor="option-benchmark" className="ml-2 text-sm text-gray-300">
                      Compare with Benchmark
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Benchmark selection (if benchmark comparison is enabled) */}
              {customReportConfig.compareWithBenchmark && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Benchmark</label>
                  <select
                    value={customReportConfig.benchmark}
                    onChange={(e) => setCustomReportConfig({
                      ...customReportConfig,
                      benchmark: e.target.value
                    })}
                    className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="SP500">S&P 500</option>
                    <option value="NASDAQ">NASDAQ Composite</option>
                    <option value="DJIA">Dow Jones Industrial Average</option>
                    <option value="RUSSELL2000">Russell 2000</option>
                  </select>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <button
                  onClick={handleSaveCustomReport}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Report</span>
                </button>
                
                <button
                  onClick={() => {
                    // Reset to default config
                    setCustomReportConfig({
                      title: 'My Custom Report',
                      timeframe: '3m',
                      chartType: 'line',
                      metrics: ['value'],
                      groupBy: 'day',
                      filterAssetTypes: [],
                      filterAccounts: [],
                      compareWithBenchmark: false,
                      benchmark: 'SP500',
                      showYieldAnalysis: false,
                      percentageView: false
                    });
                    setSelectedTimeframe('3m');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </ReportCard>
          
          {/* Saved reports */}
          <ReportCard 
            title="Saved Reports" 
            subtitle="Your Custom Reports"
          >
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {savedReports.map((report) => (
                <div 
                  key={report.id}
                  className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
                  onClick={() => handleLoadSavedReport(report.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-white">{report.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                        <span>{report.timeframe.toUpperCase()}</span>
                        <span>•</span>
                        <div className="flex items-center">
                          {report.chartType === 'line' && <LineChartIcon className="h-3 w-3 mr-1" />}
                          {report.chartType === 'bar' && <BarChart2 className="h-3 w-3 mr-1" />}
                          {report.chartType === 'area' && <Activity className="h-3 w-3 mr-1" />}
                          {report.chartType === 'pie' && <PieChartIcon className="h-3 w-3 mr-1" />}
                          <span>{report.chartType.charAt(0).toUpperCase() + report.chartType.slice(1)}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
              
              {savedReports.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <Save className="h-6 w-6 mx-auto mb-2" />
                  <p>No saved reports yet</p>
                  <p className="text-xs mt-1">Configure and save a report to see it here</p>
                </div>
              )}
            </div>
          </ReportCard>
          
          {/* Export options */}
          <ReportCard 
            title="Export Options" 
            subtitle="Save or Share Your Report"
          >
            <div className="space-y-3">
              <button
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2"
                onClick={() => alert('Export as PDF feature would be implemented here')}
              >
                <Download className="h-4 w-4" />
                <span>Export as PDF</span>
              </button>
              
              <button
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2"
                onClick={() => alert('Export as CSV feature would be implemented here')}
              >
                <Download className="h-4 w-4" />
                <span>Export as CSV</span>
              </button>
              
              <button
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md flex items-center justify-center space-x-2"
                onClick={() => alert('Share report feature would be implemented here')}
              >
                <Share2 className="h-4 w-4" />
                <span>Share Report</span>
              </button>
            </div>
          </ReportCard>
        </div>
        
        {/* Report preview */}
        <div className="lg:col-span-8 space-y-4">
          <ReportCard 
            title={customReportConfig.title}
            subtitle={`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`}
            actions={
              <div className="flex space-x-2">
                <button
                  onClick={() => alert('Print report feature would be implemented here')}
                  className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => alert('Share report feature would be implemented here')}
                  className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            }
          >
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                {renderCustomChart()}
              </ResponsiveContainer>
            </div>
          </ReportCard>
          
          {/* Report summary */}
          <ReportCard 
            title="Report Summary" 
            subtitle="Key Metrics from Your Custom Report"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                <div className="text-sm text-gray-400 mb-1">Start Value</div>
                <div className="font-semibold text-white">
                  {customReportData.length > 0 ? formatCurrency(customReportData[0].value) : '-'}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                <div className="text-sm text-gray-400 mb-1">End Value</div>
                <div className="font-semibold text-white">
                  {customReportData.length > 0 ? formatCurrency(customReportData[customReportData.length - 1].value) : '-'}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                <div className="text-sm text-gray-400 mb-1">Total Change</div>
                {customReportData.length > 0 ? (
                  <div className={`font-semibold ${
                    customReportData[customReportData.length - 1].value - customReportData[0].value >= 0 ? 
                    'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(customReportData[customReportData.length - 1].value - customReportData[0].value)}
                  </div>
                ) : (
                  <div className="font-semibold text-white">-</div>
                )}
              </div>
              
              <div className="p-3 rounded-lg bg-gray-700 dark:bg-gray-750">
                <div className="text-sm text-gray-400 mb-1">Percent Change</div>
                {customReportData.length > 0 ? (
                  <div className={`font-semibold flex items-center ${
                    customReportData[customReportData.length - 1].value - customReportData[0].value >= 0 ? 
                    'text-green-400' : 'text-red-400'
                  }`}>
                    {customReportData[customReportData.length - 1].value - customReportData[0].value >= 0 ? 
                      <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    }
                    {formatPercentage(((customReportData[customReportData.length - 1].value / customReportData[0].value) - 1) * 100)}
                  </div>
                ) : (
                  <div className="font-semibold text-white">-</div>
                )}
              </div>
            </div>
            
            {/* Table view of data */}
            <div className="mt-6">
              <div className="text-sm font-medium text-gray-400 mb-2">Data Table View</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      {customReportConfig.metrics.includes('value') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                      )}
                      {customReportConfig.metrics.includes('costBasis') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cost Basis</th>
                      )}
                      {customReportConfig.metrics.includes('unrealizedGain') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Unrealized Gain</th>
                      )}
                      {customReportConfig.compareWithBenchmark && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Benchmark</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-750">
                    {customReportData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-700">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{row.formattedDate}</td>
                        {customReportConfig.metrics.includes('value') && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">
                            {customReportConfig.percentageView ? 
                              formatPercentage(row.percentChange) : 
                              formatCurrency(row.value)
                            }
                          </td>
                        )}
                        {customReportConfig.metrics.includes('costBasis') && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{formatCurrency(row.costBasis)}</td>
                        )}
                        {customReportConfig.metrics.includes('unrealizedGain') && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{formatCurrency(row.unrealizedGain)}</td>
                        )}
                        {customReportConfig.compareWithBenchmark && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">
                            {customReportConfig.percentageView ? 
                              formatPercentage(row.benchmarkPercentChange) : 
                              formatCurrency(row.benchmark)
                            }
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {customReportData.length > 5 && (
                  <div className="text-center mt-2 text-sm text-gray-400">
                    Showing 5 of {customReportData.length} data points
                  </div>
                )}
              </div>
            </div>
          </ReportCard>
        </div>
      </div>
    );
  };
  
  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-300 dark:text-gray-300">Loading your reports...</p>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <AlertTriangle size={48} />
        </div>
        <h1 className="text-2xl font-bold text-white dark:text-white mb-2">Unable to Load Reports</h1>
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
        <title>NestEgg | Portfolio Reports</title>
        <meta name="description" content="Detailed reports and analytics for your investment portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/')}
                className="mr-3 p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-white">Portfolio Reports</h1>
            </div>
            <p className="text-gray-400 mt-1">
              Analyze trends and track changes in your investment portfolio
            </p>
          </div>
          <div className="flex mt-4 md:mt-0">
            <TimeframeSelector
              options={timeframeOptions}
              selected={selectedTimeframe}
              onChange={setSelectedTimeframe}
            />
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex space-x-1">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                selectedTab === 'insights' 
                  ? 'text-indigo-400 border-indigo-400' 
                  : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
              }`}
              onClick={() => setSelectedTab('insights')}
            >
              Insights Dashboard
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                selectedTab === 'custom' 
                  ? 'text-indigo-400 border-indigo-400' 
                  : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
              }`}
              onClick={() => setSelectedTab('custom')}
            >
              Custom Report Builder
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        {selectedTab === 'insights' ? renderInsightsDashboard() : renderCustomReportBuilder()}
        
        {/* Quick Actions Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setSelectedTab('insights')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Insights Dashboard</span>
          </button>
          
          <button 
            onClick={() => setSelectedTab('custom')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
          >
            <BarChart2 className="h-5 w-5" />
            <span>Create Custom Report</span>
          </button>
          
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </main>
    </div>
  );
}