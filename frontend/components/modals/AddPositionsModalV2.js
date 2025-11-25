import React, { useReducer, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import FixedModal from './FixedModal';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import {
  addSecurityPositionBulk,
  addCashPositionBulk,
  addCryptoPositionBulk,
  addMetalPositionBulk,
  addOtherAssetBulk,
  searchSecurities
} from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';
import debounce from 'lodash.debounce';
import {
  Plus, X, Check, DollarSign, BarChart3, Coins, Gem, Home,
  Trash2, CheckCircle, AlertCircle, Loader2, Upload, Download,
  ArrowRight, ChevronDown, ChevronUp, Search, Building2, Layers, Wallet,
  Copy, Info, Keyboard, FileSpreadsheet, ClipboardList, HelpCircle
} from 'lucide-react';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const ASSET_TYPES = {
  security: {
    name: 'Securities',
    icon: BarChart3,
    color: 'blue',
    fields: [
      { key: 'ticker', label: 'Ticker', type: 'text', required: true, searchable: true },
      { key: 'name', label: 'Company', type: 'text', readOnly: true },
      { key: 'shares', label: 'Shares', type: 'number', required: true },
      { key: 'price', label: 'Price', type: 'number', required: true, readOnly: true },
      { key: 'cost_basis', label: 'Cost Basis', type: 'number', required: true },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
      { key: 'account_id', label: 'Account', type: 'select', required: true }
    ]
  },
  cash: {
    name: 'Cash',
    icon: DollarSign,
    color: 'purple',
    fields: [
      {
        key: 'cash_type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: '', label: 'Select...' },
          { value: 'Savings', label: 'Savings' },
          { value: 'Checking', label: 'Checking' },
          { value: 'Money Market', label: 'Money Market' },
          { value: 'CD', label: 'CD' }
        ]
      },
      { key: 'amount', label: 'Amount', type: 'number', required: true },
      { key: 'account_id', label: 'Account', type: 'select', required: true }
    ]
  },
  crypto: {
    name: 'Cryptocurrency',
    icon: Coins,
    color: 'orange',
    fields: [
      { key: 'symbol', label: 'Symbol', type: 'text', required: true, searchable: true },
      { key: 'name', label: 'Name', type: 'text', readOnly: true },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      { key: 'current_price', label: 'Price', type: 'number', required: true, readOnly: true },
      { key: 'purchase_price', label: 'Purchase Price', type: 'number', required: true },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
      { key: 'account_id', label: 'Account', type: 'select', required: true }
    ]
  },
  metal: {
    name: 'Precious Metals',
    icon: Gem,
    color: 'yellow',
    fields: [
      {
        key: 'metal_type',
        label: 'Metal',
        type: 'select',
        required: true,
        options: [
          { value: '', label: 'Select...' },
          { value: 'Gold', label: 'Gold' },
          { value: 'Silver', label: 'Silver' },
          { value: 'Platinum', label: 'Platinum' },
          { value: 'Palladium', label: 'Palladium' }
        ]
      },
      { key: 'quantity', label: 'Quantity (oz)', type: 'number', required: true },
      { key: 'purchase_price', label: 'Purchase Price/oz', type: 'number', required: true },
      { key: 'current_price_per_unit', label: 'Current Price/oz', type: 'number', required: true, readOnly: true },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true },
      { key: 'account_id', label: 'Account', type: 'select', required: true }
    ]
  },
  other: {
    name: 'Other Assets',
    icon: Home,
    color: 'green',
    fields: [
      { key: 'asset_name', label: 'Asset Name', type: 'text', required: true },
      { key: 'current_value', label: 'Current Value', type: 'number', required: true }
    ]
  }
};

// ============================================================================
// STATE MANAGEMENT (useReducer)
// ============================================================================

const initialState = {
  positions: [],
  accounts: [],
  expandedTypes: {
    security: true,
    cash: false,
    crypto: false,
    metal: false,
    other: false
  },
  selectedIds: new Set(),
  searchResults: {},
  isSearching: {},
  isDirty: false,
  showImportModal: false,
  importData: null,
  showHelp: false,
  showKeyboardShortcuts: false,
  showQueue: false,
  searchTerm: ''
};

