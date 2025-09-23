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
  ClipboardList, CheckCheck, XCircle, AlertTriangle,
  PlayCircle, PauseCircle, FastForward, SkipForward,
  Settings, Sliders, FilterX, SelectAll, Trash,
  Bell, Warning, StopCircle, PackageX, PackageCheck, Package2
} from 'lucide-react';
import ReactDOM from 'react-dom';

// Enhanced AnimatedNumber with smoother transitions
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0, duration = 400 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (value === displayValue) return;
    
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOutCubic;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration, displayValue]);
  
  const formattedValue = decimals > 0 
    ? displayValue.toFixed(decimals)
    : Math.floor(displayValue).toLocaleString();
    
  return (
    <span className={`transition-all duration-200 ${isAnimating ? 'text-blue-600 scale-105' : ''}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

// Enhanced Progress Bar with status indicators
const ProgressBar = ({ current, total, className = '', status = 'default' }) => {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  
  const statusColors = {
    default: 'from-blue-500 to-blue-600',
    success: 'from-green-500 to-green-600', 
    warning: 'from-yellow-500 to-yellow-600',
    error: 'from-red-500 to-red-600',
    processing: 'from-purple-500 to-purple-600'
  };
  
  return (
    <div className={`relative ${className}`}>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${statusColors[status]} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div 
        className="absolute -top-0.5 transition-all duration-500 ease-out" 
        style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
      >
        <div className={`w-3 h-3 bg-gradient-to-r ${statusColors[status]} rounded-full ring-2 ring-white shadow-sm`} />
      </div>
    </div>
  );
};

// Smart Banner Component for contextual messages
const SmartBanner = ({ type, title, message, actions, onDismiss, count, persistent = false }) => {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed && !persistent) return null;
  
  const typeStyles = {
    success: {
      container: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      messageColor: 'text-green-800'
    },
    warning: {
      container: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      messageColor: 'text-yellow-800'
    },
    error: {
      container: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200',
      icon: AlertCircle,
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      messageColor: 'text-red-800'
    },
    info: {
      container: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-800'
    },
    processing: {
      container: 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200',
      icon: Activity,
      iconColor: 'text-purple-600',
      titleColor: 'text-purple-900',
      messageColor: 'text-purple-800'
    }
  };
  
  const style = typeStyles[type];
  const IconComponent = style.icon;
  
  return (
    <div className={`rounded-xl border p-4 mb-4 animate-in slide-in-from-top-2 duration-300 ${style.container}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${style.titleColor} flex items-center`}>
              {title}
              {count !== undefined && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${style.iconColor} bg-white/70`}>
                  {count}
                </span>
              )}
            </h3>
            {onDismiss && !persistent && (
              <button
                onClick={() => {
                  setDismissed(true);
                  onDismiss?.();
                }}
                className={`ml-3 p-1 rounded-lg hover:bg-black/5 ${style.iconColor}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {message && (
            <p className={`mt-1 text-sm ${style.messageColor}`}>
              {message}
            </p>
          )}
          {actions && (
            <div className="mt-3 flex items-center space-x-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${action.primary 
                    ? `${style.container.includes('green') ? 'bg-green-600' : 
                        style.container.includes('yellow') ? 'bg-yellow-600' :
                        style.container.includes('red') ? 'bg-red-600' :
                        style.container.includes('purple') ? 'bg-purple-600' : 'bg-blue-600'} text-white hover:opacity-90`
                    : 'bg-white/80 hover:bg-white text-gray-700'
                  }`}
                >
                  {action.icon && <action.icon className="w-3 h-3 mr-1 inline" />}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Bulk Operations Toolbar
const BulkOperationsToolbar = ({ selectedCount, onBulkDelete, onSelectAll, onDeselectAll, onBulkValidate, totalPositions }) => {
  if (selectedCount === 0) return null;
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium">
          {selectedCount} of {totalPositions} selected
        </span>
        
        <div className="h-4 w-px bg-gray-600"></div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={selectedCount === totalPositions ? onDeselectAll : onSelectAll}
            className="flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium transition-colors"
          >
            {selectedCount === totalPositions ? <Square className="w-3 h-3 mr-1" /> : <Check className="w-3 h-3 mr-1" />}
            {selectedCount === totalPositions ? 'Deselect All' : 'Select All'}
          </button>
          
          <button
            onClick={onBulkValidate}
            className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium transition-colors"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Validate
          </button>
          
          <button
            onClick={onBulkDelete}
            className="flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Asset type configuration (keeping existing structure)
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
      { key: 'maturity_date', label: 'Maturity', type: 'date', width: 'w-36' }
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
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0] },
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
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0] },
      { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
    ]
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
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36', max: new Date().toISOString().split('T')[0], default: new Date().toISOString().split('T')[0] },
      { key: 'notes', label: 'Notes', type: 'text', width: 'w-52', placeholder: 'Additional details...' }
    ]
  }
};

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // Core state management
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({
    security: [],
    cash: [],
    crypto: [],
    metal: [],
    otherAssets: []
  });

  // Enhanced UI state with persistence
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem('quickPosition_expandedSections');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Selection and filtering
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [filterType, setFilterType] = useState('all'); // 'all', 'valid', 'invalid', 'selected', 'processed'
  
  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importingPositions, setImportingPositions] = useState(new Set());
  const [processedPositions, setProcessedPositions] = useState(new Set());
  const [importResults, setImportResults] = useState(new Map());
  
  // Search & validation
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [selectedSecurities, setSelectedSecurities] = useState({});
  
  // UI state
  const [showValues, setShowValues] = useState(true);
  const [focusedCell, setFocusedCell] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  
  // Enhanced refs
  const cellRefs = useRef({});
  const tableRefs = useRef({});
  const messageTimeoutRef = useRef(null);

  // Persist expanded sections
  useEffect(() => {
    localStorage.setItem('quickPosition_expandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Initialize with seed positions and accounts
  useEffect(() => {
    if (!isOpen) return;

    loadAccounts();
    
    const castSeed = (rows, type) =>
      (rows ?? []).map((r) => ({
        id: r?.id ?? (Date.now() + Math.random()),
        type: type,
        data: r?.data ?? r,
        errors: r?.errors ?? {},
        isNew: true,
        animateIn: true
      }));

    const hasSeeds = !!(
      seedPositions &&
      (seedPositions.security?.length ||
      seedPositions.cash?.length ||
      seedPositions.crypto?.length ||
      seedPositions.metal?.length ||
      seedPositions.otherAssets?.length)
    );

    if (hasSeeds) {
      setPositions({
        security: castSeed(seedPositions.security, 'security'),
        cash: castSeed(seedPositions.cash, 'cash'),
        crypto: castSeed(seedPositions.crypto, 'crypto'),
        metal: castSeed(seedPositions.metal, 'metal'),
        otherAssets: castSeed(seedPositions.otherAssets, 'otherAssets')
      });
      
      // Auto-expand sections with data
      const newExpanded = {};
      Object.entries(seedPositions).forEach(([type, data]) => {
        if (data?.length > 0) {
          newExpanded[type] = true;
        }
      });
      setExpandedSections(prev => ({ ...prev, ...newExpanded }));
      
      // Trigger price hydration
      setTimeout(() => {
        autoHydrateSeededPrices();
      }, 100);
    } else {
      setPositions({ security: [], cash: [], crypto: [], metal: [], otherAssets: [] });
    }

    // Reset other state
    setSelectedPositions(new Set());
    setProcessedPositions(new Set());
    setImportingPositions(new Set());
    setImportResults(new Map());
    setFilterType('all');

    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, [isOpen, seedPositions]);


  // Add this useEffect after the main initialization useEffect
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || hydratedRef.current) return;

    const total =
      (positions.security?.length || 0) +
      (positions.crypto?.length || 0) +
      (positions.metal?.length || 0);

    if (total === 0) return;

    // Defer one tick so row UIs mount
    const timer = setTimeout(() => {
      try { 
        autoHydrateSeededPrices?.(); 
      } catch (e) { 
        console.error('Auto-hydration error:', e); 
      }
      hydratedRef.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    positions.security.length,
    positions.crypto.length,
    positions.metal.length
  ]);

  // Enhanced stats with comprehensive tracking
  const stats = useMemo(() => {
    let totalPositions = 0;
    let validPositions = 0;
    let invalidPositions = 0;
    let selectedCount = 0;
    let importingCount = 0;
    let processedCount = 0;
    let totalValue = 0;
    let totalCost = 0;
    const byType = {};
    const byAccount = {};
    const errorSummary = {};
    const performance = {};

    Object.entries(positions).forEach(([type, typePositions]) => {
      byType[type] = { 
        count: 0, 
        valid: 0, 
        invalid: 0, 
        selected: 0,
        importing: 0,
        processed: 0,
        value: 0, 
        cost: 0 
      };
      errorSummary[type] = [];
      
      typePositions.forEach(pos => {
        totalPositions++;
        const posKey = `${type}-${pos.id}`;
        
        // Check various states
        const isSelected = selectedPositions.has(posKey);
        const isImporting = importingPositions.has(posKey);
        const isProcessed = processedPositions.has(posKey);
        
        if (isSelected) {
          selectedCount++;
          byType[type].selected++;
        }
        
        if (isImporting) {
          importingCount++;
          byType[type].importing++;
        }
        
        if (isProcessed) {
          processedCount++;
          byType[type].processed++;
          return; // Skip processed positions from other calculations
        }

        // Validate position
        const hasValidData = type === 'otherAssets' 
          ? (pos.data.asset_name && pos.data.current_value) 
          : pos.data.account_id;
        
        const hasErrors = pos.errors && Object.values(pos.errors).some(e => e);
        const isValid = hasValidData && !hasErrors;
        
        if (isValid) {
          validPositions++;
          byType[type].valid++;
          
          // Calculate values for valid positions
          let value = 0, cost = 0;
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
          byType[type].count++;
        } else {
          invalidPositions++;
          byType[type].invalid++;
          
          if (hasErrors) {
            errorSummary[type].push({
              id: pos.id,
              errors: pos.errors,
              position: pos
            });
          }
        }
        
        // Track by account for non-otherAssets
        if (type !== 'otherAssets' && pos.data.account_id) {
          if (!byAccount[pos.data.account_id]) {
            byAccount[pos.data.account_id] = { count: 0, valid: 0, invalid: 0, value: 0, positions: [] };
          }
          byAccount[pos.data.account_id].count++;
          if (isValid) {
            byAccount[pos.data.account_id].valid++;
            byAccount[pos.data.account_id].value += value;
          } else {
            byAccount[pos.data.account_id].invalid++;
          }
          byAccount[pos.data.account_id].positions.push({ ...pos, assetType: type });
        }
      });

      // Calculate performance
      if (byType[type].cost > 0) {
        performance[type] = ((byType[type].value - byType[type].cost) / byType[type].cost) * 100;
      }
    });

    const totalPerformance = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    const totalErrors = Object.values(errorSummary).reduce((sum, errs) => sum + errs.length, 0);

    return { 
      totalPositions, 
      validPositions,
      invalidPositions,
      selectedCount,
      importingCount,
      processedCount,
      totalValue, 
      totalCost,
      totalPerformance,
      totalErrors,
      byType, 
      byAccount, 
      errorSummary,
      performance 
    };
  }, [positions, selectedPositions, importingPositions, processedPositions]);

  // Load accounts
  const loadAccounts = async () => {
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  // Enhanced selection management
  const handleSelectPosition = (assetType, positionId, checked) => {
    const posKey = `${assetType}-${positionId}`;
    const newSelection = new Set(selectedPositions);
    
    if (checked) {
      newSelection.add(posKey);
    } else {
      newSelection.delete(posKey);
    }
    
    setSelectedPositions(newSelection);
  };

  const handleSelectAll = () => {
    const newSelection = new Set();
    Object.entries(positions).forEach(([type, typePositions]) => {
      typePositions.forEach(pos => {
        if (!processedPositions.has(`${type}-${pos.id}`)) {
          newSelection.add(`${type}-${pos.id}`);
        }
      });
    });
    setSelectedPositions(newSelection);
  };

  const handleDeselectAll = () => {
    setSelectedPositions(new Set());
  };

  // Bulk operations
  const handleBulkDelete = () => {
    if (selectedPositions.size === 0) return;
    
    const updatedPositions = { ...positions };
    selectedPositions.forEach(posKey => {
      const [type, id] = posKey.split('-');
      updatedPositions[type] = updatedPositions[type].filter(pos => pos.id !== parseInt(id));
    });
    
    setPositions(updatedPositions);
    setSelectedPositions(new Set());
  };

  const handleBulkValidate = () => {
    if (selectedPositions.size === 0) return;
    
    const updatedPositions = { ...positions };
    selectedPositions.forEach(posKey => {
      const [type, id] = posKey.split('-');
      const typeConfig = assetTypes[type];
      
      updatedPositions[type] = updatedPositions[type].map(pos => {
        if (pos.id === parseInt(id)) {
          const errors = {};
          
          typeConfig.fields.forEach(field => {
            const value = pos.data[field.key];
            
            if (field.key === 'account_id' && type === 'otherAssets') {
              return; // Skip account validation for otherAssets
            }
            
            if (field.required && !value) {
              errors[field.key] = 'Required';
            } else if (field.type === 'number' && value) {
              if (field.min !== undefined && value < field.min) {
                errors[field.key] = `Min: ${field.min}`;
              }
              if (field.max !== undefined && value > field.max) {
                errors[field.key] = `Max: ${field.max}`;
              }
            }
          });
          
          return { ...pos, errors };
        }
        return pos;
      });
    });
    
    setPositions(updatedPositions);
  };

  // Enhanced filtering
  const getFilteredPositions = (assetType) => {
    const typePositions = positions[assetType] || [];
    
    switch (filterType) {
      case 'valid':
        return typePositions.filter(pos => {
          const hasValidData = assetType === 'otherAssets' 
            ? (pos.data.asset_name && pos.data.current_value) 
            : pos.data.account_id;
          const hasErrors = pos.errors && Object.values(pos.errors).some(e => e);
          return hasValidData && !hasErrors && !processedPositions.has(`${assetType}-${pos.id}`);
        });
      case 'invalid':
        return typePositions.filter(pos => {
          const hasValidData = assetType === 'otherAssets' 
            ? (pos.data.asset_name && pos.data.current_value) 
            : pos.data.account_id;
          const hasErrors = pos.errors && Object.values(pos.errors).some(e => e);
          return (!hasValidData || hasErrors) && !processedPositions.has(`${assetType}-${pos.id}`);
        });
      case 'selected':
        return typePositions.filter(pos => selectedPositions.has(`${assetType}-${pos.id}`));
      case 'processed':
        return typePositions.filter(pos => processedPositions.has(`${assetType}-${pos.id}`));
      default:
        return typePositions;
    }
  };

  // Enhanced submission with progressive processing
  const submitValidOnly = async () => {
    if (stats.validPositions === 0) {
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const successfulPositions = [];

    try {
      // Collect only valid positions
      const validBatches = [];
      Object.entries(positions).forEach(([type, typePositions]) => {
        typePositions.forEach(pos => {
          const posKey = `${type}-${pos.id}`;
          
          // Skip already processed positions
          if (processedPositions.has(posKey)) return;
          
          const hasValidData = type === 'otherAssets' 
            ? (pos.data.asset_name && pos.data.current_value) 
            : pos.data.account_id;
          const hasErrors = pos.errors && Object.values(pos.errors).some(e => e);
          
          if (hasValidData && !hasErrors) {
            validBatches.push({ type, position: pos });
          }
        });
      });

      // Process in batches with real-time updates
      for (let i = 0; i < validBatches.length; i++) {
        const { type, position } = validBatches[i];
        const posKey = `${type}-${position.id}`;
        
        try {
          // Mark as importing
          setImportingPositions(prev => new Set(prev).add(posKey));
          
          // Clean data
          const cleanData = {};
          Object.entries(position.data).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
              cleanData[key] = value;
            }
          });

          // Submit based on type
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
                storage_type: cleanData.storage_type || 'Exchange',
                notes: cleanData.notes || null,
                tags: cleanData.tags || [],
                is_favorite: cleanData.is_favorite || false
              };
              await addCryptoPosition(position.data.account_id, cryptoData);
              break;
            case 'metal':
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
          
          // Mark as processed and remove from importing
          setProcessedPositions(prev => new Set(prev).add(posKey));
          setImportingPositions(prev => {
            const updated = new Set(prev);
            updated.delete(posKey);
            return updated;
          });
          
          // Store result for success tracking
          setImportResults(prev => new Map(prev).set(posKey, { status: 'success', position }));
          
          // Collect for callback
          const account = type !== 'otherAssets' 
            ? accounts.find(a => a.id === position.data.account_id) 
            : null;
            
          successfulPositions.push({
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
          
        } catch (error) {
          console.error(`Error adding ${type} position:`, error);
          errorCount++;
          errors.push(`${assetTypes[type].name}: ${error.message || 'Unknown error'}`);
          
          // Remove from importing and mark as error
          setImportingPositions(prev => {
            const updated = new Set(prev);
            updated.delete(posKey);
            return updated;
          });
          
          setImportResults(prev => new Map(prev).set(posKey, { status: 'error', error: error.message, position }));
        }
      }

      // Call success callback
      if (successCount > 0 && onPositionsSaved) {
        onPositionsSaved(successCount, successfulPositions);
      }

    } catch (error) {
      console.error('Error submitting positions:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debounced search function (keeping existing logic)
  const debouncedSearch = useCallback(
    debounce(async (query, assetType, positionId) => {
      if (!query || query.length < 2) {
        setSearchResults(prev => ({
          ...prev,
          [`${assetType}-${positionId}`]: []
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

  // Auto-hydrate prices for seeded positions (keeping existing logic)
  const metalSymbolByType = {
    Gold: 'GC=F',
    Silver: 'SI=F',
    Platinum: 'PL=F',
    Copper: 'HG=F',
    Palladium: 'PA=F',
  };

  const getQuotePrice = (s) => {
    const v = s?.price ?? s?.current_price ?? s?.regularMarketPrice ?? s?.regular_market_price ?? s?.last ?? s?.close ?? s?.value ?? s?.mark;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const autoHydrateSeededPrices = useCallback(async () => {
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
          const exact = filtered.find((r) => String(r.ticker || '').toUpperCase() === String(item.q).toUpperCase());
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
  }, [positions, handleSelectSecurity]);;

  // Handle security selection (keeping existing logic)
  const handleSelectSecurity = useCallback((assetType, positionId, security) => {
    const searchKey = `${assetType}-${positionId}`;
    setSelectedSecurities((prev) => ({ ...prev, [searchKey]: security }));

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
  }, []); // Empty dependencies since it uses function updates

  // Add new row
  const addNewRow = (assetType) => {
    const defaultData = {};
    
    assetTypes[assetType].fields.forEach(field => {
      if (field.default !== undefined) {
        defaultData[field.key] = field.default;
      }
    });
    
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
  };

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

  // Delete position
  const deletePosition = (assetType, positionId) => {
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].filter(pos => pos.id !== positionId)
    }));
    
    // Remove from selections
    const posKey = `${assetType}-${positionId}`;
    setSelectedPositions(prev => {
      const updated = new Set(prev);
      updated.delete(posKey);
      return updated;
    });
  };

  // Enhanced UI components with comprehensive banners
  const renderSmartBanners = () => {
    const banners = [];
    
    // Error summary banner
    if (stats.totalErrors > 0) {
      banners.push(
        <SmartBanner
          key="errors"
          type="error"
          title="Validation Errors Found"
          message={`${stats.totalErrors} positions have validation errors that need to be fixed before import.`}
          count={stats.totalErrors}
          actions={[
            {
              label: 'Show Errors Only',
              icon: FilterX,
              primary: true,
              onClick: () => setFilterType('invalid')
            },
            {
              label: 'Auto-Fix Common Issues',
              icon: Zap,
              onClick: handleBulkValidate
            }
          ]}
          persistent={true}
        />
      );
    }
    
    // Processing banner
    if (stats.importingCount > 0) {
      banners.push(
        <SmartBanner
          key="processing"
          type="processing"
          title="Import in Progress"
          message={`${stats.importingCount} positions are currently being imported...`}
          count={stats.importingCount}
          persistent={true}
        />
      );
    }
    
    // Success banner for processed items
    if (stats.processedCount > 0) {
      banners.push(
        <SmartBanner
          key="success"
          type="success"
          title="Successfully Imported"
          message={`${stats.processedCount} positions have been successfully added to your portfolio.`}
          count={stats.processedCount}
          actions={[
            {
              label: 'Clear Imported',
              icon: PackageCheck,
              primary: true,
              onClick: () => {
                // Remove processed positions
                const updatedPositions = { ...positions };
                Object.keys(updatedPositions).forEach(type => {
                  updatedPositions[type] = updatedPositions[type].filter(pos => 
                    !processedPositions.has(`${type}-${pos.id}`)
                  );
                });
                setPositions(updatedPositions);
                setProcessedPositions(new Set());
                setImportResults(new Map());
              }
            },
            {
              label: 'View Processed',
              icon: Eye,
              onClick: () => setFilterType('processed')
            }
          ]}
        />
      );
    }
    
    // Ready to import banner
    if (stats.validPositions > 0 && stats.importingCount === 0) {
      banners.push(
        <SmartBanner
          key="ready"
          type="info"
          title="Ready to Import"
          message={`${stats.validPositions} positions are valid and ready to be imported to your portfolio.`}
          count={stats.validPositions}
          actions={[
            {
              label: 'Import Valid Only',
              icon: PlayCircle,
              primary: true,
              onClick: submitValidOnly,
              disabled: isSubmitting
            },
            {
              label: 'Preview Queue',
              icon: Eye,
              onClick: () => setShowQueue(true)
            }
          ]}
          persistent={true}
        />
      );
    }
    
    return banners;
  };

  // Enhanced filter bar
  const renderFilterBar = () => {
    const filters = [
      { key: 'all', label: 'All', count: stats.totalPositions, icon: Package2 },
      { key: 'valid', label: 'Valid', count: stats.validPositions, icon: PackageCheck },
      { key: 'invalid', label: 'Invalid', count: stats.invalidPositions, icon: PackageX },
      { key: 'selected', label: 'Selected', count: stats.selectedCount, icon: CheckSquare },
      { key: 'processed', label: 'Imported', count: stats.processedCount, icon: CheckCircle }
    ];
    
    return (
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Show:</span>
        {filters.map(filter => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterType === filter.key
                  ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3 h-3 mr-1.5" />
              {filter.label}
              <span className="ml-1.5 px-1.5 py-0.5 bg-white/70 rounded-full text-xs font-bold">
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Enhanced input rendering with selection checkbox
  const renderCellInput = (assetType, position, field, cellKey) => {
    const value = position.data[field.key] || '';
    const hasError = position.errors?.[field.key];
    const isProcessed = processedPositions.has(`${assetType}-${position.id}`);
    
    // Add selection checkbox for first field
    const isFirstField = assetTypes[assetType].fields[0].key === field.key;
    const posKey = `${assetType}-${position.id}`;
    const isSelected = selectedPositions.has(posKey);
    
    return (
      <div className="relative flex items-center">
        {isFirstField && !isProcessed && (
          <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelectPosition(assetType, position.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        )}
        
        {/* Status indicator for processed items */}
        {isProcessed && (
          <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
        )}
        
        {/* Importing indicator */}
        {importingPositions.has(posKey) && (
          <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          </div>
        )}
        
        {/* Standard input field (keeping existing logic) */}
        <div className="flex-1">
          {field.type === 'select' ? (
            field.key === 'account_id' ? (
              <select
                value={value}
                onChange={(e) => updatePosition(assetType, position.id, field.key, parseInt(e.target.value))}
                disabled={isProcessed}
                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all ${
                  isProcessed ? 'bg-gray-100 cursor-not-allowed opacity-60' :
                  hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <option value="">Select account...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={value}
                onChange={(e) => updatePosition(assetType, position.id, field.key, e.target.value)}
                disabled={isProcessed}
                className={`w-full px-3 py-2 text-sm border rounded-lg transition-all ${
                  isProcessed ? 'bg-gray-100 cursor-not-allowed opacity-60' :
                  hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {field.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )
          ) : (
            <input
              type={field.type}
              value={value}
              onChange={(e) => updatePosition(assetType, position.id, field.key, 
                field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value
              )}
              placeholder={field.placeholder}
                disabled={field.readOnly || isProcessed}
              className={`w-full px-3 py-2 text-sm border rounded-lg transition-all ${
                isProcessed ? 'bg-gray-100 cursor-not-allowed opacity-60' :
                hasError ? 'border-red-400 bg-red-50 focus:border-red-500' : 
                'border-gray-300 hover:border-gray-400 focus:border-blue-500'
              } ${field.prefix ? 'pl-8' : ''} ${field.suffix ? 'pr-8' : ''}`}
            />
          )}
          
          {/* Prefix/Suffix indicators */}
          {field.prefix && (
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
              {field.prefix}
            </span>
          )}
          {field.suffix && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
              {field.suffix}
            </span>
          )}
          
          {/* Error indicator */}
          {hasError && (
            <div className="absolute -bottom-5 left-0 text-xs text-red-600 font-medium">
              {position.errors[field.key]}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Enhanced asset section with filtering
  const renderAssetSection = (assetType) => {
    const config = assetTypes[assetType];
    const allTypePositions = positions[assetType] || [];
    const filteredPositions = getFilteredPositions(assetType);
    const isExpanded = expandedSections[assetType];
    const Icon = config.icon;
    const typeStats = stats.byType[assetType];
    const performance = stats.performance[assetType];

    // Don't render if no positions and we're filtering
    if (filteredPositions.length === 0 && filterType !== 'all') {
      return null;
    }

    return (
      <div 
        key={assetType} 
        className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${
          isExpanded ? 'border-gray-200 shadow-md' : 'border-gray-100'
        }`}
      >
        {/* Enhanced Section Header */}
        <div 
          onClick={() => setExpandedSections(prev => ({ ...prev, [assetType]: !isExpanded }))}
          className={`px-4 py-3 cursor-pointer transition-all duration-200 ${
            isExpanded 
              ? `bg-gradient-to-r ${config.color.gradient} text-white shadow-sm` 
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className={`p-2 rounded-lg transition-all duration-200 ${
                isExpanded ? 'bg-white/20' : config.color.lightBg
              }`}>
                <Icon className={`w-5 h-5 ${isExpanded ? 'text-white' : config.color.text}`} />
              </div>
              
              <div className="flex-1">
                <h3 className={`font-semibold text-base flex items-center ${
                  isExpanded ? 'text-white' : 'text-gray-800'
                }`}>
                  {config.name}
                  {allTypePositions.length > 0 && (
                    <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${
                      isExpanded ? 'bg-white/20 text-white' : `${config.color.bg} text-white`
                    }`}>
                      {allTypePositions.length}
                    </span>
                  )}
                  {filterType !== 'all' && filteredPositions.length !== allTypePositions.length && (
                    <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${
                      isExpanded ? 'bg-white/40 text-white' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {filteredPositions.length} filtered
                    </span>
                  )}
                </h3>
                <p className={`text-xs mt-0.5 ${isExpanded ? 'text-white/80' : 'text-gray-500'}`}>
                  {config.description}
                </p>
              </div>
              
              {/* Enhanced stats display */}
              {typeStats && (
                <div className={`flex items-center space-x-4 text-xs ${
                  isExpanded ? 'text-white/90' : 'text-gray-600'
                }`}>
                  <div className="text-center">
                    <div className="font-bold">
                      <AnimatedNumber value={typeStats.valid} />
                    </div>
                    <div>Valid</div>
                  </div>
                  {typeStats.invalid > 0 && (
                    <div className="text-center">
                      <div className="font-bold text-red-400">
                        <AnimatedNumber value={typeStats.invalid} />
                      </div>
                      <div>Errors</div>
                    </div>
                  )}
                  {typeStats.processed > 0 && (
                    <div className="text-center">
                      <div className="font-bold text-green-400">
                        <AnimatedNumber value={typeStats.processed} />
                      </div>
                      <div>Imported</div>
                    </div>
                  )}
                  {typeStats.value > 0 && showValues && (
                    <div className="text-center">
                      <div className="font-bold">
                        {formatCurrency(typeStats.value)}
                      </div>
                      {performance !== undefined && (
                        <div className={`flex items-center ${
                          performance >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {performance >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {Math.abs(performance).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
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
                className={`p-1.5 rounded-lg transition-all duration-200 ${
                  isExpanded 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : `${config.color.lightBg} hover:${config.color.hover} ${config.color.text}`
                }`}
                title={`Add ${config.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${
                isExpanded ? 'rotate-180 text-white' : 'text-gray-400'
              }`} />
            </div>
          </div>
        </div>

        {/* Enhanced Table Content */}
        {isExpanded && (
          <div className="bg-white animate-in slide-in-from-top-2 duration-300">
            {filteredPositions.length === 0 ? (
              <div className="p-8 text-center">
                <div className={`inline-flex p-4 rounded-full ${config.color.lightBg} mb-4`}>
                  <Icon className={`w-8 h-8 ${config.color.text}`} />
                </div>
                <p className="text-gray-600 mb-4">
                  {filterType === 'all' 
                    ? `No ${config.name.toLowerCase()} positions yet`
                    : `No ${filterType} ${config.name.toLowerCase()} positions`
                  }
                </p>
                {filterType === 'all' && (
                  <button
                    onClick={() => addNewRow(assetType)}
                    className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      config.color.bg
                    } text-white hover:shadow-md hover:scale-105`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First {config.name}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-8 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={filteredPositions.every(pos => 
                              selectedPositions.has(`${assetType}-${pos.id}`) || 
                              processedPositions.has(`${assetType}-${pos.id}`)
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSelection = new Set(selectedPositions);
                                filteredPositions.forEach(pos => {
                                  if (!processedPositions.has(`${assetType}-${pos.id}`)) {
                                    newSelection.add(`${assetType}-${pos.id}`);
                                  }
                                });
                                setSelectedPositions(newSelection);
                              } else {
                                const newSelection = new Set(selectedPositions);
                                filteredPositions.forEach(pos => {
                                  newSelection.delete(`${assetType}-${pos.id}`);
                                });
                                setSelectedPositions(newSelection);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="w-12 px-3 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600">#</span>
                        </th>
                        {config.fields.map(field => (
                          <th key={field.key} className={`${field.width} px-2 py-3 text-left`}>
                            <span className="text-xs font-semibold text-gray-600 flex items-center">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                              {field.readOnly && (
                                <Info className="w-3 h-3 ml-1 text-gray-400" title="Auto-filled" />
                              )}
                            </span>
                          </th>
                        ))}
                        <th className="w-24 px-2 py-3 text-center">
                          <span className="text-xs font-semibold text-gray-600">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPositions.map((position, index) => {
                        const hasErrors = Object.values(position.errors || {}).some(e => e);
                        const value = calculatePositionValue(assetType, position);
                        const posKey = `${assetType}-${position.id}`;
                        const isSelected = selectedPositions.has(posKey);
                        const isImporting = importingPositions.has(posKey);
                        const isProcessed = processedPositions.has(posKey);
                        
                        return (
                          <tr 
                            key={position.id}
                            className={`border-b border-gray-100 transition-all duration-300 group relative ${
                              position.isNew ? 'bg-blue-50/50' : 
                              isProcessed ? 'bg-green-50/30' :
                              isImporting ? 'bg-yellow-50/50' :
                              isSelected ? 'bg-blue-50/30' :
                              hasErrors ? 'bg-red-50/30' : 'hover:bg-gray-50/50'
                            } ${
                              position.animateIn ? 'animate-in slide-in-from-left duration-300' : ''
                            }`}
                          >
                            <td className="px-3 py-2">
                              {/* Status indicators handled in renderCellInput */}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-sm font-medium text-gray-500">
                                {index + 1}
                              </span>
                            </td>
                            {config.fields.map(field => (
                              <td key={field.key} className={`${field.width} px-1 py-2 relative`}>
                                {renderCellInput(
                                  assetType, 
                                  position, 
                                  field, 
                                  `${assetType}-${position.id}-${field.key}`
                                )}
                              </td>
                            ))}
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-center space-x-1">
                                {!isProcessed && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const newPosition = {
                                          ...position,
                                          id: Date.now() + Math.random(),
                                          isNew: true,
                                          animateIn: true
                                        };
                                        setPositions(prev => ({
                                          ...prev,
                                          [assetType]: [...prev[assetType], newPosition]
                                        }));
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                      title="Duplicate"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deletePosition(assetType, position.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {value > 0 && showValues && (
                                  <div className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                    {formatCurrency(value)}
                                  </div>
                                )}
                                {isProcessed && (
                                  <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    Imported
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
                
                {/* Enhanced Add Row Footer */}
                {filterType === 'all' && (
                  <div className="p-3 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => addNewRow(assetType)}
                      className={`w-full py-2 px-4 border-2 border-dashed rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                        config.color.border
                      } ${config.color.hover} hover:border-solid group`}
                    >
                      <Plus className={`w-4 h-4 ${config.color.text} group-hover:scale-110 transition-transform`} />
                      <span className={`text-sm font-medium ${config.color.text}`}>
                        Add {config.name} (Enter)
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to calculate position value
  const calculatePositionValue = (type, position) => {
  let value = 0, cost = 0;
  switch (type) {
    case 'security':
      value = (pos.data.shares || 0) * (pos.data.price || 0);
      cost = (pos.data.shares || 0) * (pos.data.cost_basis || pos.data.price || 0);
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

  // Main render
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Enhanced Quick Position Entry"
      size="max-w-[1800px]"
    >
      <div className="h-[95vh] flex flex-col bg-gray-50">
        {/* Enhanced Header with Comprehensive Stats */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          {/* Top Action Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">View:</span>
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode(false)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      !viewMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Asset Type</span>
                  </button>
                  <button
                    onClick={() => setViewMode(true)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      viewMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Account</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowValues(!showValues)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
                title={showValues ? 'Hide values' : 'Show values'}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => setShowQueue(true)}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center space-x-2"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Queue</span>
                {stats.totalPositions > 0 && (
                  <span className="px-2 py-0.5 bg-gray-900 text-white text-xs rounded-full font-bold">
                    {stats.totalPositions}
                  </span>
                )}
              </button>
              
              <button
                onClick={submitValidOnly}
                disabled={stats.validPositions === 0 || isSubmitting}
                className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-md transform hover:scale-105 ${
                  stats.validPositions === 0 || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>Import {stats.validPositions} Valid Position{stats.validPositions !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Stats Dashboard */}
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-blue-700">
                    <AnimatedNumber value={stats.totalPositions} />
                  </p>
                  <p className="text-xs font-medium text-blue-600">Total</p>
                </div>
                <Package2 className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-green-700">
                    <AnimatedNumber value={stats.validPositions} />
                  </p>
                  <p className="text-xs font-medium text-green-600">Valid</p>
                </div>
                <PackageCheck className="w-8 h-8 text-green-400" />
              </div>
            </div>
            
            {stats.invalidPositions > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-red-700">
                      <AnimatedNumber value={stats.invalidPositions} />
                    </p>
                    <p className="text-xs font-medium text-red-600">Invalid</p>
                  </div>
                  <PackageX className="w-8 h-8 text-red-400" />
                </div>
              </div>
            )}
            
            {stats.selectedCount > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-purple-700">
                      <AnimatedNumber value={stats.selectedCount} />
                    </p>
                    <p className="text-xs font-medium text-purple-600">Selected</p>
                  </div>
                  <CheckSquare className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            )}
            
            {stats.processedCount > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-emerald-700">
                      <AnimatedNumber value={stats.processedCount} />
                    </p>
                    <p className="text-xs font-medium text-emerald-600">Imported</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
            )}
            
            {stats.totalValue > 0 && showValues && (
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-3 border border-yellow-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black text-yellow-700">
                      {formatCurrency(stats.totalValue)}
                    </p>
                    <p className="text-xs font-medium text-yellow-600">Portfolio Value</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
            )}
          </div>

          {/* Progress Indicators */}
          {stats.totalPositions > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Import Progress</span>
                <span className="text-sm text-gray-600">
                  {stats.validPositions} of {stats.totalPositions} ready
                </span>
              </div>
              <ProgressBar 
                current={stats.validPositions} 
                total={stats.totalPositions}
                status={stats.invalidPositions > 0 ? 'warning' : 'success'}
                className="mb-2"
              />
              {stats.processedCount > 0 && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Successfully Imported</span>
                    <span className="text-xs text-green-600 font-medium">
                      {stats.processedCount} completed
                    </span>
                  </div>
                  <ProgressBar 
                    current={stats.processedCount} 
                    total={stats.totalPositions}
                    status="success"
                  />
                </>
              )}
            </div>
          )}

          {/* Filter Bar */}
          {stats.totalPositions > 0 && renderFilterBar()}
        </div>

        {/* Smart Banners */}
        <div className="px-6 py-2">
          {renderSmartBanners()}
        </div>

        {/* Bulk Operations Toolbar */}
        <BulkOperationsToolbar
          selectedCount={stats.selectedCount}
          totalPositions={stats.totalPositions - stats.processedCount}
          onBulkDelete={handleBulkDelete}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkValidate={handleBulkValidate}
        />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!viewMode ? (
            // Asset Type View (Enhanced)
            Object.keys(assetTypes).map(assetType => renderAssetSection(assetType))
          ) : (
            // Account View (keeping existing but simplified for space)
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Account view coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </FixedModal>
  );
};

AddQuickPositionModal.displayName = 'AddQuickPositionModal';

export { AddQuickPositionModal };
export default AddQuickPositionModal;