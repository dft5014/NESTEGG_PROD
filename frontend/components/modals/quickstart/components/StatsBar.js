// Stats Bar Component for QuickStart Modal
import React, { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ASSET_TYPES } from '../utils/constants';

export default function StatsBar({ data, type = 'positions' }) {
  const stats = useMemo(() => {
    if (type === 'accounts') {
      return calculateAccountStats(data);
    } else if (type === 'positions') {
      return calculatePositionStats(data);
    } else if (type === 'liabilities') {
      return calculateLiabilityStats(data);
    }
    return {};
  }, [data, type]);

  if (type === 'accounts') {
    return (
      <div className="flex items-center space-x-6 px-4 py-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl border border-gray-700">
        <StatItem label="Total" value={stats.total} color="indigo" />
        <StatItem label="Ready" value={stats.ready} color="emerald" />
        <StatItem label="Institutions" value={stats.institutions} color="purple" />
        <StatItem label="Categories" value={stats.categories} color="amber" />
      </div>
    );
  }

  if (type === 'positions') {
    return (
      <div className="flex items-center space-x-6 px-4 py-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl border border-gray-700">
        <StatItem label="Total" value={stats.total} color="indigo" />
        <StatItem label="Ready" value={stats.ready} color="emerald" />
        <StatItem label="Draft" value={stats.draft} color="amber" />
        <StatItem label="Value" value={formatCurrency(stats.value)} color="blue" isText />
        {stats.added > 0 && <StatItem label="Added" value={stats.added} color="purple" />}
      </div>
    );
  }

  if (type === 'liabilities') {
    return (
      <div className="flex items-center space-x-6 px-4 py-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl border border-gray-700">
        <StatItem label="Total" value={stats.total} color="indigo" />
        <StatItem label="Ready" value={stats.ready} color="emerald" />
        <StatItem label="Balance" value={formatCurrency(stats.totalBalance)} color="rose" isText />
        {stats.avgRate > 0 && <StatItem label="Avg Rate" value={`${stats.avgRate.toFixed(1)}%`} color="orange" isText />}
      </div>
    );
  }

  return null;
}

function StatItem({ label, value, color, isText = false }) {
  const colorClasses = {
    indigo: 'from-indigo-600 to-indigo-700',
    emerald: 'from-emerald-600 to-emerald-700',
    purple: 'from-purple-600 to-purple-700',
    amber: 'from-amber-600 to-amber-700',
    blue: 'from-blue-600 to-blue-700',
    rose: 'from-rose-600 to-rose-700',
    orange: 'from-orange-600 to-orange-700'
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center min-w-[2.5rem] h-10 bg-gray-800 rounded-lg shadow-sm mb-1 px-2">
        <p className={`text-lg font-black bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
          {isText ? value : <AnimatedNumber value={value} />}
        </p>
      </div>
      <p className="text-xs font-medium text-gray-400">{label}</p>
    </div>
  );
}

function AnimatedNumber({ value }) {
  // Simple animated number - could be enhanced with framer-motion
  return <span>{value}</span>;
}

// Stats Calculation Functions
function calculateAccountStats(accounts) {
  const total = accounts.length;
  const ready = accounts.filter(a =>
    a.accountName && a.institution && a.accountCategory && a.accountType
  ).length;
  const institutions = new Set(accounts.map(a => a.institution).filter(Boolean)).size;
  const categories = new Set(accounts.map(a => a.accountCategory).filter(Boolean)).size;

  return { total, ready, institutions, categories };
}

function calculatePositionStats(positions) {
  let total = 0;
  let ready = 0;
  let draft = 0;
  let added = 0;
  let value = 0;

  Object.entries(positions).forEach(([assetType, typePositions]) => {
    typePositions.forEach(pos => {
      total++;

      // Calculate status
      const status = pos.status || 'draft';
      if (status === 'ready') ready++;
      else if (status === 'draft') draft++;
      else if (status === 'added') added++;

      // Calculate value
      if (assetType === 'security') {
        value += (parseFloat(pos.data.shares) || 0) * (parseFloat(pos.data.price) || 0);
      } else if (assetType === 'cash') {
        value += parseFloat(pos.data.amount) || 0;
      } else if (assetType === 'crypto') {
        value += (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price) || 0);
      } else if (assetType === 'metal') {
        value += (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price_per_unit) || 0);
      } else if (assetType === 'other') {
        value += parseFloat(pos.data.current_value) || 0;
      }
    });
  });

  return { total, ready, draft, added, value };
}

function calculateLiabilityStats(liabilities) {
  const total = liabilities.length;
  const ready = liabilities.filter(l =>
    l.name && l.liability_type && l.institution_name && l.current_balance
  ).length;

  let totalBalance = 0;
  let rateSum = 0;
  let rateCount = 0;

  liabilities.forEach(l => {
    totalBalance += parseFloat(l.current_balance) || 0;
    if (l.interest_rate) {
      rateSum += parseFloat(l.interest_rate);
      rateCount++;
    }
  });

  const avgRate = rateCount > 0 ? rateSum / rateCount : 0;

  return { total, ready, totalBalance, avgRate };
}

// Type-specific stats (for detail views)
export function PositionTypeStats({ positions, assetType }) {
  const config = ASSET_TYPES[assetType];
  if (!config) return null;

  const typePositions = positions[assetType] || [];
  const count = typePositions.length;
  const ready = typePositions.filter(p => p.status === 'ready').length;

  let value = 0;
  typePositions.forEach(pos => {
    if (assetType === 'security') {
      value += (parseFloat(pos.data.shares) || 0) * (parseFloat(pos.data.price) || 0);
    } else if (assetType === 'cash') {
      value += parseFloat(pos.data.amount) || 0;
    } else if (assetType === 'crypto') {
      value += (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price) || 0);
    } else if (assetType === 'metal') {
      value += (parseFloat(pos.data.quantity) || 0) * (parseFloat(pos.data.current_price_per_unit) || 0);
    } else if (assetType === 'other') {
      value += parseFloat(pos.data.current_value) || 0;
    }
  });

  return (
    <div className="flex items-center space-x-3 text-xs text-gray-400">
      <span>{count} position{count !== 1 ? 's' : ''}</span>
      <span className="text-gray-600">|</span>
      <span className="text-emerald-400">{ready} ready</span>
      <span className="text-gray-600">|</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
