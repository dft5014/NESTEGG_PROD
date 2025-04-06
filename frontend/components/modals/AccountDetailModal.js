// components/modals/AccountDetailModal.js
import React, { useState, useMemo } from 'react';
import FixedModal from '@/components/modals/FixedModal'; // Assuming this provides Portal & base structure
import { Briefcase, X, Settings, Trash, Plus, BarChart4, DollarSign, Percent, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';

const AccountDetailModal = ({
    isOpen,
    onClose = () => {},
    account,
    // These props trigger handlers in AccountTable
    onTriggerEdit = () => {},
    onTriggerDelete = () => {},
    onTriggerAddPosition = () => {}
}) => {
    // Sorting state
    const [sortField, setSortField] = useState('value');
    const [sortDirection, setSortDirection] = useState('desc');

    // Data calculation
    const costBasis = account?.total_cost_basis ?? 0;
    const gainLoss = account?.total_gain_loss ?? 0;
    const gainLossPercent = account?.total_gain_loss_percent ?? 0;
    const positionsCount = account?.positions_count ?? account?.positions?.length ?? 0;
    const totalValue = account?.total_value ?? 0;

    // Sort positions
    const sortedPositions = useMemo(() => {
        if (!account?.positions) return [];
        
        return [...account.positions].sort((a, b) => {
            let aValue, bValue;
            
            switch (sortField) {
                case 'value':
                    aValue = a.value || 0;
                    bValue = b.value || 0;
                    break;
                case 'quantity':
                    aValue = a.quantity_or_shares || a.shares || a.quantity || 0;
                    bValue = b.quantity_or_shares || b.shares || b.quantity || 0;
                    break;
                case 'cost_basis':
                    aValue = a.cost_basis_total || (a.cost_basis * (a.shares || a.quantity || 1)) || 0;
                    bValue = b.cost_basis_total || (b.cost_basis * (b.shares || b.quantity || 1)) || 0;
                    break;
                case 'gain_loss':
                    aValue = a.gain_loss_amount || a.gain_loss || 0;
                    bValue = b.gain_loss_amount || b.gain_loss || 0;
                    break;
                default:
                    aValue = a.value || 0;
                    bValue = b.value || 0;
            }
            
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [account?.positions, sortField, sortDirection]);

    // Sorting handler
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to descending when changing fields
        }
    };

    // Get sort icon
    const getSortIcon = (field) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
    };

    // Handle button actions (same as AccountTable.js)
    const handleEditAccount = (e) => {
        e.stopPropagation();
        onClose();
        onTriggerEdit(account);
    };

    const handleDeleteAccount = (e) => {
        e.stopPropagation();
        onClose();
        onTriggerDelete(account);
    };

    const handleAddPosition = (e) => {
        e.stopPropagation();
        onClose();
        onTriggerAddPosition(account);
    };

    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title="" // No title, using custom header band
            size="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl"
        >
            {/* Dark-themed container without white border */}
            <div className="bg-gray-800 text-white">
                {/* Custom Header Band */}
                <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-gradient-to-r from-blue-900/80 to-blue-700/80">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-4">
                            <span className="font-bold text-blue-800 text-lg">{account?.account_name?.charAt(0) || '?'}</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{account?.account_name}</h3>
                            <div className="flex items-center text-sm text-blue-200/90 flex-wrap gap-x-1.5">
                                <span>{account?.institution || "N/A"}</span>
                                {account?.type && (<><span className="opacity-50">•</span><span>{account.type}</span></>)}
                                <span className="opacity-50">•</span>
                                <span>Last updated: {formatDate(account?.updated_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-6 max-h-[calc(75vh-140px)] overflow-y-auto">
                    {/* Account Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-700/60 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                <DollarSign className='w-3 h-3 mr-1'/>Current Value
                            </div>
                            <div className="text-lg font-bold">{formatCurrency(totalValue)}</div>
                        </div>
                        <div className="bg-gray-700/60 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                <DollarSign className='w-3 h-3 mr-1'/>Cost Basis
                            </div>
                            <div className="text-lg font-bold">{formatCurrency(costBasis)}</div>
                        </div>
                        <div className="bg-gray-700/60 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                <TrendingUp className='w-3 h-3 mr-1'/>Gain/Loss
                            </div>
                            <div className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                <span className="block text-xs font-normal">
                                    ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent/100)})
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-700/60 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                <BarChart4 className='w-3 h-3 mr-1'/>Positions
                            </div>
                            <div className="text-lg font-bold">{positionsCount}</div>
                        </div>
                    </div>

                    {/* Positions Table Section - Now sortable */}
                    <div className="bg-gray-700/60 rounded-lg overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 bg-gray-700 border-b border-gray-600">
                            <h4 className="font-medium text-base text-white">Account Holdings</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-full divide-y divide-gray-600">
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                                            Asset/Ticker
                                        </th>
                                        <th 
                                            className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                            onClick={() => handleSort('quantity')}
                                        >
                                            <div className="flex items-center justify-end">
                                                Quantity/Shares {getSortIcon('quantity')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                            onClick={() => handleSort('value')}
                                        >
                                            <div className="flex items-center justify-end">
                                                Value {getSortIcon('value')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                            onClick={() => handleSort('cost_basis')}
                                        >
                                            <div className="flex items-center justify-end">
                                                Cost Basis {getSortIcon('cost_basis')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                                            onClick={() => handleSort('gain_loss')}
                                        >
                                            <div className="flex items-center justify-end">
                                                Gain/Loss {getSortIcon('gain_loss')}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-600 bg-gray-700/30">
                                    {sortedPositions.length > 0 ? (
                                        sortedPositions.map((pos, index) => {
                                            const gainLossAmount = pos.gain_loss_amount ?? pos.gain_loss ?? 0;
                                            const gainLossPercent = pos.gain_loss_percent ?? 0;
                                            const value = pos.value ?? 0;
                                            const costBasisTotal = pos.cost_basis_total ?? 
                                                (pos.cost_basis * (pos.shares || pos.quantity || 1)) ?? 0;
                                            const quantityOrShares = pos.quantity_or_shares ?? 
                                                pos.shares ?? pos.quantity ?? 'N/A';
                                            
                                            return (
                                                <tr key={`${pos.asset_type}-${pos.id}-${index}`} className="hover:bg-gray-600/50 transition-colors">
                                                    <td className="px-3 py-2 whitespace-nowrap text-white">
                                                        <div className="font-medium">{pos.ticker_or_name || pos.ticker || pos.name}</div>
                                                        <div className="text-xs text-gray-400 capitalize">
                                                            {(pos.asset_type || '').replace('_', ' ') || 'Security'}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                                                        {typeof quantityOrShares === 'number' 
                                                            ? formatNumber(quantityOrShares, { maximumFractionDigits: 6 }) 
                                                            : quantityOrShares}
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                                                        {formatCurrency(value)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                                                        {formatCurrency(costBasisTotal)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                                        <div className={`font-medium text-xs ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                                                        </div>
                                                        <div className={`text-xs ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            ({gainLossAmount >= 0 ? '+' : ''}{formatPercentage(gainLossPercent/100)})
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-3 py-4 text-center text-gray-400">
                                                No positions found in this account.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer with Actions */}
                <div className="bg-gray-900/50 px-6 py-4 flex justify-end items-center space-x-3 border-t border-gray-700">
                    {/* Add Position Button */}
                    <button title="Add Position to this Account" onClick={handleAddPosition} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm">
                        <Plus className="w-4 h-4 mr-1" /> Add Position
                    </button>
                    {/* Edit Account Button */}
                    <button title="Edit this Account" onClick={handleEditAccount} className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm">
                        <Settings className="w-4 h-4 mr-1" /> Edit Account
                    </button>
                    {/* Delete Account Button */}
                    <button title="Delete this Account" onClick={handleDeleteAccount} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm">
                        <Trash className="w-4 h-4 mr-1" /> Delete Account
                    </button>
                    {/* Close Button */}
                    <button onClick={onClose} className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-sm text-white">
                        Close
                    </button>
                </div>
            </div>
        </FixedModal>
    );
};

export default AccountDetailModal;