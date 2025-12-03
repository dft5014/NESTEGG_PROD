// AccountDetailView - Deep dive into a single account with position-level analysis
import React, { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Building2, CheckCircle, AlertTriangle, Clock,
  Shield, Target, FileSpreadsheet, HelpCircle, RefreshCw,
  TrendingUp, TrendingDown, Zap, DollarSign, BarChart3,
  Coins, Gem, Home, ChevronDown, ChevronRight, Edit3, Plus,
  ExternalLink, PieChart
} from 'lucide-react';
import {
  fmtCurrency,
  getValidationStatus,
  calculateDifference,
  getInstitutionLogo,
  ASSET_TYPE_CONFIG,
  VALIDATION_STATUS
} from '../utils/constants';
import { VIEWS } from '../state/reducer';
import CurrencyInput from '../components/CurrencyInput';

// Position row component
function PositionRow({ position, hideValues }) {
  const value = position.currentValue || position.current_value || 0;
  const quantity = position.shares || position.quantity || 0;
  const price = position.price || position.latest_price_per_unit || 0;
  const costBasis = position.costBasis || position.cost_basis || 0;
  const gainLoss = value - costBasis;
  const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

  return (
    <tr className="border-b border-gray-800 last:border-b-0 hover:bg-gray-900/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">
              {position.ticker || position.symbol || position.identifier || 'Unknown'}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[200px]">
              {position.name || position.security_name || ''}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-sm text-gray-300 tabular-nums">{quantity.toLocaleString()}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-sm text-gray-300 tabular-nums">{fmtCurrency(price, hideValues)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className="text-sm font-semibold text-white tabular-nums">{fmtCurrency(value, hideValues)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <span className={`text-sm font-medium tabular-nums ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hideValues ? '••••' : `${gainLoss >= 0 ? '+' : ''}${fmtCurrency(gainLoss)}`}
          </span>
          <span className={`text-xs ${gainLoss >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
            ({gainLossPct.toFixed(1)}%)
          </span>
        </div>
      </td>
    </tr>
  );
}

// Asset type breakdown card
function AssetBreakdownCard({ type, positions, total, hideValues }) {
  const [expanded, setExpanded] = useState(false);
  const config = ASSET_TYPE_CONFIG[type] || ASSET_TYPE_CONFIG.other;
  const Icon = config.icon;
  const positionCount = positions.length;
  const typeTotal = positions.reduce((sum, p) => sum + (p.currentValue || p.current_value || 0), 0);
  const percentage = total > 0 ? (typeTotal / total) * 100 : 0;

  if (positionCount === 0) return null;

  return (
    <div className={`rounded-xl border ${config.bgClass} ${config.textClass.replace('text-', 'border-')}/20`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${config.bgClass} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.textClass}`} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-white">{config.label}</div>
            <div className="text-xs text-gray-400">
              {positionCount} position{positionCount !== 1 ? 's' : ''} • {percentage.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white tabular-nums">
            {fmtCurrency(typeTotal, hideValues)}
          </span>
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs uppercase text-gray-500 border-b border-gray-700">
                      <th className="text-left py-2 px-4 font-medium">Position</th>
                      <th className="text-right py-2 px-4 font-medium">Qty</th>
                      <th className="text-right py-2 px-4 font-medium">Price</th>
                      <th className="text-right py-2 px-4 font-medium">Value</th>
                      <th className="text-right py-2 px-4 font-medium">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos, idx) => (
                      <PositionRow key={pos.id || idx} position={pos} hideValues={hideValues} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Common discrepancy causes
function DiscrepancyCauses({ diff }) {
  const causes = [
    {
      icon: Clock,
      title: 'Price Timing',
      description: 'Market prices may differ from statement date',
      color: 'amber'
    },
    {
      icon: Zap,
      title: 'Pending Transactions',
      description: 'Unsettled trades or pending transfers',
      color: 'indigo'
    },
    {
      icon: DollarSign,
      title: 'Dividends & Interest',
      description: 'Recent income not yet recorded',
      color: 'emerald'
    },
    {
      icon: TrendingUp,
      title: 'Missing Positions',
      description: 'Positions not tracked in NestEgg',
      color: 'blue'
    }
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-indigo-400" />
        Common Causes
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {causes.map((cause, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg bg-${cause.color}-500/10 border border-${cause.color}-500/20`}
          >
            <div className="flex items-center gap-2 mb-1">
              <cause.icon className={`w-4 h-4 text-${cause.color}-400`} />
              <span className={`text-sm font-medium text-${cause.color}-300`}>{cause.title}</span>
            </div>
            <p className={`text-xs text-${cause.color}-400/70`}>{cause.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main AccountDetailView component
export default function AccountDetailView({
  state,
  dispatch,
  actions,
  positions,
  onOpenImportModal
}) {
  const account = state.activeAccount;
  const nesteggBalance = account?.totalValue || 0;
  const statementBalance = state.statementBalances[account?.id];
  const reconciliation = state.reconciliationStatus[account?.id];
  const isReconciled = reconciliation?.reconciled || false;

  const status = useMemo(() =>
    getValidationStatus(nesteggBalance, statementBalance, isReconciled),
    [nesteggBalance, statementBalance, isReconciled]
  );

  const diff = useMemo(() =>
    calculateDifference(nesteggBalance, statementBalance),
    [nesteggBalance, statementBalance]
  );

  // Group positions by asset type
  const positionsByType = useMemo(() => {
    const accountPositions = (positions || []).filter(pos =>
      String(pos.accountId || pos.inv_account_id || pos.account_id) === String(account?.id)
    );

    const grouped = { security: [], cash: [], crypto: [], metal: [], other: [] };

    accountPositions.forEach(pos => {
      const type = String(pos.asset_type || pos.assetType || 'other').toLowerCase();
      if (type.includes('sec') || type.includes('stock') || type.includes('equity')) {
        grouped.security.push(pos);
      } else if (type.includes('cash')) {
        grouped.cash.push(pos);
      } else if (type.includes('crypto')) {
        grouped.crypto.push(pos);
      } else if (type.includes('metal')) {
        grouped.metal.push(pos);
      } else {
        grouped.other.push(pos);
      }
    });

    return grouped;
  }, [positions, account?.id]);

  // Calculate totals by type
  const totals = useMemo(() => {
    const result = { securities: 0, cash: 0, crypto: 0, metals: 0, other: 0 };
    positionsByType.security.forEach(p => result.securities += (p.currentValue || p.current_value || 0));
    positionsByType.cash.forEach(p => result.cash += (p.currentValue || p.current_value || 0));
    positionsByType.crypto.forEach(p => result.crypto += (p.currentValue || p.current_value || 0));
    positionsByType.metal.forEach(p => result.metals += (p.currentValue || p.current_value || 0));
    positionsByType.other.forEach(p => result.other += (p.currentValue || p.current_value || 0));
    return result;
  }, [positionsByType]);

  // Handlers
  const handleGoBack = useCallback(() => {
    dispatch(actions.goBack());
  }, [dispatch, actions]);

  const handleStatementChange = useCallback((value) => {
    dispatch(actions.setStatementBalance(account?.id, value));
  }, [dispatch, actions, account?.id]);

  const handleToggleReconciled = useCallback(() => {
    dispatch(actions.toggleReconciled(account?.id));
  }, [dispatch, actions, account?.id]);

  const handleImport = useCallback(() => {
    onOpenImportModal(account);
  }, [onOpenImportModal, account]);

  if (!account) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No account selected</p>
      </div>
    );
  }

  const logo = getInstitutionLogo(account.institution);
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            {logo ? (
              <img
                src={logo}
                alt={account.institution}
                className="w-12 h-12 rounded-xl object-contain border border-gray-700 bg-white p-1.5"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700">
                <Building2 className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{account.name}</h2>
              <p className="text-sm text-gray-400">
                {account.institution} • {account.type || account.accountType || 'Account'}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${status.badgeClass} border`}>
            <StatusIcon className={`w-5 h-5 ${status.textClass}`} />
            <span className={`font-semibold ${status.textClass}`}>{status.label}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-950">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Balance Comparison */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">
                NestEgg Balance
              </div>
              <div className="text-2xl font-bold text-white tabular-nums">
                {fmtCurrency(nesteggBalance, state.hideValues)}
              </div>
              <div className="text-xs text-indigo-300/70 mt-1">Calculated from positions</div>
            </div>

            <div className="p-5 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <div className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-2">
                Statement Balance
              </div>
              <CurrencyInput
                value={statementBalance}
                onChange={handleStatementChange}
                placeholder="Enter amount"
                size="lg"
                disabled={isReconciled}
                className="mt-1"
              />
              <div className="text-xs text-purple-300/70 mt-2">From your statement</div>
            </div>

            <div className={`p-5 rounded-xl border ${diff.hasStatement ? status.bgClass : 'bg-gray-800/50'} ${diff.hasStatement ? status.borderClass : 'border-gray-700'}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${diff.hasStatement ? status.textClass : 'text-gray-500'}`}>
                Difference
              </div>
              <div className={`text-2xl font-bold tabular-nums ${
                !diff.hasStatement ? 'text-gray-600' :
                diff.isMatch ? 'text-emerald-400' :
                diff.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {diff.hasStatement
                  ? `${diff.amount > 0 ? '+' : ''}${fmtCurrency(diff.amount, state.hideValues)}`
                  : '—'
                }
              </div>
              {diff.hasStatement && (
                <div className={`text-xs mt-1 ${diff.isMatch ? 'text-emerald-400/70' : status.textClass + '/70'}`}>
                  {diff.isMatch ? 'Perfect match!' : `${diff.percent.toFixed(2)}% ${diff.isPositive ? 'over' : 'under'}`}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600/10 border border-amber-500/30 text-amber-400 rounded-xl hover:bg-amber-600/20 transition-colors font-medium"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Import Statement
            </button>
            <button
              onClick={handleToggleReconciled}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                isReconciled
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20'
              }`}
            >
              <Shield className="w-5 h-5" />
              {isReconciled ? 'Marked as Reconciled' : 'Mark as Reconciled'}
            </button>
          </div>

          {/* Discrepancy Causes (if applicable) */}
          {diff.hasStatement && !diff.isMatch && !isReconciled && (
            <div className="p-4 bg-gray-900/70 rounded-xl border border-gray-800">
              <DiscrepancyCauses diff={diff} />
            </div>
          )}

          {/* Position Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-400" />
              Position Breakdown
            </h3>
            <div className="space-y-3">
              <AssetBreakdownCard
                type="security"
                positions={positionsByType.security}
                total={nesteggBalance}
                hideValues={state.hideValues}
              />
              <AssetBreakdownCard
                type="cash"
                positions={positionsByType.cash}
                total={nesteggBalance}
                hideValues={state.hideValues}
              />
              <AssetBreakdownCard
                type="crypto"
                positions={positionsByType.crypto}
                total={nesteggBalance}
                hideValues={state.hideValues}
              />
              <AssetBreakdownCard
                type="metal"
                positions={positionsByType.metal}
                total={nesteggBalance}
                hideValues={state.hideValues}
              />
              <AssetBreakdownCard
                type="other"
                positions={positionsByType.other}
                total={nesteggBalance}
                hideValues={state.hideValues}
              />
            </div>
          </div>

          {/* Reconciliation Notes */}
          {isReconciled && reconciliation?.timestamp && (
            <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-indigo-300">Reconciliation Info</span>
              </div>
              <p className="text-xs text-indigo-400/70">
                Reconciled on {new Date(reconciliation.timestamp).toLocaleDateString()} at{' '}
                {new Date(reconciliation.timestamp).toLocaleTimeString()}
              </p>
              {reconciliation.notes && (
                <p className="text-xs text-indigo-300 mt-2">{reconciliation.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
