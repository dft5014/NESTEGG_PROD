// frontend/components/modals/EditMetalPositionModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';

const EditMetalPositionModal = ({ isOpen, onClose, positionData, onPositionUpdated }) => {
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
                account_id: positionData.account_id,
                metal_type: positionData.metal_type || "",
                quantity: positionData.quantity?.toString() || "",
                unit: positionData.unit || "oz",
                purity: positionData.purity || "",
                purchase_price: positionData.purchase_price?.toString() || "",
                cost_basis: positionData.cost_basis?.toString() || "",
                purchase_date: formattedDate,
                storage_location: positionData.storage_location || "",
                description: positionData.description || "",
            });
            setFormMessage("");
            setIsLoading(false);
        }
    }, [isOpen, positionData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Update cost basis if purchase price changes and cost basis was empty or same as old purchase price
    useEffect(() => {
        if (formData.purchase_price && (!formData.cost_basis || parseFloat(formData.cost_basis) === parseFloat(positionData?.purchase_price || 0))) {
           // Optionally update cost basis to match new purchase price if it wasn't explicitly set differently
           // setFormData(prev => ({ ...prev, cost_basis: prev.purchase_price }));
        }
    }, [formData.purchase_price, positionData?.purchase_price]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id || !formData.metal_type || !formData.quantity || formData.quantity <= 0 || !formData.unit || !formData.purchase_price || formData.purchase_price <= 0 || !formData.purchase_date) {
          setFormMessage("Please fill in all required fields (Metal Type, Quantity, Unit, Purchase Price, Date).");
          return;
        }

        setIsLoading(true);
        setFormMessage("");

        try {
            // Prepare payload based on MetalPositionUpdate model
            const payload = {
                metal_type: formData.metal_type,
                quantity: parseFloat(formData.quantity),
                unit: formData.unit,
                purity: formData.purity || null,
                purchase_price: parseFloat(formData.purchase_price),
                cost_basis: formData.cost_basis ? parseFloat(formData.cost_basis) : null,
                purchase_date: formData.purchase_date,
                storage_location: formData.storage_location || null,
                description: formData.description || null,
            };

            const response = await fetchWithAuth(`/metals/${formData.id}`, { // PUT to specific ID
                method: "PUT",
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (response.ok) {
                setFormMessage("Metal position updated successfully!");
                setIsLoading(false);
                if (onPositionUpdated) {
                    onPositionUpdated({ ...positionData, ...payload, purchase_date: formData.purchase_date }); 
                }
                setTimeout(() => {
                    onClose(); // Close modal after success
                }, 1000);
            } else {
                setFormMessage(`Failed to update metal position: ${responseData.detail || JSON.stringify(responseData)}`);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Error updating metal position:", error);
            setFormMessage(`Error updating metal position: ${error.message}`);
            setIsLoading(false);
        }
    };
    
    const totalValue = (parseFloat(formData.quantity || 0) * parseFloat(formData.purchase_price || 0)).toFixed(2);
    const totalCostBasisValue = (parseFloat(formData.quantity || 0) * parseFloat(formData.cost_basis || formData.purchase_price || 0)).toFixed(2);


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Metal: ${formData.metal_type || ''}`} size="max-w-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                 {/* Metal Type & Purity */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                         <label htmlFor="editMetalType" className="block text-sm font-medium text-gray-700 mb-1">Metal Type*</label>
                         <select id="editMetalType" name="metal_type" value={formData.metal_type || ""} onChange={handleChange} className="modal-input w-full" required disabled={isLoading}>
                              <option value="" disabled>-- Select Metal --</option>
                              <option value="Gold">Gold</option>
                              <option value="Silver">Silver</option>
                              <option value="Platinum">Platinum</option>
                              <option value="Palladium">Palladium</option>
                              <option value="Other">Other</option>
                         </select>
                     </div>
                     <div>
                         <label htmlFor="editPurity" className="block text-sm font-medium text-gray-700 mb-1">Purity</label>
                         <input id="editPurity" name="purity" type="text" value={formData.purity || ""} onChange={handleChange} placeholder="e.g., 999 or 22K" className="modal-input w-full" disabled={isLoading} />
                     </div>
                 </div>

                 {/* Quantity & Unit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label htmlFor="editMetalQuantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity*</label>
                         <input id="editMetalQuantity" name="quantity" type="number" value={formData.quantity || ""} onChange={handleChange} className="modal-input w-full" min="0.001" step="any" required disabled={isLoading} />
                     </div>
                      <div>
                         <label htmlFor="editUnit" className="block text-sm font-medium text-gray-700 mb-1">Unit*</label>
                         <select id="editUnit" name="unit" value={formData.unit || "oz"} onChange={handleChange} className="modal-input w-full" required disabled={isLoading}>
                              <option value="oz">Troy Ounce (oz)</option>
                              <option value="g">Gram (g)</option>
                              <option value="kg">Kilogram (kg)</option>
                              <option value="lb">Pound (lb)</option>
                              <option value="item">Item(s)</option>
                         </select>
                     </div>
                  </div>
                  
                 {/* Purchase Price & Cost Basis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label htmlFor="editMetalPurchasePrice" className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (per {formData.unit || 'unit'})*</label>
                         <input id="editMetalPurchasePrice" name="purchase_price" type="number" value={formData.purchase_price || ""} onChange={handleChange} className="modal-input w-full" min="0.01" step="0.01" required disabled={isLoading} />
                     </div>
                      <div>
                         <label htmlFor="editMetalCostBasis" className="block text-sm font-medium text-gray-700 mb-1">Cost Basis (per {formData.unit || 'unit'}, Optional)</label>
                         <input id="editMetalCostBasis" name="cost_basis" type="number" value={formData.cost_basis || ""} onChange={handleChange} placeholder="Defaults to Purchase Price" className="modal-input w-full" min="0.01" step="0.01" disabled={isLoading} />
                     </div>
                  </div>

                 {/* Purchase Date */}
                  <div>
                     <label htmlFor="editMetalPurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
                     <input id="editMetalPurchaseDate" name="purchase_date" type="date" value={formData.purchase_date || ""} onChange={handleChange} className="modal-input w-full" max={new Date().toISOString().split('T')[0]} required disabled={isLoading} />
                   </div>

                  {/* Storage & Description */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="editStorageLocation" className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                           <input id="editStorageLocation" name="storage_location" type="text" value={formData.storage_location || ""} onChange={handleChange} placeholder="e.g., Home Safe" className="modal-input w-full" disabled={isLoading} />
                       </div>
                       <div>
                           <label htmlFor="editMetalDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                           <input id="editMetalDescription" name="description" type="text" value={formData.description || ""} onChange={handleChange} placeholder="e.g., 10x 1oz Gold Eagle Coins" className="modal-input w-full" disabled={isLoading} />
                       </div>
                    </div>

                 {/* Display Calculated Value */}
                 <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                     <p>Estimated Purchase Value: <span className="font-semibold">${totalValue}</span></p>
                     <p>Total Cost Basis Value: <span className="font-semibold">${totalCostBasisValue}</span></p>
                     <p className="text-xs text-gray-500">(Based on purchase/cost price, not current market value)</p>
                 </div>


                {formMessage && (
                  <p className={`text-sm ${formMessage.includes("Error") || formMessage.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                    {formMessage}
                  </p>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isLoading}>Cancel</button>
                  <button type="submit" className="modal-submit-btn" disabled={isLoading || !formData.metal_type || !formData.quantity || !formData.unit || !formData.purchase_price || !formData.purchase_date}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditMetalPositionModal;