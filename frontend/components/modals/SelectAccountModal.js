// frontend/components/modals/SelectAccountModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';
import SkeletonLoader from '@/components/SkeletonLoader'; // Assuming you have this

const SelectAccountModal = ({ isOpen, onClose, onAccountSelected }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    } else {
      // Reset state when closed
      setAccounts([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching accounts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (accountId) => {
    if (onAccountSelected) {
      onAccountSelected(accountId);
    }
    onClose(); // Close this modal after selection
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Account">
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {isLoading && (
          <>
            <SkeletonLoader type="line" className="h-16 mb-2" />
            <SkeletonLoader type="line" className="h-16 mb-2" />
            <SkeletonLoader type="line" className="h-16" />
          </>
        )}
        {error && <p className="text-red-600 text-sm">Error loading accounts: {error}</p>}
        {!isLoading && !error && accounts.length === 0 && (
          <p className="text-gray-500 text-center py-4">No accounts found. Please add an account first.</p>
        )}
        {!isLoading && !error && accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => handleSelect(account.id)}
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
        <button
          type="button"
          className="modal-cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default SelectAccountModal;