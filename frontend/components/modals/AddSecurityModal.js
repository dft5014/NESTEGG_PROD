// components/modals/AddSecurityModal.js
import React, { useState } from 'react';
import FixedModal from '@/components/modals/FixedModal';
import { Search, AlertCircle, Check, RefreshCw, BarChart2 } from 'lucide-react';
import { addSecurity } from '@/utils/apimethods/marketDataMethods';

const AddSecurityModal = ({ isOpen, onClose }) => {
  // State variables
  const [inputMethod, setInputMethod] = useState('ticker'); // 'ticker' or 'url'
  const [tickerInput, setTickerInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Extract ticker from Yahoo Finance URL
  const extractTickerFromUrl = (url) => {
    try {
      // Yahoo Finance URLs typically have format: https://finance.yahoo.com/quote/AAPL/
      const regex = /\/quote\/([A-Za-z0-9\.\-\_]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (err) {
      return null;
    }
  };

  // Reset form and state
  const resetForm = () => {
    setInputMethod('ticker');
    setTickerInput('');
    setUrlInput('');
    setResult(null);
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      let ticker = '';
      
      if (inputMethod === 'ticker') {
        ticker = tickerInput.trim().toUpperCase();
        if (!ticker) {
          throw new Error('Please enter a valid ticker symbol');
        }
      } else {
        const extractedTicker = extractTickerFromUrl(urlInput);
        if (!extractedTicker) {
          throw new Error('Could not extract ticker from the provided URL. Please ensure it is a valid Yahoo Finance URL.');
        }
        ticker = extractedTicker.toUpperCase();
      }
      
      // Call API to add security
      const response = await addSecurity({ ticker });
      setResult({ ticker, message: response.message });
    } catch (err) {
      setError(err.message || 'Failed to add security');
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
      title="Add New Security"
      size="max-w-lg"
    >
      <div className="pt-4 pb-6">
        {/* Success Message */}
        {result && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-md">
            <div className="flex items-start">
              <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium">Security Added Successfully</h3>
                <p className="text-sm mt-1">
                  {result.message || `Added ${result.ticker} to the securities database.`}
                </p>
                <button 
                  onClick={resetForm}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md text-sm"
                >
                  Add Another Security
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
                <h3 className="font-medium">Failed to Add Security</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Form */}
        {!result && (
          <div className="space-y-6">
            {/* Input Method Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setInputMethod('ticker')}
                  className={`${
                    inputMethod === 'ticker'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Enter Ticker Symbol
                </button>
                <button
                  onClick={() => setInputMethod('url')}
                  className={`${
                    inputMethod === 'url'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Yahoo Finance URL
                </button>
              </nav>
            </div>
            
            {/* Ticker Input */}
            {inputMethod === 'ticker' && (
              <div>
                <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Ticker Symbol
                </label>
                <input
                  type="text"
                  id="ticker"
                  placeholder="e.g. AAPL"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter the ticker symbol exactly as it appears on Yahoo Finance.
                </p>
              </div>
            )}
            
            {/* URL Input */}
            {inputMethod === 'url' && (
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  Yahoo Finance URL
                </label>
                <input
                  type="text"
                  id="url"
                  placeholder="https://finance.yahoo.com/quote/AAPL/"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Paste the full URL from Yahoo Finance for the security you want to add.
                </p>
                {urlInput && (
                  <div className="mt-3">
                    <span className="text-sm">
                      {extractTickerFromUrl(urlInput) 
                        ? `Detected ticker: ${extractTickerFromUrl(urlInput)}` 
                        : 'Could not detect ticker from URL'}
                    </span>
                  </div>
                )}
              </div>
            )}
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
            disabled={isSubmitting || (inputMethod === 'ticker' ? !tickerInput : !urlInput)}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm flex items-center ${
              isSubmitting || (inputMethod === 'ticker' ? !tickerInput : !urlInput)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <BarChart2 className="w-4 h-4 mr-2" />
                Add Security
              </>
            )}
          </button>
        )}
      </div>
    </FixedModal>
  );
};

export default AddSecurityModal;