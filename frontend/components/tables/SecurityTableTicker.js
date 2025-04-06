import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllPositionsWithDetails } from '@/utils/apimethods/positionMethods';
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
    X 
} from 'lucide-react';

// Breakdown Modal for detailed view of a ticker's positions
const TickerBreakdownModal = ({ isOpen, onClose, tickerData }) => {
    if (!isOpen || !tickerData) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-lg text-white max-w-4xl w-full shadow-xl">
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
                                            {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)} 
                                            <div className="text-xs">
                                                {gainLossAmount >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right">{pos.purchase_date || 'N/A'}</td>
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
                    name: pos.name || 'N/A',
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

    // --- Handlers ---
    const handleRowClick = (tickerGroupData) => {
        setSelectedTickerData(tickerGroupData);
        setIsDetailModalOpen(true);
    };

    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-60 bg-gray-800/50 backdrop-blur-sm rounded-xl text-gray-400">
                <Loader className="animate-spin mr-3" size={24} /> Loading security data...
            </div>
        );
    }

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
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
                {/* Header with Controls */}
                <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                        <BarChart4 className="w-5 h-5 mr-2 text-blue-400" />
                        {title}
                    </h2>
                    <div className='flex flex-wrap items-center gap-3'>
                        {/* Account Filter Dropdown */}
                        {allowAccountFiltering && (
                            <div className="relative flex-grow sm:flex-grow-0">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Landmark className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    className="bg-gray-700 text-white w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                                    value={selectedAccountFilter}
                                    onChange={(e) => setSelectedAccountFilter(e.target.value)}
                                    title="Filter by Account"
                                >
                                    <option value="all">All Accounts</option>
                                    {uniqueAccounts.map(accountName => (
                                        <option key={accountName} value={accountName}>{accountName}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Search Input */}
                        <div className="relative flex-grow sm:flex-grow-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="bg-gray-700 text-white w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                placeholder="Search Ticker/Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative flex-grow sm:flex-grow-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                            </div>
                            <select
                                className="bg-gray-700 text-white w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none"
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                title="Sort Securities"
                            >
                                <option value="totalValue-high">Sort: Value (High-Low)</option>
                                <option value="totalValue-low">Sort: Value (Low-High)</option>
                                <option value="ticker">Sort: Ticker (A-Z)</option>
                                <option value="totalShares-high">Sort: Shares (High-Low)</option>
                                <option value="totalShares-low">Sort: Shares (Low-High)</option>
                                <option value="gainAmount-high">Sort: Gain $ (High-Low)</option>
                                <option value="gainAmount-low">Sort: Gain $ (Low-High)</option>
                                <option value="gainPercent-high">Sort: Gain % (High-Low)</option>
                                <option value="gainPercent-low">Sort: Gain % (Low-High)</option>
                                <option value="accountCount-high">Sort: # Accounts (High-Low)</option>
                                <option value="accountCount-low">Sort: # Accounts (Low-High)</option>
                                <option value="estIncome-high">Sort: Est. Income (High-Low)</option>
                                <option value="estIncome-low">Sort: Est. Income (Low-High)</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                {processedTickerData.length === 0 ? (
                    <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                        <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <BarChart4 className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-medium mb-2">No securities found</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            {searchQuery || selectedAccountFilter !== 'all' 
                                ? "No securities match your filter criteria." 
                                : "There are no security positions to display."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                            {/* Sticky Header */}
                            <thead className="bg-gray-900/50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        <Info size={12} className="inline mr-1" />Ticker / Name
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                                        <Hash size={12} className="inline mr-1" /># Shares
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        <DollarSign size={12} className="inline mr-1" />Value
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
                                        <Landmark size={12} className="inline mr-1" /># Accts
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                                        <DollarSign size={12} className="inline mr-1" />Est. Div/Share
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                                        <Calendar size={12} className="inline mr-1" />Est. Annual Income
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {processedTickerData.map((group) => (
                                    <tr
                                        key={group.ticker}
                                        className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                                        onClick={() => handleRowClick(group)}
                                        title={`Click to view ${group.ticker} details`}
                                    >
                                        {/* Ticker / Name */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                                                    <span className="font-bold text-xs">{group.ticker?.charAt(0) || '?'}</span>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{group.ticker}</div>
                                                    <div className="text-xs text-gray-400 truncate max-w-[150px] xl:max-w-[200px]">{group.name}</div>
                                                    {/* Show # shares/accts in mobile view */}
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
                )}
            </div>

            {/* Render Ticker Breakdown Modal */}
            <TickerBreakdownModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                tickerData={selectedTickerData}
            />
        </>
    );
};

export default SecurityTableTicker;