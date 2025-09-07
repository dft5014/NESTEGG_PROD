// components/PeriodSummaryChips.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Zap, Info } from 'lucide-react';

const normalizePct = (v) => {
 if (typeof v !== 'number' || !isFinite(v)) return null;
 return Math.abs(v) <= 1 ? v * 100 : v;
};

// Format large numbers compactly
const formatCompact = (value) => {
 if (value == null) return '—';
 const absValue = Math.abs(value);
 const sign = value >= 0 ? '+' : '-';
 
 if (absValue >= 1e9) {
   return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
 } else if (absValue >= 1e6) {
   return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
 } else if (absValue >= 1e3) {
   return `${sign}$${(absValue / 1e3).toFixed(1)}K`;
 }
 return `${sign}$${absValue.toFixed(0)}`;
};

// Smooth animated counter for net worth
const AnimatedCounter = ({ value, duration = 1000 }) => {
 const [displayValue, setDisplayValue] = useState(value || 0);
 
 useEffect(() => {
   if (value == null) return;
   
   const startTime = Date.now();
   const startValue = displayValue;
   const endValue = value;
   const diff = endValue - startValue;
   
   const animate = () => {
     const now = Date.now();
     const progress = Math.min((now - startTime) / duration, 1);
     const easeOutQuart = 1 - Math.pow(1 - progress, 4);
     
     setDisplayValue(startValue + diff * easeOutQuart);
     
     if (progress < 1) {
       requestAnimationFrame(animate);
     } else {
       setDisplayValue(endValue);
     }
   };
   
   if (Math.abs(diff) > 0.01) {
     requestAnimationFrame(animate);
   }
 }, [value]);
 
 return formatCurrency(displayValue);
};

// Minimal period indicator
const PeriodIndicator = ({ label, value, percent, isCompact = false }) => {
 const isPositive = typeof percent === 'number' ? percent >= 0 : null;
 const hasValue = value != null || percent != null;
 
 if (!hasValue) return null;
 
 return (
   <div className={`
     flex items-center gap-1.5 px-2.5 py-1 rounded-lg
     transition-all duration-200 cursor-default
     ${isPositive === null ? 'bg-gray-900/40 text-gray-500' :
       isPositive ? 'bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400' : 
       'bg-red-950/30 hover:bg-red-950/50 text-red-400'}
   `}>
     <span className="text-[10px] font-medium text-gray-400">{label}</span>
     {isPositive !== null && (
       isPositive ? 
         <TrendingUp className="w-3 h-3" /> : 
         <TrendingDown className="w-3 h-3" />
     )}
     <span className="text-xs font-semibold tabular-nums">
       {percent != null ? `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%` : '—'}
     </span>
     {!isCompact && value != null && (
       <>
         <span className="text-gray-600">|</span>
         <span className="text-[11px] font-medium tabular-nums opacity-80">
           {formatCompact(value)}
         </span>
       </>
     )}
   </div>
 );
};

