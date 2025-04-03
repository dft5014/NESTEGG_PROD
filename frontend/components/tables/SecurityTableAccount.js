// nestegg/frontend/components/tables/SecurityTableAccount.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllPositionsWithDetails } from '@/utils/apimethods/PositionMethods';
import PositionDetailModal from '@/components/modals/PositionDetailModal';
// Import other modals if testing edit/delete flow
// import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
// import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import { BarChart4, Settings, Trash, TrendingUp, TrendingDown, Loader, Info, Search, SlidersHorizontal, Filter, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

// Helper function (can be moved to utils)
const calculateGainLoss = (position) => {
  if (!position) return { gainLossAmount: 0, gainLossPercent: 0 };
  const costBasisPerShare = position.cost_basis || position.price || 0; // Use price as fallback
  const totalCostBasis = (position.shares || 0) * costBasisPerShare;
  const currentValue = position.value || ((position.shares || 0) * (position.price || 0));
  const gainLossAmount = currentValue - totalCostBasis;
  const gainLossPercent = totalCostBasis !== 0 ? (gainLossAmount / totalCostBasis) * 100 : 0;
  return { gainLossAmount, gainLossPercent };
};

const SecurityTableAccount = ({ initialSort = "value-high" }) => {
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Edit/Delete States (Optional for basic test)
  // const [positionToEdit, setPositionToEdit] = useState(null);
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [positionToDelete, setPositionToDelete] = useState(null);
  // const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sorting and Filtering State
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch data
  const fetchData = async () => {
    console.log("SecurityTableAccount: Fetching data...");
    setIsLoading(true);
    setError(null);
    try {
      const fetchedPositions = await fetchAllPositionsWithDetails();
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

  // Memoized Filtering and Sorting (same as previous example)
  const filteredAndSortedPositions = useMemo(() => {
    let filtered = positions;
     if (searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(pos =>
            pos.ticker.toLowerCase().includes(lowerCaseQuery) ||
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
        case "ticker": return a.ticker.localeCompare(b.ticker);
        case "account": return (a.account_name || "").localeCompare(b.account_name || "");
        case "shares-high": return b.shares - a.shares;
        case "shares-low": return a.shares - b.shares;
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

  // Add handlers for edit/delete if testing that flow
  // const handleEditClick = (e, position) => { ... };
  // const handleDeleteClick = (e, position) => { ... };
  // const handlePositionSaved = () => { ... fetchData(); };
  // const handleConfirmDelete = async () => { ... fetchData(); };

  // --- Render Logic ---
  // Loading State
  if (isLoading) {
    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center min-h-[300px] flex items-center justify-center">
         <div>
            <Loader className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Loading positions...</p>
         </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-900/60 p-4 rounded-lg text-red-200">
        <div className="font-medium mb-1">Error Loading Positions</div>
        <div className="text-sm">{error}</div>
         <button
            onClick={fetchData}
            className="mt-2 text-xs bg-red-800/80 hover:bg-red-700/80 py-1 px-2 rounded"
          >
            Retry
          </button>
      </div>
    );
  }

  // Main Table Render
  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
          {/* Header with Controls */}
           <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
              <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                <BarChart4 className="w-5 h-5 mr-2 text-purple-400" />
                Positions Table
              </h2>
               <div className='flex flex-wrap items-center gap-4'>
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
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Cost Basis</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
               </thead>
               <tbody className="divide-y divide-gray-700">
                 {filteredAndSortedPositions.map((position) => {
                   const { gainLossAmount, gainLossPercent } = calculateGainLoss(position);
                   const costBasisPerShare = position.cost_basis || position.price || 0;

                   return (
                     <tr
                       key={position.id}
                       className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                       onClick={() => handleRowClick(position)}
                     >
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center mr-3">
                             <span className="font-bold text-xs">{position.ticker?.charAt(0) || '?'}</span>
                           </div>
                            <div>
                              <div className="text-sm font-medium">{position.ticker}</div>
                              {/* Show account name on small screens if account column is hidden */}
                              <div className="text-xs text-gray-400 md:hidden">{position.account_name}</div>
                          </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">{position.account_name}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{formatCurrency(position.shares, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden sm:table-cell">{formatCurrency(position.price)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden lg:table-cell">{formatCurrency(costBasisPerShare)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(position.value)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right">
                         <div className="flex flex-col items-end">
                            <div className={`text-sm font-medium ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                            </div>
                            <div className={`text-xs ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {gainLossAmount >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                            </div>
                         </div>
                       </td>
                        {/* Actions Column (Simplified for test - add buttons back if needed) */}
                       <td className="px-6 py-4 whitespace-nowrap text-center">
                           <button
                                onClick={(e) => { e.stopPropagation(); handleRowClick(position); }} // Can just re-trigger detail view
                                className="p-1.5 bg-gray-600/30 text-gray-400 rounded-full hover:bg-gray-600/50 transition-colors"
                                title="View Details"
                           >
                               <Info className="h-4 w-4" />
                           </button>
                            {/* Add Edit/Delete buttons here if testing */}
                           {/* <button onClick={(e) => handleEditClick(e, position)} ... > <Settings/> </button> */}
                           {/* <button onClick={(e) => handleDeleteClick(e, position)} ... > <Trash/> </button> */}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
          </div>
        )}
      </div>

      {/* Render the Test Detail Modal */}
      <PositionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        position={selectedPositionDetail}
        // Pass onEdit/onDelete if you want to test actions from modal
        // onEdit={() => { setIsDetailModalOpen(false); handleEditClick(..., selectedPositionDetail); }}
        // onDelete={() => { setIsDetailModalOpen(false); handleDeleteClick(..., selectedPositionDetail); }}
      />

      {/* Render Edit/Delete Modals if testing */}
      {/* <SecurityPositionModal isOpen={isEditModalOpen} ... /> */}
      {/* <DeleteConfirmationModal isOpen={isDeleteModalOpen} ... /> */}
    </>
  );
};

export default SecurityTableAccount;