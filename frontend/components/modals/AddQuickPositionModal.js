// components/modals/AddQuickPositionModal.js
// ──────────────────────────────────────────────────────────────────────────────
// AddQuickPositionModal — Fresh Rebuild (v2 "Nova")
// - Multi-asset support: security, crypto, metal, cash, other
// - Two browsing modes: by Asset Type (tabs) or by Account (filter)
// - Live typeahead (portal dropdown) for tickers/symbols (debounced, cached)
// - Auto-hydration on seed/import for price + name (concurrency-limited)
// - Bulk select, bulk actions (assign account, set date, delete)
// - Per-row validation, resilient submit: save valid rows, keep invalid/failed
// - Clean payload for QuickStart: onPositionsSaved(count, { successes, failures, skipped })
// - No duplicate React imports. Tailwind-first, high-contrast, keyboard-friendly.
// ──────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  X, Plus, Search, Trash2, CheckCircle2, AlertTriangle, Loader2, ChevronDown,
  Building2, BarChart3, Coins, DollarSign, Gem, Home, Filter, CheckSquare, Square,
  Sparkles, CopyPlus, Wand2, Calendar, User, Rows2
} from 'lucide-react';
import debounce from 'lodash.debounce';
import { createPortal } from 'react-dom';

// Data hooks & API methods
import { useAccounts } from '@/store/hooks/useAccounts';
import {
  addSecurityPosition,
  addCryptoPosition,
  addMetalPosition,
  addCashPosition,
  addOtherAsset,
  searchSecurities,
  searchFXAssets
} from '@/utils/apimethods/positionMethods';

// ──────────────────────────────────────────────────────────────────────────────
// Config & utilities
// ──────────────────────────────────────────────────────────────────────────────

const ASSET_ICON = {
  security: BarChart3,
  crypto: Coins,
  metal: Gem,
  cash: DollarSign,
  other: Home
};

const METAL_PRESETS = [
  { value: 'Gold', label: '🥇 Gold', symbol: 'GC=F' },
  { value: 'Silver', label: '🥈 Silver', symbol: 'SI=F' },
  { value: 'Platinum', label: '💎 Platinum', symbol: 'PL=F' },
  { value: 'Copper', label: '🟫 Copper', symbol: 'HG=F' },
  { value: 'Palladium', label: '⚪ Palladium', symbol: 'PA=F' }
];

const EMPTY_FORMS = {
  security: () => ({ account_id: '', ticker: '', name: '', shares: '', cost_basis: '', purchase_date: '', price: '' }),
  crypto:   () => ({ account_id: '', symbol: '', name: '', quantity: '', purchase_price: '', purchase_date: '', current_price: '' }),
  metal:    () => ({ account_id: '', metal_type: '', symbol: '', name: '', quantity: '', unit: 'oz', purchase_price: '', purchase_date: '', current_price_per_unit: '' }),
  cash:     () => ({ account_id: '', cash_type: '', amount: '', interest_rate: '', interest_period: 'annually', maturity_date: '' }),
  other:    () => ({ asset_name: '', asset_type: '', cost: '', current_value: '', purchase_date: '', notes: '' })
};

const REQUIRED = {
  security: ['account_id','ticker','shares','cost_basis','purchase_date'],
  crypto:   ['account_id','symbol','quantity','purchase_price','purchase_date'],
  metal:    ['account_id','metal_type','quantity','purchase_price','purchase_date'],
  cash:     ['account_id','cash_type','amount'],
  other:    ['asset_name','asset_type','current_value']
};

const toNum = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : '';
};

const makeRow = (type, data = {}) => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  form: { ...EMPTY_FORMS[type](), ...data },
  selected: false,
  errors: {},
  status: 'staged', // staged | saving | saved | error
  errorMsg: ''
});

const pickBestSecurity = (q, results) => {
  if (!Array.isArray(results) || !results.length) return null;
  const uq = (q || '').toUpperCase();
  return results.find(r => (r.ticker || '').toUpperCase() === uq) || results[0];
};

// Limit concurrency for hydration to avoid spiking API
function pLimit(max) {
  let active = 0;
  const queue = [];
  const next = () => {
    active--;
    if (queue.length) {
      const fn = queue.shift();
      fn();
    }
  };
  return (fn) => new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn().then((v) => { resolve(v); next(); }).catch((e) => { reject(e); next(); });
    };
    if (active < max) run(); else queue.push(run);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────

