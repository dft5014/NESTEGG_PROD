// components/modals/CryptoPositionModal.js
import React, { useState, useEffect, useCallback } from 'react';
import FixedModal from './FixedModal';
import { addCryptoPosition, updatePosition, searchSecurities } from '@/utils/apimethods/positionMethods';
import debounce from 'lodash.debounce';
import { 
  Search, X, Check, TrendingUp, TrendingDown, 
  DollarSign, Tag, BarChart4, Plus
} from 'lucide-react';

const CryptoPositionModal = ({ isOpen, onClose, accountId, accountName = '', onPositionSaved, positionToEdit = null }) => {
  // State for form fields
  const [coinSymbol, setCoinSymbol] = useState('');
  const [coinType, setCoinType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [storageType, setStorageType] = useState('Exchange');
  const [notes, setNotes] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState(null);

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
        setCoinSymbol(positionToEdit.coin_symbol || '');
        setCoinType(positionToEdit.coin_type || '');
        setQuantity(positionToEdit.quantity?.toString() || '');
        setPurchasePrice(positionToEdit.purchase_price?.toString() || '');
        
        // Format date from ISO to YYYY-MM-DD for input
        setPurchaseDate(positionToEdit.purchase_date 
          ? new Date(positionToEdit.purchase_date).toISOString().split('T')[0]
          : '');
        
        setStorageType(positionToEdit.storage_type || 'Exchange');
        setNotes(positionToEdit.notes || '');
        
        // Set selectedCrypto with market data if available
        if (positionToEdit.coin_symbol) {
          setSelectedCrypto({
            symbol: positionToEdit.coin_symbol,
            name: positionToEdit.coin_type || positionToEdit.coin_symbol,
            price: positionToEdit.current_price,
            price_as_of_date: new Date().toISOString() // Placeholder, would come from data
          });
        }
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setCoinSymbol('');
        setCoinType('');
        setQuantity('');
        setPurchasePrice('');
        setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
        setStorageType('Exchange');
        setNotes('');
        setSelectedCrypto(null);
      }
      
      // Common reset
      setSearchQuery('');
      setSearchResults([]);
      setFormMessage('');
      setMessageType('');
      setIsSubmitting(false);
    }
  }, [isOpen, positionToEdit]);

  // Temporarily use searchSecurities with conversion to crypto format
  // This is a workaround until searchFXAssets is implemented
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      
      try {
        // Use existing searchSecurities function as a temporary replacement
        // In the future, replace with searchFXAssets
        const results = await searchSecurities(query);
        
        // Convert security format to crypto format
        const mappedResults = results.map(security => ({
          symbol: security.ticker,
          name: security.name || security.ticker,
          price: security.price,
          price_as_of_date: new Date().toISOString(),
          high_24h: security.price * 1.05, // Mock data
          low_24h: security.price * 0.95,  // Mock data
          volume_24h: 0
        }));
        
        setSearchResults(mappedResults);
      } catch (error) {
        console.error('Error searching cryptocurrencies:', error);
        setFormMessage('Error searching for cryptocurrencies. Please try again.');
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

  // Handle selecting a crypto from search results
  const handleSelectCrypto = (crypto) => {
    setSelectedCrypto(crypto);
    setCoinSymbol(crypto.symbol);
    setCoinType(crypto.name);
    setSearchResults([]);
    setSearchQuery(''); // Clear search box after selection
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!coinSymbol || !coinType) {
      setFormMessage('Please enter the coin symbol and name');
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
      const cryptoData = {
        coin_symbol: coinSymbol.toUpperCase(),
        coin_type: coinType,
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice),
        current_price: selectedCrypto?.price || 0, // Use the price from selected crypto
        purchase_date: purchaseDate,
        storage_type: storageType,
        notes: notes || null
      };
      
      console.log(`${isEditMode ? 'Updating' : 'Adding'} crypto position:`, cryptoData);
      
      let result;
      
      if (isEditMode) {
        result = await updatePosition(positionToEdit.id, cryptoData, 'crypto');
      } else {
        result = await addCryptoPosition(accountId, cryptoData);
      }
      
      console.log(`Crypto position ${isEditMode ? 'updated' : 'added'}:`, result);
      
      // Show success message
      setFormMessage(`Crypto position ${isEditMode ? 'updated' : 'added'} successfully!`);
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
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} crypto position:`, error);
      setFormMessage(`Error ${isEditMode ? 'updating' : 'adding'} crypto position: ${error.message}`);
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
      title={`${isEditMode ? 'Edit' : 'Add'} Cryptocurrency Position`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Badge at the top */}
        <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Tag className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">
              {isEditMode ? 'Editing position on:' : 'Adding to:'} {accountName}
            </span>
          </div>
        </div>

        {/* Crypto Search */}
        {!isEditMode && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cryptocurrency Search*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by symbol or name (e.g., BTC, Bitcoin)"
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
                    onClick={() => handleSelectCrypto(result)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-blue-800">{result.symbol}</span>
                        <span className="ml-2 text-gray-700">{result.name}</span>
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
        
        {/* Selected Crypto Info Card */}
        {selectedCrypto && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                  {selectedCrypto.symbol.charAt(0)}
                </div>
                <div className="ml-3">
                  <div className="font-bold text-blue-900">{selectedCrypto.symbol}</div>
                  <div className="text-sm text-blue-700">{selectedCrypto.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{formatCurrency(selectedCrypto.price)}</div>
                <div className="text-sm text-gray-600">Current Price</div>
              </div>
            </div>
            
            {/* Additional Details */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500">24h High</div>
                  <div className="font-medium text-blue-800">
                    {formatCurrency(selectedCrypto.high_24h) || 'N/A'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">24h Low</div>
                  <div className="font-medium text-blue-800">
                    {formatCurrency(selectedCrypto.low_24h) || 'N/A'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Updated</div>
                  <div className="font-medium text-blue-800">
                    {selectedCrypto.price_as_of_date ? new Date(selectedCrypto.price_as_of_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Coin Symbol & Type (only for edit mode or if no selection yet) */}
        {(isEditMode || !selectedCrypto) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coin Symbol*
              </label>
              <input
                type="text"
                value={coinSymbol}
                onChange={(e) => setCoinSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., BTC, ETH"
                className="w-full p-2 border rounded"
                required
                disabled={isEditMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coin Name*
              </label>
              <input
                type="text"
                value={coinType}
                onChange={(e) => setCoinType(e.target.value)}
                placeholder="e.g., Bitcoin, Ethereum"
                className="w-full p-2 border rounded"
                required
                disabled={isEditMode}
              />
            </div>
          </div>
        )}
        
        {/* Quantity, Purchase Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity*
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 0.5"
              step="0.00000001"
              min="0.00000001"
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price ($)*
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="e.g., 40000.50"
              step="0.01"
              min="0"
              className="w-full p-2 border rounded"
              required
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
        
        {/* Storage Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Storage Type*
          </label>
          <select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="Exchange">Exchange</option>
            <option value="Hardware Wallet">Hardware Wallet</option>
            <option value="Software Wallet">Software Wallet</option>
            <option value="Paper Wallet">Paper Wallet</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information..."
            className="w-full p-2 border rounded"
            rows="2"
          />
        </div>
        
        {/* Current Value */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex justify-between">
            <span>Current Value:</span>
            <span className="font-semibold">
              {formatCurrency(parseFloat(quantity || 0) * parseFloat(selectedCrypto?.price || 0))}
            </span>
          </div>
          {purchasePrice && (
            <div className="flex justify-between text-sm mt-1">
              <span>Gain/Loss:</span>
              {(() => {
                const initialValue = parseFloat(quantity || 0) * parseFloat(purchasePrice || 0);
                const currentValue = parseFloat(quantity || 0) * parseFloat(selectedCrypto?.price || 0);
                const gainLoss = currentValue - initialValue;
                const gainLossPercent = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0;
                
                return (
                  <span className={gainLoss >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} 
                    ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                  </span>
                );
              })()}
            </div>
          )}
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

export default CryptoPositionModal;