import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, TrendingDown, CreditCard, Home, DollarSign, Percent,
  AlertCircle, Target, Shield, Zap, Plus, RefreshCw, Eye, EyeOff,
  TrendingUp, Calendar, Award, Info, Activity, CheckCircle, XCircle,
  Edit2, Calculator
} from "lucide-react";
import LiabilityTable from '@/components/tables/LiabilityTable';
import { AddLiabilitiesModal } from '@/components/modals/AddLiabilitiesModal';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useDataStore } from '@/store/DataStore';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

export default function LiabilitiesPage() {
  // State management
  const [showValues, setShowValues] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payoffYears, setPayoffYears] = useState(3);
  const [isEditingYears, setIsEditingYears] = useState(false);

  // Get data from DataStore hooks - COMPLETE integration
  const {
    liabilities,
    summary,
    metrics,
    loading,
    error,
    refreshData,
    isStale
  } = useGroupedLiabilities();

  const { actions } = useDataStore();

  // Safe calculation helpers
  const safeNumber = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
  const safePercentage = (numerator, denominator) => {
    if (!denominator || denominator === 0) return 0;
    return (numerator / denominator) * 100;
  };

  // Calculate debt payoff insights based on user-selected years
  const payoffInsights = useMemo(() => {
    if (!summary || summary.total_debt === 0) {
      return {
        monthsToPayoff: 0,
        monthlyPaymentNeeded: 0,
        totalInterestPaid: 0,
        payoffProgress: 0,
        totalPaid: 0,
        actualPaidDown: 0
      };
    }

    // Calculate actual amount paid down: Original - Current
    const totalOriginal = summary.total_original_debt || summary.total_debt;
    const totalCurrent = summary.total_debt || 0;
    const actualPaidDown = Math.max(0, totalOriginal - totalCurrent);
    const avgInterestRate = (summary.avg_interest_rate || 0) / 100;

    // Calculate payoff progress based on actual paid down amount
    const payoffProgress = safePercentage(actualPaidDown, totalOriginal);

    // Use user-selected payoff timeframe
    const monthsToPayoff = payoffYears * 12;
    const monthlyRate = avgInterestRate / 12;

    // Calculate monthly payment needed using amortization formula
    let monthlyPaymentNeeded = 0;
    if (monthlyRate > 0) {
      monthlyPaymentNeeded = summary.total_debt *
        (monthlyRate * Math.pow(1 + monthlyRate, monthsToPayoff)) /
        (Math.pow(1 + monthlyRate, monthsToPayoff) - 1);
    } else {
      // If no interest, just divide principal by months
      monthlyPaymentNeeded = summary.total_debt / monthsToPayoff;
    }

    // Calculate total amount paid and total interest
    const totalPaidAmount = monthlyPaymentNeeded * monthsToPayoff;
    const totalInterestPaid = totalPaidAmount - summary.total_debt;

    return {
      monthsToPayoff,
      monthlyPaymentNeeded: safeNumber(monthlyPaymentNeeded, 0),
      totalInterestPaid: safeNumber(totalInterestPaid, 0),
      payoffProgress: safeNumber(payoffProgress, 0),
      totalPaid: safeNumber(totalPaidAmount, 0),
      actualPaidDown: safeNumber(actualPaidDown, 0)
    };
  }, [summary, payoffYears]);

  // Handle modal close and refresh
  const handleLiabilitiesAdded = async (count, savedLiabilities) => {
    console.log(`Added ${count} liabilities:`, savedLiabilities);
    setIsAddModalOpen(false);

    // Mark data as stale and refresh
    actions.markDataStale();
    await refreshData();
  };

  // Handle years input change
  const handleYearsChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= 50) {
      setPayoffYears(value);
    }
  };

  // Loading state
  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white flex items-center justify-center">
        <Head>
          <title>NestEgg | Liabilities</title>
        </Head>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-red-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading liabilities...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white flex items-center justify-center">
        <Head>
          <title>NestEgg | Liabilities</title>
        </Head>
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Liabilities</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshData}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  // Empty state - no liabilities
  const hasLiabilities = summary && summary.total_liabilities > 0;

  if (!hasLiabilities) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white">
        <Head>
          <title>NestEgg | Liabilities</title>
          <meta name="description" content="Debt and liability management" />
        </Head>

        <div className="relative z-10 container mx-auto p-4 md:p-6">
          {/* Header */}
          <header className="mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Liabilities</h1>
                <p className="text-gray-400 text-sm flex items-center">
                  <Receipt className="w-3 h-3 mr-2" />
                  Track and manage your debts
                </p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={refreshData}
                  disabled={loading}
                  className="p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700 transition-colors"
                  aria-label="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${isStale ? 'text-yellow-400' : 'text-gray-400'}`} />
                </motion.button>
              </div>
            </div>
          </header>

          {/* Empty State */}
          <div className="max-w-2xl mx-auto text-center py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-full mb-6">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Debt-Free! 🎉</h2>
              <p className="text-gray-400 text-lg mb-8">
                You have no liabilities tracked. If you have debts you'd like to monitor, add them below to get a complete picture of your financial health.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-medium transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Add Your First Liability
              </motion.button>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <CreditCard className="w-8 h-8 text-blue-400 mb-3 mx-auto" />
                  <h3 className="font-semibold mb-2">Credit Cards</h3>
                  <p className="text-sm text-gray-400">Track credit card balances and utilization</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <Home className="w-8 h-8 text-green-400 mb-3 mx-auto" />
                  <h3 className="font-semibold mb-2">Mortgages</h3>
                  <p className="text-sm text-gray-400">Monitor home loan paydown progress</p>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                  <Receipt className="w-8 h-8 text-purple-400 mb-3 mx-auto" />
                  <h3 className="font-semibold mb-2">Other Loans</h3>
                  <p className="text-sm text-gray-400">Auto, student, and personal loans</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Add Liabilities Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Add Liabilities</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <AddLiabilitiesModal
                  isOpen={true}
                  onClose={() => setIsAddModalOpen(false)}
                  onLiabilitiesSaved={handleLiabilitiesAdded}
                />
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // Main content with liabilities
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white">
      <Head>
        <title>NestEgg | Liabilities</title>
        <meta name="description" content="Debt and liability management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative z-10 container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                <Receipt className="w-8 h-8 text-red-400" />
                Liabilities
              </h1>
              <p className="text-gray-400 text-sm">
                Track and manage your debts • {summary.total_liabilities} {summary.total_liabilities === 1 ? 'account' : 'accounts'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowValues(!showValues)}
                className="p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label={showValues ? 'Hide values' : 'Show values'}
              >
                {showValues ? <Eye className="w-5 h-5 text-gray-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refreshData}
                disabled={loading}
                className="p-2 bg-gray-800/50 rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${isStale ? 'text-yellow-400' : 'text-gray-400'}`} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Liability</span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Summary Section */}
        <section className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main metrics */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-sm">Total Debt</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {payoffInsights.payoffProgress.toFixed(1)}% paid off
                    </span>
                  </div>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-3 text-red-400">
                  {showValues ? formatCurrency(summary.total_debt) : '•••••••'}
                </h2>

                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(payoffInsights.payoffProgress, 100)}%` }}
                  />
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <TrendingDown className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-green-400">
                      {showValues ? formatCurrency(payoffInsights.actualPaidDown) : '•••••'} paid
                    </span>
                  </div>
                  <div className="text-gray-400">
                    from {showValues ? formatCurrency(summary.total_original_debt) : '•••••'} original
                  </div>
                </div>
              </div>

              {/* Side metrics */}
              <div className="space-y-3">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Annual Interest</p>
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold">{showValues ? formatCurrency(summary.total_annual_interest) : '•••••'}</p>
                  <p className="text-xs text-gray-500">
                    {showValues ? formatCurrency(summary.total_annual_interest / 12) : '••••'}/month
                  </p>
                </div>

                {metrics.creditUtilization !== null && (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-sm">Credit Usage</p>
                      <CreditCard className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className={`text-2xl font-bold ${
                      metrics.creditUtilization > 30 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {metrics.creditUtilization.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {metrics.creditUtilization > 30 ? 'Above 30% target' : 'Good standing'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[
            {
              title: "Average Rate",
              value: summary.avg_interest_rate,
              icon: <Percent className="w-5 h-5" />,
              color: "text-yellow-400",
              bgColor: "bg-yellow-500/10",
              borderColor: "border-yellow-500/20",
              format: (v) => `${v?.toFixed(2)}%`,
              subtitle: "weighted average"
            },
            {
              title: "High Interest",
              value: metrics.totalHighInterestDebt,
              icon: <AlertCircle className="w-5 h-5" />,
              color: "text-red-400",
              bgColor: "bg-red-500/10",
              borderColor: "border-red-500/20",
              format: (v) => showValues ? formatCurrency(v) : '•••••',
              subtitle: ">10% rate"
            },
            {
              title: "Highest Rate",
              value: metrics.highestInterestRate,
              icon: <Zap className="w-5 h-5" />,
              color: "text-orange-400",
              bgColor: "bg-orange-500/10",
              borderColor: "border-orange-500/20",
              format: (v) => `${v?.toFixed(2)}%`,
              subtitle: "priority target"
            },
            {
              title: "Debt Types",
              value: Object.keys(summary.liability_type_breakdown || {}).length,
              icon: <Shield className="w-5 h-5" />,
              color: "text-purple-400",
              bgColor: "bg-purple-500/10",
              borderColor: "border-purple-500/20",
              format: (v) => v,
              subtitle: `${summary.total_liabilities} accounts`
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`bg-gray-900/70 border ${metric.borderColor} rounded-xl p-4 hover:bg-gray-800/70 transition-all cursor-default`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <div className={metric.color}>{metric.icon}</div>
                </div>
              </div>
              <h3 className="text-gray-400 text-xs mb-1 uppercase tracking-wide">{metric.title}</h3>
              <p className="text-xl md:text-2xl font-bold mb-1">{metric.format(metric.value)}</p>
              {metric.subtitle && (
                <p className="text-xs text-gray-500 truncate">{metric.subtitle}</p>
              )}
            </motion.div>
          ))}
        </section>

        {/* Debt Breakdown by Type */}
        {Object.keys(summary.liability_type_breakdown || {}).length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Debt by Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(summary.liability_type_breakdown).map(([type, data], index) => {
                const Icon = liabilityIcons[type] || Receipt;
                const percentage = safePercentage(data.total_balance, summary.total_debt);

                return (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="bg-gray-900/70 border border-gray-800 rounded-xl p-5 hover:bg-gray-800/70 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                          <Icon className="w-5 h-5 text-red-400" />
                        </div>
                        <h4 className="font-semibold capitalize">
                          {type.split('_').join(' ')}
                        </h4>
                      </div>
                      <span className="text-sm text-gray-400">
                        {data.count} {data.count === 1 ? 'account' : 'accounts'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-bold text-red-400">
                          {showValues ? formatCurrency(data.total_balance) : '•••••'}
                        </span>
                        <span className="text-sm text-gray-400">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>

                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Rate: {data.avg_interest_rate?.toFixed(2)}%</span>
                        <span>Orig: {showValues ? formatCurrency(data.total_original) : '•••'}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Liabilities Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              All Liabilities
            </h3>
            <p className="text-sm text-gray-400">
              Click any row for detailed information
            </p>
          </div>

          <LiabilityTable
            showHistoricalColumns={true}
          />
        </motion.section>

        {/* Priority Actions */}
        {(metrics.highestInterestRate > 15 || metrics.creditUtilization > 30) && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-br from-red-900/30 to-orange-900/20 border border-red-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-400" />
                Priority Actions
              </h3>

              <div className="space-y-3">
                {metrics.highestInterestRate > 15 && (
                  <div className="flex items-start space-x-3 bg-red-900/20 rounded-lg p-4 border border-red-800/30">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-300">High Interest Alert</p>
                      <p className="text-sm text-gray-400 mt-1">
                        You have debt with {metrics.highestInterestRate.toFixed(2)}% interest rate.
                        Consider prioritizing payment or exploring refinancing options to save on interest costs.
                      </p>
                    </div>
                  </div>
                )}

                {metrics.creditUtilization > 30 && (
                  <div className="flex items-start space-x-3 bg-yellow-900/20 rounded-lg p-4 border border-yellow-800/30">
                    <CreditCard className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-300">Credit Utilization Warning</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Your credit utilization is {metrics.creditUtilization.toFixed(1)}%.
                        Aim to keep it below 30% to maintain a healthy credit score.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* Payoff Calculator - Now at the bottom with user input */}
        {summary.total_debt > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-800/30 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-400" />
                    Debt Payoff Calculator
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Adjust your target timeline to see projections</p>
                </div>

                {/* Years Input */}
                <div className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                  <label className="text-sm text-gray-400 whitespace-nowrap">Target:</label>
                  <div className="relative">
                    {isEditingYears ? (
                      <input
                        type="number"
                        value={payoffYears}
                        onChange={handleYearsChange}
                        onBlur={() => setIsEditingYears(false)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingYears(false);
                          }
                        }}
                        min="1"
                        max="50"
                        autoFocus
                        className="w-16 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-center text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <button
                        onClick={() => setIsEditingYears(true)}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      >
                        <span className="text-white font-semibold">{payoffYears}</span>
                        <span className="text-sm text-gray-400">{payoffYears === 1 ? 'year' : 'years'}</span>
                        <Edit2 className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Monthly Payment</p>
                    <Calendar className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {showValues ? formatCurrency(payoffInsights.monthlyPaymentNeeded) : '•••••'}
                  </p>
                  <p className="text-xs text-gray-500">for {payoffYears} {payoffYears === 1 ? 'year' : 'years'}</p>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Total Paid</p>
                    <DollarSign className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {showValues ? formatCurrency(payoffInsights.totalPaid) : '•••••'}
                  </p>
                  <p className="text-xs text-gray-500">principal + interest</p>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Total Interest</p>
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-2xl font-bold text-orange-400">
                    {showValues ? formatCurrency(payoffInsights.totalInterestPaid) : '•••••'}
                  </p>
                  <p className="text-xs text-gray-500">over {payoffInsights.monthsToPayoff} months</p>
                </div>

                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Progress</p>
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {payoffInsights.payoffProgress.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">debt eliminated</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-400 bg-blue-900/20 rounded-lg p-3">
                <Info className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                <p>
                  Calculations use standard amortization at {summary.avg_interest_rate?.toFixed(2)}% average interest rate.
                  Actual payoff may vary based on payment amounts, timing, and interest accrual.
                  This tool is for estimation purposes only.
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </div>

      {/* Add Liabilities Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Add Liabilities</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <AddLiabilitiesModal
                  isOpen={true}
                  onClose={() => setIsAddModalOpen(false)}
                  onLiabilitiesSaved={handleLiabilitiesAdded}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Icon mapping (same as in LiabilityTable)
const liabilityIcons = {
  credit_card: CreditCard,
  mortgage: Home,
  auto_loan: Receipt,
  student_loan: Receipt,
  personal_loan: Receipt,
  other: Receipt
};
