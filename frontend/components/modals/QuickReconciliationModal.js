import React, { useState, useEffect, useMemo } from 'react';
import { X, Building2, ArrowLeft, Save, Loader2, RefreshCw, AlertCircle, Check, DollarSign, CreditCard, ChevronRight } from 'lucide-react';
import { useDataStore } from '@/store/DataStore';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useAccounts } from '@/store/hooks/useAccounts';
import { updatePosition, updateOtherAsset, updateCashPosition } from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';

const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // Use the EXACT same hooks as QuickEditDelete
  const { positions: detailedPositions } = useDetailedPositions();
  const { liabilities: groupedLiabilities } = useGroupedLiabilities();
  const { accounts } = useAccounts();
  
  // Core state management
  const [currentView, setCurrentView] = useState('institutions');
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
      setCurrentView('institutions');
      setSelectedInstitution(null);
      setStatementValues({});
      setHasChanges(false);
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  // Group positions by institution - EXACTLY like QuickEditDelete does it
  const institutionGroups = useMemo(() => {
    const groups = {};
    
    // Process cash positions from detailedPositions
    const cashPositions = detailedPositions.filter(pos => 
      pos.assetType === 'cash' || pos.asset_type === 'cash'
    );
    
    // Group by institution
    cashPositions.forEach(position => {
      // Get institution directly from position or from account lookup
      let institution = position.institution;
      
      if (!institution && position.accountId) {
        const account = accounts.find(acc => acc.id === position.accountId);
        institution = account?.institution;
      }
      
      institution = institution || 'Unknown Institution';
      
      if (!groups[institution]) {
        groups[institution] = {
          name: institution,
          positions: [],
          totalValue: 0
        };
      }
      
      // Add position with all needed fields
      const positionData = {
        id: position.itemId || position.id, // Use itemId for updates
        name: position.name || position.identifier,
        accountName: position.accountName || 'Unknown Account',
        currentValue: parseFloat(position.currentValue || 0),
        assetType: position.assetType || position.asset_type,
        accountId: position.accountId,
        institution: institution
      };
      
      groups[institution].positions.push(positionData);
      groups[institution].totalValue += positionData.currentValue;
    });
    
    // Process liabilities
    if (groupedLiabilities && groupedLiabilities.length > 0) {
      groupedLiabilities.forEach(liability => {
        const institution = liability.institution_name || 'Unknown Institution';
        
        if (!groups[institution]) {
          groups[institution] = {
            name: institution,
            positions: [],
            liabilities: [],
            totalValue: 0,
            totalLiabilities: 0
          };
        }
        
        if (!groups[institution].liabilities) {
          groups[institution].liabilities = [];
        }
        
        groups[institution].liabilities.push({
          id: liability.id,
          name: liability.name,
          currentBalance: parseFloat(liability.total_current_balance || liability.current_balance || 0),
          liabilityType: liability.liability_type
        });
        
        groups[institution].totalLiabilities = (groups[institution].totalLiabilities || 0) + 
          parseFloat(liability.total_current_balance || liability.current_balance || 0);
      });
    }
    
    return groups;
  }, [detailedPositions, groupedLiabilities, accounts]);

  // Show message
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

  // Update all positions
  const handleUpdateAllPositions = async () => {
    try {
      setIsSubmitting(true);
      const group = institutionGroups[selectedInstitution];
      if (!group) return;
      
      const updates = [];
      
      // Process each position with a statement value
      for (const position of group.positions) {
        const statementValue = statementValues[position.id];
        if (statementValue !== undefined && statementValue !== '') {
          const newValue = parseFloat(statementValue);
          
          // Always use updateCashPosition for cash assets
          updates.push(
            updateCashPosition(position.id, {
              amount: newValue,
              interest_rate: 0 // Default to 0 if not tracking interest
            })
          );
        }
      }
      
      if (updates.length === 0) {
        showMessage('warning', 'No changes to update');
        return;
      }
      
      // Execute all updates
      await Promise.all(updates);
      
      showMessage('success', `Successfully updated ${updates.length} position${updates.length !== 1 ? 's' : ''}`);
      
      // Refresh data
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

  // Render institution selection
  const renderInstitutionsView = () => {
    const institutionList = Object.entries(institutionGroups);
    
    if (institutionList.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No cash positions found</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Select Institution to Reconcile
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose the institution you want to reconcile with your bank statement
          </p>
        </div>
        
        <div className="space-y-3">
          {institutionList.map(([institutionName, group]) => {
            // Only show if has cash positions
            if (!group.positions || group.positions.length === 0) {
              return null;
            }
            
            return (
              <button
                key={institutionName}
                onClick={() => {
                  setSelectedInstitution(institutionName);
                  setCurrentView('reconcile');
                  // Pre-fill with current values
                  const initialValues = {};
                  group.positions.forEach(pos => {
                    initialValues[pos.id] = pos.currentValue;
                  });
                  setStatementValues(initialValues);
                }}
                className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-all hover:shadow-md text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {institutionName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {group.positions.length} cash position{group.positions.length !== 1 ? 's' : ''}
                        {group.liabilities && group.liabilities.length > 0 && 
                          `, ${group.liabilities.length} liabilit${group.liabilities.length !== 1 ? 'ies' : 'y'}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(group.totalValue)}
                    </p>
                    {group.totalLiabilities > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Debt: {formatCurrency(group.totalLiabilities)}
                      </p>
                    )}
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
    
    // Calculate total delta
    const totalDelta = group.positions.reduce((sum, pos) => {
      const delta = calculateDelta(pos.currentValue, statementValues[pos.id]);
      return sum + (delta.hasValue ? delta.delta : 0);
    }, 0);
    
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
        
        {/* Institution info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            {selectedInstitution}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enter your statement balances below
          </p>
        </div>
        
        {/* Positions table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-750">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Account
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  NestEgg Balance
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Statement Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {group.positions.map(position => {
                const delta = calculateDelta(position.currentValue, statementValues[position.id]);
                
                return (
                  <tr key={position.id}>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {position.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {position.accountName}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(position.currentValue)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        value={statementValues[position.id] || ''}
                        onChange={(e) => handleStatementValueChange(position.id, e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-3 py-1.5 text-sm text-right border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
                      {delta.hasValue && (
                        <div>
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total row */}
            {hasChanges && (
              <tfoot className="bg-gray-50 dark:bg-gray-750 border-t-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <td colSpan="3" className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                    Total Change:
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`font-bold text-lg ${
                      totalDelta > 0 ? 'text-green-600 dark:text-green-400' : 
                      totalDelta < 0 ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {totalDelta > 0 && '+'}
                      {formatCurrency(totalDelta)}
                    </p>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => {
              setCurrentView('institutions');
              setSelectedInstitution(null);
              setStatementValues({});
              setHasChanges(false);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          
          <button
            onClick={handleUpdateAllPositions}
            disabled={!hasChanges || isSubmitting}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center ${
              !hasChanges || isSubmitting
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Quick Reconciliation
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Message */}
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

            {/* Main content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading positions...</p>
              </div>
            ) : (
              <>
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