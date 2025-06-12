import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
    Building,
    Plus,
    Trash2,
    Copy,
    Check,
    Loader2,
    ArrowUpDown,
    Zap,
    Sparkles,
    Keyboard,
    Shield,
    Hash,
    Briefcase,
    DollarSign,
    ChevronDown,
    ListPlus,
    Table,
    Star,
    MousePointer,
    Import,
    FileSpreadsheet,
    Download,
    Upload,
    X,
    FileCheck,
    AlertCircle,
    Info,
    Layers,
    TrendingUp,
    Activity,
    Wallet,
    CreditCard,
    Home,
    Users,
    User,
    UserCheck,
    Lock,
    Coins,
    Clock,
    CheckCircle,
    GraduationCap,
    Building2,
    Heart,
    Landmark,
    Banknote,
    PiggyBank,
    Package,
    HardDrive,
    Smartphone,
    Mountain,
    Umbrella,
    MapPin,
    BarChart3,
    Gem
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';

// Account categories matching AccountModal
const ACCOUNT_CATEGORIES = [
    { id: "brokerage", name: "Brokerage", icon: Briefcase, color: "blue", gradient: "from-blue-500 to-indigo-600" },
    { id: "retirement", name: "Retirement", icon: Building, color: "purple", gradient: "from-purple-500 to-pink-600" },
    { id: "cash", name: "Cash / Banking", icon: DollarSign, color: "green", gradient: "from-green-500 to-emerald-600" },
    { id: "crypto", name: "Cryptocurrency", icon: Hash, color: "orange", gradient: "from-orange-500 to-red-600" },
    { id: "metals", name: "Metals Storage", icon: Shield, color: "amber", gradient: "from-amber-500 to-yellow-600" },
    { id: "realestate", name: "Real Estate", icon: Home, color: "indigo", gradient: "from-indigo-500 to-purple-600" }
];

// Account types by category matching AccountModal
const ACCOUNT_TYPES_BY_CATEGORY = {
    brokerage: [
        { value: "Individual", label: "Individual", icon: User },
        { value: "Joint", label: "Joint", icon: Users },
        { value: "Custodial", label: "Custodial", icon: UserCheck },
        { value: "Trust", label: "Trust", icon: Shield },
        { value: "Other Brokerage", label: "Other Brokerage", icon: Briefcase }
    ],
    retirement: [
        { value: "Traditional IRA", label: "Traditional IRA", icon: PiggyBank },
        { value: "Roth IRA", label: "Roth IRA", icon: Coins },
        { value: "401(k)", label: "401(k)", icon: Building2 },
        { value: "Roth 401(k)", label: "Roth 401(k)", icon: Building },
        { value: "SEP IRA", label: "SEP IRA", icon: Briefcase },
        { value: "SIMPLE IRA", label: "SIMPLE IRA", icon: Wallet },
        { value: "403(b)", label: "403(b)", icon: GraduationCap },
        { value: "Pension", label: "Pension", icon: Landmark },
        { value: "HSA", label: "HSA (Health Savings Account)", icon: Heart },
        { value: "Other Retirement", label: "Other Retirement", icon: Package }
    ],
    cash: [
        { value: "Checking", label: "Checking", icon: CreditCard },
        { value: "Savings", label: "Savings", icon: PiggyBank },
        { value: "High Yield Savings", label: "High Yield Savings", icon: TrendingUp },
        { value: "Money Market", label: "Money Market", icon: Banknote },
        { value: "Certificate of Deposit (CD)", label: "Certificate of Deposit (CD)", icon: Clock },
        { value: "Other Cash", label: "Other Cash", icon: Wallet }
    ],
    crypto: [
        { value: "Exchange Account", label: "Exchange Account", icon: Activity },
        { value: "Hardware Wallet", label: "Hardware Wallet", icon: HardDrive },
        { value: "Software Wallet", label: "Software Wallet", icon: Smartphone },
        { value: "Cold Storage", label: "Cold Storage", icon: Lock },
        { value: "Other Crypto", label: "Other Crypto", icon: Coins }
    ],
    metals: [
        { value: "Home Storage", label: "Home Storage", icon: Home },
        { value: "Safe Deposit Box", label: "Safe Deposit Box", icon: Lock },
        { value: "Third-Party Vault", label: "Third-Party Vault", icon: Shield },
        { value: "Allocated Storage", label: "Allocated Storage", icon: Package },
        { value: "Unallocated Storage", label: "Unallocated Storage", icon: Layers },
        { value: "Other Metals", label: "Other Metals", icon: Gem }
    ],
    realestate: [
        { value: "Primary Residence", label: "Primary Residence", icon: Home },
        { value: "Vacation Home", label: "Vacation Home", icon: Umbrella },
        { value: "Rental Property", label: "Rental Property", icon: Building2 },
        { value: "Commercial Property", label: "Commercial Property", icon: Building },
        { value: "Land", label: "Land", icon: Mountain },
        { value: "REIT", label: "REIT", icon: BarChart3 },
        { value: "Other Real Estate", label: "Other Real Estate", icon: MapPin }
    ]
};

