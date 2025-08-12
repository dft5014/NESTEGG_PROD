import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  X, ChevronRight, ChevronDown, Edit3, Trash2, Save, AlertCircle, 
  CheckCircle2, DollarSign, TrendingUp, TrendingDown, Activity,
  Building, CreditCard, Layers, Search, Filter, Settings,
  PlayCircle, Target, CheckSquare, Star, Award, Zap, RefreshCw,
  Plus, Minus, Eye, EyeOff, ArrowUpRight, ArrowDownRight,
  Calculator, History, Upload, Download, Info, HelpCircle,
  AlertTriangle, Check, Loader2, Sparkles, BarChart3, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/hooks/useAccounts';
import { useDetailedPositions } from '@/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/hooks/useGroupedLiabilities';
import { updatePosition, deletePosition } from '@/utils/api/positions';
import { updateAccount, deleteAccount } from '@/utils/api/accounts';
import { updateLiability, deleteLiability } from '@/utils/api/liabilities';
import { submitReconciliation } from '@/utils/api/reconciliation';
import { formatCurrency, formatPercent } from '@/utils/formatting';
import Confetti from 'react-confetti';

// Constants for asset types and reconciliation
const ASSET_TYPE_CONFIG = {
  stocks: { color: 'blue', icon: TrendingUp, label: 'Stocks' },
  bonds: { color: 'green', icon: Shield, label: 'Bonds' },
  etfs: { color: 'purple', icon: Layers, label: 'ETFs' },
  mutual_funds: { color: 'indigo', icon: Package, label: 'Mutual Funds' },
  cash: { color: 'gray', icon: DollarSign, label: 'Cash' },
  crypto: { color: 'orange', icon: Zap, label: 'Crypto' },
  real_estate: { color: 'brown', icon: Building, label: 'Real Estate' },
  credit_card: { color: 'red', icon: CreditCard, label: 'Credit Cards' },
  loan: { color: 'pink', icon: FileText, label: 'Loans' },
  mortgage: { color: 'purple', icon: Home, label: 'Mortgages' },
  other: { color: 'gray', icon: Package, label: 'Other' }
};

const RECONCILIATION_STAGES = {
  welcome: 'welcome',
  quickEdit: 'quickEdit',
  bulkUpdate: 'bulkUpdate',
  reconcile: 'reconcile',
  review: 'review',
  complete: 'complete'
};

// LocalStorage helper functions
const STORAGE_KEYS = {
  reconciliationData: 'nestegg_reconciliation_data',
  reconciliationHistory: 'nestegg_reconciliation_history',
  pendingUpdates: 'nestegg_pending_updates',
  streak: 'nestegg_reconciliation_streak',
  achievements: 'nestegg_achievements'
};

