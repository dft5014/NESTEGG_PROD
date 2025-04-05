// components/modals/AccountDetailModal.js
import React from 'react';
import FixedModal from '@/components/modals/FixedModal'; // Use FixedModal
import { Briefcase, X, Settings, Trash, Plus, BarChart4, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';

// NOTE: Styling adjusted assuming FixedModal's white background.

// ModalPositionTable component (assuming definition or import)
const ModalPositionTable = ({ positions = [] }) => { /* ... Same as before ... */ };

const AccountDetailModal = ({
    isOpen,
    onClose = () => {},
    account,
    // These props trigger handlers in AccountTable
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

    // --- Internal Handlers Calling Parent Triggers ---
    const handleAddPosition = (e) => {
        e.stopPropagation();
        onTriggerAddPosition(account); // Call parent handler
        // Might want to close this modal after triggering Add Position Flow?
        // onClose(); // Optional: Uncomment if desired
    };

    const handleEditAccount = (e) => {
        e.stopPropagation();
        onTriggerEdit(account); // Call parent handler (which opens Edit Modal)
        onClose(); // Close this detail modal
    };

    const handleDeleteAccount = (e) => {
        e.stopPropagation();
        onTriggerDelete(account); // Call parent handler (which opens Delete Confirm)
        onClose(); // Close this detail modal
    };

    // Use the FixedModal wrapper component
    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title="" // No title, using custom header band
            size="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl" // Keep previous size
        >
            {/* Modal content */}
            <>
                 {/* Custom Header Band */}
                 <div className="flex justify-between items-start p-5 border-b border-gray-300 bg-gradient-to-r from-blue-700 to-blue-600 text-white">
                     {/* ... Header Content (Name, Institution, etc.) ... */}
                 </div>

                 {/* Body */}
                 <div className="space-y-6"> {/* FixedModal provides p-6 */}
                      {/* Account Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {/* ... Metric Cards (adjusted styling for white bg) ... */}
                      </div>
                      {/* Positions Table Section */}
                      <div className="rounded-lg overflow-hidden">
                           <div className="flex justify-between items-center px-1 py-3 border-b border-gray-200">
                               <h4 className="font-medium text-base text-gray-800">Account Holdings</h4>
                           </div>
                           <ModalPositionTable positions={account?.positions || []} />
                       </div>
                  </div>

                 {/* Footer with Actions */}
                 <div className="bg-gray-50 px-6 py-4 flex justify-end items-center space-x-3 border-t border-gray-200 mt-6">
                      <button title="Add Position" onClick={handleAddPosition} className="..."> <Plus /> Add Position </button>
                      <button title="Edit Account" onClick={handleEditAccount} className="..."> <Settings /> Edit Account </button>
                      <button title="Delete Account" onClick={handleDeleteAccount} className="..."> <Trash /> Delete Account </button>
                      <button onClick={onClose} className="..."> Close </button>
                  </div>
            </>
        </FixedModal>
    );
};

export default AccountDetailModal;