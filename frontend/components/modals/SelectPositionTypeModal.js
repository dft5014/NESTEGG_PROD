// frontend/components/modals/SelectPositionTypeModal.js
import React from 'react';
import Modal from './Modal';
import { Briefcase, Bitcoin, Gem, Home, DollarSign } from 'lucide-react'; // Example icons

const POSITION_TYPES = [
  { id: 'stock', label: 'US Security (Stock/ETF)', icon: <Briefcase size={24} />, className: 'security-us' },
  { id: 'crypto', label: 'Cryptocurrency', icon: <Bitcoin size={24} />, className: 'security-crypto' },
  { id: 'metal', label: 'Precious Metal', icon: <Gem size={24} />, className: 'security-metals' },
  { id: 'realestate', label: 'Real Estate', icon: <Home size={24} />, className: 'security-realestate' }, // Placeholder
  { id: 'manual', label: 'Manual Asset', icon: <DollarSign size={24} />, className: 'security-manual' }, // Placeholder
];

const SelectPositionTypeModal = ({ isOpen, onClose, onTypeSelected }) => {
  
  const handleSelect = (typeId) => {
    if (onTypeSelected) {
      onTypeSelected(typeId);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Position Type" size="max-w-2xl">
      <p className="text-gray-600 mb-6 text-center">What type of asset would you like to add?</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {POSITION_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => handleSelect(type.id)}
            // Applying similar styles as seen in portfolio.js security-option-btn but more generic
            className={`flex flex-col items-center justify-center p-6 border rounded-lg text-center hover:shadow-md hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 ease-in-out space-y-2 ${
                type.id === 'stock' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                type.id === 'crypto' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                type.id === 'metal' ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100' :
                type.id === 'realestate' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' // Manual
             }`}
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white mb-2 shadow-sm">
                {React.cloneElement(type.icon, { className: 'w-6 h-6' })}
            </div>
            <span className="text-sm font-medium">{type.label}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-4 mt-6 border-t border-gray-200">
        <button
          type="button"
          className="modal-cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default SelectPositionTypeModal;