// components/modals/UpdateMarketDataModal.js
import React, { useState } from 'react';
import FixedModal from '@/components/modals/FixedModal';
import { RefreshCw, Database, ChevronRight, AlertCircle } from 'lucide-react';
import { 
  triggerPriceUpdate, 
  triggerMetricsUpdate, 
  triggerHistoryUpdate,
  updateSpecificSecurity 
} from '@/utils/apimethods/marketDataMethods';

const UpdateMarketDataModal = ({ isOpen, onClose }) => {
  // State for form fields
  const [updateType, setUpdateType] = useState('current_price');
  const [scope, setScope] = useState('all');
  const [ticker, setTicker] = useState('');
  const [days, setDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    
    try {
      let response;
      
      // Handle different update types and scopes
      if (scope === 'specific' && ticker) {
        response = await updateSpecificSecurity(ticker, {
          update_type: updateType,
          days: updateType === 'history' ? parseInt(days) : undefined
        });
      } else if (updateType === 'prices') {
        response = await triggerPriceUpdate();
      } else if (updateType === 'metrics') {
        response = await triggerMetricsUpdate();
      } else if (updateType === 'history') {
        response = await triggerHistoryUpdate(parseInt(days));
      }
      
      setResult(response);
    } catch (err) {
      setError(err.message || 'Failed to update market data');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setUpdateType('prices');
    setScope('all');
    setTicker('');
    setDays(30);
    setResult(null);
    setError(null);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Update Market Data"
      size="max-w-lg"
    >
      <div className="pt-4 pb-6">
        {/* If there's a result, show success */}
        {result && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-md">
            <h3 className="font-medium">Update Completed Successfully</h3>
            <p className="text-sm mt-1">
              {updateType === 'current_price' && 'Security prices have been updated.'}
              {updateType === 'metrics' && 'Company metrics have been updated.'}
              {updateType === 'history' && `Historical data for the last ${days} days has been updated.`}
              {scope === 'specific' && ` Updated ${ticker.toUpperCase()}.`}
            </p>
            <button 
              onClick={resetForm}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md text-sm"
            >
              Update More Data
            </button>
          </div>
        )}
        
        {/* If there's an error, show error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">Update Failed</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Only show the form if not showing a result */}
        {!result && (
          <form className="space-y-6">
            {/* Update Type Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Type</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="update-prices"
                    name="update-type"
                    type="radio"
                    value="current_price"
                    checked={updateType === 'current_price'}
                    onChange={() => setUpdateType('current_price')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="update-prices" className="ml-3 block text-sm text-gray-700">
                    Current Prices (Quick)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="update-metrics"
                    name="update-type"
                    type="radio"
                    value="metrics"
                    checked={updateType === 'metrics'}
                    onChange={() => setUpdateType('metrics')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="update-metrics" className="ml-3 block text-sm text-gray-700">
                    Company Metrics (PE Ratio, Market Cap, etc.)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="update-history"
                    name="update-type"
                    type="radio"
                    value="history"
                    checked={updateType === 'history'}
                    onChange={() => setUpdateType('history')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="update-history" className="ml-3 block text-sm text-gray-700">
                    Historical Prices (Slower)
                  </label>
                </div>
              </div>
            </div>
            
            {/* Scope Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Scope</label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="scope-all"
                    name="scope"
                    type="radio"
                    value="all"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="scope-all" className="ml-3 block text-sm text-gray-700">
                    All Securities
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="scope-specific"
                    name="scope"
                    type="radio"
                    value="specific"
                    checked={scope === 'specific'}
                    onChange={() => setScope('specific')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="scope-specific" className="ml-3 block text-sm text-gray-700">
                    Specific Ticker
                  </label>
                </div>
              </div>
            </div>
            
            {/* Conditional Fields */}
            {scope === 'specific' && (
              <div>
                <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-2">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  id="ticker"
                  name="ticker"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            )}
            
            {updateType === 'history' && (
              <div>
                <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-2">
                  Days of History
                </label>
                <select
                  id="days"
                  name="days"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="180">Last 180 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            )}
          </form>
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
            disabled={isSubmitting || (scope === 'specific' && !ticker)}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm flex items-center ${
              isSubmitting || (scope === 'specific' && !ticker) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Update Data
              </>
            )}
          </button>
        )}
      </div>
    </FixedModal>
  );
};

export default UpdateMarketDataModal;