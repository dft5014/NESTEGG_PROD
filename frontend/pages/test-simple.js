// pages/test-simple.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';

// Create a simple inline modal to troubleshoot
const SimpleInlineModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  // This is a simplified modal directly in the component
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-lg w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function TestSimplePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1); // Track modal testing steps
  
  // Log when modal state changes
  useEffect(() => {
    console.log("Modal state changed:", { isModalOpen, modalStep });
  }, [isModalOpen, modalStep]);

  const openModal = () => {
    console.log("Opening modal...");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    console.log("Closing modal...");
    setIsModalOpen(false);
    setModalStep(1);
  };
  
  const advanceStep = () => {
    console.log("Advancing to next step...");
    setModalStep(modalStep + 1);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Simple Modal Test</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <p className="mb-4">This page tests a simple inline modal implementation.</p>
        
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Open Test Modal
        </button>
      </div>
      
      {/* Debugging information */}
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="font-bold mb-2">Debugging Info:</h2>
        <p>Modal Open: {isModalOpen ? "Yes" : "No"}</p>
        <p>Modal Step: {modalStep}</p>
      </div>

      {/* Simple inline modal */}
      <SimpleInlineModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Test Modal"
      >
        <div className="space-y-4">
          <h3 className="font-medium text-lg">
            {modalStep === 1 ? "Step 1: Basic Modal Test" : 
             modalStep === 2 ? "Step 2: Form Elements Test" : 
             "Step 3: Confirmation"}
          </h3>
          
          {modalStep === 1 && (
            <div>
              <p>This is a basic modal test. Can you see this content?</p>
              <p className="text-sm text-gray-500 mt-2">
                If you can see this, the modal is working correctly.
              </p>
            </div>
          )}
          
          {modalStep === 2 && (
            <div>
              <p>Let's test some form elements:</p>
              <div className="mt-2 space-y-2">
                <input 
                  type="text" 
                  placeholder="Test input field"
                  className="w-full p-2 border rounded"
                />
                <select className="w-full p-2 border rounded">
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
            </div>
          )}
          
          {modalStep === 3 && (
            <div>
              <p>All tests completed successfully!</p>
              <p className="text-sm text-green-600 mt-2">
                The modal component is working correctly.
              </p>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            
            {modalStep < 3 && (
              <button
                onClick={advanceStep}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next Step
              </button>
            )}
          </div>
        </div>
      </SimpleInlineModal>
    </div>
  );
}