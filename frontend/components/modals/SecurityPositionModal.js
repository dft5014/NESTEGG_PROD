// frontend/components/modals/SecurityPositionModal.js
import React, { useState, useEffect, useCallback } from 'react';
import FixedModal from './FixedModal';
import { addSecurityPosition, searchSecurities, updatePosition } from '@/utils/apimethods/positionMethods';
import debounce from 'lodash.debounce';

const SecurityPositionModal = ({ isOpen, onClose, accountId, onPositionSaved, positionToEdit = null }) => {
  // State for form fields
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [costPerShare, setCostPerShare] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [totalCost, setTotalCost] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  
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
        setTicker(positionToEdit.ticker || '');
        setShares(positionToEdit.shares?.toString() || '');
        setCurrentPrice(positionToEdit.price?.toString() || '');
        setCostPerShare(positionToEdit.cost_basis?.toString() || positionToEdit.price?.toString() || '');
        
        // Format date from ISO to YYYY-MM-DD for input
        setPurchaseDate(positionToEdit.purchase_date 
          ? new Date(positionToEdit.purchase_date).toISOString().split('T')[0]
          : '');
        
        setSelectedSecurity({
          ticker: positionToEdit.ticker,
          name: positionToEdit.name || positionToEdit.ticker,
          price: positionToEdit.price
        });
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setTicker('');
        setShares('');
        setCurrentPrice('');
        setCostPerShare('');
        setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
        setSelectedSecurity(null);
      }
      
      // Common reset
      setSearchQuery('');
      setSearchResults([]);
      setTotalCost(0);
      setFormMessage('');
      setMessageType('');
      setIsSubmitting(false);
    }
  }, [isOpen, positionToEdit]);

  // Update totalCost when shares or costPerShare changes
  useEffect(() => {
    const numShares = parseFloat(shares);
    const cost = parseFloat(costPerShare);
    
    if (!isNaN(numShares) && !isNaN(cost)) {
      setTotalCost(numShares * cost);
    } else {
      setTotalCost(0);
    }
  }, [shares, costPerShare]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      
      try {
        const results = await searchSecurities(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching securities:', error);
        setFormMessage('Error searching for securities. Please try again.');
        setMessageType('error');
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Handle search query change
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setTicker(value);
    
    if (value.length >= 2) {
      debouncedSearch(value);
    } else {
      setSearchResults([]);
    }
  };

  // Handle selecting a security from search results
  const handleSelectSecurity = (security) => {
    setSelectedSecurity(security);
    setTicker(security.ticker);
    setCurrentPrice(security.price?.toString() || '');
    
    // If cost basis is empty, default to current price
    if (!costPerShare) {
      setCostPerShare(security.price?.toString() || '');
    }
    
    setSearchResults([]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!ticker) {
      setFormMessage('Please enter a ticker symbol');
      setMessageType('error');
      return;
    }
    
    if (!shares || parseFloat(shares) <= 0) {
      setFormMessage('Please enter a valid number of shares');
      setMessageType('error');
      return;
    }
    
    if (!currentPrice || parseFloat(currentPrice) <= 0) {
      setFormMessage('Please enter a valid current price');
      setMessageType('error');
      return;
    }
    
    if (!costPerShare || parseFloat(costPerShare) <= 0) {
      setFormMessage('Please enter a valid cost basis');
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
      const positionData = {
        ticker: ticker.toUpperCase(),
        shares: parseFloat(shares),
        price: parseFloat(currentPrice),
        cost_basis: parseFloat(costPerShare),
        purchase_date: purchaseDate
      };
      
      console.log(`${isEditMode ? 'Updating' : 'Adding'} security position:`, positionData);
      
      let result;
      
      if (isEditMode) {
        result = await updatePosition(positionToEdit.id, positionData, 'security');
      } else {
        result = await addSecurityPosition(accountId, positionData);
      }
      
      console.log(`Security position ${isEditMode ? 'updated' : 'added'}:`, result);
      
      // Show success message
      setFormMessage(`Security position ${isEditMode ? 'updated' : 'added'} successfully!`);
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
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} security position:`, error);
      setFormMessage(`Error ${isEditMode ? 'updating' : 'adding'} security position: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditMode ? 'Edit' : 'Add'} Security Position`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ticker/Security Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ticker / Company Name*
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search (e.g., AAPL, Microsoft)"
            className="w-full p-2 border rounded"
            required
            disabled={isEditMode}
          />
          
          {isSearching && (
            <div className="mt-1 text-sm text-gray-500">Searching...</div>
          )}
          
          {/* Search Results Dropdown */}
          {!isEditMode && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto rounded-md shadow-lg z-10">
              {searchResults.map((result) => (
                <div
                  key={result.ticker}
                  className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
                  onClick={() => handleSelectSecurity(result)}
                >
                  <div className="flex justify-between">
                    <div>
                      <span className="font-bold text-blue-800">{result.ticker}</span>
                      <span className="ml-2 text-gray-700">{result.name}</span>
                    </div>
                    <div className="text-gray-600">${result.price?.toFixed(2) || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Security Info (or current position in edit mode) */}
        {(selectedSecurity || isEditMode) && (
          <div className="p-3 bg-gray-100 rounded-lg">
            <div className="font-medium">
              {isEditMode ? 'Editing Position:' : 'Selected Security:'}
            </div>
            <div>
              <span className="font-bold">{ticker}</span>
              {selectedSecurity?.name && ticker !== selectedSecurity.name && (
                <span className="ml-2 text-gray-700">{selectedSecurity.name}</span>
              )}
            </div>
          </div>
        )}
        
        {/* Current Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Price ($)*
          </label>
          <input
            type="number"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            placeholder="e.g., 150.25"
            step="0.01"
            min="0"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        {/* Shares */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Shares*
          </label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="e.g., 10.5"
            step="0.000001"
            min="0.000001"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        {/* Cost Basis */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Per Share ($)*
            </label>
            <input
              type="number"
              value={costPerShare}
              onChange={(e) => setCostPerShare(e.target.value)}
              placeholder="e.g., 145.75"
              step="0.01"
              min="0"
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Cost ($)
            </label>
            <input
              type="number"
              value={totalCost.toFixed(2)}
              className="w-full p-2 border rounded bg-gray-100"
              readOnly
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
            disabled={isSubmitting || !ticker || !shares || !currentPrice || !costPerShare || !purchaseDate}
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

export default SecurityPositionModal;