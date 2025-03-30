// frontend/components/modals/ConfirmDeleteModal.js
import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, itemName = 'item', isLoading = false }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Confirm Deletion`} size="max-w-md">
      <div className="text-center">
         <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
             <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
         </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Delete {itemName}?</p>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete this {itemName}? This action cannot be undone.
        </p>
      </div>
      <div className="flex justify-center space-x-4">
        <button
          type="button"
          className="modal-cancel-btn" // Use consistent styling
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;