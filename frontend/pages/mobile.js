// pages/mobile.js
import { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  PieChart, Pie, Cell
} from 'recharts';

// Store hooks
import { usePortfolioSummary, usePortfolioTrends } from '@/store/hooks';

// Icons
import {
  ArrowUp, ArrowDown, RefreshCw, Wallet, PieChart as PieChartIcon, TrendingUp, TrendingDown,
  Building2, Sparkles, ChevronRight, Droplet, LineChart as LineIcon, Layers
} from 'lucide-react';

// -----------------------------------------------------
// Helpers (self-contained to avoid ambiguity)
// -----------------------------------------------------
const timeframeOptions = [
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'ALL' },
];

const assetColors = {
  securities: '#4f46e5', // Indigo
  security: '#4f46e5',
  cash: '#10b981',       // Emerald
  crypto: '#8b5cf6',     // Purple
  metal: '#f59e0b',      // Amber
  metals: '#f59e0b',
  real_estate: '#14b8a6',// Teal
  other: '#6b7280',      // Gray
  other_assets: '#6b7280'
};

const fmtCurrency = (value, inThousands = false) => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (inThousands) {
    const thousands = value / 1000;
    return `$${thousands.toLocaleString('en-US', {
      minimumFractionDigits: 1, maximumFractionDigits: 1
    })}k`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(value);
};

const fmtPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
};

const chipColor = (n) =>
  n == null ? 'text-gray-300' : n >= 0 ? 'text-green-400' : 'text-red-400';

const chipBg = (n) =>
  n == null ? 'bg-gray-600/20 text-gray-300' : n >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400';

// Slice-by-timeframe helper (assumes daily rows; safe fallback to slice)
const filterByTimeframe = (rows, tf) => {
  if (!Array.isArray(rows)) return [];
  const n = rows.length;
  if (tf === '1d') return n > 1 ? rows.slice(-2) : rows;
  if (tf === '1w') return rows.slice(-7);
  if (tf === '1m') return rows.slice(-30);
  if (tf === '3m') return rows.slice(-90);
  if (tf === '6m') return rows.slice(-180);
  if (tf === '1y') return rows.slice(-365);
  if (tf === 'ytd') {
    const thisYear = new Date().getFullYear();
    return rows.filter(d => {
      const dt = new Date(d.rawDate ?? d.date);
      return dt.getFullYear() === thisYear;
    });
  }
  return rows; // 'all'
};

// Simple Apple-like info row
const InfoRow = ({ label, value, sub }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-400">{label}</span>
    <div className="text-right">
      <p className="text-sm font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  </div>
);

