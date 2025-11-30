import React, { useMemo } from 'react';
import {
  Edit3, Wallet, Layers, CreditCard, ChevronRight, Info,
  Building, BarChart2
} from 'lucide-react';
import StatsCard from './StatsCard';
import AssetTypeDistribution from './AssetTypeDistribution';
import { ASSET_TYPES, normalizeAssetType } from '../config';

/**
 * Initial selection screen with dashboard
 */
const SelectionScreen = ({
  portfolioSummary,
  positions,
  onSelectView
}) => {
  // Calculate asset type counts
  const assetTypeCounts = useMemo(() => {
    const counts = {};
    Object.keys(ASSET_TYPES).forEach(type => {
      counts[type] = positions.filter(p => {
        const assetType = normalizeAssetType(p.asset_type || p.item_type);
        return assetType === type;
      }).length;
    });
    return counts;
  }, [positions]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4">
        <div className="text-center mb-4">
          <div className="inline-flex items-center space-x-2 mb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Edit & Delete Manager</h2>
          </div>
          <p className="text-sm text-gray-400">Choose what you'd like to manage</p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {/* Accounts Card */}
          <div
            onClick={() => onSelectView('accounts')}
            className="group cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border-2 border-transparent hover:border-blue-500/50 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white mb-3 group-hover:scale-110 transition-transform">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Manage Accounts</h3>
              <p className="text-xs text-gray-400 mb-3">Edit account details or delete accounts</p>
              <div className="flex items-center text-sm text-blue-400 group-hover:text-blue-400">
                <span>Manage Accounts</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Positions Card */}
          <div
            onClick={() => onSelectView('positions')}
            className="group cursor-pointer bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-8 border-2 border-transparent hover:border-purple-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl text-white mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manage Positions</h3>
              <p className="text-gray-400 mb-4">Edit position details or delete positions</p>
              <div className="flex items-center text-sm text-purple-600 group-hover:text-purple-400">
                <span>Manage Positions</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Liabilities Card */}
          <div
            onClick={() => onSelectView('liabilities')}
            className="group cursor-pointer bg-gradient-to-br from-red-50 to-orange-100 rounded-2xl p-8 border-2 border-transparent hover:border-red-500/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl text-white mb-4 group-hover:scale-110 transition-transform">
                <CreditCard className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manage Liabilities</h3>
              <p className="text-gray-400 mb-4">Edit liability details or delete debts</p>
              <div className="flex items-center text-sm text-rose-400 group-hover:text-rose-400">
                <span>Manage Liabilities</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 mr-2" />
            <span className="text-sm text-blue-400">
              You can delete multiple items at once, but edit one at a time
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <div className="p-6 bg-gray-800 border-b border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Accounts"
            value={portfolioSummary.accountCount}
            icon={Building}
            color="blue"
            subtext="Across all institutions"
          />

          <StatsCard
            title="Total Positions"
            value={portfolioSummary.positionCount}
            icon={BarChart2}
            color="purple"
            subtext="All asset types"
          />

          <StatsCard
            title="Total Liabilities"
            value={portfolioSummary.liabilityCount}
            icon={CreditCard}
            color="red"
            subtext="All liability types"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="md:col-span-3">
            <AssetTypeDistribution
              assetCounts={assetTypeCounts}
              totalCount={portfolioSummary.positionCount}
            />
          </div>

          <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-4 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => onSelectView('accounts')}
                className="w-full py-2 px-3 text-sm text-left font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors flex items-center"
              >
                <Building className="w-4 h-4 mr-2" />
                Manage Accounts
              </button>

              <button
                onClick={() => onSelectView('positions')}
                className="w-full py-2 px-3 text-sm text-left font-medium text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors flex items-center"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                Manage Positions
              </button>

              <button
                onClick={() => onSelectView('liabilities')}
                className="w-full py-2 px-3 text-sm text-left font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors flex items-center"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Liabilities
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionScreen;
