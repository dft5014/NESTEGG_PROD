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
    Filter,
    X
} from 'lucide-react';

// Performance Indicator Component
const PerformanceIndicator = ({ value, format = 'percentage', size = 'sm', showSign = true }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    const colorClass = isNeutral ? 'text-gray-400' : isPositive ? 'text-green-500' : 'text-red-500';
    
    const formattedValue = format === 'percentage' 
        ? `${value > 0 && showSign ? '+' : ''}${value.toFixed(2)}%`
        : formatCurrency(Math.abs(value));
    
    return (
        <span className={`${colorClass} ${size === 'sm' ? 'text-sm' : 'text-base'} font-medium flex items-center`}>
            {formattedValue}
        </span>
    );
};

// Multi-select dropdown component
const MultiSelectDropdown = ({ options, selected, onChange, placeholder, defaultSelected = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
        if (selected.length === 0 && defaultSelected.length > 0) {
            onChange(defaultSelected);
        }
    }, [selected.length, defaultSelected, onChange]);

    const handleToggle = (value) => {
        if (selected.includes(value)) {
            onChange(selected.filter(item => item !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const displayText = selected.length === 0 
        ? placeholder 
        : selected.length === options.length 
            ? "All Types" 
            : `${selected.length} selected`;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex items-center justify-between min-w-[120px]"
            >
                <span>{displayText}</span>
                <ChevronDown className={`w-4 h-4 ml-2 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-50 min-w-[200px]">
                    <div className="p-2 space-y-1">
                        {options.map(option => (
                            <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-600 p-1 rounded">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option.value)}
                                    onChange={() => handleToggle(option.value)}
                                    className="text-blue-500"
                                />
                                <span className="text-sm text-white">{option.label}</span>
                            </label>
                        ))}
                    </div>
                    <div className="border-t border-gray-600 p-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-gray-400 hover:text-white"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Performance Modal Component
const PerformanceModal = ({ isOpen, onClose, account }) => {
    if (!isOpen || !account) return null;

    const performanceData = [
        { period: '1D', value: account.value1dChangePct || 0, dollarChange: account.value1dChange || 0 },
        { period: '1W', value: account.value1wChangePct || 0, dollarChange: account.value1wChange || 0 },
        { period: '1M', value: account.value1mChangePct || 0, dollarChange: account.value1mChange || 0 },
        { period: 'YTD', value: account.valueYtdChangePct || 0, dollarChange: account.valueYtdChange || 0 }
    ];

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
                            {formatCurrency(account.totalGainLoss || 0)}
                        </p>
                        <p className={`text-sm ${(account.totalGainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({formatPercentage(account.totalGainLossPercent || 0)})
                        </p>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4">Performance Trends</h4>
                    <div className="grid grid-cols-4 gap-4">
                        {performanceData.map((item) => (
                            <div key={item.period} className="text-center">
                                <div className="text-xs text-gray-500 mb-1">{item.period}</div>
                                <div className={`text-lg font-bold ${item.value === 0 ? 'text-gray-400' : item.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    <PerformanceIndicator value={item.value} />
                                </div>
                                <div className="text-xs text-gray-500">
                                    {formatCurrency(item.dollarChange)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Account Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3">Account Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Institution:</span>
                            <div className="font-medium">{account.institution || 'N/A'}</div>
                        </div>
                        <div>
                            <span className="text-gray-600">Account Type:</span>
                            <div className="font-medium">{account.type || 'N/A'}</div>
                        </div>
                        <div>
                            <span className="text-gray-600">Total Positions:</span>
                            <div className="font-medium">{account.totalPositions || 0}</div>
                        </div>
                        <div>
                            <span className="text-gray-600">Cash Balance:</span>
                            <div className="font-medium">{formatCurrency(account.cashValue || 0)}</div>
                        </div>
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

// Asset type classification helper
const isLiquidAsset = (account) => {
    // Consider these asset types as liquid: securities, crypto, cash, metals
    // Consider these as illiquid: real estate, vehicles, other assets
    const liquidCategories = ['brokerage', 'retirement', 'cash', 'banking'];
    const illiquidCategories = ['other_assets'];
    
    if (illiquidCategories.includes(account.category)) return false;
    if (liquidCategories.includes(account.category)) return true;
    
    // Fallback: check asset types if available
    const liquidAssetTypes = ['security', 'crypto', 'cash', 'metal'];
    const illiquidAssetTypes = ['real_estate', 'vehicle', 'other_asset'];
    
    // If we have asset_type information, use it
    if (account.asset_type && illiquidAssetTypes.includes(account.asset_type)) return false;
    if (account.asset_type && liquidAssetTypes.includes(account.asset_type)) return true;
    
    // Default to liquid for unknown types
    return true;
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
    const [assetTypeFilter, setAssetTypeFilter] = useState([]);

    // Ensure accounts is always an array
    const safeAccounts = useMemo(() => {
        return Array.isArray(accounts) ? accounts : [];
    }, [accounts]);

    // Asset type options for filter
    const assetTypeOptions = useMemo(() => {
        const options = [
            { value: 'security', label: 'Securities' },
            { value: 'crypto', label: 'Crypto' },
            { value: 'cash', label: 'Cash' },
            { value: 'metal', label: 'Metals' },
            { value: 'real_estate', label: 'Real Estate' },
            { value: 'vehicle', label: 'Vehicles' },
            { value: 'other_asset', label: 'Other Assets' }
        ];
        return options;
    }, []);

    // Default to liquid assets only
    const defaultLiquidTypes = useMemo(() => {
        return ['security', 'crypto', 'cash', 'metal'];
    }, []);

    // Separate liquid and illiquid accounts
    const { liquidAccounts, illiquidAccounts } = useMemo(() => {
        if (safeAccounts.length === 0) return { liquidAccounts: [], illiquidAccounts: [] };
        
        const liquid = safeAccounts.filter(acc => isLiquidAsset(acc));
        const illiquid = safeAccounts.filter(acc => !isLiquidAsset(acc));
        
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
            value1wChange: 0,
            value1wChangePct: 0,
            value1mChange: 0,
            value1mChangePct: 0,
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
                acc.value1wChange += account.value1wChange ?? 0;
                acc.value1mChange += account.value1mChange ?? 0;
                acc.valueYtdChange += account.valueYtdChange ?? 0;
                return acc;
            }, { ...emptyTotals });
            
            // Calculate percentages
            result.totalGainLossPercent = result.totalCostBasis > 0 
                ? (result.totalGainLoss / result.totalCostBasis) * 100
                : 0;
                
            // Calculate performance percentages based on previous values
            const prev1dValue = result.totalValue - result.value1dChange;
            const prev1wValue = result.totalValue - result.value1wChange;
            const prev1mValue = result.totalValue - result.value1mChange;
            const prevYtdValue = result.totalValue - result.valueYtdChange;
            
            result.value1dChangePct = prev1dValue > 0 ? (result.value1dChange / prev1dValue) * 100 : 0;
            result.value1wChangePct = prev1wValue > 0 ? (result.value1wChange / prev1wValue) * 100 : 0;
            result.value1mChangePct = prev1mValue > 0 ? (result.value1mChange / prev1mValue) * 100 : 0;
            result.valueYtdChangePct = prevYtdValue > 0 ? (result.valueYtdChange / prevYtdValue) * 100 : 0;
                
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
        if (assetTypeFilter.length > 0) {
            filtered = filtered.filter(acc => {
                if (assetTypeFilter.includes('security') && isLiquidAsset(acc) && acc.category !== 'cash') return true;
                if (assetTypeFilter.includes('crypto') && acc.category === 'brokerage') return true; // Assuming crypto is in brokerage accounts
                if (assetTypeFilter.includes('cash') && acc.category === 'cash') return true;
                if (assetTypeFilter.includes('metal') && acc.category === 'brokerage') return true; // Assuming metals are in brokerage accounts
                if (assetTypeFilter.includes('real_estate') && !isLiquidAsset(acc)) return true;
                if (assetTypeFilter.includes('vehicle') && !isLiquidAsset(acc)) return true;
                if (assetTypeFilter.includes('other_asset') && !isLiquidAsset(acc)) return true;
                return false;
            });
        }

        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case "value": comparison = (b.totalValue ?? 0) - (a.totalValue ?? 0); break;
                case "cost_basis": comparison = (b.totalCostBasis ?? 0) - (a.totalCostBasis ?? 0); break;
                case "name": comparison = (a.name || '').localeCompare(b.name || ''); break;
                case "positions": comparison = (b.totalPositions ?? 0) - (a.totalPositions ?? 0); break;
                case "cash": comparison = (b.cashValue ?? 0) - (a.cashValue ?? 0); break;
                case "1d": comparison = (b.value1dChangePct ?? 0) - (a.value1dChangePct ?? 0); break;
                case "1w": comparison = (b.value1wChangePct ?? 0) - (a.value1wChangePct ?? 0); break;
                case "1m": comparison = (b.value1mChangePct ?? 0) - (a.value1mChangePct ?? 0); break;
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
                    <div className={`text-sm font-bold ${data.totalGainLoss === 0 ? 'text-gray-400' : data.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {data.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(data.totalGainLoss)}
                    </div>
                    <div className={`text-xs ${data.totalGainLossPercent === 0 ? 'text-gray-400' : data.totalGainLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <PerformanceIndicator value={data.totalGainLossPercent} />
                    </div>
                </div>
            </td>
            {/* Performance columns for summary */}
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden lg:table-cell">
                <PerformanceIndicator value={data.value1dChangePct} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                <PerformanceIndicator value={data.value1wChangePct} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                <PerformanceIndicator value={data.value1mChangePct} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                <PerformanceIndicator value={data.valueYtdChangePct} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-center">
                {/* Empty for trends column */}
            </td>
        </tr>
    );

    if (loading && safeAccounts.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <Loader className="animate-spin w-8 h-8 text-blue-500" />
                        <span className="ml-3 text-gray-300">Loading accounts...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <p className="text-sm text-gray-400">
                            {filteredAndSortedAccounts.length} account{filteredAndSortedAccounts.length !== 1 ? 's' : ''} 
                            {isStale && <span className="text-orange-400 ml-2">• Data may be outdated</span>}
                        </p>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search accounts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-1.5 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-48"
                            />
                        </div>
                        
                        {/* Filter by Type */}
                        <MultiSelectDropdown
                            options={assetTypeOptions}
                            selected={assetTypeFilter}
                            onChange={setAssetTypeFilter}
                            placeholder="Filter by Type"
                            defaultSelected={defaultLiquidTypes}
                        />
                        
                        {/* Refresh */}
                        <button
                            onClick={refresh}
                            className="p-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                            disabled={loading}
                        >
                            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}
            </div>

            {/* Table */}
            {safeAccounts.length === 0 && !loading ? (
                <div className="p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
                    <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">No accounts found</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        {searchQuery || assetTypeFilter.length > 0 ? 
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
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Return</th>
                                <th scope="col" 
                                    className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 hidden lg:table-cell"
                                    onClick={() => handleSortChange('1d')}
                                >
                                    <div className="flex items-center justify-end">
                                        1D
                                        {getSortIndicator('1d')}
                                    </div>
                                </th>
                                <th scope="col" 
                                    className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 hidden xl:table-cell"
                                    onClick={() => handleSortChange('1w')}
                                >
                                    <div className="flex items-center justify-end">
                                        1W
                                        {getSortIndicator('1w')}
                                    </div>
                                </th>
                                <th scope="col" 
                                    className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 hidden xl:table-cell"
                                    onClick={() => handleSortChange('1m')}
                                >
                                    <div className="flex items-center justify-end">
                                        1M
                                        {getSortIndicator('1m')}
                                    </div>
                                </th>
                                <th scope="col" 
                                    className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 hidden xl:table-cell"
                                    onClick={() => handleSortChange('ytd')}
                                >
                                    <div className="flex items-center justify-end">
                                        YTD
                                        {getSortIndicator('ytd')}
                                    </div>
                                </th>
                                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Trends</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {/* Total Row */}
                            <SummaryRow 
                                label="Total Portfolio" 
                                data={totals} 
                                bgColor="bg-blue-900/30" 
                                borderColor="border-blue-700" 
                            />
                            
                            {/* Liquid Assets Total */}
                            {liquidTotals.totalValue > 0 && (
                                <SummaryRow 
                                    label="Liquid Assets" 
                                    data={liquidTotals} 
                                    bgColor="bg-green-900/20" 
                                    borderColor="border-green-700" 
                                />
                            )}
                            
                            {/* Illiquid Assets Total */}
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
                                const isLiquid = isLiquidAsset(account);
                                
                                return (
                                    <tr 
                                        key={account.id}
                                        className="hover:bg-gray-700/50 transition-colors"
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
                                                    <div className="text-sm font-medium text-white">
                                                        {account.name || account.account_name}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {account.institution}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">
                                            <div className="flex items-center">
                                                {account.type}
                                                {!isLiquid && (
                                                    <span className="ml-2 px-2 py-1 text-xs bg-orange-900/50 text-orange-200 rounded-full">
                                                        Illiquid
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-300 hidden sm:table-cell">
                                            {account.totalPositions || 0}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium text-white">
                                            {formatCurrency(account.totalValue || 0)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-300 hidden md:table-cell">
                                            {formatCurrency(account.cashValue || 0)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-300 hidden md:table-cell">
                                            {formatCurrency(account.totalCostBasis || 0)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                                <div className={`text-sm font-bold ${(account.totalGainLoss ?? 0) === 0 ? 'text-gray-400' : (account.totalGainLoss ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {(account.totalGainLoss ?? 0) >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss || 0)}
                                                </div>
                                                <div className={`text-xs ${(account.totalGainLossPercent ?? 0) === 0 ? 'text-gray-400' : (account.totalGainLossPercent ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    <PerformanceIndicator value={(account.totalGainLossPercent || 0) * 100} />
                                                </div>
                                            </div>
                                        </td>
                                        {/* Performance columns */}
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden lg:table-cell">
                                            <div title={`${formatCurrency(account.value1dChange || 0)} change`}>
                                                <PerformanceIndicator value={(account.value1dChangePct || 0) * 100} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                                            <div title={`${formatCurrency(account.value1wChange || 0)} change`}>
                                                <PerformanceIndicator value={(account.value1wChangePct || 0) * 100} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                                            <div title={`${formatCurrency(account.value1mChange || 0)} change`}>
                                                <PerformanceIndicator value={(account.value1mChangePct || 0) * 100} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden xl:table-cell">
                                            <div title={`${formatCurrency(account.valueYtdChange || 0)} change`}>
                                                <PerformanceIndicator value={(account.valueYtdChangePct || 0) * 100} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => handlePerformanceClick(account)}
                                                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                                                title="View performance details"
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Performance Modal */}
            <PerformanceModal
                isOpen={isPerformanceModalOpen}
                onClose={() => setIsPerformanceModalOpen(false)}
                account={selectedAccount}
            />
        </div>
    );
};

export default UnifiedAccountTable2;