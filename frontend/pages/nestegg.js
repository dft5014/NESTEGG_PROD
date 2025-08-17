// pages/nestegg.js
import { useEffect, useMemo, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useDataStore } from "@/store/DataStore";
import { usePortfolioSummary, usePortfolioTrends } from "@/store/hooks";

import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Brush,
  PieChart, Pie, Cell, Treemap
} from "recharts";

import {
  DollarSign, Wallet, Activity, Percent, Gift, Droplet, Home, Shield, Layers,
  TrendingUp, TrendingDown, ArrowUp, ArrowDown, Sparkles, RefreshCw, Info,
  BarChart3, PieChart as PieIcon, Briefcase, Target, Settings, Database, Landmark,
  Building2, Zap, ChevronRight, HelpCircle, LayoutGrid, Maximize2, Download, SlidersHorizontal, X
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

const perfBands = [
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "ytd", label: "YTD" },
  { id: "1y", label: "1Y" },
];

const assetColors = {
  securities: "#4f46e5",
  security: "#4f46e5",
  cash: "#10b981",
  netCash: "#10b981",
  crypto: "#8b5cf6",
  bond: "#ec4899",
  metal: "#f59e0b",
  metals: "#f59e0b",
  currency: "#3b82f6",
  real_estate: "#14b8a6",
  realEstateEquity: "#14b8a6",
  other: "#6b7280",
  other_assets: "#6b7280",
  altLiquidNetWorth: "#3b82f6",
  altRetirementAssets: "#10b981",
  altIlliquidNetWorth: "#a855f7",
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

// formatters (presentation only)
const isFiniteNum = (v) => Number.isFinite(v);
const formatCurrency = (value, inK = false) => {
  if (!isFiniteNum(value)) return "-";
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
  if (!isFiniteNum(v)) return "0%";
  return `${v > 0 ? "+" : ""}${(v).toFixed(2)}%`;
};

// timeframe filtering (view-only)
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
const filterByPerfBand = (rows, perfId) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (perfId === "ytd") return filterByTimeframe(rows, "ytd");
  if (perfId === "1d") {
    const today = new Date();
    const start = new Date(+today - 1 * 24 * 60 * 60 * 1000);
    return rows.filter(d => {
      const dt = new Date(d._rawDate || d.date);
      return dt >= start && dt <= today;
    });
  }
  if (perfId === "1w") return filterByTimeframe(rows, "1w");
  if (perfId === "1m") return filterByTimeframe(rows, "1m");
  if (perfId === "1y") return filterByTimeframe(rows, "1y");
  return rows;
};

