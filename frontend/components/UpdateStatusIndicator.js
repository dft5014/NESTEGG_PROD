// components/UpdateStatusIndicator.js
import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Clock, Database, BarChart2 } from 'lucide-react';
import { useUpdateCheck } from '@/context/UpdateCheckContext';

export default function UpdateStatusIndicator() {
  const { updateStatus, manuallyTriggerUpdate, fetchSecurityStats } = useUpdateCheck();
  const [isOpen, setIsOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [securityStats, setSecurityStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Check if price data is stale
  const isPriceDataStale = updateStatus?.price_updates?.is_stale;
  const isUpdateInProgress = updateStatus?.price_updates?.in_progress;
  
  // Load security stats when dropdown is opened
  useEffect(() => {
    if (isOpen && !securityStats && !loading) {
      loadSecurityStats();
    }
  }, [isOpen, securityStats, loading]);
  
  // Function to load security statistics
  const loadSecurityStats = async () => {
    setLoading(true);
    try {
      const stats = await fetchSecurityStats();
      setSecurityStats(stats);
    } catch (error) {
      console.error("Failed to fetch security statistics:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format time since last update
  const formatTimeSince = (minutes) => {
    if (!minutes) return 'Unknown';
    if (minutes < 60) {
      return `${Math.round(minutes)} min ago`;
    } else if (minutes < 24 * 60) {
      return `${Math.floor(minutes / 60)} hr ${Math.round(minutes % 60)} min ago`;
    } else {
      return `${Math.floor(minutes / (24 * 60))} days ${Math.floor((minutes % (24 * 60)) / 60)} hr ago`;
    }
  };
  
  // Handle manual update trigger
  const handleTriggerUpdate = async (type) => {
    if (triggering || isUpdateInProgress) return;
    
    setTriggering(true);
    await manuallyTriggerUpdate(type);
    setTriggering(false);
    
    // Refresh security stats after update
    loadSecurityStats();
  };
  
  // Determine status indicators based on stats
  const getStatusIndicator = () => {
    if (!securityStats) {
      return { 
        status: 'unknown',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        icon: <Clock className="h-3 w-3" />,
        text: 'Data status unknown'
      };
    }
    
    // Check if all prices need updating
    const allPricesNeedUpdate = securityStats.statistics.price_needs_update === securityStats.statistics.total_securities;
    
    if (isUpdateInProgress) {
      return {
        status: 'updating',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        text: 'Updating data...'
      };
    } else if (allPricesNeedUpdate) {
      return {
        status: 'stale',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: <AlertTriangle className="h-3 w-3" />,
        text: 'All data needs update'
      };
    } else if (securityStats.statistics.price_needs_update > 0) {
      return {
        status: 'partial',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        icon: <BarChart2 className="h-3 w-3" />,
        text: `${securityStats.statistics.price_needs_update} need update`
      };
    } else {
      return {
        status: 'current',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <Clock className="h-3 w-3" />,
        text: 'All prices current'
      };
    }
  };
  
  const statusIndicator = getStatusIndicator();
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${statusIndicator.color}`}
      >
        {statusIndicator.icon}
        <span>{statusIndicator.text}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-800 dark:text-white mb-2 flex justify-between items-center">
            <span>Market Data Status</span>
            <button
              onClick={loadSecurityStats}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              title="Refresh stats"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            </div>
          ) : !securityStats ? (
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
              Failed to load security statistics
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Last updated:</span>
                  <span className="font-medium">
                    {securityStats.statistics.prices_last_updated ? 
                     new Date(securityStats.statistics.prices_last_updated).toLocaleString() : 
                     'Never'}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Active securities:</span>
                  <span className="font-medium">
                    {securityStats.statistics.active_securities} / {securityStats.statistics.total_securities}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Securities with positions:</span>
                  <span className="font-medium">
                    {securityStats.statistics.securities_with_positions}
                  </span>
                </div>

                <div className="text-xs text-gray-700 dark:text-gray-300 mt-2 font-medium">Active Price Age:</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded text-center">
                    <div className="text-gray-500 dark:text-gray-400 text-[10px]">Min</div>
                    <div className="font-medium">{formatTimeSince(securityStats.statistics.active_price_age_minutes?.min)}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded text-center">
                    <div className="text-gray-500 dark:text-gray-400 text-[10px]">Avg</div>
                    <div className="font-medium">{formatTimeSince(securityStats.statistics.active_price_age_minutes?.avg)}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded text-center">
                    <div className="text-gray-500 dark:text-gray-400 text-[10px]">Max</div>
                    <div className="font-medium">{formatTimeSince(securityStats.statistics.active_price_age_minutes?.max)}</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-700 dark:text-gray-300 mt-2 font-medium">By Asset Type:</div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
                  {Object.entries(securityStats.statistics.by_asset_type).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{type}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
                
                <div className="text-xs text-gray-700 dark:text-gray-300 mt-2 font-medium">Update Status:</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Prices to update:</span>
                    <span className="font-medium">{securityStats.statistics.price_needs_update}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Metrics to update:</span>
                    <span className="font-medium">{securityStats.statistics.metrics_needs_update}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleTriggerUpdate('price_updates')}
                  disabled={triggering || isUpdateInProgress}
                  className={`flex-1 py-1 px-2 rounded text-xs ${
                    triggering || isUpdateInProgress ? 
                    'bg-gray-400 text-white cursor-not-allowed' : 
                    'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {triggering || isUpdateInProgress ? 'Updating prices...' : 'Update prices'}
                </button>
                
                <button
                  onClick={() => handleTriggerUpdate('metrics_updates')}
                  disabled={triggering || isUpdateInProgress}
                  className={`flex-1 py-1 px-2 rounded text-xs ${
                    triggering || isUpdateInProgress ? 
                    'bg-gray-400 text-white cursor-not-allowed' : 
                    'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {triggering || isUpdateInProgress ? 'Updating metrics...' : 'Update metrics'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}