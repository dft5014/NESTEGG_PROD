// frontend/components/tables/UnifiedAccountTable.js
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

// Updated Account Detail Modal Component
// Updated Account Detail Modal Component
const AccountDetailModal = ({ isOpen, onClose, account }) => {
    // State for sorting - must be before any conditional returns
    const [activeTab, setActiveTab] = useState('overview');
    const [positionSort, setPositionSort] = useState({ field: 'value', direction: 'desc' });
    
    // Sort positions based on current sort settings - must be before conditional returns
    const sortedPositions = useMemo(() => {
        if (!account?.positions) return [];
        
        const sorted = [...account.positions].sort((a, b) => {
            let comparison = 0;
            switch (positionSort.field) {
                case 'symbol':
                    comparison = (a.symbol || '').localeCompare(b.symbol || '');
                    break;
                case 'quantity':
                    comparison = (a.quantity || 0) - (b.quantity || 0);
                    break;
                case 'price':
                    comparison = (a.currentPrice || 0) - (b.currentPrice || 0);
                    break;
                case 'value':
                    comparison = (a.currentValue || 0) - (b.currentValue || 0);
                    break;
                case 'gain':
                    comparison = (a.gainLoss || 0) - (b.gainLoss || 0);
                    break;
                case 'gainPct':
                    comparison = (a.gainLossPercent || 0) - (b.gainLossPercent || 0);
                    break;
                default:
                    comparison = (a.currentValue || 0) - (b.currentValue || 0);
            }
            
            return positionSort.direction === 'asc' ? comparison : -comparison;
        });
        
        return sorted;
    }, [account?.positions, positionSort]);
    
    // Early returns after ALL hooks
    if (!isOpen || !account) return null;

    // Calculate summary statistics (not a hook, so safe after conditional return)
    const accountStats = {
        totalPositions: account.positions?.length || 0,
        totalSecurities: account.positions?.filter(p => p.asset_type === 'security').length || 0,
        totalCash: account.cashBalance || 0,
        liquidValue: account.totalValue || 0,
        totalCostBasis: account.totalCostBasis || 0,
        totalGainLoss: account.totalGainLoss || 0,
        totalGainLossPct: account.totalGainLossPercent || 0
    };

    // Get institution logo (not a hook, so safe after conditional return)
    const InstitutionLogo = () => {
        const institution = popularBrokerages.find(
            b => b.name.toLowerCase() === (account.institution || '').toLowerCase()
        );
        
        if (institution && institution.logo) {
            return <img src={institution.logo} alt={institution.name} className="w-5 h-5 object-contain" />;
        }
        
        return <Briefcase className="w-5 h-5 text-blue-400" />;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
            
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div 
                    className="w-full max-w-5xl max-h-[85vh] bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gray-700 rounded-lg">
                                    <InstitutionLogo />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {account.name || account.account_name}
                                    </h3>
                                    <p className="text-sm text-gray-400">{account.institution}</p>
                                    <div className="flex items-center space-x-3 mt-1">
                                        <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                                            {account.type || account.account_type}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {accountStats.totalPositions} positions
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Last updated: {formatDate(account.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="px-6 pt-4 bg-gray-800/50 border-b border-gray-700">
                        <div className="flex space-x-6">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'overview'
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-white'
                                }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('positions')}
                                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'positions'
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-white'
                                }`}
                            >
                                Positions ({accountStats.totalPositions})
                            </button>
                            <button
                                onClick={() => setActiveTab('performance')}
                                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'performance'
                                        ? 'text-blue-400 border-blue-400'
                                        : 'text-gray-400 border-transparent hover:text-white'
                                }`}
                            >
                                Performance
                            </button>
                        </div>
                    </div>

                    {/* Modal Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 max-h-[calc(85vh-12rem)]">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Key Metrics */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-gray-800/50 p-4 rounded">
                                        <div className="text-xs text-gray-400">Total Value</div>
                                        <div className="text-xl font-semibold text-white">
                                            {formatCurrency(account.totalValue || 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {formatPercentage((account.totalValue / (account.portfolioValue || 1)) * 100)} of portfolio
                                        </div>
                                    </div>
                                    <div className="bg-gray-800/50 p-4 rounded">
                                        <div className="text-xs text-gray-400">Total Gain/Loss</div>
                                        <div className={`text-xl font-semibold ${
                                            accountStats.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {accountStats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(accountStats.totalGainLoss)}
                                        </div>
                                        <div className={`text-xs mt-1 ${
                                            accountStats.totalGainLossPct >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {accountStats.totalGainLossPct >= 0 ? '+' : ''}{formatPercentage(accountStats.totalGainLossPct)}
                                        </div>
                                    </div>
                                    <div className="bg-gray-800/50 p-4 rounded">
                                        <div className="text-xs text-gray-400">Cash Balance</div>
                                        <div className="text-xl font-semibold text-white">
                                            {formatCurrency(account.cashBalance || 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {formatPercentage((account.cashBalance / (account.totalValue || 1)) * 100)} of account
                                        </div>
                                    </div>
                                </div>

                                {/* Asset Allocation */}
                                <div className="bg-gray-800/50 p-4 rounded">
                                    <h4 className="text-sm font-semibold mb-3 flex items-center text-gray-300">
                                        <PieChart className="w-4 h-4 mr-2 text-blue-400" />
                                        Asset Allocation
                                    </h4>
                                    <div className="space-y-3">
                                        {account.assetAllocation?.map((allocation, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-3 h-3 rounded-full ${
                                                        allocation.type === 'stocks' ? 'bg-blue-500' :
                                                        allocation.type === 'bonds' ? 'bg-green-500' :
                                                        allocation.type === 'cash' ? 'bg-yellow-500' :
                                                        'bg-gray-500'
                                                    }`} />
                                                    <span className="text-sm text-gray-300">{allocation.type}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-white">
                                                        {formatCurrency(allocation.value)}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        ({formatPercentage(allocation.percentage)})
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'positions' && (
                            <div className="bg-gray-800/30 rounded overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-800/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                                                    <button
                                                        onClick={() => setPositionSort({
                                                            field: 'symbol',
                                                            direction: positionSort.field === 'symbol' && positionSort.direction === 'desc' ? 'asc' : 'desc'
                                                        })}
                                                        className="flex items-center space-x-1 hover:text-white"
                                                    >
                                                        <span>Symbol</span>
                                                        {positionSort.field === 'symbol' && (
                                                            positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                                                    <button
                                                        onClick={() => setPositionSort({
                                                            field: 'quantity',
                                                            direction: positionSort.field === 'quantity' && positionSort.direction === 'desc' ? 'asc' : 'desc'
                                                        })}
                                                        className="flex items-center space-x-1 hover:text-white ml-auto"
                                                    >
                                                        <span>Quantity</span>
                                                        {positionSort.field === 'quantity' && (
                                                            positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Price</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                                                    <button
                                                        onClick={() => setPositionSort({
                                                            field: 'value',
                                                            direction: positionSort.field === 'value' && positionSort.direction === 'desc' ? 'asc' : 'desc'
                                                        })}
                                                        className="flex items-center space-x-1 hover:text-white ml-auto"
                                                    >
                                                        <span>Value</span>
                                                        {positionSort.field === 'value' && (
                                                            positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Cost Basis</th>
                                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                                                    <button
                                                        onClick={() => setPositionSort({
                                                            field: 'gain',
                                                            direction: positionSort.field === 'gain' && positionSort.direction === 'desc' ? 'asc' : 'desc'
                                                        })}
                                                        className="flex items-center space-x-1 hover:text-white ml-auto"
                                                    >
                                                        <span>Gain/Loss</span>
                                                        {positionSort.field === 'gain' && (
                                                            positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700">
                                            {sortedPositions.map((position, idx) => (
                                                <tr key={idx} className="hover:bg-gray-700/30">
                                                    <td className="px-3 py-2 text-sm">
                                                        <div>
                                                            <div className="font-medium text-white">{position.symbol}</div>
                                                            <div className="text-xs text-gray-400">{position.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-right text-gray-300">
                                                        {formatNumber(position.quantity || 0, { maximumFractionDigits: 4 })}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-right text-gray-300">
                                                        {formatCurrency(position.currentPrice || 0)}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-right font-medium text-white">
                                                        {formatCurrency(position.currentValue || 0)}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-right text-gray-400">
                                                        {formatCurrency(position.costBasis || 0)}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-right">
                                                        <div className={`${position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            <div>{position.gainLoss >= 0 ? '+' : ''}{formatCurrency(position.gainLoss || 0)}</div>
                                                            <div className="text-xs">
                                                                {position.gainLossPercent >= 0 ? '+' : ''}{formatPercentage(position.gainLossPercent || 0)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'performance' && (
                            <div className="space-y-6">
                                {/* Performance Grid */}
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { label: '1D', value: account.value1dChangePct || 0, change: account.value1dChange || 0 },
                                        { label: '1W', value: account.value1wChangePct || 0, change: account.value1wChange || 0 },
                                        { label: '1M', value: account.value1mChangePct || 0, change: account.value1mChange || 0 },
                                        { label: 'YTD', value: account.valueYtdChangePct || 0, change: account.valueYtdChange || 0 }
                                    ].map((period) => (
                                        <div key={period.label} className="bg-gray-800/50 p-4 rounded text-center">
                                            <div className="text-xs text-gray-400 mb-1">{period.label}</div>
                                            <div className={`text-lg font-semibold ${
                                                period.value >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {period.value >= 0 ? '+' : ''}{period.value.toFixed(2)}%
                                            </div>
                                            <div className={`text-xs mt-1 ${
                                                period.change >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {period.change >= 0 ? '+' : ''}{formatCurrency(period.change)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Additional Performance Metrics */}
                                <div className="bg-gray-800/50 p-4 rounded">
                                    <h4 className="text-sm font-semibold mb-3 text-gray-300">Performance Metrics</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-400">Total Return</span>
                                            <div className={`font-medium ${
                                                accountStats.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {accountStats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(accountStats.totalGainLoss)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-400">Return %</span>
                                            <div className={`font-medium ${
                                                accountStats.totalGainLossPct >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {accountStats.totalGainLossPct >= 0 ? '+' : ''}{formatPercentage(accountStats.totalGainLossPct)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-400">
                                Account ID: {account.id}
                            </div>
                            <button 
                                onClick={onClose}
                                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-white font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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

// --- Main UnifiedAccountTable Component ---
const UnifiedAccountTable = ({
    initialSort = "value-high",
    title = "Your Accounts",
    onDataChanged = () => {}
}) => {
    console.log("UnifiedAccountTable: Rendering start");

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
                                                        ({data.totalGainLoss >= 0 ? '+' : ''}{data.totalGainLossPercent ? data.totalGainLossPercent.toFixed(2) : '0.00'}%)
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
                                                        ({account.totalGainLossPercent >= 0 ? '+' : ''}{account.totalGainLossPercent ? account.totalGainLossPercent.toFixed(2) : '0.00'}%)
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

export default UnifiedAccountTable;