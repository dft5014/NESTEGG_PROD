// components/modals/AccountDetailModal.js
import React, { useState, useMemo } from 'react';
import { BarChart4, ChevronDown, ChevronUp, DollarSign, TrendingUp, Plus, Settings, Trash, Edit, Eye } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';
import AddPositionButton from '@/components/AddPositionButton';
import EditAccountButton from '@/components/EditAccountButton';

const AccountDetailModal = ({
    isOpen,
    onClose = () => {},
    account,
    // These props trigger handlers in AccountTable
    onTriggerEdit = () => {},
    onTriggerDelete = () => {},
    onTriggerAddPosition = () => {},
    // New props for position actions
    onEditPosition = () => {},
    onDeletePosition = () => {},
    onViewPositionDetails = () => {}
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
                case 'price':
                    aValue = a.current_price || a.price || 0;
                    bValue = b.current_price || b.price || 0;
                    break;
                case 'ticker':
                    return (a.ticker || a.ticker_or_name || '').localeCompare(b.ticker || b.ticker_or_name || '');
                default:
                    aValue = a.value || 0;
                    bValue = b.value || 0;
            }
            
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [account?.positions, sortField, sortDirection]);

    // Calculate account percentages
    const positionsWithPercentage = useMemo(() => {
        if (!sortedPositions.length || totalValue <= 0) return sortedPositions;
        
        return sortedPositions.map(pos => ({
            ...pos,
            accountPercentage: ((pos.value || 0) / totalValue) * 100
        }));
    }, [sortedPositions, totalValue]);

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

    // Handle position actions
    const handleEditPositionClick = (e, position) => {
        e.stopPropagation(); // Prevent row click event
        onEditPosition(position);
    };

    const handleDeletePositionClick = (e, position) => {
        e.stopPropagation(); // Prevent row click event
        onDeletePosition(position);
    };

    const handleViewPositionClick = (e, position) => {
        e.stopPropagation(); // Prevent row click event
        onViewPositionDetails(position);
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
                            <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-medium text-base text-white">Account Holdings</h3>
                                <AddPositionButton 
                                    accountId={account?.id}
                                    className="text-sm bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded"
                                    buttonContent={<div className="flex items-center"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Position</div>}
                                    onPositionAdded={() => {
                                        onClose();
                                        onTriggerAddPosition(account);
                                    }}
                                />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-full divide-y divide-gray-700">
                                    <thead className="bg-[#111827]">
                                        <tr>
                                            <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-10">
                                                #
                                            </th>
                                            <th 
                                                className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('ticker')}
                                            >
                                                <div className="flex items-center">
                                                    TICKER/NAME {getSortIcon('ticker')}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('quantity')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    SHARES {getSortIcon('quantity')}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('price')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    PRICE {getSortIcon('price')}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('value')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    VALUE {getSortIcon('value')}
                                                </div>
                                            </th>
                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                ACCT %
                                            </th>
                                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                COST/SHARE
                                            </th>
                                            <th 
                                                className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('cost_basis')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    COST BASIS {getSortIcon('cost_basis')}
                                                </div>
                                            </th>
                                            <th 
                                                className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                                                onClick={() => handleSort('gain_loss')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    GAIN/LOSS {getSortIcon('gain_loss')}
                                                </div>
                                            </th>
                                            <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                ACTIONS
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 bg-opacity-50">
                                        {positionsWithPercentage.length > 0 ? (
                                            positionsWithPercentage.map((pos, index) => {
                                                const gainLossAmount = pos.gain_loss_amount ?? pos.gain_loss ?? 0;
                                                const gainLossPercent = pos.gain_loss_percent ?? 0;
                                                const value = pos.value ?? 0;
                                                const costBasisTotal = pos.cost_basis_total ?? 
                                                    (pos.cost_basis * (pos.shares || pos.quantity || 1)) ?? 0;
                                                const quantityOrShares = pos.quantity_or_shares ?? 
                                                    pos.shares ?? pos.quantity ?? 0;
                                                const costPerShare = quantityOrShares > 0 ? 
                                                    (costBasisTotal / quantityOrShares) : 0;
                                                const currentPrice = pos.current_price ?? pos.price ?? 0;
                                                
                                                return (
                                                    <tr key={`${pos.asset_type}-${pos.id}-${index}`} 
                                                        className="hover:bg-[#172234] transition-colors cursor-pointer"
                                                        onClick={(e) => handleViewPositionClick(e, pos)}>
                                                        <td className="px-2 py-3 text-center whitespace-nowrap text-gray-400 font-medium">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-3 py-3 whitespace-nowrap text-white">
                                                            <div className="font-medium">{pos.ticker || pos.ticker_or_name || pos.name}</div>
                                                            <div className="text-xs text-gray-400 capitalize">
                                                                {pos.name || (pos.asset_type || '').replace('_', ' ') || 'Security'}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {typeof quantityOrShares === 'number' 
                                                                ? formatNumber(quantityOrShares, { maximumFractionDigits: 6 }) 
                                                                : quantityOrShares}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatCurrency(currentPrice)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap font-medium text-white">
                                                            {formatCurrency(value)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {pos.accountPercentage ? pos.accountPercentage.toFixed(2) + '%' : 'N/A'}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatCurrency(costPerShare)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatCurrency(costBasisTotal)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                                            <div className={`font-medium ${gainLossAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                                                            </div>
                                                            <div className={`text-xs ${gainLossAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                ({gainLossAmount >= 0 ? '+' : ''}{formatPercentage(gainLossPercent/100)})
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-center whitespace-nowrap">
                                                            <div className="flex items-center justify-center space-x-1.5">
                                                                <button
                                                                    onClick={(e) => handleViewPositionClick(e, pos)}
                                                                    className="p-1.5 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/40 transition-colors"
                                                                    title="View Details"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleEditPositionClick(e, pos)}
                                                                    className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                                                    title="Edit Position"
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeletePositionClick(e, pos)}
                                                                    className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-colors"
                                                                    title="Delete Position"
                                                                >
                                                                    <Trash className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="10" className="px-4 py-4 text-center text-gray-400">
                                                    No positions found in this account.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Footer with Actions - Using existing component references */}
                    <div className="bg-[#111827] px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
                        <AddPositionButton 
                            accountId={account?.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                            buttonContent={<div className="flex items-center"><Plus className="w-4 h-4 mr-1.5" /> Add Position</div>}
                            onPositionAdded={() => {
                                onClose();
                                onTriggerAddPosition(account);
                            }}
                        />
                        
                        <EditAccountButton 
                            account={account}
                            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm transition-colors flex items-center"
                            onAccountEdited={() => {
                                onClose();
                                onTriggerEdit(account);
                            }}
                            buttonContent={<div className="flex items-center"><Settings className="w-4 h-4 mr-1.5" /> Edit Account</div>}
                        />
                        
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