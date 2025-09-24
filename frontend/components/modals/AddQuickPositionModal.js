import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer } from 'react';
import ReactDOM from 'react-dom';
import debounce from 'lodash.debounce';

// Component and Utility Imports (assuming these paths are correct)
import FixedModal from './FixedModal';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import {
  addSecurityPosition,
  addCryptoPosition,
  addMetalPosition,
  addCashPosition,
  addOtherAsset,
  searchSecurities,
  searchFXAssets
} from '@/utils/apimethods/positionMethods';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

// Lucide Icons
import {
  Plus, X, Check, TrendingUp, Building2, Coins, DollarSign,
  Home, BarChart3, Briefcase, Eye, EyeOff, Save, Trash2,
  AlertCircle, CheckCircle, Clock, Hash, Search, ChevronDown,
  Copy, ArrowUp, ArrowDown, Sparkles, Zap, Activity, Layers,
  FileSpreadsheet, Table, Grid3x3, Filter, Download, Upload,
  Keyboard, MousePointer, MoreVertical, ChevronRight, Shield,
  PieChart, Target, Wallet, CreditCard, Gem, Building,
  ChevronUp, Edit3, CheckSquare, Square, ListPlus, Loader2,
  ArrowUpDown, Info, MinusCircle, PlusCircle, BarChart2,
  RefreshCw, Database, TrendingDown, Percent, Calculator,
  FileText, GitBranch, Shuffle, Import, Export, Maximize2,
  Calendar, ToggleLeft, ToggleRight, Users, Repeat,
  ClipboardList, CheckCheck, XCircle, AlertTriangle
} from 'lucide-react';


// -- ORIGINAL HELPER COMPONENTS --

// Account categories definition
const ACCOUNT_CATEGORIES = [
  { id: "brokerage", name: "Brokerage", icon: Briefcase },
  { id: "retirement", name: "Retirement", icon: Building },
  { id: "cash", name: "Cash / Banking", icon: DollarSign },
  { id: "cryptocurrency", name: "Cryptocurrency", icon: Hash },
  { id: "metals", name: "Metals Storage", icon: Shield },
  { id: "real_estate", name: "Real Estate", icon: Home }
];

const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0, duration = 600 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      setDisplayValue(currentValue);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals).toLocaleString()
    : Math.floor(displayValue).toLocaleString();
  return (
    <span className={`transition-all duration-300 ${isAnimating ? 'text-blue-600' : ''}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

const ProgressIndicator = ({ current, total, className = '' }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className={`relative ${className}`}>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="absolute -top-1 transition-all duration-500 ease-out"
        style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
        <div className="w-3 h-3 bg-blue-600 rounded-full ring-2 ring-white shadow-sm" />
      </div>
    </div>
  );
};

const AssetTypeBadge = ({ type, count, icon: Icon, color, active = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-3 py-1.5 rounded-lg transition-all duration-300 transform
        ${active
          ? `${color.bg} text-white shadow-lg scale-105 ring-2 ring-${color.main}-400 ring-opacity-50`
          : 'bg-white text-gray-700 hover:shadow-md hover:scale-102 border border-gray-200'
        }
      `}
    >
      <div className="flex items-center space-x-2">
        <Icon className={`w-4 h-4 ${active ? 'animate-pulse' : ''}`} />
        <span className="font-medium text-sm">{type}</span>
        {count > 0 && (
          <span className={`
            px-1.5 py-0.5 text-xs rounded-full font-bold
            ${active ? 'bg-white/20 text-white' : `${color.lightBg} ${color.text}`}
          `}>
            {count}
          </span>
        )}
      </div>
      {count > 0 && !active && (
        <div className={`absolute -top-1 -right-1 w-2 h-2 ${color.bg} rounded-full animate-ping`} />
      )}
    </button>
  );
};

const ToggleSwitch = ({ value, onChange, leftLabel, rightLabel, leftIcon: LeftIcon, rightIcon: RightIcon }) => {
  return (
    <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange(false)}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${!value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
          }
        `}
      >
        {LeftIcon && <LeftIcon className="w-4 h-4" />}
        <span>{leftLabel}</span>
      </button>
      <button
        onClick={() => onChange(true)}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
          ${value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
          }
        `}
      >
        {RightIcon && <RightIcon className="w-4 h-4" />}
        <span>{rightLabel}</span>
      </button>
    </div>
  );
};

