// pages/portfolio.js
import React, { useState, useEffect } from 'react';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';
import AccountTable from '@/components/tables/UnifiedAccountTable';
import KpiCard from '@/components/ui/KpiCard';
import UpdateMarketDataButton from '@/components/UpdateMarketDataButton'; 
import AddSecurityButton from '@/components/AddSecurityButton';
import UpdateOtherDataButton from '@/components/UpdateOtherDataButton';
import { fetchUnifiedPositions } from '@/utils/apimethods/positionMethods';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { 
  DollarSign, BarChart4, Users, TrendingUp, TrendingDown, 
  Percent, Coins, Banknote, LineChart, Package, Home, Building2, BarChart3
} from 'lucide-react';
// Import the chart components
import { 
  InstitutionDiversityChart,
  SectorDiversityChart
} from '@/components/charts/DiversificationCharts';

export default function PortfolioPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [assetClassData, setAssetClassData] = useState({});
  const [allPositions, setAllPositions] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [institutionMixData, setInstitutionMixData] = useState([]);
  const [topPositionsData, setTopPositionsData] = useState([]);

  useEffect(() => {
    const loadSummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);
      try {
        // Fetch all positions using the unified API method
        const positions = await fetchUnifiedPositions();
        console.log("Portfolio: Fetched unified positions:", positions.length);
        setAllPositions(positions);
        
        // Fetch all accounts
        const accounts = await fetchAllAccounts();
        console.log("Portfolio: Fetched accounts:", accounts.length);
        setAllAccounts(accounts);
        
        // Calculate summary metrics
        const calculatedSummary = calculatePortfolioSummary(positions, accounts);
        setSummaryData(calculatedSummary);
        
        // Calculate asset class metrics
        const assetClasses = calculateAssetClassMetrics(positions, calculatedSummary.total_value, calculatedSummary.total_cost_basis);
        setAssetClassData(assetClasses);
        
        // Calculate institution mix data for Top Institutions card
        const institutionMix = calculateInstitutionMix(accounts);
        setInstitutionMixData(institutionMix);
        
        // Calculate top positions data for Top Positions card
        const topPositions = calculateTopPositions(positions, calculatedSummary.total_value);
        setTopPositionsData(topPositions);
        
      } catch (error) {
        console.error("Error loading summary data:", error);
        setSummaryError(error.message || "Failed to load summary");
      } finally {
        setIsSummaryLoading(false);
      }
    };
    loadSummary();
  }, []);

  // Calculate summary metrics from unified positions and accounts
  const calculatePortfolioSummary = (positions, accounts) => {
    // Initialize summary object with default values
    const summary = {
      total_value: 0,
      total_cost_basis: 0,
      total_gain_loss: 0,
      total_gain_loss_percent: 0,
      total_positions: positions.length,
      total_accounts: accounts.length,
      unique_securities: new Set(),
    };
    
    // Calculate totals from positions
    positions.forEach(position => {
      // Safely parse numeric values
      const currentValue = parseFloat(position.current_value || 0);
      const costBasis = parseFloat(position.total_cost_basis || 0);
      
      // Accumulate totals
      summary.total_value += currentValue;
      summary.total_cost_basis += costBasis;
      summary.total_gain_loss += (currentValue - costBasis);
      
      // Track unique securities/assets (by composite key for accurate counting)
      const assetKey = `${position.asset_type}:${position.identifier}`;
      summary.unique_securities.add(assetKey);
    });
    
    // Calculate gain/loss percent
    summary.total_gain_loss_percent = summary.total_cost_basis > 0 
      ? (summary.total_gain_loss / summary.total_cost_basis) 
      : 0;
      
    // Convert Set to count for unique securities
    summary.unique_securities_count = summary.unique_securities.size;
    delete summary.unique_securities; // Remove the Set object
    
    return summary;
  };
  
  // Calculate institution mix data for Top 5 Institutions card
  const calculateInstitutionMix = (accounts) => {
    if (!accounts || !accounts.length) return [];
    
    // Group by institution
    const institutionMap = accounts.reduce((acc, account) => {
      const institution = account.institution || 'Other';
      const value = parseFloat(account.total_value || account.balance || 0);
      
      if (!acc[institution]) {
        acc[institution] = {
          name: institution,
          value: 0,
          color: getInstitutionColor(institution)
        };
      }
      
      acc[institution].value += value;
      return acc;
    }, {});
    
    // Convert to array and sort by value
    let result = Object.values(institutionMap).sort((a, b) => b.value - a.value);
    
    // Calculate total value
    const totalValue = result.reduce((sum, item) => sum + item.value, 0);
    
    // Calculate percentages and limit to top 5 + Other
    if (result.length > 5) {
      const top5 = result.slice(0, 5);
      const others = result.slice(5);
      
      const otherValue = others.reduce((sum, item) => sum + item.value, 0);
      const otherItem = {
        name: 'Other',
        value: otherValue,
        color: '#6B7280', // Gray color for Other
        percentage: totalValue > 0 ? otherValue / totalValue : 0
      };
      
      result = [...top5, otherItem];
    }
    
    // Add percentage to each item
    result = result.map(item => ({
      ...item,
      percentage: totalValue > 0 ? item.value / totalValue : 0
    }));
    
    return result;
  };
  
  // Get institution color
  function getInstitutionColor(name) {
    const colorMap = {
      'Vanguard': '#C94227',
      'Fidelity': '#569A38',
      'Charles Schwab': '#027BC7',
      'Robinhood': '#00C805',
      'TD Ameritrade': '#4F5B65',
      'Chase': '#117ACA',
      'Bank of America': '#E11B3C', 
      'Wells Fargo': '#D71E28',
      'E*TRADE': '#6633CC',
      'Interactive Brokers': '#F79125',
      'Coinbase': '#0052FF',
      'Merrill Lynch': '#0073CF',
      'Morgan Stanley': '#0073CF',
      'Betterment': '#0A9ACF',
      'Wealthfront': '#3ECBBC',
      'Citibank': '#057CC0',
      'SoFi': '#A7A8AA',
    };
    
    return colorMap[name] || getRandomColor(name);
  }
  
  // Calculate top positions data for Top 5 Positions card
  const calculateTopPositions = (positions, totalPortfolioValue) => {
    if (!positions || !positions.length) return [];
    
    // Group by asset identifier (e.g., ticker)
    const positionMap = positions.reduce((acc, position) => {
      // Create a composite key for the position
      const identifier = position.identifier || position.ticker || position.coin_symbol || 'Unknown';
      const name = position.name || identifier;
      const value = parseFloat(position.current_value || 0);
      const assetType = position.asset_type || 'unknown';
      
      // Skip positions with no value
      if (value <= 0) return acc;
      
      const key = `${assetType}:${identifier}`;
      
      if (!acc[key]) {
        acc[key] = {
          key,
          identifier,
          name,
          assetType,
          value: 0,
          color: getPositionColor(assetType, identifier)
        };
      }
      
      acc[key].value += value;
      return acc;
    }, {});
    
    // Convert to array and sort by value
    let result = Object.values(positionMap).sort((a, b) => b.value - a.value);
    
    // Calculate total value for percentage calculation
    const totalValue = result.reduce((sum, item) => sum + item.value, 0);
    
    // Limit to top 5 + Other
    if (result.length > 5) {
      const top5 = result.slice(0, 5);
      const others = result.slice(5);
      
      const otherValue = others.reduce((sum, item) => sum + item.value, 0);
      const otherItem = {
        key: 'other',
        identifier: 'Other',
        name: 'Other',
        assetType: 'other',
        value: otherValue,
        color: '#6B7280', // Gray color for Other
        percentage: totalPortfolioValue > 0 ? otherValue / totalPortfolioValue : 0
      };
      
      result = [...top5, otherItem];
    }
    
    // Add percentage to each item
    result = result.map(item => ({
      ...item,
      percentage: totalPortfolioValue > 0 ? item.value / totalPortfolioValue : 0
    }));
    
    return result;
  };
  
  // Get position color
  function getPositionColor(assetType, identifier) {
    // Different color palettes based on asset type
    if (assetType === 'security') {
      // Blue palette for securities
      return getRandomColor(identifier, { hue: 220, saturation: 70, lightness: 55 });
    } else if (assetType === 'crypto') {
      // Purple palette for crypto
      return getRandomColor(identifier, { hue: 270, saturation: 70, lightness: 50 });
    } else if (assetType === 'metal') {
      // Gold/amber palette for metals
      return getRandomColor(identifier, { hue: 45, saturation: 80, lightness: 55 });
    } else if (assetType === 'realestate') {
      // Teal palette for real estate
      return getRandomColor(identifier, { hue: 180, saturation: 70, lightness: 45 });
    } else {
      // Default color generation
      return getRandomColor(identifier);
    }
  }
  
  // Generate a consistent color from a string with optional color parameters
  function getRandomColor(str, opts = {}) {
    const { hue, saturation = 70, lightness = 50 } = opts;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Use provided hue or generate from hash
    const h = hue !== undefined ? hue : Math.abs(hash) % 360;
    return `hsl(${h}, ${saturation}%, ${lightness}%)`;
  }
  const calculateAssetClassMetrics = (positions, totalPortfolioValue, totalCostBasis) => {
    // Initialize asset class categories
    const assetClasses = {
      security: { 
        value: 0, 
        name: 'Securities', 
        icon: <LineChart />, 
        color: 'blue',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0
      },
      cash: { 
        value: 0, 
        name: 'Cash', 
        icon: <Banknote />, 
        color: 'green',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0 
      },
      crypto: { 
        value: 0, 
        name: 'Crypto', 
        icon: <Coins />, 
        color: 'purple',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0
      },
      metal: { 
        value: 0, 
        name: 'Metals', 
        icon: <Package />, 
        color: 'amber',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0
      },
      realestate: {
        value: 0,
        name: 'Real Estate',
        icon: <Home />,
        color: 'teal',
        cost_basis: 0,
        gain_loss: 0,
        gain_loss_percent: 0,
        properties_count: 0,
        mortgage_value: 0,
        net_equity: 0
      }
    };
    
    // Calculate value and cost basis for each asset class
    positions.forEach(position => {
      const assetType = position.asset_type || 'unknown';
      const value = parseFloat(position.current_value || 0);
      const costBasis = parseFloat(position.total_cost_basis || 0);
      
      if (assetClasses[assetType]) {
        assetClasses[assetType].value += value;
        assetClasses[assetType].cost_basis += costBasis;
        assetClasses[assetType].gain_loss += (value - costBasis);
      }
    });
    
    // Calculate percentages and gain/loss for each asset class
    Object.keys(assetClasses).forEach(key => {
      const assetClass = assetClasses[key];
      
      // Calculate percentage of total portfolio value
      assetClass.percentage = totalPortfolioValue > 0 
        ? (assetClass.value / totalPortfolioValue) 
        : 0;
      
      // Calculate percentage of total cost basis
      assetClass.cost_basis_percentage = totalCostBasis > 0
        ? (assetClass.cost_basis / totalCostBasis)
        : 0;
        
      // Calculate gain/loss percentage
      assetClass.gain_loss_percent = assetClass.cost_basis > 0
        ? (assetClass.gain_loss / assetClass.cost_basis)
        : 0;
    });
    
    return assetClasses;
  };

  // Determine overall gain/loss icon and color
  const gainLossValue = summaryData?.total_gain_loss ?? 0;
  const gainLossPercentValue = summaryData?.total_gain_loss_percent ?? 0;
  const GainLossIcon = gainLossValue >= 0 ? TrendingUp : TrendingDown;
  const gainLossColor = gainLossValue >= 0 ? 'green' : 'red';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <header className="mb-8">
           <h1 className="text-3xl font-bold">NestEgg Portfolio</h1>
           <p className="text-gray-400 mt-2">Consolidated view of your investment portfolio across all asset classes.</p>
        </header>
        
        <section className="mb-10">
          <div className="flex space-x-4">
            <UpdateMarketDataButton className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg" />
            <AddSecurityButton className="bg-green-600 hover:bg-green-700 text-white rounded-lg" />
            <UpdateOtherDataButton className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg" />
          </div>
        </section>

        {/* KPI Section */}
        <section className="mb-10">
           <h2 className="text-xl font-semibold mb-4 text-gray-300">Portfolio Summary</h2>
            {summaryError && (
                 <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200">
                    Error loading summary: {summaryError}
                 </div>
             )}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             <KpiCard
                title="Total Value"
                value={summaryData?.total_value}
                icon={<DollarSign />}
                isLoading={isSummaryLoading}
                format={(v) => formatCurrency(v)}
                color="blue"
             />
             <KpiCard
                 title="Cost Basis"
                 value={summaryData?.total_cost_basis}
                 icon={<DollarSign />}
                 isLoading={isSummaryLoading}
                 format={(v) => formatCurrency(v)}
                 color="purple"
             />
             <KpiCard
                title="Total Gain/Loss"
                value={gainLossValue}
                icon={<GainLossIcon />}
                isLoading={isSummaryLoading}
                format={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
                color={gainLossColor}
             />
             <KpiCard
                title="Total Gain/Loss %"
                value={gainLossPercentValue}
                icon={<Percent />}
                isLoading={isSummaryLoading}
                format={(v) => `${v >= 0 ? '+' : ''}${formatPercentage(v, {maximumFractionDigits: 2})}`}
                color={gainLossColor}
             />
              <KpiCard
                title="Unique Assets"
                value={summaryData?.unique_securities_count}
                icon={<BarChart4 />}
                isLoading={isSummaryLoading}
                format={(v) => v?.toLocaleString() ?? '0'}
                color="amber"
             />
              <KpiCard
                title="Total Accounts"
                value={summaryData?.total_accounts}
                icon={<Users />}
                isLoading={isSummaryLoading}
                format={(v) => v?.toLocaleString() ?? '0'}
                color="indigo"
             />
           </div>
        </section>
        
        {/* Asset Class Allocation KPIs - ENHANCED with Cost Basis Data */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Asset Class Allocation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* First Row: 4 Asset Cards */}
            {/* Securities */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-2">
                <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                  <LineChart className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold">Securities</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-400">Market Value</p>
                  <p className="text-xl font-bold">{formatCurrency(assetClassData.security?.value)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.security?.percentage || 0)} of portfolio</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cost Basis</p>
                  <p className="text-lg font-semibold">{formatCurrency(assetClassData.security?.cost_basis)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.security?.cost_basis_percentage || 0)} of total cost</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Performance</p>
                  <p className={`text-lg font-semibold ${assetClassData.security?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {assetClassData.security?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.security?.gain_loss)}
                    <span className="text-sm ml-1">
                      ({assetClassData.security?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.security?.gain_loss_percent * 100)})
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Cash */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-green-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-2">
                <div className="bg-green-500/20 p-2 rounded-lg mr-3">
                  <Banknote className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold">Cash</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-400">Market Value</p>
                  <p className="text-xl font-bold">{formatCurrency(assetClassData.cash?.value)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.cash?.percentage || 0)} of portfolio</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cost Basis</p>
                  <p className="text-lg font-semibold">{formatCurrency(assetClassData.cash?.cost_basis)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.cash?.cost_basis_percentage || 0)} of total cost</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Performance</p>
                  <p className="text-lg font-semibold text-gray-400">
                    N/A
                  </p>
                </div>
              </div>
            </div>
            
            {/* Crypto */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-2">
                <div className="bg-purple-500/20 p-2 rounded-lg mr-3">
                  <Coins className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold">Crypto</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-400">Market Value</p>
                  <p className="text-xl font-bold">{formatCurrency(assetClassData.crypto?.value)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.crypto?.percentage || 0)} of portfolio</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cost Basis</p>
                  <p className="text-lg font-semibold">{formatCurrency(assetClassData.crypto?.cost_basis)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.crypto?.cost_basis_percentage || 0)} of total cost</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Performance</p>
                  <p className={`text-lg font-semibold ${assetClassData.crypto?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {assetClassData.crypto?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.crypto?.gain_loss)}
                    <span className="text-sm ml-1">
                      ({assetClassData.crypto?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.crypto?.gain_loss_percent * 100)})
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Metals */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-2">
                <div className="bg-amber-500/20 p-2 rounded-lg mr-3">
                  <Package className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold">Metals</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-400">Market Value</p>
                  <p className="text-xl font-bold">{formatCurrency(assetClassData.metal?.value)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.metal?.percentage || 0)} of portfolio</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cost Basis</p>
                  <p className="text-lg font-semibold">{formatCurrency(assetClassData.metal?.cost_basis)}</p>
                  <p className="text-xs text-gray-500">{formatPercentage(assetClassData.metal?.cost_basis_percentage || 0)} of total cost</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Performance</p>
                  <p className={`text-lg font-semibold ${assetClassData.metal?.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {assetClassData.metal?.gain_loss >= 0 ? '+' : ''}{formatCurrency(assetClassData.metal?.gain_loss)}
                    <span className="text-sm ml-1">
                      ({assetClassData.metal?.gain_loss >= 0 ? '+' : ''}{formatPercentage(assetClassData.metal?.gain_loss_percent * 100)})
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Second Row: Real Estate (2-wide) + Top Institutions + Top Positions */}
            {/* Real Estate - Double Width Card */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden md:col-span-2">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-teal-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-2">
                <div className="bg-teal-500/20 p-2 rounded-lg mr-3">
                  <Home className="h-5 w-5 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold">Real Estate</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column - Same as other asset cards */}
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Market Value</p>
                    <p className="text-xl font-bold">{formatCurrency(assetClassData.realestate?.value || 0)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.realestate?.percentage || 0)} of portfolio</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cost Basis</p>
                    <p className="text-lg font-semibold">{formatCurrency(assetClassData.realestate?.cost_basis || 0)}</p>
                    <p className="text-xs text-gray-500">{formatPercentage(assetClassData.realestate?.cost_basis_percentage || 0)} of total cost</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Performance</p>
                    <p className={`text-lg font-semibold ${(assetClassData.realestate?.gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(assetClassData.realestate?.gain_loss || 0) >= 0 ? '+' : ''}{formatCurrency(assetClassData.realestate?.gain_loss || 0)}
                      <span className="text-sm ml-1">
                        ({(assetClassData.realestate?.gain_loss || 0) >= 0 ? '+' : ''}{formatPercentage((assetClassData.realestate?.gain_loss_percent || 0) * 100)})
                      </span>
                    </p>
                  </div>
                </div>
                
                {/* Right Column - Real Estate Specific */}
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-400">Properties</p>
                    <p className="text-xl font-bold">{assetClassData.realestate?.properties_count || 0}</p>
                    <p className="text-xs text-gray-500">Total owned properties</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Mortgage Balance</p>
                    <p className="text-lg font-semibold">{formatCurrency(assetClassData.realestate?.mortgage_value || 0)}</p>
                    <p className="text-xs text-gray-500">Total outstanding mortgages</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Net Equity</p>
                    <p className="text-lg font-semibold text-teal-400">
                      {formatCurrency(assetClassData.realestate?.net_equity || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPercentage((assetClassData.realestate?.net_equity || 0) / (assetClassData.realestate?.value || 1))} equity ratio
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top 5 Institutions Card */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg mr-3">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold">Top Institutions</h3>
              </div>
              
              <div className="space-y-3">
                {institutionMixData && institutionMixData.length > 0 ? (
                  institutionMixData.map((institution, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: institution.color }}
                        ></div>
                        <span className="text-sm text-gray-300">{institution.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium">{formatPercentage(institution.percentage)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-400">No institution data available</div>
                )}
              </div>
              
              <div className="mt-3 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500 text-center">
                  Based on {institutionMixData?.length || 0} financial institutions
                </div>
              </div>
            </div>
            
            {/* Top 5 Positions Card */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-rose-500/10 -mr-10 -mt-10"></div>
              <div className="flex items-center mb-3">
                <div className="bg-rose-500/20 p-2 rounded-lg mr-3">
                  <BarChart3 className="h-5 w-5 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold">Top Positions</h3>
              </div>
              
              <div className="space-y-3">
                {topPositionsData && topPositionsData.length > 0 ? (
                  topPositionsData.map((position, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: position.color }}
                        ></div>
                        <span className="text-sm text-gray-300">{position.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm font-medium">{formatPercentage(position.percentage)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-400">No position data available</div>
                )}
              </div>
              
              <div className="mt-3 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500 text-center">
                  Showing top {(topPositionsData?.length || 1) - 1} positions by market value
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Diversification Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Portfolio Diversification</h2>
          
          {isSummaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 h-[300px] animate-pulse flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Financial Institution Diversity Chart */}
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-white">Institution Exposure</h3>
                <div className="h-[350px]">
                  {/* Replace with actual institution diversity chart */}
                  <InstitutionDiversityChart accounts={allAccounts} />
                </div>
              </div>
              
              {/* Industry/Sector Diversity Chart */}
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-white">Sector Exposure (Securities)</h3>
                <div className="h-[350px]">
                  {/* Replace with actual sector diversity chart */}
                  <SectorDiversityChart positions={allPositions} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Account Table Section - Using new UnifiedAccountTable */}
        <section className="mb-12">
            <AccountTable title="Accounts Summary" />
        </section>

        {/* Unified Positions Table - Using new UnifiedGroupedPositionsTable */}
        <section className="mb-12">
             <UnifiedGroupedPositionsTable title="Consolidated Portfolio" />
        </section>        
      </div>
    </div>
  );
}