// Main component
export default function PeriodSummaryChips({ className = '' }) {
 const { summary } = usePortfolioSummary();
 const [showTooltip, setShowTooltip] = useState(false);
 const [pulseAnimation, setPulseAnimation] = useState(false);
 
 const totalValue = useMemo(() => (
   summary?.totals?.netWorth ?? summary?.netWorth ?? summary?.currentNetWorth ?? null
 ), [summary]);

 const get = useCallback((key) => summary?.periodChanges?.[key] ?? null, [summary]);

 const p1d = get('1d');
 const p1w = get('1w');
 const pytd = get('ytd');

 const dayPct = normalizePct(p1d?.netWorthPercent);
 const weekPct = normalizePct(p1w?.netWorthPercent);
 const ytdPct = normalizePct(pytd?.netWorthPercent);
 
 const isDayPositive = typeof dayPct === 'number' ? dayPct >= 0 : null;
 
 // Trigger pulse animation on significant changes
 useEffect(() => {
   if (Math.abs(dayPct || 0) > 1) {
     setPulseAnimation(true);
     const timer = setTimeout(() => setPulseAnimation(false), 2000);
     return () => clearTimeout(timer);
   }
 }, [dayPct]);

 // Determine momentum indicator
 const momentum = useMemo(() => {
   const changes = [dayPct, weekPct, ytdPct].filter(p => p != null);
   const positiveCount = changes.filter(p => p > 0).length;
   
   if (changes.length === 0) return 'neutral';
   if (positiveCount === changes.length) return 'strong-up';
   if (positiveCount === 0) return 'strong-down';
   if (positiveCount > changes.length / 2) return 'up';
   return 'down';
 }, [dayPct, weekPct, ytdPct]);

 const getMomentumColor = () => {
   switch (momentum) {
     case 'strong-up': return 'from-emerald-500/20 to-emerald-600/10';
     case 'up': return 'from-emerald-500/10 to-emerald-600/5';
     case 'strong-down': return 'from-red-500/20 to-red-600/10';
     case 'down': return 'from-red-500/10 to-red-600/5';
     default: return 'from-gray-500/10 to-gray-600/5';
   }
 };

 return (
   <div className={`flex items-center ${className}`}>
     {/* Main container with ultra-clean design */}
     <div className="flex items-center">
       {/* Net Worth Display - Hero Element */}
       <div className="relative group mr-6">
         {/* Subtle gradient background that responds to momentum */}
         <div className={`
           absolute -inset-1 bg-gradient-to-r ${getMomentumColor()} 
           rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500
           ${pulseAnimation ? 'animate-pulse' : ''}
         `} />
         
         {/* Main display */}
         <div className="relative bg-gray-950/90 backdrop-blur-md border border-gray-800/50 rounded-2xl px-5 py-3 hover:border-gray-700/50 transition-all duration-300">
           <div className="flex items-center gap-4">
             {/* Value section */}
             <div className="flex flex-col">
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-[0.15em]">
                   NET WORTH
                 </span>
                 {/* Live indicator */}
                 <div className="relative">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60"></div>
                   <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></div>
                 </div>
               </div>
               
               <div className="flex items-baseline gap-3">
                 <span className="text-2xl font-bold text-white tracking-tight tabular-nums">
                   <AnimatedCounter value={totalValue} />
                 </span>
                 
                 {/* Primary change indicator */}
                 {typeof dayPct === 'number' && (
                   <div className={`
                     flex items-center gap-1 px-2 py-0.5 rounded-md
                     ${isDayPositive ? 'bg-emerald-500/15' : 'bg-red-500/15'}
                     transition-all duration-200 hover:scale-105
                   `}>
                     {isDayPositive ? 
                       <TrendingUp className="w-3 h-3 text-emerald-400" /> : 
                       <TrendingDown className="w-3 h-3 text-red-400" />
                     }
                     <span className={`
                       text-xs font-bold tabular-nums
                       ${isDayPositive ? 'text-emerald-400' : 'text-red-400'}
                     `}>
                       {dayPct >= 0 ? '+' : ''}{dayPct.toFixed(2)}%
                     </span>
                     <span className={`
                       text-[10px] font-medium opacity-70
                       ${isDayPositive ? 'text-emerald-400' : 'text-red-400'}
                     `}>
                       TODAY
                     </span>
                   </div>
                 )}
               </div>
             </div>
             
             {/* Momentum indicator */}
             <div className="flex items-center px-3 border-l border-gray-800/50">
               <div className="relative">
                 <Zap className={`
                   w-4 h-4 transition-colors duration-500
                   ${momentum.includes('strong') ? 'text-yellow-400' :
                     momentum.includes('up') ? 'text-emerald-400' :
                     momentum.includes('down') ? 'text-red-400' : 'text-gray-500'}
                 `} />
                 {momentum.includes('strong') && (
                   <div className="absolute inset-0">
                     <Zap className="w-4 h-4 text-yellow-400/30 animate-ping" />
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       </div>

       {/* Period indicators - Clean horizontal layout */}
       <div className="flex items-center gap-2">
         <PeriodIndicator 
           label="1W" 
           value={p1w?.netWorth} 
           percent={weekPct}
           isCompact
         />
         <PeriodIndicator 
           label="YTD" 
           value={pytd?.netWorth} 
           percent={ytdPct}
           isCompact
         />
         
         {/* Total Gain/Loss - Special styling */}
         {summary?.totals && (
           <>
             <div className="w-px h-6 bg-gray-800/50 mx-1" />
             <div className={`
               flex items-center gap-2 px-3 py-1.5 rounded-lg
               bg-gradient-to-r ${
                 (summary.totals.totalGainLossAmt || 0) >= 0 
                   ? 'from-emerald-950/40 to-emerald-900/20 text-emerald-400' 
                   : 'from-red-950/40 to-red-900/20 text-red-400'
               }
               border border-gray-800/30 hover:border-gray-700/50
               transition-all duration-200 group cursor-default
             `}>
               <span className="text-[10px] font-medium text-gray-400">TOTAL</span>
               <span className="text-xs font-bold tabular-nums">
                 {formatCompact(summary.totals.totalGainLossAmt)}
               </span>
               {normalizePct(summary.totals.totalGainLossPct) != null && (
                 <>
                   <span className="text-gray-600">•</span>
                   <span className="text-[11px] font-semibold tabular-nums opacity-90">
                     {normalizePct(summary.totals.totalGainLossPct) >= 0 ? '+' : ''}
                     {normalizePct(summary.totals.totalGainLossPct)?.toFixed(2)}%
                   </span>
                 </>
               )}
             </div>
           </>
         )}
       </div>

       {/* Info tooltip trigger */}
       <div className="ml-3 relative">
         <button
           onMouseEnter={() => setShowTooltip(true)}
           onMouseLeave={() => setShowTooltip(false)}
           className="p-1.5 rounded-lg bg-gray-900/40 hover:bg-gray-800/40 transition-all duration-200"
         >
           <Info className="w-3.5 h-3.5 text-gray-500" />
         </button>
         
         {/* Tooltip */}
         {showTooltip && (
           <div className="absolute top-full right-0 mt-2 p-3 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 w-48">
             <p className="text-xs text-gray-400">
               Real-time portfolio tracking. Values update automatically as markets move.
             </p>
           </div>
         )}
       </div>
     </div>
   </div>
 );
}