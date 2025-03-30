// frontend/components/modals/BulkUploadAccountSelectModal.js
import React from 'react';
import Modal from './Modal';
import SkeletonLoader from '@/components/SkeletonLoader'; // Assuming you have this

const BulkUploadAccountSelectModal = ({ isOpen, onClose, accounts = [], isLoading, onAccountSelected }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload - Select Account">
       <p className="text-gray-600 mb-4">Choose the account where you want to upload positions:</p>
       <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {isLoading && (
          <>
            <SkeletonLoader type="line" className="h-16 mb-2" />
            <SkeletonLoader type="line" className="h-16 mb-2" />
          </>
        )}
        {!isLoading && accounts.length === 0 && (
          <p className="text-gray-500 text-center py-4">No accounts available for upload.</p>
        )}
        {!isLoading && accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onAccountSelected(account)} // Pass the whole account object
            className="w-full p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all flex justify-between items-center"
          >
            <div>
              <p className="font-medium text-gray-800">{account.account_name}</p>
              <p className="text-sm text-gray-500">{account.institution || "N/A"} • {account.type || "N/A"}</p>
            </div>
            <div className="text-blue-600 font-medium text-sm">
              Select →
            </div>
          </button>
        ))}
      </div>
       <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
        <button type="button" className="modal-cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default BulkUploadAccountSelectModal;