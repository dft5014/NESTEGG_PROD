// frontend/components/modals/EditSecurityPositionModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';

const EditSecurityPositionModal = ({ isOpen, onClose, positionData, onPositionUpdated }) => {
  // Note: positionData should contain { id, account_id, ticker, shares, price, cost_basis, purchase_date }
  const [shares, setShares] = useState("");
  const [costPerShare, setCostPerShare] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill form when modal opens
  useEffect(() => {
    if (isOpen && positionData) {
      setShares(positionData.shares?.toString() || "");
      setCostPerShare(positionData.cost_basis?.toString() || "");
      // Ensure date is in YYYY-MM-DD format for the input
      const formattedDate = positionData.purchase_date 
                            ? new Date(positionData.purchase_date).toISOString().split('T')[0] 
                            : new Date().toISOString().split('T')[0];
      setPurchaseDate(formattedDate);
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen, positionData]);

  // Update total cost when shares or costPerShare changes
  useEffect(() => {
    const numShares = parseFloat(shares);
    const cost = parseFloat(costPerShare);
    if (!isNaN(numShares) && !isNaN(cost) && numShares > 0 && cost > 0) {
      setTotalCost(numShares * cost);
    } else {
      setTotalCost(0);
    }
  }, [shares, costPerShare]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!positionData || !positionData.id || !shares || shares <= 0 || !costPerShare || costPerShare <= 0 || !purchaseDate) {
      setFormMessage("Shares, Cost Per Share, and Purchase Date are required and must be valid.");
      return;
    }

    setIsLoading(true);
    setFormMessage("");

    try {
      // Use the PUT endpoint for positions
      // The backend expects PositionCreate model, so we send all relevant fields
      const response = await fetchWithAuth(`/positions/${positionData.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ticker: positionData.ticker, // Ticker is usually not editable
          shares: parseFloat(shares),
          price: parseFloat(positionData.price), // Send current price from existing data
          cost_basis: parseFloat(costPerShare),
          purchase_date: purchaseDate
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Position updated successfully!");
        setIsLoading(false);
        if (onPositionUpdated) {
          // Pass back updated data
           onPositionUpdated({ 
             ...positionData, 
             shares: parseFloat(shares), 
             cost_basis: parseFloat(costPerShare), 
             purchase_date: purchaseDate 
           });
        }
        setTimeout(() => {
          onClose(); // Close modal after success
        }, 1000);
      } else {
        setFormMessage(`Failed to update position: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error updating position:", error);
      setFormMessage(`Error updating position: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Position: ${positionData?.ticker || ''}`} size="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Ticker (Not Editable) */}
        <div className="p-3 bg-gray-100 rounded-lg text-sm">
          <p>Ticker: <span className="font-semibold">{positionData?.ticker}</span></p>
          <p>Current Price: <span className="font-semibold">${(positionData?.price || 0).toFixed(2)}</span></p>
        </div>

        {/* Editable Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
             <label htmlFor="editShares" className="block text-sm font-medium text-gray-700 mb-1">Number of Shares*</label>
             <input
               id="editShares"
               type="number"
               value={shares}
               onChange={(e) => setShares(e.target.value)}
               className="modal-input w-full"
               min="0.000001"
               step="any"
               required
               disabled={isLoading}
             />
          </div>
           <div>
             <label htmlFor="editPurchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
             <input
               id="editPurchaseDate"
               type="date"
               value={purchaseDate}
               onChange={(e) => setPurchaseDate(e.target.value)}
               className="modal-input w-full"
               max={new Date().toISOString().split('T')[0]}
               required
               disabled={isLoading}
             />
           </div>
        </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label htmlFor="editCostPerShare" className="block text-sm font-medium text-gray-700 mb-1">Cost Per Share ($)*</label>
             <input
               id="editCostPerShare"
               type="number"
               value={costPerShare}
               onChange={(e) => setCostPerShare(e.target.value)}
               className="modal-input w-full"
               min="0.01"
               step="0.01"
               required
               disabled={isLoading}
             />
           </div>
            <div>
              <label htmlFor="editTotalCost" className="block text-sm font-medium text-gray-700 mb-1">Total Cost ($)</label>
              <input
                id="editTotalCost"
                type="number"
                value={totalCost.toFixed(2)}
                readOnly
                className="modal-input w-full bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>
         </div>

         {/* Display Current Value */}
         <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
             <p>Current Value: <span className="font-semibold">${(parseFloat(shares || 0) * (positionData?.price || 0)).toFixed(2)}</span></p>
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
            disabled={isLoading || !shares || !costPerShare || !purchaseDate}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditSecurityPositionModal;