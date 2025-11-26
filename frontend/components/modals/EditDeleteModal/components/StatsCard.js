import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

/**
 * Dashboard statistics card
 */
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
  trend = null,
  subtext = null
}) => {
  return (
    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-full h-1 bg-${color}-500`}></div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-white mb-1 flex items-center">
            {typeof value === 'number' ? (
              <AnimatedCounter value={value} />
            ) : value}

            {trend !== null && trend !== undefined && (
              <span className={`ml-2 text-sm font-medium flex items-center ${
                trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-gray-500'
              }`}>
                {trend > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : trend < 0 ? (
                  <TrendingDown className="w-3 h-3 mr-1" />
                ) : null}
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </h3>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color}-100 group-hover:bg-${color}-200 transition-colors`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
      </div>
      <div className={`absolute bottom-0 right-0 w-16 h-16 bg-${color}-100 rounded-tl-full opacity-30 group-hover:opacity-60 transition-opacity`}></div>
    </div>
  );
};

export default StatsCard;
