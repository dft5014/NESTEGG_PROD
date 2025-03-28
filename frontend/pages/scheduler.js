// pages/scheduler.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useUpdateCheck } from '@/context/UpdateCheckContext';
import { fetchWithAuth } from '@/utils/api';
import { 
  Clock, 
  RefreshCw, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  BarChart, 
  DollarSign 
} from 'lucide-react';

export default function SchedulerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { updateStatus, isCheckingUpdates, lastChecked, manuallyTriggerUpdate } = useUpdateCheck();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState({
    securities: {
      total: 0,
      withCurrentPrices: 0,
      withOutdatedPrices: 0,
      averagePriceAge: 0
    },
    userMetrics: {
      totalUsers: 0,
      activeUsers: 0,
      totalPortfolios: 0,
      totalAccounts: 0,
      totalPositions: 0
    }
  });
  const [updateHistory, setUpdateHistory] = useState([]);
  const [processing, setProcessing] = useState({
    prices: false,
    metrics: false,
    history: false,
    portfolio: false
  });
  const [thresholds, setThresholds] = useState({
    price_updates: 15,
    metrics_updates: 1440,
    history_updates: 1440,
    portfolio_snapshots: 1440
  });
  const [isEditingThresholds, setIsEditingThresholds] = useState(false);
  
  // Fetch database status
  const fetchDatabaseStatus = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/system/database-status');
      
      if (response.ok) {
        const data = await response.json();
        setDatabaseStatus(data);
      } else {
        const errorText = await response.text();
        setError(`Failed to fetch database status: ${errorText}`);
      }
    } catch (error) {
      console.error("Error fetching database status:", error);
      setError(`Error fetching database status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch update history
  const fetchUpdateHistory = async () => {
    try {
      const response = await fetchWithAuth('/system/update-history');
      
      if (response.ok) {
        const data = await response.json();
        setUpdateHistory(data.history);
      } else {
        const errorText = await response.text();
        console.error(`Failed to fetch update history: ${errorText}`);
      }
    } catch (error) {
      console.error("Error fetching update history:", error);
    }
  };
  
  // Fetch threshold settings
  const fetchThresholds = async () => {
    try {
      const response = await fetchWithAuth('/admin/update-thresholds');
      
      if (response.ok) {
        const data = await response.json();
        setThresholds(data);
      } else {
        const errorText = await response.text();
        console.error(`Failed to fetch thresholds: ${errorText}`);
      }
    } catch (error) {
      console.error("Error fetching thresholds:", error);
    }
  };
  
  // Save threshold settings
  const saveThresholds = async () => {
    try {
      const response = await fetchWithAuth('/admin/update-thresholds', {
        method: 'POST',
        body: JSON.stringify(thresholds)
      });
      
      if (response.ok) {
        setIsEditingThresholds(false);
        alert('Thresholds updated successfully');
      } else {
        const errorText = await response.text();
        alert(`Failed to update thresholds: ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving thresholds:", error);
      alert(`Error saving thresholds: ${error.message}`);
    }
  };
  
  // Fetch initial data
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchDatabaseStatus();
    fetchUpdateHistory();
    fetchThresholds();
    
    // Refresh data periodically
    const refreshInterval = setInterval(() => {
      fetchDatabaseStatus();
      fetchUpdateHistory();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [user, router]);
  
  // Handle manual update triggers
  const handleTriggerUpdate = async (updateType) => {
    setProcessing(prev => ({ ...prev, [updateType]: true }));
    
    try {
      const success = await manuallyTriggerUpdate(updateType);
      
      if (success) {
        // Refresh history after a short delay
        setTimeout(() => {
          fetchUpdateHistory();
          fetchDatabaseStatus();
        }, 2000);
      } else {
        setError(`Failed to trigger ${updateType}`);
      }
    } catch (error) {
      console.error(`Error triggering ${updateType}:`, error);
      setError(`Error triggering ${updateType}: ${error.message}`);
    } finally {
      setProcessing(prev => ({ ...prev, [updateType]: false }));
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Format time elapsed
  const formatTimeElapsed = (dateString) => {
    if (!dateString) return "N/A";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    // Less than a minute
    if (diffMs < 60000) {
      return "Just now";
    }
    
    // Less than an hour
    if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than a day
    if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Days
    const days = Math.floor(diffMs / 86400000);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  };
  
  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">System Scheduler</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor and manage scheduled tasks for the NestEgg platform
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Last checked: {lastChecked ? formatDate(lastChecked) : 'Never'}
            {isCheckingUpdates && ' (Checking...)'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-md">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <p>{error}</p>
            </div>
            <button 
              className="mt-2 text-sm underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scheduler Tasks Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Price Updates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-3">
                  <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Price Updates</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Updates current security prices</p>
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                Every {thresholds.price_updates} minutes
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-medium dark:text-white">
                  {formatDate(updateStatus.price_updates?.last_updated)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeElapsed(updateStatus.price_updates?.last_updated)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <div className="flex items-center space-x-2">
                  <span className={`flex h-3 w-3 relative ${
                    updateStatus.price_updates?.in_progress ? "bg-yellow-400" : 
                    updateStatus.price_updates?.is_stale ? "bg-red-500" : "bg-green-500"
                  } rounded-full`}>
                    {updateStatus.price_updates?.in_progress && 
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    }
                  </span>
                  <p className="font-medium dark:text-white">
                    {updateStatus.price_updates?.in_progress ? "In Progress" : 
                     updateStatus.price_updates?.is_stale ? "Stale" : "Up to date"}
                  </p>
                </div>
                {updateStatus.price_updates?.is_stale && !updateStatus.price_updates?.in_progress && (
                  <p className="text-xs text-red-500 mt-1">
                    {Math.round(updateStatus.price_updates?.minutes_since_update)} minutes since last update
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="font-medium dark:text-white">
                  {updateStatus.price_updates?.success_count || 0} successes
                </p>
                <p className="text-xs text-red-500">
                  {updateStatus.price_updates?.failure_count || 0} failures
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Run By</p>
                <p className="font-medium dark:text-white truncate" title={updateStatus.price_updates?.lock_acquired_by}>
                  {updateStatus.price_updates?.lock_acquired_by ? 
                    updateStatus.price_updates.lock_acquired_by.substring(0, 8) + '...' : 
                    'N/A'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeElapsed(updateStatus.price_updates?.lock_acquired_at)}
                </p>
              </div>
            </div>

            <button 
              className={`w-full py-2 px-4 rounded-lg text-white ${
                updateStatus.price_updates?.in_progress || processing.prices ? 
                "bg-gray-400 cursor-not-allowed" : 
                "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={() => handleTriggerUpdate('price_updates')}
              disabled={updateStatus.price_updates?.in_progress || processing.prices}
            >
              {updateStatus.price_updates?.in_progress || processing.prices ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Updating Prices...
                </div>
              ) : (
                "Run Price Update Now"
              )}
            </button>
          </div>

          {/* Company Metrics Updates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg mr-3">
                  <BarChart className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Company Metrics</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Updates fundamental data</p>
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                Every {Math.round(thresholds.metrics_updates / 60)} hours
              </div>
            </div>
            
            {/* Similar grid layout as Price Updates */}
            {/* ... */}
            
            <button 
              className={`w-full py-2 px-4 rounded-lg text-white ${
                updateStatus.metrics_updates?.in_progress || processing.metrics ? 
                "bg-gray-400 cursor-not-allowed" : 
                "bg-purple-600 hover:bg-purple-700"
              }`}
              onClick={() => handleTriggerUpdate('metrics_updates')}
              disabled={updateStatus.metrics_updates?.in_progress || processing.metrics}
            >
              {updateStatus.metrics_updates?.in_progress || processing.metrics ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Updating Metrics...
                </div>
              ) : (
                "Run Metrics Update Now"
              )}
            </button>
          </div>

          {/* Historical Price Updates */}
          {/* Portfolio Snapshots */}
          {/* Similar to the above two components */}
        </div>

        {/* Database Status Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <Database className="h-6 w-6 text-blue-600 dark:text-blue-300 mr-3" />
            Database Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Securities Data</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Securities:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.securities.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">With Current Prices:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.securities.withCurrentPrices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">With Outdated Prices:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.securities.withOutdatedPrices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Average Price Age:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.securities.averagePriceAge.toFixed(1)} hours</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">User Data</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Users:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.userMetrics.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active Users (7d):</span>
                  <span className="font-medium dark:text-white">{databaseStatus.userMetrics.activeUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Portfolios:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.userMetrics.totalPortfolios}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Accounts:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.userMetrics.totalAccounts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Positions:</span>
                  <span className="font-medium dark:text-white">{databaseStatus.userMetrics.totalPositions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Threshold Configuration Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Update Frequency Configuration
            </h2>
            <button
              onClick={() => setIsEditingThresholds(!isEditingThresholds)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isEditingThresholds ? "Cancel" : "Edit"}
            </button>
          </div>
          
          <div className="space-y-4">
            {isEditingThresholds ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Price Updates (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={thresholds.price_updates}
                      onChange={(e) => setThresholds({...thresholds, price_updates: parseInt(e.target.value) || 15})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Metrics Updates (minutes)
                    </label>
                    <input
                      type="number"
                      min="60"
                      value={thresholds.metrics_updates}
                      onChange={(e) => setThresholds({...thresholds, metrics_updates: parseInt(e.target.value) || 1440})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(thresholds.metrics_updates / 60)} hours
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Historical Updates (minutes)
                    </label>
                    <input
                      type="number"
                      min="60"
                      value={thresholds.history_updates}
                      onChange={(e) => setThresholds({...thresholds, history_updates: parseInt(e.target.value) || 1440})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(thresholds.history_updates / 60)} hours
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Portfolio Snapshots (minutes)
                    </label>
                    <input
                      type="number"
                      min="60"
                      value={thresholds.portfolio_snapshots}
                      onChange={(e) => setThresholds({...thresholds, portfolio_snapshots: parseInt(e.target.value) || 1440})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(thresholds.portfolio_snapshots / 60)} hours
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={saveThresholds}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Configuration
                  </button>
                </div>
              </>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Update Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Price Updates</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Every {thresholds.price_updates} minutes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Company Metrics</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Every {Math.round(thresholds.metrics_updates / 60)} hours</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Historical Prices</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Every {Math.round(thresholds.history_updates / 60)} hours</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Portfolio Snapshots</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Every {Math.round(thresholds.portfolio_snapshots / 60)} hours</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Update History Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Update History
            </h2>
            <button
              onClick={fetchUpdateHistory}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Triggered At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {updateHistory.length > 0 ? (
                  updateHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {record.update_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(record.triggered_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 truncate" title={record.triggered_by}>
                        {record.triggered_by ? record.triggered_by.substring(0, 8) + '...' : 'System'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          record.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {record.completed_at ? formatDate(record.completed_at) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {record.execution_time_ms ? `${(record.execution_time_ms / 1000).toFixed(2)}s` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No update history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}