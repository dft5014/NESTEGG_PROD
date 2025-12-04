// pages/portfolio.js
import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart as RechartsPieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  RefreshCw, DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp,
  Wallet, Gift, Droplet, Shield, Home, Building2, BarChart3,
  Banknote, Coins, Package, MinusCircle, Layers, Gauge, Activity, PieChart as PieChartIcon,
  Expand, X, Plus, BookOpen, Sparkles
} from 'lucide-react';

import { useDataStore } from '@/store/DataStore';
import { usePortfolioSummary, usePortfolioTrends, useAccounts } from '@/store/hooks';
import QuickStartModalV2 from '@/components/modals/quickstart/QuickStartModalV2';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const timeframeOptions = [
  { id: '1w', label: '1W' }, { id: '1m', label: '1M' }, { id: '3m', label: '3M' },
  { id: '6m', label: '6M' }, { id: 'ytd', label: 'YTD' }, { id: '1y', label: '1Y' }, { id: 'all', label: 'All' },
];

// Secondary performance rail options (metric selector)
const metricOptions = [
  { id: 'altLiquidNetWorth', label: 'Liquid (Non-Retirement)' },
  { id: 'altRetirementAssets', label: 'Retirement Assets' },
  { id: 'altIlliquidNetWorth', label: 'Illiquid Net Worth' },
  { id: 'totalAssets', label: 'Total Assets' },
];

const assetColors = {
  securities: '#4f46e5', security: '#4f46e5',
  cash: '#10b981', crypto: '#8b5cf6', bond: '#ec4899',
  metal: '#f59e0b', metals: '#f59e0b', currency: '#3b82f6',
  real_estate: '#14b8a6', other: '#6b7280', other_assets: '#6b7280',
};

const sectorColors = {
  Technology: '#6366f1', 'Financial Services': '#0ea5e9', Healthcare: '#10b981',
  'Consumer Cyclical': '#f59e0b', 'Communication Services': '#8b5cf6', Industrials: '#64748b',
  'Consumer Defensive': '#14b8a6', Energy: '#f97316', 'Basic Materials': '#f43f5e',
  'Real Estate': '#84cc16', Utilities: '#0284c7', Unknown: '#9ca3af', Other: '#9ca3af',
};

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
const formatCurrency = (value, inThousands = false) => {
  if (value === null || value === undefined) return '—';
  const v = Number(value) || 0;
  if (inThousands) {
    return `$${(v / 1_000).toLocaleString('en-US', {
      minimumFractionDigits: 1, maximumFractionDigits: 1,
    })}k`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
};

const formatPct = (v, sign = true, digits = 2) => {
  if (v === null || v === undefined || isNaN(v)) return '0%';
  const val = Number(v);
  return `${sign && val > 0 ? '+' : ''}${val.toFixed(digits)}%`;
};

const axisMoney = (v) => {
  v = Number(v) || 0;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toLocaleString()}`;
};

// -----------------------------------------------------------------------------
// Period helpers (generic, work for any metric key present in chartData rows)
// -----------------------------------------------------------------------------
const periodWindowDays = { '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365 };

function sliceForPeriod(chartRows, id) {
  if (!chartRows?.length) return [];
  if (id === '1d') return chartRows.slice(-2);
  if (id === 'ytd') return chartRows; // assume chartData already filtered to YTD elsewhere as needed
  if (id === 'all') return chartRows;
  const n = periodWindowDays[id] || 30;
  return chartRows.slice(-n);
}

function computeChangeFor(rows, key) {
  if (!rows?.length) return { value: 0, delta: 0, deltaPct: 0 };
  const first = Number(rows[0]?.[key] ?? 0);
  const last  = Number(rows[rows.length - 1]?.[key] ?? 0);
  const delta = last - first;
  const deltaPct = first !== 0 ? delta / first : 0;
  return { value: last, delta, deltaPct };
}


// Percent normalizer: convert to number, treat value as fraction directly
// (e.g., 0.3 = 30%, 7.65 = 765%)
const toFrac = (x) => {
  return Number(x ?? 0);
};

// Prefer store-provided deltas when available (like we do on the navbar)
function getStoreDelta(metricId, periodId, summary) {
  if (!summary) return null;

  // periodChanges (1d/1w/1m/1y/etc) covers totalAssets
  const pc = summary.periodChanges?.[periodId];
  if (metricId === 'totalAssets' && pc) {
    return { delta: pc.totalAssets ?? 0, deltaPct: toFrac(pc.totalAssetsPercent) };
  }

  // The "alt*" components have YTD deltas on the summary
  if (periodId === 'ytd') {
    const ytdMap = {
      altLiquidNetWorth:   ['altLiquidNetWorthYTDChange',   'altLiquidNetWorthYTDChangePercent', 'altLiquidNetWorthYTDPercent'],
      altRetirementAssets: ['altRetirementAssetsYTDChange', 'altRetirementAssetsYTDChangePercent', 'altRetirementAssetsYTDPercent'],
      altIlliquidNetWorth: ['altIlliquidNetWorthYTDChange', 'altIlliquidNetWorthYTDChangePercent', 'altIlliquidNetWorthYTDPercent'],
    };
    const keys = ytdMap[metricId];
    if (keys) {
      const [amtKey, pctKey1, pctKey2] = keys;
      const amt = summary[amtKey] ?? 0;
      const pct = summary[pctKey1] ?? summary[pctKey2] ?? 0;
      return { delta: amt, deltaPct: toFrac(pct) };
    }
  }

  return null; // fallback to compute from chart
}



// -----------------------------------------------------------------------------
// Tiny Primitives
// -----------------------------------------------------------------------------
const Section = ({ title, icon, right, children }) => (
  <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Delta = ({ value, className = '' }) => {
  if (value === null || value === undefined) return <span className={`text-gray-400 ${className}`}>—</span>;
  const up = value > 0, down = value < 0;
  return (
    <span className={`inline-flex items-center text-sm font-medium ${up ? 'text-emerald-400' : down ? 'text-rose-400' : 'text-gray-400'} ${className}`}>
      {up && <ArrowUpRight className="h-4 w-4 mr-1" />}
      {down && <ArrowDownRight className="h-4 w-4 mr-1" />}
      {formatPct(value * 100)}
    </span>
  );
};

const TimeframeSelector = ({ selected, onChange }) => (
  <div className="flex p-1 bg-gray-800 rounded-xl">
    {timeframeOptions.map((t) => (
      <motion.button
        key={t.id}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onChange(t.id)}
        className={`px-3 py-1.5 text-sm rounded-lg ${selected === t.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700/60'}`}
      >
        {t.label}
      </motion.button>
    ))}
  </div>
);

