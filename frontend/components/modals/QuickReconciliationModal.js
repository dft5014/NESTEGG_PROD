import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FixedModal from './FixedModal';
import { fetchWithAuth } from '@/utils/api';
import { 
  fetchAllAccounts,
  updateAccount 
} from '@/utils/apimethods/accountMethods';
import {
  fetchUnifiedPositions,
  updatePosition,
  deletePosition
} from '@/utils/apimethods/positionMethods';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import debounce from 'lodash.debounce';
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
  TabletSmartphone, Mic, Keyboard, MousePointer, Gauge
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

// Animated progress ring component
const ProgressRing = ({ percentage, size = 60, strokeWidth = 4, color = 'blue' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
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
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`text-${color}-600 transition-all duration-1000 ease-out`}
        strokeLinecap="round"
      />
    </svg>
  );
};

// Status indicator with pulse animation
const StatusIndicator = ({ status, showPulse = true }) => {
  const configs = {
    reconciled: { color: 'green', icon: CheckCircle, label: 'Reconciled' },
    warning: { color: 'yellow', icon: AlertTriangle, label: 'Needs Review' },
    error: { color: 'red', icon: AlertCircle, label: 'Out of Sync' },
    pending: { color: 'gray', icon: Clock, label: 'Not Reconciled' }
  };
  
  const config = configs[status] || configs.pending;
  const Icon = config.icon;
  
  return (
    <div className="relative inline-flex items-center">
      {showPulse && status !== 'reconciled' && (
        <span className={`absolute inset-0 rounded-full bg-${config.color}-400 animate-ping opacity-75`} />
      )}
      <Icon className={`relative w-5 h-5 text-${config.color}-600`} />
    </div>
  );
};

// Animated counter with smooth transitions
const AnimatedValue = ({ value, format = 'currency', className = '', duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value || 0;
    
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
        ? displayValue.toFixed(0)
        : displayValue.toLocaleString();
  
  return (
    <span className={`${className} ${isAnimating ? 'text-blue-600' : ''} transition-colors duration-300`}>
      {formatted}
    </span>
  );
};

// Smart reconciliation suggestion component
const ReconciliationSuggestion = ({ difference, onApply }) => {
  const suggestions = useMemo(() => {
    const absDiff = Math.abs(difference);
    const suggestions = [];
    
    // Common fee amounts
    if (absDiff >= 4.95 && absDiff <= 9.99) {
      suggestions.push({ type: 'fee', amount: absDiff, label: 'Trading fee' });
    }
    if (absDiff >= 0.01 && absDiff <= 1.00) {
      suggestions.push({ type: 'rounding', amount: absDiff, label: 'Rounding difference' });
    }
    if (absDiff % 10 === 0 && absDiff <= 100) {
      suggestions.push({ type: 'fee', amount: absDiff, label: 'Account maintenance fee' });
    }
    
    return suggestions;
  }, [difference]);
  
  if (suggestions.length === 0) return null;
  
  return (
    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <div className="flex items-start">
        <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">Possible explanations:</p>
          <div className="mt-1 space-y-1">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onApply(suggestion)}
                className="flex items-center justify-between w-full text-xs text-amber-700 hover:text-amber-900 py-1 px-2 rounded hover:bg-amber-100 transition-colors"
              >
                <span>{suggestion.label}</span>
                <span className="font-medium">{formatCurrency(suggestion.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Position quick edit component
const PositionQuickEdit = ({ position, onSave, onDelete, onCancel }) => {
  const [quantity, setQuantity] = useState(position.quantity || 0);
  const [value, setValue] = useState(position.current_value || 0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleSave = () => {
    onSave({
      ...position,
      quantity: parseFloat(quantity),
      current_value: parseFloat(value)
    });
  };
  
  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(position.id);
    }, 200);
  };
  
  const config = ASSET_CONFIGS[position.asset_type] || ASSET_CONFIGS.security;
  const Icon = config.icon;
  
  return (
    <div className={`
      p-4 bg-white rounded-lg border-2 transition-all duration-300
      ${isDeleting ? 'border-red-300 bg-red-50 scale-95 opacity-50' : 'border-gray-200'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg bg-${config.color}-100 mr-3`}>
            <Icon className={`w-4 h-4 text-${config.color}-600`} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {position.ticker || position.symbol || position.name}
            </h4>
            <p className="text-xs text-gray-500">{config.label}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Value
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.01"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete
        </button>
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Confetti animation component
const Confetti = ({ show }) => {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (show) {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        rotation: Math.random() * 360
      }));
      setParticles(newParticles);
      
      const timer = setTimeout(() => setParticles([]), 3000);
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
            animation: 'confetti-fall 3s ease-out forwards'
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)`
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          to {
            transform: translate(calc(var(--vx) * 100px), calc(100vh + 100px));
          }
        }
      `}</style>
    </div>
  );
};

// Streak indicator component
const StreakIndicator = ({ streak }) => {
  if (!streak || streak < 2) return null;
  
  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full">
      <Flame className="w-4 h-4" />
      <span className="text-sm font-medium">{streak} day streak!</span>
    </div>
  );
};

