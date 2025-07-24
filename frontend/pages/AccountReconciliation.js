import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
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
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import AddPositionButton from '@/components/AddPositionButton';
import UnifiedGroupPositionsTable2 from '@/components/tables/UnifiedGroupPositionsTable2';

// Import Data Store hooks
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';

export default function PositionsPage() {
  // Data Store hooks
  const { 
    summary: portfolioData,
    topPositions,
    topPerformersPercent,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
    isStale: summaryStale
  } = usePortfolioSummary();
  
  const { 
    positions,
    summary: positionsSummary,
    metrics: positionsMetrics,
    loading: positionsLoading,
    error: positionsError,
    refreshData: refreshPositions,
    isStale: positionsStale
  } = useGroupedPositions();

  // Local UI state
  const [filterView, setFilterView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [showValues, setShowValues] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const router = useRouter();

  // Combined loading and error states
  const isLoading = summaryLoading || positionsLoading;
  const error = summaryError || positionsError;

  // Process position metrics from data store
  const positionMetrics = useMemo(() => {
    if (!portfolioData || !positionsMetrics) return {};

    // Find largest position from top positions
    const largestPosition = topPositions?.[0] || {};
    
    // Find best performer from top performers
    const bestPerformer = topPerformersPercent?.[0] || {};

    return {
      totalValue: portfolioData.liquidAssets || 0,
      totalCostBasis: portfolioData.liquidCostBasis || 0,
      totalGainLoss: portfolioData.liquidUnrealizedGain || 0,
      totalGainLossPercent: portfolioData.liquidUnrealizedGainPercent || 0,
      largestPosition: largestPosition.value ? {
        value: largestPosition.value,
        name: largestPosition.name || largestPosition.identifier
      } : null,
      mostProfitablePosition: bestPerformer.gain_loss_pct ? {
        gainLossPercent: bestPerformer.gain_loss_pct,
        name: bestPerformer.name || bestPerformer.identifier
      } : null,
      periodChanges: portfolioData.periodChanges || {}
    };
  }, [portfolioData, positionsMetrics, topPositions, topPerformersPercent]);

  // Filter options
  const filterOptions = [
    { id: 'all', label: 'All Positions', icon: Layers, color: 'text-blue-400' },
    { id: 'gainers', label: 'Gainers', icon: TrendingUp, color: 'text-green-400' },
    { id: 'losers', label: 'Losers', icon: TrendingDown, color: 'text-red-400' }
  ];

  // Filtered positions based on current filter view
  const filteredPositions = useMemo(() => {
    if (!positions) return [];
    
    return positions.filter(position => {
      // Search filter
      const matchesSearch = !searchTerm || 
        (position.identifier && position.identifier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (position.name && position.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter view logic
      let matchesFilter = true;
      switch (filterView) {
        case 'gainers':
          const gainLoss = (parseFloat(position.total_current_value) || 0) - (parseFloat(position.total_cost_basis) || 0);
          matchesFilter = gainLoss > 0;
          break;
        case 'losers':
          const loss = (parseFloat(position.total_current_value) || 0) - (parseFloat(position.total_cost_basis) || 0);
          matchesFilter = loss < 0;
          break;
        default:
          matchesFilter = true;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [positions, searchTerm, filterView]);

  // Custom tooltip for charts
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

  // Refresh handler - now uses data store refresh methods
  const handleRefreshPositions = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshSummary(),
        refreshPositions()
      ]);
    } catch (error) {
      console.error("Error refreshing positions:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get current period change
  const getCurrentPeriodChange = () => {
    const periodMap = {
      '1d': positionMetrics.periodChanges?.['1d'],
      '1w': positionMetrics.periodChanges?.['1w'],
      '1m': positionMetrics.periodChanges?.['1m'],
      'ytd': positionMetrics.periodChanges?.['ytd']
    };
    return periodMap[selectedTimeframe] || positionMetrics.periodChanges?.['1d'] || {};
  };

  const currentPeriodChange = getCurrentPeriodChange();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading positions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Error loading positions: {error}</p>
          <button
            onClick={handleRefreshPositions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isRefreshing}
          >
            {isRefreshing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Positions | NestEgg</title>
        <meta name="description" content="View and manage your investment positions" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                Portfolio Positions
              </h1>
              <p className="text-gray-400">Track your investments across all accounts</p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowValues(!showValues)}
                className="group relative flex items-center px-4 py-2 bg-gray-700 rounded-lg font-medium hover:bg-gray-600 transition-colors"
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
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                  {showValues ? formatCurrency(positionMetrics.totalValue) : '••••••••'}
                </h2>
                
                <div className={`flex items-center text-sm ${
                  (currentPeriodChange.liquidAssets || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(currentPeriodChange.liquidAssets || 0) >= 0 ? 
                    <ArrowUp className="w-4 h-4 mr-1" /> : 
                    <ArrowDown className="w-4 h-4 mr-1" />
                  }
                  {showValues ? (
                    <>
                      {formatCurrency(Math.abs(currentPeriodChange.liquidAssets || 0))} 
                      ({formatPercentage((currentPeriodChange.liquidAssetsPercent || 0) / 100)})
                    </>
                  ) : '••••'}
                  <span className="text-gray-400 ml-2">{selectedTimeframe.toUpperCase()}</span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Total Return</span>
                  <div className={`text-sm ${positionMetrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {showValues ? (
                      <>
                        {formatCurrency(positionMetrics.totalGainLoss)}
                        <span className="text-xs ml-1">
                          ({formatPercentage(positionMetrics.totalGainLossPercent / 100)})
                        </span>
                      </>
                    ) : '••••'}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Cost Basis</span>
                  <span className="text-sm">
                    {showValues ? formatCurrency(positionMetrics.totalCostBasis) : '••••'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Positions</span>
                  <span className="text-sm">{filteredPositions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              title: "Total Value",
              value: positionMetrics.totalValue,
              icon: <Wallet className="w-5 h-5" />,
              color: "text-blue-400",
              bgColor: "bg-blue-500/10",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: "All liquid positions"
            },
            {
              title: "Unrealized P&L",
              value: positionMetrics.totalGainLoss,
              icon: positionMetrics.totalGainLoss >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
              color: positionMetrics.totalGainLoss >= 0 ? "text-green-400" : "text-red-400",
              bgColor: positionMetrics.totalGainLoss >= 0 ? "bg-green-500/10" : "bg-red-500/10",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: `${formatPercentage(positionMetrics.totalGainLossPercent / 100)} return`
            },
            {
              title: "Largest Position",
              value: positionMetrics.largestPosition?.value,
              icon: <Target className="w-5 h-5" />,
              color: "text-purple-400",
              bgColor: "bg-purple-500/10",
              format: (v) => showValues ? formatCurrency(v) : '••••',
              subtitle: positionMetrics.largestPosition?.name
            },
            {
              title: "Best Performer",
              value: positionMetrics.mostProfitablePosition?.gainLossPercent,
              icon: <Flame className="w-5 h-5" />,
              color: "text-orange-400",
              bgColor: "bg-orange-500/10",
              format: (v) => `+${formatPercentage(v / 100)}`,
              subtitle: positionMetrics.mostProfitablePosition?.name
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
                    <option.icon className={`w-3 h-3 mr-1 ${option.color}`} />
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search positions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm min-w-[200px]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Both table components for testing */}
          <div className="space-y-6">
            {/* Legacy Table */}
            <div>
              <h4 className="text-lg font-semibold mb-3 text-gray-300">Grouped Positions Table (Legacy)</h4>
              <UnifiedGroupedPositionsTable />
            </div>

            {/* New Table */}
            <div>
              <h4 className="text-lg font-semibold mb-3 text-gray-300">Unified Group Positions Table 2 (New)</h4>
              <UnifiedGroupPositionsTable2 />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}