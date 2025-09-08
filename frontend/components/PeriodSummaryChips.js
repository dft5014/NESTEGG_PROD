// components/PeriodSummaryChips.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Sparkle } from 'lucide-react';

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

      if (progress < 1) requestAnimationFrame(animate);
      else setDisplayValue(endValue);
    };

    if (Math.abs(diff) > 0.01) requestAnimationFrame(animate);
  }, [value]);

  return formatCurrency(displayValue);
};

// Period comparison item (now supports optional amount)
const PeriodItem = ({ label, percent, amount = null, isLarge = false }) => {
  if (percent == null) return null;

  const isPositive = percent >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={`flex items-center justify-between ${isLarge ? 'py-1' : 'py-0.5'}`}>
      <span className={`${isLarge ? 'text-xs' : 'text-[11px]'} font-medium text-gray-500`}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <Icon
          className={`${isLarge ? 'w-3.5 h-3.5' : 'w-3 h-3'} ${
            isPositive ? 'text-emerald-400' : 'text-red-400'
          }`}
        />
        <span
          className={`${isLarge ? 'text-sm' : 'text-xs'} font-semibold tabular-nums ${
            isPositive ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {isPositive ? '+' : ''}
          {percent.toFixed(2)}%
        </span>
        {typeof amount === 'number' && isFinite(amount) && (
          <span className="text-[10px] font-medium text-gray-400">
            ({formatCurrency(amount)})
          </span>
        )}
      </div>
    </div>
  );
};

export default function PeriodSummaryChips({ className = '' }) {
  const { summary } = usePortfolioSummary();
  const [isHovered, setIsHovered] = useState(false);

  const totalValue = useMemo(
    () => summary?.totals?.netWorth ?? summary?.netWorth ?? summary?.currentNetWorth ?? null,
    [summary]
  );

  const get = useCallback((key) => summary?.periodChanges?.[key] ?? null, [summary]);

  const p1d = get('1d');
  const p1w = get('1w');
  const p1m = get('1m'); // kept for potential future use
  const pytd = get('ytd');

  const dayPct = normalizePct(p1d?.netWorthPercent);
  const weekPct = normalizePct(p1w?.netWorthPercent);
  const monthPct = normalizePct(p1m?.netWorthPercent);
  const ytdPct = normalizePct(pytd?.netWorthPercent);

  const isDayPositive = typeof dayPct === 'number' ? dayPct >= 0 : null;

  // Total gain/loss
  const t = summary?.totals || {};
  const totalGainLossPct = normalizePct(
    typeof t.totalGainLossPct === 'number' ? t.totalGainLossPct : null
  );
  const totalGainLossAmt = typeof t.totalGainLossAmt === 'number' ? t.totalGainLossAmt : null;

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle background glow on hover */}
      <div
        className={`
          absolute -inset-1 bg-gradient-to-r 
          ${
            isDayPositive === null
              ? 'from-gray-500/5 to-gray-600/5'
              : isDayPositive
              ? 'from-emerald-500/5 to-emerald-600/5'
              : 'from-red-500/5 to-red-600/5'
          }
          rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700
        `}
      />

      {/* Main container */}
      <div className="relative bg-gray-950/90 backdrop-blur-sm border border-gray-800/50 rounded-xl px-4 py-2.5 hover:border-gray-700/50 transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Net Worth */}
          <div className="flex flex-col pr-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
                NET WORTH
              </span>
              <div className="relative">
                <Sparkle className="w-2.5 h-2.5 text-blue-400/60" />
                {isHovered && <Sparkle className="absolute inset-0 w-2.5 h-2.5 text-blue-400 animate-pulse" />}
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight tabular-nums">
                <AnimatedCounter value={totalValue} />
              </span>

              {/* Today badge */}
              {typeof dayPct === 'number' && (
                <div
                  className={`
                    flex items-center gap-1 px-1.5 py-0.5 rounded-md
                    ${isDayPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                  `}
                >
                  <span
                    className={`
                      text-xs font-bold tabular-nums
                      ${isDayPositive ? 'text-emerald-400' : 'text-red-400'}
                    `}
                  >
                    {dayPct >= 0 ? '+' : ''}
                    {dayPct.toFixed(2)}%
                  </span>
                  <span
                    className={`
                      text-[8px] font-medium opacity-70
                      ${isDayPositive ? 'text-emerald-400/70' : 'text-red-400/70'}
                    `}
                  >
                    TODAY
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-gray-800/30" />

          {/* Periods Grid - 2 columns: top row 1W | YTD, bottom row 1D | Gain/Loss */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-0 pl-2">
            {/* Left column: 1W over 1D */}
            <div className="flex flex-col">
              <PeriodItem label="1W" percent={weekPct} />
              <PeriodItem label="1D" percent={dayPct} />
            </div>

            {/* Right column: YTD over Gain/Loss */}
            <div className="flex flex-col">
              <PeriodItem label="YTD" percent={ytdPct} />
              {totalGainLossPct != null && (
                <PeriodItem
                  label="Gain/Loss"
                  percent={totalGainLossPct}
                  amount={totalGainLossAmt}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
