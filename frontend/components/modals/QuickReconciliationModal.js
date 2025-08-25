// QuickReconciliationModal.js — corrected & hardened
// - Institution normalization (account→institution), handles "Other Assets"
// - Cash-like assets + liabilities + other assets in one editable table
// - Bulk paste top→bottom (tabs/commas/newlines), header-aware
// - Enter to advance, ⌘/Ctrl+Enter to Update All, Esc to close
// - KPIs, sort (institution/Δ/%/kind), hide zero rows, show-only-changed
// - Institution cards with net rollups + drilldowns (positions/liabilities)
// - Sticky action bar when there are pending edits
// - Save pool with small retry; surface failed rows + “Retry failed”
// - No schemas/localStorage; minimal state

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  X, RefreshCw, Building2, ChevronRight, AlertTriangle, CheckCircle,
  Trash2, Eye, EyeOff, Loader2, Info, ArrowUpDown
} from "lucide-react";

import { useDataStore } from "@/store/DataStore";
import { useAccounts } from "@/store/hooks/useAccounts";
import { useDetailedPositions } from "@/store/hooks/useDetailedPositions";
import { updateCashPosition, updateLiability, updateOtherAsset } from "@/utils/apimethods/positionMethods";
import { popularBrokerages } from "@/utils/constants";

