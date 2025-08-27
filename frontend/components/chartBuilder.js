// components/ChartBuilder.js
import { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { 
  LineChart as LineChartIcon, BarChart2, Activity, PieChart as PieChartIcon,
  Save, Download, RefreshCw, Info, Settings, Eye, CheckSquare, Square, Percent
} from 'lucide-react';
import { formatCurrency, formatPercentage, assetColors } from '@/utils/reportUtils';

// Chart type options
const chartTypeOptions = [
  { id: 'line', label: 'Line Chart', icon: <LineChartIcon className="h-4 w-4" /> },
  { id: 'bar', label: 'Bar Chart', icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'area', label: 'Area Chart', icon: <Activity className="h-4 w-4" /> },
  { id: 'pie', label: 'Pie Chart', icon: <PieChartIcon className="h-4 w-4" /> }
];

// Available metrics
const metricOptions = [
  { id: 'value', label: 'Portfolio Value', description: 'Total market value of your portfolio' },
  { id: 'costBasis', label: 'Cost Basis', description: 'Original investment amount' },
  { id: 'unrealizedGain', label: 'Unrealized Gain', description: 'Difference between current value and cost basis' },
  { id: 'percentChange', label: 'Percentage Change', description: 'Relative change in value over time' }
];

// Group by options
const groupByOptions = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' }
];

// Asset type filter options (example)
const assetTypeOptions = [
  { id: 'security', label: 'Securities' },
  { id: 'cash', label: 'Cash' },
  { id: 'crypto', label: 'Cryptocurrency' },
  { id: 'bond', label: 'Bonds' },
  { id: 'metal', label: 'Precious Metals' },
  { id: 'realestate', label: 'Real Estate' }
];

// Benchmark options
const benchmarkOptions = [
  { id: 'SP500', label: 'S&P 500' },
  { id: 'NASDAQ', label: 'NASDAQ Composite' },
  { id: 'DJIA', label: 'Dow Jones Industrial Average' },
  { id: 'RUSSELL2000', label: 'Russell 2000' }
];

/**
 * Custom Tooltip Component for Charts
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 dark:bg-gray-800 p-3 border border-gray-700 dark:border-gray-700 rounded-lg shadow-lg text-white">
        <p className="font-medium text-white">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry, index) => (
            <p key={index} className={`text-sm`} style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}: </span> 
              {entry.name.toLowerCase().includes('percent') ? formatPercentage(entry.value) : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      </div>
    );
  }
  
  return null;
};

/**
 * Chart Builder Component
 */
