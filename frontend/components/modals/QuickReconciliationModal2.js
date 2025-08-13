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
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/formatters';
import FixedModal from './FixedModal';
import debounce from 'lodash.debounce';

// Institution icons mapping
const INSTITUTION_ICONS = {
  'Bank of America': Building2,
  'Chase': Building,
  'Wells Fargo': Landmark,
  'Citibank': Building2,
  'US Bank': Building,
  'PNC': Building2,
  'Capital One': CreditCard,
  'American Express': CreditCard,
  'Discover': CreditCard,
  'Fidelity': BarChart3,
  'Vanguard': TrendingUp,
  'Schwab': Activity,
  'E*TRADE': LineChart,
  'TD Ameritrade': BarChart3,
  'Robinhood': Smartphone,
  'Coinbase': Coins,
  'Kraken': Coins,
  'Binance': Coins,
  'PayPal': Wallet,
  'Venmo': Smartphone,
  'Cash App': Smartphone,
  'Zelle': Send,
  'Chime': Smartphone,
  'SoFi': CircleDollarSign,
  'Ally': Building,
  'Marcus': Building2,
  'Default': Building2
};

// Account type configurations
const ACCOUNT_CONFIGS = {
  checking: { icon: Wallet, color: 'blue', label: 'Checking', gradient: 'from-blue-500 to-blue-600' },
  savings: { icon: PiggyBank, color: 'green', label: 'Savings', gradient: 'from-green-500 to-emerald-600' },
  credit_card: { icon: CreditCard, color: 'purple', label: 'Credit Card', gradient: 'from-purple-500 to-pink-600' },
  mortgage: { icon: Home, color: 'orange', label: 'Mortgage', gradient: 'from-orange-500 to-red-600' },
  auto_loan: { icon: Car, color: 'red', label: 'Auto Loan', gradient: 'from-red-500 to-pink-600' },
  student_loan: { icon: GraduationCap, color: 'indigo', label: 'Student Loan', gradient: 'from-indigo-500 to-purple-600' },
  personal_loan: { icon: DollarSign, color: 'pink', label: 'Personal Loan', gradient: 'from-pink-500 to-rose-600' },
  brokerage: { icon: TrendingUp, color: 'emerald', label: 'Brokerage', gradient: 'from-emerald-500 to-teal-600' },
  retirement: { icon: Trophy, color: 'amber', label: 'Retirement', gradient: 'from-amber-500 to-orange-600' },
  crypto: { icon: Coins, color: 'violet', label: 'Crypto', gradient: 'from-violet-500 to-purple-600' },
  cash: { icon: Banknote, color: 'green', label: 'Cash', gradient: 'from-green-500 to-emerald-600' },
  metal: { icon: Gem, color: 'yellow', label: 'Metals', gradient: 'from-yellow-500 to-amber-600' }
};

// Asset type configurations for securities
const ASSET_CONFIGS = {
  security: { 
    icon: TrendingUp, 
    color: 'blue', 
    gradient: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    hoverBg: 'hover:bg-blue-100',
    quickEdit: true
  },
  crypto: { 
    icon: Coins, 
    color: 'purple', 
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    hoverBg: 'hover:bg-purple-100',
    quickEdit: true
  },
  metal: { 
    icon: Gem, 
    color: 'yellow', 
    gradient: 'from-yellow-500 to-amber-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700',
    hoverBg: 'hover:bg-yellow-100',
    quickEdit: true
  },
  cash: { 
    icon: Banknote, 
    color: 'emerald', 
    gradient: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    hoverBg: 'hover:bg-emerald-100',
    quickEdit: false
  }
};

// Performance badge configurations
const PERFORMANCE_BADGES = {
  strongGain: { icon: FlameIcon, color: 'text-green-500', bg: 'bg-green-900/20', label: 'Strong Gain' },
  gain: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-900/20', label: 'Gain' },
  neutral: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-800', label: 'Neutral' },
  loss: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-900/20', label: 'Loss' },
  strongLoss: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-900/20', label: 'Strong Loss' }
};

// Helper function to get performance badge
const getPerformanceBadge = (percent) => {
  if (percent >= 10) return PERFORMANCE_BADGES.strongGain;
  if (percent >= 2) return PERFORMANCE_BADGES.gain;
  if (percent >= -2) return PERFORMANCE_BADGES.neutral;
  if (percent >= -10) return PERFORMANCE_BADGES.loss;
  return PERFORMANCE_BADGES.strongLoss;
};

