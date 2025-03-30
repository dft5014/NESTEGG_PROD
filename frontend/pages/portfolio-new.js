// pages/portfolio-alt.js
// This page demonstrates the refactored structure using dedicated modal components.

import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import SkeletonLoader from '@/components/SkeletonLoader';
import { PortfolioSummarySkeleton, AccountsTableSkeleton, PositionsTableSkeleton } from '@/components/skeletons/PortfolioSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import SystemStatusDashboard from '@/components/SystemStatusDashboard';
import SystemEvents from '@/components/SystemEvents';
import { useEggMascot } from '@/context/EggMascotContext';
import { API_BASE_URL, fetchWithAuth } from '@/utils/api'; // Using fetchWithAuth directly

// Import Modal Components
import AddAccountModal from "@/components/modals/AddAccountModal";
import EditAccountModal from "@/components/modals/EditAccountModal";
import SelectAccountModal from "@/components/modals/SelectAccountModal";
import SelectPositionTypeModal from "@/components/modals/SelectPositionTypeModal";
import AddSecurityPositionModal from "@/components/modals/AddSecurityPositionModal";
import EditSecurityPositionModal from "@/components/modals/EditSecurityPositionModal";
import AddCryptoPositionModal from "@/components/modals/AddCryptoPositionModal";
import EditCryptoPositionModal from "@/components/modals/EditCryptoPositionModal";
import AddMetalPositionModal from "@/components/modals/AddMetalPositionModal";
import EditMetalPositionModal from "@/components/modals/EditMetalPositionModal";
import AddRealEstatePositionModal from "@/components/modals/AddRealEstatePositionModal"; // Placeholder
import EditRealEstatePositionModal from "@/components/modals/EditRealEstatePositionModal"; // Placeholder
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import BulkUploadAccountSelectModal from "@/components/modals/BulkUploadAccountSelectModal";
import BulkUploadDataPasteModal from "@/components/modals/BulkUploadDataPasteModal";
// Assuming Detail Modals are also components (or adapt as needed)
// import AccountDetailModal from "@/components/modals/AccountDetailModal"; 
// import PositionDetailModal from "@/components/modals/PositionDetailModal"; 

// Assuming constants are moved
import { popularBrokerages } from '@/utils/constants'; 


