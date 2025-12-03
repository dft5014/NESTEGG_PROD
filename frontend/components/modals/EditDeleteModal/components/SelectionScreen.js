import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, Layers, CreditCard, ChevronRight,
  Building2, BarChart3, TrendingUp, DollarSign
} from 'lucide-react';
import { ASSET_TYPES, normalizeAssetType } from '../config';
import { ACCOUNT_CATEGORIES, getCategoryFromType } from '../config/accountCategories';
import { LIABILITY_TYPES } from '../config/liabilityTypes';
import { formatCurrency } from '@/utils/formatters';

/**
 * Animated counter component for stats
 */
const AnimatedStat = ({ value, prefix = '', suffix = '', duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    const targetValue = typeof value === 'number' ? value : 0;

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      setDisplayValue(Math.floor(eased * targetValue));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    startTime.current = null;
    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [value, duration]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

/**
 * Selection card component
 */
const SelectionCard = ({ icon: Icon, title, subtitle, count, totalValue, color, onClick, delay = 0, showValues = true }) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-600 to-indigo-700',
      hover: 'hover:border-blue-500/30 hover:shadow-blue-500/10',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
      glow: 'bg-blue-500'
    },
    purple: {
      bg: 'from-purple-600 to-pink-700',
      hover: 'hover:border-purple-500/30 hover:shadow-purple-500/10',
      text: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      glow: 'bg-purple-500'
    },
    rose: {
      bg: 'from-rose-600 to-orange-700',
      hover: 'hover:border-rose-500/30 hover:shadow-rose-500/10',
      text: 'text-rose-400',
      iconBg: 'bg-rose-500/20',
      glow: 'bg-rose-500'
    }
  };

  const c = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      className={`
        group relative cursor-pointer overflow-hidden
        bg-gradient-to-br from-gray-800/80 to-gray-900/80
        backdrop-blur-sm rounded-xl p-4
        border border-gray-700/50
        ${c.hover}
        hover:shadow-2xl hover:-translate-y-0.5
        transition-all duration-300
      `}
    >
      {/* Subtle glow effect on hover */}
      <div className={`absolute -inset-1 ${c.glow} rounded-xl opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-300`} />

      <div className="relative flex flex-col items-center text-center">
        {/* Icon */}
        <div className={`
          relative p-3 rounded-xl mb-2
          bg-gradient-to-br ${c.bg}
          shadow-lg group-hover:scale-110
          transition-transform duration-300
        `}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white mb-0.5">{title}</h3>

        {/* Subtitle */}
        <p className="text-xs text-gray-400 mb-2">{subtitle}</p>

        {/* Count and Value badges */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <div className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full
            ${c.iconBg} border border-${color}-500/20
          `}>
            <span className={`text-xs font-semibold ${c.text}`}>
              <AnimatedStat value={count} /> items
            </span>
          </div>
          {totalValue !== undefined && (
            <span className="text-xs text-gray-400">
              {showValues ? formatCurrency(totalValue) : '••••••'}
            </span>
          )}
        </div>

        {/* Action hint */}
        <div className={`flex items-center text-xs ${c.text} font-medium`}>
          <span>Manage</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Stats bar component
 */
const StatsBar = ({ portfolioSummary, showValues = true }) => {
  const stats = [
    {
      label: 'Net Worth',
      value: portfolioSummary?.netWorth || 0,
      format: 'currency',
      icon: TrendingUp,
      color: 'emerald'
    },
    {
      label: 'Total Assets',
      value: portfolioSummary?.totalAssets || 0,
      format: 'currency',
      icon: DollarSign,
      color: 'blue'
    },
    {
      label: 'Accounts',
      value: portfolioSummary?.accountCount || 0,
      format: 'number',
      icon: Building2,
      color: 'indigo'
    },
    {
      label: 'Positions',
      value: portfolioSummary?.positionCount || 0,
      format: 'number',
      icon: BarChart3,
      color: 'purple'
    },
    {
      label: 'Liabilities',
      value: portfolioSummary?.liabilityCount || 0,
      format: 'number',
      icon: CreditCard,
      color: 'rose'
    }
  ];

  const colorClasses = {
    emerald: 'from-emerald-600 to-emerald-700',
    blue: 'from-blue-600 to-blue-700',
    indigo: 'from-indigo-600 to-indigo-700',
    purple: 'from-purple-600 to-purple-700',
    rose: 'from-rose-600 to-rose-700'
  };

  return (
    <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-gray-900/50 border-b border-gray-800">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-auto px-2 py-1 bg-gray-800 rounded-lg mb-0.5">
            <p className={`text-sm font-black bg-gradient-to-r ${colorClasses[stat.color]} bg-clip-text text-transparent`}>
              {stat.format === 'currency'
                ? (showValues ? formatCurrency(stat.value).replace(/\.\d{2}$/, '') : '••••')
                : <AnimatedStat value={stat.value} />
              }
            </p>
          </div>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

// Color map for progress bars
const PROGRESS_COLORS = {
  blue: '#3B82F6',
  indigo: '#6366F1',
  purple: '#8B5CF6',
  pink: '#EC4899',
  rose: '#F43F5E',
  red: '#EF4444',
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#EAB308',
  lime: '#84CC16',
  green: '#22C55E',
  emerald: '#10B981',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  sky: '#0EA5E9',
  gray: '#6B7280'
};

/**
 * Account breakdown by category component
 */
const AccountBreakdown = ({ accounts, showValues = true }) => {
  const breakdown = useMemo(() => {
    const data = {};

    ACCOUNT_CATEGORIES.forEach(category => {
      data[category.id] = { count: 0, value: 0, config: category };
    });

    // Add 'other' for uncategorized
    data.other = { count: 0, value: 0, config: { id: 'other', name: 'Other', color: 'gray' } };

    accounts.forEach(account => {
      const categoryId = getCategoryFromType(account.account_type) || 'other';
      if (data[categoryId]) {
        data[categoryId].count += 1;
        data[categoryId].value += parseFloat(account.totalValue || account.total_value || 0);
      } else {
        data.other.count += 1;
        data.other.value += parseFloat(account.totalValue || account.total_value || 0);
      }
    });

    return data;
  }, [accounts]);

  const total = Object.values(breakdown).reduce((sum, d) => sum + d.value, 0);
  const hasData = Object.values(breakdown).some(d => d.count > 0);

  if (!hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50"
    >
      <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">By Category</h4>
      <div className="space-y-2">
        {Object.entries(breakdown)
          .filter(([_, data]) => data.count > 0)
          .sort((a, b) => b[1].value - a[1].value)
          .map(([key, data]) => {
            const percentage = total > 0 ? (data.value / total) * 100 : 0;
            const IconComponent = data.config.icon || Wallet;
            const colorHex = PROGRESS_COLORS[data.config.color] || PROGRESS_COLORS.gray;

            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${colorHex}20` }}
                >
                  <IconComponent
                    className="w-3 h-3"
                    style={{ color: colorHex }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-gray-300 font-medium truncate">{data.config.name}</span>
                    <span className="text-[11px] text-gray-400 ml-2">
                      {data.count} • {showValues ? formatCurrency(data.value) : '••••'}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: colorHex }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
};

