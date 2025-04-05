// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import AccountModal from '@/components/modals/AccountModal';
import { fetchAccountsWithDetails, deleteAccount } from '@/utils/apimethods/accountMethods';
import AccountDetailModal from '@/components/modals/AccountDetailModal';

// Placeholder Delete Confirmation Modal (Keep or replace with a reusable one)
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "item" }) => {
     if (!isOpen) return null;
     return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"> {/* Added padding */}
            <div className="bg-gray-700 p-6 rounded-lg text-white max-w-sm w-full"> {/* Added max-width */}
                <h2 className="text-xl mb-4">Delete {itemType}?</h2>
                <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p> {/* Clarified message */}
                <div className="flex justify-end space-x-3 mt-4">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-600 transition-colors">Cancel</button>
                     <button onClick={onConfirm} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors">Delete</button>
                </div>
            </div>
        </div>
     );
};
// Placeholder for Add Position Modal (needs implementation/replacement)
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

// Icons (Ensure all needed are imported)
import { Briefcase, Settings, Trash, Plus, Loader, Info, Search, SlidersHorizontal, PlusCircle } from 'lucide-react';
// Formatting and Data
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants'; // Adjust path if needed

// Helper function to get logo (Keep as is)
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
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  // CHANGED: Use state for the *actual* AccountModal now
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
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

  // Memoized Filtering and Sorting (Keep as is)
  const filteredAndSortedAccounts = useMemo(() => {
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
    setSelectedAccountDetail(account);
    setIsDetailModalOpen(true);
  };

    // Handler for the '+' button in a row (Add Position)
  const handleAddPositionClick = (e, accountId) => {
     e.stopPropagation();
     setSelectedAccountForPosition(accountId);
     setIsAddPositionModalOpen(true); // Open the Add Position modal/flow
     console.log("Trigger Add Position for account ID:", accountId);
     // NOTE: Needs actual AddPositionModal implementation
  };

  // Handler for the '⚙️' button in a row (Edit Account)
  const handleEditClick = (e, account) => {
     e.stopPropagation();
     setAccountToEdit(account);
     // CHANGED: Open the actual AccountModal for editing
     setIsAccountModalOpen(true);
  };

    // Handler for the '🗑️' button in a row (Delete Account)
  const handleDeleteClick = (e, account) => {
     e.stopPropagation();
     setAccountToDelete(account);
     setIsDeleteModalOpen(true);
  };

  // Handler for confirming deletion
  const handleConfirmDelete = async () => {
     if (!accountToDelete) return;
     console.log("Attempting delete for account:", accountToDelete.id);
     try {
        // ADDED: Actual API call
        await deleteAccount(accountToDelete.id);
        setIsDeleteModalOpen(false); // Close modal first
        setAccountToDelete(null);
        fetchData(); // Refresh table data after successful delete
        // Optional: Add success notification
     } catch (err) {
        console.error("Delete failed:", err);
        setError("Failed to delete account: " + err.message); // Show error message
        // Optional: Add error notification
        setIsDeleteModalOpen(false); // Close modal even on error
        setAccountToDelete(null);
     }
  };

    // Handler for saving account edits/adds (called by AccountModal)
    const handleAccountSaved = () => {
       setIsAccountModalOpen(false); // Close the modal
       setAccountToEdit(null); // Clear edit state
       fetchData(); // Re-fetch data after save
       // Optional: Add success notification
    };

    // ADDED: Handler for the main "Add Account" button
    const handleAddAccountClick = () => {
        setAccountToEdit(null); // Ensure modal opens in 'add' mode
        setIsAccountModalOpen(true);
    };


  // --- Render Logic ---
  if (isLoading) { /* ... loading state ... */ }
  if (error) { /* ... error state ... */ }

  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
          {/* Header with Controls */}
           <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
              <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                  {title}
              </h2>
              <div className='flex flex-wrap items-center gap-4'>
                   <div className="relative flex-grow sm:flex-grow-0"> {/* Search */}
                       <Search className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                       <input type="text" className="bg-gray-700 text-white w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Search Name/Inst..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                   </div>
                   <div className="relative flex-grow sm:flex-grow-0"> {/* Sort */}
                        <SlidersHorizontal className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                        <select className="bg-gray-700 text-white w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                            <option value="value-high">Sort: Value (High-Low)</option> <option value="value-low">Sort: Value (Low-High)</option> <option value="name">Sort: Name (A-Z)</option> <option value="institution">Sort: Institution (A-Z)</option> <option value="cost_basis-high">Sort: Cost Basis (High-Low)</option> <option value="cost_basis-low">Sort: Cost Basis (Low-High)</option> <option value="gain_loss-high">Sort: Gain $ (High-Low)</option> <option value="gain_loss-low">Sort: Gain $ (Low-High)</option> <option value="positions-high">Sort: Positions (High-Low)</option> <option value="positions-low">Sort: Positions (Low-High)</option>
                         </select>
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"> <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg> </div>
                    </div>
                   {/* ADDED: Add Account button */}
                   <button
                        onClick={handleAddAccountClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center"
                    >
                        <PlusCircle className="h-4 w-4 mr-1" /> Add Account
                    </button>
              </div>
           </div>

        {/* Table Content */}
        {filteredAndSortedAccounts.length === 0 ? (
             <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center"> {/* No accounts found message */} <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><Briefcase className="h-8 w-8 text-gray-500" /></div> <h3 className="text-xl font-medium mb-2">No accounts found</h3> <p className="text-gray-400 max-w-md mx-auto">{searchQuery ? "No accounts match your search." : "Add your first account to get started."}</p> </div>
        ) : (
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/50 sticky top-0 z-10">
                  <tr>
                    {/* CHANGED: Added max-width and wrapping classes */}
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
                    const logoUrl = getInstitutionLogo(account.institution);

                    return (
                      <tr
                        key={account.id}
                        className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(account)} // Detail modal on row click
                      >
                        {/* Account Name */}
                        {/* CHANGED: Added max-width, break-words, whitespace-normal */}
                        <td className="px-6 py-4 align-top"> {/* Use align-top for consistency if text wraps */}
                            <div className="flex items-start"> {/* Use items-start */}
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-0.5"> {/* Added mt-0.5 for alignment */}
                                    <span className="font-bold text-xs">{account.account_name?.charAt(0) || '?'}</span>
                                </div>
                                <div className="max-w-xs"> {/* Max width for the text container */}
                                    <div className="text-sm font-medium break-words whitespace-normal">{account.account_name}</div>
                                    <div className="text-xs text-gray-400 md:hidden break-words whitespace-normal">
                                        {account.institution || 'N/A'} {account.type && `(${account.type})`}
                                    </div>
                                </div>
                            </div>
                        </td>
                        {/* Institution */}
                        {/* CHANGED: Added max-width, break-words, whitespace-normal */}
                        <td className="px-6 py-4 align-top text-sm text-gray-300 hidden md:table-cell">
                            <div className="flex items-start max-w-xs"> {/* Use items-start */}
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={account.institution || ''}
                                        className="w-6 h-6 object-contain mr-2 rounded-sm flex-shrink-0 mt-0.5" // Added mt-0.5
                                        onError={(e) => { e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZTJlOGYwIi8+PC9zdmc+"; e.target.alt=`Logo for ${account.institution}`}}
                                    />
                                ) : account.institution && (
                                    <div className="flex-shrink-0 h-6 w-6 rounded-sm bg-gray-600 flex items-center justify-center mr-2 text-xs font-medium text-gray-300 mt-0.5"> {/* Added mt-0.5 */}
                                        {account.institution.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="break-words whitespace-normal">{account.institution || "N/A"}</span>
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
                            <div className="flex flex-col items-end">
                                <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                </div>
                                <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)}
                                </div>
                             </div>
                        </td>
                        {/* Actions Cell */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                                {/* Add Position Button */}
                                <button
                                    onClick={(e) => handleAddPositionClick(e, account.id)}
                                    className="p-1.5 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/40 transition-colors"
                                    title="Add Position to Account"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                                {/* Edit Account Button */}
                                <button
                                    onClick={(e) => handleEditClick(e, account)}
                                    className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                    title="Edit Account"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                                {/* Delete Account Button */}
                                <button
                                    onClick={(e) => handleDeleteClick(e, account)}
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
        onEditRequest={(acc) => { setIsDetailModalOpen(false); handleEditClick(new Event('click'), acc); }} // Close detail modal before opening edit
        onDeleteRequest={(acc) => { setIsDetailModalOpen(false); handleDeleteClick(new Event('click'), acc); }} // Close detail modal before opening delete confirm
        onAddPositionRequest={(accId) => { setIsDetailModalOpen(false); handleAddPositionClick(new Event('click'), accId); }} // Close detail modal before opening add pos
      />

      {/* Placeholder Add Position Modal */}
      {isAddPositionModalOpen && (
           <AddPositionModal
                isOpen={isAddPositionModalOpen}
                onClose={() => setIsAddPositionModalOpen(false)}
                accountId={selectedAccountForPosition}
                // onPositionAdded={fetchData} // Callback to refresh data if needed
            />
        )}

       <AccountModal
            isOpen={isAccountModalOpen}
            onClose={() => { setIsAccountModalOpen(false); setAccountToEdit(null); }}
            onAccountAdded={handleAccountSaved} // Use the same handler for add/edit success
            editAccount={accountToEdit}
        />

       {/* Delete Confirmation Modal */}
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