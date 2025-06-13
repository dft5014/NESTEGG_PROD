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
  Calendar, ToggleLeft, ToggleRight, Users, Repeat
} from 'lucide-react';

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

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved }) => {
  // Core state
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({
    security: [],
    cash: [],
    crypto: [],
    metal: [],
    realestate: []
  });
  const [expandedSections, setExpandedSections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [focusedCell, setFocusedCell] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '', details: [] });
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [validationMode, setValidationMode] = useState('realtime');
  const [recentlyUsedAccounts, setRecentlyUsedAccounts] = useState([]);
  const [viewMode, setViewMode] = useState(false); // false = by asset type, true = by account
  
  // Search state
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [selectedSecurities, setSelectedSecurities] = useState({});
  
  // Refs
  const cellRefs = useRef({});
  const tableRefs = useRef({});
  const messageTimeoutRef = useRef(null);

  // Enhanced asset type configuration with search support
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
        { key: 'shares', label: 'Shares', type: 'number', required: true, width: 'w-24', placeholder: '100', min: 0, step: 1 },
        { key: 'price', label: 'Current Price', type: 'number', required: true, width: 'w-28', placeholder: 'Auto', prefix: '$', min: 0, step: 0.01, readOnly: true, autoFill: true },
        { key: 'cost_basis', label: 'Cost Basis', type: 'number', width: 'w-28', placeholder: '140.00', prefix: '$', min: 0, step: 0.01 },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36', max: new Date().toISOString().split('T')[0] },
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
          key: 'currency', 
          label: 'Currency', 
          type: 'select', 
          required: true,
          width: 'w-24',
          options: [
            { value: 'USD', label: 'USD 🇺🇸', symbol: '$' },
            { value: 'EUR', label: 'EUR 🇪🇺', symbol: '€' },
            { value: 'GBP', label: 'GBP 🇬🇧', symbol: '£' },
            { value: 'JPY', label: 'JPY 🇯🇵', symbol: '¥' },
            { value: 'CAD', label: 'CAD 🇨🇦', symbol: 'C$' }
          ]
        },
        { key: 'amount', label: 'Amount', type: 'number', required: true, width: 'w-32', placeholder: '10000', prefix: '$', min: 0 },
        { 
          key: 'account_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-32',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Savings', label: '💰 Savings' },
            { value: 'Checking', label: '💳 Checking' },
            { value: 'Money Market', label: '📊 Money Market' },
            { value: 'CD', label: '🔒 CD' }
          ]
        },
        { key: 'interest_rate', label: 'APY %', type: 'number', width: 'w-24', placeholder: '2.5', suffix: '%', step: '0.01', min: 0, max: 100 },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
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
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-28', placeholder: '0.5', step: '0.00000001', min: 0 },
        { key: 'purchase_price', label: 'Buy Price', type: 'number', required: true, width: 'w-32', placeholder: '45000', prefix: '$', min: 0 },
        { key: 'current_price', label: 'Current Price', type: 'number', required: true, width: 'w-32', placeholder: 'Auto', prefix: '$', min: 0, readOnly: true, autoFill: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36', max: new Date().toISOString().split('T')[0] },
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
          width: 'w-28',
          searchable: true,
          options: [
            { value: '', label: 'Select...' },
            { value: 'Gold', label: '🥇 Gold', ticker: 'GLD' },
            { value: 'Silver', label: '🥈 Silver', ticker: 'SLV' },
            { value: 'Platinum', label: '💎 Platinum', ticker: 'PPLT' },
            { value: 'Palladium', label: '⚪ Palladium', ticker: 'PALL' }
          ]
        },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, width: 'w-24', placeholder: '10', min: 0 },
        { 
          key: 'unit', 
          label: 'Unit', 
          type: 'select', 
          width: 'w-20',
          options: [
            { value: 'oz', label: 'oz' },
            { value: 'g', label: 'g' },
            { value: 'kg', label: 'kg' }
          ]
        },
        { key: 'purchase_price', label: 'Price/Unit', type: 'number', required: true, width: 'w-28', placeholder: '1800', prefix: '$', min: 0 },
        { key: 'current_price_per_unit', label: 'Current/Unit', type: 'number', width: 'w-28', placeholder: 'Auto', prefix: '$', min: 0, readOnly: true, autoFill: true },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36', max: new Date().toISOString().split('T')[0] },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
      ]
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
      description: 'Properties, REITs, Land',
      emoji: '🏠',
      fields: [
        { key: 'property_name', label: 'Property Name', type: 'text', required: true, width: 'w-48', placeholder: 'Main Residence' },
        { 
          key: 'property_type', 
          label: 'Type', 
          type: 'select', 
          width: 'w-32',
          options: [
            { value: '', label: 'Select...' },
            { value: 'Residential', label: '🏠 Residential' },
            { value: 'Commercial', label: '🏢 Commercial' },
            { value: 'Land', label: '🌳 Land' },
            { value: 'Industrial', label: '🏭 Industrial' }
          ]
        },
        { key: 'address', label: 'Address', type: 'text', width: 'w-52', placeholder: '123 Main St, City, State' },
        { key: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, width: 'w-32', placeholder: '500000', prefix: '$', min: 0 },
        { key: 'estimated_value', label: 'Current Value', type: 'number', width: 'w-32', placeholder: '550000', prefix: '$', min: 0 },
        { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36', max: new Date().toISOString().split('T')[0] },
        { key: 'account_id', label: 'Account', type: 'select', required: true, width: 'w-44' }
      ]
    }
  };

  // Debounced search function
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
        setSearchResults(prev => ({
          ...prev,
          [searchKey]: results
        }));
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

  // Initialize and cleanup
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      setPositions({
        security: [],
        cash: [],
        crypto: [],
        metal: [],
        realestate: []
      });
      setExpandedSections({});
      setMessage({ type: '', text: '', details: [] });
      setActiveFilter('all');
      setSearchResults({});
      setSelectedSecurities({});
      
      setShowKeyboardShortcuts(true);
      setTimeout(() => setShowKeyboardShortcuts(false), 3000);
    }
    
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Load accounts
  const loadAccounts = async () => {
    try {
      const fetchedAccounts = await fetchAllAccounts();
      setAccounts(fetchedAccounts);
      
      const recentIds = fetchedAccounts.slice(0, 3).map(a => a.id);
      setRecentlyUsedAccounts(recentIds);
    } catch (error) {
      console.error('Error loading accounts:', error);
      showMessage('error', 'Failed to load accounts', [`Error: ${error.message}`]);
    }
  };

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

  // Add new row
  const addNewRow = (assetType) => {
    const lastPosition = positions[assetType][positions[assetType].length - 1];
    const defaultData = {};
    
    if (lastPosition && lastPosition.data.account_id) {
      defaultData.account_id = lastPosition.data.account_id;
    }
    if (assetType === 'cash' && lastPosition?.data.currency) {
      defaultData.currency = lastPosition.data.currency;
    }
    if (assetType === 'metal' && lastPosition?.data.unit) {
      defaultData.unit = lastPosition.data.unit;
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
    
    setSelectedSecurities(prev => ({
      ...prev,
      [searchKey]: security
    }));
    
    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos => {
        if (pos.id === positionId) {
          const newData = { ...pos.data };
          
          // Update fields based on asset type
          if (assetType === 'security') {
            newData.ticker = security.ticker;
            newData.price = parseFloat(security.price || 0).toFixed(2);
            newData.name = security.name;
            if (!newData.cost_basis) {
              newData.cost_basis = newData.price;
            }
          } else if (assetType === 'crypto') {
            newData.symbol = security.ticker;
            newData.current_price = parseFloat(security.price || 0).toFixed(2);
            newData.name = security.name;
          } else if (assetType === 'metal') {
            // For metals, update the current price based on the ETF price
            newData.current_price_per_unit = parseFloat(security.price || 0).toFixed(2);
          }
          
          return {
            ...pos,
            data: newData,
            errors: { ...pos.errors }
          };
        }
        return pos;
      })
    }));
    
    // Clear search results
    setSearchResults(prev => ({
      ...prev,
      [searchKey]: []
    }));
  };

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
          
          // Trigger search for searchable fields
          if (fieldConfig?.searchable && assetTypes[assetType].searchable) {
            if (assetType === 'metal' && field === 'metal_type' && value) {
              // For metals, search using the ETF ticker
              const option = fieldConfig.options.find(o => o.value === value);
              if (option?.ticker) {
                debouncedSearch(option.ticker, assetType, positionId);
              }
            } else {
              debouncedSearch(value, assetType, positionId);
            }
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

  // Delete position
  const deletePosition = (assetType, positionId) => {
    const positionCount = positions[assetType].filter(p => p.data.account_id).length;
    
    if (positionCount > 5 && !window.confirm('Delete this position?')) {
      return;
    }
    
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
    }, 300);
  };

  // Duplicate position
  const duplicatePosition = (assetType, position) => {
    const newData = { ...position.data };
    
    if (assetType === 'security' && newData.shares) {
      newData.shares = '';
    }
    if (assetType === 'realestate' && newData.property_name) {
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
        if (pos.data.account_id) {
          totalPositions++;
          byType[type].count++;
          
          const accountId = pos.data.account_id;
          if (!byAccount[accountId]) {
            byAccount[accountId] = { count: 0, value: 0, positions: [] };
          }
          byAccount[accountId].count++;
          byAccount[accountId].positions.push({ ...pos, assetType: type });
          
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
            case 'realestate':
              value = pos.data.estimated_value || pos.data.purchase_price || 0;
              cost = pos.data.purchase_price || 0;
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
          byAccount[accountId].value += value;
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
        
        typeConfig.fields.forEach(field => {
          if (pos.data[field.key]) {
            hasData = true;
          }
        });
        
        if (hasData) {
          typeConfig.fields.forEach(field => {
            const value = pos.data[field.key];
            
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
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      const batches = [];
      Object.entries(positions).forEach(([type, typePositions]) => {
        typePositions.forEach(pos => {
          if (pos.data.account_id && Object.keys(pos.data).length > 1) {
            batches.push({ type, position: pos });
          }
        });
      });

      showMessage('info', `Submitting ${batches.length} positions...`, [], 0);

      for (let i = 0; i < batches.length; i++) {
        const { type, position } = batches[i];
        
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
              await addCryptoPosition(position.data.account_id, cleanData);
              break;
            case 'metal':
              await addMetalPosition(position.data.account_id, cleanData);
              break;
            case 'realestate':
              await addRealEstatePosition(position.data.account_id, cleanData);
              break;
            case 'cash':
              await addCashPosition(position.data.account_id, cleanData);
              break;
          }
          
          successCount++;
          
          const progress = Math.round(((i + 1) / batches.length) * 100);
          showMessage('info', `Submitting positions... ${progress}%`, [`${successCount} of ${batches.length} completed`], 0);
          
        } catch (error) {
          console.error(`Error adding ${type} position:`, error);
          errorCount++;
          errors.push(`${assetTypes[type].name}: ${error.message || 'Unknown error'}`);
        }
      }

      if (errorCount === 0) {
        showMessage('success', `All ${successCount} positions added successfully!`, [
          `Total value: ${formatCurrency(stats.totalValue)}`,
          'Refreshing portfolio data...'
        ]);
        
        if (onPositionsSaved) {
          onPositionsSaved(successCount);
        }
        
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        showMessage('warning', `Partially successful: ${successCount} added, ${errorCount} failed`, errors);
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
    
    setPositions({
      security: [],
      cash: [],
      crypto: [],
      metal: [],
      realestate: []
    });
    setExpandedSections({});
    showMessage('success', 'All positions cleared', ['Ready for new entries']);
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
      return (
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
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResultsForField.map((result) => (
              <button
                key={result.ticker}
                type="button"
                className="w-full p-2 hover:bg-gray-100 text-left border-b border-gray-100 last:border-0"
                onClick={() => handleSelectSecurity(assetType, position.id, result)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-blue-800">{result.ticker}</span>
                    <span className="ml-2 text-sm text-gray-600">{result.name}</span>
                  </div>
                  <span className="text-sm font-medium">${parseFloat(result.price).toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
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
    const typePositions = positions[assetType] || [];
    const validPositions = typePositions.filter(p => p.data.account_id);
    const isExpanded = expandedSections[assetType];
    const Icon = config.icon;
    const typeStats = stats.byType[assetType];
    const performance = stats.performance[assetType];

    return (
      <div 
        key={assetType} 
        className={`
          bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300
          ${isExpanded ? 'border-gray-200 shadow-md' : 'border-gray-100'}
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
                <div className="overflow-x-auto" ref={el => tableRefs.current[assetType] = el}>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-12 px-3 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600">#</span>
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
                              border-b border-gray-100 transition-all duration-300 group
                              ${position.isNew ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}
                              ${position.animateIn ? 'animate-in slide-in-from-left duration-300' : ''}
                              ${position.animateOut ? 'animate-out slide-out-to-right duration-300' : ''}
                              ${hasErrors ? 'bg-red-50/30' : ''}
                            `}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">
                                  {index + 1}
                                </span>
                                {position.isNew && (
                                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                )}
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
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => duplicatePosition(assetType, position)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                  title="Duplicate (Ctrl+D)"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deletePosition(assetType, position.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                  title="Delete (Ctrl+Del)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {value > 0 && showValues && (
                                  <div className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                    {formatCurrency(value)}
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
   return (
     <div className="space-y-4">
       {accounts.map(account => {
         const accountStats = stats.byAccount[account.id];
         if (!accountStats || accountStats.count === 0) {
           return (
             <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h3 className="font-semibold text-gray-800 mb-2">{account.account_name}</h3>
               <p className="text-gray-500 text-sm mb-4">No positions in this account yet</p>
               <div className="flex flex-wrap gap-2">
                 {Object.entries(assetTypes).map(([type, config]) => {
                   const Icon = config.icon;
                   return (
                     <button
                       key={type}
                       onClick={() => {
                         const newPosition = {
                           id: Date.now() + Math.random(),
                           type,
                           data: { account_id: account.id },
                           errors: {},
                           isNew: true,
                           animateIn: true
                         };
                         setPositions(prev => ({
                           ...prev,
                           [type]: [...prev[type], newPosition]
                         }));
                       }}
                       className={`
                         inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium
                         transition-all duration-200 ${config.color.lightBg} ${config.color.text}
                         hover:${config.color.bg} hover:text-white hover:shadow-md
                       `}
                     >
                       <Icon className="w-4 h-4 mr-2" />
                       Add {config.name}
                     </button>
                   );
                 })}
               </div>
             </div>
           );
         }

         return (
           <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             {/* Account Header */}
             <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
               <div className="flex items-center justify-between">
                 <div>
                   <h3 className="font-semibold text-gray-800">{account.account_name}</h3>
                   <p className="text-sm text-gray-600 mt-1">
                     {accountStats.count} position{accountStats.count !== 1 ? 's' : ''} • 
                     {showValues ? ` ${formatCurrency(accountStats.value)}` : ' ••••'}
                   </p>
                 </div>
                 <div className="flex items-center space-x-2">
                   {Object.entries(assetTypes).map(([type, config]) => {
                     const Icon = config.icon;
                     const typeCount = accountStats.positions.filter(p => p.assetType === type).length;
                     return typeCount > 0 ? (
                       <div key={type} className={`
                         flex items-center space-x-1 px-2 py-1 rounded-lg text-xs
                         ${config.color.lightBg} ${config.color.text}
                       `}>
                         <Icon className="w-3 h-3" />
                         <span className="font-medium">{typeCount}</span>
                       </div>
                     ) : null;
                   })}
                 </div>
               </div>
             </div>

             {/* Positions by Type */}
             <div className="p-4 space-y-4">
               {Object.entries(assetTypes).map(([type, config]) => {
                 const typePositions = positions[type].filter(p => p.data.account_id === account.id);
                 if (typePositions.length === 0) return null;

                 const Icon = config.icon;
                 return (
                   <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
                     <div className={`px-3 py-2 ${config.color.lightBg} border-b ${config.color.border}`}>
                       <h4 className={`font-medium text-sm ${config.color.text} flex items-center`}>
                         <Icon className="w-4 h-4 mr-2" />
                         {config.name}
                       </h4>
                     </div>
                     <div className="overflow-x-auto">
                       <table className="w-full text-sm">
                         <thead>
                           <tr className="bg-gray-50 border-b border-gray-200">
                             {config.fields.filter(f => f.key !== 'account_id').map(field => (
                               <th key={field.key} className="px-2 py-2 text-left text-xs font-medium text-gray-600">
                                 {field.label}
                                 {field.required && <span className="text-red-500 ml-0.5">*</span>}
                               </th>
                             ))}
                             <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Actions</th>
                           </tr>
                         </thead>
                         <tbody>
                           {typePositions.map((position, index) => (
                             <tr key={position.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                     </div>
                     <div className="p-2 bg-gray-50 border-t border-gray-100">
                       <button
                         onClick={() => {
                           const newPosition = {
                             id: Date.now() + Math.random(),
                             type,
                             data: { account_id: account.id },
                             errors: {},
                             isNew: true,
                             animateIn: true
                           };
                           setPositions(prev => ({
                             ...prev,
                             [type]: [...prev[type], newPosition]
                           }));
                         }}
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
                 );
               })}
             </div>
           </div>
         );
       })}
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
     case 'realestate':
       return position.data.estimated_value || position.data.purchase_price || 0;
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
     <div className="h-[90vh] flex flex-col bg-gray-50">
       {/* Enhanced Header with Action Bar */}
       <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
         {/* Top Action Bar */}
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center space-x-4">
             <button
               onClick={clearAll}
               className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center space-x-2 group"
             >
               <Trash2 className="w-4 h-4 group-hover:text-red-600 transition-colors" />
               <span>Clear All</span>
             </button>
             
             <button
               onClick={onClose}
               className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
             >
               Cancel
             </button>

             {/* View mode toggle */}
             <div className="ml-4">
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
           
           <div className="flex items-center space-x-3">
             {/* Settings buttons */}
             <button
               onClick={() => setShowValues(!showValues)}
               className={`p-2 rounded-lg transition-all duration-200 ${
                 showValues 
                   ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
               }`}
               title={showValues ? 'Hide values' : 'Show values'}
             >
               {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
             </button>
             
             <button
               onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
               className={`p-2 rounded-lg transition-all duration-200 ${
                 showKeyboardShortcuts 
                   ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                   : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
               }`}
               title="Keyboard shortcuts (Ctrl+K)"
             >
               <Keyboard className="w-4 h-4" />
             </button>
             
             <div className="h-6 w-px bg-gray-300"></div>
             
             {/* Submit button */}
             <button
               onClick={submitAll}
               disabled={stats.totalPositions === 0 || isSubmitting}
               className={`
                 px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-200 
                 flex items-center space-x-2 shadow-sm hover:shadow-md transform hover:scale-105
                 ${stats.totalPositions === 0 || isSubmitting
                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                 }
               `}
             >
               {isSubmitting ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span>Saving...</span>
                 </>
               ) : (
                 <>
                   <CheckCircle className="w-4 h-4" />
                   <span>Add {stats.totalPositions} Position{stats.totalPositions !== 1 ? 's' : ''}</span>
                 </>
               )}
             </button>
           </div>
         </div>

         {/* Stats Bar */}
         <div className="flex items-center justify-between">
           <div className="flex items-center space-x-6">
             {/* Total stats */}
             <div className="flex items-center space-x-4">
               <div className="flex items-center space-x-2">
                 <Hash className="w-4 h-4 text-gray-400" />
                 <span className="text-sm text-gray-600">Total Positions:</span>
                 <span className="text-lg font-bold text-gray-900">
                   <AnimatedNumber value={stats.totalPositions} />
                 </span>
               </div>
               
               <div className="h-5 w-px bg-gray-300"></div>
               
               <div className="flex items-center space-x-2">
                 <DollarSign className="w-4 h-4 text-gray-400" />
                 <span className="text-sm text-gray-600">Total Value:</span>
                 <span className="text-lg font-bold text-gray-900">
                   {showValues ? (
                     <AnimatedNumber value={stats.totalValue} prefix="$" decimals={0} />
                   ) : (
                     '••••••'
                   )}
                 </span>
               </div>
               
               {stats.totalPerformance !== 0 && (
                 <>
                   <div className="h-5 w-px bg-gray-300"></div>
                   <div className="flex items-center space-x-2">
                     {stats.totalPerformance >= 0 ? (
                       <TrendingUp className="w-4 h-4 text-green-600" />
                     ) : (
                       <TrendingDown className="w-4 h-4 text-red-600" />
                     )}
                     <span className="text-sm text-gray-600">Performance:</span>
                     <span className={`text-lg font-bold ${
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

             {/* Type breakdown */}
             <div className="flex items-center space-x-2">
               <div className="h-5 w-px bg-gray-300"></div>
               {Object.entries(assetTypes).map(([key, config]) => {
                 const typeStats = stats.byType[key];
                 if (!typeStats || typeStats.count === 0) return null;
                 
                 const Icon = config.icon;
                 return (
                   <div 
                     key={key}
                     className={`
                       flex items-center space-x-1 px-2 py-1 rounded-lg text-xs
                       ${config.color.lightBg} ${config.color.text}
                     `}
                   >
                     <Icon className="w-3 h-3" />
                     <span className="font-medium">{typeStats.count}</span>
                     {showValues && (
                       <span className="text-[10px] opacity-75">
                         ({formatCurrency(typeStats.value)})
                       </span>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>

           {/* Progress indicator */}
           {stats.totalPositions > 0 && (
             <div className="flex items-center space-x-3">
               <span className="text-xs text-gray-500">Progress</span>
               <ProgressIndicator 
                 current={stats.totalPositions - stats.errors.length} 
                 total={stats.totalPositions}
                 className="w-24"
               />
               <span className="text-xs font-medium text-gray-700">
                 {Math.round(((stats.totalPositions - stats.errors.length) / stats.totalPositions) * 100)}%
               </span>
             </div>
           )}
         </div>

         {/* Asset Type Filters (only show in asset type view) */}
         {!viewMode && (
           <div className="flex items-center space-x-2 mt-4">
             <span className="text-xs text-gray-500 mr-2">Filter:</span>
             <button
               onClick={() => setActiveFilter('all')}
               className={`
                 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
                 ${activeFilter === 'all' 
                   ? 'bg-gray-900 text-white shadow-sm' 
                   : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                 }
               `}
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
       <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
           animate-in slide-in-from-bottom duration-300 z-50
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