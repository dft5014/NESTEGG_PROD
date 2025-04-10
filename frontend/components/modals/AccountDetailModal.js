// components/modals/AccountDetailModal.js
import React, { useState, useMemo, useCallback } from 'react';
import { BarChart4, ChevronDown, ChevronUp, DollarSign, TrendingUp, Plus, Settings, Trash, Edit, Eye, List } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';
import AddPositionButton from '@/components/AddPositionButton';
import EditAccountButton from '@/components/EditAccountButton';

// Tax Lot Detail Modal Component - Nested inside AccountDetailModal
const TaxLotDetailModal = ({ isOpen, onClose, ticker, positions }) => {
  if (!isOpen || !positions || positions.length === 0) return null;
  
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">{ticker} - Tax Lot Details</h2>
              <button 
                onClick={onClose}
                className="text-white hover:text-blue-200 p-1 rounded-full"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/60">
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
                  const shares = position.shares || position.quantity || 0;
                  const costPerShare = position.cost_basis || 0;
                  const totalCost = shares * costPerShare;
                  const currentValue = position.value || 0;
                  const gainLoss = currentValue - totalCost;
                  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
                  
                  return (
                    <tr key={`lot-${position.id}-${index}`} className="hover:bg-gray-700/40">
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
                            ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            className="p-1 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/40 transition-colors text-xs"
                            title="Edit Tax Lot"
                          >
                            Edit
                          </button>
                          <button
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
    </div>
  );
};

// Position Modify Modal Component - Nested inside AccountDetailModal
const PositionModifyModal = ({ isOpen, onClose, ticker, positions }) => {
  if (!isOpen || !positions || positions.length === 0) return null;
  
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-900 to-indigo-800 border-b border-purple-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Modify Position: {ticker}</h2>
              <button 
                onClick={onClose}
                className="text-white hover:text-purple-200 p-1 rounded-full"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-4">
            <div className="mb-4 text-sm text-gray-300">
              Select a tax lot to modify:
            </div>
            
            <div className="bg-gray-800/60 rounded-lg max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/60 sticky top-0">
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
                    <tr key={`modify-${position.id}-${index}`} className="hover:bg-gray-700/40">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input type="radio" name="position-select" value={position.id} className="h-4 w-4" />
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
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-3 bg-gray-900 border-t border-gray-700 flex justify-end space-x-3">
            <button 
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
            >
              Edit Selected
            </button>
            <button 
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
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
    </div>
  );
};

