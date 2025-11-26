import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  ASSET_TYPES,
  FIELD_LABELS,
  OTHER_ASSET_SUBTYPES,
  normalizeAssetType,
  getAssetTypeConfig
} from '../../config';
import { mapPositionToFormData, mapFormDataToPosition } from '../../utils';

/**
 * Position edit form - supports all asset types
 */
const EditPositionForm = ({ position, assetType: rawAssetType, onSave, onCancel, accounts }) => {
  const assetType = normalizeAssetType(rawAssetType);
  const config = getAssetTypeConfig(assetType);

  const [formData, setFormData] = useState(() => mapPositionToFormData(position, assetType));
  const [originalData] = useState(() => mapPositionToFormData(position, assetType));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const getEditableFields = (type) => {
    switch (type) {
      case 'security':
        return ['shares', 'cost_basis', 'purchase_date'];
      case 'crypto':
        return ['quantity', 'purchase_price', 'purchase_date'];
      case 'metal':
        return ['quantity', 'purchase_price', 'purchase_date'];
      case 'otherAssets':
        return ['asset_name', 'asset_type', 'cost', 'current_value', 'purchase_date', 'notes'];
      case 'cash':
        return ['amount', 'interest_rate'];
      default:
        return [];
    }
  };

  const editableFields = getEditableFields(assetType);

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

    switch (assetType) {
      case 'security':
        if (!formData.shares) newErrors.shares = 'Shares required';
        break;
      case 'crypto':
        if (!formData.quantity) newErrors.quantity = 'Quantity required';
        break;
      case 'metal':
        if (!formData.quantity) newErrors.quantity = 'Quantity required';
        break;
      case 'otherAssets':
        if (!formData.asset_name) newErrors.asset_name = 'Asset name required';
        if (!formData.current_value) newErrors.current_value = 'Current value required';
        break;
      case 'cash':
        if (!formData.amount) newErrors.amount = 'Amount required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const updatedData = mapFormDataToPosition(formData, position, assetType);
      await onSave(updatedData);
    } finally {
      setIsSaving(false);
    }
  };

  const getInputClassName = (field, isEditable) => {
    const base = 'w-full px-3 py-2 border rounded-lg text-sm transition-all';

    if (!isEditable) {
      return `${base} bg-gray-800 text-gray-500 cursor-not-allowed border-gray-700`;
    }
    if (errors[field]) {
      return `${base} border-red-500/50 focus:ring-red-500 focus:border-red-500 bg-gray-800 text-white`;
    }
    if (isFieldModified(field)) {
      return `${base} border-blue-500/70 bg-blue-500/10 focus:ring-blue-500 focus:border-blue-500 text-white`;
    }
    return `${base} bg-gray-800 text-white border-gray-600 focus:ring-blue-500 focus:border-blue-500`;
  };

  const getInputType = (field) => {
    if (field.includes('price') || field.includes('value') || field.includes('cost') ||
        field === 'shares' || field === 'quantity' || field === 'amount') {
      return 'number';
    }
    if (field.includes('date')) {
      return 'date';
    }
    return 'text';
  };

  const Icon = config.icon;

  return (
    <div className="space-y-4 p-6 bg-gray-900 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl ${config.color.lightBg}`}>
            <Icon className={`w-6 h-6 ${config.color.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Edit {config.name} Position</h3>
            <p className="text-sm text-gray-500">Update position details</p>
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
        {config.fields.map(field => {
          const isEditable = editableFields.includes(field);
          const isModified = isFieldModified(field);

          // Special handling for asset_type select in otherAssets
          if (assetType === 'otherAssets' && field === 'asset_type' && isEditable) {
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Asset Type
                </label>
                <select
                  value={formData.asset_type}
                  onChange={(e) => handleFieldChange('asset_type', e.target.value)}
                  className={getInputClassName('asset_type', true)}
                >
                  {OTHER_ASSET_SUBTYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {isModified && (
                  <p className="mt-1 text-xs text-blue-400">Modified</p>
                )}
              </div>
            );
          }

          return (
            <div key={field} className={field === 'notes' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {FIELD_LABELS[field] || field.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                {!isEditable && <span className="text-xs text-gray-500 ml-2">(Read-only)</span>}
              </label>
              {field === 'notes' ? (
                <textarea
                  value={formData[field] || ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  disabled={!isEditable}
                  className={`${getInputClassName(field, isEditable)} resize-none`}
                  rows={3}
                  placeholder="Add notes..."
                />
              ) : (
                <input
                  type={getInputType(field)}
                  value={formData[field] || ''}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  disabled={!isEditable}
                  className={getInputClassName(field, isEditable)}
                  step={field.includes('price') || field.includes('value') || field.includes('cost') ? '0.01' : '1'}
                />
              )}
              {errors[field] && (
                <p className="mt-1 text-xs text-rose-400">{errors[field]}</p>
              )}
              {isModified && !errors[field] && (
                <p className="mt-1 text-xs text-blue-400">Modified</p>
              )}
            </div>
          );
        })}
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
            ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}
            ${config.color.bg}
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

export default EditPositionForm;
