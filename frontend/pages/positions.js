import React, { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
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
  const [viewMode, setViewMode] = useState('grid'); // grid, list, cards
  const containerRef = useRef(null);
  
  const router = useRouter();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const headerY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  
  // Enhanced color schemes with gradients
  const assetTypeConfig = {
    'security': { 
      icon: <LineChart className="w-5 h-5" />, 
      gradient: 'from-blue-500 to-indigo-600',
      color: '#4f46e5',
      bgGradient: 'from-blue-500/20 to-indigo-600/20'
    },
    'cash': { 
      icon: <Dollar className="w-5 h-5" />, 
      gradient: 'from-emerald-500 to-green-600',
      color: '#10b981',
      bgGradient: 'from-emerald-500/20 to-green-600/20'
    },
    'crypto': { 
      icon: <Bitcoin className="w-5 h-5" />, 
      gradient: 'from-purple-500 to-pink-600',
      color: '#8b5cf6',
      bgGradient: 'from-purple-500/20 to-pink-600/20'
    },
    'bond': { 
      icon: <Shield className="w-5 h-5" />, 
      gradient: 'from-pink-500 to-rose-600',
      color: '#ec4899',
      bgGradient: 'from-pink-500/20 to-rose-600/20'
    },
    'metal': { 
      icon: <Gem className="w-5 h-5" />, 
      gradient: 'from-orange-500 to-amber-600',
      color: '#f97316',
      bgGradient: 'from-orange-500/20 to-amber-600/20'
    },
    'currency': { 
      icon: <Globe className="w-5 h-5" />, 
      gradient: 'from-cyan-500 to-blue-600',
      color: '#3b82f6',
      bgGradient: 'from-cyan-500/20 to-blue-600/20'
    },
    'realestate': { 
      icon: <Home className="w-5 h-5" />, 
      gradient: 'from-red-500 to-pink-600',
      color: '#ef4444',
      bgGradient: 'from-red-500/20 to-pink-600/20'
    },
    'other': { 
      icon: <Layers className="w-5 h-5" />, 
      gradient: 'from-gray-500 to-gray-700',
      color: '#6b7280',
      bgGradient: 'from-gray-500/20 to-gray-700/20'
    }
  };
  
  // Enhanced sector colors with gradients
  const sectorGradients = {
    'Technology': 'from-blue-500 to-indigo-600',
    'Financial Services': 'from-green-500 to-emerald-600',
    'Healthcare': 'from-red-500 to-pink-600',
    'Consumer Cyclical': 'from-orange-500 to-amber-600',
    'Communication Services': 'from-purple-500 to-pink-600',
    'Industrials': 'from-gray-500 to-slate-600',
    'Consumer Defensive': 'from-teal-500 to-cyan-600',
    'Energy': 'from-yellow-500 to-orange-600',
    'Basic Materials': 'from-rose-500 to-red-600',
    'Real Estate': 'from-lime-500 to-green-600',
    'Utilities': 'from-sky-500 to-blue-600',
    'Unknown': 'from-gray-400 to-gray-600'
  };
  
  // Enhanced filter options with icons
  const filterOptions = [
    { id: 'all', label: 'All Positions', icon: <Layers className="w-4 h-4" /> },
    { id: 'security', label: 'Securities', icon: <LineChart className="w-4 h-4" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-4 h-4" /> },
    { id: 'metal', label: 'Metals', icon: <Gem className="w-4 h-4" /> },
    { id: 'realestate', label: 'Real Estate', icon: <Home className="w-4 h-4" /> },
    { id: 'gainers', label: 'Gainers', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'losers', label: 'Losers', icon: <TrendingDown className="w-4 h-4" /> }
  ];
  
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (portfolioData) {
      loadPortfolioData();
    }
  }, [selectedTimeframe]);

  // Mouse tracking for parallax effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
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
  
  // Enhanced metrics calculation
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
        gradient: sectorGradients[sector] || sectorGradients.Unknown
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
  
  // Enhanced tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900/95 backdrop-blur-xl p-4 shadow-2xl rounded-xl border border-white/10"
        >
          <p className="font-semibold text-white mb-2">{data.name || label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center space-x-4">
              <span className="text-gray-400 text-sm">{entry.name}:</span>
              <span className="text-white font-medium">
                {entry.name.includes('%') ? formatPercentage(entry.value) : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </motion.div>
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

  // Subtle Card Component - removed 3D effects
  const Card = ({ children, className = "" }) => {
    return (
      <motion.div
        className={`relative ${className}`}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {children}
      </motion.div>
    );
  };

  // Animated number component
  const AnimatedNumber = ({ value, format = (v) => v, delay = 0 }) => {
    const springValue = useSpring(0, { damping: 30, stiffness: 100 });
    
    useEffect(() => {
      springValue.set(value || 0);
    }, [value, springValue]);
    
    return (
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
      >
        <motion.span>{springValue.get()}</motion.span>
      </motion.span>
    );
  };
  
  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white overflow-hidden">
      <Head>
        <title>NestEgg | Positions</title>
        <meta name="description" content="Advanced portfolio positions management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20" />
        
        {/* Subtle gradient orbs */}
        <div className="absolute top-20 left-20 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      </div>
      
      <div className="relative z-10 container mx-auto p-4 md:p-8">
        {/* Animated Header */}
        <motion.header 
          className="mb-12"
          style={{ y: headerY, opacity: headerOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center"
          >
            <div>
              <motion.h1 
                className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
              >
                Positions
              </motion.h1>
              <motion.p 
                className="text-gray-400 text-lg flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                Real-time portfolio analysis
              </motion.p>
            </div>
            
            <motion.div 
              className="flex items-center space-x-4 mt-6 md:mt-0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              {/* View Mode Toggle */}
              <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1">
                {['grid', 'list', 'cards'].map((mode) => (
                  <motion.button
                    key={mode}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-lg capitalize transition-all ${
                      viewMode === mode 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </motion.button>
                ))}
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowValues(!showValues)}
                className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefreshPositions}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              
              <AddPositionButton 
                onPositionAdded={handlePositionAdded}
                className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
              />
            </motion.div>
          </motion.div>
        </motion.header>

        {/* Portfolio Performance Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main metrics */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400">Portfolio Performance</p>
                  <div className="flex items-center space-x-2">
                    {['1d', '1w', '1m', 'ytd'].map((period) => (
                      <motion.button
                        key={period}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedTimeframe(period)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          selectedTimeframe === period
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {period.toUpperCase()}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <motion.h2 
                  className="text-5xl md:text-6xl font-bold mb-4"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                >
                  {showValues ? formatCurrency(positionMetrics.totalValue) : '••••••'}
                </motion.h2>
                
                <div className="flex items-center space-x-6 mb-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center space-x-2"
                  >
                    <div className={`flex items-center ${currentPeriodChange?.percent_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentPeriodChange?.percent_change > 0 ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                      <span className="text-3xl font-semibold">
                        {currentPeriodChange ? formatPercentage(currentPeriodChange.percent_change) : '0.00%'}
                      </span>
                    </div>
                    <span className="text-gray-400">({selectedTimeframe})</span>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-center space-x-2"
                  >
                    <span className="text-gray-400">Change:</span>
                    <span className={`text-2xl font-semibold ${currentPeriodChange?.value_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {showValues && currentPeriodChange ? formatCurrency(currentPeriodChange.value_change) : '••••'}
                    </span>
                  </motion.div>
                </div>
                
                {/* Performance chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={positionMetrics.performanceData?.slice(-30) || []}>
                      <defs>
                        <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fillOpacity={1}
                        fill="url(#performanceGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Risk metrics */}
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-blue-400" />
                    Risk Analysis
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400 text-sm">Diversification Score</span>
                        <span className="text-lg font-semibold">{positionMetrics.diversificationScore?.toFixed(0) || 0}/100</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${positionMetrics.diversificationScore || 0}%` }}
                          transition={{ delay: 1, duration: 0.8 }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Volatility</span>
                      <span className="text-lg font-semibold text-orange-400">
                        {positionMetrics.riskMetrics?.volatility?.toFixed(1) || 0}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Sharpe Ratio</span>
                      <span className="text-lg font-semibold text-purple-400">
                        {positionMetrics.riskMetrics?.sharpeRatio?.toFixed(2) || 0}
                      </span>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                    Income & Yield
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Annual Income</span>
                      <span className="text-lg font-semibold text-green-400">
                        {showValues ? formatCurrency(positionMetrics.annualIncome) : '••••'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Portfolio Yield</span>
                      <span className="text-lg font-semibold text-blue-400">
                        {formatPercentage(positionMetrics.yieldPercentage)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Key Metrics Cards */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
        >
          {[
            {
              title: "Total Positions",
              value: positionMetrics.totalPositions,
              icon: <Layers className="w-6 h-6" />,
              gradient: "from-blue-500 to-indigo-600",
              format: (v) => v?.toLocaleString() ?? '0',
              subtitle: `${filteredPositions.length} visible`
            },
            {
              title: "Total Gain/Loss",
              value: positionMetrics.totalGainLoss,
              icon: positionMetrics.totalGainLoss >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />,
              gradient: positionMetrics.totalGainLoss >= 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-pink-600",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: `${formatPercentage(positionMetrics.totalGainLossPercent)} return`
            },
            {
              title: "Largest Position",
              value: positionMetrics.largestPosition?.value,
              icon: <Target className="w-6 h-6" />,
              gradient: "from-purple-500 to-pink-600",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: positionMetrics.largestPosition?.name
            },
            {
              title: "Best Performer",
              value: positionMetrics.mostProfitablePosition?.gainLossPercent,
              icon: <Flame className="w-6 h-6" />,
              gradient: "from-orange-500 to-red-600",
              format: (v) => `+${formatPercentage(v)}`,
              subtitle: positionMetrics.mostProfitablePosition?.name
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <Card className="h-full">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full hover:bg-white/10 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <motion.div 
                      className={`p-3 rounded-xl bg-gradient-to-r ${metric.gradient} shadow-lg`}
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {metric.icon}
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.1, type: "spring" }}
                      className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full"
                    >
                      Live
                    </motion.div>
                  </div>
                  <h3 className="text-gray-400 text-sm mb-1">{metric.title}</h3>
                  <p className="text-3xl font-bold mb-1">{metric.format(metric.value)}</p>
                  {metric.subtitle && (
                    <p className="text-sm text-gray-500 truncate">{metric.subtitle}</p>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.section>

        {/* Asset Allocation & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Asset Allocation */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <PieChartIcon className="w-6 h-6 mr-2 text-purple-400" />
              Asset Allocation
            </h3>
            
            <Card className="h-full">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full">
                <div className="grid grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={positionMetrics.assetAllocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
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
                    
                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{positionMetrics.assetAllocation?.length || 0}</p>
                        <p className="text-sm text-gray-400">Asset Types</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="space-y-3">
                    {positionMetrics.assetAllocation?.map((asset, index) => (
                      <motion.div
                        key={asset.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
                        whileHover={{ x: 5 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${asset.config.bgGradient}`}>
                            {asset.config.icon}
                          </div>
                          <span className="font-medium">{asset.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatPercentage(asset.percentage)}</p>
                          <p className="text-xs text-gray-400">
                            {showValues ? formatCurrency(asset.value) : '••••'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.section>

          {/* Top Movers */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-2 text-green-400" />
              Top Movers
            </h3>
            
            <div className="space-y-4">
              {/* Gainers */}
                                    <Card>
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                    Top Gainers
                  </h4>
                  
                  <div className="space-y-3">
                    {positionMetrics.topGainers?.slice(0, 3).map((position, index) => (
                      <motion.div
                        key={`${position.identifier}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20"
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${assetTypeConfig[position.assetType]?.bgGradient || assetTypeConfig.other.bgGradient}`}>
                            {assetTypeConfig[position.assetType]?.icon || assetTypeConfig.other.icon}
                          </div>
                          <div>
                            <p className="font-medium">{position.identifier}</p>
                            <p className="text-sm text-gray-400">{position.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-400">+{formatPercentage(position.gainLossPercent)}</p>
                          <p className="text-sm text-gray-400">
                            {showValues ? formatCurrency(position.value) : '••••'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                                    </Card>
              
              {/* Losers */}
              <Card>
                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20"
                  whileHover={{ scale: 1.02 }}>
                  <h4 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingDown className="w-5 h-5 mr-2 text-red-400" />
                    Top Losers
                  </h4>
                  
                  <div className="space-y-3">
                    {positionMetrics.topLosers?.slice(0, 3).map((position, index) => (
                      <motion.div
                        key={`${position.identifier}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20"
                        whileHover={{ scale: 1.02, x: 5 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-r ${assetTypeConfig[position.assetType]?.bgGradient || assetTypeConfig.other.bgGradient}`}>
                            {assetTypeConfig[position.assetType]?.icon || assetTypeConfig.other.icon}
                          </div>
                          <div>
                            <p className="font-medium">{position.identifier}</p>
                            <p className="text-sm text-gray-400">{position.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-400">{formatPercentage(position.gainLossPercent)}</p>
                          <p className="text-sm text-gray-400">
                            {showValues ? formatCurrency(position.value) : '••••'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </motion.section>
        </div>

        {/* Sector Breakdown */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-12"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <ChartBar className="w-6 h-6 mr-2 text-indigo-400" />
            Sector Analysis
          </h3>
          
          <Card>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={positionMetrics.sectorAllocation}
                      layout="horizontal"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {positionMetrics.sectorAllocation?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`url(#sectorGradient-${index})`}
                          />
                        ))}
                      </Bar>
                      <defs>
                        {positionMetrics.sectorAllocation?.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`sectorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={getGradientColors(entry.gradient)[0]} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={getGradientColors(entry.gradient)[1]} stopOpacity={0.6}/>
                          </linearGradient>
                        ))}
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Sector Details */}
                <div className="space-y-3">
                  {positionMetrics.sectorAllocation?.slice(0, 5).map((sector, index) => (
                    <motion.div
                      key={sector.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + index * 0.1 }}
                      className="relative overflow-hidden rounded-xl"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedSector(selectedSector === sector.name ? null : sector.name)}
                    >
                      <div className="relative z-10 p-4 bg-white/5 backdrop-blur-sm border border-white/10 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{sector.name}</h4>
                            <p className="text-sm text-gray-400">
                              {formatPercentage(sector.percentage)} of portfolio
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {showValues ? formatCurrency(sector.value) : '••••'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {sector.count} positions
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Background gradient bar */}
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-r ${sector.gradient} opacity-20`}
                        initial={{ x: '-100%' }}
                        animate={{ x: selectedSector === sector.name ? '0%' : '-100%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Positions Table Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-2xl font-bold flex items-center">
              <Wallet className="w-6 h-6 mr-2 text-blue-400" />
              All Positions
            </h3>
            
            {/* Filter and Search */}
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {filterOptions.map(option => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilterView(option.id)}
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      filterView === option.id 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {option.icon}
                    <span className="ml-2">{option.label}</span>
                  </motion.button>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search positions..."
                  className="pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-5 h-5 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Filtered count */}
          {(filterView !== 'all' || searchTerm) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center text-sm text-gray-400"
            >
              <Filter className="w-4 h-4 mr-2" />
              Showing {filteredPositions.length} of {positions.length} positions
              <button
                onClick={() => {
                  setFilterView('all');
                  setSearchTerm('');
                }}
                className="ml-4 text-blue-400 hover:text-blue-300"
              >
                Clear filters
              </button>
            </motion.div>
          )}
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <UnifiedGroupedPositionsTable 
              title="" 
              filteredPositions={filteredPositions} 
              onPositionAdded={handlePositionAdded}
            />
          </div>
        </motion.section>

        {/* AI Insights Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mb-12"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <Cpu className="w-6 h-6 mr-2 text-purple-400" />
            AI-Powered Insights
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Portfolio Health",
                icon: <Activity className="w-6 h-6" />,
                score: positionMetrics.diversificationScore || 0,
                status: positionMetrics.diversificationScore > 70 ? "Excellent" : positionMetrics.diversificationScore > 40 ? "Good" : "Needs Attention",
                color: positionMetrics.diversificationScore > 70 ? "green" : positionMetrics.diversificationScore > 40 ? "yellow" : "red",
                insights: [
                  `${positionMetrics.totalPositions} total positions`,
                  `${positionMetrics.assetAllocation?.length || 0} asset types`,
                  `Concentration risk: ${positionMetrics.largestPosition?.percentage?.toFixed(1) || 0}%`
                ]
              },
              {
                title: "Performance Analysis",
                icon: <TrendingUp className="w-6 h-6" />,
                score: Math.min(100, Math.max(0, 50 + (positionMetrics.totalGainLossPercent || 0))),
                status: positionMetrics.totalGainLossPercent > 10 ? "Outperforming" : positionMetrics.totalGainLossPercent > 0 ? "Positive" : "Underperforming",
                color: positionMetrics.totalGainLossPercent > 10 ? "green" : positionMetrics.totalGainLossPercent > 0 ? "blue" : "red",
                insights: [
                  `${formatPercentage(positionMetrics.totalGainLossPercent)} total return`,
                  `${positionMetrics.topGainers?.length || 0} winning positions`,
                  `Best: ${formatPercentage(positionMetrics.mostProfitablePosition?.gainLossPercent || 0)}`
                ]
              },
              {
                title: "Risk Assessment",
                icon: <Shield className="w-6 h-6" />,
                score: Math.max(0, 100 - (positionMetrics.riskMetrics?.volatility || 0)),
                status: positionMetrics.riskMetrics?.volatility < 15 ? "Low Risk" : positionMetrics.riskMetrics?.volatility < 25 ? "Moderate" : "High Risk",
                color: positionMetrics.riskMetrics?.volatility < 15 ? "green" : positionMetrics.riskMetrics?.volatility < 25 ? "yellow" : "red",
                insights: [
                  `${positionMetrics.riskMetrics?.volatility?.toFixed(1) || 0}% volatility`,
                  `Sharpe: ${positionMetrics.riskMetrics?.sharpeRatio?.toFixed(2) || 0}`,
                  `Diversification: ${positionMetrics.diversificationScore?.toFixed(0) || 0}/100`
                ]
              }
            ].map((insight, index) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + index * 0.1 }}
              >
                                  <Card>
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold">{insight.title}</h4>
                      <div className={`p-2 rounded-lg bg-${insight.color}-500/20`}>
                        {insight.icon}
                      </div>
                    </div>
                    
                    {/* Score Circle */}
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="12"
                          fill="none"
                        />
                        <motion.circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke={insight.color === 'green' ? '#10b981' : insight.color === 'yellow' ? '#f59e0b' : insight.color === 'blue' ? '#3b82f6' : '#ef4444'}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - insight.score / 100) }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{insight.score.toFixed(0)}</span>
                        <span className="text-xs text-gray-400">{insight.status}</span>
                      </div>
                    </div>
                    
                    {/* Insights */}
                    <div className="space-y-2">
                      {insight.insights.map((item, i) => (
                        <div key={i} className="flex items-center text-sm text-gray-400">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                                  </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Interactive Features Banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="mb-12"
        >
          <Card>
            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 backdrop-blur-xl rounded-3xl p-8 border border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-6">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg shadow-indigo-500/30"
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Advanced Analytics</h3>
                    <p className="text-gray-300 mb-4 max-w-2xl">
                      Experience next-generation portfolio analysis with real-time data, AI-powered insights, and beautiful visualizations designed to help you make smarter investment decisions.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {['Real-time Updates', 'Risk Analysis', 'Performance Tracking', 'Smart Alerts'].map((feature, index) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.5 + index * 0.1 }}
                          className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full"
                        >
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                          <span className="text-sm">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="hidden lg:block"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl" />
                    <Gauge className="w-24 h-24 text-indigo-400 relative" />
                  </div>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              href: "/portfolio",
              title: "Portfolio Overview",
              description: "See your complete financial picture",
              icon: <PieChartIcon className="w-6 h-6" />,
              gradient: "from-blue-600 to-indigo-600",
              stats: `${formatCurrency(positionMetrics.totalValue)} total`
            },
            {
              href: "/accounts",
              title: "Account Management",
              description: "Manage all your investment accounts",
              icon: <Briefcase className="w-6 h-6" />,
              gradient: "from-purple-600 to-pink-600",
              stats: `${positionMetrics.accountAllocation?.length || 0} accounts`
            },
            {
              href: "/transactions",
              title: "Transaction History",
              description: "Track your trading activity",
              icon: <DollarSign className="w-6 h-6" />,
              gradient: "from-emerald-600 to-teal-600",
              stats: "View all trades"
            }
          ].map((action, index) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Link href={action.href}>
                <div className={`relative bg-gradient-to-r ${action.gradient} rounded-2xl p-6 h-full group cursor-pointer overflow-hidden transition-all hover:shadow-xl`}>
                  <div className="relative z-10">
                    <div className="mb-4">{action.icon}</div>
                    <h4 className="text-xl font-bold mb-2">{action.title}</h4>
                    <p className="text-white/80 text-sm mb-3">{action.description}</p>
                    <p className="text-white/60 text-xs">{action.stats}</p>
                  </div>
                  
                  <motion.div
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ x: 5 }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.section>
      </div>
    </div>
  );
}

// Helper function for gradient colors
function getGradientColors(gradientClass) {
  const colorMap = {
    'from-blue-500 to-indigo-600': ['#3b82f6', '#4f46e5'],
    'from-green-500 to-emerald-600': ['#10b981', '#059669'],
    'from-red-500 to-pink-600': ['#ef4444', '#db2777'],
    'from-orange-500 to-amber-600': ['#f97316', '#d97706'],
    'from-purple-500 to-pink-600': ['#8b5cf6', '#db2777'],
    'from-gray-500 to-slate-600': ['#6b7280', '#475569'],
    'from-teal-500 to-cyan-600': ['#14b8a6', '#0891b2'],
    'from-yellow-500 to-orange-600': ['#eab308', '#ea580c'],
    'from-rose-500 to-red-600': ['#f43f5e', '#dc2626'],
    'from-lime-500 to-green-600': ['#84cc16', '#16a34a'],
    'from-sky-500 to-blue-600': ['#0ea5e9', '#2563eb'],
    'from-gray-400 to-gray-600': ['#9ca3af', '#4b5563'],
  };
  return colorMap[gradientClass] || ['#6b7280', '#374151'];
}