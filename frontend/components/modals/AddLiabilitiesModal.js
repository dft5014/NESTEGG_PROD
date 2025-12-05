import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
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
import { addLiability } from '@/utils/apimethods/positionMethods';

// Add this SearchableDropdown component (same as in QuickStartModal)
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
    
    const filteredOptions = React.useMemo(() => {
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 hover:border-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 pr-10"
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
                    className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center hover:bg-gray-700/60 rounded-r-lg transition-colors"
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
                        className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl animate-fadeIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="max-h-64 overflow-y-auto">
                            {filteredOptions.length === 0 ? (
                                <div className="p-4 text-center">
                                    <p className="text-sm text-gray-400 mb-2">No matching institutions found</p>
                                    {inputValue && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onChange(inputValue);
                                                setIsOpen(false);
                                                if (onOpenChange) onOpenChange(false);
                                            }}
                                            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
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
                                            className="w-full px-3 py-2 flex items-center bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border-b border-gray-700"
                                        >
                                            <Plus className="w-4 h-4 mr-3 text-emerald-400" />
                                            <span className="text-sm text-emerald-300 font-medium">Use "{inputValue}" (custom)</span>
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
                                            className={`w-full px-3 py-2 flex items-center hover:bg-gray-700/60 transition-colors ${
                                                value === option.name ? 'bg-emerald-500/10' : ''
                                            } ${highlightedIndex === idx ? 'bg-gray-700' : ''}`}
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
                                            <span className="text-sm text-gray-200">{option.name}</span>
                                            {value === option.name && (
                                                <Check className="w-4 h-4 text-emerald-400 ml-auto" />
                                            )}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                        <div className="p-2 border-t border-gray-700 bg-gray-900/70">
                            <p className="text-xs text-gray-400 text-center">
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

export const AddLiabilitiesModal = ({ isOpen, onClose, onLiabilitiesSaved }) => {
    const [liabilities, setLiabilities] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
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
                
                // Use the addLiability method instead of fetchWithAuth
                const savedLiability = await addLiability(payload);
                // Ensure we're pushing the complete liability data with all fields
                savedLiabilities.push({
                    ...payload,
                    ...savedLiability
                });
            }
            
            setShowSuccessAnimation(true);
                setTimeout(() => {
                    if (onLiabilitiesSaved && savedLiabilities.length > 0) {
                        onLiabilitiesSaved(savedLiabilities.length, savedLiabilities);
                    }
                }, 1500);
            
        } catch (error) {
            console.error('Error saving liabilities:', error);
            alert(`Failed to save liabilities: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
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
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl mb-3 shadow-lg">
                    <CreditCard className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Add Liabilities</h3>
                <p className="text-gray-400">Track your debts and obligations</p>
            </div>

            {/* Stats Bar */}
            <div className="bg-gray-900/70 rounded-xl p-3 mb-4 border border-gray-800">
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                        <p className="text-xl font-bold text-rose-400">{liabilities.length}</p>
                        <p className="text-xs text-gray-400">Total</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-emerald-400">{validLiabilities.length}</p>
                        <p className="text-xs text-gray-400">Ready</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-amber-400">
                            ${validLiabilities.reduce((sum, l) => sum + (parseFloat(l.current_balance) || 0), 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">Total Debt</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-purple-400">
                            {(validLiabilities.reduce((sum, l) => sum + (parseFloat(l.interest_rate) || 0), 0) / validLiabilities.length || 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-400">Avg Rate</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={addNewLiability}
                    className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Another Liability
                </button>

                {validLiabilities.length > 0 && (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50"
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
            <div className="bg-gray-900/70 rounded-xl shadow-lg border border-gray-800 overflow-hidden">
                <div className="bg-gray-950 px-6 py-3 border-b border-gray-800">
                    <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-400 uppercase">
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
                            <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">Click "Add Another Liability" to get started</p>
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
                                    className={`group relative bg-gray-800 rounded-lg border-2 p-3 transition-all ${
                                        liability.isNew ? 'border-rose-500 shadow-md' :
                                        isValid ? 'border-emerald-500/50' : 'border-gray-700'
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
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && isValid) {
                                                        e.preventDefault();
                                                        setOpenDropdownId(null);
                                                        addNewLiability();
                                                    }
                                                }}
                                                placeholder="Visa Card, Home Mortgage..."
                                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:bg-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>

                                        {/* Type */}
                                        <div className="col-span-2">
                                            <select
                                                value={liability.liability_type}
                                                onChange={(e) => updateLiability(liability.tempId, 'liability_type', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white focus:bg-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                                <input
                                                    type="text"
                                                    value={liability.current_balance}
                                                    onChange={(e) => updateLiability(liability.tempId, 'current_balance', formatCurrency(e.target.value))}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:bg-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                                                    className="w-full pr-8 pl-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:bg-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                            </div>
                                        </div>

                                        {/* Institution - Updated to use SearchableDropdown */}
                                        <div className="col-span-3 relative">
                                            <SearchableDropdown
                                                options={popularBrokerages}
                                                value={liability.institution_name}
                                                onChange={(value) => updateLiability(liability.tempId, 'institution_name', value)}
                                                placeholder="Type to search..."
                                                showLogos={true}
                                                onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? liability.tempId : null)}
                                                onEnterKey={() => {
                                                    if (isValid) {
                                                        addNewLiability();
                                                    }
                                                }}
                                            />
                                            {liability.institution_name && !popularBrokerages.find(b => b.name === liability.institution_name) && (
                                                <div className="absolute -bottom-5 left-0 text-[10px] text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                                                    Custom
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 flex items-center justify-center space-x-1">
                                            <button
                                                onClick={() => duplicateLiability(liability)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteLiability(liability.tempId)}
                                                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Additional fields for specific types */}
                                    {(liability.liability_type === 'credit_card' || liability.showCreditLimit) && (
                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-400">Credit Limit</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                                        <input
                                                            type="text"
                                                            value={liability.credit_limit}
                                                            onChange={(e) => updateLiability(liability.tempId, 'credit_limit', formatCurrency(e.target.value))}
                                                            placeholder="0.00"
                                                            className="w-full pl-8 pr-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-400">Utilization</label>
                                                    <div className="mt-1 px-3 py-2 bg-gray-950 rounded-md text-sm text-gray-300">
                                                        {liability.current_balance && liability.credit_limit
                                                            ? `${((parseFloat(liability.current_balance) / parseFloat(liability.credit_limit)) * 100).toFixed(1)}%`
                                                            : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {['mortgage', 'auto_loan', 'personal_loan', 'student_loan', 'home_equity'].includes(liability.liability_type) && (
                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-400">Original Amount</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                                        <input
                                                            type="text"
                                                            value={liability.original_amount}
                                                            onChange={(e) => updateLiability(liability.tempId, 'original_amount', formatCurrency(e.target.value))}
                                                            placeholder="0.00"
                                                            className="w-full pl-8 pr-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="text-xs text-gray-400">Paid Off</label>
                                                    <div className="mt-1 px-3 py-2 bg-gray-950 rounded-md text-sm text-gray-300">
                                                        {liability.current_balance && liability.original_amount
                                                            ? `${(((parseFloat(liability.original_amount) - parseFloat(liability.current_balance)) / parseFloat(liability.original_amount)) * 100).toFixed(1)}%`
                                                            : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status indicator */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-all duration-500 ${
                                        liability.isNew ? 'bg-gradient-to-b from-rose-500 via-amber-500 to-yellow-500 animate-pulse' :
                                        isValid ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-gradient-to-b from-gray-600 to-gray-700'
                                    }`} />

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
            <div className="mt-4 bg-gray-900/70 rounded-lg p-3 border border-gray-800">
                <div className="flex items-start">
                    <Info className="w-4 h-4 text-emerald-400 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-xs text-gray-300">
                        <p className="font-medium mb-1 text-white">Quick tips:</p>
                        <ul className="space-y-0.5 text-gray-400">
                            <li>• Include all debts for accurate net worth</li>
                            <li>• Update balances monthly for best tracking</li>
                            <li>• Higher interest debts should be priority</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Success Animation Overlay */}
            {showSuccessAnimation && (
                <div className="absolute inset-0 bg-gray-950 bg-opacity-95 flex items-center justify-center z-50 rounded-xl">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full mb-4 animate-bounce">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Liabilities Added!</h3>
                        <p className="text-gray-400 mt-1">Tracking your complete financial picture</p>
                    </div>
                </div>
            )}
        </div>
    );
};