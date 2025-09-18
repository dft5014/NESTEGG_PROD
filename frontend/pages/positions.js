import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown,
  Target, Flame, RefreshCw, Eye, EyeOff,
  BarChart3, LineChart, PieChart, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import UnifiedGroupPositionsTable from '@/components/tables/UnifiedGroupPositionsTable';
import { formatCurrency } from '@/utils/formatters';

// DataStore hooks - no API methods!
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';

// Time periods for chart
const timeframeOptions = [
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' }
];

export default function PositionsPage() {
  const [showValues, setShowValues] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');

  // Get data from the store - no API calls!
  const {
    positions,
    summary: groupedSummary,
    metrics, // kept for parity; may be used elsewhere in your store
    loading: positionsLoading,
    error: positionsError,
    refreshData: refreshPositions
  } = useGroupedPositions();

  const {
    summary: portfolioData,
    topPerformersPercent,
    topPerformersAmount,
    assetPerformance,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary
  } = usePortfolioSummary();

  // Get trend data
  const { trends, loading: trendsLoading } = usePortfolioTrends();

  // Combine loading states
  const isLoading = !!(positionsLoading || summaryLoading || trendsLoading);
  const hasPositions = Array.isArray(positions) && positions.length > 0;
  const isRefreshing = isLoading && hasPositions;

  // Handle refresh all data
  const handleRefresh = async () => {
    await Promise.all([
      typeof refreshPositions === 'function' ? refreshPositions() : Promise.resolve(),
      typeof refreshSummary === 'function' ? refreshSummary() : Promise.resolve()
    ]);
  };

  // Helpers
  const safeNumber = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
  const byValueDesc = (a, b) =>
    safeNumber(b?.total_current_value) - safeNumber(a?.total_current_value);

  // Calculate largest position by value instead of trusting array order
  const largest = useMemo(() => {
    if (!Array.isArray(positions) || positions.length === 0) return null;
    return [...positions].sort(byValueDesc)[0] ?? null;
  }, [positions]);

  // Position metrics from store data
  const positionMetrics = useMemo(
    () => ({
      totalValue: safeNumber(portfolioData?.liquidAssets, 0),
      totalGainLoss: safeNumber(portfolioData?.liquidUnrealizedGain, 0),
      totalGainLossPercent: safeNumber(portfolioData?.liquidUnrealizedGainPercent, 0),
      largestPosition: largest,
      mostProfitablePosition: Array.isArray(topPerformersPercent)
        ? topPerformersPercent[0] ?? null
        : null,
      positionCount: safeNumber(groupedSummary?.unique_assets, 0),
      avgYield: safeNumber(portfolioData?.income?.yieldLiquid, 0)
    }),
    [portfolioData, largest, topPerformersPercent, groupedSummary]
  );

  // Process chart data based on timeframe (sorted ascending by date)
  const chartData = useMemo(() => {
    const data = Array.isArray(trends?.chartData) ? trends.chartData : [];
    if (data.length === 0) return [];

    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedTimeframe) {
      case '1w':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'ytd':
        cutoffDate.setMonth(0, 1);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
      default:
        cutoffDate.setMonth(now.getMonth() - 1);
    }

    return data
      .filter((p) => new Date(p.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trends, selectedTimeframe]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0]?.value;
      const pct = payload[0]?.payload?.unrealizedGainPercent;
      return (
        <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">
            {new Date(label).toLocaleDateString()}
          </p>
          <p className="text-sm font-semibold text-white">
            {showValues && Number.isFinite(val) ? formatCurrency(val) : '•••••'}
          </p>
          {Number.isFinite(pct) && (
            <p className={`text-xs ${pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {pct >= 0 ? '+' : ''}
              {pct.toFixed(2)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Head>
        <title>NestEgg - Positions</title>
        <meta name="description" content="Track your investment positions" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-indigo-400" />
                  Your Positions
                </h1>
                <p className="text-gray-400 mt-2">
                  Track performance across all your investments
                </p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowValues(!showValues)}
                  aria-label={showValues ? 'Hide values' : 'Show values'}
                  aria-pressed={!showValues}
                  title={showValues ? 'Hide values' : 'Show values'}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                >
                  {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={isLoading}
                  aria-busy={isRefreshing}
                  aria-label="Refresh data"
                  title="Refresh data"
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            </div>
          </header>

          {/* Error State */}
          {(positionsError || summaryError) && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                {positionsError ? <li>{String(positionsError)}</li> : null}
                {summaryError ? <li>{String(summaryError)}</li> : null}
              </ul>
            </div>
          )}

          {/* Portfolio Value Trend Chart */}
          <section className="mb-8">
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-indigo-400" />
                  Liquid Assets Trend
                </h2>
                <div className="flex gap-2">
                  {timeframeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedTimeframe(option.id)}
                      className={`px-3 py-1 text-sm rounded-lg transition-all ${
                        selectedTimeframe === option.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="liquidAssetsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(date) =>
                          new Date(date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })
                        }
                      />
                      <YAxis
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          showValues && Number.isFinite(value)
                            ? formatCurrency(value, { compact: true })
                            : '•••'
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="liquidAssets"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#liquidAssetsGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">No data available for the selected period</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Summary Metrics */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: 'Total Liquid Value',
                value: positionMetrics.totalValue,
                icon: <DollarSign className="w-5 h-5" />,
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/10',
                format: (v) => (showValues ? formatCurrency(safeNumber(v, 0)) : '••••'),
                subtitle: `${positionMetrics.positionCount} unique assets`
              },
              {
                title: 'Total Gain/Loss',
                value: positionMetrics.totalGainLoss,
                icon:
                  positionMetrics.totalGainLoss >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  ),
                color:
                  positionMetrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400',
                bgColor:
                  positionMetrics.totalGainLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
                format: (v) => (showValues ? formatCurrency(safeNumber(v, 0)) : '••••'),
                subtitle: `${
                  positionMetrics.totalGainLossPercent >= 0 ? '+' : ''
                }${safeNumber(positionMetrics.totalGainLossPercent, 0).toFixed(2)}% return`
              },
              {
                title: 'Largest Position',
                value: positionMetrics.largestPosition?.total_current_value ?? 0,
                icon: <Target className="w-5 h-5" />,
                color: 'text-purple-400',
                bgColor: 'bg-purple-500/10',
                format: (v) => (showValues ? formatCurrency(safeNumber(v, 0)) : '••••'),
                subtitle:
                  positionMetrics.largestPosition?.name ||
                  positionMetrics.largestPosition?.identifier ||
                  'N/A'
              },
              {
                title: 'Best Performer',
                value: positionMetrics.mostProfitablePosition?.gain_loss_percent ?? 0,
                icon: <Flame className="w-5 h-5" />,
                color: 'text-orange-400',
                bgColor: 'bg-orange-500/10',
                format: (v) =>
                  Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—',
                subtitle: positionMetrics.mostProfitablePosition?.name || 'N/A'
              }
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <div className={metric.color}>{metric.icon}</div>
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">{metric.title}</h3>
                <p className="text-2xl font-bold mb-1">{metric.format(metric.value)}</p>
                {metric.subtitle && (
                  <p className="text-xs text-gray-500 truncate">{metric.subtitle}</p>
                )}
              </motion.div>
            ))}
          </section>

          {/* Unified Grouped Positions Table */}
          <section>
            <UnifiedGroupPositionsTable
              initialSort="value-high"
              title="All Positions"
              showHistoricalColumns={false}
            />
          </section>

          {/* Asset Performance by Type */}
          {assetPerformance && Object.keys(assetPerformance).length > 0 && (
            <section className="mb-8">
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-400" />
                  Performance by Asset Type
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(assetPerformance)
                    .filter(([, data]) => safeNumber(data?.current_value, 0) > 0)
                    .map(([assetType, data]) => (
                      <div key={assetType} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-medium capitalize">
                            {assetType.replace('_', ' ')}
                          </h3>
                          {safeNumber(data?.position_count, 0) > 0 && (
                            <span className="text-xs text-gray-400">
                              ({data.position_count})
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-semibold mb-1">
                          {showValues
                            ? formatCurrency(safeNumber(data?.current_value, 0))
                            : '•••••'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              safeNumber(data?.gain_loss_percent, 0) >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {safeNumber(data?.gain_loss_percent, 0) >= 0 ? '+' : ''}
                            {safeNumber(data?.gain_loss_percent, 0).toFixed(2)}%
                          </span>
                          {Number.isFinite(data?.daily?.percent_change) && (
                            <span className="text-xs text-gray-400">
                              1D:{' '}
                              {data.daily.percent_change >= 0 ? '+' : ''}
                              {data.daily.percent_change.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}

          {/* Top Performers */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Gainers by Percent */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-400" />
                Top Performers (%)
              </h3>
              <div className="space-y-3">
                {((topPerformersPercent ?? []).slice(0, 5)).length > 0 ? (
                  (topPerformersPercent ?? []).slice(0, 5).map((position, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{position?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-400">
                          {position?.identifier || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-400">
                          {Number.isFinite(position?.gain_loss_percent)
                            ? `${position.gain_loss_percent >= 0 ? '+' : ''}${position.gain_loss_percent.toFixed(2)}%`
                            : '—'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {showValues && Number.isFinite(position?.gain_loss_amount)
                            ? formatCurrency(position.gain_loss_amount)
                            : showValues ? '—' : '•••'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No data available</p>
                )}
              </div>
            </div>

            {/* Top Gainers by Amount */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-400" />
                Top Performers ($)
              </h3>
              <div className="space-y-3">
                {((topPerformersAmount ?? []).slice(0, 5)).length > 0 ? (
                  (topPerformersAmount ?? []).slice(0, 5).map((position, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {position?.name || position?.identifier || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400">{position?.sector || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-400">
                          {showValues && Number.isFinite(position?.gain_loss_amount)
                            ? formatCurrency(position.gain_loss_amount)
                            : showValues ? '—' : '•••'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {Number.isFinite(position?.gain_loss_percent)
                            ? `${position.gain_loss_percent >= 0 ? '+' : ''}${position.gain_loss_percent.toFixed(2)}%`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No data available</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
