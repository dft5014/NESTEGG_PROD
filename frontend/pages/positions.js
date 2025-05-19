// pages/positions.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  DollarSign, TrendingUp, TrendingDown, Percent, Layers, 
  ArrowUp, ArrowDown, BarChart4, LineChart, PieChart as PieChartIcon,
  Briefcase, RefreshCw, Search, X, Filter,
  Diamond, Coins, Package, Home, Plus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { fetchUnifiedPositions } from '@/utils/apimethods/positionMethods';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import AddPositionButton from '@/components/AddPositionButton';

export default function PositionsPage() {
  const [positions, setPositions] = useState([]);
  const [positionMetrics, setPositionMetrics] = useState({});
  const [filterView, setFilterView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  
  // Asset type colors
  const assetTypeColors = {
    'security': '#4f46e5', // Indigo
    'cash': '#10b981',    // Emerald
    'crypto': '#8b5cf6',  // Purple
    'bond': '#ec4899',    // Pink
    'metal': '#f97316',   // Orange
    'currency': '#3b82f6', // Blue
    'realestate': '#ef4444', // Red
    'other': '#6b7280'    // Gray
  };
  
  // Sector colors
  const sectorColors = {
    'Technology': '#6366f1',
    'Financial Services': '#0ea5e9',
    'Healthcare': '#10b981',
    'Consumer Cyclical': '#f59e0b',
    'Communication Services': '#8b5cf6',
    'Industrials': '#64748b',
    'Consumer Defensive': '#14b8a6',
    'Energy': '#f97316',
    'Basic Materials': '#f43f5e',
    'Real Estate': '#84cc16',
    'Utilities': '#0284c7',
    'Unknown': '#9ca3af'
  };
  
  // Filter options
  const filterOptions = [
    { id: 'all', label: 'All Positions' },
    { id: 'security', label: 'Securities' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'metal', label: 'Metals' },
    { id: 'realestate', label: 'Real Estate' },
    { id: 'gainers', label: 'Gainers' },
    { id: 'losers', label: 'Losers' }
  ];
  
  useEffect(() => {
    loadData();
  }, []);
  
  // Function to load all necessary data
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch positions using API method
      const fetchedPositions = await fetchUnifiedPositions();
      console.log("Positions: Fetched unified positions:", fetchedPositions.length);
      setPositions(fetchedPositions);
      
      // Calculate position metrics
      const metrics = calculatePositionMetrics(fetchedPositions);
      setPositionMetrics(metrics);
    } catch (error) {
      console.error("Error loading positions:", error);
      setError(error.message || "Failed to load positions");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate position metrics
  const calculatePositionMetrics = (positions) => {
    if (!positions || positions.length === 0) {
      return {
        totalPositions: 0,
        totalValue: 0,
        totalCostBasis: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        topGainers: [],
        topLosers: [],
        assetAllocation: [],
        sectorAllocation: []
      };
    }
    
    const metrics = {
      totalPositions: positions.length,
      totalValue: 0,
      totalCostBasis: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      largestPosition: null,
      smallestPosition: null,
      mostProfitablePosition: null,
      leastProfitablePosition: null,
      topGainers: [],
      topLosers: [],
      assetAllocation: [],
      sectorAllocation: []
    };
    
    // Maps for aggregating data
    const assetTypeMap = {};
    const sectorMap = {};
    
    // Process positions
    positions.forEach(position => {
      const currentValue = parseFloat(position.current_value) || 0;
      const costBasis = parseFloat(position.total_cost_basis) || 0;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? gainLoss / costBasis : 0;
      const assetType = position.asset_type || 'other';
      const sector = position.sector || 'Unknown';
      
      // Accumulate totals
      metrics.totalValue += currentValue;
      metrics.totalCostBasis += costBasis;
      metrics.totalGainLoss += gainLoss;
      
      // Track largest position
      if (!metrics.largestPosition || currentValue > metrics.largestPosition.value) {
        metrics.largestPosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          value: currentValue
        };
      }
      
      // Track smallest position
      if (!metrics.smallestPosition || (currentValue > 0 && currentValue < metrics.smallestPosition.value)) {
        metrics.smallestPosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          value: currentValue
        };
      }
      
      // Track most profitable position (by absolute gain, not percent)
      if (!metrics.mostProfitablePosition || gainLoss > metrics.mostProfitablePosition.gainLoss) {
        metrics.mostProfitablePosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent
        };
      }
      
      // Track least profitable position (by absolute loss, not percent)
      if (!metrics.leastProfitablePosition || gainLoss < metrics.leastProfitablePosition.gainLoss) {
        metrics.leastProfitablePosition = {
          name: position.name || position.identifier,
          identifier: position.identifier,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent
        };
      }
      
      // Aggregate by asset type
      if (!assetTypeMap[assetType]) {
        assetTypeMap[assetType] = {
          name: assetType.charAt(0).toUpperCase() + assetType.slice(1),
          value: 0
        };
      }
      assetTypeMap[assetType].value += currentValue;
      
      // Aggregate by sector (only for securities)
      if (assetType === 'security') {
        if (!sectorMap[sector]) {
          sectorMap[sector] = {
            name: sector,
            value: 0
          };
        }
        sectorMap[sector].value += currentValue;
      }
    });
    
    // Calculate total gain/loss percent
    metrics.totalGainLossPercent = metrics.totalCostBasis > 0 
      ? metrics.totalGainLoss / metrics.totalCostBasis 
      : 0;
    
    // Filter and sort positions for top gainers/losers
    const positionsWithGainLoss = positions
      .map(position => {
        const currentValue = parseFloat(position.current_value) || 0;
        const costBasis = parseFloat(position.total_cost_basis) || 0;
        const gainLoss = currentValue - costBasis;
        const gainLossPercent = costBasis > 0 ? gainLoss / costBasis : 0;
        
        return {
          name: position.name || position.identifier,
          identifier: position.identifier,
          assetType: position.asset_type,
          value: currentValue,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent
        };
      })
      .filter(position => position.costBasis > 0); // Only consider positions with cost basis
    
    // Get top gainers and losers
    metrics.topGainers = [...positionsWithGainLoss]
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 5);
      
    metrics.topLosers = [...positionsWithGainLoss]
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, 5);
    
    // Process asset allocation
    metrics.assetAllocation = Object.values(assetTypeMap)
      .map(item => ({
        ...item,
        percentage: metrics.totalValue > 0 ? item.value / metrics.totalValue : 0,
        color: assetTypeColors[item.name.toLowerCase()] || assetTypeColors.other
      }))
      .sort((a, b) => b.value - a.value);
    
    // Process sector allocation
    metrics.sectorAllocation = Object.values(sectorMap)
      .map(item => ({
        ...item,
        percentage: metrics.totalValue > 0 ? item.value / metrics.totalValue : 0,
        color: sectorColors[item.name] || sectorColors.Unknown
      }))
      .sort((a, b) => b.value - a.value);
    
    return metrics;
  };
  
  // Filter positions based on selected view and search term
  const filteredPositions = positions.filter(position => {
    // Apply search filter if search term exists
    const matchesSearch = !searchTerm || 
      (position.name && position.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (position.identifier && position.identifier.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Apply type filter based on selected view
    let matchesFilter = true;
    switch(filterView) {
      case 'security':
      case 'crypto':
      case 'metal':
      case 'realestate':
        matchesFilter = position.asset_type === filterView;
        break;
      case 'gainers':
        const gainLoss = (parseFloat(position.current_value) || 0) - (parseFloat(position.total_cost_basis) || 0);
        matchesFilter = gainLoss > 0;
        break;
      case 'losers':
        const loss = (parseFloat(position.current_value) || 0) - (parseFloat(position.total_cost_basis) || 0);
        matchesFilter = loss < 0;
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium">{data.name}</p>
          <p className="text-indigo-600 dark:text-indigo-400">{formatPercentage(data.percentage * 100)}</p>
          <p className="text-gray-600 dark:text-gray-400">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };
  
  // Handle refresh of positions data
  const handleRefreshPositions = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/positions/refresh', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh positions');
      }
      
      // Reload positions after refresh
      await loadData();
    } catch (error) {
      console.error("Error refreshing positions:", error);
      setError(error.message || "Failed to refresh positions");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handler for when a position is added
  const handlePositionAdded = async () => {
    await loadData();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
      <Head>
        <title>NestEgg | Positions</title>
        <meta name="description" content="Manage and track all your investment positions" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="container mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold">Positions Overview</h1>
              <p className="text-gray-400 mt-2">Track all your investments across different asset classes.</p>
            </div>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <button
                onClick={handleRefreshPositions}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Positions
              </button>
              
              {/* Using AddPositionButton component */}
              <AddPositionButton 
                onPositionAdded={handlePositionAdded}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                buttonContent={
                  <div className="flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Position
                  </div>
                }
              />
            </div>
          </div>
        </header>
        
        {/* KPI Cards for Positions */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Positions Summary</h2>
          {error && (
            <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200">
              Error loading positions: {error}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total Positions"
              value={positionMetrics.totalPositions}
              icon={<Layers />}
              isLoading={isLoading}
              format={(v) => v?.toLocaleString() ?? '0'}
              color="blue"
            />
            <KpiCard
              title="Total Market Value"
              value={positionMetrics.totalValue}
              icon={<DollarSign />}
              isLoading={isLoading}
              format={(v) => formatCurrency(v)}
              color="green"
            />
            <KpiCard
              title="Total Cost Basis"
              value={positionMetrics.totalCostBasis}
              icon={<DollarSign />}
              isLoading={isLoading}
              format={(v) => formatCurrency(v)}
              color="purple"
            />
            <KpiCard
              title="Total Gain/Loss"
              value={positionMetrics.totalGainLoss}
              icon={positionMetrics.totalGainLoss >= 0 ? <TrendingUp /> : <TrendingDown />}
              isLoading={isLoading}
              format={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
              color={positionMetrics.totalGainLoss >= 0 ? 'green' : 'red'}
            />
            <KpiCard
              title="Total Gain/Loss %"
              value={positionMetrics.totalGainLossPercent * 100}
              icon={<Percent />}
              isLoading={isLoading}
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
              color={positionMetrics.totalGainLossPercent >= 0 ? 'green' : 'red'}
            />
            <KpiCard
              title="Largest Position"
              value={positionMetrics.largestPosition?.value}
              subtitle={positionMetrics.largestPosition?.name}
              icon={<BarChart4 />}
              isLoading={isLoading}
              format={(v) => formatCurrency(v)}
              color="amber"
            />
            <KpiCard
              title="Most Profitable"
              value={positionMetrics.mostProfitablePosition?.gainLoss}
              subtitle={positionMetrics.mostProfitablePosition?.name}
              icon={<ArrowUp />}
              isLoading={isLoading}
              format={(v) => `+${formatCurrency(v)}`}
              color="green"
            />
            <KpiCard
              title="Least Profitable"
              value={positionMetrics.leastProfitablePosition?.gainLoss}
              subtitle={positionMetrics.leastProfitablePosition?.name}
              icon={<ArrowDown />}
              isLoading={isLoading}
              format={(v) => formatCurrency(v)}
              color="red"
            />
          </div>
        </section>
        
        {/* Asset Allocation Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Portfolio Allocation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Asset Type Distribution */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Asset Type Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={positionMetrics.assetAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {positionMetrics.assetAllocation?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                {positionMetrics.assetAllocation?.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-gray-300">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-400">{formatPercentage(entry.percentage * 100)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Sector Distribution (for Securities) */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Sector Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={positionMetrics.sectorAllocation}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db' }} width={100} />
                    <Tooltip
                      formatter={(value) => [`${formatCurrency(value)}`, 'Value']}
                      labelFormatter={(value) => `Sector: ${value}`}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {positionMetrics.sectorAllocation?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Note about sectors */}
              <div className="mt-4 text-center">
                <span className="text-xs text-gray-400">Sector breakdown only applies to securities</span>
              </div>
            </div>
          </div>
        </section>
        
        {/* Top Performers Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Gainers */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                Top Performers
              </h3>
              
              <div className="space-y-3">
                {positionMetrics.topGainers?.length > 0 ? (
                  positionMetrics.topGainers.map((position, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        <div 
                          className="h-6 w-6 rounded-full flex items-center justify-center mr-2"
                          style={{ backgroundColor: assetTypeColors[position.assetType] + '25' }}
                        >
                          {position.assetType === 'security' && <LineChart className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                          {position.assetType === 'crypto' && <Diamond className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                          {position.assetType === 'metal' && <Package className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                          {position.assetType === 'realestate' && <Home className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                        </div>
                        <span className="text-sm text-gray-300">{position.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-green-400">+{formatPercentage(position.gainLossPercent * 100)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No gainers to display
                  </div>
                )}
              </div>
            </div>
            
            {/* Top Losers */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingDown className="h-5 w-5 mr-2 text-red-400" />
                Underperforming
              </h3>
              
              <div className="space-y-3">
                {positionMetrics.topLosers?.length > 0 ? (
                  positionMetrics.topLosers.map((position, index) => (
                    <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        <div 
                          className="h-6 w-6 rounded-full flex items-center justify-center mr-2"
                          style={{ backgroundColor: assetTypeColors[position.assetType] + '25' }}
                        >
                          {position.assetType === 'security' && <LineChart className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                          {position.assetType === 'crypto' && <Diamond className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                          {position.assetType === 'metal' && <Package className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                          {position.assetType === 'realestate' && <Home className="h-3 w-3" style={{ color: assetTypeColors[position.assetType] }} />}
                        </div>
                        <span className="text-sm text-gray-300">{position.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-red-400">{formatPercentage(position.gainLossPercent * 100)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No losers to display
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        
        {/* Positions Table Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-4 md:space-y-0">
            <h2 className="text-xl font-semibold text-gray-300">Your Positions</h2>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto">
              {/* Filter Options */}
              <div className="flex overflow-x-auto pb-2 md:pb-0 space-x-2">
                {filterOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setFilterView(option.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                      filterView === option.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search positions..."
                  className="bg-gray-700 text-white border border-gray-600 rounded-lg py-1.5 pl-10 pr-4 w-full focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Display filtered count if filtering */}
          {(filterView !== 'all' || searchTerm) && (
            <div className="mb-4 text-sm text-gray-400 flex items-center">
              <Filter className="h-4 w-4 mr-1" />
              Showing {filteredPositions.length} of {positions.length} positions
              {filterView !== 'all' && <span className="ml-1">• Filter: {filterOptions.find(o => o.id === filterView)?.label}</span>}
              {searchTerm && <span className="ml-1">• Search: "{searchTerm}"</span>}
              
              <button
                onClick={() => {
                  setFilterView('all');
                  setSearchTerm('');
                }}
                className="ml-2 text-indigo-400 hover:text-indigo-300"
              >
                Clear Filters
              </button>
            </div>
          )}
          
          {/* Positions Table with Add Position Button */}
          <div className="mb-4 flex justify-end">
            <AddPositionButton 
              onPositionAdded={handlePositionAdded}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              buttonContent={
                <div className="flex items-center">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Position
                </div>
              }
            />
          </div>
          
          <UnifiedGroupedPositionsTable 
            title="" 
            filteredPositions={filteredPositions} 
            onPositionAdded={handlePositionAdded}
          />
        </section>
        
        {/* Quick Actions Footer */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/portfolio"
              className="flex items-center justify-center py-3 px-4 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-colors shadow-md hover:shadow-lg"
            >
              <PieChartIcon className="h-5 w-5 mr-2" />
              <span>View Portfolio</span>
            </Link>
            
            <Link 
              href="/accounts"
              className="flex items-center justify-center py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md hover:shadow-lg"
            >
              <Briefcase className="h-5 w-5 mr-2" />
              <span>View Accounts</span>
            </Link>
            
            <Link 
              href="/transactions"
              className="flex items-center justify-center py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors shadow-md hover:shadow-lg"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              <span>View Transactions</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}