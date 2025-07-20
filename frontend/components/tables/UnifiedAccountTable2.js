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
    Minus
} from 'lucide-react';

// Performance Indicator Component
const PerformanceIndicator = ({ value, format = 'percentage', size = 'sm' }) => {
    const isPositive = value > 0;
    const isNeutral = value === 0;
    const Icon = isPositive ? ArrowUpRight : isNeutral ? Minus : ArrowDownRight;
    const colorClass = isPositive ? 'text-green-500' : isNeutral ? 'text-gray-400' : 'text-red-500';
    const bgClass = isPositive ? 'bg-green-500/10' : isNeutral ? 'bg-gray-500/10' : 'bg-red-500/10';
    
    const formattedValue = format === 'percentage' 
        ? formatPercentage(value)
        : formatCurrency(Math.abs(value));
    
    return (
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${bgClass} ${colorClass} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
            <span className="font-medium">
                {!isNeutral && (isPositive ? '+' : '')}{formattedValue}
            </span>
        </div>
    );
};

// Account Trends Modal Component
const AccountTrendsModal = ({ isOpen, onClose, account }) => {
    if (!account) return null;

    const performancePeriods = [
        { label: '1D', value: account.value1dChangePct, amount: account.value1dChange },
        { label: '1W', value: account.value1wChangePct, amount: account.value1wChange },
        { label: '1M', value: account.value1mChangePct, amount: account.value1mChange },
        { label: '3M', value: account.value3mChangePct, amount: account.value3mChange },
        { label: 'YTD', value: account.valueYtdChangePct, amount: account.valueYtdChange },
        { label: '1Y', value: account.value1yChangePct, amount: account.value1yChange },
    ];

    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <LineChart className="w-5 h-5 text-blue-500" />
                    <span>Performance Trends: {account.name}</span>
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
                            <p className="text-xl font-bold">{formatCurrency(account.totalValue)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Cost Basis</p>
                            <p className="text-xl font-bold">{formatCurrency(account.totalCostBasis)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Gain/Loss</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-xl font-bold ${account.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {account.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss)}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Gain/Loss %</p>
                            <PerformanceIndicator value={account.totalGainLossPercent} size="lg" />
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
                                    <PerformanceIndicator value={period.value} />
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
                            { label: 'Securities', value: account.securityValue, color: 'bg-blue-500' },
                            { label: 'Crypto', value: account.cryptoValue, color: 'bg-purple-500' },
                            { label: 'Cash', value: account.cashValue, color: 'bg-green-500' },
                            { label: 'Metals', value: account.metalValue, color: 'bg-yellow-500' },
                            { label: 'Other Assets', value: account.otherAssetsValue, color: 'bg-gray-500' },
                        ].filter(item => item.value > 0).map((item) => {
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

// Account Details Modal Component
const AccountDetailsModal = ({ isOpen, onClose, account }) => {
    if (!account) return null;

    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-blue-500" />
                    <span>Account Details: {account.name}</span>
                </div>
            }
            size="max-w-2xl"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-600">Institution</p>
                            <p className="font-medium">{account.institution}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Account Type</p>
                            <p className="font-medium">{account.type}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Category</p>
                            <p className="font-medium capitalize">{account.category}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-600">Total Positions</p>
                            <p className="font-medium">{account.positionsCount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Liquid Value</p>
                            <p className="font-medium">{formatCurrency(account.liquidValue)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Last Updated</p>
                            <p className="font-medium">{formatDate(account.lastUpdated)}</p>
                        </div>
                    </div>
                </div>

                {/* Position Breakdown */}
                <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Position Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { label: 'Securities', count: account.securityPositions, value: account.securityValue },
                            { label: 'Crypto', count: account.cryptoPositions, value: account.cryptoValue },
                            { label: 'Cash', count: account.cashPositions, value: account.cashValue },
                            { label: 'Metals', count: account.metalPositions, value: account.metalValue },
                            { label: 'Other', count: account.otherPositions, value: account.otherAssetsValue },
                        ].map((item) => (
                            <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-600">{item.label}</p>
                                <p className="font-medium">{item.count} positions</p>
                                <p className="text-sm text-gray-500">{formatCurrency(item.value)}</p>
                            </div>
                        ))}
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
    const [isTrendsModalOpen, setIsTrendsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // UI Feedback State
    const [hoveredAccountId, setHoveredAccountId] = useState(null);

    // Sorting and Filtering State
    const [sortField, setSortField] = useState(initialSort.split('-')[0]);
    const [sortDirection, setSortDirection] = useState(initialSort.includes('-low') ? 'asc' : 'desc');
    const [searchQuery, setSearchQuery] = useState("");

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
                valueYtdChangePct: 0,
                valueMtdChange: 0,
                valueMtdChangePct: 0
            };
            return { totals: emptyTotals, liquidTotals: emptyTotals, illiquidTotals: emptyTotals };
        }

        const calculateTotals = (accountList) => {
            const result = accountList.reduce((acc, account) => {
                acc.totalValue += account.totalValue ?? 0;
                acc.totalCostBasis += account.totalCostBasis ?? 0;
                acc.totalGainLoss += account.totalGainLoss ?? 0;
                acc.positionsCount += account.positionsCount ?? 0;
                acc.cashBalance += account.cashValue ?? 0;
                acc.value1dChange += account.value1dChange ?? 0;
                acc.valueYtdChange += account.valueYtdChange ?? 0;
                acc.valueMtdChange += account.value1mChange ?? 0;
                return acc;
            }, { 
                totalValue: 0, 
                totalCostBasis: 0, 
                totalGainLoss: 0, 
                positionsCount: 0,
                cashBalance: 0,
                value1dChange: 0,
                valueYtdChange: 0,
                valueMtdChange: 0
            });
            
            // Calculate percentages
            result.totalGainLossPercent = result.totalCostBasis > 0 
                ? (result.totalGainLoss / result.totalCostBasis)
                : 0;
                
            // Calculate performance percentages based on previous values
            const prev1dValue = result.totalValue - result.value1dChange;
            const prevYtdValue = result.totalValue - result.valueYtdChange;
            const prevMtdValue = result.totalValue - result.valueMtdChange;
            
            result.value1dChangePct = prev1dValue > 0 ? (result.value1dChange / prev1dValue) : 0;
            result.valueYtdChangePct = prevYtdValue > 0 ? (result.valueYtdChange / prevYtdValue) : 0;
            result.valueMtdChangePct = prevMtdValue > 0 ? (result.valueMtdChange / prevMtdValue) : 0;
                
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
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(acc =>
                acc.name?.toLowerCase().includes(lowerCaseQuery) ||
                acc.institution?.toLowerCase().includes(lowerCaseQuery) ||
                acc.type?.toLowerCase().includes(lowerCaseQuery)
            );
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
                case "positions": comparison = (b.positionsCount ?? 0) - (a.positionsCount ?? 0); break;
                case "cash": comparison = (b.cashValue ?? 0) - (a.cashValue ?? 0); break;
                case "performance": comparison = (b.totalGainLossPercent ?? 0) - (a.totalGainLossPercent ?? 0); break;
                default: comparison = (b.totalValue ?? 0) - (a.totalValue ?? 0);
            }
            
            return sortDirection === 'asc' ? -comparison : comparison;
        });
        
        return sorted;
    }, [accounts, sortField, sortDirection, searchQuery]);

    // Quick Analysis Handlers
    const handleTrendsClick = (account) => {
        setSelectedAccount(account);
        setIsTrendsModalOpen(true);
    };

    const handleDetailsClick = (account) => {
        setSelectedAccount(account);
        setIsDetailsModalOpen(true);
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
            <td className="px-3 py-2 whitespace-nowrap text-sm">
                {/* Account name - empty for summary */}
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
                    <div className={`text-sm font-bold ${data.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {data.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(data.totalGainLoss)}
                    </div>
                    <div className={`text-xs ${data.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({data.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(data.totalGainLossPercent)})
                    </div>
                </div>
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-1">
                    <PerformanceIndicator value={data.value1dChangePct} size="sm" />
                    <PerformanceIndicator value={data.valueYtdChangePct} size="sm" />
                </div>
            </td>
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
                        {/* Refresh Button */}
                        <button
                            onClick={refresh}
                            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-colors"
                        >
                            <Activity className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                {filteredAndSortedAccounts.length === 0 ? (
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
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-32">
                                        Quick Analysis
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {/* Total NestEgg Summary Row */}
                                <SummaryRow label="Total NestEgg" data={totals} />
                                
                                {/* Liquid Accounts Summary Row */}
                                <SummaryRow 
                                    label="Liquid Accounts" 
                                    data={liquidTotals} 
                                    bgColor="bg-green-900/20" 
                                    borderColor="border-green-700" 
                                />
                                
                                {/* Illiquid Accounts Summary Row */}
                                <SummaryRow 
                                    label="Illiquid Accounts" 
                                    data={illiquidTotals} 
                                    bgColor="bg-purple-900/20" 
                                    borderColor="border-purple-700" 
                                />
                                
                                {/* Regular account rows */}
                                {filteredAndSortedAccounts.map((account, index) => {
                                    const LogoComponent = getInstitutionLogo(account.institution);
                                    const isHovered = hoveredAccountId === account.id;

                                    return (
                                        <tr 
                                            key={account.id} 
                                            className={`hover:bg-gray-700/50 transition-all duration-200 ${isHovered ? 'bg-gray-700/30' : ''}`}
                                            onMouseEnter={() => setHoveredAccountId(account.id)}
                                            onMouseLeave={() => setHoveredAccountId(null)}
                                        >
                                            {/* Rank Number */}
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className={`text-sm transition-colors ${isHovered ? 'text-blue-400' : 'text-gray-300'}`}>
                                                    {index + 1}
                                                </span>
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
                                            
                                            {/* Value with Performance */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <div className="space-y-1">
                                                    <div className="text-sm font-medium">{formatCurrency(account.totalValue)}</div>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-xs text-gray-400">1D:</span>
                                                        <PerformanceIndicator value={account.value1dChangePct} size="sm" />
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Cash Balance */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                                {formatCurrency(account.cashValue ?? 0)}
                                            </td>
                                            
                                            {/* Cost Basis */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                                {formatCurrency(account.totalCostBasis)}
                                            </td>
                                            
                                            {/* Gain/Loss with YTD Performance */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <div className="space-y-1">
                                                    <div className="flex flex-col items-end">
                                                        <div className={`text-sm font-medium ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            {account.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss)}
                                                        </div>
                                                        <div className={`text-xs ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            ({account.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(account.totalGainLossPercent)})
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-xs text-gray-400">YTD:</span>
                                                        <PerformanceIndicator value={account.valueYtdChangePct} size="sm" />
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Quick Analysis Actions */}
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button 
                                                        onClick={() => handleTrendsClick(account)}
                                                        className="p-1.5 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/40 transition-all duration-200 hover:scale-110" 
                                                        title="View Trends"
                                                    >
                                                        <LineChart className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDetailsClick(account)}
                                                        className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-all duration-200 hover:scale-110" 
                                                        title="View Details"
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        className="p-1.5 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/40 transition-all duration-200 hover:scale-110" 
                                                        title="Performance Analysis"
                                                    >
                                                        <BarChart3 className="h-4 w-4" />
                                                    </button>
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

            {/* --- Modals --- */}
            <AccountTrendsModal
                isOpen={isTrendsModalOpen}
                onClose={() => setIsTrendsModalOpen(false)}
                account={selectedAccount}
            />
            
            <AccountDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                account={selectedAccount}
            />
        </>
    );
};

export default UnifiedAccountTable2;