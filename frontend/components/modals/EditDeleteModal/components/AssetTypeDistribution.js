import React from 'react';
import { ASSET_TYPES } from '../config';

/**
 * Asset type distribution progress bars
 */
const AssetTypeDistribution = ({ assetCounts, totalCount }) => {
  return (
    <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Asset Distribution</h3>
        <div className="text-xs text-gray-500">{totalCount} total positions</div>
      </div>

      <div className="space-y-3">
        {Object.entries(ASSET_TYPES).map(([key, config]) => {
          const count = assetCounts[key] || 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <config.icon className={`w-3.5 h-3.5 mr-1.5 ${config.color.text}`} />
                  <span className="font-medium text-gray-300">{config.name}</span>
                </div>
                <div className="text-gray-400 font-medium">
                  {count} ({percentage.toFixed(1)}%)
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${config.color.bg} transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AssetTypeDistribution;