// ---------- utils ----------
const fmtUSD = (n, hide=false) =>
  hide ? "••••••" : Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const toNum = (s) => {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  const n = Number(String(s ?? "").replace(/[^\d.-]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

// broaden to include metals, keep this separate from cash-like
const isSecurityish = /(stock|equity|etf|fund|mutual|option|bond|crypto|security|shares?|metal|gold|silver|bullion)/i;
const isCashLikeWord = /(cash|checking|savings|mm|money\s?market|hysa|cd|certificate|sweep|settlement|brokerage\s?cash)/i;
const isLiabilityish = /(loan|mortgage|credit|debt|liab|card|payable|auto|student|heloc|loc)/i;

// ── Timestamp helpers (robust to: space vs T, extra microseconds, missing Z, epoch sec/ms) ──
const parseUTC = (ts) => {
  if (!ts) return null;
  if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;

  // numbers: epoch seconds or ms
  if (typeof ts === "number") {
    const ms = ts > 1e12 ? ts : ts * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  let s = String(ts).trim();
  if (!s) return null;

  // allow "YYYY-MM-DD HH:mm:ss(.ffffff)" → "YYYY-MM-DDTHH:mm:ss(.fff)"
  s = s.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1"); // strip microseconds > 3

  // add Z if no timezone indicated
  if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s += "Z";

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const toIsoAttr = (ts) => {
  const d = parseUTC(ts);
  return d ? d.toISOString() : undefined;
};

const formatLocalDateTime = (ts) => {
  const d = parseUTC(ts);
  return d ? d.toLocaleString(undefined, { hour12: true, timeZoneName: "short" }) : "—";
};

const formatAge = (ts) => {
  const d = parseUTC(ts);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "0m";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};


const isCashLike = (pos) => {
  const t = String(pos.type || "").toLowerCase();
  const n = `${pos.name || ""} ${pos.identifier || ""} ${pos.inv_account_name || ""}`.toLowerCase();
  if (isSecurityish.test(n)) return false;
  if (["cash","checking","savings","money_market","mm","sweep","deposit"].includes(t)) return true;
  return isCashLikeWord.test(n);
};

const OTHER_INST = "Other Assets";

// small logo cache
function useLogoMap() {
  return useMemo(() => {
    const m = new Map();
    for (const b of popularBrokerages || []) {
      if (b?.name) m.set(String(b.name).toLowerCase(), b.logo || null);
    }
    return m;
  }, []);
}
const getLogoFrom = (logoMap, name) => {
  if (!name) return null;
  return logoMap.get(String(name).toLowerCase()) || null;
};

// ---------- currency input ----------
const CurrencyInput = React.memo(function CurrencyInput({
  id, value, onValueChange, onFocus, onBlur, nextFocusId, "aria-label": ariaLabel, className=""
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(Number.isFinite(value) ? String(value) : "");
  const ref = useRef(null);

  useEffect(() => {
    if (!focused) {
      const next = Number.isFinite(value) ? String(value) : "";
      if (toNum(raw) !== toNum(next)) setRaw(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const sanitize = (s) => {
    const cleaned = String(s).replace(/[$,\s]/g, "").replace(/[^0-9.\-]/g, "");
    const parts = cleaned.split(".");
    const withOneDot = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
    return withOneDot.replace(/(?!^)-/g, "");
  };

  const handleChange = (e) => {
    const nextRaw = sanitize(e.target.value);
    setRaw(nextRaw);
    onValueChange?.(Number(nextRaw || 0));
  };

  const handlePaste = (e) => {
    const txt = e.clipboardData.getData("text") || "";
    const cleaned = sanitize(txt);
    e.preventDefault();
    e.stopPropagation();
    setRaw(cleaned);
    onValueChange?.(Number(cleaned || 0));
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        const end = el.value.length;
        try { el.setSelectionRange(end, end); } catch {}
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && nextFocusId) {
      e.preventDefault();
      const nextEl = document.getElementById(nextFocusId);
      if (nextEl) {
        try { nextEl.focus({ preventScroll: true }); } catch { nextEl.focus(); }
      }
    }
    if (["e","E"].includes(e.key)) e.preventDefault();
  };

  const fmt = (n) =>
    Number.isFinite(n)
      ? new Intl.NumberFormat("en-US", { style:"currency", currency:"USD" }).format(n)
      : "";

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode="decimal"
      value={focused ? raw : fmt(value)}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
        requestAnimationFrame(() => {
          try {
            const end = e.target.value?.length ?? 0;
            e.target.setSelectionRange(end, end);
          } catch {}
        });
      }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      onChange={handleChange}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      placeholder="$0.00"
      aria-label={ariaLabel}
      className={`${className} w-28 px-2 py-1 text-center rounded-lg border
        bg-white dark:bg-zinc-900
        text-zinc-900 dark:text-zinc-100
        placeholder-zinc-400 dark:placeholder-zinc-500
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
        border-zinc-300 dark:border-zinc-700
        font-medium [font-variant-numeric:tabular-nums]`}
    />
  );
});

// ---------- toast ----------
function Toast({ type="info", text, onClose }) {
  const tone = { info:"bg-blue-600", success:"bg-emerald-600", error:"bg-rose-600", warning:"bg-amber-600" }[type] || "bg-blue-600";
  return (
    <div className="fixed bottom-4 right-4 z-[10000]">
      <div className={`text-white ${tone} shadow-lg rounded-lg px-4 py-3 flex items-center gap-3`}>
        <span className="text-sm">{text}</span>
        <button onClick={onClose} className="rounded hover:bg-white/10 p-1" aria-label="Close toast">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------- modal ----------
function ModalShell({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-[10000] mx-auto my-6 w-full max-w-7xl">
        <div className="rounded-2xl bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 sticky top-0">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
            <button onClick={onClose} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">
              <X className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </button>
          </div>
          <div className="p-4 sm:p-6 max-h-[85vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ---------- main ----------
export default function QuickReconciliationModal({ isOpen, onClose }) {
  const { state, actions } = useDataStore();
  const { groupedLiabilities } = state || {};
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: rawPositions = [], loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();

  const liabsLoading = groupedLiabilities?.loading;
  const loading = accountsLoading || positionsLoading || liabsLoading;

  // UI state
  const [showValues, setShowValues] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showLiabs, setShowLiabs] = useState(true);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [hideZeros, setHideZeros] = useState(false);
  const [sortBy, setSortBy] = useState("institution"); // 'institution' | 'delta' | 'pct' | 'kind'
  const [sortDir, setSortDir] = useState("asc"); // 'asc' | 'desc'
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  const [failedRows, setFailedRows] = useState([]);
  const [headerPasteWarn, setHeaderPasteWarn] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const showToast = useCallback((type, text, ms=3000) => {
    setToast({ type, text });
    if (toastRef.current) clearTimeout(toastRef.current);
    if (ms>0) toastRef.current = setTimeout(()=>setToast(null), ms);
  }, []);
  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current); }, []);

  // keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveAll(); }
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ensure liabilities fetched
  useEffect(() => {
    if (!groupedLiabilities?.lastFetched && !groupedLiabilities?.loading) {
      actions?.fetchGroupedLiabilitiesData?.();
    }
  }, [groupedLiabilities?.lastFetched, groupedLiabilities?.loading, actions]);

  // build account map for institution normalization
  const accountById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach(a => m.set(String(a.id), a));
    return m;
  }, [accounts]);

  const normalizeInstitution = useCallback((rawInst, accountId, type) => {
    const fromAcct = accountById.get(String(accountId))?.institution;
    const base = (fromAcct || rawInst || "").trim();
    if (base) return base;
    if (!base || String(type||"").toLowerCase() === "other") return OTHER_INST;
    return OTHER_INST;
  }, [accountById]);

  // normalize ALL positions
  const allPositions = useMemo(() => {
    return (rawPositions || []).map((p) => {
      const id = p.itemId ?? p.item_id ?? p.id;
      const accountId = p.accountId ?? p.inv_account_id ?? p.account_id;
      const type = String(p.assetType ?? p.item_type ?? p.asset_type ?? p.position_type ?? "").toLowerCase();
      const name = p.name ?? p.identifier ?? "Unnamed";
      const currentValue = Number(p.currentValue ?? p.current_value ?? 0);
      const institution = normalizeInstitution(p.institution, accountId, type);
      const identifier = p.identifier ?? p.symbol ?? "";
      const inv_account_name = p.inv_account_name ?? p.accountName ?? p.account_name ?? "";
      const last_update = p.balance_last_updated ?? p.last_update ?? p.balanceLastUpdated ?? null;
      return { id, accountId, institution, type, name, currentValue, identifier, inv_account_name, last_update };
    });
  }, [rawPositions, normalizeInstitution]);

  // normalize liabilities FIRST (so otherAssets can compare signatures safely)
  const liabs = useMemo(() => {
    const list = (groupedLiabilities?.data || []).map((L) => {
      const details = L.liability_details || {};
      const id =
        details.liability_id ||
        details.item_id ||
        L.item_id ||
        L.liability_id ||
        L.id ||
        L.history_id;

      const t = (L.liability_type || L.item_type || L.type || "liability").toLowerCase();
      const val = Number(L.total_current_balance ?? L.current_balance ?? L.balance ?? 0);
      const accountId = L.inv_account_id ?? L.account_id ?? null;
      const inst = normalizeInstitution(L.institution, accountId, t);

      const last_update =
         L.balance_last_updated ?? details.balance_last_updated ?? L.last_update ?? L.updated_at ?? null;
      return {
        id,
        institution: inst || OTHER_INST,
        name: L.name || L.identifier || "Liability",
        identifier: L.identifier || "",
        type: t,
        liability_type: t,
        currentValue: val,
        inv_account_name: L.inv_account_name ?? L.account_name ?? "",
        last_update,
      };
    });
    return list;
  }, [groupedLiabilities?.data, normalizeInstitution]);



  // signatures for fast de-dupe against "other assets"
  const liabilitySigSet = useMemo(() => {
    const s = new Set();
    for (const l of liabs) {
      const inst = (l.institution || "").toLowerCase();
      const id = (l.identifier || "").toLowerCase();
      const nm = (l.name || "").toLowerCase();
      if (inst && id) s.add(`${inst}::id::${id}`);
      if (inst && nm) s.add(`${inst}::nm::${nm}`);
    }
    return s;
  }, [liabs]);

  const cashAssets = useMemo(() => allPositions.filter(isCashLike), [allPositions]);

  // carefully determine "other" assets (not cash, not securityish, not known-liability, and either 'other' or missing type)
  const otherAssets = useMemo(() => {
    return allPositions
      .map(p => ({ ...p, institution: normalizeInstitution(p.institution, p.accountId, p.type) || OTHER_INST }))
      .filter(p => {
        const t = String(p.type || "").toLowerCase();
        const inst = (p.institution || "").toLowerCase();
        const id = (p.identifier || "").toLowerCase();
        const nm = (p.name || "").toLowerCase();

        const notCash = !isCashLike(p);
        const notSecurity = !isSecurityish.test(`${nm} ${id}`);
        const notLiabilityWord = !isLiabilityish.test(t) && !isLiabilityish.test(nm);
        const isOtherish = t === "other" || !t;
        const notInLiabs = !liabilitySigSet.has(`${inst}::id::${id}`) && !liabilitySigSet.has(`${inst}::nm::${nm}`);

        return notCash && notSecurity && notLiabilityWord && isOtherish && notInLiabs;
      });
  }, [allPositions, normalizeInstitution, liabilitySigSet]);

  // editable rows (cash + liabilities + other)
  // Use strong, per-row keys so one edit doesn't leak to others
  const makeRowKey = (r) => `${r._kind}:${r.id ?? r.identifier ?? r.name}:${r.institution}`;

  const rows = useMemo(() => {
    const aRows = cashAssets.map(a => ({
      _kind: "asset",
      id: a.id,
      institution: a.institution || OTHER_INST,
      name: a.name || "Account",
      sub: a.inv_account_name || "",
      identifier: a.identifier || "",
      type: a.type || "",
      nest: Number(a.currentValue || 0),
      last_update: a.last_update ?? null,
    }));
    const lRows = liabs.map(l => ({
      _kind: "liability",
      id: l.id,
      institution: l.institution || OTHER_INST,
      name: l.name || "Liability",
      sub: l.inv_account_name || "",
      identifier: l.identifier || "",
      type: String(l.type || ""),
      nest: Number(l.currentValue || 0),
      last_update: l.last_update ?? null,
    }));
    const oRows = otherAssets.map(o => ({
      _kind: "other",
      id: o.id,
      institution: o.institution || OTHER_INST,
      name: o.name || "Other Asset",
      sub: o.inv_account_name || "",
      identifier: o.identifier || "",
      type: o.type || "other",
      nest: Number(o.currentValue || 0),
      last_update: o.last_update ?? null, 
    }));

    const uniq = new Map();
    for (const r of [...aRows, ...lRows, ...oRows]) {
      const key = makeRowKey(r);
      if (!uniq.has(key)) uniq.set(key, r);
    }
    return Array.from(uniq.values());
  }, [cashAssets, liabs, otherAssets]);

  // institution summaries (cards)
  const instCards = useMemo(() => {
    const map = new Map();
    const ensure = (inst) => {
      if (!map.has(inst)) map.set(inst, { inst, assets: 0, liabs: 0, others: 0, countA: 0, countL: 0, countO: 0 });
      return map.get(inst);
    };
    rows.forEach(r => {
      const g = ensure(r.institution);
      if (r._kind === "asset") { g.assets += Math.abs(r.nest); g.countA += 1; }
      else if (r._kind === "liability") { g.liabs += Math.abs(r.nest); g.countL += 1; }
      else { g.others += Math.abs(r.nest); g.countO += 1; }
    });
    return Array.from(map.values())
      .map(g => ({ ...g, net: g.assets + g.others - g.liabs, totalAbs: g.assets + g.others + g.liabs }))
      .sort((a,b) => b.totalAbs - a.totalAbs);
  }, [rows]);

  // drilldowns (positions list limited to cash-like + other; exclude securities/crypto/metal)
  const positionsByInstitution = useMemo(() => {
    const map = new Map();
    allPositions.forEach(p => {
      const inst = p.institution || OTHER_INST;
      const nameId = `${String(p.name||"").toLowerCase()} ${String(p.identifier||"").toLowerCase()}`;
      const isOtherish = (p.type === "other" || !p.type);
      const notInLiabs = !liabilitySigSet.has(`${String(inst).toLowerCase()}::id::${(p.identifier||"").toLowerCase()}`)
                       && !liabilitySigSet.has(`${String(inst).toLowerCase()}::nm::${String(p.name||"").toLowerCase()}`);

      // show only cash-like and valid "other" assets; exclude securityish
      const include = (isCashLike(p) || (isOtherish && notInLiabs)) && !isSecurityish.test(nameId);
      if (!include) return;

      if (!map.has(inst)) map.set(inst, []);
      map.get(inst).push({
        id: p.id, name: p.name || p.identifier || "Position",
        identifier: p.identifier || "", type: p.type || "",
        value: Number(p.currentValue || 0), accountName: p.inv_account_name || "",
      });
    });
    Array.from(map.values()).forEach(list => list.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)));
    return map;
  }, [allPositions, liabilitySigSet]);

  const liabilitiesByInstitution = useMemo(() => {
    const m = new Map();
    liabs.forEach(l => {
      const inst = l.institution || OTHER_INST;
      if (!m.has(inst)) m.set(inst, []);
      m.get(inst).push({
        id: l.id, name: l.name || "Liability",
        identifier: l.identifier || "", type: l.type || "",
        value: Number(l.currentValue || 0), accountName: l.inv_account_name || "",
      });
    });
    Array.from(m.values()).forEach(list => list.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)));
    return m;
  }, [liabs]);

  // drafts & computed table
  const [drafts, setDrafts] = useState({});
  const keyOf = (r) => makeRowKey(r);

  const filteredCalc = useMemo(() => {
    let list = rows.filter(r => (showAssets ? true : r._kind !== "asset"))
                   .filter(r => (showLiabs ? true : r._kind !== "liability"));
    if (selectedInstitution) list = list.filter(r => r.institution === selectedInstitution);

    let out = list.map((r) => {
      const key = keyOf(r);
      const stmt = drafts[key] != null ? Number(drafts[key]) : r.nest;
      const diff = stmt - r.nest;
      const pct = r.nest !== 0 ? (diff / r.nest) * 100 : (stmt !== 0 ? 100 : 0);
      return { ...r, _key: key, stmt, diff, pct };
    });

    if (hideZeros) {
      out = out.filter(r => !(r.nest === 0 && drafts[r._key] == null));
    }
    if (onlyChanged) {
      out = out.filter(r => r.stmt !== r.nest);
    }

    const dir = (sortDir === "desc") ? -1 : 1;
    out.sort((a, b) => {
      switch (sortBy) {
        case "delta": return (a.diff - b.diff) * dir;
        case "pct": return (a.pct - b.pct) * dir;
        case "kind": return ((a._kind > b._kind) - (a._kind < b._kind)) * dir;
        case "updated": {
          const ta = a.last_update ? new Date(ensureUtcZ(a.last_update)).getTime() : -Infinity;
          const tb = b.last_update ? new Date(ensureUtcZ(b.last_update)).getTime() : -Infinity;
          return (ta - tb) * dir;
           }
        case "institution":
        default:
          return ((a.institution > b.institution) - (a.institution < b.institution)) * dir;
      }
    });

    return out;
  }, [rows, drafts, showAssets, showLiabs, selectedInstitution, hideZeros, onlyChanged, sortBy, sortDir]);

  // KPIs for visible list
  const kpis = useMemo(() => {
    let a = 0, l = 0, o = 0, delta = 0, changed = 0;
    for (const r of filteredCalc) {
      if (r._kind === 'asset') a += r.nest || 0;
      else if (r._kind === 'liability') l += r.nest || 0;
      else o += r.nest || 0;
      if (r.stmt !== r.nest) { changed++; delta += (r.stmt - r.nest) || 0; }
    }
    return { assets: a, liabilities: l, others: o, net: a + o - l, delta, changed, count: filteredCalc.length };
  }, [filteredCalc]);

  const logoMap = useLogoMap();

  // bulk paste
  const onBulkPaste = (e) => {
    const txt = e.clipboardData?.getData("text") || "";
    if (!txt) return;
    const hasTabs = txt.includes("\t");
    const lines = txt.trim().split(/\r?\n/).map(row => hasTabs ? row.split("\t") : (row.includes(",") ? row.split(",") : [row]));
    const flatRaw = lines.flat().map(s => String(s).trim());
    const nums = flatRaw.map(toNum).filter(Number.isFinite);
    if (!nums.length) return;

    // warn if first token looked like header
    const firstWasNumeric = Number.isFinite(toNum(flatRaw[0])) && /\d/.test(flatRaw[0]);
    setHeaderPasteWarn(!firstWasNumeric);

    e.preventDefault();
    const keys = filteredCalc.map(r => r._key);
    setDrafts(prev => {
      const next = { ...prev };
      for (let i = 0; i < keys.length && i < nums.length; i++) next[keys[i]] = nums[i];
      return next;
    });
    showToast("success", `Pasted ${Math.min(keys.length, nums.length)} value(s)`);
  };

  // save helpers
  const liabilityPayloadFor = (row) => ({
    current_balance: row.next
    // Optionally include type if you want parity with QED form:
    // liability_type: row.liability_type || row.type
  });

  const runOne = async (job) => {
    const attempt = async () => {
      if (job._kind === "asset") {
        return updateCashPosition(job.id, { amount: job.next }).catch(async () =>
          updateOtherAsset(Number(job.id), { current_value: job.next })
        );
      }
      if (job._kind === "liability") return updateLiability(job.id, liabilityPayloadFor(job));
      if (job._kind === "other") return updateOtherAsset(Number(job.id), { current_value: job.next });
    };
    const maxRetries = 2;
    for (let t = 0; t <= maxRetries; t++) {
      try { await attempt(); return; }
      catch (e) {
        if (t === maxRetries) throw e;
        await new Promise(res => setTimeout(res, 300 * (t + 1)));
      }
    }
  };

  const collectChangesFrom = (sourceRows) => {
    return sourceRows
      .map(r => {
        const key = keyOf(r);
        const d = drafts[key];
        if (d == null || !Number.isFinite(Number(d))) return null;
        if (Number(d) === r.nest) return null;
        return { ...r, next: Number(d) };
      })
      .filter(Boolean);
  };

  const saveAll = async () => {
    const changes = collectChangesFrom(rows);
    if (!changes.length) { showToast("info", "No changes to apply"); return; }

    let idx = 0;
    const failed = [];
    const maxConcurrent = 3;

    try {
      const pool = Array.from({ length: Math.min(maxConcurrent, changes.length) }, async function worker() {
        while (idx < changes.length) {
          const j = changes[idx++];
          try { await runOne(j); } catch { failed.push(j); }
        }
      });
      await Promise.all(pool);
      await Promise.all([
        refreshPositions?.(),
        refreshAccounts?.(),
        actions?.fetchGroupedLiabilitiesData?.(true),
      ]);

      if (failed.length) {
        setFailedRows(failed.map(f => f._key));
        showToast("warning", `Saved with ${failed.length} failure(s)`);
      } else {
        setFailedRows([]);
        showToast("success", `Updated ${changes.length} line(s)`);
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to apply updates");
    }
  };

  const retryFailed = async () => {
    if (!failedRows.length) return;
    const failedSource = rows.filter(r => failedRows.includes(keyOf(r)));
    const changes = collectChangesFrom(failedSource);
    if (!changes.length) { setFailedRows([]); return; }

    let idx = 0;
    const stillFailed = [];
    const maxConcurrent = 2;

    try {
      const pool = Array.from({ length: Math.min(maxConcurrent, changes.length) }, async function worker() {
        while (idx < changes.length) {
          const j = changes[idx++];
          try { await runOne(j); } catch { stillFailed.push(j); }
        }
      });
      await Promise.all(pool);
      await Promise.all([
        refreshPositions?.(),
        refreshAccounts?.(),
        actions?.fetchGroupedLiabilitiesData?.(true),
      ]);

      if (stillFailed.length) {
        setFailedRows(stillFailed.map(f => f._key));
        showToast("warning", `Retry complete: ${stillFailed.length} still failing`);
      } else {
        setFailedRows([]);
        showToast("success", "All failed rows saved");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "Retry failed");
    }
  };

  const clearDrafts = () => setDrafts({});
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  // ---------- render ----------
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Quick Update & Reconcile">
      <div
        className="flex flex-col gap-4 pb-28"
        onPaste={(e) => {
          const isField = e.target?.closest?.("input, textarea, [contenteditable='true']");
          if (isField && !(e.metaKey || e.altKey)) return; // bulk paste only outside inputs unless modifier
          onBulkPaste(e);
        }}
      >
        {/* Institution grid (3 columns on xl) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedInstitution(null)}
            className={`px-3 py-3 rounded-xl border text-left ${
              !selectedInstitution
                ? "bg-blue-600 text-white border-blue-700"
                : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
            title="Show all"
          >
            <div className="font-semibold">All Institutions</div>
            <div className={`${!selectedInstitution ? "text-blue-100" : "text-zinc-600 dark:text-zinc-300"} text-xs`}>
              View every cash line, liability & other asset
            </div>
          </button>

          {instCards.map((g) => {
            const logo = getLogoFrom(logoMap, g.inst);
            const selected = selectedInstitution === g.inst;
            const net = g.net;
            return (
              <button
                key={g.inst}
                onClick={() => setSelectedInstitution(g.inst)}
                className={`px-3 py-3 rounded-xl border text-left flex items-start gap-3 ${
                  selected
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700/50"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
                title={g.inst}
              >
                {logo ? <img src={logo} alt={g.inst} className="w-7 h-7 rounded object-contain" /> : <Building2 className="w-6 h-6 text-zinc-400" />}
                <div className="flex-1">
                  <div className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{g.inst}</div>
                  <div className="text-[11px] text-zinc-700 dark:text-zinc-300">
                    A: {fmtUSD(g.assets, !showValues)} • L: {fmtUSD(g.liabs, !showValues)} • O: {fmtUSD(g.others, !showValues)} • Net:{" "}
                    <span className={`${net >= 0 ? "text-emerald-600" : "text-rose-500"} font-semibold`}>{fmtUSD(net, !showValues)}</span>
                  </div>
                </div>
                {selected ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : null}
              </button>
            );
          })}
        </div>

        {/* Controls + KPIs */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
            <input type="checkbox" checked={showAssets} onChange={e=>setShowAssets(e.target.checked)} />
            Assets (cash)
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
            <input type="checkbox" checked={showLiabs} onChange={e=>setShowLiabs(e.target.checked)} />
            Liabilities
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
            <input type="checkbox" checked={onlyChanged} onChange={e=>setOnlyChanged(e.target.checked)} />
            Only changed
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
            <input type="checkbox" checked={hideZeros} onChange={e=>setHideZeros(e.target.checked)} />
            Hide zero rows
          </label>

          <div className="relative">
            <button
              onClick={() => toggleSort(sortBy)}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2"
              title="Sort"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-sm">Sort: {sortBy} ({sortDir})</span>
            </button>
            <div className="flex gap-1 mt-1">
              {["institution","delta","pct","kind","updated"].map(k => (
                <button
                  key={k}
                  onClick={()=>{ setSortBy(k); setSortDir("asc"); }}
                  className={`px-2 py-0.5 rounded border text-xs ${sortBy===k ? 'bg-blue-600 text-white border-blue-700' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={()=>setShowValues(s=>!s)}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
            title={showValues ? "Hide values" : "Show values"}
          >
            {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>

          <button
            onClick={clearDrafts}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-700/30"
            title="Clear edits"
          >
            <Trash2 className="w-4 h-4 inline -mt-0.5 mr-1" /> Clear
          </button>

          <div className="flex-1" />
          <button
            onClick={async () => {
              try {
                await Promise.all([
                  refreshPositions?.(),
                  refreshAccounts?.(),
                  actions?.fetchGroupedLiabilitiesData?.(true),
                ]);
                showToast("success", "Refreshed");
              } catch {
                showToast("error", "Refresh failed");
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
          </button>
          <button
            onClick={saveAll}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            title="Apply changed values (⌘/Ctrl + Enter)"
          >
            Update All <ChevronRight className="inline w-4 h-4 ml-1" />
          </button>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
            Visible: {kpis.count} rows
          </span>
          <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
            Assets: {fmtUSD(kpis.assets, !showValues)}
          </span>
          <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
            Liabs: {fmtUSD(kpis.liabilities, !showValues)}
          </span>
          <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
            Other: {fmtUSD(kpis.others, !showValues)}
          </span>
          <span className={`px-2 py-1 rounded-lg border text-zinc-900 dark:text-zinc-100 ${
            kpis.delta === 0
              ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50'
          }`}>
            Δ if saved: {fmtUSD(kpis.delta, !showValues)}
          </span>
          <span className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
            Changed: {kpis.changed}
          </span>
        </div>

        {/* Editable table */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedInstitution ? `Lines in ${selectedInstitution}` : "Cash-like Assets, Liabilities & Other Assets"}
          </div>
          <div className="max-h=[54vh] max-h-[54vh] overflow-auto">
            <table className="w-full min-w-[1120px]">
              <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10">
                <tr className="text-xs uppercase text-zinc-600 dark:text-zinc-300">
                  <th className="px-4 py-2 text-left cursor-pointer" onClick={()=>toggleSort('institution')}>Institution</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Identifier</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={()=>toggleSort('kind')}>Type</th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={()=>toggleSort('updated')}>Last Update</th>
                  <th className="px-3 py-2 text-left">Age</th>
                  <th className="px-3 py-2 text-right">Nest</th>
                  <th className="px-3 py-2 text-center">Statement</th>
                  <th className="px-3 py-2 text-right cursor-pointer" onClick={()=>toggleSort('delta')}>Δ</th>
                  <th className="px-3 py-2 text-right cursor-pointer" onClick={()=>toggleSort('pct')}>%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {(loading ? Array.from({length: 6}).map((_,i)=>({ _loading:true, id:i })) : filteredCalc).map((r, idx) => {
                  if (r._loading) {
                    return (
                      <tr key={`skeleton-${idx}`}>
                        <td className="px-4 py-3" colSpan={10}>
                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                        </td>
                      </tr>
                    );
                  }
                  const changed = r.stmt !== r.nest;
                  const nextKey = filteredCalc[idx + 1]?.['_key'];
                  const nextId = nextKey ? `qr-input-${nextKey}` : undefined;
                  const logo = getLogoFrom(logoMap, r.institution);
                  const failed = failedRows.includes(r._key);

                  const kindBadge = r._kind === "asset" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                   : r._kind === "liability" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                   : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";

                  return (
                    <tr
                      key={r._key}
                      className={changed ? "bg-blue-50/40 dark:bg-blue-950/30" : ""}
                      style={changed ? { borderLeft: '3px solid rgba(59,130,246,0.8)' } : undefined}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {logo ? <img src={logo} alt={r.institution} className="w-6 h-6 rounded object-contain" /> : <Building2 className="w-5 h-5 text-zinc-400" />}
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.institution}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span>{r.name}</span>
                          {r.nest === 0 && r.stmt !== 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">NEW</span>
                          ) : null}
                          {failed ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Failed</span>
                          ) : null}
                        </div>
                        {r.sub ? <div className="text-xs text-zinc-600 dark:text-zinc-300">{r.sub}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{r.identifier || "—"}</td>
                      <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <span>{r.type || "—"}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${kindBadge}`}>
                            {r._kind === "asset" ? "Asset" : r._kind === "liability" ? "Liability" : "Other"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {r.last_update ? (
                          <time dateTime={toIsoAttr(r.last_update)} title={`${r.last_update} (UTC)`}>
                            {formatLocalDateTime(r.last_update)}
                          </time>
                        ) : "—"}
                      </td>

                      <td className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {formatAge(r.last_update)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-900 dark:text-zinc-100">{fmtUSD(r.nest, !showValues)}</td>
                      <td className="px-3 py-2 text-center">
                        <CurrencyInput
                          id={`qr-input-${r._key}`}
                          value={r.stmt}
                          onValueChange={(v) => setDrafts(prev => ({ ...prev, [r._key]: Number.isFinite(v) ? v : 0 }))}
                          nextFocusId={nextId}
                          aria-label={`Statement for ${r.name}`}
                          className={changed ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/60" : ""}
                        />
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${
                        r.diff > 0 ? "text-emerald-600" : r.diff < 0 ? "text-rose-600" : "text-zinc-500 dark:text-zinc-400"
                      }`}>
                        {fmtUSD(r.diff, !showValues)}
                      </td>
                      <td className={`px-3 py-2 text-right ${
                        r.nest === 0 ? "text-zinc-500 dark:text-zinc-400" : (r.diff > 0 ? "text-emerald-600" : "text-rose-600")
                      }`}>
                        {r.nest === 0 ? "—" : `${r.pct.toFixed(2)}%`}
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredCalc.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-zinc-600 dark:text-zinc-300 text-center" colSpan={10}>
                      No lines for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Positions drilldown */}
        {selectedInstitution && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Detailed positions in {selectedInstitution}
              </div>
              <div className="ml-auto text-xs text-zinc-700 dark:text-zinc-300">
                {(positionsByInstitution.get(selectedInstitution)?.length || 0)} positions • {(liabilitiesByInstitution.get(selectedInstitution)?.length || 0)} liabilities
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="border-r border-zinc-200 dark:border-zinc-800 min-h-[180px]">
                <div className="px-4 py-2 text-xs uppercase text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 sticky top-0">Positions</div>
                <div className="max-h-[32vh] overflow-auto">
                  <table className="w-full min-w-[560px]">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10">
                      <tr className="text-xs uppercase text-zinc-600 dark:text-zinc-300">
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Identifier</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {(positionsByInstitution.get(selectedInstitution) || []).map(p => (
                        <tr key={p.id}>
                          <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100">
                            {p.name}
                            {p.accountName ? <div className="text-xs text-zinc-600 dark:text-zinc-300">{p.accountName}</div> : null}
                          </td>
                          <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{p.identifier || "—"}</td>
                          <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{p.type || "—"}</td>
                          <td className="px-3 py-2 text-right text-sm text-zinc-900 dark:text-zinc-100">{fmtUSD(p.value, !showValues)}</td>
                        </tr>
                      ))}
                      {(positionsByInstitution.get(selectedInstitution) || []).length === 0 && (
                        <tr><td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300" colSpan={4}>No positions.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="min-h-[180px]">
                <div className="px-4 py-2 text-xs uppercase text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 sticky top-0">Liabilities</div>
                <div className="max-h-[32vh] overflow-auto">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 z-10">
                      <tr className="text-xs uppercase text-zinc-600 dark:text-zinc-300">
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Identifier</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {(liabilitiesByInstitution.get(selectedInstitution) || []).map(l => (
                        <tr key={l.id}>
                          <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100">
                            {l.name}
                            {l.accountName ? <div className="text-xs text-zinc-600 dark:text-zinc-300">{l.accountName}</div> : null}
                          </td>
                          <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{l.identifier || "—"}</td>
                          <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{l.type || "—"}</td>
                          <td className="px-3 py-2 text-right text-sm text-zinc-900 dark:text-zinc-100">{fmtUSD(l.value, !showValues)}</td>
                        </tr>
                      ))}
                      {(liabilitiesByInstitution.get(selectedInstitution) || []).length === 0 && (
                        <tr><td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300" colSpan={4}>No liabilities.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend + paste warning + failed retry */}
        <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
          <CheckCircle className="w-4 h-4 text-emerald-600" /> Unchanged rows are skipped
          <AlertTriangle className="w-4 h-4 text-amber-500 ml-4" /> Paste tabs/commas/newlines to fill the visible list
          {headerPasteWarn && (
            <span className="ml-4 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
              Heads up: first pasted token wasn’t numeric — likely headers ignored.
            </span>
          )}
          {Array.isArray(failedRows) && failedRows.length > 0 && (
            <button
              className="ml-auto px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 hover:opacity-90"
              onClick={retryFailed}
            >
              Retry failed ({failedRows.length})
            </button>
          )}
        </div>
      </div>

      {/* Sticky action bar when there are changes */}
      {kpis.changed > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[10001]">
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur">
            <span className="text-sm text-zinc-800 dark:text-zinc-200">{kpis.changed} change(s)</span>
            <span className="text-sm text-zinc-800 dark:text-zinc-200">Δ {fmtUSD(kpis.delta, !showValues)}</span>
            <button
              onClick={saveAll}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              title="Apply changed values (⌘/Ctrl + Enter)"
            >
              Update All
            </button>
            <button
              onClick={clearDrafts}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm border border-zinc-200 dark:border-zinc-700"
              title="Clear edits"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {toast && <Toast type={toast.type} text={toast.text} onClose={() => setToast(null)} />}
    </ModalShell>
  );
}

// Optional button
export function QuickReconciliationButton({ className = "", label = "Quick Update" }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"}
      >
        {label}
      </button>
      <QuickReconciliationModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
