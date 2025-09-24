// AddQuickPositionModal — "Re-imagined One-Page with Summary"
// Notes:
// - All asset classes on a single page with collapsible sections.
// - Sticky right-side summary rail with real-time portfolio stats.
// - Integrated real-time validation and duplication warnings.
// - Preserves all core data/backend flows and methods.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FixedModal from './FixedModal';
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
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import debounce from 'lodash.debounce';
import {
  Plus, X, Check, TrendingUp, TrendingDown, Coins, DollarSign, Home, BarChart3,
  Eye, EyeOff, Save, Trash2, AlertCircle, CheckCircle, Hash, Search, ChevronDown,
  Repeat, Info, Filter, Loader2, PackageX, PackageCheck, Package2,
  ClipboardList, CheckSquare, Activity, AlertTriangle, PlayCircle, ChevronUp,
  Download, FileWarning, FileSpreadsheet, ListFilter, RotateCcw, Building,
  Briefcase
} from "lucide-react";

/* ------------------------------- Theme tokens ------------------------------- */
// Accessible dark-mode surfaces & borders
const t = {
  bg: "bg-zinc-950",
  card: "bg-zinc-900",
  cardAlt: "bg-zinc-800",
  border: "border-zinc-800",
  text: "text-zinc-100",
  subtext: "text-zinc-400",
  muted: "text-zinc-500",
  fieldBg: "bg-zinc-800",
  fieldBorder: "border-zinc-700",
  fieldFocus: "ring-2 ring-blue-500",
  badgeBlue: "bg-blue-900 text-blue-300 border-blue-700",
  badgeGreen: "bg-green-900 text-green-300 border-green-700",
  badgeRed: "bg-red-900 text-red-300 border-red-700",
  badgeAmber: "bg-amber-900 text-amber-300 border-amber-700",
};

/* ------------------------------- Small helpers ------------------------------ */

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
const LS_SNAPSHOT = "quickPosition_snapshot_v3";

function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

function extractError(err) {
  try {
    if (err?.response?.data) {
      if (typeof err.response.data === "string") return err.response.data;
      return JSON.stringify(err.response.data);
    }
    if (err?.data) return typeof err.data === "string" ? err.data : JSON.stringify(err.data);
    if (err?.message && err.message !== "[object Object]") return err.message;
    return JSON.stringify(err);
  } catch {
    return String(err ?? "Unknown error");
  }
}

