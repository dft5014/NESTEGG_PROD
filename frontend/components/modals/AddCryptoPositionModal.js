// frontend/components/modals/AddCryptoPositionModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';
// Assuming you might have crypto search/lookup later
// import CryptoSearch from './CryptoSearch'; // Placeholder for a potential search component

const AddCryptoPositionModal = ({ isOpen, onClose, accountId, onPositionAdded }) => {
  const [coinSymbol, setCoinSymbol] = useState(""); // e.g., BTC, ETH
  const [coinType, setCoinType] = useState(""); // e.g., Bitcoin, Ethereum
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState(""); // Need a way to fetch/input this
  const [purchaseDate, setPurchaseDate] = useState("");
  const [storageType, setStorageType] = useState("Exchange"); // Default
  const [exchangeName, setExchangeName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [notes, setNotes] = useState("");
  // const [tags, setTags] = useState([]); // Handle tags later if needed
  // const [isFavorite, setIsFavorite] = useState(false); // Handle later if needed

  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes or accountId changes
  useEffect(() => {
    if (isOpen) {
      setCoinSymbol("");
      setCoinType("");
      setQuantity("");
      setPurchasePrice("");
      setCurrentPrice(""); // Reset or fetch? Decide on UX
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setStorageType("Exchange");
      setExchangeName("");
      setWalletAddress("");
      setNotes("");
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen, accountId]);

  // Fetch current price (example placeholder - needs real implementation)
  useEffect(() => {
      if(coinSymbol) {
          // Placeholder: In a real app, fetch price via API based on coinSymbol
          // Example: fetchCryptoPrice(coinSymbol).then(price => setCurrentPrice(price));
          console.log(`TODO: Fetch current price for ${coinSymbol}`);
          // For now, let's use purchase price as a placeholder if current is empty
          if (!currentPrice && purchasePrice) {
             // setCurrentPrice(purchasePrice); // Or leave it blank for user input
          }
      }
  }, [coinSymbol, purchasePrice]); // Re-fetch/check when symbol or purchase price changes?


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId || !coinSymbol || !coinType || !quantity || quantity <= 0 || !purchasePrice || purchasePrice <= 0 || !purchaseDate || !currentPrice || currentPrice <= 0) {
      setFormMessage("Please fill in all required fields (Symbol, Type, Quantity, Purchase Price, Current Price, Date).");
      return;
    }
     if (storageType === 'Exchange' && !exchangeName) {
         setFormMessage("Please provide the Exchange Name.");
         return;
     }
     if (storageType !== 'Exchange' && !walletAddress && storageType !== 'Paper Wallet') { // Paper wallet might not have address
         setFormMessage("Please provide the Wallet Address or type.");
         return;
     }

    setIsLoading(true);
    setFormMessage("");

    try {
      const payload = {
        coin_symbol: coinSymbol.toUpperCase(),
        coin_type: coinType,
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice),
        current_price: parseFloat(currentPrice), // Send current price
        purchase_date: purchaseDate,
        storage_type: storageType,
        exchange_name: storageType === 'Exchange' ? exchangeName : null,
        wallet_address: storageType !== 'Exchange' ? walletAddress : null,
        notes: notes || null,
        // tags: tags, // Add later if implemented
        // is_favorite: isFavorite, // Add later if implemented
      };

      const response = await fetchWithAuth(`/crypto/${accountId}`, { // Use the correct endpoint
        method: "POST",
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Crypto position added successfully!");
        setIsLoading(false);
        if (onPositionAdded) {
          onPositionAdded(responseData);
        }
        setTimeout(() => {
          onClose(); // Close modal after success
        }, 1000);
      } else {
        setFormMessage(`Failed to add crypto position: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error adding crypto position:", error);
      setFormMessage(`Error adding crypto position: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Crypto to Account ${accountId || ''}`} size="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Coin Details */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label htmlFor="coinSymbol" className="block text-sm font-medium text-gray-700 mb-1">Coin Symbol*</label>
             <input
               id="coinSymbol"
               type="text"
               value={coinSymbol}
               onChange={(e) => setCoinSymbol(e.target.value.toUpperCase())}
               placeholder="e.g., BTC, ETH, SOL"
               className="modal-input w-full"
               required
               disabled={isLoading}
             />
             {/* TODO: Add crypto search/lookup component here? */}
           </div>
           <div>
             <label htmlFor="coinType" className="block text-sm font-medium text-gray-700 mb-1">Coin Type / Name*</label>
             <input
               id="coinType"
               type="text"
               value={coinType}
               onChange={(e) => setCoinType(e.target.value)}
               placeholder="e.g., Bitcoin, Ethereum"
               className="modal-input w-full"
               required
               disabled={isLoading}
             />
           </div>
         </div>

        {/* Quantity & Price */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity*</label>
             <input
               id="quantity"
               type="number"
               value={quantity}
               onChange={(e) => setQuantity(e.target.value)}
               placeholder="e.g., 0.5"
               className="modal-input w-full"
               min="0.00000001" // Allow small fractions
               step="any"
               required
               disabled={isLoading}
             />
           </div>
            <div>
              <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)*</label>
              <input
                id="purchasePrice"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="e.g., 40000.50"
                className="modal-input w-full"
                min="0.01"
                step="0.01"
                required
                disabled={isLoading}
              />
            </div>
             <div>
              <label htmlFor="currentPrice" className="block text-sm font-medium text-gray-700 mb-1">Current Price ($)*</label>
              <input
                id="currentPrice"
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                 placeholder="Auto-fetch or Manual"
                className="modal-input w-full"
                min="0.01"
                step="0.01"
                required
                disabled={isLoading} // Or potentially disable if auto-fetched
              />
               {/* TODO: Add a button to fetch current price? */}
            </div>
         </div>
          
         {/* Purchase Date */}
          <div>
             <label htmlFor="cryptoPurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
             <input
               id="cryptoPurchaseDate"
               type="date"
               value={purchaseDate}
               onChange={(e) => setPurchaseDate(e.target.value)}
               className="modal-input w-full"
               max={new Date().toISOString().split('T')[0]}
               required
               disabled={isLoading}
             />
           </div>

         {/* Storage Details */}
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Type*</label>
             <select
                 value={storageType}
                 onChange={(e) => setStorageType(e.target.value)}
                 className="modal-input w-full"
                 required
             >
                 <option value="Exchange">Exchange</option>
                 <option value="Hardware Wallet">Hardware Wallet</option>
                 <option value="Software Wallet">Software Wallet</option>
                 <option value="Paper Wallet">Paper Wallet</option>
                 <option value="Other">Other</option>
             </select>
         </div>
         
         {storageType === 'Exchange' && (
              <div>
                 <label htmlFor="exchangeName" className="block text-sm font-medium text-gray-700 mb-1">Exchange Name*</label>
                  <input
                      id="exchangeName"
                      type="text"
                      value={exchangeName}
                      onChange={(e) => setExchangeName(e.target.value)}
                      placeholder="e.g., Coinbase, Binance"
                      className="modal-input w-full"
                      required={storageType === 'Exchange'}
                      disabled={isLoading}
                  />
              </div>
         )}
         
         {storageType !== 'Exchange' && (
              <div>
                 <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-1">Wallet Address / Type*</label>
                  <input
                      id="walletAddress"
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="e.g., Ledger Nano S, Exodus Wallet, bc1q..."
                      className="modal-input w-full"
                      required={storageType !== 'Exchange' && storageType !== 'Paper Wallet'}
                      disabled={isLoading}
                  />
              </div>
         )}

         {/* Notes */}
          <div>
            <label htmlFor="cryptoNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              id="cryptoNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any relevant notes about this holding..."
              className="modal-input w-full"
              rows="2"
              disabled={isLoading}
            ></textarea>
          </div>


        {formMessage && (
          <p className={`text-sm ${formMessage.includes("Error") || formMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
            {formMessage}
          </p>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="modal-submit-btn"
            disabled={isLoading || !coinSymbol || !quantity || !purchasePrice || !currentPrice || !purchaseDate}
          >
            {isLoading ? "Adding..." : "Add Crypto Position"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddCryptoPositionModal;