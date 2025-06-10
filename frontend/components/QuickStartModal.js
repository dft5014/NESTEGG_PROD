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
    Shield,
    Clock,
    Users,
    Building,
    Sparkles,
    FileCheck,
    Loader2,
    Plus,
    Trash2,
    Edit2,
    Save,
    ChevronUp,
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
    BarChart3,
    Eye,
    EyeOff,
    Copy,
    ArrowUpDown,
    Import,
    Search,
    Hash,
    Briefcase,
    Calculator,
    ListPlus,
    Table,
    Star,
    ArrowUp,
    ArrowDown,
    GripVertical,
    Layers
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';

// Account types with icons
const ACCOUNT_TYPES = [
    { value: 'brokerage', label: 'Brokerage', icon: TrendingUp, color: 'blue' },
    { value: 'retirement', label: 'Retirement', icon: PiggyBank, color: 'green' },
    { value: 'ira', label: 'IRA', icon: Shield, color: 'purple' },
    { value: 'roth_ira', label: 'Roth IRA', icon: Shield, color: 'indigo' },
    { value: '401k', label: '401(k)', icon: Briefcase, color: 'amber' },
    { value: 'hsa', label: 'HSA', icon: CreditCard, color: 'pink' },
    { value: 'cash', label: 'Cash', icon: DollarSign, color: 'emerald' },
    { value: 'crypto', label: 'Crypto', icon: Hash, color: 'orange' },
    { value: 'other', label: 'Other', icon: Wallet, color: 'gray' }
];

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
    const dropdownRef = useRef(null);
    
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const filteredOptions = useMemo(() => {
        if (!search) return options;
        return options.filter(opt => 
            opt.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);
    
    const selectedOption = options.find(opt => opt.name === value);
    
    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            >
                <div className="flex items-center">
                    {showLogos && selectedOption?.logo && (
                        <img 
                            src={selectedOption.logo} 
                            alt={selectedOption.name}
                            className="w-5 h-5 mr-2 rounded"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    )}
                    <span className={value ? 'text-gray-900' : 'text-gray-500'}>
                        {value || placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search institutions..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No institutions found
                            </div>
                        ) : (
                            filteredOptions.map((option, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.name);
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
                            ))
                        )}
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500 text-center">
                            Don't see your institution? Type any custom name.
                        </p>
                    </div>
                </div>
            )}
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
    const [editingId, setEditingId] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const newRowRef = useRef(null);

    // Initialize with one empty account
    useEffect(() => {
        if (activeTab === 'accounts' && importMethod === 'ui' && accounts.length === 0) {
            addNewAccount();
        }
    }, [activeTab, importMethod]);

    // Auto-focus new row
    useEffect(() => {
        if (newRowRef.current) {
            newRowRef.current.focus();
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
                setEditingId(null);
                setSortConfig({ key: null, direction: 'asc' });
            }, 300);
        }
    }, [isOpen]);

    const addNewAccount = () => {
        const newAccount = {
            id: Date.now() + Math.random(),
            accountName: '',
            institution: '',
            accountType: '',
            accountNumber: '',
            notes: '',
            isNew: true
        };
        setAccounts([...accounts, newAccount]);
        setEditingId(newAccount.id);
    };

    const updateAccount = (id, field, value) => {
        setAccounts(accounts.map(acc => 
            acc.id === id ? { ...acc, [field]: value, isNew: false } : acc
        ));
    };

    const deleteAccount = (id) => {
        setAccounts(accounts.filter(acc => acc.id !== id));
    };

    const duplicateAccount = (account) => {
        const newAccount = {
            ...account,
            id: Date.now() + Math.random(),
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
        acc.accountName && acc.institution && acc.accountType
    );

    const handleSubmitAccounts = async () => {
        if (validAccounts.length === 0) return;
        
        setIsSubmitting(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Success animation
            setActiveTab('success');
        } catch (error) {
            console.error('Error submitting accounts:', error);
            alert('Failed to create accounts. Please try again.');
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
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg shadow-blue-500/25">
                    <Sparkles className="w-8 h-8 text-white animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Quick Start Import</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Get your portfolio set up in minutes with our streamlined import process
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div 
                    className="group relative bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => setActiveTab('accounts')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <Building className="w-12 h-12 text-blue-600 group-hover:text-white mb-4 transition-colors" />
                        <h4 className="text-xl font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                            Import Accounts
                        </h4>
                        <p className="text-gray-700 group-hover:text-blue-100 text-sm transition-colors">
                            Start here to set up your investment accounts
                        </p>
                        <div className="mt-4 flex items-center text-blue-600 group-hover:text-white transition-colors">
                            <span className="text-sm font-medium">Get Started</span>
                            <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

                <div 
                    className="group relative bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => setActiveTab('positions')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <FileSpreadsheet className="w-12 h-12 text-purple-600 group-hover:text-white mb-4 transition-colors" />
                        <h4 className="text-xl font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                            Import Positions
                        </h4>
                        <p className="text-gray-700 group-hover:text-purple-100 text-sm transition-colors">
                            Add your investments after creating accounts
                        </p>
                        <div className="mt-4 flex items-center text-purple-600 group-hover:text-white transition-colors">
                            <span className="text-sm font-medium">Add Positions</span>
                            <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-amber-900">
                        <p className="font-medium mb-1">Important: Accounts must be created first</p>
                        <p className="text-amber-700">You need to import your accounts before you can add positions. The positions template will include your account names for easy selection.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center group">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">Secure & Private</p>
                </div>
                <div className="text-center group">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">Quick Setup</p>
                </div>
                <div className="text-center group">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600">Your Data Only</p>
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Accounts</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Choose how you'd like to add your accounts
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div 
                    className="group relative bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => setImportMethod('ui')}
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

    const renderUIAccountCreation = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full mb-4">
                    <ListPlus className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Quick Add Accounts</h3>
                <p className="text-gray-600">
                    Add your investment accounts quickly using our streamlined form
                </p>
            </div>

            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-indigo-600">
                            <AnimatedNumber value={accounts.length} />
                        </p>
                        <p className="text-sm text-gray-600">Total Accounts</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-600">
                            <AnimatedNumber value={validAccounts.length} />
                        </p>
                        <p className="text-sm text-gray-600">Valid Accounts</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-purple-600">
                            <AnimatedNumber value={new Set(accounts.map(a => a.institution).filter(Boolean)).size} />
                        </p>
                        <p className="text-sm text-gray-600">Institutions</p>
                    </div>
                </div>
            </div>

            {/* Table Header */}
            <div className="bg-gray-50 rounded-t-lg px-4 py-3 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700">
                    <div className="col-span-3 flex items-center">
                        <button 
                            onClick={() => handleSort('accountName')}
                            className="flex items-center hover:text-gray-900 transition-colors"
                        >
                            Account Name
                            <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                    <div className="col-span-3 flex items-center">
                        <button 
                            onClick={() => handleSort('institution')}
                            className="flex items-center hover:text-gray-900 transition-colors"
                        >
                            Institution
                            <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                    <div className="col-span-2 flex items-center">
                        <button 
                            onClick={() => handleSort('accountType')}
                            className="flex items-center hover:text-gray-900 transition-colors"
                        >
                            Type
                            <ArrowUpDown className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                    <div className="col-span-2">Account # (Last 4)</div>
                    <div className="col-span-1">Notes</div>
                    <div className="col-span-1 text-center">Actions</div>
                </div>
            </div>

            {/* Account Rows */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedAccounts.map((account, index) => {
                    const isValid = account.accountName && account.institution && account.accountType;
                    const selectedInstitution = popularBrokerages.find(b => b.name === account.institution);
                    const selectedType = ACCOUNT_TYPES.find(t => t.value === account.accountType);
                    
                    return (
                        <div 
                            key={account.id}
                            className={`group relative bg-white rounded-lg border transition-all duration-300 ${
                                account.isNew ? 'border-indigo-300 shadow-md shadow-indigo-100' : 
                                isValid ? 'border-green-300 hover:shadow-lg' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="grid grid-cols-12 gap-2 p-3 items-center">
                                <div className="col-span-3">
                                    <input
                                        ref={account.isNew && index === accounts.length - 1 ? newRowRef : null}
                                        type="text"
                                        value={account.accountName}
                                        onChange={(e) => updateAccount(account.id, 'accountName', e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && account.accountName && account.institution && account.accountType) {
                                                e.preventDefault();
                                                addNewAccount();
                                            }
                                        }}
                                        placeholder="Account name..."
                                        className="w-full px-3 py-2 bg-transparent border border-gray-200 rounded-md text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <SearchableDropdown
                                        options={popularBrokerages}
                                        value={account.institution}
                                        onChange={(value) => updateAccount(account.id, 'institution', value)}
                                        placeholder="Select institution..."
                                        showLogos={true}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <select
                                        value={account.accountType}
                                        onChange={(e) => updateAccount(account.id, 'accountType', e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    >
                                        <option value="">Select type...</option>
                                        {ACCOUNT_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="text"
                                        value={account.accountNumber}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            updateAccount(account.id, 'accountNumber', value);
                                        }}
                                        placeholder="1234"
                                        maxLength="4"
                                        className="w-full px-3 py-2 bg-transparent border border-gray-200 rounded-md text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <input
                                        type="text"
                                        value={account.notes}
                                        onChange={(e) => updateAccount(account.id, 'notes', e.target.value)}
                                        placeholder="Notes..."
                                        className="w-full px-3 py-2 bg-transparent border border-gray-200 rounded-md text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                </div>
                                <div className="col-span-1 flex items-center justify-center space-x-1">
                                    <button
                                        onClick={() => duplicateAccount(account)}
                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                        title="Duplicate"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => deleteAccount(account.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Visual status indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all duration-300 ${
                                account.isNew ? 'bg-indigo-500' :
                                isValid ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            
                            {/* Institution logo preview */}
                            {selectedInstitution?.logo && (
                                <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <img 
                                        src={selectedInstitution.logo} 
                                        alt={selectedInstitution.name}
                                        className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Account Button */}
            <div className="flex justify-center">
                <button
                    onClick={addNewAccount}
                    className="group flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                >
                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    Add Another Account
                </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600">
                    <span className="font-medium">Pro tip:</span> Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Enter</kbd> after filling a row to add another account
                </p>
            </div>

            {/* Submit Button */}
            {validAccounts.length > 0 && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={handleSubmitAccounts}
                        disabled={isSubmitting}
                        className="relative group px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
                                Creating Accounts...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2 inline group-hover:scale-110 transition-transform" />
                                Add {validAccounts.length} Account{validAccounts.length !== 1 ? 's' : ''}
                            </>
                        )}
                        
                        {/* Animated background effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg opacity-0 group-hover:opacity-30 blur-xl transition-all duration-300" />
                    </button>
                </div>
            )}
        </div>
    );

    const renderSuccessScreen = () => (
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
                    Successfully created <span className="font-semibold text-green-600">{validAccounts.length}</span> account{validAccounts.length !== 1 ? 's' : ''}
                </p>
            </div>
            
            <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto">
                <h4 className="font-semibold text-gray-900 mb-3">What's Next?</h4>
                <div className="space-y-3 text-left">
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
                </div>
            </div>
            
            <div className="flex justify-center space-x-4">
                <button
                    onClick={() => {
                        setActiveTab('positions');
                        setImportMethod(null);
                        setAccounts([]);
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
                >
                    Import Positions
                </button>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                    Done
                </button>
            </div>
        </div>
    );

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
                        {isAccounts ? 'Import Accounts' : 'Import Positions'}
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
                                Downloading...
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
                        ? 'border-blue-500 bg-blue-50' 
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
                        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                            {isDragging ? 'Drop your file here' : 'Drag and drop your Excel file'}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">or</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
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
                                    <span className="text-sm">Validating file...</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        
                        {validationStatus === 'valid' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-center text-green-600">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    <span className="font-medium">File validated successfully!</span>
                                </div>
                                <button className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200">
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
                            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
                <div 
                    className="fixed inset-0 transition-opacity duration-300 ease-out"
                    onClick={onClose}
                >
                    <div className="absolute inset-0 bg-gray-900 opacity-75"></div>
                </div>

                <div className="relative inline-block w-full max-w-5xl bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ease-out">
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-8">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'accounts' && !importMethod && renderAccountImportChoice()}
                        {activeTab === 'accounts' && importMethod === 'ui' && renderUIAccountCreation()}
                        {activeTab === 'accounts' && importMethod === 'excel' && renderTemplateSection('accounts')}
                        {activeTab === 'positions' && renderTemplateSection('positions')}
                        {activeTab === 'upload' && renderUploadSection()}
                        {activeTab === 'success' && renderSuccessScreen()}
                    </div>

                    {activeTab !== 'overview' && activeTab !== 'success' && (
                        <div className="border-t border-gray-200 px-8 py-4">
                            <button
                                onClick={() => {
                                    if (activeTab === 'upload') {
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
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back
                            </button>
                        </div>
                    )}
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
                    <span className="text-sm text-gray-200 group-hover:text-white font-medium">Quick Start</span>
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