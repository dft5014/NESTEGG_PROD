// frontend/components/modals/EditRealEstatePositionModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';

const EditRealEstatePositionModal = ({ isOpen, onClose, positionData, onPositionUpdated }) => {
   // positionData should contain all relevant real estate fields including id
   const [formData, setFormData] = useState({});
   const [formMessage, setFormMessage] = useState("");
   const [isLoading, setIsLoading] = useState(false);

   // Pre-fill form
   useEffect(() => {
       if (isOpen && positionData) {
            const formattedDate = positionData.purchase_date 
                                   ? new Date(positionData.purchase_date).toISOString().split('T')[0] 
                                   : "";
           setFormData({
               id: positionData.id,
               account_id: positionData.account_id, // Needed for context? Usually not editable
               address: positionData.address || "",
               property_type: positionData.property_type || "",
               purchase_price: positionData.purchase_price?.toString() || "",
               purchase_date: formattedDate,
               estimated_market_value: positionData.estimated_market_value?.toString() || "",
               notes: positionData.notes || "",
               // Add other fields from positionData
           });
           setFormMessage("");
           setIsLoading(false);
       }
   }, [isOpen, positionData]);

   const handleChange = (e) => {
       const { name, value } = e.target;
       setFormData(prev => ({ ...prev, [name]: value }));
   };

   const handleSubmit = async (e) => {
       e.preventDefault();
       // --- Validation ---
        if (!formData.id || !formData.address || !formData.property_type || !formData.purchase_price || formData.purchase_price <= 0 || !formData.purchase_date || !formData.estimated_market_value || formData.estimated_market_value <= 0) {
          setFormMessage("Please fill in all required fields.");
          return;
        }

       setIsLoading(true);
       setFormMessage("");

       try {
           // --- Prepare Payload ---
           // Adapt payload to only include editable fields or match backend update model
           const payload = {
                address: formData.address,
                property_type: formData.property_type,
                purchase_price: parseFloat(formData.purchase_price),
                purchase_date: formData.purchase_date,
                estimated_market_value: parseFloat(formData.estimated_market_value),
                notes: formData.notes || null,
                // Add other editable fields
           };

           // --- API Call ---
           // Replace '/realestate/' with your actual endpoint
           const response = await fetchWithAuth(`/realestate/${formData.id}`, { // PUT to specific ID
               method: "PUT",
               body: JSON.stringify(payload),
           });

           const responseData = await response.json();

           if (response.ok) {
               setFormMessage("Real Estate position updated successfully!");
               setIsLoading(false);
               if (onPositionUpdated) {
                    onPositionUpdated({ ...positionData, ...payload, purchase_date: formData.purchase_date }); 
               }
               setTimeout(() => {
                   onClose(); 
               }, 1000);
           } else {
               setFormMessage(`Failed to update position: ${responseData.detail || JSON.stringify(responseData)}`);
               setIsLoading(false);
           }
       } catch (error) {
           console.error("Error updating real estate position:", error);
           setFormMessage(`Error updating position: ${error.message}`);
           setIsLoading(false);
       }
   };

   return (
       <Modal isOpen={isOpen} onClose={onClose} title={`Edit Real Estate: ${formData.address || ''}`} size="max-w-lg">
           <form onSubmit={handleSubmit} className="space-y-4">
                {/* --- Real Estate Form Fields (Editable) --- */}
                <div>
                   <label htmlFor="editReAddress" className="block text-sm font-medium text-gray-700 mb-1">Property Address*</label>
                   <input id="editReAddress" name="address" type="text" value={formData.address || ""} onChange={handleChange} className="modal-input w-full" required disabled={isLoading} />
               </div>
                <div>
                   <label htmlFor="editRePropertyType" className="block text-sm font-medium text-gray-700 mb-1">Property Type*</label>
                   <select id="editRePropertyType" name="property_type" value={formData.property_type || ""} onChange={handleChange} className="modal-input w-full" required disabled={isLoading}>
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
                       <label htmlFor="editRePurchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price ($)*</label>
                       <input id="editRePurchasePrice" name="purchase_price" type="number" value={formData.purchase_price || ""} onChange={handleChange} className="modal-input w-full" min="1" step="any" required disabled={isLoading} />
                   </div>
                   <div>
                       <label htmlFor="editRePurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
                       <input id="editRePurchaseDate" name="purchase_date" type="date" value={formData.purchase_date || ""} onChange={handleChange} className="modal-input w-full" max={new Date().toISOString().split('T')[0]} required disabled={isLoading} />
                     </div>
                </div>
                 <div>
                   <label htmlFor="editReEstimatedValue" className="block text-sm font-medium text-gray-700 mb-1">Current Estimated Value ($)*</label>
                   <input id="editReEstimatedValue" name="estimated_market_value" type="number" value={formData.estimated_market_value || ""} onChange={handleChange} className="modal-input w-full" min="1" step="any" required disabled={isLoading} />
               </div>
               {/* Add inputs for other editable fields */}
               <div>
                   <label htmlFor="editReNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                   <textarea id="editReNotes" name="notes" value={formData.notes || ""} onChange={handleChange} className="modal-input w-full" rows="2" disabled={isLoading}></textarea>
               </div>

               {formMessage && (
                 <p className={`text-sm ${formMessage.includes("Error") || formMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                   {formMessage}
                 </p>
               )}

               <div className="flex justify-end space-x-3 pt-2">
                 <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isLoading}>Cancel</button>
                 <button type="submit" className="modal-submit-btn" disabled={isLoading /* Add other validation checks */}>
                   {isLoading ? "Saving..." : "Save Changes"}
                 </button>
               </div>
           </form>
       </Modal>
   );
};

export default EditRealEstatePositionModal; // Placeholder - Adapt to your needs