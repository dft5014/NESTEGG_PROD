import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, X, Eye, EyeOff, RefreshCw, ChevronRight, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, Clock, Zap, Shield, Award, Sparkles,
  CreditCard, Wallet, PiggyBank, Home, Car, GraduationCap,
  ChevronDown, Check, Plus, Minus, Edit2, Save, XCircle, Info,
  ArrowUpRight, ArrowDownRight, Activity, BarChart3, DollarSign,
  Smartphone, Lock, Calendar, Hash, Percent, FileText,
    ChevronUp, AlertTriangle, Banknote, Coins,
  Gem, Building, CheckSquare, Trophy, Landmark, Calculator,
  Loader2, ArrowRight, Search, Settings, HelpCircle, Star,
  Keyboard, TabletSmartphone, MousePointer, PlayCircle,
  LineChart, Package, Users, Bell, Filter, MoreVertical,
  Copy, ExternalLink, Receipt, Droplets, CheckCheck, Flag,
  ChevronsRight, ChevronLeft, Briefcase, GitBranch, Layers,
  Database, StarHalf, BellOff, Repeat, RotateCcw, Send,
  PartyPopper, Timer, Flame as FlameIcon, Gauge, CircleDollarSign,
  FileCheck, ArrowUpDown, Maximize2, BarChart, Inbox, MessageSquare,
  Heart, Share2, Bookmark, Download, Upload, Grid, List,
  Unlock, Square, MinusSquare, GitMerge, Target, Disc
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/formatters';
import FixedModal from './FixedModal';

export function QuickReconciliationButton2({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl ${className}`}
      >
        <CheckSquare className="w-4 h-4" />
        <span className="font-medium">Quick Reconcile</span>
        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">Fast</span>
      </motion.button>
      
      {isOpen && (
        <QuickReconciliationModal2
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function QuickReconciliationModal2({ isOpen, onClose }) {
  // Basic state management
  const [selectedTab, setSelectedTab] = useState('cash_debt'); // 'cash_debt' | 'investments' | 'history'
  const [showValues, setShowValues] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Helper functions
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Minimal render functions
  const renderCashDebtView = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Cash & Debt Accounts</h3>
            <p className="text-sm text-gray-400 mt-1">
              Temporarily simplified - functionality will be restored
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-8 text-center">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h4 className="text-xl font-semibold text-gray-200 mb-2">Coming Soon</h4>
          <p className="text-gray-400">Cash & debt reconciliation features are being rebuilt</p>
          <button
            onClick={() => showMessage('info', 'Feature temporarily disabled')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Learn More
          </button>
        </div>
      </div>
    );
  };

  const renderInvestmentsView = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Investment Positions</h3>
            <p className="text-sm text-gray-400 mt-1">
              Update your securities, crypto, and precious metals
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-8 text-center">
          <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h4 className="text-xl font-semibold text-gray-200 mb-2">Investments View</h4>
          <p className="text-gray-400">Investment reconciliation features are being rebuilt</p>
          <button
            onClick={() => showMessage('success', 'Investments section loaded successfully')}
            className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Test Success Message
          </button>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Reconciliation History</h3>
            <p className="text-sm text-gray-400 mt-1">
              View past reconciliations and track accuracy
            </p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-8 text-center">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h4 className="text-xl font-semibold text-gray-200 mb-2">No History Yet</h4>
          <p className="text-gray-400">Complete a reconciliation to see it here</p>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-400">0</p>
              <p className="text-xs text-gray-500">Total Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">100%</p>
              <p className="text-xs text-gray-500">Success Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">0</p>
              <p className="text-xs text-gray-500">Accounts Updated</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHelp = () => {
    if (!showHelp) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/95 z-50 p-6 overflow-y-auto rounded-lg"
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-100">Quick Reconciliation Help</h3>
            <button
              onClick={() => setShowHelp(false)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-200 mb-2">Current Status</h4>
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <p className="text-yellow-300 text-sm">
                  🚧 This feature is currently being rebuilt with improved stability and performance.
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-200 mb-2">What's Working</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Modal interface and navigation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Tab switching between sections</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-400">✓</span>
                  <span>Help system and messaging</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-200 mb-2">Coming Soon</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">○</span>
                  <span>Account balance reconciliation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">○</span>
                  <span>Investment position updates</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400">○</span>
                  <span>Reconciliation history tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <FixedModal isOpen={isOpen} onClose={onClose} width="max-w-7xl">
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">Quick Reconciliation</h2>
              <p className="text-sm text-gray-400">Update your account balances efficiently</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Tab Switcher */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setSelectedTab('cash_debt')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedTab === 'cash_debt'
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Cash & Debt
              </button>
              <button
                onClick={() => setSelectedTab('investments')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedTab === 'investments'
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Investments
              </button>
              <button
                onClick={() => setSelectedTab('history')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  selectedTab === 'history'
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                History
              </button>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => setShowValues(!showValues)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle values"
            >
              {showValues ? (
                <Eye className="w-5 h-5 text-gray-400" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-400" />
              )}
            </button>

            <button
              onClick={() => setShowHelp(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Help"
            >
              <HelpCircle className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mx-6 mt-4 p-3 rounded-lg flex items-center space-x-2 ${
                message.type === 'success' ? 'bg-green-900/20 border border-green-800 text-green-400' :
                message.type === 'error' ? 'bg-red-900/20 border border-red-800 text-red-400' :
                'bg-blue-900/20 border border-blue-800 text-blue-400'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
               message.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
               <Info className="w-4 h-4" />}
              <span className="text-sm">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {selectedTab === 'cash_debt' && renderCashDebtView()}
          {selectedTab === 'investments' && renderInvestmentsView()}
          {selectedTab === 'history' && renderHistoryView()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Status:</span>
              <span className="text-xs text-yellow-400">Rebuilding</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => showMessage('info', 'Feature coming soon!')}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
            >
              Test Completed
            </button>
          </div>
        </div>

        {/* Help overlay */}
        <AnimatePresence>
          {renderHelp()}
        </AnimatePresence>
      </div>
    </FixedModal>
  );
}

export default QuickReconciliationModal2;