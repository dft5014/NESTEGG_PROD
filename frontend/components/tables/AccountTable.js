// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
// Data fetching and utils
import { fetchAccountsWithDetails, deleteAccount } from '@/utils/apimethods/accountMethods';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// Button Components
import AddAccountButton from '@/components/AddAccountButton';
import EditAccountButton from '@/components/EditAccountButton';
import AddPositionButton from '@/components/AddPositionButton';

// Modal Components (Using FixedModal as base where applicable)
import AccountDetailModal from '@/components/modals/AccountDetailModal'; // Updated
import FixedModal from '@/components/modals/FixedModal'; // Use FixedModal for generic confirmation
import AccountModal from '@/components/modals/AccountModal'; // Needs update to use FixedModal or Portal

// Flow Component
import AddPositionFlow from '@/components/flows/AddPositionFlow'; // Updated

// Icons
import { Briefcase, Loader, Search, Plus, SlidersHorizontal, Trash } from 'lucide-react';


// --- Delete Confirmation Component (Now uses FixedModal) ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "item" }) => {
     return (
        <FixedModal
             isOpen={isOpen}
             onClose={onClose}
             title={`Delete ${itemType}?`}
             size="max-w-sm" // Keep it small
             // Optional: Higher zIndex if needed above other modals zIndex="z-[70]"
         >
            {/* Content for FixedModal children */}
             <div className="pt-2 pb-4"> {/* Adjust padding as FixedModal adds p-6 */}
                 <p className="text-gray-700">Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
             </div>
            {/* Footer */}
             <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                 <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm">Cancel</button>
                 <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm">Delete</button>
            </div>
        </FixedModal>
     );
};

// Helper function to get logo (Keep as is)
const getInstitutionLogo = (institutionName) => { /* ... */ };


const AccountTable = ({ initialSort = "value-high", title = "Your Accounts" }) => {
    // ... (State variables remain the same: accounts, isLoading, error, modal states, etc.) ...
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [accountForPosition, setAccountForPosition] = useState(null);
    const [isAddPositionFlowOpen, setIsAddPositionFlowOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [sortOption, setSortOption] = useState(initialSort);
    const [searchQuery, setSearchQuery] = useState("");


    // ... (Data Fetching `WorkspaceData` remains the same) ...
    const fetchData = async (showSuccess = false) => { /* ... */ };
    useEffect(() => { fetchData(); }, []);

    // ... (Filtering & Sorting `filteredAndSortedAccounts` remains the same) ...
     const filteredAndSortedAccounts = useMemo(() => { /* ... */ }, [accounts, sortOption, searchQuery]);

    // ... (Modal Trigger Handlers remain the same) ...
    const handleRowClick = (account) => { /* ... */ };
    const handleCloseDetailModal = () => { /* ... */ }
    const handleDeleteClick = (account) => { /* ... */ };
    const handleCloseDeleteModal = () => { /* ... */ };
    const handleConfirmDelete = async () => { /* ... */ };
    const handleEditClick = (account) => { /* ... */ };
    const handleCloseEditModal = (didSave) => { /* ... */ };
    const handleAddPositionClick = (account) => { /* ... */ };
    const handleCloseAddPositionFlow = (didSave) => { /* ... */ };

    // --- Render Logic ---
    if (isLoading) { /* ... loading ... */ }
    // Note: Error display moved to fixed position below

    return (
        <>
            {/* --- Fixed Position UI Feedback --- */}
            {successMessage && (
                 <div className="fixed bottom-4 right-4 p-4 bg-green-600 text-white rounded-lg shadow-lg z-[100]"> {/* High z-index */}
                      {successMessage}
                 </div>
            )}
             {error && (
                 <div className="fixed bottom-4 right-4 p-4 bg-red-600 text-white rounded-lg shadow-lg z-[100]"> {/* High z-index */}
                      Error: {error}
                      <button onClick={()=>setError(null)} className="ml-2 text-xs underline font-semibold">Dismiss</button>
                 </div>
             )}

            {/* --- Table Section --- */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
                {/* ... Header with Controls ... */}
                 <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
                      {/* Title, Search, Sort, AddAccountButton */}
                 </div>

                {/* Table Content */}
                 {!isLoading && filteredAndSortedAccounts.length === 0 ? (
                     <div className="p-8 text-center text-gray-400">No accounts found.</div>
                 ) : !isLoading ? (
                      <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-700 text-white"> {/* Ensure base text color */}
                                <thead className="bg-gray-900/50 sticky top-0 z-10">
                                    {/* ... th ... */}
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredAndSortedAccounts.map((account) => {
                                         // ... const definitions ...
                                         return (
                                             <tr key={account.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleRowClick(account)}>
                                                 {/* ... td for name, institution, type, counts, values ... */}
                                                  {/* Actions Cell */}
                                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                                       <div className="flex items-center justify-center space-x-2">
                                                            <AddPositionButton onClick={() => handleAddPositionClick(account)} className="..." buttonContent={<Plus className="h-4 w-4" />} />
                                                            <EditAccountButton onClick={() => handleEditClick(account)} className="..." />
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(account); }} className="..." title="Delete Account">
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
                 ) : null /* Don't render table div while loading */}
            </div>

            {/* --- Render Modals / Flows --- */}
            {/* These use FixedModal internally or directly */}

            <AccountDetailModal
                 isOpen={isDetailModalOpen}
                 onClose={handleCloseDetailModal}
                 account={selectedAccountDetail}
                 onTriggerEdit={handleEditClick}
                 onTriggerDelete={handleDeleteClick}
                 onTriggerAddPosition={handleAddPositionClick}
             />

            {/* Delete confirmation now uses the component wrapping FixedModal */}
             <DeleteConfirmationModal
                  isOpen={isDeleteModalOpen}
                  onClose={handleCloseDeleteModal}
                  onConfirm={handleConfirmDelete}
                  itemName={accountToDelete?.account_name}
                  itemType="account"
             />

            {/* Edit Modal (AccountModal) - ASSUMES IT USES FixedModal/Portal */}
             {isEditModalOpen && (
                 <AccountModal // MAKE SURE THIS COMPONENT USES FixedModal or Portal
                     isOpen={isEditModalOpen}
                     onClose={handleCloseEditModal}
                     onAccountSaved={(savedAccount) => handleCloseEditModal(true)} // Adapt as needed
                     editAccount={accountToEdit}
                 />
             )}

            {/* Add Position Flow */}
             {isAddPositionFlowOpen && (
                 <AddPositionFlow // Uses FixedModal internally
                      isOpen={isAddPositionFlowOpen}
                      onClose={handleCloseAddPositionFlow}
                      initialAccount={accountForPosition}
                 />
             )}
        </>
    );
};

export default AccountTable;