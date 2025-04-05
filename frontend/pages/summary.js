// pages/summary.js (or pages/NestEggPage.js)
import React, { useState, useEffect } from 'react';
// Tables & Cards
import SecurityTableAccount from '@/components/tables/SecurityTableAccount';
import CryptoTable from '@/components/tables/CryptoTable';
import MetalsTable from '@/components/tables/MetalsTable';
import RealEstateTable from '@/components/tables/RealEstateTable';
import AccountTable from '@/components/tables/AccountTable';
import KpiCard from '@/components/ui/KpiCard';
// Charting Library (Ensure 'recharts' is installed!)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// API Methods
import { fetchPortfolioSummary } from '@/utils/apimethods/positionMethods';
// Utils
import { formatCurrency, formatPercentage } from '@/utils/formatters'; // Ensure this path is correct
import { DollarSign, BarChart4, Users, TrendingUp, TrendingDown, Percent, PieChart as PieIcon, List } from 'lucide-react';
// Feedback
import { toast } from 'react-hot-toast'; // Ensure react-hot-toast is installed

// --- Placeholder Chart Components ---
const TrendChartPlaceholder = ({ data, isLoading, error }) => {
  if (isLoading) return <div className="p-4 bg-gray-800/50 rounded-lg text-center text-gray-400">Loading Trend Data...</div>;
  if (error) return <div className="p-4 bg-red-900/60 rounded-lg text-center text-red-200">Error loading trend: {error}</div>;
  if (!data || data.length === 0) return <div className="p-4 bg-gray-800/50 rounded-lg text-center text-gray-400">No trend data available.</div>;

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

const TopPositionsList = ({ data, isLoading }) => {
     if (isLoading || !data || data.length === 0) return <div className="p-4 bg-gray-800/50 rounded-lg text-gray-400">Loading Top Positions...</div>;
     return (
         <div className="bg-gray-800/50 rounded-lg p-4">
             <ul className="space-y-2">
                 {data.slice(0, 5).map((pos) => (
                     <li key={pos.id || pos.name} className="flex justify-between items-center text-sm">
                         <span>{pos.name}</span>
                         <span className="font-medium">{formatCurrency(pos.value)}</span>
                     </li>
                 ))}
             </ul>
         </div>
     );
};

// --- FAKE DATA FUNCTION --- Moved definition outside component
const generateFakeTrendData = () => {
    const data = [];
    // Use the current date dynamically (e.g., April 4, 2025 based on context)
    const currentDate = new Date("2025-04-04T12:00:00");
    let currentValue = 125000; // Starting value Example

    for (let i = 12; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(currentDate.getMonth() - i);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear().toString().slice(-2);
        const fluctuation = (Math.random() - 0.45) * 6000;
        currentValue += fluctuation;
        currentValue = Math.max(50000, currentValue);
        data.push({ month: `${month} ${year}`, value: Math.round(currentValue) });
    }
    data[data.length-1].value = Math.max(50000, data[data.length-1].value + (Math.random() - 0.5) * 2000);
    return data;
};
// --- END FAKE DATA FUNCTION ---


// --- Main Component ---
export default function SummaryPage() { // Or NestEggPage
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // ** FIXED: Use lazy initialization for useState to avoid ReferenceError during build **
  const [trendData, setTrendData] = useState(() => generateFakeTrendData());
  const [isTrendLoading, setIsTrendLoading] = useState(false); // Start false as data is generated immediately
  const [trendError, setTrendError] = useState(null); // No fetch, so no fetch error


  // useEffect now only loads summary data
  useEffect(() => {
    const loadSummary = async () => {
        setIsSummaryLoading(true);
        setSummaryError(null);
        try {
            // Ensure fetchPortfolioSummary exists and is imported correctly
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
    // No call to loadHistory
  }, []);

  // Determine overall gain/loss icon and color
  const gainLossValue = summaryData?.total_gain_loss ?? 0;
  const gainLossPercentValue = summaryData?.total_gain_loss_percent ?? 0;
  const GainLossIcon = gainLossValue >= 0 ? TrendingUp : TrendingDown;
  const gainLossColor = gainLossValue >= 0 ? 'text-green-500' : 'text-red-500'; // Use Tailwind colors
  const gainLossKpiColor = gainLossValue >= 0 ? 'green' : 'red'; // For KpiCard prop

  // Prepare data for other charts (Ensure summaryData structure matches)
   const allocationData = summaryData?.allocation || [
        { name: 'Stocks', value: summaryData?.securities_value || 0 },
        { name: 'Crypto', value: summaryData?.crypto_value || 0 },
        { name: 'Metals', value: summaryData?.metals_value || 0 },
        { name: 'Real Estate', value: summaryData?.realestate_value || 0 },
    ].filter(item => item.value > 0);

   const topPositionsData = summaryData?.top_positions || []; // Expects [{id:?, name:?, value:?}, ...]


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">NestEgg</h1>
          <p className="text-lg text-gray-400">Your comprehensive wealth overview and retirement readiness tracker.</p>
        </header>

        {/* --- KPI Section --- */}
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
         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <AccountTable title="Accounts Summary" /> </section>
         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <SecurityTableAccount title="Security Positions" /> </section>
         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <CryptoTable title="Cryptocurrency Positions"/> </section>
         <section className="mb-12 bg-gray-800/30 p-4 rounded-lg shadow-lg"> <MetalsTable title="Precious Metal Positions" /> </section>
         <section className="bg-gray-800/30 p-4 rounded-lg shadow-lg"> <RealEstateTable title="Real Estate Holdings"/> </section>
         {/* --- End Detailed Tables Section --- */}

      </div>
    </div>
  );
}