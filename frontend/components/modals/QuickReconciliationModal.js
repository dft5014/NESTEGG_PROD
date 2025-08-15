// QuickReconciliationModal.js
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Check, CheckCircle, CheckSquare, CheckCheck, AlertCircle, AlertTriangle, Info, Clock, Loader2,
  ChevronRight, ArrowLeft, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Building2 as Landmark, DollarSign, Droplets, LineChart, Bell, Sparkles, Target, Trophy, FileText, FileCheck, RefreshCw, Percent
} from 'lucide-react';

// ====== External app hooks / API ======
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { updateCashPosition, updateLiability, updateOtherAsset } from '@/utils/apimethods/positionMethods';
import { popularBrokerages } from '@/utils/constants';

// =============== Utilities ===================
const fmtCurrency = (val, hide = false) =>
  hide ? '••••••' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val || 0));

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const toNumber = (s) => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const n = Number(String(s ?? '').replace(/[^\d.-]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const diffPct = (base, delta) => (base !== 0 ? (delta / base) * 100 : 0);

const NS = 'nestegg:v1:recon';
const LS_DATA = `${NS}:data`;
const LS_HISTORY = `${NS}:history`;
const LS_DRAFT_PREFIX = `${NS}:draft:`;

// Tailwind-safe palette
const tone = {
  blue: { bg100: 'bg-blue-100', text600: 'text-blue-600' },
  green: { bg100: 'bg-green-100', text600: 'text-green-600' },
  purple: { bg100: 'bg-purple-100', text600: 'text-purple-600' },
  yellow: { bg100: 'bg-yellow-100', text600: 'text-yellow-600' },
  red: { bg100: 'bg-red-100', text600: 'text-red-600' },
};

// SVG gradient stops
const GRADIENTS = {
  blue: ['#60A5FA', '#2563EB'],
  green: ['#34D399', '#059669'],
  purple: ['#A78BFA', '#7C3AED'],
  yellow: ['#FBBF24', '#D97706'],
  red: ['#F87171', '#DC2626'],
  gray: ['#D1D5DB', '#6B7280'],
};

const getInstitutionLogo = (name) => {
  if (!name) return null;
  const hit = popularBrokerages.find((b) => b.name.toLowerCase() === String(name).toLowerCase());
  return hit?.logo || null;
};

// calc helpers for rows
const calcRow = (pos, updated) => {
  const rawNestEgg = Number(pos.current_value ?? pos.currentValue ?? 0);
  const rawStatement = updated[pos.id] !== undefined ? Number(updated[pos.id]) : rawNestEgg;
  const diff = rawStatement - rawNestEgg;
  const pct = rawNestEgg !== 0 ? (diff / rawNestEgg) * 100 : 0;
  return { rawNestEgg, rawStatement, diff, pct };
};

// =================== Shared UI Bits ===================

// Modal shell (raised z-index + scrollable inner container)
function ModalShell({ isOpen, onClose, children, showHeader = false, title = '' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100000]"> {/* was z-[9999], increased to sit above any navbar */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-[100001] mx-auto my-4 w-full max-w-7xl">
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-200">
          {showHeader && (
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          {/* scrollable container with subtle styled scrollbar */}
          <div className="max-h-[88vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress ring
function ProgressRing({ percentage, size = 72, strokeWidth = 6, color = 'blue' }) {
  const radius = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * radius;
  const pct = clamp(percentage, 0, 100);
  const offset = C - (pct / 100) * C;
  const [anim, setAnim] = useState(C);
  useEffect(() => {
    const t = setTimeout(() => setAnim(offset), 50);
    return () => clearTimeout(t);
  }, [offset]);
  const [c0, c1] = GRADIENTS[color] || GRADIENTS.blue;
  const gid = `grad-${color}-${size}-${strokeWidth}`;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="100%" stopColor={c1} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={anim}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// Lightweight confetti
function Confetti({ show }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!show) return;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
    const shapes = ['square', 'circle'];
    const ps = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));
    setParticles(ps);
    const timer = setTimeout(() => setParticles([]), 4200);
    return () => clearTimeout(timer);
  }, [show]);
  if (!show || particles.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100002]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: 'confetti-fall 4.2s ease-out forwards',
            '--vx': p.vx,
            '--vy': p.vy,
            '--rs': p.rotationSpeed,
          }}
        >
          <div
            className={p.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              animation: 'confetti-spin 4.2s linear infinite',
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes confetti-fall { to { transform: translate(calc(var(--vx) * 200px), calc(100vh + 120px)); } }
        @keyframes confetti-spin { to { transform: rotate(calc(360deg * var(--rs))); } }
      `}</style>
    </div>
  );
}

// Status chip
function StatusIndicator({ status = 'pending' }) {
  const map = {
    reconciled: { cls: 'text-green-600', Icon: CheckCircle, label: 'Reconciled' },
    warning: { cls: 'text-yellow-600', Icon: AlertTriangle, label: 'Needs Review' },
    error: { cls: 'text-red-600', Icon: AlertCircle, label: 'Out of Sync' },
    pending: { cls: 'text-gray-600', Icon: Clock, label: 'Not Reconciled' },
  };
  const picked = map[status] || map.pending;
  const Icon = picked.Icon;
  return (
    <span className={`inline-flex items-center gap-1 ${picked.cls}`} title={picked.label}>
      <Icon className="w-4 h-4" />
      <span className="text-xs">{picked.label}</span>
    </span>
  );
}

// Currency Input (no blur on type, caret-safe, $ and commas)
function CurrencyInput({ value, onChange, placeholder = '0.00', className = '', autoFocus = false }) {
  const [display, setDisplay] = useState(value === null || value === undefined || value === '' ? '' : fmtCurrency(value));
  const ref = useRef(null);

  useEffect(() => {
    // Sync from external changes (but avoid thrashing while typing)
    if (document.activeElement !== ref.current) {
      const v = (value === null || value === undefined || value === '') ? '' : fmtCurrency(value);
      setDisplay(v);
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    // Allow user to clear
    if (raw === '') {
      setDisplay('');
      onChange?.('');
      return;
    }
    const numeric = toNumber(raw);
    setDisplay(fmtCurrency(numeric));
    onChange?.(numeric);
  };

  const handleFocus = (e) => {
    // Strip formatting for easier typing
    const numeric = toNumber(display);
    e.target.value = numeric ? String(numeric) : '';
    setDisplay(e.target.value);
  };

  const handleBlur = (e) => {
    const numeric = toNumber(e.target.value);
    setDisplay(numeric ? fmtCurrency(numeric) : '');
    onChange?.(numeric);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`w-full pl-8 pr-4 py-3 text-2xl font-bold border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50 border-blue-300 ${className}`}
    />
  );
}

// ===================== Main Modal ============================================
const TOLERANCE = 0.01;

export default function QuickReconciliationModal({ isOpen, onClose }) {
  const { actions } = useDataStore();
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: rawPositions = [], loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();

  const loading = accountsLoading || positionsLoading;

  // UI state
  const [screen, setScreen] = useState('welcome'); // welcome | liquid | reconcile | summary
  const [showValues, setShowValues] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const msgRef = useRef(null);

  // Flow state
  const [liquidPositions, setLiquidPositions] = useState([]);
  const [reconData, setReconData] = useState({});
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [reconResults, setReconResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);

  // message helpers
  const showMsg = useCallback((type, text, duration = 4000) => {
    setMessage({ type, text });
    if (msgRef.current) clearTimeout(msgRef.current);
    if (duration > 0) {
      msgRef.current = setTimeout(() => setMessage({ type: '', text: '' }), duration);
    }
  }, []);

  // normalize accounts map
  const accountsById = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // normalize positions
  const positionsNorm = useMemo(() => {
    return (rawPositions || []).map((p) => {
      const id = p.itemId ?? p.item_id ?? p.id;
      const accountId = p.accountId ?? p.inv_account_id ?? p.account_id;
      const acct = accountsById.get(accountId);
      const type = String(p.assetType ?? p.item_type ?? p.asset_type ?? p.position_type ?? '').toLowerCase();
      const name = p.name ?? p.identifier ?? 'Unnamed';
      const currentValue = Number(p.currentValue ?? p.current_value ?? 0);
      const institution = p.institution ?? acct?.institution ?? 'Unknown Institution';
      const identifier = p.identifier ?? p.symbol ?? '';
      const inv_account_name = p.inv_account_name ?? p.accountName ?? p.account_name ?? '';
      return { id, itemId: id, accountId, institution, type, name, currentValue, identifier, inv_account_name };
    });
  }, [rawPositions, accountsById]);

  // Liquid-only set
  useEffect(() => {
    const liquidSet = positionsNorm.filter((p) => {
      return (
        ['cash', 'checking', 'savings', 'credit_card', 'loan', 'liability'].includes(p.type) ||
        /checking|savings|credit|loan/i.test(p.name)
      );
    });
    setLiquidPositions(liquidSet);
  }, [positionsNorm]);

  // LocalStorage persisters
  const loadReconData = useCallback(() => {
    try {
      const saved = localStorage.getItem(LS_DATA);
      if (saved) setReconData(JSON.parse(saved));
    } catch {
      /* noop */
    }
  }, []);
  const saveReconData = useCallback((data) => {
    setReconData(data);
    try {
      localStorage.setItem(LS_DATA, JSON.stringify(data));
    } catch {
      /* noop */
    }
  }, []);
  const saveHistory = useCallback(() => {
    try {
      const now = new Date().toISOString();
      const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      const todayStr = new Date(now).toDateString();
      if (!history.some((d) => new Date(d).toDateString() === todayStr)) {
        history.unshift(now);
        if (history.length > 60) history.pop();
        localStorage.setItem(LS_HISTORY, JSON.stringify(history));
      }
    } catch {
      /* noop */
    }
  }, []);
  const refreshStreak = useCallback(() => {
    try {
      const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      let s = 0;
      const today = new Date().toDateString();
      if (history.length > 0 && new Date(history[0]).toDateString() === today) {
        s = 1;
        for (let i = 1; i < history.length; i += 1) {
          const d0 = new Date(history[i - 1]);
          const d1 = new Date(history[i]);
          const dd = Math.round((d0 - d1) / (1000 * 60 * 60 * 24));
          if (dd === 1) s += 1;
          else break;
        }
      }
      setStreak(s);
    } catch {
      setStreak(0);
    }
  }, []);

  // Open lifecycle
  useEffect(() => {
    if (!isOpen) return;
    setScreen('welcome');
    setPendingUpdates({});
    setReconResults([]);
    setConfetti(false);
    loadReconData();
    refreshStreak();
    (async () => {
      if (!accounts?.length || !rawPositions?.length) {
        try {
          setLocalLoading(true);
          await Promise.all([refreshAccounts?.(), refreshPositions?.()]);
        } finally {
          setLocalLoading(false);
        }
      }
    })();
    return () => {
      if (msgRef.current) clearTimeout(msgRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Stats
  const stats = useMemo(() => {
    const total = accounts.length;
    const reconStatus = (a) => {
      const rec = reconData[a.id]?.lastReconciled;
      if (!rec) return 'pending';
      const days = Math.floor((Date.now() - new Date(rec).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 7) return 'reconciled';
      if (days <= 30) return 'warning';
      return 'error';
    };
    const reconciled = accounts.filter((a) => reconStatus(a) === 'reconciled');
    const needsRecon = accounts.filter((a) => reconStatus(a) !== 'reconciled');
    const totalValue = accounts.reduce((s, a) => s + Number(a.totalValue || 0), 0);
    const reconciledValue = reconciled.reduce((s, a) => s + Number(a.totalValue || 0), 0);

    const liquidNeeding = liquidPositions.filter((p) => {
      const k = `pos_${p.id}`;
      const last = reconData[k]?.lastUpdated;
      const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return days > 1;
    }).length;

    return {
      total,
      reconciled: reconciled.length,
      needsReconciliation: needsRecon.length,
      liquidPositions: liquidNeeding,
      percentage: total ? (reconciled.length / total) * 100 : 0,
      totalValue,
      reconciledValue,
      valuePercentage: totalValue ? (reconciledValue / totalValue) * 100 : 0,
    };
  }, [accounts, reconData, liquidPositions]);

  const healthScore = useMemo(() => {
    const weights = { accountsReconciled: 0.6, liquidUpdated: 0.3, recency: 0.1 };
    const accountScore = stats.percentage;
    const liquidScore = liquidPositions.length
      ? ((liquidPositions.length - stats.liquidPositions) / liquidPositions.length) * 100
      : 100;
    const lastFull = Object.values(reconData)
      .map((d) => d.lastReconciled)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    const daysSinceFull = lastFull ? Math.floor((Date.now() - new Date(lastFull).getTime()) / (1000 * 60 * 60 * 24)) : 30;
    const recencyScore = clamp(100 - daysSinceFull * 14, 0, 100);
    return Math.round(accountScore * weights.accountsReconciled + liquidScore * weights.liquidUpdated + recencyScore * weights.recency);
  }, [stats, liquidPositions, reconData]);

  const lastReconText = useMemo(() => {
    const dates = Object.values(reconData)
      .map((d) => d.lastReconciled)
      .filter(Boolean)
      .map((d) => new Date(d));
    if (!dates.length) return 'Never';
    const mostRecent = new Date(Math.max(...dates));
    const days = Math.floor((Date.now() - mostRecent) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }, [reconData]);

  // Write engine
  async function writeAndRefresh(batch) {
    for (const b of batch) {
      const v = Number(b.value);
      if (!Number.isFinite(v)) continue;
      if (b.kind === 'cash') {
        await updateCashPosition(b.itemId, { amount: v });
      } else if (b.kind === 'liability') {
        await updateLiability(b.itemId, { current_balance: v });
      } else {
        await updateOtherAsset(Number(b.itemId), { current_value: v });
      }
    }
    await Promise.all([
      refreshPositions?.(),
      actions?.fetchGroupedPositionsData?.(true),
      actions?.fetchPortfolioData?.(true),
    ]);
  }

  // ===== Screens =====

  function WelcomeScreen() {
    // We can safely read state again; the top-level already has useDataStore for actions
    const { state, actions } = useDataStore();
    const { groupedLiabilities } = state;

    // Ensure liabilities are ready so the institution preview includes cards/loans/mortgages
    useEffect(() => {
      if (!groupedLiabilities?.lastFetched && !groupedLiabilities?.loading) {
        actions.fetchGroupedLiabilitiesData?.();
      }
    }, [groupedLiabilities?.lastFetched, groupedLiabilities?.loading, actions]);

    // ---- Draft aggregation across institutions (from localStorage) ----
    const allDrafts = useMemo(() => {
      const out = {};
      try {
        for (let i = 0; i < localStorage.length; i += 1) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS_DRAFT_PREFIX)) {
            const obj = JSON.parse(localStorage.getItem(k) || '{}');
            Object.assign(out, obj);
          }
        }
      } catch {/* noop */}
      return out; // shape: { [rowKey]: number }
    }, [isOpen]); // recompute when modal mounts

    // ---- Build per-institution preview (cash + liabilities) ----
    const institutionPreview = useMemo(() => {
      // cash-like items from normalized positions
      const cash = (positionsNorm || []).filter((p) => {
        const t = (p.type || '').toLowerCase();
        return ['cash', 'checking', 'savings'].includes(t) || /checking|savings|cash/i.test(p.name || '');
      });

      // liabilities from store
      const liabs = (groupedLiabilities?.data || []).map((L) => {
        const id = L.item_id ?? L.liability_id ?? L.id ?? L.history_id;
        const type = (L.item_type || L.type || 'liability').toLowerCase();
        return {
          id,
          key: `L_${id}`,
          institution: L.institution || 'Unknown Institution',
          name: L.name || L.identifier || 'Liability',
          identifier: L.identifier || '',
          type,
          currentValue: Number(L.current_balance ?? L.current_value ?? L.balance ?? 0),
          inv_account_name: L.inv_account_name ?? L.account_name ?? '',
        };
      });

      const map = new Map();
      const add = (inst) => {
        if (!map.has(inst)) map.set(inst, { institution: inst, rows: [], value: 0, changed: 0 });
        return map.get(inst);
      };

      cash.forEach((p) => {
        const inst = p.institution || 'Unknown Institution';
        const g = add(inst);
        const key = p.id;
        const curr = Number(p.currentValue || 0);
        const draft = allDrafts[key];
        const hasChange = Number.isFinite(draft) && draft !== curr;
        g.rows.push({ kind: 'asset', key, name: p.name, type: p.type, identifier: p.identifier, curr, draft });
        g.value += Math.abs(curr);
        if (hasChange) g.changed += 1;
      });

      liabs.forEach((p) => {
        const inst = p.institution || 'Unknown Institution';
        const g = add(inst);
        const key = p.key;
        const curr = Number(p.currentValue || 0);
        const draft = allDrafts[key];
        const hasChange = Number.isFinite(draft) && draft !== curr;
        g.rows.push({ kind: 'liability', key, name: p.name, type: p.type, identifier: p.identifier, curr, draft });
        g.value += Math.abs(curr);
        if (hasChange) g.changed += 1;
      });

      return Array.from(map.values()).sort((a, b) => b.value - a.value);
    }, [positionsNorm, groupedLiabilities?.data, allDrafts]);

    // ---- Pending changes dashboard (counts, +/- amounts, net) ----
    const pending = useMemo(() => {
      let count = 0, posCount = 0, negCount = 0;
      let posAmt = 0, negAmt = 0;

      // Build a quick lookup of current values for asset ids and liability keys
      const currMap = new Map();
      (positionsNorm || []).forEach((p) => {
        const t = (p.type || '').toLowerCase();
        if (['cash', 'checking', 'savings'].includes(t) || /checking|savings|cash/i.test(p.name || '')) {
          currMap.set(p.id, Number(p.currentValue || 0));
        }
      });
      (groupedLiabilities?.data || []).forEach((L) => {
        const id = L.item_id ?? L.liability_id ?? L.id ?? L.history_id;
        const key = `L_${id}`;
        const curr = Number(L.current_balance ?? L.current_value ?? L.balance ?? 0);
        currMap.set(key, curr);
      });

      Object.entries(allDrafts).forEach(([key, draftVal]) => {
        const curr = currMap.get(key);
        if (curr === undefined) return;
        const next = Number(draftVal);
        if (!Number.isFinite(next) || next === curr) return;
        const delta = next - curr;
        count += 1;
        if (delta > 0) { posCount += 1; posAmt += delta; }
        else { negCount += 1; negAmt += delta; }
      });

      return { count, posCount, posAmt, negCount, negAmt, net: posAmt + negAmt };
    }, [positionsNorm, groupedLiabilities?.data, allDrafts]);

    // ---- Helpers ----
    const startLiquid = () => setScreen('liquid');
    const startReconcile = () => setScreen('reconcile');

    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Title & instructions (persistent, succinct) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quick Update & Reconcile</h1>
            <p className="text-gray-600 mt-1">
              Keep NestEgg tight by entering today’s cash, card, and loan balances, then verify your investment accounts.
            </p>
          </div>

          {/* Pending dashboard */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-gray-50 px-4 py-2 border border-gray-200 text-right">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-lg font-semibold text-gray-900">{pending.count}</div>
            </div>
            <div className="rounded-lg bg-green-50 px-4 py-2 border border-green-200 text-right">
              <div className="text-xs text-green-700">↑ {pending.posCount}</div>
              <div className="text-sm font-semibold text-green-800">{fmtCurrency(pending.posAmt, false)}</div>
            </div>
            <div className="rounded-lg bg-red-50 px-4 py-2 border border-red-200 text-right">
              <div className="text-xs text-red-700">↓ {pending.negCount}</div>
              <div className="text-sm font-semibold text-red-800">{fmtCurrency(pending.negAmt, false)}</div>
            </div>
            <div className="rounded-lg bg-white px-4 py-2 border border-gray-200 text-right">
              <div className="text-xs text-gray-500">Net Impact</div>
              <div className={`text-lg font-semibold ${pending.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {fmtCurrency(pending.net, false)}
              </div>
            </div>
          </div>
        </div>

        {/* CTA tiles */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={startLiquid}
            className="group text-left p-6 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.blue.bg100}`}>
                <Droplets className={tone.blue.text600} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Quick Cash & Liabilities</div>
                <div className="text-sm text-gray-600">Update checking, savings, credit cards, loans</div>
                <div className="mt-2 text-xs text-gray-500">
                  {institutionPreview.length === 0 ? 'No institutions yet' : `${institutionPreview.length} institutions detected`}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={startReconcile}
            className="group text-left p-6 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.green.bg100}`}>
                <CheckSquare className={tone.green.text600} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Investment Check‑In</div>
                <div className="text-sm text-gray-600">Verify account totals match statements</div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.needsReconciliation === 0 ? '✅ All current' : `${stats.needsReconciliation} accounts to review`}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => {
              setScreen('liquid');
              setPendingUpdates({ next: 'reconcile' });
            }}
            className="group text-left p-6 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.purple.bg100}`}>
                <Target className={tone.purple.text600} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Complete Sync</div>
                <div className="text-sm text-gray-600">Refresh everything in one flow</div>
                <div className="mt-2 text-xs text-gray-500">⚡ Most efficient workflow</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Institution status preview (no selection needed) */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Institutions Overview</h3>
            <div className="text-xs text-gray-500">
              Last full update: {lastReconText}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[38vh] overflow-auto pr-1">
            {institutionPreview.length === 0 ? (
              <div className="text-sm text-gray-500">Connect or add accounts to get started.</div>
            ) : (
              institutionPreview.map((g) => {
                const logo = getInstitutionLogo(g.institution);
                const totalRows = g.rows.length;
                const changed = g.changed;
                const done = totalRows > 0 && changed === 0;

                // simple progress based on drafts present
                const pct = totalRows ? ((totalRows - changed) / totalRows) * 100 : 0;

                return (
                  <div
                    key={g.institution}
                    className={`rounded-xl border transition-all bg-white ${done ? 'border-green-200' : 'border-gray-200 hover:border-gray-300'} p-4`}
                  >
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <img src={logo} alt={g.institution} className="w-8 h-8 rounded object-contain" />
                      ) : (
                        <Landmark className="w-8 h-8 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{g.institution}</div>
                        <div className="text-xs text-gray-500">{totalRows} items • {fmtCurrency(g.value, false)}</div>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center text-green-700 text-xs"><CheckCircle className="w-4 h-4 mr-1" /> Ready</span>
                      ) : (
                        <span className="inline-flex items-center text-amber-700 text-xs"><AlertTriangle className="w-4 h-4 mr-1" /> Drafts</span>
                      )}
                    </div>

                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`${done ? 'bg-green-500' : 'bg-blue-500'} h-full transition-all`} style={{ width: `${clamp(pct, 0, 100)}%` }} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div className="text-gray-500">Pending edits</div>
                      <div className={`font-medium ${changed ? 'text-amber-700' : 'text-green-700'}`}>{changed}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Liquid workflow (with explainer, scrolling, continue-to-next, submit-all)
// ---- Liquid workflow (with explainer, global stats, strong indicators, bulk/paste, caret-stable input)
  function LiquidScreen() {
    // Pull liabilities so CCs/loans/mortgages appear with cash for Quick Update
    const { state, actions } = useDataStore();
    const { groupedLiabilities } = state;

    // UI local state
    const [selectedInstitution, setSelectedInstitution] = useState(null); // default: none (per spec)
    const [updated, setUpdated] = useState({}); // draft edits by row id (assets: id, liabilities: `L_${id}`)
    const [sortKey, setSortKey] = useState('nest'); // 'nest' | 'name' | 'diff'
    const [editingKey, setEditingKey] = useState(null); // row key while typing (freeze sort while editing)
    const [sortDir, setSortDir] = useState('desc');
    const [jumping, setJumping] = useState(false); // micro-animation for "Continue to Next"

    // Ensure liabilities are available
    useEffect(() => {
      if (!groupedLiabilities?.lastFetched && !groupedLiabilities?.loading) {
        actions.fetchGroupedLiabilitiesData?.();
      }
    }, [groupedLiabilities?.lastFetched, groupedLiabilities?.loading, actions]);

    // ================= CurrencyInput (paste-friendly, caret-stable, keyboard nav) =================
    const CurrencyInput = ({
      value,
      onValueChange,
      className = '',
      'aria-label': ariaLabel,
      onFocus,
      onBlur,
      nextFocusId, // optional: id of the next input to focus on Enter
    }) => {
      const [focused, setFocused] = useState(false);
      const [raw, setRaw] = useState(Number.isFinite(value) ? String(value) : '');
      const inputRef = useRef(null);

      useEffect(() => {
        if (!focused) setRaw(Number.isFinite(value) ? String(value) : '');
      }, [value, focused]);

      const sanitize = (s) => {
        // allow digits, one dot, optional leading minus (some institutions show negative cash or CCs)
        const cleaned = s.replace(/[^0-9.\-]/g, '');
        const parts = cleaned.split('.');
        const withOneDot = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
        return withOneDot.replace(/(?!^)-/g, '');
      };

      const handleChange = (e) => {
        const nextRaw = sanitize(e.target.value);
        setRaw(nextRaw);
        onValueChange?.(toNumber(nextRaw));
      };

      const handlePaste = (e) => {
        const txt = e.clipboardData.getData('text') || '';
        const cleaned = sanitize(txt);
        e.preventDefault();
        setRaw(cleaned);
        onValueChange?.(toNumber(cleaned));
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
          value={focused ? raw : (Number.isFinite(value) ? fmtCurrency(value, false) : '')}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder="$0.00"
          aria-label={ariaLabel}
          className={className}
          autoComplete="off"
        />
      );
    };

    // ================= Build groups (cash + true liabilities) =================
    const groups = useMemo(() => {
      // Cash-like assets from normalized positions
      const cashPositions = (positionsNorm || []).filter((p) => {
        const t = (p.type || '').toLowerCase();
        return (
          ['cash', 'checking', 'savings'].includes(t) ||
          /checking|savings|cash/i.test(p.name || '')
        );
      });

      // Liabilities (credit cards, loans, mortgages) from DataStore
      const liabsRaw = (groupedLiabilities?.data || []).map((L) => {
        const id = L.item_id ?? L.liability_id ?? L.id ?? L.history_id;
        const t = (L.item_type || L.type || 'liability').toLowerCase();
        const val = Number(
          L.current_balance ??
          L.current_value ??
          L.balance ??
          L.net_worth_value ??
          L.principal_balance ??
          L.amount ?? 0
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

      // Group by institution
      const map = new Map();
      const add = (inst) => {
        if (!map.has(inst)) map.set(inst, { institution: inst, positions: [], liabilities: [], totalValue: 0 });
        return map.get(inst);
      };

      cashPositions.forEach((p) => {
        const inst = p.institution || 'Unknown Institution';
        const g = add(inst);
        g.positions.push({ ...p });
        g.totalValue += Math.abs(Number(p.currentValue || 0));
      });

      liabsRaw.forEach((p) => {
        const inst = p.institution || 'Unknown Institution';
        const g = add(inst);
        g.liabilities.push({ ...p });
        g.totalValue += Math.abs(Number(p.currentValue || 0));
      });

      // Compute updated count per institution
      const enriched = Array.from(map.values()).map((g) => {
        const updatedCount =
          g.positions.filter((x) => updated[x.id] !== undefined).length +
          g.liabilities.filter((x) => updated[`L_${x.id}`] !== undefined).length;

        const totalRows = g.positions.length + g.liabilities.length;
        const progressPct = totalRows ? (updatedCount / totalRows) * 100 : 0;

        // Draft change detector that does NOT depend on selection
        const hasAnyChanges =
          g.positions.some((p) => {
            const draft = updated[p.id];
            if (draft === undefined) return false;
            return Number(draft) !== Number(p.currentValue || 0);
          }) ||
          g.liabilities.some((p) => {
            const key = `L_${p.id}`;
            const draft = updated[key];
            if (draft === undefined) return false;
            return Number(draft) !== Number(p.currentValue || 0);
          });

        return { ...g, updatedCount, progressPct, hasAnyChanges, totalRows };
      });

      // sort by value desc
      return enriched.sort((a, b) => b.totalValue - a.totalValue);
    }, [positionsNorm, groupedLiabilities?.data, updated]);

    // Keep selection valid; default is null until user picks
    useEffect(() => {
      if (selectedInstitution && !groups.find((g) => g.institution === selectedInstitution)) {
        setSelectedInstitution(null);
      }
    }, [groups, selectedInstitution]);

    // ================= Draft autosave/restore =================
    const draftKey = `${LS_DRAFT_PREFIX}${selectedInstitution || 'all'}`;

    useEffect(() => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const obj = JSON.parse(saved);
          setUpdated((prev) => ({ ...prev, ...obj }));
        }
      } catch { /* noop */ }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey]);

    useEffect(() => {
      const t = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(updated));
        } catch { /* noop */ }
      }, 450);
      return () => clearTimeout(t);
    }, [updated, draftKey]);

    // ================= Helpers / selectors =================
    const current = useMemo(
      () => groups.find((g) => g.institution === selectedInstitution),
      [groups, selectedInstitution]
    );

    const handleChangePos = (posId, value) => {
      setUpdated((prev) => ({ ...prev, [posId]: Number.isFinite(value) ? value : 0 }));
    };
    const handleChangeLiab = (liabId, value) => {
      setUpdated((prev) => ({ ...prev, [`L_${liabId}`]: Number.isFinite(value) ? value : 0 }));
    };

    // Pending-changes dashboard (GLOBAL: counts and net impact across all institutions)
    const pending = useMemo(() => {
      let count = 0;
      let posCount = 0, negCount = 0;
      let posAmt = 0, negAmt = 0;

      const all = groups.flatMap((g) => [
        ...g.positions.map((p) => ({ key: p.id, curr: Number(p.currentValue || 0) })),
        ...g.liabilities.map((p) => ({ key: `L_${p.id}`, curr: Number(p.currentValue || 0) })),
      ]);

      all.forEach((row) => {
        const nextVal = updated[row.key];
        if (nextVal === undefined) return;
        if (!Number.isFinite(nextVal)) return;

        const delta = nextVal - row.curr;
        if (delta === 0) return;

        count += 1;
        if (delta > 0) { posCount += 1; posAmt += delta; }
        else { negCount += 1; negAmt += delta; }
      });

      return { count, posCount, posAmt, negCount, negAmt, net: posAmt + negAmt };
    }, [groups, updated]);

    // Sorting util for tables
    const makeSorted = useCallback((rows, type) => {
      const rowsWithCalc = rows.map((p, idx) => {
        const key = type === 'liab' ? `L_${p.id}` : p.id;
        const nest = Number(p.currentValue || 0);
        const stmt = updated[key] !== undefined ? Number(updated[key]) : nest;
        const diff = stmt - nest;
        const pct = nest !== 0 ? (diff / nest) * 100 : 0;
        return { ...p, _calc: { rawNestEgg: nest, rawStatement: stmt, diff, pct }, _key: key, _idx: idx };
      });

      // 🔒 Freeze sorting while typing to avoid row remount/focus loss
      if (editingKey) return rowsWithCalc.sort((a, b) => a._idx - b._idx);

      rowsWithCalc.sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
        if (sortKey === 'diff') return (a._calc.diff - b._calc.diff) * dir;
        return (a._calc.rawNestEgg - b._calc.rawNestEgg) * dir; // 'nest'
      });
      return rowsWithCalc;
    }, [sortKey, sortDir, updated, editingKey]);

    const sortedPositions = useMemo(() => makeSorted(current?.positions || [], 'pos'), [current, makeSorted]);
    const sortedLiabilities = useMemo(() => makeSorted(current?.liabilities || [], 'liab'), [current, makeSorted]);

    const headerSortIcon = (key) => (sortKey === key ? <span className="ml-1 text-gray-400">{sortDir === 'asc' ? '▲' : '▼'}</span> : null);
    const toggleSort = (key) => {
      if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else { setSortKey(key); setSortDir('desc'); }
    };

    const logo = getInstitutionLogo(selectedInstitution || '');

    // ================= Save & continue =================
    async function handleBulkSave(changes, institutionLabel) {
      try {
        setLocalLoading(true);

        const batch = changes
          .map((c) => {
            const kind =
              c.kind ||
              (['cash', 'checking', 'savings'].includes((c.meta?.type || '').toLowerCase())
                ? 'cash'
                : ['liability', 'credit_card', 'loan', 'mortgage'].includes((c.meta?.type || '').toLowerCase())
                ? 'liability'
                : 'other');
            return {
              itemId: c.id ?? c.meta?.itemId ?? c.meta?.id,
              kind,
              value: Number(c.amount),
            };
          })
          .filter((b) => Number.isFinite(b.value));

        if (batch.length) await writeAndRefresh(batch);

        // Persist "lastUpdated" locally (UI smoothness)
        const nextData = { ...reconData };
        changes.forEach((c) => {
          const key = c.kind === 'liability' ? `L_${c.id}` : c.id;
          nextData[`pos_${key}`] = { lastUpdated: new Date().toISOString(), value: Number(c.amount) };
        });
        saveReconData(nextData);
        saveHistory();

        showMsg('success', `Updated ${institutionLabel}`);
      } catch (e) {
        console.error(e);
        showMsg('error', `Failed to update ${institutionLabel}`);
      } finally {
        setLocalLoading(false);
      }
    }

    const onUpdateInstitution = async () => {
      if (!current) return;

      const changes = [];

      current.positions.forEach((pos) => {
        const curr = Number(pos.currentValue ?? 0);
        const next = updated[pos.id] !== undefined ? Number(updated[pos.id]) : curr;
        if (Number.isFinite(next) && next !== curr) {
          changes.push({ kind: 'cash', id: pos.itemId ?? pos.id, amount: next, meta: pos });
        }
      });

      current.liabilities.forEach((liab) => {
        const curr = Number(liab.currentValue ?? 0);
        const key = `L_${liab.id}`;
        const next = updated[key] !== undefined ? Number(updated[key]) : curr;
        if (Number.isFinite(next) && next !== curr) {
          changes.push({ kind: 'liability', id: liab.itemId ?? liab.id, amount: next, meta: liab });
        }
      });

      if (!changes.length) {
        showMsg('info', 'No changes to apply');
        return;
      }

      await handleBulkSave(changes, current.institution);
    };

    const continueToNext = () => {
      if (!groups.length) return;
      if (!current) {
        setSelectedInstitution(groups[0].institution);
        return;
      }
      const idx = groups.findIndex((g) => g.institution === current.institution);
      const next = groups[idx + 1];
      setJumping(true);
      setTimeout(() => setJumping(false), 350);
      if (next) {
        setSelectedInstitution(next.institution);
        showMsg('success', `Moving to ${next.institution}`, 2000);
      } else {
        // Finished the list — show friendly nudge
        setSelectedInstitution(null);
        showMsg('success', 'All institutions reviewed. You can submit updates anytime.', 3000);
      }
    };

    // ================= Bulk paste into the visible grid (fills down) =================
    const onBulkPaste = (e) => {
      if (!current) return;
      const txt = e.clipboardData?.getData('text') || '';
      if (!txt) return;
      const lines = txt
        .trim()
        .split(/\r?\n/)
        .map((s) => toNumber(String(s).trim()))
        .filter((n) => Number.isFinite(n));

      if (!lines.length) return;

      e.preventDefault();

      // Fill positions first (top to bottom), then liabilities
      const posIds = (sortedPositions || []).map((p) => p.id);
      const liabIds = (sortedLiabilities || []).map((l) => `L_${l.id}`);

      const keysInOrder = [...posIds, ...liabIds];

      setUpdated((prev) => {
        const next = { ...prev };
        for (let i = 0; i < keysInOrder.length && i < lines.length; i += 1) {
          next[keysInOrder[i]] = lines[i];
        }
        return next;
      });
    };

    // ================= Layout =================
    return (
      <div className="h-[80vh] px-6 pb-6" onPaste={onBulkPaste}>
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left rail: instructions + institutions list (sticky) */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full">
            <div className="h-full flex flex-col">
              {/* Persistent controls + global dashboard */}
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sticky top-0 z-[2]">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setScreen('welcome')}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors border border-gray-200"
                    title="Back to welcome"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setLocalLoading(true);
                      Promise.all([refreshPositions?.(), refreshAccounts?.()]).finally(() => setLocalLoading(false));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors border border-gray-200"
                    title="Refresh data"
                  >
                    <RefreshCw className={`w-4 h-4 ${localLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Quick Cash & Liabilities Update</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Paste or type your latest balances from bank/credit card statements. We track changes per account and show the net impact before you submit.
                </p>

                {/* Global stats (stable, not selection-based) */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
                    <div className="text-gray-500">Pending</div>
                    <div className="font-semibold text-gray-900">{pending.count}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
                    <div className="text-gray-500">Net Impact</div>
                    <div className={`font-semibold ${pending.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {fmtCurrency(pending.net, false)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-50 px-3 py-2 border border-green-200">
                    <div className="text-green-700">↑ {pending.posCount} items</div>
                    <div className="font-semibold text-green-800">{fmtCurrency(pending.posAmt, false)}</div>
                  </div>
                  <div className="rounded-lg bg-red-50 px-3 py-2 border border-red-200">
                    <div className="text-red-700">↓ {pending.negCount} items</div>
                    <div className="font-semibold text-red-800">{fmtCurrency(pending.negAmt, false)}</div>
                  </div>
                </div>
              </div>

              {/* Institutions list */}
              <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
                {groups.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">No cash or liability accounts found.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {groups.map((g) => {
                      const isSel = g.institution === selectedInstitution;
                      const logoSmall = getInstitutionLogo(g.institution);

                      // Indicator is consistent (doesn't depend on selection), driven by hasAnyChanges
                      const statusChip = g.hasAnyChanges
                        ? <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">Draft changes</span>
                        : <span className="text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-[11px]">No changes</span>;

                      return (
                        <li key={g.institution}>
                          <button
                            onClick={() => setSelectedInstitution(g.institution)}
                            className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3
                              ${isSel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            {logoSmall ? (
                              <img src={logoSmall} alt={g.institution} className="w-7 h-7 rounded object-contain" />
                            ) : (
                              <Landmark className="w-6 h-6 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">
                                  {g.institution}
                                </div>
                                <div className="flex items-center gap-2">
                                  {statusChip}
                                  <div className="text-[11px] text-gray-500">{g.totalRows} items</div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {fmtCurrency(g.totalValue, false)}
                              </div>
                              <div className="mt-2 h-1.5 bg-gray-200/70 rounded-full overflow-hidden">
                                <div
                                  className={`${g.hasAnyChanges ? 'bg-amber-500' : 'bg-blue-500'} h-full transition-all`}
                                  style={{ width: `${clamp(g.progressPct, 0, 100)}%` }}
                                />
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
          </aside>

          {/* Right: Work surface */}
          <section className="col-span-12 lg:col-span-8 xl:col-span-9 h-full">
            {!current ? (
              <div className="h-full rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 flex items-center justify-center text-center p-10">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">Select a bank or card to begin</h4>
                  <p className="text-gray-600 mt-2 max-w-lg">
                    Pick an institution on the left to update checking/savings balances and any credit cards, loans, or mortgages.
                    You can paste from spreadsheets — we auto-detect and format amounts.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`h-full rounded-2xl border border-gray-200 bg-white flex flex-col ${jumping ? 'ring-2 ring-blue-200 transition' : ''}`}>
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-[1]">
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <img src={logo} alt={current.institution} className="w-9 h-9 rounded object-contain" />
                    ) : (
                      <Landmark className="w-8 h-8 text-gray-400" />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{current.institution}</div>
                      <div className="text-xs text-gray-500">
                        {current.positions.length} accounts • {current.liabilities.length} liabilities
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="font-semibold text-gray-900">{fmtCurrency(current.totalValue, false)}</div>
                    </div>
                    <button
                      onClick={onUpdateInstitution}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                      title={`Apply changes for ${current.institution}`}
                    >
                      Update {current.institution}
                    </button>
                    <button
                      onClick={continueToNext}
                      className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition-colors"
                      title="Move to the next institution"
                    >
                      Continue to Next
                      <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>

                {/* Scrollable tables */}
                <div className="flex-1 overflow-auto">
                  {/* Accounts & Cash */}
                  {sortedPositions.length > 0 && (
                    <div className="min-w-[780px]">
                      <div className="bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-800 sticky top-0 z-[1]">Accounts & Cash</div>
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-[44px] z-[1]">
                          <tr className="text-xs uppercase text-gray-500">
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
                        <tbody className="divide-y divide-gray-100">
                          {sortedPositions.map((pos, idx) => {
                            const c = pos._calc;
                            const changed = updated[pos.id] !== undefined && Number(updated[pos.id]) !== c.rawNestEgg;
                            const nextFocusId = `Statement_balance_for_${(sortedPositions[idx + 1]?.name || '')}`.replace(/\s+/g, '_');

                            return (
                              <tr key={pos.id} className={changed ? 'bg-blue-50/50' : ''}>
                                <td className="px-6 py-2">
                                  <div className="font-medium text-gray-900">{pos.name || 'Account'}</div>
                                  <div className="text-xs text-gray-500">{pos.inv_account_name || ''}</div>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">{pos.identifier || '—'}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{pos.type || '—'}</td>
                                <td className="px-3 py-2 text-right text-gray-800">
                                  {fmtCurrency(c.rawNestEgg, false)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <CurrencyInput
                                    value={updated[pos.id] !== undefined ? updated[pos.id] : c.rawNestEgg}
                                    onValueChange={(v) => handleChangePos(pos.id, v)}
                                    onFocus={() => setEditingKey(pos.id)}
                                    onBlur={() => setEditingKey(null)}
                                    nextFocusId={nextFocusId}
                                    aria-label={`Statement balance for ${pos.name}`}
                                    className={`w-44 text-right px-3 py-1.5 rounded-md border transition-all
                                      ${changed ? 'border-blue-400 ring-2 ring-blue-200 bg-white' : 'border-gray-300 bg-white'}`}
                                  />
                                </td>
                                <td
                                  className={`px-3 py-2 text-right font-semibold
                                    ${c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}
                                >
                                  {fmtCurrency(c.diff, false)}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right
                                    ${c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}
                                >
                                  {c.rawNestEgg === 0 ? '—' : `${c.pct.toFixed(2)}%`}
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
                      <div className="bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-800 sticky top-0 z-[1]">Liabilities</div>
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-[44px] z-[1]">
                          <tr className="text-xs uppercase text-gray-500">
                            <th className="px-6 py-2 text-left cursor-pointer" onClick={() => toggleSort('name')}>
                              Name {headerSortIcon('name')}
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
                        <tbody className="divide-y divide-gray-100">
                          {sortedLiabilities.map((liab, idx) => {
                            const c = liab._calc;
                            const key = `L_${liab.id}`;
                            const changed = updated[key] !== undefined && Number(updated[key]) !== c.rawNestEgg;
                            const nextFocusId = `Statement_balance_for_${(sortedLiabilities[idx + 1]?.name || '')}`.replace(/\s+/g, '_');

                            return (
                              <tr key={liab.id} className={changed ? 'bg-blue-50/50' : ''}>
                                <td className="px-6 py-2">
                                  <div className="font-medium text-gray-900">{liab.name || 'Liability'}</div>
                                  <div className="text-xs text-gray-500">{liab.inv_account_name || ''}</div>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600">{liab.identifier || '—'}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{liab.type || '—'}</td>
                                <td className="px-3 py-2 text-right text-gray-800">
                                  {fmtCurrency(c.rawNestEgg, false)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <CurrencyInput
                                    value={updated[key] !== undefined ? updated[key] : c.rawNestEgg}
                                    onValueChange={(v) => handleChangeLiab(liab.id, v)}
                                    onFocus={() => setEditingKey(key)}
                                    onBlur={() => setEditingKey(null)}
                                    nextFocusId={nextFocusId}
                                    aria-label={`Statement balance for ${liab.name}`}
                                    className={`w-44 text-right px-3 py-1.5 rounded-md border transition-all
                                      ${changed ? 'border-blue-400 ring-2 ring-blue-200 bg-white' : 'border-gray-300 bg-white'}`}
                                  />
                                </td>
                                <td
                                  className={`px-3 py-2 text-right font-semibold
                                    ${c.diff > 0 ? 'text-red-600' : c.diff < 0 ? 'text-green-600' : 'text-gray-500'}`}
                                >
                                  {fmtCurrency(c.diff, false)}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right
                                    ${c.diff > 0 ? 'text-red-600' : c.diff < 0 ? 'text-green-600' : 'text-gray-500'}`}
                                >
                                  {c.rawNestEgg === 0 ? '—' : `${c.pct.toFixed(2)}%`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Empty state if both empty */}
                  {sortedPositions.length === 0 && sortedLiabilities.length === 0 && (
                    <div className="p-10 text-center text-gray-500">No accounts or liabilities for this institution.</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }


  // ---- Account reconciliation (Investment check-in) with richer descriptors + KPI + better layout + currency input
  function ReconcileScreen() {
    // —— Layout & state
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [editing, setEditing] = useState(null); // freeze UI jitter while typing in the statement input

    // ================= CurrencyInput (paste-friendly, caret-stable) =================
    const CurrencyInput = ({ value, onValueChange, className = '', onFocus, onBlur, 'aria-label': ariaLabel }) => {
      const [focused, setFocused] = useState(false);
      const [raw, setRaw] = useState(Number.isFinite(value) ? String(value) : '');
      const inputRef = useRef(null);

      useEffect(() => {
        if (!focused) setRaw(Number.isFinite(value) ? String(value) : '');
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
        onValueChange?.(toNumber(nextRaw));
      };

      const handlePaste = (e) => {
        const txt = e.clipboardData.getData('text') || '';
        const cleaned = sanitize(txt);
        e.preventDefault();
        setRaw(cleaned);
        onValueChange?.(toNumber(cleaned));
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (el) {
            const end = el.value.length;
            el.setSelectionRange(end, end);
          }
        });
      };

      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={focused ? raw : (Number.isFinite(value) ? fmtCurrency(value, false) : '')}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={(e) => { if (['e', 'E'].includes(e.key)) e.preventDefault(); }}
          placeholder="$0.00"
          aria-label={ariaLabel}
          className={className}
          autoComplete="off"
        />
      );
    };

    // ================= Group accounts by institution (mirrors LiquidScreen’s left rail) =================
    const groups = useMemo(() => {
      const map = new Map();
      (accounts || []).forEach((a) => {
        const inst = a.institution || 'Unknown Institution';
        if (!map.has(inst)) map.set(inst, []);
        map.get(inst).push(a);
      });

      const results = Array.from(map.entries()).map(([institution, list]) => {
        const totalValue = list.reduce((s, a) => s + Number(a.totalValue || 0), 0);

        // consider "needs" based on either (a) not reconciled recently or (b) has a statement value that differs
        let needs = 0;
        list.forEach((a) => {
          const rec = reconData[a.id]?.lastReconciled;
          const stmt = reconData[a.id]?.statementBalance;
          const ne = Number(a.totalValue || 0);
          const diff = Number.isFinite(stmt) ? (stmt - ne) : null;

          const stale = !rec || (Math.floor((Date.now() - new Date(rec).getTime()) / (1000 * 60 * 60 * 24)) > 7);
          const mismatched = diff !== null && Math.abs(diff) >= TOLERANCE;
          if (stale || mismatched) needs += 1;
        });

        return { institution, accounts: list, totalValue, needs };
      });

      return results.sort((a, b) => b.totalValue - a.totalValue);
    }, [accounts, reconData]);

    // Default institution selection unchanged (none until click); if you prefer first, uncomment:
    // useEffect(() => { if (!selectedInstitution && groups.length) setSelectedInstitution(groups[0].institution); }, [groups, selectedInstitution]);

    const current = useMemo(
      () => groups.find((g) => g.institution === selectedInstitution),
      [groups, selectedInstitution]
    );

    // ================= Helpers =================
    const calc = useCallback((a) => {
      const ne = Number(a.totalValue || 0);
      const st = Number(reconData[a.id]?.statementBalance ?? NaN);
      const hasStmt = Number.isFinite(st);
      const diff = hasStmt ? (st - ne) : 0;
      return {
        nest: ne,
        stmt: hasStmt ? st : null,
        diff,
        pct: hasStmt ? diffPct(ne, diff) : 0,
        isReconciled: hasStmt ? Math.abs(diff) < TOLERANCE : false
      };
    }, [reconData]);

    const handleStatementChange = (accId, v) => {
      const next = {
        ...reconData,
        [accId]: { ...(reconData[accId] || {}), statementBalance: Number.isFinite(v) ? v : 0, timestamp: new Date().toISOString() },
      };
      saveReconData(next);
    };

    const quickReconcile = (a) => {
      const ne = Number(a.totalValue || 0);
      const next = {
        ...reconData,
        [a.id]: { ...(reconData[a.id] || {}), statementBalance: ne, lastReconciled: new Date().toISOString() },
      };
      saveReconData(next);
      showMsg('success', 'Account marked reconciled');
    };

    const onComplete = async () => {
      saveHistory();
      // Collect all reconciled/entered balances across institutions for the final summary
      const results = (accounts || [])
        .filter((a) => reconData[a.id]?.statementBalance !== undefined)
        .map((a) => {
          const r = calc(a);
          return {
            accountName: a.accountName || a.account_name || 'Account',
            institution: a.institution,
            finalBalance: r.stmt ?? 0,
            change: r.stmt !== null ? r.diff : 0,
          };
        });
      setReconResults(results);
      setScreen('summary');
    };

    // positions under selected account (drilldown)
    const positionsForSelectedAccount = useMemo(() => {
      if (!selectedAccount) return [];
      const id = selectedAccount.id;
      return positionsNorm
        .filter((p) => String(p.accountId) === String(id))
        .map((p) => ({
          id: p.id,
          name: p.name || p.identifier || 'Position',
          identifier: p.identifier || '',
          type: p.type || '',
          value: Number(p.currentValue || 0),
        }))
        .sort((a, b) => b.value - a.value);
    }, [selectedAccount, positionsNorm]);

    // Continue to next account within the current institution
    const continueToNextAccount = () => {
      if (!current) return;
      const list = current.accounts || [];
      if (!selectedAccount) {
        setSelectedAccount(list[0] || null);
        return;
      }
      const idx = list.findIndex((x) => x.id === selectedAccount.id);
      const next = list[idx + 1];
      if (next) {
        setSelectedAccount(next);
      } else {
        // move to next institution
        const i = groups.findIndex((g) => g.institution === current.institution);
        const nextInst = groups[i + 1];
        if (nextInst) {
          setSelectedInstitution(nextInst.institution);
          setSelectedAccount(nextInst.accounts?.[0] || null);
          showMsg('success', `Moving to ${nextInst.institution}`, 2000);
        } else {
          setSelectedInstitution(null);
          setSelectedAccount(null);
          showMsg('success', 'All institutions reviewed. You can complete reconciliation.', 3000);
        }
      }
    };

    // ================= UI =================
    return (
      <div className="h-[80vh] px-6 pb-6">
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left rail: navigation + overview (sticky) */}
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full">
            <div className="h-full flex flex-col">
              {/* Persistent header/nav */}
              <div className="sticky top-0 z-[2] bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setScreen('welcome')}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors border border-gray-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowValues((s) => !s)}
                      className={`p-2 rounded-lg ${showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                      title={showValues ? 'Hide values' : 'Show values'}
                    >
                      {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={onComplete}
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                      title="Complete reconciliation"
                    >
                      <CheckCheck className="w-4 h-4 inline mr-1" />
                      Complete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Enter statement totals per investment account. We’ll flag differences and let you step through accounts quickly.
                </p>
              </div>

              {/* Institutions list */}
              <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
                {groups.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">No investment accounts found.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {groups.map((g) => {
                      const isSel = g.institution === selectedInstitution;
                      const logo = getInstitutionLogo(g.institution);
                      return (
                        <li key={g.institution}>
                          <button
                            onClick={() => { setSelectedInstitution(g.institution); setSelectedAccount(null); }}
                            className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3
                              ${isSel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            {logo ? (
                              <img src={logo} alt={g.institution} className="w-7 h-7 rounded object-contain" />
                            ) : (
                              <Landmark className="w-6 h-6 text-gray-400" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">{g.institution}</div>
                                <div className="text-xs text-gray-500">{g.accounts.length} accounts</div>
                              </div>
                              <div className="text-xs text-gray-500">{fmtCurrency(g.totalValue, !showValues)}</div>
                              {g.needs > 0 ? (
                                <div className="mt-2 inline-flex items-center text-amber-700 text-xs">
                                  <AlertTriangle className="w-4 h-4 mr-1" /> {g.needs} to review
                                </div>
                              ) : (
                                <div className="mt-2 inline-flex items-center text-green-700 text-xs">
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
          </aside>

          {/* Right: Work surface */}
          <section className="col-span-12 lg:col-span-8 xl:col-span-9 h-full">
            {!current ? (
              <div className="h-full rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 flex items-center justify-center text-center p-10">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">Select an institution to begin</h4>
                  <p className="text-gray-600 mt-2 max-w-lg">
                    Choose a provider on the left, then enter the latest statement balance for each investment account.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full rounded-2xl border border-gray-200 bg-white flex flex-col">
                {/* Sticky header for the work surface */}
                <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-[1]">
                  <div className="flex items-center gap-3">
                    {getInstitutionLogo(current.institution) ? (
                      <img src={getInstitutionLogo(current.institution)} alt={current.institution} className="w-9 h-9 rounded object-contain" />
                    ) : (
                      <Landmark className="w-8 h-8 text-gray-400" />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{current.institution}</div>
                      <div className="text-xs text-gray-500">{current.accounts.length} accounts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={continueToNextAccount}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition-colors"
                      title="Continue to next account"
                    >
                      Continue
                      <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>

                {/* Accounts list with statement input */}
                <div className="flex-1 overflow-auto">
                  <div className="min-w-[720px]">
                    <div className="bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-800 sticky top-0 z-[1]">
                      Accounts in {current.institution}
                    </div>
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-[44px] z-[1]">
                        <tr className="text-xs uppercase text-gray-500">
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
                      <tbody className="divide-y divide-gray-100">
                        {current.accounts.map((a) => {
                          const r = calc(a);
                          const posCount = positionsNorm.filter((p) => String(p.accountId) === String(a.id)).length;
                          const isSel = selectedAccount?.id === a.id;
                          const changed = r.stmt !== null && Math.abs(r.diff) >= 0.0000001;

                          return (
                            <tr key={a.id} className={`${isSel ? 'bg-blue-50/40' : ''}`}>
                              <td className="px-6 py-2">
                                <div className="font-medium text-gray-900">{a.accountName || a.account_name || 'Account'}</div>
                                <div className="text-xs text-gray-500">{a.accountType || a.type || '—'}</div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600">{a.accountIdentifier || a.identifier || '—'}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{a.accountCategory || a.category || '—'}</td>
                              <td className="px-3 py-2 text-right text-gray-800">{fmtCurrency(r.nest, !showValues)}</td>
                              <td className="px-3 py-2 text-center">
                                <CurrencyInput
                                  value={r.stmt ?? r.nest}
                                  onValueChange={(v) => handleStatementChange(a.id, v)}
                                  onFocus={() => setEditing(a.id)}
                                  onBlur={() => setEditing(null)}
                                  aria-label={`Statement balance for ${a.accountName || 'Account'}`}
                                  className={`w-40 text-right px-3 py-1.5 rounded-md border transition-all
                                    ${changed ? 'border-blue-400 ring-2 ring-blue-200 bg-white' : 'border-gray-300 bg-white'}`}
                                />
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${r.diff > 0 ? 'text-green-600' : r.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                {r.stmt === null ? '—' : fmtCurrency(r.diff, !showValues)}
                              </td>
                              <td className={`px-3 py-2 text-right ${r.diff > 0 ? 'text-green-600' : r.diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                {r.stmt === null || r.nest === 0 ? '—' : `${r.pct.toFixed(2)}%`}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                  {posCount}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setSelectedAccount(a)}
                                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-800"
                                    title="View positions"
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={() => quickReconcile(a)}
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

                    {/* Drilldown panel under the table */}
                    {selectedAccount && (
                      <div className="px-6 py-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {selectedAccount.accountName || selectedAccount.account_name || 'Account'} • Positions
                            </div>
                            <div className="text-xs text-gray-500">
                              {positionsForSelectedAccount.length} positions
                            </div>
                          </div>
                          <button
                            onClick={continueToNextAccount}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition-colors"
                          >
                            Continue
                            <ChevronRight className="inline w-4 h-4 ml-1" />
                          </button>
                        </div>

                        <div className="max-h-[32vh] overflow-auto border rounded-lg">
                          <table className="w-full min-w-[560px]">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr className="text-xs uppercase text-gray-500">
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-left">Identifier</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-right">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {positionsForSelectedAccount.map((p) => (
                                <tr key={p.id}>
                                  <td className="px-4 py-2 text-sm text-gray-900">{p.name}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600">{p.identifier || '—'}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600">{p.type || '—'}</td>
                                  <td className="px-3 py-2 text-right text-sm text-gray-900">
                                    {fmtCurrency(p.value, !showValues)}
                                  </td>
                                </tr>
                              ))}
                              {positionsForSelectedAccount.length === 0 && (
                                <tr>
                                  <td className="px-4 py-3 text-sm text-gray-500" colSpan={4}>
                                    No positions found for this account.
                                  </td>
                                </tr>
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


  // ---- Summary
  function SummaryScreen() {
    const statsLocal = {
      accountsReconciled: reconResults.length,
      liquidPositionsUpdated: 0,
      totalValueReconciled: reconResults.reduce((s, r) => s + Number(r.finalBalance || 0), 0),
    };
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <Confetti show />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-2xl">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Reconciliation Complete 🎉</h1>
            <p className="text-gray-600 mt-2">Nice work. Your data is up to date.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle className="w-7 h-7 text-green-600" />
                <span className="text-3xl font-bold">{statsLocal.accountsReconciled}</span>
              </div>
              <div className="text-gray-700 font-semibold">Accounts Reconciled</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <Droplets className="w-7 h-7 text-blue-600" />
                <span className="text-3xl font-bold">{statsLocal.liquidPositionsUpdated}</span>
              </div>
              <div className="text-gray-700 font-semibold">Liquid Positions</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-7 h-7 text-indigo-600" />
                <span className="text-2xl font-bold">{fmtCurrency(statsLocal.totalValueReconciled)}</span>
              </div>
              <div className="text-gray-700 font-semibold">Total Value</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <Percent className="w-7 h-7 text-purple-600" />
                <div className="relative">
                  <ProgressRing percentage={healthScore} size={56} color="purple" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{healthScore}%</span>
                  </div>
                </div>
              </div>
              <div className="text-gray-700 font-semibold">Accuracy</div>
            </div>
          </div>

          {reconResults.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-600" />
                Reconciliation Details
              </h3>
              <div className="space-y-3">
                {reconResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{r.accountName}</div>
                      <div className="text-xs text-gray-500">{r.institution}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{fmtCurrency(r.finalBalance)}</div>
                      {r.change !== 0 && (
                        <div className={`text-sm ${r.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {r.change > 0 ? '+' : ''}
                          {fmtCurrency(r.change)}
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
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Schedule weekly</div>
                  <div className="text-sm text-blue-100">Reconciling weekly keeps drift low</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded">
                  <LineChart className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Track progress</div>
                  <div className="text-sm text-blue-100">Watch portfolio health trend</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Set alerts</div>
                  <div className="text-sm text-blue-100">Get pinged when data drifts</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-gray-100 transition-colors">
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  setReconResults([]);
                  setScreen('welcome');
                }}
                className="px-5 py-2.5 bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
              >
                Start New Reconciliation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============== Render ==========================================
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} showHeader={false}>
      {((loading || localLoading) && screen === 'welcome') ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your portfolio...</p>
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
        {message.text && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md px-5 py-4 rounded-xl shadow-2xl text-white flex items-center justify-between z-[100002] ${
              message.type === 'error' ? 'bg-red-600' : message.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
            }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage({ type: '', text: '' })} className="p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {confetti && <Confetti show />}
    </ModalShell>
  );
}

// ============== Optional: Navbar button in the same file ==============
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
