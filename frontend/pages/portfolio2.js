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
  Moon, Sun, Cpu, Gem, DollarSign as Dollar, Bitcoin, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, LineChart as RechartsLineChart, Line, ComposedChart
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';
import UnifiedGroupPositionsTable2 from '@/components/tables/UnifiedGroupPositionsTable2';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import AddPositionButton from '@/components/AddPositionButton';

// DataStore hooks
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useAccounts } from '@/store/hooks/useAccounts';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';

export default function PositionsPage() {
  const router = useRouter();
  const containerRef = useRef(null);
  
  // DataStore hooks
  const { 
    positions, 
    summary: groupedSummary, 
    loading: positionsLoading, 
    error: positionsError, 
    refreshData: refreshPositions 
  } = useGroupedPositions();

  const { 
    summary: portfolioData,
    topPositions,
    topPerformersPercent,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary
  } = usePortfolioSummary();

  const { 
    accounts,
    loading: accountsLoading,
    error: accountsError
  } = useAccounts();

  const { 
    trends,
    loading: trendsLoading,
    getPeriodData
  } = usePortfolioTrends();

  // Local UI state only
  const [filterView, setFilterView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [showValues, setShowValues] = useState(true);
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [showTooltip, setShowTooltip] = useState({});

  // Derived states
  const isLoading = positionsLoading || summaryLoading || accountsLoading || trendsLoading;
  const error = positionsError || summaryError || accountsError;

  // Filter options
  const filterOptions = [
    { id: 'all', label: 'All Positions', icon: <Layers className="w-4 h-4" /> },
    { id: 'stocks', label: 'Stocks', icon: <BarChart4 className="w-4 h-4" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-4 h-4" /> },
    { id: 'gainers', label: 'Gainers', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'losers', label: 'Losers', icon: <TrendingDown className="w-4 h-4" /> }
  ];

  // Get current period data
  const currentPeriodData = useMemo(() => {
    const periodMap = {
      '1d': 'day',
      '1w': 'week',
      '1m': 'month',
      'ytd': 'ytd'
    };
    const period = periodMap[selectedTimeframe];
    return trends?.[period] || null;
  }, [trends, selectedTimeframe]);

  // Filtered positions
  const filteredPositions = useMemo(() => {
    return positions.filter(position => {
      // Search logic
      const matchesSearch = searchTerm === '' || 
        (position.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         position.name?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter logic
      let matchesFilter = true;
      switch(filterView) {
        case 'stocks':
          matchesFilter = position.asset_type === 'security';
          break;
        case 'crypto':
          matchesFilter = position.asset_type === 'crypto';
          break;
        case 'gainers':
          matchesFilter = position.total_gain_loss_amt > 0;
          break;
        case 'losers':
          matchesFilter = position.total_gain_loss_amt < 0;
          break;
        default:
          matchesFilter = true;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [positions, searchTerm, filterView]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 p-3 shadow-lg rounded-lg border border-gray-700">
          <p className="font-medium text-white text-sm mb-1">
            {new Date(label).toLocaleDateString()}
          </p>
          <div className="flex justify-between items-center space-x-3">
            <span className="text-gray-400 text-xs">Value:</span>
            <span className="text-white text-sm font-medium">
              {formatCurrency(data.value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Refresh handler
  const handleRefreshPositions = async () => {
    try {
      await Promise.all([
        refreshPositions(),
        refreshSummary()
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  // Animated number component
  const AnimatedNumber = ({ value, format = (v) => v }) => {
    const springValue = useSpring(0, { damping: 30, stiffness: 100 });
    
    useEffect(() => {
      springValue.set(value || 0);
    }, [value, springValue]);
    
    return <motion.span>{format(springValue.get())}</motion.span>;
  };

  // Info Tooltip Component
  const InfoTooltip = ({ content, isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="absolute z-50 bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-700 w-64 text-sm"
        style={{ top: '100%', right: 0, marginTop: '8px' }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
        <p className="text-gray-300 pr-4">{content}</p>
      </motion.div>
    );
  };

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
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowValues(!showValues)}
                className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors relative group"
                title={showValues ? "Hide values" : "Show values"}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {showValues ? "Hide values" : "Show values"}
                </span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefreshPositions}
                className="flex items-center px-4 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/positions/add')}
                className="flex items-center px-4 py-2 bg-green-600 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Position
              </motion.button>
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
                  {showValues ? formatCurrency(portfolioData?.totalAssets || 0) : '••••••••'}
                </h2>
                
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center ${
                    (currentPeriodData?.percentChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(currentPeriodData?.percentChange || 0) >= 0 ? (
                      <TrendingUp className="w-5 h-5 mr-1" />
                    ) : (
                      <TrendingDown className="w-5 h-5 mr-1" />
                    )}
                    <span className="text-lg font-medium">
                      {formatPercentage(currentPeriodData?.percentChange || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Change:</span>
                    <span className={`text-lg font-medium ${
                      (currentPeriodData?.valueChange || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {showValues ? formatCurrency(currentPeriodData?.valueChange || 0) : '••••'}
                    </span>
                  </div>
                </div>
                
                {/* Performance chart */}
                <div className="h-32 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends?.chartData || []}>
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
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        domain={['dataMin * 0.98', 'dataMax * 1.02']}
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
                    {portfolioData?.unrealizedGain >= 0 ? 
                      <TrendingUp className="w-4 h-4 text-green-400" /> : 
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <p className={`text-2xl font-bold ${
                    portfolioData?.unrealizedGain >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {showValues ? formatCurrency(portfolioData?.unrealizedGain || 0) : '••••'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {formatPercentage(portfolioData?.unrealizedGainPercent || 0)} return
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Best Performer</span>
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-lg font-bold">
                    {topPerformersPercent?.[0] ? 
                      `+${formatPercentage(topPerformersPercent[0].gain_loss_percent || 0)}` : 
                      'N/A'
                    }
                  </p>
                  <p className="text-sm text-gray-400 mt-1 truncate">
                    {topPerformersPercent?.[0]?.name || 'No data'}
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Largest Position</span>
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-lg font-bold">
                    {showValues ? 
                      formatCurrency(topPositions?.[0]?.current_value || 0) : 
                      '••••'
                    }
                  </p>
                  <p className="text-sm text-gray-400 mt-1 truncate">
                    {topPositions?.[0]?.name || 'No data'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Metrics Cards */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Total Value",
              value: portfolioData?.totalAssets || 0,
              icon: <Wallet className="w-5 h-5" />,
              color: "text-blue-400",
              bgColor: "bg-blue-500/10",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: `${accounts?.length || 0} accounts`
            },
            {
              title: "Unrealized Gain",
              value: portfolioData?.unrealizedGain || 0,
              icon: portfolioData?.unrealizedGain >= 0 ? 
                <TrendingUp className="w-5 h-5" /> : 
                <TrendingDown className="w-5 h-5" />,
              color: portfolioData?.unrealizedGain >= 0 ? "text-green-400" : "text-red-400",
              bgColor: portfolioData?.unrealizedGain >= 0 ? "bg-green-500/10" : "bg-red-500/10",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: `${formatPercentage(portfolioData?.unrealizedGainPercent || 0)} return`
            },
            {
              title: "Largest Position",
              value: topPositions?.[0]?.current_value || 0,
              icon: <Target className="w-5 h-5" />,
              color: "text-purple-400",
              bgColor: "bg-purple-500/10",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: topPositions?.[0]?.name || 'N/A'
            },
            {
              title: "Best Performer",
              value: topPerformersPercent?.[0]?.gain_loss_percent || 0,
              icon: <Flame className="w-5 h-5" />,
              color: "text-orange-400",
              bgColor: "bg-orange-500/10",
              format: (v) => `+${formatPercentage(v)}`,
              subtitle: topPerformersPercent?.[0]?.name || 'N/A'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <div className={metric.color}>{metric.icon}</div>
                </div>
              </div>
              <h3 className="text-gray-400 text-xs mb-1">{metric.title}</h3>
              <p className="text-xl font-bold mb-1">{metric.format(metric.value)}</p>
              {metric.subtitle && (
                <p className="text-xs text-gray-500 truncate">{metric.subtitle}</p>
              )}
            </motion.div>
          ))}
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
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {filterOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setFilterView(option.id)}
                    className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      filterView === option.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
                  placeholder="Search positions..."
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-400 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </p>
            </div>
          )}
          
          <UnifiedGroupPositionsTable2
            initialSort="value-high"
            title=""
          />
        </section>
      </div>
    </div>
  );
}