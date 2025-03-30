// frontend/components/modals/AddSecurityPositionModal.js
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';
import debounce from 'lodash.debounce'; // Use lodash debounce

const AddSecurityPositionModal = ({ isOpen, onClose, accountId, onPositionAdded }) => {
  const [securitySearch, setSecuritySearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSecurity, setSelectedSecurity] = useState(null); // Store ticker and potentially name/price
  const [shares, setShares] = useState("");
  const [costPerShare, setCostPerShare] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Reset state when modal opens/closes or accountId changes
  useEffect(() => {
    if (isOpen) {
      setSecuritySearch("");
      setSearchResults([]);
      setSelectedSecurity(null);
      setShares("");
      setCostPerShare("");
      setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
      setTotalCost(0);
      setFormMessage("");
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [isOpen, accountId]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 1) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (error) {
        console.error("Error searching securities:", error);
        setSearchResults([]); // Clear results on error
      } finally {
        setIsSearching(false);
      }
    }, 300), // 300ms debounce time
    [fetchWithAuth] // Dependency for useCallback
  );

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSecuritySearch(query);
    setSelectedSecurity(null); // Clear selection when search changes
    debouncedSearch(query);
  };

  const handleSelectSecurity = (security) => {
    setSecuritySearch(security.ticker); // Keep ticker in search bar for clarity
    setSelectedSecurity(security);
    setSearchResults([]); // Close dropdown
    // Optionally pre-fill cost basis with current price?
    // setCostPerShare(security.price || "");
  };

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
    if (!selectedSecurity || !shares || shares <= 0 || !costPerShare || costPerShare <= 0 || !purchaseDate || !accountId) {
      setFormMessage("All fields (Ticker, Shares, Cost, Date) are required and must be valid.");
      return;
    }

    setIsLoading(true);
    setFormMessage("");

    try {
      const response = await fetchWithAuth(`/positions/${accountId}`, {
        method: "POST",
        body: JSON.stringify({
          ticker: selectedSecurity.ticker.toUpperCase(),
          shares: parseFloat(shares),
          price: parseFloat(selectedSecurity.price || costPerShare), // Use fetched price if available, else cost basis
          cost_basis: parseFloat(costPerShare),
          purchase_date: purchaseDate
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Position added successfully!");
        setIsLoading(false);
        if (onPositionAdded) {
          onPositionAdded(responseData);
        }
        setTimeout(() => {
          onClose(); // Close modal after success
        }, 1000);
      } else {
        setFormMessage(`Failed to add position: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error adding position:", error);
      setFormMessage(`Error adding position: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Security to Account ${accountId || ''}`} size="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Security Search */}
        <div className="relative">
          <label htmlFor="securitySearch" className="block text-sm font-medium text-gray-700 mb-1">Ticker / Company Name*</label>
          <input
            id="securitySearch"
            type="text"
            value={securitySearch}
            onChange={handleSearchChange}
            placeholder="Search (e.g., AAPL, Microsoft)"
            className="modal-input w-full"
            required
            autoComplete="off"
            disabled={isLoading}
          />
          {isSearching && <p className="text-xs text-gray-500 mt-1">Searching...</p>}
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto rounded-md shadow-lg z-20">
              {searchResults.map((result) => (
                <div
                  key={result.ticker}
                  className="search-result-item p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-200 text-sm"
                  onClick={() => handleSelectSecurity(result)}
                >
                  <div>
                     <span className="font-bold text-blue-800">{result.ticker}</span> - <span className="text-gray-700">{result.name}</span>
                  </div>
                   <span className="text-xs text-gray-500">${(result.price || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
          
        {/* Selected Security Info */}
        {selectedSecurity && (
             <div className="mt-2 p-3 bg-gray-100 rounded-lg text-sm">
                 <p>Selected: <span className="font-semibold">{selectedSecurity.ticker} - {selectedSecurity.name}</span></p>
                 <p>Last Price: <span className="font-semibold">${(selectedSecurity.price || 0).toFixed(2)}</span></p>
             </div>
        )}


        {/* Purchase Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
             <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-1">Number of Shares*</label>
             <input
               id="shares"
               type="number"
               value={shares}
               onChange={(e) => setShares(e.target.value)}
               placeholder="e.g., 10.5"
               className="modal-input w-full"
               min="0.000001" // Allow fractional shares
               step="any"
               required
               disabled={isLoading || !selectedSecurity}
             />
          </div>
           <div>
             <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Purchase Date*</label>
             <input
               id="purchaseDate"
               type="date"
               value={purchaseDate}
               onChange={(e) => setPurchaseDate(e.target.value)}
               className="modal-input w-full"
               max={new Date().toISOString().split('T')[0]}
               required
               disabled={isLoading || !selectedSecurity}
             />
           </div>
        </div>

         {/* Cost Basis */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label htmlFor="costPerShare" className="block text-sm font-medium text-gray-700 mb-1">Cost Per Share ($)*</label>
             <input
               id="costPerShare"
               type="number"
               value={costPerShare}
               onChange={(e) => setCostPerShare(e.target.value)}
               placeholder="e.g., 150.25"
               className="modal-input w-full"
               min="0.01"
               step="0.01"
               required
               disabled={isLoading || !selectedSecurity}
             />
           </div>
            <div>
              <label htmlFor="totalCost" className="block text-sm font-medium text-gray-700 mb-1">Total Cost ($)</label>
              <input
                id="totalCost"
                type="number"
                value={totalCost.toFixed(2)} // Display calculated value
                readOnly // Make read-only as it's calculated
                className="modal-input w-full bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>
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
            disabled={isLoading || !selectedSecurity || !shares || !costPerShare || !purchaseDate}
          >
            {isLoading ? "Adding..." : "Add Position"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSecurityPositionModal;