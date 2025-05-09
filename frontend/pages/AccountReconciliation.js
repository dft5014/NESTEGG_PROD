// pages/AccountReconciliation.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Mock data for demonstration purposes - would be fetched from API in production
const MOCK_ACCOUNTS = [
  { 
    id: 1, 
    name: "Vanguard IRA", 
    type: "Retirement", 
    institutionName: "Vanguard",
    lastReconciledDate: "2023-05-01",
    currentValue: 142568.32,
    currentStatus: "needsReview", // 'reconciled', 'needsReview', 'outOfDate'
    positions: [
      { id: 101, name: "VTSAX", shares: 420.32, currentPrice: 123.45, currentValue: 51889.48, lastReconciledDate: "2023-05-01", status: "needsReview" },
      { id: 102, name: "VBTLX", shares: 320.15, currentPrice: 89.32, currentValue: 28595.80, lastReconciledDate: "2023-05-01", status: "needsReview" },
      { id: 103, name: "VTIAX", shares: 510.67, currentPrice: 112.78, currentValue: 57594.40, lastReconciledDate: "2023-05-01", status: "needsReview" },
      { id: 104, name: "Cash", shares: 1, currentPrice: 4488.64, currentValue: 4488.64, lastReconciledDate: "2023-05-01", status: "needsReview" }
    ]
  },
  { 
    id: 2, 
    name: "Fidelity 401(k)", 
    type: "Retirement", 
    institutionName: "Fidelity",
    lastReconciledDate: "2023-05-07", // Just reconciled
    currentValue: 215673.45,
    currentStatus: "reconciled",
    positions: [
      { id: 201, name: "FXAIX", shares: 320.45, currentPrice: 189.32, currentValue: 60669.64, lastReconciledDate: "2023-05-07", status: "reconciled" },
      { id: 202, name: "FSPSX", shares: 410.87, currentPrice: 132.45, currentValue: 54420.73, lastReconciledDate: "2023-05-07", status: "reconciled" },
      { id: 203, name: "FXNAX", shares: 830.55, currentPrice: 112.56, currentValue: 93486.74, lastReconciledDate: "2023-05-07", status: "reconciled" },
      { id: 204, name: "Cash", shares: 1, currentPrice: 7096.34, currentValue: 7096.34, lastReconciledDate: "2023-05-07", status: "reconciled" }
    ]
  },
  { 
    id: 3, 
    name: "Chase Brokerage", 
    type: "Taxable", 
    institutionName: "Chase",
    lastReconciledDate: "2022-09-15", // Over 6 months ago - out of date
    currentValue: 87562.12,
    currentStatus: "outOfDate",
    positions: [
      { id: 301, name: "AAPL", shares: 25, currentPrice: 178.45, currentValue: 4461.25, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 302, name: "MSFT", shares: 15, currentPrice: 332.58, currentValue: 4988.70, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 303, name: "VOO", shares: 120.32, currentPrice: 412.34, currentValue: 49612.96, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 304, name: "AMZN", shares: 18, currentPrice: 124.76, currentValue: 2245.68, lastReconciledDate: "2022-09-15", status: "outOfDate" },
      { id: 305, name: "Cash", shares: 1, currentPrice: 26253.53, currentValue: 26253.53, lastReconciledDate: "2022-09-15", status: "outOfDate" }
    ]
  }
];

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Helper function to format dates
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Helper to determine days since last reconciliation
const daysSinceLastReconciled = (dateString) => {
  const lastDate = new Date(dateString);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper to get status details based on status and date
const getStatusDetails = (status, lastReconciledDate) => {
  const days = daysSinceLastReconciled(lastReconciledDate);
  
  if (status === 'reconciled') {
    return {
      icon: "check-circle",
      label: 'Reconciled',
      description: `Last reconciled ${days} days ago`,
      color: 'green'
    };
  } else if (status === 'needsReview') {
    return {
      icon: "exclamation",
      label: 'Needs Review',
      description: `Last reconciled ${days} days ago`,
      color: 'yellow'
    };
  } else {
    return {
      icon: "exclamation-triangle",
      label: 'Out of Date',
      description: `Last reconciled ${days} days ago`,
      color: 'red'
    };
  }
};

// Component for status icon
const StatusIcon = ({ status }) => {
  if (status === 'reconciled') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  } else if (status === 'needsReview') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  } else {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
};

// Component for help/info icon
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

// Component for clock icon
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

// Component for check icon
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

