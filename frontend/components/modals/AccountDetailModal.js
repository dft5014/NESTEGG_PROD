// components/modals/AccountDetailModal.js
import React from 'react';
// *** Make sure all necessary icons are imported ***
import { Briefcase, X, Settings, Trash, Plus, BarChart4, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';

// ModalPositionTable component remains the same as before...
const ModalPositionTable = ({ positions = [], onPositionClick }) => {
    // ... (previous code for ModalPositionTable) ...
    if (!positions || positions.length === 0) {
        return <div className="p-4 text-center text-gray-400 text-sm">No positions found in this account.</div>;
    }

    return (
        <div className="overflow-x-auto max-h-60"> {/* Limit height and allow scroll */}
            <table className="w-full text-sm">
                <thead className="bg-gray-800 sticky top-0"> {/* Make header sticky within scroll */}
                    <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Asset/Ticker</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Quantity/Shares</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Gain/Loss</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                    {positions.map(pos => {
                        const gainLossAmount = pos.gain_loss_amount ?? 0;
                        const gainLossPercent = pos.gain_loss_percent ?? 0;
                        const value = pos.value ?? 0;
                        const quantityOrShares = pos.quantity_or_shares ?? 'N/A';

                        return (
                            <tr
                                key={`${pos.asset_type}-${pos.id}`} // Use a unique key
                                className="hover:bg-gray-600/50 transition-colors"
                            >
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="font-medium">{pos.ticker_or_name}</div>
                                    <div className="text-xs text-gray-400 capitalize">{pos.asset_type.replace('_', ' ')}</div>
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap hidden sm:table-cell">
                                    {typeof quantityOrShares === 'number' ? quantityOrShares.toLocaleString(undefined, { maximumFractionDigits: 4 }) : quantityOrShares}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{formatCurrency(value)}</td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                    <div className={`font-medium text-xs ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                                    </div>
                                    <div className={`text-xs ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        ({gainLossAmount >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


const AccountDetailModal = ({
    isOpen,
    onClose,
    account,
    // Action handlers passed from the parent component
    onEditRequest,
    onDeleteRequest,
    onAddPositionRequest
}) => {
    if (!isOpen || !account) {
        return null;
    }

    // Data calculation remains the same...
    const costBasis = account.total_cost_basis ?? 0;
    const gainLoss = account.total_gain_loss ?? 0;
    const gainLossPercent = account.total_gain_loss_percent ?? 0;
    const positionsCount = account.positions_count ?? account.positions?.length ?? 0;
    const totalValue = account.total_value ?? 0;

    // --- Handler Functions specific to this modal calling parent handlers ---
    const handleAddPosition = (e) => {
        e.stopPropagation(); // Prevent closing modal if needed
        if (onAddPositionRequest) {
            onAddPositionRequest(account.id); // Pass account ID to parent
            // Optional: Close this modal after triggering add? Or let parent handle?
            // onClose();
        } else {
            console.warn("AccountDetailModal: onAddPositionRequest prop not provided.");
            alert("Add position functionality not available."); // Placeholder feedback
        }
    };

    const handleEditAccount = (e) => {
        e.stopPropagation();
        if (onEditRequest) {
            onEditRequest(account); // Pass full account object to parent
             onClose(); // Close detail modal after triggering edit
        } else {
            console.warn("AccountDetailModal: onEditRequest prop not provided.");
            alert("Edit account functionality not available.");
        }
    };

    const handleDeleteAccount = (e) => {
        e.stopPropagation();
        if (onDeleteRequest) {
            onDeleteRequest(account); // Pass full account object to parent
             onClose(); // Close detail modal after triggering delete confirmation
        } else {
            console.warn("AccountDetailModal: onDeleteRequest prop not provided.");
            alert("Delete account functionality not available.");
        }
    };


    return (
        // Using z-index values that worked previously
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop overlay (using the version without backdrop-blur) */}


                {/* Centering span */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal content window */}
                <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:w-full z-[1010]">
                    {/* Header */}
                    <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-gradient-to-r from-blue-900/80 to-blue-700/80">
                        {/* ... (header content remains the same) ... */}
                         <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-4">
                                <span className="font-bold text-blue-800 text-lg">{account.account_name?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{account.account_name}</h3>
                                <div className="flex items-center text-sm text-blue-200/90 flex-wrap gap-x-1.5">
                                    <span>{account.institution || "N/A"}</span>
                                    {account.type && (<><span className="opacity-50">•</span><span>{account.type}</span></>)}
                                    <span className="opacity-50">•</span>
                                    <span>Last updated: {formatDate(account.updated_at)}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 bg-gray-800 space-y-6 max-h-[75vh] overflow-y-auto">
                        {/* Account Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {/* ... (metrics cards remain the same) ... */}
                            <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1'/>Current Value</div><div className="text-lg font-bold">{formatCurrency(totalValue)}</div></div>
                            <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1'/>Cost Basis</div><div className="text-lg font-bold">{formatCurrency(costBasis)}</div></div>
                            <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><TrendingUp className='w-3 h-3 mr-1'/>Gain/Loss</div><div className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>{gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}<span className="block text-xs font-normal">({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})</span></div></div>
                            <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><BarChart4 className='w-3 h-3 mr-1'/>Positions</div><div className="text-lg font-bold">{positionsCount}</div></div>
                        </div>

                        {/* Positions Table Section */}
                        <div className="bg-gray-700/60 rounded-lg overflow-hidden">
                           {/* ... (table header remains the same) ... */}
                           <div className="flex justify-between items-center px-4 py-3 bg-gray-700 border-b border-gray-600">
                                <h4 className="font-medium text-base">Account Holdings</h4>
                                {/* Removed Add Position button from here, moved to footer */}
                           </div>
                            <ModalPositionTable
                                positions={account.positions || []}
                            />
                        </div>
                    </div>

                    {/* Footer with Actions *** MODIFIED HERE *** */}
                     <div className="bg-gray-900/50 px-6 py-4 flex justify-end items-center space-x-3 border-t border-gray-700">
                       {/* Add Position Button */}
                       {onAddPositionRequest && (
                            <button
                                title="Add Position to this Account"
                                onClick={handleAddPosition}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm" // Use standard button style
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Position
                            </button>
                       )}
                       {/* Edit Account Button */}
                       {onEditRequest && (
                            <button
                                title="Edit this Account"
                                onClick={handleEditAccount}
                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm" // Use standard button style
                            >
                                <Settings className="w-4 h-4 mr-1" />
                                Edit Account
                            </button>
                       )}
                       {/* Delete Account Button */}
                       {onDeleteRequest && (
                            <button
                                title="Delete this Account"
                                onClick={handleDeleteAccount}
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm" // Use standard button style
                            >
                                <Trash className="w-4 h-4 mr-1" />
                                Delete Account
                            </button>
                       )}
                       {/* Existing Close Button */}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountDetailModal;