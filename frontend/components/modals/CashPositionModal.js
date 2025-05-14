// frontend/components/modals/CashPositionModal.js
import React, { useState, useEffect, useRef } from 'react';
import { Save, AlertCircle, Calculator, Edit } from 'lucide-react';
import { addCashPosition, updateCashPosition } from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';
import FixedModal from '@/components/modals/FixedModal';

const CashPositionModal = ({ isOpen, onClose, accountId, onPositionSaved, positionToEdit = null }) => {
  // Original data to compare for changes
  const originalData = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    cash_type: 'Savings', // Default value
    name: '',
    amount: '',
    interest_rate: '',
    interest_period: 'annually',
    maturity_date: '',
    notes: ''
  });
  
  const [estimatedInterest, setEstimatedInterest] = useState({
    monthly: 0,
    annual: 0
  });
  
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Track which fields have been changed
  const [changedFields, setChangedFields] = useState({});
  
  useEffect(() => {
    console.log("CashPositionModal - positionToEdit:", positionToEdit);
    
    if (positionToEdit) {
      setIsEditing(true);
      
      // Format dates properly
      const maturity_date = positionToEdit.maturity_date 
        ? new Date(positionToEdit.maturity_date).toISOString().split('T')[0]
        : '';
      
      // Extract amount/balance from multiple possible field names
      const amountValue = 
        positionToEdit.amount?.toString() || 
        positionToEdit.balance?.toString() || 
        positionToEdit.current_value?.toString() || 
        positionToEdit.value?.toString() || 
        '';
      
      // Convert interest rate from decimal to percentage display
      const rawInterestRate = 
        positionToEdit.interest_rate !== null && positionToEdit.interest_rate !== undefined 
          ? positionToEdit.interest_rate 
          : (positionToEdit.rate !== null && positionToEdit.rate !== undefined ? positionToEdit.rate : null);
          
      const displayInterestRate = rawInterestRate !== null && rawInterestRate !== undefined
        ? (parseFloat(rawInterestRate) * 100).toString()
        : '';
      
      console.log("Field mapping:", {
        amount: {
          original: {
            amount: positionToEdit.amount,
            balance: positionToEdit.balance,
            current_value: positionToEdit.current_value,
            value: positionToEdit.value
          },
          used: amountValue
        },
        interestRate: {
          original: {
            interest_rate: positionToEdit.interest_rate,
            rate: positionToEdit.rate
          },
          rawUsed: rawInterestRate,
          displayUsed: displayInterestRate
        }
      });
      
      const initialFormData = {
        cash_type: positionToEdit.cash_type || positionToEdit.type || 'Savings',
        name: positionToEdit.name || positionToEdit.position_name || '',
        amount: amountValue,
        interest_rate: displayInterestRate,
        interest_period: positionToEdit.interest_period || 'annually',
        maturity_date,
        notes: positionToEdit.notes || positionToEdit.description || ''
      };
        
      setFormData(initialFormData);
      
      // Store original data for comparison
      originalData.current = { ...initialFormData };
      
      // Reset changed fields
      setChangedFields({});
      
      console.log("Form data after initialization:", initialFormData);
    } else {
      setIsEditing(false);
      // Reset form for new position
      const defaultFormData = {
        cash_type: 'Savings',
        name: '',
        amount: '',
        interest_rate: '',
        interest_period: 'annually',
        maturity_date: '',
        notes: ''
      };
      
      setFormData(defaultFormData);
      originalData.current = null;
      setChangedFields({});
    }
    
    // Reset messages
    setError(null);
    setSuccessMessage('');
  }, [positionToEdit, isOpen]);
  
  // Calculate interest whenever amount or rate changes
  useEffect(() => {
    calculateInterest();
  }, [formData.amount, formData.interest_rate, formData.interest_period]);
  
  // Update changedFields whenever formData changes
  useEffect(() => {
    if (isEditing && originalData.current) {
      const newChangedFields = {};
      
      Object.keys(formData).forEach(key => {
        if (formData[key] !== originalData.current[key]) {
          newChangedFields[key] = true;
        }
      });
      
      setChangedFields(newChangedFields);
    }
  }, [formData, isEditing]);
  
  const calculateInterest = () => {
    const amount = parseFloat(formData.amount) || 0;
    // Convert from percentage to decimal (e.g., 3.5% -> 0.035)
    const yearlyRate = (parseFloat(formData.interest_rate) || 0) / 100;
    
    let annualInterest = amount * yearlyRate;
    let monthlyInterest = annualInterest / 12;
    
    setEstimatedInterest({
      monthly: monthlyInterest,
      annual: annualInterest
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Format position name for the title
  const getDisplayName = () => {
    if (!positionToEdit) return '';
    
    const name = positionToEdit.name || positionToEdit.position_name || '';
    const identifier = positionToEdit.identifier || positionToEdit.cash_type || '';
    
    if (name && identifier) {
      return `${name} | ${identifier}`;
    }
    
    return name || identifier || 'Cash Position';
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');
    
    try {
      // Validate form
      if (!formData.name || !formData.amount) {
        setError('Name and amount are required fields');
        return;
      }
      
      // Convert values for API submission
      const dataToSubmit = {
        ...formData,
        amount: parseFloat(formData.amount),
        // Convert from percentage to decimal for API (e.g., 3.5 -> 0.035)
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) / 100 : null
      };
      
      console.log("Submitting cash position data:", dataToSubmit);
      
      setSaving(true);
      
      if (isEditing && positionToEdit) {
        // Update existing position
        await updateCashPosition(positionToEdit.id, dataToSubmit);
        setSuccessMessage(`Position "${formData.name}" updated successfully!`);
      } else {
        // Create new position
        await addCashPosition(accountId, dataToSubmit);
        setSuccessMessage(`Position "${formData.name}" added successfully!`);
      }
      
      // Wait a moment to show success message
      setTimeout(() => {
        setSaving(false);
        if (onPositionSaved) {
          onPositionSaved();
        }
        onClose();
      }, 1500);
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Failed to save cash position');
      console.error("Error saving cash position:", err);
    }
  };
  
  // Get field class based on whether it's been changed
  const getFieldClass = (fieldName) => {
    const baseClass = "mt-1 block w-full border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500";
    
    if (changedFields[fieldName]) {
      return `${baseClass} border-yellow-300 bg-yellow-50`;
    }
    
    return `${baseClass} border-gray-300`;
  };
  
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${getDisplayName()}` : 'Add Cash Position'}
      size="max-w-2xl"
    >
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 border-l-4 border-red-500 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 border-l-4 border-green-500 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Name & Cash Type (Side by Side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="E.g., Emergency Fund, Vacation CD"
                className={getFieldClass('name')}
                required
              />
              {changedFields.name && (
                <p className="mt-1 text-xs text-amber-600 flex items-center">
                  <Edit className="h-3 w-3 mr-1" />
                  Changed from: {originalData.current?.name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cash Type</label>
              <select
                name="cash_type"
                value={formData.cash_type}
                onChange={handleInputChange}
                className={getFieldClass('cash_type')}
              >
                <option value="Savings">Savings Account</option>
                <option value="CD">Certificate of Deposit (CD)</option>
                <option value="Money Market">Money Market Account</option>
                <option value="Checking">Checking Account</option>
                <option value="Cash">Cash</option>
                <option value="Treasury Bill">Treasury Bill</option>
                <option value="Other">Other</option>
              </select>
              {changedFields.cash_type && (
                <p className="mt-1 text-xs text-amber-600 flex items-center">
                  <Edit className="h-3 w-3 mr-1" />
                  Changed from: {originalData.current?.cash_type}
                </p>
              )}
            </div>
          </div>
          
          {/* Amount & Interest Rate (Side by Side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`pl-7 ${getFieldClass('amount')}`}
                  required
                />
              </div>
              {changedFields.amount && (
                <p className="mt-1 text-xs text-amber-600 flex items-center">
                  <Edit className="h-3 w-3 mr-1" />
                  Changed from: ${parseFloat(originalData.current?.amount).toFixed(2)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="interest_rate"
                  value={formData.interest_rate}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`pr-8 ${getFieldClass('interest_rate')}`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              {changedFields.interest_rate && (
                <p className="mt-1 text-xs text-amber-600 flex items-center">
                  <Edit className="h-3 w-3 mr-1" />
                  Changed from: {parseFloat(originalData.current?.interest_rate || 0).toFixed(2)}%
                </p>
              )}
            </div>
          </div>
          
          {/* Interest Period & Maturity Date (Side by Side) - Only show if interest rate is provided */}
          {formData.interest_rate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Interest Period</label>
                <select
                  name="interest_period"
                  value={formData.interest_period}
                  onChange={handleInputChange}
                  className={getFieldClass('interest_period')}
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
                {changedFields.interest_period && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center">
                    <Edit className="h-3 w-3 mr-1" />
                    Changed from: {originalData.current?.interest_period}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maturity Date</label>
                <input
                  type="date"
                  name="maturity_date"
                  value={formData.maturity_date}
                  onChange={handleInputChange}
                  className={getFieldClass('maturity_date')}
                />
                {changedFields.maturity_date && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center">
                    <Edit className="h-3 w-3 mr-1" />
                    Changed from: {originalData.current?.maturity_date}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Estimated Interest Box - Show if interest rate is provided */}
          {formData.interest_rate && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 flex items-start space-x-3">
              <Calculator className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-700">Estimated Interest</h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Monthly:</span> {formatCurrency(estimatedInterest.monthly)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Annual:</span> {formatCurrency(estimatedInterest.annual)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className={getFieldClass('notes')}
              placeholder="Additional details about this cash position"
            ></textarea>
            {changedFields.notes && (
              <p className="mt-1 text-xs text-amber-600 flex items-center">
                <Edit className="h-3 w-3 mr-1" />
                Changed from original notes
              </p>
            )}
          </div>
          
          {/* Summary of changes */}
          {isEditing && Object.keys(changedFields).length > 0 && (
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-1 flex items-center">
                <Edit className="h-4 w-4 mr-1" />
                Changes to be saved:
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {Object.keys(changedFields).map(field => (
                  <li key={field} className="ml-4">
                    • {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 rounded-md flex items-center ${
              saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors text-white`}
            disabled={saving}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update' : 'Save'}
              </>
            )}
          </button>
        </div>
      </form>
    </FixedModal>
  );
};

export default CashPositionModal;