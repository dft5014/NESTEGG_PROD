// pages/metals2.js
import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/context/AuthContext';
import { fetchAllMetalsWithDetails } from '@/utils/apimethods/positionMethods'; // Adjust path if needed
import MetalsTable from '@/components/tables/MetalsTable'; // Adjust path if needed
import MetalDetailModal from '@/components/modals/MetalDetailModal'; // Adjust path if needed
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters'; // Adjust path if needed

// Icons - Import icons used in this refactored page
import {
    Gem,
    Plus,
    RefreshCw, // Use RefreshCw for consistency
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Scale // Keep if used in KPIs
} from 'lucide-react';

// Helper function to calculate totals (can be moved to utils)
const calculateMetalsTotals = (positions = []) => {
    let totalValue = 0;
    let totalInvestment = 0;
    let totalWeightOz = 0; // Example: Attempt to calculate total weight if relevant

    positions.forEach(pos => {
        // Use backend calculated value (which includes account name and calculated fields)
        const currentValue = pos.value ?? 0; // Default to 0 if value is missing
        const investment = pos.quantity * pos.purchase_price;

        totalValue += currentValue;
        totalInvestment += investment;

        // Example: Summing weight requires unit conversion logic if units vary
        // This is best handled by the backend or a dedicated util if units are mixed.
        // Assuming 'oz' for simplicity here, adjust if needed.
        // You might need more robust unit conversion based on pos.unit
        if (pos.unit?.toLowerCase() === 'oz') {
             totalWeightOz += pos.quantity;
        } else if (pos.unit?.toLowerCase() === 'g') {
             totalWeightOz += pos.quantity / 31.1035; // Approx conversion
        } else if (pos.unit?.toLowerCase() === 'kg') {
             totalWeightOz += pos.quantity * 32.1507; // Approx conversion
        } // Add other conversions as needed (coin, bar might need explicit weight field)
          else {
             // Handle unknown or weightless units (like 'coin', 'bar' without specific weight info)
             // Maybe add a check for a 'weight_in_oz' field from backend?
             totalWeightOz += pos.weight_in_oz || 0; // Assuming backend provides a consistent weight
          }
    });

    const totalGainLoss = totalValue - totalInvestment;
    const totalGainLossPercent = totalInvestment !== 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

    return {
        totalValue,
        totalInvestment,
        totalGainLoss,
        totalGainLossPercent,
        totalWeightOz, // Include calculated weight
        count: positions.length
    };
};


export default function Metals2() {
    const { user } = useContext(AuthContext);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [metals, setMetals] = useState([]);
    const [error, setError] = useState(null);
    const [kpiData, setKpiData] = useState({ totalValue: 0, totalInvestment: 0, totalGainLoss: 0, totalGainLossPercent: 0, totalWeightOz: 0, count: 0 });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedMetal, setSelectedMetal] = useState(null);
    const [syncStatus, setSyncStatus] = useState({ lastSync: null, syncing: false });
     // NOTE: Removed activeCurrencyTab state, assuming USD display for metals. Add back if needed.


    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        setSyncStatus(prev => ({ ...prev, syncing: true }));
        setError(null);

        try {
            const response = await fetchAllMetalsWithDetails(); // Call the new API method
            console.log("Metals API Response:", response); // DEBUG

            // Ensure response.metal_positions exists and is an array
            const positions = Array.isArray(response?.metal_positions) ? response.metal_positions : [];

            setMetals(positions);
            setKpiData(calculateMetalsTotals(positions));
            setSyncStatus({ lastSync: new Date(), syncing: false });

        } catch (err) {
            console.error('Error fetching metals data:', err);
            setError(err.message || 'Failed to load precious metals data. Please try again.');
            setMetals([]);
            setKpiData(calculateMetalsTotals([])); // Reset KPIs on error
            // Keep lastSync time? Or clear it? Let's keep it for now.
            // setSyncStatus(prev => ({ ...prev, syncing: false }));
        } finally {
            // Ensure loading and syncing states are reset regardless of success/error
            setIsLoading(false);
            setSyncStatus(prev => ({ ...prev, syncing: false }));
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Modal Handling ---
    const handleViewDetails = useCallback((metal) => {
        setSelectedMetal(metal);
        setIsDetailModalOpen(true);
    }, []);

    const handleCloseDetailModal = useCallback(() => {
        setIsDetailModalOpen(false);
        setSelectedMetal(null);
    }, []);

    // --- Placeholder for Add Action ---
    const handleAddMetalClick = () => {
        // TODO: Implement opening Add Metal modal (e.g., MetalPositionModal)
        console.log("Add Metal button clicked - Placeholder");
        alert("Add Metal functionality not yet implemented in metals2.js");
        // Example: You might import a modal component and set state to show it:
        // import MetalPositionModal from '@/components/modals/MetalPositionModal'; // Assuming it exists
        // const [isAddModalOpen, setIsAddModalOpen] = useState(false);
        // ...then in this function: setIsAddModalOpen(true);
    };

    // --- Render Logic ---
    if (!user) {
        // Same login prompt as crypto2.js but with Gem icon/text
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
                    <Gem className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-4">Precious Metals Portfolio</h1>
                    <p className="text-gray-300 mb-6">Please log in to view your metals portfolio.</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center">
                            <Gem className="mr-4 text-purple-500" />
                            Precious Metals Portfolio (v2)
                        </h1>
                        <p className="text-gray-400 mt-2">Track and manage your physical precious metals</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={fetchData} // Use direct fetchData for refresh
                            disabled={syncStatus.syncing || isLoading}
                            className={`flex items-center px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors ${syncStatus.syncing || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw className={`mr-2 ${(syncStatus.syncing || isLoading) ? 'animate-spin' : ''}`} size={18} />
                            {(syncStatus.syncing || isLoading) ? 'Syncing...' : 'Sync Data'}
                        </button>
                        <button
                            onClick={handleAddMetalClick} // Placeholder action
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                        >
                            <Plus className="mr-2" size={18} />
                            Add Metal
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-start">
                        <AlertCircle className="mr-2 mt-1 flex-shrink-0" size={20} />
                        <div>
                            <p className="font-semibold">Error</p>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                 {/* Last Sync Info */}
                 <div className="text-right text-sm text-gray-400 mb-4">
                    {syncStatus.lastSync && !syncStatus.syncing && !isLoading ? (
                        <span>Last synced: {formatDate(syncStatus.lastSync)}</span>
                     ) : syncStatus.syncing || isLoading ? (
                         <span>Syncing data...</span>
                     ) : error ? (
                          <span>Sync failed</span>
                     ) : (
                         <span>Never synced</span>
                     )}
                 </div>

                {/* Portfolio Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card 1: Total Value */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-lg text-gray-400 mb-2">Total Portfolio Value</h2>
                        {/* Assuming formatCurrency handles USD by default or based on config */}
                        <p className="text-3xl font-bold">{formatCurrency(kpiData.totalValue)}</p>
                        <div className={`mt-2 flex items-center ${kpiData.totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {kpiData.totalGainLossPercent >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                           {/* Handle NaN case for percentage if totalInvestment is 0 */}
                           <span>{kpiData.totalGainLossPercent >= 0 ? '+' : ''}{formatNumber(kpiData.totalGainLossPercent)}% overall</span>
                        </div>
                    </div>

                    {/* Card 2: Total Gain/Loss */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-lg text-gray-400 mb-2">Total Gain/Loss</h2>
                        <p className={`text-3xl font-bold ${kpiData.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {kpiData.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(kpiData.totalGainLoss)}
                        </p>
                        <div className="mt-2 text-gray-400">
                            <span>Initial investment: {formatCurrency(kpiData.totalInvestment)}</span>
                        </div>
                    </div>

                    {/* Card 3: Total Weight (Example) */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                         <h2 className="text-lg text-gray-400 mb-2">Total Holdings</h2>
                         <p className="text-3xl font-bold">{formatNumber(kpiData.count)}</p> {/* Format count if needed */}
                         <div className="mt-2 text-gray-400 flex items-center">
                             <Scale size={16} className="mr-1" />
                             {/* Display weight - adjust unit/formatting as needed */}
                             <span>Approx Weight: {formatNumber(kpiData.totalWeightOz, 2)} oz</span> {/* Show 2 decimals for weight */}
                         </div>
                     </div>
                </div>

                 {/* Metals Table Section */}
                <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
                     <h2 className="text-xl font-semibold p-6 border-b border-gray-700 flex items-center justify-between">
                         <span>Your Precious Metals</span>
                         <span className="text-sm text-gray-400 font-normal">
                            { !isLoading && metals ? `Showing ${metals.length} positions` : ''}
                         </span>
                     </h2>
                     {/* Pass data and handlers to the reusable table component */}
                     <MetalsTable
                        data={metals}
                        isLoading={isLoading}
                        onViewDetails={handleViewDetails}
                        onRefresh={fetchData} // Allow table actions (like delete in modal) to refresh data
                        // Add other necessary props like onEdit, onDelete if handled via table actions
                    />
                </div>

                 {/* NOTE: Chart and Allocation sections from original metals.js removed for simplicity */}

            </div>

            {/* Detail Modal - Render only when a metal is selected */}
            {selectedMetal && (
                <MetalDetailModal
                    metal={selectedMetal} // Pass the selected metal's data
                    isOpen={isDetailModalOpen} // Control visibility
                    onClose={handleCloseDetailModal} // Function to close the modal
                    onRefresh={fetchData} // Function for the modal to trigger data refresh (e.g., after delete)
                    // Pass formatters if the modal expects them as props
                    // formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
}