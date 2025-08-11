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
  Loader2, ArrowRight, ChevronsRight, MoreVertical, Filter
} from 'lucide-react';
import { useDataStore } from '../../store/DataStore';
import { useAccounts } from '../../store/hooks/useAccounts';
import { useDetailedPositions } from '../../store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '../../store/hooks/useGroupedLiabilities';
import { useGroupedPositions } from '../../store/hooks/useGroupedPositions';
import { fetchWithAuth } from '../../utils/api';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';
import { updatePosition } from '../../utils/apimethods/positionMethods';
import FixedModal from './FixedModal';

// Asset type configurations with better visual identity
const ASSET_CONFIGS = {
  cash: { 
    icon: Banknote, 
    color: 'emerald', 
    gradient: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    quickEdit: true,
    label: 'Cash & Savings'
  },
  credit_card: { 
    icon: CreditCard, 
    color: 'red', 
    gradient: 'from-red-500 to-rose-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    quickEdit: true,
    label: 'Credit Cards'
  },
  mortgage: { 
    icon: Home, 
    color: 'purple', 
    gradient: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    quickEdit: true,
    label: 'Mortgages'
  },
  loan: { 
    icon: FileText, 
    color: 'orange', 
    gradient: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    quickEdit: true,
    label: 'Loans'
  },
  security: { 
    icon: TrendingUp, 
    color: 'blue', 
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    quickEdit: false,
    label: 'Securities'
  },
  crypto: { 
    icon: Coins, 
    color: 'yellow', 
    gradient: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    quickEdit: false,
    label: 'Crypto'
  },
  metal: { 
    icon: Gem, 
    color: 'gray', 
    gradient: 'from-gray-500 to-slate-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    quickEdit: false,
    label: 'Metals'
  },
  realestate: { 
    icon: Building2, 
    color: 'indigo', 
    gradient: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    quickEdit: true,
    label: 'Real Estate'
  },
  other_assets: { 
    icon: MoreVertical, 
    color: 'teal', 
    gradient: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-700',
    quickEdit: true,
    label: 'Other Assets'
  }
};

// Liquid position types for quick reconciliation
const LIQUID_POSITION_TYPES = ['cash', 'credit_card', 'loan', 'mortgage'];

// Variance status helper with visual indicators
const getVarianceStatus = (variancePercent) => {
  const absVariance = Math.abs(variancePercent);
  if (absVariance <= 0.5) return { 
    color: 'green', 
    icon: CheckCircle2, 
    label: 'Perfect Match',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700'
  };
  if (absVariance <= 2) return { 
    color: 'blue', 
    icon: CheckCircle2, 
    label: 'Close Match',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700'
  };
  if (absVariance <= 5) return { 
    color: 'yellow', 
    icon: AlertCircle, 
    label: 'Minor Variance',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700'
  };
  return { 
    color: 'red', 
    icon: AlertTriangle, 
    label: 'Needs Review',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700'
  };
};

// Format time ago helper
const formatTimeAgo = (date) => {
  if (!date) return 'Never';
  const now = new Date();
  const then = new Date(date);
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 90) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