// Progress celebration component
const ProgressCelebration = ({ show, message }) => {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-40 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300">
        <div className="mb-4">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto animate-bounce" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Awesome!</h3>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// Liquid position card component
const LiquidPositionCard = ({ 
  position, 
  institution, 
  value, 
  onChange, 
  onComplete,
  isActive,
  suggestion
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isActive]);
  
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
  
  return (
    <div className={`
      relative rounded-xl border-2 transition-all duration-300
      ${isActive ? 'border-blue-500 shadow-lg scale-[1.02]' : 'border-gray-200'}
      ${hasChanged ? 'bg-blue-50' : 'bg-white'}
    `}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`
              p-2 rounded-lg transition-colors
              ${isLiability ? 'bg-red-100' : 'bg-green-100'}
            `}>
              <Icon className={`w-5 h-5 ${isLiability ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{position.name || position.position_name}</h4>
              <p className="text-sm text-gray-500">{institution}</p>
            </div>
          </div>
          {hasChanged && (
            <Check className="w-5 h-5 text-green-500 animate-in zoom-in duration-300" />
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Current Balance
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
              placeholder="0.00"
              className={`
                w-full pl-8 pr-4 py-3 text-lg font-semibold rounded-lg
                transition-all duration-200 outline-none
                ${isFocused 
                  ? 'border-2 border-blue-500 ring-4 ring-blue-100' 
                  : 'border-2 border-gray-300'
                }
              `}
            />
          </div>
          
          {suggestion && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span>{suggestion}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Welcome screen component
const WelcomeScreen = ({ 
  stats, 
  onSelectPath, 
  reconciliationHealth,
  lastReconciliation,
  streak
}) => {
  const [hoveredPath, setHoveredPath] = useState(null);
  
  const paths = [
    {
      id: 'liquid',
      icon: Droplets,
      title: 'Update Liquid Positions',
      subtitle: 'Cash, credit cards & loans',
      stats: `${stats.liquidPositions} positions need updates`,
      time: '2-3 minutes',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'reconcile',
      icon: CheckSquare,
      title: 'Reconcile Accounts',
      subtitle: 'Verify account balances',
      stats: `${stats.needsReconciliation} accounts need attention`,
      time: '3-5 minutes',
      color: 'green',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      id: 'full',
      icon: PlayCircle,
      title: 'Full Workflow',
      subtitle: 'Do both in one smooth flow',
      stats: 'Recommended for best results',
      time: '5-8 minutes',
      color: 'purple',
      gradient: 'from-purple-500 to-pink-500',
      featured: true
    }
  ];
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
          <Target className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900">
          Ready to sync your portfolio?
        </h2>
        
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Keep your NestEgg data accurate with our guided reconciliation workflow. 
          We've made it quick, easy, and dare we say... satisfying!
        </p>
        
        {streak > 1 && (
          <div className="flex justify-center">
            <StreakIndicator streak={streak} />
          </div>
        )}
      </div>
      
      {/* Health Status */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <ProgressRing percentage={reconciliationHealth} size={80} strokeWidth={6} color="blue" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{reconciliationHealth}%</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Your Reconciliation Health
              </h3>
              <p className="text-gray-600">
                Last full reconciliation: {lastReconciliation}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.reconciled}</div>
              <div className="text-gray-500">Up to date</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.needsReconciliation}</div>
              <div className="text-gray-500">Need attention</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Path Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose your path:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paths.map(path => {
            const Icon = path.icon;
            return (
              <button
                key={path.id}
                onClick={() => onSelectPath(path.id)}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                className={`
                  relative group text-left p-6 rounded-2xl border-2 
                  transition-all duration-300 transform
                  ${path.featured 
                    ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                  ${hoveredPath === path.id ? 'scale-[1.02] shadow-xl' : 'shadow-sm'}
                `}
              >
                {path.featured && (
                  <div className="absolute -top-3 -right-3">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </div>
                  </div>
                )}
                
                <div className={`
                  inline-flex p-3 rounded-xl mb-4 transition-all duration-300
                  ${hoveredPath === path.id 
                    ? `bg-gradient-to-br ${path.gradient}` 
                    : `bg-${path.color}-100`
                  }
                `}>
                  <Icon className={`
                    w-6 h-6 transition-colors duration-300
                    ${hoveredPath === path.id ? 'text-white' : `text-${path.color}-600`}
                  `} />
                </div>
                
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{path.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{path.subtitle}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-500">
                    <Activity className="w-4 h-4 mr-2" />
                    <span>{path.stats}</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <Timer className="w-4 h-4 mr-2" />
                    <span>Est. {path.time}</span>
                  </div>
                </div>
                
                <div className={`
                  absolute bottom-6 right-6 transition-all duration-300
                  ${hoveredPath === path.id ? 'translate-x-1' : ''}
                `}>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Tips */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="space-y-2 text-sm text-blue-900">
            <p className="font-medium">Pro Tips for Quick Reconciliation:</p>
            <ul className="space-y-1 ml-4">
              <li>• We recommend updating liquid positions daily</li>
              <li>• Reconcile investment accounts weekly or monthly</li>
              <li>• Use Tab to quickly move between fields</li>
              <li>• Copy/paste from your banking apps for accuracy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Liquid positions update screen
const LiquidPositionsScreen = ({ 
  positions, 
  onComplete, 
  onBack,
  onUpdatePosition
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [updatedPositions, setUpdatedPositions] = useState({});
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Group positions by institution
  const groupedPositions = useMemo(() => {
    const groups = {};
    positions.forEach(pos => {
      const institution = pos.institution || pos.account_institution || 'Other';
      if (!groups[institution]) {
        groups[institution] = [];
      }
      groups[institution].push(pos);
    });
    
    // Sort by total value
    return Object.entries(groups).sort((a, b) => {
      const totalA = a[1].reduce((sum, p) => sum + Math.abs(p.current_value || 0), 0);
      const totalB = b[1].reduce((sum, p) => sum + Math.abs(p.current_value || 0), 0);
      return totalB - totalA;
    });
  }, [positions]);
  
  const allPositions = groupedPositions.flatMap(([_, positions]) => positions);
  const currentPosition = allPositions[currentIndex];
  const progress = ((Object.keys(updatedPositions).length / allPositions.length) * 100) || 0;
  
  const handlePositionUpdate = (positionId, value) => {
    setUpdatedPositions(prev => ({
      ...prev,
      [positionId]: value
    }));
  };
  
  const handleNext = () => {
    if (currentIndex < allPositions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All positions updated
      setShowCelebration(true);
      setTimeout(() => {
        onComplete(updatedPositions);
      }, 2000);
    }
  };
  
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const handleSkip = () => {
    handleNext();
  };
  
  const generateSuggestion = (position) => {
    // Smart suggestions based on position type and history
    if (position.position_type === 'checking' || position.type === 'checking') {
      return 'Tip: Check for pending transactions';
    } else if (position.position_type === 'credit_card' || position.type === 'credit_card') {
      return 'Include pending charges';
    } else if (position.position_type === 'savings' || position.type === 'savings') {
      return 'Don\'t forget accrued interest';
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to overview
        </button>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Update Liquid Positions</h2>
            <p className="text-gray-600">Keep your cash and credit balances accurate</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-xl font-bold text-gray-900">
                {Object.keys(updatedPositions).length} / {allPositions.length}
              </div>
            </div>
            <ProgressRing percentage={progress} size={60} color="blue" />
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Institution groups overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {groupedPositions.map(([institution, instPositions], idx) => {
          const updated = instPositions.filter(p => updatedPositions[p.id]).length;
          const total = instPositions.length;
          const isComplete = updated === total;
          
          return (
            <div
              key={institution}
              className={`
                p-4 rounded-xl border-2 transition-all duration-300
                ${isComplete 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-white border-gray-200'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <Landmark className={`w-5 h-5 ${isComplete ? 'text-green-600' : 'text-gray-400'}`} />
                {isComplete && <Check className="w-4 h-4 text-green-600" />}
              </div>
              <h4 className="font-medium text-gray-900 truncate">{institution}</h4>
              <p className="text-sm text-gray-500">{updated} / {total} updated</p>
            </div>
          );
        })}
      </div>
      
      {/* Current position card */}
      {currentPosition && (
        <div className="max-w-xl mx-auto">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-500">
              Position {currentIndex + 1} of {allPositions.length}
            </p>
          </div>
          
          <LiquidPositionCard
            position={currentPosition}
            institution={currentPosition.institution || currentPosition.account_institution}
            value={updatedPositions[currentPosition.id] || currentPosition.current_value}
            onChange={handlePositionUpdate}
            onComplete={handleNext}
            isActive={true}
            suggestion={generateSuggestion(currentPosition)}
          />
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`
                px-4 py-2 font-medium rounded-lg transition-all
                ${currentIndex === 0
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              Previous
            </button>
            
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              Skip this one
            </button>
            
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              {currentIndex === allPositions.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
          
          {/* Keyboard hints */}
          <div className="mt-8 flex justify-center space-x-6 text-xs text-gray-400">
            <div className="flex items-center">
              <Keyboard className="w-4 h-4 mr-1" />
              <span>Tab: Next field</span>
            </div>
            <div className="flex items-center">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 mr-1">Enter</span>
              <span>Save & continue</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Celebration */}
      <ProgressCelebration 
        show={showCelebration}
        message="All liquid positions updated! Great job!"
      />
      <Confetti show={showCelebration} />
    </div>
  );
};

// Main QuickReconciliationModal component - keeping ALL original functionality
const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // State management
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({});
  const [liquidPositions, setLiquidPositions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reconciliationData, setReconciliationData] = useState({});
  const [streak, setStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [showValues, setShowValues] = useState(true);
  const [editingPosition, setEditingPosition] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('needsReconciliation');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refs
  const balanceInputRef = useRef(null);
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
    setLoading(true);
    try {
      // Load accounts
      const accountsResponse = await fetchWithAuth('/accounts/enriched');
      if (!accountsResponse.ok) throw new Error('Failed to fetch accounts');
      
      const accountsData = await accountsResponse.json();
      const accountsList = accountsData.accounts || [];
      
      // Enrich with reconciliation status
      const enrichedAccounts = accountsList.map(account => {
        const lastRec = reconciliationData[account.id]?.lastReconciled;
        const daysSince = lastRec ? 
          Math.floor((Date.now() - new Date(lastRec).getTime()) / (1000 * 60 * 60 * 24)) : 
          null;
        
        return {
          ...account,
          reconciliationStatus: getReconciliationStatus(account, daysSince),
          daysSinceReconciliation: daysSince
        };
      });
      
      setAccounts(enrichedAccounts);
      
      // Load all positions to find liquid ones
      const positionsResponse = await fetchWithAuth('/positions/unified');
      if (!positionsResponse.ok) throw new Error('Failed to fetch positions');
      
      const positionsData = await positionsResponse.json();
      const allPositions = positionsData.positions || [];
      
      // Filter liquid positions (cash, credit cards, loans)
      const liquid = allPositions.filter(p => 
        LIQUID_POSITION_TYPES.includes(p.position_type) || 
        p.asset_type === 'cash' ||
        (p.name && (p.name.toLowerCase().includes('checking') || 
                   p.name.toLowerCase().includes('savings') ||
                   p.name.toLowerCase().includes('credit') ||
                   p.name.toLowerCase().includes('loan')))
      );
      
      // Enrich liquid positions with account info
      const enrichedLiquid = liquid.map(pos => {
        const account = enrichedAccounts.find(a => a.id === pos.account_id);
        return {
          ...pos,
          institution: account?.institution || 'Unknown',
          account_institution: account?.institution || 'Unknown',
          account_name: account?.account_name || 'Unknown Account'
        };
      });
      
      setLiquidPositions(enrichedLiquid);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load data');
    } finally {
      setLoading(false);
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
    
    // Check if reconciled today
    if (history.length > 0 && new Date(history[0]).toDateString() === today) {
      currentStreak = 1;
      
      // Count consecutive days
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
    
    // Add today if not already present
    if (!history.some(date => new Date(date).toDateString() === new Date(today).toDateString())) {
      history.unshift(today);
      // Keep only last 30 days
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
  
  // Calculate stats
  const stats = useMemo(() => {
    const total = accounts.length;
    const needsReconciliation = accounts.filter(a => 
      a.reconciliationStatus === 'warning' || 
      a.reconciliationStatus === 'error' || 
      a.reconciliationStatus === 'pending'
    ).length;
    const reconciled = accounts.filter(a => a.reconciliationStatus === 'reconciled').length;
    const totalValue = accounts.reduce((sum, a) => sum + (parseFloat(a.total_value) || 0), 0);
    const reconciledValue = accounts
      .filter(a => a.reconciliationStatus === 'reconciled')
      .reduce((sum, a) => sum + (parseFloat(a.total_value) || 0), 0);
    
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
    
    // Recency score (drops off after 7 days)
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
  
  // Filter accounts
  const filteredAccounts = useMemo(() => {
    let filtered = [...accounts];
    
    // Apply status filter
    if (filter === 'needsReconciliation') {
      filtered = filtered.filter(a => 
        a.reconciliationStatus !== 'reconciled'
      );
    } else if (filter === 'reconciled') {
      filtered = filtered.filter(a => 
        a.reconciliationStatus === 'reconciled'
      );
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.account_name?.toLowerCase().includes(query) ||
        a.institution?.toLowerCase().includes(query) ||
        a.type?.toLowerCase().includes(query)
      );
    }
    
    // Sort by priority (needs reconciliation first)
    filtered.sort((a, b) => {
      const statusOrder = { error: 0, warning: 1, pending: 2, reconciled: 3 };
      return statusOrder[a.reconciliationStatus] - statusOrder[b.reconciliationStatus];
    });
    
    return filtered;
  }, [accounts, filter, searchQuery]);
  
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
      showMessage('error', 'Failed to load positions');
    }
  };
  
  // Select account for reconciliation
  const selectAccount = async (account) => {
    setSelectedAccount(account);
    setCurrentScreen('reconcile-account');
    
    // Load positions if not already loaded
    if (!positions[account.id]) {
      await loadPositions(account.id);
    }
    
    // Auto-focus balance input
    setTimeout(() => {
      balanceInputRef.current?.focus();
    }, 300);
  };
  
  // Handle balance input
  const handleBalanceInput = (accountId, value) => {
    const numericValue = value.replace(/[^0-9.-]/g, '');
    saveReconciliationData({
      ...reconciliationData,
      [accountId]: {
        ...reconciliationData[accountId],
        statementBalance: numericValue,
        timestamp: new Date().toISOString()
      }
    });
  };
  
  // Calculate reconciliation difference
  const calculateDifference = (account) => {
    const statementBalance = parseFloat(reconciliationData[account.id]?.statementBalance || 0);
    const nesteggBalance = parseFloat(account.total_value || 0);
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
  
  // Quick reconcile (mark as reconciled without changes)
  const quickReconcile = async (account) => {
    try {
      const response = await fetchWithAuth('/api/reconciliation/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: account.id,
          app_balance: parseFloat(account.total_value),
          actual_balance: parseFloat(account.total_value)
        })
      });
      
      if (!response.ok) throw new Error('Failed to reconcile');
      
      // Update local state
      saveReconciliationData({
        ...reconciliationData,
        [account.id]: {
          ...reconciliationData[account.id],
          lastReconciled: new Date().toISOString(),
          statementBalance: account.total_value
        }
      });
      
      // Update account status
      setAccounts(prev => prev.map(a => 
        a.id === account.id 
          ? { ...a, reconciliationStatus: 'reconciled', daysSinceReconciliation: 0 }
          : a
      ));
      
      showMessage('success', `${account.account_name} reconciled successfully!`);
    } catch (error) {
      console.error('Error reconciling account:', error);
      showMessage('error', 'Failed to reconcile account');
    }
  };
  
  // Save position changes
  const savePositionChanges = async (position) => {
    setPendingChanges(prev => [
      ...prev.filter(c => c.id !== position.id),
      { type: 'update', entity: 'position', data: position }
    ]);
    setEditingPosition(null);
    
    // Update local positions
    setPositions(prev => ({
      ...prev,
      [selectedAccount.id]: prev[selectedAccount.id].map(p =>
        p.id === position.id ? position : p
      )
    }));
  };
  
  // Delete position
  const deletePositionLocal = (positionId) => {
    setPendingChanges(prev => [
      ...prev,
      { type: 'delete', entity: 'position', id: positionId }
    ]);
    
    // Update local positions
    setPositions(prev => ({
      ...prev,
      [selectedAccount.id]: prev[selectedAccount.id].filter(p => p.id !== positionId)
    }));
  };
  
  // Apply all changes and reconcile
  const applyChangesAndReconcile = async () => {
    try {
      setLoading(true);
      
      // Apply pending changes
      for (const change of pendingChanges) {
        if (change.type === 'update') {
          await updatePosition(change.data.id, change.data, change.data.asset_type);
        } else if (change.type === 'delete') {
          const position = positions[selectedAccount.id].find(p => p.id === change.id);
          if (position) {
            await deletePosition(change.id, position.asset_type);
          }
        }
      }
      
      // Reconcile account
      const { statementBalance } = calculateDifference(selectedAccount);
      await fetchWithAuth('/api/reconciliation/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          app_balance: parseFloat(selectedAccount.total_value),
          actual_balance: statementBalance
        })
      });
      
      // Update reconciliation data
      saveReconciliationData({
        ...reconciliationData,
        [selectedAccount.id]: {
          ...reconciliationData[selectedAccount.id],
          lastReconciled: new Date().toISOString()
        }
      });
      
      showMessage('success', 'Account reconciled successfully!');
      setPendingChanges([]);
      setCurrentScreen('reconcile');
      setSelectedAccount(null);
      
      // Reload accounts
      await loadData();
    } catch (error) {
      console.error('Error applying changes:', error);
      showMessage('error', 'Failed to reconcile account');
    } finally {
      setLoading(false);
    }
  };
  
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
      setLoading(true);
      
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
      
      localStorage.setItem('nestegg_reconciliation_data', JSON.stringify(newRecData));
      setReconciliationData(newRecData);
      
      // Continue to reconciliation if in full workflow
      if (pendingUpdates.nextScreen === 'reconcile') {
        setCurrentScreen('reconcile');
        setPendingUpdates({});
      } else {
        // Show success and go back
        setShowConfetti(true);
        saveToHistory();
        setTimeout(() => {
          setCurrentScreen('welcome');
          loadData(); // Refresh data
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error updating positions:', error);
      showMessage('error', 'Failed to update positions');
    } finally {
      setLoading(false);
    }
  };
  
  // Render overview screen (from original)
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <Building className="w-6 h-6" />
            </div>
            <ProgressRing percentage={stats.percentage} size={50} color="blue" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {stats.reconciled} / {stats.total}
          </h3>
          <p className="text-sm text-gray-600 mt-1">Accounts Reconciled</p>
          <div className="mt-3 flex items-center text-xs text-blue-700">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>{stats.percentage.toFixed(1)}% Complete</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-600 rounded-xl text-white">
              <DollarSign className="w-6 h-6" />
            </div>
            <ProgressRing percentage={stats.valuePercentage} size={50} color="green" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            <AnimatedValue value={stats.reconciledValue} format="currency" />
          </h3>
          <p className="text-sm text-gray-600 mt-1">Value Reconciled</p>
          <div className="mt-3 text-xs text-gray-500">
            of <AnimatedValue value={stats.totalValue} format="currency" className="font-medium" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-600 rounded-xl text-white">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-amber-700">
              {stats.needsReconciliation}
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Need Attention</h3>
          <p className="text-sm text-gray-600 mt-1">Accounts to reconcile</p>
          {stats.needsReconciliation > 0 && (
            <button
              onClick={() => setFilter('needsReconciliation')}
              className="mt-3 text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center"
            >
              View accounts <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter buttons */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
                onClick={() => setFilter('all')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
               filter === 'all' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             }`}
           >
             All Accounts
           </button>
           <button
             onClick={() => setFilter('needsReconciliation')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
               filter === 'needsReconciliation' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             }`}
           >
             Needs Reconciliation
           </button>
           <button
             onClick={() => setFilter('reconciled')}
             className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
               filter === 'reconciled' 
                 ? 'bg-white text-gray-900 shadow-sm' 
                 : 'text-gray-600 hover:text-gray-900'
             }`}
           >
             Reconciled
           </button>
         </div>
         
         {/* Search */}
         <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
           <input
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="Search accounts..."
             className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
           />
         </div>
       </div>
       
       <button
         onClick={() => setShowValues(!showValues)}
         className={`p-2 rounded-lg transition-all ${
           showValues 
             ? 'bg-blue-100 text-blue-700' 
             : 'bg-gray-100 text-gray-600'
         }`}
       >
         {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
       </button>
     </div>
     
     {/* Account List */}
     <div className="space-y-3">
       {filteredAccounts.map(account => {
         const category = CATEGORY_CONFIGS[account.account_category] || CATEGORY_CONFIGS.brokerage;
         const CategoryIcon = category.icon;
         const diff = calculateDifference(account);
         
         return (
           <div
             key={account.id}
             className={`
               group bg-white rounded-xl border-2 p-4 transition-all duration-300
               hover:shadow-lg hover:scale-[1.01] cursor-pointer
               ${account.reconciliationStatus === 'reconciled' 
                 ? 'border-green-200 hover:border-green-300' 
                 : account.reconciliationStatus === 'warning'
                   ? 'border-yellow-200 hover:border-yellow-300'
                   : account.reconciliationStatus === 'error'
                     ? 'border-red-200 hover:border-red-300'
                     : 'border-gray-200 hover:border-gray-300'
               }
             `}
             onClick={() => selectAccount(account)}
           >
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-4">
                 <div className={`p-3 rounded-xl bg-${category.color}-100`}>
                   <CategoryIcon className={`w-6 h-6 text-${category.color}-600`} />
                 </div>
                 
                 <div className="flex-1">
                   <div className="flex items-center space-x-3">
                     <h3 className="font-semibold text-gray-900">{account.account_name}</h3>
                     <StatusIndicator status={account.reconciliationStatus} showPulse={false} />
                   </div>
                   <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                     <span>{account.institution}</span>
                     <span>•</span>
                     <span>{account.type}</span>
                     {account.daysSinceReconciliation !== null && (
                       <>
                         <span>•</span>
                         <span className="flex items-center">
                           <Clock className="w-3 h-3 mr-1" />
                           {account.daysSinceReconciliation === 0 
                             ? 'Today' 
                             : `${account.daysSinceReconciliation} days ago`
                           }
                         </span>
                       </>
                     )}
                   </div>
                 </div>
               </div>
               
               <div className="flex items-center space-x-4">
                 <div className="text-right">
                   <div className="text-lg font-semibold text-gray-900">
                     {showValues ? formatCurrency(account.total_value) : '••••••'}
                   </div>
                   <div className="text-xs text-gray-500">
                     {account.total_positions || 0} positions
                   </div>
                 </div>
                 
                 {account.reconciliationStatus === 'reconciled' ? (
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       quickReconcile(account);
                     }}
                     className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors"
                   >
                     <CheckCircle className="w-4 h-4 inline mr-1" />
                     Re-reconcile
                   </button>
                 ) : (
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         quickReconcile(account);
                       }}
                       className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                       title="Quick reconcile (mark as matched)"
                     >
                       <Zap className="w-4 h-4" />
                     </button>
                     <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                   </div>
                 )}
               </div>
             </div>
           </div>
         );
       })}
     </div>
     
     {filteredAccounts.length === 0 && (
       <div className="text-center py-12">
         <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
           <Search className="w-8 h-8 text-gray-400" />
         </div>
         <p className="text-gray-500">No accounts found</p>
         {searchQuery && (
           <button
             onClick={() => setSearchQuery('')}
             className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
           >
             Clear search
           </button>
         )}
       </div>
     )}
   </div>
 );
 
 // Render account reconciliation screen (from original)
 const renderAccountReconciliation = () => {
   if (!selectedAccount) return null;
   
   const accountPositions = positions[selectedAccount.id] || [];
   const diff = calculateDifference(selectedAccount);
   const category = CATEGORY_CONFIGS[selectedAccount.account_category] || CATEGORY_CONFIGS.brokerage;
   const CategoryIcon = category.icon;
   
   // Calculate position totals
   const positionTotal = accountPositions.reduce((sum, pos) => 
     sum + (parseFloat(pos.current_value) || 0), 0
   );
   
   return (
     <div className="space-y-6">
       {/* Account Header */}
       <div className="bg-white rounded-xl border border-gray-200 p-6">
         <div className="flex items-center justify-between mb-6">
           <div className="flex items-center space-x-4">
             <button
               onClick={() => {
                 setCurrentScreen('reconcile');
                 setSelectedAccount(null);
               }}
               className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
             >
               <ArrowLeft className="w-5 h-5 text-gray-600" />
             </button>
             
             <div className={`p-3 rounded-xl bg-${category.color}-100`}>
               <CategoryIcon className={`w-6 h-6 text-${category.color}-600`} />
             </div>
             
             <div>
               <h2 className="text-xl font-bold text-gray-900">{selectedAccount.account_name}</h2>
               <p className="text-sm text-gray-600">{selectedAccount.institution} • {selectedAccount.type}</p>
             </div>
           </div>
           
           <StatusIndicator status={selectedAccount.reconciliationStatus} />
         </div>
         
         {/* Balance Comparison */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">NestEgg Balance</label>
             <div className="text-2xl font-bold text-gray-900">
               {showValues ? formatCurrency(diff.nesteggBalance) : '••••••'}
             </div>
             <div className="text-xs text-gray-500">{accountPositions.length} positions</div>
           </div>
           
           <div className="space-y-2">
             <label htmlFor="statement-balance" className="text-sm font-medium text-gray-700">
               Statement Balance
             </label>
             <div className="relative">
               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
               <input
                 ref={balanceInputRef}
                 id="statement-balance"
                 type="text"
                 value={reconciliationData[selectedAccount.id]?.statementBalance || ''}
                 onChange={(e) => handleBalanceInput(selectedAccount.id, e.target.value)}
                 placeholder="0.00"
                 className="w-full pl-8 pr-4 py-3 text-2xl font-bold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
               />
             </div>
             <p className="text-xs text-gray-500">Enter your current account balance</p>
           </div>
           
           <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700">Difference</label>
             <div className={`text-2xl font-bold ${
               diff.isReconciled ? 'text-green-600' : 
               Math.abs(diff.percentage) <= 1 ? 'text-yellow-600' : 'text-red-600'
             }`}>
               {showValues ? formatCurrency(diff.difference) : '••••'}
             </div>
             <div className="text-xs text-gray-500">
               {diff.percentage !== 0 && `${diff.percentage > 0 ? '+' : ''}${diff.percentage.toFixed(2)}%`}
             </div>
           </div>
         </div>
         
         {/* Reconciliation Status */}
         {diff.statementBalance > 0 && (
           <div className={`mt-6 p-4 rounded-lg ${
             diff.isReconciled 
               ? 'bg-green-50 border border-green-200' 
               : 'bg-amber-50 border border-amber-200'
           }`}>
             <div className="flex items-center justify-between">
               <div className="flex items-center">
                 {diff.isReconciled ? (
                   <>
                     <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                     <div>
                       <p className="font-medium text-green-900">Balances Match!</p>
                       <p className="text-sm text-green-700">Your account is perfectly reconciled</p>
                     </div>
                   </>
                 ) : (
                   <>
                     <AlertCircle className="w-5 h-5 text-amber-600 mr-3" />
                     <div>
                       <p className="font-medium text-amber-900">Balances Don't Match</p>
                       <p className="text-sm text-amber-700">
                         Review positions below to find discrepancies
                       </p>
                     </div>
                   </>
                 )}
               </div>
               
               {diff.isReconciled && (
                 <button
                   onClick={() => quickReconcile(selectedAccount)}
                   className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                 >
                   Mark as Reconciled
                 </button>
               )}
             </div>
             
             {!diff.isReconciled && diff.difference !== 0 && (
               <ReconciliationSuggestion 
                 difference={diff.difference}
                 onApply={(suggestion) => {
                   // Apply suggestion logic
                   console.log('Apply suggestion:', suggestion);
                 }}
               />
             )}
           </div>
         )}
       </div>
       
       {/* Positions Section */}
       {!diff.isReconciled && diff.statementBalance > 0 && (
         <div className="bg-white rounded-xl border border-gray-200 p-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-gray-900">Positions</h3>
             <div className="flex items-center space-x-2">
               <span className="text-sm text-gray-500">
                 Total: {showValues ? formatCurrency(positionTotal) : '••••'}
               </span>
               {pendingChanges.length > 0 && (
                 <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                   {pendingChanges.length} unsaved changes
                 </span>
               )}
             </div>
           </div>
           
           <div className="space-y-3">
             {accountPositions.map(position => {
               const config = ASSET_CONFIGS[position.asset_type] || ASSET_CONFIGS.security;
               const Icon = config.icon;
               
               if (editingPosition?.id === position.id) {
                 return (
                   <PositionQuickEdit
                     key={position.id}
                     position={position}
                     onSave={savePositionChanges}
                     onDelete={deletePositionLocal}
                     onCancel={() => setEditingPosition(null)}
                   />
                 );
               }
               
               return (
                 <div
                   key={position.id}
                   className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                 >
                   <div className="flex items-center space-x-3">
                     <div className={`p-2 rounded-lg bg-${config.color}-100`}>
                       <Icon className={`w-4 h-4 text-${config.color}-600`} />
                     </div>
                     <div>
                       <p className="font-medium text-gray-900">
                         {position.ticker || position.symbol || position.name}
                       </p>
                       <p className="text-sm text-gray-500">
                         {position.quantity} units • {config.label}
                       </p>
                     </div>
                   </div>
                   
                   <div className="flex items-center space-x-3">
                     <div className="text-right">
                       <p className="font-medium text-gray-900">
                         {showValues ? formatCurrency(position.current_value) : '••••'}
                       </p>
                       <p className="text-xs text-gray-500">Current value</p>
                     </div>
                     
                     <button
                       onClick={() => setEditingPosition(position)}
                       className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <Edit3 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               );
             })}
             
             {accountPositions.length === 0 && (
               <div className="text-center py-8 text-gray-500">
                 No positions found in this account
               </div>
             )}
           </div>
           
           {/* Action Buttons */}
           <div className="mt-6 flex justify-between">
             <button
               onClick={() => {
                 setCurrentScreen('reconcile');
                 setSelectedAccount(null);
                 setPendingChanges([]);
               }}
               className="px-4 py-2 text-gray-700 bg-white border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors"
             >
               Cancel
             </button>
             
             <div className="flex space-x-3">
               {pendingChanges.length > 0 && (
                 <button
                   onClick={() => setPendingChanges([])}
                   className="px-4 py-2 text-gray-600 font-medium hover:text-gray-700 transition-colors"
                 >
                   Discard Changes
                 </button>
               )}
               
               <button
                 onClick={applyChangesAndReconcile}
                 disabled={loading || (!diff.isReconciled && pendingChanges.length === 0)}
                 className={`
                   px-6 py-2 font-medium rounded-lg transition-all
                   ${loading || (!diff.isReconciled && pendingChanges.length === 0)
                     ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     : 'bg-blue-600 text-white hover:bg-blue-700'
                   }
                 `}
               >
                 {loading ? (
                   <>
                     <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                     Processing...
                   </>
                 ) : (
                   <>
                     <CheckCircle className="w-4 h-4 inline mr-2" />
                     {pendingChanges.length > 0 ? 'Save & Reconcile' : 'Mark as Reconciled'}
                   </>
                 )}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
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
       return renderOverview();
       
     case 'reconcile-account':
       return renderAccountReconciliation();
       
     default:
       return null;
   }
 };
 
 return (
   <FixedModal
     isOpen={isOpen}
     onClose={onClose}
     title=""
     size="max-w-5xl"
     showHeader={false}
   >
     <div className="min-h-[80vh] bg-gray-50 rounded-lg">
       {/* Header for reconciliation screens */}
       {(currentScreen === 'reconcile' || currentScreen === 'reconcile-account') && (
         <div className="bg-white border-b border-gray-200 px-6 py-4">
           <div className="flex items-center justify-between mb-3">
             <h2 className="text-lg font-semibold text-gray-900">
               {currentScreen === 'reconcile' ? 'Reconciliation Overview' : 'Reconcile Account'}
             </h2>
             <div className="flex items-center space-x-3">
               {stats.total > 0 && currentScreen === 'reconcile' && (
                 <div className="flex items-center space-x-2 text-sm">
                   <div className="flex items-center">
                     <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
                     <span className="text-gray-600">{stats.reconciled} reconciled</span>
                   </div>
                   <span className="text-gray-400">•</span>
                   <div className="flex items-center">
                     <div className="w-2 h-2 bg-amber-500 rounded-full mr-1.5" />
                     <span className="text-gray-600">{stats.needsReconciliation} pending</span>
                   </div>
                 </div>
               )}
               <button
                 onClick={loadData}
                 className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                 title="Refresh"
               >
                 <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
               </button>
             </div>
           </div>
           
           {/* Progress indicator */}
           <div className="relative">
             <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out"
                 style={{ width: `${stats.percentage}%` }}
               />
             </div>
           </div>
         </div>
       )}
       
       <div className="p-8">
         {loading && currentScreen === 'welcome' ? (
           <div className="flex items-center justify-center h-64">
             <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
           </div>
         ) : (
           renderScreen()
         )}
       </div>
       
       {/* Message Display */}
       {message.text && (
         <div className={`
           absolute bottom-6 left-6 right-6 px-4 py-3 rounded-lg shadow-lg
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
             className="p-1 hover:bg-white/20 rounded transition-colors"
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

// Export button component
export const QuickReconciliationButton = ({ className = '' }) => {
 const [isModalOpen, setIsModalOpen] = useState(false);
 
 return (
   <>
     <button
       onClick={() => setIsModalOpen(true)}
       className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
     >
       <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
       <div className="relative flex items-center">
         <CheckSquare className="w-5 h-5 mr-2 text-emerald-400 group-hover:text-white transition-colors" />
         <span className="text-sm text-gray-200 group-hover:text-white font-medium">Quick Reconcile</span>
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