// components/PerformanceStats.js
import { 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Activity, DollarSign, BarChart2, Calendar, AlertTriangle 
} from 'lucide-react';

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
 * Stat Card component for individual metrics
 */
const StatCard = ({ title, value, subtitle, icon, colorClass, className = "" }) => (
  <div className={`bg-gray-750 rounded-lg p-4 ${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className={`text-xl font-bold ${colorClass || 'text-white'}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2 rounded-full ${colorClass ? colorClass + '/10' : 'bg-gray-700'}`}>
        {icon}
      </div>
    </div>
  </div>
);

/**
 * Performance Stats Component
 * Displays key performance metrics in a grid layout
 */
export default function PerformanceStats({ stats = {}, timeframe = "3M", layout = "grid" }) {
  // Determine color class based on positive/negative values
  const changeColorClass = stats.periodChangePercent >= 0 ? 'text-green-500' : 'text-red-500';
  const changeIcon = stats.periodChangePercent >= 0 
    ? <ArrowUpRight className="h-5 w-5 text-green-500" /> 
    : <ArrowDownRight className="h-5 w-5 text-red-500" />;
  
  // Determine layout class based on the layout prop
  const containerClass = layout === 'grid' 
    ? 'grid grid-cols-2 md:grid-cols-4 gap-4' 
    : 'flex flex-col space-y-4';
  
  return (
    <div className={containerClass}>
      {/* Current Value */}
      <StatCard
        title="Current Value"
        value={formatCurrency(stats.totalValue)}
        subtitle={`${timeframe} Performance`}
        icon={<DollarSign className="h-5 w-5 text-indigo-400" />}
        className={layout === 'compact' ? 'flex justify-between items-center' : ''}
      />
      
      {/* Period Change */}
      <StatCard
        title="Period Change"
        value={formatCurrency(stats.periodChange)}
        subtitle={formatPercentage(stats.periodChangePercent)}
        icon={changeIcon}
        colorClass={changeColorClass}
        className={layout === 'compact' ? 'flex justify-between items-center' : ''}
      />
      
      {/* Value Range */}
      <StatCard
        title="Value Range"
        value={`${formatCurrency(stats.minValue)} - ${formatCurrency(stats.maxValue)}`}
        subtitle="Min to Max"
        icon={<BarChart2 className="h-5 w-5 text-blue-400" />}
        className={layout === 'compact' ? 'flex justify-between items-center' : ''}
      />
      
      {/* Volatility */}
      <StatCard
        title="Volatility"
        value={formatPercentage(stats.volatility)}
        subtitle="Standard Deviation"
        icon={<Activity className="h-5 w-5 text-purple-400" />}
        className={layout === 'compact' ? 'flex justify-between items-center' : ''}
      />
    </div>
  );
}