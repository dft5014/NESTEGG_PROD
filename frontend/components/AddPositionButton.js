// components/AddPositionButton.js
import { useState } from 'react';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal';
import { CirclePlus } from 'lucide-react';

const AddPositionButton = ({ className = "", onPositionAdded = () => {}, onCancel = () => {} }) => {
  const [isPositionTypeModalOpen, setIsPositionTypeModalOpen] = useState(false);
  const [selectedPositionType, setSelectedPositionType] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
  const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleAddPositionClick = () => {
    fetchAccounts();
    setIsPositionTypeModalOpen(true);
  };

  const handlePositionTypeSelect = (type) => {
    setSelectedPositionType(type);
    setIsPositionTypeModalOpen(false);
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccountId(accountId);
    openPositionModal();
  };

  const openPositionModal = () => {
    switch (selectedPositionType) {
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
        console.warn(`Unknown position type: ${selectedPositionType}`);
    }
  };

  const handlePositionSaved = () => {
    setSuccessMessage(`${selectedPositionType.charAt(0).toUpperCase() + selectedPositionType.slice(1)} position added successfully!`);
    setTimeout(() => setSuccessMessage(""), 3000);
    setSelectedPositionType(null);
    setSelectedAccountId(null);
    onPositionAdded();
  };

  const handleCancel = () => {
    setIsPositionTypeModalOpen(false);
    setSelectedPositionType(null);
    setSelectedAccountId(null);
    setIsSecurityModalOpen(false);
    setIsCryptoModalOpen(false);
    setIsMetalModalOpen(false);
    setIsRealEstateModalOpen(false);
    onCancel(); // Notify parent component of cancellation
  };

  return (
    <>
      {/* Add Position Button */}
      <button 
        onClick={handleAddPositionClick}
        className={`flex items-center text-white py-1 px-4 transition-colors group ${className}`}
      >
        <CirclePlus className="w-6 h-6 mr-2 text-white group-hover:text-green-300" />
        <span className="text-sm text-gray-200 group-hover:text-white">Add Position</span>
      </button>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-green-100 text-green-700 rounded-lg z-50">
          {successMessage}
        </div>
      )}

      {/* Position Type Selection Modal */}
      {isPositionTypeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Select Position Type</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handlePositionTypeSelect('security')}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Security
              </button>
              <button
                onClick={() => handlePositionTypeSelect('crypto')}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Cryptocurrency
              </button>
              <button
                onClick={() => handlePositionTypeSelect('metal')}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Precious Metal
              </button>
              <button
                onClick={() => handlePositionTypeSelect('realestate')}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Real Estate
              </button>
            </div>
            <button
              onClick={handleCancel}
              className="mt-4 w-full p-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account Selection Modal */}
      {selectedPositionType && !selectedAccountId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Select Account</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    className="w-full p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left"
                  >
                    {account.account_name} ({account.institution || 'N/A'})
                  </button>
                ))
              ) : (
                <p className="text-gray-500">No accounts available.</p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="mt-4 w-full p-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Position Modals */}
      <SecurityPositionModal
        isOpen={isSecurityModalOpen}
        onClose={handleCancel}
        accountId={selectedAccountId}
        onPositionSaved={handlePositionSaved}
      />
      <CryptoPositionModal
        isOpen={isCryptoModalOpen}
        onClose={handleCancel}
        accountId={selectedAccountId}
        onPositionSaved={handlePositionSaved}
      />
      <MetalPositionModal
        isOpen={isMetalModalOpen}
        onClose={handleCancel}
        accountId={selectedAccountId}
        onPositionSaved={handlePositionSaved}
      />
      <RealEstatePositionModal
        isOpen={isRealEstateModalOpen}
        onClose={handleCancel}
        accountId={selectedAccountId}
        onPositionSaved={handlePositionSaved}
      />
    </>
  );
};

export default AddPositionButton;