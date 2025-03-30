// frontend/components/modals/PositionTypeModal.js
import React from 'react';
import FixedModal from './FixedModal';

const PositionTypeModal = ({ isOpen, onClose, onTypeSelected }) => {
  const positionTypes = [
    { 
      id: 'security', 
      name: 'US Security (Stock/ETF)',
      description: 'Stocks, ETFs, and other publicly traded securities',
      icon: '📈', 
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800'
    },
    { 
      id: 'crypto', 
      name: 'Cryptocurrency',
      description: 'Bitcoin, Ethereum, and other digital currencies',
      icon: '₿', 
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800'
    },
    { 
      id: 'metal', 
      name: 'Precious Metal',
      description: 'Gold, silver, platinum, and other precious metals',
      icon: '🪙', 
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800'
    },
    { 
      id: 'realestate', 
      name: 'Real Estate',
      description: 'Property investments and holdings',
      icon: '🏠', 
      bgColor: 'bg-green-100',
      textColor: 'text-green-800'
    }
  ];

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Position Type"
    >
      <div className="space-y-4">
        <p className="text-gray-600 mb-4">
          Select the type of position you want to add:
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {positionTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                console.log(`Selected position type: ${type.id}`);
                onTypeSelected(type.id);
              }}
              className={`flex flex-col items-center p-4 border rounded-xl ${type.bgColor} hover:shadow-md transition-shadow`}
            >
              <div className="text-4xl mb-2">{type.icon}</div>
              <h3 className={`font-medium ${type.textColor}`}>{type.name}</h3>
              <p className="text-xs text-gray-600 mt-1 text-center">{type.description}</p>
            </button>
          ))}
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </FixedModal>
  );
};

export default PositionTypeModal;