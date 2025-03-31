// pages/test-combined.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from '@/utils/apimethods/accountMethods';
import { fetchPositions } from '@/utils/apimethods/positionMethods';
import { SecurityTableSkeleton, CryptoTableSkeleton, MetalTableSkeleton, RealEstateTableSkeleton } from '@/components/skeletons/PositionTableSkeletons';
import { AccountsTableSkeleton } from '@/components/skeletons/PortfolioSkeleton';

// Import modal components
import AccountModal from '@/components/modals/AccountModal';
import PositionTypeModal from '@/components/modals/PositionTypeModal';
import AccountSelectModal from '@/components/modals/AccountSelectModal';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal';

export default function TestCombinedPage() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  
  // Account state
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  
  // Position states
  const [positions, setPositions] = useState({});
  const [securityPositions, setSecurityPositions] = useState([]);
  const [cryptoPositions, setCryptoPositions] = useState([]);
  const [metalPositions, setMetalPositions] = useState([]);
  const [realEstatePositions, setRealEstatePositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  
  // Selected states for position management
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedPositionType, setSelectedPositionType] = useState(null);
  
  // Position modal states
  const [isPositionTypeModalOpen, setIsPositionTypeModalOpen] = useState(false);
  const [isAccountSelectModalOpen, setIsAccountSelectModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
  const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState(false);
  
  // Position to edit
  const [positionToEdit, setPositionToEdit] = useState(null);
  
  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(null);
  
  // Tab state (accounts, securities, crypto, metals, realestate)
  const [activeTab, setActiveTab] = useState('accounts');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

    // Prefetch data for other tabs in the background after accounts are loaded
  useEffect(() => {
    if (user && accounts.length > 0 && !loadingPositions) {
      // Determine which tab data to load first based on active tab
      const prefetchOrder = ['securities', 'crypto', 'metals', 'realestate'].filter(t => t !== activeTab);
      
      // Start prefetching the first non-active tab
      if (prefetchOrder.length > 0) {
        const tabToType = {
          'securities': 'security',
          'crypto': 'crypto',
          'metals': 'metal',
          'realestate': 'realestate'
        };
        
        // Check if this tab's data is already loaded
        const isDataLoaded = {
          'securities': securityPositions.length > 0,
          'crypto': cryptoPositions.length > 0,
          'metals': metalPositions.length > 0,
          'realestate': realEstatePositions.length > 0
        };
        
        // Find the first tab that needs data
        const tabToLoad = prefetchOrder.find(tab => !isDataLoaded[tab]);
        
        if (tabToLoad) {
          console.log(`Prefetching data for ${tabToLoad} tab in the background`);
          // Load in the background without setting loading state
          prefetchPositionData(tabToType[tabToLoad]);
        }
      }
    }
  }, [accounts, activeTab, loadingPositions]);

  // Load accounts
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    setError(null);
    
    try {
      console.log("Fetching accounts...");
      const accountsData = await fetchAccounts();
      console.log("Accounts fetched:", accountsData);
      setAccounts(accountsData);
      
      // If we have accounts, load all positions
      if (accountsData.length > 0) {
        await loadAllPositions(accountsData);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError("Failed to load accounts: " + error.message);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Load data based on selected tab
  const loadTabData = (tabName) => {
    setActiveTab(tabName);
    
    // Reset error state when changing tabs
    setError(null);
    
    // Only load data for the selected tab if not already loaded
    switch(tabName) {
      case 'accounts':
        if (!loadingAccounts) {
          loadAccounts();
        }
        break;
      case 'securities':
        if (securityPositions.length === 0 && !loadingPositions) {
          loadPositionsByType('security');
        }
        break;
      case 'crypto':
        if (cryptoPositions.length === 0 && !loadingPositions) {
          loadPositionsByType('crypto');
        }
        break;
      case 'metals':
        if (metalPositions.length === 0 && !loadingPositions) {
          loadPositionsByType('metal');
        }
        break;
      case 'realestate':
        if (realEstatePositions.length === 0 && !loadingPositions) {
          loadPositionsByType('realestate');
        }
        break;
    }
  };

// Silently prefetch position data without showing loading state
  const prefetchPositionData = async (type) => {
    try {
      const { fetchPositionsByType } = require('@/utils/apimethods/positionMethods');
      let positionsWithAccounts = [];
      
      // Load positions for each account
      for (const account of accounts) {
        try {
          const positions = await fetchPositionsByType(account.id, type);
          
          if (positions && Array.isArray(positions)) {
            // Enrich with account info
            const enrichedPositions = positions.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            
            positionsWithAccounts = [...positionsWithAccounts, ...enrichedPositions];
          }
        } catch (error) {
          console.error(`Error prefetching ${type} for account ${account.id}:`, error);
        }
      }
      
      // Update appropriate state based on type
      switch(type) {
        case 'security':
          if (securityPositions.length === 0) {
            setSecurityPositions(positionsWithAccounts);
          }
          break;
        case 'crypto':
          if (cryptoPositions.length === 0) {
            setCryptoPositions(positionsWithAccounts);
          }
          break;
        case 'metal':
          if (metalPositions.length === 0) {
            setMetalPositions(positionsWithAccounts);
          }
          break;
        case 'realestate':
          if (realEstatePositions.length === 0) {
            setRealEstatePositions(positionsWithAccounts);
          }
          break;
      }
      
      console.log(`Successfully prefetched ${positionsWithAccounts.length} ${type} positions`);
    } catch (error) {
      console.error(`Error prefetching ${type} positions:`, error);
      // No UI error for prefetching
    }
  };

  // Load positions for a specific type
  const loadPositionsByType = async (type) => {
    setLoadingPositions(true);
    setLoadingProgress(10);
    setLoadingMessage(`Loading ${type} positions...`);
    setError(null);
    
    try {
      const { fetchPositionsByType } = require('@/utils/apimethods/positionMethods');
      let positionsWithAccounts = [];
      
      setLoadingProgress(30);
      
      // Load positions for each account
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        try {
          const positions = await fetchPositionsByType(account.id, type);
          
          if (positions && Array.isArray(positions)) {
            // Enrich with account info
            const enrichedPositions = positions.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            
            positionsWithAccounts = [...positionsWithAccounts, ...enrichedPositions];
          }
          
          // Update progress
          setLoadingProgress(30 + Math.floor(60 * (i + 1) / accounts.length));
          setLoadingMessage(`Loading ${type} positions from ${account.account_name}...`);
          
        } catch (error) {
          console.error(`Error fetching ${type} for account ${account.id}:`, error);
        }
      }
      
      // Update appropriate state based on type
      setLoadingProgress(95);
      switch(type) {
        case 'security':
          setSecurityPositions(positionsWithAccounts);
          break;
        case 'crypto':
          setCryptoPositions(positionsWithAccounts);
          break;
        case 'metal':
          setMetalPositions(positionsWithAccounts);
          break;
        case 'realestate':
          setRealEstatePositions(positionsWithAccounts);
          break;
      }
      
      setLoadingProgress(100);
      setLoadingMessage('Loading complete!');
      
    } catch (error) {
      console.error(`Error loading ${type} positions:`, error);
      setError(`Failed to load ${type} positions: ${error.message}`);
    } finally {
      setTimeout(() => {
        setLoadingPositions(false);
      }, 500); // Short delay to show 100% completion
    }
  };

// Load initial data for accounts tab only, other data will be loaded on tab selection
  const loadAllPositions = async (accountsList) => {
    setLoadingPositions(true);
    setLoadingProgress(0);
    setLoadingMessage('Preparing to load account data...');
    
    try {
      // We'll only preload the account positions initially
      const allPositions = {};
      setLoadingProgress(50);
      setLoadingMessage('Loading account positions...');
      
      // If we're on the accounts tab, we don't need to load specific position types yet
      if (activeTab === 'accounts') {
        setPositions(allPositions);
        setLoadingProgress(100);
        setLoadingMessage('Account data loaded!');
        return;
      }
      
      // If specific tab is already selected, load that data type
      await loadPositionsByType(activeTab);
      
    } catch (error) {
      console.error('Error loading positions:', error);
      setError('Failed to load positions. Please try again.');
    } finally {
      setLoadingPositions(false);
    }
  };
  // Load accounts and positions on mount
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  // Account management handlers
  const handleAccountSaved = (savedAccount) => {
    console.log('Account saved:', savedAccount);
    loadAccounts(); // Refresh accounts and positions
    
    // Show success message
    const action = accountToEdit ? "updated" : "added";
    setSuccessMessage(`Account ${action} successfully!`);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const handleAddAccount = () => {
    setAccountToEdit(null); // Ensure we're in "add" mode
    setIsAccountModalOpen(true);
  };

  const handleAccountAndTypeSelected = (positionType, accountId) => {
    setSelectedPositionType(positionType);
    setSelectedAccount(accountId);
    
    // Open appropriate modal based on type
    switch (positionType) {
      case 'security':
        setIsSecurityModalOpen(true);
        break;
      case 'crypto':
        setIsCryptoModalOpen(true);
        break;
      case 'metal':
        setIsMetalModalOpen(true);
        break;
      case 'realestate':
        setIsRealEstateModalOpen(true);
        break;
      default:
        console.warn(`Unknown position type: ${positionType}`);
    }
  };

  const handleEditAccount = (account) => {
    setAccountToEdit(account);
    setIsAccountModalOpen(true);
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }
    
    try {
      await deleteAccount(accountId);
      loadAccounts(); // Refresh accounts and positions
      setSuccessMessage("Account deleted successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting account:", error);
      setError("Failed to delete account: " + error.message);
    }
  };

  // Position management handlers
  const handleAddPosition = () => {
    if (accounts.length === 0) {
      setError('Please add an account first before adding positions.');
      return;
    }
    
    // If we only have one account, skip account selection
    if (accounts.length === 1) {
      setSelectedAccount(accounts[0]);
      setIsPositionTypeModalOpen(true);
    } else {
      // Show account selection modal
      setIsAccountSelectModalOpen(true);
    }
  };

  const handleAccountSelected = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    
    if (account) {
      setSelectedAccount(account);
      setIsAccountSelectModalOpen(false);
      setIsPositionTypeModalOpen(true);
    }
  };

  const handlePositionTypeSelected = (type) => {
    setSelectedPositionType(type);
    setIsPositionTypeModalOpen(false);
    
    // Open appropriate modal based on type
    switch (type) {
      case 'security':
        setIsSecurityModalOpen(true);
        break;
      case 'crypto':
        setIsCryptoModalOpen(true);
        break;
      case 'metal':
        setIsMetalModalOpen(true);
        break;
      case 'realestate':
        setIsRealEstateModalOpen(true);
        break;
      default:
        console.warn(`Unknown position type: ${type}`);
    }
  };

  const handlePositionSaved = () => {
    // Refresh positions for all accounts
    loadAccounts();
    
    // Show success message
    setSuccessMessage(`${selectedPositionType} position saved successfully!`);
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
    
    // Reset state
    setSelectedPositionType(null);
    setPositionToEdit(null);
  };

  const handleEditPosition = (position, type) => {
    setPositionToEdit(position);
    setSelectedPositionType(type);
    
    switch (type) {
      case 'security':
        setIsSecurityModalOpen(true);
        break;
      case 'crypto':
        setIsCryptoModalOpen(true);
        break;
      case 'metal':
        setIsMetalModalOpen(true);
        break;
      case 'realestate':
        setIsRealEstateModalOpen(true);
        break;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">NestEgg Comprehensive Test</h1>
      
      {/* Success Message (for both accounts and positions) */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
          <button 
            className="ml-2 underline" 
            onClick={() => {
              setError(null);
              loadAccounts();
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={handleAddAccount}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center"
        >
          <span className="mr-2">+</span> Add Account
        </button>
        
        <button
          onClick={handleAddPosition}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center"
        >
          <span className="mr-2">+</span> Add Position
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${activeTab === 'accounts' 
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => loadTabData('accounts')}
            >
              Accounts
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${activeTab === 'securities' 
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => loadTabData('securities')}
            >
              Securities
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${activeTab === 'crypto' 
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => loadTabData('crypto')}
            >
              Cryptocurrency
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${activeTab === 'metals' 
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
              onClick={() => loadTabData('metals')}
            >
              Precious Metals
            </button>
          </li>
          <li>
              <button
                className={`inline-block p-4 rounded-t-lg ${activeTab === 'realestate' 
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
                onClick={() => loadTabData('realestate')}
              >
                Real Estate
              </button>
          </li>
        </ul>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white shadow-md rounded-lg p-6">
        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <>
            <h2 className="text-xl font-bold mb-4">Your Accounts</h2>
            {loadingAccounts ? (
              <AccountsTableSkeleton />
            ) : accounts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.account_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.institution || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.type || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_category || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.balance.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditAccount(account)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-gray-500 mb-4">No accounts found. Add an account to get started!</p>
                <button
                  onClick={handleAddAccount}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Add Your First Account
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Securities Tab */}
        {activeTab === 'securities' && (
          <>
            <h2 className="text-xl font-bold mb-4">Your Securities</h2>
            {loadingPositions ? (
              <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 text-center mb-4">{loadingMessage}</p>
              
              {/* Specialized skeleton for securities */}
              <SecurityTableSkeleton />
            </div>
            ) : securityPositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {securityPositions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{position.ticker}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.shares.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${position.price.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${(position.shares * position.price).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {position.purchase_date ? new Date(position.purchase_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditPosition(position, 'security')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-gray-500 mb-4">No security positions found.</p>
                <button
                  onClick={() => {
                    setSelectedPositionType('security');
                    handleAddPosition();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Add Your First Security
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Crypto Tab */}
        {activeTab === 'crypto' && (
          <>
            <h2 className="text-xl font-bold mb-4">Your Cryptocurrencies</h2>
            {loadingPositions ? (
              <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 text-center mb-4">{loadingMessage}</p>
              
              {/* Specialized skeleton for crypto */}
              <CryptoTableSkeleton />
            </div>
            ) : cryptoPositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cryptoPositions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {position.coin_symbol}
                          <div className="text-xs text-gray-500">{position.coin_type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${position.current_price.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${(position.quantity * position.current_price).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {position.storage_type}
                          <div className="text-xs text-gray-500">
                            {position.storage_type === 'Exchange' ? position.exchange_name : position.wallet_address}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditPosition(position, 'crypto')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-gray-500 mb-4">No cryptocurrency positions found.</p>
                <button
                  onClick={() => {
                    setSelectedPositionType('crypto');
                    handleAddPosition();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Add Your First Cryptocurrency
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Metals Tab */}
        {activeTab === 'metals' && (
          <>
            <h2 className="text-xl font-bold mb-4">Your Precious Metals</h2>
            {loadingPositions ? (
              <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 text-center mb-4">{loadingMessage}</p>
              
              {/* Specialized skeleton for metals */}
              <MetalTableSkeleton />
            </div>
            ) : metalPositions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metalPositions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{position.metal_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.purity || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${position.purchase_price.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${(position.quantity * position.purchase_price).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.storage_location || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditPosition(position, 'metal')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border border-gray-200 rounded-lg">
                <p className="text-gray-500 mb-4">No precious metal positions found.</p>
                <button
                  onClick={() => {
                    setSelectedPositionType('metal');
                    handleAddPosition();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Add Your First Precious Metal
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Real Estate Tab */}
        {activeTab === 'realestate' && (
          <>
            <h2 className="text-xl font-bold mb-4">Your Real Estate</h2>
            {loadingPositions ? (
              <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 text-center mb-4">{loadingMessage}</p>
              
              {/* Specialized skeleton for real estate */}
              <RealEstateTableSkeleton />
            </div>
              ) : realEstatePositions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {realEstatePositions.map((position) => {
                        const gainLoss = position.estimated_market_value - position.purchase_price;
                        const gainLossPercent = position.purchase_price > 0 
                          ? (gainLoss / position.purchase_price) * 100 
                          : 0;
                        
                        return (
                          <tr key={position.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {position.address}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.property_type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${position.purchase_price.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${position.estimated_market_value.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString()} 
                                ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {position.purchase_date ? new Date(position.purchase_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditPosition(position, 'realestate')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border border-gray-200 rounded-lg">
                  <p className="text-gray-500 mb-4">No real estate positions found.</p>
                  <button
                    onClick={() => {
                      setSelectedPositionType('realestate');
                      handleAddPosition();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Add Your First Property
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* All Modals */}
        {/* Account Modal */}
        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onAccountAdded={handleAccountSaved}
          editAccount={accountToEdit}
        />
        
        {/* Position Modals */}
        <AccountSelectModal 
          isOpen={isAccountSelectModalOpen}
          onClose={() => setIsAccountSelectModalOpen(false)}
          onAccountSelected={handleAccountSelected}
        />
        
        <PositionTypeModal 
        isOpen={isPositionTypeModalOpen}
        onClose={() => setIsPositionTypeModalOpen(false)}
        onTypeSelected={handlePositionTypeSelected}
        onAccountAndTypeSelected={handleAccountAndTypeSelected}
        />
        
        <SecurityPositionModal 
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          accountId={selectedAccount?.id}
          onPositionSaved={handlePositionSaved}
          positionToEdit={selectedPositionType === 'security' ? positionToEdit : null}
        />
        
        <CryptoPositionModal 
          isOpen={isCryptoModalOpen}
          onClose={() => setIsCryptoModalOpen(false)}
          accountId={selectedAccount?.id}
          onPositionSaved={handlePositionSaved}
          positionToEdit={selectedPositionType === 'crypto' ? positionToEdit : null}
        />
        
        <MetalPositionModal 
          isOpen={isMetalModalOpen}
          onClose={() => setIsMetalModalOpen(false)}
          accountId={selectedAccount?.id}
          onPositionSaved={handlePositionSaved}
          positionToEdit={selectedPositionType === 'metal' ? positionToEdit : null}
        />
        
        <RealEstatePositionModal 
          isOpen={isRealEstateModalOpen}
          onClose={() => setIsRealEstateModalOpen(false)}
          accountId={selectedAccount?.id}
          onPositionSaved={handlePositionSaved}
          positionToEdit={selectedPositionType === 'realestate' ? positionToEdit : null}
        />
      </div>
    );
  }