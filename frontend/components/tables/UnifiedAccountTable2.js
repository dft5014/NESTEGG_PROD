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
    X,
    Calendar,
    DollarSign,
    Percent,
    Eye,
    PieChart
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
        <span className={`${colorClass} ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium flex items-center`}>
            {formattedValue}
        </span>
    );
};

// Account Detail Modal Component
const AccountDetailModal = ({ isOpen, onClose, account }) => {
    if (!account) return null;

    // Performance data for different time periods
    const performanceData = [
        { 
            label: '1D', 
            value: account.value1dChangePct || 0,
            dollarChange: account.value1dChange || 0,
            color: (account.value1dChangePct || 0) >= 0 ? 'text-green-500' : 'text-red-500'
        },
        { 
            label: '1W', 
            value: account.value1wChangePct || 0,
            dollarChange: account.value1wChange || 0,
            color: (account.value1wChangePct || 0) >= 0 ? 'text-green-500' : 'text-red-500'
        },
        { 
            label: '1M', 
            value: account.value1mChangePct || 0,
            dollarChange: account.value1mChange || 0,
            color: (account.value1mChangePct || 0) >= 0 ? 'text-green-500' : 'text-red-500'
        },
        { 
            label: 'YTD', 
            value: account.valueYtdChangePct || 0,
            dollarChange: account.valueYtdChange || 0,
            color: (account.valueYtdChangePct || 0) >= 0 ? 'text-green-500' : 'text-red-500'
        }
    ];

    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center space-x-3">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    <span>{account.name || account.account_name || 'Account Details'}</span>
                </div>
            }
            size="max-w-3xl"
        >
            <div className="space-y-6">
                {/* Account Overview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                        <Info className="w-4 h-4 mr-2 text-blue-500" />
                        Account Overview
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-gray-600 text-sm">Institution</span>
                            <div className="font-medium">{account.institution || 'N/A'}</div>
                        </div>
                        <div>
                            <span className="text-gray-600 text-sm">Account Type</span>
                            <div className="font-medium">{account.type || 'N/A'}</div>
                        </div>
                        <div>
                            <span className="text-gray-600 text-sm">Total Value</span>
                            <div className="font-medium text-lg">{formatCurrency(account.totalValue || 0)}</div>
                        </div>
                        <div>
                            <span className="text-gray-600 text-sm">Cash Balance</span>
                            <div className="font-medium">{formatCurrency(account.cashValue || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* Performance Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                        Performance
                    </h4>
                    <div className="grid grid-cols-4 gap-4">
                        {performanceData.map((item) => (
                            <div key={item.label} className="text-center">
                                <div className="text-sm font-medium text-gray-600">{item.label}</div>
                                <div className={`text-lg font-bold ${item.color}`}>
                                    <PerformanceIndicator value={item.value} />
                                </div>
                                <div className="text-xs text-gray-500">
                                    {formatCurrency(item.dollarChange)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Holdings Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-3 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
                        Holdings Summary
                    </h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Positions</span>
                            <span className="font-medium">{account.totalPositions || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Securities</span>
                            <span className="font-medium">{account.securityPositions || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Cost Basis</span>
                            <span className="font-medium">{formatCurrency(account.totalCostBasis || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Gain/Loss</span>
                            <span className={`font-medium ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {formatCurrency(account.totalGainLoss || 0)} ({formatPercentage(account.totalGainLossPercent || 0)})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Asset Allocation */}
                {(account.securityValue || account.cryptoValue || account.cashValue) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold mb-3 flex items-center">
                            <PieChart className="w-4 h-4 mr-2 text-indigo-500" />
                            Asset Allocation
                        </h4>
                        <div className="space-y-2">
                            {account.securityValue > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Securities</span>
                                    <span className="font-medium">{formatCurrency(account.securityValue)}</span>
                                </div>
                            )}
                            {account.cryptoValue > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Crypto</span>
                                    <span className="font-medium">{formatCurrency(account.cryptoValue)}</span>
                                </div>
                            )}
                            {account.cashValue > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Cash</span>
                                    <span className="font-medium">{formatCurrency(account.cashValue)}</span>
                                </div>
                            )}
                            {account.metalValue > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Metals</span>
                                    <span className="font-medium">{formatCurrency(account.metalValue)}</span>
                                </div>
                            )}
                            {account.otherAssetsValue > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Other Assets</span>
                                    <span className="font-medium">{formatCurrency(account.otherAssetsValue)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Additional Metrics */}
                {(account.liquidValue || account.illiquidValue || account.yieldPercent) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold mb-3 flex items-center">
                            <Activity className="w-4 h-4 mr-2 text-orange-500" />
                            Additional Metrics
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            {account.liquidValue !== undefined && (
                                <div>
                                    <span className="text-gray-600 text-sm">Liquid Value</span>
                                    <div className="font-medium">{formatCurrency(account.liquidValue)}</div>
                                </div>
                            )}
                            {account.illiquidValue !== undefined && (
                                <div>
                                    <span className="text-gray-600 text-sm">Illiquid Value</span>
                                    <div className="font-medium">{formatCurrency(account.illiquidValue)}</div>
                                </div>
                            )}
                            {account.yieldPercent !== undefined && (
                                <div>
                                    <span className="text-gray-600 text-sm">Yield</span>
                                    <div className="font-medium">{formatPercentage(account.yieldPercent)}</div>
                                </div>
                            )}
                            {account.dividendIncomeAnnual !== undefined && (
                                <div>
                                    <span className="text-gray-600 text-sm">Annual Dividends</span>
                                    <div className="font-medium">{formatCurrency(account.dividendIncomeAnnual)}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </FixedModal>
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
                <div className="absolute top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                    <div className="p-2">
                        <button
                            onClick={() => {
                                onChange(selected.length === options.length ? [] : options.map(opt => opt.value));
                            }}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded"
                        >
                            {selected.length === options.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="border-t border-gray-700">
                        {options.map(option => (
                            <label
                                key={option.value}
                                className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option.value)}
                                    onChange={() => handleToggle(option.value)}
                                    className="mr-2"
                                />
                                <span className="text-sm">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
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
    const liquidCategories = ['brokerage', 'retirement', 'cash', 'banking'];
    const illiquidCategories = ['other_assets'];
    
    if (illiquidCategories.includes(account.category)) return false;
    if (liquidCategories.includes(account.category)) return true;
    
    // Fallback: check asset types if available
    const liquidAssetTypes = ['security', 'crypto', 'cash', 'metal'];
    const illiquidAssetTypes = ['real_estate', 'vehicle', 'other_asset'];
    
    if (account.asset_type && illiquidAssetTypes.includes(account.asset_type)) return false;
    if (account.asset_type && liquidAssetTypes.includes(account.asset_type)) return true;
    
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
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
            totalGainLossPercent: 0
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
                return acc;
            }, { ...emptyTotals });
            
            // Calculate percentages
            result.totalGainLossPercent = result.totalCostBasis > 0 
                ? (result.totalGainLoss / result.totalCostBasis) * 100
                : 0;
                
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
            <ChevronUp className="w-3 h-3 ml-1 inline" /> : 
            <ChevronDown className="w-3 h-3 ml-1 inline" />;
    };

    // Filter and sort accounts
    const filteredAndSortedAccounts = useMemo(() => {
        // Apply filters
        let filtered = safeAccounts.filter(account => {
            const matchesSearch = searchQuery === '' || 
                (account.name && account.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (account.institution && account.institution.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (account.type && account.type.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesAssetType = assetTypeFilter.length === 0 || 
                assetTypeFilter.some(filter => {
                    // Check various asset type fields
                    if (filter === 'security' && account.securityValue > 0) return true;
                    if (filter === 'crypto' && account.cryptoValue > 0) return true;
                    if (filter === 'cash' && account.cashValue > 0) return true;
                    if (filter === 'metal' && account.metalValue > 0) return true;
                    if (filter === 'other_asset' && account.otherAssetsValue > 0) return true;
                    return false;
                });
            
            return matchesSearch && matchesAssetType;
        });
        
        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;
            
            switch (sortField) {
                case "name": comparison = (a.name || '').localeCompare(b.name || ''); break;
                case "institution": comparison = (a.institution || '').localeCompare(b.institution || ''); break;
                case "type": comparison = (a.type || '').localeCompare(b.type || ''); break;
                case "positions": comparison = (b.totalPositions ?? 0) - (a.totalPositions ?? 0); break;
                case "value": comparison = (b.totalValue ?? 0) - (a.totalValue ?? 0); break;
                case "gain_loss": comparison = (b.totalGainLoss ?? 0) - (a.totalGainLoss ?? 0); break;
                case "gain_loss_pct": comparison = (b.totalGainLossPercent ?? 0) - (a.totalGainLossPercent ?? 0); break;
                default: comparison = (b.totalValue ?? 0) - (a.totalValue ?? 0);
            }
            
            return sortDirection === 'asc' ? -comparison : comparison;
        });
        
        return sorted;
    }, [safeAccounts, sortField, sortDirection, searchQuery, assetTypeFilter]);

    // Handle row click
    const handleRowClick = (account) => {
        setSelectedAccount(account);
        setIsDetailModalOpen(true);
    };

    // Summary Row Component
    const SummaryRow = ({ label, data, bgColor = "bg-blue-900/30", borderColor = "border-blue-700" }) => (
        <tr className={`${bgColor} font-medium border-b-2 ${borderColor}`}>
            <td className="px-3 py-2 text-center whitespace-nowrap">
                <span className="font-bold">•</span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap" colSpan="2">
                <span className="text-sm font-bold text-white">{label}</span>
            </td>
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
                    <div className={`text-xs ${data.totalGainLoss === 0 ? 'text-gray-400' : data.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({data.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(data.totalGainLossPercent)})
                    </div>
                </div>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-center" colSpan="5">
                {/* Performance columns empty for summary */}
            </td>
        </tr>
    );

    // Loading state
    if (loading) {
        return (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex items-center justify-center text-white">
                <div>
                    <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-gray-400">Loading accounts...</p>
                </div>
            </div>
        );
    }

    // Main render
    return (
        <>
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                            <p className="text-sm text-gray-400">
                                {safeAccounts.length} account{safeAccounts.length !== 1 ? 's' : ''} 
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
                                        onClick={() => handleSortChange('institution')}
                                    >
                                        <div className="flex items-center">
                                            Institution
                                            {getSortIndicator('institution')}
                                        </div>
                                    </th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                                        onClick={() => handleSortChange('name')}
                                    >
                                        <div className="flex items-center">
                                            Account Name
                                            {getSortIndicator('name')}
                                        </div>
                                    </th>
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
                                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Cash</th>
                                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Cost</th>
                                    <th scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300"
                                        onClick={() => handleSortChange('gain_loss')}
                                    >
                                        <div className="flex items-center justify-end">
                                            Gain/Loss
                                            {getSortIndicator('gain_loss')}
                                        </div>
                                    </th>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider" colSpan="5">
                                        <div className="text-center">Performance</div>
                                        <div className="flex justify-center space-x-4 mt-1">
                                            <span className="text-xs">1D</span>
                                            <span className="text-xs">1W</span>
                                            <span className="text-xs">1M</span>
                                            <span className="text-xs">YTD</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {/* Summary Rows */}
                                <SummaryRow label="Total Portfolio" data={totals} />
                                {liquidAccounts.length > 0 && illiquidAccounts.length > 0 && (
                                    <>
                                        <SummaryRow 
                                            label="Liquid Assets" 
                                            data={liquidTotals} 
                                            bgColor="bg-green-900/20" 
                                            borderColor="border-green-700" 
                                        />
                                        <SummaryRow 
                                            label="Illiquid Assets" 
                                            data={illiquidTotals} 
                                            bgColor="bg-orange-900/20" 
                                            borderColor="border-orange-700" 
                                        />
                                    </>
                                )}
                                
                                {/* Individual Account Rows */}
                                {filteredAndSortedAccounts.map((account, index) => {
                                    const Logo = getInstitutionLogo(account.institution);
                                    const isLiquid = isLiquidAsset(account);
                                    
                                    return (
                                        <tr 
                                            key={account.id}
                                            className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                                            onClick={() => handleRowClick(account)}
                                        >
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className="text-sm text-gray-300">{index + 1}</span>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 mr-3">
                                                        {typeof Logo === 'string'
                                                            ? <img src={Logo} alt={account.institution || ''} className="w-5 h-5 object-contain rounded"/>
                                                            : Logo
                                                                ? <Logo />
                                                                : (account.institution &&
                                                                    <div className="h-5 w-5 rounded bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-300">
                                                                        {account.institution.charAt(0).toUpperCase()}
                                                                    </div>
                                                                  )
                                                        }
                                                    </div>
                                                    <span className="text-sm text-gray-300">{account.institution || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-white">
                                                        {account.name || account.account_name}
                                                    </div>
                                                    {account.type && (
                                                        <div className="text-xs text-gray-400 italic">
                                                            {account.type}
                                                        </div>
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
                                                    <div className={`text-sm font-medium ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {account.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss || 0)}
                                                    </div>
                                                    <div className={`text-xs ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        ({account.totalGainLossPercent >= 0 ? '+' : ''}{formatPercentage(account.totalGainLossPercent || 0)})
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Performance columns */}
                                            <td className="px-2 py-2 whitespace-nowrap text-right">
                                                <div className="group relative">
                                                    <div className={`text-xs ${account.value1dChangePct >= 0 ? 'text-green-500' : 'text-red-500'} cursor-help`}>
                                                        {account.value1dChangePct !== undefined ? (
                                                            <>{account.value1dChangePct >= 0 ? '+' : ''}{account.value1dChangePct.toFixed(1)}%</>
                                                        ) : '-'}
                                                    </div>
                                                    {account.value1dChange !== undefined && (
                                                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded p-1 whitespace-nowrap">
                                                            {formatCurrency(account.value1dChange)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-right">
                                                <div className="group relative">
                                                    <div className={`text-xs ${account.value1wChangePct >= 0 ? 'text-green-500' : 'text-red-500'} cursor-help`}>
                                                        {account.value1wChangePct !== undefined ? (
                                                            <>{account.value1wChangePct >= 0 ? '+' : ''}{account.value1wChangePct.toFixed(1)}%</>
                                                        ) : '-'}
                                                    </div>
                                                    {account.value1wChange !== undefined && (
                                                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded p-1 whitespace-nowrap">
                                                            {formatCurrency(account.value1wChange)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-right">
                                                <div className="group relative">
                                                    <div className={`text-xs ${account.value1mChangePct >= 0 ? 'text-green-500' : 'text-red-500'} cursor-help`}>
                                                        {account.value1mChangePct !== undefined ? (
                                                            <>{account.value1mChangePct >= 0 ? '+' : ''}{account.value1mChangePct.toFixed(1)}%</>
                                                        ) : '-'}
                                                    </div>
                                                    {account.value1mChange !== undefined && (
                                                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded p-1 whitespace-nowrap">
                                                            {formatCurrency(account.value1mChange)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-right">
                                                <div className="group relative">
                                                    <div className={`text-xs ${account.valueYtdChangePct >= 0 ? 'text-green-500' : 'text-red-500'} cursor-help`}>
                                                        {account.valueYtdChangePct !== undefined ? (
                                                            <>{account.valueYtdChangePct >= 0 ? '+' : ''}{account.valueYtdChangePct.toFixed(1)}%</>
                                                        ) : '-'}
                                                    </div>
                                                    {account.valueYtdChange !== undefined && (
                                                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded p-1 whitespace-nowrap">
                                                            {formatCurrency(account.valueYtdChange)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <AccountDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedAccount(null);
                }}
                account={selectedAccount}
            />
        </>
    );
};

export default UnifiedAccountTable2;