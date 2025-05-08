// components/modals/AccountModal.js
import React, { useState, useEffect } from 'react';
import FixedModal from './FixedModal';
import { fetchWithAuth } from '@/utils/api';
import { popularBrokerages } from '@/utils/constants';
import { ChevronDown, Check, X, CreditCard, DollarSign, Building, Landmark, Briefcase, Bitcoin, Database, Home } from 'lucide-react';

const AccountModal = ({ isOpen, onClose, onAccountAdded, editAccount = null }) => {
  // State for form fields
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  const [accountCategory, setAccountCategory] = useState("");
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Log modal rendering for debugging
  useEffect(() => {
    console.log("AccountModal render state:", { isOpen, isEditMode, editAccount: !!editAccount });
  }, [isOpen, isEditMode, editAccount]);

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
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setAccountName("");
        setInstitution("");
        setAccountType("");
        setAccountCategory("");
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
      };

      console.log(`${isEditMode ? 'Updating' : 'Creating'} account:`, payload);
      
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

      console.log("API response status:", response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log("API response data:", responseData);
        
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
        console.error("API error response:", errorData);
        
        setFormMessage(`Failed to ${isEditMode ? 'update' : 'add'} account: ${errorData.detail || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} account:`, error);
      setFormMessage(`Error ${isEditMode ? 'updating' : 'adding'} account: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Category icons mapping
  const getCategoryIcon = (category) => {
    switch (category) {
      case "brokerage": return <Briefcase className="w-5 h-5" />;
      case "retirement": return <Landmark className="w-5 h-5" />;
      case "cash": return <DollarSign className="w-5 h-5" />;
      case "crypto": return <Bitcoin className="w-5 h-5" />;
      case "metals": return <Database className="w-5 h-5" />;
      case "realestate": return <Home className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
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
      case "crypto":
        return (
          <>
            <option value="">-- Select Account Type --</option>
            <option value="Exchange Account">Exchange Account</option>
            <option value="Hardware Wallet">Hardware Wallet</option>
            <option value="Software Wallet">Software Wallet</option>
            <option value="Cold Storage">Cold Storage</option>
            <option value="Other Crypto">Other Crypto</option>
          </>
        );
      case "metals":
        return (
          <>
            <option value="">-- Select Account Type --</option>
            <option value="Home Storage">Home Storage</option>
            <option value="Safe Deposit Box">Safe Deposit Box</option>
            <option value="Third-Party Vault">Third-Party Vault</option>
            <option value="Allocated Storage">Allocated Storage</option>
            <option value="Unallocated Storage">Unallocated Storage</option>
            <option value="Other Metals">Other Metals</option>
          </>
        );
      case "realestate":
        return (
          <>
            <option value="">-- Select Account Type --</option>
            <option value="Primary Residence">Primary Residence</option>
            <option value="Vacation Home">Vacation Home</option>
            <option value="Rental Property">Rental Property</option>
            <option value="Commercial Property">Commercial Property</option>
            <option value="Land">Land</option>
            <option value="REIT">REIT</option>
            <option value="Other Real Estate">Other Real Estate</option>
          </>
        );
      default:
        return <option value="">Select a category first</option>;
    }
  };

  return (
    <FixedModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditMode ? `Edit Account: ${editAccount?.account_name}` : "Add New Account"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Name */}
        <div className="mb-4">
          <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
            Account Name (or nickname)*
          </label>
          <div className="relative">
            <input
              id="accountName"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., My Retirement, Crypto Portfolio"
              style={{ color: '#1f2937' }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">Give your account a memorable name that helps you identify it</p>
        </div>

        {/* Account Category */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Category*</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: "brokerage", name: "Brokerage", icon: <Briefcase className="w-5 h-5" /> },
              { id: "retirement", name: "Retirement", icon: <Landmark className="w-5 h-5" /> },
              { id: "cash", name: "Cash / Banking", icon: <DollarSign className="w-5 h-5" /> },
              { id: "crypto", name: "Cryptocurrency", icon: <Bitcoin className="w-5 h-5" /> },
              { id: "metals", name: "Metals Storage", icon: <Database className="w-5 h-5" /> },
              { id: "realestate", name: "Real Estate", icon: <Home className="w-5 h-5" /> }
            ].map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setAccountCategory(category.id);
                  setAccountType(''); // Reset type when category changes
                }}
                className={`flex items-center justify-center p-3 rounded-lg border transition-all ${
                  accountCategory === category.id
                    ? "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className={`mb-1 ${accountCategory === category.id ? "text-blue-600" : "text-gray-500"}`}>
                    {category.icon}
                  </div>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                {accountCategory === category.id && (
                  <div className="absolute top-1 right-1">
                    <Check className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Institution */}
        <div className="relative mb-4">
          <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
          <div className="relative">
            <input
              id="institution"
              type="text"
              value={institution}
              onChange={(e) => handleInstitutionInput(e.target.value)}
              placeholder="e.g., Vanguard, Fidelity (Optional)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
              autoComplete="off"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">Where is this account held?</p>
          
          {institutionSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-300 mt-1 max-h-48 overflow-y-auto rounded-md shadow-lg z-10">
              {institutionSuggestions.map((brokerage, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-50 cursor-pointer flex items-center text-sm border-b border-gray-100 last:border-0"
                  onClick={() => selectInstitution(brokerage.name)}
                >
                  {brokerage.logo && (
                    <div className="w-8 h-8 flex-shrink-0 mr-3 bg-white rounded p-1 border border-gray-100">
                      <img src={brokerage.logo} alt={brokerage.name} className="w-full h-full object-contain"/>
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{brokerage.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Type */}
        <div className="mb-4">
          <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">Account Type*</label>
          <div className="relative">
            <select
              id="accountType"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none text-gray-900"
              disabled={!accountCategory}
              required
            >
              {renderAccountTypeOptions()}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">Select the specific type of account</p>
        </div>

        {/* Form Status Messages */}
        {formMessage && (
          <div className={`p-4 rounded-lg ${formMessage.includes("Error") || formMessage.includes("Failed") 
            ? "bg-red-50 text-red-700 border border-red-200" 
            : "bg-green-50 text-green-700 border border-green-200"}`}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                <p>{isEditMode ? "Updating..." : "Adding..."}</p>
              </div>
            ) : (
              <p>{formMessage}</p>
            )}
          </div>
        )}

        {/* Form Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            disabled={isLoading || !accountCategory || !accountType || !accountName}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>{isEditMode ? "Updating..." : "Add Account"}</span>
              </div>
            ) : (
              <span>{isEditMode ? "Update Account" : "Add Account"}</span>
            )}
          </button>
        </div>
      </form>
    </FixedModal>
  );
};

export default AccountModal;