export default function ChartBuilder({ 
  config,
  data,
  onConfigChange,
  onSave,
  className = "" 
}) {
  const [configPanelOpen, setConfigPanelOpen] = useState(true);
  
  // Helper to determine Y-axis formatter based on percentage view
  const getYAxisFormatter = () => {
    if (config.percentageView) {
      return (value) => `${value.toFixed(0)}%`;
    } else {
      return (value) => `$${(value / 1000).toFixed(0)}k`;
    }
  };
  
  // Handler for checkbox change
  const handleCheckboxChange = (field, value) => {
    if (field === 'metrics') {
      // Handle metrics as an array
      const metrics = config.metrics.includes(value)
        ? config.metrics.filter(m => m !== value)
        : [...config.metrics, value];
      
      onConfigChange({ ...config, metrics });
    } else if (field === 'filterAssetTypes') {
      // Handle asset type filters as an array
      const filterAssetTypes = config.filterAssetTypes.includes(value)
        ? config.filterAssetTypes.filter(t => t !== value)
        : [...config.filterAssetTypes, value];
      
      onConfigChange({ ...config, filterAssetTypes });
    } else {
      // Handle boolean fields
      onConfigChange({ ...config, [field]: value });
    }
  };
  
  // Render the appropriate chart based on selected type
  const renderChart = () => {
    const isPercentageView = config.percentageView;
    
    // Determine which data points to display
    const metrics = config.metrics;
    const showValue = metrics.includes('value');
    const showCostBasis = metrics.includes('costBasis');
    const showUnrealizedGain = metrics.includes('unrealizedGain');
    
    switch (config.chartType) {
      case 'line':
        return (
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fill: '#6b7280' }} 
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={getYAxisFormatter()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            
            {isPercentageView ? (
              <>
                <Line 
                  type="monotone" 
                  name="Portfolio Value %"
                  dataKey="percentChange" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                {config.compareWithBenchmark && (
                  <Line 
                    type="monotone" 
                    name="Benchmark %"
                    dataKey="benchmarkPercentChange" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
              </>
            ) : (
              <>
                {showValue && (
                  <Line 
                    type="monotone" 
                    name="Portfolio Value"
                    dataKey="value" 
                    stroke="#4f46e5" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showCostBasis && (
                  <Line 
                    type="monotone" 
                    name="Cost Basis"
                    dataKey="costBasis" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showUnrealizedGain && (
                  <Line 
                    type="monotone" 
                    name="Unrealized Gain"
                    dataKey="unrealizedGain" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
                {config.compareWithBenchmark && (
                  <Line 
                    type="monotone" 
                    name="Benchmark"
                    dataKey="benchmark" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                )}
              </>
            )}
          </LineChart>
        );
        
      case 'area':
        return (
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCostBasis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fill: '#6b7280' }} 
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={getYAxisFormatter()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            
            {isPercentageView ? (
              <>
                <Area 
                  type="monotone" 
                  name="Portfolio Value %"
                  dataKey="percentChange" 
                  stroke="#4f46e5" 
                  fill="url(#colorValue)" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                {config.compareWithBenchmark && (
                  <Area 
                    type="monotone" 
                    name="Benchmark %"
                    dataKey="benchmarkPercentChange" 
                    stroke="#f59e0b" 
                    fill="url(#colorBenchmark)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                )}
              </>
            ) : (
              <>
                {showValue && (
                  <Area 
                    type="monotone" 
                    name="Portfolio Value"
                    dataKey="value" 
                    stroke="#4f46e5" 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showCostBasis && (
                  <Area 
                    type="monotone" 
                    name="Cost Basis"
                    dataKey="costBasis" 
                    stroke="#8b5cf6" 
                    fill="url(#colorCostBasis)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showUnrealizedGain && (
                  <Area 
                    type="monotone" 
                    name="Unrealized Gain"
                    dataKey="unrealizedGain" 
                    stroke="#10b981" 
                    fill="url(#colorGain)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                )}
                {config.compareWithBenchmark && (
                  <Area 
                    type="monotone" 
                    name="Benchmark"
                    dataKey="benchmark" 
                    stroke="#f59e0b" 
                    fill="url(#colorBenchmark)" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                )}
              </>
            )}
          </AreaChart>
        );
        
      case 'bar':
        return (
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
          >
            <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fill: '#6b7280' }} 
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={getYAxisFormatter()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            
            {isPercentageView ? (
              <>
                <Bar 
                  name="Portfolio Value %"
                  dataKey="percentChange" 
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]}
                />
                {config.compareWithBenchmark && (
                  <Bar 
                    name="Benchmark %"
                    dataKey="benchmarkPercentChange" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </>
            ) : (
              <>
                {showValue && (
                  <Bar 
                    name="Portfolio Value"
                    dataKey="value" 
                    fill="#4f46e5" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {showCostBasis && (
                  <Bar 
                    name="Cost Basis"
                    dataKey="costBasis" 
                    fill="#8b5cf6" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {showUnrealizedGain && (
                  <Bar 
                    name="Unrealized Gain"
                    dataKey="unrealizedGain" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {config.compareWithBenchmark && (
                  <Bar 
                    name="Benchmark"
                    dataKey="benchmark" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </>
            )}
          </BarChart>
        );
        
      case 'pie':
        // For pie charts, use the asset allocation data
        const pieData = data.assetAllocation || [];
        
        if (pieData.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-full">
              <Info className="h-10 w-10 text-gray-500 mb-2" />
              <p className="text-gray-400">No data available for pie chart</p>
              <p className="text-sm text-gray-500 mt-1">Try selecting different metrics</p>
            </div>
          );
        }
        
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || assetColors[entry.name.toLowerCase()] || assetColors.other} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => isPercentageView ? `${(value / data[0]?.value * 100).toFixed(2)}%` : formatCurrency(value)}
              labelFormatter={(index) => pieData[index]?.name}
            />
            <Legend verticalAlign="bottom" />
          </PieChart>
        );
        
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Settings className="h-10 w-10 text-gray-500 mb-2" />
            <p className="text-gray-400">Select a chart type to begin</p>
          </div>
        );
    }
  };
  
  // Custom checkbox component
  const Checkbox = ({ checked, onChange, label, description }) => (
    <div className="flex items-start mb-2">
      <div className="flex items-center h-5">
        <button
          type="button"
          className="focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={() => onChange(!checked)}
        >
          {checked ? (
            <CheckSquare className="h-5 w-5 text-indigo-500" />
          ) : (
            <Square className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>
      <div className="ml-3 text-sm">
        <label className="font-medium text-gray-300">{label}</label>
        {description && <p className="text-gray-500">{description}</p>}
      </div>
    </div>
  );
  
  return (
    <div className={`bg-gray-800 rounded-xl shadow-md p-5 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <input
            type="text"
            className="bg-transparent border-none text-xl font-semibold text-white focus:outline-none focus:ring-0 p-0"
            value={config.title}
            onChange={(e) => onConfigChange({ ...config, title: e.target.value })}
            placeholder="Chart Title"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setConfigPanelOpen(!configPanelOpen)}
            className={`p-2 rounded-md ${configPanelOpen ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            <Settings className="h-4 w-4" />
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className="p-2 rounded-md bg-green-600 text-white"
            >
              <Save className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onConfigChange({
              title: 'My Custom Report',
              timeframe: '3m',
              chartType: 'line',
              metrics: ['value'],
              groupBy: 'day',
              filterAssetTypes: [],
              compareWithBenchmark: false,
              benchmark: 'SP500',
              percentageView: false
            })}
            className="p-2 rounded-md bg-gray-700 text-gray-300"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex mt-4 space-x-4">
        {/* Chart type selection */}
        <div className="flex space-x-2">
          {chartTypeOptions.map((option) => (
            <button
              key={option.id}
              className={`p-2 rounded-md flex items-center space-x-1 text-sm
                ${config.chartType === option.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              onClick={() => onConfigChange({ ...config, chartType: option.id })}
            >
              {option.icon}
              <span className="hidden md:inline">{option.label}</span>
            </button>
          ))}
        </div>
        
        {/* Group by selection */}
        <div className="flex space-x-1 bg-gray-700 rounded-md">
          {groupByOptions.map((option) => (
            <button
              key={option.id}
              className={`px-3 py-1 text-sm rounded-md
                ${config.groupBy === option.id 
                  ? 'bg-gray-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              onClick={() => onConfigChange({ ...config, groupBy: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {/* Display options */}
        <div className="flex space-x-2 ml-auto">
          <button
            className={`p-2 rounded-md flex items-center space-x-1 text-sm
              ${config.percentageView 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            onClick={() => onConfigChange({ ...config, percentageView: !config.percentageView })}
          >
            <Percent className="h-4 w-4" />
            <span className="hidden md:inline">Percentage</span>
          </button>
          
          <button
            className={`p-2 rounded-md flex items-center space-x-1 text-sm
              ${config.compareWithBenchmark 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            onClick={() => onConfigChange({ ...config, compareWithBenchmark: !config.compareWithBenchmark })}
          >
            <Activity className="h-4 w-4" />
            <span className="hidden md:inline">Benchmark</span>
          </button>
        </div>
      </div>
      
      <div className="flex mt-4 gap-4">
        {/* Configuration panel */}
        {configPanelOpen && (
          <div className="w-64 bg-gray-750 rounded-lg p-3 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Chart Configuration</h3>
            
            {/* Metrics */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Metrics</h4>
              {metricOptions.map((metric) => (
                <Checkbox
                  key={metric.id}
                  label={metric.label}
                  checked={config.metrics.includes(metric.id)}
                  onChange={() => handleCheckboxChange('metrics', metric.id)}
                />
              ))}
            </div>
            
            {/* Asset type filters */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Asset Types</h4>
              {assetTypeOptions.map((assetType) => (
                <Checkbox
                  key={assetType.id}
                  label={assetType.label}
                  checked={config.filterAssetTypes.includes(assetType.id)}
                  onChange={() => handleCheckboxChange('filterAssetTypes', assetType.id)}
                />
              ))}
            </div>
            
            {/* Benchmark selection */}
            {config.compareWithBenchmark && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Benchmark</h4>
                <select
                  value={config.benchmark}
                  onChange={(e) => onConfigChange({ ...config, benchmark: e.target.value })}
                  className="w-full p-2 text-sm rounded-md bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {benchmarkOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        
        {/* Chart display */}
        <div className={`${configPanelOpen ? 'flex-1' : 'w-full'} h-[400px]`}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}