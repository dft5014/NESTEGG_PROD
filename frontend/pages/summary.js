// pages/NestEggPage.js  // <-- Renamed file recommended
import React, { useState, useEffect } from 'react';
import SecurityTableAccount from '@/components/tables/SecurityTableAccount';
import CryptoTable from '@/components/tables/CryptoTable';
import MetalsTable from '@/components/tables/MetalsTable';
import RealEstateTable from '@/components/tables/RealEstateTable';
import AccountTable from '@/components/tables/AccountTable';
import KpiCard from '@/components/ui/KpiCard';
// Placeholder for chart components - install a library like Recharts or Chart.js
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'; // Example using Recharts
import { fetchPortfolioSummary, fetchPortfolioHistory } from '@/utils/apimethods/positionMethods'; // Assuming fetchPortfolioHistory exists
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { DollarSign, BarChart4, Users, TrendingUp, TrendingDown, Percent, PieChart as PieIcon, List } from 'lucide-react'; // Added PieIcon, List

// --- Placeholder Chart Components ---
const TrendChartPlaceholder = ({ data, isLoading, error }) => {
  if (isLoading) return <div className="p-4 bg-gray-800/50 rounded-lg text-center text-gray-400">Loading Trend Data...</div>;
  if (error) return <div className="p-4 bg-red-900/60 rounded-lg text-center text-red-200">Error loading trend: {error}</div>;
  if (!data || data.length === 0) return <div className="p-4 bg-gray-800/50 rounded-lg text-center text-gray-400">No trend data available for the last 13 months.</div>;

  // Simple placeholder structure, replace with actual Recharts/Chart.js implementation
   return (
    <div className="h-64 bg-gray-800/50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" /> {/* gray-600 */}
                <XAxis dataKey="month" stroke="#9CA3AF" /> {/* gray-400 */}
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => formatCurrency(value, 0)} /> {/* gray-400 */}
                <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} /* gray-800 */
                    itemStyle={{ color: '#E5E7EB' }} /* gray-200 */
                    formatter={(value) => formatCurrency(value)}
                 />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} /> {/* blue-500 */}
            </LineChart>
        </ResponsiveContainer>
    </div>
  );
};

const AllocationChart = ({ data, isLoading }) => {
    // Assuming data is like: [{ name: 'Stocks', value: 400 }, { name: 'Crypto', value: 300 }]
    if (isLoading || !data) return <div className="p-4 h-64 bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-400">Loading Allocation...</div>;

    const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B']; // Example colors

    return (
        <div className="h-64 bg-gray-800/50 rounded-lg p-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

const TopPositionsList = ({ data, isLoading }) => {
    // Assuming data is like: [{ id: 1, name: 'AAPL', value: 10000 }, ...]
     if (isLoading || !data) return <div className="p-4 bg-gray-800/50 rounded-lg text-gray-400">Loading Top Positions...</div>;

     return (
         <div className="bg-gray-800/50 rounded-lg p-4">
             <ul className="space-y-2">
                 {data.slice(0, 5).map((pos) => ( // Show top 5 for example
                     <li key={pos.id || pos.name} className="flex justify-between items-center text-sm">
                         <span>{pos.name}</span>
                         <span className="font-medium">{formatCurrency(pos.value)}</span>
                     </li>
                 ))}
             </ul>
         </div>
     );
}

// --- Main Component ---
export default function NestEggPage() { // <-- Renamed component
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [trendData, setTrendData] = useState(null);
  const [isTrendLoading, setIsTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(null);

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

    const loadHistory = async () => {
        setIsTrendLoading(true);
        setTrendError(null);
        try {
            // *** ATTENTION: Needs API endpoint fetchPortfolioHistory() ***
            // This endpoint should return data formatted like:
            // [{ month: 'Jan 24', value: 100000 }, { month: 'Feb 24', value: 105000 }, ...]
            // For the last 13 months.
            const historyData = await fetchPortfolioHistory(); // Replace with actual API call
            setTrendData(historyData);
        } catch (error) {
            console.error("Error loading portfolio history:", error);
            setTrendError(error.message || "Failed to load trend data");
        } finally {
             setIsTrendLoading(false);
        }
    };

    loadSummary();
    loadHistory(); // Fetch history data as well
  }, []);

  // Determine overall gain/loss icon and color
  const gainLossValue = summaryData?.total_gain_loss ?? 0;
  const gainLossPercentValue = summaryData?.total_gain_loss_percent ?? 0;
  const GainLossIcon = gainLossValue >= 0 ? TrendingUp : TrendingDown;
  const gainLossColor = gainLossValue >= 0 ? 'green' : 'red';

  // Prepare data for charts (example - adapt based on actual summaryData structure)
  // You might get this directly from summaryData or need to compute it
   const allocationData = summaryData?.allocation || [ // Example structure
        { name: 'Securities', value: summaryData?.securities_value || 0 },
        { name: 'Crypto', value: summaryData?.crypto_value || 0 },
        { name: 'Metals', value: summaryData?.metals_value || 0 },
        { name: 'Real Estate', value: summaryData?.realestate_value || 0 },
    ].filter(item => item.value > 0); // Filter out zero-value assets

   const topPositionsData = summaryData?.top_positions || []; // Example structure [{id: 1, name: 'TSLA', value: 5000}, ...]


  return (
    // Added min-h-screen and bg gradient for overall page style
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <header className="mb-10 text-center"> {/* Centered Header */}
           {/* Increased font size, bold */}
          <h1 className="text-4xl md:text-5xl font-bold mb-2">NestEgg</h1>
          {/* More engaging subtitle */}
          <p className="text-lg text-gray-400">Your comprehensive wealth overview and retirement readiness tracker.</p>
        </header>

        {/* --- KPI Section --- */}
        <section className="mb-10">
           {/* Optional: Add a subtle title if needed, or let cards speak */}
           {/* <h2 className="text-xl font-semibold mb-4 text-gray-300">Overall Summary</h2> */}
           {summaryError && (
               <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200">
                 Error loading summary: {summaryError}
               </div>
             )}
          {/* Using 6 columns for KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
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
                  title="Total G/L %" // Shorter Title
                  value={gainLossPercentValue}
                  icon={<Percent />}
                  isLoading={isSummaryLoading}
                  format={(v) => `${v >= 0 ? '+' : ''}${formatPercentage(v, {maximumFractionDigits: 2})}`}
                  color={gainLossColor}
              />
             <KpiCard
                title="Positions" // Shorter Title
                value={summaryData?.total_positions}
                icon={<BarChart4 />}
                isLoading={isSummaryLoading}
                format={(v) => v?.toLocaleString() ?? '0'}
                color="amber"
             />
              <KpiCard
                title="Accounts" // Shorter Title
                value={summaryData?.total_accounts}
                icon={<Users />}
                isLoading={isSummaryLoading}
                format={(v) => v?.toLocaleString() ?? '0'}
                color="indigo"
              />
          </div>
        </section>
         {/* --- End KPI Section --- */}


        {/* --- Charts & Insights Section --- */}
        <section className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Trend Chart */}
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
        {/* --- End Charts & Insights Section --- */}


        {/* --- Detailed Tables Section --- */}
         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg">
             <AccountTable title="Accounts Summary" /> {/* Assumes AccountTable fetches its own data now or receives filtered data */}
         </section>

         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg">
             <SecurityTableAccount title="Security Positions" />
         </section>

         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg">
             <CryptoTable title="Cryptocurrency Positions"/>
         </section>

         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg">
             <MetalsTable title="Precious Metal Positions" />
         </section>

         <section className="bg-gray-800/30 p-4 rounded-lg shadow-lg"> {/* Last section */}
             <RealEstateTable title="Real Estate Holdings"/>
         </section>
         {/* --- End Detailed Tables Section --- */}

      </div>
    </div>
  );
}