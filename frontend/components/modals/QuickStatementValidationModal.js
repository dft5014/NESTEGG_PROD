// QuickStatementValidationModal.js
// The most delightful way to reconcile your accounts against statements
// Makes validation fast, visual, and confidence-building

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X, ChevronDown, ChevronRight, Check, AlertTriangle, Info,
  Building2, CheckCircle, Clock, TrendingUp, TrendingDown,
  Search, Download, Eye, EyeOff, RefreshCw,
  FileText, Sparkles, Target, AlertCircle, HelpCircle,
  Loader2, ExternalLink, Zap, Shield, Upload
} from 'lucide-react';
import { useDataStore } from '@/store/DataStore';
import { useAccounts } from '@/store/hooks/useAccounts';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { formatCurrency } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// ============================================================================
// UTILITIES
// ============================================================================

const fmtCurrency = (val, hideValues = false) => {
  if (hideValues) return '••••••';
  if (val == null || !Number.isFinite(val)) return '$0.00';
  return formatCurrency(val);
};

const parseNumber = (val) => {
  if (typeof val === 'number') return val;
  const cleaned = String(val || '').replace(/[$,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const getDiffStatus = (diff) => {
  const absDiff = Math.abs(diff);
  if (absDiff < 1) return 'match';
  if (absDiff < 100) return 'minor';
  return 'major';
};

const getDiffColor = (status) => {
  switch (status) {
    case 'match': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'minor': return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'major': return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    default: return { bg: 'bg-gray-800', text: 'text-gray-300', border: 'border-gray-700' };
  }
};

const getLogoForInstitution = (name) => {
  if (!name) return null;
  const match = popularBrokerages.find(b =>
    b.name.toLowerCase() === String(name).toLowerCase()
  );
  return match?.logo || null;
};

// ============================================================================
// CURRENCY INPUT COMPONENT
// ============================================================================

const CurrencyInput = React.memo(function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = 'Enter amount',
  autoFocus = false,
  className = ''
}) {
  const [focused, setFocused] = useState(false);
  const [rawValue, setRawValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!focused) {
      setRawValue(value != null && value !== 0 ? String(value) : '');
    }
  }, [value, focused]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handleChange = (e) => {
    const cleaned = e.target.value.replace(/[^0-9.\-]/g, '');
    setRawValue(cleaned);
    onChange(parseNumber(cleaned));
  };

  const handleFocus = (e) => {
    setFocused(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 50);
  };

  const handleBlur = (e) => {
    setFocused(false);
  };

  const displayValue = focused
    ? rawValue
    : (value != null && value !== 0) ? fmtCurrency(value) : '';

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`
        w-36 px-3 py-2 text-sm text-right rounded-lg border
        bg-gray-800 focus:bg-gray-700 text-white placeholder-gray-500
        border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
        transition-all duration-200
        font-semibold tabular-nums
        ${className}
      `}
    />
  );
});

// ============================================================================
// ANIMATED STATS COMPONENT
// ============================================================================

const AnimatedStat = ({ value, suffix = '' }) => {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = displayed;
    const end = value || 0;
    const duration = 500;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span className="tabular-nums">
      {Math.round(displayed).toLocaleString()}{suffix}
    </span>
  );
};

// ============================================================================
// DRILL-DOWN INVESTIGATION MODAL
// ============================================================================

