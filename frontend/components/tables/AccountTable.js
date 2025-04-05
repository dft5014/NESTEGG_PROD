// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom'; // Needed if DeleteConfirmationModal uses Portal directly here

// Data fetching and utils
import { fetchAccountsWithDetails, deleteAccount } from '@/utils/apimethods/accountMethods';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// Button Components (Simple Triggers)
import AddAccountButton from '@/components/AddAccountButton'; // For adding NEW accounts
import EditAccountButton from '@/components/EditAccountButton'; // Simple trigger
import AddPositionButton from '@/components/AddPositionButton'; // Simple trigger

// Modal Components (Ensure they use Portals internally via FixedModal)
import AccountDetailModal from '@/components/modals/AccountDetailModal';
import FixedModal from '@/components/modals/FixedModal'; // Import FixedModal for Delete Confirmation wrapper

// Icons
import { Briefcase, Loader, Search, Plus, SlidersHorizontal, Trash } from 'lucide-react';

// --- Delete Confirmation Component (Uses FixedModal) ---
// Make sure this uses your enhanced FixedModal internally
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "item" }) => {
    // Ensure FixedModal handles the Portal logic
     return (
        <FixedModal
             isOpen={isOpen}
             onClose={onClose}
             title={`Delete ${itemType}?`}
             size="max-w-sm"
         >
             <div className="pt-2 pb-4 text-gray-700">
                 <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
             </div>
             <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                 <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">Cancel</button>
                 <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Delete</button>
            </div>
        </FixedModal>
     );
};


// Helper function to get logo (Keep as is)
const getInstitutionLogo = (institutionName) => {
     if (!institutionName) return null;
     const brokerage = popularBrokerages.find(
         broker => broker.name.toLowerCase() === institutionName.toLowerCase()
     );
     return brokerage ? brokerage.logo : null;
 };

