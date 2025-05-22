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
  Banknote, Coins, Package, Home, LayoutDashboard, ArrowLeft,
  LineChart as LineChartIcon, PieChart as PieChartIcon, Save,
  RefreshCw, Download, Share2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

import { fetchWithAuth } from '@/utils/api';
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

const chartTypeOptions = [
  { id: 'line', label: 'Line Chart', icon: <LineChartIcon className="h-4 w-4" /> },
  { id: 'bar', label: 'Bar Chart', icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'area', label: 'Area Chart', icon: <Activity className="h-4 w-4" /> },
  { id: 'pie', label: 'Pie Chart', icon: <PieChartIcon className="h-4 w-4" /> }
];

// Main Reports Page Component
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
          const positionCountData = histData.map((day, index) => ({
            date: day.date,
            formattedDate: day.formattedDate,
            count: Math.round(15 + Math.random() * 5 + index * 0.1)
          }));
          setPositionCountHistory(positionCountData);
          
          // Process asset type allocation history
          const assetTypes = data.asset_allocation ? Object.keys(data.asset_allocation) : [];
          const assetHistoryData = {};
          
          assetTypes.forEach(assetType => {
            assetHistoryData[assetType] = histData.map((day, index) => {
              const currentValue = data.asset_allocation[assetType].value;
              const currentPct = data.asset_allocation[assetType].percentage;
              
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
              <p key={index} className={`text-sm`} style={{ color: entry.color }}>
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
    
    // Calculate volatility
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
    const volatility = Math.sqrt(variance) * 100;
    
    return {
      totalValue: latestValue,
      periodChange: latestValue - startValue,
      periodChangePercent: ((latestValue - startValue) / startValue) * 100,
      maxValue,
      minValue,
      volatility
    };
  };
  
  const performanceStats = useMemo(() => calculatePerformanceStats(), [historicalData]);
  
  // Calculate asset type contribution
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
    
    return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  };
  
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
  
  // Handle saving a custom report
  const handleSaveCustomReport = () => {
    const newReport = {
      id: `report-${Date.now()}`,
      ...customReportConfig
    };
    
    setSavedReports([...savedReports, newReport]);
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
  
  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-300">Loading your reports...</p>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="text-red-500 mb-4">
          <AlertCircle size={48} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Reports</h1>
        <p className="text-gray-300 mb-6 text-center max-w-md">{error}</p>
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
                selectedTab === 'trends' 
                  ? 'text-indigo-400 border-indigo-400' 
                  : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
              }`}
              onClick={() => setSelectedTab('trends')}
            >
              Asset Type Trends
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        {selectedTab === 'insights' && (
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
            </div>
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
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Insights Dashboard</span>
          </button>
          
          <button 
            onClick={() => setSelectedTab('trends')}
            className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
          >
            <TrendingUp className="h-5 w-5" />
            <span>Asset Type Trends</span>
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