const AccountFilter = ({ accounts, selectedAccounts, onChange, filterType = 'accounts' }) => {
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

  const uniqueInstitutions = useMemo(() => {
    const institutions = [...new Set(accounts.map(acc => acc.institution).filter(Boolean))];
    return institutions.sort();
  }, [accounts]);

  const accountsByCategory = useMemo(() => {
    const grouped = {};
    ACCOUNT_CATEGORIES.forEach(cat => {
      grouped[cat.id] = accounts.filter(acc =>
        acc?.account_category?.toLowerCase() === cat.id.toLowerCase()
      );
    });
    return grouped;
  }, [accounts]);

  const selectedCount = selectedAccounts.size;
  const isAllSelected = selectedAccounts.size === 0 ||
    (filterType === 'accounts' ? selectedAccounts.size === accounts.length : selectedAccounts.size === uniqueInstitutions.length);

  const getFilterLabel = () => {
    if (filterType === 'institutions') {
      if (isAllSelected) return 'All Institutions';
      return `${selectedCount} Institution${selectedCount !== 1 ? 's' : ''}`;
    }
    if (isAllSelected) return 'All Accounts';
    return `${selectedCount} Account${selectedCount !== 1 ? 's' : ''}`;
  };

  const getFilterIcon = () => {
    return filterType === 'institutions' ? Building2 : Filter;
  };

  const FilterIcon = getFilterIcon();

  const handleSelectAll = () => {
    if (filterType === 'institutions') {
      const allInstitutions = new Set(uniqueInstitutions);
      onChange(allInstitutions);
    } else {
      const allAccountIds = new Set(accounts.map(acc => acc.id));
      onChange(allAccountIds);
    }
  };

  const handleSelectNone = () => {
    onChange(new Set());
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center px-4 py-2 bg-white rounded-lg shadow-sm
          transition-all duration-200 text-sm border
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-300' : ''}
          ${selectedCount > 0 && !isAllSelected
            ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
            : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }
          transform hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        <FilterIcon className={`w-4 h-4 mr-2 transition-transform duration-200 ${isOpen ? 'rotate-12' : ''}`} />
        <span className="font-medium">{getFilterLabel()}</span>
        <ChevronDown className={`w-4 h-4 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        {selectedCount > 0 && !isAllSelected && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FilterIcon className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-semibold text-gray-800">
                  Filter by {filterType === 'institutions' ? 'Institution' : 'Account'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-all duration-200"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleSelectNone}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-all duration-200"
                >
                  Select None
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              {selectedCount === 0
                ? `No ${filterType} selected (showing all)`
                : isAllSelected
                  ? `All ${filterType === 'institutions' ? uniqueInstitutions.length : accounts.length} ${filterType} selected`
                  : `${selectedCount} of ${filterType === 'institutions' ? uniqueInstitutions.length : accounts.length} selected`
              }
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {filterType === 'institutions' ? (
              <div className="space-y-1">
                {uniqueInstitutions.map(institution => {
                  const isSelected = selectedAccounts.has(institution);
                  const accountCount = accounts.filter(acc => acc.institution === institution).length;
                  return (
                    <button
                      key={institution}
                      onClick={() => {
                        const newSelection = new Set(selectedAccounts);
                        if (isSelected) {
                          newSelection.delete(institution);
                        } else {
                          newSelection.add(institution);
                        }
                        onChange(newSelection);
                      }}
                      className={`
                        w-full px-3 py-2.5 flex items-center justify-between rounded-lg
                        transition-all duration-200 text-sm group
                        ${isSelected
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200'
                          : 'hover:bg-gray-50'
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
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 group-hover:text-gray-800">
                            {institution}
                          </div>
                          <div className="text-xs text-gray-500">
                            {accountCount} account{accountCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <Building2 className={`w-4 h-4 transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    </button>
                  );
                })}
              </div>
            ) : (
              Object.entries(accountsByCategory).map(([categoryId, categoryAccounts]) => {
                if (categoryAccounts.length === 0) return null;
                const category = ACCOUNT_CATEGORIES.find(c => c.id === categoryId);
                const Icon = category?.icon || Building;
                return (
                  <div key={categoryId} className="mb-4">
                    <div className="flex items-center px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <Icon className="w-3.5 h-3.5 mr-2" />
                      {category?.name}
                    </div>
                    <div className="space-y-1">
                      {categoryAccounts.map(account => {
                        const isSelected = selectedAccounts.has(account.id);
                        return (
                          <button
                            key={account.id}
                            onClick={() => {
                              const newSelection = new Set(selectedAccounts);
                              if (isSelected) {
                                newSelection.delete(account.id);
                              } else {
                                newSelection.add(account.id);
                              }
                              onChange(newSelection);
                            }}
                            className={`
                              w-full px-3 py-2.5 flex items-center justify-between rounded-lg
                              transition-all duration-200 text-sm group
                              ${isSelected
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200'
                                : 'hover:bg-gray-50'
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
                              <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 group-hover:text-gray-800">
                                  {account.account_name}
                                </div>
                                <div className="text-xs text-gray-500">{account.institution}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QueueModal = ({ isOpen, onClose, positions, assetTypes, accounts, onClearCompleted }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Added
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Not Submitted
          </span>
        );
    }
  };

  const allPositions = useMemo(() => {
    const result = [];
    Object.entries(positions).forEach(([type, typePositions]) => {
      typePositions.forEach(pos => {
        const isValid = type === 'otherAssets'
          ? (pos.data.asset_name && pos.data.current_value)
          : pos.data.account_id;
        if (isValid) {
          result.push({ ...pos, assetType: type });
        }
      });
    });
    return result;
  }, [positions]);

  const stats = useMemo(() => {
    const counts = { total: 0, success: 0, error: 0, pending: 0 };
    allPositions.forEach(pos => {
      counts.total++;
      counts[pos.status || 'pending']++;
    });
    return counts;
  }, [allPositions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2" />
              Position Queue
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="mt-3 flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Added:</span>
              <span className="font-semibold text-green-600">{stats.success}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Errors:</span>
              <span className="font-semibold text-red-600">{stats.error}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Pending:</span>
              <span className="font-semibold text-gray-600">{stats.pending}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {allPositions.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No positions in queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allPositions.map((position, index) => {
                const config = assetTypes[position.assetType];
                const Icon = config.icon;
                const account = accounts.find(a => a.id === position.data.account_id);

                return (
                  <div
                    key={`${position.assetType}-${position.id}`}
                    className={`
                      p-4 rounded-lg border transition-all duration-200
                      ${position.status === 'success' ? 'bg-green-50 border-green-200' :
                      position.status === 'error' ? 'bg-red-50 border-red-200' :
                      'bg-white border-gray-200'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${config.color.lightBg}`}>
                          <Icon className={`w-5 h-5 ${config.color.text}`} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {position.data.ticker || position.data.symbol || position.data.asset_name ||
                            position.data.metal_type || position.data.currency || 'Position'}
                          </div>
                            <div className="text-sm text-gray-500">
                              {position.assetType === 'otherAssets'
                                ? 'Other Assets (No Account)'
                                : (account?.account_name || 'Unknown Account')
                              } • {config.name}
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(calculatePositionValue(position.assetType, position))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {position.data.shares || position.data.quantity || position.data.amount || '-'} units
                          </div>
                        </div>
                        {getStatusBadge(position.status)}
                      </div>
                    </div>
                    {position.errorMessage && (
                      <div className="mt-2 text-sm text-red-600 bg-red-100 rounded p-2">
                        {position.errorMessage}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClearCompleted}
            disabled={stats.success === 0}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${stats.success === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <CheckCheck className="w-4 h-4 inline mr-2" />
            Clear Added ({stats.success})
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  function calculatePositionValue(type, position) {
    switch (type) {
      case 'security':
        return (position.data.shares || 0) * (position.data.price || 0);
      case 'crypto':
        return (position.data.quantity || 0) * (position.data.current_price || 0);
      case 'metal':
        return (position.data.quantity || 0) * (position.data.current_price_per_unit || position.data.purchase_price || 0);
      case 'otherAssets':
        return position.data.current_value || 0;
      case 'cash':
        return position.data.amount || 0;
      default:
        return 0;
    }
  }
};

// -- THE MAIN COMPONENT --
// A single reducer function to manage all state changes in a predictable way.
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    case 'SET_POSITIONS':
      return { ...state, positions: action.payload };
    case 'UPDATE_POSITION_FIELD': {
      const { assetType, id, field, value } = action.payload;
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: state.positions[assetType].map(pos =>
            pos.id === id ? { ...pos, data: { ...pos.data, [field]: value } } : pos
          )
        }
      };
    }
    case 'ADD_ROW': {
      const { assetType, newPosition } = action.payload;
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: [...state.positions[assetType], newPosition]
        }
      };
    }
    case 'DELETE_ROW': {
      const { assetType, id } = action.payload;
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: state.positions[assetType].filter(pos => pos.id !== id)
        }
      };
    }
    case 'SET_SEARCH_RESULTS': {
      const { assetType, results } = action.payload;
      return { ...state, searchResults: { ...state.searchResults, [assetType]: results } };
    }
    case 'SET_IS_SEARCHING': {
      const { assetType, status } = action.payload;
      return { ...state, isSearching: { ...state.isSearching, [assetType]: status } };
    }
    case 'UPDATE_BULK_STATUS': {
      const { updatedPositions } = action.payload;
      return {
        ...state,
        positions: Object.keys(state.positions).reduce((acc, type) => {
          acc[type] = state.positions[type].map(pos => {
            const updated = updatedPositions.find(up => up.id === pos.id);
            return updated ? { ...pos, status: updated.status, errorMessage: updated.errorMessage } : pos;
          });
          return acc;
        }, {})
      };
    }
    case 'CLEAR_COMPLETED':
      return {
        ...state,
        positions: Object.keys(state.positions).reduce((acc, type) => {
          acc[type] = state.positions[type].filter(pos => pos.status !== 'success');
          return acc;
        }, {})
      };
    case 'SET_GENERAL_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

// Helper function to generate a new position row with a unique ID
const createNewPosition = (assetType) => ({
  id: `${assetType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  data: {},
  status: 'pending'
});

// A debounced search handler for securities and crypto
const debouncedSearch = debounce(async (assetType, query, signal, dispatch) => {
  if (!query) return;

  dispatch({ type: 'SET_IS_SEARCHING', payload: { assetType, status: true } });
  try {
    const results = assetType === 'security'
      ? await searchSecurities(query, { signal })
      : await searchFXAssets(query, { signal });
    dispatch({ type: 'SET_IS_SEARCHING', payload: { assetType, status: false } });

    // Assuming search results have a consistent structure with a 'name' field
    if (results && results.length > 0) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: { assetType, results } });
    } else {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: { assetType, results: [] } });
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error(`Search for ${assetType} failed:`, err);
      dispatch({ type: 'SET_IS_SEARCHING', payload: { assetType, status: false } });
    }
  }
}, 500);

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  const [state, dispatch] = useReducer(formReducer, {
    accounts: [],
    positions: {
      security: seedPositions?.security || [createNewPosition('security')],
      cash: seedPositions?.cash || [createNewPosition('cash')],
      crypto: seedPositions?.crypto || [createNewPosition('crypto')],
      metal: seedPositions?.metal || [createNewPosition('metal')],
      otherAssets: seedPositions?.otherAssets || [createNewPosition('otherAssets')]
    },
    expandedSections: {},
    isSubmitting: false,
    showValues: true,
    focusedCell: null,
    message: { type: '', text: '', details: [] },
    activeFilter: 'all',
    searchTerm: '',
    showQueue: false,
    selectedAccountFilter: new Set(),
    selectedInstitutionFilter: new Set(),
    searchResults: {},
    isSearching: {},
  });

  const {
    accounts, positions, expandedSections, isSubmitting, showValues, focusedCell, message,
    activeFilter, searchTerm, showQueue, selectedAccountFilter, selectedInstitutionFilter,
    searchResults, isSearching
  } = state;

  const cellRefs = useRef({});
  const lastSearchController = useRef({});

  // Fetches accounts once on load
  useEffect(() => {
    if (isOpen) {
      fetchAllAccounts().then(accounts => {
        dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
      });
    }
  }, [isOpen]);

  const assetTypes = useMemo(() => ({
    security: {
      name: 'Security',
      icon: TrendingUp,
      color: { main: 'green', bg: 'bg-green-600', lightBg: 'bg-green-50', text: 'text-green-700' },
      searchField: 'ticker',
      fields: [
        { key: 'account_id', label: 'Account', type: 'select', options: accounts.map(a => ({ value: a.id, label: a.account_name })), width: 'w-48' },
        { key: 'ticker', label: 'Ticker / Symbol', type: 'text', placeholder: 'e.g., AAPL', width: 'w-40' },
        { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g., Apple Inc.', width: 'w-64' },
        { key: 'shares', label: 'Shares', type: 'number', placeholder: '0.00', width: 'w-24' },
        { key: 'price', label: 'Price (per share)', type: 'number', placeholder: '0.00', width: 'w-28' },
        { key: 'cost_basis', label: 'Cost Basis', type: 'number', placeholder: '0.00', width: 'w-28' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-28' },
      ]
    },
    cash: {
      name: 'Cash',
      icon: DollarSign,
      color: { main: 'teal', bg: 'bg-teal-600', lightBg: 'bg-teal-50', text: 'text-teal-700' },
      fields: [
        { key: 'account_id', label: 'Account', type: 'select', options: accounts.map(a => ({ value: a.id, label: a.account_name })), width: 'w-64' },
        { key: 'amount', label: 'Amount', type: 'number', placeholder: '0.00', width: 'w-48' },
      ]
    },
    crypto: {
      name: 'Cryptocurrency',
      icon: Hash,
      color: { main: 'blue', bg: 'bg-blue-600', lightBg: 'bg-blue-50', text: 'text-blue-700' },
      searchField: 'symbol',
      fields: [
        { key: 'account_id', label: 'Account', type: 'select', options: accounts.map(a => ({ value: a.id, label: a.account_name })), width: 'w-48' },
        { key: 'symbol', label: 'Symbol', type: 'text', placeholder: 'e.g., BTC', width: 'w-24' },
        { key: 'quantity', label: 'Quantity', type: 'number', placeholder: '0.000', width: 'w-32' },
        { key: 'current_price', label: 'Current Price', type: 'number', placeholder: '0.00', width: 'w-28' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', placeholder: '0.00', width: 'w-28' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-28' },
      ]
    },
    metal: {
      name: 'Metals',
      icon: Gem,
      color: { main: 'amber', bg: 'bg-amber-600', lightBg: 'bg-amber-50', text: 'text-amber-700' },
      fields: [
        { key: 'account_id', label: 'Account', type: 'select', options: accounts.map(a => ({ value: a.id, label: a.account_name })), width: 'w-48' },
        { key: 'metal_type', label: 'Type', type: 'text', placeholder: 'e.g., Gold', width: 'w-32' },
        { key: 'quantity', label: 'Ounces/Grams', type: 'number', placeholder: '0.00', width: 'w-32' },
        { key: 'current_price_per_unit', label: 'Current Price', type: 'number', placeholder: '0.00', width: 'w-28' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', placeholder: '0.00', width: 'w-28' },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-28' },
      ]
    },
    otherAssets: {
      name: 'Other Assets',
      icon: Home,
      color: { main: 'purple', bg: 'bg-purple-600', lightBg: 'bg-purple-50', text: 'text-purple-700' },
      fields: [
        { key: 'asset_name', label: 'Asset Name', type: 'text', placeholder: 'e.g., Art Collection', width: 'w-64' },
        { key: 'current_value', label: 'Current Value', type: 'number', placeholder: '0.00', width: 'w-48' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', placeholder: '0.00', width: 'w-48' },
      ]
    }
  }), [accounts]);


  // Handler for all input changes, leveraging the reducer
  const handleInputChange = useCallback((assetType, id, field, value) => {
    dispatch({ type: 'UPDATE_POSITION_FIELD', payload: { assetType, id, field, value } });

    // Handle search for securities and crypto
    if ((field === 'ticker' || field === 'symbol') && (assetType === 'security' || assetType === 'crypto')) {
      const controller = lastSearchController.current[assetType] || new AbortController();
      controller.abort();
      lastSearchController.current[assetType] = new AbortController();
      debouncedSearch(assetType, value, lastSearchController.current[assetType].signal, dispatch);
    }
  }, []);

  const handleSearchSelect = useCallback((assetType, id, selectedResult) => {
    const searchField = assetTypes[assetType].searchField;
    const updatePayload = {
      assetType,
      id,
      field: {
        [searchField]: selectedResult[searchField]
      }
    };
    
    // Auto-fill other fields based on search result
    if (assetType === 'security') {
      updatePayload.field.name = selectedResult.name;
      updatePayload.field.price = selectedResult.current_price;
    } else if (assetType === 'crypto') {
      updatePayload.field.name = selectedResult.name;
      updatePayload.field.current_price = selectedResult.current_price;
    }
    dispatch({ type: 'UPDATE_POSITION_FIELD', payload: updatePayload });
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: { assetType, results: [] } }); // Clear search results after selection
  }, [assetTypes]);

  const addRow = useCallback((assetType) => {
    dispatch({ type: 'ADD_ROW', payload: { assetType, newPosition: createNewPosition(assetType) } });
  }, []);

  const deleteRow = useCallback((assetType, id) => {
    dispatch({ type: 'DELETE_ROW', payload: { assetType, id } });
  }, []);

  const handleSaveAll = useCallback(async () => {
    dispatch({ type: 'SET_GENERAL_STATE', payload: { isSubmitting: true, showQueue: true } });
    const allPositionsToSave = Object.values(positions).flat().filter(pos =>
      (pos.data.account_id || pos.assetType === 'otherAssets') &&
      Object.keys(pos.data).some(key => pos.data[key] !== '' && pos.data[key] !== undefined)
    );
    
    const savePromises = allPositionsToSave.map(async (pos) => {
      let result;
      let error = null;
      try {
        switch (pos.assetType) {
          case 'security':
            result = await addSecurityPosition(pos.data);
            break;
          case 'cash':
            result = await addCashPosition(pos.data);
            break;
          case 'crypto':
            result = await addCryptoPosition(pos.data);
            break;
          case 'metal':
            result = await addMetalPosition(pos.data);
            break;
          case 'otherAssets':
            result = await addOtherAsset(pos.data);
            break;
          default:
            throw new Error(`Unknown asset type: ${pos.assetType}`);
        }
        return { id: pos.id, status: result?.success ? 'success' : 'error', errorMessage: result?.success ? null : result?.message || 'Unknown error' };
      } catch (e) {
        return { id: pos.id, status: 'error', errorMessage: e.message || 'An unknown error occurred.' };
      }
    });

    const results = await Promise.all(savePromises);
    dispatch({ type: 'UPDATE_BULK_STATUS', payload: { updatedPositions: results } });
    dispatch({ type: 'SET_GENERAL_STATE', payload: { isSubmitting: false } });
    onPositionsSaved(); // Trigger parent refresh
  }, [positions, onPositionsSaved]);

  const handleClearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  // JSX for the main modal content
  const renderAssetTable = useCallback((assetType, config) => {
    const filteredPositions = positions[assetType]
      .filter(pos => selectedAccountFilter.size === 0 || selectedAccountFilter.has(pos.data.account_id))
      .filter(pos => {
        if (selectedInstitutionFilter.size === 0) return true;
        const account = accounts.find(a => a.id === pos.data.account_id);
        return account && selectedInstitutionFilter.has(account.institution);
      });
    const totalAssetValue = filteredPositions.reduce((sum, pos) => sum + calculatePositionValue(assetType, pos), 0);
    const getAccountName = (accountId) => accounts.find(acc => acc.id === accountId)?.account_name || 'N/A';

    return (
      <div key={assetType} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <config.icon className={`w-6 h-6 ${config.color.text}`} />
            <h3 className="text-xl font-semibold text-gray-800">{config.name}</h3>
            <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${config.color.bg} text-white`}>
              {positions[assetType].length}
            </span>
          </div>
          {filteredPositions.length > 0 && (
            <div className="text-sm font-medium text-gray-600">
              Total Value: {formatCurrency(totalAssetValue)}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full text-left table-auto">
            <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider sticky top-0">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                {config.fields.map(field => (
                  <th key={field.key} className={`px-4 py-3 ${field.width || ''}`}>{field.label}</th>
                ))}
                <th className="w-20 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map((position) => (
                <tr key={position.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <button onClick={() => deleteRow(assetType, position.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                  {config.fields.map(field => (
                    <td key={field.key} className="p-2 align-top">
                      {field.type === 'select' ? (
                        <select
                          value={position.data[field.key] || ''}
                          onChange={(e) => handleInputChange(assetType, position.id, field.key, e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="">Select Account</option>
                          {field.options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <input
                            type={field.type}
                            value={position.data[field.key] || ''}
                            onChange={(e) => handleInputChange(assetType, position.id, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                          {field.searchable && isSearching[assetType] && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center">
                                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Searching...
                            </div>
                          )}
                          {field.searchable && searchResults[assetType]?.length > 0 && (
                            <ul className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                              {searchResults[assetType].map(result => (
                                <li
                                  key={result.symbol || result.ticker}
                                  onClick={() => handleSearchSelect(assetType, position.id, result)}
                                  className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                >
                                  {result.name} ({result.symbol || result.ticker})
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 align-top">
                    {position.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {position.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={() => addRow(assetType)}
          className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
        >
          <PlusCircle className="w-4 h-4 inline mr-2" /> Add {config.name}
        </button>
      </div>
    );
  }, [positions, accounts, selectedAccountFilter, selectedInstitutionFilter, isSearching, searchResults, handleInputChange, handleSearchSelect, addRow, deleteRow]);

  if (!isOpen) return null;

  return (
    <FixedModal isOpen={isOpen} onClose={onClose}>
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <ListPlus className="w-6 h-6 mr-3 text-blue-600" /> Quick Add Positions
        </h2>
        
        {/* Asset Type Tabs */}
        <div className="flex items-center space-x-3 mb-6 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0">
          <AssetTypeBadge
            type="All"
            count={Object.values(positions).flat().length}
            icon={Layers}
            color={{ main: 'gray', bg: 'bg-gray-600', lightBg: 'bg-gray-50', text: 'text-gray-700' }}
            active={activeFilter === 'all'}
            onClick={() => dispatch({ type: 'SET_GENERAL_STATE', payload: { activeFilter: 'all' } })}
          />
          {Object.entries(assetTypes).map(([type, config]) => (
            <AssetTypeBadge
              key={type}
              type={config.name}
              count={positions[type].length}
              icon={config.icon}
              color={config.color}
              active={activeFilter === type}
              onClick={() => dispatch({ type: 'SET_GENERAL_STATE', payload: { activeFilter: type } })}
            />
          ))}
        </div>

        {/* Filters and View Toggles */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <AccountFilter
              accounts={accounts}
              selectedAccounts={selectedAccountFilter}
              onChange={(ids) => dispatch({ type: 'SET_GENERAL_STATE', payload: { selectedAccountFilter: ids } })}
              filterType="accounts"
            />
            <AccountFilter
              accounts={accounts}
              selectedAccounts={selectedInstitutionFilter}
              onChange={(names) => dispatch({ type: 'SET_GENERAL_STATE', payload: { selectedInstitutionFilter: names } })}
              filterType="institutions"
            />
          </div>
          <ToggleSwitch
            value={showValues}
            onChange={(val) => dispatch({ type: 'SET_GENERAL_STATE', payload: { showValues: val } })}
            leftLabel="Hide Values"
            rightLabel="Show Values"
            leftIcon={EyeOff}
            rightIcon={Eye}
          />
        </div>

        {/* Content based on active filter */}
        <div className="space-y-8">
          {activeFilter === 'all'
            ? Object.entries(assetTypes).map(([type, config]) => renderAssetTable(type, config))
            : renderAssetTable(activeFilter, assetTypes[activeFilter])}
        </div>
      </div>

      {/* Footer and Save button */}
      <div className="flex justify-between items-center px-8 py-6 border-t border-gray-200">
        <button
          onClick={() => dispatch({ type: 'SET_GENERAL_STATE', payload: { showQueue: true } })}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center"
        >
          <ClipboardList className="w-4 h-4 mr-2" /> View Queue
        </button>
        <button
          onClick={handleSaveAll}
          disabled={isSubmitting}
          className={`
            px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 transform
            ${isSubmitting
              ? 'bg-gray-400 cursor-not-allowed animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg hover:shadow-xl'
            }
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</span>
          ) : (
            <span className="flex items-center"><Save className="w-5 h-5 mr-2" /> Save All Positions</span>
          )}
        </button>
      </div>

      {/* Queue Modal */}
      <QueueModal
        isOpen={showQueue}
        onClose={() => dispatch({ type: 'SET_GENERAL_STATE', payload: { showQueue: false } })}
        positions={positions}
        assetTypes={assetTypes}
        accounts={accounts}
        onClearCompleted={handleClearCompleted}
      />
    </FixedModal>
  );
};

export default AddQuickPositionModal;