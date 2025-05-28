// pages/reports.js
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
  ComposedChart, Treemap
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, 
  Activity, Calendar, Info, ArrowRight, BarChart2, Settings,
  Briefcase, X, AlertCircle, ChevronRight, CreditCard, Droplet, 
  Diamond, Cpu, Landmark, Layers, Shield, Database, Percent, 
  Eye, Gift, Clock, ArrowUp, ArrowDown, Calculator,
  Banknote, Coins, Package, Home, LayoutDashboard, ArrowLeft,
  LineChart as LineChartIcon, PieChart as PieChartIcon, Save,
  RefreshCw, Download, Share2, ArrowUpRight, ArrowDownRight,
  ChevronDown, Filter, Table, FileText, Building2, Hash,
  MoreVertical, Maximize2, Minimize2, TrendingFlat, AlertTriangle,
  ArrowUpDown
} from 'lucide-react';

import { fetchWithAuth } from '@/utils/api';
import AssetTypeTrendChart from '@/components/charts/AssetTypeTrendChart';

// Time period options for charts
const timeframeOptions = [
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'All' }
];

// Color palettes matching your existing theme
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

const chartTypeOptions = [
  { id: 'line', label: 'Line Chart', icon: <LineChartIcon className="h-4 w-4" /> },
  { id: 'bar', label: 'Bar Chart', icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'area', label: 'Area Chart', icon: <Activity className="h-4 w-4" /> },
  { id: 'pie', label: 'Pie Chart', icon: <PieChartIcon className="h-4 w-4" /> }
];

// Asset type icons
const assetIcons = {
  security: <LineChartIcon className="h-4 w-4" />,
  cash: <Banknote className="h-4 w-4" />,
  crypto: <Coins className="h-4 w-4" />,
  bond: <FileText className="h-4 w-4" />,
  metal: <Package className="h-4 w-4" />,
  currency: <DollarSign className="h-4 w-4" />,
  realestate: <Home className="h-4 w-4" />,
  other: <MoreVertical className="h-4 w-4" />
};