// Component for animated numbers
const AnimatedNumber = ({ value, duration = 500 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        let startTime;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setDisplayValue(Math.floor(progress * value));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value, duration]);
    
    return <span>{displayValue}</span>;
};

// Custom dropdown with search
const SearchableDropdown = ({ options, value, onChange, placeholder, showLogos = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [inputValue, setInputValue] = useState(value || '');
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});
    
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);
    
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                if (inputValue && inputValue !== value) {
                    onChange(inputValue);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputValue, value, onChange]);

    // Calculate dropdown position to ensure it's visible
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const dropdownHeight = 320;
            
            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                setDropdownStyle({
                    bottom: '100%',
                    top: 'auto',
                    marginBottom: '0.25rem',
                    marginTop: 0
                });
            } else {
                setDropdownStyle({
                    top: '100%',
                    bottom: 'auto',
                    marginTop: '0.25rem',
                    marginBottom: 0
                });
            }
        }
    }, [isOpen]);
    
    const filteredOptions = useMemo(() => {
        const searchTerm = search || inputValue || '';
        if (!searchTerm) return options;
        return options.filter(opt => 
            opt.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, search, inputValue]);
    
    const selectedOption = options.find(opt => opt.name === value);
    
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setSearch(newValue);
        if (!isOpen) setIsOpen(true);
    };
    
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue) {
                onChange(inputValue);
                setIsOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };
    
    return (
        <div ref={dropdownRef} className="relative">
            <div className="relative">
                <input
                    ref={buttonRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 pr-10"
                />
                {selectedOption?.logo && (
                    <img 
                        src={selectedOption.logo} 
                        alt={selectedOption.name}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                )}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center hover:bg-gray-50 rounded-r-lg transition-colors"
                >
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            
            {isOpen && (
                <div 
                    className="absolute z-[9999] w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-fadeIn"
                    style={dropdownStyle}
                >
                    <div className="max-h-64 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center">
                                <p className="text-sm text-gray-500 mb-2">No matching institutions found</p>
                                {inputValue && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange(inputValue);
                                            setIsOpen(false);
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Use "{inputValue}" as custom institution
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {inputValue && !options.find(opt => opt.name.toLowerCase() === inputValue.toLowerCase()) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onChange(inputValue);
                                            setIsOpen(false);
                                        }}
                                        className="w-full px-3 py-2 flex items-center bg-blue-50 hover:bg-blue-100 transition-colors border-b border-gray-100"
                                    >
                                        <Plus className="w-4 h-4 mr-3 text-blue-600" />
                                        <span className="text-sm text-blue-700 font-medium">Use "{inputValue}" (custom)</span>
                                    </button>
                                )}
                                {filteredOptions.map((option, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.name);
                                            setInputValue(option.name);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full px-3 py-2 flex items-center hover:bg-gray-50 transition-colors ${
                                            value === option.name ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        {showLogos && option.logo && (
                                            <img 
                                                src={option.logo} 
                                                alt={option.name}
                                                className="w-5 h-5 mr-3 rounded"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <span className="text-sm text-gray-900">{option.name}</span>
                                        {value === option.name && (
                                            <Check className="w-4 h-4 text-blue-600 ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500 text-center">
                            Type any custom institution name or select from the list
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const QuickAccountAdd = ({ 
    onBack, 
    onSuccess, 
    importMethod, 
    onImportMethodChange,
    onDownloadTemplate,
    isDownloading 
}) => {
    const [accounts, setAccounts] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState(new Set());
    const [bulkEditMode, setBulkEditMode] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState(new Set());
    const newRowRef = useRef(null);

    // Initialize with one empty account
    useEffect(() => {
        if (importMethod === 'ui' && accounts.length === 0) {
            addNewAccount();
        }
    }, [importMethod]);

    // Auto-focus new row
    useEffect(() => {
        if (newRowRef.current) {
            newRowRef.current.focus();
        }
    }, [accounts.length]);

    const addNewAccount = (category = '') => {
        const newAccount = {
            tempId: Date.now() + Math.random(),
            accountName: '',
            institution: '',
            accountCategory: category,
            accountType: '',
            isNew: true
        };
        setAccounts([...accounts, newAccount]);
    };

    const updateAccount = (tempId, field, value) => {
        setAccounts(accounts.map(acc => {
            if (acc.tempId === tempId) {
                if (field === 'accountCategory') {
                    return { ...acc, [field]: value, accountType: '', isNew: false };
                }
                return { ...acc, [field]: value, isNew: false };
            }
            return acc;
        }));
    };

    const deleteAccount = (tempId) => {
        setAccounts(accounts.filter(acc => acc.tempId !== tempId));
        setSelectedAccounts(prev => {
            const next = new Set(prev);
            next.delete(tempId);
            return next;
        });
    };

    const duplicateAccount = (account) => {
        const newAccount = {
            ...account,
            tempId: Date.now() + Math.random(),
            accountName: `${account.accountName} (Copy)`,
            isNew: true
        };
        setAccounts([...accounts, newAccount]);
    };

    const toggleSelectAccount = (tempId) => {
        setSelectedAccounts(prev => {
            const next = new Set(prev);
            if (next.has(tempId)) {
                next.delete(tempId);
            } else {
                next.add(tempId);
            }
            return next;
        });
    };

    const selectAllAccounts = () => {
        if (selectedAccounts.size === accounts.length) {
            setSelectedAccounts(new Set());
        } else {
            setSelectedAccounts(new Set(accounts.map(a => a.tempId)));
        }
    };

    const deleteSelectedAccounts = () => {
        setAccounts(accounts.filter(acc => !selectedAccounts.has(acc.tempId)));
        setSelectedAccounts(new Set());
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAccounts = useMemo(() => {
        if (!sortConfig.key) return accounts;
        
        return [...accounts].sort((a, b) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [accounts, sortConfig]);

    const validAccounts = accounts.filter(acc => 
        acc.accountName && acc.institution && acc.accountCategory && acc.accountType
    );

    const handleSubmitAccounts = async () => {
        if (validAccounts.length === 0) return;
        
        setIsSubmitting(true);
        try {
            const accountsToSubmit = validAccounts.map(acc => ({
                account_name: acc.accountName,
                institution: acc.institution,
                type: acc.accountType,
                account_category: acc.accountCategory
            }));
            
            for (const account of accountsToSubmit) {
                const response = await fetchWithAuth('/accounts', {
                    method: "POST",
                    body: JSON.stringify(account)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to create account ${account.account_name}: ${errorText}`);
                }
            }
            
            onSuccess(validAccounts.length);
        } catch (error) {
            console.error('Error submitting accounts:', error);
            alert(`Failed to create accounts: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderAccountImportChoice = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4">
                    <Building className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Accounts</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Choose how you'd like to add your accounts
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div 
                    className="group relative bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => onImportMethodChange('ui')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-center w-12 h-12 bg-indigo-200 rounded-full mb-4 group-hover:bg-white/20 transition-colors">
                            <ListPlus className="w-6 h-6 text-indigo-700 group-hover:text-white" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                            Quick Add UI
                        </h4>
                        <p className="text-gray-700 group-hover:text-indigo-100 text-sm transition-colors mb-4">
                            Add accounts directly in the browser with our intuitive form
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center text-indigo-600 group-hover:text-indigo-100 text-sm transition-colors">
                                <Zap className="w-4 h-4 mr-2" />
                                <span>Fastest method</span>
                            </div>
                            <div className="flex items-center text-indigo-600 group-hover:text-indigo-100 text-sm transition-colors">
                                <MousePointer className="w-4 h-4 mr-2" />
                                <span>No file downloads needed</span>
                            </div>
                            <div className="flex items-center text-indigo-600 group-hover:text-indigo-100 text-sm transition-colors">
                                <Keyboard className="w-4 h-4 mr-2" />
                                <span>Keyboard shortcuts supported</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div 
                    className="group relative bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => onImportMethodChange('excel')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-200 rounded-full mb-4 group-hover:bg-white/20 transition-colors">
                            <Table className="w-6 h-6 text-green-700 group-hover:text-white" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                            Excel Import
                        </h4>
                        <p className="text-gray-700 group-hover:text-green-100 text-sm transition-colors mb-4">
                            Download a template and upload your completed spreadsheet
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center text-green-600 group-hover:text-green-100 text-sm transition-colors">
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                <span>Work offline</span>
                            </div>
                            <div className="flex items-center text-green-600 group-hover:text-green-100 text-sm transition-colors">
                                <Import className="w-4 h-4 mr-2" />
                                <span>Bulk import many accounts</span>
                            </div>
                            <div className="flex items-center text-green-600 group-hover:text-green-100 text-sm transition-colors">
                                <Copy className="w-4 h-4 mr-2" />
                                <span>Copy/paste from existing data</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                    <Star className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-blue-900">
                        <span className="font-medium">Pro tip:</span> Use the Quick Add UI for a few accounts, or Excel Import for 10+ accounts
                    </p>
                </div>
            </div>
        </div>
    );

    const renderUIAccountCreation = () => (
        <div className="space-y-4 animate-fadeIn">
            {/* Compact Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl mb-3 shadow-2xl shadow-purple-600/30">
                    <ListPlus className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Quick Add Accounts</h3>
                <p className="text-gray-600">Build your investment portfolio</p>
            </div>

            {/* Category Picker */}
            {showCategoryPicker && (
                <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 animate-slideIn">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Add accounts by category:</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {ACCOUNT_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    addNewAccount(cat.id);
                                    setShowCategoryPicker(false);
                                }}
                                className={`group relative p-3 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                                    selectedCategories.has(cat.id) 
                                        ? `border-${cat.color}-500 bg-${cat.color}-50` 
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} rounded-lg opacity-0 group-hover:opacity-10 transition-opacity`} />
                                <div className="relative z-10 flex items-center">
                                    <cat.icon className={`w-5 h-5 mr-2 text-${cat.color}-600`} />
                                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Compact Stats Bar */}
            <div className="relative bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-pink-50/50 rounded-xl p-3 shadow-sm border border-white/80 backdrop-blur-sm">
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm mb-1">
                            <p className="text-xl font-black bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent">
                                <AnimatedNumber value={accounts.length} />
                            </p>
                        </div>
                        <p className="text-xs font-medium text-gray-600">Total</p>
                    </div>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm mb-1">
                            <p className="text-xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                <AnimatedNumber value={validAccounts.length} />
                            </p>
                        </div>
                        <p className="text-xs font-medium text-gray-600">Ready</p>
                    </div>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm mb-1">
                            <p className="text-xl font-black bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                                <AnimatedNumber value={new Set(accounts.map(a => a.institution).filter(Boolean)).size} />
                            </p>
                        </div>
                        <p className="text-xs font-medium text-gray-600">Institutions</p>
                    </div>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm mb-1">
                            <p className="text-xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                <AnimatedNumber value={new Set(accounts.map(a => a.accountCategory).filter(Boolean)).size} />
                            </p>
                        </div>
                        <p className="text-xs font-medium text-gray-600">Categories</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                        className="group relative flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative flex items-center">
                            <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="font-medium">Add Account</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setBulkEditMode(!bulkEditMode)}
                        className={`p-2.5 rounded-lg transition-all ${
                            bulkEditMode ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Bulk Edit Mode"
                    >
                        <CheckCircle className="w-5 h-5" />
                    </button>
                </div>

                {validAccounts.length > 0 && (
                    <button
                        onClick={handleSubmitAccounts}
                        disabled={isSubmitting}
                        className="relative group flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                Add {validAccounts.length} to Portfolio
                            </>
                        )}
                    </button>
                )}

                <div className="flex items-center bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    <Zap className="w-4 h-4 text-amber-600 mr-1.5" />
                    <span className="text-xs font-medium text-amber-700">Quick Mode</span>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {bulkEditMode && selectedAccounts.size > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between animate-slideIn">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={selectAllAccounts}
                            className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                        >
                            {selectedAccounts.size === accounts.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-sm text-gray-600">
                            {selectedAccounts.size} selected
                        </span>
                    </div>
                    <button
                        onClick={deleteSelectedAccounts}
                        className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Selected
                    </button>
                </div>
            )}

            {/* Compact Table Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                {/* Compact Table Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-3 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {bulkEditMode && (
                            <div className="col-span-1">
                                <input
                                    type="checkbox"
                                    checked={selectedAccounts.size === accounts.length && accounts.length > 0}
                                    onChange={selectAllAccounts}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                            </div>
                        )}
                        <div className={`${bulkEditMode ? 'col-span-2' : 'col-span-3'} flex items-center`}>
                            <button 
                                onClick={() => handleSort('accountName')}
                                className="flex items-center hover:text-indigo-600 transition-colors group"
                            >
                                <span>Account Name</span>
                                <ArrowUpDown className="w-3 h-3 ml-1.5 text-gray-400 group-hover:text-indigo-600" />
                            </button>
                        </div>
                        <div className="col-span-3 flex items-center">
                            <button 
                                onClick={() => handleSort('institution')}
                                className="flex items-center hover:text-indigo-600 transition-colors group"
                            >
                                <span>Institution</span>
                                <ArrowUpDown className="w-3 h-3 ml-1.5 text-gray-400 group-hover:text-indigo-600" />
                            </button>
                        </div>
                        <div className="col-span-3 flex items-center">
                            <button 
                                onClick={() => handleSort('accountCategory')}
                                className="flex items-center hover:text-indigo-600 transition-colors group"
                            >
                                <span>Category</span>
                                <ArrowUpDown className="w-3 h-3 ml-1.5 text-gray-400 group-hover:text-indigo-600" />
                            </button>
                        </div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-1 text-center">Actions</div>
                    </div>
                </div>

                {/* Account Rows */}
                <div className="p-3 space-y-2 bg-gradient-to-b from-gray-50/30 to-white">
                    {sortedAccounts.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
                                <Building className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm">Click "Add Account" to get started</p>
                        </div>
                    ) : (
                        sortedAccounts.map((account, index) => {
                            const isValid = account.accountName && account.institution && account.accountCategory && account.accountType;
                            const selectedInstitution = popularBrokerages.find(b => b.name === account.institution);
                            const selectedCategory = ACCOUNT_CATEGORIES.find(c => c.id === account.accountCategory);
                            const accountTypes = ACCOUNT_TYPES_BY_CATEGORY[account.accountCategory] || [];
                            const selectedType = accountTypes.find(t => t.value === account.accountType);
                            
                            return (
                                <div 
                                    key={account.tempId}
                                    className={`group relative bg-white rounded-lg border-2 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-lg ${
                                        account.isNew ? 'border-indigo-400 shadow-md shadow-indigo-200/50 slide-in-animation ring-2 ring-indigo-400/20' : 
                                        isValid ? 'border-green-300 hover:border-green-400' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    style={{ zIndex: sortedAccounts.length - index }}
                                >
                                    <div className="grid grid-cols-12 gap-3 p-3 items-center">
                                        {bulkEditMode && (
                                            <div className="col-span-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAccounts.has(account.tempId)}
                                                    onChange={() => toggleSelectAccount(account.tempId)}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                        )}
                                        <div className={`${bulkEditMode ? 'col-span-2' : 'col-span-3'}`}>
                                            <input
                                                ref={account.isNew && index === accounts.length - 1 ? newRowRef : null}
                                                type="text"
                                                value={account.accountName}
                                                onChange={(e) => updateAccount(account.tempId, 'accountName', e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && isValid) {
                                                        e.preventDefault();
                                                        addNewAccount();
                                                    }
                                                }}
                                                placeholder="My Retirement Account..."
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
                                            />
                                        </div>
                                        <div className="col-span-3 relative" style={{ zIndex: 1000 }}>
                                            <SearchableDropdown
                                                options={popularBrokerages}
                                                value={account.institution}
                                                onChange={(value) => updateAccount(account.tempId, 'institution', value)}
                                                placeholder="Type to search..."
                                                showLogos={true}
                                            />
                                            {account.institution && !popularBrokerages.find(b => b.name === account.institution) && (
                                                <div className="absolute -bottom-5 left-0 text-[10px] text-indigo-600 flex items-center bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                                                    Custom
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-3">
                                            <select
                                                value={account.accountCategory}
                                                onChange={(e) => updateAccount(account.tempId, 'accountCategory', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                            >
                                                <option value="">Select category...</option>
                                                {ACCOUNT_CATEGORIES.map(cat => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <select
                                                value={account.accountType}
                                                onChange={(e) => updateAccount(account.tempId, 'accountType', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!account.accountCategory}
                                            >
                                                <option value="">
                                                    {account.accountCategory ? 'Type...' : 'Category first'}
                                                </option>
                                                {accountTypes.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-1 flex items-center justify-center space-x-1">
                                            <button
                                                onClick={() => duplicateAccount(account)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all transform hover:scale-110"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteAccount(account.tempId)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all transform hover:scale-110"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Visual status indicator */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all duration-500 ${
                                        account.isNew ? 'bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400 animate-pulse' :
                                        isValid ? 'bg-gradient-to-b from-green-400 to-emerald-500' : 'bg-gradient-to-b from-gray-300 to-gray-400'
                                    }`} />
                                    
                                    {/* Category icon */}
                                    {selectedCategory && (
                                        <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                                            <div className={`w-8 h-8 rounded-lg border border-white shadow-lg bg-gradient-to-br ${selectedCategory.gradient} flex items-center justify-center`}>
                                                <selectedCategory.icon className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Type icon on hover */}
                                    {selectedType && (
                                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <div className="flex items-center bg-white/90 backdrop-blur px-2 py-1 rounded-md shadow-sm">
                                                <selectedType.icon className="w-3 h-3 text-gray-600 mr-1" />
                                                <span className="text-xs text-gray-600">{selectedType.label}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Success checkmark */}
                                    {isValid && !account.isNew && (
                                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Keyboard shortcuts */}
            <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-lg p-3 border border-indigo-100/50 flex items-center justify-between">
                <div className="flex items-center">
                    <Keyboard className="w-4 h-4 text-indigo-600 mr-2" />
                    <p className="text-xs text-gray-700">
                        Press <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs mx-1 shadow-sm font-mono">Enter</kbd> to add another • 
                        <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs mx-1 shadow-sm font-mono">Tab</kbd> to navigate
                    </p>
                </div>
            </div>

            <style jsx>{`
                .slide-in-animation {
                    animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    );

    const renderExcelTemplate = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4">
                    <Building className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Import Accounts via Excel
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Download the template and fill in your account information
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">How it works:</h4>
                <div className="space-y-3">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-semibold text-blue-600">1</span>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Download the Excel template</p>
                            <p className="text-sm text-gray-600 mt-1">
                                Pre-formatted with dropdowns for institutions and account types
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-semibold text-blue-600">2</span>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Fill in your information</p>
                            <p className="text-sm text-gray-600 mt-1">
                                Add your account names, institutions, and types
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-semibold text-blue-600">3</span>
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Upload the completed template</p>
                            <p className="text-sm text-gray-600 mt-1">We'll validate your data and import everything automatically</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                <button
                    onClick={() => onDownloadTemplate('accounts')}
                    disabled={isDownloading}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isDownloading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Downloading...
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5 mr-2" />
                            Download Accounts Template
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    if (!importMethod) {
        return renderAccountImportChoice();
    }

    return importMethod === 'ui' ? renderUIAccountCreation() : renderExcelTemplate();
};

export default QuickAccountAdd;