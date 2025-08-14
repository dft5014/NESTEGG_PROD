// QuickReconciliationModal.js
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Check, CheckCircle, CheckSquare, CheckCheck, AlertCircle, AlertTriangle, Info, Clock, Loader2,
  ChevronRight, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight, Eye, EyeOff,
  Building2 as Landmark, DollarSign, CreditCard, Wallet, PiggyBank, Receipt, Sparkles, Target, Trophy,
  FileText, FileCheck, RefreshCw, Droplets, LineChart, Bell, Share2, Copy, Download, Percent
} from 'lucide-react';

// ====== External app hooks / API (same as QuickEditDelete.js patterns) ======
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { updateCashPosition, updateLiability, updateOtherAsset } from '@/utils/apimethods/positionMethods';
import { popularBrokerages } from "@/utils/constants";

// =============== Utilities (inlined; avoids extra imports) ===================
const fmtCurrency = (val, hide = false) =>
  hide ? "••••••" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(val || 0));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const toNumber = (s) => {
  const n = Number(String(s ?? '').replace(/[^\d.-]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
const diffPct = (base, delta) => base !== 0 ? (delta / base) * 100 : 0;

const NS = 'nestegg:v1:recon'; // localStorage namespace keys
const LS_DATA = `${NS}:data`;
const LS_HISTORY = `${NS}:history`;
const LS_DRAFT_PREFIX = `${NS}:draft:`;

// Tailwind-safe palette (no dynamic class strings)
const tone = {
  blue:   { bg100: 'bg-blue-100',  text600: 'text-blue-600'  },
  green:  { bg100: 'bg-green-100', text600: 'text-green-600' },
  purple: { bg100: 'bg-purple-100',text600: 'text-purple-600'},
  yellow: { bg100: 'bg-yellow-100',text600: 'text-yellow-600'},
  red:    { bg100: 'bg-red-100',   text600: 'text-red-600'   },
  gray:   { bg100: 'bg-gray-100',  text600: 'text-gray-600'  },
};

// SVG gradient stops (no Tailwind in <stop>)
const GRADIENTS = {
  blue:   ['#60A5FA', '#2563EB'],
  green:  ['#34D399', '#059669'],
  purple: ['#A78BFA', '#7C3AED'],
  yellow: ['#FBBF24', '#D97706'],
  red:    ['#F87171', '#DC2626'],
  gray:   ['#D1D5DB', '#6B7280'],
};

const getInstitutionLogo = (name) => {
  if (!name) return null;
  const hit = popularBrokerages.find(
    b => b.name.toLowerCase() === String(name).toLowerCase()
  );
  return hit?.logo || null;
};
// ==================== Inline UI helpers (no imports) =========================

const calcRow = (pos, updated) => {
  const rawNestEgg = Number(pos.current_value ?? pos.currentValue ?? 0);
  const rawStatement = updated[pos.id] !== undefined ? Number(updated[pos.id]) : rawNestEgg;
  const diff = rawStatement - rawNestEgg;
  const pct = rawNestEgg !== 0 ? (diff / rawNestEgg) * 100 : 0;
  return { rawNestEgg, rawStatement, diff, pct };
};

// Modal shell (no external component)
function ModalShell({ isOpen, onClose, children, showHeader = false, title = '' }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-[10000] mx-auto my-8 w-full max-w-6xl">
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

// Progress ring with hex gradient
function ProgressRing({ percentage, size = 72, strokeWidth = 6, color = 'blue' }) {
  const radius = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * radius;
  const offset = C - (clamp(percentage, 0, 100) / 100) * C;
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
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}/>
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={`url(#${gid})`} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={C} strokeDashoffset={anim}
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
      id: i, x: Math.random()*100, y: -10,
      vx: (Math.random()-0.5)*3, vy: Math.random()*5+3,
      color: colors[Math.floor(Math.random()*colors.length)],
      size: Math.random()*8+4, rotation: Math.random()*360,
      rotationSpeed: (Math.random()-0.5)*8, shape: shapes[Math.floor(Math.random()*shapes.length)]
    }));
    setParticles(ps);
    const timer = setTimeout(() => setParticles([]), 4200);
    return () => clearTimeout(timer);
  }, [show]);
  if (!show || particles.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[10001]">
      {particles.map(p => (
        <div key={p.id} className="absolute" style={{
          left: `${p.x}%`, top: `${p.y}%`,
          animation: 'confetti-fall 4.2s ease-out forwards',
          '--vx': p.vx, '--vy': p.vy, '--rs': p.rotationSpeed
        }}>
          <div className={p.shape === 'circle' ? 'rounded-full' : 'rounded-sm'} style={{
            width: `${p.size}px`, height: `${p.size}px`, backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`, animation: 'confetti-spin 4.2s linear infinite'
          }} />
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
    warning:    { cls: 'text-yellow-600', Icon: AlertTriangle, label: 'Needs Review' },
    error:      { cls: 'text-red-600',    Icon: AlertCircle, label: 'Out of Sync' },
    pending:    { cls: 'text-gray-600',   Icon: Clock,        label: 'Not Reconciled' },
  };
  const { cls, Icon, label } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`} title={label}>
      <Icon className="w-4 h-4" /><span className="text-xs">{label}</span>
    </span>
  );
}

// ===================== Main Modal ============================================
const TOLERANCE = 0.01; // treat as reconciled within 1 cent

export default function QuickReconciliationModal({ isOpen, onClose }) {
  // Hooks / data
  const { actions } = useDataStore();
  const {
    accounts = [], loading: accountsLoading, refresh: refreshAccounts
  } = useAccounts();
  const {
    positions: rawPositions = [], loading: positionsLoading, refresh: refreshPositions
  } = useDetailedPositions();

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


  const handleBulkSave = async (changes, institution) => {
    try {
      setLocalLoading(true);
      // Map UI changes -> API batch
      const batch = changes.map(c => {
        const kind =
          c.kind ||
          (['cash','checking','savings'].includes(c.meta?.type) ? 'cash' :
          (['liability','credit_card','loan'].includes(c.meta?.type) ? 'liability' : 'other'));
        return {
          itemId: c.id ?? c.meta?.itemId ?? c.meta?.id,
          kind,
          value: Number(c.amount)
        };
      }).filter(b => Number.isFinite(b.value));

      if (batch.length) await writeAndRefresh(batch);

      // stamp local recon data timestamps
      const nextData = { ...reconData };
      for (const c of changes) {
        const key = c.kind === 'liability' ? `L_${c.id}` : c.id;
        nextData[`pos_${key}`] = { lastUpdated: new Date().toISOString(), value: Number(c.amount) };
      }
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

  // ============== Message helpers =================
  const showMsg = useCallback((type, text, duration = 4000) => {
    setMessage({ type, text });
    if (msgRef.current) clearTimeout(msgRef.current);
    if (duration > 0) {
      msgRef.current = setTimeout(() => setMessage({ type: '', text: '' }), duration);
    }
  }, []);

  // ============== Normalize data ==================
  const accountsById = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach(a => map.set(a.id, a));
    return map;
  }, [accounts]);

  const positionsNorm = useMemo(() => {
    return (rawPositions || []).map(p => {
      const id = p.itemId ?? p.id; // itemId is the one we must update with
      const accountId = p.accountId ?? p.account_id;
      const acct = accountsById.get(accountId);
      const type = String(p.assetType ?? p.asset_type ?? p.position_type ?? '').toLowerCase();
      const name = p.name ?? p.identifier ?? 'Unnamed';
      const currentValue = Number(p.currentValue ?? p.current_value ?? 0);
      const institution = p.institution ?? acct?.institution ?? 'Unknown Institution';
      return { id, itemId: id, accountId, institution, type, name, currentValue };
    });
  }, [rawPositions, accountsById]);

  // Liquid-only set
  useEffect(() => {
    const liquidSet = positionsNorm.filter(p => {
      return ['cash','checking','savings','credit_card','loan','liability'].includes(p.type)
        || /checking|savings|credit|loan/i.test(p.name);
    });
    setLiquidPositions(liquidSet);
  }, [positionsNorm]);

  // ============== LocalStorage: recon data + history ==============
  const loadReconData = useCallback(() => {
    try {
      const saved = localStorage.getItem(LS_DATA);
      if (saved) setReconData(JSON.parse(saved));
    } catch {}
  }, []);
  const saveReconData = useCallback((data) => {
    setReconData(data);
    try { localStorage.setItem(LS_DATA, JSON.stringify(data)); } catch {}
  }, []);
  const saveHistory = useCallback(() => {
    try {
      const now = new Date().toISOString();
      const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      if (!history.some(d => new Date(d).toDateString() === new Date(now).toDateString())) {
        history.unshift(now);
        if (history.length > 60) history.pop();
        localStorage.setItem(LS_HISTORY, JSON.stringify(history));
      }
    } catch {}
  }, []);
  const refreshStreak = useCallback(() => {
    try {
      const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
      let s = 0;
      const today = new Date().toDateString();
      if (history.length > 0 && new Date(history[0]).toDateString() === today) {
        s = 1;
        for (let i = 1; i < history.length; i++) {
          const d0 = new Date(history[i-1]);
          const d1 = new Date(history[i]);
          const dd = Math.round((d0 - d1) / (1000*60*60*24));
          if (dd === 1) s++; else break;
        }
      }
      setStreak(s);
    } catch { setStreak(0); }
  }, []);

  // ============== Open/close lifecycle ===========================
  useEffect(() => {
    if (!isOpen) return;
    setScreen('welcome');
    setPendingUpdates({});
    setReconResults([]);
    setConfetti(false);
    loadReconData();
    refreshStreak();
    // Optionally refresh data if hooks are empty
    (async () => {
      if (!accounts?.length || !rawPositions?.length) {
        try {
          setLocalLoading(true);
          await Promise.all([ refreshAccounts?.(), refreshPositions?.() ]);
        } finally { setLocalLoading(false); }
      }
    })();
    return () => { if (msgRef.current) clearTimeout(msgRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ============== Stats / health =================================
  const stats = useMemo(() => {
    const total = accounts.length;
    const reconStatus = a => {
      const rec = reconData[a.id]?.lastReconciled;
      if (!rec) return 'pending';
      const days = Math.floor((Date.now() - new Date(rec).getTime()) / (1000*60*60*24));
      if (days <= 7) return 'reconciled';
      if (days <= 30) return 'warning';
      return 'error';
    };
    const reconciled = accounts.filter(a => reconStatus(a) === 'reconciled');
    const needsRecon = accounts.filter(a => reconStatus(a) !== 'reconciled');
    const totalValue = accounts.reduce((s, a) => s + Number(a.totalValue || 0), 0);
    const reconciledValue = reconciled.reduce((s, a) => s + Number(a.totalValue || 0), 0);

    // liquid needing update = stale > 1 day by our saved per-position timestamps
    const liquidNeeding = liquidPositions.filter(p => {
      const k = `pos_${p.id}`;
      const last = reconData[k]?.lastUpdated;
      const days = last ? Math.floor((Date.now() - new Date(last).getTime())/(1000*60*60*24)) : 999;
      return days > 1;
    }).length;

    return {
      total,
      reconciled: reconciled.length,
      needsReconciliation: needsRecon.length,
      liquidPositions: liquidNeeding,
      percentage: total ? (reconciled.length / total) * 100 : 0,
      totalValue, reconciledValue,
      valuePercentage: totalValue ? (reconciledValue / totalValue) * 100 : 0
    };
  }, [accounts, reconData, liquidPositions]);

  const healthScore = useMemo(() => {
    const weights = { accountsReconciled: 0.6, liquidUpdated: 0.3, recency: 0.1 };
    const accountScore = stats.percentage;
    const liquidScore = liquidPositions.length ? ((liquidPositions.length - stats.liquidPositions) / liquidPositions.length) * 100 : 100;
    const lastFull = Object.values(reconData).map(d => d.lastReconciled).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0];
    const daysSinceFull = lastFull ? Math.floor((Date.now()-new Date(lastFull).getTime())/(1000*60*60*24)) : 30;
    const recencyScore = clamp(100 - daysSinceFull*14, 0, 100);
    return Math.round(accountScore*weights.accountsReconciled + liquidScore*weights.liquidUpdated + recencyScore*weights.recency);
  }, [stats, liquidPositions, reconData]);

  const lastReconText = useMemo(() => {
    const dates = Object.values(reconData).map(d => d.lastReconciled).filter(Boolean).map(d=>new Date(d));
    if (!dates.length) return 'Never';
    const mostRecent = new Date(Math.max(...dates));
    const days = Math.floor((Date.now() - mostRecent)/(1000*60*60*24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days/7)} weeks ago`;
    return `${Math.floor(days/30)} months ago`;
  }, [reconData]);

  // ============== Write engine ====================================
  async function writeAndRefresh(batch) {
    // batch: [{ itemId, kind: 'cash'|'liability'|'other', value:number }]
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

  // ============== Screens =========================================

  // ---- Welcome
  function WelcomeScreen() {
    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back 👋</h1>
          <p className="text-gray-600">Let’s keep NestEgg accurate and tight.</p>
          {streak > 0 && (
            <div className="inline-flex items-center px-4 py-2 rounded-full border border-amber-200 bg-amber-50">
              <Sparkles className="w-4 h-4 text-amber-600 mr-2" /> {streak}-day reconciliation streak
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="inline-block relative mb-2">
              <ProgressRing percentage={healthScore} size={96} strokeWidth={8} color={healthScore>=75?'green':healthScore>=50?'yellow':'red'} />
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
            <div className="mt-2 text-xs text-gray-500">{fmtCurrency(stats.reconciledValue)} of {fmtCurrency(stats.totalValue)}</div>
          </div>
        </div>

        {/* Paths */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={()=>setScreen('liquid')} className="group text-left p-6 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.blue.bg100}`}><Droplets className={tone.blue.text600} /></div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Quick Cash Update</div>
                <div className="text-sm text-gray-600">Update checking, savings, and cards fast</div>
                <div className="mt-2 text-xs text-gray-500">{stats.liquidPositions === 0 ? '✅ All up to date' : `${stats.liquidPositions} need updates`}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button onClick={()=>setScreen('reconcile')} className="group text-left p-6 bg-white rounded-xl border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-lg">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.green.bg100}`}><CheckSquare className={tone.green.text600} /></div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Investment Check-In</div>
                <div className="text-sm text-gray-600">Verify accounts match statements</div>
                <div className="mt-2 text-xs text-gray-500">{stats.needsReconciliation === 0 ? '✅ Nothing pending' : `${stats.needsReconciliation} accounts to review`}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button onClick={() => { setScreen('liquid'); setPendingUpdates({ next: 'reconcile' }); }} className="group text-left p-6 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${tone.purple.bg100}`}><Target className={tone.purple.text600} /></div>
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

  // ---- Liquid workflow
  function LiquidScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [updated, setUpdated] = useState({}); // { [posId]: number }
    const [reviewed, setReviewed] = useState(new Set());
    const draftKey = `${LS_DRAFT_PREFIX}${selectedInstitution || 'all'}`;

    // Group by institution
    const groups = useMemo(() => {
      const map = new Map();
      liquidPositions.forEach(p => {
        const key = p.institution || 'Unknown Institution';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ ...p, hasUpdate: updated[p.id] !== undefined });
      });
      return Array.from(map.entries()).map(([institution, positions]) => ({
        institution,
        positions,
        totalValue: positions.reduce((s,x)=>s+Math.abs(x.currentValue||0),0),
        updatedCount: positions.filter(x=>updated[x.id] !== undefined).length
      })).sort((a,b)=>b.totalValue - a.totalValue);
    }, [liquidPositions, updated]);

    // Auto-select first institution
    useEffect(() => {
      if (!groups.length) return;
      if (!selectedInstitution) setSelectedInstitution(groups[0].institution);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groups.length]);

    const current = groups.find(g => g.institution === selectedInstitution);
    const positions = current?.positions || [];
    const [idx, setIdx] = useState(0);
    useEffect(() => { setIdx(0); }, [selectedInstitution]);

    // Draft autosave/restore
    useEffect(() => {
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const obj = JSON.parse(saved);
          setUpdated(prev => ({ ...prev, ...obj }));
        }
      } catch {}
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey]);
    useEffect(() => {
      const t = setTimeout(() => {
        try { localStorage.setItem(draftKey, JSON.stringify(updated)); } catch {}
      }, 750);
      return () => clearTimeout(t);
    }, [updated, draftKey]);

    // Bulk paste handler (paste column values)
    const wrapPaste = (e) => {
      if (!positions.length) return;
      const txt = e.clipboardData.getData('text');
      if (!txt) return;
      const lines = txt.split(/\r?\n/).map(toNumber).filter(v => v !== null);
      if (!lines.length) return;
      setUpdated(prev => {
        const next = { ...prev };
        positions.forEach((p, i) => {
          if (lines[i] !== undefined && lines[i] !== null) next[p.id] = lines[i];
        });
        return next;
      });
      e.preventDefault();
    };

    const currentPos = positions[idx];
    const totalProgress = liquidPositions.length ? (Object.keys(updated).length / liquidPositions.length) * 100 : 0;
    const instProgress = positions.length ? (positions.filter(p=>updated[p.id] !== undefined).length / positions.length) * 100 : 0;

    const onChange = (posId, val) => setUpdated(prev => ({ ...prev, [posId]: toNumber(val) }));
    const onNext = () => {
      setReviewed(r => new Set([...r, currentPos?.id]));
      if (idx < positions.length - 1) setIdx(idx+1);
      else {
        // move to next institution
        const next = groups.find(g => g.institution !== selectedInstitution && !g.positions.every(p => reviewed.has(p.id) || updated[p.id] !== undefined));
        if (next) { setSelectedInstitution(next.institution); setIdx(0); }
        else {
          // done liquid step
          onComplete();
        }
      }
    };
    const onPrev = () => { if (idx > 0) setIdx(idx-1); };

    const onComplete = async () => {
      try {
        setLocalLoading(true);
        // Build batch from updated map
        const batch = Object.entries(updated).map(([posId, value]) => {
          const p = liquidPositions.find(x => String(x.id) === String(posId));
          if (!p) return null;
          const kind = ['cash','checking','savings'].includes(p.type) ? 'cash'
            : (p.type === 'liability' || p.type === 'credit_card' || p.type === 'loan') ? 'liability' : 'other';
          return { itemId: p.itemId, kind, value: Number(value) };
        }).filter(Boolean);

        if (batch.length) await writeAndRefresh(batch);

        // update local recon data for positions timestamps
        const nextData = { ...reconData };
        Object.keys(updated).forEach(id => {
          nextData[`pos_${id}`] = { lastUpdated: new Date().toISOString(), value: Number(updated[id]) };
        });
        saveReconData(nextData);
        saveHistory();

        setConfetti(true);
        setTimeout(() => {
          setConfetti(false);
          if (pendingUpdates.next === 'reconcile') {
            setPendingUpdates({});
            setScreen('reconcile');
          } else {
            setScreen('welcome');
          }
        }, 1500);
      } catch (e) {
        console.error(e);
        showMsg('error', 'Failed to update positions');
      } finally {
        setLocalLoading(false);
      }
    };

    const onSelectInstitution = (inst) => {
      setSelectedInstitution(inst);
      const group = groups.find(g => g.institution === inst);
      // jump to first not-updated
      const i = group.positions.findIndex(p => updated[p.id] === undefined);
      setIdx(i >= 0 ? i : 0);
    };

    // Compute differences for current card
    const curVal = currentPos ? Number(currentPos.currentValue || 0) : 0;
    const newVal = updated[currentPos?.id] ?? curVal;
    const delta = newVal - curVal;

    return (
      <div className="p-8" onPaste={wrapPaste}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={()=>setScreen('welcome')} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Overall Progress</div>
              <div className="text-lg font-semibold text-gray-900">
                {Object.keys(updated).length} / {liquidPositions.length}
              </div>
            </div>
            <ProgressRing percentage={totalProgress} size={64} color="blue" />
            <button
              onClick={()=>setShowValues(s=>!s)}
              className={`p-2 rounded-lg ${showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={async ()=>{
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

        {/* DELETE Institution selector */}
        <div className="flex flex-wrap gap-3 mb-6">
          {groups.map(g => {
            const isSel = g.institution === selectedInstitution;
            const done = g.positions.every(p => updated[p.id] !== undefined || reviewed.has(p.id));
            return (
              <button key={g.institution} onClick={()=>onSelectInstitution(g.institution)}
                className={`relative px-6 py-4 rounded-xl border-2 transition-all ${isSel ? 'border-blue-500 bg-blue-50' : done ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                {done && <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1"><Check className="w-4 h-4"/></div>}
                <div className="flex items-center gap-2">
                  {(() => {
                            const inst = popularBrokerages.find(
                              b => b.name.toLowerCase() === g.institution?.toLowerCase()
                            );
                            return inst && inst.logo ? (
                              <img
                                src={inst.logo}
                                alt={g.institution}
                                className="w-6 h-6 rounded-full object-contain"
                              />
                            ) : (
                              <Landmark className={`${isSel ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`} />
                            );
                          })()}
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{g.institution}</div>
                    <div className="text-xs text-gray-500">{g.positions.length} positions</div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-900 font-semibold">{fmtCurrency(g.totalValue, !showValues)}</div>
                <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`${isSel ? 'bg-blue-500' : 'bg-green-500'} h-full`} style={{ width: `${instProgress && g.institution===selectedInstitution ? instProgress : (g.updatedCount / g.positions.length)*100}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Institution selector + inline reconciliation panel */}
        <div className="flex flex-col gap-4 mb-6">
          {groups.map(g => {
            const isSel = g.institution === selectedInstitution;
            const logo = getInstitutionLogo(g.institution);
            const done = g.positions.length > 0 && g.positions.every(p => updated[p.id] !== undefined || reviewed.has(p.id));

            // compute a per-institution progress if you like; else keep your existing instProgress
            const localProgress = g.positions.length
              ? (g.positions.filter(p => updated[p.id] !== undefined || reviewed.has(p.id)).length / g.positions.length) * 100
              : 0;

            return (
              <div key={g.institution} className="rounded-2xl border-2 bg-white">
                {/* Chip / Header */}
                <button
                  onClick={() => onSelectInstitution(g.institution)}
                  className={`w-full text-left px-6 py-4 flex items-center justify-between rounded-2xl transition-all
                    ${isSel ? 'border-blue-500 bg-blue-50' : done ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                  style={{ borderColor: isSel ? '#3b82f6' : done ? '#22c55e' : '#e5e7eb' }}
                >
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <img src={logo} alt={g.institution} className="w-7 h-7 rounded-full object-contain" />
                    ) : (
                      <Landmark className={`${isSel ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'} w-7 h-7`} />
                    )}
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{g.institution}</div>
                      <div className="text-xs text-gray-500">
                        {g.positions.length} position{g.positions.length !== 1 ? 's' : ''}{g.liabilities?.length ? ` • ${g.liabilities.length} liab.` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[220px] text-right">
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="text-sm font-semibold text-gray-900">{fmtCurrency(g.totalValue, !showValues)}</div>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`${isSel ? 'bg-blue-500' : done ? 'bg-green-500' : 'bg-gray-400'} h-full transition-all`}
                        style={{ width: `${instProgress && g.institution === selectedInstitution ? instProgress : localProgress}%` }}
                      />
                    </div>
                  </div>
                </button>

                {/* INLINE RECONCILIATION TABLE (only when selected) */}
                {isSel && (
                  <div className="px-6 pb-6 pt-2">
                    {/* CASH / ACCOUNTS TABLE */}
                    {g.positions.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-gray-200 mb-4">
                        <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-800">Accounts & Cash</div>
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr className="text-xs uppercase text-gray-500">
                              <th className="px-4 py-2 text-left">Account</th>
                              <th className="px-4 py-2 text-right">NestEgg</th>
                              <th className="px-4 py-2 text-center">Statement</th>
                              <th className="px-4 py-2 text-right">Δ</th>
                              <th className="px-4 py-2 text-right">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {g.positions.map(pos => {
                              const { rawNestEgg, rawStatement, diff, pct } = calcRow(pos, updated);
                              const changed = updated[pos.id] !== undefined && Number(updated[pos.id]) !== rawNestEgg;
                              return (
                                <tr key={pos.id} className={changed ? "bg-blue-50" : ""}>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{pos.name || pos.accountName || "Account"}</div>
                                    <div className="text-xs text-gray-500">{pos.accountName || pos.account_name || ""}</div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-800">{fmtCurrency(rawNestEgg, !showValues)}</td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      className={`w-36 text-right px-3 py-1.5 rounded-md border ${
                                        changed ? 'border-blue-400 ring-2 ring-blue-200 bg-white' : 'border-gray-300'
                                      }`}
                                      value={updated[pos.id] !== undefined ? updated[pos.id] : rawNestEgg}
                                      onChange={(e) =>
                                                setUpdated(prev => ({ ...prev, [pos.id]: toNumber(e.target.value) }))
                                              }
                                    />
                                  </td>
                                  <td className={`px-4 py-3 text-right font-semibold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    {fmtCurrency(diff, !showValues)}
                                  </td>
                                  <td className={`px-4 py-3 text-right ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    {rawNestEgg === 0 ? "—" : `${pct.toFixed(2)}%`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* LIABILITIES TABLE (optional; will render if you populate g.liabilities by institution) */}
                    {!!g.liabilities?.length && (
                      <div className="overflow-hidden rounded-xl border border-gray-200">
                        <div className="bg-gray-50 px-4 py-3 font-semibold text-gray-800">Liabilities</div>
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr className="text-xs uppercase text-gray-500">
                              <th className="px-4 py-2 text-left">Name</th>
                              <th className="px-4 py-2 text-right">NestEgg</th>
                              <th className="px-4 py-2 text-center">Statement</th>
                              <th className="px-4 py-2 text-right">Δ</th>
                              <th className="px-4 py-2 text-right">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {g.liabilities.map(liab => {
                              // If your liabilities use different field names, adjust here:
                              const liabId = liab.id;
                              const nest = Number(liab.currentBalance ?? liab.total_current_balance ?? liab.current_balance ?? 0);
                              const stmt = updated[`L_${liabId}`] !== undefined ? Number(updated[`L_${liabId}`]) : nest;
                              const diff = stmt - nest;
                              const pct = nest !== 0 ? (diff / nest) * 100 : 0;
                              const changed = updated[`L_${liabId}`] !== undefined && Number(updated[`L_${liabId}`]) !== nest;
                              return (
                                <tr key={liabId} className={changed ? "bg-blue-50" : ""}>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{liab.name}</div>
                                    <div className="text-xs text-gray-500">{liab.liabilityType || liab.liability_type}</div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-800">{fmtCurrency(nest, !showValues)}</td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      className={`w-36 text-right px-3 py-1.5 rounded-md border ${
                                        changed ? 'border-blue-400 ring-2 ring-blue-200 bg-white' : 'border-gray-300'
                                      }`}
                                      value={updated[`L_${liabId}`] !== undefined ? updated[`L_${liabId}`] : nest}
                                      onChange={(e) =>
                                                  setUpdated(prev => ({ ...prev, [`L_${liabId}`]: toNumber(e.target.value) }))
                                                }
                                    />
                                  </td>
                                  <td className={`px-4 py-3 text-right font-semibold ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {/* for liabilities, a positive diff is “worse” so we flip colors above */}
                                    {fmtCurrency(diff, !showValues)}
                                  </td>
                                  <td className={`px-4 py-3 text-right ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                    {nest === 0 ? "—" : `${pct.toFixed(2)}%`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Update CTA */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => {
                          // collect only changed rows for this institution
                          const changes = [];
                          g.positions.forEach(pos => {
                            const curr = Number(pos.current_value ?? pos.currentValue ?? 0);
                            const next = updated[pos.id] !== undefined ? Number(updated[pos.id]) : curr;
                            if (!Number.isNaN(next) && next !== curr) {
                              changes.push({ kind: "cash", id: pos.itemId ?? pos.id, amount: next, meta: pos });
                            }
                          });
                          (g.liabilities || []).forEach(liab => {
                            const id = liab.id;
                            const curr = Number(liab.currentBalance ?? liab.total_current_balance ?? liab.current_balance ?? 0);
                            const next = updated[`L_${id}`] !== undefined ? Number(updated[`L_${id}`]) : curr;
                            if (!Number.isNaN(next) && next !== curr) {
                              changes.push({ kind: "liability", id, amount: next, meta: liab });
                            }
                          });

                          if (changes.length === 0) return;

                          // Delegate to your existing bulk update handler
                          // e.g., handleBulkSave(changes)
                          handleBulkSave
                            ? handleBulkSave(changes, g.institution)
                            : console.warn("Provide handleBulkSave(changes, institution) to persist updates.");
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
                      >
                        Update {g.institution}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>


        {/* DELETE Current position card */}
        {currentPos ? (
          <div className="max-w-2xl mx-auto">
            <div className={`rounded-xl border-2 bg-white ${delta!==0 ? 'border-amber-300' : 'border-gray-200'} p-6`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500">{currentPos.institution}</div>
                  <div className="text-xl font-semibold text-gray-900">{currentPos.name}</div>
                </div>
                <div className="text-right">
                  {delta !== 0 && (
                    <div className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${delta>0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {delta>0?'+':''}{fmtCurrency(delta)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-600">Current NestEgg</div>
                  <div className="text-xl font-bold text-gray-900">{fmtCurrency(currentPos.currentValue, !showValues)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Statement / New Value</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{(currentPos.type==='liability'||currentPos.type==='credit_card'||currentPos.type==='loan')?'-$':'$'}</span>
                    <input
                      type="text"
                      value={updated[currentPos.id] ?? currentPos.currentValue}
                      onChange={(e)=>onChange(currentPos.id, e.target.value)}
                      onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); onNext(); } if(e.key==='ArrowLeft'){ onPrev(); } if(e.key==='ArrowRight'){ onNext(); } }}
                      className="w-full pl-8 pr-4 py-3 text-xl font-bold rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              {delta !== 0 && (
                <div className={`mt-4 p-3 rounded-lg border ${delta>0?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Difference</span>
                    <span className={`font-bold ${delta>0?'text-green-700':'text-red-700'}`}>{delta>0?'+':''}{fmtCurrency(delta, !showValues)} ({diffPct(currentPos.currentValue, delta).toFixed(1)}%)</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <button onClick={onPrev} disabled={idx===0} className={`px-4 py-2 rounded-lg border ${idx===0?'text-gray-400 border-gray-200':'text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Previous
                </button>
                <button onClick={()=>setIdx(Math.min(idx+1, positions.length-1))} className="text-sm text-gray-500 hover:text-gray-700">Skip</button>
                <button onClick={onNext} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 shadow">
                  {idx === positions.length-1 ? 'Complete Institution' : 'Next'} <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>

              <div className="mt-4 flex justify-center gap-2">
                {positions.map((p,i)=>(
                  <div key={p.id} className={`h-2 rounded-full ${i===idx?'w-8 bg-blue-600': (updated[p.id]!==undefined?'w-2 bg-green-500':'w-2 bg-gray-300')}`} />
                ))}
              </div>
            </div>

            {/* Update summary */}
            {Object.keys(updated).length>0 && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center"><FileCheck className="w-5 h-5 mr-2 text-blue-600" />Pending Updates</h4>
                  <span className="text-2xl font-bold text-blue-600">{Object.keys(updated).length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const entries = Object.entries(updated);
                    let inc=0, dec=0, net=0;
                    for (const [id, nv] of entries) {
                      const p = liquidPositions.find(x => String(x.id)===String(id));
                      if (!p) continue;
                      const d = Number(nv) - Number(p.currentValue || 0);
                      net += d; if (d>0) inc+=d; else dec += Math.abs(d);
                    }
                    return (
                      <>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <ArrowUpRight className="w-6 h-6 text-green-600 mx-auto mb-2" />
                          <div className="text-sm text-gray-600">Total Increase</div>
                          <div className="text-xl font-bold text-green-600">+{fmtCurrency(inc, !showValues)}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <ArrowDownRight className="w-6 h-6 text-red-600 mx-auto mb-2" />
                          <div className="text-sm text-gray-600">Total Decrease</div>
                          <div className="text-xl font-bold text-red-600">-{fmtCurrency(dec, !showValues)}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <Percent className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                          <div className="text-sm text-gray-600">Net Change</div>
                          <div className={`text-xl font-bold ${net>=0?'text-green-600':'text-red-600'}`}>{net>=0?'+':''}{fmtCurrency(net, !showValues)}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={()=>setScreen('welcome')} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                  <button onClick={onComplete} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
                    Apply {Object.keys(updated).length} Update{Object.keys(updated).length>1?'s':''}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500">No liquid positions were found.</div>
        )}
      </div>
    );
  }

  // ---- Account reconciliation
  function ReconcileScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // group accounts by institution
    const groups = useMemo(() => {
      const map = new Map();
      accounts.forEach(a => {
        const inst = a.institution || 'Unknown Institution';
        if (!map.has(inst)) map.set(inst, []);
        map.get(inst).push(a);
      });
      return Array.from(map.entries()).map(([institution, list]) => ({
        institution,
        accounts: list,
        totalValue: list.reduce((s,a)=>s+Number(a.totalValue||0),0),
        needs: list.filter(a => {
          const r = reconData[a.id]?.lastReconciled;
          if (!r) return true;
          const days = Math.floor((Date.now() - new Date(r).getTime())/(1000*60*60*24));
          return !(days <= 7);
        }).length
      })).sort((a,b)=>b.totalValue - a.totalValue);
    }, [accounts, reconData]);

    useEffect(() => { if (groups.length && !selectedInstitution) setSelectedInstitution(groups[0].institution); }, [groups, selectedInstitution]);

    const current = groups.find(g => g.institution === selectedInstitution);

    const handleStatementChange = (accId, val) => {
      const v = toNumber(val);
      const next = { ...reconData, [accId]: { ...(reconData[accId]||{}), statementBalance: v, timestamp: new Date().toISOString() } };
      saveReconData(next);
    };

    const calc = (a) => {
      const ne = Number(a.totalValue || 0);
      const st = Number(reconData[a.id]?.statementBalance ?? 0);
      const diff = st - ne;
      return {
        nest: ne, stmt: st, diff, pct: diffPct(ne, diff),
        isReconciled: Math.abs(diff) < TOLERANCE
      };
    };

    const quickReconcile = (a) => {
      const ne = Number(a.totalValue || 0);
      const next = { ...reconData, [a.id]: { ...(reconData[a.id]||{}), statementBalance: ne, lastReconciled: new Date().toISOString() } };
      saveReconData(next);
      showMsg('success', 'Account marked reconciled');
    };

    const onComplete = async () => {
      // For now, reconciliation "sign off" is local only per requirements.
      saveHistory();
      setReconResults((current?.accounts || []).filter(a => reconData[a.id]?.statementBalance !== undefined).map(a => {
        const r = calc(a);
        return { accountName: a.accountName || a.account_name || 'Account', institution: a.institution, finalBalance: r.stmt, change: r.diff };
      }));
      setScreen('summary');
    };

    return (
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={()=>setScreen('welcome')} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div className="flex items-center gap-4">
            <button onClick={()=>setShowValues(s=>!s)} className={`p-2 rounded-lg ${showValues ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button onClick={onComplete} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700">
              <CheckCheck className="w-5 h-5 inline mr-2" /> Complete Reconciliation
            </button>
          </div>
        </div>

        {/* Institution tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <div className="flex items-center gap-2">
              {(() => {
                const logo = getInstitutionLogo(g.institution);
                return logo ? (
                  <img
                    src={logo}
                    alt={`${g.institution} logo`}
                    className="w-4 h-4 object-contain rounded-full"
                  />
                ) : (
                  <Landmark className="w-4 h-4" />
                );
              })()}
              <span>{g.institution}</span>
              {g.needs > 0 && (
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  {g.needs}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Account list */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Select Account</h4>
            {(current?.accounts || []).map(a => {
              const sel = selectedAccount?.id === a.id;
              const r = calc(a);
              const status = r.isReconciled ? 'reconciled' : (Math.abs(r.diff) >= TOLERANCE ? 'warning' : 'pending');
              return (
                <button key={a.id} onClick={()=>setSelectedAccount(a)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${sel ? 'border-blue-500 bg-blue-50' : r.isReconciled ? 'border-green-200 bg-green-50 hover:border-green-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{a.accountName || a.account_name || 'Account'}</div>
                      <div className="text-xs text-gray-500">{a.accountType || a.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{fmtCurrency(a.totalValue || 0, !showValues)}</div>
                      <div className="text-xs text-gray-500">{/* positions count if available */}</div>
                    </div>
                  </div>
                  <div className="mt-2"><StatusIndicator status={status} /></div>
                </button>
              );
            })}
          </div>

          {/* Reconcile panel */}
          <div>
            {selectedAccount ? (
              <div className="p-6 border-2 border-gray-200 rounded-xl bg-white sticky top-6">
                <h4 className="font-semibold text-gray-900 mb-4">Reconcile Account</h4>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">NestEgg Balance</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{fmtCurrency(selectedAccount.totalValue || 0, !showValues)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Statement Balance</div>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                      <input
                        type="text"
                        value={reconData[selectedAccount.id]?.statementBalance ?? ''}
                        onChange={(e)=>handleStatementChange(selectedAccount.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 text-2xl font-bold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                      />
                    </div>
                  </div>
                  {reconData[selectedAccount.id]?.statementBalance !== undefined && (
                    <div className={`${calc(selectedAccount).isReconciled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-3`}>
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
                              <div className="text-sm text-amber-700">Diff: {fmtCurrency(Math.abs(calc(selectedAccount).diff), !showValues)}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={()=>quickReconcile(selectedAccount)} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 inline mr-2" /> Quick Reconcile
                    </button>
                    <button onClick={()=>setSelectedAccount(null)} className="px-4 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-500">Select an account to begin</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Summary
  function SummaryScreen() {
    const stats = {
      accountsReconciled: reconResults.length,
      liquidPositionsUpdated: 0, // we don’t track count across steps here; could pass via state if needed
      totalValueReconciled: reconResults.reduce((s,r)=>s+Number(r.finalBalance||0),0),
      accuracy: healthScore
    };
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        <Confetti show={true} />
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
              <div className="flex items-center justify-between mb-3"><CheckCircle className="w-7 h-7 text-green-600"/><span className="text-3xl font-bold">{stats.accountsReconciled}</span></div>
              <div className="text-gray-700 font-semibold">Accounts Reconciled</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
              <div className="flex items-center justify-between mb-3"><Droplets className="w-7 h-7 text-blue-600"/><span className="text-3xl font-bold">{stats.liquidPositionsUpdated}</span></div>
              <div className="text-gray-700 font-semibold">Liquid Positions</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
              <div className="flex items-center justify-between mb-3"><DollarSign className="w-7 h-7 text-indigo-600"/><span className="text-2xl font-bold">{fmtCurrency(stats.totalValueReconciled)}</span></div>
              <div className="text-gray-700 font-semibold">Total Value</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
              <div className="flex items-center justify-between mb-3"><Percent className="w-7 h-7 text-purple-600"/><div className="relative"><ProgressRing percentage={healthScore} size={56} color="purple" /><div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-bold">{healthScore}%</span></div></div></div>
              <div className="text-gray-700 font-semibold">Accuracy</div>
            </div>
          </div>

          {reconResults.length>0 && (
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-600"/>Reconciliation Details</h3>
              <div className="space-y-3">
                {reconResults.map((r,i)=>(
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{r.accountName}</div>
                      <div className="text-xs text-gray-500">{r.institution}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{fmtCurrency(r.finalBalance)}</div>
                      {r.change !== 0 && <div className={`text-sm ${r.change>0?'text-green-600':'text-red-600'}`}>{r.change>0?'+':''}{fmtCurrency(r.change)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded"><Clock className="w-6 h-6"/></div>
                <div><div className="font-semibold">Schedule weekly</div><div className="text-sm text-blue-100">Reconciling weekly keeps drift low</div></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded"><LineChart className="w-6 h-6"/></div>
                <div><div className="font-semibold">Track progress</div><div className="text-sm text-blue-100">Watch portfolio health trend</div></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded"><Bell className="w-6 h-6"/></div>
                <div><div className="font-semibold">Set alerts</div><div className="text-sm text-blue-100">Get pinged when data drifts</div></div>
              </div>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={onClose} className="px-5 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-gray-100">Back to Dashboard</button>
              <button onClick={()=>{ setReconResults([]); setScreen('welcome'); }} className="px-5 py-2.5 bg-blue-700 rounded-lg hover:bg-blue-800">Start New Reconciliation</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============== Render ==========================================
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} showHeader={false}>
      {(loading || localLoading) && screen==='welcome' ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your portfolio...</p>
          </div>
        </div>
      ) : (
        <>
          {screen==='welcome'   && <WelcomeScreen />}
          {screen==='liquid'    && <LiquidScreen />}
          {screen==='reconcile' && <ReconcileScreen />}
          {screen==='summary'   && <SummaryScreen />}
        </>
      )}

      {/* Toast */}
      {message.text && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md px-5 py-4 rounded-xl shadow-2xl text-white flex items-center justify-between ${message.type==='error'?'bg-red-600':message.type==='success'?'bg-green-600':'bg-blue-600'}`} role="status" aria-live="polite">
          <div className="flex items-center gap-3">
            {message.type==='error' ? <AlertCircle className="w-5 h-5" /> : message.type==='success' ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={()=>setMessage({type:'',text:''})} className="p-1 hover:bg-white/20 rounded"><X className="w-4 h-4" /></button>
        </div>
      )}

      {confetti && <Confetti show={true} />}
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
        onClick={()=>setOpen(true)}
        onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
        className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all ${className}`}
      >
        <span className={`absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 ${hover?'opacity-100':'opacity-80'}`} />
        <span className="relative z-10 inline-flex items-center">
          <CheckSquare className={`w-5 h-5 mr-1 ${hover ? 'rotate-12' : ''} transition-transform`} />
          <span className="text-sm font-medium">Quick Reconcile</span>
          {hover && <Sparkles className="w-4 h-4 ml-2 text-yellow-300 animate-pulse" />}
        </span>
      </button>
      <QuickReconciliationModal isOpen={open} onClose={()=>setOpen(false)} />
    </>
  );
}
