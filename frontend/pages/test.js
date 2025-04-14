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
  Percent, Coins, Banknote, LineChart, Package 
} from 'lucide-react';
// Import the chart components
import { 
  AssetTypeChart, 
  TopHoldingsChart, 
  AccountValuesChart, 
  GainLossAreaChart 
} from '@/components/charts/PortfolioCharts';

export default function PortfolioPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [assetClassData, setAssetClassData] = useState({});
  const [allPositions, setAllPositions] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

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
        const assetClasses = calculateAssetClassMetrics(positions, calculatedSummary.total_value);
        setAssetClassData(assetClasses);
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
  
  // Calculate metrics for each asset class
  const calculateAssetClassMetrics = (positions, totalPortfolioValue) => {
    // Initialize asset class categories
    const assetClasses = {
      security: { value: 0, name: 'Securities', icon: <LineChart />, color: 'blue' },
      cash: { value: 0, name: 'Cash', icon: <Banknote />, color: 'green' },
      crypto: { value: 0, name: 'Crypto', icon: <Coins />, color: 'purple' },
      metal: { value: 0, name: 'Metals', icon: <Package />, color: 'amber' }
    };
    
    // Calculate value for each asset class
    positions.forEach(position => {
      const assetType = position.asset_type || 'unknown';
      const value = parseFloat(position.current_value || 0);
      
      if (assetClasses[assetType]) {
        assetClasses[assetType].value += value;
      }
    });
    
    // Calculate percentage for each asset class
    Object.keys(assetClasses).forEach(key => {
      assetClasses[key].percentage = totalPortfolioValue > 0 
        ? (assetClasses[key].value / totalPortfolioValue) 
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
        
        {/* Asset Class Allocation KPIs */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Asset Class Allocation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Securities */}
            <KpiCard
              title="Securities"
              value={assetClassData.security?.value}
              icon={<LineChart />}
              isLoading={isSummaryLoading}
              format={(v) => formatCurrency(v)}
              color="blue"
            >
              {formatPercentage(assetClassData.security?.percentage || 0)} of portfolio
            </KpiCard>
            
            {/* Cash */}
            <KpiCard
              title="Cash"
              value={assetClassData.cash?.value}
              icon={<Banknote />}
              isLoading={isSummaryLoading}
              format={(v) => formatCurrency(v)}
              color="green"
            >
              {formatPercentage(assetClassData.cash?.percentage || 0)} of portfolio
            </KpiCard>
            
            {/* Crypto */}
            <KpiCard
              title="Crypto"
              value={assetClassData.crypto?.value}
              icon={<Coins />}
              isLoading={isSummaryLoading}
              format={(v) => formatCurrency(v)}
              color="purple"
            >
              {formatPercentage(assetClassData.crypto?.percentage || 0)} of portfolio
            </KpiCard>
            
            {/* Metals */}
            <KpiCard
              title="Metals"
              value={assetClassData.metal?.value}
              icon={<Package />}
              isLoading={isSummaryLoading}
              format={(v) => formatCurrency(v)}
              color="amber"
            >
              {formatPercentage(assetClassData.metal?.percentage || 0)} of portfolio
            </KpiCard>
          </div>
        </section>
        
        {/* Charts Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Portfolio Analysis</h2>
          
          {isSummaryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 h-[300px] animate-pulse flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Type Donut Chart */}
              <AssetTypeChart positions={allPositions} />
              
              {/* Top Holdings Bar Chart */}
              <TopHoldingsChart positions={allPositions} />
              
              {/* Account Values Bar Chart */}
              <AccountValuesChart accounts={allAccounts} />
              
              {/* Gain/Loss by Asset Type Chart */}
              <GainLossAreaChart positions={allPositions} />
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