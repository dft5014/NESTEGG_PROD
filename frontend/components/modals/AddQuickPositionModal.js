// AddQuickPositionModal — "The Ultimate Quick Add Experience"
// Notes:
// - Integrates the advanced SearchableDropdown component for a superior UX.
// - Adds loading states for a smoother user experience during async operations.
// - Implements a success screen and clear error handling for import results.
// - Enhances performance by memoizing derived state with useMemo.
// - Maintains all core functionality from the original version.

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactDOM from 'react-dom';
import FixedModal from "./FixedModal";
import { fetchAllAccounts } from "@/utils/apimethods/accountMethods";
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
import debounce from "lodash.debounce";
import {
    Plus, X, Check, TrendingUp, TrendingDown, Coins, DollarSign, Home, BarChart3,
    Eye, EyeOff, Save, Trash2, AlertCircle, CheckCircle, Hash, Search, ChevronDown,
    Repeat, Info, Filter, Loader2, PackageX, PackageCheck, Package2,
    ClipboardList, CheckSquare, Activity, AlertTriangle, PlayCircle, ChevronUp,
    Download, FileWarning, FileSpreadsheet, ListFilter, Copy, Users, Clock
} from "lucide-react";

/* ------------------------------- Theme tokens ------------------------------- */
// Accessible dark-mode surfaces & borders
const t = {
    bg: "bg-[#0b0f19]",            // page canvas
    card: "bg-[#0f1629]",          // cards/rows
    cardAlt: "bg-[#121a31]",       // zebra
    border: "border-[#1f2a44]",    // subtle but visible
    text: "text-[#e6ecff]",        // main text
    subtext: "text-[#b3c2ff]",     // secondary
    muted: "text-[#87a0ff]",
    fieldBg: "bg-[#0b1326]",       // inputs
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
        return String(err ?? "Unknown error");
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
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);

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
        if (!isOpen) {
            setShowSuccessScreen(false);
            return;
        }
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
        if (batches.length > 0) setShowSuccessScreen(true);
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
        if (list.length > 0) setShowSuccessScreen(true);
    };

    async function importWithProgress(batches) {
        const success = [];
        const failures = [];

        const toProcess = batches.slice();

        await runPool(toProcess, 4, async ({ type, pos }) => {
            const k = `${type}-${pos.id}`;
            setImportingPositions(prev => new Set(prev).add(k));

            try {
                let response;
                if (type === "security") response = await addSecurityPosition(pos.data);
                if (type === "cash") response = await addCashPosition(pos.data);
                if (type === "crypto") response = await addCryptoPosition(pos.data);
                if (type === "metal") response = await addMetalPosition(pos.data);
                if (type === "otherAssets") response = await addOtherAsset(pos.data);
                const data = response?.data || response;
                if (data?.success) {
                    success.push({ ...pos, importStatus: "success" });
                    setProcessedPositions(prev => new Set(prev).add(k));
                } else {
                    const err = extractError(data?.error || data);
                    failures.push({ ...pos, importStatus: "failure", importError: err });
                }
            } catch (e) {
                const err = extractError(e);
                failures.push({ ...pos, importStatus: "failure", importError: err });
            } finally {
                setImportingPositions(prev => {
                    const next = new Set(prev);
                    next.delete(k);
                    return next;
                });
            }
        });

        // Update import results state with all failures
        if (failures.length > 0) {
            setImportResults(prev => {
                const next = new Map(prev);
                failures.forEach(f => next.set(`${f.type}-${f.id}`, f.importError));
                return next;
            });
            setIssuesOpen(true);
        }

        if (success.length > 0) {
            onPositionsSaved();
        }
    }

    const exportFailures = () => {
        const failures = [...importResults.values()];
        const csv = toCSV(failures.map((f, i) => ({
            id: i + 1,
            type: f.type,
            error: f.importError,
            payload: JSON.stringify(f.data),
        })));
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "failed_positions.csv");
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    /* --------------------------------- Render --------------------------------- */

    const renderHeader = () => {
        const total = stats.totalPositions - stats.processedCount;
        const valid = stats.validPositions - stats.processedCount;
        const invalid = stats.invalidPositions;
        const selected = selectedPositions.size - stats.processedCount;
        const processed = stats.processedCount;
        const warnings = stats.warnings;

        const filters = [
            { type: "all", label: "All", count: total },
            { type: "valid", label: "Valid", count: valid, icon: CheckCircle, color: "text-green-500" },
            { type: "invalid", label: "Invalid", count: invalid, icon: AlertCircle, color: "text-red-500" },
            { type: "selected", label: "Selected", count: selected, icon: CheckSquare, color: "text-sky-500" },
            { type: "warnings", label: "Warnings", count: warnings, icon: AlertTriangle, color: "text-amber-500" },
            { type: "processed", label: "Processed", count: processed, icon: PackageCheck, color: "text-gray-400" },
        ];

        return (
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2 p-1 rounded-full bg-gray-800 border border-gray-700">
                    {filters.map(f => (
                        <button
                            key={f.type}
                            onClick={() => setFilterType(f.type)}
                            className={`flex items-center gap-1 py-1 px-3 rounded-full text-xs font-semibold ${
                                filterType === f.type ? "bg-green-600 text-white shadow-md" : "text-gray-400 hover:bg-gray-700 hover:text-white"
                            }`}
                        >
                            {f.icon && <f.icon className={`w-3 h-3 ${f.color}`} />}
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderSummaryRail = () => {
        const data = Object.values(stats.byType).map(t => ({
            count: t.count,
            value: t.value,
            cost: t.cost,
        }));
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        const totalCost = data.reduce((sum, d) => sum + d.cost, 0);
        const profit = totalValue - totalCost;
        const performance = totalCost > 0 ? (profit / totalCost) * 100 : 0;
        const performanceColor = profit >= 0 ? "text-green-500" : "text-red-500";

        return (
            <div className={`p-4 rounded-lg border ${t.border} ${t.cardAlt} flex flex-col gap-4 sticky top-4`}>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
                    Summary
                </h3>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Total Value</span>
                        <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Total Cost</span>
                        <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-dashed mt-2 pt-2 border-gray-600">
                        <span className="text-gray-300 text-sm">Performance</span>
                        <div className="flex items-center gap-1">
                            <span className={`text-lg font-bold ${performanceColor}`}>{formatPercentage(performance)}</span>
                            {profit > 0 && <TrendingUp className={`w-4 h-4 ${performanceColor}`} />}
                            {profit < 0 && <TrendingDown className={`w-4 h-4 ${performanceColor}`} />}
                        </div>
                    </div>
                </div>

                <div className="border-t border-dashed mt-2 pt-2 border-gray-600">
                    <h4 className="text-xs text-gray-500 font-medium mb-2">By Asset Type</h4>
                    {Object.entries(stats.byType).map(([type, data]) => {
                        if (data.count === 0) return null;
                        const perf = data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0;
                        const perfColor = (data.value - data.cost) >= 0 ? "text-green-500" : "text-red-500";
                        const Icon = assetTypes[type].icon;
                        return (
                            <div key={type} className="flex justify-between items-center text-sm py-1.5">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-gray-400" />
                                    <span>{assetTypes[type].name} ({data.count})</span>
                                </div>
                                <span className={`${perfColor}`}>{formatCurrency(data.value)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderSuccessScreen = () => (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-white mb-2">Positions Imported Successfully!</h2>
            <p className="text-gray-400 mb-6">
                Your selected positions have been added to your portfolio.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => {
                        onPositionsSaved();
                        onClose();
                    }}
                    className={`flex items-center px-6 py-2 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors`}
                >
                    Close
                </button>
            </div>
        </div>
    );

    const renderIssuesDrawer = () => {
        const failureCount = importResults.size;
        const failures = [...importResults.entries()];
        return (
            <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-in-out transform ${
                issuesOpen ? "translate-y-0" : "translate-y-full"
            }`}>
                <div className={`max-w-7xl mx-auto rounded-t-xl shadow-2xl overflow-hidden border border-gray-700 ${t.cardAlt}`}>
                    <div className="flex justify-between items-center p-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            Import Failures ({failureCount})
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportFailures}
                                className="flex items-center gap-1 px-3 py-1 text-sm rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Export as CSV
                            </button>
                            <button
                                onClick={() => setIssuesOpen(false)}
                                className="p-1 rounded-full hover:bg-gray-700 text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto bg-gray-900 border-t border-gray-700">
                        {failures.map(([key, error]) => {
                            const [type, id] = key.split("-");
                            const pos = positions[type]?.find(p => String(p.id) === id);
                            const name = pos?.data?.name || pos?.data?.ticker || pos?.data?.symbol || "Unnamed Item";
                            return (
                                <div key={key} className="p-3 border-b border-gray-800 text-sm">
                                    <div className="flex items-center gap-2 font-medium text-white">
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <span>{name} ({assetTypes[type]?.name})</span>
                                    </div>
                                    <p className="text-gray-400 mt-1 pl-6">
                                        <span className="font-semibold text-gray-300">Error:</span> {error}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderLoadingDots = () => (
        <div className="flex items-center space-x-1.5 text-white">
            <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-white block" style={{ animationDelay: '0s' }}></span>
            <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-white block" style={{ animationDelay: '0.2s' }}></span>
            <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-white block" style={{ animationDelay: '0.4s' }}></span>
        </div>
    );

    const SearchableDropdown = ({
        label,
        value,
        options,
        onChange,
        placeholder,
        onSearch,
        isLoading,
        onBlur,
        suggestions,
        onSelectSuggestion,
        activeSuggestionIndex,
        onKeyDown,
    }) => {
        const [isFocused, setIsFocused] = useState(false);
        const [isInputting, setIsInputting] = useState(false);
        const inputRef = useRef(null);
        const containerRef = useRef(null);

        const filteredSuggestions = useMemo(() => {
            if (isInputting && value) {
                return suggestions.filter(s =>
                    s.ticker?.toLowerCase().includes(value.toLowerCase()) ||
                    s.symbol?.toLowerCase().includes(value.toLowerCase()) ||
                    s.name?.toLowerCase().includes(value.toLowerCase()) ||
                    s.longName?.toLowerCase().includes(value.toLowerCase())
                );
            }
            return suggestions;
        }, [isInputting, value, suggestions]);

        const handleFocus = () => { setIsFocused(true); setIsInputting(true); };
        const handleBlur = () => {
            setTimeout(() => {
                setIsFocused(false);
                setIsInputting(false);
                onBlur?.();
            }, 200);
        };

        const handleSuggestionClick = (suggestion) => {
            onSelectSuggestion(suggestion);
            setIsFocused(false);
            setIsInputting(false);
        };

        const listRef = useRef(null);
        useEffect(() => {
            if (listRef.current && activeSuggestionIndex >= 0) {
                const activeEl = listRef.current.querySelector(`.active-suggestion`);
                if (activeEl) {
                    activeEl.scrollIntoView({ block: 'nearest' });
                }
            }
        }, [activeSuggestionIndex]);

        const getDisplayValue = () => {
            if (isInputting) return value;
            const option = options.find(o => o.value === value);
            return option ? option.label : value;
        };

        const renderDropdown = () => {
            if (!isFocused || (filteredSuggestions.length === 0 && !isLoading)) return null;
            return ReactDOM.createPortal(
                <div
                    ref={containerRef}
                    className={`absolute z-50 mt-1 w-full rounded-md shadow-lg ${t.cardAlt} border ${t.border}`}
                >
                    <ul
                        ref={listRef}
                        className="max-h-60 overflow-y-auto py-1"
                        role="listbox"
                    >
                        {isLoading ? (
                            <li className="p-2 flex items-center justify-center text-gray-400">
                                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                Searching...
                            </li>
                        ) : filteredSuggestions.length > 0 ? (
                            filteredSuggestions.map((s, index) => (
                                <li
                                    key={s.ticker || s.symbol || s.value}
                                    className={`relative flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-700 ${
                                        index === activeSuggestionIndex ? "bg-gray-700 active-suggestion" : ""
                                    }`}
                                    onClick={() => handleSuggestionClick(s)}
                                    role="option"
                                    aria-selected={index === activeSuggestionIndex}
                                >
                                    <span className="text-gray-300 font-medium">
                                        {s.ticker || s.symbol || s.value}
                                    </span>
                                    <span className="text-gray-500 text-sm">{s.name || s.longName}</span>
                                </li>
                            ))
                        ) : (
                            <li className="p-2 text-gray-400 text-center">No results found.</li>
                        )}
                    </ul>
                </div>,
                document.body
            );
        };

        return (
            <div className="relative">
                <input
                    type="text"
                    ref={inputRef}
                    value={getDisplayValue()}
                    onChange={e => {
                        onChange(e.target.value);
                        onSearch?.(e.target.value);
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className={`block w-full text-sm rounded-md px-3 py-2 ${t.fieldBg} ${t.text} border ${t.fieldBorder} ${t.focusShadow} ${t.fieldFocus}`}
                />
                {isFocused && renderDropdown()}
            </div>
        );
    };

    return (
        <FixedModal isOpen={isOpen} onClose={onClose} showCloseButton={true}>
            <div className={`p-6 ${t.bg} text-white max-h-screen overflow-y-auto`}>
                {!showSuccessScreen ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <ListPlus className="w-6 h-6" />
                                Add Quick Positions
                            </h2>
                            <button onClick={onClose} className={`p-2 rounded-full hover:${t.cardAlt} text-gray-400`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-3">
                                {renderHeader()}
                                <div className="space-y-4">
                                    {Object.entries(assetTypes).map(([type, config]) => {
                                        const filteredRows = getFilteredPositions(type);
                                        const totalCount = positions[type].length;
                                        const isExpanded = expandedSections[type];
                                        const Icon = config.icon;
                                        if (filteredRows.length === 0 && !isExpanded) return null;

                                        const canSelectAll = filteredRows.some(p => !processedPositions.has(`${type}-${p.id}`));
                                        const areAllSelected = canSelectAll && filteredRows.every(p => selectedPositions.has(`${type}-${p.id}`));

                                        return (
                                            <div key={type} className={`rounded-lg p-4 border ${t.border} ${t.card}`}>
                                                <div
                                                    className="flex justify-between items-center cursor-pointer mb-2"
                                                    onClick={() => setExpandedSections(prev => ({ ...prev, [type]: !isExpanded }))}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon className="w-5 h-5 text-green-400" />
                                                        <span className="text-lg font-semibold">{config.name}</span>
                                                        <span className={`text-sm rounded-full px-2 py-0.5 font-medium ${t.badgeBlue}`}>{totalCount}</span>
                                                    </div>
                                                    <ChevronDown
                                                        className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                                                            isExpanded ? "rotate-180" : "rotate-0"
                                                        }`}
                                                    />
                                                </div>

                                                <p className="text-sm text-gray-400 mb-4">{config.description}</p>

                                                <div className="flex items-center gap-2 mb-2">
                                                    <button
                                                        onClick={() => addNewRow(type)}
                                                        className={`flex items-center gap-1 text-sm font-medium py-1 px-3 rounded-full ${t.badgeGreen}`}
                                                    >
                                                        <Plus className="w-3 h-3" /> Add Row
                                                    </button>
                                                    {totalCount > 0 && (
                                                        <button
                                                            onClick={() => (areAllSelected ? handleDeselectAllIn(type, filteredRows) : handleSelectAllIn(type, filteredRows))}
                                                            className={`flex items-center gap-1 text-sm font-medium py-1 px-3 rounded-full ${t.badgeBlue}`}
                                                        >
                                                            <CheckSquare className="w-3 h-3" /> Select All
                                                        </button>
                                                    )}
                                                </div>

                                                {isExpanded && filteredRows.length > 0 && (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-700">
                                                            <thead>
                                                                <tr>
                                                                    <th className="px-1 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
                                                                    {config.fields.map(field => (
                                                                        <th key={field.key} className={`px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${field.width}`}>
                                                                            {field.label}
                                                                        </th>
                                                                    ))}
                                                                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-800">
                                                                {filteredRows.map((pos, posIndex) => {
                                                                    const key = `${type}-${pos.id}`;
                                                                    const isProcessed = processedPositions.has(key);
                                                                    const isImporting = importingPositions.has(key);
                                                                    const isSelected = selectedPositions.has(key);
                                                                    const hasError = Object.values(pos.errors).some(Boolean);
                                                                    const hasWarning = dedupeMap.get(dupKey(type, pos)) > 1;

                                                                    return (
                                                                        <tr
                                                                            key={pos.id}
                                                                            className={`group ${posIndex % 2 === 0 ? t.card : t.cardAlt} transition-colors duration-200`}
                                                                        >
                                                                            <td className="w-10 text-center relative">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    disabled={isProcessed}
                                                                                    onChange={(e) => handleSelectPosition(type, pos.id, e.target.checked)}
                                                                                    className="form-checkbox text-green-500 rounded border-gray-600 bg-gray-700 disabled:opacity-50"
                                                                                />
                                                                                {(isImporting || isProcessed) && (
                                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                                                                                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-500" />}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            {config.fields.map(field => {
                                                                                const fieldKey = field.key;
                                                                                const value = pos.data[fieldKey] || "";
                                                                                const error = pos.errors[fieldKey];
                                                                                const isSearchable = field.searchable;

                                                                                if (field.type === "select") {
                                                                                    return (
                                                                                        <td key={fieldKey} className="py-2 px-2 text-sm text-gray-300">
                                                                                            <select
                                                                                                value={value}
                                                                                                onChange={(e) => updatePosition(type, pos.id, fieldKey, e.target.value)}
                                                                                                disabled={isProcessed || field.readOnly}
                                                                                                className={`block w-full text-sm rounded-md px-2 py-1 ${t.fieldBg} ${t.text} border ${t.fieldBorder} ${t.focusShadow} ${t.fieldFocus} disabled:opacity-50`}
                                                                                            >
                                                                                                {field.options.map(option => (
                                                                                                    <option key={option.value} value={option.value}>
                                                                                                        {option.label}
                                                                                                    </option>
                                                                                                ))}
                                                                                            </select>
                                                                                        </td>
                                                                                    );
                                                                                }

                                                                                if (fieldKey === "account_id") {
                                                                                    const accountsOptions = accounts.map(acc => ({
                                                                                        value: acc.id,
                                                                                        label: acc.account_name
                                                                                    }));
                                                                                    const accountName = accounts.find(a => a.id === value)?.account_name || "Select Account...";
                                                                                    return (
                                                                                        <td key={fieldKey} className="py-2 px-2 text-sm text-gray-300">
                                                                                            <SearchableDropdown
                                                                                                value={value}
                                                                                                options={accountsOptions}
                                                                                                onChange={(val) => updatePosition(type, pos.id, fieldKey, val)}
                                                                                                placeholder="Select Account"
                                                                                                onSelectSuggestion={(s) => updatePosition(type, pos.id, fieldKey, s.value)}
                                                                                                suggestions={accountsOptions}
                                                                                                disabled={isProcessed}
                                                                                            />
                                                                                        </td>
                                                                                    );
                                                                                }

                                                                                if (isSearchable) {
                                                                                    const searchKey = `${type}-${pos.id}`;
                                                                                    return (
                                                                                        <td key={fieldKey} className="py-2 px-2 text-sm text-gray-300">
                                                                                            <SearchableDropdown
                                                                                                value={value}
                                                                                                onChange={(val) => updatePosition(type, pos.id, fieldKey, val)}
                                                                                                placeholder={field.placeholder}
                                                                                                onSearch={(q) => debouncedSearch(q, type, pos.id)}
                                                                                                isLoading={isSearching[searchKey]}
                                                                                                suggestions={searchResults[searchKey] || []}
                                                                                                onSelectSuggestion={(s) => handleSelectSecurity(type, pos.id, s)}
                                                                                                activeSuggestionIndex={activeSuggestIndex[searchKey]}
                                                                                                onKeyDown={(e) => {
                                                                                                    const suggestions = searchResults[searchKey] || [];
                                                                                                    const active = activeSuggestIndex[searchKey] ?? -1;
                                                                                                    if (e.key === "ArrowDown") {
                                                                                                        e.preventDefault();
                                                                                                        setActiveSuggestIndex(prev => ({ ...prev, [searchKey]: Math.min(active + 1, suggestions.length - 1) }));
                                                                                                    } else if (e.key === "ArrowUp") {
                                                                                                        e.preventDefault();
                                                                                                        setActiveSuggestIndex(prev => ({ ...prev, [searchKey]: Math.max(active - 1, -1) }));
                                                                                                    } else if (e.key === "Enter" && active >= 0) {
                                                                                                        e.preventDefault();
                                                                                                        handleSelectSecurity(type, pos.id, suggestions[active]);
                                                                                                    }
                                                                                                }}
                                                                                                disabled={isProcessed}
                                                                                            />
                                                                                            {error && <span className="text-red-400 text-xs mt-1 block">{error}</span>}
                                                                                        </td>
                                                                                    );
                                                                                }

                                                                                return (
                                                                                    <td key={fieldKey} className="py-2 px-2 text-sm text-gray-300">
                                                                                        <input
                                                                                            type={field.type}
                                                                                            value={value}
                                                                                            onChange={(e) => updatePosition(type, pos.id, fieldKey, e.target.value)}
                                                                                            placeholder={field.placeholder}
                                                                                            disabled={isProcessed || field.readOnly}
                                                                                            min={field.min}
                                                                                            step={field.step}
                                                                                            className={`block w-full text-sm rounded-md px-2 py-1 ${t.fieldBg} ${t.text} border ${t.fieldBorder} ${t.focusShadow} ${t.fieldFocus} disabled:opacity-50`}
                                                                                        />
                                                                                        {error && <span className="text-red-400 text-xs mt-1 block">{error}</span>}
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                            <td className="py-2 px-2 text-sm text-gray-300">
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        onClick={() => duplicateRow(type, pos.id)}
                                                                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-700"
                                                                                        title="Duplicate"
                                                                                    >
                                                                                        <Copy className="w-4 h-4" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => deletePosition(type, pos.id)}
                                                                                        className="p-1 rounded-full text-gray-500 hover:bg-red-900 hover:text-red-400"
                                                                                        title="Delete"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                {renderSummaryRail()}
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-6 p-4 rounded-b-lg border-t border-gray-700">
                            <div className="text-sm text-gray-400">
                                {stats.validPositions > 0 && (
                                    <span>
                                        Ready to import: <span className="font-semibold text-green-400">{stats.validPositions}</span> positions
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-4 items-center">
                                {isSubmitting && (
                                    <div className="flex items-center gap-2 text-green-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Importing...</span>
                                    </div>
                                )}
                                <button
                                    onClick={submitSelected}
                                    disabled={selectedPositions.size === 0 || isSubmitting}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                                        selectedPositions.size === 0 || isSubmitting
                                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                            : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                                >
                                    <Upload className="w-4 h-4" />
                                    Import Selected ({selectedPositions.size})
                                </button>
                                <button
                                    onClick={submitValidOnly}
                                    disabled={stats.validPositions === 0 || isSubmitting}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                                        stats.validPositions === 0 || isSubmitting
                                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                            : "bg-green-600 text-white hover:bg-green-700"
                                    }`}
                                >
                                    <Check className="w-4 h-4" />
                                    Import All Valid ({stats.validPositions})
                                </button>
                            </div>
                        </div>
                        {renderIssuesDrawer()}
                    </>
                ) : (
                    renderSuccessScreen()
                )}
            </div>
        </FixedModal>
    );
};

export default AddQuickPositionModal;