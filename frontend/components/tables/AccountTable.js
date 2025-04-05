// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom'; // Needed if DeleteConfirmationModal uses Portal directly here

// Data fetching and utils
import { fetchAccountsWithDetails, deleteAccount } from '@/utils/apimethods/accountMethods';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// Button Components
import AddAccountButton from '@/components/AddAccountButton'; // For header
import EditAccountButton from '@/components/EditAccountButton'; // Row action trigger
import AddPositionButton from '@/components/AddPositionButton'; // Row action trigger (+)

// Modal Components & Flows (Ensure they use Portals via FixedModal)
import AccountDetailModal from '@/components/modals/AccountDetailModal'; // Uses FixedModal
import FixedModal from '@/components/modals/FixedModal'; // Base for portals
import AccountModal from '@/components/modals/AccountModal'; // For Editing (Needs Portal)
import AddPositionFlow from '@/components/flows/AddPositionFlow'; // Add Position Flow (Needs Portal)

// Icons
import { Briefcase, Loader, Search, Plus, SlidersHorizontal, Trash, Settings } from 'lucide-react';

// --- Delete Confirmation Component (Uses FixedModal) ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "item" }) => {
     return (
        <FixedModal isOpen={isOpen} onClose={onClose} title={`Delete ${itemType}?`} size="max-w-sm">
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

// Helper function to get logo
const getInstitutionLogo = (institutionName) => {
    if (!institutionName) return null;
    const brokerage = popularBrokerages.find(
        broker => broker.name.toLowerCase() === institutionName.toLowerCase()
    );
    const FallbackIcon = () => <Briefcase className="w-5 h-5 text-gray-500" />;
    return brokerage ? brokerage.logo : FallbackIcon;
};


// --- Main AccountTable Component ---
const AccountTable = ({
    initialSort = "value-high",
    title = "Your Accounts",
    onDataChanged = () => {} // Callback to refresh parent (SummaryPage)
}) => {
    console.log("AccountTable: Rendering start");

    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [accountForPosition, setAccountForPosition] = useState(null);
    const [isAddPositionFlowOpen, setIsAddPositionFlowOpen] = useState(false);

    // UI Feedback State
    const [successMessage, setSuccessMessage] = useState("");

    // Sorting and Filtering State
    const [sortOption, setSortOption] = useState(initialSort);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Data Fetching ---
    const fetchData = async (showSuccess = false) => {
        console.log("AccountTable: fetchData START");
        setIsLoading(true);
        setError(null); // Clear error before fetch
        try {
            const fetchedAccounts = await fetchAccountsWithDetails();
            console.log("AccountTable: fetchData SUCCESS", fetchedAccounts);
            setAccounts(fetchedAccounts || []);
            if (showSuccess) { // Used by header AddAccountButton callback
                setSuccessMessage("Account added successfully!");
                setTimeout(() => setSuccessMessage(""), 3000);
                onDataChanged(); // Notify parent page on successful ADD
            }
        } catch (err) {
            console.error("AccountTable: fetchData CATCH", err);
            setError(err.message || "Failed to load account data.");
            setAccounts([]);
        } finally {
            setIsLoading(false);
            console.log("AccountTable: fetchData FINALLY");
        }
    };
    useEffect(() => { fetchData(); }, []);

    // --- Filtering & Sorting (Using data fetched above) ---
    const filteredAndSortedAccounts = useMemo(() => {
         let filtered = accounts;
         if (searchQuery) { /* ... filter logic ... */ }
         if (!Array.isArray(filtered)) return [];
         const sorted = [...filtered].sort((a, b) => { /* ... sort logic ... */ });
         return sorted;
     }, [accounts, sortOption, searchQuery]);

    // --- Modal Trigger Handlers ---
    const handleRowClick = (account) => { setSelectedAccountDetail(account); setIsDetailModalOpen(true); };
    const handleCloseDetailModal = () => setIsDetailModalOpen(false);

    // --- Delete Handlers ---
    const handleDeleteClick = (account) => {
        console.log("AccountTable: Delete triggered for:", account?.account_name);
        setAccountToDelete(account);
        setIsDeleteModalOpen(true);
    };
    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        // Important: Reset accountToDelete ONLY after modal is fully closed
        // Or ensure modal doesn't render if accountToDelete is null
        setTimeout(() => setAccountToDelete(null), 300); // Delay reset slightly
    };
    // This runs when user clicks "Delete" in the confirmation modal
    const handleConfirmDelete = async () => {
        if (!accountToDelete) return;
        console.log("AccountTable: Confirming delete for account:", accountToDelete.id);
        const deletedName = accountToDelete.account_name; // Store name for message
        // Optional: Add a loading state specifically for delete action
        try {
            await deleteAccount(accountToDelete.id);
            handleCloseDeleteModal(); // Close modal first
            setSuccessMessage(`Account "${deletedName}" deleted successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
            onDataChanged(); // Notify parent page to refresh everything
            // Optionally trigger local fetch too if needed, but parent refresh is better
            // fetchData();
        } catch (err) {
            console.error("AccountTable: Delete failed:", err);
            handleCloseDeleteModal(); // Close modal even on error
            setError("Failed to delete account: " + err.message); // Show error
        }
    };

    // --- Edit Handlers ---
    const handleEditClick = (account) => {
        console.log("AccountTable: Edit triggered for account:", account?.account_name);
        setAccountToEdit(account);
        setIsEditModalOpen(true);
    };
    // This is called by AccountModal's onClose(didSave)
    const handleCloseEditModal = (didSave) => {
        const accountName = accountToEdit?.account_name;
        setIsEditModalOpen(false);
        setAccountToEdit(null); // Clear edited account after modal closes
        if (didSave) {
             setSuccessMessage(`Account "${accountName}" updated successfully!`);
             setTimeout(() => setSuccessMessage(""), 3000);
             onDataChanged(); // Notify parent page to refresh
        }
    };

    // --- Add Position Handlers ---
    const handleAddPositionClick = (account) => {
        console.log("AccountTable: Add Position triggered for account:", account?.account_name);
        setAccountForPosition(account);
        setIsAddPositionFlowOpen(true);
    };
     // This is called by AddPositionFlow's onClose(didSave)
    const handleCloseAddPositionFlow = (didSave) => {
        const accountName = accountForPosition?.account_name;
        setIsAddPositionFlowOpen(false);
        setAccountForPosition(null); // Clear target account after flow closes
        if (didSave) {
             setSuccessMessage(`Position added to "${accountName}" successfully!`);
             setTimeout(() => setSuccessMessage(""), 3000);
             onDataChanged(); // Notify parent page to refresh
        }
    };

    // --- Render Logic ---
    if (isLoading) { return (/* ... loading spinner ... */) }
    // Error display moved to fixed position below

    return (
        <>
            {/* --- Fixed Position UI Feedback --- */}
            {successMessage && ( <div className="fixed bottom-4 right-4 p-4 bg-green-600 text-white rounded-lg shadow-lg z-[100]">{successMessage}</div> )}
            {error && ( <div className="fixed bottom-4 right-4 p-4 bg-red-600 text-white rounded-lg shadow-lg z-[100]">Error: {error}<button onClick={()=>setError(null)} className="ml-2 text-xs underline font-semibold">Dismiss</button></div> )}

            {/* --- Table Section --- */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4 text-white">
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap"><Briefcase className="w-5 h-5 mr-2 text-blue-400" />{title}</h2>
                    <div className='flex flex-wrap items-center gap-4'>
                        {/* Search, Sort */}
                        {/* Pass onDataChanged to AddAccountButton's callback */}
                        <AddAccountButton className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm" onAccountAdded={onDataChanged} />
                    </div>
                </div>

                {/* Table Content */}
                {!isLoading && filteredAndSortedAccounts.length === 0 ? (
                     <div className="p-8 text-center text-gray-400">No accounts found.</div>
                 ) : !isLoading ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700 text-white">
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
                                    // ... data consts: costBasis, gainLoss, etc. ...
                                    const LogoComponent = getInstitutionLogo(account.institution);
                                    return (
                                        <tr key={account.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleRowClick(account)}>
                                            {/* Account Name */} <td className="px-6 py-4 align-top">{/* ... */}</td>
                                            {/* Institution */} <td className="px-6 py-4 align-top text-sm text-gray-300 hidden md:table-cell">{/* ... */}</td>
                                            {/* Type */} <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden lg:table-cell">{account.type || "N/A"}</td>
                                            {/* Positions */} <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden sm:table-cell">{account.positions_count ?? 0}</td>
                                            {/* Cost Basis */} <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden md:table-cell">{formatCurrency(account.total_cost_basis ?? 0)}</td>
                                            {/* Value */} <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(account.total_value ?? 0)}</td>
                                            {/* Gain/Loss */} <td className="px-6 py-4 whitespace-nowrap text-right">{/* ... */}</td>
                                            {/* Actions Cell */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                 <div className="flex items-center justify-center space-x-2">
                                                     <AddPositionButton onClick={(e) => { e.stopPropagation(); handleAddPositionClick(account); }} className="..." buttonContent={<Plus className="h-4 w-4" />} />
                                                     <EditAccountButton onClick={(e) => { e.stopPropagation(); handleEditClick(account); }} className="..." />
                                                     <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(account); }} className="..." title="Delete Account"> <Trash className="h-4 w-4" /> </button>
                                                 </div>
                                             </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                 ) : null}
            </div>

            {/* --- Render Modals / Flows --- */}
            {/* Ensure these components use FixedModal internally */}

            {selectedAccountDetail && (
                <AccountDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    account={selectedAccountDetail}
                    // Pass the direct trigger handlers
                    onTriggerEdit={handleEditClick}
                    onTriggerDelete={handleDeleteClick}
                    onTriggerAddPosition={handleAddPositionClick}
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

            {isEditModalOpen && (
                <AccountModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal} // Handles refresh via callback
                    editAccount={accountToEdit} // ** AccountModal MUST check this prop **
                    // onAccountSaved is likely handled internally before calling onClose(true)
                />
                // Ensure AccountModal internally uses FixedModal
            )}

            {isAddPositionFlowOpen && (
                <AddPositionFlow
                     isOpen={isAddPositionFlowOpen}
                     onClose={handleCloseAddPositionFlow} // Handles refresh via callback
                     initialAccount={accountForPosition}
                 />
                 // Ensure AddPositionFlow internally uses FixedModal
             )}
        </>
    );
};

export default AccountTable;