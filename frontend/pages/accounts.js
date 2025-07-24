import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Briefcase, Building2, Landmark, 
  ArrowUp, CreditCard, PieChart as PieChartIcon,
  Shield, BarChart2, LineChart, RefreshCw,
  TrendingUp, TrendingDown, Zap, Sparkles, ChevronRight,
  Activity, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Wallet, PiggyBank, Target, Award, Info, Calendar,
  Clock, Star, AlertCircle, ChevronUp, ChevronDown,
  Layers, Filter, Search, Download, Settings,
  Home, Building, Coins, DiamondIcon, Globe2,
  Shield as ShieldIcon, BanknoteIcon, Timer,
  ChartNoAxesCombined, Gem, TrendingUp as TrendIcon
} from 'lucide-react';
import UnifiedAccountTable from '@/components/tables/UnifiedAccountTable';
import UnifiedAccountTable2 from '@/components/tables/UnifiedAccountTable2';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';

export default function AccountsPage() {
  // DataStore hooks
  const { state, actions } = useDataStore();
  const { accounts, loading: accountsLoading, error: accountsError, refresh: refreshAccounts } = useAccounts();
  const { 
    portfolioData, 
    topPerformers, 
    institutionAllocation,
    accountDiversification,
    riskMetrics,
    dividendMetrics,
    concentrationMetrics,
    loading: summaryLoading, 
    error: summaryError,
    refresh: refreshSummary 
  } = usePortfolioSummary();

  // Local state
  const [showValues, setShowValues] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('ytd');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredInstitution, setHoveredInstitution] = useState(null);
  const [selectedView, setSelectedView] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedMetrics, setExpandedMetrics] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  const router = useRouter();

  // Unified loading state
  const isLoading = accountsLoading || summaryLoading;
  const error = accountsError || summaryError;

  // Animation on mount
  useEffect(() => {
    setTimeout(() => setAnimationComplete(true), 1000);
  }, []);

  // Process accounts data with DataStore
  const processedData = useMemo(() => {
    if (!accounts || accounts.length === 0) return {
      liquidAccounts: [],
      illiquidAccounts: [],
      byInstitution: {},
      byCategory: {},
      metrics: {}
    };

    const liquid = accounts.filter(acc => acc.category !== 'other_assets');
    const illiquid = accounts.filter(acc => acc.category === 'other_assets');

    // Group by institution
    const byInstitution = accounts.reduce((acc, account) => {
      const inst = account.institution || 'Other';
      if (!acc[inst]) {
        acc[inst] = {
          accounts: [],
          totalValue: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          count: 0,
          performanceMetrics: {}
        };
      }
      acc[inst].accounts.push(account);
      acc[inst].totalValue += account.totalValue || 0;
      acc[inst].totalGainLoss += account.totalGainLoss || 0;
      acc[inst].count += 1;
      
      // Performance metrics by timeframe
      ['1d', '1w', '1m', 'ytd', '1y'].forEach(period => {
        const changeKey = `value${period.toUpperCase()}Change`;
        const pctKey = `value${period.toUpperCase()}ChangePct`;
        if (!acc[inst].performanceMetrics[period]) {
          acc[inst].performanceMetrics[period] = {
            change: 0,
            percent: 0
          };
        }
        acc[inst].performanceMetrics[period].change += account[changeKey] || 0;
      });
      
      return acc;
    }, {});

    // Calculate institution percentages
    Object.values(byInstitution).forEach(inst => {
      if (inst.totalValue > 0 && inst.totalGainLoss !== 0) {
        const costBasis = inst.totalValue - inst.totalGainLoss;
        inst.totalGainLossPercent = costBasis > 0 ? (inst.totalGainLoss / costBasis) * 100 : 0;
      }
      
      // Calculate weighted performance percentages
      ['1d', '1w', '1m', 'ytd', '1y'].forEach(period => {
        const change = inst.performanceMetrics[period].change;
        const previousValue = inst.totalValue - change;
        inst.performanceMetrics[period].percent = 
          previousValue > 0 ? (change / previousValue) * 100 : 0;
      });
    });

    // Group by category
    const byCategory = accounts.reduce((acc, account) => {
      const cat = account.category || 'other';
      if (!acc[cat]) {
        acc[cat] = {
          accounts: [],
          totalValue: 0,
          totalGainLoss: 0,
          count: 0
        };
      }
      acc[cat].accounts.push(account);
      acc[cat].totalValue += account.totalValue || 0;
      acc[cat].totalGainLoss += account.totalGainLoss || 0;
      acc[cat].count += 1;
      return acc;
    }, {});

    // Calculate key metrics
    const totalValue = accounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
    const liquidValue = liquid.reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
    const illiquidValue = illiquid.reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
    const totalGainLoss = accounts.reduce((sum, acc) => sum + (acc.totalGainLoss || 0), 0);
    const totalCostBasis = totalValue - totalGainLoss;

    const metrics = {
      totalAccounts: accounts.length,
      liquidAccounts: liquid.length,
      illiquidAccounts: illiquid.length,
      totalValue,
      liquidValue,
      illiquidValue,
      liquidityRatio: totalValue > 0 ? (liquidValue / totalValue) * 100 : 0,
      totalGainLoss,
      totalGainLossPercent: totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
      largestAccount: accounts.reduce((max, acc) => 
        acc.totalValue > (max?.totalValue || 0) ? acc : max, null),
      bestPerformer: accounts.reduce((best, acc) => 
        (acc.totalGainLossPercent || 0) > (best?.totalGainLossPercent || 0) ? acc : best, null),
      avgAccountValue: accounts.length > 0 ? totalValue / accounts.length : 0,
      accountsWithGains: accounts.filter(acc => (acc.totalGainLoss || 0) > 0).length,
      accountsWithLosses: accounts.filter(acc => (acc.totalGainLoss || 0) < 0).length,
    };

    return {
      liquidAccounts: liquid,
      illiquidAccounts: illiquid,
      byInstitution,
      byCategory,
      metrics
    };
  }, [accounts]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshAccounts(),
        refreshSummary()
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Institution colors with gradient support
  const getInstitutionStyle = (institution) => {
    const styles = {
      'Vanguard': { 
        gradient: 'from-red-600 to-red-800', 
        glow: 'shadow-red-500/20',
        icon: <Building2 className="w-4 h-4" />
      },
      'Fidelity': { 
        gradient: 'from-green-600 to-green-800', 
        glow: 'shadow-green-500/20',
        icon: <Shield className="w-4 h-4" />
      },
      'Charles Schwab': { 
        gradient: 'from-blue-600 to-blue-800', 
        glow: 'shadow-blue-500/20',
        icon: <Landmark className="w-4 h-4" />
      },
      'E*TRADE': { 
        gradient: 'from-purple-600 to-purple-800', 
        glow: 'shadow-purple-500/20',
        icon: <Zap className="w-4 h-4" />
      },
      'Robinhood': { 
        gradient: 'from-emerald-600 to-emerald-800', 
        glow: 'shadow-emerald-500/20',
        icon: <Activity className="w-4 h-4" />
      },
      'TD Ameritrade': { 
        gradient: 'from-teal-600 to-teal-800', 
        glow: 'shadow-teal-500/20',
        icon: <BarChart2 className="w-4 h-4" />
      },
      'Interactive Brokers': { 
        gradient: 'from-indigo-600 to-indigo-800', 
        glow: 'shadow-indigo-500/20',
        icon: <Globe2 className="w-4 h-4" />
      },
      'Merrill': { 
        gradient: 'from-cyan-600 to-cyan-800', 
        glow: 'shadow-cyan-500/20',
        icon: <Building className="w-4 h-4" />
      }
    };
    return styles[institution] || { 
      gradient: 'from-gray-600 to-gray-800', 
      glow: 'shadow-gray-500/20',
      icon: <Building2 className="w-4 h-4" />
    };
  };

  // Category icons and styles
  const getCategoryStyle = (category) => {
    const styles = {
      'brokerage': { icon: <Briefcase className="w-4 h-4" />, color: 'text-blue-400' },
      'retirement': { icon: <PiggyBank className="w-4 h-4" />, color: 'text-purple-400' },
      'cash': { icon: <Wallet className="w-4 h-4" />, color: 'text-green-400' },
      'other_assets': { icon: <Gem className="w-4 h-4" />, color: 'text-yellow-400' }
    };
    return styles[category] || { icon: <Layers className="w-4 h-4" />, color: 'text-gray-400' };
  };

  // Performance color with gradient
  const getPerformanceColor = (value) => {
    if (value > 5) return 'from-green-400 to-green-600';
    if (value > 0) return 'from-green-500 to-green-700';
    if (value < -5) return 'from-red-400 to-red-600';
    if (value < 0) return 'from-red-500 to-red-700';
    return 'from-gray-400 to-gray-600';
  };

  // Timeframe options
  const timeframes = [
    { key: '1d', label: '1D', fullLabel: '1 Day' },
    { key: '1w', label: '1W', fullLabel: '1 Week' },
    { key: '1m', label: '1M', fullLabel: '1 Month' },
    { key: 'ytd', label: 'YTD', fullLabel: 'Year to Date' },
    { key: '1y', label: '1Y', fullLabel: '1 Year' }
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
            <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
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
        <title>Accounts - NestEgg</title>
      </Head>

      <div className="relative">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
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
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.7 }}
                  className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                >
                  <Home className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Your Financial Dashboard
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    Track and optimize your net worth across all institutions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Timeframe Selector */}
                <div className="flex bg-gray-900/50 backdrop-blur-sm rounded-lg p-1 border border-gray-800">
                  {timeframes.map((tf) => (
                    <button
                      key={tf.key}
                      onClick={() => setSelectedTimeframe(tf.key)}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                        selectedTimeframe === tf.key
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {tf.label}
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

          {/* Portfolio Value Hero Card */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
              {/* Animated gradient background */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-x" />
              </div>

              <div className="relative z-10 p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Total Value Section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <h2 className="text-sm font-medium text-gray-400">Total Net Worth</h2>
                    </div>
                    
                    <div className="mb-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl lg:text-5xl font-bold"
                      >
                        {showValues ? (
                          <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                            {formatCurrency(processedData.metrics.totalValue)}
                          </span>
                        ) : (
                          <span className="text-gray-500">••••••••</span>
                        )}
                      </motion.div>
                      
                      {/* Gain/Loss Display */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2 flex items-center gap-3"
                      >
                        <div className={`flex items-center gap-1 ${
                          processedData.metrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {processedData.metrics.totalGainLoss >= 0 ? 
                            <ArrowUpRight className="w-5 h-5" /> : 
                            <ArrowDownRight className="w-5 h-5" />
                          }
                          <span className="font-semibold">
                            {showValues ? formatCurrency(Math.abs(processedData.metrics.totalGainLoss)) : '••••'}
                          </span>
                          <span className="text-sm">
                            ({formatPercentage(processedData.metrics.totalGainLossPercent)})
                          </span>
                        </div>
                        <span className="text-gray-500 text-sm">All Time</span>
                      </motion.div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {portfolioData && timeframes.map((tf, index) => {
                        const changeKey = `value${tf.key.toUpperCase()}Change`;
                        const pctKey = `value${tf.key.toUpperCase()}ChangePct`;
                        const change = portfolioData[changeKey] || 0;
                        const pct = portfolioData[pctKey] || 0;
                        
                        return (
                          <motion.div
                            key={tf.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.05 }}
                            className={`p-3 rounded-lg ${
                              selectedTimeframe === tf.key 
                                ? 'bg-gray-700/50 ring-2 ring-blue-500' 
                                : 'bg-gray-800/50'
                            }`}
                          >
                            <p className="text-xs text-gray-400 mb-1">{tf.fullLabel}</p>
                            <div className={`font-semibold ${
                              pct >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {showValues ? formatPercentage(pct) : '••'}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Liquidity & Risk Metrics */}
                  <div className="flex flex-col gap-4">
                    {/* Liquidity Gauge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Liquidity Ratio</span>
                        <span className="text-sm font-semibold text-blue-400">
                          {formatPercentage(processedData.metrics.liquidityRatio)}
                        </span>
                      </div>
                      <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${processedData.metrics.liquidityRatio}%` }}
                          transition={{ delay: 0.6, duration: 1 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-gray-500">
                          Liquid: {showValues ? formatCurrency(processedData.metrics.liquidValue) : '••••'}
                        </span>
                        <span className="text-gray-500">
                          Illiquid: {showValues ? formatCurrency(processedData.metrics.illiquidValue) : '••••'}
                        </span>
                      </div>
                    </motion.div>

                    {/* Risk Score */}
                    {riskMetrics && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Risk Score</span>
                          <ShieldIcon className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {riskMetrics.overall_risk_score || 'N/A'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {riskMetrics.risk_level || 'Calculating...'}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3"
                >
                  {[
                    {
                      icon: <Wallet className="w-4 h-4 text-blue-400" />,
                      label: "Accounts",
                      value: processedData.metrics.totalAccounts
                    },
                    {
                      icon: <TrendingUp className="w-4 h-4 text-green-400" />,
                      label: "Winners",
                      value: processedData.metrics.accountsWithGains
                    },
                    {
                      icon: <TrendingDown className="w-4 h-4 text-red-400" />,
                      label: "Losers",
                      value: processedData.metrics.accountsWithLosses
                    },
                    {
                      icon: <Target className="w-4 h-4 text-yellow-400" />,
                      label: "Avg Account",
                      value: showValues ? formatCurrency(processedData.metrics.avgAccountValue) : '••••'
                    },
                    {
                      icon: <Award className="w-4 h-4 text-purple-400" />,
                      label: "Best Performer",
                      value: processedData.metrics.bestPerformer ? 
                        `${formatPercentage(processedData.metrics.bestPerformer.totalGainLossPercent)}` : 
                        'N/A'
                    }
                  ].map((stat, index) => (
                    <motion.div 
                      key={stat.label}
                      className="bg-gray-800/30 rounded-lg p-3 backdrop-blur-sm"
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(55, 65, 81, 0.5)' }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {stat.icon}
                        <p className="text-xs text-gray-400">{stat.label}</p>
                      </div>
                      <p className="text-lg font-bold">{stat.value}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.section>

          {/* Institution Overview */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                By Institution
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setExpandedMetrics(!expandedMetrics)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {expandedMetrics ? 'Show Less' : 'Show More'}
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(processedData.byInstitution).map(([institution, data], index) => {
                const style = getInstitutionStyle(institution);
                const isHovered = hoveredInstitution === institution;
                
                return (
                  <motion.div
                    key={institution}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    onHoverStart={() => setHoveredInstitution(institution)}
                    onHoverEnd={() => setHoveredInstitution(null)}
                    className="relative"
                  >
                    <motion.div
                      animate={{
                        scale: isHovered ? 1.02 : 1,
                        y: isHovered ? -2 : 0
                      }}
                      className={`relative bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden ${
                        isHovered ? `shadow-2xl ${style.glow}` : ''
                      }`}
                    >
                      {/* Gradient Header */}
                      <div className={`h-1 bg-gradient-to-r ${style.gradient}`} />
                      
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 bg-gradient-to-br ${style.gradient} rounded-lg`}>
                              {style.icon}
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">{institution}</h4>
                              <p className="text-xs text-gray-400">
                                {data.count} {data.count === 1 ? 'account' : 'accounts'}
                              </p>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => router.push(`/accounts?institution=${encodeURIComponent(institution)}`)}
                            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </motion.button>
                        </div>

                        {/* Value Display */}
                        <div className="mb-3">
                          <p className="text-2xl font-bold">
                            {showValues ? formatCurrency(data.totalValue) : '••••••'}
                          </p>
                          <div className={`flex items-center gap-1 text-sm ${
                            data.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {data.totalGainLoss >= 0 ? 
                              <ArrowUpRight className="w-4 h-4" /> : 
                              <ArrowDownRight className="w-4 h-4" />
                            }
                            <span>
                              {showValues ? formatCurrency(Math.abs(data.totalGainLoss)) : '••••'}
                              {' '}({formatPercentage(data.totalGainLossPercent)})
                            </span>
                          </div>
                        </div>

                        {/* Performance Bar */}
                        <AnimatePresence>
                          {(expandedMetrics || isHovered) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-2"
                            >
                              <div className="pt-3 border-t border-gray-800">
                                <p className="text-xs text-gray-400 mb-2">Performance</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {['1d', '1m', 'ytd'].map(period => {
                                    const perf = data.performanceMetrics[period];
                                    return (
                                      <div key={period} className="text-center">
                                        <p className="text-xs text-gray-500 uppercase">{period}</p>
                                        <p className={`text-sm font-semibold ${
                                          perf.percent >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {formatPercentage(perf.percent)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Account Categories */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              By Category
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(processedData.byCategory).map(([category, data], index) => {
                const style = getCategoryStyle(category);
                
                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800 cursor-pointer"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`flex items-center gap-2 ${style.color}`}>
                        {style.icon}
                        <span className="text-sm font-medium capitalize">
                          {category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {data.count}
                      </span>
                    </div>
                    <p className="text-lg font-bold mb-1">
                      {showValues ? formatCurrency(data.totalValue) : '••••'}
                    </p>
                    <p className={`text-sm ${
                      data.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {data.totalGainLoss >= 0 ? '+' : ''}
                      {showValues ? formatCurrency(data.totalGainLoss) : '••'}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Account Tables */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* View Toggles */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedView('overview')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedView === 'overview'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSelectedView('detailed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedView === 'detailed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>

            {/* Tables */}
            <div className="space-y-8">
              {selectedView === 'overview' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden"
                >
                  <UnifiedAccountTable />
                </motion.div>
              )}

              {selectedView === 'detailed' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden"
                >
                  <UnifiedAccountTable2 />
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* Performance Insights */}
          {topPerformers && topPerformers.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendIcon className="w-5 h-5 text-green-400" />
                Top Performers
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topPerformers.slice(0, 6).map((position, index) => (
                  <motion.div
                    key={position.identifier}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ y: -2 }}
                    className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{position.name}</h4>
                        <p className="text-xs text-gray-400">{position.identifier}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        position.gain_loss_percent >= 0 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {formatPercentage(position.gain_loss_percent)}
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-gray-400">Value</p>
                        <p className="font-semibold">
                          {showValues ? formatCurrency(position.current_value) : '••••'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Gain/Loss</p>
                        <p className={`font-semibold ${
                          position.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {showValues ? formatCurrency(position.gain_loss) : '••'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

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
                  Last updated: {accounts[0]?.lastUpdated ? 
                    new Date(accounts[0].lastUpdated).toLocaleString() : 
                    'Never'
                  }
                </span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Settings
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
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
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