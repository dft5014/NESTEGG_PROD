// frontend/components/modals/AddRealEstatePositionModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';

const AddRealEstatePositionModal = ({ isOpen, onClose, accountId, onPositionAdded }) => {
  // --- State for Real Estate Fields ---
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState(""); // e.g., Residential, Commercial, Land
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [estimatedValue, setEstimatedValue] = useState(""); // Current estimated market value
  // Add other relevant fields: e.g., squareFootage, bedrooms, bathrooms, rentalIncome, mortgageBalance etc.
  const [notes, setNotes] = useState("");

  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset state
  useEffect(() => {
    if (isOpen) {
      setAddress("");
      setPropertyType("");
      setPurchasePrice("");
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setEstimatedValue("");
      setNotes("");
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen, accountId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // --- Validation ---
    if (!accountId || !address || !propertyType || !purchasePrice || purchasePrice <= 0 || !purchaseDate || !estimatedValue || estimatedValue <= 0) {
      setFormMessage("Please fill in all required fields (Address, Type, Purchase Price, Date, Estimated Value).");
      return;
    }

    setIsLoading(true);
    setFormMessage("");

    try {
      // --- Prepare Payload ---
      // Adapt this payload to match your actual backend model for real estate
      const payload = {
        address: address,
        property_type: propertyType,
        purchase_price: parseFloat(purchasePrice),
        purchase_date: purchaseDate,
        estimated_market_value: parseFloat(estimatedValue),
        notes: notes || null,
        // Add other fields here
      };

      // --- API Call ---
      // Replace '/realestate/' with your actual endpoint
      const response = await fetchWithAuth(`/realestate/${accountId}`, { 
        method: "POST",
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Real Estate position added successfully!");
        setIsLoading(false);
        if (onPositionAdded) {
          onPositionAdded(responseData);
        }
        setTimeout(() => {
          onClose(); 
        }, 1000);
      } else {
        setFormMessage(`Failed to add position: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error adding real estate position:", error);
      setFormMessage(`Error adding position: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Real Estate to Account ${accountId || ''}`} size="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
         {/* --- Real Estate Form Fields --- */}
         <div>
             <label htmlFor="reAddress" className="block text-sm font-medium text-gray-700 mb-1">Property Address*</label>
             <input id="reAddress" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 123 Main St, Anytown" className="modal-input w-full" required disabled={isLoading} />
         </div>
          <div>
             <label htmlFor="rePropertyType" className="block text-sm font-medium text-gray-700 mb-1">Property Type*</label>
             <select id="rePropertyType" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="modal-input w-full" required disabled={isLoading}>
                  <option value="" disabled>-- Select Type --</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Land">Land</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Other">Other</option>
             </select>
         </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                 <label htmlFor="rePurchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)*</label>
                 <input id="rePurchasePrice" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="e.g., 500000" className="modal-input w-full" min="1" step="any" required disabled={isLoading} />
             </div>
             <div>
                 <label htmlFor="rePurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
                 <input id="rePurchaseDate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="modal-input w-full" max={new Date().toISOString().split('T')[0]} required disabled={isLoading} />
               </div>
          </div>
           <div>
             <label htmlFor="reEstimatedValue" className="block text-sm font-medium text-gray-700 mb-1">Current Estimated Value ($)*</label>
             <input id="reEstimatedValue" type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="e.g., 650000" className="modal-input w-full" min="1" step="any" required disabled={isLoading} />
         </div>
         {/* Add inputs for other fields as needed */}
         <div>
             <label htmlFor="reNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
             <textarea id="reNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details about the property..." className="modal-input w-full" rows="2" disabled={isLoading}></textarea>
         </div>

        {formMessage && (
          <p className={`text-sm ${formMessage.includes("Error") || formMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
            {formMessage}
          </p>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button type="submit" className="modal-submit-btn" disabled={isLoading || !address || !propertyType || !purchasePrice || !purchaseDate || !estimatedValue}>
            {isLoading ? "Adding..." : "Add Real Estate"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddRealEstatePositionModal; // Placeholder - Adapt to your needs