// -----------------------------------------------------
// Page
// -----------------------------------------------------
export default function MobilePortfolio() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState('1m');
  const [showK, setShowK] = useState(false);

  const {
    summary,
    topPositions,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    netCashBasisMetrics,
    loading,
    error,
    refresh: refreshData,
    lastFetched
  } = usePortfolioSummary();

  const { trends } = usePortfolioTrends();

  // Chart data (net worth)
  const chartData = useMemo(() => {
    if (!trends?.chartData) return [];
    return trends.chartData.map(d => {
      const dt = new Date(d.date);
      return {
        rawDate: d.date,
        date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: d.netWorth,
        totalAssets: d.totalAssets,
        totalLiabilities: d.totalLiabilities,
      };
    });
  }, [trends?.chartData]);

  const filteredChart = useMemo(
    () => filterByTimeframe(chartData, timeframe),
    [chartData, timeframe]
  );

  // Allocation / Mix
  const netWorthMixData = useMemo(() => {
    if (!summary) return [];
    const rows = [
      { key: 'securities', name: 'Securities', value: summary.assetAllocation?.securities?.value || 0, percentage: (summary.netWorthMix?.securities || 0) * 100, color: assetColors.securities },
      { key: 'cash',       name: 'Net Cash',   value: summary.altNetWorth?.netCash || 0, percentage: (summary.netWorthMix?.netCash || 0) * 100, color: assetColors.cash },
      { key: 'crypto',     name: 'Crypto',     value: summary.assetAllocation?.crypto?.value || 0, percentage: (summary.netWorthMix?.crypto || 0) * 100, color: assetColors.crypto },
      { key: 'metals',     name: 'Metals',     value: summary.assetAllocation?.metals?.value || 0, percentage: (summary.netWorthMix?.metals || 0) * 100, color: assetColors.metals },
      { key: 'real_estate',name: 'Real Estate',value: summary.altNetWorth?.realEstate || 0, percentage: (summary.netWorthMix?.realEstateEquity || 0) * 100, color: assetColors.real_estate },
      { key: 'other',      name: 'Other Assets', value: summary.altNetWorth?.netOtherAssets || 0, percentage: (summary.netWorthMix?.netOtherAssets || 0) * 100, color: assetColors.other },
    ].filter(x => x.value > 0 || x.percentage > 0);
    return rows;
  }, [summary]);

  // Top positions condensed
  const topPositionsData = useMemo(() => {
    if (!topPositions) return [];
    return topPositions.slice(0, 5).map(p => ({
      name: p.name || p.identifier,
      id: p.identifier,
      value: p.current_value ?? p.value ?? 0,
      pct: (p.gain_loss_percent || 0) * 100,
      gl: p.gain_loss || 0,
      type: p.asset_type || 'security'
    }));
  }, [topPositions]);

  // Institutions (top 3)
  const institutions = useMemo(() => {
    if (!rawInstitutionAllocation) return [];
    return rawInstitutionAllocation
      .slice(0, 3)
      .map(i => ({
        name: i.institution,
        percentage: (i.percentage || 0) * 100,
        color: i.primary_color || '#6B7280',
        accounts: i.account_count || 0
      }));
  }, [rawInstitutionAllocation]);

  // Day change
  const dayPct = summary?.periodChanges?.['1d']?.netWorthPercent ?? null;
  const dayAmt = summary?.periodChanges?.['1d']?.netWorthChange ?? null;

  // Tooltip for chart
  const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const v = payload[0]?.value ?? 0;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900/95 border border-gray-700 text-white px-3 py-2 rounded-lg shadow-lg"
        >
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-sm font-semibold">{fmtCurrency(v)}</div>
        </motion.div>
      );
    }
    return null;
  };

  // Loading
  if (loading && !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 to-blue-950 text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"
        />
        <div className="text-gray-400">Preparing your mobile dashboard…</div>
      </div>
    );
  }

  // Error
  if (error && !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6">
        <div className="text-red-400 font-semibold mb-2">We couldn’t load your portfolio</div>
        <div className="text-gray-400 text-sm mb-6 text-center max-w-sm">{error}</div>
        <button
          onClick={refreshData}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition"
        >
          Try again
        </button>
      </div>
    );
  }

  // Safe guards
  const netWorth = summary?.netWorth ?? 0;
  const totalAssets = summary?.totalAssets ?? 0;
  const totalLiabilities = summary?.liabilities?.total ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-925 to-gray-900 text-white">
      <Head>
        <title>NestEgg | Mobile Portfolio</title>
        <meta name="description" content="Effortlessly powerful mobile portfolio overview" />
      </Head>

      <main className="max-w-6xl mx-auto px-4 pb-24">
        {/* HERO */}
        <section className="pt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl p-5 md:p-6 bg-gradient-to-br from-indigo-600/20 via-blue-500/10 to-purple-600/20 border border-white/10 backdrop-blur"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/10" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white/10">
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                </div>
                <p className="text-xs text-indigo-200/90">Portfolio</p>
              </div>
              <button
                onClick={refreshData}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            <div className="mt-3 md:mt-4">
              <div className="text-xs text-gray-400">Net Worth</div>
              <div className="mt-1 text-3xl md:text-5xl font-semibold tracking-tight">
                {fmtCurrency(netWorth)}
              </div>

              {/* Day chip */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${chipBg(dayPct)}`}>
                  {dayPct != null && dayPct >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : dayPct != null ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
                  {dayPct != null ? fmtPct(dayPct) : '—'}
                </span>
                <span className="text-xs text-gray-400">
                  {dayAmt != null ? `${dayAmt >= 0 ? '+' : ''}${fmtCurrency(Math.abs(dayAmt)).replace('$','$')}` : '—'} today
                </span>
              </div>

              {/* Meta */}
              <div className="mt-3 text-[11px] text-gray-500">
                Last updated: {lastFetched ? new Date(lastFetched).toLocaleString() : '—'}
              </div>
            </div>
          </motion.div>
        </section>

        {/* TIMEFRAME SCROLLER */}
        <section className="mt-4">
          <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-1 px-1">
            {timeframeOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  timeframe === opt.id
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* CHART */}
        <section className="mt-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-500/15">
                  <LineIcon className="w-4 h-4 text-indigo-300" />
                </div>
                <h3 className="text-sm md:text-base font-medium">Net Worth Trend</h3>
              </div>
              <div className="text-[11px] text-gray-500">{timeframe.toUpperCase()}</div>
            </div>
            <div className="h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredChart} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                      if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
                      return `$${v.toLocaleString()}`;
                    }}
                  />
                  <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#nwFill)" />
                  <ReferenceLine y={filteredChart?.[0]?.value ?? 0} stroke="#334155" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* PERFORMANCE CHIPS */}
        <section className="mt-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
            <h3 className="text-sm md:text-base font-medium mb-3">Performance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {['1d','1w','1m','ytd','1y'].map(key => {
                const data = summary?.periodChanges?.[key];
                const amt = data?.netWorthChange ?? null;
                const pct = data?.netWorthPercent ?? null;
                return (
                  <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-[11px] text-gray-400 mb-1 uppercase">{key}</div>
                    <div className={`text-sm font-semibold ${chipColor(pct)}`}>
                      {pct != null ? fmtPct(pct) : '—'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {amt != null ? `${amt >= 0 ? '+' : ''}${fmtCurrency(Math.abs(amt)).replace('$', '$')}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ALLOCATION */}
        <section className="mt-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/15">
                  <PieChartIcon className="w-4 h-4 text-blue-300" />
                </div>
                <h3 className="text-sm md:text-base font-medium">Net Worth Mix</h3>
              </div>
              <button
                onClick={() => setShowK(!showK)}
                className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              >
                {showK ? 'Show $' : 'Show k'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Donut */}
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={netWorthMixData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      cornerRadius={6}
                      dataKey="value"
                    >
                      {netWorthMixData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center -mt-10">
                  <div className="text-[11px] text-gray-400">Total</div>
                  <div className="text-lg font-semibold">{fmtCurrency(netWorth, showK)}</div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {netWorthMixData.length === 0 && (
                  <div className="text-sm text-gray-400">No allocation available.</div>
                )}
                {netWorthMixData.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                      <span className="text-sm text-white truncate">{row.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">{fmtCurrency(row.value, showK)}</div>
                      <div className="text-[11px] text-gray-400">{row.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SNAPSHOTS */}
        <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Assets / Liabilities / Liquidity */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
            <h3 className="text-sm md:text-base font-medium mb-2">Snapshot</h3>
            <InfoRow label="Total Assets" value={fmtCurrency(totalAssets)} />
            <InfoRow label="Liabilities" value={`-${fmtCurrency(totalLiabilities).slice(1)}`} />
            <div className="pt-2 mt-1 border-t border-white/10">
              <InfoRow
                label="Liquidity Ratio"
                value={
                  summary?.riskMetrics?.liquidity_ratio != null
                    ? fmtPct((summary.riskMetrics.liquidity_ratio || 0) * 100)
                    : '—'
                }
                sub="Liquid / Total Assets"
              />
            </div>
          </div>

          {/* Personal Cash Flow */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
            <h3 className="text-sm md:text-base font-medium mb-2 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-300" /> Personal Cash Flow
            </h3>
            <InfoRow label="Net Cash Position" value={fmtCurrency(netCashBasisMetrics?.net_cash_position)} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { k: 'cash_flow_1d', lbl: 'Day' },
                { k: 'cash_flow_1w', lbl: 'Week' },
                { k: 'cash_flow_1m', lbl: 'Month' },
              ].map(({ k, lbl }) => {
                const flow = netCashBasisMetrics?.[k];
                return (
                  <div key={k} className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">
                    <div className="text-[11px] text-gray-400">{lbl}</div>
                    <div className={`text-sm font-semibold ${chipColor(flow)}`}>
                      {flow != null ? `${flow >= 0 ? '+' : ''}${fmtCurrency(Math.abs(flow)).replace('$', '$')}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Institutions */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
            <h3 className="text-sm md:text-base font-medium mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-300" /> Top Institutions
            </h3>
            {institutions.length === 0 && <div className="text-sm text-gray-400">No data</div>}
            <div className="space-y-2">
              {institutions.map((inst, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: inst.color }} />
                    <div>
                      <div className="text-sm text-white">{inst.name}</div>
                      <div className="text-[11px] text-gray-500">{inst.accounts} accounts</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-white">{inst.percentage.toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TOP POSITIONS */}
        <section className="mt-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="text-sm md:text-base font-medium">Top Positions</h3>
              <button
                onClick={() => router.push('/positions')}
                className="text-[11px] text-gray-400 hover:text-gray-200 inline-flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {topPositionsData.length === 0 ? (
              <div className="text-sm text-gray-400">No positions to show</div>
            ) : (
              <div className="divide-y divide-white/10">
                {topPositionsData.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: assetColors[p.type] || assetColors.other }}
                      />
                      <span className="text-sm text-white truncate max-w-[10rem] md:max-w-none">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{fmtCurrency(p.value)}</div>
                      <div className={`text-xs ${chipColor(p.pct)}`}>{fmtPct(p.pct)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => router.push('/accounts')}
              className="rounded-xl bg-gradient-to-br from-indigo-600/60 to-indigo-500/40 hover:to-indigo-500/55 border border-white/10 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <Wallet className="w-4 h-4" /> Accounts
            </button>
            <button
              onClick={() => router.push('/positions')}
              className="rounded-xl bg-gradient-to-br from-emerald-600/60 to-emerald-500/40 hover:to-emerald-500/55 border border-white/10 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <Layers className="w-4 h-4" /> Positions
            </button>
            <button
              onClick={() => router.push('/reports')}
              className="rounded-xl bg-gradient-to-br from-amber-600/60 to-amber-500/40 hover:to-amber-500/55 border border-white/10 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <TrendingUp className="w-4 h-4" /> Reports
            </button>
            <button
              onClick={() => router.push('/portfolio-command-center')}
              className="rounded-xl bg-gradient-to-br from-purple-600/60 to-purple-500/40 hover:to-purple-500/55 border border-white/10 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              <PieChartIcon className="w-4 h-4" /> Analytics
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
