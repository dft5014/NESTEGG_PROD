// pages/test123.js
import React, { useState, useEffect } from 'react';
import TestSecurityTableAccount from '@/components/tables/TestSecurityTableAccount';
import TestCryptoTable from '@/components/tables/TestCryptoTable';
import TestMetalsTable from '@/components/tables/TestMetalsTable';
import TestRealEstateTable from '@/components/tables/TestRealEstateTable';
import KpiCard from '@/components/ui/KpiCard'; // Import the KPI Card
import { fetchPortfolioSummary } from '@/utils/apimethods/testPositionMethods'; // Import summary fetch
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { DollarSign, BarChart4, Users, TrendingUp, TrendingDown, Percent } from 'lucide-react'; // Import icons

export default function Test123Page() {
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
           <h1 className="text-3xl font-bold">Positions Table Test Page</h1>
           <p className="text-gray-400 mt-2">Isolated components for testing position tables.</p>
        </header>

        {/* --- KPI Section --- */}
        <section className="mb-10">
           <h2 className="text-xl font-semibold mb-4 text-gray-300">Overall Summary</h2>
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
             {/* <KpiCard
                title="Cost Basis" // Optional: Show cost basis if desired
                value={summaryData?.total_cost_basis}
                icon={<DollarSign />}
                isLoading={isSummaryLoading}
                format={(v) => formatCurrency(v)}
                color="purple"
             /> */}
             <KpiCard
                title="Total Gain/Loss"
                value={gainLossValue}
                icon={<GainLossIcon />} // Dynamic icon
                isLoading={isSummaryLoading}
                format={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
                color={gainLossColor} // Dynamic color
             />
             <KpiCard
                title="Total Gain/Loss %"
                value={gainLossPercentValue}
                icon={<Percent />}
                isLoading={isSummaryLoading}
                // Assuming formatPercentage expects decimal (e.g., 0.25 for 25%)
                format={(v) => `${v >= 0 ? '+' : ''}${formatPercentage(v / 100, {maximumFractionDigits: 2})}`}
                color={gainLossColor} // Dynamic color
             />
              <KpiCard
                title="Total Positions"
                value={summaryData?.total_positions}
                icon={<BarChart4 />}
                isLoading={isSummaryLoading}
                format={(v) => v?.toLocaleString() ?? '0'} // Format as plain number
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
             {/* Add more KPIs if available/needed */}
           </div>
        </section>
        {/* --- End KPI Section --- */}

        {/* Wrap each table in a section for better structure */}
        <section className="mb-12"> <TestSecurityTableAccount /> </section>
        <section className="mb-12"> <TestCryptoTable /> </section>
        <section className="mb-12"> <TestMetalsTable /> </section>
        <section> <TestRealEstateTable /> </section>

      </div>
    </div>
  );
}