import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { 
    FileSpreadsheet, 
    Download, 
    Upload, 
    X, 
    CheckCircle, 
    AlertCircle, 
    Info,
    ArrowRight,
    ArrowLeft,
    Shield,
    Clock,
    Users,
    Building,
    Sparkles,
    FileCheck,
    Loader2,
    Plus,
    Trash2,
    ChevronDown,
    Check,
    MousePointer,
    Keyboard,
    Zap,
    TrendingUp,
    DollarSign,
    CreditCard,
    Wallet,
    PiggyBank,
    Copy,
    ArrowUpDown,
    Import,
    Search,
    Hash,
    Briefcase,
    ListPlus,
    Table,
    BarChart3,
    Star,
    ChevronRight,
    Eye,
    EyeOff,
    RefreshCw,
    Activity,
    Layers,
    Package,
    FolderOpen,
    PlusCircle,
    Database,
    TrendingDown,
    Repeat
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';
import ReactDOM from 'react-dom';
import { fetchAllAccounts } from '@/utils/apimethods/accountMethods';
import { AddQuickPositionModal } from '@/components/modals/AddQuickPositionModal';

// Account categories matching AccountModal and database constraints
const ACCOUNT_CATEGORIES = [
    { id: "brokerage", name: "Brokerage", icon: Briefcase },
    { id: "retirement", name: "Retirement", icon: Building },
    { id: "cash", name: "Cash / Banking", icon: DollarSign },
    { id: "cryptocurrency", name: "Cryptocurrency", icon: Hash },
    { id: "metals", name: "Metals Storage", icon: Shield },
    { id: "real_estate", name: "Real Estate", icon: Building }
];

// Account types by category matching AccountModal and database
const ACCOUNT_TYPES_BY_CATEGORY = {
    brokerage: [
        { value: "Individual", label: "Individual" },
        { value: "Joint", label: "Joint" },
        { value: "Custodial", label: "Custodial" },
        { value: "Trust", label: "Trust" },
        { value: "Other Brokerage", label: "Other Brokerage" }
    ],
    retirement: [
        { value: "Traditional IRA", label: "Traditional IRA" },
        { value: "Roth IRA", label: "Roth IRA" },
        { value: "401(k)", label: "401(k)" },
        { value: "Roth 401(k)", label: "Roth 401(k)" },
        { value: "SEP IRA", label: "SEP IRA" },
        { value: "SIMPLE IRA", label: "SIMPLE IRA" },
        { value: "403(b)", label: "403(b)" },
        { value: "Pension", label: "Pension" },
        { value: "HSA", label: "HSA (Health Savings Account)" },
        { value: "Other Retirement", label: "Other Retirement" }
    ],
    cash: [
        { value: "Checking", label: "Checking" },
        { value: "Savings", label: "Savings" },
        { value: "High Yield Savings", label: "High Yield Savings" },
        { value: "Money Market", label: "Money Market" },
        { value: "Certificate of Deposit (CD)", label: "Certificate of Deposit (CD)" },
        { value: "Other Cash", label: "Other Cash" }
    ],
    cryptocurrency: [
        { value: "Exchange Account", label: "Exchange Account" },
        { value: "Hardware Wallet", label: "Hardware Wallet" },
        { value: "Software Wallet", label: "Software Wallet" },
        { value: "Cold Storage", label: "Cold Storage" },
        { value: "Other Crypto", label: "Other Crypto" }
    ],
    metals: [
        { value: "Home Storage", label: "Home Storage" },
        { value: "Safe Deposit Box", label: "Safe Deposit Box" },
        { value: "Third-Party Vault", label: "Third-Party Vault" },
        { value: "Allocated Storage", label: "Allocated Storage" },
        { value: "Unallocated Storage", label: "Unallocated Storage" },
        { value: "Other Metals", label: "Other Metals" }
    ],
    real_estate: [
        { value: "Primary Residence", label: "Primary Residence" },
        { value: "Vacation Home", label: "Vacation Home" },
        { value: "Rental Property", label: "Rental Property" },
        { value: "Commercial Property", label: "Commercial Property" },
        { value: "Land", label: "Land" },
        { value: "REIT", label: "REIT" },
        { value: "Other Real Estate", label: "Other Real Estate" }
    ]
};

// Component for animated numbers with spring physics
const AnimatedNumber = ({ value, duration = 500, className = "" }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    
    useEffect(() => {
        setIsAnimating(true);
        let startTime;
        let startValue = displayValue;
        
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (value - startValue) * easeOutQuart);
            
            setDisplayValue(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
            }
        };
        
        requestAnimationFrame(animate);
    }, [value, duration]);
    
    return (
        <span className={`${className} ${isAnimating ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
            {displayValue}
        </span>
    );
};

// Enhanced loading dots animation
const LoadingDots = () => (
    <span className="inline-flex space-x-1">
        {[0, 1, 2].map(i => (
            <span
                key={i}
                className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
            />
        ))}
    </span>
);

// Custom dropdown with search - updated for better positioning and custom input
const SearchableDropdown = ({ options, value, onChange, placeholder, showLogos = false, onOpenChange, onEnterKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [inputValue, setInputValue] = useState(value || '');
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    
    
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);
    
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                if (onOpenChange) onOpenChange(false);
                if (inputValue && inputValue !== value) {
                    onChange(inputValue);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputValue, value, onChange, onOpenChange]);

    
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
        setHighlightedIndex(0);
        if (!isOpen) {
            setIsOpen(true);
            if (onOpenChange) onOpenChange(true);
        }
    };
    
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue) {
                onChange(inputValue);
                setIsOpen(false);
                if (onOpenChange) onOpenChange(false);
            }
            // Call the parent's enter handler
            if (onEnterKey) {
                onEnterKey();
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            if (onOpenChange) onOpenChange(false);
        } else if (e.key === 'ArrowDown' && isOpen) {
            e.preventDefault();
            setHighlightedIndex(prev => 
                prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp' && isOpen) {
            e.preventDefault();
            setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
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
                    onFocus={() => {
                        setIsOpen(true);
                        if (onOpenChange) onOpenChange(true);
                    }}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 pr-10"
                    style={{ paddingLeft: selectedOption?.logo ? '2.5rem' : undefined }}
                />
                {selectedOption?.logo && (
                    <img 
                        src={selectedOption.logo} 
                        alt={selectedOption.name}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded pointer-events-none"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                )}
                <button
                    type="button"
                    onClick={() => {
                        const newState = !isOpen;
                        setIsOpen(newState);
                        if (onOpenChange) onOpenChange(newState);
                    }}
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center hover:bg-gray-50 rounded-r-lg transition-colors"
                >
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            
        {isOpen && buttonRef.current && (() => {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const dropdownHeight = 320;
        const shouldShowAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
        
        return ReactDOM.createPortal(
            <div 
            style={{
                position: 'fixed',
                top: shouldShowAbove ? 'auto' : `${rect.bottom + 4}px`,
                bottom: shouldShowAbove ? `${viewportHeight - rect.top + 4}px` : 'auto',
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                zIndex: 9999999
            }}
            className="bg-white border border-gray-200 rounded-lg shadow-xl animate-fadeIn"
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
                        if (onOpenChange) onOpenChange(false);
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
                        if (onOpenChange) onOpenChange(false);
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
                        if (onOpenChange) onOpenChange(false);
                        setSearch('');
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full px-3 py-2 flex items-center hover:bg-gray-50 transition-colors ${
                        value === option.name ? 'bg-blue-50' : ''
                        } ${highlightedIndex === idx ? 'bg-gray-100' : ''}`}
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
            </div>,
            document.body
        );
        })()}
        </div>
    );
};

const QuickStartModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [validationStatus, setValidationStatus] = useState(null);
    const [importMethod, setImportMethod] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const newRowRef = useRef(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [existingAccounts, setExistingAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [showAccountsDropdown, setShowAccountsDropdown] = useState(false);
    const [importedAccounts, setImportedAccounts] = useState([]);
    const [importedPositions, setImportedPositions] = useState(0);


    // Fetch existing accounts
    useEffect(() => {
        if (activeTab === 'overview' && isOpen) {
            fetchExistingAccounts();
        }
    }, [activeTab, isOpen]);

    const fetchExistingAccounts = async () => {
        setIsLoadingAccounts(true);
        try {
            const data = await fetchAllAccounts();
            // Ensure data is always an array
            setExistingAccounts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setExistingAccounts([]);
        } finally {
            setIsLoadingAccounts(false);
        }
    };

    // And update the accountsByCategory useMemo to be more defensive:
    const accountsByCategory = useMemo(() => {
        const grouped = {};
        // Ensure existingAccounts is an array before processing
        const accounts = Array.isArray(existingAccounts) ? existingAccounts : [];
        
        ACCOUNT_CATEGORIES.forEach(cat => {
            grouped[cat.id] = accounts.filter(acc => 
                acc?.account_category?.toLowerCase() === cat.id.toLowerCase()
            );
        });
        return grouped;
    }, [existingAccounts]);

    // Initialize with one empty account
    useEffect(() => {
        if (activeTab === 'accounts' && importMethod === 'ui' && accounts.length === 0) {
            addNewAccount();
        }
    }, [activeTab, importMethod]);

    // Auto-focus new row with smooth scroll
    useEffect(() => {
        if (newRowRef.current) {
            newRowRef.current.focus();
            newRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [accounts.length]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setActiveTab('overview');
                setSelectedTemplate(null);
                setUploadedFile(null);
                setValidationStatus(null);
                setUploadProgress(0);
                setImportMethod(null);
                setAccounts([]);
                setSortConfig({ key: null, direction: 'asc' });
                setImportedAccounts([]);
                setImportedPositions(0);
            }, 300);
        }
    }, [isOpen]);

    const addNewAccount = () => {
        const newAccount = {
            tempId: Date.now() + Math.random(),
            accountName: '',
            institution: '',
            accountCategory: '',
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
        const successfulAccounts = [];
        
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
                
                successfulAccounts.push(account);
            }
            
            setImportedAccounts(successfulAccounts);
            await fetchExistingAccounts(); // Refresh the accounts list
            setActiveTab('success');
        } catch (error) {
            console.error('Error submitting accounts:', error);
            alert(`Failed to create accounts: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadTemplate = async (type) => {
        setIsDownloading(true);
        try {
            const response = await fetchWithAuth(`/api/templates/${type}/download`, {
                method: 'GET',
            });
            
            if (!response.ok) {
                throw new Error(`Failed to download ${type} template`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `NestEgg_${type.charAt(0).toUpperCase() + type.slice(1)}_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            setSelectedTemplate(type);
            setActiveTab('upload');
        } catch (error) {
            console.error('Error downloading template:', error);
            alert(`Failed to download template: ${error.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFileSelect(files[0]);
        }
    }, []);

    const handleFileSelect = (file) => {
        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
            file.type === 'application/vnd.ms-excel') {
            setUploadedFile(file);
            simulateValidation();
        } else {
            alert('Please upload an Excel file (.xlsx or .xls)');
        }
    };

    const simulateValidation = () => {
        setValidationStatus('validating');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setValidationStatus('valid');
                }, 500);
            }
        }, 200);
    };



    const renderOverview = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
                    <div className="relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg shadow-blue-500/25">
                        <Sparkles className="w-8 h-8 text-white animate-pulse" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 mt-4">Quick Add to Your NestEgg Portfolio</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Build your portfolio in minutes with our streamlined process
                </p>
            </div>

            {/* Enhanced Account/Position Selection */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left side - Action buttons */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                            What would you like to add?
                        </h4>
                        
                        <div 
                            className="group relative bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 border border-blue-100"
                            onClick={() => setActiveTab('accounts')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-600 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                        <Building className="w-10 h-10 text-blue-600 relative z-10" />
                                    </div>
                                    <div className="ml-4">
                                        <h5 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                            Add Accounts
                                        </h5>
                                        <p className="text-sm text-gray-600">Investment, retirement, cash accounts</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-blue-600 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>

                        <div 
                            className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-300 transform border ${
                                existingAccounts.length === 0 
                                    ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed' 
                                    : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-100 hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                            onClick={() => existingAccounts.length > 0 && setActiveTab('positions')}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="relative">
                                        <div className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
                                            existingAccounts.length > 0 ? 'bg-purple-600 opacity-0 group-hover:opacity-10' : ''
                                        }`}></div>
                                        <FileSpreadsheet className={`w-10 h-10 relative z-10 ${
                                            existingAccounts.length === 0 ? 'text-gray-400' : 'text-purple-600'
                                        }`} />
                                    </div>
                                    <div className="ml-4">
                                        <h5 className={`font-semibold transition-colors ${
                                            existingAccounts.length === 0 
                                                ? 'text-gray-500' 
                                                : 'text-gray-900 group-hover:text-purple-700'
                                        }`}>
                                            Add Positions
                                        </h5>
                                        <p className="text-sm text-gray-600">
                                            {existingAccounts.length === 0 
                                                ? 'Add accounts first to enable positions' 
                                                : 'Stocks, bonds, crypto, and more'}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 transform transition-transform ${
                                    existingAccounts.length === 0 
                                        ? 'text-gray-400' 
                                        : 'text-purple-600 group-hover:translate-x-1'
                                }`} />
                            </div>
                        </div>
                    </div>

                    {/* Right side - Account summary */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                                Current NestEgg Portfolio
                            </h4>
                            <button
                                onClick={() => fetchExistingAccounts()}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors group"
                                disabled={isLoadingAccounts}
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-500 group-hover:text-gray-700 ${
                                    isLoadingAccounts ? 'animate-spin' : ''
                                }`} />
                            </button>
                        </div>

                        {isLoadingAccounts ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            </div>
                        ) : existingAccounts.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                                    <Building className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-gray-500 text-sm">No accounts yet</p>
                                <p className="text-gray-400 text-xs mt-1">Start by adding your first account</p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-gray-900">
                                            <AnimatedNumber value={existingAccounts.length} />
                                        </p>
                                        <p className="text-xs text-gray-600 font-medium">Total Accounts</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAccountsDropdown(!showAccountsDropdown)}
                                        className="flex items-center px-3 py-1.5 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 border border-gray-200"
                                    >
                                        <span>View Details</span>
                                        <ChevronDown className={`w-4 h-4 ml-1.5 transition-transform ${
                                            showAccountsDropdown ? 'rotate-180' : ''
                                        }`} />
                                    </button>
                                </div>

                                {showAccountsDropdown && (
                                    <div className="space-y-2 mt-4 animate-fadeIn max-h-64 overflow-y-auto">
                                        {ACCOUNT_CATEGORIES.map(category => {
                                            const categoryAccounts = accountsByCategory[category.id];
                                            if (categoryAccounts.length === 0) return null;
                                            
                                            return (
                                                <div key={category.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                                    <div className="flex items-center mb-2">
                                                        <category.icon className="w-4 h-4 text-gray-600 mr-2" />
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {category.name}
                                                        </span>
                                                        <span className="ml-auto text-xs text-gray-500">
                                                            {categoryAccounts.length}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {categoryAccounts.map(account => (
                                                            <div key={account.id} className="flex items-center justify-between text-xs text-gray-600 pl-6">
                                                                <span className="truncate">{account.account_name}</span>
                                                                <span className="text-gray-400">{account.institution}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center group">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <div className="relative inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full group-hover:scale-110 transition-transform">
                            <Shield className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Secure & Private</p>
                </div>
                <div className="text-center group">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <div className="relative inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Quick Setup</p>
                </div>
                <div className="text-center group">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-purple-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <div className="relative inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Your Data Only</p>
                </div>
            </div>
        </div>
    );

    const renderAccountImportChoice = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4">
                    <Building className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Add Accounts</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Choose how you'd like to add your accounts to your NestEgg portfolio
                </p>
            </div>

            <div className="grid md:grid-cols-12 gap-4">
                <div 
                    className="md:col-span-7 group relative bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => setImportMethod('ui')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-center w-12 h-12 bg-indigo-200 rounded-full mb-4 group-hover:bg-white/20 transition-colors">
                            <ListPlus className="w-6 h-6 text-indigo-700 group-hover:text-white" />
                        </div>
                        <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full mb-3 group-hover:bg-white/20 group-hover:text-white transition-colors">
                            <Star className="w-3 h-3 mr-1" />
                            Recommended
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
                    className="md:col-span-5 group relative bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => setImportMethod('excel')}
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

    const renderPositionImportChoice = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-4">
                    <FileSpreadsheet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Add Positions</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Choose how you'd like to add your positions
                </p>
            </div>

            <div className="grid md:grid-cols-12 gap-4">
                <div 
                    className="md:col-span-7 group relative bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => setImportMethod('ui')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-center w-12 h-12 bg-purple-200 rounded-full mb-4 group-hover:bg-white/20 transition-colors">
                            <ListPlus className="w-6 h-6 text-purple-700 group-hover:text-white" />
                        </div>
                        <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full mb-3 group-hover:bg-white/20 group-hover:text-white transition-colors">
                            <Star className="w-3 h-3 mr-1" />
                            Recommended
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                            Quick Add Positions
                        </h4>
                        <p className="text-gray-700 group-hover:text-purple-100 text-sm transition-colors mb-4">
                            Add multiple positions across different asset types quickly
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center text-purple-600 group-hover:text-purple-100 text-sm transition-colors">
                                <Zap className="w-4 h-4 mr-2" />
                                <span>Add 50+ positions rapidly</span>
                            </div>
                            <div className="flex items-center text-purple-600 group-hover:text-purple-100 text-sm transition-colors">
                                <Hash className="w-4 h-4 mr-2" />
                                <span>Mix asset types (stocks, crypto, etc.)</span>
                            </div>
                            <div className="flex items-center text-purple-600 group-hover:text-purple-100 text-sm transition-colors">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                <span>See queue statistics in real-time</span>
                            </div>
                        </div>
                    </div>
                </div>

                    <div 
                        className="md:col-span-5 group relative bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        onClick={() => setImportMethod('excel')}
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
                                <span>Work offline in Excel</span>
                            </div>
                            <div className="flex items-center text-green-600 group-hover:text-green-100 text-sm transition-colors">
                                <Import className="w-4 h-4 mr-2" />
                                <span>Import from existing spreadsheets</span>
                            </div>
                            <div className="flex items-center text-green-600 group-hover:text-green-100 text-sm transition-colors">
                                <Copy className="w-4 h-4 mr-2" />
                                <span>Copy/paste from brokers</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                    <Star className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-purple-900">
                        <span className="font-medium">Pro tip:</span> Use Quick Add for diverse portfolios, Excel for single-broker imports
                    </p>
                </div>
            </div>
        </div>
    );

    const QuickPositionWrapper = () => {
        return (
            <div className="relative">
                <AddQuickPositionModal
                    isOpen={true}
                    onClose={() => {
                        setImportMethod(null);
                        // Optionally refresh data or show success
                    }}
                    onPositionsSaved={(count) => {
                        setImportedPositions(count);
                        setActiveTab('success');
                        setImportMethod(null);
                    }}
                />
            </div>
        );
    };

    const renderUIAccountCreation = () => {
        return (
        <div className="space-y-4 animate-fadeIn">
            {/* Compact Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl mb-3 shadow-2xl shadow-purple-600/30">
                    <ListPlus className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Quick Add Accounts</h3>
                <p className="text-gray-600">Build your investment portfolio</p>
            </div>

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

            {/* Action Buttons Row - Moved to top */}
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white p-3 rounded-xl border border-gray-100">
                <button
                    onClick={addNewAccount}
                    className="group relative flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                    <div className="relative flex items-center">
                        <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-medium">Add Another Account</span>
                    </div>
                </button>

                {validAccounts.length > 0 && (
                    <button
                        onClick={handleSubmitAccounts}
                        disabled={isSubmitting}
                        className="relative group flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Creating<LoadingDots />
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

            {/* Compact Table Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                {/* Compact Table Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-3 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        <div className="col-span-3 flex items-center">
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

                {/* Account Rows - Tighter spacing */}
                <div className="p-3 space-y-2 bg-gradient-to-b from-gray-50/30 to-white relative overflow-visible" style={{ minHeight: '200px' }}>
                    {sortedAccounts.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
                                <Building className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 text-sm">Click "Add Another Account" to get started</p>
                        </div>
                    ) : (
                        sortedAccounts.map((account, index) => {
                            const isValid = account.accountName && account.institution && account.accountCategory && account.accountType;
                            const selectedInstitution = popularBrokerages.find(b => b.name === account.institution);
                            const selectedCategory = ACCOUNT_CATEGORIES.find(c => c.id === account.accountCategory);
                            const accountTypes = ACCOUNT_TYPES_BY_CATEGORY[account.accountCategory] || [];
                            
                            return (
                                <div 
                                    key={account.tempId}
                                    className={`group relative bg-white rounded-lg border-2 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-lg ${
                                        account.isNew ? 'border-indigo-400 shadow-md shadow-indigo-200/50 slide-in-animation ring-2 ring-indigo-400/20' : 
                                        isValid ? 'border-green-300 hover:border-green-400' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    style={{ 
                                        zIndex: sortedAccounts.length - index,
                                        position: 'relative'
                                    }}
                                >
                                    <div className="grid grid-cols-12 gap-3 p-3 items-center">
                                        <div className="col-span-3">
                                            <input
                                                ref={account.isNew && index === accounts.length - 1 ? newRowRef : null}
                                                type="text"
                                                value={account.accountName}
                                                onChange={(e) => updateAccount(account.tempId, 'accountName', e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && isValid) {
                                                        e.preventDefault();
                                                        setOpenDropdownId(null);
                                                        addNewAccount();
                                                    }
                                                }}
                                                placeholder="My Retirement Account..."
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
                                            />
                                        </div>
                                            <div className="col-span-3 relative">
                                            <SearchableDropdown
                                                options={popularBrokerages}
                                                value={account.institution}
                                                onChange={(value) => updateAccount(account.tempId, 'institution', value)}
                                                placeholder="Type to search..."
                                                showLogos={true}
                                                onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? account.tempId : null)}
                                                onEnterKey={() => {
                                                    if (isValid) {addNewAccount();
                                                   }
                                               }}
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
                                               onKeyDown={(e) => {
                                                   if (e.key === 'Enter' && isValid) {
                                                       e.preventDefault();
                                                       addNewAccount();
                                                   }
                                               }}
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
                                               onKeyDown={(e) => {
                                                   if (e.key === 'Enter' && isValid) {
                                                       e.preventDefault();
                                                       addNewAccount();
                                                   }
                                               }}
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
                                   
                                   {/* Compact Visual status indicator */}
                                   <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all duration-500 ${
                                       account.isNew ? 'bg-gradient-to-b from-indigo-400 via-purple-400 to-pink-400 animate-pulse' :
                                       isValid ? 'bg-gradient-to-b from-green-400 to-emerald-500' : 'bg-gradient-to-b from-gray-300 to-gray-400'
                                   }`} />
                                   
                                   {/* Category icon - smaller */}
                                   {selectedCategory && (
                                       <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                                           <div className="w-8 h-8 rounded-lg border border-white shadow-lg bg-gradient-to-br from-white to-gray-50 flex items-center justify-center">
                                               <selectedCategory.icon className="w-4 h-4 text-gray-700" />
                                           </div>
                                       </div>
                                   )}
                                   
                                   {/* Success checkmark - smaller */}
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

           {/* Compact Keyboard shortcuts */}
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
               @keyframes fadeIn {
                   from { opacity: 0; transform: translateY(10px); }
                   to { opacity: 1; transform: translateY(0); }
               }
               .animate-fadeIn {
                   animation: fadeIn 0.3s ease-out;
               }
           `}</style>
       </div>
   );
   }       

   const renderSuccessScreen = () => {
       const isPositions = activeTab === 'positions' || importedPositions > 0;
       
       return (
           <div className="space-y-6 animate-fadeIn text-center">
               <div className="relative">
                   <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 animate-bounce">
                       <CheckCircle className="w-10 h-10 text-white" />
                   </div>
                   <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-32 h-32 bg-green-500 rounded-full animate-ping opacity-20" />
                   </div>
               </div>
               
               <div>
                   <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                   <p className="text-gray-600">
                       {isPositions ? 
                           `Successfully imported ${importedPositions} position${importedPositions !== 1 ? 's' : ''}!` :
                           `Successfully created ${importedAccounts.length} account${importedAccounts.length !== 1 ? 's' : ''}!`
                       }
                   </p>
               </div>

               {/* Success Summary Dashboard */}
               {!isPositions && importedAccounts.length > 0 && (
                   <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 max-w-2xl mx-auto border border-green-200">
                       <h4 className="font-semibold text-gray-900 mb-4 flex items-center justify-center">
                           <Activity className="w-5 h-5 mr-2 text-green-600" />
                           Import Summary
                       </h4>
                       
                       {/* Stats Grid */}
                       <div className="grid grid-cols-3 gap-4 mb-6">
                           <div className="bg-white rounded-lg p-3 text-center">
                               <p className="text-2xl font-bold text-green-600">
                                   <AnimatedNumber value={importedAccounts.length} />
                               </p>
                               <p className="text-xs text-gray-600">Accounts Added</p>
                           </div>
                           <div className="bg-white rounded-lg p-3 text-center">
                               <p className="text-2xl font-bold text-blue-600">
                                   <AnimatedNumber value={new Set(importedAccounts.map(a => a.institution)).size} />
                               </p>
                               <p className="text-xs text-gray-600">Institutions</p>
                           </div>
                           <div className="bg-white rounded-lg p-3 text-center">
                               <p className="text-2xl font-bold text-purple-600">
                                   <AnimatedNumber value={new Set(importedAccounts.map(a => a.account_category)).size} />
                               </p>
                               <p className="text-xs text-gray-600">Categories</p>
                           </div>
                       </div>

                       {/* Account List */}
                       <div className="space-y-2 max-h-48 overflow-y-auto">
                           {importedAccounts.map((account, index) => {
                               const category = ACCOUNT_CATEGORIES.find(c => 
                                   c.id.toLowerCase() === account.account_category?.toLowerCase()
                               );
                               const CategoryIcon = category?.icon || Building;
                               
                               return (
                                   <div 
                                       key={index} 
                                       className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-shadow"
                                       style={{ animationDelay: `${index * 50}ms` }}
                                   >
                                       <div className="flex items-center">
                                           <CategoryIcon className="w-4 h-4 text-gray-600 mr-3" />
                                           <div>
                                               <p className="font-medium text-gray-900 text-sm">{account.account_name}</p>
                                               <p className="text-xs text-gray-500">{account.institution} • {account.type}</p>
                                           </div>
                                       </div>
                                       <CheckCircle className="w-4 h-4 text-green-500" />
                                   </div>
                               );
                           })}
                       </div>
                   </div>
               )}
               
               <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto">
                   <h4 className="font-semibold text-gray-900 mb-3">What's Next?</h4>
                   <div className="space-y-3 text-left">
                       {isPositions ? (
                           <>
                               <div className="flex items-start">
                                   <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                       <span className="text-xs font-semibold text-green-600">1</span>
                                   </div>
                                   <div>
                                       <p className="font-medium text-gray-900">View Portfolio</p>
                                       <p className="text-sm text-gray-600">See your complete portfolio overview</p>
                                   </div>
                               </div>
                               <div className="flex items-start">
                                   <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                       <span className="text-xs font-semibold text-green-600">2</span>
                                   </div>
                                   <div>
                                       <p className="font-medium text-gray-900">Track Performance</p>
                                       <p className="text-sm text-gray-600">Monitor gains, losses, and trends</p>
                                   </div>
                               </div>
                           </>
                       ) : (
                           <>
                               <div className="flex items-start">
                                   <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                       <span className="text-xs font-semibold text-green-600">1</span>
                                   </div>
                                   <div>
                                       <p className="font-medium text-gray-900">Add Positions</p>
                                       <p className="text-sm text-gray-600">Import your investments to these accounts</p>
                                   </div>
                               </div>
                               <div className="flex items-start">
                                   <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                       <span className="text-xs font-semibold text-green-600">2</span>
                                   </div>
                                   <div>
                                       <p className="font-medium text-gray-900">View Dashboard</p>
                                       <p className="text-sm text-gray-600">See your portfolio overview and analytics</p>
                                   </div>
                               </div>
                           </>
                       )}
                       <div className="pt-2 border-t border-green-200 mt-3">
                           <p className="text-xs text-gray-600 flex items-center">
                               <Info className="w-3 h-3 mr-1.5" />
                               You can continue adding accounts and positions anytime
                           </p>
                       </div>
                   </div>
               </div>
               
               <div className="flex justify-center space-x-3">
                   {!isPositions && (
                       <>
                           <button
                               onClick={() => {
                                   setActiveTab('accounts');
                                   setImportMethod(null);
                                   setAccounts([]);
                                   setImportedAccounts([]);
                               }}
                               className="px-5 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center"
                           >
                               <Plus className="w-4 h-4 mr-1.5" />
                               Add More Accounts
                           </button>
                           <button
                               onClick={() => {
                                   setActiveTab('positions');
                                   setImportMethod(null);
                                   setAccounts([]);
                                   setImportedAccounts([]);
                               }}
                               className="px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center"
                           >
                               <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                               Import Positions
                           </button>
                       </>
                   )}
                   <button
                       onClick={onClose}
                       className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all duration-200"
                   >
                       Done
                   </button>
               </div>
           </div>
       );
   };

   const renderTemplateSection = (type) => {
       const isAccounts = type === 'accounts';
       const color = isAccounts ? 'blue' : 'purple';
       const Icon = isAccounts ? Building : FileSpreadsheet;
       
       return (
           <div className="space-y-6 animate-fadeIn">
               <div className="text-center">
                   <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-full mb-4`}>
                       <Icon className="w-8 h-8 text-white" />
                   </div>
                   <h3 className="text-2xl font-bold text-gray-900 mb-2">
                       Excel Import - {isAccounts ? 'Accounts' : 'Positions'}
                   </h3>
                   <p className="text-gray-600 max-w-md mx-auto">
                       {isAccounts 
                           ? 'Download the template and fill in your account information'
                           : 'Add your investment positions to your existing accounts'}
                   </p>
               </div>

               {!isAccounts && (
                   <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                       <div className="flex items-center">
                           <AlertCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                           <p className="text-sm text-purple-900">
                               Make sure you've imported your accounts first. The positions template will include your account names.
                           </p>
                       </div>
                   </div>
               )}

               <div className="bg-gray-50 rounded-xl p-6">
                   <h4 className="font-semibold text-gray-900 mb-4">How it works:</h4>
                   <div className="space-y-3">
                       <div className="flex items-start">
                           <div className={`flex-shrink-0 w-8 h-8 bg-${color}-100 rounded-full flex items-center justify-center mr-3`}>
                               <span className={`text-sm font-semibold text-${color}-600`}>1</span>
                           </div>
                           <div>
                               <p className="font-medium text-gray-900">Download the Excel template</p>
                               <p className="text-sm text-gray-600 mt-1">
                                   {isAccounts 
                                       ? 'Pre-formatted with dropdowns for institutions and account types'
                                       : 'Customized with your account names for easy selection'}
                               </p>
                           </div>
                       </div>
                       <div className="flex items-start">
                           <div className={`flex-shrink-0 w-8 h-8 bg-${color}-100 rounded-full flex items-center justify-center mr-3`}>
                               <span className={`text-sm font-semibold text-${color}-600`}>2</span>
                           </div>
                           <div>
                               <p className="font-medium text-gray-900">Fill in your information</p>
                               <p className="text-sm text-gray-600 mt-1">
                                   {isAccounts 
                                       ? 'Add your account names, institutions, and types'
                                       : 'Enter your securities, quantities, and purchase details'}
                               </p>
                           </div>
                       </div>
                       <div className="flex items-start">
                           <div className={`flex-shrink-0 w-8 h-8 bg-${color}-100 rounded-full flex items-center justify-center mr-3`}>
                               <span className={`text-sm font-semibold text-${color}-600`}>3</span>
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
                       onClick={() => downloadTemplate(type)}
                       disabled={isDownloading}
                       className={`inline-flex items-center px-6 py-3 bg-gradient-to-r from-${color}-600 to-${color}-700 text-white font-medium rounded-lg hover:from-${color}-700 hover:to-${color}-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                   >
                       {isDownloading ? (
                           <>
                               <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                               Downloading<LoadingDots />
                           </>
                       ) : (
                           <>
                               <Download className="w-5 h-5 mr-2" />
                               Download {isAccounts ? 'Accounts' : 'Positions'} Template
                           </>
                       )}
                   </button>
               </div>
           </div>
       );
   };

   const renderUploadSection = () => (
       <div className="space-y-6 animate-fadeIn">
           <div className="text-center">
               <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4">
                   <Upload className="w-8 h-8 text-white" />
               </div>
               <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Completed Template</h3>
               <p className="text-gray-600">
                   Upload your filled {selectedTemplate} template for validation
               </p>
           </div>

           <div
               className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                   isDragging 
                       ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                       : uploadedFile 
                           ? 'border-green-500 bg-green-50' 
                           : 'border-gray-300 hover:border-gray-400 bg-gray-50'
               }`}
               onDragEnter={handleDragEnter}
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}
           >
               <input
                   ref={fileInputRef}
                   type="file"
                   accept=".xlsx,.xls"
                   onChange={(e) => handleFileSelect(e.target.files[0])}
                   className="hidden"
               />

               {!uploadedFile ? (
                   <>
                       <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600 animate-bounce' : 'text-gray-400'}`} />
                       <p className="text-lg font-medium text-gray-900 mb-2">
                           {isDragging ? 'Drop your file here' : 'Drag and drop your Excel file'}
                       </p>
                       <p className="text-sm text-gray-600 mb-4">or</p>
                       <button
                           onClick={() => fileInputRef.current?.click()}
                           className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors group"
                       >
                           <FolderOpen className="w-4 h-4 mr-2 text-gray-500 group-hover:text-gray-700" />
                           Browse Files
                       </button>
                       <p className="text-xs text-gray-500 mt-4">Supported formats: .xlsx, .xls</p>
                   </>
               ) : (
                   <div className="space-y-4">
                       <FileCheck className="w-12 h-12 mx-auto text-green-600" />
                       <div>
                           <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
                           <p className="text-sm text-gray-600">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                       </div>
                       
                       {validationStatus === 'validating' && (
                           <div className="space-y-2">
                               <div className="flex items-center justify-center text-blue-600">
                                   <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                   <span className="text-sm">Validating file<LoadingDots /></span>
                               </div>
                               <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                   <div 
                                       className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 relative"
                                       style={{ width: `${uploadProgress}%` }}
                                   >
                                       <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                   </div>
                               </div>
                           </div>
                       )}
                       {validationStatus === 'valid' && (
                          <div className="space-y-3">
                              <div className="flex items-center justify-center text-green-600">
                                  <CheckCircle className="w-5 h-5 mr-2" />
                                  <span className="font-medium">File validated successfully!</span>
                              </div>
                              <button className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-[1.02]">
                                  Import Data
                              </button>
                          </div>
                      )}
                      
                      <button
                          onClick={() => {
                              setUploadedFile(null);
                              setValidationStatus(null);
                              setUploadProgress(0);
                          }}
                          className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center"
                      >
                          <RefreshCw className="w-3 h-3 mr-1.5" />
                          Upload different file
                      </button>
                  </div>
              )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Tips for successful import:</p>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                          <li>Don't modify the column headers</li>
                          <li>Use the dropdown options where provided</li>
                          <li>Leave cells empty rather than using "N/A"</li>
                          <li>Save the file in Excel format (.xlsx)</li>
                      </ul>
                  </div>
              </div>
          </div>
      </div>
  );

  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 z-[100000] overflow-y-auto quickstart-modal-overlay">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
              <div 
                  className="fixed inset-0 transition-opacity duration-300 ease-out z-[99999]"
                  onClick={onClose}
              >
                  <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
              </div>

              <div className="relative inline-block w-full max-w-5xl bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ease-out z-[100001]">
                  <div className="absolute top-4 right-4 z-10">
                      <button
                          onClick={onClose}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                          <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                      </button>
                  </div>

                  {activeTab !== 'overview' && activeTab !== 'success' && (
                      <div className="absolute top-4 left-4 z-10">
                          <button
                           onClick={() => {
                               if (activeTab === 'positions' && importMethod === 'ui') {
                                   setImportMethod(null);
                               } else if (activeTab === 'upload') {
                                   setActiveTab(selectedTemplate === 'accounts' ? 'accounts' : 'positions');
                                   setUploadedFile(null);
                                   setValidationStatus(null);
                                   setUploadProgress(0);
                               } else if (importMethod) {
                                   setImportMethod(null);
                                   setAccounts([]);
                               } else {
                                   setActiveTab('overview');
                               }
                           }}
                              className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center p-2 rounded-lg hover:bg-gray-100 group"
                          >
                              <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
                              Back
                          </button>
                      </div>
                  )}

                  <div className="p-8">
                      {activeTab === 'overview' && renderOverview()}
                      {activeTab === 'accounts' && !importMethod && renderAccountImportChoice()}
                      {activeTab === 'accounts' && importMethod === 'ui' && renderUIAccountCreation()}
                      {activeTab === 'accounts' && importMethod === 'excel' && renderTemplateSection('accounts')}
                       {activeTab === 'positions' && !importMethod && renderPositionImportChoice()}
                       {activeTab === 'positions' && importMethod === 'ui' && <QuickPositionWrapper />}
                       {activeTab === 'positions' && importMethod === 'excel' && renderTemplateSection('positions')}
                      {activeTab === 'upload' && renderUploadSection()}
                      {activeTab === 'success' && renderSuccessScreen()}
                  </div>
              </div>
          </div>
      </div>
  );
};

// Quick Start Button Component
export const QuickStartButton = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
      <>
          <button
              onClick={() => setIsModalOpen(true)}
              className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
          >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-green-400 group-hover:text-white transition-colors" />
                  <span className="text-sm text-gray-200 group-hover:text-white font-medium">Quick Add</span>
              </div>
          </button>
          
          <QuickStartModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
          />
      </>
  );
};

export default QuickStartModal;