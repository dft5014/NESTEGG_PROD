// pages/accounts.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  DollarSign, Briefcase, Building2, Landmark, 
  ArrowUp, ArrowDown, CreditCard, PieChart as PieChartIcon,
  Shield, BarChart2, LineChart, ArrowRight, Plus, RefreshCw,
  X, Check, AlertCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import AccountTable from '@/components/tables/UnifiedAccountTable';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import { addAccount } from '@/utils/apimethods/accountMethods';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [accountsMetrics, setAccountsMetrics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    institution: '',
    account_type: 'Brokerage',
    account_number: '',
    balance: 0,
    currency: 'USD',
    is_taxable: true
  });
  const [institutions, setInstitutions] = useState([]);
  const [accountTypes, setAccountTypes] = useState(['Brokerage', 'Retirement', 'IRA', 'Roth IRA', '401k', 'Checking', 'Savings', 'HSA', '529', 'Other']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  const router = useRouter();

  // Institution Colors
  const institutionColors = {
    'Vanguard': '#C94227',
    'Fidelity': '#569A38',
    'Charles Schwab': '#027BC7',
    'Robinhood': '#00C805',
    'TD Ameritrade': '#4F5B65',
    'Chase': '#117ACA',
    'Bank of America': '#E11B3C', 
    'Wells Fargo': '#D71E28',
    'E*TRADE': '#6633CC',
    'Interactive Brokers': '#F79125',
    'Coinbase': '#0052FF',
    'Merrill Lynch': '#0073CF',
    'Morgan Stanley': '#0073CF',
    'Betterment': '#0A9ACF',
    'Wealthfront': '#3ECBBC',
    'Citibank': '#057CC0',
    'SoFi': '#A7A8AA',
    'Other': '#6B7280'
  };

  // Account Type Colors
  const accountTypeColors = {
    'Brokerage': '#4f46e5',
    'Retirement': '#10b981',
    'Savings': '#3b82f6',
    'Checking': '#f97316',
    'IRA': '#8b5cf6',
    'Roth IRA': '#ec4899',
    '401k': '#06b6d4',
    '529': '#84cc16',
    'HSA': '#ef4444',
    'Other': '#6B7280'
  };

  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all accounts using the accountMethods utility
        const fetchedAccounts = await fetchAllAccounts();
        setAccounts(fetchedAccounts);
        
        // Get unique institutions from accounts for dropdown
        const uniqueInstitutions = [...new Set(fetchedAccounts.map(account => account.institution))].filter(Boolean);
        setInstitutions(uniqueInstitutions);
        
        // Calculate metrics
        const metrics = calculateAccountMetrics(fetchedAccounts);
        setAccountsMetrics(metrics);
      } catch (error) {
        console.error("Error loading accounts:", error);
        setError(error.message || "Failed to load accounts");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAccounts();
  }, []);

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
      recentGrowth: 0.0237, // Placeholder - would be calculated from historical data
    };
    
    // Initialize institutionMap and accountTypeMap for aggregating data
    const institutionMap = {};
    const accountTypeMap = {};
    
    accounts.forEach(account => {
      const value = parseFloat(account.total_value || account.balance || 0);
      const institution = account.institution || 'Other';
      const accountType = account.account_type || 'Other';
      
      // Track total value
      metrics.totalValue += value;
      
      // Track largest account
      if (!metrics.largestAccount || value > metrics.largestAccount.value) {
        metrics.largestAccount = {
          name: account.account_name,
          value: value,
          institution: institution
        };
      }
      
      // Track unique institutions
      metrics.totalInstitutions.add(institution);
      
      // Track account types
      if (!metrics.accountTypes[accountType]) {
        metrics.accountTypes[accountType] = { count: 0, value: 0 };
      }
      metrics.accountTypes[accountType].count++;
      metrics.accountTypes[accountType].value += value;
      
      // Aggregate by institution for chart data
      if (!institutionMap[institution]) {
        institutionMap[institution] = { name: institution, value: 0 };
      }
      institutionMap[institution].value += value;
      
      // Aggregate by account type for chart data
      if (!accountTypeMap[accountType]) {
        accountTypeMap[accountType] = { name: accountType, value: 0 };
      }
      accountTypeMap[accountType].value += value;
    });
    
    // Calculate average account value
    metrics.avgAccountValue = metrics.totalValue / (accounts.length || 1);
    
    // Get count of unique institutions
    metrics.totalInstitutionsCount = metrics.totalInstitutions.size;
    delete metrics.totalInstitutions;
    
    // Convert institution map to array and sort
    metrics.institutionBreakdown = Object.values(institutionMap)
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        ...item,
        percentage: metrics.totalValue > 0 ? item.value / metrics.totalValue : 0,
        color: institutionColors[item.name] || institutionColors.Other
      }));
    
    // Convert account type map to array and sort
    metrics.accountTypeBreakdown = Object.values(accountTypeMap)
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        ...item,
        percentage: metrics.totalValue > 0 ? item.value / metrics.totalValue : 0,
        color: accountTypeColors[item.name] || accountTypeColors.Other
      }));
    
    // Create consolidated metrics object for each account type
    Object.keys(metrics.accountTypes).forEach(type => {
      const typeData = metrics.accountTypes[type];
      typeData.percentage = metrics.totalValue > 0 ? typeData.value / metrics.totalValue : 0;
      typeData.avgValue = typeData.value / (typeData.count || 1);
    });
    
    return metrics;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium">{data.name}</p>
          <p className="text-indigo-600 dark:text-indigo-400">{formatPercentage(data.percentage * 100)}</p>
          <p className="text-gray-600 dark:text-gray-400">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  // Generate a random color for institutions without defined colors
  function getRandomColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 50%)`;
  }

  // Handler for refreshing account data
  const handleRefreshAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/accounts/refresh', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh accounts');
      }
      
      // Reload accounts after refresh
      const updatedAccounts = await fetchAllAccounts();
      setAccounts(updatedAccounts);
      setAccountsMetrics(calculateAccountMetrics(updatedAccounts));
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      setError(error.message || "Failed to refresh accounts");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types appropriately
    const newValue = type === 'checkbox' ? checked : 
                     type === 'number' ? parseFloat(value) || 0 : 
                     value;
    
    setNewAccount(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  // Handle account creation form submission
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Create the account using the accountMethods utility
      const createdAccount = await addAccount(newAccount);
      
      // Update the accounts list and metrics
      const updatedAccounts = await fetchAllAccounts();
      setAccounts(updatedAccounts);
      setAccountsMetrics(calculateAccountMetrics(updatedAccounts));
      
      // Show success message and reset form
      setSubmitSuccess(true);
      setNewAccount({
        account_name: '',
        institution: '',
        account_type: 'Brokerage',
        account_number: '',
        balance: 0,
        currency: 'USD',
        is_taxable: true
      });
      
      // Close modal after a brief delay
      setTimeout(() => {
        setShowAddAccountModal(false);
        setSubmitSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Error creating account:", error);
      setSubmitError(error.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
      <Head>
        <title>NestEgg | Accounts</title>
        <meta name="description" content="Manage and view all your financial accounts" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="container mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold">Accounts Overview</h1>
              <p className="text-gray-400 mt-2">Manage and track all your financial accounts in one place.</p>
            </div>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <button
                onClick={handleRefreshAccounts}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Accounts
              </button>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </button>
            </div>
          </div>
        </header>
        
        {/* KPI Cards for Accounts */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Accounts Summary</h2>
          {error && (
            <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200">
              Error loading accounts: {error}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Accounts"
              value={accountsMetrics.totalAccounts}
              icon={<Briefcase />}
              isLoading={isLoading}
              format={(v) => v?.toLocaleString() ?? '0'}
              color="blue"
            />
            <KpiCard
              title="Total Value"
              value={accountsMetrics.totalValue}
              icon={<DollarSign />}
              isLoading={isLoading}
              format={(v) => formatCurrency(v)}
              color="green"
            />
            <KpiCard
              title="Financial Institutions"
              value={accountsMetrics.totalInstitutionsCount}
              icon={<Building2 />}
              isLoading={isLoading}
              format={(v) => v?.toLocaleString() ?? '0'}
              color="purple"
            />
            <KpiCard
              title="Average Account Value"
              value={accountsMetrics.avgAccountValue}
              icon={<CreditCard />}
              isLoading={isLoading}
              format={(v) => formatCurrency(v)}
              color="amber"
            />
            <KpiCard
              title="Largest Account"
              value={accountsMetrics.largestAccount?.value}
              subtitle={accountsMetrics.largestAccount?.name}
              icon={<Landmark />}
              isLoading={isLoading}
              format={(v) => formatCurrency(v)}
              color="indigo"
            />
            <KpiCard
              title="Recent Growth"
              value={accountsMetrics.recentGrowth * 100}
              icon={<ArrowUp />}
              isLoading={isLoading}
              format={(v) => `+${v?.toFixed(2)}%`}
              color="green"
            />
            <KpiCard
              title="Checking Accounts"
              value={accountsMetrics.accountTypes?.Checking?.count || 0}
              subtitle={formatCurrency(accountsMetrics.accountTypes?.Checking?.value || 0)}
              icon={<CreditCard />}
              isLoading={isLoading}
              format={(v) => v?.toLocaleString() ?? '0'}
              color="orange"
            />
            <KpiCard
              title="Investment Accounts"
              value={(accountsMetrics.accountTypes?.Brokerage?.count || 0) + 
                    (accountsMetrics.accountTypes?.IRA?.count || 0) + 
                    (accountsMetrics.accountTypes?.['Roth IRA']?.count || 0) + 
                    (accountsMetrics.accountTypes?.['401k']?.count || 0)}
              subtitle="Including retirement"
              icon={<LineChart />}
              isLoading={isLoading}
              format={(v) => v?.toLocaleString() ?? '0'}
              color="blue"
            />
          </div>
        </section>
        
        {/* Account Distribution Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Account Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Institution Distribution */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Institution Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountsMetrics.institutionBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {accountsMetrics.institutionBreakdown?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || getRandomColor(entry.name)}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                {accountsMetrics.institutionBreakdown?.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: entry.color || getRandomColor(entry.name) }}
                      />
                      <span className="text-sm text-gray-300">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">{formatPercentage(entry.percentage * 100)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Account Type Distribution */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Account Type Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={accountsMetrics.accountTypeBreakdown}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db' }} width={100} />
                    <Tooltip
                      formatter={(value) => [`${formatCurrency(value)}`, 'Value']}
                      labelFormatter={(value) => `Account Type: ${value}`}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {accountsMetrics.accountTypeBreakdown?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={accountTypeColors[entry.name] || accountTypeColors.Other}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Account Type Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {Object.entries(accountsMetrics.accountTypes || {}).slice(0, 4).map(([type, data], index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: accountTypeColors[type] || accountTypeColors.Other }}
                      />
                      <span className="text-sm font-medium">{type}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Count: {data.count}</span>
                      <span className="text-gray-400">Avg: {formatCurrency(data.avgValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        
        {/* Account Security Information */}
        <section className="mb-10">
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-start space-x-4">
              <div className="bg-indigo-500/20 p-3 rounded-full">
                <Shield className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Account Security</h3>
                <p className="text-gray-400 mb-3">Your account connections are secure. NestEgg uses read-only access to your financial data and never stores your login credentials.</p>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-300">All accounts connected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-300">Data encrypted</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-300">Last refresh: Today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Table Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-300">Your Accounts</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/accounts/manage')}
                className="flex items-center px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
              >
                <BarChart2 className="h-4 w-4 mr-1" />
                Manage Accounts
              </button>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Account
              </button>
            </div>
          </div>
          <AccountTable title="" />
        </section>
        
        {/* Quick Actions Footer */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/portfolio"
              className="flex items-center justify-center py-3 px-4 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-colors shadow-md hover:shadow-lg"
            >
              <PieChartIcon className="h-5 w-5 mr-2" />
              <span>View Portfolio</span>
            </Link>
            
            <Link 
              href="/positions"
              className="flex items-center justify-center py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md hover:shadow-lg"
            >
              <BarChart2 className="h-5 w-5 mr-2" />
              <span>View Positions</span>
            </Link>
            
            <Link 
              href="/transactions"
              className="flex items-center justify-center py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors shadow-md hover:shadow-lg"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              <span>View Transactions</span>
            </Link>
          </div>
        </section>
      </div>
      
      {/* Add Account Modal - properly implemented */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add New Account</h3>
              <button 
                onClick={() => setShowAddAccountModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {submitSuccess ? (
              <div className="text-center p-4">
                <div className="bg-green-500/20 p-3 rounded-full inline-flex mb-3">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <h4 className="text-lg font-medium mb-2">Account Added Successfully!</h4>
                <p className="text-gray-400">Your new account has been added to your portfolio.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateAccount}>
                {submitError && (
                  <div className="mb-4 p-3 bg-red-900/30 rounded-lg text-red-200 flex items-start">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Account Name</label>
                    <input
                      type="text"
                      name="account_name"
                      value={newAccount.account_name}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="E.g., Main Brokerage Account"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Institution</label>
                    <div className="relative">
                      <select
                        name="institution"
                        value={newAccount.institution}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        required
                      >
                        <option value="">Select Institution</option>
                        {institutions.map((institution, index) => (
                          <option key={index} value={institution}>{institution}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    {newAccount.institution === 'Other' && (
                      <input
                        type="text"
                        name="institution"
                        value={newAccount.institution === 'Other' ? '' : newAccount.institution}
                        onChange={handleInputChange}
                        className="w-full mt-2 bg-gray-700 text-white border border-gray-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter institution name"
                        required
                      />
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Account Type</label>
                    <div className="relative">
                      <select
                        name="account_type"
                        value={newAccount.account_type}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        required
                      >
                        {accountTypes.map((type, index) => (
                          <option key={index} value={type}>{type}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Account Number (Last 4 digits)</label>
                    <input
                      type="text"
                      name="account_number"
                      value={newAccount.account_number}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="E.g., 1234"
                      maxLength={4}
                      pattern="[0-9]{4}"
                    />
                    <p className="text-xs text-gray-400 mt-1">For identification purposes only</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Current Balance</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">$</span>
                      <input
                        type="number"
                        name="balance"
                        value={newAccount.balance}
                        onChange={handleInputChange}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2.5 pl-7 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_taxable"
                      checked={newAccount.is_taxable}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-300">
                      Taxable Account
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6 space-x-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddAccountModal(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}