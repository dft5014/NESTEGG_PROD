// components/modals/FixedModal.js
import React, { useEffect } from 'react';

const FixedModal = ({ isOpen, onClose, title, children }) => {
  // Log when modal state changes for debugging
  useEffect(() => {
    console.log("FixedModal render state:", { isOpen, title });
  }, [isOpen, title]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      console.log("Modal opened - body scroll disabled");
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      console.log("Modal cleanup - body scroll restored");
    };
  }, [isOpen]);

  // If not open, don't render anything
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div 
        className="bg-white rounded-lg shadow-lg w-full max-w-xl"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh' }} // Ensure modal doesn't exceed viewport height
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-150px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FixedModal;