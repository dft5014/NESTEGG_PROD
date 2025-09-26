// components/modals/AddQuickPositionModal.js
// AddQuickPositionModal — Fresh build (v1)
// - Stages positions from Excel (seedPositions) or UI
// - Two flows: Add by Asset Type OR Add by Account (filters view only; payload is the same)
// - Fast search + auto-hydration of name/price via searchSecurities / searchFXAssets
// - Bulk select/delete, per-row validation, sticky summary
// - Robust submit: partial success allowed; failed rows remain for fix & re-try
// - Emits {count, positions:{successes, failures, skipped}} to onPositionsSaved for QuickStart

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  X, Plus, Search, Trash2, CheckCircle2, AlertTriangle, Loader2, ChevronDown,
  Building2, BarChart3, Coins, DollarSign, Gem, Home, Filter, CheckSquare, Square, Sparkles
} from 'lucide-react';
import debounce from 'lodash.debounce';

// Hooks & API
// NOTE: path matches QuickStart usage
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

// ---------- Helpers & config ----------

const ASSET_ICON = {
  security: BarChart3,
  crypto: Coins,
  metal: Gem,
  cash: DollarSign,
  other: Home
};

const EMPTY_FORMS = {
  security: () => ({
    account_id: '', ticker: '', name: '', shares: '', cost_basis: '', purchase_date: '',
    price: '' // hydrated (read-only)
  }),
  crypto: () => ({
    account_id: '', symbol: '', name: '', quantity: '', purchase_price: '', purchase_date: '',
    current_price: '' // hydrated (read-only)
  }),
  metal: () => ({
    account_id: '', metal_type: '', symbol: '', name: '', quantity: '', unit: 'oz',
    purchase_price: '', purchase_date: '', current_price_per_unit: '' // hydrated
  }),
  cash: () => ({
    account_id: '', cash_type: '', amount: '', interest_rate: '', interest_period: 'annually', maturity_date: ''
  }),
  other: () => ({
    asset_name: '', asset_type: '', cost: '', current_value: '', purchase_date: '', notes: ''
  })
};

const requiredKeysByType = {
  security: ['account_id', 'ticker', 'shares', 'cost_basis', 'purchase_date'],
  crypto:   ['account_id', 'symbol', 'quantity', 'purchase_price', 'purchase_date'],
  metal:    ['account_id', 'metal_type', 'quantity', 'purchase_price', 'purchase_date'],
  cash:     ['account_id', 'cash_type', 'amount'],
  other:    ['asset_name', 'asset_type', 'current_value']
};

const labelFor = (k) => ({
  // common
  account_id: 'Account',
  purchase_date: 'Purchase Date',
  // security
  ticker: 'Ticker', name: 'Name', shares: 'Shares', cost_basis: 'Cost Basis', price: 'Current Price',
  // crypto
  symbol: 'Symbol', quantity: 'Quantity', purchase_price: 'Buy Price', current_price: 'Current Price',
  // metal
  metal_type: 'Metal', unit: 'Unit', current_price_per_unit: 'Current/Unit',
  // cash
  cash_type: 'Type', amount: 'Amount', interest_rate: 'APY', interest_period: 'Period', maturity_date: 'Maturity',
  // other
  asset_name: 'Asset Name', asset_type: 'Type', cost: 'Purchase Price', current_value: 'Current Value', notes: 'Notes'
}[k] || k);

// simple currency+number guards
const toNum = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : '';
};

// row factory
const makeRow = (type, data = {}) => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  form: { ...EMPTY_FORMS[type](), ...data },
  selected: false,
  errors: {},
  status: 'staged' // 'staged' | 'saving' | 'saved' | 'error'
});

// ---------- Main component ----------

