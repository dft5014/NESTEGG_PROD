import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FixedModal from './FixedModal';
import { updateAccount, deleteAccount } from '@/utils/apimethods/accountMethods';
import {
  fetchUnifiedPositions,
  updatePosition,
  deletePosition,
  updateOtherAsset,
  deleteOtherAsset,
  fetchLiabilities,
  updateLiability,
  deleteLiability,
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
  Table, List, BarChart2, PieChart, Target, Briefcase,
  ArrowLeft, FileSpreadsheet, Sparkles, Package,
  Building2, Award, Banknote, CreditCard, Landmark,
  FilterX, SlidersHorizontal, ToggleLeft, ToggleRight
} from 'lucide-react';


// Asset type configuration - Updated to include otherAssets
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
    fields: ['metal_type', 'quantity', 'purchase_price', 'current_price_per_unit', 'purchase_date']
  },
  otherAssets: {
    name: 'Other Assets',
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
    fields: ['asset_name', 'asset_type', 'cost', 'current_value', 'purchase_date', 'notes']
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


// Liability type configuration
const LIABILITY_TYPES = {
  credit_card: { label: 'Credit Card', icon: CreditCard },
  mortgage: { label: 'Mortgage', icon: Home },
  auto_loan: { label: 'Auto Loan', icon: Package },
  personal_loan: { label: 'Personal Loan', icon: Wallet },
  student_loan: { label: 'Student Loan', icon: FileText },
  home_equity: { label: 'Home Equity', icon: Building },
  other: { label: 'Other', icon: Banknote }
};

// Account categories
const ACCOUNT_CATEGORIES = [
  { id: "brokerage", name: "Brokerage", icon: Briefcase, color: 'blue' },
  { id: "retirement", name: "Retirement", icon: Building, color: 'indigo' },
  { id: "cash", name: "Cash / Banking", icon: DollarSign, color: 'green' },
  { id: "cryptocurrency", name: "Cryptocurrency", icon: Hash, color: 'orange' },
  { id: "metals", name: "Metals Storage", icon: Shield, color: 'yellow' },
  { id: "real_estate", name: "Real Estate", icon: Home, color: 'emerald' }
];

// Grouping options for data views
const GROUPING_OPTIONS = [
  { id: 'none', name: 'No Grouping', icon: List },
  { id: 'institution', name: 'By Institution', icon: Building2 },
  { id: 'account', name: 'By Account', icon: Wallet },
  { id: 'account_institution', name: 'By Account & Institution', icon: Grid3x3 },
  { id: 'asset_type', name: 'By Asset Type', icon: BarChart2 },
  { id: 'category', name: 'By Category', icon: PieChart }
];

const getDataStoreAccounts = () => {
    if (typeof window === 'undefined') return [];
    
    try {
        // Direct access to DataStore state
        const storeModule = require('@/store/DataStore');
        if (storeModule.DataStore && storeModule.DataStore.getState) {
            const state = storeModule.DataStore.getState();
            return state.accounts?.data || [];
        }
        return [];
    } catch (error) {
        console.error('Error accessing DataStore:', error);
        return [];
    }
};

const refreshDataStoreAccounts = async () => {
    if (typeof window === 'undefined') return;
    
    try {
        const { refreshAccounts } = await import('@/store/hooks/useAccounts');
        if (refreshAccounts) {
            await refreshAccounts();
        }
    } catch (error) {
        console.error('Error refreshing accounts:', error);
    }
};

// Enhanced dropdown component
const EnhancedDropdown = ({ 
  title, 
  options, 
  selectedOption, 
  onChange, 
  icon: DropdownIcon = SlidersHorizontal,
  width = 'w-56'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const selectedItem = options.find(item => item.id === selectedOption);
  const Icon = selectedItem?.icon || DropdownIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center px-4 py-2 bg-white rounded-lg shadow-sm
          transition-all duration-200 text-sm border
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-300 shadow-md' : 'border-gray-200 hover:border-gray-300'}
          transform hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        <Icon className={`w-4 h-4 mr-2 transition-transform duration-200 ${isOpen ? 'rotate-12' : ''}`} />
        <span className="font-medium whitespace-nowrap">{selectedItem?.name || title}</span>
        <ChevronDown className={`w-4 h-4 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute z-50 right-0 mt-2 ${width} bg-white border border-gray-200 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden`}>
          <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center space-x-2">
              <DropdownIcon className="w-4 h-4 text-gray-700" />
              <span className="text-sm font-semibold text-gray-800">{title}</span>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            {options.map(option => {
              const OptionIcon = option.icon;
              const isSelected = option.id === selectedOption;
              
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2.5 flex items-center justify-between rounded-lg
                    transition-all duration-200 text-sm group
                    ${isSelected 
                      ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center flex-1 mr-2">
                    <div className={`
                      w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center
                      transition-all duration-200 group-hover:scale-110
                      ${isSelected 
                        ? 'bg-blue-600 border-blue-600 shadow-sm' 
                        : 'border-gray-300 group-hover:border-gray-400'
                      }
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex items-center flex-1">
                      {OptionIcon && (
                        <OptionIcon className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      )}
                      <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                        {option.name}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced filter dropdown component
const FilterDropdown = ({ 
  title, 
  icon: Icon, 
  options, 
  selected, 
  onChange, 
  type = 'checkbox',
  showCounts = true,
  colorConfig = null 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCount = selected.size;
  const isAllSelected = selectedCount === 0 || selectedCount === options.length;
  
  const handleSelectAll = () => {
    onChange(new Set());
  };
  
  const handleSelectNone = () => {
    onChange(new Set(options.map(opt => opt.value)));
  };
  
  const handleToggleOption = (value) => {
    const newSet = new Set(selected);
    if (selectedCount === 0) {
      options.forEach(opt => newSet.add(opt.value));
      newSet.delete(value);
    } else {
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
    }
    onChange(newSet);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center px-4 py-2 bg-white rounded-lg shadow-sm
          transition-all duration-200 text-sm border
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-300 shadow-md' : ''}
          ${selectedCount > 0 && !isAllSelected 
            ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' 
            : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }
          transform hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        <Icon className={`w-4 h-4 mr-2 transition-transform duration-200 ${isOpen ? 'rotate-12' : ''}`} />
        <span className="font-medium">{title}</span>
        {selectedCount > 0 && !isAllSelected && (
          <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-bold animate-pulse">
            {selectedCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Icon className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-semibold text-gray-800">{title}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-all duration-200"
                >
                  All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 hover:bg-gray-100 rounded transition-all duration-200"
                >
                  None
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              {isAllSelected 
                ? `Showing all ${options.length} ${title.toLowerCase()}` 
                : `${options.length - selectedCount} of ${options.length} selected`
              }
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            {options.map(option => {
              const isSelected = selectedCount === 0 || !selected.has(option.value);
              const OptionIcon = option.icon;
              const color = colorConfig?.[option.value] || 'gray';
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleToggleOption(option.value)}
                  className={`
                    w-full px-3 py-2.5 flex items-center justify-between rounded-lg
                    transition-all duration-200 text-sm group
                    ${isSelected 
                      ? `bg-${color}-50 hover:bg-${color}-100 border border-${color}-200` 
                      : 'hover:bg-gray-50 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center flex-1 mr-2">
                    <div className={`
                      w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center
                      transition-all duration-200 group-hover:scale-110
                      ${isSelected 
                        ? `bg-${color}-600 border-${color}-600 shadow-sm` 
                        : 'border-gray-300 group-hover:border-gray-400'
                      }
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex items-center flex-1">
                      {OptionIcon && (
                        <OptionIcon className={`w-4 h-4 mr-2 ${isSelected ? `text-${color}-600` : 'text-gray-400'}`} />
                      )}
                      <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                        {option.label}
                      </span>
                    </div>
                  </div>
                  {showCounts && option.count !== undefined && (
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-bold
                      ${isSelected 
                        ? `bg-${color}-200 text-${color}-800` 
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      {option.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

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
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        for (let i = start; i <= end; i++) {
          if (items[i]) {
            newSet.add(items[i].id);
          }
        }
      } else {
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

// Dashboard stats card component
const StatsCard = ({ title, value, icon: Icon, color, trend = null, subtext = null }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow relative overflow-hidden group`}>
      <div className={`absolute top-0 left-0 w-full h-1 bg-${color}-500`}></div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1 flex items-center">
            {typeof value === 'number' ? (
              <AnimatedCounter value={value} />
            ) : value}
            
            {trend && (
              <span className={`ml-2 text-sm font-medium flex items-center ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-3 h-3 mr-1" />
                ) : null}
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </h3>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color}-100 group-hover:bg-${color}-200 transition-colors`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
      </div>
      <div className={`absolute bottom-0 right-0 w-16 h-16 bg-${color}-100 rounded-tl-full opacity-30 group-hover:opacity-60 transition-opacity`}></div>
    </div>
  );
};

// Progress bar component for asset type distribution
const AssetTypeDistribution = ({ assetCounts, totalCount }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Asset Distribution</h3>
        <div className="text-xs text-gray-500">{totalCount} total positions</div>
      </div>
      
      <div className="space-y-3">
        {Object.entries(ASSET_TYPES).map(([key, config]) => {
          const count = assetCounts[key] || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
          
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <config.icon className={`w-3.5 h-3.5 mr-1.5 ${config.color.text}`} />
                  <span className="font-medium text-gray-700">{config.name}</span>
                </div>
                <div className="text-gray-600 font-medium">{count} ({percentage.toFixed(1)}%)</div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${config.color.bg} transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Edit Account Form Component (enhanced)
const EditAccountForm = ({ account, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    account_name: account.name || '',
    institution: account.institution || '',
    type: account.type || '',
    account_category: account.category || '',
    balance: account.total_value || account.balance || 0
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [originalData] = useState({...formData}); // For tracking changes

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const isFieldModified = (field) => {
    return formData[field] !== originalData[field];
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.account_name) newErrors.account_name = 'Account name required';
    if (!formData.institution) newErrors.institution = 'Institution required';
    if (!formData.type) newErrors.type = 'Account type required';
    if (!formData.account_category) newErrors.account_category = 'Category required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    try {
      await onSave({ ...account, ...formData });
    } finally {
      setIsSaving(false);
    }
  };

  const category = ACCOUNT_CATEGORIES.find(c => c.id === formData.account_category);
  const Icon = category?.icon || Building;

  return (
    <div className="space-y-4 p-6 bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl bg-${category?.color || 'gray'}-100`}>
            <Icon className={`w-6 h-6 text-${category?.color || 'gray'}-600`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Account</h3>
            <p className="text-sm text-gray-500">Update account information</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name
          </label>
          <input
            type="text"
            value={formData.account_name}
            onChange={(e) => handleFieldChange('account_name', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${errors.account_name 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : isFieldModified('account_name')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              transition-colors
            `}
            placeholder="My Investment Account"
          />
          {errors.account_name && (
            <p className="mt-1 text-xs text-red-600">{errors.account_name}</p>
          )}
          {isFieldModified('account_name') && !errors.account_name && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Institution
          </label>
          <input
            type="text"
            value={formData.institution}
            onChange={(e) => handleFieldChange('institution', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${errors.institution 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : isFieldModified('institution')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              transition-colors
            `}
            placeholder="Fidelity, Vanguard, etc."
          />
          {errors.institution && (
            <p className="mt-1 text-xs text-red-600">{errors.institution}</p>
          )}
          {isFieldModified('institution') && !errors.institution && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <input
            type="text"
            value={formData.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${errors.type 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : isFieldModified('type')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              transition-colors
            `}
            placeholder="401k, IRA, Taxable, etc."
          />
          {errors.type && (
            <p className="mt-1 text-xs text-red-600">{errors.type}</p>
          )}
          {isFieldModified('type') && !errors.type && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={formData.account_category}
            onChange={(e) => handleFieldChange('account_category', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${errors.account_category 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : isFieldModified('account_category')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              transition-colors
            `}
          >
            <option value="">Select a category...</option>
            {ACCOUNT_CATEGORIES.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.account_category && (
            <p className="mt-1 text-xs text-red-600">{errors.account_category}</p>
          )}
          {isFieldModified('account_category') && !errors.account_category && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Starting Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => handleFieldChange('balance', parseFloat(e.target.value) || 0)}
              className={`
                w-full pl-8 pr-3 py-2 border rounded-lg text-sm
                ${isFieldModified('balance')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
                transition-colors
              `}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {isFieldModified('balance') && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>
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
          disabled={isSaving}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
            ${isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
};

// Edit position form component - Enhanced with better cost basis support
const EditPositionForm = ({ position, assetType, onSave, onCancel, accounts }) => {
  const mapPositionData = (pos) => {
    const baseData = {
      ...pos,
      purchase_date: pos.purchase_date ? pos.purchase_date.split('T')[0] : ''
    };

    switch (assetType) {
      case 'security':
        return {
          ...baseData,
          ticker: pos.identifier || '',
          name: pos.name || '',
          shares: pos.quantity || '',
          price: pos.current_price_per_unit || '',
          cost_basis: pos.cost_per_unit || ''
        };
      
      case 'crypto':
        return {
          ...baseData,
          symbol: pos.identifier || '',
          quantity: pos.quantity || '',
          purchase_price: pos.cost_per_unit || '',
          current_price: pos.current_price_per_unit || ''
        };
      
      case 'metal':
        return {
          ...baseData,
          metal_type: pos.identifier || pos.name || '',
          quantity: pos.quantity || '',
          purchase_price: pos.cost_per_unit || '',
          current_price_per_unit: pos.current_price_per_unit || ''
        };
      
      case 'otherAssets':
        return {
          ...baseData,
          asset_name: pos.identifier || pos.name || '',
          asset_type: pos.asset_type || 'other',
          cost: pos.total_cost_basis || 0,
          current_value: pos.current_value || 0,
          notes: pos.notes || ''
        };
      
      case 'cash':
        return {
          ...baseData,
          currency: pos.identifier || 'USD',
          amount: pos.quantity || pos.current_value || '',
          account_type: pos.account_type || '',
          interest_rate: pos.interest_rate || 0
        };
      
      default:
        return baseData;
    }
  };

  const [formData, setFormData] = useState(mapPositionData(position));
  const [originalData] = useState(mapPositionData(position));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const config = ASSET_TYPES[assetType];

  const getEditableFields = (type) => {
    switch (type) {
      case 'security':
        return ['shares', 'cost_basis', 'purchase_date'];
      case 'crypto':
        return ['quantity', 'purchase_price', 'purchase_date'];
      case 'metal':
        return ['quantity', 'purchase_price', 'purchase_date'];
      case 'otherAssets':
        return ['asset_name', 'asset_type', 'cost', 'current_value', 'purchase_date', 'notes'];
      case 'cash':
        return ['amount', 'interest_rate'];
      default:
        return [];
    }
  };

  const editableFields = getEditableFields(assetType);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const isFieldModified = (field) => {
    return formData[field] !== originalData[field];
  };

  const validate = () => {
    const newErrors = {};
    
    switch (assetType) {
      case 'security':
        if (!formData.shares) newErrors.shares = 'Shares required';
        break;
      case 'crypto':
        if (!formData.quantity) newErrors.quantity = 'Quantity required';
        break;
      case 'metal':
        if (!formData.quantity) newErrors.quantity = 'Quantity required';
        break;
      case 'otherAssets':
        if (!formData.asset_name) newErrors.asset_name = 'Asset name required';
        if (!formData.current_value) newErrors.current_value = 'Current value required';
        break;
      case 'cash':
        if (!formData.amount) newErrors.amount = 'Amount required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      setIsSaving(true);
      
      let updatedData = { ...position };

      switch (assetType) {
        case 'security':
          updatedData.quantity = parseFloat(formData.shares) || 0;
          updatedData.cost_per_unit = parseFloat(formData.cost_basis) || 0;
          updatedData.total_cost_basis = updatedData.quantity * updatedData.cost_per_unit;
          updatedData.purchase_date = formData.purchase_date;
          break;
        
        case 'crypto':
          updatedData.quantity = parseFloat(formData.quantity) || 0;
          updatedData.cost_per_unit = parseFloat(formData.purchase_price) || 0;
          updatedData.total_cost_basis = updatedData.quantity * updatedData.cost_per_unit;
          updatedData.purchase_date = formData.purchase_date;
          break;
        
        case 'metal':
          updatedData.quantity = parseFloat(formData.quantity) || 0;
          updatedData.cost_per_unit = parseFloat(formData.purchase_price) || 0;
          updatedData.total_cost_basis = updatedData.quantity * updatedData.cost_per_unit;
          updatedData.purchase_date = formData.purchase_date;
          break;
        
        case 'otherAssets':
          updatedData.identifier = formData.asset_name;
          updatedData.name = formData.asset_name;
          updatedData.asset_type = formData.asset_type;
          updatedData.total_cost_basis = parseFloat(formData.cost) || 0;
          updatedData.current_value = parseFloat(formData.current_value) || 0;
          updatedData.purchase_date = formData.purchase_date;
          updatedData.notes = formData.notes;
          break;
        
        case 'cash':
          updatedData.quantity = parseFloat(formData.amount) || 0;
          updatedData.current_value = parseFloat(formData.amount) || 0;
          updatedData.interest_rate = parseFloat(formData.interest_rate) || 0;
          break;
      }

      onSave(updatedData).finally(() => {
        setIsSaving(false);
      });
    }
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl ${config.color.lightBg}`}>
            <config.icon className={`w-6 h-6 ${config.color.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit {config.name} Position</h3>
            <p className="text-sm text-gray-500">Update position details</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.fields.map(field => {
          const isEditable = editableFields.includes(field);
          const isModified = isFieldModified(field);
          
          // Special handling for asset_type select in otherAssets
          if (assetType === 'otherAssets' && field === 'asset_type' && isEditable) {
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Type
                </label>
                <select
                  value={formData.asset_type}
                  onChange={(e) => handleFieldChange('asset_type', e.target.value)}
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${errors.asset_type 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : isModified
                        ? 'border-blue-400 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }
                  `}
                >
                  <option value="real_estate">Real Estate</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="collectible">Collectible</option>
                  <option value="jewelry">Jewelry</option>
                  <option value="art">Art</option>
                  <option value="equipment">Equipment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            );
          }
          
          return (
            <div key={field} className={field === 'notes' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                {!isEditable && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
              </label>
              <input
                type={field.includes('price') || field.includes('value') || field.includes('cost') || field === 'shares' || field === 'quantity' || field === 'amount' ? 'number' : 
                     field.includes('date') ? 'date' : 'text'}
                value={formData[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                disabled={!isEditable}
                className={`
                  w-full px-3 py-2 border rounded-lg text-sm transition-all
                  ${!isEditable 
                    ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
                    : errors[field]
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : isModified
                        ? 'border-blue-400 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }
                `}
                step={field.includes('price') || field.includes('value') ? '0.01' : '1'}
              />
              {errors[field] && (
                <p className="mt-1 text-xs text-red-600">{errors[field]}</p>
              )}
              {isModified && !errors[field] && (
                <p className="mt-1 text-xs text-blue-600">Modified</p>
              )}
            </div>
          );
        })}
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
          disabled={isSaving}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
            ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}
            ${config.color.bg}
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
};

// Edit Liability Form Component (enhanced)
const EditLiabilityForm = ({ liability, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: liability.name || '',
    liability_type: liability.liability_type || '',
    current_balance: liability.current_balance || 0,
    original_amount: liability.original_amount || 0,
    interest_rate: liability.interest_rate || 0,
    minimum_payment: liability.minimum_payment || 0,
    due_date: liability.due_date ? liability.due_date.split('T')[0] : '',
    notes: liability.notes || ''
  });
  const [originalData] = useState({...formData}); // For tracking changes
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const isFieldModified = (field) => {
    return formData[field] !== originalData[field];
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name required';
    if (!formData.liability_type) newErrors.liability_type = 'Type required';
    if (!formData.current_balance) newErrors.current_balance = 'Balance required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsSaving(true);
    try {
      await onSave({ ...liability, ...formData });
    } finally {
      setIsSaving(false);
    }
  };

  const typeConfig = LIABILITY_TYPES[formData.liability_type];
  const Icon = typeConfig?.icon || Banknote;

  return (
    <div className="space-y-4 p-6 bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-red-100">
            <Icon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Liability</h3>
            <p className="text-sm text-gray-500">Update liability details</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${errors.name 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : isFieldModified('name')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              transition-colors
            `}
            placeholder="Chase Sapphire Card"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
          )}
          {isFieldModified('name') && !errors.name && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={formData.liability_type}
            onChange={(e) => handleFieldChange('liability_type', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${errors.liability_type 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : isFieldModified('liability_type')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
              transition-colors
            `}
          >
            <option value="">Select type...</option>
            {Object.entries(LIABILITY_TYPES).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          {errors.liability_type && (
            <p className="mt-1 text-xs text-red-600">{errors.liability_type}</p>
          )}
          {isFieldModified('liability_type') && !errors.liability_type && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={formData.current_balance}
              onChange={(e) => handleFieldChange('current_balance', parseFloat(e.target.value) || 0)}
              className={`
                w-full pl-8 pr-3 py-2 border rounded-lg text-sm
                ${errors.current_balance 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : isFieldModified('current_balance')
                    ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
              `}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {errors.current_balance && (
            <p className="mt-1 text-xs text-red-600">{errors.current_balance}</p>
          )}
          {isFieldModified('current_balance') && !errors.current_balance && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Original Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={formData.original_amount}
              onChange={(e) => handleFieldChange('original_amount', parseFloat(e.target.value) || 0)}
              className={`
                w-full pl-8 pr-3 py-2 border rounded-lg text-sm
                ${isFieldModified('original_amount')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
              `}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {isFieldModified('original_amount') && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            value={formData.interest_rate}
            onChange={(e) => handleFieldChange('interest_rate', parseFloat(e.target.value) || 0)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${isFieldModified('interest_rate')
                ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
            placeholder="0.00"
            step="0.01"
            min="0"
            max="100"
          />
          {isFieldModified('interest_rate') && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Payment
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={formData.minimum_payment}
              onChange={(e) => handleFieldChange('minimum_payment', parseFloat(e.target.value) || 0)}
              className={`
                w-full pl-8 pr-3 py-2 border rounded-lg text-sm
                ${isFieldModified('minimum_payment')
                  ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
              `}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {isFieldModified('minimum_payment') && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => handleFieldChange('due_date', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${isFieldModified('due_date')
                ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
          />
          {isFieldModified('due_date') && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            className={`
              w-full px-3 py-2 border rounded-lg text-sm resize-none
              ${isFieldModified('notes')
                ? 'border-blue-300 bg-blue-50 focus:ring-blue-500 focus:border-blue-500'
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }
            `}
            placeholder="Additional notes..."
            rows={3}
          />
          {isFieldModified('notes') && (
            <p className="mt-1 text-xs text-blue-600">Modified</p>
          )}
        </div>
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
          disabled={isSaving}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
            ${isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
            }
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
};

// Main QuickEditDeleteModal component - Enhanced with all improvements
  const QuickEditDeleteModal = ({ isOpen, onClose }) => {
    // Core state management
    const [currentView, setCurrentView] = useState('selection'); // 'selection', 'accounts', 'positions', 'liabilities'
    const [accounts, setAccounts] = useState([]);
    const [positions, setPositions] = useState([]);
    const [liabilities, setLiabilities] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [filteredPositions, setFilteredPositions] = useState([]);
    const [filteredLiabilities, setFilteredLiabilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set());
    const [selectedLiabilityTypes, setSelectedLiabilityTypes] = useState(new Set());
    const [selectedAccountFilter, setSelectedAccountFilter] = useState(new Set());
    const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState(new Set());
    const [selectedCategories, setSelectedCategories] = useState(new Set());
    const [selectedAccountTypes, setSelectedAccountTypes] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showValues, setShowValues] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [editingType, setEditingType] = useState(null); // 'account', 'position', or 'liability'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // New state for grouping
    const [groupBy, setGroupBy] = useState('institution'); // Default grouping by institution
    
    // Selection hooks
    const accountSelection = useSelectionState();
    const positionSelection = useSelectionState();
    const liabilitySelection = useSelectionState();

    // Refs
    const messageTimeoutRef = useRef(null);

    // Load data on mount or view change
    useEffect(() => {
        if (isOpen && currentView === 'accounts') {
            loadAccounts();
        } else if (isOpen && currentView === 'positions') {
            loadPositions();
            // Load accounts from DataStore if not already loaded
            if (accounts.length === 0) {
                const accountsData = getDataStoreAccounts();
                if (accountsData.length > 0) {
                    setAccounts(accountsData);
                }
            }
        } else if (isOpen && currentView === 'liabilities') {
            loadLiabilities();
        }
        
        return () => {
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
        };
    }, [isOpen, currentView, dataStoreAccounts]);

    // Reload accounts when returning from edit
    useEffect(() => {
        if (!editingItem && currentView === 'accounts') {
            loadAccounts();
        }
    }, [editingItem, currentView]);

    // Reset state when modal closes
    useEffect(() => {
      if (!isOpen) {
        setTimeout(() => {
          setCurrentView('selection');
          setEditingItem(null);
          setEditingType(null);
          setSearchQuery('');
          accountSelection.clearSelection();
          positionSelection.clearSelection();
          liabilitySelection.clearSelection();
          setSelectedAssetTypes(new Set());
          setSelectedLiabilityTypes(new Set());
          setSelectedAccountFilter(new Set());
          setSelectedInstitutionFilter(new Set());
          setSelectedCategories(new Set());
          setSelectedAccountTypes(new Set());
        }, 300);
      }
    }, [isOpen]);

    const loadAccounts = () => {
        // Use DataStore accounts directly
        const accountsData = getDataStoreAccounts();
        setAccounts(accountsData);
        setFilteredAccounts(accountsData);
    };

    const loadPositions = async () => {
      setLoading(true);
      try {
        const data = await fetchUnifiedPositions();
        setPositions(data);
        setFilteredPositions(data);
      } catch (error) {
        console.error('Error loading positions:', error);
        showMessage('error', 'Failed to load positions');
      } finally {
        setLoading(false);
      }
    };

    const loadLiabilities = async () => {
      setLoading(true);
      try {
        const data = await fetchLiabilities();
        // Fix: Ensure we're working with the liabilities array
        setLiabilities(data.liabilities || []);
        setFilteredLiabilities(data.liabilities || []);
      } catch (error) {
        console.error('Error loading liabilities:', error);
        showMessage('error', 'Failed to load liabilities');
      } finally {
        setLoading(false);
      }
    };

    // Calculate account totals from positions
    const accountsWithTotals = useMemo(() => {
      if (accounts.length === 0) return accounts;
      
      const accountTotals = {};
      positions.forEach(position => {
        const accountId = position.account_id;
        // Fix: Ensure we're using proper number conversion for values
        const positionValue = parseFloat(position.current_value || 0);
        accountTotals[accountId] = (accountTotals[accountId] || 0) + positionValue;
      });
      
      return accounts.map(account => ({
        ...account,
        // Ensure we store the balance properly 
        total_value: accountTotals[account.id] || account.balance || 0
      }));
    }, [accounts, positions]);

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

    // Get unique values for filters
    const uniqueInstitutions = useMemo(() => {
      const institutions = [...new Set(accounts.map(acc => acc.institution).filter(Boolean))];
      return institutions.sort();
    }, [accounts]);

    const uniqueAccountTypes = useMemo(() => {
      const types = [...new Set(accounts.map(acc => acc.type).filter(Boolean))];
      return types.sort();
    }, [accounts]);

    // Calculate filter options with counts
    const categoryFilterOptions = useMemo(() => {
      return ACCOUNT_CATEGORIES.map(cat => ({
        value: cat.id,
        label: cat.name,
        icon: cat.icon,
        count: accounts.filter(acc => acc.account_category === cat.id).length
      }));
    }, [accounts]);

    const institutionFilterOptions = useMemo(() => {
      return uniqueInstitutions.map(inst => ({
        value: inst,
        label: inst,
        icon: Building2,
        count: accounts.filter(acc => acc.institution === inst).length
      }));
    }, [uniqueInstitutions, accounts]);

    const accountFilterOptions = useMemo(() => {
      return accounts.map(acc => ({
        value: acc.id,
        label: acc.account_name,
        icon: Wallet,
        count: positions.filter(pos => pos.account_id === acc.id).length
      }));
    }, [accounts, positions]);

    const liabilityTypeFilterOptions = useMemo(() => {
      return Object.entries(LIABILITY_TYPES).map(([key, config]) => ({
        value: key,
        label: config.label,
        icon: config.icon,
        count: liabilities.filter(l => l.liability_type === key).length
      }));
    }, [liabilities]);

    // Group data based on grouping preference
    const groupedAccounts = useMemo(() => {
      if (groupBy === 'none') {
        return { 'All Accounts': filteredAccounts };
      } else if (groupBy === 'institution') {
        return filteredAccounts.reduce((acc, account) => {
          const key = account.institution || 'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(account);
          return acc;
        }, {});
      } else if (groupBy === 'category') {
        return filteredAccounts.reduce((acc, account) => {
          const category = ACCOUNT_CATEGORIES.find(c => c.id === account.category);
          const key = category ? category.name : 'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(account);
          return acc;
        }, {});
      }
      
      return { 'All Accounts': filteredAccounts };
    }, [filteredAccounts, groupBy]);

    const groupedPositions = useMemo(() => {
      if (groupBy === 'none') {
        return { 'All Positions': filteredPositions };
      } else if (groupBy === 'institution') {
        return filteredPositions.reduce((acc, position) => {
          const account = accounts.find(a => a.id === position.account_id);
          const key = account?.institution || 'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      } else if (groupBy === 'account') {
        return filteredPositions.reduce((acc, position) => {
          const key = position.account_name || 'Uncategorized';
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      } else if (groupBy === 'account_institution') {
        return filteredPositions.reduce((acc, position) => {
          const account = accounts.find(a => a.id === position.account_id);
          const key = `${position.account_name || 'Unknown'} (${account?.institution || 'Unknown'})`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      } else if (groupBy === 'asset_type') {
        return filteredPositions.reduce((acc, position) => {
          const assetType = ASSET_TYPES[position.asset_type];
          const key = assetType ? assetType.name : 'Other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(position);
          return acc;
        }, {});
      }
      
      return { 'All Positions': filteredPositions };
    }, [filteredPositions, accounts, groupBy]);

    const groupedLiabilities = useMemo(() => {
      if (groupBy === 'none') {
        return { 'All Liabilities': filteredLiabilities };
      } else if (groupBy === 'liability_type') {
        return filteredLiabilities.reduce((acc, liability) => {
          const type = LIABILITY_TYPES[liability.liability_type];
          const key = type ? type.label : 'Other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(liability);
          return acc;
        }, {});
      }
      
      return { 'All Liabilities': filteredLiabilities };
    }, [filteredLiabilities, groupBy]);

    // Filter accounts
    useEffect(() => {
      let filtered = [...accountsWithTotals];

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(account => 
          account.name?.toLowerCase().includes(query) ||
          account.institution?.toLowerCase().includes(query) ||
          account.type?.toLowerCase().includes(query)
        );
      }

      if (selectedCategories.size > 0) {
        filtered = filtered.filter(acc => !selectedCategories.has(acc.account_category));
      }

      if (selectedInstitutionFilter.size > 0) {
        filtered = filtered.filter(acc => !selectedInstitutionFilter.has(acc.institution));
      }

      if (selectedAccountTypes.size > 0) {
        filtered = filtered.filter(acc => !selectedAccountTypes.has(acc.type));
      }

      if (sortConfig.key) {
        filtered.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          
          if (sortConfig.key === 'balance') {
            aVal = a.total_value || a.balance || 0;
            bVal = b.total_value || b.balance || 0;
          }
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
          
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setFilteredAccounts(filtered);
    }, [accountsWithTotals, searchQuery, selectedCategories, selectedInstitutionFilter, selectedAccountTypes, sortConfig]);

    // Filter positions
    useEffect(() => {
      let filtered = [...positions];

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(pos => {
          const searchableFields = [
            pos.identifier,
            pos.name,
            pos.account_name,
            pos.sector,
            pos.industry
          ];
          return searchableFields.some(field => 
            field && field.toLowerCase().includes(query)
          );
        });
      }

      if (selectedAssetTypes.size > 0) {
        filtered = filtered.filter(pos => !selectedAssetTypes.has(pos.asset_type));
      }

      if (selectedAccountFilter.size > 0) {
        filtered = filtered.filter(pos => !selectedAccountFilter.has(pos.account_id));
      }

      if (selectedInstitutionFilter.size > 0) {
        filtered = filtered.filter(pos => {
          const account = accounts.find(acc => acc.id === pos.account_id);
          return account && !selectedInstitutionFilter.has(account.institution);
        });
      }

      if (sortConfig.key) {
        filtered.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
          
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setFilteredPositions(filtered);
    }, [positions, searchQuery, selectedAssetTypes, selectedAccountFilter, selectedInstitutionFilter, accounts, sortConfig]);

    // Filter liabilities
    useEffect(() => {
      let filtered = [...liabilities];

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(liability => 
          liability.name?.toLowerCase().includes(query) ||
          liability.liability_type?.toLowerCase().includes(query)
        );
      }

      if (selectedLiabilityTypes.size > 0) {
        filtered = filtered.filter(l => !selectedLiabilityTypes.has(l.liability_type));
      }

      if (sortConfig.key) {
        filtered.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
          
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setFilteredLiabilities(filtered);
    }, [liabilities, searchQuery, selectedLiabilityTypes, sortConfig]);

// Handle account editing
const handleEditAccount = (account) => {
    // Normalize the account object to ensure consistent field names
    const normalizedAccount = {
        ...account,
        // Ensure we have the expected field names for the edit form
        name: account.name || account.account_name,
        category: account.category || account.account_category,
        // Keep other fields as-is
        institution: account.institution,
        type: account.type,
        id: account.id
    };
    
    setEditingItem(normalizedAccount);
    setEditingType('account');
};

  const handleSaveAccount = async (updatedAccount) => {
      try {
          setIsSubmitting(true);
          
          // Update the account in the backend
          await updateAccount(updatedAccount.id, {
              account_name: updatedAccount.name || updatedAccount.account_name,
              institution: updatedAccount.institution,
              type: updatedAccount.type,
              account_category: updatedAccount.category || updatedAccount.account_category
          });
          
          // Clear editing state
          setEditingItem(null);
          setEditingType(null);
          
          // Refresh DataStore to get the updated data
          await refreshDataStoreAccounts();
          // Reload accounts after refresh
          loadAccounts();
          
          showMessage('success', 'Account updated successfully');
      } catch (error) {
          console.error('Error updating account:', error);
          showMessage('error', 'Failed to update account');
      } finally {
          setIsSubmitting(false);
      }
  };

    // Handle position editing
    const handleEditPosition = (position) => {
      setEditingItem(position);
      setEditingType('position');
    };

    const handleSavePosition = async (updatedPosition) => {
      try {
        setIsSubmitting(true);
        
        // Special handling for otherAssets
        if (updatedPosition.asset_type === 'otherAssets') {
          const otherAssetData = {
            asset_name: updatedPosition.identifier || updatedPosition.name,
            asset_type: updatedPosition.asset_type,
            cost: updatedPosition.total_cost_basis || 0,
            current_value: updatedPosition.current_value || 0,
            purchase_date: updatedPosition.purchase_date,
            notes: updatedPosition.notes || ''
          };
          await updateOtherAsset(updatedPosition.id, otherAssetData);
        } else {
          await updatePosition(updatedPosition.id, updatedPosition, updatedPosition.asset_type);
        }
        
        setPositions(prev => prev.map(pos => 
          pos.id === updatedPosition.id ? updatedPosition : pos
        ));
        
        setEditingItem(null);
        setEditingType(null);
        showMessage('success', 'Position updated successfully');
      } catch (error) {
        console.error(`Error updating ${updatedPosition.asset_type} position:`, error);
        showMessage('error', 'Failed to update position');
      } finally {
        setIsSubmitting(false);
      }
    };

    // Handle liability editing
    const handleEditLiability = (liability) => {
      setEditingItem(liability);
      setEditingType('liability');
    };

    const handleSaveLiability = async (updatedLiability) => {
      try {
        setIsSubmitting(true);
        await updateLiability(updatedLiability.id, updatedLiability);
        
        setLiabilities(prev => prev.map(l => 
          l.id === updatedLiability.id ? updatedLiability : l
        ));
        
        setEditingItem(null);
        setEditingType(null);
        showMessage('success', 'Liability updated successfully');
      } catch (error) {
        console.error('Error updating liability:', error);
        showMessage('error', 'Failed to update liability');
      } finally {
        setIsSubmitting(false);
      }
    };

    // Handle deletion
    const handleDeleteSelected = async () => {
      const selectedIds = 
        currentView === 'accounts' ? Array.from(accountSelection.selectedItems) :
        currentView === 'positions' ? Array.from(positionSelection.selectedItems) :
        Array.from(liabilitySelection.selectedItems);

      if (selectedIds.length === 0) return;

      const itemType = 
        currentView === 'accounts' ? 'account' :
        currentView === 'positions' ? 'position' :
        'liability';
        
      const confirmed = window.confirm(
        `Delete ${selectedIds.length} ${itemType}${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.`
      );

      if (!confirmed) return;

      setIsSubmitting(true);
      let successCount = 0;
      let errorCount = 0;

      try {
        for (const id of selectedIds) {
          try {
            if (currentView === 'accounts') {
              await deleteAccount(id);
            } else if (currentView === 'positions') {
              const position = positions.find(p => p.id === id);
              if (position?.asset_type === 'otherAssets') {
                await deleteOtherAsset(id);
              } else {
                await deletePosition(id, position?.asset_type);
              }
            } else {
              await deleteLiability(id);
            }
            successCount++;
          } catch (error) {
            errorCount++;
            console.error(`Error deleting ${itemType}:`, error);
          }
        }

        // Update local state
        if (currentView === 'accounts') {
          setAccounts(prev => prev.filter(acc => !selectedIds.includes(acc.id)));
          accountSelection.clearSelection();
        } else if (currentView === 'positions') {
          setPositions(prev => prev.filter(pos => !selectedIds.includes(pos.id)));
          positionSelection.clearSelection();
        } else {
          setLiabilities(prev => prev.filter(l => !selectedIds.includes(l.id)));
          liabilitySelection.clearSelection();
        }

        if (errorCount === 0) {
          showMessage('success', `Successfully deleted ${successCount} ${itemType}${successCount !== 1 ? 's' : ''}`);
        } else {
          showMessage('warning', `Deleted ${successCount} ${itemType}${successCount !== 1 ? 's' : ''}, ${errorCount} failed`);
        }
      } catch (error) {
        console.error('Error during deletion:', error);
        showMessage('error', 'Failed to delete items');
      } finally {
        setIsSubmitting(false);
      }
    };

    // Export selected items
    const handleExport = () => {
      const selected = 
        currentView === 'accounts' ? filteredAccounts.filter(acc => accountSelection.isSelected(acc.id)) :
        currentView === 'positions' ? filteredPositions.filter(pos => positionSelection.isSelected(pos.id)) :
        filteredLiabilities.filter(l => liabilitySelection.isSelected(l.id));

      if (selected.length === 0) return;

      const csv = convertToCSV(selected);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentView}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      showMessage('success', `Exported ${selected.length} ${currentView.slice(0, -1)}${selected.length !== 1 ? 's' : ''}`);
    };

    const convertToCSV = (data) => {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            const escaped = String(value || '').replace(/"/g, '""');
            return escaped.includes(',') ? `"${escaped}"` : escaped;
          }).join(',')
        )
      ].join('\n');
      
      return csv;
    };

    // Calculate stats
    const stats = useMemo(() => {
      if (currentView === 'accounts') {
        const selected = filteredAccounts.filter(acc => accountSelection.isSelected(acc.id));
        const totalValue = selected.reduce((sum, acc) => sum + (parseFloat(acc.total_value || acc.balance || 0)), 0);
        
        return {
          selected: selected.length,
          total: filteredAccounts.length,
          totalValue
        };
      } else if (currentView === 'positions') {
        const selected = filteredPositions.filter(pos => positionSelection.isSelected(pos.id));
        const totalValue = selected.reduce((sum, pos) => sum + parseFloat(pos.current_value || 0), 0);
        const totalCost = selected.reduce((sum, pos) => sum + parseFloat(pos.total_cost_basis || 0), 0);
        
        return {
          selected: selected.length,
          total: filteredPositions.length,
          totalValue,
          totalCost,
          gainLoss: totalValue - totalCost,
          gainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
        };
      } else {
        const selected = filteredLiabilities.filter(l => liabilitySelection.isSelected(l.id));
        const totalBalance = selected.reduce((sum, l) => sum + (parseFloat(l.current_balance || 0)), 0);
        
        return {
          selected: selected.length,
          total: filteredLiabilities.length,
          totalBalance
        };
      }
    }, [
      currentView, 
      filteredAccounts, filteredPositions, filteredLiabilities, 
      accountSelection.selectedItems, positionSelection.selectedItems, liabilitySelection.selectedItems
    ]);

    // Calculate asset type distribution for dashboard
    const assetTypeCounts = useMemo(() => {
      const counts = {};
      Object.keys(ASSET_TYPES).forEach(type => {
        counts[type] = positions.filter(p => p.asset_type === type).length;
      });
      return counts;
    }, [positions]);

    // Calculate portfolio summary for dashboard
    const portfolioSummary = useMemo(() => {
      const totalAssets = positions.reduce((sum, pos) => sum + parseFloat(pos.current_value || 0), 0);
      const totalLiabilities = liabilities.reduce((sum, l) => sum + parseFloat(l.current_balance || 0), 0);
      const netWorth = totalAssets - totalLiabilities;
      
      return {
        accountCount: accounts.length,
        positionCount: positions.length,
        liabilityCount: liabilities.length,
        totalAssets,
        totalLiabilities,
        netWorth
      };
    }, [accounts, positions, liabilities]);

    // Render dashboard
    const renderDashboard = () => (
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Accounts"
            value={portfolioSummary.accountCount}
            icon={Building}
            color="blue"
            subtext="Across all institutions"
          />
          
          <StatsCard
            title="Total Positions"
            value={portfolioSummary.positionCount}
            icon={BarChart2}
            color="purple"
            subtext="All asset types"
          />
          
          <StatsCard
            title="Total Liabilities"
            value={portfolioSummary.liabilityCount}
            icon={CreditCard}
            color="red"
            subtext="All liability types"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="md:col-span-3">
            <AssetTypeDistribution
              assetCounts={assetTypeCounts}
              totalCount={portfolioSummary.positionCount}
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setCurrentView('accounts')}
                className="w-full py-2 px-3 text-sm text-left font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center"
              >
                <Building className="w-4 h-4 mr-2" />
                Manage Accounts
              </button>
              
              <button
                onClick={() => setCurrentView('positions')}
                className="w-full py-2 px-3 text-sm text-left font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                Manage Positions
              </button>
              
              <button
                onClick={() => setCurrentView('liabilities')}
                className="w-full py-2 px-3 text-sm text-left font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Liabilities
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    // Render selection screen
    const renderSelectionScreen = () => (
      <div className="space-y-8">
        {/* Dashboard */}
        {renderDashboard()}
        
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 animate-pulse">
              <Edit3 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit & Delete Manager</h2>
            <p className="text-gray-600">Choose what you'd like to manage</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Accounts Card */}
            <div 
              onClick={() => setCurrentView('accounts')}
              className="group cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 border-2 border-transparent hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white mb-4 group-hover:scale-110 transition-transform">
                  <Wallet className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Accounts</h3>
                <p className="text-gray-600 mb-4">Edit account details or delete accounts</p>
                <div className="flex items-center text-sm text-blue-600 group-hover:text-blue-700">
                  <span>Manage Accounts</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Positions Card */}
            <div 
              onClick={() => setCurrentView('positions')}
              className="group cursor-pointer bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-8 border-2 border-transparent hover:border-purple-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Positions</h3>
                <p className="text-gray-600 mb-4">Edit position details or delete positions</p>
                <div className="flex items-center text-sm text-purple-600 group-hover:text-purple-700">
                  <span>Manage Positions</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Liabilities Card */}
            <div 
              onClick={() => setCurrentView('liabilities')}
              className="group cursor-pointer bg-gradient-to-br from-red-50 to-orange-100 rounded-2xl p-8 border-2 border-transparent hover:border-red-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl text-white mb-4 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Liabilities</h3>
                <p className="text-gray-600 mb-4">Edit liability details or delete debts</p>
                <div className="flex items-center text-sm text-red-600 group-hover:text-red-700">
                  <span>Manage Liabilities</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700">
                You can delete multiple items at once, but edit one at a time
              </span>
            </div>
          </div>
        </div>
      </div>
    );

    // Render account row
    const renderAccountRow = (account, index) => {
      const category = ACCOUNT_CATEGORIES.find(c => c.id === account.category);
      const Icon = category?.icon || Building;
      const balance = account.total_value || account.balance || 0;
      
      return (
        <tr 
          key={account.id}
          className={`
            border-b border-gray-100 transition-all duration-200
            ${accountSelection.isSelected(account.id) 
              ? 'bg-blue-50 hover:bg-blue-100' 
              : 'hover:bg-gray-50'
            }
          `}
        >
          <td className="w-12 px-4 py-3">
            <input
              type="checkbox"
              checked={accountSelection.isSelected(account.id)}
              onChange={(e) => accountSelection.toggleSelection(
                account.id, 
                index, 
                e.shiftKey, 
                filteredAccounts
              )}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </td>
          
          <td className="px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-${category?.color || 'gray'}-100`}>
                <Icon className={`w-4 h-4 text-${category?.color || 'gray'}-600`} />
              </div>
              <div>
                <div className="font-medium text-gray-900">{account.name}</div>
                <div className="text-sm text-gray-500">{category?.name}</div>
              </div>
            </div>
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900">
            {account.institution}
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900">
            {account.type}
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {showValues ? formatCurrency(balance) : '••••'}
          </td>
          
          <td className="px-4 py-3">
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => handleEditAccount(account)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  accountSelection.clearSelection();
                  accountSelection.toggleSelection(account.id);
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

    // Render position row
    const renderPositionRow = (position, index) => {
      const config = ASSET_TYPES[position.asset_type];
      if (!config) return null;

      const Icon = config.icon;
      const value = parseFloat(position.current_value || 0);
      const cost = parseFloat(position.total_cost_basis || 0);
      const gainLoss = position.gain_loss_amt || (value - cost);
      const gainLossPercent = position.gain_loss_pct || (cost > 0 ? ((value - cost) / cost) * 100 : 0);

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
                  {position.identifier || position.name || 'Unknown'}
                </div>
                <div className="text-sm text-gray-500">{position.name || config.name}</div>
              </div>
            </div>
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900">
            {position.account_name || 'No Account'}
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {position.quantity || '-'}
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
                  positionSelection.clearSelection();
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

    // Render liability row
    const renderLiabilityRow = (liability, index) => {
      const typeConfig = LIABILITY_TYPES[liability.liability_type];
      const Icon = typeConfig?.icon || Banknote;
      const balance = parseFloat(liability.current_balance || 0);
      const interestRate = parseFloat(liability.interest_rate || 0);
      
      return (
        <tr 
          key={liability.id}
          className={`
            border-b border-gray-100 transition-all duration-200
            ${liabilitySelection.isSelected(liability.id) 
              ? 'bg-red-50 hover:bg-red-100' 
              : 'hover:bg-gray-50'
            }
          `}
        >
          <td className="w-12 px-4 py-3">
            <input
              type="checkbox"
              checked={liabilitySelection.isSelected(liability.id)}
              onChange={(e) => liabilitySelection.toggleSelection(
                liability.id, 
                index, 
                e.shiftKey, 
                filteredLiabilities
              )}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
          </td>
          
          <td className="px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Icon className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{liability.name}</div>
                <div className="text-sm text-gray-500">{typeConfig?.label}</div>
              </div>
            </div>
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {showValues ? `-${formatCurrency(balance)}` : '••••'}
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {interestRate.toFixed(2)}%
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900 text-right">
            {showValues && liability.minimum_payment ? formatCurrency(liability.minimum_payment) : '-'}
          </td>
          
          <td className="px-4 py-3 text-sm text-gray-900">
            {liability.due_date ? new Date(liability.due_date).toLocaleDateString() : '-'}
          </td>
          
          <td className="px-4 py-3">
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => handleEditLiability(liability)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  liabilitySelection.clearSelection();
                  liabilitySelection.toggleSelection(liability.id);
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

    // Get color config for categories
    const categoryColorConfig = ACCOUNT_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = cat.color;
      return acc;
    }, {});

    // Determine grouping options based on current view
    const groupingOptions = useMemo(() => {
      if (currentView === 'accounts') {
        return [
          { id: 'none', name: 'No Grouping', icon: List },
          { id: 'institution', name: 'By Institution', icon: Building2 },
          { id: 'category', name: 'By Category', icon: PieChart }
        ];
      } else if (currentView === 'positions') {
        return [
          { id: 'none', name: 'No Grouping', icon: List },
          { id: 'account', name: 'By Account', icon: Wallet },
          { id: 'institution', name: 'By Institution', icon: Building2 },
          { id: 'account_institution', name: 'By Account & Institution', icon: Grid3x3 },
          { id: 'asset_type', name: 'By Asset Type', icon: BarChart2 }
        ];
      } else if (currentView === 'liabilities') {
        return [
          { id: 'none', name: 'No Grouping', icon: List },
          { id: 'liability_type', name: 'By Type', icon: CreditCard }
        ];
      }
      return [];
    }, [currentView]);

    // Render table with grouping
    const renderGroupedTable = () => {
      const groups = 
        currentView === 'accounts' ? groupedAccounts :
        currentView === 'positions' ? groupedPositions :
        groupedLiabilities;
      
      if (Object.keys(groups).length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <Database className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No data found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your filters or grouping options
            </p>
          </div>
        );
      }
      
      return (
        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{groupName}</h3>
                  <div className="text-xs text-gray-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={items.every(item => 
                            currentView === 'accounts' ? accountSelection.isSelected(item.id) :
                            currentView === 'positions' ? positionSelection.isSelected(item.id) :
                            liabilitySelection.isSelected(item.id)
                          ) && items.length > 0}
                          onChange={(e) => {
                            if (currentView === 'accounts') {
                              if (e.target.checked) {
                                accountSelection.selectAll(items);
                              } else {
                                items.forEach(item => accountSelection.toggleSelection(item.id));
                              }
                            } else if (currentView === 'positions') {
                              if (e.target.checked) {
                                positionSelection.selectAll(items);
                              } else {
                                items.forEach(item => positionSelection.toggleSelection(item.id));
                              }
                            } else {
                              if (e.target.checked) {
                                liabilitySelection.selectAll(items);
                              } else {
                                items.forEach(item => liabilitySelection.toggleSelection(item.id));
                              }
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      
                      {currentView === 'accounts' ? (
                        <>
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
                          <th className="px-4 py-3 text-left">
                            <button
                              onClick={() => setSortConfig({
                                key: 'institution',
                                direction: sortConfig.key === 'institution' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Institution
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Type
                            </span>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSortConfig({
                                key: 'balance',
                                direction: sortConfig.key === 'balance' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center justify-end text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Balance
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                        </>
                      ) : currentView === 'positions' ? (
                        <>
                          <th className="px-4 py-3 text-left">
                            <button
                              onClick={() => setSortConfig({
                                key: 'identifier',
                                direction: sortConfig.key === 'identifier' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
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
                            <button
                              onClick={() => setSortConfig({
                                key: 'quantity',
                                direction: sortConfig.key === 'quantity' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center justify-end text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Quantity
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSortConfig({
                                key: 'current_value',
                                direction: sortConfig.key === 'current_value' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center justify-end text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Value
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSortConfig({
                                key: 'gain_loss_amt',
                                direction: sortConfig.key === 'gain_loss_amt' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center justify-end text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Gain/Loss
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left">
                            <button
                              onClick={() => setSortConfig({
                                key: 'name',
                                direction: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Liability
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSortConfig({
                                key: 'current_balance',
                                direction: sortConfig.key === 'current_balance' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center justify-end text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Balance
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSortConfig({
                                key: 'interest_rate',
                                direction: sortConfig.key === 'interest_rate' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center justify-end text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Rate
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Min Payment
                            </span>
                          </th>
                          <th className="px-4 py-3 text-left">
                            <button
                              onClick={() => setSortConfig({
                                key: 'due_date',
                                direction: sortConfig.key === 'due_date' && sortConfig.direction === 'asc' ? 'desc' : 'asc'
                              })}
                              className="flex items-center text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                            >
                              Due Date
                              <ArrowUpDown className="w-3 h-3 ml-1" />
                            </button>
                          </th>
                        </>
                      )}
                      
                      <th className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentView === 'accounts' ? (
                      items.map((account, index) => renderAccountRow(account, 
                        filteredAccounts.findIndex(a => a.id === account.id)
                      ))
                    ) : currentView === 'positions' ? (
                      items.map((position, index) => renderPositionRow(position, 
                        filteredPositions.findIndex(p => p.id === position.id)
                      ))
                    ) : (
                      items.map((liability, index) => renderLiabilityRow(liability, 
                        filteredLiabilities.findIndex(l => l.id === liability.id)
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Group summary */}
              <div className="bg-gray-50 px-6 py-2 border-t border-gray-200 text-xs text-gray-500">
                {currentView === 'accounts' ? (
                  <div className="flex justify-end">
                    Total: {showValues ? formatCurrency(items.reduce((sum, acc) => sum + (acc.total_value || acc.balance || 0), 0)) : '••••'}
                  </div>
                ) : currentView === 'positions' ? (
                  <div className="flex justify-end space-x-4">
                    <span>
                      Value: {showValues ? formatCurrency(items.reduce((sum, pos) => sum + parseFloat(pos.current_value || 0), 0)) : '••••'}
                    </span>
                    <span>
                      Cost: {showValues ? formatCurrency(items.reduce((sum, pos) => sum + parseFloat(pos.total_cost_basis || 0), 0)) : '••••'}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    Total: {showValues ? `-${formatCurrency(items.reduce((sum, l) => sum + parseFloat(l.current_balance || 0), 0))}` : '••••'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
      <FixedModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          currentView === 'selection' ? 'Investment Manager' : 
          currentView === 'accounts' ? 'Manage Accounts' : 
          currentView === 'positions' ? 'Manage Positions' :
          'Manage Liabilities'
        }
        size="max-w-7xl"
      >
        <div className="h-[85vh] flex flex-col bg-gray-50">
          {currentView === 'selection' ? (
            renderSelectionScreen()
          ) : (
            <>
              {/* Header */}
              <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-6">
                    {/* Back button */}
                    <button
                      onClick={() => {
                        setCurrentView('selection');
                        setEditingItem(null);
                        setEditingType(null);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${currentView}...`}
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

                    {/* Grouping dropdown */}
                    <EnhancedDropdown
                      title="Group By"
                      options={groupingOptions}
                      selectedOption={groupBy}
                      onChange={setGroupBy}
                      icon={Grid3x3}
                    />
                  </div>

                  {/* Right side actions */}
                  <div className="flex items-center space-x-3">
                    {stats.selected > 0 && (
                      <div className="flex items-center space-x-3 px-4 py-2 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">
                          {stats.selected} selected
                        </span>
                        <button
                          onClick={handleExport}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Export
                        </button>
                        <button
                          onClick={handleDeleteSelected}
                          disabled={isSubmitting}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    <button
                      onClick={
                        currentView === 'accounts' ? loadAccounts : 
                        currentView === 'positions' ? loadPositions :
                        loadLiabilities
                      }
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                {currentView === 'accounts' ? (
                  <div className="flex items-center justify-center space-x-3 w-full">
                    <span className="text-sm text-gray-500 font-medium">Filters:</span>
                    
                    <FilterDropdown
                      title="Categories"
                      icon={Layers}
                      options={categoryFilterOptions}
                      selected={selectedCategories}
                      onChange={setSelectedCategories}
                      colorConfig={categoryColorConfig}
                    />
                    
                    <FilterDropdown
                      title="Institutions"
                      icon={Building2}
                      options={institutionFilterOptions}
                      selected={selectedInstitutionFilter}
                      onChange={setSelectedInstitutionFilter}
                    />

                    {(selectedCategories.size > 0 || selectedInstitutionFilter.size > 0) && (
                      <button
                        onClick={() => {
                          setSelectedCategories(new Set());
                          setSelectedInstitutionFilter(new Set());
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <FilterX className="w-3 h-3 mr-1" />
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : currentView === 'positions' ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500 font-medium">Filters:</span>
                    
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
                              transition-all duration-200 transform hover:scale-105
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
                    
                    <div className="w-px h-6 bg-gray-300" />
                    
                    <FilterDropdown
                      title="Accounts"
                      icon={Wallet}
                      options={accountFilterOptions}
                      selected={selectedAccountFilter}
                      onChange={setSelectedAccountFilter}
                    />

                    {(selectedAssetTypes.size > 0 || selectedAccountFilter.size > 0) && (
                      <button
                        onClick={() => {
                          setSelectedAssetTypes(new Set());
                          setSelectedAccountFilter(new Set());
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <FilterX className="w-3 h-3 mr-1" />
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500 font-medium">Filters:</span>
                    
                    {/* Liability type filters */}
                    <div className="flex items-center space-x-2">
                      {liabilityTypeFilterOptions.map(option => {
                        const isSelected = selectedLiabilityTypes.has(option.value);
                        const Icon = option.icon;
                        
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newSet = new Set(selectedLiabilityTypes);
                              if (isSelected) {
                                newSet.delete(option.value);
                              } else {
                                newSet.add(option.value);
                              }
                              setSelectedLiabilityTypes(newSet);
                            }}
                            className={`
                              inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium
                              transition-all duration-200 transform hover:scale-105
                              ${isSelected 
                                ? 'bg-red-600 text-white shadow-sm' 
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                              }
                            `}
                          >
                            <Icon className="w-3.5 h-3.5 mr-1.5" />
                            {option.label}
                            {option.count > 0 && (
                              <span className={`
                                ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                ${isSelected ? 'bg-white/20' : 'bg-red-200'}
                              `}>
                                {option.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {selectedLiabilityTypes.size > 0 && (
                      <button
                        onClick={() => setSelectedLiabilityTypes(new Set())}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <FilterX className="w-3 h-3 mr-1" />
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Main content area */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                ) : editingItem ? (
                  <div>
                    {editingType === 'account' ? (
                      <EditAccountForm
                        account={editingItem}
                        onSave={handleSaveAccount}
                        onCancel={() => {
                          setEditingItem(null);
                          setEditingType(null);
                        }}
                      />
                    ) : editingType === 'position' ? (
                      <EditPositionForm
                        position={editingItem}
                        assetType={editingItem.asset_type}
                        onSave={handleSavePosition}
                        onCancel={() => {
                          setEditingItem(null);
                          setEditingType(null);
                        }}
                        accounts={accounts}
                      />
                    ) : (
                      <EditLiabilityForm
                        liability={editingItem}
                        onSave={handleSaveLiability}
                        onCancel={() => {
                          setEditingItem(null);
                          setEditingType(null);
                        }}
                      />
                    )}
                  </div>
                ) : (
                  renderGroupedTable()
                )}

                {/* Empty states */}
                {!loading && !editingItem && (
                  <>
                    {currentView === 'accounts' && filteredAccounts.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64">
                        <Building className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg font-medium">No accounts found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {searchQuery || selectedCategories.size > 0 || selectedInstitutionFilter.size > 0 
                            ? 'Try adjusting your filters' 
                            : 'Add accounts to get started'}
                        </p>
                      </div>
                    )}

                    {currentView === 'positions' && filteredPositions.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64">
                        <Database className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg font-medium">No positions found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {searchQuery || selectedAssetTypes.size > 0 || selectedAccountFilter.size > 0 
                            ? 'Try adjusting your filters' 
                            : 'Add positions to get started'}
                        </p>
                      </div>
                    )}

                    {currentView === 'liabilities' && filteredLiabilities.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-64">
                        <CreditCard className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg font-medium">No liabilities found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {searchQuery || selectedLiabilityTypes.size > 0 
                            ? 'Try adjusting your filters' 
                            : 'Add liabilities to track your debts'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Stats bar */}
              {stats.selected > 0 && !editingItem && (
                <div className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-sm">
                      <span className="font-medium text-blue-900">
                        <AnimatedCounter value={stats.selected} /> selected
                      </span>
                      <div className="flex items-center space-x-4 text-blue-700">
                        {currentView === 'accounts' && (
                          <span>
                            Total Value: {showValues ? (
                              <AnimatedCounter value={stats.totalValue} prefix="$" />
                            ) : '••••'}
                          </span>
                        )}
                        {currentView === 'positions' && (
                          <>
                            <span>
                              Total Value: {showValues ? (
                                <AnimatedCounter value={stats.totalValue} prefix="$" />
                              ) : '••••'}
                            </span>
                            <span className="text-blue-400">•</span>
                            <span>
                              Cost: {showValues ? (
                                <AnimatedCounter value={stats.totalCost} prefix="$" />
                              ) : '••••'}
                            </span>
                            <span className="text-blue-400">•</span>
                            <span className={`font-medium ${stats.gainLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {stats.gainLoss >= 0 ? '+' : '-'}
                              {showValues ? (
                                <AnimatedCounter value={Math.abs(stats.gainLoss)} prefix="$" />
                              ) : '••••'}
                              <span className="text-xs ml-1">({stats.gainLossPercent.toFixed(1)}%)</span>
                            </span>
                          </>
                        )}
                        {currentView === 'liabilities' && (
                          <span>
                            Total Balance: {showValues ? (
                              <>-<AnimatedCounter value={stats.totalBalance} prefix="$" /></>
                            ) : '••••'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleExport}
                        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Download className="w-4 h-4 inline mr-1.5" />
                        Export
                      </button>
                      
                      <button
                        onClick={handleDeleteSelected}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 inline mr-1.5 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 inline mr-1.5" />
                            Delete Selected
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (currentView === 'accounts') {
                            accountSelection.clearSelection();
                          } else if (currentView === 'positions') {
                            positionSelection.clearSelection();
                          } else {
                            liabilitySelection.clearSelection();
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Message display */}
          {message.text && (
            <div className={`
              absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg
              flex items-center space-x-3 animate-in slide-in-from-bottom duration-300 z-40
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
  
  // Export button components
  export const QuickEditDeleteButton = ({ className = '', mobileView = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
  
    if (mobileView) {
      return (
        <>
          <button
            onClick={() => setIsModalOpen(true)}
            className={className}
          >
            <Edit3 className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
            <span className="text-xs text-gray-200 group-hover:text-white">Edit</span>
          </button>
          
          <QuickEditDeleteModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
          />
        </>
      );
    }
  
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
  
  export const LiabilityEditDeleteButton = ({ className = '', mobileView = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
  
    const handleOpenModal = () => {
      setIsModalOpen(true);
    };
  
    if (mobileView) {
      return (
        <>
          <button
            onClick={handleOpenModal}
            className={className}
          >
            <CreditCard className="h-6 w-6 mb-1 text-white group-hover:text-red-300" />
            <span className="text-xs text-gray-200 group-hover:text-white">Liabilities</span>
          </button>
          
          <QuickEditDeleteModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
          />
        </>
      );
    }
  
    return (
      <>
        <button
          onClick={handleOpenModal}
          className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-red-400 group-hover:text-white transition-colors" />
            <span className="text-sm text-gray-200 group-hover:text-white font-medium">Manage Liabilities</span>
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