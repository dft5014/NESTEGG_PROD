// components/modals/TestRealEstateDetailModal.js
import React from 'react';
import { X, Home, Building, MapPin, DollarSign } from 'lucide-react'; // Add relevant icons
import { formatCurrency, formatDate } from '@/utils/formatters';

const TestRealEstateDetailModal = ({ isOpen, onClose, position, onEdit, onDelete }) => {
  if (!isOpen || !position) return null;

  const { gain_loss = 0, gain_loss_percent = 0 } = position;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true"><div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full text-white">
          {/* Header */}
          <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-gradient-to-r from-teal-900 to-cyan-800">
             <div className="flex items-center">
               <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-white flex items-center justify-center mr-4">
                 <Home className="h-6 w-6 text-teal-700" />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-white truncate">{position.address || 'Real Estate Property'}</h3>
                 <div className="flex flex-wrap items-center text-sm text-cyan-200">
                   <span>{position.property_type || 'N/A'}</span>
                   <span className="mx-2">•</span>
                   <span>Acct: {position.account_name || 'N/A'}</span>
                 </div>
               </div>
             </div>
             <button onClick={onClose} className="text-white hover:text-cyan-200 transition-colors p-1 -m-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"> <X className="h-5 w-5" /> </button>
           </div>

          {/* Body */}
          <div className="p-6 bg-gray-800 text-sm">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <MetricCard label="Estimated Value" value={formatCurrency(position.estimated_value)} />
               <MetricCard label="Purchase Price" value={formatCurrency(position.purchase_price)} />
               <MetricCard label="Gain/Loss ($)" value={formatCurrency(gain_loss)} isPositive={gain_loss >= 0} isNegative={gain_loss < 0} />
               <MetricCard label="Gain/Loss (%)" value={`${gain_loss >= 0 ? '+' : ''}${gain_loss_percent.toFixed(2)}%`} isPositive={gain_loss >= 0} isNegative={gain_loss < 0} />
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-700/50 p-4 rounded-lg">
               <DetailItem label="Full Address" value={position.address || 'N/A'} icon={<MapPin className="h-4 w-4 text-gray-400 mr-1"/>} />
               <DetailItem label="Property Type" value={position.property_type || 'N/A'} icon={<Building className="h-4 w-4 text-gray-400 mr-1"/>}/>
               <DetailItem label="Account" value={position.account_name || 'N/A'} />
               <DetailItem label="Purchase Date" value={formatDate(position.purchase_date)} />
                {/* Add more relevant RE fields if they exist in your model */}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm">Close</button>
            {/* Add Edit/Delete if needed */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components (reuse or define here)
const MetricCard = ({ label, value, isPositive = null, isNegative = null }) => ( <div className="bg-gray-700 rounded-lg p-3"><div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">{label}</div><div className={`text-lg font-semibold truncate ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-white'}`}>{value}</div></div> );
const DetailItem = ({ label, value, icon = null, children = null }) => ( <div><div className="text-gray-400 text-xs uppercase tracking-wider flex items-center">{icon}{label}</div>{value && <div className="font-medium text-white break-words">{value}</div>}{children}</div> );

export default TestRealEstateDetailModal;