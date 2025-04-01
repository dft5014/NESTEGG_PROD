// components/AddPositionButton.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { DollarSign } from 'lucide-react';
import AccountSelectModal from '@/components/modals/AccountSelectModal';
import PositionTypeModal from '@/components/modals/PositionTypeModal';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

const AddPositionButton = ({ className = "", onPositionAdded = () => {} }) => {
  const { user } = useContext(AuthContext);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedPositionType, setSelectedPositionType] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isAccountSelectModalOpen, setIsAccountSelectModalOpen] = useState(false);
  const [isPositionTypeModalOpen, setIsPositionTypeModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
  const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState(false);

  // Load accounts on mount
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    try {
      const accountsData = await fetchAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError("Failed to load accounts: " + error.message);
    }
  };

  const handleAddPosition = () => {
    if (accounts.length === 0) {
      setError('Please add an account first before adding positions.');
      return;
    }
    
    // If we only have one account, skip account selection
    if (accounts.length === 1) {
      setSelectedAccount(accounts[0]);
      setIsPositionTypeModalOpen(true);
    } else {
      // Show account selection modal
      setIsAccountSelectModalOpen(true);
    }
  };

  const handleAccountSelected = (accountId) => {
    const account = accounts.find(acc => acc.id === accountId);
    
    if (account) {
      setSelectedAccount(account);
      setIsAccountSelectModalOpen(false);
      
      if (selectedPositionType) {
        // If position type already selected, open that modal
        openPositionModal(selectedPositionType);
      } else {
        // Otherwise show position type selection
        setIsPositionTypeModalOpen(true);
      }
    }
  };

  const handlePositionTypeSelected = (type) => {
    setSelectedPositionType(type);
    setIsPositionTypeModalOpen(false);
    openPositionModal(type);
  };

  const openPositionModal = (type) => {
    switch (type) {
      case 'security':
        setIsSecurityModalOpen(true);
        break;
      case 'crypto':
        setIsCryptoModalOpen(true);
        break;
      case 'metal':
        setIsMetalModalOpen(true);
        break;
      case 'realestate':
        setIsRealEstateModalOpen(true);
        break;
      default:
        console.warn(`Unknown position type: ${type}`);
    }
  };

  const handlePositionSaved = () => {
    setIsSecurityModalOpen(false);
    setIsCryptoModalOpen(false);
    setIsMetalModalOpen(false);
    setIsRealEstateModalOpen(false);
    setSuccessMessage(`${selectedPositionType} position added successfully!`);
    setTimeout(() => setSuccessMessage(""), 3000);
    setSelectedPositionType(null);
    setSelectedAccount(null);
    onPositionAdded(); // Callback to notify parent component
  };

  return (
    <>
      {/* Add Positions Button */}
      <button 
        onClick={handleAddPosition}
        className={`flex items-center text-white py-1 px-4 transition-colors group ${className}`}
      >
        <DollarSign className="w-6 h-6 mr-2 text-white group-hover:text-blue-300" />
        <span className="text-sm text-gray-200 group-hover:text-white">Add Positions</span>
      </button>

      {/* Error Message */}
      {error && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-red-100 text-red-700 rounded-lg z-50">
          {error}
          <button 
            className="ml-2 underline" 
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-green-100 text-green-700 rounded-lg z-50">
          {successMessage}
        </div>
      )}

      {/* Modals */}
      <AccountSelectModal 
        isOpen={isAccountSelectModalOpen}
        onClose={() => setIsAccountSelectModalOpen(false)}
        onAccountSelected={handleAccountSelected}
      />
      <PositionTypeModal 
        isOpen={isPositionTypeModalOpen}
        onClose={() => setIsPositionTypeModalOpen(false)}
        onTypeSelected={handlePositionTypeSelected}
      />
      <SecurityPositionModal 
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
      />
      <CryptoPositionModal 
        isOpen={isCryptoModalOpen}
        onClose={() => setIsCryptoModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
      />
      <MetalPositionModal 
        isOpen={isMetalModalOpen}
        onClose={() => setIsMetalModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
      />
      <RealEstatePositionModal 
        isOpen={isRealEstateModalOpen}
        onClose={() => setIsRealEstateModalOpen(false)}
        accountId={selectedAccount?.id}
        onPositionSaved={handlePositionSaved}
      />
    </>
  );
};

export default AddPositionButton;