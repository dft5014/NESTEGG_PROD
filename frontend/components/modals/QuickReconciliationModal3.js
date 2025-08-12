import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FixedModal from './FixedModal';
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import {
  TrendingUp, TrendingDown, Activity, Target, Award, Timer,
  CheckCircle, AlertCircle, Info, Clock, Shield, Zap,
  DollarSign, Hash, Calculator, ChevronDown, ChevronUp,
  FileText, BarChart3, Save, AlertTriangle, CheckSquare,
  Plus, Minus, ArrowUpRight, ArrowDownRight, Briefcase,
  CreditCard, GitBranch, Layers, Trophy, Flame, Sparkles,
  RefreshCw, Eye, EyeOff, Edit3, Search, Filter, X,
  ChevronRight, Home, Wallet, PiggyBank, Landmark,
  Percent, LineChart, Package, Settings, HelpCircle,
  MousePointer, Keyboard, Volume2, VolumeX, Vibrate,
  Star, Gauge, TrendingUp as TrendUp, CircleDollarSign,
  Bell, BellOff, Database, Receipt, TabletSmartphone
} from 'lucide-react';

// ============= RECONCILIATION CONTEXT =============
const ReconciliationContext = createContext(null);

const useReconciliation = () => {
  const context = useContext(ReconciliationContext);
  if (!context) throw new Error('useReconciliation must be used within ReconciliationProvider');
  return context;
};

// ============= CONSTANTS =============
const ASSET_CONFIGS = {
  cash: { 
    color: 'emerald', 
    icon: DollarSign, 
    gradient: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50', 
    borderColor: 'border-emerald-200' 
  },
  credit_card: { 
    color: 'red', 
    icon: CreditCard, 
    gradient: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-50', 
    borderColor: 'border-red-200' 
  },
  loan: { 
    color: 'orange', 
    icon: Receipt, 
    gradient: 'from-orange-500 to-amber-600',
    bgLight: 'bg-orange-50', 
    borderColor: 'border-orange-200' 
  },
  mortgage: { 
    color: 'purple', 
    icon: Home, 
    gradient: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-50', 
    borderColor: 'border-purple-200' 
  },
  investment: { 
    color: 'blue', 
    icon: TrendingUp, 
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50', 
    borderColor: 'border-blue-200' 
  },
  retirement: { 
    color: 'indigo', 
    icon: PiggyBank, 
    gradient: 'from-indigo-500 to-purple-600',
    bgLight: 'bg-indigo-50', 
    borderColor: 'border-indigo-200' 
  },
  crypto: { 
    color: 'yellow', 
    icon: CircleDollarSign, 
    gradient: 'from-yellow-500 to-orange-600',
    bgLight: 'bg-yellow-50', 
    borderColor: 'border-yellow-200' 
  },
  other: { 
    color: 'gray', 
    icon: Wallet, 
    gradient: 'from-gray-500 to-slate-600',
    bgLight: 'bg-gray-50', 
    borderColor: 'border-gray-200' 
  }
};

const VARIANCE_THRESHOLDS = {
  excellent: { max: 0.5, color: 'emerald', icon: CheckCircle },
  good: { max: 2, color: 'green', icon: CheckSquare },
  warning: { max: 5, color: 'yellow', icon: AlertCircle },
  critical: { max: 10, color: 'orange', icon: AlertTriangle },
  severe: { max: Infinity, color: 'red', icon: AlertTriangle }
};

const ACHIEVEMENTS = {
  quick_reconciler: { 
    icon: Zap, 
    title: 'Speed Demon', 
    desc: 'Reconciled in under 2 minutes' 
  },
  perfect_month: { 
    icon: Trophy, 
    title: 'Perfect Month', 
    desc: 'All accounts reconciled monthly' 
  },
  accuracy_master: { 
    icon: Target, 
    title: 'Precision Expert', 
    desc: 'Variance under 0.5% consistently' 
  },
  daily_habit: { 
    icon: Flame, 
    title: 'Daily Discipline', 
    desc: '7-day reconciliation streak' 
  },
  portfolio_guardian: { 
    icon: Shield, 
    title: 'Portfolio Guardian', 
    desc: '100% accounts tracked' 
  }
};

// ============= UTILITY FUNCTIONS =============
const getVarianceStatus = (percent) => {
  const absPercent = Math.abs(percent);
  for (const [key, config] of Object.entries(VARIANCE_THRESHOLDS)) {
    if (absPercent <= config.max) return key;
  }
  return 'severe';
};

const calculateReconciliationScore = (accounts, positions, variances) => {
  const weights = {
    accountCoverage: 0.3,
    positionAccuracy: 0.3,
    varianceControl: 0.2,
    recency: 0.2
  };
  
  const accountScore = accounts.length > 0 ? 
    (Object.keys(variances).filter(k => k.startsWith('account_')).length / accounts.length) * 100 : 0;
  
  const positionScore = positions.length > 0 ?
    (Object.keys(variances).filter(k => k.startsWith('pos_')).length / positions.length) * 100 : 0;
  
  const varianceScore = Object.values(variances).length > 0 ?
    Math.max(0, 100 - Object.values(variances).reduce((sum, v) => 
      sum + Math.abs(v.variancePercent || 0), 0) / Object.values(variances).length) : 100;
  
  const recencyScore = 100; // Will be calculated from history
  
  return Math.round(
    accountScore * weights.accountCoverage +
    positionScore * weights.positionAccuracy +
    varianceScore * weights.varianceControl +
    recencyScore * weights.recency
  );
};

// ============= HOOKS =============
const useReconciliationHistory = () => {
  const [history, setHistory] = useState([]);
  const [patterns, setPatterns] = useState(new Map());
  
  useEffect(() => {
    const stored = localStorage.getItem('nestegg_reconciliation_v3');
    if (stored) {
      const parsed = JSON.parse(stored);
      setHistory(parsed.history || []);
      setPatterns(new Map(parsed.patterns || []));
    }
  }, []);
  
  const saveHistory = useCallback((entry) => {
    const newHistory = [entry, ...history].slice(0, 100);
    const newPatterns = detectPatterns(newHistory);
    
    localStorage.setItem('nestegg_reconciliation_v3', JSON.stringify({
      history: newHistory,
      patterns: Array.from(newPatterns.entries())
    }));
    
    setHistory(newHistory);
    setPatterns(newPatterns);
  }, [history]);
  
  const detectPatterns = (historyData) => {
    const patterns = new Map();
    
    // Detect monthly patterns for each account
    historyData.forEach(entry => {
      entry.changes?.forEach(change => {
        const key = `${change.type}_${change.id}`;
        const existing = patterns.get(key) || [];
        existing.push(change.amount);
        
        if (existing.length >= 3) {
          // Calculate average monthly change
          const avg = existing.reduce((a, b) => a + b, 0) / existing.length;
          const stdDev = Math.sqrt(existing.reduce((sum, val) => 
            sum + Math.pow(val - avg, 2), 0) / existing.length);
          
          patterns.set(key, {
            average: avg,
            stdDev,
            confidence: stdDev < avg * 0.1 ? 'high' : 'medium',
            samples: existing.length
          });
        }
      });
    });
    
    return patterns;
  };
  
  return { history, patterns, saveHistory };
};

const useVarianceDetection = (positions, accounts) => {
  const { patterns } = useReconciliationHistory();
  
  const detectVariance = useCallback((current, expected) => {
    const variance = expected - current;
    const percent = current !== 0 ? (variance / current) * 100 : 0;
    
    // Check if variance matches known patterns
    const possibleCauses = [];
    
    if (Math.abs(percent) < 0.5) {
      possibleCauses.push({ type: 'rounding', confidence: 0.9 });
    }
    
    if (variance > 0 && variance % 100 === 0) {
      possibleCauses.push({ type: 'dividend', confidence: 0.7 });
    }
    
    if (variance < 0 && Math.abs(variance) < current * 0.01) {
      possibleCauses.push({ type: 'fee', confidence: 0.8 });
    }
    
    return {
      variance,
      percent,
      status: getVarianceStatus(percent),
      possibleCauses,
      suggestedAction: percent > 5 ? 'investigate' : 'accept'
    };
  }, [patterns]);
  
  return { detectVariance };
};

// ============= SUB-COMPONENTS =============

// Dashboard Component
const ReconciliationDashboard = ({ onNavigate }) => {
  const { 
    accounts, 
    positions, 
    liabilities,
    reconciliationScore,
    lastReconciliation,
    needsAttention 
  } = useReconciliation();
  
  const stats = [
    { 
      label: 'Portfolio Health', 
      value: `${reconciliationScore}%`, 
      icon: Activity,
      color: reconciliationScore > 80 ? 'text-green-600' : 'text-yellow-600' 
    },
    { 
      label: 'Accounts', 
      value: accounts.length, 
      icon: Briefcase,
      color: 'text-blue-600' 
    },
    { 
      label: 'Positions', 
      value: positions.length, 
      icon: Package,
      color: 'text-purple-600' 
    },
    { 
      label: 'Needs Attention', 
      value: needsAttention.length, 
      icon: AlertCircle,
      color: needsAttention.length > 0 ? 'text-red-600' : 'text-gray-400' 
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Health Score Ring */}
      <div className="flex justify-center">
        <div className="relative w-48 h-48">
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200"
            />
            <motion.circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${reconciliationScore * 5.52} 552`}
              className={reconciliationScore > 80 ? 'text-green-500' : 
                        reconciliationScore > 60 ? 'text-yellow-500' : 'text-red-500'}
              initial={{ strokeDasharray: '0 552' }}
              animate={{ strokeDasharray: `${reconciliationScore * 5.52} 552` }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{reconciliationScore}%</span>
            <span className="text-sm text-gray-500">Portfolio Health</span>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => onNavigate(stat.label.toLowerCase().replace(' ', '_'))}
          >
            <div className="flex items-center justify-between">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{stat.label}</p>
          </motion.div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('quick')}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-4 flex items-center justify-between group"
          >
            <div className="text-left">
              <p className="font-semibold">Quick Update</p>
              <p className="text-sm opacity-90">Cash & Credit Cards</p>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('validate')}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl p-4 flex items-center justify-between group"
          >
            <div className="text-left">
              <p className="font-semibold">Validate Accounts</p>
              <p className="text-sm opacity-90">Compare to Statements</p>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('positions')}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 flex items-center justify-between group"
          >
            <div className="text-left">
              <p className="font-semibold">Position Details</p>
              <p className="text-sm opacity-90">Individual Holdings</p>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </div>
      
      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5" />
            Needs Your Attention
          </h3>
          <div className="space-y-2">
            {needsAttention.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full bg-red-500`} />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.reason}</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate(item.type, item.id)}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Review →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Update Panel
