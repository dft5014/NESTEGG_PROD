import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FixedModal from './FixedModal';
import { fetchWithAuth } from '@/utils/api';
import { updateAccount } from '@/utils/apimethods/accountMethods';
import { updatePosition, deletePosition } from '@/utils/apimethods/positionMethods';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import debounce from 'lodash.debounce';

// DataStore hooks
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import {
  CheckCircle, AlertCircle, Info, Clock, X, Check, ChevronRight,
  TrendingUp, TrendingDown, RefreshCw, Loader2, Search, Filter,
  Building, Shield, Zap, Activity, Eye, EyeOff, Edit3, Trash2,
  ArrowRight, ArrowLeft, Sparkles, Target, Award, Calendar,
  DollarSign, Hash, Calculator, ChevronDown, ChevronUp,
  FileText, Download, Upload, BarChart3, PieChart, Save,
  AlertTriangle, CheckSquare, Square, MinusSquare, Plus,
  Minus, Equal, ArrowUpRight, ArrowDownRight, Briefcase,
  Home, Gem, Coins, CreditCard, GitBranch, Layers, Database,
  Star, StarHalf, Bell, BellOff, Repeat, RotateCcw, Send,
  Droplets, PlayCircle, Timer, Trophy, Flame, PartyPopper,
  ChevronsRight, Wallet, PiggyBank, Landmark, Receipt,
  TabletSmartphone, Mic, Keyboard, MousePointer, Gauge,
  Banknote, TrendingUp as TrendUp, CircleDollarSign,
  Percent, FileCheck, CheckCheck, ArrowUpDown, Maximize2,
  LineChart, BarChart, Package, Inbox, Users, Settings,
  HelpCircle, MessageSquare, Heart, Share2, Copy, ExternalLink
} from 'lucide-react';

// Asset type colors and configs
const ASSET_CONFIGS = {
  security: { icon: BarChart3, color: 'blue', label: 'Securities' },
  crypto: { icon: Coins, color: 'orange', label: 'Crypto' },
  metal: { icon: Gem, color: 'yellow', label: 'Metals' },
  realestate: { icon: Home, color: 'green', label: 'Real Estate' },
  cash: { icon: DollarSign, color: 'purple', label: 'Cash' }
};

// Account category configs
const CATEGORY_CONFIGS = {
  brokerage: { icon: Briefcase, color: 'blue', label: 'Brokerage' },
  retirement: { icon: Building, color: 'indigo', label: 'Retirement' },
  cash: { icon: DollarSign, color: 'green', label: 'Cash/Banking' },
  cryptocurrency: { icon: Hash, color: 'orange', label: 'Cryptocurrency' },
  metals: { icon: Shield, color: 'yellow', label: 'Metals Storage' },
  real_estate: { icon: Home, color: 'emerald', label: 'Real Estate' }
};

// Liquid position types
const LIQUID_POSITION_TYPES = ['cash', 'checking', 'savings', 'credit_card', 'loan', 'liability'];