// --- Main AccountTable Component ---
const AccountTable = ({ initialSort = "value-high", title = "Your Accounts" }) => {
    console.log("AccountTable: Rendering start"); // Log component mount/render

    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for Detail Modal
    const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // State for Delete Modal
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Sorting and Filtering State
    const [sortOption, setSortOption] = useState(initialSort);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Data Fetching ---
    const fetchData = async () => {
        console.log("AccountTable: fetchData START");
        // Reset state before fetch
        setIsLoading(true);
        setError(null);
        // Clear accounts maybe? Or keep stale data while loading?
        // setAccounts([]); // Optional: Clear previous data immediately

        try {
            const fetchedAccounts = await fetchAccountsWithDetails();
            console.log("AccountTable: fetchData SUCCESS", fetchedAccounts);
            setAccounts(fetchedAccounts || []); // Ensure accounts is always an array
        } catch (err) {
            console.error("AccountTable: fetchData CATCH", err);
            setError(err.message || "Failed to load account data.");
            setAccounts([]); // Clear accounts on error
        } finally {
            setIsLoading(false);
            console.log("AccountTable: fetchData FINALLY");
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Fetch data on initial mount

    // --- Filtering & Sorting ---
    const filteredAndSortedAccounts = useMemo(() => {
        let filtered = accounts;
         if (searchQuery) {
             const lowerCaseQuery = searchQuery.toLowerCase();
             filtered = filtered.filter(acc =>
                 acc.account_name?.toLowerCase().includes(lowerCaseQuery) || // Optional chaining
                 acc.institution?.toLowerCase().includes(lowerCaseQuery) ||
                 acc.type?.toLowerCase().includes(lowerCaseQuery)
             );
         }
        // Ensure accounts is an array before sorting
         if (!Array.isArray(filtered)) {
              console.error("AccountTable: filtered data is not an array!", filtered);
              return [];
         }
         const sorted = [...filtered].sort((a, b) => {
             const valueA = a.total_value ?? 0;
             const valueB = b.total_value ?? 0;
             // Add other sort comparisons back as needed
             const nameA = a.account_name || "";
             const nameB = b.account_name || "";

             switch (sortOption) {
                 case "value-high": return valueB - valueA;
                 case "value-low": return valueA - valueB;
                 case "name": return nameA.localeCompare(nameB);
                 // Add other cases back here...
                 default: return 0;
             }
         });
         return sorted;
     }, [accounts, sortOption, searchQuery]);

    // --- Basic Action Handlers (Focus on logging for Add/Edit) ---
    const handleRowClick = (account) => {
        console.log("AccountTable: Row clicked", account);
        setSelectedAccountDetail(account);
        setIsDetailModalOpen(true);
    };
    const handleCloseDetailModal = () => setIsDetailModalOpen(false);

    const handleDeleteClick = (e, account) => {
        e.stopPropagation(); // Prevent row click
        console.log("AccountTable: Delete clicked", account);
        setAccountToDelete(account);
        setIsDeleteModalOpen(true);
    };
    const handleCloseDeleteModal = () => setIsDeleteModalOpen(false);
    const handleConfirmDelete = async () => {
         if (!accountToDelete) return;
         console.log("AccountTable: Confirming delete for account:", accountToDelete.id);
         // Add loading state for delete maybe?
         try {
             await deleteAccount(accountToDelete.id);
             setIsDeleteModalOpen(false);
             setAccountToDelete(null);
             // Consider showing a success message
             fetchData(); // Refresh table
         } catch (err) {
             console.error("AccountTable: Delete failed:", err);
             // Display error to user, maybe don't close modal on error
             setError("Failed to delete account: " + err.message);
             setIsDeleteModalOpen(false); // Close modal even on error for now
         }
     };

    // --- SIMPLIFIED Action Handlers ---
    const handleAddPositionClick = (e, account) => {
        e.stopPropagation(); // Prevent row click
        console.log("AccountTable: Add Position triggered for account:", account);
        alert(`Triggered Add Position for: ${account.account_name} (ID: ${account.id})\n(Modal not implemented in this version)`);
        // TODO: Implement state change to open AddPositionFlow modal here later
    };

    const handleEditClick = (e, account) => {
        e.stopPropagation(); // Prevent row click
        console.log("AccountTable: Edit triggered for account:", account);
        alert(`Triggered Edit for: ${account.account_name} (ID: ${account.id})\n(Modal not implemented in this version)`);
        // TODO: Implement state change to open AccountModal (for editing) here later
    };


    // --- Render Logic ---

    // Loading State
     if (isLoading) {
         console.log("AccountTable: Rendering Loading State");
         return (
             <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center min-h-[200px] flex items-center justify-center text-white">
                 <div>
                     <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                     <p className="text-gray-400">Loading accounts...</p>
                 </div>
             </div>
         );
     }

    // Error State (If fetch failed) - Render this BEFORE the main table attempt
     if (error && !isLoading) { // Only show fetch error if not loading
         console.log("AccountTable: Rendering Error State:", error);
         return (
             <div className="bg-red-900/60 p-4 rounded-lg text-red-200">
                 <div className="font-medium mb-1">Error Loading Accounts</div>
                 <div className="text-sm">{error}</div>
                 <button onClick={() => fetchData()} className="mt-2 text-xs bg-red-800/80 hover:bg-red-700/80 py-1 px-2 rounded">
                     Retry
                 </button>
             </div>
         );
     }

     console.log("AccountTable: Rendering Table Content, accounts count:", accounts.length);

    // Main Table Render
     return (
         <>
             <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
                 {/* Header */}
                 <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4 text-white">
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                        <Briefcase className="w-5 h-5 mr-2 text-blue-400" />{title}
                    </h2>
                     <div className='flex flex-wrap items-center gap-4'>
                         {/* Search Input */}
                         <div className="relative">
                             <Search className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                             <input type="text" className="bg-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Search Name/Inst..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                         </div>
                         {/* Sort Select */}
                         <div className="relative">
                             <SlidersHorizontal className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                             <select className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                                 <option value="value-high">Sort: Value (High-Low)</option>
                                 <option value="value-low">Sort: Value (Low-High)</option>
                                 <option value="name">Sort: Name (A-Z)</option>
                                 {/* Add other options back */}
                             </select>
                             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </div>
                         </div>
                         {/* Add Account Button */}
                         <AddAccountButton className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm" onAccountAdded={() => fetchData()} />
                    </div>
                </div>

                 {/* Table Content */}
                 {filteredAndSortedAccounts.length === 0 ? (
                     <div className="p-8 text-center text-gray-400">No accounts match your criteria.</div>
                 ) : (
                     <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-700 text-white">
                             <thead className="bg-gray-900/50 sticky top-0 z-10">
                                 <tr>
                                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account Name</th>
                                     {/* Add other headers back */}
                                     <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                                     <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-700">
                                 {filteredAndSortedAccounts.map((account) => {
                                      const totalValue = account.total_value ?? 0;
                                     return (
                                         <tr key={account.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleRowClick(account)}>
                                             {/* Account Name Cell */}
                                             <td className="px-6 py-4 align-top">
                                                 <div className="flex items-start">
                                                     {/* ... Avatar/Icon ... */}
                                                     <div className="text-sm font-medium break-words whitespace-normal">{account.account_name}</div>
                                                     {/* ... Other info ... */}
                                                 </div>
                                             </td>
                                             {/* Add other data cells back here */}
                                             {/* Value Cell */}
                                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(totalValue)}</td>
                                             {/* Actions Cell */}
                                             <td className="px-6 py-4 whitespace-nowrap text-center">
                                                 <div className="flex items-center justify-center space-x-2">
                                                     <AddPositionButton
                                                         onClick={(e) => handleAddPositionClick(e, account)}
                                                         className="p-1.5 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/40 transition-colors"
                                                         buttonContent={<Plus className="h-4 w-4" />}
                                                     />
                                                     <EditAccountButton
                                                         onClick={(e) => handleEditClick(e, account)}
                                                         className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                                     />
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

             {/* --- Render Modals --- */}
             {/* Ensure these components use FixedModal internally */}
             {selectedAccountDetail && (
                  <AccountDetailModal
                      isOpen={isDetailModalOpen}
                      onClose={handleCloseDetailModal}
                      account={selectedAccountDetail}
                      // Keep trigger handlers if detail modal has buttons, otherwise remove
                      onTriggerEdit={(acc) => handleEditClick(new Event('click'), acc)} // Use simplified handlers
                      onTriggerDelete={(acc) => handleDeleteClick(new Event('click'), acc)}
                      onTriggerAddPosition={(acc) => handleAddPositionClick(new Event('click'), acc)}
                  />
             )}

            {accountToDelete && (
                 <DeleteConfirmationModal
                     isOpen={isDeleteModalOpen}
                     onClose={handleCloseDeleteModal}
                     onConfirm={handleConfirmDelete}
                     itemName={accountToDelete?.account_name}
                     itemType="account"
                 />
             )}

            {/* Edit Account Modal and Add Position Flow are NOT rendered here in this simplified version */}

        </>
     );
 };

 export default AccountTable;