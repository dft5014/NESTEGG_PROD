// frontend/components/modals/EditAccountModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants'; // Assuming constants file

const EditAccountModal = ({ isOpen, onClose, accountData, onAccountUpdated }) => {
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  // We typically don't edit balance directly here, it's calculated from positions/transactions
  // const [balance, setBalance] = useState(0); 
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill form when modal opens with account data
  useEffect(() => {
    if (isOpen && accountData) {
      setAccountName(accountData.account_name || "");
      setInstitution(accountData.institution || "");
      setAccountType(accountData.type || "");
      // setBalance(accountData.balance || 0); // Maybe display balance but don't allow editing?
      setInstitutionSuggestions([]);
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen, accountData]);

  const handleInstitutionInput = (value) => {
    setInstitution(value);
    if (value.trim().length > 0) {
      const filteredSuggestions = popularBrokerages.filter(
        brokerage => brokerage.name.toLowerCase().includes(value.toLowerCase())
      );
      setInstitutionSuggestions(filteredSuggestions.slice(0, 5));
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
    if (!accountData || !accountData.id) {
        setFormMessage("Error: Account ID is missing.");
        return;
    }

    setIsLoading(true);
    setFormMessage("");

    try {
      // Only send fields that are editable
      const payload = {
        account_name: accountName,
        institution: institution || null,
        type: accountType || null
      };

      const response = await fetchWithAuth(`/accounts/${accountData.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setFormMessage("Account updated successfully!");
        setIsLoading(false);
        if (onAccountUpdated) {
          // Pass back the updated account data (might need to refetch or merge)
          onAccountUpdated({ ...accountData, ...payload }); 
        }
        setTimeout(() => {
          onClose(); // Close modal after success
        }, 1000);
      } else {
        setFormMessage(`Failed to update account: ${responseData.detail || JSON.stringify(responseData)}`);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error updating account:", error);
      setFormMessage(`Error updating account: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Account: ${accountData?.account_name || ''}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Account Category (Usually not editable) */}
        {/* You might want to fetch/display the category if needed, but likely derived from 'type' */}
        
        <div>
          <label htmlFor="editAccountName" className="block text-sm font-medium text-gray-700 mb-1">Account Name*</label>
          <input
            id="editAccountName"
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Account Name"
            className="modal-input w-full"
            required
          />
        </div>

        <div className="relative">
          <label htmlFor="editInstitution" className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
          <input
            id="editInstitution"
            type="text"
            value={institution}
            onChange={(e) => handleInstitutionInput(e.target.value)}
            placeholder="Institution (Optional)"
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
          <label htmlFor="editAccountType" className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
          <select
            id="editAccountType"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className="modal-input w-full"
          >
             {/* Provide a comprehensive list or dynamically based on category if needed */}
             <option value="">-- Select Type --</option>
             <optgroup label="Brokerage">
               <option value="Individual">Individual</option>
               <option value="Joint">Joint</option>
               <option value="Custodial">Custodial</option>
                <option value="Trust">Trust</option>
                <option value="Other Brokerage">Other Brokerage</option>
             </optgroup>
             <optgroup label="Retirement">
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
             </optgroup>
              <optgroup label="Cash">
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="High Yield Savings">High Yield Savings</option>
                <option value="Money Market">Money Market</option>
                <option value="Certificate of Deposit (CD)">Certificate of Deposit (CD)</option>
                <option value="Other Cash">Other Cash</option>
              </optgroup>
          </select>
        </div>

        {/* Display Balance (Not Editable) */}
        {/* <div className="mt-2">
            <p className="text-sm text-gray-500">Current Balance: ${accountData?.balance?.toLocaleString() || '0.00'}</p>
        </div> */}

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
            disabled={isLoading || !accountName}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditAccountModal;