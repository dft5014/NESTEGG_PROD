import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, Percent,
  Target, Flame, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import UnifiedGroupPositionsTable2 from '@/components/tables/UnifiedGroupPositionsTable2';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

// DataStore hooks - no API methods!
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';

export default function PositionsPage() {
  const [showValues, setShowValues] = useState(true);

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
    positionCount: positions?.length || 0
  };

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

          {/* KPI Boxes */}
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