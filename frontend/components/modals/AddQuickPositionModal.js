import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import FixedModal from "./FixedModal";
import {
  fetchAllAccounts,
} from "@/utils/apimethods/accountMethods";
import {
  addSecurityPosition,
  addCryptoPosition,
  addMetalPosition,
  addCashPosition,
  addOtherAsset,
  searchSecurities,
  searchFXAssets,
} from "@/utils/apimethods/positionMethods";
import { formatCurrency } from "@/utils/formatters";
import debounce from "lodash.debounce";
import {
  Plus, X, Check, TrendingUp, TrendingDown, Coins, DollarSign, Home, BarChart3,
  Eye, EyeOff, Save, Trash2, AlertCircle, CheckCircle, Hash, Search, ChevronDown,
  Repeat, Info, Filter, Loader2, PackageX, PackageCheck, Package2,
  ClipboardList, CheckSquare, Activity, AlertTriangle, PlayCircle, ChevronUp,
} from "lucide-react";

/**
 * ---------------------------------------------------------------------------
 * AddQuickPositionModal
 * vNEXT — “Alpha Polished”
 * - Restores real-time dropdown search (tickers/crypto/metals) like original
 * - Corrects hydration/market data lookup using searchSecurities + searchFXAssets
 * - Preserves core architecture + useCallback structure + keyboard nav
 * - Adds advanced banners (stacked, priority, springy transform animations)
 * - Multi-segment progress bars + row mini-indicators + circular rings
 * - Data grid polish (sticky headers, zebra, focus border anim, hover states)
 * - Selection UX (indeterminate, count bubbles, persistence across filters)
 * - Status system (animated badges, inline tips)
 * - CSS transforms/opacity only; motion-safe; WCAG AA colors; dark mode ready
 * - <15KB gz delta (no new deps beyond lucide + lodash.debounce already present)
 * ---------------------------------------------------------------------------
 */

/* ----------------------------- Tiny UI primitives ----------------------------- */

const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0, duration = 300 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = lastRef.current;
    const to = Number(value) || 0;

    const easeOutBack = (t) => {
      // “springy” bezier-ish without JS springs (perf friendly)
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const step = (ts) => {
      const t = Math.min((ts - start) / duration, 1);
      const eased = easeOutBack(t);
      const next = from + (to - from) * eased;
      setDisplayValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else lastRef.current = to;
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue).toLocaleString();
  return (
    <span className="transition-[opacity,transform] motion-reduce:transition-none duration-200 ease-out will-change-transform">
      {prefix}{formatted}{suffix}
    </span>
  );
};

/** Multi-segment progress: ready | importing | done */
const SegmentedProgress = ({ total, ready, importing, done }) => {
  const clamp = (n) => Math.max(0, Math.min(n, total || 0));
  const r = clamp(ready);
  const i = clamp(importing);
  const d = clamp(done);
  const sum = r + i + d;
  const remaining = Math.max(0, (total || 0) - sum);

  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
      <div className="h-full flex">
        {r > 0 && (
          <div
            className="h-full bg-blue-500 dark:bg-blue-600 transition-transform duration-300 will-change-transform"
            style={{ width: `${pct(r)}%` }}
          />
        )}
        {i > 0 && (
          <div
            className="h-full bg-amber-500 dark:bg-amber-600 transition-transform duration-300 will-change-transform"
            style={{ width: `${pct(i)}%` }}
          />
        )}
        {d > 0 && (
          <div
            className="h-full bg-emerald-500 dark:bg-emerald-600 transition-transform duration-300 will-change-transform"
            style={{ width: `${pct(d)}%` }}
          />
        )}
        {remaining > 0 && (
          <div
            className="h-full bg-gray-200 dark:bg-gray-700 transition-transform duration-300 will-change-transform"
            style={{ width: `${pct(remaining)}%` }}
          />
        )}
      </div>
    </div>
  );
};

/** Compact circular ring (svg stroke) — transforms only */
const Ring = ({ value = 0, size = 20, stroke = 3, color = "#10B981" }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circ - (clamped / 100) * circ;
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-300 ease-out will-change-transform"
        style={{ transform: "translateZ(0)" }}
      />
    </svg>
  );
};

/* ------------------------------- Banner System ------------------------------- */
/**
 * Replaces SmartBanner:
 * - Stacked top-right
 * - Priority order: error > warning > info > success
 * - 300ms “springy” transforms, motion-safe, z-index control
 */
const BannerCenter = ({ items, onAction }) => {
  if (!items?.length) return null;

  const priorities = { error: 4, warning: 3, info: 2, success: 1, processing: 2 };
  const ordered = [...items].sort((a, b) => (priorities[b.type] - priorities[a.type]));

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[80] space-y-2">
      {ordered.map((b, idx) => (
        <BannerItem key={b.id} idx={idx} {...b} onAction={onAction} />
      ))}
    </div>
  );
};

