// frontend/components/modals/AccountSelectModal.js
import React, { useState, useEffect } from 'react';
import FixedModal from './FixedModal';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

const AccountSelectModal = ({ isOpen, onClose, onAccountSelected }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const accountsData = await fetchAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Account"
    >
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">
          Choose which account to add this position to:
        </p>
        
        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            {error}
            <button 
              className="ml-2 underline"
              onClick={loadAccounts}
            >
              Retry
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
            No accounts found. Please add an account first.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  console.log(`Selected account: ${account.id} (${account.account_name})`);
                  onAccountSelected(account.id);
                }}
                className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 hover:border-blue-300 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="font-medium">{account.account_name}</div>
                  <div className="text-sm text-gray-500">
                    {account.institution ? `${account.institution} • ` : ''}
                    {account.type || account.account_category || 'Account'}
                  </div>
                </div>
                <div className="text-blue-600 text-sm">Select →</div>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </FixedModal>
  );
};

export default AccountSelectModal;