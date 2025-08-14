import React, { useState, useEffect, useMemo } from 'react';
import { X, Building2, ArrowLeft, Save, Loader2, RefreshCw, AlertCircle, Check, DollarSign, CreditCard, ChevronRight, Home, Package, TrendingUp, Shield } from 'lucide-react';
import { useDataStore } from '@/store/DataStore';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useAccounts } from '@/store/hooks/useAccounts';
import { updatePosition, updateOtherAsset, updateCashPosition, updateLiability } from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';

const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // Use the EXACT same hooks as QuickEditDelete
  const { positions: detailedPositions } = useDetailedPositions();
  const { liabilities: groupedLiabilities } = useGroupedLiabilities();
  const { accounts } = useAccounts();
  
  // Core state management
  const [currentView, setCurrentView] = useState('home'); // home, institutions, reconcile, account-reconciliation
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statementValues, setStatementValues] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Get DataStore for refresh
  const { state, actions } = useDataStore();
  const isLoading = !detailedPositions || detailedPositions.length === 0;
  
  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView('home');
      setSelectedInstitution(null);
      setStatementValues({});
      setHasChanges(false);
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  // Group positions by institution - INCLUDING Cash, Liabilities, and Other Assets
  const institutionGroups = useMemo(() => {
    const groups = {};
    
    // Process cash positions
    const cashPositions = detailedPositions.filter(pos => 
      pos.assetType === 'cash' || pos.asset_type === 'cash'
    );
    
    // Process other assets as their own group
    const otherAssetPositions = detailedPositions.filter(pos => {
      const type = pos.assetType || pos.asset_type;
      return type === 'other_asset' || type === 'other_assets' || 
             type === 'real_estate' || type === 'vehicle' || 
             type === 'collectible' || type === 'jewelry' || 
             type === 'art' || type === 'equipment' || type === 'other';
    });
    
    // Group cash by institution
    cashPositions.forEach(position => {
      let institution = position.institution;
      
      if (!institution && position.accountId) {
        const account = accounts.find(acc => acc.id === position.accountId);
        institution = account?.institution;
      }
      
      institution = institution || 'Unknown Institution';
      
      if (!groups[institution]) {
        groups[institution] = {
          name: institution,
          cash: [],
          liabilities: [],
          otherAssets: [],
          totalCash: 0,
          totalLiabilities: 0,
          totalOtherAssets: 0
        };
      }
      
      const positionData = {
        id: position.itemId || position.id,
        name: position.name || position.identifier,
        accountName: position.accountName || 'Unknown Account',
        currentValue: parseFloat(position.currentValue || 0),
        assetType: position.assetType || position.asset_type,
        accountId: position.accountId,
        institution: institution
      };
      
      groups[institution].cash.push(positionData);
      groups[institution].totalCash += positionData.currentValue;
    });
    
    // Process liabilities and group by institution
    if (groupedLiabilities && groupedLiabilities.length > 0) {
      groupedLiabilities.forEach(liability => {
        const institution = liability.institution_name || 'Unknown Institution';
        
        if (!groups[institution]) {
          groups[institution] = {
            name: institution,
            cash: [],
            liabilities: [],
            otherAssets: [],
            totalCash: 0,
            totalLiabilities: 0,
            totalOtherAssets: 0
          };
        }
        
        groups[institution].liabilities.push({
          id: liability.id,
          name: liability.name,
          currentBalance: parseFloat(liability.total_current_balance || liability.current_balance || 0),
          liabilityType: liability.liability_type
        });
        
        groups[institution].totalLiabilities += parseFloat(liability.total_current_balance || liability.current_balance || 0);
      });
    }
    
    // Add Other Assets as its own "institution"
    if (otherAssetPositions.length > 0) {
      groups['Other Assets'] = {
        name: 'Other Assets',
        cash: [],
        liabilities: [],
        otherAssets: otherAssetPositions.map(position => ({
          id: position.itemId || position.id,
          name: position.name || position.identifier,
          accountName: position.accountName || 'Other Assets',
          currentValue: parseFloat(position.currentValue || 0),
          assetType: position.assetType || position.asset_type,
          accountId: position.accountId
        })),
        totalCash: 0,
        totalLiabilities: 0,
        totalOtherAssets: otherAssetPositions.reduce((sum, pos) => 
          sum + parseFloat(pos.currentValue || 0), 0)
      };
    }
    
    return groups;
  }, [detailedPositions, groupedLiabilities, accounts]);

  // Calculate statistics for home view
  const stats = useMemo(() => {
    let totalCashPositions = 0;
    let totalLiabilities = 0;
    let totalOtherAssets = 0;
    let totalInstitutions = 0;
    
    Object.values(institutionGroups).forEach(group => {
      totalCashPositions += group.cash.length;
      totalLiabilities += group.liabilities.length;
      totalOtherAssets += group.otherAssets.length;
      if (group.cash.length > 0 || group.liabilities.length > 0 || group.otherAssets.length > 0) {
        totalInstitutions++;
      }
    });
    
    return {
      totalPositions: totalCashPositions + totalLiabilities + totalOtherAssets,
      totalCashPositions,
      totalLiabilities,
      totalOtherAssets,
      totalInstitutions
    };
  }, [institutionGroups]);

  // Show message
  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    if (duration > 0) {
      setTimeout(() => setMessage({ type: '', text: '' }), duration);
    }
  };

  // Handle statement value change
  const handleStatementValueChange = (itemId, value, type) => {
    setStatementValues(prev => ({
      ...prev,
      [`${type}_${itemId}`]: value
    }));
    setHasChanges(true);
  };

  // Calculate delta
  const calculateDelta = (currentValue, statementValue) => {
    const current = parseFloat(currentValue || 0);
    const statement = parseFloat(statementValue || 0);
    const delta = statement - current;
    const percentage = current !== 0 ? (delta / current) * 100 : 0;
    
    return {
      delta,
      percentage,
      hasValue: statementValue !== undefined && statementValue !== ''
    };
  };

  // Normalize asset type
  const normalizeAssetType = (assetType) => {
    if (assetType === 'other_asset' || 
        assetType === 'other_assets' || 
        assetType === 'real_estate' || 
        assetType === 'vehicle' || 
        assetType === 'collectible' || 
        assetType === 'jewelry' || 
        assetType === 'art' || 
        assetType === 'equipment' || 
        assetType === 'other') {
      return 'otherAssets';
    }
    return assetType;
  };

  // Update all positions
  const handleUpdateAllPositions = async () => {
    try {
      setIsSubmitting(true);
      const group = institutionGroups[selectedInstitution];
      if (!group) return;
      
      const updates = [];
      
      // Process cash positions
      for (const position of group.cash) {
        const statementValue = statementValues[`cash_${position.id}`];
        if (statementValue !== undefined && statementValue !== '') {
          const newValue = parseFloat(statementValue);
          updates.push(
            updateCashPosition(position.id, {
              amount: newValue,
              interest_rate: 0
            })
          );
        }
      }
      
      // Process liabilities
      for (const liability of group.liabilities) {
        const statementValue = statementValues[`liability_${liability.id}`];
        if (statementValue !== undefined && statementValue !== '') {
          const newValue = parseFloat(statementValue);
          updates.push(
            updateLiability(liability.id, {
              current_balance: newValue
            })
          );
        }
      }
      
      // Process other assets
      for (const asset of group.otherAssets) {
        const statementValue = statementValues[`other_${asset.id}`];
        if (statementValue !== undefined && statementValue !== '') {
          const newValue = parseFloat(statementValue);
          const assetType = normalizeAssetType(asset.assetType);
          
          if (assetType === 'otherAssets') {
            updates.push(
              updateOtherAsset(parseInt(asset.id), {
                current_value: newValue
              })
            );
          }
        }
      }
      
      if (updates.length === 0) {
        showMessage('warning', 'No changes to update');
        return;
      }
      
      await Promise.all(updates);
      
      showMessage('success', `Successfully updated ${updates.length} item${updates.length !== 1 ? 's' : ''}`);
      
      if (actions.refreshData) {
        actions.refreshData();
      }
      
      // Reset state
      setStatementValues({});
      setHasChanges(false);
      setSelectedInstitution(null);
      setCurrentView('institutions');
      
    } catch (error) {
      console.error('Error updating positions:', error);
      showMessage('error', `Failed to update: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render home view
  const renderHomeView = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Quick Reconciliation
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Keep your NestEgg data accurate with bank statements
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Positions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalPositions}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Institutions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalInstitutions}</p>
            </div>
            <Building2 className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Cash & Assets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalCashPositions + stats.totalOtherAssets}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Liabilities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalLiabilities}</p>
            </div>
            <CreditCard className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => setCurrentView('institutions')}
          className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-0.5 transition-all hover:shadow-lg"
        >
          <div className="relative flex items-center justify-between rounded-xl bg-gray-900 px-6 py-4 transition-all group-hover:bg-opacity-90">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4 text-left">
                <p className="font-semibold text-white">Quick Balance Update</p>
                <p className="text-sm text-gray-300">Update cash, liabilities, and other assets</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <button
          onClick={() => showMessage('info', 'Account reconciliation coming soon!')}
          className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 p-0.5 transition-all hover:shadow-lg opacity-75"
        >
          <div className="relative flex items-center justify-between rounded-xl bg-gray-900 px-6 py-4">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="ml-4 text-left">
                <p className="font-semibold text-white">Full Account Reconciliation</p>
                <p className="text-sm text-gray-300">Coming soon - Review all positions by account</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>
      </div>
    </div>
  );

  // Render institution selection
  const renderInstitutionsView = () => {
    const institutionList = Object.entries(institutionGroups).filter(([_, group]) => 
      group.cash.length > 0 || group.liabilities.length > 0 || group.otherAssets.length > 0
    );
    
    if (institutionList.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No positions found</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Overview
          </button>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Select Institution to Reconcile
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose the institution or asset group to update
          </p>
        </div>
        
        <div className="space-y-3">
          {institutionList.map(([institutionName, group]) => {
            const isOtherAssets = institutionName === 'Other Assets';
            const totalValue = group.totalCash + group.totalOtherAssets - group.totalLiabilities;
            
            return (
              <button
                key={institutionName}
                onClick={() => {
                  setSelectedInstitution(institutionName);
                  setCurrentView('reconcile');
                  // Pre-fill with current values
                  const initialValues = {};
                  group.cash.forEach(pos => {
                    initialValues[`cash_${pos.id}`] = pos.currentValue;
                  });
                  group.liabilities.forEach(liability => {
                    initialValues[`liability_${liability.id}`] = liability.currentBalance;
                  });
                  group.otherAssets.forEach(asset => {
                    initialValues[`other_${asset.id}`] = asset.currentValue;
                  });
                  setStatementValues(initialValues);
                }}
                className="w-full p-4 bg-gray-800/50 backdrop-blur border border-gray-700 rounded-xl hover:bg-gray-700/50 transition-all hover:shadow-lg hover:border-gray-600 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      isOtherAssets 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {isOtherAssets ? <Package className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {institutionName}
                      </p>
                      <p className="text-sm text-gray-400">
                        {group.cash.length > 0 && `${group.cash.length} cash`}
                        {group.liabilities.length > 0 && `${group.cash.length > 0 ? ', ' : ''}${group.liabilities.length} liabilities`}
                        {group.otherAssets.length > 0 && `${(group.cash.length > 0 || group.liabilities.length > 0) ? ', ' : ''}${group.otherAssets.length} assets`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      totalValue >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(Math.abs(totalValue))}
                    </p>
                    <ChevronRight className="w-5 h-5 text-gray-500 mt-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render reconciliation screen
  const renderReconcileView = () => {
    const group = institutionGroups[selectedInstitution];
    if (!group) return null;
    
    // Calculate totals
    const cashDelta = group.cash.reduce((sum, pos) => {
      const delta = calculateDelta(pos.currentValue, statementValues[`cash_${pos.id}`]);
      return sum + (delta.hasValue ? delta.delta : 0);
    }, 0);
    
    const liabilityDelta = group.liabilities.reduce((sum, liability) => {
      const delta = calculateDelta(liability.currentBalance, statementValues[`liability_${liability.id}`]);
      return sum + (delta.hasValue ? delta.delta : 0);
    }, 0);
    
    const otherDelta = group.otherAssets.reduce((sum, asset) => {
      const delta = calculateDelta(asset.currentValue, statementValues[`other_${asset.id}`]);
      return sum + (delta.hasValue ? delta.delta : 0);
    }, 0);
    
    const totalDelta = cashDelta - liabilityDelta + otherDelta;
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setCurrentView('institutions');
              setSelectedInstitution(null);
              setStatementValues({});
              setHasChanges(false);
            }}
            className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Institutions
          </button>
          
          {hasChanges && (
            <span className="text-sm text-yellow-400 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Unsaved changes
            </span>
          )}
        </div>
        
        {/* Institution info */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white flex items-center">
            {selectedInstitution === 'Other Assets' ? (
              <Package className="w-5 h-5 mr-2 text-purple-400" />
            ) : (
              <Building2 className="w-5 h-5 mr-2 text-blue-400" />
            )}
            {selectedInstitution}
          </h3>
          <p className="text-sm text-gray-300 mt-1">
            Enter your current balances below
          </p>
        </div>
        
        {/* Cash Positions */}
        {group.cash.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-green-400" />
                Cash Positions
              </h4>
            </div>
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Account</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">NestEgg</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Statement</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {group.cash.map(position => {
                  const delta = calculateDelta(position.currentValue, statementValues[`cash_${position.id}`]);
                  
                  return (
                    <tr key={position.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-200">{position.name}</p>
                          <p className="text-sm text-gray-500">{position.accountName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-300">{formatCurrency(position.currentValue)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={statementValues[`cash_${position.id}`] || ''}
                          onChange={(e) => handleStatementValueChange(position.id, e.target.value, 'cash')}
                          placeholder="Enter amount"
                          className="w-full px-3 py-1.5 text-sm text-right bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {delta.hasValue && (
                          <div>
                            <p className={`font-medium ${
                              delta.delta > 0 ? 'text-green-400' : 
                              delta.delta < 0 ? 'text-red-400' : 
                              'text-gray-400'
                            }`}>
                              {delta.delta > 0 && '+'}{formatCurrency(delta.delta)}
                            </p>
                            {delta.delta !== 0 && (
                              <p className="text-xs text-gray-500">
                                {delta.percentage > 0 && '+'}{delta.percentage.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Liabilities */}
        {group.liabilities.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 flex items-center">
                <CreditCard className="w-4 h-4 mr-2 text-red-400" />
                Liabilities
              </h4>
            </div>
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">NestEgg</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Statement</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {group.liabilities.map(liability => {
                  const delta = calculateDelta(liability.currentBalance, statementValues[`liability_${liability.id}`]);
                  
                  return (
                    <tr key={liability.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-200">{liability.name}</p>
                          <p className="text-sm text-gray-500">{liability.liabilityType}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-red-400">{formatCurrency(liability.currentBalance)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={statementValues[`liability_${liability.id}`] || ''}
                          onChange={(e) => handleStatementValueChange(liability.id, e.target.value, 'liability')}
                          placeholder="Enter amount"
                          className="w-full px-3 py-1.5 text-sm text-right bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {delta.hasValue && (
                          <div>
                            <p className={`font-medium ${
                              delta.delta > 0 ? 'text-red-400' : 
                              delta.delta < 0 ? 'text-green-400' : 
                              'text-gray-400'
                            }`}>
                              {delta.delta > 0 && '+'}{formatCurrency(delta.delta)}
                            </p>
                            {delta.delta !== 0 && (
                              <p className="text-xs text-gray-500">
                                {delta.percentage > 0 && '+'}{delta.percentage.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Other Assets */}
        {group.otherAssets.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 flex items-center">
                <Package className="w-4 h-4 mr-2 text-purple-400" />
                Other Assets
              </h4>
            </div>
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Asset</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">NestEgg</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Current Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {group.otherAssets.map(asset => {
                  const delta = calculateDelta(asset.currentValue, statementValues[`other_${asset.id}`]);
                  
                  return (
                    <tr key={asset.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-200">{asset.name}</p>
                          <p className="text-sm text-gray-500">{asset.assetType}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-300">{formatCurrency(asset.currentValue)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={statementValues[`other_${asset.id}`] || ''}
                          onChange={(e) => handleStatementValueChange(asset.id, e.target.value, 'other')}
                          placeholder="Enter value"
                          className="w-full px-3 py-1.5 text-sm text-right bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {delta.hasValue && (
                          <div>
                            <p className={`font-medium ${
                              delta.delta > 0 ? 'text-green-400' : 
                              delta.delta < 0 ? 'text-red-400' : 
                              'text-gray-400'
                            }`}>
                              {delta.delta > 0 && '+'}{formatCurrency(delta.delta)}
                            </p>
                            {delta.delta !== 0 && (
                              <p className="text-xs text-gray-500">
                                {delta.percentage > 0 && '+'}{delta.percentage.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Total Summary */}
        {hasChanges && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-4 border border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Net Change:</span>
              <span className={`text-xl font-bold ${
                totalDelta > 0 ? 'text-green-400' : 
                totalDelta < 0 ? 'text-red-400' : 
                'text-gray-400'
              }`}>
                {totalDelta > 0 && '+'}{formatCurrency(totalDelta)}
              </span>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => {
              setCurrentView('institutions');
              setSelectedInstitution(null);
              setStatementValues({});
              setHasChanges(false);
            }}
            className="px-6 py-2.5 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleUpdateAllPositions}
            disabled={!hasChanges || isSubmitting}
            className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg flex items-center transition-all ${
              !hasChanges || isSubmitting
                ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update NestEgg Balances
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-black bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-gray-900 shadow-2xl rounded-xl relative z-[10000]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              Quick Reconciliation
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[75vh] overflow-y-auto">
            {/* Message */}
            {message.text && (
              <div className={`mb-4 p-4 rounded-lg flex items-start ${
                message.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-700' :
                message.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700' :
                message.type === 'warning' ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-700' :
                'bg-blue-900/50 text-blue-200 border border-blue-700'
              }`}>
                {message.type === 'success' && <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
                {message.type === 'error' && <X className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
                {message.type === 'warning' && <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Main content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-gray-400">Loading positions...</p>
              </div>
            ) : (
              <>
                {currentView === 'home' && renderHomeView()}
                {currentView === 'institutions' && renderInstitutionsView()}
                {currentView === 'reconcile' && renderReconcileView()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export button component
export const QuickReconciliationButton = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors ${className}`}
      >
        <RefreshCw className="w-4 h-4" />
        <span>Reconcile</span>
      </button>
      
      <QuickReconciliationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default QuickReconciliationModal;