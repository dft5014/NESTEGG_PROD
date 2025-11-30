import React, { useState } from 'react';
import { X, Loader2, Banknote } from 'lucide-react';
import { LIABILITY_TYPES, getLiabilityTypeConfig } from '../../config';

/**
 * Liability edit form
 */
const EditLiabilityForm = ({ liability, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: liability.name || '',
    liability_type: liability.liability_type || '',
    current_balance: liability.current_balance || 0,
    original_amount: liability.original_amount || 0,
    interest_rate: liability.interest_rate || 0,
    minimum_payment: liability.minimum_payment || 0,
    due_date: liability.due_date ? liability.due_date.split('T')[0] : '',
    notes: liability.notes || ''
  });

  const [originalData] = useState({ ...formData });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const isFieldModified = (field) => {
    return formData[field] !== originalData[field];
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name required';
    if (!formData.liability_type) newErrors.liability_type = 'Type required';
    if (!formData.current_balance) newErrors.current_balance = 'Balance required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave({ ...liability, ...formData });
    } finally {
      setIsSaving(false);
    }
  };

  const typeConfig = getLiabilityTypeConfig(formData.liability_type);
  const Icon = typeConfig?.icon || Banknote;

  const getInputClassName = (field, hasError = false) => {
    const base = 'w-full px-3 py-2 border rounded-lg text-sm transition-colors';
    if (hasError || errors[field]) {
      return `${base} border-red-500/50 focus:ring-red-500 focus:border-red-500 bg-gray-800 text-white`;
    }
    if (isFieldModified(field)) {
      return `${base} border-blue-500/50 bg-blue-500/10 focus:ring-blue-500 focus:border-blue-500 text-white`;
    }
    return `${base} bg-gray-800 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500`;
  };

  return (
    <div className="space-y-4 p-6 bg-gray-900 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-rose-500/20">
            <Icon className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Edit Liability</h3>
            <p className="text-sm text-gray-500">Update liability details</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={getInputClassName('name')}
            placeholder="Chase Sapphire Card"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-400">{errors.name}</p>
          )}
          {isFieldModified('name') && !errors.name && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
          <select
            value={formData.liability_type}
            onChange={(e) => handleFieldChange('liability_type', e.target.value)}
            className={getInputClassName('liability_type')}
          >
            <option value="">Select type...</option>
            {Object.entries(LIABILITY_TYPES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          {errors.liability_type && (
            <p className="mt-1 text-xs text-rose-400">{errors.liability_type}</p>
          )}
          {isFieldModified('liability_type') && !errors.liability_type && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Current Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={formData.current_balance}
              onChange={(e) => handleFieldChange('current_balance', parseFloat(e.target.value) || 0)}
              className={`${getInputClassName('current_balance')} pl-8`}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {errors.current_balance && (
            <p className="mt-1 text-xs text-rose-400">{errors.current_balance}</p>
          )}
          {isFieldModified('current_balance') && !errors.current_balance && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Original Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={formData.original_amount}
              onChange={(e) => handleFieldChange('original_amount', parseFloat(e.target.value) || 0)}
              className={`${getInputClassName('original_amount')} pl-8`}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {isFieldModified('original_amount') && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Interest Rate (%)</label>
          <input
            type="number"
            value={formData.interest_rate}
            onChange={(e) => handleFieldChange('interest_rate', parseFloat(e.target.value) || 0)}
            className={getInputClassName('interest_rate')}
            placeholder="0.00"
            step="0.01"
            min="0"
            max="100"
          />
          {isFieldModified('interest_rate') && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Minimum Payment</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={formData.minimum_payment}
              onChange={(e) => handleFieldChange('minimum_payment', parseFloat(e.target.value) || 0)}
              className={`${getInputClassName('minimum_payment')} pl-8`}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {isFieldModified('minimum_payment') && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => handleFieldChange('due_date', e.target.value)}
            className={getInputClassName('due_date')}
          />
          {isFieldModified('due_date') && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            className={`${getInputClassName('notes')} resize-none`}
            placeholder="Additional notes..."
            rows={3}
          />
          {isFieldModified('notes') && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-900 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-lg transition-all
            ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
          `}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
};

export default EditLiabilityForm;