export const AddQuickPositionModal = ({
  isOpen,
  onClose,
  seedPositions, // object like {security:[], cash:[], crypto:[], metal:[]} or array of seedRow objects from QuickStart
  onPositionsSaved
}) => {
  // accounts
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const accountOptions = useMemo(() => (accounts || []).map(a => ({
    id: a.id ?? a.account_id,
    name: a.name ?? a.account_name ?? 'Unnamed',
    subtitle: a.institution || a.institution_name || '',
  })), [accounts]);

  // rows state
  const [rows, setRows] = useState([]);
  const [viewMode, setViewMode] = useState('asset'); // 'asset' | 'account' (filtering only)
  const [activeAssetTab, setActiveAssetTab] = useState('security');
  const [activeAccountFilter, setActiveAccountFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [searchCache, setSearchCache] = useState({}); // ticker/query → best match

  // Seed rows on open or when seedPositions changes
  useEffect(() => {
    if (!isOpen) return;
    const next = [];

    // Accept object from QuickStart { security:[], cash:[], crypto:[], metal:[] }
    if (seedPositions && typeof seedPositions === 'object' && !Array.isArray(seedPositions)) {
      const pushGroup = (t, arr = []) => {
        arr.forEach(({ data }) => next.push(makeRow(t, sanitizeSeedForm(t, data))));
      };
      pushGroup('security', seedPositions.security);
      pushGroup('cash',     seedPositions.cash);
      pushGroup('crypto',   seedPositions.crypto);
      pushGroup('metal',    seedPositions.metal);
    }

    // Accept legacy array of {type, data}
    if (Array.isArray(seedPositions)) {
      seedPositions.forEach(s => {
        if (s && s.type && s.data) next.push(makeRow(s.type, sanitizeSeedForm(s.type, s.data)));
      });
    }

    if (next.length) {
      setRows(next);
    } else {
      // empty starter
      setRows([makeRow('security')]);
    }
  }, [isOpen, seedPositions]);

  // Reset UI on close
  useEffect(() => {
    if (!isOpen) return;
    setViewMode('asset');
    setActiveAssetTab('security');
    setActiveAccountFilter('all');
    setSubmitting(false);
    setSelectAll(false);
  }, [isOpen]);

  // sanitize incoming seed shapes into our form keys
  function sanitizeSeedForm(type, data) {
    const d = { ...data };
    if (type === 'security') {
      // normalize keys
      if (d.accountId && !d.account_id) d.account_id = d.accountId;
      if (d.shares != null) d.shares = toNum(d.shares);
      if (d.cost_basis != null) d.cost_basis = toNum(d.cost_basis);
      if (d.price != null) d.price = toNum(d.price);
    }
    if (type === 'crypto') {
      if (d.accountId && !d.account_id) d.account_id = d.accountId;
      if (d.quantity != null) d.quantity = toNum(d.quantity);
      if (d.purchase_price != null) d.purchase_price = toNum(d.purchase_price);
      if (d.current_price != null) d.current_price = toNum(d.current_price);
    }
    if (type === 'metal') {
      if (d.accountId && !d.account_id) d.account_id = d.accountId;
      if (!d.unit) d.unit = 'oz';
      if (d.quantity != null) d.quantity = toNum(d.quantity);
      if (d.purchase_price != null) d.purchase_price = toNum(d.purchase_price);
      if (d.current_price_per_unit != null) d.current_price_per_unit = toNum(d.current_price_per_unit);
    }
    if (type === 'cash') {
      if (d.accountId && !d.account_id) d.account_id = d.accountId;
      if (d.amount != null) d.amount = toNum(d.amount);
      if (d.interest_rate != null) d.interest_rate = toNum(d.interest_rate);
    }
    return d;
  }

  // ---------- Row ops ----------

  const addRow = (type = activeAssetTab) => {
    setRows((r) => [makeRow(type), ...r]);
  };

  const cloneSelected = () => {
    const clones = rows.filter(r => r.selected).map(r => makeRow(r.type, r.form));
    if (clones.length) setRows(prev => [...clones, ...prev]);
  };

  const deleteSelected = () => {
    setRows(prev => prev.filter(r => !r.selected));
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    const filtered = visibleRows();
    const target = !selectAll;
    const ids = new Set(filtered.map(r => r.id));
    setRows(prev => prev.map(r => ids.has(r.id) ? { ...r, selected: target } : r));
    setSelectAll(target);
  };

  const updateField = (rowId, key, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const form = { ...r.form, [key]: value };
      return { ...r, form, errors: validateRow(r.type, form) };
    }));
  };

  const setRowStatus = (rowId, status, errorMsg) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, status: status, errorMsg };
    }));
  };

  // ---------- Validation ----------

  const validateRow = (type, form) => {
    const errs = {};
    (requiredKeysByType[type] || []).forEach(k => {
      if (!form[k] && form[k] !== 0) errs[k] = 'Required';
    });
    // light numeric checks
    const numFields = {
      security: ['shares', 'cost_basis'],
      crypto: ['quantity', 'purchase_price'],
      metal: ['quantity', 'purchase_price'],
      cash: ['amount', 'interest_rate']
    }[type] || [];
    numFields.forEach(nk => {
      const v = form[nk];
      if (v !== '' && v != null && !Number.isFinite(Number(v))) {
        errs[nk] = 'Number';
      }
    });
    // extra: account required for all except 'other'
    if (type !== 'other' && !form.account_id) errs['account_id'] = 'Required';
    return errs;
  };

  const rowIsValid = (row) => Object.keys(validateRow(row.type, row.form)).length === 0;

  // Computed
  const counts = useMemo(() => {
    const total = rows.length;
    const byType = { security:0, crypto:0, metal:0, cash:0, other:0 };
    const ready = rows.filter(rowIsValid).length;
    rows.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
    const selected = rows.filter(r => r.selected).length;
    return { total, ready, selected, byType };
  }, [rows]);

  // Visible subset based on view toggles
  const visibleRows = useCallback(() => {
    let v = rows;
    if (viewMode === 'asset') {
      v = v.filter(r => r.type === activeAssetTab);
    } else if (viewMode === 'account' && activeAccountFilter !== 'all') {
      v = v.filter(r => String(r.form.account_id) === String(activeAccountFilter));
    }
    return v;
  }, [rows, viewMode, activeAssetTab, activeAccountFilter]);

  // ---------- Search / Auto-Hydrate ----------

  // Securities: search by ticker, fill name + price on first solid match
  const hydrateSecurity = useCallback(debounce(async (rowId, ticker) => {
    const q = (ticker || '').trim();
    if (!q || q.length < 1) return;
    try {
      // simple per-key cache
      if (searchCache[q]) {
        const best = searchCache[q];
        applySecurityHydrate(rowId, best);
        return;
      }
      const results = await searchSecurities(q);
      const best = pickBestSecurity(q, results);
      if (best) {
        setSearchCache(prev => ({ ...prev, [q]: best }));
        applySecurityHydrate(rowId, best);
      }
    } catch (e) {
      // silent fail; user can type manually
      console.warn('searchSecurities failed', e);
    }
  }, 250), [searchCache]);

  const pickBestSecurity = (q, results) => {
    if (!Array.isArray(results) || !results.length) return null;
    const uq = q.toUpperCase();
    return results.find(r => (r.ticker || '').toUpperCase() === uq) || results[0];
  };

  const applySecurityHydrate = (rowId, best) => {
    const name = best.company_name || best.name || '';
    const price = best.current_price ?? best.price ?? '';
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const form = { ...r.form, name, price: toNum(price) };
      return { ...r, form };
    }));
  };

  // Crypto / Metals: FX search
  const hydrateFX = useCallback(debounce(async (rowId, q, assetType) => {
    const qq = (q || '').trim();
    if (!qq || qq.length < 1) return;
    try {
      const results = await searchFXAssets(qq, assetType); // assetType: 'crypto' | 'metal'
      if (Array.isArray(results) && results.length) {
        const top = results[0];
        setRows(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          const form = { ...r.form };
          if (assetType === 'crypto') {
            form.name = top.name || form.name;
            form.current_price = toNum(top.current_price ?? top.price ?? form.current_price);
          }
          if (assetType === 'metal') {
            form.symbol = top.symbol || form.symbol;
            form.name = top.name || form.name;
            form.current_price_per_unit = toNum(top.current_price ?? top.price ?? form.current_price_per_unit);
          }
          return { ...r, form };
        }));
      }
    } catch (e) {
      console.warn('searchFXAssets failed', e);
    }
  }, 250), []);

  // ---------- Submit ----------

  const submitAll = async () => {
    // Collect valid rows only; leave invalid rows staged
    const staged = rows;
    const validRows = staged.filter(rowIsValid);
    const invalidRows = staged.filter(r => !rowIsValid(r));

    if (!validRows.length) {
      // show inline errors
      setRows(prev => prev.map(r => ({ ...r, errors: validateRow(r.type, r.form) })));
      return;
    }

    setSubmitting(true);

    const successes = [];
    const failures = [];

    for (const row of validRows) {
      setRowStatus(row.id, 'saving');
      try {
        let result = null;
        if (row.type === 'security') {
          const payload = {
            ticker: (row.form.ticker || '').toUpperCase(),
            shares: Number(row.form.shares),
            cost_basis: Number(row.form.cost_basis),
            purchase_date: row.form.purchase_date,
            price: row.form.price || undefined
          };
          result = await addSecurityPosition(Number(row.form.account_id), payload);
        } else if (row.type === 'crypto') {
          const payload = {
            symbol: (row.form.symbol || '').toUpperCase(),
            name: row.form.name || undefined,
            quantity: Number(row.form.quantity),
            purchase_price: Number(row.form.purchase_price),
            purchase_date: row.form.purchase_date,
            current_price: row.form.current_price || undefined
          };
          result = await addCryptoPosition(Number(row.form.account_id), payload);
        } else if (row.type === 'metal') {
          const payload = {
            metal_type: row.form.metal_type,
            symbol: (row.form.symbol || '').toUpperCase(),
            name: row.form.name || undefined,
            quantity: Number(row.form.quantity),
            unit: row.form.unit || 'oz',
            purchase_price: Number(row.form.purchase_price),
            purchase_date: row.form.purchase_date,
            current_price_per_unit: row.form.current_price_per_unit || undefined
          };
          result = await addMetalPosition(Number(row.form.account_id), payload);
        } else if (row.type === 'cash') {
          const payload = {
            cash_type: row.form.cash_type,
            amount: Number(row.form.amount),
            interest_rate: row.form.interest_rate !== '' ? Number(row.form.interest_rate) : null,
            interest_period: row.form.interest_period || 'annually',
            maturity_date: row.form.maturity_date || null
          };
          result = await addCashPosition(Number(row.form.account_id), payload);
        } else if (row.type === 'other') {
          const payload = {
            asset_name: row.form.asset_name,
            asset_type: row.form.asset_type,
            cost: row.form.cost !== '' ? Number(row.form.cost) : null,
            current_value: Number(row.form.current_value),
            purchase_date: row.form.purchase_date || null,
            notes: row.form.notes || null
          };
          result = await addOtherAsset(payload);
        }

        setRowStatus(row.id, 'saved');
        successes.push({ row, result });
      } catch (e) {
        console.error('Save failed', e);
        setRowStatus(row.id, 'error', e?.message || 'Failed');
        failures.push({ row, error: e?.message || 'Failed' });
      }
    }

    setSubmitting(false);

    // Remove saved rows; keep invalid + failed for user to fix
    setRows(prev => prev.filter(r => r.status !== 'saved'));

    // Notify QuickStart
    const count = successes.length;
    const payload = {
      successes: successes.map(s => ({
        type: s.row.type,
        input: s.row.form,
        result: s.result
      })),
      failures: failures.map(f => ({
        type: f.row.type,
        input: f.row.form,
        error: f.error
      })),
      skipped: invalidRows.map(r => ({ type: r.type, input: r.form, reason: 'invalid' }))
    };

    if (onPositionsSaved) onPositionsSaved(count, payload);

    // If everything succeeded, close; otherwise, leave modal open for corrections
    if (failures.length === 0 && invalidRows.length === 0) {
      onClose?.();
    }
    // Else: user fixes remaining rows and clicks Save again
  };

  // ---------- UI pieces ----------

  if (!isOpen) return null;

  const TitleIcon = viewMode === 'asset' ? ASSET_ICON[activeAssetTab] : Building2;
  const titleText = viewMode === 'asset' ? `Add ${activeAssetTab[0].toUpperCase() + activeAssetTab.slice(1)} Positions` : 'Add Positions by Account';

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Modal */}
      <div className="absolute inset-x-0 top-6 mx-auto w-[min(1200px,calc(100vw-2rem))] rounded-2xl bg-white shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <TitleIcon className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">{titleText}</h3>
          <div className="ml-auto flex items-center gap-2">
            <SummaryPill label="Total" value={counts.total} />
            <SummaryPill label="Ready" value={counts.ready} />
            <SummaryPill label="Selected" value={counts.selected} />
            <button
              onClick={cloneSelected}
              className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              disabled={!counts.selected}
              title="Duplicate selected rows"
            >
              Duplicate
            </button>
            <button
              onClick={deleteSelected}
              className="px-3 py-1.5 text-sm rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
              disabled={!counts.selected}
              title="Delete selected rows"
            >
              <Trash2 className="w-4 h-4 inline -mt-0.5 mr-1" />
              Delete
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('asset')}
              className={`px-3 py-1.5 rounded-lg text-sm border ${viewMode === 'asset' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              title="Group and add by asset type"
            >
              By Asset
            </button>
            <button
              onClick={() => setViewMode('account')}
              className={`px-3 py-1.5 rounded-lg text-sm border ${viewMode === 'account' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              title="View rows per account"
            >
              By Account
            </button>
          </div>

          {viewMode === 'asset' ? (
            <div className="flex items-center gap-1 ml-2">
              {['security','crypto','metal','cash','other'].map(t => {
                const Icon = ASSET_ICON[t];
                return (
                  <button
                    key={t}
                    onClick={() => setActiveAssetTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm border flex items-center gap-2 ${activeAssetTab === t ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="capitalize">{t}</span>
                    <span className="text-xs text-gray-500">({counts.byType[t] || 0})</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ml-2">
              <AccountFilter
                options={accountOptions}
                value={activeAccountFilter}
                onChange={setActiveAccountFilter}
              />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => addRow(activeAssetTab)}
              className="px-3 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
            <button
              onClick={submitAll}
              disabled={submitting || rows.filter(rowIsValid).length === 0}
              className="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              title={rows.filter(rowIsValid).length === 0 ? 'No valid rows to save' : 'Save valid rows'}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? 'Saving...' : `Save ${rows.filter(rowIsValid).length} ready`}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="px-6 py-4 max-h-[70vh] overflow-auto">
          {/* Bulk row bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Showing</span>
              <strong>{visibleRows().length}</strong>
              <span>rows</span>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="peer hidden"
                checked={selectAll}
                onChange={toggleSelectAll}
              />
              {selectAll ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-gray-400" />}
              <span className={selectAll ? 'text-indigo-700' : 'text-gray-700'}>Select all in view</span>
            </label>
          </div>

          <div className="space-y-3">
            {visibleRows().length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-gray-300 text-gray-500">
                No rows in this filter. Add a row or adjust filters.
              </div>
            ) : (
              visibleRows().map((row) => (
                <RowCard
                  key={row.id}
                  row={row}
                  accounts={accountOptions}
                  onToggle={() => setRows(prev => prev.map(r => r.id === row.id ? ({ ...r, selected: !r.selected }) : r))}
                  onField={(k, v) => {
                    updateField(row.id, k, v);
                    // trigger hydration on key fields
                    if (row.type === 'security' && k === 'ticker') hydrateSecurity(row.id, v);
                    if (row.type === 'crypto' && k === 'symbol') hydrateFX(row.id, v, 'crypto');
                    if (row.type === 'metal' && (k === 'metal_type' || k === 'symbol')) {
                      const q = k === 'symbol' ? v : v; // either can drive a lookup
                      hydrateFX(row.id, q, 'metal');
                    }
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Subcomponents ----------

const SummaryPill = ({ label, value }) => (
  <div className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-sm">
    <span className="font-medium mr-1">{label}:</span>
    <span className="text-gray-900">{value}</span>
  </div>
);

const AccountFilter = ({ options, value, onChange }) => (
  <div className="relative">
    <div className="flex items-center px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700">
      <Building2 className="w-4 h-4 text-gray-500 mr-2" />
      <select
        className="outline-none bg-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">All accounts</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.name}{opt.subtitle ? ` — ${opt.subtitle}` : ''}</option>
        ))}
      </select>
    </div>
  </div>
);

const RowCard = ({ row, accounts, onToggle, onField }) => {
  const Icon = ASSET_ICON[row.type];
  const errs = row.errors || {};
  const isSaving = row.status === 'saving';
  const isSaved = row.status === 'saved';
  const isError = row.status === 'error';

  const commonCls = "w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";
  const bad = (k) => errs[k] ? 'border-rose-300 bg-rose-50/50' : 'border-gray-300';

  // Field builders
  const AccountSelect = (
    <div className="flex-1 min-w-[180px]">
      <label className="text-xs text-gray-500 mb-1 block">Account</label>
      <div className="relative">
        <select
          className={`${commonCls} ${bad('account_id')} pr-8`}
          value={row.form.account_id || ''}
          onChange={(e) => onField('account_id', e.target.value)}
        >
          <option value="">Select account…</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}{a.subtitle ? ` — ${a.subtitle}` : ''}</option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      {errs.account_id && <Err text="Account required" />}
    </div>
  );

  const StatusBadge = (
    <div className="flex items-center gap-2">
      {isSaving && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
        </span>
      )}
      {isSaved && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Saved
        </span>
      )}
      {isError && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" /> {row.errorMsg || 'Error'}
        </span>
      )}
    </div>
  );

  return (
    <div className={`p-3 rounded-xl border ${isSaved ? 'border-emerald-300 bg-emerald-50/40' : isError ? 'border-rose-300 bg-rose-50/40' : 'border-gray-200 bg-gray-50/50'} shadow-sm`}>
      <div className="flex items-start gap-3">
        <label className="pt-2">
          <input type="checkbox" className="hidden peer" checked={row.selected} onChange={onToggle} />
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer ${row.selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
            {row.selected ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-gray-400" />}
          </div>
        </label>

        <div className="shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-700" />
          </div>
        </div>

        <div className="flex-1">
          {/* Row content by type */}
          {row.type === 'security' && (
            <div className="flex flex-wrap gap-3">
              {AccountSelect}
              <FieldText label="Ticker" value={row.form.ticker} onChange={(v)=>onField('ticker', v.toUpperCase())} error={errs.ticker} rightIcon={<Search className="w-4 h-4 text-gray-400" />} width="min-w-[110px]" />
              <FieldRO label="Name" value={row.form.name} placeholder="Auto" width="min-w-[220px]" />
              <FieldNum label="Shares" value={row.form.shares} onChange={(v)=>onField('shares', v)} error={errs.shares} width="min-w-[120px]" />
              <FieldNum label="Cost Basis" prefix="$" value={row.form.cost_basis} onChange={(v)=>onField('cost_basis', v)} error={errs.cost_basis} width="min-w-[140px]" />
              <FieldRO label="Current Price" prefix="$" value={row.form.price} placeholder="Auto" width="min-w-[130px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>onField('purchase_date', v)} error={errs.purchase_date} />
            </div>
          )}

          {row.type === 'crypto' && (
            <div className="flex flex-wrap gap-3">
              {AccountSelect}
              <FieldText label="Symbol" value={row.form.symbol} onChange={(v)=>onField('symbol', v.toUpperCase())} error={errs.symbol} rightIcon={<Search className="w-4 h-4 text-gray-400" />} width="min-w-[110px]" />
              <FieldRO label="Name" value={row.form.name} placeholder="Auto" width="min-w-[220px]" />
              <FieldNum label="Quantity" value={row.form.quantity} onChange={(v)=>onField('quantity', v)} error={errs.quantity} width="min-w-[120px]" />
              <FieldNum label="Buy Price" prefix="$" value={row.form.purchase_price} onChange={(v)=>onField('purchase_price', v)} error={errs.purchase_price} width="min-w-[130px]" />
              <FieldRO label="Current Price" prefix="$" value={row.form.current_price} placeholder="Auto" width="min-w-[130px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>onField('purchase_date', v)} error={errs.purchase_date} />
            </div>
          )}

          {row.type === 'metal' && (
            <div className="flex flex-wrap gap-3">
              {AccountSelect}
              <FieldText label="Metal" value={row.form.metal_type} onChange={(v)=>onField('metal_type', v)} error={errs.metal_type} width="min-w-[140px]" placeholder="Gold / Silver / …" />
              <FieldText label="Symbol" value={row.form.symbol} onChange={(v)=>onField('symbol', v.toUpperCase())} rightIcon={<Search className="w-4 h-4 text-gray-400" />} width="min-w-[110px]" />
              <FieldRO label="Market Name" value={row.form.name} placeholder="Auto" width="min-w-[220px]" />
              <FieldNum label="Qty" value={row.form.quantity} onChange={(v)=>onField('quantity', v)} error={errs.quantity} width="min-w-[100px]" />
              <FieldText label="Unit" value={row.form.unit || 'oz'} onChange={(v)=>onField('unit', v)} width="min-w-[80px]" />
              <FieldNum label="Price/Unit" prefix="$" value={row.form.purchase_price} onChange={(v)=>onField('purchase_price', v)} error={errs.purchase_price} width="min-w-[130px]" />
              <FieldRO label="Current/Unit" prefix="$" value={row.form.current_price_per_unit} placeholder="Auto" width="min-w-[130px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>onField('purchase_date', v)} error={errs.purchase_date} />
            </div>
          )}

          {row.type === 'cash' && (
            <div className="flex flex-wrap gap-3">
              {AccountSelect}
              <FieldText label="Type" value={row.form.cash_type} onChange={(v)=>onField('cash_type', v)} error={errs.cash_type} width="min-w-[140px]" placeholder="Savings / Checking / CD" />
              <FieldNum label="Amount" prefix="$" value={row.form.amount} onChange={(v)=>onField('amount', v)} error={errs.amount} width="min-w-[130px]" />
              <FieldNum label="APY" suffix="%" value={row.form.interest_rate} onChange={(v)=>onField('interest_rate', v)} width="min-w-[100px]" />
              <FieldText label="Period" value={row.form.interest_period || 'annually'} onChange={(v)=>onField('interest_period', v)} width="min-w-[120px]" />
              <FieldDate label="Maturity" value={row.form.maturity_date} onChange={(v)=>onField('maturity_date', v)} />
            </div>
          )}

          {row.type === 'other' && (
            <div className="flex flex-wrap gap-3">
              <FieldText label="Asset Name" value={row.form.asset_name} onChange={(v)=>onField('asset_name', v)} error={errs.asset_name} width="min-w-[220px]" />
              <FieldText label="Type" value={row.form.asset_type} onChange={(v)=>onField('asset_type', v)} error={errs.asset_type} width="min-w-[160px]" placeholder="real_estate / vehicle / …" />
              <FieldNum label="Purchase Price" prefix="$" value={row.form.cost} onChange={(v)=>onField('cost', v)} width="min-w-[150px]" />
              <FieldNum label="Current Value" prefix="$" value={row.form.current_value} onChange={(v)=>onField('current_value', v)} error={errs.current_value} width="min-w-[150px]" />
              <FieldDate label="Purchase Date" value={row.form.purchase_date} onChange={(v)=>onField('purchase_date', v)} />
              <FieldText label="Notes" value={row.form.notes} onChange={(v)=>onField('notes', v)} width="min-w-[240px]" placeholder="Optional" />
            </div>
          )}

          <div className="mt-2">{StatusBadge}</div>
        </div>
      </div>
    </div>
  );
};

const FieldText = ({ label, value, onChange, error, rightIcon, width='min-w-[180px]', placeholder } ) => (
  <div className={`flex-1 ${width}`}>
    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
    <div className="relative">
      <input
        type="text"
        value={value ?? ''}
        onChange={(e)=>onChange(e.target.value)}
        className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${error ? 'border-rose-300 bg-rose-50/50' : 'border-gray-300'}`}
        placeholder={placeholder}
      />
      {rightIcon && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightIcon}</span>}
    </div>
    {error && <Err />}
  </div>
);

const FieldNum = ({ label, value, onChange, error, width='min-w-[140px]', prefix, suffix }) => (
  <div className={`flex-1 ${width}`}>
    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e)=>onChange(e.target.value)}
        className={`w-full ${prefix?'pl-6':'pl-3'} ${suffix?'pr-6':'pr-3'} py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${error ? 'border-rose-300 bg-rose-50/50' : 'border-gray-300'}`}
      />
      {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>}
    </div>
    {error && <Err />}
  </div>
);

const FieldDate = ({ label, value, onChange, error }) => (
  <div className="flex-1 min-w-[160px]">
    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
    <input
      type="date"
      value={value || ''}
      onChange={(e)=>onChange(e.target.value)}
      className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${error ? 'border-rose-300 bg-rose-50/50' : 'border-gray-300'}`}
      max={new Date().toISOString().split('T')[0]}
    />
    {error && <Err />}
  </div>
);

const FieldRO = ({ label, value, prefix, placeholder='Auto', width='min-w-[180px]' }) => (
  <div className={`flex-1 ${width}`}>
    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
      <input
        type="text"
        disabled
        value={value ?? ''}
        placeholder={placeholder}
        className={`w-full ${prefix?'pl-6':'pl-3'} pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700`}
      />
    </div>
  </div>
);

const Err = ({ text = 'Required' }) => (
  <div className="mt-1 text-xs text-rose-600 flex items-center gap-1">
    <AlertTriangle className="w-3.5 h-3.5" />
    <span>{text}</span>
  </div>
);

// --- Convenience launcher button -------------------------------------------
// Drop-in button to open the AddQuickPositionModal with a single line.
// Usage:
//   <QuickAddPositionsButton
//     className="px-4 py-1 rounded-lg"
//     seedPositions={seedFromQuickStartOrNull}
//     onPositionsSaved={(count, payload) => console.log(count, payload)}
//     buttonLabel="Quick Add"
//   />
//
export const QuickAddPositionsButton = ({
  className = '',
  seedPositions = null,            // optional: pre-seeded rows (from QuickStart)
  onPositionsSaved,                // optional: (count, payload) => void
  buttonLabel = 'Quick Add',       // optional: button text
  onOpen,                          // optional: () => void
  onClose,                         // optional: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    onOpen?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`group relative flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-900/90 text-white py-1.5 px-4 transition-all duration-300 hover:shadow-md ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-green-400 group-hover:text-white transition-colors" />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">
            {buttonLabel}
          </span>
        </div>
      </button>

      <AddQuickPositionModal
        isOpen={isOpen}
        onClose={handleClose}
        seedPositions={seedPositions}
        onPositionsSaved={onPositionsSaved}
      />
    </>
  );
};

export default AddQuickPositionModal;