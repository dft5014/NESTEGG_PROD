// frontend/components/modals/AddMetalPositionModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';

const AddMetalPositionModal = ({ isOpen, onClose, accountId, onPositionAdded }) => {
  const [metalType, setMetalType] = useState(""); // Gold, Silver, Platinum, Palladium
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("oz"); // Default: troy ounces
  const [purity, setPurity] = useState("999"); // Default: 999 (24K for gold)
  const [purchasePrice, setPurchasePrice] = useState(""); // Price per unit
  const [costBasis, setCostBasis] = useState(""); // Optional: Price per unit
  const [purchaseDate, setPurchaseDate] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [description, setDescription] = useState("");

  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset state
  useEffect(() => {
    if (isOpen) {
      setMetalType("");
      setQuantity("");
      setUnit("oz");
      setPurity("999");
      setPurchasePrice("");
      setCostBasis("");
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setStorageLocation("");
      setDescription("");
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen, accountId]);

   // Set cost basis to purchase price if cost basis is cleared
   useEffect(() => {
       if (!costBasis && purchasePrice) {
           // Optionally default cost basis to purchase price if left blank
           // setCostBasis(purchasePrice); 
       }
   }, [purchasePrice, costBasis]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId || !metalType || !quantity || quantity <= 0 || !unit || !purchasePrice || purchasePrice <= 0 || !purchaseDate) {
      setFormMessage("Please fill in all required fields (Metal Type, Quantity, Unit, Purchase Price, Date).");
      return;
    }

    setIsLoading(true);
    setFormMessage("");

    try {
      // Use cost basis if provided, otherwise default to purchase price on backend
      const finalCostBasis = costBasis ? parseFloat(costBasis) : null; 

      const payload = {
        metal_type: metalType,
        quantity: parseFloat(quantity),
        unit: unit,
        purity: purity || null, // Send null if empty
        purchase_price: parseFloat(purchasePrice),
        cost_basis: finalCostBasis, 
        purchase_date: purchaseDate,
        storage_location: storageLocation || null,
        description: description || null,
      };

      const response = await fetchWithAuth(`/metals/${accountId}`, { // Use the correct endpoint
        method: "POST",
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Metal position added successfully!");
        setIsLoading(false);
        if (onPositionAdded) {
          onPositionAdded(responseData);
        }
        setTimeout(() => {
          onClose(); // Close modal after success
        }, 1000);
      } else {
        setFormMessage(`Failed to add metal position: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error adding metal position:", error);
      setFormMessage(`Error adding metal position: ${error.message}`);
      setIsLoading(false);
    }
  };

  const totalValue = (parseFloat(quantity || 0) * parseFloat(purchasePrice || 0)).toFixed(2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Metal to Account ${accountId || ''}`} size="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
         {/* Metal Type & Purity */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                 <label htmlFor="metalType" className="block text-sm font-medium text-gray-700 mb-1">Metal Type*</label>
                 <select id="metalType" value={metalType} onChange={(e) => setMetalType(e.target.value)} className="modal-input w-full" required disabled={isLoading}>
                     <option value="" disabled>-- Select Metal --</option>
                     <option value="Gold">Gold</option>
                     <option value="Silver">Silver</option>
                     <option value="Platinum">Platinum</option>
                     <option value="Palladium">Palladium</option>
                     <option value="Other">Other</option>
                 </select>
             </div>
             <div>
                 <label htmlFor="purity" className="block text-sm font-medium text-gray-700 mb-1">Purity (e.g., 999, 9999)</label>
                 <input id="purity" type="text" value={purity} onChange={(e) => setPurity(e.target.value)} placeholder="e.g., 999 or 22K" className="modal-input w-full" disabled={isLoading} />
             </div>
         </div>

         {/* Quantity & Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label htmlFor="metalQuantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity*</label>
                 <input id="metalQuantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 10" className="modal-input w-full" min="0.001" step="any" required disabled={isLoading} />
             </div>
              <div>
                 <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">Unit*</label>
                 <select id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="modal-input w-full" required disabled={isLoading}>
                      <option value="oz">Troy Ounce (oz)</option>
                      <option value="g">Gram (g)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="lb">Pound (lb)</option>
                      <option value="item">Item(s)</option> {/* For coins/bars */}
                 </select>
             </div>
          </div>
          
         {/* Purchase Price & Cost Basis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label htmlFor="metalPurchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (per {unit})*</label>
                 <input id="metalPurchasePrice" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="e.g., 1800.50" className="modal-input w-full" min="0.01" step="0.01" required disabled={isLoading} />
             </div>
              <div>
                 <label htmlFor="metalCostBasis" className="block text-sm font-medium text-gray-700 mb-1">Cost Basis (per {unit}, Optional)</label>
                 <input id="metalCostBasis" type="number" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} placeholder="Defaults to Purchase Price" className="modal-input w-full" min="0.01" step="0.01" disabled={isLoading} />
             </div>
          </div>

         {/* Purchase Date */}
          <div>
             <label htmlFor="metalPurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
             <input id="metalPurchaseDate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="modal-input w-full" max={new Date().toISOString().split('T')[0]} required disabled={isLoading} />
           </div>

          {/* Storage & Description */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="storageLocation" className="block text-sm font-medium text-gray-700 mb-1">Storage Location (Optional)</label>
                   <input id="storageLocation" type="text" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="e.g., Home Safe, Bank Vault" className="modal-input w-full" disabled={isLoading} />
               </div>
               <div>
                   <label htmlFor="metalDescription" className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                   <input id="metalDescription" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., 10x 1oz Gold Eagle Coins" className="modal-input w-full" disabled={isLoading} />
               </div>
            </div>

         {/* Display Calculated Value */}
         <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
             <p>Estimated Purchase Value: <span className="font-semibold">${totalValue}</span></p>
             <p className="text-xs text-gray-500">(Based on purchase price, not current market value)</p>
         </div>


        {formMessage && (
          <p className={`text-sm ${formMessage.includes("Error") || formMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
            {formMessage}
          </p>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button type="submit" className="modal-submit-btn" disabled={isLoading || !metalType || !quantity || !unit || !purchasePrice || !purchaseDate}>
            {isLoading ? "Adding..." : "Add Metal Position"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMetalPositionModal;