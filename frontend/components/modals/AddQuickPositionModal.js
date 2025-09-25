// components/modals/AddQuickPositionModal.js
// Quick Add Positions — v3 (clean, build-safe)
// - Accepts grouped seeds { security, crypto, metal, cash, other }
// - One-pass hydration per open (guarded)
// - Stable id-keyed deletes (row & bulk)
// - Clear All that actually clears
// - Import with concurrency
// - Calls parent with: onPositionsSaved(importedCount, flatRemainingArray)

import React, {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  addSecurityPosition,
  addCryptoPosition,
  addMetalPosition,
  addCashPosition,
  addOtherAsset,
  searchSecurities,
  searchFXAssets,
} from "@/utils/apimethods/positionMethods";
import { Trash2, Loader2, Keyboard, Upload, Check, X } from "lucide-react";

// ---- local helpers (no alias issues) ----
const formatCurrency = (n, currency = "USD") =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency })
    : n ?? "";

// ---- data model ----
const initialQueue = { security: [], crypto: [], metal: [], cash: [], other: [] };

function makeId(row) {
  const t = row.type;
  const d = row.data || {};
  if (t === "security") return `${t}|${(d.ticker || "").toUpperCase()}|${d.account_id}`;
  if (t === "crypto")   return `${t}|${(d.symbol || "").toUpperCase()}|${d.account_id}`;
  if (t === "metal")    return `${t}|${(d.symbol || "").toUpperCase()}|${d.account_id}`;
  if (t === "cash")     return `${t}|${d.account_id}|${d.cash_type || "cash"}`;
  return `${t}|${d.asset_name || ""}|${d.account_id || ""}`;
}

function normalizeGrouped(g) {
  return {
    security: Array.isArray(g?.security) ? g.security : [],
    crypto:   Array.isArray(g?.crypto)   ? g.crypto   : [],
    metal:    Array.isArray(g?.metal)    ? g.metal    : [],
    cash:     Array.isArray(g?.cash)     ? g.cash     : [],
    other:    Array.isArray(g?.other)    ? g.other    : [],
  };
}

function flatFromGrouped(g) {
  return [
    ...(g.security || []),
    ...(g.crypto || []),
    ...(g.metal || []),
    ...(g.cash || []),
    ...(g.other || []),
  ];
}

function groupedFromState(state) {
  return {
    security: state.security,
    crypto: state.crypto,
    metal: state.metal,
    cash: state.cash,
    other: state.other,
  };
}

// ---- reducer (use "bucket" so it never conflicts with action.type) ----
function reducer(state, action) {
  switch (action.type) {
    case "INIT_FROM_SEEDS": {
      return {
        security: (action.payload.security || []).map((r) => ({ ...r, id: makeId(r) })),
        crypto:   (action.payload.crypto || []).map((r) => ({ ...r, id: makeId(r) })),
        metal:    (action.payload.metal || []).map((r) => ({ ...r, id: makeId(r) })),
        cash:     (action.payload.cash || []).map((r) => ({ ...r, id: makeId(r) })),
        other:    (action.payload.other || []).map((r) => ({ ...r, id: makeId(r) })),
      };
    }
    case "DELETE_ROW": {
      const { bucket, id } = action;
      return { ...state, [bucket]: state[bucket].filter((r) => r.id !== id) };
    }
    case "DELETE_BULK": {
      const { keys } = action;
      const keySet = new Set(keys);
      return {
        security: state.security.filter((r) => !keySet.has(r.id)),
        crypto:   state.crypto.filter((r) => !keySet.has(r.id)),
        metal:    state.metal.filter((r) => !keySet.has(r.id)),
        cash:     state.cash.filter((r) => !keySet.has(r.id)),
        other:    state.other.filter((r) => !keySet.has(r.id)),
      };
    }
    case "CLEAR_ALL":
      return initialQueue;
    case "PATCH_ROW": {
      const { bucket, id, patch } = action;
      return { ...state, [bucket]: state[bucket].map((r) => (r.id === id ? { ...r, ...patch } : r)) };
    }
    default:
      return state;
  }
}