const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Main Component
const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // DataStore hooks
  const { 
    accounts = [], 
    loading: accountsLoading,
    refresh: refreshAccounts 
  } = useAccounts();
  
  const { 
    positions = [], 
    loading: positionsLoading,
    refresh: refreshPositions 
  } = useDetailedPositions();
  
  const { 
    liabilities = [], 
    loading: liabilitiesLoading,
    refreshData: refreshLiabilities 
  } = useGroupedLiabilities();

  // Core state
  const [currentStage, setCurrentStage] = useState(RECONCILIATION_STAGES.welcome);
  const [reconciliationData, setReconciliationData] = useState({});
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [groupBy, setGroupBy] = useState('account');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showValues, setShowValues] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Refs
  const messageTimeoutRef = useRef(null);
  const reconciliationHistoryRef = useRef([]);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedData = loadFromStorage(STORAGE_KEYS.reconciliationData, {});
      const savedPending = loadFromStorage(STORAGE_KEYS.pendingUpdates, {});
      const savedHistory = loadFromStorage(STORAGE_KEYS.reconciliationHistory, []);
      
      setReconciliationData(savedData);
      setPendingUpdates(savedPending);
      reconciliationHistoryRef.current = savedHistory;
      
      // Clear any stale data older than 24 hours
      const now = Date.now();
      const cleanedData = Object.entries(savedData).reduce((acc, [key, value]) => {
        if (value.timestamp && now - new Date(value.timestamp).getTime() < 86400000) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      if (Object.keys(cleanedData).length !== Object.keys(savedData).length) {
        setReconciliationData(cleanedData);
        saveToStorage(STORAGE_KEYS.reconciliationData, cleanedData);
      }
    }
  }, [isOpen]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (reconciliationData && Object.keys(reconciliationData).length > 0) {
      saveToStorage(STORAGE_KEYS.reconciliationData, reconciliationData);
    }
  }, [reconciliationData]);

  useEffect(() => {
    if (pendingUpdates && Object.keys(pendingUpdates).length > 0) {
      saveToStorage(STORAGE_KEYS.pendingUpdates, pendingUpdates);
    }
  }, [pendingUpdates]);

  // Process and group data
  const processedData = useMemo(() => {
    const allItems = [
      ...positions.map(p => ({
        ...p,
        itemType: 'position',
        id: p.itemId || p.id,
        value: p.currentValue,
        account: accounts.find(a => a.id === p.accountId)
      })),
      ...liabilities.map(l => ({
        ...l,
        itemType: 'liability',
        id: l.id,
        value: l.currentBalance,
        asset_type: l.type || 'loan'
      }))
    ];

    // Apply search filter
    const filtered = allItems.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(searchLower) ||
        item.identifier?.toLowerCase().includes(searchLower) ||
        item.account?.account_name?.toLowerCase().includes(searchLower)
      );
    });

    // Apply type filter
    const typeFiltered = filterType === 'all' 
      ? filtered 
      : filtered.filter(item => item.asset_type === filterType);

    // Group data
    const grouped = {};
    typeFiltered.forEach(item => {
      const groupKey = groupBy === 'account' 
        ? item.account?.account_name || 'Unassigned'
        : groupBy === 'type'
        ? ASSET_TYPE_CONFIG[item.asset_type]?.label || 'Other'
        : 'All Items';

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          items: [],
          totalValue: 0,
          totalPending: 0,
          account: groupBy === 'account' ? item.account : null
        };
      }

      grouped[groupKey].items.push(item);
      grouped[groupKey].totalValue += item.value || 0;
      
      const pendingValue = reconciliationData[`${item.itemType}_${item.id}`]?.value;
      if (pendingValue !== undefined) {
        grouped[groupKey].totalPending += pendingValue - (item.value || 0);
      }
    });

    return grouped;
  }, [positions, liabilities, accounts, searchQuery, filterType, groupBy, reconciliationData]);

  // Show message helper
  const showMessage = useCallback((type, text, duration = 5000) => {
    setMessage({ type, text });
    
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    
    if (duration > 0) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage(null);
      }, duration);
    }
  }, []);

  // Hierarchical update handler
  const handleHierarchicalUpdate = useCallback((item, newValue) => {
    const key = `${item.itemType}_${item.id}`;
    
    setReconciliationData(prev => ({
      ...prev,
      [key]: {
        value: newValue,
        originalValue: item.value,
        timestamp: new Date().toISOString(),
        itemType: item.itemType,
        name: item.name,
        accountId: item.accountId
      }
    }));

    // If updating a group, update all children
    if (selectedItems.size > 1 && selectedItems.has(item.id)) {
      const percentChange = ((newValue - item.value) / item.value) * 100;
      
      selectedItems.forEach(itemId => {
        if (itemId !== item.id) {
          const selectedItem = Object.values(processedData)
            .flatMap(group => group.items)
            .find(i => i.id === itemId);
          
          if (selectedItem) {
            const childNewValue = selectedItem.value * (1 + percentChange / 100);
            const childKey = `${selectedItem.itemType}_${selectedItem.id}`;
            
            setReconciliationData(prev => ({
              ...prev,
              [childKey]: {
                value: childNewValue,
                originalValue: selectedItem.value,
                timestamp: new Date().toISOString(),
                itemType: selectedItem.itemType,
                name: selectedItem.name,
                accountId: selectedItem.accountId
              }
            }));
          }
        }
      });
      
      showMessage('success', `Updated ${selectedItems.size} items`);
      setSelectedItems(new Set());
    }
  }, [selectedItems, processedData, showMessage]);

  // Quick edit handlers
  const handleEditItem = useCallback((item) => {
    setEditingItem(item);
    setEditValues({
      value: reconciliationData[`${item.itemType}_${item.id}`]?.value || item.value,
      quantity: item.quantity,
      cost_basis: item.costBasis
    });
  }, [reconciliationData]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;

    const newValue = parseFloat(editValues.value);
    if (isNaN(newValue)) {
      showMessage('error', 'Invalid value');
      return;
    }

    handleHierarchicalUpdate(editingItem, newValue);
    setEditingItem(null);
    setEditValues({});
    showMessage('success', 'Item updated');
  }, [editingItem, editValues, handleHierarchicalUpdate, showMessage]);

  // Delete handler
  const handleDeleteItem = useCallback(async (item) => {
    try {
      if (item.itemType === 'position') {
        await deletePosition(item.id);
        await refreshPositions();
      } else if (item.itemType === 'liability') {
        await deleteLiability(item.id);
        await refreshLiabilities();
      }
      
      // Remove from reconciliation data
      const key = `${item.itemType}_${item.id}`;
      setReconciliationData(prev => {
        const newData = { ...prev };
        delete newData[key];
        return newData;
      });
      
      showMessage('success', `${item.name} deleted successfully`);
    } catch (error) {
      console.error('Error deleting item:', error);
      showMessage('error', 'Failed to delete item');
    }
  }, [refreshPositions, refreshLiabilities, showMessage]);

  // Bulk update handlers
  const handleBulkPercentageUpdate = useCallback((percentage) => {
    const itemsToUpdate = selectedItems.size > 0 
      ? Array.from(selectedItems)
      : Object.values(processedData).flatMap(group => group.items.map(i => i.id));

    itemsToUpdate.forEach(itemId => {
      const item = Object.values(processedData)
        .flatMap(group => group.items)
        .find(i => i.id === itemId);
      
      if (item) {
        const newValue = item.value * (1 + percentage / 100);
        handleHierarchicalUpdate(item, newValue);
      }
    });

    showMessage('success', `Applied ${percentage}% update to ${itemsToUpdate.length} items`);
    setSelectedItems(new Set());
  }, [selectedItems, processedData, handleHierarchicalUpdate, showMessage]);

  // Submit reconciliation
  const handleSubmitReconciliation = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      const updates = [];
      
      // Process all pending updates
      for (const [key, data] of Object.entries(reconciliationData)) {
        const [itemType, itemId] = key.split('_');
        
        if (itemType === 'position') {
          const position = positions.find(p => (p.itemId || p.id) === parseInt(itemId));
          if (position) {
            await updatePosition(itemId, {
              ...position,
              current_value: data.value
            }, position.assetType);
            updates.push({ type: 'position', id: itemId, value: data.value });
          }
        } else if (itemType === 'liability') {
          const liability = liabilities.find(l => l.id === parseInt(itemId));
          if (liability) {
            await updateLiability(itemId, {
              ...liability,
              current_balance: data.value
            });
            updates.push({ type: 'liability', id: itemId, value: data.value });
          }
        }
      }

      // Save to history
      const historyEntry = {
        date: new Date().toISOString(),
        updates: updates.length,
        totalValue: Object.values(reconciliationData).reduce((sum, item) => sum + (item.value || 0), 0),
        items: updates
      };
      
      const history = [historyEntry, ...reconciliationHistoryRef.current].slice(0, 30);
      reconciliationHistoryRef.current = history;
      saveToStorage(STORAGE_KEYS.reconciliationHistory, history);

      // Clear reconciliation data
      setReconciliationData({});
      setPendingUpdates({});
      saveToStorage(STORAGE_KEYS.reconciliationData, {});
      saveToStorage(STORAGE_KEYS.pendingUpdates, {});

      // Refresh data
      await Promise.all([
        refreshAccounts(),
        refreshPositions(),
        refreshLiabilities()
      ]);

      setShowConfetti(true);
      showMessage('success', `Successfully updated ${updates.length} items!`);
      
      setTimeout(() => {
        setShowConfetti(false);
        setCurrentStage(RECONCILIATION_STAGES.complete);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting reconciliation:', error);
      showMessage('error', 'Failed to submit reconciliation');
    } finally {
      setIsSubmitting(false);
    }
  }, [reconciliationData, positions, liabilities, refreshAccounts, refreshPositions, refreshLiabilities, showMessage]);

  // Render stage content
  const renderStageContent = () => {
    switch (currentStage) {
      case RECONCILIATION_STAGES.welcome:
        return <WelcomeStage onSelectWorkflow={setCurrentStage} stats={getStats()} />;
      
      case RECONCILIATION_STAGES.quickEdit:
        return (
          <QuickEditStage 
            processedData={processedData}
            reconciliationData={reconciliationData}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            editingItem={editingItem}
            editValues={editValues}
            showValues={showValues}
            onEdit={handleEditItem}
            onSaveEdit={handleSaveEdit}
            onDelete={handleDeleteItem}
            onUpdateValue={handleHierarchicalUpdate}
            onBulkUpdate={handleBulkPercentageUpdate}
            onCancelEdit={() => { setEditingItem(null); setEditValues({}); }}
          />
        );
      
      case RECONCILIATION_STAGES.bulkUpdate:
        return (
          <BulkUpdateStage
            processedData={processedData}
            reconciliationData={reconciliationData}
            onBulkUpdate={handleBulkPercentageUpdate}
            onBack={() => setCurrentStage(RECONCILIATION_STAGES.quickEdit)}
          />
        );
      
      case RECONCILIATION_STAGES.review:
        return (
          <ReviewStage
            reconciliationData={reconciliationData}
            processedData={processedData}
            onSubmit={handleSubmitReconciliation}
            onBack={() => setCurrentStage(RECONCILIATION_STAGES.quickEdit)}
            isSubmitting={isSubmitting}
          />
        );
      
      case RECONCILIATION_STAGES.complete:
        return (
          <CompleteStage
            history={reconciliationHistoryRef.current}
            onClose={onClose}
            onNewReconciliation={() => {
              setCurrentStage(RECONCILIATION_STAGES.welcome);
              setReconciliationData({});
            }}
          />
        );
      
      default:
        return null;
    }
  };

  // Get stats helper
  const getStats = () => {
    const totalItems = positions.length + liabilities.length;
    const pendingCount = Object.keys(reconciliationData).length;
    const totalValue = [...positions, ...liabilities].reduce((sum, item) => 
      sum + (item.currentValue || item.current_balance || 0), 0
    );
    
    return {
      totalItems,
      pendingCount,
      totalValue,
      accountCount: accounts.length,
      lastReconciliation: reconciliationHistoryRef.current[0]?.date
    };
  };

  // Main render
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Smart Reconciliation</h2>
                  {currentStage !== RECONCILIATION_STAGES.welcome && (
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white">
                      {currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  {Object.keys(reconciliationData).length > 0 && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-white/20 rounded-full">
                      <Activity className="w-4 h-4 text-white" />
                      <span className="text-sm font-medium text-white">
                        {Object.keys(reconciliationData).length} pending
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    {showValues ? 
                      <Eye className="w-5 h-5 text-white" /> : 
                      <EyeOff className="w-5 h-5 text-white" />
                    }
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Navigation breadcrumbs */}
              {currentStage !== RECONCILIATION_STAGES.welcome && (
                <div className="flex items-center space-x-2 mt-3 text-white/80 text-sm">
                  <button
                    onClick={() => setCurrentStage(RECONCILIATION_STAGES.welcome)}
                    className="hover:text-white transition-colors"
                  >
                    Home
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-white">
                    {currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Search and filters bar */}
            {(currentStage === RECONCILIATION_STAGES.quickEdit || 
              currentStage === RECONCILIATION_STAGES.bulkUpdate) && (
              <div className="px-6 py-3 border-b bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search positions, accounts, or liabilities..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                  
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="account">Group by Account</option>
                    <option value="type">Group by Type</option>
                    <option value="none">No Grouping</option>
                  </select>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {renderStageContent()}
            </div>

            {/* Footer actions */}
            {currentStage !== RECONCILIATION_STAGES.welcome && 
             currentStage !== RECONCILIATION_STAGES.complete && (
              <div className="px-6 py-4 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (currentStage === RECONCILIATION_STAGES.quickEdit) {
                        setCurrentStage(RECONCILIATION_STAGES.welcome);
                      } else if (currentStage === RECONCILIATION_STAGES.review) {
                        setCurrentStage(RECONCILIATION_STAGES.quickEdit);
                      } else {
                        setCurrentStage(RECONCILIATION_STAGES.quickEdit);
                      }
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Back
                  </button>
                  
                  <div className="flex items-center space-x-3">
                    {Object.keys(reconciliationData).length > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setReconciliationData({});
                            saveToStorage(STORAGE_KEYS.reconciliationData, {});
                            showMessage('info', 'Cleared all pending updates');
                          }}
                          className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
                        >
                          Clear All
                        </button>
                        
                        <button
                          onClick={() => setCurrentStage(RECONCILIATION_STAGES.review)}
                          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center space-x-2"
                        >
                          <span>Review Changes</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Message toast */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
                  message.type === 'success' ? 'bg-green-500 text-white' :
                  message.type === 'error' ? 'bg-red-500 text-white' :
                  'bg-blue-500 text-white'
                }`}
              >
                {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {message.type === 'info' && <Info className="w-5 h-5" />}
                <span>{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confetti */}
          {showConfetti && (
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={200}
              gravity={0.1}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Stage Components
const WelcomeStage = ({ onSelectWorkflow, stats }) => (
  <div className="space-y-6">
    <div className="text-center">
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Smart Reconciliation</h3>
      <p className="text-gray-600">Choose your workflow to keep your portfolio accurate</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelectWorkflow(RECONCILIATION_STAGES.quickEdit)}
        className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all"
      >
        <Edit3 className="w-8 h-8 text-blue-600 mb-3" />
        <h4 className="font-semibold text-gray-900 mb-1">Quick Edit</h4>
        <p className="text-sm text-gray-600">Edit individual items and values</p>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelectWorkflow(RECONCILIATION_STAGES.bulkUpdate)}
        className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all"
      >
        <Calculator className="w-8 h-8 text-purple-600 mb-3" />
        <h4 className="font-semibold text-gray-900 mb-1">Bulk Update</h4>
        <p className="text-sm text-gray-600">Apply percentage changes to multiple items</p>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelectWorkflow(RECONCILIATION_STAGES.quickEdit)}
        className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all"
      >
        <PlayCircle className="w-8 h-8 text-green-600 mb-3" />
        <h4 className="font-semibold text-gray-900 mb-1">Full Workflow</h4>
        <p className="text-sm text-gray-600">Complete reconciliation process</p>
      </motion.button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
        <p className="text-sm text-gray-600">Total Items</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-blue-600">{stats.pendingCount}</p>
        <p className="text-sm text-gray-600">Pending Updates</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
        <p className="text-sm text-gray-600">Total Value</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">{stats.accountCount}</p>
        <p className="text-sm text-gray-600">Accounts</p>
      </div>
    </div>
  </div>
);

const QuickEditStage = ({ 
  processedData, 
  reconciliationData, 
  expandedGroups,
  setExpandedGroups,
  selectedItems,
  setSelectedItems,
  editingItem,
  editValues,
  showValues,
  onEdit,
  onSaveEdit,
  onDelete,
  onUpdateValue,
  onBulkUpdate,
  onCancelEdit
}) => {
  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedItems.size} items selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onBulkUpdate(5)}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              +5%
            </button>
            <button
              onClick={() => onBulkUpdate(-5)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              -5%
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Groups */}
      {Object.entries(processedData).map(([groupKey, group]) => {
        const isExpanded = expandedGroups.has(groupKey);
        const hasPendingUpdates = group.items.some(item => 
          reconciliationData[`${item.itemType}_${item.id}`]
        );

        return (
          <div key={groupKey} className="bg-white rounded-lg border shadow-sm">
            {/* Group header */}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => toggleGroup(groupKey)}
            >
              <div className="flex items-center space-x-3">
                {isExpanded ? 
                  <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                }
                <h4 className="font-semibold text-gray-900">{groupKey}</h4>
                <span className="text-sm text-gray-500">
                  ({group.items.length} items)
                </span>
                {hasPendingUpdates && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Has updates
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Total: {showValues ? formatCurrency(group.totalValue) : '•••••'}
                </span>
                {group.totalPending !== 0 && (
                  <span className={`text-sm font-medium ${
                    group.totalPending > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {group.totalPending > 0 ? '+' : ''}{formatCurrency(group.totalPending)}
                  </span>
                )}
              </div>
            </div>

            {/* Group items */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t"
                >
                  {group.items.map(item => {
                    const key = `${item.itemType}_${item.id}`;
                    const pendingData = reconciliationData[key];
                    const isSelected = selectedItems.has(item.id);
                    const isEditing = editingItem?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`px-4 py-3 border-b last:border-b-0 ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        } ${pendingData ? 'bg-yellow-50' : ''}`}
                      >
                        {isEditing ? (
                          // Edit mode
                          <div className="flex items-center space-x-3">
                            <input
                              type="number"
                              value={editValues.value}
                              onChange={(e) => setEditValues(prev => ({ ...prev, value: e.target.value }))}
                              className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              onClick={onSaveEdit}
                              className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={onCancelEdit}
                              className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(item.id)}
                                className="rounded border-gray-300"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-500">
                                  {item.identifier} • {ASSET_TYPE_CONFIG[item.asset_type]?.label}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <p className="font-medium text-gray-900">
                                  {showValues ? formatCurrency(pendingData?.value || item.value) : '•••••'}
                                </p>
                                {pendingData && (
                                  <p className={`text-sm ${
                                    pendingData.value > item.value ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {pendingData.value > item.value ? '+' : ''}
                                    {formatCurrency(pendingData.value - item.value)}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => onUpdateValue(item, item.value * 0.95)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onEdit(item)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onUpdateValue(item, item.value * 1.05)}
                                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDelete(item)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

const BulkUpdateStage = ({ processedData, reconciliationData, onBulkUpdate, onBack }) => {
  const [updatePercentage, setUpdatePercentage] = useState(0);
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  const affectedItems = useMemo(() => {
    if (selectedGroups.size === 0) {
      return Object.values(processedData).flatMap(group => group.items);
    }
    return Array.from(selectedGroups).flatMap(groupKey => 
      processedData[groupKey]?.items || []
    );
  }, [selectedGroups, processedData]);

  const previewValue = useMemo(() => {
    const currentTotal = affectedItems.reduce((sum, item) => sum + (item.value || 0), 0);
    const newTotal = currentTotal * (1 + updatePercentage / 100);
    return { currentTotal, newTotal, difference: newTotal - currentTotal };
  }, [affectedItems, updatePercentage]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Bulk Update</h3>
        <p className="text-gray-600">Apply a percentage change to multiple items at once</p>
      </div>

      {/* Percentage slider */}
      <div className="bg-gray-50 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Update Percentage: {updatePercentage > 0 ? '+' : ''}{updatePercentage}%
        </label>
        <input
          type="range"
          min="-50"
          max="50"
          value={updatePercentage}
          onChange={(e) => setUpdatePercentage(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>-50%</span>
          <span>0%</span>
          <span>+50%</span>
        </div>
      </div>

      {/* Group selection */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Select Groups to Update</h4>
        <div className="space-y-2">
          {Object.entries(processedData).map(([groupKey, group]) => (
            <label
              key={groupKey}
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedGroups.has(groupKey)}
                onChange={(e) => {
                  const newSelected = new Set(selectedGroups);
                  if (e.target.checked) {
                    newSelected.add(groupKey);
                  } else {
                    newSelected.delete(groupKey);
                  }
                  setSelectedGroups(newSelected);
                }}
                className="mr-3"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{groupKey}</p>
                <p className="text-sm text-gray-500">{group.items.length} items</p>
              </div>
              <span className="text-sm text-gray-600">
                {formatCurrency(group.totalValue)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Affected Items:</span>
            <span className="font-medium">{affectedItems.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Total:</span>
            <span className="font-medium">{formatCurrency(previewValue.currentTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">New Total:</span>
            <span className="font-medium">{formatCurrency(previewValue.newTotal)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600">Change:</span>
            <span className={`font-medium ${
              previewValue.difference > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {previewValue.difference > 0 ? '+' : ''}{formatCurrency(previewValue.difference)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onBulkUpdate(updatePercentage);
            onBack();
          }}
          disabled={updatePercentage === 0 || affectedItems.length === 0}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply Update to {affectedItems.length} Items
        </button>
      </div>
    </div>
  );
};

const ReviewStage = ({ reconciliationData, processedData, onSubmit, onBack, isSubmitting }) => {
  const groupedChanges = useMemo(() => {
    const changes = {};
    
    Object.entries(reconciliationData).forEach(([key, data]) => {
      const accountId = data.accountId || 'Unassigned';
      if (!changes[accountId]) {
        changes[accountId] = [];
      }
      changes[accountId].push({
        key,
        ...data
      });
    });
    
    return changes;
  }, [reconciliationData]);

  const totals = useMemo(() => {
    let originalTotal = 0;
    let newTotal = 0;
    let itemCount = 0;
    
    Object.values(reconciliationData).forEach(data => {
      originalTotal += data.originalValue || 0;
      newTotal += data.value || 0;
      itemCount++;
    });
    
    return {
      originalTotal,
      newTotal,
      difference: newTotal - originalTotal,
      percentChange: originalTotal !== 0 ? ((newTotal - originalTotal) / originalTotal) * 100 : 0,
      itemCount
    };
  }, [reconciliationData]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Changes</h3>
        <p className="text-gray-600">Confirm your updates before submitting</p>
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Items Updated</p>
            <p className="text-2xl font-bold text-gray-900">{totals.itemCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Original Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.originalTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">New Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.newTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Change</p>
            <p className={`text-2xl font-bold ${
              totals.difference > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {totals.difference > 0 ? '+' : ''}{formatCurrency(totals.difference)}
              <span className="text-sm ml-1">({formatPercent(totals.percentChange)})</span>
            </p>
          </div>
        </div>
      </div>

      {/* Changes list */}
      <div className="space-y-4">
        {Object.entries(groupedChanges).map(([accountId, changes]) => (
          <div key={accountId} className="bg-white rounded-lg border">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h4 className="font-medium text-gray-900">{accountId}</h4>
              <p className="text-sm text-gray-500">{changes.length} changes</p>
            </div>
            <div className="divide-y">
              {changes.map(change => (
                <div key={change.key} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{change.name}</p>
                      <p className="text-sm text-gray-500">
                        Updated {new Date(change.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 line-through">
                        {formatCurrency(change.originalValue)}
                      </p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(change.value)}
                      </p>
                      <p className={`text-sm ${
                        change.value > change.originalValue ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {change.value > change.originalValue ? '+' : ''}
                        {formatCurrency(change.value - change.originalValue)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
        >
          Back to Edit
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Submit {totals.itemCount} Updates</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const CompleteStage = ({ history, onClose, onNewReconciliation }) => (
  <div className="text-center space-y-6 py-8">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
      <CheckCircle2 className="w-10 h-10 text-green-600" />
    </div>
    
    <div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Reconciliation Complete!</h3>
      <p className="text-gray-600">Your portfolio has been successfully updated</p>
    </div>

    <div className="flex justify-center space-x-4">
      <button
        onClick={onNewReconciliation}
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
      >
        Start New Reconciliation
      </button>
      <button
        onClick={onClose}
        className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
      >
        Close
      </button>
    </div>

    {history.length > 0 && (
      <div className="pt-6 border-t">
        <h4 className="font-medium text-gray-900 mb-3">Recent History</h4>
        <div className="space-y-2 max-w-md mx-auto">
          {history.slice(0, 3).map((entry, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {new Date(entry.date).toLocaleDateString()}
              </span>
              <span className="font-medium text-gray-900">
                {entry.updates} updates
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Export button component for navbar
export const QuickReconciliationButton = ({ className = '', mobileView = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (mobileView) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={className}
        >
          <Target className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
          <span className="text-xs text-gray-200 group-hover:text-white">Reconcile</span>
        </button>
        
        <QuickReconciliationModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-400 group-hover:text-white transition-colors" />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">Quick Reconciliation</span>
        </div>
      </button>
      
      <QuickReconciliationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default QuickReconciliationModal;