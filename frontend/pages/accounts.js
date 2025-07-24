import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  DollarSign, Briefcase, Building2, Landmark, 
  ArrowUp, CreditCard, PieChart as PieChartIcon,
  Shield, BarChart2, LineChart, Plus, RefreshCw,
  TrendingUp, TrendingDown, Zap, Sparkles, ChevronRight,
  Activity, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Wallet, PiggyBank, Target, Award, Info, Calendar,
  Clock, Star, AlertCircle
} from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
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
    summary: portfolioData,
    topPositions,
    topPerformersPercent,
    accountDiversification,
    institutionAllocation,
    assetPerformance,
    riskMetrics,
    loading: summaryLoading, 
    error: summaryError,
    refresh: refreshSummary 
  } = usePortfolioSummary();

  // Local state
  const [showValues, setShowValues] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredInstitution, setHoveredInstitution] = useState(null);
  
  const router = useRouter();

  // Combined loading/error states
  const isLoading = accountsLoading || summaryLoading;
  const error = accountsError || summaryError;

  // Process accounts metrics from DataStore
  const accountsMetrics = useMemo(() => {
    if (!accounts || accounts.length === 0) return {};

    const totalValue = accounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
    const liquidAccounts = accounts.filter(acc => acc.category !== 'other_assets');
    const illiquidAccounts = accounts.filter(acc => acc.category === 'other_assets');
    
    const largestAccount = accounts.reduce((max, acc) => 
      acc.totalValue > (max?.totalValue || 0) ? acc : max, null
    );

    const byInstitution = accounts.reduce((acc, account) => {
      const inst = account.institution || 'Other';
      if (!acc[inst]) {
        acc[inst] = {
          count: 0,
          totalValue: 0,
          accounts: []
        };
      }
      acc[inst].count += 1;
      acc[inst].totalValue += account.totalValue || 0;
      acc[inst].accounts.push(account);
      return acc;
    }, {});

    return {
      totalAccounts: accounts.length,
      liquidAccounts: liquidAccounts.length,
      illiquidAccounts: illiquidAccounts.length,
      totalValue,
      liquidValue: liquidAccounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0),
      illiquidValue: illiquidAccounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0),
      avgAccountValue: accounts.length > 0 ? totalValue / accounts.length : 0,
      largestAccount,
      byInstitution
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

  // Institution Colors
  const institutionColors = {
    'Vanguard': 'bg-red-600',
    'Fidelity': 'bg-green-600',
    'Charles Schwab': 'bg-blue-600',
    'E*TRADE': 'bg-purple-600',
    'Robinhood': 'bg-lime-600',
    'TD Ameritrade': 'bg-orange-600',
    'Interactive Brokers': 'bg-indigo-600',
    'Merrill': 'bg-cyan-600'
  };

  const getInstitutionColor = (institution) => {
    return institutionColors[institution] || 'bg-gray-600';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 lg:p-8">
      <Head>
        <title>Accounts - NestEgg</title>
      </Head>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Accounts Overview</h1>
            <p className="text-gray-400">
              Track your net worth across {accountsMetrics.totalAccounts || 0} accounts
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => setShowValues(!showValues)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              title={showValues ? "Hide values" : "Show values"}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Portfolio Summary Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Total Net Worth */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <h2 className="text-sm font-medium text-gray-400">Total Net Worth</h2>
                </div>
                
                <div className="mb-4">
                  <div className="text-4xl font-bold mb-2">
                    {showValues ? 
                      formatCurrency(portfolioData?.netWorth || accountsMetrics.totalValue || 0) : 
                      '••••••••'
                    }
                  </div>
                  
                  {portfolioData && (
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 ${
                        portfolioData.unrealizedGain >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {portfolioData.unrealizedGain >= 0 ? 
                          <ArrowUpRight className="w-4 h-4" /> : 
                          <ArrowDownRight className="w-4 h-4" />
                        }
                        {showValues ? formatCurrency(Math.abs(portfolioData.unrealizedGain)) : '••••'}
                      </span>
                      <span className="text-gray-500">
                        ({formatPercentage(portfolioData.unrealizedGainPercent || 0)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Time-based Performance */}
                {portfolioData && portfolioData.performance && (
                  <div className="grid grid-cols-5 gap-2">
                    {['1d', '1w', '1m', 'ytd', '1y'].map((period) => {
                      const perf = portfolioData.performance[period];
                      if (!perf) return null;
                      
                      return (
                        <button
                          key={period}
                          onClick={() => setSelectedTimeframe(period)}
                          className={`p-2 rounded-lg text-center transition-colors ${
                            selectedTimeframe === period 
                              ? 'bg-gray-800 ring-2 ring-blue-500' 
                              : 'bg-gray-800/50 hover:bg-gray-800'
                          }`}
                        >
                          <p className="text-xs text-gray-400 uppercase mb-1">{period}</p>
                          <p className={`text-sm font-semibold ${
                            perf.netWorthPercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercentage(perf.netWorthPercent)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                {portfolioData && (
                  <>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-1">Liquidity Ratio</p>
                      <p className="text-xl font-bold">
                        {formatPercentage(portfolioData.ratios?.liquidRatio || 0)}
                      </p>
                      <div className="w-full h-2 bg-gray-700 rounded-full mt-2">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${portfolioData.ratios?.liquidRatio || 0}%` }}
                        />
                      </div>
                    </div>

                    {riskMetrics && riskMetrics.overall_risk_score && (
                      <div className="bg-gray-800 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-1">Risk Score</p>
                        <p className="text-xl font-bold text-green-400">
                          {riskMetrics.overall_risk_score}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {riskMetrics.risk_level || 'Moderate'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Account Stats Bar */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  icon: <Wallet className="w-4 h-4 text-blue-400" />,
                  label: "Total Accounts",
                  value: accountsMetrics.totalAccounts || 0
                },
                {
                  icon: <Building2 className="w-4 h-4 text-purple-400" />,
                  label: "Institutions",
                  value: Object.keys(accountsMetrics.byInstitution || {}).length
                },
                {
                  icon: <Target className="w-4 h-4 text-yellow-400" />,
                  label: "Avg Account",
                  value: showValues ? formatCurrency(accountsMetrics.avgAccountValue) : '••••'
                },
                {
                  icon: <Award className="w-4 h-4 text-orange-400" />,
                  label: "Largest",
                  value: showValues ? formatCurrency(accountsMetrics.largestAccount?.totalValue) : '••••'
                }
              ].map((stat) => (
                <motion.div 
                  key={stat.label}
                  className="bg-gray-800 rounded-lg p-3"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {stat.icon}
                    <p className="text-xs text-gray-400">{stat.label}</p>
                  </div>
                  <p className="text-xl font-bold">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Institution Breakdown */}
        {institutionAllocation && institutionAllocation.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-400" />
              Institution Allocation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {institutionAllocation.map((inst, index) => (
                <motion.div
                  key={inst.institution}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * index }}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-800"
                  onMouseEnter={() => setHoveredInstitution(inst.institution)}
                  onMouseLeave={() => setHoveredInstitution(null)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{inst.institution}</h4>
                    <span className={`w-3 h-3 rounded-full ${getInstitutionColor(inst.institution)}`} />
                  </div>
                  <p className="text-2xl font-bold mb-1">
                    {showValues ? formatCurrency(inst.value) : '••••'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatPercentage(inst.percentage)} of portfolio
                  </p>
                  {hoveredInstitution === inst.institution && accountsMetrics.byInstitution[inst.institution] && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-800"
                    >
                      {accountsMetrics.byInstitution[inst.institution].count} accounts
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Accounts Table - DataStore Version */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-blue-400" />
            All Accounts
          </h3>
          
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
            <UnifiedAccountTable2 />
          </div>
        </motion.section>

        {/* Top Positions */}
        {topPositions && topPositions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-400" />
              Top Positions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPositions.slice(0, 6).map((position, index) => (
                <motion.div
                  key={position.identifier || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="bg-gray-900 rounded-lg p-4 border border-gray-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{position.name}</h4>
                      <p className="text-xs text-gray-400">{position.identifier}</p>
                    </div>
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${
                      position.gain_loss_percent >= 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {formatPercentage(position.gain_loss_percent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Value</span>
                    <span className="font-semibold">
                      {showValues ? formatCurrency(position.current_value) : '••••'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Weight</span>
                    <span>{formatPercentage(position.percentage)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Top Performers */}
        {topPerformersPercent && topPerformersPercent.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              Top Performers
            </h3>
            
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Position</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Gain/Loss</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {topPerformersPercent.slice(0, 5).map((position, index) => (
                      <tr key={position.identifier || index} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{position.name}</p>
                            <p className="text-xs text-gray-400">{position.identifier}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {showValues ? formatCurrency(position.current_value) : '••••'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={position.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {showValues ? formatCurrency(position.gain_loss) : '••••'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${
                            position.gain_loss_percent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercentage(position.gain_loss_percent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading your accounts...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}