// frontend/components/modals/AccountSelectModal.js
import React, { useState, useEffect, useMemo } from 'react';
import FixedModal from './FixedModal';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { Search, Filter, Check, ArrowRight, Briefcase, Landmark, DollarSign, Bitcoin, Database, Home, X } from 'lucide-react';

const AccountSelectModal = ({ isOpen, onClose, onAccountSelected }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Account categories with icons
  const categories = [
    { id: "all", name: "All Accounts", icon: <Filter className="w-4 h-4" /> },
    { id: "brokerage", name: "Brokerage", icon: <Briefcase className="w-4 h-4" /> },
    { id: "retirement", name: "Retirement", icon: <Landmark className="w-4 h-4" /> },
    { id: "cash", name: "Cash", icon: <DollarSign className="w-4 h-4" /> },
    { id: "crypto", name: "Crypto", icon: <Bitcoin className="w-4 h-4" /> },
    { id: "metals", name: "Metals", icon: <Database className="w-4 h-4" /> },
    { id: "realestate", name: "Real Estate", icon: <Home className="w-4 h-4" /> }
  ];

  // Load accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    } else {
      // Reset search and filter when modal closes
      setSearchQuery('');
      setSelectedCategory('all');
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

  // Filter and search accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
                             account.account_category === selectedCategory;
      
      // Search query filter
      const matchesSearch = searchQuery.trim() === '' || 
                           account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (account.institution && account.institution.toLowerCase().includes(searchQuery.toLowerCase())) ||
                           (account.type && account.type.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [accounts, selectedCategory, searchQuery]);

  // Get icon for account category
  const getAccountCategoryIcon = (category) => {
    switch (category) {
      case "brokerage": return <Briefcase className="w-5 h-5 text-blue-600" />;
      case "retirement": return <Landmark className="w-5 h-5 text-purple-600" />;
      case "cash": return <DollarSign className="w-5 h-5 text-green-600" />;
      case "crypto": return <Bitcoin className="w-5 h-5 text-orange-500" />;
      case "metals": return <Database className="w-5 h-5 text-yellow-600" />;
      case "realestate": return <Home className="w-5 h-5 text-red-600" />;
      default: return <Briefcase className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Account"
    >
      <div className="space-y-4">
        {/* Description text at the top */}
        <p className="text-gray-600 mb-4">
          Choose which account to add this position to:
        </p>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setSearchQuery('')}
            >
              <span className="sr-only">Clear search</span>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1.5">{category.icon}</span>
              {category.name}
              {selectedCategory === category.id && (
                <Check className="ml-1 w-3.5 h-3.5" />
              )}
            </button>
          ))}
        </div>

        {/* Status Messages */}
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-gray-500">Loading accounts...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            {error}
            <button 
              className="ml-2 underline text-red-600"
              onClick={loadAccounts}
            >
              Retry
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
            No accounts found. Please add an account first.
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-md text-center">
            <p className="text-gray-600 mb-2">No matching accounts found</p>
            <button 
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {filteredAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  console.log(`Selected account: ${account.id} (${account.account_name})`);
                  onAccountSelected(account.id);
                }}
                className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 hover:border-blue-300 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 mr-3">
                    {getAccountCategoryIcon(account.account_category)}
                  </div>
                  <div>
                    <div className="font-medium">{account.account_name}</div>
                    <div className="text-sm text-gray-500">
                      {account.institution ? `${account.institution} • ` : ''}
                      {account.type || account.account_category || 'Account'}
                    </div>
                  </div>
                </div>
                <div className="text-blue-600 text-sm group-hover:translate-x-1 transition-transform duration-200 flex items-center">
                  Select <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Footer Button */}
        <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Add custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #bbb;
        }
      `}</style>
    </FixedModal>
  );
};

export default AccountSelectModal;