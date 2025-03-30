// frontend/components/modals/Modal.js
import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'max-w-xl' }) => {
  if (!isOpen) return null;

  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose} // Close if overlay is clicked
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl ${size} w-full transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-scale-in`}
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal content
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-150px)]"> 
          {children}
        </div>
      </div>
      {/* Add CSS for animation in globals.css if not already present:
        @keyframes modal-scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-modal-scale-in { animation: modal-scale-in 0.2s ease-out forwards; }
      */}
    </div>
  );
};

export default Modal;