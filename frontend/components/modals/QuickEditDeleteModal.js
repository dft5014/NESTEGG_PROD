import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FixedModal from './FixedModal';
import { 
  fetchAllAccounts,
  updateAccount,
  deleteAccount 
} from '@/utils/apimethods/accountMethods';
import {
  fetchUnifiedPositions,
  updatePosition,
  deletePosition,
  searchSecurities,
  searchFXAssets
} from '@/utils/apimethods/positionMethods';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import debounce from 'lodash.debounce';
import {
  Edit3, Trash2, Search, Filter, X, Check, AlertCircle, 
  Building, BarChart3, Coins, DollarSign, Home, Gem,
  ChevronDown, ChevronRight, Eye, EyeOff, Save, Loader2,
  CheckSquare, Square, MinusSquare, AlertTriangle, Shield,
  RefreshCw, Download, Upload, FileText, Hash, Clock,
  TrendingUp, TrendingDown, Layers, Wallet, Info, Zap,
  Copy, ArrowUpDown, Calendar, Percent, Calculator,
  Activity, Database, GitBranch, Users, Settings,
  XCircle, CheckCircle, PlusCircle, MinusCircle,
  MoreVertical, Maximize2, Minimize2, Grid3x3,
  Table, List, BarChart2, PieChart, Target, Briefcase
} from 'lucide-react';

