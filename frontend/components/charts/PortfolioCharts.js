// components/charts/PortfolioCharts.js
import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, 
  Legend, AreaChart, Area
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

// Color palette for charts
const COLORS = [
  '#4F46E5', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', 
  '#EC4899', '#EF4444', '#06B6D4', '#F97316', '#6366F1'
];

// Helper function to generate lighter shade of a color
const getLighterShade = (color, percent = 0.3) => {
  // Convert hex to RGB
  let r = parseInt(color.slice(1, 3), 16);
  let g = parseInt(color.slice(3, 5), 16);
  let b = parseInt(color.slice(5, 7), 16);
  
  // Make lighter
  r = Math.floor(r + (255 - r) * percent);
  g = Math.floor(g + (255 - g) * percent);
  b = Math.floor(b + (255 - b) * percent);
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// 1. Asset Type Distribution Donut Chart
export const AssetTypeChart = ({ positions }) => {
  const data = useMemo(() => {
    if (!positions || !positions.length) return [];
    
    // Group positions by asset type
    const typeGroups = positions.reduce((acc, position) => {
      const assetType = position.asset_type || 'Unknown';
      
      if (!acc[assetType]) {
        acc[assetType] = {
          name: assetType.charAt(0).toUpperCase() + assetType.slice(1), // Capitalize
          value: 0
        };
      }
      
      acc[assetType].value += parseFloat(position.current_value || 0);
      return acc;
    }, {});
    
    // Convert to array and sort by value
    return Object.values(typeGroups)
      .sort((a, b) => b.value - a.value)
      .map(item => ({
        ...item,
        // Format values for tooltips
        displayValue: formatCurrency(item.value)
      }));
  }, [positions]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-2 border border-gray-700 rounded shadow-lg text-white text-xs">
          <p className="font-medium">{payload[0].name}: {payload[0].payload.displayValue}</p>
          <p className="text-gray-300">{formatPercentage(payload[0].percent)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 h-[300px]">
      <h3 className="text-base font-medium mb-4">Asset Type Distribution</h3>
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={1}
            dataKey="value"
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center" 
            formatter={(value) => <span className="text-xs text-gray-300">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. Top Holdings Chart (Bar)
export const TopHoldingsChart = ({ positions }) => {
  const data = useMemo(() => {
    if (!positions || !positions.length) return [];
    
    // Group positions by identifier (ticker, symbol, etc.)
    const holdingGroups = positions.reduce((acc, position) => {
      const identifier = position.identifier || position.ticker || 'Unknown';
      
      if (!acc[identifier]) {
        acc[identifier] = {
          name: identifier,
          fullName: position.name || identifier,
          value: 0
        };
      }
      
      acc[identifier].value += parseFloat(position.current_value || 0);
      return acc;
    }, {});
    
    // Convert to array, sort by value and take top 10
    return Object.values(holdingGroups)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(item => ({
        ...item,
        // Format value for tooltip
        displayValue: formatCurrency(item.value)
      }));
  }, [positions]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-2 border border-gray-700 rounded shadow-lg text-white text-xs">
          <p className="font-medium">{payload[0].payload.fullName}</p>
          <p className="text-blue-300">{payload[0].payload.displayValue}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 h-[300px]">
      <h3 className="text-base font-medium mb-4">Top 10 Holdings</h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        >
          <XAxis type="number" fontSize={10} tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} />
          <YAxis type="category" dataKey="name" width={60} fontSize={10} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Account Values Comparison Chart (Bar)
export const AccountValuesChart = ({ accounts }) => {
  const data = useMemo(() => {
    if (!accounts || !accounts.length) return [];
    
    // Transform account data for chart display
    return accounts
      .map(account => ({
        name: account.account_name,
        institution: account.institution || 'Unknown',
        value: account.total_value || 0,
        displayValue: formatCurrency(account.total_value || 0)
      }))
      .sort((a, b) => b.value - a.value) // Sort by value descending
      .slice(0, 10); // Take top 10 accounts
  }, [accounts]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-2 border border-gray-700 rounded shadow-lg text-white text-xs">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-gray-300">{payload[0].payload.institution}</p>
          <p className="text-blue-300">{payload[0].payload.displayValue}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 h-[300px]">
      <h3 className="text-base font-medium mb-4">Account Values</h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <XAxis type="number" fontSize={10} tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })} />
          <YAxis type="category" dataKey="name" width={80} fontSize={10} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, a0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Performance Chart (Area)
export const GainLossAreaChart = ({ positions }) => {
  const data = useMemo(() => {
    if (!positions || !positions.length) return [];
    
    // Group positions by asset type
    const typeGroups = positions.reduce((acc, position) => {
      const assetType = position.asset_type || 'Unknown';
      
      if (!acc[assetType]) {
        acc[assetType] = {
          assetType: assetType.charAt(0).toUpperCase() + assetType.slice(1), // Capitalize
          gainLoss: 0,
          value: 0,
          costBasis: 0
        };
      }
      
      const currentValue = parseFloat(position.current_value || 0);
      const costBasis = parseFloat(position.total_cost_basis || 0);
      acc[assetType].value += currentValue;
      acc[assetType].costBasis += costBasis;
      acc[assetType].gainLoss += (currentValue - costBasis);
      
      return acc;
    }, {});
    
    // Convert to array and sort - only include those with gain/loss
    return Object.values(typeGroups)
      .filter(item => item.costBasis > 0) // Only include items with cost basis
      .map(item => ({
        name: item.assetType,
        gainLoss: item.gainLoss,
        gainLossPercent: item.costBasis > 0 ? (item.gainLoss / item.costBasis) * 100 : 0,
        displayValue: item.gainLoss >= 0 ? 
          `+${formatCurrency(item.gainLoss)}` : 
          formatCurrency(item.gainLoss),
        displayPercent: item.gainLoss >= 0 ? 
          `+${formatPercentage(item.gainLossPercent)}` : 
          formatPercentage(item.gainLossPercent)
      }))
      .sort((a, b) => b.gainLoss - a.gainLoss);
  }, [positions]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-2 border border-gray-700 rounded shadow-lg text-white text-xs">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className={payload[0].payload.gainLoss >= 0 ? "text-green-400" : "text-red-400"}>
            {payload[0].payload.displayValue} ({payload[0].payload.displayPercent})
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 h-[300px]">
      <h3 className="text-base font-medium mb-4">Gain/Loss by Asset Type</h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="name" 
            fontSize={10} 
            angle={-45} 
            textAnchor="end" 
            height={60}
          />
          <YAxis
            fontSize={10}
            tickFormatter={(value) => formatCurrency(value, { notation: 'compact' })}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="gainLoss" 
            fill="#10B981" 
            radius={[4, 4, 0, 0]}
            // Conditionally color bars by gain/loss
            name="Gain/Loss"
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.gainLoss >= 0 ? '#10B981' : '#EF4444'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};