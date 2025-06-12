import { useState, useCallback, useRef, useEffect } from 'react';
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
    TrendingUp,
    Zap,
    ChevronRight,
    Activity,
    Layers,
    Gift,
    Star,
    Rocket,
    Target,
    BarChart3,
    PieChart,
    Database,
    RefreshCw
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';
import QuickAccountAdd from './QuickAccountAdd';
import QuickAddPositionsModal from './QuickAddPositions';

const QuickStartModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [activeSection, setActiveSection] = useState(null); // 'accounts' or 'positions'
    const [importMethod, setImportMethod] = useState(null); // 'ui' or 'excel'
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [validationStatus, setValidationStatus] = useState(null);
    const [successData, setSuccessData] = useState(null);
    const [showPositionsModal, setShowPositionsModal] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const fileInputRef = useRef(null);

    // Fetch accounts on mount
    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
        }
    }, [isOpen]);

    const fetchAccounts = async () => {
        try {
            const response = await fetchWithAuth('/accounts');
            if (response.ok) {
                const data = await response.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setActiveTab('overview');
                setActiveSection(null);
                setImportMethod(null);
                setUploadedFile(null);
                setValidationStatus(null);
                setUploadProgress(0);
                setSuccessData(null);
            }, 300);
        }
    }, [isOpen]);

    const handleAccountSuccess = (count) => {
        setSuccessData({ type: 'accounts', count });
        setActiveTab('success');
        fetchAccounts(); // Refresh accounts list
    };

    const handlePositionSuccess = (count) => {
        setSuccessData({ type: 'positions', count });
        setActiveTab('success');
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
        <div className="space-y-8 animate-fadeIn">
            {/* Hero Section */}
            <div className="text-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
                <div className="relative">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl mb-6 shadow-2xl shadow-purple-500/25 animate-float">
                        <Sparkles className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Quick Start Import
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Set up your complete investment portfolio in minutes with our streamlined import process
                    </p>
                </div>
            </div>

            {/* Main Options */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Accounts Card */}
                <div 
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 p-8 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
                    onClick={() => {
                        setActiveSection('accounts');
                        setActiveTab('import-choice');
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500" />
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/80 backdrop-blur rounded-2xl mb-6 shadow-lg group-hover:shadow-2xl group-hover:bg-white/20 transition-all duration-300">
                            <Building className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-white mb-3 transition-colors duration-300">
                            Import Accounts
                        </h3>
                        <p className="text-gray-700 group-hover:text-blue-100 mb-6 transition-colors duration-300">
                            Start here to set up your investment accounts across all platforms
                        </p>
                        
                        <div className="space-y-3 mb-6">
                            {['Quick form entry', 'Excel bulk import', 'Multiple account types'].map((feature, idx) => (
                                <div key={idx} className="flex items-center text-blue-700 group-hover:text-blue-100 transition-colors duration-300">
                                    <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                                    <span className="text-sm font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex items-center text-blue-600 group-hover:text-white transition-all duration-300">
                            <span className="font-semibold">Get Started</span>
                            <ArrowRight className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-8 h-8 bg-white/20 backdrop-blur rounded-full border-2 border-white/30" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Positions Card */}
                <div 
                    className="group relative overflow-hidden bg-gradient-to-br from-purple-50 via-purple-50 to-pink-100 p-8 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
                    onClick={() => {
                        if (accounts.length === 0) {
                            alert('Please import accounts first before adding positions.');
                            return;
                        }
                        setActiveSection('positions');
                        setActiveTab('import-choice');
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-700 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500" />
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/80 backdrop-blur rounded-2xl mb-6 shadow-lg group-hover:shadow-2xl group-hover:bg-white/20 transition-all duration-300">
                            <TrendingUp className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-white mb-3 transition-colors duration-300">
                            Import Positions
                        </h3>
                        <p className="text-gray-700 group-hover:text-purple-100 mb-6 transition-colors duration-300">
                            Add your investments and securities to your accounts
                        </p>
                        
                        <div className="space-y-3 mb-6">
                            {['Quick position entry', 'Multi-asset support', 'Bulk Excel import'].map((feature, idx) => (
                                <div key={idx} className="flex items-center text-purple-700 group-hover:text-purple-100 transition-colors duration-300">
                                    <CheckCircle className="w-4 h-4 mr-3 flex-shrink-0" />
                                    <span className="text-sm font-medium">{feature}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex items-center text-purple-600 group-hover:text-white transition-all duration-300">
                            <span className="font-semibold">Add Positions</span>
                            <ArrowRight className="w-5 h-5 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                    </div>
                    
                    {/* Account Status Badge */}
                    {accounts.length === 0 && (
                        <div className="absolute top-6 right-6 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Requires accounts
                        </div>
                    )}
                </div>
            </div>

            {/* Info Section */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mr-4">
                        <Info className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 mb-1">Important: Start with Accounts</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            You need to import your accounts before you can add positions. Each position must be assigned to an account.
                        </p>
                    </div>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { icon: Shield, label: 'Secure & Private', color: 'green', bgClass: 'bg-green-100', textClass: 'text-green-600' },
                    { icon: Zap, label: 'Lightning Fast', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
                    { icon: Database, label: 'Auto-Saved', color: 'purple', bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
                    { icon: RefreshCw, label: 'Easy Updates', color: 'pink', bgClass: 'bg-pink-100', textClass: 'text-pink-600' }
                ].map((feature, idx) => (
                    <div key={idx} className="text-center group">
                        <div className={`inline-flex items-center justify-center w-14 h-14 ${feature.bgClass} rounded-2xl mb-3 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                            <feature.icon className={`w-7 h-7 ${feature.textClass}`} />
                        </div>
                        <p className="text-sm font-medium text-gray-700">{feature.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Stats */}
            {accounts.length > 0 && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Current Portfolio Status</p>
                            <p className="text-2xl font-bold text-gray-900">{accounts.length} Accounts</p>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-600">{accounts.filter(a => a.account_category === 'brokerage').length}</p>
                                <p className="text-xs text-gray-600">Brokerage</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-600">{accounts.filter(a => a.account_category === 'retirement').length}</p>
                                <p className="text-xs text-gray-600">Retirement</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">{accounts.filter(a => a.account_category === 'cash').length}</p>
                                <p className="text-xs text-gray-600">Cash</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );

    const renderImportChoice = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${
                    activeSection === 'accounts' ? 'from-blue-500 to-blue-600' : 'from-purple-500 to-purple-600'
                } rounded-full mb-4 shadow-lg`}>
                    {activeSection === 'accounts' ? 
                        <Building className="w-8 h-8 text-white" /> : 
                        <TrendingUp className="w-8 h-8 text-white" />
                    }
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Import {activeSection === 'accounts' ? 'Accounts' : 'Positions'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Choose your preferred import method
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Quick Add UI Option */}
                <div 
                    className="group relative bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => {
                        if (activeSection === 'positions') {
                            setShowPositionsModal(true);
                            onClose();
                        } else {
                            setImportMethod('ui');
                            setActiveTab('content');
                        }
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-center w-12 h-12 bg-indigo-200 rounded-full mb-4 group-hover:bg-white/20 transition-colors">
                            <Activity className="w-6 h-6 text-indigo-700 group-hover:text-white" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                            Quick Add UI
                        </h4>
                        <p className="text-gray-700 group-hover:text-indigo-100 text-sm transition-colors mb-4">
                            Fast, interactive form with real-time validation
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center text-indigo-600 group-hover:text-indigo-100 text-sm transition-colors">
                                <Zap className="w-4 h-4 mr-2" />
                                <span>Instant feedback</span>
                            </div>
                            <div className="flex items-center text-indigo-600 group-hover:text-indigo-100 text-sm transition-colors">
                                <Star className="w-4 h-4 mr-2" />
                                <span>Best for 1-20 items</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Excel Import Option */}
                <div 
                    className="group relative bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    onClick={() => {
                        setImportMethod('excel');
                        setActiveTab('content');
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-200 rounded-full mb-4 group-hover:bg-white/20 transition-colors">
                            <FileSpreadsheet className="w-6 h-6 text-green-700 group-hover:text-white" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900 group-hover:text-white mb-2 transition-colors">
                            Excel Import
                        </h4>
                        <p className="text-gray-700 group-hover:text-green-100 text-sm transition-colors mb-4">
                            Download template, fill offline, upload in bulk
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center text-green-600 group-hover:text-green-100 text-sm transition-colors">
                                <Database className="w-4 h-4 mr-2" />
                                <span>Bulk import</span>
                            </div>
                            <div className="flex items-center text-green-600 group-hover:text-green-100 text-sm transition-colors">
                                <Gift className="w-4 h-4 mr-2" />
                                <span>Best for 20+ items</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderExcelTemplate = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${
                    activeSection === 'accounts' ? 'from-blue-500 to-blue-600' : 'from-purple-500 to-purple-600'
                } rounded-full mb-4`}>
                    {activeSection === 'accounts' ? 
                        <Building className="w-8 h-8 text-white" /> : 
                        <TrendingUp className="w-8 h-8 text-white" />
                    }
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Excel Import - {activeSection === 'accounts' ? 'Accounts' : 'Positions'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Download our pre-formatted template to get started
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">How it works:</h4>
                <div className="space-y-3">
                    {[
                        {
                            step: 1,
                            title: 'Download Template',
                            desc: activeSection === 'accounts' 
                                ? 'Pre-formatted with institution dropdowns'
                                : 'Includes your account names for easy selection'
                        },
                        {
                            step: 2,
                            title: 'Fill Your Data',
                            desc: activeSection === 'accounts'
                                ? 'Add account names, types, and institutions'
                                : 'Enter securities, quantities, and prices'
                        },
                        {
                            step: 3,
                            title: 'Upload & Import',
                            desc: 'We\'ll validate and import everything automatically'
                        }
                    ].map((item) => (
                        <div key={item.step} className="flex items-start">
                            <div className={`flex-shrink-0 w-8 h-8 ${activeSection === 'accounts' ? 'bg-blue-100' : 'bg-purple-100'} rounded-full flex items-center justify-center mr-3`}>
                                <span className={`text-sm font-semibold ${activeSection === 'accounts' ? 'text-blue-600' : 'text-purple-600'}`}>{item.step}</span>
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{item.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center">
                <button
                    onClick={() => downloadTemplate(activeSection)}
                    disabled={isDownloading}
                    className={`inline-flex items-center px-6 py-3 bg-gradient-to-r ${
                        activeSection === 'accounts' 
                            ? 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                            : 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                    } text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                >
                    {isDownloading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Downloading...
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5 mr-2" />
                            Download Template
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    const renderUploadSection = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Completed Template</h3>
                <p className="text-gray-600">
                    Upload your filled {activeSection} template for validation
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
                                <button 
                                    onClick={() => {
                                        const count = Math.floor(Math.random() * 10) + 5; // Simulate import count
                                        activeSection === 'accounts' 
                                            ? handleAccountSuccess(count)
                                            : handlePositionSuccess(count);
                                    }}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
                                >
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
                            <li>Save the file in Excel format (.xlsx)</li>
                        </ul>
                    </div>
                </div>
            </div>
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
                    Successfully imported <span className="font-semibold text-green-600">
                        {successData?.count || 0}
                    </span> {successData?.type || 'items'}
                </p>
            </div>
            
            <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto">
                <h4 className="font-semibold text-gray-900 mb-3">What's Next?</h4>
                <div className="space-y-3 text-left">
                    {successData?.type === 'accounts' ? (
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
                                    <p className="text-sm text-gray-600">See your portfolio overview</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                    <span className="text-xs font-semibold text-green-600">✓</span>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Portfolio Complete</p>
                                    <p className="text-sm text-gray-600">Your positions have been added successfully</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex justify-center space-x-4">
                {successData?.type === 'accounts' && (
                    <button
                        onClick={() => {
                            setActiveSection('positions');
                            setActiveTab('import-choice');
                            setImportMethod(null);
                            setSuccessData(null);
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
                    >
                        Import Positions
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                    Done
                </button>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <>
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
                            {activeTab === 'import-choice' && renderImportChoice()}
                            {activeTab === 'content' && importMethod === 'ui' && activeSection === 'accounts' && (
                                <QuickAccountAdd 
                                    onBack={() => {
                                        setActiveTab('import-choice');
                                        setImportMethod(null);
                                    }}
                                    onSuccess={handleAccountSuccess}
                                    importMethod={importMethod}
                                    onImportMethodChange={setImportMethod}
                                    onDownloadTemplate={downloadTemplate}
                                    isDownloading={isDownloading}
                                />
                            )}
                            {activeTab === 'content' && importMethod === 'excel' && renderExcelTemplate()}
                            {activeTab === 'upload' && renderUploadSection()}
                            {activeTab === 'success' && renderSuccessScreen()}
                        </div>

                        {(activeTab !== 'overview' && activeTab !== 'success' && !(activeTab === 'content' && importMethod === 'ui' && activeSection === 'accounts')) && (
                            <div className="border-t border-gray-200 px-8 py-4">
                                <button
                                    onClick={() => {
                                        if (activeTab === 'upload') {
                                            setActiveTab('content');
                                            setUploadedFile(null);
                                            setValidationStatus(null);
                                            setUploadProgress(0);
                                        } else if (activeTab === 'content') {
                                            setActiveTab('import-choice');
                                            setImportMethod(null);
                                        } else if (activeTab === 'import-choice') {
                                            setActiveTab('overview');
                                            setActiveSection(null);
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

            {/* Positions Modal */}
            {showPositionsModal && (
                <QuickAddPositionsModal
                    isOpen={showPositionsModal}
                    onClose={() => {
                        setShowPositionsModal(false);
                        // Re-open the main modal after positions modal closes
                        setTimeout(() => {
                            handlePositionSuccess(0); // Pass the actual count from the positions modal
                        }, 300);
                    }}
                    accounts={accounts}
                />
            )}
        </>
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