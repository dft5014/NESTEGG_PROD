// Welcome View - Entry point for QuickStart Modal
import React from 'react';
import { motion } from 'framer-motion';
import {
  Building, FileSpreadsheet, CreditCard, ChevronRight,
  Wallet, TrendingUp, Plus, RefreshCw, Activity
} from 'lucide-react';
import { VIEWS, ACCOUNT_CATEGORIES } from '../utils/constants';
import { formatCurrency } from '@/utils/formatters';

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3 }
  }),
  hover: { scale: 1.02, y: -2 }
};

export default function WelcomeView({
  state,
  goToView,
  onClose
}) {
  const existingAccounts = state.existingAccounts || [];

  // Group existing accounts by category
  const accountsByCategory = existingAccounts.reduce((acc, account) => {
    const category = account.account_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(account);
    return acc;
  }, {});

  const hasExistingAccounts = existingAccounts.length > 0;

  // Calculate portfolio summary
  const portfolioSummary = {
    totalAccounts: existingAccounts.length,
    institutions: new Set(existingAccounts.map(a => a.institution)).size,
    categories: Object.keys(accountsByCategory).length
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg"
        >
          <Plus className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {hasExistingAccounts ? 'Add to Your Portfolio' : 'Build Your Portfolio'}
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          {hasExistingAccounts
            ? 'Continue building your financial picture by adding more accounts, positions, or liabilities.'
            : 'Start by adding your accounts, then add positions and liabilities to track your complete financial picture.'}
        </p>
      </div>

      {/* Existing Portfolio Summary */}
      {hasExistingAccounts && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 p-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl border border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-400" />
              Your Portfolio
            </h3>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-gray-400 hover:text-white flex items-center transition-colors"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-400">{portfolioSummary.totalAccounts}</p>
              <p className="text-xs text-gray-400">Accounts</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">{portfolioSummary.institutions}</p>
              <p className="text-xs text-gray-400">Institutions</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">{portfolioSummary.categories}</p>
              <p className="text-xs text-gray-400">Categories</p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mt-4 flex flex-wrap gap-2">
            {ACCOUNT_CATEGORIES.map(cat => {
              const count = accountsByCategory[cat.id]?.length || 0;
              if (count === 0) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="flex items-center px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                  <Icon className="w-3 h-3 mr-1.5 text-gray-400" />
                  {cat.name}: {count}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Add Accounts Card */}
        <motion.button
          custom={0}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          onClick={() => goToView(VIEWS.accounts)}
          className="group p-6 bg-gradient-to-br from-blue-600/20 to-blue-700/10 rounded-2xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building className="w-6 h-6 text-blue-400" />
            </div>
            <ChevronRight className="w-5 h-5 text-blue-400/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Add Accounts</h3>
          <p className="text-sm text-gray-400">
            Brokerage, retirement, banking, and more
          </p>
          {existingAccounts.length > 0 && (
            <p className="mt-3 text-xs text-blue-400">
              {existingAccounts.length} account{existingAccounts.length !== 1 ? 's' : ''} added
            </p>
          )}
        </motion.button>

        {/* Add Positions Card */}
        <motion.button
          custom={1}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          onClick={() => goToView(VIEWS.positions)}
          disabled={existingAccounts.length === 0}
          className={`group p-6 rounded-2xl border transition-all duration-300 text-left ${
            existingAccounts.length === 0
              ? 'bg-gray-800/50 border-gray-700 opacity-60 cursor-not-allowed'
              : 'bg-gradient-to-br from-purple-600/20 to-purple-700/10 border-purple-500/30 hover:border-purple-400/50'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              existingAccounts.length === 0 ? 'bg-gray-700/50' : 'bg-purple-500/20'
            }`}>
              <FileSpreadsheet className={`w-6 h-6 ${
                existingAccounts.length === 0 ? 'text-gray-500' : 'text-purple-400'
              }`} />
            </div>
            <ChevronRight className={`w-5 h-5 transition-all ${
              existingAccounts.length === 0
                ? 'text-gray-600'
                : 'text-purple-400/50 group-hover:text-purple-400 group-hover:translate-x-1'
            }`} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Add Positions</h3>
          <p className="text-sm text-gray-400">
            Stocks, crypto, cash, metals, and assets
          </p>
          {existingAccounts.length === 0 && (
            <p className="mt-3 text-xs text-amber-400">
              Add accounts first
            </p>
          )}
        </motion.button>

        {/* Add Liabilities Card */}
        <motion.button
          custom={2}
          variants={cardVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          onClick={() => goToView(VIEWS.liabilities)}
          className="group p-6 bg-gradient-to-br from-rose-600/20 to-rose-700/10 rounded-2xl border border-rose-500/30 hover:border-rose-400/50 transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-rose-400" />
            </div>
            <ChevronRight className="w-5 h-5 text-rose-400/50 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Add Liabilities</h3>
          <p className="text-sm text-gray-400">
            Credit cards, mortgages, loans
          </p>
        </motion.button>
      </div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-xl p-5 border border-indigo-500/20"
      >
        <h4 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Quick Tips
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
          <div className="flex items-start">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
              <span className="text-indigo-400 font-semibold">1</span>
            </span>
            <span>Start by adding your accounts - brokerage, retirement, banking, etc.</span>
          </div>
          <div className="flex items-start">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
              <span className="text-indigo-400 font-semibold">2</span>
            </span>
            <span>Use Excel import to bulk add positions from your brokerage exports.</span>
          </div>
          <div className="flex items-start">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
              <span className="text-indigo-400 font-semibold">3</span>
            </span>
            <span>Type ticker symbols to auto-fill current prices and company names.</span>
          </div>
          <div className="flex items-start">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
              <span className="text-indigo-400 font-semibold">4</span>
            </span>
            <span>Your drafts are auto-saved locally. Come back anytime to finish.</span>
          </div>
        </div>
      </motion.div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
