// components/modals/AccountDetailModal.js
import React, { useState, useMemo, useCallback } from 'react';
// --- Import React Portal if needed ---
// import ReactDOM from 'react-dom'; // If using Portals

import { BarChart4, ChevronDown, ChevronUp, DollarSign, TrendingUp, Plus, Settings, Trash, Edit, Eye, List } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';
import AddPositionButton from '@/components/AddPositionButton';
import EditAccountButton from '@/components/EditAccountButton';

// --- Nested Modals (No changes needed inside these components themselves) ---

// Tax Lot Detail Modal Component
const TaxLotDetailModal = ({ isOpen, onClose, ticker, positions, onEditTaxLot, onDeleteTaxLot }) => {
    // ... (Keep the existing TaxLotDetailModal code from the previous version)
    // Remember it has z-[200] on its outermost div
     if (!isOpen || !positions) return null; // Simplified guard

    return (
        // IMPORTANT: For best results, wrap this in a React Portal:
        // ReactDOM.createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center">
            {/* Rest of TaxLotDetailModal code... */}
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
                            {positions && positions.length > 0 ? positions.map((position, index) => {
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
                            }) : (
                                 <tr>
                                     <td colSpan="7" className="text-center py-4 text-gray-400">
                                         No individual tax lots found for this ticker/asset type.
                                     </td>
                                 </tr>
                             )}
                        </tbody>
                    </table>
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
        // , document.getElementById('modal-root') // Target element for Portal
        // ) // End Portal
    );
};

// Position Modify Modal Component
const PositionModifyModal = ({ isOpen, onClose, ticker, positions, onEditSelectedTaxLot, onDeleteSelectedTaxLot }) => {
    // ... (Keep the existing PositionModifyModal code from the previous version)
    // Remember it has z-[200] on its outermost div
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

    if (!isOpen || !positions) return null; // Simplified guard


    return (
        // IMPORTANT: For best results, wrap this in a React Portal:
        // ReactDOM.createPortal(
         <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center">
            {/* Rest of PositionModifyModal code... */}
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
                                {positions && positions.length > 0 ? positions.map((position, index) => (
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
                                )) : (
                                     <tr>
                                         <td colSpan="5" className="text-center py-4 text-gray-400">
                                             No individual tax lots found for this ticker/asset type.
                                         </td>
                                     </tr>
                                )}
                            </tbody>
                        </table>
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
        // , document.getElementById('modal-root') // Target element for Portal
        // ) // End Portal
    );
};


// --- Main AccountDetailModal Component ---

