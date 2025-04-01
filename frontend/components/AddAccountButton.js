// components/AddAccountButton.js
import { useState } from 'react';
import AccountModal from '@/components/modals/AccountModal';
import { CirclePlus } from 'lucide-react';

const AddAccountButton = ({ className = "", onAccountAdded = () => {} }) => {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleAddAccount = () => {
    setIsAccountModalOpen(true);
  };

  const handleAccountSaved = () => {
    setIsAccountModalOpen(false);
    setSuccessMessage("Account added successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
    onAccountAdded(); // Callback to notify parent component
  };

  return (
    <>
      {/* Add Account Button */}
      <button 
        onClick={handleAddAccount}
        className={`flex items-center text-white py-1 px-4 transition-colors group ${className}`}
      >
        <CirclePlus className="w-6 h-6 mr-2 text-white group-hover:text-blue-300" />
        <span className="text-sm text-gray-200 group-hover:text-white">Add Account</span>
      </button>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-green-100 text-green-700 rounded-lg z-50">
          {successMessage}
        </div>
      )}

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountAdded={handleAccountSaved}
      />
    </>
  );
};

export default AddAccountButton;