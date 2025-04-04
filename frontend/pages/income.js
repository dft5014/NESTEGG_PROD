// pages/income.js
import React, { useState, useMemo } from 'react';
// If you have a common Layout component, import it here
// import Layout from '../components/Layout';

// --- Placeholder Data ---
// This data drives the UI until backend integration
const placeholderIncomeEvents = [
  {
    id: 'inc-001',
    assetId: 'sec-aapl',
    assetName: 'AAPL Stock',
    incomeType: 'Dividend',
    expectedDate: '2025-05-15', // Using future dates relevant to current date (Apr 4, 2025)
    amount: 120.50,
    currency: 'USD',
    frequency: 'Quarterly',
    status: 'Projected',
  },
  {
    id: 'inc-002',
    assetId: 'crypto-eth',
    assetName: 'ETH Staking',
    incomeType: 'Staking Reward',
    expectedDate: '2025-04-30',
    amount: 0.02,
    currency: 'ETH',
    frequency: 'Monthly',
    status: 'Projected',
  },
  {
    id: 'inc-003',
    assetId: 're-prop1',
    assetName: 'Rental Property A',
    incomeType: 'Rent',
    expectedDate: '2025-05-01',
    amount: 1500.00,
    currency: 'USD',
    frequency: 'Monthly',
    status: 'Projected',
  },
  {
    id: 'inc-004',
    assetId: 'sec-msft',
    assetName: 'MSFT Stock',
    incomeType: 'Dividend',
    expectedDate: '2025-06-10',
    amount: 85.00,
    currency: 'USD',
    frequency: 'Quarterly',
    status: 'Projected',
  },
  {
    id: 'inc-005',
    assetId: 'bond-us10y',
    assetName: 'US Treasury Bond',
    incomeType: 'Interest',
    expectedDate: '2025-07-15',
    amount: 50.00,
    currency: 'USD',
    frequency: 'Semi-Annually', // Example of another frequency
    status: 'Projected',
  },
   {
    id: 'inc-006',
    assetId: 're-prop1', // Rent for next month
    assetName: 'Rental Property A',
    incomeType: 'Rent',
    expectedDate: '2025-06-01',
    amount: 1500.00,
    currency: 'USD',
    frequency: 'Monthly',
    status: 'Projected',
  },
];

// --- Helper Functions ---

// Basic currency formatting (replace with Intl.NumberFormat for production)
const formatCurrency = (amount, currency = 'USD') => {
  // Very basic example, doesn't handle locales or complex formatting
  try {
     return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  } catch (error) {
     // Fallback for unknown currency codes in basic setup
     return `${amount.toFixed(2)} ${currency}`;
  }
};

// Basic date formatting (replace with date-fns or similar for production)
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    // Check if date is valid before formatting
    if (isNaN(date.getTime())) {
        return "Invalid Date";
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (error) {
      return "Invalid Date";
  }
};

// --- Income Page Component ---

