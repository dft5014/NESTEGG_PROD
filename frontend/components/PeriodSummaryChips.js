// components/PeriodSummaryChips.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const normalizePct = (v) => {
 if (typeof v !== 'number' || !isFinite(v)) return null;
 return Math.abs(v) <= 1 ? v * 100 : v;
};

// Smooth animated counter for net worth
const AnimatedCounter = ({ value, duration = 800 }) => {
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

export default function PeriodSummaryChips({ className = '' }) {
 const { summary } = usePortfolioSummary();
 const [isHovered, setIsHovered] = useState(false);
 
 const totalValue = useMemo(() => (
   summary?.totals?.netWorth ?? summary?.netWorth ?? summary?.currentNetWorth ?? null
 ), [summary]);

 const get = useCallback((key) => summary?.periodChanges?.[key] ?? null, [summary]);

 const p1d = get('1d');
 const p1w = get('1w');
 const p1m = get('1m');
 const pytd = get('ytd');

 const dayPct = normalizePct(p1d?.netWorthPercent);
 const weekPct = normalizePct(p1w?.netWorthPercent);
 const monthPct = normalizePct(p1m?.netWorthPercent);
 const ytdPct = normalizePct(pytd?.netWorthPercent);
 
 const isDayPositive = typeof dayPct === 'number' ? dayPct >= 0 : null;

 // Format percentage with color
 const formatPeriod = (label, pct) => {
   if (pct == null) return null;
   const isPositive = pct >= 0;
   const color = isPositive ? 'text-emerald-400' : 'text-red-400';
   return (
     <span className="inline-flex items-center">
       <span className="text-gray-500 text-[10px] font-medium">{label}:</span>
       <span className={`${color} text-[11px] font-semibold ml-1 tabular-nums`}>
         {isPositive ? '+' : ''}{pct.toFixed(1)}%
       </span>
     </span>
   );
 };

 return (
   <div className={`flex items-center ${className}`}>
     {/* Compact, elegant container */}
     <div 
       className="relative group"
       onMouseEnter={() => setIsHovered(true)}
       onMouseLeave={() => setIsHovered(false)}
     >
       {/* Subtle glow on hover */}
       <div className={`
         absolute -inset-1 bg-gradient-to-r 
         ${isDayPositive === null ? 'from-gray-500/10 to-gray-600/5' :
           isDayPositive ? 'from-emerald-500/10 to-emerald-600/5' : 
           'from-red-500/10 to-red-600/5'}
         rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500
       `} />
       
       {/* Main display container */}
       <div className="relative bg-gray-950/80 backdrop-blur-sm border border-gray-800/40 rounded-xl px-4 py-2.5 hover:border-gray-700/50 transition-all duration-300">
         <div className="flex items-center gap-4">
           {/* Net Worth section */}
           <div className="flex flex-col">
             <div className="flex items-center gap-2">
               <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
                 NET WORTH
               </span>
               {/* Live pulse indicator */}
               <div className="relative flex items-center">
                 <div className="w-1 h-1 rounded-full bg-emerald-400/60"></div>
                 <div className="absolute w-1 h-1 rounded-full bg-emerald-400 animate-ping"></div>
               </div>
             </div>
             
             {/* Value and today's change */}
             <div className="flex items-baseline gap-3">
               <span className="text-xl font-bold text-white tracking-tight tabular-nums">
                 <AnimatedCounter value={totalValue} />
               </span>
               
               {/* Today's change */}
               {typeof dayPct === 'number' && (
                 <div className={`
                   flex items-center gap-1.5 px-2 py-0.5 rounded-md
                   ${isDayPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}
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
                     text-[9px] font-medium opacity-70
                     ${isDayPositive ? 'text-emerald-400/70' : 'text-red-400/70'}
                   `}>
                     TODAY
                   </span>
                 </div>
               )}
             </div>
             
             {/* Period summary line - super clean */}
             <div className="flex items-center gap-3 mt-1.5 pt-1 border-t border-gray-800/30">
               {formatPeriod('1W', weekPct)}
               {weekPct != null && monthPct != null && (
                 <span className="text-gray-700">•</span>
               )}
               {formatPeriod('1M', monthPct)}
               {((weekPct != null || monthPct != null) && ytdPct != null) && (
                 <span className="text-gray-700">•</span>
               )}
               {formatPeriod('YTD', ytdPct)}
             </div>
           </div>

           {/* Activity indicator - subtle */}
           <div className={`
             p-1.5 rounded-lg transition-all duration-300
             ${isHovered ? 'bg-gray-800/40' : 'bg-gray-900/20'}
           `}>
             <Activity className={`
               w-3.5 h-3.5 transition-all duration-300
               ${isHovered ? 'text-blue-400' : 'text-gray-600'}
               ${isHovered ? 'animate-pulse' : ''}
             `} />
           </div>
         </div>
       </div>
     </div>
   </div>
 );
}