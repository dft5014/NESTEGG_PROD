// frontend/pages/test-position.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { fetchPositions } from '@/utils/apimethods/positionMethods';

// Import modal components
import PositionTypeModal from '@/components/modals/PositionTypeModal';
import AccountSelectModal from '@/components/modals/AccountSelectModal';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal';

export default function TestPositionPage() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  
  // Account state
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  // Position states
  const [positions, setPositions] = useState({});
  const [loadingPositions, setLoadingPositions] = useState({});
  
  // Selected states
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedPositionType, setSelectedPositionType] = useState(null);
  
  // Modal states
  const [isPositionTypeModalOpen, setIsPositionTypeModalOpen] = useState(false);
  const [isAccountSelectModalOpen, setIsAccountSelectModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
  const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState(false);
  
  // Position to edit
  const [positionToEdit, setPositionToEdit] = useState(null);
  
  // Messages
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Fetch accounts
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    
    try {
      const accountsData = await fetchAccounts();
      setAccounts(accountsData);
      
      // If we have accounts, load positions for the first account
      if (accountsData.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsData[0]);
        loadPositions(accountsData[0].id);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setMessage('Failed to load accounts. Please try again.');
      setMessageType('error');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Load accounts on mount
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  // Fetch positions for an account
  const loadPositions = async (accountId) => {
    if (!accountId) return;
    
    setLoadingPositions(prev => ({ ...prev, [accountId]: true }));
    
    try {
      const positionsData = await fetchPositions(accountId);
      setPositions(prev => ({ ...prev, [accountId]: positionsData }));
    } catch (error) {
      console.error(`Error loading positions for account ${accountId}:`, error);
      setPositions(prev => ({ ...prev, [accountId]: [] }));
    } finally {
      setLoadingPositions(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Handle selecting an account
  const handleSelectAccount = (account) => {
    setSelectedAccount(account);
    loadPositions(account.id);
    
    // Show success message
    setMessage(`Account "${account.account_name}" selected.`);
    setMessageType('success');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  // Start position add flow
  const handleAddPosition = () => {
    if (accounts.length === 0) {
      setMessage('Please add an account first before adding positions.');
      setMessageType('error');
      return;
    }
    
    // If we only have one account, skip account selection
    if (accounts.length === 1) {
      setSelectedAccount(accounts[0]);
      setIsPositionTypeModalOpen(true);
    } else {
      // Show account selection modal
      setIsAccountSelectModalOpen(true);
    }
  };

  // Handle account selection for position
  const handleAccountSelected = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    
    if (account) {
      setSelectedAccount(account);
      setIsAccountSelectModalOpen(false);
      setIsPositionTypeModalOpen(true);
    }
  };

  // Handle position type selection
  const handlePositionTypeSelected = (type) => {
    setSelectedPositionType(type);
    setIsPositionTypeModalOpen(false);
    
    // Open appropriate modal based on type
    switch (type) {
      case 'security':
        setIsSecurityModalOpen(true);
        break;
      case 'crypto':
        setIsCryptoModalOpen(true);
        break;
      case 'metal':
        setIsMetalModalOpen(true);
        break;
      case 'realestate':
        setIsRealEstateModalOpen(true);
        break;
      default:
        console.warn(`Unknown position type: ${type}`);
    }
  };

  // Handle position saved
  const handlePositionSaved = () => {
    // Refresh positions for the selected account
    if (selectedAccount) {
      loadPositions(selectedAccount.id);
    }
    
    // Show success message
    setMessage(`${selectedPositionType} position saved successfully!`);
    setMessageType('success');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage('');
    }, 3000);
    
    // Reset state
    setSelectedPositionType(null);
    setPositionToEdit(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Position Management Test</h1>
      
      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Accounts</h2>
          </div>
          
          {loadingAccounts ? (
            <div className="py-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : accounts.length > 0 ? (
            <ul className="space-y-2">
              {accounts.map(account => (
                <li 
                  key={account.id}
                  className={`p-3 border rounded-lg ${
                    selectedAccount?.id === account.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  } cursor-pointer transition-colors`}
                  onClick={() => handleSelectAccount(account)}
                >
                  <div className="font-medium">{account.account_name}</div>
                  <div className="text-sm text-gray-500">
                    {account.institution ? `${account.institution} • ` : ''}
                    {account.type || account.account_category || 'Account'}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-6 text-center">
              <p className="text-gray-500 mb-4">No accounts found.</p>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => router.push('/test-production')}
              >
                Add Your First Account
              </button>
            </div>
          )}
        </div>
        
        {/* Positions Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {selectedAccount ? `Positions for ${selectedAccount.account_name}` : 'Select an Account'}
            </h2>
            <button
              onClick={handleAddPosition}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <span className="mr-2">+</span> Add Position
            </button>
          </div>
          
          {selectedAccount ? (
            loadingPositions[selectedAccount.id] ? (
              <div className="py-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : positions[selectedAccount.id]?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {positions[selectedAccount.id].map(position => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="font-medium">
                            {position.ticker || position.coin_symbol || position.metal_type || 'Property'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {position.name || position.coin_type || position.description || position.address || ''}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                          {position.ticker ? 'Security' : 
                           position.coin_symbol ? 'Crypto' :
                           position.metal_type ? 'Metal' :
                           position.address ? 'Real Estate' : 'Other'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          {position.shares ? `${position.shares.toLocaleString()} shares` : 
                           position.quantity ? `${position.quantity.toLocaleString()} ${position.unit || 'units'}` :
                           position.address ? '1 property' : ''}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right font-medium">
                          {position.value ? `$${position.value.toLocaleString()}` : 
                           position.estimated_market_value ? `$${position.estimated_market_value.toLocaleString()}` :
                           ''}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          <button 
                            className="text-blue-600 hover:text-blue-900 mr-2"
                            onClick={() => {
                              setPositionToEdit(position);
                              
                              if (position.ticker) {
                                setSelectedPositionType('security');
                                setIsSecurityModalOpen(true);
                              } else if (position.coin_symbol) {
                                setSelectedPositionType('crypto');
                                setIsCryptoModalOpen(true);
                              } else if (position.metal_type) {
                                setSelectedPositionType('metal');
                                setIsMetalModalOpen(true);
                              } else if (position.address) {
                                setSelectedPositionType('realestate');
                                setIsRealEstateModalOpen(true);
                              }
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-gray-500 mb-4">No positions found for this account.</p>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={handleAddPosition}
                >
                  Add Your First Position
                </button>
              </div>
            )
          ) : (
            <div className="py-6 text-center text-gray-500">
              Select an account to view positions
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <AccountSelectModal 
        isOpen={isAccountSelectModalOpen}
        onClose={() => setIsAccountSelectModalOpen(false)}
        onAccountSelected={handleAccountSelected}
      />
      
      <PositionTypeModal 
        isOpen={isPositionTypeModalOpen}
        onClose={() => setIsPositionTypeModalOpen(false)}
        onTypeSelected={handlePositionTypeSelected}
      />
      
      <SecurityPositionModal 
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
        positionToEdit={selectedPositionType === 'security' ? positionToEdit : null}
      />
      
      <CryptoPositionModal 
        isOpen={isCryptoModalOpen}
        onClose={() => setIsCryptoModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
        positionToEdit={selectedPositionType === 'crypto' ? positionToEdit : null}
      />
      
      <MetalPositionModal 
        isOpen={isMetalModalOpen}
        onClose={() => setIsMetalModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
        positionToEdit={selectedPositionType === 'metal' ? positionToEdit : null}
      />
      
      <RealEstatePositionModal 
        isOpen={isRealEstateModalOpen}
        onClose={() => setIsRealEstateModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
        positionToEdit={selectedPositionType === 'realestate' ? positionToEdit : null}
      />
    </div>
  );
}