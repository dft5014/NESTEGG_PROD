import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FixedModal from './FixedModal';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import { 
  addSecurityPosition, 
  addCryptoPosition, 
  addMetalPosition, 
  addCashPosition,
  addOtherAsset,
  searchSecurities 
} from '@/utils/apimethods/positionMethods';
import debounce from 'lodash.debounce';
import {
  Plus, X, Check, TrendingUp, Building2, Coins, DollarSign,
  Home, BarChart3, AlertCircle, CheckCircle, Hash,
  Copy, Sparkles, Activity, Layers, Shield, Gem,
  ChevronDown, Save, Trash2, Info, Loader2, Eye, EyeOff,
  Search, Calendar, Wallet, ChevronRight, AlertTriangle,
  FileText, Undo, Redo, HelpCircle, Zap, CheckCheck
} from 'lucide-react';

// Enhanced validation with suggestions
const ValidationSummary = ({ errors, onFix }) => {
  if (!errors || errors.length === 0) return null;
  
  const groupedErrors = errors.reduce((acc, err) => {
    const key = err.field;
    if (!acc[key]) acc[key] = [];
    acc[key].push(err);
    return acc;
  }, {});

  return (
    <div className="fixed bottom-20 right-6 w-80 bg-white rounded-lg shadow-xl border border-red-200 p-4 animate-in slide-in-from-right">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="font-semibold text-red-900">{errors.length} Issues</span>
        </div>
        <button
          onClick={() => onFix('all')}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Fix All
        </button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {Object.entries(groupedErrors).map(([field, fieldErrors]) => (
          <div key={field} className="bg-red-50 rounded p-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 capitalize">
                  {field.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  {fieldErrors[0].message}
                </p>
              </div>
              <button
                onClick={() => onFix(field)}
                className="ml-2 px-2 py-1 text-xs bg-white text-red-600 rounded hover:bg-red-100"
              >
                Fix
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Smart search with better dropdown
const SmartSearchField = ({ 
  value, 
  onChange, 
  onSelect, 
  assetType, 
  placeholder,
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const searchResults = await searchSecurities(query);
        const filtered = assetType === 'security' 
          ? searchResults.filter(item => item.asset_type === 'security' || item.asset_type === 'index')
          : assetType === 'crypto'
          ? searchResults.filter(item => item.asset_type === 'crypto')
          : searchResults;
        
        setResults(filtered);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [assetType]
  );

  useEffect(() => {
    debouncedSearch(value);
  }, [value, debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value && setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {isOpen && (results.length > 0 || recentSearches.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          {recentSearches.length > 0 && !results.length && (
            <div className="p-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 px-2 pb-1">Recent</p>
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded flex items-center justify-between"
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                >
                  <span className="font-medium">{item.ticker}</span>
                  <span className="text-sm text-gray-500">{item.name}</span>
                </button>
              ))}
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto">
            {results.map((result, idx) => (
              <button
                key={idx}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                onClick={() => {
                  onSelect(result);
                  setRecentSearches(prev => [result, ...prev.filter(r => r.ticker !== result.ticker)].slice(0, 5));
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-semibold">{result.ticker}</span>
                  <span className="text-sm text-gray-500 truncate">{result.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  ${parseFloat(result.price || 0).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main refactored component
const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // State management
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [activeTab, setActiveTab] = useState('security');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showHelp, setShowHelp] = useState(false);

  // Asset type configurations
  const assetTypes = {
    security: {
      label: 'Securities',
      icon: BarChart3,
      color: 'blue',
      fields: [
        { key: 'ticker', label: 'Ticker', type: 'search', required: true },
        { key: 'name', label: 'Name', type: 'text', readOnly: true },
        { key: 'shares', label: 'Shares', type: 'number', required: true },
        { key: 'price', label: 'Price', type: 'number', readOnly: true },
        { key: 'cost_basis', label: 'Cost Basis', type: 'number', required: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
        { key: 'account_id', label: 'Account', type: 'select', required: true }
      ]
    },
    crypto: {
      label: 'Cryptocurrency',
      icon: Coins,
      color: 'orange',
      fields: [
        { key: 'symbol', label: 'Symbol', type: 'search', required: true },
        { key: 'name', label: 'Name', type: 'text', readOnly: true },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, step: 0.00000001 },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', required: true },
        { key: 'current_price', label: 'Current Price', type: 'number', readOnly: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
        { key: 'account_id', label: 'Account', type: 'select', required: true }
      ]
    },
    metal: {
      label: 'Precious Metals',
      icon: Gem,
      color: 'yellow',
      fields: [
        { key: 'metal_type', label: 'Metal Type', type: 'select', required: true, 
          options: [
            { value: 'Gold', label: 'Gold' },
            { value: 'Silver', label: 'Silver' },
            { value: 'Platinum', label: 'Platinum' }
          ]
        },
        { key: 'quantity', label: 'Quantity (oz)', type: 'number', required: true },
        { key: 'purchase_price', label: 'Price/oz', type: 'number', required: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
        { key: 'account_id', label: 'Account', type: 'select', required: true }
      ]
    },
    cash: {
      label: 'Cash & Equivalents',
      icon: DollarSign,
      color: 'green',
      fields: [
        { key: 'cash_type', label: 'Type', type: 'select', required: true,
          options: [
            { value: 'Savings', label: 'Savings' },
            { value: 'Checking', label: 'Checking' },
            { value: 'Money Market', label: 'Money Market' }
          ]
        },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'interest_rate', label: 'APY %', type: 'number', step: 0.01 },
        { key: 'account_id', label: 'Account', type: 'select', required: true }
      ]
    },
    otherAssets: {
      label: 'Other Assets',
      icon: Home,
      color: 'purple',
      fields: [
        { key: 'asset_name', label: 'Asset Name', type: 'text', required: true },
        { key: 'asset_type', label: 'Type', type: 'select', required: true,
          options: [
            { value: 'real_estate', label: 'Real Estate' },
            { value: 'vehicle', label: 'Vehicle' },
            { value: 'collectible', label: 'Collectible' }
          ]
        },
        { key: 'current_value', label: 'Current Value', type: 'number', required: true },
        { key: 'cost', label: 'Purchase Price', type: 'number' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date' }
      ]
    }
  };

  // Load accounts on mount
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      initializePositions();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      const data = await fetchAllAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const initializePositions = () => {
    if (seedPositions) {
      // Convert seed positions to unified format
      const allPositions = [];
      Object.entries(seedPositions).forEach(([type, items]) => {
        items?.forEach(item => {
          allPositions.push({
            id: Date.now() + Math.random(),
            type,
            data: item.data || item,
            errors: {}
          });
        });
      });
      setPositions(allPositions);
    } else {
      // Start with one empty row
      addNewRow();
    }
  };

  // Add new row
  const addNewRow = (type = activeTab) => {
    const newPosition = {
      id: Date.now() + Math.random(),
      type,
      data: {},
      errors: {}
    };
    
    setPositions(prev => [...prev, newPosition]);
    saveHistory();
  };

  // Update position
  const updatePosition = (id, field, value) => {
    setPositions(prev => prev.map(pos => {
      if (pos.id === id) {
        return {
          ...pos,
          data: { ...pos.data, [field]: value },
          errors: { ...pos.errors, [field]: null }
        };
      }
      return pos;
    }));
    saveHistory();
  };

  // Delete position
  const deletePosition = (id) => {
    setPositions(prev => prev.filter(pos => pos.id !== id));
    saveHistory();
  };

  // Bulk delete
  const deleteSelected = () => {
    setPositions(prev => prev.filter(pos => !selectedRows.has(pos.id)));
    setSelectedRows(new Set());
    saveHistory();
  };

  // History management
  const saveHistory = () => {
    const currentState = JSON.stringify(positions);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), currentState]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setPositions(JSON.parse(history[historyIndex - 1]));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setPositions(JSON.parse(history[historyIndex + 1]));
    }
  };

  // Validation
  const validatePositions = () => {
    const errors = [];
    let isValid = true;

    positions.forEach((pos, idx) => {
      const config = assetTypes[pos.type];
      config.fields.forEach(field => {
        if (field.required && !pos.data[field.key]) {
          errors.push({
            positionId: pos.id,
            row: idx + 1,
            field: field.key,
            message: `${field.label} is required`
          });
          isValid = false;
        }
      });
    });

    setValidationErrors(errors);
    return isValid;
  };

  // Auto-fix validation errors
  const autoFixErrors = (field) => {
    if (field === 'all') {
      // Implement smart auto-fix logic
      setPositions(prev => prev.map(pos => {
        const newData = { ...pos.data };
        const config = assetTypes[pos.type];
        
        config.fields.forEach(f => {
          if (f.required && !newData[f.key]) {
            // Apply smart defaults
            if (f.type === 'date') {
              newData[f.key] = new Date().toISOString().split('T')[0];
            } else if (f.type === 'number') {
              newData[f.key] = 0;
            } else if (f.key === 'account_id' && accounts.length > 0) {
              newData[f.key] = accounts[0].id;
            }
          }
        });
        
        return { ...pos, data: newData };
      }));
    }
    setValidationErrors([]);
  };

  // Submit positions
  const submitPositions = async () => {
    if (!validatePositions()) return;

    setIsSubmitting(true);
    let successCount = 0;
    const errors = [];

    try {
      for (const position of positions) {
        try {
          switch (position.type) {
            case 'security':
              await addSecurityPosition(position.data.account_id, position.data);
              break;
            case 'crypto':
              await addCryptoPosition(position.data.account_id, {
                coin_symbol: position.data.symbol,
                coin_type: position.data.name,
                quantity: position.data.quantity,
                purchase_price: position.data.purchase_price,
                purchase_date: position.data.purchase_date
              });
              break;
            case 'metal':
              await addMetalPosition(position.data.account_id, {
                metal_type: position.data.metal_type,
                quantity: position.data.quantity,
                purchase_price: position.data.purchase_price,
                purchase_date: position.data.purchase_date
              });
              break;
            case 'cash':
              await addCashPosition(position.data.account_id, {
                ...position.data,
                interest_rate: position.data.interest_rate ? position.data.interest_rate / 100 : null
              });
              break;
            case 'otherAssets':
              await addOtherAsset(position.data);
              break;
          }
          successCount++;
        } catch (error) {
          errors.push(`${position.type}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        onPositionsSaved?.(successCount, positions);
        onClose();
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const byType = {};
    let totalValue = 0;

    Object.keys(assetTypes).forEach(type => {
      const typePositions = positions.filter(p => p.type === type);
      const value = typePositions.reduce((sum, pos) => {
        if (type === 'security') {
          return sum + ((pos.data.shares || 0) * (pos.data.price || 0));
        } else if (type === 'crypto') {
          return sum + ((pos.data.quantity || 0) * (pos.data.current_price || 0));
        } else if (type === 'cash' || type === 'otherAssets') {
          return sum + (pos.data.amount || pos.data.current_value || 0);
        }
        return sum;
      }, 0);

      byType[type] = { count: typePositions.length, value };
      totalValue += value;
    });

    return { byType, totalValue, totalCount: positions.length };
  }, [positions]);

  // Render field input
  const renderField = (position, field, config) => {
    const value = position.data[field.key] || '';

    if (field.type === 'search') {
      return (
        <SmartSearchField
          value={value}
          onChange={(val) => updatePosition(position.id, field.key, val)}
          onSelect={(result) => {
            updatePosition(position.id, field.key, result.ticker || result.symbol);
            updatePosition(position.id, 'name', result.name);
            updatePosition(position.id, 'price', result.price);
            updatePosition(position.id, 'current_price', result.price);
          }}
          assetType={position.type}
          placeholder={field.label}
        />
      );
    }

    if (field.type === 'select' && field.key === 'account_id') {
      return (
        <select
          value={value}
          onChange={(e) => updatePosition(position.id, field.key, e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Account...</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.account_name}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => updatePosition(position.id, field.key, e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => updatePosition(position.id, field.key, e.target.value)}
        placeholder={field.label}
        readOnly={field.readOnly}
        step={field.step}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
          field.readOnly ? 'bg-gray-50' : ''
        }`}
      />
    );
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Positions"
      size="max-w-7xl"
    >
      <div className="flex flex-col h-[85vh]">
        {/* Header Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            {/* Asset type tabs */}
            {Object.entries(assetTypes).map(([key, config]) => {
              const Icon = config.icon;
              const count = positions.filter(p => p.type === key).length;
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`
                    flex items-center px-3 py-2 rounded-lg font-medium transition-all
                    ${activeTab === key 
                      ? `bg-${config.color}-600 text-white` 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span>{config.label}</span>
                  {count > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === key ? 'bg-white/20' : 'bg-gray-200'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-3">
            {/* Action buttons */}
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowValues(!showValues)}
              className={`p-2 rounded-lg ${
                showValues ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-gray-300" />

            {selectedRows.size > 0 && (
              <button
                onClick={deleteSelected}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedRows.size} Selected
              </button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-sm text-gray-600">Total Positions</span>
              <p className="text-xl font-bold">{stats.totalCount}</p>
            </div>
            
            {showValues && (
              <div>
                <span className="text-sm text-gray-600">Total Value</span>
                <p className="text-xl font-bold">${stats.totalValue.toLocaleString()}</p>
              </div>
            )}

            {Object.entries(stats.byType).map(([type, data]) => {
              if (data.count === 0) return null;
              const config = assetTypes[type];
              const Icon = config.icon;
              
              return (
                <div key={type} className="flex items-center space-x-2">
                  <Icon className={`w-4 h-4 text-${config.color}-600`} />
                  <div>
                    <span className="text-sm text-gray-600">{data.count}</span>
                    {showValues && (
                      <span className="text-sm text-gray-500 ml-1">
                        (${data.value.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => addNewRow()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {positions.filter(p => p.type === activeTab).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center">
                {React.createElement(assetTypes[activeTab].icon, {
                  className: `w-16 h-16 text-gray-300 mx-auto mb-4`
                })}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {assetTypes[activeTab].label} Yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Start adding {assetTypes[activeTab].label.toLowerCase()} to your portfolio
                </p>
                <button
                  onClick={() => addNewRow(activeTab)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {assetTypes[activeTab].label}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {positions
                .filter(p => p.type === activeTab)
                .map((position, idx) => (
                  <div
                    key={position.id}
                    className={`
                      bg-white border rounded-lg p-4 transition-all
                      ${selectedRows.has(position.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      ${position.errors && Object.keys(position.errors).length > 0 ? 'border-red-300' : ''}
                    `}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Row selector */}
                      <div className="flex items-center pt-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(position.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedRows);
                            if (e.target.checked) {
                              newSelected.add(position.id);
                            } else {
                              newSelected.delete(position.id);
                            }
                            setSelectedRows(newSelected);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-500">#{idx + 1}</span>
                      </div>

                      {/* Fields grid */}
                      <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {assetTypes[activeTab].fields.map(field => (
                          <div key={field.key}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {renderField(position, field, assetTypes[activeTab])}
                            {position.errors?.[field.key] && (
                              <p className="text-xs text-red-600 mt-1">{position.errors[field.key]}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 pt-7">
                        <button
                          onClick={() => {
                            const newPos = {
                              ...position,
                              id: Date.now() + Math.random(),
                              data: { ...position.data, shares: '', quantity: '', amount: '' }
                            };
                            setPositions(prev => [...prev, newPos]);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deletePosition(position.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Position value display */}
                    {showValues && position.data.shares && position.data.price && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Position Value</span>
                          <span className="font-semibold">
                            ${((position.data.shares || 0) * (position.data.price || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPositions([])}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Clear All
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>

            <button
              onClick={submitPositions}
              disabled={positions.length === 0 || isSubmitting}
              className={`
                px-6 py-2 rounded-lg font-medium flex items-center
                ${positions.length === 0 || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit {positions.length} Position{positions.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation Summary */}
        {validationErrors.length > 0 && (
          <ValidationSummary
            errors={validationErrors}
            onFix={autoFixErrors}
          />
        )}

        {/* Help Panel */}
        {showHelp && (
          <div className="fixed right-0 top-20 bottom-20 w-80 bg-white shadow-xl border-l border-gray-200 p-6 overflow-y-auto z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Quick Help</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Keyboard Shortcuts</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Add New Row</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Submit</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+Enter</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Undo</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+Z</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Redo</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+Y</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Tips</h4>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li className="flex items-start">
                    <Zap className="w-3 h-3 mr-1 mt-0.5 text-yellow-500" />
                    <span>Start typing ticker symbols to search for securities</span>
                  </li>
                  <li className="flex items-start">
                    <Sparkles className="w-3 h-3 mr-1 mt-0.5 text-purple-500" />
                    <span>Use the duplicate button to quickly create similar positions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCheck className="w-3 h-3 mr-1 mt-0.5 text-green-500" />
                    <span>Validation runs automatically before submission</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </FixedModal>
  );
};

export default AddQuickPositionModal;