function positionsReducer(state, action) {
  switch (action.type) {
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };

    case 'ADD_POSITION':
      return {
        ...state,
        positions: [...state.positions, action.payload],
        isDirty: true
      };

    case 'UPDATE_POSITION':
      return {
        ...state,
        positions: state.positions.map(pos =>
          pos.id === action.payload.id
            ? { ...pos, data: { ...pos.data, ...action.payload.data } }
            : pos
        ),
        isDirty: true
      };

    case 'DELETE_POSITION':
      return {
        ...state,
        positions: state.positions.filter(pos => pos.id !== action.payload),
        selectedIds: new Set([...state.selectedIds].filter(id => id !== action.payload)),
        isDirty: true
      };

    case 'DELETE_SELECTED':
      const idsToDelete = new Set(action.payload);
      return {
        ...state,
        positions: state.positions.filter(pos => !idsToDelete.has(pos.id)),
        selectedIds: new Set(),
        isDirty: true
      };

    case 'CLEAR_ALL':
      return {
        ...state,
        positions: [],
        selectedIds: new Set(),
        isDirty: false
      };

    case 'TOGGLE_SELECT':
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedIds: newSelected };

    case 'SELECT_ALL':
      return {
        ...state,
        selectedIds: new Set(state.positions.map(p => p.id))
      };

    case 'DESELECT_ALL':
      return { ...state, selectedIds: new Set() };

    case 'TOGGLE_EXPANDED':
      return {
        ...state,
        expandedTypes: {
          ...state.expandedTypes,
          [action.payload]: !state.expandedTypes[action.payload]
        }
      };

    case 'SET_SEARCH_RESULTS':
      return {
        ...state,
        searchResults: {
          ...state.searchResults,
          [action.payload.key]: action.payload.results
        }
      };

    case 'SET_SEARCHING':
      return {
        ...state,
        isSearching: {
          ...state.isSearching,
          [action.payload.key]: action.payload.value
        }
      };

    case 'BULK_IMPORT':
      return {
        ...state,
        positions: [...state.positions, ...action.payload],
        isDirty: true
      };

    case 'UPDATE_STATUS':
      return {
        ...state,
        positions: state.positions.map(pos =>
          pos.id === action.payload.id
            ? { ...pos, status: action.payload.status, error: action.payload.error }
            : pos
        )
      };

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    case 'SHOW_IMPORT_MODAL':
      return { ...state, showImportModal: true };

    case 'HIDE_IMPORT_MODAL':
      return { ...state, showImportModal: false, importData: null };

    case 'SET_IMPORT_DATA':
      return { ...state, importData: action.payload };

    case 'TOGGLE_HELP':
      return { ...state, showHelp: !state.showHelp };

    case 'TOGGLE_KEYBOARD_SHORTCUTS':
      return { ...state, showKeyboardShortcuts: !state.showKeyboardShortcuts };

    case 'TOGGLE_QUEUE':
      return { ...state, showQueue: !state.showQueue };

    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };

    case 'DUPLICATE_POSITION':
      const posToDupe = state.positions.find(p => p.id === action.payload);
      if (!posToDupe) return state;
      const duplicated = {
        ...posToDupe,
        id: `${Date.now()}-${Math.random()}`,
        data: { ...posToDupe.data },
        status: 'draft'
      };
      const dupeIndex = state.positions.findIndex(p => p.id === action.payload);
      return {
        ...state,
        positions: [
          ...state.positions.slice(0, dupeIndex + 1),
          duplicated,
          ...state.positions.slice(dupeIndex + 1)
        ],
        isDirty: true
      };

    default:
      return state;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validatePosition(position, assetType) {
  const config = ASSET_TYPES[assetType];
  if (!config) return { valid: false, errors: { _general: 'Invalid asset type' } };

  const errors = {};
  const requiredFields = config.fields.filter(f => f.required);

  for (const field of requiredFields) {
    const value = position.data[field.key];
    if (value === undefined || value === null || value === '') {
      errors[field.key] = 'Required';
    } else if (field.type === 'number') {
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) {
        errors[field.key] = 'Must be > 0';
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function getPositionStatus(position) {
  if (position.status === 'submitting') return 'submitting';
  if (position.status === 'added') return 'added';
  if (position.status === 'error') return 'error';

  const validation = validatePosition(position, position.assetType);
  return validation.valid ? 'ready' : 'draft';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AddPositionsModalV2({ isOpen, onClose, onSuccess, seedPositions }) {
  const [state, dispatch] = useReducer(positionsReducer, initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('type'); // 'type' or 'account'
  const [activeSearch, setActiveSearch] = useState(null); // {positionId, field}
  const [searchDropdownPos, setSearchDropdownPos] = useState(null);
  const saveTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const priceHydrationRef = useRef(null);

  // Load accounts on mount
  useEffect(() => {
    if (!isOpen) return;

    async function loadAccounts() {
      try {
        const accounts = await fetchAllAccounts();
        dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    }

    loadAccounts();
  }, [isOpen]);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (!isOpen || !state.isDirty) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('positions_draft_v2', JSON.stringify(state.positions));
        console.log('💾 Draft auto-saved');
      } catch (e) {
        console.error('Failed to save draft:', e);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isOpen, state.positions, state.isDirty]);

  // Restore draft on open
  useEffect(() => {
    if (!isOpen) return;

    try {
      const saved = localStorage.getItem('positions_draft_v2');
      if (saved) {
        const positions = JSON.parse(saved);
        if (positions.length > 0) {
          dispatch({ type: 'BULK_IMPORT', payload: positions });
        }
      }
    } catch (e) {
      console.error('Failed to restore draft:', e);
    }
  }, [isOpen]);

  // Ticker/Symbol search with debouncing
  const handleSearch = useCallback(async (positionId, field, query) => {
    if (!query || query.length < 1) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: { key: positionId, results: [] } });
      return;
    }

    const searchKey = positionId;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set searching state
    dispatch({ type: 'SET_SEARCHING', payload: { key: searchKey, value: true } });

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchSecurities(query);

        // Filter based on position type
        const position = state.positions.find(p => p.id === positionId);
        let filteredResults = results || [];

        if (position?.assetType === 'security') {
          filteredResults = filteredResults.filter(r =>
            r.asset_type === 'security' || r.asset_type === 'index'
          );
        } else if (position?.assetType === 'crypto') {
          filteredResults = filteredResults.filter(r => r.asset_type === 'crypto');
        }

        dispatch({ type: 'SET_SEARCH_RESULTS', payload: { key: searchKey, results: filteredResults } });
      } catch (error) {
        console.error('Search error:', error);
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: { key: searchKey, results: [] } });
      } finally {
        dispatch({ type: 'SET_SEARCHING', payload: { key: searchKey, value: false } });
      }
    }, 300);
  }, [state.positions]);

  // Select search result
  const selectSearchResult = useCallback((positionId, result) => {
    const position = state.positions.find(p => p.id === positionId);
    if (!position) return;

    const updates = {};

    if (position.assetType === 'security') {
      updates.ticker = result.ticker || result.symbol;
      updates.name = result.name;
      updates.price = result.price;
    } else if (position.assetType === 'crypto') {
      updates.symbol = result.symbol;
      updates.name = result.name;
      updates.current_price = result.price;
    }

    dispatch({
      type: 'UPDATE_POSITION',
      payload: { id: positionId, data: updates }
    });

    // Clear search
    setActiveSearch(null);
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: { key: positionId, results: [] } });
  }, [state.positions]);

  // Price hydration for positions with tickers but no prices
  useEffect(() => {
    if (!isOpen || state.positions.length === 0) return;

    // Clear previous timeout
    if (priceHydrationRef.current) {
      clearTimeout(priceHydrationRef.current);
    }

    priceHydrationRef.current = setTimeout(async () => {
      const needsHydration = state.positions.filter(pos => {
        if (pos.status === 'added' || pos.status === 'submitting') return false;

        if (pos.assetType === 'security') {
          return pos.data.ticker && !pos.data.price;
        } else if (pos.assetType === 'crypto') {
          return pos.data.symbol && !pos.data.current_price;
        }

        return false;
      });

      if (needsHydration.length === 0) return;

      console.log(`💧 Hydrating ${needsHydration.length} positions...`);

      for (const pos of needsHydration) {
        try {
          const query = pos.assetType === 'security' ? pos.data.ticker : pos.data.symbol;
          const results = await searchSecurities(query);

          let filteredResults = results || [];
          if (pos.assetType === 'security') {
            filteredResults = filteredResults.filter(r =>
              r.asset_type === 'security' || r.asset_type === 'index'
            );
          } else if (pos.assetType === 'crypto') {
            filteredResults = filteredResults.filter(r => r.asset_type === 'crypto');
          }

          const match = filteredResults.find(r =>
            (r.ticker || r.symbol)?.toLowerCase() === query.toLowerCase()
          );

          if (match) {
            const updates = {};
            if (pos.assetType === 'security') {
              updates.price = match.price;
              updates.name = match.name;
            } else if (pos.assetType === 'crypto') {
              updates.current_price = match.price;
              updates.name = match.name;
            }

            dispatch({
              type: 'UPDATE_POSITION',
              payload: { id: pos.id, data: updates }
            });
          }
        } catch (error) {
          console.error(`Failed to hydrate ${pos.id}:`, error);
        }
      }
    }, 2000);

    return () => {
      if (priceHydrationRef.current) {
        clearTimeout(priceHydrationRef.current);
      }
    };
  }, [isOpen, state.positions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Ctrl+K: Toggle help
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_KEYBOARD_SHORTCUTS' });
      }

      // Escape: Close modals/help
      if (e.key === 'Escape') {
        if (state.showHelp) dispatch({ type: 'TOGGLE_HELP' });
        else if (state.showKeyboardShortcuts) dispatch({ type: 'TOGGLE_KEYBOARD_SHORTCUTS' });
        else if (state.showQueue) dispatch({ type: 'TOGGLE_QUEUE' });
      }

      // Ctrl+H: Toggle help panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_HELP' });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state.showHelp, state.showKeyboardShortcuts, state.showQueue]);

  // Download Excel template
  const downloadTemplate = useCallback(() => {
    const headers = ['asset_type', 'ticker', 'symbol', 'shares', 'quantity', 'price', 'current_price', 'purchase_price', 'cost_basis', 'purchase_date', 'account_name', 'cash_type', 'amount', 'metal_type', 'asset_name', 'current_value'];
    const sampleRows = [
      ['security', 'AAPL', '', '10', '', '180.50', '', '', '175.00', '2024-01-15', 'My Brokerage', '', '', '', '', ''],
      ['crypto', '', 'BTC', '', '0.5', '', '65000', '', '60000', '2024-02-01', 'Coinbase', '', '', '', '', ''],
      ['cash', '', '', '', '', '', '', '', '', '', 'Chase Checking', 'Checking', '5000', '', '', ''],
      ['metal', '', '', '', '10', '', '', '2400', '', '2024-03-01', 'Gold Vault', '', '', 'Gold', '', ''],
      ['other', '', '', '', '', '', '', '', '', '', '', '', '', '', 'My House', '500000']
    ];

    const csv = [headers.join(','), ...sampleRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nestegg-positions-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Clear all with confirmation
  const handleClearAll = useCallback(() => {
    if (state.positions.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to clear all ${state.positions.length} position(s)?\n\nThis will delete your draft but won't affect saved positions.`
    );

    if (confirmed) {
      dispatch({ type: 'CLEAR_ALL' });
      localStorage.removeItem('positions_draft_v2');
    }
  }, [state.positions.length]);

  // Add new position
  const addPosition = useCallback((assetType) => {
    const newPosition = {
      id: `${Date.now()}-${Math.random()}`,
      assetType,
      data: {
        purchase_date: new Date().toISOString().split('T')[0]
      },
      status: 'draft'
    };

    dispatch({ type: 'ADD_POSITION', payload: newPosition });
    dispatch({ type: 'TOGGLE_EXPANDED', payload: assetType });
  }, []);

  // Update position field
  const updatePosition = useCallback((id, field, value) => {
    dispatch({
      type: 'UPDATE_POSITION',
      payload: { id, data: { [field]: value } }
    });
  }, []);

  // Delete position
  const deletePosition = useCallback((id) => {
    dispatch({ type: 'DELETE_POSITION', payload: id });
  }, []);

  // Submit positions
  const submitPositions = useCallback(async (mode = 'ready') => {
    const toSubmit = mode === 'all'
      ? state.positions
      : state.positions.filter(p => getPositionStatus(p) === 'ready');

    if (toSubmit.length === 0) {
      alert('No positions to submit');
      return;
    }

    setIsSubmitting(true);

    // Group by asset type
    const grouped = toSubmit.reduce((acc, pos) => {
      if (!acc[pos.assetType]) acc[pos.assetType] = [];
      acc[pos.assetType].push(pos);
      return acc;
    }, {});

    let successCount = 0;
    let errorCount = 0;

    // Submit each group
    for (const [assetType, positions] of Object.entries(grouped)) {
      // Group by account for bulk API
      const byAccount = positions.reduce((acc, pos) => {
        const accountId = pos.data.account_id || 'none';
        if (!acc[accountId]) acc[accountId] = [];
        acc[accountId].push(pos);
        return acc;
      }, {});

      for (const [accountId, accountPositions] of Object.entries(byAccount)) {
        try {
          dispatch({
            type: 'UPDATE_STATUS',
            payload: { id: accountPositions[0].id, status: 'submitting' }
          });

          const payload = accountPositions.map(p => p.data);

          // Call appropriate bulk API
          if (assetType === 'security') {
            await addSecurityPositionBulk(payload);
          } else if (assetType === 'cash') {
            await addCashPositionBulk(payload);
          } else if (assetType === 'crypto') {
            await addCryptoPositionBulk(payload);
          } else if (assetType === 'metal') {
            await addMetalPositionBulk(payload);
          } else if (assetType === 'other') {
            await addOtherAssetBulk(payload);
          }

          // Mark as added
          for (const pos of accountPositions) {
            dispatch({
              type: 'UPDATE_STATUS',
              payload: { id: pos.id, status: 'added' }
            });
            successCount++;
          }
        } catch (error) {
          console.error('Submission error:', error);
          for (const pos of accountPositions) {
            dispatch({
              type: 'UPDATE_STATUS',
              payload: { id: pos.id, status: 'error', error: error.message }
            });
            errorCount++;
          }
        }
      }
    }

    setIsSubmitting(false);

    if (successCount > 0) {
      alert(`✅ ${successCount} position(s) added successfully!${errorCount > 0 ? `\n❌ ${errorCount} failed` : ''}`);
      if (onSuccess) onSuccess(successCount);
      if (errorCount === 0) {
        dispatch({ type: 'CLEAR_ALL' });
        localStorage.removeItem('positions_draft_v2');
        onClose();
      }
    } else {
      alert(`❌ All submissions failed. Check console for details.`);
    }
  }, [state.positions, onSuccess, onClose]);

  // Stats
  const stats = useMemo(() => {
    const byType = {};
    const byStatus = { draft: 0, ready: 0, submitting: 0, added: 0, error: 0 };
    let totalValue = 0;

    state.positions.forEach(pos => {
      const status = getPositionStatus(pos);
      byStatus[status]++;

      if (!byType[pos.assetType]) {
        byType[pos.assetType] = { count: 0, value: 0 };
      }
      byType[pos.assetType].count++;

      // Calculate value
      if (pos.assetType === 'security') {
        const val = (pos.data.shares || 0) * (pos.data.price || 0);
        byType[pos.assetType].value += val;
        totalValue += val;
      } else if (pos.assetType === 'cash') {
        const val = pos.data.amount || 0;
        byType[pos.assetType].value += val;
        totalValue += val;
      } else if (pos.assetType === 'crypto') {
        const val = (pos.data.quantity || 0) * (pos.data.current_price || 0);
        byType[pos.assetType].value += val;
        totalValue += val;
      } else if (pos.assetType === 'metal') {
        const val = (pos.data.quantity || 0) * (pos.data.current_price_per_unit || 0);
        byType[pos.assetType].value += val;
        totalValue += val;
      } else if (pos.assetType === 'other') {
        const val = pos.data.current_value || 0;
        byType[pos.assetType].value += val;
        totalValue += val;
      }
    });

    return {
      total: state.positions.length,
      byType,
      byStatus,
      totalValue
    };
  }, [state.positions]);

  // Render position row
  const renderPositionRow = useCallback((position) => {
    const config = ASSET_TYPES[position.assetType];
    const status = getPositionStatus(position);
    const isSelected = state.selectedIds.has(position.id);

    return (
      <tr key={position.id} className="border-b border-gray-700 hover:bg-gray-800/50">
        {/* Checkbox */}
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => dispatch({ type: 'TOGGLE_SELECT', payload: position.id })}
            className="rounded border-gray-600 bg-gray-800 text-blue-600"
          />
        </td>

        {/* Type */}
        <td className="px-3 py-2">
          <span className="text-xs text-gray-400">{config.name}</span>
        </td>

        {/* Fields */}
        {config.fields.map(field => {
          const value = position.data[field.key] || '';
          const isSearchable = field.searchable && (field.key === 'ticker' || field.key === 'symbol');

          if (field.type === 'select') {
            if (field.key === 'account_id') {
              return (
                <td key={field.key} className="px-3 py-2">
                  <select
                    value={value}
                    onChange={(e) => updatePosition(position.id, field.key, parseInt(e.target.value))}
                    className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white [&>option]:bg-gray-800 [&>option]:text-white"
                  >
                    <option value="">Select...</option>
                    {state.accounts.map(acc => (
                      <option key={acc.id} value={acc.id} className="bg-gray-800 text-white">
                        {acc.account_name}
                      </option>
                    ))}
                  </select>
                </td>
              );
            } else {
              return (
                <td key={field.key} className="px-3 py-2">
                  <select
                    value={value}
                    onChange={(e) => updatePosition(position.id, field.key, e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white [&>option]:bg-gray-800 [&>option]:text-white"
                  >
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
              );
            }
          } else if (field.type === 'number') {
            return (
              <td key={field.key} className="px-3 py-2">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => updatePosition(position.id, field.key, e.target.value)}
                  readOnly={field.readOnly}
                  className={`w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white ${field.readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                  step="any"
                />
              </td>
            );
          } else if (field.type === 'date') {
            return (
              <td key={field.key} className="px-3 py-2">
                <input
                  type="date"
                  value={value}
                  onChange={(e) => updatePosition(position.id, field.key, e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white"
                />
              </td>
            );
          } else {
            // Text field with optional search
            return (
              <td key={field.key} className="px-3 py-2 relative">
                <div className="relative">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      updatePosition(position.id, field.key, e.target.value);
                      if (isSearchable) {
                        handleSearch(position.id, field.key, e.target.value);
                        setActiveSearch({ positionId: position.id, field: field.key });
                      }
                    }}
                    onFocus={() => {
                      if (isSearchable && value) {
                        setActiveSearch({ positionId: position.id, field: field.key });
                      }
                    }}
                    readOnly={field.readOnly}
                    className={`w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white ${field.readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                    placeholder={isSearchable ? 'Type to search...' : ''}
                  />
                  {isSearchable && state.isSearching[position.id] && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    </div>
                  )}
                </div>
                {/* Search results dropdown */}
                {isSearchable && activeSearch?.positionId === position.id && state.searchResults[position.id]?.length > 0 && (
                  <div className="absolute z-50 mt-1 w-80 max-h-60 overflow-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl">
                    {state.searchResults[position.id].slice(0, 10).map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectSearchResult(position.id, result)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-800 border-b border-gray-800 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-white">
                              {result.ticker || result.symbol}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {result.name}
                            </div>
                          </div>
                          <div className="text-sm text-emerald-400">
                            {formatCurrency(result.price)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </td>
            );
          }
        })}

        {/* Status */}
        <td className="px-3 py-2">
          <StatusBadge status={status} />
        </td>

        {/* Actions */}
        <td className="px-3 py-2">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => dispatch({ type: 'DUPLICATE_POSITION', payload: position.id })}
              className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => deletePosition(position.id)}
              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }, [state.accounts, state.selectedIds, updatePosition, deletePosition]);

  // Filter and group positions
  const filteredPositionsByType = useMemo(() => {
    let filtered = state.positions;

    // Apply search filter
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      filtered = filtered.filter(pos => {
        const searchFields = [
          pos.data.ticker,
          pos.data.symbol,
          pos.data.name,
          pos.data.asset_name,
          pos.data.metal_type,
          pos.data.cash_type,
          ASSET_TYPES[pos.assetType]?.name
        ].filter(Boolean).map(f => String(f).toLowerCase());

        return searchFields.some(field => field.includes(term));
      });
    }

    // Group by type
    return filtered.reduce((acc, pos) => {
      if (!acc[pos.assetType]) acc[pos.assetType] = [];
      acc[pos.assetType].push(pos);
      return acc;
    }, {});
  }, [state.positions, state.searchTerm]);

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Positions"
      size="max-w-[1800px]"
    >
      <div className="h-[85vh] flex flex-col">
        {/* Header */}
        <div className="space-y-3 mb-4 pb-4 border-b border-gray-700">
          {/* Top row: Stats and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-400">Total:</span>
                <span className="ml-2 font-bold text-white">{stats.total}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Ready:</span>
                <span className="ml-2 font-bold text-emerald-400">{stats.byStatus.ready}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Draft:</span>
                <span className="ml-2 font-bold text-amber-400">{stats.byStatus.draft}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">Value:</span>
                <span className="ml-2 font-bold text-white">{formatCurrency(stats.totalValue)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_HELP' })}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                title="Help (Ctrl+H)"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              <button
                onClick={() => dispatch({ type: 'TOGGLE_KEYBOARD_SHORTCUTS' })}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                title="Keyboard Shortcuts (Ctrl+K)"
              >
                <Keyboard className="w-5 h-5" />
              </button>

              <button
                onClick={downloadTemplate}
                className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center space-x-1"
                title="Download Excel Template"
              >
                <Download className="w-4 h-4" />
                <span>Template</span>
              </button>

              <button
                onClick={() => dispatch({ type: 'SHOW_IMPORT_MODAL' })}
                className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center space-x-1"
                title="Import from Excel/CSV"
              >
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </button>

              {stats.byStatus.added > 0 && (
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_QUEUE' })}
                  className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center space-x-1"
                  title="View Added Positions"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>View {stats.byStatus.added} Added</span>
                </button>
              )}

              <button
                onClick={handleClearAll}
                disabled={stats.total === 0}
                className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                title="Clear All"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>

              {state.selectedIds.size > 0 && (
                <button
                  onClick={() => dispatch({ type: 'DELETE_SELECTED', payload: Array.from(state.selectedIds) })}
                  className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded hover:bg-rose-700 flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete {state.selectedIds.size}</span>
                </button>
              )}

              <button
                onClick={() => submitPositions('ready')}
                disabled={isSubmitting || stats.byStatus.ready === 0}
                className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Submit Ready ({stats.byStatus.ready})</span>
              </button>

              <button
                onClick={() => submitPositions('all')}
                disabled={isSubmitting || stats.total === 0}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Submit All</span>
              </button>
            </div>
          </div>

          {/* Bottom row: Search */}
          {stats.total > 0 && (
            <div className="flex items-center space-x-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search positions by ticker, symbol, name..."
                  value={state.searchTerm}
                  onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Help Panel */}
          {state.showHelp && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 animate-in slide-in-from-top duration-300">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-300 mb-1.5">📘 How to Use Quick Position Entry</p>
                  <div className="space-y-1 text-[10px] text-blue-400/90">
                    <div className="flex items-start space-x-1.5">
                      <span className="text-blue-300 font-medium mt-0.5">1.</span>
                      <span>Click an asset type button (Securities, Cash, Crypto, etc.) to add positions</span>
                    </div>
                    <div className="flex items-start space-x-1.5">
                      <span className="text-blue-300 font-medium mt-0.5">2.</span>
                      <span>Fill required fields - status changes from <span className="text-amber-400">Draft</span> → <span className="text-emerald-400">Ready</span> when complete</span>
                    </div>
                    <div className="flex items-start space-x-1.5">
                      <span className="text-blue-300 font-medium mt-0.5">3.</span>
                      <span>Type ticker/symbol and select from dropdown to auto-fill name and price</span>
                    </div>
                    <div className="flex items-start space-x-1.5">
                      <span className="text-blue-300 font-medium mt-0.5">4.</span>
                      <span>Use "Download Template" → fill Excel → "Import" for bulk entry</span>
                    </div>
                    <div className="flex items-start space-x-1.5">
                      <span className="text-blue-300 font-medium mt-0.5">5.</span>
                      <span>Submit ready positions or submit all at once</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_HELP' })}
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-blue-400" />
                </button>
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Panel */}
          {state.showKeyboardShortcuts && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 animate-in slide-in-from-top duration-300">
              <div className="flex items-start space-x-2">
                <Keyboard className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-300 mb-1.5">⌨️ Keyboard Shortcuts</p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-blue-400">
                    <div><kbd className="px-1 py-0.5 bg-gray-900 rounded text-blue-300 font-mono text-[9px]">Ctrl+K</kbd> Toggle shortcuts</div>
                    <div><kbd className="px-1 py-0.5 bg-gray-900 rounded text-blue-300 font-mono text-[9px]">Ctrl+H</kbd> Toggle help</div>
                    <div><kbd className="px-1 py-0.5 bg-gray-900 rounded text-blue-300 font-mono text-[9px]">Esc</kbd> Close panels</div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_KEYBOARD_SHORTCUTS' })}
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-blue-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(ASSET_TYPES).map(([key, config]) => {
            const Icon = config.icon;
            const count = stats.byType[key]?.count || 0;
            const isExpanded = state.expandedTypes[key];
            const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

            return (
              <div key={key} className="flex items-center gap-1">
                <button
                  onClick={() => addPosition(key)}
                  className={`px-3 py-2 rounded-lg border-2 flex items-center space-x-2 transition-all hover:scale-105 ${
                    count > 0
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{config.name}</span>
                  {count > 0 && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                      {count}
                    </span>
                  )}
                  <Plus className="w-3 h-3" />
                </button>

                {count > 0 && (
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_EXPANDED', payload: key })}
                    className="p-2 rounded-lg bg-gray-800 border-2 border-gray-600 text-gray-300 hover:border-gray-500 transition-all"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Positions table */}
        <div className="flex-1 overflow-auto space-y-4">
          {state.positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Plus className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">No positions yet</p>
              <p className="text-sm">Click a button above to add positions</p>
            </div>
          ) : (
            <>
              {Object.entries(ASSET_TYPES).map(([assetType, config]) => {
                const typePositions = filteredPositionsByType[assetType] || [];
                if (typePositions.length === 0) return null;

                const Icon = config.icon;
                const isExpanded = state.expandedTypes[assetType];

                return (
                  <div key={assetType} className="bg-gray-900 rounded-lg border border-gray-700">
                    {/* Section Header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50"
                      onClick={() => dispatch({ type: 'TOGGLE_EXPANDED', payload: assetType })}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 text-blue-400" />
                        <h3 className="font-semibold text-white">{config.name}</h3>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold">
                          {typePositions.length}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>

                    {/* Section Content */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-800">
                            <tr>
                              <th className="px-3 py-2 text-left">
                                <input
                                  type="checkbox"
                                  checked={typePositions.every(p => state.selectedIds.has(p.id))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      typePositions.forEach(p => {
                                        if (!state.selectedIds.has(p.id)) {
                                          dispatch({ type: 'TOGGLE_SELECT', payload: p.id });
                                        }
                                      });
                                    } else {
                                      typePositions.forEach(p => {
                                        if (state.selectedIds.has(p.id)) {
                                          dispatch({ type: 'TOGGLE_SELECT', payload: p.id });
                                        }
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-600 bg-gray-800 text-blue-600"
                                />
                              </th>
                              <th className="px-3 py-2 text-left text-xs text-gray-400">Type</th>
                              {config.fields.map(field => (
                                <th key={field.key} className="px-3 py-2 text-left text-xs text-gray-400">
                                  {field.label}
                                  {field.required && <span className="text-rose-400 ml-0.5">*</span>}
                                </th>
                              ))}
                              <th className="px-3 py-2 text-left text-xs text-gray-400">Status</th>
                              <th className="px-3 py-2 text-left text-xs text-gray-400">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {typePositions.map(renderPositionRow)}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* No results message when search is active */}
              {state.searchTerm && Object.keys(filteredPositionsByType).length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Search className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">No positions found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Queue Modal - View added positions */}
      {state.showQueue && (
        <QueueModal
          isOpen={state.showQueue}
          onClose={() => dispatch({ type: 'TOGGLE_QUEUE' })}
          positions={state.positions.filter(p => p.status === 'added')}
          accounts={state.accounts}
        />
      )}

      {/* Import Modal */}
      {state.showImportModal && (
        <ImportModal
          isOpen={state.showImportModal}
          onClose={() => dispatch({ type: 'HIDE_IMPORT_MODAL' })}
          onImport={(positions) => {
            dispatch({ type: 'BULK_IMPORT', payload: positions });
            dispatch({ type: 'HIDE_IMPORT_MODAL' });
          }}
          accounts={state.accounts}
        />
      )}
    </FixedModal>
  );
}

// Status badge component
function StatusBadge({ status }) {
  const config = {
    draft: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Draft' },
    ready: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Ready' },
    submitting: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'Submitting...' },
    added: { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', label: 'Added' },
    error: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', label: 'Error' }
  };

  const { color, label} = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${color}`}>
      {label}
    </span>
  );
}

// Queue Modal - View successfully added positions
function QueueModal({ isOpen, onClose, positions, accounts }) {
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Successfully Added Positions"
      size="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {positions.length} position(s) have been added to your portfolio
          </p>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No positions added yet</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-auto border border-gray-700 rounded">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-400">Type</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400">Ticker/Symbol</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400">Shares/Qty</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400">Price</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400">Account</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="px-3 py-2 text-gray-400">{ASSET_TYPES[pos.assetType]?.name}</td>
                    <td className="px-3 py-2 text-white">
                      {pos.data.ticker || pos.data.symbol || pos.data.asset_name || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {pos.data.shares || pos.data.quantity || pos.data.amount || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {pos.data.price || pos.data.current_price || pos.data.purchase_price || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {accounts.find(a => a.id === pos.data.account_id)?.account_name || 'N/A'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={pos.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </FixedModal>
  );
}

// Import Modal Component
function ImportModal({ isOpen, onClose, onImport, accounts }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [accountMapping, setAccountMapping] = useState({});
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        alert('No data found in file');
        setParsing(false);
        return;
      }

      // Parse rows into positions
      const parsed = parseRowsToPositions(rows, accounts);
      setPreview(parsed);
    } catch (error) {
      console.error('Parse error:', error);
      alert('Failed to parse file: ' + error.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;

    // Apply account mapping
    const positions = preview.positions.map(pos => {
      const mapping = accountMapping[pos.id];
      if (mapping) {
        return {
          ...pos,
          data: { ...pos.data, account_id: mapping }
        };
      }
      return pos;
    });

    onImport(positions);
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Positions from CSV/Excel"
      size="max-w-4xl"
    >
      <div className="space-y-4">
        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-500 mb-3" />
            <p className="text-sm text-gray-400 mb-2">
              Upload a CSV or Excel file with your positions
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Choose File
            </button>
            {file && (
              <p className="text-sm text-gray-400 mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>

        {/* Preview */}
        {parsing && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-gray-400">Parsing file...</span>
          </div>
        )}

        {preview && !parsing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Preview ({preview.positions.length} positions found)
              </h3>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Import All</span>
              </button>
            </div>

            {/* Warnings */}
            {preview.unmappedAccounts.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-400">
                      Account Mapping Required
                    </p>
                    <p className="text-xs text-amber-300 mt-1">
                      Some accounts could not be automatically matched. Please map them below:
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Mapping */}
            {preview.unmappedAccounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-300">Map Accounts:</h4>
                {preview.unmappedAccounts.map((unmapped) => (
                  <div key={unmapped.original} className="flex items-center space-x-3 bg-gray-800 p-3 rounded">
                    <span className="text-sm text-gray-400 flex-1">
                      "{unmapped.original}"
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                    <select
                      value={accountMapping[unmapped.original] || ''}
                      onChange={(e) => setAccountMapping(prev => ({
                        ...prev,
                        [unmapped.original]: parseInt(e.target.value)
                      }))}
                      className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-white text-sm [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="">Select account...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-gray-800 text-white">
                          {acc.account_name} ({acc.institution || 'Unknown'})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Preview Table */}
            <div className="max-h-96 overflow-auto border border-gray-700 rounded">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Type</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Ticker/Symbol</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Shares/Qty</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Price</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-400">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.positions.map((pos, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="px-3 py-2 text-gray-400">{ASSET_TYPES[pos.assetType]?.name}</td>
                      <td className="px-3 py-2 text-white">
                        {pos.data.ticker || pos.data.symbol || pos.data.asset_name || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {pos.data.shares || pos.data.quantity || pos.data.amount || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {pos.data.price || pos.data.current_price || pos.data.purchase_price || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {accounts.find(a => a.id === pos.data.account_id)?.account_name || 'Unmapped'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800 rounded p-3 text-xs text-gray-400">
          <p className="font-semibold mb-1">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>First row should contain headers</li>
            <li>Required columns: ticker/symbol, shares/quantity, price, account_name</li>
            <li>Optional: purchase_date, cost_basis, asset_type</li>
            <li>Account names will be matched to your existing accounts</li>
          </ul>
        </div>
      </div>
    </FixedModal>
  );
}

// CSV Parser
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });

    rows.push(row);
  }

  return rows;
}

// Parse CSV rows to positions
function parseRowsToPositions(rows, accounts) {
  const positions = [];
  const unmappedAccounts = [];
  const accountCache = {};

  rows.forEach((row, idx) => {
    // Determine asset type
    let assetType = 'security'; // default
    if (row.asset_type) {
      assetType = row.asset_type.toLowerCase();
    } else if (row.crypto || row.cryptocurrency) {
      assetType = 'crypto';
    } else if (row.metal || row.metal_type) {
      assetType = 'metal';
    } else if (row.cash_type || row.cash) {
      assetType = 'cash';
    }

    // Find account
    let accountId = null;
    const accountName = row.account_name || row.account || '';

    if (accountName) {
      if (accountCache[accountName]) {
        accountId = accountCache[accountName];
      } else {
        const match = accounts.find(acc =>
          acc.account_name.toLowerCase() === accountName.toLowerCase() ||
          `${acc.account_name} ${acc.institution}`.toLowerCase().includes(accountName.toLowerCase())
        );

        if (match) {
          accountId = match.id;
          accountCache[accountName] = accountId;
        } else {
          if (!unmappedAccounts.find(u => u.original === accountName)) {
            unmappedAccounts.push({ original: accountName });
          }
        }
      }
    }

    // Build position data based on type
    const data = {
      account_id: accountId,
      purchase_date: row.purchase_date || row.date || new Date().toISOString().split('T')[0]
    };

    if (assetType === 'security') {
      data.ticker = row.ticker || row.symbol || '';
      data.shares = parseFloat(row.shares || row.quantity || 0);
      data.price = parseFloat(row.price || row.current_price || 0);
      data.cost_basis = parseFloat(row.cost_basis || row.price || 0);
    } else if (assetType === 'crypto') {
      data.symbol = row.symbol || row.ticker || '';
      data.quantity = parseFloat(row.quantity || row.shares || 0);
      data.current_price = parseFloat(row.price || row.current_price || 0);
      data.purchase_price = parseFloat(row.purchase_price || row.cost_basis || row.price || 0);
    } else if (assetType === 'cash') {
      data.cash_type = row.cash_type || 'Savings';
      data.amount = parseFloat(row.amount || row.quantity || 0);
    } else if (assetType === 'metal') {
      data.metal_type = row.metal_type || 'Gold';
      data.symbol = row.symbol || row.metal_type || 'GOLD';
      data.quantity = parseFloat(row.quantity || 0);
      data.purchase_price = parseFloat(row.purchase_price || row.price || 0);
      data.current_price_per_unit = parseFloat(row.current_price || row.price || 0);
    }

    positions.push({
      id: `import-${idx}`,
      assetType,
      data,
      status: 'draft'
    });
  });

  return { positions, unmappedAccounts };
}
