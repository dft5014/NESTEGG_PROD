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
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import AddAccountButton from '@/components/AddAccountButton';

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

  // Institution Colors
  const institutionColors = {
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

  const getInstitutionColor = (institution) => {
    return institutionColors[institution] || institutionColors['Default'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white">
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
              
              <AddAccountButton />
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

        {/* KPI Summary Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <BarChart2 className="w-6 h-6 mr-2 text-indigo-400" />
            Portfolio Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Assets */}
            <KpiCard
              title="Total Assets"
              value={showValues ? (portfolioSummary?.totalAssets || 0) : '•••••'}
              icon={<DollarSign className="w-4 h-4" />}
              isLoading={summaryLoading}
              format={(val) => typeof val === 'string' ? val : formatCurrency(val)}
              color="blue"
            >
              {portfolioSummary?.periodChanges?.['1d']?.totalAssetsPercent !== undefined && (
                <span className={`text-sm ${
                  portfolioSummary.periodChanges['1d'].totalAssetsPercent > 0 ? 'text-green-400' :
                  portfolioSummary.periodChanges['1d'].totalAssetsPercent < 0 ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {portfolioSummary.periodChanges['1d'].totalAssetsPercent > 0 ? '+' : ''}
                  {portfolioSummary.periodChanges['1d'].totalAssetsPercent.toFixed(2)}% today
                </span>
              )}
            </KpiCard>

            {/* Liquid Assets */}
            <KpiCard
              title="Liquid Assets"
              value={showValues ? (portfolioSummary?.liquidAssets || 0) : '•••••'}
              icon={<Wallet className="w-4 h-4" />}
              isLoading={summaryLoading}
              format={(val) => typeof val === 'string' ? val : formatCurrency(val)}
              color="green"
            >
              {portfolioSummary?.ratios?.liquidRatio && (
                <span className="text-sm">
                  {(portfolioSummary.ratios.liquidRatio * 100).toFixed(1)}% of portfolio
                </span>
              )}
            </KpiCard>

            {/* Total Gain/Loss */}
            <KpiCard
              title="Total Gain/Loss"
              value={showValues ? (portfolioSummary?.unrealizedGain || 0) : '•••••'}
              icon={<TrendingUp className="w-4 h-4" />}
              isLoading={summaryLoading}
              format={(val) => typeof val === 'string' ? val : formatCurrency(val)}
              color={portfolioSummary?.unrealizedGain >= 0 ? "green" : "red"}
            >
              {portfolioSummary?.unrealizedGainPercent !== undefined && (
                <span className={`text-sm ${
                  portfolioSummary.unrealizedGainPercent > 0 ? 'text-green-400' :
                  portfolioSummary.unrealizedGainPercent < 0 ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {portfolioSummary.unrealizedGainPercent > 0 ? '+' : ''}
                  {portfolioSummary.unrealizedGainPercent.toFixed(2)}%
                </span>
              )}
            </KpiCard>

            {/* Account Count */}
            <KpiCard
              title="Active Accounts"
              value={portfolioSummary?.positionStats?.activeAccountCount || accounts.length || 0}
              icon={<Briefcase className="w-4 h-4" />}
              isLoading={summaryLoading}
              format={(val) => val.toString()}
              color="purple"
            >
              {portfolioSummary?.positionStats?.totalCount && (
                <span className="text-sm">
                  {portfolioSummary.positionStats.totalCount} total positions
                </span>
              )}
            </KpiCard>
          </div>

          {/* Asset Allocation Summary */}
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
                          ({portfolioSummary.assetAllocation.securities?.percentage?.toFixed(1) || 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cash</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.assetAllocation.cash?.value || 0) : '•••••'}
                        <span className="text-gray-400 text-sm ml-2">
                          ({portfolioSummary.assetAllocation.cash?.percentage?.toFixed(1) || 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Crypto</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.assetAllocation.crypto?.value || 0) : '•••••'}
                        <span className="text-gray-400 text-sm ml-2">
                          ({portfolioSummary.assetAllocation.crypto?.percentage?.toFixed(1) || 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Other Assets</span>
                      <span className="text-white font-medium">
                        {showValues ? formatCurrency(portfolioSummary.otherAssets || 0) : '•••••'}
                        <span className="text-gray-400 text-sm ml-2">
                          ({portfolioSummary.totalAssets > 0 ? ((portfolioSummary.otherAssets / portfolioSummary.totalAssets) * 100).toFixed(1) : 0}%)
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
                          {portfolioSummary.periodChanges['1d']?.netWorthPercent?.toFixed(2) || 0}%)
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
                          {portfolioSummary.periodChanges['1w']?.netWorthPercent?.toFixed(2) || 0}%)
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
                          {portfolioSummary.periodChanges['1m']?.netWorthPercent?.toFixed(2) || 0}%)
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
                          {portfolioSummary.periodChanges['ytd']?.netWorthPercent?.toFixed(2) || 0}%)
                        </span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

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
                        <div className={`w-3 h-3 rounded-full ${getInstitutionColor(inst.name)}`} />
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
                        className={`h-full ${getInstitutionColor(inst.name)}`}
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

        {/* Accounts Table */}
        <UnifiedAccountTable 
          title="All Accounts"
          initialSort="value-high"
          onDataChanged={handleRefresh}
        />
      </div>
    </div>
  );
}