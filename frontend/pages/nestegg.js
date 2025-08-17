// pages/nestegg.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useDataStore } from "@/store/DataStore";
import { usePortfolioSummary, usePortfolioTrends } from "@/store/hooks"; // uses existing store only :contentReference[oaicite:5]{index=5}

import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Brush, PieChart, Pie, Cell
} from "recharts";

import {
  DollarSign, Wallet, Activity, Percent, Gift, Droplet, Home, Shield, Layers,
  TrendingUp, TrendingDown, ArrowUp, ArrowDown, Sparkles, RefreshCw, Info,
  BarChart3, PieChart as PieIcon, Briefcase, Target, Settings, Database, Landmark,
  Building2, Zap, ChevronRight
} from "lucide-react";

/* ---------------------------
   Visual System & Helpers
--------------------------- */
const timeframeOptions = [
  { id: "1w", label: "1W", days: 7 },
  { id: "1m", label: "1M", days: 30 },
  { id: "3m", label: "3M", days: 90 },
  { id: "6m", label: "6M", days: 180 },
  { id: "ytd", label: "YTD", ytd: true },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "All", all: true },
];

const assetColors = {
  securities: "#4f46e5",
  security: "#4f46e5",
  cash: "#10b981",
  crypto: "#8b5cf6",
  bond: "#ec4899",
  metal: "#f59e0b",
  metals: "#f59e0b",
  currency: "#3b82f6",
  real_estate: "#14b8a6",
  other: "#6b7280",
  other_assets: "#6b7280",
};

const sectorPalette = {
  Technology: "#6366f1",
  "Financial Services": "#0ea5e9",
  Healthcare: "#10b981",
  "Consumer Cyclical": "#f59e0b",
  "Communication Services": "#8b5cf6",
  Industrials: "#64748b",
  "Consumer Defensive": "#14b8a6",
  Energy: "#f97316",
  "Basic Materials": "#f43f5e",
  "Real Estate": "#84cc16",
  Utilities: "#0284c7",
  Unknown: "#9ca3af",
  Other: "#9ca3af",
};

// unified motion system
const hoverSpring = { type: "spring", stiffness: 380, damping: 24 };
const cardHover = { scale: 1.02, transition: hoverSpring };
const cardTap = { scale: 0.98, transition: { duration: 0.08 } };

// number formatting (no new calc; presentation only)
const formatCurrency = (value, inK = false) => {
  if (value === null || value === undefined || isNaN(value)) return "-";
  if (inK) {
    const v = value / 1000;
    return `$${v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPct = (v) => {
  if (v === null || v === undefined || isNaN(v)) return "0%";
  return `${v > 0 ? "+" : ""}${(v).toFixed(2)}%`;
};

// timeframe filter (pure view-level filtering; no new metrics)
const filterByTimeframe = (rows, timeframeId) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (timeframeId === "all") return rows;

  const today = new Date();
  if (timeframeId === "ytd") {
    const start = new Date(today.getFullYear(), 0, 1);
    return rows.filter(d => {
      const dt = new Date(d._rawDate || d.date);
      return dt >= start && dt <= today;
    });
  }
  const spec = timeframeOptions.find(t => t.id === timeframeId);
  if (!spec?.days) return rows;
  const start = new Date(+today - spec.days * 24 * 60 * 60 * 1000);
  return rows.filter(d => {
    const dt = new Date(d._rawDate || d.date);
    return dt >= start && dt <= today;
  });
};

/* ---------------------------
   On-page Micro Components
--------------------------- */
const TimeframeSelector = ({ selected, onChange }) => (
  <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
    {timeframeOptions.map(opt => (
      <motion.button
        key={opt.id}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => onChange(opt.id)}
        className={`px-3 py-1.5 text-sm rounded-md transition
          ${selected === opt.id ? "bg-gray-700 text-white" : "text-gray-300 hover:text-white hover:bg-gray-700/60"}`}
      >
        {opt.label}
      </motion.button>
    ))}
  </div>
);

const SmallStat = ({ label, value, icon, hint }) => (
  <motion.div whileHover={cardHover} whileTap={cardTap}
    className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-gray-800">{icon}</div>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      {hint}
    </div>
    <div className="mt-1 text-xl font-semibold text-white">{value}</div>
  </motion.div>
);

const TrendBadge = ({ deltaPct }) => {
  if (deltaPct === null || deltaPct === undefined) return <span className="text-gray-400">--</span>;
  const up = deltaPct > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${up ? "text-green-400" : "text-red-400"}`}>
      <Icon className="w-3 h-3 mr-1" />
      {formatPct(deltaPct * 100)}
    </span>
  );
};

/* ---------------------------
   Main Page Component
--------------------------- */
export default function NestEgg() {
  const router = useRouter();
  const { state } = useDataStore(); // keeps DS wired for future needs

  // store data (no custom calc; all fields provided by your store) :contentReference[oaicite:6]{index=6}
  const {
    summary,
    topPositions,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    riskMetrics,
    concentrationMetrics,
    netCashBasisMetrics,
    history,
    loading: isLoading,
    error,
    refresh: refreshData,
    lastFetched,
    isStale,
  } = usePortfolioSummary();

  const { trends } = usePortfolioTrends(); // includes chartData for net worth, components, etc. :contentReference[oaicite:7]{index=7}

  // UI State
  const [timeframe, setTimeframe] = useState("3m");
  const [showK, setShowK] = useState(true);
  const [cursorIndex, setCursorIndex] = useState(null); // sync hover between charts
  const [brushDomain, setBrushDomain] = useState(null);

  // persist showK preference
  useEffect(() => {
    const pref = localStorage.getItem("nestegg_showK");
    if (pref !== null) setShowK(pref === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("nestegg_showK", String(showK));
  }, [showK]);

  // build unified rows from trends.chartData for Net Worth + Assets/Liabilities + Components
  const baseRows = useMemo(() => {
    if (!trends?.chartData || !Array.isArray(trends.chartData)) return [];
    return trends.chartData.map(day => ({
      date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      _rawDate: day.date,
      netWorth: day.netWorth,
      totalAssets: day.totalAssets,
      totalLiabilities: day.totalLiabilities,
      altLiquidNetWorth: day.altLiquidNetWorth || 0,
      altRetirementAssets: day.altRetirementAssets || 0,
      altIlliquidNetWorth: day.altIlliquidNetWorth || 0,
    }));
  }, [trends?.chartData]); // pure shaping (no math beyond picking fields) :contentReference[oaicite:8]{index=8}

  // optional “cash flow” line using existing history.net_cash_basis_metrics :contentReference[oaicite:9]{index=9}
  const cashFlowRows = useMemo(() => {
    if (!history?.length) return [];
    const rows = history
      .filter(h => h?.net_cash_basis_metrics?.net_cash_position !== undefined && h?.net_cash_basis_metrics?.net_cash_position !== null)
      .map(h => {
        const d = h.date || h.snapshot_date;
        return {
          _rawDate: d,
          date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          netCashPosition: h.net_cash_basis_metrics.net_cash_position,
          change: h.net_cash_basis_metrics.cash_flow_1d || 0,
          changePct: h.net_cash_basis_metrics.cash_flow_1d_pct || 0,
        };
      })
      .sort((a, b) => new Date(a._rawDate) - new Date(b._rawDate));
    return rows;
  }, [history]);

  // timeframe application (view filter only)
  const filteredMain = useMemo(() => {
    const rows = brushDomain ? baseRows.slice(brushDomain.startIndex, brushDomain.endIndex + 1) : baseRows;
    return filterByTimeframe(rows, timeframe);
  }, [baseRows, timeframe, brushDomain]);

  const filteredCash = useMemo(() => filterByTimeframe(cashFlowRows, timeframe), [cashFlowRows, timeframe]);

  // allocation from summary.netWorthMix / assetAllocation / altNetWorth (all store-provided) :contentReference[oaicite:10]{index=10}
  const netWorthMix = useMemo(() => {
    if (!summary) return [];
    const items = [
      { key: "securities", name: "Securities", value: summary.assetAllocation?.securities?.value, pct: summary.netWorthMix?.securities },
      { key: "netCash", name: "Net Cash", value: summary.altNetWorth?.netCash, pct: summary.netWorthMix?.netCash },
      { key: "crypto", name: "Crypto", value: summary.assetAllocation?.crypto?.value, pct: summary.netWorthMix?.crypto },
      { key: "metals", name: "Metals", value: summary.assetAllocation?.metals?.value, pct: summary.netWorthMix?.metals },
      { key: "realEstateEquity", name: "Real Estate", value: summary.altNetWorth?.realEstate, pct: summary.netWorthMix?.realEstateEquity },
      { key: "netOtherAssets", name: "Other Assets", value: summary.altNetWorth?.netOtherAssets, pct: summary.netWorthMix?.netOtherAssets },
    ].filter(i => (i.value ?? 0) > 0 || (i.pct ?? 0) > 0);
    return items.map(i => ({ ...i, color: assetColors[i.key] || assetColors.other }));
  }, [summary]);

  // sector allocation
  const sectorRows = useMemo(() => {
    if (!rawSectorAllocation || typeof rawSectorAllocation !== "object") return [];
    return Object.entries(rawSectorAllocation)
      .filter(([, d]) => d && d.value > 0)
      .map(([name, d]) => ({
        name: name || "Unknown",
        value: d.value,
        percentage: (d.percentage || 0) * 100,
        positionCount: d.position_count || 0,
        color: sectorPalette[name] || sectorPalette.Unknown,
      }))
      .sort((a, b) => b.value - a.value);
  }, [rawSectorAllocation]);

  // institution mix
  const instRows = useMemo(() => {
    if (!Array.isArray(rawInstitutionAllocation)) return [];
    return rawInstitutionAllocation
      .filter(i => i?.value > 0)
      .map(i => ({
        name: i.institution,
        value: i.value,
        percentage: i.percentage || 0,
        accountCount: i.account_count || 0,
        positionCount: i.position_count || 0,
        color: i.primary_color || "#6B7280",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [rawInstitutionAllocation]);

  // top positions (peek)
  const topPositionsPeek = useMemo(() => {
    if (!Array.isArray(topPositions)) return [];
    return topPositions.slice(0, 6).map(p => ({
      name: p.name || p.identifier,
      id: p.identifier,
      value: p.current_value ?? p.value,
      gainLoss: p.gain_loss ?? 0,
      gainLossPercent: p.gain_loss_percent ?? 0,
      account: p.account_name,
      assetType: p.asset_type || "security",
      percentage: p.percentage || 0,
    }));
  }, [topPositions]);

  // linked hover coordination
  const onSyncHover = useCallback((e) => {
    if (!e?.activeTooltipIndex && e?.activeTooltipIndex !== 0) {
      setCursorIndex(null);
      return;
    }
    setCursorIndex(e.activeTooltipIndex);
  }, []);

  const onBrushChange = (range) => {
    if (!range || range.startIndex === undefined || range.endIndex === undefined) return;
    setBrushDomain({ startIndex: range.startIndex, endIndex: range.endIndex });
  };

  // empty / error guards
  const hasData = !!summary && filteredMain.length > 0;

  /* ---------------------------
     Render
  --------------------------- */
  return (
    <>
      <Head><title>NestEgg • Portfolio</title></Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-gray-100">
        {/* HERO */}
        <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-gray-950/70 bg-gray-950/90 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 6, -6, 0] }}
                  transition={{ duration: 6, repeat: Infinity }}
                  className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold">NestEgg — Portfolio Command Center</h1>
                  <p className="text-xs text-gray-400">
                    Last updated:{" "}
                    {lastFetched
                      ? new Date(lastFetched).toLocaleString()
                      : "—"}
                    {isStale && (
                      <span className="ml-2 inline-flex items-center text-amber-400">
                        <Info className="w-3 h-3 mr-1" /> Stale
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Utility Bar */}
              <div className="flex items-center gap-3">
                <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setShowK(v => !v)}
                  className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-sm"
                  aria-pressed={showK}
                >
                  {showK ? "Display: $K" : "Display: $"}
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  onClick={refreshData}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* MAIN COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            {/* OVERVIEW BAND */}
            <AnimatePresence mode="popLayout">
              {!isLoading && summary && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SmallStat
                      label="Net Worth"
                      value={formatCurrency(summary.netWorth, showK)}
                      icon={<DollarSign className="w-4 h-4 text-indigo-400" />}
                      hint={<TrendBadge deltaPct={summary?.periodChanges?.["1d"]?.netWorthPercent} />}
                    />
                    <SmallStat
                      label="Total Assets"
                      value={formatCurrency(summary.totalAssets, showK)}
                      icon={<Wallet className="w-4 h-4 text-emerald-400" />}
                      hint={<span className="text-xs text-gray-400">{formatCurrency(summary.liquidAssets, showK)} liquid</span>}
                    />
                    <SmallStat
                      label="Unrealized Gain"
                      value={formatCurrency(summary.unrealizedGain, showK)}
                      icon={<Activity className="w-4 h-4 text-emerald-400" />}
                      hint={<span className={summary.unrealizedGainPercent >= 0 ? "text-green-400 text-xs" : "text-red-400 text-xs"}>
                        {formatPct((summary.unrealizedGainPercent || 0) * 100)}
                      </span>}
                    />
                    <SmallStat
                      label="Annual Income"
                      value={formatCurrency(summary.income?.annual, showK)}
                      icon={<Gift className="w-4 h-4 text-amber-400" />}
                      hint={<span className="text-xs text-gray-400"><Percent className="w-3 h-3 inline mr-1" />
                        {formatPct((summary.income?.yield || 0) * 100)} yield</span>}
                    />
                  </div>

                  {/* Component KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <SmallStat
                      label="Liquid Net Worth"
                      value={formatCurrency(summary.altLiquidNetWorth, showK)}
                      icon={<Droplet className="w-4 h-4 text-blue-400" />}
                      hint={<span className={`${(summary.altLiquidNetWorthYTDChangePercent||0)>=0?"text-green-400":"text-red-400"} text-xs`}>
                        {formatCurrency(Math.abs(summary.altLiquidNetWorthYTDChange), showK)} ({formatPct((summary.altLiquidNetWorthYTDChangePercent||0)*100)}) YTD
                      </span>}
                    />
                    <SmallStat
                      label="Retirement Assets"
                      value={formatCurrency(summary.altRetirementAssets, showK)}
                      icon={<Shield className="w-4 h-4 text-green-400" />}
                      hint={<span className={`${(summary.altRetirementAssetsYTDChangePercent||0)>=0?"text-green-400":"text-red-400"} text-xs`}>
                        {formatCurrency(Math.abs(summary.altRetirementAssetsYTDChange), showK)} ({formatPct((summary.altRetirementAssetsYTDChangePercent||0)*100)}) YTD
                      </span>}
                    />
                    <SmallStat
                      label="Illiquid Net Worth"
                      value={formatCurrency(summary.altIlliquidNetWorth, showK)}
                      icon={<Home className="w-4 h-4 text-purple-400" />}
                      hint={<span className={`${(summary.altIlliquidNetWorthYTDChangePercent||0)>=0?"text-green-400":"text-red-400"} text-xs`}>
                        {formatCurrency(Math.abs(summary.altIlliquidNetWorthYTDChange), showK)} ({formatPct((summary.altIlliquidNetWorthYTDChangePercent||0)*100)}) YTD
                      </span>}
                    />
                    <SmallStat
                      label="Liabilities"
                      value={formatCurrency(summary?.liabilities?.total || 0, showK)}
                      icon={<Layers className="w-4 h-4 text-rose-400" />}
                      hint={<span className="text-xs text-gray-400">{summary?.positionStats?.totalCount} positions</span>}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LINKED TRENDS BAND */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold">Trended Net Worth</h3>
                </div>
                <span className="text-xs text-gray-400">Hover to sync; brush to zoom</span>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredMain}
                    onMouseMove={onSyncHover}
                    onMouseLeave={() => setCursorIndex(null)}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={v => formatCurrency(v, showK)} width={72} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload?.length) {
                          const a = payload.find(p => p.dataKey === "totalAssets")?.value;
                          const l = payload.find(p => p.dataKey === "totalLiabilities")?.value;
                          return (
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
                              <div className="text-white font-medium">{label}</div>
                              <div className="text-indigo-400">Net Worth: {formatCurrency(payload[0].value, showK)}</div>
                              {a !== undefined && <div className="text-emerald-400">Assets: {formatCurrency(a, showK)}</div>}
                              {l > 0 && <div className="text-rose-400">Liabilities: {formatCurrency(l, showK)}</div>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="netWorth" stroke="#4f46e5" fill="url(#nw)" strokeWidth={2} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="totalAssets" stroke="#10b981" dot={false} strokeOpacity={0.7} />
                    <Line type="monotone" dataKey="totalLiabilities" stroke="#ef4444" dot={false} strokeOpacity={0.7} />
                    <Brush dataKey="date" height={18} stroke="#4f46e5" onChange={onBrushChange} travellerWidth={8} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Components — linked hover (synchronized via cursorIndex) */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <PieIcon className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold">Net Worth Components</h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredMain}
                      onMouseMove={onSyncHover}
                      onMouseLeave={() => setCursorIndex(null)}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={v => formatCurrency(v, showK)} width={72} />
                      <Tooltip formatter={(v) => formatCurrency(v, showK)} />
                      <Legend />
                      <Line type="monotone" dataKey="altLiquidNetWorth" name="Liquid NW" stroke="#3b82f6" dot={false} />
                      <Line type="monotone" dataKey="altRetirementAssets" name="Retirement" stroke="#10b981" dot={false} />
                      <Line type="monotone" dataKey="altIlliquidNetWorth" name="Illiquid NW" stroke="#a855f7" dot={false} />
                      {cursorIndex !== null && (
                        <ReferenceLine x={filteredMain[cursorIndex]?.date} stroke="#6b7280" strokeDasharray="3 3" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Optional: Cash Basis Trend (from history) */}
              {filteredCash.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold">Net Cash (Cash Basis)</h3>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredCash} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#1f2937" />
                        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={v => formatCurrency(v, showK)} width={72} />
                        <Tooltip formatter={(v) => formatCurrency(v, showK)} />
                        <Area type="monotone" dataKey="netCashPosition" stroke="#22c55e" fill="url(#cash)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ALLOCATION BAND */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Net Worth Mix Donut */}
                <div className="md:col-span-1">
                  <div className="flex items-center gap-2 mb-2">
                    <PieIcon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold">Net Worth Mix</h3>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={netWorthMix.map(i => ({ name: i.name, value: i.value, pct: (i.pct || 0) * 100, color: i.color }))}
                          dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%"
                        >
                          {netWorthMix.map((i, idx) => <Cell key={idx} fill={i.color} />)}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload?.length) {
                              const d = payload[0]?.payload;
                              return (
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
                                  <div className="text-white font-medium">{d.name}</div>
                                  <div className="text-indigo-400">{(d.pct || 0).toFixed(1)}%</div>
                                  <div className="text-gray-300">{formatCurrency(d.value, showK)}</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sector Bars */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold">Sector Allocation</h3>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorRows}>
                        <CartesianGrid vertical={false} stroke="#1f2937" />
                        <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload?.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
                                  <div className="text-white font-medium">{d.name}</div>
                                  <div className="text-indigo-400">{d.percentage.toFixed(1)}%</div>
                                  <div className="text-gray-300">{formatCurrency(d.value, showK)}</div>
                                  <div className="text-gray-400">{d.positionCount} positions</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value">
                          {sectorRows.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Institutions */}
              {instRows.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold">Top Institutions</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {instRows.map((i, idx) => (
                      <motion.div key={idx} whileHover={cardHover} whileTap={cardTap}
                        className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i.color }} />
                            <div className="text-sm font-medium">{i.name}</div>
                          </div>
                          <span className="text-xs text-gray-400">{(i.percentage*100).toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 text-lg font-semibold">{formatCurrency(i.value, showK)}</div>
                        <div className="mt-1 text-xs text-gray-400">{i.accountCount} accounts • {i.positionCount} positions</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* INSIGHT RAIL */}
          <div className="lg:col-span-4 space-y-6">
            {/* Risk & Concentration */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold">Risk Snapshot</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SmallStat label="Liquidity Ratio" value={formatPct(((riskMetrics?.liquidityRatioPct) || 0) * 100)} icon={<Droplet className="w-4 h-4 text-blue-400" />} />
                <SmallStat label="Top Position %" value={formatPct(((concentrationMetrics?.topPositionPct) || 0) * 100)} icon={<Target className="w-4 h-4 text-rose-400" />} />
                <SmallStat label="Top 5 Positions %" value={formatPct(((concentrationMetrics?.top5PositionsPct) || 0) * 100)} icon={<Layers className="w-4 h-4 text-purple-400" />} />
                <SmallStat label="Accounts Active" value={String(summary?.positionStats?.activeAccountCount ?? 0)} icon={<Briefcase className="w-4 h-4 text-emerald-400" />} />
              </div>
            </motion.div>

            {/* Top Positions Peek */}
            {topPositionsPeek.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold">Top Positions</h3>
                  </div>
                  <button
                    onClick={() => router.push("/positions")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {topPositionsPeek.map((p, idx) => {
                    const up = (p.gainLossPercent || 0) >= 0;
                    return (
                      <motion.div key={idx} whileHover={{ x: 2 }} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-3">
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.account}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{formatCurrency(p.value, showK)}</div>
                          <div className={`text-xs ${up ? "text-green-400" : "text-red-400"}`}>
                            {up ? <ArrowUp className="w-3 h-3 inline mr-1" /> : <ArrowDown className="w-3 h-3 inline mr-1" />}
                            {formatPct((p.gainLossPercent || 0) * 100)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* EMPTY / ERROR / LOADING */}
        {!hasData && !isLoading && !error && (
          <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">
            No portfolio data available.
          </div>
        )}
        {error && (
          <div className="max-w-7xl mx-auto px-4 py-16 text-center text-rose-400">
            Something went wrong: {String(error)}
          </div>
        )}
        {isLoading && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="h-40 rounded-2xl bg-gray-800/40" />
                <div className="h-72 rounded-2xl bg-gray-800/40" />
                <div className="h-72 rounded-2xl bg-gray-800/40" />
              </div>
              <div className="lg:col-span-4 space-y-6">
                <div className="h-56 rounded-2xl bg-gray-800/40" />
                <div className="h-56 rounded-2xl bg-gray-800/40" />
              </div>
            </div>
          </div>
        )}

        {/* STICKY COMMAND SHELF */}
        <div className="sticky bottom-4 z-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="rounded-2xl bg-gray-900/90 border border-gray-800 shadow-2xl p-2 flex items-center justify-between gap-2">
              <motion.button whileHover={cardHover} whileTap={cardTap}
                onClick={() => router.push("/positions")}
                className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 inline-flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" /> Positions
              </motion.button>
              <motion.button whileHover={cardHover} whileTap={cardTap}
                onClick={() => router.push("/accounts")}
                className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 inline-flex items-center justify-center gap-2">
                <Wallet className="w-4 h-4" /> Accounts
              </motion.button>
              <motion.button whileHover={cardHover} whileTap={cardTap}
                onClick={() => router.push("/reconciliation")}
                className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 inline-flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Reconcile
              </motion.button>
              <motion.button whileHover={cardHover} whileTap={cardTap}
                onClick={() => router.push("/settings")}
                className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 inline-flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" /> Settings
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
