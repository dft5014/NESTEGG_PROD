import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  AlertCircle, CheckCircle, Clock, Hash, Search, ChevronDown,
  Copy, ArrowUp, ArrowDown, Sparkles, Zap, Activity, Layers,
  FileSpreadsheet, Table, Grid3x3, Filter, Download, Upload,
  Keyboard, MousePointer, MoreVertical, ChevronRight, Shield,
  PieChart, Target, Wallet, CreditCard, Gem, Building,
  ChevronUp, Edit3, CheckSquare, Square, ListPlus
} from 'lucide-react';

export const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, theme = 'dark' }) => {
  // Core state
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({
    security: [],
    crypto: [],
    metal: [],
    realestate: [],
    cash: []
  });
  const [collapsedSections, setCollapsedSections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [focusedCell, setFocusedCell] = useState(null);
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Refs
  const cellRefs = useRef({});
  
  // Theme
  const isDark = theme === 'dark';

  // Asset type configuration
  const assetTypes = {
    security: {
      name: 'Securities',
      icon: BarChart3,
      color: '#3B82F6',
      bgColor: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      darkBg: 'bg-blue-950/20',
      borderColor: 'border-blue-500',
      description: 'Stocks, ETFs, Mutual Funds',
      fields: [
        { key: 'ticker', label: 'Ticker', type: 'text', required: true, width: 'w-28', placeholder: 'AAPL', transform: 'uppercase' },
        { key: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-24', placeholder: '100' },
        { key: 'price', label: 'Price', type: 'number', required: true, width: 'w-24', placeholder: '150.00', prefix: '$' },
        { key: 'cost_basis', label: 'Cost Basis', type: 'number', width: 'w-28', placeholder: '140.00', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    crypto: {
      name: 'Cryptocurrency',
      icon: Coins,
      color: '#F97316',
      bgColor: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      darkBg: 'bg-orange-950/20',
      borderColor: 'border-orange-500',
      description: 'Bitcoin, Ethereum, and other digital assets',
      fields: [
        { key: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24', placeholder: 'BTC', transform: 'uppercase' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28', placeholder: '0.5', step: '0.00000001' },
        { key: 'purchase_price', label: 'Purchase', type: 'number', required: true, width: 'w-28', placeholder: '45000', prefix: '$' },
        { key: 'current_price', label: 'Current', type: 'number', required: true, width: 'w-28', placeholder: '50000', prefix: '$' },
        { key: 'purchase_date', label: 'Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    metal: {
      name: 'Precious Metals',
      icon: Gem,
      color: '#EAB308',
      bgColor: 'bg-yellow-500',
      lightBg: 'bg-yellow-50',
      darkBg: 'bg-yellow-950/20',
      borderColor: 'border-yellow-500',
      description: 'Gold, Silver, Platinum, Palladium',
      fields: [
        { 
          key: 'metal_type', 
          label: 'Metal', 
          type: 'select', 
          required: true, 
          width: 'w-28',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Gold', label: 'Gold' },
            { value: 'Silver', label: 'Silver' },
            { value: 'Platinum', label: 'Platinum' },
            { value: 'Palladium', label: 'Palladium' }
          ]
        },
        { key: 'quantity', label: 'Qty', type: 'number', required: true, width: 'w-20', placeholder: '10' },
        { 
          key: 'unit', 
          label: 'Unit', 
          type: 'select', 
          width: 'w-20',
          options: [
            { value: 'oz', label: 'oz' },
            { value: 'g', label: 'g' },
            { value: 'kg', label: 'kg' }
          ]
        },
        { key: 'purchase_price', label: 'Price/Unit', type: 'number', required: true, width: 'w-28', placeholder: '1800', prefix: '$' },
        { key: 'current_price_per_unit', label: 'Current', type: 'number', width: 'w-28', placeholder: '1900', prefix: '$' },
        { key: 'purchase_date', label: 'Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    realestate: {
      name: 'Real Estate',
      icon: Home,
      color: '#10B981',
      bgColor: 'bg-green-500',
      lightBg: 'bg-green-50',
      darkBg: 'bg-green-950/20',
      borderColor: 'border-green-500',
      description: 'Properties and REITs',
      fields: [
        { key: 'property_name', label: 'Property Name', type: 'text', required: true, width: 'w-48', placeholder: 'Main Residence' },
        { 
          key: 'property_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-32',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Residential', label: 'Residential' },
            { value: 'Commercial', label: 'Commercial' },
            { value: 'Land', label: 'Land' },
            { value: 'Industrial', label: 'Industrial' }
          ]
        },
        { key: 'address', label: 'Address', type: 'text', width: 'w-56', placeholder: '123 Main St' },
        { key: 'purchase_price', label: 'Purchase', type: 'number', required: true, width: 'w-32', placeholder: '500000', prefix: '$' },
        { key: 'estimated_value', label: 'Est. Value', type: 'number', width: 'w-32', placeholder: '550000', prefix: '$' },
        { key: 'purchase_date', label: 'Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    cash: {
      name: 'Cash & Equivalents',
      icon: DollarSign,
      color: '#8B5CF6',
      bgColor: 'bg-purple-500',
      lightBg: 'bg-purple-50',
      darkBg: 'bg-purple-950/20',
      borderColor: 'border-purple-500',
      description: 'Savings, Money Market, CDs',
      fields: [
        { 
          key: 'currency', 
          label: 'Currency', 
          type: 'select', 
          required: true,
          width: 'w-24',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
            { value: 'GBP', label: 'GBP' },
            { value: 'JPY', label: 'JPY' },
            { value: 'CAD', label: 'CAD' }
          ]
        },
        { key: 'amount', label: 'Amount', type: 'number', required: true, width: 'w-32', placeholder: '10000', prefix: '$' },
        { 
          key: 'account_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-32',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Savings', label: 'Savings' },
            { value: 'Checking', label: 'Checking' },
            { value: 'Money Market', label: 'Money Market' },
            { value: 'CD', label: 'CD' }
          ]
        },
        { key: 'interest_rate', label: 'Rate %', type: 'number', width: 'w-24', placeholder: '2.5', suffix: '%', step: '0.01' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    }
  };

  // Initialize with empty rows for each type
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      // Initialize each asset type with one empty row
      const initialPositions = {};
      Object.keys(assetTypes).forEach(type => {
        initialPositions[type] = [{
          id: Date.now() + Math.random(),
          type,
          data: {},
          errors: {},
          isNew: true
        }];
      });
      setPositions(initialPositions);
    }
  }, [isOpen]);

  // Load accounts
  const loadAccounts = async () => {
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load accounts' });
    }
  };

  // Add new row to specific asset type
  const addNewRow = (assetType) => {
    const newPosition = {
      id: Date.now() + Math.random(),
      type: assetType,
      data: {},
      errors: {},
      isNew: true
    };
    setPositions(prev => ({
      ...prev,
      [assetType]: [...prev[assetType], newPosition]
    }));
  };

  // Update position data
  const updatePosition = (assetType, positionId, field, value) => {
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos => {
        if (pos.id === positionId) {
          const fieldConfig = assetTypes[assetType].fields.find(f => f.key === field);
          if (fieldConfig?.transform === 'uppercase') {
            value = value.toUpperCase();
          }
          return {
            ...pos,
            data: { ...pos.data, [field]: value },
            errors: { ...pos.errors, [field]: null },
            isNew: false
          };
        }
        return pos;
      })
    }));
  };

  // Delete position
  const deletePosition = (assetType, positionId) => {
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].filter(pos => pos.id !== positionId)
    }));
  };

  // Duplicate position
  const duplicatePosition = (assetType, position) => {
    const newPosition = {
      ...position,
      id: Date.now() + Math.random(),
      data: { ...position.data },
      isNew: true
    };
    const index = positions[assetType].findIndex(p => p.id === position.id);
    setPositions(prev => ({
      ...prev,
      [assetType]: [
        ...prev[assetType].slice(0, index + 1),
        newPosition,
        ...prev[assetType].slice(index + 1)
      ]
    }));
  };

  // Toggle section collapse
  const toggleSection = (assetType) => {
    setCollapsedSections(prev => ({
      ...prev,
      [assetType]: !prev[assetType]
    }));
  };

  // Calculate statistics
  const stats = useMemo(() => {
    let totalPositions = 0;
    let totalValue = 0;
    const byType = {};
    const byAccount = {};

    Object.entries(positions).forEach(([type, typePositions]) => {
      byType[type] = 0;
      typePositions.forEach(pos => {
        if (pos.data.account_id) {
          totalPositions++;
          byType[type]++;
          
          const accountId = pos.data.account_id;
          if (!byAccount[accountId]) byAccount[accountId] = 0;
          byAccount[accountId]++;
          
          // Calculate value
          let value = 0;
          switch (type) {
            case 'security':
              value = (pos.data.shares || 0) * (pos.data.price || 0);
              break;
            case 'crypto':
              value = (pos.data.quantity || 0) * (pos.data.current_price || 0);
              break;
            case 'metal':
              value = (pos.data.quantity || 0) * (pos.data.current_price_per_unit || pos.data.purchase_price || 0);
              break;
            case 'realestate':
              value = pos.data.estimated_value || pos.data.purchase_price || 0;
              break;
            case 'cash':
              value = pos.data.amount || 0;
              break;
          }
          totalValue += value;
        }
      });
    });

    return { totalPositions, totalValue, byType, byAccount };
  }, [positions]);

  // Validate all positions
  const validatePositions = () => {
    let isValid = true;
    const updatedPositions = { ...positions };

    Object.entries(positions).forEach(([type, typePositions]) => {
      const typeConfig = assetTypes[type];
      updatedPositions[type] = typePositions.map(pos => {
        const errors = {};
        typeConfig.fields.forEach(field => {
          if (field.required && !pos.data[field.key]) {
            errors[field.key] = `${field.label} is required`;
            isValid = false;
          }
        });
        return { ...pos, errors };
      });
    });

    setPositions(updatedPositions);
    return isValid;
  };

  // Submit all positions
  const submitAll = async () => {
    if (stats.totalPositions === 0) {
      setMessage({ type: 'error', text: 'No positions to submit' });
      return;
    }

    if (!validatePositions()) {
      setMessage({ type: 'error', text: 'Please fix validation errors' });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const [type, typePositions] of Object.entries(positions)) {
        for (const position of typePositions) {
          if (position.data.account_id) {
            try {
              switch (type) {
                case 'security':
                  await addSecurityPosition(position.data.account_id, position.data);
                  break;
                case 'crypto':
                  await addCryptoPosition(position.data.account_id, position.data);
                  break;
                case 'metal':
                  await addMetalPosition(position.data.account_id, position.data);
                  break;
                case 'realestate':
                  await addRealEstatePosition(position.data.account_id, position.data);
                  break;
                case 'cash':
                  await addCashPosition(position.data.account_id, position.data);
                  break;
              }
              successCount++;
            } catch (error) {
              console.error(`Error adding ${type} position:`, error);
              errorCount++;
            }
          }
        }
      }

      if (errorCount === 0) {
        setMessage({ type: 'success', text: `All ${successCount} positions added successfully!` });
        if (onPositionsSaved) {
          onPositionsSaved(successCount);
        }
        setTimeout(() => {
          onClose();
        }, 1500);
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

  // Render cell input
  const renderCellInput = (assetType, position, field, cellKey) => {
    const value = position.data[field.key] || '';
    const hasError = position.errors?.[field.key];
    
    const baseClass = `w-full h-8 px-2 text-sm border-0 outline-none bg-transparent ${
      isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
    } ${hasError ? 'text-red-500' : ''} focus:ring-2 focus:ring-blue-500/30 rounded`;

    const commonProps = {
      ref: el => cellRefs.current[cellKey] = el,
      className: baseClass,
      onFocus: () => setFocusedCell(cellKey)
    };

    switch (field.type) {
      case 'select':
        if (field.key === 'account_id') {
          return (
            <select
              {...commonProps}
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, parseInt(e.target.value))}
            >
              <option value="">Select...</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                </option>
              ))}
            </select>
          );
        } else {
          return (
            <select
              {...commonProps}
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
            >
              {field.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        }
        
      case 'number':
        return (
          <div className="relative w-full">
            {field.prefix && (
              <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {field.prefix}
              </span>
            )}
            <input
              {...commonProps}
              type="number"
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, parseFloat(e.target.value) || '')}
              placeholder={field.placeholder}
              step={field.step || 'any'}
              className={`${baseClass} ${field.prefix ? 'pl-6' : ''} ${field.suffix ? 'pr-6' : ''}`}
            />
            {field.suffix && (
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {field.suffix}
              </span>
            )}
          </div>
        );
        
      default:
        return (
          <input
            {...commonProps}
            type={field.type}
            value={value}
            onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // Render asset type section
  const renderAssetSection = (assetType) => {
    const config = assetTypes[assetType];
    const typePositions = positions[assetType] || [];
    const validPositions = typePositions.filter(p => p.data.account_id);
    const isCollapsed = collapsedSections[assetType];
    const Icon = config.icon;

    return (
      <div key={assetType} className="relative">
        {/* Section Header */}
        <div 
          className={`sticky top-0 z-20 ${isDark ? 'bg-gray-900' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <div 
            onClick={() => toggleSection(assetType)}
            className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50/5 transition-colors`}
          >
            <div className="flex items-center space-x-3">
              <div 
                className={`p-2 rounded-lg ${isDark ? config.darkBg : config.lightBg}`}
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center">
                  {config.name}
                  {validPositions.length > 0 && (
                    <span className={`ml-3 px-2.5 py-0.5 text-xs rounded-full font-medium ${
                      isDark ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {validPositions.length}
                    </span>
                  )}
                </h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {config.description}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${isCollapsed ? '-rotate-90' : ''} ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </div>
        </div>

        {/* Section Content */}
        {!isCollapsed && (
          <div className={`${isDark ? 'bg-gray-800/30' : 'bg-gray-50/50'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                    <th className="w-10 px-2 py-2">#</th>
                    {config.fields.map(field => (
                      <th key={field.key} className={`${field.width} px-2 py-2 text-left font-medium`}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                    <th className="w-20 px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typePositions.map((position, index) => {
                    const hasData = Object.values(position.data).some(v => v);
                    
                    return (
                      <tr 
                        key={position.id}
                        className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} ${
                          position.isNew ? 'bg-blue-500/5' : ''
                        } hover:bg-gray-500/5 transition-colors`}
                      >
                        <td className="px-2 py-1">
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {index + 1}
                          </span>
                        </td>
                        {config.fields.map(field => (
                          <td key={field.key} className={`${field.width} px-2 py-1`}>
                            {renderCellInput(
                              assetType, 
                              position, 
                              field, 
                              `${assetType}-${position.id}-${field.key}`
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-1">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => duplicatePosition(assetType, position)}
                              className={`p-1 rounded hover:bg-gray-500/10 transition-colors ${
                                isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                              }`}
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deletePosition(assetType, position.id)}
                              className="p-1 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Add Row Button */}
            <div className="p-3">
              <button
                onClick={() => addNewRow(assetType)}
                className={`w-full py-2.5 rounded-lg border-2 border-dashed ${
                  isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                } transition-colors flex items-center justify-center space-x-2 group`}
              >
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Add {config.name} Position</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Position Entry"
      maxWidth="max-w-7xl"
    >
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Header Section */}
        <div className="flex-shrink-0 space-y-4 pb-4">
          {/* Title with icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <ListPlus className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add Multiple Positions</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Build your portfolio across different asset classes
                </p>
              </div>
            </div>
            
            {/* Value Toggle */}
            <button
              onClick={() => setShowValues(!showValues)}
              className={`p-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors`}
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>

          {/* Stats Dashboard */}
          <div className={`grid grid-cols-4 gap-3 p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalPositions}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Positions
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {showValues ? formatCurrency(stats.totalValue) : '••••'}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Value
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {Object.keys(stats.byAccount).length}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Accounts Used
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {Object.values(stats.byType).filter(v => v > 0).length}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Asset Types
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} px-1`}>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Keyboard className="w-4 h-4" />
                <span>Tab to navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <MousePointer className="w-4 h-4" />
                <span>Click any field to edit</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Quick entry mode</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {Object.keys(assetTypes).map(assetType => renderAssetSection(assetType))}
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
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

        {/* Footer Actions */}
        <div className={`flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={() => {
              const initialPositions = {};
              Object.keys(assetTypes).forEach(type => {
                initialPositions[type] = [{
                  id: Date.now() + Math.random(),
                  type,
                  data: {},
                  errors: {},
                  isNew: true
                }];
              });
              setPositions(initialPositions);
              setMessage({ type: 'success', text: 'All positions cleared' });
            }}
            className={`px-4 py-2 rounded-lg ${
              isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            } transition-colors flex items-center space-x-2`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className={`px-6 py-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={submitAll}
              disabled={stats.totalPositions === 0 || isSubmitting}
              className={`px-6 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                stats.totalPositions === 0 || isSubmitting
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg transform hover:scale-[1.02]'
              } text-white`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Add {stats.totalPositions} Positions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </FixedModal>
  );
};

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default AddQuickPositionModal;