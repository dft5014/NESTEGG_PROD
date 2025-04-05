// components/modals/AccountDetailModal.js
import React from 'react';
import FixedModal from '@/components/modals/FixedModal'; // Use FixedModal
import { Briefcase, X, Settings, Trash, Plus, BarChart4, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';

// NOTE: This component renders complex content.
// FixedModal uses a white background by default. You may need to adjust
// the text colors (e.g., text-gray-800, text-blue-700) and background colors
// (e.g., bg-gray-100) within this component for better contrast if you keep
// the white FixedModal background. The example below assumes FixedModal provides
// the main white background and adjusts some elements.

// ModalPositionTable component (assuming it's defined here or imported)
const ModalPositionTable = ({ positions = [] }) => {
    if (!positions || positions.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-sm">No positions found in this account.</div>;
    }
    return (
        <div className="overflow-x-auto max-h-60 border border-gray-200 rounded"> {/* Add border */}
            <table className="w-full text-sm">
                 <thead className="bg-gray-100 sticky top-0 z-10"> {/* Lighter header */}
                    <tr>
                       <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Asset/Ticker</th>
                       <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase hidden sm:table-cell">Quantity/Shares</th>
                       <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Value</th>
                       <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase">Gain/Loss</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white"> {/* Ensure bg contrast */}
                    {positions.map(pos => {
                        const gainLossAmount = pos.gain_loss_amount ?? 0;
                        const gainLossPercent = pos.gain_loss_percent ?? 0;
                        const value = pos.value ?? 0;
                        const quantityOrShares = pos.quantity_or_shares ?? 'N/A';
                        return (
                             <tr key={`${pos.asset_type}-${pos.id}`} className="hover:bg-gray-50 transition-colors"> {/* Lighter hover */}
                                 <td className="px-3 py-2 whitespace-nowrap text-gray-800"> {/* Darker text */}
                                     <div className="font-medium">{pos.ticker_or_name}</div>
                                     <div className="text-xs text-gray-500 capitalize">{pos.asset_type?.replace('_', ' ') || 'N/A'}</div>
                                 </td>
                                 <td className="px-3 py-2 text-right whitespace-nowrap text-gray-800 hidden sm:table-cell"> {/* Darker text */}
                                     {typeof quantityOrShares === 'number' ? quantityOrShares.toLocaleString(undefined, { maximumFractionDigits: 4 }) : quantityOrShares}
                                 </td>
                                 <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-gray-900">{formatCurrency(value)}</td> {/* Darker text */}
                                 <td className="px-3 py-2 text-right whitespace-nowrap">
                                      {/* Keep gain/loss colors */}
                                     <div className={`font-medium text-xs ${gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                         {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                                     </div>
                                     <div className={`text-xs ${gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
    onTriggerEdit = () => {},
    onTriggerDelete = () => {},
    onTriggerAddPosition = () => {}
}) => {

    // Data calculation
    const costBasis = account?.total_cost_basis ?? 0;
    const gainLoss = account?.total_gain_loss ?? 0;
    const gainLossPercent = account?.total_gain_loss_percent ?? 0;
    const positionsCount = account?.positions_count ?? account?.positions?.length ?? 0;
    const totalValue = account?.total_value ?? 0;

    // Internal Handlers
    const handleAddPosition = (e) => { e.stopPropagation(); onTriggerAddPosition(account); };
    const handleEditAccount = (e) => { e.stopPropagation(); onTriggerEdit(account); onClose(); };
    const handleDeleteAccount = (e) => { e.stopPropagation(); onTriggerDelete(account); onClose(); };

    // Use the FixedModal wrapper component
    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title="" // No title, using custom header band
            // Set size explicitly to match previous design intent
            size="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl"
            // Use appropriate zIndex if needed, default is z-50
        >
            {/* Modal content goes inside the FixedModal component's children */}
            {/* FixedModal provides the outer wrapper, padding, bg etc. */}
            <>
                 {/* Custom Header Band (adjust colors for contrast) */}
                 <div className="flex justify-between items-start p-5 border-b border-gray-300 bg-gradient-to-r from-blue-700 to-blue-600 text-white"> {/* Adjusted colors */}
                      <div className="flex items-center">
                           {/* Keep icon bg white for contrast */}
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-4">
                              <span className="font-bold text-blue-700 text-lg">{account?.account_name?.charAt(0) || '?'}</span>
                          </div>
                          <div>
                              <h3 className="text-lg font-bold">{account?.account_name}</h3> {/* White text ok */}
                              <div className="flex items-center text-sm text-blue-100 flex-wrap gap-x-1.5"> {/* Lighter text */}
                                  <span>{account?.institution || "N/A"}</span>
                                  {account?.type && (<><span className="opacity-70">•</span><span>{account.type}</span></>)}
                                  <span className="opacity-70">•</span>
                                  <span>Last updated: {formatDate(account?.updated_at)}</span>
                              </div>
                          </div>
                      </div>
                      {/* Close button provided by FixedModal, this one is redundant */}
                       {/*
                       <button onClick={onClose} className="text-blue-100 hover:text-white transition-colors">
                           <X className="h-5 w-5" />
                       </button>
                       */}
                  </div>

                 {/* Body Content (Adjust text/bg colors if needed) */}
                 {/* FixedModal adds p-6, remove redundant padding here */}
                 <div className="space-y-6">
                      {/* Account Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {/* Example metric card adjustment */}
                           <div className="bg-gray-100 rounded-lg p-4"><div className="text-gray-500 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1 text-gray-500'/>Current Value</div><div className="text-lg font-bold text-gray-900">{formatCurrency(totalValue)}</div></div>
                           <div className="bg-gray-100 rounded-lg p-4"><div className="text-gray-500 text-xs mb-1 uppercase flex items-center"><DollarSign className='w-3 h-3 mr-1 text-gray-500'/>Cost Basis</div><div className="text-lg font-bold text-gray-900">{formatCurrency(costBasis)}</div></div>
                           <div className="bg-gray-100 rounded-lg p-4"><div className="text-gray-500 text-xs mb-1 uppercase flex items-center"><TrendingUp className='w-3 h-3 mr-1 text-gray-500'/>Gain/Loss</div><div className={`text-lg font-bold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}<span className="block text-xs font-normal">({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})</span></div></div>
                           <div className="bg-gray-100 rounded-lg p-4"><div className="text-gray-500 text-xs mb-1 uppercase flex items-center"><BarChart4 className='w-3 h-3 mr-1 text-gray-500'/>Positions</div><div className="text-lg font-bold text-gray-900">{positionsCount}</div></div>
                      </div>

                      {/* Positions Table Section */}
                      <div className="rounded-lg overflow-hidden"> {/* Remove bg color */}
                           <div className="flex justify-between items-center px-1 py-3 border-b border-gray-200"> {/* Adjust padding/border */}
                                <h4 className="font-medium text-base text-gray-800">Account Holdings</h4>
                           </div>
                           <ModalPositionTable
                                positions={account?.positions || []}
                            />
                       </div>
                  </div>

                 {/* Footer Actions (adjust colors/borders) */}
                 {/* FixedModal does not provide a footer area, add it if needed */}
                 <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3 border-t border-gray-200 mt-6">
                       <button title="Add Position" onClick={handleAddPosition} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm">
                            <Plus className="w-4 h-4 mr-1" /> Add Position
                        </button>
                       <button title="Edit Account" onClick={handleEditAccount} className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm">
                            <Settings className="w-4 h-4 mr-1" /> Edit Account
                        </button>
                       <button title="Delete Account" onClick={handleDeleteAccount} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm">
                           <Trash className="w-4 h-4 mr-1" /> Delete Account
                        </button>
                      {/* Optional: Add a simple text close button */}
                       <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700">
                           Close
                       </button>
                  </div>
            </>
        </FixedModal>
    );
};

export default AccountDetailModal;