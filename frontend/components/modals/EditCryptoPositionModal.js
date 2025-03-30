// frontend/components/modals/EditCryptoPositionModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';

const EditCryptoPositionModal = ({ isOpen, onClose, positionData, onPositionUpdated }) => {
  // positionData expected structure based on CryptoPositionCreate/Update
   const [formData, setFormData] = useState({});
   const [formMessage, setFormMessage] = useState("");
   const [isLoading, setIsLoading] = useState(false);

  // Pre-fill form when modal opens
  useEffect(() => {
    if (isOpen && positionData) {
       // Format date correctly for input type="date"
       const formattedDate = positionData.purchase_date 
                             ? new Date(positionData.purchase_date).toISOString().split('T')[0] 
                             : "";
      setFormData({
        id: positionData.id,
        account_id: positionData.account_id,
        coin_symbol: positionData.coin_symbol || "",
        coin_type: positionData.coin_type || "",
        quantity: positionData.quantity?.toString() || "",
        purchase_price: positionData.purchase_price?.toString() || "",
        current_price: positionData.current_price?.toString() || "", // Allow editing current price? Or fetch?
        purchase_date: formattedDate,
        storage_type: positionData.storage_type || "Exchange",
        exchange_name: positionData.exchange_name || "",
        wallet_address: positionData.wallet_address || "",
        notes: positionData.notes || "",
        // tags: positionData.tags || [], // Handle later
        // is_favorite: positionData.is_favorite || false, // Handle later
      });
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen, positionData]);

  const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : value
      }));

      // Reset conditional fields if storage type changes
      if (name === 'storage_type') {
           setFormData(prev => ({
               ...prev,
               exchange_name: value === 'Exchange' ? prev.exchange_name : '',
               wallet_address: value !== 'Exchange' ? prev.wallet_address : '',
           }));
       }
  };

  // Example: Function to fetch current price
  const fetchCurrentPrice = async () => {
      if (!formData.coin_symbol) return;
      console.log(`TODO: Implement fetchCurrentPrice for ${formData.coin_symbol}`);
      // Example API call:
      // const price = await getCryptoPrice(formData.coin_symbol);
      // if (price) {
      //     setFormData(prev => ({ ...prev, current_price: price.toString() }));
      // } else {
      //     setFormMessage("Could not fetch current price.");
      // }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
     if (!formData.id || !formData.quantity || parseFloat(formData.quantity) <= 0 || !formData.purchase_price || parseFloat(formData.purchase_price) <= 0 || !formData.purchase_date || !formData.current_price || parseFloat(formData.current_price) <= 0) {
       setFormMessage("Please fill in all required fields (Quantity, Prices, Date).");
       return;
     }
      if (formData.storage_type === 'Exchange' && !formData.exchange_name) {
         setFormMessage("Please provide the Exchange Name.");
         return;
     }
      if (formData.storage_type !== 'Exchange' && !formData.wallet_address && formData.storage_type !== 'Paper Wallet') {
         setFormMessage("Please provide the Wallet Address or type.");
         return;
     }

    setIsLoading(true);
    setFormMessage("");

    try {
      // Prepare payload based on CryptoPositionUpdate model (send only changed fields?)
      // For simplicity, sending all editable fields for now.
      const payload = {
        coin_symbol: formData.coin_symbol, // Typically not editable, but included if needed
        coin_type: formData.coin_type, // Typically not editable
        quantity: parseFloat(formData.quantity),
        purchase_price: parseFloat(formData.purchase_price),
        current_price: parseFloat(formData.current_price),
        purchase_date: formData.purchase_date,
        storage_type: formData.storage_type,
        exchange_name: formData.storage_type === 'Exchange' ? formData.exchange_name : null,
        wallet_address: formData.storage_type !== 'Exchange' ? formData.wallet_address : null,
        notes: formData.notes || null,
        // tags: formData.tags, // Add later
        // is_favorite: formData.is_favorite, // Add later
      };

      const response = await fetchWithAuth(`/crypto/${formData.id}`, { // Use PUT request to specific position ID
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Crypto position updated successfully!");
        setIsLoading(false);
        if (onPositionUpdated) {
           // Pass back the updated form data (or refetch)
           onPositionUpdated({ ...positionData, ...payload, purchase_date: formData.purchase_date }); 
        }
        setTimeout(() => {
          onClose(); // Close modal after success
        }, 1000);
      } else {
        setFormMessage(`Failed to update crypto position: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error updating crypto position:", error);
      setFormMessage(`Error updating crypto position: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Crypto: ${formData?.coin_symbol || ''}`} size="max-w-lg">
       <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Symbol/Type (Not Editable) */}
           <div className="p-3 bg-gray-100 rounded-lg text-sm">
               <p>Symbol: <span className="font-semibold">{formData.coin_symbol}</span></p>
               <p>Type: <span className="font-semibold">{formData.coin_type}</span></p>
           </div>

          {/* Quantity & Prices */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <label htmlFor="editQuantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity*</label>
                  <input id="editQuantity" name="quantity" type="number" value={formData.quantity || ""} onChange={handleChange} placeholder="e.g., 0.5" className="modal-input w-full" min="0.00000001" step="any" required disabled={isLoading} />
              </div>
               <div>
                  <label htmlFor="editPurchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)*</label>
                   <input id="editPurchasePrice" name="purchase_price" type="number" value={formData.purchase_price || ""} onChange={handleChange} placeholder="e.g., 40000.50" className="modal-input w-full" min="0.01" step="0.01" required disabled={isLoading} />
               </div>
               <div>
                  <label htmlFor="editCurrentPrice" className="block text-sm font-medium text-gray-700 mb-1">Current Price ($)*</label>
                   <div className="flex items-center">
                       <input id="editCurrentPrice" name="current_price" type="number" value={formData.current_price || ""} onChange={handleChange} placeholder="Current Market Price" className="modal-input w-full" min="0.01" step="0.01" required disabled={isLoading} />
                       {/* Optional: Button to fetch price */}
                       {/* <button type="button" onClick={fetchCurrentPrice} className="ml-2 p-1 border rounded text-xs" title="Fetch Current Price">🔄</button> */}
                   </div>
               </div>
           </div>

            {/* Purchase Date */}
            <div>
               <label htmlFor="editCryptoPurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
               <input id="editCryptoPurchaseDate" name="purchase_date" type="date" value={formData.purchase_date || ""} onChange={handleChange} className="modal-input w-full" max={new Date().toISOString().split('T')[0]} required disabled={isLoading} />
           </div>

           {/* Storage Details */}
           <div>
               <label htmlFor="editStorageType" className="block text-sm font-medium text-gray-700 mb-1">Storage Type*</label>
               <select id="editStorageType" name="storage_type" value={formData.storage_type || "Exchange"} onChange={handleChange} className="modal-input w-full" required>
                   <option value="Exchange">Exchange</option>
                   <option value="Hardware Wallet">Hardware Wallet</option>
                   <option value="Software Wallet">Software Wallet</option>
                   <option value="Paper Wallet">Paper Wallet</option>
                   <option value="Other">Other</option>
               </select>
           </div>
           
           {formData.storage_type === 'Exchange' && (
               <div>
                   <label htmlFor="editExchangeName" className="block text-sm font-medium text-gray-700 mb-1">Exchange Name*</label>
                    <input id="editExchangeName" name="exchange_name" type="text" value={formData.exchange_name || ""} onChange={handleChange} placeholder="e.g., Coinbase, Binance" className="modal-input w-full" required={formData.storage_type === 'Exchange'} disabled={isLoading} />
               </div>
           )}
           
           {formData.storage_type !== 'Exchange' && (
               <div>
                   <label htmlFor="editWalletAddress" className="block text-sm font-medium text-gray-700 mb-1">Wallet Address / Type*</label>
                    <input id="editWalletAddress" name="wallet_address" type="text" value={formData.wallet_address || ""} onChange={handleChange} placeholder="e.g., Ledger Nano S, Exodus Wallet, bc1q..." className="modal-input w-full" required={formData.storage_type !== 'Exchange' && formData.storage_type !== 'Paper Wallet'} disabled={isLoading} />
               </div>
           )}

           {/* Notes */}
            <div>
               <label htmlFor="editCryptoNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
               <textarea id="editCryptoNotes" name="notes" value={formData.notes || ""} onChange={handleChange} placeholder="Any relevant notes..." className="modal-input w-full" rows="2" disabled={isLoading}></textarea>
           </div>

           {/* Display Calculated Value */}
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                <p>Current Value: <span className="font-semibold">${(parseFloat(formData.quantity || 0) * parseFloat(formData.current_price || 0)).toFixed(2)}</span></p>
            </div>

           {formMessage && (
             <p className={`text-sm ${formMessage.includes("Error") || formMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
               {formMessage}
             </p>
           )}

           <div className="flex justify-end space-x-3 pt-2">
             <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isLoading}>Cancel</button>
             <button type="submit" className="modal-submit-btn" disabled={isLoading || !formData.quantity || !formData.purchase_price || !formData.current_price || !formData.purchase_date}>
               {isLoading ? "Saving..." : "Save Changes"}
             </button>
           </div>
       </form>
    </Modal>
  );
};

export default EditCryptoPositionModal;