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

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const ACCOUNT_CATEGORIES = [
  { id: "brokerage", name: "Brokerage", icon: Briefcase },
  { id: "retirement", name: "Retirement", icon: Building },
  { id: "cash", name: "Cash / Banking", icon: DollarSign },
  { id: "cryptocurrency", name: "Cryptocurrency", icon: Hash },
  { id: "metals", name: "Metals Storage", icon: Shield },
  { id: "real_estate", name: "Real Estate", icon: Home }
];

export const REQUIRED_BY_TYPE = {
  security: ["ticker","shares","price","cost_basis","purchase_date","account_id"],
  crypto:   ["symbol","quantity","purchase_price","current_price","purchase_date","account_id"],
  metal:    ["metal_type","symbol","quantity","purchase_price","current_price_per_unit","purchase_date","account_id"],
  cash:     ["cash_type","amount","account_id"],
  other:    ["asset_name","current_value"],
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

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
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="absolute -top-1 transition-all duration-500 ease-out" 
           style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
        <div className="w-3.5 h-3.5 bg-blue-600 rounded-full ring-4 ring-white shadow-md" />
      </div>
    </div>
  );
};

const ToggleSwitch = ({ value, onChange, leftLabel, rightLabel, leftIcon: LeftIcon, rightIcon: RightIcon }) => {
  return (
    <div className="flex items-center space-x-3 bg-gray-100 rounded-xl p-1.5 shadow-inner">
      <button
        onClick={() => onChange(false)}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${!value 
            ? 'bg-white text-gray-900 shadow-sm scale-105' 
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
          flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
          ${value 
            ? 'bg-white text-gray-900 shadow-sm scale-105' 
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
  
  const FilterIcon = filterType === 'institutions' ? Building2 : Filter;
  
  const handleSelectAll = () => {
    if (filterType === 'institutions') {
      onChange(new Set(uniqueInstitutions));
    } else {
      onChange(new Set(accounts.map(acc => acc.id)));
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
          flex items-center px-4 py-2.5 bg-white rounded-xl shadow-sm
          transition-all duration-200 text-sm border-2
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-300 shadow-md' : ''}
          ${selectedCount > 0 && !isAllSelected 
            ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:shadow-md' 
            : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }
          transform hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        <FilterIcon className={`w-4 h-4 mr-2 transition-transform duration-200 ${isOpen ? 'rotate-12' : ''}`} />
        <span className="font-medium">{getFilterLabel()}</span>
        <ChevronDown className={`w-4 h-4 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        {selectedCount > 0 && !isAllSelected && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
            {selectedCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute z-50 right-0 mt-2 w-96 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FilterIcon className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-semibold text-gray-800">
                  Filter by {filterType === 'institutions' ? 'Institution' : 'Account'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleSelectNone}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-all duration-200"
                >
                  None
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
          
          <div className="max-h-96 overflow-y-auto p-3">
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
                        w-full px-3 py-3 flex items-center justify-between rounded-xl
                        transition-all duration-200 text-sm group
                        ${isSelected 
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 shadow-sm' 
                          : 'hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center flex-1 mr-2">
                        <div className={`
                          w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center
                          transition-all duration-200 group-hover:scale-110
                          ${isSelected 
                            ? 'bg-blue-600 border-blue-600 shadow-sm' 
                            : 'border-gray-300 group-hover:border-gray-400'
                          }
                        `}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900 group-hover:text-gray-800">
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
                    <div className="flex items-center px-3 py-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
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
                              w-full px-3 py-3 flex items-center justify-between rounded-xl
                              transition-all duration-200 text-sm group
                              ${isSelected 
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 shadow-sm' 
                                : 'hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className="flex items-center flex-1 mr-2">
                              <div className={`
                                w-5 h-5 rounded-lg border-2 mr-3 flex items-center justify-center
                                transition-all duration-200 group-hover:scale-110
                                ${isSelected 
                                  ? 'bg-blue-600 border-blue-600 shadow-sm' 
                                  : 'border-gray-300 group-hover:border-gray-400'
                                }
                              `}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-gray-900 group-hover:text-gray-800">
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
    const badges = {
      success: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Added' },
      error: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Error' },
      submitting: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Adding...', spin: true },
      pending: { icon: Clock, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Pending' }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.color}`}>
        <Icon className={`w-3.5 h-3.5 mr-1.5 ${badge.spin ? 'animate-spin' : ''}`} />
        {badge.label}
      </span>
    );
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
    const counts = { total: 0, success: 0, error: 0, pending: 0, submitting: 0 };
    allPositions.forEach(pos => {
      counts.total++;
      counts[pos.status || 'pending']++;
    });
    return counts;
  }, [allPositions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <ClipboardList className="w-6 h-6 mr-2 text-blue-600" />
                Position Queue
              </h2>
              <p className="text-sm text-gray-500 mt-1">Review and manage your import queue</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <div className="text-xs text-emerald-700 mb-1">Added</div>
              <div className="text-2xl font-bold text-emerald-700">{stats.success}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="text-xs text-red-700 mb-1">Errors</div>
              <div className="text-2xl font-bold text-red-700">{stats.error}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="text-xs text-gray-700 mb-1">Pending</div>
              <div className="text-2xl font-bold text-gray-700">{stats.pending}</div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {allPositions.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex p-6 rounded-2xl bg-gray-100 mb-4">
                <ClipboardList className="w-16 h-16 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No positions in queue</h3>
              <p className="text-sm text-gray-500">Add positions to see them here</p>
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
                      p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md
                      ${position.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                        position.status === 'error' ? 'bg-red-50 border-red-200' :
                        position.status === 'submitting' ? 'bg-blue-50 border-blue-200' :
                        'bg-white border-gray-200'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`p-3 rounded-xl ${config.color.lightBg} shadow-sm`}>
                          <Icon className={`w-5 h-5 ${config.color.text}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-base">
                            {position.data.ticker || position.data.symbol || position.data.asset_name || 
                            position.data.metal_type || position.data.currency || 'Position'}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {position.assetType === 'otherAssets' 
                              ? 'Other Assets (No Account)' 
                              : (account?.account_name || 'Unknown Account')
                            } • {config.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-bold text-gray-900 text-lg">
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
                      <div className="mt-3 text-sm text-red-700 bg-red-100 rounded-lg p-3 border border-red-200">
                        <span className="font-semibold">Error: </span>{position.errorMessage}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={onClearCompleted}
            disabled={stats.success === 0}
            className={`
              px-5 py-2.5 text-sm font-semibold rounded-xl transition-all
              ${stats.success === 0 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md'
              }
            `}
          >
            <CheckCheck className="w-4 h-4 inline mr-2" />
            Clear Added ({stats.success})
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white text-sm font-semibold rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-xl"
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // Seed identity
  const seedString = JSON.stringify(seedPositions ?? {});
  const seedId = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seedString.length; i++) h = (h * 31 + seedString.charCodeAt(i)) | 0;
    return String(h);
  }, [seedString]);

  const initialSeedRef = React.useRef({ seedId: null, value: null });
  
  // Core state
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({
    security: [],
    cash: [],
    crypto: [],
    metal: [],
    otherAssets: []
  });
  
  // UI state
  const [expandedSections, setExpandedSections] = useState({});
  const [accountExpandedSections, setAccountExpandedSections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [focusedCell, setFocusedCell] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '', details: [] });
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('any');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState(new Set());
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState(new Set());
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  
  // Search state
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  
  // Refs
  const cellRefs = useRef({});
  const messageTimeoutRef = useRef(null);
  const seedAppliedRef = useRef(false);
  const accountIndexRef = useRef({ byName: new Map(), byNameInst: new Map() });

  // Asset types configuration
  const assetTypes = {
    security: {
      name: 'Securities',
      icon: BarChart3,
      color: {
        main: 'blue',
        bg: 'bg-gradient-to-br from-blue-600 to-blue-700',
        lightBg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        hover: 'hover:bg-blue-100',
      },
      description: 'Stocks, ETFs, Mutual Funds',
      searchable: true,
      searchField: 'ticker',
      fields: [
        { key: 'ticker', label: 'Ticker', type: 'text', required: true, width: 'w-28', placeholder: 'AAPL', transform: 'uppercase', searchable: true },
        { key: 'name', label: 'Company', type: 'text', width: 'w-48', readOnly: true, placeholder: 'Auto-filled' },
        { key: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-24', placeholder: '100', min: 0, step: 1 },
        { key: 'price', label: 'Price', type: 'number', required: true, width: 'w-28', placeholder: 'Auto', prefix: '$', min: 0, step: 0.01, readOnly: true },
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
        bg: 'bg-gradient-to-br from-purple-600 to-purple-700',
        lightBg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        hover: 'hover:bg-purple-100',
      },
      description: 'Savings, Checking, Money Market',
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
        bg: 'bg-gradient-to-br from-orange-600 to-orange-700',
        lightBg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        hover: 'hover:bg-orange-100',
      },
      description: 'Bitcoin, Ethereum, Altcoins',
      searchable: true,
      searchField: 'symbol',
      fields: [
        { key: 'symbol', label: 'Symbol', type: 'text', required: true, width: 'w-24', placeholder: 'BTC', transform: 'uppercase', searchable: true },
        { key: 'name', label: 'Name', type: 'text', width: 'w-48', readOnly: true, placeholder: 'Auto-filled' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28', placeholder: '0.5', step: '0.00000001', min: 0 },
        { key: 'purchase_price', label: 'Buy Price', type: 'number', required: true, width: 'w-32', placeholder: '45000', prefix: '$', min: 0 },
        { key: 'current_price', label: 'Current', type: 'number', width: 'w-32', placeholder: 'Auto', prefix: '$', min: 0, readOnly: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0] },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
      ]
    },
    metal: {
      name: 'Metals',
      icon: Gem,
      color: {
        main: 'yellow',
        bg: 'bg-gradient-to-br from-yellow-600 to-yellow-700',
        lightBg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        hover: 'hover:bg-yellow-100',
      },
      description: 'Gold, Silver, Platinum',
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
        { key: 'symbol', label: 'Symbol', type: 'text', width: 'w-24', readOnly: true, placeholder: 'Auto' },
        { key: 'name', label: 'Market', type: 'text', width: 'w-48', readOnly: true, placeholder: 'Auto' },
        { key: 'quantity', label: 'Qty', type: 'number', required: true, width: 'w-24', placeholder: '10', min: 0 },
        { key: 'unit', label: 'Unit', type: 'text', width: 'w-20', readOnly: true, default: 'oz' },
        { key: 'purchase_price', label: 'Price/Unit', type: 'number', required: true, width: 'w-28', placeholder: '1800', prefix: '$', min: 0 },
        { key: 'current_price_per_unit', label: 'Current', type: 'number', width: 'w-28', placeholder: 'Auto', prefix: '$', min: 0, readOnly: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0] },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
      ]
    },
    otherAssets: {
      name: 'Other Assets',
      icon: Home,
      color: {
        main: 'green',
        bg: 'bg-gradient-to-br from-green-600 to-green-700',
        lightBg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        hover: 'hover:bg-green-100',
      },
      description: 'Real Estate, Vehicles, Collectibles',
      fields: [
        { key: 'asset_name', label: 'Asset Name', type: 'text', required: true, width: 'w-48', placeholder: '123 Main St' },
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
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0] },
        { key: 'notes', label: 'Notes', type: 'text', width: 'w-52', placeholder: 'Additional details...' }
      ]
    }
  };

  // Helper functions
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

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

  const mapSeedAccountId = (data = {}) => {
    if (data.account_id) {
      const n = Number(data.account_id);
      return { ...data, account_id: Number.isFinite(n) ? n : data.account_id };
    }

    const rawName = (data.account_name ?? data.account ?? '').toString().trim();
    const rawInst = (data.institution ?? data.bank ?? data.brokerage ?? '').toString().trim();

    if (!rawName && !rawInst) return data;

    const name = rawName.toLowerCase();
    const inst = rawInst.toLowerCase();
    const { byName, byNameInst } = accountIndexRef.current;

    const hitBoth = byNameInst.get(`${name}::${inst}`);
    if (hitBoth?.id) return { ...data, account_id: hitBoth.id };

    const hitName = byName.get(name);
    if (hitName?.id) return { ...data, account_id: hitName.id };

    const loose = [...byName.keys()].filter(k => k.startsWith(name));
    if (name && loose.length === 1) {
      const a = byName.get(loose[0]);
      if (a?.id) return { ...data, account_id: a.id };
    }

    return data;
  };

  const validateRow = useCallback((row) => {
    const t = row.type === "otherAssets" ? "other" : row.type;
    const req = REQUIRED_BY_TYPE[t] || [];
    const missing = [];
    for (const k of req) {
      const v = row.data?.[k];
      if (v === undefined || v === null || v === "") missing.push(k);
    }
    return { ok: missing.length === 0, missing };
  }, []);

  const getRowStatus = (row) => {
    if (row?.status === "submitting") return "submitting";
    if (row?.status === "added") return "added";
    if (row?.status === "error") return "error";
    return validateRow(row).ok ? "ready" : "draft";
  };

  const matchesStatusFilter = (row) => {
    if (statusFilter === 'any') return true;
    const s = getRowStatus(row);
    return s === statusFilter;
  };

  const toggleRowSelected = useCallback((rowId, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(rowId); else next.delete(rowId);
      return next;
    });
  }, []);

  const toggleAllSelectedForType = useCallback((assetType, checked) => {
    setSelectedIds(prev => {
      if (!checked) return new Set([...prev].filter(id => !positions[assetType].some(p => p.id === id)));
      const next = new Set(prev);
      positions[assetType].forEach(p => next.add(p.id));
      return next;
    });
  }, [positions]);

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

  // Load accounts
  const loadAccounts = async () => {
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
      buildAccountIndex(fetchedAccounts);
      
      setSelectedAccountFilter(new Set(fetchedAccounts.map(acc => acc.id)));
      setSelectedInstitutionFilter(new Set(fetchedAccounts.map(acc => acc.institution).filter(Boolean)));
    } catch (error) {
      console.error('Error loading accounts:', error);
      showMessage('error', 'Failed to load accounts', [`Error: ${error.message}`]);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (query, assetType, positionId) => {
      if (!query || query.length < 2) {
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
        
        const filteredResults = assetType === 'security' 
          ? results.filter(item => item.asset_type === 'security' || item.asset_type === 'index')
          : assetType === 'crypto'
          ? results.filter(item => item.asset_type === 'crypto')
          : results;
        
        if (assetType === 'metal' && filteredResults.length > 0) {
          handleSelectSecurity(assetType, positionId, filteredResults[0]);
          setSearchResults(prev => ({
            ...prev,
            [searchKey]: []
          }));
        } else {
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

  // Handle security selection
  const handleSelectSecurity = (assetType, positionId, security) => {
    const searchKey = `${assetType}-${positionId}`;

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

    const px = getQuotePrice(security);

    setPositions((prev) => ({
      ...prev,
      [assetType]: prev[assetType].map((pos) => {
        if (pos.id !== positionId) return pos;
        const d = { ...pos.data };

        if (assetType === 'security') {
          d.ticker = security.ticker;
          if (px != null) d.price = px;
          d.name = security.name;
          if (d.cost_basis == null && d.price != null) d.cost_basis = d.price;
        } else if (assetType === 'crypto') {
          d.symbol = security.ticker;
          if (px != null) d.current_price = px;
          d.name = security.name;
          if (d.purchase_price == null && d.current_price != null) d.purchase_price = d.current_price;
        } else if (assetType === 'metal') {
          d.symbol = security.ticker;
          if (px != null) d.current_price_per_unit = px;
          d.name = security.name;
          if (d.purchase_price == null && d.current_price_per_unit != null) d.purchase_price = d.current_price_per_unit;
        }

        return { ...pos, data: d, errors: { ...pos.errors } };
      }),
    }));

    setSearchResults((prev) => ({ ...prev, [searchKey]: [] }));
  };

  // Auto-hydrate prices
  const autoHydrateSeededPrices = useCallback(async () => {
    const metalSymbolByType = {
      Gold: 'GC=F',
      Silver: 'SI=F',
      Platinum: 'PL=F',
      Copper: 'HG=F',
      Palladium: 'PA=F',
    };

    const work = [];

    positions.security.forEach((p) => {
      const q = p?.data?.ticker || p?.data?.symbol;
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

    const chunks = await Promise.all(
      work.map(async (item) => {
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

    for (const hit of chunks) {
      if (hit?.chosen) {
        handleSelectSecurity(hit.type, hit.id, hit.chosen);
      }
    }
  }, [positions, handleSelectSecurity]);

  // Update position
  const updatePosition = (assetType, positionId, field, value) => {
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos => {
        if (pos.id === positionId) {
          const fieldConfig = assetTypes[assetType].fields.find(f => f.key === field);
          
          if (fieldConfig?.transform === 'uppercase') {
            value = value.toUpperCase();
          }
          
          if (assetType === 'metal' && field === 'metal_type' && value) {
            const selectedOption = fieldConfig.options.find(o => o.value === value);
            if (selectedOption?.symbol) {
              const updatedData = {
                ...pos.data,
                metal_type: value,
                symbol: selectedOption.symbol,
                name: `${value} Futures`
              };
              
              debouncedSearch(selectedOption.symbol, assetType, positionId);
              
              return {
                ...pos,
                data: updatedData,
                errors: { ...pos.errors },
                isNew: false,
                animateIn: false
              };
            }
          } else if (fieldConfig?.searchable && assetTypes[assetType].searchable) {
            debouncedSearch(value, assetType, positionId);
          }
          
          return {
            ...pos,
            data: { ...pos.data, [field]: value },
            errors: { ...pos.errors },
            isNew: false,
            animateIn: false
          };
        }
        return pos;
      })
    }));
  };

  // Add new row
  const addNewRow = (assetType) => {
    const lastPosition = positions[assetType][positions[assetType].length - 1];
    const defaultData = {};
    
    assetTypes[assetType].fields.forEach(field => {
      if (field.default !== undefined) {
        defaultData[field.key] = field.default;
      }
    });
    
    if (lastPosition && lastPosition.data.account_id) {
      defaultData.account_id = lastPosition.data.account_id;
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

  // Delete position
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
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(positionId);
        return next;
      });
    }, 300);
  };

  // Delete selected
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
  };

  // Toggle section
  const toggleSection = (assetType) => {
    setExpandedSections(prev => ({
      ...prev,
      [assetType]: !prev[assetType]
    }));
  };

  // Calculate stats
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
        const hasValidData = type === 'otherAssets' 
          ? (pos.data.asset_name && pos.data.current_value) 
          : pos.data.account_id;
          
        if (hasValidData) {
          totalPositions++;
          byType[type].count++;
          
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

  // Submit all
  const submitAll = async () => {
    if (stats.totalPositions === 0) {
      showMessage('error', 'No positions to submit', ['Add at least one position before submitting']);
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const updatedPositions = { ...positions };
    const successfulPositionData = [];

    try {
      const batches = [];
      Object.entries(positions).forEach(([type, typePositions]) => {
        typePositions.forEach(pos => {
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
          
          updatedPositions[type] = updatedPositions[type].map(pos => 
            pos.id === position.id ? { ...pos, status: 'added' } : pos
          );
          
          const progress = Math.round(((i + 1) / batches.length) * 100);
          showMessage('info', `Submitting positions... ${progress}%`, [`${successCount} of ${batches.length} completed`], 0);
          
        } catch (error) {
          console.error(`Error adding ${type} position:`, error);
          errorCount++;
          errors.push(`${assetTypes[type].name}: ${error.message || 'Unknown error'}`);
          
          updatedPositions[type] = updatedPositions[type].map(pos => 
            pos.id === position.id ? { ...pos, status: 'error', errorMessage: error.message } : pos
          );
        }
      }

      setPositions(updatedPositions);

      if (successCount > 0) {
        showMessage('success', `Successfully added ${successCount} positions!`, 
          errorCount > 0 ? [`${errorCount} positions failed`] : []
        );
        
        if (onPositionsSaved) {
          onPositionsSaved(successCount, successfulPositionData);
        }
      } else {
        showMessage('error', 'Failed to add any positions', errors.slice(0, 5));
      }

    } catch (error) {
      console.error('Error submitting positions:', error);
      showMessage('error', 'Failed to submit positions', [error.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear all
  const clearAll = () => {
    if (stats.totalPositions > 0 && !window.confirm('Clear all positions? This cannot be undone.')) {
      return;
    }

    const empty = { security: [], cash: [], crypto: [], metal: [], otherAssets: [] };
    setPositions(empty);
    localStorage.removeItem(`quickpositions:work:${seedId}`);
    setExpandedSections({});
    setAccountExpandedSections({});
    showMessage('success', 'All positions cleared', ['Ready for new entries']);
  };

  // Initialize
  useEffect(() => {
    if (!isOpen) return;

    loadAccounts();

    const key = `quickpositions:work:${seedId}`;

    if (initialSeedRef.current.seedId === seedId && !seedAppliedRef.current) {
      const saved = localStorage.getItem(key);

      if (saved) {
        setPositions(JSON.parse(saved));
      } else {
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

    setExpandedSections({});
    setAccountExpandedSections({});
    setMessage({ type: '', text: '', details: [] });
    setActiveFilter('all');
    setSearchResults({});
    setShowKeyboardShortcuts(true);
    setTimeout(() => setShowKeyboardShortcuts(false), 3000);

    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, [isOpen, seedId]);

  // Persist positions
  useEffect(() => {
    if (!isOpen) return;
    const key = `quickpositions:work:${seedId}`;
    localStorage.setItem(key, JSON.stringify(positions));
  }, [isOpen, seedId, positions]);

  // Auto-hydrate when accounts load
  useEffect(() => {
    if (!isOpen || !accounts || accounts.length === 0) return;
    
    const key = `quickpositions:work:${seedId}`;
    setTimeout(() => {
      try { 
        autoHydrateSeededPrices?.(); 
        localStorage.setItem(key, JSON.stringify(positions)); 
      } catch (e) {
        console.error(e);
      }
    }, 0);
  }, [isOpen, accounts.length]);

  // Render cell input
  const renderCellInput = (assetType, position, field, cellKey) => {
    const value = position.data[field.key] || '';
    const hasError = position.errors?.[field.key];
    const fieldIndex = assetTypes[assetType].fields.findIndex(f => f.key === field.key);
    const searchKey = `${assetType}-${position.id}`;
    const searchResultsForField = searchResults[searchKey] || [];
    const isSearchingField = isSearching[searchKey] || false;
    
    const baseClass = `
      w-full px-3 py-2.5 text-sm border-2 rounded-xl transition-all duration-200
      ${field.readOnly ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}
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
      'data-position-id': position.id,
      'data-field': field.key,
      disabled: field.readOnly
    };

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
            />
            {isSearchingField && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          {inputRect && ReactDOM.createPortal(
            <div 
              style={{
                position: 'fixed',
                top: `${inputRect.bottom + 4}px`,
                left: `${inputRect.left}px`,
                width: `${inputRect.width}px`,
                zIndex: 9999999
              }}
              className="bg-white border-2 border-gray-300 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto">
                {searchResultsForField.map((result, idx) => (
                  <button
                    key={result.ticker}
                    type="button"
                    className={`
                      w-full px-4 py-3 text-sm text-left hover:bg-blue-50 transition-colors
                      flex items-center justify-between
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
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="font-bold text-gray-900">{result.ticker}</span>
                      <span className="text-gray-500 text-xs truncate">{result.name}</span>
                    </div>
                    <span className="font-semibold text-gray-700 ml-2">
                      ${parseFloat(result.price).toFixed(2)}
                    </span>
                  </button>
                ))}
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
                className={`${baseClass} pr-10 cursor-pointer appearance-none`}
              >
                <option value="">Select account...</option>
                <optgroup label="All Accounts">
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          );
        } else {
          return (
            <div className="relative w-full">
              <select
                {...commonProps}
                value={value}
                onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
                className={`${baseClass} pr-10 cursor-pointer appearance-none`}
              >
                {field.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          );
        }
        
      case 'number':
        return (
          <div className="relative w-full">
            {field.prefix && (
              <span className={`
                absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold transition-colors
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
              className={`${baseClass} ${field.prefix ? 'pl-8' : ''} ${field.suffix ? 'pr-10' : ''}`}
            />
            {field.suffix && (
              <span className={`
                absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold transition-colors
                ${focusedCell === cellKey ? 'text-blue-600' : 'text-gray-400'}
              `}>
                {field.suffix}
              </span>
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
          <input
            {...commonProps}
            type="text"
            value={value}
            onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
            placeholder={field.placeholder}
            className={baseClass}
          />
        );
    }
  };

  // Render asset section
  const renderAssetSection = (assetType) => {
    const config = assetTypes[assetType];
    let typePositions = positions[assetType] || [];
    typePositions = typePositions.filter(matchesStatusFilter);
    
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
        className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md"
      >
        <div 
          onClick={() => toggleSection(assetType)}
          className={`
            px-5 py-4 cursor-pointer transition-all duration-200
            ${isExpanded 
              ? `${config.bg} text-white shadow-md` 
              : 'bg-gradient-to-r from-gray-50 via-white to-gray-50 hover:from-gray-100 hover:via-gray-50 hover:to-gray-100'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className={`
                p-3 rounded-xl transition-all duration-200 shadow-sm
                ${isExpanded ? 'bg-white/20' : `${config.lightBg}`}
              `}>
                <Icon className={`w-6 h-6 ${isExpanded ? 'text-white' : config.text}`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className={`font-bold text-lg ${
                    isExpanded ? 'text-white' : 'text-gray-900'
                  }`}>
                    {config.name}
                  </h3>
                  {validPositions.length > 0 && (
                    <span className={`
                      px-2.5 py-1 text-xs font-bold rounded-lg
                      ${isExpanded ? 'bg-white/20 text-white' : `${config.bg} text-white`}
                    `}>
                      {validPositions.length}
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-1 ${isExpanded ? 'text-white/90' : 'text-gray-500'}`}>
                  {config.description}
                </p>
              </div>
              
              {typeStats && typeStats.count > 0 && (
                <div className={`flex items-center space-x-6 ${
                  isExpanded ? 'text-white/90' : 'text-gray-700'
                }`}>
                  <div className="text-right">
                    <div className="text-xs opacity-75 mb-1">Value</div>
                    <div className="text-lg font-bold">
                      {showValues ? formatCurrency(typeStats.value) : '••••••'}
                    </div>
                  </div>
                  {performance !== undefined && (
                    <div className="text-right">
                      <div className="text-xs opacity-75 mb-1">Return</div>
                      <div className={`text-lg font-bold flex items-center ${
                        performance >= 0 ? (isExpanded ? 'text-green-100' : 'text-green-600') : (isExpanded ? 'text-red-100' : 'text-red-600')
                      }`}>
                        {performance >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                        {showValues ? `${Math.abs(performance).toFixed(1)}%` : '•••'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addNewRow(assetType);
                  if (!isExpanded) {
                    setExpandedSections(prev => ({ ...prev, [assetType]: true }));
                  }
                }}
                className={`
                  p-2 rounded-xl transition-all duration-200 
                  ${isExpanded 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : `${config.lightBg} hover:${config.hover} ${config.text}`
                  }
                `}
                title={`Add ${config.name}`}
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <ChevronDown className={`
                w-6 h-6 transition-transform duration-300
                ${isExpanded ? 'rotate-180 text-white' : 'text-gray-400'}
              `} />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-white animate-in slide-in-from-top-2 duration-300">
            {typePositions.length === 0 ? (
              <div className="p-16 text-center">
                <div className={`inline-flex p-6 rounded-2xl ${config.lightBg} shadow-inner mb-6`}>
                  <Icon className={`w-16 h-16 ${config.text}`} />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  No {config.name.toLowerCase()} yet
                </h4>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                  Start building your portfolio by adding your first {config.name.toLowerCase()} position
                </p>
                <button
                  onClick={() => addNewRow(assetType)}
                  className={`
                    inline-flex items-center px-6 py-3 rounded-xl font-bold text-base
                    transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105
                    ${config.bg} text-white
                  `}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add First {config.name}
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <th className="w-12 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={(e) => toggleAllSelectedForType(assetType, e.target.checked)}
                            checked={
                              typePositions.length > 0 && 
                              typePositions.every(p => selectedIds.has(p.id))
                            }
                            className="rounded-lg border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 w-4 h-4"
                          />
                        </th>
                        {config.fields.map(field => (
                          <th key={field.key} className={`${field.width} px-3 py-3 text-left`}>
                            <span className="text-xs font-bold text-gray-700 flex items-center uppercase tracking-wide">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1 text-base">*</span>}
                              {field.readOnly && (
                                <Info className="w-3.5 h-3.5 ml-1.5 text-gray-400" title="Auto-filled" />
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="w-28 px-3 py-3 text-left">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Status</span>
                        </th>
                        <th className="w-20 px-3 py-3 text-center">
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Actions</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {typePositions.map((position, index) => {
                        const hasErrors = Object.values(position.errors || {}).some(e => e);
                        
                        return (
                          <tr 
                            key={position.id}
                            className={`
                              border-b border-gray-100 transition-all duration-300 group
                              ${position.isNew ? 'bg-blue-50/30' : 'hover:bg-gray-50'}
                              ${position.animateIn ? 'animate-in slide-in-from-left duration-300' : ''}
                              ${position.animateOut ? 'animate-out slide-out-to-right duration-300' : ''}
                              ${hasErrors ? 'bg-red-50/30' : ''}
                            `}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(position.id)}
                                  onChange={(e) => toggleRowSelected(position.id, e.target.checked)}
                                  className="rounded-lg border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-gray-500">{index + 1}</span>
                                {position.isNew && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                              </div>
                            </td>

                            {config.fields.map(field => (
                              <td key={field.key} className={`${field.width} px-2 py-2`}>
                                {renderCellInput(
                                  assetType, 
                                  position, 
                                  field, 
                                  `${assetType}-${position.id}-${field.key}`
                                )}
                              </td>
                            ))}

                            <td className="px-3 py-3">
                              {(() => {
                                const s = getRowStatus(position);
                                const badges = {
                                  ready:      { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "Ready" },
                                  draft:      { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "Draft" },
                                  submitting: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", label: "Adding..." },
                                  added:      { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", label: "Added" },
                                  error:      { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Error" },
                                };
                                const badge = badges[s] || badges.draft;
                                return (
                                  <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-lg border-2 ${badge.bg} ${badge.text} ${badge.border}`}>
                                    {badge.label}
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="px-3 py-3">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const menuKey = `menu-${assetType}-${position.id}`;
                                    setFocusedCell(focusedCell === menuKey ? null : menuKey);
                                  }}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {focusedCell === `menu-${assetType}-${position.id}` && (
                                  <div className="absolute right-0 top-10 z-50 w-44 bg-white border-2 border-gray-200 rounded-xl shadow-2xl py-1 animate-in slide-in-from-top-2 duration-200">
                                    <button
                                      onClick={() => {
                                        duplicatePosition(assetType, position);
                                        setFocusedCell(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 font-medium"
                                    >
                                      <Copy className="w-4 h-4" />
                                      <span>Duplicate</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        toggleRowSelected(position.id, !selectedIds.has(position.id));
                                        setFocusedCell(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 font-medium"
                                    >
                                      {selectedIds.has(position.id) ? (
                                        <><CheckSquare className="w-4 h-4" /><span>Deselect</span></>
                                      ) : (
                                        <><Square className="w-4 h-4" /><span>Select</span></>
                                      )}
                                    </button>
                                    <div className="border-t border-gray-100 my-1" />
                                    <button
                                      onClick={() => {
                                        deletePosition(assetType, position.id);
                                        setFocusedCell(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 font-medium"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-100">
                  <button
                    onClick={() => addNewRow(assetType)}
                    className={`
                      w-full py-3 px-4 border-2 border-dashed rounded-xl
                      transition-all duration-200 flex items-center justify-center space-x-2
                      ${config.border} hover:border-solid hover:shadow-md
                      group font-medium
                    `}
                  >
                    <Plus className={`w-5 h-5 ${config.text} group-hover:scale-110 transition-transform`} />
                    <span className={`text-sm ${config.text}`}>
                      Add {config.name}
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

  if (!isOpen) return null;

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Position Entry"
      size="max-w-[1600px]"
    >
      <div className="h-[90vh] flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b-2 border-gray-200 px-6 py-5 shadow-sm">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 rounded-xl px-5 py-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-slate-700/50">
              <div className="flex items-center space-x-4">
                <button
                  onClick={clearAll}
                  className="px-4 py-2.5 text-sm bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center space-x-2 group shadow-sm hover:shadow-md"
                >
                  <Trash2 className="w-4 h-4 group-hover:text-red-600 transition-colors" />
                  <span>Clear All</span>
                </button>
                
                <button
                  onClick={() => {
                    const addedCount = Object.values(positions).reduce((sum, arr) => 
                      sum + arr.filter(p => p.status === 'added').length, 0
                    );
                    
                    if (addedCount === 0) {
                      showMessage('info', 'No imported positions to remove');
                      return;
                    }
                    
                    if (!window.confirm(`Remove ${addedCount} imported position${addedCount !== 1 ? 's' : ''}?`)) {
                      return;
                    }
                    
                    const updated = {};
                    Object.entries(positions).forEach(([type, arr]) => {
                      updated[type] = arr.filter(p => p.status !== 'added');
                    });
                    
                    setPositions(updated);
                    localStorage.setItem(`quickpositions:work:${seedId}`, JSON.stringify(updated));
                    showMessage('success', `Removed ${addedCount} imported position${addedCount !== 1 ? 's' : ''}`);
                  }}
                  className="px-4 py-2.5 text-sm bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <CheckCheck className="w-4 h-4 text-green-600" />
                  <span>Remove Imported</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
                >
                  Cancel
                </button>
             
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={deleteSelected}
                      className="px-4 py-2.5 text-sm font-semibold rounded-xl border-2 transition-all bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 shadow-sm hover:shadow-md"
                    >
                      <Trash2 className="w-4 h-4 inline mr-2" />
                      Delete Selected ({selectedIds.size})
                    </button>
                  </>
                )}

                <div className="ml-auto flex items-center space-x-3">
                  <span className="text-sm text-white/70">Add by:</span>
                  <ToggleSwitch
                    value={viewMode}
                    onChange={setViewMode}
                    leftLabel="Asset"
                    rightLabel="Account"
                    leftIcon={Layers}
                    rightIcon={Wallet}
                  />
                </div>
              </div>

              {viewMode && accounts.length > 0 && (
                <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-white/70 font-medium">Filters:</span>
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
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 ml-4">
              <button
                onClick={() => setShowValues(!showValues)}
                className={`p-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                  showValues 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-2 border-blue-300' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-300'
                }`}
                title={showValues ? 'Hide values' : 'Show values'}
              >
                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setShowQueue(true)}
                className="px-5 py-3 text-sm bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center space-x-2 shadow-sm hover:shadow-md"
              >
                <ClipboardList className="w-5 h-5" />
                <span>View Queue</span>
                {stats.totalPositions > 0 && (
                  <span className="ml-2 px-2.5 py-0.5 bg-gray-900 text-white text-xs rounded-full font-bold">
                    {stats.totalPositions}
                  </span>
                )}
              </button>
              
              <button
                onClick={submitAll}
                disabled={stats.totalPositions === 0 || isSubmitting}
                className={`
                  px-8 py-3 text-sm font-bold rounded-xl transition-all duration-200 
                  flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105
                  ${stats.totalPositions === 0 || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                  }
                `}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Add {stats.totalPositions} Position{stats.totalPositions !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <Hash className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">Positions:</span>
                <span className="text-2xl font-bold text-gray-900">
                  <AnimatedNumber value={stats.totalPositions} />
                </span>
              </div>
              
              <div className="h-8 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">Value:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {showValues ? (
                    <AnimatedNumber value={stats.totalValue} prefix="$" decimals={0} />
                  ) : (
                    '••••••'
                  )}
                </span>
              </div>
              
              {stats.totalPerformance !== 0 && (
                <>
                  <div className="h-8 w-px bg-gray-300"></div>
                  <div className="flex items-center space-x-3">
                    {stats.totalPerformance >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className="text-sm text-gray-600 font-medium">Return:</span>
                    <span className={`text-2xl font-bold ${
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
            </div>

            {stats.totalPositions > 0 && (
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500 font-medium">Progress</span>
                <ProgressIndicator 
                  current={stats.totalPositions - stats.errors.length} 
                  total={stats.totalPositions}
                  className="w-32"
                />
                <span className="text-sm font-bold text-gray-700">
                  {Math.round(((stats.totalPositions - stats.errors.length) / stats.totalPositions) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          {!viewMode && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-700 mr-2 uppercase tracking-wide">Asset Type:</span>
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`
                    px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200
                    ${activeFilter === 'all' 
                      ? 'bg-gray-900 text-white shadow-lg scale-105' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
                    }
                  `}
                >
                  All Types
                </button>

                {Object.entries(assetTypes).map(([key, config]) => {
                  const Icon = config.icon;
                  const count = stats.byType[key]?.count || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveFilter(activeFilter === key ? 'all' : key)}
                      className={`
                        px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center space-x-2
                        ${activeFilter === key 
                          ? `${config.bg} text-white shadow-lg scale-105` 
                          : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{config.name}</span>
                      {count > 0 && (
                        <span className={`
                          px-2 py-0.5 text-[10px] rounded-full font-bold
                          ${activeFilter === key ? 'bg-white/20' : 'bg-gray-100'}
                        `}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-700 mr-2 uppercase tracking-wide">Status:</span>
                {[
                  {k:'any',label:'All'},
                  {k:'ready',label:'Ready'},
                  {k:'draft',label:'Draft'},
                  {k:'submitting',label:'Adding'},
                  {k:'added',label:'Added'},
                  {k:'error',label:'Error'},
                ].map(opt => (
                  <button
                    key={opt.k}
                    onClick={() => setStatusFilter(opt.k)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200
                      ${statusFilter === opt.k
                        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300 scale-105' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Validation Summary */}
          {stats.errors.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl shadow-sm">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900 mb-2">
                    {stats.errors.length} issue{stats.errors.length !== 1 ? 's' : ''} need attention
                  </h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {stats.errors.slice(0, 5).map((error, idx) => {
                      const config = assetTypes[error.type];
                      const position = positions[error.type].find(p => p.id === error.id);
                      const rowIndex = positions[error.type].indexOf(position) + 1;
                      
                      return (
                        <button
                          key={`${error.type}-${error.id}`}
                          onClick={() => {
                            setActiveFilter(error.type);
                            setExpandedSections(prev => ({ ...prev, [error.type]: true }));
                            setTimeout(() => {
                              const firstError = Object.keys(error.errors).find(k => error.errors[k]);
                              const cellKey = `${error.type}-${error.id}-${firstError}`;
                              cellRefs.current[cellKey]?.focus();
                            }, 100);
                          }}
                          className="text-xs text-amber-800 hover:text-amber-900 hover:underline text-left block font-medium"
                        >
                          {config.name} row {rowIndex}: {Object.entries(error.errors)
                            .filter(([_, v]) => v)
                            .map(([k, _]) => config.fields.find(f => f.key === k)?.label || k)
                            .join(', ')} missing
                        </button>
                      );
                    })}
                    {stats.errors.length > 5 && (
                      <p className="text-xs text-amber-700 font-bold">
                        ...and {stats.errors.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {Object.keys(assetTypes)
            .filter(type => activeFilter === 'all' || activeFilter === type)
            .map(assetType => renderAssetSection(assetType))}
        </div>

        {/* Message */}
        {message.text && (
          <div className={`
            absolute bottom-6 left-6 right-6 p-5 rounded-2xl shadow-2xl border-2
            animate-in slide-in-from-bottom duration-300 z-40
            ${message.type === 'error' 
              ? 'bg-red-50 border-red-300' 
              : message.type === 'warning' 
                ? 'bg-amber-50 border-amber-300' 
                : message.type === 'info'
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-green-50 border-green-300'
            }
          `}>
            <div className="flex items-start space-x-3">
              <div className={`
                flex-shrink-0 p-2 rounded-xl
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
                  font-bold text-base
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
                    mt-2 space-y-1 text-sm
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
                      <li key={index} className="flex items-start space-x-2">
                        <span className="block w-1.5 h-1.5 rounded-full bg-current mt-2 flex-shrink-0"></span>
                        <span>{detail}</span>
                      </li>
                    ))}
                    {message.details.length > 3 && (
                      <li className="font-bold">
                        ... and {message.details.length - 3} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setMessage({ type: '', text: '', details: [] })}
                className={`
                  p-1.5 rounded-xl transition-colors
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
                  w-5 h-5
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
          onClearCompleted={() => {
            const updated = {};
            Object.keys(positions).forEach(type => {
              updated[type] = positions[type].filter(pos => pos.status !== 'added');
            });
            setPositions(updated);
            showMessage('success', 'Cleared all successfully added positions');
          }}
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
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 10px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 10px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #d1d5db, #9ca3af);
          border-radius: 10px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #9ca3af, #6b7280);
        }
        
        input:focus, select:focus {
          outline: none;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
        
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

AddQuickPositionModal.displayName = 'AddQuickPositionModal';

export { AddQuickPositionModal };
export default AddQuickPositionModal;