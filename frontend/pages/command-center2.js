// pages/command-center2.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  DollarSign, Wallet, Activity, Gift, Percent, ArrowUp, ArrowDown,
  LineChart as LineChartIcon, Banknote, Coins, Package, Home,
  MinusCircle, Building2, RefreshCw, Calendar, Filter, Layers
} from 'lucide-react';

import { useDataStore } from '@/store/DataStore';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useAccounts } from '@/store/hooks/useAccounts';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';

// ---- Palette (dark theme friendly)
const assetColors = {
  securities: '#4f46e5', // Indigo
  cash: '#10b981',       // Emerald
  crypto: '#8b5cf6',     // Purple
  metals: '#f59e0b',     // Amber
  other_assets: '#6b7280', // Gray
  other: '#6b7280'
};

const liabilityColors = {
  mortgage: '#7c2d12',
  credit_card: '#dc2626',
  auto_loan: '#f97316',
  personal_loan: '#ea580c',
  student_loan: '#fb923c',
  home_equity: '#995a00',
  other: '#9ca3af'
};

// ---- Small UI helpers
const fmtCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
};
const fmtPct = (v) => (v === null || v === undefined || Number.isNaN(v) ? '0.00%' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`);
const chip = (active) =>
  `px-3 py-1.5 text-xs rounded-md border ${active ? 'border-indigo-500 text-white bg-indigo-500/10' : 'border-gray-600 text-gray-300 hover:bg-gray-700/50'}`;

// ============================================================================
// Component
// ============================================================================
export default function CommandCenter2() {
  // ---- DataStore + Hooks
  const { state, actions } = useDataStore();
  const { summary, history, sectorAllocation, institutionAllocation, topPositions, assetPerformance, loading: isSummaryLoading, refresh: refreshAll } = usePortfolioSummary();
  const { positions: latestPositions, loading: posLoading, refresh: refreshPositions } = useDetailedPositions();
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { liabilitiesSummary, liabilities, loading: liabLoading, refresh: refreshLiabs } = useGroupedLiabilities?.() || { };

  // ---- Kick minimal loads on mount (mirrors QuickEditDelete/Portfolio patterns)
  useEffect(() => {
    actions.fetchSnapshotsData?.(365); // for byDate + dates + compare
    if (!accounts?.length && !accountsLoading) refreshAccounts?.();
    if (!latestPositions?.length && !posLoading) refreshPositions?.();
    if (!liabilities?.length && !liabLoading) refreshLiabs?.();
  }, []); // eslint-disable-line

  // ========================================================================
  // State: filters & timeframe
  // ========================================================================
  const [timeframe, setTimeframe] = useState('1m'); // 1w, 1m, 3m, 6m, ytd, 1y, all
  const [selectedAccounts, setSelectedAccounts] = useState(() => new Set());
  const [selectedTypes, setSelectedTypes] = useState(() => new Set());

  // default-select all accounts once loaded
  useEffect(() => {
    if (accounts && accounts.length && selectedAccounts.size === 0) {
      setSelectedAccounts(new Set(accounts.map(a => a.id)));
    }
  }, [accounts]); // eslint-disable-line

  // ========================================================================
  // Build chart data from summary.history (Portfolio style)
  // ========================================================================
  const trendData = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    const toDate = (s) => {
      const [y,m,d] = (s || '').split('-').map(Number);
      return new Date(y, (m||1)-1, d||1);
    };
    // derive net worth via fields if needed
    return history
      .map(h => {
        const date = h.date || h.snapshot_date;
        const totalAssets = h.total_assets ?? h.net_worth ?? 0;
        const totalLiabilities = h.total_liabilities ?? 0;
        const netWorth = (h.net_worth !== undefined) ? h.net_worth : totalAssets - totalLiabilities;
        const liquidAssets = h.liquid_assets ?? 0;
        const altLiquid = h.alt_liquid_net_worth ?? h.net_cash_basis_metrics?.net_cash_position ?? 0;
        const altRetire = h.alt_retirement_assets ?? 0;
        const altIlliq = h.alt_illiquid_net_worth ?? 0;
        return {
          date,
          label: toDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          netWorth,
          totalAssets,
          totalLiabilities,
          liquidAssets,
          altLiquidNetWorth: altLiquid,
          altRetirementAssets: altRetire,
          altIlliquidNetWorth: altIlliq
        };
      })
      .sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [history]);

  const timeFilteredTrend = useMemo(() => {
    if (!trendData.length) return [];
    const days = ({ '1w':7, '1m':30, '3m':90, '6m':180, 'ytd':365, '1y':365, 'all': 100000 })[timeframe] || 30;
    const cutoff = timeframe === 'ytd'
      ? new Date(new Date().getFullYear(), 0, 1)
      : new Date(Date.now() - days*86400000);
    return timeframe === 'all' ? trendData : trendData.filter(d => new Date(d.date) >= cutoff);
  }, [trendData, timeframe]);

  // ========================================================================
  // Allocation datasets
  // ========================================================================
  const assetAllocationData = useMemo(() => {
    if (!summary?.assetAllocation) return [];
    const s = summary.assetAllocation;
    const rows = [
      { key: 'securities', name: 'Securities', value: s.securities.value, pct: s.securities.percentage, color: assetColors.securities },
      { key: 'cash', name: 'Cash', value: s.cash.value, pct: s.cash.percentage, color: assetColors.cash },
      { key: 'crypto', name: 'Crypto', value: s.crypto.value, pct: s.crypto.percentage, color: assetColors.crypto },
      { key: 'metals', name: 'Metals', value: s.metals.value, pct: s.metals.percentage, color: assetColors.metals },
      { key: 'other_assets', name: 'Other Assets', value: s.otherAssets.value, pct: s.otherAssets.percentage, color: assetColors.other_assets },
    ];
    return rows.filter(r => (r.value ?? 0) > 0).sort((a,b) => b.value - a.value);
  }, [summary]);

  const sectorData = useMemo(() => {
    if (!sectorAllocation || typeof sectorAllocation !== 'object') return [];
    return Object.entries(sectorAllocation)
      .map(([name, d]) => ({ name: name || 'Unknown', value: d?.value ?? 0 }))
      .filter(x => x.value > 0)
      .sort((a,b) => b.value - a.value)
      .slice(0, 8);
  }, [sectorAllocation]);

  const institutionData = useMemo(() => {
    if (!institutionAllocation || !Array.isArray(institutionAllocation)) return [];
    return institutionAllocation
      .filter(x => x?.value > 0)
      .sort((a,b) => b.value - a.value)
      .slice(0, 6);
  }, [institutionAllocation]);

  // ========================================================================
  // Latest positions table (filter by accounts + type)
  // ========================================================================
  const filteredPositions = useMemo(() => {
    let rows = Array.isArray(latestPositions) ? latestPositions : [];
    if (selectedAccounts.size) {
      rows = rows.filter(p => selectedAccounts.has(p.accountId));
    }
    if (selectedTypes.size) {
      rows = rows.filter(p => selectedTypes.has((p.assetType || p.item_type || '').toLowerCase()));
    }
    // strongest first
    return rows
      .slice()
      .sort((a,b) => (b.currentValue ?? 0) - (a.currentValue ?? 0))
      .slice(0, 50);
  }, [latestPositions, selectedAccounts, selectedTypes]);

  // ========================================================================
  // Date-to-date compare (snapshots.byDate)
  // ========================================================================
  const dates = state.snapshots?.dates || [];
  const byDate = state.snapshots?.byDate || {};
  const [startDate, setStartDate] = useState(() => dates?.[Math.max(0, dates.length-31)] || null);
  const [endDate, setEndDate] = useState(() => dates?.[dates.length-1] || null);

  useEffect(() => {
    if (!dates?.length) return;
    setStartDate(prev => prev || dates[Math.max(0, dates.length-31)]);
    setEndDate(prev => prev || dates[dates.length-1]);
  }, [dates?.length]); // eslint-disable-line

  const compareSummary = useMemo(() => {
    const a = byDate?.[startDate];
    const b = byDate?.[endDate];
    if (!a || !b) return null;

    const valueA = a.total_value ?? 0;
    const valueB = b.total_value ?? 0;
    const delta = valueB - valueA;
    const pct = valueA ? delta / valueA : 0;

    // crude “top movers”: join by unified_id and look at value delta
    const pa = a.positions || {};
    const pb = b.positions || {};
    const keys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
    const movers = [...keys].map(k => {
      const va = pa[k]?.current_value ?? 0;
      const vb = pb[k]?.current_value ?? 0;
      return {
        id: k,
        identifier: pb[k]?.identifier || pa[k]?.identifier,
        name: pb[k]?.name || pa[k]?.name || pb[k]?.identifier || pa[k]?.identifier,
        account: pb[k]?.inv_account_name || pa[k]?.inv_account_name,
        institution: pb[k]?.institution || pa[k]?.institution,
        delta: vb - va
      };
    }).sort((x,y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 10);

    return { valueA, valueB, delta, pct, movers };
  }, [startDate, endDate, byDate]);

  // ========================================================================
  // UI bits
  // ========================================================================
  const TimeframeChips = () => {
    const options = ['1w','1m','3m','6m','ytd','1y','all'];
    return (
      <div className="flex gap-2">
        {options.map(o => (
          <button key={o} className={chip(o === timeframe)} onClick={() => setTimeframe(o)}>
            {o.toUpperCase()}
          </button>
        ))}
      </div>
    );
  };

  const AccountsFilter = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> Accounts</span>
      {(accounts || []).map(a => {
        const active = selectedAccounts.has(a.id);
        return (
          <button
            key={a.id}
            className={chip(active)}
            onClick={() => {
              const s = new Set(selectedAccounts);
              active ? s.delete(a.id) : s.add(a.id);
              setSelectedAccounts(s);
            }}>
            {a.name}
          </button>
        );
      })}
    </div>
  );

  const TypeFilter = () => {
    const choices = ['security','cash','crypto','metal','other_assets','other'];
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 flex items-center gap-1"><Layers className="w-3 h-3" /> Types</span>
        {choices.map(k => {
          const active = selectedTypes.has(k);
          return (
            <button key={k} className={chip(active)} onClick={() => {
              const s = new Set(selectedTypes);
              active ? s.delete(k) : s.add(k);
              setSelectedTypes(s);
            }}>
              {k.replace('_',' ')}
            </button>
          );
        })}
      </div>
    );
  };

  // ========================================================================
  // Render
  // ========================================================================
  return (
    <>
      <Head>
        <title>NestEgg — Command Center 2</title>
      </Head>

      <div className="px-4 md:px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">Command Center 2</h1>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              {summary?.snapshotDate ? `As of ${new Date(summary.snapshotDate).toLocaleDateString()}` : 'Loading latest…'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refreshAll?.(true);
                actions.fetchSnapshotsData?.(365, true);
                refreshPositions?.(true);
                refreshAccounts?.(true);
                refreshLiabs?.(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200"
              title="Refresh all"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* KPI row */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Net Worth */}
            <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-300">
                <DollarSign className="w-4 h-4 text-indigo-400" /> Net Worth
              </div>
              <div className="text-2xl font-bold text-white mt-1">{fmtCurrency(summary.netWorth)}</div>
              <div className="text-xs mt-1 flex items-center gap-1">
                {(summary.periodChanges?.['1d']?.netWorthPercent ?? 0) >= 0 ? <ArrowUp className="w-3 h-3 text-green-400" /> : <ArrowDown className="w-3 h-3 text-red-400" />}
                <span className={(summary.periodChanges?.['1d']?.netWorthPercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {fmtPct(summary.periodChanges?.['1d']?.netWorthPercent || 0)} today
                </span>
              </div>
            </motion.div>

            {/* Total Assets */}
            <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Wallet className="w-4 h-4 text-green-400" /> Total Assets
              </div>
              <div className="text-2xl font-bold text-white mt-1">{fmtCurrency(summary.totalAssets)}</div>
              <div className="text-xs text-gray-400 mt-1">{fmtCurrency(summary.liquidAssets)} liquid</div>
            </motion.div>

            {/* Unrealized */}
            <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Activity className="w-4 h-4 text-emerald-400" /> Unrealized
              </div>
              <div className="text-2xl font-bold text-white mt-1">{fmtCurrency(summary.unrealizedGain)}</div>
              <div className={`text-xs mt-1 ${summary.unrealizedGainPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtPct(summary.unrealizedGainPercent || 0)}
              </div>
            </motion.div>

            {/* Annual Income */}
            <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Gift className="w-4 h-4 text-amber-400" /> Annual Income
              </div>
              <div className="text-2xl font-bold text-white mt-1">{fmtCurrency(summary.income?.annual || 0)}</div>
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Percent className="w-3 h-3" /> {fmtPct(summary.income?.yield || 0)} yield
              </div>
            </motion.div>

            {/* Liabilities */}
            <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-300">
                <MinusCircle className="w-4 h-4 text-red-400" /> Liabilities
              </div>
              <div className="text-2xl font-bold text-white mt-1">-{fmtCurrency(summary.liabilities?.total || 0)}</div>
              <div className={`text-xs mt-1 ${summary.totalLiabilitiesYTDChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmtCurrency(Math.abs(summary.totalLiabilitiesYTDChange || 0))} ({fmtPct(Math.abs(summary.totalLiabilitiesYTDChangePercent || 0))}) YTD
              </div>
            </motion.div>
          </div>
        )}

        {/* Trends */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <LineChartIcon className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold">Trended Net Worth</h3>
            </div>
            <TimeframeChips />
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeFilteredTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradNW" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#9CA3AF' }} axisLine={{ stroke: '#374151' }} tickLine={false} dy={8} />
                <YAxis tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} dx={-8}
                       tickFormatter={(v) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`} />
                <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm">
                      <div className="text-gray-200 mb-1">{label}</div>
                      <div className="text-indigo-300">Net Worth: {fmtCurrency(d?.netWorth)}</div>
                      <div className="text-green-300">Assets: {fmtCurrency(d?.totalAssets)}</div>
                      {d?.totalLiabilities > 0 && <div className="text-red-300">Liabilities: {fmtCurrency(d?.totalLiabilities)}</div>}
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="netWorth" stroke="#4f46e5" fill="url(#gradNW)" strokeWidth={2} activeDot={{ r: 5 }} />
                {timeFilteredTrend?.[0]?.netWorth && (
                  <ReferenceLine y={timeFilteredTrend[0].netWorth} stroke="#4B5563" strokeDasharray="3 3" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Worth Components */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <LineChartIcon className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">Net Worth Components</h3>
            </div>
            <div className="text-xs text-gray-400">{timeframe.toUpperCase()}</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeFilteredTrend}>
                <XAxis dataKey="label" tick={{ fill: '#9CA3AF' }} axisLine={{ stroke: '#374151' }} tickLine={false} dy={8} />
                <YAxis tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} dx={-8}
                       tickFormatter={(v) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`} />
                <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const map = { altLiquidNetWorth: 'Liquid', altRetirementAssets: 'Retirement', altIlliquidNetWorth: 'Illiquid' };
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm">
                      <div className="text-gray-200 mb-1">{label}</div>
                      {payload.map(p => (
                        <div key={p.dataKey} className="flex justify-between gap-6">
                          <span className="text-gray-300">{map[p.dataKey] || p.dataKey}</span>
                          <span className="text-gray-100">{fmtCurrency(p.value)}</span>
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="altLiquidNetWorth" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="altRetirementAssets" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="altIlliquidNetWorth" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Allocations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Asset Allocation */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold">Asset Allocation</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetAllocationData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {assetAllocationData.map((d, i) => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm">
                        <div className="text-gray-200 mb-1">{d.name}</div>
                        <div className="text-indigo-300">{fmtCurrency(d.value)}</div>
                        <div className="text-gray-400">{(d.pct*100).toFixed(1)}%</div>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Allocation */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold">Top Sectors</h3>
            </div>
            <ul className="space-y-2">
              {sectorData.map(s => (
                <li key={s.name} className="flex justify-between items-center">
                  <span className="text-gray-300">{s.name}</span>
                  <span className="text-gray-100">{fmtCurrency(s.value)}</span>
                </li>
              ))}
              {!sectorData.length && <li className="text-gray-500 text-sm">No sector data</li>}
            </ul>
          </div>

          {/* Institution Mix */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <Building2 className="w-5 h-5 text-sky-400" />
              <h3 className="font-semibold">Top Institutions</h3>
            </div>
            <ul className="space-y-2">
              {institutionData.map(i => (
                <li key={i.institution} className="flex justify-between items-center">
                  <span className="text-gray-300">{i.institution}</span>
                  <span className="text-gray-100">{fmtCurrency(i.value)}</span>
                </li>
              ))}
              {!institutionData.length && <li className="text-gray-500 text-sm">No institution data</li>}
            </ul>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <Filter className="w-5 h-5 text-gray-300" />
              <h3 className="font-semibold">Filters</h3>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <AccountsFilter />
            <TypeFilter />
          </div>
        </div>

        {/* Positions Table */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white">
              <LineChartIcon className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold">Top Positions (filtered)</h3>
            </div>
            <div className="text-xs text-gray-400">{filteredPositions.length} shown</div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Identifier</th>
                  <th className="py-2 pr-4">Account</th>
                  <th className="py-2 pr-4">Institution</th>
                  <th className="py-2 pr-4 text-right">Value</th>
                  <th className="py-2 pr-0 text-right">Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map(p => (
                  <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-700/40">
                    <td className="py-2 pr-4 text-white">{p.name}</td>
                    <td className="py-2 pr-4 text-gray-300">{p.identifier}</td>
                    <td className="py-2 pr-4 text-gray-300">{p.accountName}</td>
                    <td className="py-2 pr-4 text-gray-300">{p.institution}</td>
                    <td className="py-2 pr-4 text-right text-gray-100">{fmtCurrency(p.currentValue)}</td>
                    <td className={`py-2 pr-0 text-right ${ (p.gainLoss ?? 0) >= 0 ? 'text-green-400' : 'text-red-400' }`}>
                      {fmtCurrency(p.gainLoss)} {p.gainLossPercent !== undefined && <span className="text-xs">({fmtPct((p.gainLossPercent ?? 0)/100)})</span>}
                    </td>
                  </tr>
                ))}
                {!filteredPositions.length && (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-500">No positions for current filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Liabilities snapshot */}
        {summary?.liabilities?.total > 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center gap-2 text-white mb-3">
              <MinusCircle className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold">Liabilities</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries({
                Mortgage: summary.liabilities.mortgage,
                'Credit Cards': summary.liabilities.creditCard,
                Loans: summary.liabilities.loan,
                Other: summary.liabilities.other
              }).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400 mb-1">{k}</div>
                  <div className="text-white font-semibold">-{fmtCurrency(v || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date → Date compare */}
        {dates?.length > 1 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-gray-300" />
                <h3 className="font-semibold">Compare Dates</h3>
              </div>
              <div className="flex gap-2">
                <select className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-md px-2 py-1"
                        value={startDate || ''} onChange={(e) => setStartDate(e.target.value)}>
                  {dates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="text-gray-400 text-sm">→</span>
                <select className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-md px-2 py-1"
                        value={endDate || ''} onChange={(e) => setEndDate(e.target.value)}>
                  {dates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {compareSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400 mb-1">Start Value</div>
                  <div className="text-white font-semibold">{fmtCurrency(compareSummary.valueA)}</div>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400 mb-1">End Value</div>
                  <div className="text-white font-semibold">{fmtCurrency(compareSummary.valueB)}</div>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                  <div className="text-xs text-gray-400 mb-1">Change</div>
                  <div className={`font-semibold ${compareSummary.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmtCurrency(compareSummary.delta)} ({fmtPct(compareSummary.pct)})
                  </div>
                </div>

                <div className="md:col-span-3 border-t border-gray-700 pt-3">
                  <div className="text-sm text-gray-300 mb-2">Top Movers</div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                          <th className="py-2 pr-4">Name</th>
                          <th className="py-2 pr-4">Identifier</th>
                          <th className="py-2 pr-4">Institution</th>
                          <th className="py-2 pr-0 text-right">Δ Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareSummary.movers.map(m => (
                          <tr key={m.id} className="border-b border-gray-800">
                            <td className="py-2 pr-4 text-white">{m.name}</td>
                            <td className="py-2 pr-4 text-gray-300">{m.identifier}</td>
                            <td className="py-2 pr-4 text-gray-300">{m.institution}</td>
                            <td className={`py-2 pr-0 text-right ${m.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtCurrency(m.delta)}</td>
                          </tr>
                        ))}
                        {!compareSummary.movers.length && (
                          <tr><td colSpan="4" className="py-6 text-center text-gray-500">No movers for selected dates</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Select two valid dates to compare.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
