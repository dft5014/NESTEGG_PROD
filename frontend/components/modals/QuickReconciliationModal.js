// QuickReconciliationModal.js
// Best-in-class reconciliation flow with localStorage staging, robust institution mapping,
// two clear workflows, accurate deltas, and safe updates that mirror QuickEditDelete refresh patterns.

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  X, Building2, ArrowLeft, Save, Loader2, RefreshCw, AlertCircle, Check,
  DollarSign, CreditCard, ChevronRight, Package, LayoutDashboard, CheckCircle2, XCircle, Trash2
} from 'lucide-react';

import { useDataStore } from '@/store/DataStore';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useAccounts } from '@/store/hooks/useAccounts';

import {
  updateCashPosition,
  updateLiability,
  updateOtherAsset,
} from '@/utils/apimethods/positionMethods';

import { formatCurrency } from '@/utils/formatters';

// -------------------------------
// Configuration / Feature flags
// -------------------------------
const FEATURES = {
  showLiabilities: true,     // set false to focus only on cash for bank tie-outs
  showOtherAssets: true,     // set false if “Other Assets” shouldn’t appear as a synthetic group
};

// -------------------------------
// Local Storage Queue Helpers
// -------------------------------
const LS_KEY = 'nestegg_recon_queue_v1';
const qKey = (type, id) => `${type}:${id}`;

const loadQueue = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
};
const saveQueue = (q) => { try { localStorage.setItem(LS_KEY, JSON.stringify(q)); } catch {} };

