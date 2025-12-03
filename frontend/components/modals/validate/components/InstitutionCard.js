// InstitutionCard - Expandable institution card with account list
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ChevronDown, CheckCircle, AlertTriangle,
  Clock, Shield, ArrowRight, FileSpreadsheet,
  TrendingUp, TrendingDown
} from 'lucide-react';
import {
  getInstitutionLogo,
  fmtCurrency,
  getValidationStatus,
  calculateInstitutionStats,
  VALIDATION_STATUS
} from '../utils/constants';
import CurrencyInput from './CurrencyInput';

// Status badge component
function StatusBadge({ status, count = null }) {
  const config = VALIDATION_STATUS[status] || VALIDATION_STATUS.pending;
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
      ${config.badgeClass} border
    `}>
      <Icon className={`w-3.5 h-3.5 ${config.textClass}`} />
      <span className={config.textClass}>
        {count !== null ? `${count} ${config.label}` : config.label}
      </span>
    </span>
  );
}

// Account row component
function AccountRow({
  account,
  statementBalance,
  reconciliationStatus,
  hideValues,
  onStatementChange,
  onToggleReconciled,
  onInvestigate,
  onImport
}) {
  const nesteggBalance = account.totalValue || 0;
  const isReconciled = reconciliationStatus?.reconciled || false;
  const status = getValidationStatus(nesteggBalance, statementBalance, isReconciled);
  const hasStatement = statementBalance !== undefined && statementBalance !== null && statementBalance !== '';
  const diff = hasStatement ? Number(statementBalance) - nesteggBalance : 0;

  return (
    <motion.tr
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`
        group transition-colors border-b border-gray-800 last:border-b-0
        ${isReconciled ? 'bg-indigo-500/5' : 'hover:bg-gray-900/50'}
      `}
    >
      {/* Account Info */}
      <td className="py-4 px-4">
        <div>
          <div className="font-semibold text-white text-sm">{account.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {account.type || account.accountType || 'Account'}
          </div>
        </div>
      </td>

      {/* NestEgg Balance */}
      <td className="py-4 px-4 text-right">
        <span className="text-sm font-bold text-white tabular-nums">
          {fmtCurrency(nesteggBalance, hideValues)}
        </span>
      </td>

      {/* Statement Balance Input */}
      <td className="py-4 px-4">
        <div className="flex justify-center">
          <CurrencyInput
            id={`stmt-${account.id}`}
            value={statementBalance}
            onChange={(val) => onStatementChange(account.id, val)}
            placeholder="Enter amount"
            size="sm"
            status={hasStatement ? (status.key === 'matched' ? 'matched' : 'discrepancy') : null}
            disabled={isReconciled}
            className="w-32"
          />
        </div>
      </td>

      {/* Difference */}
      <td className="py-4 px-4 text-right">
        {hasStatement ? (
          <span className={`
            inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums
            ${status.badgeClass} border
          `}>
            {diff > 0 ? '+' : diff < 0 ? '' : ''}
            {fmtCurrency(diff, hideValues)}
          </span>
        ) : (
          <span className="text-sm text-gray-600 font-medium">—</span>
        )}
      </td>

      {/* Status */}
      <td className="py-4 px-4 text-center">
        <StatusBadge status={status.key} />
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Import Statement */}
          <button
            onClick={() => onImport(account)}
            className="p-1.5 hover:bg-amber-500/20 rounded-lg transition-colors"
            title="Import Statement"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          </button>

          {/* Investigate */}
          {hasStatement && status.key !== 'matched' && !isReconciled && (
            <button
              onClick={() => onInvestigate(account)}
              className="p-1.5 hover:bg-indigo-500/20 rounded-lg transition-colors"
              title="Investigate"
            >
              <ArrowRight className="w-4 h-4 text-indigo-400" />
            </button>
          )}

          {/* Toggle Reconciled */}
          {hasStatement && (
            <button
              onClick={() => onToggleReconciled(account.id)}
              className={`
                p-1.5 rounded-lg transition-colors
                ${isReconciled
                  ? 'bg-indigo-500/20 hover:bg-indigo-500/30'
                  : 'hover:bg-gray-800'
                }
              `}
              title={isReconciled ? 'Unmark as reconciled' : 'Mark as reconciled'}
            >
              <Shield className={`w-4 h-4 ${isReconciled ? 'text-indigo-400' : 'text-gray-500'}`} />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// Main InstitutionCard component
export default function InstitutionCard({
  institution,
  accounts,
  statementBalances,
  reconciliationStatus,
  expanded,
  hideValues,
  onToggleExpand,
  onStatementChange,
  onToggleReconciled,
  onInvestigate,
  onImport,
  onViewDetails
}) {
  const logo = getInstitutionLogo(institution);

  // Calculate institution stats
  const stats = useMemo(() =>
    calculateInstitutionStats(accounts, statementBalances, reconciliationStatus),
    [accounts, statementBalances, reconciliationStatus]
  );

  // Determine overall status badge
  const getStatusBadge = () => {
    if (stats.reconciledCount === accounts.length) {
      return (
        <StatusBadge status="reconciled" count={stats.reconciledCount} />
      );
    }
    if (stats.discrepancyCount > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" />
          {stats.discrepancyCount} Discrepanc{stats.discrepancyCount === 1 ? 'y' : 'ies'}
        </span>
      );
    }
    if (stats.allInputted && stats.matchCount === accounts.length) {
      return <StatusBadge status="matched" />;
    }
    const pending = accounts.length - stats.accountsWithInput;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700">
        <Clock className="w-3.5 h-3.5" />
        {pending} Pending
      </span>
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/70 rounded-xl shadow-lg border border-gray-800 overflow-hidden"
    >
      {/* Header - Always visible */}
      <button
        onClick={() => onToggleExpand(institution)}
        className="w-full px-6 py-5 flex items-center justify-between bg-gray-900 hover:bg-gray-800/80 transition-colors border-b border-gray-800"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Logo */}
          {logo ? (
            <img
              src={logo}
              alt={institution}
              className="w-12 h-12 rounded-xl object-contain border border-gray-700 bg-white p-1.5 flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700 flex-shrink-0">
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>
          )}

          {/* Institution Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h3 className="text-lg font-bold text-white truncate max-w-md">
                {institution}
              </h3>
              {getStatusBadge()}
            </div>
            <div className="text-xs text-gray-400">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              {stats.accountsWithInput > 0 && (
                <span className="text-gray-500"> • {stats.accountsWithInput}/{accounts.length} validated</span>
              )}
            </div>
          </div>

          {/* Value Summary */}
          <div className="text-right mr-4 flex-shrink-0">
            <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
              NestEgg Total
            </div>
            <div className="text-xl font-bold text-white tabular-nums">
              {fmtCurrency(stats.totalValue, hideValues)}
            </div>
            {stats.allInputted && Math.abs(stats.diff) >= 0.01 && (
              <div className={`
                text-sm font-bold mt-1 tabular-nums flex items-center justify-end gap-1
                ${stats.diff > 0 ? 'text-emerald-400' : 'text-rose-400'}
              `}>
                {stats.diff > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {stats.diff > 0 ? '+' : ''}{fmtCurrency(stats.diff, hideValues)}
              </div>
            )}
          </div>

          {/* Expand/Collapse Icon */}
          <ChevronDown
            className={`
              w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0
              ${expanded ? 'rotate-180' : ''}
            `}
          />
        </div>
      </button>

      {/* Expanded Content - Account Table */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 bg-gray-950/50">
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="text-xs uppercase text-gray-500 border-b border-gray-800">
                      <th className="text-left py-3 px-4 font-semibold tracking-wide">Account</th>
                      <th className="text-right py-3 px-4 font-semibold tracking-wide">NestEgg</th>
                      <th className="text-center py-3 px-4 font-semibold tracking-wide">Statement</th>
                      <th className="text-right py-3 px-4 font-semibold tracking-wide">Difference</th>
                      <th className="text-center py-3 px-4 font-semibold tracking-wide">Status</th>
                      <th className="text-center py-3 px-4 font-semibold tracking-wide w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {accounts.map((account) => (
                        <AccountRow
                          key={account.id}
                          account={account}
                          statementBalance={statementBalances[account.id]}
                          reconciliationStatus={reconciliationStatus[account.id]}
                          hideValues={hideValues}
                          onStatementChange={onStatementChange}
                          onToggleReconciled={onToggleReconciled}
                          onInvestigate={onInvestigate}
                          onImport={onImport}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {stats.matchCount > 0 && (
                    <span className="text-emerald-400">{stats.matchCount} matched</span>
                  )}
                  {stats.matchCount > 0 && stats.discrepancyCount > 0 && ' • '}
                  {stats.discrepancyCount > 0 && (
                    <span className="text-amber-400">{stats.discrepancyCount} need attention</span>
                  )}
                </div>
                <button
                  onClick={() => onViewDetails(institution)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                >
                  View detailed analysis
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
