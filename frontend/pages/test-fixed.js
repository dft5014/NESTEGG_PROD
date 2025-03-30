// pages/test-fixed.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import FixedModal from '@/components/modals/FixedModal';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

// Simple Account Form Component
const SimpleAccountForm = ({ onSubmit, onCancel }) => {
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountName || !accountType) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    try {
      await onSubmit({ 
        account_name: accountName,
        type: accountType,
        account_category: accountType === 'Checking' || accountType === 'Savings' ? 'cash' : 'brokerage',
        balance: 0
      });
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Error submitting form: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Account Name</label>
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="My Account"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Account Type</label>
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select Type</option>
          <option value="Individual">Individual Brokerage</option>
          <option value="Checking">Checking</option>
          <option value="Savings">Savings</option>
        </select>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding..." : "Add Account"}
        </button>
      </div>
    </form>
  );
};

export default function TestFixedPage() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Handle form submission
  const handleAddAccount = async (accountData) => {
    try {
      console.log("Adding account:", accountData);
      
      // Using fetch directly here for debugging
      const token = localStorage.getItem('token');
      if (!token) throw new Error("No authentication token found");
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accountData)
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(errorText || `Failed to add account (${response.status})`);
      }
      
      const data = await response.json();
      console.log("Account added:", data);
      
      // Refresh accounts list and close modal
      await loadAccounts();
      setIsModalOpen(false);
      
      // Show success message
      alert("Account added successfully!");
    } catch (error) {
      console.error("Error adding account:", error);
      alert("Failed to add account: " + error.message);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Account Management (Fixed)</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <p className="mb-4">This page lets you test the fixed modal implementation for adding accounts.</p>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Open Add Account Modal
        </button>
      </div>
      
      {/* Debugging information */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="font-bold mb-2">Debugging Info:</h2>
        <p>Modal Open: {isModalOpen ? "Yes" : "No"}</p>
        <p>Loading: {loading ? "Yes" : "No"}</p>
        <p>Error: {error || "None"}</p>
        <p>Accounts Count: {accounts.length}</p>
      </div>
      
      {/* Accounts Table */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Your Accounts</h2>
        
        {loading ? (
          <p className="text-center py-4">Loading accounts...</p>
        ) : error ? (
          <p className="text-center py-4 text-red-600">{error}</p>
        ) : accounts.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.account_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.type || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_category || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center py-4 text-gray-500">No accounts found. Add an account to get started!</p>
        )}
      </div>
      
      {/* Fixed Modal with Simple Account Form */}
      <FixedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Account"
      >
        <SimpleAccountForm
          onSubmit={handleAddAccount}
          onCancel={() => setIsModalOpen(false)}
        />
      </FixedModal>
    </div>
  );
}