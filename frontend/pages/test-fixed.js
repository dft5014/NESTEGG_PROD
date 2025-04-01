// pages/test-fixed.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import AccountModal from '@/components/modals/AccountModal';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal'; 
import MetalPositionModal from '@/components/modals/MetalPositionModal'; 
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal'; 
import AddPositionButton from '@/components/AddPositionButton';
import { fetchAccounts, deleteAccount } from '@/utils/apimethods/accountMethods';
import { fetchPositionsByType, fetchAllPositionTypes } from '@/utils/apimethods/positionMethods';
import { AccountsTableSkeleton } from '@/components/skeletons/PortfolioSkeleton';
import { SecurityTableSkeleton, CryptoTableSkeleton, MetalTableSkeleton, RealEstateTableSkeleton } from '@/components/skeletons/PositionTableSkeletons';

export default function TestFixedPage() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  
  // Account state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Position states
  const [securityPositions, setSecurityPositions] = useState([]);
  const [cryptoPositions, setCryptoPositions] = useState([]);
  const [metalPositions, setMetalPositions] = useState([]); // Fixed: Changed setCryptoPositions to setMetalPositions
  const [realEstatePositions, setRealEstatePositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState({
    securities: false,
    crypto: false,
    metals: false,
    realestate: false
  });

  // Position modal states (for editing)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
  const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState(false);
  
  // Selected states for position management
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedPositionType, setSelectedPositionType] = useState(null);
  const [positionToEdit, setPositionToEdit] = useState(null);

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Load accounts and positions on mount
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  // Load accounts
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    setError(null);
    
    try {
      console.log("Fetching accounts...");
      const accountsData = await fetchAccounts();
      console.log("Accounts fetched:", accountsData);
      setAccounts(accountsData);
      
      // Load positions after accounts are loaded
      if (accountsData.length > 0) {
        loadPositions(accountsData);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError("Failed to load accounts: " + error.message);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Load positions for all accounts
  const loadPositions = async (accountsList) => {
    const accountsToUse = accountsList || accounts;
    if (accountsToUse.length === 0) return;
    
    // Set all position types to loading
    setLoadingPositions({
      securities: true,
      crypto: true,
      metals: true,
      realestate: true
    });
    
    try {
      console.log("Loading all positions for accounts:", accountsToUse.map(a => a.id));
      
      // Load positions for each account in parallel
      const allSecurities = [];
      const allCrypto = [];
      const allMetals = [];
      const allRealEstate = [];
      
      // Process each account
      for (const account of accountsToUse) {
        try {
          // Load all position types for this account
          console.log(`Loading positions for account ${account.id} (${account.account_name})`);
          
          const positionTypes = await fetchAllPositionTypes(account.id);
          
          // Process securities
          if (positionTypes.securities && positionTypes.securities.length > 0) {
            const enrichedSecurities = positionTypes.securities.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            allSecurities.push(...enrichedSecurities);
          }
          
          // Process crypto
          if (positionTypes.crypto && positionTypes.crypto.length > 0) {
            const enrichedCrypto = positionTypes.crypto.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            allCrypto.push(...enrichedCrypto);
          }
          
          // Process metals
          if (positionTypes.metals && positionTypes.metals.length > 0) {
            const enrichedMetals = positionTypes.metals.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            allMetals.push(...enrichedMetals);
          }
          
          // Process real estate
          if (positionTypes.realEstate && positionTypes.realEstate.length > 0) {
            const enrichedRealEstate = positionTypes.realEstate.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            allRealEstate.push(...enrichedRealEstate);
          }
          
        } catch (error) {
          console.error(`Error loading positions for account ${account.id}:`, error);
        }
      }
      
      // Update state with all loaded positions
      setSecurityPositions(allSecurities);
      setCryptoPositions(allCrypto);
      setMetalPositions(allMetals);
      setRealEstatePositions(allRealEstate);
      
      console.log(`Loaded ${allSecurities.length} securities, ${allCrypto.length} crypto, ${allMetals.length} metals, ${allRealEstate.length} real estate positions`);
      
    } catch (error) {
      console.error("Error loading positions:", error);
      setError("Failed to load positions: " + error.message);
    } finally {
      // Clear all loading states
      setLoadingPositions({
        securities: false,
        crypto: false,
        metals: false,
        realestate: false
      });
    }
  };

  // Load positions by type (for individual refresh)
  const loadPositionsByType = async (type, accountsList) => {
    const accountsToUse = accountsList || accounts;
    if (accountsToUse.length === 0) return;
    
    // Set loading state for this position type
    setLoadingPositions(prev => ({ ...prev, [getPositionStateKey(type)]: true }));
    
    try {
      let allPositions = [];
      
      // Load positions for each account
      for (const account of accountsToUse) {
        try {
          console.log(`Fetching ${type} positions for account ${account.id}...`);
          const positions = await fetchPositionsByType(account.id, type);
          console.log(`Received positions:`, positions);
          
          if (positions && Array.isArray(positions)) {
            // Enrich with account info
            const enrichedPositions = positions.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            
            allPositions = [...allPositions, ...enrichedPositions];
          }
        } catch (error) {
          console.error(`Error fetching ${type} for account ${account.id}:`, error);
        }
      }
      
      console.log(`Successfully loaded ${allPositions.length} ${type} positions`);
      
      // Update appropriate state based on type
      switch(type) {
        case 'security':
          setSecurityPositions(allPositions);
          break;
        case 'crypto':
          setCryptoPositions(allPositions);
          break;
        case 'metal':
          setMetalPositions(allPositions);
          break;
        case 'realestate':
          setRealEstatePositions(allPositions);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${type} positions:`, error);
    } finally {
      // Clear loading state for this position type
      setLoadingPositions(prev => ({ ...prev, [getPositionStateKey(type)]: false }));
    }
  };

  // Helper to get state key for position type
  const getPositionStateKey = (type) => {
    switch(type) {
      case 'security': return 'securities';
      case 'crypto': return 'crypto';
      case 'metal': return 'metals';
      case 'realestate': return 'realestate';
      default: return type;
    }
  };

  // Handle account saved (added or updated)
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

  // Open modal for adding a new account
  const handleAddAccount = () => {
    setAccountToEdit(null); // Ensure we're in "add" mode
    setIsAccountModalOpen(true);
  };

  // Open modal for editing an existing account
  const handleEditAccount = (account) => {
    setAccountToEdit(account);
    setIsAccountModalOpen(true);
  };

  // Handle account deletion
  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }
    
    try {
      await deleteAccount(accountId);
      loadAccounts(); // Refresh accounts list and positions
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

  // Handle adding a specific position type
  const handleAddSpecificPosition = (type) => {
    setSelectedPositionType(type); // Set the position type for refreshing
    // Note: The actual modal opening is handled by AddPositionButton
  };

  // Handle edit position
  const handleEditPosition = (position, type) => {
    // Find the account this position belongs to
    const account = accounts.find(acc => acc.id === position.account_id);
    
    if (account) {
      setSelectedAccount(account);
      setSelectedPositionType(type);
      setPositionToEdit(position);
      openPositionModal(type);
    }
  };

  // Open the appropriate position modal for editing
  const openPositionModal = (type) => {
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

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">NestEgg Portfolio Management</h1>
      
      {/* Success Message */}
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
        
        <AddPositionButton 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center"
          onPositionAdded={() => {
            if (selectedPositionType) {
              loadPositionsByType(selectedPositionType); // Refresh only the specific position type
            }
          }}
        />
      </div>

      {/* Accounts Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
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
      </div>
      
      {/* Securities Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Securities</h2>
          <button
            onClick={() => handleAddSpecificPosition('security')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <span className="mr-1">+</span> Add Security
          </button>
        </div>
        
        {loadingPositions.securities ? (
          <SecurityTableSkeleton />
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
              onClick={() => handleAddSpecificPosition('security')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Add Your First Security
            </button>
          </div>
        )}
      </div>
      
      {/* Cryptocurrency Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Cryptocurrencies</h2>
          <button
            onClick={() => handleAddSpecificPosition('crypto')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <span className="mr-1">+</span> Add Cryptocurrency
          </button>
        </div>
        
        {loadingPositions.crypto ? (
          <CryptoTableSkeleton />
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
              onClick={() => handleAddSpecificPosition('crypto')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Add Your First Cryptocurrency
            </button>
          </div>
        )}
      </div>
      
      {/* Precious Metals Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Precious Metals</h2>
          <button
            onClick={() => handleAddSpecificPosition('metal')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <span className="mr-1">+</span> Add Precious Metal
          </button>
        </div>
        
        {loadingPositions.metals ? (
          <MetalTableSkeleton />
        ) : metalPositions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
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
              onClick={() => handleAddSpecificPosition('metal')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Add Your First Precious Metal
            </button>
          </div>
        )}
      </div>
      
      {/* Real Estate Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your Real Estate</h2>
          <button
            onClick={() => handleAddSpecificPosition('realestate')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
          >
            <span className="mr-1">+</span> Add Real Estate
          </button>
        </div>
        
        {loadingPositions.realestate ? (
          <RealEstateTableSkeleton />
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
              onClick={() => handleAddSpecificPosition('realestate')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Add Your First Property
            </button>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountAdded={handleAccountSaved}
        editAccount={accountToEdit}
      />
      
      {/* Modals for editing positions */}
      <SecurityPositionModal 
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={() => {
          loadPositionsByType('security');
          setIsSecurityModalOpen(false);
          setPositionToEdit(null);
        }}
        positionToEdit={selectedPositionType === 'security' ? positionToEdit : null}
      />
      
      <CryptoPositionModal 
        isOpen={isCryptoModalOpen}
        onClose={() => setIsCryptoModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={() => {
          loadPositionsByType('crypto');
          setIsCryptoModalOpen(false);
          setPositionToEdit(null);
        }}
        positionToEdit={selectedPositionType === 'crypto' ? positionToEdit : null}
      />
      
      <MetalPositionModal 
        isOpen={isMetalModalOpen}
        onClose={() => setIsMetalModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={() => {
          loadPositionsByType('metal');
          setIsMetalModalOpen(false);
          setPositionToEdit(null);
        }}
        positionToEdit={selectedPositionType === 'metal' ? positionToEdit : null}
      />
      
      <RealEstatePositionModal 
        isOpen={isRealEstateModalOpen}
        onClose={() => setIsRealEstateModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={() => {
          loadPositionsByType('realestate');
          setIsRealEstateModalOpen(false);
          setPositionToEdit(null);
        }}
        positionToEdit={selectedPositionType === 'realestate' ? positionToEdit : null}
      />
    </div>
  );
}