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
  ChevronUp, Edit3, CheckSquare, Square, ListPlus, Loader2,
  ArrowUpDown, Info
} from 'lucide-react';

// AnimatedNumber component from QuickStart
const AnimatedNumber = ({ value, duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span>{displayValue}</span>;
};

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved }) => {
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
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Refs
  const cellRefs = useRef({});
  const newRowRefs = useRef({});

  // Asset type configuration - matching QuickStart's style
  const assetTypes = {
    security: {
      name: 'Securities',
      icon: BarChart3,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      lightGradient: 'from-blue-50 to-blue-100',
      description: 'Stocks, ETFs, Mutual Funds',
      fields: [
        { key: 'ticker', label: 'Ticker', type: 'text', required: true, width: 'w-32', placeholder: 'AAPL', transform: 'uppercase' },
        { key: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-28', placeholder: '100' },
        { key: 'price', label: 'Price', type: 'number', required: true, width: 'w-28', placeholder: '150.00', prefix: '$' },
        { key: 'cost_basis', label: 'Cost Basis', type: 'number', width: 'w-32', placeholder: '140.00', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-52' }
      ]
    },
    crypto: {
      name: 'Cryptocurrency',
      icon: Coins,
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600',
      lightGradient: 'from-orange-50 to-orange-100',
      description: 'Bitcoin, Ethereum, and other digital assets',
      fields: [
        { key: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-28', placeholder: 'BTC', transform: 'uppercase' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-32', placeholder: '0.5', step: '0.00000001' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32', placeholder: '45000', prefix: '$' },
        { key: 'current_price', label: 'Current Price', type: 'number', required: true, width: 'w-32', placeholder: '50000', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-52' }
      ]
    },
    metal: {
      name: 'Precious Metals',
      icon: Gem,
      color: 'yellow',
      gradient: 'from-yellow-500 to-amber-600',
      lightGradient: 'from-yellow-50 to-amber-100',
      description: 'Gold, Silver, Platinum, Palladium',
      fields: [
        { 
          key: 'metal_type', 
          label: 'Metal', 
          type: 'select', 
          required: true, 
          width: 'w-32',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Gold', label: 'Gold' },
            { value: 'Silver', label: 'Silver' },
            { value: 'Platinum', label: 'Platinum' },
            { value: 'Palladium', label: 'Palladium' }
          ]
        },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-24', placeholder: '10' },
        { 
          key: 'unit', 
          label: 'Unit', 
          type: 'select', 
          width: 'w-24',
          options: [
            { value: 'oz', label: 'oz' },
            { value: 'g', label: 'g' },
            { value: 'kg', label: 'kg' }
          ]
        },
        { key: 'purchase_price', label: 'Price/Unit', type: 'number', required: true, width: 'w-32', placeholder: '1800', prefix: '$' },
        { key: 'current_price_per_unit', label: 'Current/Unit', type: 'number', width: 'w-32', placeholder: '1900', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-52' }
      ]
    },
    realestate: {
      name: 'Real Estate',
      icon: Home,
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
      lightGradient: 'from-green-50 to-emerald-100',
      description: 'Properties and REITs',
      fields: [
        { key: 'property_name', label: 'Property Name', type: 'text', required: true, width: 'w-52', placeholder: 'Main Residence' },
        { 
          key: 'property_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-36',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Residential', label: 'Residential' },
            { value: 'Commercial', label: 'Commercial' },
            { value: 'Land', label: 'Land' },
            { value: 'Industrial', label: 'Industrial' }
          ]
        },
        { key: 'address', label: 'Address', type: 'text', width: 'w-64', placeholder: '123 Main St, City, ST' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-36', placeholder: '500000', prefix: '$' },
        { key: 'estimated_value', label: 'Est. Value', type: 'number', width: 'w-36', placeholder: '550000', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-52' }
      ]
    },
    cash: {
      name: 'Cash & Equivalents',
      icon: DollarSign,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      lightGradient: 'from-purple-50 to-purple-100',
      description: 'Savings, Money Market, CDs',
      fields: [
        { 
          key: 'currency', 
          label: 'Currency', 
          type: 'select', 
          required: true,
          width: 'w-28',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
            { value: 'GBP', label: 'GBP' },
            { value: 'JPY', label: 'JPY' },
            { value: 'CAD', label: 'CAD' }
          ]
        },
        { key: 'amount', label: 'Amount', type: 'number', required: true, width: 'w-36', placeholder: '10000', prefix: '$' },
        { 
          key: 'account_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-36',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Savings', label: 'Savings' },
            { value: 'Checking', label: 'Checking' },
            { value: 'Money Market', label: 'Money Market' },
            { value: 'CD', label: 'CD' }
          ]
        },
        { key: 'interest_rate', label: 'Interest Rate', type: 'number', width: 'w-28', placeholder: '2.5', suffix: '%', step: '0.01' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-52' }
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
    
    // Focus first cell of new row after render
    setTimeout(() => {
      const firstFieldKey = assetTypes[assetType].fields[0].key;
      const cellKey = `${assetType}-${newPosition.id}-${firstFieldKey}`;
      cellRefs.current[cellKey]?.focus();
    }, 50);
  };

  // Keyboard navigation
  const handleKeyDown = (e, assetType, positionId, fieldIndex) => {
    const typePositions = positions[assetType];
    const positionIndex = typePositions.findIndex(p => p.id === positionId);
    const fields = assetTypes[assetType].fields;
    
    switch (e.key) {
      case 'Tab':
        if (!e.shiftKey && fieldIndex === fields.length - 1 && positionIndex === typePositions.length - 1) {
          e.preventDefault();
          addNewRow(assetType);
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (fieldIndex === fields.length - 1) {
          addNewRow(assetType);
        } else {
          const nextKey = `${assetType}-${positionId}-${fields[fieldIndex + 1].key}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
    }
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
    const fieldIndex = assetTypes[assetType].fields.findIndex(f => f.key === field.key);
    
    const baseClass = `w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 ${
      hasError ? 'border-red-300 bg-red-50' : ''
    }`;

    const commonProps = {
      ref: el => cellRefs.current[cellKey] = el,
      className: baseClass,
      onFocus: () => setFocusedCell(cellKey),
      onKeyDown: (e) => handleKeyDown(e, assetType, position.id, fieldIndex)
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
              <option value="">Select account...</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name} - {account.institution}
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
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
              className={`${baseClass} ${field.prefix ? 'pl-7' : ''} ${field.suffix ? 'pr-8' : ''}`}
            />
            {field.suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
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
      <div key={assetType} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Section Header */}
        <div 
          onClick={() => toggleSection(assetType)}
          className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 cursor-pointer transition-all duration-200 border-b border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${config.lightGradient}`}>
                <Icon className={`w-5 h-5 text-${config.color}-600`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg flex items-center">
                  {config.name}
                  {validPositions.length > 0 && (
                    <span className="ml-3 px-2.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full font-medium">
                      {validPositions.length}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-600">{config.description}</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`} />
          </div>
        </div>

        {/* Section Content */}
        {!isCollapsed && (
          <div className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-16 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    {config.fields.map(field => (
                      <th key={field.key} className={`${field.width} px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                    <th className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {typePositions.map((position, index) => (
                    <tr 
                      key={position.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        position.isNew ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{index + 1}</span>
                      </td>
                      {config.fields.map(field => (
                        <td key={field.key} className={`${field.width} px-3 py-3`}>
                          {renderCellInput(
                            assetType, 
                            position, 
                            field, 
                            `${assetType}-${position.id}-${field.key}`
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => duplicatePosition(assetType, position)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all transform hover:scale-110"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePosition(assetType, position.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all transform hover:scale-110"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Add Row Button */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => addNewRow(assetType)}
                className="w-full py-2.5 px-4 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2 group"
              >
                <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform group-hover:scale-110" />
                <span className="text-sm text-gray-600 font-medium">Add {config.name} Position</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // The main modal content
  const modalContent = (
    <div className="min-h-[600px] max-h-[calc(100vh-200px)] flex flex-col">
        {/* Header Section */}
        <div className="flex-shrink-0 space-y-6 mb-6">
        {/* Title with icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg shadow-blue-500/25">
            <ListPlus className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Quick Position Entry</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Add multiple positions across different asset classes. Build your complete portfolio in one place.
          </p>
        </div>

        {/* Stats Dashboard - QuickStart style */}
        <div className="relative bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-pink-50/50 rounded-xl p-4 shadow-sm border border-white/80 backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm mb-2">
                <p className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent">
                  <AnimatedNumber value={stats.totalPositions} />
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600">Total Positions</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm mb-2">
                <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {showValues ? formatCurrency(stats.totalValue) : '••••'}
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600">Total Value</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm mb-2">
                <p className="text-2xl font-black bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  <AnimatedNumber value={Object.keys(stats.byAccount).length} />
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600">Accounts Used</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-sm mb-2">
                <p className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  <AnimatedNumber value={Object.values(stats.byType).filter(v => v > 0).length} />
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600">Asset Types</p>
            </div>
          </div>
        </div>

        {/* Action buttons and instructions */}
        <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl border border-gray-100">
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <Keyboard className="w-4 h-4 text-gray-400" />
              <span>Tab/Enter to navigate</span>
            </div>
            <div className="flex items-center space-x-1">
              <MousePointer className="w-4 h-4 text-gray-400" />
              <span>Click any field to edit</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowValues(!showValues)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye className="w-4 h-4 text-gray-600" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
            </button>
            <div className="flex items-center bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <Zap className="w-4 h-4 text-amber-600 mr-1.5" />
              <span className="text-xs font-medium text-amber-700">Quick Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        {Object.keys(assetTypes).map(assetType => renderAssetSection(assetType))}
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`mt-4 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600" /> :
           message.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
           <CheckCircle className="w-5 h-5 text-green-600" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex-shrink-0 flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
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
          className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear All</span>
        </button>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={submitAll}
            disabled={stats.totalPositions === 0 || isSubmitting}
            className={`px-6 py-2.5 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
              stats.totalPositions === 0 || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transform hover:scale-[1.02] hover:shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Add {stats.totalPositions} Positions</span>
              </>
            )}
          </button>
      </div>
    </div>
  );

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Position Entry"
      size="max-w-[1400px]"
    >
      {modalContent}
    </FixedModal>
  );
};

// Utility functions
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export { AddQuickPositionModal };
export default AddQuickPositionModal;