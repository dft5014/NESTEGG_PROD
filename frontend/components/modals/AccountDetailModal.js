// components/modals/AccountDetailModal.js
import React, { useState, useMemo } from 'react';
import { BarChart4, ChevronDown, ChevronUp, DollarSign, TrendingUp, Plus, Settings, Trash } from 'lucide-react';
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl">
                    {/* Custom Header Band - Deep blue gradient like your screenshot */}
                    <div className="p-6 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white flex items-center justify-center mr-4">
                                <span className="font-bold text-blue-800 text-2xl">{account?.account_name?.charAt(0) || '?'}</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{account?.account_name}</h2>
                                <div className="flex items-center text-sm text-blue-200 flex-wrap gap-x-1.5">
                                    <span>{account?.institution || "N/A"}</span>
                                    {account?.type && (<><span className="opacity-50">•</span><span>{account.type}</span></>)}
                                    <span className="opacity-50">•</span>
                                    <span>Last updated: {formatDate(account?.updated_at)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body Content */}
                    <div className="bg-[#111827] p-6 space-y-6 max-h-[calc(75vh-140px)] overflow-y-auto">
                        {/* Account Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[#1e293b] rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                    <DollarSign className='w-3 h-3 mr-1'/>CURRENT VALUE
                                </div>
                                <div className="text-xl font-bold">{formatCurrency(totalValue)}</div>
                            </div>
                            <div className="bg-[#1e293b] rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                    <DollarSign className='w-3 h-3 mr-1'/>COST BASIS
                                </div>
                                <div className="text-xl font-bold">{formatCurrency(costBasis)}</div>
                            </div>
                            <div className="bg-[#1e293b] rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                    <TrendingUp className='w-3 h-3 mr-1'/>GAIN/LOSS
                                </div>
                                <div className={`text-xl font-bold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                    <span className="block text-xs font-medium">
                                        ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent/100)})
                                    </span>
                                </div>
                            </div>
                            <div className="bg-[#1e293b] rounded-lg p-4">
                                <div className="text-gray-400 text-xs mb-1 uppercase flex items-center">
                                    <BarChart4 className='w-3 h-3 mr-1'/>POSITIONS
                                </div>
                                <div className="text-xl font-bold">{positionsCount}</div>
                            </div>
                        </div>

                        {/* Positions Table Section */}
                        <div className="bg-[#1e293b]/80 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-700">
                                <h3 className="font-medium text-base text-white">Account Holdings</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-full divide-y divide-gray-700">
                                    <thead className="bg-[#111827]">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                ASSET/TICKER
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('quantity')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    QUANTITY/SHARES {getSortIcon('quantity')}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('value')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    VALUE {getSortIcon('value')}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('cost_basis')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    COST BASIS {getSortIcon('cost_basis')}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('gain_loss')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    GAIN/LOSS {getSortIcon('gain_loss')}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 bg-opacity-50">
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
                                                    <tr key={`${pos.asset_type}-${pos.id}-${index}`} className="hover:bg-[#172234] transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap text-white">
                                                            <div className="font-medium">{pos.ticker_or_name || pos.ticker || pos.name}</div>
                                                            <div className="text-xs text-gray-400 capitalize">
                                                                {(pos.asset_type || '').replace('_', ' ') || 'Security'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {typeof quantityOrShares === 'number' 
                                                                ? formatNumber(quantityOrShares, { maximumFractionDigits: 6 }) 
                                                                : quantityOrShares}
                                                        </td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-white">
                                                            {formatCurrency(value)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatCurrency(costBasisTotal)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                                            <div className={`font-medium ${gainLossAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                                                            </div>
                                                            <div className={`text-xs ${gainLossAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                ({gainLossAmount >= 0 ? '+' : ''}{formatPercentage(gainLossPercent/100)})
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-4 py-4 text-center text-gray-400">
                                                    No positions found in this account.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer with Actions - Using exact methodology from AccountTable */}
                    <div className="bg-[#111827] px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
                        <button 
                            onClick={() => {
                                onClose();
                                onTriggerAddPosition(account);
                            }} 
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-1.5" /> Add Position
                        </button>
                        <button 
                            onClick={() => {
                                onClose();
                                onTriggerEdit(account);
                            }} 
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center text-sm transition-colors"
                        >
                            <Settings className="w-4 h-4 mr-1.5" /> Edit Account
                        </button>
                        <button 
                            onClick={() => {
                                onClose();
                                onTriggerDelete(account);
                            }} 
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center text-sm transition-colors"
                        >
                            <Trash className="w-4 h-4 mr-1.5" /> Delete Account
                        </button>
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
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