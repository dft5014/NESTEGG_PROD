// components/PeriodSummaryChips.js
import React, { useMemo, useCallback } from 'react';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency } from '@/utils/formatters';

const normalizePct = (v) => {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return Math.abs(v) <= 1 ? v * 100 : v;
};

const PeriodChip = ({ label, amt, pct }) => {
  const up = typeof pct === 'number' ? pct >= 0 : (typeof amt === 'number' ? amt >= 0 : null);
  const color = up == null ? 'text-gray-300' : (up ? 'text-green-400' : 'text-red-400');

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded">
      <span className="text-gray-400">{label}:</span>
      <span className={`font-medium ${color}`}>
        {typeof amt === 'number'
          ? `${amt >= 0 ? '+' : ''}${formatCurrency(Math.abs(amt)).replace('$','')}`
          : '—'}
      </span>
      <span className="text-gray-500">/</span>
      <span className={`font-medium ${color}`}>
        {typeof pct === 'number' ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
      </span>
    </div>
  );
};

export default function PeriodSummaryChips({ className = '' }) {
  const { summary } = usePortfolioSummary();

  const getPeriod = useCallback((key) => summary?.periodChanges?.[key] ?? null, [summary]);

  const totalValue = useMemo(() => {
    return (
      summary?.totals?.netWorth ??
      summary?.netWorth ??
      summary?.currentNetWorth ??
      null
    );
  }, [summary]);

  const d1 = getPeriod('1d');
  const w1 = getPeriod('1w');
  const ytd = getPeriod('ytd');

  const chips = [
    {
      label: '1D',
      amt: typeof d1?.netWorth === 'number' ? d1.netWorth : null,
      pct: normalizePct(typeof d1?.netWorthPercent === 'number' ? d1.netWorthPercent : null),
    },
    {
      label: '1W',
      amt: typeof w1?.netWorth === 'number' ? w1.netWorth : null,
      pct: normalizePct(typeof w1?.netWorthPercent === 'number' ? w1.netWorthPercent : null),
    },
    {
      label: 'YTD',
      amt: typeof ytd?.netWorth === 'number' ? ytd.netWorth : null,
      pct: normalizePct(typeof ytd?.netWorthPercent === 'number' ? ytd.netWorthPercent : null),
    },
  ];

  const totals = summary?.totals || {};
  const gainLossAmt = typeof totals.totalGainLossAmt === 'number' ? totals.totalGainLossAmt : null;
  const gainLossPctRaw = typeof totals.totalGainLossPct === 'number' ? totals.totalGainLossPct : null;
  const gainLossPct = normalizePct(gainLossPctRaw);

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded">
        <span className="text-gray-400">Total Value:</span>
        <span className="font-semibold text-gray-200">{totalValue != null ? formatCurrency(totalValue) : '—'}</span>
      </div>

      {chips.map((c) => (
        <PeriodChip key={c.label} label={c.label} amt={c.amt} pct={c.pct} />
      ))}

      <PeriodChip label="Gain/Loss" amt={gainLossAmt} pct={gainLossPct} />
    </div>
  );
}
