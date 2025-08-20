// QuickReconciliationModal.js
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Check, CheckCircle, CheckSquare, CheckCheck, AlertTriangle, Info, Clock, Loader2,
  ChevronRight, ArrowLeft, Eye, EyeOff, Landmark as Building2, DollarSign, Droplets, LineChart,
  Bell, Target, Trophy, FileText, RefreshCw, Percent, Trash2, Filter as FilterIcon, Search
} from 'lucide-react';

// ====== External app hooks / API (unchanged signatures) ======
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { updateCashPosition, updateLiability, updateOtherAsset } from '@/utils/apimethods/positionMethods';
import { popularBrokerages } from '@/utils/constants';

// =============== Utilities ===================
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtUSD = (n, hide=false) => hide ? '••••••' : Number(n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const toNum = (s) => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const n = Number(String(s ?? '').replace(/[^\d.-]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
const diffPct = (base, delta) => (base !== 0 ? (delta / base) * 100 : 0);
const getLogo = (name) => {
  if (!name) return null;
  const hit = popularBrokerages.find((b) => b.name.toLowerCase() === String(name).toLowerCase());
  return hit?.logo || null;
};

// ------- Keys (normalized across assets & liabilities) -------
const makeKey = (kind, id) => `${kind}:${id}`;           // kind: 'asset' | 'liability'

// ------- Persistence namespaces (user-scoped) -------
const NS = (userId) => `nestegg:v1:recon:${userId || 'anon'}`;
const LS_DATA = (u) => `${NS(u)}:data`;
const LS_HISTORY = (u) => `${NS(u)}:history`;
// v2 unified drafts store with schema versioning
const SCHEMA_VERSION = 2;
const LS_SCHEMA = (u) => `${NS(u)}:schemaVersion`;
const LS_DRAFTS = (u) => `${NS(u)}:drafts:v2`;
// legacy prefix (for migration only)
const LS_DRAFT_PREFIX = (u) => `${NS(u)}:draft:`; 
const LS_SELECTED_INST = (u) => `${NS(u)}:selectedInstitution`;

// ===== Helpers for Quick Cash scope =====
const isClearlySecurityWord = /(stock|equity|etf|fund|mutual|option|bond|crypto|security|shares?)/i;
const isCashLikeWord = /(cash|checking|savings|mm|money\s?market|hysa|cd|certificate|sweep|settlement|brokerage\s?cash)/i;
const isCashLike = (pos) => {
  const t = String(pos.type || '').toLowerCase();
  const n = `${pos.name || ''} ${pos.identifier || ''} ${pos.inv_account_name || ''}`.toLowerCase();
  if (isClearlySecurityWord.test(n)) return false;
  if (['cash','checking','savings','money_market','mm','sweep','deposit'].includes(t)) return true;
  return isCashLikeWord.test(n);
};

// ===== Shared, paste-friendly currency input (caret stays put) =====
export const CurrencyInput = React.memo(function CurrencyInput({
  value,
  onValueChange,
  className = '',
  'aria-label': ariaLabel,
  onFocus,
  onBlur,
  nextFocusId,
}) {
  const [focused, setFocused] = React.useState(false);
  const [raw, setRaw] = React.useState(Number.isFinite(value) ? String(value) : '');
  const inputRef = React.useRef(null);

  // Only accept external value updates when **not** focused
  React.useEffect(() => {
    if (!focused) {
      setRaw(Number.isFinite(value) ? String(value) : '');
    }
  }, [value, focused]);

  const sanitize = (s) => {
    const cleaned = s.replace(/[^0-9.\-]/g, '');
    const parts = cleaned.split('.');
    const withOneDot = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    return withOneDot.replace(/(?!^)-/g, '');
  };

  const handleChange = (e) => {
    const nextRaw = sanitize(e.target.value);
    setRaw(nextRaw);
    onValueChange?.(Number(nextRaw || 0));
  };

  const handlePaste = (e) => {
    const txt = e.clipboardData.getData('text') || '';
    const cleaned = sanitize(txt);
    e.preventDefault();
    setRaw(cleaned);
    onValueChange?.(Number(cleaned || 0));
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        const end = el.value.length;
        try { el.setSelectionRange(end, end); } catch {}
      }
    });
  };

  const handleKeyDown = (e) => {
    if (['e', 'E'].includes(e.key)) e.preventDefault();
    if (e.key === 'Enter' && nextFocusId) {
      e.preventDefault();
      const nextEl = document.getElementById(nextFocusId);
      if (nextEl) {
        try { nextEl.focus({ preventScroll: true }); } catch { nextEl.focus(); }
      }
    }
  };

  const formatUSD = (n) =>
    Number.isFinite(n)
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
      : '';

  return (
    <input
      ref={inputRef}
      id={ariaLabel?.replace(/\s+/g, '_')}
      type="text"
      inputMode="decimal"
      value={focused ? raw : formatUSD(value)}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
        requestAnimationFrame(() => {
          try {
            const end = e.target.value?.length ?? 0;
            e.target.setSelectionRange(end, end); // caret at end, no select-all
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
        font-medium
        [font-variant-numeric:tabular-nums]`}
      />
  );
});

// ============== Toast ==============
function Toast({ type = 'info', text, onClose }) {
  const tone = {
    info: 'bg-blue-600',
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    warning: 'bg-amber-600',
  }[type] || 'bg-blue-600';
  return (
    <div className="fixed bottom-4 right-4 z-[10000]">
      <div className={`text-white ${tone} shadow-lg rounded-lg px-4 py-3 flex items-center gap-3`}>
        <span className="text-sm">{text}</span>
        <button onClick={onClose} className="/ml-2 rounded hover:bg-white/10 p-1" aria-label="Close toast">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// =================== Modal Shell (ARIA + Focus Trap + Dirty Guard) ===================
function ModalShell({ isOpen, onRequestClose, onBeforeClose, children, titleId }) {
  const overlayRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;
    const trap = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = bodyRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const esc = async (e) => {
      if (e.key === 'Escape') {
        const ok = onBeforeClose ? await onBeforeClose() : true;
        if (ok) onRequestClose?.();
      }
    };
    document.addEventListener('keydown', trap);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('keydown', trap);
      document.removeEventListener('keydown', esc);
      if (prev && prev.focus) prev.focus();
    };
  }, [isOpen, onBeforeClose, onRequestClose]);

  if (!isOpen) return null;

  const tryClose = async () => {
    const ok = onBeforeClose ? await onBeforeClose() : true;
    if (ok) onRequestClose?.();
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ isolation: 'isolate' }} aria-modal="true" role="dialog" aria-labelledby={titleId}>
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-[9998]"
        onClick={tryClose}
      />
      <div className="relative z-[9999] mx-auto my-4 w-full max-w-7xl">
        <div
          ref={bodyRef}
          className="rounded-2xl bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ===================== Tiny UI atoms =====================
function Kpi({ icon, label, value, tone }) {
  const toneCls =
    tone === 'pos' ? 'text-emerald-500' :
    tone === 'neg' ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-100';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
      <div className="text-zinc-500 dark:text-zinc-400">{icon}</div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className={`text-sm font-semibold ${toneCls}`}>{value}</div>
      </div>
    </div>
  );
}

// ===================== Main Modal ============================================
const ABS_TOLERANCE = 0.01; // cents-level
const PCT_TOLERANCE = 0.001; // 0.1%
const withinTolerance = (nest, stmt) => Math.abs(stmt - nest) < Math.max(ABS_TOLERANCE, Math.abs(nest) * PCT_TOLERANCE);

// ===================== Shared Top Header (with Back + Close) =========
function TopHeader({
  title,
  showValues,
  setShowValues,
  onRefresh,
  onClearPending,
  pending,
  onBack,
  onClose
}) {
  return (
    <div className="w-full border-b border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur sticky top-0 z-[10]">
      <div className="px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 id="qr-title" className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-zinc-100">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:grid grid-cols-4 gap-2 mr-2">
            <div className="rounded-lg bg-white dark:bg-zinc-900 px-3 py-1.5 border border-gray-200 dark:border-zinc-800 text-right">
              <div className="text-[10px] text-gray-500 dark:text-zinc-400">Pending</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{pending.count}</div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-emerald-900/20 px-3 py-1.5 border border-green-200 dark:border-emerald-800 text-right">
              <div className="text-[10px] text-green-700 dark:text-emerald-400">↑ {pending.posCount}</div>
              <div className="text-xs font-semibold text-green-800 dark:text-emerald-300">{fmtUSD(pending.posAmt, !showValues)}</div>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-rose-900/20 px-3 py-1.5 border border-red-200 dark:border-rose-800 text-right">
              <div className="text-[10px] text-red-700 dark:text-rose-400">↓ {pending.negCount}</div>
              <div className="text-xs font-semibold text-red-800 dark:text-rose-300">{fmtUSD(pending.negAmt, !showValues)}</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-900 px-3 py-1.5 border border-gray-200 dark:border-zinc-800 text-right">
              <div className="text-[10px] text-gray-500 dark:text-zinc-400">Net</div>
              <div className={`text-sm font-semibold ${pending.net >= 0 ? 'text-green-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'}`}>
                {fmtUSD(pending.net, !showValues)}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowValues(s=>!s)}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
            title={showValues ? 'Hide values' : 'Show values'}
          >
            {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClearPending}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-700/30"
            title="Clear pending changes"
          >
            <Trash2 className="w-4 h-4 inline -mt-0.5 mr-1" /> Clear
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-1 p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuickReconciliationModal({ isOpen, onClose }) {
  const { state, actions } = useDataStore();
  const userId = state?.user?.id || null;

  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: rawPositions = [], loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();
  const loading = accountsLoading || positionsLoading;

  // Screens
  const [screen, setScreen] = useState('welcome'); // welcome | liquid | reconcile | summary
  const [localLoading, setLocalLoading] = useState(false);

  // Privacy toggle (shared)
  const [showValues, setShowValues] = useState(true);

  // Toast
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const showToast = useCallback((type, text, duration = 3500) => {
    setToast({ type, text });
    if (toastRef.current) clearTimeout(toastRef.current);
    if (duration > 0) toastRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  // LocalStorage helpers (user-scoped)
  const loadReconData = useCallback(() => {
    try { const saved = localStorage.getItem(LS_DATA(userId)); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  }, [userId]);
  const [reconData, setReconData] = useState(() => loadReconData());
  const saveReconData = useCallback((dataOrFn) => {
    const data = typeof dataOrFn === 'function' ? dataOrFn(reconData) : dataOrFn;
    setReconData(data);
    try { localStorage.setItem(LS_DATA(userId), JSON.stringify(data)); } catch {/* noop */}
  }, [userId, reconData]);

  const clearPending = useCallback(() => {
    if (!confirm('Clear all pending changes and history for Quick Reconciliation?')) return;
    try {
      // remove data & history
      localStorage.removeItem(LS_DATA(userId));
      localStorage.removeItem(LS_HISTORY(userId));
      // remove drafts
      const prefix = LS_DRAFT_PREFIX(userId);
      const keys = [];
      for (let i=0; i<localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      try {
        localStorage.removeItem(LS_DRAFTS(userId));
        localStorage.removeItem(LS_SCHEMA(userId));
      } catch {}
    } catch {}
    setReconData({});
    setDrafts({});
    showToast('success', 'Cleared pending changes');
  }, [userId]);

  const pushHistory = useCallback(() => {
    try {
      const now = new Date().toISOString();
      const key = LS_HISTORY(userId);
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      const todayStr = new Date(now).toDateString();
      if (!history.some((d) => new Date(d).toDateString() === todayStr)) {
        history.unshift(now); if (history.length > 60) history.pop();
        localStorage.setItem(key, JSON.stringify(history));
      }
    } catch {/* noop */}
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;
    setScreen('welcome');
    setToast(null);
    setLocalLoading(false);
    setTimeout(() => {
      (async () => {
        if (!accounts.length || !rawPositions.length) {
          try {
            setLocalLoading(true);
            await Promise.all([refreshAccounts?.(), refreshPositions?.()]);
          } finally { setLocalLoading(false); }
        }
      })();
    }, 0);
    return () => { if (toastRef.current) clearTimeout(toastRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Normalized positions (asset-side)
  const positionsNorm = useMemo(() => {
    return (rawPositions || []).map((p) => {
      const id = p.itemId ?? p.item_id ?? p.id;
      const accountId = p.accountId ?? p.inv_account_id ?? p.account_id;
      const acct = (accounts || []).find(a => String(a.id) === String(accountId));
      const type = String(p.assetType ?? p.item_type ?? p.asset_type ?? p.position_type ?? '').toLowerCase();
      const name = p.name ?? p.identifier ?? 'Unnamed';
      const currentValue = Number(p.currentValue ?? p.current_value ?? 0);
      const institution = p.institution ?? acct?.institution ?? 'Unknown Institution';
      const identifier = p.identifier ?? p.symbol ?? '';
      const inv_account_name = p.inv_account_name ?? p.accountName ?? p.account_name ?? '';
      return { id, itemId: id, accountId, institution, type, name, currentValue, identifier, inv_account_name };
    });
  }, [rawPositions, accounts]);

  // Liabilities from store
  const { groupedLiabilities } = state;
  useEffect(() => {
    if (!groupedLiabilities?.lastFetched && !groupedLiabilities?.loading) {
      actions.fetchGroupedLiabilitiesData?.();
    }
  }, [groupedLiabilities?.lastFetched, groupedLiabilities?.loading, actions]);

  const liabilities = useMemo(() => {
    return (groupedLiabilities?.data || []).map((L) => {
      const id = L.item_id ?? L.liability_id ?? L.id ?? L.history_id;
      const t = (L.item_type || L.type || 'liability').toLowerCase();
      const val = Number(
        L.total_current_balance ?? L.current_balance ?? L.current_value ?? L.balance ?? L.net_worth_value ?? L.principal_balance ?? L.amount ?? 0
      );
      return {
        id,
        itemId: id,
        accountId: L.inv_account_id ?? L.account_id ?? null,
        institution: L.institution || 'Unknown Institution',
        name: L.name || L.identifier || 'Liability',
        identifier: L.identifier || '',
        type: t, // credit_card | loan | mortgage | liability...
        currentValue: val,
        inv_account_name: L.inv_account_name ?? L.account_name ?? '',
      };
    });
  }, [groupedLiabilities?.data]);

  // ================= Dirty-State Tracking =================
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    try {
      const currSchema = Number(localStorage.getItem(LS_SCHEMA(userId)) || 0);
      if (currSchema < SCHEMA_VERSION) {
        const merged = {};
        // sweep legacy per-institution draft keys
        const prefix = LS_DRAFT_PREFIX(userId);
        const legacyKeys = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            legacyKeys.push(k);
            const v = JSON.parse(localStorage.getItem(k) || '{}');
            Object.assign(merged, v);
          }
        }
        // overlay existing v2 if present
        const v2Existing = JSON.parse(localStorage.getItem(LS_DRAFTS(userId)) || '{}');
        Object.assign(merged, v2Existing);

        localStorage.setItem(LS_DRAFTS(userId), JSON.stringify(merged));
        legacyKeys.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(LS_SCHEMA(userId), String(SCHEMA_VERSION));
      }
      const v2 = JSON.parse(localStorage.getItem(LS_DRAFTS(userId)) || '{}');
      setDrafts(v2);
    } catch {
      setDrafts({});
    }
  }, [isOpen, userId]);

  const persistDrafts = useCallback((next) => {
    setDrafts(next);
    try { localStorage.setItem(LS_DRAFTS(userId), JSON.stringify(next)); } catch {}
  }, [userId]);


  // Pending KPI (global)
  const pending = useMemo(() => {
    const rows = [
      ...positionsNorm.map(p => ({ key: makeKey('asset', p.id), curr: Number(p.currentValue || 0) })),
      ...liabilities.map(p => ({ key: makeKey('liability', p.id), curr: Number(p.currentValue || 0) })),
    ];
    let count=0, posC=0, posA=0, negC=0, negA=0;
    rows.forEach((r) => {
      const next = drafts[r.key];
      if (next === undefined || !Number.isFinite(next)) return;
      const delta = next - r.curr;
      if (delta === 0) return;
      count += 1;
      if (delta > 0) { posC += 1; posA += delta; }
      else { negC += 1; negA += delta; }
    });
    return { count, posCount: posC, posAmt: posA, negCount: negC, negAmt: negA, net: posA + negA };
  }, [positionsNorm, liabilities, drafts]);

  // Dirty guard on close
  const hasUnsaved = pending.count > 0;
  const onBeforeClose = useCallback(async () => {
    if (!hasUnsaved) return true;
    return confirm('You have pending edits that are not submitted yet. Close anyway?');
  }, [hasUnsaved]);

  // Focus helpers
  const [editingKey, setEditingKey] = useState(null);
  const lastFocusedIdRef = useRef(null);

  // ========== WELCOME ==========
  function WelcomeScreen() {
    const history = useMemo(() => {
      try { return JSON.parse(localStorage.getItem(LS_HISTORY(userId)) || '[]'); } catch { return []; }
    }, []);
    const lastFull = history[0] ? new Date(history[0]) : null;
    const lastStr = !lastFull ? 'Never' :
      (() => {
        const days = Math.floor((Date.now() - lastFull.getTime()) / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days/7)} weeks ago`;
        return `${Math.floor(days/30)} months ago`;
      })();

    // Institution preview
    const preview = useMemo(() => {
      const map = new Map();
      const add = (inst) => { if (!map.has(inst)) map.set(inst, {
        institution: inst,
        assets: [], liabilities: [],
        assetsValue: 0, liabilitiesValue: 0,
        drafted: 0, changed: 0
      }); return map.get(inst); };
      positionsNorm.forEach(p => {
        const g = add(p.institution || 'Unknown Institution');
        const key = makeKey('asset', p.id); const curr = Number(p.currentValue||0); const d = drafts[key];
        const hasDraft = d !== undefined && Number.isFinite(d);
        const hasChange = hasDraft && d !== curr;
        g.assets.push({ key, curr, draft: d });
        g.assetsValue += Math.abs(curr); g.drafted += hasDraft ? 1 : 0; g.changed += hasChange ? 1 : 0;
      });
      liabilities.forEach(p => {
        const g = add(p.institution || 'Unknown Institution');
        const key = makeKey('liability', p.id); const curr = Number(p.currentValue||0); const d = drafts[key];
        const hasDraft = d !== undefined && Number.isFinite(d);
        const hasChange = hasDraft && d !== curr;
        g.liabilities.push({ key, curr, draft: d });
        g.liabilitiesValue += Math.abs(curr); g.drafted += hasDraft ? 1 : 0; g.changed += hasChange ? 1 : 0;
      });
      return Array.from(map.values()).map(g => {
        const totalRows = g.assets.length + g.liabilities.length;
        const totalValue = g.assetsValue + g.liabilitiesValue;
        const progressPct = totalRows ? ((totalRows - g.changed) / totalRows) * 100 : 0;
        return { ...g, totalRows, totalValue, progressPct };
      }).sort((a,b)=>b.totalValue-a.totalValue);
    }, [positionsNorm, liabilities, drafts]);

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([refreshPositions?.(), refreshAccounts?.(), actions.fetchGroupedLiabilitiesData?.()])
        .finally(()=>setLocalLoading(false));
    }, [refreshPositions, refreshAccounts, actions]);

    return (
      <div className="flex flex-col h-[80vh]">
        <TopHeader
          title="Quick Update & Reconcile"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={onRefresh}
          onClearPending={clearPending}
          pending={pending}
          onBack={onClose}
          onClose={onClose}
        />

        <div className="p-6 flex-1 overflow-auto" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-gray-600 dark:text-zinc-400 mb-4">
            Paste or type balances for cash, cards, and loans; then verify investment accounts. Last full update: <span className="font-medium">{lastStr}</span>.
          </p>

          {/* CTAs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => setScreen('liquid')}
              className="group text-left p-6 bg-white dark:bg-zinc-900 rounded-xl border-2 border-blue-200 dark:border-blue-900/40 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Droplets className="text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-zinc-100">Quick Cash & Liabilities</div>
                  <div className="text-sm text-gray-600 dark:text-zinc-400">Update checking, savings, credit cards, loans</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => setScreen('reconcile')}
              className="group text-left p-6 bg-white dark:bg-zinc-900 rounded-xl border-2 border-green-200 dark:border-emerald-900/40 hover:border-green-400 dark:hover:border-emerald-600 transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-emerald-900/40">
                  <CheckSquare className="text-green-600 dark:text-emerald-300" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-zinc-100">Investment & Liabilities Check-In</div>
                  <div className="text-sm text-gray-600 dark:text-zinc-400">Verify account totals match statements</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => { setScreen('liquid'); saveReconData((d)=>({ ...d, _next:'reconcile' })); }}
              className="group text-left p-6 bg-white dark:bg-zinc-900 rounded-xl border-2 border-purple-200 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                  <Target className="text-purple-600 dark:text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-zinc-100">Complete Sync</div>
                  <div className="text-sm text-gray-600 dark:text-zinc-400">Refresh everything in one flow</div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-zinc-500">⚡ Fastest workflow</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Institution Overview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Institutions Overview</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[38vh] overflow-auto pr-1" style={{ overscrollBehavior: 'contain' }}>
              {preview.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-zinc-400">Add accounts to get started.</div>
              ) : preview.map((g) => {
                const logo = getLogo(g.institution);
                const changed = g.changed > 0;
                const net = g.assetsValue - g.liabilitiesValue;
                return (
                  <div
                    key={g.institution}
                    className={`rounded-xl border transition-all bg-white dark:bg-zinc-900 ${
                      changed ? 'border-amber-200 dark:border-amber-700/40' : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                    } p-4`}
                  >
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <img src={logo} alt={g.institution} className="w-8 h-8 rounded object-contain" />
                      ) : <Building2 className="w-8 h-8 text-gray-400" />}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-zinc-100">{g.institution}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">
                          {g.assets.length} assets • {g.liabilities.length} liabilities
                        </div>
                      </div>
                      {changed
                        ? <span className="inline-flex items-center text-amber-700 dark:text-amber-300 text-xs"><AlertTriangle className="w-4 h-4 mr-1" /> Drafts</span>
                        : <span className="inline-flex items-center text-green-700 dark:text-emerald-300 text-xs"><CheckCircle className="w-4 h-4 mr-1" /> Ready</span>
                      }
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="text-gray-500 dark:text-zinc-400">Assets: <span className="font-medium text-gray-700 dark:text-zinc-200">{fmtUSD(g.assetsValue, !showValues)}</span></div>
                      <div className="text-gray-500 dark:text-zinc-400">Liabs: <span className="font-medium text-gray-700 dark:text-zinc-200">{fmtUSD(g.liabilitiesValue, !showValues)}</span></div>
                      <div className="text-gray-500 dark:text-zinc-400">Net: <span className={`${net>=0 ? 'text-green-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'} font-semibold`}>{fmtUSD(net, !showValues)}</span></div>
                    </div>
                    <div className="mt-3 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`${changed ? 'bg-amber-500' : 'bg-green-500'} h-full transition-all`} style={{ width: `${clamp(g.progressPct,0,100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= Liquid Screen (CASH & LIABS ONLY) =================
  function LiquidScreen() {
    const [selectedInstitution, _setSelectedInstitution] = useState(() => {
      try { return localStorage.getItem(LS_SELECTED_INST(userId)) || null; } catch { return null; }
    });
    const setSelectedInstitution = useCallback((inst) => {
      _setSelectedInstitution(inst);
      try { localStorage.setItem(LS_SELECTED_INST(userId), inst || ''); } catch {}
    }, []);

    // Filters
    const [filterText, setFilterText] = useState('');
    const [showOnlyChanged, setShowOnlyChanged] = useState(false);
    const [showAssets, setShowAssets] = useState(true);
    const [showLiabs, setShowLiabs] = useState(true);
    const [onlyManualLike, setOnlyManualLike] = useState(true); // heuristic

    const [sortKey, setSortKey] = useState('nest'); // 'nest' | 'name' | 'diff'
    const [sortDir, setSortDir] = useState('desc');
    const [jumping, setJumping] = useState(false);

    // CASH positions only
    const cashPositionsAll = useMemo(() => positionsNorm.filter(isCashLike), [positionsNorm]);

    const filteredPositions = useMemo(() => {
      return cashPositionsAll.filter(p => {
        if (onlyManualLike) {
          const manualish = !p.identifier || isCashLike(p);
          if (!manualish) return false;
        }
        return true;
      });
    }, [cashPositionsAll, onlyManualLike]);

    // build groups
    const groups = useMemo(() => {
      const map = new Map();
      const add = (inst) => { if (!map.has(inst)) map.set(inst, { institution: inst, positions: [], liabilities: [], assetsValue: 0, liabilitiesValue: 0 }); return map.get(inst); };

      if (showAssets) {
        filteredPositions.forEach(p => { const g = add(p.institution || 'Unknown Institution'); g.positions.push(p); g.assetsValue += Math.abs(Number(p.currentValue||0)); });
      }
      if (showLiabs) {
        liabilities.forEach(p => { const g = add(p.institution || 'Unknown Institution'); g.liabilities.push(p); g.liabilitiesValue += Math.abs(Number(p.currentValue||0)); });
      }

      let enriched = Array.from(map.values()).map((g) => {
        const totalRows = g.positions.length + g.liabilities.length;
        let drafted=0, changed=0;
        g.positions.forEach(p => { const key = makeKey('asset', p.id); const d = drafts[key]; if (d!==undefined) drafted+=1; if (d!==undefined && d!==Number(p.currentValue||0)) changed+=1; });
        g.liabilities.forEach(p => { const key = makeKey('liability', p.id); const d = drafts[key]; if (d!==undefined) drafted+=1; if (d!==undefined && d!==Number(p.currentValue||0)) changed+=1; });
        return { ...g, totalRows, drafted, changed, totalValue: g.assetsValue + g.liabilitiesValue, progressPct: totalRows ? ((totalRows - changed) / totalRows)*100 : 0 };
      });

      // filter by search/drafts
      if (filterText.trim()) {
        const s = filterText.trim().toLowerCase();
        enriched = enriched.filter(g => (g.institution || '').toLowerCase().includes(s));
      }
      if (showOnlyChanged) {
        enriched = enriched.filter(g => g.changed > 0);
      }

      return enriched.sort((a,b)=>b.totalValue-a.totalValue);
    }, [filteredPositions, liabilities, drafts, showAssets, showLiabs, filterText, showOnlyChanged]);

    useEffect(() => {
      // If nothing selected, select first available. Do not auto-clear when filtered.
      if (!selectedInstitution && groups.length) _setSelectedInstitution(groups[0].institution);
    }, [groups, selectedInstitution]);

    const current = useMemo(()=>groups.find(g=>g.institution===selectedInstitution),[groups,selectedInstitution]);

    const headerSortIcon = (key) => (sortKey === key ? <span className="ml-1 text-gray-400 dark:text-zinc-500">{sortDir === 'asc' ? '▲' : '▼'}</span> : null);
    const toggleSort = (key) => { if (sortKey===key) setSortDir(d=>d==='asc'?'desc':'desc'); else { setSortKey(key); setSortDir('desc'); } };

    const makeSorted = useCallback((rows, kind) => {
      const sorted = [...rows].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
        const aValue = Number(a.currentValue || 0);
        const bValue = Number(b.currentValue || 0);
        if (sortKey === 'diff') {
          const aDraft = drafts[makeKey(kind, a.id)];
          const bDraft = drafts[makeKey(kind, b.id)];
          const aDiff = aDraft !== undefined ? (Number(aDraft) - aValue) : 0;
          const bDiff = bDraft !== undefined ? (Number(bDraft) - bValue) : 0;
          return (aDiff - bDiff) * dir;
        }
        return (aValue - bValue) * dir;
      });
      return sorted.map((p) => {
        const key = makeKey(kind, p.id);
        const nest = Number(p.currentValue || 0);
        const stmt = drafts[key] !== undefined ? Number(drafts[key]) : nest;
        const diff = stmt - nest;
        const pct = nest !== 0 ? (diff / nest) * 100 : 0;
        return { ...p, _calc: { nest, stmt, diff, pct }, _key: key };
      });
    }, [sortKey, sortDir, drafts]);

    const sortedPositions = useMemo(() => current?.positions ? makeSorted(current.positions, 'asset') : [], [current?.positions, makeSorted]);
    const sortedLiabilities = useMemo(() => current?.liabilities ? makeSorted(current.liabilities, 'liability') : [], [current?.liabilities, makeSorted]);

    // bulk paste
    const onBulkPaste = (e) => {
      if (!current) return;
      const txt = e.clipboardData?.getData('text') || '';
      if (!txt) return;
      const hasTabs = txt.includes('\t');
      const lines = txt.trim().split(/\r?\n/).map(row => {
        if (hasTabs) return row.split('\t');
        if (row.includes(',')) return row.split(',');
        return [row];
      });
      const flat = lines.flat().map(s=>toNum(String(s).trim())).filter(n=>Number.isFinite(n));
      if (!flat.length) return;
      e.preventDefault();
      const posKeys = (sortedPositions||[]).map(p=>makeKey('asset', p.id));
      const liabKeys = (sortedLiabilities||[]).map(l=>makeKey('liability', l.id));
      const keys = [...posKeys, ...liabKeys];
      const scopeKey = selectedInstitution || 'all';
      setDrafts(prev => {
        const next = { ...prev };
        for (let i=0;i<keys.length && i<flat.length;i+=1) next[keys[i]] = flat[i];
        persistDrafts(next);
        return next;
      });
      showToast('success', `Pasted ${Math.min(keys.length, flat.length)} values`);
    };

    // Save selected institution
    const saveInstitution = async () => {
      if (!current) return;

      // build typed payloads
      const buildLiabilityPayload = (l, next) => {
        const t = String(l.type || '').toLowerCase();
        if (t.includes('mortgage') || t.includes('loan')) return { principal_balance: next };
        if (t.includes('credit')) return { current_balance: next };
        return { current_balance: next };
      };

      const changes = [];

      if (showAssets) {
        current.positions.forEach(p => {
          const key = makeKey('asset', p.id);
          const curr = Number(p.currentValue||0);
          const next = drafts[key];
          if (next === undefined || !Number.isFinite(next) || next === curr) return;
          changes.push({ kind:'cash', id: p.itemId ?? p.id, value: Number(next), entity: p });
        });
      }

      if (showLiabs) {
        current.liabilities.forEach(l => {
          const key = makeKey('liability', l.id);
          const curr = Number(l.currentValue||0);
          const next = drafts[key];
          if (next === undefined || !Number.isFinite(next) || next === curr) return;
          changes.push({ kind:'liability', id: l.itemId ?? l.liability_id ?? l.id, value: Number(next), entity: l });
        });
      }

      if (!changes.length) { showToast('info','No changes to apply'); return; }

      const maxConcurrent = 3;
      const maxRetries = 2;
      let idx = 0;
      const failed = [];

      const runOne = async (c) => {
        const attempt = async () => {
          const v = Number(c.value);
          if (!Number.isFinite(v)) return;
          if (c.kind === 'cash') return updateCashPosition(c.id, { amount: v });
          if (c.kind === 'liability') return updateLiability(c.id, buildLiabilityPayload(c.entity, v));
          return updateOtherAsset(Number(c.id), { current_value: v });
        };
        for (let tries = 0; tries <= maxRetries; tries += 1) {
          try { await attempt(); return; }
          catch (e) {
            if (tries === maxRetries) throw e;
            await new Promise(res => setTimeout(res, 350 * (tries + 1)));
          }
        }
      };

      setLocalLoading(true);
      try {
        const pool = Array.from({ length: Math.min(maxConcurrent, changes.length) }, async function worker() {
          while (idx < changes.length) {
            const currentIdx = idx++;
            const job = changes[currentIdx];
            try { await runOne(job); }
            catch { failed.push(job); }
          }
        });

        await Promise.all(pool);

        await Promise.all([
          refreshPositions?.(),
          actions?.fetchGroupedPositionsData?.(true),
          actions?.fetchPortfolioData?.(true),
          actions?.fetchGroupedLiabilitiesData?.(true),
        ]);

        const nextData = { ...reconData };
        changes.forEach((c)=>{
          nextData[`pos_${makeKey(c.kind==='liability'?'liability':'asset', c.id)}`] = {
            lastUpdated: new Date().toISOString(),
            value: Number(c.value)
          };
        });
        saveReconData(nextData);

        if (failed.length) showToast('error', `Saved with ${failed.length} failures`);
        else showToast('success', `Updated ${current.institution}`);
      } catch (e) {
        console.error(e);
        showToast('error','Failed to apply updates');
      } finally {
        setLocalLoading(false);
      }
    };


    const continueToNext = () => {
      if (!groups.length) return;
      if (!current) { setSelectedInstitution(groups[0].institution); return; }
      const idx = groups.findIndex(g=>g.institution===current.institution);
      const next = groups[idx+1];
      setJumping(true); setTimeout(()=>setJumping(false), 300);
      if (next) { setSelectedInstitution(next.institution); showToast('success', `Moving to ${next.institution}`, 2000); }
      else { setSelectedInstitution(null); showToast('success','All institutions reviewed.'); if (reconData?._next==='reconcile') setScreen('reconcile'); }
    };

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([refreshPositions?.(), refreshAccounts?.(), actions.fetchGroupedLiabilitiesData?.()])
        .finally(()=>setLocalLoading(false));
    }, [refreshPositions, refreshAccounts, actions]);

    return (
      <div className="flex flex-col h-[80vh]" onPaste={onBulkPaste}>
        <TopHeader
          title="Quick Cash & Liabilities Update"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={onRefresh}
          onClearPending={clearPending}
          pending={pending}
          onBack={() => setScreen('welcome')}
          onClose={onClose}
        />

        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Left rail with filters */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Filters */}
              <div className="mb-2 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
                <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-zinc-200">
                  <FilterIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                    <input
                      value={filterText}
                      onChange={(e)=>setFilterText(e.target.value)}
                      placeholder="Search institutions..."
                      className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 
                              bg-white dark:bg-zinc-800 text-sm 
                              text-gray-900 dark:text-zinc-100 
                              placeholder-gray-400 dark:placeholder-zinc-500"

                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
                    <input type="checkbox" checked={showAssets} onChange={(e)=>setShowAssets(e.target.checked)} />
                    Assets
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
                    <input type="checkbox" checked={showLiabs} onChange={(e)=>setShowLiabs(e.target.checked)} />
                    Liabilities
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
                    <input type="checkbox" checked={onlyManualLike} onChange={(e)=>setOnlyManualLike(e.target.checked)} />
                    Only manual-like
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
                    <input type="checkbox" checked={showOnlyChanged} onChange={(e)=>setShowOnlyChanged(e.target.checked)} />
                    With drafts
                  </label>
                </div>
              </div>

              {/* Institutions list */}
              <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="h-full overflow-auto reconciliation-sidebar" style={{ overscrollBehavior: 'contain' }}>
                  {groups.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500 dark:text-zinc-400">No cash or liabilities found.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {groups.map(g => {
                        const isSel = g.institution === selectedInstitution;
                        const logoSmall = getLogo(g.institution);
                        const changed = g.changed > 0;
                        return (
                          <li key={g.institution}>
                            <button
                              onClick={() => setSelectedInstitution(g.institution)}
                              className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3
                                ${isSel ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
                            >
                              {logoSmall ? <img src={logoSmall} alt={g.institution} className="w-7 h-7 rounded object-contain" /> : <Building2 className="w-6 h-6 text-gray-400" />}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900 dark:text-zinc-100">{g.institution}</div>
                                  <div className="text-[11px] text-gray-500 dark:text-zinc-400">{g.totalRows} items</div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400">
                                  {fmtUSD(g.assetsValue, !showValues)} assets • {fmtUSD(g.liabilitiesValue, !showValues)} liabs
                                </div>
                                <div className="mt-2 h-1.5 bg-gray-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`${changed? 'bg-amber-500' : 'bg-blue-500'} h-full transition-all`} style={{ width: `${clamp(g.progressPct,0,100)}%` }} />
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Right work surface */}
          <section className="col-span-12 lg:col-span-8 xl:col-span-9 h-full">
            {!current ? (
              <div className="h-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 flex items-center justify-center text-center p-10">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Select a bank or card to begin</h4>
                  <p className="text-gray-600 dark:text-zinc-400 mt-2 max-w-lg">
                    Update checking/savings balances and any credit cards, loans, or mortgages. Paste from spreadsheets—values are auto-detected.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`h-full rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col ${jumping ? 'ring-2 ring-blue-200 dark:ring-blue-900/40 transition' : ''}`}>
                {/* Sub-header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-[1] rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    {getLogo(current.institution) ? (
                      <img src={getLogo(current.institution)} alt={current.institution} className="w-9 h-9 rounded object-contain" />
                    ) : <Building2 className="w-8 h-8 text-gray-400" />}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">{current.institution}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        {current.positions.length} assets • {current.liabilities.length} liabilities • Net{' '}
                        <span className={`${(current.assetsValue-current.liabilitiesValue)>=0?'text-emerald-600':'text-rose-600'} font-semibold`}>
                          {fmtUSD(current.assetsValue - current.liabilitiesValue, !showValues)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <div className="text-xs text-gray-500 dark:text-zinc-400">Totals</div>
                      <div className="text-[12px] text-gray-600 dark:text-zinc-300">
                        A: {fmtUSD(current.assetsValue, !showValues)} • L: {fmtUSD(current.liabilitiesValue, !showValues)}
                      </div>
                    </div>
                    <button
                      onClick={saveInstitution}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                      title={`Apply changes for ${current.institution}`}
                    >
                      Update {current.institution}
                    </button>
                    <button
                      onClick={continueToNext}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                      title="Move to the next institution"
                    >
                      Continue <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>

                {/* Tables area */}
                <div className="flex-1 overflow-auto" style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
                  {/* Assets & Cash */}
                  {sortedPositions.length > 0 && (
                    <div className="min-w-[860px] overflow-auto">
                      <div className="bg-gray-50 dark:bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 sticky top-0 z-[1]">
                        Assets & Cash
                      </div>
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-[44px] z-[1]">
                          <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
                            <th className="px-6 py-2 text-left cursor-pointer" onClick={() => toggleSort('name')}>
                              Account / Details {headerSortIcon('name')}
                            </th>
                            <th className="px-3 py-2 text-left">Identifier</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort('nest')}>
                              NestEgg {headerSortIcon('nest')}
                            </th>
                            <th className="px-3 py-2 text-center">Statement</th>
                            <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort('diff')}>
                              Δ {headerSortIcon('diff')}
                            </th>
                            <th className="px-3 py-2 text-right">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                          {sortedPositions.map((pos, idx) => {
                            const c = pos._calc;
                            const k = makeKey('asset', pos.id);
                            const changed = drafts[k] !== undefined && Number(drafts[k]) !== c.nest;
                            const nextId = sortedPositions[idx+1]?.name ? `Statement_balance_for_${sortedPositions[idx+1].name}`.replace(/\s+/g,'_') : undefined;
                            return (
                              <tr key={pos.id} className={changed ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                                <td className="px-6 py-2">
                                  <div className="font-medium text-gray-900 dark:text-zinc-100">{pos.name || 'Account'}</div>
                                  <div className="text-xs text-gray-500 dark:text-zinc-400">{pos.inv_account_name || ''}</div>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{pos.identifier || '—'}</td>
                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{pos.type || '—'}</td>
                                <td className="px-3 py-2 text-right text-gray-800 dark:text-zinc-100">
                                  {fmtUSD(c.nest, !showValues)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <CurrencyInput
                                    value={drafts[k] ?? c.nest}
                                    onValueChange={(v) => {
                                      if (editingKey !== k) setEditingKey(k);
                                      setDrafts(prev => ({ ...prev, [k]: Number.isFinite(v) ? v : 0 }));
                                    }}
                                    nextFocusId={nextId}
                                    onFocus={(e) => { setEditingKey(k); lastFocusedIdRef.current = e.target.id; }}
                                    onBlur={() => { if (editingKey === k) setEditingKey(null); }}
                                    className={changed ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-400/40' : ''}
                                    aria-label={`Statement balance for ${pos.name}`}
                                  />
                                </td>
                                <td className={`px-3 py-2 text-right font-semibold ${c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                                  {fmtUSD(c.diff, !showValues)}
                                </td>
                                <td className={`px-3 py-2 text-right ${c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                                  {c.nest === 0 ? '—' : `${c.pct.toFixed(2)}%`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Liabilities */}
                  {sortedLiabilities.length > 0 && (
                    <div className="min-w-[860px] mt-8 overflow-auto">
                      <div className="bg-gray-50 dark:bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 sticky top-0 z-[1]">Liabilities</div>
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-[44px] z-[1]">
                          <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
                            <th className="px-6 py-2 text-left cursor-pointer" onClick={() => toggleSort('name')}>Name {headerSortIcon('name')}</th>
                            <th className="px-3 py-2 text-left">Identifier</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort('nest')}>NestEgg {headerSortIcon('nest')}</th>
                            <th className="px-3 py-2 text-center">Statement</th>
                            <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort('diff')}>Δ {headerSortIcon('diff')}</th>
                            <th className="px-3 py-2 text-right">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                          {sortedLiabilities.map((liab, idx) => {
                            const c = liab._calc;
                            const key = makeKey('liability', liab.id);
                            const changed = drafts[key] !== undefined && Number(drafts[key]) !== c.nest;
                            const nextId = sortedLiabilities[idx+1]?.name ? `Statement_balance_for_${sortedLiabilities[idx+1].name}`.replace(/\s+/g,'_') : undefined;

                            return (
                              <tr key={liab.id} className={changed ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                                <td className="px-6 py-2">
                                  <div className="font-medium text-gray-900 dark:text-zinc-100">{liab.name || 'Liability'}</div>
                                  <div className="text-xs text-gray-500 dark:text-zinc-400">{liab.inv_account_name || ''}</div>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{liab.identifier || '—'}</td>
                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{liab.type || '—'}</td>
                                <td className="px-3 py-2 text-right text-gray-800 dark:text-zinc-100">{fmtUSD(c.nest, !showValues)}</td>
                                <td className="px-3 py-2 text-center">
                                  <CurrencyInput
                                    value={drafts[key] ?? c.nest}
                                    onValueChange={(v) => {
                                      if (editingKey !== key) setEditingKey(key);
                                      setDrafts(prev => ({ ...prev, [key]: Number.isFinite(v) ? v : 0 }));
                                    }}
                                    nextFocusId={nextId}
                                    onFocus={(e) => { setEditingKey(key); lastFocusedIdRef.current = e.target.id; }}
                                    onBlur={() => { if (editingKey === key) setEditingKey(null); }}
                                    className={`${changed ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/40 bg-white dark:bg-zinc-900' : ''}`}
                                    aria-label={`Statement balance for ${liab.name}`}
                                  />
                                </td>
                                <td className={`px-3 py-2 text-right font-semibold ${c.diff > 0 ? 'text-red-600' : c.diff < 0 ? 'text-green-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                                  {fmtUSD(c.diff, !showValues)}
                                </td>
                                <td className={`px-3 py-2 text-right ${c.diff > 0 ? 'text-red-600' : c.diff < 0 ? 'text-green-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                                  {c.nest === 0 ? '—' : `${c.pct.toFixed(2)}%`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sortedPositions.length === 0 && sortedLiabilities.length === 0 && (
                    <div className="p-10 text-center text-gray-500 dark:text-zinc-400">No accounts or liabilities for this institution.</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ================= Reconcile Screen (includes liabilities) =================
  function ReconcileScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [showOnlyNeeding, setShowOnlyNeeding] = useState(false);

    // group by institution (accounts + synthetic entries for liabilities)
    const groups = useMemo(() => {
      const instMap = new Map();
      const addInst = (inst) => { if (!instMap.has(inst)) instMap.set(inst, []); return instMap.get(inst); };

      // Real accounts
      (accounts || []).forEach((a) => {
        const inst = a.institution || 'Unknown Institution';
        const list = addInst(inst);
        const totalValue = Number(a.totalValue ?? a.total_value ?? a.balance ?? 0);
        list.push({ ...a, totalValue, _kind: 'account' });
      });

      // Liability group per institution
      const liabByInst = new Map();
      liabilities.forEach(l => {
        const inst = l.institution || 'Unknown Institution';
        if (!liabByInst.has(inst)) liabByInst.set(inst, []);
        liabByInst.get(inst).push(l);
      });
      Array.from(liabByInst.entries()).forEach(([inst, list]) => {
        const totalValue = list.reduce((s, l) => s + Number(l.currentValue || 0), 0);
        const synthetic = {
          id: `liab:${inst}`,
          institution: inst,
          accountName: 'All Liabilities',
          accountIdentifier: 'LIAB-GROUP',
          accountCategory: 'Liabilities',
          totalValue,
          _kind: 'liab_group',
          _items: list
        };
        addInst(inst).push(synthetic);
      });

      // summarize total and needs
      let grouped = Array.from(instMap.entries()).map(([institution, list]) => {
        const totalValue = list.reduce((s,a)=>s+Number(a.totalValue||0),0);
        let needs = 0;
        list.forEach(a=>{
          const r = reconData[a.id];
          const stmt = Number(r?.statementBalance ?? NaN);
          const hasStmt = Number.isFinite(stmt);
          const ne = Number(a.totalValue || 0);
          const mismatched = hasStmt && !withinTolerance(ne, stmt);
          const stale = !r?.lastReconciled || (Math.floor((Date.now() - new Date(r.lastReconciled).getTime())/86400000) > 7);
          if (stale || mismatched) needs += 1;
        });
        return { institution, accounts: list, totalValue, needs };
      });

      if (filterText.trim()) {
        const s = filterText.trim().toLowerCase();
        grouped = grouped.filter(g => (g.institution || '').toLowerCase().includes(s));
      }

      if (showOnlyNeeding) grouped = grouped.filter(g => g.needs > 0);

            // pin current selection so it remains visible after edit
      if (showOnlyNeeding && selectedInstitution) {
        const pinned = raw.find(g => g.institution === selectedInstitution);
        if (pinned && !grouped.find(g => g.institution === selectedInstitution)) {
          grouped = [pinned, ...grouped];
        }
      }

      return grouped.sort((a,b)=>b.totalValue-a.totalValue);
    }, [accounts, liabilities, reconData, filterText, showOnlyNeeding]);

    const current = useMemo(()=>groups.find(g=>g.institution===selectedInstitution),[groups,selectedInstitution]);

    const calc = useCallback((a) => {
      const ne = Number(a.totalValue||0);
      const st = Number(reconData[a.id]?.statementBalance ?? NaN);
      const hasStmt = Number.isFinite(st);
      const diff = hasStmt ? (st - ne) : 0;
      return { nest: ne, stmt: hasStmt ? st : null, diff, pct: hasStmt ? diffPct(ne, diff) : 0, isReconciled: hasStmt ? withinTolerance(ne, st) : false };
    }, [reconData]);

    const handleStatementChange = (accId, v) => {
      const next = { ...reconData, [accId]: { ...(reconData[accId]||{}), statementBalance: Number.isFinite(v) ? v : 0, timestamp: new Date().toISOString() } };
      saveReconData(next);
    };

    const quickReconcile = (a) => {
      const ne = Number(a.totalValue||0);
      const next = { ...reconData, [a.id]: { ...(reconData[a.id]||{}), statementBalance: ne, lastReconciled: new Date().toISOString() } };
      saveReconData(next); showToast('success','Account marked reconciled');
    };

    const continueToNext = () => {
      if (!current) return;
      const list = current.accounts || [];
      if (!selectedAccount) { setSelectedAccount(list[0] || null); return; }
      const idx = list.findIndex(x=>x.id===selectedAccount.id);
      const next = list[idx+1];
      if (next) setSelectedAccount(next);
      else {
        const i = groups.findIndex(g=>g.institution===current.institution);
        const nextInst = groups[i+1];
        if (nextInst) { setSelectedInstitution(nextInst.institution); setSelectedAccount(nextInst.accounts?.[0]||null); showToast('success',`Moving to ${nextInst.institution}`, 2000); }
        else { setSelectedInstitution(null); setSelectedAccount(null); showToast('success','All institutions reviewed.'); }
      }
    };

    const onComplete = () => {
      pushHistory();
      const results = [];
      (groups || []).forEach(grp => {
        (grp.accounts || []).forEach(a => {
          const r = calc(a);
          if (reconData[a.id]?.statementBalance !== undefined) {
            results.push({
              accountName: (a._kind === 'liab_group') ? 'All Liabilities' : (a.accountName || a.account_name || 'Account'),
              institution: grp.institution,
              finalBalance: r.stmt ?? 0,
              change: r.stmt !== null ? r.diff : 0
            });
          }
        });
      });
      saveReconData((d)=>({ ...d, _summary: results }));
      setScreen('summary');
    };

    const positionsForAccount = useMemo(() => {
      if (!selectedAccount) return [];
      if (selectedAccount._kind === 'liab_group') {
        return (selectedAccount._items || []).map(p=>({
          id: p.id, name: p.name || p.identifier || 'Liability', identifier: p.identifier || '', type: p.type || '', value: Number(p.currentValue||0),
        })).sort((a,b)=>b.value-a.value);
      }
      const id = selectedAccount.id;
      return positionsNorm.filter(p=>String(p.accountId)===String(id)).map(p=>({
        id: p.id, name: p.name || p.identifier || 'Position', identifier: p.identifier || '', type: p.type || '', value: Number(p.currentValue||0),
      })).sort((a,b)=>b.value-a.value);
    }, [selectedAccount, positionsNorm]);

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([refreshPositions?.(), refreshAccounts?.(), actions.fetchGroupedLiabilitiesData?.()])
        .finally(()=>setLocalLoading(false));
    }, [refreshPositions, refreshAccounts, actions]);

    return (
      <div className="flex flex-col h-[80vh]">
        <TopHeader
          title="Investment & Liabilities Check-In"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={onRefresh}
          onClearPending={clearPending}
          pending={pending}
          onBack={() => setScreen('welcome')}
          onClose={onClose}
        />

        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Left rail */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Filters */}
              <div className="mb-2 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
                <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-zinc-200">
                  <FilterIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
                    <input
                      value={filterText}
                      onChange={(e)=>setFilterText(e.target.value)}
                      placeholder="Search institutions..."
                      className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 
                      bg-white dark:bg-zinc-800 text-sm 
                      text-gray-900 dark:text-zinc-100 
                      placeholder-gray-400 dark:placeholder-zinc-500"

                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
                  <input type="checkbox" checked={showOnlyNeeding} onChange={(e)=>setShowOnlyNeeding(e.target.checked)} />
                  Needs attention
                </label>
              </div>

              <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="h-full overflow-auto reconciliation-sidebar" style={{ overscrollBehavior: 'contain' }}>
                  {groups.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500 dark:text-zinc-400">No investment or liability groups found.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {groups.map(g=>{
                        const isSel = g.institution === selectedInstitution;
                        const logo = getLogo(g.institution);
                        return (
                          <li key={g.institution}>
                            <button
                              onClick={()=>{ setSelectedInstitution(g.institution); setSelectedAccount(null); }}
                              className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3
                                ${isSel ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
                            >
                              {logo ? <img src={logo} alt={g.institution} className="w-7 h-7 rounded object-contain" /> : <Building2 className="w-6 h-6 text-gray-400" />}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900 dark:text-zinc-100">{g.institution}</div>
                                  <div className="text-xs text-gray-500 dark:text-zinc-400">{g.accounts.length} lines</div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400">{fmtUSD(g.totalValue, !showValues)}</div>
                                {g.needs > 0 ? (
                                  <div className="mt-2 inline-flex items-center text-amber-700 dark:text-amber-300 text-xs">
                                    <AlertTriangle className="w-4 h-4 mr-1" /> {g.needs} to review
                                  </div>
                                ) : (
                                  <div className="mt-2 inline-flex items-center text-green-700 dark:text-emerald-300 text-xs">
                                    <CheckCircle className="w-4 h-4 mr-1" /> Up to date
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Right surface */}
          <section className="col-span-12 lg:col-span-8 xl:col-span-9 h-full">
            {!current ? (
              <div className="h-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 flex items-center justify-center text-center p-10">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">Select an institution to begin</h4>
                  <p className="text-gray-600 dark:text-zinc-400 mt-2 max-w-lg">Enter latest statement totals; we’ll highlight differences.</p>
                </div>
              </div>
            ) : (
              <div className="h-full rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-[1] rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    {getLogo(current.institution) ? (
                      <img src={getLogo(current.institution)} alt={current.institution} className="w-9 h-9 rounded object-contain" />
                    ) : <Building2 className="w-8 h-8 text-gray-400" />}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">{current.institution}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">{current.accounts.length} lines</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={continueToNext}
                      className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                      title="Continue to next account/institution"
                    >
                      Continue <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                    <button
                      onClick={onComplete}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                    >
                      <CheckCheck className="w-4 h-4 inline mr-1" />
                      Complete
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto" style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
                  <div className="min-w-[760px] overflow-auto">
                    <div className="bg-gray-50 dark:bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 sticky top-0 z-[1]">
                      Accounts & Liabilities in {current.institution}
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-[44px] z-[1]">
                        <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
                          <th className="px-6 py-2 text-left">Line</th>
                          <th className="px-3 py-2 text-left">Identifier</th>
                          <th className="px-3 py-2 text-left">Category</th>
                          <th className="px-3 py-2 text-right">NestEgg</th>
                          <th className="px-3 py-2 text-center">Statement</th>
                          <th className="px-3 py-2 text-right">Δ</th>
                          <th className="px-3 py-2 text-right">%</th>
                          <th className="px-3 py-2 text-center">Positions / Items</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {current.accounts.map((a, idx) => {
                          const ne = Number(a.totalValue||0);
                          const st = Number(reconData[a.id]?.statementBalance ?? NaN);
                          const hasStmt = Number.isFinite(st);
                          const diff = hasStmt ? (st - ne) : 0;
                          const pct = hasStmt ? diffPct(ne, diff) : 0;
                          const changed = hasStmt && !withinTolerance(ne, st);
                          const idLabel = (a._kind === 'liab_group') ? 'All Liabilities' : (a.accountName || a.account_name || 'Account');
                          const nextId = current.accounts[idx+1]?.id ? `Statement_balance_for_${(current.accounts[idx+1]._kind==='liab_group'?'All Liabilities':(current.accounts[idx+1].accountName||'Account'))}`.replace(/\s+/g,'_') : undefined;

                          const itemCount = (a._kind === 'liab_group')
                            ? (a._items?.length || 0)
                            : positionsNorm.filter(p=>String(p.accountId)===String(a.id)).length;

                          return (
                            <tr key={a.id} className={`${changed ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                              <td className="px-6 py-2">
                                <div className="font-medium text-gray-900 dark:text-zinc-100">{idLabel}</div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400">{a._kind === 'liab_group' ? 'Liabilities' : (a.accountType || a.type || '—')}</div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{a.accountIdentifier || a.identifier || (a._kind === 'liab_group' ? 'LIAB-GROUP' : '—')}</td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{a.accountCategory || a.category || (a._kind === 'liab_group' ? 'Liabilities' : '—')}</td>
                              <td className="px-3 py-2 text-right text-gray-800 dark:text-zinc-100">{fmtUSD(ne, !showValues)}</td>
                              <td className="px-3 py-2 text-center">
                                <CurrencyInput
                                  value={hasStmt ? st : ne}
                                  onValueChange={(v) => {
                                    const next = { ...reconData, [a.id]: { ...(reconData[a.id]||{}), statementBalance: Number.isFinite(v) ? v : 0, timestamp: new Date().toISOString() } };
                                    saveReconData(next);
                                  }}
                                  aria-label={`Statement balance for ${idLabel}`}
                                  className={`${changed ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/40 bg-white dark:bg-zinc-900' : ''}`}
                                  nextFocusId={nextId}
                                  onFocus={(e) => { lastFocusedIdRef.current = e.target.id; }}
                                />
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                                {hasStmt ? fmtUSD(diff, !showValues) : '—'}
                              </td>
                              <td className={`px-3 py-2 text-right ${!hasStmt || ne === 0 ? 'text-gray-500 dark:text-zinc-400' : (diff > 0 ? 'text-green-600' : 'text-red-600')}`}>
                                {!hasStmt || ne === 0 ? '—' : `${pct.toFixed(2)}%`}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center text-xs text-gray-600 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700">
                                  {itemCount}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={()=>setSelectedAccount(a)}
                                    className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200"
                                    title={a._kind === 'liab_group' ? 'View liabilities' : 'View positions'}
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={()=>quickReconcile(a)}
                                    className="px-2.5 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700/30"
                                    title="Set statement equal to NestEgg"
                                  >
                                    Set = NestEgg
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Drilldown positions / liabilities */}
                    {selectedAccount && (
                      <div className="px-6 py-4 border-top border-gray-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-zinc-100">
                              {(selectedAccount._kind === 'liab_group') ? 'All Liabilities' : (selectedAccount.accountName || selectedAccount.account_name || 'Account')} • Details
                            </div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400">{positionsForAccount.length} items</div>
                          </div>
                          <button
                            onClick={continueToNext}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            Continue <ChevronRight className="inline w-4 h-4 ml-1" />
                          </button>
                        </div>

                        <div className="max-h-[32vh] overflow-auto border border-gray-200 dark:border-zinc-800 rounded-lg" style={{ overscrollBehavior: 'contain' }}>
                          <table className="w-full min-w-[560px]">
                            <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-10">
                              <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-left">Identifier</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-right">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                              {positionsForAccount.map(p=>(
                                <tr key={p.id}>
                                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-zinc-100">{p.name}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{p.identifier || '—'}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{p.type || '—'}</td>
                                  <td className="px-3 py-2 text-right text-sm text-gray-900 dark:text-zinc-100">{fmtUSD(p.value, !showValues)}</td>
                                </tr>
                              ))}
                              {positionsForAccount.length===0 && (
                                <tr><td className="px-4 py-3 text-sm text-gray-500 dark:text-zinc-400" colSpan={4}>No items found.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ================= Summary Screen =================
  function SummaryScreen() {
    const results = reconData?._summary || [];
    const totalValue = results.reduce((s,r)=>s+Number(r.finalBalance||0),0);
    const accuracy = 100; // placeholder

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([refreshPositions?.(), refreshAccounts?.(), actions.fetchGroupedLiabilitiesData?.()])
        .finally(()=>setLocalLoading(false));
    }, [refreshPositions, refreshAccounts, actions]);

    return (
      <div className="flex flex-col min-h-[70vh]">
        <TopHeader
          title="Reconciliation Complete"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={onRefresh}
          onClearPending={clearPending}
          pending={pending}
          onBack={() => setScreen('reconcile')}
          onClose={onClose}
        />

        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 p-8 flex-1 overflow-auto" style={{ overscrollBehavior: 'contain' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-2xl">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">Reconciliation Complete 🎉</h1>
              <p className="text-gray-600 dark:text-zinc-400 mt-2">Nice work. Your data is up to date.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                  <span className="text-3xl font-bold dark:text-zinc-100">{results.length}</span>
                </div>
                <div className="text-gray-700 dark:text-zinc-300 font-semibold">Lines Reconciled</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <Droplets className="w-7 h-7 text-blue-600" />
                  <span className="text-3xl font-bold dark:text-zinc-100">—</span>
                </div>
                <div className="text-gray-700 dark:text-zinc-300 font-semibold">Quick Updates</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-7 h-7 text-indigo-600" />
                  <span className="text-2xl font-bold dark:text-zinc-100">{fmtUSD(totalValue)}</span>
                </div>
                <div className="text-gray-700 dark:text-zinc-300 font-semibold">Total Value</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <Percent className="w-7 h-7 text-purple-600" />
                  <span className="text-sm font-bold dark:text-zinc-100">{accuracy}%</span>
                </div>
                <div className="text-gray-700 dark:text-zinc-300 font-semibold">Accuracy</div>
              </div>
            </div>

            {results.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-800 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-600 dark:text-zinc-400" />
                  Reconciliation Details
                </h3>
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-zinc-100">{r.accountName}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">{r.institution}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-zinc-100">{fmtUSD(r.finalBalance)}</div>
                        {r.change !== 0 && (
                          <div className={`text-sm ${r.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {r.change > 0 ? '+' : ''}{fmtUSD(r.change)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3"><div className="p-2 bg-white/20 rounded"><Clock className="w-6 h-6" /></div><div><div className="font-semibold">Schedule weekly</div><div className="text-sm text-blue-100">Reconciling weekly keeps drift low</div></div></div>
                <div className="flex items-start gap-3"><div className="p-2 bg-white/20 rounded"><LineChart className="w-6 h-6" /></div><div><div className="font-semibold">Track progress</div><div className="text-sm text-blue-100">Watch portfolio health trend</div></div></div>
                <div className="flex items-start gap-3"><div className="p-2 bg-white/20 rounded"><Bell className="w-6 h-6" /></div><div><div className="font-semibold">Set alerts</div><div className="text-sm text-blue-100">Get pinged when data drifts</div></div></div>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={onClose} className="px-5 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-gray-100 transition-colors">Back to Dashboard</button>
                <button onClick={()=>setScreen('welcome')} className="px-5 py-2.5 bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors">Start New Reconciliation</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============== Render ==========================================
  const titleId = 'qr-title';

  const onRefreshRoot = useCallback(() => {
    setLocalLoading(true);
    Promise.all([refreshPositions?.(), refreshAccounts?.(), actions.fetchGroupedLiabilitiesData?.()])
      .finally(()=>setLocalLoading(false));
  }, [refreshPositions, refreshAccounts, actions]);

  return (
    <ModalShell
      isOpen={isOpen}
      onRequestClose={onClose}
      onBeforeClose={onBeforeClose}
      titleId={titleId}
    >
      {((loading || localLoading) && screen === 'welcome') ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-zinc-400">Loading your portfolio...</p>
          </div>
        </div>
      ) : (
        <>
          {screen === 'welcome' && <WelcomeScreen />}
          {screen === 'liquid' && <LiquidScreen />}
          {screen === 'reconcile' && <ReconcileScreen />}
          {screen === 'summary' && <SummaryScreen />}
        </>
      )}

      {/* Global toast */}
      {toast && <Toast type={toast.type} text={toast.text} onClose={() => setToast(null)} />}
    </ModalShell>
  );
}
export function QuickReconciliationButton({ className = '', label = 'Reconcile' }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700'}
      >
        {label}
      </button>
      <QuickReconciliationModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}