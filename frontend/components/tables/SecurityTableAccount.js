// components/tables/SecurityTableAccount.js
import React, { useState, useEffect, useMemo } from 'react';
// ADDED: Import necessary position methods and modals
import { fetchAllPositionsWithDetails, deletePosition } from '@/utils/apimethods/positionMethods'; // Assuming deletePosition exists
import PositionDetailModal from '@/components/modals/PositionDetailModal';
// ADDED: Import actual edit modal and confirmation modal
import SecurityPositionModal from '@/components/modals/SecurityPositionModal'; // Assuming this exists
// Re-use the confirmation modal placeholder from AccountTable (or replace with a real one)
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "item" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-gray-700 p-6 rounded-lg text-white max-w-sm w-full">
                <h2 className="text-xl mb-4">Delete {itemType}?</h2>
                <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
                <div className="flex justify-end space-x-3 mt-4">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-600 transition-colors">Cancel</button>
                     <button onClick={onConfirm} className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors">Delete</button>
                </div>
            </div>
        </div>
    );
};

import { BarChart4, Settings, Trash, TrendingUp, TrendingDown, Loader, Info, Search, SlidersHorizontal, Filter, X } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters'; // Added formatPercentage

// Helper function (keep as is)
const calculateGainLoss = (position) => {
  if (!position) return { gainLossAmount: 0, gainLossPercent: 0 };
  const costBasisPerShare = position.cost_basis || position.price || 0;
  const totalCostBasis = (position.shares || 0) * costBasisPerShare;
  const currentValue = position.value || ((position.shares || 0) * (position.price || 0));
  const gainLossAmount = currentValue - totalCostBasis;
  const gainLossPercent = totalCostBasis !== 0 ? (gainLossAmount / totalCostBasis) * 100 : 0;
  return { gainLossAmount, gainLossPercent };
};