const InvestigationModal = ({ account, nesteggBalance, statementBalance, positions, onClose }) => {
  const diff = (statementBalance || 0) - (nesteggBalance || 0);
  const absDiff = Math.abs(diff);
  const status = getDiffStatus(diff);
  const colors = getDiffColor(status);

  // Group positions by type
  const positionsByType = useMemo(() => {
    const groups = { securities: [], cash: [], crypto: [], metals: [], other: [] };
    (positions || []).forEach(pos => {
      const type = String(pos.asset_type || pos.assetType || 'other').toLowerCase();
      if (type.includes('sec') || type.includes('stock') || type.includes('equity')) {
        groups.securities.push(pos);
      } else if (type.includes('cash')) {
        groups.cash.push(pos);
      } else if (type.includes('crypto')) {
        groups.crypto.push(pos);
      } else if (type.includes('metal')) {
        groups.metals.push(pos);
      } else {
        groups.other.push(pos);
      }
    });
    return groups;
  }, [positions]);

  const securityTotal = useMemo(() =>
    positionsByType.securities.reduce((sum, p) => sum + (p.currentValue || p.current_value || 0), 0),
    [positionsByType.securities]
  );

  const cashTotal = useMemo(() =>
    positionsByType.cash.reduce((sum, p) => sum + (p.currentValue || p.current_value || 0), 0),
    [positionsByType.cash]
  );

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-950 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Target className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{account.name}</h3>
                  <p className="text-sm text-gray-400">{account.institution}</p>
                </div>
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${colors.bg} ${colors.border} border`}>
                <span className={`text-sm font-semibold ${colors.text}`}>
                  {absDiff < 1 ? 'Perfect Match!' : `${fmtCurrency(absDiff)} Difference`}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)] bg-gray-950">
          {/* Balance Comparison */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <div className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">NestEgg Balance</div>
              <div className="text-2xl font-bold text-white">{fmtCurrency(nesteggBalance)}</div>
              <div className="text-xs text-indigo-300 mt-1">As calculated from positions</div>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <div className="text-xs font-medium text-purple-400 uppercase tracking-wide mb-1">Statement Balance</div>
              <div className="text-2xl font-bold text-white">{fmtCurrency(statementBalance)}</div>
              <div className="text-xs text-purple-300 mt-1">From your statement</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              NestEgg Breakdown
            </h4>
            <div className="space-y-2">
              {securityTotal > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-900/70 rounded-lg border border-gray-800">
                  <span className="text-sm text-gray-300">Securities ({positionsByType.securities.length})</span>
                  <span className="text-sm font-semibold text-white">{fmtCurrency(securityTotal)}</span>
                </div>
              )}
              {cashTotal > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-900/70 rounded-lg border border-gray-800">
                  <span className="text-sm text-gray-300">Cash ({positionsByType.cash.length})</span>
                  <span className="text-sm font-semibold text-white">{fmtCurrency(cashTotal)}</span>
                </div>
              )}
              {positionsByType.crypto.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-900/70 rounded-lg border border-gray-800">
                  <span className="text-sm text-gray-300">Crypto ({positionsByType.crypto.length})</span>
                  <span className="text-sm font-semibold text-white">
                    {fmtCurrency(positionsByType.crypto.reduce((sum, p) => sum + (p.currentValue || 0), 0))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Possible Causes */}
          {absDiff >= 1 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Common Causes of Discrepancies
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-300">Stale Security Prices</div>
                    <div className="text-xs text-amber-400/70 mt-0.5">Market prices may not be current</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <Zap className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-indigo-300">Pending Transactions</div>
                    <div className="text-xs text-indigo-400/70 mt-0.5">Statement may include pending trades</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-emerald-300">Dividends or Interest</div>
                    <div className="text-xs text-emerald-400/70 mt-0.5">Recent income not yet recorded</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Update Prices
              </button>
              <button className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Positions
              </button>
              <button
                onClick={onClose}
                className="col-span-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Reconciled Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INSTITUTION CARD COMPONENT
// ============================================================================

const InstitutionCard = ({
  institution,
  accounts,
  statementBalances,
  onStatementChange,
  reconciledAccounts,
  onToggleReconciled,
  expanded,
  onToggleExpanded,
  hideValues,
  onInvestigate
}) => {
  const logo = getLogoForInstitution(institution);

  // Calculate totals
  const totals = useMemo(() => {
    let nesteggTotal = 0;
    let statementTotal = 0;
    let accountsWithInput = 0;
    let matchingAccounts = 0;
    let hasDiscrepancies = false;

    accounts.forEach(acc => {
      const nestegg = acc.totalValue || 0;
      const statement = statementBalances[acc.id];

      nesteggTotal += nestegg;

      if (statement != null && statement !== 0) {
        statementTotal += statement;
        accountsWithInput++;

        const diff = Math.abs(statement - nestegg);
        if (diff < 1) {
          matchingAccounts++;
        } else {
          hasDiscrepancies = true;
        }
      }
    });

    const diff = statementTotal - nesteggTotal;
    const allInputted = accountsWithInput === accounts.length;
    const allMatching = allInputted && matchingAccounts === accounts.length;

    let status = 'needs_input';
    if (allMatching) status = 'match';
    else if (hasDiscrepancies) status = 'discrepancy';

    return {
      nesteggTotal,
      statementTotal,
      diff,
      status,
      accountsWithInput,
      allInputted
    };
  }, [accounts, statementBalances]);

  const statusConfig = useMemo(() => {
    switch (totals.status) {
      case 'match':
        return {
          icon: CheckCircle,
          text: 'All Match',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20'
        };
      case 'discrepancy':
        const count = accounts.filter(acc => {
          const stmt = statementBalances[acc.id];
          return stmt != null && stmt !== 0 && Math.abs(stmt - (acc.totalValue || 0)) >= 1;
        }).length;
        return {
          icon: AlertTriangle,
          text: `${count} ${count === 1 ? 'Discrepancy' : 'Discrepancies'}`,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20'
        };
      default:
        const remaining = accounts.length - totals.accountsWithInput;
        return {
          icon: Clock,
          text: `${remaining} ${remaining === 1 ? 'Account' : 'Accounts'} Pending`,
          color: 'text-gray-400',
          bg: 'bg-gray-800',
          border: 'border-gray-700'
        };
    }
  }, [totals.status, accounts, statementBalances]);

  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-gray-900/70 rounded-xl shadow-sm border border-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => onToggleExpanded(institution)}
        className="w-full px-6 py-6 flex items-center justify-between bg-gray-900 hover:bg-gray-800 transition-colors border-b border-gray-800"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {logo ? (
            <img src={logo} alt={institution} className="w-12 h-12 rounded-lg object-contain border border-gray-700 bg-white p-1.5 flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700 flex-shrink-0">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
          )}

          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-base font-bold text-white truncate max-w-sm leading-snug">{institution}</h3>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusConfig.bg} ${statusConfig.border} border flex-shrink-0`}>
                <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
                <span className={statusConfig.color}>{statusConfig.text}</span>
              </span>
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              {totals.accountsWithInput > 0 && (
                <span className="text-gray-500"> • {totals.accountsWithInput}/{accounts.length} entered</span>
              )}
            </div>
          </div>

          <div className="text-right mr-4 flex-shrink-0">
            <div className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">NestEgg Total</div>
            <div className="text-xl font-bold text-white tabular-nums leading-tight">{fmtCurrency(totals.nesteggTotal, hideValues)}</div>
            {totals.allInputted && Math.abs(totals.diff) >= 0.01 && (
              <div className={`text-sm font-bold mt-1.5 tabular-nums leading-tight ${totals.diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totals.diff > 0 ? '+' : ''}{fmtCurrency(totals.diff, hideValues)}
              </div>
            )}
          </div>

          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-6 pb-4 bg-gray-950/50">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-xs uppercase text-gray-400 border-b border-gray-800">
                  <th className="text-left py-4 px-4 font-bold">Account</th>
                  <th className="text-right py-4 px-4 font-bold">NestEgg Balance</th>
                  <th className="text-center py-4 px-4 font-bold">Statement Balance</th>
                  <th className="text-right py-4 px-4 font-bold">Difference</th>
                  <th className="text-center py-4 px-4 font-bold">Status</th>
                  <th className="text-center py-4 px-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, idx) => {
                  const nesteggVal = account.totalValue || 0;
                  const statementVal = statementBalances[account.id];
                  const diff = (statementVal != null && statementVal !== 0) ? statementVal - nesteggVal : 0;
                  const status = getDiffStatus(diff);
                  const colors = getDiffColor(status);
                  const isReconciled = reconciledAccounts.has(account.id);
                  const hasInput = statementVal != null && statementVal !== 0;

                  return (
                    <tr
                      key={account.id}
                      className={`
                        group transition-colors border-b border-gray-800 last:border-b-0
                        ${isReconciled ? 'bg-emerald-500/10' : 'hover:bg-gray-900/50'}
                      `}
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-bold text-white text-sm">{account.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{account.type}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-bold text-white tabular-nums">
                          {fmtCurrency(nesteggVal, hideValues)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          <CurrencyInput
                            id={`stmt-${account.id}`}
                            value={statementVal}
                            onChange={(val) => onStatementChange(account.id, val)}
                            autoFocus={idx === 0 && !hasInput}
                            placeholder="Enter amount"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {hasInput ? (
                          <span className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums
                            ${colors.bg} ${colors.text} ${colors.border} border
                          `}>
                            {diff > 0 ? '+' : diff < 0 ? '−' : ''}
                            {fmtCurrency(Math.abs(diff), hideValues)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 font-medium">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isReconciled ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Reconciled
                          </span>
                        ) : hasInput && status === 'match' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3.5 h-3.5" />
                            Match
                          </span>
                        ) : hasInput ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${colors.bg} ${colors.text} ${colors.border} border`}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            {status === 'minor' ? 'Minor' : 'Major'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasInput && status !== 'match' && (
                            <button
                              onClick={() => onInvestigate(account)}
                              className="p-2 hover:bg-indigo-500/20 rounded-lg transition-all hover:scale-110"
                              title="Investigate Discrepancy"
                            >
                              <Search className="w-4 h-4 text-indigo-400" />
                            </button>
                          )}
                          {hasInput && (
                            <button
                              onClick={() => onToggleReconciled(account.id)}
                              className={`
                                p-2 rounded-lg transition-all hover:scale-110
                                ${isReconciled
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
                                  : 'hover:bg-gray-800'
                                }
                              `}
                              title={isReconciled ? 'Unmark as Reconciled' : 'Mark as Reconciled'}
                            >
                              <Shield className={`w-4 h-4 ${isReconciled ? 'text-emerald-400' : 'text-gray-400'}`} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

const QuickStatementValidationModal = ({ isOpen, onClose }) => {
  const { state, actions } = useDataStore();
  const { accounts = [], loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { summary, loading: summaryLoading } = usePortfolioSummary();
  const { positions: allPositions = [], loading: positionsLoading } = useDetailedPositions();

  // State
  const [statementBalances, setStatementBalances] = useState({});
  const [reconciledAccounts, setReconciledAccounts] = useState(new Set());
  const [expandedInstitutions, setExpandedInstitutions] = useState(new Set());
  const [investigatingAccount, setInvestigatingAccount] = useState(null);
  const [hideValues, setHideValues] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const loading = accountsLoading || summaryLoading || positionsLoading;

  // Group accounts by institution
  const accountsByInstitution = useMemo(() => {
    const grouped = new Map();

    (accounts || []).forEach(account => {
      const institution = account.institution || 'Other';
      if (!grouped.has(institution)) {
        grouped.set(institution, []);
      }
      grouped.get(institution).push(account);
    });

    // Sort by total value
    const sorted = Array.from(grouped.entries()).sort((a, b) => {
      const totalA = a[1].reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
      const totalB = b[1].reduce((sum, acc) => sum + (acc.totalValue || 0), 0);
      return totalB - totalA;
    });

    return new Map(sorted);
  }, [accounts]);

  // Filter institutions by search
  const filteredInstitutions = useMemo(() => {
    if (!searchQuery) return Array.from(accountsByInstitution.keys());
    const query = searchQuery.toLowerCase();
    return Array.from(accountsByInstitution.keys()).filter(inst =>
      inst.toLowerCase().includes(query)
    );
  }, [accountsByInstitution, searchQuery]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let totalAccounts = 0;
    let accountsWithInput = 0;
    let matchingAccounts = 0;
    let discrepancyCount = 0;
    let totalDiff = 0;
    let totalNestegg = 0;
    let totalStatement = 0;

    accountsByInstitution.forEach(accts => {
      accts.forEach(acc => {
        totalAccounts++;
        const nestegg = acc.totalValue || 0;
        totalNestegg += nestegg;

        const stmt = statementBalances[acc.id];
        if (stmt != null && stmt !== 0) {
          accountsWithInput++;
          totalStatement += stmt;

          const diff = stmt - nestegg;
          totalDiff += diff;

          if (Math.abs(diff) < 1) {
            matchingAccounts++;
          } else {
            discrepancyCount++;
          }
        }
      });
    });

    const reconciledCount = reconciledAccounts.size;
    const completionRate = totalAccounts > 0 ? (accountsWithInput / totalAccounts) * 100 : 0;

    return {
      totalAccounts,
      accountsWithInput,
      matchingAccounts,
      discrepancyCount,
      reconciledCount,
      totalDiff,
      totalNestegg,
      totalStatement,
      completionRate
    };
  }, [accountsByInstitution, statementBalances, reconciledAccounts]);

  // Handlers
  const handleStatementChange = useCallback((accountId, value) => {
    setStatementBalances(prev => ({
      ...prev,
      [accountId]: value
    }));
  }, []);

  const handleToggleReconciled = useCallback((accountId) => {
    setReconciledAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const handleToggleExpanded = useCallback((institution) => {
    setExpandedInstitutions(prev => {
      const next = new Set(prev);
      if (next.has(institution)) {
        next.delete(institution);
      } else {
        next.add(institution);
      }
      return next;
    });
  }, []);

  const handleInvestigate = useCallback((account) => {
    // Find positions for this account
    const accountPositions = allPositions.filter(pos =>
      String(pos.accountId || pos.inv_account_id || pos.account_id) === String(account.id)
    );

    setInvestigatingAccount({
      ...account,
      positions: accountPositions
    });
  }, [allPositions]);

  const handleExpandAll = useCallback(() => {
    setExpandedInstitutions(new Set(accountsByInstitution.keys()));
  }, [accountsByInstitution]);

  const handleCollapseAll = useCallback(() => {
    setExpandedInstitutions(new Set());
  }, []);

  const handleExportCSV = useCallback(() => {
    const rows = [['Institution', 'Account', 'Account ID', 'Account Type', 'NestEgg Balance', 'Statement Balance', 'Difference', 'Status']];

    accountsByInstitution.forEach((accts, institution) => {
      accts.forEach(acc => {
        const nestegg = acc.totalValue || 0;
        const statement = statementBalances[acc.id] || '';
        const diff = statement ? statement - nestegg : '';
        const status = reconciledAccounts.has(acc.id) ? 'Reconciled' :
                      statement === '' ? 'Pending' :
                      Math.abs(diff) < 1 ? 'Match' : 'Discrepancy';

        rows.push([
          institution,
          acc.name,
          acc.id,
          acc.type,
          nestegg.toFixed(2),
          statement !== '' ? statement.toFixed(2) : '',
          diff !== '' ? diff.toFixed(2) : '',
          status
        ]);
      });
    });

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NestEgg_Reconciliation_${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [accountsByInstitution, statementBalances, reconciledAccounts, selectedDate]);

  const handleImportCSV = useCallback(async (file) => {
    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const accountIdIdx = headers.indexOf('Account ID');
      const statementBalanceIdx = headers.indexOf('Statement Balance');

      if (accountIdIdx === -1 || statementBalanceIdx === -1) {
        alert('Invalid CSV format. Make sure it has "Account ID" and "Statement Balance" columns.');
        return;
      }

      const newBalances = {};
      let importCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        const accountId = cells[accountIdIdx];
        const statementBalance = cells[statementBalanceIdx];

        if (accountId && statementBalance && statementBalance !== '') {
          const balance = parseNumber(statementBalance);
          if (balance !== 0 || statementBalance === '0') {
            newBalances[accountId] = balance;
            importCount++;
          }
        }
      }

      setStatementBalances(prev => ({ ...prev, ...newBalances }));
      alert(`Successfully imported ${importCount} statement balances!`);

      // Auto-expand all institutions after import
      handleExpandAll();
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import CSV. Please check the file format.');
    } finally {
      setIsImporting(false);
    }
  }, [handleExpandAll]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportCSV(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImportCSV]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('institution-search')?.focus();
      }

      // Cmd/Ctrl + E: Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handleExportCSV();
      }

      // Esc: Close modal (only if not investigating)
      if (e.key === 'Escape' && !investigatingAccount) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, investigatingAccount, handleExportCSV, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }} />

        <div className="relative z-[10000] mx-auto my-6 w-full max-w-7xl px-4 sm:px-6">
          <div className="bg-gray-950 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
            {/* Header */}
            <div className="sticky top-0 z-10 px-6 py-5 bg-gray-950 border-b border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 rounded-xl shadow-md">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Statement Validation</h2>
                    <p className="text-sm text-gray-400">Reconcile your accounts with confidence</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setHideValues(!hideValues)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    title={hideValues ? 'Show values' : 'Hide values'}
                  >
                    {hideValues ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-gray-900/70 rounded-xl p-3 shadow-md border border-gray-800">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Accounts</div>
                  <div className="text-2xl font-bold text-white">
                    <AnimatedStat value={summaryStats.totalAccounts} />
                  </div>
                </div>
                <div className="bg-gray-900/70 rounded-xl p-3 shadow-md border border-gray-800">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Reconciled</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    <AnimatedStat value={summaryStats.reconciledCount} />
                  </div>
                </div>
                <div className="bg-gray-900/70 rounded-xl p-3 shadow-md border border-gray-800">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Matches</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    <AnimatedStat value={summaryStats.matchingAccounts} />
                  </div>
                </div>
                <div className="bg-gray-900/70 rounded-xl p-3 shadow-md border border-gray-800">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Discrepancies</div>
                  <div className="text-2xl font-bold text-amber-400">
                    <AnimatedStat value={summaryStats.discrepancyCount} />
                  </div>
                </div>
                <div className="bg-gray-900/70 rounded-xl p-3 shadow-md border border-gray-800">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Diff</div>
                  <div className={`text-2xl font-bold tabular-nums ${summaryStats.totalDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summaryStats.totalDiff > 0 ? '+' : ''}{fmtCurrency(summaryStats.totalDiff, hideValues).replace('$', '$')}
                  </div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 bg-gray-900/70 border-b border-gray-800">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="institution-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search institutions... (⌘K)"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-700 bg-gray-800 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleExpandAll}
                    className="px-3 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap border border-gray-700"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Expand All
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    className="px-3 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap border border-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Collapse All
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-import"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="px-4 py-2.5 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import CSV
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2.5 text-sm font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export (⌘E)
                  </button>
                  <button
                    onClick={refreshAccounts}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Workflow instructions */}
              <div className="flex items-start gap-2 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-indigo-300 mb-1">Quick Workflow</p>
                  <p className="text-xs text-indigo-400/80">
                    Export → Fill in Excel → Import back to populate all statement balances instantly
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 bg-gray-950 max-h-[85vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Loading your accounts...</p>
                  </div>
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No institutions found</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredInstitutions.map(institution => (
                    <InstitutionCard
                      key={institution}
                      institution={institution}
                      accounts={accountsByInstitution.get(institution) || []}
                      statementBalances={statementBalances}
                      onStatementChange={handleStatementChange}
                      reconciledAccounts={reconciledAccounts}
                      onToggleReconciled={handleToggleReconciled}
                      expanded={expandedInstitutions.has(institution)}
                      onToggleExpanded={handleToggleExpanded}
                      hideValues={hideValues}
                      onInvestigate={handleInvestigate}
                    />
                  ))}
                </div>
              )}

              {/* Help Text */}
              {!loading && filteredInstitutions.length > 0 && (
                <div className="mt-6 p-4 bg-gray-900/70 rounded-xl border border-gray-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white mb-1">Pro Tips</h4>
                      <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Click an institution card to expand and enter statement balances</li>
                        <li>• Green = Perfect match, Yellow = Small difference, Red = Large difference</li>
                        <li>• Click the search icon to investigate why balances don't match</li>
                        <li>• Use Export → Import workflow to fill in all balances quickly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-900/70 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>
                    Progress: <span className="font-bold text-white">{summaryStats.completionRate.toFixed(0)}%</span>
                  </span>
                  <div className="w-48 h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${summaryStats.completionRate}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Modal */}
      {investigatingAccount && (
        <InvestigationModal
          account={investigatingAccount}
          nesteggBalance={investigatingAccount.totalValue || 0}
          statementBalance={statementBalances[investigatingAccount.id] || 0}
          positions={investigatingAccount.positions || []}
          onClose={() => setInvestigatingAccount(null)}
        />
      )}
    </>
  );
};

// ============================================================================
// BUTTON EXPORT
// ============================================================================

export function QuickStatementValidationButton({ className = '', label = 'Reconcile' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 ${className}`}
        title="Validate accounts against statements"
      >
        <Target className="w-4 h-4" />
        <span>{label}</span>
      </button>

      <QuickStatementValidationModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default QuickStatementValidationModal;
