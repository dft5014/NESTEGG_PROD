import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  X, Check, CheckCircle, CheckSquare, CheckCheck, AlertTriangle, Info, Clock, Loader2,
  ChevronRight, ArrowLeft, Eye, EyeOff, Landmark as Building2, DollarSign, Droplets, LineChart,
  Bell, Target, Trophy, FileText, RefreshCw, Percent, Trash2, Filter as FilterIcon, Search,
  List as ListIcon
} from 'lucide-react';
import { debounce } from 'lodash';

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
  const n = Number(String(s ?? '').replace(/[^0-9.-]/g, '').trim());
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
const LS_SCHEMA = (u) => `${NS(u)}:schemaVersion`;
const LS_DRAFTS = (u) => `${NS(u)}:drafts:v2`;
const LS_SELECTED_INST = (u) => `${NS(u)}:selectedInstitution`;
const LS_LIQUID_FILTERS = (u) => `${NS(u)}:liquid:filters`;
const SCHEMA_VERSION = 2;

// Helpers for Quick Cash scope
const isClearlySecurityWord = /(stock|equity|etf|fund|mutual|option|bond|crypto|security|shares?)/i;
const isCashLikeWord = /(cash|checking|savings|mm|money\s?market|hysa|cd|certificate|sweep|settlement|brokerage\s?cash)/i;
const isCashLike = (pos) => {
  const t = String(pos.type || '').toLowerCase();
  const n = `${pos.name || ''} ${pos.identifier || ''} ${pos.inv_account_name || ''}`.toLowerCase();
  if (isClearlySecurityWord.test(n)) return false;
  if (['cash', 'checking', 'savings', 'money_market', 'mm', 'sweep', 'deposit'].includes(t)) return true;
  return isCashLikeWord.test(n);
};

