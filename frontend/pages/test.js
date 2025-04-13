// pages/portfolio.js
import React, { useState, useEffect } from 'react';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';
import AccountTable from '@/components/tables/UnifiedAccountTable';
import KpiCard from '@/components/ui/KpiCard';
import UpdateMarketDataButton from '@/components/UpdateMarketDataButton'; 
import AddSecurityButton from '@/components/AddSecurityButton';
import UpdateOtherDataButton from '@/components/UpdateOtherDataButton';
import { fetchPortfolioSummary } from '@/utils/apimethods/positionMethods';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { DollarSign, BarChart4, Users, TrendingUp, TrendingDown, Percent } from 'lucide-react';

export default function PortfolioPage() {
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(null);
      try {
        const data = await fetchPortfolioSummary();
        setSummaryData(data);
      } catch (error) {
        console.error("Error loading summary data:", error);
        setSummaryError(error.message || "Failed to load summary");
      } finally {
        setIsSummaryLoading(false);
      }
    };
    loadSummary();
  }, []);

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
                title="Total Positions"
                value={summaryData?.total_positions}
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