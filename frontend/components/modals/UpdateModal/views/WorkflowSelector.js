// WorkflowSelector View - Choose between balance updates or quantity updates
import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, RefreshCw, Sparkles,
  Banknote, CreditCard, Package, Coins, CircleDollarSign,
  ArrowRight, Grid3x3
} from 'lucide-react';

/**
 * Workflow card component
 */
const WorkflowCard = ({
  title,
  description,
  icon: Icon,
  features,
  gradient,
  iconBg,
  onClick,
  delay = 0
}) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    onClick={onClick}
    className={`
      group relative w-full text-left p-6 rounded-2xl
      border border-gray-700/50 bg-gray-800/50
      hover:border-gray-600 hover:bg-gray-800/80
      transition-all duration-300
      overflow-hidden
    `}
  >
    {/* Gradient background on hover */}
    <div className={`
      absolute inset-0 opacity-0 group-hover:opacity-100
      bg-gradient-to-br ${gradient}
      transition-opacity duration-300
    `} />

    {/* Content */}
    <div className="relative z-10">
      {/* Icon */}
      <div className={`
        inline-flex p-3 rounded-xl mb-4
        bg-gradient-to-br ${iconBg}
        shadow-lg
      `}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        {title}
        <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </h3>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4">{description}</p>

      {/* Features */}
      <div className="flex flex-wrap gap-2">
        {features.map((feature, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-300 bg-gray-700/50 rounded-lg border border-gray-600/50"
          >
            {feature.icon && <feature.icon className="w-3 h-3" />}
            {feature.label}
          </span>
        ))}
      </div>
    </div>
  </motion.button>
);

/**
 * WorkflowSelector - Initial view to choose update type
 */
const WorkflowSelector = ({
  onSelectBalances,
  onSelectQuantities,
  balanceStats,
  quantityStats,
  loading
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Context & Guidance */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 px-6 pt-6"
      >
        <div className="max-w-3xl mx-auto text-center mb-2">
          <p className="text-gray-300 text-sm leading-relaxed">
            Keep your portfolio accurate with quick batch updates. Choose a workflow below based on what you need to update today.
          </p>
        </div>
      </motion.div>

      {/* Workflow selection */}
      <div className="flex-1 p-6 pt-4 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Manual Balances */}
          <WorkflowCard
            title="Manual Balances"
            description="Quickly refresh account balances for cash, credit cards, loans, and other assets. Filter by institution and update multiple accounts at once."
            icon={Wallet}
            gradient="from-emerald-600/10 to-teal-600/10"
            iconBg="from-emerald-500 to-teal-600"
            onClick={onSelectBalances}
            delay={0.1}
            features={[
              { icon: Banknote, label: 'Cash' },
              { icon: CreditCard, label: 'Liabilities' },
              { icon: Package, label: 'Other Assets' }
            ]}
          />

          {/* Position Quantities */}
          <WorkflowCard
            title="Position Quantities"
            description="Adjust share counts and units across your investment accounts. Perfect for recording trades, splits, or reconciling broker statements."
            icon={Grid3x3}
            gradient="from-blue-600/10 to-indigo-600/10"
            iconBg="from-blue-500 to-indigo-600"
            onClick={onSelectQuantities}
            delay={0.2}
            features={[
              { icon: TrendingUp, label: 'Securities' },
              { icon: Coins, label: 'Crypto' },
              { icon: CircleDollarSign, label: 'Metals' }
            ]}
          />
        </div>
      </div>

      {/* Footer stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex-shrink-0 px-6 py-4 border-t border-gray-800 bg-gray-900/50"
      >
        <div className="flex items-center justify-center gap-8 text-xs text-gray-500">
          {balanceStats && (
            <span>
              <span className="text-emerald-400 font-semibold">{balanceStats.count}</span> balance items
            </span>
          )}
          {quantityStats && (
            <span>
              <span className="text-blue-400 font-semibold">{quantityStats.count}</span> position lots
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default WorkflowSelector;
