// components/EditAccountButton.js
import { useState } from 'react';
import AccountModal from '@/components/modals/AccountModal';
import { Settings } from 'lucide-react';

const EditAccountButton = ({ account, className = "", onAccountEdited = () => {} }) => {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleEditAccount = (e) => {
    e.stopPropagation(); // Prevent row click
    setIsAccountModalOpen(true);
  };

  const handleAccountSaved = (savedAccount) => {
    setIsAccountModalOpen(false);
    setSuccessMessage("Account updated successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
    onAccountEdited(savedAccount); // Callback to notify parent component
  };

  return (
    <>
      {/* Edit Account Button */}
      <button 
        onClick={handleEditAccount}
        className={`${className}`}
        title="Edit Account"
      >
        <Settings className="h-4 w-4" />
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
        editAccount={account}
      />
    </>
  );
};

export default EditAccountButton;