const AccountDetailModal = ({
    isOpen,
    onClose = () => {},
    account,
    onTriggerEdit = (acc) => console.log("Trigger Edit Account:", acc),
    onTriggerDelete = (acc) => console.log("Trigger Delete Account:", acc),
    onTriggerAddPosition = (acc) => console.log("Trigger Add Position for Account:", acc),
    onEditPosition = (pos) => console.log("Edit Position/Tax Lot:", pos),
    onDeletePosition = (pos) => console.log("Delete Position/Tax Lot:", pos),
}) => {
    const [sortField, setSortField] = useState('totalValue');
    const [sortDirection, setSortDirection] = useState('desc');
    const [selectedGroupKeyForDetail, setSelectedGroupKeyForDetail] = useState(null); // Use groupKey now
    const [selectedGroupKeyForModify, setSelectedGroupKeyForModify] = useState(null); // Use groupKey now
    const [isTaxLotModalOpen, setIsTaxLotModalOpen] = useState(false);
    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);

    // --- Data Calculation ---
    const totalValue = account?.total_value ?? 0;
    const costBasis = account?.total_cost_basis ?? 0;
    const gainLoss = totalValue - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) : 0;
    const positionsCount = account?.positions?.length ?? 0;

    // --- Group positions by Ticker > Asset Type > 'Unknown' ---
    const groupedPositions = useMemo(() => {
        // Expecting account.positions: [{ id, ticker?, name?, asset_type?, shares?, quantity?, value?, cost_basis?, current_price?, purchase_date?, ... }]
        if (!account?.positions || !Array.isArray(account.positions) || account.positions.length === 0) {
            return [];
        }

        const grouped = account.positions.reduce((groups, position) => {
            if (typeof position !== 'object' || position === null) {
                console.warn("Skipping invalid position item:", position);
                return groups;
            }

            // --- Determine Grouping Key ---
            const ticker = position.ticker?.trim(); // Use ticker if available and not just whitespace
            // Standardize asset type for grouping (optional but good practice)
            const assetTypeRaw = position.asset_type?.trim();
            let assetType = assetTypeRaw;
            // Example standardization:
            // if (assetTypeRaw?.toLowerCase().includes('stock')) assetType = 'Security';
            // else if (assetTypeRaw?.toLowerCase().includes('crypto')) assetType = 'Crypto';
             // ... etc. Keep it simple for now based on user list:
             const validAssetTypes = ['Security', 'Crypto', 'Real Estate', 'Cash', 'Metals']; // Example list
             if (assetTypeRaw && !validAssetTypes.some(t => assetTypeRaw.toLowerCase() === t.toLowerCase())) {
                 // If asset type exists but isn't in our known list, maybe default to 'Security' or keep raw?
                 // For now, we only use it if Ticker is missing, so let's keep it raw if present.
                 assetType = assetTypeRaw;
             } else if (assetTypeRaw) {
                // Find the canonical capitalization if it matches case-insensitively
                assetType = validAssetTypes.find(t => assetTypeRaw.toLowerCase() === t.toLowerCase()) || assetTypeRaw;
             }


            const groupKey = ticker || assetType || 'Unknown'; // Group by Ticker > Asset Type > Unknown
            // -----------------------------

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupingKey: groupKey, // The key used for this group (ticker or asset type)
                    isTickerGroup: !!ticker, // Flag to know if grouped by ticker
                    ticker: ticker || null, // Store original ticker
                    asset_type: assetType || 'Unknown', // Store standardized/raw asset type
                    name: position.name || (ticker ? '' : groupKey), // Best guess for display name
                    positions: [],
                    totalShares: 0,
                    totalValue: 0,
                    totalCostBasis: 0,
                    currentPrice: parseFloat(position.current_price || position.price || 0), // Representative price
                };
            }

            groups[groupKey].positions.push(position);

            // Aggregate values (robust parsing)
            const positionShares = parseFloat(position.shares || position.quantity || 0);
            const positionValue = parseFloat(position.value || 0);
            const positionCostPerShare = parseFloat(position.cost_basis || 0);
            const positionCostBasis = positionShares * positionCostPerShare;

            if (!isNaN(positionShares)) groups[groupKey].totalShares += positionShares;
            if (!isNaN(positionValue)) groups[groupKey].totalValue += positionValue;
            if (!isNaN(positionCostBasis)) groups[groupKey].totalCostBasis += positionCostBasis;

             // Update representative price (optional logic)
            const currentItemPrice = parseFloat(position.current_price || position.price || 0);
            if (!isNaN(currentItemPrice) && currentItemPrice > 0 && groups[groupKey].currentPrice <= 0) {
                 groups[groupKey].currentPrice = currentItemPrice;
            }
             // Try to get a better Name if the first item didn't have one
             if (!groups[groupKey].name && position.name) {
                 groups[groupKey].name = position.name;
             }


            return groups;
        }, {});

        // Convert to array and calculate derived metrics
        return Object.values(grouped).map(group => {
            group.avgCostPerShare = group.totalShares > 0 ? group.totalCostBasis / group.totalShares : 0;
            group.gainLoss = group.totalValue - group.totalCostBasis;
            group.gainLossPercent = group.totalCostBasis > 0 ? (group.gainLoss / group.totalCostBasis) : 0;
            // Ensure derived values are numbers
            group.avgCostPerShare = isNaN(group.avgCostPerShare) ? 0 : group.avgCostPerShare;
            group.gainLoss = isNaN(group.gainLoss) ? 0 : group.gainLoss;
            group.gainLossPercent = isNaN(group.gainLossPercent) ? 0 : group.gainLossPercent;
            // If name is still blank, use the grouping key
            if (!group.name) group.name = group.groupingKey;
            return group;
        });
    }, [account?.positions]);

    // --- Sorting grouped positions (using groupingKey for sorting ticker/name column) ---
    const sortedGroupedPositions = useMemo(() => {
        if (!groupedPositions.length) return [];

        return [...groupedPositions].sort((a, b) => {
            let aValue, bValue;
            const field = sortField;

            // Handle string comparison for the primary grouping column
            if (field === 'groupingKey') { // Sort by the displayed group key
                const compareResult = (a.groupingKey || '').localeCompare(b.groupingKey || '');
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
                // Add case for asset_type if you want to sort by it separately
                // case 'asset_type':
                //     const compareResult = (a.asset_type || '').localeCompare(b.asset_type || '');
                //     return sortDirection === 'asc' ? compareResult : -compareResult;
                default:              aValue = a.totalValue; bValue = b.totalValue; // Default sort
            }

            aValue = aValue ?? 0;
            bValue = bValue ?? 0;

            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [groupedPositions, sortField, sortDirection]);

    // --- Calculate account percentages ---
     const positionsWithPercentage = useMemo(() => {
        if (!sortedGroupedPositions.length || totalValue <= 0) {
             return sortedGroupedPositions.map(pos => ({ ...pos, accountPercentage: 0 }));
        }
        return sortedGroupedPositions.map(pos => ({
            ...pos,
            accountPercentage: (pos.totalValue / totalValue) // As fraction
        }));
    }, [sortedGroupedPositions, totalValue]);


    // --- Event Handlers ---
    const handleSort = useCallback((field) => {
        setSortField(prevField => {
            if (prevField === field) {
                setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortDirection('desc');
            }
            return field;
        });
    }, []);

    const getSortIcon = useCallback((field) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 inline-block" /> : <ChevronDown className="w-3 h-3 ml-1 inline-block" />;
    }, [sortField, sortDirection]);


    // --- Nested Modal Handlers (Using groupKey) ---
    const handleViewPositionClick = useCallback((e, positionGroup) => {
        e.stopPropagation();
        setSelectedGroupKeyForDetail(positionGroup.groupingKey); // Use groupKey
        setIsTaxLotModalOpen(true);
    }, []);

    const handleModifyPositionClick = useCallback((e, positionGroup) => {
        e.stopPropagation();
        setSelectedGroupKeyForModify(positionGroup.groupingKey); // Use groupKey
        setIsModifyModalOpen(true);
    }, []);

    const handleCloseTaxLotModal = useCallback(() => {
        setIsTaxLotModalOpen(false);
        setTimeout(() => setSelectedGroupKeyForDetail(null), 300);
    }, []);

    const handleCloseModifyModal = useCallback(() => {
        setIsModifyModalOpen(false);
        setTimeout(() => setSelectedGroupKeyForModify(null), 300);
    }, []);

    // Get individual positions (tax lots) for the selected groupKey
    const getPositionsForGroupKey = useCallback((key) => {
        const group = groupedPositions.find(g => g.groupingKey === key);
        return group ? group.positions : [];
    }, [groupedPositions]);


    // --- Placeholder Handlers for Tax Lot Edit/Delete ---
    const handleEditTaxLot = useCallback((taxLot) => {
        console.log("Request to EDIT Tax Lot:", taxLot);
        onEditPosition(taxLot);
    }, [onEditPosition]);

    const handleDeleteTaxLot = useCallback((taxLot) => {
        console.log("Request to DELETE Tax Lot:", taxLot);
         if (window.confirm(`DELETE Tax Lot?\n${taxLot.ticker || taxLot.name || taxLot.asset_type}\nShares: ${taxLot.shares || taxLot.quantity}\nDate: ${formatDate(taxLot.purchase_date)}`)) {
            onDeletePosition(taxLot);
         }
    }, [onDeletePosition]);

    const handleEditSelectedTaxLot = useCallback((selectedId) => {
         const key = selectedGroupKeyForModify;
         if (!key || !selectedId) return;
         const positions = getPositionsForGroupKey(key);
         const taxLotToEdit = positions.find(p => p.id === selectedId);
         if (taxLotToEdit) {
            console.log("Request to EDIT Selected Tax Lot:", taxLotToEdit);
            onEditPosition(taxLotToEdit);
            handleCloseModifyModal();
         }
    }, [selectedGroupKeyForModify, getPositionsForGroupKey, onEditPosition, handleCloseModifyModal]);

    const handleDeleteSelectedTaxLot = useCallback((selectedId) => {
        const key = selectedGroupKeyForModify;
        if (!key || !selectedId) return;
        const positions = getPositionsForGroupKey(key);
        const taxLotToDelete = positions.find(p => p.id === selectedId);
        if (taxLotToDelete) {
             console.log("Request to DELETE Selected Tax Lot:", taxLotToDelete);
             if (window.confirm(`DELETE Selected Tax Lot?\n${taxLotToDelete.ticker || taxLotToDelete.name || taxLotToDelete.asset_type}\nShares: ${taxLotToDelete.shares || taxLotToDelete.quantity}\nDate: ${formatDate(taxLotToDelete.purchase_date)}`)) {
                 onDeletePosition(taxLotToDelete);
                 handleCloseModifyModal();
             }
        }
    }, [selectedGroupKeyForModify, getPositionsForGroupKey, onDeletePosition, handleCloseModifyModal]);


    // --- Render ---
    if (!isOpen || !account) return null;

    return (
        // Main Modal Container & Backdrop - z-[100]
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center">
            {/* Modal Dialog */}
            <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl m-4 flex flex-col max-h-[90vh]">

                {/* Header (No z-index needed) */}
                <div className="p-5 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700 flex-shrink-0">
                    {/* ... header content ... */}
                     <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-3">
                            <span className="font-bold text-blue-800 text-xl">{account?.account_name?.charAt(0)?.toUpperCase() || '?'}</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">{account?.account_name || 'Account Details'}</h2>
                            <div className="flex items-center text-xs text-blue-200 flex-wrap gap-x-1.5 mt-0.5">
                                <span>{account?.institution || "N/A"}</span>
                                {account?.type && (<><span className="opacity-50">•</span><span>{account.type}</span></>)}
                                <span className="opacity-50">•</span>
                                <span>Last updated: {formatDate(account?.updated_at) || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body Content (No z-index needed) */}
                <div className="bg-[#111827] p-5 space-y-5 overflow-y-auto flex-grow">
                    {/* Account Metrics */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* ... metric cards ... */}
                         <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center"><DollarSign className='w-2.5 h-2.5 mr-1'/>CURRENT VALUE</div>
                            <div className="text-lg font-bold">{formatCurrency(totalValue)}</div>
                        </div>
                         <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center"><DollarSign className='w-2.5 h-2.5 mr-1'/>COST BASIS</div>
                            <div className="text-lg font-bold">{formatCurrency(costBasis)}</div>
                        </div>
                         <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center"><TrendingUp className='w-2.5 h-2.5 mr-1'/>GAIN/LOSS</div>
                            <div className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                <span className="block text-[11px] font-medium">({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})</span>
                            </div>
                        </div>
                         <div className="bg-[#1e293b] rounded-lg p-3">
                            <div className="text-gray-400 text-[10px] mb-0.5 uppercase flex items-center"><BarChart4 className='w-2.5 h-2.5 mr-1'/>POSITIONS</div>
                            <div className="text-lg font-bold">{positionsCount}</div> {/* This might be confusing now - it's tax lots, not groups */}
                        </div>
                    </div>

                    {/* Positions Table Section */}
                    <div className="bg-[#1e293b]/80 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-base text-white">Account Holdings (Grouped)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-full divide-y divide-gray-700 text-sm">
                                <thead className="bg-[#111827]">
                                    <tr>
                                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-8">#</th>
                                        {/* --- Updated Header --- */}
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('groupingKey')}>
                                            TICKER / ASSET TYPE {getSortIcon('groupingKey')}
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
                                            <tr key={`${positionGroup.groupingKey}-${index}`} className="hover:bg-[#172234] transition-colors">
                                                <td className="px-2 py-2 text-center whitespace-nowrap text-xs text-gray-400">{index + 1}</td>
                                                 {/* --- Updated Display Column --- */}
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="font-medium text-white">{positionGroup.groupingKey}</div>
                                                    <div className="text-xs text-gray-400 capitalize">
                                                        {/* Show name if different from grouping key, or show asset type if grouped by ticker */}
                                                        {positionGroup.name !== positionGroup.groupingKey ? positionGroup.name : (positionGroup.isTickerGroup ? positionGroup.asset_type : '')}
                                                    </div>
                                                </td>
                                                {/* --- Rest of the columns --- */}
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
                                                    <div className={`text-[11px] ${positionGroup.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        ({positionGroup.gainLoss >= 0 ? '+' : ''}{formatPercentage(positionGroup.gainLossPercent)})
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center space-x-1.5">
                                                        <button onClick={(e) => handleViewPositionClick(e, positionGroup)} className="p-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors" title="View Tax Lots">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={(e) => handleModifyPositionClick(e, positionGroup)} className="p-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/40 transition-colors" title="Modify/Delete Tax Lots">
                                                            <List className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="10" className="px-4 py-6 text-center text-gray-400 italic">No positions found in this account.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer (No z-index needed here, removed relative z-10) */}
                <div className="bg-[#111827] px-5 py-3 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0">
                    {/* ... footer buttons ... */}
                    <AddPositionButton
                        accountId={account?.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors"
                        buttonContent={<div className="flex items-center"><Plus className="w-4 h-4 mr-1.5" /> Add Position</div>}
                        onPositionAdded={() => onTriggerAddPosition(account)}
                    />
                    <EditAccountButton
                        account={account}
                        className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors flex items-center"
                        onAccountEdited={() => { onTriggerEdit(account); onClose(); }}
                        buttonContent={<div className="flex items-center"><Settings className="w-4 h-4 mr-1.5" /> Edit Account</div>}
                    />
                    <button
                        onClick={() => { if (window.confirm(`DELETE Account "${account.account_name}"?`)) { onTriggerDelete(account); onClose(); } }}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center text-sm transition-colors"
                    >
                        <Trash className="w-4 h-4 mr-1.5" /> Delete Account
                    </button>
                    <button onClick={onClose} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors">
                        Close
                    </button>
                </div>
            </div> {/* End Modal Dialog */}

            {/* Render Nested Modals Conditionally (These have z-[200]) */}
            {/* Consider using React Portals here for robustness */}
            {isTaxLotModalOpen && selectedGroupKeyForDetail && (
                <TaxLotDetailModal
                    isOpen={isTaxLotModalOpen}
                    onClose={handleCloseTaxLotModal}
                    ticker={selectedGroupKeyForDetail} // Pass groupKey as 'ticker' prop for display
                    positions={getPositionsForGroupKey(selectedGroupKeyForDetail)}
                    onEditTaxLot={handleEditTaxLot}
                    onDeleteTaxLot={handleDeleteTaxLot}
                />
            )}

            {isModifyModalOpen && selectedGroupKeyForModify && (
                <PositionModifyModal
                    isOpen={isModifyModalOpen}
                    onClose={handleCloseModifyModal}
                    ticker={selectedGroupKeyForModify} // Pass groupKey as 'ticker' prop for display
                    positions={getPositionsForGroupKey(selectedGroupKeyForModify)}
                    onEditSelectedTaxLot={handleEditSelectedTaxLot}
                    onDeleteSelectedTaxLot={handleDeleteSelectedTaxLot}
                />
            )}

        </div> // End Main Modal Container
    );
};

export default AccountDetailModal;