// Main AccountDetailModal Component
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
    // State for sorting the grouped positions
    const [sortField, setSortField] = useState('value');
    const [sortDirection, setSortDirection] = useState('desc');
    
    // State for nested modals
    const [selectedTickerForDetail, setSelectedTickerForDetail] = useState(null);
    const [selectedTickerForModify, setSelectedTickerForModify] = useState(null);
    const [isTaxLotModalOpen, setIsTaxLotModalOpen] = useState(false);
    const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);

    // Data calculation
    const costBasis = account?.total_cost_basis ?? 0;
    const gainLoss = account?.total_gain_loss ?? 0;
    const gainLossPercent = account?.total_gain_loss_percent ?? 0;
    const positionsCount = account?.positions_count ?? account?.positions?.length ?? 0;
    const totalValue = account?.total_value ?? 0;

    // Group positions by ticker
    const groupedPositions = useMemo(() => {
        if (!account?.positions || !Array.isArray(account.positions)) return [];
        
        // Group by ticker (or name if ticker is not available)
        const groupedByTicker = account.positions.reduce((groups, position) => {
            const tickerKey = position.ticker || position.name || 'Unknown';
            if (!groups[tickerKey]) {
                groups[tickerKey] = {
                    ticker: tickerKey,
                    positions: [],
                    name: position.name || tickerKey,
                    asset_type: position.asset_type || 'security',
                    totalShares: 0,
                    totalValue: 0,
                    totalCostBasis: 0,
                    currentPrice: position.current_price || position.price || 0
                };
            }
            
            // Add position to group and update totals
            groups[tickerKey].positions.push(position);
            groups[tickerKey].totalShares += parseFloat(position.shares || position.quantity || 0);
            groups[tickerKey].totalValue += parseFloat(position.value || 0);
            
            // Calculate cost basis for position
            const positionShares = parseFloat(position.shares || position.quantity || 0);
            const positionCostPerShare = parseFloat(position.cost_basis || position.price || 0);
            const positionCostBasis = positionShares * positionCostPerShare;
            groups[tickerKey].totalCostBasis += positionCostBasis;
            
            // Use latest price as current price
            if (position.current_price || position.price) {
                groups[tickerKey].currentPrice = position.current_price || position.price;
            }
            
            return groups;
        }, {});
        
        // Convert to array and calculate additional metrics
        return Object.values(groupedByTicker).map(group => {
            group.avgCostPerShare = group.totalShares > 0 ? group.totalCostBasis / group.totalShares : 0;
            group.gainLoss = group.totalValue - group.totalCostBasis;
            group.gainLossPercent = group.totalCostBasis > 0 ? (group.gainLoss / group.totalCostBasis) * 100 : 0;
            return group;
        });
    }, [account?.positions]);

    // Sort grouped positions
    const sortedGroupedPositions = useMemo(() => {
        if (!groupedPositions.length) return [];
        
        return [...groupedPositions].sort((a, b) => {
            let aValue, bValue;
            
            switch (sortField) {
                case 'value':
                    aValue = a.totalValue || 0;
                    bValue = b.totalValue || 0;
                    break;
                case 'shares':
                    aValue = a.totalShares || 0;
                    bValue = b.totalShares || 0;
                    break;
                case 'cost_basis':
                    aValue = a.totalCostBasis || 0;
                    bValue = b.totalCostBasis || 0;
                    break;
                case 'gain_loss':
                    aValue = a.gainLoss || 0;
                    bValue = b.gainLoss || 0;
                    break;
                case 'price':
                    aValue = a.currentPrice || 0;
                    bValue = b.currentPrice || 0;
                    break;
                case 'ticker':
                    return a.ticker.localeCompare(b.ticker);
                default:
                    aValue = a.totalValue || 0;
                    bValue = b.totalValue || 0;
            }
            
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [groupedPositions, sortField, sortDirection]);

    // Calculate account percentages
    const positionsWithPercentage = useMemo(() => {
        if (!sortedGroupedPositions.length || totalValue <= 0) return sortedGroupedPositions;
        
        return sortedGroupedPositions.map(pos => ({
            ...pos,
            accountPercentage: (pos.totalValue / totalValue) * 100
        }));
    }, [sortedGroupedPositions, totalValue]);

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

    // Handle position view details
    const handleViewPositionClick = (e, position) => {
        e.stopPropagation(); // Prevent row click event
        setSelectedTickerForDetail(position.ticker);
        setIsTaxLotModalOpen(true);
    };

    // Handle position modify
    const handleModifyPositionClick = (e, position) => {
        e.stopPropagation(); // Prevent row click event
        setSelectedTickerForModify(position.ticker);
        setIsModifyModalOpen(true);
    };

    // Handle closing nested modals
    const handleCloseTaxLotModal = useCallback(() => {
        setIsTaxLotModalOpen(false);
        setTimeout(() => setSelectedTickerForDetail(null), 300);
    }, []);

    const handleCloseModifyModal = useCallback(() => {
        setIsModifyModalOpen(false);
        setTimeout(() => setSelectedTickerForModify(null), 300);
    }, []);

    // Find positions for selected ticker
    const getPositionsForTicker = useCallback((ticker) => {
        if (!account?.positions || !Array.isArray(account.positions) || !ticker) return [];
        return account.positions.filter(p => (p.ticker || p.name) === ticker);
    }, [account]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="bg-[#1e293b] text-white rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl">
                    {/* Custom Header Band - Deep blue gradient */}
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
                                    className="text-sm bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded z-[110]"
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
                                                onClick={() => handleSort('shares')}
                                            >
                                                <div className="flex items-center justify-end">
                                                    SHARES {getSortIcon('shares')}
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
                                            positionsWithPercentage.map((position, index) => {
                                                return (
                                                    <tr key={`${position.ticker}-${index}`} 
                                                        className="hover:bg-[#172234] transition-colors cursor-pointer"
                                                        onClick={(e) => handleViewPositionClick(e, position)}>
                                                        <td className="px-2 py-3 text-center whitespace-nowrap text-gray-400 font-medium">
                                                            {index + 1}
                                                        </td>
                                                        <td className="px-3 py-3 whitespace-nowrap text-white">
                                                            <div className="font-medium">{position.ticker}</div>
                                                            <div className="text-xs text-gray-400 capitalize">
                                                                {position.name !== position.ticker ? position.name : (position.asset_type || '').replace('_', ' ') || 'Security'}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatNumber(position.totalShares, { maximumFractionDigits: 6 })}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatCurrency(position.currentPrice)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap font-medium text-white">
                                                            {formatCurrency(position.totalValue)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {position.accountPercentage ? position.accountPercentage.toFixed(2) + '%' : 'N/A'}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatCurrency(position.avgCostPerShare)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap text-gray-300">
                                                            {formatCurrency(position.totalCostBasis)}
                                                        </td>
                                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                                            <div className={`font-medium ${position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {position.gainLoss >= 0 ? '+' : ''}{formatCurrency(position.gainLoss)}
                                                            </div>
                                                            <div className={`text-xs ${position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                ({position.gainLoss >= 0 ? '+' : ''}{formatPercentage(position.gainLossPercent/100)})
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-center whitespace-nowrap">
                                                            <div className="flex items-center justify-center space-x-1.5">
                                                                <button
                                                                    onClick={(e) => handleViewPositionClick(e, position)}
                                                                    className="p-1.5 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/40 transition-colors"
                                                                    title="View Tax Lots"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleModifyPositionClick(e, position)}
                                                                    className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                                                    title="Modify Position"
                                                                >
                                                                    <List className="w-3.5 h-3.5" />
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
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors z-[110]"
                            buttonContent={<div className="flex items-center"><Plus className="w-4 h-4 mr-1.5" /> Add Position</div>}
                            onPositionAdded={() => {
                                onClose();
                                onTriggerAddPosition(account);
                            }}
                        />
                        
                        <EditAccountButton 
                            account={account}
                            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm transition-colors flex items-center z-[110]"
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
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center text-sm transition-colors z-[110]"
                        >
                            <Trash className="w-4 h-4 mr-1.5" /> Delete Account
                        </button>
                        
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors z-[110]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Nested Tax Lot Detail Modal */}
            {isTaxLotModalOpen && selectedTickerForDetail && (
                <TaxLotDetailModal
                    isOpen={isTaxLotModalOpen}
                    onClose={handleCloseTaxLotModal}
                    ticker={selectedTickerForDetail}
                    positions={getPositionsForTicker(selectedTickerForDetail)}
                />
            )}
            
            {/* Nested Position Modify Modal */}
            {isModifyModalOpen && selectedTickerForModify && (
                <PositionModifyModal
                    isOpen={isModifyModalOpen}
                    onClose={handleCloseModifyModal}
                    ticker={selectedTickerForModify}
                    positions={getPositionsForTicker(selectedTickerForModify)}
                />
            )}
        </div>
    );
};

export default AccountDetailModal;