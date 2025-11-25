// Welcome View - Entry point for QuickStart Modal
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building, FileSpreadsheet, CreditCard, ChevronRight, ChevronDown,
  Sparkles, TrendingUp, RefreshCw, Shield, Clock, Users
} from 'lucide-react';
import { VIEWS, ACCOUNT_CATEGORIES } from '../utils/constants';

export default function WelcomeView({
  state,
  goToView,
  onClose
}) {
  const existingAccounts = state.existingAccounts || [];
  const [showAccountsDropdown, setShowAccountsDropdown] = useState(false);

  // Group existing accounts by category
  const accountsByCategory = existingAccounts.reduce((acc, account) => {
    const category = account.account_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(account);
    return acc;
  }, {});

  const hasExistingAccounts = existingAccounts.length > 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative inline-block"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg shadow-blue-500/25">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2 mt-4">
          Quick Add to Your NestEgg Portfolio
        </h2>
        <p className="text-gray-300 max-w-md mx-auto">
          Build your complete financial picture in minutes
        </p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="bg-gradient-to-br from-gray-900/70 to-gray-800 rounded-2xl shadow-sm border border-gray-800 p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left side - Action buttons */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              What would you like to add?
            </h4>

            {/* Add Accounts Button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => goToView(VIEWS.accounts)}
              className="w-full group relative bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 border border-gray-700 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-600 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <Building className="w-10 h-10 text-emerald-400 relative z-10" />
                  </div>
                  <div className="ml-4">
                    <h5 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      Add Accounts
                    </h5>
                    <p className="text-sm text-gray-300">Investment, retirement, cash accounts</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>

            {/* Add Positions Button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => hasExistingAccounts && goToView(VIEWS.positions)}
              disabled={!hasExistingAccounts}
              className={`w-full group relative p-4 rounded-xl cursor-pointer transition-all duration-300 transform border text-left ${
                !hasExistingAccounts
                  ? 'bg-gray-800/50 border-gray-700 opacity-60 cursor-not-allowed'
                  : 'bg-gradient-to-br from-purple-900/30 to-purple-800/30 border-purple-800/50 hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative">
                    <div className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
                      hasExistingAccounts ? 'bg-purple-600 opacity-0 group-hover:opacity-10' : ''
                    }`}></div>
                    <FileSpreadsheet className={`w-10 h-10 relative z-10 ${
                      !hasExistingAccounts ? 'text-gray-400' : 'text-purple-400'
                    }`} />
                  </div>
                  <div className="ml-4">
                    <h5 className={`font-semibold transition-colors ${
                      !hasExistingAccounts
                        ? 'text-gray-400'
                        : 'text-white group-hover:text-purple-400'
                    }`}>
                      Add Asset Positions
                    </h5>
                    <p className="text-sm text-gray-300">
                      {!hasExistingAccounts
                        ? 'Add accounts first to enable positions'
                        : 'Stocks, bonds, crypto, and more'}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transform transition-transform ${
                  !hasExistingAccounts
                    ? 'text-gray-400'
                    : 'text-purple-400 group-hover:translate-x-1'
                }`} />
              </div>
            </motion.button>

            {/* Add Liabilities Button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => goToView(VIEWS.liabilities)}
              className="w-full group relative bg-gradient-to-br from-rose-900/30 to-rose-800/30 p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 border border-rose-800/50 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-rose-600 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <CreditCard className="w-10 h-10 text-rose-400 relative z-10" />
                  </div>
                  <div className="ml-4">
                    <h5 className="font-semibold text-white group-hover:text-rose-400 transition-colors">
                      Add Liabilities
                    </h5>
                    <p className="text-sm text-gray-300">Mortgages, loans, credit cards</p>
                    <p className="text-xs text-gray-400 mt-0.5">No accounts required</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-rose-400 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          </div>

          {/* Right side - Portfolio Summary */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Current NestEgg Portfolio
              </h4>
              <button
                onClick={() => window.location.reload()}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-white" />
              </button>
            </div>

            {!hasExistingAccounts ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full mb-3">
                  <Building className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">No accounts yet</p>
                <p className="text-gray-400 text-xs mt-1">Start by adding your first account</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <p className="text-3xl font-bold text-white">
                      {existingAccounts.length}
                    </p>
                    <p className="text-xs text-gray-300 font-medium">Total Accounts</p>
                  </div>
                  <button
                    onClick={() => setShowAccountsDropdown(!showAccountsDropdown)}
                    className="flex items-center px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-sm text-gray-300 hover:text-white border border-gray-700"
                  >
                    <span>View Details</span>
                    <ChevronDown className={`w-4 h-4 ml-1.5 transition-transform ${
                      showAccountsDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>
                </div>

                <AnimatePresence>
                  {showAccountsDropdown && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 mt-4 max-h-64 overflow-y-auto"
                    >
                      {ACCOUNT_CATEGORIES.map(category => {
                        const categoryAccounts = accountsByCategory[category.id] || [];
                        if (categoryAccounts.length === 0) return null;
                        const Icon = category.icon;

                        return (
                          <div key={category.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                            <div className="flex items-center mb-2">
                              <Icon className="w-4 h-4 text-gray-300 mr-2" />
                              <span className="text-sm font-medium text-white">
                                {category.name}
                              </span>
                              <span className="ml-auto text-xs text-gray-400">
                                {categoryAccounts.length}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {categoryAccounts.map(account => (
                                <div key={account.id} className="flex items-center justify-between text-xs text-gray-300 pl-6">
                                  <span className="truncate">
                                    {account.name || account.account_name || 'Unnamed Account'}
                                  </span>
                                  <span className="text-gray-400">
                                    {account.institution || 'Unknown'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center group">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <div className="relative inline-flex items-center justify-center w-12 h-12 bg-emerald-900/30 rounded-full group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <p className="text-sm text-gray-300 mt-2">Secure & Private</p>
        </div>
        <div className="text-center group">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <div className="relative inline-flex items-center justify-center w-12 h-12 bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-gray-300 mt-2">Quick Setup</p>
        </div>
        <div className="text-center group">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-purple-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <div className="relative inline-flex items-center justify-center w-12 h-12 bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-300 mt-2">Your Data Only</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end">
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
