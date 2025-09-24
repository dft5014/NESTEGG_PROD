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
  ChevronRight, ListFilter, RefreshCcw, Bug, CheckCircle2
} from "lucide-react";

/**
 * AddQuickPositionModal — “QuickPositions: Revamp”
 * - Preserves ALL data flows and APIs (no backend changes)
 * - Super fast perceived hydration on import (parallel search + optimistic autofill)
 * - High-contrast inputs (light bg on dark, WCAG AA)
 * - Typeahead dropdown renders above modal (z-[120])
 * - Left “Issue Map” panel: errors, warnings, duplicates -> click scroll to first
 * - Row QuickFix: minimal taps to resolve common errors (missing account, qty>0, ticker)
 * - Filters: All / Valid / Invalid / Warnings / Selected / Imported
 * - Selection persists across filters; bulk import valid/selected
 * - Sticky header + progress and KPIs
 * - No new deps beyond lucide + lodash.debounce (already present)
 */

const LS_UI = "quickpos_ui_v1";
const LS_SNAPSHOT = "quickpos_snapshot_v2";

const assetTypes = {
  security: {
    name: "Securities", icon: BarChart3, description: "Stocks, ETFs, Funds",
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

const metalSymbolByType = { Gold: "GC=F", Silver: "SI=F", Platinum: "PL=F", Copper: "HG=F", Palladium: "PA=F" };
const safeParse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

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

const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0, duration = 250 }) => {
  const [displayValue, setDisplayValue] = useState(Number(value) || 0);
  const rafRef = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = Number(displayValue) || 0;
    const to = Number(value) || 0;
    const step = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplayValue(from + (to - from) * eased);
      if (k < 1) rafRef.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]); // eslint-disable-line
  const out = decimals ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString();
  return <span>{prefix}{out}{suffix}</span>;
};

