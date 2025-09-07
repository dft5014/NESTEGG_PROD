// components/PeriodSummaryChips.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Activity, DollarSign, ChevronUp, ChevronDown } from 'lucide-react';

const normalizePct = (v) => {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return Math.abs(v) <= 1 ? v * 100 : v;
};

// Animated number component for smooth transitions
const AnimatedValue = ({ value, format = 'currency', className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const formatted = format === 'currency' 
    ? (displayValue != null ? formatCurrency(displayValue) : '—')
    : (displayValue != null ? `${displayValue >= 0 ? '+' : ''}${displayValue.toFixed(2)}%` : '—');

  return (
    <span className={`${className} ${isAnimating ? 'scale-105' : 'scale-100'} transition-transform duration-200`}>
      {formatted}
    </span>
  );
};

// Modern period selector chip
const PeriodChip = ({ label, amt, pct, isActive, onClick, trend = null }) => {
  const isPositive = typeof pct === 'number' ? pct >= 0 : (typeof amt === 'number' ? amt >= 0 : null);
  const hasData = typeof amt === 'number' || typeof pct === 'number';
  
  // Dynamic color system based on performance
  const getColorClasses = () => {
    if (!hasData) return 'text-gray-500 bg-gray-900/50';
    if (isPositive) {
      return isActive 
        ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' 
        : 'text-emerald-400 bg-gray-900/60 hover:bg-emerald-950/40 border-gray-800';
    }
    return isActive 
      ? 'text-red-400 bg-red-950/60 border-red-500/40' 
      : 'text-red-400 bg-gray-900/60 hover:bg-red-950/40 border-gray-800';
  };

  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <button
      onClick={onClick}
      className={`
        relative group px-3 py-2 rounded-xl border transition-all duration-300
        ${getColorClasses()}
        ${isActive ? 'shadow-lg shadow-black/20 scale-105' : 'hover:scale-102'}
        ${hasData ? 'cursor-pointer' : 'cursor-default opacity-60'}
      `}
    >
      {/* Glow effect on hover */}
      {hasData && (
        <div className={`
          absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
          ${isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}
          blur-xl
        `} />
      )}
      
      <div className="relative flex flex-col items-start gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
          {hasData && trend && <Icon className="w-3 h-3 opacity-60" />}
        </div>
        
        <div className="flex flex-col items-start">
          {typeof pct === 'number' && (
            <div className="text-sm font-bold tabular-nums leading-tight">
              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
            </div>
          )}
          {typeof amt === 'number' && (
            <div className="text-[11px] font-medium tabular-nums opacity-80">
              {amt >= 0 ? '+' : '−'}${Math.abs(amt).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          )}
        </div>
      </div>
      
      {/* Active indicator */}
      {isActive && hasData && (
        <div className={`
          absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full
          ${isPositive ? 'bg-emerald-400' : 'bg-red-400'}
        `} />
      )}
    </button>
  );
};

// Main net worth display with sparkline effect
const NetWorthDisplay = ({ value, dayChange, dayPct }) => {
  const isPositive = typeof dayPct === 'number' ? dayPct >= 0 : null;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background gradient that responds to performance */}
      <div className={`
        absolute inset-0 rounded-2xl transition-all duration-500
        ${isPositive === null ? 'bg-gradient-to-br from-gray-900/90 to-gray-800/90' :
          isPositive ? 'bg-gradient-to-br from-gray-900/90 via-emerald-950/30 to-emerald-900/20' :
          'bg-gradient-to-br from-gray-900/90 via-red-950/30 to-red-900/20'}
        ${isHovered ? 'scale-105' : 'scale-100'}
      `} />
      
      {/* Subtle glow effect */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
        ${isPositive ? 'bg-emerald-500/5' : isPositive === false ? 'bg-red-500/5' : 'bg-gray-500/5'}
        blur-2xl
      `} />
      
      <div className="relative px-5 py-3 flex items-center gap-4">
        {/* Icon with pulse animation */}
        <div className={`
          relative p-2 rounded-xl
          ${isPositive === null ? 'bg-gray-800/60' :
            isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}
        `}>
          <DollarSign className={`
            w-5 h-5
            ${isPositive === null ? 'text-gray-400' :
              isPositive ? 'text-emerald-400' : 'text-red-400'}
          `} />
          {isPositive !== null && (
            <div className={`
              absolute inset-0 rounded-xl animate-ping
              ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}
            `} />
          )}
        </div>
        
        {/* Value display */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Net Worth</span>
            {/* Live indicator dot */}
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-3">
            <AnimatedValue 
              value={value} 
              format="currency"
              className="text-2xl font-bold text-white tracking-tight"
            />
            
            {/* Day change indicator */}
            {typeof dayPct === 'number' && (
              <div className={`
                flex items-center gap-1 px-2 py-0.5 rounded-lg
                ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}
              `}>
                {isPositive ? 
                  <ChevronUp className="w-3 h-3 text-emerald-400" /> : 
                  <ChevronDown className="w-3 h-3 text-red-400" />
                }
                <span className={`
                  text-xs font-bold tabular-nums
                  ${isPositive ? 'text-emerald-400' : 'text-red-400'}
                `}>
                  {Math.abs(dayPct).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PeriodSummaryChips({ className = '' }) {
  const { summary } = usePortfolioSummary();
  const [activePeriod, setActivePeriod] = useState('1d');
  const [isExpanded, setIsExpanded] = useState(false);

  const totalValue = useMemo(() => (
    summary?.totals?.netWorth ?? summary?.netWorth ?? summary?.currentNetWorth ?? null
  ), [summary]);

  const get = useCallback((key) => summary?.periodChanges?.[key] ?? null, [summary]);

  const p1d = get('1d');
  const p1w = get('1w');
  const p1m = get('1m');
  const pytd = get('ytd');

  const periods = [
    { key: '1d', label: '1D', amt: p1d?.netWorth, pct: normalizePct(p1d?.netWorthPercent), trend: true },
    { key: '1w', label: '1W', amt: p1w?.netWorth, pct: normalizePct(p1w?.netWorthPercent), trend: true },
    { key: '1m', label: '1M', amt: p1m?.netWorth, pct: normalizePct(p1m?.netWorthPercent), trend: true },
    { key: 'ytd', label: 'YTD', amt: pytd?.netWorth, pct: normalizePct(pytd?.netWorthPercent), trend: true },
  ];

  const t = summary?.totals || {};
  const gainLossAmt = typeof t.totalGainLossAmt === 'number' ? t.totalGainLossAmt : null;
  const gainLossPct = normalizePct(typeof t.totalGainLossPct === 'number' ? t.totalGainLossPct : null);

  return (
    <div className={`relative ${className}`}>
      {/* Main container with glass morphism effect */}
      <div className="flex items-center gap-3 px-1">
        {/* Net Worth Display */}
        <NetWorthDisplay 
          value={totalValue} 
          dayChange={p1d?.netWorth}
          dayPct={normalizePct(p1d?.netWorthPercent)}
        />
        
        {/* Period selector chips */}
        <div className="flex items-center gap-2">
          {periods.map((period) => (
            <PeriodChip
              key={period.key}
              {...period}
              isActive={activePeriod === period.key}
              onClick={() => setActivePeriod(period.key)}
            />
          ))}
          
          {/* Total Gain/Loss chip with special styling */}
          <div className="ml-2 pl-2 border-l border-gray-800">
            <PeriodChip
              label="Total G/L"
              amt={gainLossAmt}
              pct={gainLossPct}
              isActive={activePeriod === 'total'}
              onClick={() => setActivePeriod('total')}
            />
          </div>
        </div>
        
        {/* Activity indicator */}
        <div className="ml-auto">
          <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors">
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}