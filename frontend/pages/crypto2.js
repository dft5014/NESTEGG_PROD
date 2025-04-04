// pages/crypto2.js
import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/context/AuthContext';
import { WorkspaceAllCryptoWithDetails } from '@/utils/apimethods/positionMethods'; // Adjust path if needed
import CryptoTable from '@/components/tables/CryptoTable'; // Adjust path if needed
import CryptoDetailModal from '@/components/modals/CryptoDetailModal'; // Adjust path if needed
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters'; // Adjust path if needed

// Icons - Import only those needed for this simplified page
import {
    Bitcoin,
    Plus,
    RefreshCw,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    DollarSign, // Assuming used in KPIs
    // Wallet, Shield, Info, HelpCircle (Keep if used elsewhere, e.g., layout)
} from 'lucide-react';

// Helper function to calculate totals (can be moved to utils)
const calculateCryptoTotals = (positions = []) => {
    let totalValue = 0;
    let totalInvestment = 0;

    positions.forEach(pos => {
        // Use pre-calculated value from backend if available, otherwise calculate
        const currentValue = pos.value ?? (pos.quantity * pos.current_price_per_unit);
        const investment = pos.quantity * pos.purchase_price;

        totalValue += currentValue;
        totalInvestment += investment;
    });

    const totalGainLoss = totalValue - totalInvestment;
    const totalGainLossPercent = totalInvestment !== 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

    return {
        totalValue,
        totalInvestment,
        totalGainLoss,
        totalGainLossPercent,
        count: positions.length
    };
};


export default function Crypto2() {
    const { user } = useContext(AuthContext);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [cryptos, setCryptos] = useState([]);
    const [error, setError] = useState(null);
    const [kpiData, setKpiData] = useState({ totalValue: 0, totalInvestment: 0, totalGainLoss: 0, totalGainLossPercent: 0, count: 0 });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedCrypto, setSelectedCrypto] = useState(null);
    const [syncStatus, setSyncStatus] = useState({ lastSync: null, syncing: false });
    const [activeCurrencyTab, setActiveCurrencyTab] = useState('USD'); // Keep if currency toggle is needed for KPIs

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        if (!user) return; // Ensure user is available

        setIsLoading(true);
        setSyncStatus(prev => ({ ...prev, syncing: true }));
        setError(null);

        try {
            const response = await WorkspaceAllCryptoWithDetails(); // Call the new API method
            console.log("API Response:", response); // DEBUG: Log response

            if (response && response.crypto_positions) {
                setCryptos(response.crypto_positions);
                // Calculate KPIs based on the fetched data
                setKpiData(calculateCryptoTotals(response.crypto_positions));
                setSyncStatus({ lastSync: new Date(), syncing: false });
            } else {
                // Handle cases where data might be missing or in unexpected format
                console.warn("No crypto positions found in response:", response);
                setCryptos([]);
                setKpiData(calculateCryptoTotals([])); // Reset KPIs
                setSyncStatus(prev => ({ ...prev, syncing: false })); // Stop syncing indicator
            }
        } catch (err) {
            console.error('Error fetching crypto data:', err);
            setError(err.message || 'Failed to load cryptocurrency data. Please try again.');
            setCryptos([]); // Clear data on error
            setKpiData(calculateCryptoTotals([])); // Reset KPIs
            setSyncStatus(prev => ({ ...prev, syncing: false })); // Stop syncing indicator
        } finally {
            setIsLoading(false);
            // Ensure syncing is false even if intermediate state wasn't updated
             setSyncStatus(prev => ({ ...prev, syncing: false }));
        }
    }, [user]); // Dependency: re-run if user changes

    useEffect(() => {
        fetchData(); // Fetch data on initial mount/user load
    }, [fetchData]); // Use fetchData in dependency array

    // --- Modal Handling ---
    const handleViewDetails = useCallback((crypto) => {
        setSelectedCrypto(crypto);
        setIsDetailModalOpen(true);
    }, []);

    const handleCloseDetailModal = useCallback(() => {
        setIsDetailModalOpen(false);
        setSelectedCrypto(null);
    }, []);

    // --- Placeholder for Add Action ---
    const handleAddCryptoClick = () => {
        // TODO: Implement logic to open an Add Crypto modal/form
        // Maybe: import CryptoPositionModal and set state to open it?
        console.log("Add Crypto button clicked - Placeholder");
        alert("Add Crypto functionality not yet implemented in crypto2.js");
    };

    // --- Currency Formatting based on state ---
    // Using useMemo to avoid recalculating on every render unless activeCurrencyTab changes
    const formatDisplayCurrency = useCallback((value) => {
        // Basic example - enhance as needed or use existing formatter logic
         if (typeof value !== 'number') return '';
         const options = { style: 'currency', currency: activeCurrencyTab, minimumFractionDigits: 2, maximumFractionDigits: 2 };
         // Simple conversion assumption if EUR is selected
         const displayValue = activeCurrencyTab === 'EUR' ? value * 0.93 : value; // Use a proper rate
         return displayValue.toLocaleString(undefined, options);

        // Or reuse the one from original crypto.js if preferred:
        // return activeCurrencyTab === 'USD'
        //  ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        //  : `€${(value * 0.93).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; // Assuming EUR/USD = 0.93
    }, [activeCurrencyTab]);


    // --- Render Logic ---
    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
                    <Bitcoin className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-4">Cryptocurrency Portfolio</h1>
                    <p className="text-gray-300 mb-6">Please log in to view your crypto portfolio.</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
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
                            <Bitcoin className="mr-4 text-orange-500" />
                            Cryptocurrency Portfolio (v2)
                        </h1>
                        <p className="text-gray-400 mt-2">Track and manage your cryptocurrency investments</p>
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
                            onClick={handleAddCryptoClick} // Placeholder action
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center"
                        >
                            <Plus className="mr-2" size={18} />
                            Add Crypto
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
                        <span>Last synced: {formatDate(syncStatus.lastSync)}</span> // Use formatter
                     ) : syncStatus.syncing || isLoading ? (
                         <span>Syncing data...</span>
                     ) : (
                         <span>Never synced</span>
                     )}
                 </div>

                {/* Portfolio Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card 1: Total Value */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                         <h2 className="text-lg text-gray-400 mb-2">Total Portfolio Value</h2>
                         <div className="flex items-center justify-between">
                             <p className="text-3xl font-bold">{formatDisplayCurrency(kpiData.totalValue)}</p>
                             {/* Currency Toggle (Optional - keep if needed) */}
                             <div className="flex border border-gray-700 rounded-lg overflow-hidden">
                                 <button
                                     className={`px-3 py-1 text-sm ${activeCurrencyTab === 'USD' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                                     onClick={() => setActiveCurrencyTab('USD')}
                                 >
                                     USD
                                 </button>
                                 <button
                                     className={`px-3 py-1 text-sm ${activeCurrencyTab === 'EUR' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                                     onClick={() => setActiveCurrencyTab('EUR')}
                                 >
                                     EUR
                                 </button>
                             </div>
                         </div>
                         <div className={`mt-2 flex items-center ${kpiData.totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {kpiData.totalGainLossPercent >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                            <span>{kpiData.totalGainLossPercent >= 0 ? '+' : ''}{formatNumber(kpiData.totalGainLossPercent)}% overall</span>
                         </div>
                     </div>

                    {/* Card 2: Total Gain/Loss */}
                     <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                         <h2 className="text-lg text-gray-400 mb-2">Total Gain/Loss</h2>
                         <p className={`text-3xl font-bold ${kpiData.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                             {kpiData.totalGainLoss >= 0 ? '+' : ''}{formatDisplayCurrency(kpiData.totalGainLoss)}
                         </p>
                         <div className="mt-2 text-gray-400">
                             <span>Initial investment: {formatDisplayCurrency(kpiData.totalInvestment)}</span>
                         </div>
                     </div>

                    {/* Card 3: Holdings Count (Example) */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                         <h2 className="text-lg text-gray-400 mb-2">Total Holdings</h2>
                         <p className="text-3xl font-bold">{kpiData.count}</p>
                         <div className="mt-2 text-gray-400">
                             <span>Different cryptocurrency positions</span>
                         </div>
                     </div>
                </div>

                {/* Crypto Table Section */}
                <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
                     <h2 className="text-xl font-semibold p-6 border-b border-gray-700 flex items-center justify-between">
                         <span>Your Cryptocurrencies</span>
                          {/* Optionally show count if needed, ensure cryptos is defined */}
                         <span className="text-sm text-gray-400 font-normal">
                            { !isLoading && cryptos ? `Showing ${cryptos.length} positions` : ''}
                         </span>
                     </h2>
                    {/* Render table, passing data and handlers */}
                    {/* Assuming CryptoTable handles its own internal loading/empty state based on props */}
                    <CryptoTable
                        data={cryptos}
                        isLoading={isLoading}
                        onViewDetails={handleViewDetails}
                        onRefresh={fetchData} // Pass function to allow modal/table to trigger refresh
                        // Add other necessary props like onEdit, onDelete if handled via table
                    />
                </div>

                 {/* Security Tips (Optional - Keep if desired) */}
                 <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                     {/* ... JSX for security tips from original crypto.js ... */}
                     <p className="text-center text-gray-500">(Security tips section can be added back here if needed)</p>
                 </div>

            </div>

            {/* Detail Modal */}
            {/* Render conditionally - Ensure selectedCrypto is not null before rendering */}
            {selectedCrypto && (
                <CryptoDetailModal
                    crypto={selectedCrypto}
                    isOpen={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    onRefresh={fetchData} // Pass refresh function to modal
                    // Assuming formatDisplayCurrency or similar is passed or handled inside
                />
            )}
        </div>
    );
}