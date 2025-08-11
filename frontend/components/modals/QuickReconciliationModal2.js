import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, X, Eye, EyeOff, RefreshCw, ChevronRight, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, Clock, Zap, Shield, Award, Sparkles,
  CreditCard, Wallet, Building2, PiggyBank, Home, Car, GraduationCap,
  ChevronDown, Check, Plus, Minus, Edit2, Save, XCircle, Info,
  ArrowUpRight, ArrowDownRight, Activity, BarChart3, DollarSign,
  Smartphone, Lock, Unlock, Calendar, Hash, Percent, FileText
} from 'lucide-react';
import { useDataStore } from '../../store/DataStore';
import { fetchWithAuth } from '../../utils/api';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';
import FixedModal from './FixedModal';

// Asset type configurations
const ASSET_CONFIGS = {
  cash: { 
    icon: Wallet, 
    color: 'green', 
    gradient: 'from-green-500 to-emerald-500',
    quickEdit: true,
    label: 'Cash & Savings'
  },
  credit_card: { 
    icon: CreditCard, 
    color: 'red', 
    gradient: 'from-red-500 to-rose-500',
    quickEdit: true,
    label: 'Credit Cards'
  },
  mortgage: { 
    icon: Home, 
    color: 'purple', 
    gradient: 'from-purple-500 to-indigo-500',
    quickEdit: true,
    label: 'Mortgages'
  },
  loan: { 
    icon: FileText, 
    color: 'orange', 
    gradient: 'from-orange-500 to-amber-500',
    quickEdit: true,
    label: 'Loans'
  },
  security: { 
    icon: TrendingUp, 
    color: 'blue', 
    gradient: 'from-blue-500 to-cyan-500',
    quickEdit: false,
    label: 'Securities'
  },
  crypto: { 
    icon: Zap, 
    color: 'yellow', 
    gradient: 'from-yellow-500 to-orange-500',
    quickEdit: false,
    label: 'Crypto'
  },
  metal: { 
    icon: Shield, 
    color: 'gray', 
    gradient: 'from-gray-500 to-slate-500',
    quickEdit: false,
    label: 'Metals'
  },
  realestate: { 
    icon: Building2, 
    color: 'indigo', 
    gradient: 'from-indigo-500 to-purple-500',
    quickEdit: true,
    label: 'Real Estate'
  }
};

// Category configurations
const CATEGORY_CONFIGS = {
  brokerage: { icon: BarChart3, color: 'blue', label: 'Investment' },
  retirement: { icon: PiggyBank, color: 'purple', label: 'Retirement' },
  banking: { icon: Building2, color: 'green', label: 'Banking' },
  crypto: { icon: Zap, color: 'yellow', label: 'Crypto' },
  credit: { icon: CreditCard, color: 'red', label: 'Credit' },
  mortgage: { icon: Home, color: 'indigo', label: 'Mortgage' },
  loan: { icon: FileText, color: 'orange', label: 'Loan' }
};

// Variance status helper
const getVarianceStatus = (variance, threshold = 0.01) => {
  const absVariance = Math.abs(variance);
  if (absVariance <= threshold) return { color: 'green', icon: CheckCircle2, label: 'Matched' };
  if (absVariance <= threshold * 5) return { color: 'yellow', icon: AlertCircle, label: 'Minor' };
  return { color: 'red', icon: AlertCircle, label: 'Review' };
};

// Format time ago
const formatTimeAgo = (date) => {
  if (!date) return 'Never';
  const now = new Date();
  const then = new Date(date);
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
};

const QuickReconciliationModal2 = ({ isOpen, onClose }) => {
  // DataStore integration
  const { state, actions } = useDataStore();
  
  // Core state
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, quick, accounts, review
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [reconciliationData, setReconciliationData] = useState({});
  const [variances, setVariances] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [expandedSections, setExpandedSections] = useState(new Set(['quick']));
  
  // UI state
  const [message, setMessage] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [animateValues, setAnimateValues] = useState({});
  
  // Refs
  const messageTimeoutRef = useRef(null);
  const reconciliationHistoryRef = useRef([]);
  
  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadReconciliationData();
      actions.fetchAccountsData();
      actions.fetchDetailedPositionsData();
      actions.fetchGroupedLiabilitiesData();
    }
  }, [isOpen]);
  
  // Load reconciliation history from localStorage
  const loadReconciliationData = () => {
    const history = localStorage.getItem('nestegg_reconciliation_v2');
    if (history) {
      reconciliationHistoryRef.current = JSON.parse(history);
    }
  };
  
  // Save reconciliation to history
  const saveReconciliationHistory = (data) => {
    const history = reconciliationHistoryRef.current;
    history.unshift({
      date: new Date().toISOString(),
      ...data
    });
    // Keep last 30 reconciliations
    if (history.length > 30) history.pop();
    localStorage.setItem('nestegg_reconciliation_v2', JSON.stringify(history));
  };
  
  // Show message helper
  const showMessage = (type, text, duration = 3000) => {
    setMessage({ type, text });
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessage(null), duration);
  };
  
  // Process accounts with reconciliation status
  const processedAccounts = useMemo(() => {
    if (!state.accounts.data) return [];
    
    return state.accounts.data.map(account => {
      const lastRec = reconciliationHistoryRef.current.find(r => 
        r.accounts?.includes(account.account_id)
      );
      
      return {
        ...account,
        lastReconciled: lastRec?.date,
        daysSinceReconciliation: lastRec ? 
          Math.floor((Date.now() - new Date(lastRec.date)) / (1000 * 60 * 60 * 24)) : null,
        needsReconciliation: !lastRec || 
          Math.floor((Date.now() - new Date(lastRec.date)) / (1000 * 60 * 60 * 24)) > 14
      };
    });
  }, [state.accounts.data]);
  
  // Get liquid positions (cash, credit cards, loans)
  const liquidPositions = useMemo(() => {
    if (!state.detailedPositions?.data) return [];
    
    return state.detailedPositions.data.filter(pos => 
      ['cash', 'credit_card', 'loan', 'mortgage'].includes(pos.assetType)
    );
  }, [state.detailedPositions?.data]);
  
  // Get investment positions
  const investmentPositions = useMemo(() => {
    if (!state.detailedPositions?.data) return [];
    
    return state.detailedPositions.data.filter(pos => 
      ['security', 'crypto', 'metal'].includes(pos.assetType)
    );
  }, [state.detailedPositions?.data]);
  
  // Calculate reconciliation health score
  const reconciliationHealth = useMemo(() => {
    const totalAccounts = processedAccounts.length;
    if (totalAccounts === 0) return 100;
    
    const reconciledAccounts = processedAccounts.filter(a => 
      a.daysSinceReconciliation !== null && a.daysSinceReconciliation <= 14
    ).length;
    
    return Math.round((reconciledAccounts / totalAccounts) * 100);
  }, [processedAccounts]);
  
  // Toggle section expansion
  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  // Handle quick update for liquid positions
  const handleQuickUpdate = async (positionId, newValue) => {
    setReconciliationData(prev => ({
      ...prev,
      [`pos_${positionId}`]: {
        value: newValue,
        timestamp: new Date().toISOString()
      }
    }));
    
    // Animate the value change
    setAnimateValues(prev => ({ ...prev, [positionId]: true }));
    setTimeout(() => {
      setAnimateValues(prev => ({ ...prev, [positionId]: false }));
    }, 500);
  };
  
  // Handle account reconciliation
  const handleAccountReconciliation = async (accountId, statementBalance) => {
    const account = processedAccounts.find(a => a.account_id === accountId);
    if (!account) return;
    
    const variance = statementBalance - account.total_value;
    const variancePercent = account.total_value !== 0 ? 
      (variance / account.total_value) * 100 : 0;
    
    setVariances(prev => ({
      ...prev,
      [accountId]: {
        appBalance: account.total_value,
        actualBalance: statementBalance,
        variance,
        variancePercent,
        status: getVarianceStatus(variancePercent)
      }
    }));
    
    setReconciliationData(prev => ({
      ...prev,
      [`account_${accountId}`]: {
        statementBalance,
        timestamp: new Date().toISOString()
      }
    }));
  };
  
  // Submit reconciliation to backend
  const submitReconciliation = async () => {
    setIsSubmitting(true);
    
    try {
      const reconciliations = [];
      
      // Process account reconciliations
      for (const [key, data] of Object.entries(reconciliationData)) {
        if (key.startsWith('account_')) {
          const accountId = parseInt(key.replace('account_', ''));
          const account = processedAccounts.find(a => a.account_id === accountId);
          
          if (account) {
            const response = await fetchWithAuth('/api/reconciliation/account', {
              method: 'POST',
              body: JSON.stringify({
                account_id: accountId,
                app_balance: account.total_value,
                actual_balance: data.statementBalance
              })
            });
            
            if (response.ok) {
              reconciliations.push(accountId);
            }
          }
        } else if (key.startsWith('pos_')) {
          const positionId = parseInt(key.replace('pos_', ''));
          const position = state.detailedPositions.data.find(p => p.itemId === positionId);
          
          if (position) {
            const response = await fetchWithAuth('/api/reconciliation/position', {
              method: 'POST',
              body: JSON.stringify({
                position_id: positionId,
                account_id: position.accountId,
                asset_type: position.assetType,
                app_quantity: position.quantity,
                app_value: position.currentValue,
                actual_quantity: position.quantity,
                actual_value: data.value,
                reconcile_quantity: true,
                reconcile_value: true
              })
            });
          }
        }
      }
      
      // Save to history
      saveReconciliationHistory({
        accounts: reconciliations,
        positions: Object.keys(reconciliationData).filter(k => k.startsWith('pos_')).length,
        totalValue: processedAccounts.reduce((sum, a) => sum + a.total_value, 0)
      });
      
      // Show success
      setConfetti(true);
      showMessage('success', '✨ Reconciliation complete! Your NestEgg is up to date.');
      setTimeout(() => setConfetti(false), 5000);
      
      // Refresh data
      actions.markDataStale();
      actions.refreshData();
      
      // Reset state
      setTimeout(() => {
        setReconciliationData({});
        setVariances({});
        setActiveView('dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Reconciliation error:', error);
      showMessage('error', 'Failed to complete reconciliation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render quick update section
  const renderQuickUpdateSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* Section Header */}
      <button
        onClick={() => toggleSection('quick')}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Quick Updates</h3>
            <p className="text-sm text-gray-500">Cash, credit cards & liabilities</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {liquidPositions.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {liquidPositions.length} items
            </span>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSections.has('quick') ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
      
      {/* Section Content */}
      <AnimatePresence>
        {expandedSections.has('quick') && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100"
          >
            <div className="p-6 space-y-4">
              {liquidPositions.map(position => {
                const AssetIcon = ASSET_CONFIGS[position.assetType]?.icon || Wallet;
                const config = ASSET_CONFIGS[position.assetType];
                const hasUpdate = reconciliationData[`pos_${position.itemId}`];
                const isAnimating = animateValues[position.itemId];
                
                return (
                  <motion.div
                    key={position.itemId}
                    layout
                    className={`p-4 rounded-lg border-2 transition-all ${
                      hasUpdate ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                    } ${isAnimating ? 'scale-[1.02]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 bg-gradient-to-br ${config.gradient} rounded-lg`}>
                          <AssetIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{position.name}</h4>
                          <p className="text-sm text-gray-500">
                            {position.accountName} • {position.institution}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Current</p>
                          <p className="font-semibold text-gray-900">
                            {showValues ? formatCurrency(position.currentValue) : '••••'}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              const newValue = position.currentValue - 100;
                              handleQuickUpdate(position.itemId, newValue);
                            }}
                            className="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4 text-red-600" />
                          </button>
                          
                          <input
                            type="number"
                            value={reconciliationData[`pos_${position.itemId}`]?.value ?? position.currentValue}
                            onChange={(e) => handleQuickUpdate(position.itemId, parseFloat(e.target.value) || 0)}
                            className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            step="0.01"
                          />
                          
                          <button
                            onClick={() => {
                              const newValue = (reconciliationData[`pos_${position.itemId}`]?.value ?? position.currentValue) + 100;
                              handleQuickUpdate(position.itemId, newValue);
                            }}
                            className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4 text-green-600" />
                          </button>
                        </div>
                        
                        {hasUpdate && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-1.5 bg-green-500 rounded-full"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {hasUpdate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-green-200"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-700">
                            Change: {formatCurrency(hasUpdate.value - position.currentValue)}
                          </span>
                          <span className="text-gray-500">
                            Updated {formatTimeAgo(hasUpdate.timestamp)}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
              
              {liquidPositions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No liquid positions to update</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  
  // Render account reconciliation section
  const renderAccountSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* Section Header */}
      <button
        onClick={() => toggleSection('accounts')}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Account Reconciliation</h3>
            <p className="text-sm text-gray-500">Verify account balances</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {processedAccounts.filter(a => a.needsReconciliation).length > 0 && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
              {processedAccounts.filter(a => a.needsReconciliation).length} need attention
            </span>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSections.has('accounts') ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
      
      {/* Section Content */}
      <AnimatePresence>
        {expandedSections.has('accounts') && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100"
          >
            <div className="p-6">
              {/* Group accounts by institution */}
              {Object.entries(
                processedAccounts.reduce((groups, account) => {
                  const institution = account.institution || 'Other';
                  if (!groups[institution]) groups[institution] = [];
                  groups[institution].push(account);
                  return groups;
                }, {})
              ).map(([institution, accounts]) => (
                <div key={institution} className="mb-6 last:mb-0">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    {institution}
                  </h4>
                  
                  <div className="space-y-3">
                    {accounts.map(account => {
                      const category = CATEGORY_CONFIGS[account.account_category] || CATEGORY_CONFIGS.brokerage;
                      const CategoryIcon = category.icon;
                      const variance = variances[account.account_id];
                      const hasReconciliation = reconciliationData[`account_${account.account_id}`];
                      
                      return (
                        <div
                          key={account.account_id}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            hasReconciliation ? 'border-green-300 bg-green-50' : 
                            account.needsReconciliation ? 'border-amber-200 bg-amber-50' : 
                            'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                                <CategoryIcon className={`w-5 h-5 text-${category.color}-600`} />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">{account.account_name}</h5>
                                <p className="text-sm text-gray-500">
                                  {account.account_type} • Last: {formatTimeAgo(account.lastReconciled)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-500">App Balance</p>
                                <p className="font-semibold text-gray-900">
                                  {showValues ? formatCurrency(account.total_value) : '••••'}
                                </p>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  placeholder="Statement balance"
                                  value={reconciliationData[`account_${account.account_id}`]?.statementBalance ?? ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value)) {
                                      handleAccountReconciliation(account.account_id, value);
                                    }
                                  }}
                                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  step="0.01"
                                />
                                
                                {variance && (
                                  <div className={`p-2 rounded-lg bg-${variance.status.color}-100`}>
                                    <variance.status.icon className={`w-5 h-5 text-${variance.status.color}-600`} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {variance && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 pt-3 border-t border-gray-200"
                            >
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-4">
                                  <span className={`font-medium text-${variance.status.color}-700`}>
                                    Variance: {formatCurrency(variance.variance)} 
                                    ({formatPercentage(variance.variancePercent)})
                                  </span>
                                  <span className={`px-2 py-0.5 bg-${variance.status.color}-100 text-${variance.status.color}-700 rounded-full text-xs`}>
                                    {variance.status.label}
                                  </span>
                                </div>
                                
                                {Math.abs(variance.variancePercent) > 1 && (
                                  <button
                                    onClick={() => {
                                      setSelectedAccount(account);
                                      setActiveView('review');
                                    }}
                                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                                  >
                                    Review positions
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  
  // Render dashboard view
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Health Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Reconciliation Health</h2>
            <p className="text-blue-100">Keep your NestEgg accurate and up-to-date</p>
          </div>
          
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="white"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(reconciliationHealth / 100) * 352} 352`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold">{reconciliationHealth}%</p>
                <p className="text-sm text-blue-100">Health Score</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-blue-100 text-sm">Accounts</p>
            <p className="text-xl font-bold">{processedAccounts.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-blue-100 text-sm">Need Attention</p>
            <p className="text-xl font-bold">
              {processedAccounts.filter(a => a.needsReconciliation).length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-blue-100 text-sm">Last Update</p>
            <p className="text-xl font-bold">
              {reconciliationHistoryRef.current[0] ? 
                formatTimeAgo(reconciliationHistoryRef.current[0].date) : 'Never'}
            </p>
          </div>
        </div>
      </motion.div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setExpandedSections(new Set(['quick']));
            setActiveView('quick');
          }}
          className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 text-blue-500" />
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Quick Updates</h3>
          <p className="text-sm text-gray-500">Update cash & credit cards</p>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setExpandedSections(new Set(['accounts']));
            setActiveView('accounts');
          }}
          className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-300 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Full Reconciliation</h3>
          <p className="text-sm text-gray-500">Verify all account balances</p>
        </motion.button>
      </div>
      
      {/* Recent Activity */}
      {reconciliationHistoryRef.current.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          
          <div className="space-y-3">
            {reconciliationHistoryRef.current.slice(0, 3).map((rec, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">
                    {rec.accounts?.length || 0} accounts reconciled
                  </p>
                  <p className="text-sm text-gray-500">{formatTimeAgo(rec.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {showValues ? formatCurrency(rec.totalValue) : '••••'}
                  </p>
                  <p className="text-sm text-gray-500">{rec.positions || 0} positions</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
  
  // Main render
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="max-w-5xl"
      showHeader={false}
    >
      <div className="min-h-[85vh] bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Smart Reconciliation</h1>
                <p className="text-sm text-gray-500">Keep your NestEgg accurate</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeView === 'dashboard' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('quick')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeView === 'quick' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Quick
                </button>
                <button
                  onClick={() => setActiveView('accounts')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeView === 'accounts' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Accounts
                </button>
              </div>
              
              {/* Show/hide values */}
              <button
                onClick={() => setShowValues(!showValues)}
                className={`p-2 rounded-lg transition-all ${
                  showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              
              {/* Refresh */}
              <button
                onClick={() => actions.refreshData()}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={state.accounts.loading || state.detailedPositions.loading}
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${
                  state.accounts.loading ? 'animate-spin' : ''
                }`} />
              </button>
              
              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {activeView === 'dashboard' && renderDashboard()}
          
          {activeView === 'quick' && (
            <div className="space-y-6">
              {renderQuickUpdateSection()}
              
              {/* Summary of changes */}
              {Object.keys(reconciliationData).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <h3 className="font-semibold text-gray-900 mb-4">Pending Changes</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {Object.keys(reconciliationData).filter(k => k.startsWith('pos_')).length} positions updated
                    </p>
                    <p className="text-sm text-gray-600">
                      {Object.keys(reconciliationData).filter(k => k.startsWith('account_')).length} accounts reconciled
                    </p>
                  </div>
                  
                  <button
                    onClick={submitReconciliation}
                    disabled={isSubmitting}
                    className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Complete Reconciliation'}
                  </button>
                </motion.div>
              )}
            </div>
          )}
          
          {activeView === 'accounts' && (
            <div className="space-y-6">
              {renderAccountSection()}
              
              {/* Action buttons */}
              {Object.keys(variances).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Ready to Submit</h3>
                      <p className="text-sm text-gray-500">
                        {Object.keys(variances).length} accounts verified
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setVariances({});
                          setReconciliationData({});
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Clear All
                      </button>
                      
                      <button
                        onClick={submitReconciliation}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Complete Reconciliation
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
        
        {/* Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
                message.type === 'success' ? 'bg-green-500 text-white' :
                message.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Confetti */}
        {confetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sparkles className="w-32 h-32 text-yellow-400 animate-pulse" />
            </motion.div>
          </div>
        )}
      </div>
    </FixedModal>
  );
};

// Export button component for navbar integration
export const QuickReconciliationButton2 = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center text-white py-2 px-5 transition-all duration-300 transform hover:scale-105 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"></div>
        <div className="relative flex items-center">
          <Target className={`
            w-5 h-5 mr-2 transition-all duration-300
            ${isHovered ? 'text-white rotate-12' : 'text-blue-400'}
          `} />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">
            Smart Reconcile
          </span>
          {isHovered && (
            <Sparkles className="w-4 h-4 ml-2 text-yellow-300 animate-pulse" />
          )}
        </div>
        <div className="absolute -top-1 -right-1">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
          </span>
        </div>
      </button>
      
      <QuickReconciliationModal2 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default QuickReconciliationModal2;