const SecurityTableAccount = ({ initialSort = "value-high", title = "Security Positions" }) => { // Added Title prop
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ADDED: Edit/Delete States
  const [positionToEdit, setPositionToEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sorting and Filtering State
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data
  const fetchData = async () => {
    console.log("SecurityTableAccount: Fetching data...");
    setIsLoading(true);
    setError(null);
    try {
      // Assuming fetchAllPositionsWithDetails fetches *only* securities or needs filtering
      const fetchedPositions = await fetchAllPositionsWithDetails('security'); // Pass type if needed
      console.log("SecurityTableAccount: Data received:", fetchedPositions);
      setPositions(fetchedPositions);
    } catch (err) {
      console.error("SecurityTableAccount fetch error:", err);
      setError(err.message || "Failed to load positions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Memoized Filtering and Sorting (keep as is)
  const filteredAndSortedPositions = useMemo(() => {
    let filtered = positions;
     if (searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(pos =>
            (pos.ticker && pos.ticker.toLowerCase().includes(lowerCaseQuery)) || // Check if ticker exists
            (pos.name && pos.name.toLowerCase().includes(lowerCaseQuery)) ||
            (pos.account_name && pos.account_name.toLowerCase().includes(lowerCaseQuery))
        );
    }
     const sorted = [...filtered].sort((a, b) => {
       const { gainLossAmount: gainLossA, gainLossPercent: gainLossPercentA } = calculateGainLoss(a);
       const { gainLossAmount: gainLossB, gainLossPercent: gainLossPercentB } = calculateGainLoss(b);
        switch (sortOption) {
         case "value-high": return (b.value || 0) - (a.value || 0);
         case "value-low": return (a.value || 0) - (b.value || 0);
         case "gain-high": return gainLossB - gainLossA;
         case "gain-low": return gainLossA - gainLossB;
         case "gain_percent-high": return gainLossPercentB - gainLossPercentA;
         case "gain_percent-low": return gainLossPercentA - gainLossPercentB;
         case "ticker": return (a.ticker || "").localeCompare(b.ticker || ""); // Handle potential null ticker
         case "account": return (a.account_name || "").localeCompare(b.account_name || "");
         case "shares-high": return (b.shares || 0) - (a.shares || 0); // Handle potential null shares
         case "shares-low": return (a.shares || 0) - (b.shares || 0);
         default: return 0;
       }
     });
    return sorted;
  }, [positions, sortOption, searchQuery]);


  // --- Handlers ---
  const handleRowClick = (position) => {
    setSelectedPositionDetail(position);
    setIsDetailModalOpen(true);
  };

  // ADDED: Handlers for edit/delete
  const handleEditClick = (e, position) => {
    e.stopPropagation(); // Prevent row click
    setPositionToEdit(position);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (e, position) => {
    e.stopPropagation(); // Prevent row click
    setPositionToDelete(position);
    setIsDeleteModalOpen(true);
  };

  // Called by SecurityPositionModal on successful save
  const handlePositionSaved = () => {
    setIsEditModalOpen(false);
    setPositionToEdit(null);
    fetchData(); // Refresh data
    // Optional: Add success notification
  };

  // Called by DeleteConfirmationModal
  const handleConfirmDelete = async () => {
    if (!positionToDelete) return;
    console.log("Attempting delete for position:", positionToDelete.id);
    try {
        // ADDED: Actual API call (assuming deletePosition exists)
        await deletePosition(positionToDelete.id); // Adjust if API requires more args
        setIsDeleteModalOpen(false);
        setPositionToDelete(null);
        fetchData(); // Refresh table data
        // Optional: Add success notification
    } catch (err) {
        console.error("Position delete failed:", err);
        setError("Failed to delete position: " + err.message);
        setIsDeleteModalOpen(false);
        setPositionToDelete(null);
        // Optional: Add error notification
    }
  };

  // --- Render Logic ---
  // Loading State (keep as is)
  if (isLoading) { /* ... */ }

  // Error State (keep as is)
  if (error) { /* ... */ }

  // Main Table Render
  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
          {/* Header with Controls */}
           <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
              <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                  <BarChart4 className="w-5 h-5 mr-2 text-purple-400" />
                  {title} {/* Use title prop */}
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
                          placeholder="Search Ticker/Acct..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
                 </div>
                 {/* Sort Dropdown */}
                 <div className="relative flex-grow sm:flex-grow-0">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                      </div>
                      <select
                          className="bg-gray-700 text-white w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                      >
                         <option value="value-high">Sort: Value (High-Low)</option>
                         <option value="value-low">Sort: Value (Low-High)</option>
                         <option value="ticker">Sort: Ticker (A-Z)</option>
                         <option value="account">Sort: Account (A-Z)</option>
                         <option value="gain-high">Sort: Gain $ (High-Low)</option>
                         <option value="gain-low">Sort: Gain $ (Low-High)</option>
                         <option value="gain_percent-high">Sort: Gain % (High-Low)</option>
                         <option value="gain_percent-low">Sort: Gain % (Low-High)</option>
                         <option value="shares-high">Sort: Shares (High-Low)</option>
                         <option value="shares-low">Sort: Shares (Low-High)</option>
                      </select>
                       <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                           </svg>
                       </div>
                 </div>
                 {/* ADDED: Consider adding an "Add Position" button here if applicable, similar to AccountTable */}
                 {/* <button onClick={() => setIsEditModalOpen(true)} className="...">Add Security</button> */}
              </div>
           </div>

        {/* Table Content */}
        {filteredAndSortedPositions.length === 0 ? (
            <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
               <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <BarChart4 className="h-8 w-8 text-gray-500" />
               </div>
               <h3 className="text-xl font-medium mb-2">No positions found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  {searchQuery ? "No positions match your search." : "There are no positions to display."}
                </p>
            </div>
        ) : (
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                {/* Sticky Header */}
                <thead className="bg-gray-900/50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ticker</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Account</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Shares</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Price</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Cost Basis/Share</th> {/* Clarified header */}
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredAndSortedPositions.map((position) => {
                    const { gainLossAmount, gainLossPercent } = calculateGainLoss(position);
                    const costBasisPerShare = position.cost_basis || position.price || 0; // Fallback if cost_basis missing

                    return (
                      <tr
                        key={position.id}
                        className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(position)} // Opens detail modal
                      >
                        {/* Ticker */}
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                               <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center mr-3">
                                  <span className="font-bold text-xs">{position.ticker?.charAt(0) || '?'}</span>
                               </div>
                               <div>
                                  <div className="text-sm font-medium">{position.ticker}</div>
                                  <div className="text-xs text-gray-400 md:hidden">{position.account_name}</div>
                               </div>
                            </div>
                        </td>
                        {/* Account */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">{position.account_name}</td>
                        {/* Shares */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{formatCurrency(position.shares, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                        {/* Price */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden sm:table-cell">{formatCurrency(position.price)}</td>
                        {/* Cost Basis/Share */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden lg:table-cell">{formatCurrency(costBasisPerShare)}</td>
                        {/* Value */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(position.value)}</td>
                        {/* Gain/Loss */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                           <div className="flex flex-col items-end">
                              <div className={`text-sm font-medium ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                 {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                              </div>
                              {/* Use formatPercentage for consistency */}
                              <div className={`text-xs ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                 {gainLossAmount >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)}
                              </div>
                           </div>
                        </td>
                        {/* Actions Column */}
                        {/* CHANGED: Added Edit/Delete buttons */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                           <div className="flex items-center justify-center space-x-2">
                                {/* Edit Position Button */}
                                <button
                                    onClick={(e) => handleEditClick(e, position)}
                                    className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                    title="Edit Position"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                                {/* Delete Position Button */}
                                <button
                                    onClick={(e) => handleDeleteClick(e, position)}
                                    className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-colors"
                                    title="Delete Position"
                                >
                                    <Trash className="h-4 w-4" />
                                </button>
                                {/* Optional: Keep Info button if needed */}
                                {/* <button onClick={(e) => { e.stopPropagation(); handleRowClick(position); }} className="..." title="View Details"> <Info className="h-4 w-4" /> </button> */}
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

      {/* Render Detail Modal */}
      <PositionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        position={selectedPositionDetail}
        // ADDED: Pass handlers to trigger edit/delete from detail modal if needed
        onEditRequest={(pos) => { setIsDetailModalOpen(false); handleEditClick(new Event('click'), pos); }}
        onDeleteRequest={(pos) => { setIsDetailModalOpen(false); handleDeleteClick(new Event('click'), pos); }}
      />

      {/* ADDED: Render Edit/Delete Modals */}
      {isEditModalOpen && positionToEdit && (
        <SecurityPositionModal
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setPositionToEdit(null); }}
            onPositionSaved={handlePositionSaved} // Refreshes data on save
            positionToEdit={positionToEdit}
            accountId={positionToEdit.account_id} // Pass accountId if modal needs it
        />
      )}

      {isDeleteModalOpen && positionToDelete && (
        <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => { setIsDeleteModalOpen(false); setPositionToDelete(null); }}
            onConfirm={handleConfirmDelete} // Calls API delete and refreshes
            itemName={positionToDelete.ticker || `Position ID ${positionToDelete.id}`} // Use ticker or ID
            itemType="position"
        />
      )}
    </>
  );
};

export default SecurityTableAccount;