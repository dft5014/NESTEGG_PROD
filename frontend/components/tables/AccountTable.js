// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Data fetching and utils
import { fetchAccountsWithDetails, deleteAccount } from '@/utils/apimethods/accountMethods';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// Button Components
import AddAccountButton from '@/components/AddAccountButton'; // For header
import EditAccountButton from '@/components/EditAccountButton'; // Row action
import AddPositionButton from '@/components/AddPositionButton'; // Row action (+)

// Modal Components & Flows (Ensure they use Portals via FixedModal)
import AccountDetailModal from '@/components/modals/AccountDetailModal';
import FixedModal from '@/components/modals/FixedModal'; // Base for portals
import AccountModal from '@/components/modals/AccountModal'; // For Editing (Needs Portal)
import AddPositionFlow from '@/components/flows/AddPositionFlow'; // Add Position Flow (Needs Portal)

// Icons
import { Briefcase, Loader, Search, Plus, SlidersHorizontal, Trash, Settings } from 'lucide-react'; // Added Settings back if needed by EditAccountButton internally


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
    // Simple fallback icon if no logo found (e.g., placeholder SVG or component)
    const FallbackIcon = () => <Briefcase className="w-5 h-5 text-gray-500" />; // Example fallback
    return brokerage ? brokerage.logo : FallbackIcon; // Return logo URL or fallback component/element
};


