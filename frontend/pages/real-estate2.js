// pages/realestate2.js
import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/context/AuthContext';
import { fetchAllRealEstateWithDetails } from '@/utils/apimethods/positionMethods'; // Adjust path if needed
import RealEstateTable from '@/components/tables/RealEstateTable'; // Adjust path if needed
import RealEstateDetailModal from '@/components/modals/RealEstateDetailModal'; // Adjust path if needed
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters'; // Adjust path if needed

// Icons - Import icons used in this refactored page
import {
    Building2,
    Home, // Keep if used for property type indication?
    Plus,
    RefreshCw, // Use RefreshCw for consistency
    AlertCircle,
    TrendingUp,
    TrendingDown
    // DollarSign (implicitly used by formatCurrency)
} from 'lucide-react';

// Helper function to calculate totals (can be moved to utils)
const calculateRealEstateTotals = (positions = []) => {
    let totalValue = 0;         // Sum of estimated_value (or 'value' in Pydantic model)
    let totalEquity = 0;        // Sum of equity (calculated in backend)
    let totalMortgage = 0;      // Sum of mortgage
    let totalPurchasePrice = 0; // Sum of purchase_price

    positions.forEach(pos => {
        totalValue += pos.value ?? 0; // Use backend calculated 'value' (estimated_value)
        totalEquity += pos.equity ?? 0; // Use backend calculated 'equity'
        totalMortgage += pos.mortgage ?? 0;
        totalPurchasePrice += pos.purchase_price ?? 0;
    });

    // Optional: Calculate overall gain/loss if needed (backend already does per property)
    // const overallGainLoss = totalValue - totalPurchasePrice;
    // const overallGainLossPercent = totalPurchasePrice !== 0 ? (overallGainLoss / totalPurchasePrice) * 100 : 0;

    return {
        totalValue,
        totalEquity,
        totalMortgage,
        count: positions.length
        // overallGainLoss,       // Include if displaying overall gain % KPI
        // overallGainLossPercent // Include if displaying overall gain % KPI
    };
};


export default function RealEstate2() {
    const { user } = useContext(AuthContext);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [properties, setProperties] = useState([]); // State holds the list of properties
    const [error, setError] = useState(null);
    const [kpiData, setKpiData] = useState({ totalValue: 0, totalEquity: 0, totalMortgage: 0, count: 0 });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [syncStatus, setSyncStatus] = useState({ lastSync: null, syncing: false });
    // NOTE: Removed chart timeframe state

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        setSyncStatus(prev => ({ ...prev, syncing: true }));
        setError(null);

        try {
            // Replace mock data logic with API call
            const response = await fetchAllRealEstateWithDetails();
            console.log("Real Estate API Response:", response); // DEBUG

            // Ensure response.real_estate_positions exists and is an array
            const positions = Array.isArray(response?.real_estate_positions) ? response.real_estate_positions : [];

            setProperties(positions);
            setKpiData(calculateRealEstateTotals(positions));
            setSyncStatus({ lastSync: new Date(), syncing: false });

        } catch (err) {
            console.error('Error fetching real estate data:', err);
            setError(err.message || 'Failed to load real estate data. Please try again.');
            setProperties([]);
            setKpiData(calculateRealEstateTotals([])); // Reset KPIs on error
        } finally {
            // Ensure loading and syncing states are reset regardless of success/error
            setIsLoading(false);
            setSyncStatus(prev => ({ ...prev, syncing: false }));
        }
    }, [user]);

    useEffect(() => {
        // Fetch data from API instead of using mock timeout
        fetchData();
    }, [fetchData]); // Depend on fetchData callback

    // --- Modal Handling ---
    const handleViewDetails = useCallback((property) => {
        setSelectedProperty(property);
        setIsDetailModalOpen(true);
    }, []);

    const handleCloseDetailModal = useCallback(() => {
        setIsDetailModalOpen(false);
        setSelectedProperty(null);
    }, []);

    // --- Placeholder for Add Action ---
    const handleAddPropertyClick = () => {
        // TODO: Implement opening Add Property modal (e.g., RealEstatePositionModal)
        console.log("Add Property button clicked - Placeholder");
        alert("Add Property functionality not yet implemented in realestate2.js");
        // Example: You might import a modal component and set state to show it:
        // import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal'; // Assuming it exists
        // const [isAddModalOpen, setIsAddModalOpen] = useState(false);
        // ...then in this function: setIsAddModalOpen(true);
    };

    // --- Render Logic ---
    if (!user) {
        // Login prompt using Building2 icon
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
                    <Building2 className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-4">Real Estate Portfolio</h1>
                    <p className="text-gray-300 mb-6">Please log in to view your real estate portfolio.</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
                            <Building2 className="mr-4 text-blue-500" />
                            Real Estate Portfolio (v2)
                        </h1>
                        <p className="text-gray-400 mt-2">Track and manage your real estate investments</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                         {/* Added Refresh Button */}
                         <button
                            onClick={fetchData} // Use direct fetchData for refresh
                            disabled={syncStatus.syncing || isLoading}
                            className={`flex items-center px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors ${syncStatus.syncing || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw className={`mr-2 ${(syncStatus.syncing || isLoading) ? 'animate-spin' : ''}`} size={18} />
                            {(syncStatus.syncing || isLoading) ? 'Syncing...' : 'Sync Data'}
                        </button>
                        <button
                            onClick={handleAddPropertyClick} // Placeholder action
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                            <Plus className="mr-2" size={18} />
                            Add Property
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

                {/* Portfolio Summary Cards - Updated to use kpiData */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card 1: Total Value */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-lg text-gray-400 mb-2">Total Portfolio Value</h2>
                        <p className="text-3xl font-bold">{formatCurrency(kpiData.totalValue)}</p>
                        {/* Optional: Add a relevant trend indicator if available from backend or calculations */}
                        {/* <div className="mt-2 text-green-400 flex items-center">
                           <TrendingUp size={16} className="mr-1" />
                           <span>Value trend info here</span>
                        </div> */}
                    </div>

                    {/* Card 2: Total Equity */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-lg text-gray-400 mb-2">Total Equity</h2>
                        <p className="text-3xl font-bold">{formatCurrency(kpiData.totalEquity)}</p>
                         {/* Optional: Add a relevant trend indicator if available */}
                         {/* <div className={`mt-2 flex items-center ${kpiData.overallGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {kpiData.overallGainLossPercent >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                            <span>{kpiData.overallGainLossPercent >= 0 ? '+' : ''}{formatNumber(kpiData.overallGainLossPercent)}% overall gain</span>
                         </div> */}
                    </div>

                    {/* Card 3: Property Count & Total Debt */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-lg text-gray-400 mb-2">Properties</h2>
                        <p className="text-3xl font-bold">{formatNumber(kpiData.count)}</p>
                        <div className="mt-2 text-gray-400">
                           <span>Total mortgage debt: {formatCurrency(kpiData.totalMortgage)}</span>
                        </div>
                    </div>
                </div>

                 {/* NOTE: Chart section from original real-estate.js removed for simplicity */}

                 {/* Real Estate Table Section */}
                <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
                     <h2 className="text-xl font-semibold p-6 border-b border-gray-700 flex items-center justify-between">
                         <span>Your Real Estate Properties</span>
                         <span className="text-sm text-gray-400 font-normal">
                            { !isLoading && properties ? `Showing ${properties.length} properties` : ''}
                         </span>
                     </h2>
                     {/* Pass data and handlers to the reusable table component */}
                     <RealEstateTable
                        data={properties}
                        isLoading={isLoading}
                        onViewDetails={handleViewDetails}
                        onRefresh={fetchData} // Allow actions in modal to refresh data
                        // Add other necessary props like onEdit, onDelete if handled via table actions
                    />
                </div>

            </div>

            {/* Detail Modal - Render only when a property is selected */}
            {selectedProperty && (
                <RealEstateDetailModal
                    property={selectedProperty} // Pass the selected property's data
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