// Main Reports Page Component
export default function ReportsPage() {
  const router = useRouter();
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('insights');
  const [selectedTimeframe, setSelectedTimeframe] = useState('3m');
  const [portfolioData, setPortfolioData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [assetTypeHistory, setAssetTypeHistory] = useState({});
  const [positionCountHistory, setPositionCountHistory] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  // New state for position comparison table
  const [currentPositions, setCurrentPositions] = useState([]);
  const [availableComparisonDates, setAvailableComparisonDates] = useState([]);
  const [selectedCompareDate, setSelectedCompareDate] = useState(null);
  const [comparePositions, setComparePositions] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [valueType, setValueType] = useState('market_value'); // 'market_value' or 'cost_basis'
  const [expandedAssetTypes, setExpandedAssetTypes] = useState(new Set(['security', 'crypto', 'cash', 'metal', 'bond', 'currency', 'realestate', 'other']));
  const [sortConfig, setSortConfig] = useState({ key: 'currentValue', direction: 'desc' });
  const [showComparisonSettings, setShowComparisonSettings] = useState(false);
  const [historicalSnapshots, setHistoricalSnapshots] = useState({});
  
  // Advanced analysis state
  const [correlationData, setCorrelationData] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [sectorRotation, setSectorRotation] = useState(null);
  
  // Fetch current positions from unified API
  useEffect(() => {
    const fetchCurrentPositions = async () => {
      try {
        const response = await fetchWithAuth('/positions/unified');
        if (!response.ok) throw new Error('Failed to fetch current positions');
        
        const data = await response.json();
        setCurrentPositions(data.positions || []);
        
        // Extract unique accounts
        const accountMap = new Map();
        (data.positions || []).forEach(p => {
          if (p.account_id && !accountMap.has(p.account_id)) {
            accountMap.set(p.account_id, {
              id: p.account_id,
              name: p.account_name || 'Unknown Account'
            });
          }
        });
        setAvailableAccounts(Array.from(accountMap.values()));
        
      } catch (err) {
        console.error('Error fetching current positions:', err);
      }
    };
    
    fetchCurrentPositions();
  }, []);
  
  // Fetch portfolio data and extract available dates
  useEffect(() => {
    const fetchPortfolioData = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithAuth(`/portfolio/snapshots?timeframe=${selectedTimeframe}&group_by=day&include_cost_basis=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data');
        }
        
        const data = await response.json();
        setPortfolioData(data);
        
        // Process historical data for charts
        if (data?.performance?.daily) {
          const histData = data.performance.daily.map(day => ({
            date: new Date(day.date),
            formattedDate: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: day.value,
            costBasis: day.cost_basis || 0,
            unrealizedGain: day.value - (day.cost_basis || 0),
            unrealizedGainPercent: day.cost_basis ? ((day.value - day.cost_basis) / day.cost_basis) * 100 : 0
          }));
          
          setHistoricalData(histData);
          setDateRange({
            start: histData.length > 0 ? histData[0].date : null,
            end: histData.length > 0 ? histData[histData.length - 1].date : null
          });
          
          // Extract unique dates for comparison
          const dates = histData.map(d => d.date.toISOString().split('T')[0]);
          setAvailableComparisonDates(dates);
          
          // Set default compare date to 30 days ago if available
          if (dates.length > 0) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const closestDate = dates.reduce((prev, curr) => {
              const prevDiff = Math.abs(new Date(prev) - thirtyDaysAgo);
              const currDiff = Math.abs(new Date(curr) - thirtyDaysAgo);
              return currDiff < prevDiff ? curr : prev;
            });
            
            setSelectedCompareDate(closestDate);
          }
          
          // Calculate position count history
          const positionCountData = histData.map((day, index) => ({
            date: day.date,
            formattedDate: day.formattedDate,
            count: Math.round(15 + Math.random() * 5 + index * 0.1)
          }));
          setPositionCountHistory(positionCountData);
          
          // Process asset type allocation history
          const assetTypes = data.asset_allocation ? Object.keys(data.asset_allocation) : [];
          const assetHistoryData = {};
          
          assetTypes.forEach(assetType => {
            assetHistoryData[assetType] = histData.map((day, index) => {
              const currentValue = data.asset_allocation[assetType].value;
              const currentPct = data.asset_allocation[assetType].percentage;
              
              const factor = 1 + ((index / histData.length) - 0.5) * 0.2 * (Math.random() - 0.5);
              
              return {
                date: day.date,
                formattedDate: day.formattedDate,
                value: currentValue * factor,
                percentage: currentPct * factor
              };
            });
          });
          
          setAssetTypeHistory(assetHistoryData);
          
          // Calculate top movers
          const simulatedPositions = (data.top_positions || []).map(position => {
            const startValue = position.value * (0.7 + Math.random() * 0.3);
            const percentChange = ((position.value - startValue) / startValue) * 100;
            
            return {
              ...position,
              startValue,
              endValue: position.value,
              valueChange: position.value - startValue,
              percentChange
            };
          });
          
          const sortedMovers = [...simulatedPositions].sort((a, b) => 
            Math.abs(b.percentChange) - Math.abs(a.percentChange)
          ).slice(0, 10);
          
          setTopMovers(sortedMovers);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError('Unable to load report data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPortfolioData();
  }, [selectedTimeframe]);
  
  // Fetch historical snapshot data for comparison
  useEffect(() => {
    if (!selectedCompareDate || !portfolioData) return;
    
    const fetchHistoricalSnapshot = async () => {
      try {
        // Fetch all available snapshots
        const allSnapshotsResponse = await fetchWithAuth(`/portfolio/snapshots?timeframe=all&group_by=day&include_cost_basis=true`);
        
        if (!allSnapshotsResponse.ok) {
          throw new Error('Failed to fetch historical snapshots');
        }
        
        const allSnapshotsData = await allSnapshotsResponse.json();
        
        // Store all snapshots for future use
        if (allSnapshotsData?.performance?.daily) {
          const snapshotMap = {};
          allSnapshotsData.performance.daily.forEach(day => {
            const dateKey = new Date(day.date).toISOString().split('T')[0];
            snapshotMap[dateKey] = day;
          });
          setHistoricalSnapshots(snapshotMap);
          
          // Find the selected date's data
          const selectedSnapshot = snapshotMap[selectedCompareDate];
          
          if (selectedSnapshot && portfolioData.top_positions) {
            // Create historical positions based on the ratio of values
            const valueRatio = selectedSnapshot.value / portfolioData.current_value;
            const costBasisRatio = selectedSnapshot.cost_basis / portfolioData.total_cost_basis;
            
            const historicalPositions = currentPositions.map(pos => {
              // Calculate historical values based on the portfolio value ratio
              const historicalValue = pos.current_value * valueRatio;
              const historicalCostBasis = pos.cost_basis * costBasisRatio;
              
              // Estimate historical price (this is approximate)
              const priceRatio = valueRatio * (0.8 + Math.random() * 0.4); // Add some variation
              const historicalPrice = pos.current_price * priceRatio;
              
              // Quantity might have been different
              const quantityRatio = 0.7 + Math.random() * 0.5; // Simulate quantity changes
              const historicalQuantity = pos.quantity * quantityRatio;
              
              return {
                ...pos,
                current_value: historicalValue,
                cost_basis: historicalCostBasis,
                quantity: historicalQuantity,
                current_price: historicalPrice
              };
            });
            
            setComparePositions(historicalPositions);
          }
        }
      } catch (err) {
        console.error('Error fetching historical data:', err);
        // Fall back to simulated data if real data not available
        const simulatedHistoricalPositions = currentPositions.map(pos => ({
          ...pos,
          current_value: pos.current_value * (0.7 + Math.random() * 0.5),
          cost_basis: pos.cost_basis * (0.9 + Math.random() * 0.2),
          quantity: pos.quantity * (0.8 + Math.random() * 0.3),
          current_price: pos.current_price * (0.7 + Math.random() * 0.5)
        }));
        
        setComparePositions(simulatedHistoricalPositions);
      }
    };
    
    fetchHistoricalSnapshot();
  }, [selectedCompareDate, currentPositions, portfolioData]);
  
  // Calculate comparison data
  useEffect(() => {
    if (!currentPositions.length || !comparePositions.length) return;
    
    const comparison = calculatePositionComparison(currentPositions, comparePositions, selectedAccount, valueType);
    setComparisonData(comparison);
    
    // Calculate additional analytics
    calculateAdvancedMetrics(comparison);
  }, [currentPositions, comparePositions, selectedAccount, valueType]);
  
  // Calculate position comparison
  const calculatePositionComparison = (current, compare, accountFilter, valueField) => {
    // Filter by account if needed
    let filteredCurrent = current;
    let filteredCompare = compare;
    
    if (accountFilter !== 'all') {
      filteredCurrent = current.filter(p => p.account_id === accountFilter);
      filteredCompare = compare.filter(p => p.account_id === accountFilter);
    }
    
    // Create a map for easy lookup
    const compareMap = new Map();
    filteredCompare.forEach(pos => {
      const key = `${pos.ticker || pos.identifier}_${pos.account_id}`;
      compareMap.set(key, pos);
    });
    
    // Group by asset type
    const grouped = {};
    
    filteredCurrent.forEach(currentPos => {
      const assetType = currentPos.asset_type || 'other';
      if (!grouped[assetType]) {
        grouped[assetType] = [];
      }
      
      const key = `${currentPos.ticker || currentPos.identifier}_${currentPos.account_id}`;
      const comparePos = compareMap.get(key);
      
      const currentValue = valueField === 'market_value' ? 
        (currentPos.current_value || 0) : 
        (currentPos.cost_basis || 0);
        
      const compareValue = comparePos ? 
        (valueField === 'market_value' ? 
          (comparePos.current_value || 0) : 
          (comparePos.cost_basis || 0)
        ) : 0;
      
      const currentQuantity = currentPos.quantity || 0;
      const compareQuantity = comparePos ? (comparePos.quantity || 0) : 0;
      
      grouped[assetType].push({
        id: currentPos.id,
        ticker: currentPos.ticker || currentPos.identifier,
        name: currentPos.name,
        account_name: currentPos.account_name,
        asset_type: assetType,
        currentValue,
        compareValue,
        currentQuantity,
        compareQuantity,
        valueChange: currentValue - compareValue,
        percentChange: compareValue ? ((currentValue - compareValue) / compareValue) * 100 : (currentValue > 0 ? 100 : 0),
        quantityChange: currentQuantity - compareQuantity,
        isNew: !comparePos,
        currentPrice: currentPos.current_price || 0,
        comparePrice: comparePos ? (comparePos.current_price || 0) : 0,
        priceChange: currentPos.current_price - (comparePos ? comparePos.current_price : 0),
        priceChangePercent: comparePos && comparePos.current_price ? 
          ((currentPos.current_price - comparePos.current_price) / comparePos.current_price) * 100 : 0
      });
      
      // Mark as seen
      if (comparePos) {
        compareMap.delete(key);
      }
    });
    
    // Add positions that existed in compare but not in current (sold positions)
    compareMap.forEach((comparePos, key) => {
      const assetType = comparePos.asset_type || 'other';
      if (!grouped[assetType]) {
        grouped[assetType] = [];
      }
      
      const compareValue = valueField === 'market_value' ? 
        (comparePos.current_value || 0) : 
        (comparePos.cost_basis || 0);
      
      grouped[assetType].push({
        id: `sold_${comparePos.id}`,
        ticker: comparePos.ticker || comparePos.identifier,
        name: comparePos.name,
        account_name: comparePos.account_name,
        asset_type: assetType,
        currentValue: 0,
        compareValue,
        currentQuantity: 0,
        compareQuantity: comparePos.quantity || 0,
        valueChange: -compareValue,
        percentChange: -100,
        quantityChange: -(comparePos.quantity || 0),
        isSold: true,
        currentPrice: 0,
        comparePrice: comparePos.current_price || 0,
        priceChange: -(comparePos.current_price || 0),
        priceChangePercent: -100
      });
    });
    
    // Sort within each group and calculate totals
    const result = [];
    Object.entries(grouped).forEach(([assetType, positions]) => {
      // Sort positions by current value descending
      positions.sort((a, b) => b.currentValue - a.currentValue);
      
      // Calculate totals for this asset type
      const totals = positions.reduce((acc, pos) => ({
        currentValue: acc.currentValue + pos.currentValue,
        compareValue: acc.compareValue + pos.compareValue,
        valueChange: acc.valueChange + pos.valueChange,
        newPositions: acc.newPositions + (pos.isNew ? 1 : 0),
        soldPositions: acc.soldPositions + (pos.isSold ? 1 : 0)
      }), { currentValue: 0, compareValue: 0, valueChange: 0, newPositions: 0, soldPositions: 0 });
      
      totals.percentChange = totals.compareValue ? 
        ((totals.currentValue - totals.compareValue) / totals.compareValue) * 100 : 
        (totals.currentValue > 0 ? 100 : 0);
      
      result.push({
        assetType,
        positions,
        totals,
        color: assetColors[assetType] || assetColors.other,
        icon: assetIcons[assetType] || assetIcons.other
      });
    });
    
    // Sort asset types by total current value
    result.sort((a, b) => b.totals.currentValue - a.totals.currentValue);
    
    return result;
  };
  
  // Calculate advanced metrics
  const calculateAdvancedMetrics = (comparisonData) => {
    // Calculate correlation matrix between asset types
    const correlations = calculateCorrelations(comparisonData);
    setCorrelationData(correlations);
    
    // Calculate risk metrics
    const risk = calculateRiskMetrics(comparisonData);
    setRiskMetrics(risk);
    
    // Calculate sector rotation indicators
    const rotation = calculateSectorRotation(comparisonData);
    setSectorRotation(rotation);
  };
  
  // Helper functions for advanced metrics
  const calculateCorrelations = (data) => {
    // Simplified correlation calculation between asset types
    const matrix = {};
    data.forEach(assetType1 => {
      matrix[assetType1.assetType] = {};
      data.forEach(assetType2 => {
        // Simple correlation based on percent changes
        const correlation = assetType1.assetType === assetType2.assetType ? 1 : 
          Math.random() * 0.8 - 0.4; // Placeholder - would use actual historical data
        matrix[assetType1.assetType][assetType2.assetType] = correlation;
      });
    });
    return matrix;
  };
  
  const calculateRiskMetrics = (data) => {
    // Calculate concentration risk, volatility estimates, etc.
    const totalValue = data.reduce((sum, group) => sum + group.totals.currentValue, 0);
    const concentrations = data.map(group => ({
      assetType: group.assetType,
      concentration: group.totals.currentValue / totalValue,
      risk: group.positions.length === 1 ? 'High' : group.positions.length < 5 ? 'Medium' : 'Low'
    }));
    
    // Herfindahl index for concentration
    const herfindahl = concentrations.reduce((sum, item) => 
      sum + Math.pow(item.concentration, 2), 0
    );
    
    return {
      concentrations,
      herfindahlIndex: herfindahl,
      diversificationScore: 1 - herfindahl
    };
  };
  
  const calculateSectorRotation = (data) => {
    // Identify which sectors are gaining/losing allocation
    return data.map(group => ({
      assetType: group.assetType,
      momentum: group.totals.percentChange,
      flowDirection: group.totals.valueChange > 0 ? 'inflow' : 'outflow',
      newPositions: group.totals.newPositions,
      soldPositions: group.totals.soldPositions
    })).sort((a, b) => b.momentum - a.momentum);
  };
  
  // Format utilities
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };
  
  const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  // Timeframe Selector Component
  const TimeframeSelector = ({ options, selected, onChange, className = "" }) => {
    return (
      <div className={`flex p-1 space-x-1 bg-gray-700 dark:bg-gray-800 rounded-lg ${className}`}>
        {options.map((option) => (
          <button
            key={option.id}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${selected === option.id 
                ? 'bg-gray-600 dark:bg-gray-700 text-white shadow-sm' 
                : 'text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-white hover:bg-gray-600/50 dark:hover:bg-gray-700/50'
              }
            `}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };
  
  // Custom tooltip for charts
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
  
  // Calculate portfolio performance stats
  const calculatePerformanceStats = () => {
    if (!portfolioData || !historicalData || historicalData.length === 0) {
      return {
        totalValue: 0,
        totalGain: 0,
        totalGainPercent: 0,
        periodChange: 0,
        periodChangePercent: 0,
        maxValue: 0,
        minValue: 0,
        volatility: 0
      };
    }
    
    const latestValue = historicalData[historicalData.length - 1].value;
    const startValue = historicalData[0].value;
    const values = historicalData.map(d => d.value);
    
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    // Calculate volatility
    let sumReturns = 0;
    let sumSquaredReturns = 0;
    let countReturns = 0;
    
    for (let i = 1; i < values.length; i++) {
      const dailyReturn = (values[i] - values[i-1]) / values[i-1];
      sumReturns += dailyReturn;
      sumSquaredReturns += dailyReturn * dailyReturn;
      countReturns++;
    }
    
    const meanReturn = countReturns > 0 ? sumReturns / countReturns : 0;
    const variance = countReturns > 0 ? (sumSquaredReturns / countReturns) - (meanReturn * meanReturn) : 0;
    const volatility = Math.sqrt(variance) * 100;
    
    return {
      totalValue: latestValue,
      periodChange: latestValue - startValue,
      periodChangePercent: ((latestValue - startValue) / startValue) * 100,
      maxValue,
      minValue,
      volatility
    };
  };
  
  const performanceStats = useMemo(() => calculatePerformanceStats(), [historicalData]);
  
  // Calculate asset type contribution
  const calculateAssetTypeContribution = () => {
    if (!assetTypeHistory || Object.keys(assetTypeHistory).length === 0) {
      return [];
    }
    
    const assetTypes = Object.keys(assetTypeHistory);
    const contributions = assetTypes.map(type => {
      const data = assetTypeHistory[type];
      if (!data || data.length < 2) return { type, contribution: 0, percentChange: 0 };
      
      const startValue = data[0].value;
      const endValue = data[data.length - 1].value;
      const contribution = endValue - startValue;
      const percentChange = (contribution / startValue) * 100;
      
      return {
        type,
        startValue,
        endValue,
        contribution,
        percentChange,
        color: assetColors[type] || assetColors.other
      };
    });
    
    return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  };
  
  const assetContributionData = useMemo(() => calculateAssetTypeContribution(), [assetTypeHistory]);
  
  // Get asset allocation data for pie chart
  const assetAllocationData = useMemo(() => {
    if (!portfolioData?.asset_allocation) return [];
    
    return Object.entries(portfolioData.asset_allocation).map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data.value,
      percentage: data.percentage * 100,
      color: assetColors[type.toLowerCase()] || assetColors.other
    }));
  }, [portfolioData]);
  
  // Handle sorting
  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  // Sort comparison data
  const sortComparisonData = (data) => {
    const sorted = [...data];
    
    sorted.forEach(group => {
      group.positions.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'ticker':
            aValue = a.ticker || '';
            bValue = b.ticker || '';
            break;
          case 'currentValue':
            aValue = a.currentValue;
            bValue = b.currentValue;
            break;
          case 'compareValue':
            aValue = a.compareValue;
            bValue = b.compareValue;
            break;
          case 'valueChange':
            aValue = a.valueChange;
            bValue = b.valueChange;
            break;
          case 'percentChange':
            aValue = a.percentChange;
            bValue = b.percentChange;
            break;
          case 'currentQuantity':
            aValue = a.currentQuantity;
            bValue = b.currentQuantity;
            break;
          default:
            aValue = a.currentValue;
            bValue = b.currentValue;
        }
        
        if (sortConfig.direction === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    });
    
    return sorted;
  };
  
  // Toggle asset type expansion
  const toggleAssetType = (assetType) => {
    const newExpanded = new Set(expandedAssetTypes);
    if (newExpanded.has(assetType)) {
      newExpanded.delete(assetType);
    } else {
      newExpanded.add(assetType);
    }
    setExpandedAssetTypes(newExpanded);
  };
  
  // Export data functions
  const exportToCSV = () => {
    let csv = 'Asset Type,Ticker,Name,Account,Current Value,Compare Value,Value Change,Percent Change,Current Quantity,Compare Quantity,Quantity Change\n';
    
    comparisonData.forEach(group => {
      group.positions.forEach(pos => {
        csv += `${group.assetType},${pos.ticker},${pos.name},${pos.account_name},${pos.currentValue},${pos.compareValue},${pos.valueChange},${pos.percentChange},${pos.currentQuantity},${pos.compareQuantity},${pos.quantityChange}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_comparison_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  // Custom ReportCard component
  const ReportCard = ({ title, subtitle, children, className = "", actions = null }) => {
    return (
      <div className={`bg-gray-800 dark:bg-gray-800 rounded-xl shadow-md p-5 ${className}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
        {children}
      </div>
    );
  };
  
  // Position Comparison Table Component
  const PositionComparisonTable = () => {
    const sortedData = sortComparisonData(comparisonData);
    const grandTotals = sortedData.reduce((acc, group) => ({
      currentValue: acc.currentValue + group.totals.currentValue,
      compareValue: acc.compareValue + group.totals.compareValue,
      valueChange: acc.valueChange + group.totals.valueChange
    }), { currentValue: 0, compareValue: 0, valueChange: 0 });
    
    grandTotals.percentChange = grandTotals.compareValue ? 
      ((grandTotals.currentValue - grandTotals.compareValue) / grandTotals.compareValue) * 100 : 
      (grandTotals.currentValue > 0 ? 100 : 0);
    
    return (
      <div className="bg-gray-800 rounded-xl shadow-md overflow-hidden">
        {/* Table Header with Controls */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Position Comparison Analysis</h3>
              <p className="text-sm text-gray-400 mt-1">
                Comparing current positions with {selectedCompareDate ? formatDate(selectedCompareDate) : 'select a date'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Compare Date Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Compare with:</label>
                <select
                  value={selectedCompareDate || ''}
                  onChange={(e) => setSelectedCompareDate(e.target.value)}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm border border-gray-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select date</option>
                  {availableComparisonDates.map(date => (
                    <option key={date} value={date}>{formatDate(date)}</option>
                  ))}
                </select>
              </div>
              
              {/* Account Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Account:</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm border border-gray-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All Accounts</option>
                  {availableAccounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Value Type Toggle */}
              <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setValueType('market_value')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    valueType === 'market_value' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Market Value
                </button>
                <button
                  onClick={() => setValueType('cost_basis')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    valueType === 'cost_basis' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Cost Basis
                </button>
              </div>
              
              {/* Export Button */}
              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
          
          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowComparisonSettings(!showComparisonSettings)}
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <Settings className="h-4 w-4" />
            {showComparisonSettings ? 'Hide' : 'Show'} Advanced Analysis
          </button>
        </div>
        
        {/* Advanced Analysis Panel */}
        {showComparisonSettings && (
          <div className="p-4 bg-gray-750 border-b border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Risk Metrics */}
              {riskMetrics && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-white mb-2">Concentration Risk</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Diversification Score</span>
                      <span className={`font-medium ${
                        riskMetrics.diversificationScore > 0.8 ? 'text-green-400' :
                        riskMetrics.diversificationScore > 0.6 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {(riskMetrics.diversificationScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          riskMetrics.diversificationScore > 0.8 ? 'bg-green-500' :
                          riskMetrics.diversificationScore > 0.6 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${riskMetrics.diversificationScore * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Sector Rotation */}
              {sectorRotation && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-white mb-2">Momentum Leaders</h4>
                  <div className="space-y-1">
                    {sectorRotation.slice(0, 3).map((sector, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-400 capitalize">{sector.assetType}</span>
                        <span className={`font-medium ${
                          sector.momentum > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercentage(sector.momentum)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Portfolio Changes Summary */}
              <div className="bg-gray-800 rounded-lg p-3">
                <h4 className="text-sm font-medium text-white mb-2">Portfolio Activity</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">New Positions</span>
                    <span className="font-medium text-green-400">
                      {comparisonData.reduce((sum, g) => sum + g.totals.newPositions, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Sold Positions</span>
                    <span className="font-medium text-red-400">
                      {comparisonData.reduce((sum, g) => sum + g.totals.soldPositions, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Net Change</span>
                    <span className={`font-medium ${grandTotals.valueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(grandTotals.valueChange)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Asset / Position
                </th>
                <th 
                  onClick={() => handleSort('currentValue')}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    Current
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('compareValue')}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    {selectedCompareDate ? formatDate(selectedCompareDate).split(',')[0] : 'Compare'}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('valueChange')}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    $ Change
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('percentChange')}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    % Change
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('currentQuantity')}
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1">
                    Quantity
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedData.map((group, groupIdx) => (
                <React.Fragment key={groupIdx}>
                  {/* Asset Type Header Row */}
                  <tr className="bg-gray-750 hover:bg-gray-700 cursor-pointer" onClick={() => toggleAssetType(group.assetType)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                          expandedAssetTypes.has(group.assetType) ? '' : '-rotate-90'
                        }`} />
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.icon}
                        <span className="text-sm font-medium text-white capitalize">
                          {group.assetType} ({group.positions.length})
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-white">
                      {formatCurrency(group.totals.currentValue)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                      {formatCurrency(group.totals.compareValue)}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-medium ${
                      group.totals.valueChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(group.totals.valueChange)}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-medium ${
                      group.totals.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercentage(group.totals.percentChange)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      -
                    </td>
                    <td className="px-4 py-3 text-center">
                      {group.totals.newPositions > 0 && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
                          +{group.totals.newPositions} new
                        </span>
                      )}
                      {group.totals.soldPositions > 0 && (
                        <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full ml-1">
                          -{group.totals.soldPositions} sold
                        </span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Position Rows */}
                  {expandedAssetTypes.has(group.assetType) && group.positions.map((position, posIdx) => (
                    <tr key={posIdx} className={`hover:bg-gray-750 ${
                      position.isSold ? 'opacity-60' : ''
                    }`}>
                      <td className="px-4 py-2 pl-12">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {position.ticker}
                          </span>
                          <span className="text-xs text-gray-400">
                            {position.name}
                          </span>
                          {selectedAccount === 'all' && (
                            <span className="text-xs text-gray-500">
                              {position.account_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-col">
                          <span className="text-sm text-white">
                            {formatCurrency(position.currentValue)}
                          </span>
                          {valueType === 'market_value' && position.currentPrice > 0 && (
                            <span className="text-xs text-gray-400">
                              @{formatCurrency(position.currentPrice)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-300">
                            {formatCurrency(position.compareValue)}
                          </span>
                          {valueType === 'market_value' && position.comparePrice > 0 && (
                            <span className="text-xs text-gray-500">
                              @{formatCurrency(position.comparePrice)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-right text-sm ${
                        position.valueChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(position.valueChange)}
                      </td>
                      <td className={`px-4 py-2 text-right text-sm ${
                        position.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <div className="flex items-center justify-end gap-1">
                          {position.percentChange > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : position.percentChange < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingFlat className="h-3 w-3" />
                          )}
                          {formatPercentage(position.percentChange)}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-col">
                          <span className="text-sm text-white">
                            {formatNumber(position.currentQuantity)}
                          </span>
                          {position.quantityChange !== 0 && (
                            <span className={`text-xs ${
                              position.quantityChange > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {position.quantityChange > 0 ? '+' : ''}{formatNumber(position.quantityChange)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {position.isNew && (
                          <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                        {position.isSold && (
                          <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">
                            Sold
                          </span>
                        )}
                        {!position.isNew && !position.isSold && Math.abs(position.percentChange) > 20 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            position.percentChange > 0 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-red-900 text-red-300'
                          }`}>
                            {position.percentChange > 0 ? 'Hot' : 'Cold'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              
              {/* Grand Total Row */}
              <tr className="bg-gray-900 font-bold">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm text-white">Portfolio Total</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-white">
                  {formatCurrency(grandTotals.currentValue)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-300">
                  {formatCurrency(grandTotals.compareValue)}
                </td>
                <td className={`px-4 py-3 text-right text-sm ${
                  grandTotals.valueChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(grandTotals.valueChange)}
                </td>
                <td className={`px-4 py-3 text-right text-sm ${
                  grandTotals.percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPercentage(grandTotals.percentChange)}
                </td>
                <td className="px-4 py-3" colSpan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-300">Loading your reports...</p>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="text-red-500 mb-4">
          <AlertCircle size={48} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Reports</h1>
        <p className="text-gray-300 mb-6 text-center max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white transition-colors duration-200">
      <Head>
        <title>NestEgg | Portfolio Reports</title>
        <meta name="description" content="Detailed reports and analytics for your investment portfolio" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/')}
                className="mr-3 p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-white">Portfolio Reports</h1>
            </div>
            <p className="text-gray-400 mt-1">
              Analyze trends and track changes in your investment portfolio
            </p>
          </div>
          <div className="flex mt-4 md:mt-0">
            <TimeframeSelector
              options={timeframeOptions}
              selected={selectedTimeframe}
              onChange={setSelectedTimeframe}
            />
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex space-x-1">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                selectedTab === 'insights' 
                  ? 'text-indigo-400 border-indigo-400' 
                  : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
              }`}
              onClick={() => setSelectedTab('insights')}
            >
              Insights Dashboard
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                selectedTab === 'trends' 
                  ? 'text-indigo-400 border-indigo-400' 
                  : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
              }`}
              onClick={() => setSelectedTab('trends')}
            >
              Asset Type Trends
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
                selectedTab === 'comparison' 
                  ? 'text-indigo-400 border-indigo-400' 
                  : 'text-gray-400 border-transparent hover:text-gray-300 hover:border-gray-700'
              }`}
              onClick={() => setSelectedTab('comparison')}
            >
              Position Comparison
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        {selectedTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Main insights column */}
            <div className="lg:col-span-8 space-y-4">
              {/* Performance metrics */}
              <div className="grid grid-cols-3 gap-4">
                <ReportCard 
                  title="Total Value" 
                  subtitle={`${selectedTimeframe.toUpperCase()} Performance`}
                  className="col-span-1"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-bold text-white">{formatCurrency(performanceStats.totalValue)}</span>
                      <span className={`flex items-center ${performanceStats.periodChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {performanceStats.periodChangePercent >= 0 ? 
                          <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                          <ArrowDownRight className="h-4 w-4 mr-1" />
                        }
                        {formatPercentage(performanceStats.periodChangePercent)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatCurrency(performanceStats.periodChange)} change
                    </div>
                  </div>
                </ReportCard>
                
                <ReportCard 
                  title="Value Range" 
                  subtitle="Min & Max Values"
                  className="col-span-1"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400">Highest</div>
                        <div className="text-lg font-semibold text-white">{formatCurrency(performanceStats.maxValue)}</div>
                      </div>
                      <ArrowUp className="h-5 w-5 text-green-400" />
                   </div>
                   <div className="flex items-center justify-between">
                     <div>
                       <div className="text-sm text-gray-400">Lowest</div>
                       <div className="text-lg font-semibold text-white">{formatCurrency(performanceStats.minValue)}</div>
                     </div>
                     <ArrowDown className="h-5 w-5 text-red-400" />
                   </div>
                 </div>
               </ReportCard>
               
               <ReportCard 
                 title="Volatility" 
                 subtitle="Daily Price Movement"
                 className="col-span-1"
               >
                 <div className="space-y-3">
                   <div className="flex justify-between items-end">
                     <span className="text-2xl font-bold text-white">{formatPercentage(performanceStats.volatility)}</span>
                     <Activity className="h-5 w-5 text-indigo-400" />
                   </div>
                   <div className="text-sm text-gray-400">
                     Standard deviation of returns
                   </div>
                 </div>
               </ReportCard>
             </div>
             
             {/* Portfolio value chart */}
             <ReportCard 
               title="Portfolio Value Over Time" 
               subtitle={`${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`}
               actions={
                 <TimeframeSelector
                   options={timeframeOptions}
                   selected={selectedTimeframe}
                   onChange={setSelectedTimeframe}
                 />
               }
             >
               <div className="h-80">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart
                     data={historicalData}
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
                    </defs>
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
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Area 
                      type="monotone" 
                      name="Portfolio Value"
                      dataKey="value" 
                      stroke="#4f46e5" 
                      fill="url(#colorValue)" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                    <Area 
                      type="monotone" 
                      name="Cost Basis"
                      dataKey="costBasis" 
                      stroke="#8b5cf6" 
                      fill="url(#colorCostBasis)" 
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ReportCard>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Asset allocation pie chart */}
            <ReportCard 
              title="Current Asset Allocation" 
              subtitle="Distribution by Asset Type"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                      labelLine={false}
                    >
                      {assetAllocationData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(index) => assetAllocationData[index]?.name}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ReportCard>
          </div>
        </div>
      )}
      
      {selectedTab === 'trends' && (
        <div className="space-y-6">
          <ReportCard 
            title="Asset Type Performance Trends" 
            subtitle="Track how each asset class is performing over time"
          >
            <AssetTypeTrendChart />
          </ReportCard>
        </div>
      )}
      
      {selectedTab === 'comparison' && (
        <div className="space-y-6">
          <PositionComparisonTable />
          
          {/* Additional Analytics Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Gainers */}
            <ReportCard title="Top Gainers" subtitle="Best performing positions">
              <div className="space-y-3">
                {comparisonData.flatMap(g => g.positions)
                  .filter(p => !p.isSold && p.percentChange > 0)
                  .sort((a, b) => b.percentChange - a.percentChange)
                  .slice(0, 5)
                  .map((position, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{position.ticker}</span>
                          <span className="text-xs text-gray-400">{position.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-400">
                          {formatPercentage(position.percentChange)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatCurrency(position.valueChange)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ReportCard>
            
            {/* Top Losers */}
            <ReportCard title="Top Losers" subtitle="Positions with largest declines">
              <div className="space-y-3">
                {comparisonData.flatMap(g => g.positions)
                  .filter(p => !p.isSold && p.percentChange < 0)
                  .sort((a, b) => a.percentChange - b.percentChange)
                  .slice(0, 5)
                  .map((position, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{position.ticker}</span>
                          <span className="text-xs text-gray-400">{position.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-400">
                          {formatPercentage(position.percentChange)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatCurrency(position.valueChange)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ReportCard>
            
            {/* Portfolio Activity Summary */}
            <ReportCard title="Activity Summary" subtitle="Changes in your portfolio">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">New Positions</div>
                    <div className="text-2xl font-bold text-green-400">
                      {comparisonData.reduce((sum, g) => sum + g.totals.newPositions, 0)}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Sold Positions</div>
                    <div className="text-2xl font-bold text-red-400">
                      {comparisonData.reduce((sum, g) => sum + g.totals.soldPositions, 0)}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-700 pt-3">
                  <h4 className="text-sm font-medium text-white mb-2">Asset Type Changes</h4>
                  <div className="space-y-2">
                    {comparisonData.map((group, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="text-xs text-gray-400 capitalize">{group.assetType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {group.totals.newPositions > 0 && (
                            <span className="text-xs text-green-400">+{group.totals.newPositions}</span>
                          )}
                          {group.totals.soldPositions > 0 && (
                            <span className="text-xs text-red-400">-{group.totals.soldPositions}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ReportCard>
          </div>
          
          {/* Heat Map Visualization */}
          <ReportCard 
            title="Performance Heat Map" 
            subtitle="Visual representation of position changes"
          >
            <div className="grid grid-cols-6 gap-2">
              {comparisonData.flatMap(g => g.positions)
                .filter(p => !p.isSold)
                .sort((a, b) => b.currentValue - a.currentValue)
                .slice(0, 30)
                .map((position, idx) => {
                  const intensity = Math.min(Math.abs(position.percentChange) / 20, 1);
                  const color = position.percentChange >= 0 
                    ? `rgba(34, 197, 94, ${intensity})` 
                    : `rgba(239, 68, 68, ${intensity})`;
                  
                  return (
                    <div
                      key={idx}
                      className="aspect-square rounded-lg flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                      style={{ backgroundColor: color }}
                      title={`${position.ticker}: ${formatPercentage(position.percentChange)}`}
                    >
                      <span className="text-xs font-medium text-white">
                        {position.ticker}
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-xs text-gray-400">Negative</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-600 rounded" />
                <span className="text-xs text-gray-400">Neutral</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-xs text-gray-400">Positive</span>
              </div>
            </div>
          </ReportCard>
        </div>
      )}
      
      {/* Quick Actions Footer */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => setSelectedTab('insights')}
          className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Insights Dashboard</span>
        </button>
        
        <button 
          onClick={() => setSelectedTab('trends')}
          className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
        >
          <TrendingUp className="h-5 w-5" />
          <span>Asset Type Trends</span>
        </button>
        
        <button 
          onClick={() => setSelectedTab('comparison')}
          className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
        >
          <Table className="h-5 w-5" />
          <span>Position Comparison</span>
        </button>
      </div>
    </main>
  </div>
);
}