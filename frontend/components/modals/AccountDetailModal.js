// components/modals/AccountDetailModal.js
import React, { useState, useMemo, useCallback } from 'react';
// --- Import React Portal if needed ---
// import ReactDOM from 'react-dom'; // If using Portals

import { BarChart4, ChevronDown, ChevronUp, DollarSign, TrendingUp, Plus, Settings, Trash, Edit, Eye, List } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';
import AddPositionButton from '@/components/AddPositionButton';
import EditAccountButton from '@/components/EditAccountButton';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';


// --- Nested Modals (No changes needed inside these components themselves) ---

// Tax Lot Detail Modal Component - Updated for unified data model
const TaxLotDetailModal = ({ isOpen, onClose, ticker, positions, onEditTaxLot, onDeleteTaxLot }) => {
    const [sortField, setSortField] = useState('purchase_date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [positionToEdit, setPositionToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [positionToDelete, setPositionToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Handle sorting
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Get sort icon
    const getSortIcon = (field) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? 
            <ChevronUp className="w-3 h-3 ml-1 inline-block" /> : 
            <ChevronDown className="w-3 h-3 ml-1 inline-block" />;
    };

    // Sort positions
    const sortedPositions = useMemo(() => {
        if (!positions || !positions.length) return [];
        
        return [...positions].sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case 'purchase_date':
                    // Convert dates to timestamps for comparison
                    const dateA = new Date(a.purchase_date || 0).getTime();
                    const dateB = new Date(b.purchase_date || 0).getTime();
                    comparison = dateA - dateB;
                    break;
                case 'current_value':
                    comparison = parseFloat(a.current_value || 0) - parseFloat(b.current_value || 0);
                    break;
                case 'current_price':
                    comparison = parseFloat(a.current_price_per_unit || 0) - parseFloat(b.current_price_per_unit || 0);
                    break;
                case 'total_cost':
                    comparison = parseFloat(a.total_cost_basis || 0) - parseFloat(b.total_cost_basis || 0);
                    break;
                case 'cost_unit':
                    comparison = parseFloat(a.cost_per_unit || 0) - parseFloat(b.cost_per_unit || 0);
                    break;
                case 'gain_loss':
                    const gainLossA = parseFloat(a.current_value || 0) - parseFloat(a.total_cost_basis || 0);
                    const gainLossB = parseFloat(b.current_value || 0) - parseFloat(b.total_cost_basis || 0);
                    comparison = gainLossA - gainLossB;
                    break;
                default:
                    comparison = 0;
            }
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [positions, sortField, sortDirection]);

    // Calculate totals
    const totals = useMemo(() => {
        if (!positions || !positions.length) return {
            totalShares: 0,
            totalCostBasis: 0,
            totalCurrentValue: 0,
            totalGainLoss: 0
        };
        
        return positions.reduce((acc, position) => {
            acc.totalShares += parseFloat(position.quantity || 0);
            acc.totalCostBasis += parseFloat(position.total_cost_basis || 0);
            acc.totalCurrentValue += parseFloat(position.current_value || 0);
            acc.totalGainLoss += parseFloat(position.current_value || 0) - parseFloat(position.total_cost_basis || 0);
            return acc;
        }, {
            totalShares: 0,
            totalCostBasis: 0,
            totalCurrentValue: 0,
            totalGainLoss: 0
        });
    }, [positions]);

    // Calculate gain/loss percent for totals
    const totalGainLossPercent = totals.totalCostBasis > 0 
        ? (totals.totalGainLoss / totals.totalCostBasis) * 100
        : 0;

    // Edit handler 
    const handleEditClick = (e, position) => {
        e.stopPropagation(); // Prevent row click
        setPositionToEdit(position);
        setIsEditModalOpen(true);
    };

    // Delete handler
    const handleDeleteClick = (e, position) => {
        e.stopPropagation(); // Prevent row click
        setPositionToDelete(position);
        setIsDeleteModalOpen(true);
    };

    // Confirmation handler for delete action
    const handleConfirmDelete = () => {
        if (!positionToDelete) return;
        
        // Call the passed onDeleteTaxLot function
        onDeleteTaxLot(positionToDelete);
        
        // Close the delete modal and reset state
        setIsDeleteModalOpen(false);
        setPositionToDelete(null);
    };

    // Handler for when position is saved successfully
    const handlePositionSaved = (updatedPosition) => {
        // Call parent's handler with the updated position
        if (updatedPosition) {
            onEditTaxLot(updatedPosition);
        } else if (positionToEdit) {
            onEditTaxLot(positionToEdit);
        }
        
        setIsEditModalOpen(false);
        setPositionToEdit(null);
    };

    // Delete Confirmation Modal Component (can be defined inside TaxLotDetailModal)
    const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, position }) => {
        if (!isOpen || !position) return null;
        
        return (
            <div className="fixed inset-0 z-[300] overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-[#1e293b] text-white rounded-xl p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold mb-2">Delete Position</h3>
                    <p className="mb-4">
                        Are you sure you want to delete this position? 
                        {position.ticker && <span className="font-medium"> ({position.ticker})</span>}
                        {position.purchase_date && <span className="block mt-1 text-sm text-gray-400">Purchased: {formatDate(position.purchase_date)}</span>}
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                            Delete Position
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null; // Simplified guard

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
                <div className="p-4 max-h-[calc(80vh-120px)] overflow-y-auto">
                    {positions && positions.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900/60 sticky top-0 z-10">
                                <tr>
                                    <th 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('purchase_date')}
                                    >
                                        Purchase Date {getSortIcon('purchase_date')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('current_value')}
                                    >
                                        Current Value {getSortIcon('current_value')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('current_price')}
                                    >
                                        Current Price {getSortIcon('current_price')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('total_cost')}
                                    >
                                        Cost Basis {getSortIcon('total_cost')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('cost_unit')}
                                    >
                                        Cost/Unit {getSortIcon('cost_unit')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('gain_loss')}
                                    >
                                        Gain/Loss {getSortIcon('gain_loss')}
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {sortedPositions.map((position, index) => {
                                    // Ensure robust parsing and defaults - Updated for unified model
                                    const shares = parseFloat(position.quantity || 0);
                                    // Using the new cost_per_unit field as primary source
                                    const costPerUnit = parseFloat(position.cost_per_unit || 0);
                                    const totalCost = parseFloat(position.total_cost_basis || 0);
                                    const currentPrice = parseFloat(position.current_price_per_unit || 0);
                                    const currentValue = parseFloat(position.current_value || 0);
                                    const gainLoss = currentValue - totalCost;
                                    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0; // Avoid division by zero

                                    return (
                                        <tr key={`lot-${position.id || index}`} className="hover:bg-gray-700/40">
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                                                {formatDate(position.purchase_date) || 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                                {formatCurrency(currentValue)}
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                                {formatCurrency(currentPrice)}
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                                {formatCurrency(totalCost)}
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                                {formatCurrency(costPerUnit)}
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                <div className={`text-sm ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                                    <span className="text-xs block">
                                                        ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center space-x-2">
                                                    {/* Edit Button - Matching SecurityTableAccount.js pattern */}
                                                    <button
                                                        onClick={(e) => handleEditClick(e, position)}
                                                        className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                                        title="Edit Position"
                                                    >
                                                        <Settings className="h-4 w-4" />
                                                    </button>
                                                    {/* Delete Button - Matching SecurityTableAccount.js pattern */}
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, position)}
                                                        className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-colors"
                                                        title="Delete Position"
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                
                                {/* Totals row */}
                                {sortedPositions.length > 0 && (
                                    <tr className="bg-gray-800/50 font-medium">
                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold">TOTAL</td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm font-semibold">
                                            {formatCurrency(totals.totalCurrentValue)}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {/* No average current price */}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm font-semibold">
                                            {formatCurrency(totals.totalCostBasis)}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {/* No average cost per unit */}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">
                                            <div className={`text-sm ${totals.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {totals.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totals.totalGainLoss)}
                                                <span className="text-xs block">
                                                    ({totals.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(totalGainLossPercent)})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            {/* No actions for totals row */}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            No positions found for this ticker.
                        </div>
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

            {/* Render Delete Confirmation Modal */}
            {isDeleteModalOpen && positionToDelete && (
                <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => { setIsDeleteModalOpen(false); setPositionToDelete(null); }}
                    onConfirm={handleConfirmDelete}
                    position={positionToDelete}
                />
            )}

            {/* Render Edit Modal */}
            {isEditModalOpen && positionToEdit && (
                <SecurityPositionModal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setPositionToEdit(null); }}
                    onPositionSaved={handlePositionSaved}
                    positionToEdit={positionToEdit}
                    accountId={positionToEdit.account_id}
                />
            )}
        </div>
    );
};

// Position Modify Modal Component - Updated for unified data model
const PositionModifyModal = ({ isOpen, onClose, ticker, positions, onEditSelectedTaxLot, onDeleteSelectedTaxLot }) => {
    const [selectedPositionId, setSelectedPositionId] = useState(null);
    const [sortField, setSortField] = useState('purchase_date');
    const [sortDirection, setSortDirection] = useState('desc');

    // Handle sorting
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Get sort icon
    const getSortIcon = (field) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? 
            <ChevronUp className="w-3 h-3 ml-1 inline-block" /> : 
            <ChevronDown className="w-3 h-3 ml-1 inline-block" />;
    };

    // Sort positions
    const sortedPositions = useMemo(() => {
        if (!positions || !positions.length) return [];
        
        return [...positions].sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case 'purchase_date':
                    // Convert dates to timestamps for comparison
                    const dateA = new Date(a.purchase_date || 0).getTime();
                    const dateB = new Date(b.purchase_date || 0).getTime();
                    comparison = dateA - dateB;
                    break;
                case 'quantity':
                    comparison = parseFloat(a.quantity || 0) - parseFloat(b.quantity || 0);
                    break;
                case 'cost_basis':
                    comparison = parseFloat(a.cost_basis || 0) - parseFloat(b.cost_basis || 0);
                    break;
                case 'current_value':
                    comparison = parseFloat(a.current_value || 0) - parseFloat(b.current_value || 0);
                    break;
                default:
                    comparison = 0;
            }
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [positions, sortField, sortDirection]);

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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center">
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
                                    <th 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('purchase_date')}
                                    >
                                        Purchase Date {getSortIcon('purchase_date')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('quantity')}
                                    >
                                        Quantity {getSortIcon('quantity')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('cost_basis')}
                                    >
                                        Cost/Unit {getSortIcon('cost_basis')}
                                    </th>
                                    <th 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('current_value')}
                                    >
                                        Value {getSortIcon('current_value')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {sortedPositions && sortedPositions.length > 0 ? sortedPositions.map((position, index) => (
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
                                            {formatNumber(position.quantity || 0, { maximumFractionDigits: 6 })}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatCurrency(position.cost_basis || 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap text-sm">
                                            {formatCurrency(position.current_value || 0)}
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

    // --- Group positions by Asset Type > Identifier ---
    const groupedPositions = useMemo(() => {
        // Using the unified positions format
        if (!account?.positions || !Array.isArray(account.positions) || account.positions.length === 0) {
            return [];
        }

        const grouped = account.positions.reduce((groups, position) => {
            if (typeof position !== 'object' || position === null) {
                console.warn("Skipping invalid position item:", position);
                return groups;
            }

            // --- Determine Grouping Key ---
            // In unified model, we use asset_type and identifier (which could be ticker, symbol, etc.)
            const assetType = position.asset_type?.trim() || 'Unknown';
            const identifier = position.identifier?.trim() || position.ticker?.trim() || 'Unknown';
            
            // Create a composite key for grouping
            const groupKey = `${assetType}:${identifier}`;
            
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupingKey: groupKey, // The composite key for this group
                    assetType: assetType,
                    identifier: identifier,
                    name: position.name || identifier, // Best guess for display name
                    positions: [],
                    totalShares: 0,
                    totalValue: 0,
                    totalCostBasis: 0,
                    currentPrice: parseFloat(position.current_price_per_unit || 0), // Representative price
                };
            }

            groups[groupKey].positions.push(position);

            // Aggregate values (robust parsing) - Updated for unified model
            const positionShares = parseFloat(position.quantity || 0);
            const positionValue = parseFloat(position.current_value || 0);
            const positionCostPerShare = parseFloat(position.cost_basis || 0);
            const positionCostBasis = parseFloat(position.total_cost_basis || 0);

            if (!isNaN(positionShares)) groups[groupKey].totalShares += positionShares;
            if (!isNaN(positionValue)) groups[groupKey].totalValue += positionValue;
            if (!isNaN(positionCostBasis)) groups[groupKey].totalCostBasis += positionCostBasis;

            // Update representative price (optional logic)
            const currentItemPrice = parseFloat(position.current_price_per_unit || 0);
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
            // If name is still blank, use the identifier
            if (!group.name) group.name = group.identifier;
            return group;
        });
    }, [account?.positions]);

    // --- Sorting grouped positions ---
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
                case 'assetType': 
                    const compareResult = (a.assetType || '').localeCompare(b.assetType || '');
                    return sortDirection === 'asc' ? compareResult : -compareResult;
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

    // Removed separate modify position click handler as we're consolidating with view
    // This is used to avoid the modify button in actions since the view button provides the same actions

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
        if (window.confirm(`DELETE Tax Lot?\n${taxLot.identifier || taxLot.ticker || taxLot.name || taxLot.asset_type}\nQuantity: ${taxLot.quantity}\nDate: ${formatDate(taxLot.purchase_date)}`)) {
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
            if (window.confirm(`DELETE Selected Tax Lot?\n${taxLotToDelete.identifier || taxLotToDelete.ticker || taxLotToDelete.name || taxLotToDelete.asset_type}\nQuantity: ${taxLotToDelete.quantity}\nDate: ${formatDate(taxLotToDelete.purchase_date)}`)) {
                onDeletePosition(taxLotToDelete);
                handleCloseModifyModal();
            }
        }
    }, [selectedGroupKeyForModify, getPositionsForGroupKey, onDeletePosition, handleCloseModifyModal]);

    // Get asset type icon
    const getAssetTypeIcon = (assetType) => {
        const type = assetType ? assetType.toLowerCase() : '';
        switch (type) {
            case 'security':
                return <BarChart4 className="w-3 h-3 mr-1" />;
            case 'crypto':
                return <div className="w-3 h-3 mr-1 text-xs">₿</div>;
            case 'metal':
                return <div className="w-3 h-3 mr-1 text-xs">Au</div>;
            case 'cash':
                return <div className="w-3 h-3 mr-1 text-xs">$</div>;
            case 'realestate':
                return <div className="w-3 h-3 mr-1 text-xs">🏠</div>;
            default:
                return null;
        }
    };

    // --- Render ---
    if (!isOpen || !account) return null;

    return (
        // Main Modal Container & Backdrop - z-[250] (increased to fix z-index issues)
        <div className="fixed inset-0 z-10 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center">
            {/* Modal Dialog */}
            <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl m-4 flex flex-col max-h-[90vh]">

                {/* Header (No z-index needed) */}
                <div className="p-5 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700 flex-shrink-0">
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
                            <div className="text-lg font-bold">{positionsCount}</div>
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
                                            ASSET / IDENTIFIER {getSortIcon('groupingKey')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('totalShares')}>
                                            QUANTITY {getSortIcon('totalShares')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('currentPrice')}>
                                            PRICE {getSortIcon('currentPrice')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('totalValue')}>
                                            VALUE {getSortIcon('totalValue')}
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">ACCT %</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('avgCostPerShare')}>
                                            COST/UNIT {getSortIcon('avgCostPerShare')}
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
                                        <>
                                            {/* Map through positions */}
                                            {positionsWithPercentage.map((positionGroup, index) => (
                                                <tr key={`${positionGroup.groupingKey}-${index}`} className="hover:bg-[#172234] transition-colors">
                                                    <td className="px-2 py-2 text-center whitespace-nowrap text-xs text-gray-400">{index + 1}</td>
                                                    {/* --- Updated Display Column --- */}
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div className="font-medium text-white flex items-center">
                                                            {getAssetTypeIcon(positionGroup.assetType)}
                                                            {positionGroup.identifier}
                                                        </div>
                                                        <div className="text-xs text-gray-400 capitalize">
                                                            {positionGroup.name !== positionGroup.identifier ? positionGroup.name : ''}
                                                        </div>
                                                    </td>
                                                    {/* --- Rest of the columns --- */}
                                                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                                                        {positionGroup.assetType?.toLowerCase() === 'cash' ? 
                                                        '' : 
                                                        formatNumber(positionGroup.totalShares, { maximumFractionDigits: 6 })}
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                                                        {positionGroup.assetType?.toLowerCase() === 'cash' ? 
                                                        '' : 
                                                        formatCurrency(positionGroup.currentPrice)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">{formatCurrency(positionGroup.totalValue)}</td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">{formatPercentage(positionGroup.accountPercentage)}</td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                                                        {positionGroup.assetType?.toLowerCase() === 'cash' ? 
                                                        '' : 
                                                        formatCurrency(positionGroup.avgCostPerShare)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">{formatCurrency(positionGroup.totalCostBasis)}</td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                                        {positionGroup.assetType?.toLowerCase() === 'cash' ? (
                                                            <div className="text-gray-500">N/A</div>
                                                        ) : (
                                                            <div>
                                                                <div className={`font-medium ${positionGroup.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {positionGroup.gainLoss >= 0 ? '+' : ''}{formatCurrency(positionGroup.gainLoss)}
                                                                </div>
                                                                <div className={`text-[11px] ${positionGroup.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                    ({positionGroup.gainLoss >= 0 ? '+' : ''}{formatPercentage(positionGroup.gainLossPercent)})
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center space-x-1.5">
                                                            <button onClick={(e) => handleViewPositionClick(e, positionGroup)} className="p-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors" title="View Tax Lots">
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            {/* Removed modify button as requested since view button provides the same actions */}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            
                                            {/* Total Row */}
                                            <tr className="bg-blue-800/30 font-semibold border-t-2 border-blue-700">
                                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                                    <span className="font-bold">•</span>
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="font-medium text-white">TOTAL</div>
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-100">
                                                    {/* No total for quantity/shares across different asset types */}
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-100">
                                                    {/* No average price */}
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                                                    {formatCurrency(totalValue)}
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                                                    100%
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-100">
                                                    {/* No average cost per unit */}
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                                                    {formatCurrency(costBasis)}
                                                </td>
                                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                                    <div>
                                                        <div className={`font-medium ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                                        </div>
                                                        <div className={`text-[11px] ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    {/* No actions */}
                                                </td>
                                            </tr>
                                        </>
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
                    <AddPositionButton
                        accountId={account?.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors z-5"
                        buttonContent={<div className="flex items-center"><Plus className="w-4 h-4 mr-1.5" /> Add Position</div>}
                        onPositionAdded={() => onTriggerAddPosition(account)}
                    />
                    <EditAccountButton
                        account={account}
                        className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-3 rounded-md text-sm transition-colors flex items-center z-5"
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
                    ticker={selectedGroupKeyForDetail.split(':')[1] || 'Unknown'} // Extract identifier from composite key
                    positions={getPositionsForGroupKey(selectedGroupKeyForDetail)}
                    onEditTaxLot={handleEditTaxLot}
                    onDeleteTaxLot={handleDeleteTaxLot}
                />
            )}

            {isModifyModalOpen && selectedGroupKeyForModify && (
                <PositionModifyModal
                    isOpen={isModifyModalOpen}
                    onClose={handleCloseModifyModal}
                    ticker={selectedGroupKeyForModify.split(':')[1] || 'Unknown'} // Extract identifier from composite key
                    positions={getPositionsForGroupKey(selectedGroupKeyForModify)}
                    onEditSelectedTaxLot={handleEditSelectedTaxLot}
                    onDeleteSelectedTaxLot={handleDeleteSelectedTaxLot}
                />
            )}

        </div> // End Main Modal Container
    );
};

export default AccountDetailModal;