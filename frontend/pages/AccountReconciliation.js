import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  Check, 
  AlertCircle, 
  Clock, 
  Info,
  ChevronDown, 
  ChevronRight, 
  RefreshCw,
  Edit,
  Save,
  X,
  DollarSign,
  Home,
  Briefcase,
  BarChart4,
  CreditCard,
  Loader,
  Trash,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import { popularBrokerages } from '../utils/constants';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '../utils/formatters';
import { deletePosition } from '../utils/apimethods/positionMethods';

// Import position modals
import SecurityPositionModal from '../components/modals/SecurityPositionModal';
import CryptoPositionModal from '../components/modals/CryptoPositionModal';
import CashPositionModal from '../components/modals/CashPositionModal';
import MetalPositionModal from '../components/modals/MetalPositionModal';

const AccountReconciliation = () => {
  const { user } = useContext(AuthContext);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showPositionReconciliation, setShowPositionReconciliation] = useState(false);
  const [reconciliationData, setReconciliationData] = useState({
    accountLevel: {
      actualBalance: '',
      variance: 0,
      variancePercent: 0,
      isReconciled: false
    },
    positions: []
  });
  
  // Position modal states
  const [showSecurityPositionModal, setShowSecurityPositionModal] = useState(false);
  const [showCryptoPositionModal, setShowCryptoPositionModal] = useState(false);
  const [showCashPositionModal, setShowCashPositionModal] = useState(false);
  const [showMetalPositionModal, setShowMetalPositionModal] = useState(false);
  const [positionToEdit, setPositionToEdit] = useState(null);
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Helper function to get institution logo
  const getInstitutionLogo = (institutionName) => {
    if (!institutionName) return null;
    const brokerage = popularBrokerages.find(
      broker => broker.name.toLowerCase() === institutionName.toLowerCase()
    );
    const FallbackIcon = () => <Briefcase className="w-5 h-5 text-gray-500" />;
    return brokerage ? brokerage.logo : FallbackIcon;
  };

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the API_BASE_URL for constructing the full URL
      const response = await fetch(`${API_BASE_URL}/accounts/all/detailed`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching accounts: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Add reconciliation status fields if not present
      const accountsWithReconciliation = data.accounts.map(account => ({
        ...account,
        lastReconciled: account.lastReconciled || null,
        reconciliationStatus: account.reconciliationStatus || 'Not Reconciled'
      }));
      
      setAccounts(accountsWithReconciliation);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Display success message
  const showMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };
  
  // Handle editing a position
  const handleEditPosition = (position, e) => {
    if (e) e.stopPropagation();
    console.log("Edit position:", position);
    
    setPositionToEdit(position);
    
    // Open the appropriate modal based on asset type
    switch (position.asset_type) {
      case 'security':
        setShowSecurityPositionModal(true);
        break;
      case 'crypto':
        setShowCryptoPositionModal(true);
        break;
      case 'cash':
        setShowCashPositionModal(true);
        break;
      case 'metal':
        setShowMetalPositionModal(true);
        break;
      default:
        console.error("Unknown asset type:", position.asset_type);
    }
  };
  
  // Handle position saved callback
  const handlePositionSaved = () => {
    showMessage("Position updated successfully!");
    
    // Refresh position data
    if (activeAccount) {
      fetchPositionsForAccount(activeAccount.id);
    }
  };
  
  // Fetch positions for a specific account
  const fetchPositionsForAccount = async (accountId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/positions/by-account/${accountId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching positions: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update the positions in reconciliation data
      setReconciliationData(prev => ({
        ...prev,
        positions: data.positions.map(position => ({
          ...position,
          actualQuantity: position.quantity_or_shares,
          actualValue: position.value,
          quantityVariance: 0,
          quantityVariancePercent: 0,
          valueVariance: 0,
          valueVariancePercent: 0,
          isQuantityReconciled: false,
          isValueReconciled: false
        }))
      }));
      
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(err.message);
    }
  };
  
  // Handle deleting a position
  const handleDeletePosition = async (position, e) => {
    if (e) e.stopPropagation();
    console.log("Delete position:", position);
    
    if (window.confirm(`Are you sure you want to delete this position? ${position.ticker_or_name}`)) {
      try {
        // Call the deletePosition API function
        await deletePosition(position.id, position.asset_type);
        
        showMessage("Position deleted successfully!");
        
        // Update the positions list by removing the deleted position
        setReconciliationData(prev => ({
          ...prev,
          positions: prev.positions.filter(p => p.id !== position.id)
        }));
        
        // Also refresh account data if needed
        fetchAccounts();
        
      } catch (error) {
        console.error("Error deleting position:", error);
        setError("Failed to delete position. Please try again.");
      }
    }
  };

  const handleReconcileClick = (account) => {
    setActiveAccount(account);
    setShowPositionReconciliation(false);
    
    // Initialize reconciliation data
    const newReconciliationData = {
      accountLevel: {
        actualBalance: account.total_value.toFixed(2),
        variance: 0,
        variancePercent: 0,
        isReconciled: false
      },
      positions: account.positions.map(position => ({
        ...position,
        actualQuantity: position.quantity_or_shares,
        actualValue: position.value,
        quantityVariance: 0,
        quantityVariancePercent: 0,
        valueVariance: 0,
        valueVariancePercent: 0,
        isQuantityReconciled: false,
        isValueReconciled: false
      }))
    };
    
    setReconciliationData(newReconciliationData);
    setShowReconcileModal(true);
  };
  
  const calculateAccountVariance = (actualBalance) => {
    if (!activeAccount || !actualBalance) return { variance: 0, variancePercent: 0 };
    
    const numActualBalance = parseFloat(actualBalance);
    const variance = numActualBalance - activeAccount.total_value;
    const variancePercent = activeAccount.total_value !== 0 
      ? (variance / activeAccount.total_value) * 100 
      : 0;
      
    return { variance, variancePercent };
  };
  
  const handleAccountBalanceChange = (e) => {
    const actualBalance = e.target.value;
    const { variance, variancePercent } = calculateAccountVariance(actualBalance);
    
    setReconciliationData({
      ...reconciliationData,
      accountLevel: {
        ...reconciliationData.accountLevel,
        actualBalance,
        variance,
        variancePercent
      }
    });
  };
  
  const calculatePositionVariance = (position, actualQuantity, actualValue) => {
    const numActualQuantity = parseFloat(actualQuantity);
    const numActualValue = parseFloat(actualValue);
    
    const quantityVariance = numActualQuantity - position.quantity_or_shares;
    const quantityVariancePercent = position.quantity_or_shares !== 0 
      ? (quantityVariance / position.quantity_or_shares) * 100 
      : 0;
      
    const valueVariance = numActualValue - position.value;
    const valueVariancePercent = position.value !== 0 
      ? (valueVariance / position.value) * 100 
      : 0;
      
    return { 
      quantityVariance, 
      quantityVariancePercent, 
      valueVariance, 
      valueVariancePercent 
    };
  };
  
  const handlePositionQuantityChange = (index, value) => {
    const positions = [...reconciliationData.positions];
    const position = positions[index];
    
    const actualQuantity = value;
    const { 
      quantityVariance, 
      quantityVariancePercent, 
      valueVariance, 
      valueVariancePercent 
    } = calculatePositionVariance(
      position, 
      actualQuantity, 
      position.actualValue
    );
    
    positions[index] = {
      ...position,
      actualQuantity,
      quantityVariance,
      quantityVariancePercent,
      valueVariance,
      valueVariancePercent
    };
    
    setReconciliationData({
      ...reconciliationData,
      positions
    });
  };
  
  const handlePositionValueChange = (index, value) => {
    const positions = [...reconciliationData.positions];
    const position = positions[index];
    
    const actualValue = value;
    const { 
      quantityVariance, 
      quantityVariancePercent, 
      valueVariance, 
      valueVariancePercent 
    } = calculatePositionVariance(
      position, 
      position.actualQuantity, 
      actualValue
    );
    
    positions[index] = {
      ...position,
      actualValue,
      quantityVariance,
      quantityVariancePercent,
      valueVariance,
      valueVariancePercent
    };
    
    setReconciliationData({
      ...reconciliationData,
      positions
    });
  };
  
  const toggleAccountReconcileStatus = () => {
    setReconciliationData({
      ...reconciliationData,
      accountLevel: {
        ...reconciliationData.accountLevel,
        isReconciled: !reconciliationData.accountLevel.isReconciled
      }
    });
  };
  
  const togglePositionReconcileStatus = (index, field) => {
    const positions = [...reconciliationData.positions];
    
    if (field === 'quantity') {
      positions[index].isQuantityReconciled = !positions[index].isQuantityReconciled;
    } else if (field === 'value') {
      positions[index].isValueReconciled = !positions[index].isValueReconciled;
    }
    
    setReconciliationData({
      ...reconciliationData,
      positions
    });
  };
  
  const handleSaveReconciliation = async () => {
    try {
      // Switch to POST format expected by your backend
      const reconciliationPayload = {
        account_id: activeAccount.id,
        reconciliation_date: new Date().toISOString(),
        account_level: {
          ...reconciliationData.accountLevel,
          app_balance: activeAccount.total_value
        },
        positions: reconciliationData.positions.map(position => ({
          position_id: position.id,
          asset_type: position.asset_type,
          app_quantity: position.quantity_or_shares,
          app_value: position.value,
          actual_quantity: parseFloat(position.actualQuantity) || position.quantity_or_shares,
          actual_value: parseFloat(position.actualValue) || position.value,
          is_quantity_reconciled: position.isQuantityReconciled,
          is_value_reconciled: position.isValueReconciled
        }))
      };
      
      // Send to your backend endpoint
      const response = await fetch(`${API_BASE_URL}/accounts/reconcile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reconciliationPayload),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save reconciliation: ${response.statusText}`);
      }
      
      // Refresh accounts data
      fetchAccounts();
      
      // Close modal
      setShowReconcileModal(false);
      setActiveAccount(null);
      
    } catch (err) {
      console.error('Error saving reconciliation:', err);
      setError(err.message);
    }
  };
  
  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };
  
  // Get variance display class based on threshold
  const getVarianceClass = (variance, isPercent = false) => {
    const absVariance = Math.abs(isPercent ? variance : variance);
    const threshold = isPercent ? 1 : 100; // 1% or $100
    
    if (absVariance === 0) return 'text-green-600';
    if (absVariance < threshold) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate total position variances
  const calculateTotalPositionVariances = () => {
    if (!reconciliationData.positions.length) return { valueVariance: 0, valueVariancePercent: 0 };
    
    let totalAppValue = 0;
    let totalActualValue = 0;
    
    reconciliationData.positions.forEach(position => {
      totalAppValue += position.value;
      totalActualValue += parseFloat(position.actualValue) || position.value;
    });
    
    const valueVariance = totalActualValue - totalAppValue;
    const valueVariancePercent = totalAppValue !== 0 
      ? (valueVariance / totalAppValue) * 100 
      : 0;
      
    return { valueVariance, valueVariancePercent };
  };

  // Get asset icon based on type
  const getAssetIcon = (assetType) => {
    switch (assetType) {
      case 'security':
        return <BarChart4 className="w-4 h-4 text-blue-600" />;
      case 'crypto':
        return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case 'cash':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'metal':
        return <Briefcase className="w-4 h-4 text-yellow-600" />;
      case 'real_estate':
        return <Home className="w-4 h-4 text-red-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Account Reconciliation</h1>
        <p className="text-gray-400">
          Verify that your NestEgg accounts match your actual account statements.
        </p>
      </div>
      
      {/* Success message */}
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 p-4 bg-green-600 text-white rounded-lg shadow-lg z-[100]">
          {successMessage}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/60 rounded-lg text-red-200 flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error loading accounts</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex items-center justify-center">
          <div>
            <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400">Loading accounts...</p>
          </div>
        </div>
      )}
      
      {/* Accounts table */}
      {!loading && accounts.length > 0 && (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold flex items-center whitespace-nowrap text-white">
              <Briefcase className="w-5 h-5 mr-3 text-purple-500" />
              Account Reconciliation
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800 text-white">
              <thead className="bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Institution
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Account
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    NestEgg Balance
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Positions
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Last Reconciled
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {accounts.map(account => {
                  const LogoComponent = getInstitutionLogo(account.institution);
                  
                  return (
                    <tr key={account.id} className="hover:bg-gray-800/80 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center max-w-xs">
                          {typeof LogoComponent === 'string'
                            ? <img src={LogoComponent} alt={account.institution || ''} className="w-5 h-5 object-contain mr-2 rounded-sm flex-shrink-0"/>
                            : LogoComponent
                                ? <div className="w-5 h-5 mr-2 flex items-center justify-center"><LogoComponent /></div>
                                : (account.institution &&
                                    <div className="flex-shrink-0 h-5 w-5 rounded-sm bg-gray-700 flex items-center justify-center mr-2 text-xs font-medium text-gray-300">
                                      {account.institution.charAt(0).toUpperCase()}
                                    </div>
                                  )
                          }
                          <span className="break-words whitespace-normal">{account.institution || "N/A"}</span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium">{account.account_name}</div>
                        {account.type && (
                          <div className="text-xs text-gray-400 italic">{account.type}</div>
                        )}
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="font-medium">{formatCurrency(account.total_value)}</div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="text-sm">{account.positions_count}</div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-gray-300 text-sm">
                            {formatDate(account.lastReconciled)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          account.reconciliationStatus === 'Reconciled' 
                            ? 'bg-green-900 text-green-200' 
                            : 'bg-amber-900 text-amber-200'
                        }`}>
                          {account.reconciliationStatus === 'Reconciled' 
                            ? <Check className="w-3 h-3 mr-1" /> 
                            : <AlertCircle className="w-3 h-3 mr-1" />}
                          {account.reconciliationStatus}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => handleReconcileClick(account)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          Reconcile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* No accounts message */}
      {!loading && accounts.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 text-center min-h-[180px] flex items-center justify-center flex-col">
          <AlertCircle className="w-12 h-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Accounts Found</h3>
          <p className="text-gray-400 mb-4">
            You need to add some accounts before you can reconcile them.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            Add Account
          </button>
        </div>
      )}
      
      {/* Reconciliation Modal */}
      {showReconcileModal && activeAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 px-6 py-4 text-white border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  Account Reconciliation: {activeAccount.account_name}
                </h3>
                <button 
                  onClick={() => setShowReconcileModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 flex-grow bg-gray-900 text-white">
              {/* Account Level Reconciliation */}
              <div className="mb-6">
                <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <Info className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-100">
                      <p className="font-medium mb-1">About Account Reconciliation</p>
                      <p>
                        Compare your account total balance from your financial institution with what's shown in NestEgg.
                        Enter the actual balance to see any variance. If there's a significant difference, you can check individual positions.
                      </p>
                    </div>
                  </div>
                </div>
                
                <h4 className="text-lg font-medium mb-4 text-white">Account Balance Reconciliation</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-300 mb-1">NestEgg Balance</div>
                    <div className="text-xl font-semibold text-white">
                      {formatCurrency(activeAccount.total_value)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-300 mb-1">Actual Balance</div>
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-1">$</span>
                      <input
                        type="number"
                        value={reconciliationData.accountLevel.actualBalance}
                        onChange={handleAccountBalanceChange}
                        className="text-xl font-semibold w-full bg-transparent focus:outline-none focus:ring-0 border-b border-gray-600 focus:border-blue-500 transition-colors text-white"
                        placeholder="Enter actual balance"
                        step="any"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-300 mb-1">Variance</div>
                    <div className={`text-xl font-semibold ${getVarianceClass(reconciliationData.accountLevel.variance)}`}>
                      {formatCurrency(reconciliationData.accountLevel.variance)}
                      <span className="text-sm ml-1">
                        ({formatPercentage(reconciliationData.accountLevel.variancePercent)})
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center mt-6">
                  <label className="flex items-center cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg px-4 py-3 border border-gray-700">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded transition-colors"
                      checked={reconciliationData.accountLevel.isReconciled}
                      onChange={toggleAccountReconcileStatus}
                    />
                    <span className="ml-2 text-gray-200">Mark this account as reconciled</span>
                  </label>
                </div>
              </div>

              {/* Divider with expand/collapse control */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <button
                    onClick={() => setShowPositionReconciliation(!showPositionReconciliation)}
                    className={`px-4 py-2 flex items-center bg-gray-800 border border-gray-700 rounded-full text-sm font-medium ${
                      showPositionReconciliation ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'
                    } transition-colors`}
                  >
                    {showPositionReconciliation ? (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Hide Position Details
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4 mr-1" />
                        {Math.abs(reconciliationData.accountLevel.variancePercent) > 1 
                          ? 'Investigate Position Variances' 
                          : 'Show Position Details'}
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Position Reconciliation (expanded section) */}
              {showPositionReconciliation && (
                <div className="mt-6">
                  <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-4 mb-6">
                    <div className="flex">
                      <Info className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-100">
                        <p className="font-medium mb-1">About Position Reconciliation</p>
                        <p>
                          Compare individual position quantities and values with what's shown in your financial institution.
                          Enter the actual quantities and values to identify specific discrepancies.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium">Position-Level Reconciliation</h4>
                    <div className={`text-sm font-medium ${getVarianceClass(calculateTotalPositionVariances().valueVariance)}`}>
                      Total Positions Variance: {formatCurrency(calculateTotalPositionVariances().valueVariance)} 
                      ({formatPercentage(calculateTotalPositionVariances().valueVariancePercent)})
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700 text-white border border-gray-700 rounded-lg">
                      <thead className="bg-gray-800">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Asset
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            App Quantity
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actual Quantity
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Qty Variance
                          </th>
                          <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Reconciled?
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            App Value
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actual Value
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Value Variance
                          </th>
                          <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Reconciled?
                          </th>
                          <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700 bg-gray-900">
                        {reconciliationData.positions.map((position, index) => (
                          <tr key={position.id} className="hover:bg-gray-800 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-gray-800 rounded-sm flex items-center justify-center mr-2">
                                  {getAssetIcon(position.asset_type)}
                                </div>
                                <div>
                                  <div className="font-medium">{position.ticker_or_name}</div>
                                  <div className="text-xs text-gray-400 capitalize">{position.asset_type}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              {formatNumber(position.quantity_or_shares, { maximumFractionDigits: 6 })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <input
                                type="number"
                                value={position.actualQuantity}
                                onChange={(e) => handlePositionQuantityChange(index, e.target.value)}
                                className="w-20 text-right bg-gray-800 border-b border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-0 transition-colors text-white"
                                step="any"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <div className={`${getVarianceClass(position.quantityVariance)}`}>
                                {formatNumber(position.quantityVariance, { maximumFractionDigits: 6 })}
                                <div className="text-xs">
                                  ({formatPercentage(position.quantityVariancePercent)})
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={position.isQuantityReconciled}
                                onChange={() => togglePositionReconcileStatus(index, 'quantity')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded transition-colors"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              {formatCurrency(position.value)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end">
                                <span className="text-gray-400 mr-1">$</span>
                                <input
                                  type="number"
                                  value={position.actualValue}
                                  onChange={(e) => handlePositionValueChange(index, e.target.value)}
                                  className="w-20 text-right bg-gray-800 border-b border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-0 transition-colors text-white"
                                  step="any"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <div className={`${getVarianceClass(position.valueVariance)}`}>
                                {formatCurrency(position.valueVariance)}
                                <div className="text-xs">
                                  ({formatPercentage(position.valueVariancePercent)})
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <input
                                type="checkbox"
                                checked={position.isValueReconciled}
                                onChange={() => togglePositionReconcileStatus(index, 'value')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded transition-colors"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center space-x-1 justify-center">
                                <button 
                                  onClick={(e) => handleEditPosition(position, e)} 
                                  className="p-1 bg-blue-900 text-blue-400 rounded hover:bg-blue-800 transition-colors"
                                  title="Edit Position"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => handleDeletePosition(position, e)} 
                                  className="p-1 bg-red-900 text-red-400 rounded hover:bg-red-800 transition-colors"
                                  title="Delete Position"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-700 px-6 py-4 flex justify-end space-x-3 bg-gray-800">
              <button
                onClick={() => setShowReconcileModal(false)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReconciliation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Reconciliation
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Position Editing Modals */}
      {showSecurityPositionModal && (
        <SecurityPositionModal
          isOpen={showSecurityPositionModal}
          onClose={() => setShowSecurityPositionModal(false)}
          accountId={activeAccount?.id}
          accountName={activeAccount?.account_name}
          onPositionSaved={handlePositionSaved}
          positionToEdit={positionToEdit}
        />
      )}
      
      {showCryptoPositionModal && (
        <CryptoPositionModal
          isOpen={showCryptoPositionModal}
          onClose={() => setShowCryptoPositionModal(false)}
          accountId={activeAccount?.id}
          accountName={activeAccount?.account_name}
          onPositionSaved={handlePositionSaved}
          positionToEdit={positionToEdit}
        />
      )}
      
      {showCashPositionModal && (
        <CashPositionModal
          isOpen={showCashPositionModal}
          onClose={() => setShowCashPositionModal(false)}
          accountId={activeAccount?.id}
          onPositionSaved={handlePositionSaved}
          positionToEdit={positionToEdit}
        />
      )}
      
      {showMetalPositionModal && (
        <MetalPositionModal
          isOpen={showMetalPositionModal}
          onClose={() => setShowMetalPositionModal(false)}
          accountId={activeAccount?.id}
          accountName={activeAccount?.account_name}
          onPositionSaved={handlePositionSaved}
          positionToEdit={positionToEdit}
        />
      )}
    </div>
  );
};

export default AccountReconciliation;