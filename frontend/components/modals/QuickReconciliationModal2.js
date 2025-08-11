import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, X, Eye, EyeOff, RefreshCw, Zap, CheckCircle2,
  Plus, Minus, Edit2, Check, Loader2, ChevronDown,
  AlertCircle, Building2, Wallet, CreditCard, Home,
  FileText, TrendingUp, Coins, Activity, Trophy,
  ArrowRight, Clock, Sparkles
} from 'lucide-react';
import { useAccounts } from '../../store/hooks/useAccounts';
import { useDetailedPositions } from '../../store/hooks/useDetailedPositions';
import { useDataStore } from '../../store/DataStore';
import { fetchWithAuth } from '../../utils/api';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import FixedModal from './FixedModal';

// Asset configurations
const ASSET_CONFIGS = {
  cash: { 
    icon: Wallet, 
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700'
  },
  credit_card: { 
    icon: CreditCard, 
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-700'
  },
  mortgage: { 
    icon: Home, 
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700'
  },
  loan: { 
    icon: FileText, 
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-700'
  },
  security: { 
    icon: TrendingUp, 
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700'
  },
  crypto: { 
    icon: Coins, 
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-700'
  }
};

const QuickReconciliationModal2 = ({ isOpen, onClose }) => {
  // DataStore hooks
  const { 
    accounts: dataStoreAccounts = [], 
    loading: accountsLoading,
    refresh: refreshAccounts 
  } = useAccounts();
  
  const { 
    positions: dataStorePositions = [], 
    loading: positionsLoading,
    refresh: refreshPositions 
  } = useDetailedPositions();
  
  const { actions } = useDataStore();
  
  // Core state
  const [activeView, setActiveView] = useState('dashboard');
  const [showValues, setShowValues] = useState(true);
  const [reconciliationData, setReconciliationData] = useState({});
  const [editingPosition, setEditingPosition] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Refs for history
  const historyRef = useRef([]);
  
  // Load history on mount
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('nestegg_recon_v2');
      if (saved) {
        try {
          historyRef.current = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse history:', e);
        }
      }
      refreshAccounts();
      refreshPositions();
    }
  }, [isOpen]);
  
  // Process positions safely
  const processedPositions = useMemo(() => {
    if (!dataStorePositions || !Array.isArray(dataStorePositions)) return [];
    
    return dataStorePositions.map(pos => ({
      id: pos.itemId || pos.id,
      item_id: pos.itemId,
      account_id: pos.accountId,
      name: pos.name || pos.identifier || 'Unknown',
      asset_type: pos.assetType || 'unknown',
      current_value: pos.currentValue || 0,
      quantity: pos.quantity || 0,
      cost_basis: pos.costBasis || 0,
      account_name: pos.accountName || 'Unknown Account',
      institution: pos.institution || 'Unknown'
    }));
  }, [dataStorePositions]);
  
  // Get liquid positions
  const liquidPositions = useMemo(() => {
    return processedPositions.filter(pos => 
      ['cash', 'credit_card', 'loan', 'mortgage'].includes(pos.asset_type)
    );
  }, [processedPositions]);
  
  // Process accounts with positions
  const processedAccounts = useMemo(() => {
    if (!dataStoreAccounts || !Array.isArray(dataStoreAccounts)) return [];
    
    return dataStoreAccounts.map(account => {
      const accountPositions = processedPositions.filter(p => 
        p.account_id === account.id
      );
      
      const lastRec = historyRef.current.find(h => 
        h.accounts && h.accounts.includes(account.id)
      );
      
      return {
        ...account,
        positions: accountPositions,
        position_count: accountPositions.length,
        needsReconciliation: !lastRec || 
          (Date.now() - new Date(lastRec.date)) > 14 * 24 * 60 * 60 * 1000
      };
    });
  }, [dataStoreAccounts, processedPositions]);
  
  // Calculate health score
  const healthScore = useMemo(() => {
    const total = processedAccounts.length;
    if (total === 0) return 100;
    
    const upToDate = processedAccounts.filter(a => !a.needsReconciliation).length;
    return Math.round((upToDate / total) * 100);
  }, [processedAccounts]);
  
  // Handle position update
  const handleUpdatePosition = (positionId, newValue) => {
    setReconciliationData(prev => ({
      ...prev,
      [`pos_${positionId}`]: {
        value: newValue,
        timestamp: new Date().toISOString()
      }
    }));
  };
  
  // Handle edit save
  const handleSaveEdit = (positionId) => {
    const value = parseFloat(editValue);
    if (!isNaN(value)) {
      handleUpdatePosition(positionId, value);
    }
    setEditingPosition(null);
    setEditValue('');
  };
  
  // Submit reconciliation
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Process updates
      const updates = Object.entries(reconciliationData).filter(([key]) => 
        key.startsWith('pos_')
      );
      
      // Update positions via API
      for (const [key, data] of updates) {
        const posId = parseInt(key.replace('pos_', ''));
        const position = processedPositions.find(p => p.item_id === posId);
        
        if (position) {
          // Send update based on asset type
          const endpoint = position.asset_type === 'cash' ? '/cash' : 
                          position.asset_type === 'credit_card' ? '/liabilities' :
                          '/positions';
          
          await fetchWithAuth(`${endpoint}/${posId}`, {
            method: 'PUT',
            body: JSON.stringify({
              current_value: data.value,
              amount: data.value
            })
          });
        }
      }
      
      // Save to history
      const newHistory = {
        date: new Date().toISOString(),
        positions: updates.length,
        accounts: processedAccounts.filter(a => 
          a.positions.some(p => reconciliationData[`pos_${p.item_id}`])
        ).map(a => a.id)
      };
      
      historyRef.current.unshift(newHistory);
      if (historyRef.current.length > 30) historyRef.current.pop();
      localStorage.setItem('nestegg_recon_v2', JSON.stringify(historyRef.current));
      
      // Show success
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Refresh data
      await Promise.all([
        refreshAccounts(),
        refreshPositions(),
        actions.fetchPortfolioData(true)
      ]);
      
      // Reset
      setReconciliationData({});
      setActiveView('dashboard');
      
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({ type: 'error', text: 'Failed to submit reconciliation' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Health Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Reconciliation Health</h2>
            <p className="text-blue-100">Your portfolio accuracy score</p>
            
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <p className="text-sm opacity-90">Accounts</p>
                <p className="text-2xl font-bold">{processedAccounts.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <p className="text-sm opacity-90">Positions</p>
                <p className="text-2xl font-bold">{processedPositions.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                <p className="text-sm opacity-90">Pending</p>
                <p className="text-2xl font-bold">{Object.keys(reconciliationData).length}</p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-6xl font-bold">{healthScore}%</div>
            <p className="text-sm mt-2 opacity-90">Health Score</p>
          </div>
        </div>
      </motion.div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveView('quick')}
          className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all"
        >
          <Zap className="w-8 h-8 text-blue-500 mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">Quick Updates</h3>
          <p className="text-sm text-gray-500">Cash & credit positions</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{liquidPositions.length}</p>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveView('accounts')}
          className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-green-400 hover:shadow-lg transition-all"
        >
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">Full Reconciliation</h3>
          <p className="text-sm text-gray-500">All accounts & positions</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {processedAccounts.filter(a => a.needsReconciliation).length}
          </p>
        </motion.button>
      </div>
      
      {/* Recent History */}
      {historyRef.current.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-2">
            {historyRef.current.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.positions} positions updated
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
  
  // Render quick updates
  const renderQuickUpdates = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Position Updates</h3>
        
        {liquidPositions.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {liquidPositions.map(position => {
              const config = ASSET_CONFIGS[position.asset_type] || ASSET_CONFIGS.cash;
              const Icon = config.icon;
              const hasUpdate = reconciliationData[`pos_${position.item_id}`];
              const isEditing = editingPosition === position.item_id;
              
              return (
                <motion.div
                  key={position.item_id}
                  layout
                  className={`p-4 rounded-lg border-2 ${
                    hasUpdate ? `${config.bgColor} ${config.borderColor}` : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${config.textColor}`} />
                      <div>
                        <p className="font-medium text-gray-900">{position.name}</p>
                        <p className="text-sm text-gray-500">
                          {position.account_name} • {position.institution}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-3">
                        <p className="text-xs text-gray-500">Current</p>
                        <p className="font-semibold">
                          {showValues ? formatCurrency(position.current_value) : '••••'}
                        </p>
                        {hasUpdate && (
                          <p className={`text-xs ${config.textColor}`}>
                            New: {formatCurrency(hasUpdate.value)}
                          </p>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-28 px-2 py-1 border rounded text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(position.item_id)}
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPosition(null);
                              setEditValue('');
                            }}
                            className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const newVal = (hasUpdate?.value || position.current_value) - 100;
                              handleUpdatePosition(position.item_id, newVal);
                            }}
                            className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPosition(position.item_id);
                              setEditValue(hasUpdate?.value || position.current_value);
                            }}
                            className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const newVal = (hasUpdate?.value || position.current_value) + 100;
                              handleUpdatePosition(position.item_id, newVal);
                            }}
                            className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {hasUpdate && (
                            <CheckCircle2 className="w-5 h-5 text-green-500 ml-2" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No liquid positions found</p>
          </div>
        )}
      </div>
      
      {/* Submit Button */}
      {Object.keys(reconciliationData).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">Ready to Submit</h4>
              <p className="text-sm text-gray-500 mt-1">
                {Object.keys(reconciliationData).length} updates pending
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center"
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
  );
  
  // Render accounts view
  const renderAccounts = () => (
    <div className="space-y-4">
      {processedAccounts.map(account => {
        const isExpanded = expandedAccounts.has(account.id);
        const accountPositions = account.positions || [];
        
        return (
          <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => {
                const newExpanded = new Set(expandedAccounts);
                if (isExpanded) {
                  newExpanded.delete(account.id);
                } else {
                  newExpanded.add(account.id);
                }
                setExpandedAccounts(newExpanded);
              }}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">{account.name}</h4>
                  <p className="text-sm text-gray-500">
                    {account.institution} • {accountPositions.length} positions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="font-semibold">
                    {showValues ? formatCurrency(account.totalValue) : '••••'}
                  </p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`} />
              </div>
            </button>
            
            {/* Expanded Positions */}
            <AnimatePresence>
              {isExpanded && accountPositions.length > 0 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="border-t border-gray-200"
                >
                  <div className="p-4 bg-gray-50">
                    <div className="space-y-2">
                      {accountPositions.map(position => {
                        const config = ASSET_CONFIGS[position.asset_type] || {};
                        const Icon = config.icon || Wallet;
                        const hasUpdate = reconciliationData[`pos_${position.item_id}`];
                        
                        return (
                          <div
                            key={position.item_id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg"
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className={`w-4 h-4 ${config.textColor || 'text-gray-600'}`} />
                              <div>
                                <p className="font-medium text-sm">{position.name}</p>
                                <p className="text-xs text-gray-500">{position.asset_type}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium">
                                {formatCurrency(hasUpdate?.value || position.current_value)}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPosition(position.item_id);
                                  setEditValue(hasUpdate?.value || position.current_value);
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Edit2 className="w-3 h-3 text-gray-500" />
                              </button>
                              {hasUpdate && (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
  
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="max-w-6xl"
      showHeader={false}
    >
      <div className="min-h-[85vh] bg-gradient-to-br from-gray-50 to-white rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Smart Reconciliation</h1>
                <p className="text-sm text-gray-500">Keep your portfolio accurate</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    activeView === 'dashboard' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('quick')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    activeView === 'quick' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500'
                  }`}
                >
                  Quick
                </button>
                <button
                  onClick={() => setActiveView('accounts')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    activeView === 'accounts' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500'
                  }`}
                >
                  Accounts
                </button>
              </div>
              
              <button
                onClick={() => setShowValues(!showValues)}
                className={`p-2 rounded-lg ${
                  showValues ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => {
                  refreshAccounts();
                  refreshPositions();
                }}
                disabled={accountsLoading || positionsLoading}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${
                  accountsLoading || positionsLoading ? 'animate-spin' : ''
                }`} />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {accountsLoading || positionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Loading your portfolio...</p>
              </div>
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && renderDashboard()}
              {activeView === 'quick' && renderQuickUpdates()}
              {activeView === 'accounts' && renderAccounts()}
            </>
          )}
        </div>
        
        {/* Success Animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <div className="bg-white rounded-xl shadow-2xl p-8 pointer-events-auto">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 text-center">Success!</h2>
                <p className="text-gray-600 text-center mt-2">Reconciliation complete</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error Message */}
        <AnimatePresence>
          {message && message.type === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {message.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FixedModal>
  );
};

// Export button for navbar
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg" />
        <div className="relative flex items-center">
          <Target className={`w-5 h-5 mr-2 transition-all duration-300 ${
            isHovered ? 'text-white rotate-12' : 'text-blue-400'
          }`} />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">
            Smart Reconcile
          </span>
          {isHovered && (
            <Sparkles className="w-4 h-4 ml-2 text-yellow-300 animate-pulse" />
          )}
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