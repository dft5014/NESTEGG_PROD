// QuickReconciliationModal.js (LEAN VERSION)
// - one screen, simple filters
// - cash-like assets + liabilities in one table
// - paste anywhere (tab/comma/newlines), fills visible rows top->bottom
// - update button applies only changed rows (with small retry logic)
// - minimal local state; no localStorage, no schema, no history

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  X, RefreshCw, Search, Building2, ChevronRight, AlertTriangle, CheckCircle, Trash2, Eye, EyeOff, Loader2
} from "lucide-react";

// ===== External app hooks / API (keep signatures) =====
import { useAccounts } from "@/store/hooks/useAccounts";
import { useDetailedPositions } from "@/store/hooks/useDetailedPositions";
import { updateCashPosition, updateLiability, updateOtherAsset } from "@/utils/apimethods/positionMethods";
import { popularBrokerages } from "@/utils/constants";

// ------- Utils -------
const fmtUSD = (n, hide=false) =>
  hide ? "••••••" : Number(n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const toNum = (s) => {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  const n = Number(String(s ?? "").replace(/[^\d.-]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};
const getLogo = (name) => {
  if (!name) return null;
  const hit = popularBrokerages.find((b) => b.name.toLowerCase() === String(name).toLowerCase());
  return hit?.logo || null;
};
const isClearlySecurityWord = /(stock|equity|etf|fund|mutual|option|bond|crypto|security|shares?)/i;
const isCashLikeWord = /(cash|checking|savings|mm|money\s?market|hysa|cd|certificate|sweep|settlement|brokerage\s?cash)/i;
const isCashLike = (pos) => {
  const t = String(pos.type || "").toLowerCase();
  const n = `${pos.name || ""} ${pos.identifier || ""} ${pos.inv_account_name || ""}`.toLowerCase();
  if (isClearlySecurityWord.test(n)) return false;
  if (["cash","checking","savings","money_market","mm","sweep","deposit"].includes(t)) return true;
  return isCashLikeWord.test(n);
};

// ===== Simple currency input (robust paste, stable caret on paste) =====
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
        text-gray-900 dark:text-white
        placeholder-gray-400 dark:placeholder-zinc-500
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
        border-gray-300 dark:border-zinc-700
        font-medium [font-variant-numeric:tabular-nums]`}
    />
  );
});

// ===== Simple toast =====
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

// ===== Modal shell (very small) =====
function ModalShell({ isOpen, onClose, title }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-[10000] mx-auto my-6 w-full max-w-6xl">
        <div className="rounded-2xl bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 sticky top-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-zinc-100">{title}</h1>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {/* content slot via children */}
            {arguments[0].children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Main =====
export default function QuickReconciliationModal({ isOpen, onClose }) {
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: rawPositions = [], loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();
  const loading = accountsLoading || positionsLoading;

  const [showValues, setShowValues] = useState(true);
  const [instFilter, setInstFilter] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const showToast = useCallback((type, text, ms=3000) => {
    setToast({ type, text });
    if (toastRef.current) clearTimeout(toastRef.current);
    if (ms>0) toastRef.current = setTimeout(()=>setToast(null), ms);
  }, []);

  useEffect(() => () => { if (toastRef.current) clearTimeout(toastRef.current); }, []);

  // Normalize positions (assets)
  const positions = useMemo(() => {
    return (rawPositions || []).map((p) => {
      const id = p.itemId ?? p.item_id ?? p.id;
      const accountId = p.accountId ?? p.inv_account_id ?? p.account_id;
      const type = String(p.assetType ?? p.item_type ?? p.asset_type ?? p.position_type ?? "").toLowerCase();
      const name = p.name ?? p.identifier ?? "Unnamed";
      const currentValue = Number(p.currentValue ?? p.current_value ?? 0);
      const institution = p.institution ?? "Unknown Institution";
      const identifier = p.identifier ?? p.symbol ?? "";
      const inv_account_name = p.inv_account_name ?? p.accountName ?? p.account_name ?? "";
      return { id, accountId, institution, type, name, currentValue, identifier, inv_account_name };
    });
  }, [rawPositions]);

  // Liabilities (flat list, already grouped on backend in your app)
  // We'll treat all of them as editable lines here.
  const [liabs, setLiabs] = useState([]);
  useEffect(() => {
    // Minimal: infer liabilities from positions input if you must; normally you'd have a hook.
    // Here we assume liabilities are mixed in elsewhere; if not, leave empty and it still works for cash.
    // If your app supplies groupedLiabilities elsewhere, you can wire that in here.
  }, []);

  // Cash-like asset rows
  const cashAssets = useMemo(() => positions.filter(isCashLike), [positions]);

  // Row model (assets + liabs)
  const rows = useMemo(() => {
    const aRows = cashAssets.map(a => ({
      _kind: "asset",
      id: a.id,
      institution: a.institution || "Unknown Institution",
      name: a.name || "Account",
      sub: a.inv_account_name || "",
      identifier: a.identifier || "",
      type: a.type || "",
      nest: Number(a.currentValue || 0),
    }));
    const lRows = (liabs || []).map(l => ({
      _kind: "liability",
      id: l.id,
      institution: l.institution || "Unknown Institution",
      name: l.name || "Liability",
      sub: l.inv_account_name || "",
      identifier: l.identifier || "",
      type: String(l.type || ""),
      nest: Number(l.currentValue || 0),
    }));
    return [...aRows, ...lRows];
  }, [cashAssets, liabs]);

  // Draft map (id-kind key → number)
  const keyOf = (r) => `${r._kind}:${r.id}`;
  const [drafts, setDrafts] = useState({});
  const withCalc = useMemo(() => {
    // filter before calculation
    let list = rows;
    if (instFilter.trim()) {
      const s = instFilter.trim().toLowerCase();
      list = list.filter(r => (r.institution || "").toLowerCase().includes(s));
    }
    // attach calc
    const out = list.map((r) => {
      const key = keyOf(r);
      const stmt = drafts[key] != null ? Number(drafts[key]) : r.nest;
      const diff = stmt - r.nest;
      const pct = r.nest !== 0 ? (diff / r.nest) * 100 : 0;
      return { ...r, _key: key, stmt, diff, pct };
    });
    return onlyChanged ? out.filter(r => r.stmt !== r.nest) : out;
  }, [rows, drafts, instFilter, onlyChanged]);

  // Bulk paste: fills visible rows top → bottom
  const onBulkPaste = (e) => {
    const txt = e.clipboardData?.getData("text") || "";
    if (!txt) return;
    const hasTabs = txt.includes("\t");
    const lines = txt.trim().split(/\r?\n/).map(row => hasTabs ? row.split("\t") : (row.includes(",") ? row.split(",") : [row]));
    const flat = lines.flat().map(s => toNum(String(s).trim())).filter(Number.isFinite);
    if (!flat.length) return;
    e.preventDefault();
    const keys = withCalc.map(r => r._key);
    setDrafts(prev => {
      const next = { ...prev };
      for (let i = 0; i < keys.length && i < flat.length; i++) next[keys[i]] = flat[i];
      return next;
    });
    showToast("success", `Pasted ${Math.min(keys.length, flat.length)} value(s)`);
  };

  // Save: only changed lines
  const saveAll = async () => {
    const changes = rows
      .map(r => {
        const key = keyOf(r);
        const d = drafts[key];
        if (d == null || !Number.isFinite(Number(d))) return null;
        if (Number(d) === r.nest) return null;
        return { ...r, next: Number(d) };
      })
      .filter(Boolean);

    if (!changes.length) { showToast("info", "No changes to apply"); return; }

    const buildLiabilityPayload = (r) => {
      const t = String(r.type || "").toLowerCase();
      if (t.includes("mortgage") || t.includes("loan")) return { principal_balance: r.next };
      if (t.includes("credit")) return { current_balance: r.next };
      return { current_balance: r.next };
    };

    const maxConcurrent = 3, maxRetries = 2;
    let idx = 0;
    const failed = [];

    const runOne = async (job) => {
      const attempt = async () => {
        if (job._kind === "asset") return updateCashPosition(job.id, { amount: job.next }).catch(async () => {
          // fallback for non-cash assets if backend expects other endpoint
          return updateOtherAsset(Number(job.id), { current_value: job.next });
        });
        if (job._kind === "liability") return updateLiability(job.id, buildLiabilityPayload(job));
      };
      for (let t = 0; t <= maxRetries; t++) {
        try { await attempt(); return; }
        catch (e) { if (t === maxRetries) throw e; await new Promise(res => setTimeout(res, 300 * (t + 1))); }
      }
    };

    try {
      const pool = Array.from({ length: Math.min(maxConcurrent, changes.length) }, async function worker() {
        while (idx < changes.length) {
          const j = changes[idx++];
          try { await runOne(j); } catch { failed.push(j); }
        }
      });
      await Promise.all(pool);
      await Promise.all([refreshPositions?.(), refreshAccounts?.()]);

      if (failed.length) showToast("warning", `Saved with ${failed.length} failure(s)`);
      else showToast("success", `Updated ${changes.length} line(s)`);
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to apply updates");
    }
  };

  const clearDrafts = () => setDrafts({});

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Quick Update">
      <div
        className="flex flex-col gap-4"
        onPaste={(e) => {
          const isField = e.target?.closest?.("input, textarea, [contenteditable='true']");
          if (isField && !(e.metaKey || e.altKey)) return; // let field own the paste unless user holds a modifier
          onBulkPaste(e);
        }}
      >
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
            <input
              value={instFilter}
              onChange={(e)=>setInstFilter(e.target.value)}
              placeholder="Filter by institution…"
              className="pl-8 pr-2 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200">
            <input type="checkbox" checked={onlyChanged} onChange={e=>setOnlyChanged(e.target.checked)} />
            Show only changed
          </label>

          <button
            onClick={()=>setShowValues(s=>!s)}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
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
                await Promise.all([refreshPositions?.(), refreshAccounts?.()]);
                showToast("success", "Refreshed");
              } catch {
                showToast("error", "Refresh failed");
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={saveAll}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            title="Apply changed values"
          >
            Update All <ChevronRight className="inline w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Table */}
        <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="bg-gray-50 dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-zinc-200">
            Cash-like Assets & Liabilities
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[840px]">
              <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-10">
                <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
                  <th className="px-4 py-2 text-left">Institution</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Identifier</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Nest</th>
                  <th className="px-3 py-2 text-center">Statement</th>
                  <th className="px-3 py-2 text-right">Δ</th>
                  <th className="px-3 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {(loading ? Array.from({length: 6}).map((_,i)=>({ _loading:true, id:i })) : withCalc).map((r, idx) => {
                  if (r._loading) {
                    return (
                      <tr key={`skeleton-${idx}`}>
                        <td className="px-4 py-3" colSpan={8}>
                          <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
                        </td>
                      </tr>
                    );
                  }
                  const changed = r.stmt !== r.nest;
                  const nextId = withCalc[idx+1]? `qr-input-${withCalc[idx+1]._key}` : undefined;
                  const logo = getLogo(r.institution);
                  return (
                    <tr key={r._key} className={changed ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {logo ? <img src={logo} alt={r.institution} className="w-6 h-6 rounded object-contain" /> : <Building2 className="w-5 h-5 text-gray-400" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">{r.institution}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-zinc-100">
                        {r.name}
                        {r.sub ? <div className="text-xs text-gray-500 dark:text-zinc-400">{r.sub}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{r.identifier || "—"}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{r.type || "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-800 dark:text-zinc-100">{fmtUSD(r.nest, !showValues)}</td>
                      <td className="px-3 py-2 text-center">
                        <CurrencyInput
                          id={`qr-input-${r._key}`}
                          value={r.stmt}
                          onValueChange={(v) => setDrafts(prev => ({ ...prev, [r._key]: Number.isFinite(v) ? v : 0 }))}
                          nextFocusId={nextId ? `qr-input-${nextId}` : undefined}
                          aria-label={`Statement for ${r.name}`}
                          className={changed ? "border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/40" : ""}
                        />
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${
                        r.diff > 0 ? "text-green-600" : r.diff < 0 ? "text-red-600" : "text-gray-500 dark:text-zinc-400"
                      }`}>
                        {fmtUSD(r.diff, !showValues)}
                      </td>
                      <td className={`px-3 py-2 text-right ${
                        r.nest === 0 ? "text-gray-500 dark:text-zinc-400" : (r.diff > 0 ? "text-green-600" : "text-red-600")
                      }`}>
                        {r.nest === 0 ? "—" : `${r.pct.toFixed(2)}%`}
                      </td>
                    </tr>
                  );
                })}
                {!loading && withCalc.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500 dark:text-zinc-400 text-center" colSpan={8}>
                      No cash-like assets or liabilities found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
          <CheckCircle className="w-4 h-4 text-emerald-600" /> Unchanged rows will not be updated
          <AlertTriangle className="w-4 h-4 text-amber-500 ml-4" /> Paste with tabs/commas/newlines to fill down the visible list
        </div>
      </div>

      {toast && <Toast type={toast.type} text={toast.text} onClose={() => setToast(null)} />}
    </ModalShell>
  );
}

// Optional button (kept simple)
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
