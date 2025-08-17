// pages/nestegg.js
import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine
} from 'recharts';
import {
  Sparkles, RefreshCw, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Wallet,
  Landmark, Building2, PieChart as PieChartIcon, Gauge, Shield, BarChart3,
  CreditCard, Banknote, Coins, Package, Home, ArrowRight, Target
} from 'lucide-react';

import { useDataStore } from '@/store/DataStore';
import { usePortfolioSummary, usePortfolioTrends } from '@/store/hooks';

// -----------------------------
// Palette & helpers
// -----------------------------
const assetColors = {
  securities: '#4f46e5',
  security: '#4f46e5',
  cash: '#10b981',
  crypto: '#8b5cf6',
  metal: '#f59e0b',
  metals: '#f59e0b',
  real_estate: '#14b8a6',
  other: '#6b7280',
  other_assets: '#6b7280'
};

const liabilityColors = {
  credit_card: '#dc2626',
  mortgage: '#7c2d12',
  auto_loan: '#f97316',
  personal_loan: '#ea580c',
  student_loan: '#fb923c',
  home_equity: '#f59e0b',
  other: '#fbbf24'
};

const sectorColors = {
  'Technology': '#6366f1',
  'Financial Services': '#0ea5e9',
  'Healthcare': '#10b981',
  'Consumer Cyclical': '#f59e0b',
  'Communication Services': '#8b5cf6',
  'Industrials': '#64748b',
  'Consumer Defensive': '#14b8a6',
  'Energy': '#f97316',
  'Basic Materials': '#f43f5e',
  'Real Estate': '#84cc16',
  'Utilities': '#0284c7',
  'Unknown': '#9ca3af',
  'Other': '#9ca3af'
};

const timeframeOptions = [
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' }
];

const fmtCurrency = (v, inThousands = false) => {
  if (v === null || v === undefined || isNaN(v)) return '-';
  if (inThousands) {
    const k = v / 1000;
    return `$${k.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
};

const fmtPct = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '0%';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
};

const parseMaybeJSON = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

// Normalize risk metrics whether from object or json-string & with variant key names.
const normalizeRisk = (raw) => {
  const obj = parseMaybeJSON(raw) ?? raw ?? {};
  const n = (x, d = null) => (x === undefined || x === null || x === '' ? d : Number(x));
  return {
    beta: n(obj.portfolio_beta ?? obj.beta ?? 1, 1),
    volatility: n(obj.volatility_estimate ?? obj.volatility ?? obj.volatility_pct ?? 0, 0),
    liquidityRatio: n(obj.liquidity_ratio ?? obj.liquidity_ratio_pct ?? obj.liquidity ?? 0, 0),
    var95: n(obj.var_95 ?? obj.value_at_risk_95 ?? null),
    maxDrawdown: n(obj.max_drawdown ?? obj.max_drawdown_pct ?? null)
  };
};

// Guarded chart renderer helper
const hasData = (arr, key = 'value') =>
  Array.isArray(arr) && arr.some(d => typeof d?.[key] === 'number' && !isNaN(d[key]) && d[key] !== 0);

// -----------------------------
// Page
// -----------------------------
export default function NestEgg() {
  const router = useRouter();
  const { state } = useDataStore();

  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [showInThousands, setShowInThousands] = useState(true);

  const {
    summary,
    topPositions,
    topPerformersAmount,
    topPerformersPercent,
    accountDiversification,
    assetPerformance,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    riskMetrics,
    concentrationMetrics,
    dividendMetrics,
    taxEfficiencyMetrics,
    netCashBasisMetrics,
    history,
    loading,
    error,
    refresh: refreshData,
    lastFetched,
    isStale
  } = usePortfolioSummary();

  const { trends } = usePortfolioTrends();

  // --------------- Derived (display-only) data ---------------
  const chartData = useMemo(() => {
    const src = trends?.chartData;
    if (!Array.isArray(src)) return [];
    return src.map(d => ({
      dateISO: d.date,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      netWorth: d.netWorth,
      totalAssets: d.totalAssets,
      totalLiabilities: d.totalLiabilities,
      costBasis: summary?.totalCostBasis ?? 0,
      liquidAssets: d.liquidAssets ?? 0,
      altLiquidNetWorth: d.altLiquidNetWorth ?? 0,
      altRetirementAssets: d.altRetirementAssets ?? 0,
      altIlliquidNetWorth: d.altIlliquidNetWorth ?? 0
    }));
  }, [trends?.chartData, summary?.totalCostBasis]);

  // Timeframe filtering is a view choice (no custom calc)
  const chartDataFiltered = useMemo(() => {
    if (!Array.isArray(chartData) || chartData.length === 0) return [];
    const take = (n) => chartData.slice(-n);
    switch (selectedTimeframe) {
      case '1w': return take(7);
      case '1m': return take(30);
      case '3m': return take(90);
      case '6m': return take(180);
      case 'ytd': {
        const y = new Date().getFullYear();
        return chartData.filter(d => new Date(d.dateISO).getFullYear() === y);
      }
      case '1y': return take(365);
      default: return chartData;
    }
  }, [chartData, selectedTimeframe]);

  // Net Worth Mix (assets + liabilities + equity) from summary (no new math)
  const netWorthMixData = useMemo(() => {
    if (!summary) return [];
    const rows = [
      { key: 'Securities', value: Number(summary?.assetAllocation?.securities?.value) || 0, pct: (Number(summary?.netWorthMix?.securities) || 0) * 100, color: assetColors.securities },
      { key: 'Net Cash', value: Number(summary?.altNetWorth?.netCash) || 0, pct: (Number(summary?.netWorthMix?.netCash) || 0) * 100, color: assetColors.cash },
      { key: 'Crypto', value: Number(summary?.assetAllocation?.crypto?.value) || 0, pct: (Number(summary?.netWorthMix?.crypto) || 0) * 100, color: assetColors.crypto },
      { key: 'Metals', value: Number(summary?.assetAllocation?.metals?.value) || 0, pct: (Number(summary?.netWorthMix?.metals) || 0) * 100, color: assetColors.metals },
      { key: 'Real Estate', value: Number(summary?.altNetWorth?.realEstate) || 0, pct: (Number(summary?.netWorthMix?.realEstateEquity) || 0) * 100, color: assetColors.real_estate },
      { key: 'Net Other Assets', value: Number(summary?.altNetWorth?.netOtherAssets) || 0, pct: (Number(summary?.netWorthMix?.netOtherAssets) || 0) * 100, color: assetColors.other }
    ].filter(r => r.value > 0 || r.pct > 0);
    return rows.map(r => ({ name: r.key, value: r.value, percentage: r.pct, color: r.color }));
  }, [summary]);

  const sectorAllocationData = useMemo(() => {
    if (!rawSectorAllocation || typeof rawSectorAllocation !== 'object') return [];
    return Object.entries(rawSectorAllocation)
      .filter(([, d]) => d && d.value > 0)
      .map(([name, d]) => ({
        name: name || 'Unknown',
        value: Number(d.value) || 0,
        percentage: (Number(d.percentage) || 0) * 100,
        positionCount: d.position_count || 0,
        color: sectorColors[name] || sectorColors.Unknown
      }))
      .sort((a, b) => b.value - a.value);
  }, [rawSectorAllocation]);

  const institutionMixData = useMemo(() => {
    if (!Array.isArray(rawInstitutionAllocation)) return [];
    return rawInstitutionAllocation
      .filter(d => d && d.value > 0)
      .map(d => ({
        name: d.institution,
        value: Number(d.value) || 0,
        percentage: Number(d.percentage) || 0,
        accountCount: d.account_count || 0,
        positionCount: d.position_count || 0,
        color: d.primary_color || '#6b7280'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rawInstitutionAllocation]);

  const topPositionsData = useMemo(() => {
    if (!Array.isArray(topPositions)) return [];
    return topPositions.slice(0, 6).map(p => ({
      name: p.name || p.identifier,
      identifier: p.identifier,
      value: Number(p.current_value ?? p.value) || 0,
      gainLoss: Number(p.gain_loss) || 0,
      gainLossPercent: Number(p.gain_loss_percent) || 0,
      accountName: p.account_name,
      assetType: p.asset_type || 'security',
      percentage: Number(p.percentage) || 0
    }));
  }, [topPositions]);

  // Risk (JSON-safe)
  const risk = useMemo(() => normalizeRisk(
    riskMetrics ?? summary?.riskMetrics ?? summary?.risk_metrics ?? summary?.riskJson
  ), [riskMetrics, summary]);

  // Concentration metrics (support both names)
  const concentration = useMemo(() => {
    const c = concentrationMetrics || {};
    return {
      top5Pct: Number(c.top_5_concentration ?? c.top5PositionsPct ?? 0),
      largestWeight: Number(c.largest_position_weight ?? c.topPositionPct ?? 0)
    };
  }, [concentrationMetrics]);

  // Cash flow trend from history (view-only mapping)
  const cashFlowTrendData = useMemo(() => {
    if (!Array.isArray(history)) return [];
    return history
      .filter(i => i?.net_cash_basis_metrics?.net_cash_position !== null && i?.net_cash_basis_metrics?.net_cash_position !== undefined)
      .map(i => {
        const dateStr = i.date || i.snapshot_date;
        const [y, m, d] = String(dateStr).split('-').map(n => parseInt(n, 10));
        const displayDate = new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          date: dateStr,
          displayDate,
          netCashPosition: Number(i.net_cash_basis_metrics.net_cash_position) || 0
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [history]);

  // --------------- Small UI bits ---------------
  const TimePeriodBadge = ({ label, change, changePercent }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="flex flex-col p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all duration-200 cursor-default"
    >
      <span className="text-xs text-gray-300 mb-1">{label}</span>
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">
          {fmtCurrency(change?.netWorth ?? 0, showInThousands)}
        </span>
        <span className={`text-xs flex items-center ${((changePercent?.netWorthPercent) ?? 0) > 0 ? 'text-green-500' : ((changePercent?.netWorthPercent) ?? 0) < 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {((changePercent?.netWorthPercent) ?? 0) > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : ((changePercent?.netWorthPercent) ?? 0) < 0 ? <ArrowDown className="h-3 w-3 mr-1" /> : null}
          {fmtPct(((changePercent?.netWorthPercent) ?? 0) * 100)}
        </span>
      </div>
    </motion.div>
  );

  const AllocationTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100">
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full mr-2" style={{ background: p?.color || '#9ca3af' }} />
          <span className="font-medium">{p?.name}</span>
        </div>
        <div className="mt-1 text-xs text-gray-300">
          {fmtCurrency(p?.value, showInThousands)} • {fmtPct(Number(p?.percentage) || 0)}
        </div>
      </div>
    );
  };

  const NetWorthComponentsTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    const mk = (name) => payload.find(p => p.dataKey === name);
    const l = mk('altLiquidNetWorth')?.value ?? 0;
    const r = mk('altRetirementAssets')?.value ?? 0;
    const il = mk('altIlliquidNetWorth')?.value ?? 0;
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100">
        <div className="font-medium">{label}</div>
        <div className="mt-1 text-xs text-gray-300 space-y-1">
          <div>Liquid: {fmtCurrency(l)}</div>
          <div>Retirement: {fmtCurrency(r)}</div>
          <div>Illiquid: {fmtCurrency(il)}</div>
        </div>
      </div>
    );
  };

  // ----------------------------- Render -----------------------------
  if (error) {
    return (
      <div className="p-6">
        <Head><title>NestEgg — Dashboard</title></Head>
        <div className="rounded-xl border border-red-700 bg-red-900/30 p-4 text-red-200">
          Oops—there was an error loading your data. Please try refresh.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Head><title>NestEgg — Dashboard</title></Head>

      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">NestEgg</h1>
              <p className="text-xs text-gray-400">Your complete, credential-free portfolio dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStale && (
              <span className="text-xs text-amber-400 px-2 py-1 rounded bg-amber-900/20 border border-amber-800">
                Data might be out of date
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}
              onClick={refreshData}
              className="inline-flex items-center gap-2 rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8">
        {/* Top KPI row */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Net Worth */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between">
                <div className="text-gray-300 text-sm">Net Worth</div>
                <Gauge className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-1 text-2xl font-bold text-white">{fmtCurrency(summary.netWorth)}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span>Total Assets: <span className="text-gray-200">{fmtCurrency(summary.totalAssets)}</span></span>
                <span>•</span>
                <span>Total Liabilities: <span className="text-red-300">-{fmtCurrency(summary.liabilities?.total ?? 0).replace('$', '')}</span></span>
              </div>
            </div>

            {/* Performance over time badges */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between">
                <div className="text-gray-300 text-sm">Performance Over Time</div>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                <TimePeriodBadge label="1D"  change={summary.periodChanges?.['1d']} changePercent={summary.periodChanges?.['1d']} />
                <TimePeriodBadge label="1W"  change={summary.periodChanges?.['1w']} changePercent={summary.periodChanges?.['1w']} />
                <TimePeriodBadge label="1M"  change={summary.periodChanges?.['1m']} changePercent={summary.periodChanges?.['1m']} />
                <TimePeriodBadge label="YTD" change={summary.periodChanges?.['ytd']} changePercent={summary.periodChanges?.['ytd']} />
                <TimePeriodBadge label="1Y"  change={summary.periodChanges?.['1y']} changePercent={summary.periodChanges?.['1y']} />
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between">
                <div className="text-gray-300 text-sm">Deep Dives</div>
                <Target className="h-4 w-4 text-sky-400" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: 'Accounts', icon: <Building2 className="h-4 w-4" />, href: '/accounts' },
                  { label: 'Positions', icon: <BarChart3 className="h-4 w-4" />, href: '/positions' },
                  { label: 'Liabilities', icon: <CreditCard className="h-4 w-4" />, href: '/liabilities' },
                  { label: 'Command Center', icon: <Shield className="h-4 w-4" />, href: '/command-center' }
                ].map((b) => (
                  <motion.button
                    key={b.label}
                    whileHover={{ scale: 1.03, x: 2 }}
                    className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    onClick={() => router.push(b.href)}
                  >
                    <span className="flex items-center gap-2">{b.icon}{b.label}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Trend + Components */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-8 space-y-4">
            {/* Timeframe toggle */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">Trended Net Worth</div>
              <div className="flex items-center gap-2 rounded-lg bg-gray-900 p-1">
                {timeframeOptions.map(opt => (
                  <motion.button
                    key={opt.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTimeframe(opt.id)}
                    className={`px-2.5 py-1 text-xs rounded-md ${selectedTimeframe === opt.id ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="h-72 rounded-xl border border-gray-800 bg-gray-900 p-3">
              {hasData(chartDataFiltered, 'netWorth') ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataFiltered} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tick={{ fill:'#9ca3af' }} />
                    <YAxis tick={{ fill:'#9ca3af' }} tickFormatter={(v)=>{
                      if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `$${(v/1_000).toFixed(0)}k`;
                      return `$${v.toLocaleString()}`;
                    }}/>
                    <Tooltip contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb' }}
                      formatter={(v, n)=>[fmtCurrency(v), n === 'netWorth' ? 'Net Worth' : n]}/>
                    <Area type="monotone" dataKey="netWorth" stroke="#4f46e5" fill="url(#nwFill)" strokeWidth={2} activeDot={{ r: 4 }} />
                    <ReferenceLine y={chartDataFiltered[0]?.netWorth || 0} stroke="#374151" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">No trend data</div>
              )}
            </div>

            {/* Net-worth components (Liquid / Retirement / Illiquid) */}
            <div className="h-72 rounded-xl border border-gray-800 bg-gray-900 p-3">
              {hasData(chartDataFiltered, 'altLiquidNetWorth') ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataFiltered}>
                    <defs>
                      <linearGradient id="colorLiquid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRetirement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIlliquid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tick={{ fill:'#9ca3af' }} />
                    <YAxis tick={{ fill:'#9ca3af' }} tickFormatter={(v)=>{
                      if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `$${(v/1_000).toFixed(0)}k`;
                      return `$${v.toLocaleString()}`;
                    }}/>
                    <Tooltip content={<NetWorthComponentsTooltip />} />
                    <Line type="monotone" dataKey="altLiquidNetWorth" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 5, fill:'#3b82f6' }} />
                    <Line type="monotone" dataKey="altRetirementAssets" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 5, fill:'#10b981' }} />
                    <Line type="monotone" dataKey="altIlliquidNetWorth" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 5, fill:'#8b5cf6' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">No component data</div>
              )}
            </div>

            {/* Personal Cash Flow */}
            {netCashBasisMetrics && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white text-sm flex items-center gap-2"><Wallet className="h-4 w-4 text-green-400" />Personal Cash Flow</h3>
                  <div className="text-xl font-bold text-white">{fmtCurrency(netCashBasisMetrics.net_cash_position)}</div>
                </div>
                <div className="h-56">
                  {hasData(cashFlowTrendData, 'netCashPosition') ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlowTrendData}>
                        <defs>
                          <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="displayDate" tick={{ fill:'#9ca3af' }} />
                        <YAxis tick={{ fill:'#9ca3af' }} tickFormatter={(v)=>{
                          if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
                          if (v >= 1_000) return `$${(v/1_000).toFixed(0)}k`;
                          return `$${v.toLocaleString()}`;
                        }}/>
                        <Tooltip contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb' }}
                                 formatter={(value)=>[`$${Number(value).toLocaleString()}`, 'Net Cash Position']} />
                        <Area type="monotone" dataKey="netCashPosition" stroke="#10b981" fill="url(#cashFlowGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm">No cash flow history</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right column */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-4 space-y-4">
            {/* Net Worth Mix (Donut + Table) */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm">Net Worth Mix</h3>
                <PieChartIcon className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="h-60">
                {hasData(netWorthMixData) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={netWorthMixData} cx="50%" cy="50%" innerRadius={56} outerRadius={80} paddingAngle={3} dataKey="value">
                        {netWorthMixData.map((d, i) => (
                          <Cell key={i} fill={d.color || '#9ca3af'} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<AllocationTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">No mix data</div>
                )}
              </div>

              {/* Format toggle */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">Values in {showInThousands ? 'thousands (k)' : 'dollars ($)'}</span>
                <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200"
                  onClick={()=>setShowInThousands(v=>!v)}
                >
                  {showInThousands ? 'Show $' : 'Show k'}
                </motion.button>
              </div>

              {/* Tabular breakdown you liked */}
              {summary && (
                <div className="mt-3 text-xs">
                  <div className="grid grid-cols-12 px-2 py-2 text-gray-400 border-b border-gray-800">
                    <div className="col-span-4">Asset Type</div>
                    <div className="col-span-2 text-right">% of NW</div>
                    <div className="col-span-2 text-right">Net Worth</div>
                    <div className="col-span-2 text-right">Assets</div>
                    <div className="col-span-2 text-right">Liabilities</div>
                  </div>

                  {/* Securities */}
                  <div className="grid grid-cols-12 px-2 py-2 hover:bg-gray-800/60 rounded">
                    <div className="col-span-4 flex items-center">
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: assetColors.securities }} />
                      <span className="text-gray-100">Securities</span>
                    </div>
                    <div className="col-span-2 text-right text-indigo-300">{(summary?.netWorthMix?.securities*100 || 0).toFixed(1)}%</div>
                    <div className="col-span-2 text-right text-gray-100">{fmtCurrency(summary?.assetAllocation?.securities?.value ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-indigo-300">{fmtCurrency(summary?.assetAllocation?.securities?.value ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-gray-500">$0</div>
                  </div>

                  {/* Net Cash */}
                  <div className="grid grid-cols-12 px-2 py-2 hover:bg-gray-800/60 rounded">
                    <div className="col-span-4 flex items-center">
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: assetColors.cash }} />
                      <span className="text-gray-100">Net Cash</span>
                    </div>
                    <div className="col-span-2 text-right text-green-300">{(summary?.netWorthMix?.netCash*100 || 0).toFixed(1)}%</div>
                    <div className="col-span-2 text-right text-gray-100">{fmtCurrency(summary?.altNetWorth?.netCash ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-green-300">{fmtCurrency(summary?.assetAllocation?.cash?.value ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-red-300">
                      {summary?.liabilities?.creditCard > 0
                        ? `-${fmtCurrency(summary?.liabilities?.creditCard, showInThousands).slice(1)}`
                        : '$0'}
                    </div>
                  </div>

                  {/* Crypto */}
                  <div className="grid grid-cols-12 px-2 py-2 hover:bg-gray-800/60 rounded">
                    <div className="col-span-4 flex items-center">
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: assetColors.crypto }} />
                      <span className="text-gray-100">Crypto</span>
                    </div>
                    <div className="col-span-2 text-right text-purple-300">{(summary?.netWorthMix?.crypto*100 || 0).toFixed(1)}%</div>
                    <div className="col-span-2 text-right text-gray-100">{fmtCurrency(summary?.assetAllocation?.crypto?.value ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-purple-300">{fmtCurrency(summary?.assetAllocation?.crypto?.value ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-gray-500">$0</div>
                  </div>

                  {/* Metals */}
                  <div className="grid grid-cols-12 px-2 py-2 hover:bg-gray-800/60 rounded">
                    <div className="col-span-4 flex items-center">
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: assetColors.metals }} />
                      <span className="text-gray-100">Metals</span>
                    </div>
                    <div className="col-span-2 text-right text-amber-300">{(summary?.netWorthMix?.metals*100 || 0).toFixed(1)}%</div>
                    <div className="col-span-2 text-right text-gray-100">{fmtCurrency(summary?.assetAllocation?.metals?.value ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-amber-300">{fmtCurrency(summary?.assetAllocation?.metals?.value ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-gray-500">$0</div>
                  </div>

                  {/* Real Estate */}
                  <div className="grid grid-cols-12 px-2 py-2 hover:bg-gray-800/60 rounded">
                    <div className="col-span-4 flex items-center">
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: assetColors.real_estate }} />
                      <span className="text-gray-100">Real Estate</span>
                    </div>
                    <div className="col-span-2 text-right text-teal-300">{(summary?.netWorthMix?.realEstateEquity*100 || 0).toFixed(1)}%</div>
                    <div className="col-span-2 text-right text-gray-100">{fmtCurrency(summary?.altNetWorth?.realEstate ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-teal-300">{fmtCurrency((summary?.altNetWorth?.realEstate ?? 0) + (summary?.liabilities?.mortgage ?? 0), showInThousands)}</div>
                    <div className="col-span-2 text-right text-red-300">
                      {summary?.liabilities?.mortgage > 0
                        ? `-${fmtCurrency(summary?.liabilities?.mortgage, showInThousands).slice(1)}`
                        : '$0'}
                    </div>
                  </div>

                  {/* Net Other Assets */}
                  <div className="grid grid-cols-12 px-2 py-2 hover:bg-gray-800/60 rounded">
                    <div className="col-span-4 flex items-center">
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: assetColors.other }} />
                      <span className="text-gray-100">Net Other Assets</span>
                    </div>
                    <div className="col-span-2 text-right text-gray-300">{(summary?.netWorthMix?.netOtherAssets*100 || 0).toFixed(1)}%</div>
                    <div className="col-span-2 text-right text-gray-100">{fmtCurrency(summary?.altNetWorth?.netOtherAssets ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-gray-300">
                      {fmtCurrency(
                        (summary?.assetAllocation?.otherAssets?.value ?? 0) -
                        ((summary?.altNetWorth?.realEstate ?? 0) + (summary?.liabilities?.mortgage ?? 0)),
                        showInThousands
                      )}
                    </div>
                    <div className="col-span-2 text-right text-red-300">
                      {(() => {
                        const other = (summary?.liabilities?.total ?? 0) - (summary?.liabilities?.creditCard ?? 0) - (summary?.liabilities?.mortgage ?? 0);
                        return other > 0 ? `-${fmtCurrency(other, showInThousands).slice(1)}` : '$0';
                      })()}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="mt-2 border-t border-gray-800 pt-2 grid grid-cols-12 px-2 py-2 rounded bg-gray-800/40">
                    <div className="col-span-4 text-gray-100 font-semibold">Total</div>
                    <div className="col-span-2 text-right text-indigo-300 font-semibold">100.0%</div>
                    <div className="col-span-2 text-right text-gray-100 font-semibold">{fmtCurrency(summary?.netWorth ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-green-300 font-semibold">{fmtCurrency(summary?.totalAssets ?? 0, showInThousands)}</div>
                    <div className="col-span-2 text-right text-red-300 font-semibold">
                      {summary?.liabilities?.total > 0
                        ? `-${fmtCurrency(summary?.liabilities?.total, showInThousands).slice(1)}`
                        : '$0'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Risk & Concentration (JSON-safe) */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm">Portfolio Insights</h3>
                <Shield className="h-4 w-4 text-indigo-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-300">Portfolio Beta</div>
                  <div className="text-xl font-bold text-white mt-0.5">{(Number(risk.beta) || 1).toFixed(2)}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-300">Est. Volatility</div>
                  <div className="text-xl font-bold text-white mt-0.5">{fmtPct(((Number(risk.volatility) || 0) * 100))}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-300">Liquidity Ratio</div>
                  <div className="text-xl font-bold text-white mt-0.5">{fmtPct(((Number(risk.liquidityRatio) || 0) * 100))}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-300">Top-5 Concentration</div>
                  <div className="text-xl font-bold text-white mt-0.5">{fmtPct((Number(concentration.top5Pct) || 0) * 100)}</div>
                </div>
                <div className="rounded-lg bg-gray-800 p-3">
                  <div className="text-xs text-gray-300">Largest Position Weight</div>
                  <div className="text-xl font-bold text-white mt-0.5">{fmtPct((Number(concentration.largestWeight) || 0) * 100)}</div>
                </div>
                {risk.var95 != null && (
                  <div className="rounded-lg bg-gray-800 p-3">
                    <div className="text-xs text-gray-300">VaR (95%)</div>
                    <div className="text-xl font-bold text-white mt-0.5">{fmtCurrency(Number(risk.var95))}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Sector Allocation */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm">Sector Allocation</h3>
                <Landmark className="h-4 w-4 text-sky-400" />
              </div>
              <div className="h-64">
                {hasData(sectorAllocationData) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorAllocationData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" tick={{ fill:'#9ca3af' }} tickFormatter={(v)=>fmtPct(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fill:'#9ca3af' }} width={120} />
                      <Tooltip contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8, color:'#e5e7eb' }}
                               formatter={(v, n)=>[fmtPct(v), 'Weight']} />
                      <Bar dataKey="percentage" radius={[4,4,4,4]}>
                        {sectorAllocationData.map((s, i)=>(
                          <Cell key={i} fill={s.color || '#9ca3af'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">No sector data</div>
                )}
              </div>
            </div>

            {/* Top Positions & Institutions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white text-sm">Top Positions</h3>
                  <BarChart3 className="h-4 w-4 text-rose-400" />
                </div>
                <div className="space-y-2">
                  {topPositionsData.length ? topPositionsData.map((p, idx)=>(
                    <motion.div key={idx} whileHover={{ x: 2 }} className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-800/60">
                      <div className="flex items-center min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: assetColors[p.assetType] || assetColors.other }} />
                        <div className="min-w-0">
                          <div className="truncate text-sm text-gray-200">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.accountName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white">{fmtCurrency(p.value, showInThousands)}</div>
                        <div className={`text-xs ${p.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(p.gainLossPercent*100)}</div>
                      </div>
                    </motion.div>
                  )) : <div className="text-sm text-gray-500 py-3 text-center">No position data</div>}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white text-sm">Top Institutions</h3>
                  <Building2 className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  {institutionMixData.length ? institutionMixData.map((i, idx)=>(
                    <motion.div key={idx} whileHover={{ x: 2 }} className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-800/60">
                      <div className="flex items-center">
                        <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ background:i.color || '#6b7280' }} />
                        <div>
                          <div className="text-sm text-gray-200">{i.name}</div>
                          <div className="text-xs text-gray-500">{i.accountCount} {i.accountCount === 1 ? 'account' : 'accounts'} • {i.positionCount} positions</div>
                        </div>
                      </div>
                      <div className="text-sm text-white">{fmtPct((i.percentage || 0)*100)}</div>
                    </motion.div>
                  )) : <div className="text-sm text-gray-500 py-3 text-center">No institution data</div>}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