// Component for help icon
const HelpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);

// Component for down arrow icon
const DownArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const AccountReconciliation = () => {
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [enteredBalance, setEnteredBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showTips, setShowTips] = useState(true);

  // Simulating API fetch
  useEffect(() => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      setLoading(false);
    }, 800);
  }, []);

  const handleAccountExpand = (accountId) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
    }
  };

  const handleOpenReconcileDialog = (account) => {
    setSelectedAccount(account);
    setEnteredBalance(account.currentValue.toString());
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

  const handleReconcileAccount = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedAccounts = accounts.map(account => {
        if (account.id === selectedAccount.id) {
          const parsedBalance = parseFloat(enteredBalance);
          const difference = Math.abs(parsedBalance - account.currentValue);
          const percentDifference = (difference / account.currentValue) * 100;
          
          // If within 0.1% tolerance, consider it reconciled
          const isReconciled = percentDifference <= 0.1;
          
          const newStatus = isReconciled ? 'reconciled' : 'needsReview';
          const today = new Date().toISOString().split('T')[0];
          
          return {
            ...account,
            currentValue: parsedBalance,
            currentStatus: newStatus,
            lastReconciledDate: today,
            positions: isReconciled ? 
              account.positions.map(position => ({
                ...position,
                status: 'reconciled',
                lastReconciledDate: today
              })) :
              account.positions
          };
        }
        return account;
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      setReconcileDialogOpen(false);
      
      // Show success message
      const reconciled = updatedAccounts.find(a => a.id === selectedAccount.id);
      setSuccessMessage(
        reconciled.currentStatus === 'reconciled' 
          ? `${reconciled.name} successfully reconciled! All positions are now up to date.` 
          : `${reconciled.name} balance updated, but there may be discrepancies to review at the position level.`
      );
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 1000);
  };

  const handleReconcileAllPositions = (accountId) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedAccounts = accounts.map(account => {
        if (account.id === accountId) {
          const today = new Date().toISOString().split('T')[0];
          
          return {
            ...account,
            currentStatus: 'reconciled',
            lastReconciledDate: today,
            positions: account.positions.map(position => ({
              ...position,
              status: 'reconciled',
              lastReconciledDate: today
            }))
          };
        }
        return account;
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      
      // Show success message
      const reconciled = updatedAccounts.find(a => a.id === accountId);
      setSuccessMessage(`All positions in ${reconciled.name} have been marked as reconciled.`);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 1000);
  };

  const handleReconcilePosition = (accountId, positionId) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedAccounts = accounts.map(account => {
        if (account.id === accountId) {
          const today = new Date().toISOString().split('T')[0];
          
          const updatedPositions = account.positions.map(position => {
            if (position.id === positionId) {
              return {
                ...position,
                status: 'reconciled',
                lastReconciledDate: today
              };
            }
            return position;
          });
          
          // Check if all positions are now reconciled
          const allReconciled = updatedPositions.every(p => p.status === 'reconciled');
          
          return {
            ...account,
            currentStatus: allReconciled ? 'reconciled' : account.currentStatus,
            lastReconciledDate: allReconciled ? today : account.lastReconciledDate,
            positions: updatedPositions
          };
        }
        return account;
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      
      // Show success message
      const position = updatedAccounts
        .find(a => a.id === accountId)
        .positions
        .find(p => p.id === positionId);
        
      setSuccessMessage(`${position.name} position has been reconciled.`);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 800);
  };

  const handleReconcileAllUnreconciled = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      
      const updatedAccounts = accounts.map(account => {
        return {
          ...account,
          currentStatus: 'reconciled',
          lastReconciledDate: today,
          positions: account.positions.map(position => ({
            ...position,
            status: 'reconciled',
            lastReconciledDate: today
          }))
        };
      });
      
      setAccounts(updatedAccounts);
      setLoading(false);
      setSuccessMessage('All accounts and positions have been marked as reconciled.');
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }, 1500);
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
            <HelpIcon className="mr-2 -ml-1" />
            {showTips ? 'Hide Tips' : 'Show Tips'}
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={handleReconcileAllUnreconciled}
          >
            <span className="mr-2">
              <CheckIcon />
            </span>
            Reconcile All Positions
          </button>
        </div>
      </div>

      {showTips && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-6 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <InfoIcon />
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

      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckIcon />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-gray-600 text-sm font-medium uppercase tracking-wider">
          Your Accounts
        </h2>
        <div className="border-t border-gray-200 mt-1"></div>
      </div>

      <div className="space-y-4">
        {accounts.map((account) => {
          const statusDetails = getStatusDetails(account.currentStatus, account.lastReconciledDate);
          const isExpanded = expandedAccount === account.id;
          
          // Determine border color based on status
          let borderColor = "border-green-500";
          if (account.currentStatus === "needsReview") {
            borderColor = "border-yellow-500";
          } else if (account.currentStatus === "outOfDate") {
            borderColor = "border-red-500";
          }
          
          return (
            <div 
              key={account.id} 
              className={`bg-white shadow-sm rounded-lg border-l-4 ${borderColor} overflow-hidden transition-shadow hover:shadow-md`}
            >
              <div className="px-6 py-4">
                <div className="grid md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-4">
                    <div className="flex items-center">
                      <StatusIcon status={account.currentStatus} />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {account.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {account.institutionName} • {account.type}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-3">
                    <p className="text-sm text-gray-500">
                      Current Value
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(account.currentValue)}
                    </p>
                  </div>
                  
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                        <ClockIcon className="mr-1" />
                        Last: {formatDate(account.lastReconciledDate)}
                      </span>
                      
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${account.currentStatus === 'reconciled' ? 'bg-green-100 text-green-800' : 
                            account.currentStatus === 'needsReview' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}
                        title={statusDetails.description}
                      >
                        <StatusIcon status={account.currentStatus} />
                        <span className="ml-1">{statusDetails.label}</span>
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
                      <DownArrowIcon className="ml-1" />
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => handleOpenReconcileDialog(account)}
                    >
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
                        
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          onClick={() => handleReconcileAllPositions(account.id)}
                          disabled={account.currentStatus === 'reconciled'}
                        >
                          <CheckIcon className="mr-1.5 -ml-0.5" />
                          Mark All Positions as Reconciled
                        </button>
                      </div>
                      
                      <div className="relative overflow-x-auto border border-gray-200 rounded-md shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Position
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Shares
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Price
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Value
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Reconciled
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {account.positions.map((position) => {
                              const posStatusDetails = getStatusDetails(position.status, position.lastReconciledDate);
                              
                              return (
                                <tr 
                                  key={position.id}
                                  className={position.status === 'reconciled' ? 'bg-green-50' : ''}
                                >
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {position.name}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                    {position.shares.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                    {formatCurrency(position.currentPrice)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                                    {formatCurrency(position.currentValue)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(position.lastReconciledDate)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <span 
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                        ${position.status === 'reconciled' ? 'bg-green-100 text-green-800' : 
                                          position.status === 'needsReview' ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-red-100 text-red-800'}`}
                                    >
                                      <StatusIcon status={position.status} />
                                      <span className="ml-1">{posStatusDetails.label}</span>
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                                    <button
                                      type="button"
                                      className="text-blue-600 hover:text-blue-900 font-medium"
                                      onClick={() => handleReconcilePosition(account.id, position.id)}
                                      disabled={position.status === 'reconciled'}
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
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
                      Reconcile {selectedAccount.name}
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-6">
                        Enter the current balance from your {selectedAccount.institutionName} statement to reconcile your account.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Current Value in NestEgg
                          </label>
                          <p className="text-xl font-semibold text-gray-900">
                            {formatCurrency(selectedAccount.currentValue)}
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
                              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
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
                              const difference = parsedBalance - selectedAccount.currentValue;
                              const percentDifference = (Math.abs(difference) / selectedAccount.currentValue) * 100;
                              
                              const isWithinTolerance = percentDifference <= 0.1;
                              
                              return (
                                <>
                                  <div className="grid grid-cols-3 gap-4 mt-2">
                                    <div>
                                      <p className="text-xs text-gray-500">
                                        Difference
                                      </p>
                                      <p className={`text-sm font-medium ${difference === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {formatCurrency(difference)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">
                                        % Difference
                                      </p>
                                      <p className={`text-sm font-medium ${isWithinTolerance ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {percentDifference.toFixed(2)}%
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">
                                        Status
                                      </p>
                                      <p className={`text-sm font-medium ${isWithinTolerance ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {isWithinTolerance ? 'Will reconcile' : 'Review needed'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {!isWithinTolerance && (
                                    <p className="text-xs text-yellow-700 mt-3">
                                      Difference exceeds 0.1% threshold. After updating, you may need to review individual positions.
                                    </p>
                                  )}
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