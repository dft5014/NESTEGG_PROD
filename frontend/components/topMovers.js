// components/TopMovers.js
import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import { assetColors } from '@/utils/reportUtils';

/**
 * Format currency value
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Format percentage value
 */
const formatPercentage = (value) => {
  if (value === null || value === undefined) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

/**
 * Top Movers Component
 * Displays the biggest gainers and losers in the portfolio
 */
export default function TopMovers({ 
  movers = [], 
  title = "Top Movers",
  limit = 5,
  onPositionClick = null 
}) {
  const [filter, setFilter] = useState('all'); // 'all', 'gainers', 'losers'
  const [sortBy, setSortBy] = useState('percentChange'); // 'percentChange', 'valueChange'
  
  // Filter and sort the movers based on current settings
  const filteredMovers = movers
    .filter(mover => {
      if (filter === 'all') return true;
      if (filter === 'gainers') return mover.percentChange > 0;
      if (filter === 'losers') return mover.percentChange < 0;
      return true;
    })
    .sort((a, b) => {
      // Sort by absolute value for better visual organization
      if (sortBy === 'percentChange') {
        return Math.abs(b.percentChange) - Math.abs(a.percentChange);
      }
      return Math.abs(b.valueChange) - Math.abs(a.valueChange);
    })
    .slice(0, limit);
  
  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
          <button
            className={`px-2 py-1 text-xs rounded-md ${filter === 'all' ? 'bg-gray-600 text-white' : 'text-gray-300'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${filter === 'gainers' ? 'bg-green-600 text-white' : 'text-gray-300'}`}
            onClick={() => setFilter('gainers')}
          >
            Gainers
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${filter === 'losers' ? 'bg-red-600 text-white' : 'text-gray-300'}`}
            onClick={() => setFilter('losers')}
          >
            Losers
          </button>
        </div>
        <div className="flex space-x-1">
          <button
            className={`p-1 rounded-md ${sortBy === 'percentChange' ? 'text-white bg-gray-600' : 'text-gray-400 bg-gray-700'}`}
            onClick={() => setSortBy('percentChange')}
            title="Sort by percentage"
          >
            <Percent className="h-4 w-4" />
          </button>
          <button
            className={`p-1 rounded-md ${sortBy === 'valueChange' ? 'text-white bg-gray-600' : 'text-gray-400 bg-gray-700'}`}
            onClick={() => setSortBy('valueChange')}
            title="Sort by value"
          >
            <DollarSign className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Movers list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredMovers.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            No data available
          </div>
        ) : (
          filteredMovers.map((position, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg ${position.percentChange >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'} 
                border ${position.percentChange >= 0 ? 'border-green-700/30' : 'border-red-700/30'} 
                hover:brightness-110 transition-all duration-150 cursor-pointer`}
              onClick={() => onPositionClick && onPositionClick(position)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <div 
                    className="h-6 w-6 rounded-full mr-2 flex items-center justify-center"
                    style={{ backgroundColor: `${assetColors[position.asset_type] || assetColors.other}30` }}
                  >
                    <span style={{ color: assetColors[position.asset_type] || assetColors.other }}>
                      {position.asset_type === 'security' ? 'S' : 
                       position.asset_type === 'crypto' ? 'C' : 
                       position.asset_type === 'cash' ? '$' : 
                       position.asset_type === 'metal' ? 'M' : 'O'}
                    </span>
                  </div>
                  <span className="font-medium text-white">{position.ticker || position.name}</span>
                </div>
                <span className={`text-sm font-medium flex items-center ${position.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {position.percentChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {formatPercentage(position.percentChange)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">From {formatCurrency(position.startValue)}</span>
                <span className="text-gray-400">To {formatCurrency(position.endValue)}</span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${position.percentChange >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ 
                    width: `${Math.min(Math.abs(position.percentChange) * 2, 100)}%`,
                    marginLeft: position.percentChange < 0 ? `${100 - Math.min(Math.abs(position.percentChange) * 2, 100)}%` : '0'
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-1 text-xs">
                <span className={position.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatCurrency(position.valueChange)}
                </span>
                <span className="text-gray-400">
                  {position.holding ? `${position.holding} shares` : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Import the necessary icons
import { Percent, DollarSign } from 'lucide-react';