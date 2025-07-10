import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDataStore } from '@/store/DataStore';
import { 
    TrendingUp,
    DollarSign,
    Calendar,
    Hash,
    Plus,
    Trash2,
    Copy,
    CheckCircle,
    X,
    Loader2,
    ArrowUpDown,
    Sparkles,
    Building,
    Search,
    ChevronDown,
    Check,
    PieChart,
    BarChart3,
    Briefcase,
    Coins,
    Home,
    Gem,
    Bitcoin,
    FileText,
    AlertCircle,
    Info,
    Zap,
    Star,
    Target,
    Shield,
    Clock,
    Filter,
    Package,
    Tag,
    Activity,
    Layers,
    Grid3X3,
    List,
    Eye,
    EyeOff,
    RefreshCw,
    Download,
    Upload,
    ArrowRight,
    ChevronRight,
    Wallet,
    CreditCard,
    Receipt,
    Calculator,
    Percent,
    CircleDollarSign,
    Banknote,
    ChartLine,
    ChartBar,
    SortAsc,
    SortDesc
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';

// Asset types with icons and colors
const ASSET_TYPES = [
    { 
        id: 'stock', 
        name: 'Stock', 
        icon: TrendingUp, 
        color: 'blue', 
        colorClasses: 'text-blue-600 bg-blue-100',
        gradientClasses: 'bg-gradient-to-r from-blue-50 to-blue-100',
        description: 'Common & Preferred Shares' 
    },
    { 
        id: 'etf', 
        name: 'ETF', 
        icon: PieChart, 
        color: 'green', 
        colorClasses: 'text-green-600 bg-green-100',
        gradientClasses: 'bg-gradient-to-r from-green-50 to-green-100',
        description: 'Exchange Traded Funds' 
    },
    { 
        id: 'mutualfund', 
        name: 'Mutual Fund', 
        icon: BarChart3, 
        color: 'purple', 
        colorClasses: 'text-purple-600 bg-purple-100',
        gradientClasses: 'bg-gradient-to-r from-purple-50 to-purple-100',
        description: 'Managed Investment Funds' 
    },
    { 
        id: 'bond', 
        name: 'Bond', 
        icon: FileText, 
        color: 'amber', 
        colorClasses: 'text-amber-600 bg-amber-100',
        gradientClasses: 'bg-gradient-to-r from-amber-50 to-amber-100',
        description: 'Fixed Income Securities' 
    },
    { 
        id: 'crypto', 
        name: 'Cryptocurrency', 
        icon: Bitcoin, 
        color: 'orange', 
        colorClasses: 'text-orange-600 bg-orange-100',
        gradientClasses: 'bg-gradient-to-r from-orange-50 to-orange-100',
        description: 'Digital Assets' 
    },
    { 
        id: 'cash', 
        name: 'Cash', 
        icon: Banknote, 
        color: 'emerald', 
        colorClasses: 'text-emerald-600 bg-emerald-100',
        gradientClasses: 'bg-gradient-to-r from-emerald-50 to-emerald-100',
        description: 'Money Market & Cash' 
    },
    { 
        id: 'commodity', 
        name: 'Commodity', 
        icon: Package, 
        color: 'rose', 
        colorClasses: 'text-rose-600 bg-rose-100',
        gradientClasses: 'bg-gradient-to-r from-rose-50 to-rose-100',
        description: 'Physical Goods & Resources' 
    },
    { 
        id: 'realestate', 
        name: 'Real Estate', 
        icon: Home, 
        color: 'indigo', 
        colorClasses: 'text-indigo-600 bg-indigo-100',
        gradientClasses: 'bg-gradient-to-r from-indigo-50 to-indigo-100',
        description: 'Property & REITs' 
    },
    { 
        id: 'alternative', 
        name: 'Alternative', 
        icon: Gem, 
        color: 'pink', 
        colorClasses: 'text-pink-600 bg-pink-100',
        gradientClasses: 'bg-gradient-to-r from-pink-50 to-pink-100',
        description: 'Art, Collectibles, Other' 
    },
];

// Common stock symbols for quick selection
const POPULAR_SYMBOLS = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
];

// Component for animated values
const AnimatedValue = ({ value, prefix = '', suffix = '', decimals = 2 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        const numValue = parseFloat(value) || 0;
        let startTime;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / 500, 1);
            setDisplayValue(progress * numValue);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    
    return (
        <span>
            {prefix}{displayValue.toFixed(decimals)}{suffix}
        </span>
    );
};

// Enhanced symbol search dropdown
const SymbolSearchDropdown = ({ value, onChange, assetType, placeholder = "Enter symbol..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    
    const filteredSymbols = useMemo(() => {
        if (!search) return POPULAR_SYMBOLS.slice(0, 8);
        return POPULAR_SYMBOLS.filter(s => 
            s.symbol.toLowerCase().includes(search.toLowerCase()) ||
            s.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);
    
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(-1);
        }
    }, [isOpen]);
    
    const handleKeyDown = (e) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            return;
        }
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => 
                prev < filteredSymbols.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => prev > -1 ? prev - 1 : -1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && filteredSymbols[highlightedIndex]) {
                onChange(filteredSymbols[highlightedIndex].symbol);
                setIsOpen(false);
                setHighlightedIndex(-1);
                setSearch('');
            } else if (search) {
                onChange(search.toUpperCase());
                setIsOpen(false);
                setSearch('');
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };
    
    return (
        <div ref={dropdownRef} className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={value || search}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearch(val);
                        if (!isOpen) setIsOpen(true);
                        if (!val) onChange('');
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 pl-8"
                />
                <Hash className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
                    <div className="max-h-64 overflow-y-auto">
                        {filteredSymbols.length === 0 ? (
                            <div className="p-4 text-center">
                                <p className="text-sm text-gray-500">No symbols found</p>
                                {search && (
                                    <button
                                        onClick={() => {
                                            onChange(search.toUpperCase());
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Use "{search.toUpperCase()}"
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {search && !filteredSymbols.find(s => s.symbol === search.toUpperCase()) && (
                                    <button
                                        onClick={() => {
                                            onChange(search.toUpperCase());
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(-1)}
                                        className="w-full px-3 py-2 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors border-b border-gray-100"
                                    >
                                        <span className="text-sm font-medium text-blue-700">Use "{search.toUpperCase()}"</span>
                                        <Plus className="w-4 h-4 text-blue-600" />
                                    </button>
                                )}
                                {filteredSymbols.map((item, idx) => (
                                    <button
                                        key={item.symbol}
                                        onClick={() => {
                                            onChange(item.symbol);
                                            setIsOpen(false);
                                            setSearch('');
                                            setHighlightedIndex(-1);
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                                            highlightedIndex === idx ? 'bg-gray-100' : ''
                                        } ${value === item.symbol ? 'bg-blue-50' : ''}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="font-medium text-gray-900">{item.symbol}</span>
                                            <span className="text-sm text-gray-500">{item.name}</span>
                                        </div>
                                        {value === item.symbol && (
                                            <Check className="w-4 h-4 text-blue-600" />
                                        )}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                        <p className="text-xs text-gray-500 flex items-center">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Popular symbols • Type to search
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const QuickAddPositionsModal = ({ isOpen, onClose, accounts = [] }) => {
    const [positions, setPositions] = useState([]);
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterAssetType, setFilterAssetType] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [selectedPositions, setSelectedPositions] = useState(new Set());
    const newRowRef = useRef(null);
    const { actions } = useDataStore();
    const { refreshData } = actions;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize with one empty position
    useEffect(() => {
        if (isOpen && positions.length === 0) {
            addNewPosition();
        }
    }, [isOpen]);
    
    // Auto-focus new row
    useEffect(() => {
        if (newRowRef.current) {
            newRowRef.current.focus();
        }
    }, [positions.length]);
    
    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setPositions([]);
                setViewMode('grid');
                setSortConfig({ key: null, direction: 'asc' });
                setFilterAssetType('all');
                setFilterAccount('all');
                setShowSuccess(false);
                setBulkEditMode(false);
                setSelectedPositions(new Set());
            }, 300);
        }
    }, [isOpen]);
    
    const addNewPosition = () => {
        const newPosition = {
            tempId: Date.now() + Math.random(),
            assetType: '',
            accountId: '',
            symbol: '',
            quantity: '',
            purchaseDate: today,
            purchasePrice: '',
            isNew: true
        };
        setPositions([...positions, newPosition]);
    };
    
    const updatePosition = (tempId, field, value) => {
        setPositions(positions.map(pos => {
            if (pos.tempId === tempId) {
                return { ...pos, [field]: value, isNew: false };
            }
            return pos;
        }));
    };
    
    const deletePosition = (tempId) => {
        setPositions(positions.filter(pos => pos.tempId !== tempId));
        setSelectedPositions(prev => {
            const next = new Set(prev);
            next.delete(tempId);
            return next;
        });
    };
    
    const duplicatePosition = (position) => {
        const newPosition = {
            ...position,
            tempId: Date.now() + Math.random(),
            isNew: true
        };
        setPositions([...positions, newPosition]);
    };
    
    const toggleSelectPosition = (tempId) => {
        setSelectedPositions(prev => {
            const next = new Set(prev);
            if (next.has(tempId)) {
                next.delete(tempId);
            } else {
                next.add(tempId);
            }
            return next;
        });
    };
    
    const selectAllPositions = () => {
        if (selectedPositions.size === filteredPositions.length) {
            setSelectedPositions(new Set());
        } else {
            setSelectedPositions(new Set(filteredPositions.map(p => p.tempId)));
        }
    };
    
    const deleteSelectedPositions = () => {
        setPositions(positions.filter(pos => !selectedPositions.has(pos.tempId)));
        setSelectedPositions(new Set());
    };
    
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const validPositions = positions.filter(pos => 
        pos.assetType && pos.accountId && pos.symbol && pos.quantity && pos.purchasePrice
    );
    
    const filteredPositions = useMemo(() => {
        let filtered = [...positions];
        
        if (filterAssetType !== 'all') {
            filtered = filtered.filter(p => p.assetType === filterAssetType);
        }
        
        if (filterAccount !== 'all') {
            filtered = filtered.filter(p => p.accountId === filterAccount);
        }
        
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                
                // Handle numeric values
                if (sortConfig.key === 'quantity' || sortConfig.key === 'purchasePrice') {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                }
                
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [positions, filterAssetType, filterAccount, sortConfig]);
    
    // Calculate total value
    const totalValue = useMemo(() => {
        return validPositions.reduce((sum, pos) => {
            return sum + (parseFloat(pos.quantity) * parseFloat(pos.purchasePrice));
        }, 0);
    }, [validPositions]);
    
    // Group positions by account
    const positionsByAccount = useMemo(() => {
        const grouped = {};
        validPositions.forEach(pos => {
            const account = accounts.find(a => a.id === pos.accountId);
            if (account) {
                if (!grouped[account.account_name]) {
                    grouped[account.account_name] = {
                        account,
                        positions: [],
                        totalValue: 0
                    };
                }
                grouped[account.account_name].positions.push(pos);
                grouped[account.account_name].totalValue += parseFloat(pos.quantity) * parseFloat(pos.purchasePrice);
            }
        });
        return grouped;
    }, [validPositions, accounts]);
    
    const handleSubmitPositions = async () => {
        if (validPositions.length === 0) return;
        
        setIsSubmitting(true);
        try {
            const positionsToSubmit = validPositions.map(pos => ({
                account_id: pos.accountId,
                symbol: pos.symbol,
                quantity: parseFloat(pos.quantity),
                purchase_date: pos.purchaseDate,
                purchase_price: parseFloat(pos.purchasePrice),
                asset_type: pos.assetType
            }));
            
            // Submit positions one by one
            for (const position of positionsToSubmit) {
                const response = await fetchWithAuth('/positions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(position)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to create position ${position.symbol}: ${errorText}`);
                }
            }

            await refreshData();
            
            setShowSuccess(true);
        } catch (error) {
            console.error('Error submitting positions:', error);
            alert(`Failed to create positions: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderHeader = () => (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 pb-4">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl mb-4 shadow-2xl shadow-green-500/30">
                    <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Quick Add Positions</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Add multiple investment positions across your accounts
                </p>
            </div>
            
            {/* Stats Bar */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-700">
                            {positions.length}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">Total Positions</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-2xl font-bold text-green-700">
                            {validPositions.length}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">Ready to Import</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                        <CircleDollarSign className="w-5 h-5 text-purple-600" />
                        <p className="text-2xl font-bold text-purple-700">
                            <AnimatedValue value={totalValue} prefix="$" />
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">Total Value</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center justify-between mb-2">
                        <Building className="w-5 h-5 text-amber-600" />
                        <p className="text-2xl font-bold text-amber-700">
                            {Object.keys(positionsByAccount).length}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">Accounts Used</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                    <div className="flex items-center justify-between mb-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        <p className="text-2xl font-bold text-indigo-700">
                            {new Set(positions.map(p => p.assetType).filter(Boolean)).size}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600">Asset Types</p>
                </div>
            </div>
            
            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={addNewPosition}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Position
                    </button>
                    
                    {validPositions.length > 0 && (
                        <button
                            onClick={handleSubmitPositions}
                            disabled={isSubmitting}
                            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import {validPositions.length} Positions
                                </>
                            )}
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Bulk Edit Toggle */}
                    <button
                        onClick={() => setBulkEditMode(!bulkEditMode)}
                        className={`px-3 py-2 rounded-lg transition-all ${
                            bulkEditMode ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <CheckCircle className="w-4 h-4" />
                    </button>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-md transition-all ${
                                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                            }`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md transition-all ${
                                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                            }`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filterAssetType}
                            onChange={(e) => setFilterAssetType(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">All Types</option>
                            {ASSET_TYPES.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                        
                        <select
                            value={filterAccount}
                            onChange={(e) => setFilterAccount(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">All Accounts</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>{account.account_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* Bulk Actions Bar */}
            {bulkEditMode && selectedPositions.size > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between animate-slideIn">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={selectAllPositions}
                            className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                        >
                            {selectedPositions.size === filteredPositions.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-sm text-gray-600">
                            {selectedPositions.size} selected
                        </span>
                    </div>
                    <button
                        onClick={deleteSelectedPositions}
                        className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Selected
                    </button>
                </div>
            )}
        </div>
    );
    
    const renderGridView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredPositions.map((position, index) => {
                const isValid = position.assetType && position.accountId && position.symbol && position.quantity && position.purchasePrice;
                const assetType = ASSET_TYPES.find(t => t.id === position.assetType);
                const account = accounts.find(a => a.id === position.accountId);
                const value = parseFloat(position.quantity || 0) * parseFloat(position.purchasePrice || 0);
                
                return (
                    <div
                        key={position.tempId}
                        className={`relative bg-white rounded-xl border-2 shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl ${
                            position.isNew ? 'border-blue-400 ring-2 ring-blue-400/20 animate-slideIn' :
                            isValid ? 'border-green-300' : 'border-gray-200'
                        }`}
                    >
                        {/* Card Header */}
                        <div className={`p-4 border-b ${assetType ? assetType.gradientClasses : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {bulkEditMode && (
                                        <input
                                            type="checkbox"
                                            checked={selectedPositions.has(position.tempId)}
                                            onChange={() => toggleSelectPosition(position.tempId)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                    )}
                                    <select
                                        value={position.assetType}
                                        onChange={(e) => updatePosition(position.tempId, 'assetType', e.target.value)}
                                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Asset Type...</option>
                                        {ASSET_TYPES.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => duplicatePosition(position)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deletePosition(position.tempId)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {assetType && (
                                <div className="flex items-center gap-2">
                                    <assetType.icon className={`w-5 h-5 ${assetType.colorClasses.split(' ')[0]}`} />
                                    <span className="text-sm font-medium text-gray-700">{assetType.description}</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Account</label>
                                <select
                                    value={position.accountId}
                                    onChange={(e) => updatePosition(position.tempId, 'accountId', e.target.value)}
                                    className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Select account...</option>
                                    {accounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.account_name} ({account.institution})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Symbol / Identifier</label>
                                <SymbolSearchDropdown
                                    value={position.symbol}
                                    onChange={(value) => updatePosition(position.tempId, 'symbol', value)}
                                    assetType={position.assetType}
                                    placeholder="Enter symbol..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">Quantity</label>
                                    <input
                                        type="number"
                                        value={position.quantity}
                                        onChange={(e) => updatePosition(position.tempId, 'quantity', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={position.purchasePrice}
                                            onChange={(e) => updatePosition(position.tempId, 'purchasePrice', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full mt-1 pl-7 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Purchase Date</label>
                                <input
                                    type="date"
                                    value={position.purchaseDate}
                                    onChange={(e) => updatePosition(position.tempId, 'purchaseDate', e.target.value)}
                                    max={today}
                                    className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            
                            {/* Value Display */}
                            {position.quantity && position.purchasePrice && (
                                <div className="pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Total Value</span>
                                        <span className="text-lg font-semibold text-gray-900">
                                            <AnimatedValue value={value} prefix="$" />
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Status Indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-500 ${
                            position.isNew ? 'bg-gradient-to-b from-blue-400 to-indigo-500 animate-pulse' :
                            isValid ? 'bg-gradient-to-b from-green-400 to-emerald-500' : 'bg-gray-300'
                        }`} />
                        
                        {/* Success Badge */}
                        {isValid && !position.isNew && (
                            <div className="absolute -right-2 -top-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg transform scale-0 animate-scaleIn">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
    
    const renderListView = () => (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <tr>
                            {bulkEditMode && (
                                <th className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedPositions.size === filteredPositions.length && filteredPositions.length > 0}
                                        onChange={selectAllPositions}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                </th>
                            )}
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('assetType')}
                                    className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Type
                                    <ArrowUpDown className="w-3 h-3 ml-1" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('accountId')}
                                    className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Account
                                    <ArrowUpDown className="w-3 h-3 ml-1" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('symbol')}
                                    className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Symbol
                                    <ArrowUpDown className="w-3 h-3 ml-1" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleSort('quantity')}
                                    className="flex items-center justify-end text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Quantity
                                    <ArrowUpDown className="w-3 h-3 ml-1" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleSort('purchasePrice')}
                                    className="flex items-center justify-end text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Price
                                    <ArrowUpDown className="w-3 h-3 ml-1" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('purchaseDate')}
                                    className="flex items-center text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Date
                                    <ArrowUpDown className="w-3 h-3 ml-1" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Value
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredPositions.length === 0 ? (
                            <tr>
                                <td colSpan={bulkEditMode ? 9 : 8} className="px-4 py-12 text-center text-gray-500">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No positions added yet. Click "Add Position" to get started.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredPositions.map((position) => {
                                const isValid = position.assetType && position.accountId && position.symbol && position.quantity && position.purchasePrice;
                                const assetType = ASSET_TYPES.find(t => t.id === position.assetType);
                                const account = accounts.find(a => a.id === position.accountId);
                                const value = parseFloat(position.quantity || 0) * parseFloat(position.purchasePrice || 0);
                                
                                return (
                                    <tr
                                        key={position.tempId}
                                        className={`hover:bg-gray-50 transition-colors ${
                                            position.isNew ? 'bg-blue-50/30' : ''
                                        }`}
                                    >
                                        {bulkEditMode && (
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPositions.has(position.tempId)}
                                                    onChange={() => toggleSelectPosition(position.tempId)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <select
                                                value={position.assetType}
                                                onChange={(e) => updatePosition(position.tempId, 'assetType', e.target.value)}
                                                className="px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <option value="">Select...</option>
                                                {ASSET_TYPES.map(type => (
                                                    <option key={type.id} value={type.id}>{type.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={position.accountId}
                                                onChange={(e) => updatePosition(position.tempId, 'accountId', e.target.value)}
                                                className="px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            >
                                                <option value="">Select...</option>
                                                {accounts.map(account => (
                                                    <option key={account.id} value={account.id}>
                                                        {account.account_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <SymbolSearchDropdown
                                                value={position.symbol}
                                                onChange={(value) => updatePosition(position.tempId, 'symbol', value)}
                                                assetType={position.assetType}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="number"
                                                value={position.quantity}
                                                onChange={(e) => updatePosition(position.tempId, 'quantity', e.target.value)}
                                                placeholder="0.00"
                                                className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-sm text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={position.purchasePrice}
                                                    onChange={(e) => updatePosition(position.tempId, 'purchasePrice', e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-24 pl-6 pr-2 py-1 bg-white border border-gray-300 rounded text-sm text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                                    step="0.01"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="date"
                                                value={position.purchaseDate}
                                                onChange={(e) => updatePosition(position.tempId, 'purchaseDate', e.target.value)}
                                                max={today}
                                                className="px-2 py-1 bg-white border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            ${value.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => duplicatePosition(position)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deletePosition(position.tempId)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {validPositions.length > 0 && (
                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                            <tr>
                                <td colSpan={bulkEditMode ? 7 : 6} className="px-4 py-3 text-right font-semibold text-gray-700">
                                    Total Portfolio Value:
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-lg text-gray-900">
                                    ${totalValue.toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
    
    const renderSuccessScreen = () => (
        <div className="text-center py-12 animate-fadeIn">
            <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce">
                    <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <div className="absolute inset-0 w-24 h-24 bg-green-500 rounded-full animate-ping opacity-20" />
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Success!</h3>
            <p className="text-lg text-gray-600 mb-8">
                Successfully imported <span className="font-semibold text-green-600">{validPositions.length}</span> positions
            </p>
            
            <div className="max-w-2xl mx-auto">
                {Object.entries(positionsByAccount).map(([accountName, data]) => (
                    <div key={accountName} className="mb-4 p-4 bg-gray-50 rounded-xl text-left">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{accountName}</h4>
                            <span className="text-sm text-gray-600">
                                {data.positions.length} positions • ${data.totalValue.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.positions.map(pos => (
                                <span key={pos.tempId} className="px-2 py-1 bg-white rounded text-sm text-gray-700">
                                    {pos.symbol}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <button
                onClick={onClose}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
            >
                View Dashboard
            </button>
        </div>
    );
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-gray-900 opacity-75 transition-opacity" onClick={onClose} />
            
            <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideIn">
                <div className="absolute top-4 right-4 z-50">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="flex-1 flex flex-col overflow-hidden">
                    {showSuccess ? (
                        renderSuccessScreen()
                    ) : (
                        <>
                            <div className="px-8 pt-8">
                                {renderHeader()}
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {viewMode === 'grid' ? renderGridView() : renderListView()}
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <style jsx>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes scaleIn {
                    from {
                        transform: scale(0);
                    }
                    to {
                        transform: scale(1);
                    }
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

// Export button component to add positions
export const QuickAddPositionsButton = ({ accounts = [], className = '' }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className={`group relative flex items-center text-white py-2 px-4 transition-all duration-300 ${className}`}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-emerald-400 group-hover:text-white transition-colors" />
                    <span className="text-sm text-gray-200 group-hover:text-white font-medium">Quick Add Positions</span>
                </div>
            </button>
            
            <QuickAddPositionsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                accounts={accounts}
            />
        </>
    );
};

export default QuickAddPositionsModal;