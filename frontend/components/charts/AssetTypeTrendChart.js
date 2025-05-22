// components/charts/AssetTypeTrendChart.js
import { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Eye, EyeOff, TrendingUp, BarChart3, Layers } from 'lucide-react';

// Asset colors matching your existing theme
const assetColors = {
  security: '#4f46e5', // Indigo
  cash: '#10b981',    // Emerald
  crypto: '#8b5cf6',  // Purple
  bond: '#ec4899',    // Pink
  metal: '#f97316',   // Orange
  currency: '#3b82f6', // Blue
  realestate: '#ef4444', // Red
  other: '#6b7280'    // Gray
};

// Generate demo data for asset type trends
const generateAssetTrendData = () => {
  const assetTypes = ['security', 'cash', 'crypto', 'metal', 'realestate'];
  const days = 90;
  const data = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    const dataPoint = {
      date: date.toISOString().split('T')[0],
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
    
    assetTypes.forEach(assetType => {
      // Generate realistic trend data
      let baseValue, volatility, trend;
      
      switch (assetType) {
        case 'security':
          baseValue = 350000;
          volatility = 0.02;
          trend = 0.0008;
          break;
        case 'cash':
          baseValue = 85000;
          volatility = 0.001;
          trend = 0.0002;
          break;
        case 'crypto':
          baseValue = 75000;
          volatility = 0.05;
          trend = 0.001;
          break;
        case 'metal':
          baseValue = 50000;
          volatility = 0.015;
          trend = 0.0005;
          break;
        case 'realestate':
          baseValue = 45000;
          volatility = 0.005;
          trend = 0.0007;
          break;
        default:
          baseValue = 10000;
          volatility = 0.02;
          trend = 0;
      }
      
      // Calculate market value with trend and volatility
      const trendValue = baseValue * (1 + trend * i);
      const randomFactor = 1 + (Math.random() - 0.5) * volatility;
      const marketValue = trendValue * randomFactor;
      
      // Cost basis grows more slowly and steadily
      const costBasis = baseValue * (1 + trend * 0.3 * i) * (1 + (Math.random() - 0.5) * 0.005);
      
      dataPoint[`${assetType}_market`] = marketValue;
      dataPoint[`${assetType}_cost`] = costBasis;
    });
    
    data.push(dataPoint);
  }
  
  return data;
};

