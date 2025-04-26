// components/modals/UpdateMarketDataModal.js
import React, { useState, useEffect } from 'react';
import FixedModal from '@/components/modals/FixedModal';
import { 
  RefreshCw, Database, ChevronRight, AlertCircle, 
  Check, Clock, TrendingUp, BarChart4, LineChart, Upload,
  Zap, Search, FileText, List, Filter, X, ArrowRight, ArrowUp,
  Award, ChevronDown
} from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '@/utils/api';

const UpdateMarketDataModal = ({ isOpen, onClose }) => {
  // Modal state
  const [activeTab, setActiveTab] = useState('single');
  const [updateType, setUpdateType] = useState('prices');
  const [ticker, setTicker] = useState('');
  const [multiTickers, setMultiTickers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [allSecurities, setAllSecurities] = useState([]);
  const [loadingSecurities, setLoadingSecurities] = useState(false);
  const [progressStatus, setProgressStatus] = useState({ 
    processed: 0, 
    total: 0, 
    currentTicker: '',
    startTime: null,
    estimatedTimeRemaining: null
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(1000);
  const [updateLogs, setUpdateLogs] = useState([]);

  // Add a log entry with timestamp
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setUpdateLogs(prev => [{ message, timestamp, type }, ...prev]);
  };

  // Fetch all securities for the "Update All" option
  useEffect(() => {
    if (activeTab === 'all' && !allSecurities.length && !loadingSecurities) {
      fetchAllSecurities();
    }
  }, [activeTab]);

  const fetchAllSecurities = async () => {
    setLoadingSecurities(true);
    addLog('Fetching list of all securities...', 'info');
    try {
      // Ensure we're using the correct endpoint format
      const endpoint = '/securities/all';
      const response = await fetchWithAuth(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        const tickers = data.securities.map(sec => sec.ticker);
        setAllSecurities(tickers);
        addLog(`Found ${tickers.length} securities to update`, 'success');
        addLog('Test New Log')
        addLog(`Found ${tickers.length} securities to update (${data.securities.filter(sec => sec.asset_type && sec.asset_type.toLowerCase() === 'crypto').length} crypto, ${data.securities.filter(sec => sec.asset_type && sec.asset_type.toLowerCase() === 'equity').length} equity)`, 'success');

      } else {
        addLog('Failed to fetch securities list', 'error');
      }
    } catch (err) {
      addLog(`Error fetching securities: ${err.message}`, 'error');
    } finally {
      setLoadingSecurities(false);
    }
  };

  // Process a single ticker update
  const processSingleTicker = async () => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    addLog(`Starting update for ${ticker} (${updateType})`, 'info');

    try {
      let endpoint = '';
      if (updateType === 'prices') {
        endpoint = `/market/update-ticker-price/${ticker}`;
      } else {
        endpoint = `/market/update-ticker-metrics/${ticker}`;
      }

      // Make sure we're not using a URL that includes the API_BASE_URL
      if (endpoint.includes(API_BASE_URL)) {
        endpoint = endpoint.replace(API_BASE_URL, '');
      }

      const response = await fetchWithAuth(endpoint, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.message || 'Update failed');
      }

      setResult({
        ticker,
        updateType,
        details: data
      });
      addLog(`Success: Updated ${ticker} (${updateType})`, 'success');
    } catch (err) {
      setError(err.message || 'Failed to update ticker');
      addLog(`Error updating ${ticker}: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process multiple tickers (from input)
  const processMultipleTickers = async () => {
    const tickerList = multiTickers.split(',').map(t => t.trim()).filter(t => t);
    if (!tickerList.length) {
      setError('Please enter at least one ticker');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setProgressStatus({
      processed: 0,
      total: tickerList.length,
      currentTicker: '',
      startTime: Date.now(),
      estimatedTimeRemaining: null
    });
    addLog(`Starting batch update for ${tickerList.length} tickers (${updateType})`, 'info');

    try {
      let endpoint = '';
      if (updateType === 'prices') {
        endpoint = `/market/update-tickers-price/${tickerList.join(',')}`;
      } else {
        endpoint = `/market/update-tickers-metrics/${tickerList.join(',')}`;
      }
      
      // Make sure we're not using a URL that includes the API_BASE_URL
      if (endpoint.includes(API_BASE_URL)) {
        endpoint = endpoint.replace(API_BASE_URL, '');
      }
      
      const response = await fetchWithAuth(endpoint, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.message || 'Batch update failed');
      }

      setResult({
        tickersCount: data.total_tickers,
        successCount: data.success_count,
        failedCount: data.failed_count,
        details: data
      });
      
      addLog(`Completed update: ${data.success_count}/${data.total_tickers} successful (${updateType})`, 'success');
    } catch (err) {
      setError(err.message || 'Failed to update tickers');
      addLog(`Error in batch update: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process all securities (in batches)
  const processAllSecurities = async () => {
    if (!allSecurities.length) {
      setError('No securities found to update');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    
    // Reset progress
    setProgressStatus({
      processed: 0,
      total: allSecurities.length,
      currentTicker: '',
      startTime: Date.now(),
      estimatedTimeRemaining: null
    });
    
    addLog(`Starting update for all ${allSecurities.length} securities (${updateType})`, 'info');

    try {
      // Process in batches
      const batches = [];
      for (let i = 0; i < allSecurities.length; i += batchSize) {
        batches.push(allSecurities.slice(i, i + batchSize));
      }

      let successCount = 0;
      let failureCount = 0;

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchTickerString = batch.join(',');
        
        // Update progress status
        setProgressStatus(prev => ({
          ...prev,
          processed: i * batchSize,
          currentTicker: batch[0],
          estimatedTimeRemaining: calculateTimeRemaining(i * batchSize, allSecurities.length, prev.startTime)
        }));

        addLog(`Processing batch ${i+1}/${batches.length}: ${batch.join(', ')}`, 'info');

        try {
          let endpoint = '';
          if (updateType === 'prices') {
            endpoint = `/market/update-tickers-price/${batchTickerString}`;
          } else {
            endpoint = `/market/update-tickers-metrics/${batchTickerString}`;
          }

          // Make sure we're not using a URL that includes the API_BASE_URL
          if (endpoint.includes(API_BASE_URL)) {
            endpoint = endpoint.replace(API_BASE_URL, '');
          }

          const response = await fetchWithAuth(endpoint, {
            method: 'POST'
          });

          if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          // Count successes and failures
          if (data.results && Array.isArray(data.results)) {
            data.results.forEach(result => {
              if (result.success) {
                successCount++;
                addLog(`✓ Updated ${result.ticker}`, 'success');
              } else {
                failureCount++;
                addLog(`✗ Failed to update ${result.ticker}: ${result.message}`, 'error');
              }
            });
          } else if (data.success_count && data.failed_count) {
            successCount += data.success_count;
            failureCount += data.failed_count;
          }

          // Add batch summary to logs
          addLog(`Batch ${i+1} complete: ${successCount} succeeded, ${failureCount} failed so far`, 'info');

          // Update progress
          setProgressStatus(prev => ({
            ...prev,
            processed: Math.min((i + 1) * batchSize, allSecurities.length),
            estimatedTimeRemaining: calculateTimeRemaining((i + 1) * batchSize, allSecurities.length, prev.startTime)
          }));

          // Delay between batches (to avoid overloading the server)
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        } catch (batchError) {
          addLog(`Error processing batch ${i+1}: ${batchError.message}`, 'error');
          failureCount += batch.length;
        }
      }

      // Update final result
      setResult({
        tickersCount: allSecurities.length,
        successCount,
        failedCount: failureCount,
        details: { processed: allSecurities.length }
      });
      
      addLog(`All updates complete: ${successCount}/${allSecurities.length} successful (${updateType})`, 'success');
    } catch (err) {
      setError(err.message || 'Failed updating securities');
      addLog(`Global error in update process: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate estimated time remaining based on progress
  const calculateTimeRemaining = (processed, total, startTime) => {
    if (!startTime || processed === 0) return null;
    
    const elapsedMs = Date.now() - startTime;
    const msPerItem = elapsedMs / processed;
    const remainingItems = total - processed;
    const estimatedRemainingMs = msPerItem * remainingItems;
    
    // Convert to seconds/minutes
    if (estimatedRemainingMs < 60000) {
      return `${Math.round(estimatedRemainingMs / 1000)}s`;
    } else {
      return `${Math.round(estimatedRemainingMs / 60000)}m ${Math.round((estimatedRemainingMs % 60000) / 1000)}s`;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (activeTab === 'single') {
      await processSingleTicker();
    } else if (activeTab === 'multiple') {
      await processMultipleTickers();
    } else if (activeTab === 'all') {
      await processAllSecurities();
    }
  };
  
  // Reset form and state
  const resetForm = () => {
    setTicker('');
    setMultiTickers('');
    setResult(null);
    setError(null);
    setUpdateLogs([]);
    setProgressStatus({
      processed: 0,
      total: 0,
      currentTicker: '',
      startTime: null,
      estimatedTimeRemaining: null
    });
  };
  
  // Close the modal and reset state
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get title for current update mode
  const getModeTitle = () => {
    if (activeTab === 'single') return 'Single Security';
    if (activeTab === 'multiple') return 'Multiple Securities';
    return 'All Securities';
  };

  // Render the progress bar
  const renderProgressBar = () => {
    const { processed, total } = progressStatus;
    const percent = total > 0 ? Math.floor((processed / total) * 100) : 0;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>{processed} of {total} processed ({percent}%)</span>
          {progressStatus.estimatedTimeRemaining && (
            <span className="text-gray-600">
              <Clock className="inline w-4 h-4 mr-1" />
              Est. time remaining: {progressStatus.estimatedTimeRemaining}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        {progressStatus.currentTicker && (
          <div className="text-xs text-gray-600 mt-1">
            Currently updating: {progressStatus.currentTicker}
          </div>
        )}
      </div>
    );
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Update Market Data - ${getModeTitle()}`}
      size="max-w-2xl"
    >
      <div className="pt-4 pb-6">
        {/* Success Message */}
        {result && (
          <div className="mb-6 p-5 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            <div className="flex items-start">
              <Check className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-lg mb-2">Update Completed Successfully</h3>
                {activeTab === 'single' ? (
                  <p>
                    Security <span className="font-bold">{result.ticker}</span> has been updated.
                    {result.details && result.details.current_price && (
                      <span className="block mt-1">Current price: ${result.details.current_price}</span>
                    )}
                  </p>
                ) : (
                  <div>
                    <p className="mb-2">
                      Processed <span className="font-bold">{result.tickersCount}</span> securities:
                    </p>
                    <div className="flex space-x-4">
                      <div className="px-3 py-2 bg-green-100 rounded text-center">
                        <span className="block text-lg font-bold">{result.successCount}</span>
                        <span className="text-sm">Successful</span>
                      </div>
                      <div className="px-3 py-2 bg-red-100 rounded text-center">
                        <span className="block text-lg font-bold">{result.failedCount}</span>
                        <span className="text-sm">Failed</span>
                      </div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={resetForm}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                >
                  Update More Data
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-5 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-lg mb-1">Update Failed</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Progress Bar (visible during batch processing) */}
        {isSubmitting && (activeTab === 'multiple' || activeTab === 'all') && renderProgressBar()}
        
        {/* Only show the form if not showing a result */}
        {!result && (
          <div>
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'single' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('single')}
              >
                Single Security
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'multiple' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('multiple')}
              >
                Multiple Securities
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'all' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All Securities
              </button>
            </div>

            <form className="space-y-6">
              {/* Update Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Update Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setUpdateType('prices')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center transition-colors ${
                      updateType === 'prices'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <TrendingUp className={`w-8 h-8 mb-2 ${updateType === 'prices' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="font-medium">Current Prices</span>
                    <span className="text-xs text-gray-500 mt-1">Update security pricing data only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType('metrics')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center transition-colors ${
                      updateType === 'metrics'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <BarChart4 className={`w-8 h-8 mb-2 ${updateType === 'metrics' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="font-medium">Company Metrics</span>
                    <span className="text-xs text-gray-500 mt-1">Update PE, market cap, sector info, etc.</span>
                  </button>
                </div>
              </div>
              
              {/* Single Security Mode */}
              {activeTab === 'single' && (
                <div>
                  <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-2">
                    Ticker Symbol
                  </label>
                  <input
                    type="text"
                    id="ticker"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              )}
              
              {/* Multiple Securities Mode */}
              {activeTab === 'multiple' && (
                <div>
                  <label htmlFor="multiple-tickers" className="block text-sm font-medium text-gray-700 mb-2">
                    Ticker Symbols (comma separated)
                  </label>
                  <textarea
                    id="multiple-tickers"
                    value={multiTickers}
                    onChange={(e) => setMultiTickers(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL, MSFT, GOOGL"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              )}
              
              {/* All Securities Mode */}
              {activeTab === 'all' && (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-sm font-medium text-gray-700">
                        Update All Securities
                      </span>
                      <span className="block text-xs text-gray-500 mt-1">
                        {loadingSecurities ? 'Loading securities...' :
                         allSecurities.length > 0 ? `${allSecurities.length} securities will be updated` :
                         'No securities found. Click "Refresh List" to fetch securities.'}
                      </span>
                    </div>
                    <button
                      type="button" 
                      onClick={fetchAllSecurities}
                      disabled={loadingSecurities}
                      className={`px-3 py-1 text-sm rounded border ${
                        loadingSecurities 
                          ? 'bg-gray-100 text-gray-400 border-gray-200' 
                          : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      {loadingSecurities ? (
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-1" />
                      ) : (
                        <RefreshCw className="w-4 h-4 inline mr-1" />
                      )}
                      Refresh List
                    </button>
                  </div>
                  
                  {/* Advanced Options Toggle */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                    >
                      {showAdvanced ? (
                        <ChevronDown className="w-4 h-4 mr-1" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-1" />
                      )}
                      Advanced Options
                    </button>
                    
                    {showAdvanced && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="batch-size" className="block text-sm font-medium text-gray-700 mb-1">
                              Batch Size
                            </label>
                            <input
                              type="number"
                              id="batch-size"
                              value={batchSize}
                              onChange={(e) => setBatchSize(parseInt(e.target.value))}
                              min={1}
                              max={20}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Tickers processed in each API call
                            </p>
                          </div>
                          <div>
                            <label htmlFor="delay" className="block text-sm font-medium text-gray-700 mb-1">
                              Delay Between Batches (ms)
                            </label>
                            <input
                              type="number"
                              id="delay"
                              value={delayBetweenBatches}
                              onChange={(e) => setDelayBetweenBatches(parseInt(e.target.value))}
                              min={0}
                              step={100}
                              max={5000}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Milliseconds between API calls
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Update Logs (only show when logs exist) */}
              {updateLogs.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Update Logs</h3>
                    <button
                      type="button"
                      onClick={() => setUpdateLogs([])}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4 inline" /> Clear
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    {updateLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`px-3 py-1.5 border-b border-gray-200 last:border-0 ${
                          log.type === 'error' ? 'text-red-600 bg-red-50' :
                          log.type === 'success' ? 'text-green-600' :
                          'text-gray-700'
                        }`}
                      >
                        <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                        {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button 
          onClick={handleClose} 
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
        >
          Close
        </button>
        
        {!result && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || 
              (activeTab === 'single' && !ticker) || 
              (activeTab === 'multiple' && !multiTickers) ||
              (activeTab === 'all' && allSecurities.length === 0)}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm flex items-center ${
              isSubmitting || 
              (activeTab === 'single' && !ticker) || 
              (activeTab === 'multiple' && !multiTickers) ||
              (activeTab === 'all' && allSecurities.length === 0)
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-700'
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
                Start Update
              </>
            )}
          </button>
        )}
      </div>
    </FixedModal>
  );
};

export default UpdateMarketDataModal;