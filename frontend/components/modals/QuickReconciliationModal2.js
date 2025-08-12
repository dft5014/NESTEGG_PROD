// QuickReconciliationModal2.js - Complete with all components included
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
  Search, Settings, HelpCircle, Star, Flag, Bell, Users, Trash2,
  ArrowUp, ArrowDown, Move, RotateCcw, BarChart2, PieChart,
  Layers, Brain, Lightbulb, Gauge, BookOpen,
  Heart, Flame, Medal, Crown, Diamond, Rocket, Gift, Keyboard
} from 'lucide-react';

// DataStore hooks
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';

// Utils
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { fetchWithAuth } from '@/utils/api';


// Import the QuickUpdatePanel component (the only external one)
import FixedModal from './FixedModal';
import QuickUpdatePanel from '@/components/QuickUpdatePanel';

// ============================================================================
// EMBEDDED COMPONENTS
// ============================================================================

// AccountValidator Component
const AccountValidator = ({ 
  accounts, 
  positions,
  variances,
  onValidate,
  onResolveVariance 
}) => {
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [showValues, setShowValues] = useState(true);
  
  const accountsWithStatus = useMemo(() => {
    return accounts.map(account => {
      const accountPositions = positions.filter(p => p.accountId === account.id);
      const totalPositionsValue = accountPositions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
      const variance = variances.get(`account_${account.id}`);
      
      let validationStatus = 'pending';
      if (variance) {
        if (Math.abs(variance.percent) < 1) validationStatus = 'valid';
        else if (Math.abs(variance.percent) < 5) validationStatus = 'warning';
        else validationStatus = 'error';
      }
      
      return {
        ...account,
        positionsCount: accountPositions.length,
        positionsValue: totalPositionsValue,
        variance,
        validationStatus
      };
    });
  }, [accounts, positions, variances]);
  
  const toggleAccount = (accountId) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'border-green-600 bg-green-900/20';
      case 'warning':
        return 'border-yellow-600 bg-yellow-900/20';
      case 'error':
        return 'border-red-600 bg-red-900/20';
      default:
        return 'border-gray-700 bg-gray-900';
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-blue-500" />
          Account Validation
        </h3>
        
        <button
          onClick={() => setShowValues(!showValues)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {accountsWithStatus.map(account => {
          const isExpanded = expandedAccounts.has(account.id);
          
          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border transition-all ${getStatusColor(account.validationStatus)}`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleAccount(account.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button className="p-1">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    
                    {getStatusIcon(account.validationStatus)}
                    
                    <div>
                      <div className="font-medium text-white">
                        {account.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {account.institution} • {account.positionsCount} positions
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-mono text-white">
                      {showValues ? formatCurrency(account.totalValue) : '••••••'}
                    </div>
                    {account.variance && (
                      <div className={`text-xs ${
                        account.variance.percent > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {account.variance.percent > 0 ? '+' : ''}{formatPercentage(account.variance.percent)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-700">
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-400">
                        Statement Balance
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Enter statement balance"
                          className="px-3 py-2 bg-gray-700 text-white rounded-lg w-40 text-right"
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value.replace(/[^0-9.-]/g, ''));
                            if (!isNaN(value)) {
                              onValidate(account.id, value, 'account');
                            }
                          }}
                        />
                        <Calculator className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    
                    {account.variance && (
                      <button
                        onClick={() => onResolveVariance(account.id, 'accepted')}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Accept Variance
                      </button>
                    )}
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

// PositionDrilldown Component
const PositionDrilldown = ({ 
  account, 
  positions, 
  draft, 
  onUpdate, 
  onBulkUpdate 
}) => {
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const togglePosition = (posId) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(posId)) {
      newSelected.delete(posId);
    } else {
      newSelected.add(posId);
    }
    setSelectedPositions(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };
  
  const selectAll = () => {
    setSelectedPositions(new Set(positions.map(p => p.id)));
    setShowBulkActions(true);
  };
  
  const deselectAll = () => {
    setSelectedPositions(new Set());
    setShowBulkActions(false);
  };
  
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Position Details: {account?.name}
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={selectAll}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            Clear
          </button>
        </div>
      </div>
      
      {showBulkActions && (
        <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-600">
          <div className="text-sm text-blue-400 mb-2">
            {selectedPositions.size} positions selected
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onBulkUpdate(Array.from(selectedPositions), 5)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              +5%
            </button>
            <button
              onClick={() => onBulkUpdate(Array.from(selectedPositions), -5)}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              -5%
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {positions.map(position => {
          const isSelected = selectedPositions.has(position.id);
          const draftValue = draft.get(`pos_${position.id}`);
          
          return (
            <div
              key={position.id}
              className={`p-3 rounded-lg border transition-all ${
                isSelected 
                  ? 'border-blue-600 bg-blue-900/20' 
                  : 'border-gray-700 bg-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePosition(position.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {position.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {position.quantity} shares
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-mono text-white">
                    {formatCurrency(draftValue?.value || position.currentValue)}
                  </div>
                  {draftValue && (
                    <div className="text-xs text-blue-400">Modified</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ReconciliationStats Component
const ReconciliationStats = ({ stats, compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            stats.healthScore > 80 ? 'bg-green-500' : 
            stats.healthScore > 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-gray-400">Health: {stats.healthScore}%</span>
        </div>
        <div className="text-gray-400">
          {stats.reconciledAccounts}/{stats.totalAccounts} reconciled
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Health Score</div>
          <div className="text-2xl font-bold text-white">{stats.healthScore}%</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Accounts</div>
          <div className="text-2xl font-bold text-white">
            {stats.reconciledAccounts}/{stats.totalAccounts}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Avg Days</div>
          <div className="text-2xl font-bold text-white">{stats.averageDaysSince}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Variances</div>
          <div className="text-2xl font-bold text-white">{stats.positionsWithVariance}</div>
        </div>
      </div>
    </div>
  );
};

// IntelligentSuggestions Component
const IntelligentSuggestions = ({ 
  suggestions, 
  confidence,
  onAccept,
  priorities 
}) => {
  const getConfidenceColor = (conf) => {
    if (conf >= 0.8) return 'text-green-400';
    if (conf >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };
  
  const getConfidenceLabel = (conf) => {
    if (conf >= 0.8) return 'High confidence';
    if (conf >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };
  
  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-600/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-500" />
          AI Insights
        </h3>
        <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
      </div>
      
      {priorities.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Needs Attention</div>
          <div className="space-y-2">
            {priorities.slice(0, 3).map((priority, index) => (
              <motion.div
                key={`${priority.type}-${priority.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <div>
                    <div className="text-sm text-white">
                      {priority.type === 'account' ? 'Account' : 'Position'} #{priority.id}
                    </div>
                    <div className="text-xs text-gray-400">
                      {priority.reason}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {suggestions.size > 0 && (
        <div>
          <div className="text-sm text-gray-400 mb-2">Smart Suggestions</div>
          <div className="space-y-2">
            {Array.from(suggestions.entries()).slice(0, 5).map(([key, suggestion]) => {
              const conf = confidence.get(key) || 0;
              
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-white">
                        Suggested value
                      </span>
                    </div>
                    <span className={`text-xs ${getConfidenceColor(conf)}`}>
                      {getConfidenceLabel(conf)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-white">
                      {formatCurrency(suggestion.value)}
                    </div>
                    <button
                      onClick={() => onAccept(key, suggestion)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      Accept
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                  
                  {suggestion.basis && (
                    <div className="text-xs text-gray-400 mt-2">
                      {suggestion.basis}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>Tip: Use Tab to navigate between fields, Enter to save</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const QuickReconciliationModal2 = ({ isOpen, onClose }) => {
  // DataStore Integration
  const { 
    accounts = [], 
    loading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts 
  } = useAccounts();
  
  const { 
    positions = [], 
    loading: positionsLoading,
    error: positionsError,
    refresh: refreshPositions 
  } = useDetailedPositions();
  
  const { 
    liabilities = [], 
    loading: liabilitiesLoading,
    error: liabilitiesError,
    refreshData: refreshLiabilities 
  } = useGroupedLiabilities();
  
  const { 
    positions: groupedPositions = [],
    loading: groupedLoading,
    refresh: refreshGrouped
  } = useGroupedPositions();
  
  const { actions } = useDataStore();

  // State Management
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [draft, setDraft] = useState(new Map());
  const [variances, setVariances] = useState(new Map());
  const [suggestions, setSuggestions] = useState(new Map());
  const [confidence, setConfidence] = useState(new Map());
  const [animateValues, setAnimateValues] = useState(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Process data
  const processedData = useMemo(() => {
    const priorities = [];
    const stats = {
      totalAccounts: accounts.length,
      reconciledAccounts: 0,
      needsAttentionAccounts: 0,
      totalPositions: positions.length,
      positionsWithVariance: 0,
      averageDaysSince: 30,
      healthScore: 75
    };
    
    // Calculate stats
    accounts.forEach(account => {
      if (draft.has(`account_${account.id}`)) {
        stats.reconciledAccounts++;
      }
    });
    
    stats.accountsReconciledPercent = (stats.reconciledAccounts / stats.totalAccounts) * 100;
    
    return {
      accounts,
      positions,
      priorities: priorities.slice(0, 10),
      stats
    };
  }, [accounts, positions, draft]);

  // Handlers
  const handleQuickUpdate = useCallback((itemId, value, type = 'position') => {
    const key = type === 'account' ? `account_${itemId}` : `pos_${itemId}`;
    
    setDraft(prev => {
      const updated = new Map(prev);
      updated.set(key, {
        value,
        originalValue: type === 'account' 
          ? accounts.find(a => a.id === itemId)?.totalValue
          : positions.find(p => p.id === itemId)?.currentValue,
        timestamp: Date.now()
      });
      return updated;
    });
    
    // Trigger animation
    setAnimateValues(prev => {
      const updated = new Map(prev);
      updated.set(key, true);
      setTimeout(() => {
        setAnimateValues(curr => {
          const next = new Map(curr);
          next.delete(key);
          return next;
        });
      }, 500);
      return updated;
    });
  }, [accounts, positions]);

  const handleBulkUpdate = useCallback((positionIds, percentage) => {
    positionIds.forEach(posId => {
      const position = positions.find(p => p.id === posId);
      if (position) {
        const newValue = position.currentValue * (1 + percentage / 100);
        handleQuickUpdate(posId, newValue, 'position');
      }
    });
    
    showNotification('success', `Updated ${positionIds.length} positions`);
  }, [positions, handleQuickUpdate]);

  const submitReconciliation = async () => {
    if (draft.size === 0) {
      showNotification('warning', 'No changes to submit');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare updates
      const updates = [];
      
      for (const [key, data] of draft.entries()) {
        const [type, id] = key.split('_');
        
        updates.push({
          type,
          id: parseInt(id),
          data: {
            value: data.value,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Submit to backend
      const response = await fetchWithAuth('/reconciliation/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      
      if (!response.ok) throw new Error('Failed to submit reconciliation');
      
      // Clear draft
      setDraft(new Map());
      
      // Refresh DataStore
      await Promise.all([
        refreshAccounts(),
        refreshPositions(),
        refreshLiabilities(),
        refreshGrouped()
      ]);
      
      showNotification('success', 'Reconciliation complete!');
      
      // Close after delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Reconciliation error:', error);
      showNotification('error', 'Failed to submit reconciliation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Loading state
  if (accountsLoading || positionsLoading || liabilitiesLoading) {
    return (
      <FixedModal isOpen={isOpen} onClose={onClose} title="Loading...">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-400">Preparing your reconciliation workspace...</p>
        </div>
      </FixedModal>
    );
  }

  return (
    <FixedModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-blue-500" />
            <span>Smart Reconciliation</span>
          </div>
          <ReconciliationStats stats={processedData.stats} compact />
        </div>
      }
      className="max-w-7xl"
    >
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex space-x-6 overflow-hidden">
          {/* Left Panel - Quick Updates */}
          <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto pr-2">
            <IntelligentSuggestions
              suggestions={suggestions}
              confidence={confidence}
              onAccept={(key, suggestion) => {
                const [type, id] = key.split('_');
                handleQuickUpdate(id, suggestion.value, type);
              }}
              priorities={processedData.priorities}
            />
            
            <QuickUpdatePanel
              accounts={processedData.accounts}
              positions={processedData.positions}
              liabilities={liabilities}
              draft={draft}
              onUpdate={handleQuickUpdate}
              animateValues={animateValues}
            />
          </div>

          {/* Center Panel - Account Validation */}
          <div className="flex-1 flex flex-col space-y-4 overflow-y-auto px-2">
            <AccountValidator
              accounts={processedData.accounts}
              positions={groupedPositions}
              variances={variances}
              onValidate={handleQuickUpdate}
              onResolveVariance={(accountId, resolution) => {
                console.log('Variance resolved:', accountId, resolution);
              }}
            />
            
            {selectedAccount && (
              <PositionDrilldown
                account={selectedAccount}
                positions={processedData.positions.filter(p => 
                  p.accountId === selectedAccount.id
                )}
                draft={draft}
                onUpdate={handleQuickUpdate}
                onBulkUpdate={handleBulkUpdate}
              />
            )}
          </div>

          {/* Right Panel - Stats */}
          <div className="w-1/3 flex flex-col space-y-4 overflow-y-auto pl-2">
            <ReconciliationStats stats={processedData.stats} />
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                {draft.size} unsaved changes
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReconciliation}
                disabled={draft.size === 0 || isSubmitting}
                className={`px-8 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                  draft.size > 0 && !isSubmitting
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-5 h-5" />
                    <span>Complete Reconciliation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
              notification.type === 'success' ? 'bg-green-600' :
              notification.type === 'error' ? 'bg-red-600' :
              notification.type === 'warning' ? 'bg-yellow-600' :
              'bg-blue-600'
            } text-white`}
          >
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {notification.type === 'error' && <XCircle className="w-5 h-5" />}
            {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
            {notification.type === 'info' && <Info className="w-5 h-5" />}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </FixedModal>
  );
};

// ============================================================================
// BUTTON EXPORT
// ============================================================================

// Export button component with enhanced styling
export const QuickReconciliationButton2 = ({ 
  className = '', 
  variant = 'primary',
  size = 'md',
  showHealthScore = false,
  ...otherProps 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center text-white py-2 px-5 transition-all duration-300 transform hover:scale-105 ${className}`}
        {...otherProps}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"></div>
        <div className="relative flex items-center">
          <Zap className={`
            w-5 h-5 mr-2 transition-all duration-300
            ${isHovered ? 'text-white rotate-12' : 'text-purple-400'}
          `} />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">
            Smart Reconcile
          </span>
          {isHovered && (
            <Sparkles className="w-4 h-4 ml-2 text-yellow-300 animate-pulse" />
          )}
        </div>
      </button>
      
      {isModalOpen && (
        <QuickReconciliationModal2 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
};

export default QuickReconciliationModal2;