function AddQuickPositionModal({
  isOpen,
  seedPositions,        // grouped: {security, crypto, metal, cash, other}
  onClose,
  onPositionsSaved,     // EXPECTED BY QuickStart: (importedCount, flatRemainingArray)
  autoRemoveOnSuccess = true,
  importConcurrency = 6,
}) {
  if (!isOpen) return null;

  const [queue, dispatch] = useReducer(reducer, initialQueue);
  const [selected, setSelected] = useState(new Set()); // holds row.id
  const [message, setMessage] = useState(null);
  const [importing, setImporting] = useState(false);
  const [inFlight, setInFlight] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failed, setFailed] = useState([]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const didInitRef = useRef(false);
  const hydratedRef = useRef(false);
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  // Init from seeds once per open
  useEffect(() => {
    if (!isOpen) return;
    if (didInitRef.current) return;
    const norm = normalizeGrouped(seedPositions);
    dispatch({ type: "INIT_FROM_SEEDS", payload: norm });
    didInitRef.current = true;
    hydratedRef.current = false;
    setSelected(new Set());
    setMessage(null);
    setSuccessCount(0);
    setFailed([]);
  }, [isOpen, seedPositions]);

  // Reset guard when closing
  useEffect(() => {
    if (!isOpen) didInitRef.current = false;
  }, [isOpen]);

  // One-pass hydration per open
  useEffect(() => {
    if (!isOpen || hydratedRef.current) return;

    const rows = flatFromGrouped(queue);
    if (rows.length === 0) return;

    hydratedRef.current = true;

    (async () => {
      const hydrateRow = async (r) => {
        try {
          if (r.type === "security") {
            const t = r?.data?.ticker;
            if (!t) return;
            const res = await searchSecurities({ query: t, limit: 1 });
            const best = Array.isArray(res) ? res[0] : null;
            if (best?.price)
              dispatch({ type: "PATCH_ROW", bucket: r.type, id: r.id, patch: { hydratedPrice: best.price } });
            if (best?.name)
              dispatch({ type: "PATCH_ROW", bucket: r.type, id: r.id, patch: { hydratedName: best.name } });
          } else if (r.type === "crypto") {
            const s = r?.data?.symbol;
            if (!s) return;
            const res = await searchFXAssets({ query: s, limit: 1 });
            const best = Array.isArray(res) ? res[0] : null;
            if (best?.price)
              dispatch({ type: "PATCH_ROW", bucket: r.type, id: r.id, patch: { hydratedPrice: best.price } });
          }
        } catch {
          // non-fatal hydration failure
        }
      };

      const pool = [];
      for (const r of rows) {
        pool.push(hydrateRow(r));
        if (pool.length >= 8) {
          await Promise.allSettled(pool.splice(0));
        }
      }
      if (pool.length) await Promise.allSettled(pool);
    })();
  }, [isOpen, queue]);

  const flatQueue = useMemo(() => flatFromGrouped(queue), [queue]);

  // Import pipeline
  const submitAll = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    setInFlight(0);
    setFailed([]);
    setMessage({ type: "info", text: "Importing positions…" });

    let success = 0;
    const jobs = [...flatQueue];
    let idx = 0;

    const runOne = async (r) => {
      try {
        if (r.type === "security")      await addSecurityPosition(r.data);
        else if (r.type === "crypto")   await addCryptoPosition(r.data);
        else if (r.type === "metal")    await addMetalPosition(r.data);
        else if (r.type === "cash")     await addCashPosition(r.data);
        else                            await addOtherAsset(r.data);

        success += 1;
        if (autoRemoveOnSuccess) dispatch({ type: "DELETE_ROW", bucket: r.type, id: r.id });
      } catch (e) {
        setFailed((prev) => [...prev, { id: r.id, type: r.type, error: String(e) }]);
      }
    };

    const workers = Array.from(
      { length: Math.min(importConcurrency, Math.max(1, jobs.length)) },
      async () => {
        while (idx < jobs.length) {
          const j = jobs[idx++];
          setInFlight((f) => f + 1);
          await runOne(j);
          setInFlight((f) => Math.max(0, f - 1));
        }
      }
    );

    await Promise.all(workers);
    setImporting(false);
    setSuccessCount(success);

    // Notify parent with signature it expects:
    // (importedCount, flatRemainingArray)
    const remaining = groupedFromState(queueRef.current);
    const flatRemaining = flatFromGrouped(remaining);
    onPositionsSaved?.(success, flatRemaining);

    setMessage({
      type: "success",
      text: `Imported ${success} / ${jobs.length} positions` + (failed.length ? `, ${failed.length} failed` : ""),
    });
  }, [importing, flatQueue, autoRemoveOnSuccess, importConcurrency, onPositionsSaved, failed.length]);

  const deleteRow = (id, bucket) => {
    dispatch({ type: "DELETE_ROW", bucket, id });
    setSelected((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    // keep parent in sync to avoid zombies on reopen
    const remaining = groupedFromState({
      ...queueRef.current,
      [bucket]: queueRef.current[bucket].filter((r) => r.id !== id),
    });
    onPositionsSaved?.(successCount, flatFromGrouped(remaining));
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    const keys = Array.from(selected);
    const keySet = new Set(keys);
    dispatch({ type: "DELETE_BULK", keys });
    setSelected(new Set());
    const remaining = groupedFromState({
      security: queueRef.current.security.filter((r) => !keySet.has(r.id)),
      crypto:   queueRef.current.crypto.filter((r) => !keySet.has(r.id)),
      metal:    queueRef.current.metal.filter((r) => !keySet.has(r.id)),
      cash:     queueRef.current.cash.filter((r) => !keySet.has(r.id)),
      other:    queueRef.current.other.filter((r) => !keySet.has(r.id)),
    });
    onPositionsSaved?.(successCount, flatFromGrouped(remaining));
  };

  const clearAll = () => {
    dispatch({ type: "CLEAR_ALL" });
    setSelected(new Set());
    onPositionsSaved?.(successCount, []); // nothing remaining
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  // ---- UI ----
  const Row = ({ r }) => {
    const { id, type, data, hydratedPrice, hydratedName } = r;
    const name =
      hydratedName ||
      data?.name ||
      data?.asset_name ||
      data?.ticker ||
      data?.symbol ||
      "(unnamed)";
    const qty = data?.quantity ?? data?.amount ?? data?.shares ?? 0;
    const price = hydratedPrice ?? data?.price ?? data?.purchase_price ?? null;
    const mv = price != null && qty != null ? price * qty : null;

    return (
      <div className="grid grid-cols-12 items-center gap-2 p-2 rounded-lg hover:bg-gray-800/40">
        <div className="col-span-1">
          <input
            type="checkbox"
            checked={selected.has(id)}
            onChange={() => toggleSelect(id)}
          />
        </div>
        <div className="col-span-3 truncate">
          <div className="text-gray-100 text-sm">{name}</div>
          <div className="text-gray-400 text-xs">{type}</div>
        </div>
        <div className="col-span-2 text-sm text-gray-200">
          {data?.account_name || data?.account_id || "-"}
        </div>
        <div className="col-span-2 text-sm text-gray-200">{qty}</div>
        <div className="col-span-2 text-sm text-gray-200">
          {price != null ? formatCurrency(price) : "-"}
        </div>
        <div className="col-span-1 text-sm text-gray-200 text-right">
          {mv != null ? formatCurrency(mv) : "-"}
        </div>
        <div className="col-span-1 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteRow(id, type);
            }}
            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-300 hover:text-red-400"
            title="Delete row"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const Section = ({ title, items }) => {
    if (!items?.length) return null;
    return (
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-gray-400">{title}</div>
        <div className="divide-y divide-gray-800/70 rounded-lg border border-gray-800/70">
          {items.map((r) => (
            <Row key={r.id} r={r} />
          ))}
        </div>
      </div>
    );
  };

  const totalRows = flatQueue.length;

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-100">Quick Add Positions</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={submitAll}
            disabled={importing || totalRows === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Import {totalRows ? `(${totalRows})` : ""}
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={selected.size === 0}
            className="px-3 py-2 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
            title="Delete selected"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected {selected.size ? `(${selected.size})` : ""}
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={totalRows === 0}
            className="px-3 py-2 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-800 disabled:opacity-50"
            title="Clear all rows"
          >
            Clear All
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShortcutsOpen((v) => !v)}
            className={`p-2 rounded-lg ${
              shortcutsOpen
                ? "bg-purple-600/20 text-purple-300"
                : "bg-gray-800 text-gray-300"
            } hover:bg-gray-700`}
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-3 text-sm mb-3 ${
            message.type === "success"
              ? "bg-emerald-900/30 text-emerald-200 border border-emerald-800/50"
              : message.type === "error"
              ? "bg-red-900/30 text-red-200 border border-red-800/50"
              : "bg-slate-900/30 text-slate-200 border border-slate-800/50"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Queue sections */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <Section title="Securities" items={queue.security} />
          <Section title="Crypto" items={queue.crypto} />
          <Section title="Metals" items={queue.metal} />
        </div>
        <div className="space-y-6">
          <Section title="Cash" items={queue.cash} />
          <Section title="Other" items={queue.other} />
          <div className="rounded-lg border border-gray-800/60 p-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Ready</span>
              </div>
              <div className="text-xs text-gray-400">
                {importing ? `Importing… inFlight: ${inFlight}` : `Queued: ${totalRows}`}
              </div>
            </div>
            {!!failed.length && (
              <div className="mt-2 text-xs text-red-300">
                {failed.length} failed. Check console/logs for details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export both default and named so either import style works.
export { AddQuickPositionModal };
export default AddQuickPositionModal;
