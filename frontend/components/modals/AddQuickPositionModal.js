// AddQuickPositionModal — “Reimagined High-Contrast + Summary Rail + Issues Drawer”
// Notes:
// - Preserves data/backend flows: fetchAllAccounts, searchSecurities/searchFXAssets, add*Position fns, pooling, auto-hydrate
// - Stronger dark-mode contrast & spacing
// - Right-side sticky summary per asset type (counts, value/cost, preview list)
// - Issues Drawer with server-side error messages (no more [object Object])
// - CSV export of failures
// - No dropped features; only UI reshaping + better observability

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
  Download, FileWarning, FileSpreadsheet, ListFilter
} from "lucide-react";

/* ------------------------------- Theme tokens ------------------------------- */
// Accessible dark-mode surfaces & borders
const t = {
  bg: "bg-[#0b0f19]",           // page canvas
  card: "bg-[#0f1629]",         // cards/rows
  cardAlt: "bg-[#121a31]",      // zebra
  border: "border-[#1f2a44]",   // subtle but visible
  text: "text-[#e6ecff]",       // main text
  subtext: "text-[#b3c2ff]",    // secondary
  muted: "text-[#87a0ff]",
  fieldBg: "bg-[#0b1326]",      // inputs
  fieldBorder: "border-[#30406b]",
  fieldFocus: "ring-2 ring-[#6aa0ff] ring-offset-0",
  badgeBlue: "bg-[#16345e] text-[#a7c8ff] border-[#2a5591]",
  badgeGreen: "bg-[#0f3a2a] text-[#9ee6c6] border-[#1c6a52]",
  badgeRed: "bg-[#3b121d] text-[#ffb9c7] border-[#6a1f33]",
  badgeAmber: "bg-[#3a2a0f] text-[#ffd699] border-[#6a4f1c]",
  focusShadow: "focus:shadow-[0_0_0_3px_rgba(106,160,255,0.25)]",
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
const LS_SNAPSHOT = "quickPosition_snapshot_v2";

function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

function extractError(err) {
  try {
    // Axios-style
    if (err?.response?.data) {
      if (typeof err.response.data === "string") return err.response.data;
      return JSON.stringify(err.response.data);
    }
    // Fetch-style
    if (err?.data) return typeof err.data === "string" ? err.data : JSON.stringify(err.data);
    if (err?.message && err.message !== "[object Object]") return err.message;
    return JSON.stringify(err);
  } catch {
    return String(err ?? "Unknown error");
  }
}

function toCSV(rows) {
  const headers = Object.keys(rows[0] || { id: "", type: "", error: "", payload: "" });
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
  return [headers.join(","), body].join("\n");
}

/* -------------------------------- Type config -------------------------------- */

const assetTypes = {
  security: {
    name: "Securities", icon: BarChart3, description: "Stocks, ETFs, Mutual Funds",
    fields: [
      { key: "ticker", label: "Ticker", type: "text", required: true, width: "w-28", placeholder: "AAPL", transform: "uppercase", searchable: true },
      { key: "name", label: "Company", type: "text", width: "w-56", readOnly: true, placeholder: "Auto-filled" },
      { key: "shares", label: "Shares", type: "number", required: true, width: "w-24", placeholder: "100", min: 0, step: 1 },
      { key: "price", label: "Current Price", type: "number", width: "w-28", placeholder: "Auto", prefix: "$", min: 0, step: 0.01, readOnly: true },
      { key: "cost_basis", label: "Cost Basis", type: "number", required: true, width: "w-28", placeholder: "140.00", prefix: "$", min: 0, step: 0.01 },
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
      { key: "name", label: "Name", type: "text", width: "w-56", readOnly: true, placeholder: "Auto-filled" },
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
      { key: "name", label: "Market Name", type: "text", width: "w-56", readOnly: true, placeholder: "Auto-filled" },
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

/* -------------------------------- Component -------------------------------- */

const AddQuickPositionModal = ({ isOpen, onClose, onPositionsSaved, seedPositions }) => {
  // data
  const [accounts, setAccounts] = useState([]);

  // queue
  const [positions, setPositions] = useState({ security: [], cash: [], crypto: [], metal: [], otherAssets: [] });

  // ui state
  const [expandedSections, setExpandedSections] = useState(() => safeParse(localStorage.getItem(LS_UI)) || {});
  const [showValues, setShowValues] = useState(true);
  const [filterType, setFilterType] = useState("all"); // all | valid | invalid | selected | processed | warnings
  const [issuesOpen, setIssuesOpen] = useState(false);

  // select / progress
  const [selectedPositions, setSelectedPositions] = useState(new Set());
  const [importingPositions, setImportingPositions] = useState(new Set());
  const [processedPositions, setProcessedPositions] = useState(new Set());
  const [importResults, setImportResults] = useState(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // search/autofill
  const [searchResults, setSearchResults] = useState({});
  const [isSearching, setIsSearching] = useState({});
  const [activeSuggestIndex, setActiveSuggestIndex] = useState({});

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

    // hidden auto-hydration
    setTimeout(() => autoHydrateSeededPrices(normalized), 40);
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

    Object.keys(assetTypes).forEach(tk => { byType[tk] = { count: 0, valid: 0, invalid: 0, processed: 0, value: 0, cost: 0, warnings: 0 }; errorSummary[tk] = []; });

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

    const totalPerf = costSum > 0 ? ((valueSum - costSum) / costSum) * 100 : 0;
    return {
      totalPositions: total, validPositions: valid, invalidPositions: invalid,
      selectedCount: selected, importingCount: importing, processedCount: processed,
      totalValue: valueSum, totalCost: costSum, totalPerformance: totalPerf,
      warnings, byType, errorSummary
    };
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
      if (!d.purchase_date) errs.purchase_date = "Date required";
    }
    if (type === "crypto") {
      if (!d.symbol) errs.symbol = "Symbol required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "Qty > 0";
      if (!(d.purchase_price == null || Number(d.purchase_price) >= 0)) errs.purchase_price = "Invalid";
      if (!d.purchase_date) errs.purchase_date = "Date required";
    }
    if (type === "cash") {
      if (!d.cash_type) errs.cash_type = "Type required";
      if (!(Number(d.amount) >= 0)) errs.amount = "Amount ≥ 0";
    }
    if (type === "metal") {
      if (!d.metal_type) errs.metal_type = "Metal required";
      if (!(Number(d.quantity) > 0)) errs.quantity = "Qty > 0";
      if (!(d.purchase_price == null || Number(d.purchase_price) >= 0)) errs.purchase_price = "Invalid";
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

  /* --------------------------- Hidden auto-hydration -------------------------- */

  async function runPool(items, n, worker) {
    const queue = items.slice();
    const out = [];
    async function exec() { while (queue.length) { const item = queue.shift(); out.push(await worker(item)); } }
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
    const slice = work.slice(0, 50);
    const results = await runPool(slice, 4, async (item) => {
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

    for (const hit of results) {
      if (hit?.chosen) handleSelectSecurity(hit.type, hit.id, hit.chosen);
    }
  };

  /* -------------------------------- Selection -------------------------------- */

  const handleSelectPosition = (type, id, checked) => {
    const key = `${type}-${id}`;
    const next = new Set(selectedPositions);
    if (checked) next.add(key); else next.delete(key);
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
      const clone = { ...base, id: Date.now() + Math.random(), isNew: true };
      return { ...prev, [type]: [...prev[type].slice(0, idx + 1), clone, ...prev[type].slice(idx + 1)] };
    });
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
    const failures = [];

    const toProcess = batches.slice();

    await runPool(toProcess, 4, async ({ type, pos }) => {
      const k = `${type}-${pos.id}`;
      setImportingPositions(prev => { const n = new Set(prev); n.add(k); return n; });

      const clean = {};
      Object.entries(pos.data || {}).forEach(([key, val]) => {
        if (val !== "" && val !== null && val !== undefined) clean[key] = val;
      });
      // Normalize cash APY to decimal
      if (type === "cash" && clean.interest_rate != null) {
        const n = Number(clean.interest_rate);
        clean.interest_rate = Number.isFinite(n) ? n / 100 : null;
      }

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
          const cashData = { ...clean, name: clean.cash_type };
          await addCashPosition(clean.account_id, cashData);
        }

        setProcessedPositions(prev => { const n = new Set(prev); n.add(k); return n; });
        setImportResults(prev => new Map(prev).set(k, { status: "success", position: pos }));
        success.push({ type, pos });
      } catch (e) {
        const msg = extractError(e);
        setImportResults(prev => new Map(prev).set(k, { status: "error", error: msg, position: pos, payload: clean }));
        failures.push({ id: pos.id, type, error: msg, payload: JSON.stringify(clean) });
      } finally {
        setImportingPositions(prev => { const n = new Set(prev); n.delete(k); return n; });
      }
    });

    // Remove successes from list
    if (success.length) {
      const successSet = new Set(success.map(({ type, pos }) => `${type}-${pos.id}`));
      setPositions(prev => {
        const out = {};
        Object.entries(prev).forEach(([type, arr]) => { out[type] = arr.filter(p => !successSet.has(`${type}-${p.id}`)); });
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

    // Offer CSV of failures
    if (failures.length) {
      const csv = toCSV(failures);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      // Store link on window for quick download from UI button
      (window.__NE_FAIL_URL__ = url);
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
      if (e.key === "Backspace" && selectedPositions.size) {
        e.preventDefault();
        // soft protect: require Delete key inside inputs
        if (!["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
          const updated = { ...positions };
          selectedPositions.forEach(k => {
            const [type, id] = k.split("-");
            updated[type] = updated[type].filter(p => String(p.id) !== id);
          });
          setPositions(updated);
          setSelectedPositions(new Set());
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, focusedCell, selectedPositions, positions]);

  /* --------------------------------- Rendering --------------------------------- */

  const filterDefs = [
    { key: "all", label: "All", count: stats.totalPositions, icon: Package2 },
    { key: "valid", label: "Valid", count: stats.validPositions, icon: PackageCheck },
    { key: "invalid", label: "Invalid", count: stats.invalidPositions, icon: PackageX },
    { key: "warnings", label: "Warnings", count: stats.warnings, icon: AlertTriangle },
    { key: "selected", label: "Selected", count: stats.selectedCount, icon: CheckSquare },
    { key: "processed", label: "Imported", count: stats.processedCount, icon: CheckCircle },
  ];

  const Banner = () => {
    const items = [];
    if (stats.invalidPositions > 0) {
      items.push({ type: "error", msg: `${stats.invalidPositions} position(s) need fixing` });
    }
    if (stats.warnings > 0) {
      items.push({ type: "warning", msg: `${stats.warnings} potential duplicate(s)` });
    }
    if (stats.importingCount > 0) {
      items.push({ type: "info", msg: `Importing ${stats.importingCount}…` });
    }
    if (stats.validPositions > 0 && stats.importingCount === 0) {
      items.push({ type: "success", msg: `${stats.validPositions} valid and ready` });
    }
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((b, i) => {
          const tone = b.type === "error" ? t.badgeRed : b.type === "warning" ? t.badgeAmber : b.type === "success" ? t.badgeGreen : t.badgeBlue;
          const Icon = b.type === "error" ? AlertCircle : b.type === "warning" ? AlertTriangle : b.type === "success" ? CheckCircle : Activity;
          return (
            <span key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${tone}`}>
              <Icon className="w-4 h-4" /> <span className="text-sm">{b.msg}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const renderFilterBar = () => (
    <div className="flex items-center gap-2">
      <ListFilter className={`w-4 h-4 ${t.muted}`} />
      <span className={`text-sm ${t.subtext}`}>Show:</span>
      {filterDefs.map(f => {
        const Icon = f.icon;
        const active = filterType === f.key;
        return (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`
              relative flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition
              border ${t.border}
              ${active ? "bg-[#123561] text-white" : t.card}
              hover:bg-[#152a4a]
            `}
          >
            <Icon className="w-3 h-3 mr-1.5" /> {f.label}
            <span className="ml-1.5 inline-flex items-center justify-center px-1.5 h-5 rounded-full text-xs font-bold bg-black/20">
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );

  const ChevronRightIcon = () => (
    <svg viewBox="0 0 20 20" className="w-4 h-4 text-[#6a88c9]" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
    </svg>
  );

  const renderSuggestDropdown = (items, onPick) => {
    if (!items?.length) return null;
    return (
      <div className={`absolute z-50 mt-1 w-[28rem] max-w-[80vw] ${t.card} border ${t.border} rounded-lg shadow-xl`}>
        <div className="max-h-72 overflow-auto">
          {items.map((it, i) => {
            const price = getQuotePrice(it);
            return (
              <button
                key={`${String(it.ticker || it.symbol)}-${i}`}
                onMouseDown={(e) => { e.preventDefault(); onPick(it); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:bg-[#152a4a]`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {(it.ticker || it.symbol || "").toUpperCase()} <span className={`text-xs font-normal ${t.subtext}`}>• {it.asset_type}</span>
                  </div>
                  <div className={`text-xs ${t.subtext} truncate`}>{it.name || it.longName || ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  {price != null && (
                    <div className="px-2 py-0.5 rounded bg-black/20 text-xs font-medium">
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

  const renderCellInput = (type, position, field) => {
    const value = (position.data?.[field.key] ?? "");
    const hasError = position.errors?.[field.key];
    const posKey = `${type}-${position.id}`;
    const isProcessed = processedPositions.has(posKey);
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
        w-full px-3 py-2 text-sm rounded-lg outline-none
        ${t.fieldBg} ${t.text} border ${t.fieldBorder} ${t.focusShadow}
        placeholder:${t.muted}
        ${isProcessed ? "opacity-60 cursor-not-allowed" : "hover:border-[#4361a6] focus:border-[#6aa0ff]"}
        ${field.prefix ? "pl-8" : ""} ${field.suffix ? "pr-8" : ""}
        ${hasError ? "border-[#8d2b3f] ring-1 ring-[#8d2b3f]" : ""}
      `,
    };

    return (
      <div className="relative flex items-center">
        {/* selection / mini status */}
        <div className="absolute -left-7 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isFirstField && !isProcessed && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleSelectPosition(type, position.id, e.target.checked)}
              className="w-4 h-4 rounded border-[#3b4d7a] bg-[#0b1326] text-[#8bb8ff] focus:ring-[#6aa0ff]"
            />
          )}
          {isProcessed && <CheckCircle className="w-4 h-4 text-[#61e5b6]" />}
          {isBusy && !isProcessed && (<Loader2 className="w-4 h-4 animate-spin text-[#ffd28c]" />)}
        </div>

        <div className="flex-1">
          {field.type === "select" ? (
            field.key === "account_id" ? (
              <select
                {...commonProps}
                value={String(value || "")}
                onChange={(e) => updatePosition(type, position.id, field.key, e.target.value)}
              >
                <option value="">Select account…</option>
                {accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.account_name}</option>))}
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
                onBlur={() => {
                  const key = `${type}-${position.id}`;
                  setTimeout(() => { setSearchResults(prev => ({ ...prev, [key]: [] })); }, 120);
                }}
                onInput={(e) => {
                  if (field.searchable) {
                    const q = e.currentTarget.value;
                    debouncedSearch(q, type, position.id);
                  }
                }}
              />
              {field.prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#8bb8ff] opacity-70">{field.prefix}</span>}
              {field.suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[#8bb8ff] opacity-70">{field.suffix}</span>}

              {/* Suggest dropdown */}
              {field.searchable && renderSuggestDropdown(searchResults[`${type}-${position.id}`], (it) => handleSelectSecurity(type, position.id, it))}
            </div>
          )}

          {hasError && <div className="absolute -bottom-5 left-0 text-xs text-[#ffb9c7] font-medium">{position.errors[field.key]}</div>}
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
      <div key={type} className={`${t.card} rounded-xl border ${t.border} overflow-hidden`}>
        {/* header */}
        <div
          onClick={() => setExpandedSections(prev => ({ ...prev, [type]: !isExpanded }))}
          className={`px-4 py-3 cursor-pointer bg-[#0f1930] border-b ${t.border}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-black/20">
                <Icon className="w-5 h-5 text-[#a7c8ff]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${t.text}`}>{cfg.name}</h3>
                  {all.length > 0 && (
                    <span className={`px-2 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold border ${t.badgeBlue}`}>{all.length}</span>
                  )}
                  {filterType !== "all" && filtered.length !== all.length && (
                    <span className={`px-2 h-5 inline-flex items-center justify-center rounded-full text-xs font-bold border ${t.badgeAmber}`}>
                      {filtered.length} filtered
                    </span>
                  )}
                </div>
                <p className={`text-xs ${t.subtext}`}>{cfg.description}</p>
              </div>

              {/* mini stats */}
              {tStats && (
                <div className="hidden md:flex items-center gap-4 text-xs">
                  <div className={`text-center ${t.subtext}`}><div className="font-bold text-[#a7c8ff]">{tStats.valid}</div><div>Valid</div></div>
                  {tStats.invalid > 0 && <div className="text-center text-[#ffb9c7]"><div className="font-bold">{tStats.invalid}</div><div>Errors</div></div>}
                  {tStats.processed > 0 && <div className="text-center text-[#9ee6c6]"><div className="font-bold">{tStats.processed}</div><div>Imported</div></div>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={(e) => { e.stopPropagation(); addNewRow(type); if (!isExpanded) setExpandedSections(prev => ({ ...prev, [type]: true })); }}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-[#d7e4ff]"
                title={`Add ${cfg.name}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              <ChevronDown className={`w-5 h-5 text-[#6a88c9] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>
          </div>
        </div>

        {/* body */}
        {isExpanded && (
          <div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex p-4 rounded-full bg-black/20 mb-4"><Icon className="w-8 h-8 text-[#a7c8ff]" /></div>
                <p className={`${t.subtext} mb-4`}>{filterType === "all" ? `No ${cfg.name.toLowerCase()} yet` : `No ${filterType} ${cfg.name.toLowerCase()}`}</p>
                {filterType === "all" && (
                  <button onClick={() => addNewRow(type)} className="inline-flex items-center px-4 py-2 rounded-lg bg-[#123561] text-white hover:bg-[#1a4a82]">
                    <Plus className="w-4 h-4 mr-2" /> Add {cfg.name}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`sticky top-0 z-10 backdrop-blur ${t.card} border-b ${t.border}`}>
                      <tr>
                        <th className="w-8 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                            checked={allSelected}
                            onChange={(e) => e.target.checked ? handleSelectAllIn(type, filtered) : handleDeselectAllIn(type, filtered)}
                            className="w-4 h-4 rounded border-[#3b4d7a] bg-[#0b1326] text-[#8bb8ff] focus:ring-[#6aa0ff]"
                          />
                        </th>
                        <th className="w-12 px-3 py-3 text-left">
                          <span className={`text-xs font-semibold ${t.subtext}`}>#</span>
                        </th>
                        {cfg.fields.map(f => (
                          <th key={f.key} className={`${f.width} px-2 py-3 text-left`}>
                            <span className={`text-xs font-semibold ${t.subtext} flex items-center gap-1`}>
                              {f.label}
                              {f.required && <span className="text-[#ffb9c7]">*</span>}
                              {f.readOnly && <Info className="w-3 h-3 text-[#6a88c9]" title="Auto-filled" />}
                            </span>
                          </th>
                        ))}
                        <th className="w-40 px-2 py-3 text-center">
                          <span className={`text-xs font-semibold ${t.subtext}`}>Actions</span>
                        </th>
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
                        const result = importResults.get(k);

                        return (
                          <tr
                            key={position.id}
                            className={`
                              relative
                              ${idx % 2 === 0 ? t.card : t.cardAlt}
                              border-b ${t.border}
                              ${isProcessed ? "outline outline-1 outline-[#1d614b]" :
                                isImporting ? "outline outline-1 outline-[#6a4f1c]" :
                                  hasErrors ? "outline outline-1 outline-[#8d2b3f]" :
                                    warn ? "outline outline-1 outline-[#6a4f1c]" : ""}
                            `}
                          >
                            <td className="px-3 py-2" />
                            <td className="px-3 py-2">
                              <span className={`text-sm ${t.subtext}`}>{idx + 1}</span>
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
                                      className="p-1.5 text-[#8bb8ff] hover:bg-black/20 rounded-lg transition"
                                      title="Duplicate (Ctrl/⌘+D)"
                                    >
                                      <Repeat className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deletePosition(type, position.id)}
                                      className="p-1.5 text-[#ffb9c7] hover:bg-black/20 rounded-lg transition"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {value > 0 && showValues && (
                                  <div className="ml-2 px-2 py-1 bg-black/30 rounded text-xs font-medium">
                                    {formatCurrency(value)}
                                  </div>
                                )}
                                {/* Status badge */}
                                <div className="min-w-[110px] flex items-center justify-center">
                                  {isProcessed ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${t.badgeGreen}`}>
                                      <CheckCircle className="w-3 h-3" /> Imported
                                    </span>
                                  ) : isImporting ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${t.badgeAmber}`}>
                                      <Loader2 className="w-3 h-3 animate-spin" /> Sending
                                    </span>
                                  ) : hasErrors ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${t.badgeRed}`}>
                                      <AlertCircle className="w-3 h-3" /> Fix Required
                                    </span>
                                  ) : warn ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${t.badgeAmber}`}>
                                      <AlertTriangle className="w-3 h-3" /> Review
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${t.badgeBlue}`}>
                                      <Info className="w-3 h-3" /> Ready
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Inline server error (when present) */}
                              {result?.status === "error" && (
                                <tr className="">
                                  <td colSpan={999}>
                                    <div className="px-12 pb-3">
                                      <div className={`mt-2 px-3 py-2 rounded-lg border ${t.badgeRed}`}>
                                        <div className="flex items-start gap-2">
                                          <FileWarning className="w-4 h-4 mt-0.5" />
                                          <div className="text-xs whitespace-pre-wrap break-words">
                                            {result.error}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* footer add */}
                {filterType === "all" && (
                  <div className="p-3 bg-[#0f1930] border-t ${t.border}">
                    <button
                      onClick={() => addNewRow(type)}
                      className="w-full py-2 px-4 border-2 border-dashed rounded-lg border-[#2b3f6e] hover:border-[#4361a6] text-[#d7e4ff] flex items-center justify-center gap-2"
                    >
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

  /* --------------------------------- Header --------------------------------- */

  const DownloadFailuresButton = () => {
    const anyFail = Array.from(importResults.values()).some(v => v.status === "error");
    return (
      <button
        onClick={() => { if (window.__NE_FAIL_URL__) { const a = document.createElement("a"); a.href = window.__NE_FAIL_URL__; a.download = "import_failures.csv"; a.click(); } }}
        disabled={!anyFail}
        className={`px-3 py-2 text-sm rounded-lg border ${t.border} ${anyFail ? "bg-black/20 hover:bg-black/30 text-white" : "opacity-50 cursor-not-allowed text-[#8bb8ff]"}`}
        title="Download CSV of failed rows"
      >
        <Download className="w-4 h-4 inline-block mr-2" /> Failures CSV
      </button>
    );
  };

  const IssuesDrawer = () => {
    const errorRows = [];
    Object.entries(positions).forEach(([type, arr]) => {
      arr.forEach((pos) => {
        const k = `${type}-${pos.id}`;
        const r = importResults.get(k);
        const fields = Object.entries(pos.errors || {}).filter(([, msg]) => !!msg);
        if (fields.length || r?.status === "error") {
          errorRows.push({ type, pos, k, result: r, fields });
        }
      });
    });

    if (!issuesOpen) return null;

    return (
      <div className="fixed right-0 top-0 h-full w-[420px] z-[90] p-4 border-l overflow-auto"
           style={{ background: "#0f1629", borderColor: "#1f2a44" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold text-[#e6ecff]">Issues</div>
          <button onClick={() => setIssuesOpen(false)} className="p-2 rounded-lg hover:bg-black/20">
            <X className="w-5 h-5 text-[#a7c8ff]" />
          </button>
        </div>

        {errorRows.length === 0 ? (
          <div className={`${t.subtext}`}>No issues detected.</div>
        ) : (
          <div className="space-y-3">
            {errorRows.map(({ type, pos, k, result, fields }) => (
              <div key={k} className={`p-3 rounded-lg border ${t.border} ${t.cardAlt}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#e6ecff]">
                    {type.toUpperCase()} • {pos.data?.ticker || pos.data?.symbol || pos.data?.asset_name || pos.data?.metal_type || pos.id}
                  </div>
                </div>
                {fields.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs text-[#ffb9c7]">
                    {fields.map(([f, msg]) => <li key={f}><b>{f}:</b> {msg}</li>)}
                  </ul>
                )}
                {result?.status === "error" && (
                  <div className={`mt-2 px-3 py-2 rounded border ${t.badgeRed}`}>
                    <div className="text-xs whitespace-pre-wrap break-words">{result.error}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const SummaryRail = () => {
    // sticky right rail with per-type stats + preview top 3
    return (
      <aside className="hidden lg:block w-[340px] flex-shrink-0 sticky top-0 self-start h-[calc(95vh-2rem)] overflow-auto pl-4">
        <div className={`${t.card} border ${t.border} rounded-xl p-4 space-y-4`}>
          <div className="text-base font-semibold text-white">Summary</div>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Total" value={stats.totalPositions} />
            <MiniStat label="Valid" value={stats.validPositions} />
            <MiniStat label="Invalid" value={stats.invalidPositions} tone="red" />
            <MiniStat label="Selected" value={stats.selectedCount} />
            <MiniStat label="Imported" value={stats.processedCount} tone="green" />
            {showValues && <MiniStat label="Value" value={formatCurrency(stats.totalValue)} tone="amber" />}
          </div>

          <div className="h-px bg-[#1f2a44]" />

          {Object.keys(assetTypes).map((tk) => {
            const cfg = assetTypes[tk];
            const s = stats.byType[tk];
            const Icon = cfg.icon;
            const sample = (positions[tk] || []).slice(0, 3);
            return (
              <div key={tk} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#a7c8ff]" />
                  <div className="text-sm font-semibold text-white">{cfg.name}</div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${t.badgeBlue}`}>{s.count}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Chip label="Valid" val={s.valid} />
                  <Chip label="Invalid" val={s.invalid} tone="red" clickable onClick={() => { setFilterType("invalid"); setExpandedSections(p => ({ ...p, [tk]: true })); }} />
                  <Chip label="Imported" val={s.processed} tone="green" clickable onClick={() => { setFilterType("processed"); setExpandedSections(p => ({ ...p, [tk]: true })); }} />
                </div>
                {showValues && <div className={`text-xs ${t.subtext}`}>Value {formatCurrency(s.value)} • Cost {formatCurrency(s.cost)}</div>}
                {sample.length > 0 && (
                  <div className="space-y-1">
                    {sample.map((p) => {
                      const { value } = calcValue(tk, p);
                      return (
                        <div key={p.id} className={`px-2 py-1 rounded border ${t.border} ${t.cardAlt} flex items-center justify-between`}>
                          <div className="truncate text-xs">{p.data?.ticker || p.data?.symbol || p.data?.asset_name || p.data?.metal_type}</div>
                          {showValues && <div className="text-xs text-[#a7c8ff]">{formatCurrency(value)}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="h-px bg-[#1f2a44]" />
              </div>
            );
          })}
        </div>
      </aside>
    );
  };

  function MiniStat({ label, value, tone }) {
    const color = tone === "red" ? t.badgeRed : tone === "green" ? t.badgeGreen : tone === "amber" ? t.badgeAmber : t.badgeBlue;
    return (
      <div className={`px-2 py-2 rounded border ${color} text-sm text-center`}>
        <div className="font-semibold">{value}</div>
        <div className="opacity-90">{label}</div>
      </div>
    );
  }
  function Chip({ label, val, tone, clickable, onClick }) {
    const color = tone === "red" ? t.badgeRed : tone === "green" ? t.badgeGreen : t.badgeBlue;
    const cls = `px-2 py-1 rounded border ${color} text-center ${clickable ? "cursor-pointer hover:bg-black/20" : ""}`;
    return <div className={cls} onClick={onClick}><span className="font-semibold">{val}</span> {label}</div>;
  }

  return (
    <FixedModal isOpen={isOpen} onClose={onClose} title="Quick Position Entry" size="max-w-[1800px]">
      <div className={`${t.bg} ${t.text} h-[95vh] flex flex-col`}>
        {/* top bar */}
        <div className={`flex-shrink-0 px-6 py-4 ${t.card} border-b ${t.border}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <Banner />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowValues(!showValues)}
                className={`px-3 py-2 rounded-lg border ${t.border} bg-black/20 hover:bg-black/30`}
                title={showValues ? "Hide values" : "Show values"}
              >
                {showValues ? <><Eye className="w-4 h-4 inline mr-2" /> Hide Values</> : <><EyeOff className="w-4 h-4 inline mr-2" /> Show Values</>}
              </button>
              <button
                onClick={() => setIssuesOpen(true)}
                className={`px-3 py-2 rounded-lg border ${t.border} bg-black/20 hover:bg-black/30`}
                title="Open Issues"
              >
                <AlertTriangle className="w-4 h-4 inline mr-2" /> Issues
              </button>
              <DownloadFailuresButton />
              <button
                onClick={submitSelected}
                disabled={!stats.selectedCount || isSubmitting}
                className={`px-4 py-2 text-sm rounded-lg border ${t.border} bg-[#123561] hover:bg-[#1a4a82] disabled:opacity-50`}
              >
                <ClipboardList className="w-4 h-4 inline mr-2" /> Import Selected
              </button>
              <button
                onClick={submitValidOnly}
                disabled={stats.validPositions === 0 || isSubmitting}
                className={`px-6 py-2 text-sm font-semibold rounded-lg border ${t.border}
                  ${stats.validPositions === 0 || isSubmitting ? "opacity-50 cursor-not-allowed bg-black/10" : "bg-[#1d614b] hover:bg-[#267a61]"}`}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 inline animate-spin mr-2" /> Importing…</> : <><PlayCircle className="w-4 h-4 inline mr-2" /> Import {stats.validPositions} Valid</>}
              </button>
            </div>
          </div>

          {/* totals & progress */}
          <div className="grid grid-cols-6 gap-3 mb-3">
            <MiniStat label="Total" value={stats.totalPositions} />
            <MiniStat label="Valid" value={stats.validPositions} />
            <MiniStat label="Invalid" value={stats.invalidPositions} tone="red" />
            <MiniStat label="Selected" value={stats.selectedCount} />
            <MiniStat label="Imported" value={stats.processedCount} tone="green" />
            {showValues && <MiniStat label="Portfolio Value" value={formatCurrency(stats.totalValue)} tone="amber" />}
          </div>

          {/* filters */}
          {stats.totalPositions > 0 && renderFilterBar()}
        </div>

        {/* body two-pane */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
            <div className="overflow-y-auto pr-1 space-y-4">
              {Object.keys(assetTypes).map((t) => renderAssetSection(t))}
              <div className="pb-8" />
            </div>
            <SummaryRail />
          </div>
        </div>
      </div>

      {/* Side drawers */}
      <IssuesDrawer />
    </FixedModal>
  );
};

AddQuickPositionModal.displayName = "AddQuickPositionModal";
export { AddQuickPositionModal };
export default AddQuickPositionModal;
