import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { 
  DollarSign, Briefcase, Building2, Landmark, 
  ArrowUp, CreditCard, PieChart as PieChartIcon,
  Shield, BarChart2, LineChart, Plus, RefreshCw,
  TrendingUp, TrendingDown, Zap, Sparkles, ChevronRight,
  Activity, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Wallet, PiggyBank, Target, Award, Info, Calendar,
  Clock, Star, AlertCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

// Dynamic imports to avoid SSR issues
const UnifiedAccountTable2 = dynamic(
  () => import('@/components/tables/UnifiedAccountTable2'),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[200px] flex items-center justify-center">
        <div>
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-400" />
          <p className="text-gray-400">Loading account table...</p>
        </div>
      </div>
    )
  }
);

// Client-side data component to avoid SSR issues
const AccountDataComponent = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-gray-300">Loading account analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return children;
};

export default function AccountsPage() {
  return (
    <AccountDataComponent>
      <AccountsPageContent />
    </AccountDataComponent>
  );
}

function AccountsPageContent() {
  // Lazy load hooks to avoid SSR issues
  const [hooks, setHooks] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadHooks = async () => {
      try {
        const { useAccounts } = await import('@/store/hooks/useAccounts');
        const { usePortfolioSummary } = await import('@/store/hooks/usePortfolioSummary');
        setHooks({ useAccounts, usePortfolioSummary });
      } catch (error) {
        console.error('Error loading hooks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHooks();
  }, []);
  
  // Use hooks only when available
  const accountsHook = hooks?.useAccounts ? hooks.useAccounts() : {
    accounts: [],
    summary: null,
    loading: true,
    error: null,
    refresh: () => {}
  };
  
  const portfolioHook = hooks?.usePortfolioSummary ? hooks.usePortfolioSummary() : {
    summary: null,
    institutionAllocation: [],
    loading: true,
    error: null,
    refresh: () => {}
  };
  
  const { 
    accounts, 
    summary: accountsSummary, 
    loading: accountsLoading, 
    error: accountsError, 
    refresh: refreshAccounts 
  } = accountsHook;
  
  const { 
    summary: portfolioData,
    institutionAllocation,
    loading: summaryLoading, 
    error: summaryError,
    refresh: refreshSummary 
  } = portfolioHook;

  // Local state
  const [showValues, setShowValues] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const router = useRouter();

  // Combined loading/error states
  const combinedLoading = isLoading || accountsLoading || summaryLoading;
  const error = accountsError || summaryError;

  // Process accounts metrics from Data Store
  const accountsMetrics = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return {
        totalAccounts: 0,
        activeAccounts: 0,
        totalValue: 0,
        avgAccountValue: 0,
        liquidValue: 0,
        illiquidValue: 0,
        topInstitution: null
      };
    }

    const totalValue = accounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
    const activeAccounts = accounts.filter(acc => (acc.totalValue || 0) > 0);
    const liquidAccounts = accounts.filter(acc => acc.category !== 'other_assets');
    const illiquidAccounts = accounts.filter(acc => acc.category === 'other_assets');
    
    // Institution analysis
    const byInstitution = accounts.reduce((acc, account) => {
      const inst = account.institution || 'Other';
      if (!acc[inst]) {
        acc[inst] = { count: 0, totalValue: 0 };
      }
      acc[inst].count += 1;
      acc[inst].totalValue += account.totalValue || 0;
      return acc;
    }, {});

    const topInstitution = Object.entries(byInstitution)
      .sort(([,a], [,b]) => b.totalValue - a.totalValue)[0];

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      totalValue,
      avgAccountValue: accounts.length > 0 ? totalValue / accounts.length : 0,
      liquidValue: liquidAccounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0),
      illiquidValue: illiquidAccounts.reduce((sum, acc) => sum + (acc.totalValue || 0), 0),
      topInstitution: topInstitution ? { name: topInstitution[0], ...topInstitution[1] } : null,
      institutionBreakdown: byInstitution
    };
  }, [accounts]);

  // Performance metrics from portfolio data
  const performanceMetrics = useMemo(() => {
    if (!portfolioData?.performance) {
      return { '1d': 0, '1w': 0, '1m': 0, 'ytd': 0 };
    }

    return {
      '1d': portfolioData.performance['1d']?.totalAssetsPercent || 0,
      '1w': portfolioData.performance['1w']?.totalAssetsPercent || 0, 
      '1m': portfolioData.performance['1m']?.totalAssetsPercent || 0,
      'ytd': portfolioData.performance['ytd']?.totalAssetsPercent || 0
    };
  }, [portfolioData]);

  // Institution allocation chart data
  const institutionChartData = useMemo(() => {
    if (!institutionAllocation || institutionAllocation.length === 0) {
      // Fallback to processing from accounts if portfolio summary doesn't have it
      if (accountsMetrics.institutionBreakdown) {
        return Object.entries(accountsMetrics.institutionBreakdown)
          .map(([name, data]) => ({
            name: name.length > 15 ? name.substring(0, 15) + '...' : name,
            value: data.totalValue,
            percentage: accountsMetrics.totalValue > 0 ? (data.totalValue / accountsMetrics.totalValue) * 100 : 0
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8); // Top 8 institutions
      }
      return [];
    }

    return institutionAllocation
      .slice(0, 8) // Top 8 institutions
      .map(item => ({
        name: (item.institution || item.name || 'Unknown').length > 15 
          ? (item.institution || item.name || 'Unknown').substring(0, 15) + '...' 
          : (item.institution || item.name || 'Unknown'),
        value: item.value || 0,
        percentage: item.percentage || 0
      }));
  }, [institutionAllocation, accountsMetrics]);

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshAccounts(true),
        refreshSummary(true)
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh on mount
  useEffect(() => {
    if (!combinedLoading && accounts.length === 0 && hooks) {
      handleRefresh();
    }
  }, [hooks]);

  const getPerformanceColor = (value) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  const getPerformanceIcon = (value) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  if (combinedLoading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-gray-300">Loading account analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
              <p className="text-red-300 mb-4">Error loading data: {error}</p>
              <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Accounts - NestEgg Portfolio</title>
        <meta name="description" content="Account-level portfolio analytics and management" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <Briefcase className="w-8 h-8 mr-3 text-blue-400" />
                Account Analytics
              </h1>
              <p className="text-gray-300">
                Portfolio-level insights across your financial institutions
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <button
                onClick={() => setShowValues(!showValues)}
                className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors"
                title={showValues ? "Hide values" : "Show values"}
              >
                {showValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KpiCard
              title="Total Accounts"
              value={accountsMetrics.totalAccounts}
              icon={<Briefcase className="w-6 h-6" />}
              format="number"
              showValue={showValues}
            />
            
            <KpiCard
              title="Active Accounts"
              value={accountsMetrics.activeAccounts}
              subtitle={`${((accountsMetrics.activeAccounts / Math.max(accountsMetrics.totalAccounts, 1)) * 100).toFixed(0)}% active`}
              icon={<Activity className="w-6 h-6" />}
              format="number"
              showValue={showValues}
            />
            
            <KpiCard
              title="Average Account Size"
              value={accountsMetrics.avgAccountValue}
              icon={<Target className="w-6 h-6" />}
              format="currency"
              showValue={showValues}
            />
            
            <KpiCard
              title="Largest Institution"
              value={accountsMetrics.topInstitution?.totalValue || 0}
              subtitle={accountsMetrics.topInstitution?.name || 'N/A'}
              icon={<Building2 className="w-6 h-6" />}
              format="currency"
              showValue={showValues}
            />
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <LineChart className="w-5 h-5 mr-2 text-blue-400" />
              Aggregate Performance Trends
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(performanceMetrics).map(([period, value]) => (
                <div key={period} className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400 uppercase font-medium">
                      {period === 'ytd' ? 'YTD' : period.toUpperCase()}
                    </span>
                    <div className={getPerformanceColor(value)}>
                      {getPerformanceIcon(value)}
                    </div>
                  </div>
                  
                  <div className={`text-lg font-bold ${getPerformanceColor(value)}`}>
                    {showValues ? (
                      `${value >= 0 ? '+' : ''}${formatPercentage(value / 100)}`
                    ) : (
                      '••••'
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institution Mix Chart */}
          {institutionChartData.length > 0 && (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-blue-400" />
                Institution Mix
              </h2>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={institutionChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      type="number" 
                      stroke="#9CA3AF"
                      tickFormatter={(value) => showValues ? formatCurrency(value) : '•••'}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      width={120}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        showValues ? formatCurrency(value) : '•••••',
                        'Value'
                      ]}
                      labelFormatter={(label) => `Institution: ${label}`}
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#3B82F6"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 text-sm text-gray-400">
                Showing top {institutionChartData.length} institutions by account value
              </div>
            </div>
          )}

          {/* Detailed Account Table */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <BarChart2 className="w-5 h-5 mr-2 text-blue-400" />
                Account Details
              </h2>
              
              <div className="text-sm text-gray-400">
                {accounts.length} total accounts
              </div>
            </div>
            
            <UnifiedAccountTable2 
              initialSort="value-high"
              title=""
              onDataChanged={handleRefresh}
            />
          </div>
        </div>
      </div>
    </>
  );
}