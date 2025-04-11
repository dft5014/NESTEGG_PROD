// components/modals/AccountDetailModal.js
import React, { useState, useMemo, useCallback } from 'react';
import { BarChart4, ChevronDown, ChevronUp, DollarSign, TrendingUp, Plus, Settings, Trash, Edit, Eye, List } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';
import AddPositionButton from '@/components/AddPositionButton'; // Assuming this component exists
import EditAccountButton from '@/components/EditAccountButton'; // Assuming this component exists


const TaxLotDetailModal = ({
    isOpen,
    onClose,
    ticker,
    positions,
    onEditTaxLot, // New prop for handling edit
    onDeleteTaxLot // New prop for handling delete
}) => {
    if (!isOpen || !positions || positions.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl m-4">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">{ticker} - Tax Lot Details</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-blue-200 p-1 rounded-full"
                            aria-label="Close Tax Lot Details"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 max-h-[calc(80vh-120px)] overflow-y-auto"> {/* Adjusted max height */}
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900/60 sticky top-0 z-10"> {/* Added sticky header */}
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Purchase Date</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Shares</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost/Share</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total Cost</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Current Value</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {positions.map((position, index) => {
                                // Ensure robust parsing and defaults
                                const shares = parseFloat(position.shares || position.quantity || 0);
                                const costPerShare = parseFloat(position.cost_basis || 0); // Prioritize cost_basis
                                const totalCost = shares * costPerShare;
                                const currentValue = parseFloat(position.value || 0);
                                const gainLoss = currentValue - totalCost;
                                const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) : 0; // Avoid division by zero

                                return (
                                    <tr key={`lot-${position.id || index}`} className="hover:bg-gray-700/40">
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                            {formatDate(position.purchase_date) || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatNumber(shares, { maximumFractionDigits: 6 })}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatCurrency(costPerShare)}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatCurrency(totalCost)}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatCurrency(currentValue)}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap">
                                            <div className={`text-sm ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                                <span className="text-xs block">
                                                    ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)}) {/* Use formatter */}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center space-x-1">
                                                {/* --- EDIT BUTTON --- */}
                                                <button
                                                    onClick={() => onEditTaxLot(position)} // Call handler with position data
                                                    className="p-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/40 transition-colors text-xs"
                                                    title="Edit Tax Lot"
                                                >
                                                    Edit
                                                </button>
                                                {/* --- DELETE BUTTON --- */}
                                                <button
                                                    onClick={() => onDeleteTaxLot(position)} // Call handler with position data
                                                    className="p-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 transition-colors text-xs"
                                                    title="Delete Tax Lot"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                     {positions.length === 0 && (
                        <div className="text-center py-4 text-gray-400">No individual tax lots found for this ticker.</div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-900 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Position Modify Modal Component
const PositionModifyModal = ({
    isOpen,
    onClose,
    ticker,
    positions,
    onEditSelectedTaxLot, // New prop
    onDeleteSelectedTaxLot // New prop
}) => {
    const [selectedPositionId, setSelectedPositionId] = useState(null);

    const handleSelectionChange = (event) => {
        setSelectedPositionId(event.target.value);
    };

    const handleEditClick = () => {
        if (selectedPositionId) {
            onEditSelectedTaxLot(selectedPositionId);
        }
    };

    const handleDeleteClick = () => {
        if (selectedPositionId) {
            onDeleteSelectedTaxLot(selectedPositionId);
        }
    };

    if (!isOpen || !positions || positions.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl m-4">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-800 border-b border-purple-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">Modify Position: {ticker}</h2>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-purple-200 p-1 rounded-full"
                            aria-label="Close Modify Position Modal"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4">
                    <div className="mb-4 text-sm text-gray-300">
                        Select a tax lot to modify or delete:
                    </div>

                    <div className="bg-gray-800/60 rounded-lg max-h-[calc(80vh - 180px)] overflow-y-auto"> {/* Adjusted max height */}
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900/60 sticky top-0 z-10"> {/* Added sticky header */}
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Select</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Purchase Date</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Shares</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost/Share</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {positions.map((position, index) => (
                                    <tr key={`modify-${position.id || index}`} className="hover:bg-gray-700/40">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <input
                                                type="radio"
                                                name="position-select"
                                                value={position.id} // Assuming positions have unique IDs
                                                checked={selectedPositionId === position.id}
                                                onChange={handleSelectionChange}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 bg-gray-700"
                                            />
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                            {formatDate(position.purchase_date) || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatNumber(position.shares || position.quantity || 0, { maximumFractionDigits: 6 })}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatCurrency(position.cost_basis || 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatCurrency(position.value || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {positions.length === 0 && (
                            <div className="text-center py-4 text-gray-400">No individual tax lots found for this ticker.</div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-gray-900 border-t border-gray-700 flex justify-end space-x-3">
                    <button
                        onClick={handleEditClick}
                        disabled={!selectedPositionId} // Disable if nothing selected
                        className={`px-3 py-1.5 rounded text-sm ${
                            !selectedPositionId
                                ? 'bg-purple-800 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                    >
                        Edit Selected
                    </button>
                    <button
                        onClick={handleDeleteClick}
                        disabled={!selectedPositionId} // Disable if nothing selected
                        className={`px-3 py-1.5 rounded text-sm ${
                            !selectedPositionId
                                ? 'bg-red-800 text-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                        Delete Selected
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main AccountDetailModal Component ---

const AccountDetailModal = ({
    isOpen,
    onClose = () => {},
    account,
    // Props to trigger handlers in the parent (e.g., AccountTable)
    onTriggerEdit = (acc) => console.log("Trigger Edit Account:", acc),
    onTriggerDelete = (acc) => console.log("Trigger Delete Account:", acc),
    onTriggerAddPosition = (acc) => console.log("Trigger Add Position for Account:", acc),
    // Props for handling specific position/tax lot actions (implement actual logic here or pass down further)
    onEditPosition = (pos) => console.log("Edit Position/Tax Lot:", pos), // Placeholder
    onDeletePosition = (pos) => console.log("Delete Position/Tax Lot:", pos), // Placeholder
}) => {
    // State for sorting the grouped positions
    const [sortField, setSortField] = useState('totalValue'); // Default sort
    const [sortDirection, setSortDirection] = useState('desc');

    // State for nested modals
    const [selectedTickerForDetail, setSelectedTickerForDetail] = useState(null);
    const [selectedTickerForModify, setSelectedTickerForModify] = useState(null);
    const [isTaxLotModalOpen, setIsTaxLotModalOpen] = useState(false);
    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);

    // --- Data Calculation ---
    // Use optional chaining and nullish coalescing for safety
    const totalValue = account?.total_value ?? 0;
    const costBasis = account?.total_cost_basis ?? 0;
    const gainLoss = totalValue - costBasis; // Recalculate for consistency if needed, or use provided
    // const gainLoss = account?.total_gain_loss ?? (totalValue - costBasis);
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) : 0; // Recalculate or use provided
    // const gainLossPercent = account?.total_gain_loss_percent ?? (costBasis > 0 ? (gainLoss / costBasis) * 100 : 0);
    const positionsCount = account?.positions?.length ?? 0;


    // --- Group positions by ticker ---
    const groupedPositions = useMemo(() => {
        // Expecting account.positions to be an array of objects like:
        // { id: '...', ticker: 'AAPL', name: 'Apple Inc.', shares: 10, value: 1500, cost_basis: 100, current_price: 150, purchase_date: '...', asset_type: 'stock', ... }
        // OR { id: '...', name: 'My Fund', quantity: 50, value: 2500, cost_basis: 40, asset_type: 'mutual_fund', ... } // If no ticker

        if (!account?.positions || !Array.isArray(account.positions) || account.positions.length === 0) {
            return [];
        }

        const groupedByTicker = account.positions.reduce((groups, position) => {
            // Ensure position is an object
            if (typeof position !== 'object' || position === null) {
                console.warn("Skipping invalid position item:", position);
                return groups;
            }

            const tickerKey = position.ticker || position.name || 'Unknown'; // Group key

            if (!groups[tickerKey]) {
                groups[tickerKey] = {
                    ticker: tickerKey,
                    name: position.name || tickerKey, // Use name if available, fallback to ticker
                    asset_type: position.asset_type || 'security',
                    positions: [], // Store original positions (tax lots)
                    totalShares: 0,
                    totalValue: 0,
                    totalCostBasis: 0,
                    // Try to get a representative current price (e.g., from the first position in the group)
                    currentPrice: parseFloat(position.current_price || position.price || 0),
                };
            }

            // Add position to group and update totals - use robust parsing
            groups[tickerKey].positions.push(position);

            const positionShares = parseFloat(position.shares || position.quantity || 0);
            const positionValue = parseFloat(position.value || 0);
            const positionCostPerShare = parseFloat(position.cost_basis || 0); // Only use cost_basis here
            const positionCostBasis = positionShares * positionCostPerShare;

            // Check for NaN before adding
            if (!isNaN(positionShares)) groups[tickerKey].totalShares += positionShares;
            if (!isNaN(positionValue)) groups[tickerKey].totalValue += positionValue;
            if (!isNaN(positionCostBasis)) groups[tickerKey].totalCostBasis += positionCostBasis;

            // Update current price if a later position has a more valid one (optional, depends on desired logic)
            const currentItemPrice = parseFloat(position.current_price || position.price || 0);
            if (!isNaN(currentItemPrice) && currentItemPrice > 0 && groups[tickerKey].currentPrice <= 0) {
                 groups[tickerKey].currentPrice = currentItemPrice;
            }


            return groups;
        }, {});

        // Convert grouped object to array and calculate derived metrics
        return Object.values(groupedByTicker).map(group => {
            group.avgCostPerShare = group.totalShares > 0 ? group.totalCostBasis / group.totalShares : 0;
            group.gainLoss = group.totalValue - group.totalCostBasis;
            group.gainLossPercent = group.totalCostBasis > 0 ? (group.gainLoss / group.totalCostBasis) : 0; // As fraction for formatter
            // Ensure derived values are numbers
            group.avgCostPerShare = isNaN(group.avgCostPerShare) ? 0 : group.avgCostPerShare;
            group.gainLoss = isNaN(group.gainLoss) ? 0 : group.gainLoss;
            group.gainLossPercent = isNaN(group.gainLossPercent) ? 0 : group.gainLossPercent;
            return group;
        });
    }, [account?.positions]); // Dependency: only positions array

    // --- Sort grouped positions ---
    const sortedGroupedPositions = useMemo(() => {
        if (!groupedPositions.length) return [];

        return [...groupedPositions].sort((a, b) => {
            let aValue, bValue;
            const field = sortField; // Use state variable

            // Handle string comparison for ticker/name
            if (field === 'ticker') {
                const compareResult = (a.ticker || '').localeCompare(b.ticker || '');
                return sortDirection === 'asc' ? compareResult : -compareResult;
            }
            if (field === 'name') {
                const compareResult = (a.name || '').localeCompare(b.name || '');
                 return sortDirection === 'asc' ? compareResult : -compareResult;
            }

            // Handle numeric comparison for other fields
            switch (field) {
                case 'totalValue':    aValue = a.totalValue; bValue = b.totalValue; break;
                case 'totalShares':   aValue = a.totalShares; bValue = b.totalShares; break;
                case 'totalCostBasis':aValue = a.totalCostBasis; bValue = b.totalCostBasis; break;
                case 'gainLoss':      aValue = a.gainLoss; bValue = b.gainLoss; break;
                case 'currentPrice':  aValue = a.currentPrice; bValue = b.currentPrice; break;
                case 'avgCostPerShare': aValue = a.avgCostPerShare; bValue = b.avgCostPerShare; break;
                case 'gainLossPercent': aValue = a.gainLossPercent; bValue = b.gainLossPercent; break;
                default:              aValue = a.totalValue; bValue = b.totalValue; // Default sort
            }

             // Default to 0 if null/undefined
            aValue = aValue ?? 0;
            bValue = bValue ?? 0;

            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [groupedPositions, sortField, sortDirection]); // Dependencies

    // --- Calculate account percentages ---
    const positionsWithPercentage = useMemo(() => {
        // Ensure totalValue is valid for calculation
        if (!sortedGroupedPositions.length || totalValue <= 0) {
            // Return positions without percentage if total value is zero or negative
             return sortedGroupedPositions.map(pos => ({ ...pos, accountPercentage: 0 }));
        }

        return sortedGroupedPositions.map(pos => ({
            ...pos,
            // Calculate percentage, handle potential NaN
            accountPercentage: (pos.totalValue / totalValue) // As fraction for formatter
        }));
    }, [sortedGroupedPositions, totalValue]); // Dependencies


    // --- Event Handlers ---

    // Sorting handler
    const handleSort = useCallback((field) => {
        setSortField(prevField => {
            if (prevField === field) {
                setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortDirection('desc'); // Default direction for new field
            }
            return field; // Set the new sort field
        });
    }, []); // No dependencies needed

    // Get sort icon helper
    const getSortIcon = useCallback((field) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 inline-block" /> : <ChevronDown className="w-3 h-3 ml-1 inline-block" />;
    }, [sortField, sortDirection]); // Dependencies


    // --- Nested Modal Handlers ---

    const handleViewPositionClick = useCallback((e, positionGroup) => {
        e.stopPropagation(); // Prevent row click if it has other actions
        setSelectedTickerForDetail(positionGroup.ticker);
        setIsTaxLotModalOpen(true);
    }, []); // No dependencies

    const handleModifyPositionClick = useCallback((e, positionGroup) => {
        e.stopPropagation();
        setSelectedTickerForModify(positionGroup.ticker);
        setIsModifyModalOpen(true);
    }, []); // No dependencies

    const handleCloseTaxLotModal = useCallback(() => {
        setIsTaxLotModalOpen(false);
        // Delay clearing ticker to allow fade-out animation if any
        setTimeout(() => setSelectedTickerForDetail(null), 300);
    }, []);

    const handleCloseModifyModal = useCallback(() => {
        setIsModifyModalOpen(false);
        setTimeout(() => setSelectedTickerForModify(null), 300);
    }, []);

    // Get individual positions (tax lots) for the selected ticker group
    const getPositionsForTicker = useCallback((ticker) => {
        const group = groupedPositions.find(g => g.ticker === ticker);
        return group ? group.positions : [];
    }, [groupedPositions]); // Dependency


    // --- Placeholder Handlers for Tax Lot Edit/Delete ---
    // Replace console.log with actual logic (e.g., open form, API call)

    const handleEditTaxLot = useCallback((taxLot) => {
        console.log("Request to EDIT Tax Lot:", taxLot);
        // Call the prop passed down, potentially closing nested modals first
        onEditPosition(taxLot);
        // Maybe close the TaxLotDetailModal here or after successful edit
        // handleCloseTaxLotModal();
    }, [onEditPosition]);

    const handleDeleteTaxLot = useCallback((taxLot) => {
        console.log("Request to DELETE Tax Lot:", taxLot);
        // Add confirmation dialog here!
        if (window.confirm(`Are you sure you want to delete this tax lot? \nTicker: ${taxLot.ticker || taxLot.name}\nShares: ${taxLot.shares || taxLot.quantity}\nDate: ${formatDate(taxLot.purchase_date)}`)) {
            onDeletePosition(taxLot);
            // Maybe close the TaxLotDetailModal here or after successful delete
            // handleCloseTaxLotModal();
        }
    }, [onDeletePosition]);

    const handleEditSelectedTaxLot = useCallback((selectedId) => {
         const ticker = selectedTickerForModify;
         if (!ticker || !selectedId) return;
         const positions = getPositionsForTicker(ticker);
         const taxLotToEdit = positions.find(p => p.id === selectedId); // Assumes positions have unique 'id'

         if (taxLotToEdit) {
            console.log("Request to EDIT Selected Tax Lot:", taxLotToEdit);
            onEditPosition(taxLotToEdit);
             // Close the modify modal after triggering edit
            handleCloseModifyModal();
         } else {
            console.error("Could not find tax lot with ID:", selectedId);
         }
    }, [selectedTickerForModify, getPositionsForTicker, onEditPosition, handleCloseModifyModal]);

    const handleDeleteSelectedTaxLot = useCallback((selectedId) => {
        const ticker = selectedTickerForModify;
        if (!ticker || !selectedId) return;
        const positions = getPositionsForTicker(ticker);
        const taxLotToDelete = positions.find(p => p.id === selectedId); // Assumes positions have unique 'id'

        if (taxLotToDelete) {
             console.log("Request to DELETE Selected Tax Lot:", taxLotToDelete);
             if (window.confirm(`Are you sure you want to delete the selected tax lot? \nTicker: ${taxLotToDelete.ticker || taxLotToDelete.name}\nShares: ${taxLotToDelete.shares || taxLotToDelete.quantity}\nDate: ${formatDate(taxLotToDelete.purchase_date)}`)) {
                 onDeletePosition(taxLotToDelete);
                 // Close the modify modal after triggering delete
                handleCloseModifyModal();
             }
        } else {
            console.error("Could not find tax lot with ID:", selectedId);
        }
    }, [selectedTickerForModify, getPositionsForTicker, onDeletePosition, handleCloseModifyModal]);


    // --- Render ---

    if (!isOpen || !account) return null; // Ensure account data is present

    return (
        // Main Modal Container & Backdrop
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center">
            {/* Modal Dialog */}
            <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl m-4 flex flex-col max-h-[90vh]"> {/* Max height and flex col */}

                {/* Custom Header */}
                <div className="p-5 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700 flex-shrink-0"> {/* Reduced padding */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-3"> {/* Smaller avatar */}
                            <span className="font-bold text-blue-800 text-xl">{account?.account_name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">{account?.account_name || 'Account Details'}</h2> {/* Tighter leading */}
                            <div className="flex items-center text-xs text-blue-200 flex-wrap gap-x-1.5 mt-0.5"> {/* Smaller text, closer margin */}
                                <span>{account?.institution || "N/A"}</span>
                                {account?.type && (<><span className="opacity-50">•</span><span>{account.type}</span></>)}
                                <span className="opacity-50">•</span>
                                <span>Last updated: {formatDate(account?.updated_at) || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body Content */}
                <div className="bg-[#111827] p-5 space-y-5 overflow-y-auto flex-grow"> {/* Reduced padding/space, flex-grow */}
                    {/* Account Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"> {/* Reduced gap */}
                        {/* Metric Cards - Adjusted Padding/Font Size */}
                        <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center">
                                <DollarSign className='w-2.5 h-2.5 mr-1'/>CURRENT VALUE
                            </div>
                            <div className="text-lg font-bold">{formatCurrency(totalValue)}</div>
                        </div>
                         <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center">
                                <DollarSign className='w-2.5 h-2.5 mr-1'/>COST BASIS
                            </div>
                            <div className="text-lg font-bold">{formatCurrency(costBasis)}</div>
                        </div>
                         <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center">
                                <TrendingUp className='w-2.5 h-2.5 mr-1'/>GAIN/LOSS
                            </div>
                            <div className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                <span className="block text-[11px] font-medium">
                                    ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                                </span>
                            </div>
                        </div>
                         <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center">
                                <BarChart4 className='w-2.5 h-2.5 mr-1'/>POSITIONS
                            </div>
                            <div className="text-lg font-bold">{positionsCount}</div>
                        </div>
                    </div>

                    {/* Positions Table Section */}
                    <div className="bg-[#1e293b]/80 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-700 flex justify-between items-center"> {/* Reduced padding */}
                            <h3 className="font-semibold text-base text-white">Account Holdings</h3>
                             {/* Add Position Button (inside table header area) */}
                            {/* <AddPositionButton
                                accountId={account?.id}
                                className="text-xs bg-blue-600 hover:bg-blue-700 py-1 px-2.5 rounded" // Smaller button
                                buttonContent={<div className="flex items-center"><Plus className="w-3 h-3 mr-1" /> Add New</div>}
                                onPositionAdded={() => {
                                    // Potentially close modal or just refresh data via parent callback
                                    onTriggerAddPosition(account);
                                    // onClose(); // Optional: close modal after adding
                                }}
                            /> */}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-full divide-y divide-gray-700 text-sm"> {/* Smaller base text */}
                                <thead className="bg-[#111827]">
                                    <tr>
                                        {/* Header Cells - Adjusted Padding */}
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-8">#</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('ticker')}>
                                            TICKER/NAME {getSortIcon('ticker')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('totalShares')}>
                                            SHARES {getSortIcon('totalShares')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('currentPrice')}>
                                            PRICE {getSortIcon('currentPrice')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('totalValue')}>
                                            VALUE {getSortIcon('totalValue')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">ACCT %</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('avgCostPerShare')}>
                                            COST/SHARE {getSortIcon('avgCostPerShare')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('totalCostBasis')}>
                                            COST BASIS {getSortIcon('totalCostBasis')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('gainLoss')}>
                                            GAIN/LOSS {getSortIcon('gainLoss')}
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {positionsWithPercentage.length > 0 ? (
                                        positionsWithPercentage.map((positionGroup, index) => (
                                            <tr
                                                key={`${positionGroup.ticker}-${index}`}
                                                className="hover:bg-[#172234] transition-colors" // Row hover
                                                // onClick={(e) => handleViewPositionClick(e, positionGroup)} // Optional: row click triggers view details
                                                >
                                                {/* Row Cells - Adjusted Padding & Font Size */}
                                                <td className="px-2 py-2 text-center whitespace-nowrap text-xs text-gray-400">{index + 1}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="font-medium text-white">{positionGroup.ticker}</div>
                                                    <div className="text-xs text-gray-400 capitalize">
                                                        {positionGroup.name !== positionGroup.ticker ? positionGroup.name : (positionGroup.asset_type || '').replace(/_/g, ' ') || 'Security'}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">{formatNumber(positionGroup.totalShares, { maximumFractionDigits: 6 })}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">{formatCurrency(positionGroup.currentPrice)}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">{formatCurrency(positionGroup.totalValue)}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">{formatPercentage(positionGroup.accountPercentage)}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">{formatCurrency(positionGroup.avgCostPerShare)}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">{formatCurrency(positionGroup.totalCostBasis)}</td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                    <div className={`font-medium ${positionGroup.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {positionGroup.gainLoss >= 0 ? '+' : ''}{formatCurrency(positionGroup.gainLoss)}
                                                    </div>
                                                    <div className={`text-[11px] ${positionGroup.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}> {/* Slightly different color for % */}
                                                        ({positionGroup.gainLoss >= 0 ? '+' : ''}{formatPercentage(positionGroup.gainLossPercent)})
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center space-x-1.5">
                                                        {/* View Details Button */}
                                                        <button
                                                            onClick={(e) => handleViewPositionClick(e, positionGroup)}
                                                            className="p-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors"
                                                            title="View Tax Lots"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        {/* Modify Position Button */}
                                                        <button
                                                            onClick={(e) => handleModifyPositionClick(e, positionGroup)}
                                                            className="p-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/40 transition-colors"
                                                            title="Modify/Delete Tax Lots"
                                                        >
                                                            <List className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="10" className="px-4 py-6 text-center text-gray-400 italic"> {/* Increased padding */}
                                                No positions found in this account. Add one using the button below.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer with Actions - FIXED z-index */}
                <div className="bg-[#111827] px-5 py-3 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0 relative z-10"> {/* Added relative z-10 */}
                    {/* Buttons no longer need individual z-index */}
                    <AddPositionButton
                        accountId={account?.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors" // Adjusted style
                        buttonContent={<div className="flex items-center"><Plus className="w-4 h-4 mr-1.5" /> Add Position</div>}
                        onPositionAdded={() => {
                            onTriggerAddPosition(account);
                            // Maybe don't close automatically, let parent decide
                            // onClose();
                        }}
                    />
                    <EditAccountButton
                        account={account}
                        className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors flex items-center" // Adjusted style
                        onAccountEdited={() => {
                            onTriggerEdit(account);
                            onClose(); // Close after triggering edit
                        }}
                        buttonContent={<div className="flex items-center"><Settings className="w-4 h-4 mr-1.5" /> Edit Account</div>}
                    />
                    <button
                        onClick={() => {
                            // Add confirmation before triggering delete
                             if (window.confirm(`Are you sure you want to delete the account "${account.account_name}"? This action cannot be undone.`)) {
                                onTriggerDelete(account);
                                onClose(); // Close after triggering delete
                             }
                        }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center text-sm transition-colors" // Adjusted style
                    >
                        <Trash className="w-4 h-4 mr-1.5" /> Delete Account
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors" // Adjusted style
                    >
                        Close
                    </button>
                </div>

            </div> {/* End Modal Dialog */}

            {/* Render Nested Modals Conditionally */}
            {isTaxLotModalOpen && selectedTickerForDetail && (
                <TaxLotDetailModal
                    isOpen={isTaxLotModalOpen}
                    onClose={handleCloseTaxLotModal}
                    ticker={selectedTickerForDetail}
                    positions={getPositionsForTicker(selectedTickerForDetail)}
                    onEditTaxLot={handleEditTaxLot} // Pass handler
                    onDeleteTaxLot={handleDeleteTaxLot} // Pass handler
                />
            )}

            {isModifyModalOpen && selectedTickerForModify && (
                <PositionModifyModal
                    isOpen={isModifyModalOpen}
                    onClose={handleCloseModifyModal}
                    ticker={selectedTickerForModify}
                    positions={getPositionsForTicker(selectedTickerForModify)}
                    onEditSelectedTaxLot={handleEditSelectedTaxLot} // Pass handler
                    onDeleteSelectedTaxLot={handleDeleteSelectedTaxLot} // Pass handler
                />
            )}

        </div> // End Main Modal Container
    );
};

export default AccountDetailModal;