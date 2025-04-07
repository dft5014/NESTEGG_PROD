// Modified PositionTypeModal.js with Cash type added
import React, { useContext } from 'react';
import FixedModal from './FixedModal';
import { getDefaultAccountForPositionType } from '@/utils/apimethods/positionMethods';
import { AuthContext } from '@/context/AuthContext';
import { DollarSign } from 'lucide-react'; // Optional - if you're using Lucide icons

const PositionTypeModal = ({ isOpen, onClose, onTypeSelected, onAccountAndTypeSelected }) => {
  const { user } = useContext(AuthContext);
  
  const positionTypes = [
    { 
      id: 'security', 
      name: 'US Security (Stock/ETF)',
      description: 'Stocks, ETFs, and other publicly traded securities',
      icon: '📈', 
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      needsAccountSelection: true
    },
    { 
      id: 'crypto', 
      name: 'Cryptocurrency',
      description: 'Bitcoin, Ethereum, and other digital currencies',
      icon: '₿', 
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      needsAccountSelection: true
    },
    { 
      id: 'metal', 
      name: 'Precious Metal',
      description: 'Gold, silver, platinum, and other precious metals',
      icon: '🪙', 
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      needsAccountSelection: true
    },
    { 
      id: 'realestate', 
      name: 'Real Estate',
      description: 'Property investments and holdings',
      icon: '🏠', 
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      needsAccountSelection: false // Does not need user to select account
    },
    // Adding new Cash position type
    { 
      id: 'cash', 
      name: 'Cash',
      description: 'Savings, CDs, Money Market Accounts',
      icon: '💵', 
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-800',
      needsAccountSelection: true // Assuming cash positions need account selection like most others
    }
  ];

  const handleTypeSelection = async (type) => {
    console.log(`Selected position type: ${type.id}`);
    
    if (!type.needsAccountSelection) {
      try {
        // For types that don't need manual account selection,
        // automatically find or create the default account
        const defaultAccount = await getDefaultAccountForPositionType(type.id, user.id);
        
        if (defaultAccount) {
          // Call combined callback with both type and account
          if (onAccountAndTypeSelected) {
            onAccountAndTypeSelected(type.id, defaultAccount.id);
          }
        } else {
          // If no default account could be found/created, fall back to regular flow
          if (onTypeSelected) {
            onTypeSelected(type.id);
          }
        }
      } catch (error) {
        console.error(`Error handling default account for ${type.id}:`, error);
        // Fall back to regular type selection
        if (onTypeSelected) {
          onTypeSelected(type.id);
        }
      }
    } else {
      // For types that need manual account selection
      if (onTypeSelected) {
        onTypeSelected(type.id);
      }
    }
  };

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
              onClick={() => handleTypeSelection(type)}
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