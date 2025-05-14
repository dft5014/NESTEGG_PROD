// pages/accounts.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  DollarSign, Briefcase, Building2, Landmark, 
  ArrowUp, CreditCard, PieChart as PieChartIcon,
  Shield, BarChart2, LineChart, Plus, RefreshCw
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
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

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  // Function to load accounts data
  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all accounts using the accountMethods utility
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
      
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
      await loadAccounts();
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      setError(error.message || "Failed to refresh accounts");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for when an account is added
  const handleAccountAdded = async () => {
    await loadAccounts();
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
              
              {/* Using AddAccountButton component */}
              <AddAccountButton 
                onAccountAdded={handleAccountAdded}
                className="bg-green-600 hover:bg-green-700 rounded-lg"
              />
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
              
              {/* Second instance of AddAccountButton with different styling */}
              <AddAccountButton 
                onAccountAdded={handleAccountAdded}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg"
              />
            </div>
          </div>
          <AccountTable 
            title="" 
            onAccountsChanged={handleAccountAdded}
          />
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
    </div>
  );
}