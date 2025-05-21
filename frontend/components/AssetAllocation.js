// components/AssetAllocation.js
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { assetColors } from '@/utils/reportUtils';
import { LineChart, BarChart2, CreditCard, Coins, Package, ArrowRight, Globe, Building2, Home } from 'lucide-react';

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
  return `${value.toFixed(1)}%`;
};

/**
 * Custom tooltip component for asset allocation pie chart
 */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-700 dark:border-gray-700 text-white">
        <p className="font-medium">{data.name}</p>
        <p className="text-indigo-400 dark:text-indigo-400">{formatPercentage(data.percentage)}</p>
        <p className="text-gray-300 dark:text-gray-400">{formatCurrency(data.value)}</p>
      </div>
    );
  }
  return null;
};

/**
 * Asset icon mapping
 */
const assetIcons = {
  security: <LineChart className="h-4 w-4" />,
  cash: <CreditCard className="h-4 w-4" />,
  crypto: <Coins className="h-4 w-4" />,
  metal: <Package className="h-4 w-4" />,
  realestate: <Home className="h-4 w-4" />,
  bond: <Building2 className="h-4 w-4" />,
  international: <Globe className="h-4 w-4" />,
  other: <BarChart2 className="h-4 w-4" />
};

/**
 * Asset Allocation Component
 * Displays asset allocation breakdown with a pie chart and detailed list
 */
export default function AssetAllocation({ 
  assetAllocation = [], 
  onViewDetails = null,
  showIcon = true 
}) {
  // Sort by value (descending)
  const sortedData = [...assetAllocation].sort((a, b) => b.value - a.value);
  
  // Calculate total value
  const totalValue = assetAllocation.reduce((sum, asset) => sum + asset.value, 0);
  
  return (
    <div className="space-y-4">
      {/* Pie chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={assetAllocation}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {assetAllocation.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || assetColors[entry.name.toLowerCase()] || assetColors.other} 
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-2 space-y-2">
        {sortedData.map((entry, index) => (
          <div key={index} className="flex items-center justify-between hover:bg-gray-750 p-2 rounded-lg transition-colors">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: entry.color || assetColors[entry.name.toLowerCase()] || assetColors.other }}
              />
              <div className="flex items-center">
                {showIcon && (
                  <span className="mr-2 text-gray-400">
                    {assetIcons[entry.name.toLowerCase()] || assetIcons.other}
                  </span>
                )}
                <span className="text-sm text-white">{entry.name}</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">{formatPercentage(entry.percentage)}</div>
                <div className="text-xs text-gray-500">{formatCurrency(entry.value)}</div>
              </div>
              {onViewDetails && (
                <button 
                  className="text-indigo-400 hover:text-indigo-300 self-center"
                  onClick={() => onViewDetails(entry)}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        
        {/* Total */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-700">
          <span className="font-medium text-white">Total</span>
          <span className="font-medium text-white">{formatCurrency(totalValue)}</span>
        </div>
      </div>
    </div>
  );
}