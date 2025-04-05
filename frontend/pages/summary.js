// pages/summary.js (or pages/NestEggPage.js)
// - Displays overall portfolio KPIs and includes sections for charts & detailed tables.
// - Uses simplified fake data for the Trend Chart to troubleshoot build errors.

import React, { useState, useEffect } from 'react';
// Original Table/UI Imports
import SecurityTableAccount from '@/components/tables/SecurityTableAccount';
import CryptoTable from '@/components/tables/CryptoTable';
import MetalsTable from '@/components/tables/MetalsTable';
import RealEstateTable from '@/components/tables/RealEstateTable';
import AccountTable from '@/components/tables/AccountTable';
import KpiCard from '@/components/ui/KpiCard';
// Charting Library (Ensure 'recharts' is installed!)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Original API Method Import
import { fetchPortfolioSummary } from '@/utils/apimethods/positionMethods';
// Original Util Imports (Ensure path is correct)
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { DollarSign, BarChart4, Users, TrendingUp, TrendingDown, Percent, PieChart as PieIcon, List } from 'lucide-react';
// Feedback (Ensure 'react-hot-toast' is installed)
import { toast } from 'react-hot-toast';

// --- Placeholder Chart Components ---
// Trend Chart Placeholder (Receives data, isLoading, error props)
const TrendChartPlaceholder = ({ data, isLoading, error }) => {
  if (isLoading) return <div className="p-4 bg-gray-800/50 rounded-lg text-center text-gray-400">Loading Trend Data...</div>;
  if (error) return <div className="p-4 bg-red-900/60 rounded-lg text-center text-red-200">Error loading trend: {error}</div>;
  if (!data || data.length === 0) return <div className="p-4 bg-gray-800/50 rounded-lg text-center text-gray-400">No trend data available.</div>;

   return (
    <div className="h-64 bg-gray-800/50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => formatCurrency(value, 0)} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} itemStyle={{ color: '#E5E7EB' }} formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </div>
  );
};

