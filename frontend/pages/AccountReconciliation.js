// pages/AccountReconciliation.js
import React, { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../utils/api';
import Head from 'next/head';
import AddPositionButton from '@/components/AddPositionButton'
import EditPositionButton from '@/components/EditPositionButton'
import DeletePositionButton from '@/components/DeletePositionButton';
import { Menu, ArrowUpDown, CheckCircle, Info, Clock, X, Filter } from 'lucide-react';

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Helper function to format number with commas
const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Helper function to format percentage
const formatPercentage = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
};

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Helper to determine days since last reconciliation
const daysSinceLastReconciled = (dateString) => {
  if (!dateString) return null;
  const lastDate = new Date(dateString);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper function to determine variance level
const getVarianceLevel = (percentDifference) => {
  const absDifference = Math.abs(percentDifference);
  
  if (absDifference <= 1) {
    return { 
      level: 'good', 
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      message: 'Within acceptable range (±1%)'
    };
  } else if (absDifference <= 2) {
    return { 
      level: 'warning', 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      message: 'Minor variance (±1-2%)'
    };
  } else {
    return { 
      level: 'critical', 
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      message: 'Significant variance (>±2%)'
    };
  }
};

// Format input value with commas and decimal points
const formatInputValue = (value) => {
  if (!value) return '';
  
  // Remove non-numeric characters except decimal point
  const numericValue = value.replace(/[^0-9.]/g, '');
  
  // Format with commas and decimal points
  const parts = numericValue.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return parts.join('.');
};

// Component for status icon
const StatusIcon = ({ status }) => {
  if (status === 'Reconciled' || status === 'reconciled') {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  } else if (status === 'Needs Review' || status === 'needsReview') {
    return <Info className="h-5 w-5 text-yellow-500" />;
  } else {
    return <X className="h-5 w-5 text-red-600" />;
  }
};

const AccountReconciliation = () => {
  // State variables for accounts and UI state
  const [accounts, setAccounts] = useState([]);
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [positions, setPositions] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showTips, setShowTips] = useState(true);
  const [activeReconcileDropdown, setActiveReconcileDropdown] = useState(null);
  
  // State for form inputs
  const [positionInputs, setPositionInputs] = useState({});
  const [accountInputs, setAccountInputs] = useState({});
  const [formattedInputs, setFormattedInputs] = useState({});
  
  // State for reconciliation dialog
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [enteredBalance, setEnteredBalance] = useState('');
  const dropdownRef = useRef(null);

  // State for sorting positions
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'ascending'
  });

  const [accountSortConfig, setAccountSortConfig] = useState({
  key: 'account_name',
  direction: 'ascending'
});

  // Load accounts on component mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch accounts from enriched_accounts
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/accounts/enriched');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const accountsData = data.accounts || [];
      
      // Initialize form inputs based on account data
      const initialAccountInputs = {};
      const initialFormattedInputs = {};
      
      accountsData.forEach(account => {
        initialAccountInputs[account.id] = {
          balance: parseFloat(account.total_value) || 0,
        };
        
        initialFormattedInputs[`account_${account.id}`] = 
          formatCurrency(parseFloat(account.total_value) || 0).replace('$', '');
      });
      
      setAccounts(accountsData);
      setAccountInputs(initialAccountInputs);
      setFormattedInputs(initialFormattedInputs);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setErrorMessage('Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveReconcileDropdown(null);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch positions when an account is expanded
  const fetchPositions = async (accountId) => {
    setLoadingPositions(prev => ({ ...prev, [accountId]: true }));
    try {
      const response = await fetchWithAuth(`/positions/unified?account_id=${accountId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const positionsData = data.positions || [];
      
      // Initialize position inputs
      const newPositionInputs = { ...positionInputs };
      const newFormattedInputs = { ...formattedInputs };
      
      positionsData.forEach(position => {
        if (!newPositionInputs[position.id]) {
          newPositionInputs[position.id] = {
            shares: parseFloat(position.quantity) || 0,
            value: parseFloat(position.current_value) || 0
          };
          
          newFormattedInputs[`position_shares_${position.id}`] = formatNumber(parseFloat(position.quantity) || 0);
          newFormattedInputs[`position_value_${position.id}`] = formatCurrency(parseFloat(position.current_value) || 0).replace('$', '');
        }
      });
      
      setPositions(prev => ({ ...prev, [accountId]: positionsData }));
      setPositionInputs(newPositionInputs);
      setFormattedInputs(newFormattedInputs);
    } catch (error) {
      console.error(`Error fetching positions for account ${accountId}:`, error);
      setErrorMessage('Failed to load positions. Please try again.');
    } finally {
      setLoadingPositions(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Handle expanding an account to view positions
  const handleAccountExpand = (accountId) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
      if (!positions[accountId]) {
        fetchPositions(accountId);
      }
    }
  };

  const handleOpenReconcileDialog = (account) => {
    setSelectedAccount(account);
    setEnteredBalance(parseFloat(account.total_value).toString());
    setReconcileDialogOpen(true);
  };

  const handleCloseReconcileDialog = () => {
    setReconcileDialogOpen(false);
    setSelectedAccount(null);
    setEnteredBalance('');
  };

  const handleBalanceChange = (e) => {
    // Allow only numbers and decimal point
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setEnteredBalance(value);
  };

  // Handle changes to account level balance input
  const handleAccountInputChange = (accountId, value) => {
    // Store raw numeric value
    const numericValue = value.replace(/[^0-9.]/g, '');
    setAccountInputs({
      ...accountInputs,
      [accountId]: {
        ...accountInputs[accountId],
        balance: numericValue
      }
    });
    
    // Store formatted value for display
    setFormattedInputs({
      ...formattedInputs,
      [`account_${accountId}`]: formatInputValue(value)
    });
  };

  // Handle changes to position level inputs
  const handlePositionInputChange = (positionId, field, value) => {
    // Store raw numeric value
    const numericValue = value.replace(/[^0-9.]/g, '');
    setPositionInputs({
      ...positionInputs,
      [positionId]: {
        ...positionInputs[positionId],
        [field]: numericValue
      }
    });
    
    // Store formatted value for display
    setFormattedInputs({
      ...formattedInputs,
      [`position_${field}_${positionId}`]: formatInputValue(value)
    });
  };

  const handleReconcileAccount = async () => {
    try {
      setLoading(true);
      
      // Get the input values or use the current values if not modified
      const actualBalance = parseFloat(enteredBalance) || parseFloat(selectedAccount.total_value);
      
      // Prepare the data for API call
      const reconciliationData = {
        account_id: selectedAccount.id,
        app_balance: parseFloat(selectedAccount.total_value),
        actual_balance: actualBalance
      };
      
      // Call the API
      const response = await fetchWithAuth('/api/reconciliation/account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reconciliationData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to reconcile account: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Close the dialog
      setReconcileDialogOpen(false);
      
      // Refresh accounts to get updated status
      fetchAccounts();
      
      setSuccessMessage(`${selectedAccount.account_name} has been reconciled successfully.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error("Error reconciling account:", error);
      setErrorMessage(`Failed to reconcile account: ${error.message}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
      setSelectedAccount(null);
      setEnteredBalance('');
    }
  };

  const handleReconcilePosition = async (accountId, position, reconcileQuantity = true, reconcileValue = true) => {
    try {
      const positionId = position.id;
      setLoading(true);
      
      // Get the input values or use the current values if not modified
      const actualQuantity = parseFloat(positionInputs[positionId]?.shares || position.quantity);
      const actualValue = parseFloat(positionInputs[positionId]?.value || position.current_value);
      
      // Prepare the data for API call
      const reconciliationData = {
        position_id: positionId,
        account_id: accountId,
        asset_type: position.asset_type || "security", // Default to "security" if not specified
        app_quantity: parseFloat(position.quantity || 0),
        app_value: parseFloat(position.current_value || 0),
        actual_quantity: actualQuantity,
        actual_value: actualValue,
        reconcile_quantity: reconcileQuantity,
        reconcile_value: reconcileValue
      };
      
      // Call the API
      const response = await fetchWithAuth('/api/reconciliation/position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reconciliationData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to reconcile position: ${response.status}`);
      }
      
      // Update UI to reflect the reconciled status
      fetchPositions(accountId);
      
      let message = "Position has been reconciled successfully.";
      if (reconcileQuantity && !reconcileValue) {
        message = "Position quantity has been reconciled successfully.";
      } else if (!reconcileQuantity && reconcileValue) {
        message = "Position value has been reconciled successfully.";
      }
      
      setSuccessMessage(message);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error("Error reconciling position:", error);
      setErrorMessage(`Failed to reconcile position: ${error.message}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
      // Close the dropdown
      setActiveReconcileDropdown(null);
    }
  };
  
  const handleReconcileAllPositions = async (accountId) => {
    try {
      setLoading(true);
      
      // Get all positions for this account
      const accountPositions = positions[accountId] || [];
      
      // Reconcile each position one by one
      for (const position of accountPositions) {
        const reconciliationData = {
          position_id: position.id,
          account_id: accountId,
          asset_type: position.asset_type || "security",
          app_quantity: parseFloat(position.quantity),
          app_value: parseFloat(position.current_value),
          actual_quantity: parseFloat(position.quantity), // Using NestEgg values
          actual_value: parseFloat(position.current_value) // Using NestEgg values
        };
        
        // Call the API
        const response = await fetchWithAuth('/api/reconciliation/position', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reconciliationData),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to reconcile position ${position.id}: ${response.status} ${response.statusText}`);
        }
      }
      
      // Refresh positions to get updated status
      fetchPositions(accountId);
      
      setSuccessMessage(`All positions have been reconciled successfully.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error("Error reconciling all positions:", error);
      setErrorMessage(`Failed to reconcile all positions: ${error.message}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleReconcileAllUnreconciled = async () => {
    try {
      setLoading(true);
      
      // Process each account
      for (const account of accounts) {
        // Fetch positions if we haven't already
        if (!positions[account.id]) {
          await fetchPositions(account.id);
        }
        
        const accountPositions = positions[account.id] || [];
        
        // Reconcile each position
        for (const position of accountPositions) {
          // Check if position needs reconciliation
          if (position.reconciliation_status !== 'Reconciled' && position.reconciliation_status !== 'reconciled') {
            const reconciliationData = {
              position_id: position.id,
              account_id: account.id,
              asset_type: position.asset_type || "security",
              app_quantity: parseFloat(position.quantity),
              app_value: parseFloat(position.current_value),
              actual_quantity: parseFloat(position.quantity), // Using NestEgg values
              actual_value: parseFloat(position.current_value) // Using NestEgg values
            };
            
            // Call the API
            const response = await fetchWithAuth('/api/reconciliation/position', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(reconciliationData),
            });
            
            if (!response.ok) {
              throw new Error(`Failed to reconcile position ${position.id}: ${response.status} ${response.statusText}`);
            }
          }
        }
      }
      
      // Refresh accounts and positions
      fetchAccounts();
      
      setSuccessMessage(`All unreconciled positions have been reconciled successfully.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error("Error reconciling all unreconciled positions:", error);
      setErrorMessage(`Failed to reconcile all unreconciled positions: ${error.message}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  // Calculate difference for account balance input
  const calculateAccountDifference = (account) => {
    if (!accountInputs[account.id]) return { difference: 0, percentDifference: 0 };
    
    const inputBalance = parseFloat(accountInputs[account.id].balance) || 0;
    const accountValue = parseFloat(account.total_value) || 0;
    const difference = inputBalance - accountValue;
    const percentDifference = accountValue ? (difference / accountValue) * 100 : 0;
    
    return { difference, percentDifference };
  };

  // Calculate difference for position inputs
  const calculatePositionDifference = (position) => {
    if (!positionInputs[position.id]) return { shareDiff: 0, valueDiff: 0, valuePercentDiff: 0 };
    
    const inputShares = parseFloat(positionInputs[position.id].shares) || 0;
    const inputValue = parseFloat(positionInputs[position.id].value) || 0;
    
    const positionShares = parseFloat(position.quantity) || 0;
    const positionValue = parseFloat(position.current_value) || 0;
    
    const shareDiff = inputShares - positionShares;
    const valueDiff = inputValue - positionValue;
    const valuePercentDiff = positionValue ? (valueDiff / positionValue) * 100 : 0;
    
    return { shareDiff, valueDiff, valuePercentDiff };
  };

  // Calculate reconciliation dashboard metrics
  const calculateDashboardMetrics = () => {
    // Initialize counters
    let totalAccounts = accounts.length;
    let totalPositions = 0;
    let reconciledAccounts = 0;
    let reconciledPositions = 0;
    let totalNestEggValue = 0;
    let totalReconciledValue = 0;
    let accountsReconciledLast30Days = 0;
    let accountsReconciledLast90Days = 0;
    let accountsRequiringReconciliation = 0;
    
    // Account status counts
    let accountStatusCounts = {
      reconciled: 0,
      needsReview: 0,
      outOfDate: 0
    };
    
    // Process accounts
    accounts.forEach(account => {
      const accountValue = parseFloat(account.total_value) || 0;
      totalNestEggValue += accountValue;
      
      // Check reconciliation status
      if (account.is_reconciled) {
        reconciledAccounts++;
        totalReconciledValue += accountValue;
      }
      
      // Count by status
      if (account.reconciliation_status === 'Reconciled') {
        accountStatusCounts.reconciled++;
      } else if (account.reconciliation_status === 'Needs Review') {
        accountStatusCounts.needsReview++;
      } else {
        accountStatusCounts.outOfDate++;
      }
      
      // Check reconciliation age
      const days = account.days_since_reconciliation || 0;
      if (days <= 30) {
        accountsReconciledLast30Days++;
      }
      if (days <= 90) {
        accountsReconciledLast90Days++;
      }
      if (days > 30 || !account.last_reconciled_date) {
        accountsRequiringReconciliation++;
      }
      
      // Count positions
      totalPositions += parseInt(account.total_positions) || 0;
      
      // For simplicity, we're making a rough estimate of reconciled positions
      // Ideally this would come from the position data
      if (account.is_reconciled) {
        reconciledPositions += parseInt(account.total_positions) || 0;
      }
    });
    
    return {
      totalAccounts,
      totalPositions,
      reconciledAccounts,
      reconciledPositions,
      totalNestEggValue,
      totalReconciledValue,
      accountsReconciledLast30Days,
      accountsReconciledLast90Days,
      accountsRequiringReconciliation,
      accountStatusCounts,
      reconciledAccountPercentage: totalAccounts ? (reconciledAccounts / totalAccounts) * 100 : 0,
      reconciledPositionPercentage: totalPositions ? (reconciledPositions / totalPositions) * 100 : 0,
      reconciledValuePercentage: totalNestEggValue ? (totalReconciledValue / totalNestEggValue) * 100 : 0
    };
  };

  const dashboardMetrics = calculateDashboardMetrics();

  // Handle sorting for positions table
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted positions based on current sort configuration
const getSortedPositions = (accountId) => {
  const positionsList = positions[accountId] || [];
  if (!positionsList.length) return positionsList;

  const sortablePositions = [...positionsList];
  if (sortConfig.key) {
    sortablePositions.sort((a, b) => {
      // Handle different data types
      let valueA, valueB;
      
      // Special handling for nested properties or calculated values
      switch(sortConfig.key) {
        case 'current_value':
          valueA = parseFloat(a.current_value) || 0;
          valueB = parseFloat(b.current_value) || 0;
          break;
        case 'quantity':
          valueA = parseFloat(a.quantity) || 0;
          valueB = parseFloat(b.quantity) || 0;
          break;
        case 'identifier':
          valueA = a.identifier || '';
          valueB = b.identifier || '';
          break;
        case 'name':
          valueA = a.name || '';
          valueB = b.name || '';
          break;
        case 'reconciliation_status':
          valueA = a.reconciliation_status || '';
          valueB = b.reconciliation_status || '';
          break;
        default:
          valueA = a[sortConfig.key] || '';
          valueB = b[sortConfig.key] || '';
      }
      
      // String comparison for strings
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      // Debug sorting
      console.log(`Sorting by ${sortConfig.key}: ${valueA} vs ${valueB}`);
      
      if (valueA < valueB) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }
  return sortablePositions;
};

const getSortedAccounts = () => {
  if (!accounts.length) return accounts;

  const sortableAccounts = [...accounts];
  
  if (accountSortConfig.key) {
    sortableAccounts.sort((a, b) => {
      // Handle different data types
      let valueA, valueB;
      
      // Special handling for nested properties or calculated values
      switch(accountSortConfig.key) {
        case 'total_value':
          valueA = parseFloat(a.total_value) || 0;
          valueB = parseFloat(b.total_value) || 0;
          break;
        case 'institution':
          valueA = a.institution || '';
          valueB = b.institution || '';
          break;
        case 'type':
          valueA = a.type || '';
          valueB = b.type || '';
          break;
        case 'reconciliation_status':
          valueA = a.reconciliation_status || '';
          valueB = b.reconciliation_status || '';
          break;
        case 'last_reconciled_date':
          valueA = a.last_reconciled_date ? new Date(a.last_reconciled_date).getTime() : 0;
          valueB = b.last_reconciled_date ? new Date(b.last_reconciled_date).getTime() : 0;
          break;
        default:
          valueA = a[accountSortConfig.key] || '';
          valueB = b[accountSortConfig.key] || '';
      }
      
      // String comparison for strings
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) {
        return accountSortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (valueA > valueB) {
        return accountSortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }
  
  return sortableAccounts;
};

const AccountSortDropdown = () => {
  const sortOptions = [
    { label: 'Account Name (A-Z)', value: { key: 'account_name', direction: 'ascending' } },
    { label: 'Account Name (Z-A)', value: { key: 'account_name', direction: 'descending' } },
    { label: 'Institution (A-Z)', value: { key: 'institution', direction: 'ascending' } },
    { label: 'Account Type', value: { key: 'type', direction: 'ascending' } },
    { label: 'Value (High to Low)', value: { key: 'total_value', direction: 'descending' } },
    { label: 'Value (Low to High)', value: { key: 'total_value', direction: 'ascending' } },
    { label: 'Reconciliation Status', value: { key: 'reconciliation_status', direction: 'ascending' } },
    { label: 'Recent Reconciliation', value: { key: 'last_reconciled_date', direction: 'descending' } },
    { label: 'Oldest Reconciliation', value: { key: 'last_reconciled_date', direction: 'ascending' } },
  ];

  return (
    <div className="relative inline-block text-left">
      <div>
        <label htmlFor="account-sort" className="sr-only">Sort Accounts</label>
        <select
          id="account-sort"
          className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          value={`${accountSortConfig.key}_${accountSortConfig.direction}`}
          onChange={(e) => {
            const selectedOption = sortOptions.find(option => 
              `${option.value.key}_${option.value.direction}` === e.target.value
            );
            if (selectedOption) {
              setAccountSortConfig(selectedOption.value);
            }
          }}
        >
          {sortOptions.map(option => (
            <option 
              key={`${option.value.key}_${option.value.direction}`}
              value={`${option.value.key}_${option.value.direction}`}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

  // Render the reconciliation dashboard
  const renderDashboard = () => {
    const metrics = dashboardMetrics;
    
    // Calculate percentage-based widths for progress bars
    const reconciledAccountsWidth = `${metrics.reconciledAccountPercentage}%`;
    const reconciledPositionsWidth = `${metrics.reconciledPositionPercentage}%`;
    const reconciledValueWidth = `${metrics.reconciledValuePercentage}%`;
    
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900">Reconciliation Dashboard</h2>
          </div>
        </div>
        
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Summary Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Portfolio Summary</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">Total NestEgg Value</span>
                    <span className="text-xs font-medium">{formatCurrency(metrics.totalNestEggValue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">Reconciled Value</span>
                    <span className="text-xs font-medium">{formatCurrency(metrics.totalReconciledValue)} ({metrics.reconciledValuePercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: reconciledValueWidth }}></div>
                  </div>
                </div>
                
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{metrics.totalAccounts}</div>
                    <div className="text-xs text-gray-500">Total Accounts</div>
                  </div>
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <div className="text-sm font-medium text-gray-900">{metrics.totalPositions}</div>
                    <div className="text-xs text-gray-500">Total Positions</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reconciliation Progress */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Reconciliation Progress</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">Accounts Reconciled</span>
                    <span className="text-xs font-medium">{metrics.reconciledAccounts} of {metrics.totalAccounts} ({metrics.reconciledAccountPercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: reconciledAccountsWidth }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">Positions Reconciled</span>
                    <span className="text-xs font-medium">{metrics.reconciledPositions} of {metrics.totalPositions} ({metrics.reconciledPositionPercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: reconciledPositionsWidth }}></div>
                  </div>
                </div>
                
                <div className="bg-white rounded p-3 border border-gray-200">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-900">{metrics.accountStatusCounts.reconciled}</div>
                      <div className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full mx-auto w-min whitespace-nowrap">Reconciled</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-900">{metrics.accountStatusCounts.needsReview}</div>
                      <div className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full mx-auto w-min whitespace-nowrap">Needs Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-900">{metrics.accountStatusCounts.outOfDate}</div>
                      <div className="text-xs px-1.5 py-0.5 bg-red-100 text-red-800 rounded-full mx-auto w-min whitespace-nowrap">Out of Date</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reconciliation Timeline */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Reconciliation Timeline</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2 text-sm text-gray-900">Last 30 Days</span>
                  </div>
                  <span className="text-sm font-medium">{metrics.accountsReconciledLast30Days} Accounts</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2 text-sm text-gray-900">Last 90 Days</span>
                  </div>
                  <span className="text-sm font-medium">{metrics.accountsReconciledLast90Days} Accounts</span>
                </div>
                
                <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="mr-2">
                        <StatusIcon status="Needs Review" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Reconciliation Due</h4>
                        <p className="text-xs text-gray-500">Accounts not reconciled in 30+ days</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-yellow-600">
                    {metrics.accountsRequiringReconciliation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Head>
        <title>Account Reconciliation | NestEgg</title>
      </Head>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Account Reconciliation
        </h1>
        
        <div className="flex space-x-4">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => setShowTips(!showTips)}
          >
            <Info className="mr-2 -ml-1 h-5 w-5" />
            {showTips ? 'Hide Tips' : 'Show Tips'}
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={handleReconcileAllUnreconciled}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Reconcile All Positions
          </button>
        </div>
      </div>

      {showTips && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-800">
                Reconciliation Tips
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p className="mb-3">
                  Regular reconciliation ensures your NestEgg data accurately reflects your actual financial accounts.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium mb-1">When to Reconcile</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>After any transactions occur</li>
                      <li>At month-end</li>
                      <li>After major purchases or sales</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Reconciliation Process</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Enter your actual account balance</li>
                      <li>Verify each position is correct</li>
                      <li>Mark all positions as reconciled</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Data Integrity</h4>
                    <p>
                      Reconciled accounts display a reliability indicator in reports and dashboards to show data confidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Dashboard */}
      {renderDashboard()}

      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-gray-600 text-sm font-medium uppercase tracking-wider">
          Your Accounts
        </h2>
        
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500 mr-2">Sort:</div>
          <AccountSortDropdown />
        </div>
        
        <div className="border-t border-gray-200 mt-1"></div>
      </div>


      <div className="space-y-4">
        {getSortedAccounts().map((account) => {
          // Determine border color based on status
          let borderColor = "border-green-500";
          if (account.reconciliation_status === "Needs Review") {
            borderColor = "border-yellow-500";
          } else if (account.reconciliation_status === "Not Reconciled" || !account.reconciliation_status) {
            borderColor = "border-red-500";
          }
          
          // Determine if account is expanded
          const isExpanded = expandedAccount === account.id;
          
          // Calculate account differences
          const { difference: accountDifference, percentDifference: accountPercentDifference } = 
            calculateAccountDifference(account);
          
          // Get variance level based on percentage difference
          const varianceLevel = getVarianceLevel(accountPercentDifference);
          
          return (
            <div 
              key={account.id} 
              className={`bg-white shadow-sm rounded-lg border-l-4 ${borderColor} overflow-hidden transition-shadow hover:shadow-md`}
            >
              <div className="px-6 py-4">
                <div className="grid md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-3">
                    <div className="flex items-center">
                      <StatusIcon status={account.reconciliation_status || "Not Reconciled"} />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {account.account_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {account.institution} • {account.type}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">
                      NestEgg Value
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(parseFloat(account.total_value) || 0)}
                    </p>
                  </div>
                  
                  <div className="md:col-span-3">
                    <div className="flex flex-col">
                      <label htmlFor={`account-balance-${account.id}`} className="text-sm text-gray-500 mb-1">
                        Statement Balance
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          id={`account-balance-${account.id}`}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md bg-blue-50"
                          value={formattedInputs[`account_${account.id}`] || ''}
                          onChange={(e) => handleAccountInputChange(account.id, e.target.value)}
                        />
                      </div>
                      
                      {/* Difference display with conditional formatting */}
                      {accountDifference !== 0 && (
                        <div className="flex mt-1">
                          <span className={`text-xs ${varianceLevel.color}`}>
                            {formatCurrency(accountDifference)} ({formatPercentage(accountPercentDifference)})
                          </span>
                          <span className="ml-1 text-xs text-gray-500">
                            • {varianceLevel.message}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                        <Clock className="mr-1 h-4 w-4 text-gray-600" />
                        Last: {formatDate(account.last_reconciled_date)}
                      </span>
                      
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${account.reconciliation_status === 'Reconciled' ? 'bg-green-100 text-green-800' : 
                            account.reconciliation_status === 'Needs Review' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}
                        title={account.days_since_reconciliation ? `Last reconciled ${account.days_since_reconciliation} days ago` : 'Not yet reconciled'}
                      >
                        <StatusIcon status={account.reconciliation_status || "Not Reconciled"} className="h-4 w-4 mr-1" />
                        <span className="ml-1">{account.reconciliation_status || "Not Reconciled"}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => handleAccountExpand(account.id)}
                    >
                      {isExpanded ? 'Hide' : 'View'} Positions
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => handleOpenReconcileDialog(account)}
                      title="Reconcile account balance and update all positions"
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Reconcile
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-6">
                    <div className="border-t border-gray-200 pt-4 mb-3">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          Positions
                        </h4>
                        
                        <div className="flex space-x-2">
                          <AddPositionButton 
                            accountId={account.id}
                            onPositionAdded={() => fetchPositions(account.id)} // Refresh positions when added
                            buttonContent={
                              <div className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 -ml-0.5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Add Position
                              </div>
                            }
                          />
                          
                          <button
                            type="button"
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            onClick={() => handleReconcileAllPositions(account.id)}
                            disabled={account.reconciliation_status === 'Reconciled'}
                          >
                            <CheckCircle className="mr-1.5 -ml-0.5 h-4 w-4" />
                            Mark All Positions as Reconciled
                          </button>
                        </div>
                      </div>
                      
                      {loadingPositions[account.id] ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      ) : (
                        <div className="relative overflow-x-auto border border-gray-200 rounded-md shadow-sm">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th 
                                  scope="col" 
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('name')}
                                >
                                  <div className="flex items-center">
                                    Position
                                    <ArrowUpDown className="ml-1 h-4 w-4" />
                                  </div>
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('identifier')}
                                >
                                  <div className="flex items-center">
                                    Ticker
                                    <ArrowUpDown className="ml-1 h-4 w-4" />
                                  </div>
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('quantity')}
                                >
                                  <div className="flex items-center justify-end">
                                    NestEgg Qty
                                    <ArrowUpDown className="ml-1 h-4 w-4" />
                                  </div>
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Statement Qty
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Qty Diff
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('current_value')}
                                >
                                  <div className="flex items-center justify-end">
                                    NestEgg Value
                                    <ArrowUpDown className="ml-1 h-4 w-4" />
                                  </div>
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Statement Value
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Value Diff
                                </th>
                                <th 
                                  scope="col" 
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                  onClick={() => requestSort('reconciliation_status')}
                                >
                                  <div className="flex items-center">
                                    Status
                                    <ArrowUpDown className="ml-1 h-4 w-4" />
                                  </div>
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {getSortedPositions(account.id).map((position) => {
                                // Get position status - either from the position or default to account status
                                const positionStatus = position.reconciliation_status || account.reconciliation_status || "Not Reconciled";
                                
                                // Calculate position differences
                                const { 
                                  shareDiff, 
                                  valueDiff, 
                                  valuePercentDiff 
                                } = calculatePositionDifference(position);
                                
                                // Get variance level based on percentage difference for shares and value
                                const shareVarianceLevel = getVarianceLevel(shareDiff / (parseFloat(position.quantity) || 1) * 100);
                                const valueVarianceLevel = getVarianceLevel(valuePercentDiff);
                                
                                return (
                                  <tr 
                                    key={position.id}
                                    className={positionStatus === 'Reconciled' || positionStatus === 'reconciled' ? 'bg-green-50' : ''}
                                  >
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {position.name}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {position.identifier}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                      {formatNumber(parseFloat(position.quantity) || 0)}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right">
                                      <input
                                        type="text"
                                        className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 block w-full px-2 py-1 sm:text-sm rounded-md text-right bg-blue-50"
                                        value={formattedInputs[`position_shares_${position.id}`] || ''}
                                        onChange={(e) => handlePositionInputChange(position.id, 'shares', e.target.value)}
                                      />
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                      {shareDiff !== 0 && (
                                        <span className={shareVarianceLevel.color} title={shareVarianceLevel.message}>
                                          {formatNumber(shareDiff)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                                      {formatCurrency(parseFloat(position.current_value) || 0)}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right">
                                      <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                          <span className="text-gray-500 sm:text-xs">$</span>
                                        </div>
                                        <input
                                          type="text"
                                          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 block w-full pl-6 py-1 sm:text-sm rounded-md text-right bg-blue-50"
                                          value={formattedInputs[`position_value_${position.id}`] || ''}
                                          onChange={(e) => handlePositionInputChange(position.id, 'value', e.target.value)}
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                      {valueDiff !== 0 && (
                                        <div>
                                          <span className={valueVarianceLevel.color} title={valueVarianceLevel.message}>
                                            {formatCurrency(valueDiff)} 
                                          </span>
                                          <div className="text-xs text-gray-500">
                                            {valuePercentDiff.toFixed(2)}%
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <div className="flex flex-col space-y-1">
                                        <span 
                                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${positionStatus === 'Reconciled' || positionStatus === 'reconciled' ? 'bg-green-100 text-green-800' : 
                                              positionStatus === 'Needs Review' || positionStatus === 'needsReview' ? 'bg-yellow-100 text-yellow-800' : 
                                              'bg-red-100 text-red-800'}`}
                                        >
                                          <StatusIcon status={positionStatus} />
                                          <span className="ml-1">{positionStatus}</span>
                                        </span>
                                        
                                        {/* Additional indicators for partial reconciliation */}
                                        {position.is_quantity_reconciled === true && position.is_value_reconciled !== true && (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Qty Only
                                          </span>
                                        )}
                                        {position.is_quantity_reconciled !== true && position.is_value_reconciled === true && (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            Value Only
                                          </span>
                                        )}
                                      </div>
                                    </td>
<td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                      <div className="flex justify-end space-x-2">
                                        {/* Edit Position Button */}
                                        <EditPositionButton
                                          position={position}
                                          accountId={account.id}
                                          accountName={account.account_name}
                                          assetType={position.asset_type} // Add this line to explicitly pass the asset type
                                          onPositionEdited={() => fetchPositions(account.id)}
                                        />
                                        
                                        {/* Reconcile Dropdown */}
                                        <div className="relative inline-block text-left" ref={dropdownRef}>
                                          <button
                                            type="button"
                                            className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveReconcileDropdown(
                                                activeReconcileDropdown === position.id ? null : position.id
                                              );
                                            }}
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            <span className="sr-only md:not-sr-only">Reconcile</span>
                                            <ArrowUpDown className="h-4 w-4 ml-1" />
                                          </button>
                                          
                                          {activeReconcileDropdown === position.id && (
                                            <div 
                                              className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                                              style={{ position: 'absolute', top: '100%', right: 0 }}
                                            >
                                              <div className="py-1" role="menu" aria-orientation="vertical">
                                                <button
                                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                  onClick={() => handleReconcilePosition(account.id, position, true, true)}
                                                >
                                                  Reconcile Both
                                                </button>
                                                <button
                                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                  onClick={() => handleReconcilePosition(account.id, position, true, false)}
                                                >
                                                  Reconcile Quantity Only
                                                </button>
                                                <button
                                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                  onClick={() => handleReconcilePosition(account.id, position, false, true)}
                                                >
                                                  Reconcile Value Only
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Delete Position Button */}
                                        <DeletePositionButton
                                          position={position}
                                          accountId={account.id}
                                          assetType={position.asset_type || "security"} // Add this line to pass the asset type
                                          onPositionDeleted={() => fetchPositions(account.id)}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              
                              {(!positions[account.id] || positions[account.id].length === 0) && (
                                <tr>
                                  <td colSpan="10" className="px-4 py-4 text-center text-sm text-gray-500">
                                    No positions found for this account.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {accounts.length === 0 && !loading && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No accounts found. Add accounts to start tracking your investments.</p>
          </div>
        )}
      </div>

      {/* Account Reconciliation Dialog */}
      {reconcileDialogOpen && selectedAccount && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleCloseReconcileDialog}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Reconcile {selectedAccount.account_name}
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-6">
                        Enter the current balance from your {selectedAccount.institution} statement to reconcile your account.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Value in NestEgg
                          </label>
                          <p className="text-xl font-semibold text-gray-900">
                            {formatCurrency(parseFloat(selectedAccount.total_value) || 0)}
                          </p>
                        </div>
                        
                        <div>
                          <label htmlFor="actual-balance" className="block text-sm font-medium text-gray-700 mb-1">
                            Actual Value from Statement
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                              type="text"
                              name="actual-balance"
                              id="actual-balance"
                              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md bg-blue-50"
                              value={enteredBalance}
                              onChange={handleBalanceChange}
                              placeholder="0.00"
                              autoFocus
                            />
                          </div>
                        </div>
                      </div>
                      
                      {selectedAccount && enteredBalance && (
                        <div className="mt-6 bg-blue-50 p-4 rounded-md">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">
                            Reconciliation Preview
                          </h4>
                          
                          {(() => {
                            try {
                              const parsedBalance = parseFloat(enteredBalance);
                              const accountValue = parseFloat(selectedAccount.total_value) || 0;
                              const difference = parsedBalance - accountValue;
                              const percentDifference = accountValue ? (Math.abs(difference) / accountValue) * 100 : 0;
                              
                              // Get variance level based on percentage difference
                              const varLevel = getVarianceLevel(percentDifference);
                              const isWithinTolerance = percentDifference <= 0.1;
                              
                              return (
                                <>
                                  <div className="grid grid-cols-3 gap-4 mt-2">
                                    <div>
                                      <p className="text-xs text-gray-500">
                                        Difference
                                      </p>
                                      <p className={`text-sm font-medium ${varLevel.color}`}>
                                        {formatCurrency(difference)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">
                                        % Difference
                                      </p>
                                      <p className={`text-sm font-medium ${varLevel.color}`}>
                                        {percentDifference.toFixed(2)}%
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">
                                        Status
                                      </p>
                                      <p className={`text-sm font-medium ${varLevel.color}`}>
                                        {isWithinTolerance ? 'Will reconcile' : 'Review needed'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-3 px-3 py-2 rounded-md bg-white border border-gray-200">
                                    <div className="flex items-center">
                                      <div className={`w-2 h-2 rounded-full ${varLevel.bgColor} mr-2`}></div>
                                      <p className="text-xs text-gray-600">
                                        {varLevel.message} {!isWithinTolerance && '• Position-level review may be needed'}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              );
                            } catch (e) {
                              return (
                                <p className="text-sm text-red-600">
                                  Please enter a valid number
                                </p>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleReconcileAccount}
                  disabled={!enteredBalance || isNaN(parseFloat(enteredBalance))}
                >
                  Update & Reconcile
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCloseReconcileDialog}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountReconciliation;