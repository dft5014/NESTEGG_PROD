// StatsHeader - Animated statistics display for validation modal
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, CheckCircle, AlertTriangle, Clock, Shield,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { fmtCurrency } from '../utils/constants';

// Animated number component
function AnimatedNumber({ value, suffix = '', prefix = '' }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const start = displayed;
    const end = Number(value) || 0;
    const duration = 400;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}{Math.round(displayed).toLocaleString()}{suffix}
    </span>
  );
}

// Stat card component
function StatCard({ label, value, icon: Icon, color, animate = true, isText = false, hideValues = false }) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
      icon: 'text-indigo-400'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      icon: 'text-emerald-400'
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      icon: 'text-amber-400'
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      icon: 'text-rose-400'
    },
    gray: {
      bg: 'bg-gray-800/50',
      border: 'border-gray-700',
      text: 'text-gray-300',
      icon: 'text-gray-400'
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      icon: 'text-purple-400'
    }
  };

  const classes = colorClasses[color] || colorClasses.gray;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-xl p-4
        ${classes.bg} border ${classes.border}
        transition-all duration-200 hover:scale-[1.02]
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {Icon && (
          <Icon className={`w-4 h-4 ${classes.icon}`} />
        )}
      </div>
      <div className={`text-2xl font-bold ${classes.text}`}>
        {hideValues ? '******' : (
          isText ? value : (
            animate ? <AnimatedNumber value={value} /> : value
          )
        )}
      </div>
    </motion.div>
  );
}

// Main stats header component
export default function StatsHeader({ stats, hideValues = false }) {
  const {
    totalAccounts = 0,
    pendingAccounts = 0,
    matchedAccounts = 0,
    discrepancyAccounts = 0,
    reconciledAccounts = 0,
    totalDiff = 0,
    completionRate = 0
  } = stats;

  const diffIsPositive = totalDiff > 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="Accounts"
        value={totalAccounts}
        icon={Building2}
        color="indigo"
        hideValues={hideValues}
      />
      <StatCard
        label="Pending"
        value={pendingAccounts}
        icon={Clock}
        color="gray"
        hideValues={hideValues}
      />
      <StatCard
        label="Matched"
        value={matchedAccounts}
        icon={CheckCircle}
        color="emerald"
        hideValues={hideValues}
      />
      <StatCard
        label="Discrepancies"
        value={discrepancyAccounts}
        icon={AlertTriangle}
        color={discrepancyAccounts > 0 ? 'amber' : 'gray'}
        hideValues={hideValues}
      />
      <StatCard
        label="Reconciled"
        value={reconciledAccounts}
        icon={Shield}
        color="purple"
        hideValues={hideValues}
      />
      <StatCard
        label="Total Diff"
        value={fmtCurrency(Math.abs(totalDiff), hideValues)}
        icon={diffIsPositive ? TrendingUp : TrendingDown}
        color={Math.abs(totalDiff) < 1 ? 'emerald' : (totalDiff > 0 ? 'emerald' : 'rose')}
        isText
        hideValues={hideValues}
      />
    </div>
  );
}

// Compact stats bar for nested views
export function CompactStatsBar({ stats, hideValues = false }) {
  const {
    totalAccounts = 0,
    matchedAccounts = 0,
    discrepancyAccounts = 0,
    completionRate = 0
  } = stats;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Progress</span>
        <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
          />
        </div>
        <span className="text-xs font-medium text-white tabular-nums">
          {completionRate.toFixed(0)}%
        </span>
      </div>
      <div className="h-4 w-px bg-gray-700" />
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{matchedAccounts}</span>
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span className="text-amber-400 font-medium">{discrepancyAccounts}</span>
        </span>
      </div>
    </div>
  );
}