// -------------------------------
// Lightweight Modal Shell (dark UI)
// -------------------------------
const ModalShell = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="w-full max-w-5xl bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-h-[76vh] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------
// Main Component
// -------------------------------
const QuickReconciliationModal = ({ isOpen, onClose }) => {
  // Data hooks (mirror QuickEditDelete)
  const { positions: detailedPositions, refresh: refreshPositions } = useDetailedPositions();
  const { liabilities: groupedLiabilities } = useGroupedLiabilities();
  const { accounts } = useAccounts();
  const { actions } = useDataStore();

  // Views: home | institutions | reconcile
  const [view, setView] = useState('home');
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  // Local queue persisted to storage
  const [queue, setQueue] = useState({});
  useEffect(() => { if (isOpen) setQueue(loadQueue()); }, [isOpen]);
  useEffect(() => { saveQueue(queue); }, [queue]);

  // UX state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState(null);
  const bannerTimer = useRef(null);

  const showBanner = useCallback((type, text, ttl = 3500) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner({ type, text });
    if (ttl > 0) bannerTimer.current = setTimeout(() => setBanner(null), ttl);
  }, []);
  useEffect(() => () => bannerTimer.current && clearTimeout(bannerTimer.current), []);

  // ---------------------------------
  // Resilient mapping helpers
  // ---------------------------------
  const accountById = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach(a => map.set(a.id, a));
    return map;
  }, [accounts]);

  const normalizeType = (raw) => {
    const t = (raw || '').toString().toLowerCase().trim();
    if (t === 'cash') return 'cash';
    if (['other_asset','other_assets','real_estate','vehicle','collectible','jewelry','art','equipment','other'].includes(t)) {
      return 'other';
    }
    return t; // liabilities handled separately via hook
  };

  // ---------------------------------
  // Build institution groups
  // ---------------------------------
  const institutionGroups = useMemo(() => {
    const groups = {};

    // Cash from positions
    const cashPositions = (detailedPositions || []).filter(p => normalizeType(p.assetType ?? p.asset_type) === 'cash');

    cashPositions.forEach(p => {
      const acct = p.accountId ? accountById.get(p.accountId) : null;
      const institution =
        (p.institution && String(p.institution).trim()) ||
        (acct?.institution && String(acct.institution).trim()) ||
        'Unknown Institution';

      if (!groups[institution]) {
        groups[institution] = {
          name: institution,
          cash: [],
          liabilities: [],
          otherAssets: [],
          totalCash: 0,
          totalLiab: 0,
          totalOther: 0,
        };
      }

      const row = {
        id: p.itemId ?? p.id, // must use itemId for updates
        name: p.name || p.identifier || 'Cash',
        accountName: p.accountName || acct?.name || 'Unknown Account',
        currentValue: Number(p.currentValue || 0),
        accountId: p.accountId || null,
        institution,
      };

      groups[institution].cash.push(row);
      groups[institution].totalCash += row.currentValue;
    });

    // Liabilities (optional)
    if (FEATURES.showLiabilities && Array.isArray(groupedLiabilities) && groupedLiabilities.length > 0) {
      groupedLiabilities.forEach(l => {
        const institution =
          (l.institution_name && String(l.institution_name).trim()) || 'Unknown Institution';
        if (!groups[institution]) {
          groups[institution] = {
            name: institution,
            cash: [],
            liabilities: [],
            otherAssets: [],
            totalCash: 0,
            totalLiab: 0,
            totalOther: 0,
          };
        }
        const row = {
          id: l.id,
          name: l.name,
          currentBalance: Number(l.total_current_balance ?? l.current_balance ?? 0),
          liabilityType: l.liability_type,
        };
        groups[institution].liabilities.push(row);
        groups[institution].totalLiab += row.currentBalance;
      });
    }

    // Other Assets (synthetic group)
    if (FEATURES.showOtherAssets) {
      const otherAssets = (detailedPositions || []).filter(
        p => normalizeType(p.assetType ?? p.asset_type) === 'other'
      );
      if (otherAssets.length > 0) {
        const groupName = 'Other Assets';
        if (!groups[groupName]) {
          groups[groupName] = {
            name: groupName,
            cash: [],
            liabilities: [],
            otherAssets: [],
            totalCash: 0,
            totalLiab: 0,
            totalOther: 0,
          };
        }
        otherAssets.forEach(p => {
          const row = {
            id: p.itemId ?? p.id,
            name: p.name || p.identifier || 'Asset',
            accountName: p.accountName || 'Other Assets',
            currentValue: Number(p.currentValue || 0),
            assetType: p.assetType ?? p.asset_type,
          };
          groups[groupName].otherAssets.push(row);
          groups[groupName].totalOther += row.currentValue;
        });
      }
    }

    return groups;
  }, [detailedPositions, groupedLiabilities, accountById]);

  const isLoading = !detailedPositions || !accounts;

  // ---------------------------------
  // Queue integration
  // ---------------------------------
  const setStaged = (type, id, val) => {
    setQueue(prev => ({ ...prev, [qKey(type, id)]: { value: val } }));
  };

  const clearQueue = () => {
    setQueue({});
    showBanner('info', 'Local reconciliation queue cleared.');
  };

  // ---------------------------------
  // Calculations
  // ---------------------------------
  const calcDelta = (currentValue, stagedVal) => {
    if (stagedVal === '' || stagedVal === undefined) return { hasValue: false, delta: 0, pct: 0 };
    const current = Number(currentValue || 0);
    const statement = Number(stagedVal || 0);
    const delta = statement - current;
    const pct = current !== 0 ? (delta / current) * 100 : 0;
    return { hasValue: true, delta, pct };
  };

  const enterInstitution = (inst) => {
    setSelectedInstitution(inst);
    setView('reconcile');

    // Prefill queue (non-destructive)
    const g = institutionGroups[inst];
    if (!g) return;

    setQueue(prev => {
      const next = { ...prev };
      g.cash.forEach(pos => {
        const k = qKey('cash', pos.id);
        if (!(k in next)) next[k] = { value: pos.currentValue };
      });
      if (FEATURES.showLiabilities) {
        g.liabilities.forEach(li => {
          const k = qKey('liability', li.id);
          if (!(k in next)) next[k] = { value: li.currentBalance };
        });
      }
      if (FEATURES.showOtherAssets) {
        g.otherAssets.forEach(a => {
          const k = qKey('other', a.id);
          if (!(k in next)) next[k] = { value: a.currentValue };
        });
      }
      return next;
    });
  };

  const exitInstitution = () => {
    setSelectedInstitution(null);
    setView('institutions');
  };

  const institutionRows = useMemo(() => {
    if (!selectedInstitution) return { cash: [], liabilities: [], other: [], totals: { delta: 0 } };
    const g = institutionGroups[selectedInstitution];
    if (!g) return { cash: [], liabilities: [], other: [], totals: { delta: 0 } };

    const rowsCash = g.cash.map(p => {
      const staged = queue[qKey('cash', p.id)]?.value;
      const { hasValue, delta, pct } = calcDelta(p.currentValue, staged);
      const changed = hasValue && Number(staged) !== Number(p.currentValue);
      return { ...p, staged, delta, pct, changed };
    });

    const rowsLiab = FEATURES.showLiabilities ? g.liabilities.map(l => {
      const staged = queue[qKey('liability', l.id)]?.value;
      const { hasValue, delta, pct } = calcDelta(l.currentBalance, staged);
      const changed = hasValue && Number(staged) !== Number(l.currentBalance);
      return { ...l, staged, delta, pct, changed };
    }) : [];

    const rowsOther = FEATURES.showOtherAssets ? g.otherAssets.map(a => {
      const staged = queue[qKey('other', a.id)]?.value;
      const { hasValue, delta, pct } = calcDelta(a.currentValue, staged);
      const changed = hasValue && Number(staged) !== Number(a.currentValue);
      return { ...a, staged, delta, pct, changed };
    }) : [];

    // Net: cash (+), liabilities (-), other assets (+)
    const totalDelta =
      rowsCash.reduce((s, r) => s + (r.staged === '' || r.staged === undefined ? 0 : r.delta), 0)
      - rowsLiab.reduce((s, r) => s + (r.staged === '' || r.staged === undefined ? 0 : r.delta), 0)
      + rowsOther.reduce((s, r) => s + (r.staged === '' || r.staged === undefined ? 0 : r.delta), 0);

    return { cash: rowsCash, liabilities: rowsLiab, other: rowsOther, totals: { delta: totalDelta } };
  }, [selectedInstitution, institutionGroups, queue]);

  const anyChanges =
    institutionRows.cash.some(r => r.changed) ||
    institutionRows.liabilities.some(r => r.changed) ||
    institutionRows.other.some(r => r.changed);

  // ---------------------------------
  // Submit Updates (institution-scoped)
  // ---------------------------------
  const handleUpdateAll = async () => {
    if (!selectedInstitution) return;
    const g = institutionGroups[selectedInstitution];
    if (!g) return;

    const updates = [];

    // Cash
    for (const r of institutionRows.cash) {
      if (r.changed) {
        updates.push(updateCashPosition(r.id, { amount: Number(r.staged) }));
      }
    }
    // Liabilities (optional)
    if (FEATURES.showLiabilities) {
      for (const r of institutionRows.liabilities) {
        if (r.changed && typeof updateLiability === 'function') {
          updates.push(updateLiability(r.id, { current_balance: Number(r.staged) }));
        }
      }
    }
    // Other assets (optional)
    if (FEATURES.showOtherAssets) {
      for (const r of institutionRows.other) {
        if (r.changed && typeof updateOtherAsset === 'function') {
          updates.push(updateOtherAsset(Number(r.id), { current_value: Number(r.staged) }));
        }
      }
    }

    if (updates.length === 0) {
      showBanner('warning', 'No changes to update.');
      return;
    }

    setIsSubmitting(true);
    let ok = 0, fail = 0;

    for (const u of updates) {
      try { await u; ok++; } catch (e) { console.error(e); fail++; }
    }

    // Robust refresh (mirror QuickEditDelete)
    try {
      await Promise.all([
        (typeof refreshPositions === 'function' ? refreshPositions() : Promise.resolve()),
        actions?.fetchGroupedPositionsData?.(true),
        actions?.fetchPortfolioData?.(true),
      ]);
    } catch (e) {
      console.warn('Post-update refresh encountered issues but will not block UX.', e);
    }

    setIsSubmitting(false);

    if (fail === 0) {
      showBanner('success', `Updated ${ok} item${ok !== 1 ? 's' : ''}.`);
      exitInstitution();
    } else {
      showBanner('warning', `Updated ${ok}, failed ${fail}. Review console for details.`);
    }
  };

  // ---------------------------------
  // Views
  // ---------------------------------
  const Home = () => {
    // Stats
    const groups = Object.values(institutionGroups);
    const totalInstitutions = groups.filter(g => g.cash.length + g.liabilities.length + g.otherAssets.length > 0).length;
    const totalCashPositions = groups.reduce((s, g) => s + g.cash.length, 0);
    const totalLiabilities = groups.reduce((s, g) => s + g.liabilities.length, 0);
    const totalOtherAssets = groups.reduce((s, g) => s + g.otherAssets.length, 0);
    const totalPositions = totalCashPositions + totalLiabilities + totalOtherAssets;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Quick Reconciliation</h3>
          <p className="text-gray-400">Tie out balances fast and accurately with staged edits.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Positions" value={totalPositions} tone="blue" icon={<TrendingIcon />} />
          <StatCard label="Institutions" value={totalInstitutions} tone="green" icon={<Building2 className="w-8 h-8 opacity-50" />} />
          <StatCard label="Cash & Assets" value={totalCashPositions + totalOtherAssets} tone="purple" icon={<DollarSign className="w-8 h-8 opacity-50" />} />
          <StatCard label="Liabilities" value={totalLiabilities} tone="orange" icon={<CreditCard className="w-8 h-8 opacity-50" />} />
        </div>

        {/* Workflows */}
        <div className="space-y-3">
          <PrimaryCTA
            onClick={() => setView('institutions')}
            title="Quick Balance Update"
            subtitle="Update cash, liabilities, and other assets by institution"
            icon={<DollarSign className="w-5 h-5 text-white" />}
          />
          <SecondaryCTA
            onClick={() => showBanner('info', 'Full-account sign-off will sync to backend in a later iteration. For now, use staged edits and update per institution.')}
            title="Full Account Reconciliation"
            subtitle="Coming soon — institution sign-off and audit trail"
            icon={<LayoutDashboard className="w-5 h-5 text-white" />}
          />
        </div>

        {/* Queue controls */}
        <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-xl p-3">
          <div className="text-sm text-gray-300">
            Staged edits in local queue: <strong>{Object.keys(queue).length}</strong>
          </div>
          <button
            onClick={clearQueue}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-600 hover:bg-gray-700 text-gray-200 inline-flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear Local Queue
          </button>
        </div>
      </div>
    );
  };

  const Institutions = () => {
    const list = Object.entries(institutionGroups).filter(([_, g]) =>
      g.cash.length > 0 || g.liabilities.length > 0 || g.otherAssets.length > 0
    );

    if (list.length === 0) {
      return (
        <div className="p-10 text-center text-gray-400 bg-gray-800/40 rounded-xl border border-gray-700">
          No positions found.
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <button
          onClick={() => setView('home')}
          className="inline-flex items-center text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Overview
        </button>

        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Select Institution to Reconcile</h3>
          <p className="text-sm text-gray-400 mb-3">Choose an institution or “Other Assets” to update.</p>
        </div>

        <div className="space-y-3">
          {list.map(([name, g]) => {
            const isOther = name === 'Other Assets';
            const totalValue = g.totalCash + g.totalOther - g.totalLiab; // simple snapshot
            return (
              <button
                key={name}
                onClick={() => enterInstitution(name)}
                className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-700/50 hover:border-gray-600 text-left group transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                      isOther ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {isOther ? <Package className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-white">{name}</p>
                      <p className="text-sm text-gray-400">
                        {g.cash.length > 0 && `${g.cash.length} cash`}
                        {g.liabilities.length > 0 && `${g.cash.length > 0 ? ', ' : ''}${g.liabilities.length} liabilities`}
                        {g.otherAssets.length > 0 && `${(g.cash.length > 0 || g.liabilities.length > 0) ? ', ' : ''}${g.otherAssets.length} assets`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${totalValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalValue >= 0 ? '+' : ''}{formatCurrency(totalValue)}
                    </p>
                    <ChevronRight className="w-5 h-5 text-gray-500 mt-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const Reconcile = () => {
    const g = institutionGroups[selectedInstitution];
    if (!g) return null;

    const netDelta = institutionRows.totals.delta;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={exitInstitution}
            className="inline-flex items-center text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Institutions
          </button>
          {anyChanges && (
            <div className="inline-flex items-center text-sm text-amber-400">
              <AlertCircle className="w-4 h-4 mr-1" /> Unsaved changes
            </div>
          )}
        </div>

        {/* Instance header */}
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            {selectedInstitution === 'Other Assets' ? (
              <Package className="w-5 h-5 mr-2 text-purple-400" />
            ) : (
              <Building2 className="w-5 h-5 mr-2 text-blue-400" />
            )}
            {selectedInstitution}
          </h3>
          <p className="text-sm text-gray-400 mt-1">Enter statement values and commit when ready.</p>
        </div>

        {/* Cash */}
        {g.cash.length > 0 && (
          <SectionTable
            title="Cash Positions"
            titleIcon={<DollarSign className="w-4 h-4 mr-2 text-emerald-400" />}
            rows={institutionRows.cash}
            type="cash"
            setStaged={setStaged}
          />
        )}

        {/* Liabilities */}
        {FEATURES.showLiabilities && g.liabilities.length > 0 && (
          <SectionTable
            title="Liabilities"
            titleIcon={<CreditCard className="w-4 h-4 mr-2 text-rose-400" />}
            rows={institutionRows.liabilities}
            type="liability"
            setStaged={setStaged}
            invertColors // positive delta = worse (red), negative = paydown (green)
          />
        )}

        {/* Other Assets */}
        {FEATURES.showOtherAssets && g.otherAssets.length > 0 && (
          <SectionTable
            title="Other Assets"
            titleIcon={<Package className="w-4 h-4 mr-2 text-purple-400" />}
            rows={institutionRows.other}
            type="other"
            setStaged={setStaged}
          />
        )}

        {/* Net Summary */}
        {(
          institutionRows.cash.some(r => r.staged !== '' && r.staged !== undefined) ||
          institutionRows.liabilities.some(r => r.staged !== '' && r.staged !== undefined) ||
          institutionRows.other.some(r => r.staged !== '' && r.staged !== undefined)
        ) && (
          <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Net Change:</span>
              <span className={`text-xl font-bold ${
                netDelta > 0 ? 'text-emerald-400' : netDelta < 0 ? 'text-rose-400' : 'text-gray-400'
              }`}>
                {netDelta > 0 ? '+' : ''}{formatCurrency(netDelta)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={exitInstitution}
            className="px-5 py-2 text-sm rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateAll}
            disabled={!anyChanges || isSubmitting}
            className={`px-5 py-2 text-sm rounded-lg text-white inline-flex items-center ${
              (!anyChanges || isSubmitting) ? 'bg-gray-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Update NestEgg Balances
          </button>
        </div>
      </div>
    );
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Quick Reconciliation">
      {/* Banner */}
      {banner && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg flex items-start gap-2 border ${
            banner.type === 'success'
              ? 'bg-emerald-900/30 text-emerald-200 border-emerald-700'
              : banner.type === 'error'
                ? 'bg-rose-900/30 text-rose-200 border-rose-700'
                : banner.type === 'warning'
                  ? 'bg-amber-900/30 text-amber-200 border-amber-700'
                  : 'bg-blue-900/30 text-blue-200 border-blue-700'
          }`}
        >
          {banner.type === 'success' && <CheckCircle2 className="w-5 h-5 mt-[2px]" />}
          {banner.type === 'error' && <XCircle className="w-5 h-5 mt-[2px]" />}
          {banner.type === 'warning' && <AlertCircle className="w-5 h-5 mt-[2px]" />}
          <span className="text-sm">{banner.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
          Loading data…
        </div>
      ) : (
        <>
          {view === 'home' && <Home />}
          {view === 'institutions' && <Institutions />}
          {view === 'reconcile' && <Reconcile />}
        </>
      )}
    </ModalShell>
  );
};

// -------------------------------
// Small presentational components
// -------------------------------
const StatCard = ({ label, value, tone, icon }) => {
  const tones = {
    blue:   'from-blue-900/20 to-blue-800/10',
    green:  'from-emerald-900/20 to-emerald-800/10',
    purple: 'from-purple-900/20 to-purple-800/10',
    orange: 'from-orange-900/20 to-orange-800/10',
  };
  return (
    <div className={`bg-gradient-to-br ${tones[tone]} rounded-xl p-4 border border-gray-800`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium text-gray-300`}>{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="text-gray-500">{icon}</div>
      </div>
    </div>
  );
};

const TrendingIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </svg>
);

const PrimaryCTA = ({ onClick, title, subtitle, icon }) => (
  <button
    onClick={onClick}
    className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-0.5 hover:shadow-lg"
  >
    <div className="relative flex items-center justify-between rounded-xl bg-gray-900 px-6 py-4 group-hover:bg-opacity-90">
      <div className="flex items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
          {icon}
        </div>
        <div className="ml-4 text-left">
          <p className="font-semibold text-white">{title}</p>
          <p className="text-sm text-gray-300">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 transition-transform group-hover:translate-x-1" />
    </div>
  </button>
);

const SecondaryCTA = ({ onClick, title, subtitle, icon }) => (
  <button
    onClick={onClick}
    className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 p-0.5 hover:shadow-lg opacity-90"
  >
    <div className="relative flex items-center justify-between rounded-xl bg-gray-900 px-6 py-4">
      <div className="flex items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
          {icon}
        </div>
        <div className="ml-4 text-left">
          <p className="font-semibold text-white">{title}</p>
          <p className="text-sm text-gray-300">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </div>
  </button>
);

const SectionTable = ({ title, titleIcon, rows, type, setStaged, invertColors = false }) => (
  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
    <div className="px-4 py-3 bg-gray-800/70 border-b border-gray-700 flex items-center">
      <h4 className="text-sm font-medium text-gray-300 flex items-center">
        {titleIcon}{title}
      </h4>
    </div>
    <table className="w-full">
      <thead className="bg-gray-800/50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">NestEgg</th>
          <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Statement</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Δ</th>
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">%Δ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-700">
        {rows.map(r => {
          const deltaColor = (() => {
            if (r.staged === '' || r.staged === undefined) return 'text-gray-400';
            const positive = r.delta > 0;
            if (invertColors) {
              // liabilities: higher balance (worse) = red
              return positive ? 'text-rose-400' : r.delta < 0 ? 'text-emerald-400' : 'text-gray-400';
            }
            return positive ? 'text-emerald-400' : r.delta < 0 ? 'text-rose-400' : 'text-gray-400';
          })();

          return (
            <tr key={`${type}-${r.id}`} className={r.changed ? 'bg-blue-900/10' : ''}>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-200">{r.name}</div>
                {'accountName' in r && <div className="text-xs text-gray-500">{r.accountName}</div>}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-medium text-gray-300">
                  {formatCurrency('currentValue' in r ? r.currentValue : r.currentBalance)}
                </span>
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={r.staged === undefined ? '' : r.staged}
                  onChange={(e) => setStaged(type, r.id, e.target.value)}
                  placeholder="0.00"
                  className={`w-full px-3 py-1.5 text-sm text-right bg-gray-700 border rounded-lg text-gray-200 placeholder-gray-500 focus:ring-2 focus:border-transparent ${
                    r.changed ? 'border-blue-400 focus:ring-blue-500' : 'border-gray-600 focus:ring-gray-500'
                  }`}
                  aria-label={`Statement value for ${r.name}`}
                />
              </td>
              <td className={`px-4 py-3 text-right font-medium ${deltaColor}`}>
                {r.staged === '' || r.staged === undefined ? '—' : `${r.delta > 0 ? '+' : ''}${formatCurrency(r.delta)}`}
              </td>
              <td className={`px-4 py-3 text-right ${deltaColor}`}>
                {r.staged === '' || r.staged === undefined ? '—' : `${r.pct > 0 ? '+' : ''}${r.pct.toFixed(1)}%`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// -------------------------------
// Exported Navbar Button
// -------------------------------
export const QuickReconciliationButton = ({ className = '', label = 'Reconcile' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors ${className}`}
      >
        <RefreshCw className="w-4 h-4" />
        <span>{label}</span>
      </button>
      <QuickReconciliationModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default QuickReconciliationModal;