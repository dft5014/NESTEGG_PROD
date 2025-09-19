// components/PeriodSummaryChips.js
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, TrendingDown, Sparkle } from 'lucide-react';

// Normalize both decimal and percent inputs (e.g., 0.1097 or 10.97)
const toPercent = (v) =>
  typeof v === 'number' && isFinite(v) ? (Math.abs(v) <= 1.5 ? v * 100 : v) : null;

// Animated counter for net worth
const AnimatedCounter = ({ value, duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(value || 0);

  useEffect(() => {
    if (value == null) return;
    const start = Date.now();
    const s = displayValue;
    const e = value;
    const diff = e - s;

    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setDisplayValue(s + diff * ease);
      if (p < 1) requestAnimationFrame(tick);
      else setDisplayValue(e);
    };

    if (Math.abs(diff) > 0.01) requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return formatCurrency(displayValue);
};

// First finite number among candidate nested paths (e.g., 'totals.netWorth')
const firstNumber = (obj, paths = []) => {
  for (const p of paths) {
    const parts = p.split('.');
    let cur = obj;
    for (const k of parts) cur = cur?.[k];
    if (typeof cur === 'number' && isFinite(cur)) return cur;
  }
  return null;
};

// Case-insensitive period accessor with a few aliases
const getPeriod = (periodChanges, key) => {
  if (!periodChanges) return null;
  const entries = Object.entries(periodChanges);
  const found = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
  if (found) return found[1];
  const aliasMap = { '1d': ['day', 'today'], ytd: ['year', 'yeartodate'] };
  const aliases = aliasMap[key.toLowerCase()] || [];
  for (const a of aliases) {
    const hit = entries.find(([k]) => k.toLowerCase() === a.toLowerCase());
    if (hit) return hit[1];
  }
  return null;
};

// Period comparison item (supports optional amount)
const PeriodItem = ({ label, percent, amount = null, isLarge = false }) => {
  if (percent == null) return null;

  const isPositive = percent >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  const money =
    typeof amount === 'number' && isFinite(amount)
      ? `(${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatCurrency(Math.abs(amount))})`
      : null;

  return (
    <div className={`flex items-center justify-between ${isLarge ? 'py-1' : 'py-0.5'}`}>
      <span className={`${isLarge ? 'text-xs' : 'text-[11px]'} font-medium text-gray-500`}>{label}</span>
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
        {money && <span className="text-[10px] font-medium text-gray-400">{money}</span>}
      </div>
    </div>
  );
};

export default function PeriodSummaryChips({ className = '' }) {
  const { summary } = usePortfolioSummary();
  const [isHovered, setIsHovered] = useState(false);

  // Total value: try a few common shapes
  const totalValue = useMemo(
    () =>
      firstNumber(summary, [
        'totals.netWorth',
        'totals.totalNetWorth',
        'currentNetWorth',
        'netWorth',
        'totals.current_value',
      ]),
    [summary]
  );

  // Periods (robust to key case)
  const p1d = getPeriod(summary?.periodChanges, '1d');
  const p1w = getPeriod(summary?.periodChanges, '1w');
  const p1m = getPeriod(summary?.periodChanges, '1m');
  const pytd = getPeriod(summary?.periodChanges, 'ytd');

  const dayPct = toPercent(firstNumber(p1d, ['netWorthPercent', 'pct', 'percent']));
  const weekPct = toPercent(firstNumber(p1w, ['netWorthPercent', 'pct', 'percent']));
  const monthPct = toPercent(firstNumber(p1m, ['netWorthPercent', 'pct', 'percent']));
  const ytdPct = toPercent(firstNumber(pytd, ['netWorthPercent', 'pct', 'percent']));

  const isDayPositive = typeof dayPct === 'number' ? dayPct >= 0 : null;

  // --- Gain/Loss (resilient) -----------------------------------------------
  const t = summary?.totals || {};

  // Try multiple field names for pct and amount
  let totalGainLossPct = firstNumber(t, [
    'totalGainLossPct',
    'totalGainLossPercent',
    'total_unrealized_gain_percent',
    'totalUnrealizedGainPercent',
    'total_gain_loss_pct',
  ]);
  let totalGainLossAmt = firstNumber(t, [
    'totalGainLossAmt',
    'total_gain_loss',
    'totalUnrealizedGain',
    'total_unrealized_gain',
  ]);

  // Compute fallback if missing: use net worth vs cost basis/invested
  if (totalGainLossPct == null || totalGainLossAmt == null) {
    const nw =
      firstNumber(t, ['netWorth', 'totalNetWorth', 'current_value']) ??
      firstNumber(summary, ['netWorth', 'currentNetWorth']);
    const cost = firstNumber(t, ['costBasis', 'totalCostBasis', 'invested', 'total_invested', 'cost_basis']);
    if (
      typeof nw === 'number' &&
      typeof cost === 'number' &&
      isFinite(nw) &&
      isFinite(cost) &&
      cost !== 0
    ) {
      const amt = nw - cost;
      if (totalGainLossAmt == null) totalGainLossAmt = amt;
      if (totalGainLossPct == null) totalGainLossPct = (amt / cost) * 100;
    }
  }

  totalGainLossPct = toPercent(totalGainLossPct);

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle background glow on hover */}
      <div
        className={`absolute -inset-1 bg-gradient-to-r ${
          isDayPositive === null
            ? 'from-gray-500/5 to-gray-600/5'
            : isDayPositive
            ? 'from-emerald-500/5 to-emerald-600/5'
            : 'from-red-500/5 to-red-600/5'
        } rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
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
                {isHovered && (
                  <Sparkle className="absolute inset-0 w-2.5 h-2.5 text-blue-400 animate-pulse" />
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight tabular-nums">
                <AnimatedCounter value={totalValue} />
              </span>

              {/* Today badge */}
              {typeof dayPct === 'number' && (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                    isDayPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      isDayPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {dayPct >= 0 ? '+' : ''}
                    {dayPct.toFixed(2)}%
                  </span>
                  <span
                    className={`text-[8px] font-medium opacity-70 ${
                      isDayPositive ? 'text-emerald-400/70' : 'text-red-400/70'
                    }`}
                  >
                    TODAY
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-gray-800/30" />

          {/* Periods Grid - 2 columns: left 1W/1M, right YTD/Gain-Loss */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-0 pl-2">
            {/* Left column: 1W over 1M */}
            <div className="flex flex-col">
              <PeriodItem label="1W" percent={weekPct} />
              <PeriodItem label="1M" percent={monthPct} />
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
