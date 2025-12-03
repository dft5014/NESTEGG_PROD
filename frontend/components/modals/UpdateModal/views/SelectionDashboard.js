// Selection Dashboard View for Update Modal
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, TrendingUp, TrendingDown, Banknote, CreditCard,
  Package, BarChart3, ArrowRight, ArrowLeft, Sparkles, Wallet
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import InstitutionCard from '../components/InstitutionCard';
import { AnimatedCurrency } from '../components/AnimatedCounter';

/**
 * Main stat card for the dashboard
 */
const MainStatCard = ({ label, value, icon: Icon, colorClass, trend = null, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className={`
      relative overflow-hidden p-5 rounded-2xl
      bg-gradient-to-br ${colorClass}
      shadow-lg
    `}
  >
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend >= 0 ? 'text-emerald-200' : 'text-rose-200'
          }`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <p className="text-2xl font-bold text-white mb-1">
        <AnimatedCurrency value={value} hideDecimals />
      </p>
      <p className="text-sm text-white/70 font-medium">{label}</p>
    </div>

    {/* Background decoration */}
    <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
    <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
  </motion.div>
);

/**
 * Selection dashboard with institution cards and summary
 */
const SelectionDashboard = ({
  institutionSummaries,
  totals,
  selectedInstitution,
  onSelectInstitution,
  onContinue,
  onBack,
  showValues = true,
  onRefresh,
  loading
}) => {
  // Calculate counts
  const counts = useMemo(() => {
    let cash = 0, liab = 0, other = 0;
    for (const inst of institutionSummaries) {
      cash += inst.cashCount;
      liab += inst.liabilityCount;
      other += inst.otherCount;
    }
    return { cash, liab, other, total: cash + liab + other };
  }, [institutionSummaries]);

  return (
    <div className="flex flex-col h-full">
      {/* Main stats */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="grid grid-cols-4 gap-4">
          <MainStatCard
            label="Cash & Deposits"
            value={totals?.cash || 0}
            icon={Banknote}
            colorClass="from-emerald-600 to-emerald-700"
            delay={0}
          />
          <MainStatCard
            label="Liabilities"
            value={totals?.liabilities || 0}
            icon={CreditCard}
            colorClass="from-rose-600 to-rose-700"
            delay={0.1}
          />
          <MainStatCard
            label="Other Assets"
            value={totals?.other || 0}
            icon={Package}
            colorClass="from-violet-600 to-violet-700"
            delay={0.2}
          />
          <MainStatCard
            label="Net Position"
            value={totals?.net || 0}
            icon={BarChart3}
            colorClass={(totals?.net || 0) >= 0
              ? 'from-blue-600 to-indigo-700'
              : 'from-orange-600 to-red-700'
            }
            delay={0.3}
          />
        </div>
      </div>

      {/* Institution selection */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Select Institution
          </h3>
          <span className="text-xs text-gray-500">
            {institutionSummaries.length} institution{institutionSummaries.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* "All" card */}
          <InstitutionCard
            institution="all"
            isSelected={selectedInstitution === null}
            onClick={() => onSelectInstitution(null)}
            showValues={showValues}
            totalCount={counts.total}
            cashValue={totals?.cash || 0}
            liabilityValue={totals?.liabilities || 0}
            otherValue={totals?.other || 0}
            netValue={totals?.net || 0}
            delay={0}
          />

          {/* Institution cards */}
          {institutionSummaries.map((inst, idx) => (
            <InstitutionCard
              key={inst.institution}
              institution={inst.institution}
              logo={inst.logo}
              cashValue={inst.cashValue}
              liabilityValue={inst.liabilityValue}
              otherValue={inst.otherValue}
              cashCount={inst.cashCount}
              liabilityCount={inst.liabilityCount}
              otherCount={inst.otherCount}
              netValue={inst.netValue}
              totalCount={inst.totalCount}
              isSelected={selectedInstitution === inst.institution}
              onClick={() => onSelectInstitution(inst.institution)}
              showValues={showValues}
              delay={(idx + 1) * 0.05}
            />
          ))}
        </div>
      </div>

      {/* Footer with action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex-shrink-0 p-4 border-t border-gray-800 bg-gray-900/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
              {counts.cash} cash
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-rose-500" />
              {counts.liab} liabilities
            </span>
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-violet-500" />
              {counts.other} other
            </span>
          </div>

          <button
            onClick={onContinue}
            className="
              inline-flex items-center gap-2 px-5 py-2.5
              text-sm font-semibold text-white
              bg-gradient-to-r from-cyan-600 to-blue-600
              hover:from-cyan-500 hover:to-blue-500
              rounded-xl shadow-lg shadow-cyan-500/25
              transition-all duration-200
            "
          >
            Continue to Update
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SelectionDashboard;