// Enhanced animated progress ring with gradient
const ProgressRing = ({ percentage, size = 60, strokeWidth = 4, color = 'blue', showAnimation = true }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  
  useEffect(() => {
    if (showAnimation) {
      const timer = setTimeout(() => setAnimatedOffset(offset), 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedOffset(offset);
    }
  }, [offset, showAnimation]);
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className={`text-${color}-400`} stopColor="currentColor" />
          <stop offset="100%" className={`text-${color}-600`} stopColor="currentColor" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-gray-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#gradient-${color})`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={animatedOffset}
        className="transition-all duration-1000 ease-out"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Enhanced status indicator with animation
const StatusIndicator = ({ status, showPulse = true, size = 'medium' }) => {
  const configs = {
    reconciled: { color: 'green', icon: CheckCircle, label: 'Reconciled' },
    warning: { color: 'yellow', icon: AlertTriangle, label: 'Needs Review' },
    error: { color: 'red', icon: AlertCircle, label: 'Out of Sync' },
    pending: { color: 'gray', icon: Clock, label: 'Not Reconciled' }
  };
  
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  const sizeClass = size === 'small' ? 'w-4 h-4' : size === 'large' ? 'w-6 h-6' : 'w-5 h-5';
  
  return (
    <div className="relative inline-flex items-center group">
      {showPulse && status !== 'reconciled' && (
        <span className={`absolute inset-0 rounded-full bg-${config.color}-400 animate-ping opacity-75`} />
      )}
      <Icon className={`relative ${sizeClass} text-${config.color}-600 transition-transform group-hover:scale-110`} />
      <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
        {config.label}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
};

// Enhanced animated value with color transitions
const AnimatedValue = ({ value, format = 'currency', className = '', duration = 800, showChange = false, previousValue = null }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [trend, setTrend] = useState(null);
  
  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value || 0;
    
    if (previousValue !== null) {
      setTrend(endValue > previousValue ? 'up' : endValue < previousValue ? 'down' : 'same');
    }
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  const formatted = format === 'currency' 
    ? formatCurrency(displayValue)
    : format === 'percentage'
      ? `${displayValue.toFixed(1)}%`
      : format === 'number'
        ? displayValue.toFixed(0).toLocaleString()
        : displayValue.toLocaleString();
  
  return (
    <span className={`
      ${className} 
      ${isAnimating ? 'text-blue-600' : ''} 
      ${showChange && trend === 'up' ? 'text-green-600' : ''}
      ${showChange && trend === 'down' ? 'text-red-600' : ''}
      transition-colors duration-300 inline-flex items-center
    `}>
      {formatted}
      {showChange && trend && (
        <span className="ml-1">
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
           trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
        </span>
      )}
    </span>
  );
};

// Enhanced liquid position card with better UX
const LiquidPositionCard = ({ 
  position, 
  institution, 
  value, 
  onChange, 
  onComplete,
  isActive,
  suggestion,
  lastUpdated,
  isUpdated,
  difference
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isActive]);
  
  useEffect(() => {
    if (isUpdated && hasChanged) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  }, [isUpdated, hasChanged]);
  
  const handleChange = (e) => {
    const newValue = e.target.value.replace(/[^0-9.-]/g, '');
    setLocalValue(newValue);
    setHasChanged(true);
    onChange(position.id, newValue);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onComplete();
    }
  };
  
  const getPositionIcon = () => {
    switch (position.position_type || position.type) {
      case 'checking': return Wallet;
      case 'savings': return PiggyBank;
      case 'credit_card': return CreditCard;
      case 'loan': return Receipt;
      default: return DollarSign;
    }
  };
  
  const Icon = getPositionIcon();
  const isLiability = position.position_type === 'credit_card' || position.position_type === 'loan' || position.type === 'liability';
  
  // Calculate days since last update
  const daysSinceUpdate = lastUpdated 
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div className={`
      relative rounded-xl border-2 transition-all duration-300 transform
      ${isActive ? 'border-blue-500 shadow-2xl scale-[1.02] bg-blue-50' : 'border-gray-200 bg-white hover:shadow-lg hover:scale-[1.01]'}
      ${hasChanged && !isActive ? 'bg-amber-50 border-amber-300' : ''}
      ${showSuccess ? 'bg-green-50 border-green-400' : ''}
    `}>
      {/* Success overlay */}
      {showSuccess && (
        <div className="absolute inset-0 bg-green-500/10 rounded-xl flex items-center justify-center z-10 animate-in fade-in duration-300">
          <div className="bg-white rounded-full p-3 shadow-lg">
            <Check className="w-8 h-8 text-green-600 animate-in zoom-in duration-300" />
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`
              p-3 rounded-xl transition-all duration-300 transform
              ${isLiability ? 'bg-red-100' : 'bg-green-100'}
              ${isActive ? 'scale-110 rotate-3' : ''}
            `}>
              <Icon className={`w-6 h-6 ${isLiability ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-lg">{position.name || position.position_name}</h4>
              <p className="text-sm text-gray-500">{institution}</p>
              {daysSinceUpdate !== null && (
                <div className="flex items-center mt-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>
                    Last updated: {daysSinceUpdate === 0 ? 'Today' : 
                                  daysSinceUpdate === 1 ? 'Yesterday' : 
                                  `${daysSinceUpdate} days ago`}
                  </span>
                </div>
              )}
            </div>
          </div>
          {hasChanged && (
            <div className="flex items-center space-x-2">
              {difference !== 0 && (
                <span className={`
                  text-sm font-medium px-2 py-1 rounded-full
                  ${difference > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                `}>
                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </span>
              )}
              <Check className="w-5 h-5 text-green-500 animate-in zoom-in duration-300" />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Current NestEgg Balance
            </label>
            <div className="text-xl font-bold text-gray-900">
              {isLiability ? '-' : ''}{formatCurrency(Math.abs(position.current_value || 0))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Balance to Update
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {isLiability ? '-$' : '$'}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={Math.abs(position.current_value || 0).toFixed(2)}
                className={`
                  w-full pl-8 pr-4 py-3 text-xl font-bold rounded-lg
                  transition-all duration-200 outline-none
                  ${isFocused 
                    ? 'border-2 border-blue-500 ring-4 ring-blue-100' 
                    : 'border-2 border-gray-300 hover:border-gray-400'
                  }
                  ${hasChanged && localValue !== String(position.current_value) 
                    ? 'bg-amber-50' 
                    : 'bg-white'
                  }
                `}
              />
            </div>
          </div>
        </div>
        
        {difference !== 0 && hasChanged && (
          <div className={`
            p-3 rounded-lg flex items-center justify-between
            ${difference > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
          `}>
            <span className="text-sm font-medium text-gray-700">Difference:</span>
            <span className={`font-bold ${difference > 0 ? 'text-green-700' : 'text-red-700'}`}>
              {difference > 0 ? '+' : ''}{formatCurrency(difference)}
            </span>
          </div>
        )}
        
        {suggestion && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 mt-3 p-2 bg-blue-50 rounded-lg">
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            <span>{suggestion}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced institution selector with visual feedback
const InstitutionSelector = ({ institutions, selectedInstitution, onSelect, completedInstitutions }) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {institutions.map(({ institution, positions, totalValue }) => {
        const isSelected = selectedInstitution === institution;
        const isCompleted = completedInstitutions.includes(institution);
        const updatedCount = positions.filter(p => p.hasUpdate).length;
        
        return (
          <button
            key={institution}
            onClick={() => onSelect(institution)}
            className={`
              relative group px-6 py-4 rounded-xl border-2 transition-all duration-300 transform
              ${isSelected 
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]' 
                : isCompleted
                  ? 'border-green-400 bg-green-50 hover:scale-[1.01]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-[1.01]'
              }
            `}
          >
            {isCompleted && (
              <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <Landmark className={`
                w-5 h-5 transition-colors
                ${isSelected ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
              `} />
              <div className="text-left">
                <h4 className={`
                  font-semibold transition-colors
                  ${isSelected ? 'text-blue-900' : 'text-gray-900'}
                `}>
                  {institution}
                </h4>
                <div className="flex items-center space-x-3 text-sm mt-1">
                  <span className="text-gray-500">{positions.length} positions</span>
                  {updatedCount > 0 && (
                    <span className="text-amber-600 font-medium">
                      {updatedCount} updated
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-sm text-gray-500">Total Value</div>
              <div className="font-semibold text-gray-900">{formatCurrency(totalValue)}</div>
            </div>
            
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
              <div 
                className={`
                  h-full transition-all duration-500
                  ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}
                `}
                style={{ width: `${(updatedCount / positions.length) * 100}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Update summary dashboard
const UpdateSummaryDashboard = ({ pendingUpdates, originalValues }) => {
  const stats = useMemo(() => {
    const updates = Object.entries(pendingUpdates);
    const totalChanges = updates.length;
    let totalIncrease = 0;
    let totalDecrease = 0;
    let netChange = 0;
    
    updates.forEach(([posId, newValue]) => {
      const original = originalValues[posId] || 0;
      const diff = parseFloat(newValue) - original;
      netChange += diff;
      if (diff > 0) totalIncrease += diff;
      else totalDecrease += Math.abs(diff);
    });
    
    return { totalChanges, totalIncrease, totalDecrease, netChange };
  }, [pendingUpdates, originalValues]);
  
  if (stats.totalChanges === 0) return null;
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileCheck className="w-5 h-5 mr-2 text-blue-600" />
          Pending Updates Summary
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-blue-600">{stats.totalChanges}</span>
          <span className="text-sm text-gray-600">changes</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 text-center">
          <ArrowUpRight className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Total Increase</div>
          <div className="text-xl font-bold text-green-600">
            +{formatCurrency(stats.totalIncrease)}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 text-center">
          <ArrowDownRight className="w-6 h-6 text-red-600 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Total Decrease</div>
          <div className="text-xl font-bold text-red-600">
            -{formatCurrency(stats.totalDecrease)}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 text-center">
          <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Net Change</div>
          <div className={`text-xl font-bold ${stats.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.netChange >= 0 ? '+' : ''}{formatCurrency(stats.netChange)}
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-amber-100 rounded-lg flex items-start space-x-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          These changes will be applied when you complete the reconciliation process.
        </p>
      </div>
    </div>
  );
};

// Enhanced reconciliation summary dashboard
const ReconciliationSummaryDashboard = ({ 
  stats, 
  reconciliationResults,
  onClose,
  onStartNewReconciliation
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      {showConfetti && <Confetti show={true} />}
      
      <div className="max-w-6xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8 animate-in slide-in-from-top duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-2xl">
            <Trophy className="w-12 h-12 text-white animate-bounce" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Reconciliation Complete! 🎉
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Great job! Your accounts are now up-to-date and reconciled.
          </p>
        </div>
        
        {/* Summary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-in slide-in-from-bottom duration-500 delay-100">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <span className="text-3xl font-bold text-gray-900">{stats.accountsReconciled}</span>
            </div>
            <h3 className="font-semibold text-gray-700">Accounts Reconciled</h3>
            <p className="text-sm text-gray-500 mt-1">Successfully updated</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-in slide-in-from-bottom duration-500 delay-200">
            <div className="flex items-center justify-between mb-4">
              <Droplets className="w-8 h-8 text-blue-500" />
              <span className="text-3xl font-bold text-gray-900">{stats.liquidPositionsUpdated}</span>
            </div>
            <h3 className="font-semibold text-gray-700">Liquid Positions</h3>
            <p className="text-sm text-gray-500 mt-1">Updated balances</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-in slide-in-from-bottom duration-500 delay-300">
            <div className="flex items-center justify-between mb-4">
              <CircleDollarSign className="w-8 h-8 text-indigo-500" />
              <AnimatedValue 
                value={stats.totalValueReconciled} 
                format="currency" 
                className="text-2xl font-bold text-gray-900"
              />
            </div>
            <h3 className="font-semibold text-gray-700">Total Value</h3>
            <p className="text-sm text-gray-500 mt-1">Portfolio reconciled</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-in slide-in-from-bottom duration-500 delay-400">
            <div className="flex items-center justify-between mb-4">
              <Percent className="w-8 h-8 text-purple-500" />
              <div className="relative">
                <ProgressRing percentage={stats.accuracy} size={60} color="purple" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold">{stats.accuracy}%</span>
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-gray-700">Accuracy Score</h3>
            <p className="text-sm text-gray-500 mt-1">Reconciliation health</p>
          </div>
        </div>
        
        {/* Detailed Results */}
        {reconciliationResults && reconciliationResults.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8 animate-in slide-in-from-bottom duration-500 delay-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-gray-600" />
              Reconciliation Details
            </h2>
            
            <div className="space-y-3">
              {reconciliationResults.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCheck className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">{result.accountName}</p>
                      <p className="text-sm text-gray-500">{result.institution}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(result.finalBalance)}</p>
                    {result.change !== 0 && (
                      <p className={`text-sm ${result.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {result.change > 0 ? '+' : ''}{formatCurrency(result.change)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Next Steps */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl animate-in slide-in-from-bottom duration-500 delay-600">
          <h2 className="text-2xl font-bold mb-4">What's Next?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Schedule Regular Updates</h3>
                <p className="text-sm text-blue-100">We recommend reconciling weekly for best results</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <LineChart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Track Your Progress</h3>
                <p className="text-sm text-blue-100">Monitor your portfolio performance over time</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Set Up Alerts</h3>
                <p className="text-sm text-blue-100">Get notified when accounts need attention</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              Back to Dashboard
            </button>
            <button
              onClick={onStartNewReconciliation}
              className="px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-all transform hover:scale-105"
            >
              Start New Reconciliation
            </button>
          </div>
        </div>
        
        {/* Share Achievement */}
        <div className="text-center mt-8 animate-in fade-in duration-500 delay-700">
          <p className="text-gray-600 mb-3">Share your achievement!</p>
          <div className="flex justify-center space-x-3">
            <button className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-110">
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-110">
              <Copy className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-110">
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced confetti component
const Confetti = ({ show }) => {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (show) {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
      const shapes = ['square', 'circle'];
      const newParticles = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      }));
      setParticles(newParticles);
      
      const timer = setTimeout(() => setParticles([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [show]);
  
  if (!show || particles.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-fall"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            '--vx': particle.vx,
            '--vy': particle.vy,
            '--rotation-speed': particle.rotationSpeed,
            animation: 'confetti-fall 5s ease-out forwards'
          }}
        >
          <div
            className={particle.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)`,
              animation: 'confetti-spin 5s linear infinite'
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          to {
            transform: translate(calc(var(--vx) * 200px), calc(100vh + 100px));
          }
        }
        @keyframes confetti-spin {
          to {
            transform: rotate(calc(360deg * var(--rotation-speed)));
          }
        }
      `}</style>
    </div>
  );
};

// ============================================
// LIQUID POSITIONS SCREEN - Institution-Based Batch Editing
// ============================================
const LiquidPositionsScreen = ({ 
  positions, 
  onComplete, 
  onBack,
  onUpdatePosition
}) => {
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [updatedValues, setUpdatedValues] = useState({});
  const [editingPositions, setEditingPositions] = useState({});
  const [completedInstitutions, setCompletedInstitutions] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [originalValues, setOriginalValues] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showQuickTips, setShowQuickTips] = useState(true);
  
  // Initialize and load from localStorage
  useEffect(() => {
    // Initialize original values
    const values = {};
    positions.forEach(pos => {
      values[pos.id] = pos.current_value || 0;
    });
    setOriginalValues(values);
    
    // Load saved progress from localStorage
    const savedProgress = localStorage.getItem('nestegg_liquid_positions_progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setUpdatedValues(parsed.updatedValues || {});
        setCompletedInstitutions(parsed.completedInstitutions || []);
      } catch (e) {
        console.error('Error loading saved progress:', e);
      }
    }
  }, [positions]);
  
  // Save progress to localStorage
  useEffect(() => {
    if (Object.keys(updatedValues).length > 0 || completedInstitutions.length > 0) {
      localStorage.setItem('nestegg_liquid_positions_progress', JSON.stringify({
        updatedValues,
        completedInstitutions,
        timestamp: new Date().toISOString()
      }));
      setUnsavedChanges(true);
    }
  }, [updatedValues, completedInstitutions]);
  
  // Group positions by institution with enriched metadata
  const groupedPositions = useMemo(() => {
    const groups = {};
    positions.forEach(pos => {
      const institution = pos.institution || pos.account_institution || 'Other';
      if (!groups[institution]) {
        groups[institution] = [];
      }
      groups[institution].push({
        ...pos,
        hasUpdate: updatedValues[pos.id] !== undefined,
        currentDisplayValue: updatedValues[pos.id] !== undefined ? updatedValues[pos.id] : pos.current_value
      });
    });
    
    // Convert to array with rich metadata
    return Object.entries(groups).map(([institution, positions]) => {
      const totalOriginal = positions.reduce((sum, p) => sum + Math.abs(originalValues[p.id] || 0), 0);
      const totalUpdated = positions.reduce((sum, p) => {
        const value = updatedValues[p.id] !== undefined ? parseFloat(updatedValues[p.id]) : (originalValues[p.id] || 0);
        return sum + Math.abs(value);
      }, 0);
      const variance = totalUpdated - totalOriginal;
      const updatedCount = positions.filter(p => updatedValues[p.id] !== undefined).length;
      
      return {
        institution,
        positions,
        totalOriginal,
        totalUpdated,
        variance,
        updatedCount,
        isComplete: updatedCount === positions.length,
        hasChanges: updatedCount > 0
      };
    }).sort((a, b) => {
      // Sort completed institutions to the bottom
      if (completedInstitutions.includes(a.institution) && !completedInstitutions.includes(b.institution)) return 1;
      if (!completedInstitutions.includes(a.institution) && completedInstitutions.includes(b.institution)) return -1;
      return b.totalOriginal - a.totalOriginal;
    });
  }, [positions, updatedValues, originalValues, completedInstitutions]);
  
  // Format currency helper
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value || 0));
  };
  
  // Handle value update for a position
  const handleValueUpdate = (positionId, value) => {
    setUpdatedValues(prev => ({
      ...prev,
      [positionId]: value
    }));
  };
  
  // Toggle editing mode for a position
  const toggleEditing = (positionId) => {
    setEditingPositions(prev => ({
      ...prev,
      [positionId]: !prev[positionId]
    }));
  };
  
  // Mark institution as complete
  const markInstitutionComplete = (institution) => {
    setCompletedInstitutions(prev => {
      if (prev.includes(institution)) {
        return prev.filter(i => i !== institution);
      }
      return [...prev, institution];
    });
  };
  
  // Clear all changes for an institution
  const clearInstitutionChanges = (institution) => {
    const institutionData = groupedPositions.find(g => g.institution === institution);
    if (institutionData) {
      const newUpdatedValues = { ...updatedValues };
      institutionData.positions.forEach(pos => {
        delete newUpdatedValues[pos.id];
      });
      setUpdatedValues(newUpdatedValues);
      
      // Clear editing states
      const newEditingPositions = { ...editingPositions };
      institutionData.positions.forEach(pos => {
        delete newEditingPositions[pos.id];
      });
      setEditingPositions(newEditingPositions);
    }
  };
  
  // Submit all changes
  const handleSubmitAll = () => {
    if (Object.keys(updatedValues).length === 0) {
      return;
    }
    
    setShowCelebration(true);
    setTimeout(() => {
      onComplete(updatedValues);
      // Clear localStorage after successful submission
      localStorage.removeItem('nestegg_liquid_positions_progress');
    }, 2000);
  };
  
  // Calculate overall progress
  const overallStats = useMemo(() => {
    const totalPositions = positions.length;
    const updatedCount = Object.keys(updatedValues).length;
    const progress = totalPositions > 0 ? (updatedCount / totalPositions) * 100 : 0;
    
    const totalVariance = positions.reduce((sum, pos) => {
      const original = originalValues[pos.id] || 0;
      const updated = updatedValues[pos.id] !== undefined ? parseFloat(updatedValues[pos.id]) : original;
      return sum + (updated - original);
    }, 0);
    
    return {
      totalPositions,
      updatedCount,
      progress,
      totalVariance,
      institutionsComplete: completedInstitutions.length,
      totalInstitutions: groupedPositions.length
    };
  }, [positions, updatedValues, originalValues, completedInstitutions, groupedPositions]);
  
  return (
    <div className="space-y-6">
      {/* Header with back button and progress */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to overview
        </button>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Update Liquid Positions</h2>
            <p className="text-gray-600 mt-1">Review and update your cash accounts by institution</p>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Progress Stats */}
            <div className="text-right">
              <div className="text-sm text-gray-500">Positions Updated</div>
              <div className="text-2xl font-bold text-gray-900">
                {overallStats.updatedCount} / {overallStats.totalPositions}
              </div>
            </div>
            
            {/* Institutions Complete */}
            <div className="text-right">
              <div className="text-sm text-gray-500">Institutions</div>
              <div className="text-2xl font-bold text-gray-900">
                {overallStats.institutionsComplete} / {overallStats.totalInstitutions}
              </div>
            </div>
            
            <ProgressRing percentage={overallStats.progress} size={80} color="blue" />
          </div>
        </div>
        
        {/* Overall progress bar */}
        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out shadow-md"
            style={{ width: `${overallStats.progress}%` }}
          />
        </div>
        
        {/* Unsaved changes warning */}
        {unsavedChanges && overallStats.updatedCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-3" />
              <span className="text-sm text-amber-800">
                You have unsaved changes. Your progress is automatically saved locally.
              </span>
            </div>
            <button
              onClick={handleSubmitAll}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              Submit All Changes
            </button>
          </div>
        )}
      </div>
      
      {/* Quick Tips */}
      {showQuickTips && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 relative">
          <button
            onClick={() => setShowQuickTips(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Quick Tips:</p>
              <ul className="space-y-1">
                <li>• Open your bank app or website for each institution</li>
                <li>• Update all accounts at once for each institution</li>
                <li>• Click the value to edit, press Enter to save</li>
                <li>• Your progress is saved automatically</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Institution Cards */}
      <div className="space-y-4">
        {groupedPositions.map((institutionData) => {
          const isSelected = selectedInstitution === institutionData.institution;
          const isCompleted = completedInstitutions.includes(institutionData.institution);
          
          return (
            <div
              key={institutionData.institution}
              className={`
                bg-white rounded-xl border-2 transition-all duration-300
                ${isCompleted ? 'border-green-400 bg-green-50/30' : 
                  isSelected ? 'border-blue-500 shadow-xl' : 
                  'border-gray-200 hover:border-gray-300 hover:shadow-lg'}
              `}
            >
              {/* Institution Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setSelectedInstitution(isSelected ? null : institutionData.institution)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      p-2 rounded-lg transition-colors
                      ${isCompleted ? 'bg-green-100' : 'bg-gray-100'}
                    `}>
                      <Landmark className={`
                        w-6 h-6 
                        ${isCompleted ? 'text-green-600' : 'text-gray-600'}
                      `} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {institutionData.institution}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {institutionData.positions.length} accounts • 
                        {institutionData.updatedCount > 0 && (
                          <span className="text-blue-600 ml-1">
                            {institutionData.updatedCount} updated
                          </span>
                        )}
                        {institutionData.updatedCount === 0 && (
                          <span className="text-gray-400 ml-1">
                            No updates yet
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Variance Badge */}
                    {institutionData.variance !== 0 && (
                      <div className={`
                        px-3 py-1 rounded-full text-sm font-medium
                        ${institutionData.variance > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'}
                      `}>
                        {institutionData.variance > 0 ? '+' : ''}{formatCurrency(institutionData.variance)}
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    {isCompleted && (
                      <div className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Complete</span>
                      </div>
                    )}
                    
                    <ChevronDown className={`
                      w-5 h-5 text-gray-400 transition-transform duration-300
                      ${isSelected ? 'rotate-180' : ''}
                    `} />
                  </div>
                </div>
              </div>
              
              {/* Expanded Content - Account Table */}
              {isSelected && (
                <div className="border-t border-gray-200 p-4 animate-in slide-in-from-top duration-300">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                            Account
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                            NestEgg Balance
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                            Statement Balance
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                            Variance
                          </th>
                          <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {institutionData.positions.map((position) => {
                          const isEditing = editingPositions[position.id];
                          const originalValue = originalValues[position.id] || 0;
                          const currentValue = updatedValues[position.id] !== undefined 
                            ? parseFloat(updatedValues[position.id]) 
                            : originalValue;
                          const variance = currentValue - originalValue;
                          const isLiability = position.position_type === 'credit_card' || 
                                            position.position_type === 'loan' || 
                                            position.type === 'liability';
                          
                          return (
                            <tr key={position.id} className="group hover:bg-gray-50">
                              <td className="py-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`
                                    p-2 rounded-lg
                                    ${isLiability ? 'bg-red-50' : 'bg-green-50'}
                                  `}>
                                    {position.position_type === 'checking' ? <Wallet className={`w-4 h-4 ${isLiability ? 'text-red-600' : 'text-green-600'}`} /> :
                                     position.position_type === 'savings' ? <PiggyBank className={`w-4 h-4 ${isLiability ? 'text-red-600' : 'text-green-600'}`} /> :
                                     position.position_type === 'credit_card' ? <CreditCard className="w-4 h-4 text-red-600" /> :
                                     position.position_type === 'loan' ? <Receipt className="w-4 h-4 text-red-600" /> :
                                     <DollarSign className={`w-4 h-4 ${isLiability ? 'text-red-600' : 'text-green-600'}`} />}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {position.name || position.position_name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {position.position_type || position.type}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              
                              <td className="text-right py-3">
                                <span className="text-gray-900 font-medium">
                                  {isLiability && '-'}{formatCurrency(originalValue)}
                                </span>
                              </td>
                              
                              <td className="text-right py-3">
                                {isEditing ? (
                                  <div className="flex items-center justify-end">
                                    <span className="mr-1 text-gray-500">
                                      {isLiability ? '-$' : '$'}
                                    </span>
                                    <input
                                      type="text"
                                      defaultValue={Math.abs(currentValue).toFixed(2)}
                                      onChange={(e) => handleValueUpdate(position.id, e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          toggleEditing(position.id);
                                        }
                                      }}
                                      className="w-32 px-2 py-1 border-2 border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <span className={`
                                    font-medium cursor-pointer hover:text-blue-600 transition-colors
                                    ${updatedValues[position.id] !== undefined ? 'text-blue-600' : 'text-gray-900'}
                                  `}
                                  onClick={() => toggleEditing(position.id)}
                                  >
                                    {isLiability && '-'}{formatCurrency(currentValue)}
                                  </span>
                                )}
                              </td>
                              
                              <td className="text-right py-3">
                                {variance !== 0 && (
                                  <span className={`
                                    font-medium
                                    ${variance > 0 ? 'text-green-600' : 'text-red-600'}
                                  `}>
                                    {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                  </span>
                                )}
                                {variance === 0 && (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              
                              <td className="text-center py-3">
                                <button
                                  onClick={() => toggleEditing(position.id)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title={isEditing ? "Save" : "Edit"}
                                >
                                  {isEditing ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      
                      {/* Institution Total Row */}
                      <tfoot>
                        <tr className="border-t-2 border-gray-300">
                          <td className="pt-3 font-semibold text-gray-900">
                            Total
                          </td>
                          <td className="pt-3 text-right font-semibold text-gray-900">
                            {formatCurrency(institutionData.totalOriginal)}
                          </td>
                          <td className="pt-3 text-right font-semibold text-gray-900">
                            {formatCurrency(institutionData.totalUpdated)}
                          </td>
                          <td className="pt-3 text-right">
                            {institutionData.variance !== 0 && (
                              <span className={`
                                font-semibold
                                ${institutionData.variance > 0 ? 'text-green-600' : 'text-red-600'}
                              `}>
                                {institutionData.variance > 0 ? '+' : ''}{formatCurrency(institutionData.variance)}
                              </span>
                            )}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {/* Institution Actions */}
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => clearInstitutionChanges(institutionData.institution)}
                      className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                      disabled={institutionData.updatedCount === 0}
                    >
                      Clear Changes
                    </button>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => markInstitutionComplete(institutionData.institution)}
                        className={`
                          px-4 py-2 font-medium rounded-lg transition-all
                          ${isCompleted 
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                            : 'bg-green-600 text-white hover:bg-green-700'}
                        `}
                      >
                        {isCompleted ? (
                          <>
                            <X className="w-4 h-4 inline mr-2" />
                            Mark Incomplete
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                            Mark Complete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Summary and Actions */}
      {overallStats.updatedCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Ready to Submit?</h3>
              <p className="text-sm text-gray-600">
                You've updated {overallStats.updatedCount} positions across {overallStats.institutionsComplete} institutions.
                {overallStats.totalVariance !== 0 && (
                  <span className={`
                    ml-2 font-medium
                    ${overallStats.totalVariance > 0 ? 'text-green-600' : 'text-red-600'}
                  `}>
                    Net change: {overallStats.totalVariance > 0 ? '+' : ''}{formatCurrency(overallStats.totalVariance)}
                  </span>
                )}
              </p>
            </div>
            
            <button
              onClick={handleSubmitAll}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg flex items-center"
            >
              <Save className="w-5 h-5 mr-2" />
              Submit All Updates
            </button>
          </div>
        </div>
      )}
      
      {/* Celebration */}
      <ProgressCelebration 
        show={showCelebration}
        message="All liquid positions updated successfully!"
      />
      <Confetti show={showCelebration} />
    </div>
  );
};

// Enhanced account reconciliation screen
const AccountReconciliationScreen = ({ 
  accounts, 
  onComplete, 
  onBack,
  reconciliationData,
  onUpdateReconciliationData,
  showValues
}) => {
  const [groupedAccounts, setGroupedAccounts] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [positions, setPositions] = useState({});
  const [loading, setLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [editingPosition, setEditingPosition] = useState(null);
  
  // Group accounts by institution
  useEffect(() => {
    const groups = {};
    accounts.forEach(account => {
      const institution = account.institution || 'Other';
      if (!groups[institution]) {
        groups[institution] = [];
      }
      groups[institution].push(account);
    });
    
    const grouped = Object.entries(groups).map(([institution, accounts]) => ({
      institution,
      accounts,
      totalValue: accounts.reduce((sum, a) => sum + (parseFloat(a.total_value) || 0), 0),
      needsReconciliation: accounts.filter(a => 
        a.reconciliationStatus !== 'reconciled'
      ).length
    })).sort((a, b) => b.totalValue - a.totalValue);
    
    setGroupedAccounts(grouped);
    if (grouped.length > 0) {
      setSelectedInstitution(grouped[0].institution);
    }
  }, [accounts]);
  
  // Load positions for account
  const loadPositions = async (accountId) => {
    try {
      const response = await fetchWithAuth(`/positions/unified?account_id=${accountId}`);
      if (!response.ok) throw new Error('Failed to fetch positions');
      
      const data = await response.json();
      setPositions(prev => ({
        ...prev,
        [accountId]: data.positions || []
      }));
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };
  
  // Select account
  const selectAccount = async (account) => {
    setSelectedAccount(account);
    if (!positions[account.id]) {
      await loadPositions(account.id);
    }
  };
  
  // Handle balance input
  const handleBalanceInput = (accountId, value) => {
    onUpdateReconciliationData({
      ...reconciliationData,
      [accountId]: {
        ...reconciliationData[accountId],
        statementBalance: value,
        timestamp: new Date().toISOString()
      }
    });
  };
  
  // Calculate difference
  const calculateDifference = (account) => {
    const statementBalance = parseFloat(reconciliationData[account.id]?.statementBalance || 0);
    const nesteggBalance = parseFloat(account.totalValue || account.total_value || 0);
    const difference = statementBalance - nesteggBalance;
    const percentage = nesteggBalance !== 0 ? (difference / nesteggBalance) * 100 : 0;
    
    return {
      statementBalance,
      nesteggBalance,
      difference,
      percentage,
      isReconciled: Math.abs(difference) < 0.01,
      needsReview: Math.abs(percentage) > 0.1
    };
  };
  
  // Quick reconcile
  const quickReconcile = async (account) => {
    const updatedData = {
      ...reconciliationData,
      [account.id]: {
        ...reconciliationData[account.id],
        lastReconciled: new Date().toISOString(),
        statementBalance: account.totalValue || account.total_value || 0
      }
    };
    onUpdateReconciliationData(updatedData);
    
    // Update account status
    account.reconciliationStatus = 'reconciled';
    account.daysSinceReconciliation = 0;
  };
  
  // Get current institution's accounts
  const currentInstitution = groupedAccounts.find(g => g.institution === selectedInstitution);
  const currentAccounts = currentInstitution?.accounts || [];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to workflow selection
        </button>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Reconcile Accounts</h2>
            <p className="text-gray-600 mt-1">Verify and update your account balances</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Accounts to Reconcile</div>
              <div className="text-2xl font-bold text-gray-900">
                {accounts.filter(a => a.reconciliationStatus !== 'reconciled').length}
              </div>
            </div>
            <ProgressRing 
              percentage={
                accounts.length > 0 
                  ? (accounts.filter(a => a.reconciliationStatus === 'reconciled').length / accounts.length) * 100
                  : 0
              } 
              size={80} 
              color="green" 
            />
          </div>
        </div>
      </div>
      
      {/* Institution tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1 overflow-x-auto">
          {groupedAccounts.map(({ institution, accounts, needsReconciliation }) => (
            <button
              key={institution}
              onClick={() => setSelectedInstitution(institution)}
              className={`
                px-6 py-3 font-medium text-sm whitespace-nowrap transition-all
                ${selectedInstitution === institution
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <Landmark className="w-4 h-4" />
                <span>{institution}</span>
                {needsReconciliation > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    {needsReconciliation}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Accounts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account list */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Select Account to Reconcile</h3>
          
          {currentAccounts.map(account => {
            const isSelected = selectedAccount?.id === account.id;
            const category = CATEGORY_CONFIGS[account.account_category] || CATEGORY_CONFIGS.brokerage;
            const CategoryIcon = category.icon;
            const diff = calculateDifference(account);
            
            return (
              <button
                key={account.id}
                onClick={() => selectAccount(account)}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all transform
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.01]'
                    : account.reconciliationStatus === 'reconciled'
                      ? 'border-green-200 bg-green-50 hover:border-green-300'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                      <CategoryIcon className={`w-5 h-5 text-${category.color}-600`} />
                    </div>
                    <div>

                      <h4 className="font-semibold text-gray-900">{account.accountName || account.account_name}</h4>
                      <p className="text-sm text-gray-500">{account.accountType || account.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {showValues ? formatCurrency(account.totalValue || account.total_value || 0) : '••••••'}
                      </p>
                      <p className="text-xs text-gray-500">{account.positionsCount || account.total_positions || 0} positions</p>



                    </div>
                    <StatusIndicator status={account.reconciliationStatus} showPulse={false} />
                  </div>
                </div>
                
                {account.reconciliationStatus === 'reconciled' && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-green-700 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Reconciled {account.daysSinceReconciliation === 0 ? 'today' : `${account.daysSinceReconciliation} days ago`}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Reconciliation panel */}
        <div>
          {selectedAccount ? (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Reconcile Account</h3>
              
              {/* Balance comparison */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700">NestEgg Balance</label>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {showValues ? formatCurrency(selectedAccount.total_value) : '••••••'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Statement Balance</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                    <input
                      type="text"
                      value={reconciliationData[selectedAccount.id]?.statementBalance || ''}
                      onChange={(e) => handleBalanceInput(selectedAccount.id, e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 text-2xl font-bold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                    />
                  </div>
                </div>
                
                {reconciliationData[selectedAccount.id]?.statementBalance && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Difference</label>
                    <div className={`
                      text-2xl font-bold mt-1
                      ${calculateDifference(selectedAccount).isReconciled ? 'text-green-600' : 'text-amber-600'}
                    `}>
                      {formatCurrency(calculateDifference(selectedAccount).difference)}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reconciliation status */}
              {reconciliationData[selectedAccount.id]?.statementBalance && (
                <div className={`
                  p-4 rounded-lg mb-6
                  ${calculateDifference(selectedAccount).isReconciled
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                  }
                `}>
                  <div className="flex items-center">
                    {calculateDifference(selectedAccount).isReconciled ? (
                      <>
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                       <div className="flex-1">
                         <p className="font-medium text-green-900">Balances Match!</p>
                         <p className="text-sm text-green-700">Ready to mark as reconciled</p>
                       </div>
                     </>
                   ) : (
                     <>
                       <AlertCircle className="w-5 h-5 text-amber-600 mr-3" />
                       <div className="flex-1">
                         <p className="font-medium text-amber-900">Balances Don't Match</p>
                         <p className="text-sm text-amber-700">
                           Difference of {formatCurrency(Math.abs(calculateDifference(selectedAccount).difference))}
                         </p>
                       </div>
                     </>
                   )}
                 </div>
               </div>
             )}
             
             {/* Quick actions */}
             <div className="flex space-x-3">
               <button
                 onClick={() => quickReconcile(selectedAccount)}
                 className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow-md"
               >
                 <CheckCircle className="w-4 h-4 inline mr-2" />
                 Quick Reconcile
               </button>
               
               <button
                 onClick={() => {
                   setSelectedAccount(null);
                   setPendingChanges([]);
                 }}
                 className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all"
               >
                 Cancel
               </button>
             </div>
           </div>
         ) : (
           <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
             <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
             <p className="text-gray-500">Select an account to begin reconciliation</p>
           </div>
         )}
       </div>
     </div>
     
     {/* Complete reconciliation button */}
     <div className="flex justify-end mt-8">
       <button
         onClick={onComplete}
         className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-lg rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-xl flex items-center"
       >
         <CheckCheck className="w-6 h-6 mr-3" />
         Complete Reconciliation
       </button>
     </div>
   </div>
 );
};

// ============================================
// WELCOME SCREEN - Friendly & User-Focused
// ============================================
const WelcomeScreen = ({ 
  stats, 
  onSelectPath, 
  reconciliationHealth,
  lastReconciliation,
  streak
}) => {
  const [hoveredPath, setHoveredPath] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Friendly greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  
  // Get health status message
  const getHealthMessage = () => {
    if (reconciliationHealth >= 90) return "Your portfolio is in excellent shape! 🌟";
    if (reconciliationHealth >= 75) return "Looking good! A few accounts need attention. 📊";
    if (reconciliationHealth >= 50) return "Time for a check-up on your accounts. 🔍";
    return "Let's get your portfolio back on track! 💪";
  };
  
  // Format currency helper
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Workflow paths with enhanced UX
  const paths = [
    {
      id: 'liquid',
      icon: Droplets,
      title: 'Quick Cash Update',
      subtitle: 'Update your daily accounts',
      description: 'Perfect for keeping your checking, savings, and credit cards current',
      stats: stats.liquidPositions === 0 
        ? '✅ All up to date!' 
        : `${stats.liquidPositions} ${stats.liquidPositions === 1 ? 'account needs' : 'accounts need'} a quick update`,
      time: '2-3 min',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
      benefits: ['Track daily spending', 'Monitor cash flow', 'Stay on budget'],
      priority: stats.liquidPositions > 5 ? 'high' : stats.liquidPositions > 0 ? 'medium' : 'low'
    },
    {
      id: 'reconcile',
      icon: CheckSquare,
      title: 'Investment Check-In',
      subtitle: 'Verify your investment accounts',
      description: 'Ensure your investment and retirement accounts match your statements',
      stats: stats.needsReconciliation === 0 
        ? '✅ Everything reconciled!' 
        : `${stats.needsReconciliation} ${stats.needsReconciliation === 1 ? 'account' : 'accounts'} to review`,
      time: '3-5 min',
      color: 'green',
      gradient: 'from-green-500 to-emerald-500',
      benefits: ['Catch discrepancies early', 'Track investment growth', 'Maintain accuracy'],
      priority: stats.needsReconciliation > 3 ? 'high' : stats.needsReconciliation > 0 ? 'medium' : 'low'
    },
    {
      id: 'full',
      icon: Zap,
      title: 'Complete Sync',
      subtitle: 'Full portfolio refresh',
      description: 'The fastest way to update everything at once',
      stats: '⚡ Most efficient workflow',
      time: '5-8 min',
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500',
      featured: true,
      benefits: ['One-stop update', 'Maximum accuracy', 'Time-saving'],
      priority: (stats.liquidPositions + stats.needsReconciliation) > 5 ? 'high' : 'medium'
    }
  ];
  
  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Personalized Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}! Let's check on your NestEgg 🥚
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {getHealthMessage()}
        </p>
        
        {/* Streak Badge */}
        {streak > 0 && (
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full">
            <Flame className="w-5 h-5 text-orange-500 mr-2" />
            <span className="text-sm font-medium text-gray-900">
              {streak} day streak! Keep it going!
            </span>
          </div>
        )}
      </div>
      
      {/* Portfolio Overview Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Portfolio Snapshot
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'actions' 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Needed Actions
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Health Score */}
              <div className="text-center">
                <div className="relative inline-block mb-3">
                  <ProgressRing 
                    percentage={reconciliationHealth} 
                    size={100} 
                    strokeWidth={8} 
                    color={reconciliationHealth >= 75 ? 'green' : reconciliationHealth >= 50 ? 'yellow' : 'red'}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{reconciliationHealth}%</div>
                      <div className="text-xs text-gray-500">Health</div>
                    </div>
                  </div>
                </div>
                <h3 className="font-medium text-gray-900">Portfolio Health</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Last full update: {lastReconciliation}
                </p>
              </div>
              
              {/* Accounts Status */}
              <div className="text-center">
                <div className="mb-3">
                  <div className="text-4xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-500">Total Accounts</div>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">{stats.reconciled} current</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">{stats.needsReconciliation} pending</span>
                  </div>
                </div>
              </div>
              
              {/* Portfolio Value Coverage */}
              <div className="text-center">
                <div className="mb-3">
                  <div className="text-4xl font-bold text-gray-900">
                    {stats.valuePercentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">Value Reconciled</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.valuePercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formatCurrency(stats.reconciledValue)} of {formatCurrency(stats.totalValue)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Priority Actions */}
              {(stats.liquidPositions > 0 || stats.needsReconciliation > 0) ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Actions Needed</h3>
                    <span className="text-sm text-gray-500">
                      {stats.liquidPositions + stats.needsReconciliation} total items
                    </span>
                  </div>
                  
                  {stats.liquidPositions > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <Droplets className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Liquid Positions</p>
                          <p className="text-sm text-gray-600">
                            {stats.liquidPositions} positions need updating
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  
                  {stats.needsReconciliation > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <CheckSquare className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Account Reconciliation</p>
                          <p className="text-sm text-gray-600">
                            {stats.needsReconciliation} accounts to verify
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 mb-2">All Caught Up!</h3>
                  <p className="text-sm text-gray-600">
                    Your portfolio is fully reconciled. Great job staying on top of your finances!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Workflow Selection */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Choose your workflow:
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paths.map((path) => {
            const Icon = path.icon;
            const isHovered = hoveredPath === path.id;
            
            return (
              <button
                key={path.id}
                onClick={() => onSelectPath(path.id)}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                className={`
                  relative group text-left p-6 rounded-xl border-2 
                  transition-all duration-300 transform
                  ${path.featured 
                    ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50' 
                    : 'border-gray-200 bg-white'
                  }
                  ${isHovered ? 'scale-[1.02] shadow-xl' : 'shadow-md'}
                  hover:border-opacity-100
                `}
              >
                {path.featured && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full">
                      <Star className="w-3 h-3 mr-1" />
                      RECOMMENDED
                    </span>
                  </div>
                )}
                
                {/* Priority Badge */}
                {path.priority && !path.featured && (
                  <div className="absolute -top-2 -right-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(path.priority)}`}>
                      {path.priority === 'high' ? 'Urgent' : path.priority === 'medium' ? 'Soon' : 'Low'}
                    </span>
                  </div>
                )}
                
                <div className="flex items-start space-x-4">
                  <div className={`
                    p-3 rounded-lg transition-all duration-300
                    ${isHovered 
                      ? `bg-gradient-to-br ${path.gradient} shadow-lg` 
                      : path.color === 'blue' ? 'bg-blue-100' :
                        path.color === 'green' ? 'bg-green-100' :
                        path.color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'
                    }
                  `}>
                    <Icon className={`
                      w-6 h-6 transition-all duration-300
                      ${isHovered ? 'text-white scale-110' : 
                        path.color === 'blue' ? 'text-blue-600' :
                        path.color === 'green' ? 'text-green-600' :
                        path.color === 'purple' ? 'text-purple-600' : 'text-gray-600'
                      }
                    `} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{path.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{path.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${
                        path.stats.includes('✅') ? 'text-green-600' : 'text-gray-700'
                      }`}>
                        {path.stats}
                      </span>
                      <span className="text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {path.time}
                      </span>
                    </div>
                    
                    {/* Benefits on hover */}
                    <div className={`
                      mt-3 space-y-1 transition-all duration-300
                      ${isHovered ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}
                    `}>
                      {path.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center text-xs text-gray-600">
                          <Check className="w-3 h-3 mr-1 text-green-500" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className={`
                  absolute bottom-4 right-4 transition-all duration-300
                  ${isHovered ? 'translate-x-1' : ''}
                `}>
                  <ChevronRight className={`
                    w-5 h-5 
                    ${path.featured ? 'text-purple-600' : 'text-gray-400'}
                  `} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Quick Tips - More Concise */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Quick Tip</h3>
            <p className="text-sm text-gray-700">
              {stats.liquidPositions > stats.needsReconciliation 
                ? "Start with your liquid positions - they change the most frequently and impact your daily finances."
                : stats.needsReconciliation > 0
                  ? "Your investment accounts need attention. Regular reconciliation helps catch discrepancies early."
                  : "You're all caught up! Consider reviewing your asset allocation or updating any recent transactions."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Progress celebration component
const ProgressCelebration = ({ show, message }) => {
 if (!show) return null;
 
 return (
   <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 animate-in fade-in duration-300">
     <div className="bg-white rounded-3xl p-10 shadow-2xl text-center animate-in zoom-in-95 duration-500 max-w-md">
       <div className="mb-6">
         <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-xl">
           <Trophy className="w-10 h-10 text-white animate-bounce" />
         </div>
       </div>
       <h3 className="text-3xl font-bold text-gray-900 mb-3">Awesome! 🎉</h3>
       <p className="text-lg text-gray-600">{message}</p>
       <div className="mt-6 flex justify-center space-x-2">
         <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
         <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
         <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
       </div>
     </div>
   </div>
 );
};

// Main QuickReconciliationModal component
const QuickReconciliationModal = ({ isOpen, onClose }) => {
 // DataStore Integration
 const { 
   accounts = [], 
   loading: accountsLoading,
   error: accountsError,
   refresh: refreshAccounts 
 } = useAccounts();
 
 const { 
   positions: allPositions = [], 
   loading: positionsLoading,
   error: positionsError,
   refresh: refreshPositions 
 } = useDetailedPositions();
 
 const { actions } = useDataStore();
 
 // Combine loading states
 const loading = accountsLoading || positionsLoading;
 
 // State management
 const [currentScreen, setCurrentScreen] = useState('welcome');
 const [positions, setPositions] = useState({});
 const [liquidPositions, setLiquidPositions] = useState([]);
 const [selectedAccount, setSelectedAccount] = useState(null);
 const [localLoading, setLocalLoading] = useState(false);
 const [reconciliationData, setReconciliationData] = useState({});
 const [streak, setStreak] = useState(0);
 const [showConfetti, setShowConfetti] = useState(false);
 const [pendingUpdates, setPendingUpdates] = useState({});
 const [showValues, setShowValues] = useState(true);
 const [message, setMessage] = useState({ type: '', text: '' });
 const [reconciliationResults, setReconciliationResults] = useState([]);
 
 // Refs
 const messageTimeoutRef = useRef(null);
 
 // Load data on mount
 useEffect(() => {
   if (isOpen) {
     loadData();
     loadReconciliationData();
     calculateStreak();
   }
   
   return () => {
     if (messageTimeoutRef.current) {
       clearTimeout(messageTimeoutRef.current);
     }
   };
 }, [isOpen]);
 
// Load all data
 const loadData = async () => {
   setLocalLoading(true);
   try {
     // Refresh DataStore
     await Promise.all([
       refreshAccounts(),
       refreshPositions()
     ]);
     
     // Enrich accounts with reconciliation status
     // Debug: Check account structure
     if (accounts.length > 0) {
       console.log('Account fields from DataStore:', {
         firstAccount: accounts[0],
         fieldNames: Object.keys(accounts[0])
       });
     }
     
     // Enrich accounts with reconciliation status
// Enrich accounts with reconciliation status using correct field names
     const enrichedAccounts = accounts.map(account => {
       const lastRec = reconciliationData[account.id]?.lastReconciled;
       const daysSince = lastRec ? 
         Math.floor((Date.now() - new Date(lastRec).getTime()) / (1000 * 60 * 60 * 24)) : 
         null;
       
       return {
         ...account,
         reconciliationStatus: getReconciliationStatus(account, daysSince),
         daysSinceReconciliation: daysSince,
         // Ensure we have both field name formats for compatibility
         total_value: account.totalValue || account.total_value || 0,
         account_name: account.accountName || account.account_name || 'Unknown'
       };
     });
     
     setPositions(enrichedAccounts);
     
     // Filter liquid positions from DataStore - useDetailedPositions returns camelCase
     const liquid = allPositions.filter(p => {
       const assetType = p.assetType || p.asset_type || '';
       return LIQUID_POSITION_TYPES.includes(assetType.toLowerCase()) || 
              assetType.toLowerCase() === 'cash' ||
              (p.name && (p.name.toLowerCase().includes('checking') || 
                         p.name.toLowerCase().includes('savings') ||
                         p.name.toLowerCase().includes('credit') ||
                         p.name.toLowerCase().includes('loan')));
     });
     
     // Enrich liquid positions with account info
     const enrichedLiquid = liquid.map(pos => {
       const account = enrichedAccounts.find(a => a.id === (pos.accountId || pos.account_id));
       return {
         ...pos,
         institution: account?.institution || 'Unknown',
         account_institution: account?.institution || 'Unknown',
         account_name: account?.accountName || account?.account_name || 'Unknown Account',
         current_value: pos.currentValue || pos.current_value || 0,
         // Keep the itemId for updates
         position_id: pos.itemId || pos.id
       };
     });
     
     setLiquidPositions(enrichedLiquid);
     
   } catch (error) {
     console.error('Error loading data:', error);
     showMessage('error', 'Failed to load data');
   } finally {
     setLocalLoading(false);
   }
 };
 
 // Get reconciliation status
 const getReconciliationStatus = (account, daysSince) => {
   if (!daysSince) return 'pending';
   if (daysSince <= 7) return 'reconciled';
   if (daysSince <= 30) return 'warning';
   return 'error';
 };
 
 // Load reconciliation data from localStorage
 const loadReconciliationData = () => {
   const saved = localStorage.getItem('nestegg_reconciliation_data');
   if (saved) {
     setReconciliationData(JSON.parse(saved));
   }
 };
 
 // Save reconciliation data to localStorage
 const saveReconciliationData = (data) => {
   setReconciliationData(data);
   localStorage.setItem('nestegg_reconciliation_data', JSON.stringify(data));
 };
 
 // Calculate reconciliation streak
 const calculateStreak = () => {
   const history = JSON.parse(localStorage.getItem('nestegg_reconciliation_history') || '[]');
   let currentStreak = 0;
   const today = new Date().toDateString();
   
   if (history.length > 0 && new Date(history[0]).toDateString() === today) {
     currentStreak = 1;
     
     for (let i = 1; i < history.length; i++) {
       const prevDate = new Date(history[i - 1]);
       const currDate = new Date(history[i]);
       const dayDiff = (prevDate - currDate) / (1000 * 60 * 60 * 24);
       
       if (dayDiff === 1) {
         currentStreak++;
       } else {
         break;
       }
     }
   }
   
   setStreak(currentStreak);
 };
 
 // Save reconciliation to history
 const saveToHistory = () => {
   const history = JSON.parse(localStorage.getItem('nestegg_reconciliation_history') || '[]');
   const today = new Date().toISOString();
   
   if (!history.some(date => new Date(date).toDateString() === new Date(today).toDateString())) {
     history.unshift(today);
     history.splice(30);
     localStorage.setItem('nestegg_reconciliation_history', JSON.stringify(history));
   }
 };
 
 // Show message
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
 
// Calculate stats using correct field names from DataStore
 const stats = useMemo(() => {
   const total = accounts.length;
   const enrichedAccounts = positions.length > 0 ? positions : accounts;
   const needsReconciliation = enrichedAccounts.filter(a => 
     a.reconciliationStatus === 'warning' || 
     a.reconciliationStatus === 'error' || 
     a.reconciliationStatus === 'pending'
   ).length;
   const reconciled = enrichedAccounts.filter(a => a.reconciliationStatus === 'reconciled').length;
   // DataStore returns totalValue in camelCase
   const totalValue = accounts.reduce((sum, a) => sum + (parseFloat(a.totalValue) || 0), 0);
   const reconciledValue = enrichedAccounts
     .filter(a => a.reconciliationStatus === 'reconciled')
     .reduce((sum, a) => sum + (parseFloat(a.totalValue || a.total_value) || 0), 0);
   
   const liquidNeedingUpdate = liquidPositions.filter(p => {
     const lastUpdate = reconciliationData[`pos_${p.id}`]?.lastUpdated;
     const daysSince = lastUpdate ? 
       Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)) : 
       999;
     return daysSince > 1;
   }).length;
   
   return {
     total,
     needsReconciliation,
     reconciled,
     liquidPositions: liquidNeedingUpdate,
     percentage: total > 0 ? (reconciled / total) * 100 : 0,
     totalValue,
     reconciledValue,
     valuePercentage: totalValue > 0 ? (reconciledValue / totalValue) * 100 : 0
   };
 }, [accounts, liquidPositions, reconciliationData]);
 
 // Get reconciliation health
 const reconciliationHealth = useMemo(() => {
   const weights = {
     accountsReconciled: 0.6,
     liquidPositionsUpdated: 0.3,
     recency: 0.1
   };
   
   const accountScore = stats.percentage;
   const liquidScore = liquidPositions.length > 0 
     ? ((liquidPositions.length - stats.liquidPositions) / liquidPositions.length) * 100
     : 100;
   
   const lastFullReconciliation = Object.values(reconciliationData)
     .map(d => d.lastReconciled)
     .filter(Boolean)
     .sort((a, b) => new Date(b) - new Date(a))[0];
   
   const daysSinceLastFull = lastFullReconciliation
     ? Math.floor((Date.now() - new Date(lastFullReconciliation).getTime()) / (1000 * 60 * 60 * 24))
     : 30;
   
   const recencyScore = Math.max(0, 100 - (daysSinceLastFull * 14));
   
   return Math.round(
     accountScore * weights.accountsReconciled +
     liquidScore * weights.liquidPositionsUpdated +
     recencyScore * weights.recency
   );
 }, [stats, liquidPositions, reconciliationData]);
 
 // Get last reconciliation text
 const lastReconciliationText = useMemo(() => {
   const dates = Object.values(reconciliationData)
     .map(d => d.lastReconciled)
     .filter(Boolean)
     .map(d => new Date(d));
   
   if (dates.length === 0) return 'Never';
   
   const mostRecent = new Date(Math.max(...dates));
   const daysAgo = Math.floor((Date.now() - mostRecent) / (1000 * 60 * 60 * 24));
   
   if (daysAgo === 0) return 'Today';
   if (daysAgo === 1) return 'Yesterday';
   if (daysAgo < 7) return `${daysAgo} days ago`;
   if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
   return `${Math.floor(daysAgo / 30)} months ago`;
 }, [reconciliationData]);
 
 // Handle path selection
 const handlePathSelection = (path) => {
   switch (path) {
     case 'liquid':
       setCurrentScreen('liquid');
       break;
     case 'reconcile':
       setCurrentScreen('reconcile');
       break;
     case 'full':
       setCurrentScreen('liquid');
       setPendingUpdates({ nextScreen: 'reconcile' });
       break;
   }
 };
 
 // Handle liquid positions complete
 const handleLiquidComplete = async (updates) => {
   try {
     setLocalLoading(true);
     
     // Update positions via API
     for (const [positionId, value] of Object.entries(updates)) {
       const position = liquidPositions.find(p => p.id === parseInt(positionId));
       if (position) {
         await updatePosition(position.id, {
           ...position,
           current_value: parseFloat(value)
         }, position.asset_type);
       }
     }
     
     // Update local storage
     const newRecData = { ...reconciliationData };
     Object.keys(updates).forEach(posId => {
       newRecData[`pos_${posId}`] = {
         lastUpdated: new Date().toISOString(),
         value: updates[posId]
       };
     });
     
     saveReconciliationData(newRecData);
     
     // Continue to reconciliation if in full workflow
     if (pendingUpdates.nextScreen === 'reconcile') {
       setCurrentScreen('reconcile');
       setPendingUpdates({});
     } else {
       // Show success and go back
       setShowConfetti(true);
       saveToHistory();
       
       // Refresh DataStore to get updated values
       await Promise.all([
         refreshAccounts(),
         refreshPositions()
       ]);
       
       setTimeout(() => {
         setCurrentScreen('welcome');
         loadData();
       }, 2000);
     }
     
   } catch (error) {
     console.error('Error updating positions:', error);
     showMessage('error', 'Failed to update positions');
   } finally {
     setLocalLoading(false);
   }
 };
 
 // Handle reconciliation complete
 const handleReconciliationComplete = async () => {
   try {
     setLocalLoading(true);
     
     // Prepare results using correct field names from DataStore
     const results = accounts
       .filter(a => reconciliationData[a.id]?.statementBalance)
       .map(account => ({
         accountName: account.accountName || account.account_name,
         institution: account.institution,
         finalBalance: parseFloat(reconciliationData[account.id].statementBalance),
         change: parseFloat(reconciliationData[account.id].statementBalance) - parseFloat(account.totalValue || 0)
       }));
     
     setReconciliationResults(results);
     
     // Calculate summary stats
     const summaryStats = {
       accountsReconciled: results.length,
       liquidPositionsUpdated: Object.keys(pendingUpdates).length,
       totalValueReconciled: results.reduce((sum, r) => sum + r.finalBalance, 0),
       accuracy: reconciliationHealth
     };
     
     // Save history
     saveToHistory();
     
     // Show summary dashboard
     setCurrentScreen('summary');
     
   } catch (error) {
     console.error('Error completing reconciliation:', error);
     showMessage('error', 'Failed to complete reconciliation');
   } finally {
     setLocalLoading(false);
   }
 };
 
 // Handle start new reconciliation
 const handleStartNewReconciliation = () => {
   setCurrentScreen('welcome');
   setReconciliationResults([]);
   setPendingUpdates({});
   loadData();
 };
 
 // Render current screen
 const renderScreen = () => {
   switch (currentScreen) {
     case 'welcome':
       return (
         <WelcomeScreen
           stats={stats}
           onSelectPath={handlePathSelection}
           reconciliationHealth={reconciliationHealth}
           lastReconciliation={lastReconciliationText}
           streak={streak}
         />
       );
       
     case 'liquid':
       return (
         <LiquidPositionsScreen
           positions={liquidPositions}
           onComplete={handleLiquidComplete}
           onBack={() => setCurrentScreen('welcome')}
           onUpdatePosition={() => {}}
         />
       );
       
     case 'reconcile':
       return (
         <AccountReconciliationScreen
           accounts={accounts}
           onComplete={handleReconciliationComplete}
           onBack={() => setCurrentScreen('welcome')}
           reconciliationData={reconciliationData}
           onUpdateReconciliationData={saveReconciliationData}
           showValues={showValues}
         />
       );
       
     case 'summary':
       return (
         <ReconciliationSummaryDashboard
           stats={{
             accountsReconciled: reconciliationResults.length,
             liquidPositionsUpdated: Object.keys(pendingUpdates).length,
             totalValueReconciled: reconciliationResults.reduce((sum, r) => sum + r.finalBalance, 0),
             accuracy: reconciliationHealth
           }}
           reconciliationResults={reconciliationResults}
           onClose={onClose}
           onStartNewReconciliation={handleStartNewReconciliation}
         />
       );
       
     default:
       return null;
   }
 };
 
 return (
   <FixedModal
     isOpen={isOpen}
     onClose={onClose}
     title=""
     size="max-w-6xl"
     showHeader={false}
   >
     <div className="min-h-[90vh] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
       {/* Dynamic header based on screen */}
       {(currentScreen === 'liquid' || currentScreen === 'reconcile') && (
         <div className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm">
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-4">
               <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                 <Target className="w-6 h-6 text-white" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-gray-900">
                   {currentScreen === 'liquid' ? 'Update Liquid Positions' : 'Reconcile Accounts'}
                 </h2>
                 <p className="text-sm text-gray-500">NestEgg Reconciliation Workflow</p>
               </div>
             </div>
             
             <div className="flex items-center space-x-4">
               <button
                 onClick={() => setShowValues(!showValues)}
                 className={`
                   p-2.5 rounded-lg transition-all transform hover:scale-105
                   ${showValues 
                     ? 'bg-blue-100 text-blue-700 shadow-md' 
                     : 'bg-gray-100 text-gray-600'
                   }
                 `}
                 title={showValues ? 'Hide values' : 'Show values'}
               >
                 {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
               </button>
               
               <button
                 onClick={loadData}
                 className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all transform hover:scale-105"
                 title="Refresh data"
               >
                 <RefreshCw className={`w-5 h-5 text-gray-600 ${loading || localLoading ? 'animate-spin' : ''}`} />
               </button>
               
               <button
                 onClick={onClose}
                 className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all transform hover:scale-105"
               >
                 <X className="w-5 h-5 text-gray-600" />
               </button>
             </div>
           </div>
           
           {/* Progress indicator */}
           <div className="mt-4 relative">
             <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out"
                 style={{ width: `${stats.percentage}%` }}
               />
             </div>
           </div>
         </div>
       )}
       
       <div className={currentScreen === 'summary' ? '' : 'p-8'}>
         {(loading || localLoading) && currentScreen === 'welcome' ? (
           <div className="flex items-center justify-center h-96">
             <div className="text-center">
               <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
               <p className="text-gray-600">Loading your portfolio data...</p>
             </div>
           </div>
         ) : (
           renderScreen()
         )}
       </div>
       
       {/* Message Display */}
       {message.text && (
         <div className={`
           fixed bottom-6 left-6 right-6 mx-auto max-w-md px-6 py-4 rounded-xl shadow-2xl
           flex items-center justify-between animate-in slide-in-from-bottom duration-300
           ${message.type === 'error' 
             ? 'bg-red-600 text-white' 
             : message.type === 'success'
               ? 'bg-green-600 text-white'
               : 'bg-blue-600 text-white'
           }
         `}>
           <div className="flex items-center">
             {message.type === 'error' ? <AlertCircle className="w-5 h-5 mr-3" /> :
              message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> :
              <Info className="w-5 h-5 mr-3" />}
             <span className="font-medium">{message.text}</span>
           </div>
           <button
             onClick={() => setMessage({ type: '', text: '' })}
             className="p-1 hover:bg-white/20 rounded-lg transition-colors"
           >
             <X className="w-4 h-4" />
           </button>
         </div>
       )}
       
       <Confetti show={showConfetti} />
     </div>
   </FixedModal>
 );
};

// Export button component with enhanced styling
export const QuickReconciliationButton = ({ className = '' }) => {
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isHovered, setIsHovered] = useState(false);
 
 return (
   <>
     <button
       onClick={() => setIsModalOpen(true)}
       onMouseEnter={() => setIsHovered(true)}
       onMouseLeave={() => setIsHovered(false)}
       className={`group relative flex items-center text-white py-2 px-5 transition-all duration-300 transform hover:scale-105 ${className}`}
     >
       <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"></div>
       <div className="relative flex items-center">
         <CheckSquare className={`
           w-5 h-5 mr-2 transition-all duration-300
           ${isHovered ? 'text-white rotate-12' : 'text-emerald-400'}
         `} />
         <span className="text-sm text-gray-200 group-hover:text-white font-medium">
           Quick Reconcile
         </span>
         {isHovered && (
           <Sparkles className="w-4 h-4 ml-2 text-yellow-300 animate-pulse" />
         )}
       </div>
     </button>
     
     <QuickReconciliationModal 
       isOpen={isModalOpen} 
       onClose={() => setIsModalOpen(false)} 
     />
   </>
 );
};

export default QuickReconciliationModal;