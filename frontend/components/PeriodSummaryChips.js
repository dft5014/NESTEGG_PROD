// components/PeriodSummaryChips.js
import React, { useMemo, useCallback } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';

const normalizePct = (v) => {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  // Backend may send 0.0123 for 1.23%
  return Math.abs(v) <= 1 ? v * 100 : v;
};

const StatPill = ({ label, amt, pct }) => {
  const up = typeof pct === 'number' ? pct >= 0 : (typeof amt === 'number' ? amt >= 0 : null);
  const tone = up == null ? 'text-gray-300' : up ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="rounded-md bg-gray-900/75 border border-gray-800 px-2.5 py-1.5 flex flex-col gap-0.5 min-w-[112px]">
      <div className="text-[10px] text-gray-400 leading-none">{label}</div>
      <div className={`text-xs tabular-nums ${tone}`}>
        {typeof amt === 'number'
          ? `${amt >= 0 ? '+' : ''}${formatCurrency(Math.abs(amt)).replace('$','')}`
          : '—'}
      </div>
      <div className={`text-[11px] tabular-nums ${tone}`}>
        {typeof pct === 'number'
          ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
          : '—'}
      </div>
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

  const oneDay = { label: '1D',  amt: p1d?.netWorth,  pct: normalizePct(p1d?.netWorthPercent) };
  const oneWk  = { label: '1W',  amt: p1w?.netWorth,  pct: normalizePct(p1w?.netWorthPercent) };
  const ytd    = { label: 'YTD', amt: pytd?.netWorth, pct: normalizePct(pytd?.netWorthPercent) };

  const t = summary?.totals || {};
  const gainLossAmt = typeof t.totalGainLossAmt === 'number' ? t.totalGainLossAmt : null;
  const gainLossPct = normalizePct(typeof t.totalGainLossPct === 'number' ? t.totalGainLossPct : null);

  return (
    <div className={`flex items-center gap-2 sm:gap-3 flex-wrap ${className}`}>
      {/* Total capsule */}
      <div className="rounded-lg bg-gray-900/85 border border-gray-800 px-3 py-2 flex items-baseline gap-2">
        <span className="text-[11px] text-gray-400 leading-none">Total</span>
        <span className="font-semibold text-sm sm:text-base text-gray-100 tabular-nums leading-none">
          {totalValue != null ? formatCurrency(totalValue) : '—'}
        </span>
      </div>

      {/* 2×2 grid: 1D over 1W, YTD over Gain/Loss */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col gap-2 sm:gap-3">
          <StatPill {...oneDay} />
          <StatPill {...oneWk} />
        </div>
        <div className="flex flex-col gap-2 sm:gap-3">
          <StatPill {...ytd} />
          <StatPill label="Gain/Loss" amt={gainLossAmt} pct={gainLossPct} />
        </div>
      </div>
    </div>
  );
}
