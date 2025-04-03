// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
// *** Use the NEW API method ***
import { fetchAccountsWithDetails } from '@/utils/apimethods/accountMethods';
import AccountDetailModal from '@/components/modals/AccountDetailModal';
// ... other imports (modals, icons, formatters) ...
import { Briefcase, Settings, Trash, Plus, Loader, Info, Search, SlidersHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';

// Placeholder modals (implement these later)
const AccountFormModal = ({ isOpen, onClose }) => isOpen ? <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-gray-700 p-6 rounded-lg">Placeholder Add/Edit Modal <button onClick={onClose}>Close</button></div></div> : null;
const DeleteConfirmationModal = ({ isOpen, onClose, itemName }) => isOpen ? <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-gray-700 p-6 rounded-lg">Delete {itemName}? <button onClick={onClose}>Close</button></div></div> : null;


const AccountTable = ({ initialSort = "balance-high", title = "Your Accounts" }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit/Add/Delete States (Placeholders)
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sorting and Filtering State
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data using the NEW method
  const fetchData = async () => {
    console.log("AccountTable: Fetching detailed data...");
    setIsLoading(true);
    setError(null);
    try {
      // *** Use the new function ***
      const fetchedAccounts = await fetchAccountsWithDetails();
      console.log("AccountTable: Detailed data received:", fetchedAccounts);
      // *** No need for dummy data anymore ***
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

  // Memoized Filtering and Sorting
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
       // Data should now be reliable from backend
       const balanceA = a.balance ?? 0; // Still use fallback just in case
       const balanceB = b.balance ?? 0;
       const costBasisA = a.total_cost_basis ?? 0; // Use new field name
       const costBasisB = b.total_cost_basis ?? 0; // Use new field name
       const gainLossA = a.total_gain_loss ?? 0;   // Use new field name
       const gainLossB = b.total_gain_loss ?? 0;   // Use new field name
       const nameA = a.account_name || "";
       const nameB = b.account_name || "";
       const institutionA = a.institution || "";
       const institutionB = b.institution || "";
       const positionsCountA = a.positions_count ?? 0; // Use new field name
       const positionsCountB = b.positions_count ?? 0; // Use new field name

      switch (sortOption) {
        case "balance-high": return balanceB - balanceA; // 'balance' might now be total_value
        case "balance-low": return balanceA - balanceB;
        case "value-high": return (b.total_value ?? 0) - (a.total_value ?? 0); // Sort by calculated total_value
        case "value-low": return (a.total_value ?? 0) - (b.total_value ?? 0);
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


  // --- Handlers (Keep existing handlers) ---
  const handleRowClick = (account) => {
    setSelectedAccountDetail(account); // Pass the full detailed account object
    setIsDetailModalOpen(true);
  };

  const handleAddClick = (e) => { /* ... keep */ };
  const handleEditClick = (e, account) => { /* ... keep */ };
  const handleDeleteClick = (e, account) => { /* ... keep */ };
  const handleAccountSaved = () => { /* ... keep */ };
  const handleConfirmDelete = async () => { /* ... keep */ };

  // --- Render Logic (Largely the same, but use new fields) ---
  if (isLoading) { /* ... keep */ }
  if (error) { /* ... keep */ }

  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
         {/* Header with Controls (Keep the same structure) */}
          <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
              <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                  {title}
              </h2>
              <div className='flex flex-wrap items-center gap-4'>
                  {/* Search Input */}
                  <div className="relative flex-grow sm:flex-grow-0">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                          type="text"
                          className="bg-gray-700 text-white w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          placeholder="Search Name/Inst..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
                  </div>
                  {/* Sort Select */}
                  <div className="relative flex-grow sm:flex-grow-0">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                       </div>
                       <select
                           className="bg-gray-700 text-white w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                           value={sortOption}
                           onChange={(e) => setSortOption(e.target.value)}
                       >
                            <option value="value-high">Sort: Value (High-Low)</option> {/* Default to value */}
                            <option value="value-low">Sort: Value (Low-High)</option>
                            {/* <option value="balance-high">Sort: Balance (High-Low)</option> */} {/* Remove if balance is now value */}
                            {/* <option value="balance-low">Sort: Balance (Low-High)</option> */}
                            <option value="name">Sort: Name (A-Z)</option>
                            <option value="institution">Sort: Institution (A-Z)</option>
                            <option value="cost_basis-high">Sort: Cost Basis (High-Low)</option>
                            <option value="cost_basis-low">Sort: Cost Basis (Low-High)</option>
                            <option value="gain_loss-high">Sort: Gain $ (High-Low)</option>
                            <option value="gain_loss-low">Sort: Gain $ (Low-High)</option>
                            <option value="positions-high">Sort: Positions (High-Low)</option>
                            <option value="positions-low">Sort: Positions (Low-High)</option>
                       </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                           {/* Arrow icon */}
                           <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                  </div>
                  {/* Add Account Button */}
                  <button
                      onClick={handleAddClick}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
                      disabled={isLoading}
                  >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Account
                  </button>
              </div>
          </div>

        {/* Table Content */}
        {filteredAndSortedAccounts.length === 0 ? (
            <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                 {/* No accounts found message */}
                 <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><Briefcase className="h-8 w-8 text-gray-500" /></div>
                 <h3 className="text-xl font-medium mb-2">No accounts found</h3>
                 <p className="text-gray-400 max-w-md mx-auto">{searchQuery ? "No accounts match your search." : "Click 'Add Account' to get started."}</p>
            </div>
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
                   <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th> {/* Changed from Balance */}
                   <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                   <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-700">
                 {filteredAndSortedAccounts.map((account) => {
                   // Data is now coming directly from the detailed account object
                   const costBasis = account.total_cost_basis ?? 0;
                   const gainLoss = account.total_gain_loss ?? 0;
                   const gainLossPercent = account.total_gain_loss_percent ?? 0;
                   const positionsCount = account.positions_count ?? 0;
                   const totalValue = account.total_value ?? 0; // Use calculated total value

                   return (
                     <tr
                       key={account.id}
                       className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                       onClick={() => handleRowClick(account)}
                     >
                       {/* Account Name */}
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                             <span className="font-bold text-xs">{account.account_name?.charAt(0) || '?'}</span>
                           </div>
                           <div>
                              <div className="text-sm font-medium">{account.account_name}</div>
                              <div className="text-xs text-gray-400 md:hidden">
                                {account.institution || 'N/A'} {account.type && `(${account.type})`}
                              </div>
                           </div>
                         </div>
                       </td>
                       {/* Institution */}
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">{account.institution || "N/A"}</td>
                       {/* Type */}
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden lg:table-cell">{account.type || "N/A"}</td>
                       {/* Positions Count */}
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden sm:table-cell">{positionsCount}</td>
                       {/* Cost Basis */}
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden md:table-cell">{formatCurrency(costBasis)}</td>
                       {/* Value (Previously Balance) */}
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
                       {/* Actions */}
                       <td className="px-6 py-4 whitespace-nowrap text-center">
                         <div className="flex items-center justify-center space-x-2">
                            <button onClick={(e) => { e.stopPropagation(); handleRowClick(account); }} className="p-1.5 bg-gray-600/30 text-gray-400 rounded-full hover:bg-gray-600/50 transition-colors" title="View Details"><Info className="h-4 w-4" /></button>
                            <button onClick={(e) => handleEditClick(e, account)} className="p-1.5 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/40 transition-colors" title="Edit Account"><Settings className="h-4 w-4" /></button>
                            <button onClick={(e) => handleDeleteClick(e, account)} className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-colors" title="Delete Account"><Trash className="h-4 w-4" /></button>
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

      {/* Render the Detail Modal */}
      <AccountDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        account={selectedAccountDetail} // Passes the detailed object now
        // Pass action handlers if needed
        // onEditRequest={(acc) => { setIsDetailModalOpen(false); handleEditClick(null, acc); }}
        // onDeleteRequest={(acc) => { setIsDetailModalOpen(false); handleDeleteClick(null, acc); }}
      />

      {/* Render Edit/Add/Delete Modals (Keep placeholders) */}
      {isAddModalOpen && <AccountFormModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={handleAccountSaved} />}
      {isEditModalOpen && accountToEdit && <AccountFormModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setAccountToEdit(null); }} onSave={handleAccountSaved} accountData={accountToEdit} />}
      {isDeleteModalOpen && accountToDelete && <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setAccountToDelete(null); }} onConfirm={handleConfirmDelete} itemName={accountToDelete.account_name} itemType="account" />}
    </>
  );
};

export default AccountTable;