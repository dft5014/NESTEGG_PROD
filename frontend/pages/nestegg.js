// pages/portfolio.js
import { useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart as RechartsPieChart, Pie, Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Wallet, Gift, Droplet, Shield, Home, Building2, BarChart3,
  Banknote, Coins, Package, MinusCircle, Layers, Briefcase, Gauge, Activity, PieChart as PieChartIcon,
} from 'lucide-react';

// Data hooks
import { useDataStore } from '@/store/DataStore';
import { usePortfolioSummary, usePortfolioTrends } from '@/store/hooks';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const timeframeOptions = [
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' },
];

const assetColors = {
  securities: '#4f46e5',
  security: '#4f46e5',
  cash: '#10b981',
  crypto: '#8b5cf6',
  bond: '#ec4899',
  metal: '#f59e0b',
  metals: '#f59e0b',
  currency: '#3b82f6',
  real_estate: '#14b8a6',
  other: '#6b7280',
  other_assets: '#6b7280',
};

const sectorColors = {
  Technology: '#6366f1',
  'Financial Services': '#0ea5e9',
  Healthcare: '#10b981',
  'Consumer Cyclical': '#f59e0b',
  'Communication Services': '#8b5cf6',
  Industrials: '#64748b',
  'Consumer Defensive': '#14b8a6',
  Energy: '#f97316',
  'Basic Materials': '#f43f5e',
  'Real Estate': '#84cc16',
  Utilities: '#0284c7',
  Unknown: '#9ca3af',
  Other: '#9ca3af',
};

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------
const formatCurrency = (value, inThousands = false) => {
  if (value === null || value === undefined) return '-';
  const v = Number(value) || 0;
  if (inThousands) {
    const thousands = v / 1000;
    return `$${thousands.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
};

const formatPct = (v, sign = true, digits = 2) => {
  if (v === null || v === undefined || isNaN(v)) return '0%';
  const val = Number(v);
  const pct = (val).toFixed(digits);
  return `${sign && val > 0 ? '+' : ''}${pct}%`;
};

const axisMoney = (value) => {
  const v = Number(value) || 0;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toLocaleString()}`;
};

// -----------------------------------------------------------------------------
// Small UI Primitives
// -----------------------------------------------------------------------------
const Section = ({ title, icon, right, children }) => (
  <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Delta = ({ value, className = '' }) => {
  if (value === null || value === undefined) return <span className={`text-gray-400 ${className}`}>—</span>;
  const isUp = value > 0;
  const isDown = value < 0;
  return (
    <span className={`inline-flex items-center text-sm font-medium ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-gray-400'} ${className}`}>
      {isUp && <ArrowUpRight className="h-4 w-4 mr-1" />}
      {isDown && <ArrowDownRight className="h-4 w-4 mr-1" />}
      {formatPct(value * 100)}
    </span>
  );
};

const KPI = ({ label, value, delta, icon }) => (
  <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {delta}
      </div>
      <div className="p-2 bg-gray-800 rounded-xl text-indigo-300">{icon}</div>
    </div>
  </div>
);

const TimeframeSelector = ({ selected, onChange }) => (
  <div className="flex p-1 bg-gray-800 rounded-xl">
    {timeframeOptions.map((t) => (
      <motion.button
        key={t.id}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onChange(t.id)}
        className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
          selected === t.id ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700/60'
        }`}
      >
        {t.label}
      </motion.button>
    ))}
  </div>
);

// -----------------------------------------------------------------------------
// Main Page
// -----------------------------------------------------------------------------
export default function Portfolio() {
  const router = useRouter();
  useDataStore(); // keep store hydrated if needed

  const [timeframe, setTimeframe] = useState('1m');
  const [showInThousands, setShowInThousands] = useState(true);

  const {
    summary,
    topPositions,
    accountDiversification,
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
  } = usePortfolioSummary();

  const { trends } = usePortfolioTrends();

  // Derived data ----------------------------------------------------------------
  const chartData = useMemo(() => {
    if (!trends?.chartData || !Array.isArray(trends.chartData)) return [];
    return trends.chartData.map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: day.netWorth,
      totalAssets: day.totalAssets,
      totalLiabilities: day.totalLiabilities,
      costBasis: summary?.totalCostBasis || 0,
      altLiquidNetWorth: day.altLiquidNetWorth || 0,
      altRetirementAssets: day.altRetirementAssets || 0,
      altIlliquidNetWorth: day.altIlliquidNetWorth || 0,
    }));
  }, [trends?.chartData, summary?.totalCostBasis]);

  const cashFlowTrendData = useMemo(() => {
    if (!history?.length) return [];
    const parsed = history
      .filter((h) => h?.net_cash_basis_metrics?.net_cash_position !== null && h?.net_cash_basis_metrics?.net_cash_position !== undefined)
      .map((h) => {
        const dateStr = h.date || h.snapshot_date;
        const [y, m, d] = (dateStr || '').split('-').map((n) => parseInt(n));
        const dt = new Date(y, (m || 1) - 1, d || 1);
        return {
          date: dateStr,
          displayDate: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          netCashPosition: h.net_cash_basis_metrics.net_cash_position,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return parsed;
  }, [history]);

  const netWorthMixData = useMemo(() => {
    if (!summary) return [];
    const mix = [
      { name: 'Securities', value: summary.assetAllocation.securities.value, percentage: summary.netWorthMix.securities * 100, color: assetColors.securities },
      { name: 'Net Cash', value: summary.altNetWorth.netCash, percentage: summary.netWorthMix.netCash * 100, color: assetColors.cash },
      { name: 'Crypto', value: summary.assetAllocation.crypto.value, percentage: summary.netWorthMix.crypto * 100, color: assetColors.crypto },
      { name: 'Metals', value: summary.assetAllocation.metals.value, percentage: summary.netWorthMix.metals * 100, color: assetColors.metals },
      { name: 'Real Estate', value: summary.altNetWorth.realEstate, percentage: summary.netWorthMix.realEstateEquity * 100, color: assetColors.real_estate },
      { name: 'Other Assets', value: summary.altNetWorth.netOtherAssets, percentage: summary.netWorthMix.netOtherAssets * 100, color: assetColors.other },
    ].filter((i) => (i.value || 0) > 0 || (i.percentage || 0) > 0);
    return mix;
  }, [summary]);

  const sectorAllocationData = useMemo(() => {
    if (!rawSectorAllocation || typeof rawSectorAllocation !== 'object') return [];
    return Object.entries(rawSectorAllocation)
      .filter(([, d]) => d?.value > 0)
      .map(([name, d]) => ({
        name: name || 'Unknown',
        value: d.value,
        percentage: (d.percentage || 0) * 100,
        positionCount: d.position_count || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [rawSectorAllocation]);

  const institutionMixData = useMemo(() => {
    if (!rawInstitutionAllocation?.length) return [];
    return rawInstitutionAllocation
      .filter((r) => r?.value > 0)
      .map((inst) => ({
        name: inst.institution,
        value: inst.value,
        percentage: inst.percentage || 0,
        accountCount: inst.account_count || 0,
        positionCount: inst.position_count || 0,
        color: inst.primary_color || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rawInstitutionAllocation]);

  const topPositionsData = useMemo(() => {
    if (!topPositions?.length) return [];
    return topPositions.slice(0, 5).map((p) => ({
      name: p.name || p.identifier,
      identifier: p.identifier,
      value: p.current_value || p.value,
      gainLossPercent: p.gain_loss_percent || 0,
      accountName: p.account_name,
      assetType: p.asset_type || 'security',
      percentage: p.percentage || 0,
    }));
  }, [topPositions]);

  // Loading & Error ------------------------------------------------------------
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
          <h1 className="text-xl font-semibold text-white mb-2">Unable to load</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main Values ----------------------------------------------------------------
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

  // Tooltips -------------------------------------------------------------------
  const NetWorthTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const assets = payload.find((p) => p.dataKey === 'totalAssets')?.value ?? null;
    const liabs = payload.find((p) => p.dataKey === 'totalLiabilities')?.value ?? null;

    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
        <p className="text-white font-medium">{label}</p>
        <p className="text-indigo-400 mt-1">Net Worth: {formatCurrency(payload[0].value)}</p>
        {assets !== null && <p className="text-emerald-400">Assets: {formatCurrency(assets)}</p>}
        {liabs !== null && liabs > 0 && <p className="text-rose-400">Liabilities: {formatCurrency(liabs)}</p>}
      </div>
    );
  };

  const ComponentsTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const labelMap = {
      altLiquidNetWorth: 'Liquid Net Worth',
      altRetirementAssets: 'Retirement Assets',
      altIlliquidNetWorth: 'Illiquid Net Worth',
    };
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((e, i) => (
          <div key={i} className="flex justify-between gap-6">
            <span className="text-gray-300">{labelMap[e.dataKey]}</span>
            <span className="text-white">{formatCurrency(e.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const AllocationTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm">
        <p className="text-white font-medium">{d.name}</p>
        <p className="text-indigo-400">{(d.percentage || 0).toFixed(1)}%</p>
        <p className="text-gray-300">{formatCurrency(d.value)}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-slate-900 text-white">
      <Head>
        <title>NestEgg | Portfolio</title>
        <meta name="description" content="Your financial command center" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-sm text-gray-400">
              Last updated: {lastFetched ? new Date(lastFetched).toLocaleString() : '—'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
            </div>
            <button
              onClick={refreshData}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 transition ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <KPI
            label="Net Worth"
            value={formatCurrency(netWorth)}
            delta={<Delta value={periodChanges?.['1d']?.netWorthPercent} className="mt-1" />}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPI
            label="Total Assets"
            value={formatCurrency(totalAssets)}
            delta={<span className="text-xs text-gray-400 mt-1 block">{formatCurrency(liquidAssets)} liquid</span>}
            icon={<Wallet className="h-5 w-5" />}
          />
          <KPI
            label="Unrealized Gain"
            value={formatCurrency(unrealizedGain)}
            delta={<Delta value={unrealizedGainPct} className="mt-1" />}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <KPI
            label="Annual Income"
            value={formatCurrency(annualIncome)}
            delta={<span className="text-xs text-amber-300 mt-1 block">{formatPct(yieldPct * 100)} yield</span>}
            icon={<Gift className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Charts & Deep Metrics */}
          <div className="lg:col-span-8 space-y-6">
            <Section
              title="Trended Net Worth"
              icon={<BarChart3 className="h-5 w-5 text-indigo-300" />}
              right={<span className="text-sm text-gray-400">{timeframe.toUpperCase()}</span>}
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    <ReferenceLine y={chartData?.[0]?.value || 0} stroke="#334155" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section
              title="Net Worth Components"
              icon={<Layers className="h-5 w-5 text-indigo-300" />}
              right={
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-blue-500" />Liquid</div>
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />Retirement</div>
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-purple-500" />Illiquid</div>
                </div>
              }
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Liquid</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary?.altLiquidNetWorth || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Retirement</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary?.altRetirementAssets || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Illiquid</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary?.altIlliquidNetWorth || 0)}</p>
                </div>
              </div>
            </Section>

            <Section
              title="Asset Allocation"
              icon={<PieChartIcon className="h-5 w-5 text-indigo-300" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Securities */}
                <AssetClassCard
                  type="security"
                  data={{
                    ...summary?.assetAllocation?.securities,
                    name: 'Securities',
                    ...assetPerformance?.security,
                  }}
                  icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
                  colorClass="bg-blue-500"
                />
                {/* Cash */}
                <AssetClassCard
                  type="cash"
                  data={{
                    ...summary?.assetAllocation?.cash,
                    name: 'Cash',
                  }}
                  icon={<Banknote className="h-5 w-5 text-emerald-400" />}
                  colorClass="bg-emerald-500"
                />
                {/* Crypto */}
                <AssetClassCard
                  type="crypto"
                  data={{
                    ...summary?.assetAllocation?.crypto,
                    name: 'Crypto',
                    ...assetPerformance?.crypto,
                  }}
                  icon={<Coins className="h-5 w-5 text-purple-400" />}
                  colorClass="bg-purple-500"
                />
                {/* Metals */}
                <AssetClassCard
                  type="metal"
                  data={{
                    ...summary?.assetAllocation?.metals,
                    name: 'Metals',
                    ...assetPerformance?.metal,
                  }}
                  icon={<Package className="h-5 w-5 text-amber-400" />}
                  colorClass="bg-amber-500"
                />
                {/* Other Assets */}
                <AssetClassCard
                  type="other"
                  data={{
                    ...summary?.assetAllocation?.otherAssets,
                    name: 'Other Assets',
                    ...assetPerformance?.other_assets,
                  }}
                  icon={<Home className="h-5 w-5 text-slate-300" />}
                  colorClass="bg-slate-500"
                />
                {/* Liabilities */}
                {(summary?.liabilities?.total || 0) > 0 && (
                  <AssetClassCard
                    type="liability"
                    data={{
                      value: summary?.liabilities?.total,
                      percentage: summary?.ratios?.debtToAssetRatio,
                      costBasis: summary?.liabilities?.total,
                      count: summary?.liabilities?.counts?.total,
                      name: 'Total Liabilities',
                    }}
                    icon={<MinusCircle className="h-5 w-5 text-rose-400" />}
                    colorClass="bg-rose-500"
                  />
                )}
              </div>
            </Section>

            {netCashBasisMetrics && (
              <Section title="Personal Cash Flow" icon={<Activity className="h-5 w-5 text-emerald-300" />}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div className="text-sm text-gray-400">Net Cash Position</div>
                  <div className="text-2xl font-bold">{formatCurrency(netCashBasisMetrics.net_cash_position)}</div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlowTrendData}>
                      <defs>
                        <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="displayDate" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                      <Tooltip
                        contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 8, color: '#e5e7eb' }}
                        formatter={(v) => [formatCurrency(v), 'Net Cash Position']}
                      />
                      <Area type="monotone" dataKey="netCashPosition" stroke="#10b981" strokeWidth={2} fill="url(#cf)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            )}

            <Section title="Portfolio Insights" icon={<Shield className="h-5 w-5 text-indigo-300" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <StatRow label="Total Positions" value={summary?.positionStats?.totalCount} icon={<Layers className="h-4 w-4" />} />
                  <StatRow label="Active Accounts" value={summary?.positionStats?.activeAccountCount} icon={<Briefcase className="h-4 w-4" />} />
                  <StatRow
                    label="Liquidity Ratio"
                    value={formatPct((riskMetrics?.liquidity_ratio || 0) * 100)}
                    icon={<Droplet className="h-4 w-4" />}
                  />
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2 text-yellow-300">
                      <Gauge className="h-4 w-4" />
                      <span className="text-sm font-medium">Concentration Risk</span>
                    </div>
                    <Row label="Top 5 Positions" value={formatPct((concentrationMetrics?.top_5_concentration || 0) * 100)} />
                    <Row label="Largest Position" value={formatPct((concentrationMetrics?.largest_position_weight || 0) * 100)} />
                  </div>
                  <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2 text-indigo-300">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm font-medium">Risk Metrics</span>
                    </div>
                    <Row label="Portfolio Beta" value={(riskMetrics?.portfolio_beta ?? 1).toFixed(2)} />
                    <Row label="Est. Volatility" value={formatPct((riskMetrics?.volatility_estimate || 0) * 100)} />
                  </div>
                </div>
              </div>
            </Section>
          </div>

          {/* RIGHT: Mix, Tables & Lists */}
          <div className="lg:col-span-4 space-y-6">
            <Section
              title="Net Worth Mix"
              icon={<PieChartIcon className="h-5 w-5 text-indigo-300" />}
              right={
                <button
                  onClick={() => setShowInThousands((s) => !s)}
                  className="text-xs px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                >
                  {showInThousands ? 'Show $' : 'Show k'}
                </button>
              }
            >
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={netWorthMixData} cx="50%" cy="50%" innerRadius={56} outerRadius={80} paddingAngle={3} dataKey="value">
                      {netWorthMixData.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<AllocationTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 space-y-2">
                {netWorthMixData.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                      <span className="text-gray-300">{row.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-indigo-300 w-12 text-right">{row.percentage.toFixed(1)}%</span>
                      <span className="text-white w-28 text-right">{formatCurrency(row.value, showInThousands)}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-800 pt-2 mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total</span>
                  <div className="flex items-center gap-4">
                    <span className="text-indigo-300 w-12 text-right">100%</span>
                    <span className="text-white w-28 text-right">{formatCurrency(netWorth, showInThousands)}</span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Invested Amount" icon={<BarChart3 className="h-5 w-5 text-indigo-300" />}>
              <div className="grid grid-cols-12 text-xs text-gray-400 px-2 pb-2">
                <div className="col-span-4">Asset Class</div>
                <div className="col-span-3 text-right">Market</div>
                <div className="col-span-3 text-right">Cost</div>
                <div className="col-span-2 text-right">P/L</div>
              </div>
              <InvestedRow
                color="#4f46e5"
                name="Securities"
                market={summary?.assetAllocation?.securities?.value}
                cost={summary?.assetAllocation?.securities?.costBasis}
                gain={summary?.assetAllocation?.securities?.gainLoss}
                gainPct={summary?.assetAllocation?.securities?.gainLossPercent}
                showInThousands={showInThousands}
              />
              <InvestedRow
                color="#10b981"
                name="Cash"
                market={summary?.assetAllocation?.cash?.value}
                cost={summary?.assetAllocation?.cash?.costBasis}
                showInThousands={showInThousands}
              />
              <InvestedRow
                color="#8b5cf6"
                name="Crypto"
                market={summary?.assetAllocation?.crypto?.value}
                cost={summary?.assetAllocation?.crypto?.costBasis}
                gain={summary?.assetAllocation?.crypto?.gainLoss}
                gainPct={summary?.assetAllocation?.crypto?.gainLossPercent}
                showInThousands={showInThousands}
              />
              <InvestedRow
                color="#f59e0b"
                name="Metals"
                market={summary?.assetAllocation?.metals?.value}
                cost={summary?.assetAllocation?.metals?.costBasis}
                gain={summary?.assetAllocation?.metals?.gainLoss}
                gainPct={summary?.assetAllocation?.metals?.gainLossPercent}
                showInThousands={showInThousands}
              />
              <InvestedRow
                color="#6b7280"
                name="Other Assets"
                market={summary?.assetAllocation?.otherAssets?.value}
                cost={summary?.assetAllocation?.otherAssets?.costBasis}
                gain={summary?.assetAllocation?.otherAssets?.gainLoss}
                gainPct={summary?.assetAllocation?.otherAssets?.gainLossPercent}
                showInThousands={showInThousands}
              />
              <div className="border-t border-gray-800 mt-2 pt-2 grid grid-cols-12 px-2 text-sm">
                <div className="col-span-4 font-semibold">Total</div>
                <div className="col-span-3 text-right text-indigo-300">{formatCurrency(summary?.totalAssets || 0, showInThousands)}</div>
                <div className="col-span-3 text-right text-gray-300">{formatCurrency(summary?.totalCostBasis || 0, showInThousands)}</div>
                <div className="col-span-2 text-right">
                  <span className={`${(summary?.unrealizedGain || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-medium`}>
                    {formatCurrency(summary?.unrealizedGain || 0, showInThousands)}{' '}
                    <span className="text-xs">({((summary?.unrealizedGainPercent || 0) * 100).toFixed(1)}%)</span>
                  </span>
                </div>
              </div>
            </Section>

            <Section title="Top Individual Positions" icon={<BarChart3 className="h-5 w-5 text-rose-300" />}>
              <div className="space-y-2">
                {topPositionsData?.length ? (
                  topPositionsData.map((p, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 2 }}
                      className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-800/60"
                    >
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
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No position data.</p>
                )}
              </div>
            </Section>

            <Section title="Top Institutions" icon={<Building2 className="h-5 w-5 text-indigo-300" />}>
              <div className="space-y-2">
                {institutionMixData?.length ? (
                  institutionMixData.map((inst, i) => (
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
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No institution data.</p>
                )}
              </div>
            </Section>

            {sectorAllocationData?.length > 0 && (
              <Section title="Sector Breakdown" icon={<PieChartIcon className="h-5 w-5 text-indigo-300" />}>
                <div className="space-y-1">
                  {sectorAllocationData.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-gray-800/50">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: sectorColors[s.name] || sectorColors.Other }} />
                        <span className="text-gray-300">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{s.positionCount} pos</span>
                        <span className="font-medium">{s.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components (clean + reuse)
// -----------------------------------------------------------------------------
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-gray-300">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function StatRow({ label, value, icon }) {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-white font-medium mt-0.5">{value ?? '—'}</p>
      </div>
      <div className="text-indigo-300">{icon}</div>
    </div>
  );
}

function InvestedRow({ color, name, market = 0, cost = 0, gain = null, gainPct = null, showInThousands }) {
  const hasPL = gain !== null && gainPct !== null && gainPct !== undefined;
  const up = (gain || 0) >= 0;
  return (
    <div className="grid grid-cols-12 px-2 py-2 rounded-lg hover:bg-gray-800/50">
      <div className="col-span-4 flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm text-gray-200">{name}</span>
      </div>
      <div className="col-span-3 text-right text-gray-100">{formatCurrency(market || 0, showInThousands)}</div>
      <div className="col-span-3 text-right text-gray-300">{formatCurrency(cost || 0, showInThousands)}</div>
      <div className="col-span-2 text-right">
        {hasPL ? (
          <span className={`${up ? 'text-emerald-400' : 'text-rose-400'} text-sm font-medium`}>
            {formatCurrency(gain || 0, showInThousands)} <span className="text-xs">({((gainPct || 0) * 100).toFixed(1)}%)</span>
          </span>
        ) : (
          <span className="text-gray-500 text-sm">—</span>
        )}
      </div>
    </div>
  );
}

function AssetClassCard({ type, data = {}, icon, colorClass }) {
  const perf = {
    '1D': data?.daily?.percent_change || 0,
    '1W': data?.weekly?.percent_change || 0,
    '1M': data?.monthly?.percent_change || 0,
    YTD: data?.ytd?.percent_change || 0,
  };

  const pl = Number(data?.gainLoss) || 0;
  const plPct = (data?.gainLossPercent || 0) * 100;

  return (
    <motion.div whileHover={{ y: -2 }} className="bg-gray-900/70 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gray-800">{icon}</div>
          <div>
            <h4 className="text-sm font-semibold">{data?.name || '—'}</h4>
            <p className="text-xs text-gray-400">
              {type === 'liability' ? 'Outstanding Balance' : 'Market Value'}
            </p>
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
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${
                v > 0 ? 'bg-emerald-500/10 text-emerald-400' : v < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-gray-700/40 text-gray-400'
              }`}>
                {v > 0 ? '+' : ''}{v.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
