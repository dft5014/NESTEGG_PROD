// frontend/components/modals/MetalPositionModal.js
import React, { useState, useEffect } from 'react';
import FixedModal from './FixedModal';
import { addMetalPosition, updatePosition } from '@/utils/apimethods/positionMethods';

const MetalPositionModal = ({ isOpen, onClose, accountId, onPositionSaved, positionToEdit = null }) => {
  // State for form fields
  const [metalType, setMetalType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('oz');
  const [purity, setPurity] = useState('999');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [description, setDescription] = useState('');
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (positionToEdit) {
        // Edit mode - pre-fill form with position data
        setIsEditMode(true);
        setMetalType(positionToEdit.metal_type || '');
        setQuantity(positionToEdit.quantity?.toString() || '');
        setUnit(positionToEdit.unit || 'oz');
        setPurity(positionToEdit.purity || '999');
        setPurchasePrice(positionToEdit.purchase_price?.toString() || '');
        setCostBasis(positionToEdit.cost_basis?.toString() || '');
        
        // Format date from ISO to YYYY-MM-DD for input
        setPurchaseDate(positionToEdit.purchase_date 
          ? new Date(positionToEdit.purchase_date).toISOString().split('T')[0]
          : '');
        
        setStorageLocation(positionToEdit.storage_location || '');
        setDescription(positionToEdit.description || '');
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setMetalType('');
        setQuantity('');
        setUnit('oz');
        setPurity('999');
        setPurchasePrice('');
        setCostBasis('');
        setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
        setStorageLocation('');
        setDescription('');
      }
      
      // Common reset
      setFormMessage('');
      setMessageType('');
      setIsSubmitting(false);
      setTotalValue(0);
    }
  }, [isOpen, positionToEdit]);

  // Calculate total value when quantity or price changes
  useEffect(() => {
    const qty = parseFloat(quantity || 0);
    const price = parseFloat(purchasePrice || 0);
    
    if (!isNaN(qty) && !isNaN(price)) {
      setTotalValue(qty * price);
    } else {
      setTotalValue(0);
    }
  }, [quantity, purchasePrice]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!metalType) {
      setFormMessage('Please select a metal type');
      setMessageType('error');
      return;
    }
    
    if (!quantity || parseFloat(quantity) <= 0) {
      setFormMessage('Please enter a valid quantity');
      setMessageType('error');
      return;
    }
    
    if (!purchasePrice || parseFloat(purchasePrice) <= 0) {
      setFormMessage('Please enter a valid purchase price');
      setMessageType('error');
      return;
    }
    
    if (!purchaseDate) {
      setFormMessage('Please enter a purchase date');
      setMessageType('error');
      return;
    }
    
    setIsSubmitting(true);
    setFormMessage('');
    
    try {
      const metalData = {
        metal_type: metalType,
        quantity: parseFloat(quantity),
        unit: unit,
        purity: purity || null,
        purchase_price: parseFloat(purchasePrice),
        cost_basis: costBasis ? parseFloat(costBasis) : null,
        purchase_date: purchaseDate,
        storage_location: storageLocation || null,
        description: description || null
      };
      
      console.log(`${isEditMode ? 'Updating' : 'Adding'} metal position:`, metalData);
      
      let result;
      
      if (isEditMode) {
        result = await updatePosition(positionToEdit.id, metalData, 'metal');
      } else {
        result = await addMetalPosition(accountId, metalData);
      }
      
      console.log(`Metal position ${isEditMode ? 'updated' : 'added'}:`, result);
      
      // Show success message
      setFormMessage(`Metal position ${isEditMode ? 'updated' : 'added'} successfully!`);
      setMessageType('success');
      
      // Call the callback
      if (onPositionSaved) {
        onPositionSaved(result);
      }
      
      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} metal position:`, error);
      setFormMessage(`Error ${isEditMode ? 'updating' : 'adding'} metal position: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditMode ? 'Edit' : 'Add'} Precious Metal Position`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Metal Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metal Type*
            </label>
            <select
              value={metalType}
              onChange={(e) => setMetalType(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">-- Select Metal --</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Platinum">Platinum</option>
              <option value="Palladium">Palladium</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purity (Optional)
            </label>
            <input
              type="text"
              value={purity}
              onChange={(e) => setPurity(e.target.value)}
              placeholder="e.g., 999, 22K"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity*
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 10"
              step="0.001"
              min="0.001"
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit*
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="oz">Troy Ounce (oz)</option>
              <option value="g">Gram (g)</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="lb">Pound (lb)</option>
              <option value="item">Item(s)</option>
            </select>
          </div>
        </div>
        
        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price (per {unit || 'unit'})*
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="e.g., 1800.50"
              step="0.01"
              min="0"
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Basis (per {unit || 'unit'}, Optional)
            </label>
            <input
              type="number"
              value={costBasis}
              onChange={(e) => setCostBasis(e.target.value)}
              placeholder="Default: Purchase Price"
              step="0.01"
              min="0"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        {/* Purchase Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Date*
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full p-2 border rounded"
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        
        {/* Storage & Description */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Location (Optional)
            </label>
            <input
              type="text"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g., Home Safe, Bank Vault"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 10x 1oz Gold Eagle Coins"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        {/* Total Value */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between">
            <span>Purchase Value:</span>
            <span className="font-semibold">
              ${totalValue.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Based on purchase price, not current market value
          </p>
        </div>
        
        {/* Form Message */}
        {formMessage && (
          <div className={`p-3 rounded-md ${
            messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {formMessage}
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? (isEditMode ? 'Updating...' : 'Adding...') 
              : (isEditMode ? 'Update Position' : 'Add Position')
            }
          </button>
        </div>
      </form>
    </FixedModal>
  );
};

export default MetalPositionModal;