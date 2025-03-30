// pages/test-production.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import AccountModal from '@/components/modals/AccountModal';
import FixedModal from '@/components/modals/FixedModal';
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from '@/utils/apimethods/accountMethods';

export default function TestProductionPage() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Load accounts
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching accounts...");
      const accountsData = await fetchAccounts();
      console.log("Accounts fetched:", accountsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError("Failed to load accounts: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load accounts on page load
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  // Handle account saved (added or updated)
  const handleAccountSaved = (savedAccount) => {
    console.log('Account saved:', savedAccount);
    loadAccounts(); // Refresh accounts list
    
    // Show success message
    const action = accountToEdit ? "updated" : "added";
    setSuccessMessage(`Account ${action} successfully!`);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  // Open modal for adding a new account
  const handleAddAccount = () => {
    setAccountToEdit(null); // Ensure we're in "add" mode
    setIsAccountModalOpen(true);
  };

  // Open modal for editing an existing account
  const handleEditAccount = (account) => {
    setAccountToEdit(account);
    setIsAccountModalOpen(true);
  };

  // Handle account deletion
  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }
    
    try {
      await deleteAccount(accountId);
      loadAccounts(); // Refresh accounts list
      setSuccessMessage("Account deleted successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Error deleting account:", error);
      setError("Failed to delete account: " + error.message);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Account Management (Production)</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Your Accounts</h2>
            <p className="text-gray-600">Manage your financial accounts here</p>
          </div>
          
          <button
            onClick={handleAddAccount}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <span className="mr-2">+</span> Add Account
          </button>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
            <button 
              className="ml-2 underline" 
              onClick={() => {
                setError(null);
                loadAccounts();
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
      
      {/* Accounts Table */}
      <div className="bg-white shadow-md rounded-lg p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.account_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.institution || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.type || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_category || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.balance.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-200 rounded-lg">
            <p className="text-gray-500 mb-4">No accounts found. Add an account to get started!</p>
            <button
              onClick={handleAddAccount}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Add Your First Account
            </button>
          </div>
        )}
      </div>
      
      {/* Production Account Modal */}
      {/* Note that we're using the actual AccountModal component here */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountAdded={handleAccountSaved}
        editAccount={accountToEdit}
      />
    </div>
  );
}