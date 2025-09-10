import React, { useState } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  BarChart3,
  LineChart as LineChartIcon,
  Wallet,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import UnifiedGroupPositionsTable from '@/components/tables/UnifiedGroupPositionsTable';
import { formatCurrency } from '@/utils/formatters';

export default function CommandPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    summary: portfolioSummary,
    loading: summaryLoading,
    refresh: refreshSummary
  } = usePortfolioSummary();

  const {
    trends,
    loading: trendsLoading,
    error: trendsError
  } = usePortfolioTrends();

  const {
    loading: positionsLoading,
    refreshData: refreshPositions
  } = useGroupedPositions();

  const isLoading = summaryLoading || trendsLoading || positionsLoading;

  const refreshAll = async () => {
    await Promise.all([
      refreshSummary(),
      refreshPositions()
    ]);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <>
      <Head>
        <title>NestEgg - Command</title>
        <meta name="description" content="Premium command center" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white">
        <header className="border-b border-gray-800 sticky top-0 bg-gray-900/80 backdrop-blur z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-xl font-bold">Command Center</span>
              <nav className="hidden md:flex items-center space-x-1">
                {[
                  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
                  { id: 'trends', label: 'Trends', icon: <LineChartIcon className="w-4 h-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95, rotate: 360 }}
              onClick={refreshAll}
              disabled={isLoading}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="initial"
                className="space-y-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Total Assets
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(portfolioSummary?.totalAssets)}
                    </p>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      Net Worth
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(portfolioSummary?.netWorth)}
                    </p>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Liquid Assets
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(portfolioSummary?.liquidAssets)}
                    </p>
                  </div>
                  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                    <div className="text-gray-400 text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Liabilities
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {formatCurrency(portfolioSummary?.totalLiabilities)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Summary Positions</h3>
                  <UnifiedGroupPositionsTable />
                </div>
              </motion.div>
            )}

            {activeTab === 'trends' && (
              <motion.div
                key="trends"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="initial"
                className="space-y-8"
              >
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Portfolio Trend</h3>
                  <div className="h-72">
                    {trends?.chartData?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends.chartData}>
                          <defs>
                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" tickFormatter={(v) => `$${v / 1000}k`} />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }} />
                          <Area type="monotone" dataKey="netWorth" stroke="#6366f1" fillOpacity={1} fill="url(#colorNet)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        {trendsError ? 'Unable to load trends.' : 'No trend data available.'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}

