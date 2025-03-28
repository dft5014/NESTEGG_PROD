// components/UpdateStatusIndicator.js
import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { useUpdateCheck } from '@/context/UpdateCheckContext';

export default function UpdateStatusIndicator() {
  const { updateStatus, manuallyTriggerUpdate } = useUpdateCheck();
  const [isOpen, setIsOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  
  // Check if price data is stale
  const isPriceDataStale = updateStatus?.price_updates?.is_stale;
  const isUpdateInProgress = updateStatus?.price_updates?.in_progress;
  
  // Format time since last update
  const formatTimeSince = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min ago`;
    } else {
      return `${Math.round(minutes / 60)} hr ${Math.round(minutes % 60)} min ago`;
    }
  };
  
  // Handle manual update trigger
  const handleTriggerUpdate = async () => {
    if (triggering || isUpdateInProgress) return;
    
    setTriggering(true);
    await manuallyTriggerUpdate('price_updates');
    setTriggering(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
          isPriceDataStale ? 
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }`}
      >
        {isUpdateInProgress ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : isPriceDataStale ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        <span>
          {isUpdateInProgress ? 'Updating...' : 
           isPriceDataStale ? 'Data is stale' : 
           'Prices up to date'}
        </span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-800 dark:text-white mb-2">Market Data Status</div>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Last updated:</span>
              <span className="font-medium">
                {updateStatus?.price_updates?.last_updated ? 
                 formatTimeSince(updateStatus?.price_updates?.minutes_since_update) : 
                 'Never'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${
                isUpdateInProgress ? 'text-blue-600 dark:text-blue-400' :
                isPriceDataStale ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {isUpdateInProgress ? 'Updating now' :
                 isPriceDataStale ? 'Update needed' :
                 'Up to date'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Update threshold:</span>
              <span className="font-medium">
                {updateStatus?.price_updates?.threshold_minutes} minutes
              </span>
            </div>
          </div>
          
          {(isPriceDataStale || isUpdateInProgress) && (
            <button
              onClick={handleTriggerUpdate}
              disabled={triggering || isUpdateInProgress}
              className={`w-full py-1 px-2 rounded text-xs ${
                triggering || isUpdateInProgress ? 
                'bg-gray-400 text-white cursor-not-allowed' : 
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {triggering || isUpdateInProgress ? 'Updating...' : 'Update now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}