const IncomePage = () => {
  // State for view selection (future use)
  const [view, setView] = useState('Upcoming'); // e.g., 'Upcoming', 'Monthly', 'Quarterly'

  // Calculate Summary KPIs using useMemo for efficiency
  const summaryKPIs = useMemo(() => {
    let totalAnnualUSD = 0;
    // Note: This calculation assumes we primarily care about USD projection
    // and have a way to handle/convert other currencies if needed for a unified view.
    // For this initial version, we sum USD amounts based on frequency.

    placeholderIncomeEvents.forEach(event => {
      if (event.currency === 'USD') { // Focus on USD for main KPIs for now
         let annualContribution = 0;
         switch (event.frequency) {
           case 'Monthly': annualContribution = event.amount * 12; break;
           case 'Quarterly': annualContribution = event.amount * 4; break;
           case 'Annually': annualContribution = event.amount; break;
           case 'Semi-Annually': annualContribution = event.amount * 2; break;
           case 'One-time': annualContribution = event.amount; break; // Consider if one-time counts towards annual projection
           default: break; // Unknown frequency
         }
         totalAnnualUSD += annualContribution;
      }
      // TODO: Add logic here or separately to handle/display totals for non-USD currencies
    });

    return {
      annual: totalAnnualUSD,
      monthlyAvg: totalAnnualUSD / 12,
      quarterlyAvg: totalAnnualUSD / 4,
      // Could add totalsByCurrency here if needed later
    };
  }, []); // Placeholder data is static, so empty dependency array

  // Sort events by expected date for the list view
  const sortedEvents = useMemo(() => {
    // Filter out invalid dates before sorting
    return [...placeholderIncomeEvents]
            .filter(event => !isNaN(new Date(event.expectedDate).getTime()))
            .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate));
  }, []); // Placeholder data is static

  return (
    // Replace <div...> with <Layout> if using a layout component
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Projected Income</h1>

      {/* --- Summary KPIs Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Card for Annual Income */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1 tracking-wide">Est. Annual Income (USD)</h3>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summaryKPIs.annual, 'USD')}</p>
          <p className="text-xs text-gray-400 mt-1">(Based on recurring events)</p>
        </div>
        {/* Card for Monthly Average */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1 tracking-wide">Avg. Monthly Income (USD)</h3>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summaryKPIs.monthlyAvg, 'USD')}</p>
        </div>
        {/* Card for Quarterly Average */}
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-1 tracking-wide">Avg. Quarterly Income (USD)</h3>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summaryKPIs.quarterlyAvg, 'USD')}</p>
        </div>
      </div>

      {/* --- View Controls (Placeholder) --- */}
      {/* Basic controls, functionality to filter 'sortedEvents' can be added later */}
      <div className="mb-6 flex justify-start space-x-2">
        {/* Example: Buttons to switch view state */}
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'Upcoming' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
          onClick={() => setView('Upcoming')}
        >
          Upcoming Events
        </button>
        {/* Add more buttons for Monthly/Quarterly views later */}
         {/* <button ... onClick={() => setView('MonthlySummary')}>Monthly Summary</button> */}
         {/* <button ... onClick={() => setView('QuarterlySummary')}>Quarterly Summary</button> */}
      </div>

      {/* --- Income Breakdown Section (Timeline/List View) --- */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <h2 className="text-xl font-semibold p-4 border-b border-gray-200 text-gray-700">
          {view === 'Upcoming' ? 'Upcoming Income Events' : 'Income Breakdown'} {/* Title changes based on view */}
        </h2>
        {/* Render list based on sortedEvents. Add filtering logic here based on 'view' state later */}
        {sortedEvents.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {sortedEvents.map((event) => (
              <li key={event.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center">
                {/* Left side: Asset and Type Info */}
                <div className="flex-1 mb-2 sm:mb-0 sm:pr-4">
                  <p className="text-base font-semibold text-gray-800">{event.assetName}</p>
                  <p className="text-xs text-gray-500">
                    Type: <span className="font-medium">{event.incomeType}</span> | Frequency: <span className="font-medium">{event.frequency}</span>
                  </p>
                </div>
                {/* Right side: Date and Amount */}
                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                   <span className="text-sm text-gray-600 whitespace-nowrap">{formatDate(event.expectedDate)}</span>
                   <span className={`text-sm font-medium px-2 py-0.5 rounded ${event.amount >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'} whitespace-nowrap`}>
                     {formatCurrency(event.amount, event.currency)}
                   </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-gray-500">No projected income events found.</p>
        )}
      </div>

       {/* --- Placeholder for Chart --- */}
       <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-200">
           <h2 className="text-xl font-semibold mb-4 text-gray-700">Income Projection Chart</h2>
           <div className="h-64 flex items-center justify-center text-gray-400 bg-gray-50 rounded">
               [Chart Component Placeholder - Could visualize monthly totals]
           </div>
       </div>

    </div>
    // </Layout> // Close your layout component if used
  );
};

export default IncomePage;