export default function PortfolioAlt() {
  const { user, setUser } = useContext(AuthContext);
  const router = useRouter();
  
  // Page Level State
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({}); // { accountId: [position1, position2] }
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Y");
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  
  // State for Modal Visibility & Data
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null); // Data for EditAccountModal
  
  const [isSelectAccountModalOpen, setIsSelectAccountModalOpen] = useState(false);
  const [isSelectPositionTypeModalOpen, setIsSelectPositionTypeModalOpen] = useState(false);
  const [selectedAccountIdForPosition, setSelectedAccountIdForPosition] = useState(null); // Account ID selected before choosing position type

  // Specific Add Position Modals
  const [isAddSecurityModalOpen, setIsAddSecurityModalOpen] = useState(false);
  const [isAddCryptoModalOpen, setIsAddCryptoModalOpen] = useState(false);
  const [isAddMetalModalOpen, setIsAddMetalModalOpen] = useState(false);
  const [isAddRealEstateModalOpen, setIsAddRealEstateModalOpen] = useState(false); // Placeholder
  // Add state for other asset types if needed

  // Edit Position Modals
  const [isEditSecurityModalOpen, setIsEditSecurityModalOpen] = useState(false);
  const [isEditCryptoModalOpen, setIsEditCryptoModalOpen] = useState(false); // Add state
  const [isEditMetalModalOpen, setIsEditMetalModalOpen] = useState(false); // Add state
  const [isEditRealEstateModalOpen, setIsEditRealEstateModalOpen] = useState(false); // Placeholder
  const [positionToEdit, setPositionToEdit] = useState(null); // Data for Edit Position Modals

  // Delete Confirmation Modals
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState({ id: null, type: null, name: '' }); // { id, type: 'account'/'position', name }

   // Bulk Upload State
   const [isBulkUploadAccountSelectOpen, setIsBulkUploadAccountSelectOpen] = useState(false);
   const [isBulkUploadDataPasteOpen, setIsBulkUploadDataPasteOpen] = useState(false);
   const [selectedBulkAccount, setSelectedBulkAccount] = useState(null);


  // Detail Modals (If implemented as separate components)
  // const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false);
  // const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
  // const [isPositionDetailModalOpen, setIsPositionDetailModalOpen] = useState(false);
  // const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);

  // --- Data Fetching ---

  const fetchPortfolioSummary = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/portfolio/summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setPortfolioSummary(data);
    } catch (err) {
      console.error("Error fetching portfolio summary:", err);
      // Don't set page error for summary fetch failure, maybe just log or show smaller indicator
    }
  }, []); // Empty dependency array, use useCallback

  const fetchPositions = useCallback(async (accountId) => {
      try {
          const response = await fetchWithAuth(`/positions/${accountId}`);
          // Add fetches for crypto, metals etc. based on account type or separate calls
          // const cryptoResponse = await fetchWithAuth(`/crypto/${accountId}`); 
          // const metalResponse = await fetchWithAuth(`/metals/${accountId}`);
          
          if (!response.ok) {
              console.error(`Failed to fetch positions for account ${accountId}`);
              // Handle error appropriately, maybe clear positions for this account
              setPositions(prev => ({ ...prev, [accountId]: [] }));
              return;
          }
          
          const data = await response.json();
          // TODO: Combine positions from different asset types if needed, or handle separately
          setPositions(prevPositions => ({
              ...prevPositions,
              [accountId]: data.positions || [] 
          }));

      } catch (error) {
          console.error(`Error fetching positions for account ${accountId}:`, error);
          setPositions(prev => ({ ...prev, [accountId]: [] })); // Clear on error
      }
  }, []); // Empty dependency array, use useCallback

  const fetchAccounts = useCallback(async () => {
    setError(null); // Clear previous errors
    setLoading(true);
    try {
      const response = await fetchWithAuth('/accounts');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      if (data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        // Fetch positions for all accounts after getting the list
        // Using Promise.all for potentially faster fetching
        await Promise.all(data.accounts.map(account => fetchPositions(account.id)));
      } else {
        throw new Error("Unexpected data format for accounts.");
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError(err.message || "Failed to load account data.");
      setAccounts([]); // Clear accounts on error
      setPositions({}); // Clear positions on error
    } finally {
      setLoading(false);
    }
  }, [fetchPositions]); // fetchPositions is a dependency


  const refreshAllData = useCallback(() => {
    fetchAccounts(); // This will also trigger fetching positions
    fetchPortfolioSummary();
  }, [fetchAccounts, fetchPortfolioSummary]);

  // Initial data fetch on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
       try {
         // console.log("🔍 Fetching user data (portfolio-alt)...");
         const response = await fetchWithAuth('/user');
         if (response.ok) {
           const userData = await response.json();
           setUser(userData); // Assuming setUser is stable from AuthContext
           refreshAllData(); // Fetch accounts, positions, and summary
         } else {
           // console.log("❌ Failed to fetch user data. Logging out.");
           // logout(); // Assuming logout is stable from AuthContext
           router.push("/login");
         }
       } catch (error) {
         console.error("🔥 Error fetching user data:", error);
         router.push("/login");
       } 
       // setLoading(false) is handled by fetchAccounts
    };
    fetchUserData();
  }, [router, setUser, refreshAllData]); // Add stable dependencies


   // --- Modal Trigger Handlers ---

   const handleOpenAddAccount = () => setIsAddAccountModalOpen(true);

   const handleOpenEditAccount = (account) => {
       setAccountToEdit(account);
       setIsEditAccountModalOpen(true);
   };

   const handleOpenDeleteAccount = (account) => {
       setItemToDelete({ id: account.id, type: 'account', name: account.account_name });
       setIsDeleteAccountModalOpen(true);
   };

   // Add Position Flow: Step 1 (Triggered by '+' button on account row or potentially navbar)
   const handleInitiateAddPosition = (accountId) => {
        setSelectedAccountIdForPosition(accountId);
        // Open type selection modal first
        setIsSelectPositionTypeModalOpen(true); 
   };

    // Add Position Flow: Step 2 (Callback from SelectAccountModal - if adding from navbar)
    const handleAccountSelectedForPosition = (accountId) => {
        setSelectedAccountIdForPosition(accountId);
        setIsSelectPositionTypeModalOpen(true); // Now open type selection
    };

    // Add Position Flow: Step 3 (Callback from SelectPositionTypeModal)
    const handlePositionTypeSelected = (typeId) => {
        // Close type selector and open the specific modal
        setIsSelectPositionTypeModalOpen(false); 
        if (typeId === 'stock') setIsAddSecurityModalOpen(true);
        else if (typeId === 'crypto') setIsAddCryptoModalOpen(true);
        else if (typeId === 'metal') setIsAddMetalModalOpen(true);
        else if (typeId === 'realestate') setIsAddRealEstateModalOpen(true); // Placeholder
        // else if (typeId === 'manual') openAddManualAssetModal(); // Placeholder
        else console.warn("Selected position type not yet handled:", typeId);
    };

    // Edit Position Trigger
    const handleOpenEditPosition = (position, positionType = 'security') => { // Need type info
        setPositionToEdit(position);
        if (positionType === 'security') setIsEditSecurityModalOpen(true);
        else if (positionType === 'crypto') setIsEditCryptoModalOpen(true); // Add condition
        else if (positionType === 'metal') setIsEditMetalModalOpen(true); // Add condition
        else if (positionType === 'realestate') setIsEditRealEstateModalOpen(true); // Placeholder
        // else openEditManualAssetModal(); // Placeholder
    };

    // Delete Position Trigger
    const handleOpenDeletePosition = (position) => {
        setItemToDelete({ id: position.id, type: 'position', name: `${position.ticker || position.coin_symbol || position.metal_type || 'Position'} (${position.id})` });
        setIsDeleteAccountModalOpen(true); // Reuse the confirmation modal
    };

    // Bulk Upload Trigger
    const handleOpenBulkUpload = () => {
        setIsBulkUploadAccountSelectOpen(true);
    };

    // Bulk Upload Step 2 Trigger (Callback from BulkUploadAccountSelectModal)
    const handleBulkAccountSelected = (account) => {
        setSelectedBulkAccount(account);
        setIsBulkUploadAccountSelectOpen(false);
        setIsBulkUploadDataPasteOpen(true);
    };

    // --- Action Handlers (Deletion, Callbacks from Modals) ---

   const confirmDeletion = async () => {
     if (!itemToDelete || !itemToDelete.id || !itemToDelete.type) return;
     
     const { id, type } = itemToDelete;
     let endpoint = '';
     if (type === 'account') {
       endpoint = `/accounts/${id}`;
     } else if (type === 'position') {
       // Need to know the *type* of position to hit the correct endpoint
       // This might require storing the type alongside the ID or looking it up
       // For now, assuming default 'positions' endpoint, needs refinement
       console.warn("Need position type (security, crypto, metal) to delete correctly. Assuming security.");
       endpoint = `/positions/${id}`; // Adjust based on actual position type
     } else {
        console.error("Unknown item type to delete:", type);
        return;
     }

     // Consider adding loading state for delete button
     try {
       const response = await fetchWithAuth(endpoint, { method: "DELETE" });
       if (response.ok) {
         // alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
         refreshAllData(); // Refresh data after deletion
       } else {
         const errorText = await response.text();
         alert(`Failed to delete ${type}: ${errorText}`);
       }
     } catch (error) {
       console.error(`Error deleting ${type}:`, error);
       alert(`Error deleting ${type}`);
     } finally {
        setIsDeleteAccountModalOpen(false); // Close confirmation modal
        setItemToDelete({ id: null, type: null, name: '' }); // Reset deletion state
     }
   };

   // --- Chart Data & Options --- (Copied from original portfolio.js, ensure data sources are correct)
    const netWorthData = { /* ... same as before ... */ };
    const getChartLabels = (timeframe) => { /* ... same as before ... */ };
    const chartData = { /* ... same as before, maybe use portfolioSummary.history if available ... */ };
    const chartOptions = { /* ... same as before ... */ };
    const getInstitutionLogo = (institutionName) => { /* ... same as before ... */ };
    const calculateAccountCostBasis = (accountId) => { /* ... same as before ... */ };


  // --- JSX Rendering ---
  if (loading && !accounts.length) { // Show initial full page loader only if no accounts yet
     return <p className="portfolio-loading p-6">Loading Portfolio...</p>; 
  }
  
  return (
    <div className="portfolio-container">
      {/* Header */}
      <header className="portfolio-header">
         <h1 className="portfolio-title">Your Portfolio (Refactored)</h1>
         <p className="portfolio-subtitle">Track your NestEgg growth</p>
         <button 
           onClick={() => setShowSystemStatus(!showSystemStatus)}
           className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
         >
           {showSystemStatus ? 'Hide System Status' : 'Show System Status'}
         </button>
       </header>

        {/* System Status Section */}
        {showSystemStatus && (
           <>
             <SystemStatusDashboard />
             <SystemEvents />
           </>
         )}

      {/* Error Message */}
      {error && (
         <ErrorMessage 
           error={error}
           onRetry={refreshAllData}
           className="mb-6"
         />
       )}

      {/* Portfolio Dashboard */}
      {loading && !portfolioSummary ? (
           <PortfolioSummarySkeleton />
         ) : portfolioSummary ? (
           <div className="portfolio-dashboard">
             {/* Net Worth Card */}
             <div className="dashboard-card net-worth">
               <h2 className="dashboard-label">Net Worth</h2>
               <p className="dashboard-value">${portfolioSummary.net_worth?.toLocaleString() || '0.00'}</p>
             </div>
              {/* Performance Cards - Use data from portfolioSummary */}
              <div className="dashboard-card performance-today">
                <h2 className="dashboard-label">Today's Perf.</h2>
                 {/* Adapt based on summary structure */}
                <p className="dashboard-value">+ $ TBD</p> 
              </div>
              <div className="dashboard-card performance-year">
                 <h2 className="dashboard-label">Overall Perf.</h2>
                 {/* Adapt based on summary structure */}
                 <p className={`dashboard-value ${portfolioSummary.overall_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolioSummary.overall_gain_loss >= 0 ? '+' : ''}
                    {(portfolioSummary.overall_gain_loss || 0).toFixed(2)}%
                 </p>
               </div>
             {/* Market Data Card - Add update/calculate buttons */}
             {/* ... */}
           </div>
         ) : (
             !error && <p>Could not load portfolio summary.</p> // Show if loading finished but no summary and no error
         )}
      
        {/* Chart Section */}
        <div className="portfolio-timeframe mt-6"> {/* Timeframe Buttons */} </div>
        <div className="portfolio-chart"> {/* Chart Component */} </div>

      {/* Accounts Section */}
      <section className="portfolio-accounts">
        <div className="accounts-header">
          <h2 className="accounts-title">Your Accounts</h2>
           <div className="flex space-x-2">
             <button className="add-account-btn" onClick={handleOpenBulkUpload}> 
               📋 Bulk Upload
             </button>
             <button className="add-account-btn" onClick={handleOpenAddAccount}>
               ➕ Add Account
             </button>
           </div>
        </div>
        
        {loading && !accounts.length ? (
          <AccountsTableSkeleton />
        ) : accounts.length > 0 ? (
            <table className="accounts-table">
                <thead>{/* ... headers ... */}</thead>
                <tbody>
                {accounts.map((account) => {
                    const costBasis = calculateAccountCostBasis(account.id); // Use existing helper
                    const gainLoss = account.balance - costBasis;
                    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                    return (
                    <tr key={account.id} className="table-row">
                        {/* ... Account Cells (Name, Institution, etc.) ... */}
                        <td className="table-cell actions-cell">
                            <button className="action-btn edit-btn" onClick={() => handleOpenEditAccount(account)}>⚙️</button>
                            <button className="action-btn add-position-btn" onClick={() => handleInitiateAddPosition(account.id)}>➕</button>
                            <button className="action-btn delete-btn" onClick={() => handleOpenDeleteAccount(account)}>🗑️</button>
                        </td>
                    </tr>
                    );
                 })}
                </tbody>
            </table>
        ) : (
           !error && <p className="accounts-empty">🥚 Add accounts to start tracking!</p>
        )}
      </section>

      {/* Positions Section */}
       <section className="portfolio-positions mt-10">
         <h2 className="accounts-title mb-6">Holdings</h2>
         {loading && Object.keys(positions).length === 0 ? (
           <PositionsTableSkeleton />
         ) : (
           Object.entries(positions).map(([accountId, accountPositions]) => {
             const account = accounts.find(a => a.id === parseInt(accountId));
             if (!account || accountPositions.length === 0) return null; // Only render if account exists and has positions

             return (
               <div key={accountId} className="mb-8 bg-white p-4 rounded-lg shadow-sm">
                 <div className="flex justify-between items-center mb-3">
                   <h3 className="text-lg font-semibold">{account.account_name}</h3>
                    <button 
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                        onClick={() => handleInitiateAddPosition(account.id)}
                    >
                        ➕ Add Position
                    </button>
                 </div>
                 <table className="accounts-table">
                   <thead>{/* ... position headers ... */}</thead>
                   <tbody>
                     {accountPositions.map((position) => {
                         // Determine position type if needed (e.g., based on ticker/symbol pattern or if data includes type)
                         const positionType = 'security'; // Placeholder - needs logic to determine type
                         return (
                           <tr key={position.id} className="table-row">
                             {/* ... Position Cells ... */}
                             <td className="table-cell actions-cell">
                               <button className="action-btn edit-btn" onClick={() => handleOpenEditPosition(position, positionType)}>⚙️</button>
                               <button className="action-btn delete-btn" onClick={() => handleOpenDeletePosition(position)}>🗑️</button>
                             </td>
                           </tr>
                         );
                      })}
                   </tbody>
                 </table>
               </div>
             );
           })
         )}
          {/* Display message if no positions found across all accounts */}
          {!loading && accounts.length > 0 && Object.values(positions).every(posList => posList.length === 0) && (
              <p className="text-center text-gray-500 mt-6">No positions found in any account.</p>
          )}
       </section>

      {/* --- Render All Modal Components --- */}
      {/* Pass necessary props: isOpen state, onClose handler, data, success callbacks */}

      <AddAccountModal 
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onAccountAdded={refreshAllData} // Refresh data on success
      />

      <EditAccountModal
        isOpen={isEditAccountModalOpen}
        onClose={() => setIsEditAccountModalOpen(false)}
        accountData={accountToEdit}
        onAccountUpdated={refreshAllData}
      />

      <SelectAccountModal
        isOpen={isSelectAccountModalOpen}
        onClose={() => setIsSelectAccountModalOpen(false)}
        accounts={accounts} // Pass fetched accounts
        isLoading={loading && accounts.length === 0} // Show loading if fetching accounts
        onAccountSelected={handleAccountSelectedForPosition} 
      />

        <SelectPositionTypeModal
            isOpen={isSelectPositionTypeModalOpen}
            onClose={() => setIsSelectPositionTypeModalOpen(false)}
            onTypeSelected={handlePositionTypeSelected}
        />

      {/* Add Position Modals */}
      <AddSecurityPositionModal
        isOpen={isAddSecurityModalOpen}
        onClose={() => setIsAddSecurityModalOpen(false)}
        accountId={selectedAccountIdForPosition}
        onPositionAdded={refreshAllData}
      />
       <AddCryptoPositionModal
        isOpen={isAddCryptoModalOpen}
        onClose={() => setIsAddCryptoModalOpen(false)}
        accountId={selectedAccountIdForPosition}
        onPositionAdded={refreshAllData}
      />
       <AddMetalPositionModal
        isOpen={isAddMetalModalOpen}
        onClose={() => setIsAddMetalModalOpen(false)}
        accountId={selectedAccountIdForPosition}
        onPositionAdded={refreshAllData}
      />
       {/* <AddRealEstatePositionModal isOpen={...} /> */}
      
       {/* Edit Position Modals */}
       <EditSecurityPositionModal
        isOpen={isEditSecurityModalOpen}
        onClose={() => setIsEditSecurityModalOpen(false)}
        positionData={positionToEdit}
        onPositionUpdated={refreshAllData}
      />
       <EditCryptoPositionModal
        isOpen={isEditCryptoModalOpen}
        onClose={() => setIsEditCryptoModalOpen(false)}
        positionData={positionToEdit}
        onPositionUpdated={refreshAllData}
      />
       <EditMetalPositionModal
        isOpen={isEditMetalModalOpen}
        onClose={() => setIsEditMetalModalOpen(false)}
        positionData={positionToEdit}
        onPositionUpdated={refreshAllData}
      />
       {/* <EditRealEstatePositionModal isOpen={...} /> */}

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirm={confirmDeletion}
        itemName={itemToDelete.name || itemToDelete.type || 'item'}
        // Pass loading state if you implement it for deletion
      />

        {/* Bulk Upload Modals */}
        <BulkUploadAccountSelectModal
           isOpen={isBulkUploadAccountSelectOpen}
           onClose={() => setIsBulkUploadAccountSelectOpen(false)}
           accounts={accounts}
           isLoading={loading && accounts.length === 0}
           onAccountSelected={handleBulkAccountSelected}
        />
        <BulkUploadDataPasteModal
           isOpen={isBulkUploadDataPasteOpen}
           onClose={() => setIsBulkUploadDataPasteOpen(false)}
           selectedAccount={selectedBulkAccount}
           onUploadComplete={refreshAllData} // Refresh after upload
           onBack={() => { // Go back to account selection
                setIsBulkUploadDataPasteOpen(false);
                setIsBulkUploadAccountSelectOpen(true);
           }}
        />

      {/* Detail Modals (If implemented) */}
      {/* <AccountDetailModal isOpen={isAccountDetailModalOpen} onClose={...} account={selectedAccountDetail} /> */}
      {/* <PositionDetailModal isOpen={isPositionDetailModalOpen} onClose={...} position={selectedPositionDetail} /> */}

    </div>
  );
}