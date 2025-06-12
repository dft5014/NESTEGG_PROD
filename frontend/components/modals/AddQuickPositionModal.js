// components/modals/AddQuickPositionModal.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FixedModal from './FixedModal';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import { 
  addSecurityPosition, 
  addCryptoPosition, 
  addMetalPosition, 
  addRealEstatePosition,
  addCashPosition,
  searchSecurities,
  searchFXAssets 
} from '@/utils/apimethods/positionMethods';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import {
  Plus, X, Check, TrendingUp, Building2, Coins, DollarSign,
  Home, BarChart3, Briefcase, Eye, EyeOff, Save, Trash2,
  AlertCircle, CheckCircle, Clock, Hash, Search, ChevronDown
} from 'lucide-react';

export const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, theme = 'dark' }) => {
  // Check if embedded mode
  const isEmbedded = isOpen === true && !onClose;
  const isDark = theme === 'dark' && !isEmbedded;

  // Core state
  const [inputMode, setInputMode] = useState('byType'); // 'byType' or 'byAccount'
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [queuedPositions, setQueuedPositions] = useState([]);
  const [activeAssetType, setActiveAssetType] = useState('security');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  
  // Form states for each asset type
  const [securityForm, setSecurityForm] = useState({});
  const [cryptoForm, setCryptoForm] = useState({});
  const [metalForm, setMetalForm] = useState({});
  const [realEstateForm, setRealEstateForm] = useState({});
  const [cashForm, setCashForm] = useState({});
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Messages
  const [message, setMessage] = useState({ type: '', text: '' });

  // Asset type configuration
  const assetTypes = {
    security: {
      name: 'Securities',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-700',
      fields: ['ticker', 'shares', 'price', 'cost_basis', 'purchase_date']
    },
    crypto: {
      name: 'Cryptocurrency',
      icon: <Coins className="w-5 h-5" />,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-700',
      fields: ['symbol', 'quantity', 'purchase_price', 'current_price', 'purchase_date']
    },
    metal: {
      name: 'Precious Metals',
      icon: <Building2 className="w-5 h-5" />,
      color: 'yellow',
      gradient: 'from-yellow-500 to-yellow-700',
      fields: ['metal_type', 'quantity', 'unit', 'purchase_price', 'current_price_per_unit', 'purchase_date']
    },
    realestate: {
      name: 'Real Estate',
      icon: <Home className="w-5 h-5" />,
      color: 'green',
      gradient: 'from-green-500 to-green-700',
      fields: ['property_name', 'property_type', 'address', 'purchase_price', 'estimated_value', 'purchase_date']
    },
    cash: {
      name: 'Cash',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-700',
      fields: ['currency', 'amount', 'account_type', 'interest_rate']
    }
  };

  // Load accounts on mount
  useEffect(() => {
    if (isOpen || isEmbedded) {
      loadAccounts();
      // Reset state when modal opens
      setQueuedPositions([]);
      setMessage({ type: '', text: '' });
      resetAllForms();
    }
  }, [isOpen, isEmbedded]);

  const loadAccounts = async () => {
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
      if (fetchedAccounts.length > 0 && inputMode === 'byAccount') {
        setSelectedAccount(fetchedAccounts[0]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load accounts' });
    }
  };

  const resetAllForms = () => {
    setSecurityForm({});
    setCryptoForm({});
    setMetalForm({});
    setRealEstateForm({});
    setCashForm({});
    setSearchQuery('');
    setSearchResults([]);
  };

  // Calculate queue statistics
  const queueStats = useMemo(() => {
    const stats = {
      totalPositions: queuedPositions.length,
      byType: {},
      byAccount: {},
      totalValue: 0
    };

    queuedPositions.forEach(pos => {
      // Count by type
      stats.byType[pos.type] = (stats.byType[pos.type] || 0) + 1;
      
      // Count by account
      const accountName = pos.accountName || 'Unassigned';
      stats.byAccount[accountName] = (stats.byAccount[accountName] || 0) + 1;
      
      // Calculate total value
      if (pos.type === 'security') {
        stats.totalValue += (pos.data.shares || 0) * (pos.data.price || 0);
      } else if (pos.type === 'crypto') {
        stats.totalValue += (pos.data.quantity || 0) * (pos.data.current_price || 0);
      } else if (pos.type === 'metal') {
        stats.totalValue += (pos.data.quantity || 0) * (pos.data.current_price_per_unit || 0);
      } else if (pos.type === 'realestate') {
        stats.totalValue += pos.data.estimated_value || 0;
      } else if (pos.type === 'cash') {
        stats.totalValue += pos.data.amount || 0;
      }
    });

    return stats;
  }, [queuedPositions]);

  // Add position to queue
  const addToQueue = () => {
    let formData, isValid = true;
    
    // Get the appropriate form data
    switch (activeAssetType) {
      case 'security':
        formData = securityForm;
        if (!formData.ticker || !formData.shares || !formData.price) isValid = false;
        break;
      case 'crypto':
        formData = cryptoForm;
        if (!formData.symbol || !formData.quantity || !formData.current_price) isValid = false;
        break;
      case 'metal':
        formData = metalForm;
        if (!formData.metal_type || !formData.quantity || !formData.purchase_price) isValid = false;
        break;
      case 'realestate':
        formData = realEstateForm;
        if (!formData.property_name || !formData.purchase_price) isValid = false;
        break;
      case 'cash':
        formData = cashForm;
        if (!formData.currency || !formData.amount) isValid = false;
        break;
    }

    if (!isValid) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    // Add to queue
    const newPosition = {
      id: Date.now() + Math.random(), // Unique ID for React keys
      type: activeAssetType,
      accountId: inputMode === 'byAccount' ? selectedAccount?.id : formData.accountId,
      accountName: inputMode === 'byAccount' ? selectedAccount?.account_name : 
                   accounts.find(a => a.id === formData.accountId)?.account_name,
      data: { ...formData }
    };

    setQueuedPositions([...queuedPositions, newPosition]);
    
    // Reset form
    switch (activeAssetType) {
      case 'security':
        setSecurityForm({});
        break;
      case 'crypto':
        setCryptoForm({});
        break;
      case 'metal':
        setMetalForm({});
        break;
      case 'realestate':
        setRealEstateForm({});
        break;
      case 'cash':
        setCashForm({});
        break;
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setMessage({ type: 'success', text: `${assetTypes[activeAssetType].name} position added to queue` });
  };

  // Remove position from queue
  const removeFromQueue = (positionId) => {
    setQueuedPositions(queuedPositions.filter(p => p.id !== positionId));
  };

  // Submit all queued positions
  const submitAll = async () => {
    if (queuedPositions.length === 0) {
      setMessage({ type: 'error', text: 'No positions to submit' });
      return;
    }

    // Check if all positions have accounts assigned
    const unassignedPositions = queuedPositions.filter(p => !p.accountId);
    if (unassignedPositions.length > 0) {
      setMessage({ type: 'error', text: `${unassignedPositions.length} positions need account assignment` });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Group positions by type for batch processing
      const positionsByType = {
        security: queuedPositions.filter(p => p.type === 'security'),
        crypto: queuedPositions.filter(p => p.type === 'crypto'),
        metal: queuedPositions.filter(p => p.type === 'metal'),
        realestate: queuedPositions.filter(p => p.type === 'realestate'),
        cash: queuedPositions.filter(p => p.type === 'cash')
      };

      // Submit each type
      for (const [type, positions] of Object.entries(positionsByType)) {
        for (const position of positions) {
          try {
            switch (type) {
              case 'security':
                await addSecurityPosition(position.accountId, position.data);
                break;
              case 'crypto':
                await addCryptoPosition(position.accountId, position.data);
                break;
              case 'metal':
                await addMetalPosition(position.accountId, position.data);
                break;
              case 'realestate':
                await addRealEstatePosition(position.accountId, position.data);
                break;
              case 'cash':
                await addCashPosition(position.accountId, position.data);
                break;
            }
            successCount++;
          } catch (error) {
            console.error(`Error adding ${type} position:`, error);
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        setMessage({ type: 'success', text: `All ${successCount} positions added successfully!` });
        if (onPositionsSaved) {
          onPositionsSaved(successCount);
        }
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 2000);
      } else {
        setMessage({ 
          type: 'warning', 
          text: `${successCount} positions added, ${errorCount} failed` 
        });
      }
    } catch (error) {
      console.error('Error submitting positions:', error);
      setMessage({ type: 'error', text: 'Error submitting positions' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render position form based on asset type
  const renderPositionForm = () => {
    const inputClass = isDark 
      ? "px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
      : "px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

    switch (activeAssetType) {
      case 'security':
        return (
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search ticker or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${inputClass} pr-10`}
              />
              <Search className={`absolute right-3 top-2.5 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Ticker*"
                value={securityForm.ticker || ''}
                onChange={(e) => setSecurityForm({...securityForm, ticker: e.target.value.toUpperCase()})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Shares*"
                value={securityForm.shares || ''}
                onChange={(e) => setSecurityForm({...securityForm, shares: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Current Price*"
                value={securityForm.price || ''}
                onChange={(e) => setSecurityForm({...securityForm, price: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Cost Basis"
                value={securityForm.cost_basis || ''}
                onChange={(e) => setSecurityForm({...securityForm, cost_basis: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="date"
                placeholder="Purchase Date"
                value={securityForm.purchase_date || ''}
                onChange={(e) => setSecurityForm({...securityForm, purchase_date: e.target.value})}
                className={inputClass}
              />
              {inputMode === 'byType' && (
                <select
                  value={securityForm.accountId || ''}
                  onChange={(e) => setSecurityForm({...securityForm, accountId: parseInt(e.target.value)})}
                  className={inputClass}
                >
                  <option value="">Select Account*</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.institution}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );

      case 'crypto':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Symbol (e.g., BTC)*"
                value={cryptoForm.symbol || ''}
                onChange={(e) => setCryptoForm({...cryptoForm, symbol: e.target.value.toUpperCase()})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Quantity*"
                value={cryptoForm.quantity || ''}
                onChange={(e) => setCryptoForm({...cryptoForm, quantity: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Purchase Price*"
                value={cryptoForm.purchase_price || ''}
                onChange={(e) => setCryptoForm({...cryptoForm, purchase_price: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Current Price*"
                value={cryptoForm.current_price || ''}
                onChange={(e) => setCryptoForm({...cryptoForm, current_price: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="date"
                placeholder="Purchase Date"
                value={cryptoForm.purchase_date || ''}
                onChange={(e) => setCryptoForm({...cryptoForm, purchase_date: e.target.value})}
                className={inputClass}
              />
              {inputMode === 'byType' && (
                <select
                  value={cryptoForm.accountId || ''}
                  onChange={(e) => setCryptoForm({...cryptoForm, accountId: parseInt(e.target.value)})}
                  className={inputClass}
                >
                  <option value="">Select Account*</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.institution}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );

      case 'metal':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select
                value={metalForm.metal_type || ''}
                onChange={(e) => setMetalForm({...metalForm, metal_type: e.target.value})}
                className={inputClass}
              >
                <option value="">Select Metal*</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Platinum">Platinum</option>
                <option value="Palladium">Palladium</option>
              </select>
              <input
                type="number"
                placeholder="Quantity*"
                value={metalForm.quantity || ''}
                onChange={(e) => setMetalForm({...metalForm, quantity: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <select
                value={metalForm.unit || 'oz'}
                onChange={(e) => setMetalForm({...metalForm, unit: e.target.value})}
                className={inputClass}
              >
                <option value="oz">Ounces</option>
                <option value="g">Grams</option>
                <option value="kg">Kilograms</option>
              </select>
              <input
                type="number"
                placeholder="Purchase Price/Unit*"
                value={metalForm.purchase_price || ''}
                onChange={(e) => setMetalForm({...metalForm, purchase_price: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Current Price/Unit"
                value={metalForm.current_price_per_unit || ''}
                onChange={(e) => setMetalForm({...metalForm, current_price_per_unit: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="date"
                placeholder="Purchase Date"
                value={metalForm.purchase_date || ''}
                onChange={(e) => setMetalForm({...metalForm, purchase_date: e.target.value})}
                className={inputClass}
              />
              {inputMode === 'byType' && (
                <select
                  value={metalForm.accountId || ''}
                  onChange={(e) => setMetalForm({...metalForm, accountId: parseInt(e.target.value)})}
                  className={`${inputClass} col-span-2`}
                >
                  <option value="">Select Account*</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.institution}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );

      case 'realestate':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Property Name*"
                value={realEstateForm.property_name || ''}
                onChange={(e) => setRealEstateForm({...realEstateForm, property_name: e.target.value})}
                className={inputClass}
              />
              <select
                value={realEstateForm.property_type || ''}
                onChange={(e) => setRealEstateForm({...realEstateForm, property_type: e.target.value})}
                className={inputClass}
              >
                <option value="">Property Type</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Land">Land</option>
                <option value="Industrial">Industrial</option>
              </select>
              <input
                type="text"
                placeholder="Address"
                value={realEstateForm.address || ''}
                onChange={(e) => setRealEstateForm({...realEstateForm, address: e.target.value})}
                className={`${inputClass} col-span-2`}
              />
              <input
                type="number"
                placeholder="Purchase Price*"
                value={realEstateForm.purchase_price || ''}
                onChange={(e) => setRealEstateForm({...realEstateForm, purchase_price: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="number"
                placeholder="Estimated Value"
                value={realEstateForm.estimated_value || ''}
                onChange={(e) => setRealEstateForm({...realEstateForm, estimated_value: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <input
                type="date"
                placeholder="Purchase Date"
                value={realEstateForm.purchase_date || ''}
                onChange={(e) => setRealEstateForm({...realEstateForm, purchase_date: e.target.value})}
                className={inputClass}
              />
              {inputMode === 'byType' && (
                <select
                  value={realEstateForm.accountId || ''}
                  onChange={(e) => setRealEstateForm({...realEstateForm, accountId: parseInt(e.target.value)})}
                  className={inputClass}
                >
                  <option value="">Select Account*</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.institution}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );

      case 'cash':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select
                value={cashForm.currency || 'USD'}
                onChange={(e) => setCashForm({...cashForm, currency: e.target.value})}
                className={inputClass}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="CAD">CAD</option>
              </select>
              <input
                type="number"
                placeholder="Amount*"
                value={cashForm.amount || ''}
                onChange={(e) => setCashForm({...cashForm, amount: parseFloat(e.target.value)})}
                className={inputClass}
              />
              <select
                value={cashForm.account_type || ''}
                onChange={(e) => setCashForm({...cashForm, account_type: e.target.value})}
                className={inputClass}
              >
                <option value="">Account Type</option>
                <option value="Savings">Savings</option>
                <option value="Checking">Checking</option>
                <option value="Money Market">Money Market</option>
                <option value="CD">CD</option>
              </select>
              <input
                type="number"
                placeholder="Interest Rate %"
                value={cashForm.interest_rate || ''}
                onChange={(e) => setCashForm({...cashForm, interest_rate: parseFloat(e.target.value)})}
                className={inputClass}
              />
              {inputMode === 'byType' && (
                <select
                  value={cashForm.accountId || ''}
                  onChange={(e) => setCashForm({...cashForm, accountId: parseInt(e.target.value)})}
                  className={`${inputClass} col-span-2`}
                >
                  <option value="">Select Account*</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.institution}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
    }
  };

  // Content to render
  const content = (
    <div className="space-y-6">
      {/* Mode Toggle and Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-1 flex`}>
            <button
              onClick={() => setInputMode('byType')}
              className={`px-4 py-2 rounded-md transition-all ${
                inputMode === 'byType' 
                  ? 'bg-blue-600 text-white' 
                  : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              By Asset Type
            </button>
            <button
              onClick={() => setInputMode('byAccount')}
              className={`px-4 py-2 rounded-md transition-all ${
                inputMode === 'byAccount' 
                  ? 'bg-blue-600 text-white' 
                  : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              By Account
            </button>
          </div>
          
          <button
            onClick={() => setShowValues(!showValues)}
            className={`p-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}
          >
            {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Queue Stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <Hash className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Queued:</span>
            <span className="font-bold">{queueStats.totalPositions}</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Value:</span>
            <span className="font-bold">
              {showValues ? formatCurrency(queueStats.totalValue) : '••••'}
            </span>
          </div>
        </div>
      </div>

      {/* Account Selector (By Account mode) */}
      {inputMode === 'byAccount' && (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-700'} mb-2`}>
            Select Account
          </label>
          <select
            value={selectedAccount?.id || ''}
            onChange={(e) => {
              const account = accounts.find(a => a.id === parseInt(e.target.value));
              setSelectedAccount(account);
            }}
            className={`w-full px-4 py-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg`}
          >
            <option value="">Choose an account...</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.account_name} - {account.institution} ({account.type})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Asset Type Tabs */}
      <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex space-x-1 overflow-x-auto">
          {Object.entries(assetTypes).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveAssetType(key)}
              className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
                activeAssetType === key
                  ? `border-${config.color}-500 ${isDark ? 'text-white' : 'text-gray-900'}`
                  : `border-transparent ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              <div className={`p-1 rounded bg-gradient-to-r ${config.gradient}`}>
                {config.icon}
              </div>
              <span>{config.name}</span>
              {queueStats.byType[key] > 0 && (
                <span className={`ml-2 px-2 py-0.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full text-xs`}>
                  {queueStats.byType[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Position Entry Form */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-6`}>
        {renderPositionForm()}
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={addToQueue}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add to Queue</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-800' :
          message.type === 'warning' ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' :
          'bg-green-900/20 text-green-400 border border-green-800'
        }`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
           message.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
           <CheckCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Queue Dashboard */}
      {queuedPositions.length > 0 && (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-6`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Positions Queue ({queueStats.totalPositions})
          </h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {queuedPositions.map((position, index) => (
              <div key={position.id} className={`${isDark ? 'bg-gray-700' : 'bg-white'} rounded-lg p-4 flex items-center justify-between`}>
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded bg-gradient-to-r ${assetTypes[position.type].gradient}`}>
                    {assetTypes[position.type].icon}
                  </div>
                  <div>
                    <div className="font-medium">
                      {position.type === 'security' && position.data.ticker}
                      {position.type === 'crypto' && position.data.symbol}
                      {position.type === 'metal' && `${position.data.metal_type} (${position.data.quantity} ${position.data.unit})`}
                      {position.type === 'realestate' && position.data.property_name}
                      {position.type === 'cash' && `${position.data.currency} ${showValues ? formatCurrency(position.data.amount) : '••••'}`}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {position.accountName || 'Account not assigned'}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFromQueue(position.id)}
                  className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            setQueuedPositions([]);
            resetAllForms();
            setMessage({ type: 'success', text: 'Queue cleared' });
          }}
          className={`px-6 py-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${isDark ? 'text-white' : 'text-gray-700'} rounded-lg transition-colors`}
          disabled={queuedPositions.length === 0}
        >
          Clear Queue
        </button>
        
        <div className="flex space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className={`px-6 py-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${isDark ? 'text-white' : 'text-gray-700'} rounded-lg transition-colors`}
            >
              Cancel
            </button>
          )}
          <button
            onClick={submitAll}
            disabled={queuedPositions.length === 0 || isSubmitting}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Submit All ({queueStats.totalPositions})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // If embedded, return content without modal wrapper
  if (isEmbedded) {
    return content;
  }

  // Otherwise, use FixedModal wrapper
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Position Entry"
      maxWidth="max-w-6xl"
    >
      {content}
    </FixedModal>
  );
};

export default AddQuickPositionModal;