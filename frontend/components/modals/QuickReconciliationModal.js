import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Building2, ArrowLeft, Save, Loader2, RefreshCw, AlertCircle, Check, DollarSign, CreditCard, ChevronRight } from 'lucide-react';
import { useDataStore } from '@/store/DataStore';
import { updatePosition, updateOtherAsset, updateCashPosition } from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';

const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // DataStore - EXACT same pattern as QuickEditDelete
  const { state } = useDataStore();
  const accounts = state.accounts.data || [];
  const positions = state.groupedPositions.data || [];
  const liabilities = state.groupedLiabilities.data || [];
  
  // Core state management
  const [currentView, setCurrentView] = useState('institutions'); // institutions, reconcile, account-reconciliation
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reconciliation state - tracks statement values entered by user
  const [statementValues, setStatementValues] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Loading states from DataStore
  const isLoading = state.accounts.loading || state.groupedPositions.loading || state.groupedLiabilities.loading;
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentView('institutions');
      setSelectedInstitution(null);
      setMessage({ type: '', text: '' });
      setStatementValues({});
      setHasChanges(false);
    }
  }, [isOpen]);

  // Group cash positions and liabilities by institution
  const positionsByInstitution = useMemo(() => {
    const grouped = {};
    
    // Get all cash positions
    const cashPositions = positions.filter(pos => 
      pos.asset_type === 'cash' || pos.assetType === 'cash'
    );
    
    // Get all liabilities
    const liabilityItems = liabilities.map(liability => ({
      ...liability,
      isLiability: true,
      current_value: liability.total_current_balance || liability.current_balance || 0,
      identifier: liability.identifier || liability.name,
      name: liability.name,
      liability_type: liability.liability_type || liability.type,
      position_id: liability.id
    }));
    
    // Process cash positions
    cashPositions.forEach(position => {
      // Find the account(s) this position belongs to
      const relatedAccounts = accounts.filter(acc => 
        position.account_ids?.includes(acc.id)
      );
      
      relatedAccounts.forEach(account => {
        const institution = account.institution || 'Unknown Institution';
        
        if (!grouped[institution]) {
          grouped[institution] = {
            cash: [],
            liabilities: []
          };
        }
        
        // Add position with account info
        grouped[institution].cash.push({
          ...position,
          account_name: account.name,
          account_id: account.id,
          institution: institution,
          position_id: position.id || position.item_id || position.position_id,
          current_value: position.total_current_value || position.current_value || 0
        });
      });
    });
    
    // Process liabilities
    liabilityItems.forEach(liability => {
      // Find institution from accounts
      let institution = 'Unknown Institution';
      
      if (liability.account_ids && liability.account_ids.length > 0) {
        const account = accounts.find(acc => 
          liability.account_ids.includes(acc.id)
        );
        if (account) {
          institution = account.institution;
        }
      }
      
      if (!grouped[institution]) {
        grouped[institution] = {
          cash: [],
          liabilities: []
        };
      }
      
      grouped[institution].liabilities.push(liability);
    });
    
    return grouped;
  }, [positions, liabilities, accounts]);

  // Show message helper
  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    if (duration > 0) {
      setTimeout(() => setMessage({ type: '', text: '' }), duration);
    }
  };

  // Handle statement value change
  const handleStatementValueChange = (positionId, value) => {
    setStatementValues(prev => ({
      ...prev,
      [positionId]: value
    }));
    setHasChanges(true);
  };

  // Calculate delta and percentage for a position
  const getPositionDelta = (position) => {
    const statementValue = parseFloat(statementValues[position.position_id] || 0);
    const currentValue = position.current_value || 0;
    const delta = statementValue - currentValue;
    const percentage = currentValue !== 0 ? (delta / currentValue) * 100 : 0;
    
    return {
      delta,
      percentage,
      hasValue: statementValues[position.position_id] !== undefined && statementValues[position.position_id] !== ''
    };
  };

  // Normalize asset type (from QuickEditDelete)
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

  // Update all positions with statement values (EXACT QuickEditDelete logic)
  const handleUpdateAllPositions = async () => {
    try {
      setIsSubmitting(true);
      
      const updates = [];
      const positions = positionsByInstitution[selectedInstitution];
      
      // Prepare all cash position updates
      for (const position of positions.cash) {
        if (statementValues[position.position_id] !== undefined && statementValues[position.position_id] !== '') {
          const newValue = parseFloat(statementValues[position.position_id]);
          const positionId = position.position_id;
          const assetType = normalizeAssetType(position.asset_type || position.assetType);
          
          if (assetType === 'cash') {
            updates.push(
              updateCashPosition(positionId, {
                amount: newValue,
                interest_rate: position.interest_rate || 0
              })
            );
          } else if (assetType === 'otherAssets') {
            updates.push(
              updateOtherAsset(parseInt(positionId), {
                asset_name: position.identifier || position.name,
                asset_type: position.asset_type,
                cost: position.total_cost_basis || position.cost_basis || 0,
                current_value: newValue,
                purchase_date: position.purchase_date,
                notes: position.notes || ''
              })
            );
          }
        }
      }
      
      // Execute all updates
      if (updates.length > 0) {
        await Promise.all(updates);
        
        showMessage('success', `Successfully updated ${updates.length} position${updates.length !== 1 ? 's' : ''}`);
        
        // Refresh DataStore
        if (state.portfolioSummary.refresh) {
          state.portfolioSummary.refresh();
        }
        if (state.groupedPositions.refresh) {
          state.groupedPositions.refresh();
        }
        
        // Reset and go back
        setStatementValues({});
        setHasChanges(false);
        setSelectedInstitution(null);
        setCurrentView('institutions');
      } else {
        showMessage('warning', 'No changes to update');
      }
      
    } catch (error) {
      console.error('Error updating positions:', error);
      showMessage('error', `Failed to update positions: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render institution selection view
  const renderInstitutionsView = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select Institution to Reconcile</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose the institution you want to reconcile with your bank statement
        </p>
      </div>
      
      <div className="space-y-3">
        {Object.entries(positionsByInstitution).map(([institution, items]) => {
          const cashCount = items.cash.length;
          const liabilityCount = items.liabilities.length;
          const cashTotal = items.cash.reduce((sum, item) => sum + item.current_value, 0);
          const liabilityTotal = items.liabilities.reduce((sum, item) => sum + item.current_value, 0);
          
          if (cashCount === 0 && liabilityCount === 0) return null;
          
          return (
            <button
              key={institution}
              onClick={() => {
                setSelectedInstitution(institution);
                setCurrentView('reconcile');
                // Pre-populate with current values
                const initialValues = {};
                items.cash.forEach(pos => {
                  initialValues[pos.position_id] = pos.current_value;
                });
                setStatementValues(initialValues);
              }}
              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all hover:shadow-md text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{institution}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {cashCount} cash position{cashCount !== 1 ? 's' : ''}
                      {liabilityCount > 0 && `, ${liabilityCount} liabilit${liabilityCount !== 1 ? 'ies' : 'y'}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {cashTotal > 0 && (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(cashTotal)}
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
      
      {/* Account Reconciliation Option */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setCurrentView('account-reconciliation')}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">Full Account Reconciliation</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Review all positions account by account</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );

  // Render reconciliation view for selected institution
  const renderReconcileView = () => {
    if (!selectedInstitution || !positionsByInstitution[selectedInstitution]) return null;
    
    const positions = positionsByInstitution[selectedInstitution];
    const totalDelta = positions.cash.reduce((sum, pos) => {
      const delta = getPositionDelta(pos);
      return sum + (delta.hasValue ? delta.delta : 0);
    }, 0);
    
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setCurrentView('institutions');
              setSelectedInstitution(null);
              setStatementValues({});
              setHasChanges(false);
            }}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Institutions
          </button>
          
          {hasChanges && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Unsaved changes
            </span>
          )}
        </div>
        
        {/* Institution header */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            {selectedInstitution}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enter statement balances below. NestEgg will calculate the differences.
          </p>
        </div>
        
        {/* Cash Positions Table */}
        {positions.cash.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Cash Positions</h4>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {positions.cash.map((position) => {
                const delta = getPositionDelta(position);
                
                return (
                  <div key={position.position_id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {position.name || position.identifier}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {position.account_name}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* NestEgg Balance */}
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">NestEgg Balance</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(position.current_value)}
                          </p>
                        </div>
                        
                        {/* Statement Balance Input */}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Statement Balance</p>
                          <input
                            type="number"
                            value={statementValues[position.position_id] || ''}
                            onChange={(e) => handleStatementValueChange(position.position_id, e.target.value)}
                            placeholder="Enter amount"
                            className="w-32 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        {/* Delta Display */}
                        {delta.hasValue && (
                          <div className="text-right min-w-[100px]">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Difference</p>
                            <p className={`font-medium ${
                              delta.delta > 0 ? 'text-green-600 dark:text-green-400' : 
                              delta.delta < 0 ? 'text-red-600 dark:text-red-400' : 
                              'text-gray-600 dark:text-gray-400'
                            }`}>
                              {delta.delta > 0 && '+'}
                              {formatCurrency(delta.delta)}
                            </p>
                            {delta.delta !== 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {delta.percentage > 0 && '+'}
                                {delta.percentage.toFixed(1)}%
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Total Summary */}
            {hasChanges && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total Change:
                  </span>
                  <span className={`font-medium ${
                    totalDelta > 0 ? 'text-green-600 dark:text-green-400' : 
                    totalDelta < 0 ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {totalDelta > 0 && '+'}
                    {formatCurrency(totalDelta)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Liabilities (view only for now) */}
        {positions.liabilities.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden opacity-50">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Liabilities (Coming Soon)</h4>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {positions.liabilities.map((liability) => (
                <div key={liability.position_id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{liability.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {liability.liability_type || 'Liability'}
                      </p>
                    </div>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(liability.current_value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => {
              setCurrentView('institutions');
              setSelectedInstitution(null);
              setStatementValues({});
              setHasChanges(false);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleUpdateAllPositions}
            disabled={!hasChanges || isSubmitting}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors flex items-center ${
              !hasChanges || isSubmitting
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
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

  // Render account reconciliation view (placeholder)
  const renderAccountReconciliationView = () => (
    <div className="space-y-4">
      <button
        onClick={() => setCurrentView('institutions')}
        className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Institutions
      </button>
      
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Full account reconciliation workflow coming soon...
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
        <div className="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
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
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Message display */}
            {message.text && (
              <div className={`mb-4 p-3 rounded-lg flex items-start ${
                message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                message.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
              }`}>
                {message.type === 'success' && <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
                {message.type === 'error' && <X className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
                {message.type === 'warning' && <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />}
                <span>{message.text}</span>
              </div>
            )}

            {/* Loading state */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your accounts...</p>
              </div>
            ) : (
              <>
                {currentView === 'institutions' && renderInstitutionsView()}
                {currentView === 'reconcile' && renderReconcileView()}
                {currentView === 'account-reconciliation' && renderAccountReconciliationView()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Export button component for navbar
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

export default QuickReconciliationModal;