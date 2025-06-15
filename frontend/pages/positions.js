import React, { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, Percent, Layers, 
  ArrowUp, ArrowDown, BarChart4, LineChart, PieChart as PieChartIcon,
  Briefcase, RefreshCw, Search, X, Filter, Sparkles,
  Diamond, Coins, Package, Home, Plus, Eye, EyeOff,
  Activity, Zap, Trophy, Target, AlertCircle, ChevronRight,
  Globe, Shield, Clock, Star, ArrowUpRight, ArrowDownRight,
  Wallet, CreditCard, Building2, ChartBar, Gauge, Flame,
  Moon, Sun, Cpu, Gem, DollarSign as Dollar, Bitcoin
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, LineChart as RechartsLineChart, Line, ComposedChart
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { fetchUnifiedPositions } from '@/utils/apimethods/positionMethods';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import AddPositionButton from '@/components/AddPositionButton';

export default function PositionsPage() {
  const [positions, setPositions] = useState([]);
  const [portfolioData, setPortfolioData] = useState(null);
  const [positionMetrics, setPositionMetrics] = useState({});
  const [filterView, setFilterView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showValues, setShowValues] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // table, grid, cards
  const containerRef = useRef(null);
  
  const router = useRouter();
  
  // Simplified color schemes
  const assetTypeConfig = {
    'security': { 
      icon: <LineChart className="w-4 h-4" />, 
      color: '#2563eb',
      bgColor: 'bg-blue-500/10'
    },
    'cash': { 
      icon: <Dollar className="w-4 h-4" />, 
      color: '#10b981',
      bgColor: 'bg-emerald-500/10'
    },
    'crypto': { 
      icon: <Bitcoin className="w-4 h-4" />, 
      color: '#8b5cf6',
      bgColor: 'bg-purple-500/10'
    },
    'bond': { 
      icon: <Shield className="w-4 h-4" />, 
      color: '#ec4899',
      bgColor: 'bg-pink-500/10'
    },
    'metal': { 
      icon: <Gem className="w-4 h-4" />, 
      color: '#f97316',
      bgColor: 'bg-orange-500/10'
    },
    'currency': { 
      icon: <Globe className="w-4 h-4" />, 
      color: '#3b82f6',
      bgColor: 'bg-blue-500/10'
    },
    'realestate': { 
      icon: <Home className="w-4 h-4" />, 
      color: '#ef4444',
      bgColor: 'bg-red-500/10'
    },
    'other': { 
      icon: <Layers className="w-4 h-4" />, 
      color: '#6b7280',
      bgColor: 'bg-gray-500/10'
    }
  };
  
  // Simplified sector colors
  const sectorColors = {
    'Technology': '#2563eb',
    'Financial Services': '#10b981',
    'Healthcare': '#ef4444',
    'Consumer Cyclical': '#f97316',
    'Communication Services': '#8b5cf6',
    'Industrials': '#6b7280',
    'Consumer Defensive': '#14b8a6',
    'Energy': '#f59e0b',
    'Basic Materials': '#f43f5e',
    'Real Estate': '#84cc16',
    'Utilities': '#0ea5e9',
    'Unknown': '#9ca3af'
  };
  
  // Filter options with icons
  const filterOptions = [
    { id: 'all', label: 'All', icon: <Layers className="w-3 h-3" /> },
    { id: 'security', label: 'Securities', icon: <LineChart className="w-3 h-3" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-3 h-3" /> },
    { id: 'metal', label: 'Metals', icon: <Gem className="w-3 h-3" /> },
    { id: 'realestate', label: 'Real Estate', icon: <Home className="w-3 h-3" /> },
    { id: 'gainers', label: 'Gainers', icon: <TrendingUp className="w-3 h-3" /> },
    { id: 'losers', label: 'Losers', icon: <TrendingDown className="w-3 h-3" /> }
  ];
  
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (portfolioData) {
      loadPortfolioData();
    }
  }, [selectedTimeframe]);
  
  // Load all data
  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedPositions, portfolioResponse] = await Promise.all([
        fetchUnifiedPositions(),
        fetchWithAuth(`/portfolio/snapshots?timeframe=${selectedTimeframe}&include_cost_basis=true`)
      ]);

      const portfolioJson = await portfolioResponse.json();
      
      console.log("Positions: Fetched unified positions:", fetchedPositions.length);
      setPositions(fetchedPositions);
      setPortfolioData(portfolioJson);
      
      // Calculate position metrics with portfolio data
      const metrics = calculatePositionMetrics(fetchedPositions, portfolioJson);
      setPositionMetrics(metrics);
    } catch (error) {
      console.error("Error loading data:", error);
      setError(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Load portfolio data
  const loadPortfolioData = async () => {
    try {
      const response = await fetchWithAuth(`/portfolio/snapshots?timeframe=${selectedTimeframe}&include_cost_basis=true`);
      const data = await response.json();
      setPortfolioData(data);
      
      if (positions.length > 0) {
        const metrics = calculatePositionMetrics(positions, data);
        setPositionMetrics(metrics);
      }
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    }
  };
  
  // Calculate metrics
  const calculatePositionMetrics = (positions, portfolio) => {
    if (!positions || positions.length === 0) {
      return {
        totalPositions: 0,
        totalValue: 0,
        totalCostBasis: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        topGainers: [],
        topLosers: [],
        assetAllocation: [],
        sectorAllocation: [],
        performanceData: [],
        riskMetrics: {},
        diversificationScore: 0
      };
    }
    
    const metrics = {
      totalPositions: positions.length,
      totalValue: portfolio?.current_value || 0,
      totalCostBasis: portfolio?.total_cost_basis || 0,
      totalGainLoss: portfolio?.unrealized_gain || 0,
      totalGainLossPercent: portfolio?.unrealized_gain_percent || 0,
      annualIncome: portfolio?.annual_income || 0,
      yieldPercentage: portfolio?.yield_percentage || 0,
      periodChanges: portfolio?.period_changes || {},
      largestPosition: null,
      smallestPosition: null,
      mostProfitablePosition: null,
      leastProfitablePosition: null,
      topGainers: [],
      topLosers: [],
      assetAllocation: [],
      sectorAllocation: [],
      performanceData: portfolio?.performance?.daily || [],
      topPositions: portfolio?.top_positions || [],
      accountAllocation: portfolio?.account_allocation || [],
      riskMetrics: {},
      diversificationScore: 0
    };
    
    // Maps for aggregating data
    const assetTypeMap = {};
    const sectorMap = {};
    const correlationData = [];
    
    // Process positions
    positions.forEach(position => {
      const currentValue = parseFloat(position.current_value) || 0;
      const costBasis = parseFloat(position.total_cost_basis) || 0;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) : 0;
      const assetType = position.asset_type || 'other';
      const sector = position.sector || 'Unknown';
      
      // Track largest position
      if (!metrics.largestPosition || currentValue > metrics.largestPosition.value) {
        metrics.largestPosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          value: currentValue,
          percentage: metrics.totalValue > 0 ? (currentValue / metrics.totalValue) : 0
        };
      }
      
      // Track smallest position
      if (!metrics.smallestPosition || (currentValue > 0 && currentValue < metrics.smallestPosition.value)) {
        metrics.smallestPosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          value: currentValue
        };
      }
      
      // Track most profitable position
      if (!metrics.mostProfitablePosition || gainLoss > metrics.mostProfitablePosition.gainLoss) {
        metrics.mostProfitablePosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent
        };
      }
      
      // Track least profitable position
      if (!metrics.leastProfitablePosition || gainLoss < metrics.leastProfitablePosition.gainLoss) {
        metrics.leastProfitablePosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent
        };
      }
      
      // Aggregate by asset type
      if (!assetTypeMap[assetType]) {
        assetTypeMap[assetType] = {
          name: assetType.charAt(0).toUpperCase() + assetType.slice(1),
          value: 0,
          count: 0,
          avgGainLoss: 0,
          totalGainLoss: 0
        };
      }
      assetTypeMap[assetType].value += currentValue;
      assetTypeMap[assetType].count += 1;
      assetTypeMap[assetType].totalGainLoss += gainLoss;
      
      // Aggregate by sector (only for securities)
      if (assetType === 'security') {
        if (!sectorMap[sector]) {
          sectorMap[sector] = {
            name: sector,
            value: 0,
            count: 0,
            avgGainLoss: 0,
            totalGainLoss: 0
          };
        }
        sectorMap[sector].value += currentValue;
        sectorMap[sector].count += 1;
        sectorMap[sector].totalGainLoss += gainLoss;
      }
      
      // Collect data for correlation analysis
      correlationData.push({
        value: currentValue,
        gainLoss: gainLoss,
        type: assetType,
        sector: sector
      });
    });
    
    // Calculate averages
    Object.values(assetTypeMap).forEach(type => {
      type.avgGainLoss = type.count > 0 ? type.totalGainLoss / type.count : 0;
      type.avgGainLossPercent = type.value > 0 ? (type.totalGainLoss / type.value) : 0;
    });
    
    Object.values(sectorMap).forEach(sector => {
      sector.avgGainLoss = sector.count > 0 ? sector.totalGainLoss / sector.count : 0;
      sector.avgGainLossPercent = sector.value > 0 ? (sector.totalGainLoss / sector.value) : 0;
    });
    
    // Get portfolio data from API response
    if (portfolio?.asset_allocation) {
      metrics.assetAllocation = Object.entries(portfolio.asset_allocation).map(([type, data]) => ({
        name: type.charAt(0).toUpperCase() + type.slice(1),
        value: data.value,
        percentage: data.percentage,
        config: assetTypeConfig[type] || assetTypeConfig.other
      }));
    }
    
    if (portfolio?.sector_allocation) {
      metrics.sectorAllocation = Object.entries(portfolio.sector_allocation).map(([sector, data]) => ({
        name: sector,
        value: data.value,
        percentage: data.percentage,
        color: sectorColors[sector] || sectorColors.Unknown
      }));
    }
    
    // Process top positions
    const positionsWithGainLoss = positions
      .map(position => {
        const currentValue = parseFloat(position.current_value) || 0;
        const costBasis = parseFloat(position.total_cost_basis) || 0;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) : 0;
        
        return {
          name: position.name || position.identifier,
          identifier: position.identifier,
          assetType: position.asset_type,
          value: currentValue,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent,
          quantity: position.quantity,
          price: position.current_price,
          sector: position.sector,
          account: position.account_name
        };
      })
      .filter(position => position.value > 0);
    
    // Get top gainers and losers
    metrics.topGainers = [...positionsWithGainLoss]
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);
      
    metrics.topLosers = [...positionsWithGainLoss]
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, 5);
    
    // Calculate risk metrics
    const positionWeights = positionsWithGainLoss.map(p => p.value / metrics.totalValue);
    const concentration = positionWeights.reduce((sum, weight) => sum + Math.pow(weight, 2), 0);
    metrics.diversificationScore = Math.max(0, Math.min(100, (1 - concentration) * 100));
    
    // Calculate volatility proxy (simplified)
    const gainLossPercentages = positionsWithGainLoss.map(p => p.gainLossPercent);
    const avgGainLoss = gainLossPercentages.reduce((sum, gl) => sum + gl, 0) / gainLossPercentages.length;
    const variance = gainLossPercentages.reduce((sum, gl) => sum + Math.pow(gl - avgGainLoss, 2), 0) / gainLossPercentages.length;
    metrics.riskMetrics.volatility = Math.sqrt(variance);
    metrics.riskMetrics.sharpeRatio = avgGainLoss / (metrics.riskMetrics.volatility || 1);
    
    return metrics;
  };
  
  // Filter positions
  const filteredPositions = useMemo(() => {
    return positions.filter(position => {
      const matchesSearch = !searchTerm || 
        (position.name && position.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (position.identifier && position.identifier.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesFilter = true;
      switch(filterView) {
        case 'security':
        case 'crypto':
        case 'metal':
        case 'realestate':
          matchesFilter = position.asset_type === filterView;
          break;
        case 'gainers':
          const gainLoss = (parseFloat(position.current_value) || 0) - (parseFloat(position.total_cost_basis) || 0);
          matchesFilter = gainLoss > 0;
          break;
        case 'losers':
          const loss = (parseFloat(position.current_value) || 0) - (parseFloat(position.total_cost_basis) || 0);
          matchesFilter = loss < 0;
          break;
        default:
          matchesFilter = true;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [positions, searchTerm, filterView]);
  
  // Simplified tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 p-3 shadow-lg rounded-lg border border-gray-700">
          <p className="font-medium text-white text-sm mb-1">{data.name || label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center space-x-3">
              <span className="text-gray-400 text-xs">{entry.name}:</span>
              <span className="text-white text-sm font-medium">
                {entry.name.includes('%') ? formatPercentage(entry.value) : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Refresh handler
  const handleRefreshPositions = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetchWithAuth('/positions/refresh', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh positions');
      }
      
      await loadAllData();
    } catch (error) {
      console.error("Error refreshing positions:", error);
      setError(error.message || "Failed to refresh positions");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handlePositionAdded = async () => {
    await loadAllData();
  };

  // Get current period change
  const getCurrentPeriodChange = () => {
    const periodMap = {
      '1d': positionMetrics.periodChanges?.['1d'],
      '1w': positionMetrics.periodChanges?.['1w'],
      '1m': positionMetrics.periodChanges?.['1m'],
      'ytd': positionMetrics.periodChanges?.['ytd']
    };
    return periodMap[selectedTimeframe] || positionMetrics.periodChanges?.['1m'];
  };

  const currentPeriodChange = getCurrentPeriodChange();
  
  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white">
      <Head>
        <title>NestEgg | Positions</title>
        <meta name="description" content="Portfolio positions management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Simplified Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      </div>
      
      <div className="relative z-10 container mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Positions</h1>
              <p className="text-gray-400 text-sm flex items-center">
                <Activity className="w-3 h-3 mr-2" />
                Real-time portfolio tracking
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <button
                onClick={() => setShowValues(!showValues)}
                className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              
              <button
                onClick={handleRefreshPositions}
                className="flex items-center px-4 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <AddPositionButton 
                onPositionAdded={handlePositionAdded}
                className="bg-green-600 rounded-lg hover:bg-green-700"
              />
            </div>
          </div>
        </header>

        {/* Summary Section */}
        <section className="mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main metrics */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-sm">Portfolio Value</p>
                  <div className="flex items-center space-x-2">
                    {['1d', '1w', '1m', 'ytd'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedTimeframe(period)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          selectedTimeframe === period
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {period.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold mb-2">
                  {showValues ? formatCurrency(positionMetrics.totalValue) : '••••••'}
                </h2>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center ${currentPeriodChange?.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentPeriodChange?.percent_change >= 0 ? 
                        <ArrowUpRight className="w-4 h-4" /> : 
                        <ArrowDownRight className="w-4 h-4" />
                      }
                      <span className="text-lg font-medium">
                        {currentPeriodChange ? formatPercentage(currentPeriodChange.percent_change) : '0.00%'}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">({selectedTimeframe})</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Change:</span>
                    <span className={`text-lg font-medium ${currentPeriodChange?.value_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {showValues && currentPeriodChange ? formatCurrency(currentPeriodChange.value_change) : '••••'}
                    </span>
                  </div>
                </div>
                
                {/* Performance chart */}
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={positionMetrics.performanceData?.slice(-30) || []}>
                      <defs>
                        <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#2563eb"
                        fillOpacity={1}
                        fill="url(#performanceGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Key metrics sidebar */}
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Total Gain/Loss</span>
                    {positionMetrics.totalGainLoss >= 0 ? 
                      <TrendingUp className="w-4 h-4 text-green-400" /> : 
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <p className={`text-xl font-bold ${positionMetrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {showValues ? formatCurrency(positionMetrics.totalGainLoss) : '••••'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatPercentage(positionMetrics.totalGainLossPercent)} return
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Income & Yield</span>
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    {showValues ? formatCurrency(positionMetrics.annualIncome) : '••••'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatPercentage(positionMetrics.yieldPercentage)} yield
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Positions</span>
                    <Layers className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-xl font-bold">{positionMetrics.totalPositions}</p>
                  <p className="text-sm text-gray-400">{filteredPositions.length} visible</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Positions Table Section */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-xl font-bold flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-blue-400" />
              Positions
            </h3>
            
            {/* Filter and Search */}
            <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 mt-3 md:mt-0">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                {['table', 'grid', 'cards'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                      viewMode === mode 
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {filterOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setFilterView(option.id)}
                    className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      filterView === option.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {option.icon}
                    <span className="ml-1">{option.label}</span>
                  </button>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 pr-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Filtered count */}
          {(filterView !== 'all' || searchTerm) && (
            <div className="mb-3 flex items-center text-sm text-gray-400">
              <Filter className="w-3 h-3 mr-2" />
              Showing {filteredPositions.length} of {positions.length} positions
              <button
                onClick={() => {
                  setFilterView('all');
                  setSearchTerm('');
                }}
                className="ml-3 text-blue-400 hover:text-blue-300"
              >
                Clear filters
              </button>
            </div>
          )}
          
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <UnifiedGroupedPositionsTable 
              title="" 
              filteredPositions={filteredPositions} 
              onPositionAdded={handlePositionAdded}
              viewMode={viewMode}
            />
          </div>
        </section>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Asset Allocation */}
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2 text-purple-400" />
              Asset Allocation
            </h3>
            
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="grid grid-cols-2 gap-4">
                {/* Pie Chart */}
                <div className="relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={positionMetrics.assetAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {positionMetrics.assetAllocation?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.config.color}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{positionMetrics.assetAllocation?.length || 0}</p>
                      <p className="text-xs text-gray-400">Types</p>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="space-y-2">
                  {positionMetrics.assetAllocation?.map((asset, index) => (
                    <div
                      key={asset.name}
                      className="flex items-center justify-between p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded ${asset.config.bgColor}`}>
                          {asset.config.icon}
                        </div>
                        <span className="text-sm">{asset.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatPercentage(asset.percentage)}</p>
                        <p className="text-xs text-gray-400">
                          {showValues ? formatCurrency(asset.value) : '••••'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Top Movers */}
          <section>
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-400" />
              Top Movers
            </h3>
            
            <div className="space-y-4">
              {/* Gainers */}
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-medium mb-3 flex items-center text-green-400">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Top Gainers
                </h4>
                
                <div className="space-y-2">
                  {positionMetrics.topGainers?.slice(0, 3).map((position, index) => (
                    <div
                      key={`${position.identifier}-${index}`}
                      className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20"
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${assetTypeConfig[position.assetType]?.bgColor || assetTypeConfig.other.bgColor}`}>
                          {assetTypeConfig[position.assetType]?.icon || assetTypeConfig.other.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{position.identifier}</p>
                          <p className="text-xs text-gray-400">{position.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-400">
                          +{formatPercentage(position.gainLossPercent)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {showValues ? formatCurrency(position.value) : '••••'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Losers */}
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h4 className="text-sm font-medium mb-3 flex items-center text-red-400">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Top Losers
                </h4>
                
                <div className="space-y-2">
                  {positionMetrics.topLosers?.slice(0, 3).map((position, index) => (
                    <div
                      key={`${position.identifier}-${index}`}
                      className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20"
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded ${assetTypeConfig[position.assetType]?.bgColor || assetTypeConfig.other.bgColor}`}>
                          {assetTypeConfig[position.assetType]?.icon || assetTypeConfig.other.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{position.identifier}</p>
                          <p className="text-xs text-gray-400">{position.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-400">
                          {formatPercentage(position.gainLossPercent)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {showValues ? formatCurrency(position.value) : '••••'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sector Analysis */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <ChartBar className="w-5 h-5 mr-2 text-indigo-400" />
            Sector Analysis
          </h3>
          
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={positionMetrics.sectorAllocation}
                  margin={{ top: 5, right: 5, left: 5, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis 
                    stroke="#6b7280"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {positionMetrics.sectorAllocation?.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Risk Metrics */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-400" />
            Risk Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm text-gray-400 mb-2">Diversification Score</h4>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">{positionMetrics.diversificationScore?.toFixed(0) || 0}</span>
                <span className="text-sm text-gray-400">/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${positionMetrics.diversificationScore || 0}%` }}
                />
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm text-gray-400 mb-2">Volatility</h4>
              <span className="text-2xl font-bold text-orange-400">
                {positionMetrics.riskMetrics?.volatility?.toFixed(1) || 0}%
              </span>
              <p className="text-xs text-gray-500 mt-1">Portfolio volatility</p>
            </div>
            
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h4 className="text-sm text-gray-400 mb-2">Sharpe Ratio</h4>
              <span className="text-2xl font-bold text-purple-400">
                {positionMetrics.riskMetrics?.sharpeRatio?.toFixed(2) || 0}
              </span>
              <p className="text-xs text-gray-500 mt-1">Risk-adjusted return</p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              href: "/portfolio",
              title: "Portfolio Overview",
              description: "Complete financial picture",
              icon: <PieChartIcon className="w-5 h-5" />,
              color: 'text-blue-400',
              bgColor: 'bg-blue-500/10',
              stats: formatCurrency(positionMetrics.totalValue)
            },
            {
              href: "/accounts",
              title: "Accounts",
              description: "Manage investment accounts",
              icon: <Briefcase className="w-5 h-5" />,
              color: 'text-purple-400',
              bgColor: 'bg-purple-500/10',
              stats: `${positionMetrics.accountAllocation?.length || 0} accounts`
            },
            {
              href: "/transactions",
              title: "Transactions",
              description: "Trading activity",
              icon: <DollarSign className="w-5 h-5" />,
              color: 'text-green-400',
              bgColor: 'bg-green-500/10',
              stats: "View trades"
            }
          ].map((action, index) => (
            <Link key={action.href} href={action.href}>
              <div className={`${action.bgColor} border border-gray-800 rounded-xl p-4 hover:bg-gray-800 transition-colors cursor-pointer group`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={action.color}>{action.icon}</div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
                <h4 className="font-medium mb-1">{action.title}</h4>
                <p className="text-sm text-gray-400 mb-2">{action.description}</p>
                <p className="text-xs text-gray-500">{action.stats}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}