import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext'; // Keep for auth check
import { useRouter } from 'next/router'; // Keep for auth check

// Import only the SecurityTableTicker component
import GroupedTickerTable from '@/components/tables/GroupedTickerTable';
import UnifiedGroupedPositionsTable from '@/components/tables/UnifiedGroupedPositionsTable';

// Import necessary formatters if they are used OUTSIDE SecurityTableTicker (likely not needed now)
// import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';

export default function TestFixedPage() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [error, setError] = useState(null); // Keep basic error state if needed for page-level errors

  // Check authentication - Keep this
  useEffect(() => {
    if (user === null) { // Check explicitly for null after initial loading state
        console.log("User not logged in, redirecting to login.");
        router.push('/login');
    }
   }, [user, router]); // Rerun when user or router changes


  // All other state variables (accounts, positions, modals, loading states) are removed.
  // All other functions (loadAccounts, loadPositionsByType, handlers) are removed.

  // Render only the main container and the SecurityTableTicker
  return (
    // Using a light gray background for the page
    <div className="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">NestEgg Portfolio - Ticker View</h1>

      {/* Optional: Display page-level errors if any */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg shadow-sm">
          {error}
           <button
            className="ml-4 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            onClick={() => setError(null)} // Simple clear error button
          >
            Dismiss
          </button>
        </div>
      )}

       {/* Render the SecurityTableTicker component */}
       {/* It handles its own data fetching, loading, and error states internally */}
       {user ? ( // Only render the table if the user context is loaded (not null/undefined)
         <GroupedTickerTable />
       ) : (
         // Optional: Show a loading indicator while user context is resolving
         <div className="flex items-center justify-center h-60 bg-white rounded-xl text-gray-500 shadow-md border border-gray-200">
             Checking authentication...
         </div>
       )}

       {/* Render the SecurityTableTicker component */}
       {/* It handles its own data fetching, loading, and error states internally */}
       {user ? ( // Only render the table if the user context is loaded (not null/undefined)
         <UnifiedGroupedPositionsTable />
       ) : (
         // Optional: Show a loading indicator while user context is resolving
         <div className="flex items-center justify-center h-60 bg-white rounded-xl text-gray-500 shadow-md border border-gray-200">
             Checking authentication...
         </div>
       )}

      {/* All other sections (Accounts, Crypto, Metals, Real Estate) and Modals are removed. */}
    </div>
  );
}
