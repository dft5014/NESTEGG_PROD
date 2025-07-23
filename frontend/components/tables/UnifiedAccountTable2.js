// frontend/components/tables/UnifiedAccountTable2.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Store hooks
import { useAccounts } from '@/store/hooks';

// Utils
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// Button Components
import AddAccountButton from '@/components/AddAccountButton';
import EditAccountButton from '@/components/EditAccountButton';
import AddPositionButton from '@/components/AddPositionButton';

// Modal Components & Flows
import AccountDetailModal from '@/components/modals/AccountDetailModal';
import FixedModal from '@/components/modals/FixedModal';
import AccountModal from '@/components/modals/AccountModal';
import AddPositionFlow from '@/components/flows/AddPositionFlow';

// Icons
import { 
    Briefcase, 
    Loader, 
    Search, 
    Plus, 
    SlidersHorizontal, 
    Trash, 
    Settings, 
    ChevronUp, 
    ChevronDown,
    TrendingUp,
    TrendingDown,
    Eye,
    EyeOff,
    Filter,
    X,
    Check,
    Home,
    Building2,
    Coins,
    Bitcoin,
    DollarSign,
    Gem,
    MoreHorizontal,
    RefreshCw,
    AlertCircle,
    Info
} from 'lucide-react';

// --- Delete Confirmation Component ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "item" }) => {
    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Delete ${itemType}?`}
            size="max-w-sm"
        >
            <div className="pt-2 pb-4 text-gray-700">
                <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5">Delete</button>
            </div>
        </FixedModal>
    );
};

// --- Performance Cell Component with Hover Tooltip ---
const PerformanceCell = ({ percentChange, dollarChange, period, isLoading = false }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    if (isLoading) {
        return (
            <td className="px-2 py-2 whitespace-nowrap text-right">
                <div className="animate-pulse bg-gray-700 h-5 w-16 rounded"></div>
            </td>
        );
    }
    
    const isPositive = percentChange > 0;
    const isNeutral = percentChange === 0;
    
    return (
        <td className="px-2 py-2 whitespace-nowrap text-right relative group">
            <div 
                className="relative inline-block"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <div className={`text-sm font-medium transition-all duration-200 ${
                    isPositive ? 'text-green-500' : isNeutral ? 'text-gray-400' : 'text-red-500'
                }`}>
                    <span className="inline-flex items-center gap-1">
                        {!isNeutral && (
                            isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                        )}
                        {isPositive && '+'}{formatPercentage(percentChange)}
                    </span>
                </div>
                
                {/* Tooltip */}
                {showTooltip && (
                    <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap animate-fadeIn">
                        <div className="font-medium mb-1">{period} Change</div>
                        <div className={isPositive ? 'text-green-400' : isNeutral ? 'text-gray-300' : 'text-red-400'}>
                            {isPositive && '+'}{formatCurrency(dollarChange)}
                        </div>
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                )}
            </div>
        </td>
    );
};

// --- Asset Type Filter Component ---
const AssetTypeFilter = ({ selectedTypes, onToggle, counts }) => {
    const assetTypes = [
        { id: 'security', label: 'Stocks', icon: TrendingUp, color: 'blue' },
        { id: 'crypto', label: 'Crypto', icon: Bitcoin, color: 'purple' },
        { id: 'cash', label: 'Cash', icon: DollarSign, color: 'green' },
        { id: 'metal', label: 'Metals', icon: Gem, color: 'yellow' },
        { id: 'other', label: 'Other/Illiquid', icon: Home, color: 'orange' }
    ];
    
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-all duration-200 ${
                    selectedTypes.size < 5 ? 'ring-2 ring-blue-500' : ''
                }`}
            >
                <Filter className="w-4 h-4" />
                <span>Asset Types</span>
                {selectedTypes.size < 5 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 animate-pulse">
                        {5 - selectedTypes.size} hidden
                    </span>
                )}
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden animate-slideDown">
                        <div className="p-3 border-b border-gray-700">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-white">Filter Asset Types</span>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="p-2">
                            {assetTypes.map(type => {
                                const Icon = type.icon;
                                const isSelected = selectedTypes.has(type.id);
                                const count = counts[type.id] || 0;
                                
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => onToggle(type.id)}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg mb-1 transition-all duration-200 ${
                                            isSelected 
                                                ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' 
                                                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{type.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">{count}</span>
                                            {isSelected && <Check className="w-4 h-4" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-3 border-t border-gray-700">
                            <button
                                onClick={() => {
                                    // Select all
                                    assetTypes.forEach(type => {
                                        if (!selectedTypes.has(type.id)) {
                                            onToggle(type.id);
                                        }
                                    });
                                }}
                                className="w-full text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Show All Types
                            </button>
                        </div>
                    </div>
                </>
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
        deleteAccount: deleteAccountFromStore,
        isStale 
    } = useAccounts();

    // Modal States
    const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [accountForPosition, setAccountForPosition] = useState(null);
    const [isAddPositionFlowOpen, setIsAddPositionFlowOpen] = useState(false);

    // UI States
    const [successMessage, setSuccessMessage] = useState("");
    const [showValues, setShowValues] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Sorting and Filtering State
    const [sortField, setSortField] = useState(initialSort.split('-')[0]);
    const [sortDirection, setSortDirection] = useState(initialSort.includes('-low') ? 'asc' : 'desc');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set(['security', 'crypto', 'cash', 'metal']));

    // Calculate asset type counts
    const assetTypeCounts = useMemo(() => {
        const counts = {
            security: 0,
            crypto: 0,
            cash: 0,
            metal: 0,
            other: 0
        };
        
        accounts?.forEach(account => {
            if (account.securityPositions > 0) counts.security++;
            if (account.cryptoPositions > 0) counts.crypto++;
            if (account.cashPositions > 0) counts.cash++;
            if (account.metalPositions > 0) counts.metal++;
            if (account.otherPositions > 0) counts.other++;
        });
        
        return counts;
    }, [accounts]);

    // Toggle asset type filter
    const toggleAssetType = (type) => {
        const newTypes = new Set(selectedAssetTypes);
        if (newTypes.has(type)) {
            newTypes.delete(type);
        } else {
            newTypes.add(type);
        }
        setSelectedAssetTypes(newTypes);
    };

    // Calculate totals for summary rows
    const totals = useMemo(() => {
        if (!accounts || accounts.length === 0) {
            return {
                totalValue: 0,
                totalCostBasis: 0,
                totalGainLoss: 0,
                positionsCount: 0,
                cashBalance: 0,
                totalGainLossPercent: 0,
                liquidValue: 0,
                illiquidValue: 0,
                // Performance metrics
                value1dChange: 0,
                value1dChangePct: 0,
                value1wChange: 0,
                value1wChangePct: 0,
                value1mChange: 0,
                value1mChangePct: 0,
                valueYtdChange: 0,
                valueYtdChangePct: 0,
                value1yChange: 0,
                value1yChangePct: 0
            };
        }

        const result = accounts.reduce((acc, account) => {
            acc.totalValue += account.totalValue ?? 0;
            acc.totalCostBasis += account.totalCostBasis ?? 0;
            acc.totalGainLoss += account.totalGainLoss ?? 0;
            acc.positionsCount += account.positionsCount ?? 0;
            acc.cashBalance += account.cashValue ?? 0;
            
            // Liquid vs Illiquid
            const liquidValue = (account.securityValue ?? 0) + (account.cryptoValue ?? 0) + 
                              (account.cashValue ?? 0) + (account.metalValue ?? 0);
            const illiquidValue = account.otherAssetsValue ?? 0;
            
            acc.liquidValue += liquidValue;
            acc.illiquidValue += illiquidValue;
            
            // Performance aggregation
            acc.value1dChange += account.value1dChange ?? 0;
            acc.value1wChange += account.value1wChange ?? 0;
            acc.value1mChange += account.value1mChange ?? 0;
            acc.valueYtdChange += account.valueYtdChange ?? 0;
            acc.value1yChange += account.value1yChange ?? 0;
            
            return acc;
        }, { 
            totalValue: 0, 
            totalCostBasis: 0, 
            totalGainLoss: 0, 
            positionsCount: 0,
            cashBalance: 0,
            liquidValue: 0,
            illiquidValue: 0,
            value1dChange: 0,
            value1wChange: 0,
            value1mChange: 0,
            valueYtdChange: 0,
            value1yChange: 0
        });
        
        // Calculate percentages
        result.totalGainLossPercent = result.totalCostBasis > 0 
            ? (result.totalGainLoss / result.totalCostBasis) 
            : 0;
            
        // Calculate performance percentages based on previous values
        const prevValue1d = result.totalValue - result.value1dChange;
        result.value1dChangePct = prevValue1d > 0 ? (result.value1dChange / prevValue1d) : 0;
        
        const prevValue1w = result.totalValue - result.value1wChange;
        result.value1wChangePct = prevValue1w > 0 ? (result.value1wChange / prevValue1w) : 0;
        
        const prevValue1m = result.totalValue - result.value1mChange;
        result.value1mChangePct = prevValue1m > 0 ? (result.value1mChange / prevValue1m) : 0;
        
        const prevValueYtd = result.totalValue - result.valueYtdChange;
        result.valueYtdChangePct = prevValueYtd > 0 ? (result.valueYtdChange / prevValueYtd) : 0;
        
        const prevValue1y = result.totalValue - result.value1yChange;
        result.value1yChangePct = prevValue1y > 0 ? (result.value1yChange / prevValue1y) : 0;
            
        return result;
    }, [accounts]);

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
            <ChevronUp className="inline-block w-4 h-4 ml-1 transition-transform duration-200" /> : 
            <ChevronDown className="inline-block w-4 h-4 ml-1 transition-transform duration-200" />;
    };

    // Enhanced refresh with animation
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // --- Filtering & Sorting ---
    const filteredAndSortedAccounts = useMemo(() => {
        let filtered = accounts || [];
        
        // Search filter
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(acc =>
                acc.name?.toLowerCase().includes(lowerCaseQuery) ||
                acc.institution?.toLowerCase().includes(lowerCaseQuery) ||
                acc.type?.toLowerCase().includes(lowerCaseQuery)
            );
        }
        
        // Asset type filter
        filtered = filtered.filter(account => {
            const hasSelectedAssets = 
                (selectedAssetTypes.has('security') && account.securityValue > 0) ||
                (selectedAssetTypes.has('crypto') && account.cryptoValue > 0) ||
                (selectedAssetTypes.has('cash') && account.cashValue > 0) ||
                (selectedAssetTypes.has('metal') && account.metalValue > 0) ||
                (selectedAssetTypes.has('other') && account.otherAssetsValue > 0);
            return hasSelectedAssets;
        });
        
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
                default: comparison = (b.totalValue ?? 0) - (a.totalValue ?? 0);
            }
            
            return sortDirection === 'asc' ? -comparison : comparison;
        });
        
        return sorted;
    }, [accounts, sortField, sortDirection, searchQuery, selectedAssetTypes]);

    // --- Modal Trigger Handlers ---
    const handleRowClick = (account) => {
        // Ensure all fields have safe defaults
        const safeAccount = {
            ...account,
            id: account.id,
            account_name: account.name || '',
            institution: account.institution || '',
            type: account.type || '',
            category: account.category || '',
            cash_balance: account.cashValue || 0,
            total_value: account.totalValue || 0,
            total_cost_basis: account.totalCostBasis || 0,
            total_gain_loss: account.totalGainLoss || 0,
            total_gain_loss_percent: account.totalGainLossPercent || 0,
            positions_count: account.positionsCount || 0,
            positions: account.positions || []
        };
        
        setSelectedAccountDetail(safeAccount); 
        setIsDetailModalOpen(true); 
    };
    
    const handleCloseDetailModal = () => setIsDetailModalOpen(false);

    // --- Delete Handlers ---
    const handleDeleteClick = (account) => {
        console.log("UnifiedAccountTable2: Delete triggered for:", account?.name);
        setAccountToDelete(account);
        setIsDeleteModalOpen(true);
    };
    
    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setTimeout(() => setAccountToDelete(null), 300);
    };
    
    const handleConfirmDelete = async () => {
        if (!accountToDelete) return;
        const deletedName = accountToDelete.name;
        console.log("UnifiedAccountTable2: Confirming delete for account:", accountToDelete.id);
        try {
            await deleteAccountFromStore(accountToDelete.id);
            handleCloseDeleteModal();
            setSuccessMessage(`Account "${deletedName}" deleted successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
            refresh();
            onDataChanged();
        } catch (err) {
            console.error("UnifiedAccountTable2: Delete failed:", err);
            handleCloseDeleteModal();
        }
    };

    // --- Edit Handlers ---
    const handleEditClick = (account) => {
        console.log("UnifiedAccountTable2: Edit triggered for account:", account?.name);
        const safeAccount = {
            ...account,
            id: account.id,
            account_name: account.name || '',
            institution: account.institution || '',
            type: account.type || '',
            category: account.category || '',
            cash_balance: account.cashValue || 0
        };
        setAccountToEdit(safeAccount);
        setIsEditModalOpen(true);
    };
    
    const handleCloseEditModal = (didSave) => {
        const accountName = accountToEdit?.name;
        setIsEditModalOpen(false);
        setAccountToEdit(null);
        if (didSave) {
            setSuccessMessage(`Account "${accountName}" updated successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
            refresh();
            onDataChanged();
        }
    };

    // --- Add Position Handlers ---
    const handleAddPositionClick = (account) => {
        console.log("UnifiedAccountTable2: Add Position triggered for account:", account?.name);
        const safeAccount = {
            ...account,
            id: account.id,
            account_name: account.name || '',
            institution: account.institution || '',
            type: account.type || ''
        };
        setAccountForPosition(safeAccount);
        setIsAddPositionFlowOpen(true);
    };
    
    const handleCloseAddPositionFlow = (didSave) => {
        const accountName = accountForPosition?.name;
        setIsAddPositionFlowOpen(false);
        setAccountForPosition(null);
        if (didSave) {
            setSuccessMessage(`Position added to "${accountName}" successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
            refresh();
            onDataChanged();
        }
    };

    // --- Render Logic ---
    if (loading && !accounts?.length) {
        console.log("UnifiedAccountTable2: Rendering Loading State");
        return (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex items-center justify-center text-white">
                <div>
                    <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-gray-400">Loading accounts...</p>
                </div>
            </div>
        );
    }

    console.log("UnifiedAccountTable2: Rendering Table Content, accounts count:", accounts?.length || 0);

    // Main Table Render
    return (
        <>
            {/* --- Fixed Position UI Feedback --- */}
            {successMessage && (
                <div className="fixed bottom-4 right-4 p-4 bg-green-600 text-white rounded-lg shadow-lg z-[100] animate-slideInRight">
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        {successMessage}
                    </div>
                </div>
            )}
            {error && !loading && (
                <div className="fixed bottom-4 right-4 p-4 bg-red-600 text-white rounded-lg shadow-lg z-[100] animate-slideInRight">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Error: {error}
                        <button onClick={()=>refresh()} className="ml-2 text-xs underline font-semibold hover:text-red-100">Retry</button>
                    </div>
                </div>
            )}

            {/* --- Table Section --- */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center p-3 border-b border-gray-700 gap-4 text-white bg-gradient-to-r from-gray-800/50 to-gray-900/50">
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap">
                        <Briefcase className="w-5 h-5 mr-2 text-blue-400 animate-pulse" />
                        {title}
                    </h2>
                    <div className='flex flex-wrap items-center gap-4'>
                        {/* Search Input */}
                        <div className="relative group">
                            <Search className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto transition-colors group-hover:text-blue-400" />
                            <input 
                                type="text" 
                                className="bg-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 hover:bg-gray-600" 
                                placeholder="Search accounts..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                        
                        {/* Asset Type Filter */}
                        <AssetTypeFilter
                            selectedTypes={selectedAssetTypes}
                            onToggle={toggleAssetType}
                            counts={assetTypeCounts}
                        />
                        
                        {/* Sort Select */}
                        <div className="relative group">
                            <SlidersHorizontal className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto transition-colors group-hover:text-blue-400" />
                            <select 
                                className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none transition-all duration-200 hover:bg-gray-600 cursor-pointer" 
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
                                <option value="institution-high">Sort: Institution (A-Z)</option>
                                <option value="cost_basis-high">Sort: Cost Basis (High-Low)</option>
                                <option value="cost_basis-low">Sort: Cost Basis (Low-High)</option>
                                <option value="gain_loss-high">Sort: Gain $ (High-Low)</option>
                                <option value="gain_loss-low">Sort: Gain $ (Low-High)</option>
                                <option value="positions-high">Sort: Positions (High-Low)</option>
                                <option value="positions-low">Sort: Positions (Low-High)</option>
                                <option value="cash-high">Sort: Cash (High-Low)</option>
                                <option value="cash-low">Sort: Cash (Low-High)</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        
                        {/* View Toggle */}
                        <button
                            onClick={() => setShowValues(!showValues)}
                            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                            title={showValues ? "Hide values" : "Show values"}
                        >
                            {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        
                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={loading || isRefreshing}
                            className={`p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5 ${
                                (loading || isRefreshing) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-4 h-4 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                        </button>
                        
                        {/* Add Account Button */}
                        <AddAccountButton 
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5" 
                            onAccountAdded={() => {
                                refresh();
                                onDataChanged();
                            }} 
                        />
                    </div>
                </div>

                {/* Table Content */}
                {filteredAndSortedAccounts.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
                            <Search className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-lg">No accounts match your criteria</p>
                        <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search terms</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700 text-white">
                            <thead className="bg-gray-900/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-10">#</th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleSortChange('institution')}
                                    >
                                        Institution {getSortIndicator('institution')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleSortChange('name')}
                                    >
                                        Account Name {getSortIndicator('name')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell w-20 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleSortChange('positions')}
                                    >
                                        Positions {getSortIndicator('positions')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleSortChange('value')}
                                    >
                                        Value {getSortIndicator('value')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell w-28 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleSortChange('cash')}
                                    >
                                        Cash {getSortIndicator('cash')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell w-28 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleSortChange('cost_basis')}
                                    >
                                        Cost Basis {getSortIndicator('cost_basis')}
                                    </th>
                                    <th 
                                        scope="col" 
                                        className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => handleSortChange('gain_loss')}
                                    >
                                        Gain/Loss {getSortIndicator('gain_loss')}
                                    </th>
                                    {/* Performance Section */}
                                    <th scope="col" colSpan={5} className="px-2 py-1 text-center">
                                        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Performance</div>
                                        <div className="flex justify-around mt-1">
                                            <span className="text-xs text-gray-500">1D</span>
                                            <span className="text-xs text-gray-500">1W</span>
                                            <span className="text-xs text-gray-500">MTD</span>
                                            <span className="text-xs text-gray-500">YTD</span>
                                            <span className="text-xs text-gray-500">1Y</span>
                                        </div>
                                    </th>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {/* Total NestEgg Summary Row */}
                                <tr className="bg-blue-900/30 font-medium border-b-2 border-blue-700">
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                        <span className="font-bold animate-pulse">•</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="text-sm font-bold text-white">Total NestEgg</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm"></td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell">
                                        {totals.positionsCount}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-bold">
                                        {showValues ? formatCurrency(totals.totalValue) : '••••'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                        {showValues ? formatCurrency(totals.cashBalance) : '••••'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                        {showValues ? formatCurrency(totals.totalCostBasis) : '••••'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                        <div className="flex flex-col items-end">
                                            <div className={`text-sm font-bold ${totals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {showValues ? `${totals.totalGainLoss >= 0 ? '+' : ''}${formatCurrency(totals.totalGainLoss)}` : '••••'}
                                            </div>
                                            <div className={`text-xs ${totals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                ({totals.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(totals.totalGainLossPercent)})
                                            </div>
                                        </div>
                                    </td>
                                    {/* Performance cells */}
                                    <PerformanceCell 
                                        percentChange={totals.value1dChangePct} 
                                        dollarChange={totals.value1dChange}
                                        period="1 Day"
                                    />
                                    <PerformanceCell 
                                        percentChange={totals.value1wChangePct} 
                                        dollarChange={totals.value1wChange}
                                        period="1 Week"
                                    />
                                    <PerformanceCell 
                                        percentChange={totals.value1mChangePct} 
                                        dollarChange={totals.value1mChange}
                                        period="Month to Date"
                                    />
                                    <PerformanceCell 
                                        percentChange={totals.valueYtdChangePct} 
                                        dollarChange={totals.valueYtdChange}
                                        period="Year to Date"
                                    />
                                    <PerformanceCell 
                                        percentChange={totals.value1yChangePct} 
                                        dollarChange={totals.value1yChange}
                                        period="1 Year"
                                    />
                                    <td className="px-3 py-2 whitespace-nowrap text-center"></td>
                                </tr>
                                
                                {/* Liquid Assets Row */}
                                <tr className="bg-green-900/20 font-medium">
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                        <Coins className="w-4 h-4 text-green-400 inline" />
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="text-sm font-semibold text-green-400">Liquid Assets</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">
                                        Securities, Crypto, Cash, Metals
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell"></td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-semibold text-green-400">
                                        {showValues ? formatCurrency(totals.liquidValue) : '••••'}
                                    </td>
                                    <td colSpan={8}></td>
                                </tr>
                                
                                {/* Illiquid Assets Row */}
                                <tr className="bg-orange-900/20 font-medium border-b-2 border-gray-700">
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                        <Home className="w-4 h-4 text-orange-400 inline" />
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="text-sm font-semibold text-orange-400">Illiquid Assets</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">
                                        Real Estate, Vehicles, Other
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell"></td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-semibold text-orange-400">
                                        {showValues ? formatCurrency(totals.illiquidValue) : '••••'}
                                    </td>
                                    <td colSpan={8}></td>
                                </tr>
                                
                                {/* Regular account rows */}
                                {filteredAndSortedAccounts.map((account, index) => {
                                    const costBasis = account.totalCostBasis ?? 0;
                                    const gainLoss = account.totalGainLoss ?? 0;
                                    const gainLossPercent = account.totalGainLossPercent ?? 0;
                                    const positionsCount = account.positionsCount ?? 0;
                                    const totalValue = account.totalValue ?? 0;
                                    const LogoComponent = getInstitutionLogo(account.institution);

                                    return (
                                        <tr 
                                            key={account.id} 
                                            className="hover:bg-gray-700/50 transition-all duration-200 cursor-pointer group" 
                                            onClick={() => handleRowClick(account)}
                                        >
                                            {/* Rank Number */}
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{index + 1}</span>
                                            </td>
                                            
                                            {/* Institution */}
                                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                <div className="flex items-center max-w-xs">
                                                    {typeof LogoComponent === 'string'
                                                        ? <img src={LogoComponent} alt={account.institution || ''} className="w-5 h-5 object-contain mr-2 rounded-sm flex-shrink-0 group-hover:scale-110 transition-transform"/>
                                                        : LogoComponent
                                                            ? <div className="w-5 h-5 mr-2 flex items-center justify-center group-hover:scale-110 transition-transform"><LogoComponent /></div>
                                                            : (account.institution &&
                                                                <div className="flex-shrink-0 h-5 w-5 rounded-sm bg-gray-600 flex items-center justify-center mr-2 text-xs font-medium text-gray-300 group-hover:bg-gray-500 transition-colors">
                                                                    {account.institution.charAt(0).toUpperCase()}
                                                                </div>
                                                              )
                                                    }
                                                    <span className="break-words whitespace-normal group-hover:text-blue-400 transition-colors">{account.institution || "N/A"}</span>
                                                </div>
                                            </td>
                                            
                                            {/* Account Name + Type */}
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-sm font-medium group-hover:text-blue-400 transition-colors">{account.name || 'Unnamed Account'}</div>
                                                {account.type && (
                                                    <div className="text-xs text-gray-400 italic">{account.type}</div>
                                                )}
                                            </td>
                                            
                                            {/* Positions Count */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell">{positionsCount}</td>
                                            
                                            {/* Value */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                {showValues ? formatCurrency(totalValue) : '••••'}
                                            </td>
                                            
                                            {/* Cash Balance */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                                {showValues ? formatCurrency(account.cashValue ?? 0) : '••••'}
                                            </td>
                                            
                                            {/* Cost Basis */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                                {showValues ? formatCurrency(costBasis) : '••••'}
                                            </td>
                                            
                                            {/* Gain/Loss */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className={`text-sm font-medium flex items-center gap-1 ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {gainLoss !== 0 && (
                                                            gainLoss > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                                                        )}
                                                        {showValues ? `${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss)}` : '••••'}
                                                    </div>
                                                    <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Performance cells */}
                                            <PerformanceCell 
                                                percentChange={account.value1dChangePct || 0} 
                                                dollarChange={account.value1dChange || 0}
                                                period="1 Day"
                                            />
                                            <PerformanceCell 
                                                percentChange={account.value1wChangePct || 0} 
                                                dollarChange={account.value1wChange || 0}
                                                period="1 Week"
                                            />
                                            <PerformanceCell 
                                                percentChange={account.value1mChangePct || 0} 
                                                dollarChange={account.value1mChange || 0}
                                                period="Month to Date"
                                            />
                                            <PerformanceCell 
                                                percentChange={account.valueYtdChangePct || 0} 
                                                dollarChange={account.valueYtdChange || 0}
                                                period="Year to Date"
                                            />
                                            <PerformanceCell 
                                                percentChange={account.value1yChangePct || 0} 
                                                dollarChange={account.value1yChange || 0}
                                                period="1 Year"
                                            />
                                            
                                            {/* Actions Cell */}
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <AddPositionButton 
                                                        accountId={account.id}
                                                        className="p-1.5 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/40 transition-all duration-200 hover:scale-110"
                                                        buttonContent={<Plus className="h-4 w-4" />}
                                                        onPositionAdded={() => {
                                                            refresh();
                                                            onDataChanged();
                                                        }}
                                                    />
                                                    <EditAccountButton 
                                                        account={account}
                                                        className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40 transition-all duration-200 hover:scale-110" 
                                                        onAccountEdited={() => {
                                                            refresh();
                                                            onDataChanged();
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(account); }} 
                                                        className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40 transition-all duration-200 hover:scale-110" 
                                                        title="Delete Account"
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
                )}
                
                {/* Data staleness indicator */}
                {isStale && (
                    <div className="px-4 py-2 bg-yellow-900/20 border-t border-yellow-900/40 animate-pulse">
                        <p className="text-xs text-yellow-500 text-center flex items-center justify-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Data is being refreshed...
                        </p>
                    </div>
                )}
            </div>

            {/* --- Render Modals / Flows --- */}
            {selectedAccountDetail && (
                <AccountDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    account={selectedAccountDetail}
                    onTriggerEdit={handleEditClick}
                    onTriggerDelete={handleDeleteClick}
                    onTriggerAddPosition={handleAddPositionClick}
                />
            )}

            {accountToDelete && (
                <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseDeleteModal}
                    onConfirm={handleConfirmDelete}
                    itemName={accountToDelete?.name}
                    itemType="account"
                />
            )}

            {isEditModalOpen && (
                <AccountModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    editAccount={accountToEdit}
                />
            )}

            {isAddPositionFlowOpen && (
                <AddPositionFlow
                    isOpen={isAddPositionFlowOpen}
                    onClose={handleCloseAddPositionFlow}
                    initialAccount={accountForPosition}
                />
            )}
            
            {/* CSS for animations */}
            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
                
                .animate-slideInRight {
                    animation: slideInRight 0.3s ease-out;
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-in;
                }
            `}</style>
        </>
    );
};

export default UnifiedAccountTable2;