export const AddQuickPositionModal = ({
  isOpen,
  onClose,
  seedPositions,             // { security:[], crypto:[], metal:[], cash:[], other:[] } or [{type, data}]
  onPositionsSaved           // (count, { successes, failures, skipped }) => void
}) => {
  const { accounts, loading: accountsLoading } = useAccounts();
  const accountOptions = useMemo(() => (accounts?.data || accounts || []).map(a => ({
    id: a.id ?? a.account_id ?? a.accountId,
    name: a.name ?? a.account_name ?? a.accountName ?? 'Unnamed',
    subtitle: a.institution ?? a.institution_name ?? ''
  })).filter(a => a.id != null), [accounts]);

  const [rows, setRows] = useState([]);
  const [viewMode, setViewMode] = useState('asset'); // 'asset' | 'account'
  const [assetTab, setAssetTab] = useState('security');
  const [accountFilter, setAccountFilter] = useState('all');

  const [submitting, setSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  // Search caches to make typing instant
  const securityCache = useRef(new Map()); // ticker -> best
  const fxCache = useRef(new Map());       // `${type}:${q}` -> best

  // Seed rows on open
  useEffect(() => {
    if (!isOpen) return;
    const next = [];

    const normalize = (type, data) => {
      const d = { ...data };
      // Normalize keys/types
      if (d.accountId && !d.account_id) d.account_id = d.accountId;
      if (type === 'security') {
        if (d.shares != null) d.shares = toNum(d.shares);
        if (d.cost_basis != null) d.cost_basis = toNum(d.cost_basis);
        if (d.price != null) d.price = toNum(d.price);
      }
      if (type === 'crypto') {
        if (d.quantity != null) d.quantity = toNum(d.quantity);
        if (d.purchase_price != null) d.purchase_price = toNum(d.purchase_price);
        if (d.current_price != null) d.current_price = toNum(d.current_price);
      }
      if (type === 'metal') {
        if (!d.unit) d.unit = 'oz';
        if (d.quantity != null) d.quantity = toNum(d.quantity);
        if (d.purchase_price != null) d.purchase_price = toNum(d.purchase_price);
        if (d.current_price_per_unit != null) d.current_price_per_unit = toNum(d.current_price_per_unit);
      }
      if (type === 'cash') {
        if (d.amount != null) d.amount = toNum(d.amount);
        if (d.interest_rate != null) d.interest_rate = toNum(d.interest_rate);
      }
      return d;
    };

    if (seedPositions && typeof seedPositions === 'object' && !Array.isArray(seedPositions)) {
      ['security','crypto','metal','cash','other'].forEach(t => {
        (seedPositions[t] || []).forEach(({ data }) => next.push(makeRow(t, normalize(t, data))));
      });
    } else if (Array.isArray(seedPositions)) {
      seedPositions.forEach(s => {
        if (s?.type && s?.data) next.push(makeRow(s.type, normalize(s.type, s.data)));
      });
    }

    if (!next.length) next.push(makeRow('security'));
    setRows(next);
    setAssetTab('security');
    setAccountFilter('all');
    setViewMode('asset');
    setSelectAll(false);
  }, [isOpen, seedPositions]);

  // Auto-hydrate seeded rows (securities, crypto, metals)
  useEffect(() => {
    if (!isOpen || !rows.length) return;
    const limiter = pLimit(5);

    const tasks = rows.map((r) => {
      if (r.type === 'security' && r.form.ticker && (!r.form.name || !r.form.price)) {
        return limiter(() => hydrateSecurity(r.id, r.form.ticker));
      }
      if (r.type === 'crypto' && r.form.symbol && (!r.form.name || !r.form.current_price)) {
        return limiter(() => hydrateFX(r.id, r.form.symbol, 'crypto'));
      }
      if (r.type === 'metal' && (r.form.symbol || r.form.metal_type) && (!r.form.name || !r.form.current_price_per_unit)) {
        const q = r.form.symbol || r.form.metal_type;
        return limiter(() => hydrateFX(r.id, q, 'metal'));
      }
      return Promise.resolve();
    });

    // fire & forget but don't spam setState
    Promise.allSettled(tasks).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // do this once on open

  // Visible rows by mode/filter
  const visibleRows = useMemo(() => {
    let v = rows;
    if (viewMode === 'asset') {
      v = v.filter(r => r.type === assetTab);
    } else if (viewMode === 'account' && accountFilter !== 'all') {
      v = v.filter(r => String(r.form.account_id) === String(accountFilter));
    }
    return v;
  }, [rows, viewMode, assetTab, accountFilter]);

  // Summaries
  const counts = useMemo(() => {
    const total = rows.length;
    const byType = { security:0, crypto:0, metal:0, cash:0, other:0 };
    rows.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
    const ready = rows.filter(r => isValidRow(r.type, r.form)).length;
    const selected = rows.filter(r => r.selected).length;
    return { total, ready, selected, byType };
  }, [rows]);

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────

  const isValidRow = (type, form) => {
    const errs = {};
    (REQUIRED[type] || []).forEach(k => {
      if (!form[k] && form[k] !== 0) errs[k] = 'Required';
    });
    const numFields = {
      security: ['shares','cost_basis'],
      crypto: ['quantity','purchase_price'],
      metal: ['quantity','purchase_price'],
      cash: ['amount','interest_rate']
    }[type] || [];
    numFields.forEach(nk => {
      const v = form[nk];
      if (v !== '' && v != null && !Number.isFinite(Number(v))) errs[nk] = 'Number';
    });
    if (type !== 'other' && !form.account_id) errs['account_id'] = 'Required';
    return Object.keys(errs).length === 0;
  };

  const setRow = (id, updater) => setRows(prev => prev.map(r => (r.id === id ? updater(r) : r)));

  const setField = (id, key, value) => {
    setRow(id, (r) => {
      const form = { ...r.form, [key]: value };
      return { ...r, form };
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Search + Hydration (debounced, cached)
  // ───────────────────────────────────────────────────────────────────────────

  const applySecurityBest = (rowId, best) => {
    const name = best?.company_name || best?.name || '';
    const price = best?.current_price ?? best?.price ?? '';
    setRow(rowId, (r) => ({ ...r, form: { ...r.form, name, price: toNum(price) }}));
  };

  const applyCryptoBest = (rowId, best) => {
    const name = best?.name || '';
    const price = best?.current_price ?? best?.price ?? '';
    setRow(rowId, (r) => ({ ...r, form: { ...r.form, name, current_price: toNum(price) }}));
  };

  const applyMetalBest = (rowId, best) => {
    const name = best?.name || '';
    const symbol = best?.symbol || '';
    const price = best?.current_price ?? best?.price ?? '';
    setRow(rowId, (r) => ({ ...r, form: { ...r.form, name, symbol: symbol || r.form.symbol, current_price_per_unit: toNum(price) }}));
  };

  const hydrateSecurity = useCallback(debounce(async (rowId, ticker) => {
    const q = (ticker || '').trim().toUpperCase();
    if (!q) return;
    if (securityCache.current.has(q)) {
      applySecurityBest(rowId, securityCache.current.get(q));
      return;
    }
    try {
      const list = await searchSecurities(q);
      const best = pickBestSecurity(q, list);
      if (best) {
        securityCache.current.set(q, best);
        applySecurityBest(rowId, best);
      }
    } catch (e) {
      // ignore; user can continue
      console.warn('searchSecurities failed', e);
    }
  }, 220), []);

  const hydrateFX = useCallback(debounce(async (rowId, q, kind) => {
    const key = `${kind}:${(q || '').trim().toUpperCase()}`;
    if (!key.endsWith(':')) {
      if (fxCache.current.has(key)) {
        const best = fxCache.current.get(key);
        if (kind === 'crypto') applyCryptoBest(rowId, best);
        if (kind === 'metal')  applyMetalBest(rowId,  best);
        return;
      }
      try {
        const list = await searchFXAssets((q || '').trim(), kind);
        const best = Array.isArray(list) && list.length ? list[0] : null;
        if (best) {
          fxCache.current.set(key, best);
          if (kind === 'crypto') applyCryptoBest(rowId, best);
          if (kind === 'metal')  applyMetalBest(rowId,  best);
        }
      } catch (e) {
        console.warn('searchFXAssets failed', e);
      }
    }
  }, 220), []);

  // ───────────────────────────────────────────────────────────────────────────
  // Bulk actions
  // ───────────────────────────────────────────────────────────────────────────

  const setSelected = (val) => {
    const ids = new Set(visibleRows.map(r => r.id));
    setRows(prev => prev.map(r => ids.has(r.id) ? { ...r, selected: val } : r));
    setSelectAll(val);
  };

  const deleteSelected = () => setRows(prev => prev.filter(r => !r.selected));

  const bulkAssignAccount = (accountId) => {
    const ids = new Set(rows.filter(r => r.selected).map(r => r.id));
    setRows(prev => prev.map(r => ids.has(r.id) ? { ...r, form: { ...r.form, account_id: accountId } } : r));
  };

  const bulkSetDate = (dateStr) => {
    const ids = new Set(rows.filter(r => r.selected).map(r => r.id));
    setRows(prev => prev.map(r => {
      if (!ids.has(r.id)) return r;
      const k = r.type === 'cash' ? 'maturity_date' : 'purchase_date';
      return { ...r, form: { ...r.form, [k]: dateStr } };
    }));
  };

  const duplicateSelected = () => {
    const clones = rows.filter(r => r.selected).map(r => makeRow(r.type, r.form));
    if (clones.length) setRows(prev => [...clones, ...prev]);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Submit
  // ───────────────────────────────────────────────────────────────────────────

  const submitAll = async () => {
    const valid = rows.filter(r => isValidRow(r.type, r.form));
    const invalid = rows.filter(r => !isValidRow(r.type, r.form));

    if (!valid.length) {
      // mark errors visually
      setRows(prev => prev.map(r => ({ ...r, errors: isValidRow(r.type, r.form) ? {} : { _form: 'Invalid' } })));
      return;
    }

    setSubmitting(true);
    const successes = [];
    const failures = [];

    for (const row of valid) {
      setRow(row.id, (r) => ({ ...r, status: 'saving', errorMsg: '' }));
      try {
        let result = null;
        if (row.type === 'security') {
          result = await addSecurityPosition(Number(row.form.account_id), {
            ticker: (row.form.ticker || '').toUpperCase(),
            shares: Number(row.form.shares),
            cost_basis: Number(row.form.cost_basis),
            purchase_date: row.form.purchase_date,
            price: row.form.price || undefined
          });
        } else if (row.type === 'crypto') {
          result = await addCryptoPosition(Number(row.form.account_id), {
            symbol: (row.form.symbol || '').toUpperCase(),
            name: row.form.name || undefined,
            quantity: Number(row.form.quantity),
            purchase_price: Number(row.form.purchase_price),
            purchase_date: row.form.purchase_date,
            current_price: row.form.current_price || undefined
          });
        } else if (row.type === 'metal') {
          result = await addMetalPosition(Number(row.form.account_id), {
            metal_type: row.form.metal_type,
            symbol: (row.form.symbol || '').toUpperCase(),
            name: row.form.name || undefined,
            quantity: Number(row.form.quantity),
            unit: row.form.unit || 'oz',
            purchase_price: Number(row.form.purchase_price),
            purchase_date: row.form.purchase_date,
            current_price_per_unit: row.form.current_price_per_unit || undefined
          });
        } else if (row.type === 'cash') {
          result = await addCashPosition(Number(row.form.account_id), {
            cash_type: row.form.cash_type,
            amount: Number(row.form.amount),
            interest_rate: row.form.interest_rate !== '' ? Number(row.form.interest_rate) : null,
            interest_period: row.form.interest_period || 'annually',
            maturity_date: row.form.maturity_date || null
          });
        } else if (row.type === 'other') {
          result = await addOtherAsset({
            asset_name: row.form.asset_name,
            asset_type: row.form.asset_type,
            cost: row.form.cost !== '' ? Number(row.form.cost) : null,
            current_value: Number(row.form.current_value),
            purchase_date: row.form.purchase_date || null,
            notes: row.form.notes || null
          });
        }
        setRow(row.id, (r) => ({ ...r, status: 'saved' }));
        successes.push({ type: row.type, input: row.form, result });
      } catch (e) {
        const msg = e?.message || 'Failed';
        setRow(row.id, (r) => ({ ...r, status: 'error', errorMsg: msg }));
        failures.push({ type: row.type, input: row.form, error: msg });
      }
    }

    setSubmitting(false);

    // Remove saved; keep invalid + failed for fix
    setRows(prev => prev.filter(r => r.status !== 'saved'));

    const payload = {
      successes,
      failures,
      skipped: invalid.map(r => ({ type: r.type, input: r.form, reason: 'invalid' }))
    };
    onPositionsSaved?.(successes.length, payload);

    if (!failures.length && !invalid.length) onClose?.();
  };

  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Shell */}
      <div className="absolute inset-x-0 top-6 mx-auto w-[min(1280px,calc(100vw-2rem))] rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent" />
          <div className="relative px-6 py-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold tracking-tight">Quick Add Positions</h3>

            <div className="ml-auto flex items-center gap-2">
              <Badge label="Total" value={counts.total} />
              <Badge label="Ready" value={counts.ready} tone="emerald" />
              <Badge label="Selected" value={counts.selected} tone="indigo" />
              <button onClick={onClose} className="ml-2 p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mode & Tabs */}
          <div className="relative px-6 pb-3 flex flex-wrap items-center gap-3">
            <Segmented value={viewMode} onChange={setViewMode} options={[
              { value:'asset',  label:'By Asset',  icon:Rows2 },
              { value:'account',label:'By Account',icon:Building2 }
            ]} />

            {viewMode === 'asset' ? (
              <AssetTabs active={assetTab} counts={counts.byType} onChange={setAssetTab} />
            ) : (
              <AccountPicker options={accountOptions} value={accountFilter} onChange={setAccountFilter} />
            )}

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setRows(r => [makeRow(viewMode === 'asset' ? assetTab : 'security'), ...r])}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Row
              </button>
              <button onClick={duplicateSelected}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm border border-white/20 flex items-center gap-2">
                <CopyPlus className="w-4 h-4" /> Duplicate
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar (bulk actions) */}
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            Showing <strong className="mx-1">{visibleRows.length}</strong> rows
          </div>

          <label className="ml-2 inline-flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" className="hidden" checked={selectAll} onChange={() => setSelected(!selectAll)} />
            {selectAll ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-gray-400" />}
            <span className={selectAll ? 'text-indigo-700' : 'text-gray-700'}>Select all in view</span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            {/* Bulk account */}
            <div className="relative">
              <div className="text-xs text-gray-500 mb-1">Assign Account (selected)</div>
              <div className="flex items-center px-2 py-1.5 rounded-lg border border-gray-300 bg-white">
                <Building2 className="w-4 h-4 text-gray-500 mr-2" />
                <select
                  className="outline-none bg-transparent text-sm"
                  onChange={(e) => bulkAssignAccount(e.target.value)}
                  value=""
                >
                  <option value="">Choose...</option>
                  {accountOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}{opt.subtitle ? ` — ${opt.subtitle}` : ''}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
              </div>
            </div>

            {/* Bulk date */}
            <div className="relative">
              <div className="text-xs text-gray-500 mb-1">Set Date (selected)</div>
              <div className="flex items-center px-2 py-1.5 rounded-lg border border-gray-300 bg-white">
                <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                <input type="date" className="text-sm outline-none"
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => bulkSetDate(e.target.value)}
                />
              </div>
            </div>

            <button onClick={deleteSelected}
              className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        {/* Rows area */}
        <div className="px-6 py-4 bg-gray-50 max-h-[66vh] overflow-auto">
          {visibleRows.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-gray-300 bg-white text-center text-gray-500">
              No rows. Add a row or change filters.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleRows.map((row) => (
                <RowCard
                  key={row.id}
                  row={row}
                  accounts={accountOptions}
                  onToggle={() => setRow(row.id, r => ({ ...r, selected: !r.selected }))}
                  setField={(k, v) => {
                    setField(row.id, k, v);
                    // live hydration on key fields
                    if (row.type === 'security' && k === 'ticker') hydrateSecurity(row.id, v);
                    if (row.type === 'crypto' && k === 'symbol')  hydrateFX(row.id, v, 'crypto');
                    if (row.type === 'metal'  && (k === 'symbol' || k === 'metal_type')) hydrateFX(row.id, v, 'metal');
                  }}
                  hydrateSecurity={(ticker)=>hydrateSecurity(row.id, ticker)}
                  hydrateFX={(q, kind)=>hydrateFX(row.id, q, kind)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center gap-3">
          <div className="text-sm text-gray-600">
            <span className="mr-3">Ready to save: <strong>{counts.ready}</strong></span>
            <span className="mr-3">Invalid: <strong>{rows.length - counts.ready}</strong></span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm">
              Cancel
            </button>
            <button
              onClick={submitAll}
              disabled={submitting || counts.ready === 0}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm flex items-center gap-2"
              title={counts.ready === 0 ? 'Fix invalid rows to continue' : 'Save ready rows'}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? 'Saving…' : `Save ${counts.ready}`}
            </button>
          </div>
        </div>
      </div>

      {/* Portal host for typeahead menus */}
      <div id="typeahead-portal" />
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────────────

const Badge = ({ label, value, tone = 'slate' }) => {
  const tones = {
    slate:   'bg-white/10 text-white border-white/20',
    emerald: 'bg-emerald-500/15 text-emerald-100 border-emerald-400/30',
    indigo:  'bg-indigo-500/15 text-indigo-100 border-indigo-400/30'
  }[tone];
  return (
    <div className={`px-2.5 py-1 rounded-lg text-sm border ${tones}`}>
      <span className="opacity-70 mr-1">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
};

const Segmented = ({ value, onChange, options }) => (
  <div className="p-0.5 rounded-xl bg-white/10 border border-white/20 flex">
    {options.map(opt => {
      const ActiveIcon = opt.icon;
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${active ? 'bg-white text-slate-900' : 'text-white/80 hover:bg-white/10'}`}
        >
          <ActiveIcon className={`w-4 h-4 ${active ? 'text-slate-700' : 'text-white/80'}`} />
          {opt.label}
        </button>
      );
    })}
  </div>
);

const AssetTabs = ({ active, counts, onChange }) => {
  const opts = ['security','crypto','metal','cash','other'];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {opts.map(t => {
        const Icon = ASSET_ICON[t];
        const sel = active === t;
        return (
          <button key={t} onClick={() => onChange(t)}
            className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 ${sel ? 'bg-white text-slate-900 border-white' : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/15'}`}>
            <Icon className={`w-4 h-4 ${sel ? 'text-slate-700' : 'text-white'}`} />
            <span className="capitalize">{t}</span>
            <span className={`text-xs ${sel ? 'text-slate-500' : 'text-white/70'}`}>({counts?.[t] || 0})</span>
          </button>
        );
      })}
    </div>
  );
};

const AccountPicker = ({ options, value, onChange }) => (
  <div className="relative">
    <div className="flex items-center px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white">
      <Building2 className="w-4 h-4 text-white/70 mr-2" />
      <select className="bg-transparent outline-none text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All accounts</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}{o.subtitle ? ` — ${o.subtitle}` : ''}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 text-white/70 ml-1" />
    </div>
  </div>
);

const RowCard = ({ row, accounts, onToggle, setField, hydrateSecurity, hydrateFX }) => {
  const Icon = ASSET_ICON[row.type];
  const isSaving = row.status === 'saving';
  const isSaved  = row.status === 'saved';
  const isError  = row.status === 'error';

  const frame = `p-3 rounded-xl border shadow-sm ${isSaved ? 'border-emerald-300 bg-emerald-50/40' : isError ? 'border-rose-300 bg-rose-50/50' : 'border-gray-200 bg-white'}`;

  return (
    <div className={frame}>
      <div className="flex items-start gap-3">
        <label className="pt-2">
          <input type="checkbox" className="hidden" checked={row.selected} onChange={onToggle} />
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${row.selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
            {row.selected ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-gray-400" />}
          </div>
        </label>

        <div className="shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-700" />
          </div>
        </div>

        <div className="flex-1">
          {row.type === 'security' && (
            <div className="flex flex-wrap gap-3">
              <FieldAccount accounts={accounts} value={row.form.account_id} onChange={(v)=>setField('account_id', v)} />
              <FieldSuggest
                label="Ticker"
                value={row.form.ticker}
                onChange={(v)=>setField('ticker', v.toUpperCase())}
                onSearch={hydrateSecurity}
                placeholder="AAPL"
              />
              <FieldRO label="Company" value={row.form.name} placeholder="Auto" width="min-w-[220px]" />
              <FieldNum label="Shares" value={row.form.shares} onChange={(v)=>setField('shares', v)} width="min-w-[120px]" />
              <FieldNum label="Cost Basis" prefix="$" value={row.form.cost_basis} onChange={(v)=>setField('cost_basis', v)} width="min-w-[140px]" />
              <FieldRO label="Current Price" prefix="$" value={row.form.price} placeholder="Auto" width="min-w-[140px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>setField('purchase_date', v)} />
            </div>
          )}

          {row.type === 'crypto' && (
            <div className="flex flex-wrap gap-3">
              <FieldAccount accounts={accounts} value={row.form.account_id} onChange={(v)=>setField('account_id', v)} />
              <FieldSuggest
                label="Symbol"
                value={row.form.symbol}
                onChange={(v)=>setField('symbol', v.toUpperCase())}
                onSearch={(q)=>hydrateFX(q, 'crypto')}
                placeholder="BTC"
              />
              <FieldRO label="Name" value={row.form.name} placeholder="Auto" width="min-w-[220px]" />
              <FieldNum label="Quantity" value={row.form.quantity} onChange={(v)=>setField('quantity', v)} width="min-w-[120px]" />
              <FieldNum label="Buy Price" prefix="$" value={row.form.purchase_price} onChange={(v)=>setField('purchase_price', v)} width="min-w-[130px]" />
              <FieldRO label="Current Price" prefix="$" value={row.form.current_price} placeholder="Auto" width="min-w-[140px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>setField('purchase_date', v)} />
            </div>
          )}

          {row.type === 'metal' && (
            <div className="flex flex-wrap gap-3">
              <FieldAccount accounts={accounts} value={row.form.account_id} onChange={(v)=>setField('account_id', v)} />
              <FieldSelect label="Metal" value={row.form.metal_type} onChange={(v)=>{ setField('metal_type', v); const sym = METAL_PRESETS.find(m=>m.value===v)?.symbol; if (sym) setField('symbol', sym); }}>
                <option value="">Select…</option>
                {METAL_PRESETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </FieldSelect>
              <FieldSuggest
                label="Symbol"
                value={row.form.symbol}
                onChange={(v)=>setField('symbol', v.toUpperCase())}
                onSearch={(q)=>hydrateFX(q, 'metal')}
                placeholder="GC=F"
              />
              <FieldRO label="Market Name" value={row.form.name} placeholder="Auto" width="min-w-[220px]" />
              <FieldNum label="Qty" value={row.form.quantity} onChange={(v)=>setField('quantity', v)} width="min-w-[100px]" />
              <FieldText label="Unit" value={row.form.unit || 'oz'} onChange={(v)=>setField('unit', v)} width="min-w-[80px]" />
              <FieldNum label="Price/Unit" prefix="$" value={row.form.purchase_price} onChange={(v)=>setField('purchase_price', v)} width="min-w-[130px]" />
              <FieldRO label="Current/Unit" prefix="$" value={row.form.current_price_per_unit} placeholder="Auto" width="min-w-[140px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>setField('purchase_date', v)} />
            </div>
          )}

          {row.type === 'cash' && (
            <div className="flex flex-wrap gap-3">
              <FieldAccount accounts={accounts} value={row.form.account_id} onChange={(v)=>setField('account_id', v)} />
              <FieldText label="Type" value={row.form.cash_type} onChange={(v)=>setField('cash_type', v)} placeholder="Savings / Checking / CD" width="min-w-[160px]" />
              <FieldNum label="Amount" prefix="$" value={row.form.amount} onChange={(v)=>setField('amount', v)} width="min-w-[140px]" />
              <FieldNum label="APY" suffix="%" value={row.form.interest_rate} onChange={(v)=>setField('interest_rate', v)} width="min-w-[110px]" />
              <FieldText label="Period" value={row.form.interest_period} onChange={(v)=>setField('interest_period', v)} width="min-w-[120px]" />
              <FieldDate label="Maturity" value={row.form.maturity_date} onChange={(v)=>setField('maturity_date', v)} />
            </div>
          )}

          {row.type === 'other' && (
            <div className="flex flex-wrap gap-3">
              <FieldText label="Asset Name" value={row.form.asset_name} onChange={(v)=>setField('asset_name', v)} width="min-w-[240px]" />
              <FieldText label="Type" value={row.form.asset_type} onChange={(v)=>setField('asset_type', v)} placeholder="real_estate / vehicle / collectible / …" width="min-w-[200px]" />
              <FieldNum label="Purchase Price" prefix="$" value={row.form.cost} onChange={(v)=>setField('cost', v)} width="min-w-[150px]" />
              <FieldNum label="Current Value" prefix="$" value={row.form.current_value} onChange={(v)=>setField('current_value', v)} width="min-w-[150px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>setField('purchase_date', v)} />
              <FieldText label="Notes" value={row.form.notes} onChange={(v)=>setField('notes', v)} width="min-w-[260px]" />
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            {isSaving && <StatusBadge tone="indigo" icon={Loader2} text="Saving…" spin />}
            {isSaved  && <StatusBadge tone="emerald" icon={CheckCircle2} text="Saved" />}
            {isError  && <StatusBadge tone="rose" icon={AlertTriangle} text={row.errorMsg || 'Error'} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ tone, icon:Icon, text, spin }) => {
  const tones = {
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200'
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${tones}`}>
      <Icon className={`w-3.5 h-3.5 ${spin ? 'animate-spin' : ''}`} /> {text}
    </span>
  );
};

// ── Field primitives ─────────────────────────────────────────────────────────

const labelCls = "text-xs text-gray-500 mb-1 block";
const inputBase = "w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";
const roBase = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700";

const FieldAccount = ({ accounts, value, onChange }) => (
  <div className="flex-1 min-w-[200px]">
    <label className={labelCls}>Account</label>
    <div className="relative">
      <select className={`${inputBase} border-gray-300 pr-8`} value={value || ''} onChange={(e)=>onChange(e.target.value)}>
        <option value="">Select account…</option>
        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.subtitle ? ` — ${a.subtitle}` : ''}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  </div>
);

const FieldText = ({ label, value, onChange, width='min-w-[180px]', placeholder }) => (
  <div className={`flex-1 ${width}`}>
    <label className={labelCls}>{label}</label>
    <input type="text" value={value ?? ''} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
      className={`${inputBase} border-gray-300`} />
  </div>
);

const FieldNum = ({ label, value, onChange, width='min-w-[140px]', prefix, suffix }) => (
  <div className={`flex-1 ${width}`}>
    <label className={labelCls}>{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
      <input type="text" inputMode="decimal" value={value ?? ''} onChange={(e)=>onChange(e.target.value)}
        className={`${inputBase} border-gray-300 ${prefix?'pl-6':'pl-3'} ${suffix?'pr-6':'pr-3'}`} />
      {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>}
    </div>
  </div>
);

const FieldDate = ({ label, value, onChange }) => (
  <div className="flex-1 min-w-[160px]">
    <label className={labelCls}>{label}</label>
    <input type="date" value={value || ''} onChange={(e)=>onChange(e.target.value)}
      max={new Date().toISOString().split('T')[0]}
      className={`${inputBase} border-gray-300`} />
  </div>
);

const FieldRO = ({ label, value, prefix, placeholder='Auto', width='min-w-[180px]' }) => (
  <div className={`flex-1 ${width}`}>
    <label className={labelCls}>{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
      <input type="text" disabled value={value ?? ''} placeholder={placeholder}
        className={`${roBase} ${prefix?'pl-6':'pl-3'} pr-3`} />
    </div>
  </div>
);

const FieldSelect = ({ label, value, onChange, children }) => (
  <div className="flex-1 min-w-[160px]">
    <label className={labelCls}>{label}</label>
    <div className="relative">
      <select value={value || ''} onChange={(e)=>onChange(e.target.value)} className={`${inputBase} border-gray-300 pr-8`}>
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  </div>
);

// Live suggest input (portal dropdown so it always overlays cleanly)
const FieldSuggest = ({ label, value, onChange, onSearch, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  const [rect, setRect] = useState(null);

  const doSearch = useMemo(() => debounce(async (q) => {
    try {
      if (!q) { setItems([]); return; }
      await onSearch(q);
      // We don't know response shape here; suggestions will be derived from caches via `onSearch` fill.
      // For UX, we attempt a fresh fetch to show a few items for picking:
      let list = [];
      if (typeof searchSecurities === 'function' && placeholder === 'AAPL') {
        list = await searchSecurities(q);
      } else {
        list = await searchFXAssets(q, placeholder === 'BTC' ? 'crypto' : 'metal');
      }
      setItems(Array.isArray(list) ? list.slice(0, 6) : []);
    } catch {
      setItems([]);
    }
  }, 180), [onSearch, placeholder]);

  useEffect(() => {
    const el = ref.current;
    if (el) setRect(el.getBoundingClientRect());
  }, [ref.current]);

  useEffect(() => () => doSearch.cancel(), [doSearch]);

  return (
    <div className="flex-1 min-w-[160px] relative" ref={ref}>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value ?? ''}
          onChange={(e)=>{ onChange(e.target.value); setOpen(true); doSearch(e.target.value); }}
          onFocus={()=>{ setOpen(true); doSearch(value); }}
          onBlur={() => setTimeout(()=>setOpen(false), 150)}
          placeholder={placeholder}
          className={`${inputBase} border-gray-300 pr-8`}
        />
        <Search className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && rect && createPortal(
        <div
          className="z-[2000] fixed max-h-60 overflow-auto w-[260px] rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{ top: rect.bottom + 6, left: rect.left, width: rect.width }}
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
          ) : items.map((it, idx) => {
            const main = it.ticker || it.symbol || it.code || it.name || '';
            const sub  = it.company_name || it.name || it.asset_type || '';
            const price = it.current_price ?? it.price;
            return (
              <button
                key={idx}
                type="button"
                onMouseDown={(e)=>e.preventDefault()}
                onClick={() => {
                  onChange((main || '').toString().toUpperCase());
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{main}</div>
                  {price != null && <div className="text-xs text-gray-600">${Number(price).toLocaleString()}</div>}
                </div>
                {sub && <div className="text-xs text-gray-500">{sub}</div>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Convenience launcher button (drop-in)
// ──────────────────────────────────────────────────────────────────────────────

export const QuickAddPositionsButton = ({
  className = '',
  seedPositions = null,
  onPositionsSaved,
  buttonLabel = 'Quick Add',
  onOpen,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => { setIsOpen(true); onOpen?.(); }}
        className={`group relative flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-900/90 text-white py-1.5 px-4 transition-all duration-300 hover:shadow-md ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-green-400 group-hover:text-white transition-colors" />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">{buttonLabel}</span>
        </div>
      </button>

      <AddQuickPositionModal
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); onClose?.(); }}
        seedPositions={seedPositions}
        onPositionsSaved={onPositionsSaved}
      />
    </>
  );
};

export default AddQuickPositionModal;
