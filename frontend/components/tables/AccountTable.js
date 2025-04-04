// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAccountsWithDetails } from '@/utils/apimethods/accountMethods';
import AccountDetailModal from '@/components/modals/AccountDetailModal';
// Placeholder Modals (Implement or import real ones later)
const AccountFormModal = ({ isOpen, onClose, accountData }) => {
    if (!isOpen) return null;
    const title = accountData ? `Edit ${accountData.account_name}` : 'Add New Account';
    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
            <div className="bg-gray-700 p-6 rounded-lg text-white">
                <h2 className="text-xl mb-4">{title}</h2>
                <p>Account Form Placeholder</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 rounded">Close</button>
            </div>
        </div>
    );
};
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName }) => {
     if (!isOpen) return null;
     return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
            <div className="bg-gray-700 p-6 rounded-lg text-white">
                <h2 className="text-xl mb-4">Delete {itemName}?</h2>
                <p>Are you sure? This cannot be undone.</p>
                <div className="flex justify-end space-x-3 mt-4">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-500 rounded">Cancel</button>
                     <button onClick={onConfirm} className="px-4 py-2 bg-red-600 rounded">Delete</button>
                </div>
            </div>
        </div>
    );
};
// Placeholder for Add Position Modal (you'll likely have a more complex one)
const AddPositionModal = ({ isOpen, onClose, accountId }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center">
            <div className="bg-gray-700 p-6 rounded-lg text-white">
                <h2 className="text-xl mb-4">Add Position to Account {accountId}</h2>
                <p>Add Position Form Placeholder</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 rounded">Close</button>
            </div>
        </div>
    );
};

// Icons
import { Briefcase, Settings, Trash, Plus, Loader, Info, Search, SlidersHorizontal } from 'lucide-react';
// Formatting and Data
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
// Assuming popularBrokerages is moved here:
import { popularBrokerages } from '@/utils/constants'; // Adjust path if needed

// Helper function to get logo
const getInstitutionLogo = (institutionName) => {
  if (!institutionName) return null;
  const brokerage = popularBrokerages.find(
    broker => broker.name.toLowerCase() === institutionName.toLowerCase()
  );
  return brokerage ? brokerage.logo : null;
};


