import { useState, useCallback, useRef, useEffect } from 'react';
import { 
    X, 
    CreditCard, 
    Home, 
    Car, 
    GraduationCap,
    DollarSign,
    Building,
    FileText,
    Plus,
    Trash2,
    Check,
    AlertCircle,
    Loader2,
    Hash,
    Percent,
    CheckCircle,
    ChevronDown,
    Search,
    Sparkles,
    TrendingUp,
    PlusCircle,
    Copy,
    Info
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';

// Liability types matching database
const LIABILITY_TYPES = [
    { value: 'credit_card', label: 'Credit Card', icon: CreditCard, color: 'blue' },
    { value: 'mortgage', label: 'Mortgage', icon: Home, color: 'green' },
    { value: 'auto_loan', label: 'Auto Loan', icon: Car, color: 'purple' },
    { value: 'personal_loan', label: 'Personal Loan', icon: DollarSign, color: 'orange' },
    { value: 'student_loan', label: 'Student Loan', icon: GraduationCap, color: 'indigo' },
    { value: 'home_equity', label: 'Home Equity', icon: Building, color: 'teal' },
    { value: 'other', label: 'Other', icon: FileText, color: 'gray' }
];

// Common credit card issuers
const CREDIT_CARD_ISSUERS = [
    'American Express', 'Bank of America', 'Capital One', 'Chase', 
    'Citi', 'Discover', 'Wells Fargo', 'US Bank', 'Barclays', 
    'Synchrony', 'Navy Federal', 'PNC', 'TD Bank', 'USAA'
];

// Common lenders
const COMMON_LENDERS = [
    'Bank of America', 'Wells Fargo', 'Chase', 'Citi', 'US Bank',
    'PNC', 'TD Bank', 'Capital One', 'Ally Bank', 'SoFi', 
    'Rocket Mortgage', 'Quicken Loans', 'LendingClub', 'Prosper',
    'Navient', 'Sallie Mae', 'Great Lakes', 'FedLoan', 'Nelnet'
];

export const AddLiabilitiesModal = ({ isOpen, onClose, onLiabilitiesSaved }) => {
    const [liabilities, setLiabilities] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [institutionSearch, setInstitutionSearch] = useState({});
    const newRowRef = useRef(null);

    // Initialize with one empty liability
    useEffect(() => {
        if (isOpen && liabilities.length === 0) {
            addNewLiability();
        }
    }, [isOpen]);

    // Auto-focus new row
    useEffect(() => {
        if (newRowRef.current) {
            newRowRef.current.focus();
            newRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [liabilities.length]);

    const addNewLiability = () => {
        const newLiability = {
            tempId: Date.now() + Math.random(),
            name: '',
            liability_type: '',
            current_balance: '',
            original_amount: '',
            credit_limit: '',
            interest_rate: '',
            institution_name: '',
            isNew: true
        };
        setLiabilities([...liabilities, newLiability]);
    };

    const updateLiability = (tempId, field, value) => {
        setLiabilities(liabilities.map(liability => {
            if (liability.tempId === tempId) {
                const updated = { ...liability, [field]: value, isNew: false };
                
                // Auto-populate credit limit for credit cards
                if (field === 'liability_type' && value === 'credit_card' && !updated.credit_limit) {
                    updated.showCreditLimit = true;
                } else if (field === 'liability_type' && value !== 'credit_card') {
                    updated.showCreditLimit = false;
                    updated.credit_limit = '';
                }
                
                return updated;
            }
            return liability;
        }));
    };

    const deleteLiability = (tempId) => {
        setLiabilities(liabilities.filter(l => l.tempId !== tempId));
    };

    const duplicateLiability = (liability) => {
        const newLiability = {
            ...liability,
            tempId: Date.now() + Math.random(),
            name: `${liability.name} (Copy)`,
            isNew: true
        };
        setLiabilities([...liabilities, newLiability]);
    };

    const validLiabilities = liabilities.filter(l => 
        l.name && l.liability_type && l.current_balance && l.institution_name
    );

    const handleSubmit = async () => {
        if (validLiabilities.length === 0) return;
        
        setIsSubmitting(true);
        const savedLiabilities = [];
        
        try {
            for (const liability of validLiabilities) {
                const payload = {
                    name: liability.name,
                    liability_type: liability.liability_type,
                    current_balance: parseFloat(liability.current_balance),
                    institution_name: liability.institution_name
                };
                
                // Add optional fields if they have values
                if (liability.original_amount) {
                    payload.original_amount = parseFloat(liability.original_amount);
                }
                if (liability.credit_limit) {
                    payload.credit_limit = parseFloat(liability.credit_limit);
                }
                if (liability.interest_rate) {
                    payload.interest_rate = parseFloat(liability.interest_rate);
                }
                
                const response = await fetchWithAuth('/liabilities', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to create liability: ${liability.name}`);
                }
                
                const savedLiability = await response.json();
                savedLiabilities.push(savedLiability);
            }
            
            setShowSuccessAnimation(true);
            setTimeout(() => {
                onLiabilitiesSaved(savedLiabilities.length, savedLiabilities);
            }, 1500);
            
        } catch (error) {
            console.error('Error saving liabilities:', error);
            alert(`Failed to save liabilities: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getInstitutionSuggestions = (type) => {
        if (type === 'credit_card') return CREDIT_CARD_ISSUERS;
        return COMMON_LENDERS;
    };

    const formatCurrency = (value) => {
        const num = value.replace(/[^0-9.]/g, '');
        return num;
    };

    const formatPercent = (value) => {
        const num = value.replace(/[^0-9.]/g, '');
        return num;
    };

    if (!isOpen) return null;

    return (
        <div className="relative">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-3 shadow-lg">
                    <CreditCard className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Add Liabilities</h3>
                <p className="text-gray-600">Track your debts and obligations</p>
            </div>

            {/* Stats Bar */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-3 mb-4 border border-red-100">
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                        <p className="text-xl font-bold text-red-600">{liabilities.length}</p>
                        <p className="text-xs text-gray-600">Total</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-green-600">{validLiabilities.length}</p>
                        <p className="text-xs text-gray-600">Ready</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">
                            ${validLiabilities.reduce((sum, l) => sum + (parseFloat(l.current_balance) || 0), 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">Total Debt</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-purple-600">
                            {(validLiabilities.reduce((sum, l) => sum + (parseFloat(l.interest_rate) || 0), 0) / validLiabilities.length || 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-600">Avg Rate</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={addNewLiability}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Another Liability
                </button>
                
                {validLiabilities.length > 0 && (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Save {validLiabilities.length} Liabilities
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Liabilities Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b">
                    <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-700 uppercase">
                        <div className="col-span-3">Name</div>
                        <div className="col-span-2">Type</div>
                        <div className="col-span-2">Balance</div>
                        <div className="col-span-1">Rate</div>
                        <div className="col-span-3">Institution</div>
                        <div className="col-span-1 text-center">Actions</div>
                    </div>
                </div>

                <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                    {liabilities.length === 0 ? (
                        <div className="text-center py-12">
                            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Click "Add Another Liability" to get started</p>
                        </div>
                    ) : (
                        liabilities.map((liability, index) => {
                            const type = LIABILITY_TYPES.find(t => t.value === liability.liability_type);
                            const TypeIcon = type?.icon || FileText;
                            const isValid = liability.name && liability.liability_type && 
                                           liability.current_balance && liability.institution_name;
                            
                            return (
                                <div 
                                    key={liability.tempId}
                                    className={`group relative bg-white rounded-lg border-2 p-3 transition-all ${
                                        liability.isNew ? 'border-red-400 shadow-md' : 
                                        isValid ? 'border-green-300' : 'border-gray-200'
                                    }`}
                                >
                                    <div className="grid grid-cols-12 gap-3 items-center">
                                        {/* Name */}
                                        <div className="col-span-3">
                                            <input
                                                ref={liability.isNew && index === liabilities.length - 1 ? newRowRef : null}
                                                type="text"
                                                value={liability.name}
                                                onChange={(e) => updateLiability(liability.tempId, 'name', e.target.value)}
                                                placeholder="Visa Card, Home Mortgage..."
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            />
                                        </div>

                                        {/* Type */}
                                        <div className="col-span-2">
                                            <select
                                                value={liability.liability_type}
                                                onChange={(e) => updateLiability(liability.tempId, 'liability_type', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            >
                                                <option value="">Select...</option>
                                                {LIABILITY_TYPES.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Current Balance */}
                                        <div className="col-span-2">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                <input
                                                    type="text"
                                                    value={liability.current_balance}
                                                    onChange={(e) => updateLiability(liability.tempId, 'current_balance', formatCurrency(e.target.value))}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                                />
                                            </div>
                                        </div>

                                        {/* Interest Rate */}
                                        <div className="col-span-1">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={liability.interest_rate}
                                                    onChange={(e) => updateLiability(liability.tempId, 'interest_rate', formatPercent(e.target.value))}
                                                    placeholder="0.0"
                                                    className="w-full pr-8 pl-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                            </div>
                                        </div>

                                        {/* Institution */}
                                        <div className="col-span-3">
                                            <input
                                                type="text"
                                                value={liability.institution_name}
                                                onChange={(e) => updateLiability(liability.tempId, 'institution_name', e.target.value)}
                                                placeholder={liability.liability_type === 'credit_card' ? 'Chase, Amex...' : 'Bank, Lender...'}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                                list={`institutions-${liability.tempId}`}
                                            />
                                            <datalist id={`institutions-${liability.tempId}`}>
                                                {getInstitutionSuggestions(liability.liability_type).map(inst => (
                                                    <option key={inst} value={inst} />
                                                ))}
                                            </datalist>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 flex items-center justify-center space-x-1">
                                            <button
                                                onClick={() => duplicateLiability(liability)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteLiability(liability.tempId)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Additional fields for specific types */}
                                    {(liability.liability_type === 'credit_card' || liability.showCreditLimit) && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-600">Credit Limit</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                        <input
                                                            type="text"
                                                            value={liability.credit_limit}
                                                            onChange={(e) => updateLiability(liability.tempId, 'credit_limit', formatCurrency(e.target.value))}
                                                            placeholder="0.00"
                                                            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-600">Utilization</label>
                                                    <div className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-sm">
                                                        {liability.current_balance && liability.credit_limit
                                                            ? `${((parseFloat(liability.current_balance) / parseFloat(liability.credit_limit)) * 100).toFixed(1)}%`
                                                            : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {['mortgage', 'auto_loan', 'personal_loan', 'student_loan', 'home_equity'].includes(liability.liability_type) && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-600">Original Amount</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                                        <input
                                                            type="text"
                                                            value={liability.original_amount}
                                                            onChange={(e) => updateLiability(liability.tempId, 'original_amount', formatCurrency(e.target.value))}
                                                            placeholder="0.00"
                                                            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-600">Paid Off</label>
                                                    <div className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-sm">
                                                        {liability.current_balance && liability.original_amount
                                                            ? `${(((parseFloat(liability.original_amount) - parseFloat(liability.current_balance)) / parseFloat(liability.original_amount)) * 100).toFixed(1)}%`
                                                            : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Type icon */}
                                    {type && (
                                        <div className={`absolute -left-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-${type.color}-100 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                                            <TypeIcon className={`w-4 h-4 text-${type.color}-600`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Tips */}
            <div className="mt-4 bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-start">
                    <Info className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-xs text-red-900">
                        <p className="font-medium mb-1">Quick tips:</p>
                        <ul className="space-y-0.5 text-red-700">
                            <li>• Include all debts for accurate net worth</li>
                            <li>• Update balances monthly for best tracking</li>
                            <li>• Higher interest debts should be priority</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Success Animation Overlay */}
            {showSuccessAnimation && (
                <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 rounded-xl">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full mb-4 animate-bounce">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Liabilities Added!</h3>
                        <p className="text-gray-600 mt-1">Tracking your complete financial picture</p>
                    </div>
                </div>
            )}
        </div>
    );
};