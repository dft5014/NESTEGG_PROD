// components/modals/AccountDetailModal.js
import React from 'react';
import FixedModal from '@/components/modals/FixedModal'; // Assuming this provides Portal & base structure
import { Briefcase, X, Settings, Trash, Plus, BarChart4, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';

// ModalPositionTable component - Ensure this is defined or imported
// (Using the version provided earlier)
const ModalPositionTable = ({ positions = [] }) => {
    if (!positions || positions.length === 0) {
        return <div className="p-4 text-center text-gray-400 text-sm">No positions found in this account.</div>;
    }
    return (
        // Using original dark theme styles for the table within the modal body
        <div className="overflow-x-auto max-h-60"> {/* Limit height */}
            <table className="w-full text-sm">
                 <thead className="bg-gray-800 sticky top-0 z-10"> {/* Dark sticky header */}
                    <tr>
                       <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Asset/Ticker</th>
                       <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase hidden sm:table-cell">Quantity/Shares</th>
                       <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                       <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Gain/Loss</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-600 bg-gray-700/30"> {/* Dark body bg */}
                    {positions.map(pos => {
                        const gainLossAmount = pos.gain_loss_amount ?? 0;
                        const gainLossPercent = pos.gain_loss_percent ?? 0;
                        const value = pos.value ?? 0;
                        const quantityOrShares = pos.quantity_or_shares ?? 'N/A';
                        return (
                             <tr key={`${pos.asset_type}-${pos.id}`} className="hover:bg-gray-600/50 transition-colors"> {/* Dark hover */}
                                 <td className="px-3 py-2 whitespace-nowrap text-white"> {/* White text */}
                                     <div className="font-medium">{pos.ticker_or_name}</div>
                                     <div className="text-xs text-gray-400 capitalize">{pos.asset_type?.replace('_', ' ') || 'N/A'}</div>
                                 </td>
                                 <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden sm:table-cell"> {/* Light text */}
                                     {typeof quantityOrShares === 'number' ? quantityOrShares.toLocaleString(undefined, { maximumFractionDigits: 4 }) : quantityOrShares}
                                 </td>
                                 <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">{formatCurrency(value)}</td> {/* White text */}
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
    onClose = () => {},
    account,
    // These props trigger handlers in AccountTable
    onTriggerEdit = () => {},
    onTriggerDelete = () => {},
    onTriggerAddPosition = () => {} // Add Position trigger IS included
}) => {

    // Data calculation
    const costBasis = account?.total_cost_basis ?? 0;
    const gainLoss = account?.total_gain_loss ?? 0;
    const gainLossPercent = account?.total_gain_loss_percent ?? 0;
    const positionsCount = account?.positions_count ?? account?.positions?.length ?? 0;
    const totalValue = account?.total_value ?? 0;

    // --- Internal Handlers Calling Parent Triggers ---
    const handleAddPosition = (e) => {
        e.stopPropagation();
        console.log("AccountDetailModal: Add Position button clicked, calling onTriggerAddPosition");
        onTriggerAddPosition(account); // Call parent handler to start the flow
        // Decide if this detail modal should close when Add Position flow starts
        // onClose(); // Optional: Uncomment if you want it to close
    };

    const handleEditAccount = (e) => {
        e.stopPropagation();
        console.log("AccountDetailModal: Edit Account button clicked, calling onTriggerEdit");
        onTriggerEdit(account); // Call parent handler to open Edit modal
        onClose(); // Close this detail modal
    };

    const handleDeleteAccount = (e) => {
        e.stopPropagation();
        console.log("AccountDetailModal: Delete Account button clicked, calling onTriggerDelete");
        onTriggerDelete(account); // Call parent handler to open Delete confirmation
        onClose(); // Close this detail modal
    };

    // Use FixedModal wrapper
    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title="" // No title, using custom header band
            // Match original size intent
            size="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl"
            // Override z-index if necessary, FixedModal defaults to z-50
            // zIndex="z-[60]" // Example if needed above others
        >
            {/* Content for FixedModal's children prop */}
            {/* Using original dark theme structure */}
            <div className="bg-gray-800 text-white"> {/* Ensure base dark background */}
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
                      {/* Close button is handled by FixedModal, no need for explicit X here */}
                  </div>

                 {/* Body Content */}
                 {/* FixedModal provides p-6, so use pt-0 potentially if header has pb-5? Or adjust FixedModal */}
                 <div className="p-6 space-y-6 max-h-[calc(75vh-140px)] overflow-y-auto"> {/* Added padding back */}
                      {/* Account Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Using original dark theme metric cards */}
                           <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1'/>Current Value</div><div className="text-lg font-bold">{formatCurrency(totalValue)}</div></div>
                           <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1'/>Cost Basis</div><div className="text-lg font-bold">{formatCurrency(costBasis)}</div></div>
                           <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><TrendingUp className='w-3 h-3 mr-1'/>Gain/Loss</div><div className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>{gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}<span className="block text-xs font-normal">({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})</span></div></div>
                           <div className="bg-gray-700/60 rounded-lg p-4"><div className="text-gray-400 text-xs mb-1 uppercase flex items-center"><BarChart4 className='w-3 h-3 mr-1'/>Positions</div><div className="text-lg font-bold">{positionsCount}</div></div>
                      </div>

                      {/* Positions Table Section */}
                      <div className="bg-gray-700/60 rounded-lg overflow-hidden">
                           <div className="flex justify-between items-center px-4 py-3 bg-gray-700 border-b border-gray-600">
                                <h4 className="font-medium text-base text-white">Account Holdings</h4>
                           </div>
                           <ModalPositionTable positions={account?.positions || []} />
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
                      {/* Original Close Button */}
                      <button onClick={onClose} className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-sm text-white">
                           Close
                       </button>
                  </div>
            </div> {/* End base dark background div */}
        </FixedModal>
    );
};

export default AccountDetailModal;