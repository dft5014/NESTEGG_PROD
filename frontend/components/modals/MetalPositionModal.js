// components/modals/MetalPositionModal.js
import React, { useState, useEffect, useCallback } from 'react';
import FixedModal from './FixedModal';
import { addMetalPosition, updatePosition, searchFXAssets } from '@/utils/apimethods/positionMethods';
import debounce from 'lodash.debounce';
import { 
  Search, X, Check, TrendingUp, TrendingDown, 
  DollarSign, Tag, BarChart4, Plus
} from 'lucide-react';

const MetalPositionModal = ({ isOpen, onClose, accountId, accountName = '', onPositionSaved, positionToEdit = null }) => {
  // State for form fields
  const [metalType, setMetalType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('oz');
  const [purity, setPurity] = useState('999');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [description, setDescription] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMetal, setSelectedMetal] = useState(null);
  
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
        
        // Format date from ISO to YYYY-MM-DD for input
        setPurchaseDate(positionToEdit.purchase_date 
          ? new Date(positionToEdit.purchase_date).toISOString().split('T')[0]
          : '');
        
        setStorageLocation(positionToEdit.storage_location || '');
        setDescription(positionToEdit.description || '');
        
        // Set selectedMetal with market data if available
        if (positionToEdit.metal_type) {
          setSelectedMetal({
            symbol: positionToEdit.metal_type,
            name: `${positionToEdit.metal_type} ${positionToEdit.purity || ''}`.trim(),
            price: positionToEdit.current_price || positionToEdit.purchase_price,
            price_as_of_date: new Date().toISOString(), // Placeholder, would come from data
            high_24h: (positionToEdit.current_price || positionToEdit.purchase_price) * 1.02, // Mock data
            low_24h: (positionToEdit.current_price || positionToEdit.purchase_price) * 0.98, // Mock data
          });
        }
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setMetalType('');
        setQuantity('');
        setUnit('oz');
        setPurity('999');
        setPurchasePrice('');
        setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
        setStorageLocation('');
        setDescription('');
        setSelectedMetal(null);
      }
      
      // Common reset
      setSearchQuery('');
      setSearchResults([]);
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

  // Search for metals using the searchFXAssets function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      
      try {
        // Use searchFXAssets with 'metal' as the asset type
        const results = await searchFXAssets(query, 'metal');
        
        // If no results or API not ready, use this fallback with common precious metals
        if (!results || results.length === 0) {
          const fallbackResults = [
            { symbol: 'Gold', name: 'Gold', price: 2450.00, price_as_of_date: new Date().toISOString(), high_24h: 2470.00, low_24h: 2430.00 },
            { symbol: 'Silver', name: 'Silver', price: 28.50, price_as_of_date: new Date().toISOString(), high_24h: 29.00, low_24h: 28.00 },
            { symbol: 'Platinum', name: 'Platinum', price: 980.00, price_as_of_date: new Date().toISOString(), high_24h: 995.00, low_24h: 975.00 },
            { symbol: 'Palladium', name: 'Palladium', price: 950.00, price_as_of_date: new Date().toISOString(), high_24h: 960.00, low_24h: 940.00 },
          ].filter(metal => 
            metal.symbol.toLowerCase().includes(query.toLowerCase()) || 
            metal.name.toLowerCase().includes(query.toLowerCase())
          );
          
          setSearchResults(fallbackResults);
        } else {
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Error searching precious metals:', error);
        setFormMessage('Error searching for precious metals. Please try again.');
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
    
    if (value.length >= 2) {
      debouncedSearch(value);
    } else {
      setSearchResults([]);
    }
  };

  // Handle selecting a metal from search results
  const handleSelectMetal = (metal) => {
    setSelectedMetal(metal);
    setMetalType(metal.symbol);
    setSearchResults([]);
    setSearchQuery(''); // Clear search box after selection
    
    // Optionally pre-populate the purchase price with current market price
    if (metal.price && !purchasePrice) {
      setPurchasePrice(metal.price.toString());
    }
  };

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
        current_price: selectedMetal?.price || null,
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

  // Format price for display
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditMode ? 'Edit' : 'Add'} Precious Metal Position`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Badge at the top */}
        <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Tag className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">
              {isEditMode ? 'Editing position on:' : 'Adding to:'} {accountName || 'Account'}
            </span>
          </div>
        </div>

        {/* Metal Search */}
        {!isEditMode && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precious Metal Search*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by metal type (e.g., Gold, Silver)"
                className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.symbol}
                    className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
                    onClick={() => handleSelectMetal(result)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-blue-800">{result.symbol}</span>
                        <span className="ml-2 text-gray-700">{result.name !== result.symbol ? result.name : ''}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(result.price)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Selected Metal Info Card */}
        {selectedMetal && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                  {selectedMetal.symbol.charAt(0)}
                </div>
                <div className="ml-3">
                  <div className="font-bold text-blue-900">{selectedMetal.symbol}</div>
                  {selectedMetal.name !== selectedMetal.symbol && (
                    <div className="text-sm text-blue-700">{selectedMetal.name}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{formatCurrency(selectedMetal.price)}</div>
                <div className="text-sm text-gray-600">Current Price</div>
              </div>
            </div>
            
            {/* Additional Details */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500">24h High</div>
                  <div className="font-medium text-blue-800">
                    {formatCurrency(selectedMetal.high_24h) || 'N/A'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">24h Low</div>
                  <div className="font-medium text-blue-800">
                    {formatCurrency(selectedMetal.low_24h) || 'N/A'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Updated</div>
                  <div className="font-medium text-blue-800">
                    {selectedMetal.price_as_of_date ? new Date(selectedMetal.price_as_of_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Metal Type (only for edit mode or if no selection yet) */}
        {(isEditMode || !selectedMetal) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metal Type*
            </label>
            <select
              value={metalType}
              onChange={(e) => setMetalType(e.target.value)}
              className="w-full p-2 border rounded"
              required
              disabled={isEditMode}
            >
              <option value="">-- Select Metal --</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Platinum">Platinum</option>
              <option value="Palladium">Palladium</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}
        
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
        
        {/* Purity */}
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
        
        {/* Purchase Price */}
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