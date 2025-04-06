import React, { useState, useEffect, useMemo } from 'react';
import { 
    fetchAllPositionsWithDetails, 
    deletePosition 
} from '@/utils/apimethods/positionMethods';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import ConfirmationModal from '@/components/modals/ConfirmationModal';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/formatters';
import { 
    BarChart4, 
    Info, 
    DollarSign, 
    Hash, 
    Percent, 
    Calendar, 
    Landmark, 
    Search, 
    SlidersHorizontal, 
    Loader, 
    X,
    Settings,
    Trash
} from 'lucide-react';

// Breakdown Modal for detailed view of a ticker's positions
const TickerBreakdownModal = ({ 
    isOpen, 
    onClose, 
    tickerData, 
    onEditPosition, 
    onDeletePosition 
}) => {
    if (!isOpen || !tickerData) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-lg text-white max-w-5xl w-full shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        Detailed Breakdown for {tickerData.ticker} ({tickerData.name})
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-700 text-sm">
                        <thead className="bg-gray-700/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-300">Account</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-300">Shares</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-300">Value</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-300">Cost Basis/Share</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-300">Gain/Loss</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-300">Purchase Date</th>
                                <th className="px-4 py-2 text-center font-medium text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {tickerData.positions.map(pos => {
                                const costBasisPerShare = pos.cost_basis || pos.price || 0;
                                const totalCostBasis = (pos.shares || 0) * costBasisPerShare;
                                const currentValue = pos.value || ((pos.shares || 0) * (pos.price || 0));
                                const gainLossAmount = currentValue - totalCostBasis;
                                const gainLossPercent = totalCostBasis !== 0 ? (gainLossAmount / totalCostBasis) * 100 : 0;

                                return (
                                    <tr key={pos.id} className="hover:bg-gray-700/40">
                                        <td className="px-4 py-2 whitespace-nowrap">{pos.account_name}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right">{formatNumber(pos.shares, { maximumFractionDigits: 4 })}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right">{formatCurrency(currentValue)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right">{formatCurrency(costBasisPerShare)}</td>
                                        <td className={`px-4 py-2 whitespace-nowrap text-right ${gainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            <div>
                                                {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
                                            </div>
                                            <div className="text-xs">
                                                {gainLossAmount >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right">{pos.purchase_date || 'N/A'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center">
                                            <div className="flex justify-center space-x-2">
                                                <button 
                                                    onClick={() => onEditPosition(pos)}
                                                    className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-colors"
                                                    title="Edit Position"
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onDeletePosition(pos)}
                                                    className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-colors"
                                                    title="Delete Position"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const SecurityTableTicker = ({ 
    initialSort = "totalValue-high", 
    title = "Securities by Ticker",
    allowAccountFiltering = true 
}) => {
    const [allPositions, setAllPositions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Detail Modal State
    const [selectedTickerData, setSelectedTickerData] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Edit/Delete State
    const [positionToEdit, setPositionToEdit] = useState(null);
    const [positionToDelete, setPositionToDelete] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Sorting, Filtering, Account Filtering State
    const [sortOption, setSortOption] = useState(initialSort);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAccountFilter, setSelectedAccountFilter] = useState("all");
    const [uniqueAccounts, setUniqueAccounts] = useState([]);

    // Fetch data
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedPositions = await fetchAllPositionsWithDetails('security');
            setAllPositions(fetchedPositions || []);

            // Extract unique account names for the filter dropdown
            const accounts = [...new Set(fetchedPositions.map(p => p.account_name).filter(Boolean))];
            setUniqueAccounts(accounts.sort());
        } catch (err) {
            console.error("SecurityTableTicker fetch error:", err);
            setError(err.message || "Failed to load positions.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers for Edit/Delete
    const handleEditPosition = (position) => {
        setPositionToEdit(position);
        setIsEditModalOpen(true);
        setIsDetailModalOpen(false);
    };

    const handleDeletePosition = (position) => {
        setPositionToDelete(position);
        setIsDeleteModalOpen(true);
        setIsDetailModalOpen(false);
    };

    // Memoized Grouping, Filtering, and Sorting
    const processedTickerData = useMemo(() => {
        // 1. Filter by Account (if selected)
        let positionsToProcess = allPositions;
        if (selectedAccountFilter !== "all") {
            positionsToProcess = allPositions.filter(pos => pos.account_name === selectedAccountFilter);
        }

        // 2. Filter by Search Query
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            positionsToProcess = positionsToProcess.filter(pos =>
                (pos.ticker && pos.ticker.toLowerCase().includes(lowerCaseQuery)) ||
                (pos.name && pos.name.toLowerCase().includes(lowerCaseQuery))
            );
        }

        // 3. Group by Ticker and Aggregate
        const groupedByTicker = positionsToProcess.reduce((acc, pos) => {
            // Basic validation
            if (!pos || !pos.ticker || typeof pos.shares !== 'number' || typeof pos.price !== 'number') {
                return acc;
            }

            const ticker = pos.ticker;
            if (!acc[ticker]) {
                acc[ticker] = {
                    ticker: ticker,
                    name: pos.name || 'N/A', // Existing name selection logic
                    positions: [],
                    totalShares: 0,
                    totalValue: 0,
                    totalCostBasis: 0,
                    currentPrice: pos.price,
                    accountCount: 0,
                    annualDividendPerShare: pos.annual_dividend_per_share || 0,
                    accountNames: new Set(),
                };
            }

            // Aggregate calculations
            const costBasisPerShare = pos.cost_basis || pos.price;
            const positionCostBasis = pos.shares * costBasisPerShare;
            const positionValue = pos.value !== undefined ? pos.value : pos.shares * pos.price;

            acc[ticker].positions.push(pos);
            acc[ticker].totalShares += pos.shares;
            acc[ticker].totalValue += positionValue;
            acc[ticker].totalCostBasis += positionCostBasis;
            acc[ticker].accountNames.add(pos.account_name);

            return acc;
        }, {});

        // 4. Calculate derived fields and convert to array
        let aggregatedData = Object.values(groupedByTicker).map(group => {
            const avgCostBasisPerShare = group.totalShares > 0 ? group.totalCostBasis / group.totalShares : 0;
            const totalGainLossAmount = group.totalValue - group.totalCostBasis;
            const totalGainLossPercent = group.totalCostBasis !== 0 ? (totalGainLossAmount / group.totalCostBasis) * 100 : 0;
            const estimatedAnnualIncome = group.totalShares * group.annualDividendPerShare;
            const accountCount = group.accountNames.size;

            return {
                ...group,
                avgCostBasisPerShare,
                totalGainLossAmount,
                totalGainLossPercent,
                estimatedAnnualIncome,
                accountCount,
            };
        });

        // 5. Sort
        aggregatedData.sort((a, b) => {
            switch (sortOption) {
                case "totalValue-high": return b.totalValue - a.totalValue;
                case "totalValue-low": return a.totalValue - b.totalValue;
                case "ticker": return a.ticker.localeCompare(b.ticker);
                case "totalShares-high": return b.totalShares - a.totalShares;
                case "totalShares-low": return a.totalShares - b.totalShares;
                case "gainAmount-high": return b.totalGainLossAmount - a.totalGainLossAmount;
                case "gainAmount-low": return a.totalGainLossAmount - b.totalGainLossAmount;
                case "gainPercent-high": return b.totalGainLossPercent - a.totalGainLossPercent;
                case "gainPercent-low": return a.totalGainLossPercent - b.totalGainLossPercent;
                case "accountCount-high": return b.accountCount - a.accountCount;
                case "accountCount-low": return a.accountCount - b.accountCount;
                case "estIncome-high": return b.estimatedAnnualIncome - a.estimatedAnnualIncome;
                case "estIncome-low": return a.estimatedAnnualIncome - b.estimatedAnnualIncome;
                default: return 0;
            }
        });

        return aggregatedData;
    }, [allPositions, sortOption, searchQuery, selectedAccountFilter]);

    // Loading State
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-60 bg-gray-800/50 backdrop-blur-sm rounded-xl text-gray-400">
                <Loader className="animate-spin mr-3" size={24} /> Loading security data...
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="p-6 bg-red-900/30 border border-red-700 rounded-xl text-red-300">
                <h3 className="font-semibold mb-2">Error Loading Data</h3>
                <p>{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-4 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Main table content (previously defined section) */}
            {/* Render the full table based on processedTickerData */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
                {/* Table header and controls */}
                <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                        <BarChart4 className="w-5 h-5 mr-2 text-blue-400" />
                        {title}
                    </h2>
                    {/* Filtering and sorting controls */}
                </div>

                {/* Table rows */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                            {/* Table headers */}
                        <thead className="bg-gray-900/50 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    Rank / Ticker
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                                    # Shares
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    Value
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                                    Price
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden xl:table-cell">
                                    Avg Cost/Share
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    Gain/Loss
                                </th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">
                                    # Accounts
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                                    Est. Div/Share
                                </th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                                    Est. Annual Income
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {processedTickerData.map((group, index) => (
                                <tr
                                    key={group.ticker}
                                    className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => handleRowClick(group)}
                                    title={`Click to view ${group.ticker} details`}
                                >
                                    {/* Rank / Ticker */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                                                <span className="font-bold text-xs text-white">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{group.ticker}</div>
                                                <div className="text-xs text-gray-400 truncate max-w-[150px] xl:max-w-[200px]">
                                                    {group.name}
                                                </div>
                                                {/* Mobile view details */}
                                                <div className="text-xs text-gray-500 md:hidden">
                                                    {formatNumber(group.totalShares, { maximumFractionDigits: 4 })} Shares in {group.accountCount} Acct(s)
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* # Shares */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                        {formatNumber(group.totalShares, { maximumFractionDigits: 4 })}
                                    </td>
                                    {/* Value */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        {formatCurrency(group.totalValue)}
                                    </td>
                                    {/* Price */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm hidden lg:table-cell">
                                        {formatCurrency(group.currentPrice)}
                                    </td>
                                    {/* Avg Cost/Share */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                                        {formatCurrency(group.avgCostBasisPerShare)}
                                    </td>
                                    {/* Gain/Loss */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <div className="flex flex-col items-end">
                                            <div className={`text-sm font-medium ${group.totalGainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {group.totalGainLossAmount >= 0 ? '+' : ''}{formatCurrency(group.totalGainLossAmount)}
                                            </div>
                                            <div className={`text-xs ${group.totalGainLossAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {group.totalGainLossAmount >= 0 ? '+' : ''}{formatPercentage(group.totalGainLossPercent)}
                                            </div>
                                        </div>
                                    </td>
                                    {/* # Accounts */}
                                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm hidden sm:table-cell">
                                        {group.accountCount}
                                    </td>
                                    {/* Est. Dividend/Share */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm hidden lg:table-cell">
                                        {group.annualDividendPerShare > 0 
                                            ? formatCurrency(group.annualDividendPerShare) 
                                            : <span className="text-gray-500">N/A</span>}
                                    </td>
                                    {/* Est. Annual Income */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                        {group.estimatedAnnualIncome > 0 
                                            ? formatCurrency(group.estimatedAnnualIncome) 
                                            : <span className="text-gray-500">N/A</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit and Delete Modals */}
            {isEditModalOpen && positionToEdit && (
                <SecurityPositionModal
                    isOpen={isEditModalOpen}
                    onClose={() => { 
                        setIsEditModalOpen(false); 
                        setPositionToEdit(null); 
                    }}
                    positionToEdit={positionToEdit}
                    onPositionSaved={() => {
                        setIsEditModalOpen(false);
                        setPositionToEdit(null);
                        fetchData(); // Refresh data after saving
                    }}
                    accountId={positionToEdit.account_id}
                />
            )}

            {isDeleteModalOpen && positionToDelete && (
                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => { 
                        setIsDeleteModalOpen(false); 
                        setPositionToDelete(null); 
                    }}
                    onConfirm={async () => {
                        try {
                            await deletePosition(positionToDelete.id);
                            setIsDeleteModalOpen(false);
                            setPositionToDelete(null);
                            fetchData(); // Refresh data after deletion
                        } catch (error) {
                            console.error("Error deleting position:", error);
                            // Optionally show an error message
                        }
                    }}
                    title="Delete Position"
                    message={`Are you sure you want to delete the position for ${positionToDelete.ticker}? This action cannot be undone.`}
                    confirmText="Delete Position"
                    cancelText="Cancel"
                    confirmVariant="danger"
                />
            )}
            
            {/* Ticker Breakdown Modal */}
            <TickerBreakdownModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                tickerData={selectedTickerData}
                onEditPosition={handleEditPosition}
                onDeletePosition={handleDeletePosition}
            />
        </>
    );
};

export default SecurityTableTicker;