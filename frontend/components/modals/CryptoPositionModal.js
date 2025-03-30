// Continuing frontend/components/modals/CryptoPositionModal.js
import React, { useState, useEffect } from 'react';
import FixedModal from './FixedModal';
import { addCryptoPosition, updatePosition } from '@/utils/apimethods/positionMethods';

const CryptoPositionModal = ({ isOpen, onClose, accountId, onPositionSaved, positionToEdit = null }) => {
  // State for form fields
  const [coinSymbol, setCoinSymbol] = useState('');
  const [coinType, setCoinType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [storageType, setStorageType] = useState('Exchange');
  const [exchangeName, setExchangeName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
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
        setCoinSymbol(positionToEdit.coin_symbol || '');
        setCoinType(positionToEdit.coin_type || '');
        setQuantity(positionToEdit.quantity?.toString() || '');
        setPurchasePrice(positionToEdit.purchase_price?.toString() || '');
        setCurrentPrice(positionToEdit.current_price?.toString() || '');
        
        // Format date from ISO to YYYY-MM-DD for input
        setPurchaseDate(positionToEdit.purchase_date 
          ? new Date(positionToEdit.purchase_date).toISOString().split('T')[0]
          : '');
        
        setStorageType(positionToEdit.storage_type || 'Exchange');
        setExchangeName(positionToEdit.exchange_name || '');
        setWalletAddress(positionToEdit.wallet_address || '');
        setNotes(positionToEdit.notes || '');
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setCoinSymbol('');
        setCoinType('');
        setQuantity('');
        setPurchasePrice('');
        setCurrentPrice('');
        setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
        setStorageType('Exchange');
        setExchangeName('');
        setWalletAddress('');
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
    
    if (!currentPrice || parseFloat(currentPrice) <= 0) {
      setFormMessage('Please enter a valid current price');
      setMessageType('error');
      return;
    }
    
    if (!purchaseDate) {
      setFormMessage('Please enter a purchase date');
      setMessageType('error');
      return;
    }
    
    if (storageType === 'Exchange' && !exchangeName) {
      setFormMessage('Please enter the exchange name');
      setMessageType('error');
      return;
    }
    
    if (storageType !== 'Exchange' && storageType !== 'Paper Wallet' && !walletAddress) {
      setFormMessage('Please enter the wallet address');
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
        current_price: parseFloat(currentPrice),
        purchase_date: purchaseDate,
        storage_type: storageType,
        exchange_name: storageType === 'Exchange' ? exchangeName : null,
        wallet_address: storageType !== 'Exchange' ? walletAddress : null,
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

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditMode ? 'Edit' : 'Add'} Cryptocurrency Position`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Coin Symbol & Type */}
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
        
        {/* Quantity, Prices */}
        <div className="grid grid-cols-3 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Price ($)*
            </label>
            <input
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="e.g., 45000.00"
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
        
        {/* Storage Details */}
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
        
        {/* Exchange or Wallet Details (conditional) */}
        {storageType === 'Exchange' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exchange Name*
            </label>
            <input
              type="text"
              value={exchangeName}
              onChange={(e) => setExchangeName(e.target.value)}
              placeholder="e.g., Coinbase, Binance"
              className="w-full p-2 border rounded"
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Address {storageType !== 'Paper Wallet' ? '*' : ''}
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
              className="w-full p-2 border rounded"
              required={storageType !== 'Paper Wallet'}
            />
          </div>
        )}
        
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
              ${(parseFloat(quantity || 0) * parseFloat(currentPrice || 0)).toFixed(2)}
            </span>
          </div>
          {purchasePrice && (
            <div className="flex justify-between text-sm mt-1">
              <span>Gain/Loss:</span>
              {(() => {
                const initialValue = parseFloat(quantity || 0) * parseFloat(purchasePrice || 0);
                const currentValue = parseFloat(quantity || 0) * parseFloat(currentPrice || 0);
                const gainLoss = currentValue - initialValue;
                const gainLossPercent = initialValue > 0 ? (gainLoss / initialValue) * 100 : 0;
                
                return (
                  <span className={gainLoss >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} 
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