const QuickUpdatePanel = ({ onComplete }) => {
  const { 
    accounts, 
    positions, 
    liabilities,
    updateDraft,
    getDraft 
  } = useReconciliation();
  
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [updates, setUpdates] = useState({});
  const [showKeyboard, setShowKeyboard] = useState(false);
  
  // Filter for quick update items (cash, credit cards, frequently changing accounts)
  const quickItems = useMemo(() => {
    const items = [];
    
    // Add cash positions
    positions.filter(p => p.asset_type === 'cash').forEach(p => {
      items.push({
        id: `pos_${p.item_id}`,
        type: 'cash',
        name: p.name || 'Cash',
        account: accounts.find(a => a.id === p.account_id)?.name,
        currentValue: p.current_value,
        icon: DollarSign,
        color: 'emerald'
      });
    });
    
    // Add credit cards
    liabilities.filter(l => l.type === 'credit_card').forEach(l => {
      items.push({
        id: `liability_${l.id}`,
        type: 'credit_card',
        name: l.name,
        account: l.institution_name,
        currentValue: -l.current_balance,
        icon: CreditCard,
        color: 'red'
      });
    });
    
    return items;
  }, [accounts, positions, liabilities]);
  
  const handleQuickAdjust = (itemId, adjustment) => {
    const item = quickItems.find(i => i.id === itemId);
    if (!item) return;
    
    const currentValue = updates[itemId]?.value ?? item.currentValue;
    const newValue = currentValue + adjustment;
    
    setUpdates(prev => ({
      ...prev,
      [itemId]: {
        value: newValue,
        originalValue: item.currentValue,
        timestamp: new Date().toISOString()
      }
    }));
    
    updateDraft(itemId, newValue);
  };
  
  const handleValueChange = (itemId, value) => {
    const item = quickItems.find(i => i.id === itemId);
    if (!item) return;
    
    setUpdates(prev => ({
      ...prev,
      [itemId]: {
        value: parseFloat(value) || 0,
        originalValue: item.currentValue,
        timestamp: new Date().toISOString()
      }
    }));
    
    updateDraft(itemId, parseFloat(value) || 0);
  };
  
  const handleBulkSelect = () => {
    if (selectedItems.size === quickItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(quickItems.map(i => i.id)));
    }
  };
  
  const handleComplete = () => {
    onComplete(updates);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          Quick Updates
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Keyboard className="w-5 h-5" />
          </button>
          <button
            onClick={handleBulkSelect}
            className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            {selectedItems.size === quickItems.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {quickItems.map((item) => {
          const Icon = item.icon;
          const hasUpdate = updates[item.id];
          const currentValue = updates[item.id]?.value ?? item.currentValue;
          const variance = hasUpdate ? currentValue - item.currentValue : 0;
          const variancePercent = item.currentValue !== 0 ? 
            (variance / item.currentValue) * 100 : 0;
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white rounded-xl border-2 p-4 transition-all ${
                hasUpdate ? 'border-blue-400 shadow-lg' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedItems);
                      if (e.target.checked) {
                        newSelected.add(item.id);
                      } else {
                        newSelected.delete(item.id);
                      }
                      setSelectedItems(newSelected);
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                    <Icon className={`w-5 h-5 text-${item.color}-600`} />
                  </div>
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.account}</p>
                  </div>
                </div>
                
                {hasUpdate && (
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      variance > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Quick adjust buttons */}
                <div className="flex gap-1">
                  {[-1000, -100, 100, 1000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => handleQuickAdjust(item.id, amount)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all
                        ${amount < 0 
                          ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                    >
                      {amount > 0 ? '+' : ''}{amount >= 1000 ? `${amount/1000}k` : amount}
                    </button>
                  ))}
                </div>
                
                {/* Value input */}
                <div className="flex-1">
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => handleValueChange(item.id, e.target.value)}
                    className="w-full px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
                
                {/* Reset button */}
                {hasUpdate && (
                  <button
                    onClick={() => {
                      setUpdates(prev => {
                        const newUpdates = { ...prev };
                        delete newUpdates[item.id];
                        return newUpdates;
                      });
                      updateDraft(item.id, null);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Summary */}
      {Object.keys(updates).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200"
        >
          <h3 className="font-semibold mb-2">Update Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Items Updated</p>
              <p className="text-2xl font-bold">{Object.keys(updates).length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Change</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  Object.values(updates).reduce((sum, u) => 
                    sum + (u.value - u.originalValue), 0
                  )
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleComplete}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Apply Updates
          </button>
        </motion.div>
      )}
      
      {/* Virtual Keyboard (if enabled) */}
      {showKeyboard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 z-50"
        >
          <div className="max-w-md mx-auto">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, '⌫'].map(key => (
                <button
                  key={key}
                  className="bg-gray-100 hover:bg-gray-200 rounded-lg py-3 text-lg font-semibold transition-colors"
                  onClick={() => {
                    // Handle keyboard input
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Account Validator Component
const AccountValidator = ({ onComplete }) => {
  const { accounts, positions, detectVariance } = useReconciliation();
  const [statementValues, setStatementValues] = useState({});
  const [variances, setVariances] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  
  const handleStatementValue = (accountId, value) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const variance = detectVariance(account.total_value, value);
    
    setStatementValues(prev => ({
      ...prev,
      [accountId]: value
    }));
    
    setVariances(prev => ({
      ...prev,
      [accountId]: variance
    }));
  };
  
  const toggleAccountExpansion = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-500" />
          Account Validation
        </h2>
        <div className="text-sm text-gray-600">
          Compare your NestEgg balances with actual statements
        </div>
      </div>
      
      <div className="space-y-4">
        {accounts.map(account => {
          const accountPositions = positions.filter(p => p.account_id === account.id);
          const variance = variances[account.id];
          const isExpanded = expandedAccounts.has(account.id);
          const hasStatement = statementValues[account.id] !== undefined;
          
          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                hasStatement ? 'border-purple-400 shadow-lg' : 'border-gray-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Briefcase className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="text-sm text-gray-500">
                        {account.institution_name} • {accountPositions.length} positions
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleAccountExpansion(account.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {isExpanded ? 
                      <ChevronUp className="w-5 h-5" /> : 
                      <ChevronDown className="w-5 h-5" />
                    }
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">NestEgg Balance</p>
                    <p className="text-xl font-bold">{formatCurrency(account.total_value)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Statement Balance</p>
                    <input
                      type="number"
                      value={statementValues[account.id] || ''}
                      onChange={(e) => handleStatementValue(account.id, parseFloat(e.target.value))}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      step="0.01"
                    />
                  </div>
                  
                  {variance && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Variance</p>
                      <div className={`flex items-center gap-2`}>
                        <span className={`text-xl font-bold ${
                          variance.variance > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(Math.abs(variance.variance))}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          VARIANCE_THRESHOLDS[variance.status].color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                          VARIANCE_THRESHOLDS[variance.status].color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                          VARIANCE_THRESHOLDS[variance.status].color === 'red' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {variance.percent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Variance Analysis */}
                {variance && variance.possibleCauses.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Possible Causes:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variance.possibleCauses.map((cause, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white rounded-lg text-xs">
                          {cause.type} ({Math.round(cause.confidence * 100)}% confidence)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Expanded Position List */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="space-y-2">
                    {accountPositions.map(position => (
                      <div key={position.item_id} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div>
                          <p className="font-medium">{position.name || position.symbol}</p>
                          <p className="text-sm text-gray-500">
                            {position.quantity} shares @ {formatCurrency(position.current_price)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(position.current_value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onComplete(statementValues, variances)}
          disabled={Object.keys(statementValues).length === 0}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          Validate {Object.keys(statementValues).length} Accounts
        </button>
      </div>
    </div>
  );
};

// Success Celebration Component
const SuccessCelebration = ({ stats, onClose }) => {
  useEffect(() => {
    // Trigger celebration animation
    // Visual celebration without external library
    
    // Play success sound (if enabled)
    try {
      const audio = new Audio('/sounds/success.mp3');
      audio.play().catch(() => {});
    } catch (e) {
      // Audio not available
    }
  }, []);
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
    >
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center"
          >
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-2">Reconciliation Complete!</h2>
          <p className="text-gray-600 mb-6">Your NestEgg is perfectly balanced</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-3xl font-bold text-green-600">{stats.itemsUpdated}</p>
              <p className="text-sm text-gray-600">Items Updated</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-3xl font-bold text-blue-600">{stats.accuracy}%</p>
              <p className="text-sm text-gray-600">Accuracy</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ============= MAIN COMPONENT =============
const QuickReconciliationModal3 = ({ isOpen, onClose }) => {
  // DataStore hooks - matching existing pattern
  const { 
    accounts: dataStoreAccounts, 
    loading: accountsLoading, 
    error: accountsError,
    refresh: refreshAccounts 
  } = useAccounts();

  const { 
    positions: dataStorePositions, 
    loading: positionsLoading, 
    error: positionsError,
    refresh: refreshPositions 
  } = useDetailedPositions();

  const { 
    liabilities: dataStoreLiabilities, 
    loading: liabilitiesLoading, 
    error: liabilitiesError,
    refreshData: refreshLiabilities 
  } = useGroupedLiabilities();

  const { 
    positions: groupedPositions,
    loading: groupedLoading,
    refresh: refreshGrouped
  } = useGroupedPositions();

  // Get additional actions from DataStore
  const { actions } = useDataStore();
  
  // Use dataStore values
  const accounts = dataStoreAccounts || [];
  const positions = dataStorePositions || [];
  const liabilities = dataStoreLiabilities || [];
  
  // State management
  const [currentView, setCurrentView] = useState('dashboard');
  const [draft, setDraft] = useState(new Map());
  const [variances, setVariances] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    hapticEnabled: true,
    autoSave: true,
    showTutorial: false
  });
  
  // Reconciliation tracking
  const { history, patterns, saveHistory } = useReconciliationHistory();
  const { detectVariance } = useVarianceDetection(positions, accounts);
  
  // Auto-save draft
  useEffect(() => {
    if (settings.autoSave && draft.size > 0) {
      const saveTimer = setTimeout(() => {
        localStorage.setItem('nestegg_reconciliation_draft', 
          JSON.stringify(Array.from(draft.entries()))
        );
      }, 10000); // Auto-save every 10 seconds
      
      return () => clearTimeout(saveTimer);
    }
  }, [draft, settings.autoSave]);
  
  // Load draft on mount
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem('nestegg_reconciliation_draft');
      if (savedDraft) {
        setDraft(new Map(JSON.parse(savedDraft)));
      }
      
      // Load settings
      const savedSettings = localStorage.getItem('nestegg_reconciliation_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    }
  }, [isOpen]);
  
  // Calculate metrics
  const reconciliationScore = useMemo(() => 
    calculateReconciliationScore(accounts, positions, variances),
    [accounts, positions, variances]
  );
  
  const needsAttention = useMemo(() => {
    const items = [];
    
    // Check for stale accounts (>30 days)
    accounts.forEach(account => {
      const lastRec = history.find(h => h.accountId === account.id);
      if (!lastRec || Date.now() - new Date(lastRec.date) > 30 * 24 * 60 * 60 * 1000) {
        items.push({
          id: account.id,
          type: 'account',
          name: account.name,
          reason: 'Not reconciled in 30+ days'
        });
      }
    });
    
    // Check for high variance positions
    Object.entries(variances).forEach(([key, variance]) => {
      if (Math.abs(variance.percent) > 5) {
        items.push({
          id: key,
          type: 'variance',
          name: key,
          reason: `${variance.percent.toFixed(2)}% variance detected`
        });
      }
    });
    
    return items;
  }, [accounts, history, variances]);
  
  // Context value
  const contextValue = {
    accounts,
    positions,
    liabilities,
    draft,
    variances,
    reconciliationScore,
    needsAttention,
    lastReconciliation: history[0],
    updateDraft: (key, value) => {
      setDraft(prev => {
        const newDraft = new Map(prev);
        if (value === null) {
          newDraft.delete(key);
        } else {
          newDraft.set(key, value);
        }
        return newDraft;
      });
    },
    getDraft: (key) => draft.get(key),
    detectVariance,
    settings,
    updateSettings: (newSettings) => {
      setSettings(newSettings);
      localStorage.setItem('nestegg_reconciliation_settings', JSON.stringify(newSettings));
    }
  };
  
  // Handle view navigation
  const handleNavigate = (view, id = null) => {
    setCurrentView(view);
    if (id) {
      // Focus on specific item
    }
  };
  
  // Handle reconciliation submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const updates = Array.from(draft.entries());
      const results = [];
      
      for (const [key, value] of updates) {
        if (key.startsWith('pos_')) {
          const posId = parseInt(key.replace('pos_', ''));
          const position = positions.find(p => p.item_id === posId);
          
          if (position) {
            const endpoint = position.asset_type === 'cash' ? '/cash' : '/positions';
            await fetchWithAuth(`${endpoint}/${posId}`, {
              method: 'PUT',
              body: JSON.stringify({ current_value: value })
            });
            
            results.push({ type: 'position', id: posId, value });
          }
        } else if (key.startsWith('liability_')) {
          const liabilityId = parseInt(key.replace('liability_', ''));
          await fetchWithAuth(`/liabilities/${liabilityId}`, {
            method: 'PUT',
            body: JSON.stringify({ current_balance: Math.abs(value) })
          });
          
          results.push({ type: 'liability', id: liabilityId, value });
        }
      }
      
      // Save to history
      saveHistory({
        date: new Date().toISOString(),
        changes: results,
        score: reconciliationScore,
        duration: Date.now() - performance.now()
      });
      
      // Clear draft
      setDraft(new Map());
      localStorage.removeItem('nestegg_reconciliation_draft');
      
      // Refresh all affected data in DataStore
      await Promise.all([
        refreshPositions(),  // Refresh detailed positions
        actions.fetchGroupedPositionsData(true),  // Refresh grouped positions
        actions.fetchPortfolioData(true),  // Refresh portfolio summary
        refreshAccounts(),  // Refresh accounts
        refreshLiabilities()  // Refresh liabilities
      ]);
      
      setShowSuccess(true);
      
      // Trigger haptic feedback
      if (settings.hapticEnabled && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
    } catch (error) {
      console.error('Reconciliation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (accountsLoading || positionsLoading || liabilitiesLoading) {
    return (
      <FixedModal isOpen={isOpen} onClose={onClose} title="Loading..." width="max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-8 h-8 text-blue-600" />
          </motion.div>
        </div>
      </FixedModal>
    );
  }
  
  return (
    <ReconciliationContext.Provider value={contextValue}>
      <FixedModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Smart Reconciliation"
        width="max-w-5xl"
      >
        <div className="relative">
          {/* Header with score */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 py-4 mb-6 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-600" />
                  <span className="text-2xl font-bold">
                    {reconciliationScore}% Health
                  </span>
                </div>
                {draft.size > 0 && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    {draft.size} pending updates
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, showTutorial: true }))}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                </button>
                <button
                  onClick={() => handleNavigate('settings')}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <Settings className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <ReconciliationDashboard onNavigate={handleNavigate} />
              </motion.div>
            )}
            
            {currentView === 'quick' && (
              <motion.div
                key="quick"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <QuickUpdatePanel 
                  onComplete={(updates) => {
                    Object.entries(updates).forEach(([key, value]) => {
                      contextValue.updateDraft(key, value.value);
                    });
                    handleNavigate('dashboard');
                  }}
                />
              </motion.div>
            )}
            
            {currentView === 'validate' && (
              <motion.div
                key="validate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AccountValidator
                  onComplete={(statements, variances) => {
                    setVariances(variances);
                    handleNavigate('dashboard');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Footer Actions */}
          {draft.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{draft.size} Pending Updates</p>
                  <p className="text-sm text-gray-600">Ready to sync with NestEgg</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDraft(new Map());
                      localStorage.removeItem('nestegg_reconciliation_draft');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Reconciliation'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </FixedModal>
      
      {/* Success Modal */}
      {showSuccess && (
        <SuccessCelebration
          stats={{
            itemsUpdated: draft.size,
            accuracy: reconciliationScore
          }}
          onClose={() => {
            setShowSuccess(false);
            onClose();
          }}
        />
      )}
    </ReconciliationContext.Provider>
  );
};

// ============= NAVBAR BUTTON COMPONENT =============
export const QuickReconciliationButton3 = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  
  // DataStore hooks - need to import at top if using button separately
  const { accounts } = useAccounts();
  const { state } = useDataStore();
  const portfolioSummary = state.portfolioSummary?.data || null;
  
  // Calculate reconciliation health
  const reconciliationHealth = useMemo(() => {
    const stored = localStorage.getItem('nestegg_reconciliation_v3');
    if (!stored) return { score: 75, needsAttention: true, lastUpdate: null };
    
    const { history = [] } = JSON.parse(stored);
    const lastRec = history[0];
    
    if (!lastRec) return { score: 75, needsAttention: true, lastUpdate: null };
    
    const daysSince = Math.floor((Date.now() - new Date(lastRec.date)) / (1000 * 60 * 60 * 24));
    const needsAttention = daysSince > 7;
    const score = lastRec.score || 75;
    
    return { score, needsAttention, lastUpdate: lastRec.date, daysSince };
  }, []);
  
  // Pulse animation for attention
  useEffect(() => {
    if (reconciliationHealth.needsAttention) {
      const timer = setInterval(() => {
        setPulseAnimation(true);
        setTimeout(() => setPulseAnimation(false), 2000);
      }, 10000); // Pulse every 10 seconds
      
      return () => clearInterval(timer);
    }
  }, [reconciliationHealth.needsAttention]);
  
  // Get status color
  const getStatusColor = () => {
    if (reconciliationHealth.score >= 90) return 'text-green-500 bg-green-50 border-green-200';
    if (reconciliationHealth.score >= 70) return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    return 'text-red-500 bg-red-50 border-red-200';
  };
  
  const getStatusIcon = () => {
    if (reconciliationHealth.score >= 90) return CheckCircle;
    if (reconciliationHealth.score >= 70) return AlertCircle;
    return AlertTriangle;
  };
  
  const StatusIcon = getStatusIcon();
  
  return (
    <>
      {/* Button */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          getStatusColor()
        } hover:shadow-md`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Health Indicator Ring */}
        <div className="relative">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="opacity-20"
            />
            <motion.circle
              cx="16"
              cy="16"
              r="14"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${reconciliationHealth.score * 0.88} 88`}
              initial={{ strokeDasharray: '0 88' }}
              animate={{ strokeDasharray: `${reconciliationHealth.score * 0.88} 88` }}
              transition={{ duration: 1 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <StatusIcon className="w-4 h-4" />
          </div>
        </div>
        
        {/* Text (hidden on mobile) */}
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold">Reconcile</p>
          <p className="text-[10px] opacity-75">
            {reconciliationHealth.daysSince !== undefined 
              ? `${reconciliationHealth.daysSince}d ago` 
              : 'Setup'
            }
          </p>
        </div>
        
        {/* Notification Badge */}
        {reconciliationHealth.needsAttention && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
            animate={pulseAnimation ? {
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            } : {}}
            transition={{ duration: 0.5 }}
          />
        )}
        
        {/* Hover Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Portfolio Health</span>
                  <span className={`text-2xl font-bold ${
                    reconciliationHealth.score >= 90 ? 'text-green-600' :
                    reconciliationHealth.score >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {reconciliationHealth.score}%
                  </span>
                </div>
                
                {reconciliationHealth.needsAttention && (
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-xs text-red-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {accounts.filter(a => !a.last_reconciled || 
                        (Date.now() - new Date(a.last_reconciled)) > 7 * 24 * 60 * 60 * 1000
                      ).length} accounts need attention
                    </p>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Last reconciled</span>
                    <span className="font-medium">
                      {reconciliationHealth.lastUpdate 
                        ? new Date(reconciliationHealth.lastUpdate).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">Total accounts</span>
                    <span className="font-medium">{accounts.length}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <p className="text-xs text-gray-600">Click to start reconciliation</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      
      {/* Modal */}
      <QuickReconciliationModal3 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default QuickReconciliationModal3;