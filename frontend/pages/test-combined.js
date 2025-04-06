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
import { fetchPositionsByType, fetchAllPositionTypes, fetchAllPositionsWithDetails } from '@/utils/apimethods/positionMethods'; // Ensure fetchAllPositionsWithDetails is imported if needed elsewhere, though SecurityTableTicker uses it internally
import { AccountsTableSkeleton } from '@/components/skeletons/PortfolioSkeleton';
import { SecurityTableSkeleton, CryptoTableSkeleton, MetalTableSkeleton, RealEstateTableSkeleton } from '@/components/skeletons/PositionTableSkeletons';

// Import the new table component
import GroupedTickerTable from '@/components/tables/GroupedTickerTable';
// Import the original security table component (assuming it exists and might be needed)
import SecurityTableAccount from '@/components/tables/SecurityTableAccount'; // Assuming this is the original table

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

  // Position states (for individual tables if kept)
  // Note: SecurityTableTicker fetches its own data, so securityPositions might only be needed for SecurityTableAccount
  const [securityPositions, setSecurityPositions] = useState([]);
  const [cryptoPositions, setCryptoPositions] = useState([]);
  const [metalPositions, setMetalPositions] = useState([]);
  const [realEstatePositions, setRealEstatePositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState({
    securities: false, // May not be needed if only using SecurityTableTicker
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

  // Load accounts and potentially other positions on mount
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

      // Load non-security positions after accounts are loaded
      // SecurityTableTicker handles its own loading.
      // If you keep SecurityTableAccount, you might load its data here too.
      if (accountsData.length > 0) {
        // Load other position types if needed for other tables
        loadPositionsByType('crypto', accountsData);
        loadPositionsByType('metal', accountsData);
        loadPositionsByType('realestate', accountsData);
        // Optionally load for SecurityTableAccount if used:
        // loadPositionsByType('security', accountsData);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError("Failed to load accounts: " + error.message);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Load positions by type (for individual tables, excluding SecurityTableTicker)
  const loadPositionsByType = async (type, accountsList) => {
    // Skip loading securities here if only SecurityTableTicker is used for securities
    // if (type === 'security') return; // Uncomment if SecurityTableAccount is removed

    const accountsToUse = accountsList || accounts;
    if (accountsToUse.length === 0) return;

    const stateKey = getPositionStateKey(type);
    if (!stateKey) return; // Unknown type

    setLoadingPositions(prev => ({ ...prev, [stateKey]: true }));

    try {
      let allPositions = [];
      // Using fetchAllPositionsWithDetails and filtering might be more efficient than looping if API supports it
      // Example: const allOfType = await fetchAllPositionsWithDetails(type);
      // setAppropriateState(allOfType);

      // Current approach: Loop through accounts
      for (const account of accountsToUse) {
        try {
          console.log(`Fetching ${type} positions for account ${account.id}...`);
          // Assuming fetchPositionsByType exists and works per account
          const positions = await fetchPositionsByType(account.id, type);
          console.log(`Received ${type} positions for account ${account.id}:`, positions);

          if (positions && Array.isArray(positions)) {
            const enrichedPositions = positions.map(position => ({
              ...position,
              account_name: account.account_name,
              account_id: account.id
            }));
            allPositions = [...allPositions, ...enrichedPositions];
          }
        } catch (error) {
          console.error(`Error fetching ${type} for account ${account.id}:`, error);
          // Potentially set an error state per position type
        }
      }

      console.log(`Successfully processed ${allPositions.length} ${type} positions`);

      // Update appropriate state based on type
      switch(type) {
        case 'security':
          // Only set if SecurityTableAccount is used
          // setSecurityPositions(allPositions);
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
      // Set general error or specific type error
    } finally {
      setLoadingPositions(prev => ({ ...prev, [stateKey]: false }));
    }
  };


  // Helper to get state key for position type
  const getPositionStateKey = (type) => {
    switch(type) {
      case 'security': return 'securities';
      case 'crypto': return 'crypto';
      case 'metal': return 'metals';
      case 'realestate': return 'realestate';
      default: return null; // Handle unknown type
    }
  };

  // Handle account saved (added or updated)
  const handleAccountSaved = (savedAccount) => {
    console.log('Account saved:', savedAccount);
    loadAccounts(); // Refresh accounts and positions

    const action = accountToEdit ? "updated" : "added";
    setSuccessMessage(`Account ${action} successfully!`);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Open modal for adding a new account
  const handleAddAccount = () => {
    setAccountToEdit(null);
    setIsAccountModalOpen(true);
  };

  // Open modal for editing an existing account
  const handleEditAccount = (account) => {
    setAccountToEdit(account);
    setIsAccountModalOpen(true);
  };

  // Handle account deletion
  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account and all its positions?")) { // Added warning about positions
      return;
    }

    try {
      await deleteAccount(accountId);
      loadAccounts(); // Refresh accounts list and positions
      setSuccessMessage("Account deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting account:", error);
      setError("Failed to delete account: " + error.message);
    }
  };

  // Handle adding a specific position type (sets type for refresh logic)
  const handleAddSpecificPosition = (type) => {
    setSelectedPositionType(type);
    // The AddPositionButton component likely handles opening the correct modal
  };

  // Handle edit position (opens the correct modal)
  const handleEditPosition = (position, type) => {
    const account = accounts.find(acc => acc.id === position.account_id);
    if (account) {
      setSelectedAccount(account);
      setSelectedPositionType(type);
      setPositionToEdit(position);
      openPositionModal(type);
    } else {
        console.error("Could not find account for position:", position);
        setError("Could not find the account associated with this position.");
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

  // Handle position saved (refreshes the relevant table/data)
  const handlePositionSaved = (type) => {
      console.log(`${type} position saved. Refreshing...`);
      // Close all potentially open position modals
      setIsSecurityModalOpen(false);
      setIsCryptoModalOpen(false);
      setIsMetalModalOpen(false);
      setIsRealEstateModalOpen(false);
      setPositionToEdit(null); // Clear edit state
      setSelectedAccount(null); // Clear selected account

      // Refresh data
      if (type === 'security') {
          // SecurityTableTicker refreshes internally on its next load cycle or if triggered
          // If using SecurityTableAccount, refresh its data:
          // loadPositionsByType('security');
          // For now, we might need a way to explicitly tell SecurityTableTicker to refresh,
          // or rely on its internal fetch cycle. A simple page reload or component remount
          // would also work but isn't ideal UX.
          // Option: Pass a 'refreshKey' prop to SecurityTableTicker that changes on save.
          console.log("Security position saved - SecurityTableTicker will refresh on its own or needs a trigger.");

      } else {
          loadPositionsByType(type); // Refresh data for other types
      }

      setSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} position saved successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
  };


  return (
    // Changed background to light gray for better contrast with dark table component
    <div className="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">NestEgg Portfolio Management</h1>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg shadow-sm">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg shadow-sm">
          {error}
          <button
            className="ml-4 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            onClick={() => {
              setError(null);
              loadAccounts(); // Retry loading
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={handleAddAccount}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition duration-150 ease-in-out flex items-center"
        >
          {/* Using a simple + icon for consistency */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Account
        </button>

        <AddPositionButton
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition duration-150 ease-in-out flex items-center"
          // Pass accounts for the dropdown in AddPositionButton
          accounts={accounts}
          // Update the handler to call the new save handler
          onPositionAdded={(type) => handlePositionSaved(type)}
          // Trigger setting the type when a selection is made *before* modal opens
          onTypeSelected={handleAddSpecificPosition}
        />
      </div>

      {/* Accounts Section - Light Theme */}
      <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Your Accounts</h2>
        {loadingAccounts ? (
          <AccountsTableSkeleton />
        ) : accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Institution</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.account_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{account.institution || "N/A"}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{account.type || "N/A"}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{account.account_category || "N/A"}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">{formatCurrency(account.balance)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3 transition duration-150 ease-in-out"
                        title="Edit Account"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-900 transition duration-150 ease-in-out"
                        title="Delete Account"
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
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <p className="text-gray-500 mb-4">No accounts found. Add an account to get started!</p>
            <button
              onClick={handleAddAccount}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md shadow transition duration-150 ease-in-out"
            >
              Add Your First Account
            </button>
          </div>
        )}
      </div>

      {/* --- NEW: Securities by Ticker Section --- */}
      {/* This section uses the dark-themed SecurityTableTicker component */}
      <div className="mb-8">
         {/* No extra light-themed wrapper needed, the component handles its own styling */}
         {/* SecurityTableTicker fetches its own data and shows its own loading/error states */}
         <GroupedTickerTable />
      </div>
      {/* --- End NEW Section --- */}


      {/* --- OLD: Securities by Account Section (Optional) --- */}
      {/* You might want to remove this section if SecurityTableTicker replaces it */}
      {/*
      <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Your Securities (by Account)</h2>
           <AddPositionButton
             accounts={accounts}
             onPositionAdded={() => handlePositionSaved('security')}
             onTypeSelected={() => handleAddSpecificPosition('security')}
             buttonText="Add Security"
             className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center"
           />
        </div>

        {loadingPositions.securities ? (
          <SecurityTableSkeleton />
        ) : securityPositions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Purchase Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {securityPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{position.ticker}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{position.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right hidden sm:table-cell">{formatCurrency(position.price)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">{formatCurrency(position.shares * position.price)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {position.purchase_date ? formatDate(position.purchase_date) : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleEditPosition(position, 'security')}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Security"
                      >
                        Edit
                      </button>
                       {/* Add Delete Button Here if needed for SecurityTableAccount */ }
      {/*
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
           <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
             <p className="text-gray-500 mb-4">No security positions found.</p>
             <AddPositionButton
               accounts={accounts}
               onPositionAdded={() => handlePositionSaved('security')}
               onTypeSelected={() => handleAddSpecificPosition('security')}
               buttonText="Add Your First Security"
               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
             />
           </div>
        )}
      </div>
      */}
      {/* --- End OLD Section --- */}


      {/* Cryptocurrency Section - Light Theme */}
      <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Your Cryptocurrencies</h2>
          {/* Use AddPositionButton for consistency */}
           <AddPositionButton
             accounts={accounts}
             onPositionAdded={() => handlePositionSaved('crypto')}
             onTypeSelected={() => handleAddSpecificPosition('crypto')}
             buttonText="Add Crypto"
             className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center" // Changed color
           />
        </div>

        {loadingPositions.crypto ? (
          <CryptoTableSkeleton />
        ) : cryptoPositions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Storage</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cryptoPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {position.coin_symbol}
                      <div className="text-xs text-gray-500">{position.coin_type}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{position.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right hidden sm:table-cell">{formatCurrency(position.current_price)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">{formatCurrency(position.quantity * position.current_price)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {position.storage_type}
                      <div className="text-xs text-gray-400 truncate max-w-[150px]">
                        {position.storage_type === 'Exchange' ? position.exchange_name : position.wallet_address}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleEditPosition(position, 'crypto')}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Crypto"
                      >
                        Edit
                      </button>
                      {/* Add Delete Button Here if needed */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <p className="text-gray-500 mb-4">No cryptocurrency positions found.</p>
             <AddPositionButton
               accounts={accounts}
               onPositionAdded={() => handlePositionSaved('crypto')}
               onTypeSelected={() => handleAddSpecificPosition('crypto')}
               buttonText="Add Your First Crypto"
               className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md" // Changed color
             />
          </div>
        )}
      </div>

      {/* Precious Metals Section - Light Theme */}
      <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8 border border-gray-200">
         <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Your Precious Metals</h2>
           <AddPositionButton
             accounts={accounts}
             onPositionAdded={() => handlePositionSaved('metal')}
             onTypeSelected={() => handleAddSpecificPosition('metal')}
             buttonText="Add Metal"
             className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm flex items-center" // Changed color
           />
        </div>
        {loadingPositions.metals ? (
          <MetalTableSkeleton />
        ) : metalPositions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Purchase Price/Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Storage</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metalPositions.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{position.metal_type}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{position.quantity.toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{position.unit}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right hidden md:table-cell">{formatCurrency(position.purchase_price)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">{formatCurrency(position.quantity * position.purchase_price)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{position.storage_location || 'N/A'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleEditPosition(position, 'metal')}
                        className="text-indigo-600 hover:text-indigo-900"
                         title="Edit Metal"
                      >
                        Edit
                      </button>
                      {/* Add Delete Button Here if needed */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <p className="text-gray-500 mb-4">No precious metal positions found.</p>
             <AddPositionButton
               accounts={accounts}
               onPositionAdded={() => handlePositionSaved('metal')}
               onTypeSelected={() => handleAddSpecificPosition('metal')}
               buttonText="Add Your First Metal"
               className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md" // Changed color
             />
          </div>
        )}
      </div>

      {/* Real Estate Section - Light Theme */}
      <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-8 border border-gray-200">
         <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">Your Real Estate</h2>
           <AddPositionButton
             accounts={accounts}
             onPositionAdded={() => handlePositionSaved('realestate')}
             onTypeSelected={() => handleAddSpecificPosition('realestate')}
             buttonText="Add Property"
             className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm flex items-center" // Changed color
           />
        </div>
        {loadingPositions.realestate ? (
          <RealEstateTableSkeleton />
        ) : realEstatePositions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Purchase Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Purchase Date</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {realEstatePositions.map((position) => {
                  const gainLoss = position.estimated_market_value - position.purchase_price;
                  const gainLossPercent = position.purchase_price > 0
                    ? (gainLoss / position.purchase_price) * 100
                    : 0;

                  return (
                    <tr key={position.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.address}
                        <div className="text-xs text-gray-500">{position.city}, {position.state}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{position.account_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{position.property_type}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right hidden md:table-cell">{formatCurrency(position.purchase_price)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-medium">{formatCurrency(position.estimated_market_value)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                        <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                        </span>
                        <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {position.purchase_date ? formatDate(position.purchase_date) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleEditPosition(position, 'realestate')}
                          className="text-indigo-600 hover:text-indigo-900"
                           title="Edit Property"
                        >
                          Edit
                        </button>
                         {/* Add Delete Button Here if needed */}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <p className="text-gray-500 mb-4">No real estate positions found.</p>
             <AddPositionButton
               accounts={accounts}
               onPositionAdded={() => handlePositionSaved('realestate')}
               onTypeSelected={() => handleAddSpecificPosition('realestate')}
               buttonText="Add Your First Property"
               className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md" // Changed color
             />
          </div>
        )}
      </div>

      {/* Modals */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountSaved={handleAccountSaved} // Changed prop name for clarity
        accountToEdit={accountToEdit} // Changed prop name for clarity
      />

      {/* Security Position Modal (Only for Edit if SecurityTableAccount is used, or potentially via TickerBreakdownModal) */}
      <SecurityPositionModal
        isOpen={isSecurityModalOpen}
        onClose={() => { setIsSecurityModalOpen(false); setPositionToEdit(null); setSelectedAccount(null); }}
        accountId={selectedAccount?.id}
        onPositionSaved={() => handlePositionSaved('security')}
        positionToEdit={selectedPositionType === 'security' ? positionToEdit : null}
      />

      <CryptoPositionModal
        isOpen={isCryptoModalOpen}
        onClose={() => { setIsCryptoModalOpen(false); setPositionToEdit(null); setSelectedAccount(null); }}
        accountId={selectedAccount?.id}
        onPositionSaved={() => handlePositionSaved('crypto')}
        positionToEdit={selectedPositionType === 'crypto' ? positionToEdit : null}
      />

      <MetalPositionModal
        isOpen={isMetalModalOpen}
        onClose={() => { setIsMetalModalOpen(false); setPositionToEdit(null); setSelectedAccount(null); }}
        accountId={selectedAccount?.id}
        onPositionSaved={() => handlePositionSaved('metal')}
        positionToEdit={selectedPositionType === 'metal' ? positionToEdit : null}
      />

      <RealEstatePositionModal
        isOpen={isRealEstateModalOpen}
        onClose={() => { setIsRealEstateModalOpen(false); setPositionToEdit(null); setSelectedAccount(null); }}
        accountId={selectedAccount?.id}
        onPositionSaved={() => handlePositionSaved('realestate')}
        positionToEdit={selectedPositionType === 'realestate' ? positionToEdit : null}
      />
    </div>
  );
}