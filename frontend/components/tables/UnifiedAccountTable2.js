// frontend/components/tables/UnifiedAccountTable2.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Store hooks
import { useAccounts } from '@/store/hooks/useAccounts';

// Utils
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// Modal Components
import FixedModal from '@/components/modals/FixedModal';

// Icons
import { 
    Briefcase, 
    Loader, 
    Search, 
    TrendingUp, 
    TrendingDown, 
    ChevronUp, 
    ChevronDown, 
    BarChart3, 
    LineChart, 
    Activity,
    Info,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    SlidersHorizontal,
    Filter
} from 'lucide-react';

// Performance Indicator Component
const PerformanceIndicator = ({ value, format = 'percentage', size = 'sm', showSign = true }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    const colorClass = isPositive ? 'text-green-500' : isNeutral ? 'text-gray-400' : 'text-red-500';
    
    const formattedValue = format === 'percentage' 
        ? `${value > 0 && showSign ? '+' : ''}${(value * 100).toFixed(2)}%`
        : formatCurrency(Math.abs(value));
    
    return (
        <span className={`${colorClass} ${size === 'sm' ? 'text-sm' : 'text-base'} font-medium flex items-center`}>
            {formattedValue}
        </span>
    );
};

// Performance Modal Component
const PerformanceModal = ({ isOpen, onClose, account }) => {
    if (!isOpen || !account) return null;

    return (
        <FixedModal isOpen={isOpen} onClose={onClose} title={`${account.name || account.account_name || 'Account'} Performance`}>
            <div className="p-6 space-y-6">
                {/* Performance Summary */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-4 rounded-lg">
                        <h4 className="text-sm text-gray-600 mb-1">Total Value</h4>
                        <p className="text-2xl font-bold">{formatCurrency(account.totalValue || 0)}</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                        <h4 className="text-sm text-gray-600 mb-1">All-Time Return</h4>
                        <p className={`text-2xl font-bold ${(account.totalGainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(account.totalGainLossPercent || 0)}
                        </p>
                    </div>
                </div>

                {/* Time Period Performance */}
                <div>
                    <h4 className="font-semibold mb-3">Performance by Period</h4>
                    <div className="space-y-2">
                        {[
                            { label: '1 Day', value: account.value1dChangePct, amount: account.value1dChange },
                            { label: '1 Week', value: account.value1wChangePct, amount: account.value1wChange },
                            { label: '1 Month', value: account.value1mChangePct, amount: account.value1mChange },
                            { label: 'YTD', value: account.valueYtdChangePct, amount: account.valueYtdChange },
                            { label: '1 Year', value: account.value1yChangePct, amount: account.value1yChange }
                        ].map(period => (
                            <div key={period.label} className="flex justify-between items-center py-2 border-b">
                                <span className="text-gray-700">{period.label}</span>
                                <div className="text-right">
                                    <div className={`font-semibold ${(period.value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatPercentage(period.value || 0)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {formatCurrency(period.amount || 0)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Asset Breakdown */}
                <div>
                    <h4 className="font-semibold mb-3">Asset Breakdown</h4>
                    <div className="space-y-2">
                        {[
                            { label: 'Securities', value: account.securityValue, color: 'bg-blue-500' },
                            { label: 'Crypto', value: account.cryptoValue, color: 'bg-purple-500' },
                            { label: 'Cash', value: account.cashValue, color: 'bg-green-500' },
                            { label: 'Metals', value: account.metalValue, color: 'bg-yellow-500' },
                            { label: 'Other', value: account.otherAssetsValue, color: 'bg-gray-500' }
                        ].filter(item => item.value > 0).map(item => {
                            const percentage = account.totalValue > 0 ? (item.value / account.totalValue) * 100 : 0;
                            return (
                                <div key={item.label} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>{item.label}</span>
                                        <span className="font-medium">{formatCurrency(item.value)} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className={`${item.color} h-2 rounded-full transition-all duration-500`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </FixedModal>
    );
};

// Helper function to get logo
const getInstitutionLogo = (institutionName) => {
    if (!institutionName) return null;
    const brokerage = popularBrokerages.find(
        broker => broker.name.toLowerCase() === institutionName.toLowerCase()
    );
    const FallbackIcon = () => <Briefcase className="w-5 h-5 text-gray-500" />;
    return brokerage ? brokerage.logo : FallbackIcon;
};

// --- Main UnifiedAccountTable2 Component ---
const UnifiedAccountTable2 = ({
    initialSort = "value-high",
    title = "Your Accounts",
    onDataChanged = () => {}
}) => {
    console.log("UnifiedAccountTable2: Rendering start");

    // Use the store hook to get data
    const { 
        accounts, 
        summary, 
        loading, 
        error, 
        refresh,
        isStale 
    } = useAccounts();

    // Modal States
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);

    // Sorting and Filtering State
    const [sortField, setSortField] = useState(initialSort.split('-')[0]);
    const [sortDirection, setSortDirection] = useState(initialSort.includes('-low') ? 'asc' : 'desc');
    const [searchQuery, setSearchQuery] = useState("");
    const [assetTypeFilter, setAssetTypeFilter] = useState("all");

    // Ensure accounts is always an array
    const safeAccounts = useMemo(() => {
        return Array.isArray(accounts) ? accounts : [];
    }, [accounts]);

    // Separate liquid and illiquid accounts
    const { liquidAccounts, illiquidAccounts } = useMemo(() => {
        if (safeAccounts.length === 0) return { liquidAccounts: [], illiquidAccounts: [] };
        
        const liquid = safeAccounts.filter(acc => acc.category !== 'other_assets');
        const illiquid = safeAccounts.filter(acc => acc.category === 'other_assets');
        
        return { liquidAccounts: liquid, illiquidAccounts: illiquid };
    }, [safeAccounts]);

    // Calculate totals for different categories
    const { totals, liquidTotals, illiquidTotals } = useMemo(() => {
        const emptyTotals = {
            totalValue: 0,
            totalCostBasis: 0,
            totalGainLoss: 0,
            positionsCount: 0,
            cashBalance: 0,
            totalGainLossPercent: 0,
            value1dChange: 0,
            value1dChangePct: 0,
            valueYtdChange: 0,
            valueYtdChangePct: 0
        };

        if (safeAccounts.length === 0) {
            return { totals: emptyTotals, liquidTotals: emptyTotals, illiquidTotals: emptyTotals };
        }

        const calculateTotals = (accountList) => {
            const result = accountList.reduce((acc, account) => {
                acc.totalValue += account.totalValue ?? 0;
                acc.totalCostBasis += account.totalCostBasis ?? 0;
                acc.totalGainLoss += account.totalGainLoss ?? 0;
                acc.positionsCount += account.totalPositions ?? 0;
                acc.cashBalance += account.cashValue ?? 0;
                acc.value1dChange += account.value1dChange ?? 0;
                acc.valueYtdChange += account.valueYtdChange ?? 0;
                return acc;
            }, { ...emptyTotals });
            
            // Calculate percentages
            result.totalGainLossPercent = result.totalCostBasis > 0 
                ? (result.totalGainLoss / result.totalCostBasis)
                : 0;
                
            // Calculate performance percentages based on previous values
            const prev1dValue = result.totalValue - result.value1dChange;
            const prevYtdValue = result.totalValue - result.valueYtdChange;
            
            result.value1dChangePct = prev1dValue > 0 ? (result.value1dChange / prev1dValue) : 0;
            result.valueYtdChangePct = prevYtdValue > 0 ? (result.valueYtdChange / prevYtdValue) : 0;
                
            return result;
        };

        return {
            totals: calculateTotals(safeAccounts),
            liquidTotals: calculateTotals(liquidAccounts),
            illiquidTotals: calculateTotals(illiquidAccounts)
        };
    }, [safeAccounts, liquidAccounts, illiquidAccounts]);

    // Handle column sort
    const handleSortChange = (field) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Get sort indicator for column headers
    const getSortIndicator = (field) => {
        if (field !== sortField) return null;
        return sortDirection === 'asc' ? 
            <ChevronUp className="inline-block w-4 h-4 ml-1" /> : 
            <ChevronDown className="inline-block w-4 h-4 ml-1" />;
    };

    // --- Filtering & Sorting ---
    const filteredAndSortedAccounts = useMemo(() => {
        let filtered = [...safeAccounts];
        
        // Apply search filter
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(acc =>
                acc.name?.toLowerCase().includes(lowerCaseQuery) ||
                acc.institution?.toLowerCase().includes(lowerCaseQuery) ||
                acc.type?.toLowerCase().includes(lowerCaseQuery)
            );
        }
        
        // Apply asset type filter
        if (assetTypeFilter !== "all") {
            filtered = filtered.filter(acc => {
                switch (assetTypeFilter) {
                    case "liquid": return acc.category !== "other_assets";
                    case "illiquid": return acc.category === "other_assets";
                    case "brokerage": return acc.category === "brokerage";
                    case "retirement": return acc.category === "retirement";
                    case "cash": return acc.category === "cash";
                    default: return true;
                }
            });
        }

        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case "value": comparison = (b.totalValue ?? 0) - (a.totalValue ?? 0); break;
                case "cost_basis": comparison = (b.totalCostBasis ?? 0) - (a.totalCostBasis ?? 0); break;
                case "gain_loss": comparison = (b.totalGainLoss ?? 0) - (a.totalGainLoss ?? 0); break;
                case "name": comparison = (a.name || "").localeCompare(b.name || ""); break;
                case "institution": comparison = (a.institution || "").localeCompare(b.institution || ""); break;
                case "positions": comparison = (b.totalPositions ?? 0) - (a.totalPositions ?? 0); break;
                case "cash": comparison = (b.cashValue ?? 0) - (a.cashValue ?? 0); break;
                case "1d": comparison = (b.value1dChangePct ?? 0) - (a.value1dChangePct ?? 0); break;
                case "ytd": comparison = (b.valueYtdChangePct ?? 0) - (a.valueYtdChangePct ?? 0); break;
                default: comparison = (b.totalValue ?? 0) - (a.totalValue ?? 0);
            }
            
            return sortDirection === 'asc' ? -comparison : comparison;
        });
        
        return sorted;
    }, [safeAccounts, sortField, sortDirection, searchQuery, assetTypeFilter]);

    // Quick Analysis Handlers
    const handlePerformanceClick = (account) => {
        // Ensure all string fields have defaults to prevent replace() errors
        const safeAccount = {
            ...account,
            name: account.name || '',
            account_name: account.account_name || account.name || '',
            institution: account.institution || '',
            type: account.type || '',
            account_type: account.account_type || account.type || '',
            category: account.category || '',
            account_category: account.account_category || account.category || ''
        };
        setSelectedAccount(safeAccount);
        setIsPerformanceModalOpen(true);
    };

    // Summary Row Component
    const SummaryRow = ({ label, data, bgColor = "bg-blue-900/30", borderColor = "border-blue-700" }) => (
        <tr className={`${bgColor} font-medium border-b-2 ${borderColor}`}>
            <td className="px-3 py-2 text-center whitespace-nowrap">
                <span className="font-bold">•</span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm font-bold text-white">{label}</span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-sm"></td>
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell">
                {data.positionsCount}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-bold">
                {formatCurrency(data.totalValue)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                {formatCurrency(data.cashBalance)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                {formatCurrency(data.totalCostBasis)}
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right">
                <div className="flex flex-col items-end">
                    <div className={`text-sm font-bold ${data.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {data.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(data.totalGainLoss)}
                    </div>
                    <div className={`text-xs ${data.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({data.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(data.totalGainLossPercent)})
                    </div>
                </div>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right">
                <PerformanceIndicator value={data.value1dChangePct} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right">
                <PerformanceIndicator value={data.valueYtdChangePct} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-center"></td>
        </tr>
    );

    // --- Render Logic ---
    if (loading && safeAccounts.length === 0) {
        return (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex items-center justify-center text-white">
                <div>
                    <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-gray-400">Loading accounts...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* --- Table Section --- */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center p-3 border-b border-gray-700 gap-4 text-white">
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                        <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                        {title}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search accounts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-48"
                            />
                        </div>
                        
                        {/* Filter by Type */}
                        <select
                            value={assetTypeFilter}
                            onChange={(e) => setAssetTypeFilter(e.target.value)}
                            className="px-3 py-1.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="all">All Types</option>
                            <option value="liquid">Liquid Only</option>
                            <option value="illiquid">Illiquid Only</option>
                            <option value="brokerage">Brokerage</option>
                            <option value="retirement">Retirement</option>
                            <option value="cash">Cash</option>
                        </select>
                        
                        {/* Refresh */}
                        <button
                            onClick={refresh}
                            className="p-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                            disabled={loading}
                        >
                            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-500/10 border-b border-red-500/20">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Table */}
                {safeAccounts.length === 0 && !loading ? (
                    <div className="p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
                        <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="h-8 w-8 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-medium mb-2">No accounts found</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            {searchQuery || assetTypeFilter !== "all" ? 
                                "No accounts match your search criteria." : 
                                "Add your first account to start tracking your portfolio."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-900/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-10">#</th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                                        onClick={() => handleSortChange('name')}
                                    >
                                        <div className="flex items-center">
                                            Account / Institution
                                            {getSortIndicator('name')}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Type</th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 hidden sm:table-cell"
                                        onClick={() => handleSortChange('positions')}
                                    >
                                        <div className="flex items-center justify-end">
                                            Positions
                                            {getSortIndicator('positions')}
                                        </div>
                                    </th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                                        onClick={() => handleSortChange('value')}
                                    >
                                        <div className="flex items-center justify-end">
                                            Value
                                            {getSortIndicator('value')}
                                        </div>
                                    </th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 hidden md:table-cell"
                                        onClick={() => handleSortChange('cash')}
                                    >
                                        <div className="flex items-center justify-end">
                                            Cash
                                            {getSortIndicator('cash')}
                                        </div>
                                    </th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 hidden md:table-cell"
                                        onClick={() => handleSortChange('cost_basis')}
                                    >
                                        <div className="flex items-center justify-end">
                                            Cost Basis
                                            {getSortIndicator('cost_basis')}
                                        </div>
                                    </th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                                        onClick={() => handleSortChange('gain_loss')}
                                    >
                                        <div className="flex items-center justify-end">
                                            Gain/Loss
                                            {getSortIndicator('gain_loss')}
                                        </div>
                                    </th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                                        onClick={() => handleSortChange('1d')}
                                    >
                                        <div className="flex items-center justify-end">
                                            1D
                                            {getSortIndicator('1d')}
                                        </div>
                                    </th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                                        onClick={() => handleSortChange('ytd')}
                                    >
                                        <div className="flex items-center justify-end">
                                            YTD
                                            {getSortIndicator('ytd')}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Analysis</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {/* Summary Rows */}
                                <SummaryRow label="Total NestEgg" data={totals} />
                                {liquidTotals.totalValue > 0 && (
                                    <SummaryRow 
                                        label="Liquid Assets" 
                                        data={liquidTotals} 
                                        bgColor="bg-green-900/20" 
                                        borderColor="border-green-700" 
                                    />
                                )}
                                {illiquidTotals.totalValue > 0 && (
                                    <SummaryRow 
                                        label="Illiquid Assets" 
                                        data={illiquidTotals} 
                                        bgColor="bg-orange-900/20" 
                                        borderColor="border-orange-700" 
                                    />
                                )}

                                {/* Individual Account Rows */}
                                {filteredAndSortedAccounts.map((account, index) => {
                                    const Logo = getInstitutionLogo(account.institution);
                                    const isLiquid = account.category !== 'other_assets';
                                    
                                    return (
                                        <tr 
                                            key={account.id}
                                            className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className="text-sm text-gray-300">{index + 1}</span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 mr-3">
                                                        {Logo && <Logo />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{account.name}</div>
                                                        <div className="text-xs text-gray-400">{account.institution}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">
                                                {account.type}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-300 hidden sm:table-cell">
                                                {account.totalPositions}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                {formatCurrency(account.totalValue)}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-300 hidden md:table-cell">
                                                {formatCurrency(account.cashValue)}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-300 hidden md:table-cell">
                                                {formatCurrency(account.totalCostBasis)}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className={`text-sm font-medium ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {account.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss)}
                                                    </div>
                                                    <div className={`text-xs ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        ({account.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(account.totalGainLossPercent)})
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <PerformanceIndicator value={account.value1dChangePct} />
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <PerformanceIndicator value={account.valueYtdChangePct} />
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handlePerformanceClick(account)}
                                                    className="p-1.5 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/40"
                                                    title="View Performance"
                                                >
                                                    <LineChart className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Performance Modal */}
            <PerformanceModal 
                isOpen={isPerformanceModalOpen}
                onClose={() => setIsPerformanceModalOpen(false)}
                account={selectedAccount}
            />
        </>
    );
};

export default UnifiedAccountTable2;