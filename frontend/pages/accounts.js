import React, { useState, useEffect, useRef } from 'react';
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
  Clock, Star, AlertCircle, ChevronUp, ChevronDown
} from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
import AccountTable from '@/components/tables/UnifiedAccountTable';
import UnifiedAccountTable2 from '@/components/tables/UnifiedAccountTable2'; // New DataStore version
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import AddAccountButton from '@/components/AddAccountButton';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [portfolioData, setPortfolioData] = useState(null);
  const [accountsMetrics, setAccountsMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showValues, setShowValues] = useState(true);
  const [hoveredInstitution, setHoveredInstitution] = useState(null);
  const [hoveredAccountType, setHoveredAccountType] = useState(null);
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useDataStore, setUseDataStore] = useState(true);
  
  const router = useRouter();

  // Institution Colors
  const institutionColors = {
    'Vanguard': 'bg-red-600',
    'Fidelity': 'bg-green-600',
    'Charles Schwab': 'bg-blue-600',
    'Robinhood': 'bg-emerald-500',
    'TD Ameritrade': 'bg-gray-700',
    'Chase': 'bg-blue-700',
    'Bank of America': 'bg-red-700',
    'Wells Fargo': 'bg-red-600',
    'E*TRADE': 'bg-purple-600',
    'Interactive Brokers': 'bg-orange-600',
    'Coinbase': 'bg-indigo-600',
    'Merrill Lynch': 'bg-blue-800',
    'Ally Invest': 'bg-purple-700',
    'Other': 'bg-gray-600'
  };

  // Account Type Icons and Colors
  const accountTypeConfig = {
    'Brokerage': { icon: <LineChart className="w-4 h-4" />, color: 'bg-indigo-600' },
    'Retirement': { icon: <PiggyBank className="w-4 h-4" />, color: 'bg-emerald-600' },
    'Savings': { icon: <Wallet className="w-4 h-4" />, color: 'bg-blue-600' },
    'Checking': { icon: <CreditCard className="w-4 h-4" />, color: 'bg-orange-600' },
    'IRA': { icon: <Shield className="w-4 h-4" />, color: 'bg-purple-600' },
    'Roth IRA': { icon: <Award className="w-4 h-4" />, color: 'bg-pink-600' },
    '401k': { icon: <Target className="w-4 h-4" />, color: 'bg-cyan-600' },
    '401(k)': { icon: <Target className="w-4 h-4" />, color: 'bg-cyan-600' },
    '529': { icon: <Briefcase className="w-4 h-4" />, color: 'bg-lime-600' },
    'HSA': { icon: <Activity className="w-4 h-4" />, color: 'bg-red-600' },
    'Individual': { icon: <Wallet className="w-4 h-4" />, color: 'bg-blue-600' },
    'Traditional IRA': { icon: <Shield className="w-4 h-4" />, color: 'bg-purple-600' },
    'Pension': { icon: <Landmark className="w-4 h-4" />, color: 'bg-indigo-700' },
    'Custodial': { icon: <Shield className="w-4 h-4" />, color: 'bg-teal-600' },
    'Safe Deposit': { icon: <Shield className="w-4 h-4" />, color: 'bg-gray-700' },
    'Other': { icon: <Zap className="w-4 h-4" />, color: 'bg-gray-600' }
  };

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load portfolio data when timeframe changes
  useEffect(() => {
    if (portfolioData) {
      loadPortfolioData();
    }
  }, [selectedTimeframe]);

  // Function to load all data
  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedAccounts, portfolioResponse] = await Promise.all([
        fetchAllAccounts(),
        fetchWithAuth(`/portfolio/snapshots?timeframe=${selectedTimeframe}&include_cost_basis=true`)
      ]);

      const portfolioJson = await portfolioResponse.json();
      
      setAccounts(fetchedAccounts);
      setPortfolioData(portfolioJson);
      
      const metrics = calculateAccountMetrics(fetchedAccounts, portfolioJson);
      setAccountsMetrics(metrics);
    } catch (error) {
      console.error("Error loading data:", error);
      setError(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to load portfolio data
  const loadPortfolioData = async () => {
    try {
      const response = await fetchWithAuth(`/portfolio/snapshots?timeframe=${selectedTimeframe}&include_cost_basis=true`);
      const data = await response.json();
      setPortfolioData(data);
      
      if (accounts.length > 0) {
        const metrics = calculateAccountMetrics(accounts, data);
        setAccountsMetrics(metrics);
      }
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    }
  };

  // Calculate account metrics
  const calculateAccountMetrics = (accounts, portfolio) => {
    const metrics = {
      totalAccounts: accounts.length,
      totalValue: portfolio?.current_value || 0,
      totalCostBasis: portfolio?.total_cost_basis || 0,
      unrealizedGain: portfolio?.unrealized_gain || 0,
      unrealizedGainPercent: portfolio?.unrealized_gain_percent || 0,
      annualIncome: portfolio?.annual_income || 0,
      yieldPercentage: portfolio?.yield_percentage || 0,
      largestAccount: null,
      avgAccountValue: 0,
      totalInstitutions: new Set(),
      accountTypes: {},
      institutionBreakdown: [],
      accountTypeBreakdown: [],
      periodChanges: portfolio?.period_changes || {},
      lastUpdated: portfolio?.last_updated || new Date().toISOString(),
      topPositions: portfolio?.top_positions || [],
      assetAllocation: portfolio?.asset_allocation || {},
      sectorAllocation: portfolio?.sector_allocation || {},
      accountAllocation: portfolio?.account_allocation || []
    };
    
    // Process account allocation
    if (portfolio?.account_allocation) {
      const institutionMap = {};
      portfolio.account_allocation.forEach(account => {
        const institution = account.institution || 'Other';
        if (!institutionMap[institution]) {
          institutionMap[institution] = {
            name: institution,
            value: 0,
            accounts: 0,
            percentage: 0,
            color: institutionColors[institution] || institutionColors.Other
          };
        }
        institutionMap[institution].value += account.value;
        institutionMap[institution].accounts += 1;
        institutionMap[institution].percentage += account.percentage;
      });
      
      metrics.institutionBreakdown = Object.values(institutionMap)
        .sort((a, b) => b.value - a.value);
      
      const accountTypeMap = {};
      portfolio.account_allocation.forEach(account => {
        const accountType = account.account_type || 'Other';
        if (!accountTypeMap[accountType]) {
          accountTypeMap[accountType] = {
            name: accountType,
            value: 0,
            accounts: 0,
            percentage: 0,
            config: accountTypeConfig[accountType] || accountTypeConfig.Other
          };
        }
        accountTypeMap[accountType].value += account.value;
        accountTypeMap[accountType].accounts += 1;
        accountTypeMap[accountType].percentage += account.percentage;
      });
      
      metrics.accountTypeBreakdown = Object.values(accountTypeMap)
        .sort((a, b) => b.value - a.value);
      
      const largestAcc = portfolio.account_allocation.reduce((max, acc) => 
        acc.value > (max?.value || 0) ? acc : max, null);
      
      if (largestAcc) {
        metrics.largestAccount = {
          name: largestAcc.account_name,
          value: largestAcc.value,
          institution: largestAcc.institution
        };
      }
    }
    
    metrics.totalInstitutionsCount = metrics.institutionBreakdown.length;
    metrics.avgAccountValue = metrics.totalValue / (accounts.length || 1);
    
    accounts.forEach(account => {
      metrics.totalInstitutions.add(account.institution || 'Other');
    });
    
    return metrics;
  };

  const handleRefreshAccounts = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetchWithAuth('/accounts/refresh', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh accounts');
      }
      
      await loadAllData();
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      setError(error.message || "Failed to refresh accounts");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAccountAdded = async () => {
    await loadAllData();
  };

  const getCurrentPeriodChange = () => {
    const periodMap = {
      '1d': accountsMetrics.periodChanges?.['1d'],
      '1w': accountsMetrics.periodChanges?.['1w'],
      '1m': accountsMetrics.periodChanges?.['1m'],
      'ytd': accountsMetrics.periodChanges?.['ytd']
    };
    return periodMap[selectedTimeframe] || accountsMetrics.periodChanges?.['1m'];
  };

  const currentPeriodChange = getCurrentPeriodChange();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Head>
        <title>Accounts Overview: NestEgg Portfolio</title>
        <meta name="description" content="Manage and view all your financial accounts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Subtle background gradient */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black opacity-50" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.header 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Accounts Overview: NestEgg Portfolio</h1>
              <p className="text-gray-400 text-sm flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Last updated: {accountsMetrics.lastUpdated ? new Date(accountsMetrics.lastUpdated).toLocaleString() : 'Never'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowValues(!showValues)}
                className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
                title={showValues ? "Hide balances" : "Show balances"}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefreshAccounts}
                className="flex items-center px-4 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              
              <AddAccountButton 
                onAccountAdded={handleAccountAdded}
                className="bg-green-600 hover:bg-green-700"
              />
            </div>
          </div>
        </motion.header>

        {/* Portfolio Summary */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-sm">Total Portfolio Value</p>
                  <div className="flex items-center gap-2">
                    {['1d', '1w', '1m', 'ytd'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedTimeframe(period)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectedTimeframe === period
                            ? 'bg-gray-700 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {period.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <motion.h2 
                  className="text-4xl font-bold mb-3"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {showValues ? formatCurrency(accountsMetrics.totalValue) : '••••••'}
                </motion.h2>
                
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <div className={`flex items-center ${currentPeriodChange?.percent_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {currentPeriodChange?.percent_change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="text-lg font-semibold">
                        {currentPeriodChange ? formatPercentage(currentPeriodChange.percent_change) : '0.00%'}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm">{selectedTimeframe}</span>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-gray-400 text-sm">Change:</span>
                    <span className={`text-lg font-semibold ${currentPeriodChange?.value_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {showValues && currentPeriodChange ? formatCurrency(currentPeriodChange.value_change) : '••••'}
                    </span>
                  </motion.div>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                  <div>
                    <p className="text-gray-500 text-xs">Cost Basis</p>
                    <p className="text-base font-semibold">
                      {showValues ? formatCurrency(accountsMetrics.totalCostBasis) : '••••'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Unrealized Gain</p>
                    <p className={`text-base font-semibold ${accountsMetrics.unrealizedGain > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {showValues ? formatCurrency(accountsMetrics.unrealizedGain) : '••••'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Annual Income</p>
                    <p className="text-base font-semibold text-blue-400">
                      {showValues ? formatCurrency(accountsMetrics.annualIncome) : '••••'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Yield</p>
                    <p className="text-base font-semibold text-purple-400">
                      {formatPercentage(accountsMetrics.yieldPercentage)}
                    </p>
                  </div>
                </motion.div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  {
                    icon: <Briefcase className="w-4 h-4 text-blue-400" />,
                    label: "Accounts",
                    value: accountsMetrics.totalAccounts
                  },
                  {
                    icon: <Building2 className="w-4 h-4 text-purple-400" />,
                    label: "Institutions with Balances",
                    value: accountsMetrics.totalInstitutionsCount
                  },
                  {
                    icon: <TrendingUp className="w-4 h-4 text-green-400" />,
                    label: "Avg Value",
                    value: showValues ? formatCurrency(accountsMetrics.avgAccountValue) : '••••'
                  },
                  {
                    icon: <Award className="w-4 h-4 text-orange-400" />,
                    label: "Largest",
                    value: showValues ? formatCurrency(accountsMetrics.largestAccount?.value) : '••••'
                  }
                ].map((stat, index) => (
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
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Accounts Table */}
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
            <AccountTable title="" onAccountsChanged={handleAccountAdded} />
          </div>
        </motion.section>

      {/* Divider */}
      <div className="border-t border-gray-700 my-8"></div>

        {/* DataStore Version */}
        <div>
          <div className="mb-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <h2 className="text-xl font-semibold text-green-400 mb-1">
              New: DataStore Implementation
            </h2>
            <p className="text-sm text-gray-400">
              Uses centralized DataStore with automatic caching and refresh
            </p>
          </div>
          <UnifiedAccountTable2 />
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* Top Positions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 xl:col-span-1"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-400" />
              Top Positions
            </h3>
            
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
              <div className="space-y-2">
                {accountsMetrics.topPositions?.slice(0, 5).map((position, index) => (
                  <motion.div
                    key={`${position.ticker}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredPosition(position.ticker)}
                    onMouseLeave={() => setHoveredPosition(null)}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{position.ticker}</h4>
                        <span className="text-xs text-gray-500">{position.quantity.toLocaleString()} shares</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{position.name}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold">{showValues ? formatCurrency(position.value) : '••••'}</p>
                      <p className={`text-xs flex items-center justify-end gap-1 ${position.gain_loss_percent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {position.gain_loss_percent > 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {formatPercentage(position.gain_loss_percent)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Institution Distribution */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-purple-400" />
              Institution Distribution
            </h3>
            
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
              <div className="space-y-3">
                {accountsMetrics.institutionBreakdown?.slice(0, 5).map((institution, index) => (
                  <motion.div
                    key={institution.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    onMouseEnter={() => setHoveredInstitution(institution.name)}
                    onMouseLeave={() => setHoveredInstitution(null)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{institution.name}</span>
                      <span className="text-sm text-gray-400">{formatPercentage(institution.percentage)}</span>
                    </div>
                    <div className="relative w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={`absolute top-0 left-0 h-full ${institution.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${institution.percentage}%` }}
                        transition={{ delay: 0.5 + index * 0.05, duration: 0.8, ease: "easeOut" }}
                      />
                      {hoveredInstitution === institution.name && (
                        <motion.div
                          className="absolute top-0 left-0 h-full bg-white/20"
                          initial={{ width: 0 }}
                          animate={{ width: `${institution.percentage}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{institution.accounts} accounts</span>
                      <span className="text-xs text-gray-400">{showValues ? formatCurrency(institution.value) : '••••'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Account Types */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2 text-blue-400" />
              Account Types
            </h3>
            
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
              <div className="grid grid-cols-2 gap-3">
                {accountsMetrics.accountTypeBreakdown?.slice(0, 6).map((type, index) => (
                  <motion.div
                    key={type.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredAccountType(type.name)}
                    onMouseLeave={() => setHoveredAccountType(null)}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div 
                        className={`p-1.5 rounded-md ${type.config.color}`}
                        animate={{ 
                          rotate: hoveredAccountType === type.name ? 360 : 0 
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        {type.config.icon}
                      </motion.div>
                      <span className="text-xs font-medium truncate">{type.name}</span>
                    </div>
                    <p className="text-sm font-bold">{formatPercentage(type.percentage)}</p>
                    <p className="text-xs text-gray-400">{type.accounts} accounts</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>

        {/* Additional Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Asset Allocation */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <BarChart2 className="w-5 h-5 mr-2 text-green-400" />
              Asset Allocation
            </h3>
            
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
              <div className="space-y-3">
                {Object.entries(accountsMetrics.assetAllocation || {}).map(([type, data], index) => (
                  <motion.div 
                    key={type}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm capitalize">{type}</span>
                      <span className="text-sm text-gray-400">{formatPercentage(data.percentage)}</span>
                    </div>
                    <div className="relative w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${data.percentage}%` }}
                        transition={{ delay: 0.7 + index * 0.05, duration: 0.8 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {showValues ? formatCurrency(data.value) : '••••'}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Sector Allocation */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-orange-400" />
              Top Sectors
            </h3>
            
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
              <div className="space-y-3">
                {Object.entries(accountsMetrics.sectorAllocation || {}).slice(0, 5).map(([sector, data], index) => (
                  <motion.div 
                    key={sector}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm capitalize">{sector}</span>
                      <span className="text-sm text-gray-400">{formatPercentage(data.percentage)}</span>
                    </div>
                    <div className="relative w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${data.percentage}%` }}
                        transition={{ delay: 0.7 + index * 0.05, duration: 0.8 }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {showValues ? formatCurrency(data.value) : '••••'}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {[
            {
              href: "/portfolio",
              title: "View Portfolio",
              description: "Complete financial picture",
              icon: <PieChartIcon className="w-5 h-5" />,
              color: "bg-indigo-600 hover:bg-indigo-700"
            },
            {
              href: "/positions",
              title: "View Positions",
              description: "Individual investments",
              icon: <BarChart2 className="w-5 h-5" />,
              color: "bg-purple-600 hover:bg-purple-700"
            }
          ].map((action, index) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <Link href={action.href}>
                <div className={`relative ${action.color} rounded-xl p-5 cursor-pointer transition-all overflow-hidden group`}>
                  <div className="relative z-10">
                    <div className="mb-3">{action.icon}</div>
                    <h4 className="text-lg font-semibold mb-1">{action.title}</h4>
                    <p className="text-white/80 text-sm">{action.description}</p>
                  </div>
                  
                  <motion.div
                    className="absolute inset-0 bg-white/10"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  <motion.div
                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ x: 5 }}
                  >
                    <ChevronRight className="w-5 h-5" />
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