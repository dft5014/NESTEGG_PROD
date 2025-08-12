import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, X, Eye, EyeOff, RefreshCw, ChevronRight, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, Clock, Zap, Shield, Award, Sparkles,
  CreditCard, Wallet, Building2, PiggyBank, Home, Car, GraduationCap,
  ChevronDown, Check, Plus, Minus, Edit2, Save, XCircle, Info,
  ArrowUpRight, ArrowDownRight, Activity, BarChart3, DollarSign,
  Smartphone, Lock, Unlock, Calendar, Hash, Percent, FileText,
  ChevronUp, AlertTriangle, TrendingFlat, Banknote, Coins, Receipt,
  Gem, Briefcase, Building, CheckSquare, Droplets, CheckCheck,
  ChevronLeft, Trophy, Landmark, Copy, ExternalLink, Calculator,
  Loader2, ArrowRight, ChevronsRight, MoreVertical, Filter,
  Search, Settings, HelpCircle, Star, Flag, Bell, Users
} from 'lucide-react';
import { useDataStore } from '../../store/DataStore';
import { useAccounts } from '../../store/hooks/useAccounts';
import { useDetailedPositions } from '../../store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '../../store/hooks/useGroupedLiabilities';
import { useGroupedPositions } from '../../store/hooks/useGroupedPositions';
import { fetchWithAuth } from '../../utils/api';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';
import FixedModal from './FixedModal';

// Comprehensive Asset Configurations
const ASSET_CONFIGS = {
  cash: { 
    icon: Banknote, 
    color: 'emerald', 
    gradient: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    hoverBg: 'hover:bg-emerald-100',
    quickEdit: true,
    label: 'Cash & Savings',
    description: 'Checking, savings, and money market accounts'
  },
  credit_card: { 
    icon: CreditCard, 
    color: 'red', 
    gradient: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700',
    hoverBg: 'hover:bg-red-100',
    quickEdit: true,
    label: 'Credit Cards',
    description: 'Credit card balances and revolving credit'
  },
  mortgage: { 
    icon: Home, 
    color: 'purple', 
    gradient: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    hoverBg: 'hover:bg-purple-100',
    quickEdit: true,
    label: 'Mortgages',
    description: 'Home loans and real estate debt'
  },
  loan: { 
    icon: FileText, 
    color: 'orange', 
    gradient: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    hoverBg: 'hover:bg-orange-100',
    quickEdit: true,
    label: 'Loans',
    description: 'Personal, auto, and student loans'
  },
  security: { 
    icon: TrendingUp, 
    color: 'blue', 
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    hoverBg: 'hover:bg-blue-100',
    quickEdit: false,
    label: 'Securities',
    description: 'Stocks, ETFs, and mutual funds'
  },
  crypto: { 
    icon: Coins, 
    color: 'yellow', 
    gradient: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700',
    hoverBg: 'hover:bg-yellow-100',
    quickEdit: false,
    label: 'Crypto',
    description: 'Cryptocurrency holdings'
  },
  metal: { 
    icon: Gem, 
    color: 'gray', 
    gradient: 'from-gray-500 to-slate-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-700',
    hoverBg: 'hover:bg-gray-100',
    quickEdit: false,
    label: 'Metals',
    description: 'Gold, silver, and precious metals'
  },
  realestate: { 
    icon: Building2, 
    color: 'indigo', 
    gradient: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    hoverBg: 'hover:bg-indigo-100',
    quickEdit: true,
    label: 'Real Estate',
    description: 'Property and real estate investments'
  },
  other_assets: { 
    icon: MoreVertical, 
    color: 'teal', 
    gradient: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    hoverBg: 'hover:bg-teal-100',
    quickEdit: true,
    label: 'Other Assets',
    description: 'Collectibles, art, and other investments'
  }
};

// Category configurations for accounts
const CATEGORY_CONFIGS = {
  brokerage: { icon: BarChart3, color: 'blue', label: 'Investment' },
  retirement: { icon: PiggyBank, color: 'purple', label: 'Retirement' },
  banking: { icon: Building2, color: 'green', label: 'Banking' },
  crypto: { icon: Coins, color: 'yellow', label: 'Crypto' },
  credit: { icon: CreditCard, color: 'red', label: 'Credit' },
  mortgage: { icon: Home, color: 'indigo', label: 'Mortgage' },
  loan: { icon: FileText, color: 'orange', label: 'Loan' }
};

// Liquid position types for quick reconciliation
const LIQUID_POSITION_TYPES = ['cash', 'credit_card', 'loan', 'mortgage'];

// Variance status helper with detailed thresholds
const getVarianceStatus = (variancePercent) => {
  const absVariance = Math.abs(variancePercent);
  if (absVariance <= 0.1) return { 
    color: 'emerald', 
    icon: CheckCircle2, 
    label: 'Perfect Match',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    description: 'Accounts match exactly'
  };
  if (absVariance <= 1) return { 
    color: 'green', 
    icon: CheckCircle2, 
    label: 'Close Match',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700',
    description: 'Minor variance detected'
  };
  if (absVariance <= 3) return { 
    color: 'yellow', 
    icon: AlertCircle, 
    label: 'Minor Variance',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700',
    description: 'Review recommended'
  };
  if (absVariance <= 5) return { 
    color: 'orange', 
    icon: AlertTriangle, 
    label: 'Significant Variance',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700',
    description: 'Attention required'
  };
  return { 
    color: 'red', 
    icon: AlertTriangle, 
    label: 'Major Variance',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700',
    description: 'Immediate review needed'
  };
};

