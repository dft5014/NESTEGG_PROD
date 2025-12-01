// Hook for managing data in the Update Modal
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { popularBrokerages } from '@/utils/constants';

const OTHER_INST = 'Other Assets';

// Detection patterns
const isSecurityish = /(stock|equity|etf|fund|mutual|option|bond|crypto|security|shares?|metal|gold|silver|bullion)/i;
const isCashLikeWord = /(cash|checking|savings|mm|money\s?market|hysa|cd|certificate|sweep|settlement|brokerage\s?cash)/i;
const isLiabilityish = /(loan|mortgage|credit|debt|liab|card|payable|auto|student|heloc|loc)/i;

const OTHER_ITEM_TYPES = new Set([
  'other', 'vehicle', 'real_estate', 'collectible', 'art', 'jewelry', 'business'
]);

/**
 * Hook for managing all update data from DataStore
 */
export const useUpdateData = (isOpen) => {
  const { state, actions } = useDataStore();
  const { groupedLiabilities } = state || {};

  const {
    accounts = [],
    loading: accountsLoading,
    refresh: refreshAccounts
  } = useAccounts();

  const {
    positions: rawPositions = [],
    loading: positionsLoading,
    refresh: refreshPositions
  } = useDetailedPositions();

  const liabsLoading = groupedLiabilities?.loading;

  // Ensure liabilities are fetched
  useEffect(() => {
    if (isOpen && !groupedLiabilities?.lastFetched && !groupedLiabilities?.loading) {
      actions?.fetchGroupedLiabilitiesData?.();
    }
  }, [isOpen, groupedLiabilities?.lastFetched, groupedLiabilities?.loading, actions]);

  // Logo map for institutions
  const logoMap = useMemo(() => {
    const m = new Map();
    for (const b of popularBrokerages || []) {
      if (b?.name) m.set(String(b.name).toLowerCase(), b.logo || null);
    }
    return m;
  }, []);

  const getInstitutionLogo = useCallback((name) => {
    if (!name) return null;
    return logoMap.get(String(name).toLowerCase()) || null;
  }, [logoMap]);

  // Account map for institution normalization
  const accountById = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach(a => m.set(String(a.id), a));
    return m;
  }, [accounts]);

  const normalizeInstitution = useCallback((rawInst, accountId, type) => {
    const fromAcct = accountById.get(String(accountId))?.institution;
    const base = (fromAcct || rawInst || '').trim();
    if (base) return base;
    if (String(type || '').toLowerCase() === 'other') return OTHER_INST;
    return OTHER_INST;
  }, [accountById]);

  // Determine if position is cash-like
  const isCashLike = useCallback((pos) => {
    const t = String(pos.type || '').toLowerCase();
    const n = `${pos.name || ''} ${pos.identifier || ''} ${pos.inv_account_name || ''}`.toLowerCase();
    if (isSecurityish.test(n)) return false;
    if (['cash', 'checking', 'savings', 'money_market', 'mm', 'sweep', 'deposit'].includes(t)) return true;
    return isCashLikeWord.test(n);
  }, []);

  // Determine if position is "other asset"
  const isOtherAsset = useCallback((p) => {
    const t = String(p.type || '').toLowerCase();
    const ds = String(p.data_source || '').toLowerCase();
    if (ds === 'other_asset') return true;
    if (OTHER_ITEM_TYPES.has(t)) return true;
    const nm = `${p.name || ''} ${p.identifier || ''}`.toLowerCase();
    if (!t && !isSecurityish.test(nm)) return true;
    return false;
  }, []);

  // Normalize all positions
  const allPositions = useMemo(() => {
    return (rawPositions || []).map((p) => {
      const data_source = p.data_source ?? p.source ?? p.dataSource ?? null;
      const id = p.itemId ?? p.item_id ?? p.id;
      const accountId = p.accountId ?? p.inv_account_id ?? p.account_id;
      const type = String(p.assetType ?? p.item_type ?? p.asset_type ?? p.position_type ?? '').toLowerCase();
      const name = p.name ?? p.identifier ?? 'Unnamed';
      const currentValue = Number(p.currentValue ?? p.current_value ?? 0);
      const institution = normalizeInstitution(p.institution, accountId, type);
      const identifier = p.identifier ?? p.symbol ?? '';
      const inv_account_name = p.inv_account_name ?? p.accountName ?? p.account_name ?? '';
      const last_update = p.balance_last_updated ?? p.last_update ?? p.balanceLastUpdated ?? null;
      return {
        id, accountId, institution, type, name, currentValue,
        identifier, inv_account_name, last_update, data_source
      };
    });
  }, [rawPositions, normalizeInstitution]);

  // Process liabilities
  const liabilities = useMemo(() => {
    return (groupedLiabilities?.data || []).map((L) => {
      const details = L.liability_details || {};
      const id = details.liability_id || details.item_id || L.item_id ||
                 L.liability_id || L.id || L.history_id;
      const t = (L.liability_type || L.item_type || L.type || 'liability').toLowerCase();
      const val = Number(L.total_current_balance ?? L.current_balance ?? L.balance ?? 0);
      const accountId = L.inv_account_id ?? L.account_id ?? null;
      const inst = normalizeInstitution(L.institution, accountId, t);
      const last_update = L.balance_last_updated ?? details.balance_last_updated ??
                         L.last_update ?? L.updated_at ?? null;

      return {
        id,
        institution: inst || OTHER_INST,
        name: L.name || L.identifier || 'Liability',
        identifier: L.identifier || '',
        type: t,
        liability_type: t,
        currentValue: val,
        inv_account_name: L.inv_account_name ?? L.account_name ?? '',
        last_update,
        interest_rate: L.interest_rate || L.weighted_avg_interest_rate || null,
        credit_limit: L.credit_limit || L.total_credit_limit || null
      };
    });
  }, [groupedLiabilities?.data, normalizeInstitution]);

  // Create signature set for de-duplication
  const liabilitySigSet = useMemo(() => {
    const s = new Set();
    for (const l of liabilities) {
      const inst = (l.institution || '').toLowerCase();
      const id = (l.identifier || '').toLowerCase();
      const nm = (l.name || '').toLowerCase();
      if (inst && id) s.add(`${inst}::id::${id}`);
      if (inst && nm) s.add(`${inst}::nm::${nm}`);
    }
    return s;
  }, [liabilities]);

  // Filter cash assets
  const cashAssets = useMemo(() => {
    return allPositions.filter(isCashLike);
  }, [allPositions, isCashLike]);

  // Filter other assets
  const otherAssets = useMemo(() => {
    return allPositions
      .map(p => ({ ...p, institution: normalizeInstitution(p.institution, p.accountId, p.type) || OTHER_INST }))
      .filter(p => {
        const inst = (p.institution || '').toLowerCase();
        const id = (p.identifier || '').toLowerCase();
        const nm = (p.name || '').toLowerCase();

        const notInLiabs =
          !liabilitySigSet.has(`${inst}::id::${id}`) &&
          !liabilitySigSet.has(`${inst}::nm::${nm}`);

        if (!isOtherAsset(p)) return false;
        if (!notInLiabs) return false;
        if (isLiabilityish.test(nm) || isLiabilityish.test(String(p.type || ''))) return false;
        if (isSecurityish.test(nm) || isSecurityish.test(id)) return false;

        return true;
      });
  }, [allPositions, normalizeInstitution, liabilitySigSet, isOtherAsset]);

  // Build unified rows
  const rows = useMemo(() => {
    const makeRowKey = (kind, r) => `${kind}:${r.id ?? r.identifier ?? r.name}:${r.institution}`;

    const aRows = cashAssets.map(a => ({
      _kind: 'cash',
      _key: makeRowKey('cash', a),
      id: a.id,
      institution: a.institution || OTHER_INST,
      name: a.name || 'Account',
      sub: a.inv_account_name || '',
      identifier: a.identifier || '',
      type: a.type || '',
      currentValue: Number(a.currentValue || 0),
      lastUpdate: a.last_update ?? null
    }));

    const lRows = liabilities.map(l => ({
      _kind: 'liability',
      _key: makeRowKey('liability', l),
      id: l.id,
      institution: l.institution || OTHER_INST,
      name: l.name || 'Liability',
      sub: l.inv_account_name || '',
      identifier: l.identifier || '',
      type: String(l.type || ''),
      currentValue: Number(l.currentValue || 0),
      lastUpdate: l.last_update ?? null,
      interestRate: l.interest_rate,
      creditLimit: l.credit_limit
    }));

    const oRows = otherAssets.map(o => ({
      _kind: 'other',
      _key: makeRowKey('other', o),
      id: o.id,
      institution: o.institution || OTHER_INST,
      name: o.name || 'Other Asset',
      sub: o.inv_account_name || '',
      identifier: o.identifier || '',
      type: o.type || 'other',
      currentValue: Number(o.currentValue || 0),
      lastUpdate: o.last_update ?? null
    }));

    // Deduplicate
    const uniq = new Map();
    for (const r of [...aRows, ...lRows, ...oRows]) {
      if (!uniq.has(r._key)) uniq.set(r._key, r);
    }
    return Array.from(uniq.values());
  }, [cashAssets, liabilities, otherAssets]);

  // Build position drilldown by institution (cash + other only)
  const positionsByInstitution = useMemo(() => {
    const map = new Map();

    // Add cash assets
    cashAssets.forEach(p => {
      const inst = p.institution || OTHER_INST;
      if (!map.has(inst)) map.set(inst, []);
      map.get(inst).push({
        id: p.id,
        name: p.name || p.identifier || 'Position',
        identifier: p.identifier || '',
        type: p.type || 'cash',
        value: Number(p.currentValue || 0),
        accountName: p.inv_account_name || ''
      });
    });

    // Add other assets
    otherAssets.forEach(p => {
      const inst = p.institution || OTHER_INST;
      if (!map.has(inst)) map.set(inst, []);
      map.get(inst).push({
        id: p.id,
        name: p.name || p.identifier || 'Position',
        identifier: p.identifier || '',
        type: p.type || 'other',
        value: Number(p.currentValue || 0),
        accountName: p.inv_account_name || ''
      });
    });

    // Sort each institution's positions by value
    Array.from(map.values()).forEach(list =>
      list.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    );

    return map;
  }, [cashAssets, otherAssets]);

  // Build liability drilldown by institution
  const liabilitiesByInstitution = useMemo(() => {
    const map = new Map();

    liabilities.forEach(l => {
      const inst = l.institution || OTHER_INST;
      if (!map.has(inst)) map.set(inst, []);
      map.get(inst).push({
        id: l.id,
        name: l.name || 'Liability',
        identifier: l.identifier || '',
        type: l.type || 'liability',
        value: Number(l.currentValue || 0),
        accountName: l.inv_account_name || '',
        interestRate: l.interest_rate,
        creditLimit: l.credit_limit
      });
    });

    // Sort by value
    Array.from(map.values()).forEach(list =>
      list.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    );

    return map;
  }, [liabilities]);

  // Build institution summaries
  const institutionSummaries = useMemo(() => {
    const map = new Map();

    const ensure = (inst) => {
      if (!map.has(inst)) {
        map.set(inst, {
          institution: inst,
          logo: getInstitutionLogo(inst),
          cashValue: 0,
          liabilityValue: 0,
          otherValue: 0,
          cashCount: 0,
          liabilityCount: 0,
          otherCount: 0
        });
      }
      return map.get(inst);
    };

    rows.forEach(r => {
      const g = ensure(r.institution);
      const val = Math.abs(r.currentValue);

      if (r._kind === 'cash') {
        g.cashValue += val;
        g.cashCount += 1;
      } else if (r._kind === 'liability') {
        g.liabilityValue += val;
        g.liabilityCount += 1;
      } else {
        g.otherValue += val;
        g.otherCount += 1;
      }
    });

    return Array.from(map.values())
      .map(g => ({
        ...g,
        netValue: g.cashValue + g.otherValue - g.liabilityValue,
        totalAbsValue: g.cashValue + g.otherValue + g.liabilityValue,
        totalCount: g.cashCount + g.liabilityCount + g.otherCount
      }))
      .sort((a, b) => b.totalAbsValue - a.totalAbsValue);
  }, [rows, getInstitutionLogo]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshPositions?.(),
      refreshAccounts?.(),
      actions?.fetchGroupedLiabilitiesData?.(true)
    ]);
  }, [refreshPositions, refreshAccounts, actions]);

  // Calculate totals
  const totals = useMemo(() => {
    let cash = 0, liab = 0, other = 0;
    for (const r of rows) {
      if (r._kind === 'cash') cash += r.currentValue;
      else if (r._kind === 'liability') liab += r.currentValue;
      else other += r.currentValue;
    }
    return {
      cash,
      liabilities: liab,
      other,
      assets: cash + other,
      net: cash + other - liab,
      totalCount: rows.length
    };
  }, [rows]);

  return {
    // Data
    rows,
    accounts,
    cashAssets,
    liabilities,
    otherAssets,
    institutionSummaries,
    totals,

    // Drilldown data
    positionsByInstitution,
    liabilitiesByInstitution,

    // Loading states
    loading: accountsLoading || positionsLoading || liabsLoading,
    accountsLoading,
    positionsLoading,
    liabsLoading,

    // Refresh
    refreshAllData,

    // Utilities
    getInstitutionLogo,
    normalizeInstitution
  };
};

export default useUpdateData;
