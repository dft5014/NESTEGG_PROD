import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, AlertCircle, ChevronRight, Edit2, DollarSign, CreditCard, Building2, ArrowLeft, Save, Loader2, RefreshCw } from 'lucide-react';
import { useDataStore } from '@/store/DataStore';
import { updatePosition, updateOtherAsset, updateCashPosition } from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';

const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // DataStore - EXACT same pattern as QuickEditDelete
  const { state } = useDataStore();
  const accounts = state.accounts.data || [];
  const positions = state.groupedPositions.data || [];
  const liabilities = state.groupedLiabilities.data || [];
  const portfolioSummary = state.portfolioSummary.data;
  
  // Core state management
  const [currentView, setCurrentView] = useState('home'); // home, cash-liabilities, account-reconciliation
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Loading states from DataStore
  const isLoading = state.accounts.loading || state.groupedPositions.loading || state.groupedLiabilities.loading;
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentView('home');
      setSelectedInstitution(null);
      setMessage({ type: '', text: '' });
      setEditingPosition(null);
    }
  }, [isOpen]);

  // Group positions by institution (EXACTLY like QuickEditDelete logic)
  const positionsByInstitution = useMemo(() => {
    const grouped = {};
    
    // First, get all cash positions
    const cashPositions = positions.filter(pos => 
      pos.asset_type === 'cash' || pos.assetType === 'cash'
    );
    
    // Then get all liabilities
    const liabilityItems = liabilities.map(liability => ({
      ...liability,
      isCash: false,
      isLiability: true,
      current_value: liability.total_current_balance || liability.current_balance || 0,
      identifier: liability.identifier || liability.name,
      name: liability.name,
      liability_type: liability.liability_type || liability.type
    }));
    
    // Combine cash and liabilities
    const allItems = [...cashPositions, ...liabilityItems];
    
    // Group by institution
    allItems.forEach(item => {
      // Get institution from the item or from related account
      let institution = item.institution;
      
      if (!institution && item.account_ids && item.account_ids.length > 0) {
        const account = accounts.find(acc => 
          item.account_ids.includes(acc.id)
        );
        institution = account?.institution;
      }
      
      if (!institution) {
        institution = 'Unknown Institution';
      }
      
      if (!grouped[institution]) {
        grouped[institution] = {
          cash: [],
          liabilities: []
        };
      }
      
      if (item.isLiability) {
        grouped[institution].liabilities.push(item);
      } else {
        // For cash positions, we need account info
        const accountInfo = accounts.find(acc => 
          item.account_ids?.includes(acc.id)
        );
        
        grouped[institution].cash.push({
          ...item,
          account_name: accountInfo?.name || 'Unknown Account',
          account_id: accountInfo?.id,
          // Ensure we have the position ID for updates
          position_id: item.id || item.item_id || item.position_id
        });
      }
    });
    
    return grouped;
  }, [positions, liabilities, accounts]);

  // Calculate stats (simplified from original)
  const stats = useMemo(() => {
    const cashTotal = positions
      .filter(pos => pos.asset_type === 'cash' || pos.assetType === 'cash')
      .reduce((sum, pos) => sum + (pos.total_current_value || pos.current_value || 0), 0);
    
    const liabilitiesTotal = liabilities
      .reduce((sum, liability) => sum + (liability.total_current_balance || liability.current_balance || 0), 0);
    
    const accountsNeedingReconciliation = accounts.filter(acc => {
      // Simple logic: if not updated in last 30 days
      const lastUpdated = acc.last_reconciled_at || acc.updated_at;
      if (!lastUpdated) return true;
      const daysSince = Math.floor((Date.now() - new Date(lastUpdated)) / (1000 * 60 * 60 * 24));
      return daysSince > 30;
    }).length;
    
    return {
      totalAccounts: accounts.length,
      cashTotal,
      liabilitiesTotal,
      accountsNeedingReconciliation,
      institutions: Object.keys(positionsByInstitution).length
    };
  }, [accounts, positions, liabilities, positionsByInstitution]);

  // Show message helper
  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    if (duration > 0) {
      setTimeout(() => setMessage({ type: '', text: '' }), duration);
    }
  };

  // Normalize asset type (EXACT logic from QuickEditDelete)
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

  // Handle position edit (start editing)
  const handleStartEdit = (position) => {
    setEditingPosition(position);
    setEditValue(position.total_current_value || position.current_value || 0);
  };

  // Handle position update (EXACT same as QuickEditDelete handleEdit)
  const handleUpdatePosition = async () => {
    if (!editingPosition || !editValue) return;
    
    try {
      setIsSubmitting(true);
      
      const positionId = editingPosition.position_id || editingPosition.id || editingPosition.item_id;
      const assetType = normalizeAssetType(editingPosition.asset_type || editingPosition.assetType);
      const newValue = parseFloat(editValue);
      
      // Handle based on asset type (following QuickEditDelete pattern)
      if (assetType === 'otherAssets') {
        // For other assets, use updateOtherAsset
        const otherAssetData = {
          asset_name: editingPosition.identifier || editingPosition.name,
          asset_type: editingPosition.asset_type,
          cost: editingPosition.total_cost_basis || editingPosition.cost_basis || 0,
          current_value: newValue,
          purchase_date: editingPosition.purchase_date,
          notes: editingPosition.notes || ''
        };
        await updateOtherAsset(parseInt(positionId), otherAssetData);
      } else if (assetType === 'cash') {
        // For cash positions, use updateCashPosition
        await updateCashPosition(positionId, {
          amount: newValue,
          interest_rate: editingPosition.interest_rate || 0
        });
      } else {
        // For other types (shouldn't happen in cash/liabilities view)
        let updateData = {};
        
        switch(assetType) {
          case 'security':
            updateData = {
              shares: parseFloat(editingPosition.quantity || editingPosition.total_quantity),
              price: newValue / (editingPosition.quantity || editingPosition.total_quantity || 1),
              cost_basis: parseFloat(editingPosition.cost_per_unit || 
                (editingPosition.cost_basis / (editingPosition.quantity || 1))),
              purchase_date: editingPosition.purchase_date
            };
            break;
          case 'crypto':
            updateData = {
              quantity: parseFloat(editingPosition.quantity || editingPosition.total_quantity),
              purchase_price: parseFloat(editingPosition.cost_per_unit || 
                (editingPosition.cost_basis / (editingPosition.quantity || 1))),
              purchase_date: editingPosition.purchase_date
            };
            break;
          case 'metal':
            updateData = {
              quantity: parseFloat(editingPosition.quantity || editingPosition.total_quantity),
              purchase_price: parseFloat(editingPosition.cost_per_unit || 
                (editingPosition.cost_basis / (editingPosition.quantity || 1))),
              purchase_date: editingPosition.purchase_date,
              unit: editingPosition.unit || 'oz'
            };
            break;
          default:
            updateData = { current_value: newValue };
        }
        
        await updatePosition(positionId, updateData, assetType);
      }
      
      showMessage('success', 'Position updated successfully');
      
      // Refresh DataStore
      if (state.portfolioSummary.refresh) {
        state.portfolioSummary.refresh();
      }
      if (state.groupedPositions.refresh) {
        state.groupedPositions.refresh();
      }
      
      setEditingPosition(null);
      setEditValue('');
      return true;
    } catch (error) {
      console.error('Error updating position:', error);
      showMessage('error', `Failed to update position: ${error.message}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render home view
  const renderHomeView = () => (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAccounts}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Institutions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.institutions}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cash Holdings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.cashTotal)}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Liabilities</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.liabilitiesTotal)}</p>
        </div>
      </div>

      {/* Alert if accounts need reconciliation */}
      {stats.accountsNeedingReconciliation > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {stats.accountsNeedingReconciliation} account{stats.accountsNeedingReconciliation !== 1 ? 's' : ''} need reconciliation
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                These accounts haven't been updated in over 30 days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => setCurrentView('cash-liabilities')}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Quick Balance Update</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update cash positions and liabilities</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => setCurrentView('account-reconciliation')}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Account Reconciliation</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reconcile all accounts one by one</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );

  // Render cash & liabilities view
  const renderCashLiabilitiesView = () => (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => {
          setCurrentView('home');
          setSelectedInstitution(null);
        }}
        className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Overview
      </button>

      {/* Institution selection or detail view */}
      {!selectedInstitution ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Institution</h3>
          
          {Object.entries(positionsByInstitution).map(([institution, items]) => {
            const cashCount = items.cash.length;
            const liabilityCount = items.liabilities.length;
            const cashTotal = items.cash.reduce((sum, item) => sum + (item.total_current_value || item.current_value || 0), 0);
            const liabilityTotal = items.liabilities.reduce((sum, item) => sum + (item.current_value || 0), 0);
            
            return (
              <button
                key={institution}
                onClick={() => setSelectedInstitution(institution)}
                className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{institution}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cashCount} cash position{cashCount !== 1 ? 's' : ''}, {liabilityCount} liabilit{liabilityCount !== 1 ? 'ies' : 'y'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {cashTotal > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Cash: {formatCurrency(cashTotal)}
                      </p>
                    )}
                    {liabilityTotal > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Debt: {formatCurrency(liabilityTotal)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Institution detail view
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedInstitution}</h3>
            <button
              onClick={() => setSelectedInstitution(null)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Change Institution
            </button>
          </div>

          {/* Cash Positions */}
          {positionsByInstitution[selectedInstitution].cash.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cash Positions</h4>
              <div className="space-y-2">
                {positionsByInstitution[selectedInstitution].cash.map((position) => (
                  <div
                    key={position.position_id || position.id || position.identifier}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{position.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{position.account_name}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {editingPosition?.position_id === position.position_id ? (
                        // Edit mode
                        <>
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={handleUpdatePosition}
                            disabled={isSubmitting}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 disabled:opacity-50"
                          >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingPosition(null);
                              setEditValue('');
                            }}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        // View mode
                        <>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(position.total_current_value || position.current_value || 0)}
                          </span>
                          <button
                            onClick={() => handleStartEdit(position)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liabilities */}
          {positionsByInstitution[selectedInstitution].liabilities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Liabilities</h4>
              <div className="space-y-2">
                {positionsByInstitution[selectedInstitution].liabilities.map((liability) => (
                  <div
                    key={liability.id || liability.identifier}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{liability.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {liability.liability_type || 'Liability'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(liability.current_value || 0)}
                      </span>
                      <button
                        onClick={() => showMessage('info', 'Liability editing coming soon')}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render account reconciliation view (placeholder for now)
  const renderAccountReconciliationView = () => (
    <div className="space-y-4">
      <button
        onClick={() => setCurrentView('home')}
        className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Overview
      </button>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Account reconciliation workflow coming next...
        </p>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-3xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Quick Reconciliation
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Message display */}
            {message.text && (
              <div className={`mb-4 p-3 rounded-lg ${
                message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
              }`}>
                {message.text}
              </div>
            )}

            {/* Loading state */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              <>
                {currentView === 'home' && renderHomeView()}
                {currentView === 'cash-liabilities' && renderCashLiabilitiesView()}
                {currentView === 'account-reconciliation' && renderAccountReconciliationView()}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this BEFORE the final export
export const QuickReconciliationButton = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
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

// Keep the existing default export
export default QuickReconciliationModal;