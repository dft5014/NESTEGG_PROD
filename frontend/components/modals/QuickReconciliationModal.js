// QuickReconciliationModal.js
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Check, CheckCircle, CheckSquare, CheckCheck, AlertCircle, AlertTriangle, Info, Clock, Loader2,
  ChevronRight, ChevronLeft, ArrowLeft, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Building2 as Landmark, DollarSign, Droplets, LineChart, Bell, Sparkles, Target, Trophy, FileText, FileCheck, RefreshCw, Percent
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

// ===== Shared, focus-stable, paste-friendly currency input =====
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
  const debounceRef = React.useRef(null);

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
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timeout for value change - increased delay for stability
    debounceRef.current = setTimeout(() => {
      onValueChange?.(Number(nextRaw || 0));
    }, 300);
  };

  // Add cleanup
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
        el.setSelectionRange(end, end);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (['e', 'E'].includes(e.key)) e.preventDefault();
    if (e.key === 'Enter' && nextFocusId) {
      e.preventDefault();
      const nextEl = document.getElementById(nextFocusId);
      if (nextEl) nextEl.focus();
    }
  };

  return (
    <input
      ref={inputRef}
      id={ariaLabel?.replace(/\s+/g, '_')}
      type="text"
      inputMode="decimal"
      value={
        focused
          ? raw
          : Number.isFinite(value)
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
          : ''
      }
      onFocus={(e) => { 
        setFocused(true); 
        onFocus?.(e);
        // Select all text on focus for easier editing
        setTimeout(() => {
          e.target.select();
        }, 10);
      }}
      onBlur={(e) => { 
        setFocused(false); 
        onBlur?.(e); 
      }}
      onChange={handleChange}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      placeholder="$0.00"
      aria-label={ariaLabel}
      className={`${className} w-24 px-2 py-1 text-center rounded-lg border 
        bg-white dark:bg-zinc-900 
        text-gray-900 dark:text-white 
        placeholder-gray-400 dark:placeholder-zinc-500
        focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
        border-gray-300 dark:border-zinc-700
        font-medium`}
      autoComplete="off"
    />
  );
});


// ------- Keys (normalized across assets & liabilities) -------
const makeKey = (kind, id) => `${kind}:${id}`;           // kind: 'asset' | 'liability'
const parseKey = (key) => { const [kind, id] = String(key).split(':'); return { kind, id }; };

// ------- Persistence namespaces (user-scoped) -------
const NS = (userId) => `nestegg:v1:recon:${userId || 'anon'}`;
const LS_DATA = (u) => `${NS(u)}:data`;
const LS_HISTORY = (u) => `${NS(u)}:history`;
const LS_DRAFT_PREFIX = (u) => `${NS(u)}:draft:`;

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
  const saveReconData = useCallback((data) => {
    setReconData(data);
    try { localStorage.setItem(LS_DATA(userId), JSON.stringify(data)); } catch {/* noop */}
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
    setTimeout(() => { // gently fetch latest if empty
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

  // Derived: liquid cash-like assets
  const liquidAssets = useMemo(() => {
    return positionsNorm.filter((p) => {
      const t = (p.type || '').toLowerCase();
      return ['cash','checking','savings'].includes(t) || /checking|savings|cash/i.test(p.name || '');
    });
  }, [positionsNorm]);

  // Liabilities from store
  const { groupedLiabilities } = state;
  useEffect(() => {
    if (!groupedLiabilities?.lastFetched && !groupedLiabilities?.loading) {
      actions.fetchGroupedLiabilitiesData?.();
    }
  }, [groupedLiabilities?.lastFetched, groupedLiabilities?.loading, actions]);

  const liabilities = useMemo(() => {
    console.log('[QuickRecon] Raw liability data:', groupedLiabilities?.data?.[0]); // Debug first liability
    return (groupedLiabilities?.data || []).map((L) => {
      const id = L.item_id ?? L.liability_id ?? L.id ?? L.history_id;
      const t = (L.item_type || L.type || 'liability').toLowerCase();
      // CRITICAL FIX: Use total_current_balance which is what the API returns
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
  // drafts map: key -> number (key = 'asset:<id>' | 'liability:<id>')
  const [drafts, setDrafts] = useState({});
  const draftKeyPrefix = LS_DRAFT_PREFIX(userId);

  // persist drafts per selection scope, but also maintain a global merged store so the KPI is stable
  const saveDraftsScoped = useCallback((scopeKey, obj) => {
    try { localStorage.setItem(`${draftKeyPrefix}${scopeKey}`, JSON.stringify(obj)); } catch {/* noop */}
  }, [draftKeyPrefix]);

  const loadAllDrafts = useCallback(() => {
    const out = {};
    try {
      for (let i=0;i<localStorage.length;i+=1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(draftKeyPrefix)) {
          Object.assign(out, JSON.parse(localStorage.getItem(k) || '{}'));
        }
      }
    } catch {/* noop */}
    return out;
  }, [draftKeyPrefix]);

  useEffect(() => { if (isOpen) setDrafts(loadAllDrafts()); }, [isOpen, loadAllDrafts]);

  // Pending KPI (global)
  const pending = useMemo(() => {
    const rows = [
      ...liquidAssets.map(p => ({ key: makeKey('asset', p.id), curr: Number(p.currentValue || 0) })),
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
  }, [liquidAssets, liabilities, drafts]);

  // Dirty guard on close
  const hasUnsaved = pending.count > 0;
  const onBeforeClose = useCallback(async () => {
    if (!hasUnsaved) return true;
    // simple confirm; replace with custom dialog if needed
    return confirm('You have pending edits that are not submitted yet. Close anyway?');
  }, [hasUnsaved]);

  // ===================== Screens =====================
  function WelcomeScreen() {
    // History streak (for motivation)
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

    // Institution preview: cash + liabilities grouped
    const preview = useMemo(() => {
      const map = new Map();
      const add = (inst) => { if (!map.has(inst)) map.set(inst, { institution: inst, rows: [], value: 0, drafted: 0, changed: 0, saved: 0 }); return map.get(inst); };
      liquidAssets.forEach(p => {
        const inst = p.institution || 'Unknown Institution'; const g = add(inst);
        const key = makeKey('asset', p.id); const curr = Number(p.currentValue||0); const d = drafts[key];
        const hasDraft = d !== undefined && Number.isFinite(d);
        const hasChange = hasDraft && d !== curr;
        g.rows.push({ kind:'asset', key, curr, draft: d });
        g.value += Math.abs(curr); g.drafted += hasDraft ? 1 : 0; g.changed += hasChange ? 1 : 0;
      });
      liabilities.forEach(p => {
        const inst = p.institution || 'Unknown Institution'; const g = add(inst);
        const key = makeKey('liability', p.id); const curr = Number(p.currentValue||0); const d = drafts[key];
        const hasDraft = d !== undefined && Number.isFinite(d);
        const hasChange = hasDraft && d !== curr;
        g.rows.push({ kind:'liability', key, curr, draft: d });
        g.value += Math.abs(curr); g.drafted += hasDraft ? 1 : 0; g.changed += hasChange ? 1 : 0;
      });
      // progress uses Changed (not just Drafted) to reflect true deltas
      return Array.from(map.values()).sort((a,b)=>b.value-a.value).map(g => ({
        ...g,
        total: g.rows.length,
        progressPct: g.total ? ((g.total - g.changed) / g.total) * 100 : 0
      }));
    }, [liquidAssets, liabilities, drafts]);

    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 id="qr-title" className="text-3xl font-bold text-gray-900 dark:text-zinc-100">Quick Update & Reconcile</h1>
            <p className="text-gray-600 dark:text-zinc-400 mt-1">
              Paste or type balances for cash, cards, and loans; then verify investment accounts. Last full update: <span className="font-medium">{lastStr}</span>.
            </p>
          </div>

          {/* Summary KPIs (global) */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-white dark:bg-zinc-900 px-4 py-2 border border-gray-200 dark:border-zinc-800 text-right">
              <div className="text-xs text-gray-500 dark:text-zinc-400">Pending</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{pending.count}</div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-emerald-900/20 px-4 py-2 border border-green-200 dark:border-emerald-800 text-right">
              <div className="text-xs text-green-700 dark:text-emerald-400">↑ {pending.posCount}</div>
              <div className="text-sm font-semibold text-green-800 dark:text-emerald-300">{fmtUSD(pending.posAmt, !showValues)}</div>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-rose-900/20 px-4 py-2 border border-red-200 dark:border-rose-800 text-right">
              <div className="text-xs text-red-700 dark:text-rose-400">↓ {pending.negCount}</div>
              <div className="text-sm font-semibold text-red-800 dark:text-rose-300">{fmtUSD(pending.negAmt, !showValues)}</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-900 px-4 py-2 border border-gray-200 dark:border-zinc-800 text-right">
              <div className="text-xs text-gray-500 dark:text-zinc-400">Net Impact</div>
              <div className={`text-lg font-semibold ${pending.net >= 0 ? 'text-green-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'}`}>
                {fmtUSD(pending.net, !showValues)}
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="font-semibold text-gray-900 dark:text-zinc-100">Investment Check‑In</div>
                <div className="text-sm text-gray-600 dark:text-zinc-400">Verify account totals match statements</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => { setScreen('liquid'); /* chain into reconcile on submit */ setReconData((d)=>({ ...d, _next:'reconcile' })); }}
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
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Institutions Overview</h3>
            <div className="text-xs text-gray-500 dark:text-zinc-400">
              Values {showValues ? 'visible' : 'hidden'}
              <button
                onClick={()=>setShowValues(s=>!s)}
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700"
              >
                {showValues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Toggle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[38vh] overflow-auto pr-1">
            {(() => {
              const list = preview;
              if (!list.length) return <div className="text-sm text-gray-500 dark:text-zinc-400">Add accounts to get started.</div>;
              return list.map((g) => {
                const logo = getLogo(g.institution);
                const done = g.total > 0 && g.changed === 0;
                return (
                  <div
                    key={g.institution}
                    className={`rounded-xl border transition-all bg-white dark:bg-zinc-900 ${
                      done ? 'border-green-200 dark:border-emerald-700/40' : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                    } p-4`}
                  >
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <img src={logo} alt={g.institution} className="w-8 h-8 rounded object-contain" />
                      ) : <Landmark className="w-8 h-8 text-gray-400" />}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-zinc-100">{g.institution}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">{g.total} items • {fmtUSD(g.value, !showValues)}</div>
                      </div>
                      {done
                        ? <span className="inline-flex items-center text-green-700 dark:text-emerald-300 text-xs"><CheckCircle className="w-4 h-4 mr-1" /> Ready</span>
                        : <span className="inline-flex items-center text-amber-700 dark:text-amber-300 text-xs"><AlertTriangle className="w-4 h-4 mr-1" /> Drafts</span>
                      }
                    </div>
                    <div className="mt-3 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`${done ? 'bg-green-500' : 'bg-blue-500'} h-full transition-all`} style={{ width: `${clamp(g.progressPct,0,100)}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="text-gray-500 dark:text-zinc-400">Drafted: <span className="font-medium text-gray-700 dark:text-zinc-200">{g.drafted}</span></div>
                      <div className="text-gray-500 dark:text-zinc-400">Changed: <span className="font-medium text-gray-700 dark:text-zinc-200">{g.changed}</span></div>
                      <div className="text-gray-500 dark:text-zinc-400">Saved: <span className="font-medium text-gray-700 dark:text-zinc-200">{/* saved per-row if you track responses */}—</span></div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  }

  // ================= Liquid Screen =================
  function LiquidScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [sortKey, setSortKey] = useState('nest'); // 'nest' | 'name' | 'diff'
    const [sortDir, setSortDir] = useState('desc');
    const [editingKey, setEditingKey] = useState(null); // freeze sort while typing
    const [isFrozen, setIsFrozen] = useState(false); // complete freeze during input
    const [jumping, setJumping] = useState(false);

    // build groups
    const groups = useMemo(() => {
      const map = new Map();
      const add = (inst) => { if (!map.has(inst)) map.set(inst, { institution: inst, positions: [], liabilities: [], totalValue: 0 }); return map.get(inst); };
      liquidAssets.forEach(p => { const g = add(p.institution || 'Unknown Institution'); g.positions.push(p); g.totalValue += Math.abs(Number(p.currentValue||0)); });
      liabilities.forEach(p => { const g = add(p.institution || 'Unknown Institution'); g.liabilities.push(p); g.totalValue += Math.abs(Number(p.currentValue||0)); });

      const enriched = Array.from(map.values()).map((g) => {
        const totalRows = g.positions.length + g.liabilities.length;
        let drafted=0, changed=0;
        g.positions.forEach(p => { const key = makeKey('asset', p.id); const d = drafts[key]; if (d!==undefined) drafted+=1; if (d!==undefined && d!==Number(p.currentValue||0)) changed+=1; });
        g.liabilities.forEach(p => { const key = makeKey('liability', p.id); const d = drafts[key]; if (d!==undefined) drafted+=1; if (d!==undefined && d!==Number(p.currentValue||0)) changed+=1; });
        return { ...g, totalRows, drafted, changed, progressPct: totalRows ? ((totalRows - changed) / totalRows)*100 : 0 };
      });

      return enriched.sort((a,b)=>b.totalValue-a.totalValue);
    }, [liquidAssets, liabilities, drafts]);

    useEffect(() => {
      if (selectedInstitution && !groups.find(g=>g.institution===selectedInstitution)) setSelectedInstitution(null);
    }, [groups, selectedInstitution]);

    const current = useMemo(()=>groups.find(g=>g.institution===selectedInstitution),[groups,selectedInstitution]);

    const headerSortIcon = (key) => (sortKey === key ? <span className="ml-1 text-gray-400 dark:text-zinc-500">{sortDir === 'asc' ? '▲' : '▼'}</span> : null);
    const toggleSort = (key) => { if (sortKey===key) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortKey(key); setSortDir('desc'); } };

    const makeSorted = useCallback((rows, kind) => {
      const rowsWithCalc = rows.map((p, idx) => {
        const key = makeKey(kind, p.id);
        const nest = Number(p.currentValue||0);
        const stmt = drafts[key] !== undefined ? Number(drafts[key]) : nest;
        const diff = stmt - nest;
        const pct = nest !== 0 ? (diff / nest) * 100 : 0;
        return { ...p, _calc: { nest, stmt, diff, pct }, _key: key, _idx: idx, _originalIndex: idx };
      });
      
      // CRITICAL: While editing ANY field, maintain original order completely
      if (editingKey) {
        return rowsWithCalc.sort((a, b) => a._originalIndex - b._originalIndex);
      }
      
      // Only sort when not editing
      const sorted = [...rowsWithCalc];
      sorted.sort((a,b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
        if (sortKey === 'diff') return (a._calc.diff - b._calc.diff) * dir;
        return (a._calc.nest - b._calc.nest) * dir; // 'nest'
      });
      return sorted;
    }, [sortKey, sortDir, drafts, editingKey]);

    const sortedPositions = useMemo(() => {
      if (!current?.positions) return [];
      return makeSorted(current.positions, 'asset');
    }, [current?.positions, makeSorted, editingKey]); // Add editingKey as dependency

    const sortedLiabilities = useMemo(() => {
      if (!current?.liabilities) return [];
      return makeSorted(current.liabilities, 'liability');
    }, [current?.liabilities, makeSorted, editingKey]); // Add editingKey as dependency

    // bulk paste (CSV/TSV or column)
    const onBulkPaste = (e) => {
      if (!current) return;
      const txt = e.clipboardData?.getData('text') || '';
      if (!txt) return;
      const hasTabs = txt.includes('\t');
      const lines = txt.trim().split(/\r?\n/).map(row => {
        if (hasTabs) return row.split('\t');
        if (row.includes(',')) return row.split(','); // crude CSV; good enough for numeric paste
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
        // persist scoped
        try { localStorage.setItem(`${LS_DRAFT_PREFIX(userId)}${scopeKey}`, JSON.stringify(Object.fromEntries(keys.map(k=>[k, next[k]])))); } catch {}
        return next;
      });
      showToast('success', `Pasted ${Math.min(keys.length, flat.length)} values`);
    };

    // Save selected institution
    const saveInstitution = async () => {
      if (!current) return;
      // build changes
      const changes = [];
      current.positions.forEach(p => {
        const key = makeKey('asset', p.id);
        const curr = Number(p.currentValue||0);
        const next = drafts[key]; if (next===undefined || !Number.isFinite(next) || next===curr) return;
        changes.push({ kind:'cash', id: p.itemId ?? p.id, value: next });
      });
      current.liabilities.forEach(p => {
        const key = makeKey('liability', p.id);
        const curr = Number(p.currentValue||0);
        const next = drafts[key]; 
        if (next === undefined || !Number.isFinite(next) || next === curr) return;
        // Use the correct ID field for liabilities
        const liabilityId = p.itemId ?? p.id;
        changes.push({ kind: 'liability', id: liabilityId, value: next });
      });
      if (!changes.length) { showToast('info','No changes to apply'); return; }

      // parallelize writes in small batches
      const chunks = (arr, n) => Array.from({length: Math.ceil(arr.length/n)}, (_,i)=>arr.slice(i*n,(i+1)*n));
      const batches = chunks(changes, 4);
      setLocalLoading(true);
      let failed = [];
      try {
        for (const batch of batches) {
          const tasks = batch.map(b => {
            const v = Number(b.value);
            if (!Number.isFinite(v)) return Promise.resolve();
            if (b.kind === 'cash') return updateCashPosition(b.id, { amount: v });
            if (b.kind === 'liability') return updateLiability(b.id, { current_balance: v });
            return updateOtherAsset(Number(b.id), { current_value: v });
          });
          const results = await Promise.allSettled(tasks);
          results.forEach((r, idx) => { if (r.status === 'rejected') failed.push(batch[idx]); });
        }
        // refresh
        await Promise.all([
          refreshPositions?.(),
          actions?.fetchGroupedPositionsData?.(true),
          actions?.fetchPortfolioData?.(true),
        ]);
        // persist lastUpdated locally
        const nextData = { ...reconData };
        changes.forEach((c)=>{ nextData[`pos_${makeKey(c.kind==='liability'?'liability':'asset', c.id)}`] = { lastUpdated: new Date().toISOString(), value: Number(c.value) }; });
        saveReconData(nextData);
        pushHistory();
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

    return (
      <div className="h-[80vh] px-6 pt-3 pb-6 border-t border-gray-200 dark:border-zinc-800" onPaste={onBulkPaste}>
        <div className="grid grid-cols-12 gap-6 h-full">
        {/* Left rail */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm p-4 mb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setScreen('welcome')}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 transition-colors border border-gray-200 dark:border-zinc-700"
                    title="Back to welcome"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowValues(s=>!s)}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
                      title={showValues ? 'Hide values' : 'Show values'}
                    >
                      {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => { setLocalLoading(true); Promise.all([refreshPositions?.(), refreshAccounts?.()]).finally(()=>setLocalLoading(false)); }}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
                      title="Refresh data"
                    >
                      <RefreshCw className={`w-4 h-4 ${localLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  <h3 className="font-semibold text-gray-900 dark:text-zinc-100">Quick Cash & Liabilities Update</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
                  Paste or type balances. Net impact updates in real time.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 px-3 py-2 border border-gray-200 dark:border-zinc-800">
                    <div className="text-gray-500 dark:text-zinc-400">Pending</div>
                    <div className="font-semibold text-gray-900 dark:text-zinc-100">{pending.count}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-zinc-900 px-3 py-2 border border-gray-200 dark:border-zinc-800">
                    <div className="text-gray-500 dark:text-zinc-400">Net Impact</div>
                    <div className={`font-semibold ${pending.net >= 0 ? 'text-green-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'}`}>
                      {fmtUSD(pending.net, !showValues)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-emerald-900/20 px-3 py-2 border border-green-200 dark:border-emerald-800">
                    <div className="text-green-700 dark:text-emerald-300">↑ {pending.posCount} items</div>
                    <div className="font-semibold text-green-800 dark:text-emerald-200">{fmtUSD(pending.posAmt, !showValues)}</div>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-rose-900/20 px-3 py-2 border border-red-200 dark:border-rose-800">
                    <div className="text-red-700 dark:text-rose-300">↓ {pending.negCount} items</div>
                    <div className="font-semibold text-red-800 dark:text-rose-200">{fmtUSD(pending.negAmt, !showValues)}</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="h-full overflow-y-auto reconciliation-sidebar">
                  {groups.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500 dark:text-zinc-400">No cash or liabilities found.</div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {groups.map(g => {
                      const isSel = g.institution === selectedInstitution;
                      const logoSmall = getLogo(g.institution);
                      const statusChip = g.changed > 0
                        ? <span className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full text-[11px]">Changed</span>
                        : <span className="text-green-700 dark:text-emerald-300 bg-green-50 dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-800 px-2 py-0.5 rounded-full text-[11px]">No changes</span>;

                      return (
                        <li key={g.institution}>
                          <button
                            onClick={() => setSelectedInstitution(g.institution)}
                            className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3
                              ${isSel ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
                          >
                            {logoSmall ? <img src={logoSmall} alt={g.institution} className="w-7 h-7 rounded object-contain" /> : <Landmark className="w-6 h-6 text-gray-400" />}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 dark:text-zinc-100">{g.institution}</div>
                                <div className="flex items-center gap-2">
                                  {statusChip}
                                  <div className="text-[11px] text-gray-500 dark:text-zinc-400">{g.totalRows} items</div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-zinc-400">{fmtUSD(g.totalValue, !showValues)}</div>
                              <div className="mt-2 h-1.5 bg-gray-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`${g.changed>0 ? 'bg-amber-500' : 'bg-blue-500'} h-full transition-all`} style={{ width: `${clamp(g.progressPct,0,100)}%` }} />
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
                    Update checking/savings balances and any credit cards, loans, or mortgages. Paste from spreadsheets—values are auto‑detected.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`h-full rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col ${jumping ? 'ring-2 ring-blue-200 dark:ring-blue-900/40 transition' : ''}`}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-[1]">
                  <div className="flex items-center gap-3">
                    {getLogo(current.institution) ? (
                      <img src={getLogo(current.institution)} alt={current.institution} className="w-9 h-9 rounded object-contain" />
                    ) : <Landmark className="w-8 h-8 text-gray-400" />}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">{current.institution}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">{current.positions.length} accounts • {current.liabilities.length} liabilities</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <div className="text-xs text-gray-500 dark:text-zinc-400">Total</div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">{fmtUSD(current.totalValue, !showValues)}</div>
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

                <div className="flex-1 overflow-auto">
                  {/* Accounts & Cash */}
                  {sortedPositions.length > 0 && (
                    <div className="min-w-[780px]">
                      <div className="bg-gray-50 dark:bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 sticky top-0 z-[1]">Accounts & Cash</div>
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
                            const changed = drafts[makeKey('asset', pos.id)] !== undefined && Number(drafts[makeKey('asset', pos.id)]) !== c.nest;
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
                                      value={drafts[makeKey('asset', pos.id)] ?? c.nest}
                                      onValueChange={(v) => {
                                        // Use functional update to prevent re-renders
                                        setDrafts(prev => {
                                          const newDrafts = { ...prev };
                                          newDrafts[makeKey('asset', pos.id)] = Number.isFinite(v) ? v : 0;
                                          return newDrafts;
                                        });
                                      }}
                                      nextFocusId={nextId}
                                      onFocus={() => {
                                        const key = makeKey('asset', pos.id);
                                        setEditingKey(key);
                                        setIsFrozen(true);
                                      }}
                                      onBlur={() => {
                                        setTimeout(() => {
                                          setEditingKey(null);
                                          setIsFrozen(false);
                                        }, 100);
                                      }}
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
                    <div className="min-w-[780px] mt-8">
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
                                      onValueChange={(v) =>
                                        setDrafts(prev => ({ ...prev, [key]: Number.isFinite(v) ? v : 0 }))
                                      }
                                      nextFocusId={nextId}
                                      onFocus={() => setEditingKey(key)}
                                      onBlur={() => setEditingKey(null)}
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

  // ================= Reconcile Screen =================
  function ReconcileScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // group by institution
    const groups = useMemo(() => {
      const map = new Map();
      (accounts || []).forEach((a) => {
        const inst = a.institution || 'Unknown Institution';
        if (!map.has(inst)) map.set(inst, []);
        map.get(inst).push(a);
      });
      return Array.from(map.entries()).map(([institution, list]) => {
        const totalValue = list.reduce((s,a)=>s+Number(a.totalValue||0),0);
        // Needs = stale or mismatched
        let needs = 0;
        list.forEach(a=>{
          const r = reconData[a.id];
          const stmt = Number(r?.statementBalance ?? NaN);
          const hasStmt = Number.isFinite(stmt);
          const ne = Number(a.totalValue || 0);
          const diff = hasStmt ? (stmt - ne) : 0;
          const rec = r?.lastReconciled;
          const stale = !rec || (Math.floor((Date.now() - new Date(rec).getTime())/86400000) > 7);
          const mismatched = hasStmt && !withinTolerance(ne, stmt);
          if (stale || mismatched) needs += 1;
        });
        return { institution, accounts: list, totalValue, needs };
      }).sort((a,b)=>b.totalValue-a.totalValue);
    }, [accounts, reconData]);

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
      const results = (accounts||[]).filter(a=>reconData[a.id]?.statementBalance !== undefined).map(a=>{
        const r = calc(a);
        return { accountName: a.accountName || a.account_name || 'Account', institution: a.institution, finalBalance: r.stmt ?? 0, change: r.stmt !== null ? r.diff : 0 };
      });
      setReconData((d)=>({ ...d, _summary: results }));
      setScreen('summary');
    };

    const positionsForAccount = useMemo(() => {
      if (!selectedAccount) return [];
      const id = selectedAccount.id;
      return positionsNorm.filter(p=>String(p.accountId)===String(id)).map(p=>({
        id: p.id, name: p.name || p.identifier || 'Position', identifier: p.identifier || '', type: p.type || '', value: Number(p.currentValue||0),
      })).sort((a,b)=>b.value-a.value);
    }, [selectedAccount, positionsNorm]);

    return (
      <div className="h-[80vh] px-6 pt-3 pb-6 border-t border-gray-200 dark:border-zinc-800">
        <div className="grid grid-cols-12 gap-6 h-full">
        {/* Left rail */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm p-4 mb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setScreen('welcome')}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 transition-colors border border-gray-200 dark:border-zinc-700"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowValues(s=>!s)}
                      className={`p-2 rounded-lg ${showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} dark:bg-zinc-800 dark:text-zinc-200`}
                      title={showValues ? 'Hide values' : 'Show values'}
                    >
                      {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={onComplete}
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                    >
                      <CheckCheck className="w-4 h-4 inline mr-1" />
                      Complete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
                  Enter statement totals per investment account. We’ll flag differences and let you step through accounts quickly.
                </p>
                </div>

                <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="h-full overflow-y-auto reconciliation-sidebar">
                    {groups.length === 0 ? (
                      <div className="p-6 text-sm text-gray-500 dark:text-zinc-400">No investment accounts found.</div>
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
                            {logo ? <img src={logo} alt={g.institution} className="w-7 h-7 rounded object-contain" /> : <Landmark className="w-6 h-6 text-gray-400" />}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 dark:text-zinc-100">{g.institution}</div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400">{g.accounts.length} accounts</div>
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
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-[1]">
                  <div className="flex items-center gap-3">
                    {getLogo(current.institution) ? (
                      <img src={getLogo(current.institution)} alt={current.institution} className="w-9 h-9 rounded object-contain" />
                    ) : <Landmark className="w-8 h-8 text-gray-400" />}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">{current.institution}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">{current.accounts.length} accounts</div>
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
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <div className="min-w-[720px]">
                    <div className="bg-gray-50 dark:bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 sticky top-0 z-[1]">
                      Accounts in {current.institution}
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-[44px] z-[1]">
                        <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
                          <th className="px-6 py-2 text-left">Account</th>
                          <th className="px-3 py-2 text-left">Identifier</th>
                          <th className="px-3 py-2 text-left">Category</th>
                          <th className="px-3 py-2 text-right">NestEgg</th>
                          <th className="px-3 py-2 text-center">Statement</th>
                          <th className="px-3 py-2 text-right">Δ</th>
                          <th className="px-3 py-2 text-right">%</th>
                          <th className="px-3 py-2 text-center">Positions</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {current.accounts.map((a) => {
                          const r = calc(a);
                          const posCount = positionsNorm.filter(p=>String(p.accountId)===String(a.id)).length;
                          const isSel = selectedAccount?.id === a.id;
                          const changed = r.stmt !== null && !withinTolerance(r.nest, r.stmt);

                          return (
                            <tr key={a.id} className={`${isSel ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                              <td className="px-6 py-2">
                                <div className="font-medium text-gray-900 dark:text-zinc-100">{a.accountName || a.account_name || 'Account'}</div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400">{a.accountType || a.type || '—'}</div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{a.accountIdentifier || a.identifier || '—'}</td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{a.accountCategory || a.category || '—'}</td>
                              <td className="px-3 py-2 text-right text-gray-800 dark:text-zinc-100">{fmtUSD(r.nest, !showValues)}</td>
                              <td className="px-3 py-2 text-center">
                                  <CurrencyInput
                                    value={r.stmt ?? r.nest}
                                    onValueChange={(v) => handleStatementChange(a.id, v)}
                                    aria-label={`Statement balance for ${a.accountName || 'Account'}`}
                                    className={`${changed ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-900/40 bg-white dark:bg-zinc-900' : ''}`}
                                  />
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${r.diff > 0 ? 'text-green-600' : r.diff < 0 ? 'text-red-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                                {r.stmt === null ? '—' : fmtUSD(r.diff, !showValues)}
                              </td>
                              <td className={`px-3 py-2 text-right ${r.stmt === null || r.nest === 0 ? 'text-gray-500 dark:text-zinc-400' : (r.diff > 0 ? 'text-green-600' : 'text-red-600')}`}>
                                {r.stmt === null || r.nest === 0 ? '—' : `${r.pct.toFixed(2)}%`}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center text-xs text-gray-600 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700">
                                  {posCount}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={()=>setSelectedAccount(a)}
                                    className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200"
                                    title="View positions"
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={()=>quickReconcile(a)}
                                    className="px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white"
                                    title="Set statement equal to NestEgg"
                                  >
                                    Quick
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Drilldown positions */}
                    {selectedAccount && (
                      <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-zinc-100">
                              {selectedAccount.accountName || selectedAccount.account_name || 'Account'} • Positions
                            </div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400">{positionsForAccount.length} positions</div>
                          </div>
                          <button
                            onClick={continueToNext}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            Continue <ChevronRight className="inline w-4 h-4 ml-1" />
                          </button>
                        </div>

                        <div className="max-h-[32vh] overflow-auto border border-gray-200 dark:border-zinc-800 rounded-lg">
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
                                <tr><td className="px-4 py-3 text-sm text-gray-500 dark:text-zinc-400" colSpan={4}>No positions found for this account.</td></tr>
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
    const accuracy = 100; // placeholder; could compute from withinTolerance ratios if desired

    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 p-8">
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
              <div className="text-gray-700 dark:text-zinc-300 font-semibold">Accounts Reconciled</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <Droplets className="w-7 h-7 text-blue-600" />
                <span className="text-3xl font-bold dark:text-zinc-100">—</span>
              </div>
              <div className="text-gray-700 dark:text-zinc-300 font-semibold">Liquid Positions</div>
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
    );
  }

  // ============== Render ==========================================
  const titleId = 'qr-title';

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

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md px-5 py-4 rounded-xl shadow-2xl text-white flex items-center justify-between z-[100002] ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <span className="font-medium">{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ============== Optional: Navbar button ==============
export function QuickReconciliationButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all ${className}`}
      >
        <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 ${hover ? 'opacity-100' : 'opacity-80'}`} />
        <span className="relative z-10 inline-flex items-center">
          <CheckSquare className={`w-5 h-5 mr-1 ${hover ? 'rotate-12' : ''} transition-transform`} />
          <span className="text-sm font-medium">Quick Reconcile</span>
          {hover && <Sparkles className="w-4 h-4 ml-2 text-yellow-300 animate-pulse" />}
        </span>
      </button>
      <QuickReconciliationModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
