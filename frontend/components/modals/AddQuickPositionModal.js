import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import debounce from 'lodash.debounce';
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
import ReactDOM from 'react-dom';

// Account categories definition
const ACCOUNT_CATEGORIES = [
  { id: "brokerage", name: "Brokerage", icon: Briefcase },
  { id: "retirement", name: "Retirement", icon: Building },
  { id: "cash", name: "Cash / Banking", icon: DollarSign },
  { id: "cryptocurrency", name: "Cryptocurrency", icon: Hash },
  { id: "metals", name: "Metals Storage", icon: Shield },
  { id: "real_estate", name: "Real Estate", icon: Home }
];

// pure constant – safe to define above; doesn’t change per render
export const REQUIRED_BY_TYPE = {
  security: ["ticker","shares","price","cost_basis","purchase_date","account_id"],
  crypto:   ["symbol","quantity","purchase_price","current_price","purchase_date","account_id"],
  metal:    ["metal_type","symbol","quantity","purchase_price","current_price_per_unit","purchase_date","account_id"],
  cash:     ["cash_type","amount","account_id"],
  other:    ["asset_name","current_value"], // maps your “otherAssets”
};

// Enhanced AnimatedNumber with smooth transitions
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

// Progress indicator component
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

// Asset type badge component
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

// Toggle switch component
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

// Enhanced Account filter component with institution support
// Enhanced Account filter component with institution support
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
  
  // Get unique institutions
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
  
  // New handler for Select All
  const handleSelectAll = () => {
    if (filterType === 'institutions') {
      const allInstitutions = new Set(uniqueInstitutions);
      onChange(allInstitutions);
    } else {
      const allAccountIds = new Set(accounts.map(acc => acc.id));
      onChange(allAccountIds);
    }
  };
  
  // New handler for Select None
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
              {/* New Select All/None buttons */}
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
              // Institution filter view
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
              // Account filter view (existing)
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

// Queue modal component
const QueueModal = ({ isOpen, onClose, positions, assetTypes, accounts, onClearCompleted, getRowStatus }) => {
  const getStatusBadge = (position) => {
    const status = getRowStatus(position);
    
    switch (status) {
      case 'added':
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
      case 'submitting':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Submitting
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </span>
        );
    }
  };

  const allPositions = useMemo(() => {
    const result = [];
    Object.entries(positions).forEach(([type, typePositions]) => {
      typePositions.forEach(pos => {
        // Include otherAssets even without account_id
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
    const counts = { total: 0, added: 0, error: 0, ready: 0, draft: 0, submitting: 0 };
    allPositions.forEach(pos => {
      counts.total++;
      const status = getRowStatus(pos);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [allPositions, getRowStatus]);

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
              <span className="text-gray-500">Ready:</span>
              <span className="font-semibold text-emerald-600">{stats.ready}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Draft:</span>
              <span className="font-semibold text-amber-600">{stats.draft}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Submitting:</span>
              <span className="font-semibold text-blue-600">{stats.submitting}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Added:</span>
              <span className="font-semibold text-green-600">{stats.added}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Errors:</span>
              <span className="font-semibold text-red-600">{stats.error}</span>
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
                        {getStatusBadge(position)}
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
            disabled={stats.added === 0}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${stats.added === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <CheckCheck className="w-4 h-4 inline mr-2" />
            Clear Added ({stats.added})
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

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // --- Seed identity ---
  const seedString = JSON.stringify(seedPositions ?? {});
  const seedId = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seedString.length; i++) h = (h * 31 + seedString.charCodeAt(i)) | 0;
    return String(h);
  }, [seedString]);

  // immutable initial seed per seedId
  const initialSeedRef = React.useRef({ seedId: null, value: null });
  // Core state
  const [accounts, setAccounts] = useState([]);

  // lock the initial seed once per seedId
  useEffect(() => {
    if (initialSeedRef.current.seedId !== seedId) {
      initialSeedRef.current = {
        seedId,
        value: seedPositions || { security: [], cash: [], crypto: [], metal: [], otherAssets: [] }
      };
    }
  }, [seedId, seedPositions]);


  // fast lookup for mapping Excel seeds → account_id
  const accountIndexRef = useRef({ byName: new Map(), byNameInst: new Map() });

  // simple normalizer for matching
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // build two indices: by account_name, and by account_name + institution
  const buildAccountIndex = (list = []) => {
    const byName = new Map();
    const byNameInst = new Map();
    list.forEach(a => {
      const n = norm(a.account_name);
      const i = norm(a.institution);
      if (n) byName.set(n, a);
      byNameInst.set(`${n}::${i}`, a);
    });
    accountIndexRef.current = { byName, byNameInst };
  };
  const [positions, setPositions] = useState({
    security: [],
    cash: [],
    crypto: [],
    metal: [],
    otherAssets: []  
  });
  const [expandedSections, setExpandedSections] = useState({});
  const [accountExpandedSections, setAccountExpandedSections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** UI/Autosave guards */
  const [autosavePaused, setAutosavePaused] = useState(false);
  const saveTimerRef = useRef(null);

  /** Debounced draft saver (no-ops during submissions) */
  const saveDraft = useCallback((key, data) => {
    if (autosavePaused) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    }, 400); // debounce to avoid main-thread thrash
  }, [autosavePaused]);

  const [showValues, setShowValues] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const seedAppliedRef = useRef(false);
  const [focusedCell, setFocusedCell] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '', details: [] });
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [validationMode, setValidationMode] = useState('realtime');
  const [recentlyUsedAccounts, setRecentlyUsedAccounts] = useState([]);
  const [viewMode, setViewMode] = useState(false); // false = by asset type, true = by account
  const [showQueue, setShowQueue] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState(new Set());
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState(new Set());
  
  // Search state
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [selectedSecurities, setSelectedSecurities] = useState({});
  
  // Refs
  const cellRefs = useRef({});
  const tableRefs = useRef({});
  const messageTimeoutRef = useRef(null);

  // ── Validate a single row's readiness
    const validateRow = useCallback((row) => {
      const t = row.type === "otherAssets" ? "other" : row.type;
      const req = REQUIRED_BY_TYPE[t] || [];
      const missing = [];
      
      // Fields that must be positive numbers (not just present)
      const numericFields = [
        'shares', 'quantity', 'amount', 'price', 'purchase_price', 
        'current_price', 'current_price_per_unit', 'cost_basis', 'current_value'
      ];
      
      for (const k of req) {
        const v = row.data?.[k];
        
        // Check for missing/empty
        if (v === undefined || v === null || v === "") {
          missing.push(k);
        } 
        // Check numeric fields are positive
        else if (numericFields.includes(k)) {
          const num = Number(v);
          if (!Number.isFinite(num) || num <= 0) {
            missing.push(k);
          }
        }
      }
      
      return { ok: missing.length === 0, missing };
    }, []);

  // ── Compute status label for UI (authoritative)
  const getRowStatus = (row) => {
    // If a server-side status is present, use it; otherwise fall back to validation
    if (row?.status === "submitting") return "submitting";
    if (row?.status === "added") return "added";
    if (row?.status === "error") return "error";
    return validateRow(row).ok ? "ready" : "draft";
  };

  // 'any' | 'ready' | 'draft' | 'submitting' | 'added' | 'error' | 'issues'
  const [statusFilter, setStatusFilter] = useState('any');

  const matchesStatusFilter = (row) => {
    if (statusFilter === 'any') return true;
    const s = getRowStatus(row);
    if (statusFilter === 'issues') return s === 'draft' || s === 'error';
    return s === statusFilter;
  };


  // ---- Account indexing + seed mapping ----
  const accountIndex = useRef({ byName: new Map(), byNameInst: new Map() });

  const mapSeedAccountId = (data = {}) => {
    // Already an id?
    if (data.account_id) {
      const n = Number(data.account_id);
      return { ...data, account_id: Number.isFinite(n) ? n : data.account_id };
    }

    // Pull common Excel columns
    const rawName = (data.account_name ?? data.account ?? '').toString().trim();
    const rawInst = (data.institution ?? data.bank ?? data.brokerage ?? '').toString().trim();

    if (!rawName && !rawInst) return data;

    const name = rawName.toLowerCase();
    const inst = rawInst.toLowerCase();
    const { byName, byNameInst } = accountIndex.current;

    // (1) Exact: name + institution
    const hitBoth = byNameInst.get(`${name}::${inst}`);
    if (hitBoth?.id) return { ...data, account_id: hitBoth.id };

    // (2) Exact: name only
    const hitName = byName.get(name);
    if (hitName?.id) return { ...data, account_id: hitName.id };

    // (3) Loose: if name is unique prefix
    const loose = [...byName.keys()].filter(k => k.startsWith(name));
    if (name && loose.length === 1) {
      const a = byName.get(loose[0]);
      if (a?.id) return { ...data, account_id: a.id };
    }

    // Give up (leave unmapped)
    return data;
  };

  // Normalize one seed row (applies account mapping)
  const normalizeSeedRow = (row, type) => ({
    id: row?.id ?? (Date.now() + Math.random()),
    type,
    data: mapSeedAccountId(row?.data ?? row),
    errors: row?.errors ?? {},
    isNew: true,
    animateIn: true
  });

  // Backfill any rows missing account_id after accounts load
  const backfillSeedAccountIds = () => {
    setPositions(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(t => {
        next[t] = next[t].map(p => {
          if (t === 'otherAssets') return p; // those don't use account_id
          if (p?.data?.account_id) return p;
          const mapped = mapSeedAccountId(p?.data);
          return mapped === p?.data ? p : { ...p, data: mapped };
        });
      });
      return next;
    });
  };


  // ── Issue/ready helpers
  const isIssueRow = (row) => {
    const s = getRowStatus(row); // uses validateRow internally
    return s === 'draft' || s === 'error';
  };
  const isReadyRow = (row) => getRowStatus(row) === 'ready';

  const getAllIssueRowIds = () => {
    const ids = [];
    for (const t of Object.keys(positions)) {
      (positions[t] || []).forEach((p) => {
        if (isIssueRow(p)) ids.push(p.id);
      });
    }
    return ids;
  };

  const getAllReadyRows = () => {
    const entries = [];
    for (const [t, arr] of Object.entries(positions)) {
      (arr || []).forEach((p) => {
        if (isReadyRow(p)) entries.push({ type: t, position: p });
      });
    }
    return entries;
  };

  // ── Selection toggles

  // rowId is the position.id
  const toggleRowSelected = useCallback((rowId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(rowId); else next.delete(rowId);
      return next;
    });
  }, []);

  // Toggle all for a given assetType block
  const toggleAllSelectedForType = useCallback((assetType, checked) => {
    setSelectedIds(prev => {
      if (!checked) return new Set([...prev].filter(id => !positions[assetType].some(p => p.id === id)));
      const next = new Set(prev);
      positions[assetType].forEach(p => next.add(p.id));
      return next;
    });
  }, [positions]);


  // Enhanced asset type configuration with required fields
  const assetTypes = {
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
      description: 'Stocks, ETFs, Mutual Funds',
      emoji: '📈',
      searchable: true,
      searchField: 'ticker',
      fields: [
        { key: 'ticker', label: 'Ticker', type: 'text', required: true, width: 'w-28', placeholder: 'AAPL', transform: 'uppercase', autocomplete: true, searchable: true },
        { key: 'name', label: 'Company', type: 'text', width: 'w-48', readOnly: true, placeholder: 'Auto-filled' },
        { key: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-24', placeholder: '100', min: 0, step: 1 },
        { key: 'price', label: 'Current Price', type: 'number', required: true, width: 'w-28', placeholder: 'Auto', prefix: '$', min: 0, step: 0.01, readOnly: true, autoFill: true },
        { key: 'cost_basis', label: 'Cost Basis', type: 'number', required: true, width: 'w-28', placeholder: '140.00', prefix: '$', min: 0, step: 0.01 },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0] },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
       ]
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
      description: 'Savings, Checking, Money Market',
      emoji: '💵',
      fields: [
        { 
          key: 'cash_type', 
          label: 'Type', 
          type: 'select',
          required: true,
          width: 'w-32',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Savings', label: '💰 Savings' },
            { value: 'Checking', label: '💳 Checking' },
            { value: 'Money Market', label: '📊 Money Market' },
            { value: 'CD', label: '🔒 CD' }
          ]
        },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' },
        { key: 'amount', label: 'Amount', type: 'number', required: true, width: 'w-32', placeholder: '10000', prefix: '$', min: 0 },
        { key: 'interest_rate', label: 'APY', type: 'number', width: 'w-24', placeholder: '2.5', suffix: '%', step: '0.01', min: 0, max: 100 },
        { 
          key: 'interest_period', 
          label: 'Period', 
          type: 'select', 
          width: 'w-28',
          options: [
            { value: 'annually', label: 'Annually' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' }
          ]
        },
        { key: 'maturity_date', label: 'Maturity', type: 'date', width: 'w-36' },
      ]
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
      description: 'Bitcoin, Ethereum, Altcoins',
      emoji: '🪙',
      searchable: true,
      searchField: 'symbol',
      fields: [
        { key: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24', placeholder: 'BTC', transform: 'uppercase', autocomplete: true, searchable: true },
        { key: 'name', label: 'Name', type: 'text', width: 'w-48', readOnly: true, placeholder: 'Auto-filled' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28', placeholder: '0.5', step: '0.00000001', min: 0 },
        { key: 'purchase_price', label: 'Buy Price', type: 'number', required: true, width: 'w-32', placeholder: '45000', prefix: '$', min: 0 },
        { key: 'current_price', label: 'Current Price', type: 'number', width: 'w-32', placeholder: 'Auto', prefix: '$', min: 0, readOnly: true, autoFill: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0]  },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
      ]
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
      description: 'Gold, Silver, Platinum',
      emoji: '🥇',
      searchable: true,
      searchField: 'metal_type',
      fields: [
        { 
          key: 'metal_type', 
          label: 'Metal', 
          type: 'select', 
          required: true, 
          width: 'w-32',
          searchable: true,
          options: [
            { value: '', label: 'Select...' },
            { value: 'Gold', label: '🥇 Gold', symbol: 'GC=F' },
            { value: 'Silver', label: '🥈 Silver', symbol: 'SI=F' },
            { value: 'Platinum', label: '💎 Platinum', symbol: 'PL=F' },
            { value: 'Copper', label: '🟫 Copper', symbol: 'HG=F' },
            { value: 'Palladium', label: '⚪ Palladium', symbol: 'PA=F' }
          ]
        },
        { key: 'symbol', label: 'Symbol', type: 'text', width: 'w-24', readOnly: true, placeholder: 'Auto-filled' },
        { key: 'name', label: 'Market Name', type: 'text', width: 'w-48', readOnly: true, placeholder: 'Auto-filled' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-24', placeholder: '10', min: 0 },
        { key: 'unit', label: 'Unit', type: 'text', width: 'w-20', readOnly: true, default: 'oz' },
        { key: 'purchase_price', label: 'Price/Unit', type: 'number', required: true, width: 'w-28', placeholder: '1800', prefix: '$', min: 0 },
        { key: 'current_price_per_unit', label: 'Current/Unit', type: 'number', width: 'w-28', placeholder: 'Auto', prefix: '$', min: 0, readOnly: true, autoFill: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0]  },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
      ]
    },
    otherAssets: {
      name: 'Other Assets',
      icon: Home, // Or you could use a different icon like Gem, Building2, etc.
      color: {
        main: 'green',
        bg: 'bg-green-600',
        lightBg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        hover: 'hover:bg-green-100',
        gradient: 'from-green-500 to-green-600'
      },
      description: 'Real Estate, Vehicles, Collectibles',
      emoji: '🏠',
      fields: [
        { key: 'asset_name', label: 'Asset Name', type: 'text', required: true, width: 'w-48', placeholder: '123 Main Residence St' },
        { 
          key: 'asset_type', 
          label: 'Type', 
          type: 'select', 
          required: true,
          width: 'w-32',
          options: [
            { value: '', label: 'Select...' },
            { value: 'real_estate', label: '🏠 Real Estate' },
            { value: 'vehicle', label: '🚗 Vehicle' },
            { value: 'collectible', label: '🎨 Collectible' },
            { value: 'jewelry', label: '💎 Jewelry' },
            { value: 'art', label: '🖼️ Art' },
            { value: 'equipment', label: '🔧 Equipment' },
            { value: 'other', label: '📦 Other' }
          ]
        },
        { key: 'cost', label: 'Purchase Price', type: 'number', width: 'w-32', placeholder: '500000', prefix: '$', min: 0 },
        { key: 'current_value', label: 'Current Value', type: 'number', required: true, width: 'w-32', placeholder: '550000', prefix: '$', min: 0 },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0]},
        { key: 'notes', label: 'Notes', type: 'text', width: 'w-52', placeholder: 'Additional details...' }
      ]
    }
  };


  // Load accounts
  const loadAccounts = async () => {
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);

      // build mapping indices for name/institution → account_id
      buildAccountIndex(fetchedAccounts);
      
      const recentIds = fetchedAccounts.slice(0, 3).map(a => a.id);
      setRecentlyUsedAccounts(recentIds);
      
      // Select all by default
      setSelectedAccountFilter(new Set(fetchedAccounts.map(acc => acc.id)));
      setSelectedInstitutionFilter(new Set(fetchedAccounts.map(acc => acc.institution).filter(Boolean)));
    } catch (error) {
      console.error('Error loading accounts:', error);
      showMessage('error', 'Failed to load accounts', [`Error: ${error.message}`]);
    }
  };


  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query, assetType, positionId) => {
      if (!query || query.length < 1) {
        setSearchResults(prev => ({
          ...prev,
          [`${assetType}-${positionId}`]: []
        }));
        setIsSearching(prev => ({
          ...prev,
          [`${assetType}-${positionId}`]: false
        }));
        return;
      }
      
      const searchKey = `${assetType}-${positionId}`;
      setIsSearching(prev => ({ ...prev, [searchKey]: true }));
      
      try {
        const results = await searchSecurities(query);
        
        // Filter results based on asset type
        const filteredResults = assetType === 'security' 
          ? results.filter(item => item.asset_type === 'security' || item.asset_type === 'index')
          : assetType === 'crypto'
          ? results.filter(item => item.asset_type === 'crypto')
          : results; // For other types, don't filter
        
        // For metals, automatically select the first result
        if (assetType === 'metal' && filteredResults.length > 0) {
          handleSelectSecurity(assetType, positionId, filteredResults[0]);
          // Clear search results since we auto-selected
          setSearchResults(prev => ({
            ...prev,
            [searchKey]: []
          }));
        } else {
          // For other types, show the dropdown
          setSearchResults(prev => ({
            ...prev,
            [searchKey]: filteredResults
          }));
        }
      } catch (error) {
        console.error('Error searching securities:', error);
        setSearchResults(prev => ({
          ...prev,
          [searchKey]: []
        }));
      } finally {
        setIsSearching(prev => ({ ...prev, [searchKey]: false }));
      }
    }, 300),
    []
  );

    useEffect(() => {
      if (!isOpen) return;

      loadAccounts();

      const key = `quickpositions:work:${seedId}`;

      // one-time init per seedId
      if (initialSeedRef.current.seedId === seedId && !seedAppliedRef.current) {
        // Try restoring an existing draft for this seedId
        const saved = localStorage.getItem(key);

        if (saved) {
          setPositions(JSON.parse(saved));
        } else {
          // Build a *working copy* from the immutable initial seed (no future re-seeding)
          const base = initialSeedRef.current.value || {};
          const castSeed = (rows, type) => {
            const { byName, byNameInst } = accountIndexRef.current;

            const normalizeKeys = (obj = {}) => {
              const out = {};
              for (const [k, v] of Object.entries(obj)) {
                const nk = k.toString().trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_');
                out[nk] = v;
              }
              return out;
            };

            const mapSeedAccountId = (raw = {}) => {
              const data = normalizeKeys(raw);
              if (data.account_id != null && data.account_id !== '') return { ...raw, account_id: data.account_id };

              const name = (data.account_name ?? data.account ?? data.acct_name ?? data.name ?? '').toString().trim();
              const inst = (data.institution ?? data.institution_name ?? data.bank ?? data.brokerage ?? data.custodian ?? '').toString().trim();
              if (!name) return raw;

              const n = norm(name);
              const i = norm(inst);

              const hit = (byNameInst && byNameInst.get(`${n}::${i}`)) || (byName && byName.get(n));
              return hit ? { ...raw, account_id: hit.id } : raw;
            };

            return (rows ?? []).map((r) => {
              const baseRow = mapSeedAccountId(r?.data ?? r);
              return {
                id: r?.id ?? (Date.now() + Math.random()),
                type,
                data: baseRow,
                errors: r?.errors ?? {},
                isNew: true,
                animateIn: true
              };
            });
          };

          const hasSeeds = !!(
            base &&
            (base.security?.length ||
              base.cash?.length ||
              base.crypto?.length ||
              base.metal?.length ||
              base.otherAssets?.length)
          );

          const working = hasSeeds
            ? {
                security: castSeed(base.security, 'security'),
                cash:     castSeed(base.cash, 'cash'),
                crypto:   castSeed(base.crypto, 'crypto'),
                metal:    castSeed(base.metal, 'metal'),
                otherAssets: castSeed(base.otherAssets, 'otherAssets')
              }
            : { security: [], cash: [], crypto: [], metal: [], otherAssets: [] };

          setPositions(working);
          localStorage.setItem(key, JSON.stringify(working));
        }

        seedAppliedRef.current = true;
      }

      // reset UI chrome each open (keep as you had it)
      setExpandedSections({});
      setAccountExpandedSections({});
      setMessage({ type: '', text: '', details: [] });
      setActiveFilter('all');
      setSearchResults({});
      setSelectedSecurities({});
      setShowKeyboardShortcuts(false);

      setTimeout(() => {
        try { autoHydrateSeededPrices?.(); } catch (e) { console.error(e); }
      }, 0);

      return () => {
        if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      };
      // IMPORTANT: init is keyed by seedId; do NOT depend on seedPositions here or you'll re-seed
    }, [isOpen, seedId]);


    // Persist working copy (debounced) keyed by seedId; paused during submissions
    useEffect(() => {
      if (!isOpen) return;
      const key = `quickpositions:work:${seedId}`;
      saveDraft(key, positions);
    }, [isOpen, seedId, positions, saveDraft]);


  // If seeds arrived before accounts, fill in account_id once both are ready
  useEffect(() => {
    if (!isOpen) return;
    if (!accounts || accounts.length === 0) return;
    backfillSeedAccountIds();
    // persist after backfill so it sticks
    const key = `quickpositions:work:${seedId}`;
    saveDraft(key, positions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accounts.length]);

  
  
  // Enhanced message display
  const showMessage = (type, text, details = [], duration = 5000) => {
    setMessage({ type, text, details });
    
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    
    if (duration > 0) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage({ type: '', text: '', details: [] });
      }, duration);
    }
  };

  // Add new row for account
  const addNewRowForAccount = (accountId, assetType) => {
    const newPosition = {
      id: Date.now() + Math.random(),
      type: assetType,
      data: { account_id: accountId },
      errors: {},
      isNew: true,
      animateIn: true
    };
    
    setPositions(prev => ({
      ...prev,
      [assetType]: [...prev[assetType], newPosition]
    }));
    
    // Expand the account section for this asset type
    setAccountExpandedSections(prev => ({
      ...prev,
      [`${accountId}-${assetType}`]: true
    }));
    
    setTimeout(() => {
      const firstFieldKey = assetTypes[assetType].fields[0].key;
      const cellKey = `${assetType}-${newPosition.id}-${firstFieldKey}`;
      cellRefs.current[cellKey]?.focus();
    }, 100);
  };

  // Add new row
  const addNewRow = (assetType) => {
    const lastPosition = positions[assetType][positions[assetType].length - 1];
    const defaultData = {};
    
    // Apply field defaults
    assetTypes[assetType].fields.forEach(field => {
      if (field.default !== undefined) {
        defaultData[field.key] = field.default;
      }
    });
    
    if (lastPosition && lastPosition.data.account_id) {
      defaultData.account_id = lastPosition.data.account_id;
    }
    if (assetType === 'cash' && lastPosition?.data.currency) {
      defaultData.currency = lastPosition.data.currency;
    }

    if (assetType === 'cash') {
    defaultData.interest_period = 'annually';  
    }
    
    const newPosition = {
      id: Date.now() + Math.random(),
      type: assetType,
      data: defaultData,
      errors: {},
      isNew: true,
      animateIn: true
    };
    
    setPositions(prev => ({
      ...prev,
      [assetType]: [...prev[assetType], newPosition]
    }));
    
    if (!expandedSections[assetType]) {
      setExpandedSections(prev => ({ ...prev, [assetType]: true }));
    }
    
    setTimeout(() => {
      const firstFieldKey = assetTypes[assetType].fields[0].key;
      const cellKey = `${assetType}-${newPosition.id}-${firstFieldKey}`;
      cellRefs.current[cellKey]?.focus();
    }, 100);
  };

  // Enhanced keyboard navigation
  const handleKeyDown = (e, assetType, positionId, fieldIndex) => {
    const typePositions = positions[assetType];
    const positionIndex = typePositions.findIndex(p => p.id === positionId);
    const fields = assetTypes[assetType].fields;
    
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          submitAll();
          return;
        case 's':
          e.preventDefault();
          submitAll();
          return;
        case 'k':
          e.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          return;
      }
    }
    
    switch (e.key) {
      case 'Tab':
        if (!e.shiftKey && fieldIndex === fields.length - 1 && positionIndex === typePositions.length - 1) {
          e.preventDefault();
          addNewRow(assetType);
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (e.shiftKey) {
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
            [assetType]: [
              ...prev[assetType].slice(0, positionIndex),
              newPosition,
              ...prev[assetType].slice(positionIndex)
            ]
          }));
        } else if (fieldIndex === fields.length - 1) {
          addNewRow(assetType);
        } else {
          const nextKey = `${assetType}-${positionId}-${fields[fieldIndex + 1].key}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (e.altKey) {
          if (positionIndex < typePositions.length - 1) {
            const newPositions = [...typePositions];
            [newPositions[positionIndex], newPositions[positionIndex + 1]] = 
            [newPositions[positionIndex + 1], newPositions[positionIndex]];
            setPositions(prev => ({ ...prev, [assetType]: newPositions }));
          }
        } else if (positionIndex < typePositions.length - 1) {
          const nextPositionId = typePositions[positionIndex + 1].id;
          const nextKey = `${assetType}-${nextPositionId}-${fields[fieldIndex].key}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (e.altKey) {
          if (positionIndex > 0) {
            const newPositions = [...typePositions];
            [newPositions[positionIndex], newPositions[positionIndex - 1]] = 
            [newPositions[positionIndex - 1], newPositions[positionIndex]];
            setPositions(prev => ({ ...prev, [assetType]: newPositions }));
          }
        } else if (positionIndex > 0) {
          const prevPositionId = typePositions[positionIndex - 1].id;
          const prevKey = `${assetType}-${prevPositionId}-${fields[fieldIndex].key}`;
          cellRefs.current[prevKey]?.focus();
        }
        break;
        
      case 'Delete':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          deletePosition(assetType, positionId);
        }
        break;
        
      case 'd':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          duplicatePosition(assetType, positions[assetType].find(p => p.id === positionId));
        }
        break;
    }
  };

  // Handle security selection from search
  const handleSelectSecurity = (assetType, positionId, security) => {
    const searchKey = `${assetType}-${positionId}`;
    setSelectedSecurities((prev) => ({ ...prev, [searchKey]: security }));

    const px = getQuotePrice(security); // numeric or undefined

    setPositions((prev) => ({
      ...prev,
      [assetType]: prev[assetType].map((pos) => {
        if (pos.id !== positionId) return pos;
        const d = { ...pos.data };

        if (assetType === 'security') {
          d.ticker = security.ticker;
          if (px != null) d.price = px;               // number
          d.name = security.name;
          if (d.cost_basis == null && d.price != null) d.cost_basis = d.price;
        } else if (assetType === 'crypto') {
          d.symbol = security.ticker;
          if (px != null) d.current_price = px;       // number
          d.name = security.name;
          if (d.purchase_price == null && d.current_price != null) d.purchase_price = d.current_price;
        } else if (assetType === 'metal') {
          d.symbol = security.ticker;
          if (px != null) d.current_price_per_unit = px; // number
          d.name = security.name;
          if (d.purchase_price == null && d.current_price_per_unit != null) d.purchase_price = d.current_price_per_unit;
        }

        return { ...pos, data: d, errors: { ...pos.errors } };
      }),
    }));

    // Clear search results for this row
    setSearchResults((prev) => ({ ...prev, [searchKey]: [] }));
  };

  // --- NEW: auto-hydrate current prices for seeded rows after Excel import ---
  const metalSymbolByType = {
    Gold: 'GC=F',
    Silver: 'SI=F',
    Platinum: 'PL=F',
    Copper: 'HG=F',
    Palladium: 'PA=F',
  };

  // Prefer numeric; tolerate multiple field names across providers
  const getQuotePrice = (s) => {
    const v =
      s?.price ??
      s?.current_price ??
      s?.regularMarketPrice ??
      s?.regular_market_price ??
      s?.last ??
      s?.close ??
      s?.value ??
      s?.mark;

    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  
  const autoHydrateSeededPrices = useCallback(async () => {
    // Build work items off *current* positions
    const work = [];

    positions.security.forEach((p) => {
      const q = p?.data?.ticker || p?.data?.symbol;
      // hydrate only if missing price
      if (q && (p?.data?.price == null || p?.data?.price === '' || Number(p?.data?.price) === 0)) {
        work.push({ type: 'security', id: p.id, q });
      }
    });

    positions.crypto.forEach((p) => {
      const q = p?.data?.symbol || p?.data?.ticker;
      if (q && (p?.data?.current_price == null || p?.data?.current_price === '' || Number(p?.data?.current_price) === 0)) {
        work.push({ type: 'crypto', id: p.id, q });
      }
    });

    positions.metal.forEach((p) => {
      const q = p?.data?.symbol || metalSymbolByType[p?.data?.metal_type];
      if (q && (p?.data?.current_price_per_unit == null || p?.data?.current_price_per_unit === '' || Number(p?.data?.current_price_per_unit) === 0)) {
        work.push({ type: 'metal', id: p.id, q });
      }
    });

    if (!work.length) return;

    // Run lookups in parallel then apply selections
    const chunks = await Promise.all(
      work.map(async (item) => {
        try {
          const results = await searchSecurities(item.q);

          let filtered = Array.isArray(results) ? results : [];
          if (item.type === 'security') {
            filtered = filtered.filter((r) => r.asset_type === 'security' || r.asset_type === 'index');
          } else if (item.type === 'crypto') {
            filtered = filtered.filter((r) => r.asset_type === 'crypto');
          } // metals: keep as-is

          const exact = filtered.find(
            (r) => String(r.ticker || '').toUpperCase() === String(item.q).toUpperCase()
          );
          const chosen = exact || filtered[0];

          return chosen ? { ...item, chosen } : null;
        } catch (e) {
          console.warn('Hydrate lookup failed', item, e);
          return null;
        }
      })
    );

    // Apply selections (which set the correct price fields)
    for (const hit of chunks) {
      if (hit?.chosen) {
        handleSelectSecurity(hit.type, hit.id, hit.chosen);
      }
    }
  }, [positions, handleSelectSecurity]);

  const hydratedIdsRef = useRef(new Set());

    // Run once when seeded rows are in state - only hydrate rows that haven't been hydrated yet
    useEffect(() => {
        if (!isOpen) return;

        const needsHydration = [];
        
        // Check security positions
        positions.security.forEach(p => {
          const q = p?.data?.ticker || p?.data?.symbol;
          if (q && !hydratedIdsRef.current.has(p.id) && 
              (p?.data?.price == null || p?.data?.price === '' || Number(p?.data?.price) === 0)) {
            needsHydration.push({ type: 'security', id: p.id, q });
          }
        });

        // Check crypto positions
        positions.crypto.forEach(p => {
          const q = p?.data?.symbol || p?.data?.ticker;
          if (q && !hydratedIdsRef.current.has(p.id) && 
              (p?.data?.current_price == null || p?.data?.current_price === '' || Number(p?.data?.current_price) === 0)) {
            needsHydration.push({ type: 'crypto', id: p.id, q });
          }
        });

        // Check metal positions
        positions.metal.forEach(p => {
          const q = p?.data?.symbol || metalSymbolByType[p?.data?.metal_type];
          if (q && !hydratedIdsRef.current.has(p.id) && 
              (p?.data?.current_price_per_unit == null || p?.data?.current_price_per_unit === '' || Number(p?.data?.current_price_per_unit) === 0)) {
            needsHydration.push({ type: 'metal', id: p.id, q });
          }
        });

        if (needsHydration.length === 0) return;

        // Defer one tick so row UIs mount
        const t = setTimeout(async () => {
          try {
            // Hydrate and mark as hydrated
            const chunks = await Promise.all(
              needsHydration.map(async (item) => {
                try {
                  const results = await searchSecurities(item.q);
                  let filtered = Array.isArray(results) ? results : [];
                  if (item.type === 'security') {
                    filtered = filtered.filter((r) => r.asset_type === 'security' || r.asset_type === 'index');
                  } else if (item.type === 'crypto') {
                    filtered = filtered.filter((r) => r.asset_type === 'crypto');
                  }
                  const exact = filtered.find(
                    (r) => String(r.ticker || '').toUpperCase() === String(item.q).toUpperCase()
                  );
                  const chosen = exact || filtered[0];
                  return chosen ? { ...item, chosen } : null;
                } catch (e) {
                  console.warn('Hydrate lookup failed', item, e);
                  return null;
                }
              })
            );

            // Apply selections and mark as hydrated
            for (const hit of chunks) {
              if (hit?.chosen) {
                handleSelectSecurity(hit.type, hit.id, hit.chosen);
                hydratedIdsRef.current.add(hit.id);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }, 0);

        return () => clearTimeout(t);
      }, [
        isOpen,
        positions.security.length,
        positions.crypto.length,
        positions.metal.length
      ]);


  
  // Update position with search trigger
  const updatePosition = (assetType, positionId, field, value) => {
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos => {
        if (pos.id === positionId) {
          const fieldConfig = assetTypes[assetType].fields.find(f => f.key === field);
          
          if (fieldConfig?.transform === 'uppercase') {
            value = value.toUpperCase();
          }
          
          // Special handling for metal type selection
          if (assetType === 'metal' && field === 'metal_type' && value) {
            const selectedOption = fieldConfig.options.find(o => o.value === value);
            if (selectedOption?.symbol) {
              // Update multiple fields at once when metal type is selected
              const updatedData = {
                ...pos.data,
                metal_type: value,
                symbol: selectedOption.symbol,
                name: `${value} Futures` // Or whatever naming convention you prefer
              };
              
              // Still trigger search to get current price
              debouncedSearch(selectedOption.symbol, assetType, positionId);
              
              return {
                ...pos,
                data: updatedData,
                errors: { ...pos.errors },
                isNew: false,
                animateIn: false
              };
            }
          }
          // Regular search for other searchable fields
          else if (fieldConfig?.searchable && assetTypes[assetType].searchable) {
            debouncedSearch(value, assetType, positionId);
          }
          
          let error = null;
          if (validationMode === 'realtime') {
            if (fieldConfig?.required && !value) {
              error = 'Required';
            } else if (fieldConfig?.min !== undefined && value < fieldConfig.min) {
              error = `Min: ${fieldConfig.min}`;
            } else if (fieldConfig?.max !== undefined && value > fieldConfig.max) {
              error = `Max: ${fieldConfig.max}`;
            }
          }
          
          return {
            ...pos,
            data: { ...pos.data, [field]: value },
            errors: { ...pos.errors, [field]: error },
            isNew: false,
            animateIn: false
          };
        }
        return pos;
      })
    }));
  };

  const deletePosition = (assetType, positionId) => {
    const validPositions = assetType === 'otherAssets'
      ? positions[assetType].filter(p => p.data.asset_name && p.data.current_value)
      : positions[assetType].filter(p => p.data.account_id);

    if (validPositions.length > 5 && !window.confirm('Delete this position?')) {
      return;
    }

    // Immediately clean selection
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(positionId);
      return next;
    });

    // Mark for animation
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos =>
        pos.id === positionId ? { ...pos, animateOut: true } : pos
      )
    }));

    // Remove after animation
    setTimeout(() => {
      setPositions(prev => ({
        ...prev,
        [assetType]: prev[assetType].filter(pos => pos.id !== positionId)
      }));
    }, 300);
  };

  // Bulk delete across all types
  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected row(s)?`)) return;

    setPositions(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(type => {
        updated[type] = updated[type].filter(pos => !selectedIds.has(pos.id));
      });
      return updated;
    });
    setSelectedIds(new Set());
  }, [selectedIds]);


  // Duplicate position
  const duplicatePosition = (assetType, position) => {
    const newData = { ...position.data };
    
    if (assetType === 'security' && newData.shares) {
      newData.shares = '';
    }
    if (assetType === 'otherAssets' && newData.property_name) {
      newData.property_name = `${newData.property_name} (Copy)`;
    }
    
    const newPosition = {
      id: Date.now() + Math.random(),
      type: assetType,
      data: newData,
      errors: {},
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
    
    setTimeout(() => {
      const firstEditableField = assetType === 'security' ? 'shares' : assetTypes[assetType].fields[0].key;
      const cellKey = `${assetType}-${newPosition.id}-${firstEditableField}`;
      cellRefs.current[cellKey]?.focus();
    }, 100);
  };

  // Toggle section
  const toggleSection = (assetType) => {
    setExpandedSections(prev => ({
      ...prev,
      [assetType]: !prev[assetType]
    }));
  };

  // Enhanced statistics
  const stats = useMemo(() => {
    let totalPositions = 0;
    let totalValue = 0;
    let totalCost = 0;
    const byType = {};
    const byAccount = {};
    const errors = [];
    const performance = {};

    Object.entries(positions).forEach(([type, typePositions]) => {
      byType[type] = { count: 0, value: 0, cost: 0 };
      
      typePositions.forEach(pos => {
        // Special handling for otherAssets which don't need account_id
        const hasValidData = type === 'otherAssets' 
          ? (pos.data.asset_name && pos.data.current_value) 
          : pos.data.account_id;
          
        if (hasValidData) {
          totalPositions++;
          byType[type].count++;
          
          // Only track by account for non-otherAssets
          if (type !== 'otherAssets' && pos.data.account_id) {
            const accountId = pos.data.account_id;
            if (!byAccount[accountId]) {
              byAccount[accountId] = { count: 0, value: 0, positions: [] };
            }
            byAccount[accountId].count++;
            byAccount[accountId].positions.push({ ...pos, assetType: type });
          }
          
          let value = 0;
          let cost = 0;
          
          switch (type) {
            case 'security':
              value = (pos.data.shares || 0) * (pos.data.price || 0);
              cost = (pos.data.shares || 0) * (pos.data.cost_basis || pos.data.price || 0);
              break;
            case 'crypto':
              value = (pos.data.quantity || 0) * (pos.data.current_price || 0);
              cost = (pos.data.quantity || 0) * (pos.data.purchase_price || 0);
              break;
            case 'metal':
              value = (pos.data.quantity || 0) * (pos.data.current_price_per_unit || pos.data.purchase_price || 0);
              cost = (pos.data.quantity || 0) * (pos.data.purchase_price || 0);
              break;
            case 'otherAssets':
              value = pos.data.current_value || 0;
              cost = pos.data.cost || 0;
              break;
            case 'cash':
              value = pos.data.amount || 0;
              cost = pos.data.amount || 0;
              break;
          }
          
          totalValue += value;
          totalCost += cost;
          byType[type].value += value;
          byType[type].cost += cost;
          
          // Only add to account value for non-otherAssets
          if (type !== 'otherAssets' && pos.data.account_id) {
            byAccount[pos.data.account_id].value += value;
          }
        }
        
        if (pos.errors && Object.values(pos.errors).some(e => e)) {
          errors.push({ type, id: pos.id, errors: pos.errors });
        }
      });
      
      if (byType[type].cost > 0) {
        performance[type] = ((byType[type].value - byType[type].cost) / byType[type].cost) * 100;
      }
    });

    const totalPerformance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return { 
      totalPositions, 
      totalValue, 
      totalCost,
      totalPerformance,
      byType, 
      byAccount, 
      errors,
      performance 
    };
  }, [positions]);
  
  // Validate positions
  const validatePositions = () => {
    let isValid = true;
    const updatedPositions = { ...positions };
    const validationErrors = [];

    Object.entries(positions).forEach(([type, typePositions]) => {
      const typeConfig = assetTypes[type];
      updatedPositions[type] = typePositions.map((pos, index) => {
        const errors = {};
        let hasData = false;
        
        // Check if position has any data
        typeConfig.fields.forEach(field => {
          if (pos.data[field.key]) {
            hasData = true;
          }
        });
        
        if (hasData) {
          typeConfig.fields.forEach(field => {
            const value = pos.data[field.key];
            
            // Skip account_id validation for otherAssets
            if (field.key === 'account_id' && type === 'otherAssets') {
              return;
            }
            
            if (field.required && !value) {
              errors[field.key] = 'Required';
              isValid = false;
              validationErrors.push(`${typeConfig.name} row ${index + 1}: ${field.label} is required`);
            } else if (field.type === 'number' && value) {
              if (field.min !== undefined && value < field.min) {
                errors[field.key] = `Min: ${field.min}`;
                isValid = false;
                validationErrors.push(`${typeConfig.name} row ${index + 1}: ${field.label} must be at least ${field.min}`);
              }
              if (field.max !== undefined && value > field.max) {
                errors[field.key] = `Max: ${field.max}`;
                isValid = false;
                validationErrors.push(`${typeConfig.name} row ${index + 1}: ${field.label} must be at most ${field.max}`);
              }
            }
          });
        }
        
        return { ...pos, errors };
      });
    });

    setPositions(updatedPositions);
    
    if (!isValid) {
      showMessage('error', `${validationErrors.length} validation errors found`, validationErrors.slice(0, 5));
    }
    
    return isValid;
  };

  // Submit all
  const submitAll = async () => {
    if (stats.totalPositions === 0) {
      showMessage('error', 'No positions to submit', ['Add at least one position before submitting']);
      return;
    }

    if (!validatePositions()) {
      return;
    }

    setIsSubmitting(true);
    setAutosavePaused(true); // <- prevent localStorage thrash during submit
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const updatedPositions = { ...positions };
    const successfulPositionData = [];
    const storageKey = `quickpositions:work:${seedId}`;

    try {
      const batches = [];
      Object.entries(positions).forEach(([type, typePositions]) => {
        typePositions.forEach(pos => {
          // Special validation for otherAssets vs other types
          const isValidPosition = type === 'otherAssets' 
            ? (pos.data.asset_name && pos.data.current_value)
            : (pos.data.account_id && Object.keys(pos.data).length > 1);
            
          if (isValidPosition) {
            batches.push({ type, position: pos });
          }
        });
      });

      showMessage('info', `Submitting ${batches.length} positions...`, [], 0);

      for (let i = 0; i < batches.length; i++) {
        const { type, position } = batches[i];
        
        // mark this row as submitting
        updatedPositions[type] = (updatedPositions[type] || []).map(pos =>
          pos.id === position.id ? { ...pos, status: 'submitting' } : pos
        );
        setPositions({ ...updatedPositions });
        
        // Yield to browser to allow UI updates every 5 submissions
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        try {
          const cleanData = {};
          Object.entries(position.data).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
              cleanData[key] = value;
            }
          });

          switch (type) {
            case 'security':
              await addSecurityPosition(position.data.account_id, cleanData);
              break;
            case 'crypto':

              const cryptoData = {
                coin_symbol: cleanData.symbol,
                coin_type: cleanData.name || cleanData.symbol, 
                quantity: cleanData.quantity,
                purchase_price: cleanData.purchase_price,
                purchase_date: cleanData.purchase_date,
                account_id: cleanData.account_id,
                storage_type: cleanData.storage_type || 'Exchange',  // Default to 'Exchange'
                notes: cleanData.notes || null,
                tags: cleanData.tags || [],
                is_favorite: cleanData.is_favorite || false
            };
              console.log('Sending crypto data:', cryptoData);
              await addCryptoPosition(position.data.account_id, cryptoData);
              break;
            case 'metal':
              const metalData = {
                metal_type: cleanData.metal_type,  // Now this comes from dropdown (Gold, Silver, etc.)
                coin_symbol: cleanData.symbol,
                quantity: cleanData.quantity,
                unit: cleanData.unit || 'oz',
                purchase_price: cleanData.purchase_price,
                cost_basis: (cleanData.quantity || 0) * (cleanData.purchase_price || 0),
                purchase_date: cleanData.purchase_date,
                storage_location: cleanData.storage_location,
                description: `${cleanData.symbol} - ${cleanData.name}`  // Include symbol and market name
              };
              
              console.log('Sending metal data:', metalData);
              await addMetalPosition(position.data.account_id, metalData);
              break;
            case 'otherAssets':
              await addOtherAsset(cleanData);
              break;
            case 'cash':
                const cashData = {
                ...cleanData,
                name: cleanData.cash_type,
                interest_rate: cleanData.interest_rate ? cleanData.interest_rate / 100 : null
              };
              await addCashPosition(position.data.account_id, cashData);
              break;
          }
          
          successCount++;
          
          // Collect successful position data
          const account = type !== 'otherAssets' 
            ? accounts.find(a => a.id === position.data.account_id) 
            : null;
            
          successfulPositionData.push({
            type,
            ticker: position.data.ticker,
            symbol: position.data.symbol,
            asset_name: position.data.asset_name, // Changed from property_name
            metal_type: position.data.metal_type,
            currency: position.data.currency,
            shares: position.data.shares,
            quantity: position.data.quantity,
            amount: position.data.amount,
            account_name: account?.account_name || (type === 'otherAssets' ? 'Other Assets' : 'Unknown Account'),
            account_id: position.data.account_id
          });
          
          // Update position status
          updatedPositions[type] = updatedPositions[type].map(pos => 
            pos.id === position.id ? { ...pos, status: 'added' } : pos
          );
          
          const progress = Math.round(((i + 1) / batches.length) * 100);
          showMessage('info', `Submitting positions... ${progress}%`, [`${successCount} of ${batches.length} completed`], 0);
          
        } catch (error) {
          console.error(`Error adding ${type} position:`, error);
          errorCount++;
          errors.push(`${assetTypes[type].name}: ${error.message || 'Unknown error'}`);
          
          // Update position status with error
          updatedPositions[type] = updatedPositions[type].map(pos => 
            pos.id === position.id ? { ...pos, status: 'error', errorMessage: error.message } : pos
          );
        }
      }

      // Apply statuses
      setPositions(updatedPositions);

      // Persist once at the end (still paused—resume after we decide navigation)
      try { localStorage.setItem(storageKey, JSON.stringify(updatedPositions)); } catch {}

      /** Decide whether to hand off to results:
       * Only if there are NO remaining rows that are ready/draft/submitting
       * (i.e., nothing left we could/should still submit)
       */
      const remaining = Object.values(updatedPositions).flat()
        .filter(p => {
          const s = p.status || getRowStatus(p);
          return s === 'ready' || s === 'draft' || s === 'submitting';
        }).length;

      if (successCount > 0) {
        showMessage('success', `Successfully added ${successCount} position${successCount !== 1 ? 's' : ''}!`,
          errorCount > 0 ? [`${errorCount} positions failed`] : []
        );

        if (remaining === 0 && onPositionsSaved) {
          // only now is the queue truly drained – safe to hand off
          onPositionsSaved(successCount, successfulPositionData);
        } else {
          // keep user here and make it obvious there’s still work to do
          showMessage('info', `Imported ${successCount}. ${remaining} item${remaining !== 1 ? 's' : ''} still pending in the queue.`, [], 3500);
        }
      } else {
        showMessage('error', 'Failed to add any positions', errors.slice(0, 5));
      }

    } catch (error) {
      console.error('Error submitting positions:', error);
      showMessage('error', 'Failed to submit positions', [error.message]);
    } finally {
      setIsSubmitting(false);
      setAutosavePaused(false);
    }
  };

  // Submit only 'ready' rows using the same pipeline as submitAll
  const submitReadyOnly = async () => {
    if (stats.totalPositions === 0) {
      showMessage('error', 'No positions to submit', ['Add at least one position before submitting']);
      return;
    }

    // Build a mini-batch from current positions but only include ready rows
    const readyEntries = getAllReadyRows();
    if (readyEntries.length === 0) {
      showMessage('info', 'No ready rows to submit', ['Fix issues first or use Submit All']);
      return;
    }

    // We re-use the core of submitAll with a filtered "batches" list
    setIsSubmitting(true);
    setAutosavePaused(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const updatedPositions = { ...positions };
    const successfulPositionData = [];
    const storageKey = `quickpositions:work:${seedId}`;

    try {
      showMessage('info', `Submitting ${readyEntries.length} ready positions...`, [], 0);

      for (let i = 0; i < readyEntries.length; i++) {
        const { type, position } = readyEntries[i];
        // mark this row as submitting
        updatedPositions[type] = (updatedPositions[type] || []).map(pos =>
          pos.id === position.id ? { ...pos, status: 'submitting' } : pos
        );
        setPositions({ ...updatedPositions });
        
        try {
          const cleanData = {};
          Object.entries(position.data).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
              cleanData[key] = value;
            }
          });

          switch (type) {
            case 'security':
              await addSecurityPosition(position.data.account_id, cleanData);
              break;
            case 'crypto': {
              const cryptoData = {
                coin_symbol: cleanData.symbol,
                coin_type: cleanData.name || cleanData.symbol,
                quantity: cleanData.quantity,
                purchase_price: cleanData.purchase_price,
                purchase_date: cleanData.purchase_date,
                account_id: cleanData.account_id,
                storage_type: cleanData.storage_type || 'Exchange',
                notes: cleanData.notes || null,
                tags: cleanData.tags || [],
                is_favorite: cleanData.is_favorite || false
              };
              await addCryptoPosition(position.data.account_id, cryptoData);
              break;
            }
            case 'metal': {
              const metalData = {
                metal_type: cleanData.metal_type,
                coin_symbol: cleanData.symbol,
                quantity: cleanData.quantity,
                unit: cleanData.unit || 'oz',
                purchase_price: cleanData.purchase_price,
                cost_basis: (cleanData.quantity || 0) * (cleanData.purchase_price || 0),
                purchase_date: cleanData.purchase_date,
                storage_location: cleanData.storage_location,
                description: `${cleanData.symbol} - ${cleanData.name}`
              };
              await addMetalPosition(position.data.account_id, metalData);
              break;
            }
            case 'otherAssets':
              await addOtherAsset(cleanData);
              break;
            case 'cash': {
              const cashData = {
                ...cleanData,
                name: cleanData.cash_type,
                interest_rate: cleanData.interest_rate ? cleanData.interest_rate / 100 : null
              };
              await addCashPosition(position.data.account_id, cashData);
              break;
            }
          }

          successCount++;

          const account = type !== 'otherAssets'
            ? accounts.find(a => a.id === position.data.account_id)
            : null;

          successfulPositionData.push({
            type,
            ticker: position.data.ticker,
            symbol: position.data.symbol,
            asset_name: position.data.asset_name,
            metal_type: position.data.metal_type,
            currency: position.data.currency,
            shares: position.data.shares,
            quantity: position.data.quantity,
            amount: position.data.amount,
            account_name: account?.account_name || (type === 'otherAssets' ? 'Other Assets' : 'Unknown Account'),
            account_id: position.data.account_id
          });

          updatedPositions[type] = (updatedPositions[type] || []).map(pos =>
            pos.id === position.id ? { ...pos, status: 'added' } : pos
          );

          const progress = Math.round(((i + 1) / readyEntries.length) * 100);
          showMessage('info', `Submitting ready positions... ${progress}%`, [`${successCount} of ${readyEntries.length} completed`], 0);
        } catch (error) {
          console.error(`Error adding ${type} position:`, error);
          errorCount++;
          errors.push(`${assetTypes[type].name}: ${error.message || 'Unknown error'}`);

          updatedPositions[type] = (updatedPositions[type] || []).map(pos =>
            pos.id === position.id ? { ...pos, status: 'error', errorMessage: error.message } : pos
          );
        }
      }

    const pruned = Object.fromEntries(
      Object.entries(updatedPositions).map(([t, arr]) => [t, (arr || []).filter(p => p.status !== 'added')])
    );
    setPositions(pruned);
    try { localStorage.setItem(storageKey, JSON.stringify(pruned)); } catch {}

    const remaining = Object.values(pruned).flat()
      .filter(p => {
        const s = p.status || getRowStatus(p);
        return s === 'ready' || s === 'draft' || s === 'submitting';
      }).length;

    if (successCount > 0) {
      showMessage('success', `Successfully added ${successCount} ready position${successCount !== 1 ? 's' : ''}!`,
        errorCount > 0 ? [`${errorCount} positions failed`] : []
      );
      if (remaining === 0 && onPositionsSaved) {
        onPositionsSaved(successCount, successfulPositionData);
      } else {
        showMessage('info', `${remaining} item${remaining !== 1 ? 's' : ''} remain in the queue. Submit again when ready.`, [], 3500);
      }
    } else {
      showMessage('error', 'No ready positions were added', errors.slice(0, 5));
    }

    } catch (e) {
      console.error('Error submitting ready positions:', e);
      showMessage('error', 'Failed to submit ready positions', [e.message]);
    } finally {
      setIsSubmitting(false);
      setAutosavePaused(false);
    }
  };


  // Clear all
  const clearAll = () => {
    if (stats.totalPositions > 0 && !window.confirm('Clear all positions? This cannot be undone.')) {
      return;
    }

    const empty = { security: [], cash: [], crypto: [], metal: [], otherAssets: [] };
    setPositions(empty);
    localStorage.removeItem(`quickpositions:work:${seedId}`); // <- nuke the draft
    setExpandedSections({});
    setAccountExpandedSections({});
    showMessage('success', 'All positions cleared', ['Ready for new entries']);
  };


  // Clear completed positions
  const clearCompletedPositions = () => {
    const updatedPositions = { ...positions };
    
    Object.keys(updatedPositions).forEach(type => {
      updatedPositions[type] = updatedPositions[type].filter(pos => pos.status !== 'added');
    });
    
    // keep only rows not marked 'added' to shrink the queue after success
    const pruned = Object.fromEntries(
      Object.entries(updatedPositions).map(([t, arr]) => [t, (arr || []).filter(p => p.status !== 'added')])
    );
    setPositions(pruned);
    const key = `quickpositions:work:${seedId}`;
    saveDraft(key, pruned);
    showMessage('success', 'Cleared all successfully added positions');
  };

  // Render cell input with search dropdown
  const renderCellInput = (assetType, position, field, cellKey) => {
    const value = position.data[field.key] || '';
    const hasError = position.errors?.[field.key];
    const fieldIndex = assetTypes[assetType].fields.findIndex(f => f.key === field.key);
    const isRecent = recentlyUsedAccounts.includes(position.data.account_id);
    const searchKey = `${assetType}-${position.id}`;
    const searchResultsForField = searchResults[searchKey] || [];
    const isSearchingField = isSearching[searchKey] || false;
    
    const baseClass = `
      w-full px-3 py-2 text-sm border rounded-lg transition-all duration-200
      ${field.readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}
      ${hasError 
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-red-900' 
        : focusedCell === cellKey
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-300 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
      }
    `;

    const commonProps = {
      ref: el => cellRefs.current[cellKey] = el,
      className: baseClass,
      onFocus: () => setFocusedCell(cellKey),
      onBlur: () => setFocusedCell(null),
      onKeyDown: (e) => handleKeyDown(e, assetType, position.id, fieldIndex),
      'data-position-id': position.id,
      'data-field': field.key,
      'aria-label': field.label,
      'aria-invalid': hasError ? 'true' : 'false',
      'aria-describedby': hasError ? `${cellKey}-error` : undefined,
      disabled: field.readOnly
    };

    // Search results dropdown for searchable fields
    if (field.searchable && searchResultsForField.length > 0) {
      const inputElement = cellRefs.current[cellKey];
      const inputRect = inputElement?.getBoundingClientRect();

      return (
        <>
          <div className="relative w-full">
            <input
              {...commonProps}
              type="text"
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
              placeholder={field.placeholder}
              autoComplete="off"
              spellCheck="false"
            />
            {isSearchingField && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {inputRect && ReactDOM.createPortal(
            <div 
              style={{
                position: 'fixed',
                top: `${inputRect.bottom + 4}px`,
                left: `${inputRect.left}px`,
                width: `${Math.max(inputRect.width, 450)}px`,
                zIndex: 9999999
              }}
              className="bg-white border-2 border-blue-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200"
            >
              {/* Search header */}
              <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900 flex items-center">
                    <Search className="w-3 h-3 mr-1.5" />
                    {searchResultsForField.length} Result{searchResultsForField.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-blue-600">Click to select</span>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {searchResultsForField.map((result, idx) => {
                  const price = parseFloat(result.price || result.current_price || 0);
                  const exchange = result.exchange || result.market || '';
                  const type = result.asset_type || '';
                  const sector = result.sector || result.industry || '';
                  
                  return (
                    <button
                      key={`${result.ticker}-${idx}`}
                      type="button"
                      className={`
                        w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
                        transition-all duration-150 group
                        ${idx !== searchResultsForField.length - 1 ? 'border-b border-gray-100' : ''}
                      `}
                      onClick={() => {
                        handleSelectSecurity(assetType, position.id, result);
                        setSearchResults(prev => ({
                          ...prev,
                          [searchKey]: []
                        }));
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {/* Main row */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {/* Ticker badge */}
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow">
                              {result.ticker}
                            </span>
                          </div>
                          
                          {/* Company name */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate text-sm group-hover:text-blue-900 transition-colors">
                              {result.name}
                            </div>
                          </div>
                        </div>
                        
                        {/* Price */}
                        <div className="flex-shrink-0 ml-3">
                          <div className="text-right">
                            <div className="font-bold text-gray-900 text-base group-hover:text-blue-900 transition-colors">
                              ${price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Metadata row */}
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        {exchange && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                            {exchange}
                          </span>
                        )}
                        {type && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                            {type}
                          </span>
                        )}
                        {sector && (
                          <span className="truncate text-gray-600">
                            {sector}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Footer hint */}
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Keyboard className="w-3 h-3 mr-1" />
                    Use ↑↓ to navigate
                  </span>
                  <span className="text-gray-400">Press Enter to select</span>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      );
    }

    switch (field.type) {
      case 'select':
        if (field.key === 'account_id') {
          return (
            <div className="relative w-full">
              <select
                {...commonProps}
                value={value}
                onChange={(e) => updatePosition(assetType, position.id, field.key, parseInt(e.target.value))}
                className={`${baseClass} pr-8 cursor-pointer appearance-none`}
              >
                <option value="">Select account...</option>
                {recentlyUsedAccounts.length > 0 && (
                  <optgroup label="Recent">
                    {accounts
                      .filter(a => recentlyUsedAccounts.includes(a.id))
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          ⭐ {account.account_name}
                        </option>
                      ))}
                  </optgroup>
                )}
                <optgroup label="All Accounts">
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              {isRecent && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
              )}
            </div>
          );
        } else {
          return (
            <div className="relative w-full">
              <select
                {...commonProps}
                value={value}
                onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
                className={`${baseClass} pr-8 cursor-pointer appearance-none`}
              >
                {field.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          );
        }
        
      case 'number':
        return (
          <div className="relative w-full group">
            {field.prefix && (
              <span className={`
                absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors duration-200
                ${focusedCell === cellKey ? 'text-blue-600' : 'text-gray-400'}
              `}>
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
              min={field.min}
              max={field.max}
              className={`${baseClass} ${field.prefix ? 'pl-8' : ''} ${field.suffix ? 'pr-8' : ''}`}
              readOnly={field.readOnly}
            />
            {field.suffix && (
              <span className={`
                absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors duration-200
                ${focusedCell === cellKey ? 'text-blue-600' : 'text-gray-400'}
              `}>
                {field.suffix}
              </span>
            )}
            {hasError && (
              <div id={`${cellKey}-error`} className="absolute left-0 -bottom-5 text-xs text-red-600 font-medium">
                {position.errors[field.key]}
              </div>
            )}
          </div>
        );
        
      case 'date':
        return (
          <div className="relative w-full">
            <input
              {...commonProps}
              type="date"
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
              max={field.max}
              className={baseClass}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        );
        
      default:
        return (
          <div className="relative w-full">
            <input
              {...commonProps}
              type="text"
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
              placeholder={field.placeholder}
              autoComplete={field.autocomplete ? 'on' : 'off'}
              spellCheck="false"
              className={baseClass}
              />
              {field.autocomplete && value.length > 0 && (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-pulse" />
              )}
              </div>
              );
              }
              };
  
  // Render asset section
  const renderAssetSection = (assetType) => {
    const config = assetTypes[assetType];
    let typePositions = positions[assetType] || [];
    // Type filter still handled by activeFilter outside this function.
    // Apply the independent status filter here:
    typePositions = typePositions.filter(matchesStatusFilter);
    
    // Special validation for otherAssets
    const validPositions = assetType === 'otherAssets'
      ? typePositions.filter(p => p.data.asset_name && p.data.current_value)
      : typePositions.filter(p => p.data.account_id);
      
    const isExpanded = expandedSections[assetType];
    const Icon = config.icon;
    const typeStats = stats.byType[assetType];
    const performance = stats.performance[assetType];



    return (
        <div 
          key={assetType} 
          className={`
            bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300
            ${isExpanded ? 'border-blue-200 shadow-lg ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
            ${typePositions.length > 0 ? 'ring-1 ring-gray-100' : ''}
          `}
        >
        {/* Section Header - Entire row is clickable */}
        <div 
          onClick={() => toggleSection(assetType)}
          className={`
            px-4 py-3 cursor-pointer transition-all duration-200
            ${isExpanded 
              ? `bg-gradient-to-r ${config.color.gradient} text-white shadow-sm` 
              : 'bg-gray-50 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className={`
                  p-2 rounded-lg transition-all duration-200 
                  ${isExpanded ? 'bg-white/20' : `${config.color.lightBg}`}
                `}>
                  <Icon className={`w-5 h-5 ${isExpanded ? 'text-white' : config.color.text}`} />
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-semibold text-base flex items-center ${
                    isExpanded ? 'text-white' : 'text-gray-800'
                  }`}>
                    {config.name}
                    {validPositions.length > 0 && (
                      <span className={`
                        ml-2 px-2 py-0.5 text-xs font-bold rounded-full
                        ${isExpanded ? 'bg-white/20 text-white' : `${config.color.bg} text-white`}
                      `}>
                        {validPositions.length}
                      </span>
                    )}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isExpanded ? 'text-white/80' : 'text-gray-500'}`}>
                    {config.description}
                  </p>
                </div>
                
                {typeStats && typeStats.count > 0 && (
                  <div className={`flex items-center space-x-4 text-xs ${
                    isExpanded ? 'text-white/90' : 'text-gray-600'
                  }`}>
                    <div className="text-right">
                      <div className="font-medium">
                        {showValues ? formatCurrency(typeStats.value) : '••••'}
                      </div>
                      {performance !== undefined && (
                        <div className={`flex items-center justify-end ${
                          performance >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {performance >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {Math.abs(performance).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addNewRow(assetType);
                    if (!isExpanded) {
                      setExpandedSections(prev => ({ ...prev, [assetType]: true }));
                    }
                  }}
                  className={`
                    p-1.5 rounded-lg transition-all duration-200 
                    ${isExpanded 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : `${config.color.lightBg} hover:${config.color.hover} ${config.color.text}`
                    }
                  `}
                  title={`Add ${config.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                
                <ChevronDown className={`
                  w-5 h-5 transition-transform duration-300
                  ${isExpanded ? 'rotate-180 text-white' : 'text-gray-400'}
                `} />
              </div>
            </div>
          </div>

          {/* Table Content */}
          {isExpanded && (
            <div className="bg-white animate-in slide-in-from-top-2 duration-300">
              {typePositions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className={`inline-flex p-4 rounded-full ${config.color.lightBg} mb-4`}>
                    <Icon className={`w-8 h-8 ${config.color.text}`} />
                  </div>
                  <p className="text-gray-600 mb-4">No {config.name.toLowerCase()} positions yet</p>
                  <button
                    onClick={() => addNewRow(assetType)}
                    className={`
                      inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200
                      ${config.color.bg} text-white hover:shadow-md hover:scale-105
                    `}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First {config.name}
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto overflow-y-visible" ref={el => tableRefs.current[assetType] = el}>
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="w-12 px-3 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={(e) => toggleAllSelectedForType(assetType, e.target.checked)}
                              checked={
                                typePositions.length > 0 && 
                                typePositions.every(p => selectedIds.has(p.id))
                              }
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              title="Select all"
                            />
                          </th>
                          {config.fields.map(field => (
                            <th key={field.key} className={`${field.width} px-2 py-3 text-left`}>
                              <span className="text-xs font-semibold text-gray-600 flex items-center">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                {field.readOnly && (
                                  <Info className="w-3 h-3 ml-1 text-gray-400" title="Auto-filled from search" />
                                )}
                              </span>
                            </th>
                          ))}
                          <th className="w-24 px-2 py-3 text-left">
                            <span className="text-xs font-semibold text-gray-600">Status</span>
                          </th>
                          <th className="w-24 px-2 py-3 text-center">
                            <span className="text-xs font-semibold text-gray-600">Actions</span>
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {typePositions.map((position, index) => {
                          const hasErrors = Object.values(position.errors || {}).some(e => e);
                          const value = calculatePositionValue(assetType, position);
                          
                          return (
                            <tr 
                              key={position.id}
                              className={`
                                border-b border-gray-100 transition-all duration-300 group relative
                                ${position.isNew ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}
                                ${position.animateIn ? 'animate-in slide-in-from-left duration-300' : ''}
                                ${position.animateOut ? 'animate-out slide-out-to-right duration-300' : ''}
                                ${hasErrors ? 'bg-red-50/30' : ''}
                              `}
                              style={{ zIndex: typePositions.length - index }}
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(position.id)}
                                    onChange={(e) => toggleRowSelected(position.id, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    aria-label={`Select row ${index + 1}`}
                                  />
                                  <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                                  {position.isNew && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                                </div>
                              </td>

                              {config.fields.map(field => (
                                <td key={field.key} className={`${field.width} px-1 py-2`}>
                                  {renderCellInput(
                                    assetType, 
                                    position, 
                                    field, 
                                    `${assetType}-${position.id}-${field.key}`
                                  )}
                                </td>
                              ))}
                                <td className="px-2 py-2">
                                  {(() => {
                                    const s = getRowStatus(position);
                                    const styles = {
                                      ready:      "bg-emerald-50 text-emerald-700 border-emerald-200",
                                      draft:      "bg-amber-50 text-amber-700 border-amber-200",
                                      submitting: "bg-blue-50 text-blue-700 border-blue-200",
                                      added:      "bg-indigo-50 text-indigo-700 border-indigo-200",
                                      error:      "bg-red-50 text-red-700 border-red-200",
                                    }[s] || "bg-gray-50 text-gray-600 border-gray-200";
                                    return (
                                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded border ${styles}`}>
                                        {s}
                                      </span>
                                    );
                                  })()}
                                </td>

                                <td className="px-2 py-2">
                                  <div className="flex items-center justify-center space-x-1">
                                    {getRowStatus(position) === 'ready' && (
                                      <button
                                        onClick={async () => {
                                          // Mark as submitting
                                          setPositions(prev => ({
                                            ...prev,
                                            [assetType]: prev[assetType].map(p =>
                                              p.id === position.id ? { ...p, status: 'submitting' } : p
                                            )
                                          }));
                                          
                                          try {
                                            const cleanData = {};
                                            Object.entries(position.data).forEach(([key, value]) => {
                                              if (value !== '' && value !== null && value !== undefined) {
                                                cleanData[key] = value;
                                              }
                                            });

                                            // Submit based on type
                                            switch (assetType) {
                                              case 'security':
                                                await addSecurityPosition(position.data.account_id, cleanData);
                                                break;
                                              case 'crypto': {
                                                const cryptoData = {
                                                  coin_symbol: cleanData.symbol,
                                                  coin_type: cleanData.name || cleanData.symbol,
                                                  quantity: cleanData.quantity,
                                                  purchase_price: cleanData.purchase_price,
                                                  purchase_date: cleanData.purchase_date,
                                                  account_id: cleanData.account_id,
                                                  storage_type: cleanData.storage_type || 'Exchange',
                                                  notes: cleanData.notes || null,
                                                  tags: cleanData.tags || [],
                                                  is_favorite: cleanData.is_favorite || false
                                                };
                                                await addCryptoPosition(position.data.account_id, cryptoData);
                                                break;
                                              }
                                              case 'metal': {
                                                const metalData = {
                                                  metal_type: cleanData.metal_type,
                                                  coin_symbol: cleanData.symbol,
                                                  quantity: cleanData.quantity,
                                                  unit: cleanData.unit || 'oz',
                                                  purchase_price: cleanData.purchase_price,
                                                  cost_basis: (cleanData.quantity || 0) * (cleanData.purchase_price || 0),
                                                  purchase_date: cleanData.purchase_date,
                                                  storage_location: cleanData.storage_location,
                                                  description: `${cleanData.symbol} - ${cleanData.name}`
                                                };
                                                await addMetalPosition(position.data.account_id, metalData);
                                                break;
                                              }
                                              case 'otherAssets':
                                                await addOtherAsset(cleanData);
                                                break;
                                              case 'cash': {
                                                const cashData = {
                                                  ...cleanData,
                                                  name: cleanData.cash_type,
                                                  interest_rate: cleanData.interest_rate ? cleanData.interest_rate / 100 : null
                                                };
                                                await addCashPosition(position.data.account_id, cashData);
                                                break;
                                              }
                                            }
                                            
                                            // Mark as added
                                            setPositions(prev => ({
                                              ...prev,
                                              [assetType]: prev[assetType].map(p =>
                                                p.id === position.id ? { ...p, status: 'added' } : p
                                              )
                                            }));
                                            
                                            showMessage('success', 'Position added successfully!');
                                          } catch (error) {
                                            console.error('Error adding position:', error);
                                            setPositions(prev => ({
                                              ...prev,
                                              [assetType]: prev[assetType].map(p =>
                                                p.id === position.id ? { ...p, status: 'error', errorMessage: error.message } : p
                                              )
                                            }));
                                            showMessage('error', 'Failed to add position', [error.message]);
                                          }
                                        }}
                                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-all"
                                        title="Submit this position"
                                        disabled={position.status === 'submitting'}
                                      >
                                        {position.status === 'submitting' ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-3 h-3" />
                                        )}
                                      </button>
                                    )}
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
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Add row footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => addNewRow(assetType)}
                      className={`
                        w-full py-2 px-4 border-2 border-dashed rounded-lg
                        transition-all duration-200 flex items-center justify-center space-x-2
                        ${config.color.border} ${config.color.hover} hover:border-solid
                        group
                      `}
                    >
                      <Plus className={`w-4 h-4 ${config.color.text} group-hover:scale-110 transition-transform`} />
                      <span className={`text-sm font-medium ${config.color.text}`}>
                        Add {config.name} (Enter)
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      );
    };

 
 // Render positions by account
  const renderByAccount = () => {
      const otherAssetsPositions = positions.otherAssets.filter(p => 
      p.data.asset_name && p.data.current_value
    );
    
    return (
      <div className="space-y-4">
        {accounts.filter(account => {
          // Apply account filter
          const passesAccountFilter = selectedAccountFilter.has(account.id);
          // Apply institution filter
          const passesInstitutionFilter = selectedInstitutionFilter.has(account.institution);
          // Both filters must pass
          return passesAccountFilter && passesInstitutionFilter;
        }).map(account => {
          const accountStats = stats.byAccount[account.id];
          const hasPositions = accountStats && accountStats.count > 0;
          
          return (
            <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Account Header with asset type buttons */}
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">{account.account_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {accountStats ? `${accountStats.count} position${accountStats.count !== 1 ? 's' : ''}` : 'No positions'} • 
                        {showValues && accountStats ? ` ${formatCurrency(accountStats.value)}` : ' ••••'}
                      </p>
                    </div>
                    
                    {/* Asset type buttons always visible */}
                    <div className="flex items-center space-x-2 ml-8">
                      {Object.entries(assetTypes).map(([type, config]) => {
                        const Icon = config.icon;
                        const typeCount = accountStats?.positions.filter(p => p.assetType === type).length || 0;
                        const hasTypePositions = typeCount > 0;
                        
                        return (
                          <button
                            key={type}
                            onClick={() => addNewRowForAccount(account.id, type)}
                            className={`
                              inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium
                              transition-all duration-200 group
                              ${hasTypePositions 
                                ? `${config.color.bg} text-white hover:shadow-md` 
                                : `${config.color.lightBg} ${config.color.text} hover:${config.color.bg} hover:text-white`
                              }
                            `}
                            title={`Add ${config.name}`}
                          >
                            <Icon className="w-3.5 h-3.5 mr-1.5" />
                            <span>{config.name}</span>
                            {typeCount > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                                {typeCount}
                              </span>
                            )}
                            <Plus className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Positions by Type */}
              <div className="p-4 space-y-4">
                {hasPositions ? (
                  Object.entries(assetTypes).map(([type, config]) => {
                    const typePositions = positions[type].filter(p => p.data.account_id === account.id);
                    if (typePositions.length === 0) return null;

                    const Icon = config.icon;
                    const sectionKey = `${account.id}-${type}`;
                    const isExpanded = accountExpandedSections[sectionKey] !== false; // Default expanded
                    
                    return (
                      <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div 
                          onClick={() => setAccountExpandedSections(prev => ({
                            ...prev,
                            [sectionKey]: !isExpanded
                          }))}
                          className={`px-3 py-2 ${config.color.lightBg} border-b ${config.color.border} cursor-pointer hover:brightness-95 transition-all`}
                        >
                          <h4 className={`font-medium text-sm ${config.color.text} flex items-center justify-between`}>
                            <div className="flex items-center">
                              <Icon className="w-4 h-4 mr-2" />
                              {config.name}
                              <span className={`ml-2 px-1.5 py-0.5 text-xs ${config.color.bg} text-white rounded-full`}>
                                {typePositions.length}
                              </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </h4>
                        </div>
                        
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">

                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="w-10 px-3 py-3 text-left">
                                    <input
                                      type="checkbox"
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedIds(prev => {
                                          const next = new Set(prev);
                                          const scoped = positions[type].filter(p => p.data.account_id === account.id);
                                          if (checked) {
                                            scoped.forEach(p => next.add(p.id));
                                          } else {
                                            scoped.forEach(p => next.delete(p.id));
                                          }
                                          return next;
                                        });
                                      }}
                                      checked={
                                        (() => {
                                          const scoped = positions[type].filter(p => p.data.account_id === account.id);
                                          return scoped.length > 0 && scoped.every(p => selectedIds.has(p.id));
                                        })()
                                      }
                                      aria-label={`Select all ${config.name}`}
                                    />

                                  </th>

                                  {config.fields
                                    .filter(f => f.key !== 'account_id')
                                    .map(field => (
                                      <th key={field.key} className={`${field.width} px-2 py-3 text-left`}>
                                        <span className="text-xs font-semibold text-gray-600 flex items-center">
                                          {field.label}
                                          {field.required && <span className="text-red-500 ml-1">*</span>}
                                          {field.readOnly && (
                                            <Info className="w-3 h-3 ml-1 text-gray-400" title="Auto-filled from search" />
                                          )}
                                        </span>
                                      </th>
                                    ))}

                                  <th className="w-24 px-2 py-3 text-left">
                                    <span className="text-xs font-semibold text-gray-600">Status</span>
                                  </th>
                                  <th className="w-24 px-2 py-3 text-center">
                                    <span className="text-xs font-semibold text-gray-600">Actions</span>
                                  </th>
                                </tr>
                              </thead>




                                <tbody>
                                  {typePositions.map((position) => (
                                    <tr key={position.id} className="border-b border-gray-100 hover:bg-gray-50">
                                      {/* Row checkbox */}
                                      <td className="px-3 py-2">
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="checkbox"
                                            checked={selectedIds.has(position.id)}
                                            onChange={(e) => toggleRowSelected(position.id, e.target.checked)}
                                            aria-label="Select row"
                                          />
                                        </div>
                                      </td>

                                      {/* All fields except account_id */}
                                      {config.fields.filter(f => f.key !== 'account_id').map(field => (
                                        <td key={field.key} className="px-1 py-1">
                                          {renderCellInput(
                                            type,
                                            position,
                                            field,
                                            `${type}-${position.id}-${field.key}`
                                          )}
                                        </td>
                                      ))}

                                      {/* Status */}
                                      <td className="px-2 py-2">
                                        {(() => {
                                          const s = getRowStatus(position);
                                          const styles = {
                                            ready:      "bg-emerald-50 text-emerald-700 border-emerald-200",
                                            draft:      "bg-amber-50 text-amber-700 border-amber-200",
                                            submitting: "bg-blue-50 text-blue-700 border-blue-200",
                                            added:      "bg-indigo-50 text-indigo-700 border-indigo-200",
                                            error:      "bg-red-50 text-red-700 border-red-200",
                                          }[s] || "bg-gray-50 text-gray-600 border-gray-200";

                                          return (
                                            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] rounded border ${styles}`}>
                                              {s}
                                            </span>
                                          );
                                        })()}
                                      </td>

                                      {/* Actions */}
                                      <td className="px-1 py-1">
                                        <div className="flex items-center justify-center space-x-1">
                                          <button
                                            onClick={() => duplicatePosition(type, position)}
                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                            title="Duplicate"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => deletePosition(type, position.id)}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>

                            </table>
                            <div className="p-2 bg-gray-50 border-t border-gray-100">
                              <button
                                onClick={() => addNewRowForAccount(account.id, type)}
                                className={`
                                  w-full py-1.5 px-3 text-xs font-medium rounded
                                  ${config.color.lightBg} ${config.color.text} 
                                  hover:${config.color.bg} hover:text-white transition-all
                                  flex items-center justify-center space-x-1
                                `}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add {config.name}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Click any asset type button above to start adding positions
                  </p>
                )}
              </div>
            </div>
          );
        })}

          {/* Add Other Assets section at the end if there are any */}
          {otherAssetsPositions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">Other Assets (Not in Accounts)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {otherAssetsPositions.length} asset{otherAssetsPositions.length !== 1 ? 's' : ''} • 
                      {showValues ? ` ${formatCurrency(stats.byType.otherAssets?.value || 0)}` : ' ••••'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      addNewRow('otherAssets');
                      if (!expandedSections.otherAssets) {
                        setExpandedSections(prev => ({ ...prev, otherAssets: true }));
                      }
                    }}
                    className={`
                      inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium
                      transition-all duration-200 group
                      ${assetTypes.otherAssets.color.lightBg} ${assetTypes.otherAssets.color.text} 
                      hover:${assetTypes.otherAssets.color.bg} hover:text-white
                    `}
                  >
                    <Home className="w-3.5 h-3.5 mr-1.5" />
                    <span>Add Other Asset</span>
                    <Plus className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {assetTypes.otherAssets.fields.map(field => (
                          <th key={field.key} className="px-2 py-2 text-left text-xs font-medium text-gray-600">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </th>
                        ))}
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherAssetsPositions.map((position, index) => (
                        <tr key={position.id} className="border-b border-gray-100 hover:bg-gray-50">
                          {assetTypes.otherAssets.fields.map(field => (
                            <td key={field.key} className="px-1 py-1">
                              {renderCellInput(
                                'otherAssets',
                                position,
                                field,
                                `otherAssets-${position.id}-${field.key}`
                              )}
                            </td>
                          ))}
                          <td className="px-1 py-1">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => duplicatePosition('otherAssets', position)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deletePosition('otherAssets', position.id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

      </div>
    );
  };

  // Calculate position value helper
  const calculatePositionValue = (type, position) => {
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
  };

  // Format currency helper
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Position Entry"
      size="max-w-[1600px]"
    >
      <div className="h-[90vh] flex flex-col bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
        {/* Enhanced Header with Action Bar */}
          <div className="flex-shrink-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 border-b-2 border-gray-200 px-6 py-3 shadow-sm">
            {/* Single Line Header */}
            <div className="flex items-center justify-between gap-4 mb-3">
              {/* Left: Core Actions */}
              <div className="flex items-center space-x-3">
                {/* File Actions Group */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <button
                    onClick={clearAll}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center space-x-1.5 group"
                  >
                    <Trash2 className="w-3.5 h-3.5 group-hover:text-red-600 transition-colors" />
                    <span>Clear All</span>
                  </button>
                  
                  <div className="w-px h-5 bg-gray-300" />
                  
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all"
                  >
                    Cancel
                  </button>
                </div>
                
                {/* Selection Actions Group */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200 shadow-sm animate-in slide-in-from-left duration-200">
                    <span className="text-xs font-semibold text-red-700">{selectedIds.size} selected</span>
                    <button
                      onClick={deleteSelected}
                      className="px-3 py-1.5 text-xs bg-red-100 text-red-700 font-medium rounded-md hover:bg-red-200 border border-red-300 transition-all flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
                
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-600 font-medium">View:</span>
                  <ToggleSwitch
                    value={viewMode}
                    onChange={setViewMode}
                    leftLabel="Asset Type"
                    rightLabel="Account"
                    leftIcon={Layers}
                    rightIcon={Wallet}
                  />
                </div>
              </div>
              
              {/* Center: Stats */}
              <div className="flex items-center space-x-6 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Positions:</span>
                  <span className="text-sm font-bold text-gray-900">
                    <AnimatedNumber value={stats.totalPositions} />
                  </span>
                </div>
                
                <div className="w-px h-5 bg-gray-300" />
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Value:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {showValues ? (
                      <AnimatedNumber value={stats.totalValue} prefix="$" decimals={0} />
                    ) : (
                      '••••••'
                    )}
                  </span>
                </div>
                
                {stats.totalPerformance !== 0 && (
                  <>
                    <div className="w-px h-5 bg-gray-300" />
                    <div className="flex items-center space-x-2">
                      {stats.totalPerformance >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-bold ${
                        stats.totalPerformance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {showValues ? (
                          <>
                            {stats.totalPerformance >= 0 ? '+' : ''}
                            <AnimatedNumber value={stats.totalPerformance} decimals={1} suffix="%" />
                          </>
                        ) : (
                          '••••'
                        )}
                      </span>
                    </div>
                  </>
                )}
                
                {/* Type breakdown badges */}
                {Object.entries(assetTypes).map(([key, config]) => {
                  const typeStats = stats.byType[key];
                  if (!typeStats || typeStats.count === 0) return null;
                  const Icon = config.icon;
                  return (
                    <React.Fragment key={key}>
                      <div className="w-px h-5 bg-gray-300" />
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs ${config.color.lightBg} ${config.color.text}`}>
                        <Icon className="w-3 h-3" />
                        <span className="font-medium">{typeStats.count}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              
              {/* Right: Submit Actions */}
              <div className="flex items-center space-x-2">
                {/* Settings */}
                <div className="flex items-center space-x-1 px-2 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className={`p-1.5 rounded-md transition-all duration-200 ${
                      showValues 
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={showValues ? 'Hide values' : 'Show values'}
                  >
                    {showValues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  
                  <button
                    onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                    className={`p-1.5 rounded-md transition-all duration-200 ${
                      showKeyboardShortcuts 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Keyboard shortcuts (Ctrl+K)"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Queue Button */}
                <button
                  onClick={() => setShowQueue(true)}
                  className="px-3 py-2 text-xs bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center space-x-2 shadow-sm"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Queue</span>
                  {stats.totalPositions > 0 && (
                    <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded-full font-bold">
                      {stats.totalPositions}
                    </span>
                  )}
                </button>
                
                {/* Submit Buttons Group */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
                  <button
                    onClick={submitReadyOnly}
                    disabled={isSubmitting || getAllReadyRows().length === 0}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 ${
                      isSubmitting || getAllReadyRows().length === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Ready ({getAllReadyRows().length})</span>
                  </button>
                  
                  <button
                    onClick={submitAll}
                    disabled={stats.totalPositions === 0 || isSubmitting}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center space-x-2 shadow-sm ${
                      stats.totalPositions === 0 || isSubmitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-md'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Submit All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Second Row: Filters (conditional) */}
            {viewMode && accounts.length > 0 && (
              <div className="flex items-center space-x-3 py-2 px-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs text-gray-500 font-medium">Filters:</span>
                <AccountFilter
                  accounts={accounts}
                  selectedAccounts={selectedAccountFilter}
                  onChange={setSelectedAccountFilter}
                  filterType="accounts"
                />
                <AccountFilter
                  accounts={accounts}
                  selectedAccounts={selectedInstitutionFilter}
                  onChange={setSelectedInstitutionFilter}
                  filterType="institutions"
                />
                <div className="ml-auto flex items-center space-x-2 text-xs text-gray-500">
                  <Info className="w-3 h-3" />
                  <span>Filters apply together</span>
                </div>
              </div>
            )}

            {!viewMode && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 mr-2">Filter by Asset Type:</span>
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                      activeFilter === 'all' 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    All Types
                  </button>

                  {Object.entries(assetTypes).map(([key, config]) => (
                    <AssetTypeBadge
                      key={key}
                      type={config.name}
                      count={stats.byType[key]?.count || 0}
                      icon={config.icon}
                      color={config.color}
                      active={activeFilter === key}
                      onClick={() => setActiveFilter(activeFilter === key ? 'all' : key)}
                    />
                  ))}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 mr-2">Filter by Status:</span>
                  {[
                    {k:'any',label:'All'},
                    {k:'ready',label:'Ready'},
                    {k:'draft',label:'Draft'},
                    {k:'submitting',label:'Submitting'},
                    {k:'added',label:'Added'},
                    {k:'error',label:'Error'},
                  ].map(opt => {
                    let count = 0;
                    if (opt.k === 'any') {
                      Object.values(positions).forEach(typePositions => {
                        count += typePositions.length;
                      });
                    } else {
                      Object.values(positions).forEach(typePositions => {
                        typePositions.forEach(pos => {
                          if (getRowStatus(pos) === opt.k) {
                            count++;
                          }
                        });
                      });
                    }
                    
                    return (
                      <button
                        key={opt.k}
                        onClick={() => setStatusFilter(opt.k)}
                        className={`px-2.5 py-1.5 text-xs rounded-md border transition-all duration-200 flex items-center space-x-1.5 ${
                          statusFilter === opt.k
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {count > 0 && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                            statusFilter === opt.k
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Keyboard shortcuts hint */}
            {showKeyboardShortcuts && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-in slide-in-from-top duration-300">
                <div className="flex items-start space-x-2">
                  <Keyboard className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-900 mb-1">Keyboard Shortcuts</p>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-blue-700">
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Tab</kbd> Next field</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Enter</kbd> Next field / New row</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Ctrl+Enter</kbd> Submit all</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">↑↓</kbd> Navigate rows</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Ctrl+D</kbd> Duplicate row</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Ctrl+Del</kbd> Delete row</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Alt+↑↓</kbd> Move row</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Shift+Enter</kbd> Insert above</div>
                      <div><kbd className="px-1 py-0.5 bg-white rounded text-blue-900 font-mono">Ctrl+K</kbd> Toggle shortcuts</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowKeyboardShortcuts(false)}
                    className="p-1 hover:bg-blue-100 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-blue-600" />
                  </button>
                </div>
              </div>
            )}
          </div>

        {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-visible p-6 space-y-4 relative" style={{ zIndex: 1 }}>
          {viewMode ? (
            // Account View
            renderByAccount()
          ) : (
            // Asset Type View
            <>
              {Object.keys(assetTypes)
                .filter(type => activeFilter === 'all' || activeFilter === type)
                .map(assetType => renderAssetSection(assetType))}
                
              {/* Empty state when filtered */}
              {activeFilter !== 'all' && !positions[activeFilter]?.length && (
                <div className="text-center py-12">
                  <div className={`inline-flex p-4 rounded-full ${assetTypes[activeFilter].color.lightBg} mb-4`}>
                    {React.createElement(assetTypes[activeFilter].icon, {
                      className: `w-8 h-8 ${assetTypes[activeFilter].color.text}`
                    })}
                  </div>
                  <p className="text-gray-600 mb-4">No {assetTypes[activeFilter].name.toLowerCase()} positions yet</p>
                  <button
                    onClick={() => {
                      addNewRow(activeFilter);
                      setExpandedSections(prev => ({ ...prev, [activeFilter]: true }));
                    }}
                    className={`
                      inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200
                      ${assetTypes[activeFilter].color.bg} text-white hover:shadow-md hover:scale-105
                    `}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {assetTypes[activeFilter].name}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enhanced Message Display */}
        {message.text && (
          <div className={`
            absolute bottom-6 left-6 right-6 p-4 rounded-lg shadow-lg border
            animate-in slide-in-from-bottom duration-300 z-40
            ${message.type === 'error' 
              ? 'bg-red-50 border-red-200' 
              : message.type === 'warning' 
                ? 'bg-amber-50 border-amber-200' 
                : message.type === 'info'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-green-50 border-green-200'
            }
          `}>
            <div className="flex items-start space-x-3">
              <div className={`
                flex-shrink-0 p-2 rounded-full
                ${message.type === 'error' 
                  ? 'bg-red-100' 
                  : message.type === 'warning' 
                    ? 'bg-amber-100' 
                    : message.type === 'info'
                      ? 'bg-blue-100'
                      : 'bg-green-100'
                }
              `}>
                {message.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600" /> :
                  message.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
                  message.type === 'info' ? <Info className="w-5 h-5 text-blue-600" /> :
                  <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
              <div className="flex-1">
                <p className={`
                  font-medium text-sm
                  ${message.type === 'error' 
                    ? 'text-red-900' 
                    : message.type === 'warning' 
                      ? 'text-amber-900' 
                      : message.type === 'info'
                        ? 'text-blue-900'
                        : 'text-green-900'
                  }
                `}>
                  {message.text}
                </p>
                {message.details.length > 0 && (
                  <ul className={`
                    mt-2 space-y-1 text-xs
                    ${message.type === 'error' 
                      ? 'text-red-700' 
                      : message.type === 'warning' 
                        ? 'text-amber-700' 
                        : message.type === 'info'
                          ? 'text-blue-700'
                          : 'text-green-700'
                    }
                  `}>
                    {message.details.slice(0, 3).map((detail, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span className="block w-1 h-1 rounded-full bg-current mt-1.5 flex-shrink-0"></span>
                        <span>{detail}</span>
                      </li>
                    ))}
                    {message.details.length > 3 && (
                      <li className="font-medium">
                        ... and {message.details.length - 3} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setMessage({ type: '', text: '', details: [] })}
                className={`
                  p-1 rounded transition-colors
                  ${message.type === 'error' 
                    ? 'hover:bg-red-100' 
                    : message.type === 'warning' 
                      ? 'hover:bg-amber-100' 
                      : message.type === 'info'
                        ? 'hover:bg-blue-100'
                        : 'hover:bg-green-100'
                  }
                `}
              >
                <X className={`
                  w-4 h-4
                  ${message.type === 'error' 
                    ? 'text-red-600' 
                    : message.type === 'warning' 
                      ? 'text-amber-600' 
                      : message.type === 'info'
                        ? 'text-blue-600'
                        : 'text-green-600'
                  }
                `} />
              </button>
            </div>
          </div>
        )}

        {/* Queue Modal */}
        <QueueModal
          isOpen={showQueue}
          onClose={() => setShowQueue(false)}
          positions={positions}
          assetTypes={assetTypes}
          accounts={accounts}
          onClearCompleted={clearCompletedPositions}
          getRowStatus={getRowStatus}
        />
      </div>

      <style jsx>{`
        @keyframes slide-in-from-top {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-from-bottom {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-from-left {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slide-out-to-right {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(10px);
          }
        }
        
        .animate-in {
          animation-fill-mode: both;
        }
        
        .animate-out {
          animation-fill-mode: both;
        }
        
        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        /* Focus styles */
        input:focus, select:focus {
          outline: none;
        }
        
        /* Number input spinner removal */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
        /* Smooth hover transitions */
        button, input, select {
          transition: all 0.2s ease;
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .border-gray-200 {
            border-color: #374151;
          }
          
          .text-gray-600 {
            color: #1f2937;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </FixedModal>
  );
  };

// Export with proper display name
AddQuickPositionModal.displayName = 'AddQuickPositionModal';

export { AddQuickPositionModal };
export default AddQuickPositionModal;