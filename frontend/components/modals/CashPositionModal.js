// frontend/components/modals/CashPositionModal.js
import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Calculator } from 'lucide-react';
import { addCashPosition, updateCashPosition } from '@/utils/apimethods/positionMethods';
import { formatCurrency } from '@/utils/formatters';
import FixedModal from '@/components/modals/FixedModal';

const CashPositionModal = ({ isOpen, onClose, accountId, onPositionSaved, positionToEdit = null }) => {
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
  
  useEffect(() => {
    console.log("CashPositionModal - positionToEdit:", positionToEdit);
    
    if (positionToEdit) {
      setIsEditing(true);
      // Format dates properly
      const maturity_date = positionToEdit.maturity_date 
        ? new Date(positionToEdit.maturity_date).toISOString().split('T')[0]
        : '';
      
      // Convert interest rate from decimal to percentage display
      // API stores as 0.035, form displays as 3.5
      const displayInterestRate = positionToEdit.interest_rate !== null && positionToEdit.interest_rate !== undefined
        ? (parseFloat(positionToEdit.interest_rate) * 100).toString()
        : '';
      
      console.log("Interest rate conversion:", {
        original: positionToEdit.interest_rate,
        converted: displayInterestRate
      });
        
      setFormData({
        cash_type: positionToEdit.cash_type || 'Savings',
        name: positionToEdit.name || '',
        amount: positionToEdit.amount?.toString() || '',
        interest_rate: displayInterestRate,
        interest_period: positionToEdit.interest_period || 'annually',
        maturity_date,
        notes: positionToEdit.notes || ''
      });
      
      console.log("Form data after initialization:", {
        cash_type: positionToEdit.cash_type || 'Savings',
        name: positionToEdit.name || '',
        amount: positionToEdit.amount?.toString() || '',
        interest_rate: displayInterestRate,
        interest_period: positionToEdit.interest_period || 'annually',
        maturity_date,
        notes: positionToEdit.notes || ''
      });
    } else {
      setIsEditing(false);
      // Reset form for new position
      setFormData({
        cash_type: 'Savings',
        name: '',
        amount: '',
        interest_rate: '',
        interest_period: 'annually',
        maturity_date: '',
        notes: ''
      });
    }
  }, [positionToEdit, isOpen]);
  
  // Calculate interest whenever amount or rate changes
  useEffect(() => {
    calculateInterest();
  }, [formData.amount, formData.interest_rate, formData.interest_period]);
  
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
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
      } else {
        // Create new position
        await addCashPosition(accountId, dataToSubmit);
      }
      
      setSaving(false);
      if (onPositionSaved) {
        onPositionSaved();
      }
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Failed to save cash position');
      console.error("Error saving cash position:", err);
    }
  };
  
  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Cash Position' : 'Add Cash Position'}
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cash Type</label>
              <select
                name="cash_type"
                value={formData.cash_type}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Savings">Savings Account</option>
                <option value="CD">Certificate of Deposit (CD)</option>
                <option value="Money Market">Money Market Account</option>
                <option value="Checking">Checking Account</option>
                <option value="Cash">Cash</option>
                <option value="Treasury Bill">Treasury Bill</option>
                <option value="Other">Other</option>
              </select>
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
                  className="mt-1 block w-full pl-7 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
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
                  className="mt-1 block w-full pr-8 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Maturity Date</label>
                <input
                  type="date"
                  name="maturity_date"
                  value={formData.maturity_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional details about this cash position"
            ></textarea>
          </div>
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