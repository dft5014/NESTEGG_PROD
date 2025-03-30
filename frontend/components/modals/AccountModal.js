// frontend/components/modals/AccountModal.js
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';

const AccountModal = ({ isOpen, onClose, onAccountAdded, editAccount = null }) => {
  // State for form fields
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  const [accountCategory, setAccountCategory] = useState("");
  const [balance, setBalance] = useState(0);
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Reset form when modal opens/closes or changes mode
  useEffect(() => {
    if (isOpen) {
      if (editAccount) {
        // Edit mode - pre-fill form with account data
        setIsEditMode(true);
        setAccountName(editAccount.account_name || "");
        setInstitution(editAccount.institution || "");
        setAccountType(editAccount.type || "");
        // Determine category from type if not explicitly stored
        if (editAccount.account_category) {
          setAccountCategory(editAccount.account_category);
        } else if (editAccount.type) {
          // Infer category from type (this logic can be improved based on your type naming)
          if (['Traditional IRA', 'Roth IRA', '401(k)', 'HSA'].includes(editAccount.type)) {
            setAccountCategory('retirement');
          } else if (['Checking', 'Savings', 'CD', 'Money Market'].includes(editAccount.type)) {
            setAccountCategory('cash');
          } else {
            setAccountCategory('brokerage');
          }
        }
        setBalance(editAccount.balance || 0);
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setAccountName("");
        setInstitution("");
        setAccountType("");
        setAccountCategory("");
        setBalance(0);
      }
      // Common reset
      setInstitutionSuggestions([]);
      setFormMessage("");
      setIsLoading(false);
    }
  }, [isOpen, editAccount]);

  const handleInstitutionInput = (value) => {
    setInstitution(value);
    
    if (value.trim().length > 0) {
      const filteredSuggestions = popularBrokerages.filter(
        brokerage => brokerage.name.toLowerCase().includes(value.toLowerCase())
      );
      setInstitutionSuggestions(filteredSuggestions.slice(0, 5)); // Limit to 5 suggestions
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
    
    // Basic validation
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
      // Prepare payload
      const payload = {
        account_name: accountName,
        institution: institution || null,
        type: accountType,
        account_category: accountCategory,
        balance: parseFloat(balance) || 0
      };

      let response;
      
      if (isEditMode) {
        // Update existing account
        response = await fetchWithAuth(`/accounts/${editAccount.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // Create new account
        response = await fetchWithAuth('/accounts', {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        const responseData = await response.json();
        setFormMessage(isEditMode ? "Account updated successfully!" : "Account added successfully!");
        
        setTimeout(() => {
          onClose();
          setFormMessage("");
          
          if (onAccountAdded) {
            onAccountAdded(responseData);
          }
        }, 1000);
      } else {
        const errorData = await response.json();
        setFormMessage(`Failed to ${isEditMode ? 'update' : 'add'} account: ${errorData.detail || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} account:`, error);
      setFormMessage(`Error ${isEditMode ? 'updating' : 'adding'} account: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAccountTypeOptions = () => {
    switch (accountCategory) {
      case "brokerage":
        return (
          <>
            <option value="">-- Select Account Type --</option>
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
            <option value="">-- Select Account Type --</option>
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
            <option value="">-- Select Account Type --</option>
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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditMode ? `Edit Account: ${editAccount?.account_name}` : "Add New Account"}
    >
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
            {renderAccountTypeOptions()}
          </select>
        </div>

        <div>
          <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
            {isEditMode ? "Update Balance (Optional)" : "Initial Balance (Optional)"}
          </label>
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
            {isLoading ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Account" : "Add Account")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AccountModal;