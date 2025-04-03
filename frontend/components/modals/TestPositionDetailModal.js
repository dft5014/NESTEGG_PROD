// nestegg/frontend/components/modals/TestPositionDetailModal.js
import React from 'react';
import { X, Settings, Trash } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatting'; // Assuming you have formatting utils

// Helper function for calculating Gain/Loss within the modal
const calculateGainLoss = (position) => {
  if (!position) return { gainLossAmount: 0, gainLossPercent: 0 };
  const costBasisPerShare = position.cost_basis || position.price || 0; // Use price as fallback
  const totalCostBasis = (position.shares || 0) * costBasisPerShare;
  const currentValue = position.value || ((position.shares || 0) * (position.price || 0));
  const gainLossAmount = currentValue - totalCostBasis;
  const gainLossPercent = totalCostBasis !== 0 ? (gainLossAmount / totalCostBasis) * 100 : 0;
  return { gainLossAmount, gainLossPercent };
};

const TestPositionDetailModal = ({ isOpen, onClose, position, onEdit, onDelete }) => {
  if (!isOpen || !position) return null;

  const { gainLossAmount, gainLossPercent } = calculateGainLoss(position);
  const costBasisPerShare = position.cost_basis || position.price || 0;
  const totalCostBasis = position.shares * costBasisPerShare;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto"> {/* Ensure high z-index */}
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        </div>

        {/* Modal positioning helper */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full text-white">
          {/* Header */}
          <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-gradient-to-r from-green-900 to-blue-800">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-4">
                <span className="font-bold text-green-800 text-lg">{position.ticker?.charAt(0) || '?'}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{position.ticker || 'N/A'} <span className="text-base font-normal text-gray-300">- {position.name || 'N/A'}</span></h3>
                <div className="flex flex-wrap items-center text-sm text-blue-200">
                  <span>{formatCurrency(position.shares, { maximumFractionDigits: 4 })} shares</span>
                  <span className="mx-2">•</span>
                  <span>{formatCurrency(position.price)} / share</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors p-1 -m-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 bg-gray-800 text-sm">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Current Value" value={formatCurrency(position.value)} />
              <MetricCard label="Total Cost" value={formatCurrency(totalCostBasis)} />
              <MetricCard label="Gain/Loss ($)" value={formatCurrency(gainLossAmount)} isPositive={gainLossAmount >= 0} isNegative={gainLossAmount < 0} />
              <MetricCard label="Gain/Loss (%)" value={`${gainLossAmount >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`} isPositive={gainLossAmount >= 0} isNegative={gainLossAmount < 0} />
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-700/50 p-4 rounded-lg">
              <DetailItem label="Account" value={position.account_name || 'N/A'} />
              <DetailItem label="Cost Basis / Share" value={formatCurrency(costBasisPerShare)} />
              <DetailItem label="Purchase Date" value={formatDate(position.purchase_date)} />
              <DetailItem label="Days Held" value={position.purchase_date ? Math.floor((new Date() - new Date(position.purchase_date)) / (1000 * 60 * 60 * 24)) : 'N/A'} />
              {/* Add more details if available from API */}
              <DetailItem label="Sector" value={position.sector || 'N/A'} />
              <DetailItem label="Industry" value={position.industry || 'N/A'} />
            </div>
          </div>

          {/* Footer Actions (Optional for test, but good to include structure) */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm"
            >
              Close
            </button>
            {/* Include Edit/Delete if you want to test the flow */}
            {onEdit && (
                 <button
                 onClick={onEdit}
                 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
               >
                 <Settings className="w-4 h-4 mr-2" />
                 Edit
               </button>
            )}
             {onDelete && (
                <button
                  onClick={onDelete}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm"
               >
                 <Trash className="w-4 h-4 mr-2" />
                 Delete
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for the modal
const MetricCard = ({ label, value, isPositive = null, isNegative = null }) => (
  <div className="bg-gray-700 rounded-lg p-3">
    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">{label}</div>
    <div className={`text-lg font-semibold truncate ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-white'}`}>{value}</div>
  </div>
);

const DetailItem = ({ label, value }) => (
  <div>
    <div className="text-gray-400 text-xs uppercase tracking-wider">{label}</div>
    <div className="font-medium text-white break-words">{value}</div> {/* Added break-words */}
  </div>
);

export default TestPositionDetailModal;