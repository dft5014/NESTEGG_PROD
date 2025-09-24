import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDataStore } from '@/store/DataStore';
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
    Home, Car, GraduationCap, FileText,
    Repeat
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';
import ReactDOM from 'react-dom';
import { useAccounts } from '@/store/hooks/useAccounts';
import AddQuickPositionModal from '@/components/modals/AddQuickPositionModal';
import { AddLiabilitiesModal } from '@/components/modals/AddLiabilitiesModal';

// Account categories matching AccountModal and database constraints
const ACCOUNT_CATEGORIES = [
    { id: "brokerage", name: "Brokerage", icon: Briefcase },
    { id: "retirement", name: "Retirement", icon: Building },
    { id: "cash", name: "Cash / Banking", icon: DollarSign },
    { id: "cryptocurrency", name: "Cryptocurrency", icon: Hash },
    { id: "metals", name: "Metals Storage", icon: Shield }
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
            // Check if the click is on a dropdown item by looking for the portal container
            const isDropdownClick = e.target.closest('[data-dropdown-portal="true"]');
            
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !isDropdownClick) {
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
                data-dropdown-portal="true" 
                style={{
                    position: 'fixed',
                    top: shouldShowAbove ? 'auto' : `${rect.bottom + 4}px`,
                    bottom: shouldShowAbove ? `${viewportHeight - rect.top + 4}px` : 'auto',
                    left: `${rect.left}px`,
                    width: `${rect.width}px`,
                    zIndex: 9999999,
                    pointerEvents: 'auto'
                }}
                className="bg-white border border-gray-200 rounded-lg shadow-xl animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
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
    const [showAccountsDropdown, setShowAccountsDropdown] = useState(false);
    const [importedAccounts, setImportedAccounts] = useState([]);
    const [importedPositions, setImportedPositions] = useState(0);
    const [importedPositionsData, setImportedPositionsData] = useState([]);
    const [importedLiabilities, setImportedLiabilities] = useState(0);
    const [importedLiabilitiesData, setImportedLiabilitiesData] = useState([]);
    const { actions } = useDataStore();
    const { refreshData } = actions;
    const { 
    accounts: existingAccounts,
    loading: isLoadingAccounts,
    error: accountsError,
    refresh: refreshAccounts,
    lastFetched: accountsLastFetched
        } = useAccounts();

    // Try a single fetch only if we've never fetched yet (prevents loops for brand-new users with 0 accounts)
    const triedInitialAccountsFetchRef = useRef(false);
    useEffect(() => {
        if (triedInitialAccountsFetchRef.current) return;
        if (!isLoadingAccounts && !accountsLastFetched) {
            triedInitialAccountsFetchRef.current = true;
            refreshAccounts();
        } else if (!isLoadingAccounts) {
            // We've either fetched already (even if empty) or are idle; don't loop.
            triedInitialAccountsFetchRef.current = true;
        }
        }, [isLoadingAccounts, accountsLastFetched, refreshAccounts]);




    const accountsByCategory = useMemo(() => {
        const grouped = {};
        // Ensure existingAccounts is an array before processing
        const accounts = Array.isArray(existingAccounts) ? existingAccounts : [];
        
        ACCOUNT_CATEGORIES.forEach(cat => {
            grouped[cat.id] = accounts.filter(acc => 
                // Check both possible field names from DataStore
                acc?.category?.toLowerCase() === cat.id.toLowerCase() ||
                acc?.account_category?.toLowerCase() === cat.id.toLowerCase()
            );
        });
        return grouped;
    }, [existingAccounts]);

    // NEW: map account name → id for Excel rows (case-insensitive)
    const accountNameToId = useMemo(() => {
        const map = new Map();
        (Array.isArray(existingAccounts) ? existingAccounts : []).forEach(acc => {
            const key = String(acc?.account_name || acc?.name || '').trim().toLowerCase();
            if (key) map.set(key, acc.id);
        });
        return map;
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
                setImportedLiabilities(0); 
                setImportedLiabilitiesData([]);  
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
            await refreshAccounts();
            await refreshData();
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

    // --- Excel → UI staging (auto-detect Accounts vs Positions) ---
    const REQUIRED_ACCOUNT_HEADERS = ['Account Name', 'Institution', 'Account Category', 'Account Type'];
    const REQUIRED_POSITION_HEADERS = ['Account', 'Asset Type', 'Identifier / Ticker', 'Quantity', 'Purchase Price per Share', 'Purchase Date'];


    const readFileAsArrayBuffer = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

    // lenient header matcher: case/space-insensitive
    const normalizeHeader = (h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');

    // NEW — helpers for Positions parsing
    const norm = (v) => String(v ?? '').trim();
    const normLower = (v) => norm(v).toLowerCase();

    const toNumber = (v) => {
        if (v === null || v === undefined || v === '') return undefined;
        const s = String(v).replace(/,/g, '');
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
    };

        // Excel (1900 system) day serial -> YYYY-MM-DD
    const excelSerialToISO = (n) => {
        if (!Number.isFinite(n)) return undefined;
        // Excel day 1 = 1899-12-31 (1900 leap bug). Using 1899-12-30 works well in practice.
        const baseUTC = Date.UTC(1899, 11, 30);
        const d = new Date(baseUTC + Math.round(n) * 86400000);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return (y >= 1000 && y <= 9999) ? `${y}-${m}-${day}` : undefined;
        };

        // Final guard for <input type="date">
    const toDateInputValue = (s) => {
        if (!s) return '';
        return /^(\d{4})-(\d{2})-(\d{2})$/.test(String(s)) ? s : '';
        };

        // Normalize XLSX values (Date | number | string) → YYYY-MM-DD
        const toDateString = (v) => {
        if (v == null || v === '') return undefined;

        // JS Date object
        if (v instanceof Date && Number.isFinite(v.getTime())) {
            const y = v.getFullYear();
            const m = String(v.getMonth() + 1).padStart(2, '0');
            const d = String(v.getDate()).padStart(2, '0');
            return (y >= 1000 && y <= 9999) ? `${y}-${m}-${d}` : undefined;
        }

        // Excel serial number
        if (typeof v === 'number') {
            return excelSerialToISO(v);
        }

        const raw = String(v).trim();
        if (!raw) return undefined;

        // Handle "+043831-01-01" / "043831-01-01" by treating leading number as serial
        const serialish = raw.match(/^[+]?0*(\d{5,})-0?1-0?1$/);
        if (serialish) {
            const n = Number(serialish[1]);
            const iso = excelSerialToISO(n);
            if (iso) return iso;
        }

        // ISO-ish: YYYY-M-D or YYYY/M/D -> zero-pad
        const isoLoose = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
        if (isoLoose) {
            const y = Number(isoLoose[1]);
            const m = String(isoLoose[2]).padStart(2, '0');
            const d = String(isoLoose[3]).padStart(2, '0');
            return (y >= 1000 && y <= 9999) ? `${y}-${m}-${d}` : undefined;
        }

        // US-style M/D/YYYY or M-D-YYYY
        const us = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
        if (us) {
            let y = Number(us[3]);
            if (us[3].length === 2) y = 2000 + y; // naive 2-digit year
            const m = String(us[1]).padStart(2, '0');
            const d = String(us[2]).padStart(2, '0');
            return (y >= 1000 && y <= 9999) ? `${y}-${m}-${d}` : undefined;
        }

        // Last-chance parse
        const d = new Date(raw);
        if (Number.isFinite(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return (y >= 1000 && y <= 9999) ? `${y}-${m}-${dd}` : undefined;
        }

        return undefined;
        };


    const seedRow = (type, data) => ({
        id: Date.now() + Math.random(),
        type,
        data,
        errors: {},
        isNew: true,
        animateIn: true
    });

        // --- Robust Positions parser (header-insensitive) ---
        // NEW — parse the Positions template tabs into QuickAdd shape (robust to banner row)
    const parsePositionsExcel = async (file) => {
        const buf = await readFileAsArrayBuffer(file);
        const XLSX = await import('xlsx');
        // Keep real Excel dates as JS Date objects
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });

        const findSheet = (part) =>
            wb.SheetNames.find((n) => normLower(n).includes(part));

        // Always skip the banner row (row 1) and read textual values
        const rowsFrom = (sheetName) =>
            XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '', raw: false, range: 1 });
        const result = { security: [], cash: [], crypto: [], metal: [] };
        const accountIdFor = (name) => {
            const key = normLower(name);
            return accountNameToId.get(key);
        };

        // --- SECURITIES ---
        const secSheetName = findSheet('secur'); // matches "📈 SECURITIES"
        if (secSheetName) {
            const rows = rowsFrom(secSheetName);
            rows.forEach((r) => {
                const account = r['Account'] ?? r['Account*'] ?? r['account'];
                // accept both "Identifier / Ticker" and "Ticker"/"Symbol"
                const ticker = r['Identifier / Ticker'] ?? r['Ticker'] ?? r['Symbol'] ?? r['symbol'];
                const name = r['Company Name'] ?? r['Name'] ?? r['Company'] ?? '';
                const shares = r['Shares'] ?? r['Quantity'];
                const cost = r['Cost Basis*'] ?? r['Cost Basis'] ?? r['Purchase Price'] ?? r['Price'];
                const date = r['Purchase Date*'] ?? r['Purchase Date'] ?? r['Acquired Date (YYYY-MM-DD)'];
                
                const acctNorm = norm(account);
                const tickNorm = norm(ticker);
                
                // Skip the instruction row and the example placeholder rows
                const isInstruction = acctNorm.startsWith('⚠');
                const isPlaceholder = /^select account/i.test(acctNorm);
                const isEmptyRow = !acctNorm && !tickNorm && !toNumber(shares) && !toNumber(cost) && !toDateString(date);
                if (isInstruction || isPlaceholder || isEmptyRow) return;
                
                // Require both Account and Ticker to push a row
                if (!acctNorm || !tickNorm) return;

                result.security.push(
                    seedRow('security', {
                        account_id: accountIdFor(account),
                        account_name: acctNorm,
                        ticker: tickNorm,
                        name: norm(name),
                        shares: toNumber(shares),
                        cost_basis: toNumber(cost),
                        purchase_date: toDateString(date),
                    })
                );
            });
        }
        
        // --- CASH ---
        const cashSheetName = findSheet('cash'); // matches "💵 CASH"
        if (cashSheetName) {
            const rows = rowsFrom(cashSheetName);
            rows.forEach((r) => {
                const account = r['Account'] ?? r['Account*'] ?? r['account'];
                const cashType = r['Cash Type'] ?? r['Cash Type*'] ?? r['Type'];
                const amount = r['Amount'] ?? r['Amount*'];
                const rate = r['Interest Rate (%)'] ?? r['Interest Rate'] ?? r['Rate'];
                const maturity = r['Maturity Date'] ?? r['Maturity'];
                
                const acctNorm = norm(account);
                const typeNorm = norm(cashType);
                
                const isInstruction = acctNorm.startsWith('⚠');
                const isPlaceholder = /^select account/i.test(acctNorm);
                const isEmptyRow = !acctNorm && !typeNorm && !toNumber(amount);
                if (isInstruction || isPlaceholder || isEmptyRow) return;

                // Required for CASH: Account + Cash Type + Amount
                if (!acctNorm || !typeNorm || !toNumber(amount)) return;

                result.cash.push(
                    seedRow('cash', {
                        account_id: accountIdFor(account),
                        account_name: acctNorm,
                        cash_type: typeNorm,
                        amount: toNumber(amount),
                        interest_rate: toNumber(rate),
                        maturity_date: toDateString(maturity),
                    })
                );
            });
        }

        // --- CRYPTO ---
        const cryptoSheetName = findSheet('crypto'); // matches "🪙 CRYPTO"
        if (cryptoSheetName) {
            const rows = rowsFrom(cryptoSheetName);
            rows.forEach((r) => {
                const account = r['Account'] ?? r['Account*'] ?? r['account'];
                const symbol = r['Symbol'] ?? r['Symbol*'] ?? r['Ticker'];
                const name = r['Name'] ?? '';
                const qty = r['Quantity'] ?? r['Quantity*'];
                const price = r['Purchase Price'] ?? r['Purchase Price*'] ?? r['Price'];
                const date = r['Purchase Date'] ?? r['Purchase Date*'];
                
                const acctNorm = norm(account);
                const symNorm = norm(symbol);
                
                const isInstruction = acctNorm.startsWith('⚠');
                const isPlaceholder = /^select account/i.test(acctNorm);
                const isEmptyRow = !acctNorm && !symNorm && !toNumber(qty) && !toNumber(price);
                if (isInstruction || isPlaceholder || isEmptyRow) return;
                
                // Require Account + Symbol
                if (!acctNorm || !symNorm) return;

                result.crypto.push(
                    seedRow('crypto', {
                        account_id: accountIdFor(account),
                        account_name: acctNorm,
                        symbol: symNorm,
                        name: norm(name),
                        quantity: toNumber(qty),
                        purchase_price: toNumber(price),
                        purchase_date: toDateString(date),
                    })
                );
            });
        }

        // --- METALS ---
        const metalSheetName = findSheet('metal'); // matches "🥇 METALS"
        if (metalSheetName) {
            const rows = rowsFrom(metalSheetName);
            rows.forEach((r) => {
                const account = r['Account'] ?? r['Account*'] ?? r['account'];
                const mtype = r['Metal Type'] ?? r['Metal Type*'] ?? r['Metal'];
                const code = r['Metal Code'] ?? r['Symbol'] ?? r['Ticker'] ?? ''; // ok if blank
                const qty = r['Quantity (oz)'] ?? r['Quantity (oz)*'] ?? r['Quantity'];
                const price = r['Purchase Price/oz'] ?? r['Purchase Price/oz*'] ?? r['Price/Unit'] ?? r['Purchase Price'];
                const date = r['Purchase Date'] ?? r['Purchase Date*'];
                
                const acctNorm = norm(account);
                const typeNorm = norm(mtype);
                
                const isInstruction = acctNorm.startsWith('⚠');
                const isPlaceholder = /^select account/i.test(acctNorm);
                const isEmptyRow = !acctNorm && !typeNorm && !toNumber(qty) && !toNumber(price);
                if (isInstruction || isPlaceholder || isEmptyRow) return;

                // Require Account + Metal Type (code can be blank; UI/Excel VLOOKUP fills it)
                if (!acctNorm || !typeNorm) return;

                result.metal.push(
                    seedRow('metal', {
                        account_id: accountIdFor(account),
                        account_name: acctNorm,
                        metal_type: typeNorm,
                        symbol: norm(code),
                        name: '',
                        quantity: toNumber(qty),
                        unit: 'oz',
                        purchase_price: toNumber(price),
                        purchase_date: toDateString(date),
                    })
                );
            });
        }
        return result;
    };


    const parseAccountsExcel = async (file) => {
        const buf = await readFileAsArrayBuffer(file);
        const XLSX = await import('xlsx');
        // Keep real Excel dates as JS Date objects
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        const sheetName = wb.SheetNames.find((n) => normalizeHeader(n) === 'accounts') || wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        
        // First try: assume header row is the first row after banner; if not, fallback
        let rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        if (!rows.length || Object.keys(rows[0] || {}).length <= 1) {
            rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, range: 1 });
        }
        
        if (!rows.length) return [];

        // Build a case-insensitive header map using the first row's keys
        const headerKeys = Object.keys(rows[0]);
        const headerMap = {};
        for (const k of headerKeys) headerMap[normalizeHeader(k)] = k;
        
        // Verify required headers exist (leniently)
        const missing = REQUIRED_ACCOUNT_HEADERS.filter(
            (req) => !(normalizeHeader(req) in headerMap)
        );
        if (missing.length) {
            throw new Error(`Missing required column(s): ${missing.join(', ')}`);
        }

        const mapVal = (row, label) => String(row[headerMap[normalizeHeader(label)]] ?? '').trim();

        // Build UI-shape accounts array your table already expects
        const parsed = rows
            .map((r) => {
                const accountName = mapVal(r, 'Account Name');
                const institution = mapVal(r, 'Institution');
                const accountCategory = mapVal(r, 'Account Category'); // id or label
                const accountType = mapVal(r, 'Account Type');
                const hasAnyValue = [accountName, institution, accountCategory, accountType]
                    .some((v) => v && v.length > 0);
                if (!hasAnyValue) return null; // skip fully empty rows
                
                return {
                    tempId: Date.now() + Math.random(),
                    accountName,
                    institution,
                    accountCategory,
                    accountType,
                    isNew: true,
                };
            })
            .filter(Boolean);

        // Translate category labels → ids if needed
        const categoryNames = new Map(
            ACCOUNT_CATEGORIES.map((c) => [c.name.toLowerCase(), c.id])
        );
        parsed.forEach((a) => {
            const lowered = String(a.accountCategory || '').toLowerCase();
            if (categoryNames.has(lowered)) a.accountCategory = categoryNames.get(lowered);
        });

        return parsed;
    };


    // Detect which template (by sheet name or headers)
    const detectTemplateType = async (file) => {
        const buf = await readFileAsArrayBuffer(file);
        const XLSX = await import('xlsx');
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });

        // 1) Quick sheet-name heuristic
        const sheetNamesNorm = wb.SheetNames.map((n) => (n || '').toLowerCase());
        if (sheetNamesNorm.some((n) => n.includes('accounts'))) return { kind: 'accounts', wb };
        
        // Positions template has per-tab sheets like "📈 SECURITIES", "💵 CASH", "🪙 CRYPTO", "🥇 METALS"
        const looksLikePositionsByName = sheetNamesNorm.some(
            (n) => n.includes('secur') || n.includes('cash') || n.includes('crypto') || n.includes('metal')
        );
        if (looksLikePositionsByName) return { kind: 'positions', wb };
        
        // 2) Header sniff across ALL sheets (not just the first)
        const normH = (h) => String(h || '').trim().toLowerCase().replace(/\s+/g, '');
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const firstRow = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false, range: 0 });

        const firstRowHeaders = Object.keys(firstRow[0] || {}).map(normH);
        
        const accountsHeadersNorm = REQUIRED_ACCOUNT_HEADERS.map(normH);
        const positionsHeadersNorm = REQUIRED_POSITION_HEADERS.map(normH);

        const hasAccountsHeaders = accountsHeadersNorm.every(h => firstRowHeaders.includes(h));
        if (hasAccountsHeaders) return { kind: 'accounts', wb };

        const hasPositionsHeaders = positionsHeadersNorm.every(h => firstRowHeaders.includes(h));
        if (hasPositionsHeaders) return { kind: 'positions', wb };

        return null;
    };
    
    
    const handleFileSelect = async (file) => {
        setUploadedFile(file);
        setUploadProgress(0);
        setValidationStatus(null);
        
        // Simulate a progress bar while file is processing
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);
        
        try {
            const detection = await detectTemplateType(file);
            
            if (!detection) {
                setValidationStatus('error');
                throw new Error("Could not determine file type. Please use the official template.");
            }
            
            let result;
            if (detection.kind === 'accounts') {
                result = { accounts: await parseAccountsExcel(file) };
            } else if (detection.kind === 'positions') {
                result = await parsePositionsExcel(file);
            }
            
            setImportedAccounts(result?.accounts || []);
            setImportedPositions(
                (result?.security?.length || 0) + 
                (result?.cash?.length || 0) + 
                (result?.crypto?.length || 0) +
                (result?.metal?.length || 0)
            );
            setImportedPositionsData([
                ...(result?.security || []), 
                ...(result?.cash || []),
                ...(result?.crypto || []),
                ...(result?.metal || [])
            ]);
            
            if (result?.accounts?.length > 0) {
                // Pre-populate with accounts from file
                setAccounts(result.accounts);
                setImportMethod('ui');
                setActiveTab('accounts');
            } else if (importedPositions > 0) {
                 // Open the Quick Add Position modal if positions were found
                setImportMethod('quick-add');
            } else {
                 setValidationStatus('error');
                 throw new Error("No accounts or positions found in the file.");
            }
            
            setValidationStatus('success');
            
        } catch (error) {
            console.error('File processing failed:', error);
            setValidationStatus('error');
            // Show the user a more friendly message
            if (error.message.includes('No accounts or positions found')) {
                alert(error.message);
            } else {
                alert(`File processing failed: ${error.message}`);
            }
            setUploadedFile(null); // Reset file input
        } finally {
            clearInterval(progressInterval);
            setUploadProgress(100);
        }
    };
    
    // Quick Add Modal Integration
    const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
    const [quickAddModalProps, setQuickAddModalProps] = useState({});

    useEffect(() => {
        if (importMethod === 'quick-add' && importedPositionsData.length > 0) {
            setQuickAddModalProps({
                initialData: importedPositionsData,
                onClose: () => {
                    setIsQuickAddModalOpen(false);
                    // Reset modal state
                    setActiveTab('overview');
                    setImportMethod(null);
                    setImportedPositionsData([]);
                },
                isOpen: true
            });
            setIsQuickAddModalOpen(true);
        }
    }, [importMethod, importedPositionsData]);
    
    // Quick Liabilities Modal Integration
    const [isLiabilitiesModalOpen, setIsLiabilitiesModalOpen] = useState(false);
    const [liabilitiesModalProps, setLiabilitiesModalProps] = useState({});
    
    const handleAddLiabilities = useCallback(() => {
         setLiabilitiesModalProps({
            onClose: () => {
                setIsLiabilitiesModalOpen(false);
                setActiveTab('overview');
            },
            isOpen: true
         });
         setIsLiabilitiesModalOpen(true);
    }, []);
    
    const handleLiabilitiesImport = useCallback((data) => {
        setImportedLiabilitiesData(data);
        setImportedLiabilities(data.length);
        setActiveTab('success');
    }, []);
    
    // Render functions for different views
    const renderOverview = () => (
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-green-500" />
                Quick Add Your Financials
            </h3>
            <p className="text-sm text-center text-gray-600 max-w-lg">
                Choose a method below to add your financial data. We recommend using a template for larger imports.
            </p>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <button
                    onClick={() => {
                        setImportMethod('ui');
                        setActiveTab('accounts');
                    }}
                    className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Manually Add Accounts
                </button>
                <button
                    onClick={() => {
                        setIsQuickAddModalOpen(true);
                        setQuickAddModalProps({
                            onClose: () => {
                                setIsQuickAddModalOpen(false);
                                setActiveTab('overview');
                            },
                            isOpen: true
                        })
                    }}
                    className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                    <ListPlus className="w-5 h-5 mr-2" />
                    Manually Add Positions
                </button>
            </div>
            
            <div className="relative w-full text-center">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative inline-block px-3 bg-white text-sm text-gray-500 rounded-full">
                    OR
                </div>
            </div>
            
            <div className="w-full max-w-lg">
                <h4 className="text-lg font-semibold text-gray-800 text-center mb-4">Import with Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={() => downloadTemplate('accounts')}
                        disabled={isDownloading}
                        className="relative group flex items-center justify-between px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg text-left hover:border-blue-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center">
                            <FileSpreadsheet className="w-6 h-6 mr-3 text-blue-500 flex-shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Accounts Template</span>
                                <span className="text-xs text-gray-500">Create new accounts</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : (
                                <>
                                    <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </>
                            )}
                        </div>
                    </button>
                    <button 
                        onClick={() => downloadTemplate('positions')}
                        disabled={isDownloading}
                        className="relative group flex items-center justify-between px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg text-left hover:border-green-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center">
                            <Table className="w-6 h-6 mr-3 text-green-500 flex-shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-green-600">Positions Template</span>
                                <span className="text-xs text-gray-500">Bulk add assets/holdings</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : (
                                <>
                                    <Download className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                                </>
                            )}
                        </div>
                    </button>
                    <button 
                        onClick={handleAddLiabilities}
                        className="relative group flex items-center justify-between px-4 py-4 bg-gray-50 border border-gray-200 rounded-lg text-left hover:border-red-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    >
                        <div className="flex items-center">
                            <CreditCard className="w-6 h-6 mr-3 text-red-500 flex-shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 group-hover:text-red-600">Liabilities</span>
                                <span className="text-xs text-gray-500">Add debt (e.g., mortgage, loans)</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderUploadSection = () => (
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <button
                onClick={() => setActiveTab('overview')}
                className="self-start text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </button>
            <h3 className="text-xl font-semibold text-gray-800">
                Upload your {selectedTemplate} template
            </h3>
            <p className="text-sm text-center text-gray-600 max-w-lg">
                Save your completed Excel template and drag it here.
            </p>

            <div
                className={`w-full max-w-xl p-6 border-2 border-dashed rounded-xl transition-colors duration-200 ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center space-y-3 text-center">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => fileInputRef.current.click()}>
                            Click to upload
                        </span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">
                        Supported format: .xlsx
                    </p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                        className="hidden"
                        accept=".xlsx"
                    />
                </div>
            </div>

            {uploadedFile && (
                <div className="w-full max-w-xl p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <FileCheck className="w-5 h-5 mr-3 text-gray-400" />
                            <span className="text-sm text-gray-800 font-medium truncate">{uploadedFile.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">
                            {(uploadedFile.size / 1024).toFixed(2)} KB
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                validationStatus === 'success' ? 'bg-green-500' :
                                validationStatus === 'error' ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                    <div className="text-center text-xs">
                        {validationStatus === 'success' && (
                            <span className="text-green-600 flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                File uploaded and validated!
                            </span>
                        )}
                        {validationStatus === 'error' && (
                            <span className="text-red-600 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Processing failed. Please check the file.
                            </span>
                        )}
                        {!validationStatus && (
                            <span className="text-gray-500 flex items-center justify-center">
                                <Info className="w-4 h-4 mr-1" />
                                Processing...
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderTemplateSection = (type) => {
        const hasData = (type === 'accounts' && accounts.length > 0) || (type === 'liabilities' && importedLiabilitiesData.length > 0);
        
        return (
            <div className="flex flex-col items-center p-8 space-y-6">
                <div className="flex items-center justify-between w-full max-w-4xl">
                    <button
                        onClick={() => {
                             setActiveTab('overview');
                             setAccounts([]); // Clear accounts when going back
                             setImportedLiabilitiesData([]);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </button>
                    {type === 'accounts' && importMethod === 'ui' && (
                        <button
                            onClick={addNewAccount}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Account
                        </button>
                    )}
                </div>
                <div className="flex flex-col items-center">
                    <h3 className="text-xl font-semibold text-gray-800">
                        {type === 'accounts' ? 'Add Your Accounts' : 'Add Your Liabilities'}
                    </h3>
                    <p className="text-sm text-center text-gray-600 mt-2">
                        {type === 'accounts' ? 'Manually enter your accounts or import via our template.' : 'Manually enter your liabilities, such as mortgages or loans.'}
                    </p>
                </div>
                {type === 'accounts' && renderAccountsTable()}
                {type === 'liabilities' && <QuickLiabilityForm onImport={handleLiabilitiesImport} />}

                {type === 'accounts' && importMethod === 'ui' && accounts.length > 0 && (
                    <div className="w-full max-w-4xl text-center pt-4">
                        <button
                            onClick={handleSubmitAccounts}
                            disabled={isSubmitting || validAccounts.length === 0}
                            className={`w-full max-w-md px-6 py-3 rounded-lg text-white font-medium transition-colors duration-200 ${
                                isSubmitting || validAccounts.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                `Save ${validAccounts.length} Account${validAccounts.length === 1 ? '' : 's'}`
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderAccountsTable = () => (
        <div className="w-full max-w-4xl border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                #
                            </th>
                            <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                                onClick={() => handleSort('accountName')}
                            >
                                <div className="flex items-center">
                                    Account Name
                                    <ArrowUpDown className="w-3 h-3 ml-2" />
                                </div>
                            </th>
                            <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                                onClick={() => handleSort('institution')}
                            >
                                <div className="flex items-center">
                                    Institution
                                    <ArrowUpDown className="w-3 h-3 ml-2" />
                                </div>
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedAccounts.length > 0 ? (
                            sortedAccounts.map((account, index) => (
                                <tr key={account.tempId} className={`transition-all duration-300 ${account.isNew ? 'animate-fadeIn' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="text"
                                            value={account.accountName}
                                            onChange={(e) => updateAccount(account.tempId, 'accountName', e.target.value)}
                                            placeholder="My Investment Account"
                                            className="w-full text-sm font-medium text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                                            required
                                            ref={account.isNew ? newRowRef : null}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <SearchableDropdown
                                            options={popularBrokerages.map(b => ({ name: b.name, logo: b.logo }))}
                                            value={account.institution}
                                            onChange={(value) => updateAccount(account.tempId, 'institution', value)}
                                            placeholder="Select or type..."
                                            showLogos={true}
                                            onOpenChange={setShowAccountsDropdown}
                                            onEnterKey={addNewAccount}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <select
                                            value={account.accountCategory}
                                            onChange={(e) => updateAccount(account.tempId, 'accountCategory', e.target.value)}
                                            className="w-full text-sm font-medium text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                                            required
                                        >
                                            <option value="">Select category...</option>
                                            {ACCOUNT_CATEGORIES.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <select
                                            value={account.accountType}
                                            onChange={(e) => updateAccount(account.tempId, 'accountType', e.target.value)}
                                            className="w-full text-sm font-medium text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                                            required
                                            disabled={!account.accountCategory}
                                        >
                                            <option value="">Select type...</option>
                                            {account.accountCategory && ACCOUNT_TYPES_BY_CATEGORY[account.accountCategory]?.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                onClick={() => duplicateAccount(account)}
                                                title="Duplicate"
                                                className="text-gray-400 hover:text-blue-500 transition-colors duration-200"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteAccount(account.tempId)}
                                                title="Delete"
                                                className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500">
                                    No accounts added yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSuccessScreen = () => (
        <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h3 className="text-2xl font-semibold text-gray-800">
                Success!
            </h3>
            <p className="text-sm text-gray-600">
                You have successfully imported:
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-xl font-bold text-green-600">
                        <AnimatedNumber value={importedAccounts.length} />
                    </span>
                    <span className="text-sm text-gray-500">New Accounts</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-xl font-bold text-green-600">
                        <AnimatedNumber value={importedPositions} />
                    </span>
                    <span className="text-sm text-gray-500">New Positions</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-xl font-bold text-green-600">
                        <AnimatedNumber value={importedLiabilities} />
                    </span>
                    <span className="text-sm text-gray-500">New Liabilities</span>
                </div>
            </div>
            <button
                onClick={onClose}
                className="w-full max-w-md px-6 py-3 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
                Start Using Your Dashboard
            </button>
        </div>
    );


    return (
        <div 
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-75 transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        >
            <div 
                className={`relative bg-white rounded-xl shadow-2xl transition-transform duration-300 w-full max-w-5xl max-h-[90%] overflow-y-auto ${isOpen ? 'scale-100' : 'scale-95'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10 p-1 rounded-full bg-white/50 hover:bg-white"
                >
                    <X className="w-6 h-6" />
                </button>
                
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col items-center">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'accounts' && renderTemplateSection('accounts')}
                        {isLiabilitiesModalOpen && <AddLiabilitiesModal {...liabilitiesModalProps} />}
                        {isQuickAddModalOpen && <AddQuickPositionModal {...quickAddModalProps} />}
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