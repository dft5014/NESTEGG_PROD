import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, AlertCircle, CheckCircle2, TrendingUp, 
  DollarSign, Eye, EyeOff, RefreshCw, Calendar, Clock,
  Home, CreditCard, PiggyBank, Wallet, TrendingDown, Award,
  ChevronLeft, AlertTriangle, XCircle, CheckCheck, Building2,
  Loader2, Info, ArrowUpRight, ArrowDownRight, Check
} from 'lucide-react';
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/formatters';
import FixedModal from './FixedModal';
import debounce from 'lodash.debounce';

// Constants
const ACCOUNT_ICONS = {
  checking: Wallet,
  savings: PiggyBank,
  credit_card: CreditCard,
  mortgage: Home,
  brokerage: TrendingUp,
  retirement: Award,
  loan: DollarSign,
  investment: TrendingUp,
  default: Wallet
};

const STATUS_COLORS = {
  reconciled: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
  pending: 'text-gray-600 bg-gray-50'
};

// Helper Components
const SuccessScreen = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
      </motion.div>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">🎉 Success! 🎉</h3>
      <p className="text-lg text-gray-600">{message}</p>
      <div className="mt-6 flex justify-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
      </div>
    </div>
  );
};

// Main Component
const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // DataStore Integration
  const { 
    accounts = [], 
    loading: accountsLoading,
    refresh: refreshAccounts 
  } = useAccounts();
  
  const { 
    positions: allPositions = [], 
    loading: positionsLoading,
    refresh: refreshPositions 
  } = useDetailedPositions();
  
  const { actions } = useDataStore();
  
  // Combined loading state
  const loading = accountsLoading || positionsLoading;
  
  // State management
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [positions, setPositions] = useState([]);
  const [liquidPositions, setLiquidPositions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [reconciliationData, setReconciliationData] = useState({});
  const [streak, setStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [showValues, setShowValues] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [reconciliationResults, setReconciliationResults] = useState([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
  
  // Refs
  const messageTimeoutRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const inputRefs = useRef({});
  
  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadData();
      loadReconciliationData();
      calculateStreak();
      loadSavedProgress();
    }
    
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Auto-save functionality
  useEffect(() => {
    if (unsavedChanges && Object.keys(pendingUpdates).length > 0) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('nestegg_reconciliation_progress', JSON.stringify({
          pendingUpdates,
          timestamp: new Date().toISOString(),
          selectedAccountId: selectedAccount?.id,
          selectedInstitution
        }));
        setUnsavedChanges(false);
        showMessage('info', 'Progress saved', 2000);
      }, 2000);
    }
  }, [pendingUpdates, unsavedChanges, selectedAccount, selectedInstitution]);

  // Load saved progress
  const loadSavedProgress = () => {
    const saved = localStorage.getItem('nestegg_reconciliation_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hoursSince = (Date.now() - new Date(parsed.timestamp)) / (1000 * 60 * 60);
        
        if (hoursSince < 24) {
          setPendingUpdates(parsed.pendingUpdates);
          if (parsed.selectedInstitution) {
            setSelectedInstitution(parsed.selectedInstitution);
          }
          showMessage('info', 'Loaded saved progress', 3000);
        } else {
          localStorage.removeItem('nestegg_reconciliation_progress');
        }
      } catch (e) {
        console.error('Failed to load saved progress:', e);
      }
    }
  };

  // Load all data
  const loadData = async () => {
    setLocalLoading(true);
    try {
      await Promise.all([
        refreshAccounts(),
        refreshPositions()
      ]);
      
      // Enrich accounts with reconciliation status
      const enrichedAccounts = accounts.map(account => {
        const lastRec = reconciliationData[account.id]?.lastReconciled;
        const daysSince = lastRec ? 
          Math.floor((Date.now() - new Date(lastRec).getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        let status = 'pending';
        if (daysSince === null) status = 'pending';
        else if (daysSince === 0) status = 'reconciled';
        else if (daysSince <= 7) status = 'warning';
        else status = 'error';
        
        return {
          ...account,
          reconciliationStatus: status,
          daysSinceReconciliation: daysSince,
          lastReconciled: lastRec
        };
      });
      
      setPositions(enrichedAccounts);
      
      // Filter liquid positions
      const liquid = allPositions.filter(p => 
        ['security', 'crypto', 'metal'].includes(p.asset_type)
      );
      setLiquidPositions(liquid);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLocalLoading(false);
    }
  };

  // Load reconciliation data from localStorage
  const loadReconciliationData = () => {
    const data = JSON.parse(localStorage.getItem('nestegg_reconciliation_data') || '{}');
    setReconciliationData(data);
  };

  // Calculate streak
  const calculateStreak = () => {
    const history = JSON.parse(localStorage.getItem('nestegg_reconciliation_history') || '[]');
    const today = new Date().toDateString();
    let currentStreak = 0;
    
    if (history.length > 0 && new Date(history[0]).toDateString() === today) {
      currentStreak = 1;
      
      for (let i = 1; i < history.length; i++) {
        const prevDate = new Date(history[i - 1]);
        const currDate = new Date(history[i]);
        const dayDiff = (prevDate - currDate) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    setStreak(currentStreak);
  };

  // Save to history
  const saveToHistory = () => {
    const history = JSON.parse(localStorage.getItem('nestegg_reconciliation_history') || '[]');
    const today = new Date().toISOString();
    
    if (!history.some(date => new Date(date).toDateString() === new Date(today).toDateString())) {
      history.unshift(today);
      history.splice(30);
      localStorage.setItem('nestegg_reconciliation_history', JSON.stringify(history));
    }
  };

  // Show message
  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    
    if (duration > 0) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, duration);
    }
  };

  // Group accounts by institution
  const accountsByInstitution = useMemo(() => {
    const grouped = {};
    positions.forEach(account => {
      const institution = account.institution || 'Other';
      if (!grouped[institution]) {
        grouped[institution] = {
          name: institution,
          accounts: [],
          totalValue: 0,
          needsReconciliation: false
        };
      }
      grouped[institution].accounts.push(account);
      grouped[institution].totalValue += account.totalValue || 0;
      
      if (account.reconciliationStatus === 'warning' || account.reconciliationStatus === 'error') {
        grouped[institution].needsReconciliation = true;
      }
    });
    
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b.totalValue - a.totalValue)
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
  }, [positions]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = accounts.length;
    const enrichedAccounts = positions.length > 0 ? positions : accounts;
    const needsReconciliation = enrichedAccounts.filter(a => 
      a.reconciliationStatus === 'warning' || 
      a.reconciliationStatus === 'error' || 
      a.reconciliationStatus === 'pending'
    ).length;
    const reconciled = enrichedAccounts.filter(a => a.reconciliationStatus === 'reconciled').length;
    const totalValue = accounts.reduce((sum, a) => sum + (parseFloat(a.totalValue) || 0), 0);
    const reconciledValue = enrichedAccounts
      .filter(a => a.reconciliationStatus === 'reconciled')
      .reduce((sum, a) => sum + (parseFloat(a.totalValue || a.total_value) || 0), 0);
    
    const liquidNeedingUpdate = liquidPositions.filter(p => {
      const lastUpdate = reconciliationData[`pos_${p.id}`]?.lastUpdated;
      const daysSince = lastUpdate ? 
        Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)) : 
        999;
      return daysSince > 1;
    }).length;
    
    return {
      total,
      needsReconciliation,
      reconciled,
      liquidPositions: liquidNeedingUpdate,
      percentage: total > 0 ? (reconciled / total) * 100 : 0,
      totalValue,
      reconciledValue,
      valuePercentage: totalValue > 0 ? (reconciledValue / totalValue) * 100 : 0
    };
  }, [accounts, positions, liquidPositions, reconciliationData]);

  // Helper functions
  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.pending;
  
  const getAccountIcon = (type) => ACCOUNT_ICONS[type] || ACCOUNT_ICONS.default;

  // Handle balance update with debouncing
  const handleBalanceUpdate = useCallback((type, id, value) => {
    setPendingUpdates(prev => ({
      ...prev,
      [`${type}_${id}`]: {
        ...prev[`${type}_${id}`],
        actualBalance: parseFloat(value) || 0,
        timestamp: new Date().toISOString()
      }
    }));
    setUnsavedChanges(true);
  }, []);

  // Handle account update
  const handleUpdateAccount = async () => {
    if (!selectedAccount) return;
    
    setLocalLoading(true);
    try {
      const accountUpdate = pendingUpdates[`account_${selectedAccount.id}`];
      const cashPositions = allPositions.filter(p => 
        p.account_id === selectedAccount.id && p.asset_type === 'cash'
      );
      
      const updates = [];
      
      // Update account balance
      if (accountUpdate?.actualBalance !== undefined) {
        if (accountUpdate.updateType === 'update_from_app') {
          const actualBalance = accountUpdate.actualBalance;
          const appBalance = selectedAccount.totalValue || selectedAccount.total_value || 0;
          const variance = actualBalance - appBalance;
          
          updates.push(
            fetchWithAuth('/reconciliation/account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                account_id: selectedAccount.id,
                app_balance: appBalance,
                actual_balance: actualBalance,
                reconcile_balance: false
              })
            })
          );
        } else if (accountUpdate.updateType === 'update_from_statement') {
          for (const position of cashPositions) {
            const proportion = cashPositions.length > 0 ? 1 / cashPositions.length : 1;
            const newBalance = accountUpdate.actualBalance * proportion;
            
            updates.push(
              fetchWithAuth(`/cash/${position.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...position,
                  amount: newBalance,
                  current_balance: newBalance
                })
              })
            );
          }
        }
      }
      
      // Update positions
      cashPositions.forEach(position => {
        const posUpdate = pendingUpdates[`pos_${position.id}`];
        if (posUpdate?.actualValue !== undefined) {
          if (posUpdate.updateType === 'update_from_app') {
            updates.push(
              fetchWithAuth('/reconciliation/position', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  account_id: selectedAccount.id,
                  position_id: position.id,
                  asset_type: position.asset_type,
                  app_value: position.current_value || position.amount || 0,
                  actual_value: posUpdate.actualValue,
                  reconcile_value: false
                })
              })
            );
          } else if (posUpdate.updateType === 'update_from_statement') {
            updates.push(
              fetchWithAuth(`/cash/${position.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...position,
                  amount: posUpdate.actualValue,
                  current_balance: posUpdate.actualValue
                })
              })
            );
          }
        }
      });
      
      // Execute all updates
      const results = await Promise.all(updates);
      
      // Update reconciliation data
      const newRecData = {
        ...reconciliationData,
        [selectedAccount.id]: {
          lastReconciled: new Date().toISOString(),
          actualBalance: accountUpdate?.actualBalance
        }
      };
      
      cashPositions.forEach(position => {
        const posUpdate = pendingUpdates[`pos_${position.id}`];
        if (posUpdate?.actualValue !== undefined) {
          newRecData[`pos_${position.id}`] = {
            lastUpdated: new Date().toISOString(),
            actualValue: posUpdate.actualValue
          };
        }
      });
      
      setReconciliationData(newRecData);
      localStorage.setItem('nestegg_reconciliation_data', JSON.stringify(newRecData));
      
      // Clear pending updates for this account
      const newPendingUpdates = { ...pendingUpdates };
      delete newPendingUpdates[`account_${selectedAccount.id}`];
      cashPositions.forEach(p => {
        delete newPendingUpdates[`pos_${p.id}`];
      });
      setPendingUpdates(newPendingUpdates);
      
      // Update reconciliation results
      setReconciliationResults(prev => [...prev, {
        accountId: selectedAccount.id,
        accountName: selectedAccount.account_name || selectedAccount.name,
        timestamp: new Date().toISOString(),
        status: 'success'
      }]);
      
      // Save to history
      saveToHistory();
      
      // Refresh data
      await Promise.all([refreshAccounts(), refreshPositions()]);
      await loadData();
      
      showMessage('success', `${selectedAccount.account_name || selectedAccount.name} updated successfully!`);
      
      // Go back to account selection
      setTimeout(() => {
        setSelectedAccount(null);
        setCurrentScreen('accounts');
      }, 1500);
      
    } catch (error) {
      console.error('Error updating account:', error);
      showMessage('error', 'Failed to update account. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  // Handle bulk update for institution
  const handleBulkUpdate = async () => {
    if (!selectedInstitution) return;
    
    const institutionAccounts = accountsByInstitution[selectedInstitution].accounts.filter(a => 
      pendingUpdates[`account_${a.id}`]?.actualBalance !== undefined
    );
    
    if (institutionAccounts.length === 0) {
      showMessage('warning', 'No accounts have updated balances');
      return;
    }
    
    setLocalLoading(true);
    let successCount = 0;
    
    try {
      for (const account of institutionAccounts) {
        setSelectedAccount(account);
        await handleUpdateAccount();
        successCount++;
      }
      
      showMessage('success', `Updated ${successCount} accounts from ${selectedInstitution}`);
      setBulkUpdateMode(false);
      
      // Clear saved progress
      localStorage.removeItem('nestegg_reconciliation_progress');
      
    } catch (error) {
      console.error('Bulk update error:', error);
      showMessage('error', `Updated ${successCount} accounts, some failed`);
    } finally {
      setLocalLoading(false);
      setSelectedAccount(null);
    }
  };

  // Calculate variance
  const calculateVariance = (account) => {
    const actualBalance = pendingUpdates[`account_${account.id}`]?.actualBalance;
    if (actualBalance === undefined) return { variance: 0, variancePercent: 0 };
    
    const appBalance = account.totalValue || account.total_value || 0;
    const variance = actualBalance - appBalance;
    const variancePercent = appBalance !== 0 ? (variance / Math.abs(appBalance)) * 100 : 0;
    
    return { variance, variancePercent };
  };

  // Keyboard navigation
  const handleKeyDown = (e, index, type) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const cashPositions = allPositions.filter(p => 
        p.account_id === selectedAccount.id && p.asset_type === 'cash'
      );
      
      const totalInputs = 1 + cashPositions.length; // Account + positions
      const nextIndex = e.shiftKey ? index - 1 : index + 1;
      
      if (nextIndex >= 0 && nextIndex < totalInputs) {
        setCurrentFocusIndex(nextIndex);
        if (nextIndex === 0) {
          inputRefs.current[`account_${selectedAccount.id}`]?.focus();
        } else {
          inputRefs.current[`pos_${cashPositions[nextIndex - 1].id}`]?.focus();
        }
      } else if (nextIndex === totalInputs) {
        document.getElementById('update-button')?.focus();
      }
    } else if (e.key === 'Escape') {
      e.target.blur();
    }
  };

  // Render Welcome Screen
  const WelcomeScreen = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Quick Reconciliation</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Keep your NestEgg accurate by reconciling your accounts with their actual balances.
        </p>
        
        {streak > 0 && (
          <div className="mb-6 inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-full">
            <Award className="w-5 h-5 mr-2" />
            <span className="font-medium">{streak} day streak! 🔥</span>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-800">{stats.reconciled}</div>
            <div className="text-sm text-gray-600">Reconciled</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.needsReconciliation}</div>
            <div className="text-sm text-gray-600">Need Update</div>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentScreen('accounts')}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
        >
          Start Reconciliation
        </motion.button>
      </motion.div>
    </div>
  );

  // Render Account Selection Screen
  const AccountSelectionScreen = () => {
    if (selectedInstitution) {
      return (
        <div className="min-h-[400px]">
          <div className="flex items-center mb-6">
            <button
              onClick={() => setSelectedInstitution(null)}
              className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center flex-1">
              <Building2 className="w-6 h-6 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">{selectedInstitution}</h3>
              <span className="ml-2 text-sm text-gray-500">
                ({accountsByInstitution[selectedInstitution].accounts.length} accounts)
              </span>
            </div>
            {bulkUpdateMode && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBulkUpdate}
                disabled={localLoading}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium"
              >
                <CheckCheck className="w-4 h-4 inline mr-2" />
                Update All
              </motion.button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsByInstitution[selectedInstitution].accounts.map((account) => {
              const statusColor = getStatusColor(account.reconciliationStatus);
              const Icon = getAccountIcon(account.account_type);
              const needsReconciliation = account.reconciliationStatus === 'warning' || 
                                         account.reconciliationStatus === 'error';
              
              return (
                <motion.div
                  key={account.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedAccount(account);
                    setCurrentScreen('reconcile');
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    needsReconciliation 
                      ? 'border-orange-300 bg-orange-50 hover:bg-orange-100' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    {needsReconciliation && (
                      <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                        Update needed
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-gray-800 mb-1">
                    {account.account_name || account.name}
                  </h4>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {account.account_type?.replace(/_/g, ' ')}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-800">
                      {showValues ? formatCurrency(account.totalValue || account.total_value || 0) : '••••••'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  {account.daysSinceReconciliation !== null && (
                    <div className="mt-2 text-xs text-gray-500">
                      Last updated: {account.daysSinceReconciliation} days ago
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-[400px]">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Institution</h3>
          <p className="text-sm text-gray-600">Choose a bank or institution to reconcile accounts</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(accountsByInstitution).map(([institution, data]) => (
            <motion.div
              key={institution}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedInstitution(institution);
                setBulkUpdateMode(true);
              }}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                data.needsReconciliation
                  ? 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Building2 className="w-6 h-6 text-gray-600" />
                {data.needsReconciliation && (
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                    Needs update
                  </span>
                )}
              </div>
              
              <h4 className="font-medium text-gray-800 mb-1">{institution}</h4>
              <p className="text-sm text-gray-600 mb-3">
                {data.accounts.length} account{data.accounts.length !== 1 ? 's' : ''}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-800">
                  {showValues ? formatCurrency(data.totalValue) : '••••••'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // Render Reconciliation Screen
  const ReconciliationScreen = () => {
    if (!selectedAccount) return null;
    
    const Icon = getAccountIcon(selectedAccount.account_type);
    const cashPositions = allPositions.filter(p => 
      p.account_id === selectedAccount.id && p.asset_type === 'cash'
    );
    
    const { variance, variancePercent } = calculateVariance(selectedAccount);
    const hasChanges = pendingUpdates[`account_${selectedAccount.id}`]?.actualBalance !== undefined ||
                      cashPositions.some(p => pendingUpdates[`pos_${p.id}`]?.actualValue !== undefined);
    
    return (
      <div className="min-h-[400px]">
        <div className="flex items-center mb-6">
          <button
            onClick={() => {
              setSelectedAccount(null);
              setCurrentScreen('accounts');
              setCurrentFocusIndex(0);
            }}
            className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="p-2 bg-gray-100 rounded-lg mr-3">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedAccount.account_name || selectedAccount.name}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedAccount.institution || 'No institution'} • {selectedAccount.account_type?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        
        {/* Keyboard navigation hint */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-sm text-blue-800">
            <Info className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Use Tab to navigate • Enter to move forward • Esc to exit field</span>
          </div>
        </div>
        
        {/* Account Balance Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800">Account Total</h4>
            <div className="flex items-center space-x-2">
              <select
                value={pendingUpdates[`account_${selectedAccount.id}`]?.updateType || 'update_from_statement'}
                onChange={(e) => setPendingUpdates(prev => ({
                  ...prev,
                  [`account_${selectedAccount.id}`]: {
                    ...prev[`account_${selectedAccount.id}`],
                    updateType: e.target.value
                  }
                }))}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="update_from_statement">Update NestEgg</option>
                <option value="update_from_app">Track Variance</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">NestEgg Balance</label>
              <div className="text-lg font-semibold text-gray-800">
                {formatCurrency(selectedAccount.totalValue || selectedAccount.total_value || 0)}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Statement Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  ref={el => inputRefs.current[`account_${selectedAccount.id}`] = el}
                  type="number"
                  step="0.01"
                  value={pendingUpdates[`account_${selectedAccount.id}`]?.actualBalance || ''}
                  onChange={(e) => handleBalanceUpdate('account', selectedAccount.id, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 0, 'account')}
                  onFocus={(e) => {
                    setCurrentFocusIndex(0);
                    e.target.select();
                  }}
                  placeholder={formatCurrency(selectedAccount.totalValue || selectedAccount.total_value || 0).replace('$', '').replace(/,/g, '')}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          {/* Variance Display */}
          {variance !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 p-3 rounded-lg border ${
                Math.abs(variancePercent) < 1 ? 'bg-yellow-50 border-yellow-200' :
                Math.abs(variancePercent) < 5 ? 'bg-orange-50 border-orange-200' :
                'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {Math.abs(variancePercent) < 1 ? (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  ) : Math.abs(variancePercent) < 5 ? (
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    Math.abs(variancePercent) < 1 ? 'text-yellow-800' :
                    Math.abs(variancePercent) < 5 ? 'text-orange-800' :
                    'text-red-800'
                  }`}>
                    Variance: {variancePercent.toFixed(2)}%
                  </span>
                </div>
                <span className={`text-sm font-bold ${
                  variance > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {variance > 0 ? '+' : ''}{formatCurrency(Math.abs(variance))}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(variancePercent), 100)}%` }}
                  className={`h-2 rounded-full ${
                    Math.abs(variancePercent) < 1 ? 'bg-yellow-500' :
                    Math.abs(variancePercent) < 5 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                />
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Cash Positions Section */}
        {cashPositions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h4 className="font-medium text-gray-800 mb-3">Cash Positions</h4>
            <div className="space-y-3">
              {cashPositions.map((position, index) => (
                <div key={position.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{position.name}</span>
                    <select
                      value={pendingUpdates[`pos_${position.id}`]?.updateType || 'update_from_statement'}
                      onChange={(e) => setPendingUpdates(prev => ({
                        ...prev,
                        [`pos_${position.id}`]: {
                          ...prev[`pos_${position.id}`],
                          updateType: e.target.value
                        }
                      }))}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="update_from_statement">Update NestEgg</option>
                      <option value="update_from_app">Track Variance</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">Current</label>
                      <div className="text-sm font-medium text-gray-800">
                        {formatCurrency(position.current_value || position.amount || 0)}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-600">Actual</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">$</span>
                        <input
                          ref={el => inputRefs.current[`pos_${position.id}`] = el}
                          type="number"
                          step="0.01"
                          value={pendingUpdates[`pos_${position.id}`]?.actualValue || ''}
                          onChange={(e) => setPendingUpdates(prev => ({
                            ...prev,
                            [`pos_${position.id}`]: {
                              ...prev[`pos_${position.id}`],
                              actualValue: parseFloat(e.target.value) || 0,
                              timestamp: new Date().toISOString()
                            }
                          }))}
                          onKeyDown={(e) => handleKeyDown(e, index + 1, 'position')}
                          onFocus={(e) => {
                            setCurrentFocusIndex(index + 1);
                            e.target.select();
                          }}
                          placeholder={formatCurrency(position.current_value || position.amount || 0).replace('$', '').replace(/,/g, '')}
                          className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Liquid Positions Summary */}
        {liquidPositions.filter(p => p.account_id === selectedAccount.id).length > 0 && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Investment Positions</span>
              </div>
              <span className="text-sm text-blue-600">
                {liquidPositions.filter(p => p.account_id === selectedAccount.id).length} positions
              </span>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Update securities, crypto, and metals separately through position management.
            </p>
          </div>
        )}
        
        {/* Update Button */}
        <motion.button
          id="update-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUpdateAccount}
          disabled={localLoading || !hasChanges}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
            hasChanges
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {localLoading ? (
            <span className="flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </span>
          ) : (
            'Update Account'
          )}
        </motion.button>
        
        {/* Unsaved indicator */}
        {unsavedChanges && (
          <div className="mt-2 text-center text-sm text-gray-500">
            Progress auto-saved
          </div>
        )}
      </div>
    );
  };

  // Main render
  return (
    <FixedModal isOpen={isOpen} onClose={onClose} width="max-w-4xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Quick Reconciliation</h2>
            <p className="text-sm text-gray-600">Keep your accounts accurate and up-to-date</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowValues(!showValues)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {showValues ? <Eye className="w-5 h-5 text-gray-500" /> : <EyeOff className="w-5 h-5 text-gray-500" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
      
      {/* Message Banner */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mx-6 mt-4 p-3 rounded-lg flex items-center ${
              message.type === 'success' ? 'bg-green-100 text-green-800' :
              message.type === 'error' ? 'bg-red-100 text-red-800' :
              message.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2" /> :
             message.type === 'error' ? <XCircle className="w-4 h-4 mr-2" /> :
             message.type === 'warning' ? <AlertTriangle className="w-4 h-4 mr-2" /> :
             <Info className="w-4 h-4 mr-2" />}
            <span className="text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : currentScreen === 'welcome' ? (
          <WelcomeScreen />
        ) : currentScreen === 'accounts' ? (
          <AccountSelectionScreen />
        ) : currentScreen === 'reconcile' ? (
          <ReconciliationScreen />
        ) : currentScreen === 'success' ? (
          <SuccessScreen 
            message={`Successfully updated ${reconciliationResults.length} accounts!`}
            onClose={() => {
              setCurrentScreen('welcome');
              setReconciliationResults([]);
            }}
          />
        ) : null}
      </div>
      
      {/* Footer with stats */}
      {currentScreen !== 'welcome' && currentScreen !== 'success' && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="text-gray-500">Progress:</span>
                <span className="ml-2 font-medium text-gray-800">
                  {stats.reconciled}/{stats.total} accounts
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Value:</span>
                <span className="ml-2 font-medium text-gray-800">
                  {formatCurrency(stats.reconciledValue)} / {formatCurrency(stats.totalValue)}
                </span>
              </div>
            </div>
            
            {reconciliationResults.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentScreen('success')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium"
              >
                Complete Reconciliation
              </motion.button>
            )}
          </div>
        </div>
      )}
    </FixedModal>
  );
};

export default QuickReconciliationModal;