const FullscreenModal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-4 md:inset-10 rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl flex flex-col">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <h4 className="text-base font-semibold">{title}</h4>
          <button aria-label="Close" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 p-4 overflow-hidden">{children}</div>
      </div>
    </div>
  );
};

const Sparkline = ({ data, dataKey = 'value' }) => (
  <div className="h-10 w-28">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis hide />
        <Area type="monotone" dataKey={dataKey} stroke="#6366f1" strokeWidth={2} fill="url(#sp)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

function Bar({ label, value = 0, total = 0, color = '#6366f1' }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-100">{formatCurrency(value)}</span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded">
        <div className="h-2 rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------
export default function Portfolio() {
  // initialize global store (fetches/syncs)
  useDataStore();

  const [timeframe, setTimeframe] = useState('1m');
  const [showInThousands, setShowInThousands] = useState(true);

  // Secondary performance rail: which metric are we evaluating?
  const [perfMetric, setPerfMetric] = useState('altLiquidNetWorth');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAssetKey, setModalAssetKey] = useState(null);
  const [cashflowOpen, setCashflowOpen] = useState(false);

  // Welcome banner state
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(false);

  const {
    summary,
    topPositions,
    topPerformersAmount,
    topPerformersPercent,
    assetPerformance,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    riskMetrics,
    concentrationMetrics,
    dividendMetrics,
    netCashBasisMetrics,
    history,
    loading: isLoading,
    error,
    refresh: refreshData,
    lastFetched,
    isStale,
  } = usePortfolioSummary();

  const { trends } = usePortfolioTrends();
  const { accounts } = useAccounts();

  // Determine if user is new (no accounts/data)
  const hasAccounts = accounts && accounts.length > 0;
  const hasData = summary && (summary.totalAssets > 0 || summary.netWorth !== 0);
  const isNewUser = !hasAccounts && !hasData;

  // Timeseries ------------------------------------------------------------------
  const chartData = useMemo(() => {
    if (!trends?.chartData?.length) return [];
    return trends.chartData.map((d) => ({
      isoDate: d.date,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: d.netWorth,
      totalAssets: d.totalAssets,
      totalLiabilities: d.totalLiabilities,
      costBasis: summary?.totalCostBasis || 0,
      altLiquidNetWorth: d.altLiquidNetWorth || 0,
      altRetirementAssets: d.altRetirementAssets || 0,
      altIlliquidNetWorth: d.altIlliquidNetWorth || 0,
    }));
  }, [trends?.chartData, summary?.totalCostBasis]);

  const slicedChart = useMemo(() => {
    if (!chartData.length) return [];
    if (timeframe === 'ytd') {
      const jan1 = new Date(new Date().getFullYear(), 0, 1);
      return chartData.filter(r => {
        const d = new Date(r.isoDate);
        // r.date is "MMM D" right now; if needed, keep original ISO date in chartData too
        return !isNaN(d) ? d >= jan1 : true;
      });
    }
    if (timeframe === 'all') return chartData;
    const n = periodWindowDays[timeframe] || 30;
    return chartData.slice(-n);
  }, [chartData, timeframe]);

  const cashFlowTrendData = useMemo(() => {
    if (!history?.length) return [];
    const rows = history
      .filter((h) => h?.net_cash_basis_metrics?.net_cash_position !== undefined && h?.net_cash_basis_metrics?.net_cash_position !== null)
      .map((h) => {
        const dateStr = h.date || h.snapshot_date;
        const dt = new Date(dateStr);
        return {
          date: dateStr,
          displayDate: !isNaN(dt.getTime()) ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : dateStr,
          netCashPosition: h.net_cash_basis_metrics.net_cash_position
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return rows;
  }, [history]);

  // Map optional timeseries by class for invested-amount modal
  const byClassTS = useMemo(() => {
    const ts = assetPerformance?.timeseries_by_class || {};
    return {
      securities: ts.security || ts.securities || null,
      crypto: ts.crypto || null,
      metals: ts.metal || ts.metals || null,
      otherAssets: ts.other_assets || null,
      cash: ts.cash || null,
    };
  }, [assetPerformance?.timeseries_by_class]);

  // Derived tables --------------------------------------------------------------
  const netWorthMixData = useMemo(() => {
    if (!summary) return [];
    const allRows = [
      { key: 'securities', name: 'Securities', value: summary.assetAllocation.securities.value, pct: (summary.netWorthMix.securities || 0) * 100, color: assetColors.securities },
      { key: 'netCash', name: 'Net Cash', value: summary.altNetWorth.netCash, pct: (summary.netWorthMix.netCash || 0) * 100, color: assetColors.cash },
      { key: 'crypto', name: 'Crypto', value: summary.assetAllocation.crypto.value, pct: (summary.netWorthMix.crypto || 0) * 100, color: assetColors.crypto },
      { key: 'metals', name: 'Metals', value: summary.assetAllocation.metals.value, pct: (summary.netWorthMix.metals || 0) * 100, color: assetColors.metals },
      { key: 'realEstate', name: 'Real Estate', value: summary.altNetWorth.realEstate, pct: (summary.netWorthMix.realEstateEquity || 0) * 100, color: assetColors.real_estate },
      { key: 'other', name: 'Other', value: summary.altNetWorth.netOtherAssets, pct: (summary.netWorthMix.netOtherAssets || 0) * 100, color: assetColors.other },
    ];

    // Always show Real Estate and Other (even if 0) to display liabilities breakdown
    // Filter out other categories only if they have no value
    return allRows.filter((x) => {
      if (x.key === 'realEstate' || x.key === 'other') {
        return true; // Always show these rows
      }
      return (x.value || 0) > 0 || (x.pct || 0) > 0;
    });
  }, [summary]);

  const sectorAllocationData = useMemo(() => {
    if (!rawSectorAllocation) return [];
    return Object.entries(rawSectorAllocation)
      .filter(([, d]) => d?.value > 0)
      .map(([name, d]) => ({ name: name || 'Unknown', value: d.value, percentage: (d.percentage || 0) * 100, positionCount: d.position_count || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [rawSectorAllocation]);

  const institutionMixData = useMemo(() => {
    if (!rawInstitutionAllocation?.length) return [];
    return rawInstitutionAllocation
      .filter((r) => r?.value > 0)
      .map((inst) => ({ name: inst.institution, value: inst.value, percentage: inst.percentage || 0, accountCount: inst.account_count || 0, positionCount: inst.position_count || 0, color: inst.primary_color || '#6B7280' }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rawInstitutionAllocation]);

  const topPositionsData = useMemo(() => {
    if (!topPositions?.length) return [];
    return topPositions.slice(0, 5).map((p) => ({
      name: p.name || p.identifier,
      value: p.current_value || p.value,
      gainLossPercent: p.gain_loss_percent || 0,
      accountName: p.account_name,
      assetType: p.asset_type || 'security',
    }));
  }, [topPositions]);

  

  // Loading / Error -------------------------------------------------------------
  if (isLoading && !summary) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-gray-900 to-gray-950">
        <div className="flex flex-col items-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
          <p className="mt-4 text-gray-300">Loading your dashboard…</p>
        </div>
      </div>
    );
  }
  if (error && !summary) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-gray-900 to-gray-950 p-4">
        <div className="max-w-md text-center">
          <div className="text-rose-400 mb-3">⚠️</div>
          <h1 className="text-xl font-semibold mb-2">Unable to load</h1>
          <p className="text-gray-300 mb-4">{String(error)}</p>
          <button onClick={refreshData} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  // Shorthands ------------------------------------------------------------------
  const totalAssets = summary?.totalAssets || 0;
  const totalLiabilities = summary?.liabilities?.total || 0;
  const netWorth = summary?.netWorth || 0;
  const unrealizedGain = summary?.unrealizedGain || 0;
  const unrealizedGainPct = summary?.unrealizedGainPercent || 0;
  const annualIncome = summary?.income?.annual || 0;
  const yieldPct = summary?.income?.yield || 0;
  const liquidAssets = summary?.liquidAssets || 0;
  const otherAssets = summary?.otherAssets || 0;
  const periodChanges = summary?.periodChanges || {};

  // Tooltips --------------------------------------------------------------------
  const NetWorthTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const assets = payload.find((p) => p.dataKey === 'totalAssets')?.value ?? null;
    const liabs = payload.find((p) => p.dataKey === 'totalLiabilities')?.value ?? null;
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-indigo-300 mt-1">Net Worth: {formatCurrency(payload[0].value)}</p>
        {assets !== null && <p className="text-emerald-400">Assets: {formatCurrency(assets)}</p>}
        {liabs !== null && liabs > 0 && <p className="text-rose-400">Liabilities: {formatCurrency(liabs)}</p>}
      </div>
    );
  };

  const ComponentsTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const labelMap = { altLiquidNetWorth: 'Liquid Net Worth', altRetirementAssets: 'Retirement Assets', altIlliquidNetWorth: 'Illiquid Net Worth' };
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((e, i) => (
          <div key={i} className="flex justify-between gap-6">
            <span className="text-gray-300">{labelMap[e.dataKey] || e.dataKey}</span>
            <span>{formatCurrency(e.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const AllocationTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const detail = computeMixBreakdown(summary, d.key);
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
        <p className="font-medium">{d.name}</p>
        <p className="text-indigo-300">{(d.pct || 0).toFixed(1)}% of net worth</p>
        <div className="mt-2 space-y-1">
          <Row label="Net" value={formatCurrency(d.value)} />
          {detail && (
            <>
              <Row label="Assets" value={formatCurrency(detail.assets)} />
              <Row label="Liabilities" value={formatCurrency(detail.liabilities)} />
            </>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white">
      <Head>
        <title>NestEgg | Portfolio</title>
        <meta name="description" content="Your financial command center" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Last updated: {lastFetched ? new Date(lastFetched).toLocaleString() : '—'}</span>
              {isStale && <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">Data may be stale</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile dropdown */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="sm:hidden text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select timeframe"
            >
              {timeframeOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            {/* Desktop buttons */}
            <div className="hidden sm:block"><TimeframeSelector selected={timeframe} onChange={setTimeframe} /></div>
            <button
              aria-label="Refresh"
              onClick={refreshData}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 transition ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Welcome Banner for New Users */}
        {isNewUser && !welcomeBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-indigo-900/50 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/20 rounded-xl">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Welcome to NestEgg</h2>
                </div>
                <p className="text-gray-300 text-sm md:text-base max-w-2xl">
                  Your personal financial command center is ready. Start by adding your accounts and positions to see your complete financial picture, track performance, and gain insights into your wealth.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setShowQuickStart(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl text-white font-medium transition-all shadow-lg shadow-indigo-500/25"
                >
                  <Plus className="w-4 h-4" />
                  Get Started
                </button>
                <Link
                  href="/tutorial"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700 rounded-xl text-gray-300 hover:text-white font-medium transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Tutorial
                </Link>
                <button
                  onClick={() => setWelcomeBannerDismissed(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick tips */}
            <div className="relative z-10 mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">1</div>
                  <span>Add your accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">2</div>
                  <span>Enter your positions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">3</div>
                  <span>Or import from a statement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">4</div>
                  <span>Track your wealth over time</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* QuickStart Modal */}
        <QuickStartModalV2
          isOpen={showQuickStart}
          onClose={() => setShowQuickStart(false)}
          onSuccess={() => {
            setShowQuickStart(false);
            setWelcomeBannerDismissed(true);
            refreshData();
          }}
        />

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <KPI label="Net Worth" value={formatCurrency(netWorth)} delta={<Delta value={toFrac(periodChanges?.['1d']?.netWorthPercent)} className="mt-1" />} icon={<DollarSign className="h-5 w-5" />} />
          <KPI label="Total Assets" value={formatCurrency(totalAssets)} delta={<span className="text-xs text-gray-400 mt-1 block">{formatCurrency(liquidAssets)} liquid</span>} icon={<Wallet className="h-5 w-5" />} />
          <KPI label="Unrealized Gain" value={formatCurrency(unrealizedGain)} delta={<Delta value={unrealizedGainPct} className="mt-1" />} icon={<TrendingUp className="h-5 w-5" />} />
          <KPI label="Annual Income" value={formatCurrency(annualIncome)} delta={<span className="text-xs text-amber-300 mt-1 block">{formatPct((yieldPct || 0) * 100)} yield</span>} icon={<Gift className="h-5 w-5" />} />
        </div>

        {/* Performance Over Time KPIs (rail) — NET WORTH */}
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-gray-400">Performance — <span className="text-gray-200 font-medium">Net Worth</span></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { id: '1d', label: '1 Day' },
            { id: '1w', label: '1 Week' },
            { id: '1m', label: '1 Month' },
            { id: 'ytd', label: 'YTD' },
            { id: '1y', label: '1 Year' },
          ].map(({ id, label }) => {
            const mini = sliceForPeriod(chartData, id);
            // existing summary.periodChanges keeps netWorth deltas
            const p = periodChanges?.[id] || {};
            return (
              <motion.div key={id} whileHover={{ y: -2 }} className="bg-gray-900/70 border border-gray-800 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold">{formatCurrency(p?.netWorth || 0)}</p>
                  <Delta value={toFrac(p?.netWorthPercent)} />
                </div>
                <Sparkline data={mini} dataKey="value" />
              </motion.div>
            );
          })}
        </div>

        {/* Performance Over Time KPIs (rail) — SECONDARY METRIC (dropdown) */}
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Performance — <span className="text-gray-200 font-medium">
              {metricOptions.find(m => m.id === perfMetric)?.label || 'Metric'}
            </span>
          </div>
          <div className="relative">
            <select
              value={perfMetric}
              onChange={(e) => setPerfMetric(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select performance metric"
            >
              {metricOptions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { id: '1d', label: '1 Day' },
            { id: '1w', label: '1 Week' },
            { id: '1m', label: '1 Month' },
            { id: 'ytd', label: 'YTD' },
            { id: '1y', label: '1 Year' },
          ].map(({ id, label }) => {
            const mini = sliceForPeriod(chartData, id);

            // 1) Try store-provided delta (for YTD alt-metrics or any period for total assets)
            const storeDelta = getStoreDelta(perfMetric, id, summary);

            // 2) Otherwise compute from the timeseries for the period
            let deltaAmt = 0;
            let deltaPct = 0;
            if (storeDelta) {
              deltaAmt = storeDelta.delta || 0;
              deltaPct = storeDelta.deltaPct || 0;
            } else {
              const computed = computeChangeFor(
                mini.map(r => ({ ...r, _v: Number(r?.[perfMetric] ?? 0) })),
                '_v'
              );
              deltaAmt = computed.delta;
              deltaPct = computed.deltaPct;
            }

            return (
              <motion.div key={id} whileHover={{ y: -2 }} className="bg-gray-900/70 border border-gray-800 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  {/* Show CHANGE (Δ) instead of ending absolute value */}
                  <p className="text-sm font-semibold">{formatCurrency(deltaAmt)}</p>
                  <Delta value={deltaPct} />
                </div>
                <Sparkline
                  data={mini.map(r => ({ date: r.date, value: Number(r?.[perfMetric] ?? 0) }))}
                  dataKey="value"
                />
              </motion.div>
            );
          })}
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Charts & Deep Metrics */}
          <div className="lg:col-span-8 space-y-6">
            <Section title="Trended Net Worth" icon={<BarChart3 className="h-5 w-5 text-indigo-300" />} right={<span className="text-sm text-gray-400">{timeframe.toUpperCase()}</span>}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={slicedChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                    <Tooltip content={<NetWorthTooltip />} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#nw)" activeDot={{ r: 5 }} />
                    <ReferenceLine y={slicedChart?.[0]?.value || 0} stroke="#334155" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Net Worth Components" icon={<Layers className="h-5 w-5 text-indigo-300" />}
              right={<LegendDots items={[['#3b82f6', 'Liquid'], ['#10b981', 'Retirement'], ['#8b5cf6', 'Illiquid']]} />}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={slicedChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                    <Tooltip content={<ComponentsTooltip />} />
                    <Line type="monotone" dataKey="altLiquidNetWorth" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="altRetirementAssets" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="altIlliquidNetWorth" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>

            {/* Asset Value vs Cost Basis */}
            <Section title="Asset Value & Cost Basis" icon={<BarChart3 className="h-5 w-5 text-indigo-300" />}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={slicedChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="av" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="cb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const assetValue = payload.find((p) => p.dataKey === 'totalAssets')?.value || 0;
                      const costBasis = payload.find((p) => p.dataKey === 'costBasis')?.value || 0;
                      const unrealized = assetValue - costBasis;
                      const pct = costBasis > 0 ? (unrealized / costBasis) * 100 : 0;
                      return (
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
                          <p className="font-medium mb-1">{label}</p>
                          <p className="text-indigo-300">Asset Value: {formatCurrency(assetValue)}</p>
                          <p className="text-emerald-300">Cost Basis: {formatCurrency(costBasis)}</p>
                          <p className={`${unrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Unrealized: {formatCurrency(unrealized)} ({formatPct(pct)})</p>
                        </div>
                      );
                    }} />
                    <Area type="monotone" dataKey="totalAssets" stroke="#6366f1" strokeWidth={2} fill="url(#av)" />
                    <Area type="monotone" dataKey="costBasis" stroke="#10b981" strokeWidth={2} fill="url(#cb)" strokeDasharray="5 5" />
                    <ReferenceLine y={slicedChart?.[0]?.totalAssets || 0} stroke="#334155" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center"><p className="text-xs text-gray-400">Current Assets</p><p className="text-lg font-semibold">{formatCurrency(totalAssets)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-400">Total Cost Basis</p><p className="text-lg font-semibold">{formatCurrency(summary?.totalCostBasis || 0)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-400">Unrealized Gain</p><p className={`text-lg font-semibold ${unrealizedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(unrealizedGain)} <span className="text-xs">({formatPct((unrealizedGainPct || 0) * 100)})</span></p></div>
              </div>
            </Section>

            {/* Asset Allocation cards */}
            <Section title="Asset Allocation" icon={<PieChartIcon className="h-5 w-5 text-indigo-300" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AssetClassCard
                  type="security"
                  data={{ ...summary?.assetAllocation?.securities, name: 'Securities', ...assetPerformance?.security }}
                  icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
                />
                <AssetClassCard type="cash" data={{ ...summary?.assetAllocation?.cash, name: 'Cash' }} icon={<Banknote className="h-5 w-5 text-emerald-400" />} />
                <AssetClassCard type="crypto" data={{ ...summary?.assetAllocation?.crypto, name: 'Crypto', ...assetPerformance?.crypto }} icon={<Coins className="h-5 w-5 text-purple-400" />} />
                <AssetClassCard type="metal" data={{ ...summary?.assetAllocation?.metals, name: 'Metals', ...assetPerformance?.metal }} icon={<Package className="h-5 w-5 text-amber-400" />} />
                <AssetClassCard type="other" data={{ ...summary?.assetAllocation?.otherAssets, name: 'Other Assets', ...assetPerformance?.other_assets }} icon={<Home className="h-5 w-5 text-slate-300" />} />
                {(summary?.liabilities?.total || 0) > 0 && (
                  <AssetClassCard type="liability" data={{ value: summary?.liabilities?.total, count: summary?.liabilities?.counts?.total, name: 'Total Liabilities' }} icon={<MinusCircle className="h-5 w-5 text-rose-400" />} />
                )}
              </div>
            </Section>

            {/* Portfolio Insights */}
            {(riskMetrics || concentrationMetrics || summary?.positionStats) && (
              <Section title="Portfolio Insights" icon={<Shield className="h-5 w-5 text-indigo-300" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2"><Gauge className="h-4 w-4 text-yellow-400" /><span className="text-sm font-medium">Concentration</span></div>
                    <div className="space-y-1 text-sm">
                      <Row label="Top 5 Positions" value={formatPct(((concentrationMetrics?.top_5_concentration) || 0) * 100)} />
                      <Row label="Largest Position" value={formatPct(((concentrationMetrics?.largest_position_weight) || 0) * 100)} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-indigo-400" /><span className="text-sm font-medium">Risk</span></div>
                    <div className="space-y-1 text-sm">
                      <Row label="Portfolio Beta" value={(riskMetrics?.portfolio_beta ?? 1).toFixed(2)} />
                      <Row label="Est. Volatility" value={formatPct(((riskMetrics?.volatility_estimate) || 0) * 100)} />
                      {typeof riskMetrics?.liquidity_ratio === 'number' && <Row label="Liquidity Ratio" value={formatPct(((riskMetrics?.liquidity_ratio) || 0) * 100)} />}
                    </div>
                  </div>
                  {summary?.positionStats && (
                    <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 md:col-span-2">
                      <div className="flex items-center gap-2 mb-2"><Layers className="h-4 w-4 text-indigo-400" /><span className="text-sm font-medium">Positions & Accounts</span></div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <Row label="Total Positions" value={`${summary?.positionStats?.totalCount ?? '—'}`} />
                        <Row label="Active Accounts" value={`${summary?.positionStats?.activeAccountCount ?? '—'}`} />
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Income / Dividends */}
            {(dividendMetrics && annualIncome > 0) && (
              <Section title="Income Analysis" icon={<Gift className="h-5 w-5 text-amber-300" />}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <Row label="Annual Income" value={formatCurrency(annualIncome)} />
                  <Row label="Quarterly Income" value={formatCurrency(dividendMetrics?.quarterly_income || 0)} />
                  <Row label="Dividend Yield" value={formatPct((yieldPct || 0) * 100)} />
                  <Row label="Income Positions" value={`${dividendMetrics?.dividend_count ?? 0}`} />
                </div>
              </Section>
            )}
          </div>

          {/* RIGHT: Mix, Tables & Lists */}
          <div className="lg:col-span-4 space-y-6">
            {/* NET WORTH MIX with donut + table */}
            <Section
              title="Net Worth Mix"
              icon={<PieChartIcon className="h-5 w-5 text-indigo-300" />}
              right={
                <button onClick={() => setShowInThousands((s) => !s)} className="text-xs px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">
                  {showInThousands ? 'Show $' : 'Show k'}
                </button>
              }>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={netWorthMixData} cx="50%" cy="50%" innerRadius={56} outerRadius={82} paddingAngle={3} dataKey="value">
                      {netWorthMixData.map((e, i) => (<Cell key={i} fill={e.color} stroke="none" />))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="mt-4">
                <div className="grid grid-cols-12 gap-2 px-2 py-2 text-[11px] font-medium text-gray-400 border-b border-gray-800">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-2 text-right">% NW</div>
                  <div className="col-span-2 text-right">Net</div>
                  <div className="col-span-2 text-right">Assets</div>
                  <div className="col-span-2 text-right">Liabilities</div>
                </div>
                {netWorthMixData.map((row, i) => {
                  const d = computeMixBreakdown(summary, row.key);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 px-2 py-2 rounded hover:bg-gray-800/40">
                      <div className="col-span-4 flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: row.color }} /> <span className="text-sm text-gray-200">{row.name}</span></div>
                      <div className="col-span-2 text-right text-indigo-300 text-sm">{row.pct.toFixed(1)}%</div>
                      <div className="col-span-2 text-right text-white text-sm">{formatCurrency(row.value, showInThousands)}</div>
                      <div className="col-span-2 text-right text-emerald-300 text-sm">{formatCurrency(d?.assets || 0, showInThousands)}</div>
                      <div className="col-span-2 text-right text-rose-300 text-sm">{formatCurrency(d?.liabilities || 0, showInThousands)}</div>
                    </div>
                  );
                })}
                <div className="border-t border-gray-800 mt-2 pt-2 grid grid-cols-12 gap-2 px-2 text-sm">
                  <div className="col-span-4 font-semibold">Total</div>
                  <div className="col-span-2 text-right text-indigo-300">100%</div>
                  <div className="col-span-2 text-right text-white">{formatCurrency(netWorth, showInThousands)}</div>
                  <div className="col-span-2 text-right text-emerald-300">{formatCurrency(totalAssets, showInThousands)}</div>
                  <div className="col-span-2 text-right text-rose-300">{formatCurrency(totalLiabilities, showInThousands)}</div>
                </div>
              </div>
            </Section>

            {/* INVESTED AMOUNT with hover spark + fullscreen modal */}
            <Section title="Invested Amount" icon={<BarChart3 className="h-5 w-5 text-indigo-300" />}>
              <div className="grid grid-cols-12 text-xs text-gray-400 px-2 pb-2">
                <div className="col-span-4">Asset Class</div>
                <div className="col-span-3 text-right">Market</div>
                <div className="col-span-3 text-right">Cost</div>
                <div className="col-span-2 text-right">P/L</div>
              </div>
              {[
                {
                  key: 'securities', label: 'Securities', color: '#4f46e5',
                  market: summary?.assetAllocation?.securities?.value,
                  cost: summary?.assetAllocation?.securities?.costBasis,
                  gain: summary?.assetAllocation?.securities?.gainLoss,
                  gainPct: summary?.assetAllocation?.securities?.gainLossPercent
                },
                {
                  key: 'cash', label: 'Cash', color: '#10b981',
                  market: summary?.assetAllocation?.cash?.value,
                  cost: summary?.assetAllocation?.cash?.costBasis
                },
                {
                  key: 'crypto', label: 'Crypto', color: '#8b5cf6',
                  market: summary?.assetAllocation?.crypto?.value,
                  cost: summary?.assetAllocation?.crypto?.costBasis,
                  gain: summary?.assetAllocation?.crypto?.gainLoss,
                  gainPct: summary?.assetAllocation?.crypto?.gainLossPercent
                },
                {
                  key: 'metals', label: 'Metals', color: '#f59e0b',
                  market: summary?.assetAllocation?.metals?.value,
                  cost: summary?.assetAllocation?.metals?.costBasis,
                  gain: summary?.assetAllocation?.metals?.gainLoss,
                  gainPct: summary?.assetAllocation?.metals?.gainLossPercent
                },
                {
                  key: 'otherAssets', label: 'Other Assets', color: '#6b7280',
                  market: summary?.assetAllocation?.otherAssets?.value,
                  cost: summary?.assetAllocation?.otherAssets?.costBasis,
                  gain: summary?.assetAllocation?.otherAssets?.gainLoss,
                  gainPct: summary?.assetAllocation?.otherAssets?.gainLossPercent
                },
              ].map((r) => {
                const sparkData = byClassTS[r.key] || null;
                return (
                  <InvestedRow
                    key={r.key}
                    {...r}
                    showInThousands={showInThousands}
                    sparkData={sparkData}
                    onClick={() => { if (sparkData) { setModalAssetKey(r.key); setModalOpen(true); } }}
                  />
                );
              })}
              <div className="border-t border-gray-800 mt-2 pt-2 grid grid-cols-12 px-2 text-sm">
                <div className="col-span-4 font-semibold">Total</div>
                <div className="col-span-3 text-right text-indigo-300">{formatCurrency(summary?.totalAssets || 0, showInThousands)}</div>
                <div className="col-span-3 text-right text-gray-300">{formatCurrency(summary?.totalCostBasis || 0, showInThousands)}</div>
                <div className="col-span-2 text-right">
                  <span className={`${(summary?.unrealizedGain || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-medium`}>
                    {formatCurrency(summary?.unrealizedGain || 0, showInThousands)} <span className="text-xs">({((summary?.unrealizedGainPercent || 0) * 100).toFixed(1)}%)</span>
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">Tip: click rows with <Expand className="inline h-3 w-3 mx-1" /> to view detailed performance chart.</p>
            </Section>

            {/* Net Worth Breakdown */}
            <NetWorthWidget
              assets={totalAssets}
              liabilities={totalLiabilities}
              netWorth={netWorth}
              showInThousands={showInThousands}
            />

            {/* Liquidity Analysis */}
            {liquidAssets > 0 && (
              <Section title="Liquidity Analysis" icon={<Droplet className="h-5 w-5 text-blue-300" />}>
                <div className="mb-3 p-3 bg-gray-900/60 rounded-lg border border-gray-800 flex items-center justify-between">
                  <span className="text-sm text-gray-300">Total Assets</span>
                  <span className="text-lg font-semibold">{formatCurrency(totalAssets)}</span>
                </div>
                <div className="space-y-3">
                  <Bar label="Liquid Assets" value={liquidAssets} total={totalAssets} color="#3b82f6" />
                  {otherAssets > 0 && <Bar label="Illiquid Assets" value={otherAssets} total={totalAssets} color="#6b7280" />}
                  <div className="pt-2 mt-2 border-t border-gray-800 text-xs text-gray-400">
                    {formatPct(((riskMetrics?.liquidity_ratio ?? (totalAssets ? (liquidAssets / totalAssets) : 0)) * 100))} of assets are liquid
                  </div>
                </div>
              </Section>
            )}

            {/* Top Positions */}
            <Section title="Top Individual Positions" icon={<BarChart3 className="h-5 w-5 text-rose-300" />}>
              <div className="space-y-2">
                {topPositionsData?.length ? topPositionsData.map((p, i) => (
                  <motion.div key={i} whileHover={{ x: 2 }} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-800/60">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: assetColors[p.assetType] || assetColors.other }} />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-200 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.accountName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(p.value)}</p>
                      <p className={`text-xs ${p.gainLossPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPct(p.gainLossPercent * 100)}</p>
                    </div>
                  </motion.div>
                )) : <p className="text-sm text-gray-400">No position data.</p>}
              </div>
            </Section>

            {/* Top Institutions */}
            <Section title="Top Institutions" icon={<Building2 className="h-5 w-5 text-indigo-300" />}>
              <div className="space-y-2">
                {institutionMixData?.length ? institutionMixData.map((inst, i) => (
                  <motion.div key={i} whileHover={{ x: 2 }} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-800/60">
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: inst.color }} />
                      <div>
                        <p className="text-sm text-gray-200">{inst.name}</p>
                        <p className="text-xs text-gray-500">{inst.accountCount} acct • {inst.positionCount} pos</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium">{formatPct(inst.percentage * 100)}</span>
                  </motion.div>
                )) : <p className="text-sm text-gray-400">No institution data.</p>}
              </div>
            </Section>

            {/* Personal Cash Flow Peek */}
            {netCashBasisMetrics && (
              <Section
                title="Personal Cash Flow"
                icon={<Activity className="h-5 w-5 text-emerald-300" />}
                right={
                  <div className="flex items-center gap-2">
                    <button className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-300 cursor-default">
                      Net: {formatCurrency(netCashBasisMetrics.net_cash_position)}
                    </button>
                    <button onClick={() => setCashflowOpen(true)} className="text-xs px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1">
                      <Expand className="h-3.5 w-3.5" /> Open
                    </button>
                  </div>
                }
              >
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Day', netCashBasisMetrics?.cash_flow_1d, netCashBasisMetrics?.cash_flow_1d_pct],
                    ['Week', netCashBasisMetrics?.cash_flow_1w, netCashBasisMetrics?.cash_flow_1w_pct],
                    ['Month', netCashBasisMetrics?.cash_flow_1m, netCashBasisMetrics?.cash_flow_1m_pct],
                  ].map(([label, flow, pct]) => (
                    <div key={label} className="bg-gray-900/70 border border-gray-800 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-sm font-semibold ${flow > 0 ? 'text-emerald-400' : flow < 0 ? 'text-rose-400' : 'text-gray-300'}`}>{formatCurrency(flow || 0)}</p>
                      <p className={`text-[11px] ${pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-rose-400' : 'text-gray-500'}`}>{pct ? formatPct((pct || 0) * 100) : '—'}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mt-3">
                  {[
                    ['YTD', netCashBasisMetrics?.cash_flow_ytd],
                    ['1 Year', netCashBasisMetrics?.cash_flow_1y],
                    ['3 Years', netCashBasisMetrics?.cash_flow_3y],
                  ].map(([label, flow]) => (
                    <div key={label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-2">
                      <p className="text-[11px] text-gray-500">{label}</p>
                      <p className={`text-sm font-medium ${flow > 0 ? 'text-emerald-400' : flow < 0 ? 'text-rose-400' : 'text-gray-300'}`}>{formatCurrency(flow || 0)}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Top Movers */}
            {(topPerformersAmount?.length || topPerformersPercent?.length) && (
              <Section title="Top Movers" icon={<BarChart3 className="h-5 w-5 text-indigo-300" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topPerformersAmount?.length ? (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">By Amount</p>
                      <div className="space-y-2">
                        {topPerformersAmount.slice(0, 5).map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-gray-800/50">
                            <span className="truncate text-gray-200">{p.name || p.identifier}</span>
                            <span className={`${(p.gain_loss_amount || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(p.gain_loss_amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {topPerformersPercent?.length ? (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">By %</p>
                      <div className="space-y-2">
                        {topPerformersPercent.slice(0, 5).map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-gray-800/50">
                            <span className="truncate text-gray-200">{p.name || p.identifier}</span>
                            <span className={`${(p.gain_loss_percent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatPct((p.gain_loss_percent || 0) * 100)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>
            )}
        </div>
      </div>
    </main>

      {/* Fullscreen modal: Invested Amount row */}
      <FullscreenModal
        open={modalOpen}
        title={`Performance — ${modalAssetKey || ''}`}
        onClose={() => { setModalOpen(false); setModalAssetKey(null); }}
      >
        {modalAssetKey && byClassTS[modalAssetKey]?.length ? (
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byClassTS[modalAssetKey].map((d) => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: d.pl ?? d.value ?? 0
              }))}>
                <defs>
                  <linearGradient id="pl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={axisMoney} />
                <Tooltip
                  contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb' }}
                  formatter={(v) => [formatCurrency(v), 'P/L']}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#pl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-full grid place-items-center text-gray-400 text-sm">No time-series available for this asset class.</div>
        )}
      </FullscreenModal>

      {/* Fullscreen modal: Cash Flow */}
      <FullscreenModal open={cashflowOpen} title="Personal Cash Flow" onClose={() => setCashflowOpen(false)}>
        <div className="h-full flex flex-col gap-4">
          <div className="h-3/4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowTrendData}>
                <defs>
                  <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="displayDate" tick={{ fill: '#9ca3af' }} />
                <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={axisMoney} />
                <Tooltip
                  contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb' }}
                  formatter={(v) => [formatCurrency(v), 'Net Cash Position']}
                />
                <Area type="monotone" dataKey="netCashPosition" stroke="#10b981" strokeWidth={2} fill="url(#cf)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Day',   netCashBasisMetrics?.cash_flow_1d, netCashBasisMetrics?.cash_flow_1d_pct],
              ['Week',  netCashBasisMetrics?.cash_flow_1w, netCashBasisMetrics?.cash_flow_1w_pct],
              ['Month', netCashBasisMetrics?.cash_flow_1m, netCashBasisMetrics?.cash_flow_1m_pct],
            ].map(([label, flow, pct]) => (
              <div key={label} className="bg-gray-900/70 border border-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className={`text-sm font-semibold ${flow > 0 ? 'text-emerald-400' : flow < 0 ? 'text-rose-400' : 'text-gray-300'}`}>{formatCurrency(flow || 0)}</p>
                <p className={`text-[11px] ${pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-rose-400' : 'text-gray-500'}`}>{pct ? formatPct((pct || 0) * 100) : '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </FullscreenModal>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Reusable bits
// -----------------------------------------------------------------------------
function KPI({ label, value, delta, icon }) {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {delta}
        </div>
        <div className="p-2 bg-gray-800 rounded-xl text-indigo-300">{icon}</div>
      </div>
    </div>
  );
}

function LegendDots({ items = [] }) {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-400">
      {items.map(([color, label]) => (
        <div key={label} className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-300">{label}</span><span className="text-white">{value}</span>
    </div>
  );
}

function NetWorthWidget({ assets=0, liabilities=0, netWorth=0, showInThousands=false }) {
  // Calculate percentages relative to assets (the baseline)
  const liabilitiesPct = assets > 0 ? Math.min((liabilities / assets) * 100, 100) : 0;
  const netWorthPct = assets > 0 ? Math.max((netWorth / assets) * 100, 0) : 0;

  return (
    <Section title="Net Worth" icon={<DollarSign className="h-5 w-5 text-indigo-300" />}>
      {/* headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800">
          <p className="text-xs text-gray-400">Total Assets</p>
          <p className="mt-1 text-xl font-semibold text-emerald-300">{formatCurrency(assets, showInThousands)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800">
          <p className="text-xs text-gray-400">Total Liabilities</p>
          <p className="mt-1 text-xl font-semibold text-rose-300">-{formatCurrency(Math.abs(liabilities), showInThousands)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800">
          <p className="text-xs text-gray-400">Net Worth</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(netWorth, showInThousands)}</p>
        </div>
      </div>

      {/* Diverging bar showing offsetting relationship */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span className="font-medium">Asset Composition</span>
          <span>{netWorthPct.toFixed(1)}% equity • {liabilitiesPct.toFixed(1)}% leveraged</span>
        </div>

        {/* Main visualization bar */}
        <div className="relative">
          {/* Background track (represents total assets) */}
          <div className="w-full h-8 rounded-xl bg-gray-800/50 border border-gray-700/50 overflow-hidden">
            {/* Net Worth (green) - flows from left */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${netWorthPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute left-0 top-0 h-full"
              style={{ background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }}
            />

            {/* Liabilities (red) - flows from right, offsetting assets */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${liabilitiesPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="absolute right-0 top-0 h-full"
              style={{ background: 'linear-gradient(270deg, #f43f5e 0%, #fb7185 100%)' }}
            />
          </div>

          {/* Value labels on the bar */}
          {netWorthPct > 15 && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/90 pointer-events-none">
              {formatCurrency(netWorth, true)}
            </div>
          )}
          {liabilitiesPct > 15 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/90 pointer-events-none">
              {formatCurrency(liabilities, true)}
            </div>
          )}
        </div>

        {/* Legend with visual flow indicators */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <span>Net Worth</span>
            </div>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">Assets - Liabilities</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-l from-rose-500 to-rose-400" />
            <span>Debt Offset</span>
          </div>
        </div>

        {/* Insight text */}
        <div className="mt-3 p-3 rounded-lg bg-gray-900/40 border border-gray-800/50">
          <p className="text-xs text-gray-400 leading-relaxed">
            {liabilitiesPct > 50
              ? `High leverage: Liabilities represent ${liabilitiesPct.toFixed(0)}% of total assets`
              : liabilitiesPct > 25
              ? `Moderate leverage: ${liabilitiesPct.toFixed(0)}% of assets offset by debt`
              : liabilitiesPct > 0
              ? `Low leverage: ${liabilitiesPct.toFixed(0)}% debt-to-asset ratio`
              : 'No liabilities: 100% equity position'
            }
          </p>
        </div>
      </div>
    </Section>
  );
}


function InvestedRow({ label, color, market = 0, cost = 0, gain = null, gainPct = null, showInThousands, sparkData = null, onClick }) {
  const hasPL = gain !== null && gainPct !== null && gainPct !== undefined;
  const up = (gain || 0) >= 0;
  return (
    <div
      className={`grid grid-cols-12 px-2 py-2 rounded-lg hover:bg-gray-800/50 ${sparkData ? 'cursor-pointer' : ''}`}
      onClick={sparkData ? onClick : undefined}
    >
      <div className="col-span-4 flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm text-gray-200 flex items-center gap-1">
          {label}
          {sparkData && <Expand className="h-3 w-3 text-gray-500" />}
        </span>
      </div>
      <div className="col-span-3 text-right text-gray-100">{formatCurrency(market || 0, showInThousands)}</div>
      <div className="col-span-3 text-right text-gray-300">{formatCurrency(cost || 0, showInThousands)}</div>
      <div className="col-span-2 text-right">
        {hasPL ? (
          <span className={`${up ? 'text-emerald-400' : 'text-rose-400'} text-sm font-medium`}>
            {formatCurrency(gain || 0, showInThousands)} <span className="text-xs">({((gainPct || 0) * 100).toFixed(1)}%)</span>
          </span>
        ) : <span className="text-gray-500 text-sm">—</span>}
      </div>
    </div>
  );
}

function AssetClassCard({ type, data = {}, icon }) {
  const perf = {
    '1D': data?.daily?.percent_change || 0,
    '1W': data?.weekly?.percent_change || 0,
    '1M': data?.monthly?.percent_change || 0,
    'YTD': data?.ytd?.percent_change || 0,
  };
  const pl = Number(data?.gainLoss) || 0;
  const plPct = (data?.gainLossPercent || 0) * 100;
  const count = data?.count ?? undefined;

  return (
    <motion.div whileHover={{ y: -2 }} className="group relative bg-gray-900/70 border border-gray-800 rounded-2xl p-4">
      {/* positions hover badge */}
      {typeof count === 'number' && count > 0 && (
        <div className="absolute top-3 right-3">
          <div className="opacity-0 group-hover:opacity-100 transition bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-xs text-gray-300">
            {count} {type === 'liability' ? 'liabilities' : 'positions'}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gray-800">{icon}</div>
          <div>
            <h4 className="text-sm font-semibold">{data?.name || '—'}</h4>
            <p className="text-xs text-gray-400">{type === 'liability' ? 'Outstanding Balance' : 'Market Value'}</p>
            <p className="text-xl font-bold mt-1">{type === 'liability' ? `-${formatCurrency(Math.abs(data?.value || 0))}` : formatCurrency(data?.value || 0)}</p>
            {type !== 'cash' && type !== 'liability' && data?.gainLoss !== undefined && (
              <p className={`text-sm mt-1 ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pl >= 0 ? '+' : ''}{formatCurrency(pl)} <span className="text-xs">({formatPct(plPct, false, 1)})</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {type !== 'liability' && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Object.entries(perf).map(([k, v]) => (
            <div key={k} className="text-center">
              <p className="text-[10px] text-gray-500">{k}</p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${v > 0 ? 'bg-emerald-500/10 text-emerald-400' : v < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-gray-700/40 text-gray-400'}`}>
                {v > 0 ? '+' : ''}{v.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Logic: compute Assets/Liabilities breakdown for Mix hover
// -----------------------------------------------------------------------------
function computeMixBreakdown(summary, key) {
  if (!summary) return null;
  switch (key) {
    case 'securities':
      return { assets: summary.assetAllocation.securities.value || 0, liabilities: 0 };
    case 'netCash':
      return {
        assets: summary.assetAllocation.cash.value || 0,
        liabilities: summary.liabilities.creditCard || 0
      };
    case 'crypto':
      return { assets: summary.assetAllocation.crypto.value || 0, liabilities: 0 };
    case 'metals':
      return { assets: summary.assetAllocation.metals.value || 0, liabilities: 0 };
    case 'realEstate':
      return {
        assets: (summary.altNetWorth.realEstate || 0) + (summary.liabilities.mortgage || 0),
        liabilities: summary.liabilities.mortgage || 0
      };
    case 'other': {
      const otherLiabs = (summary.liabilities.total || 0) - (summary.liabilities.creditCard || 0) - (summary.liabilities.mortgage || 0);
      const realEstateAssets = (summary.altNetWorth.realEstate || 0) + (summary.liabilities.mortgage || 0);
      const otherAssetsVal = (summary.assetAllocation.otherAssets.value || 0) - realEstateAssets;
      return { assets: Math.max(otherAssetsVal, 0), liabilities: Math.max(otherLiabs, 0) };
    }
    default:
      return null;
  }
}
