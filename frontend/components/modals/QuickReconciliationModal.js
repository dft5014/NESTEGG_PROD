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

// Modal shell
function ModalShell({ isOpen, onClose, children, showHeader = false, title = '' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-[10000] mx-auto my-8 w-full max-w-7xl">
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          {showHeader && (
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
          {children}
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
    <div className="pointer-events-none fixed inset-0 z-[10001]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: 'confetti-fall 4.2s ease-out forwards',
            // inline CSS vars for the keyframes:
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
      const id = p.itemId ?? p.id;
      const accountId = p.accountId ?? p.account_id;
      const acct = accountsById.get(accountId);
      const type = String(p.assetType ?? p.asset_type ?? p.position_type ?? '').toLowerCase();
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
    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back 👋</h1>
          <p className="text-gray-600">Let’s keep NestEgg accurate and tight.</p>
          {streak > 0 && (
            <div className="inline-flex items-center px-4 py-2 rounded-full border border-amber-200 bg-amber-50">
              <Sparkles className="w-4 h-4 text-amber-600 mr-2" /> {streak}-day reconciliation streak
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="inline-block relative mb-2">
              <ProgressRing
                percentage={healthScore}
                size={96}
                strokeWidth={8}
                color={healthScore >= 75 ? 'green' : healthScore >= 50 ? 'yellow' : 'red'}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{healthScore}%</div>
                  <div className="text-xs text-gray-500">Health</div>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Last full update: {lastReconText}</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-4xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Accounts</div>
            <div className="mt-3 flex justify-center gap-4">
              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">{stats.reconciled} current</span>
              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{stats.needsReconciliation} pending</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="text-4xl font-bold text-gray-900">{Math.round(stats.valuePercentage)}%</div>
            <div className="text-sm text-gray-500">Value Reconciled</div>
            <div className="mt-2 text-xs text-gray-500">
              {fmtCurrency(stats.reconciledValue)} of {fmtCurrency(stats.totalValue)}
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setScreen('liquid')}
            className="group text-left p-6 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.blue.bg100}`}>
                <Droplets className={tone.blue.text600} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Quick Cash Update</div>
                <div className="text-sm text-gray-600">Update checking, savings, and cards fast</div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.liquidPositions === 0 ? '✅ All up to date' : `${stats.liquidPositions} need updates`}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => setScreen('reconcile')}
            className="group text-left p-6 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.green.bg100}`}>
                <CheckSquare className={tone.green.text600} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Investment Check-In</div>
                <div className="text-sm text-gray-600">Verify accounts match statements</div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.needsReconciliation === 0 ? '✅ Nothing pending' : `${stats.needsReconciliation} accounts to review`}
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
                <div className="text-sm text-gray-600">Fastest way to refresh everything</div>
                <div className="mt-2 text-xs text-gray-500">⚡ Most efficient workflow</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ---- Liquid workflow (with scrollable, sortable table and liabilities grouped)
  function LiquidScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [updated, setUpdated] = useState({});
    const [reviewed, setReviewed] = useState(new Set());
    const [sortKey, setSortKey] = useState('nest'); // 'nest' | 'name' | 'diff'
    const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
    const draftKey = `${LS_DRAFT_PREFIX}${selectedInstitution || 'all'}`;

    // Group by institution (include liabilities by looking at type markers)
    const groups = useMemo(() => {
      const map = new Map();
      positionsNorm.forEach((p) => {
        const inst = p.institution || 'Unknown Institution';
        if (!map.has(inst)) map.set(inst, { positions: [], liabilities: [] });
        if (['liability', 'loan', 'credit_card'].includes(p.type)) {
          map.get(inst).liabilities.push({ ...p });
        } else if (
          ['cash', 'checking', 'savings'].includes(p.type) ||
          /checking|savings|credit|loan/i.test(p.name)
        ) {
          map.get(inst).positions.push({ ...p });
        }
      });

      return Array.from(map.entries())
        .map(([institution, { positions, liabilities }]) => {
          const totalPositions = positions.reduce((s, x) => s + Math.abs(x.currentValue || 0), 0);
          const totalLiabs = liabilities.reduce((s, x) => s + Math.abs(x.currentValue || 0), 0);
          return {
            institution,
            positions,
            liabilities,
            totalValue: totalPositions + totalLiabs,
            updatedCount: positions.filter((x) => updated[x.id] !== undefined).length +
              liabilities.filter((x) => updated[`L_${x.id}`] !== undefined).length,
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue);
    }, [positionsNorm, updated]);

    // Auto-select first institution
    useEffect(() => {
      if (!groups.length) return;
      if (!selectedInstitution) setSelectedInstitution(groups[0].institution);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups.length]);

    const current = groups.find((g) => g.institution === selectedInstitution);
    const positions = current?.positions || [];
    const liabilities = current?.liabilities || [];

    // Draft autosave/restore
    useEffect(() => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const obj = JSON.parse(saved);
          setUpdated((prev) => ({ ...prev, ...obj }));
        }
      } catch {
        /* noop */
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey]);
    useEffect(() => {
      const t = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(updated));
        } catch {
          /* noop */
        }
      }, 600);
      return () => clearTimeout(t);
    }, [updated, draftKey]);

    // bulk paste
    const onPasteIntoGrid = (e) => {
      if (!positions.length) return;
      const txt = e.clipboardData.getData('text');
      if (!txt) return;
      const lines = txt.split(/\r?\n/).map(toNumber);
      if (!lines.length) return;
      setUpdated((prev) => {
        const next = { ...prev };
        positions.forEach((p, i) => {
          if (Number.isFinite(lines[i])) next[p.id] = lines[i];
        });
        return next;
      });
      e.preventDefault();
    };

    const totalProgressCount =
      Object.keys(updated).filter((k) => updated[k] !== undefined && updated[k] !== null).length;
    const liquidCount = positions.length + liabilities.length;
    const totalProgressPct = liquidCount ? (totalProgressCount / liquidCount) * 100 : 0;

    // sorting
    const sortedPositions = useMemo(() => {
      const rows = positions.map((p) => {
        const c = calcRow(p, updated);
        return { ...p, _calc: c };
      });
      rows.sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
        if (sortKey === 'diff') return (a._calc.diff - b._calc.diff) * dir;
        return (a._calc.rawNestEgg - b._calc.rawNestEgg) * dir; // 'nest'
      });
      return rows;
    }, [positions, updated, sortKey, sortDir]);

    const sortedLiabs = useMemo(() => {
      const rows = liabilities.map((p) => {
        const nest = Number(p.currentValue || 0);
        const key = `L_${p.id}`;
        const stmt = updated[key] !== undefined ? Number(updated[key]) : nest;
        const diff = stmt - nest;
        const pct = nest !== 0 ? (diff / nest) * 100 : 0;
        return { ...p, _calc: { rawNestEgg: nest, rawStatement: stmt, diff, pct } };
      });
      rows.sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
        if (sortKey === 'diff') return (a._calc.diff - b._calc.diff) * dir;
        return (a._calc.rawNestEgg - b._calc.rawNestEgg) * dir;
      });
      return rows;
    }, [liabilities, updated, sortKey, sortDir]);

    const handleSort = (key) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    };

    const headerSortIcon = (key) => {
      if (sortKey !== key) return null;
      return <span className="ml-1 text-gray-400">{sortDir === 'asc' ? '▲' : '▼'}</span>;
    };

    const logo = getInstitutionLogo(selectedInstitution || '');

    const handleChangePos = (posId, value) => {
      setUpdated((prev) => ({ ...prev, [posId]: toNumber(value) }));
    };
    const handleChangeLiab = (liabId, value) => {
      setUpdated((prev) => ({ ...prev, [`L_${liabId}`]: toNumber(value) }));
    };

    const widthPct = (pct) => {
      const n = clamp(pct, 0, 100);
      return { width: `${n}%` };
    };

    const handleBulkSave = async (changes, institution) => {
      try {
        setLocalLoading(true);
        const batch = changes
          .map((c) => {
            const kind =
              c.kind ||
              (['cash', 'checking', 'savings'].includes(c.meta?.type)
                ? 'cash'
                : ['liability', 'credit_card', 'loan'].includes(c.meta?.type)
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

        const nextData = { ...reconData };
        changes.forEach((c) => {
          const key = c.kind === 'liability' ? `L_${c.id}` : c.id;
          nextData[`pos_${key}`] = { lastUpdated: new Date().toISOString(), value: Number(c.amount) };
        });
        saveReconData(nextData);
        saveHistory();
        showMsg('success', `Updated ${institution}`);
      } catch (e) {
        console.error(e);
        showMsg('error', `Failed to update ${institution}`);
      } finally {
        setLocalLoading(false);
      }
    };

    const onUpdateInstitution = async () => {
      if (!current) return;
      const changes = [];

      positions.forEach((pos) => {
        const curr = Number(pos.current_value ?? pos.currentValue ?? 0);
        const next = updated[pos.id] !== undefined ? Number(updated[pos.id]) : curr;
        if (Number.isFinite(next) && next !== curr) {
          changes.push({ kind: 'cash', id: pos.itemId ?? pos.id, amount: next, meta: pos });
        }
      });

      liabilities.forEach((liab) => {
        const curr = Number(liab.currentValue || 0);
        const next = updated[`L_${liab.id}`] !== undefined ? Number(updated[`L_${liab.id}`]) : curr;
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

    return (
      <div className="p-8" onPaste={onPasteIntoGrid}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setScreen('welcome')} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Overall Progress</div>
              <div className="text-lg font-semibold text-gray-900">
                {totalProgressCount} / {liquidCount}
              </div>
            </div>
            <ProgressRing percentage={totalProgressPct} size={64} color="blue" />
            <button
              onClick={() => setShowValues((s) => !s)}
              className={`p-2 rounded-lg ${showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={async () => {
                setLocalLoading(true);
                await Promise.all([refreshPositions?.(), refreshAccounts?.()]);
                setLocalLoading(false);
              }}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-gray-700 ${localLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Institution selector */}
        <div className="flex flex-wrap gap-3 mb-5">
          {groups.map((g) => {
            const isSel = g.institution === selectedInstitution;
            const done =
              g.positions.concat(g.liabilities).length > 0 &&
              g.positions.concat(g.liabilities).every((p) => {
                const key = ['liability', 'loan', 'credit_card'].includes(p.type) ? `L_${p.id}` : p.id;
                return updated[key] !== undefined || reviewed.has(p.id);
              });
            const instProgress =
              g.positions.concat(g.liabilities).length > 0
                ? (g.updatedCount / (g.positions.length + g.liabilities.length)) * 100
                : 0;
            const barStyle = widthPct(instProgress);
            const logoSmall = getInstitutionLogo(g.institution);

            return (
              <button
                key={g.institution}
                onClick={() => setSelectedInstitution(g.institution)}
                className={`relative px-5 py-3 rounded-xl border-2 transition-all ${
                  isSel
                    ? 'border-blue-500 bg-blue-50'
                    : done
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {done && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {logoSmall ? (
                    <img src={logoSmall} alt={g.institution} className="w-6 h-6 rounded-full object-contain" />
                  ) : (
                    <Landmark
                      className={`w-6 h-6 ${
                        isSel ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                  )}
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{g.institution}</div>
                    <div className="text-xs text-gray-500">
                      {g.positions.length + g.liabilities.length} items
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-900 font-semibold">{fmtCurrency(g.totalValue, !showValues)}</div>
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`${isSel ? 'bg-blue-500' : 'bg-green-500'} h-full`}
                    style={barStyle}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline panel for selected institution */}
        {current ? (
          <div className="rounded-2xl border bg-white">
            {/* Header row */}
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                {logo ? (
                  <img src={logo} alt={selectedInstitution || ''} className="w-8 h-8 rounded-full object-contain" />
                ) : (
                  <Landmark className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <div className="font-semibold text-gray-900">{selectedInstitution}</div>
                  <div className="text-xs text-gray-500">
                    {positions.length} accounts • {liabilities.length} liabilities
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-semibold text-gray-900">
                    {fmtCurrency(current.totalValue, !showValues)}
                  </div>
                </div>
                <button
                  onClick={onUpdateInstitution}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Update {selectedInstitution}
                </button>
              </div>
            </div>

            {/* SCROLLABLE grid */}
            <div className="max-h-[52vh] overflow-auto border-t">
              {/* positions table */}
              {positions.length > 0 && (
                <div className="min-w-[720px]">
                  <div className="bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-800">
                    Accounts & Cash
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="text-xs uppercase text-gray-500">
                        <th className="px-6 py-2 text-left cursor-pointer" onClick={() => handleSort('name')}>
                          Account / Details {headerSortIcon('name')}
                        </th>
                        <th className="px-3 py-2 text-left">Identifier</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right cursor-pointer" onClick={() => handleSort('nest')}>
                          NestEgg {headerSortIcon('nest')}
                        </th>
                        <th className="px-3 py-2 text-center">Statement</th>
                        <th className="px-3 py-2 text-right cursor-pointer" onClick={() => handleSort('diff')}>
                          Δ {headerSortIcon('diff')}
                        </th>
                        <th className="px-3 py-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedPositions.map((pos) => {
                        const c = pos._calc;
                        const changed = updated[pos.id] !== undefined && Number(updated[pos.id]) !== c.rawNestEgg;
                        return (
                          <tr key={pos.id} className={changed ? 'bg-blue-50' : ''}>
                            <td className="px-6 py-2">
                              <div className="font-medium text-gray-900">{pos.name || 'Account'}</div>
                              <div className="text-xs text-gray-500">{pos.inv_account_name || ''}</div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">{pos.identifier || '—'}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{pos.type || '—'}</td>
                            <td className="px-3 py-2 text-right text-gray-800">
                              {fmtCurrency(c.rawNestEgg, !showValues)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                className={`w-36 text-right px-3 py-1.5 rounded-md border ${
                                  changed ? 'border-blue-400 ring-2 ring-blue-200 bg-white' : 'border-gray-300'
                                }`}
                                value={updated[pos.id] !== undefined ? updated[pos.id] : c.rawNestEgg}
                                onChange={(e) => handleChangePos(pos.id, e.target.value)}
                              />
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-semibold ${
                                c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : 'text-gray-500'
                              }`}
                            >
                              {fmtCurrency(c.diff, !showValues)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right ${
                                c.diff > 0 ? 'text-green-600' : c.diff < 0 ? 'text-red-600' : 'text-gray-500'
                              }`}
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

              {/* liabilities table */}
              {liabilities.length > 0 && (
                <div className="min-w-[720px] mt-6">
                  <div className="bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-800">Liabilities</div>
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="text-xs uppercase text-gray-500">
                        <th className="px-6 py-2 text-left cursor-pointer" onClick={() => handleSort('name')}>
                          Name {headerSortIcon('name')}
                        </th>
                        <th className="px-3 py-2 text-left">Identifier</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right cursor-pointer" onClick={() => handleSort('nest')}>
                          NestEgg {headerSortIcon('nest')}
                        </th>
                        <th className="px-3 py-2 text-center">Statement</th>
                        <th className="px-3 py-2 text-right cursor-pointer" onClick={() => handleSort('diff')}>
                          Δ {headerSortIcon('diff')}
                        </th>
                        <th className="px-3 py-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedLiabs.map((liab) => {
                        const c = liab._calc;
                        const key = `L_${liab.id}`;
                        const changed = updated[key] !== undefined && Number(updated[key]) !== c.rawNestEgg;
                        return (
                          <tr key={liab.id} className={changed ? 'bg-blue-50' : ''}>
                            <td className="px-6 py-2">
                              <div className="font-medium text-gray-900">{liab.name || 'Liability'}</div>
                              <div className="text-xs text-gray-500">{liab.inv_account_name || ''}</div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600">{liab.identifier || '—'}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{liab.type || '—'}</td>
                            <td className="px-3 py-2 text-right text-gray-800">
                              {fmtCurrency(c.rawNestEgg, !showValues)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                className={`w-36 text-right px-3 py-1.5 rounded-md border ${
                                  changed ? 'border-blue-400 ring-2 ring-blue-200 bg-white' : 'border-gray-300'
                                }`}
                                value={updated[key] !== undefined ? updated[key] : c.rawNestEgg}
                                onChange={(e) => handleChangeLiab(liab.id, e.target.value)}
                              />
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-semibold ${
                                c.diff > 0 ? 'text-red-600' : c.diff < 0 ? 'text-green-600' : 'text-gray-500'
                              }`}
                            >
                              {fmtCurrency(c.diff, !showValues)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right ${
                                c.diff > 0 ? 'text-red-600' : c.diff < 0 ? 'text-green-600' : 'text-gray-500'
                              }`}
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
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">Select an institution to begin.</div>
        )}
      </div>
    );
  }

  // ---- Account reconciliation (with drill-down position detail)
  function ReconcileScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);

    const groups = useMemo(() => {
      const map = new Map();
      accounts.forEach((a) => {
        const inst = a.institution || 'Unknown Institution';
        if (!map.has(inst)) map.set(inst, []);
        map.get(inst).push(a);
      });
      return Array.from(map.entries())
        .map(([institution, list]) => {
          const totalValue = list.reduce((s, a) => s + Number(a.totalValue || 0), 0);
          const needs = list.filter((a) => {
            const r = reconData[a.id]?.lastReconciled;
            if (!r) return true;
            const days = Math.floor((Date.now() - new Date(r).getTime()) / (1000 * 60 * 60 * 24));
            return !(days <= 7);
          }).length;
          return { institution, accounts: list, totalValue, needs };
        })
        .sort((a, b) => b.totalValue - a.totalValue);
    }, [accounts, reconData]);

    useEffect(() => {
      if (groups.length && !selectedInstitution) setSelectedInstitution(groups[0].institution);
    }, [groups, selectedInstitution]);

    const current = groups.find((g) => g.institution === selectedInstitution);

    const handleStatementChange = (accId, val) => {
      const v = toNumber(val);
      const next = {
        ...reconData,
        [accId]: { ...(reconData[accId] || {}), statementBalance: v, timestamp: new Date().toISOString() },
      };
      saveReconData(next);
    };

    const calc = (a) => {
      const ne = Number(a.totalValue || 0);
      const st = Number(reconData[a.id]?.statementBalance ?? 0);
      const diff = st - ne;
      return { nest: ne, stmt: st, diff, pct: diffPct(ne, diff), isReconciled: Math.abs(diff) < TOLERANCE };
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
      const results = (current?.accounts || [])
        .filter((a) => reconData[a.id]?.statementBalance !== undefined)
        .map((a) => {
          const r = calc(a);
          return {
            accountName: a.accountName || a.account_name || 'Account',
            institution: a.institution,
            finalBalance: r.stmt,
            change: r.diff,
          };
        });
      setReconResults(results);
      setScreen('summary');
    };

    // drill-down: positions for the selected account
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

    return (
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setScreen('welcome')} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowValues((s) => !s)}
              className={`p-2 rounded-lg ${showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={onComplete}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700"
            >
              <CheckCheck className="w-5 h-5 inline mr-2" /> Complete Reconciliation
            </button>
          </div>
        </div>

        {/* Institution tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {groups.map((g) => (
              <button
                key={g.institution}
                onClick={() => {
                  setSelectedInstitution(g.institution);
                  setSelectedAccount(null);
                }}
                className={`px-6 py-3 text-sm font-medium ${
                  selectedInstitution === g.institution
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4" />
                  <span>{g.institution}</span>
                  {g.needs > 0 && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                      {g.needs}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Account list */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Select Account</h4>
            {(current?.accounts || []).map((a) => {
              const sel = selectedAccount?.id === a.id;
              const r = calc(a);
              const status = r.isReconciled ? 'reconciled' : Math.abs(r.diff) >= TOLERANCE ? 'warning' : 'pending';
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAccount(a)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    sel
                      ? 'border-blue-500 bg-blue-50'
                      : r.isReconciled
                      ? 'border-green-200 bg-green-50 hover:border-green-300'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{a.accountName || a.account_name || 'Account'}</div>
                      <div className="text-xs text-gray-500">{a.accountType || a.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{fmtCurrency(a.totalValue || 0, !showValues)}</div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <StatusIndicator status={status} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reconcile & drill-down panel */}
          <div>
            {selectedAccount ? (
              <div className="p-6 border-2 border-gray-200 rounded-xl bg-white sticky top-6">
                <h4 className="font-semibold text-gray-900 mb-4">Reconcile Account</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">NestEgg Balance</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {fmtCurrency(selectedAccount.totalValue || 0, !showValues)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Statement Balance</div>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                        <input
                          type="text"
                          value={reconData[selectedAccount.id]?.statementBalance ?? ''}
                          onChange={(e) => handleStatementChange(selectedAccount.id, e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 text-2xl font-bold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* match status */}
                  {reconData[selectedAccount.id]?.statementBalance !== undefined && (
                    <div
                      className={`${
                        calc(selectedAccount).isReconciled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                      } border rounded-lg p-3`}
                    >
                      <div className="flex items-center">
                        {calc(selectedAccount).isReconciled ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <div>
                              <div className="font-medium text-green-900">Balances Match</div>
                              <div className="text-sm text-green-700">Ready to mark as reconciled</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                            <div>
                              <div className="font-medium text-amber-900">Balances Don’t Match</div>
                              <div className="text-sm text-amber-700">
                                Diff: {fmtCurrency(Math.abs(calc(selectedAccount).diff), !showValues)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* drill-down: position detail by account */}
                  <div className="mt-2">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Positions in this account</div>
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

                  <div className="flex gap-3">
                    <button onClick={() => quickReconcile(selectedAccount)} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 inline mr-2" /> Quick Reconcile
                    </button>
                    <button onClick={() => setSelectedAccount(null)} className="px-4 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-500">
                Select an account to begin
              </div>
            )}
          </div>
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
              <button onClick={onClose} className="px-5 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-gray-100">
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  setReconResults([]);
                  setScreen('welcome');
                }}
                className="px-5 py-2.5 bg-blue-700 rounded-lg hover:bg-blue-800"
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
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md px-5 py-4 rounded-xl shadow-2xl text-white flex items-center justify-between ${
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
