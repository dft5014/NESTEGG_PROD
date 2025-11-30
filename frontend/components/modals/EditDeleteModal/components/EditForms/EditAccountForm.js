import React, { useState } from 'react';
import { X, Loader2, Building } from 'lucide-react';
import InstitutionSelect from '../InstitutionSelect';
import {
  ACCOUNT_CATEGORIES,
  ACCOUNT_TYPES_BY_CATEGORY,
  getCategoryFromType,
  getCategoryConfig
} from '../../config';

/**
 * Account edit form
 */
const EditAccountForm = ({ account, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    account_name: account.name || '',
    institution: account.institution || '',
    type: account.type || '',
    account_category: account.category || '',
    balance: account.totalValue || 0
  });

  const [originalData] = useState({ ...formData });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const availableTypes = formData.account_category
    ? ACCOUNT_TYPES_BY_CATEGORY[formData.account_category] || []
    : Object.values(ACCOUNT_TYPES_BY_CATEGORY).flat();

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
    if (!formData.account_name) newErrors.account_name = 'Account name required';
    if (!formData.institution) newErrors.institution = 'Institution required';
    if (!formData.type) newErrors.type = 'Account type required';
    if (!formData.account_category) newErrors.account_category = 'Category required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSave({ ...account, ...formData });
    } finally {
      setIsSaving(false);
    }
  };

  const category = getCategoryConfig(formData.account_category);
  const Icon = category?.icon || Building;

  const getInputClassName = (field) => {
    const base = 'w-full px-3 py-2 border rounded-lg text-sm transition-colors';
    if (errors[field]) {
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
          <div className={`p-3 rounded-xl bg-${category?.color || 'gray'}-100`}>
            <Icon className={`w-6 h-6 text-${category?.color || 'gray'}-600`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Edit Account</h3>
            <p className="text-sm text-gray-500">Update account information</p>
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
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Account Name
          </label>
          <input
            type="text"
            value={formData.account_name}
            onChange={(e) => handleFieldChange('account_name', e.target.value)}
            className={getInputClassName('account_name')}
            placeholder="My Investment Account"
          />
          {errors.account_name && (
            <p className="mt-1 text-xs text-rose-400">{errors.account_name}</p>
          )}
          {isFieldModified('account_name') && !errors.account_name && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Institution
          </label>
          <InstitutionSelect
            value={formData.institution}
            onChange={(val) => handleFieldChange('institution', val)}
            placeholder="Type to search..."
          />
          {errors.institution && (
            <p className="mt-1 text-xs text-rose-400">{errors.institution}</p>
          )}
          {isFieldModified('institution') && !errors.institution && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Account Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => {
              const newType = e.target.value;
              handleFieldChange('type', newType);
              const newCategory = getCategoryFromType(newType);
              if (newCategory && newCategory !== formData.account_category) {
                handleFieldChange('account_category', newCategory);
              }
            }}
            className={getInputClassName('type')}
          >
            <option value="">Select a type...</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-xs text-rose-400">{errors.type}</p>
          )}
          {isFieldModified('type') && !errors.type && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Category
          </label>
          <select
            value={formData.account_category}
            onChange={(e) => {
              handleFieldChange('account_category', e.target.value);
              if (formData.type && !ACCOUNT_TYPES_BY_CATEGORY[e.target.value]?.includes(formData.type)) {
                handleFieldChange('type', '');
              }
            }}
            className={getInputClassName('account_category')}
          >
            <option value="">Select a category...</option>
            {ACCOUNT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {errors.account_category && (
            <p className="mt-1 text-xs text-rose-400">{errors.account_category}</p>
          )}
          {isFieldModified('account_category') && !errors.account_category && (
            <p className="mt-1 text-xs text-blue-400">Modified</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Starting Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => handleFieldChange('balance', parseFloat(e.target.value) || 0)}
              className={`${getInputClassName('balance')} pl-8`}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {isFieldModified('balance') && (
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
            ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
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

export default EditAccountForm;
