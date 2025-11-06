// frontend/components/tables/UnifiedAccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
// Store hooks
import { useAccounts } from '@/store/hooks/useAccounts';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useAccountPositions } from '@/store/hooks/useAccountPositions';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';
// Utils
import { popularBrokerages } from '@/utils/constants';
import { formatCurrency, formatDate, formatPercentage, formatNumber } from '@/utils/formatters';
// Modal Components
import FixedModal from '@/components/modals/FixedModal';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';

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
    ChevronRight,
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
    const AccountDetailModal = ({ isOpen, onClose, account }) => {
        // Early return BEFORE any hooks if modal not open or no account
        if (!isOpen || !account) return null;
        
        // State for sorting - must be before any conditional returns
        const [positionSort, setPositionSort] = useState({ field: 'value', direction: 'desc' });
        const [performanceRange, setPerformanceRange] = useState('1M');
        const [expandedPositions, setExpandedPositions] = useState(new Set());
        
        // Get account-specific aggregated positions from rept_accounts_positions
        const { positions: accountPositionsData, loading: positionsLoading, error: positionsError } = useAccountPositions(
            account.id,  // ← Now guaranteed to exist
            null
        );
                
                // Debug logging
                console.log('[AccountDetailModal] Debug Info:', {
                    accountId: account?.id,
                    accountObject: account,
                    positionsLoading,
                    accountPositionsData,
                    positionsError
                });
                
                // Get detailed positions for tax lot drill-down
                const { positions: detailedPositions } = useDetailedPositions();

        // Map account positions to modal display format
        const accountPositions = useMemo(() => {
            if (!account || !accountPositionsData) return [];
            
            return accountPositionsData.map(pos => ({
                symbol: pos.identifier,
                name: pos.name,
                asset_type: pos.assetType,
                sector: pos.sector,
                industry: pos.industry,
                quantity: pos.totalQuantity,
                currentPrice: pos.latestPricePerUnit,
                currentValue: pos.totalCurrentValue,
                costBasis: pos.totalCostBasis,
                gainLoss: pos.totalGainLossAmt,
                gainLossPercent: pos.totalGainLossPct,
                annualIncome: pos.totalAnnualIncome,
                dividendYield: pos.dividendYield,
                priceChange1d: pos.value1dChangePct,
                // Additional fields for enhanced display
                positionCount: pos.positionCount, // Number of tax lots
                longTermValue: pos.longTermValue,
                shortTermValue: pos.shortTermValue,
                weightedAvgCost: pos.weightedAvgCost,
                // Performance metrics
                value1wChangePct: pos.value1wChangePct,
                value1mChangePct: pos.value1mChangePct,
                value3mChangePct: pos.value3mChangePct,
                valueYtdChangePct: pos.valueYtdChangePct,
                value1yChangePct: pos.value1yChangePct,
            }));
        }, [account, accountPositionsData]);

        // Get tax lots for expanded positions (filtered by account and symbol)
        const getPositionTaxLots = (symbol) => {
            if (!detailedPositions || !account) return [];
            
            return detailedPositions.filter(p => 
                p.identifier === symbol && 
                p.accountId === account.id
            ).sort((a, b) => {
                // Sort by purchase date (oldest first)
                const dateA = new Date(a.purchaseDate || 0);
                const dateB = new Date(b.purchaseDate || 0);
                return dateA - dateB;
            });
        };

        // Toggle tax lot expansion
        const toggleTaxLots = (symbol) => {
            setExpandedPositions(prev => {
                const newSet = new Set(prev);
                if (newSet.has(symbol)) {
                    newSet.delete(symbol);
                } else {
                    newSet.add(symbol);
                }
                return newSet;
            });
        };

        // Show loading state while fetching positions
        if (positionsLoading) {
            return (
                <FixedModal isOpen={isOpen} onClose={onClose} title="Loading..." size="max-w-6xl">
                    <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3 text-gray-400">Loading account positions...</span>
                    </div>
                </FixedModal>
            );
        }

        // Show error state if positions failed to load
        if (positionsError) {
            return (
                <FixedModal isOpen={isOpen} onClose={onClose} title="Error Loading Positions" size="max-w-6xl">
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-red-400 mb-4">Failed to load positions</div>
                        <div className="text-gray-400 text-sm">{positionsError}</div>
                        <button 
                            onClick={onClose}
                            className="mt-6 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                        >
                            Close
                        </button>
                    </div>
                </FixedModal>
            );
        }

        const sortedPositions = useMemo(() => {
            if (!accountPositions || accountPositions.length === 0) return [];
            
            const sorted = [...accountPositions].sort((a, b) => {
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
                    case 'costBasis':
                        comparison = (a.costBasis || 0) - (b.costBasis || 0);
                        break;
                    case 'gain':
                        comparison = (a.gainLoss || 0) - (b.gainLoss || 0);
                        break;
                    case 'gainPct':
                        comparison = (a.gainLossPercent || 0) - (b.gainLossPercent || 0);
                        break;
                    case 'allocation':
                        comparison = ((a.currentValue / account.totalValue) || 0) - ((b.currentValue / account.totalValue) || 0);
                        break;
                    default:
                        comparison = (a.currentValue || 0) - (b.currentValue || 0);
                }
                
                return positionSort.direction === 'asc' ? comparison : -comparison;
            });
            
            return sorted;
        }, [accountPositions, account?.totalValue, positionSort]);

        // Get trend data
        const { trends } = usePortfolioTrends();

        const chartData = useMemo(() => {
            if (!account) return [];
            
            // Try to use real trend data if available
            if (trends && trends.length > 0) {
                const periods = {
                    '1D': 1,
                    '1W': 7,
                    '1M': 30,
                    '3M': 90,
                    'YTD': Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)),
                    '1Y': 365,
                    'ALL': 9999
                };
                
                const daysToShow = periods[performanceRange] || 30;
                const cutoffDate = new Date(Date.now() - (daysToShow * 24 * 60 * 60 * 1000));
                
                // Filter trends to date range
                const filteredTrends = trends
                    .filter(t => new Date(t.date) >= cutoffDate)
                    .map(t => ({
                        date: t.date,
                        value: account.totalValue || t.total_value,
                        percentChange: ((account.totalValue - account.totalCostBasis) / account.totalCostBasis) * 100
                    }));
                
                if (filteredTrends.length > 0) return filteredTrends;
            }
            
            // Fallback to mock data if no trends available
            const periods = {
                '1D': 24,
                '1W': 7,
                '1M': 30,
                '3M': 90,
                'YTD': 180,
                '1Y': 365,
                'ALL': 730
            };
            
            const dataPoints = periods[performanceRange] || 30;
            const baseValue = account.totalValue || 100000;
            const volatility = 0.02; // 2% daily volatility
            
            let data = [];
            let currentValue = baseValue;
            
            for (let i = dataPoints; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                // Random walk with slight upward bias
                const change = (Math.random() - 0.48) * volatility;
                currentValue = currentValue * (1 + change);
                
                data.push({
                    date: date.toISOString().split('T')[0],
                    value: currentValue,
                    percentChange: ((currentValue - baseValue) / baseValue) * 100
                });
            }
            
            // Ensure last point matches current value
            data[data.length - 1].value = account.totalValue;
            data[data.length - 1].percentChange = account.totalGainLossPercent || 0;
            
            return data;
        }, [account, performanceRange]);
        
        // Early returns after ALL hooks
        if (!isOpen || !account) return null;

        // Calculate summary statistics
        const accountStats = {
            totalPositions: accountPositions?.length || 0,
            totalSecurities: accountPositions?.filter(p => p.asset_type === 'security').length || 0,
            totalCash: account.cashBalance || 0,
            liquidValue: account.totalValue || 0,
            totalCostBasis: account.totalCostBasis || 0,
            totalGainLoss: account.totalGainLoss || 0,
            totalGainLossPct: account.totalGainLossPercent || 0,
            totalIncome: account.dividendIncomeAnnual || account.positions?.reduce((sum, p) => sum + (p.annualIncome || 0), 0) || 0,
            avgDividendYield: account.yieldPercent || (account.positions?.length > 0 
                ? (account.positions.reduce((sum, p) => sum + (p.dividendYield || 0), 0) / account.positions.length)
                : 0)
        };

        // Performance metrics
        const performanceMetrics = [
            { 
                label: '1D', 
                value: account.value1dChangePct || 0, 
                change: account.value1dChange || 0,
                key: '1D'
            },
            { 
                label: '1W', 
                value: account.value1wChangePct || 0, 
                change: account.value1wChange || 0,
                key: '1W'
            },
            { 
                label: '1M', 
                value: account.value1mChangePct || 0, 
                change: account.value1mChange || 0,
                key: '1M'
            },
            { 
                label: '3M', 
                value: account.value3mChangePct || 0, 
                change: account.value3mChange || 0,
                key: '3M'
            },
            { 
                label: 'YTD', 
                value: account.valueYtdChangePct || 0, 
                change: account.valueYtdChange || 0,
                key: 'YTD'
            },
            { 
                label: '1Y', 
                value: account.value1yChangePct || 0, 
                change: account.value1yChange || 0,
                key: '1Y'
            }
        ];

        // Get institution logo
        const InstitutionLogo = () => {
            const institution = popularBrokerages.find(
                b => b.name.toLowerCase() === (account.institution || '').toLowerCase()
            );
            
            if (institution && institution.logo) {
                return <img src={institution.logo} alt={institution.name} className="w-5 h-5 object-contain" />;
            }
            
            return <Briefcase className="w-5 h-5 text-blue-400" />;
        };

        // Chart colors
        const chartColor = chartData.length > 0 && chartData[chartData.length - 1].percentChange >= 0 
            ? '#10b981' // green
            : '#ef4444'; // red

        return (
            <div className="fixed inset-0 z-50 overflow-hidden">
                <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
                
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div 
                        className="w-full max-w-6xl max-h-[85vh] bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden"
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
                                        <h3 className="text-lg font-semibold">{account.name || account.account_name}</h3>
                                        <p className="text-sm text-gray-400">{account.institution}</p>
                                        <div className="flex items-center space-x-3 mt-1">
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                account.category === 'retirement' 
                                                    ? 'bg-purple-900/30 text-purple-400'
                                                    : account.category === 'brokerage'
                                                    ? 'bg-blue-900/30 text-blue-400'
                                                    : account.category === 'cash'
                                                    ? 'bg-green-900/30 text-green-400'
                                                    : 'bg-gray-900/30 text-gray-400'
                                            }`}>
                                                {account.type || account.account_type}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {accountPositions?.length || 0} positions
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Cash: {formatCurrency(account.cashBalance || 0)}
                                            </span>
                                            {accountStats.totalIncome > 0 && (
                                                <span className="text-xs text-gray-500">
                                                    Annual Income: {formatCurrency(accountStats.totalIncome)}
                                                </span>
                                            )}
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

                        {/* Modal Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 max-h-[calc(85vh-8rem)]">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-800/50 p-4 rounded">
                                    <div className="text-xs text-gray-400">Total Value</div>
                                    <div className="text-xl font-semibold">{formatCurrency(account.totalValue)}</div>
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
                                        accountStats.totalGainLossPct === null || accountStats.totalGainLossPct === undefined || accountStats.totalGainLossPct === 0
                                            ? 'text-gray-400'
                                            : accountStats.totalGainLossPct > 0
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                        }`}>
                                        {
                                            accountStats.totalGainLossPct === null || accountStats.totalGainLossPct === undefined || accountStats.totalGainLossPct === 0
                                            ? 'n.a.'
                                            : `${accountStats.totalGainLossPct > 0 ? '+' : ''}${accountStats.totalGainLossPct.toFixed(2)}%`
                                        }
                                        </div>
                                </div>
                                <div className="bg-gray-800/50 p-4 rounded">
                                    <div className="text-xs text-gray-400">Cost Basis</div>
                                    <div className="text-xl font-semibold">{formatCurrency(accountStats.totalCostBasis)}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Avg Cost: {formatCurrency(accountStats.totalCostBasis / Math.max(accountStats.totalPositions, 1))}
                                    </div>
                                </div>
                                <div className="bg-gray-800/50 p-4 rounded">
                                    <div className="text-xs text-gray-400">Income</div>
                                    <div className="text-xl font-semibold">{formatCurrency(accountStats.totalIncome)}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {accountStats.avgDividendYield > 0 && `Yield: ${accountStats.avgDividendYield.toFixed(2)}%`}
                                    </div>
                                </div>
                            </div>

                            {/* Performance Chart Section */}
                            <div className="bg-gray-800/30 rounded p-4 mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-gray-300">Account Performance</h4>
                                    <div className="flex items-center space-x-2">
                                        {performanceMetrics.map((metric) => (
                                            <button
                                                key={metric.key}
                                                onClick={() => setPerformanceRange(metric.key)}
                                                className={`px-3 py-1 text-xs rounded transition-colors ${
                                                    performanceRange === metric.key
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                }`}
                                            >
                                                {metric.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Chart */}
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis 
                                                dataKey="date" 
                                                stroke="#6B7280"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(date) => {
                                                    const d = new Date(date);
                                                    return performanceRange === '1D' 
                                                        ? d.toLocaleTimeString('en-US', { hour: '2-digit' })
                                                        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                }}
                                            />
                                            <YAxis 
                                                stroke="#6B7280"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(value) => formatCurrency(value, { compact: true })}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.375rem' }}
                                                labelStyle={{ color: '#9CA3AF' }}
                                                formatter={(value, name) => [formatCurrency(value), 'Value']}
                                                labelFormatter={(label) => `Date: ${label}`}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke={chartColor}
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Performance Metrics Grid */}
                            <div className="grid grid-cols-6 gap-2 mb-6">
                                {performanceMetrics.map((metric) => (
                                    <div key={metric.key} className="bg-gray-800/50 p-3 rounded text-center">
                                        <div className="text-xs text-gray-400 mb-1">{metric.label}</div>
                                            <div className={`text-sm font-semibold ${
                                            metric.value === null || metric.value === undefined || metric.value === 0
                                                ? 'text-gray-400'
                                                : metric.value > 0
                                                ? 'text-green-400'
                                                : 'text-red-400'
                                            }`}>
                                            {
                                                metric.value === null || metric.value === undefined || metric.value === 0
                                                ? 'n.a.'
                                                : `${metric.value > 0 ? '+' : ''}${metric.value.toFixed(2)}%`
                                            }
                                            </div>
                                        <div className={`text-xs mt-1 ${
                                            metric.change >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {metric.change >= 0 ? '+' : ''}{formatCurrency(metric.change, { compact: true })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Positions Table */}
                            {accountPositions && accountPositions.length > 0 ? (
                                <div className="bg-gray-800/30 rounded">
                                    <div className="px-4 py-3 border-b border-gray-700">
                                        <h4 className="text-sm font-semibold text-gray-300">
                                            Position Details ({accountPositions.length} holdings)
                                        </h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-800/50">
                                                <tr>
                                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-400 w-8">#</th>
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
                                                            <span>Shares</span>
                                                            {positionSort.field === 'quantity' && (
                                                                positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                                                        <button
                                                            onClick={() => setPositionSort({
                                                                field: 'price',
                                                                direction: positionSort.field === 'price' && positionSort.direction === 'desc' ? 'asc' : 'desc'
                                                            })}
                                                            className="flex items-center space-x-1 hover:text-white ml-auto"
                                                        >
                                                            <span>Price</span>
                                                            {positionSort.field === 'price' && (
                                                                positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </th>
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
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Cost/Share</th>
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
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                                                        <button
                                                            onClick={() => setPositionSort({
                                                                field: 'gainPct',
                                                                direction: positionSort.field === 'gainPct' && positionSort.direction === 'desc' ? 'asc' : 'desc'
                                                            })}
                                                            className="flex items-center space-x-1 hover:text-white ml-auto"
                                                        >
                                                            <span>%</span>
                                                            {positionSort.field === 'gainPct' && (
                                                                positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                                                        <button
                                                            onClick={() => setPositionSort({
                                                                field: 'allocation',
                                                                direction: positionSort.field === 'allocation' && positionSort.direction === 'desc' ? 'asc' : 'desc'
                                                            })}
                                                            className="flex items-center space-x-1 hover:text-white ml-auto"
                                                        >
                                                            <span>Allocation</span>
                                                            {positionSort.field === 'allocation' && (
                                                                positionSort.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </th>
                                                </tr>
                                            </thead>
                                            
                                            <tbody className="divide-y divide-gray-700">
                                                {/* Total Row - Anchored at top */}
                                                <tr className="bg-blue-900/20 font-semibold border-b-2 border-blue-700">
                                                    <td className="px-2 py-2 text-center text-xs">Σ</td>
                                                    <td className="px-3 py-2 text-xs">
                                                        <div className="font-bold text-blue-400">TOTAL</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-right">-</td>
                                                    <td className="px-3 py-2 text-xs text-right">-</td>
                                                    <td className="px-3 py-2 text-xs text-right font-bold text-white">
                                                        {formatCurrency(accountPositions.reduce((sum, p) => sum + p.currentValue, 0))}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-right text-gray-400">
                                                        {formatCurrency(accountPositions.reduce((sum, p) => sum + p.costBasis, 0))}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs text-right">
                                                        <span className={`font-bold ${
                                                            accountPositions.reduce((sum, p) => sum + p.gainLoss, 0) >= 0 
                                                                ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {accountPositions.reduce((sum, p) => sum + p.gainLoss, 0) >= 0 && '+'}
                                                            {formatCurrency(accountPositions.reduce((sum, p) => sum + p.gainLoss, 0))}
                                                        </span>
                                                    </td>
                                                        <td className="px-3 py-2 text-xs text-right">
                                                        {(() => {
                                                            const totalGain = accountPositions.reduce((s, p) => s + (p.gainLoss || 0), 0);
                                                            const totalCost = accountPositions.reduce((s, p) => s + (p.costBasis || 0), 0);
                                                            if (!totalCost || (totalGain / totalCost) === 0) {
                                                            return <span className="font-bold text-gray-400">n.a.</span>;
                                                            }
                                                            const pct = (totalGain / totalCost) * 100;
                                                            const cls = pct > 0 ? 'text-green-400' : 'text-red-400';
                                                            return <span className={`font-bold ${cls}`}>{`${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`}</span>;
                                                        })()}
                                                        </td>
                                                    <td className="px-3 py-2 text-xs text-right">100.00%</td>
                                                </tr>
                                                
                                                {/* Individual Position Rows */}
                                                {sortedPositions.map((position, idx) => {
                                                    const taxLots = getPositionTaxLots(position.symbol);
                                                    const isExpanded = expandedPositions.has(position.symbol);
                                                    const hasMultipleLots = taxLots.length > 1;
                                                    
                                                    return (
                                                        <React.Fragment key={idx}>
                                                            <tr className="hover:bg-gray-700/30 transition-colors">
                                                                <td className="px-2 py-2 text-center text-xs text-gray-500 font-medium">
                                                                    {idx + 1}
                                                                </td>
                                                                <td className="px-3 py-2 text-xs">
                                                                    <div className="flex items-center">
                                                                        {hasMultipleLots && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleTaxLots(position.symbol);
                                                                                }}
                                                                                className="mr-2 text-gray-400 hover:text-white transition-colors"
                                                                            >
                                                                                {isExpanded ? (
                                                                                    <ChevronDown className="w-3 h-3" />
                                                                                ) : (
                                                                                    <ChevronRight className="w-3 h-3" />
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                        <div>
                                                                            <div className="font-medium flex items-center">
                                                                                {position.symbol}
                                                                                {hasMultipleLots && (
                                                                                    <span className="ml-2 text-xs text-gray-500">
                                                                                        ({taxLots.length} lots)
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-gray-400">{position.name}</div>
                                                                            {position.sector && (
                                                                                <div className="text-gray-500 text-xs">{position.sector}</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 text-xs text-right">
                                                                    {formatNumber(position.quantity || 0, { maximumFractionDigits: 4 })}
                                                                </td>
                                                        
                                                            <td className="px-3 py-2 text-xs text-right">
                                                                {formatCurrency(position.currentPrice || 0)}
                                                                {position.priceChange1d !== null && position.priceChange1d !== undefined && (
                                                                    <div className={`text-xs ${position.priceChange1d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {position.priceChange1d >= 0 ? '+' : ''}{position.priceChange1d.toFixed(2)}%
                                                                    </div>
                                                                )}
                                                            </td>
                                                        <td className="px-3 py-2 text-xs text-right font-medium">
                                                            {formatCurrency(position.currentValue || 0)}
                                                        </td>
                                                        <td className="px-3 py-2 text-xs text-right text-gray-400">
                                                            {!position.quantity || position.quantity === 0
                                                                ? 'n.a.'
                                                                : formatCurrency((position.costBasis || 0) / position.quantity)
                                                                }
                                                        </td>
                                                        <td className="px-3 py-2 text-xs text-right">
                                                            <span className={`font-medium ${position.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {position.gainLoss >= 0 && '+'}{formatCurrency(position.gainLoss || 0)}
                                                            </span>
                                                        </td>
                                                            <td className="px-3 py-2 text-xs text-right">
                                                                <span className={`font-medium ${
                                                                position.gainLossPercent === null || position.gainLossPercent === undefined || position.gainLossPercent === 0
                                                                    ? 'text-gray-400'
                                                                    : position.gainLossPercent > 0
                                                                    ? 'text-green-400'
                                                                    : 'text-red-400'
                                                                }`}>
                                                                {
                                                                    position.gainLossPercent === null || position.gainLossPercent === undefined || position.gainLossPercent === 0
                                                                    ? 'n.a.'
                                                                    : `${position.gainLossPercent > 0 ? '+' : ''}${position.gainLossPercent.toFixed(2)}%`
                                                                }
                                                                </span>
                                                            </td>
                                                        <td className="px-3 py-2 text-xs text-right">
                                                            <div className="font-medium">
                                                                {!account.totalValue || position.currentValue === 0
                                                                    ? 'n.a.'
                                                                    : formatPercentage(position.currentValue / account.totalValue)
                                                                    }
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Tax Lots - Expanded Detail */}
                                                                {isExpanded && taxLots.length > 0 && (
                                                                    <>
                                                                        <tr className="bg-gray-800/50 border-b border-gray-700">
                                                                            <td></td>
                                                                            <td colSpan="8" className="px-3 py-1">
                                                                                <div className="text-xs text-gray-400 font-medium">Tax Lot Details</div>
                                                                            </td>
                                                                        </tr>
                                                                        {taxLots.map((lot, lotIdx) => {
                                                                            const lotValue = (lot.quantity || 0) * (position.currentPrice || 0);
                                                                            const lotGain = lotValue - (lot.costBasis || 0);
                                                                            const lotGainPct = lot.costBasis > 0 ? (lotGain / lot.costBasis) * 100 : 0;
                                                                            const holdingDays = Math.floor((new Date() - new Date(lot.purchaseDate)) / (1000 * 60 * 60 * 24));
                                                                            const isLongTerm = holdingDays > 365;
                                                                            
                                                                            return (
                                                                                <tr key={`${idx}-lot-${lotIdx}`} className="bg-gray-800/30 text-xs">
                                                                                    <td className="px-2 py-1 text-center text-gray-600">
                                                                                        {idx + 1}.{lotIdx + 1}
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-gray-400">
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                                                                isLongTerm 
                                                                                                    ? 'bg-green-900/30 text-green-400' 
                                                                                                    : 'bg-yellow-900/30 text-yellow-400'
                                                                                            }`}>
                                                                                                {isLongTerm ? 'LT' : 'ST'}
                                                                                            </span>
                                                                                            <span>{formatDate(lot.purchaseDate)}</span>
                                                                                            <span className="text-gray-600">({holdingDays}d)</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-right text-gray-300">
                                                                                        {formatNumber(lot.quantity, { maximumFractionDigits: 4 })}
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-right text-gray-400">
                                                                                        {!lot.quantity ? 'n.a.' : formatCurrency(lot.costBasis / lot.quantity)}
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-right text-gray-300">
                                                                                        {formatCurrency(lot.quantity * position.currentPrice)}
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-right text-gray-400">
                                                                                        {formatCurrency(lot.costBasis)}
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-right">
                                                                                        <span className={lotGain >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                            {lotGain >= 0 && '+'}{formatCurrency(lotGain)}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-3 py-1 text-right">
                                                                                        <span className={lotGainPct >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                            {lotGainPct >= 0 && '+'}{lotGainPct.toFixed(2)}%
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                            </div>
                            ) : (
                                <div className="bg-gray-800/30 rounded p-6">
                                    <div className="text-center">
                                        <div className="text-gray-400 mb-4">No positions found for this account</div>
                                        <div className="text-xs text-gray-500 space-y-2">
                                            <div>Account ID: {account?.id}</div>
                                            <div>Account Name: {account?.name || account?.account_name}</div>
                                            <div>Raw Positions Data Length: {accountPositionsData?.length || 0}</div>
                                            <div>Processed Positions Length: {accountPositions?.length || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex-shrink-0">
                            <button 
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-white font-medium"
                            >
                                Close
                            </button>
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
    const [categoryFilter, setCategoryFilter] = useState([]);
    const [typeFilter, setTypeFilter] = useState([]);
    const [institutionFilter, setInstitutionFilter] = useState([]);

    // Ensure accounts is always an array
    const safeAccounts = useMemo(() => {
        return Array.isArray(accounts) ? accounts : [];
    }, [accounts]);

    
    // Filter options for categories, types, and institutions
    const filterOptions = useMemo(() => {
        // Get unique values from accounts
        const categories = [...new Set(safeAccounts.map(a => a.category).filter(Boolean))];
        const types = [...new Set(safeAccounts.map(a => a.type).filter(Boolean))];
        const institutions = [...new Set(safeAccounts.map(a => a.institution).filter(Boolean))];
        
        return {
            categories: categories.sort().map(cat => ({ 
                value: cat, 
                label: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ') 
            })),
            types: types.sort().map(type => ({ 
                value: type, 
                label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ') 
            })),
            institutions: institutions.sort().map(inst => ({ 
                value: inst, 
                label: inst 
            }))
        };
    }, [safeAccounts]);

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
                acc.cashBalance += account.cashBalance ?? 0;
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
            // Search filter - check multiple fields
            const matchesSearch = searchQuery === '' || 
                (account.name && account.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (account.institution && account.institution.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (account.type && account.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (account.category && account.category.toLowerCase().includes(searchQuery.toLowerCase()));
            
            // Category filter - only exclude if filter is active AND account doesn't match
            const matchesCategory = categoryFilter.length === 0 || 
                categoryFilter.includes(account.category);
            
            // Type filter - only exclude if filter is active AND account doesn't match
            const matchesType = typeFilter.length === 0 || 
                typeFilter.includes(account.type);
            
            // Institution filter - only exclude if filter is active AND account doesn't match
            const matchesInstitution = institutionFilter.length === 0 || 
                institutionFilter.includes(account.institution);
            
            // Account must match ALL active filters
            return matchesSearch && matchesCategory && matchesType && matchesInstitution;
        });
        
        // Apply sorting (same as before)
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
    }, [safeAccounts, sortField, sortDirection, searchQuery, categoryFilter, typeFilter, institutionFilter]);
    // Handle row click
    const handleRowClick = (account) => {
        setSelectedAccount(account);
        setIsDetailModalOpen(true);
    };

    // Clear all filters function
    const clearAllFilters = () => {
        setCategoryFilter([]);
        setTypeFilter([]);
        setInstitutionFilter([]);
        setSearchQuery("");
    };

    // Check if any filters are active
    const hasActiveFilters = categoryFilter.length > 0 || typeFilter.length > 0 || 
                            institutionFilter.length > 0 || searchQuery.length > 0;


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
                    <div className={`text-xs ${
                        !data.totalGainLossPercent || data.totalGainLossPercent === 0
                        ? 'text-gray-400'
                        : data.totalGainLossPercent > 0
                            ? 'text-green-500'
                            : 'text-red-500'
                    }`}>
                        {
                        !data.totalGainLossPercent || data.totalGainLossPercent === 0
                            ? 'n.a.'
                            : `(${data.totalGainLossPercent > 0 ? '+' : ''}${data.totalGainLossPercent.toFixed(2)}%)`
                        }
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
                            
                            {/* Category Filter */}
                            {filterOptions.categories.length > 0 && (
                                <MultiSelectDropdown
                                    options={filterOptions.categories}
                                    selected={categoryFilter}
                                    onChange={setCategoryFilter}
                                    placeholder="Category"
                                />
                            )}
                            
                            {/* Type Filter */}
                            {filterOptions.types.length > 0 && (
                                <MultiSelectDropdown
                                    options={filterOptions.types}
                                    selected={typeFilter}
                                    onChange={setTypeFilter}
                                    placeholder="Type"
                                />
                            )}
                            
                            {/* Institution Filter */}
                            {filterOptions.institutions.length > 0 && (
                                <MultiSelectDropdown
                                    options={filterOptions.institutions}
                                    selected={institutionFilter}
                                    onChange={setInstitutionFilter}
                                    placeholder="Institution"
                                />
                            )}
                            
                            {/* Clear Filters Button - only show when filters are active */}
                            {hasActiveFilters && (
                                <button
                                    onClick={clearAllFilters}
                                    className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" />
                                    Clear
                                </button>
                            )}
                            
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
                            {hasActiveFilters ?   
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
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider" colSpan="4">
                                        <div className="text-center mb-1">Performance</div>
                                        <div className="grid grid-cols-4 gap-0">
                                            <span className="text-xs text-center">1D</span>
                                            <span className="text-xs text-center">1W</span>
                                            <span className="text-xs text-center">1M</span>
                                            <span className="text-xs text-center">YTD</span>
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
                                                        <div className={`text-xs ${
                                                        account.totalGainLossPercent === null || account.totalGainLossPercent === undefined || account.totalGainLossPercent === 0
                                                            ? 'text-gray-500'
                                                            : account.totalGainLossPercent > 0
                                                            ? 'text-green-500'
                                                            : 'text-red-500'
                                                        }`}>
                                                        {
                                                            account.totalGainLossPercent === null || account.totalGainLossPercent === undefined || account.totalGainLossPercent === 0
                                                            ? 'n.a.'
                                                            : `(${account.totalGainLossPercent > 0 ? '+' : ''}${account.totalGainLossPercent.toFixed(2)}%)`
                                                        }
                                                        </div>
                                                </div>
                                            </td>
                                            {/* Performance columns */}
                                            <td className="px-2 py-2 whitespace-nowrap text-right">
                                                <div className="group relative">
                                                    <div className={`text-xs ${
                                                            account.value1dChangePct === null || account.value1dChangePct === undefined 
                                                                ? 'text-gray-400'                    // null/undefined = gray
                                                                : account.value1dChangePct === 0 
                                                                    ? 'text-gray-400'                // 0% = gray (not green)
                                                                    : account.value1dChangePct > 0 
                                                                        ? 'text-green-500'           // positive = green
                                                                        : 'text-red-500'             // negative = red
                                                        } cursor-help`}>
                                                            {account.value1dChangePct === null || account.value1dChangePct === undefined || account.value1dChangePct === 0 ? (
                                                            <>n.a.</>
                                                            ) : (
                                                            <>{account.value1dChangePct > 0 ? '+' : ''}{account.value1dChangePct.toFixed(1)}%</>
                                                            )}
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
                                                    <div className={`text-xs ${
                                                            account.value1wChangePct === null || account.value1wChangePct === undefined 
                                                                ? 'text-gray-400'                    // null/undefined = gray
                                                                : account.value1wChangePct === 0 
                                                                    ? 'text-gray-400'                // 0% = gray (not green)
                                                                    : account.value1wChangePct > 0 
                                                                        ? 'text-green-500'           // positive = green
                                                                        : 'text-red-500'             // negative = red
                                                        } cursor-help`}>
                                                        {account.value1wChangePct === null || account.value1wChangePct === undefined || account.value1wChangePct === 0 ? (
                                                        <>n.a.</>
                                                        ) : (
                                                        <>{account.value1wChangePct > 0 ? '+' : ''}{account.value1wChangePct.toFixed(1)}%</>
                                                        )}
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
                                                    <div className={`text-xs ${
                                                                account.value1mChangePct === null || account.value1mChangePct === undefined 
                                                                    ? 'text-gray-400'                    // null/undefined = gray
                                                                    : account.value1mChangePct === 0 
                                                                        ? 'text-gray-400'                // 0% = gray (not green)
                                                                        : account.value1mChangePct > 0 
                                                                            ? 'text-green-500'           // positive = green
                                                                            : 'text-red-500'             // negative = red
                                                            } cursor-help`}>
                                                        {account.value1mChangePct === null || account.value1mChangePct === undefined || account.value1mChangePct === 0 ? (
                                                        <>n.a.</>
                                                        ) : (
                                                        <>{account.value1mChangePct > 0 ? '+' : ''}{account.value1mChangePct.toFixed(1)}%</>
                                                        )}
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
                                                    <div className={`text-xs ${
                                                            account.valueYtdChangePct === null || account.valueYtdChangePct === undefined 
                                                                ? 'text-gray-400'                    // null/undefined = gray
                                                                : account.valueYtdChangePct === 0 
                                                                    ? 'text-gray-400'                // 0% = gray (not green)
                                                                    : account.valueYtdChangePct > 0 
                                                                        ? 'text-green-500'           // positive = green
                                                                        : 'text-red-500'             // negative = red
                                                        } cursor-help`}>
                                                    {account.valueYtdChangePct === null || account.valueYtdChangePct === undefined || account.valueYtdChangePct === 0 ? (
                                                    <>n.a.</>
                                                    ) : (
                                                    <>{account.valueYtdChangePct > 0 ? '+' : ''}{account.valueYtdChangePct.toFixed(1)}%</>
                                                    )}
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