function toCSV(rows) {
  const headers = ['id', 'type', 'status', 'error', 'payload'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
  return [headers.join(','), body].join('\n');
}

/* -------------------------------- Type config -------------------------------- */

const assetTypes = {
  security: {
    name: "Securities", icon: BarChart3, description: "Stocks, ETFs, Mutual Funds",
    fields: [
      { key: "ticker", label: "Ticker", type: "text", required: true, width: "w-32", placeholder: "AAPL", transform: "uppercase", searchable: true },
      { key: "name", label: "Company", type: "text", width: "w-48", readOnly: true, placeholder: "Auto-filled" },
      { key: "shares", label: "Shares", type: "number", required: true, width: "w-24", placeholder: "100", min: 0, step: 1 },
      { key: "cost_basis", label: "Cost Basis", type: "number", required: true, width: "w-28", placeholder: "140.00", prefix: "$", min: 0, step: 0.01 },
      { key: "price", label: "Current Price", type: "number", width: "w-28", placeholder: "Auto", prefix: "$", min: 0, step: 0.01, readOnly: true },
      { key: "purchase_date", label: "Purchase Date", type: "date", required: true, width: "w-40", default: new Date().toISOString().split("T")[0] },
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-52" },
    ],
  },
  cash: {
    name: "Cash", icon: DollarSign, description: "Savings, Checking, Money Market",
    fields: [
      { key: "cash_type", label: "Type", type: "select", required: true, width: "w-36", options: [
        { value: "", label: "Select..." },
        { value: "Savings", label: "💰 Savings" },
        { value: "Checking", label: "💳 Checking" },
        { value: "Money Market", label: "📊 Money Market" },
        { value: "CD", label: "🔒 CD" },
      ]},
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-52" },
      { key: "amount", label: "Amount", type: "number", required: true, width: "w-28", placeholder: "10,000", prefix: "$", min: 0 },
      { key: "interest_rate", label: "APY", type: "number", width: "w-24", placeholder: "2.5", suffix: "%", step: "0.01", min: 0, max: 100 },
      { key: "interest_period", label: "Period", type: "select", width: "w-36", options: [
        { value: "annually", label: "Annually" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
      ]},
      { key: "maturity_date", label: "Maturity", type: "date", width: "w-40" },
    ],
  },
  crypto: {
    name: "Crypto", icon: Coins, description: "Bitcoin, Ethereum, Altcoins",
    fields: [
      { key: "symbol", label: "Symbol", type: "text", required: true, width: "w-28", placeholder: "BTC", transform: "uppercase", searchable: true },
      { key: "name", label: "Name", type: "text", width: "w-48", readOnly: true, placeholder: "Auto-filled" },
      { key: "quantity", label: "Quantity", type: "number", required: true, width: "w-28", placeholder: "0.5", step: "0.00000001", min: 0 },
      { key: "purchase_price", label: "Buy Price", type: "number", required: true, width: "w-32", placeholder: "45,000", prefix: "$", min: 0 },
      { key: "current_price", label: "Current Price", type: "number", width: "w-32", placeholder: "Auto", prefix: "$", min: 0, readOnly: true },
      { key: "purchase_date", label: "Purchase Date", type: "date", required: true, width: "w-40", default: new Date().toISOString().split("T")[0] },
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-52" },
    ],
  },
  metal: {
    name: "Metals", icon: Hash, description: "Gold, Silver, Platinum",
    fields: [
      { key: "metal_type", label: "Metal", type: "select", required: true, width: "w-36", options: [
        { value: "", label: "Select..." },
        { value: "Gold", label: "🥇 Gold", symbol: "GC=F" },
        { value: "Silver", label: "🥈 Silver", symbol: "SI=F" },
        { value: "Platinum", label: "💎 Platinum", symbol: "PL=F" },
        { value: "Copper", label: "🟫 Copper", symbol: "HG=F" },
        { value: "Palladium", label: "⚪ Palladium", symbol: "PA=F" },
      ]},
      { key: "symbol", label: "Symbol", type: "text", width: "w-28", readOnly: true, placeholder: "Auto-filled" },
      { key: "name", label: "Market Name", type: "text", width: "w-48", readOnly: true, placeholder: "Auto-filled" },
      { key: "quantity", label: "Quantity", type: "number", required: true, width: "w-24", placeholder: "10", min: 0 },
      { key: "unit", label: "Unit", type: "text", width: "w-20", readOnly: true, default: "oz" },
      { key: "purchase_price", label: "Price/Unit", type: "number", required: true, width: "w-28", placeholder: "1,800", prefix: "$", min: 0 },
      { key: "current_price_per_unit", label: "Current/Unit", type: "number", width: "w-28", placeholder: "Auto", prefix: "$", min: 0, readOnly: true },
      { key: "purchase_date", label: "Purchase Date", type: "date", required: true, width: "w-40", default: new Date().toISOString().split("T")[0] },
      { key: "account_id", label: "Account", type: "select", required: true, width: "w-52" },
    ],
  },
  otherAssets: {
    name: "Other Assets", icon: Home, description: "Real Estate, Vehicles, Collectibles",
    fields: [
      { key: "asset_name", label: "Asset Name", type: "text", required: true, width: "w-56", placeholder: "123 Main St" },
      { key: "asset_type", label: "Type", type: "select", required: true, width: "w-36", options: [
        { value: "", label: "Select..." },
        { value: "real_estate", label: "🏠 Real Estate" },
        { value: "vehicle", label: "🚗 Vehicle" },
        { value: "collectible", label: "🎨 Collectible" },
        { value: "jewelry", label: "💎 Jewelry" },
        { value: "art", label: "🖼️ Art" },
        { value: "equipment", label: "🔧 Equipment" },
        { value: "other", label: "📦 Other" },
      ]},
      { key: "cost", label: "Purchase Price", type: "number", width: "w-32", placeholder: "500,000", prefix: "$", min: 0 },
      { key: "current_value", label: "Current Value", type: "number", required: true, width: "w-32", placeholder: "550,000", prefix: "$", min: 0 },
      { key: "purchase_date", label: "Purchase Date", type: "date", width: "w-40", default: new Date().toISOString().split("T")[0] },
      { key: "notes", label: "Notes", type: "text", width: "w-56", placeholder: "Additional details..." },
    ],
  },
};

const addMethods = {
  security: addSecurityPosition,
  crypto: addCryptoPosition,
  cash: addCashPosition,
  metal: addMetalPosition,
  otherAssets: addOtherAsset,
};

/* -------------------------------- Component -------------------------------- */

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // data
  const [accounts, setAccounts] = useState([]);

  // queue
  const [positions, setPositions] = useState({ security: [], cash: [], crypto: [], metal: [], otherAssets: [] });

  // ui state
  const [expandedSections, setExpandedSections] = useState(() => safeParse(localStorage.getItem(LS_UI)) || {});
  const [showValues, setShowValues] = useState(true);
  const [issuesOpen, setIssuesOpen] = useState(false);

  // select / progress
  const [processedPositions, setProcessedPositions] = useState(new Set());
  const [importResults, setImportResults] = useState(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // search/autofill
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [activeSuggestIndex, setActiveSuggestIndex] = useState({});
  const searchInputRefs = useRef({});

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
    setProcessedPositions(new Set());
    setImportResults(new Map());
  }, [isOpen, seedPositions]);

  useEffect(() => {
    localStorage.setItem(LS_UI, JSON.stringify(expandedSections));
    localStorage.setItem(LS_SNAPSHOT, JSON.stringify({ positions }));
  }, [expandedSections, positions]);

  /* --------------------------------- Derived --------------------------------- */

  const dedupeMap = useMemo(() => {
    const counts = new Map();
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((p) => {
        if (!p.id) return;
        const k = dupKey(type, p);
        counts.set(k, (counts.get(k) || 0) + 1);
      });
    });
    return counts;
  }, [positions]);

  const stats = useMemo(() => {
    let total = 0, valid = 0, invalid = 0, processed = 0, valueSum = 0, costSum = 0, warnings = 0;
    const byType = {};
    const errorSummary = {};

    Object.keys(assetTypes).forEach(tk => { byType[tk] = { count: 0, valid: 0, invalid: 0, processed: 0, value: 0, cost: 0, warnings: 0 }; errorSummary[tk] = []; });

    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((pos) => {
        if (processedPositions.has(`${type}-${pos.id}`)) {
          processed++; byType[type].processed++;
          return;
        }

        total++;
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

    const totalPerf = costSum > 0 ? ((valueSum - costSum) / costSum) * 100 : 0;
    return {
      totalPositions: total, validPositions: valid, invalidPositions: invalid,
      processedCount: processed, totalValue: valueSum, totalCost: costSum,
      totalPerformance: totalPerf, warnings, byType, errorSummary
    };
  }, [positions, processedPositions, dedupeMap]);

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
      if (!(Number(d.cost_basis) > 0)) errs.cost_basis = "Cost required";
      if (!d.purchase_date) errs.purchase_date = "Date required";
    }
    if (type === "crypto") {
      if (!d.symbol) errs.symbol = "Symbol required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "Qty > 0";
      if (!(Number(d.purchase_price) > 0)) errs.purchase_price = "Buy price required";
      if (!d.purchase_date) errs.purchase_date = "Date required";
    }
    if (type === "cash") {
      if (!d.cash_type) errs.cash_type = "Type required";
      if (!(Number(d.amount) >= 0)) errs.amount = "Amount ≥ 0";
    }
    if (type === "metal") {
      if (!d.metal_type) errs.metal_type = "Metal required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "Qty > 0";
      if (!(Number(d.purchase_price) > 0)) errs.purchase_price = "Price required";
      if (!d.purchase_date) errs.purchase_date = "Date required";
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
    if (!searchInputRefs.current[type]) searchInputRefs.current[type] = {};
    if (!searchInputRefs.current[type][posId]) searchInputRefs.current[type][posId] = {};
    if (!searchInputRefs.current[type][posId][fieldKey]) searchInputRefs.current[type][posId][fieldKey] = React.createRef();
    return searchInputRefs.current[type][posId][fieldKey];
  };

  /* --------------------------- Market Data: Search --------------------------- */

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
    }, 200),
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

        const next = { ...pos, data: d, errors: { ...pos.errors } };
        validatePosition(assetType, next);
        return next;
      }),
    }));

    setSearchResults(prev => ({ ...prev, [searchKey]: [] }));
  };


  /* --------------------------------- Mutators -------------------------------- */

  const addNewRow = (type) => {
    const defaults = {};
    assetTypes[type].fields.forEach(f => { if (f.default !== undefined) defaults[f.key] = f.default; });
    if (type === "cash") defaults.interest_period = "annually";
    const newPos = { id: Date.now() + Math.random(), type, data: defaults, errors: {}, isNew: true };
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
          const next = { ...pos, data: d, errors: { ...pos.errors } };
          validatePosition(type, next);
          return next;
        }

        if (cfg?.searchable) debouncedSearch(v, type, id);

        const next = { ...pos, data: { ...pos.data, [field]: v }, errors: { ...pos.errors } };
        validatePosition(type, next);
        return next;
      }),
    }));
  };

  const deletePosition = (type, id) => {
    setPositions(prev => ({ ...prev, [type]: prev[type].filter(p => p.id !== id) }));
  };

  const duplicateRow = (type, id) => {
    setPositions(prev => {
      const idx = prev[type].findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const base = prev[type][idx];
      const clone = { ...base, id: Date.now() + Math.random(), isNew: true };
      return { ...prev, [type]: [...prev[type].slice(0, idx + 1), clone, ...prev[type].slice(idx + 1)] };
    });
  };

  /* --------------------------------- Importing -------------------------------- */

  const handleSubmit = async () => {
    const positionsToImport = Object.values(positions).flat().filter(p => validatePosition(p.type, p) && !processedPositions.has(`${p.type}-${p.id}`));
    if (positionsToImport.length === 0) return;

    setIsSubmitting(true);
    setImportResults(new Map());

    const results = [];
    for (const pos of positionsToImport) {
      const k = `${pos.type}-${pos.id}`;
      try {
        const addFn = addMethods[pos.type];
        if (!addFn) throw new Error(`Unknown asset type: ${pos.type}`);
        const payload = pos.data;
        if (pos.type === "metal") {
          payload.purchase_price_per_unit = payload.purchase_price;
          delete payload.purchase_price;
        }

        await addFn(payload);
        results.push({ id: k, type: pos.type, status: 'success', payload: pos.data });
        setProcessedPositions(prev => new Set(prev).add(k));
      } catch (error) {
        results.push({ id: k, type: pos.type, status: 'failed', payload: pos.data, error: extractError(error) });
      }
    }
    setImportResults(new Map(results.map(r => [r.id, r])));
    setIsSubmitting(false);
    onPositionsSaved(results.filter(r => r.status === 'success'));
  };

  const handleClose = () => {
    const hasUnsaved = Object.values(positions).flat().length > 0;
    if (hasUnsaved && window.confirm("You have unsaved positions. Do you want to save them for later?")) {
      localStorage.setItem(LS_SNAPSHOT, JSON.stringify({ positions }));
    } else {
      localStorage.removeItem(LS_SNAPSHOT);
    }
    onClose();
  };


  const renderSection = (type) => {
    const { name, icon: Icon, description, fields } = assetTypes[type];
    const assetList = positions[type] || [];
    const isExpanded = expandedSections[type];
    const isProcessed = assetList.every(p => processedPositions.has(`${type}-${p.id}`));

    return (
      <div key={type} className={`mb-6 ${t.card} border ${t.border} rounded-lg overflow-hidden`}>
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, [type]: !isExpanded }))}
          className={`w-full flex items-center justify-between p-4 focus:outline-none transition-all duration-300 ${t.text} ${t.cardAlt}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${t.bg} border ${t.border}`}>
              <Icon className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${t.badgeBlue}`}>
              {assetList.length}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded && (
          <div className="p-4 border-t border-zinc-800">
            {assetList.length === 0 && (
              <div className={`p-6 text-center ${t.card} rounded-lg ${t.border} border`}>
                <p className={`text-sm ${t.subtext}`}>No {name.toLowerCase()} added yet.</p>
              </div>
            )}
            {assetList.length > 0 && (
              <div className="overflow-x-auto pb-4 -mb-4">
                <table className="w-full text-left">
                  <thead className={`text-xs uppercase ${t.subtext}`}>
                    <tr>
                      <th className="px-2 py-2 font-medium"></th>
                      {fields.map(field => (
                        <th key={field.key} className="px-2 py-2 font-medium">{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assetList.map((pos, index) => {
                      const k = `${type}-${pos.id}`;
                      const isProcessed = processedPositions.has(k);
                      const isFailed = importResults.get(k)?.status === 'failed';
                      const isDuplicate = dedupeMap.get(dupKey(type, pos)) > 1;
                      const hasErrors = Object.keys(pos.errors).length > 0;
                      const rowClass = isProcessed ? 'opacity-50' : isFailed ? `${t.badgeRed}` : hasErrors ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent';

                      return (
                        <tr key={pos.id} className={`group ${t.cardAlt} hover:${t.card} transition-colors duration-200 ${rowClass}`}>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {isProcessed && <CheckCircle className="w-4 h-4 text-green-500" title="Imported" />}
                              {isFailed && <AlertCircle className="w-4 h-4 text-red-500" title={`Failed: ${importResults.get(k)?.error}`} />}
                              {isDuplicate && !isProcessed && <RotateCcw className="w-4 h-4 text-amber-500" title="Possible Duplicate" />}
                              {!isProcessed && !isFailed && (
                                <div className="flex space-x-1">
                                  <button onClick={() => deletePosition(type, pos.id)} className={`text-${t.subtext} hover:text-red-500`}>
                                    <Trash2 className="w-4 h-4" title="Remove row" />
                                  </button>
                                  <button onClick={() => duplicateRow(type, pos.id)} className={`text-${t.subtext} hover:text-blue-500`}>
                                    <Copy className="w-4 h-4" title="Duplicate row" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          {fields.map(field => {
                            const error = pos.errors[field.key];
                            const searchKey = field.searchable ? `${type}-${pos.id}` : null;
                            const suggestions = searchResults[searchKey] || [];

                            return (
                              <td key={field.key} className="px-2 py-3 relative">
                                <div className="flex flex-col">
                                  {field.type === "select" ? (
                                    <select
                                      value={pos.data[field.key] || ''}
                                      onChange={(e) => updatePosition(type, pos.id, field.key, e.target.value)}
                                      disabled={isProcessed}
                                      className={`
                                        w-full px-2 py-1 rounded-md text-sm ${t.text} ${t.fieldBg} ${t.fieldBorder} border
                                        focus:outline-none ${t.fieldFocus} disabled:opacity-50 disabled:cursor-not-allowed
                                      `}
                                    >
                                      <option value="">Select...</option>
                                      {(field.key === 'account_id' ? accounts : field.options).map(opt => (
                                        <option key={opt.id || opt.value} value={opt.id || opt.value}>{opt.account_name || opt.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="relative">
                                      <input
                                        type={field.type}
                                        value={pos.data[field.key] || ''}
                                        onChange={(e) => updatePosition(type, pos.id, field.key, e.target.value)}
                                        ref={field.searchable ? getCellRef(type, pos.id, field.key) : null}
                                        readOnly={field.readOnly || isProcessed}
                                        placeholder={field.placeholder}
                                        min={field.min}
                                        step={field.step}
                                        className={`
                                          w-full px-2 py-1 rounded-md text-sm ${t.text} ${t.fieldBg} ${t.fieldBorder} border
                                          focus:outline-none ${t.fieldFocus}
                                          ${field.readOnly || isProcessed ? 'opacity-70 cursor-not-allowed' : ''}
                                        `}
                                      />
                                      {field.prefix && <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${t.muted} pointer-events-none`}>{field.prefix}</span>}
                                      {field.suffix && <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${t.muted} pointer-events-none`}>{field.suffix}</span>}
                                      {field.searchable && suggestions.length > 0 && (
                                        <ul className={`absolute z-10 w-full ${t.card} ${t.border} border rounded-lg shadow-xl mt-1 max-h-64 overflow-y-auto`}>
                                          {suggestions.map((s, i) => (
                                            <li
                                              key={s.symbol || s.ticker}
                                              onClick={() => handleSelectSecurity(type, pos.id, s)}
                                              className={`
                                                px-4 py-2 cursor-pointer hover:${t.cardAlt} transition
                                                ${i % 2 === 0 ? '' : t.cardAlt}
                                              `}
                                            >
                                              <div className={`font-medium ${t.text}`}>{s.name || s.longName}</div>
                                              <div className={`text-xs ${t.subtext}`}>{s.ticker || s.symbol} - {formatCurrency(getQuotePrice(s))}</div>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                                  {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => addNewRow(type)}
                className={`px-4 py-2 text-sm rounded-lg border ${t.border} ${t.text} hover:bg-zinc-800 transition`}
              >
                <Plus className="w-4 h-4 inline-block mr-2" />
                Add Row
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const allAssetTypes = Object.keys(assetTypes);
  const validCount = stats.validPositions;
  const invalidCount = stats.invalidPositions;
  const processedCount = stats.processedCount;
  const toImportCount = validCount + invalidCount;
  const progressPercent = toImportCount > 0 ? (processedCount / (processedCount + toImportCount)) * 100 : 0;
  const hasUnsavedChanges = toImportCount > 0;

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Quick Positions"
      size="6xl"
      className={`${t.bg} ${t.text}`}
    >
      <div className="flex h-full">
        {/* Main Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {allAssetTypes.map(renderSection)}
        </div>

        {/* Right Sidebar */}
        <div className={`w-80 border-l ${t.border} p-6 sticky top-0 h-full overflow-y-auto`}>
          <div className="flex items-center justify-between mb-6">
            <h4 className={`text-sm font-semibold uppercase tracking-wide ${t.subtext}`}>Summary</h4>
            <button onClick={() => setShowValues(!showValues)} className={`text-xs ${t.subtext} hover:text-blue-500`}>
              {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className={`p-4 rounded-lg ${t.cardAlt} border ${t.border} mb-6`}>
            <div className={`text-sm font-medium ${t.subtext}`}>Total Positions</div>
            <div className={`text-xl font-bold ${t.text}`}>{stats.totalPositions + stats.processedCount}</div>
            <div className="flex items-center text-xs mt-1">
              <span className="text-green-500 flex items-center mr-2"><CheckCircle className="w-3 h-3 mr-1" />{stats.validPositions} Valid</span>
              <span className="text-red-500 flex items-center mr-2"><AlertCircle className="w-3 h-3 mr-1" />{stats.invalidPositions} Invalid</span>
              <span className="text-amber-500 flex items-center"><RotateCcw className="w-3 h-3 mr-1" />{stats.warnings} Dupes</span>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${t.cardAlt} border ${t.border} mb-6`}>
            <div className={`text-sm font-medium ${t.subtext}`}>Total Value</div>
            <div className={`text-xl font-bold ${t.text}`}>{showValues ? formatCurrency(stats.totalValue) : '***'}</div>
            <div className={`text-sm font-medium ${t.subtext} mt-2`}>Total Cost</div>
            <div className={`text-md ${t.text}`}>{showValues ? formatCurrency(stats.totalCost) : '***'}</div>
            <div className={`flex items-center mt-2 font-semibold text-sm ${stats.totalPerformance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.totalPerformance >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {formatPercentage(stats.totalPerformance / 100)}
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            {Object.entries(stats.byType).map(([type, s]) => (
              <div key={type} className="flex justify-between items-center text-sm">
                <span className={`${t.subtext}`}>{assetTypes[type].name}</span>
                <div className="flex space-x-2 items-center">
                  {s.warnings > 0 && <span className={`text-xs ${t.badgeAmber}`}>{s.warnings} Dupes</span>}
                  {s.invalid > 0 && <span className={`text-xs ${t.badgeRed}`}>{s.invalid} Invalid</span>}
                  <span className={`text-xs font-semibold ${t.text}`}>{s.count}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-700">
            <h4 className={`text-sm font-semibold uppercase tracking-wide ${t.subtext} mb-4`}>Import Results</h4>
            {isSubmitting && (
              <div className={`flex items-center justify-center p-4 rounded-lg ${t.cardAlt} ${t.text}`}>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <p className="text-sm">Importing...</p>
              </div>
            )}
            {!isSubmitting && importResults.size === 0 && (
              <p className={`text-xs ${t.muted}`}>No import attempts yet.</p>
            )}
            <ul className="space-y-2">
              {[...importResults.values()].map(res => (
                <li key={res.id} className={`p-3 rounded-lg flex items-center space-x-3 text-sm
                  ${res.status === 'success' ? `${t.badgeGreen}` : `${t.badgeRed}`}
                `}>
                  {res.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span className="flex-1">
                    {assetTypes[res.type].name} ({res.payload.ticker || res.payload.symbol || res.payload.asset_name})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={`p-4 border-t ${t.border} flex justify-between items-center`}>
        <div className="text-sm">
          <span className={`${t.subtext}`}>Positions to import: </span>
          <span className={`font-semibold ${t.text}`}>{toImportCount}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={validCount === 0 || isSubmitting}
          className={`
            px-6 py-3 rounded-lg font-semibold text-sm transition-all
            ${validCount > 0 && !isSubmitting ? `bg-blue-600 hover:bg-blue-700 text-white shadow-lg` : `bg-zinc-700 text-zinc-500 cursor-not-allowed`}
          `}
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : `Import All Valid (${validCount})`}
        </button>
      </div>
    </FixedModal>
  );
};

export { AddQuickPositionModal };