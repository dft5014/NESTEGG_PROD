import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart4, TrendingUp, TrendingDown, DollarSign, Package,
  Search, Filter, RefreshCw, Eye, EyeOff, ChevronRight,
  Activity, ArrowUpRight, ArrowDownRight, Clock, Calendar,
  Layers, Shield, Zap, Star, Award, Info, AlertCircle,
  PieChart as PieChartIcon, LineChart, BarChart2, Target,
  Hash, Briefcase, Building2, Coins, Gem, Wallet,
  ChevronUp, ChevronDown, X, ExternalLink, Edit2,
  Settings, Download, Upload, Sparkles, Globe,
  Timer, TrendingUp as TrendIcon, Database, CheckCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap, Legend
} from 'recharts';
import UnifiedGroupPositionsTable2 from '@/components/tables/UnifiedGroupPositionsTable2';
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';
import { useDataStore } from '@/store/DataStore';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useAccounts } from '@/store/hooks/useAccounts';

export default function PositionsPage() {
  // DataStore hooks
  const { 
    positions, 
    summary, 
    metrics,
    loading: positionsLoading, 
    error: positionsError, 
    refreshData: refreshPositions 
  } = useGroupedPositions();
  
  const { 
    summary: portfolioData,
    sectorAllocation,
    assetPerformance,
    concentrationMetrics,
    topPositions,
    loading: summaryLoading,
    refresh: refreshSummary
  } = usePortfolioSummary();

  const { accounts } = useAccounts();

  // Local state
  const [showValues, setShowValues] = useState(true);
  const [selectedView, setSelectedView] = useState('grid');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('value');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [hoveredSector, setHoveredSector] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  const router = useRouter();

  // Combined loading/error states
  const isLoading = positionsLoading || summaryLoading;
  const error = positionsError;

  // Animation on mount
  useEffect(() => {
    setTimeout(() => setAnimationComplete(true), 1200);
  }, []);

  // Process positions data with enriched metrics
  const processedData = useMemo(() => {
    if (!positions || positions.length === 0) return {
      byAssetType: {},
      bySector: {},
      byHoldingPeriod: {},
      performanceMetrics: {},
      concentrationRisk: {},
      incomeMetrics: {}
    };

    // Group by asset type
    const byAssetType = positions.reduce((acc, pos) => {
      const type = pos.asset_type || 'other';
      if (!acc[type]) {
        acc[type] = {
          positions: [],
          totalValue: 0,
          totalGainLoss: 0,
          totalCostBasis: 0,
          count: 0,
          allocation: 0
        };
      }
      acc[type].positions.push(pos);
      acc[type].totalValue += pos.total_value || 0;
      acc[type].totalGainLoss += pos.total_gain_loss || 0;
      acc[type].totalCostBasis += pos.total_cost_basis || 0;
      acc[type].count += 1;
      return acc;
    }, {});

    // Calculate allocations
    const totalValue = Object.values(byAssetType).reduce((sum, type) => sum + type.totalValue, 0);
    Object.values(byAssetType).forEach(type => {
      type.allocation = totalValue > 0 ? (type.totalValue / totalValue) * 100 : 0;
      type.gainLossPercent = type.totalCostBasis > 0 
        ? (type.totalGainLoss / type.totalCostBasis) * 100 
        : 0;
    });

    // Group by sector (for securities)
    const bySector = positions
      .filter(pos => pos.asset_type === 'security' && pos.sector)
      .reduce((acc, pos) => {
        const sector = pos.sector || 'Unknown';
        if (!acc[sector]) {
          acc[sector] = {
            positions: [],
            totalValue: 0,
            totalGainLoss: 0,
            count: 0
          };
        }
        acc[sector].positions.push(pos);
        acc[sector].totalValue += pos.total_value || 0;
        acc[sector].totalGainLoss += pos.total_gain_loss || 0;
        acc[sector].count += 1;
        return acc;
      }, {});

    // Group by holding period
    const byHoldingPeriod = {
      longTerm: positions.filter(pos => pos.long_term_value > 0),
      shortTerm: positions.filter(pos => pos.short_term_value > 0),
      mixed: positions.filter(pos => pos.long_term_value > 0 && pos.short_term_value > 0)
    };

    // Performance metrics
    const performanceMetrics = {
      winners: positions.filter(pos => pos.total_gain_loss > 0).length,
      losers: positions.filter(pos => pos.total_gain_loss < 0).length,
      unchanged: positions.filter(pos => pos.total_gain_loss === 0).length,
      bestPerformer: positions.reduce((best, pos) => 
        (pos.total_gain_loss_pct || 0) > (best?.total_gain_loss_pct || -Infinity) ? pos : best, null),
      worstPerformer: positions.reduce((worst, pos) => 
        (pos.total_gain_loss_pct || 0) < (worst?.total_gain_loss_pct || Infinity) ? pos : worst, null),
      avgGainLossPercent: positions.length > 0 
        ? positions.reduce((sum, pos) => sum + (pos.total_gain_loss_pct || 0), 0) / positions.length 
        : 0
    };

    // Concentration risk analysis
    const sortedByValue = [...positions].sort((a, b) => b.total_value - a.total_value);
    const top5Value = sortedByValue.slice(0, 5).reduce((sum, pos) => sum + pos.total_value, 0);
    const top10Value = sortedByValue.slice(0, 10).reduce((sum, pos) => sum + pos.total_value, 0);
    
    const concentrationRisk = {
      top5Concentration: totalValue > 0 ? (top5Value / totalValue) * 100 : 0,
      top10Concentration: totalValue > 0 ? (top10Value / totalValue) * 100 : 0,
      herfindahlIndex: positions.reduce((sum, pos) => {
        const weight = totalValue > 0 ? pos.total_value / totalValue : 0;
        return sum + Math.pow(weight, 2);
      }, 0) * 10000, // Scale to 0-10000
      diversificationRatio: positions.length
    };

    // Income metrics
    const incomeMetrics = {
      totalAnnualIncome: positions.reduce((sum, pos) => sum + (pos.est_annual_income || 0), 0),
      incomeYield: totalValue > 0 
        ? (positions.reduce((sum, pos) => sum + (pos.est_annual_income || 0), 0) / totalValue) * 100 
        : 0,
      incomeProducingPositions: positions.filter(pos => pos.est_annual_income > 0).length,
      topIncomePositions: [...positions]
        .filter(pos => pos.est_annual_income > 0)
        .sort((a, b) => b.est_annual_income - a.est_annual_income)
        .slice(0, 5)
    };

    return {
      byAssetType,
      bySector,
      byHoldingPeriod,
      performanceMetrics,
      concentrationRisk,
      incomeMetrics,
      totalValue
    };
  }, [positions]);

  // Chart colors
  const CHART_COLORS = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  // Asset type icons and colors
  const getAssetTypeStyle = (type) => {
    const styles = {
      security: { icon: <Briefcase className="w-4 h-4" />, color: 'from-blue-500 to-blue-700', label: 'Securities' },
      crypto: { icon: <Coins className="w-4 h-4" />, color: 'from-purple-500 to-purple-700', label: 'Crypto' },
      cash: { icon: <Wallet className="w-4 h-4" />, color: 'from-green-500 to-green-700', label: 'Cash' },
      metal: { icon: <Gem className="w-4 h-4" />, color: 'from-yellow-500 to-yellow-700', label: 'Metals' },
      other: { icon: <Package className="w-4 h-4" />, color: 'from-gray-500 to-gray-700', label: 'Other' }
    };
    return styles[type] || styles.other;
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshPositions(),
        refreshSummary()
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Prepare data for charts
  const assetAllocationData = useMemo(() => {
    return Object.entries(processedData.byAssetType).map(([type, data]) => ({
      name: getAssetTypeStyle(type).label,
      value: data.totalValue,
      percentage: data.allocation
    }));
  }, [processedData.byAssetType]);

  const sectorData = useMemo(() => {
    return Object.entries(processedData.bySector)
      .map(([sector, data]) => ({
        name: sector,
        value: data.totalValue,
        gainLoss: data.totalGainLoss
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [processedData.bySector]);

  // View modes
  const viewModes = [
    { key: 'grid', label: 'Grid View', icon: <Layers className="w-4 h-4" /> },
    { key: 'table', label: 'Table View', icon: <BarChart4 className="w-4 h-4" /> },
    { key: 'analytics', label: 'Analytics', icon: <LineChart className="w-4 h-4" /> }
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center"
          >
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Positions</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Head>
        <title>Positions - NestEgg</title>
      </Head>

      <div className="relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: animationComplete ? 0.5 : 0 }}
            transition={{ duration: 2 }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: animationComplete ? 0.5 : 0 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Premium Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.5 }}
                  className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg"
                >
                  <BarChart4 className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Portfolio Positions
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {summary?.total_positions || 0} positions across {summary?.unique_assets || 0} unique assets
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Selector */}
                <div className="flex bg-gray-900/50 backdrop-blur-sm rounded-lg p-1 border border-gray-800">
                  {viewModes.map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setSelectedView(mode.key)}
                      className={`px-3 py-1.5 text-sm font-medium rounded flex items-center gap-2 transition-all ${
                        selectedView === mode.key
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {mode.icon}
                      <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowValues(!showValues)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
                >
                  {showValues ? 
                    <Eye className="w-5 h-5 text-gray-400 group-hover:text-white" /> : 
                    <EyeOff className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  }
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 group-hover:text-white ${
                    isRefreshing ? 'animate-spin' : ''
                  }`} />
                </motion.button>
              </div>
            </div>
          </motion.header>

          {/* Portfolio Value Summary Card */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 animate-gradient-x" />
              </div>

              <div className="relative z-10 p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Total Portfolio Value */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <h2 className="text-sm font-medium text-gray-400">Portfolio Value</h2>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mb-4"
                    >
                      <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                        {showValues ? formatCurrency(summary?.total_value || 0) : '••••••••'}
                      </div>
                      
                      <div className="mt-2 flex items-center gap-3">
                        <div className={`flex items-center gap-1 ${
                          (summary?.total_gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {(summary?.total_gain_loss || 0) >= 0 ? 
                            <ArrowUpRight className="w-5 h-5" /> : 
                            <ArrowDownRight className="w-5 h-5" />
                          }
                          <span className="font-semibold">
                            {showValues ? formatCurrency(Math.abs(summary?.total_gain_loss || 0)) : '••••'}
                          </span>
                          <span className="text-sm">
                            ({formatPercentage(summary?.total_gain_loss_pct || 0)})
                          </span>
                        </div>
                        <span className="text-gray-500 text-sm">All Time</span>
                      </div>
                    </motion.div>

                    {/* Performance Indicators */}
                    <div className="grid grid-cols-3 gap-3">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gray-800/50 rounded-lg p-3"
                      >
                        <p className="text-xs text-gray-400 mb-1">Winners</p>
                        <p className="text-lg font-semibold text-green-400">
                          {processedData.performanceMetrics.winners}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-gray-800/50 rounded-lg p-3"
                      >
                        <p className="text-xs text-gray-400 mb-1">Losers</p>
                        <p className="text-lg font-semibold text-red-400">
                          {processedData.performanceMetrics.losers}
                        </p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gray-800/50 rounded-lg p-3"
                      >
                        <p className="text-xs text-gray-400 mb-1">Avg Return</p>
                        <p className={`text-lg font-semibold ${
                          processedData.performanceMetrics.avgGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercentage(processedData.performanceMetrics.avgGainLossPercent)}
                        </p>
                      </motion.div>
                    </div>
                  </div>

                  {/* Income Metrics */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Annual Income</span>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold mb-1">
                      {showValues ? formatCurrency(processedData.incomeMetrics.totalAnnualIncome) : '••••'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Yield: {formatPercentage(processedData.incomeMetrics.incomeYield)}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-xs text-gray-500">
                        {processedData.incomeMetrics.incomeProducingPositions} income positions
                      </p>
                    </div>
                  </motion.div>

                  {/* Concentration Risk */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Concentration Risk</span>
                      <Shield className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs">
                          <span>Top 5 Holdings</span>
                          <span className="font-semibold">
                            {formatPercentage(processedData.concentrationRisk.top5Concentration)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full mt-1">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(processedData.concentrationRisk.top5Concentration, 100)}%` }}
                            transition={{ delay: 0.6, duration: 1 }}
                            className={`h-full rounded-full ${
                              processedData.concentrationRisk.top5Concentration > 60 
                                ? 'bg-red-500' 
                                : processedData.concentrationRisk.top5Concentration > 40
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        HHI: {Math.round(processedData.concentrationRisk.herfindahlIndex)}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Asset Type Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3"
                >
                  {Object.entries(processedData.byAssetType).map(([type, data], index) => {
                    const style = getAssetTypeStyle(type);
                    return (
                      <motion.div
                        key={type}
                        whileHover={{ scale: 1.05, y: -2 }}
                        className="bg-gray-800/30 rounded-lg p-3 backdrop-blur-sm cursor-pointer"
                        onClick={() => setSelectedMetric(type)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 bg-gradient-to-br ${style.color} rounded`}>
                            {style.icon}
                          </div>
                          <span className="text-xs text-gray-400">{style.label}</span>
                        </div>
                        <p className="text-lg font-bold">
                          {showValues ? formatCurrency(data.totalValue) : '••••'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(data.allocation)} • {data.count} positions
                        </p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </motion.section>

          {/* Main Content Area */}
          <AnimatePresence mode="wait">
            {selectedView === 'grid' && (
              <motion.div
                key="grid"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* Asset Allocation & Sector Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Asset Allocation Chart */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-purple-400" />
                      Asset Allocation
                    </h3>
                    
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={assetAllocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {assetAllocationData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Legend */}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {assetAllocationData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="text-sm text-gray-400">{entry.name}</span>
                            <span className="text-sm font-semibold ml-auto">
                              {formatPercentage(entry.percentage)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.section>

                  {/* Sector Breakdown */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-blue-400" />
                      Sector Exposure
                    </h3>
                    
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sectorData} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                          />
                          <YAxis 
                            tick={{ fill: '#9CA3AF' }}
                            tickFormatter={(value) => formatCurrency(value, true)}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => formatCurrency(value)}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="#3B82F6"
                            radius={[4, 4, 0, 0]}
                          >
                            {sectorData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`}
                                fill={entry.gainLoss >= 0 ? '#10B981' : '#EF4444'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      
                      {hoveredSector && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-gray-800 rounded-lg"
                        >
                          <p className="text-sm font-semibold">{hoveredSector}</p>
                          <p className="text-xs text-gray-400">Click for details</p>
                        </motion.div>
                      )}
                    </div>
                  </motion.section>
                </div>

                {/* Performance & Risk Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Best Performer */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-green-900/20 to-green-800/20 rounded-xl p-4 border border-green-700/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Best Performer</span>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    {processedData.performanceMetrics.bestPerformer && (
                      <>
                        <p className="font-semibold truncate">
                          {processedData.performanceMetrics.bestPerformer.name}
                        </p>
                        <p className="text-2xl font-bold text-green-400">
                          +{formatPercentage(processedData.performanceMetrics.bestPerformer.total_gain_loss_pct)}
                        </p>
                      </>
                    )}
                  </motion.div>

                  {/* Worst Performer */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 }}
                    className="bg-gradient-to-br from-red-900/20 to-red-800/20 rounded-xl p-4 border border-red-700/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Worst Performer</span>
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    </div>
                    {processedData.performanceMetrics.worstPerformer && (
                      <>
                        <p className="font-semibold truncate">
                          {processedData.performanceMetrics.worstPerformer.name}
                        </p>
                        <p className="text-2xl font-bold text-red-400">
                          {formatPercentage(processedData.performanceMetrics.worstPerformer.total_gain_loss_pct)}
                        </p>
                      </>
                    )}
                  </motion.div>

                  {/* Long/Short Term Mix */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gray-900 rounded-xl p-4 border border-gray-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Tax Efficiency</span>
                      <Timer className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatPercentage(metrics.longTermPercentage)}
                    </p>
                    <p className="text-xs text-gray-500">Long-term holdings</p>
                  </motion.div>

                  {/* Diversification Score */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.45 }}
                    className="bg-gray-900 rounded-xl p-4 border border-gray-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Diversification</span>
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-purple-400">
                      {processedData.concentrationRisk.diversificationRatio}
                    </p>
                    <p className="text-xs text-gray-500">Unique positions</p>
                  </motion.div>
                </div>

                {/* Top Income Producers */}
                {processedData.incomeMetrics.topIncomePositions.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Top Income Producers
                    </h3>
                    
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-800/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Position</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Annual Income</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Yield</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {processedData.incomeMetrics.topIncomePositions.map((position, index) => (
                              <motion.tr
                                key={position.identifier}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.05 * index }}
                                className="hover:bg-gray-800/30 cursor-pointer"
                                onClick={() => {
                                  setSelectedPosition(position);
                                  setIsDetailModalOpen(true);
                                }}
                              >
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium">{position.name}</p>
                                    <p className="text-xs text-gray-400">{position.identifier}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-green-400">
                                  {showValues ? formatCurrency(position.est_annual_income) : '••••'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {formatPercentage(position.income_yield || 0)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {showValues ? formatCurrency(position.total_value) : '••••'}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.section>
                )}
              </motion.div>
            )}

            {selectedView === 'table' && (
              <motion.div
                key="table"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                  <UnifiedGroupPositionsTable2 
                    initialSort="value-high"
                    showHistoricalColumns={true}
                  />
                </div>
              </motion.div>
            )}

            {selectedView === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                {/* Advanced Analytics View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Holdings Treemap */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-400" />
                      Holdings Heatmap
                    </h3>
                    
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <ResponsiveContainer width="100%" height={400}>
                        <Treemap
                          data={positions.slice(0, 20).map(pos => ({
                            name: pos.identifier,
                            size: pos.total_value,
                            gain: pos.total_gain_loss_pct
                          }))}
                          dataKey="size"
                          aspectRatio={4/3}
                          stroke="#374151"
                          fill="#3B82F6"
                        >
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                            formatter={(value) => formatCurrency(value)}
                          />
                        </Treemap>
                      </ResponsiveContainer>
                    </div>
                  </motion.section>

                  {/* Risk Analysis Radar */}
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-yellow-400" />
                      Risk Profile
                    </h3>
                    
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={[
                          { metric: 'Concentration', value: 100 - processedData.concentrationRisk.top5Concentration },
                          { metric: 'Diversification', value: Math.min(processedData.concentrationRisk.diversificationRatio * 2, 100) },
                          { metric: 'Tax Efficiency', value: metrics.longTermPercentage },
                          { metric: 'Income Yield', value: Math.min(processedData.incomeMetrics.incomeYield * 10, 100) },
                          { metric: 'Win Rate', value: (processedData.performanceMetrics.winners / positions.length) * 100 },
                        ]}>
                          <PolarGrid stroke="#374151" />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF' }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar name="Portfolio" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.section>
                </div>

                {/* Position Changes */}
                {metrics.recentChanges.length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-400" />
                      Recent Position Changes
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {metrics.recentChanges.slice(0, 6).map((position, index) => (
                        <motion.div
                          key={position.identifier}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.05 * index }}
                          className="bg-gray-900 rounded-lg p-4 border border-gray-800"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold">{position.name}</p>
                              <p className="text-xs text-gray-400">{position.identifier}</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${
                              position.quantity_1d_change > 0 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {position.quantity_1d_change > 0 ? '+' : ''}{formatNumber(position.quantity_1d_change)}
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">1D Change</span>
                              <span className={position.quantity_1d_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatPercentage(position.quantity_1d_change_pct)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">New Quantity</span>
                              <span>{formatNumber(position.total_quantity)}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 pt-8 border-t border-gray-800"
          >
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  Last updated: {positions[0]?.as_of_date ? 
                    new Date(positions[0].as_of_date).toLocaleString() : 
                    'Never'
                  }
                </span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Advanced Metrics
                </button>
                <button
                  onClick={() => window.print()}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </motion.footer>
        </div>
      </div>

      {/* Position Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedPosition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsDetailModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedPosition.name}</h2>
                  <p className="text-gray-400">{selectedPosition.identifier}</p>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Position details content */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Total Value</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(selectedPosition.total_value)}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Total Return</p>
                    <p className={`text-2xl font-bold ${
                      selectedPosition.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercentage(selectedPosition.total_gain_loss_pct)}
                    </p>
                  </div>
                </div>

                {/* Add more position details as needed */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              animate={{ 
                rotate: 360
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            transform: translateX(0%);
          }
          50% {
            transform: translateX(-100%);
          }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </div>
  );
}