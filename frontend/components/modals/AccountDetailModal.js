// components/modals/AccountDetailModal.js
import React from 'react';
import { Briefcase, X, Settings, Trash, Plus, BarChart4, DollarSign, Percent, TrendingUp } from 'lucide-react'; // Added TrendingUp
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';

// Simple Position Table component for inside the modal
const ModalPositionTable = ({ positions = [], onPositionClick }) => {
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
                        {/* Add more columns if needed */}
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
                                // onClick={() => onPositionClick(pos)} // Optional: Add click handler if needed
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
    // Optional handlers for actions triggered from within modal
    onEditRequest,
    onDeleteRequest,
    onAddPositionRequest // Assuming you might add positions from here later
}) => {
    if (!isOpen || !account) {
        return null;
    }

    // Use defaults for potentially missing data from the detailed account object
    const costBasis = account.total_cost_basis ?? 0;
    const gainLoss = account.total_gain_loss ?? 0;
    const gainLossPercent = account.total_gain_loss_percent ?? 0;
    const positionsCount = account.positions_count ?? account.positions?.length ?? 0;
    const totalValue = account.total_value ?? 0; // Use total_value passed from AccountTable

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto"> {/* Increased z-index */}
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}


                {/* Modal content */}
                {/* Make sure modal content is above overlay */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:w-full z-[1010]">
                    {/* Header */}
                    <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-gradient-to-r from-blue-900/80 to-blue-700/80">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-4">
                                <span className="font-bold text-blue-800 text-lg">{account.account_name?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{account.account_name}</h3>
                                <div className="flex items-center text-sm text-blue-200/90 flex-wrap gap-x-1.5">
                                    <span>{account.institution || "N/A"}</span>
                                    {account.type && (
                                        <>
                                            <span className="opacity-50">•</span>
                                            <span>{account.type}</span>
                                        </>
                                    )}
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
                    <div className="p-6 bg-gray-800 space-y-6 max-h-[75vh] overflow-y-auto"> {/* Added max-height and overflow */}
                        {/* Account Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-700/60 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1'/>Current Value</div>
                                <div className="text-lg font-bold">{formatCurrency(totalValue)}</div>
                            </div>
                            <div className="bg-gray-700/60 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1'/>Cost Basis</div>
                                <div className="text-lg font-bold">{formatCurrency(costBasis)}</div>
                            </div>
                             <div className="bg-gray-700/60 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><TrendingUp className='w-3 h-3 mr-1'/>Gain/Loss</div>
                                <div className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                    <span className="block text-xs font-normal">
                                        ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gray-700/60 rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><BarChart4 className='w-3 h-3 mr-1'/>Positions</div>
                                <div className="text-lg font-bold">{positionsCount}</div>
                            </div>
                        </div>

                        {/* Positions Table Section */}
                        <div className="bg-gray-700/60 rounded-lg overflow-hidden">
                            <div className="flex justify-between items-center px-4 py-3 bg-gray-700 border-b border-gray-600">
                                <h4 className="font-medium text-base">Account Holdings</h4>
                                {onAddPositionRequest && ( // Only show button if handler is passed
                                    <button
                                        onClick={() => onAddPositionRequest(account.id)}
                                        className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Position
                                    </button>
                                )}
                            </div>
                            {/* Render the inner position table using the 'positions' array from the account object */}
                            <ModalPositionTable
                                positions={account.positions || []} // Pass the positions array
                                // onPositionClick={(pos) => console.log("Clicked position in modal:", pos)}
                            />
                        </div>
                    </div>

                    {/* Footer with Actions */}
                     <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-700">
                       {onEditRequest && ( // Only show if handler is passed
                            <button
                                onClick={() => onEditRequest(account)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Edit Account
                            </button>
                       )}
                       {onDeleteRequest && ( // Only show if handler is passed
                            <button
                                onClick={() => onDeleteRequest(account)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm"
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete Account
                            </button>
                       )}
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