// pages/portfolio-command-center.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap, ComposedChart, ReferenceLine, Brush, ScatterChart, Scatter
} from 'recharts';

// ✅ DataStore hooks only (no direct API)
import { useDataStore } from '@/store/DataStore';
import {
  usePortfolioSummary,
  usePortfolioTrends,
  useSnapshots,
  useDetailedPositions,
  useAccounts,
} from '@/store/hooks';

// -------------------------
// Shared utils (optional)
// -------------------------
const formatCurrency = (value, compact = false, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact && Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
const formatPercentage = (value, showSign = true, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};
const formatDate = (dateStr, full = false) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', full
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric' });
};

// -------------------------
// Colors
// -------------------------
const colors = {
  asset: {
    security: '#6366f1',
    cash: '#10b981',
    crypto: '#8b5cf6',
    metal: '#f59e0b',
    realestate: '#ef4444',
    bond: '#ec4899',
    commodity: '#06b6d4',
    other: '#64748b'
  },
  performance: { positive: '#10b981', negative: '#ef4444' },
  chart: { primary: '#6366f1', secondary: '#8b5cf6', tertiary: '#06b6d4', quaternary: '#10b981' }
};

// -------------------------
// Animations
// -------------------------
const pageVariants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const itemVariants = { initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1, transition: { duration: 0.25 } } };

// -------------------------
// Tooltip
// -------------------------
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
      <div className="text-xs text-gray-400 mb-1">{formatDate(label, true)}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-300 text-sm">{p.name}</span>
          </div>
          <span className="text-white text-sm">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </motion.div>
  );
};

// -------------------------
// KPI Card (lightweight)
// -------------------------
const MetricCard = ({ title, subtitle, value, deltaPct, trend, color = 'from-indigo-500 to-purple-600' }) => {
  const isUp = (deltaPct ?? 0) >= 0;
  return (
    <motion.div variants={itemVariants} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-400 uppercase">{title}</div>
          {subtitle && <div className="text-[11px] text-gray-500 mt-1">{subtitle}</div>}
          <div className="flex items-baseline gap-2 mt-2">
            <div className="text-2xl font-bold">{formatCurrency(value)}</div>
            {deltaPct !== undefined && (
              <div className={`text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>{formatPercentage(Math.abs(deltaPct), false)}</div>
            )}
          </div>
        </div>
        <div className={`px-2.5 py-1.5 rounded-md text-[11px] bg-gradient-to-br ${color} text-white`}>KPI</div>
      </div>

      {!!trend?.length && (
        <div className="h-10 mt-3 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id={`kpi-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? colors.performance.positive : colors.performance.negative} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={isUp ? colors.performance.positive : colors.performance.negative} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isUp ? colors.performance.positive : colors.performance.negative}
                fill={`url(#kpi-${title})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

// -------------------------
// Derived data helpers
// -------------------------
const getLatestSnapshot = (snapshots) => {
  const dates = snapshots?.summary?.dates || [];
  const last = dates[dates.length - 1];
  return last ? { date: last, snapshot: snapshots.snapshots_by_date?.[last] || null } : { date: null, snapshot: null };
};

const buildOverviewFromStores = (summary, snapshots) => {
  // summary.data: high-level metrics (if provided by backend view)
  // fall back to latest snapshot aggregates.
  const { snapshot } = getLatestSnapshot(snapshots);

  if (!summary?.data && !snapshot) return null;

  const totalValue = summary?.data?.total_value ?? snapshot?.total_value ?? 0;
  const totalCostBasis = summary?.data?.total_cost_basis ?? snapshot?.total_cost_basis ?? 0;
  const totalGainLoss = (summary?.data?.total_gain_loss ?? snapshot?.total_gain_loss ?? 0);
  const totalGainLossPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  const positionCount = snapshot?.position_count ?? summary?.data?.position_count ?? 0;
  const totalIncome = summary?.dividendMetrics?.annualIncome ?? 0;

  // period changes from snapshots timeline (1D, 1W, 1M, 3M, 1Y)
  const dates = snapshots?.summary?.dates || [];
  const idx = (offsetDays) => Math.max(0, dates.length - offsetDays - 1);
  const valAt = (i) => snapshots?.snapshots_by_date?.[dates[i]]?.total_value ?? null;

  const lastVal = valAt(dates.length - 1);
  const dayVal = valAt(dates.length - 2);
  const weekVal = valAt(idx(7));
  const monthVal = valAt(idx(30));
  const quarterVal = valAt(idx(90));
  const yearVal = valAt(idx(365));

  const pct = (prev) => (prev && lastVal) ? ((lastVal - prev) / prev) * 100 : 0;
  const abs = (prev) => (prev && lastVal) ? (lastVal - prev) : 0;

  const periodChanges = {
    day: { value: pct(dayVal), absolute: abs(dayVal) },
    week: { value: pct(weekVal), absolute: abs(weekVal) },
    month: { value: pct(monthVal), absolute: abs(monthVal) },
    quarter: { value: pct(quarterVal), absolute: abs(quarterVal) },
    year: { value: pct(yearVal), absolute: abs(yearVal) },
  };

  // trend for last 30 entries
  const trendData = dates.slice(-30).map(d => ({
    date: d,
    value: snapshots?.snapshots_by_date?.[d]?.total_value ?? 0,
    gainLoss: snapshots?.snapshots_by_date?.[d]?.total_gain_loss ?? 0,
    gainLossPercent: (() => {
      const sv = snapshots?.snapshots_by_date?.[d];
      if (!sv || (sv.total_cost_basis ?? 0) === 0) return 0;
      return (sv.total_gain_loss / sv.total_cost_basis) * 100;
    })()
  }));

  // asset allocation from latest snapshot positions
  const assetAllocation = {};
  const sectorAllocation = {};
  const accountAllocation = {};
  const positionsList = snapshot ? Object.values(snapshot.positions || {}) : [];

  positionsList.forEach(p => {
    const t = p.asset_type || 'other';
    assetAllocation[t] = assetAllocation[t] || { value: 0, count: 0, gainLoss: 0 };
    assetAllocation[t].value += (p.current_value || 0);
    assetAllocation[t].count += 1;
    assetAllocation[t].gainLoss += (p.gain_loss_amt || 0);

    if (p.sector) {
      sectorAllocation[p.sector] = sectorAllocation[p.sector] || { value: 0, count: 0 };
      sectorAllocation[p.sector].value += (p.current_value || 0);
      sectorAllocation[p.sector].count += 1;
    }

    accountAllocation[p.account_name] = accountAllocation[p.account_name] || { value: 0, count: 0 };
    accountAllocation[p.account_name].value += (p.current_value || 0);
    accountAllocation[p.account_name].count += 1;
  });

  const topPositions = positionsList.sort((a, b) => (b.current_value || 0) - (a.current_value || 0)).slice(0, 10);
  const top5Concentration = totalValue > 0
    ? topPositions.slice(0, 5).reduce((s, p) => s + (p.current_value || 0), 0) / totalValue * 100
    : 0;

  return {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent: totalGainLossPct,
    totalIncome,
    positionCount,
    periodChanges,
    trendData,
    assetAllocation,
    sectorAllocation,
    accountAllocation,
    topPositions,
    top5Concentration,
    dailyChange: periodChanges.day,
  };
};

// -------------------------
// Component
// -------------------------
export default function PortfolioCommandCenter() {
  const router = useRouter();
  const { actions } = useDataStore();

  // 🔌 DataStore hooks (authoritative)
  const { data: summaryData, loading: summaryLoading, refresh: refreshSummary } = usePortfolioSummary();
  const { history: trendHistory, loading: trendsLoading, refresh: refreshTrends } = usePortfolioTrends();
  const { snapshots, loading: snapsLoading, refresh: refreshSnapshots } = useSnapshots();
  const { positions: detailedPositions, loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();

  const isLoading = summaryLoading || trendsLoading || snapsLoading || positionsLoading || accountsLoading;

  // Filters / UI state
  const [activeSection, setActiveSection] = useState('overview'); // overview | trends | comparison | reconciliation
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid | table | chart
  const [dateRange, setDateRange] = useState('30d');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set(['security', 'crypto', 'cash', 'metal', 'realestate']));
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [compare, setCompare] = useState({ date1: null, date2: null, diff: true });
  const [selectedMetric, setSelectedMetric] = useState('value');

  // Initialize account filter and comparison dates once snapshots arrive
  useEffect(() => {
    const dates = snapshots?.summary?.dates || [];
    if (dates.length && !compare.date1) {
      setCompare({ date1: dates[0], date2: dates[dates.length - 1], diff: true });
    }
    if (accounts?.length && selectedAccounts.size === 0) {
      setSelectedAccounts(new Set(accounts.map(a => String(a.id))));
    }
  }, [snapshots, accounts]);

  // Overview derived
  const overview = useMemo(() => buildOverviewFromStores(summaryData, snapshots), [summaryData, snapshots]);

  // Trend series (totals & composition) built from snapshots, dateRange & filters
  const trendData = useMemo(() => {
    const dates = snapshots?.summary?.dates || [];
    if (!dates.length) return { dates: [], totals: [], series: {}, yDomain: [0, 1] };

    // compute cutoff
    const now = new Date();
    const cutoff = new Date();
    const setDaysAgo = (d) => { const c = new Date(now); c.setDate(c.getDate() - d); return c; };
    switch (dateRange) {
      case '7d': cutoff.setTime(setDaysAgo(7).getTime()); break;
      case '30d': cutoff.setTime(setDaysAgo(30).getTime()); break;
      case '90d': cutoff.setTime(setDaysAgo(90).getTime()); break;
      case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
      case 'ytd': cutoff.setMonth(0, 1); break;
      default: cutoff.setTime(new Date(0).getTime());
    }

    const filteredDates = dates.filter(d => new Date(d) >= cutoff);
    const series = {};
    const totals = [];
    let minV = Infinity, maxV = -Infinity;

    filteredDates.forEach(d => {
      const snap = snapshots.snapshots_by_date?.[d];
      if (!snap) return;

      let total = 0;
      const byKey = {};

      Object.values(snap.positions || {}).forEach(p => {
        if (!selectedAssetTypes.has(p.asset_type)) return;
        if (!selectedAccounts.has(String(p.account_id))) return;

        const key = 'asset'; // default group for composition chart can be changed to account/sector easily
        const label =
          key === 'asset' ? p.asset_type :
          key === 'account' ? p.account_name :
          p.sector || 'Unknown';

        byKey[label] = (byKey[label] || 0) + (p.current_value || 0);
        total += (p.current_value || 0);
      });

      Object.entries(byKey).forEach(([k, v]) => {
        series[k] = series[k] || [];
        series[k].push({ date: d, value: v });
      });

      totals.push({
        date: d,
        value: total,
        gainLoss: snap.total_gain_loss,
        gainLossPercent: (snap.total_cost_basis ?? 0) > 0 ? (snap.total_gain_loss / snap.total_cost_basis) * 100 : 0
      });

      if (total < minV) minV = total;
      if (total > maxV) maxV = total;
    });

    const pad = (maxV - minV) * 0.1;
    return { dates: filteredDates, totals, series, yDomain: [Math.max(0, minV - pad), maxV + pad] };
  }, [snapshots, dateRange, selectedAssetTypes, selectedAccounts]);

  // Comparison view (snapshot vs snapshot)
  const comparisonData = useMemo(() => {
    if (!compare.date1 || !compare.date2) return [];
    const s1 = snapshots?.snapshots_by_date?.[compare.date1];
    const s2 = snapshots?.snapshots_by_date?.[compare.date2];
    if (!s1 || !s2) return [];

    const map = new Map();
    const fold = (snap, tag) => {
      Object.entries(snap.positions || {}).forEach(([key, p]) => {
        const id = p.original_id || key;
        if (!map.has(id)) map.set(id, {});
        map.get(id)[tag] = p;
      });
    };
    fold(s1, 'a'); fold(s2, 'b');

    const rows = [];
    for (const [id, { a, b }] of map.entries()) {
      const pos = b || a;
      if (!selectedAssetTypes.has(pos?.asset_type)) continue;
      if (!selectedAccounts.has(String(pos?.account_id))) continue;

      const value1 = a?.current_value || 0;
      const value2 = b?.current_value || 0;
      const delta = value2 - value1;
      const pct = value1 > 0 ? (delta / value1) * 100 : (value2 > 0 ? 100 : 0);

      rows.push({
        key: id,
        name: b?.name || a?.name,
        identifier: b?.identifier || a?.identifier,
        groupKey: pos?.asset_type || 'other',
        value1, value2, delta, pct
      });
    }

    const grouped = rows.reduce((acc, r) => {
      const g = r.groupKey;
      acc[g] = acc[g] || { key: g, positions: [], value1: 0, value2: 0, delta: 0 };
      acc[g].positions.push(r);
      acc[g].value1 += r.value1; acc[g].value2 += r.value2; acc[g].delta += r.delta;
      return acc;
    }, {});

    return Object.values(grouped).map(g => ({
      ...g,
      pct: g.value1 > 0 ? (g.delta / g.value1) * 100 : (g.value2 > 0 ? 100 : 0),
      positions: g.positions.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    })).sort((a, b) => b.value2 - a.value2);
  }, [snapshots, compare, selectedAssetTypes, selectedAccounts]);

  // Reconciliation (live detailedPositions vs latest snapshot)
  const reconciliation = useMemo(() => {
    const { snapshot } = getLatestSnapshot(snapshots);
    if (!snapshot) return [];
    const map = new Map();

    // live
    (detailedPositions || []).forEach(p => {
      if (!selectedAssetTypes.has(p.asset_type)) return;
      if (!selectedAccounts.has(String(p.account_id))) return;
      const k = p.original_id || `${p.asset_type}|${p.identifier || p.ticker}|${p.account_id}`;
      map.set(k, {
        key: k, identifier: p.ticker || p.identifier, name: p.name, account_name: p.account_name,
        asset_type: p.asset_type, liveValue: p.current_value || 0, liveQty: p.quantity || 0, livePx: p.current_price || 0,
        snapValue: 0, snapQty: 0, snapPx: 0, status: 'live_only'
      });
    });

    // snapshot
    Object.entries(snapshot.positions || {}).forEach(([k, p]) => {
      if (!selectedAssetTypes.has(p.asset_type)) return;
      if (!selectedAccounts.has(String(p.account_id))) return;
      const id = p.original_id || k;
      if (map.has(id)) {
        const row = map.get(id);
        row.snapValue = p.current_value || 0;
        row.snapQty = p.quantity || 0;
        row.snapPx = p.current_price || 0;
        row.status = 'matched';
      } else {
        map.set(id, {
          key: id, identifier: p.identifier, name: p.name, account_name: p.account_name,
          asset_type: p.asset_type, liveValue: 0, liveQty: 0, livePx: 0,
          snapValue: p.current_value || 0, snapQty: p.quantity || 0, snapPx: p.current_price || 0, status: 'snapshot_only'
        });
      }
    });

    return Array.from(map.values()).map(r => ({
      ...r,
      delta: (r.liveValue || 0) - (r.snapValue || 0),
      pct: (r.snapValue || 0) > 0 ? ((r.liveValue - r.snapValue) / r.snapValue) * 100 : 0
    })).filter(r => Math.abs(r.delta) > 0.01 || r.status !== 'matched')
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [detailedPositions, snapshots, selectedAssetTypes, selectedAccounts]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'k') { e.preventDefault(); setShowFilters(s => !s); }
      if (e.key === 'r') { e.preventDefault(); doRefresh(); }
      if (['1','2','3','4'].includes(e.key)) {
        e.preventDefault();
        setActiveSection({ '1':'overview','2':'trends','3':'comparison','4':'reconciliation' }[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doRefresh = useCallback(() => {
    refreshSummary?.();
    refreshTrends?.();
    refreshSnapshots?.();
    refreshPositions?.();
    refreshAccounts?.();
  }, [refreshSummary, refreshTrends, refreshSnapshots, refreshPositions, refreshAccounts]);

  // -------------------------
  // Render bits reused
  // -------------------------
  const AllocationPie = ({ allocation }) => {
    const data = Object.entries(allocation || {}).map(([type, v]) => ({
      name: type, value: v.value, gainLoss: v.gainLoss
    }));
    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" dataKey="value" outerRadius={100} labelLine={false}
                 label={({ name, percent }) => `${name} ${(percent*100).toFixed(1)}%`}>
              {data.map((d, i) => <Cell key={i} fill={colors.asset[d.name] || colors.asset.other} />)}
            </Pie>
            <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v, true)} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // -------------------------
  // Loading & error states
  // -------------------------
  if (isLoading && !snapshots?.summary?.dates?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <div className="text-white text-lg">Loading portfolio…</div>
        </motion.div>
      </div>
    );
  }

  // -------------------------
  // Main
  // -------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-850 to-black text-white">
      <Head><title>Portfolio Command Center | NestEgg</title></Head>

      {/* Header */}
      <motion.header initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center font-bold">PC</div>
            <div className="text-lg font-semibold">Portfolio Command Center</div>
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'trends', label: 'Trends' },
                { id: 'comparison', label: 'Compare' },
                { id: 'reconciliation', label: 'Reconcile' }
              ].map(s => (
                <button key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`px-3 py-1.5 rounded-md text-sm ${activeSection===s.id?'bg-indigo-600 text-white':'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                  {s.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(s => !s)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm">Filters</button>
            <button onClick={doRefresh} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm">Refresh</button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] text-gray-400 uppercase mb-1">Date Range</div>
                  <select className="w-full bg-gray-800 rounded-md px-3 py-2"
                          value={dateRange} onChange={(e)=>setDateRange(e.target.value)}>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                    <option value="ytd">Year to Date</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 uppercase mb-1">Accounts</div>
                  <div className="flex flex-wrap gap-1">
                    {(accounts||[]).map(a => {
                      const sel = selectedAccounts.has(String(a.id));
                      return (
                        <button key={a.id} onClick={()=>{
                                  const s = new Set(selectedAccounts);
                                  sel ? s.delete(String(a.id)) : s.add(String(a.id));
                                  setSelectedAccounts(s);
                                }}
                                className={`px-2 py-1 rounded-full text-xs ${sel?'bg-indigo-600 text-white':'bg-gray-800 text-gray-300'}`}>
                          {a.account_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-[11px] text-gray-400 uppercase mb-1">Asset Types</div>
                  <div className="flex flex-wrap gap-1">
                    {['security','crypto','cash','metal','realestate'].map(t=>{
                      const sel = selectedAssetTypes.has(t);
                      return (
                        <button key={t} onClick={()=>{
                                  const s = new Set(selectedAssetTypes);
                                  sel ? s.delete(t) : s.add(t);
                                  setSelectedAssetTypes(s);
                                }}
                                className={`px-2 py-1 rounded-full text-xs ${sel?'text-white':'text-gray-300'}`}
                                style={{ backgroundColor: sel ? colors.asset[t] : '#1f2937' }}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sections */}
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.section key="overview" variants={pageVariants} initial="initial" animate="animate" exit="initial" className="space-y-6">
              {/* KPIs */}
              {overview && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Total Value" subtitle="All accounts" value={overview.totalValue}
                              deltaPct={overview.periodChanges.month.value} trend={overview.trendData} />
                  <MetricCard title="Total Gain/Loss" subtitle={formatPercentage(overview.totalGainLossPercent)}
                              value={overview.totalGainLoss}
                              deltaPct={overview.totalGainLossPercent}
                              trend={overview.trendData.map(d=>({date:d.date,value:d.gainLoss}))}
                              color="from-green-600 to-emerald-600" />
                  <MetricCard title="Today’s Change" subtitle="Since yesterday"
                              value={overview.dailyChange.absolute}
                              deltaPct={overview.dailyChange.value}
                              trend={overview.trendData} color="from-cyan-600 to-blue-600" />
                  <MetricCard title="Annual Income" subtitle={`${overview.positionCount} positions`} value={overview.totalIncome}
                              trend={[]} color="from-amber-600 to-orange-600" />
                </div>
              )}

              {/* Asset Allocation + Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                  <div className="text-lg font-semibold mb-4">Asset Allocation</div>
                  {overview && <AllocationPie allocation={overview.assetAllocation} />}
                  <div className="mt-3 space-y-1">
                    {overview && Object.entries(overview.assetAllocation).sort((a,b)=>b[1].value-a[1].value).map(([t,v])=>(
                      <div key={t} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.asset[t]||colors.asset.other }} />
                          <span className="capitalize text-sm text-gray-300">{t}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-white">{formatCurrency(v.value, true)}</span>
                          <span className={`ml-2 text-xs ${v.gainLoss>=0?'text-green-400':'text-red-400'}`}>
                            {v.gainLoss>=0?'+':''}{formatCurrency(v.gainLoss, true)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold">Portfolio Performance</div>
                    <div className="flex gap-2">
                      {['value','gainLoss','percent'].map(k=>(
                        <button key={k} onClick={()=>setSelectedMetric(k)}
                                className={`px-3 py-1.5 rounded-md text-sm ${selectedMetric===k?'bg-indigo-600 text-white':'bg-gray-800 text-gray-300'}`}>
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overview?.trendData||[]}>
                        <defs>
                          <linearGradient id="perfA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.chart.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={colors.chart.primary} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="perfB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={overview?.totalGainLoss >= 0 ? colors.performance.positive : colors.performance.negative} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={overview?.totalGainLoss >= 0 ? colors.performance.positive : colors.performance.negative} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={(d)=>formatDate(d)} />
                        <YAxis tick={{ fill: '#9ca3af' }}
                               tickFormatter={(v)=> selectedMetric==='percent' ? `${v.toFixed(1)}%` : formatCurrency(v, true)} />
                        <Tooltip content={<CustomTooltip formatter={(v)=> selectedMetric==='percent' ? `${v.toFixed(2)}%` : formatCurrency(v)} />} />
                        {selectedMetric==='value' && (
                          <Area type="monotone" dataKey="value" stroke={colors.chart.primary} fill="url(#perfA)" strokeWidth={2} />
                        )}
                        {selectedMetric==='gainLoss' && (
                          <Area type="monotone" dataKey="gainLoss" stroke={overview?.totalGainLoss>=0?colors.performance.positive:colors.performance.negative} fill="url(#perfB)" strokeWidth={2} />
                        )}
                        {selectedMetric==='percent' && (
                          <Area type="monotone" dataKey="gainLossPercent" stroke={colors.chart.secondary} fill="url(#perfB)" strokeWidth={2} />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Top Holdings */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold">Top Holdings by Value</div>
                  <div className="text-sm text-gray-400">Top 10 positions</div>
                </div>
                {overview && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs uppercase text-gray-400 border-b border-gray-800">
                          <th className="py-2 text-left px-2">Position</th>
                          <th className="py-2 text-right px-2">Value</th>
                          <th className="py-2 text-right px-2">% of Port</th>
                          <th className="py-2 text-right px-2">Gain/Loss</th>
                          <th className="py-2 text-right px-2">Return %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.topPositions.map((p, i) => (
                          <tr key={i} className="border-b border-gray-850 hover:bg-gray-800/40">
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-6 rounded-full" style={{ backgroundColor: colors.asset[p.asset_type]||colors.asset.other }} />
                                <div>
                                  <div className="font-medium">{p.identifier}</div>
                                  <div className="text-xs text-gray-400">{p.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right">{formatCurrency(p.current_value)}</td>
                            <td className="py-2 px-2 text-right">{((p.current_value/overview.totalValue)*100).toFixed(2)}%</td>
                            <td className={`py-2 px-2 text-right ${p.gain_loss_amt>=0?'text-green-400':'text-red-400'}`}>{formatCurrency(p.gain_loss_amt)}</td>
                            <td className={`py-2 px-2 text-right ${p.gain_loss_pct>=0?'text-green-400':'text-red-400'}`}>{formatPercentage(p.gain_loss_pct)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {activeSection === 'trends' && (
            <motion.section key="trends" variants={pageVariants} initial="initial" animate="animate" exit="initial" className="space-y-6">
              {/* Totals trend */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Portfolio Value Trend</div>
                  <select value={dateRange} onChange={(e)=>setDateRange(e.target.value)} className="bg-gray-800 rounded-md px-3 py-1.5 text-sm">
                    <option value="7d">7 Days</option><option value="30d">30 Days</option><option value="90d">90 Days</option><option value="1y">1 Year</option><option value="all">All Time</option>
                  </select>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData.totals}>
                      <defs>
                        <linearGradient id="totalsA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.chart.primary} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={colors.chart.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={(d)=>formatDate(d)} />
                      <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={(v)=>formatCurrency(v, true)} domain={trendData.yDomain} />
                      <Tooltip content={<CustomTooltip formatter={(v)=>formatCurrency(v)} />} />
                      <Area type="monotone" dataKey="value" stroke={colors.chart.primary} fill="url(#totalsA)" strokeWidth={2} />
                      <Brush dataKey="date" height={28} stroke={colors.chart.primary} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Composition stacked area (by asset type) */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                <div className="text-lg font-semibold mb-3">Composition by Asset Type</div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData.dates.map(d=>{
                      const row = { date: d };
                      Object.entries(trendData.series).forEach(([k, vals])=>{
                        row[k] = vals.find(v=>v.date===d)?.value || 0;
                      });
                      return row;
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={(d)=>formatDate(d)} />
                      <YAxis tick={{ fill: '#9ca3af' }} tickFormatter={(v)=>formatCurrency(v, true)} />
                      <Tooltip content={<CustomTooltip formatter={(v)=>formatCurrency(v)} />} />
                      {Object.keys(trendData.series).map((k, i)=>(
                        <Area key={k} type="monotone" dataKey={k} stackId="1"
                              stroke={colors.asset[k] || Object.values(colors.chart)[i % 4]}
                              fill={colors.asset[k] || Object.values(colors.chart)[i % 4]} />
                      ))}
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.section>
          )}

          {activeSection === 'comparison' && (
            <motion.section key="comparison" variants={pageVariants} initial="initial" animate="animate" exit="initial" className="space-y-6">
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                <div className="text-lg font-semibold mb-4">Select Comparison Dates</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select className="bg-gray-800 rounded-md px-3 py-2" value={compare.date1 || ''} onChange={(e)=>setCompare({...compare, date1: e.target.value})}>
                    {(snapshots?.summary?.dates||[]).map(d=> <option key={d} value={d}>{formatDate(d, true)}</option>)}
                  </select>
                  <select className="bg-gray-800 rounded-md px-3 py-2" value={compare.date2 || ''} onChange={(e)=>setCompare({...compare, date2: e.target.value})}>
                    {(snapshots?.summary?.dates||[]).map(d=> <option key={d} value={d}>{formatDate(d, true)}</option>)}
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={compare.diff} onChange={(e)=>setCompare({...compare, diff: e.target.checked})} />
                    Show Differences
                  </label>
                </div>
              </div>

              {/* Summary */}
              {comparisonData.length>0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4">
                    <div className="text-xs text-gray-400">Period Start Value</div>
                    <div className="text-xl font-semibold mt-1">{formatCurrency(comparisonData.reduce((s,g)=>s+g.value1,0))}</div>
                  </div>
                  <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-4">
                    <div className="text-xs text-gray-400">Period End Value</div>
                    <div className="text-xl font-semibold mt-1">{formatCurrency(comparisonData.reduce((s,g)=>s+g.value2,0))}</div>
                  </div>
                  <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4">
                    <div className="text-xs text-gray-400">Total Change</div>
                    <div className="text-xl font-semibold mt-1">{formatCurrency(comparisonData.reduce((s,g)=>s+g.delta,0))}</div>
                  </div>
                  <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-4">
                    <div className="text-xs text-gray-400">Change %</div>
                    <div className="text-xl font-semibold mt-1">
                      {formatPercentage((comparisonData.reduce((s,g)=>s+g.delta,0) / Math.max(1, comparisonData.reduce((s,g)=>s+g.value1,0))) * 100)}
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-950/70">
                      <tr className="text-xs uppercase text-gray-400">
                        <th className="text-left px-4 py-3">Asset / Group</th>
                        <th className="text-right px-4 py-3">{compare.date1 && formatDate(compare.date1)}</th>
                        <th className="text-right px-4 py-3">{compare.date2 && formatDate(compare.date2)}</th>
                        {compare.diff && (<><th className="text-right px-4 py-3">Change</th><th className="text-right px-4 py-3">Change %</th></>)}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((g, i)=>(
                        <React.Fragment key={i}>
                          <tr className="bg-gray-900/70">
                            <td className="px-4 py-3 font-medium capitalize flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.asset[g.key]||colors.asset.other }} />
                              {g.key} <span className="text-xs text-gray-400 ml-1">({g.positions.length})</span>
                            </td>
                            <td className="px-4 py-3 text-right">{formatCurrency(g.value1)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(g.value2)}</td>
                            {compare.diff && (
                              <>
                                <td className={`px-4 py-3 text-right ${g.delta>=0?'text-green-400':'text-red-400'}`}>{formatCurrency(g.delta)}</td>
                                <td className={`px-4 py-3 text-right ${g.pct>=0?'text-green-400':'text-red-400'}`}>{formatPercentage(g.pct)}</td>
                              </>
                            )}
                          </tr>
                          {g.positions.slice(0, 15).map((p, j)=>(
                            <tr key={`${i}-${j}`} className="border-t border-gray-850 hover:bg-gray-800/30">
                              <td className="px-4 py-2 pl-8">{p.identifier} <span className="text-xs text-gray-500 ml-1">{p.name}</span></td>
                              <td className="px-4 py-2 text-right">{formatCurrency(p.value1)}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(p.value2)}</td>
                              {compare.diff && (
                                <>
                                  <td className={`px-4 py-2 text-right ${p.delta>=0?'text-green-400':'text-red-400'}`}>{formatCurrency(p.delta)}</td>
                                  <td className={`px-4 py-2 text-right ${p.pct>=0?'text-green-400':'text-red-400'}`}>{formatPercentage(p.pct)}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.section>
          )}

          {activeSection === 'reconciliation' && (
            <motion.section key="reconciliation" variants={pageVariants} initial="initial" animate="animate" exit="initial" className="space-y-6">
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">Live vs Snapshot Reconciliation</div>
                    <div className="text-sm text-gray-400">Comparing current positions to the latest snapshot</div>
                  </div>
                  <button onClick={doRefresh} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md text-sm">Refresh</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4">
                  <div className="text-xs text-gray-400">Matched (count)</div>
                  <div className="text-xl font-semibold mt-1">{reconciliation.filter(r=>r.status==='matched').length}</div>
                </div>
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-4">
                  <div className="text-xs text-gray-400">Live Only (count)</div>
                  <div className="text-xl font-semibold mt-1">{reconciliation.filter(r=>r.status==='live_only').length}</div>
                </div>
                <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-4">
                  <div className="text-xs text-gray-400">Snapshot Only (count)</div>
                  <div className="text-xl font-semibold mt-1">{reconciliation.filter(r=>r.status==='snapshot_only').length}</div>
                </div>
                <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-4">
                  <div className="text-xs text-gray-400">Total Difference ($)</div>
                  <div className="text-xl font-semibold mt-1">{formatCurrency(reconciliation.reduce((s,r)=>s+Math.abs(r.delta||0),0), true)}</div>
                </div>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-950/70">
                      <tr className="text-xs uppercase text-gray-400">
                        <th className="px-4 py-3 text-left">Position</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Live Value</th>
                        <th className="px-4 py-3 text-right">Snapshot Value</th>
                        <th className="px-4 py-3 text-right">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation.map((r,i)=>(
                        <tr key={i} className="border-t border-gray-850 hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.asset[r.asset_type]||colors.asset.other }} />
                              <div>
                                <div className="font-medium">{r.identifier}</div>
                                <div className="text-xs text-gray-400">{r.name} • {r.account_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[11px] ${
                              r.status==='matched' ? 'bg-green-900/40 text-green-300'
                              : r.status==='live_only' ? 'bg-amber-900/40 text-amber-300'
                              : 'bg-red-900/40 text-red-300'
                            }`}>
                              {r.status.replace('_',' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(r.liveValue)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(r.snapValue)}</td>
                          <td className={`px-4 py-3 text-right ${ (r.delta||0)>=0?'text-green-400':'text-red-400' }`}>{formatCurrency(r.delta||0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