const AccountTable = ({ initialSort = "value-high", title = "Your Accounts" }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State for triggering other modals from actions
  const [selectedAccountForPosition, setSelectedAccountForPosition] = useState(null);
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false); // State for Add Position modal
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sorting and Filtering State
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data
  const fetchData = async () => {
    console.log("AccountTable: Fetching detailed data...");
    setIsLoading(true);
    setError(null);
    try {
      const fetchedAccounts = await fetchAccountsWithDetails();
      console.log("AccountTable: Detailed data received:", fetchedAccounts);
      setAccounts(fetchedAccounts);
    } catch (err) {
      console.error("AccountTable fetch error:", err);
      setError(err.message || "Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Memoized Filtering and Sorting (using new field names)
  const filteredAndSortedAccounts = useMemo(() => {
    // ... (filtering/sorting logic remains the same as previous version) ...
     let filtered = accounts;
     if (searchQuery) {
       const lowerCaseQuery = searchQuery.toLowerCase();
       filtered = filtered.filter(acc =>
         acc.account_name.toLowerCase().includes(lowerCaseQuery) ||
         (acc.institution && acc.institution.toLowerCase().includes(lowerCaseQuery)) ||
         (acc.type && acc.type.toLowerCase().includes(lowerCaseQuery))
       );
    }
     const sorted = [...filtered].sort((a, b) => {
       const valueA = a.total_value ?? 0;
       const valueB = b.total_value ?? 0;
       const costBasisA = a.total_cost_basis ?? 0;
       const costBasisB = b.total_cost_basis ?? 0;
       const gainLossA = a.total_gain_loss ?? 0;
       const gainLossB = b.total_gain_loss ?? 0;
       const nameA = a.account_name || "";
       const nameB = b.account_name || "";
       const institutionA = a.institution || "";
       const institutionB = b.institution || "";
       const positionsCountA = a.positions_count ?? 0;
       const positionsCountB = b.positions_count ?? 0;

      switch (sortOption) {
        case "value-high": return valueB - valueA;
        case "value-low": return valueA - valueB;
        case "cost_basis-high": return costBasisB - costBasisA;
        case "cost_basis-low": return costBasisA - costBasisB;
        case "gain_loss-high": return gainLossB - gainLossA;
        case "gain_loss-low": return gainLossA - gainLossB;
        case "name": return nameA.localeCompare(nameB);
        case "institution": return institutionA.localeCompare(institutionB);
        case "positions-high": return positionsCountB - positionsCountA;
        case "positions-low": return positionsCountA - positionsCountB;
        default: return 0;
      }
    });
    return sorted;
  }, [accounts, sortOption, searchQuery]);


  // --- Handlers for Table Actions ---
  const handleRowClick = (account) => {
    // Opens the detail modal when the row (but not an action button) is clicked
    setSelectedAccountDetail(account);
    setIsDetailModalOpen(true);
  };

   // Handler for the '+' button in a row
  const handleAddPositionClick = (e, accountId) => {
      e.stopPropagation(); // IMPORTANT: Prevent row click handler
      setSelectedAccountForPosition(accountId); // Store which account to add to
      setIsAddPositionModalOpen(true); // Open the Add Position modal/flow
      console.log("Trigger Add Position for account ID:", accountId);
  };

  // Handler for the '⚙️' button in a row
  const handleEditClick = (e, account) => {
      e.stopPropagation(); // IMPORTANT: Prevent row click handler
      setAccountToEdit(account); // Store account data for the form
      setIsEditModalOpen(true); // Open the Edit Account modal
  };

   // Handler for the '🗑️' button in a row
  const handleDeleteClick = (e, account) => {
      e.stopPropagation(); // IMPORTANT: Prevent row click handler
      setAccountToDelete(account); // Store account info for confirmation
      setIsDeleteModalOpen(true); // Open the Delete Confirmation modal
  };

  // Handler for confirming deletion (called by DeleteConfirmationModal)
  const handleConfirmDelete = async () => {
      if (!accountToDelete) return;
      console.log("Attempting delete for account:", accountToDelete.id);
      // --- TODO: Add actual API call here ---
      // try {
      //   await deleteAccount(accountToDelete.id); // Assuming deleteAccount exists in accountMethods.js
      //   fetchData(); // Refresh table data
      // } catch (err) { console.error("Delete failed:", err); /* Show error message */ }
      // --- End TODO ---
      setIsDeleteModalOpen(false);
      setAccountToDelete(null);
  };

   // Handler for saving account edits (called by AccountFormModal in edit mode)
   const handleAccountSaved = () => {
      setIsEditModalOpen(false);
      setAccountToEdit(null);
      fetchData(); // Re-fetch data after save
   };

   // Handler for adding a new account (called by AccountFormModal in add mode - if you add that button)
   const handleNewAccountSaved = () => {
       // setIsAddModalOpen(false); // If you add a separate Add Account button/modal
       fetchData(); // Re-fetch data
   };


  // --- Render Logic ---
  if (isLoading) { /* ... loading state ... */ }
  if (error) { /* ... error state ... */ }

  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
         {/* Header with Controls remains the same */}
          <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
              {/* ... Title, Search, Sort ... */}
              <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                  {title}
              </h2>
              <div className='flex flex-wrap items-center gap-4'>
                   <div className="relative flex-grow sm:flex-grow-0"> <Search className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" /> <input type="text" className="bg-gray-700 text-white w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Search Name/Inst..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> </div>
                   <div className="relative flex-grow sm:flex-grow-0"> <SlidersHorizontal className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" /> <select className="bg-gray-700 text-white w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" value={sortOption} onChange={(e) => setSortOption(e.target.value)}> <option value="value-high">Sort: Value (High-Low)</option> <option value="value-low">Sort: Value (Low-High)</option> <option value="name">Sort: Name (A-Z)</option> <option value="institution">Sort: Institution (A-Z)</option> <option value="cost_basis-high">Sort: Cost Basis (High-Low)</option> <option value="cost_basis-low">Sort: Cost Basis (Low-High)</option> <option value="gain_loss-high">Sort: Gain $ (High-Low)</option> <option value="gain_loss-low">Sort: Gain $ (Low-High)</option> <option value="positions-high">Sort: Positions (High-Low)</option> <option value="positions-low">Sort: Positions (Low-High)</option> </select> <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"> <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg> </div> </div>
                 {/* Add Account button could go here if needed */}
                 {/* <button onClick={() => setIsAddModalOpen(true)} className="...">Add Account</button> */}
              </div>
          </div>

        {/* Table Content */}
        {filteredAndSortedAccounts.length === 0 ? (
             <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center"> {/* No accounts found message */} <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><Briefcase className="h-8 w-8 text-gray-500" /></div> <h3 className="text-xl font-medium mb-2">No accounts found</h3> <p className="text-gray-400 max-w-md mx-auto">{searchQuery ? "No accounts match your search." : "Add your first account to get started."}</p> </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-700">
               {/* Sticky Header */}
               <thead className="bg-gray-900/50 sticky top-0 z-10">
                 <tr>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account Name</th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Institution</th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Type</th>
                   <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Positions</th>
                   <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Cost Basis</th>
                   <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                   <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                   <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-700">
                 {filteredAndSortedAccounts.map((account) => {
                   const costBasis = account.total_cost_basis ?? 0;
                   const gainLoss = account.total_gain_loss ?? 0;
                   const gainLossPercent = account.total_gain_loss_percent ?? 0;
                   const positionsCount = account.positions_count ?? 0;
                   const totalValue = account.total_value ?? 0;
                   const logoUrl = getInstitutionLogo(account.institution); // Get logo URL

                   return (
                     <tr
                       key={account.id}
                       className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                       onClick={() => handleRowClick(account)} // Still opens detail modal
                     >
                       {/* Account Name */}
                       <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center">
                               <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3"> <span className="font-bold text-xs">{account.account_name?.charAt(0) || '?'}</span> </div>
                               <div> <div className="text-sm font-medium">{account.account_name}</div> <div className="text-xs text-gray-400 md:hidden"> {account.institution || 'N/A'} {account.type && `(${account.type})`} </div> </div>
                           </div>
                       </td>
                       {/* Institution *** MODIFIED WITH LOGO *** */}
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">
                           <div className="flex items-center">
                               {logoUrl ? (
                                   <img
                                       src={logoUrl}
                                       alt={account.institution || ''}
                                       className="w-6 h-6 object-contain mr-2 rounded-sm" // Use rounded-sm for logos
                                       // Basic fallback using data URI for a simple gray square
                                       onError={(e) => { e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+"; e.target.alt=`Logo for ${account.institution}`}}
                                   />
                               ) : account.institution && (
                                   // Placeholder with first letter if no logo URL
                                   <div className="flex-shrink-0 h-6 w-6 rounded-sm bg-gray-600 flex items-center justify-center mr-2 text-xs font-medium text-gray-300">
                                       {account.institution.charAt(0).toUpperCase()}
                                   </div>
                               )}
                               <span>{account.institution || "N/A"}</span>
                           </div>
                       </td>
                       {/* Type */}
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden lg:table-cell">{account.type || "N/A"}</td>
                       {/* Positions Count */}
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden sm:table-cell">{positionsCount}</td>
                       {/* Cost Basis */}
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden md:table-cell">{formatCurrency(costBasis)}</td>
                       {/* Value */}
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(totalValue)}</td>
                       {/* Gain/Loss */}
                       <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end"> <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}> {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} </div> <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}> {gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)} </div> </div>
                       </td>
                       {/* Actions Cell *** MODIFIED WITH BUTTONS *** */}
                       <td className="px-6 py-4 whitespace-nowrap text-center">
                           <div className="flex items-center justify-center space-x-2">
                               {/* Add Position Button */}
                               <button
                                   onClick={(e) => handleAddPositionClick(e, account.id)} // Pass event and ID
                                   className="p-1.5 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/40 transition-colors"
                                   title="Add Position to Account"
                               >
                                   <Plus className="h-4 w-4" />
                               </button>
                               {/* Edit Account Button */}
                               <button
                                   onClick={(e) => handleEditClick(e, account)} // Pass event and account object
                                   className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                   title="Edit Account"
                               >
                                   <Settings className="h-4 w-4" />
                               </button>
                               {/* Delete Account Button */}
                               <button
                                   onClick={(e) => handleDeleteClick(e, account)} // Pass event and account object
                                   className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-colors"
                                   title="Delete Account"
                               >
                                   <Trash className="h-4 w-4" />
                               </button>
                           </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
          </div>
        )}
      </div>

      {/* Render Modals */}
      <AccountDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        account={selectedAccountDetail}
        // Pass handlers down so buttons inside modal can trigger actions in this component
        onEditRequest={(acc) => handleEditClick(new Event('click'), acc)} // Simulate event if needed or adjust handler
        onDeleteRequest={(acc) => handleDeleteClick(new Event('click'), acc)}
        onAddPositionRequest={(accId) => handleAddPositionClick(new Event('click'), accId)}
      />

      {/* Placeholder Modals for Actions */}
      {isAddPositionModalOpen && (
            <AddPositionModal
                isOpen={isAddPositionModalOpen}
                onClose={() => setIsAddPositionModalOpen(false)}
                accountId={selectedAccountForPosition}
                // onPositionAdded={fetchData} // Callback to refresh data
            />
        )}
       {isEditModalOpen && accountToEdit && (
            <AccountFormModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setAccountToEdit(null); }}
                onSave={handleAccountSaved} // Refreshes data on save
                accountData={accountToEdit}
            />
       )}
       {isDeleteModalOpen && accountToDelete && (
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setAccountToDelete(null); }}
                onConfirm={handleConfirmDelete} // Calls API delete and refreshes
                itemName={accountToDelete.account_name}
                itemType="account"
            />
       )}
    </>
  );
};

export default AccountTable;