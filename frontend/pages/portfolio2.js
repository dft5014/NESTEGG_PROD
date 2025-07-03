import React, { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
 DollarSign, TrendingUp, TrendingDown, Percent, Layers, 
 ArrowUp, ArrowDown, BarChart4, LineChart, PieChart as PieChartIcon,
 Briefcase, RefreshCw, Search, X, Filter, Sparkles,
 Diamond, Coins, Package, Home, Plus, Eye, EyeOff,
 Activity, Zap, Trophy, Target, AlertCircle, ChevronRight,
 Globe, Shield, Clock, Star, ArrowUpRight, ArrowDownRight,
 Wallet, CreditCard, Building2, ChartBar, Gauge, Flame,
 Moon, Sun, Cpu, Gem, DollarSign as Dollar, Bitcoin, Info,
 Landmark, FileText, Calculator, Banknote, Scale, AlertTriangle
} from 'lucide-react';
import { 
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
 PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
 AreaChart, Area, LineChart as RechartsLineChart, Line, ComposedChart
} from 'recharts';
import KpiCard from '@/components/ui/KpiCard';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { fetchUnifiedPositions, fetchLatestNetWorthSummary, fetchNetWorthHistory } from '@/utils/apimethods/positionMethods';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import AddPositionButton from '@/components/AddPositionButton';

export default function PositionsPage() {
 const [positions, setPositions] = useState([]);
 const [netWorthSummary, setNetWorthSummary] = useState(null);
 const [historicalData, setHistoricalData] = useState([]);
 const [filterView, setFilterView] = useState('all');
 const [searchTerm, setSearchTerm] = useState('');
 const [isLoading, setIsLoading] = useState(true);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [error, setError] = useState(null);
 const [showValues, setShowValues] = useState(true);
 const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
 const [showHealthInfo, setShowHealthInfo] = useState(false);
 const [showPerformanceInfo, setShowPerformanceInfo] = useState(false);
 const [showRiskInfo, setShowRiskInfo] = useState(false);
 const [showNetWorthBreakdown, setShowNetWorthBreakdown] = useState(false);
 const containerRef = useRef(null);
 
 const router = useRouter();
 
 // Enhanced color schemes with liabilities
 const assetTypeConfig = {
   'security': { 
     icon: <LineChart className="w-4 h-4" />, 
     color: '#2563eb',
     bgColor: 'bg-blue-500/10',
     label: 'Securities'
   },
   'cash': { 
     icon: <Dollar className="w-4 h-4" />, 
     color: '#10b981',
     bgColor: 'bg-emerald-500/10',
     label: 'Cash'
   },
   'crypto': { 
     icon: <Bitcoin className="w-4 h-4" />, 
     color: '#8b5cf6',
     bgColor: 'bg-purple-500/10',
     label: 'Crypto'
   },
   'metal': { 
     icon: <Gem className="w-4 h-4" />, 
     color: '#f97316',
     bgColor: 'bg-orange-500/10',
     label: 'Metals'
   },
   'other_assets': { 
     icon: <Package className="w-4 h-4" />, 
     color: '#06b6d4',
     bgColor: 'bg-cyan-500/10',
     label: 'Other Assets'
   },
   'mortgage': {
     icon: <Home className="w-4 h-4" />,
     color: '#ef4444',
     bgColor: 'bg-red-500/10',
     label: 'Mortgage'
   },
   'credit_card': {
     icon: <CreditCard className="w-4 h-4" />,
     color: '#f59e0b',
     bgColor: 'bg-amber-500/10',
     label: 'Credit Cards'
   },
   'loan': {
     icon: <FileText className="w-4 h-4" />,
     color: '#ec4899',
     bgColor: 'bg-pink-500/10',
     label: 'Loans'
   },
   'other_liabilities': {
     icon: <Layers className="w-4 h-4" />,
     color: '#6b7280',
     bgColor: 'bg-gray-500/10',
     label: 'Other Liabilities'
   }
 };
 
 // Enhanced sector colors
 const sectorColors = {
   'Technology': '#2563eb',
   'Financial Services': '#10b981',
   'Healthcare': '#ef4444',
   'Consumer Cyclical': '#f97316',
   'Communication Services': '#8b5cf6',
   'Industrials': '#6b7280',
   'Consumer Defensive': '#14b8a6',
   'Energy': '#f59e0b',
   'Basic Materials': '#f43f5e',
   'Real Estate': '#84cc16',
   'Utilities': '#0ea5e9',
   'Unknown': '#9ca3af'
 };
 
 // Enhanced filter options
 const filterOptions = [
   { id: 'all', label: 'All', icon: <Layers className="w-3 h-3" /> },
   { id: 'security', label: 'Securities', icon: <LineChart className="w-3 h-3" /> },
   { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-3 h-3" /> },
   { id: 'metal', label: 'Metals', icon: <Gem className="w-3 h-3" /> },
   { id: 'cash', label: 'Cash', icon: <Dollar className="w-3 h-3" /> },
   { id: 'other_assets', label: 'Other Assets', icon: <Package className="w-3 h-3" /> },
   { id: 'gainers', label: 'Gainers', icon: <TrendingUp className="w-3 h-3" /> },
   { id: 'losers', label: 'Losers', icon: <TrendingDown className="w-3 h-3" /> }
 ];
 
 useEffect(() => {
   loadAllData();
 }, []);

 useEffect(() => {
   if (netWorthSummary) {
     loadHistoricalData();
   }
 }, [selectedTimeframe]);
 
 // Load all data
 const loadAllData = async () => {
   setIsLoading(true);
   setError(null);
   try {
     const [fetchedPositions, summaryData, histData] = await Promise.all([
       fetchUnifiedPositions(),
       fetchLatestNetWorthSummary(),
       fetchNetWorthHistory(selectedTimeframe)
     ]);

     console.log("Positions:", fetchedPositions.length);
     console.log("Net Worth Summary:", summaryData);
     console.log("Historical Data:", histData);
     
     setPositions(fetchedPositions);
     setNetWorthSummary(summaryData);
     setHistoricalData(Array.isArray(histData) ? histData : []);
   } catch (error) {
     console.error("Error loading data:", error);
     setError(error.message || "Failed to load data");
   } finally {
     setIsLoading(false);
   }
 };

 // Load historical data
 const loadHistoricalData = async () => {
   try {
     const histData = await fetchNetWorthHistory(selectedTimeframe);
     setHistoricalData(Array.isArray(histData) ? histData : []);
   } catch (error) {
     console.error("Error loading historical data:", error);
   }
 };
 
 // Filter positions
 const filteredPositions = useMemo(() => {
   return positions.filter(position => {
     const matchesSearch = !searchTerm || 
       (position.name && position.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (position.identifier && position.identifier.toLowerCase().includes(searchTerm.toLowerCase()));
     
     let matchesFilter = true;
     switch(filterView) {
       case 'security':
       case 'crypto':
       case 'metal':
       case 'cash':
         matchesFilter = position.asset_type === filterView;
         break;
       case 'other_assets':
         matchesFilter = position.asset_type === 'other';
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
 }, [positions, searchTerm, filterView]);
 
 // Enhanced tooltip
 const CustomTooltip = ({ active, payload, label }) => {
   if (active && payload && payload.length) {
     const data = payload[0].payload;
     return (
       <motion.div
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         className="bg-gray-900 p-3 shadow-lg rounded-lg border border-gray-700"
       >
         <p className="font-medium text-white text-sm mb-1">{data.name || label}</p>
         {payload.map((entry, index) => (
           <div key={index} className="flex justify-between items-center space-x-3">
             <span className="text-gray-400 text-xs">{entry.name}:</span>
             <span className="text-white text-sm font-medium">
               {entry.name.includes('%') ? formatPercentage(entry.value / 100) : formatCurrency(entry.value)}
             </span>
           </div>
         ))}
       </motion.div>
     );
   }
   return null;
 };
 
 // Refresh handler
 const handleRefreshPositions = async () => {
   setIsRefreshing(true);
   try {
     await loadAllData();
   } catch (error) {
     console.error("Error refreshing data:", error);
     setError(error.message || "Failed to refresh data");
   } finally {
     setIsRefreshing(false);
   }
 };
 
 const handlePositionAdded = async () => {
   await loadAllData();
 };

 // Get current period change from summary
 const getCurrentPeriodChange = () => {
   if (!netWorthSummary) return null;
   return netWorthSummary.periodChanges?.[selectedTimeframe];
 };

 const currentPeriodChange = getCurrentPeriodChange();

 // Animated number component
 const AnimatedNumber = ({ value, format = (v) => v }) => {
   const springValue = useSpring(0, { damping: 30, stiffness: 100 });
   
   useEffect(() => {
     springValue.set(value || 0);
   }, [value, springValue]);
   
   return <motion.span>{format(springValue.get())}</motion.span>;
 };

 // Enhanced Info Tooltip Component
 const InfoTooltip = ({ content, isOpen, onClose }) => {
   if (!isOpen) return null;
   
   return (
     <motion.div
       initial={{ opacity: 0, scale: 0.9, y: -10 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.9, y: -10 }}
       className="absolute z-50 bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-700 w-72 text-sm"
       style={{ top: '100%', right: 0, marginTop: '8px' }}
     >
       <button
         onClick={onClose}
         className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
       >
         <X className="w-3 h-3" />
       </button>
       <p className="text-gray-300 pr-6 leading-relaxed">{content}</p>
     </motion.div>
   );
 };

 // Prepare performance chart data
 const performanceData = useMemo(() => {
   if (!historicalData || historicalData.length === 0) return [];
   
   return historicalData.map(item => ({
     date: item.snapshot_date,
     value: item.total_assets,
     netWorth: item.net_worth,
     liabilities: item.total_liabilities
   }));
 }, [historicalData]);

 // Prepare asset allocation data with proper formatting
 const assetAllocationData = useMemo(() => {
   if (!netWorthSummary) return [];
   
   const allocations = [];
   
   // Add asset allocations
   Object.entries(netWorthSummary.assetAllocation || {}).forEach(([key, data]) => {
     if (data.value > 0) {
       allocations.push({
         name: assetTypeConfig[key]?.label || key,
         value: data.value,
         percentage: data.percentage * 100,
         config: assetTypeConfig[key] || assetTypeConfig.other_assets
       });
     }
   });
   
   return allocations;
 }, [netWorthSummary]);

 // Get top positions from JSON data
 const topPositions = useMemo(() => {
   if (!netWorthSummary?.top_liquid_positions) return [];
   return netWorthSummary.top_liquid_positions.slice(0, 10);
 }, [netWorthSummary]);

 // Get top performers from JSON data
 const topGainers = useMemo(() => {
   if (!netWorthSummary?.top_performers_percent) return [];
   return netWorthSummary.top_performers_percent
     .filter(p => p.gain_loss_percent > 0)
     .slice(0, 5);
 }, [netWorthSummary]);

 const topLosers = useMemo(() => {
   if (!netWorthSummary?.top_performers_percent) return [];
   return netWorthSummary.top_performers_percent
     .filter(p => p.gain_loss_percent < 0)
     .sort((a, b) => a.gain_loss_percent - b.gain_loss_percent)
     .slice(0, 5);
 }, [netWorthSummary]);

 // Get sector allocation from JSON data
 const sectorAllocationData = useMemo(() => {
   if (!netWorthSummary?.sector_allocation) return [];
   
   return Object.entries(netWorthSummary.sector_allocation).map(([sector, data]) => ({
     name: sector,
     value: data.value,
     percentage: data.percentage * 100,
     color: sectorColors[sector] || sectorColors.Unknown
   }));
 }, [netWorthSummary]);

 // Loading state
 if (isLoading) {
   return (
     <div className="min-h-screen bg-black text-white flex items-center justify-center">
       <div className="text-center">
         <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
         <p className="text-gray-400">Loading your portfolio...</p>
       </div>
     </div>
   );
 }
 
 return (
   <div ref={containerRef} className="min-h-screen bg-black text-white">
     <Head>
       <title>NestEgg | Portfolio Overview</title>
       <meta name="description" content="Complete portfolio and net worth management" />
       <link rel="icon" href="/favicon.ico" />
     </Head>
     
     {/* Enhanced Background with gradient animation */}
     <div className="fixed inset-0 z-0">
       <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
       <motion.div 
         className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-purple-900/20"
         animate={{ 
           opacity: [0.3, 0.5, 0.3],
           scale: [1, 1.1, 1]
         }}
         transition={{ duration: 10, repeat: Infinity }}
       />
     </div>
     
     <div className="relative z-10 container mx-auto p-4 md:p-6">
       {/* Enhanced Header */}
       <header className="mb-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
           <motion.div
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
           >
             <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
               Portfolio Overview
             </h1>
             <p className="text-gray-400 text-sm flex items-center">
               <Activity className="w-3 h-3 mr-2" />
               Complete financial picture • Last updated: {netWorthSummary?.snapshot_date || 'Loading...'}
             </p>
           </motion.div>
           
           <motion.div 
             className="flex items-center space-x-3 mt-4 md:mt-0"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
           >
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setShowValues(!showValues)}
               className="p-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700 transition-all duration-200 relative group"
             >
               <AnimatePresence mode="wait">
                 {showValues ? (
                   <motion.div
                     key="eye"
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     exit={{ scale: 0 }}
                   >
                     <Eye className="w-4 h-4" />
                   </motion.div>
                 ) : (
                   <motion.div
                     key="eye-off"
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     exit={{ scale: 0 }}
                   >
                     <EyeOff className="w-4 h-4" />
                   </motion.div>
                 )}
               </AnimatePresence>
               <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                 {showValues ? "Hide values" : "Show values"}
               </span>
             </motion.button>
             
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={handleRefreshPositions}
               className="flex items-center px-4 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-600/25"
               disabled={isRefreshing}
             >
               <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
               Refresh
             </motion.button>
             
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => router.push('/positions/add')}
               className="flex items-center px-4 py-2 bg-green-600 rounded-lg font-medium hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-green-600/25"
             >
               <Plus className="w-4 h-4 mr-2" />
               Add Position
             </motion.button>
           </motion.div>
         </div>
       </header>

       {/* Enhanced Net Worth Summary Section */}
       <section className="mb-8">
         <motion.div 
           className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
         >
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Main metrics with Net Worth focus */}
             <div className="lg:col-span-2">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center space-x-3">
                   <p className="text-gray-400 text-sm">Net Worth</p>
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => setShowNetWorthBreakdown(!showNetWorthBreakdown)}
                     className="text-gray-500 hover:text-white transition-colors"
                   >
                     <Info className="w-4 h-4" />
                   </motion.button>
                 </div>
                 <div className="flex items-center space-x-2">
                   {['1d', '1w', '1m', '3m', 'ytd', '1y'].map((period) => (
                     <motion.button
                       key={period}
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.9 }}
                       onClick={() => setSelectedTimeframe(period)}
                       className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                         selectedTimeframe === period
                           ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                           : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                       }`}
                     >
                       {period.toUpperCase()}
                     </motion.button>
                   ))}
                 </div>
               </div>
               
               <motion.h2 
                 className="text-4xl font-bold mb-2"
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ type: "spring", stiffness: 100 }}
               >
                 {showValues ? formatCurrency(netWorthSummary?.net_worth || 0) : '••••••'}
               </motion.h2>
               
               {/* Net Worth Breakdown */}
               <AnimatePresence>
                 {showNetWorthBreakdown && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="text-sm text-gray-400 mb-2 overflow-hidden"
                   >
                     <div className="flex items-center space-x-4 py-2">
                       <span>Assets: {showValues ? formatCurrency(netWorthSummary?.total_assets || 0) : '••••'}</span>
                       <span className="text-gray-600">-</span>
                       <span>Liabilities: {showValues ? formatCurrency(netWorthSummary?.total_liabilities || 0) : '••••'}</span>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
               
               <div className="flex items-center space-x-4 mb-4">
                 <motion.div 
                   className="flex items-center space-x-2"
                   animate={{ 
                     scale: currentPeriodChange?.netWorthPercent !== 0 ? [1, 1.1, 1] : 1
                   }}
                   transition={{ duration: 0.3 }}
                 >
                   <div className={`flex items-center ${currentPeriodChange?.netWorthPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                     {currentPeriodChange?.netWorthPercent >= 0 ? 
                       <ArrowUpRight className="w-4 h-4" /> : 
                       <ArrowDownRight className="w-4 h-4" />
                     }
                     <span className="text-lg font-medium">
                       {currentPeriodChange ? formatPercentage(currentPeriodChange.netWorthPercent) : '0.00%'}
                     </span>
                   </div>
                   <span className="text-gray-400 text-sm">({selectedTimeframe})</span>
                 </motion.div>
                 
                 <div className="flex items-center space-x-2">
                   <span className="text-gray-400 text-sm">Change:</span>
                   <span className={`text-lg font-medium ${currentPeriodChange?.netWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                     {showValues && currentPeriodChange ? formatCurrency(currentPeriodChange.netWorth) : '••••'}
                   </span>
                 </div>
               </div>
               
               {/* Enhanced Performance chart */}
               <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={performanceData}>
                     <defs>
                       <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                     <XAxis 
                       dataKey="date" 
                       stroke="#6b7280"
                       tick={{ fontSize: 10 }}
                       tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                     />
                     <YAxis 
                       stroke="#6b7280"
                       tick={{ fontSize: 10 }}
                       tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                     />
                     <Tooltip content={<CustomTooltip />} />
                     <Area
                       type="monotone"
                       dataKey="value"
                       stroke="#10b981"
                       fillOpacity={1}
                       fill="url(#assetsGradient)"
                       strokeWidth={1}
                       name="Total Assets"
                     />
                     <Area
                       type="monotone"
                       dataKey="netWorth"
                       stroke="#2563eb"
                       fillOpacity={1}
                       fill="url(#netWorthGradient)"
                       strokeWidth={2}
                       name="Net Worth"
                     />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>
             
             {/* Enhanced Key metrics sidebar */}
             <div className="space-y-4">
               <motion.div 
                 className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
               >
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-gray-400 text-sm">Total Assets</span>
                   <Wallet className="w-4 h-4 text-blue-400" />
                 </div>
                 <p className="text-xl font-bold text-blue-400">
                   {showValues ? formatCurrency(netWorthSummary?.total_assets || 0) : '••••'}
                 </p>
                 <p className="text-sm text-gray-400">
                   {netWorthSummary?.total_position_count || 0} positions
                 </p>
               </motion.div>
               
               <motion.div 
                 className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
               >
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-gray-400 text-sm">Total Liabilities</span>
                   <CreditCard className="w-4 h-4 text-red-400" />
                 </div>
                 <p className="text-xl font-bold text-red-400">
                   {showValues ? formatCurrency(netWorthSummary?.total_liabilities || 0) : '••••'}
                 </p>
                 <p className="text-sm text-gray-400">
                   {netWorthSummary?.liability_count || 0} liabilities
                 </p>
               </motion.div>
               
               <motion.div 
                 className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
               >
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-gray-400 text-sm">Total Gain/Loss</span>
                   {netWorthSummary?.total_unrealized_gain >= 0 ? 
                     <TrendingUp className="w-4 h-4 text-green-400" /> : 
                     <TrendingDown className="w-4 h-4 text-red-400" />
                   }
                 </div>
                 <p className={`text-xl font-bold ${netWorthSummary?.total_unrealized_gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   {showValues ? formatCurrency(netWorthSummary?.total_unrealized_gain || 0) : '••••'}
                 </p>
                 <p className="text-sm text-gray-400">
                   {formatPercentage(netWorthSummary?.total_unrealized_gain_percent || 0)} return
                 </p>
               </motion.div>
               
               <motion.div 
                 className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                 whileHover={{ scale: 1.02 }}
                 whileTap={{ scale: 0.98 }}
               >
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-gray-400 text-sm">Income & Yield</span>
                   <Trophy className="w-4 h-4 text-yellow-400" />
                 </div>
                 <p className="text-xl font-bold text-green-400">
                   {showValues ? formatCurrency(netWorthSummary?.annual_income || 0) : '••••'}
                 </p>
                 <p className="text-sm text-gray-400">
                   {formatPercentage(netWorthSummary?.yield_percentage || 0)} yield
                 </p>
               </motion.div>
             </div>
           </div>
         </motion.div>
       </section>

       {/* Enhanced Metrics Cards with Liabilities */}
       <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
         {[
           {
             title: "Liquid Assets",
             value: netWorthSummary?.liquid_assets,
             icon: <Banknote className="w-5 h-5" />,
             color: "text-blue-400",
             bgColor: "bg-blue-500/10",
             format: (v) => showValues ? formatCurrency(v) : '••••',
             subtitle: `${netWorthSummary?.liquid_position_count || 0} positions`,
             change: netWorthSummary?.liquid_unrealized_gain_percent,
             hoverScale: 1.05
           },
           {
             title: "Other Assets",
             value: netWorthSummary?.other_assets,
             icon: <Package className="w-5 h-5" />,
             color: "text-cyan-400",
             bgColor: "bg-cyan-500/10",
             format: (v) => showValues ? formatCurrency(v) : '••••',
             subtitle: `${netWorthSummary?.other_assets_count || 0} assets`,
             change: netWorthSummary?.other_assets_gain_loss_percent,
             hoverScale: 1.05
           },
           {
             title: "Debt-to-Asset",
             value: netWorthSummary?.debt_to_asset_ratio,
             icon: <Scale className="w-5 h-5" />,
             color: netWorthSummary?.debt_to_asset_ratio < 0.3 ? "text-green-400" : netWorthSummary?.debt_to_asset_ratio < 0.5 ? "text-yellow-400" : "text-red-400",
             bgColor: netWorthSummary?.debt_to_asset_ratio < 0.3 ? "bg-green-500/10" : netWorthSummary?.debt_to_asset_ratio < 0.5 ? "bg-yellow-500/10" : "bg-red-500/10",
             format: (v) => `${(v * 100).toFixed(1)}%`,
             subtitle: "Leverage ratio",
             hoverScale: 1.05
           },
           {
             title: "Liquidity Ratio",
             value: netWorthSummary?.liquid_ratio,
             icon: <Droplets className="w-5 h-5" />,
             color: "text-purple-400",
             bgColor: "bg-purple-500/10",
             format: (v) => `${(v * 100).toFixed(1)}%`,
             subtitle: "Liquid vs total",
             hoverScale: 1.05
           }
         ].map((metric, index) => (
           <motion.div
             key={metric.title}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 + index * 0.05 }}
             whileHover={{ scale: metric.hoverScale }}
             className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:bg-gray-800 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl"
           >
             <div className="flex items-start justify-between mb-2">
               <motion.div 
                 className={`p-2 rounded-lg ${metric.bgColor}`}
                 whileHover={{ rotate: 360 }}
                 transition={{ duration: 0.5 }}
               >
                 <div className={metric.color}>{metric.icon}</div>
               </motion.div>
               {metric.change !== undefined && (
                 <span className={`text-xs ${metric.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                 </span>
               )}
             </div>
             <h3 className="text-gray-400 text-xs mb-1">{metric.title}</h3>
             <p className="text-xl font-bold mb-1">
               <AnimatedNumber value={metric.value} format={metric.format} />
             </p>
             {metric.subtitle && (
               <p className="text-xs text-gray-500 truncate">{metric.subtitle}</p>
             )}
           </motion.div>
         ))}
       </section>

       {/* Positions Table Section */}
       <section className="mb-8">
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.3 }}
         >
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
             <h3 className="text-xl font-bold flex items-center">
               <Wallet className="w-5 h-5 mr-2 text-blue-400" />
               All Positions
             </h3>
             
             {/* Enhanced Filter and Search */}
             <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 mt-3 md:mt-0">
               {/* Filter Pills with animation */}
               <div className="flex flex-wrap gap-2">
                 {filterOptions.map((option, index) => (
                   <motion.button
                     key={option.id}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: index * 0.05 }}
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => setFilterView(option.id)}
                     className={`flex items-center px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                       filterView === option.id 
                         ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                         : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                     }`}
                   >
                     {option.icon}
                     <span className="ml-1">{option.label}</span>
                   </motion.button>
                 ))}
               </div>
               
               {/* Enhanced Search */}
               <motion.div 
                 className="relative"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
               >
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input
                   type="text"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Search positions..."
                   className="pl-9 pr-9 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 transition-all duration-200 w-48 focus:w-64"
                 />
                 <AnimatePresence>
                   {searchTerm && (
                     <motion.button
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       exit={{ scale: 0 }}
                       onClick={() => setSearchTerm('')}
                       className="absolute right-2 top-1/2 transform -translate-y-1/2"
                     >
                       <X className="w-4 h-4 text-gray-400 hover:text-white" />
                     </motion.button>
                   )}
                 </AnimatePresence>
               </motion.div>
             </div>
           </div>
           
           {/* Filtered count with animation */}
           <AnimatePresence>
             {(filterView !== 'all' || searchTerm) && (
               <motion.div 
                 className="mb-3 flex items-center text-sm text-gray-400"
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
               >
                 <Filter className="w-3 h-3 mr-2" />
                 Showing {filteredPositions.length} of {positions.length} positions
                 <motion.button
                   whileHover={{ scale: 1.1 }}
                   whileTap={{ scale: 0.9 }}
                   onClick={() => {
                     setFilterView('all');
                     setSearchTerm('');
                   }}
                   className="ml-3 text-blue-400 hover:text-blue-300"
                 >
                   Clear filters
                 </motion.button>
               </motion.div>
             )}
           </AnimatePresence>
           
           <motion.div 
             className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl"
             whileHover={{ scale: 1.001 }}
           >
             <UnifiedGroupedPositionsTable 
               title="" 
               filteredPositions={filteredPositions} 
               onPositionAdded={handlePositionAdded}
               filterView={filterView}
               searchTerm={searchTerm}
             />
           </motion.div>
         </motion.div>
       </section>

       {/* Enhanced Analytics Section */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         {/* Asset Allocation with Liabilities */}
         <motion.section
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.4 }}
         >
           <h3 className="text-lg font-bold mb-4 flex items-center">
             <PieChartIcon className="w-5 h-5 mr-2 text-purple-400" />
             Asset & Liability Breakdown
           </h3>
           
           <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl">
             <div className="grid grid-cols-2 gap-4">
               {/* Enhanced Pie Chart */}
               <div className="relative">
                 <ResponsiveContainer width="100%" height={220}>
                   <PieChart>
                     <Pie
                       data={assetAllocationData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={90}
                       paddingAngle={2}
                       dataKey="value"
                       animationBegin={0}
                       animationDuration={800}
                     >
                       {assetAllocationData.map((entry, index) => (
                         <Cell 
                           key={`cell-${index}`} 
                           fill={entry.config.color}
                           stroke="none"
                         />
                       ))}
                     </Pie>
                     <Tooltip content={<CustomTooltip />} />
                   </PieChart>
                 </ResponsiveContainer>
                 
                 <motion.div 
                   className="absolute inset-0 flex items-center justify-center"
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   transition={{ delay: 0.5, type: "spring" }}
                 >
                   <div className="text-center">
                     <p className="text-2xl font-bold">{assetAllocationData.length}</p>
                     <p className="text-xs text-gray-400">Asset Types</p>
                   </div>
                 </motion.div>
               </div>
               
               {/* Enhanced Legend */}
               <div className="space-y-2 max-h-60 overflow-y-auto">
                 {assetAllocationData.map((asset, index) => (
                   <motion.div
                     key={asset.name}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.1 + index * 0.05 }}
                     whileHover={{ scale: 1.02, x: 5 }}
                     className="flex items-center justify-between p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all duration-200 cursor-pointer"
                   >
                     <div className="flex items-center space-x-2">
                       <motion.div 
                         className={`p-1.5 rounded ${asset.config.bgColor}`}
                         whileHover={{ rotate: 360 }}
                         transition={{ duration: 0.5 }}
                       >
                         {asset.config.icon}
                       </motion.div>
                       <span className="text-sm">{asset.name}</span>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-medium">{asset.percentage.toFixed(1)}%</p>
                       <p className="text-xs text-gray-400">
                         {showValues ? formatCurrency(asset.value) : '••••'}
                       </p>
                     </div>
                   </motion.div>
                 ))}
                 
                 {/* Liabilities Section */}
                 {netWorthSummary?.total_liabilities > 0 && (
                   <>
                     <div className="border-t border-gray-700 my-2"></div>
                     <p className="text-xs text-gray-500 uppercase tracking-wider">Liabilities</p>
                     {[
                       { key: 'mortgage', label: 'Mortgage', value: netWorthSummary?.mortgage_liabilities },
                       { key: 'credit_card', label: 'Credit Cards', value: netWorthSummary?.credit_card_liabilities },
                       { key: 'loan', label: 'Loans', value: netWorthSummary?.loan_liabilities },
                       { key: 'other_liabilities', label: 'Other', value: netWorthSummary?.other_liabilities_value }
                     ].filter(item => item.value > 0).map((liability, index) => (
                       <motion.div
                         key={liability.key}
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: 0.3 + index * 0.05 }}
                         whileHover={{ scale: 1.02, x: 5 }}
                         className="flex items-center justify-between p-2 bg-red-900/20 rounded-lg hover:bg-red-900/30 transition-all duration-200 cursor-pointer border border-red-900/20"
                       >
                         <div className="flex items-center space-x-2">
                           <div className={`p-1.5 rounded ${assetTypeConfig[liability.key].bgColor}`}>
                             {assetTypeConfig[liability.key].icon}
                           </div>
                           <span className="text-sm">{liability.label}</span>
                         </div>
                         <div className="text-right">
                           <p className="text-sm font-medium text-red-400">
                             {showValues ? formatCurrency(liability.value) : '••••'}
                           </p>
                         </div>
                       </motion.div>
                     ))}
                   </>
                 )}
               </div>
             </div>
           </div>
         </motion.section>

         {/* Enhanced Top Movers */}
         <motion.section
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.4 }}
         >
           <h3 className="text-lg font-bold mb-4 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-green-400" />
             Top Movers
           </h3>
           
           <div className="space-y-4">
             {/* Top Gainers with enhanced styling */}
             <motion.div 
               className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
               whileHover={{ scale: 1.01 }}
             >
               <h4 className="text-sm font-medium mb-3 flex items-center text-green-400">
                 <TrendingUp className="w-4 h-4 mr-2" />
                 Top Gainers
               </h4>
               
               <div className="space-y-2">
                 {topGainers.length > 0 ? topGainers.slice(0, 3).map((position, index) => (
                   <motion.div
                     key={`${position.identifier}-${index}`}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.1 + index * 0.05 }}
                     whileHover={{ x: 5 }}
                     className="flex items-center justify-between p-2.5 bg-green-500/10 rounded-lg border border-green-500/20 hover:bg-green-500/15 transition-all duration-200 cursor-pointer"
                   >
                     <div className="flex items-center space-x-2">
                       <motion.div 
                         className={`p-1 rounded ${assetTypeConfig[position.asset_type]?.bgColor || assetTypeConfig.other_assets.bgColor}`}
                         whileHover={{ rotate: 360 }}
                         transition={{ duration: 0.5 }}
                       >
                         {assetTypeConfig[position.asset_type]?.icon || assetTypeConfig.other_assets.icon}
                       </motion.div>
                       <div>
                         <p className="text-sm font-medium">{position.identifier}</p>
                         <p className="text-xs text-gray-400 truncate max-w-[150px]">{position.name}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <motion.p 
                         className="text-sm font-medium text-green-400"
                         animate={{ scale: [1, 1.1, 1] }}
                         transition={{ duration: 2, repeat: Infinity }}
                       >
                         +{formatPercentage(position.gain_loss_percent)}
                       </motion.p>
                       <p className="text-xs text-gray-400">
                         {showValues ? formatCurrency(position.current_value) : '••••'}
                       </p>
                     </div>
                   </motion.div>
                 )) : (
                   <p className="text-gray-500 text-sm text-center py-4">No gainers to display</p>
                 )}
               </div>
             </motion.div>
             
             {/* Top Losers with enhanced styling */}
             <motion.div 
               className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
               whileHover={{ scale: 1.01 }}
             >
               <h4 className="text-sm font-medium mb-3 flex items-center text-red-400">
                 <TrendingDown className="w-4 h-4 mr-2" />
                 Top Losers
               </h4>
               
               <div className="space-y-2">
                 {topLosers.length > 0 ? topLosers.slice(0, 3).map((position, index) => (
                   <motion.div
                     key={`${position.identifier}-${index}`}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.1 + index * 0.05 }}
                     whileHover={{ x: 5 }}
                     className="flex items-center justify-between p-2.5 bg-red-500/10 rounded-lg border border-red-500/20 hover:bg-red-500/15 transition-all duration-200 cursor-pointer"
                   >
                     <div className="flex items-center space-x-2">
                       <motion.div 
                         className={`p-1 rounded ${assetTypeConfig[position.asset_type]?.bgColor || assetTypeConfig.other_assets.bgColor}`}
                         whileHover={{ rotate: -360 }}
                         transition={{ duration: 0.5 }}
                       >
                         {assetTypeConfig[position.asset_type]?.icon || assetTypeConfig.other_assets.icon}
                       </motion.div>
                       <div>
                         <p className="text-sm font-medium">{position.identifier}</p>
                         <p className="text-xs text-gray-400 truncate max-w-[150px]">{position.name}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <motion.p 
                         className="text-sm font-medium text-red-400"
                         animate={{ scale: [1, 0.95, 1] }}
                         transition={{ duration: 2, repeat: Infinity }}
                       >
                         {formatPercentage(position.gain_loss_percent)}
                       </motion.p>
                       <p className="text-xs text-gray-400">
                         {showValues ? formatCurrency(position.current_value) : '••••'}
                       </p>
                     </div>
                   </motion.div>
                 )) : (
                   <p className="text-gray-500 text-sm text-center py-4">No losers to display</p>
                 )}
               </div>
             </motion.div>
           </div>
         </motion.section>
       </div>

       {/* Enhanced Sector Analysis */}
       <motion.section 
         className="mb-8"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.5 }}
       >
         <h3 className="text-lg font-bold mb-4 flex items-center">
           <ChartBar className="w-5 h-5 mr-2 text-indigo-400" />
           Sector Analysis
         </h3>
         
         <motion.div 
           className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
           whileHover={{ scale: 1.001 }}
         >
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart
                 data={sectorAllocationData}
                 margin={{ top: 5, right: 5, left: 5, bottom: 60 }}
               >
                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                 <XAxis 
                   dataKey="name" 
                   stroke="#6b7280"
                   tick={{ fontSize: 10 }}
                   angle={-45}
                   textAnchor="end"
                 />
                 <YAxis 
                   stroke="#6b7280"
                   tick={{ fontSize: 10 }}
                   tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                 />
                 <Tooltip content={<CustomTooltip />} />
                 <Bar 
                   dataKey="value" 
                   radius={[4, 4, 0, 0]}
                   animationBegin={0}
                   animationDuration={800}
                 >
                   {sectorAllocationData.map((entry, index) => (
                     <Cell 
                       key={`cell-${index}`} 
                       fill={entry.color}
                     />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
         </motion.div>
       </motion.section>

       {/* Enhanced Performance Insights Section */}
       <motion.section 
         className="mb-8"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.6 }}
       >
         <h3 className="text-lg font-bold mb-4 flex items-center">
           <Cpu className="w-5 h-5 mr-2 text-purple-400" />
           Performance & Risk Insights
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {[
             {
               title: "Portfolio Health",
               icon: <Activity className="w-5 h-5" />,
               score: 100 - (netWorthSummary?.concentration_metrics?.top_5_concentration || 0) * 100,
               status: netWorthSummary?.concentration_metrics?.top_5_concentration < 0.3 ? "Excellent" : 
                       netWorthSummary?.concentration_metrics?.top_5_concentration < 0.5 ? "Good" : "Needs Attention",
               color: netWorthSummary?.concentration_metrics?.top_5_concentration < 0.3 ? "text-green-400" : 
                      netWorthSummary?.concentration_metrics?.top_5_concentration < 0.5 ? "text-yellow-400" : "text-red-400",
               bgColor: netWorthSummary?.concentration_metrics?.top_5_concentration < 0.3 ? "bg-green-500/10" : 
                        netWorthSummary?.concentration_metrics?.top_5_concentration < 0.5 ? "bg-yellow-500/10" : "bg-red-500/10",
               insights: [
                 `${netWorthSummary?.total_position_count || 0} total positions`,
                 `${assetAllocationData.length} asset types`,
                 `Top 5 concentration: ${((netWorthSummary?.concentration_metrics?.top_5_concentration || 0) * 100).toFixed(1)}%`
               ],
               info: "Portfolio health measures diversification across positions and asset types. Lower concentration in top holdings indicates better diversification.",
               showInfo: showHealthInfo,
               setShowInfo: setShowHealthInfo
             },
             {
               title: "Performance Analysis",
               icon: <TrendingUp className="w-5 h-5" />,
               score: Math.min(100, Math.max(0, 50 + (netWorthSummary?.total_unrealized_gain_percent || 0))),
               status: netWorthSummary?.total_unrealized_gain_percent > 10 ? "Outperforming" : 
                       netWorthSummary?.total_unrealized_gain_percent > 0 ? "Positive" : "Underperforming",
               color: netWorthSummary?.total_unrealized_gain_percent > 10 ? "text-green-400" : 
                      netWorthSummary?.total_unrealized_gain_percent > 0 ? "text-blue-400" : "text-red-400",
               bgColor: netWorthSummary?.total_unrealized_gain_percent > 10 ? "bg-green-500/10" : 
                        netWorthSummary?.total_unrealized_gain_percent > 0 ? "bg-blue-500/10" : "bg-red-500/10",
               insights: [
                 `${formatPercentage(netWorthSummary?.total_unrealized_gain_percent || 0)} total return`,
                 `YTD: ${formatPercentage(netWorthSummary?.net_worth_ytd_change_pct || 0)}`,
                 `Income yield: ${formatPercentage(netWorthSummary?.yield_percentage || 0)}`
               ],
               info: "Performance tracks your total portfolio return including unrealized gains, income, and year-to-date changes.",
               showInfo: showPerformanceInfo,
               setShowInfo: setShowPerformanceInfo
             },
             {
               title: "Risk Assessment",
               icon: <Shield className="w-5 h-5" />,
               score: Math.max(0, 100 - (netWorthSummary?.risk_metrics?.volatility_estimate || 0) * 100),
               status: netWorthSummary?.risk_metrics?.volatility_estimate < 0.08 ? "Low Risk" : 
                       netWorthSummary?.risk_metrics?.volatility_estimate < 0.16 ? "Moderate" : "High Risk",
               color: netWorthSummary?.risk_metrics?.volatility_estimate < 0.08 ? "text-green-400" : 
                      netWorthSummary?.risk_metrics?.volatility_estimate < 0.16 ? "text-yellow-400" : "text-red-400",
               bgColor: netWorthSummary?.risk_metrics?.volatility_estimate < 0.08 ? "bg-green-500/10" : 
                        netWorthSummary?.risk_metrics?.volatility_estimate < 0.16 ? "bg-yellow-500/10" : "bg-red-500/10",
                        insights: [
                 `Volatility: ${((netWorthSummary?.risk_metrics?.volatility_estimate || 0) * 100).toFixed(1)}%`,
                 `Debt ratio: ${((netWorthSummary?.debt_to_asset_ratio || 0) * 100).toFixed(1)}%`,
                 `Cash buffer: ${((netWorthSummary?.cash_mix || 0) * 100).toFixed(1)}%`
               ],
               info: "Risk assessment evaluates portfolio volatility, leverage, and liquidity. Lower volatility and debt ratios indicate better risk management.",
               showInfo: showRiskInfo,
               setShowInfo: setShowRiskInfo
             }
           ].map((insight, index) => (
             <motion.div
               key={insight.title}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 + index * 0.1 }}
               whileHover={{ scale: 1.02 }}
               className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative shadow-xl hover:shadow-2xl transition-all duration-300"
             >
               <div className="flex items-center justify-between mb-3">
                 <h4 className="text-sm font-medium">{insight.title}</h4>
                 <div className="flex items-center space-x-2">
                   <motion.button
                     whileHover={{ scale: 1.1 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => insight.setShowInfo(!insight.showInfo)}
                     className="text-gray-400 hover:text-white transition-colors"
                   >
                     <Info className="w-4 h-4" />
                   </motion.button>
                   <motion.div 
                     className={`p-2 rounded-lg ${insight.bgColor}`}
                     whileHover={{ rotate: 360 }}
                     transition={{ duration: 0.5 }}
                   >
                     <div className={insight.color}>{insight.icon}</div>
                   </motion.div>
                 </div>
               </div>
               
               <AnimatePresence>
                 <InfoTooltip
                   content={insight.info}
                   isOpen={insight.showInfo}
                   onClose={() => insight.setShowInfo(false)}
                 />
               </AnimatePresence>
               
               {/* Enhanced Score Display */}
               <div className="mb-3">
                 <div className="flex items-end justify-between mb-1">
                   <motion.span 
                     className="text-2xl font-bold"
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ type: "spring", stiffness: 100 }}
                   >
                     {insight.score.toFixed(0)}
                   </motion.span>
                   <span className={`text-xs ${insight.color}`}>{insight.status}</span>
                 </div>
                 <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                   <motion.div
                     className={`h-full ${
                       insight.color === 'text-green-400' ? 'bg-gradient-to-r from-green-500 to-green-400' : 
                       insight.color === 'text-yellow-400' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 
                       insight.color === 'text-blue-400' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 
                       'bg-gradient-to-r from-red-500 to-red-400'
                     }`}
                     initial={{ width: 0 }}
                     animate={{ width: `${insight.score}%` }}
                     transition={{ duration: 1, ease: "easeOut" }}
                   />
                 </div>
               </div>
               
               {/* Insights with hover effects */}
               <div className="space-y-1">
                 {insight.insights.map((item, i) => (
                   <motion.div 
                     key={i} 
                     className="flex items-center text-xs text-gray-400"
                     whileHover={{ x: 5 }}
                     transition={{ duration: 0.2 }}
                   >
                     <motion.div 
                       className="w-1 h-1 bg-gray-400 rounded-full mr-2"
                       whileHover={{ scale: 1.5 }}
                     />
                     {item}
                   </motion.div>
                 ))}
               </div>
             </motion.div>
           ))}
         </div>
       </motion.section>

       {/* Enhanced Risk Metrics and Account Allocation */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         {/* Enhanced Risk Metrics */}
         <motion.section
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.7 }}
         >
           <h3 className="text-lg font-bold mb-4 flex items-center">
             <Shield className="w-5 h-5 mr-2 text-blue-400" />
             Risk & Concentration Analysis
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <motion.div 
               className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
               whileHover={{ scale: 1.05 }}
             >
               <h4 className="text-sm text-gray-400 mb-2">Top 10 Concentration</h4>
               <div className="flex items-end justify-between">
                 <span className="text-2xl font-bold">
                   {((netWorthSummary?.concentration_metrics?.top_10_concentration || 0) * 100).toFixed(1)}%
                 </span>
               </div>
               <div className="w-full bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                 <motion.div
                   className={`h-full ${
                     netWorthSummary?.concentration_metrics?.top_10_concentration < 0.5 
                       ? 'bg-green-500' 
                       : netWorthSummary?.concentration_metrics?.top_10_concentration < 0.7 
                       ? 'bg-yellow-500' 
                       : 'bg-red-500'
                   }`}
                   initial={{ width: 0 }}
                   animate={{ width: `${(netWorthSummary?.concentration_metrics?.top_10_concentration || 0) * 100}%` }}
                   transition={{ duration: 1 }}
                 />
               </div>
             </motion.div>
             
             <motion.div 
               className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
               whileHover={{ scale: 1.05 }}
             >
               <h4 className="text-sm text-gray-400 mb-2">Largest Position</h4>
               <span className="text-2xl font-bold text-orange-400">
                 {((netWorthSummary?.concentration_metrics?.largest_position_weight || 0) * 100).toFixed(1)}%
               </span>
               <p className="text-xs text-gray-500 mt-1">of total portfolio</p>
             </motion.div>
             
             <motion.div 
               className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
               whileHover={{ scale: 1.05 }}
             >
               <h4 className="text-sm text-gray-400 mb-2">Risk Score</h4>
               <span className="text-2xl font-bold text-purple-400">
                 {(netWorthSummary?.risk_metrics?.portfolio_beta || 1).toFixed(2)}β
               </span>
               <p className="text-xs text-gray-500 mt-1">Portfolio beta</p>
             </motion.div>
           </div>
         </motion.section>

         {/* Enhanced Account Allocation */}
         <motion.section
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.7 }}
         >
           <h3 className="text-lg font-bold mb-4 flex items-center">
             <Briefcase className="w-5 h-5 mr-2 text-green-400" />
             Account & Institution Distribution
           </h3>
           
           <motion.div 
             className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
             whileHover={{ scale: 1.001 }}
           >
             <div className="space-y-3 max-h-48 overflow-y-auto">
               {netWorthSummary?.account_diversification?.length > 0 ? (
                 netWorthSummary.account_diversification.slice(0, 5).map((account, index) => (
                   <motion.div 
                     key={account.account_name}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.1 + index * 0.05 }}
                     whileHover={{ x: 5 }}
                     className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all duration-200 cursor-pointer"
                   >
                     <div className="flex items-center space-x-3">
                       <motion.div 
                         className="bg-green-500/10 p-2 rounded-lg"
                         whileHover={{ rotate: 360 }}
                         transition={{ duration: 0.5 }}
                       >
                         <Building2 className="w-4 h-4 text-green-400" />
                       </motion.div>
                       <div>
                         <p className="text-sm font-medium">{account.account_name}</p>
                         <p className="text-xs text-gray-400">
                           {account.institution} • {account.account_type}
                         </p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-medium">
                         {(account.percentage * 100).toFixed(1)}%
                       </p>
                       <p className="text-xs text-gray-400">
                         {showValues ? formatCurrency(account.value) : '••••'}
                       </p>
                     </div>
                   </motion.div>
                 ))
               ) : (
                 <p className="text-gray-400 text-sm text-center py-4">No account data available</p>
               )}
               
               {/* Institution Breakdown */}
               {netWorthSummary?.institution_allocation?.length > 0 && (
                 <>
                   <div className="border-t border-gray-700 my-3"></div>
                   <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">By Institution</p>
                   {netWorthSummary.institution_allocation.slice(0, 3).map((inst, index) => (
                     <motion.div
                       key={inst.institution}
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       transition={{ delay: 0.3 + index * 0.05 }}
                       className="flex items-center justify-between py-2"
                     >
                       <div className="flex items-center space-x-2">
                         <div 
                           className="w-3 h-3 rounded-full"
                           style={{ backgroundColor: inst.primary_color }}
                         />
                         <span className="text-sm">{inst.institution}</span>
                       </div>
                       <span className="text-sm text-gray-400">
                         {(inst.percentage * 100).toFixed(1)}%
                       </span>
                     </motion.div>
                   ))}
                 </>
               )}
             </div>
           </motion.div>
         </motion.section>
       </div>

       {/* Enhanced Dividend & Tax Section */}
       <motion.section 
         className="mb-8"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.8 }}
       >
         <h3 className="text-lg font-bold mb-4 flex items-center">
           <Calculator className="w-5 h-5 mr-2 text-yellow-400" />
           Income & Tax Efficiency
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Annual Income */}
           <motion.div 
             className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
             whileHover={{ scale: 1.05 }}
           >
             <div className="flex items-center justify-between mb-2">
               <Trophy className="w-5 h-5 text-yellow-400" />
               <span className="text-xs text-green-400">Annual</span>
             </div>
             <h4 className="text-sm text-gray-400 mb-1">Total Income</h4>
             <p className="text-xl font-bold">
               {showValues ? formatCurrency(netWorthSummary?.dividend_metrics?.total_annual_income || 0) : '••••'}
             </p>
             <p className="text-xs text-gray-500 mt-1">
               {formatPercentage(netWorthSummary?.dividend_metrics?.dividend_yield || 0)} yield
             </p>
           </motion.div>
           
           {/* Quarterly Income */}
           <motion.div 
             className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
             whileHover={{ scale: 1.05 }}
           >
             <div className="flex items-center justify-between mb-2">
               <Clock className="w-5 h-5 text-blue-400" />
               <span className="text-xs text-blue-400">Quarterly</span>
             </div>
             <h4 className="text-sm text-gray-400 mb-1">Est. Income</h4>
             <p className="text-xl font-bold">
               {showValues ? formatCurrency(netWorthSummary?.dividend_metrics?.quarterly_income || 0) : '••••'}
             </p>
             <p className="text-xs text-gray-500 mt-1">
               {netWorthSummary?.dividend_metrics?.dividend_count || 0} income sources
             </p>
           </motion.div>
           
           {/* Tax Deferred */}
           <motion.div 
             className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
             whileHover={{ scale: 1.05 }}
           >
             <div className="flex items-center justify-between mb-2">
               <Shield className="w-5 h-5 text-green-400" />
               <span className="text-xs text-green-400">Protected</span>
             </div>
             <h4 className="text-sm text-gray-400 mb-1">Tax Deferred</h4>
             <p className="text-xl font-bold">
               {showValues ? formatCurrency(netWorthSummary?.tax_efficiency_metrics?.tax_deferred_value || 0) : '••••'}
             </p>
             <p className="text-xs text-gray-500 mt-1">
               {netWorthSummary?.total_assets > 0 
                 ? `${((netWorthSummary?.tax_efficiency_metrics?.tax_deferred_value || 0) / netWorthSummary.total_assets * 100).toFixed(1)}% of assets`
                 : '0% of assets'}
             </p>
           </motion.div>
           
           {/* Taxable Gains */}
           <motion.div 
             className="bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-xl"
             whileHover={{ scale: 1.05 }}
           >
             <div className="flex items-center justify-between mb-2">
               <AlertTriangle className="w-5 h-5 text-orange-400" />
               <span className="text-xs text-orange-400">Taxable</span>
             </div>
             <h4 className="text-sm text-gray-400 mb-1">Unrealized Gains</h4>
             <p className="text-xl font-bold">
               {showValues ? formatCurrency(netWorthSummary?.tax_efficiency_metrics?.unrealized_gains_taxable || 0) : '••••'}
             </p>
             <p className="text-xs text-gray-500 mt-1">
               In taxable accounts
             </p>
           </motion.div>
         </div>
       </motion.section>

       {/* Enhanced Quick Actions */}
       <motion.section 
         className="grid grid-cols-1 md:grid-cols-3 gap-4"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.9 }}
       >
         {[
           {
             href: "/accounts",
             title: "Accounts",
             description: "Manage investment accounts",
             icon: <Briefcase className="w-5 h-5" />,
             color: 'text-purple-400',
             bgColor: 'bg-purple-500/10',
             hoverBg: 'hover:bg-purple-500/20',
             stats: `${netWorthSummary?.active_account_count || 0} active accounts`,
             trend: netWorthSummary?.account_diversification?.length > 3 ? 'Well diversified' : 'Add more accounts'
           },
           {
             href: "/analytics",
             title: "Analytics",
             description: "Deep portfolio analysis",
             icon: <BarChart4 className="w-5 h-5" />,
             color: 'text-blue-400',
             bgColor: 'bg-blue-500/10',
             hoverBg: 'hover:bg-blue-500/20',
             stats: 'Advanced insights',
             trend: 'View detailed metrics'
           },
           {
             href: "/settings",
             title: "Settings",
             description: "Configure preferences",
             icon: <Gauge className="w-5 h-5" />,
             color: 'text-green-400',
             bgColor: 'bg-green-500/10',
             hoverBg: 'hover:bg-green-500/20',
             stats: 'Customize experience',
             trend: 'Manage connections'
           }
         ].map((action, index) => (
           <Link key={action.href} href={action.href}>
             <motion.div 
               whileHover={{ scale: 1.02, y: -5 }}
               whileTap={{ scale: 0.98 }}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 + index * 0.1 }}
               className={`${action.bgColor} border border-gray-800 rounded-xl p-6 ${action.hoverBg} transition-all duration-300 cursor-pointer group shadow-xl hover:shadow-2xl`}
             >
               <div className="flex items-start justify-between mb-3">
                 <motion.div 
                   className={action.color}
                   whileHover={{ rotate: 360 }}
                   transition={{ duration: 0.5 }}
                 >
                   {action.icon}
                 </motion.div>
                 <motion.div
                   initial={{ x: 0 }}
                   whileHover={{ x: 5 }}
                   transition={{ duration: 0.2 }}
                 >
                   <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                 </motion.div>
               </div>
               <h4 className="font-medium mb-1">{action.title}</h4>
               <p className="text-sm text-gray-400 mb-3">{action.description}</p>
               <div className="flex justify-between items-center">
                 <p className="text-xs text-gray-500">{action.stats}</p>
                 <p className="text-xs text-gray-600">{action.trend}</p>
               </div>
             </motion.div>
           </Link>
         ))}
       </motion.section>
     </div>
   </div>
 );
}