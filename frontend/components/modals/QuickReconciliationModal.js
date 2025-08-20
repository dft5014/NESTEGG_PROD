// QuickReconciliationModal.js
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Check, CheckCircle, CheckSquare, CheckCheck, AlertTriangle, Info, Clock, Loader2,
  ChevronRight, ArrowLeft, Eye, EyeOff, Landmark as Building2, DollarSign, Droplets, LineChart,
  Bell, Target, Trophy, FileText, RefreshCw, Percent, Trash2, Filter as FilterIcon, Search,
  List as ListIcon
} from 'lucide-react';

// External app hooks / API
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { updateCashPosition, updateLiability, updateOtherAsset } from '@/utils/apimethods/positionMethods';
import { popularBrokerages } from '@/utils/constants';
import FixedModal from './FixedModal';

// =============== Utilities ===================
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtUSD = (n, hide = false) => hide ? '••••••' : Number(n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const toNum = (s) => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const n = Number(String(s ?? '').replace(/[^\\d.-]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
const diffPct = (base, delta) => (base !== 0 ? (delta / base) * 100 : 0);
const getLogo = (name) => {
  if (!name) return null;
  const hit = popularBrokerages.find((b) => b.name.toLowerCase() === String(name).toLowerCase());
  return hit?.logo || null;
};

// Robust liability id resolver
const getLiabilityId = (L) => {
  return L?.id || L?.itemId || L?.item_id || L?.liability_id || null;
};

// Keys (normalized across assets & liabilities)
const makeKey = (kind, id) => `${kind}:${id}`;

// Persistence namespaces (user-scoped)
const NS = (userId) => `nestegg:v1:recon:${userId || 'anon'}`;
const LS_DATA = (u) => `${NS(u)}:data`;
const LS_HISTORY = (u) => `${NS(u)}:history`;
const SCHEMA_VERSION = 2;
const LS_SCHEMA = (u) => `${NS(u)}:schemaVersion`;
const LS_DRAFTS = (u) => `${NS(u)}:drafts:v2`;
const LS_DRAFT_PREFIX = (u) => `${NS(u)}:draft:`;
const LS_SELECTED_INST = (u) => `${NS(u)}:selectedInstitution`;

// Helpers for Quick Cash scope
const isClearlySecurityWord = /(stock|equity|etf|fund|mutual|option|bond|crypto|security|shares?)/i;
const isCashLikeWord = /(cash|checking|savings|mm|money\\s?market|hysa|cd|certificate|sweep|settlement|brokerage\\s?cash)/i;
const isCashLike = (pos) => {
  const t = String(pos.type || '').toLowerCase();
  const n = `${pos.name || ''} ${pos.identifier || ''} ${pos.inv_account_name || ''}`.toLowerCase();
  if (isClearlySecurityWord.test(n)) return false;
  if (['cash', 'checking', 'savings', 'money_market', 'mm', 'sweep', 'deposit'].includes(t)) return true;
  return isCashLikeWord.test(n);
};

// ===== Shared Currency Input Component =====
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

  React.useEffect(() => {
    if (!focused) {
      setRaw(Number.isFinite(value) ? String(value) : '');
    }
  }, [value, focused]);

  const sanitize = (s) => {
    const cleaned = s.replace(/[^0-9.\\-]/g, '');
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
        try { el.setSelectionRange(end, end); } catch { }
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
      id={ariaLabel?.replace(/\\s+/g, '_')}
      type="text"
      inputMode="decimal"
      value={focused ? raw : formatUSD(value)}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
        requestAnimationFrame(() => {
          try {
            const end = e.target.value?.length ?? 0;
            e.target.setSelectionRange(end, end);
          } catch { }
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

// ============== Toast Component ==============
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
        <button onClick={onClose} className="ml-2 rounded hover:bg-white/10 p-1" aria-label="Close toast">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ===================== Shared Top Header Component =========
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
            onClick={() => setShowValues(s => !s)}
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
            onClick={() => pending.onOpenQueue?.()}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800
                      text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
            title="View pending changes"
          >
            <ListIcon className="w-4 h-4 inline -mt-0.5 mr-1" /> Queue
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-1 p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700
                      text-gray-700 dark:text-zinc-200"
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
// ===================== Main Modal Component =====================
export default function QuickReconciliationModal({ isOpen, onClose }) {
  const { state, actions } = useDataStore();
  const userId = state?.user?.id || null;

  // Use DataStore hooks
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: rawPositions = [], loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();
  const { liabilities: groupedLiabilities = [], loading: liabilitiesLoading, refreshData: refreshLiabilities } = useGroupedLiabilities();
  
  const loading = accountsLoading || positionsLoading || liabilitiesLoading;

  // Screens
  const [screen, setScreen] = useState('welcome');
  const [localLoading, setLocalLoading] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const [showQueue, setShowQueue] = useState(false);
  const [drafts, setDrafts] = useState({});

  const showToast = useCallback((type, text, duration = 3500) => {
    setToast({ type, text });
    if (toastRef.current) clearTimeout(toastRef.current);
    if (duration > 0) toastRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  // LocalStorage helpers
  const loadReconData = useCallback(() => {
    try { 
      const saved = localStorage.getItem(LS_DATA(userId)); 
      return saved ? JSON.parse(saved) : {}; 
    } catch { 
      return {}; 
    }
  }, [userId]);

  const [reconData, setReconData] = useState(() => loadReconData());
  
  const saveReconData = useCallback((dataOrFn) => {
    const data = typeof dataOrFn === 'function' ? dataOrFn(reconData) : dataOrFn;
    setReconData(data);
    try { 
      localStorage.setItem(LS_DATA(userId), JSON.stringify(data)); 
    } catch { /* noop */ }
  }, [userId, reconData]);

  const persistDrafts = useCallback((next) => {
    setDrafts(next);
    try { 
      localStorage.setItem(LS_DRAFTS(userId), JSON.stringify(next)); 
    } catch { }
  }, [userId]);

  const removeDraftKey = useCallback((key) => {
    const next = { ...drafts };
    delete next[key];
    persistDrafts(next);
  }, [drafts, persistDrafts]);

  const clearAllDraftsOnly = useCallback(() => {
    persistDrafts({});
    showToast('success', 'Cleared pending items');
  }, [persistDrafts, showToast]);

  const clearPending = useCallback(() => {
    if (!confirm('Clear all pending changes and history for Quick Reconciliation?')) return;
    try {
      localStorage.removeItem(LS_DATA(userId));
      localStorage.removeItem(LS_HISTORY(userId));
      localStorage.removeItem(LS_DRAFTS(userId));
      localStorage.removeItem(LS_SCHEMA(userId));
      
      // Remove legacy drafts
      const prefix = LS_DRAFT_PREFIX(userId);
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch { }
    
    setReconData({});
    setDrafts({});
    showToast('success', 'Cleared pending changes');
  }, [userId, showToast]);

  const pushHistory = useCallback(() => {
    try {
      const now = new Date().toISOString();
      const key = LS_HISTORY(userId);
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      const todayStr = new Date(now).toDateString();
      if (!history.some((d) => new Date(d).toDateString() === todayStr)) {
        history.unshift(now);
        if (history.length > 60) history.pop();
        localStorage.setItem(key, JSON.stringify(history));
      }
    } catch { /* noop */ }
  }, [userId]);

  // Load drafts on mount
  useEffect(() => {
    if (!isOpen) return;
    setScreen('welcome');
    setToast(null);
    setLocalLoading(false);
    
    // Load drafts
    try {
      const currSchema = Number(localStorage.getItem(LS_SCHEMA(userId)) || 0);
      if (currSchema < SCHEMA_VERSION) {
        // Migration logic
        const merged = {};
        const prefix = LS_DRAFT_PREFIX(userId);
        const legacyKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            legacyKeys.push(k);
            try {
              const v = JSON.parse(localStorage.getItem(k) || '{}');
              Object.assign(merged, v);
            } catch { }
          }
        }
        
        const v2Existing = JSON.parse(localStorage.getItem(LS_DRAFTS(userId)) || '{}');
        Object.assign(merged, v2Existing);
        
        localStorage.setItem(LS_DRAFTS(userId), JSON.stringify(merged));
        legacyKeys.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(LS_SCHEMA(userId), String(SCHEMA_VERSION));
        setDrafts(merged);
      } else {
        const v2 = JSON.parse(localStorage.getItem(LS_DRAFTS(userId)) || '{}');
        setDrafts(v2);
      }
    } catch {
      setDrafts({});
    }

    // Load data if needed
    if (!accounts.length || !rawPositions.length || !groupedLiabilities.length) {
      setLocalLoading(true);
      Promise.all([
        refreshAccounts?.(),
        refreshPositions?.(),
        refreshLiabilities?.()
      ]).finally(() => setLocalLoading(false));
    }
    
    return () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    };
  }, [isOpen]);

  // Normalized positions (asset-side)
  const positionsNorm = useMemo(() => {
    return (rawPositions || []).map((p) => {
      const id = p.itemId || p.id;
      const accountId = p.accountId || p.inv_account_id || p.account_id;
      const acct = accounts.find(a => String(a.id) === String(accountId));
      const type = String(p.assetType || p.type || '').toLowerCase();
      const name = p.name || p.identifier || 'Unnamed';
      const currentValue = Number(p.currentValue || 0);
      const institution = p.institution || acct?.institution || 'Unknown Institution';
      const identifier = p.identifier || '';
      const inv_account_name = p.accountName || p.inv_account_name || '';
      return { id, itemId: id, accountId, institution, type, name, currentValue, identifier, inv_account_name };
    });
  }, [rawPositions, accounts]);

  // Process liabilities
  const liabilities = useMemo(() => {
    return (groupedLiabilities || []).map((L) => {
      const resolvedId = getLiabilityId(L);
      const t = (L.item_type || L.type || 'liability').toLowerCase();
      const val = Number(L.total_current_balance || L.current_balance || 0);
      return {
        id: resolvedId,
        itemId: resolvedId,
        accountId: L.inv_account_id || L.account_id || null,
        institution: L.institution || 'Unknown Institution',
        name: L.name || L.identifier || 'Liability',
        identifier: L.identifier || '',
        type: t,
        currentValue: val,
        inv_account_name: L.inv_account_name || L.account_name || '',
      };
    });
  }, [groupedLiabilities]);

  // Pending KPI
  const pending = useMemo(() => {
    const rows = [
      ...positionsNorm.map(p => ({ key: makeKey('asset', p.id), curr: Number(p.currentValue || 0) })),
      ...liabilities.map(p => ({ key: makeKey('liability', p.id), curr: Number(p.currentValue || 0) })),
    ];
    let count = 0, posC = 0, posA = 0, negC = 0, negA = 0;
    rows.forEach((r) => {
      const next = drafts[r.key];
      if (next === undefined || !Number.isFinite(next)) return;
      const delta = next - r.curr;
      if (delta === 0) return;
      count += 1;
      if (delta > 0) { posC += 1; posA += delta; }
      else { negC += 1; negA += delta; }
    });
    return { count, posCount: posC, posAmt: posA, negCount: negC, negAmt: negA, net: posA + negA, onOpenQueue: () => setShowQueue(true) };
  }, [positionsNorm, liabilities, drafts]);

  // Dirty guard on close
  const hasUnsaved = pending.count > 0;
  const onBeforeClose = useCallback(async () => {
    if (!hasUnsaved) return true;
    return confirm('You have pending edits that are not submitted yet. Close anyway?');
  }, [hasUnsaved]);

  // Focus management
  const [editingKey, setEditingKey] = useState(null);
  const lastFocusedIdRef = useRef(null);
  const wantFocusRef = useRef(false);

  // ========== WELCOME SCREEN ==========
  function WelcomeScreen() {
    const history = useMemo(() => {
      try { 
        return JSON.parse(localStorage.getItem(LS_HISTORY(userId)) || '[]'); 
      } catch { 
        return []; 
      }
    }, []);
    
    const lastFull = history[0] ? new Date(history[0]) : null;
    const lastStr = !lastFull ? 'Never' :
      (() => {
        const days = Math.floor((Date.now() - lastFull.getTime()) / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
      })();

    // Institution preview
    const preview = useMemo(() => {
      const map = new Map();
      const add = (inst) => {
        if (!map.has(inst)) map.set(inst, {
          institution: inst,
          assets: [], liabilities: [],
          assetsValue: 0, liabilitiesValue: 0,
          drafted: 0, changed: 0
        });
        return map.get(inst);
      };
      
      positionsNorm.forEach(p => {
        const g = add(p.institution || 'Unknown Institution');
        const key = makeKey('asset', p.id);
        const curr = Number(p.currentValue || 0);
        const d = drafts[key];
        const hasDraft = d !== undefined && Number.isFinite(d);
        const hasChange = hasDraft && d !== curr;
        g.assets.push({ key, curr, draft: d });
        g.assetsValue += Math.abs(curr);
        g.drafted += hasDraft ? 1 : 0;
        g.changed += hasChange ? 1 : 0;
      });
      
      liabilities.forEach(p => {
        const g = add(p.institution || 'Unknown Institution');
        const key = makeKey('liability', p.id);
        const curr = Number(p.currentValue || 0);
        const d = drafts[key];
        const hasDraft = d !== undefined && Number.isFinite(d);
        const hasChange = hasDraft && d !== curr;
        g.liabilities.push({ key, curr, draft: d });
        g.liabilitiesValue += Math.abs(curr);
        g.drafted += hasDraft ? 1 : 0;
        g.changed += hasChange ? 1 : 0;
      });
      
      return Array.from(map.values()).map(g => {
        const totalRows = g.assets.length + g.liabilities.length;
        const totalValue = g.assetsValue + g.liabilitiesValue;
        const progressPct = totalRows ? ((totalRows - g.changed) / totalRows) * 100 : 0;
        return { ...g, totalRows, totalValue, progressPct };
      }).sort((a, b) => b.totalValue - a.totalValue);
    }, [positionsNorm, liabilities, drafts]);

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([
        refreshPositions?.(),
        refreshAccounts?.(),
        refreshLiabilities?.()
      ]).finally(() => setLocalLoading(false));
    }, []);

    return (
      <div className="flex flex-col h-[80vh]">
        <TopHeader
          title="Quick Update & Reconcile"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={onRefresh}
          onClearPending={clearPending}
          pending={pending}
          onBack={null}
          onClose={onClose}
        />

        <div className="p-6 flex-1 overflow-auto">
          <p className="text-gray-600 dark:text-zinc-400 mb-4">
            Paste or type balances for cash, cards, and loans; then verify investment accounts. 
            Last full update: <span className="font-medium">{lastStr}</span>.
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
              onClick={() => { 
                setScreen('liquid'); 
                saveReconData((d) => ({ ...d, _next: 'reconcile' })); 
              }}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[38vh] overflow-auto pr-1">
              {preview.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-zinc-400">Add accounts to get started.</div>
              ) : preview.map((g) => {
                const logo = getLogo(g.institution);
                const changed = g.changed > 0;
                const net = g.assetsValue - g.liabilitiesValue;
                return (
                  <div
                    key={g.institution}
                    className={`rounded-xl border transition-all bg-white dark:bg-zinc-900 ${changed ? 'border-amber-200 dark:border-amber-700/40' : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
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
                        ? <span className="inline-flex items-center text-amber-700 dark:text-amber-300 text-xs">
                          <AlertTriangle className="w-4 h-4 mr-1" /> Drafts
                        </span>
                        : <span className="inline-flex items-center text-green-700 dark:text-emerald-300 text-xs">
                          <CheckCircle className="w-4 h-4 mr-1" /> Ready
                        </span>
                      }
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="text-gray-500 dark:text-zinc-400">
                        Assets: <span className="font-medium text-gray-700 dark:text-zinc-200">{fmtUSD(g.assetsValue, !showValues)}</span>
                      </div>
                      <div className="text-gray-500 dark:text-zinc-400">
                        Liabs: <span className="font-medium text-gray-700 dark:text-zinc-200">{fmtUSD(g.liabilitiesValue, !showValues)}</span>
                      </div>
                      <div className="text-gray-500 dark:text-zinc-400">
                        Net: <span className={`${net >= 0 ? 'text-green-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'} font-semibold`}>
                          {fmtUSD(net, !showValues)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`${changed ? 'bg-amber-500' : 'bg-green-500'} h-full transition-all`} 
                        style={{ width: `${clamp(g.progressPct, 0, 100)}%` }} />
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
  // ================= LIQUID SCREEN =================
  function LiquidScreen() {
    const [selectedInstitution, _setSelectedInstitution] = useState(() => {
      try { 
        return localStorage.getItem(LS_SELECTED_INST(userId)) || null; 
      } catch { 
        return null; 
      }
    });
    
    const setSelectedInstitution = useCallback((inst) => {
      _setSelectedInstitution(inst);
      try { 
        localStorage.setItem(LS_SELECTED_INST(userId), inst || ''); 
      } catch { }
    }, []);

    const [filterText, setFilterText] = useState('');
    const [showOnlyChanged, setShowOnlyChanged] = useState(false);
    const [showAssets, setShowAssets] = useState(true);
    const [showLiabs, setShowLiabs] = useState(true);
    const [onlyManualLike, setOnlyManualLike] = useState(true);
    const [sortKey, setSortKey] = useState('nest');
    const [sortDir, setSortDir] = useState('desc');
    const [jumping, setJumping] = useState(false);

    // CASH positions only
    const cashPositionsAll = useMemo(() => positionsNorm.filter(isCashLike), [positionsNorm]);
    const filteredPositions = useMemo(() => {
      return cashPositionsAll.filter(p => {
        if (onlyManualLike) {
          const manualish = !p.identifier;
          if (!manualish) return false;
        }
        return true;
      });
    }, [cashPositionsAll, onlyManualLike]);

    // Build groups
    const groups = useMemo(() => {
      const map = new Map();
      const add = (inst) => {
        if (!map.has(inst)) map.set(inst, { 
          institution: inst, positions: [], liabilities: [], 
          assetsValue: 0, liabilitiesValue: 0 
        });
        return map.get(inst);
      };

      if (showAssets) {
        filteredPositions.forEach(p => {
          const g = add(p.institution || 'Unknown Institution');
          g.positions.push(p);
          g.assetsValue += Math.abs(Number(p.currentValue || 0));
        });
      }
      
      if (showLiabs) {
        liabilities.forEach(p => {
          const g = add(p.institution || 'Unknown Institution');
          g.liabilities.push(p);
          g.liabilitiesValue += Math.abs(Number(p.currentValue || 0));
        });
      }

      let enriched = Array.from(map.values()).map((g) => {
        const totalRows = g.positions.length + g.liabilities.length;
        let drafted = 0, changed = 0;
        
        g.positions.forEach(p => {
          const key = makeKey('asset', p.id);
          const d = drafts[key];
          if (d !== undefined) drafted += 1;
          if (d !== undefined && d !== Number(p.currentValue || 0)) changed += 1;
        });
        
        g.liabilities.forEach(p => {
          const key = makeKey('liability', p.id);
          const d = drafts[key];
          if (d !== undefined) drafted += 1;
          if (d !== undefined && d !== Number(p.currentValue || 0)) changed += 1;
        });
        
        return { 
          ...g, totalRows, drafted, changed, 
          totalValue: g.assetsValue + g.liabilitiesValue, 
          progressPct: totalRows ? ((totalRows - changed) / totalRows) * 100 : 0 
        };
      });

      // Filter
      if (filterText.trim()) {
        const s = filterText.trim().toLowerCase();
        enriched = enriched.filter(g => (g.institution || '').toLowerCase().includes(s));
      }
      if (showOnlyChanged) {
        enriched = enriched.filter(g => g.changed > 0);
      }

      return enriched.sort((a, b) => b.totalValue - a.totalValue);
    }, [filteredPositions, liabilities, drafts, showAssets, showLiabs, filterText, showOnlyChanged]);

    useEffect(() => {
      if (!selectedInstitution && groups.length) {
        _setSelectedInstitution(groups[0].institution);
      }
    }, [groups, selectedInstitution]);

    const current = useMemo(() => groups.find(g => g.institution === selectedInstitution), [groups, selectedInstitution]);

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

    const saveInstitution = async () => {
      if (!current) return;

      const changes = []; // Initialize changes array!

      // Build liability payload helper
      const buildLiabilityPayload = (l, next) => {
        const t = String(l.type || '').toLowerCase();
        if (t.includes('mortgage') || t.includes('loan')) return { principal_balance: next };
        if (t.includes('credit')) return { current_balance: next };
        return { current_balance: next };
      };

      if (showAssets) {
        current.positions.forEach(p => {
          const key = makeKey('asset', p.id);
          const curr = Number(p.currentValue || 0);
          const next = drafts[key];
          if (next === undefined || !Number.isFinite(next) || next === curr) return;
          changes.push({ 
            kind: 'cash', 
            id: p.itemId || p.id, 
            value: Number(next), 
            entity: p 
          });
        });
      }

      if (showLiabs) {
        current.liabilities.forEach(l => {
          const key = makeKey('liability', l.id);
          const curr = Number(l.currentValue || 0);
          const next = drafts[key];
          if (next === undefined || !Number.isFinite(next) || next === curr) return;
          const liabId = getLiabilityId(l);
          if (!liabId) {
            console.warn('[Reconcile] Skipping liability with missing ID:', l);
          } else {
            changes.push({
              kind: 'liability',
              id: liabId,
              value: Number(next),
              entity: l,
              payload: buildLiabilityPayload(l, next)
            });
          }
        });
      }

      if (!changes.length) {
        showToast('info', 'No changes to apply');
        return;
      }

      const maxConcurrent = 3;
      const maxRetries = 2;
      let idx = 0;
      const failed = [];

      const runOne = async (c) => {
        const attempt = async () => {
          const v = Number(c.value);
          if (!Number.isFinite(v)) return;
          if (c.kind === 'cash') return updateCashPosition(c.id, { amount: v });
          if (c.kind === 'liability') return updateLiability(c.id, c.payload || { current_balance: v });
          return updateOtherAsset(Number(c.id), { current_value: v });
        };
        
        for (let tries = 0; tries <= maxRetries; tries++) {
          try { 
            await attempt(); 
            return; 
          } catch (e) {
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
            try { 
              await runOne(job); 
            } catch (e) {
              failed.push(job);
              console.error(`Error updating ${job.kind} ${job.id}:`, e);
            }
          }
        });

        await Promise.all(pool);

        // Clear drafts for this institution
        try {
          const keysToClear = [];
          if (showAssets) current.positions.forEach(p => keysToClear.push(makeKey('asset', p.id)));
          if (showLiabs) current.liabilities.forEach(l => keysToClear.push(makeKey('liability', l.id)));
          const afterClear = { ...drafts };
          keysToClear.forEach(k => delete afterClear[k]);
          persistDrafts(afterClear);
        } catch { }

        // Refresh all data
        await Promise.all([
          refreshPositions?.(),
          actions?.fetchGroupedPositionsData?.(true),
          actions?.fetchPortfolioData?.(true),
          refreshLiabilities?.(),
        ]);

        if (failed.length) {
          showToast('error', `Saved with ${failed.length} failures`);
        } else {
          showToast('success', `Updated ${current.institution}`);
        }
      } catch (e) {
        console.error(e);
        showToast('error', 'Failed to apply updates');
      } finally {
        setLocalLoading(false);
      }
    };

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([
        refreshPositions?.(),
        refreshAccounts?.(),
        refreshLiabilities?.()
      ]).finally(() => setLocalLoading(false));
    }, []);

    // Simplified render - just show the basic structure
    return (
      <div className="flex flex-col h-[80vh]">
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
        
        <div className="p-6">
          {/* Institution selector and table would go here */}
          <div className="text-center text-gray-600 dark:text-zinc-400">
            Select an institution to update cash accounts and liabilities
          </div>
          
          {current && (
            <div className="mt-4">
              <h3 className="font-semibold">{current.institution}</h3>
              <button 
                onClick={saveInstitution}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Simplified reconcile and summary screens
  function ReconcileScreen() {
    return (
      <div className="flex flex-col h-[80vh]">
        <TopHeader
          title="Investment & Liabilities Check-In"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={() => {}}
          onClearPending={clearPending}
          pending={pending}
          onBack={() => setScreen('welcome')}
          onClose={onClose}
        />
        <div className="p-6 text-center text-gray-600 dark:text-zinc-400">
          Reconcile investment accounts and verify totals
        </div>
      </div>
    );
  }

  function SummaryScreen() {
    return (
      <div className="flex flex-col h-[80vh]">
        <TopHeader
          title="Reconciliation Complete"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={() => {}}
          onClearPending={clearPending}
          pending={pending}
          onBack={() => setScreen('reconcile')}
          onClose={onClose}
        />
        <div className="p-6 text-center">
          <Trophy className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Complete!</h2>
        </div>
      </div>
    );
  }

  // Main render with queue modal
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={async () => {
        const canClose = await onBeforeClose();
        if (canClose) onClose();
      }}
      title="Quick Reconciliation"
      size="extra-large"
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

      {/* Queue Modal */}
      {showQueue && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQueue(false)} />
          <div className="relative bg-white dark:bg-zinc-950 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Pending Changes</div>
              <button onClick={() => setShowQueue(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                {Object.entries(drafts || {}).filter(([, v]) => Number.isFinite(v)).length === 0 ? (
                  <li className="p-4 text-sm text-gray-600 dark:text-zinc-300">No pending items.</li>
                ) : Object.entries(drafts || {}).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => {
                  const [kind, id] = k.split(':');
                  const item = kind === 'asset'
                    ? positionsNorm.find(p => String(p.id) === String(id))
                    : liabilities.find(l => String(l.id) === String(id));
                  const name = item?.name || (kind === 'asset' ? 'Asset' : 'Liability');
                  const inst = item?.institution || 'Unknown';
                  const curr = Number(item?.currentValue || 0);
                  const next = Number(v);
                  const delta = next - curr;
                  
                  return (
                    <li key={k} className="p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{name}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">{inst} • {kind}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-700 dark:text-zinc-200">{fmtUSD(next, !showValues)}</div>
                        <div className={`text-xs ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {delta >= 0 ? '+' : ''}{fmtUSD(delta, !showValues)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeDraftKey(k)}
                        className="ml-3 px-2 py-1 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-zinc-400">
                {Object.entries(drafts || {}).filter(([, v]) => Number.isFinite(v)).length} pending
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={clearAllDraftsOnly} 
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setShowQueue(false)} 
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast type={toast.type} text={toast.text} onClose={() => setToast(null)} />}
    </FixedModal>
  );
}

// Export button component
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