// Animated counter component
const AnimatedNumber = ({ value, format = 'currency' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 20;
    const stepValue = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  if (format === 'currency') return formatCurrency(displayValue);
  if (format === 'percent') return formatPercentage(displayValue);
  return formatNumber(displayValue);
};

const QuickReconciliationModal2 = ({ isOpen, onClose }) => {
  // DataStore hooks - using the proper hooks like QuickEditDelete does
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
  
  // Get DataStore actions for additional operations
  const { actions } = useDataStore();
  
  // Core state management
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [reconciliationData, setReconciliationData] = useState({});
  const [variances, setVariances] = useState({});
  const [editingPosition, setEditingPosition] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [expandedSections, setExpandedSections] = useState(new Set(['quick']));
  const [quickEditMode, setQuickEditMode] = useState({});
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  
  // UI state
  const [message, setMessage] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [animateValues, setAnimateValues] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [selectedAssetType, setSelectedAssetType] = useState('all');
  
  // Refs
  const messageTimeoutRef = useRef(null);
  const reconciliationHistoryRef = useRef([]);
  
  // Load reconciliation history from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const history = localStorage.getItem('nestegg_reconciliation_v2');
      if (history) {
        reconciliationHistoryRef.current = JSON.parse(history);
      }
      
      // Refresh all data when modal opens
      refreshAccounts();
      refreshPositions();
      refreshLiabilities();
      refreshGrouped();
    }
  }, [isOpen]);
  
  // Process positions from DataStore - properly mapping fields like QuickEditDelete
  const processedPositions = useMemo(() => {
    if (!dataStorePositions || !Array.isArray(dataStorePositions)) return [];
    
    return dataStorePositions.map(pos => ({
      id: pos.itemId || pos.id,
      unified_id: pos.unifiedId || pos.id,
      item_id: pos.itemId,
      account_id: pos.accountId,
      identifier: pos.identifier,
      name: pos.name,
      asset_type: pos.assetType,
      quantity: pos.quantity,
      current_value: pos.currentValue,
      cost_basis: pos.costBasis,
      gain_loss: pos.gainLoss,
      gain_loss_percent: pos.gainLossPercent,
      account_name: pos.accountName || 'Unknown Account',
      institution: pos.institution,
      purchase_date: pos.purchaseDate,
      current_price: pos.currentPrice,
      // Additional fields for display
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
        r.accounts?.includes(account.id)
      );
      
      // Get positions for this account
      const accountPositions = processedPositions.filter(p => 
        p.account_id === account.id
      );
      
      return {
        ...account,
        positions: accountPositions,
        position_count: accountPositions.length,
        lastReconciled: lastRec?.date,
        daysSinceReconciliation: lastRec ? 
          Math.floor((Date.now() - new Date(lastRec.date)) / (1000 * 60 * 60 * 24)) : null,
        needsReconciliation: !lastRec || 
          Math.floor((Date.now() - new Date(lastRec.date)) / (1000 * 60 * 60 * 24)) > 14
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
    
    const reconciledAccounts = processedAccounts.filter(a => 
      a.daysSinceReconciliation !== null && a.daysSinceReconciliation <= 14
    ).length;
    
    const liquidUpToDate = liquidPositions.filter(p => {
      const data = reconciliationData[`pos_${p.item_id}`];
      return data && (Date.now() - new Date(data.timestamp)) < 14 * 24 * 60 * 60 * 1000;
    }).length;
    
    const accountScore = (reconciledAccounts / totalAccounts) * 50;
    const liquidScore = liquidPositions.length > 0 ? 
      (liquidUpToDate / liquidPositions.length) * 50 : 50;
    
    return Math.round(accountScore + liquidScore);
  }, [processedAccounts, liquidPositions, reconciliationData]);
  
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
  
  // Handle position edit with proper data structure
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
    const position = processedPositions.find(p => p.item_id === positionId);
    if (!position) return;
    
    try {
      setLoadingStates(prev => ({ ...prev, [`save_${positionId}`]: true }));
      
      // Update in reconciliation data first
      handleQuickUpdate(positionId, parseFloat(editValues.value) || 0);
      
      // Clear edit mode
      setEditingPosition(null);
      setEditValues({});
      
      showMessage('success', `Updated ${position.name}`);
    } catch (error) {
      console.error('Error saving position:', error);
      showMessage('error', 'Failed to update position');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`save_${positionId}`]: false }));
    }
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
  
  // Submit reconciliation to backend
  const submitReconciliation = async () => {
    setIsSubmitting(true);
    
    try {
      const updates = [];
      const reconciliations = [];
      
      // Process position updates using positionMethods
      for (const [key, data] of Object.entries(reconciliationData)) {
        if (key.startsWith('pos_')) {
          const positionId = parseInt(key.replace('pos_', ''));
          const position = processedPositions.find(p => p.item_id === positionId);
          
          if (position) {
            // Prepare update data based on asset type
            let updateData = {};
            
            switch (position.asset_type) {
              case 'cash':
                updateData = {
                  amount: parseFloat(data.value),
                  interest_rate: 0
                };
                break;
                
              case 'credit_card':
              case 'loan':
              case 'mortgage':
                updateData = {
                  current_balance: parseFloat(data.value)
                };
                break;
                
              case 'security':
                updateData = {
                  quantity: position.quantity,
                  cost_basis: position.cost_basis
                };
                break;
                
              case 'crypto':
                updateData = {
                  quantity: position.quantity,
                  cost_basis: position.cost_basis
                };
                break;
                
              case 'metal':
                updateData = {
                  quantity: position.quantity,
                  purchase_price: position.cost_basis / position.quantity
                };
                break;
                
              default:
                updateData = {
                  current_value: parseFloat(data.value)
                };
            }
            
            updates.push({
              id: positionId,
              data: updateData,
              type: position.asset_type
            });
          }
        } else if (key.startsWith('account_')) {
          const accountId = parseInt(key.replace('account_', ''));
          const account = processedAccounts.find(a => a.id === accountId);
          
          if (account) {
            // Post to reconciliation table
            const response = await fetchWithAuth('/api/reconciliation/account', {
              method: 'POST',
              body: JSON.stringify({
                account_id: accountId,
                app_balance: account.totalValue,
                actual_balance: data.statementBalance
              })
            });
            
            if (response.ok) {
              reconciliations.push(accountId);
            }
          }
        }
      }
      
      // Execute all position updates
      for (const update of updates) {
        await updatePosition(update.id, update.data, update.type);
      }
      
      // Save to history
      const historyEntry = {
        date: new Date().toISOString(),
        accounts: reconciliations,
        positions: updates.length,
        totalValue: processedAccounts.reduce((sum, a) => sum + a.totalValue, 0),
        health: reconciliationHealth
      };
      
      reconciliationHistoryRef.current.unshift(historyEntry);
      if (reconciliationHistoryRef.current.length > 30) {
        reconciliationHistoryRef.current.pop();
      }
      localStorage.setItem('nestegg_reconciliation_v2', JSON.stringify(reconciliationHistoryRef.current));
      
      // Show success
      setConfetti(true);
      showMessage('success', '✨ Reconciliation complete! Your NestEgg is perfectly balanced.');
      setTimeout(() => setConfetti(false), 5000);
      
      // Refresh all data
      await Promise.all([
        refreshAccounts(),
        refreshPositions(),
        refreshLiabilities(),
        refreshGrouped(),
        actions.fetchPortfolioData(true)
      ]);
      
      // Reset state
      setTimeout(() => {
        setReconciliationData({});
        setVariances({});
        setSelectedPositions(new Set());
        setActiveView('dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Reconciliation error:', error);
      showMessage('error', 'Failed to complete reconciliation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
  
  // Render quick update section with all features
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
            <p className="text-sm text-gray-500">
              {liquidPositions.length} liquid positions • {
                Object.keys(reconciliationData).filter(k => k.startsWith('pos_')).length
              } pending updates
            </p>
          </div>
        </div>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform ${
            expandedSections.has('quick') ? 'rotate-180' : ''
          }`}
        />
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
            {/* Bulk Actions Bar */}
            {bulkEditMode && selectedPositions.size > 0 && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700">
                  {selectedPositions.size} positions selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkUpdate(-5)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                  >
                    -5%
                  </button>
                  <button
                    onClick={() => handleBulkUpdate(0)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => handleBulkUpdate(5)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                  >
                    +5%
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPositions(new Set());
                      setBulkEditMode(false);
                    }}
                    className="ml-2 px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Controls */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setBulkEditMode(!bulkEditMode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    bulkEditMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
                </button>
                
                {!bulkEditMode && (
                  <select
                    value={selectedAssetType}
                    onChange={(e) => setSelectedAssetType(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Cards</option>
                    <option value="loan">Loans</option>
                    <option value="mortgage">Mortgages</option>
                  </select>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                {liquidPositions.filter(p => 
                  selectedAssetType === 'all' || p.asset_type === selectedAssetType
                ).length} items
              </div>
            </div>
            
            {/* Positions List */}
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {liquidPositions.length > 0 ? (
                liquidPositions
                  .filter(p => selectedAssetType === 'all' || p.asset_type === selectedAssetType)
                  .map(position => {
                    const AssetIcon = ASSET_CONFIGS[position.asset_type]?.icon || Wallet;
                    const config = ASSET_CONFIGS[position.asset_type] || ASSET_CONFIGS.cash;
                    const hasUpdate = reconciliationData[`pos_${position.item_id}`];
                    const isAnimating = animateValues[position.item_id];
                    const isEditing = editingPosition === position.item_id;
                    const isSelected = selectedPositions.has(position.item_id);
                    
                    return (
                      <motion.div
                        key={position.item_id}
                        layout
                        whileHover={{ scale: 1.01 }}
                        className={`
                          p-4 rounded-lg border-2 transition-all cursor-pointer
                          ${hasUpdate ? `${config.bgColor} ${config.borderColor}` : 'border-gray-200 bg-white'}
                          ${isAnimating ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                          ${isSelected ? 'ring-2 ring-blue-500' : ''}
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
                          {/* Checkbox for bulk edit */}
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
                            <div className={`p-2 bg-gradient-to-br ${config.gradient} rounded-lg`}>
                              <AssetIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{position.name}</h4>
                              <p className="text-sm text-gray-500">
                                {position.account_name} • {position.institution}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {/* Current Value Display */}
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
                            
                            {/* Edit Controls */}
                            {!bulkEditMode && (
                              isEditing ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    value={editValues.value}
                                    onChange={(e) => setEditValues({ ...editValues, value: e.target.value })}
                                    className="w-32 px-3 py-1.5 border border-blue-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500"
                                    step="0.01"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSavePosition(position.item_id);
                                    }}
                                    className="p-1.5 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                                    disabled={loadingStates[`save_${position.item_id}`]}
                                  >
                                    {loadingStates[`save_${position.item_id}`] ? (
                                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4 text-white" />
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingPosition(null);
                                      setEditValues({});
                                    }}
                                    className="p-1.5 bg-gray-400 hover:bg-gray-500 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newValue = (hasUpdate?.value ?? position.current_value) - 100;
                                      handleQuickUpdate(position.item_id, newValue);
                                    }}
                                    className="p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                                  >
                                    <Minus className="w-4 h-4 text-red-600" />
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditPosition(position);
                                    }}
                                    className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors flex items-center"
                                  >
                                    <Edit2 className="w-4 h-4 text-blue-600" />
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newValue = (hasUpdate?.value ?? position.current_value) + 100;
                                      handleQuickUpdate(position.item_id, newValue);
                                    }}
                                    className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                                  >
                                    <Plus className="w-4 h-4 text-green-600" />
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
                        
                        {/* Change Summary */}
                        {hasUpdate && !isEditing && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`mt-3 pt-3 border-t ${config.borderColor}`}
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className={`font-medium ${
                                hasUpdate.value - position.current_value >= 0 
                                  ? 'text-green-700' 
                                  : 'text-red-700'
                              }`}>
                                Change: {formatCurrency(hasUpdate.value - position.current_value)} ({
                                  formatPercentage((hasUpdate.value - position.current_value) / position.current_value * 100)
                                })
                              </span>
                              <span className="text-gray-500">
                                Updated {formatTimeAgo(hasUpdate.timestamp)}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No liquid positions found</p>
                  <p className="text-sm mt-2">Add cash, credit cards, or loans to get started</p>
                  <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Add Position
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  
  // Render account reconciliation with full position details
  const renderAccountSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-4"
    >
      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Institutions</option>
              {uniqueInstitutions.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
            />
          </div>
          
          <div className="text-sm text-gray-500">
            {processedAccounts.filter(a => 
              (selectedInstitution === 'all' || a.institution === selectedInstitution) &&
              (!searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()))
            ).length} accounts
          </div>
        </div>
      </div>
      
      {/* Accounts by Institution */}
      {Object.entries(
        processedAccounts
          .filter(a => 
            (selectedInstitution === 'all' || a.institution === selectedInstitution) &&
            (!searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .reduce((groups, account) => {
            const institution = account.institution || 'Other';
            if (!groups[institution]) groups[institution] = [];
            groups[institution].push(account);
            return groups;
          }, {})
      ).map(([institution, accounts]) => (
        <motion.div
          key={institution}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Institution Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">{institution}</h3>
                <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                  {accounts.length} accounts
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Total: {showValues ? formatCurrency(
                  accounts.reduce((sum, a) => sum + a.totalValue, 0)
                ) : '••••'}
              </div>
            </div>
          </div>
          
          {/* Accounts List */}
          <div className="divide-y divide-gray-200">
            {accounts.map(account => {
              const variance = variances[account.id];
              const hasReconciliation = reconciliationData[`account_${account.id}`];
              const isExpanded = expandedAccounts.has(account.id);
              const accountPositions = account.positions || [];
              
              return (
                <div key={account.id}>
                  {/* Account Row */}
                  <div className={`p-4 ${
                    hasReconciliation 
                      ? 'bg-green-50' 
                      : account.needsReconciliation 
                        ? 'bg-amber-50' 
                        : 'bg-white'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleAccountExpansion(account.id)}
                          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`} />
                        </button>
                        
                        <div>
                          <h4 className="font-medium text-gray-900">{account.name}</h4>
                          <p className="text-sm text-gray-500">
                            {account.type} • {account.position_count} positions • 
                            Last: {formatTimeAgo(account.lastReconciled)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">App Balance</p>
                          <p className="font-semibold text-gray-900">
                            {showValues ? formatCurrency(account.totalValue) : '••••'}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            placeholder="Statement balance"
                            value={reconciliationData[`account_${account.id}`]?.statementBalance ?? ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) {
                                handleAccountReconciliation(account.id, value);
                              }
                            }}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                          />
                          
                          {variance && (
                            <div className={`px-3 py-2 rounded-lg ${variance.status.bgColor} ${variance.status.borderColor} border`}>
                              <div className="flex items-center space-x-2">
                                <variance.status.icon className={`w-4 h-4 ${variance.status.textColor}`} />
                                <div>
                                  <p className={`text-xs font-medium ${variance.status.textColor}`}>
                                    {variance.status.label}
                                  </p>
                                  <p className={`text-xs ${variance.status.textColor}`}>
                                    {formatCurrency(variance.variance)} ({formatPercentage(variance.variancePercent)})
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Positions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="bg-gray-50 border-t border-gray-200 overflow-hidden"
                      >
                        <div className="p-4">
                          <h5 className="font-medium text-gray-700 mb-3">Positions in this account</h5>
                          
                          {accountPositions.length > 0 ? (
                            <div className="space-y-2">
                              {accountPositions.map(position => {
                                const AssetIcon = ASSET_CONFIGS[position.asset_type]?.icon || Wallet;
                                const config = ASSET_CONFIGS[position.asset_type] || {};
                                const hasUpdate = reconciliationData[`pos_${position.item_id}`];
                                const isEditingPos = editingPosition === position.item_id;
                                
                                return (
                                  <div
                                    key={position.item_id}
                                    className={`p-3 bg-white rounded-lg border ${
                                      hasUpdate ? config.borderColor : 'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <AssetIcon className={`w-4 h-4 ${config.textColor || 'text-gray-600'}`} />
                                        <div>
                                          <p className="font-medium text-sm text-gray-900">{position.name}</p>
                                          <p className="text-xs text-gray-500">
                                            {position.quantity} units • {position.asset_type}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2">
                                        <div className="text-right">
                                          <p className="text-xs text-gray-500">Value</p>
                                          <p className="font-medium text-sm">
                                            {formatCurrency(hasUpdate?.value || position.current_value)}
                                          </p>
                                        </div>
                                        
                                        {isEditingPos ? (
                                          <div className="flex items-center space-x-1">
                                            <input
                                              type="number"
                                              value={editValues.value}
                                              onChange={(e) => setEditValues({ ...editValues, value: e.target.value })}
                                              className="w-24 px-2 py-1 text-sm border border-blue-300 rounded"
                                              step="0.01"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => handleSavePosition(position.item_id)}
                                              className="p-1 bg-green-500 hover:bg-green-600 rounded text-white"
                                            >
                                              <Check className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingPosition(null);
                                                setEditValues({});
                                              }}
                                              className="p-1 bg-gray-400 hover:bg-gray-500 rounded text-white"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => handleEditPosition(position)}
                                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                                            >
                                              <Edit2 className="w-4 h-4 text-gray-500" />
                                            </button>
                                            
                                            {hasUpdate && (
                                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No positions in this account
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
  
  // Render dashboard with comprehensive stats
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Health Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Reconciliation Health</h2>
            <p className="text-blue-100 text-lg">
              Your NestEgg accuracy score
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <p className="text-blue-100 text-sm">Accounts Up-to-date</p>
                <p className="text-2xl font-bold">
                  {processedAccounts.filter(a => !a.needsReconciliation).length}/{processedAccounts.length}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                <p className="text-blue-100 text-sm">Pending Updates</p>
                <p className="text-2xl font-bold">
                  {Object.keys(reconciliationData).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="white"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(reconciliationHealth / 100) * 440} 440`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <AnimatedNumber value={reconciliationHealth} format="number" />
                <span className="text-5xl font-bold">%</span>
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
          className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Quick Updates</h3>
          <p className="text-sm text-gray-500 mb-3">Update cash & credit cards</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">
              {liquidPositions.length}
            </span>
            <span className="text-xs text-gray-500">positions</span>
          </div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setActiveView('accounts');
            setExpandedSections(new Set(['accounts']));
          }}
          className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-300 hover:shadow-xl transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">Full Reconciliation</h3>
          <p className="text-sm text-gray-500 mb-3">Verify all accounts</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-600">
              {processedAccounts.filter(a => a.needsReconciliation).length}
            </span>
            <span className="text-xs text-gray-500">need attention</span>
          </div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setActiveView('accounts');
            setSelectedInstitution(uniqueInstitutions[0] || 'all');
          }}
          className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">By Institution</h3>
          <p className="text-sm text-gray-500 mb-3">Review by bank</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-purple-600">
              {uniqueInstitutions.length}
            </span>
            <span className="text-xs text-gray-500">institutions</span>
          </div>
        </motion.button>
      </div>
      
      {/* Recent Activity & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-600" />
            Recent Activity
          </h3>
          
          {reconciliationHistoryRef.current.length > 0 ? (
            <div className="space-y-3">
              {reconciliationHistoryRef.current.slice(0, 5).map((rec, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      {rec.accounts?.length || 0} accounts, {rec.positions || 0} positions
                    </p>
                    <p className="text-sm text-gray-500">{formatTimeAgo(rec.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {rec.health}% accuracy
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No reconciliation history yet</p>
          )}
        </motion.div>
        
        {/* Portfolio Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-gray-600" />
            Portfolio Breakdown
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Securities</span>
                <span className="text-sm font-medium text-gray-900">
                  {investmentPositions.filter(p => p.asset_type === 'security').length} positions
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(investmentPositions.filter(p => p.asset_type === 'security').length / processedPositions.length * 100) || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Crypto</span>
                <span className="text-sm font-medium text-gray-900">
                  {investmentPositions.filter(p => p.asset_type === 'crypto').length} positions
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(investmentPositions.filter(p => p.asset_type === 'crypto').length / processedPositions.length * 100) || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Cash & Credit</span>
                <span className="text-sm font-medium text-gray-900">
                  {liquidPositions.length} positions
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(liquidPositions.length / processedPositions.length * 100) || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Other Assets</span>
                <span className="text-sm font-medium text-gray-900">
                  {processedPositions.filter(p => !['security', 'crypto', 'cash', 'credit_card', 'loan', 'mortgage', 'metal'].includes(p.asset_type)).length} positions
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(processedPositions.filter(p => !['security', 'crypto', 'cash', 'credit_card', 'loan', 'mortgage', 'metal'].includes(p.asset_type)).length / processedPositions.length * 100) || 0}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
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
              {/* View Toggle Pills */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'dashboard' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>Dashboard</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveView('quick');
                    setExpandedSections(new Set(['quick']));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'quick' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>Quick</span>
                    {liquidPositions.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {liquidPositions.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveView('accounts');
                    setExpandedSections(new Set(['accounts']));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeView === 'accounts' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accounts</span>
                    {processedAccounts.filter(a => a.needsReconciliation).length > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        {processedAccounts.filter(a => a.needsReconciliation).length}
                      </span>
                    )}
                  </div>
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowValues(!showValues)}
                  className={`p-2 rounded-lg transition-all ${
                    showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                  title={showValues ? 'Hide values' : 'Show values'}
                >
                  {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={() => {
                    refreshAccounts();
                    refreshPositions();
                    refreshLiabilities();
                    refreshGrouped();
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={accountsLoading || positionsLoading}
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${
                    accountsLoading || positionsLoading ? 'animate-spin' : ''
                  }`} />
                </button>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {(accountsLoading || positionsLoading) && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-xl p-6 flex items-center space-x-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-gray-900">Loading your portfolio...</p>
                <p className="text-sm text-gray-500">This won't take long</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {activeView === 'dashboard' && renderDashboard()}
          
          {activeView === 'quick' && (
            <div className="space-y-6">
              {renderQuickUpdateSection()}
              
              {/* Pending Changes Summary */}
              {Object.keys(reconciliationData).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">Ready to Submit</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Review your changes before submitting
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {Object.keys(reconciliationData).filter(k => k.startsWith('pos_')).length} position updates
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {Object.keys(reconciliationData).filter(k => k.startsWith('account_')).length} account reconciliations
                      </span>
                    </div>
                  </div>
                  
                  {/* Changes List */}
                  <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                    {Object.entries(reconciliationData).map(([key, data]) => {
                      if (key.startsWith('pos_')) {
                        const posId = parseInt(key.replace('pos_', ''));
                        const position = processedPositions.find(p => p.item_id === posId);
                        if (!position) return null;
                        
                        return (
                          <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Edit2 className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-900">{position.name}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">
                                {formatCurrency(position.current_value)} → {formatCurrency(data.value)}
                              </span>
                              <button
                                onClick={() => {
                                  const newData = { ...reconciliationData };
                                  delete newData[key];
                                  setReconciliationData(newData);
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setReconciliationData({});
                        setVariances({});
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                      Clear All
                    </button>
                    
                    <button
                      onClick={submitReconciliation}
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
                </motion.div>
              )}
            </div>
          )}
          
          {activeView === 'accounts' && (
            <div className="space-y-6">
              {renderAccountSection()}
              
              {/* Submit Button for Account View */}
              {(Object.keys(variances).length > 0 || Object.keys(reconciliationData).length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Ready to Submit</h3>
                      <p className="text-sm text-gray-500">
                        {Object.keys(variances).length} accounts verified • {
                          Object.keys(reconciliationData).filter(k => k.startsWith('pos_')).length
                        } positions updated
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
                </motion.div>
              )}
            </div>
          )}
        </div>
        
        {/* Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center space-x-3 ${
                message.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                message.type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' :
                'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> :
               message.type === 'error' ? <AlertCircle className="w-6 h-6" /> :
               <Info className="w-6 h-6" />}
              <span className="font-medium">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Confetti Celebration */}
        {confetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-4" />
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold text-gray-900 mb-2"
                >
                  Perfect Balance! 🎉
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl text-gray-600"
                >
                  Your NestEgg is perfectly reconciled
                </motion.p>
              </div>
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