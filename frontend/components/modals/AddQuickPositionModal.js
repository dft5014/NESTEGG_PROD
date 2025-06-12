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
  ArrowUpDown, Info, MinusCircle, PlusCircle, BarChart2
} from 'lucide-react';

// Compact AnimatedNumber
const AnimatedNumber = ({ value, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 300;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Refs
  const cellRefs = useRef({});
  const tableRefs = useRef({});

  // Compact asset type configuration
  const assetTypes = {
    security: {
      name: 'Securities',
      icon: BarChart3,
      color: '#3B82F6',
      bg: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      fields: [
        { key: 'ticker', label: 'Ticker', type: 'text', required: true, width: 'w-24', placeholder: 'AAPL', transform: 'uppercase' },
        { key: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-20', placeholder: '100' },
        { key: 'price', label: 'Price', type: 'number', required: true, width: 'w-24', placeholder: '150.00', prefix: '$' },
        { key: 'cost_basis', label: 'Cost', type: 'number', width: 'w-24', placeholder: '140.00', prefix: '$' },
        { key: 'purchase_date', label: 'Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-40' }
      ]
    },
    crypto: {
      name: 'Crypto',
      icon: Coins,
      color: '#F97316',
      bg: 'bg-orange-500',
      lightBg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      fields: [
        { key: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-20', placeholder: 'BTC', transform: 'uppercase' },
        { key: 'quantity', label: 'Qty', type: 'number', required: true, width: 'w-24', placeholder: '0.5', step: '0.00000001' },
        { key: 'purchase_price', label: 'Buy Price', type: 'number', required: true, width: 'w-28', placeholder: '45000', prefix: '$' },
        { key: 'current_price', label: 'Current', type: 'number', required: true, width: 'w-28', placeholder: '50000', prefix: '$' },
        { key: 'purchase_date', label: 'Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-40' }
      ]
    },
    metal: {
      name: 'Metals',
      icon: Gem,
      color: '#EAB308',
      bg: 'bg-yellow-500',
      lightBg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      fields: [
        { 
          key: 'metal_type', 
          label: 'Metal', 
          type: 'select', 
          required: true, 
          width: 'w-24',
          options: [
            { value: '', label: 'Select' },
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
          width: 'w-16',
          options: [
            { value: 'oz', label: 'oz' },
            { value: 'g', label: 'g' },
            { value: 'kg', label: 'kg' }
          ]
        },
        { key: 'purchase_price', label: 'Price/Unit', type: 'number', required: true, width: 'w-24', placeholder: '1800', prefix: '$' },
        { key: 'current_price_per_unit', label: 'Current', type: 'number', width: 'w-24', placeholder: '1900', prefix: '$' },
        { key: 'purchase_date', label: 'Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-40' }
      ]
    },
    realestate: {
      name: 'Real Estate',
      icon: Home,
      color: '#10B981',
      bg: 'bg-green-500',
      lightBg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      fields: [
        { key: 'property_name', label: 'Property', type: 'text', required: true, width: 'w-44', placeholder: 'Main Residence' },
        { 
          key: 'property_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-28',
          options: [
            { value: '', label: 'Select' },
            { value: 'Residential', label: 'Residential' },
            { value: 'Commercial', label: 'Commercial' },
            { value: 'Land', label: 'Land' },
            { value: 'Industrial', label: 'Industrial' }
          ]
        },
        { key: 'address', label: 'Address', type: 'text', width: 'w-48', placeholder: '123 Main St' },
        { key: 'purchase_price', label: 'Purchase', type: 'number', required: true, width: 'w-28', placeholder: '500000', prefix: '$' },
        { key: 'estimated_value', label: 'Value', type: 'number', width: 'w-28', placeholder: '550000', prefix: '$' },
        { key: 'purchase_date', label: 'Date', type: 'date', width: 'w-32' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-40' }
      ]
    },
    cash: {
      name: 'Cash',
      icon: DollarSign,
      color: '#8B5CF6',
      bg: 'bg-purple-500',
      lightBg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      fields: [
        { 
          key: 'currency', 
          label: 'Currency', 
          type: 'select', 
          required: true,
          width: 'w-20',
          options: [
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
            { value: 'GBP', label: 'GBP' },
            { value: 'JPY', label: 'JPY' },
            { value: 'CAD', label: 'CAD' }
          ]
        },
        { key: 'amount', label: 'Amount', type: 'number', required: true, width: 'w-28', placeholder: '10000', prefix: '$' },
        { 
          key: 'account_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-28',
          options: [
            { value: '', label: 'Select' },
            { value: 'Savings', label: 'Savings' },
            { value: 'Checking', label: 'Checking' },
            { value: 'Money Market', label: 'Money Market' },
            { value: 'CD', label: 'CD' }
          ]
        },
        { key: 'interest_rate', label: 'Rate %', type: 'number', width: 'w-20', placeholder: '2.5', suffix: '%', step: '0.01' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-40' }
      ]
    }
  };

  // Initialize with empty rows
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
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

  // Add new row with smooth animation
  const addNewRow = (assetType) => {
    const newPosition = {
      id: Date.now() + Math.random(),
      type: assetType,
      data: {},
      errors: {},
      isNew: true,
      animateIn: true
    };
    setPositions(prev => ({
      ...prev,
      [assetType]: [...prev[assetType], newPosition]
    }));
    
    setTimeout(() => {
      const firstFieldKey = assetTypes[assetType].fields[0].key;
      const cellKey = `${assetType}-${newPosition.id}-${firstFieldKey}`;
      cellRefs.current[cellKey]?.focus();
    }, 50);
  };

  // Enhanced keyboard navigation
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
        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd + Enter submits all
          submitAll();
        } else if (fieldIndex === fields.length - 1) {
          addNewRow(assetType);
        } else {
          const nextKey = `${assetType}-${positionId}-${fields[fieldIndex + 1].key}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (positionIndex < typePositions.length - 1) {
          const nextPositionId = typePositions[positionIndex + 1].id;
          const nextKey = `${assetType}-${nextPositionId}-${fields[fieldIndex].key}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (positionIndex > 0) {
          const prevPositionId = typePositions[positionIndex - 1].id;
          const prevKey = `${assetType}-${prevPositionId}-${fields[fieldIndex].key}`;
          cellRefs.current[prevKey]?.focus();
        }
        break;
    }
  };

  // Update position with validation
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
            isNew: false,
            animateIn: false
          };
        }
        return pos;
      })
    }));
  };

  // Delete with animation
  const deletePosition = (assetType, positionId) => {
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos => 
        pos.id === positionId ? { ...pos, animateOut: true } : pos
      )
    }));
    
    setTimeout(() => {
      setPositions(prev => ({
        ...prev,
        [assetType]: prev[assetType].filter(pos => pos.id !== positionId)
      }));
    }, 200);
  };

  // Smart duplicate
  const duplicatePosition = (assetType, position) => {
    const newPosition = {
      ...position,
      id: Date.now() + Math.random(),
      data: { ...position.data },
      isNew: true,
      animateIn: true
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

  // Toggle section with animation
  const toggleSection = (assetType) => {
    setCollapsedSections(prev => ({
      ...prev,
      [assetType]: !prev[assetType]
    }));
  };

  // Calculate statistics with memoization
  const stats = useMemo(() => {
    let totalPositions = 0;
    let totalValue = 0;
    const byType = {};
    const byAccount = {};
    const errors = [];

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
        
        // Track errors
        if (pos.errors && Object.keys(pos.errors).length > 0) {
          errors.push({ type, id: pos.id });
        }
      });
    });

    return { totalPositions, totalValue, byType, byAccount, errors };
  }, [positions]);

  // Validate positions
  const validatePositions = () => {
    let isValid = true;
    const updatedPositions = { ...positions };

    Object.entries(positions).forEach(([type, typePositions]) => {
      const typeConfig = assetTypes[type];
      updatedPositions[type] = typePositions.map(pos => {
        const errors = {};
        typeConfig.fields.forEach(field => {
          if (field.required && !pos.data[field.key]) {
            errors[field.key] = `Required`;
            isValid = false;
          }
        });
        return { ...pos, errors };
      });
    });

    setPositions(updatedPositions);
    return isValid;
  };

  // Submit with progress
  const submitAll = async () => {
    if (stats.totalPositions === 0) {
      setMessage({ type: 'error', text: 'No positions to submit' });
      return;
    }

    if (!validatePositions()) {
      setMessage({ type: 'error', text: `Fix ${stats.errors.length} validation errors` });
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
        setMessage({ type: 'success', text: `All ${successCount} positions added!` });
        if (onPositionsSaved) {
          onPositionsSaved(successCount);
        }
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setMessage({ 
          type: 'warning', 
          text: `${successCount} added, ${errorCount} failed` 
        });
      }
    } catch (error) {
      console.error('Error submitting positions:', error);
      setMessage({ type: 'error', text: 'Error submitting positions' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render optimized cell input
  const renderCellInput = (assetType, position, field, cellKey) => {
    const value = position.data[field.key] || '';
    const hasError = position.errors?.[field.key];
    const fieldIndex = assetTypes[assetType].fields.findIndex(f => f.key === field.key);
    
    const baseClass = `w-full px-2 py-1.5 text-sm border rounded transition-all ${
      hasError 
        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20' 
        : 'border-gray-200 bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
    }`;

    const commonProps = {
      ref: el => cellRefs.current[cellKey] = el,
      className: baseClass,
      onFocus: () => setFocusedCell(cellKey),
      onKeyDown: (e) => handleKeyDown(e, assetType, position.id, fieldIndex),
      'data-position-id': position.id,
      'data-field': field.key
    };

    switch (field.type) {
      case 'select':
        if (field.key === 'account_id') {
          return (
            <select
              {...commonProps}
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, parseInt(e.target.value))}
              className={`${baseClass} cursor-pointer`}
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
              className={`${baseClass} cursor-pointer`}
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
          <div className="relative w-full group">
            {field.prefix && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 group-focus-within:text-blue-600 transition-colors">
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
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 group-focus-within:text-blue-600 transition-colors">
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

  // Render optimized asset section
  const renderAssetSection = (assetType) => {
    const config = assetTypes[assetType];
    const typePositions = positions[assetType] || [];
    const validPositions = typePositions.filter(p => p.data.account_id);
    const isCollapsed = collapsedSections[assetType];
    const Icon = config.icon;

    return (
      <div key={assetType} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Compact Section Header */}
        <div 
          onClick={() => toggleSection(assetType)}
          className={`px-3 py-2 ${config.lightBg} hover:brightness-105 cursor-pointer transition-all duration-200 border-b ${config.border}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`p-1 rounded ${config.bg}`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className={`font-medium text-sm ${config.text} flex items-center`}>
                {config.name}
                {validPositions.length > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 text-xs ${config.bg} text-white rounded-full`}>
                    {validPositions.length}
                  </span>
                )}
              </h3>
            </div>
            <ChevronDown className={`w-4 h-4 ${config.text} transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`} />
          </div>
        </div>

        {/* Compact Table Content */}
        {!isCollapsed && (
          <div className="bg-white">
            <div className="overflow-x-auto" ref={el => tableRefs.current[assetType] = el}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-8 px-2 py-1.5 text-left text-gray-600 font-medium">#</th>
                    {config.fields.map(field => (
                      <th key={field.key} className={`${field.width} px-2 py-1.5 text-left text-gray-600 font-medium`}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </th>
                    ))}
                    <th className="w-16 px-2 py-1.5 text-center text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typePositions.map((position, index) => (
                    <tr 
                      key={position.id}
                      className={`
                        border-b border-gray-100 hover:bg-gray-50 transition-all duration-200
                        ${position.isNew ? 'bg-blue-50/30' : ''}
                        ${position.animateIn ? 'animate-slideIn' : ''}
                        ${position.animateOut ? 'animate-slideOut' : ''}
                      `}
                    >
                      <td className="px-2 py-1">
                        <span className="text-gray-400">{index + 1}</span>
                      </td>
                      {config.fields.map(field => (
                        <td key={field.key} className={`${field.width} px-1 py-1`}>
                          {renderCellInput(
                            assetType, 
                            position, 
                            field, 
                            `${assetType}-${position.id}-${field.key}`
                          )}
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <div className="flex items-center justify-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => duplicatePosition(assetType, position)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deletePosition(assetType, position.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Compact Add Row Button */}
            <div className="p-2 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => addNewRow(assetType)}
                className={`w-full py-1.5 px-3 bg-white border border-dashed ${config.border} rounded hover:${config.lightBg} transition-all duration-200 flex items-center justify-center space-x-1 group text-xs`}
              >
                <Plus className={`w-3 h-3 ${config.text} group-hover:scale-110 transition-transform`} />
                <span className={`${config.text} font-medium`}>Add {config.name}</span>
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
      size="max-w-[1400px]"
    >
      <div className="h-[85vh] flex flex-col">
        {/* Ultra Compact Header */}
        <div className="flex-shrink-0 pb-3">
          {/* Inline Stats Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ListPlus className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Quick Entry</span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    <AnimatedNumber value={stats.totalPositions} />
                  </span>
                  <span className="text-gray-500">positions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {showValues ? <AnimatedNumber value={stats.totalValue} prefix="$" /> : '••••'}
                  </span>
                </div>
                {stats.errors.length > 0 && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">{stats.errors.length} errors</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowValues(!showValues)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                title={showValues ? 'Hide values' : 'Show values'}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <div className="flex items-center px-2 py-1 bg-amber-50 rounded text-xs">
                <Keyboard className="w-3 h-3 text-amber-600 mr-1" />
                <span className="text-amber-700 font-medium">Tab/Enter</span>
              </div>
              <div className="flex items-center px-2 py-1 bg-blue-50 rounded text-xs">
                <Zap className="w-3 h-3 text-blue-600 mr-1" />
                <span className="text-blue-700 font-medium">Ctrl+Enter to save</span>
              </div>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded transition-all ${
                activeFilter === 'all' 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Types
            </button>
            {Object.entries(assetTypes).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1 rounded transition-all flex items-center space-x-1 ${
                    activeFilter === key 
                      ? `${config.bg} text-white` 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{config.name}</span>
                  {stats.byType[key] > 0 && (
                    <span className={`ml-1 px-1 rounded text-[10px] ${
                      activeFilter === key ? 'bg-white/20' : 'bg-gray-200'
                    }`}>
                      {stats.byType[key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Maximized Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {Object.keys(assetTypes)
            .filter(type => activeFilter === 'all' || activeFilter === type)
            .map(assetType => renderAssetSection(assetType))}
        </div>

        {/* Compact Message */}
        {message.text && (
          <div className={`mt-2 px-3 py-2 rounded-lg flex items-center space-x-2 text-sm animate-slideIn ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
             message.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
             <CheckCircle className="w-4 h-4" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Ultra Compact Footer */}
        <div className="flex-shrink-0 flex justify-between items-center pt-3 mt-3 border-t border-gray-200">
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
              setMessage({ type: 'success', text: 'Cleared all positions' });
            }}
            className="px-4 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={submitAll}
              disabled={stats.totalPositions === 0 || isSubmitting}
              className={`px-6 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                stats.totalPositions === 0 || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transform hover:scale-[1.02] shadow-sm'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Add {stats.totalPositions} Positions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(10px);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.2s ease-out;
        }
        
        .animate-slideOut {
          animation: slideOut 0.2s ease-out;
        }
      `}</style>
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

export { AddQuickPositionModal };
export default AddQuickPositionModal;