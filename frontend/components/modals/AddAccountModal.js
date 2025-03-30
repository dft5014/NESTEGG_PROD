// frontend/components/modals/AddAccountModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';

const AddAccountModal = ({ isOpen, onClose, onAccountAdded }) => {
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  const [balance, setBalance] = useState(0);
  const [accountCategory, setAccountCategory] = useState(""); // brokerage or retirement
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAccountName("");
      setInstitution("");
      setAccountType("");
      setBalance(0);
      setAccountCategory("");
      setInstitutionSuggestions([]);
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleInstitutionInput = (value) => {
    setInstitution(value);
    if (value.trim().length > 0) {
      const filteredSuggestions = popularBrokerages.filter(
        brokerage => brokerage.name.toLowerCase().includes(value.toLowerCase())
      );
      setInstitutionSuggestions(filteredSuggestions.slice(0, 5)); // Limit suggestions
    } else {
      setInstitutionSuggestions([]);
    }
  };

  const selectInstitution = (institutionName) => {
    setInstitution(institutionName);
    setInstitutionSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setFormMessage("Account name is required");
      return;
    }
    if (!accountCategory) {
      setFormMessage("Account category is required");
      return;
    }
    if (!accountType) {
        setFormMessage("Account type is required");
        return;
    }

    setIsLoading(true);
    setFormMessage("");

    try {
      const response = await fetchWithAuth('/accounts', {
        method: "POST",
        body: JSON.stringify({
          account_name: accountName,
          institution: institution || null, // Send null if empty
          type: accountType || null, // Send null if empty
          // account_category: accountCategory, // Backend might not need this if 'type' implies it
          balance: parseFloat(balance) || 0
        })
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Account added successfully!");
        setIsLoading(false);
        if (onAccountAdded) {
          onAccountAdded(responseData); // Pass back new account data if needed
        }
        setTimeout(() => {
          onClose(); // Close modal after success
        }, 1000);
      } else {
        setFormMessage(`Failed to add account: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error adding account:", error);
      setFormMessage(`Error adding account: ${error.message}`);
      setIsLoading(false);
    }
  };

  const renderAccountTypeOptions = () => {
    switch (accountCategory) {
      case "brokerage":
        return (
          <>
            <option value="Individual">Individual</option>
            <option value="Joint">Joint</option>
            <option value="Custodial">Custodial</option>
            <option value="Trust">Trust</option>
            <option value="Other Brokerage">Other Brokerage</option>
          </>
        );
      case "retirement":
        return (
          <>
            <option value="Traditional IRA">Traditional IRA</option>
            <option value="Roth IRA">Roth IRA</option>
            <option value="401(k)">401(k)</option>
            <option value="Roth 401(k)">Roth 401(k)</option>
            <option value="SEP IRA">SEP IRA</option>
            <option value="SIMPLE IRA">SIMPLE IRA</option>
            <option value="403(b)">403(b)</option>
            <option value="Pension">Pension</option>
            <option value="HSA">HSA (Health Savings Account)</option>
            <option value="Other Retirement">Other Retirement</option>
          </>
        );
        case "cash":
        return (
          <>
            <option value="Checking">Checking</option>
            <option value="Savings">Savings</option>
            <option value="High Yield Savings">High Yield Savings</option>
            <option value="Money Market">Money Market</option>
            <option value="Certificate of Deposit (CD)">Certificate of Deposit (CD)</option>
            <option value="Other Cash">Other Cash</option>
          </>
        );
      default:
        return <option value="">Select a category first</option>;
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Category Selection */}
         <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700">Account Category*</label>
             <select
                value={accountCategory}
                onChange={(e) => {
                  setAccountCategory(e.target.value);
                  setAccountType(''); // Reset type when category changes
                }}
                className="modal-input w-full"
                required
             >
               <option value="" disabled>-- Select Category --</option>
               <option value="brokerage">Brokerage / Investment</option>
               <option value="retirement">Retirement</option>
               <option value="cash">Cash / Banking</option>
             </select>
           </div>


        <div>
          <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">Account Name*</label>
          <input
            id="accountName"
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g., My Brokerage Account"
            className="modal-input w-full"
            required
          />
        </div>

        <div className="relative">
          <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
          <input
            id="institution"
            type="text"
            value={institution}
            onChange={(e) => handleInstitutionInput(e.target.value)}
            placeholder="e.g., Vanguard, Fidelity (Optional)"
            className="modal-input w-full"
            autoComplete="off"
          />
          {institutionSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-300 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg z-10">
              {institutionSuggestions.map((brokerage, index) => (
                <div
                  key={index}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center text-sm"
                  onClick={() => selectInstitution(brokerage.name)}
                >
                  {brokerage.logo && (
                     <img src={brokerage.logo} alt={brokerage.name} className="w-5 h-5 object-contain mr-2"/>
                  )}
                 {brokerage.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">Account Type*</label>
          <select
            id="accountType"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="modal-input w-full"
            disabled={!accountCategory}
            required
          >
            <option value="" disabled>-- Select Type --</option>
            {renderAccountTypeOptions()}
          </select>
        </div>

        <div>
          <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">Initial Balance (Optional)</label>
          <input
            id="balance"
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
            className="modal-input w-full"
            min="0"
            step="0.01"
          />
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
            disabled={isLoading || !accountCategory || !accountType || !accountName}
          >
            {isLoading ? "Adding..." : "Add Account"}
          </button>
        </div>
      </form>
      {/* Add CSS for inputs if needed:
         .modal-input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%; font-size: 14px; }
         .modal-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); }
         .modal-submit-btn { background-color: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; transition: background-color 0.2s; }
         .modal-submit-btn:hover { background-color: #1d4ed8; }
         .modal-submit-btn:disabled { background-color: #9ca3af; cursor: not-allowed; }
         .modal-cancel-btn { background-color: #f3f4f6; color: #374151; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid #d1d5db; transition: background-color 0.2s; }
         .modal-cancel-btn:hover { background-color: #e5e7eb; }
         .modal-cancel-btn:disabled { opacity: 0.6; cursor: not-allowed; }
       */}
    </Modal>
  );
};

export default AddAccountModal;