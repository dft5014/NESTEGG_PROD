// pages/command-center.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap, Brush, ScatterChart, Scatter
} from 'recharts';

// ✅ DataStore hooks (lightweight, no useSnapshot/valtio)
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { useAccounts } from '@/store/hooks/useAccounts';
// Snapshots are heavy; only used on-demand for Comparison
import { useSnapshots } from '@/store/hooks/useSnapshots';

// Prefer your shared formatters if available
import { formatCurrency, formatPercentage, formatNumber } from '@/utils/formatters';

// -------------------------- Animations --------------------------
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.08 } },
};
const itemVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

// -------------------------- Utils --------------------------
const fmtDateShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtDateFull = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// Fallbacks if formatters not present
const _fmtCurr = (v) => (typeof formatCurrency === 'function' ? formatCurrency(v) : (v == null ? '-' : v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })));
const _fmtPct = (v, showSign = true) => {
  if (typeof formatPercentage === 'function') return formatPercentage(v, showSign);
  if (v == null) return '-';
  const sign = showSign && v > 0 ? '+' : '';
  return `${sign}${Number(v).toFixed(2)}%`;
};

// Colors (align with your app theme)
const colors = {
  asset: {
    security: '#6366f1', cash: '#10b981', crypto: '#8b5cf6', metal: '#f59e0b',
    realestate: '#ef4444', bond: '#ec4899', commodity: '#06b6d4', other: '#64748b',
  },
  performance: { positive: '#10b981', negative: '#ef4444', neutral: '#6b7280' },
  chart: { primary: '#6366f1', secondary: '#8b5cf6', tertiary: '#06b6d4' },
};

// -------------------------- Small components --------------------------
const AnimatedNumber = ({ value, format = 'currency', duration = 900, decimals = 0 }) => {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current ?? 0;
    const end = value ?? 0;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const cur = start + (end - start) * eased;
      setDisplay(cur);
      if (p < 1) requestAnimationFrame(step);
      else prev.current = end;
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  if (format === 'currency') return <>{_fmtCurr(display)}</>;
  if (format === 'percentage') return <>{_fmtPct(display)}</>;
  return <>{Number(display).toFixed(decimals)}</>;
};

const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-sm font-medium mb-2">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-300 text-sm">{p.name}:</span>
          </div>
          <span className="text-white text-sm font-medium">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </motion.div>
  );
};

const MetricCard = ({ title, value, change, subtitle, trend, color = 'from-indigo-500 to-purple-600', icon }) => {
  const isPos = (change ?? 0) >= 0;
  const sparkColor = isPos ? colors.performance.positive : colors.performance.negative;
  return (
    <motion.div variants={itemVariants} whileHover="hover" className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 translate-x-8 -translate-y-8">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className={`w-full h-full rounded-full opacity-10 bg-gradient-to-br ${color}`} />
      </div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">{title}</p>
            {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold text-white"><AnimatedNumber value={value} format="currency" /></h3>
              {change != null && (
                <span className={`text-sm font-medium ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                  {isPos ? '↑' : '↓'} {_fmtPct(Math.abs(change), false)}
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} opacity-20`}>{icon}</div>
        </div>
        {trend?.length ? (
          <div className="h-12 -mx-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id={`g-${title.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparkColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={sparkColor} fill={`url(#g-${title.replace(/\s/g, '-')})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

// -------------------------- Main --------------------------
export default function CommandCenter() {
  const router = useRouter();

  // Lightweight store hooks
  const { summary, history, loading: sumLoading, error: sumError, lastUpdatedAt } = usePortfolioSummary();
  const { trends, loading: trendsLoading } = usePortfolioTrends();
  const { positions: groupedPositions, summary: gpSummary, loading: gpLoading } = useGroupedPositions();
  const { accounts, loading: accountsLoading } = useAccounts();

  // Heavy snapshots (used only for Comparison, on demand)
  const { snapshots, snapshotsByDate, dates, isLoading: snapsLoading, error: snapsError, refetch: loadSnapshots, lastFetched } = useSnapshots();

  // State (no auto-refresh; rely on store)
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'trends' | 'comparison'
  const [viewMode, setViewMode] = useState('grid'); // grid | table | chart
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '30d',
    selectedAccounts: new Set(),          // filled when accounts load
    selectedAssetTypes: new Set(['security', 'crypto', 'cash', 'metal', 'realestate']),
    groupBy: 'asset',                     // asset | account | sector
    searchTerm: ''
  });
  const [compareOptions, setCompareOptions] = useState({ date1: null, date2: null, showDifference: true });

  // Seed filters once accounts are available
  useEffect(() => {
    if (accounts?.length && filters.selectedAccounts.size === 0) {
      setFilters((f) => ({ ...f, selectedAccounts: new Set(accounts.map(a => String(a.id ?? a.account_id ?? a.accountId))) }));
    }
  }, [accounts]);

  // When entering Comparison, lazily load snapshots if missing
  useEffect(() => {
    if (activeSection === 'comparison' && (!dates || dates.length === 0) && !snapsLoading && !snapsError) {
      loadSnapshots?.();
    }
  }, [activeSection, dates, snapsLoading, snapsError, loadSnapshots]);

  // -------------- Derived overview (from summary + grouped live) --------------
  const overviewData = useMemo(() => {
    if (!summary) return null;

    // Totals (prefer summary from store)
    const totalValue = summary?.netWorth ?? summary?.total_value ?? null;
    const totalIncome = summary?.totalIncome ?? summary?.income ?? null;
    const totalGainLoss = summary?.unrealized ?? summary?.total_gain_loss ?? null;
    const totalCostBasis = summary?.costBasis ?? summary?.total_cost_basis ?? null;
    const pct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    // Trend (30d) from summary.history or trends.chartData
    const histArr = (history?.netWorthSeries ?? history?.series ?? trends?.chartData ?? [])
      .map(d => ({ date: d.date ?? d.label ?? d.t, value: d.netWorth ?? d.value ?? d.v ?? 0 }))
      .filter(d => d.date && Number.isFinite(d.value));
    const last30 = histArr.slice(-30);

    // Daily change: last minus prior
    let daily = { value: 0, absolute: 0 };
    if (histArr.length >= 2) {
      const a = histArr[histArr.length - 2].value;
      const b = histArr[histArr.length - 1].value;
      daily = { value: a > 0 ? ((b - a) / a) * 100 : 0, absolute: b - a };
    }

    // Asset allocation (if gpSummary provides) else derive coarse allocation from groupedPositions
    const assetAllocation = {};
    if (groupedPositions?.length) {
      for (const p of groupedPositions) {
        const type = p.asset_type || p.type || 'other';
        const v = p.current_value ?? p.value ?? 0;
        const gl = p.gain_loss_amt ?? p.gl ?? 0;
        assetAllocation[type] = assetAllocation[type] || { value: 0, count: 0, gainLoss: 0 };
        assetAllocation[type].value += v;
        assetAllocation[type].count += 1;
        assetAllocation[type].gainLoss += gl;
      }
    }

    // Top positions by value (from groupedPositions)
    const topPositions = [...(groupedPositions ?? [])]
      .filter(p => (p.current_value ?? 0) > 0)
      .sort((a, b) => (b.current_value ?? 0) - (a.current_value ?? 0))
      .slice(0, 10);

    // Position count
    const positionCount = gpSummary?.positionCount ?? gpSummary?.positions ?? groupedPositions?.length ?? 0;

    return {
      totalValue, totalIncome, totalGainLoss, totalCostBasis,
      totalGainLossPercent: pct,
      trendData: last30,
      assetAllocation,
      positionCount,
      dailyChange: daily,
      topPositions,
    };
  }, [summary, history, trends, groupedPositions, gpSummary]);

  // -------------- Trends data (from trends + filters) --------------
  const trendData = useMemo(() => {
    // Use trends.chartData from store, fallback to summary.history
    const base = trends?.chartData?.length ? trends.chartData : (history?.netWorthSeries ?? []);
    if (!base?.length) return { totals: [], yDomain: [0, 1] };

    // Build totals: [{date, value, gainLoss, gainLossPercent}]
    const totals = base
      .map(p => ({
        date: p.date ?? p.label,
        value: p.netWorth ?? p.value ?? 0,
        gainLoss: p.unrealized ?? p.gainLoss ?? 0,
        gainLossPercent: p.pct ?? (p.percent ?? 0)
      }))
      .filter(d => d.date);

    // Date-range slice
    const now = new Date();
    const cutoff = new Date();
    switch (filters.dateRange) {
      case '7d': cutoff.setDate(now.getDate() - 7); break;
      case '30d': cutoff.setDate(now.getDate() - 30); break;
      case '90d': cutoff.setDate(now.getDate() - 90); break;
      case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
      case 'ytd': cutoff.setMonth(0, 1); break;
      default: break; // all
    }
    const sliced = filters.dateRange === 'all' ? totals : totals.filter(d => new Date(d.date) >= cutoff);

    // yDomain padding
    let min = Infinity, max = -Infinity;
    for (const t of sliced) { if (t.value < min) min = t.value; if (t.value > max) max = t.value; }
    const pad = Math.max(1, (max - min) * 0.1);
    const yDomain = [Math.max(0, min - pad), max + pad];

    return { totals: sliced, yDomain };
  }, [trends, history, filters.dateRange]);

  // ---------------- Comparison (uses snapshots lazily) ----------------
  const comparisonData = useMemo(() => {
    if (!dates?.length || !snapshotsByDate || !compareOptions.date1 || !compareOptions.date2) return [];
    const s1 = snapshotsByDate[compareOptions.date1];
    const s2 = snapshotsByDate[compareOptions.date2];
    if (!s1?.positions || !s2?.positions) return [];

    const map = new Map();
    const keyFor = (p) => p.original_id || `${p.asset_type}|${p.identifier || p.ticker || p.name}|${p.account_id}`;

    const add = (snapshot, tag) => {
      Object.values(snapshot.positions).forEach((p) => {
        if (!p) return;
        if (!filters.selectedAssetTypes.has(p.asset_type)) return;
        if (filters.selectedAccounts.size && !filters.selectedAccounts.has(String(p.account_id))) return;
        const k = keyFor(p);
        const cur = map.get(k) || { key: k };
        cur[`${tag}`] = p;
        map.set(k, cur);
      });
    };

    add(s1, 'a'); add(s2, 'b');

    const rows = [];
    for (const [, v] of map) {
      const A = v.a, B = v.b;
      const base = A || B;
      if (!base) continue;
      const value1 = A?.current_value ?? 0;
      const value2 = B?.current_value ?? 0;
      const delta = value2 - value1;
      const pct = value1 > 0 ? (delta / value1) * 100 : (value2 > 0 ? 100 : 0);
      rows.push({
        groupKey: filters.groupBy === 'asset' ? (base.asset_type || 'other') :
                  filters.groupBy === 'account' ? (base.account_name || 'Unknown') :
                  (base.sector || 'Unknown'),
        identifier: B?.identifier || A?.identifier || B?.ticker || A?.ticker || base.name,
        name: B?.name || A?.name,
        account_name: B?.account_name || A?.account_name,
        asset_type: base.asset_type,
        sector: base.sector,
        value1, value2, delta, pct,
        quantity1: A?.quantity ?? 0, quantity2: B?.quantity ?? 0,
        price1: A?.current_price ?? 0, price2: B?.current_price ?? 0,
        isNew: !A && !!B, isSold: !!A && !B,
      });
    }

    const grouped = {};
    for (const r of rows) {
      const k = r.groupKey;
      grouped[k] = grouped[k] || { key: k, positions: [], value1: 0, value2: 0, delta: 0 };
      grouped[k].positions.push(r);
      grouped[k].value1 += r.value1;
      grouped[k].value2 += r.value2;
      grouped[k].delta += r.delta;
    }

    return Object.values(grouped)
      .map(g => ({ ...g, pct: g.value1 > 0 ? (g.delta / g.value1) * 100 : (g.value2 > 0 ? 100 : 0),
                   positions: g.positions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) }))
      .sort((a, b) => b.value2 - a.value2);
  }, [dates, snapshotsByDate, compareOptions, filters]);

  // ---------------- Header ----------------
  const dataAge = lastUpdatedAt ? new Date(lastUpdatedAt) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Head>
        <title>Command Center | Advanced Analytics</title>
        <meta name="description" content="Advanced analytics for your NestEgg portfolio" />
      </Head>

      {/* Header */}
      <motion.header initial={{ y: -80 }} animate={{ y: 0 }} className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl grid place-items-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7" />
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Command Center
                </span>
              </motion.button>

              {/* Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'trends', label: 'Trends', icon: '📈' },
                  { id: 'comparison', label: 'Compare', icon: '🔄' },
                ].map((s) => (
                  <motion.button key={s.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveSection(s.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      activeSection === s.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}>
                    <span>{s.icon}</span><span>{s.label}</span>
                  </motion.button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {dataAge ? <span>Updated {fmtDateShort(dataAge)} at {dataAge.toLocaleTimeString()}</span> : <span>Syncing…</span>}
              </div>

              {activeSection === 'overview' && (
                <div className="flex items-center bg-gray-800 rounded-lg p-1">
                  {['grid', 'table', 'chart'].map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}>
                      {mode === 'grid' ? '⊞' : mode === 'table' ? '☰' : '📊'} <span className="ml-1">{mode[0].toUpperCase() + mode.slice(1)}</span>
                    </button>
                  ))}
                </div>
              )}

              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters((s) => !s)}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors relative" title="Filters">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M4 8h16M6 12h12M10 16h8M14 20h4" />
                </svg>
                {showFilters && <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full" />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date Range</label>
                  <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                    <option value="ytd">Year to Date</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                {/* Accounts */}
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Accounts</label>
                  <div className="mt-1">
                    <button className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm text-left hover:bg-gray-600">
                      {filters.selectedAccounts.size === (accounts?.length || 0)
                        ? 'All Accounts'
                        : `${filters.selectedAccounts.size} Selected`}
                    </button>
                  </div>
                </div>

                {/* Asset Types */}
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Asset Types</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(summary?.assetTypes ?? ['security', 'crypto', 'cash', 'metal', 'realestate']).map((type) => {
                      const active = filters.selectedAssetTypes.has(type);
                      return (
                        <button key={type}
                          onClick={() => {
                            const s = new Set(filters.selectedAssetTypes);
                            s.has(type) ? s.delete(type) : s.add(type);
                            setFilters({ ...filters, selectedAssetTypes: s });
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                            active ? 'text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                          }`}
                          style={{ backgroundColor: active ? (colors.asset[type] || '#6b7280') : undefined }}>
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Group By */}
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Group By</label>
                  <div className="mt-1 flex gap-2">
                    {['asset', 'account', 'sector'].map((mode) => (
                      <button key={mode} onClick={() => setFilters({ ...filters, groupBy: mode })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          filters.groupBy === mode ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                        }`}>
                        {mode[0].toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sections */}
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div key="overview" variants={pageVariants} initial="initial" animate="animate" exit="initial">
              {/* If summary missing, show a graceful message but still render what we can */}
              {!overviewData && (
                <motion.div variants={itemVariants} className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50 mb-8">
                  <h3 className="text-lg font-semibold mb-2">Welcome to Advanced Analytics</h3>
                  <p className="text-gray-400">We’re waiting on core portfolio data. Once available, you’ll see KPIs, allocation, trends, and top holdings here.</p>
                </motion.div>
              )}

              {/* KPI row */}
              {overviewData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <MetricCard
                    title="Total Portfolio Value"
                    subtitle="All accounts combined"
                    value={overviewData.totalValue}
                    change={overviewData?.trendData?.length >= 2
                      ? ((overviewData.trendData.at(-1).value - overviewData.trendData.at(-2).value) /
                         Math.max(1, overviewData.trendData.at(-2).value)) * 100
                      : 0}
                    trend={overviewData.trendData?.map(d => ({ date: d.date, value: d.value }))}
                    color="from-indigo-500 to-purple-600"
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M3 12l2-2 4 4 7-7 5 5"/></svg>}
                  />
                  <MetricCard
                    title="Total Gain/Loss"
                    subtitle={_fmtPct(overviewData.totalGainLossPercent) + ' return'}
                    value={overviewData.totalGainLoss}
                    change={overviewData.totalGainLossPercent}
                    trend={overviewData.trendData?.map((d, i, arr) => ({
                      date: d.date,
                      value: i === 0 ? 0 : d.value - arr[i - 1].value
                    }))}
                    color={overviewData.totalGainLoss >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M13 7h8v8M21 7l-8 8-4-4-6 6"/></svg>}
                  />
                  <MetricCard
                    title="Today's Change"
                    subtitle="Since last close"
                    value={overviewData.dailyChange.absolute}
                    change={overviewData.dailyChange.value}
                    color={overviewData.dailyChange.value >= 0 ? 'from-cyan-500 to-blue-600' : 'from-orange-500 to-red-600'}
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M4 4v5h.6M20 11A8 8 0 104.6 9H9"/></svg>}
                  />
                  <MetricCard
                    title="Annual Income"
                    subtitle={`${overviewData.positionCount} positions`}
                    value={overviewData.totalIncome}
                    change={0}
                    color="from-amber-500 to-orange-600"
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5v12h2m2 4h10V9H9v8"/></svg>}
                  />
                </div>
              )}

              {/* Allocation + Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Asset Allocation */}
                {overviewData && Object.keys(overviewData.assetAllocation).length > 0 && (
                  <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-6">Asset Allocation</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(overviewData.assetAllocation).map(([type, d]) => ({
                              name: type[0].toUpperCase() + type.slice(1),
                              value: d.value, count: d.count, gainLoss: d.gainLoss
                            }))}
                            cx="50%" cy="50%" labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                            outerRadius={100} dataKey="value"
                          >
                            {Object.keys(overviewData.assetAllocation).map((type, i) => (
                              <Cell key={i} fill={colors.asset[type] || colors.asset.other} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip formatter={(v) => _fmtCurr(v)} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                      {Object.entries(overviewData.assetAllocation).sort((a,b)=>b[1].value-a[1].value).map(([type, d]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.asset[type] || '#6b7280' }} />
                            <span className="text-sm text-gray-300 capitalize">{type}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-white">{_fmtCurr(d.value)}</span>
                            <span className={`text-xs ml-2 ${d.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {d.gainLoss >= 0 ? '+' : ''}{_fmtCurr(d.gainLoss)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Performance area */}
                {overviewData?.trendData?.length ? (
                  <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-2xl p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">Portfolio Performance</h3>
                      <div className="text-sm text-gray-400">Advanced Analytics</div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewData.trendData}>
                          <defs>
                            <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors.chart.primary} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={colors.chart.primary} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={fmtDateShort} />
                          <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={(v) => _fmtCurr(v)} />
                          <Tooltip content={<CustomTooltip formatter={(v) => _fmtCurr(v)} labelFormatter={(d) => fmtDateFull(d)} />} />
                          <Area type="monotone" dataKey="value" stroke={colors.chart.primary} fill="url(#gValue)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                ) : null}
              </div>

              {/* Top Holdings */}
              {overviewData?.topPositions?.length ? (
                <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Top Holdings by Value</h3>
                    <span className="text-sm text-gray-400">Top 10 positions</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">% of Portfolio</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overviewData.topPositions.map((p, i) => (
                          <motion.tr key={`${p.identifier}-${i}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                            className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <span className="w-2 h-8 rounded-full" style={{ backgroundColor: colors.asset[p.asset_type] || '#6b7280' }} />
                                <div>
                                  <div className="font-medium text-white">{p.identifier || p.ticker || p.name}</div>
                                  <div className="text-sm text-gray-400">{p.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-white">{_fmtCurr(p.current_value)}</td>
                            <td className="py-3 px-4 text-right text-gray-300">
                              {overviewData.totalValue > 0 ? ((p.current_value / overviewData.totalValue) * 100).toFixed(2) : '0.00'}%
                            </td>
                            <td className={`py-3 px-4 text-right font-medium ${ (p.gain_loss_amt ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {_fmtCurr(p.gain_loss_amt ?? 0)}
                            </td>
                            <td className={`py-3 px-4 text-right font-medium ${ (p.gain_loss_pct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {_fmtPct(p.gain_loss_pct ?? 0)}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : null}
            </motion.div>
          )}

          {activeSection === 'trends' && (
            <motion.div key="trends" variants={pageVariants} initial="initial" animate="animate" exit="initial">
              {/* KPI mini row */}
              {overviewData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <MetricCard
                    title="30-Day Change"
                    subtitle="Portfolio Trend"
                    value={(() => {
                      const arr = trendData.totals;
                      if (arr.length < 2) return 0;
                      return arr.at(-1).value - arr[0].value;
                    })()}
                    change={(() => {
                      const arr = trendData.totals;
                      if (arr.length < 2 || arr[0].value <= 0) return 0;
                      return ((arr.at(-1).value - arr[0].value) / arr[0].value) * 100;
                    })()}
                    color="from-indigo-500 to-purple-600"
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M13 7h8v8M21 7l-8 8-4-4-6 6"/></svg>}
                  />
                  <MetricCard
                    title="Active Positions"
                    subtitle="Total holdings"
                    value={overviewData.positionCount}
                    change={0}
                    color="from-cyan-500 to-blue-600"
                    icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6H3v-6a2 2 0 012-2"/></svg>}
                  />
                </div>
              )}

              {/* Portfolio Value Trend */}
              {trendData.totals?.length ? (
                <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Portfolio Value Trend</h3>
                    <div className="flex items-center gap-3">
                      <select value={filters.dateRange} onChange={(e)=>setFilters({...filters, dateRange: e.target.value})}
                        className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm">
                        <option value="7d">7 Days</option>
                        <option value="30d">30 Days</option>
                        <option value="90d">90 Days</option>
                        <option value="1y">1 Year</option>
                        <option value="ytd">YTD</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                  </div>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData.totals}>
                        <defs>
                          <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.chart.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.chart.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={fmtDateShort} />
                        <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={(v)=>_fmtCurr(v)} domain={trendData.yDomain} />
                        <Tooltip content={<CustomTooltip formatter={(v)=>_fmtCurr(v)} labelFormatter={(d)=>fmtDateFull(d)} />} />
                        <Area type="monotone" dataKey="value" stroke={colors.chart.primary} fill="url(#gTrend)" strokeWidth={2} />
                        <Brush dataKey="date" height={30} stroke={colors.chart.primary} tickFormatter={fmtDateShort}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold mb-2">Trend data not ready</h3>
                  <p className="text-gray-400">We’ll render trends as the store provides history. Meanwhile, check Overview for KPIs and allocation.</p>
                </motion.div>
              )}

              {/* Optional: quick composition mini-panels if groupedPositions exist */}
              {groupedPositions?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  {Object.entries(
                    groupedPositions.reduce((acc, p) => {
                      const k = p.asset_type || 'other';
                      acc[k] = (acc[k] ?? 0) + (p.current_value ?? 0); return acc;
                    }, {})
                  ).slice(0,6).map(([k,v], idx) => {
                    // compute simple change based on trends (approx)
                    const arr = trendData.totals;
                    const change = (arr?.length>=2 && arr[0].value>0) ? ((arr.at(-1).value-arr[0].value)/arr[0].value)*100 : 0;
                    return (
                      <motion.div key={k} variants={itemVariants} whileHover={{ scale: 1.02 }}
                        className="bg-gray-800/50 rounded-2xl p-6 cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium capitalize">{k}</h4>
                          <span className="w-3 h-3 rounded-full" style={{ background: colors.asset[k] || '#6b7280' }}/>
                        </div>
                        <div className="text-2xl font-bold mb-1">{_fmtCurr(v)}</div>
                        <div className={`text-sm ${change>=0?'text-green-400':'text-red-400'}`}>
                          {change>=0?'↑':'↓'} {_fmtPct(Math.abs(change), false)}
                        </div>
                        <div className="mt-4 h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={(trendData.totals||[]).slice(-30)}>
                              <Line type="monotone" dataKey="value" stroke={change>=0?colors.performance.positive:colors.performance.negative} strokeWidth={2} dot={false}/>
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ):null}
            </motion.div>
          )}

          {activeSection === 'comparison' && (
            <motion.div key="comparison" variants={pageVariants} initial="initial" animate="animate" exit="initial">
              {/* Snapshots gate */}
              {!dates?.length ? (
                <motion.div variants={itemVariants} className="bg-gray-800/40 rounded-2xl p-6 border border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Load Snapshots (on demand)</h3>
                      <p className="text-gray-400">Snapshots are data-heavy. We only fetch them when you need to compare time periods.</p>
                      {snapsError && <p className="text-red-400 mt-2">Error: {String(snapsError)}</p>}
                    </div>
                    <button onClick={() => loadSnapshots?.()} disabled={snapsLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50">
                      {snapsLoading ? 'Loading…' : 'Load snapshots'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Date pickers */}
                  <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-2xl p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">Select Comparison Dates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">From Date</label>
                        <select value={compareOptions.date1 ?? dates[0]} onChange={(e)=>setCompareOptions({...compareOptions, date1: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg">
                          {dates.map(d => <option key={d} value={d}>{fmtDateFull(d)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">To Date</label>
                        <select value={compareOptions.date2 ?? dates.at(-1)} onChange={(e)=>setCompareOptions({...compareOptions, date2: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg">
                          {dates.map(d => <option key={d} value={d}>{fmtDateFull(d)}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button onClick={()=>setCompareOptions({...compareOptions, showDifference: !compareOptions.showDifference})}
                          className={`px-4 py-2 rounded-lg font-medium ${compareOptions.showDifference?'bg-indigo-600 text-white':'bg-gray-700 text-gray-300'}`}>
                          {compareOptions.showDifference ? 'Showing Differences' : 'Show Differences'}
                        </button>
                      </div>
                    </div>
                    {lastFetched && <p className="text-xs text-gray-500 mt-2">Snapshots fetched {new Date(lastFetched).toLocaleString()}</p>}
                  </motion.div>

                  {/* Comparison summary */}
                  {!!comparisonData.length && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-2xl p-6 border border-blue-500/20">
                        <p className="text-gray-400 text-sm">Period Start Value</p>
                        <p className="text-2xl font-bold text-white mt-2">
                          {_fmtCurr(comparisonData.reduce((s,g)=>s+g.value1,0))}
                        </p>
                      </motion.div>
                      <motion.div variants={itemVariants} className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-500/20">
                        <p className="text-gray-400 text-sm">Period End Value</p>
                        <p className="text-2xl font-bold text-white mt-2">
                          {_fmtCurr(comparisonData.reduce((s,g)=>s+g.value2,0))}
                        </p>
                      </motion.div>
                      <motion.div variants={itemVariants} className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl p-6 border border-green-500/20">
                        <p className="text-gray-400 text-sm">Total Change</p>
                        <p className="text-2xl font-bold text-white mt-2">
                          {_fmtCurr(comparisonData.reduce((s,g)=>s+g.delta,0))}
                        </p>
                      </motion.div>
                      <motion.div variants={itemVariants} className="bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-2xl p-6 border border-orange-500/20">
                        <p className="text-gray-400 text-sm">Change %</p>
                        <p className="text-2xl font-bold text-white mt-2">
                          {_fmtPct(
                            (comparisonData.reduce((s,g)=>s+g.delta,0) /
                             Math.max(1, comparisonData.reduce((s,g)=>s+g.value1,0))) * 100
                          )}
                        </p>
                      </motion.div>
                    </div>
                  )}

                  {/* Comparison table */}
                  <motion.div variants={itemVariants} className="bg-gray-800/50 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {filters.groupBy[0].toUpperCase()+filters.groupBy.slice(1)} / Position
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {compareOptions.date1 && fmtDateShort(compareOptions.date1)}
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {compareOptions.date2 && fmtDateShort(compareOptions.date2)}
                            </th>
                            {compareOptions.showDifference && (
                              <>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Change</th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Change %</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {comparisonData.map((group, idx) => (
                            <React.Fragment key={group.key}>
                              <tr className="bg-gray-850">
                                <td className="px-6 py-4">
                                  <div className="flex items-center">
                                    <span className="w-3 h-3 rounded-full mr-3" style={{ background: colors.asset[group.key] || '#6b7280' }}/>
                                    <span className="font-medium capitalize">{group.key}</span>
                                    <span className="ml-2 text-sm text-gray-400">({group.positions.length} positions)</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right font-medium">{_fmtCurr(group.value1)}</td>
                                <td className="px-6 py-4 text-right font-medium">{_fmtCurr(group.value2)}</td>
                                {compareOptions.showDifference && (
                                  <>
                                    <td className={`px-6 py-4 text-right font-medium ${group.delta>=0?'text-green-400':'text-red-400'}`}>{_fmtCurr(group.delta)}</td>
                                    <td className={`px-6 py-4 text-right font-medium ${group.pct>=0?'text-green-400':'text-red-400'}`}>{_fmtPct(group.pct)}</td>
                                  </>
                                )}
                              </tr>
                              {group.positions.slice(0, 25).map((p, i2) => (
                                <tr key={`${group.key}-${i2}`} className="hover:bg-gray-750">
                                  <td className="px-6 py-3 pl-14">
                                    <div className="font-medium">{p.identifier}</div>
                                    <div className="text-sm text-gray-400">{p.name} • {p.account_name}</div>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <div>{_fmtCurr(p.value1)}</div>
                                    {p.quantity1 > 0 && <div className="text-xs text-gray-500">{p.quantity1.toFixed(2)} @ {_fmtCurr(p.price1)}</div>}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <div>{_fmtCurr(p.value2)}</div>
                                    {p.quantity2 > 0 && <div className="text-xs text-gray-500">{p.quantity2.toFixed(2)} @ {_fmtCurr(p.price2)}</div>}
                                  </td>
                                  {compareOptions.showDifference && (
                                    <>
                                      <td className={`px-6 py-3 text-right ${p.delta>=0?'text-green-400':'text-red-400'}`}>{_fmtCurr(p.delta)}</td>
                                      <td className={`px-6 py-3 text-right ${p.pct>=0?'text-green-400':'text-red-400'}`}>{_fmtPct(p.pct)}</td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>

                  {/* Visual comparison: Waterfall + Top Movers */}
                  {!!comparisonData.length && (
                    <motion.div variants={itemVariants} className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-gray-800/50 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">Value Changes Waterfall</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData.slice(0, 10).map(g => ({
                              name: g.key, value: g.delta, fill: g.delta >= 0 ? colors.performance.positive : colors.performance.negative
                            }))} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} angle={-45} textAnchor="end" />
                              <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={(v)=>_fmtCurr(v)} />
                              <Tooltip content={<CustomTooltip formatter={(v)=>_fmtCurr(v)} />} />
                              <Bar dataKey="value" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-gray-800/50 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">Top Movers</h3>
                        <div className="space-y-3">
                          {comparisonData
                            .flatMap(g => g.positions)
                            .sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct))
                            .slice(0,8)
                            .map((p, i) => (
                              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.05 }}
                                className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700">
                                <div className="flex items-center gap-3">
                                  <span className={`w-2 h-8 rounded-full ${p.pct>=0?'bg-green-500':'bg-red-500'}`} />
                                  <div>
                                    <div className="font-medium">{p.identifier}</div>
                                    <div className="text-sm text-gray-400">{p.name}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-medium ${p.pct>=0?'text-green-400':'text-red-400'}`}>{_fmtPct(p.pct)}</div>
                                  <div className="text-sm text-gray-400">{_fmtCurr(p.delta)}</div>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
