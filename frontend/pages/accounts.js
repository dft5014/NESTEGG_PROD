import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Briefcase, Building2, Landmark, 
  ArrowUp, CreditCard, PieChart as PieChartIcon,
  Shield, BarChart2, LineChart, Plus, RefreshCw,
  TrendingUp, TrendingDown, Zap, Sparkles, ChevronRight,
  Activity, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Wallet, PiggyBank, Target, Award, Info, Calendar,
  Clock, Star, AlertCircle, ChevronUp, ChevronDown, Layers
} from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
import UnifiedAccountTable from '@/components/tables/UnifiedAccountTable';
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';



// Import DataStore hooks - NO API METHODS!
import { useAccounts } from '@/store/hooks/useAccounts';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';

export default function AccountsPage() {
  const [showValues, setShowValues] = useState(true);
  const [hoveredInstitution, setHoveredInstitution] = useState(null);
  const [hoveredAccountType, setHoveredAccountType] = useState(null);
  const router = useRouter();

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
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary
  } = usePortfolioSummary();

  // Combined loading and refresh states
  const isLoading = accountsLoading || summaryLoading;
  const isRefreshing = isLoading && accounts.length > 0; // Loading but has data

  // Handle refresh - refresh both data sources
  const handleRefresh = async () => {
    await Promise.all([
      refreshAccounts(),
      refreshSummary()
    ]);
  };

  // Calculate institution breakdown from accounts
  const institutionBreakdown = React.useMemo(() => {
    const breakdown = {};
    accounts.forEach(account => {
      const institution = account.institution || 'Unknown';
      if (!breakdown[institution]) {
        breakdown[institution] = {
          name: institution,
          count: 0,
          totalValue: 0,
          totalGainLoss: 0
        };
      }
      breakdown[institution].count++;
      breakdown[institution].totalValue += account.totalValue || 0;
      breakdown[institution].totalGainLoss += account.totalGainLoss || 0;
    });
    return Object.values(breakdown).sort((a, b) => b.totalValue - a.totalValue);
  }, [accounts]);

  // Calculate account type breakdown
  const accountTypeBreakdown = React.useMemo(() => {
    const breakdown = {};
    accounts.forEach(account => {
      const type = account.category || account.type || 'Unknown';
      if (!breakdown[type]) {
        breakdown[type] = {
          type,
          count: 0,
          totalValue: 0,
          percentage: 0
        };
      }
      breakdown[type].count++;
      breakdown[type].totalValue += account.totalValue || 0;
    });

    const total = Object.values(breakdown).reduce((sum, item) => sum + item.totalValue, 0);
    Object.values(breakdown).forEach(item => {
      item.percentage = total > 0 ? (item.totalValue / total) * 100 : 0;
    });

    return Object.values(breakdown).sort((a, b) => b.totalValue - a.totalValue);
  }, [accounts]);

  // Institution Colors (Tailwind classes for existing sections)
  const institutionColorClasses = {
    'Vanguard': 'bg-red-600',
    'Fidelity': 'bg-green-600',
    'Charles Schwab': 'bg-blue-600',
    'Robinhood': 'bg-emerald-500',
    'TD Ameritrade': 'bg-gray-700',
    'Chase': 'bg-blue-700',
    'Bank of America': 'bg-red-700',
    'Wells Fargo': 'bg-yellow-600',
    'E*TRADE': 'bg-purple-600',
    'Merrill Lynch': 'bg-indigo-600',
    'Morgan Stanley': 'bg-blue-800',
    'Coinbase': 'bg-blue-500',
    'Kraken': 'bg-purple-700',
    'Binance': 'bg-yellow-500',
    'Default': 'bg-gray-600'
  };

  // Institution Colors (Hex for charts)
  const institutionColorHex = {
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
    'Wealthfront': '#4840BB',
    'Default': '#6366f1'
  };

  const getInstitutionColor = (institution) => {
    return institutionColorHex[institution] || institutionColorHex['Default'];
  };

  const getInstitutionColorClass = (institution) => {
    return institutionColorClasses[institution] || institutionColorClasses['Default'];
  };

  // Calculate performance metrics from accounts data
  const performanceMetrics = React.useMemo(() => {
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
  const topPerformers = React.useMemo(() => {
    return [...accounts]
      .sort((a, b) => (b.totalGainLoss || 0) - (a.totalGainLoss || 0))
      .slice(0, 5);
  }, [accounts]);

  // Account distribution for pie chart
  const accountDistribution = React.useMemo(() => {
    return institutionBreakdown.slice(0, 8).map(inst => ({
      name: inst.name,
      value: inst.totalValue,
      color: getInstitutionColor(inst.name),
      percentage: portfolioSummary?.totalAssets > 0
        ? ((inst.totalValue / portfolioSummary.totalAssets) * 100)
        : 0
    }));
  }, [institutionBreakdown, portfolioSummary?.totalAssets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white">
      <Head>
        <title>NestEgg - Accounts</title>
        <meta name="description" content="Manage your investment accounts" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-indigo-400" />
                Your Accounts
              </h1>
              <p className="text-gray-400 mt-2">
                Track and manage all your investment accounts in one place
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowValues(!showValues)}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              
            </div>
          </div>
        </div>

        {/* Error State */}
        {(accountsError || summaryError) && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300">{accountsError || summaryError}</p>
          </div>
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
              icon={<DollarSign className="w-4 h-4" />}
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

        {/* Asset Allocation Summary */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Asset Types */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-indigo-400" />
                Asset Allocation
              </h3>
              <div className="space-y-3">
                {portfolioSummary?.assetAllocation && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Securities</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.assetAllocation.securities?.value || 0) : '•••••'}
                            <span className="text-gray-400 text-sm ml-2">
                              ({formatPercentage(portfolioSummary.assetAllocation.securities?.percentage, { minimumFractionDigits: 1, maximumFractionDigits: 1 })})
                            </span>     
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cash</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.assetAllocation.cash?.value || 0) : '•••••'}
                        <span className="text-gray-400 text-sm ml-2">
                          ({formatPercentage(portfolioSummary.assetAllocation.cash?.percentage || 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Crypto</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.assetAllocation.crypto?.value || 0) : '•••••'}
                        <span className="text-gray-400 text-sm ml-2">
                          ({formatPercentage(portfolioSummary.assetAllocation.crypto?.percentage || 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Metals</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.assetAllocation.metal?.value || 0) : '•••••'}
                        <span className="text-gray-400 text-sm ml-2">
                          ({formatPercentage(portfolioSummary.assetAllocation.metal?.percentage || 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Other Assets</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.otherAssets || 0) : '•••••'}
                        <span className="text-gray-400 text-sm ml-2">
                          ({formatPercentage(portfolioSummary.totalAssets > 0 ? (portfolioSummary.otherAssets / portfolioSummary.totalAssets) : 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })})
                        </span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-400" />
                Performance Summary
              </h3>
              <div className="space-y-3">
                {portfolioSummary?.periodChanges && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Today</span>
                      <span className={`font-medium ${
                        portfolioSummary.periodChanges['1d']?.netWorth > 0 ? 'text-green-500' :
                        portfolioSummary.periodChanges['1d']?.netWorth < 0 ? 'text-red-500' :
                        'text-gray-400'
                      }`}>
                        {portfolioSummary.periodChanges['1d']?.netWorth > 0 ? '+' : ''}
                        {showValues ? formatCurrency(portfolioSummary.periodChanges['1d']?.netWorth || 0) : '•••••'}
                        <span className="text-sm ml-1">
                          ({portfolioSummary.periodChanges['1d']?.netWorthPercent > 0 ? '+' : ''}
                          ({formatPercentage(portfolioSummary.periodChanges['1d'].percentChange / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">This Week</span>
                      <span className={`font-medium ${
                        portfolioSummary.periodChanges['1w']?.netWorth > 0 ? 'text-green-500' :
                        portfolioSummary.periodChanges['1w']?.netWorth < 0 ? 'text-red-500' :
                        'text-gray-400'
                      }`}>
                        {portfolioSummary.periodChanges['1w']?.netWorth > 0 ? '+' : ''}
                        {showValues ? formatCurrency(portfolioSummary.periodChanges['1w']?.netWorth || 0) : '•••••'}
                        <span className="text-sm ml-1">
                          ({portfolioSummary.periodChanges['1w']?.netWorthPercent > 0 ? '+' : ''}
                          ({formatPercentage(portfolioSummary.periodChanges['1w'].percentChange / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">This Month</span>
                      <span className={`font-medium ${
                        portfolioSummary.periodChanges['1m']?.netWorth > 0 ? 'text-green-500' :
                        portfolioSummary.periodChanges['1m']?.netWorth < 0 ? 'text-red-500' :
                        'text-gray-400'
                      }`}>
                        {portfolioSummary.periodChanges['1m']?.netWorth > 0 ? '+' : ''}
                        {showValues ? formatCurrency(portfolioSummary.periodChanges['1m']?.netWorth || 0) : '•••••'}
                        <span className="text-sm ml-1">
                          ({portfolioSummary.periodChanges['1m']?.netWorthPercent > 0 ? '+' : ''}
                          ({formatPercentage(portfolioSummary.periodChanges['1m'].percentChange / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">YTD</span>
                      <span className={`font-medium ${
                        portfolioSummary.periodChanges['ytd']?.netWorth > 0 ? 'text-green-500' :
                        portfolioSummary.periodChanges['ytd']?.netWorth < 0 ? 'text-red-500' :
                        'text-gray-400'
                      }`}>
                        {portfolioSummary.periodChanges['ytd']?.netWorth > 0 ? '+' : ''}
                        {showValues ? formatCurrency(portfolioSummary.periodChanges['ytd']?.netWorth || 0) : '•••••'}
                        <span className="text-sm ml-1">
                          ({portfolioSummary.periodChanges['ytd']?.netWorthPercent > 0 ? '+' : ''}
                          ({formatPercentage(portfolioSummary.periodChanges['ytd'].percentChange / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        {!isLoading && accounts.length === 0 ? (
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 mb-3">
              <Briefcase className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold">No accounts at this time</h3>
            <p className="text-sm text-gray-400 mt-1">Add your first account to get started.</p>
          </div>
        ) : (
          <UnifiedAccountTable 
            title="All Accounts"
            initialSort="value-high"
            onDataChanged={handleRefresh}
          />
        )}


        {/* Section Divider */}
        <div className="my-8 border-t border-gray-700/50" />

        {/* Institution & Account Type Breakdown */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Institution Breakdown */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-indigo-400" />
                By Institution
              </h3>
              <div className="space-y-4">
                {institutionBreakdown.slice(0, 5).map((inst, index) => (
                  <motion.div
                    key={inst.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onMouseEnter={() => setHoveredInstitution(inst.name)}
                    onMouseLeave={() => setHoveredInstitution(null)}
                    className="relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getInstitutionColorClass(inst.name)}`} />
                        <span className="text-sm font-medium">{inst.name}</span>
                        <span className="text-xs text-gray-400">({inst.count})</span>
                      </div>
                      <span className="text-sm font-semibold">
                        {showValues ? formatCurrency(inst.totalValue) : '•••••'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(inst.totalValue / (portfolioSummary?.totalAssets || 1)) * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={`h-full ${getInstitutionColorClass(inst.name)}`}
                      />
                    </div>
                    {hoveredInstitution === inst.name && inst.totalGainLoss !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute z-10 top-full mt-2 left-0 bg-gray-900 p-3 rounded-lg shadow-xl"
                      >
                        <p className="text-xs text-gray-400 mb-1">Gain/Loss</p>
                        <p className={`text-sm font-semibold ${inst.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {inst.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(inst.totalGainLoss)}
                        </p>
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
              transition={{ delay: 0.2 }}
              className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-indigo-400" />
                By Account Type
              </h3>
              <div className="space-y-4">
                {accountTypeBreakdown.map((type, index) => (
                  <motion.div
                    key={type.type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onMouseEnter={() => setHoveredAccountType(type.type)}
                    onMouseLeave={() => setHoveredAccountType(null)}
                    className="relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{type.type.replace('_', ' ')}</span>
                        <span className="text-xs text-gray-400">({type.count})</span>
                      </div>
                      <span className="text-sm font-semibold">
                        {showValues ? formatCurrency(type.totalValue) : '•••••'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${type.percentage}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      />
                    </div>
                    {hoveredAccountType === type.type && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute z-10 top-full mt-2 left-0 bg-gray-900 p-3 rounded-lg shadow-xl"
                      >
                        <p className="text-xs text-gray-400 mb-1">Percentage</p>
                        <p className="text-sm font-semibold text-indigo-400">
                          {type.percentage.toFixed(1)}%
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}