// csv download of current trend window (no new calcs)
const downloadCSV = (rows) => {
  if (!rows?.length) return;
  const head = ["date", "netWorth", "totalAssets", "totalLiabilities"];
  const body = rows.map(r => [
    r._rawDate || r.date,
    isFiniteNum(r.netWorth) ? r.netWorth : "",
    isFiniteNum(r.totalAssets) ? r.totalAssets : "",
    isFiniteNum(r.totalLiabilities) ? r.totalLiabilities : ""
  ]);
  const csv = [head, ...body].map(a => a.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nestegg_trend_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------------------------
   Micro Components
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
  if (!isFiniteNum(deltaPct)) return <span className="text-gray-400">--</span>;
  const up = deltaPct > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${up ? "text-green-400" : "text-red-400"}`}>
      <Icon className="w-3 h-3 mr-1" />
      {formatPct(deltaPct * 100)}
    </span>
  );
};

const PerfCard = ({ label, abs, pct, series, showK, paletteMuted }) => {
  const up = (pct || 0) >= 0;
  const safeSeries = Array.isArray(series)
    ? series.filter(pt => isFiniteNum(pt?.netWorth) && pt?.date)
    : [];
  const hasLine = safeSeries.length >= 2;

  return (
    <motion.div whileHover={cardHover} whileTap={cardTap} className="rounded-xl border border-gray-700 bg-gray-900/70 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">{label}</div>
        <div className={`text-xs ${up ? "text-green-400" : "text-red-400"}`}>
          {up ? <ArrowUp className="w-3 h-3 inline mr-1" /> : <ArrowDown className="w-3 h-3 inline mr-1" />}
          {formatPct((pct || 0) * 100)}
        </div>
      </div>
      <div className="text-sm text-white font-semibold mt-0.5">{formatCurrency(abs || 0, showK)}</div>
      <div className="h-8 mt-2">
        {hasLine ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeSeries}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip formatter={(v) => formatCurrency(v, showK)} />
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke={paletteMuted ? "#a5b4fc" : "#4f46e5"}
                dot={false}
                strokeWidth={1.8}
                opacity={paletteMuted ? 0.8 : 1}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded bg-gray-800/60" />
        )}
      </div>
    </motion.div>
  );
};

/* ---------------------------
   Main Page Component
--------------------------- */
export default function NestEgg() {
  const router = useRouter();
  useDataStore(); // keep DS warm for future needs

  // store data (no new calcs — presentation only)
  const {
    summary,
    topPositions,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    riskMetrics,
    concentrationMetrics,
    history,
    loading: isLoading,
    error,
    refresh: refreshData,
    lastFetched,
    isStale,
  } = usePortfolioSummary();

  const { trends } = usePortfolioTrends();

  // UI State
  const [timeframe, setTimeframe] = useState("3m");
  const [showK, setShowK] = useState(true);
  const [cursorIndex, setCursorIndex] = useState(null);
  const [brushDomain, setBrushDomain] = useState(null);
  const [paletteMuted, setPaletteMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusTrends, setFocusTrends] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showComp, setShowComp] = useState({ liquid: true, retirement: true, illiquid: true });

  // Cross-highlighting
  const [hoveredSector, setHoveredSector] = useState(null);
  const [hoveredInstitution, setHoveredInstitution] = useState(null);
  const [hoveredAssetKey, setHoveredAssetKey] = useState(null);

  // persist prefs
  useEffect(() => {
    const prefK = localStorage.getItem("nestegg_showK");
    if (prefK !== null) setShowK(prefK === "true");
    const pal = localStorage.getItem("nestegg_paletteMuted");
    if (pal !== null) setPaletteMuted(pal === "true");
    const base = localStorage.getItem("nestegg_showBaseline");
    if (base !== null) setShowBaseline(base === "true");
  }, []);
  useEffect(() => { localStorage.setItem("nestegg_showK", String(showK)); }, [showK]);
  useEffect(() => { localStorage.setItem("nestegg_paletteMuted", String(paletteMuted)); }, [paletteMuted]);
  useEffect(() => { localStorage.setItem("nestegg_showBaseline", String(showBaseline)); }, [showBaseline]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "]") {
        e.preventDefault();
        const idx = timeframeOptions.findIndex(t => t.id === timeframe);
        const next = timeframeOptions[(idx + 1) % timeframeOptions.length]?.id || timeframe;
        setTimeframe(next);
      } else if (e.key === "ArrowLeft" || e.key === "[") {
        e.preventDefault();
        const idx = timeframeOptions.findIndex(t => t.id === timeframe);
        const prev = timeframeOptions[(idx - 1 + timeframeOptions.length) % timeframeOptions.length]?.id || timeframe;
        setTimeframe(prev);
      } else if (e.key.toLowerCase() === "r") {
        refreshData();
      } else if (e.key.toLowerCase() === "k") {
        setShowK(v => !v);
      } else if (e.key === "?") {
        setShowHelp(v => !v);
      } else if (e.key.toLowerCase() === "f") {
        setFocusTrends(v => !v);
      } else if (e.key.toLowerCase() === "b") {
        setShowBaseline(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timeframe, refreshData]);

  // reshape trends for charts; guard numbers (no new math)
  const baseRowsAll = useMemo(() => {
    const arr = Array.isArray(trends?.chartData) ? trends.chartData : [];
    return arr.map(day => ({
      date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      _rawDate: day.date,
      netWorth: isFiniteNum(day.netWorth) ? day.netWorth : null,
      totalAssets: isFiniteNum(day.totalAssets) ? day.totalAssets : null,
      totalLiabilities: isFiniteNum(day.totalLiabilities) ? day.totalLiabilities : null,
      altLiquidNetWorth: isFiniteNum(day.altLiquidNetWorth) ? day.altLiquidNetWorth : 0,
      altRetirementAssets: isFiniteNum(day.altRetirementAssets) ? day.altRetirementAssets : 0,
      altIlliquidNetWorth: isFiniteNum(day.altIlliquidNetWorth) ? day.altIlliquidNetWorth : 0,
    })).filter(r => isFiniteNum(r.netWorth)); // ensure primary series safe
  }, [trends?.chartData]);

  const cashFlowRows = useMemo(() => {
    const arr = Array.isArray(history) ? history : [];
    const rows = arr
      .filter(h => isFiniteNum(h?.net_cash_basis_metrics?.net_cash_position))
      .map(h => {
        const d = h.date || h.snapshot_date;
        return {
          _rawDate: d,
          date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          netCashPosition: h.net_cash_basis_metrics.net_cash_position,
          change: isFiniteNum(h.net_cash_basis_metrics.cash_flow_1d) ? h.net_cash_basis_metrics.cash_flow_1d : 0,
          changePct: isFiniteNum(h.net_cash_basis_metrics.cash_flow_1d_pct) ? h.net_cash_basis_metrics.cash_flow_1d_pct : 0,
        };
      })
      .sort((a, b) => new Date(a._rawDate) - new Date(b._rawDate));
    return rows;
  }, [history]);

  // timeframe filters
  const baseRows = useMemo(() => {
    const rows = brushDomain
      ? baseRowsAll.slice(brushDomain.startIndex, brushDomain.endIndex + 1)
      : baseRowsAll;
    return filterByTimeframe(rows, timeframe);
  }, [baseRowsAll, timeframe, brushDomain]);

  const filteredCash = useMemo(() => filterByTimeframe(cashFlowRows, timeframe), [cashFlowRows, timeframe]);

  // YTD baseline (first value of current window)
  const baselineValue = useMemo(() => {
    if (!showBaseline || baseRows.length < 1) return null;
    return baseRows[0]?.netWorth ?? null;
  }, [baseRows, showBaseline]);

  // net worth mix from summary (no math, just mapping)
  const netWorthMix = useMemo(() => {
    if (!summary) return [];
    const items = [
      { key: "securities", name: "Securities", value: summary.assetAllocation?.securities?.value, pct: summary.netWorthMix?.securities },
      { key: "netCash", name: "Net Cash", value: summary.altNetWorth?.netCash, pct: summary.netWorthMix?.netCash },
      { key: "crypto", name: "Crypto", value: summary.assetAllocation?.crypto?.value, pct: summary.netWorthMix?.crypto },
      { key: "metals", name: "Metals", value: summary.assetAllocation?.metals?.value, pct: summary.netWorthMix?.metals },
      { key: "realEstateEquity", name: "Real Estate", value: summary.altNetWorth?.realEstate, pct: summary.netWorthMix?.realEstateEquity },
      { key: "netOtherAssets", name: "Other Assets", value: summary.altNetWorth?.netOtherAssets, pct: summary.netWorthMix?.netOtherAssets },
    ];
    return items
      .filter(i => isFiniteNum(i.value) || isFiniteNum(i.pct))
      .map(i => ({ ...i, color: assetColors[i.key] || assetColors.other }));
  }, [summary]);

  // sectors
  const sectorRows = useMemo(() => {
    if (!rawSectorAllocation || typeof rawSectorAllocation !== "object") return [];
    return Object.entries(rawSectorAllocation)
      .filter(([, d]) => d && isFiniteNum(d.value) && d.value > 0)
      .map(([name, d]) => ({
        name: name || "Unknown",
        value: d.value,
        percentage: isFiniteNum(d.percentage) ? d.percentage * 100 : 0,
        positionCount: d.position_count || 0,
        color: sectorPalette[name] || sectorPalette.Unknown,
      }))
      .sort((a, b) => b.value - a.value);
  }, [rawSectorAllocation]);

  // institutions
  const instRows = useMemo(() => {
    if (!Array.isArray(rawInstitutionAllocation)) return [];
    return rawInstitutionAllocation
      .filter(i => isFiniteNum(i?.value) && i.value > 0)
      .map(i => ({
        name: i.institution,
        value: i.value,
        percentage: isFiniteNum(i.percentage) ? i.percentage : 0,
        accountCount: i.account_count || 0,
        positionCount: i.position_count || 0,
        color: i.primary_color || "#6B7280",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [rawInstitutionAllocation]);

  // top positions peek (no math)
  const topPositionsPeek = useMemo(() => {
    if (!Array.isArray(topPositions)) return [];
    return topPositions.slice(0, 12).map(p => ({
      name: p.name || p.identifier,
      id: p.identifier,
      value: isFiniteNum(p.current_value) ? p.current_value : (isFiniteNum(p.value) ? p.value : 0),
      gainLoss: isFiniteNum(p.gain_loss) ? p.gain_loss : 0,
      gainLossPercent: isFiniteNum(p.gain_loss_percent) ? p.gain_loss_percent : 0,
      account: p.account_name || p.account || "",
      assetType: p.asset_type || "security",
      percentage: isFiniteNum(p.percentage) ? p.percentage : 0,
      sector: p.sector || p.sector_name || null,
      institution: p.institution || p.institution_name || null,
    }));
  }, [topPositions]);

  // performance KPI bands (from store only)
  const perfSeries = useMemo(() => {
    const map = {};
    perfBands.forEach(b => {
      map[b.id] = filterByPerfBand(baseRowsAll, b.id);
    });
    return map;
  }, [baseRowsAll]);

  const onSyncHover = useCallback((e) => {
    if (!e?.activeTooltipIndex && e?.activeTooltipIndex !== 0) return setCursorIndex(null);
    setCursorIndex(e.activeTooltipIndex);
  }, []);
  const onBrushChange = (range) => {
    if (!range || range.startIndex === undefined || range.endIndex === undefined) return;
    setBrushDomain({ startIndex: range.startIndex, endIndex: range.endIndex });
  };

  const hasData = !!summary && baseRows.length > 0;

  // narrative strip: 1M when available
  const narrativeBand = "1m";
  const bandData = summary?.periodChanges?.[narrativeBand] || null;
  const bandAbs = isFiniteNum(bandData?.netWorthAbs) ? bandData.netWorthAbs : null;
  const bandPct = isFiniteNum(bandData?.netWorthPercent) ? bandData.netWorthPercent : null;
  const topMix = (netWorthMix || []).slice().sort((a, b) => (b.pct || 0) - (a.pct || 0)).slice(0, 3);

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
                  className={`p-2 rounded-xl ${paletteMuted ? "bg-gray-700" : "bg-gradient-to-br from-indigo-500 to-blue-500"} shadow`}
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold">NestEgg — Portfolio Command Center</h1>
                  <p className="text-xs text-gray-400">
                    Last updated:{" "}
                    {lastFetched ? new Date(lastFetched).toLocaleString() : "—"}
                    {isStale && (
                      <span className="ml-2 inline-flex items-center text-amber-400">
                        <Info className="w-3 h-3 mr-1" /> Stale
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Utility Bar */}
              <div className="flex items-center gap-2">
                <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setShowK(v => !v)}
                  className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-sm"
                  aria-pressed={showK}
                >
                  {showK ? "Display: $K" : "Display: $"}
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setPaletteMuted(v => !v)}
                  className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-sm"
                  aria-pressed={paletteMuted}
                >
                  {paletteMuted ? "Theme: Muted" : "Theme: Vibrant"}
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  onClick={refreshData}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setShowHelp(true)}
                  title="Keyboard shortcuts"
                  className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Narrative strip */}
            {summary && (
              <div className="mt-2 text-xs text-gray-300">
                {bandAbs !== null && bandPct !== null ? (
                  <>
                    In the past month, your Net Worth is{" "}
                    <span className={`${bandAbs >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {bandAbs >= 0 ? "up" : "down"} {formatCurrency(Math.abs(bandAbs), showK)} ({formatPct((bandPct || 0) * 100)})
                    </span>
                    . Mix highlights:{" "}
                    {topMix.map((m, i) => (
                      <span key={m.key} className="mr-2">
                        {m.name} {(m.pct * 100).toFixed(1)}%
                        {i < topMix.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </>
                ) : (
                  "Performance overview will appear as data loads."
                )}
              </div>
            )}
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
                  {/* KPI row */}
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

                  {/* Performance band with sparklines */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    {perfBands.map(b => {
                      const abs = summary?.periodChanges?.[b.id]?.netWorthAbs;
                      const pct = summary?.periodChanges?.[b.id]?.netWorthPercent;
                      return (
                        <PerfCard
                          key={b.id}
                          label={b.label}
                          abs={abs}
                          pct={pct}
                          series={perfSeries[b.id] || []}
                          showK={showK}
                          paletteMuted={paletteMuted}
                        />
                      );
                    })}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBaseline(v => !v)}
                    className={`text-xs px-2 py-1 rounded border ${showBaseline ? "border-indigo-500 text-indigo-300" : "border-gray-700 text-gray-400"} hover:border-indigo-500`}
                  >
                    Baseline
                  </button>
                  <button
                    onClick={() => downloadCSV(baseRows)}
                    className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-300 inline-flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
                  <button
                    onClick={() => setFocusTrends(true)}
                    className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-300 inline-flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" /> Focus
                  </button>
                </div>
              </div>

              <div className="h-56">
                {baseRows.length >= 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={baseRows}
                      onMouseMove={onSyncHover}
                      onMouseLeave={() => setCursorIndex(null)}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={paletteMuted ? 0.35 : 0.55} />
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
                            const nw = payload.find(p => p.dataKey === "netWorth")?.value;
                            return (
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
                                <div className="text-white font-medium">{label}</div>
                                {isFiniteNum(nw) && <div className="text-indigo-400">Net Worth: {formatCurrency(nw, showK)}</div>}
                                {isFiniteNum(a) && <div className="text-emerald-400">Assets: {formatCurrency(a, showK)}</div>}
                                {isFiniteNum(l) && l > 0 && <div className="text-rose-400">Liabilities: {formatCurrency(l, showK)}</div>}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {baselineValue !== null && <ReferenceLine y={baselineValue} stroke="#64748b" strokeDasharray="3 3" />}
                      <Area type="monotone" dataKey="netWorth" stroke="#4f46e5" fill="url(#nw)" strokeWidth={2} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="totalAssets" stroke="#10b981" dot={false} strokeOpacity={0.7} isAnimationActive={false} />
                      <Line type="monotone" dataKey="totalLiabilities" stroke="#ef4444" dot={false} strokeOpacity={0.7} isAnimationActive={false} />
                      <Brush dataKey="date" height={18} stroke="#4f46e5" onChange={onBrushChange} travellerWidth={8} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded bg-gray-800/30 flex items-center justify-center text-sm text-gray-500">Insufficient data</div>
                )}
              </div>

              {/* Components — linked hover with toggles */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold">Net Worth Components</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                    <button onClick={() => setShowComp(s => ({ ...s, liquid: !s.liquid }))}
                      className={`px-2 py-0.5 rounded border ${showComp.liquid ? "border-blue-500 text-blue-300" : "border-gray-700 text-gray-400"}`}>Liquid</button>
                    <button onClick={() => setShowComp(s => ({ ...s, retirement: !s.retirement }))}
                      className={`px-2 py-0.5 rounded border ${showComp.retirement ? "border-emerald-500 text-emerald-300" : "border-gray-700 text-gray-400"}`}>Retirement</button>
                    <button onClick={() => setShowComp(s => ({ ...s, illiquid: !s.illiquid }))}
                      className={`px-2 py-0.5 rounded border ${showComp.illiquid ? "border-purple-500 text-purple-300" : "border-gray-700 text-gray-400"}`}>Illiquid</button>
                  </div>
                </div>
                <div className="h-48">
                  {baseRows.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={baseRows}
                        onMouseMove={onSyncHover}
                        onMouseLeave={() => setCursorIndex(null)}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#1f2937" />
                        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={v => formatCurrency(v, showK)} width={72} />
                        <Tooltip formatter={(v) => formatCurrency(v, showK)} />
                        <Legend />
                        {showComp.liquid && <Line type="monotone" dataKey="altLiquidNetWorth" name="Liquid NW" stroke={assetColors.altLiquidNetWorth} dot={false} isAnimationActive={false} />}
                        {showComp.retirement && <Line type="monotone" dataKey="altRetirementAssets" name="Retirement" stroke={assetColors.altRetirementAssets} dot={false} isAnimationActive={false} />}
                        {showComp.illiquid && <Line type="monotone" dataKey="altIlliquidNetWorth" name="Illiquid NW" stroke={assetColors.altIlliquidNetWorth} dot={false} isAnimationActive={false} />}
                        {cursorIndex !== null && (
                          <ReferenceLine x={baseRows[cursorIndex]?.date} stroke="#6b7280" strokeDasharray="3 3" />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full rounded bg-gray-800/30" />
                  )}
                </div>
              </div>

              {/* Cash Basis Trend */}
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
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={paletteMuted ? 0.3 : 0.45} />
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
                          data={netWorthMix
                            .filter(i => isFiniteNum(i.value) && i.value > 0)
                            .map(i => ({ name: i.name, key: i.key, value: i.value, pct: isFiniteNum(i.pct) ? i.pct * 100 : 0, color: i.color }))}
                          dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%"
                          onMouseLeave={() => setHoveredAssetKey(null)}
                        >
                          {netWorthMix
                            .filter(i => isFiniteNum(i.value) && i.value > 0)
                            .map((i, idx) => (
                              <Cell
                                key={idx}
                                fill={i.color || "#6b7280"}
                                onMouseEnter={() => setHoveredAssetKey(i.key)}
                                style={{ opacity: hoveredAssetKey && hoveredAssetKey !== i.key ? 0.4 : 1 }}
                              />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            const d = payload?.[0]?.payload;
                            if (!active || !d) return null;
                            return (
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
                                <div className="text-white font-medium">{d.name}</div>
                                <div className="text-indigo-400">{(d.pct || 0).toFixed(1)}%</div>
                                <div className="text-gray-300">{formatCurrency(d.value, showK)}</div>
                              </div>
                            );
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
                      <BarChart data={sectorRows} onMouseLeave={() => setHoveredSector(null)}>
                        <CartesianGrid vertical={false} stroke="#1f2937" />
                        <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
                        <Tooltip
                          content={({ active, payload }) => {
                            const d = payload?.[0]?.payload;
                            if (!active || !d) return null;
                            return (
                              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
                                <div className="text-white font-medium">{d.name}</div>
                                <div className="text-indigo-400">{d.percentage.toFixed(1)}%</div>
                                <div className="text-gray-300">{formatCurrency(d.value, showK)}</div>
                                <div className="text-gray-400">{d.positionCount} positions</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="value">
                          {sectorRows.map((d, i) => (
                            <Cell
                              key={i}
                              fill={d.color || "#6b7280"}
                              onMouseEnter={() => setHoveredSector(d.name)}
                              style={{ opacity: hoveredSector && hoveredSector !== d.name ? 0.4 : 1 }}
                            />
                          ))}
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
                        onMouseEnter={() => setHoveredInstitution(i.name)}
                        onMouseLeave={() => setHoveredInstitution(null)}
                        className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i.color || "#6b7280" }} />
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

            {/* PORTAL PREVIEWS */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold">Analytics Portals</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.button whileHover={cardHover} whileTap={cardTap} onClick={() => router.push("/accounts")}
                  className="text-left rounded-xl border border-gray-800 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400">Accounts</div>
                  <div className="text-lg font-semibold">{summary?.positionStats?.activeAccountCount ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">active</div>
                </motion.button>
                <motion.button whileHover={cardHover} whileTap={cardTap} onClick={() => router.push("/positions")}
                  className="text-left rounded-xl border border-gray-800 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400">Positions</div>
                  <div className="text-lg font-semibold">{summary?.positionStats?.totalCount ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">tracked</div>
                </motion.button>
                <motion.button whileHover={cardHover} whileTap={cardTap} onClick={() => router.push("/liabilities")}
                  className="text-left rounded-xl border border-gray-800 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400">Liabilities</div>
                  <div className="text-lg font-semibold">{formatCurrency(summary?.liabilities?.total || 0, showK)}</div>
                  <div className="text-xs text-gray-500 mt-1">total</div>
                </motion.button>
                <motion.button whileHover={cardHover} whileTap={cardTap} onClick={() => router.push("/command-center")}
                  className="text-left rounded-xl border border-gray-800 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400">Command Center</div>
                  <div className="text-xs text-gray-500 mt-1">deep analytics & workflows</div>
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* INSIGHT RAIL */}
          <div className="lg:col-span-4 space-y-6">
            {/* Risk & Concentration */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold">Risk Snapshot</h3>
                </div>
                {/* Resilience badge (visual thresholds only) */}
                <div className="text-xs">
                  {(() => {
                    const topPct = (concentrationMetrics?.topPositionPct || 0) * 100;
                    const liq = (riskMetrics?.liquidityRatioPct || 0) * 100;
                    let label = "Balanced";
                    let cls = "text-amber-300";
                    if (topPct <= 10 && liq >= 25) { label = "Healthy"; cls = "text-emerald-300"; }
                    if (topPct > 25 || liq < 10) { label = "Concerning"; cls = "text-rose-300"; }
                    return <span className={`px-2 py-1 rounded bg-gray-800 border border-gray-700 ${cls}`}>{label}</span>;
                  })()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SmallStat label="Liquidity Ratio" value={formatPct(((riskMetrics?.liquidityRatioPct) || 0) * 100)} icon={<Droplet className="w-4 h-4 text-blue-400" />} />
                <SmallStat label="Top Position %" value={formatPct(((concentrationMetrics?.topPositionPct) || 0) * 100)} icon={<Target className="w-4 h-4 text-rose-400" />} />
                <SmallStat label="Top 5 Positions %" value={formatPct(((concentrationMetrics?.top5PositionsPct) || 0) * 100)} icon={<Layers className="w-4 h-4 text-purple-400" />} />
                <SmallStat label="Accounts Active" value={String(summary?.positionStats?.activeAccountCount ?? 0)} icon={<Briefcase className="w-4 h-4 text-emerald-400" />} />
              </div>
            </motion.div>

            {/* Concentration Treemap */}
            {topPositionsPeek.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold">Concentration Map (Top Positions)</h3>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={topPositionsPeek.map(p => ({
                        name: p.name,
                        size: (p.percentage || 0) * 100,
                        value: p.value,
                        color: assetColors[p.assetType] || "#6b7280",
                      }))}
                      dataKey="size"
                      stroke="#1f2937"
                      fill="#4f46e5"
                      content={(props) => {
                        const { x, y, width, height, payload } = props || {};
                        if (!payload || width < 40 || height < 20) return null;
                        const color = payload.color || "#4f46e5";
                        return (
                          <g>
                            <rect x={x} y={y} width={width} height={height} fill={color} opacity={paletteMuted ? 0.85 : 1} />
                            <text x={x + 6} y={y + 16} fill="#fff" fontSize={11}>{payload.name}</text>
                            <text x={x + 6} y={y + 30} fill="#e5e7eb" fontSize={10}>
                              {(payload.size || 0).toFixed(1)}%
                            </text>
                          </g>
                        );
                      }}
                    />
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Top Positions with cross-highlighting */}
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
                    const sectorMismatch = hoveredSector && p.sector && p.sector !== hoveredSector;
                    const instMismatch = hoveredInstitution && p.institution && p.institution !== hoveredInstitution && !p.account?.includes(hoveredInstitution);
                    const assetMismatch = hoveredAssetKey && p.assetType && hoveredAssetKey !== p.assetType && hoveredAssetKey !== (p.assetType === "security" ? "securities" : p.assetType);
                    const dim = Boolean((hoveredSector && sectorMismatch) || (hoveredInstitution && instMismatch) || (hoveredAssetKey && assetMismatch));
                    return (
                      <motion.div key={idx} whileHover={{ x: 2 }}
                        className={`flex items-center justify-between rounded-lg border border-gray-800 p-3 ${dim ? "bg-gray-900/40 opacity-60" : "bg-gray-900"}`}>
                        <div>
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.account}</div>
                          {p.sector && <div className="text-[10px] text-gray-500 mt-0.5">{p.sector}</div>}
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
            No portfolio data available.{" "}
            <button onClick={() => router.push("/accounts")} className="underline text-indigo-400">Connect accounts or add manual positions</button>{" "}
            to see your performance here.
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
                onClick={() => router.push("/liabilities")}
                className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 inline-flex items-center justify-center gap-2">
                <Layers className="w-4 h-4" /> Liabilities
              </motion.button>
              <motion.button whileHover={cardHover} whileTap={cardTap}
                onClick={() => router.push("/command-center")}
                className="flex-1 text-sm px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 inline-flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" /> Command Center
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* HELP OVERLAY */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              className="max-w-md w-full mx-4 rounded-2xl border border-gray-700 bg-gray-900 p-6 text-sm"
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Keyboard Shortcuts</h4>
                <button className="text-gray-400 hover:text-white" onClick={() => setShowHelp(false)}>Close</button>
              </div>
              <ul className="mt-3 space-y-1 text-gray-300">
                <li><span className="text-white">← / →</span> — change timeframe</li>
                <li><span className="text-white">R</span> — refresh data</li>
                <li><span className="text-white">K</span> — toggle $ / $K</li>
                <li><span className="text-white">B</span> — toggle baseline</li>
                <li><span className="text-white">F</span> — focus trends (fullscreen)</li>
                <li><span className="text-white">?</span> — show this help</li>
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOCUS MODE (Fullscreen Trends) */}
      <AnimatePresence>
        {focusTrends && (
          <motion.div
            className="fixed inset-0 z-50 bg-gray-950/95"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setFocusTrends(false)}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>
            <div className="max-w-6xl mx-auto pt-12 px-6">
              <h3 className="text-sm text-gray-300 mb-2">Trended Net Worth — Focus</h3>
              <div className="h-[60vh] rounded-2xl border border-gray-800 bg-gray-900/70 p-3">
                {baseRows.length >= 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={baseRows}
                      onMouseMove={onSyncHover}
                      onMouseLeave={() => setCursorIndex(null)}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="nw2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={paletteMuted ? 0.35 : 0.55} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#1f2937" />
                      <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={v => formatCurrency(v, showK)} width={80} />
                      <Tooltip formatter={(v) => formatCurrency(v, showK)} />
                      {baselineValue !== null && <ReferenceLine y={baselineValue} stroke="#64748b" strokeDasharray="3 3" />}
                      <Area type="monotone" dataKey="netWorth" stroke="#4f46e5" fill="url(#nw2)" strokeWidth={2} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="totalAssets" stroke="#10b981" dot={false} strokeOpacity={0.7} />
                      <Line type="monotone" dataKey="totalLiabilities" stroke="#ef4444" dot={false} strokeOpacity={0.7} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded bg-gray-800/30" />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
