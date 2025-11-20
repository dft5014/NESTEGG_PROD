import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Briefcase, Building2, TrendingUp, TrendingDown,
  ArrowUp, ArrowDown, PieChart as PieChartIcon, BarChart2,
  RefreshCw, Eye, EyeOff, Sparkles, Activity, Layers,
  Wallet, Target, Award, ChevronRight, ArrowUpRight, ArrowDownRight,
  Shield, Zap, Package, Percent, TrendingUp as TrendUp, Clock,
  Calendar, DollarSign as Dollar, LineChart
} from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';

// Import DataStore hooks
import { useAccounts } from '@/store/hooks/useAccounts';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useAccountTrends } from '@/store/hooks/useAccountTrends';

// Import components
import KpiCard from '@/components/ui/KpiCard';
import UnifiedAccountTable from '@/components/tables/UnifiedAccountTable';

// Import utilities
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';

// Institution color mapping
const institutionColors = {
  'Vanguard': '#c41e3a',
  'Fidelity': '#00853f',
  'Charles Schwab': '#0076ce',
  'Robinhood': '#00c805',
  'TD Ameritrade': '#00a800',
  'Chase': '#117aca',
  'Bank of America': '#e31837',
  'Wells Fargo': '#d71e28',
  'E*TRADE': '#6633cc',
  'Merrill Lynch': '#0071ce',
  'Morgan Stanley': '#0033a0',
  'Coinbase': '#0052ff',
  'Kraken': '#5741d9',
  'Binance': '#f3ba2f',
  'Interactive Brokers': '#c41e3d',
  'Betterment': '#1B4E7E',
  'Wealthfront': '#4840BB'
};

const getInstitutionColor = (institution) => {
  return institutionColors[institution] || '#6366f1';
};

// Account type color mapping
const accountTypeColors = {
  'brokerage': '#4f46e5',
  'retirement': '#10b981',
  'bank': '#3b82f6',
  'crypto': '#8b5cf6',
  'real_estate': '#14b8a6',
  'other': '#6b7280'
};

export default function Accounts2Page() {
  const [showValues, setShowValues] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [hoveredInstitution, setHoveredInstitution] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  // Get data from DataStore hooks
  const {
    accounts,
    summary: accountsSummary,
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
    isStale: accountsStale
  } = useAccounts();

  const {
    summary: portfolioSummary,
    accountDiversification,
    institutionAllocation,
    concentrationMetrics,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary
  } = usePortfolioSummary();

  // Combined loading and refresh states
  const isLoading = accountsLoading || summaryLoading;
  const isRefreshing = isLoading && accounts.length > 0;

  // Handle refresh
  const handleRefresh = async () => {
    await Promise.all([
      refreshAccounts(),
      refreshSummary()
    ]);
  };

  // Calculate comprehensive breakdowns
  const institutionBreakdown = useMemo(() => {
    const breakdown = {};
    accounts.forEach(account => {
      const institution = account.institution || 'Unknown';
      if (!breakdown[institution]) {
        breakdown[institution] = {
          name: institution,
          count: 0,
          totalValue: 0,
          liquidValue: 0,
          illiquidValue: 0,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          totalCostBasis: 0,
          value1dChange: 0,
          value1wChange: 0,
          value1mChange: 0,
          securityCount: 0,
          cryptoCount: 0,
          annualDividends: 0,
          avgYield: 0,
          color: getInstitutionColor(institution)
        };
      }
      breakdown[institution].count++;
      breakdown[institution].totalValue += account.totalValue || 0;
      breakdown[institution].liquidValue += account.liquidValue || 0;
      breakdown[institution].illiquidValue += account.illiquidValue || 0;
      breakdown[institution].totalGainLoss += account.totalGainLoss || 0;
      breakdown[institution].totalCostBasis += account.totalCostBasis || 0;
      breakdown[institution].value1dChange += account.value1dChange || 0;
      breakdown[institution].value1wChange += account.value1wChange || 0;
      breakdown[institution].value1mChange += account.value1mChange || 0;
      breakdown[institution].securityCount += account.securityPositions || 0;
      breakdown[institution].cryptoCount += account.cryptoPositions || 0;
      breakdown[institution].annualDividends += account.dividendIncomeAnnual || 0;
    });

    // Calculate percentages and averages
    Object.values(breakdown).forEach(inst => {
      inst.totalGainLossPercent = inst.totalCostBasis > 0
        ? ((inst.totalGainLoss / inst.totalCostBasis) * 100)
        : 0;
      inst.avgYield = inst.totalValue > 0
        ? ((inst.annualDividends / inst.totalValue) * 100)
        : 0;
      inst.allocationPercent = portfolioSummary?.totalAssets > 0
        ? ((inst.totalValue / portfolioSummary.totalAssets) * 100)
        : 0;
    });

    return Object.values(breakdown).sort((a, b) => b.totalValue - a.totalValue);
  }, [accounts, portfolioSummary?.totalAssets]);

  // Calculate account type breakdown
  const accountTypeBreakdown = useMemo(() => {
    const breakdown = {};
    accounts.forEach(account => {
      const type = account.category || account.type || 'Unknown';
      if (!breakdown[type]) {
        breakdown[type] = {
          type,
          count: 0,
          totalValue: 0,
          liquidValue: 0,
          totalGainLoss: 0,
          totalCostBasis: 0,
          percentage: 0,
          accounts: []
        };
      }
      breakdown[type].count++;
      breakdown[type].totalValue += account.totalValue || 0;
      breakdown[type].liquidValue += account.liquidValue || 0;
      breakdown[type].totalGainLoss += account.totalGainLoss || 0;
      breakdown[type].totalCostBasis += account.totalCostBasis || 0;
      breakdown[type].accounts.push(account);
    });

    const total = Object.values(breakdown).reduce((sum, item) => sum + item.totalValue, 0);
    Object.values(breakdown).forEach(item => {
      item.percentage = total > 0 ? (item.totalValue / total) * 100 : 0;
      item.gainLossPercent = item.totalCostBasis > 0
        ? ((item.totalGainLoss / item.totalCostBasis) * 100)
        : 0;
    });

    return Object.values(breakdown).sort((a, b) => b.totalValue - a.totalValue);
  }, [accounts]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!accounts.length) return null;

    const totalValue = accounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
    const totalCostBasis = accounts.reduce((sum, acc) => sum + (acc.totalCostBasis || 0), 0);
    const totalGainLoss = accounts.reduce((sum, acc) => sum + (acc.totalGainLoss || 0), 0);
    const value1dChange = accounts.reduce((sum, acc) => sum + (acc.value1dChange || 0), 0);
    const value1wChange = accounts.reduce((sum, acc) => sum + (acc.value1wChange || 0), 0);
    const value1mChange = accounts.reduce((sum, acc) => sum + (acc.value1mChange || 0), 0);
    const annualDividends = accounts.reduce((sum, acc) => sum + (acc.dividendIncomeAnnual || 0), 0);

    return {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent: totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
      value1dChange,
      value1dChangePercent: totalValue > 0 ? (value1dChange / totalValue) * 100 : 0,
      value1wChange,
      value1wChangePercent: totalValue > 0 ? (value1wChange / totalValue) * 100 : 0,
      value1mChange,
      value1mChangePercent: totalValue > 0 ? (value1mChange / totalValue) * 100 : 0,
      annualDividends,
      avgYield: totalValue > 0 ? (annualDividends / totalValue) * 100 : 0
    };
  }, [accounts]);

  // Top performing accounts
  const topPerformers = useMemo(() => {
    return [...accounts]
      .sort((a, b) => (b.totalGainLoss || 0) - (a.totalGainLoss || 0))
      .slice(0, 5);
  }, [accounts]);

  // Account distribution for pie chart
  const accountDistribution = useMemo(() => {
    return institutionBreakdown.slice(0, 8).map(inst => ({
      name: inst.name,
      value: inst.totalValue,
      color: inst.color,
      percentage: inst.allocationPercent
    }));
  }, [institutionBreakdown]);

  // Filter accounts by selected institution
  const filteredAccounts = useMemo(() => {
    if (!selectedInstitution) return accounts;
    return accounts.filter(acc => acc.institution === selectedInstitution);
  }, [accounts, selectedInstitution]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white">
      <Head>
        <title>NestEgg - Accounts</title>
        <meta name="description" content="Comprehensive account management and analytics" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                <Briefcase className="w-9 h-9 text-indigo-400" />
                Account Portfolio
              </h1>
              <p className="text-gray-400 mt-2">
                Comprehensive view of your financial accounts and performance
              </p>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowValues(!showValues)}
                className="p-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 transition-all"
              >
                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {(accountsError || summaryError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-red-400" />
            <p className="text-red-300">{accountsError || summaryError}</p>
          </motion.div>
        )}

        {/* Key Performance Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <BarChart2 className="w-6 h-6 mr-2 text-indigo-400" />
            Performance Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Account Value */}
            <KpiCard
              title="Total Account Value"
              value={showValues ? (performanceMetrics?.totalValue || 0) : '•••••'}
              icon={<Wallet className="w-4 h-4" />}
              isLoading={isLoading}
              format={(val) => typeof val === 'string' ? val : formatCurrency(val)}
              color="blue"
            >
              {performanceMetrics?.value1dChangePercent !== undefined && (
                <div className="flex items-center gap-2 mt-2">
                  {performanceMetrics.value1dChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    performanceMetrics.value1dChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {performanceMetrics.value1dChange >= 0 ? '+' : ''}
                    {formatCurrency(performanceMetrics.value1dChange)} today
                  </span>
                </div>
              )}
            </KpiCard>

            {/* Total Gain/Loss */}
            <KpiCard
              title="Total Gain/Loss"
              value={showValues ? (performanceMetrics?.totalGainLoss || 0) : '•••••'}
              icon={<TrendingUp className="w-4 h-4" />}
              isLoading={isLoading}
              format={(val) => typeof val === 'string' ? val : formatCurrency(val)}
              color={performanceMetrics?.totalGainLoss >= 0 ? "green" : "red"}
            >
              {performanceMetrics?.totalGainLossPercent !== undefined && (
                <span className={`text-sm font-medium ${
                  performanceMetrics.totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performanceMetrics.totalGainLossPercent >= 0 ? '+' : ''}
                  {performanceMetrics.totalGainLossPercent.toFixed(2)}%
                </span>
              )}
            </KpiCard>

            {/* Active Accounts */}
            <KpiCard
              title="Active Accounts"
              value={accounts.length || 0}
              icon={<Briefcase className="w-4 h-4" />}
              isLoading={isLoading}
              format={(val) => val.toString()}
              color="purple"
            >
              <span className="text-sm text-gray-400">
                {institutionBreakdown.length} institutions
              </span>
            </KpiCard>

            {/* Annual Dividends */}
            <KpiCard
              title="Annual Income"
              value={showValues ? (performanceMetrics?.annualDividends || 0) : '•••••'}
              icon={<Dollar className="w-4 h-4" />}
              isLoading={isLoading}
              format={(val) => typeof val === 'string' ? val : formatCurrency(val)}
              color="amber"
            >
              {performanceMetrics?.avgYield !== undefined && (
                <span className="text-sm text-amber-300">
                  {performanceMetrics.avgYield.toFixed(2)}% avg yield
                </span>
              )}
            </KpiCard>
          </div>
        </motion.div>

        {/* Institution & Performance Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Institution Allocation Pie Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-1 bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2 text-indigo-400" />
              Institution Allocation
            </h3>

            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={accountDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {accountDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                            <p className="font-semibold text-white">{data.name}</p>
                            <p className="text-indigo-400">{formatCurrency(data.value)}</p>
                            <p className="text-gray-400 text-sm">{data.percentage.toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {accountDistribution.map((inst, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: inst.color }}
                    />
                    <span className="text-gray-300">{inst.name}</span>
                  </div>
                  <span className="text-white font-medium">
                    {inst.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Performance Breakdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-400" />
              Performance Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1 Day */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">1 Day</span>
                  <Clock className="w-4 h-4 text-gray-500" />
                </div>
                <div className={`text-2xl font-bold ${
                  performanceMetrics?.value1dChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performanceMetrics?.value1dChange >= 0 ? '+' : ''}
                  {showValues ? formatCurrency(performanceMetrics?.value1dChange || 0) : '•••••'}
                </div>
                <div className={`text-sm ${
                  performanceMetrics?.value1dChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performanceMetrics?.value1dChangePercent >= 0 ? '+' : ''}
                  {performanceMetrics?.value1dChangePercent.toFixed(2)}%
                </div>
              </div>

              {/* 1 Week */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">1 Week</span>
                  <Calendar className="w-4 h-4 text-gray-500" />
                </div>
                <div className={`text-2xl font-bold ${
                  performanceMetrics?.value1wChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performanceMetrics?.value1wChange >= 0 ? '+' : ''}
                  {showValues ? formatCurrency(performanceMetrics?.value1wChange || 0) : '•••••'}
                </div>
                <div className={`text-sm ${
                  performanceMetrics?.value1wChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performanceMetrics?.value1wChangePercent >= 0 ? '+' : ''}
                  {performanceMetrics?.value1wChangePercent.toFixed(2)}%
                </div>
              </div>

              {/* 1 Month */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">1 Month</span>
                  <LineChart className="w-4 h-4 text-gray-500" />
                </div>
                <div className={`text-2xl font-bold ${
                  performanceMetrics?.value1mChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performanceMetrics?.value1mChange >= 0 ? '+' : ''}
                  {showValues ? formatCurrency(performanceMetrics?.value1mChange || 0) : '•••••'}
                </div>
                <div className={`text-sm ${
                  performanceMetrics?.value1mChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {performanceMetrics?.value1mChangePercent >= 0 ? '+' : ''}
                  {performanceMetrics?.value1mChangePercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
                <Award className="w-4 h-4 mr-2" />
                Top Performing Accounts
              </h4>
              <div className="space-y-2">
                {topPerformers.map((account, index) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{account.name}</p>
                        <p className="text-xs text-gray-400">{account.institution}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        account.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {account.totalGainLoss >= 0 ? '+' : ''}
                        {showValues ? formatCurrency(account.totalGainLoss) : '•••••'}
                      </p>
                      <p className={`text-xs ${
                        account.totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {account.totalGainLossPercent >= 0 ? '+' : ''}
                        {account.totalGainLossPercent?.toFixed(2) || '0.00'}%
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Institution Breakdown Detail */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Building2 className="w-6 h-6 mr-2 text-indigo-400" />
              Institution Analysis
            </h2>
            {selectedInstitution && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedInstitution(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm flex items-center gap-2"
              >
                Clear Filter
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {institutionBreakdown.map((inst, index) => (
              <motion.div
                key={inst.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseEnter={() => setHoveredInstitution(inst.name)}
                onMouseLeave={() => setHoveredInstitution(null)}
                onClick={() => setSelectedInstitution(inst.name)}
                className={`relative bg-gray-900/70 backdrop-blur-sm border rounded-2xl p-6 cursor-pointer transition-all ${
                  selectedInstitution === inst.name
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: inst.color }}
                    >
                      {inst.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{inst.name}</h3>
                      <p className="text-sm text-gray-400">{inst.count} accounts</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {showValues ? formatCurrency(inst.totalValue) : '•••••'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {inst.allocationPercent.toFixed(1)}% of portfolio
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${inst.allocationPercent}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="h-full"
                    style={{ backgroundColor: inst.color }}
                  />
                </div>

                {/* Detailed metrics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Gain/Loss</p>
                    <p className={`text-sm font-semibold ${
                      inst.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {inst.totalGainLoss >= 0 ? '+' : ''}
                      {showValues ? formatCurrency(inst.totalGainLoss) : '•••••'}
                    </p>
                    <p className={`text-xs ${
                      inst.totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {inst.totalGainLossPercent >= 0 ? '+' : ''}
                      {inst.totalGainLossPercent.toFixed(2)}%
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">1D Change</p>
                    <p className={`text-sm font-semibold ${
                      inst.value1dChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {inst.value1dChange >= 0 ? '+' : ''}
                      {showValues ? formatCurrency(inst.value1dChange) : '•••••'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Positions</p>
                    <p className="text-sm font-semibold text-white">
                      {inst.securityCount + inst.cryptoCount}
                    </p>
                    <p className="text-xs text-gray-400">
                      {inst.securityCount} stocks, {inst.cryptoCount} crypto
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Annual Income</p>
                    <p className="text-sm font-semibold text-amber-400">
                      {showValues ? formatCurrency(inst.annualDividends) : '•••••'}
                    </p>
                    <p className="text-xs text-amber-400">
                      {inst.avgYield.toFixed(2)}% yield
                    </p>
                  </div>
                </div>

                {/* Hover indicator */}
                {hoveredInstitution === inst.name && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <ChevronRight className="w-5 h-5 text-indigo-400" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Account Type Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Layers className="w-6 h-6 mr-2 text-indigo-400" />
            Account Type Distribution
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountTypeBreakdown.map((type, index) => (
              <motion.div
                key={type.type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {type.type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-gray-400">{type.count} accounts</p>
                  </div>
                  <Package className="w-8 h-8 text-indigo-400" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-400">Total Value</span>
                    <span className="text-xl font-bold text-white">
                      {showValues ? formatCurrency(type.totalValue) : '•••••'}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-gray-400">Portfolio %</span>
                    <span className="text-lg font-semibold text-indigo-400">
                      {type.percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${type.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-400">Gain/Loss</span>
                      <span className={`text-sm font-semibold ${
                        type.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {type.totalGainLoss >= 0 ? '+' : ''}
                        {showValues ? formatCurrency(type.totalGainLoss) : '•••••'}
                        <span className="text-xs ml-1">
                          ({type.gainLossPercent.toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Accounts Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <BarChart2 className="w-6 h-6 mr-2 text-indigo-400" />
            {selectedInstitution ? `${selectedInstitution} Accounts` : 'All Accounts'}
          </h2>

          {!isLoading && accounts.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-12 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 mb-4">
                <Briefcase className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No accounts found</h3>
              <p className="text-sm text-gray-400">Add your first account to get started tracking your portfolio.</p>
            </div>
          ) : (
            <UnifiedAccountTable
              title={selectedInstitution ? `${selectedInstitution} Accounts` : "All Accounts"}
              initialSort="value-high"
              onDataChanged={handleRefresh}
              filterInstitution={selectedInstitution}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