// Variance status helper
const getVarianceStatus = (percent) => {
  const absPercent = Math.abs(percent);
  if (absPercent === 0) return 'perfect';
  if (absPercent < 0.5) return 'excellent';
  if (absPercent < 2) return 'good';
  if (absPercent < 5) return 'warning';
  return 'critical';
};

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
  // DataStore hooks
  const { state, actions } = useDataStore();
  const { 
    accounts: dataStoreAccounts, 
    loading: accountsLoading, 
    error: accountsError,
    refresh: refreshAccounts 
  } = useAccounts();
  const { 
    positions: detailedPositions, 
    loading: positionsLoading,
    refetch: refreshPositions 
  } = useDetailedPositions();
  const { 
    liabilities: groupedLiabilities, 
    loading: liabilitiesLoading,
    refresh: refreshLiabilities 
  } = useGroupedLiabilities();
  const {
    positions: groupedPositions,
    loading: groupedPositionsLoading,
    refreshData: refreshGroupedPositions
  } = useGroupedPositions();
  const { 
    summary: portfolioSummary,
    topPerformersPercent,
    topPerformersAmount,
    loading: summaryLoading,
    refresh: refreshSummary
  } = usePortfolioSummary();

  // State management
  const [currentView, setCurrentView] = useState('institutions'); // 'institutions' | 'securities' | 'history'
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [showValues, setShowValues] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('cash_debt'); // 'cash_debt' | 'investments'
  const [reconciliationData, setReconciliationData] = useState({});
  const [variances, setVariances] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set(['liquid', 'illiquid']));
  const [editingCell, setEditingCell] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [animateValues, setAnimateValues] = useState({});
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [filterInstitution, setFilterInstitution] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showHelp, setShowHelp] = useState(false);
  const [reconciliationHistory, setReconciliationHistory] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  
  // Refs
  const reconciliationHistoryRef = useRef([]);
  const autoSaveTimeoutRef = useRef(null);
  const gridRef = useRef(null);
  const inputRefs = useRef({});
  const lastFocusedInput = useRef(null);

  // Combined loading state
  const isLoading = accountsLoading || positionsLoading || liabilitiesLoading || summaryLoading || groupedPositionsLoading;

  // Process all positions (detailed positions for cash/debt, grouped for securities)
  const processedPositions = useMemo(() => {
    if (!detailedPositions) return [];
    
    return detailedPositions.map(pos => ({
      ...pos,
      identifier: `${pos.asset_type}_${pos.item_id}`,
      display_name: pos.name || pos.identifier || 'Unknown',
      position_type: pos.asset_type,
      current_price: pos.latest_price || 0,
      quantity: pos.quantity || 1,
      is_liquid: ['security', 'crypto', 'cash', 'metal'].includes(pos.asset_type),
      is_liability: ['credit_card', 'loan', 'mortgage'].includes(pos.asset_type)
    }));
  }, [detailedPositions]);

  // Separate liquid and illiquid positions
  const liquidPositions = useMemo(() => 
    processedPositions.filter(p => p.is_liquid && !p.is_liability),
    [processedPositions]
  );
  
  const illiquidPositions = useMemo(() => 
    processedPositions.filter(p => !p.is_liquid && !p.is_liability),
    [processedPositions]
  );

  // Process and organize data by institution (ENHANCED)
  const institutionData = useMemo(() => {
    if (!dataStoreAccounts || !detailedPositions) return {};

    const data = {};
    
    // Group accounts by institution
    dataStoreAccounts.forEach(account => {
      const institution = account.institution || 'Other';
      if (!data[institution]) {
        data[institution] = {
          name: institution,
          accounts: [],
          totalValue: 0,
          totalOriginal: 0,
          totalLiabilities: 0,
          icon: INSTITUTION_ICONS[institution] || INSTITUTION_ICONS.Default,
          needsReconciliation: false,
          lastUpdated: null,
          accountTypes: new Set(),
          healthScore: 100
        };
      }
      
      // Find positions for this account
      const accountPositions = detailedPositions.filter(pos => 
        pos.account_id === account.id && 
        (pos.asset_type === 'cash' || pos.asset_type === 'credit_card' || 
         pos.asset_type === 'loan' || pos.asset_type === 'mortgage')
      );

      // Calculate account totals
      const accountValue = accountPositions.reduce((sum, pos) => {
        const value = pos.asset_type === 'cash' ? pos.current_value : -Math.abs(pos.current_value);
        return sum + value;
      }, 0);

      // Get reconciliation history for this account
      const lastReconciliation = reconciliationHistoryRef.current.find(r => 
        r.accountId === account.id
      );

      const accountData = {
        ...account,
        positions: accountPositions,
        currentValue: accountValue || 0,
        statementValue: reconciliationData[`account_${account.id}`]?.statementBalance || accountValue || 0,
        variance: 0,
        variancePercent: 0,
        needsUpdate: false,
        lastReconciled: lastReconciliation?.date,
        daysSinceReconciliation: lastReconciliation ? 
          Math.floor((Date.now() - new Date(lastReconciliation.date)) / (1000 * 60 * 60 * 24)) : null,
        reconciliationStatus: !lastReconciliation ? 'never' : 
          (Math.floor((Date.now() - new Date(lastReconciliation.date)) / (1000 * 60 * 60 * 24)) <= 7 ? 'recent' :
           Math.floor((Date.now() - new Date(lastReconciliation.date)) / (1000 * 60 * 60 * 24)) <= 14 ? 'due' : 'overdue')
      };

      // Calculate variance
      if (reconciliationData[`account_${account.id}`]?.statementBalance !== undefined) {
        accountData.variance = accountData.statementValue - accountData.currentValue;
        accountData.variancePercent = accountData.currentValue !== 0 ? 
          (accountData.variance / Math.abs(accountData.currentValue)) * 100 : 0;
        accountData.needsUpdate = Math.abs(accountData.variance) > 0.01;
      }

      // Track account types for this institution
      data[institution].accountTypes.add(account.account_type || 'unknown');
      
      data[institution].accounts.push(accountData);
      data[institution].totalValue += accountValue;
      data[institution].totalOriginal += accountValue;
      
      if (accountValue < 0) {
        data[institution].totalLiabilities += Math.abs(accountValue);
      }
      
      // Update reconciliation status
      if (accountData.needsUpdate || accountData.reconciliationStatus === 'overdue') {
        data[institution].needsReconciliation = true;
        data[institution].healthScore -= 10;
      }
    });

    // Calculate institution health scores
    Object.values(data).forEach(inst => {
      inst.healthScore = Math.max(0, Math.min(100, inst.healthScore));
    });

    return data;
  }, [dataStoreAccounts, detailedPositions, reconciliationData]);

  // Process securities/investments for separate tab (ENHANCED)
  const securitiesData = useMemo(() => {
    if (!groupedPositions) return [];
    
    return groupedPositions.filter(pos => 
      pos.asset_type === 'security' || 
      pos.asset_type === 'crypto' || 
      pos.asset_type === 'metal'
    ).map(pos => ({
      ...pos,
      statementValue: reconciliationData[`pos_${pos.identifier}`]?.value || pos.total_current_value,
      statementQuantity: reconciliationData[`pos_${pos.identifier}`]?.quantity || pos.total_quantity,
      variance: 0,
      variancePercent: 0,
      needsUpdate: false,
      performanceBadge: getPerformanceBadge(pos.total_gain_loss_pct || 0),
      assetConfig: ASSET_CONFIGS[pos.asset_type] || ASSET_CONFIGS.security
    })).sort((a, b) => {
      if (sortBy === 'value') return b.total_current_value - a.total_current_value;
      if (sortBy === 'gain') return b.total_gain_loss - a.total_gain_loss;
      if (sortBy === 'gainPercent') return b.total_gain_loss_pct - a.total_gain_loss_pct;
      // Handle null/undefined names
      const nameA = a.name || a.identifier || '';
      const nameB = b.name || b.identifier || '';
      return nameA.localeCompare(nameB);
    });
  }, [groupedPositions, reconciliationData, sortBy]);

  // Get unique institutions for filtering
  const uniqueInstitutions = useMemo(() => {
    const institutions = [...new Set(Object.keys(institutionData))];
    return institutions.sort();
  }, [institutionData]);

  // Calculate reconciliation health score (ENHANCED)
  const reconciliationHealth = useMemo(() => {
    const totalAccounts = dataStoreAccounts?.length || 0;
    if (totalAccounts === 0) return 100;
    
    const weights = {
      accountsReconciled: 0.4,
      liquidPositionsUpdated: 0.3,
      recency: 0.3
    };
    
    // Accounts score
    const reconciledAccounts = Object.values(institutionData).reduce((sum, inst) => 
      sum + inst.accounts.filter(a => a.reconciliationStatus === 'recent').length, 0
    );
    const accountScore = (reconciledAccounts / totalAccounts) * 100;
    
    // Liquid positions score
    const liquidUpdated = liquidPositions.filter(p => {
      const data = reconciliationData[`pos_${p.item_id}`];
      return data && (Date.now() - new Date(data.timestamp)) < 14 * 24 * 60 * 60 * 1000;
    }).length;
    const liquidScore = liquidPositions.length > 0 ? 
      (liquidUpdated / liquidPositions.length) * 100 : 100;
    
    // Recency score
    const lastFullRec = reconciliationHistoryRef.current[0];
    const daysSinceLastFull = lastFullRec ? 
      Math.floor((Date.now() - new Date(lastFullRec.date)) / (1000 * 60 * 60 * 24)) : 30;
    const recencyScore = Math.max(0, 100 - (daysSinceLastFull * 3));
    
    return Math.round(
      accountScore * weights.accountsReconciled +
      liquidScore * weights.liquidPositionsUpdated +
      recencyScore * weights.recency
    );
  }, [dataStoreAccounts, institutionData, liquidPositions, reconciliationData]);

  // Helper functions
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const getVarianceColor = (percent) => {
    const absPercent = Math.abs(percent);
    if (absPercent === 0) return 'text-green-600';
    if (absPercent < 1) return 'text-yellow-600';
    if (absPercent < 5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getVarianceIcon = (variance, percent) => {
    if (Math.abs(variance) < 0.01) return <Check className="w-4 h-4 text-green-600" />;
    if (variance > 0) return <ArrowUpRight className="w-4 h-4 text-orange-600" />;
    return <ArrowDownRight className="w-4 h-4 text-orange-600" />;
  };

  // Load saved reconciliation data and history
  useEffect(() => {
    // Load progress
    const saved = localStorage.getItem('reconciliationProgress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReconciliationData(parsed);
        showMessage('info', 'Loaded saved progress');
      } catch (e) {
        console.error('Failed to load saved progress:', e);
      }
    }
    
    // Load history
    const history = localStorage.getItem('reconciliationHistory');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        setReconciliationHistory(parsed);
        reconciliationHistoryRef.current = parsed;
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Auto-save functionality
  const autoSave = useCallback(
    debounce(() => {
      if (autoSaveEnabled && Object.keys(reconciliationData).length > 0) {
        localStorage.setItem('reconciliationProgress', JSON.stringify(reconciliationData));
        setUnsavedChanges(false);
        showMessage('success', 'Progress saved');
      }
    }, 2000),
    [reconciliationData, autoSaveEnabled]
  );

  useEffect(() => {
    if (unsavedChanges) {
      autoSave();
    }
  }, [reconciliationData, unsavedChanges, autoSave]);

  // Handle statement balance input
  const handleStatementInput = (accountId, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setReconciliationData(prev => ({
      ...prev,
      [`account_${accountId}`]: {
        statementBalance: numValue,
        timestamp: new Date().toISOString()
      }
    }));
    setUnsavedChanges(true);

    // Animate the value change
    setAnimateValues(prev => ({ ...prev, [accountId]: true }));
    setTimeout(() => {
      setAnimateValues(prev => ({ ...prev, [accountId]: false }));
    }, 500);
  };

  // Handle position quick update
  const handleQuickUpdate = (positionId, newValue, field = 'value') => {
    setReconciliationData(prev => ({
      ...prev,
      [`pos_${positionId}`]: {
        ...prev[`pos_${positionId}`],
        [field]: newValue,
        timestamp: new Date().toISOString(),
        originalValue: processedPositions.find(p => p.item_id === positionId)?.current_value
      }
    }));
    
    // Animate the value change
    setAnimateValues(prev => ({ ...prev, [positionId]: true }));
    setTimeout(() => {
      setAnimateValues(prev => ({ ...prev, [positionId]: false }));
    }, 500);
    
    setUnsavedChanges(true);
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e, accountId, accountIndex) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (!institutionData || !selectedInstitution) return;
      const accounts = institutionData[selectedInstitution]?.accounts || [];
      const nextIndex = e.key === 'Tab' && e.shiftKey ? accountIndex - 1 : accountIndex + 1;
      
      if (nextIndex >= 0 && nextIndex < accounts.length) {
        const nextAccountId = accounts[nextIndex].id;
        const nextInput = inputRefs.current[`input_${nextAccountId}`];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      } else if (e.key === 'Enter' && nextIndex === accounts.length) {
        // Move to update all button
        handleUpdateAllInstitution();
      }
    } else if (e.key === 'Escape') {
      e.target.blur();
    }
  }, [institutionData, selectedInstitution]);

  // Update NestEgg balance to match statement
  const handleUpdateBalance = async (account) => {
    if (!reconciliationData[`account_${account.id}`]?.statementBalance) {
      showMessage('error', 'Please enter a statement balance first');
      return;
    }

    setIsSubmitting(true);
    try {
      const statementBalance = reconciliationData[`account_${account.id}`].statementBalance;
      const updates = [];

      // Update each position in the account
      for (const position of account.positions) {
        // Calculate the proportional adjustment
        const currentTotal = account.currentValue;
        const proportion = currentTotal !== 0 ? position.current_value / currentTotal : 1;
        const newValue = statementBalance * proportion;

        const endpoint = position.asset_type === 'cash' ? '/cash' :
                        position.asset_type === 'credit_card' ? '/liabilities' :
                        position.asset_type === 'loan' ? '/liabilities' :
                        position.asset_type === 'mortgage' ? '/liabilities' : null;

        if (endpoint) {
          updates.push(
            fetchWithAuth(`${endpoint}/${position.item_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...position,
                current_balance: Math.abs(newValue),
                current_value: newValue
              })
            })
          );
        }
      }

      await Promise.all(updates);
      
      // Record reconciliation
      await fetchWithAuth('/reconciliation/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: account.id,
          app_balance: account.currentValue,
          actual_balance: statementBalance,
          reconcile_balance: true
        })
      });

      // Update history
      const newHistory = [{
        accountId: account.id,
        accountName: account.name,
        institution: account.institution,
        date: new Date().toISOString(),
        previousBalance: account.currentValue,
        newBalance: statementBalance,
        variance: statementBalance - account.currentValue
      }, ...reconciliationHistory].slice(0, 50); // Keep last 50
      
      setReconciliationHistory(newHistory);
      localStorage.setItem('reconciliationHistory', JSON.stringify(newHistory));

      // Refresh data
      await Promise.all([
        refreshAccounts(),
        refreshPositions(),
        refreshLiabilities(),
        refreshSummary()
      ]);

      showMessage('success', `Updated ${account.name || account.account_name || 'account'}`);      

      // Clear this account's reconciliation data
      setReconciliationData(prev => {
        const updated = { ...prev };
        delete updated[`account_${account.id}`];
        return updated;
      });

    } catch (error) {
      console.error('Error updating balance:', error);
      showMessage('error', 'Failed to update balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk update all accounts in institution
  const handleUpdateAllInstitution = async () => {
    if (!selectedInstitution) return;
    
    const accounts = institutionData[selectedInstitution]?.accounts || [];
    const toUpdate = accounts.filter(acc => 
      reconciliationData[`account_${acc.id}`]?.statementBalance !== undefined &&
      Math.abs(reconciliationData[`account_${acc.id}`].statementBalance - acc.currentValue) > 0.01
    );

    if (toUpdate.length === 0) {
      showMessage('info', 'No accounts need updating');
      return;
    }

    setIsSubmitting(true);
    try {
      for (const account of toUpdate) {
        await handleUpdateBalance(account);
      }
      
      showMessage('success', `Updated ${toUpdate.length} accounts`);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
    } catch (error) {
      console.error('Error in bulk update:', error);
      showMessage('error', 'Some updates failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk operations for securities
  const handleBulkUpdate = (percentage) => {
    const selected = Array.from(selectedPositions);
    selected.forEach(posId => {
      const position = securitiesData.find(p => p.identifier === posId);
      if (position) {
        const newValue = position.total_current_value * (1 + percentage / 100);
        handleQuickUpdate(posId, newValue);
      }
    });
    showMessage('success', `Updated ${selected.length} positions`);
    setSelectedPositions(new Set());
    setBulkEditMode(false);
  };

  // Apply market prices to securities
  const applyMarketPrices = async () => {
    setIsSubmitting(true);
    try {
      // This would fetch latest market prices from your API
      const response = await fetchWithAuth('/market-data/latest');
      if (response.ok) {
        const prices = await response.json();
        
        securitiesData.forEach(pos => {
          if (prices[pos.identifier]) {
            handleQuickUpdate(pos.identifier, prices[pos.identifier] * pos.total_quantity);
          }
        });
        
        showMessage('success', 'Applied latest market prices');
      }
    } catch (error) {
      console.error('Error fetching market prices:', error);
      showMessage('error', 'Failed to fetch market prices');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete reconciliation
  const handleCompleteReconciliation = async () => {
    setIsSubmitting(true);
    try {
      // Save final reconciliation state
      const finalState = {
        date: new Date().toISOString(),
        accounts: Object.values(institutionData).flatMap(inst => 
          inst.accounts.map(acc => ({
            accountId: acc.id,
            accountName: acc.name,
            institution: inst.name,
            finalBalance: reconciliationData[`account_${acc.id}`]?.statementBalance || acc.currentValue,
            variance: acc.variance
          }))
        ),
        positions: securitiesData.map(pos => ({
          identifier: pos.identifier,
          name: pos.name,
          finalValue: reconciliationData[`pos_${pos.identifier}`]?.value || pos.total_current_value,
          finalQuantity: reconciliationData[`pos_${pos.identifier}`]?.quantity || pos.total_quantity
        }))
      };

      // Save to history
      const newHistory = [finalState, ...reconciliationHistory].slice(0, 100);
      setReconciliationHistory(newHistory);
      localStorage.setItem('reconciliationHistory', JSON.stringify(newHistory));
      
      // Clear current reconciliation data
      setReconciliationData({});
      localStorage.removeItem('reconciliationProgress');
      
      // Show success
      setShowSuccess(true);
      setShowConfetti(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setShowConfetti(false);
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      showMessage('error', 'Failed to complete reconciliation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render institution overview (ENHANCED)
  const renderInstitutionOverview = () => {
    const institutions = Object.values(institutionData);
    const filteredInstitutions = searchQuery ? 
      institutions.filter(inst => 
        inst.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) : institutions;

    return (
      <div className="space-y-4">
        {/* Header with stats */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Select Institution</h3>
            <p className="text-sm text-gray-400 mt-1">
              Choose a bank or financial institution to reconcile
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Quick stats */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-500">Total Accounts:</span>
              <span className="font-medium text-gray-300">{dataStoreAccounts?.length || 0}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-500">Need Update:</span>
              <span className="font-medium text-orange-400">
                {institutions.filter(i => i.needsReconciliation).length}
              </span>
            </div>
            {/* Health Score */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Health:</span>
              <div className="flex items-center space-x-1">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${reconciliationHealth}%` }}
                    className={`h-full ${
                      reconciliationHealth >= 80 ? 'bg-green-500' :
                      reconciliationHealth >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-300">
                  {reconciliationHealth}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search institutions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5 text-gray-400" /> : <Grid className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        {/* Institution Grid/List */}
        <div className={viewMode === 'grid' ? 
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : 
          "space-y-3"
        }>
          {filteredInstitutions.map((inst) => {
            const Icon = inst.icon;
            const needsReconciliation = inst.needsReconciliation;
            
            return (
              <motion.button
                key={inst.name}
                whileHover={{ scale: viewMode === 'grid' ? 1.02 : 1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedInstitution(inst.name)}
                className={`${viewMode === 'grid' ? 'p-4' : 'p-3 w-full'} rounded-lg border transition-all text-left ${
                  needsReconciliation
                    ? 'bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-700 hover:border-orange-600'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className={`flex ${viewMode === 'grid' ? 'flex-col' : 'items-center justify-between'}`}>
                  <div className={`flex items-start ${viewMode === 'grid' ? 'justify-between mb-3' : 'space-x-3'}`}>
                    <div className="p-2 bg-gray-700/50 rounded-lg">
                      <Icon className="w-5 h-5 text-gray-300" />
                    </div>
                    {needsReconciliation && (
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                        Needs Update
                      </span>
                    )}
                  </div>
                  
                  <div className={viewMode === 'grid' ? '' : 'flex-1 px-3'}>
                    <h4 className="font-semibold text-gray-100 mb-1">{inst.name}</h4>
                    <p className="text-sm text-gray-400 mb-2">
                      {inst.accounts.length} account{inst.accounts.length !== 1 ? 's' : ''} • 
                      {inst.accountTypes && inst.accountTypes.size > 0 
                        ? [...inst.accountTypes].join(', ')
                        : 'Various'}
                    </p>
                  </div>
                  
                  <div className={`flex items-center justify-between ${viewMode === 'grid' ? '' : 'space-x-3'}`}>
                    <span className="text-lg font-semibold text-gray-100">
                      {showValues ? formatCurrency(inst.totalValue) : '••••••'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render institution detail with grid layout (ENHANCED)
  const renderInstitutionDetail = () => {
    if (!selectedInstitution || !institutionData[selectedInstitution]) return null;
    
    const institution = institutionData[selectedInstitution];
    const Icon = institution.icon;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedInstitution(null)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="p-2 bg-gray-800 rounded-lg">
              {Icon ? <Icon className="w-5 h-5 text-gray-300" /> : <Building2 className="w-5 h-5 text-gray-300" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-100">{institution.name}</h3>
              <p className="text-sm text-gray-400">
                {institution.accounts.length} accounts • Total: {formatCurrency(institution.totalValue)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setKeyboardMode(!keyboardMode)}
              className={`p-2 rounded-lg transition-colors ${
                keyboardMode ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              title="Keyboard Navigation"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              onClick={applyMarketPrices}
              className="p-2 bg-gray-800 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
              title="Fetch Market Prices"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpdateAllInstitution}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Update All</>
              )}
            </motion.button>
          </div>
        </div>

        {/* Keyboard hint */}
        {keyboardMode && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">
              Use Tab/Shift+Tab to navigate • Enter to move forward • Type to update values • Esc to exit field
            </span>
          </div>
        )}

        {/* Grid Table */}
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    NestEgg Balance
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Statement Balance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Delta
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {institution.accounts.map((account, index) => {
                  const statementData = reconciliationData[`account_${account.id}`];
                  const statementBalance = statementData?.statementBalance;
                  const variance = statementBalance !== undefined ? 
                    statementBalance - account.currentValue : 0;
                  const variancePercent = account.currentValue !== 0 ? 
                    (variance / Math.abs(account.currentValue)) * 100 : 0;
                  const hasVariance = Math.abs(variance) > 0.01;
                  const isAnimating = animateValues[account.id];
                  
                  const AccountIcon = ACCOUNT_CONFIGS[account.account_type]?.icon || Wallet;
                  const accountColor = ACCOUNT_CONFIGS[account.account_type]?.color || 'gray';
                  
                  return (
                    <motion.tr
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`hover:bg-gray-800/50 transition-colors ${
                        isAnimating ? 'bg-yellow-900/20' : ''
                      }`}
                    >
                      {/* Account Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-1.5 bg-${accountColor}-900/20 rounded-lg`}>
                            <AccountIcon className={`w-4 h-4 text-${accountColor}-400`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-100">
                              {account.name || account.account_name || 'Unnamed Account'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {account.account_number && account.account_number.length >= 4 
                                ? `••••${account.account_number.slice(-4)}` 
                                : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* NestEgg Balance */}
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-300">
                          {showValues ? formatCurrency(account.currentValue) : '••••••'}
                        </span>
                      </td>

                      {/* Statement Balance Input */}
                      <td className="px-4 py-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            $
                          </span>
                          <input
                            ref={el => inputRefs.current[`input_${account.id}`] = el}
                            type="number"
                            step="0.01"
                            placeholder={account.currentValue ? formatCurrency(account.currentValue).replace('$', '').replace(/,/g, '') : '0.00'}
                            value={statementBalance !== undefined ? statementBalance : ''}
                            onChange={(e) => handleStatementInput(account.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, account.id, index)}
                            onFocus={(e) => {
                              e.target.select();
                              lastFocusedInput.current = e.target;
                            }}
                            className="w-full pl-7 pr-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100 focus:border-blue-500 focus:outline-none text-right"
                          />
                        </div>
                      </td>

                      {/* Delta */}
                      <td className="px-4 py-3 text-right">
                        {statementBalance !== undefined && (
                          <div className="flex items-center justify-end space-x-2">
                            {!hasVariance ? (
                              <div className="flex items-center space-x-1 text-green-500">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-medium">Match</span>
                              </div>
                            ) : (
                              <>
                                <span className={`text-sm font-medium ${getVarianceColor(variancePercent)}`}>
                                  {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                </span>
                                {getVarianceIcon(variance, variancePercent)}
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          account.reconciliationStatus === 'recent' ? 'bg-green-900/20 text-green-400' :
                          account.reconciliationStatus === 'due' ? 'bg-yellow-900/20 text-yellow-400' :
                          account.reconciliationStatus === 'overdue' ? 'bg-red-900/20 text-red-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {account.reconciliationStatus === 'never' ? 'Never' :
                           account.daysSinceReconciliation ? `${account.daysSinceReconciliation}d ago` : 'Unknown'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        {hasVariance && statementBalance !== undefined && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleUpdateBalance(account)}
                            disabled={isSubmitting}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                          >
                            Update
                          </motion.button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="bg-gray-800/30 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Variance</p>
              <p className="text-lg font-semibold text-gray-100">
                {formatCurrency(
                  institution.accounts.reduce((sum, acc) => {
                    const statement = reconciliationData[`account_${acc.id}`]?.statementBalance;
                    return sum + (statement !== undefined ? statement - acc.currentValue : 0);
                  }, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Accounts Updated</p>
              <p className="text-lg font-semibold text-gray-100">
                {institution.accounts.filter(acc => 
                  reconciliationData[`account_${acc.id}`]?.statementBalance !== undefined
                ).length} / {institution.accounts.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Last Reconciled</p>
              <p className="text-sm font-medium text-gray-300">
                 {institution.accounts?.[0]?.lastReconciled 
                  ? new Date(institution.accounts[0].lastReconciled).toLocaleDateString() 
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
              <div className="flex items-center space-x-2">
                {institution.accounts.every(acc => {
                  const statement = reconciliationData[`account_${acc.id}`]?.statementBalance;
                  return statement === undefined || Math.abs(statement - acc.currentValue) < 0.01;
                }) ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-500">Reconciled</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <span className="text-sm font-medium text-orange-500">Needs Update</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render securities view (ENHANCED)
  const renderSecuritiesView = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">Investment Positions</h3>
            <p className="text-sm text-gray-400 mt-1">
              Update your securities, crypto, and precious metals
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectedPositions.size > 0 && (
              <div className="flex items-center space-x-2 mr-4">
                <span className="text-sm text-gray-400">
                  {selectedPositions.size} selected
                </span>
                <button
                  onClick={() => setSelectedPositions(new Set())}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Clear
                </button>
              </div>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
            >
              <option value="name">Sort by Name</option>
              <option value="value">Sort by Value</option>
              <option value="gain">Sort by Gain $</option>
              <option value="gainPercent">Sort by Gain %</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={applyMarketPrices}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Fetch Market Prices
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Bulk edit bar */}
        {bulkEditMode && selectedPositions.size > 0 && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-blue-300">
              Apply percentage change to {selectedPositions.size} selected positions
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkUpdate(-5)}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
              >
                -5%
              </button>
              <button
                onClick={() => handleBulkUpdate(-2)}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded"
              >
                -2%
              </button>
              <button
                onClick={() => handleBulkUpdate(2)}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
              >
                +2%
              </button>
              <button
                onClick={() => handleBulkUpdate(5)}
                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
              >
                +5%
              </button>
              <button
                onClick={() => setBulkEditMode(false)}
                className="ml-3 text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Securities grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {securitiesData.map((position) => {
            const config = position.assetConfig;
            const Icon = config.icon;
            const Badge = position.performanceBadge;
            const isSelected = selectedPositions.has(position.identifier);
            const isEditing = editingPosition === position.identifier;
            const hasUpdate = reconciliationData[`pos_${position.identifier}`]?.value !== undefined;
            
            return (
              <motion.div
                key={position.identifier}
                whileHover={{ scale: 1.01 }}
                className={`p-4 rounded-lg border transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-900/10' : 
                  hasUpdate ? 'border-green-700 bg-green-900/10' :
                  'border-gray-700 bg-gray-800/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const newSelected = new Set(selectedPositions);
                        if (e.target.checked) {
                          newSelected.add(position.identifier);
                        } else {
                          newSelected.delete(position.identifier);
                        }
                        setSelectedPositions(newSelected);
                        if (newSelected.size > 0 && !bulkEditMode) {
                          setBulkEditMode(true);
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
                    />
                    <div className={`p-1.5 ${config.bgColor} rounded`}>
                      <Icon className={`w-4 h-4 ${config.textColor}`} />
                    </div>
                    <Badge.icon className={`w-4 h-4 ${Badge.color}`} />
                  </div>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditingPosition(null);
                        setEditValues({});
                      } else {
                        setEditingPosition(position.identifier);
                        setEditValues({
                          value: reconciliationData[`pos_${position.identifier}`]?.value || position.total_current_value,
                          quantity: reconciliationData[`pos_${position.identifier}`]?.quantity || position.total_quantity
                        });
                      }
                    }}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                  >
                    {isEditing ? <X className="w-4 h-4 text-gray-400" /> : <Edit2 className="w-4 h-4 text-gray-400" />}
                  </button>
               </div>

               {/* Position info */}
               <div className="mb-3">
                 <h4 className="font-semibold text-gray-100 mb-1">{position.name || position.identifier || 'Unknown'}</h4>
                 <p className="text-xs text-gray-500">{position.identifier}</p>
               </div>

               {/* Values */}
               {isEditing ? (
                 <div className="space-y-2">
                   <div>
                     <label className="text-xs text-gray-400">Quantity</label>
                     <input
                       type="number"
                       step="0.0001"
                       value={editValues.quantity || ''}
                       onChange={(e) => setEditValues({...editValues, quantity: parseFloat(e.target.value)})}
                       className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100"
                     />
                   </div>
                   <div>
                     <label className="text-xs text-gray-400">Total Value</label>
                     <input
                       type="number"
                       step="0.01"
                       value={editValues.value || ''}
                       onChange={(e) => setEditValues({...editValues, value: parseFloat(e.target.value)})}
                       className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100"
                     />
                   </div>
                   <div className="flex space-x-2">
                     <button
                       onClick={() => {
                         handleQuickUpdate(position.identifier, editValues.value, 'value');
                         handleQuickUpdate(position.identifier, editValues.quantity, 'quantity');
                         setEditingPosition(null);
                         showMessage('success', 'Position updated');
                       }}
                       className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                     >
                       Save
                     </button>
                     <button
                       onClick={() => {
                         setEditingPosition(null);
                         setEditValues({});
                       }}
                       className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <span className="text-xs text-gray-500">Current</span>
                     <span className="text-sm font-medium text-gray-300">
                       {showValues ? formatCurrency(position.total_current_value) : '••••••'}
                     </span>
                   </div>
                   {hasUpdate && (
                     <div className="flex justify-between items-center">
                       <span className="text-xs text-gray-500">Updated</span>
                       <span className="text-sm font-medium text-green-400">
                         {formatCurrency(reconciliationData[`pos_${position.identifier}`].value)}
                       </span>
                     </div>
                   )}
                   <div className="flex justify-between items-center">
                     <span className="text-xs text-gray-500">Quantity</span>
                     <span className="text-sm text-gray-400">
                      {position.total_quantity != null ? formatNumber(position.total_quantity) : '0'} 
                     </span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-xs text-gray-500">Gain/Loss</span>
                     <span className={`text-sm font-medium ${
                       position.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
                     }`}>
                       {formatCurrency(position.total_gain_loss)} ({formatPercentage(position.total_gain_loss_pct)})
                     </span>
                   </div>
                 </div>
               )}
             </motion.div>
           );
         })}
       </div>
     </div>
   );
 };

 // Render history view
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
         <button
           onClick={() => {
             localStorage.removeItem('reconciliationHistory');
             setReconciliationHistory([]);
             showMessage('success', 'History cleared');
           }}
           className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
         >
           Clear History
         </button>
       </div>

       {reconciliationHistory.length === 0 ? (
         <div className="bg-gray-800/50 rounded-lg p-8 text-center">
           <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
           <p className="text-gray-400">No reconciliation history yet</p>
           <p className="text-sm text-gray-500 mt-1">Complete a reconciliation to see it here</p>
         </div>
       ) : (
         <div className="space-y-3">
           {reconciliationHistory.map((item, index) => (
             <motion.div
               key={index}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.05 }}
               className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors cursor-pointer"
               onClick={() => setSelectedHistoryItem(selectedHistoryItem === index ? null : index)}
             >
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                   <div className="p-2 bg-gray-700 rounded-lg">
                     <Calendar className="w-4 h-4 text-gray-400" />
                   </div>
                   <div>
                     <p className="font-medium text-gray-100">
                       {new Date(item.date).toLocaleDateString('en-US', {
                         weekday: 'short',
                         month: 'short',
                         day: 'numeric',
                         year: 'numeric'
                       })}
                     </p>
                     <p className="text-xs text-gray-500">
                       {new Date(item.date).toLocaleTimeString('en-US', {
                         hour: '2-digit',
                         minute: '2-digit'
                       })}
                     </p>
                   </div>
                 </div>
                 <div className="flex items-center space-x-3">
                   <div className="text-right">
                     <p className="text-sm text-gray-400">Accounts</p>
                     <p className="font-medium text-gray-100">{item.accounts?.length || 0}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm text-gray-400">Positions</p>
                     <p className="font-medium text-gray-100">{item.positions?.length || 0}</p>
                   </div>
                   <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                     selectedHistoryItem === index ? 'rotate-180' : ''
                   }`} />
                 </div>
               </div>

               {/* Expanded details */}
               {selectedHistoryItem === index && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: 'auto', opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   className="mt-4 pt-4 border-t border-gray-700 space-y-2"
                 >
                   {item.accounts?.map((acc, i) => (
                     <div key={i} className="flex justify-between text-sm">
                       <span className="text-gray-400">{acc.accountName}</span>
                       <span className="text-gray-300">{formatCurrency(acc.finalBalance)}</span>
                     </div>
                   ))}
                 </motion.div>
               )}
             </motion.div>
           ))}
         </div>
       )}
     </div>
   );
 };

 // Success animation
 const renderSuccess = () => {
   if (!showSuccess) return null;
   
   return (
     <motion.div
       initial={{ opacity: 0, scale: 0.8 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.8 }}
       className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-50 rounded-lg"
     >
       <div className="text-center">
         <motion.div
           animate={{ rotate: [0, 360] }}
           transition={{ duration: 0.5 }}
           className="inline-block mb-4"
         >
           <Trophy className="w-16 h-16 text-yellow-500" />
         </motion.div>
         <h3 className="text-2xl font-bold text-gray-100 mb-2">Reconciliation Complete!</h3>
         <p className="text-gray-400">All accounts have been updated successfully</p>
         <div className="mt-6 flex items-center justify-center space-x-3">
           <div className="text-center">
             <p className="text-2xl font-bold text-green-400">{reconciliationHealth}%</p>
             <p className="text-xs text-gray-500">Health Score</p>
           </div>
           <div className="text-center">
             <p className="text-2xl font-bold text-blue-400">
               {Object.values(institutionData).reduce((sum, inst) => 
                 sum + inst.accounts.filter(a => 
                   reconciliationData[`account_${a.id}`]?.statementBalance !== undefined
                 ).length, 0
               )}
             </p>
             <p className="text-xs text-gray-500">Accounts Updated</p>
           </div>
         </div>
       </div>
     </motion.div>
   );
 };

 // Help modal
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
             <h4 className="font-semibold text-gray-200 mb-2">Keyboard Shortcuts</h4>
             <div className="space-y-1 text-sm">
               <div className="flex justify-between py-1">
                 <span className="text-gray-400">Navigate fields</span>
                 <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">Tab</kbd>
               </div>
               <div className="flex justify-between py-1">
                 <span className="text-gray-400">Previous field</span>
                 <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">Shift + Tab</kbd>
               </div>
               <div className="flex justify-between py-1">
                 <span className="text-gray-400">Save & next</span>
                 <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">Enter</kbd>
               </div>
               <div className="flex justify-between py-1">
                 <span className="text-gray-400">Exit field</span>
                 <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">Esc</kbd>
               </div>
             </div>
           </div>

           <div>
             <h4 className="font-semibold text-gray-200 mb-2">Workflow Tips</h4>
             <ul className="space-y-2 text-sm text-gray-400">
               <li className="flex items-start space-x-2">
                 <span className="text-green-400">•</span>
                 <span>Start with cash accounts and credit cards - they change most frequently</span>
               </li>
               <li className="flex items-start space-x-2">
                 <span className="text-green-400">•</span>
                 <span>Use Tab to quickly move through statement balance inputs</span>
               </li>
               <li className="flex items-start space-x-2">
                 <span className="text-green-400">•</span>
                 <span>Auto-save keeps your progress if you need to stop</span>
               </li>
               <li className="flex items-start space-x-2">
                 <span className="text-green-400">•</span>
                 <span>Update securities monthly or when making trades</span>
               </li>
             </ul>
           </div>

           <div>
             <h4 className="font-semibold text-gray-200 mb-2">Status Indicators</h4>
             <div className="space-y-2 text-sm">
               <div className="flex items-center space-x-3">
                 <CheckCircle2 className="w-4 h-4 text-green-500" />
                 <span className="text-gray-400">Balance matches - no action needed</span>
               </div>
               <div className="flex items-center space-x-3">
                 <AlertCircle className="w-4 h-4 text-orange-500" />
                 <span className="text-gray-400">Variance detected - review and update</span>
               </div>
               <div className="flex items-center space-x-3">
                 <Clock className="w-4 h-4 text-yellow-500" />
                 <span className="text-gray-400">Due for reconciliation ({'>'}7 days)</span>
               </div>
             </div>
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
               onClick={() => {
                 setSelectedTab('cash_debt');
                 setSelectedInstitution(null);
               }}
               className={`px-3 py-1.5 text-sm rounded transition-colors ${
                 selectedTab === 'cash_debt'
                   ? 'bg-gray-700 text-gray-100'
                   : 'text-gray-400 hover:text-gray-300'
               }`}
             >
               Cash & Debt
             </button>
             <button
               onClick={() => {
                 setSelectedTab('investments');
                 setSelectedInstitution(null);
               }}
               className={`px-3 py-1.5 text-sm rounded transition-colors ${
                 selectedTab === 'investments'
                   ? 'bg-gray-700 text-gray-100'
                   : 'text-gray-400 hover:text-gray-300'
               }`}
             >
               Investments
             </button>
             <button
               onClick={() => {
                 setSelectedTab('history');
                 setSelectedInstitution(null);
               }}
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
             onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
             className={`p-2 rounded-lg transition-colors ${
               autoSaveEnabled ? 'bg-green-900/20 text-green-400' : 'bg-gray-800 text-gray-400'
             }`}
             title="Auto-save"
           >
             <Save className="w-5 h-5" />
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
         {isLoading ? (
           <div className="flex items-center justify-center py-12">
             <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
           </div>
         ) : selectedTab === 'cash_debt' ? (
           selectedInstitution ? renderInstitutionDetail() : renderInstitutionOverview()
         ) : selectedTab === 'investments' ? (
           renderSecuritiesView()
         ) : (
           renderHistoryView()
         )}
       </div>

       {/* Footer */}
       <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
         <div className="flex items-center space-x-4">
           {/* Progress indicator */}
           <div className="flex items-center space-x-2">
             <span className="text-xs text-gray-500">Progress:</span>
             <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ 
                   width: `${
                     (Object.keys(reconciliationData).length / 
                     (dataStoreAccounts?.length + securitiesData.length || 1)) * 100
                   }%` 
                 }}
                 className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
               />
             </div>
           </div>

           {/* Unsaved indicator */}
           {unsavedChanges && (
             <div className="flex items-center space-x-2 text-yellow-500">
               <AlertCircle className="w-4 h-4" />
               <span className="text-sm">Unsaved changes</span>
             </div>
           )}
         </div>

         <div className="flex items-center space-x-2">
           {unsavedChanges && (
             <button
               onClick={() => {
                 localStorage.setItem('reconciliationProgress', JSON.stringify(reconciliationData));
                 setUnsavedChanges(false);
                 showMessage('success', 'Progress saved');
               }}
               className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors"
             >
               Save Progress
             </button>
           )}
           
           <motion.button
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.98 }}
             onClick={handleCompleteReconciliation}
             disabled={isSubmitting || Object.keys(reconciliationData).length === 0}
             className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
           >
             Complete Reconciliation
           </motion.button>
         </div>
       </div>

       {/* Success overlay */}
       <AnimatePresence>
         {renderSuccess()}
       </AnimatePresence>

       {/* Help overlay */}
       <AnimatePresence>
         {renderHelp()}
       </AnimatePresence>

       {/* Confetti */}
       {showConfetti && (
         <div className="absolute inset-0 pointer-events-none">
           {[...Array(50)].map((_, i) => (
             <motion.div
               key={i}
               initial={{ 
                 x: Math.random() * window.innerWidth,
                 y: -20,
                 rotate: 0
               }}
               animate={{ 
                 y: window.innerHeight + 20,
                 rotate: Math.random() * 360
               }}
               transition={{ 
                 duration: Math.random() * 2 + 1,
                 ease: "linear"
               }}
               className="absolute w-2 h-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"
               style={{ left: `${Math.random() * 100}%` }}
             />
           ))}
         </div>
       )}
     </div>
   </FixedModal>
 );
}
export default QuickReconciliationModal2;