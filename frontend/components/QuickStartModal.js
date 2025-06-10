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
    Shield,
    Clock,
    Users,
    Building,
    Sparkles,
    FileCheck,
    Loader2
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';

const QuickStartModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [validationStatus, setValidationStatus] = useState(null);
    const fileInputRef = useRef(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setActiveTab('overview');
                setSelectedTemplate(null);
                setUploadedFile(null);
                setValidationStatus(null);
                setUploadProgress(0);
            }, 300);
        }
    }, [isOpen]);

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
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Quick Start Import</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                    Get your portfolio set up in minutes with our Excel import feature
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
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                        <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">Secure & Private</p>
                </div>
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                        <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">Quick Setup</p>
                </div>
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                        <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600">Your Data Only</p>
                </div>
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

                <div className="relative inline-block w-full max-w-3xl bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ease-out">
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-8">
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'accounts' && renderTemplateSection('accounts')}
                        {activeTab === 'positions' && renderTemplateSection('positions')}
                        {activeTab === 'upload' && renderUploadSection()}
                    </div>

                    {activeTab !== 'overview' && (
                        <div className="border-t border-gray-200 px-8 py-4">
                            <button
                                onClick={() => {
                                    if (activeTab === 'upload') {
                                        setActiveTab(selectedTemplate === 'accounts' ? 'accounts' : 'positions');
                                        setUploadedFile(null);
                                        setValidationStatus(null);
                                        setUploadProgress(0);
                                    } else {
                                        setActiveTab('overview');
                                    }
                                }}
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                ← Back
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