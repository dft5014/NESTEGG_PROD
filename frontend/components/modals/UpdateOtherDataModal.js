// components/modals/UpdateOtherDataModal.js
import React, { useState } from 'react';
import FixedModal from '@/components/modals/FixedModal';
import { RefreshCw, AlertCircle, Info } from 'lucide-react';

const UpdateOtherDataModal = ({ isOpen, onClose }) => {
  // State variables
  const [dataType, setDataType] = useState('crypto');
  const [updateAction, setUpdateAction] = useState('update');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Reset form and state
  const resetForm = () => {
    setDataType('crypto');
    setUpdateAction('update');
    setResult(null);
    setError(null);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    // Placeholder for actual API call
    // In the future, you would call the appropriate API endpoint based on dataType and updateAction
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just show a placeholder message
      setResult({
        message: `This feature is not yet implemented. In the future, you will be able to ${updateAction} ${dataType} data.`
      });
    } catch (err) {
      setError('An error occurred while processing your request.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Update Other Data"
      size="max-w-lg"
    >
      <div className="pt-4 pb-6">
        {/* Success Message */}
        {result && (
          <div className="mb-4 p-4 bg-blue-100 text-blue-800 rounded-md">
            <div className="flex items-start">
              <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">Feature Preview</h3>
                <p className="text-sm mt-1">{result.message}</p>
                <button 
                  onClick={resetForm}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
                >
                  Try Another Option
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Form */}
        {!result && (
          <div className="space-y-6">
            {/* Data Type Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="data-crypto"
                    name="data-type"
                    type="radio"
                    value="crypto"
                    checked={dataType === 'crypto'}
                    onChange={() => setDataType('crypto')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="data-crypto" className="ml-3 block text-sm text-gray-700">
                    Cryptocurrency
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="data-metals"
                    name="data-type"
                    type="radio"
                    value="metals"
                    checked={dataType === 'metals'}
                    onChange={() => setDataType('metals')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="data-metals" className="ml-3 block text-sm text-gray-700">
                    Precious Metals
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="data-realestate"
                    name="data-type"
                    type="radio"
                    value="realestate"
                    checked={dataType === 'realestate'}
                    onChange={() => setDataType('realestate')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="data-realestate" className="ml-3 block text-sm text-gray-700">
                    Real Estate
                  </label>
                </div>
              </div>
            </div>
            
            {/* Action Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="action-update"
                    name="action-type"
                    type="radio"
                    value="update"
                    checked={updateAction === 'update'}
                    onChange={() => setUpdateAction('update')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="action-update" className="ml-3 block text-sm text-gray-700">
                    Update All Prices
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="action-add"
                    name="action-type"
                    type="radio"
                    value="add"
                    checked={updateAction === 'add'}
                    onChange={() => setUpdateAction('add')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="action-add" className="ml-3 block text-sm text-gray-700">
                    Add New Asset
                  </label>
                </div>
              </div>
            </div>
            
            {/* Placeholder for future form fields */}
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500 italic">
                {dataType === 'crypto' && updateAction === 'update' && 
                  "This will update prices for all cryptocurrency holdings using current market data."}
                {dataType === 'crypto' && updateAction === 'add' && 
                  "This will allow you to add a new cryptocurrency to your portfolio."}
                
                {dataType === 'metals' && updateAction === 'update' && 
                  "This will update prices for all precious metal holdings using current market data."}
                {dataType === 'metals' && updateAction === 'add' && 
                  "This will allow you to add a new precious metal holding to your portfolio."}
                
                {dataType === 'realestate' && updateAction === 'update' && 
                  "This will update estimated values for all real estate holdings."}
                {dataType === 'realestate' && updateAction === 'add' && 
                  "This will allow you to add a new real estate property to your portfolio."}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button 
          onClick={handleClose} 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
        >
          Cancel
        </button>
        
        {!result && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 bg-purple-600 text-white rounded-md text-sm flex items-center ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Continue
              </>
            )}
          </button>
        )}
      </div>
    </FixedModal>
  );
};

export default UpdateOtherDataModal;