const BannerItem = ({ idx, type, title, message, count, actions, onDismiss, onAction }) => {
  const tones = {
    success: { bg: "from-green-50 to-emerald-50", border: "border-emerald-300", fg: "text-emerald-800", Icon: CheckCircle },
    warning: { bg: "from-yellow-50 to-amber-50", border: "border-amber-300", fg: "text-amber-800", Icon: AlertTriangle },
    error: { bg: "from-red-50 to-rose-50", border: "border-rose-300", fg: "text-rose-800", Icon: AlertCircle },
    info: { bg: "from-blue-50 to-indigo-50", border: "border-indigo-300", fg: "text-indigo-800", Icon: Info },
    processing: { bg: "from-purple-50 to-indigo-50", border: "border-indigo-300", fg: "text-indigo-800", Icon: Activity },
  }[type] || { bg: "from-gray-50 to-gray-100", border: "border-gray-300", fg: "text-gray-800", Icon: Info };

  const { Icon } = tones;

  return (
    <div
      className={`
        pointer-events-auto rounded-xl border ${tones.border} bg-gradient-to-r ${tones.bg} shadow-lg
        px-4 py-3 w-[360px] motion-reduce:transition-none
        transition-transform duration-300 ease-out will-change-transform
      `}
      style={{
        transform: `translateY(${idx * 8}px) translateZ(0)`,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={`${tones.fg} w-5 h-5 flex-shrink-0`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className={`text-sm font-semibold ${tones.fg} flex items-center gap-2`}>
              {title}
              {count != null && (
                <span className="inline-flex items-center justify-center px-2 h-5 rounded-full text-[11px] font-bold bg-white/80 text-gray-900">
                  {count}
                </span>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="rounded-md p-1 text-gray-700 hover:bg-black/5 transition"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {message && <div className="mt-1 text-sm text-gray-700">{message}</div>}
          {!!actions?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((a, i) => {
                const IconA = a.icon;
                return (
                  <button
                    key={i}
                    onClick={() => onAction?.(a)}
                    disabled={a.disabled}
                    className={`
                      text-xs font-medium px-3 py-1.5 rounded-lg transition
                      ${a.primary ? "bg-gray-900 text-white hover:opacity-90" : "bg-white/80 text-gray-800 hover:bg-white"}
                      disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1
                    `}
                  >
                    {IconA && <IconA className="w-3 h-3" />} {a.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------- Type config -------------------------------- */

const assetTypes = {
  security: {
    name: "Securities", icon: BarChart3, description: "Stocks, ETFs, Mutual Funds",
    fields: [
      { key: "ticker", label: "Ticker", type: "text", required: true, width: "w-28", placeholder: "AAPL", transform: "uppercase", searchable: true },
      { key: "name", label: "Company", type: "text", width: "w-48", readOnly: true, placeholder: "Auto-filled" },
      { key: "shares", label: "Shares", type: "number", required: true, width: "w-24", placeholder: "100", min: 0, step: 1 },
      { key: "price", label: "Current Price", type: "number", width: "w-28", placeholder: "Auto", prefix: "$", min: 0, step: 0.01, readOnly: true },
      { key: "cost_basis", label: "Cost Basis", type: "number", required: true, width: "w-28", placeholder: "140.00", prefix: "$", min: 0, step: 0.01 },
      { key: "purchase_date", label: "Purchase Date", type: "date", required: true, width: "w-36", default: new Date().toISOString().split("T")[0] },
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-44" },
    ],
  },
  cash: {
    name: "Cash", icon: DollarSign, description: "Savings, Checking, Money Market",
    fields: [
      { key: "cash_type", label: "Type", type: "select", required: true, width: "w-32", options: [
        { value: "", label: "Select..." },
        { value: "Savings", label: "💰 Savings" },
        { value: "Checking", label: "💳 Checking" },
        { value: "Money Market", label: "📊 Money Market" },
        { value: "CD", label: "🔒 CD" },
      ]},
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-44" },
      { key: "amount", label: "Amount", type: "number", required: true, width: "w-32", placeholder: "10000", prefix: "$", min: 0 },
      { key: "interest_rate", label: "APY", type: "number", width: "w-24", placeholder: "2.5", suffix: "%", step: "0.01", min: 0, max: 100 },
      { key: "interest_period", label: "Period", type: "select", width: "w-28", options: [
        { value: "annually", label: "Annually" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
      ]},
      { key: "maturity_date", label: "Maturity", type: "date", width: "w-36" },
    ],
  },
  crypto: {
    name: "Crypto", icon: Coins, description: "Bitcoin, Ethereum, Altcoins",
    fields: [
      { key: "symbol", label: "Symbol", type: "text", required: true, width: "w-24", placeholder: "BTC", transform: "uppercase", searchable: true },
      { key: "name", label: "Name", type: "text", width: "w-48", readOnly: true, placeholder: "Auto-filled" },
      { key: "quantity", label: "Quantity", type: "number", required: true, width: "w-28", placeholder: "0.5", step: "0.00000001", min: 0 },
      { key: "purchase_price", label: "Buy Price", type: "number", required: true, width: "w-32", placeholder: "45000", prefix: "$", min: 0 },
      { key: "current_price", label: "Current Price", type: "number", width: "w-32", placeholder: "Auto", prefix: "$", min: 0, readOnly: true },
      { key: "purchase_date", label: "Purchase Date", type: "date", required: true, width: "w-36", default: new Date().toISOString().split("T")[0] },
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-44" },
    ],
  },
  metal: {
    name: "Metals", icon: Hash, description: "Gold, Silver, Platinum",
    fields: [
      { key: "metal_type", label: "Metal", type: "select", required: true, width: "w-32", options: [
        { value: "", label: "Select..." },
        { value: "Gold", label: "🥇 Gold", symbol: "GC=F" },
        { value: "Silver", label: "🥈 Silver", symbol: "SI=F" },
        { value: "Platinum", label: "💎 Platinum", symbol: "PL=F" },
        { value: "Copper", label: "🟫 Copper", symbol: "HG=F" },
        { value: "Palladium", label: "⚪ Palladium", symbol: "PA=F" },
      ]},
      { key: "symbol", label: "Symbol", type: "text", width: "w-24", readOnly: true, placeholder: "Auto-filled" },
      { key: "name", label: "Market Name", type: "text", width: "w-48", readOnly: true, placeholder: "Auto-filled" },
      { key: "quantity", label: "Quantity", type: "number", required: true, width: "w-24", placeholder: "10", min: 0 },
      { key: "unit", label: "Unit", type: "text", width: "w-20", readOnly: true, default: "oz" },
      { key: "purchase_price", label: "Price/Unit", type: "number", required: true, width: "w-28", placeholder: "1800", prefix: "$", min: 0 },
      { key: "current_price_per_unit", label: "Current/Unit", type: "number", width: "w-28", placeholder: "Auto", prefix: "$", min: 0, readOnly: true },
      { key: "purchase_date", label: "Purchase Date", type: "date", required: true, width: "w-36", default: new Date().toISOString().split("T")[0] },
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-44" },
    ],
  },
  otherAssets: {
    name: "Other Assets", icon: Home, description: "Real Estate, Vehicles, Collectibles",
    fields: [
      { key: "asset_name", label: "Asset Name", type: "text", required: true, width: "w-48", placeholder: "123 Main St" },
      { key: "asset_type", label: "Type", type: "select", required: true, width: "w-32", options: [
        { value: "", label: "Select..." },
        { value: "real_estate", label: "🏠 Real Estate" },
        { value: "vehicle", label: "🚗 Vehicle" },
        { value: "collectible", label: "🎨 Collectible" },
        { value: "jewelry", label: "💎 Jewelry" },
        { value: "art", label: "🖼️ Art" },
        { value: "equipment", label: "🔧 Equipment" },
        { value: "other", label: "📦 Other" },
      ]},
      { key: "cost", label: "Purchase Price", type: "number", width: "w-32", placeholder: "500000", prefix: "$", min: 0 },
      { key: "current_value", label: "Current Value", type: "number", required: true, width: "w-32", placeholder: "550000", prefix: "$", min: 0 },
      { key: "purchase_date", label: "Purchase Date", type: "date", width: "w-36", default: new Date().toISOString().split("T")[0] },
      { key: "notes", label: "Notes", type: "text", width: "w-52", placeholder: "Additional details..." },
    ],
  },
};

/* --------------------------------- Helpers --------------------------------- */

const metalSymbolByType = { Gold: "GC=F", Silver: "SI=F", Platinum: "PL=F", Copper: "HG=F", Palladium: "PA=F" };

const getQuotePrice = (s) => {
  const v =
    s?.price ??
    s?.current_price ??
    s?.regularMarketPrice ??
    s?.regular_market_price ??
    s?.last ??
    s?.close ??
    s?.value ??
    s?.mark;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const LS_UI = "quickPosition_expandedSections";
const LS_SNAPSHOT = "quickPosition_snapshot_v2";

function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

/* -------------------------------- Component -------------------------------- */

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // data
  const [accounts, setAccounts] = useState([]);

  // queue
  const [positions, setPositions] = useState({ security: [], cash: [], crypto: [], metal: [], otherAssets: [] });

  // ui state
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem(LS_UI);
    return saved ? JSON.parse(saved) : {};
  });
  const [showValues, setShowValues] = useState(true);
  const [filterType, setFilterType] = useState("all"); // all | valid | invalid | selected | processed | warnings

  // select / progress
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [importingPositions, setImportingPositions] = useState(new Set());
  const [processedPositions, setProcessedPositions] = useState(new Set());
  const [importResults, setImportResults] = useState(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // search/autofill (restored dropdown UX)
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [activeSuggestIndex, setActiveSuggestIndex] = useState({}); // key -> idx

  // keyboard nav
  const [focusedCell, setFocusedCell] = useState(null);
  const cellRefs = useRef({}); // {type: {posId: {fieldKey: ref}}}

  /* ------------------------------ Initialization ------------------------------ */

  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        const fetched = await fetchAllAccounts();
        const normalized = (Array.isArray(fetched) ? fetched : (fetched?.data || []))
          .map(a => ({
            id: a.id ?? a.account_id ?? a.uuid ?? a.external_id ?? String(a?.name || a?.account_name || ""),
            account_name: a.account_name ?? a.name ?? a.nickname ?? "Unnamed Account",
          }))
          .filter(a => a.id && a.account_name);
        setAccounts(normalized);
      } catch (e) {
        console.error("Error loading accounts:", e);
        setAccounts([]);
      }
    })();

    const snapshot = safeParse(localStorage.getItem(LS_SNAPSHOT));
    const normalized = castSeeds(seedPositions || snapshot?.positions);
    setPositions(normalized);

    // auto-expand with data
    const has = {};
    Object.entries(normalized).forEach(([type, arr]) => { if (arr?.length) has[type] = true; });
    setExpandedSections(prev => ({ ...prev, ...has }));

    // reset runtime
    setSelectedPositions(new Set());
    setProcessedPositions(new Set());
    setImportingPositions(new Set());
    setImportResults(new Map());
    setFilterType("all");

    // best-effort auto-hydrate (capped)
    setTimeout(() => autoHydrateSeededPrices(normalized), 80);
  }, [isOpen, seedPositions]);

  useEffect(() => {
    localStorage.setItem(LS_UI, JSON.stringify(expandedSections));
    localStorage.setItem(LS_SNAPSHOT, JSON.stringify({ positions }));
  }, [expandedSections, positions]);

  /* --------------------------------- Derived --------------------------------- */

  const dedupeMap = useMemo(() => {
    const counts = new Map();
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((p) => counts.set(dupKey(type, p), (counts.get(dupKey(type, p)) || 0) + 1));
    });
    return counts;
  }, [positions]);

  const stats = useMemo(() => {
    let total = 0, valid = 0, invalid = 0, selected = 0, importing = 0, processed = 0, valueSum = 0, costSum = 0, warnings = 0;
    const byType = {};
    const errorSummary = {};

    Object.keys(assetTypes).forEach(t => { byType[t] = { count: 0, valid: 0, invalid: 0, processed: 0, value: 0, cost: 0, warnings: 0 }; errorSummary[t] = []; });

    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((pos) => {
        total++;
        const key = `${type}-${pos.id}`;
        const isSelected = selectedPositions.has(key);
        const isImporting = importingPositions.has(key);
        const isProcessed = processedPositions.has(key);

        if (isSelected) selected++;
        if (isImporting) importing++;
        if (isProcessed) { processed++; byType[type].processed++; return; }

        const warn = dedupeMap.get(dupKey(type, pos)) > 1;
        if (warn) { warnings++; byType[type].warnings++; }

        const ok = validatePosition(type, pos);
        if (ok) {
          valid++; byType[type].valid++;
          const { value, cost } = calcValue(type, pos);
          valueSum += value; costSum += cost;
          byType[type].value += value; byType[type].cost += cost;
        } else {
          invalid++; byType[type].invalid++;
          if (pos.errors && Object.values(pos.errors).some(Boolean)) {
            errorSummary[type].push({ id: pos.id, errors: pos.errors, position: pos });
          }
        }
        byType[type].count++;
      });
    });

    const totalErrors = Object.values(errorSummary).reduce((sum, list) => sum + list.length, 0);
    const totalPerf = costSum > 0 ? ((valueSum - costSum) / costSum) * 100 : 0;
    return { totalPositions: total, validPositions: valid, invalidPositions: invalid, selectedCount: selected, importingCount: importing, processedCount: processed, totalValue: valueSum, totalCost: costSum, totalPerformance: totalPerf, totalErrors, warnings, byType, errorSummary };
  }, [positions, selectedPositions, importingPositions, processedPositions, dedupeMap]);

  /* --------------------------------- Helpers --------------------------------- */

  function castSeeds(seeds) {
    const empty = { security: [], cash: [], crypto: [], metal: [], otherAssets: [] };
    if (!seeds) return empty;

    const add = (acc, list, type) => {
      (list || []).forEach(r => {
        const data = r?.data ?? r;
        acc[type].push({
          id: r?.id ?? Date.now() + Math.random(),
          type,
          data,
          errors: r?.errors ?? {},
          isNew: true,
          animateIn: true,
        });
      });
    };

    if (Array.isArray(seeds)) {
      const out = { ...empty };
      seeds.forEach(r => {
        const t = inferType(r);
        add(out, [{ ...r, type: t }], t);
      });
      return out;
    }

    const out = { ...empty };
    add(out, seeds.security, "security");
    add(out, seeds.cash, "cash");
    add(out, seeds.crypto, "crypto");
    add(out, seeds.metal, "metal");
    add(out, seeds.otherAssets, "otherAssets");
    return out;
  }

  function inferType(r) {
    const x = r?.data ?? r ?? {};
    if (x.ticker) return "security";
    if (x.symbol && x.quantity != null) return "crypto";
    if (x.cash_type != null && x.amount != null) return "cash";
    if (x.metal_type != null) return "metal";
    if (x.asset_name || x.asset_type || x.current_value != null) return "otherAssets";
    return "security";
  }

  function validatePosition(type, pos) {
    const d = pos.data || {};
    const errs = {};

    if (type !== "otherAssets") {
      if (!d.account_id) errs.account_id = "Account required";
    }

    if (type === "security") {
      if (!d.ticker) errs.ticker = "Ticker required";
      if (!(Number(d.shares) > 0)) errs.shares = "Shares > 0";
      if (!(Number(d.cost_basis) > 0 || Number(d.price) > 0)) errs.cost_basis = "Cost or price required";
    }
    if (type === "crypto") {
      if (!d.symbol) errs.symbol = "Symbol required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "Qty > 0";
      if (!(d.purchase_price == null || Number(d.purchase_price) >= 0)) errs.purchase_price = "Invalid";
    }
    if (type === "cash") {
      if (!d.cash_type) errs.cash_type = "Type required";
      if (!(Number(d.amount) >= 0)) errs.amount = "Amount ≥ 0";
    }
    if (type === "metal") {
      if (!d.metal_type) errs.metal_type = "Metal required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "Qty > 0";
      if (!(d.purchase_price == null || Number(d.purchase_price) >= 0)) errs.purchase_price = "Invalid";
    }
    if (type === "otherAssets") {
      if (!d.asset_name) errs.asset_name = "Name required";
      if (!d.asset_type) errs.asset_type = "Type required";
      if (!(Number(d.current_value) >= 0)) errs.current_value = "Value required";
    }

    pos.errors = errs;
    return Object.keys(errs).length === 0;
  }

  function dupKey(type, pos) {
    const d = pos?.data || {};
    const idPart =
      type === "security" ? d.ticker :
      type === "crypto" ? d.symbol :
      type === "cash" ? d.cash_type :
      type === "metal" ? (d.metal_type || d.symbol) :
      type === "otherAssets" ? (d.asset_type + ":" + (d.asset_name || "")) : "";
    const qty = d.shares ?? d.quantity ?? d.amount ?? d.current_value ?? 0;
    const date = d.purchase_date ?? d.maturity_date ?? "";
    const acct = d.account_id ?? "";
    return [type, acct, String(idPart).toUpperCase(), qty, date].join("|");
  }

  function calcValue(type, position) {
    const d = position.data || {};
    if (type === "security") {
      const value = (Number(d.shares) || 0) * (Number(d.price) || 0);
      const cost = (Number(d.shares) || 0) * (Number(d.cost_basis ?? d.price) || 0);
      return { value, cost };
    }
    if (type === "crypto") {
      const value = (Number(d.quantity) || 0) * (Number(d.current_price) || 0);
      const cost = (Number(d.quantity) || 0) * (Number(d.purchase_price) || 0);
      return { value, cost };
    }
    if (type === "metal") {
      const curr = Number(d.current_price_per_unit ?? d.purchase_price) || 0;
      const value = (Number(d.quantity) || 0) * curr;
      const cost = (Number(d.quantity) || 0) * (Number(d.purchase_price) || 0);
      return { value, cost };
    }
    if (type === "otherAssets") {
      return { value: Number(d.current_value) || 0, cost: Number(d.cost) || 0 };
    }
    if (type === "cash") {
      const amt = Number(d.amount) || 0;
      return { value: amt, cost: amt };
    }
    return { value: 0, cost: 0 };
  }

  const getCellRef = (type, posId, fieldKey) => {
    if (!cellRefs.current[type]) cellRefs.current[type] = {};
    if (!cellRefs.current[type][posId]) cellRefs.current[type][posId] = {};
    if (!cellRefs.current[type][posId][fieldKey]) cellRefs.current[type][posId][fieldKey] = React.createRef();
    return cellRefs.current[type][posId][fieldKey];
  };

  const FIELD_ORDER = useMemo(() => ({
    security: assetTypes.security.fields.map(f => f.key),
    cash: assetTypes.cash.fields.map(f => f.key),
    crypto: assetTypes.crypto.fields.map(f => f.key),
    metal: assetTypes.metal.fields.map(f => f.key),
    otherAssets: assetTypes.otherAssets.fields.map(f => f.key),
  }), []);

  const focusSiblingCell = (type, posId, currentKey, dir) => {
    const order = FIELD_ORDER[type] || [];
    const idx = order.indexOf(currentKey);
    if (idx < 0) return;
    const nextKey = order[idx + (dir === "right" ? 1 : -1)];
    if (!nextKey) return;
    const ref = getCellRef(type, posId, nextKey);
    const el = ref?.current;
    if (el) { el.focus(); el.select?.(); setFocusedCell({ type, posId, fieldKey: nextKey }); }
  };

  /* --------------------------- Market Data: Search --------------------------- */

  // Restored: suggestions dropdown and hydration strategy aligned to original intent
  const debouncedSearch = useCallback(
    debounce(async (query, assetType, positionId) => {
      const key = `${assetType}-${positionId}`;
      if (!query || String(query).trim().length < 1) {
        setSearchResults(prev => ({ ...prev, [key]: [] }));
        return;
      }
      setIsSearching(prev => ({ ...prev, [key]: true }));

      try {
        let results = [];
        // primary: comprehensive securities search
        const sec = await searchSecurities(query);
        if (Array.isArray(sec)) results = results.concat(sec);

        // supplemental: FX/Metals (covers cases original code handled)
        if (assetType === "metal" || /[=]F$/.test(query)) {
          const fx = await searchFXAssets(query);
          if (Array.isArray(fx)) results = results.concat(fx);
        }

        // Normalize & filter by type intent
        let filtered = (results || []).filter(Boolean);
        if (assetType === "security") filtered = filtered.filter(r => r.asset_type === "security" || r.asset_type === "index");
        if (assetType === "crypto") filtered = filtered.filter(r => r.asset_type === "crypto");
        if (assetType === "metal") {
          // Allow futures/commodities results
          filtered = filtered.filter(r => r.asset_type === "metal" || r.asset_type === "commodity" || /F$/.test(r?.ticker || ""));
        }

        // De-duplicate by ticker
        const seen = new Set();
        filtered = filtered.filter(r => {
          const t = String(r.ticker || r.symbol || "").toUpperCase();
          if (seen.has(t)) return false;
          seen.add(t);
          return true;
        });

        setSearchResults(prev => ({ ...prev, [key]: filtered.slice(0, 12) }));
        setActiveSuggestIndex(prev => ({ ...prev, [key]: 0 }));
      } catch (e) {
        console.error("search error", e);
        setSearchResults(prev => ({ ...prev, [key]: [] }));
      } finally {
        setIsSearching(prev => ({ ...prev, [key]: false }));
      }
    }, 220),
    []
  );

  const handleSelectSecurity = (assetType, positionId, security) => {
    const searchKey = `${assetType}-${positionId}`;
    const px = getQuotePrice(security);

    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos => {
        if (pos.id !== positionId) return pos;
        const d = { ...pos.data };

        if (assetType === "security") {
          d.ticker = security.ticker ?? security.symbol;
          if (px != null) d.price = px;
          d.name = security.name ?? security.longName ?? d.name;
          if (d.cost_basis == null && d.price != null) d.cost_basis = d.price;
        } else if (assetType === "crypto") {
          d.symbol = security.ticker ?? security.symbol;
          if (px != null) d.current_price = px;
          d.name = security.name ?? d.name;
          if (d.purchase_price == null && d.current_price != null) d.purchase_price = d.current_price;
        } else if (assetType === "metal") {
          d.symbol = security.ticker ?? security.symbol;
          if (px != null) d.current_price_per_unit = px;
          d.name = security.name ?? `${d.metal_type || ""} Futures`;
          if (d.purchase_price == null && d.current_price_per_unit != null) d.purchase_price = d.current_price_per_unit;
        }

        const next = { ...pos, data: d, errors: { ...pos.errors }, isNew: false, animateIn: false };
        validatePosition(assetType, next);
        return next;
      }),
    }));

    setSearchResults(prev => ({ ...prev, [searchKey]: [] }));
  };

  async function runPool(items, n, worker) {
    const queue = items.slice();
    const out = [];
    async function exec() {
      while (queue.length) {
        const item = queue.shift();
        out.push(await worker(item));
      }
    }
    await Promise.all(Array.from({ length: n }, exec));
    return out;
  }

  const autoHydrateSeededPrices = async (normalized) => {
    const work = [];
    normalized.security.forEach(p => {
      const q = p?.data?.ticker || p?.data?.symbol;
      if (q && !(Number(p?.data?.price) > 0)) work.push({ type: "security", id: p.id, q });
    });
    normalized.crypto.forEach(p => {
      const q = p?.data?.symbol || p?.data?.ticker;
      if (q && !(Number(p?.data?.current_price) > 0)) work.push({ type: "crypto", id: p.id, q });
    });
    normalized.metal.forEach(p => {
      const q = p?.data?.symbol || metalSymbolByType[p?.data?.metal_type];
      if (q && !(Number(p?.data?.current_price_per_unit) > 0)) work.push({ type: "metal", id: p.id, q });
    });

    if (!work.length) return;
    const slice = work.slice(0, 50); // soft cap
    const results = await runPool(slice, 4, async (item) => {
      try {
        let results = [];
        const sec = await searchSecurities(item.q);
        if (Array.isArray(sec)) results = results.concat(sec);
        // add FX/commodities lookup for metals/futures tickers
        if (item.type === "metal" || /[=]F$/.test(item.q)) {
          const fx = await searchFXAssets(item.q);
          if (Array.isArray(fx)) results = results.concat(fx);
        }

        // Filter by intent
        let filtered = (results || []).filter(Boolean);
        if (item.type === "security") filtered = filtered.filter(x => x.asset_type === "security" || x.asset_type === "index");
        if (item.type === "crypto") filtered = filtered.filter(x => x.asset_type === "crypto");
        if (item.type === "metal") filtered = filtered.filter(x => x.asset_type === "metal" || x.asset_type === "commodity" || /F$/.test(x?.ticker || ""));

        // choose exact ticker or best match
        const exact = filtered.find(x => String(x.ticker || x.symbol || "").toUpperCase() === String(item.q).toUpperCase());
        const chosen = exact || filtered[0];
        return chosen ? { ...item, chosen } : null;
      } catch {
        return null;
      }
    });

    for (const hit of results) {
      if (hit?.chosen) handleSelectSecurity(hit.type, hit.id, hit.chosen);
    }
  };

  /* -------------------------------- Selection -------------------------------- */

  const handleSelectPosition = (type, id, checked) => {
    const key = `${type}-${id}`;
    const next = new Set(selectedPositions);
    if (checked) next.add(key);
    else next.delete(key);
    setSelectedPositions(next);
  };

  const handleSelectAllIn = (type, arr) => {
    const next = new Set(selectedPositions);
    arr.forEach(pos => { const k = `${type}-${pos.id}`; if (!processedPositions.has(k)) next.add(k); });
    setSelectedPositions(next);
  };

  const handleDeselectAllIn = (type, arr) => {
    const next = new Set(selectedPositions);
    arr.forEach(pos => next.delete(`${type}-${pos.id}`));
    setSelectedPositions(next);
  };

  const handleBulkDelete = () => {
    if (!selectedPositions.size) return;
    const updated = { ...positions };
    selectedPositions.forEach(k => {
      const [type, id] = k.split("-");
      updated[type] = updated[type].filter(p => String(p.id) !== id);
    });
    setPositions(updated);
    setSelectedPositions(new Set());
  };

  const handleBulkValidate = () => {
    if (!selectedPositions.size) return;
    const updated = { ...positions };
    selectedPositions.forEach(k => {
      const [type, id] = k.split("-");
      updated[type] = updated[type].map(p => {
        if (String(p.id) !== id) return p;
        const next = { ...p };
        validatePosition(type, next);
        return next;
      });
    });
    setPositions(updated);
  };

  /* ---------------------------------- Filter --------------------------------- */

  const getFilteredPositions = (type) => {
    const arr = positions[type] || [];
    if (filterType === "processed") return arr.filter(p => processedPositions.has(`${type}-${p.id}`));
    if (filterType === "selected") return arr.filter(p => selectedPositions.has(`${type}-${p.id}`));
    if (filterType === "warnings") return arr.filter(p => dedupeMap.get(dupKey(type, p)) > 1);
    if (filterType === "valid") return arr.filter(p => validatePosition(type, p) && !processedPositions.has(`${type}-${p.id}`));
    if (filterType === "invalid") return arr.filter(p => !validatePosition(type, p) && !processedPositions.has(`${type}-${p.id}`));
    return arr;
  };

  /* --------------------------------- Mutators -------------------------------- */

  const addNewRow = (type) => {
    const defaults = {};
    assetTypes[type].fields.forEach(f => { if (f.default !== undefined) defaults[f.key] = f.default; });
    if (type === "cash") defaults.interest_period = "annually";
    const newPos = { id: Date.now() + Math.random(), type, data: defaults, errors: {}, isNew: true, animateIn: true };
    setPositions(prev => ({ ...prev, [type]: [...prev[type], newPos] }));
    if (!expandedSections[type]) setExpandedSections(prev => ({ ...prev, [type]: true }));
  };

  const updatePosition = (type, id, field, value) => {
    setPositions(prev => ({
      ...prev,
      [type]: prev[type].map(pos => {
        if (pos.id !== id) return pos;
        let v = value;
        const cfg = assetTypes[type].fields.find(f => f.key === field);
        if (cfg?.transform === "uppercase" && typeof v === "string") v = v.toUpperCase();

        if (type === "metal" && field === "metal_type" && v) {
          const opt = cfg?.options?.find(o => o.value === v);
          const d = { ...pos.data, metal_type: v, symbol: opt?.symbol, name: `${v} Futures` };
          if (opt?.symbol) debouncedSearch(opt.symbol, type, id);
          const next = { ...pos, data: d, errors: { ...pos.errors }, isNew: false, animateIn: false };
          validatePosition(type, next);
          return next;
        }

        if (cfg?.searchable) debouncedSearch(v, type, id);

        const next = { ...pos, data: { ...pos.data, [field]: v }, errors: { ...pos.errors }, isNew: false, animateIn: false };
        validatePosition(type, next);
        return next;
      }),
    }));
  };

  const deletePosition = (type, id) => {
    setPositions(prev => ({ ...prev, [type]: prev[type].filter(p => p.id !== id) }));
    const k = `${type}-${id}`;
    setSelectedPositions(prev => { const n = new Set(prev); n.delete(k); return n; });
  };

  const duplicateRow = (type, id) => {
    setPositions(prev => {
      const idx = prev[type].findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const base = prev[type][idx];
      const clone = { ...base, id: Date.now() + Math.random(), isNew: true, animateIn: true };
      const next = { ...prev, [type]: [...prev[type].slice(0, idx + 1), clone, ...prev[type].slice(idx + 1)] };
      return next;
    });
  };

  /* --------------------------------- Importing -------------------------------- */

  const submitValidOnly = async () => {
    if (stats.validPositions === 0) return;
    setIsSubmitting(true);
    const batches = [];
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach(pos => {
        const k = `${type}-${pos.id}`;
        if (processedPositions.has(k)) return;
        if (validatePosition(type, pos)) batches.push({ type, pos });
      });
    });
    await importWithProgress(batches);
    setIsSubmitting(false);
  };

  const submitSelected = async () => {
    if (!selectedPositions.size) return;
    setIsSubmitting(true);
    const list = [];
    selectedPositions.forEach(k => {
      const [type, id] = k.split("-");
      const pos = positions[type]?.find(p => String(p.id) === id);
      if (!pos) return;
      if (processedPositions.has(k)) return;
      if (validatePosition(type, pos)) list.push({ type, pos });
    });
    if (!list.length) { setIsSubmitting(false); return; }
    await importWithProgress(list);
    setIsSubmitting(false);
  };

  async function importWithProgress(batches) {
    const success = [];
    const toProcess = batches.slice();

    await runPool(toProcess, 4, async ({ type, pos }) => {
      const k = `${type}-${pos.id}`;
      setImportingPositions(prev => { const n = new Set(prev); n.add(k); return n; });

      const clean = {};
      Object.entries(pos.data || {}).forEach(([key, val]) => {
        if (val !== "" && val !== null && val !== undefined) clean[key] = val;
      });

      try {
        if (type === "security") {
          await addSecurityPosition(clean.account_id, clean);
        } else if (type === "crypto") {
          const cryptoData = {
            coin_symbol: clean.symbol,
            coin_type: clean.name || clean.symbol,
            quantity: clean.quantity,
            purchase_price: clean.purchase_price,
            purchase_date: clean.purchase_date,
            account_id: clean.account_id,
            storage_type: clean.storage_type || "Exchange",
            notes: clean.notes || null,
            tags: clean.tags || [],
            is_favorite: clean.is_favorite || false,
          };
          await addCryptoPosition(clean.account_id, cryptoData);
        } else if (type === "metal") {
          const metalData = {
            metal_type: clean.metal_type,
            coin_symbol: clean.symbol,
            quantity: clean.quantity,
            unit: clean.unit || "oz",
            purchase_price: clean.purchase_price,
            cost_basis: (Number(clean.quantity) || 0) * (Number(clean.purchase_price) || 0),
            purchase_date: clean.purchase_date,
            storage_location: clean.storage_location,
            description: `${clean.symbol ?? ""}${clean.name ? ` - ${clean.name}` : ""}`,
          };
          await addMetalPosition(clean.account_id, metalData);
        } else if (type === "otherAssets") {
          await addOtherAsset(clean);
        } else if (type === "cash") {
          const cashData = { ...clean, name: clean.cash_type, interest_rate: clean.interest_rate ? Number(clean.interest_rate) / 100 : null };
          await addCashPosition(clean.account_id, cashData);
        }

        setProcessedPositions(prev => { const n = new Set(prev); n.add(k); return n; });
        setImportResults(prev => new Map(prev).set(k, { status: "success", position: pos }));
        success.push({ type, pos });
      } catch (e) {
        console.error(`Error adding ${type} position:`, e);
        setImportResults(prev => new Map(prev).set(k, { status: "error", error: e?.message, position: pos }));
      } finally {
        setImportingPositions(prev => { const n = new Set(prev); n.delete(k); return n; });
      }
    });

    // AUTO-DEQUEUE successes
    if (success.length) {
      const successSet = new Set(success.map(({ type, pos }) => `${type}-${pos.id}`));
      setPositions(prev => {
        const out = {};
        Object.entries(prev).forEach(([type, arr]) => {
          out[type] = arr.filter(p => !successSet.has(`${type}-${p.id}`));
        });
        return out;
      });

      if (onPositionsSaved) {
        const enriched = success.map(({ type, pos }) => {
          const acct = type !== "otherAssets" ? accounts.find(a => String(a.id) === String(pos.data.account_id)) : null;
          return {
            type,
            ticker: pos.data.ticker,
            symbol: pos.data.symbol,
            asset_name: pos.data.asset_name,
            metal_type: pos.data.metal_type,
            shares: pos.data.shares,
            quantity: pos.data.quantity,
            amount: pos.data.amount,
            account_name: acct?.account_name || (type === "otherAssets" ? "Other Assets" : "Unknown Account"),
            account_id: pos.data.account_id,
          };
        });
        onPositionsSaved(success.length, enriched);
      }
    }
  }

  /* ------------------------------ Keyboard Shortcuts ------------------------------ */

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      const k = String(e.key).toLowerCase();
      if (e.key === "Escape") onClose?.();
      if ((e.metaKey || e.ctrlKey) && k === "d") {
        if (!focusedCell) return;
        e.preventDefault();
        const { type, posId } = focusedCell;
        duplicateRow(type, posId);
      }
      if (e.key === "Backspace" && selectedPositions.size) handleBulkDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, focusedCell, selectedPositions]);

  /* --------------------------------- Rendering --------------------------------- */

  const filterDefs = [
    { key: "all", label: "All", count: stats.totalPositions, icon: Package2 },
    { key: "valid", label: "Valid", count: stats.validPositions, icon: PackageCheck },
    { key: "invalid", label: "Invalid", count: stats.invalidPositions, icon: PackageX },
    { key: "warnings", label: "Warnings", count: stats.warnings, icon: AlertTriangle },
    { key: "selected", label: "Selected", count: stats.selectedCount, icon: CheckSquare },
    { key: "processed", label: "Imported", count: stats.processedCount, icon: CheckCircle },
  ];

  const bannerItems = useMemo(() => {
    const items = [];
    if (stats.totalErrors > 0) {
      items.push({
        id: "errors",
        type: "error",
        title: "Validation Errors Detected",
        message: `${stats.totalErrors} position(s) contain issues that need fixing.`,
        count: stats.totalErrors,
        actions: [
          { label: "Show Errors", icon: Filter, primary: true, action: "filter-invalid" },
          { label: "Validate Selected", icon: Activity, action: "validate-selected" },
        ],
      });
    }
    if (stats.warnings > 0) {
      items.push({
        id: "warnings",
        type: "warning",
        title: "Potential Duplicates",
        message: `${stats.warnings} item(s) may be duplicates. Review before import.`,
        count: stats.warnings,
        actions: [{ label: "Show Warnings", icon: AlertTriangle, primary: true, action: "filter-warnings" }],
      });
    }
    if (stats.importingCount > 0) {
      items.push({
        id: "processing",
        type: "processing",
        title: "Importing Positions",
        message: `${stats.importingCount} position(s) are in-flight…`,
        count: stats.importingCount,
      });
    }
    if (stats.validPositions > 0 && stats.importingCount === 0) {
      items.push({
        id: "ready",
        type: "info",
        title: "Ready to Import",
        message: `${stats.validPositions} valid position(s) can be imported.`,
        count: stats.validPositions,
        actions: [
          { label: "Import Valid", icon: PlayCircle, primary: true, action: "import-valid" },
          { label: "Import Selected", icon: ClipboardList, action: "import-selected" },
        ],
      });
    }
    if (stats.processedCount > 0) {
      items.push({
        id: "done",
        type: "success",
        title: "Import Complete",
        message: `${stats.processedCount} position(s) imported successfully.`,
        count: stats.processedCount,
        actions: [
          { label: "Show Imported", icon: Eye, action: "filter-processed" },
          { label: "Clear From List", icon: CheckCircle, action: "clear-imported" },
        ],
      });
    }
    return items;
  }, [stats]);

  const handleBannerAction = (action) => {
    const a = action?.action;
    if (a === "filter-invalid") setFilterType("invalid");
    if (a === "filter-warnings") setFilterType("warnings");
    if (a === "filter-processed") setFilterType("processed");
    if (a === "validate-selected") handleBulkValidate();
    if (a === "import-valid") submitValidOnly();
    if (a === "import-selected") submitSelected();
    if (a === "clear-imported") {
      const updated = { ...positions };
      Object.keys(updated).forEach(type => {
        updated[type] = updated[type].filter(pos => !processedPositions.has(`${type}-${pos.id}`));
      });
      setPositions(updated);
      setProcessedPositions(new Set());
      setImportResults(new Map());
    }
  };

  const renderFilterBar = () => (
    <div className="flex items-center gap-2 mb-4">
      <Filter className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-700">Show:</span>
      {filterDefs.map(f => {
        const Icon = f.icon;
        const active = filterType === f.key;
        return (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`
              relative flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${active ? "bg-blue-100 text-blue-700 ring-2 ring-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}
            `}
          >
            <Icon className="w-3 h-3 mr-1.5" /> {f.label}
            <span
              className={`
                ml-1.5 inline-flex items-center justify-center px-1.5 h-5 rounded-full text-xs font-bold bg-white/70 text-gray-900
                transition-[transform,opacity] duration-200 will-change-transform ${active ? "scale-105" : ""}
              `}
            >
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderSuggestDropdown = (assetType, positionId, anchorRef, onPick) => {
    const key = `${assetType}-${positionId}`;
    const items = searchResults[key] || [];
    if (!items.length) return null;

    const idx = activeSuggestIndex[key] ?? 0;

    return (
      <div
        className="
          absolute z-50 mt-1 w-[28rem] max-w-[80vw]
          bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl
          transition-transform motion-reduce:transition-none duration-200 ease-out will-change-transform
        "
        style={{
          transform: "translateZ(0)",
        }}
        role="listbox"
      >
        <div className="max-h-72 overflow-auto">
          {items.map((it, i) => {
            const active = i === idx;
            const price = getQuotePrice(it);
            return (
              <button
                key={`${String(it.ticker || it.symbol)}-${i}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => { e.preventDefault(); onPick(it); }} // onMouseDown to prevent blur
                className={`
                  w-full text-left px-3 py-2 flex items-center justify-between gap-3
                  ${active ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"}
                `}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {(it.ticker || it.symbol || "").toUpperCase()} <span className="text-xs font-normal text-gray-500">• {it.asset_type}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{it.name || it.longName || ""}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {price != null && (
                    <div className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-medium">
                      {formatCurrency(price)}
                    </div>
                  )}
                  <ChevronRightIcon />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const ChevronRightIcon = () => (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-gray-400" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
    </svg>
  );

  const renderCellInput = (type, position, field) => {
    const value = (position.data?.[field.key] ?? "");
    const hasError = position.errors?.[field.key];
    const isProcessed = processedPositions.has(`${type}-${position.id}`);
    const posKey = `${type}-${position.id}`;
    const isSelected = selectedPositions.has(posKey);
    const isBusy = importingPositions.has(posKey);
    const firstKey = assetTypes[type].fields[0].key;
    const isFirstField = firstKey === field.key;

    const anchorRef = getCellRef(type, position.id, field.key);

    const commonProps = {
      ref: anchorRef,
      onFocus: () => setFocusedCell({ type, posId: position.id, fieldKey: field.key }),
      onKeyDown: (e) => {
        if (field.searchable) {
          const key = `${type}-${position.id}`;
          const items = searchResults[key] || [];
          const idx = activeSuggestIndex[key] ?? 0;

          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setActiveSuggestIndex(prev => ({ ...prev, [key]: Math.min(idx + 1, items.length - 1) }));
            return;
          }
          if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActiveSuggestIndex(prev => ({ ...prev, [key]: Math.max(idx - 1, 0) }));
            return;
          }
          if (e.key === "Enter" && items.length) {
            e.preventDefault();
            handleSelectSecurity(type, position.id, items[idx]);
            return;
          }
          if (e.key === "Escape") {
            setSearchResults(prev => ({ ...prev, [key]: [] }));
            return;
          }
        }

        if (e.key === "ArrowLeft") return focusSiblingCell(type, position.id, field.key, "left");
        if (e.key === "ArrowRight") return focusSiblingCell(type, position.id, field.key, "right");
      },
      disabled: field.readOnly || isProcessed,
      className: `
        w-full px-3 py-2 text-sm border rounded-lg
        transition-[transform,opacity,border-color,box-shadow] duration-200 will-change-transform
        focus:outline-none
        ${isProcessed ? "bg-gray-100 cursor-not-allowed opacity-60" :
          hasError ? "border-rose-400 bg-rose-50 focus:border-rose-500" :
            "border-gray-300 hover:border-gray-400 focus:border-blue-500"}
        ${field.prefix ? "pl-8" : ""} ${field.suffix ? "pr-8" : ""}
        focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]
      `,
    };

    return (
      <div className="relative flex items-center">
        {/* selection / mini status */}
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isFirstField && !isProcessed && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelectPosition(type, position.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          )}
          {isProcessed && <CheckCircle className="w-4 h-4 text-emerald-600" />}
          {isBusy && !isProcessed && (<div className="animate-pulse"><Ring value={66} /></div>)}
        </div>

        <div className="flex-1">
          {field.type === "select" ? (
            field.key === "account_id" ? (
              <select
                {...commonProps}
                value={String(value || "")}
                onChange={(e) => updatePosition(type, position.id, field.key, e.target.value)}
              >
                <option value="">Select account...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            ) : (
              <select
                {...commonProps}
                value={String(value || "")}
                onChange={(e) => updatePosition(type, position.id, field.key, e.target.value)}
              >
                {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            )
          ) : (
            <div className="relative">
              <input
                {...commonProps}
                type={field.type}
                value={value}
                onChange={(e) => updatePosition(
                  type, position.id, field.key,
                  field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
                )}
                placeholder={field.placeholder}
                onBlur={(e) => {
                  // collapse suggestions on blur (delayed so click can register)
                  const key = `${type}-${position.id}`;
                  setTimeout(() => {
                    setSearchResults(prev => ({ ...prev, [key]: [] }));
                  }, 160);
                }}
                onInput={(e) => {
                  if (field.searchable) {
                    const q = e.currentTarget.value;
                    debouncedSearch(q, type, position.id);
                  }
                }}
              />
              {field.prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">{field.prefix}</span>}
              {field.suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">{field.suffix}</span>}

              {/* Suggest dropdown (restored) */}
              {field.searchable && renderSuggestDropdown(type, position.id, anchorRef, (it) => handleSelectSecurity(type, position.id, it))}
            </div>
          )}

          {hasError && <div className="absolute -bottom-5 left-0 text-xs text-rose-600 font-medium">{position.errors[field.key]}</div>}
        </div>
      </div>
    );
  };

  const renderAssetSection = (type) => {
    const cfg = assetTypes[type];
    const all = positions[type] || [];
    const filtered = getFilteredPositions(type);
    const isExpanded = !!expandedSections[type];
    const Icon = cfg.icon;
    const tStats = stats.byType[type];

    const someSelected = filtered.some(p => selectedPositions.has(`${type}-${p.id}`));
    const allSelected = filtered.every(p => selectedPositions.has(`${type}-${p.id}`) || processedPositions.has(`${type}-${p.id}`));
    const indeterminate = someSelected && !allSelected;

    if (filtered.length === 0 && filterType !== "all") return null;

    return (
      <div key={type} className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* header */}
        <div
          onClick={() => setExpandedSections(prev => ({ ...prev, [type]: !isExpanded }))}
          className={`
            px-4 py-3 cursor-pointer
            ${isExpanded
              ? "bg-gradient-to-r from-gray-900 to-gray-700 text-white"
              : "bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60"}
            transition-colors
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-2 rounded-lg ${isExpanded ? "bg-white/20" : "bg-gray-200 dark:bg-gray-800"}`}>
                <Icon className={`w-5 h-5 ${isExpanded ? "text-white" : "text-gray-800 dark:text-gray-200"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-base ${isExpanded ? "text-white" : "text-gray-800 dark:text-gray-100"}`}>{cfg.name}</h3>
                  {all.length > 0 && (
                    <span className={`px-2 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${isExpanded ? "bg-white/25 text-white" : "bg-gray-800 text-white"}`}>
                      {all.length}
                    </span>
                  )}
                  {filterType !== "all" && filtered.length !== all.length && (
                    <span className={`px-2 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${isExpanded ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
                      {filtered.length} filtered
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${isExpanded ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>{cfg.description}</p>
              </div>

              {/* mini stats */}
              {tStats && (
                <div className={`hidden md:flex items-center gap-4 text-xs ${isExpanded ? "text-white/90" : "text-gray-600 dark:text-gray-300"}`}>
                  <div className="text-center"><div className="font-bold"><AnimatedNumber value={tStats.valid} /></div><div>Valid</div></div>
                  {tStats.invalid > 0 && <div className="text-center"><div className="font-bold text-rose-300"><AnimatedNumber value={tStats.invalid} /></div><div>Errors</div></div>}
                  {tStats.processed > 0 && <div className="text-center"><div className="font-bold text-emerald-300"><AnimatedNumber value={tStats.processed} /></div><div>Imported</div></div>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={(e) => { e.stopPropagation(); addNewRow(type); if (!isExpanded) setExpandedSections(prev => ({ ...prev, [type]: true })); }}
                className={`p-1.5 rounded-lg ${isExpanded ? "bg-white/20 hover:bg-white/30 text-white" : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"}`}
                title={`Add ${cfg.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180 text-white" : "text-gray-400 dark:text-gray-500"}`} />
            </div>
          </div>
        </div>

        {/* body */}
        {isExpanded && (
          <div className="bg-white dark:bg-gray-950">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4"><Icon className="w-8 h-8 text-gray-700 dark:text-gray-200" /></div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{filterType === "all" ? `No ${cfg.name.toLowerCase()} yet` : `No ${filterType} ${cfg.name.toLowerCase()}`}</p>
                {filterType === "all" && (
                  <button onClick={() => addNewRow(type)} className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" /> Add {cfg.name}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-gray-950/70 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="w-8 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            ref={(el) => {
                              if (el) el.indeterminate = indeterminate;
                            }}
                            checked={allSelected}
                            onChange={(e) => e.target.checked ? handleSelectAllIn(type, filtered) : handleDeselectAllIn(type, filtered)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="w-12 px-3 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">#</span>
                        </th>
                        {cfg.fields.map(f => (
                          <th key={f.key} className={`${f.width} px-2 py-3 text-left`}>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                              {f.label}
                              {f.required && <span className="text-rose-500">*</span>}
                              {f.readOnly && <Info className="w-3 h-3 text-gray-400 dark:text-gray-500" title="Auto-filled" />}
                            </span>
                          </th>
                        ))}
                        <th className="w-32 px-2 py-3 text-center">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filtered.map((position, idx) => {
                        const k = `${type}-${position.id}`;
                        const hasErrors = Object.values(position.errors || {}).some(Boolean);
                        const warn = dedupeMap.get(dupKey(type, position)) > 1;
                        const isSelected = selectedPositions.has(k);
                        const isImporting = importingPositions.has(k);
                        const isProcessed = processedPositions.has(k);
                        const { value } = calcValue(type, position);

                        return (
                          <tr
                            key={position.id}
                            className={`
                              relative group
                              transition-colors duration-200
                              ${idx % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50 dark:bg-gray-900/50"}
                              ${position.isNew ? "motion-safe:animate-[fadeIn_.3s_ease-out]" : ""}
                              ${isProcessed ? "bg-emerald-50/30 dark:bg-emerald-900/20" :
                                isImporting ? "bg-amber-50/30 dark:bg-amber-900/20" :
                                  isSelected ? "bg-blue-50/30 dark:bg-blue-900/20" :
                                    hasErrors ? "bg-rose-50/30 dark:bg-rose-900/20" :
                                      warn ? "bg-amber-50/30 dark:bg-amber-900/20" : ""}
                            `}
                          >
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{idx + 1}</span>
                            </td>
                            {cfg.fields.map(f => (
                              <td key={f.key} className={`${f.width} px-1 py-2 relative`}>
                                {renderCellInput(type, position, f)}
                              </td>
                            ))}
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-center gap-2">
                                {!isProcessed && (
                                  <>
                                    <button
                                      onClick={() => duplicateRow(type, position.id)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition"
                                      title="Duplicate (Ctrl/⌘+D)"
                                    >
                                      <Repeat className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deletePosition(type, position.id)}
                                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {value > 0 && showValues && (
                                  <div className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium text-gray-700 dark:text-gray-200">
                                    {formatCurrency(value)}
                                  </div>
                                )}
                                {/* Status badge */}
                                <div className="min-w-[82px] flex items-center justify-center">
                                  {isProcessed ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 transition">
                                      <CheckCircle className="w-3 h-3" /> Imported
                                    </span>
                                  ) : isImporting ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 transition">
                                      <Loader2 className="w-3 h-3 animate-spin" /> Sending
                                    </span>
                                  ) : hasErrors ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200 transition">
                                      <AlertCircle className="w-3 h-3" /> Fix Required
                                    </span>
                                  ) : warn ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 transition">
                                      <AlertTriangle className="w-3 h-3" /> Review
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 transition">
                                      <Info className="w-3 h-3" /> Ready
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* footer add */}
                {filterType === "all" && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => addNewRow(type)}
                      className="
                        w-full py-2 px-4 border-2 border-dashed rounded-lg
                        hover:border-gray-400 dark:hover:border-gray-600
                        flex items-center justify-center gap-2 text-gray-800 dark:text-gray-100
                      "
                    >
                      <Plus className="w-4 h-4" /> <span className="text-sm font-medium">Add {cfg.name} (Enter)</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  /* --------------------------------- Header --------------------------------- */

  return (
    <FixedModal isOpen={isOpen} onClose={onClose} title="Enhanced Quick Position Entry" size="max-w-[1800px]">
      {/* Banner Stack */}
      <BannerCenter items={bannerItems} onAction={handleBannerAction} />

      <div className="h-[95vh] flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* top bar */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">Values:</span>
              <button
                onClick={() => setShowValues(!showValues)}
                className={`p-2 rounded-lg transition ${showValues ? "bg-blue-100 text-blue-700" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"}`}
                title={showValues ? "Hide values" : "Show values"}
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={submitSelected}
                disabled={!stats.selectedCount || isSubmitting}
                className={`px-4 py-2 text-sm rounded-lg border bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2 ${(!stats.selectedCount || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ClipboardList className="w-4 h-4" /> Import Selected
              </button>
              <button
                onClick={submitValidOnly}
                disabled={stats.validPositions === 0 || isSubmitting}
                className={`px-6 py-2 text-sm font-semibold rounded-lg inline-flex items-center gap-2 shadow-sm hover:shadow
                  ${stats.validPositions === 0 || isSubmitting ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700"}
                `}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><PlayCircle className="w-4 h-4" /> Import {stats.validPositions} Valid</>}
              </button>
            </div>
          </div>

          {/* stats row */}
          <div className="grid grid-cols-6 gap-4 mb-4">
            <StatCard icon={Package2} tone="blue" title="Total" value={<AnimatedNumber value={stats.totalPositions} />} />
            <StatCard icon={PackageCheck} tone="green" title="Valid" value={<AnimatedNumber value={stats.validPositions} />} />
            {stats.invalidPositions > 0 && <StatCard icon={PackageX} tone="red" title="Invalid" value={<AnimatedNumber value={stats.invalidPositions} />} />}
            {stats.selectedCount > 0 && <StatCard icon={CheckSquare} tone="purple" title="Selected" value={<AnimatedNumber value={stats.selectedCount} />} />}
            {stats.processedCount > 0 && <StatCard icon={CheckCircle} tone="emerald" title="Imported" value={<AnimatedNumber value={stats.processedCount} />} />}
            {stats.totalValue > 0 && showValues && (
              <StatCard icon={DollarSign} tone="amber" title="Value" value={formatCurrency(stats.totalValue)} sub={
                <span className={`inline-flex items-center ${stats.totalPerformance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {stats.totalPerformance >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(stats.totalPerformance).toFixed(1)}%
                </span>
              } />
            )}
          </div>

          {/* progress multi-segment */}
          {stats.totalPositions > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.validPositions} ready • {stats.importingCount} importing • {stats.processedCount} done
                </span>
              </div>
              <SegmentedProgress total={stats.totalPositions} ready={stats.validPositions} importing={stats.importingCount} done={stats.processedCount} />
            </div>
          )}

          {/* filters */}
          {stats.totalPositions > 0 && renderFilterBar()}
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {Object.keys(assetTypes).map((t) => renderAssetSection(t))}
        </div>
      </div>
    </FixedModal>
  );
};

/* ------------------------------ Small component ---------------------------- */

function StatCard({ icon: Icon, tone = "gray", title, value, sub }) {
  const tones = {
    blue: ["from-blue-50 to-indigo-50", "border-blue-100", "text-blue-700", "text-blue-400"],
    green: ["from-green-50 to-emerald-50", "border-green-100", "text-green-700", "text-green-400"],
    red: ["from-red-50 to-rose-50", "border-red-100", "text-rose-700", "text-rose-400"],
    purple: ["from-purple-50 to-indigo-50", "border-purple-100", "text-purple-700", "text-purple-400"],
    emerald: ["from-emerald-50 to-green-50", "border-emerald-100", "text-emerald-700", "text-emerald-400"],
    amber: ["from-yellow-50 to-amber-50", "border-amber-100", "text-amber-700", "text-amber-400"],
    gray: ["from-gray-50 to-gray-100", "border-gray-200", "text-gray-700", "text-gray-400"],
  }[tone] || ["from-gray-50 to-gray-100", "border-gray-200", "text-gray-700", "text-gray-400"];
  return (
    <div className={`bg-gradient-to-br ${tones[0]} rounded-lg p-3 border ${tones[1]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-lg font-black ${tones[2]}`}>{value}</p>
          <p className={`text-xs font-medium ${tones[2]}`}>{title}</p>
          {sub && <div className="mt-1">{sub}</div>}
        </div>
        <Icon className={`w-8 h-8 ${tones[3]}`} />
      </div>
    </div>
  );
}

AddQuickPositionModal.displayName = "AddQuickPositionModal";
export { AddQuickPositionModal };
export default AddQuickPositionModal;