// ============== Shared Currency Input Component ==============
const CurrencyInput = React.memo(function CurrencyInput({
  value,
  onValueChange,
  className = '',
  ariaLabel,
  onFocus,
  onBlur,
  nextFocusId,
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(Number.isFinite(value) ? String(value) : '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!focused) {
      setRaw(Number.isFinite(value) ? String(value) : '');
    }
  }, [value, focused]);

  const sanitize = (s) => {
    const cleaned = s.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '').replace(/\.(?=.*\.)/g, '');
    return cleaned;
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
      maxLength={15}
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

CurrencyInput.propTypes = {
  value: PropTypes.number,
  onValueChange: PropTypes.func,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  nextFocusId: PropTypes.string,
};

// ============== Toast Component ==============
function Toast({ type = 'info', text, onClose, duration = 3500 }) {
  const tone = {
    info: 'bg-blue-600',
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    warning: 'bg-amber-600',
  }[type] || 'bg-blue-600';

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-[10000]" role="alert">
      <div className={`text-white ${tone} shadow-lg rounded-lg px-4 py-3 flex items-center gap-3`}>
        <span className="text-sm">{text}</span>
        <button onClick={onClose} className="ml-2 rounded hover:bg-white/10 p-1" aria-label="Close toast">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

Toast.propTypes = {
  type: PropTypes.oneOf(['info', 'success', 'error', 'warning']),
  text: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
};

// ============== Filter Panel Component ==============
function FilterPanel({ filters, setFilters, placeholder = 'Search institutions...' }) {
  const debouncedSetFilterText = useCallback(debounce((value) => {
    setFilters((prev) => ({ ...prev, filterText: value }));
  }, 300), [setFilters]);

  return (
    <div className="mb-2 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
      <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-zinc-200">
        <FilterIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
          <input
            value={filters.filterText}
            onChange={(e) => debouncedSetFilterText(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 
              bg-white dark:bg-zinc-800 text-sm 
              text-gray-900 dark:text-zinc-100 
              placeholder-gray-400 dark:placeholder-zinc-500"
            aria-label="Search filter"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.showAssets !== undefined && (
          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={filters.showAssets}
              onChange={(e) => setFilters((prev) => ({ ...prev, showAssets: e.target.checked }))}
            />
            Assets
          </label>
        )}
        {filters.showLiabs !== undefined && (
          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={filters.showLiabs}
              onChange={(e) => setFilters((prev) => ({ ...prev, showLiabs: e.target.checked }))}
            />
            Liabilities
          </label>
        )}
        {filters.onlyManualLike !== undefined && (
          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={filters.onlyManualLike}
              onChange={(e) => setFilters((prev) => ({ ...prev, onlyManualLike: e.target.checked }))}
            />
            Only manual-like
          </label>
        )}
        {filters.showOnlyChanged !== undefined && (
          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={filters.showOnlyChanged}
              onChange={(e) => setFilters((prev) => ({ ...prev, showOnlyChanged: e.target.checked }))}
            />
            With drafts
          </label>
        )}
        {filters.showOnlyNeeding !== undefined && (
          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={filters.showOnlyNeeding}
              onChange={(e) => setFilters((prev) => ({ ...prev, showOnlyNeeding: e.target.checked }))}
            />
            Needs attention
          </label>
        )}
      </div>
    </div>
  );
}

FilterPanel.propTypes = {
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

// ============== Table Component ==============
function Table({
  data,
  kind,
  drafts,
  setDrafts,
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  showValues,
  editingKey,
  setEditingKey,
  lastFocusedIdRef,
  wantFocusRef,
}) {
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const headerSortIcon = (key) => (sortKey === key ? <span className="ml-1 text-gray-400 dark:text-zinc-500">{sortDir === 'asc' ? '▲' : '▼'}</span> : null);

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
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

    return sorted.map((p, idx) => {
      const key = makeKey(kind, p.id);
      const nest = Number(p.currentValue || 0);
      const stmt = drafts[key] !== undefined ? Number(drafts[key]) : nest;
      const diff = stmt - nest;
      const pct = nest !== 0 ? (diff / nest) * 100 : 0;
      const nextId = sorted[idx + 1]?.name ? `Statement_balance_for_${sorted[idx + 1].name}`.replace(/\s+/g, '_') : undefined;
      return { ...p, _calc: { nest, stmt, diff, pct }, _key: key, _nextId: nextId };
    });
  }, [data, kind, drafts, sortKey, sortDir]);

  return (
    <div className="min-w-[860px] overflow-auto">
      <table className="w-full" role="grid">
        <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-[44px] z-[1]">
          <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
            <th className="px-6 py-2 text-left cursor-pointer" onClick={() => toggleSort('name')} scope="col">
              {kind === 'asset' ? 'Account / Details' : 'Name'} {headerSortIcon('name')}
            </th>
            <th className="px-3 py-2 text-left" scope="col">Identifier</th>
            <th className="px-3 py-2 text-left" scope="col">Type</th>
            <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort('nest')} scope="col">
              NestEgg {headerSortIcon('nest')}
            </th>
            <th className="px-3 py-2 text-center" scope="col">Statement</th>
            <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort('diff')} scope="col">
              Δ {headerSortIcon('diff')}
            </th>
            <th className="px-3 py-2 text-right" scope="col">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
          {sortedData.map((item) => {
            const c = item._calc;
            const k = item._key;
            const changed = drafts[k] !== undefined && Number(drafts[k]) !== c.nest;
            return (
              <tr key={item.id} className={changed ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} role="row">
                <td className="px-6 py-2">
                  <div className="font-medium text-gray-900 dark:text-zinc-100">{item.name || (kind === 'asset' ? 'Account' : 'Liability')}</div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">{item.inv_account_name || ''}</div>
                </td>
                <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{item.identifier || '—'}</td>
                <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">{item.type || '—'}</td>
                <td className="px-3 py-2 text-right text-gray-800 dark:text-zinc-100">{fmtUSD(c.nest, !showValues)}</td>
                <td className="px-3 py-2 text-center">
                  <CurrencyInput
                    value={drafts[k] ?? c.nest}
                    onValueChange={(v) => {
                      if (editingKey !== k) setEditingKey(k);
                      setDrafts((prev) => ({ ...prev, [k]: Number.isFinite(v) ? v : 0 }));
                    }}
                    nextFocusId={item._nextId}
                    onFocus={(e) => {
                      setEditingKey(k);
                      lastFocusedIdRef.current = e.target.id;
                      wantFocusRef.current = true;
                    }}
                    onBlur={() => {
                      if (editingKey === k) setEditingKey(null);
                      wantFocusRef.current = false;
                    }}
                    className={changed ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-400/40' : ''}
                    ariaLabel={`Statement balance for ${item.name}`}
                  />
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${c.diff > 0 ? kind === 'asset' ? 'text-green-600' : 'text-red-600' : c.diff < 0 ? kind === 'asset' ? 'text-red-600' : 'text-green-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                  {fmtUSD(c.diff, !showValues)}
                </td>
                <td className={`px-3 py-2 text-right ${c.diff > 0 ? kind === 'asset' ? 'text-green-600' : 'text-red-600' : c.diff < 0 ? kind === 'asset' ? 'text-red-600' : 'text-green-600' : 'text-gray-500 dark:text-zinc-400'}`}>
                  {c.nest === 0 ? '—' : `${c.pct.toFixed(2)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

Table.propTypes = {
  data: PropTypes.array.isRequired,
  kind: PropTypes.oneOf(['asset', 'liability']).isRequired,
  drafts: PropTypes.object.isRequired,
  setDrafts: PropTypes.func.isRequired,
  sortKey: PropTypes.string.isRequired,
  setSortKey: PropTypes.func.isRequired,
  sortDir: PropTypes.oneOf(['asc', 'desc']).isRequired,
  setSortDir: PropTypes.func.isRequired,
  showValues: PropTypes.bool.isRequired,
  editingKey: PropTypes.string,
  setEditingKey: PropTypes.func.isRequired,
  lastFocusedIdRef: PropTypes.object.isRequired,
  wantFocusRef: PropTypes.object.isRequired,
};

// ============== Top Header Component ==============
function TopHeader({
  title,
  showValues,
  setShowValues,
  onRefresh,
  onClearPending,
  pending,
  onBack,
  onClose,
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
              aria-label="Back"
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
            onClick={() => setShowValues((s) => !s)}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
            title={showValues ? 'Hide values' : 'Show values'}
            aria-label={showValues ? 'Hide values' : 'Show values'}
          >
            {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => pending.onOpenQueue?.()}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700"
            title="View pending changes"
            aria-label="View pending changes"
          >
            <ListIcon className="w-4 h-4 inline -mt-0.5 mr-1" /> Queue
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-1 p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

TopHeader.propTypes = {
  title: PropTypes.string.isRequired,
  showValues: PropTypes.bool.isRequired,
  setShowValues: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onClearPending: PropTypes.func.isRequired,
  pending: PropTypes.object.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func,
};

// ============== Main Modal Component ==============
export default function QuickReconciliationModal({ isOpen, onClose, absTolerance = 0.01, pctTolerance = 0.001 }) {
  const { state, actions } = useDataStore();
  const userId = state?.user?.id || null;

  // Use DataStore hooks
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { positions: rawPositions = [], loading: positionsLoading, refresh: refreshPositions } = useDetailedPositions();
  const { liabilities: groupedLiabilities = [], loading: liabilitiesLoading, refreshData: refreshLiabilities } = useGroupedLiabilities();
  const loading = accountsLoading || positionsLoading || liabilitiesLoading;

  // Screens and state
  const [screen, setScreen] = useState('welcome');
  const [localLoading, setLocalLoading] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const [showQueue, setShowQueue] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const lastFocusedIdRef = useRef(null);
  const wantFocusRef = useRef(false);

  const showToast = useCallback((type, text, duration = 4000) => {
    setToast({ type, text });
    if (toastRef.current) clearTimeout(toastRef.current);
    if (duration > 0) toastRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  // LocalStorage helpers with fallback
  const loadFromStorage = useCallback((key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Failed to load from storage: ${key}`, e);
      showToast('warning', 'Local storage unavailable, using in-memory state.');
      return defaultValue;
    }
  }, [showToast]);

  const saveToStorage = useCallback((key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to save to storage: ${key}`, e);
      showToast('warning', 'Failed to save to local storage.');
    }
  }, [showToast]);

  const [reconData, setReconData] = useState(() => loadFromStorage(LS_DATA(userId), {}));

  const saveReconData = useCallback((dataOrFn) => {
    const data = typeof dataOrFn === 'function' ? dataOrFn(reconData) : dataOrFn;
    setReconData(data);
    saveToStorage(LS_DATA(userId), data);
  }, [userId, reconData, saveToStorage]);

  const persistDrafts = useCallback((next) => {
    setDrafts(next);
    saveToStorage(LS_DRAFTS(userId), next);
  }, [userId, saveToStorage]);

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
      localStorage.removeItem(LS_SELECTED_INST(userId));
      localStorage.removeItem(LS_LIQUID_FILTERS(userId));
    } catch { }
    setReconData({});
    setDrafts({});
    showToast('success', 'Cleared pending changes');
  }, [userId, showToast]);

  const pushHistory = useCallback(() => {
    try {
      const now = new Date().toISOString();
      const key = LS_HISTORY(userId);
      const history = loadFromStorage(key, []);
      const todayStr = new Date(now).toDateString();
      if (!history.some((d) => new Date(d).toDateString() === todayStr)) {
        history.unshift(now);
        if (history.length > 60) history.pop();
        saveToStorage(key, history);
      }
    } catch { }
  }, [userId, loadFromStorage, saveToStorage]);

  // Load drafts and migrate schema on mount
  useEffect(() => {
    if (!isOpen) return;
    setScreen('welcome');
    setToast(null);
    setLocalLoading(false);

    try {
      const currSchema = Number(loadFromStorage(LS_SCHEMA(userId), 0));
      if (currSchema < SCHEMA_VERSION) {
        const merged = loadFromStorage(LS_DRAFTS(userId), {});
        saveToStorage(LS_DRAFTS(userId), merged);
        saveToStorage(LS_SCHEMA(userId), String(SCHEMA_VERSION));
        setDrafts(merged);
      } else {
        setDrafts(loadFromStorage(LS_DRAFTS(userId), {}));
      }
    } catch {
      setDrafts({});
    }

    setTimeout(() => {
      (async () => {
        if (!accounts.length || !rawPositions.length || !groupedLiabilities.length) {
          try {
            setLocalLoading(true);
            await Promise.all([refreshAccounts?.(), refreshPositions?.(), refreshLiabilities?.()]);
          } catch (e) {
            showToast('error', 'Failed to load portfolio data.');
          } finally {
            setLocalLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    };
  }, [isOpen, userId, loadFromStorage, saveToStorage, showToast, refreshAccounts, refreshPositions, refreshLiabilities]);

  // Normalized positions and liabilities
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

  // Tolerance check
  const withinTolerance = (nest, stmt) => Math.abs(stmt - nest) < Math.max(absTolerance, Math.abs(nest) * pctTolerance);

  // ========== WELCOME SCREEN ==========
  function WelcomeScreen() {
    const history = useMemo(() => loadFromStorage(LS_HISTORY(userId), []), [userId, loadFromStorage]);
    const lastFull = history[0] ? new Date(history[0]) : null;
    const lastStr = !lastFull ? 'Never' : (() => {
      const days = Math.floor((Date.now() - lastFull.getTime()) / 86400000);
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
      return `${Math.floor(days / 30)} months ago`;
    })();

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
      ]).catch(() => showToast('error', 'Failed to refresh data.')).finally(() => setLocalLoading(false));
    }, [showToast, refreshPositions, refreshAccounts, refreshLiabilities]);

    return (
      <div className="flex flex-col h-[80vh]">
        <TopHeader
          title="Quick Update & Reconcile"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={onRefresh}
          onClearPending={clearPending}
          pending={pending}
          onClose={onClose}
        />
        <div className="p-6 flex-1 overflow-auto" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-gray-600 dark:text-zinc-400 mb-4">
            Paste or type balances for cash, cards, and loans; then verify investment accounts.
            Last full update: <span className="font-medium">{lastStr}</span>.
          </p>
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
              onClick={() => { setScreen('liquid'); saveReconData((d) => ({ ...d, _next: 'reconcile' })); }}
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
                    className={`rounded-xl border transition-all bg-white dark:bg-zinc-900 ${changed ? 'border-amber-200 dark:border-amber-700/40' : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'}`}
                    role="group"
                  >
                    <div className="flex items-center gap-3 p-4">
                      {logo ? (
                        <img src={logo} alt={g.institution} className="w-8 h-8 rounded object-contain" />
                      ) : <Building2 className="w-8 h-8 text-gray-400" />}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-zinc-100">{g.institution}</div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">
                          {g.assets.length} assets • {g.liabilities.length} liabilities
                        </div>
                      </div>
                      {changed ? (
                        <span className="inline-flex items-center text-amber-700 dark:text-amber-300 text-xs">
                          <AlertTriangle className="w-4 h-4 mr-1" /> Drafts
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-green-700 dark:text-emerald-300 text-xs">
                          <CheckCircle className="w-4 h-4 mr-1" /> Ready
                        </span>
                      )}
                    </div>
                    <div className="px-4 pb-4 grid grid-cols-3 gap-2 text-[11px]">
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
                    <div className="px-4 pb-4 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`${changed ? 'bg-amber-500' : 'bg-green-500'} h-full transition-all`} style={{ width: `${clamp(g.progressPct, 0, 100)}%` }} />
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

  // ========== LIQUID SCREEN ==========
  function LiquidScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(() => loadFromStorage(LS_SELECTED_INST(userId), null));
    const [filters, setFilters] = useState(() => loadFromStorage(LS_LIQUID_FILTERS(userId), {
      filterText: '',
      showOnlyChanged: false,
      showAssets: true,
      showLiabs: true,
      onlyManualLike: true,
    }));
    const [sortKey, setSortKey] = useState('nest');
    const [sortDir, setSortDir] = useState('desc');
    const [jumping, setJumping] = useState(false);

    useEffect(() => {
      saveToStorage(LS_SELECTED_INST(userId), selectedInstitution || '');
    }, [userId, selectedInstitution, saveToStorage]);

    useEffect(() => {
      saveToStorage(LS_LIQUID_FILTERS(userId), filters);
    }, [userId, filters, saveToStorage]);

    const cashPositionsAll = useMemo(() => positionsNorm.filter(isCashLike), [positionsNorm]);
    const filteredPositions = useMemo(() => {
      return cashPositionsAll.filter(p => filters.onlyManualLike ? !p.identifier : true);
    }, [cashPositionsAll, filters.onlyManualLike]);

    const groups = useMemo(() => {
      const map = new Map();
      const add = (inst) => {
        if (!map.has(inst)) map.set(inst, { institution: inst, positions: [], liabilities: [], assetsValue: 0, liabilitiesValue: 0 });
        return map.get(inst);
      };

      if (filters.showAssets) {
        filteredPositions.forEach(p => {
          const g = add(p.institution || 'Unknown Institution');
          g.positions.push(p);
          g.assetsValue += Math.abs(Number(p.currentValue || 0));
        });
      }

      if (filters.showLiabs) {
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
          ...g,
          totalRows,
          drafted,
          changed,
          totalValue: g.assetsValue + g.liabilitiesValue,
          progressPct: totalRows ? ((totalRows - changed) / totalRows) * 100 : 0,
        };
      });

      if (filters.filterText.trim()) {
        const s = filters.filterText.trim().toLowerCase();
        enriched = enriched.filter(g => (g.institution || '').toLowerCase().includes(s));
      }
      if (filters.showOnlyChanged) {
        enriched = enriched.filter(g => g.changed > 0);
      }

      return enriched.sort((a, b) => b.totalValue - a.totalValue);
    }, [filteredPositions, liabilities, drafts, filters.filterText, filters.showOnlyChanged, filters.showAssets, filters.showLiabs]);

    useEffect(() => {
      if (!selectedInstitution && groups.length) {
        setSelectedInstitution(groups[0].institution);
      }
    }, [groups, selectedInstitution]);

    useEffect(() => {
      if (!editingKey || !wantFocusRef.current || !lastFocusedIdRef.current) return;
      const el = document.getElementById(lastFocusedIdRef.current);
      if (el && document.activeElement !== el) {
        try { el.focus({ preventScroll: true }); } catch { el.focus(); }
      }
    }, [drafts, sortKey, sortDir, filters, selectedInstitution]);

    const current = useMemo(() => groups.find(g => g.institution === selectedInstitution), [groups, selectedInstitution]);

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
      const flat = lines.flat().map(s => toNum(String(s).trim())).filter(n => Number.isFinite(n));
      if (!flat.length) return;
      e.preventDefault();
      const posKeys = (current.positions || []).map(p => makeKey('asset', p.id));
      const liabKeys = (current.liabilities || []).map(l => makeKey('liability', l.id));
      const keys = [...posKeys, ...liabKeys];
      const next = { ...drafts };
      for (let i = 0; i < keys.length && i < flat.length; i += 1) {
        next[keys[i]] = flat[i];
      }
      persistDrafts(next);
      showToast('success', `Pasted ${Math.min(keys.length, flat.length)} values`);
    };

    const saveInstitution = async () => {
      if (!current) return;

      const changes = [];
      const buildLiabilityPayload = (l, next) => {
        const t = String(l.type || '').toLowerCase();
        if (t.includes('mortgage') || t.includes('loan')) return { principal_balance: next };
        if (t.includes('credit')) return { current_balance: next };
        return { current_balance: next };
      };

      if (filters.showAssets) {
        current.positions.forEach(p => {
          const key = makeKey('asset', p.id);
          const curr = Number(p.currentValue || 0);
          const next = drafts[key];
          if (next === undefined || !Number.isFinite(next) || next === curr) return;
          changes.push({ kind: 'cash', id: p.itemId || p.id, value: Number(next), entity: p });
        });
      }

      if (filters.showLiabs) {
        current.liabilities.forEach(l => {
          const key = makeKey('liability', l.id);
          const curr = Number(l.currentValue || 0);
          const next = drafts[key];
          if (next === undefined || !Number.isFinite(next) || next === curr) return;
          const liabId = getLiabilityId(l);
          if (!liabId) {
            showToast('warning', `Skipping liability "${l.name || 'Unknown'}" due to missing ID.`);
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
        const pool = Array.from({ length: Math.min(maxConcurrent, changes.length) }, async () => {
          while (idx < changes.length) {
            const currentIdx = idx++;
            const job = changes[currentIdx];
            try {
              await runOne(job);
            } catch (e) {
              failed.push(job);
              console.error(`Error updating ${job.kind} ${job.id ?? '(unknown)'}: ${e.message}`, e);
            }
          }
        });

        await Promise.all(pool);

        const keysToClear = [];
        if (filters.showAssets) current.positions.forEach(p => keysToClear.push(makeKey('asset', p.id)));
        if (filters.showLiabs) current.liabilities.forEach(l => keysToClear.push(makeKey('liability', l.id)));
        const afterClear = { ...drafts };
        keysToClear.forEach(k => delete afterClear[k]);
        persistDrafts(afterClear);

        await Promise.all([
          refreshPositions?.(),
          actions?.fetchGroupedPositionsData?.(true),
          actions?.fetchPortfolioData?.(true),
          refreshLiabilities?.(),
        ]);

        const nextData = { ...reconData };
        changes.forEach((c) => {
          nextData[`pos_${makeKey(c.kind === 'liability' ? 'liability' : 'asset', c.id)}`] = {
            lastUpdated: new Date().toISOString(),
            value: Number(c.value)
          };
        });
        saveReconData(nextData);

        if (failed.length) {
          showToast('error', `Saved with ${failed.length} failures: ${failed.map(f => f.entity?.name || 'Unknown').join(', ')}`);
        } else {
          showToast('success', `Updated ${current.institution}`);
        }
      } catch (e) {
        showToast('error', 'Failed to apply updates.');
        console.error(e);
      } finally {
        setLocalLoading(false);
      }
    };

    const continueToNext = () => {
      if (!groups.length) return;
      if (!current) {
        setSelectedInstitution(groups[0].institution);
        return;
      }
      if (current.drafted > 0 && !confirm('You have unsaved changes. Save before continuing?')) {
        const idx = groups.findIndex(g => g.institution === current.institution);
        const next = groups[idx + 1];
        setJumping(true);
        setTimeout(() => setJumping(false), 300);
        if (next) {
          setSelectedInstitution(next.institution);
          showToast('success', `Moving to ${next.institution}`, 2000);
        } else {
          setSelectedInstitution(null);
          showToast('success', 'All institutions reviewed.');
          if (reconData?._next === 'reconcile') setScreen('reconcile');
        }
        return;
      }
      saveInstitution().then(() => {
        const idx = groups.findIndex(g => g.institution === current.institution);
        const next = groups[idx + 1];
        setJumping(true);
        setTimeout(() => setJumping(false), 300);
        if (next) {
          setSelectedInstitution(next.institution);
          showToast('success', `Moving to ${next.institution}`, 2000);
        } else {
          setSelectedInstitution(null);
          showToast('success', 'All institutions reviewed.');
          if (reconData?._next === 'reconcile') setScreen('reconcile');
        }
      });
    };

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([
        refreshPositions?.(),
        refreshAccounts?.(),
        refreshLiabilities?.()
      ]).catch(() => showToast('error', 'Failed to refresh data.')).finally(() => setLocalLoading(false));
    }, [showToast, refreshPositions, refreshAccounts, refreshLiabilities]);

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
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
            <div className="h-full flex flex-col">
              <FilterPanel filters={filters} setFilters={setFilters} />
              <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="h-full overflow-auto" style={{ overscrollBehavior: 'contain' }}>
                  {groups.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500 dark:text-zinc-400">No cash or liabilities found.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-zinc-800" role="listbox">
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
                              role="option"
                              aria-selected={isSel}
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
                                  <div className={`${changed ? 'bg-amber-500' : 'bg-blue-500'} h-full transition-all`} style={{ width: `${clamp(g.progressPct, 0, 100)}%` }} />
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
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-[1] rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    {getLogo(current.institution) ? (
                      <img src={getLogo(current.institution)} alt={current.institution} className="w-9 h-9 rounded object-contain" />
                    ) : <Building2 className="w-8 h-8 text-gray-400" />}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">{current.institution}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        {current.positions.length} assets • {current.liabilities.length} liabilities • Net{' '}
                        <span className={`${(current.assetsValue - current.liabilitiesValue) >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-semibold`}>
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
                <div className="flex-1 overflow-auto" style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
                  {current.positions.length > 0 && (
                    <div className="bg-gray-50 dark:bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 sticky top-0 z-[1]">
                      Assets & Cash
                    </div>
                  )}
                  {current.positions.length > 0 && (
                    <Table
                      data={current.positions}
                      kind="asset"
                      drafts={drafts}
                      setDrafts={persistDrafts}
                      sortKey={sortKey}
                      setSortKey={setSortKey}
                      sortDir={sortDir}
                      setSortDir={setSortDir}
                      showValues={showValues}
                      editingKey={editingKey}
                      setEditingKey={setEditingKey}
                      lastFocusedIdRef={lastFocusedIdRef}
                      wantFocusRef={wantFocusRef}
                    />
                  )}
                  {current.liabilities.length > 0 && (
                    <div className="min-w-[860px] mt-8 overflow-auto">
                      <div className="bg-gray-50 dark:bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-zinc-200 sticky top-0 z-[1]">Liabilities</div>
                      <Table
                        data={current.liabilities}
                        kind="liability"
                        drafts={drafts}
                        setDrafts={persistDrafts}
                        sortKey={sortKey}
                        setSortKey={setSortKey}
                        sortDir={sortDir}
                        setSortDir={setSortDir}
                        showValues={showValues}
                        editingKey={editingKey}
                        setEditingKey={setEditingKey}
                        lastFocusedIdRef={lastFocusedIdRef}
                        wantFocusRef={wantFocusRef}
                      />
                    </div>
                  )}
                  {current.positions.length === 0 && current.liabilities.length === 0 && (
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

  // ========== RECONCILE SCREEN ==========
  function ReconcileScreen() {
    const [selectedInstitution, setSelectedInstitution] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [filters, setFilters] = useState({
      filterText: '',
      showOnlyNeeding: false,
    });

    const groups = useMemo(() => {
      const instMap = new Map();
      const addInst = (inst) => {
        if (!instMap.has(inst)) instMap.set(inst, []);
        return instMap.get(inst);
      };

      (accounts || []).forEach((a) => {
        const inst = a.institution || 'Unknown Institution';
        const list = addInst(inst);
        const totalValue = Number(a.totalValue ?? a.total_value ?? a.balance ?? 0);
        list.push({ ...a, totalValue, _kind: 'account' });
      });

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

      let grouped = Array.from(instMap.entries()).map(([institution, list]) => {
        const totalValue = list.reduce((s, a) => s + Number(a.totalValue || 0), 0);
        let needs = 0;
        list.forEach(a => {
          const r = reconData[a.id];
          const stmt = Number(r?.statementBalance ?? NaN);
          const hasStmt = Number.isFinite(stmt);
          const ne = Number(a.totalValue || 0);
          const mismatched = hasStmt && !withinTolerance(ne, stmt);
          const stale = !r?.lastReconciled || (Math.floor((Date.now() - new Date(r.lastReconciled).getTime()) / 86400000) > 7);
          if (stale || mismatched) needs += 1;
        });
        return { institution, accounts: list, totalValue, needs };
      });

      const raw = grouped;
      if (filters.filterText.trim()) {
        const s = filters.filterText.trim().toLowerCase();
        grouped = grouped.filter(g => (g.institution || '').toLowerCase().includes(s));
      }
      if (filters.showOnlyNeeding) grouped = grouped.filter(g => g.needs > 0);

      if (filters.showOnlyNeeding && selectedInstitution) {
        const pinned = raw.find(g => g.institution === selectedInstitution);
        if (pinned && !grouped.find(g => g.institution === selectedInstitution)) {
          grouped = [pinned, ...grouped];
        }
      }

      return grouped.sort((a, b) => b.totalValue - a.totalValue);
    }, [accounts, liabilities, reconData, filters.filterText, filters.showOnlyNeeding, selectedInstitution]);

    const current = useMemo(() => groups.find(g => g.institution === selectedInstitution), [groups, selectedInstitution]);

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
        isReconciled: hasStmt ? withinTolerance(ne, st) : false
      };
    }, [reconData]);

    const handleStatementChange = (accId, v) => {
      const next = {
        ...reconData,
        [accId]: {
          ...(reconData[accId] || {}),
          statementBalance: Number.isFinite(v) ? v : 0,
          timestamp: new Date().toISOString()
        }
      };
      saveReconData(next);
    };

    const quickReconcile = (a) => {
      const ne = Number(a.totalValue || 0);
      const next = {
        ...reconData,
        [a.id]: {
          ...(reconData[a.id] || {}),
          statementBalance: ne,
          lastReconciled: new Date().toISOString()
        }
      };
      saveReconData(next);
      showToast('success', 'Account marked reconciled');
    };

    const continueToNext = () => {
      if (!current) return;
      const list = current.accounts || [];
      if (!selectedAccount) {
        setSelectedAccount(list[0] || null);
        return;
      }
      const idx = list.findIndex(x => x.id === selectedAccount.id);
      const next = list[idx + 1];
      if (next) {
        setSelectedAccount(next);
      } else {
        const i = groups.findIndex(g => g.institution === current.institution);
        const nextInst = groups[i + 1];
        if (nextInst) {
          setSelectedInstitution(nextInst.institution);
          setSelectedAccount(nextInst.accounts?.[0] || null);
          showToast('success', `Moving to ${nextInst.institution}`, 2000);
        } else {
          setSelectedInstitution(null);
                    setSelectedAccount(null);
          pushHistory();
          showToast('success', 'All institutions reviewed.');
          setScreen('summary');
        }
      }
    };

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([
        refreshPositions?.(),
        refreshAccounts?.(),
        refreshLiabilities?.()
      ])
        .catch(() => showToast('error', 'Failed to refresh data.'))
        .finally(() => setLocalLoading(false));
    }, [showToast, refreshPositions, refreshAccounts, refreshLiabilities]);

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
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
            <div className="h-full flex flex-col">
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                placeholder="Search institutions..."
              />
              <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="h-full overflow-auto" style={{ overscrollBehavior: 'contain' }}>
                  {groups.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500 dark:text-zinc-400">
                      No accounts or liabilities found.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-zinc-800" role="listbox">
                      {groups.map((g) => {
                        const isSel = g.institution === selectedInstitution;
                        const logoSmall = getLogo(g.institution);
                        return (
                          <li key={g.institution}>
                            <button
                              onClick={() => {
                                setSelectedInstitution(g.institution);
                                setSelectedAccount(g.accounts[0] || null);
                              }}
                              className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                                isSel
                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                              }`}
                              role="option"
                              aria-selected={isSel}
                            >
                              {logoSmall ? (
                                <img
                                  src={logoSmall}
                                  alt={g.institution}
                                  className="w-7 h-7 rounded object-contain"
                                />
                              ) : (
                                <Building2 className="w-6 h-6 text-gray-400" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-gray-900 dark:text-zinc-100">
                                    {g.institution}
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                                    {g.accounts.length} items
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400">
                                  {fmtUSD(g.totalValue, !showValues)} • {g.needs} need attention
                                </div>
                                <div className="mt-2 h-1.5 bg-gray-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className={`${
                                      g.needs > 0 ? 'bg-amber-500' : 'bg-blue-500'
                                    } h-full transition-all`}
                                    style={{
                                      width: `${clamp(
                                        (g.accounts.length - g.needs) / g.accounts.length * 100,
                                        0,
                                        100
                                      )}%`,
                                    }}
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
            </div>
          </aside>
          <section className="col-span-12 lg:col-span-8 xl:col-span-9 h-full">
            {!current || !selectedAccount ? (
              <div className="h-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 flex items-center justify-center text-center p-10">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
                    Select an institution to begin
                  </h4>
                  <p className="text-gray-600 dark:text-zinc-400 mt-2 max-w-lg">
                    Verify that account and liability totals match your latest statements.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-[1] rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    {getLogo(current.institution) ? (
                      <img
                        src={getLogo(current.institution)}
                        alt={current.institution}
                        className="w-9 h-9 rounded object-contain"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-gray-400" />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-zinc-100">
                        {current.institution}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        {selectedAccount.accountName || 'Account'} •{' '}
                        {fmtUSD(selectedAccount.totalValue, !showValues)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => quickReconcile(selectedAccount)}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                      title="Mark as reconciled"
                    >
                      <CheckCheck className="inline w-4 h-4 mr-1" /> Reconcile
                    </button>
                    <button
                      onClick={continueToNext}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                      title="Move to the next account"
                    >
                      Continue <ChevronRight className="inline w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto" style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
                  <div className="min-w-[860px] overflow-auto">
                    <table className="w-full" role="grid">
                      <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-[1]">
                        <tr className="text-xs uppercase text-gray-500 dark:text-zinc-400">
                          <th className="px-6 py-2 text-left" scope="col">
                            Account / Details
                          </th>
                          <th className="px-3 py-2 text-left" scope="col">
                            Identifier
                          </th>
                          <th className="px-3 py-2 text-right" scope="col">
                            NestEgg
                          </th>
                          <th className="px-3 py-2 text-center" scope="col">
                            Statement
                          </th>
                          <th className="px-3 py-2 text-right" scope="col">
                            Δ
                          </th>
                          <th className="px-3 py-2 text-right" scope="col">
                            %
                          </th>
                          <th className="px-3 py-2 text-right" scope="col">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {current.accounts.map((a) => {
                          const c = calc(a);
                          const isSel = selectedAccount?.id === a.id;
                          const changed = c.stmt !== null && !c.isReconciled;
                          return (
                            <tr
                              key={a.id}
                              className={`${isSel ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${
                                changed ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                              }`}
                              role="row"
                            >
                              <td className="px-6 py-2">
                                <div className="font-medium text-gray-900 dark:text-zinc-100">
                                  {a.accountName || 'Account'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400">
                                  {a.accountCategory || a._kind === 'liab_group' ? 'Liabilities' : 'Account'}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 dark:text-zinc-300">
                                {a.accountIdentifier || '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-800 dark:text-zinc-100">
                                {fmtUSD(c.nest, !showValues)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <CurrencyInput
                                  value={c.stmt ?? c.nest}
                                  onValueChange={(v) => handleStatementChange(a.id, v)}
                                  className={changed ? 'border-amber-400 ring-2 ring-amber-200 dark:ring-amber-400/40' : ''}
                                  ariaLabel={`Statement balance for ${a.accountName || 'Account'}`}
                                  nextFocusId={
                                    current.accounts[current.accounts.indexOf(a) + 1]?.id
                                      ? `Statement_balance_for_${
                                          current.accounts[current.accounts.indexOf(a) + 1].accountName
                                        }`.replace(/\s+/g, '_')
                                      : undefined
                                  }
                                  onFocus={() => {
                                    setEditingKey(a.id);
                                    lastFocusedIdRef.current = `Statement_balance_for_${a.accountName}`.replace(
                                      /\s+/g,
                                      '_'
                                    );
                                    wantFocusRef.current = true;
                                  }}
                                  onBlur={() => {
                                    if (editingKey === a.id) setEditingKey(null);
                                    wantFocusRef.current = false;
                                  }}
                                />
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-semibold ${
                                  c.diff > 0
                                    ? a._kind === 'liab_group'
                                      ? 'text-red-600'
                                      : 'text-green-600'
                                    : c.diff < 0
                                    ? a._kind === 'liab_group'
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                    : 'text-gray-500 dark:text-zinc-400'
                                }`}
                              >
                                {fmtUSD(c.diff, !showValues)}
                              </td>
                              <td
                                className={`px-3 py-2 text-right ${
                                  c.diff > 0
                                    ? a._kind === 'liab_group'
                                      ? 'text-red-600'
                                      : 'text-green-600'
                                    : c.diff < 0
                                    ? a._kind === 'liab_group'
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                    : 'text-gray-500 dark:text-zinc-400'
                                }`}
                              >
                                {c.nest === 0 ? '—' : `${c.pct.toFixed(2)}%`}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => quickReconcile(a)}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                                  title="Mark as reconciled"
                                  aria-label="Mark as reconciled"
                                >
                                  <CheckCheck className="inline w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ========== SUMMARY SCREEN ==========
  function SummaryScreen() {
    const summary = useMemo(() => {
      const instMap = new Map();
      const addInst = (inst) => {
        if (!instMap.has(inst))
          instMap.set(inst, { assets: [], liabilities: [], assetsValue: 0, liabilitiesValue: 0, needs: 0 });
        return instMap.get(inst);
      };

      positionsNorm.forEach((p) => {
        const g = addInst(p.institution || 'Unknown Institution');
        g.assets.push(p);
        g.assetsValue += Number(p.currentValue || 0);
      });

      liabilities.forEach((l) => {
        const g = addInst(l.institution || 'Unknown Institution');
        g.liabilities.push(l);
        g.liabilitiesValue += Number(l.currentValue || 0);
      });

      accounts.forEach((a) => {
        const g = addInst(a.institution || 'Unknown Institution');
        const r = reconData[a.id];
        const stmt = Number(r?.statementBalance ?? NaN);
        const hasStmt = Number.isFinite(stmt);
        const ne = Number(a.totalValue || 0);
        const mismatched = hasStmt && !withinTolerance(ne, stmt);
        const stale = !r?.lastReconciled || Math.floor((Date.now() - new Date(r.lastReconciled).getTime()) / 86400000) > 7;
        if (stale || mismatched) g.needs += 1;
      });

      return Array.from(instMap.entries()).map(([institution, g]) => ({
        institution,
        assets: g.assets,
        liabilities: g.liabilities,
        assetsValue: g.assetsValue,
        liabilitiesValue: g.liabilitiesValue,
        needs: g.needs,
        totalValue: g.assetsValue - g.liabilitiesValue,
      })).sort((a, b) => b.totalValue - a.totalValue);
    }, [positionsNorm, liabilities, accounts, reconData]);

    const onRefresh = useCallback(() => {
      setLocalLoading(true);
      Promise.all([
        refreshPositions?.(),
        refreshAccounts?.(),
        refreshLiabilities?.()
      ])
        .catch(() => showToast('error', 'Failed to refresh data.'))
        .finally(() => setLocalLoading(false));
    }, [showToast, refreshPositions, refreshAccounts, refreshLiabilities]);

    return (
      <div className="flex flex-col h-[80vh]">
        <TopHeader
          title="Reconciliation Summary"
          showValues={showValues}
          setShowValues={setShowValues}
          onRefresh={onRefresh}
          onClearPending={clearPending}
          pending={pending}
          onBack={() => setScreen('welcome')}
          onClose={onClose}
        />
        <div className="p-6 flex-1 overflow-auto" style={{ overscrollBehavior: 'contain' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Total Assets</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                {fmtUSD(
                  summary.reduce((s, g) => s + g.assetsValue, 0),
                  !showValues
                )}
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Total Liabilities</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                {fmtUSD(
                  summary.reduce((s, g) => s + g.liabilitiesValue, 0),
                  !showValues
                )}
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 mb-2">
                <LineChart className="w-4 h-4" />
                <span className="text-sm font-medium">Net Worth</span>
              </div>
              <div
                className={`text-2xl font-semibold ${
                  summary.reduce((s, g) => s + g.totalValue, 0) >= 0
                    ? 'text-green-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-rose-400'
                }`}
              >
                {fmtUSD(
                  summary.reduce((s, g) => s + g.totalValue, 0),
                  !showValues
                )}
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 mb-2">
                <Percent className="w-4 h-4" />
                <span className="text-sm font-medium">Accounts Reconciled</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                {summary.reduce((s, g) => s + g.assets.length, 0) -
                  summary.reduce((s, g) => s + g.needs, 0)}
                {' / '}
                {summary.reduce((s, g) => s + g.assets.length, 0)}
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 mb-2">
                <Bell className="w-4 h-4" />
                <span className="text-sm font-medium">Pending Actions</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                {pending.count}
              </div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 mb-2">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Accuracy</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                {(
                  ((summary.reduce((s, g) => s + g.assets.length, 0) -
                    summary.reduce((s, g) => s + g.needs, 0)) /
                    summary.reduce((s, g) => s + g.assets.length, 0)) * 100
                ).toFixed(1) || '0.0'}
                %
              </div>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
              Institution Details
            </h3>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[38vh] overflow-auto pr-1"
              style={{ overscrollBehavior: 'contain' }}
            >
              {summary.map((g) => {
                const logo = getLogo(g.institution);
                return (
                  <div
                    key={g.institution}
                    className={`rounded-xl border ${
                      g.needs > 0
                        ? 'border-amber-200 dark:border-amber-700/40'
                        : 'border-gray-200 dark:border-zinc-800'
                    } bg-white dark:bg-zinc-900`}
                    role="group"
                  >
                    <div className="flex items-center gap-3 p-4">
                      {logo ? (
                        <img
                          src={logo}
                          alt={g.institution}
                          className="w-8 h-8 rounded object-contain"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400" />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-zinc-100">
                          {g.institution}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">
                          {g.assets.length} assets • {g.liabilities.length} liabilities
                        </div>
                      </div>
                      {g.needs > 0 ? (
                        <span className="inline-flex items-center text-amber-700 dark:text-amber-300 text-xs">
                          <AlertTriangle className="w-4 h-4 mr-1" /> {g.needs} need attention
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-green-700 dark:text-emerald-300 text-xs">
                          <CheckCircle className="w-4 h-4 mr-1" /> All reconciled
                        </span>
                      )}
                    </div>
                    <div className="px-4 pb-4 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="text-gray-500 dark:text-zinc-400">
                        Assets:{' '}
                        <span className="font-medium text-gray-700 dark:text-zinc-200">
                          {fmtUSD(g.assetsValue, !showValues)}
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-zinc-400">
                        Liabs:{' '}
                        <span className="font-medium text-gray-700 dark:text-zinc-200">
                          {fmtUSD(g.liabilitiesValue, !showValues)}
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-zinc-400">
                        Net:{' '}
                        <span
                          className={`font-semibold ${
                            g.totalValue >= 0
                              ? 'text-green-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-rose-400'
                          }`}
                        >
                          {fmtUSD(g.totalValue, !showValues)}
                        </span>
                      </div>
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

  // ========== QUEUE MODAL ==========
  function QueueModal() {
    const items = useMemo(() => {
      const result = [];
      positionsNorm.forEach((p) => {
        const key = makeKey('asset', p.id);
        const draft = drafts[key];
        if (draft === undefined || draft === Number(p.currentValue || 0)) return;
        result.push({
          key,
          kind: 'asset',
          name: p.name || 'Unnamed',
          institution: p.institution || 'Unknown',
          currentValue: Number(p.currentValue || 0),
          draftValue: Number(draft),
          diff: Number(draft) - Number(p.currentValue || 0),
        });
      });
      liabilities.forEach((l) => {
        const key = makeKey('liability', l.id);
        const draft = drafts[key];
        if (draft === undefined || draft === Number(l.currentValue || 0)) return;
        result.push({
          key,
          kind: 'liability',
          name: l.name || 'Unnamed',
          institution: l.institution || 'Unknown',
          currentValue: Number(l.currentValue || 0),
          draftValue: Number(draft),
          diff: Number(draft) - Number(l.currentValue || 0),
        });
      });
      return result.sort((a, b) => a.institution.localeCompare(b.institution));
    }, [positionsNorm, liabilities, drafts]);

    const applyAll = async () => {
      const changes = items.map((item) => ({
        kind: item.kind === 'asset' ? 'cash' : 'liability',
        id: item.key.split(':')[1],
        value: item.draftValue,
        entity: { name: item.name },
        payload:
          item.kind === 'liability'
            ? {
                principal_balance:
                  String(item.type || '').toLowerCase().includes('mortgage') ||
                  String(item.type || '').toLowerCase().includes('loan')
                    ? item.draftValue
                    : undefined,
                current_balance: String(item.type || '').toLowerCase().includes('credit')
                  ? item.draftValue
                  : item.draftValue,
              }
            : undefined,
      }));

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
            await new Promise((res) => setTimeout(res, 350 * (tries + 1)));
          }
        }
      };

      setLocalLoading(true);
      try {
        const pool = Array.from({ length: Math.min(maxConcurrent, changes.length) }, async () => {
          while (idx < changes.length) {
            const currentIdx = idx++;
            const job = changes[currentIdx];
            try {
              await runOne(job);
            } catch (e) {
              failed.push(job);
              console.error(`Error updating ${job.kind} ${job.id ?? '(unknown)'}: ${e.message}`, e);
            }
          }
        });

        await Promise.all(pool);

        const afterClear = {};
        persistDrafts(afterClear);

        await Promise.all([
          refreshPositions?.(),
          actions?.fetchGroupedPositionsData?.(true),
          actions?.fetchPortfolioData?.(true),
          refreshLiabilities?.(),
        ]);

        const nextData = { ...reconData };
        changes.forEach((c) => {
          nextData[`pos_${makeKey(c.kind === 'liability' ? 'liability' : 'asset', c.id)}`] = {
            lastUpdated: new Date().toISOString(),
            value: Number(c.value),
          };
        });
        saveReconData(nextData);

        if (failed.length) {
          showToast('error', `Applied with ${failed.length} failures: ${failed.map((f) => f.entity?.name || 'Unknown').join(', ')}`);
        } else {
          showToast('success', 'Applied all pending changes');
        }
        setShowQueue(false);
      } catch (e) {
        showToast('error', 'Failed to apply all changes.');
        console.error(e);
      } finally {
        setLocalLoading(false);
      }
    };

    return (
      <FixedModal
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        title="Pending Changes"
        className="w-full max-w-2xl"
      >
        <div className="p-4 max-h-[60vh] overflow-auto" style={{ overscrollBehavior: 'contain' }}>
          {items.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-zinc-400">
              No pending changes.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
              {items.map((item) => (
                <li key={item.key} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-zinc-100">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-zinc-400">
                      {item.institution} • {item.kind === 'asset' ? 'Asset' : 'Liability'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-800 dark:text-zinc-100">
                      {fmtUSD(item.currentValue, !showValues)} →{' '}
                      <span
                        className={
                          item.diff >= 0 ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'
                        }
                      >
                        {fmtUSD(item.draftValue, !showValues)}
                      </span>
                    </div>
                    <div
                      className={`text-xs ${
                        item.diff >= 0 ? 'text-green-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'
                      }`}
                    >
                      {fmtUSD(item.diff, !showValues)}
                    </div>
                    <button
                      onClick={() => removeDraftKey(item.key)}
                      className="mt-1 text-red-600 hover:text-red-800 dark:text-rose-400 dark:hover:text-rose-300 text-xs"
                      title="Remove pending change"
                      aria-label="Remove pending change"
                    >
                      <Trash2 className="inline w-4 h-4 mr-1" /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex justify-between">
          <button
            onClick={clearAllDraftsOnly}
            className="px-4 py-2 rounded-lg bg-red-100 dark:bg-rose-900/20 text-red-600 dark:text-rose-300 hover:bg-red-200 dark:hover:bg-rose-900/30"
            title="Clear all pending changes"
          >
            Clear All
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowQueue(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-zinc-700"
              title="Close"
            >
              Close
            </button>
            {items.length > 0 && (
              <button
                onClick={applyAll}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                title="Apply all changes"
              >
                Apply All
              </button>
            )}
          </div>
        </div>
      </FixedModal>
    );
  }

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={async () => {
        if (await onBeforeClose()) onClose();
      }}
      title=""
      className="w-[95vw] max-w-[1400px] h-[80vh] max-h-[1000px]"
    >
      {loading || localLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 z-[100]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
        </div>
      ) : null}
      {toast && (
        <Toast
          type={toast.type}
          text={toast.text}
          onClose={() => setToast(null)}
        />
      )}
      {showQueue && <QueueModal />}
      {screen === 'welcome' && <WelcomeScreen />}
      {screen === 'liquid' && <LiquidScreen />}
      {screen === 'reconcile' && <ReconcileScreen />}
      {screen === 'summary' && <SummaryScreen />}
    </FixedModal>
  );
}

QuickReconciliationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  absTolerance: PropTypes.number,
  pctTolerance: PropTypes.number,
};