// Asset type configuration (shared with AddQuickPositionModal)
const ASSET_TYPES = {
  security: {
    name: 'Securities',
    icon: BarChart3,
    color: {
      main: 'blue',
      bg: 'bg-blue-600',
      lightBg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      hover: 'hover:bg-blue-100',
      gradient: 'from-blue-500 to-blue-600'
    },
    fields: ['ticker', 'name', 'shares', 'price', 'cost_basis', 'purchase_date']
  },
  crypto: {
    name: 'Crypto',
    icon: Coins,
    color: {
      main: 'orange',
      bg: 'bg-orange-600',
      lightBg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      hover: 'hover:bg-orange-100',
      gradient: 'from-orange-500 to-orange-600'
    },
    fields: ['symbol', 'quantity', 'purchase_price', 'current_price', 'purchase_date']
  },
  metal: {
    name: 'Metals',
    icon: Gem,
    color: {
      main: 'yellow',
      bg: 'bg-yellow-600',
      lightBg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      hover: 'hover:bg-yellow-100',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    fields: ['metal_type', 'quantity', 'unit', 'purchase_price', 'current_price_per_unit', 'purchase_date']
  },
  realestate: {
    name: 'Real Estate',
    icon: Home,
    color: {
      main: 'green',
      bg: 'bg-green-600',
      lightBg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      hover: 'hover:bg-green-100',
      gradient: 'from-green-500 to-green-600'
    },
    fields: ['property_name', 'property_type', 'address', 'purchase_price', 'estimated_value', 'purchase_date']
  },
  cash: {
    name: 'Cash',
    icon: DollarSign,
    color: {
      main: 'purple',
      bg: 'bg-purple-600',
      lightBg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      hover: 'hover:bg-purple-100',
      gradient: 'from-purple-500 to-purple-600'
    },
    fields: ['currency', 'amount', 'account_type', 'interest_rate']
  }
};

// Account categories
const ACCOUNT_CATEGORIES = [
  { id: "brokerage", name: "Brokerage", icon: Briefcase },
  { id: "retirement", name: "Retirement", icon: Building },
  { id: "cash", name: "Cash / Banking", icon: DollarSign },
  { id: "cryptocurrency", name: "Cryptocurrency", icon: Hash },
  { id: "metals", name: "Metals Storage", icon: Shield },
  { id: "real_estate", name: "Real Estate", icon: Home }
];

// Animated counter component
const AnimatedCounter = ({ value, duration = 500, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value || 0;
    
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOutQuart;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {prefix}{Math.floor(displayValue).toLocaleString()}{suffix}
    </span>
  );
};

// Selection state management hook
const useSelectionState = () => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  const toggleSelection = useCallback((id, index, withShift = false, items = []) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      
      if (withShift && lastSelectedIndex !== null && index !== undefined) {
        // Range selection
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        for (let i = start; i <= end; i++) {
          if (items[i]) {
            newSet.add(items[i].id);
          }
        }
      } else {
        // Single selection
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      }
      
      return newSet;
    });
    
    if (!withShift) {
      setLastSelectedIndex(index);
    }
  }, [lastSelectedIndex]);

  const selectAll = useCallback((items) => {
    setSelectedItems(new Set(items.map(item => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastSelectedIndex(null);
  }, []);

  return {
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected: useCallback((id) => selectedItems.has(id), [selectedItems])
  };
};

// Edit form component
const EditPositionForm = ({ position, assetType, onSave, onCancel, accounts }) => {
  const [formData, setFormData] = useState(position);
  const [errors, setErrors] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const config = ASSET_TYPES[assetType];

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    // Basic validation
    if (assetType === 'security' && !formData.shares) {
      newErrors.shares = 'Shares required';
    }
    if (assetType === 'crypto' && !formData.quantity) {
      newErrors.quantity = 'Quantity required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <config.icon className={`w-5 h-5 mr-2 ${config.color.text}`} />
          Edit {config.name} Position
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {config.fields.map(field => (
          <div key={field} className={field === 'address' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </label>
            <input
              type={field.includes('price') || field.includes('value') || field === 'shares' || field === 'quantity' ? 'number' : 
                   field.includes('date') ? 'date' : 'text'}
              value={formData[field] || ''}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-lg text-sm
                ${errors[field] 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
                transition-colors
              `}
            />
            {errors[field] && (
              <p className="mt-1 text-xs text-red-600">{errors[field]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
            ${config.color.bg} hover:opacity-90
          `}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

// Batch actions component
const BatchActions = ({ 
  selectedCount, 
  onDelete, 
  onExport, 
  onDuplicate,
  isDeleting 
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-y border-gray-200">
      <span className="text-sm font-medium text-gray-700">
        {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      <div className="flex items-center space-x-2 ml-4">
        <button
          onClick={onDuplicate}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center"
        >
          <Copy className="w-4 h-4 mr-1.5" />
          Duplicate
        </button>
        
        <button
          onClick={onExport}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Export
        </button>
        
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all flex items-center disabled:opacity-50"
        >
          {isDeleting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Main QuickEditDeleteModal component
const QuickEditDeleteModal = ({ isOpen, onClose }) => {
  // State management
  const [activeTab, setActiveTab] = useState('positions');
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set());
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [showValues, setShowValues] = useState(true);
  const [editingPosition, setEditingPosition] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Selection hooks
  const positionSelection = useSelectionState();
  const accountSelection = useSelectionState();

  // Refs
  const searchInputRef = useRef(null);
  const messageTimeoutRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsData, positionsData] = await Promise.all([
        fetchAllAccounts(),
        fetchUnifiedPositions()
      ]);
      
      setAccounts(accountsData);
      setPositions(positionsData);
      setFilteredPositions(positionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Message display
  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    
    if (duration > 0) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, duration);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...positions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pos => {
        const searchableFields = [
          pos.ticker, pos.symbol, pos.name, pos.property_name,
          pos.metal_type, pos.currency, pos.account_name
        ];
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
      });
    }

    // Asset type filter
    if (selectedAssetTypes.size > 0) {
      filtered = filtered.filter(pos => 
        selectedAssetTypes.has(pos.asset_type)
      );
    }

    // Account filter
    if (selectedAccounts.size > 0) {
      filtered = filtered.filter(pos => 
        selectedAccounts.has(pos.account_id)
      );
    }

    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle numeric sorting
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // String sorting
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredPositions(filtered);
  }, [positions, searchQuery, selectedAssetTypes, selectedAccounts, sortConfig]);

  // Calculate stats
  const stats = useMemo(() => {
    const selected = activeTab === 'positions' 
      ? filteredPositions.filter(pos => positionSelection.isSelected(pos.id))
      : accounts.filter(acc => accountSelection.isSelected(acc.id));

    const totalValue = selected.reduce((sum, item) => {
      if (activeTab === 'positions') {
        return sum + (item.value || item.total_value || 0);
      }
      return sum + (item.balance || 0);
    }, 0);

    const totalCost = selected.reduce((sum, item) => {
      if (activeTab === 'positions') {
        const cost = item.cost_basis 
          ? (item.shares || item.quantity || 1) * item.cost_basis
          : item.purchase_price || 0;
        return sum + cost;
      }
      return sum;
    }, 0);

    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    return {
      selected: selected.length,
      totalValue,
      totalCost,
      gainLoss,
      gainLossPercent
    };
  }, [filteredPositions, accounts, positionSelection, accountSelection, activeTab]);

  // Handle position editing
  const handleEditPosition = (position) => {
    setEditingPosition(position);
  };

  const handleSavePosition = async (updatedPosition) => {
    setPendingChanges(prev => [
      ...prev.filter(change => change.id !== updatedPosition.id),
      { type: 'update', entity: 'position', data: updatedPosition }
    ]);
    setEditingPosition(null);
    showMessage('info', 'Changes saved locally. Click "Apply Changes" to save.');
  };

  // Handle deletion
  const handleDeleteSelected = async () => {
    const selectedIds = activeTab === 'positions' 
      ? Array.from(positionSelection.selectedItems)
      : Array.from(accountSelection.selectedItems);

    if (selectedIds.length === 0) return;

    const confirmed = await new Promise(resolve => {
      const message = `Delete ${selectedIds.length} ${activeTab}? This action cannot be undone.`;
      if (window.confirm(message)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    if (!confirmed) return;

    selectedIds.forEach(id => {
      setPendingChanges(prev => [
        ...prev.filter(change => change.data.id !== id),
        { type: 'delete', entity: activeTab.slice(0, -1), id }
      ]);
    });

    // Update UI immediately
    if (activeTab === 'positions') {
      setPositions(prev => prev.filter(pos => !selectedIds.includes(pos.id)));
      positionSelection.clearSelection();
    } else {
      setAccounts(prev => prev.filter(acc => !selectedIds.includes(acc.id)));
      accountSelection.clearSelection();
    }

    showMessage('info', `${selectedIds.length} items marked for deletion. Click "Apply Changes" to confirm.`);
  };

  // Apply all pending changes
  const applyChanges = async () => {
    if (pendingChanges.length === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      for (const change of pendingChanges) {
        try {
          if (change.type === 'update') {
            if (change.entity === 'position') {
              await updatePosition(change.data.id, change.data, change.data.asset_type);
            } else {
              await updateAccount(change.data.id, change.data);
            }
          } else if (change.type === 'delete') {
            if (change.entity === 'position') {
              const position = positions.find(p => p.id === change.id);
              await deletePosition(change.id, position?.asset_type);
            } else {
              await deleteAccount(change.id);
            }
          }
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(error.message);
        }
      }

      if (errorCount === 0) {
        showMessage('success', `All ${successCount} changes applied successfully!`);
        setPendingChanges([]);
        await loadData(); // Reload fresh data
      } else {
        showMessage('warning', `${successCount} succeeded, ${errorCount} failed`);
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      showMessage('error', 'Failed to apply changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export selected items
  const handleExport = () => {
    const selected = activeTab === 'positions'
      ? filteredPositions.filter(pos => positionSelection.isSelected(pos.id))
      : accounts.filter(acc => accountSelection.isSelected(acc.id));

    if (selected.length === 0) return;

    const csv = convertToCSV(selected);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('success', `Exported ${selected.length} items`);
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in values
          const escaped = String(value || '').replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        }).join(',')
      )
    ].join('\n');
    
    return csv;
  };

  // Render position row
  const renderPositionRow = (position, index) => {
    const config = ASSET_TYPES[position.asset_type];
    if (!config) return null;

    const Icon = config.icon;
    const value = position.value || position.total_value || 0;
    const cost = position.cost_basis 
      ? (position.shares || position.quantity || 1) * position.cost_basis
      : position.purchase_price || 0;
    const gainLoss = value - cost;
    const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0;

    return (
      <tr 
        key={position.id}
        className={`
          border-b border-gray-100 transition-all duration-200
          ${positionSelection.isSelected(position.id) 
            ? 'bg-blue-50 hover:bg-blue-100' 
            : 'hover:bg-gray-50'
          }
        `}
      >
        <td className="w-12 px-4 py-3">
          <input
            type="checkbox"
            checked={positionSelection.isSelected(position.id)}
            onChange={(e) => positionSelection.toggleSelection(
              position.id, 
              index, 
              e.shiftKey, 
              filteredPositions
            )}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${config.color.lightBg}`}>
              <Icon className={`w-4 h-4 ${config.color.text}`} />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {position.ticker || position.symbol || position.property_name || 
                 position.metal_type || position.currency || 'Unknown'}
              </div>
              <div className="text-sm text-gray-500">{position.name || config.name}</div>
            </div>
          </div>
        </td>
        
        <td className="px-4 py-3 text-sm text-gray-900">
          {position.account_name}
        </td>
        
        <td className="px-4 py-3 text-sm text-gray-900 text-right">
          {position.shares || position.quantity || position.amount || '-'}
        </td>
        
        <td className="px-4 py-3 text-sm text-gray-900 text-right">
          {showValues ? formatCurrency(value) : '••••'}
        </td>
        
        <td className="px-4 py-3 text-sm text-right">
          <div className={`
            flex items-center justify-end space-x-1
            ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}
          `}>
            {gainLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{showValues ? formatCurrency(Math.abs(gainLoss)) : '••••'}</span>
            <span className="text-xs">({gainLossPercent.toFixed(1)}%)</span>
          </div>
        </td>
        
        <td className="px-4 py-3">
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => handleEditPosition(position)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Edit"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                positionSelection.toggleSelection(position.id);
                handleDeleteSelected();
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Render the modal content
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit & Delete Manager"
      size="max-w-7xl"
    >
      <div className="h-[85vh] flex flex-col bg-gray-50">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6">
              {/* Tab switcher */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-all
                    ${activeTab === 'positions' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <Layers className="w-4 h-4 inline mr-2" />
                  Positions
                </button>
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-all
                    ${activeTab === 'accounts' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <Wallet className="w-4 h-4 inline mr-2" />
                  Accounts
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>

              {/* View mode toggle */}
              <div className="flex items-center space-x-2 border-l pl-4">
                <button
                  onClick={() => setViewMode('table')}
                  className={`
                    p-2 rounded-lg transition-all
                    ${viewMode === 'table' 
                      ? 'bg-gray-900 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                  title="Table view"
                >
                  <Table className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`
                    p-2 rounded-lg transition-all
                    ${viewMode === 'grid' 
                      ? 'bg-gray-900 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                  title="Grid view"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>

              {/* Show/hide values */}
              <button
                onClick={() => setShowValues(!showValues)}
                className={`
                  p-2 rounded-lg transition-all
                  ${showValues 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
                title={showValues ? 'Hide values' : 'Show values'}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {pendingChanges.length > 0 && (
                <div className="flex items-center space-x-3 px-4 py-2 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    {pendingChanges.length} pending change{pendingChanges.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setPendingChanges([])}
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Discard
                  </button>
                  <button
                    onClick={applyChanges}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Applying...' : 'Apply Changes'}
                  </button>
                </div>
              )}

              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filters */}
          {activeTab === 'positions' && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Filter by:</span>
              
              {/* Asset type filters */}
              <div className="flex items-center space-x-2">
                {Object.entries(ASSET_TYPES).map(([key, config]) => {
                  const count = positions.filter(p => p.asset_type === key).length;
                  const isSelected = selectedAssetTypes.has(key);
                  
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const newSet = new Set(selectedAssetTypes);
                        if (isSelected) {
                          newSet.delete(key);
                        } else {
                          newSet.add(key);
                        }
                        setSelectedAssetTypes(newSet);
                      }}
                      className={`
                        inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium
                        transition-all duration-200
                        ${isSelected 
                          ? `${config.color.bg} text-white shadow-sm` 
                          : `${config.color.lightBg} ${config.color.text} hover:${config.color.hover}`
                        }
                      `}
                    >
                      <config.icon className="w-3.5 h-3.5 mr-1.5" />
                      {config.name}
                      {count > 0 && (
                        <span className={`
                          ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                          ${isSelected ? 'bg-white/20' : 'bg-gray-500/10'}
                        `}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Account filter dropdown */}
              <div className="relative">
                <button
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Building className="w-4 h-4 mr-2" />
                  {selectedAccounts.size === 0 
                    ? 'All Accounts' 
                    : `${selectedAccounts.size} Account${selectedAccounts.size !== 1 ? 's' : ''}`
                  }
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {stats.selected > 0 && (
          <div className="flex-shrink-0 px-6 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6 text-sm">
                <span className="font-medium text-blue-900">
                  {stats.selected} selected
                </span>
                <div className="flex items-center space-x-4 text-blue-700">
                  <span>
                    Total Value: {showValues ? formatCurrency(stats.totalValue) : '••••'}
                  </span>
                  {activeTab === 'positions' && (
                    <>
                      <span>•</span>
                      <span>
                        Cost: {showValues ? formatCurrency(stats.totalCost) : '••••'}
                      </span>
                      <span>•</span>
                      <span className={stats.gainLoss >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {stats.gainLoss >= 0 ? '+' : '-'}
                        {showValues ? formatCurrency(Math.abs(stats.gainLoss)) : '••••'}
                        ({stats.gainLossPercent.toFixed(1)}%)
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (activeTab === 'positions') {
                    positionSelection.clearSelection();
                  } else {
                    accountSelection.clearSelection();
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Batch actions */}
        <BatchActions
          selectedCount={activeTab === 'positions' ? positionSelection.selectedItems.size : accountSelection.selectedItems.size}
          onDelete={handleDeleteSelected}
          onExport={handleExport}
          onDuplicate={() => showMessage('info', 'Duplicate feature coming soon')}
          isDeleting={isSubmitting}
        />

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : editingPosition ? (
            <div className="p-6">
              <EditPositionForm
                position={editingPosition}
                assetType={editingPosition.asset_type}
                onSave={handleSavePosition}
                onCancel={() => setEditingPosition(null)}
                accounts={accounts}
              />
            </div>
          ) : (
            <>
              {activeTab === 'positions' && viewMode === 'table' && (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={positionSelection.selectedItems.size === filteredPositions.length && filteredPositions.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              positionSelection.selectAll(filteredPositions);
                            } else {
                              positionSelection.clearSelection();
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => setSortConfig({
                            key: 'ticker',
                            direction: sortConfig.key === 'ticker' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                          })}
                          className="flex items-center text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                        >
                          Asset
                          <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => setSortConfig({
                            key: 'account_name',
                            direction: sortConfig.key === 'account_name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                          })}
                          className="flex items-center text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                        >
                          Account
                          <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Quantity
                        </span>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSortConfig({
                            key: 'value',
                            direction: sortConfig.key === 'value' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                          })}
                          className="flex items-center justify-end text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                        >
                          Value
                          <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Gain/Loss
                        </span>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPositions.map((position, index) => 
                      renderPositionRow(position, index)
                    )}
                  </tbody>
                </table>
              )}

              {filteredPositions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64">
                  <Database className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No positions found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchQuery ? 'Try adjusting your search' : 'Start by adding some positions'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message display */}
        {message.text && (
          <div className={`
            absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg
            flex items-center space-x-3 animate-in slide-in-from-bottom duration-300
            ${message.type === 'error' 
              ? 'bg-red-600 text-white' 
              : message.type === 'warning'
                ? 'bg-amber-500 text-white'
                : message.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white'
            }
          `}>
            {message.type === 'error' ? <XCircle className="w-5 h-5" /> :
             message.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
             message.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
             <Info className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </FixedModal>
  );
};

// Export button component to use in your app
export const QuickEditDeleteButton = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center">
          <Edit3 className="w-5 h-5 mr-2 text-purple-400 group-hover:text-white transition-colors" />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">Edit & Delete</span>
        </div>
      </button>
      
      <QuickEditDeleteModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default QuickEditDeleteModal;