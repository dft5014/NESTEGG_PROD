// components/PeriodSummaryChips.js
import React, { useMemo, useCallback } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';

const normalizePct = (v) => {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  // Backend may send 0.0123 for 1.23%
  return Math.abs(v) <= 1 ? v * 100 : v;
};

const Pill = ({ label, amt, pct }) => {
  const up = typeof pct === 'number' ? pct >= 0 : (typeof amt === 'number' ? amt >= 0 : null);
  const tone = up == null ? 'text-gray-300' : up ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-gray-900/70 border border-gray-800 px-2 py-0.5">
      <span className="text-[10px] leading-none text-gray-400">{label}</span>
      <span className={`text-xs leading-none tabular-nums ${tone}`}>
        {typeof amt === 'number' ? `${amt >= 0 ? '+' : ''}${formatCurrency(Math.abs(amt)).replace('$','')}` : '—'}
      </span>
      <span className="text-gray-600 text-[10px] leading-none">/</span>
      <span className={`text-xs leading-none tabular-nums ${tone}`}>
        {typeof pct === 'number' ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
      </span>
    </div>
  );
};

export default function PeriodSummaryChips({ className = '' }) {
  const { summary } = usePortfolioSummary();

  const totalValue = useMemo(() => (
    summary?.totals?.netWorth ?? summary?.netWorth ?? summary?.currentNetWorth ?? null
  ), [summary]);

  const get = useCallback((key) => summary?.periodChanges?.[key] ?? null, [summary]);

  const p1d  = get('1d');
  const p1w  = get('1w');
  const pytd = get('ytd');

  const chips = [
    { label: '1D',  amt: p1d?.netWorth,  pct: normalizePct(p1d?.netWorthPercent) },
    { label: '1W',  amt: p1w?.netWorth,  pct: normalizePct(p1w?.netWorthPercent) },
    { label: 'YTD', amt: pytd?.netWorth, pct: normalizePct(pytd?.netWorthPercent) },
  ];

  const t = summary?.totals || {};
  const gainLossAmt = typeof t.totalGainLossAmt === 'number' ? t.totalGainLossAmt : null;
  const gainLossPct = normalizePct(typeof t.totalGainLossPct === 'number' ? t.totalGainLossPct : null);

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <div className="flex items-baseline gap-2 rounded-lg bg-gray-900/80 border border-gray-800 px-3 py-1.5">
        <span className="text-[11px] text-gray-400 leading-none">Total</span>
        <span className="font-semibold text-sm sm:text-base text-gray-100 tabular-nums leading-none">
          {totalValue != null ? formatCurrency(totalValue) : '—'}
        </span>
      </div>
      {chips.map(p => (
        <Pill key={p.label} label={p.label} amt={p.amt} pct={p.pct} />
      ))}
      <Pill label="Gain/Loss" amt={gainLossAmt} pct={gainLossPct} />
    </div>
  );
}