/**
 * Asset type breakdown component - now shows VALUES not just counts
 */
const AssetBreakdown = ({ positions, showValues = true }) => {
  const breakdown = useMemo(() => {
    const data = {};
    Object.keys(ASSET_TYPES).forEach(type => {
      data[type] = { count: 0, value: 0 };
    });

    positions.forEach(p => {
      const assetType = normalizeAssetType(p.asset_type || p.item_type);
      if (data[assetType]) {
        data[assetType].count += 1;
        data[assetType].value += parseFloat(p.current_value || p.currentValue || 0);
      }
    });
    return data;
  }, [positions]);

  const totalValue = Object.values(breakdown).reduce((sum, d) => sum + d.value, 0);
  const hasData = Object.values(breakdown).some(d => d.count > 0);

  if (!hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50"
    >
      <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">By Asset Type</h4>
      <div className="space-y-2">
        {Object.entries(ASSET_TYPES)
          .filter(([key]) => breakdown[key]?.count > 0)
          .sort((a, b) => (breakdown[b[0]]?.value || 0) - (breakdown[a[0]]?.value || 0))
          .map(([key, config]) => {
            const data = breakdown[key];
            const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
            const IconComponent = config.icon;
            const colorHex = config.color?.primary || PROGRESS_COLORS.purple;

            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${colorHex}20` }}
                >
                  <IconComponent
                    className="w-3 h-3"
                    style={{ color: colorHex }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-gray-300 font-medium truncate">{config.name}</span>
                    <span className="text-[11px] text-gray-400 ml-2">
                      {data.count} • {showValues ? formatCurrency(data.value) : '••••'}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: colorHex }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
};

/**
 * Liability breakdown by type component
 */
const LiabilityBreakdown = ({ liabilities, showValues = true }) => {
  const breakdown = useMemo(() => {
    const data = {};

    Object.keys(LIABILITY_TYPES).forEach(type => {
      data[type] = { count: 0, balance: 0, config: LIABILITY_TYPES[type] };
    });

    liabilities.forEach(liability => {
      const liabilityType = liability.liability_type || 'other';
      if (data[liabilityType]) {
        data[liabilityType].count += 1;
        data[liabilityType].balance += parseFloat(liability.current_balance || liability.total_current_balance || 0);
      } else if (data.other) {
        data.other.count += 1;
        data.other.balance += parseFloat(liability.current_balance || liability.total_current_balance || 0);
      }
    });

    return data;
  }, [liabilities]);

  const totalBalance = Object.values(breakdown).reduce((sum, d) => sum + d.balance, 0);
  const hasData = Object.values(breakdown).some(d => d.count > 0);

  if (!hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.25 }}
      className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50"
    >
      <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">By Debt Type</h4>
      <div className="space-y-2">
        {Object.entries(breakdown)
          .filter(([_, data]) => data.count > 0)
          .sort((a, b) => b[1].balance - a[1].balance)
          .map(([key, data]) => {
            const percentage = totalBalance > 0 ? (data.balance / totalBalance) * 100 : 0;
            const IconComponent = data.config.icon || CreditCard;
            const colorHex = PROGRESS_COLORS[data.config.color] || PROGRESS_COLORS.rose;

            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${colorHex}20` }}
                >
                  <IconComponent
                    className="w-3 h-3"
                    style={{ color: colorHex }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-gray-300 font-medium truncate">{data.config.label}</span>
                    <span className="text-[11px] text-gray-400 ml-2">
                      {data.count} • {showValues ? formatCurrency(data.balance) : '••••'}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.35 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: colorHex }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
};

/**
 * Initial selection screen with dashboard
 */
const SelectionScreen = ({
  portfolioSummary,
  accounts = [],
  positions = [],
  liabilities = [],
  onSelectView,
  showValues = true
}) => {
  // Calculate totals for cards
  const accountTotal = useMemo(() =>
    accounts.reduce((sum, a) => sum + parseFloat(a.totalValue || a.total_value || 0), 0),
    [accounts]
  );

  const positionTotal = useMemo(() =>
    positions.reduce((sum, p) => sum + parseFloat(p.current_value || p.currentValue || 0), 0),
    [positions]
  );

  const liabilityTotal = useMemo(() =>
    liabilities.reduce((sum, l) => sum + parseFloat(l.current_balance || l.total_current_balance || 0), 0),
    [liabilities]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <StatsBar portfolioSummary={portfolioSummary} showValues={showValues} />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto p-4">
        {/* Three columns: each with card + breakdown */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Accounts Column */}
          <div className="space-y-3">
            <SelectionCard
              icon={Wallet}
              title="Accounts"
              subtitle="Edit or delete accounts"
              count={portfolioSummary?.accountCount || accounts.length || 0}
              totalValue={accountTotal}
              color="blue"
              onClick={() => onSelectView('accounts')}
              delay={0}
              showValues={showValues}
            />
            <AccountBreakdown accounts={accounts} showValues={showValues} />
          </div>

          {/* Positions Column */}
          <div className="space-y-3">
            <SelectionCard
              icon={Layers}
              title="Positions"
              subtitle="Edit or delete positions"
              count={portfolioSummary?.positionCount || positions.length || 0}
              totalValue={positionTotal}
              color="purple"
              onClick={() => onSelectView('positions')}
              delay={0.1}
              showValues={showValues}
            />
            <AssetBreakdown positions={positions} showValues={showValues} />
          </div>

          {/* Liabilities Column */}
          <div className="space-y-3">
            <SelectionCard
              icon={CreditCard}
              title="Liabilities"
              subtitle="Edit or delete debts"
              count={portfolioSummary?.liabilityCount || liabilities.length || 0}
              totalValue={liabilityTotal}
              color="rose"
              onClick={() => onSelectView('liabilities')}
              delay={0.2}
              showValues={showValues}
            />
            <LiabilityBreakdown liabilities={liabilities} showValues={showValues} />
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex-shrink-0 px-4 py-2 border-t border-gray-800 bg-gray-900/50"
      >
        <p className="text-center text-xs text-gray-500">
          Click a category above to start managing your data
        </p>
      </motion.div>
    </div>
  );
};

export default SelectionScreen;
