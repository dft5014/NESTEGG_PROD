import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, Layers, CreditCard, ChevronRight,
  Building2, BarChart3, TrendingUp, DollarSign
} from 'lucide-react';
import { ASSET_TYPES, normalizeAssetType } from '../config';
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
const SelectionCard = ({ icon: Icon, title, subtitle, count, color, onClick, delay = 0 }) => {
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

        {/* Count badge */}
        <div className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full
          ${c.iconBg} border border-${color}-500/20
          mb-2
        `}>
          <span className={`text-xs font-semibold ${c.text}`}>
            <AnimatedStat value={count} /> items
          </span>
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

/**
 * Asset type breakdown component
 */
const AssetBreakdown = ({ positions }) => {
  const breakdown = useMemo(() => {
    const counts = {};
    Object.keys(ASSET_TYPES).forEach(type => {
      counts[type] = positions.filter(p => {
        const assetType = normalizeAssetType(p.asset_type || p.item_type);
        return assetType === type;
      }).length;
    });
    return counts;
  }, [positions]);

  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
    >
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Position Breakdown</h4>
      <div className="space-y-2">
        {Object.entries(ASSET_TYPES).map(([key, config]) => {
          const count = breakdown[key] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          const IconComponent = config.icon;

          return (
            <div key={key} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${config.color.primary}20` }}
              >
                <IconComponent
                  className="w-3.5 h-3.5"
                  style={{ color: config.color.primary }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300 font-medium">{config.name}</span>
                  <span className="text-xs text-gray-400">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: config.color.primary }}
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
  positions,
  onSelectView,
  showValues = true
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar - Now at the top */}
      <StatsBar portfolioSummary={portfolioSummary} showValues={showValues} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Selection Cards */}
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <SelectionCard
            icon={Wallet}
            title="Accounts"
            subtitle="Edit or delete accounts"
            count={portfolioSummary?.accountCount || 0}
            color="blue"
            onClick={() => onSelectView('accounts')}
            delay={0}
          />
          <SelectionCard
            icon={Layers}
            title="Positions"
            subtitle="Edit or delete positions"
            count={portfolioSummary?.positionCount || 0}
            color="purple"
            onClick={() => onSelectView('positions')}
            delay={0.1}
          />
          <SelectionCard
            icon={CreditCard}
            title="Liabilities"
            subtitle="Edit or delete debts"
            count={portfolioSummary?.liabilityCount || 0}
            color="rose"
            onClick={() => onSelectView('liabilities')}
            delay={0.2}
          />
        </div>

        {/* Asset Breakdown */}
        <AssetBreakdown positions={positions} />
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