// Allocation Chart Placeholder (Receives data, isLoading props)
const AllocationChart = ({ data, isLoading }) => {
    if (isLoading || !data || data.length === 0) return <div className="p-4 h-64 bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-400">Loading Allocation...</div>;
    const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];
    return (
        <div className="h-64 bg-gray-800/50 rounded-lg p-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

// Top Positions List Placeholder (Receives data, isLoading props)
const TopPositionsList = ({ data, isLoading }) => {
     if (isLoading || !data || data.length === 0) return <div className="p-4 bg-gray-800/50 rounded-lg text-gray-400">Loading Top Positions...</div>;
     return (
         <div className="bg-gray-800/50 rounded-lg p-4">
             <ul className="space-y-2">
                 {data.slice(0, 5).map((pos) => ( // Show top 5
                     <li key={pos.id || pos.name} className="flex justify-between items-center text-sm">
                         <span>{pos.name}</span>
                         <span className="font-medium">{formatCurrency(pos.value)}</span>
                     </li>
                 ))}
             </ul>
         </div>
     );
};

// --- SIMPLIFIED FAKE DATA FUNCTION ---
// Using hardcoded data to avoid potential build issues with date logic
const generateFakeTrendData = () => {
    return [
        { month: 'Apr 24', value: 110000 }, { month: 'May 24', value: 115000 }, { month: 'Jun 24', value: 112000 },
        { month: 'Jul 24', value: 118000 }, { month: 'Aug 24', value: 120000 }, { month: 'Sep 24', value: 125000 },
        { month: 'Oct 24', value: 123000 }, { month: 'Nov 24', value: 128000 }, { month: 'Dec 24', value: 130000 },
        { month: 'Jan 25', value: 135000 }, { month: 'Feb 25', value: 132000 }, { month: 'Mar 25', value: 138000 },
        { month: 'Apr 25', value: 140000 }, // Current month (April 2025 context)
    ];
};
// --- END FAKE DATA FUNCTION ---


// --- Main Component ---
export default function SummaryPage() { // Or NestEggPage if you renamed file
  // Original State
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // State for Trend Chart (using simplified fake data)
  const [trendData, setTrendData] = useState(() => generateFakeTrendData()); // Lazy init
  const [isTrendLoading, setIsTrendLoading] = useState(false); // Not loading initially
  const [trendError, setTrendError] = useState(null);


  // Original useEffect to load summary data
  useEffect(() => {
    const loadSummary = async () => {
        setIsSummaryLoading(true);
        setSummaryError(null);
        try {
            const data = await fetchPortfolioSummary();
            setSummaryData(data);
        } catch (error) {
            console.error("Error loading summary data:", error);
            const msg = error.message || "Failed to load summary";
            setSummaryError(msg);
            toast.error(`Error loading summary: ${msg}`);
        } finally {
            setIsSummaryLoading(false);
        }
    };
    loadSummary();
  }, []);

  // Original gain/loss calculations
  const gainLossValue = summaryData?.total_gain_loss ?? 0;
  const gainLossPercentValue = summaryData?.total_gain_loss_percent ?? 0;
  const GainLossIcon = gainLossValue >= 0 ? TrendingUp : TrendingDown;
  const gainLossColor = gainLossValue >= 0 ? 'text-green-500' : 'text-red-500';
  const gainLossKpiColor = gainLossValue >= 0 ? 'green' : 'red';

  // Prepare data for other charts (adapt based on actual summaryData)
   const allocationData = summaryData?.allocation || [
        { name: 'Stocks', value: summaryData?.securities_value || 0 },
        { name: 'Crypto', value: summaryData?.crypto_value || 0 },
        { name: 'Metals', value: summaryData?.metals_value || 0 },
        { name: 'Real Estate', value: summaryData?.realestate_value || 0 },
    ].filter(item => item.value > 0);

   const topPositionsData = summaryData?.top_positions || [];


  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        {/* Updated Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">NestEgg</h1>
          <p className="text-lg text-gray-400">Your comprehensive wealth overview and retirement readiness tracker.</p>
        </header>

        {/* Original KPI Section */}
        <section className="mb-10">
           {summaryError && (
               <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200 text-center">
                 Error loading summary data: {summaryError}
               </div>
             )}
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
                <KpiCard title="Total Value" value={summaryData?.total_value} icon={<DollarSign />} isLoading={isSummaryLoading} format={(v) => formatCurrency(v)} color="blue"/>
                <KpiCard title="Cost Basis" value={summaryData?.total_cost_basis} icon={<DollarSign />} isLoading={isSummaryLoading} format={(v) => formatCurrency(v)} color="purple"/>
                <KpiCard title="Total Gain/Loss" value={gainLossValue} icon={<GainLossIcon />} isLoading={isSummaryLoading} format={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`} color={gainLossKpiColor}/>
                <KpiCard title="Total G/L %" value={gainLossPercentValue} icon={<Percent />} isLoading={isSummaryLoading} format={(v) => `${v >= 0 ? '+' : ''}${formatPercentage(v, {maximumFractionDigits: 2})}`} color={gainLossKpiColor}/>
                <KpiCard title="Positions" value={summaryData?.total_positions} icon={<BarChart4 />} isLoading={isSummaryLoading} format={(v) => v?.toLocaleString() ?? '0'} color="amber"/>
                <KpiCard title="Accounts" value={summaryData?.total_accounts} icon={<Users />} isLoading={isSummaryLoading} format={(v) => v?.toLocaleString() ?? '0'} color="indigo"/>
           </div>
        </section>

        {/* Added Charts & Insights Section */}
        <section className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Trend Chart (Using simplified fake data now) */}
             <div className="lg:col-span-2 bg-gray-800/30 p-4 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-300 flex items-center"><TrendingUp className="mr-2 h-5 w-5"/> NestEgg Value Trend (13 Months)</h3>
                <TrendChartPlaceholder data={trendData} isLoading={isTrendLoading} error={trendError}/>
             </div>

            {/* Allocation Chart & Top Positions */}
            <div className="space-y-6">
                <div className="bg-gray-800/30 p-4 rounded-lg shadow-lg">
                   <h3 className="text-lg font-semibold mb-3 text-gray-300 flex items-center"><PieIcon className="mr-2 h-5 w-5"/> Asset Allocation</h3>
                   <AllocationChart data={allocationData} isLoading={isSummaryLoading} />
                </div>
                 <div className="bg-gray-800/30 p-4 rounded-lg shadow-lg">
                     <h3 className="text-lg font-semibold mb-3 text-gray-300 flex items-center"><List className="mr-2 h-5 w-5"/> Top Positions</h3>
                     <TopPositionsList data={topPositionsData} isLoading={isSummaryLoading} />
                 </div>
            </div>
        </section>

        {/* Original Detailed Tables Section */}
        <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <AccountTable title="Accounts Summary" /> </section>
        <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <SecurityTableAccount title="Security Positions" /> </section>
        <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <CryptoTable title="Cryptocurrency Positions"/> </section>
        <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <MetalsTable title="Precious Metal Positions" /> </section>
        <section className="bg-gray-800/30 p-4 rounded-lg shadow-lg"> <RealEstateTable title="Real Estate Holdings"/> </section>

      </div>
    </div>
  );
}