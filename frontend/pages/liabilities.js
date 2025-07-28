import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, Percent,
  Target, Flame, RefreshCw, Eye, EyeOff,
  Activity, BarChart3, Layers
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import UnifiedGroupPositionsTable2 from '@/components/tables/UnifiedGroupPositionsTable2';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

// DataStore hooks - no API methods!
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';

export default function PositionsPage() {
  const [showValues, setShowValues] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');

  // Get data from the store - no API calls!
  const { 
    positions, 
    summary: groupedSummary, 
    metrics,
    loading: positionsLoading, 
    error: positionsError, 
    refreshData: refreshPositions 
  } = useGroupedPositions();

  const { 
    summary: portfolioData,
    topPerformersPercent,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary
  } = usePortfolioSummary();

  // Get trend data
  const { trends, getPeriodData = () => ({ data: [] }) } = usePortfolioTrends() || {};

  // Combine loading states
  const isLoading = positionsLoading || summaryLoading;
  const isRefreshing = isLoading;

  // Calculate position metrics from store data
  const positionMetrics = {
    totalValue: portfolioData?.liquidAssets || 0,
    totalGainLoss: portfolioData?.liquidUnrealizedGain || 0,
    totalGainLossPercent: portfolioData?.liquidUnrealizedGainPercent || 0,
    largestPosition: positions?.[0] || null,
    mostProfitablePosition: topPerformersPercent?.[0] || null,
    positionCount: positions?.length || 0,
    totalIncome: portfolioData?.income?.annual || 0,
    incomeYield: portfolioData?.income?.yieldLiquid || 0
  };

  // Process chart data
  const chartData = useMemo(() => {
    // Add safety check for getPeriodData function
    if (!getPeriodData || typeof getPeriodData !== 'function') {
      return [];
    }
    
    const periodData = getPeriodData(selectedTimeframe);
    if (!periodData || !periodData.data) return [];
    
    return periodData.data.map(point => ({
      date: new Date(point.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      value: point.liquidAssets || point.value || 0
    }));
  }, [trends, selectedTimeframe, getPeriodData]);

  // Calculate change percentage
  const changePercent = useMemo(() => {
    if (!chartData || chartData.length < 2) return 0;
    const firstValue = chartData[0]?.value || 0;
    const lastValue = chartData[chartData.length - 1]?.value || 0;
    return firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  }, [chartData]);

  const changeAmount = useMemo(() => {
    if (!chartData || chartData.length < 2) return 0;
    const firstValue = chartData[0]?.value || 0;
    const lastValue = chartData[chartData.length - 1]?.value || 0;
    return lastValue - firstValue;
  }, [chartData]);

  // Refresh all data
  const handleRefreshPositions = async () => {
    try {
      await Promise.all([
        refreshPositions(),
        refreshSummary()
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const timeframeOptions = [
    { id: '1d', label: '1D' },
    { id: '1w', label: '1W' },
    { id: '1m', label: '1M' },
    { id: 'ytd', label: 'YTD' }
  ];

  return (
    <>
      <Head>
        <title>Positions - NestEgg</title>
        <meta name="description" content="View and manage your investment positions" />
      </Head>

      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Clean Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Positions</h1>
                <p className="text-gray-400">Monitor and manage your investment holdings</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowValues(!showValues)}
                  className="relative p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
                  aria-label={showValues ? "Hide values" : "Show values"}
                >
                  {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefreshPositions}
                  className="flex items-center px-4 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
              </div>
            </div>
          </header>

          {/* Portfolio Dashboard Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Chart Section - Takes up 2 columns */}
            <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Portfolio Value</p>
                  <h2 className="text-3xl font-bold">
                    {showValues ? formatCurrency(positionMetrics.totalValue) : '••••••••'}
                  </h2>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({selectedTimeframe.toUpperCase()}) Change: {showValues ? formatCurrency(Math.abs(changeAmount)) : '••••'}
                    </span>
                  </div>
                </div>
                
                {/* Timeframe Selector */}
                <div className="flex space-x-1">
                  {timeframeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedTimeframe(option.id)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        selectedTimeframe === option.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => showValues ? `$${(value / 1000).toFixed(0)}k` : ''}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '0.5rem'
                      }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(value) => showValues ? formatCurrency(value) : '••••'}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KPI Cards Section - Takes up 1 column */}
            <div className="space-y-4">
              {/* Total Gain/Loss Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Gain/Loss</p>
                  <div className={`p-1.5 rounded-lg ${positionMetrics.totalGainLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {positionMetrics.totalGainLoss >= 0 ? 
                      <TrendingUp className="w-4 h-4 text-green-400" /> : 
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    }
                  </div>
                </div>
                <p className={`text-2xl font-bold ${positionMetrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {showValues ? formatCurrency(positionMetrics.totalGainLoss) : '••••••'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatPercentage(positionMetrics.totalGainLossPercent / 100)} return
                </p>
              </motion.div>

              {/* Income & Yield Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-400 text-sm">Income & Yield</p>
                  <div className="p-1.5 rounded-lg bg-yellow-500/10">
                    <Activity className="w-4 h-4 text-yellow-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-yellow-400">
                  {showValues ? formatCurrency(positionMetrics.totalIncome) : '••••••'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatPercentage(positionMetrics.incomeYield / 100)} yield
                </p>
              </motion.div>

              {/* Positions Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-gray-400 text-sm">Positions</p>
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Layers className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {positionMetrics.positionCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {positionMetrics.positionCount} visible
                </p>
              </motion.div>
            </div>
          </div>

          {/* Additional KPI Boxes */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: "Total Value",
                value: positionMetrics.totalValue,
                icon: <DollarSign className="w-5 h-5" />,
                color: "text-blue-400",
                bgColor: "bg-blue-500/10",
                format: (v) => showValues ? formatCurrency(v) : '••••',
                subtitle: `${positionMetrics.positionCount} positions`
              },
              {
                title: "Total Gain/Loss",
                value: positionMetrics.totalGainLoss,
                icon: positionMetrics.totalGainLoss >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
                color: positionMetrics.totalGainLoss >= 0 ? "text-green-400" : "text-red-400",
                bgColor: positionMetrics.totalGainLoss >= 0 ? "bg-green-500/10" : "bg-red-500/10",
                format: (v) => showValues ? formatCurrency(v) : '••••',
                subtitle: `${formatPercentage(positionMetrics.totalGainLossPercent / 100)} return`
              },
              {
                title: "Largest Position",
                value: positionMetrics.largestPosition?.total_current_value || 0,
                icon: <Target className="w-5 h-5" />,
                color: "text-purple-400",
                bgColor: "bg-purple-500/10",
                format: (v) => showValues ? formatCurrency(v) : '••••',
                subtitle: positionMetrics.largestPosition?.name || 'N/A'
              },
              {
                title: "Best Performer",
                value: positionMetrics.mostProfitablePosition?.gain_loss_pct || 0,
                icon: <Flame className="w-5 h-5" />,
                color: "text-orange-400",
                bgColor: "bg-orange-500/10",
                format: (v) => `+${formatPercentage(v / 100)}`,
                subtitle: positionMetrics.mostProfitablePosition?.name || 'N/A'
              }
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <div className={metric.color}>{metric.icon}</div>
                  </div>
                </div>
                <h3 className="text-gray-400 text-xs mb-1">{metric.title}</h3>
                <p className="text-xl font-bold mb-1">{metric.format(metric.value)}</p>
                {metric.subtitle && (
                  <p className="text-xs text-gray-500 truncate">{metric.subtitle}</p>
                )}
              </motion.div>
            ))}
          </section>

          {/* Unified Grouped Positions Table */}
          <section>
            <UnifiedGroupPositionsTable2 
              initialSort="value-high"
              title="All Positions"
              showHistoricalColumns={false}
            />
          </section>
          
        </div>
      </div>
    </>
  );
}