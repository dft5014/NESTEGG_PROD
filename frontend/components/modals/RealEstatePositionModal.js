// frontend/components/modals/RealEstatePositionModal.js
import React, { useState, useEffect } from 'react';
import FixedModal from './FixedModal';
import { addRealEstatePosition, updatePosition } from '@/utils/apimethods/positionMethods';

const RealEstatePositionModal = ({ isOpen, onClose, accountId, onPositionSaved, positionToEdit = null }) => {
  // State for form fields
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (positionToEdit) {
        // Edit mode - pre-fill form with position data
        setIsEditMode(true);
        setAddress(positionToEdit.address || '');
        setPropertyType(positionToEdit.property_type || '');
        setPurchasePrice(positionToEdit.purchase_price?.toString() || '');
        
        // Format date from ISO to YYYY-MM-DD for input
        setPurchaseDate(positionToEdit.purchase_date 
          ? new Date(positionToEdit.purchase_date).toISOString().split('T')[0]
          : '');
        
        setEstimatedValue(positionToEdit.estimated_market_value?.toString() || '');
        setNotes(positionToEdit.notes || '');
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setAddress('');
        setPropertyType('');
        setPurchasePrice('');
        setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
        setEstimatedValue('');
        setNotes('');
      }
      
      // Common reset
      setFormMessage('');
      setMessageType('');
      setIsSubmitting(false);
    }
  }, [isOpen, positionToEdit]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!address) {
      setFormMessage('Please enter the property address');
      setMessageType('error');
      return;
    }
    
    if (!propertyType) {
      setFormMessage('Please select a property type');
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
    
    if (!estimatedValue || parseFloat(estimatedValue) <= 0) {
      setFormMessage('Please enter a valid estimated market value');
      setMessageType('error');
      return;
    }
    
    setIsSubmitting(true);
    setFormMessage('');
    
    try {
      const realEstateData = {
        address: address,
        property_type: propertyType,
        purchase_price: parseFloat(purchasePrice),
        purchase_date: purchaseDate,
        estimated_market_value: parseFloat(estimatedValue),
        notes: notes || null
      };
      
      console.log(`${isEditMode ? 'Updating' : 'Adding'} real estate position:`, realEstateData);
      
      let result;
      
      if (isEditMode) {
        result = await updatePosition(positionToEdit.id, realEstateData, 'realestate');
      } else {
        result = await addRealEstatePosition(accountId, realEstateData);
      }
      
      console.log(`Real estate position ${isEditMode ? 'updated' : 'added'}:`, result);
      
      // Show success message
      setFormMessage(`Real estate position ${isEditMode ? 'updated' : 'added'} successfully!`);
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
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} real estate position:`, error);
      setFormMessage(`Error ${isEditMode ? 'updating' : 'adding'} real estate position: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditMode ? 'Edit' : 'Add'} Real Estate Position`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Property Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Address*
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main St, Anytown, CA 12345"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Type*
          </label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">-- Select Type --</option>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            <option value="Land">Land</option>
            <option value="Industrial">Industrial</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        {/* Purchase Price & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price ($)*
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="e.g., 500000"
              step="0.01"
              min="0"
              className="w-full p-2 border rounded"
              required
            />
          </div>
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
        </div>
        
        {/* Estimated Market Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Estimated Market Value ($)*
          </label>
          <input
            type="number"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="e.g., 550000"
            step="0.01"
            min="0"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information about the property..."
            className="w-full p-2 border rounded"
            rows="3"
          />
        </div>
        
        {/* Gain/Loss */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between">
            <span>Estimated Gain/Loss:</span>
            {(() => {
              const purchasePriceValue = parseFloat(purchasePrice || 0);
              const currentValue = parseFloat(estimatedValue || 0);
              const gainLoss = currentValue - purchasePriceValue;
              const gainLossPercent = purchasePriceValue > 0 ? (gainLoss / purchasePriceValue) * 100 : 0;
              
              return (
                <span className={gainLoss >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString()} 
                  ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                </span>
              );
            })()}
          </div>
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

export default RealEstatePositionModal;