// Format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Group payload by asset type
    const assetData = {};
    
    payload.forEach(entry => {
      const [assetType, valueType] = entry.dataKey.split('_');
      if (!assetData[assetType]) {
        assetData[assetType] = {};
      }
      assetData[assetType][valueType] = entry.value;
    });
    
    return (
      <div className="bg-gray-800 p-3 border border-gray-700 rounded-lg shadow-lg text-white">
        <p className="font-medium text-white mb-2">{label}</p>
        {Object.entries(assetData).map(([assetType, values]) => (
          <div key={assetType} className="mb-2">
            <p className="text-sm font-medium" style={{ color: assetColors[assetType] }}>
              {assetType.charAt(0).toUpperCase() + assetType.slice(1)}
            </p>
            {values.market && (
              <p className="text-xs text-gray-300">
                Market: {formatCurrency(values.market)}
              </p>
            )}
            {values.cost && (
              <p className="text-xs text-gray-400">
                Cost: {formatCurrency(values.cost)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AssetTypeTrendChart() {
  const [visibleAssets, setVisibleAssets] = useState({
    security: true,
    cash: true,
    crypto: true,
    metal: true,
    realestate: true
  });
  
  const [showCostBasis, setShowCostBasis] = useState(true);
  const [chartType, setChartType] = useState('line'); // 'line' or 'area'
  
  // Generate data
  const data = useMemo(() => generateAssetTrendData(), []);
  
  // Asset types configuration
  const assetTypes = [
    { key: 'security', name: 'Securities', icon: '📈' },
    { key: 'cash', name: 'Cash', icon: '💵' },
    { key: 'crypto', name: 'Crypto', icon: '₿' },
    { key: 'metal', name: 'Metals', icon: '🥇' },
    { key: 'realestate', name: 'Real Estate', icon: '🏠' }
  ];
  
  // Toggle asset visibility
  const toggleAsset = (assetKey) => {
    setVisibleAssets(prev => ({
      ...prev,
      [assetKey]: !prev[assetKey]
    }));
  };
  
  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (data.length === 0) return {};
    
    const latest = data[data.length - 1];
    const earliest = data[0];
    const stats = {};
    
    assetTypes.forEach(({ key }) => {
      const latestMarket = latest[`${key}_market`];
      const earliestMarket = earliest[`${key}_market`];
      const latestCost = latest[`${key}_cost`];
      
      stats[key] = {
        currentValue: latestMarket,
        costBasis: latestCost,
        periodChange: latestMarket - earliestMarket,
        periodChangePercent: ((latestMarket - earliestMarket) / earliestMarket) * 100,
        unrealizedGain: latestMarket - latestCost,
        unrealizedGainPercent: ((latestMarket - latestCost) / latestCost) * 100
      };
    });
    
    return stats;
  }, [data]);
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">Asset Type Performance Trends</h3>
          <p className="text-gray-600 text-sm">Market value and cost basis over time by asset class</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'line' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'area' 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Layers className="h-4 w-4" />
            </button>
          </div>
          
          {/* Cost basis toggle */}
          <button
            onClick={() => setShowCostBasis(!showCostBasis)}
            className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
              showCostBasis 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600 hover:text-gray-800'
            }`}
          >
            {showCostBasis ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Cost Basis
          </button>
        </div>
      </div>
      
      {/* Asset toggles */}
      <div className="flex flex-wrap gap-2">
        {assetTypes.map(({ key, name, icon }) => (
          <button
            key={key}
            onClick={() => toggleAsset(key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border-2 ${
              visibleAssets[key]
                ? 'text-gray-800 shadow-md'
                : 'bg-gray-100 text-gray-500 hover:text-gray-700 border-transparent'
            }`}
            style={{
              backgroundColor: visibleAssets[key] ? `${assetColors[key]}20` : undefined,
              borderColor: visibleAssets[key] ? assetColors[key] : undefined
            }}
          >
            <span>{icon}</span>
            <span>{name}</span>
            <span className="text-xs opacity-75">
              {summaryStats[key] ? formatCurrency(summaryStats[key].currentValue) : '-'}
            </span>
          </button>
        ))}
      </div>
      
      {/* Chart */}
      <div className="h-96 bg-white p-4 rounded-lg border border-gray-200">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {assetTypes.map(({ key }) => (
                  <linearGradient key={`gradient-${key}`} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={assetColors[key]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={assetColors[key]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fill: '#6b7280', fontSize: 12 }} 
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
              
              {/* Market value areas */}
              {assetTypes.map(({ key, name }) => (
                visibleAssets[key] && (
                  <Area
                    key={`${key}_market`}
                    type="monotone"
                    dataKey={`${key}_market`}
                    name={`${name} Market`}
                    stroke={assetColors[key]}
                    fill={`url(#gradient-${key})`}
                    strokeWidth={2}
                    activeDot={{ r: 4, fill: assetColors[key] }}
                  />
                )
              ))}
              
              {/* Cost basis lines (if enabled) */}
              {showCostBasis && assetTypes.map(({ key, name }) => (
                visibleAssets[key] && (
                  <Area
                    key={`${key}_cost`}
                    type="monotone"
                    dataKey={`${key}_cost`}
                    name={`${name} Cost`}
                    stroke={assetColors[key]}
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={{ r: 3, fill: assetColors[key] }}
                  />
                )
              ))}
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fill: '#6b7280', fontSize: 12 }} 
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>{value}</span>
                )}
              />
              
              {/* Market value lines */}
              {assetTypes.map(({ key, name }) => (
                visibleAssets[key] && (
                  <Line
                    key={`${key}_market`}
                    type="monotone"
                    dataKey={`${key}_market`}
                    name={`${name} Market`}
                    stroke={assetColors[key]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: assetColors[key] }}
                  />
                )
              ))}
              
              {/* Cost basis lines (if enabled) */}
              {showCostBasis && assetTypes.map(({ key, name }) => (
                visibleAssets[key] && (
                  <Line
                    key={`${key}_cost`}
                    type="monotone"
                    dataKey={`${key}_cost`}
                    name={`${name} Cost`}
                    stroke={assetColors[key]}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={{ r: 3, fill: assetColors[key] }}
                  />
                )
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {assetTypes.map(({ key, name, icon }) => {
          const stats = summaryStats[key];
          if (!stats) return null;
          
          return (
            <div 
              key={key} 
              className={`p-4 rounded-lg border transition-all ${
                visibleAssets[key] 
                  ? 'border-gray-300 bg-white shadow-sm' 
                  : 'border-gray-200 bg-gray-50 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{icon} {name}</span>
                <TrendingUp 
                  className={`h-4 w-4 ${
                    stats.periodChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
                  }`} 
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Current:</span>
                  <span className="text-gray-800 font-medium">{formatCurrency(stats.currentValue)}</span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Gain/Loss:</span>
                  <span className={stats.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stats.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(stats.unrealizedGain)}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Period:</span>
                  <span className={stats.periodChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {stats.periodChangePercent >= 0 ? '+' : ''}{stats.periodChangePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}