// pages/test.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import AccountModal from '@/components/modals/AccountModal';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

export default function TestPage() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch accounts on page load and after updates
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const accountsData = await fetchAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError(error.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  // Handle account added/updated
  const handleAccountSaved = () => {
    // Refresh the accounts list
    loadAccounts();
  };

  // Get logo for account table (reusing from portfolio.js)
  const getInstitutionLogo = (institutionName) => {
    if (!institutionName) return null;
    
    // Assuming you have popularBrokerages imported or defined somewhere
    const popularBrokerages = window.popularBrokerages || [];
    
    const brokerage = popularBrokerages.find(
      broker => broker.name.toLowerCase() === institutionName.toLowerCase()
    );
    
    return brokerage ? brokerage.logo : null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Account Modal Test Page</h1>
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center"
          >
            <span className="mr-2">+</span> Add Account
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading accounts...</p>
          </div>
        ) : accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 whitespace-nowrap font-medium text-gray-900">{account.account_name}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getInstitutionLogo(account.institution) ? (
                          <img 
                            src={getInstitutionLogo(account.institution)} 
                            alt={account.institution} 
                            className="w-6 h-6 object-contain mr-2"
                            onError={(e) => {
                              e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzk0YTNiOCI+PzwvdGV4dD48L3N2Zz4=";
                            }}
                          />
                        ) : account.institution && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-xs font-medium">
                            {account.institution.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {account.institution || "N/A"}
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-gray-700">{account.type || "N/A"}</td>
                    <td className="py-4 px-4 whitespace-nowrap text-gray-700">{account.account_category || "N/A"}</td>
                    <td className="py-4 px-4 whitespace-nowrap text-gray-700">${account.balance.toLocaleString()}</td>
                    <td className="py-4 px-4 whitespace-nowrap text-gray-500">
                      {new Date(account.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-gray-200 rounded-lg">
            <p className="text-gray-500">No accounts found. Add an account to get started!</p>
          </div>
        )}
      </div>
      
      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountAdded={handleAccountSaved}
        editAccount={null}
      />
    </div>
  );
}