// Format time ago helper
const formatTimeAgo = (date) => {
  if (!date) return 'Never';
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
};

// Progress ring component
const ProgressRing = ({ percentage, size = 120, strokeWidth = 8, showAnimation = true }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <svg className={`transform -rotate-90 ${showAnimation ? 'transition-all duration-1000' : ''}`} width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-gray-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-blue-600 transition-all duration-1000"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Achievement badge component
const AchievementBadge = ({ icon: Icon, label, unlocked, description }) => (
  <motion.div
    whileHover={{ scale: unlocked ? 1.05 : 1 }}
    className={`p-4 rounded-xl border-2 transition-all ${
      unlocked 
        ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50' 
        : 'border-gray-200 bg-gray-50 opacity-50'
    }`}
  >
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-lg ${
        unlocked ? 'bg-yellow-400' : 'bg-gray-300'
      }`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {unlocked && <Star className="w-5 h-5 text-yellow-500" />}
    </div>
  </motion.div>
);

const QuickReconciliationModal2 = ({ isOpen, onClose }) => {
  // DataStore hooks with proper error handling
  const { 
    accounts: dataStoreAccounts = [], 
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts 
  } = useAccounts();
  
  const { 
    positions: dataStorePositions = [], 
    loading: positionsLoading,
    error: positionsError,
    refresh: refreshPositions 
  } = useDetailedPositions();
  
  const { 
    liabilities: dataStoreLiabilities = [], 
    loading: liabilitiesLoading,
    error: liabilitiesError,
    refreshData: refreshLiabilities 
  } = useGroupedLiabilities();
  
  const { 
    positions: groupedPositions = [],
    loading: groupedLoading,
    refresh: refreshGrouped
  } = useGroupedPositions();
  
  // Get DataStore actions
  const { actions } = useDataStore();
  
  // Core state management
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState(new Set(['quick']));
  const [reconciliationData, setReconciliationData] = useState({});
  const [variances, setVariances] = useState({});
  const [editingPosition, setEditingPosition] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [quickEditMode, setQuickEditMode] = useState({});
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  
  // UI state
  const [message, setMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animateValues, setAnimateValues] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  const [showOnlyNeedsAttention, setShowOnlyNeedsAttention] = useState(false);
  
  // Refs for persistent data
  const messageTimeoutRef = useRef(null);
  const reconciliationHistoryRef = useRef([]);
  const streakRef = useRef(0);
  const achievementsRef = useRef(new Set());
  
  // Load reconciliation history from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      // Load history
      const savedHistory = localStorage.getItem('nestegg_reconciliation_v2');
      if (savedHistory) {
        try {
          reconciliationHistoryRef.current = JSON.parse(savedHistory);
        } catch (e) {
          console.error('Failed to parse reconciliation history:', e);
        }
      }
      
      // Load achievements
      const savedAchievements = localStorage.getItem('nestegg_achievements');
      if (savedAchievements) {
        try {
          achievementsRef.current = new Set(JSON.parse(savedAchievements));
        } catch (e) {
          console.error('Failed to parse achievements:', e);
        }
      }
      
      // Calculate streak
      calculateStreak();
      
      // Refresh all data
      refreshAllData();
    }
  }, [isOpen]);
  
  // Refresh all data sources
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshAccounts(),
      refreshPositions(),
      refreshLiabilities(),
      refreshGrouped()
    ]);
  }, [refreshAccounts, refreshPositions, refreshLiabilities, refreshGrouped]);
  
  // Calculate reconciliation streak
  const calculateStreak = () => {
    const history = reconciliationHistoryRef.current;
    if (history.length === 0) {
      streakRef.current = 0;
      return;
    }
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < history.length; i++) {
      const recDate = new Date(history[i].date);
      recDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - recDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    streakRef.current = streak;
  };
  
  // Process positions from DataStore
  const processedPositions = useMemo(() => {
    if (!dataStorePositions || !Array.isArray(dataStorePositions)) return [];
    
    return dataStorePositions.map(pos => ({
      id: pos.itemId || pos.id,
      unified_id: pos.unifiedId || pos.id,
      item_id: pos.itemId,
      account_id: pos.accountId,
      identifier: pos.identifier,
      name: pos.name || pos.identifier || 'Unknown',
      asset_type: pos.assetType || 'unknown',
      quantity: pos.quantity || 0,
      current_value: pos.currentValue || 0,
      cost_basis: pos.costBasis || 0,
      gain_loss: pos.gainLoss || 0,
      gain_loss_percent: pos.gainLossPercent || 0,
      account_name: pos.accountName || 'Unknown Account',
      institution: pos.institution || 'Unknown',
      purchase_date: pos.purchaseDate,
      current_price: pos.currentPrice || 0,
      sector: pos.sector,
      industry: pos.industry,
      dividend_yield: pos.dividendYield,
      last_updated: pos.snapshotDate
    }));
  }, [dataStorePositions]);
  
  // Get liquid positions for quick reconciliation
  const liquidPositions = useMemo(() => {
    return processedPositions.filter(pos => 
      LIQUID_POSITION_TYPES.includes(pos.asset_type)
    );
  }, [processedPositions]);
  
  // Get investment positions
  const investmentPositions = useMemo(() => {
    return processedPositions.filter(pos => 
      ['security', 'crypto', 'metal'].includes(pos.asset_type)
    );
  }, [processedPositions]);
  
  // Process accounts with reconciliation status
  const processedAccounts = useMemo(() => {
    if (!dataStoreAccounts || !Array.isArray(dataStoreAccounts)) return [];
    
    return dataStoreAccounts.map(account => {
      const lastRec = reconciliationHistoryRef.current.find(r => 
        r.accounts && r.accounts.includes(account.id)
      );
      
      // Get positions for this account
      const accountPositions = processedPositions.filter(p => 
        p.account_id === account.id
      );
      
      const daysSince = lastRec ? 
        Math.floor((Date.now() - new Date(lastRec.date)) / (1000 * 60 * 60 * 24)) : null;
      
      // Map account fields properly
      return {
        ...account,
        name: account.account_name || account.accountName || account.name || 'Unknown Account',
        institution: account.institution || 'Unknown',
        category: account.account_category || account.category || 'other',
        totalValue: account.total_value || account.totalValue || 0,
        positions: accountPositions,
        position_count: accountPositions.length,
        lastReconciled: lastRec?.date,
        daysSinceReconciliation: daysSince,
        needsReconciliation: !lastRec || daysSince > 14,
        reconciliationStatus: !lastRec ? 'never' : 
          daysSince <= 7 ? 'recent' : 
          daysSince <= 14 ? 'due' : 'overdue'
      };
    });
  }, [dataStoreAccounts, processedPositions]);
  
  // Get unique institutions for filtering
  const uniqueInstitutions = useMemo(() => {
    const institutions = [...new Set(processedAccounts.map(a => a.institution).filter(Boolean))];
    return institutions.sort();
  }, [processedAccounts]);
  
  // Calculate reconciliation health score
  const reconciliationHealth = useMemo(() => {
    const totalAccounts = processedAccounts.length;
    if (totalAccounts === 0) return 100;
    
    const weights = {
      accountsReconciled: 0.4,
      liquidPositionsUpdated: 0.3,
      recency: 0.3
    };
    
    // Accounts score
    const reconciledAccounts = processedAccounts.filter(a => 
      a.daysSinceReconciliation !== null && a.daysSinceReconciliation <= 14
    ).length;
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
    const recencyScore = Math.max(0, 100 - (daysSinceLastFull * 5));
    
    return Math.round(
      accountScore * weights.accountsReconciled +
      liquidScore * weights.liquidPositionsUpdated +
      recencyScore * weights.recency
    );
  }, [processedAccounts, liquidPositions, reconciliationData]);
  
  // Calculate achievements
  const achievements = useMemo(() => {
    const unlocked = [];
    const locked = [];
    
    const achievementList = [
      {
        id: 'first_reconciliation',
        icon: Trophy,
        label: 'First Steps',
        description: 'Complete your first reconciliation',
        condition: reconciliationHistoryRef.current.length > 0
      },
      {
        id: 'week_streak',
        icon: Zap,
        label: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        condition: streakRef.current >= 7
      },
      {
        id: 'month_streak',
        icon: Award,
        label: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        condition: streakRef.current >= 30
      },
      {
        id: 'perfect_match',
        icon: CheckCircle2,
        label: 'Perfect Match',
        description: 'All accounts match exactly',
        condition: Object.values(variances).every(v => Math.abs(v.variancePercent) < 0.1)
      },
      {
        id: 'quick_reconciler',
        icon: Clock,
        label: 'Speed Demon',
        description: 'Complete reconciliation in under 2 minutes',
        condition: false // Track timing
      },
      {
        id: 'portfolio_pro',
        icon: Star,
        label: 'Portfolio Pro',
        description: 'Reconcile 10+ accounts',
        condition: processedAccounts.length >= 10
      }
    ];
    
    achievementList.forEach(achievement => {
      if (achievement.condition || achievementsRef.current.has(achievement.id)) {
        unlocked.push(achievement);
        achievementsRef.current.add(achievement.id);
      } else {
        locked.push(achievement);
      }
    });
    
    // Save achievements
    localStorage.setItem('nestegg_achievements', JSON.stringify([...achievementsRef.current]));
    
    return { unlocked, locked };
  }, [processedAccounts, variances]);
  
  // Show message helper
  const showMessage = (type, text, duration = 3000) => {
    setMessage({ type, text });
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessage(null), duration);
  };
  
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
  
  // Toggle account expansion
  const toggleAccountExpansion = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };
  
  // Handle quick update for positions
  const handleQuickUpdate = (positionId, newValue) => {
    setReconciliationData(prev => ({
      ...prev,
      [`pos_${positionId}`]: {
        value: newValue,
        timestamp: new Date().toISOString(),
        originalValue: processedPositions.find(p => p.item_id === positionId)?.current_value
      }
    }));
    
    // Animate the value change
    setAnimateValues(prev => ({ ...prev, [positionId]: true }));
    setTimeout(() => {
      setAnimateValues(prev => ({ ...prev, [positionId]: false }));
    }, 500);
  };
  
  // Handle position edit
  const handleEditPosition = (position) => {
    setEditingPosition(position.item_id);
    setEditValues({
      quantity: position.quantity,
      value: reconciliationData[`pos_${position.item_id}`]?.value ?? position.current_value,
      cost_basis: position.cost_basis
    });
  };
  
  // Save position edit
  const handleSavePosition = async (positionId) => {
    const value = parseFloat(editValues.value);
    if (!isNaN(value)) {
      handleQuickUpdate(positionId, value);
      showMessage('success', 'Position updated');
    }
    setEditingPosition(null);
    setEditValues({});
  };
  
  // Handle account reconciliation
  const handleAccountReconciliation = (accountId, statementBalance) => {
    const account = processedAccounts.find(a => a.id === accountId);
    if (!account) return;
    
    const variance = statementBalance - account.totalValue;
    const variancePercent = account.totalValue !== 0 ? 
      (variance / account.totalValue) * 100 : 0;
    
    setVariances(prev => ({
      ...prev,
      [accountId]: {
        appBalance: account.totalValue,
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
  
  // Bulk update helper
  const handleBulkUpdate = (percentage) => {
    const selected = Array.from(selectedPositions);
    selected.forEach(posId => {
      const position = processedPositions.find(p => p.item_id === posId);
      if (position) {
        const newValue = position.current_value * (1 + percentage / 100);
        handleQuickUpdate(posId, newValue);
      }
    });
    showMessage('success', `Updated ${selected.length} positions`);
    setSelectedPositions(new Set());
    setBulkEditMode(false);
  };
  
  // Submit reconciliation to backend
  const submitReconciliation = async () => {
    setIsSubmitting(true);
    const startTime = Date.now();
    
    try {
      const updates = [];
      const reconciliations = [];
      
      // Process all reconciliation data
      for (const [key, data] of Object.entries(reconciliationData)) {
        if (key.startsWith('pos_')) {
          const posId = parseInt(key.replace('pos_', ''));
          const position = processedPositions.find(p => p.item_id === posId);
          
          if (position) {
            // Update based on asset type
            const endpoint = position.asset_type === 'cash' ? '/cash' : 
                          position.asset_type === 'credit_card' ? '/liabilities' :
                          position.asset_type === 'loan' ? '/liabilities' :
                          position.asset_type === 'mortgage' ? '/liabilities' :
                          '/positions';
            
            const updateData = {
              current_value: data.value,
              amount: data.value
            };
            
            await fetchWithAuth(`${endpoint}/${posId}`, {
              method: 'PUT',
              body: JSON.stringify(updateData)
            });
            
            updates.push({ id: posId, type: position.asset_type, value: data.value });
          }
        } else if (key.startsWith('account_')) {
          const accountId = parseInt(key.replace('account_', ''));
          const account = processedAccounts.find(a => a.id === accountId);
          
          if (account) {
            // Post to reconciliation table
            await fetchWithAuth('/api/reconciliation/account', {
              method: 'POST',
              body: JSON.stringify({
                account_id: accountId,
                app_balance: account.totalValue,
                actual_balance: data.statementBalance
              })
            });
            
            reconciliations.push(accountId);
          }
        }
      }
      
      // Calculate time taken
      const timeTaken = Date.now() - startTime;
      
      // Check for speed achievement
      if (timeTaken < 120000) { // Under 2 minutes
        achievementsRef.current.add('quick_reconciler');
      }
      
      // Save to history
      const historyEntry = {
        date: new Date().toISOString(),
        accounts: reconciliations,
        positions: updates.length,
        totalValue: processedAccounts.reduce((sum, a) => sum + a.totalValue, 0),
        health: reconciliationHealth,
        timeTaken
      };
      
      reconciliationHistoryRef.current.unshift(historyEntry);
      if (reconciliationHistoryRef.current.length > 30) {
        reconciliationHistoryRef.current.pop();
      }
      localStorage.setItem('nestegg_reconciliation_v2', JSON.stringify(reconciliationHistoryRef.current));
      
      // Show success
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      
      // Refresh all data
      await refreshAllData();
      await actions.fetchPortfolioData(true);
      
      // Reset state
      setReconciliationData({});
      setVariances({});
      setSelectedPositions(new Set());
      setBulkEditMode(false);
      setActiveView('dashboard');
      
      showMessage('success', '✨ Reconciliation complete! Your NestEgg is perfectly balanced.');
      
    } catch (error) {
      console.error('Reconciliation error:', error);
      showMessage('error', 'Failed to complete reconciliation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit section component
  const SubmitSection = ({ reconciliationData, onSubmit, isSubmitting, onClear }) => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">Ready to Submit</h4>
          <p className="text-sm text-gray-500 mt-1">
            {Object.keys(reconciliationData).filter(k => k.startsWith('pos_')).length} position updates,
            {' '}{Object.keys(reconciliationData).filter(k => k.startsWith('account_')).length} account reconciliations
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onClear}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            Clear All
          </button>
          
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Complete Reconciliation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
  
  // Render dashboard view
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Health Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">Reconciliation Health</h2>
            <p className="text-blue-100 text-lg mb-6">
              Keep your NestEgg accurate and up-to-date
            </p>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <p className="text-blue-100 text-sm">Total Accounts</p>
                <p className="text-2xl font-bold">{processedAccounts.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <p className="text-blue-100 text-sm">Need Attention</p>
                <p className="text-2xl font-bold text-yellow-300">
                  {processedAccounts.filter(a => a.needsReconciliation).length}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <p className="text-blue-100 text-sm">Current Streak</p>
                <p className="text-2xl font-bold flex items-center">
                  {streakRef.current} <Zap className="w-5 h-5 ml-1 text-yellow-300" />
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <p className="text-blue-100 text-sm">Last Update</p>
                <p className="text-2xl font-bold">
                  {reconciliationHistoryRef.current[0] ? 
                    formatTimeAgo(reconciliationHistoryRef.current[0].date) : 'Never'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Health Score Ring */}
          <div className="relative ml-8">
            <ProgressRing percentage={reconciliationHealth} size={160} strokeWidth={12} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-bold">{reconciliationHealth}%</p>
                <p className="text-sm text-blue-100 mt-1">Health Score</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setActiveView('quick');
            setExpandedSections(new Set(['quick']));
          }}
          className="group p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h3 className="font-bold text-gray-900 text-lg mb-1">Quick Updates</h3>
            <p className="text-sm text-gray-500 mb-4">Update cash & credit cards</p>
            
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600">
                {liquidPositions.length}
              </span>
              <span className="text-xs text-gray-500">positions ready</span>
            </div>
          </div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setActiveView('accounts');
            setExpandedSections(new Set(['accounts']));
          }}
          className="group p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-400 hover:shadow-xl transition-all text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h3 className="font-bold text-gray-900 text-lg mb-1">Full Reconciliation</h3>
            <p className="text-sm text-gray-500 mb-4">Verify all accounts</p>
            
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">
                {processedAccounts.filter(a => a.needsReconciliation).length}
              </span>
              <span className="text-xs text-gray-500">need attention</span>
            </div>
          </div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setActiveView('achievements');
          }}
          className="group p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-16 -mt-16" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h3 className="font-bold text-gray-900 text-lg mb-1">Achievements</h3>
            <p className="text-sm text-gray-500 mb-4">Track your progress</p>
            
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-purple-600">
                {achievements.unlocked.length}
              </span>
              <span className="text-xs text-gray-500">unlocked</span>
            </div>
          </div>
        </motion.button>
      </div>
    </div>
  );
  
  const renderQuickUpdateSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Quick Update Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Position Updates</h3>
            <p className="text-sm text-gray-500 mt-1">
              Update cash, credit cards, and liabilities quickly
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {bulkEditMode ? (
              <>
                <span className="text-sm text-blue-600 font-medium">
                  {selectedPositions.size} selected
                </span>
                <button
                  onClick={() => handleBulkUpdate(-5)}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                >
                  -5%
                </button>
                <button
                  onClick={() => handleBulkUpdate(5)}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                >
                  +5%
                </button>
                <button
                  onClick={() => {
                    setBulkEditMode(false);
                    setSelectedPositions(new Set());
                  }}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                >
                  Done
                </button>
              </>
            ) : (
              <button
                onClick={() => setBulkEditMode(true)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
              >
                Bulk Edit
              </button>
            )}
          </div>
        </div>
        
        {/* Position List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {liquidPositions.map((position, index) => {
            const config = ASSET_CONFIGS[position.asset_type] || ASSET_CONFIGS.cash;
            const Icon = config.icon;
            const hasUpdate = reconciliationData[`pos_${position.item_id}`];
            const isEditing = editingPosition === position.item_id;
            const isSelected = selectedPositions.has(position.item_id);
            const isAnimating = animateValues[position.item_id];
            
            return (
              <motion.div
                key={position.item_id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01 }}
                className={`
                  p-4 rounded-xl border-2 transition-all cursor-pointer
                  ${hasUpdate ? `${config.bgColor} ${config.borderColor}` : 'border-gray-200 bg-white'}
                  ${isAnimating ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  ${bulkEditMode ? 'hover:border-blue-400' : ''}
                `}
                onClick={() => {
                  if (bulkEditMode) {
                    const newSelected = new Set(selectedPositions);
                    if (newSelected.has(position.item_id)) {
                      newSelected.delete(position.item_id);
                    } else {
                      newSelected.add(position.item_id);
                    }
                    setSelectedPositions(newSelected);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  {bulkEditMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mr-3 w-4 h-4 text-blue-600 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`p-2 bg-gradient-to-br ${config.gradient} rounded-lg shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{position.name}</h4>
                      <p className="text-sm text-gray-500">
                        {position.account_name} • {position.institution}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right mr-4">
                      <p className="text-xs text-gray-500">Current</p>
                      <p className="font-semibold text-gray-900">
                        {showValues ? formatCurrency(position.current_value) : '••••'}
                      </p>
                      {hasUpdate && (
                        <p className={`text-xs ${config.textColor} font-medium`}>
                          New: {formatCurrency(hasUpdate.value)}
                        </p>
                      )}
                    </div>
                    
                    {!bulkEditMode && (
                      isEditing ? (
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            value={editValues.value}
                            onChange={(e) => setEditValues({ ...editValues, value: e.target.value })}
                            className="w-32 px-3 py-1.5 border border-blue-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePosition(position.item_id)}
                            className="p-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                          >
                            <Check className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPosition(null);
                              setEditValues({});
                            }}
                            className="p-1.5 bg-gray-400 hover:bg-gray-500 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditPosition(position)}
                            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors flex items-center"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          
                          {hasUpdate && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-2"
                            >
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </motion.div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Submit Section */}
      {Object.keys(reconciliationData).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <SubmitSection 
            reconciliationData={reconciliationData}
            onSubmit={submitReconciliation}
            isSubmitting={isSubmitting}
            onClear={() => setReconciliationData({})}
          />
        </motion.div>
      )}
    </motion.div>
  );

  // Render Accounts View
  const renderAccountsView = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Account Reconciliation</h3>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Institutions</option>
              {uniqueInstitutions.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowOnlyNeedsAttention(!showOnlyNeedsAttention)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showOnlyNeedsAttention 
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Flag className="w-4 h-4 inline mr-2" />
              Needs Attention
            </button>
          </div>
        </div>
        
        {/* Accounts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {processedAccounts
            .filter(account => {
              const accountName = account.name || '';
              const query = searchQuery || '';
              if (query && !accountName.toLowerCase().includes(query.toLowerCase())) return false;
              if (selectedInstitution !== 'all' && account.institution !== selectedInstitution) return false;
              if (showOnlyNeedsAttention && !account.needsReconciliation) return false;
              return true;
            })
            .map((account, index) => {
              const isExpanded = expandedAccounts.has(account.id);
              const variance = variances[account.id];
              const categoryConfig = CATEGORY_CONFIGS[account.category] || CATEGORY_CONFIGS.banking;
              const StatusIcon = variance?.status?.icon || Clock;
              
              return (
                <motion.div
                  key={account.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    bg-white rounded-xl border-2 transition-all
                    ${variance ? `${variance.status.borderColor} ${variance.status.bgColor}` : 'border-gray-200'}
                    ${account.needsReconciliation ? 'ring-2 ring-amber-400 ring-opacity-30' : ''}
                  `}
                >
                  <div className="p-5">
                    {/* Account Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2.5 bg-gradient-to-br from-${categoryConfig.color}-500 to-${categoryConfig.color}-600 rounded-xl shadow-md`}>
                          <categoryConfig.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{account.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-500">{account.institution}</span>
                            <span className="text-gray-400">•</span>
                            <span className={`text-sm px-2 py-0.5 rounded-full ${
                              categoryConfig.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                              categoryConfig.color === 'green' ? 'bg-green-100 text-green-700' :
                              categoryConfig.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {categoryConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleAccountExpansion(account.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`} />
                      </button>
                    </div>
                    
                    {/* Account Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                        <p className="text-xl font-bold text-gray-900">
                          {showValues ? formatCurrency(account.totalValue || 0) : '••••••'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Last Reconciled</p>
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${
                            account.reconciliationStatus === 'recent' ? 'text-green-600' :
                            account.reconciliationStatus === 'due' ? 'text-yellow-600' :
                            account.reconciliationStatus === 'overdue' ? 'text-red-600' :
                            'text-gray-400'
                          }`} />
                          <p className="text-sm font-medium text-gray-700">
                            {account.lastReconciled ? formatTimeAgo(account.lastReconciled) : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reconciliation Input */}
                    {!variance && (
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          placeholder="Enter statement balance"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) {
                                handleAccountReconciliation(account.id, value);
                                e.target.value = '';
                              }
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.querySelector(`input[placeholder="Enter statement balance"]`);
                            const value = parseFloat(input.value);
                            if (!isNaN(value)) {
                              handleAccountReconciliation(account.id, value);
                              input.value = '';
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Reconcile
                        </button>
                      </div>
                    )}
                    
                    {/* Variance Display */}
                    {variance && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`p-4 rounded-lg ${variance.status.bgColor} border ${variance.status.borderColor}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <variance.status.icon className={`w-5 h-5 ${variance.status.textColor}`} />
                            <span className={`font-semibold ${variance.status.textColor}`}>
                              {variance.status.label}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setVariances(prev => {
                                const newVariances = { ...prev };
                                delete newVariances[account.id];
                                return newVariances;
                              });
                              setReconciliationData(prev => {
                                const newData = { ...prev };
                                delete newData[`account_${account.id}`];
                                return newData;
                              });
                            }}
                            className="text-gray-500 hover:text-gray-700"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                       
                       <div className="grid grid-cols-3 gap-3 text-sm">
                         <div>
                           <p className="text-gray-600">App Balance</p>
                           <p className="font-semibold">{formatCurrency(variance.appBalance)}</p>
                         </div>
                         <div>
                           <p className="text-gray-600">Statement</p>
                           <p className="font-semibold">{formatCurrency(variance.actualBalance)}</p>
                         </div>
                         <div>
                           <p className="text-gray-600">Variance</p>
                           <p className={`font-semibold ${
                             variance.variance > 0 ? 'text-green-600' : 'text-red-600'
                           }`}>
                             {formatCurrency(Math.abs(variance.variance))}
                             <span className="text-xs ml-1">
                               ({variance.variancePercent > 0 ? '+' : ''}{variance.variancePercent.toFixed(1)}%)
                             </span>
                           </p>
                         </div>
                       </div>
                       
                       <p className="text-xs text-gray-600 mt-2">{variance.status.description}</p>
                     </motion.div>
                   )}
                   
                   {/* Expanded Positions */}
                   <AnimatePresence>
                     {isExpanded && account.positions.length > 0 && (
                       <motion.div
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         exit={{ opacity: 0, height: 0 }}
                         className="mt-4 pt-4 border-t border-gray-200"
                       >
                         <h5 className="font-medium text-gray-700 mb-3">
                           Positions ({account.positions.length})
                         </h5>
                         <div className="space-y-2 max-h-64 overflow-y-auto">
                           {account.positions.map(position => {
                             const config = ASSET_CONFIGS[position.asset_type];
                             const Icon = config?.icon || Wallet;
                             
                             return (
                               <div
                                 key={position.id}
                                 className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                               >
                                 <div className="flex items-center space-x-3">
                                   <Icon className={`w-4 h-4 ${config?.textColor || 'text-gray-600'}`} />
                                   <div>
                                     <p className="font-medium text-sm text-gray-900">{position.name}</p>
                                     <p className="text-xs text-gray-500">
                                       {position.quantity > 0 && `${formatNumber(position.quantity)} shares • `}
                                       {position.asset_type}
                                     </p>
                                   </div>
                                 </div>
                                 <p className="font-semibold text-gray-900">
                                   {showValues ? formatCurrency(position.current_value) : '••••'}
                                 </p>
                               </div>
                             );
                           })}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
               </motion.div>
             );
           })}
       </div>
     </div>
     
     {/* Submit Section */}
     {Object.keys(reconciliationData).length > 0 && (
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
       >
         <SubmitSection 
           reconciliationData={reconciliationData}
           onSubmit={submitReconciliation}
           isSubmitting={isSubmitting}
           onClear={() => {
             setReconciliationData({});
             setVariances({});
           }}
         />
       </motion.div>
     )}
   </motion.div>
 );

 // Render Achievements View
 const renderAchievementsView = () => (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     className="space-y-6"
   >
     {/* Achievement Stats */}
     <div className="bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-2xl p-8 text-white shadow-2xl">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-3xl font-bold mb-2">Your Achievements</h2>
           <p className="text-purple-100 text-lg">
             Track your reconciliation journey and unlock rewards
           </p>
         </div>
         <div className="text-center">
           <p className="text-5xl font-bold">{achievements.unlocked.length}</p>
           <p className="text-purple-100">Unlocked</p>
         </div>
       </div>
       
       <div className="grid grid-cols-3 gap-4 mt-6">
         <div className="bg-white/20 backdrop-blur rounded-lg p-4">
           <p className="text-purple-100 text-sm">Current Streak</p>
           <p className="text-3xl font-bold flex items-center">
             {streakRef.current} <Zap className="w-6 h-6 ml-2 text-yellow-300" />
           </p>
         </div>
         <div className="bg-white/20 backdrop-blur rounded-lg p-4">
           <p className="text-purple-100 text-sm">Total Reconciliations</p>
           <p className="text-3xl font-bold">{reconciliationHistoryRef.current.length}</p>
         </div>
         <div className="bg-white/20 backdrop-blur rounded-lg p-4">
           <p className="text-purple-100 text-sm">Health Score</p>
           <p className="text-3xl font-bold">{reconciliationHealth}%</p>
         </div>
       </div>
     </div>
     
     {/* Unlocked Achievements */}
     {achievements.unlocked.length > 0 && (
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
           <Star className="w-5 h-5 mr-2 text-yellow-500" />
           Unlocked Achievements
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {achievements.unlocked.map(achievement => (
             <AchievementBadge
               key={achievement.id}
               icon={achievement.icon}
               label={achievement.label}
               description={achievement.description}
               unlocked={true}
             />
           ))}
         </div>
       </div>
     )}
     
     {/* Locked Achievements */}
     {achievements.locked.length > 0 && (
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
           <Lock className="w-5 h-5 mr-2 text-gray-500" />
           Locked Achievements
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {achievements.locked.map(achievement => (
             <AchievementBadge
               key={achievement.id}
               icon={achievement.icon}
               label={achievement.label}
               description={achievement.description}
               unlocked={false}
             />
           ))}
         </div>
       </div>
     )}
   </motion.div>
 );
 
 // Main render
 return (
   <FixedModal
     isOpen={isOpen}
     onClose={onClose}
     title=""
     size="max-w-7xl"
     showHeader={false}
   >
     <div className="min-h-[90vh] bg-gradient-to-br from-gray-50 via-white to-blue-50 rounded-xl overflow-hidden">
       {/* Enhanced Header */}
       <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
         <div className="flex items-center justify-between">
           <div className="flex items-center space-x-4">
             <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
               <Target className="w-7 h-7 text-white" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-gray-900">Smart Reconciliation</h1>
               <p className="text-sm text-gray-500">Keep your NestEgg perfectly balanced</p>
             </div>
           </div>
           
           <div className="flex items-center space-x-3">
             {/* View Toggle */}
             <div className="flex items-center bg-gray-100 rounded-xl p-1">
               {['dashboard', 'quick', 'accounts', 'achievements'].map(view => (
                 <button
                   key={view}
                   onClick={() => setActiveView(view)}
                   className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                     activeView === view
                       ? 'bg-white shadow-sm text-blue-600'
                       : 'text-gray-600 hover:text-gray-900'
                   }`}
                 >
                   {view.charAt(0).toUpperCase() + view.slice(1)}
                 </button>
               ))}
             </div>
             
             {/* Quick Actions */}
             <button
               onClick={() => setShowValues(!showValues)}
               className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
               title={showValues ? 'Hide values' : 'Show values'}
             >
               {showValues ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
             </button>
             
             <button
               onClick={refreshAllData}
               disabled={accountsLoading || positionsLoading}
               className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
               title="Refresh data"
             >
               <RefreshCw className={`w-5 h-5 text-gray-600 ${
                 accountsLoading || positionsLoading ? 'animate-spin' : ''
               }`} />
             </button>
             
             <button
               onClick={() => setShowTutorial(true)}
               className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
               title="Help"
             >
               <HelpCircle className="w-5 h-5 text-gray-600" />
             </button>
             
             <button
               onClick={onClose}
               className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
               title="Close"
             >
               <X className="w-5 h-5 text-gray-600" />
             </button>
           </div>
         </div>
       </div>
       
       {/* Success Animation */}
       <AnimatePresence>
         {showSuccess && (
           <motion.div
             initial={{ opacity: 0, y: -50 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -50 }}
             className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50"
           >
             <div className="bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-3">
               <CheckCircle2 className="w-8 h-8" />
               <div>
                 <p className="font-bold text-lg">Reconciliation Complete!</p>
                 <p className="text-green-100">Your NestEgg is perfectly balanced</p>
               </div>
               <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
             </div>
           </motion.div>
         )}
       </AnimatePresence>
       
       {/* Message Toast */}
       <AnimatePresence>
         {message && (
           <motion.div
             initial={{ opacity: 0, x: 50 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 50 }}
             className="fixed bottom-4 right-4 z-50"
           >
             <div className={`px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2 ${
               message.type === 'success' ? 'bg-green-600 text-white' :
               message.type === 'error' ? 'bg-red-600 text-white' :
               'bg-blue-600 text-white'
             }`}>
               {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
               {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
               <span className="font-medium">{message.text}</span>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
       
       {/* Main Content Area */}
       <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
         {/* Loading State */}
         {(accountsLoading || positionsLoading || liabilitiesLoading) && (
           <div className="flex items-center justify-center py-12">
             <div className="text-center">
               <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
               <p className="text-gray-600">Loading your portfolio data...</p>
             </div>
           </div>
         )}
         
         {/* Error State */}
         {(accountsError || positionsError || liabilitiesError) && (
           <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
             <div className="flex items-center space-x-3">
               <AlertTriangle className="w-6 h-6 text-red-600" />
               <div>
                 <p className="font-semibold text-red-900">Error loading data</p>
                 <p className="text-red-700 text-sm mt-1">
                   {accountsError || positionsError || liabilitiesError}
                 </p>
               </div>
               <button
                 onClick={refreshAllData}
                 className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
               >
                 Retry
               </button>
             </div>
           </div>
         )}
         
         {/* Main Views */}
         {!accountsLoading && !positionsLoading && !liabilitiesLoading && (
           <>
             {activeView === 'dashboard' && renderDashboard()}
             {activeView === 'quick' && renderQuickUpdateSection()}
             {activeView === 'accounts' && renderAccountsView()}
             {activeView === 'achievements' && renderAchievementsView()}
           </>
         )}
       </div>
     </div>
   </FixedModal>
 );
};

// Export the button component for use in navbar
export const QuickReconciliationButton2 = () => {
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [pulseAnimation, setPulseAnimation] = useState(false);
 
 // Get reconciliation history for badge
 const [needsAttentionCount, setNeedsAttentionCount] = useState(0);
 
 useEffect(() => {
   // Check localStorage for reconciliation history
   const savedHistory = localStorage.getItem('nestegg_reconciliation_v2');
   if (savedHistory) {
     try {
       const history = JSON.parse(savedHistory);
       const lastRec = history[0];
       if (lastRec) {
         const daysSince = Math.floor((Date.now() - new Date(lastRec.date)) / (1000 * 60 * 60 * 24));
         if (daysSince > 7) {
           setNeedsAttentionCount(1);
           setPulseAnimation(true);
         }
       } else {
         setNeedsAttentionCount(1);
         setPulseAnimation(true);
       }
     } catch (e) {
       console.error('Failed to parse reconciliation history:', e);
     }
   } else {
     // No history means first time user
     setPulseAnimation(true);
   }
 }, []);
 
 return (
   <>
     <motion.button
       whileHover={{ scale: 1.05 }}
       whileTap={{ scale: 0.95 }}
       onClick={() => setIsModalOpen(true)}
       className="relative group"
     >
       <div className={`
         relative px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 
         text-white font-medium rounded-xl shadow-lg 
         hover:shadow-xl transition-all duration-300
         flex items-center space-x-2
         ${pulseAnimation ? 'animate-pulse' : ''}
       `}>
         <Target className="w-5 h-5" />
         <span className="hidden sm:inline">Smart Reconcile</span>
         
         {/* Notification Badge */}
         {needsAttentionCount > 0 && (
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md"
           >
             <span>!</span>
           </motion.div>
         )}
         
         {/* Hover Effect */}
         <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-xl transition-opacity" />
       </div>
       
       {/* Tooltip */}
       <motion.div
         initial={{ opacity: 0, y: 10 }}
         whileHover={{ opacity: 1, y: 0 }}
         className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 pointer-events-none z-50"
       >
         <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
           <div className="font-semibold mb-1">Quick Reconciliation</div>
           <div className="text-gray-300">Keep your portfolio accurate</div>
           {needsAttentionCount > 0 && (
             <div className="text-yellow-300 mt-1">⚠️ Needs attention</div>
           )}
           <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
         </div>
       </motion.div>
     </motion.button>
     
     {/* Modal */}
     <QuickReconciliationModal2
       isOpen={isModalOpen}
       onClose={() => setIsModalOpen(false)}
     />
   </>
 );
};

// Also export the modal as default
export default QuickReconciliationModal2;