const Ring = ({ value = 0, size = 18, stroke = 3 }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circ - (clamped / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={radius} stroke="#E5E7EB" strokeWidth={stroke} fill="none"/>
      <circle cx={size/2} cy={size/2} r={radius} stroke="#10B981" strokeWidth={stroke} fill="none" strokeDasharray={circ} strokeDashoffset={offset} className="transition-[stroke-dashoffset] duration-200"/>
    </svg>
  );
};

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

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // data
  const [accounts, setAccounts] = useState([]);

  // queue / working state
  const [positions, setPositions] = useState({ security: [], cash: [], crypto: [], metal: [], otherAssets: [] });

  // ui state
  const [expanded, setExpanded] = useState(() => safeParse(localStorage.getItem(LS_UI)) || { security: true, crypto: true, metal: true, cash: false, otherAssets: false });
  const [showValues, setShowValues] = useState(true);
  const [filter, setFilter] = useState("all"); // all|valid|invalid|warnings|selected|processed
  const [focusedCell, setFocusedCell] = useState(null);

  // selection + progress
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(new Set());
  const [processed, setProcessed] = useState(new Set());
  const [importResults, setImportResults] = useState(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // search
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [activeSuggestIndex, setActiveSuggestIndex] = useState({});

  const cellRefs = useRef({}); // {type: {posId: {fieldKey: ref}}}
  const issuesPanelRef = useRef(null);

  // load accounts & seeds
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
    setPositions(castSeeds(seedPositions || snapshot?.positions));

    setSelected(new Set());
    setProcessed(new Set());
    setImporting(new Set());
    setImportResults(new Map());
    setFilter("all");

    // fast hydration kickoff (deferred to allow first paint)
    const data = castSeeds(seedPositions || snapshot?.positions);
    setTimeout(() => autoHydrateSeededPrices(data), 60);
  }, [isOpen, seedPositions]);

  useEffect(() => {
    localStorage.setItem(LS_UI, JSON.stringify(expanded));
    localStorage.setItem(LS_SNAPSHOT, JSON.stringify({ positions }));
  }, [expanded, positions]);

  // derived
  const dedupeMap = useMemo(() => {
    const counts = new Map();
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((p) => counts.set(dupKey(type, p), (counts.get(dupKey(type, p)) || 0) + 1));
    });
    return counts;
  }, [positions]);

  const stats = useMemo(() => {
    let total = 0, valid = 0, invalid = 0, selectedCt = 0, importingCt = 0, processedCt = 0, valueSum = 0, costSum = 0, warnings = 0;
    const byType = {};
    const errorSummary = {};
    Object.keys(assetTypes).forEach(t => { byType[t] = { count: 0, valid: 0, invalid: 0, processed: 0, value: 0, cost: 0, warnings: 0 }; errorSummary[t] = []; });

    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((pos) => {
        total++;
        const key = `${type}-${pos.id}`;
        const isSel = selected.has(key);
        const isImp = importing.has(key);
        const isProc = processed.has(key);

        if (isSel) selectedCt++;
        if (isImp) importingCt++;
        if (isProc) { processedCt++; byType[type].processed++; return; }

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
    return { total, valid, invalid, selectedCt, importingCt, processedCt, valueSum, costSum, totalPerf, warnings, byType, errorSummary };
  }, [positions, selected, importing, processed, dedupeMap]);

  // ——— seeds/validation ———
  function castSeeds(seeds) {
    const empty = { security: [], cash: [], crypto: [], metal: [], otherAssets: [] };
    if (!seeds) return empty;

    const push = (acc, list, type) => {
      (list || []).forEach(r => {
        const data = r?.data ?? r;
        acc[type].push({
          id: r?.id ?? `${type}-${Math.random().toString(36).slice(2)}`,
          type,
          data,
          errors: r?.errors ?? {},
          isNew: true,
        });
      });
    };

    if (Array.isArray(seeds)) {
      const out = { ...empty };
      seeds.forEach(r => {
        const t = inferType(r);
        push(out, [{ ...r, type: t }], t);
      });
      return out;
    }

    const out = { ...empty };
    push(out, seeds.security, "security");
    push(out, seeds.cash, "cash");
    push(out, seeds.crypto, "crypto");
    push(out, seeds.metal, "metal");
    push(out, seeds.otherAssets, "otherAssets");
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

    if (type !== "otherAssets" && !d.account_id) errs.account_id = "Required";
    if (type === "security") {
      if (!d.ticker) errs.ticker = "Required";
      if (!(Number(d.shares) > 0)) errs.shares = "> 0";
      if (!(Number(d.cost_basis) > 0 || Number(d.price) > 0)) errs.cost_basis = "Cost or price";
    }
    if (type === "crypto") {
      if (!d.symbol) errs.symbol = "Required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "> 0";
      if (!(d.purchase_price == null || Number(d.purchase_price) >= 0)) errs.purchase_price = "Invalid";
    }
    if (type === "cash") {
      if (!d.cash_type) errs.cash_type = "Required";
      if (!(Number(d.amount) >= 0)) errs.amount = "≥ 0";
    }
    if (type === "metal") {
      if (!d.metal_type) errs.metal_type = "Required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "> 0";
      if (!(d.purchase_price == null || Number(d.purchase_price) >= 0)) errs.purchase_price = "Invalid";
    }
    if (type === "otherAssets") {
      if (!d.asset_name) errs.asset_name = "Required";
      if (!d.asset_type) errs.asset_type = "Required";
      if (!(Number(d.current_value) >= 0)) errs.current_value = "Required";
    }

    pos.errors = errs;
    return Object.keys(errs).length === 0;
  }

  // ——— search / suggestions ———
  const debouncedSearch = useCallback(debounce(async (query, assetType, positionId) => {
    const key = `${assetType}-${positionId}`;
    if (!query || String(query).trim().length < 1) {
      setSearchResults(prev => ({ ...prev, [key]: [] }));
      return;
    }
    setIsSearching(prev => ({ ...prev, [key]: true }));
    try {
      let results = [];
      const sec = await searchSecurities(query);
      if (Array.isArray(sec)) results = results.concat(sec);
      if (assetType === "metal" || /[=]F$/.test(query)) {
        const fx = await searchFXAssets(query);
        if (Array.isArray(fx)) results = results.concat(fx);
      }
      let filtered = (results || []).filter(Boolean);
      if (assetType === "security") filtered = filtered.filter(r => r.asset_type === "security" || r.asset_type === "index");
      if (assetType === "crypto") filtered = filtered.filter(r => r.asset_type === "crypto");
      if (assetType === "metal") filtered = filtered.filter(r => r.asset_type === "metal" || r.asset_type === "commodity" || /F$/.test(r?.ticker || ""));
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
  }, 200), []);

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
        const next = { ...pos, data: d, errors: { ...pos.errors } };
        validatePosition(assetType, next);
        return next;
      })
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
    const slice = work.slice(0, 60);
    const results = await runPool(slice, 5, async (item) => {
      try {
        let results = [];
        const sec = await searchSecurities(item.q);
        if (Array.isArray(sec)) results = results.concat(sec);
        if (item.type === "metal" || /[=]F$/.test(item.q)) {
          const fx = await searchFXAssets(item.q);
          if (Array.isArray(fx)) results = results.concat(fx);
        }
        let filtered = (results || []).filter(Boolean);
        if (item.type === "security") filtered = filtered.filter(x => x.asset_type === "security" || x.asset_type === "index");
        if (item.type === "crypto") filtered = filtered.filter(x => x.asset_type === "crypto");
        if (item.type === "metal") filtered = filtered.filter(x => x.asset_type === "metal" || x.asset_type === "commodity" || /F$/.test(x?.ticker || ""));
        const exact = filtered.find(x => String(x.ticker || x.symbol || "").toUpperCase() === String(item.q).toUpperCase());
        const chosen = exact || filtered[0];
        return chosen ? { ...item, chosen } : null;
      } catch {
        return null;
      }
    });
    for (const hit of results) if (hit?.chosen) handleSelectSecurity(hit.type, hit.id, hit.chosen);
  };

  // selection
  const toggleSelect = (type, id, checked) => {
    const k = `${type}-${id}`;
    const next = new Set(selected);
    if (checked) next.add(k); else next.delete(k);
    setSelected(next);
  };

  const selectAllFiltered = (type, arr) => {
    const next = new Set(selected);
    arr.forEach(p => { const k = `${type}-${p.id}`; if (!processed.has(k)) next.add(k); });
    setSelected(next);
  };

  const deselectAllFiltered = (type, arr) => {
    const next = new Set(selected);
    arr.forEach(p => next.delete(`${type}-${p.id}`));
    setSelected(next);
  };

  // mutations
  const addRow = (type) => {
    const defaults = {};
    assetTypes[type].fields.forEach(f => { if (f.default !== undefined) defaults[f.key] = f.default; });
    if (type === "cash") defaults.interest_period = "annually";
    const row = { id: `${type}-${Math.random().toString(36).slice(2)}`, type, data: defaults, errors: {}, isNew: true };
    setPositions(prev => ({ ...prev, [type]: [...prev[type], row] }));
    if (!expanded[type]) setExpanded(prev => ({ ...prev, [type]: true }));
  };

  const updateCell = (type, id, field, value) => {
    setPositions(prev => ({
      ...prev,
      [type]: prev[type].map(pos => {
        if (pos.id !== id) return pos;
        const cfg = assetTypes[type].fields.find(f => f.key === field);
        let v = value;
        if (cfg?.transform === "uppercase" && typeof v === "string") v = v.toUpperCase();

        if (type === "metal" && field === "metal_type" && v) {
          const opt = cfg?.options?.find(o => o.value === v);
          const d = { ...pos.data, metal_type: v, symbol: opt?.symbol, name: `${v} Futures` };
          if (opt?.symbol) debouncedSearch(opt.symbol, type, id);
          const nx = { ...pos, data: d, errors: { ...pos.errors } };
          validatePosition(type, nx);
          return nx;
        }

        if (cfg?.searchable) debouncedSearch(v, type, id);

        const nx = { ...pos, data: { ...pos.data, [field]: cfg?.type === "number" ? (v === "" ? "" : Number(v)) : v }, errors: { ...pos.errors } };
        validatePosition(type, nx);
        return nx;
      }),
    }));
  };

  const duplicateRow = (type, id) => {
    setPositions(prev => {
      const idx = prev[type].findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const base = prev[type][idx];
      const clone = { ...base, id: `${type}-${Math.random().toString(36).slice(2)}`, isNew: true };
      return { ...prev, [type]: [...prev[type].slice(0, idx + 1), clone, ...prev[type].slice(idx + 1)] };
    });
  };

  const deleteRow = (type, id) => {
    setPositions(prev => ({ ...prev, [type]: prev[type].filter(p => p.id !== id) }));
    const k = `${type}-${id}`;
    setSelected(prev => { const n = new Set(prev); n.delete(k); return n; });
  };

  // filters
  const getFiltered = (type) => {
    const arr = positions[type] || [];
    if (filter === "processed") return arr.filter(p => processed.has(`${type}-${p.id}`));
    if (filter === "selected") return arr.filter(p => selected.has(`${type}-${p.id}`));
    if (filter === "warnings") return arr.filter(p => dedupeMap.get(dupKey(type, p)) > 1 && !processed.has(`${type}-${p.id}`));
    if (filter === "valid") return arr.filter(p => validatePosition(type, p) && !processed.has(`${type}-${p.id}`));
    if (filter === "invalid") return arr.filter(p => !validatePosition(type, p) && !processed.has(`${type}-${p.id}`));
    return arr;
  };

  // import
  const submitValid = async () => {
    if (stats.valid === 0) return;
    setIsSubmitting(true);
    const jobs = [];
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach(pos => {
        const k = `${type}-${pos.id}`;
        if (processed.has(k)) return;
        if (validatePosition(type, pos)) jobs.push({ type, pos });
      });
    });
    await importWithProgress(jobs);
    setIsSubmitting(false);
  };

  const submitSelected = async () => {
    if (!selected.size) return;
    setIsSubmitting(true);
    const list = [];
    selected.forEach(k => {
      const [type, id] = k.split("-");
      const pos = positions[type]?.find(p => String(p.id) === id);
      if (!pos) return;
      if (processed.has(k)) return;
      if (validatePosition(type, pos)) list.push({ type, pos });
    });
    if (!list.length) { setIsSubmitting(false); return; }
    await importWithProgress(list);
    setIsSubmitting(false);
  };

  async function importWithProgress(jobs) {
    const success = [];
    const worker = async ({ type, pos }) => {
      const k = `${type}-${pos.id}`;
      setImporting(prev => { const n = new Set(prev); n.add(k); return n; });

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

        setProcessed(prev => { const n = new Set(prev); n.add(k); return n; });
        setImportResults(prev => new Map(prev).set(k, { status: "success", position: pos }));
        success.push({ type, pos });
      } catch (e) {
        console.error(`Error adding ${type} position:`, e);
        setImportResults(prev => new Map(prev).set(k, { status: "error", error: e?.message, position: pos }));
      } finally {
        setImporting(prev => { const n = new Set(prev); n.delete(k); return n; });
      }
    };

    await runPool(jobs, 5, worker);

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

  // keyboard helpers
  const FIELD_ORDER = useMemo(() => ({
    security: assetTypes.security.fields.map(f => f.key),
    cash: assetTypes.cash.fields.map(f => f.key),
    crypto: assetTypes.crypto.fields.map(f => f.key),
    metal: assetTypes.metal.fields.map(f => f.key),
    otherAssets: assetTypes.otherAssets.fields.map(f => f.key),
  }), []);

  const getCellRef = (type, posId, key) => {
    if (!cellRefs.current[type]) cellRefs.current[type] = {};
    if (!cellRefs.current[type][posId]) cellRefs.current[type][posId] = {};
    if (!cellRefs.current[type][posId][key]) cellRefs.current[type][posId][key] = React.createRef();
    return cellRefs.current[type][posId][key];
  };

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

  // UI helpers
  const filterDefs = [
    { key: "all", label: "All", count: stats.total, icon: Package2 },
    { key: "valid", label: "Valid", count: stats.valid, icon: PackageCheck },
    { key: "invalid", label: "Invalid", count: stats.invalid, icon: PackageX },
    { key: "warnings", label: "Warnings", count: stats.warnings, icon: AlertTriangle },
    { key: "selected", label: "Selected", count: stats.selectedCt, icon: CheckSquare },
    { key: "processed", label: "Imported", count: stats.processedCt, icon: CheckCircle },
  ];

  const scrollToRow = (type, id) => {
    const el = document.querySelector(`[data-row="${type}-${id}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  // left issue panel
  const IssuePanel = () => {
    const items = [];
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach(p => {
        const k = `${type}-${p.id}`;
        if (processed.has(k)) return;
        const hasErrors = Object.values(p.errors || {}).some(Boolean);
        const dup = dedupeMap.get(dupKey(type, p)) > 1;
        if (hasErrors || dup) {
          items.push({
            key: k,
            type,
            id: p.id,
            dup,
            errs: Object.keys(p.errors || {}).filter(e => p.errors[e]),
          });
        }
      });
    });

    if (!items.length) return (
      <div className="text-xs text-gray-500 flex items-center gap-2 px-2 py-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/> No issues
      </div>
    );

    return (
      <div className="max-h-56 overflow-auto pr-1">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => scrollToRow(it.type, it.id)}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Jump to row"
          >
            <div className="text-[11px] text-gray-600 flex items-center gap-2">
              {it.dup && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3"/>Dup</span>}
              {it.errs?.length ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800"><Bug className="w-3 h-3"/>{it.errs.length} err</span> : null}
            </div>
            <div className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{it.key}</div>
          </button>
        ))}
      </div>
    );
  };

  const Stat = ({ title, value, icon: Icon, tone="gray", sub }) => {
    const tones = {
      gray: ["text-gray-700", "text-gray-400"],
      blue: ["text-blue-700", "text-blue-400"],
      green: ["text-green-700", "text-green-400"],
      red: ["text-rose-700", "text-rose-400"],
      amber: ["text-amber-700", "text-amber-400"],
      emerald: ["text-emerald-700", "text-emerald-400"],
      purple: ["text-purple-700", "text-purple-400"],
    }[tone] || ["text-gray-700", "text-gray-400"];
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-lg font-black ${tones[0]}`}>{value}</div>
            <div className={`text-[11px] ${tones[1]} uppercase tracking-wide`}>{title}</div>
            {sub && <div className="mt-1 text-xs">{sub}</div>}
          </div>
          <Icon className={`w-7 h-7 ${tones[1]}`} />
        </div>
      </div>
    );
  };

  // suggest dropdown
  const Suggest = ({ assetType, positionId }) => {
    const key = `${assetType}-${positionId}`;
    const items = searchResults[key] || [];
    if (!items.length) return null;
    const idx = activeSuggestIndex[key] ?? 0;

    return (
      <div
        className="absolute z-[120] mt-1 w-[28rem] max-w-[80vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl"
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
                onMouseDown={(e) => { e.preventDefault(); handleSelectSecurity(assetType, positionId, it); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 ${active ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {(it.ticker || it.symbol || "").toUpperCase()} <span className="text-xs font-normal text-gray-500">• {it.asset_type}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{it.name || it.longName || ""}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {price != null && <div className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-medium">{formatCurrency(price)}</div>}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCell = (type, position, field) => {
    const value = (position.data?.[field.key] ?? "");
    const hasError = position.errors?.[field.key];
    const isProcessed = processed.has(`${type}-${position.id}`);
    const posKey = `${type}-${position.id}`;
    const isSelected = selected.has(posKey);
    const isBusy = importing.has(posKey);
    const firstKey = assetTypes[type].fields[0].key;
    const isFirst = firstKey === field.key;
    const anchorRef = getCellRef(type, position.id, field.key);

    const commonProps = {
      ref: anchorRef,
      onFocus: () => setFocusedCell({ type, posId: position.id, fieldKey: field.key }),
      onKeyDown: (e) => {
        if (field.searchable) {
          const key = `${type}-${position.id}`;
          const items = searchResults[key] || [];
          const idx = activeSuggestIndex[key] ?? 0;
          if (e.key === "ArrowDown" && items.length) { e.preventDefault(); setActiveSuggestIndex(prev => ({ ...prev, [key]: Math.min(idx + 1, items.length - 1) })); return; }
          if (e.key === "ArrowUp" && items.length) { e.preventDefault(); setActiveSuggestIndex(prev => ({ ...prev, [key]: Math.max(idx - 1, 0) })); return; }
          if (e.key === "Enter" && items.length) { e.preventDefault(); handleSelectSecurity(type, position.id, items[idx]); return; }
          if (e.key === "Escape") { setSearchResults(prev => ({ ...prev, [key]: [] })); return; }
        }
        if (e.key === "ArrowLeft") return focusSiblingCell(type, position.id, field.key, "left");
        if (e.key === "ArrowRight") return focusSiblingCell(type, position.id, field.key, "right");
      },
      disabled: field.readOnly || isProcessed,
      className: `
        w-full px-3 py-2 text-sm border rounded-lg
        bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
        transition-[border-color,box-shadow] duration-150
        focus:outline-none
        ${isProcessed ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60" :
          hasError ? "border-rose-400 bg-rose-50/40 focus:border-rose-500" :
          "border-gray-300 hover:border-gray-400 focus:border-blue-500"}
        ${field.prefix ? "pl-8" : ""} ${field.suffix ? "pr-8" : ""}
        focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]
      `,
    };

    return (
      <div className="relative">
        {/* selection & mini state (outside input for alignment) */}
        {isFirst && !isProcessed && (
          <div className="absolute -left-7 top-1/2 -translate-y-1/2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => toggleSelect(type, position.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        )}
        {field.type === "select" ? (
          field.key === "account_id" ? (
            <select
              {...commonProps}
              value={String(value || "")}
              onChange={(e) => updateCell(type, position.id, field.key, e.target.value)}
            >
              <option value="">Select account...</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
            </select>
          ) : (
            <select
              {...commonProps}
              value={String(value || "")}
              onChange={(e) => updateCell(type, position.id, field.key, e.target.value)}
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
              onChange={(e) => updateCell(type, position.id, field.key, field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
              placeholder={field.placeholder}
              onBlur={() => {
                const key = `${type}-${position.id}`;
                setTimeout(() => setSearchResults(prev => ({ ...prev, [key]: [] })), 130);
              }}
              onInput={(e) => {
                if (field.searchable) debouncedSearch(e.currentTarget.value, type, position.id);
              }}
            />
            {field.prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">{field.prefix}</span>}
            {field.suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">{field.suffix}</span>}
            {field.searchable && <Suggest assetType={type} positionId={position.id} />}
          </div>
        )}
        {hasError && <div className="absolute -bottom-4 left-0 text-[11px] text-rose-600 font-medium">{position.errors[field.key]}</div>}
        {importing.has(`${type}-${position.id}`) && !processed.has(`${type}-${position.id}`) && (
          <div className="absolute -right-6 top-1/2 -translate-y-1/2"><Ring value={66}/></div>
        )}
      </div>
    );
  };

  const renderSection = (type) => {
    const cfg = assetTypes[type];
    const all = positions[type] || [];
    const filtered = getFiltered(type);
    const isOpen = !!expanded[type];
    const Icon = cfg.icon;
    const tStats = stats.byType[type];

    const someSelected = filtered.some(p => selected.has(`${type}-${p.id}`));
    const allSelected = filtered.every(p => selected.has(`${type}-${p.id}`) || processed.has(`${type}-${p.id}`));
    const indeterminate = someSelected && !allSelected;

    if (filtered.length === 0 && filter !== "all") return null;

    return (
      <div key={type} className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div
          onClick={() => setExpanded(prev => ({ ...prev, [type]: !isOpen }))}
          className={`${isOpen ? "bg-gray-900 text-white" : "bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60"} px-4 py-3 cursor-pointer transition-colors`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-lg ${isOpen ? "bg-white/20" : "bg-gray-200 dark:bg-gray-800"}`}>
                <Icon className={`w-5 h-5 ${isOpen ? "text-white" : "text-gray-800 dark:text-gray-200"}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-base ${isOpen ? "text-white" : "text-gray-800 dark:text-gray-100"}`}>{cfg.name}</h3>
                  {all.length > 0 && (
                    <span className={`px-2 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${isOpen ? "bg-white/25 text-white" : "bg-gray-800 text-white"}`}>{all.length}</span>
                  )}
                  {filter !== "all" && filtered.length !== all.length && (
                    <span className={`px-2 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold ${isOpen ? "bg-white/30 text-white" : "bg-amber-100 text-amber-700"}`}>
                      {filtered.length} filtered
                    </span>
                  )}
                </div>
                <p className={`${isOpen ? "text-white/80" : "text-gray-500 dark:text-gray-400"} text-xs mt-0.5`}>{cfg.description}</p>
              </div>
              {/* mini t-stats */}
              {tStats && (
                <div className={`hidden md:flex items-center gap-4 text-xs ${isOpen ? "text-white/90" : "text-gray-600 dark:text-gray-300"}`}>
                  <div className="text-center"><div className="font-bold"><AnimatedNumber value={tStats.valid} /></div><div>Valid</div></div>
                  {tStats.invalid > 0 && <div className="text-center"><div className="font-bold text-rose-300"><AnimatedNumber value={tStats.invalid} /></div><div>Errors</div></div>}
                  {tStats.processed > 0 && <div className="text-center"><div className="font-bold text-emerald-300"><AnimatedNumber value={tStats.processed} /></div><div>Imported</div></div>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={(e) => { e.stopPropagation(); addRow(type); if (!isOpen) setExpanded(prev => ({ ...prev, [type]: true })); }}
                className={`${isOpen ? "bg-white/20 hover:bg-white/30 text-white" : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"} p-1.5 rounded-lg transition`}
                title={`Add ${cfg.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180 text-white" : "text-gray-400 dark:text-gray-500"}`} />
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="bg-white dark:bg-gray-950">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4"><Icon className="w-8 h-8 text-gray-700 dark:text-gray-200" /></div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{filter === "all" ? `No ${cfg.name.toLowerCase()} yet` : `No ${filter} ${cfg.name.toLowerCase()}`}</p>
                {filter === "all" && (
                  <button onClick={() => addRow(type)} className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-900 text-white hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" /> Add {cfg.name}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-950/80 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="w-8 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                            checked={allSelected}
                            onChange={(e) => e.target.checked ? selectAllFiltered(type, filtered) : deselectAllFiltered(type, filtered)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="w-10 px-2 py-3 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300">#</th>
                        {cfg.fields.map(f => (
                          <th key={f.key} className={`${f.width} px-2 py-3 text-left`}>
                            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                              {f.label}{f.required && <span className="text-rose-500">*</span>}{f.readOnly && <Info className="w-3 h-3 text-gray-400 dark:text-gray-500" title="Auto-filled" />}
                            </span>
                          </th>
                        ))}
                        <th className="w-40 px-2 py-3 text-center"><span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Row</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filtered.map((row, idx) => {
                        const k = `${type}-${row.id}`;
                        const hasErrors = Object.values(row.errors || {}).some(Boolean);
                        const dup = dedupeMap.get(dupKey(type, row)) > 1;
                        const isSel = selected.has(k);
                        const isImp = importing.has(k);
                        const isProc = processed.has(k);
                        const { value } = calcValue(type, row);
                        return (
                          <tr
                            key={row.id}
                            data-row={`${type}-${row.id}`}
                            className={`relative transition-colors ${idx % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50 dark:bg-gray-900/40"}
                            ${isProc ? "bg-emerald-50/40 dark:bg-emerald-900/20" : isImp ? "bg-amber-50/40 dark:bg-amber-900/20" : isSel ? "bg-blue-50/40 dark:bg-blue-900/20" : hasErrors ? "bg-rose-50/40 dark:bg-rose-900/20" : dup ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}
                          >
                            <td className="px-3 py-2" />
                            <td className="px-2 py-2"><span className="text-sm text-gray-500">{idx + 1}</span></td>
                            {cfg.fields.map(f => (
                              <td key={f.key} className={`${f.width} px-1 py-2 relative`}>{renderCell(type, row, f)}</td>
                            ))}
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-center gap-2">
                                {!isProc && (
                                  <>
                                    <button onClick={() => duplicateRow(type, row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950" title="Duplicate"><Repeat className="w-4 h-4"/></button>
                                    <button onClick={() => deleteRow(type, row.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950" title="Delete"><Trash2 className="w-4 h-4"/></button>
                                  </>
                                )}
                                {value > 0 && showValues && (
                                  <div className="ml-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs font-medium">{formatCurrency(value)}</div>
                                )}
                                <div className="min-w-[92px] flex items-center justify-center">
                                  {isProc ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"><CheckCircle className="w-3 h-3" /> Imported</span>
                                  ) : isImp ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"><Loader2 className="w-3 h-3 animate-spin" /> Sending</span>
                                  ) : hasErrors ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"><AlertCircle className="w-3 h-3" /> Fix</span>
                                  ) : dup ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"><AlertTriangle className="w-3 h-3" /> Review</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"><Info className="w-3 h-3" /> Ready</span>
                                  )}
                                </div>
                              </div>

                              {/* QuickFix strip */}
                              {(!isProc && (dup || Object.values(row?.errors || {}).some(Boolean))) && (
                                <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-2">
                                  <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 mb-2">
                                    <ListFilter className="w-3.5 h-3.5"/><span className="font-semibold">Quick Fix</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {row?.errors?.account_id && accounts?.[0] && (
                                      <button
                                        onClick={() => updateCell(type, row.id, "account_id", accounts[0]?.id)}
                                        className="px-2 py-1 rounded bg-white border text-xs hover:bg-gray-50"
                                      >Set first account</button>
                                    )}
                                    {row?.errors?.shares && (
                                      <button onClick={() => updateCell(type, row.id, "shares", 1)} className="px-2 py-1 rounded bg-white border text-xs hover:bg-gray-50">Shares = 1</button>
                                    )}
                                    {row?.errors?.quantity && (
                                      <button onClick={() => updateCell(type, row.id, "quantity", 1)} className="px-2 py-1 rounded bg-white border text-xs hover:bg-gray-50">Qty = 1</button>
                                    )}
                                    {row?.errors?.ticker && (
                                      <button onClick={() => {
                                        const t = String(row?.data?.name || "").split(" ")[0] || "";
                                        if (t) debouncedSearch(t, type, row.id);
                                      }} className="px-2 py-1 rounded bg-white border text-xs hover:bg-gray-50">Find ticker</button>
                                    )}
                                    {dup && <span className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">Possible duplicate</span>}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filter === "all" && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={() => addRow(type)} className="w-full py-2 px-4 border-2 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-600 flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> <span className="text-sm font-medium">Add {cfg.name}</span>
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

  // keyboard + escape
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
      if (e.key === "Backspace" && selected.size) {
        e.preventDefault();
        // bulk delete selected
        const updated = { ...positions };
        selected.forEach(k => {
          const [type, id] = k.split("-");
          updated[type] = updated[type].filter(p => String(p.id) !== id);
        });
        setPositions(updated);
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, focusedCell, selected, positions, onClose]);

  // header banner logic
  const banner = useMemo(() => {
    const items = [];
    if (stats.invalid > 0) items.push({ type: "error", title: "Fix Required", message: `${stats.invalid} row(s) need attention.`, count: stats.invalid });
    if (stats.warnings > 0) items.push({ type: "warning", title: "Potential Duplicates", message: `${stats.warnings} item(s) may be duplicates.`, count: stats.warnings });
    if (stats.importingCt > 0) items.push({ type: "processing", title: "Importing", message: `${stats.importingCt} in-flight…`, count: stats.importingCt });
    if (stats.valid > 0 && stats.importingCt === 0) items.push({ type: "info", title: "Ready to Import", message: `${stats.valid} valid item(s).`, count: stats.valid });
    if (stats.processedCt > 0) items.push({ type: "success", title: "Import Complete", message: `${stats.processedCt} imported.`, count: stats.processedCt });
    return items;
  }, [stats]);

  return (
    <FixedModal isOpen={isOpen} onClose={onClose} title="Quick Positions" size="max-w-[1800px]">
      <div className="h-[95vh] flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Sticky header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Left: Issues panel + filters */}
            <div className="col-span-12 md:col-span-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100"><AlertTriangle className="w-4 h-4"/> Review</div>
                  <button onClick={() => setFilter("invalid")} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-white border hover:bg-gray-50">
                    <Filter className="w-3 h-3"/> Focus errors
                  </button>
                </div>
                <IssuePanel />
                <div className="mt-3 flex flex-wrap gap-2">
                  {filterDefs.map(f => {
                    const Icon = f.icon;
                    const active = filter === f.key;
                    return (
                      <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`text-xs px-2 py-1 rounded border ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 hover:bg-gray-50"}`}>
                        <span className="inline-flex items-center gap-1"><Icon className="w-3 h-3"/>{f.label}</span>
                        <span className={`ml-1 inline-flex items-center justify-center px-1.5 h-5 rounded-full text-[11px] font-bold ${active ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800"} text-gray-700 dark:text-gray-200`}>{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: KPIs + actions */}
            <div className="col-span-12 md:col-span-8">
              <div className="grid grid-cols-6 gap-3 mb-3">
                <Stat title="Total" value={<AnimatedNumber value={stats.total}/>} icon={Package2} tone="blue"/>
                <Stat title="Valid" value={<AnimatedNumber value={stats.valid}/>} icon={PackageCheck} tone="green"/>
                {stats.invalid > 0 && <Stat title="Invalid" value={<AnimatedNumber value={stats.invalid}/>} icon={PackageX} tone="red"/>}
                {stats.selectedCt > 0 && <Stat title="Selected" value={<AnimatedNumber value={stats.selectedCt}/>} icon={CheckSquare} tone="purple"/>}
                {stats.processedCt > 0 && <Stat title="Imported" value={<AnimatedNumber value={stats.processedCt}/>} icon={CheckCircle} tone="emerald"/>}
                {stats.valueSum > 0 && showValues && (
                  <Stat
                    title="Value"
                    value={formatCurrency(stats.valueSum)}
                    icon={DollarSign}
                    tone="amber"
                    sub={<span className={`inline-flex items-center ${stats.totalPerf >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {stats.totalPerf >= 0 ? <TrendingUp className="w-3 h-3 mr-1"/> : <TrendingDown className="w-3 h-3 mr-1"/>}
                      {Math.abs(stats.totalPerf).toFixed(1)}%
                    </span>}
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Values:</span>
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
                    disabled={!stats.selectedCt || isSubmitting}
                    className={`px-4 py-2 text-sm rounded-lg border bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2 ${(!stats.selectedCt || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <ClipboardList className="w-4 h-4" /> Import Selected
                  </button>
                  <button
                    onClick={submitValid}
                    disabled={stats.valid === 0 || isSubmitting}
                    className={`px-6 py-2 text-sm font-semibold rounded-lg inline-flex items-center gap-2 shadow-sm hover:shadow
                    ${stats.valid === 0 || isSubmitting ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700"}`}
                  >
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><PlayCircle className="w-4 h-4" /> Import {stats.valid} Valid</>}
                  </button>
                </div>
              </div>

              {/* Banner badges */}
              <div className="mt-3 flex flex-wrap gap-2">
                {banner.map((b, i) => {
                  const tone = b.type;
                  const style = {
                    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
                    error: "bg-rose-50 text-rose-800 border-rose-200",
                    warning: "bg-amber-50 text-amber-800 border-amber-200",
                    info: "bg-blue-50 text-blue-800 border-blue-200",
                    processing: "bg-indigo-50 text-indigo-800 border-indigo-200",
                  }[tone] || "bg-gray-50 text-gray-800 border-gray-200";
                  const Icon = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info, processing: Activity }[tone] || Info;
                  return (
                    <span key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${style}`}>
                      <Icon className="w-4 h-4"/><span className="text-sm font-medium">{b.title}</span>
                      {b.count != null && <span className="text-xs font-bold">{b.count}</span>}
                      {b.message && <span className="text-xs opacity-80">• {b.message}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {Object.keys(assetTypes).map((t) => renderSection(t))}
        </div>
      </div>
    </FixedModal>
  );
};

AddQuickPositionModal.displayName = "AddQuickPositionModal";
export { AddQuickPositionModal };
export default AddQuickPositionModal;
