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
  Copy, ArrowUpDown, Info, Filter, Loader2, PackageX, PackageCheck, Package2,
  ClipboardList, CheckSquare, Repeat, Activity, AlertTriangle, PlayCircle, Eye as EyeIcon,
} from "lucide-react";

/* ----------------------------- UI small parts ----------------------------- */

const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0, duration = 400 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    if (value === displayValue) return;
    setIsAnimating(true);
    const start = Date.now();
    const from = displayValue;
    const to = value;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplayValue(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(tick);
      else setIsAnimating(false);
    };
    requestAnimationFrame(tick);
  }, [value, duration, displayValue]);
  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue).toLocaleString();
  return <span className={`transition-all ${isAnimating ? "text-blue-600" : ""}`}>{prefix}{formatted}{suffix}</span>;
};

const ProgressBar = ({ current, total, status = "default", className = "" }) => {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const colors = {
    default: "from-blue-500 to-blue-600",
    success: "from-green-500 to-green-600",
    warning: "from-yellow-500 to-yellow-600",
    error: "from-red-500 to-red-600",
    processing: "from-purple-500 to-purple-600",
  };
  return (
    <div className={`relative ${className}`}>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${colors[status]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="absolute -top-0.5 transition-all" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
        <div className={`w-3 h-3 bg-gradient-to-r ${colors[status]} rounded-full ring-2 ring-white`} />
      </div>
    </div>
  );
};

const SmartBanner = ({ type, title, message, actions, onDismiss, count, persistent = false }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed && !persistent) return null;
  const styles = {
    success: { box: "from-green-50 to-emerald-50 border-green-200", icon: CheckCircle, tone: "text-green-700" },
    warning: { box: "from-yellow-50 to-amber-50 border-yellow-200", icon: AlertTriangle, tone: "text-yellow-700" },
    error: { box: "from-red-50 to-rose-50 border-red-200", icon: AlertCircle, tone: "text-red-700" },
    info: { box: "from-blue-50 to-indigo-50 border-blue-200", icon: Info, tone: "text-blue-700" },
    processing: { box: "from-purple-50 to-indigo-50 border-purple-200", icon: Activity, tone: "text-purple-700" },
  }[type];
  const Icon = styles.icon;
  return (
    <div className={`rounded-xl border p-4 mb-4 bg-gradient-to-r ${styles.box}`}>
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${styles.tone}`} />
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${styles.tone} flex items-center`}>
              {title}
              {count != null && <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${styles.tone} bg-white/70`}>{count}</span>}
            </h3>
            {onDismiss && !persistent && (
              <button onClick={() => { setDismissed(true); onDismiss?.(); }} className={`${styles.tone}`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {message && <p className={`mt-1 text-sm ${styles.tone}`}>{message}</p>}
          {actions?.length ? (
            <div className="mt-3 flex items-center gap-2">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all
                    ${a.primary ? "bg-blue-600 text-white hover:opacity-90" : "bg-white/80 hover:bg-white text-gray-700"}
                    disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1`}
                >
                  {a.icon && <a.icon className="w-3 h-3" />} {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------- Type config ------------------------------ */

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

/* ----------------------------- Helper utilities --------------------------- */

const metalSymbolByType = { Gold: "GC=F", Silver: "SI=F", Platinum: "PL=F", Copper: "HG=F", Palladium: "PA=F" };

const getQuotePrice = (s) => {
  const v = s?.price ?? s?.current_price ?? s?.regularMarketPrice ?? s?.regular_market_price ?? s?.last ?? s?.close ?? s?.value ?? s?.mark;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const LS_UI = "quickPosition_expandedSections";
const LS_SNAPSHOT = "quickPosition_snapshot_v2";

/* -------------------------------- Component ------------------------------- */

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
  const [viewMode, setViewMode] = useState(false);

  // select / progress
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [importingPositions, setImportingPositions] = useState(new Set());
  const [processedPositions, setProcessedPositions] = useState(new Set());
  const [importResults, setImportResults] = useState(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // search/autofill
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [selectedSecurities, setSelectedSecurities] = useState({});

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

    // auto-expand sections with data
    const has = {};
    Object.entries(normalized).forEach(([type, arr]) => { if (arr?.length) has[type] = true; });
    setExpandedSections(prev => ({ ...prev, ...has }));

    // reset runtime state
    setSelectedPositions(new Set());
    setProcessedPositions(new Set());
    setImportingPositions(new Set());
    setImportResults(new Map());
    setFilterType("all");

    // auto-hydrate prices (best-effort, capped)
    setTimeout(() => autoHydrateSeededPrices(normalized), 80);
  }, [isOpen, seedPositions]);

  useEffect(() => {
    localStorage.setItem(LS_UI, JSON.stringify(expandedSections));
    localStorage.setItem(LS_SNAPSHOT, JSON.stringify({ positions }));
  }, [expandedSections, positions]);

  /* --------------------------------- Derived --------------------------------- */

  const dedupeMap = useMemo(() => {
    const counts = new Map(); // key -> count
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((p) => {
        const key = dupKey(type, p);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
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

        const isValid = validatePosition(type, pos);
        if (isValid) {
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
      // flat list; infer types when possible
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

  function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

  function validatePosition(type, pos) {
    const d = pos.data || {};
    const errs = {};

    // account requirements (skip for otherAssets)
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

  /* ---------------------------- Search / Hydration --------------------------- */

  const debouncedSearch = useCallback(
    debounce(async (query, assetType, positionId) => {
      const searchKey = `${assetType}-${positionId}`;
      if (!query || query.length < 2) {
        setSearchResults(prev => ({ ...prev, [searchKey]: [] }));
        return;
      }
      setIsSearching(prev => ({ ...prev, [searchKey]: true }));
      try {
        const results = await searchSecurities(query);
        let filtered = Array.isArray(results) ? results : [];
        if (assetType === "security") filtered = filtered.filter(i => i.asset_type === "security" || i.asset_type === "index");
        if (assetType === "crypto") filtered = filtered.filter(i => i.asset_type === "crypto");
        if (assetType === "metal") {
          // if metal search returns, pick first match & hydrate
          if (filtered.length) handleSelectSecurity(assetType, positionId, filtered[0]);
          setSearchResults(prev => ({ ...prev, [searchKey]: [] }));
          return;
        }
        setSearchResults(prev => ({ ...prev, [searchKey]: filtered }));
      } catch (e) {
        console.error("search error", e);
        setSearchResults(prev => ({ ...prev, [searchKey]: [] }));
      } finally {
        setIsSearching(prev => ({ ...prev, [searchKey]: false }));
      }
    }, 300),
    []
  );

  const handleSelectSecurity = (assetType, positionId, security) => {
    const searchKey = `${assetType}-${positionId}`;
    setSelectedSecurities(prev => ({ ...prev, [searchKey]: security }));
    const px = getQuotePrice(security);

    setPositions(prev => ({
      ...prev,
      [assetType]: prev[assetType].map(pos => {
        if (pos.id !== positionId) return pos;
        const d = { ...pos.data };
        if (assetType === "security") {
          d.ticker = security.ticker;
          if (px != null) d.price = px;
          d.name = security.name;
          if (d.cost_basis == null && d.price != null) d.cost_basis = d.price;
        } else if (assetType === "crypto") {
          d.symbol = security.ticker;
          if (px != null) d.current_price = px;
          d.name = security.name;
          if (d.purchase_price == null && d.current_price != null) d.purchase_price = d.current_price;
        } else if (assetType === "metal") {
          d.symbol = security.ticker;
          if (px != null) d.current_price_per_unit = px;
          d.name = security.name;
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
    // gather candidates
    const work = [];
    normalized.security.forEach(p => { const q = p?.data?.ticker || p?.data?.symbol; if (q && !(Number(p?.data?.price) > 0)) work.push({ type: "security", id: p.id, q }); });
    normalized.crypto.forEach(p => { const q = p?.data?.symbol || p?.data?.ticker; if (q && !(Number(p?.data?.current_price) > 0)) work.push({ type: "crypto", id: p.id, q }); });
    normalized.metal.forEach(p => {
      const q = p?.data?.symbol || metalSymbolByType[p?.data?.metal_type];
      if (q && !(Number(p?.data?.current_price_per_unit) > 0)) work.push({ type: "metal", id: p.id, q });
    });

    if (!work.length) return;
    const slice = work.slice(0, 40); // soft cap
    const results = await runPool(slice, 4, async (item) => {
      try {
        const r = await searchSecurities(item.q);
        let filtered = Array.isArray(r) ? r : [];
        if (item.type === "security") filtered = filtered.filter(x => x.asset_type === "security" || x.asset_type === "index");
        if (item.type === "crypto") filtered = filtered.filter(x => x.asset_type === "crypto");
        const exact = filtered.find(x => String(x.ticker || "").toUpperCase() === String(item.q).toUpperCase());
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

  /* ------------------------------- Selection -------------------------------- */

  const handleSelectPosition = (type, id, checked) => {
    const key = `${type}-${id}`;
    const next = new Set(selectedPositions);
    if (checked) next.add(key);
    else next.delete(key);
    setSelectedPositions(next);
  };

  const handleSelectAll = () => {
    const next = new Set();
    Object.entries(positions).forEach(([type, arr]) =>
      arr.forEach(pos => { const k = `${type}-${pos.id}`; if (!processedPositions.has(k)) next.add(k); })
    );
    setSelectedPositions(next);
  };

  const handleDeselectAll = () => setSelectedPositions(new Set());

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

  /* --------------------------------- Filters -------------------------------- */

  const getFilteredPositions = (type) => {
    const arr = positions[type] || [];
    if (filterType === "all") return arr;
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

        // metal convenience: change metal type -> symbol/name + lookup
        if (type === "metal" && field === "metal_type" && v) {
          const opt = cfg?.options?.find(o => o.value === v);
          const d = { ...pos.data, metal_type: v, symbol: opt?.symbol, name: `${v} Futures` };
          if (opt?.symbol) debouncedSearch(opt.symbol, type, id);
          const next = { ...pos, data: d, errors: { ...pos.errors }, isNew: false, animateIn: false };
          validatePosition(type, next);
          return next;
        }

        // live search for searchable fields
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
    // focus first cell of the clone
    setTimeout(() => {
      const firstKey = FIELD_ORDER[type]?.[0];
      const ref = getCellRef(type, /* last added */ Math.max(...positions[type].map(p => p.id)), firstKey);
      ref?.current?.focus?.();
      ref?.current?.select?.();
    }, 0);
  };

  /* --------------------------------- Imports -------------------------------- */

  const submitValidOnly = async () => {
    if (stats.validPositions === 0) return;
    setIsSubmitting(true);

    // flatten valid rows
    const validBatches = [];
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach(pos => {
        const k = `${type}-${pos.id}`;
        if (processedPositions.has(k)) return;
        if (validatePosition(type, pos)) validBatches.push({ type, pos });
      });
    });

    await importWithProgress(validBatches);

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
    const errors = [];
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
        errors.push({ type, pos, error: e });
      } finally {
        setImportingPositions(prev => { const n = new Set(prev); n.delete(k); return n; });
      }
    });

    // De-queue imported successes from UI
    if (success.length) {
      const successSet = new Set(success.map(({ type, pos }) => `${type}-${pos.id}`));
      setPositions(prev => {
        const out = {};
        Object.entries(prev).forEach(([type, arr]) => {
          out[type] = arr.filter(p => !successSet.has(`${type}-${p.id}`));
        });
        return out;
      });

      // callback upward
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

  /* ------------------------------ Keyboard UX ------------------------------ */

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      const k = String(e.key).toLowerCase();
      if (e.key === "Escape") onClose?.();
      if (e.metaKey && k === "e") setFilterType("invalid");
      if (e.metaKey && k === "a") handleSelectAll();
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

  /* -------------------------------- Rendering ------------------------------- */

  const renderFilterBar = () => {
    const filters = [
      { key: "all", label: "All", count: stats.totalPositions, icon: Package2 },
      { key: "valid", label: "Valid", count: stats.validPositions, icon: PackageCheck },
      { key: "invalid", label: "Invalid", count: stats.invalidPositions, icon: PackageX },
      { key: "warnings", label: "Warnings", count: stats.warnings, icon: AlertTriangle },
      { key: "selected", label: "Selected", count: stats.selectedCount, icon: CheckSquare },
      { key: "processed", label: "Imported", count: stats.processedCount, icon: CheckCircle },
    ];
    return (
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">Show:</span>
        {filters.map(f => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${filterType === f.key ? "bg-blue-100 text-blue-700 ring-2 ring-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <Icon className="w-3 h-3 mr-1.5" /> {f.label}
              <span className="ml-1.5 px-1.5 py-0.5 bg-white/70 rounded-full text-xs font-bold">{f.count}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSmartBanners = () => {
    const banners = [];
    if (stats.totalErrors > 0) {
      banners.push(
        <SmartBanner
          key="errors"
          type="error"
          title="Validation Errors Found"
          message={`${stats.totalErrors} positions have validation errors that need to be fixed.`}
          count={stats.totalErrors}
          actions={[
            { label: "Show Errors Only", icon: Filter, primary: true, onClick: () => setFilterType("invalid") },
            { label: "Auto-Validate Selected", icon: Activity, onClick: handleBulkValidate },
          ]}
          persistent
        />
      );
    }
    if (stats.warnings > 0) {
      banners.push(
        <SmartBanner
          key="warn"
          type="warning"
          title="Potential Duplicates Detected"
          message={`${stats.warnings} item(s) appear to be duplicates (same account/id/qty/date). Review before import.`}
          count={stats.warnings}
          actions={[{ label: "Show Warnings", icon: AlertTriangle, primary: true, onClick: () => setFilterType("warnings") }]}
          persistent
        />
      );
    }
    if (stats.importingCount > 0) {
      banners.push(
        <SmartBanner
          key="processing"
          type="processing"
          title="Import in Progress"
          message={`${stats.importingCount} position(s) are being imported...`}
          count={stats.importingCount}
          persistent
        />
      );
    }
    if (stats.validPositions > 0 && stats.importingCount === 0) {
      banners.push(
        <SmartBanner
          key="ready"
          type="info"
          title="Ready to Import"
          message={`${stats.validPositions} position(s) are valid and can be imported now.`}
          count={stats.validPositions}
          actions={[
            { label: "Import Valid Only", icon: PlayCircle, primary: true, onClick: submitValidOnly, disabled: isSubmitting },
            { label: "Import Selected", icon: EyeIcon, onClick: submitSelected, disabled: isSubmitting || !stats.selectedCount },
          ]}
          persistent
        />
      );
    }
    if (stats.processedCount > 0) {
      banners.push(
        <SmartBanner
          key="success"
          type="success"
          title="Successfully Imported"
          message={`${stats.processedCount} position(s) have been added.`}
          count={stats.processedCount}
          actions={[
            {
              label: "Clear Imported from List",
              icon: CheckCircle,
              primary: true,
              onClick: () => {
                const updated = { ...positions };
                Object.keys(updated).forEach(type => {
                  updated[type] = updated[type].filter(p => !processedPositions.has(`${type}-${p.id}`));
                });
                setPositions(updated);
                setProcessedPositions(new Set());
                setImportResults(new Map());
              },
            },
            { label: "Show Imported", icon: Eye, onClick: () => setFilterType("processed") },
          ]}
        />
      );
    }
    return banners;
  };

  const renderCellInput = (type, position, field) => {
    const value = (position.data?.[field.key] ?? "");
    const hasError = position.errors?.[field.key];
    const isProcessed = processedPositions.has(`${type}-${position.id}`);
    const posKey = `${type}-${position.id}`;
    const isSelected = selectedPositions.has(posKey);

    const commonProps = {
      ref: getCellRef(type, position.id, field.key),
      onFocus: () => setFocusedCell({ type, posId: position.id, fieldKey: field.key }),
      onKeyDown: (e) => {
        if (e.key === "ArrowLeft") return focusSiblingCell(type, position.id, field.key, "left");
        if (e.key === "ArrowRight") return focusSiblingCell(type, position.id, field.key, "right");
      },
      disabled: field.readOnly || isProcessed,
      className: `w-full px-3 py-2 text-sm border rounded-lg transition-all ${isProcessed ? "bg-gray-100 cursor-not-allowed opacity-60" : hasError ? "border-red-400 bg-red-50 focus:border-red-500" : "border-gray-300 hover:border-gray-400 focus:border-blue-500"} ${field.prefix ? "pl-8" : ""} ${field.suffix ? "pr-8" : ""}`,
    };

    const firstKey = assetTypes[type].fields[0].key;
    const isFirstField = firstKey === field.key;

    return (
      <div className="relative flex items-center">
        {/* selection / state glyphs */}
        {isFirstField && !isProcessed && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelectPosition(type, position.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        )}
        {isProcessed && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
        )}
        {importingPositions.has(posKey) && !isProcessed && (
          <div className="absolute -left-8 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          </div>
        )}

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
            <input
              {...commonProps}
              type={field.type}
              value={value}
              onChange={(e) => updatePosition(
                type, position.id, field.key,
                field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
              )}
              placeholder={field.placeholder}
            />
          )}

          {field.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{field.prefix}</span>}
          {field.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{field.suffix}</span>}

          {hasError && <div className="absolute -bottom-5 left-0 text-xs text-red-600 font-medium">{position.errors[field.key]}</div>}
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

    if (filtered.length === 0 && filterType !== "all") return null;

    return (
      <div key={type} className={`bg-white rounded-xl shadow-sm border overflow-hidden`}>
        {/* header */}
        <div
          onClick={() => setExpandedSections(prev => ({ ...prev, [type]: !isExpanded }))}
          className={`px-4 py-3 cursor-pointer ${isExpanded ? "bg-gradient-to-r from-gray-900 to-gray-700 text-white" : "bg-gray-50 hover:bg-gray-100"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className={`p-2 rounded-lg ${isExpanded ? "bg-white/20" : "bg-gray-200"}`}>
                <Icon className={`w-5 h-5 ${isExpanded ? "text-white" : "text-gray-800"}`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-base flex items-center ${isExpanded ? "text-white" : "text-gray-800"}`}>
                  {cfg.name}
                  {all.length > 0 && <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${isExpanded ? "bg-white/20 text-white" : "bg-gray-800 text-white"}`}>{all.length}</span>}
                  {filterType !== "all" && filtered.length !== all.length && (
                    <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${isExpanded ? "bg-white/40 text-white" : "bg-yellow-100 text-yellow-700"}`}>{filtered.length} filtered</span>
                  )}
                </h3>
                <p className={`text-xs mt-0.5 ${isExpanded ? "text-white/80" : "text-gray-500"}`}>{cfg.description}</p>
              </div>
              {tStats && (
                <div className={`flex items-center gap-4 text-xs ${isExpanded ? "text-white/90" : "text-gray-600"}`}>
                  <div className="text-center"><div className="font-bold"><AnimatedNumber value={tStats.valid} /></div><div>Valid</div></div>
                  {tStats.invalid > 0 && <div className="text-center"><div className="font-bold text-red-400"><AnimatedNumber value={tStats.invalid} /></div><div>Errors</div></div>}
                  {tStats.processed > 0 && <div className="text-center"><div className="font-bold text-green-400"><AnimatedNumber value={tStats.processed} /></div><div>Imported</div></div>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={(e) => { e.stopPropagation(); addNewRow(type); if (!isExpanded) setExpandedSections(prev => ({ ...prev, [type]: true })); }}
                className={`p-1.5 rounded-lg ${isExpanded ? "bg-white/20 hover:bg-white/30 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                title={`Add ${cfg.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180 text-white" : "text-gray-400"}`} />
            </div>
          </div>
        </div>

        {/* body */}
        {isExpanded && (
          <div className="bg-white">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-gray-100 mb-4"><Icon className="w-8 h-8 text-gray-700" /></div>
                <p className="text-gray-600 mb-4">{filterType === "all" ? `No ${cfg.name.toLowerCase()} yet` : `No ${filterType} ${cfg.name.toLowerCase()}`}</p>
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
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-8 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={filtered.every(pos => selectedPositions.has(`${type}-${pos.id}`) || processedPositions.has(`${type}-${pos.id}`))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const next = new Set(selectedPositions);
                                filtered.forEach(pos => { if (!processedPositions.has(`${type}-${pos.id}`)) next.add(`${type}-${pos.id}`); });
                                setSelectedPositions(next);
                              } else {
                                const next = new Set(selectedPositions);
                                filtered.forEach(pos => next.delete(`${type}-${pos.id}`));
                                setSelectedPositions(next);
                              }
                            }}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="w-12 px-3 py-3 text-left"><span className="text-xs font-semibold text-gray-600">#</span></th>
                        {cfg.fields.map(f => (
                          <th key={f.key} className={`${f.width} px-2 py-3 text-left`}>
                            <span className="text-xs font-semibold text-gray-600 flex items-center">
                              {f.label}
                              {f.required && <span className="text-red-500 ml-1">*</span>}
                              {f.readOnly && <Info className="w-3 h-3 ml-1 text-gray-400" title="Auto-filled" />}
                            </span>
                          </th>
                        ))}
                        <th className="w-28 px-2 py-3 text-center"><span className="text-xs font-semibold text-gray-600">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
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
                            className={`border-b border-gray-100 transition-all relative
                              ${position.isNew ? "bg-blue-50/40" : ""}
                              ${isProcessed ? "bg-green-50/30" : isImporting ? "bg-yellow-50/30" : isSelected ? "bg-blue-50/30" : hasErrors ? "bg-red-50/30" : warn ? "bg-amber-50/30" : "hover:bg-gray-50/50"}
                            `}
                          >
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2"><span className="text-sm font-medium text-gray-500">{idx + 1}</span></td>
                            {cfg.fields.map(f => (
                              <td key={f.key} className={`${f.width} px-1 py-2 relative`}>
                                {renderCellInput(type, position, f)}
                              </td>
                            ))}
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {!isProcessed && (
                                  <>
                                    <button
                                      onClick={() => duplicateRow(type, position.id)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                      title="Duplicate (Ctrl/⌘+D)"
                                    >
                                      <Repeat className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deletePosition(type, position.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {value > 0 && showValues && (
                                  <div className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                    {formatCurrency(value)}
                                  </div>
                                )}
                                {isProcessed && <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Imported</div>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filterType === "all" && (
                  <div className="p-3 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => addNewRow(type)}
                      className="w-full py-2 px-4 border-2 border-dashed rounded-lg hover:border-gray-400 flex items-center justify-center gap-2"
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
      <div className="h-[95vh] flex flex-col bg-gray-50">
        {/* top bar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Values:</span>
                <button
                  onClick={() => setShowValues(!showValues)}
                  className={`p-2 rounded-lg ${showValues ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}
                  title={showValues ? "Hide values" : "Show values"}
                >
                  {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={submitSelected}
                disabled={!stats.selectedCount || isSubmitting}
                className={`px-4 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50 inline-flex items-center gap-2 ${(!stats.selectedCount || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <ClipboardList className="w-4 h-4" /> Import Selected
              </button>
              <button
                onClick={submitValidOnly}
                disabled={stats.validPositions === 0 || isSubmitting}
                className={`px-6 py-2 text-sm font-semibold rounded-lg inline-flex items-center gap-2 shadow-sm hover:shadow
                  ${stats.validPositions === 0 || isSubmitting ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"}
                `}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><PlayCircle className="w-4 h-4" /> Import {stats.validPositions} Valid</>}
              </button>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-6 gap-4 mb-4">
            <StatCard icon={Package2} tone="blue" title="Total" value={<AnimatedNumber value={stats.totalPositions} />} />
            <StatCard icon={PackageCheck} tone="green" title="Valid" value={<AnimatedNumber value={stats.validPositions} />} />
            {stats.invalidPositions > 0 && <StatCard icon={PackageX} tone="red" title="Invalid" value={<AnimatedNumber value={stats.invalidPositions} />} />}
            {stats.selectedCount > 0 && <StatCard icon={CheckSquare} tone="purple" title="Selected" value={<AnimatedNumber value={stats.selectedCount} />} />}
            {stats.processedCount > 0 && <StatCard icon={CheckCircle} tone="emerald" title="Imported" value={<AnimatedNumber value={stats.processedCount} />} />}
            {stats.totalValue > 0 && showValues && (
              <StatCard icon={DollarSign} tone="amber" title="Value" value={formatCurrency(stats.totalValue)} sub={
                <span className={`inline-flex items-center ${stats.totalPerformance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stats.totalPerformance >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(stats.totalPerformance).toFixed(1)}%
                </span>
              } />
            )}
          </div>

          {/* progress */}
          {stats.totalPositions > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Readiness</span>
                <span className="text-sm text-gray-600">{stats.validPositions} of {stats.totalPositions} ready</span>
              </div>
              <ProgressBar current={stats.validPositions} total={stats.totalPositions} status={stats.invalidPositions > 0 ? "warning" : "success"} className="mb-2" />
              {stats.processedCount > 0 && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Imported</span>
                    <span className="text-xs text-green-600 font-medium">{stats.processedCount} completed</span>
                  </div>
                  <ProgressBar current={stats.processedCount} total={stats.totalPositions} status="success" />
                </>
              )}
            </div>
          )}

          {/* filters */}
          {stats.totalPositions > 0 && renderFilterBar()}
        </div>

        {/* banners */}
        <div className="px-6 py-2">{renderSmartBanners()}</div>

        {/* bulk toolbar */}
        {stats.selectedCount > 0 && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{stats.selectedCount} of {stats.totalPositions - stats.processedCount} selected</span>
              <div className="h-4 w-px bg-gray-600" />
              <div className="flex items-center gap-2">
                <button onClick={stats.selectedCount === (stats.totalPositions - stats.processedCount) ? handleDeselectAll : handleSelectAll} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium">
                  {stats.selectedCount === (stats.totalPositions - stats.processedCount) ? "Deselect All" : "Select All"}
                </button>
                <button onClick={handleBulkValidate} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium inline-flex items-center gap-1">
                  <Check className="w-3 h-3" /> Validate
                </button>
                <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!viewMode ? (
            Object.keys(assetTypes).map((t) => renderAssetSection(t))
          ) : (
            <div className="text-center py-12 text-gray-500">Account view coming soon…</div>
          )}
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
    red: ["from-red-50 to-rose-50", "border-red-100", "text-red-700", "text-red-400"],
    purple: ["from-purple-50 to-indigo-50", "border-purple-100", "text-purple-700", "text-purple-400"],
    emerald: ["from-emerald-50 to-green-50", "border-emerald-100", "text-emerald-700", "text-emerald-400"],
    amber: ["from-yellow-50 to-amber-50", "border-yellow-100", "text-yellow-700", "text-yellow-400"],
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
