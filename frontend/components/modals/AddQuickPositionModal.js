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
  Plus, Trash2, Copy, Save, Briefcase, FileText, Coins, Home, DollarSign, X, AlertCircle, CheckCircle
} from 'lucide-react';

// Reusable PositionRow component with memoization
const PositionRow = React.memo(({ position, onUpdate, onDelete, onDuplicate, onKeyDown, accounts, fields, rowIndex, isFocused }) => {
  const rowRef = useRef(null);

  useEffect(() => {
    if (isFocused) {
      const firstInput = rowRef.current?.querySelector('input, select');
      firstInput?.focus();
      firstInput?.select();
    }
  }, [isFocused]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let finalValue = value;
    if (type === 'number') finalValue = value === '' ? '' : parseFloat(value);
    if (type === 'select-one' && name === 'account_id') finalValue = value === '' ? '' : parseInt(value);
    onUpdate(position.id, { [name]: finalValue });
  };

  return (
    <tr ref={rowRef} onKeyDown={(e) => onKeyDown(e, rowIndex)} className="group hover:bg-gray-800">
      <td className="p-1 sticky left-0 bg-gray-900 group-hover:bg-gray-800">
        <div className="flex items-center space-x-1">
          <span className="text-gray-600 text-xs w-4 text-center">{rowIndex + 1}</span>
          <button onClick={() => onDuplicate(position.id)} title="Duplicate" className="p-1 text-gray-500 hover:text-blue-400 rounded">
            <Copy size={14} />
          </button>
          <button onClick={() => onDelete(position.id)} title="Delete" className="p-1 text-gray-500 hover:text-red-400 rounded">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
      {fields.map((field, colIndex) => (
        <td key={field.name} className="p-0">
          {field.type === 'select' ? (
            <select
              name={field.name}
              value={position.data[field.name] || ''}
              onChange={handleChange}
              data-col={colIndex}
              className={`w-full p-1 text-sm bg-transparent border-r border-gray-800 text-white focus:outline-none focus:bg-gray-700 ${position.errors?.[field.name] ? 'border-b-2 border-red-500' : ''}`}
            >
              <option value="" className="bg-gray-800 text-gray-400">Select...</option>
              {field.options ? field.options.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
              )) : accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-gray-800">{acc.account_name} - {acc.institution}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              name={field.name}
              value={position.data[field.name] || ''}
              placeholder={field.label}
              onChange={handleChange}
              data-col={colIndex}
              className={`w-full p-1 text-sm bg-transparent border-r border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-700 ${position.errors?.[field.name] ? 'border-b-2 border-red-500' : ''}`}
            />
          )}
        </td>
      ))}
    </tr>
  );
});

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, theme = 'dark' }) => {
  const isEmbedded = isOpen === true && !onClose;
  const isDark = theme === 'dark' && !isEmbedded;

  // State
  const [inputMode, setInputMode] = useState('byType');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [activeAssetType, setActiveAssetType] = useState('security');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [focusedRowIndex, setFocusedRowIndex] = useState(null);
  const tableRef = useRef(null);

  // Asset configuration
  const assetTypes = {
    security: {
      label: 'Securities',
      icon: <Briefcase className="w-4 h-4" />,
      fields: [
        { name: 'ticker', label: 'Ticker', type: 'text', required: true, width: 'w-24' },
        { name: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-28' },
        { name: 'price', label: 'Price', type: 'number', required: true, width: 'w-28' },
        { name: 'cost_basis', label: 'Cost Basis', type: 'number', width: 'w-28' },
        { name: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-40' },
        { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      ],
      defaults: { ticker: '', shares: '', price: '', cost_basis: '', purchase_date: '', account_id: '' }
    },
    crypto: {
      label: 'Cryptocurrency',
      icon: <Coins className="w-4 h-4" />,
      fields: [
        { name: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24' },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28' },
        { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-28' },
        { name: 'current_price', label: 'Current Price', type: 'number', width: 'w-28' },
        { name: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-40' },
        { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      ],
      defaults: { symbol: '', quantity: '', purchase_price: '', current_price: '', purchase_date: '', account_id: '' }
    },
    metal: {
      label: 'Precious Metals',
      icon: <FileText className="w-4 h-4" />,
      fields: [
        { name: 'metal_type', label: 'Metal Type', type: 'select', required: true, width: 'w-32', 
          options: [{ value: 'Gold', label: 'Gold' }, { value: 'Silver', label: 'Silver' }, { value: 'Platinum', label: 'Platinum' }, { value: 'Palladium', label: 'Palladium' }] },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28' },
        { name: 'unit', label: 'Unit', type: 'select', width: 'w-24', 
          options: [{ value: 'oz', label: 'Ounces' }, { value: 'g', label: 'Grams' }, { value: 'kg', label: 'Kilograms' }] },
        { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-28' },
        { name: 'current_price_per_unit', label: 'Current Price/Unit', type: 'number', width: 'w-28' },
        { name: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-40' },
        { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      ],
      defaults: { metal_type: '', quantity: '', unit: 'oz', purchase_price: '', current_price_per_unit: '', purchase_date: '', account_id: '' }
    },
    realestate: {
      label: 'Real Estate',
      icon: <Home className="w-4 h-4" />,
      fields: [
        { name: 'property_name', label: 'Property Name', type: 'text', required: true, width: 'w-40' },
        { name: 'property_type', label: 'Property Type', type: 'select', width: 'w-32', 
          options: [{ value: 'Residential', label: 'Residential' }, { value: 'Commercial', label: 'Commercial' }, { value: 'Land', label: 'Land' }, { value: 'Industrial', label: 'Industrial' }] },
        { name: 'address', label: 'Address', type: 'text', width: 'w-48' },
        { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-28' },
        { name: 'estimated_value', label: 'Estimated Value', type: 'number', width: 'w-28' },
        { name: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-40' },
        { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      ],
      defaults: { property_name: '', property_type: '', address: '', purchase_price: '', estimated_value: '', purchase_date: '', account_id: '' }
    },
    cash: {
      label: 'Cash',
      icon: <DollarSign className="w-4 h-4" />,
      fields: [
        { name: 'currency', label: 'Currency', type: 'select', required: true, width: 'w-24', 
          options: [{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }, { value: 'JPY', label: 'JPY' }, { value: 'CAD', label: 'CAD' }] },
        { name: 'amount', label: 'Amount', type: 'number', required: true, width: 'w-28' },
        { name: 'account_type', label: 'Account Type', type: 'select', width: 'w-32', 
          options: [{ value: 'Savings', label: 'Savings' }, { value: 'Checking', label: 'Checking' }, { value: 'Money Market', label: 'Money Market' }, { value: 'CD', label: 'CD' }] },
        { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', width: 'w-28' },
        { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      ],
      defaults: { currency: 'USD', amount: '', account_type: '', interest_rate: '', account_id: '' }
    }
  };

  // Load accounts and initialize
  useEffect(() => {
    if (isOpen || isEmbedded) {
      const loadData = async () => {
        try {
          const fetchedAccounts = await fetchAllAccounts();
          setAccounts(fetchedAccounts);
          if (fetchedAccounts.length > 0 && inputMode === 'byAccount') {
            setSelectedAccount(fetchedAccounts[0]);
          }
          // Initialize with one blank row
          if (positions.length === 0) {
            setPositions([getNewPosition('security')]);
            setFocusedRowIndex(0);
          }
        } catch (error) {
          setMessage({ type: 'error', text: 'Failed to load accounts' });
        }
      };
      loadData();
    } else {
      setPositions([]);
      setMessage({ type: '', text: '' });
      setActiveAssetType('security');
      setInputMode('byType');
    }
  }, [isOpen, isEmbedded]);

  // Get new position
  const getNewPosition = (type, defaults = {}) => {
    const newPos = {
      id: `temp_${Date.now()}_${Math.random()}`,
      type,
      accountId: inputMode === 'byAccount' ? selectedAccount?.id : defaults.account_id || '',
      accountName: inputMode === 'byAccount' ? selectedAccount?.account_name : accounts.find(a => a.id === defaults.account_id)?.account_name || '',
      data: { ...assetTypes[type].defaults, ...defaults },
      errors: {}
    };
    return newPos;
  };

  // Calculate queue stats
  const queueStats = useMemo(() => {
    const stats = {
      totalPositions: positions.length,
      byType: {},
      byAccount: {},
      totalValue: 0
    };

    positions.forEach(pos => {
      stats.byType[pos.type] = (stats.byType[pos.type] || 0) + 1;
      const accountName = pos.accountName || 'Unassigned';
      stats.byAccount[accountName] = (stats.byAccount[accountName] || 0) + 1;

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
  }, [positions]);

  // Add new position
  const addNewPosition = useCallback(() => {
    const newPosition = getNewPosition(activeAssetType);
    setPositions(prev => [...prev, newPosition]);
    setFocusedRowIndex(positions.filter(p => p.type === activeAssetType && (inputMode === 'byType' || p.accountId === selectedAccount?.id)).length);
    setTimeout(() => {
      if (tableRef.current) tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }, 50);
  }, [activeAssetType, inputMode, selectedAccount]);

  // Update position
  const updatePosition = useCallback((id, updates) => {
    setPositions(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updatedData = { ...p.data, ...updates };
      const errors = {};
      assetTypes[p.type].fields.forEach(field => {
        if (field.required && (updatedData[field.name] === '' || updatedData[field.name] == null)) {
          errors[field.name] = `${field.label} is required`;
        }
      });
      return { ...p, data: updatedData, errors };
    }));
    if (message.text) setMessage({ type: '', text: '' });
  }, [message.text]);

  // Duplicate position
  const duplicatePosition = useCallback((id) => {
    const sourcePos = positions.find(p => p.id === id);
    if (!sourcePos) return;
    const newPosition = getNewPosition(sourcePos.type, sourcePos.data);
    setPositions(prev => {
      const sourceIndex = prev.findIndex(p => p.id === id);
      return [...prev.slice(0, sourceIndex + 1), newPosition, ...prev.slice(sourceIndex + 1)];
    });
    setFocusedRowIndex(positions.filter(p => p.type === activeAssetType && (inputMode === 'byType' || p.accountId === selectedAccount?.id)).findIndex(p => p.id === id) + 1);
  }, [positions, activeAssetType, inputMode, selectedAccount]);

  // Delete position
  const deletePosition = useCallback((id) => {
    setPositions(prev => prev.filter(p => p.id !== id));
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e, rowIndex) => {
    const { key, target } = e;
    const currentColumn = parseInt(target.dataset.col, 10);
    const totalColumns = assetTypes[activeAssetType].fields.length;
    const filteredPositions = positions.filter(p => p.type === activeAssetType && (inputMode === 'byType' || p.accountId === selectedAccount?.id));
    const totalRows = filteredPositions.length;

    const focusCell = (row, col) => {
      const nextInput = tableRef.current?.querySelector(`tr:nth-of-type(${row + 1}) [data-col='${col}']`);
      nextInput?.focus();
      nextInput?.select();
      setFocusedRowIndex(row);
    };

    if (key === 'Enter' || (key === 'Tab' && !e.shiftKey && rowIndex === totalRows - 1 && currentColumn === totalColumns - 1)) {
      e.preventDefault();
      addNewPosition();
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < totalRows - 1) focusCell(rowIndex + 1, currentColumn);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) focusCell(rowIndex - 1, currentColumn);
    } else if (key === 'ArrowRight' && (target.selectionStart === target.value.length || target.type !== 'text')) {
      e.preventDefault();
      if (currentColumn < totalColumns - 1) focusCell(rowIndex, currentColumn + 1);
    } else if (key === 'ArrowLeft' && (target.selectionStart === 0 || target.type !== 'text')) {
      e.preventDefault();
      if (currentColumn > 0) focusCell(rowIndex, currentColumn - 1);
    }
  }, [activeAssetType, inputMode, selectedAccount, positions, addNewPosition]);

  // Submit positions
  const submitAll = async () => {
    if (positions.length === 0) {
      setMessage({ type: 'error', text: 'No positions to submit' });
      return;
    }

    const validatedPositions = positions.map(pos => {
      const errors = {};
      assetTypes[pos.type].fields.forEach(field => {
        if (field.required && (pos.data[field.name] === '' || pos.data[field.name] == null)) {
          errors[field.name] = `${field.label} is required`;
        }
      });
      return { ...pos, errors };
    });

    const invalidPositions = validatedPositions.filter(p => Object.keys(p.errors).length > 0);
    if (invalidPositions.length > 0) {
      setPositions(validatedPositions);
      setMessage({ type: 'error', text: `Please fix ${invalidPositions.length} invalid position(s)` });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: 'info', text: `Submitting ${positions.length} positions...` });

    let successCount = 0;
    let errorCount = 0;

    try {
      const positionsByType = {
        security: positions.filter(p => p.type === 'security'),
        crypto: positions.filter(p => p.type === 'crypto'),
        metal: positions.filter(p => p.type === 'metal'),
        realestate: positions.filter(p => p.type === 'realestate'),
        cash: positions.filter(p => p.type === 'cash')
      };

      for (const [type, typePositions] of Object.entries(positionsByType)) {
        for (const position of typePositions) {
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
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        setMessage({ type: 'success', text: `All ${successCount} positions added successfully!` });
        if (onPositionsSaved) onPositionsSaved(successCount);
        setTimeout(() => {
          setPositions([]);
          if (onClose) onClose();
        }, 2000);
      } else {
        setMessage({ type: 'warning', text: `${successCount} positions added, ${errorCount} failed` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error submitting positions' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render by account view
  const renderByAccountView = () => {
    const positionsByAccount = positions.reduce((acc, pos) => {
      const accountId = pos.accountId || 'unassigned';
      acc[accountId] = acc[accountId] || [];
      acc[accountId].push(pos);
      return acc;
    }, {});

    const accountMap = accounts.reduce((map, acc) => {
      map[acc.id] = acc;
      return map;
    }, {});

    return (
      <div className="flex-grow overflow-auto p-4 space-y-4">
        {Object.entries(positionsByAccount).map(([accountId, accountPositions]) => {
          const account = accountMap[accountId];
          return (
            <div key={accountId} className={`rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h3 className="font-semibold p-3 border-b border-gray-700">
                {account ? `${account.account_name} (${account.institution})` : 'Unassigned Positions'}
              </h3>
              <ul className="divide-y divide-gray-700">
                {accountPositions.map(pos => (
                  <li key={pos.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-400">{assetTypes[pos.type].icon}</div>
                      <div>
                        <span className="font-bold">
                          {pos.type === 'security' && pos.data.ticker}
                          {pos.type === 'crypto' && pos.data.symbol}
                          {pos.type === 'metal' && `${pos.data.metal_type} (${pos.data.quantity} ${pos.data.unit})`}
                          {pos.type === 'realestate' && pos.data.property_name}
                          {pos.type === 'cash' && `${pos.data.currency} ${formatCurrency(pos.data.amount)}`}
                        </span>
                        <span className="text-gray-400 text-sm ml-2">
                          {assetTypes[pos.type].label}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => duplicatePosition(pos.id)} className="p-1 text-blue-400 hover:bg-blue-900/20 rounded">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => deletePosition(pos.id)} className="p-1 text-red-400 hover:bg-red-900/20 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  // Main content
  const content = (
    <div className={`w-full flex flex-col h-full ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-xl font-bold">Quick Position Entry</h2>
        <div className="flex items-center space-x-4">
          <div className={`p-1 rounded-md ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <button
              onClick={() => setInputMode('byType')}
              className={`px-3 py-1 rounded ${inputMode === 'byType' ? 'bg-blue-600 text-white' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              By Asset Type
            </button>
            <button
              onClick={() => setInputMode('byAccount')}
              className={`px-3 py-1 rounded ${inputMode === 'byAccount' ? 'bg-blue-600 text-white' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              By Account
            </button>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <X size={24} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-hidden flex flex-col">
        {inputMode === 'byAccount' && (
          <div className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <select
              value={selectedAccount?.id || ''}
              onChange={(e) => setSelectedAccount(accounts.find(a => a.id === parseInt(e.target.value)))}
              className={`w-full p-2 rounded text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="">Select Account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name} - {account.institution}
                </option>
              ))}
            </select>
          </div>
        )}

        {inputMode === 'byType' ? (
          <>
            <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              {Object.entries(assetTypes).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setActiveAssetType(key)}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium ${activeAssetType === key ? 'border-b-2 border-blue-500 text-white' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {config.icon}
                  <span>{config.label}</span>
                  {queueStats.byType[key] > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      {queueStats.byType[key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div ref={tableRef} className="flex-grow overflow-auto">
              <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
                <thead className="sticky top-0 bg-gray-900 z-10">
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-gray-400 uppercase sticky left-0 bg-gray-900 w-24">Actions</th>
                    {assetTypes[activeAssetType].fields.map(field => (
                      <th key={field.name} className={`p-2 text-left text-xs font-medium text-gray-400 uppercase border-l border-gray-800 ${field.width}`}>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions
                    .filter(p => p.type === activeAssetType)
                    .map((pos, index) => (
                      <PositionRow
                        key={pos.id}
                        position={pos}
                        onUpdate={updatePosition}
                        onDelete={deletePosition}
                        onDuplicate={duplicatePosition}
                        onKeyDown={handleKeyDown}
                        accounts={accounts}
                        fields={assetTypes[activeAssetType].fields}
                        rowIndex={index}
                        isFocused={index === focusedRowIndex}
                      />
                    ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t border-gray-700">
              <button onClick={addNewPosition} className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300">
                <Plus size={16} />
                <span>Add New {assetTypes[activeAssetType].label.slice(0, -1)}</span>
              </button>
            </div>
          </>
        ) : (
          renderByAccountView()
        )}
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 p-4 border-t border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-6 text-sm">
          <p><span className="font-bold">{queueStats.totalPositions}</span> <span className="text-gray-400">Positions</span></p>
          <p><span className="font-bold">{formatCurrency(queueStats.totalValue)}</span> <span className="text-gray-400">Total Value</span></p>
          {message.text && (
            <div className={`flex items-center space-x-2 p-2 rounded ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : message.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
              {message.type === 'error' || message.type === 'warning' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setPositions([])}
            className={`px-4 py-2 rounded ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            disabled={positions.length === 0 || isSubmitting}
          >
            Clear Queue
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            onClick={submitAll}
            disabled={positions.length === 0 || isSubmitting}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Submit ({queueStats.totalPositions})</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );

  return isEmbedded ? content : (
    <FixedModal isOpen={isOpen} onClose={onClose} title="Quick Position Entry" maxWidth="max-w-7xl">
      {content}
    </FixedModal>
  );
};

export default AddQuickPositionModal;