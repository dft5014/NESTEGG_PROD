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
  Keyboard, MousePointer, MoreVertical, ChevronRight
} from 'lucide-react';

export const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, theme = 'dark' }) => {
  // Core state
  const [inputMode, setInputMode] = useState('byType'); // 'byType' or 'byAccount'
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [activeAssetType, setActiveAssetType] = useState('security');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [focusedCell, setFocusedCell] = useState({ row: -1, col: -1 });
  const [copiedRow, setCopiedRow] = useState(null);
  
  // Search states
  const [searchCache, setSearchCache] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  
  // Messages and validation
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});
  
  // Refs for focus management
  const tableRef = useRef(null);
  const cellRefs = useRef({});
  
  // Theme
  const isDark = theme === 'dark';

  // Asset type configuration with enhanced styling
  const assetTypes = {
    security: {
      name: 'Securities',
      icon: BarChart3,
      color: 'blue',
      bgGradient: 'from-blue-500/10 to-blue-600/10',
      borderGradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-500/20 to-blue-600/20',
      fields: [
        { key: 'ticker', label: 'Ticker', type: 'text', required: true, width: 'w-24', placeholder: 'AAPL', transform: 'uppercase' },
        { key: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-24', placeholder: '100' },
        { key: 'price', label: 'Price', type: 'number', required: true, width: 'w-28', placeholder: '150.00', prefix: '$' },
        { key: 'cost_basis', label: 'Cost Basis', type: 'number', width: 'w-28', placeholder: '140.00', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    crypto: {
      name: 'Cryptocurrency',
      icon: Coins,
      color: 'orange',
      bgGradient: 'from-orange-500/10 to-orange-600/10',
      borderGradient: 'from-orange-500 to-orange-600',
      hoverGradient: 'from-orange-500/20 to-orange-600/20',
      fields: [
        { key: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24', placeholder: 'BTC', transform: 'uppercase' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28', placeholder: '0.5', step: '0.00000001' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32', placeholder: '45000', prefix: '$' },
        { key: 'current_price', label: 'Current Price', type: 'number', required: true, width: 'w-32', placeholder: '50000', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    metal: {
      name: 'Precious Metals',
      icon: Building2,
      color: 'yellow',
      bgGradient: 'from-yellow-500/10 to-amber-600/10',
      borderGradient: 'from-yellow-500 to-amber-600',
      hoverGradient: 'from-yellow-500/20 to-amber-600/20',
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
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-24', placeholder: '10' },
        { 
          key: 'unit', 
          label: 'Unit', 
          type: 'select', 
          width: 'w-24',
          options: [
            { value: 'oz', label: 'Oz' },
            { value: 'g', label: 'Grams' },
            { value: 'kg', label: 'Kg' }
          ]
        },
        { key: 'purchase_price', label: 'Price/Unit', type: 'number', required: true, width: 'w-28', placeholder: '1800', prefix: '$' },
        { key: 'current_price_per_unit', label: 'Current/Unit', type: 'number', width: 'w-28', placeholder: '1900', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    realestate: {
      name: 'Real Estate',
      icon: Home,
      color: 'green',
      bgGradient: 'from-green-500/10 to-emerald-600/10',
      borderGradient: 'from-green-500 to-emerald-600',
      hoverGradient: 'from-green-500/20 to-emerald-600/20',
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
        { key: 'address', label: 'Address', type: 'text', width: 'w-64', placeholder: '123 Main St, City, ST' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32', placeholder: '500000', prefix: '$' },
        { key: 'estimated_value', label: 'Est. Value', type: 'number', width: 'w-32', placeholder: '550000', prefix: '$' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    },
    cash: {
      name: 'Cash & Equivalents',
      icon: DollarSign,
      color: 'purple',
      bgGradient: 'from-purple-500/10 to-purple-600/10',
      borderGradient: 'from-purple-500 to-purple-600',
      hoverGradient: 'from-purple-500/20 to-purple-600/20',
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
        { key: 'interest_rate', label: 'Interest %', type: 'number', width: 'w-24', placeholder: '2.5', suffix: '%', step: '0.01' },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' }
      ]
    }
  };

  // Initialize with empty row on mount
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      // Initialize with one empty row
      if (positions.length === 0) {
        addNewRow();
      }
    }
  }, [isOpen, activeAssetType]);

  // Load accounts
  const loadAccounts = async () => {
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
      if (fetchedAccounts.length > 0 && inputMode === 'byAccount' && !selectedAccount) {
        setSelectedAccount(fetchedAccounts[0]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load accounts' });
    }
  };

  // Add new row
  const addNewRow = () => {
    const newPosition = {
      id: Date.now() + Math.random(),
      type: activeAssetType,
      data: inputMode === 'byAccount' ? { account_id: selectedAccount?.id } : {},
      errors: {}
    };
    setPositions([...positions, newPosition]);
    // Focus first cell of new row
    setTimeout(() => {
      setFocusedCell({ row: positions.length, col: 0 });
    }, 50);
  };

  // Copy row
  const copyRow = (index) => {
    const sourcePosition = positions[index];
    const newPosition = {
      ...sourcePosition,
      id: Date.now() + Math.random(),
      data: { ...sourcePosition.data }
    };
    const newPositions = [...positions];
    newPositions.splice(index + 1, 0, newPosition);
    setPositions(newPositions);
    
    // Visual feedback
    setCopiedRow(index);
    setTimeout(() => setCopiedRow(null), 500);
    
    // Focus first cell of copied row
    setTimeout(() => {
      setFocusedCell({ row: index + 1, col: 0 });
    }, 50);
  };

  // Delete row
  const deleteRow = (index) => {
    const newPositions = positions.filter((_, i) => i !== index);
    setPositions(newPositions);
    
    // Clear errors for this row
    const newErrors = { ...errors };
    delete newErrors[positions[index].id];
    setErrors(newErrors);
  };

  // Update cell value
  const updateCell = (rowIndex, field, value) => {
    const newPositions = [...positions];
    const position = newPositions[rowIndex];
    
    // Apply transformations
    const fieldConfig = assetTypes[activeAssetType].fields.find(f => f.key === field);
    if (fieldConfig?.transform === 'uppercase') {
      value = value.toUpperCase();
    }
    
    // Update value
    position.data[field] = value;
    
    // Clear error for this field
    if (position.errors?.[field]) {
      delete position.errors[field];
    }
    
    setPositions(newPositions);
    
    // Auto-search for securities
    if (activeAssetType === 'security' && field === 'ticker' && value.length >= 2) {
      debouncedSearch(value, 'security');
    } else if (activeAssetType === 'crypto' && field === 'symbol' && value.length >= 2) {
      debouncedSearch(value, 'crypto');
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query, type) => {
      try {
        setIsSearching(true);
        let results;
        if (type === 'security') {
          results = await searchSecurities(query);
        } else if (type === 'crypto') {
          results = await searchFXAssets(query);
        }
        setSearchCache({ ...searchCache, [query]: results });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Validate positions
  const validatePositions = () => {
    const newErrors = {};
    let isValid = true;

    positions.forEach((position, index) => {
      const typeConfig = assetTypes[position.type];
      const positionErrors = {};

      typeConfig.fields.forEach(field => {
        if (field.required && !position.data[field.key]) {
          positionErrors[field.key] = `${field.label} is required`;
          isValid = false;
        }
      });

      if (Object.keys(positionErrors).length > 0) {
        newErrors[position.id] = positionErrors;
        positions[index].errors = positionErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Submit all positions
  const submitAll = async () => {
    if (positions.length === 0) {
      setMessage({ type: 'error', text: 'No positions to submit' });
      return;
    }

    if (!validatePositions()) {
      const errorCount = Object.keys(errors).length;
      setMessage({ type: 'error', text: `Please fix ${errorCount} invalid position(s)` });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Group positions by type
      const positionsByType = positions.reduce((acc, pos) => {
        if (!acc[pos.type]) acc[pos.type] = [];
        acc[pos.type].push(pos);
        return acc;
      }, {});

      // Submit each type
      for (const [type, typePositions] of Object.entries(positionsByType)) {
        for (const position of typePositions) {
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

  // Keyboard navigation
  const handleKeyDown = (e, rowIndex, colIndex) => {
    const fields = assetTypes[activeAssetType].fields;
    
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Move left
          if (colIndex > 0) {
            setFocusedCell({ row: rowIndex, col: colIndex - 1 });
          } else if (rowIndex > 0) {
            setFocusedCell({ row: rowIndex - 1, col: fields.length - 1 });
          }
        } else {
          // Move right
          if (colIndex < fields.length - 1) {
            setFocusedCell({ row: rowIndex, col: colIndex + 1 });
          } else if (rowIndex === positions.length - 1) {
            // Last cell of last row - add new row
            addNewRow();
          } else {
            setFocusedCell({ row: rowIndex + 1, col: 0 });
          }
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (rowIndex === positions.length - 1 && colIndex === fields.length - 1) {
          // Last cell - add new row
          addNewRow();
        } else {
          // Move down
          if (rowIndex < positions.length - 1) {
            setFocusedCell({ row: rowIndex + 1, col: colIndex });
          }
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedCell({ row: rowIndex - 1, col: colIndex });
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < positions.length - 1) {
          setFocusedCell({ row: rowIndex + 1, col: colIndex });
        }
        break;
        
      case 'ArrowLeft':
        if (e.target.selectionStart === 0 && colIndex > 0) {
          e.preventDefault();
          setFocusedCell({ row: rowIndex, col: colIndex - 1 });
        }
        break;
        
      case 'ArrowRight':
        if (e.target.selectionEnd === e.target.value.length && colIndex < fields.length - 1) {
          e.preventDefault();
          setFocusedCell({ row: rowIndex, col: colIndex + 1 });
        }
        break;
    }
  };

  // Focus management
  useEffect(() => {
    if (focusedCell.row >= 0 && focusedCell.col >= 0) {
      const cellKey = `${focusedCell.row}-${focusedCell.col}`;
      const element = cellRefs.current[cellKey];
      if (element) {
        element.focus();
        element.select?.();
      }
    }
  }, [focusedCell]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => {
      let value = 0;
      switch (pos.type) {
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
      return sum + value;
    }, 0);

    const byType = positions.reduce((acc, pos) => {
      acc[pos.type] = (acc[pos.type] || 0) + 1;
      return acc;
    }, {});

    return { totalPositions: positions.length, totalValue, byType };
  }, [positions]);

  // Render cell input
  const renderCellInput = (position, field, rowIndex, colIndex) => {
    const value = position.data[field.key] || '';
    const hasError = position.errors?.[field.key];
    const cellKey = `${rowIndex}-${colIndex}`;
    
    const baseClass = `w-full h-8 px-2 text-sm transition-all duration-200 border-0 outline-none ${
      isDark ? 'bg-transparent text-white' : 'bg-transparent text-gray-900'
    } ${hasError ? 'text-red-400' : ''} ${
      focusedCell.row === rowIndex && focusedCell.col === colIndex
        ? 'ring-2 ring-blue-500 ring-inset rounded'
        : ''
    }`;

    switch (field.type) {
      case 'select':
        if (field.key === 'account_id') {
          return (
            <select
              ref={el => cellRefs.current[cellKey] = el}
              value={value}
              onChange={(e) => updateCell(rowIndex, field.key, parseInt(e.target.value))}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
              onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
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
              ref={el => cellRefs.current[cellKey] = el}
              value={value}
              onChange={(e) => updateCell(rowIndex, field.key, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
              onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
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
          <div className="relative w-full">
            {field.prefix && (
              <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {field.prefix}
              </span>
            )}
            <input
              ref={el => cellRefs.current[cellKey] = el}
              type="number"
              value={value}
              onChange={(e) => updateCell(rowIndex, field.key, parseFloat(e.target.value) || '')}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
              onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
              placeholder={field.placeholder}
              step={field.step || 'any'}
              className={`${baseClass} ${field.prefix ? 'pl-6' : ''} ${field.suffix ? 'pr-6' : ''}`}
            />
            {field.suffix && (
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {field.suffix}
              </span>
            )}
          </div>
        );
        
      default:
        return (
          <input
            ref={el => cellRefs.current[cellKey] = el}
            type={field.type}
            value={value}
            onChange={(e) => updateCell(rowIndex, field.key, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
            onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
            placeholder={field.placeholder}
            className={baseClass}
          />
        );
    }
  };

  // Table view
  const renderTableView = () => {
    const fields = assetTypes[activeAssetType].fields;
    
    return (
      <div className="relative overflow-hidden rounded-lg">
        {/* Gradient border */}
        <div className={`absolute inset-0 bg-gradient-to-r ${assetTypes[activeAssetType].borderGradient} opacity-20 blur-xl`} />
        
        <div className={`relative ${isDark ? 'bg-gray-900/90' : 'bg-white'} backdrop-blur-sm rounded-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full" ref={tableRef}>
              <thead>
                <tr className={`${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className="sticky left-0 z-10 w-24 px-2 py-3 text-left">
                    <div className="flex items-center space-x-2">
                      <Grid3x3 className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-medium text-gray-500">#</span>
                    </div>
                  </th>
                  {fields.map((field, index) => (
                    <th key={field.key} className={`${field.width} px-2 py-3 text-left`}>
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {field.label}
                        </span>
                        {field.required && <span className="text-red-500">*</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.filter(p => p.type === activeAssetType).map((position, rowIndex) => (
                  <tr
                    key={position.id}
                    className={`
                      group border-b transition-all duration-200
                      ${isDark ? 'border-gray-800 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50/50'}
                      ${copiedRow === rowIndex ? 'animate-pulse bg-blue-500/10' : ''}
                      ${selectedRows.has(rowIndex) ? (isDark ? 'bg-gray-800/50' : 'bg-blue-50/50') : ''}
                    `}
                  >
                    <td className={`sticky left-0 z-10 w-24 px-2 py-1 ${isDark ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm`}>
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} w-6`}>
                          {rowIndex + 1}
                        </span>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => copyRow(rowIndex)}
                            className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                            title="Copy row"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteRow(rowIndex)}
                            className={`p-1 rounded ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-100'} text-red-500 transition-colors`}
                            title="Delete row"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    {fields.map((field, colIndex) => (
                      <td
                        key={field.key}
                        className={`${field.width} px-2 py-1 ${
                          position.errors?.[field.key] ? 'bg-red-500/10' : ''
                        }`}
                      >
                        {renderCellInput(position, field, rowIndex, colIndex)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Add row button */}
          <div className={`p-3 ${isDark ? 'bg-gray-800/30' : 'bg-gray-50/50'} border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={addNewRow}
              className={`w-full py-2 rounded-lg border-2 border-dashed ${
                isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-300 hover:border-gray-400'
              } transition-colors flex items-center justify-center space-x-2 group`}
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Add New Row</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // List view for "By Account" mode
  const renderListView = () => {
    const positionsByAccount = positions.reduce((acc, pos) => {
      const accountId = pos.data.account_id || 'unassigned';
      if (!acc[accountId]) acc[accountId] = [];
      acc[accountId].push(pos);
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        {Object.entries(positionsByAccount).map(([accountId, accountPositions]) => {
          const account = accounts.find(a => a.id === parseInt(accountId));
          const accountName = account ? `${account.account_name} - ${account.institution}` : 'Unassigned';
          
          return (
            <div key={accountId} className={`${isDark ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg overflow-hidden`}>
              <div className={`px-4 py-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center space-x-2">
                    <Briefcase className="w-4 h-4" />
                    <span>{accountName}</span>
                  </h3>
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {accountPositions.length} position{accountPositions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="p-2">
                {accountPositions.map((position, index) => {
                  const config = assetTypes[position.type];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={position.id}
                      className={`p-3 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors flex items-center justify-between group`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${config.bgGradient}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {position.type === 'security' && position.data.ticker}
                            {position.type === 'crypto' && position.data.symbol}
                            {position.type === 'metal' && `${position.data.metal_type} (${position.data.quantity} ${position.data.unit || 'oz'})`}
                            {position.type === 'realestate' && position.data.property_name}
                            {position.type === 'cash' && `${position.data.currency || 'USD'} ${showValues ? formatCurrency(position.data.amount || 0) : '••••'}`}
                          </div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {config.name}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            const newPositions = [...positions];
                            const sourceIndex = positions.findIndex(p => p.id === position.id);
                            copyRow(sourceIndex);
                          }}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setPositions(positions.filter(p => p.id !== position.id));
                          }}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-100'} text-red-500 transition-colors`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <span>Quick Position Entry</span>
          <div className="flex items-center space-x-2 ml-4">
            <Keyboard className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Tab/Enter to navigate</span>
          </div>
        </div>
      }
      maxWidth="max-w-7xl"
    >
      <div className="space-y-4">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            {/* Mode Toggle */}
            <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-1 flex`}>
              <button
                onClick={() => setInputMode('byType')}
                className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center space-x-2 ${
                  inputMode === 'byType' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                <Table className="w-4 h-4" />
                <span>By Asset Type</span>
              </button>
              <button
                onClick={() => setInputMode('byAccount')}
                className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center space-x-2 ${
                  inputMode === 'byAccount' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>By Account</span>
              </button>
            </div>
            
            {/* Value Toggle */}
            <button
              onClick={() => setShowValues(!showValues)}
              className={`p-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-all duration-200`}
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Hash className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Positions:</span>
              <span className="font-bold">{stats.totalPositions}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Value:</span>
              <span className="font-bold">
                {showValues ? formatCurrency(stats.totalValue) : '••••'}
              </span>
            </div>
          </div>
        </div>

        {/* Account Selector for By Account mode */}
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

        {/* Asset Type Tabs (By Type mode only) */}
        {inputMode === 'byType' && (
          <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex space-x-1 overflow-x-auto">
              {Object.entries(assetTypes).map(([key, config]) => {
                const Icon = config.icon;
                const count = stats.byType[key] || 0;
                
                return (
                  <button
                    key={key}
                    onClick={() => setActiveAssetType(key)}
                    className={`
                      px-4 py-3 flex items-center space-x-2 border-b-2 transition-all duration-200 whitespace-nowrap group
                      ${activeAssetType === key
                        ? `border-transparent ${isDark ? 'text-white' : 'text-gray-900'}`
                        : `border-transparent ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                      }
                    `}
                  >
                    <div className={`
                      p-1.5 rounded-lg transition-all duration-200
                      ${activeAssetType === key
                        ? `bg-gradient-to-r ${config.borderGradient} shadow-lg`
                        : `bg-gradient-to-r ${config.bgGradient} group-hover:${config.hoverGradient}`
                      }
                    `}>
                      <Icon className={`w-4 h-4 ${activeAssetType === key ? 'text-white' : ''}`} />
                    </div>
                    <span>{config.name}</span>
                    {count > 0 && (
                      <span className={`
                        ml-2 px-2 py-0.5 rounded-full text-xs transition-all duration-200
                        ${activeAssetType === key
                          ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400'
                          : `${isDark ? 'bg-gray-700' : 'bg-gray-200'}`
                        }
                      `}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="min-h-[400px]">
          {inputMode === 'byType' ? renderTableView() : renderListView()}
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`
            p-4 rounded-lg flex items-center space-x-2 transition-all duration-300 animate-slide-in
            ${message.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-800' :
              message.type === 'warning' ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' :
              'bg-green-900/20 text-green-400 border border-green-800'}
          `}>
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
             message.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
             <CheckCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setPositions([]);
                setMessage({ type: 'success', text: 'All positions cleared' });
              }}
              disabled={positions.length === 0}
              className={`
                px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2
                ${positions.length === 0 
                  ? 'opacity-50 cursor-not-allowed' 
                  : `${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`
                }
              `}
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
            
            {/* Quick actions */}
            <div className="flex items-center space-x-2">
              <button className={`p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`} title="Import CSV">
                <Upload className="w-4 h-4" />
              </button>
              <button className={`p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`} title="Export">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className={`px-6 py-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} rounded-lg transition-all duration-200`}
            >
              Cancel
            </button>
            <button
              onClick={submitAll}
              disabled={positions.length === 0 || isSubmitting}
              className={`
                px-6 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2
                ${positions.length === 0 || isSubmitting
                  ? 'opacity-50 cursor-not-allowed bg-gray-600'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg'
                }
                text-white
              `}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Submit ({stats.totalPositions})</span>
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

// Add custom animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);

export default AddQuickPositionModal;