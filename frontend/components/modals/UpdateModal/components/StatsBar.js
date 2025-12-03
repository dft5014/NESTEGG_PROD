// Stats Bar Component for Update Modal
import React from 'react';
import { motion } from 'framer-motion';
import {
  Banknote, CreditCard, Package, TrendingUp, TrendingDown,
  Hash, DollarSign, BarChart3
} from 'lucide-react';
import { AnimatedCurrency } from './AnimatedCounter';

/**
 * Single stat card component
 */
const StatCard = ({
  label,
  value,
  icon: Icon,
  format = 'currency',
  colorClass = 'from-gray-600 to-gray-700',
  textColorClass = 'text-gray-300',
  showSign = false,
  hideDecimals = false,
  delay = 0
}) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="text-center"
  >
    <div className="inline-flex flex-col items-center">
      {Icon && (
        <div className="p-2 bg-gray-800/50 rounded-lg mb-1.5">
          <Icon className={`w-4 h-4 ${textColorClass}`} />
        </div>
      )}
      <p className={`text-lg font-black bg-gradient-to-r ${colorClass} bg-clip-text text-transparent`}>
        {format === 'currency' ? (
          <AnimatedCurrency
            value={value}
            showSign={showSign}
            hideDecimals={hideDecimals}
          />
        ) : format === 'number' ? (
          value.toLocaleString()
        ) : (
          value
        )}
      </p>
      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
        {label}
      </p>
    </div>
  </motion.div>
);

/**
 * Stats bar showing key metrics
 */
const StatsBar = ({
  totals,
  draftTotals,
  showValues = true,
  compact = false
}) => {
  const hasChanges = draftTotals?.changedCount > 0;
  const delta = draftTotals?.totalDelta || 0;

  const stats = [
    {
      label: 'Cash',
      value: totals?.cash || 0,
      icon: Banknote,
      colorClass: 'from-emerald-500 to-emerald-600',
      textColorClass: 'text-emerald-400'
    },
    {
      label: 'Liabilities',
      value: totals?.liabilities || 0,
      icon: CreditCard,
      colorClass: 'from-rose-500 to-rose-600',
      textColorClass: 'text-rose-400'
    },
    {
      label: 'Other',
      value: totals?.other || 0,
      icon: Package,
      colorClass: 'from-violet-500 to-violet-600',
      textColorClass: 'text-violet-400'
    },
    {
      label: 'Net',
      value: totals?.net || 0,
      icon: BarChart3,
      colorClass: (totals?.net || 0) >= 0
        ? 'from-blue-500 to-blue-600'
        : 'from-orange-500 to-orange-600',
      textColorClass: (totals?.net || 0) >= 0 ? 'text-blue-400' : 'text-orange-400'
    }
  ];

  // Add change stats if there are changes
  if (hasChanges) {
    stats.push({
      label: 'Changed',
      value: draftTotals.changedCount,
      icon: Hash,
      format: 'number',
      colorClass: 'from-amber-500 to-amber-600',
      textColorClass: 'text-amber-400'
    });
    stats.push({
      label: 'Net Change',
      value: delta,
      icon: delta >= 0 ? TrendingUp : TrendingDown,
      showSign: true,
      colorClass: delta >= 0
        ? 'from-emerald-500 to-emerald-600'
        : 'from-rose-500 to-rose-600',
      textColorClass: delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
    });
  }

  return (
    <div className={`
      grid gap-3 px-4 py-3 bg-gray-900/60 border-b border-gray-800
      ${hasChanges ? 'grid-cols-6' : 'grid-cols-4'}
    `}>
      {stats.map((stat, idx) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={showValues ? stat.value : 0}
          icon={stat.icon}
          format={stat.format || 'currency'}
          colorClass={stat.colorClass}
          textColorClass={stat.textColorClass}
          showSign={stat.showSign}
          hideDecimals={compact}
          delay={idx * 0.05}
        />
      ))}
    </div>
  );
};

export default StatsBar;
