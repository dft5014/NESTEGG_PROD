import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, Copy, Save, Briefcase, FileText, X, AlertCircle, CheckCircle, ChevronDown, Repeat } from 'lucide-react';

// --- Mock API Methods & Utils ---
// In a real app, these would be imported from your utils/api files.
const MOCK_API_BASE_URL = '/api';

const fetchWithAuth = async (url, options = {}) => {
  console.log('Fetching:', url, options);
  // Mocking API delay
  await new Promise(res => setTimeout(res, 500));
  
  // Mocking auth and token refresh logic
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.error('No access token found.');
    // In a real app, you might trigger a redirect to login
    return { ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) };
  }
  
  // Mock responses based on URL
  if (url.includes('/accounts')) {
    return {
      ok: true,
      json: async () => ([
        { account_id: 101, account_name: 'Fidelity Brokerage', institution: 'Fidelity', account_type: 'Taxable', is_active: true },
        { account_id: 102, account_name: 'Vanguard IRA', institution: 'Vanguard', account_type: 'Retirement', is_active: true },
        { account_id: 103, account_name: 'Schwab Checking', institution: 'Charles Schwab', account_type: 'Cash', is_active: true },
      ]),
    };
  }
  
  if (url.includes('/positions/batch')) {
    const { positions } = JSON.parse(options.body);
    // Simulate partial success
    const successCount = Math.floor(positions.length * 0.8);
    console.log(`Simulating batch creation: ${successCount} successful, ${positions.length - successCount} failed.`);
    return {
      ok: successCount === positions.length,
      json: async () => ({ 
        message: 'Batch processing complete.', 
        success_count: successCount,
        failed_count: positions.length - successCount,
        details: positions.slice(successCount).map(p => ({ position: p, error: 'Simulated API error.' })) 
      }),
    };
  }

  return { ok: true, json: async () => ({}) };
};


const fetchAllAccounts = async () => {
  const response = await fetchWithAuth(`${MOCK_API_BASE_URL}/accounts`);
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
};

const createPositions = async (positions) => {
  return fetchWithAuth(`${MOCK_API_BASE_URL}/positions/batch`, {
    method: 'POST',
    body: JSON.stringify({ positions }),
  });
};

const formatCurrency = (value) => {
    if (value == null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};


// --- Asset Configuration ---
// Defines the structure and fields for each asset type.
const ASSET_CONFIG = {
  stock: {
    label: 'Stocks',
    icon: <Briefcase className="w-4 h-4" />,
    fields: [
      { name: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24' },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28' },
      { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32' },
      { name: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-40' },
      { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      { name: 'exchange', label: 'Exchange', type: 'text', width: 'w-28' },
      { name: 'dividend_yield', label: 'Div. Yield (%)', type: 'number', width: 'w-32' },
    ]
  },
  bond: {
    label: 'Bonds',
    icon: <FileText className="w-4 h-4" />,
    fields: [
      { name: 'symbol', label: 'Symbol/CUSIP', type: 'text', required: true, width: 'w-28' },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28' },
      { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32' },
      { name: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-40' },
      { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      { name: 'maturity_date', label: 'Maturity Date', type: 'date', required: true, width: 'w-40' },
      { name: 'coupon_rate', label: 'Coupon (%)', type: 'number', required: true, width: 'w-28' },
      { name: 'face_value', label: 'Face Value', type: 'number', required: true, width: 'w-28' },
    ]
  },
  etf: {
    label: 'ETFs',
    icon: <Briefcase className="w-4 h-4" />,
    fields: [
      { name: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24' },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28' },
      { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32' },
      { name: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-40' },
      { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      { name: 'expense_ratio', label: 'Expense Ratio (%)', type: 'number', width: 'w-36' },
      { name: 'underlying_index', label: 'Index', type: 'text', width: 'w-48' },
    ]
  },
  mutual_fund: {
    label: 'Mutual Funds',
    icon: <Briefcase className="w-4 h-4" />,
    fields: [
      { name: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24' },
      { name: 'quantity', label: 'Quantity/Shares', type: 'number', required: true, width: 'w-32' },
      { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32' },
      { name: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-40' },
      { name: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-48' },
      { name: 'expense_ratio', label: 'Expense Ratio (%)', type: 'number', width: 'w-36' },
      { name: 'fund_family', label: 'Fund Family', type: 'text', width: 'w-40' },
    ]
  },
};

const ASSET_TYPES = Object.keys(ASSET_CONFIG);

// --- Reusable Components ---

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
    if (type === 'number') {
      finalValue = value === '' ? null : parseFloat(value);
    }
    if (type === 'select-one' && name === 'account_id') {
      finalValue = value === '' ? null : parseInt(value);
    }
    onUpdate(position.id, { [name]: finalValue });
  };

  return (
    <tr ref={rowRef} onKeyDown={(e) => onKeyDown(e, rowIndex)} className="group hover:bg-gray-800 focus-within:bg-gray-800 transition-colors duration-150">
      <td className="p-1 sticky left-0 bg-gray-900 group-hover:bg-gray-800 group-focus-within:bg-gray-800">
        <div className="flex items-center space-x-1">
          <span className="text-gray-600 text-xs w-4 text-center">{rowIndex + 1}</span>
          <button onClick={() => onDuplicate(position.id)} title="Duplicate Row" className="p-1 text-gray-500 hover:text-blue-400 focus:text-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Copy size={14} />
          </button>
          <button onClick={() => onDelete(position.id)} title="Delete Row" className="p-1 text-gray-500 hover:text-red-400 focus:text-red-400 rounded focus:outline-none focus:ring-2 focus:ring-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
      {fields.map((field, colIndex) => (
        <td key={field.name} className="p-0">
          {field.type === 'select' ? (
            <select
              name={field.name}
              value={position[field.name] || ''}
              onChange={handleChange}
              data-col={colIndex}
              className={`bg-transparent w-full h-full p-1 border-r border-gray-800 text-white focus:outline-none focus:bg-gray-700 ${position.errors?.[field.name] ? 'border-b-2 border-red-500' : ''}`}
            >
              <option value="" className="text-gray-400">Select...</option>
              {accounts.map(acc => (
                <option key={acc.account_id} value={acc.account_id} className="bg-gray-800 text-white">
                  {acc.account_name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              name={field.name}
              value={position[field.name] || ''}
              placeholder={field.label}
              onChange={handleChange}
              data-col={colIndex}
              className={`bg-transparent w-full h-full p-1 border-r border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:bg-gray-700 ${position.errors?.[field.name] ? 'border-b-2 border-red-500' : ''}`}
            />
          )}
        </td>
      ))}
    </tr>
  );
});

// --- Main Modal Component ---

const AddQuickPositionModal = ({ isOpen, onClose }) => {
  // State
  const [positions, setPositions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [view, setView] = useState('byAssetType'); // 'byAssetType' or 'byAccount'
  const [activeAssetType, setActiveAssetType] = useState(ASSET_TYPES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [focusedRowIndex, setFocusedRowIndex] = useState(null);

  const tableContainerRef = useRef(null);

  // Derived State
  const activeFields = useMemo(() => ASSET_CONFIG[activeAssetType].fields, [activeAssetType]);
  const positionsForActiveType = useMemo(() => positions.filter(p => p.assetType === activeAssetType), [positions, activeAssetType]);
  
  // Methods
  const getNewPosition = (type, defaults = {}) => {
    const newPos = {
      id: `temp_${Date.now()}_${Math.random()}`,
      assetType: type,
      errors: {},
      ...defaults
    };
    ASSET_CONFIG[type].fields.forEach(field => {
      newPos[field.name] = defaults[field.name] || (field.type === 'number' ? null : '');
    });
    return newPos;
  };

  const handleAddRow = useCallback(() => {
    const newPosition = getNewPosition(activeAssetType);
    setPositions(prev => [...prev, newPosition]);
    setFocusedRowIndex(positionsForActiveType.length);
    // Scroll to bottom of table
    setTimeout(() => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
        }
    }, 50);
  }, [activeAssetType, positionsForActiveType.length]);

  const handleUpdatePosition = useCallback((id, updates) => {
    setPositions(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, errors: {} } : p))
    );
    if(message.text) setMessage({ type: '', text: '' });
  }, [message.text]);

  const handleDeletePosition = useCallback((id) => {
    setPositions(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleDuplicatePosition = useCallback((id) => {
    const sourcePos = positions.find(p => p.id === id);
    if (!sourcePos) return;

    const { id: oldId, errors, ...dataToCopy } = sourcePos;
    const newPosition = getNewPosition(activeAssetType, dataToCopy);
    
    setPositions(prev => {
        const sourceIndex = prev.findIndex(p => p.id === id);
        const newPositions = [...prev];
        newPositions.splice(sourceIndex + 1, 0, newPosition);
        return newPositions;
    });
    setFocusedRowIndex(positions.filter(p => p.assetType === activeAssetType).findIndex(p => p.id === id) + 1);
  }, [positions, activeAssetType]);
  
  const validatePositions = () => {
    let allValid = true;
    let errorCount = 0;
    
    const validatedPositions = positions.map(pos => {
      const config = ASSET_CONFIG[pos.assetType];
      const errors = {};
      let hasError = false;

      config.fields.forEach(field => {
        if (field.required && (pos[field.name] === null || pos[field.name] === '')) {
          errors[field.name] = `${field.label} is required.`;
          hasError = true;
        }
      });
      
      if (hasError) {
        allValid = false;
        errorCount++;
      }
      
      return { ...pos, errors };
    });
    
    setPositions(validatedPositions);

    if (!allValid) {
       setMessage({ type: 'error', text: `Validation failed. Please fix ${errorCount} error(s) in the highlighted rows.` });
    }

    return allValid;
  };

  const handleSubmit = async () => {
    if (positions.length === 0) {
        setMessage({ type: 'error', text: 'No positions to submit.' });
        return;
    }

    if (!validatePositions()) {
        return;
    }
    
    setIsSubmitting(true);
    setMessage({ type: 'info', text: `Submitting ${positions.length} positions...`});

    try {
        const response = await createPositions(positions);
        const result = await response.json();

        if (!response.ok && result.failed_count > 0) {
             setMessage({ type: 'warning', text: `Partial success: ${result.success_count} saved, ${result.failed_count} failed.` });
             // Optionally, highlight or remove the failed positions based on API response
        } else {
             setMessage({ type: 'success', text: `Successfully saved all ${positions.length} positions!` });
             setTimeout(() => {
                 setPositions([]);
                 if (onClose) onClose();
             }, 2000);
        }
    } catch (error) {
        console.error("Submission error:", error);
        setMessage({ type: 'error', text: 'An unexpected error occurred during submission.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleKeyDown = useCallback((e, rowIndex) => {
    const { key, target } = e;
    const currentColumn = parseInt(target.dataset.col, 10);
    const totalColumns = activeFields.length;
    
    let nextRowIndex = rowIndex;
    let nextColIndex = currentColumn;

    const focusCell = (row, col) => {
        const nextInput = tableContainerRef.current?.querySelector(`tr:nth-of-type(${row + 1}) [data-col='${col}']`);
        nextInput?.focus();
        nextInput?.select();
    };

    if (key === 'Enter' || (key === 'Tab' && !e.shiftKey && rowIndex === positionsForActiveType.length - 1 && currentColumn === totalColumns - 1)) {
        e.preventDefault();
        handleAddRow();
    } else if (key === 'ArrowDown') {
        e.preventDefault();
        nextRowIndex = Math.min(rowIndex + 1, positionsForActiveType.length - 1);
        focusCell(nextRowIndex, nextColIndex);
    } else if (key === 'ArrowUp') {
        e.preventDefault();
        nextRowIndex = Math.max(rowIndex - 1, 0);
        focusCell(nextRowIndex, nextColIndex);
    } else if (key === 'ArrowRight' && !e.shiftKey) {
        if(target.selectionStart === target.value.length || target.type !== 'text') {
            e.preventDefault();
            nextColIndex = Math.min(currentColumn + 1, totalColumns - 1);
            focusCell(nextRowIndex, nextColIndex);
        }
    } else if (key === 'ArrowLeft' && !e.shiftKey) {
        if(target.selectionStart === 0 || target.type !== 'text') {
            e.preventDefault();
            nextColIndex = Math.max(currentColumn - 1, 0);
            focusCell(nextRowIndex, nextColIndex);
        }
    }

  }, [handleAddRow, activeFields.length, positionsForActiveType.length]);

  // Effects
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const accs = await fetchAllAccounts();
          setAccounts(accs);
          if (positions.length === 0) {
            // Start with one blank row for the active type
            setPositions([getNewPosition(activeAssetType)]);
            setFocusedRowIndex(0);
          }
        } catch (error) {
          console.error('Error loading accounts:', error);
          setMessage({ type: 'error', text: 'Could not load accounts. Please try again.' });
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    } else {
        // Reset state on close
        setPositions([]);
        setMessage({ type: '', text: '' });
        setActiveAssetType(ASSET_TYPES[0]);
        setView('byAssetType');
    }
  }, [isOpen]);


  if (!isOpen) {
    return null;
  }

  // Render Logic
  const renderByAssetTypeView = () => (
    <>
      <div className="flex items-center border-b border-gray-700 px-4">
        {ASSET_TYPES.map(type => {
          const count = positions.filter(p => p.assetType === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveAssetType(type)}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeAssetType === type 
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {ASSET_CONFIG[type].icon}
              <span>{ASSET_CONFIG[type].label}</span>
              {count > 0 && <span className="text-xs bg-gray-700 text-gray-300 rounded-full px-2 py-0.5">{count}</span>}
            </button>
          );
        })}
      </div>
      <div ref={tableContainerRef} className="flex-grow overflow-auto relative">
        <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr>
              <th className="p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 w-24">Actions</th>
              {activeFields.map(field => (
                <th key={field.name} className={`p-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-l border-gray-800 ${field.width}`}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-850">
            {positionsForActiveType.map((pos, index) => (
              <PositionRow
                key={pos.id}
                position={pos}
                onUpdate={handleUpdatePosition}
                onDelete={handleDeletePosition}
                onDuplicate={handleDuplicatePosition}
                onKeyDown={handleKeyDown}
                accounts={accounts}
                fields={activeFields}
                rowIndex={index}
                isFocused={index === focusedRowIndex}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex-shrink-0 p-2 border-t border-gray-700">
          <button onClick={handleAddRow} className="flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 font-medium p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Plus size={16} />
            <span>Add New {ASSET_CONFIG[activeAssetType].label.slice(0, -1)}</span>
          </button>
      </div>
    </>
  );
  
  const renderByAccountView = () => {
    const positionsByAccount = positions.reduce((acc, pos) => {
        const accountId = pos.account_id || 'unassigned';
        if (!acc[accountId]) {
            acc[accountId] = [];
        }
        acc[accountId].push(pos);
        return acc;
    }, {});
    
    const accountMap = accounts.reduce((map, acc) => {
        map[acc.account_id] = acc;
        return map;
    }, {});

    return (
        <div className="flex-grow overflow-auto p-4 space-y-4">
            {Object.entries(positionsByAccount).map(([accountId, accountPositions]) => {
                 const account = accountMap[accountId];
                 return (
                    <div key={accountId} className="bg-gray-800 rounded-lg">
                        <h3 className="font-semibold text-white p-3 border-b border-gray-700">
                            {account ? `${account.account_name} (${account.institution})` : 'Unassigned Positions'}
                        </h3>
                        <ul className="divide-y divide-gray-700">
                            {accountPositions.map(pos => (
                                <li key={pos.id} className="flex items-center justify-between p-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-blue-400">{ASSET_CONFIG[pos.assetType].icon}</div>
                                        <div>
                                            <span className="font-bold text-white">{pos.symbol || 'N/A'}</span>
                                            <span className="text-gray-400 text-sm ml-2">{pos.quantity} units/shares</span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        Value: {formatCurrency(pos.quantity * pos.purchase_price)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )
            })}
        </div>
    );
  };
  
  const totalValue = useMemo(() => positions.reduce((sum, pos) => sum + ((pos.quantity || 0) * (pos.purchase_price || 0)), 0), [positions]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold">NestEgg Quick Position Entry</h2>
            <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm space-x-4 bg-gray-800 p-1 rounded-md">
                    <button 
                        onClick={() => setView('byAssetType')}
                        className={`px-3 py-1 rounded ${view === 'byAssetType' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        By Asset Type
                    </button>
                    <button
                        onClick={() => setView('byAccount')}
                        className={`px-3 py-1 rounded ${view === 'byAccount' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                       By Account
                    </button>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white">
                    <X size={24} />
                </button>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow flex flex-col overflow-hidden">
            {isLoading ? (
                <div className="flex-grow flex items-center justify-center">Loading...</div>
            ) : view === 'byAssetType' ? renderByAssetTypeView() : renderByAccountView()}
        </main>
        
        {/* Footer */}
        <footer className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-900 flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
                <p><span className="font-bold text-white">{positions.length}</span> <span className="text-gray-400">Positions Queued</span></p>
                 <p><span className="font-bold text-white">{formatCurrency(totalValue)}</span> <span className="text-gray-400">Total Value</span></p>
                 {message.text && (
                    <div className={`flex items-center space-x-2 p-2 rounded-md ${
                        message.type === 'error' ? 'bg-red-500/10 text-red-400' : 
                        message.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 
                        message.type === 'success' ? 'bg-green-500/10 text-green-400' :
                        'bg-blue-500/10 text-blue-400'
                    }`}>
                        {message.type === 'error' || message.type === 'warning' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                        <span>{message.text}</span>
                    </div>
                 )}
            </div>
            <div className="flex items-center space-x-3">
                <button 
                    onClick={onClose} 
                    className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSubmit} 
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors flex items-center space-x-2 disabled:bg-green-800 disabled:cursor-not-allowed"
                    disabled={isSubmitting || positions.length === 0}
                >
                    {isSubmitting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : <Save size={18} />}
                    <span>{isSubmitting ? 'Submitting...' : `Submit All (${positions.length})`}</span>
                </button>
            </div>
        </footer>
      </div>
    </div>
  );
};

// --- App Component to Demonstrate the Modal ---

export default function App() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // This simulates setting a token on login
    useEffect(() => {
        localStorage.setItem('access_token', 'mock-jwt-token-for-demo');
    }, []);

    return (
        <div className="bg-gray-800 text-white min-h-screen flex items-center justify-center font-sans">
            <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-500 transition-all shadow-lg"
            >
                Add Positions
            </button>

            <AddQuickPositionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