// --- Main AccountTable Component ---
const AccountTable = ({ initialSort = "value-high", title = "Your Accounts" }) => {
    console.log("AccountTable: Rendering start");

    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null); // State for Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for Edit Modal
    const [accountForPosition, setAccountForPosition] = useState(null); // State for Add Pos Flow
    const [isAddPositionFlowOpen, setIsAddPositionFlowOpen] = useState(false); // State for Add Pos Flow

    // UI Feedback State
    const [successMessage, setSuccessMessage] = useState("");

    // Sorting and Filtering State
    const [sortOption, setSortOption] = useState(initialSort);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Data Fetching ---
    const fetchData = async (showSuccess = false) => {
        console.log("AccountTable: fetchData START");
        setIsLoading(true);
        setError(null);
        try {
            const fetchedAccounts = await fetchAccountsWithDetails();
            console.log("AccountTable: fetchData SUCCESS", fetchedAccounts);
            setAccounts(fetchedAccounts || []);
            if (showSuccess) {
                setSuccessMessage("Data refreshed.");
                setTimeout(() => setSuccessMessage(""), 3000);
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

    // --- Filtering & Sorting ---
    const filteredAndSortedAccounts = useMemo(() => {
         let filtered = accounts;
         if (searchQuery) {
             const lowerCaseQuery = searchQuery.toLowerCase();
             filtered = filtered.filter(acc =>
                 acc.account_name?.toLowerCase().includes(lowerCaseQuery) ||
                 acc.institution?.toLowerCase().includes(lowerCaseQuery) ||
                 acc.type?.toLowerCase().includes(lowerCaseQuery)
             );
         }
         if (!Array.isArray(filtered)) return [];

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

    // --- Modal Trigger Handlers ---
    const handleRowClick = (account) => { setSelectedAccountDetail(account); setIsDetailModalOpen(true); };
    const handleCloseDetailModal = () => setIsDetailModalOpen(false);

    const handleDeleteClick = (account) => { setAccountToDelete(account); setIsDeleteModalOpen(true); };
    const handleCloseDeleteModal = () => { setIsDeleteModalOpen(false); setAccountToDelete(null); };
    const handleConfirmDelete = async () => { /* ... delete logic ... then fetchData() ... */ };

    // Edit Modal Handlers (RESTORED)
    const handleEditClick = (account) => {
        console.log("AccountTable: Edit triggered for account:", account);
        setAccountToEdit(account);
        setIsEditModalOpen(true);
    };
    const handleCloseEditModal = (didSave) => {
        const accountName = accountToEdit?.account_name;
        setIsEditModalOpen(false);
        setAccountToEdit(null);
        if (didSave) {
             setSuccessMessage(`Account "${accountName}" updated.`);
             setTimeout(() => setSuccessMessage(""), 3000);
             fetchData();
        }
    };

    // Add Position Flow Handlers (RESTORED)
    const handleAddPositionClick = (account) => {
        console.log("AccountTable: Add Position triggered for account:", account);
        setAccountForPosition(account);
        setIsAddPositionFlowOpen(true);
    };
    const handleCloseAddPositionFlow = (didSave) => {
        const accountName = accountForPosition?.account_name;
        setIsAddPositionFlowOpen(false);
        setAccountForPosition(null);
        if (didSave) {
             setSuccessMessage(`Position added to "${accountName}".`);
             setTimeout(() => setSuccessMessage(""), 3000);
             fetchData();
        }
    };

    // --- Render Logic ---
    if (isLoading) { /* ... loading spinner ... */ }
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
                    {/* ... Title, Search, Sort, AddAccountButton ... */}
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap"><Briefcase className="w-5 h-5 mr-2 text-blue-400" />{title}</h2>
                    <div className='flex flex-wrap items-center gap-4'>
                        {/* Search, Sort */}
                        <AddAccountButton className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm" onAccountAdded={() => fetchData(true)} />
                    </div>
                </div>

                {/* Table Content */}
                {!isLoading && filteredAndSortedAccounts.length === 0 ? (
                     <div className="p-8 text-center text-gray-400">No accounts match your criteria.</div>
                 ) : !isLoading ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700 text-white">
                            <thead className="bg-gray-900/50 sticky top-0 z-10">
                                <tr>
                                    {/* --- ADDED COLUMNS BACK --- */}
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
                                    const LogoComponent = getInstitutionLogo(account.institution); // Can be URL string or Component

                                    return (
                                        <tr key={account.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleRowClick(account)}>
                                            {/* Account Name */}
                                            <td className="px-6 py-4 align-top">
                                                 <div className="flex items-start">
                                                     {/* Avatar */}
                                                     <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-0.5">
                                                          <span className="font-bold text-xs">{account.account_name?.charAt(0) || '?'}</span>
                                                      </div>
                                                     <div className="max-w-xs">
                                                         <div className="text-sm font-medium break-words whitespace-normal">{account.account_name}</div>
                                                          {/* Show inst/type on small screens here */}
                                                         <div className="text-xs text-gray-400 md:hidden break-words whitespace-normal">
                                                              {account.institution || 'N/A'} {account.type && `(${account.type})`}
                                                          </div>
                                                      </div>
                                                 </div>
                                            </td>
                                            {/* Institution */}
                                            <td className="px-6 py-4 align-top text-sm text-gray-300 hidden md:table-cell">
                                                 <div className="flex items-center max-w-xs">
                                                     {typeof LogoComponent === 'string' ? (
                                                          <img src={LogoComponent} alt={account.institution || ''} className="w-6 h-6 object-contain mr-2 rounded-sm flex-shrink-0"/>
                                                     ) : LogoComponent ? ( // Check if it's a component/element
                                                         <div className="w-6 h-6 mr-2 flex items-center justify-center"><LogoComponent /></div>
                                                     ) : account.institution && (
                                                          <div className="flex-shrink-0 h-6 w-6 rounded-sm bg-gray-600 flex items-center justify-center mr-2 text-xs font-medium text-gray-300">
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
                                                     <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>{gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}</div>
                                                     <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})</div>
                                                 </div>
                                            </td>
                                            {/* Actions Cell (RESTORED TRIGGERS) */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                 <div className="flex items-center justify-center space-x-2">
                                                     <AddPositionButton
                                                          onClick={(e) => { e.stopPropagation(); handleAddPositionClick(account); }} // Use real handler
                                                          className="p-1.5 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/40 transition-colors"
                                                          buttonContent={<Plus className="h-4 w-4" />}
                                                      />
                                                     <EditAccountButton
                                                          onClick={(e) => { e.stopPropagation(); handleEditClick(account); }} // Use real handler
                                                          className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                                      />
                                                     <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(account); }} className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-colors" title="Delete Account">
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
                 ) : null}
            </div>

            {/* --- Render Modals / Flows --- */}
            {/* Ensure these components use FixedModal internally */}

            {selectedAccountDetail && ( <AccountDetailModal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} account={selectedAccountDetail} onTriggerEdit={handleEditClick} onTriggerDelete={handleDeleteClick} onTriggerAddPosition={handleAddPositionClick} /> )}
            {accountToDelete && ( <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} onConfirm={handleConfirmDelete} itemName={accountToDelete?.account_name} itemType="account" /> )}

            {/* --- RESTORED MODAL/FLOW RENDERING --- */}
            {isEditModalOpen && ( <AccountModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} editAccount={accountToEdit} /> /* Ensure AccountModal uses FixedModal */ )}
            {isAddPositionFlowOpen && ( <AddPositionFlow isOpen={isAddPositionFlowOpen} onClose={handleCloseAddPositionFlow} initialAccount={accountForPosition} /> /* Uses FixedModal */ )}
        </>
    );
};

export default AccountTable;