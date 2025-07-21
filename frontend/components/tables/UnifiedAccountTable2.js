// frontend/components/tables/UnifiedAccountTable2.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Store hooks
import { useAccounts } from '@/store/hooks';

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
        <span className={`${colorClass} ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}>
            {formattedValue}
        </span>
    );
};

// Account Performance Modal Component
const AccountPerformanceModal = ({ isOpen, onClose, account }) => {
    if (!account) return null;

    const performancePeriods = [
        { label: '1 Day', value: account.value1dChangePct || 0, amount: account.value1dChange || 0 },
        { label: '1 Week', value: account.value1wChangePct || 0, amount: account.value1wChange || 0 },
        { label: '1 Month', value: account.value1mChangePct || 0, amount: account.value1mChange || 0 },
        { label: '3 Months', value: account.value3mChangePct || 0, amount: account.value3mChange || 0 },
        { label: 'YTD', value: account.valueYtdChangePct || 0, amount: account.valueYtdChange || 0 },
        { label: '1 Year', value: account.value1yChangePct || 0, amount: account.value1yChange || 0 },
    ];

    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <LineChart className="w-5 h-5 text-blue-500" />
                    <span>Performance Analysis: {account.name}</span>
                </div>
            }
            size="max-w-4xl"
        >
            <div className="space-y-6">
                {/* Account Overview */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Current Value</p>
                            <p className="text-xl font-bold">{formatCurrency(account.totalValue || 0)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Cost Basis</p>
                            <p className="text-xl font-bold">{formatCurrency(account.totalCostBasis || 0)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Gain/Loss</p>
                            <p className={`text-xl font-bold ${(account.totalGainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(account.totalGainLoss || 0) >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss || 0)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Return %</p>
                            <p className={`text-xl font-bold ${(account.totalGainLossPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <PerformanceIndicator value={account.totalGainLossPercent || 0} size="lg" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Grid */}
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Historical Performance
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {performancePeriods.map((period) => (
                            <div 
                                key={period.label}
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-medium text-gray-600">{period.label}</span>
                                    {period.value > 0 ? (
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                    ) : period.value < 0 ? (
                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <Minus className="w-4 h-4 text-gray-400" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className={`text-lg font-semibold ${period.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        <PerformanceIndicator value={period.value} size="lg" />
                                    </p>
                                    <p className={`text-sm ${period.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {period.amount >= 0 ? '+' : ''}{formatCurrency(period.amount)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Asset Allocation */}
                <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        Asset Allocation
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Securities', value: account.securityValue || 0, color: 'bg-blue-500' },
                            { label: 'Crypto', value: account.cryptoValue || 0, color: 'bg-purple-500' },
                            { label: 'Cash', value: account.cashValue || 0, color: 'bg-green-500' },
                            { label: 'Metals', value: account.metalValue || 0, color: 'bg-yellow-500' },
                            { label: 'Other Assets', value: account.otherAssetsValue || 0, color: 'bg-gray-500' },
                        ].filter(item => item.value > 0).map((item) => {
                            const percentage = (account.totalValue || 0) > 0 ? (item.value / account.totalValue) * 100 : 0;
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

    // Separate liquid and illiquid accounts
    const { liquidAccounts, illiquidAccounts } = useMemo(() => {
        if (!accounts || accounts.length === 0) return { liquidAccounts: [], illiquidAccounts: [] };
        
        const liquid = accounts.filter(acc => acc.category !== 'other_assets');
        const illiquid = accounts.filter(acc => acc.category === 'other_assets');
        
        return { liquidAccounts: liquid, illiquidAccounts: illiquid };
    }, [accounts]);

    // Calculate totals for different categories
    const { totals, liquidTotals, illiquidTotals } = useMemo(() => {
        if (!accounts || accounts.length === 0) {
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
            }, { 
                totalValue: 0, 
                totalCostBasis: 0, 
                totalGainLoss: 0, 
                positionsCount: 0,
                cashBalance: 0,
                value1dChange: 0,
                valueYtdChange: 0
            });
            
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
            totals: calculateTotals(accounts),
            liquidTotals: calculateTotals(liquidAccounts),
            illiquidTotals: calculateTotals(illiquidAccounts)
        };
    }, [accounts, liquidAccounts, illiquidAccounts]);

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
        let filtered = accounts || [];
        
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
                    case "brokerage": return acc.category === "brokerage";
                    case "retirement": return acc.category === "retirement";
                    case "cash": return acc.category === "cash";
                    case "other_assets": return acc.category === "other_assets";
                    default: return true;
                }
            });
        }
        
        if (!Array.isArray(filtered)) return [];

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
    }, [accounts, sortField, sortDirection, searchQuery, assetTypeFilter]);

    // Quick Analysis Handlers
    const handlePerformanceClick = (account) => {
        setSelectedAccount(account);
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
    if (loading && !accounts?.length) {
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
                        <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                        {title}
                    </h2>
                    <div className='flex flex-wrap items-center gap-4'>
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                            <input 
                                type="text" 
                                className="bg-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" 
                                placeholder="Search accounts..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                        
                        {/* Asset Type Filter */}
                        <div className="relative">
                            <Filter className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                            <select 
                                className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" 
                                value={assetTypeFilter}
                                onChange={(e) => setAssetTypeFilter(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                <option value="brokerage">Brokerage</option>
                                <option value="retirement">Retirement</option>
                                <option value="cash">Cash</option>
                                <option value="other_assets">Other Assets</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        
                        {/* Sort Select */}
                        <div className="relative">
                            <SlidersHorizontal className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                            <select 
                                className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" 
                                value={`${sortField}-${sortDirection === 'asc' ? 'low' : 'high'}`}
                                onChange={(e) => {
                                    const [field, direction] = e.target.value.split('-');
                                    setSortField(field);
                                    setSortDirection(direction === 'low' ? 'asc' : 'desc');
                                }}
                            >
                                <option value="value-high">Sort: Value (High-Low)</option>
                                <option value="value-low">Sort: Value (Low-High)</option>
                                <option value="name-high">Sort: Name (A-Z)</option>
                                <option value="name-low">Sort: Name (Z-A)</option>
                                <option value="institution-high">Sort: Institution (A-Z)</option>
                                <option value="institution-low">Sort: Institution (Z-A)</option>
                                <option value="cost_basis-high">Sort: Cost Basis (High-Low)</option>
                                <option value="cost_basis-low">Sort: Cost Basis (Low-High)</option>
                                <option value="gain_loss-high">Sort: Gain $ (High-Low)</option>
                                <option value="gain_loss-low">Sort: Gain $ (Low-High)</option>
                                <option value="positions-high">Sort: Positions (High-Low)</option>
                                <option value="positions-low">Sort: Positions (Low-High)</option>
                                <option value="cash-high">Sort: Cash (High-Low)</option>
                                <option value="cash-low">Sort: Cash (Low-High)</option>
                                <option value="1d-high">Sort: 1D % (High-Low)</option>
                                <option value="1d-low">Sort: 1D % (Low-High)</option>
                                <option value="ytd-high">Sort: YTD % (High-Low)</option>
                                <option value="ytd-low">Sort: YTD % (Low-High)</option>
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
                {filteredAndSortedAccounts.length === 0 && !loading ? (
                    <div className="p-6 text-center text-gray-400">No accounts match your criteria.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700 text-white">
                            <thead className="bg-gray-900/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-10">#</th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('institution')}
                                    >
                                        Institution {getSortIndicator('institution')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('name')}
                                    >
                                        Account Name {getSortIndicator('name')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell w-20 cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('positions')}
                                    >
                                        Positions {getSortIndicator('positions')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('value')}
                                    >
                                        Value {getSortIndicator('value')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell w-28 cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('cash')}
                                    >
                                        Cash {getSortIndicator('cash')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell w-28 cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('cost_basis')}
                                    >
                                        Cost Basis {getSortIndicator('cost_basis')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('gain_loss')}
                                    >
                                        Gain/Loss {getSortIndicator('gain_loss')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('1d')}
                                    >
                                        1D % {getSortIndicator('1d')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-800/50"
                                        onClick={() => handleSortChange('ytd')}
                                    >
                                        YTD % {getSortIndicator('ytd')}
                                    </th>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-20">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {/* Total NestEgg Summary Row */}
                                <SummaryRow label="Total NestEgg" data={totals} />
                                
                                {/* Liquid Accounts Summary Row (exclude other_assets) */}
                                <SummaryRow 
                                    label="Liquid Accounts" 
                                    data={liquidTotals} 
                                    bgColor="bg-green-900/20" 
                                    borderColor="border-green-700" 
                                />
                                
                                {/* Illiquid Accounts Summary Row (only other_assets) */}
                                {illiquidTotals.totalValue > 0 && (
                                    <SummaryRow 
                                        label="Illiquid Accounts" 
                                        data={illiquidTotals} 
                                        bgColor="bg-purple-900/20" 
                                        borderColor="border-purple-700" 
                                    />
                                )}
                                
                                {/* Regular account rows */}
                                {filteredAndSortedAccounts.map((account, index) => {
                                    const LogoComponent = getInstitutionLogo(account.institution);

                                    return (
                                        <tr 
                                            key={account.id} 
                                            className="hover:bg-gray-700/50 transition-colors"
                                        >
                                            {/* Rank Number */}
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className="text-sm text-gray-300">{index + 1}</span>
                                            </td>
                                            
                                            {/* Institution */}
                                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                <div className="flex items-center max-w-xs">
                                                    {typeof LogoComponent === 'string'
                                                        ? <img src={LogoComponent} alt={account.institution || ''} className="w-5 h-5 object-contain mr-2 rounded-sm flex-shrink-0"/>
                                                        : LogoComponent
                                                            ? <div className="w-5 h-5 mr-2 flex items-center justify-center"><LogoComponent /></div>
                                                            : (account.institution &&
                                                                <div className="flex-shrink-0 h-5 w-5 rounded-sm bg-gray-600 flex items-center justify-center mr-2 text-xs font-medium text-gray-300">
                                                                    {account.institution.charAt(0).toUpperCase()}
                                                                </div>
                                                              )
                                                    }
                                                    <span className="break-words whitespace-normal">{account.institution || "N/A"}</span>
                                                </div>
                                            </td>
                                            
                                            {/* Account Name + Type */}
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium">{account.name}</div>
                                                    {account.type && (
                                                        <div className="text-xs text-gray-400 italic">{account.type}</div>
                                                    )}
                                                </div>
                                            </td>
                                            
                                            {/* Positions Count */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell">
                                                {account.totalPositions || 0}
                                            </td>
                                            
                                            {/* Value */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                {formatCurrency(account.totalValue || 0)}
                                            </td>
                                            
                                            {/* Cash Balance */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                                {formatCurrency(account.cashValue || 0)}
                                            </td>
                                            
                                            {/* Cost Basis */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                                {formatCurrency(account.totalCostBasis || 0)}
                                            </td>
                                            
                                            {/* Gain/Loss */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className={`text-sm font-medium ${(account.totalGainLoss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {(account.totalGainLoss || 0) >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss || 0)}
                                                    </div>
                                                    <div className={`text-xs ${(account.totalGainLoss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        ({(account.totalGainLoss || 0) >= 0 ? '+' : ''}{formatPercentage(account.totalGainLossPercent || 0)})
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* 1D % */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <PerformanceIndicator value={account.value1dChangePct || 0} />
                                            </td>
                                            
                                            {/* YTD % */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <PerformanceIndicator value={account.valueYtdChangePct || 0} />
                                            </td>
                                            
                                            {/* Quick Analysis Actions */}
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <button 
                                                    onClick={() => handlePerformanceClick(account)}
                                                    className="p-1.5 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/40 transition-colors" 
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

            {/* --- Modals --- */}
            <AccountPerformanceModal
                isOpen={isPerformanceModalOpen}
                onClose={() => setIsPerformanceModalOpen(false)}
                account={selectedAccount}
            />
        </>
    );
};

export default UnifiedAccountTable2;