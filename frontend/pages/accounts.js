import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  DollarSign, Briefcase, Building2, Landmark, 
  ArrowUp, CreditCard, PieChart as PieChartIcon,
  Shield, BarChart2, LineChart, Plus, RefreshCw,
  TrendingUp, TrendingDown, Zap, Sparkles, ChevronRight,
  Activity, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Wallet, PiggyBank, Target, Award, Info
} from 'lucide-react';
import KpiCard from '@/components/ui/KpiCard';
import AccountTable from '@/components/tables/UnifiedAccountTable';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import AddAccountButton from '@/components/AddAccountButton';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountsMetrics, setAccountsMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('grid');
  const [showValues, setShowValues] = useState(true);
  const [hoveredInstitution, setHoveredInstitution] = useState(null);
  const [hoveredAccountType, setHoveredAccountType] = useState(null);
  const containerRef = useRef(null);
  
  const router = useRouter();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const headerY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Institution Colors with gradients
  const institutionGradients = {
    'Vanguard': 'from-red-500 to-red-700',
    'Fidelity': 'from-green-500 to-green-700',
    'Charles Schwab': 'from-blue-500 to-blue-700',
    'Robinhood': 'from-emerald-400 to-green-600',
    'TD Ameritrade': 'from-gray-600 to-gray-800',
    'Chase': 'from-blue-600 to-blue-800',
    'Bank of America': 'from-red-600 to-red-800',
    'Wells Fargo': 'from-red-500 to-red-700',
    'E*TRADE': 'from-purple-500 to-purple-700',
    'Interactive Brokers': 'from-orange-500 to-orange-700',
    'Coinbase': 'from-blue-600 to-indigo-700',
    'Other': 'from-gray-500 to-gray-700'
  };

  // Account Type Icons and Gradients
  const accountTypeConfig = {
    'Brokerage': { icon: <LineChart className="w-5 h-5" />, gradient: 'from-indigo-500 to-purple-600' },
    'Retirement': { icon: <PiggyBank className="w-5 h-5" />, gradient: 'from-emerald-500 to-teal-600' },
    'Savings': { icon: <Wallet className="w-5 h-5" />, gradient: 'from-blue-500 to-cyan-600' },
    'Checking': { icon: <CreditCard className="w-5 h-5" />, gradient: 'from-orange-500 to-red-600' },
    'IRA': { icon: <Shield className="w-5 h-5" />, gradient: 'from-purple-500 to-pink-600' },
    'Roth IRA': { icon: <Award className="w-5 h-5" />, gradient: 'from-pink-500 to-rose-600' },
    '401k': { icon: <Target className="w-5 h-5" />, gradient: 'from-cyan-500 to-blue-600' },
    '529': { icon: <Briefcase className="w-5 h-5" />, gradient: 'from-lime-500 to-green-600' },
    'HSA': { icon: <Activity className="w-5 h-5" />, gradient: 'from-red-500 to-pink-600' },
    'Other': { icon: <Zap className="w-5 h-5" />, gradient: 'from-gray-500 to-gray-700' }
  };

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Function to load accounts data
  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
      
      const metrics = calculateAccountMetrics(fetchedAccounts);
      setAccountsMetrics(metrics);
    } catch (error) {
      console.error("Error loading accounts:", error);
      setError(error.message || "Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate account metrics
  const calculateAccountMetrics = (accounts) => {
    const metrics = {
      totalAccounts: accounts.length,
      totalValue: 0,
      largestAccount: null,
      avgAccountValue: 0,
      totalInstitutions: new Set(),
      accountTypes: {},
      institutionBreakdown: [],
      accountTypeBreakdown: [],
      recentGrowth: 0.0237,
      monthlyGrowth: 0.0854,
      yearlyGrowth: 0.1247,
    };
    
    const institutionMap = {};
    const accountTypeMap = {};
    
    accounts.forEach(account => {
      const value = parseFloat(account.total_value || account.balance || 0);
      const institution = account.institution || 'Other';
      const accountType = account.account_type || 'Other';
      
      metrics.totalValue += value;
      
      if (!metrics.largestAccount || value > metrics.largestAccount.value) {
        metrics.largestAccount = {
          name: account.account_name,
          value: value,
          institution: institution
        };
      }
      
      metrics.totalInstitutions.add(institution);
      
      if (!metrics.accountTypes[accountType]) {
        metrics.accountTypes[accountType] = { count: 0, value: 0 };
      }
      metrics.accountTypes[accountType].count++;
      metrics.accountTypes[accountType].value += value;
      
      if (!institutionMap[institution]) {
        institutionMap[institution] = { name: institution, value: 0, accounts: 0 };
      }
      institutionMap[institution].value += value;
      institutionMap[institution].accounts++;
      
      if (!accountTypeMap[accountType]) {
        accountTypeMap[accountType] = { name: accountType, value: 0, accounts: 0 };
      }
      accountTypeMap[accountType].value += value;
      accountTypeMap[accountType].accounts++;
    });
    
    metrics.avgAccountValue = metrics.totalValue / (accounts.length || 1);
    metrics.totalInstitutionsCount = metrics.totalInstitutions.size;
    delete metrics.totalInstitutions;
    
    metrics.institutionBreakdown = Object.values(institutionMap)
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        ...item,
        percentage: metrics.totalValue > 0 ? item.value / metrics.totalValue : 0,
        gradient: institutionGradients[item.name] || institutionGradients.Other
      }));
    
    metrics.accountTypeBreakdown = Object.values(accountTypeMap)
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        ...item,
        percentage: metrics.totalValue > 0 ? item.value / metrics.totalValue : 0,
        config: accountTypeConfig[item.name] || accountTypeConfig.Other
      }));
    
    Object.keys(metrics.accountTypes).forEach(type => {
      const typeData = metrics.accountTypes[type];
      typeData.percentage = metrics.totalValue > 0 ? typeData.value / metrics.totalValue : 0;
      typeData.avgValue = typeData.value / (typeData.count || 1);
    });
    
    return metrics;
  };

  const handleRefreshAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/accounts/refresh', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh accounts');
      }
      
      await loadAccounts();
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      setError(error.message || "Failed to refresh accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountAdded = async () => {
    await loadAccounts();
  };

  // 3D Card component
  const Card3D = ({ children, className = "" }) => {
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      setRotateX(rotateX);
      setRotateY(rotateY);
    };

    const handleMouseLeave = () => {
      setRotateX(0);
      setRotateY(0);
    };

    return (
      <motion.div
        ref={cardRef}
        className={`relative ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transformStyle: "preserve-3d",
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    );
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-white overflow-hidden">
      <Head>
        <title>NestEgg | Accounts</title>
        <meta name="description" content="Manage and view all your financial accounts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <motion.div
          className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -150, 0],
            y: [0, 150, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
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
                className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
              >
                Accounts
              </motion.h1>
              <motion.p 
                className="text-gray-400 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Your financial command center
              </motion.p>
            </div>
            <motion.div 
              className="flex items-center space-x-4 mt-6 md:mt-0"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
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
                onClick={handleRefreshAccounts}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
                disabled={isLoading}
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
              
              <AddAccountButton 
                onAccountAdded={handleAccountAdded}
                className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
              />
            </motion.div>
          </motion.div>
        </motion.header>

        {/* Total Portfolio Value Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <Card3D className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <p className="text-gray-400 mb-2">Total Portfolio Value</p>
                <motion.h2 
                  className="text-5xl md:text-7xl font-bold mb-4"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                >
                  {showValues ? formatCurrency(accountsMetrics.totalValue) : '••••••'}
                </motion.h2>
                <div className="flex items-center space-x-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center space-x-2"
                  >
                    <div className={`flex items-center ${accountsMetrics.recentGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {accountsMetrics.recentGrowth > 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                      <span className="text-2xl font-semibold">{formatPercentage(accountsMetrics.recentGrowth * 100)}</span>
                    </div>
                    <span className="text-gray-400">today</span>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-center space-x-2"
                  >
                    <span className="text-gray-400">Month:</span>
                    <span className={`text-xl font-semibold ${accountsMetrics.monthlyGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(accountsMetrics.monthlyGrowth * 100)}
                    </span>
                  </motion.div>
                </div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, type: "spring" }}
                className="mt-6 md:mt-0"
              >
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="16"
                      fill="none"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="url(#gradient)"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - accountsMetrics.yearlyGrowth) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{formatPercentage(accountsMetrics.yearlyGrowth * 100)}</span>
                    <span className="text-xs text-gray-400">YTD</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </Card3D>
        </motion.section>

        {/* Key Metrics Grid */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {[
            {
              title: "Total Accounts",
              value: accountsMetrics.totalAccounts,
              icon: <Briefcase className="w-6 h-6" />,
              gradient: "from-blue-500 to-cyan-500",
              format: (v) => v?.toLocaleString() ?? '0'
            },
            {
              title: "Institutions",
              value: accountsMetrics.totalInstitutionsCount,
              icon: <Building2 className="w-6 h-6" />,
              gradient: "from-purple-500 to-pink-500",
              format: (v) => v?.toLocaleString() ?? '0'
            },
            {
              title: "Average Value",
              value: accountsMetrics.avgAccountValue,
              icon: <TrendingUp className="w-6 h-6" />,
              gradient: "from-green-500 to-emerald-500",
              format: (v) => showValues ? formatCurrency(v) : '••••'
            },
            {
              title: "Largest Account",
              value: accountsMetrics.largestAccount?.value,
              subtitle: accountsMetrics.largestAccount?.name,
              icon: <Award className="w-6 h-6" />,
              gradient: "from-orange-500 to-red-500",
              format: (v) => showValues ? formatCurrency(v) : '••••'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <Card3D className="h-full">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 h-full hover:bg-white/10 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.gradient} shadow-lg`}>
                      {metric.icon}
                    </div>
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
              </Card3D>
            </motion.div>
          ))}
        </motion.section>

        {/* Institution Distribution */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-yellow-400" />
            Institution Distribution
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Institution Cards */}
            <div className="space-y-4">
              {accountsMetrics.institutionBreakdown?.slice(0, 5).map((institution, index) => (
                <motion.div
                  key={institution.name}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  onHoverStart={() => setHoveredInstitution(institution.name)}
                  onHoverEnd={() => setHoveredInstitution(null)}
                  className="relative"
                >
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold">{institution.name}</h4>
                        <span className="text-2xl font-bold">{formatPercentage(institution.percentage * 100)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{showValues ? formatCurrency(institution.value) : '••••'}</span>
                        <span>{institution.accounts} accounts</span>
                      </div>
                    </div>
                    
                    {/* Animated background */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${institution.gradient} opacity-20`}
                      initial={{ x: '-100%' }}
                      animate={{ x: hoveredInstitution === institution.name ? '0%' : '-100%' }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    {/* Progress bar */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: institution.percentage }}
                      transition={{ delay: 1 + index * 0.1, duration: 0.8, ease: "easeOut" }}
                      style={{ originX: 0 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Visual Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="relative h-[400px] flex items-center justify-center"
            >
              <div className="relative w-full h-full">
                {accountsMetrics.institutionBreakdown?.map((institution, index) => {
                  const startAngle = accountsMetrics.institutionBreakdown
                    .slice(0, index)
                    .reduce((sum, inst) => sum + inst.percentage * 360, 0);
                  const endAngle = startAngle + institution.percentage * 360;
                  
                  return (
                    <motion.div
                      key={institution.name}
                      className="absolute inset-0"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.3 + index * 0.1, type: "spring" }}
                    >
                      <svg className="w-full h-full" viewBox="0 0 200 200">
                        <motion.path
                          d={describeArc(100, 100, 80, startAngle, endAngle)}
                          fill="none"
                          stroke={`url(#gradient-${index})`}
                          strokeWidth="30"
                          whileHover={{ strokeWidth: 35 }}
                          style={{ cursor: 'pointer' }}
                          onHoverStart={() => setHoveredInstitution(institution.name)}
                          onHoverEnd={() => setHoveredInstitution(null)}
                        />
                        <defs>
                          <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={getGradientColors(institution.gradient)[0]} />
                            <stop offset="100%" stopColor={getGradientColors(institution.gradient)[1]} />
                          </linearGradient>
                        </defs>
                      </svg>
                    </motion.div>
                  );
                })}
                
                {/* Center info */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.5 }}
                      className="text-4xl font-bold"
                    >
                      {accountsMetrics.totalInstitutionsCount}
                    </motion.p>
                    <p className="text-gray-400">Institutions</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Account Types */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mb-12"
        >
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <PieChartIcon className="w-6 h-6 mr-2 text-purple-400" />
            Account Types
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {accountsMetrics.accountTypeBreakdown?.map((type, index) => (
              <motion.div
                key={type.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1 + index * 0.1, type: "spring" }}
                whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
                onHoverStart={() => setHoveredAccountType(type.name)}
                onHoverEnd={() => setHoveredAccountType(null)}
                className="relative"
              >
                <Card3D>
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-center hover:bg-white/10 transition-all">
                    <motion.div
                      className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${type.config.gradient} mb-4 shadow-lg`}
                      animate={{
                        scale: hoveredAccountType === type.name ? 1.1 : 1,
                        rotate: hoveredAccountType === type.name ? 360 : 0
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      {type.config.icon}
                    </motion.div>
                    <h4 className="font-semibold mb-1">{type.name}</h4>
                    <p className="text-2xl font-bold mb-1">{formatPercentage(type.percentage * 100)}</p>
                    <p className="text-sm text-gray-400">{showValues ? formatCurrency(type.value) : '••••'}</p>
                    <p className="text-xs text-gray-500">{type.accounts} accounts</p>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Security Banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mb-12"
        >
          <Card3D>
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-xl rounded-3xl p-8 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-6">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg shadow-green-500/30"
                  >
                    <Shield className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Bank-Level Security</h3>
                    <p className="text-gray-300 mb-4 max-w-2xl">
                      Your financial data is protected with military-grade encryption. We use read-only access and never store your credentials.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {['256-bit Encryption', 'Read-Only Access', 'Daily Backups', 'SOC 2 Compliant'].map((feature, index) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.4 + index * 0.1 }}
                          className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full"
                        >
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-sm">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="hidden lg:block"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 blur-3xl" />
                    <Shield className="w-24 h-24 text-green-400 relative" />
                  </div>
                </motion.div>
              </div>
            </div>
          </Card3D>
        </motion.section>

        {/* Accounts Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold flex items-center">
              <Wallet className="w-6 h-6 mr-2 text-blue-400" />
              All Accounts
            </h3>
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedView(selectedView === 'grid' ? 'table' : 'grid')}
                className="p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/20 transition-all"
              >
                {selectedView === 'grid' ? <BarChart2 className="w-5 h-5" /> : <PieChartIcon className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <AccountTable title="" onAccountsChanged={handleAccountAdded} />
          </div>
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
              title: "View Portfolio",
              description: "See your complete financial picture",
              icon: <PieChartIcon className="w-6 h-6" />,
              gradient: "from-indigo-600 to-blue-600"
            },
            {
              href: "/positions",
              title: "View Positions",
              description: "Analyze individual investments",
              icon: <BarChart2 className="w-6 h-6" />,
              gradient: "from-purple-600 to-pink-600"
            },
            {
              href: "/transactions",
              title: "View Transactions",
              description: "Track your financial activity",
              icon: <DollarSign className="w-6 h-6" />,
              gradient: "from-emerald-600 to-teal-600"
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
                <Card3D className="h-full">
                  <div className={`relative bg-gradient-to-r ${action.gradient} rounded-2xl p-6 h-full group cursor-pointer overflow-hidden`}>
                    <div className="relative z-10">
                      <div className="mb-4">{action.icon}</div>
                      <h4 className="text-xl font-bold mb-2">{action.title}</h4>
                      <p className="text-white/80 text-sm">{action.description}</p>
                    </div>
                    
                    <motion.div
                      className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                      animate={{
                        x: [0, 20, 0],
                        y: [0, -20, 0],
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                    
                    <motion.div
                      className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      whileHover={{ x: 5 }}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </motion.div>
                  </div>
                </Card3D>
              </Link>
            </motion.div>
          ))}
        </motion.section>
      </div>
    </div>
  );
}

// Helper functions
function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function getGradientColors(gradientClass) {
  const colorMap = {
    'from-red-500 to-red-700': ['#ef4444', '#b91c1c'],
    'from-green-500 to-green-700': ['#10b981', '#047857'],
    'from-blue-500 to-blue-700': ['#3b82f6', '#1e40af'],
    'from-emerald-400 to-green-600': ['#34d399', '#16a34a'],
    'from-gray-600 to-gray-800': ['#4b5563', '#1f2937'],
    'from-blue-600 to-blue-800': ['#2563eb', '#1e3a8a'],
    'from-red-600 to-red-800': ['#dc2626', '#991b1b'],
    'from-purple-500 to-purple-700': ['#8b5cf6', '#6b21a8'],
    'from-orange-500 to-orange-700': ['#f97316', '#c2410c'],
    'from-blue-600 to-indigo-700': ['#2563eb', '#4338ca'],
    'from-gray-500 to-gray-700': ['#6b7280', '#374151'],
  };
  return colorMap[gradientClass] || ['#6b7280', '#374151'];
}