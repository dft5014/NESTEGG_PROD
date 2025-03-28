import { useState, useEffect, useContext } from 'react';
import Head from 'next/head';
import { AuthContext } from '@/context/AuthContext';
import { fetchWithAuth } from '@/utils/api';

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [selectedTab, setSelectedTab] = useState('schedules');
  const [configValues, setConfigValues] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const auth = useContext(AuthContext);

  // Toast message state replacement
  const [toast, setToast] = useState(null);
  
  const showToast = (title, message, variant) => {
    setToast({ title, message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch scheduler data
  useEffect(() => {
    const fetchSchedulerData = async () => {
      try {
        if (!auth.user) return;
        
        setLoading(true);
        const response = await fetchWithAuth('/system/scheduler/status');
        
        if (response.ok) {
          const data = await response.json();
          setSchedules(data.schedules || []);
          setConfigValues(data.config || {});
        }
        
        // Fetch execution history
        const historyResponse = await fetchWithAuth('/system/scheduler/history');
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setExecutionHistory(historyData.history || []);
        }
      } catch (error) {
        console.error('Error fetching scheduler data:', error);
        showToast("Error", "Failed to fetch scheduler information", "error");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchedulerData();
  }, [auth.user]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Handle config value change
  const handleConfigChange = (key, value) => {
    setConfigValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Save config changes
  const saveConfigChanges = async () => {
    try {
      setIsSaving(true);
      const response = await fetchWithAuth('/system/scheduler/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configValues),
      });
      
      if (response.ok) {
        showToast("Success", "Scheduler configuration updated", "success");
        setIsEditing(false);
      } else {
        showToast("Error", "Failed to update configuration", "error");
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showToast("Error", "An error occurred while saving configuration", "error");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Manual trigger function
  const triggerSchedule = async (scheduleId) => {
    try {
      const response = await fetchWithAuth('/system/scheduler/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule_id: scheduleId }),
      });
      
      if (response.ok) {
        showToast("Success", "Schedule triggered successfully", "success");
        
        // Refresh data
        const refreshResponse = await fetchWithAuth('/system/scheduler/status');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setSchedules(data.schedules || []);
        }
      } else {
        showToast("Error", "Failed to trigger schedule", "error");
      }
    } catch (error) {
      console.error('Error triggering schedule:', error);
      showToast("Error", "An error occurred", "error");
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Head>
          <title>System Scheduler - NestEgg</title>
        </Head>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>System Scheduler - NestEgg</title>
      </Head>
      
      {/* Simple toast message */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          toast.variant === 'error' ? 'bg-red-100 text-red-800' : 
          toast.variant === 'success' ? 'bg-green-100 text-green-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          <h4 className="font-medium">{toast.title}</h4>
          <p className="text-sm mt-1">{toast.message}</p>
        </div>
      )}
      
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">System Scheduler</h1>
          {auth.user?.is_admin && (
            <div>
              {isEditing ? (
                <div className="space-x-2">
                  <button 
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={saveConfigChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⟳</span>
                        Saving...
                      </>
                    ) : (
                      <>Save Changes</>
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Configuration
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="border-b pb-4 mb-4">
            <div className="flex mb-4">
              <button 
                className={`px-4 py-2 rounded-t-md ${
                  selectedTab === 'schedules' ? 
                  'bg-blue-600 text-white' : 
                  'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
                onClick={() => setSelectedTab('schedules')}
              >
                Scheduled Tasks
              </button>
              <button 
                className={`px-4 py-2 rounded-t-md ml-2 ${
                  selectedTab === 'history' ? 
                  'bg-blue-600 text-white' : 
                  'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
                onClick={() => setSelectedTab('history')}
              >
                Execution History
              </button>
              {auth.user?.is_admin && (
                <button 
                  className={`px-4 py-2 rounded-t-md ml-2 ${
                    selectedTab === 'configuration' ? 
                    'bg-blue-600 text-white' : 
                    'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => setSelectedTab('configuration')}
                >
                  Configuration
                </button>
              )}
            </div>
          </div>
          
          {selectedTab === 'schedules' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border rounded-lg p-4 flex flex-col">
                  <div className="mb-3">
                    <h3 className="text-lg font-medium flex items-center">
                      {schedule.name}
                      {schedule.is_running && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Running
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{schedule.description}</p>
                  </div>
                  <div className="flex-grow space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className="font-medium">
                        {schedule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Schedule:</span>
                      <span className="font-medium flex items-center">
                        {schedule.cron_expression ? (
                          <span className="flex items-center">
                            {schedule.cron_expression}
                          </span>
                        ) : (
                          <span className="flex items-center">
                            Every {schedule.interval_minutes} min
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last run:</span>
                      <span className="font-medium">{formatDate(schedule.last_run)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Next run:</span>
                      <span className="font-medium">{formatDate(schedule.next_run)}</span>
                    </div>
                    {schedule.last_status && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Last status:</span>
                        <span className={`${
                          schedule.last_status === 'success' ? 'text-green-600' :
                          schedule.last_status === 'failed' ? 'text-red-600' :
                          schedule.last_status === 'running' ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {schedule.last_status.charAt(0).toUpperCase() + schedule.last_status.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <button 
                      className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md disabled:opacity-50"
                      disabled={schedule.is_running}
                      onClick={() => triggerSchedule(schedule.id)}
                    >
                      {schedule.is_running ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⟳</span>
                          Running...
                        </>
                      ) : (
                        <>Run Now</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
              
              {schedules.length === 0 && (
                <div className="col-span-full flex items-center justify-center h-40 border rounded-lg bg-gray-50 dark:bg-gray-700/20">
                  <div className="text-center">
                    <div className="text-gray-400 text-2xl mb-2">ℹ️</div>
                    <h3 className="text-lg font-medium">No scheduled tasks</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No scheduled tasks are configured
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {selectedTab === 'history' && (
            <div>
              <h3 className="text-lg font-medium mb-1">Execution History</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Recent task executions and their results
              </p>
              
              {executionHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">Task</th>
                        <th className="px-4 py-2 text-left">Started</th>
                        <th className="px-4 py-2 text-left">Duration</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executionHistory.map((entry, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{entry.task_name}</td>
                          <td className="px-4 py-2">{formatDate(entry.start_time)}</td>
                          <td className="px-4 py-2">
                            {entry.duration ? `${entry.duration.toFixed(2)}s` : '-'}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`${
                              entry.status === 'success' ? 'text-green-600' :
                              entry.status === 'failed' ? 'text-red-600' :
                              entry.status === 'running' ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
                              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-2 max-w-xs truncate" title={entry.message || ''}>
                            {entry.message || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <div className="text-gray-400 text-2xl mb-2">ℹ️</div>
                    <h3 className="text-lg font-medium">No history yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No task execution history is available
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {auth.user?.is_admin && selectedTab === 'configuration' && (
            <div>
              <h3 className="text-lg font-medium mb-1">Scheduler Configuration</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure system scheduler settings
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="scheduler_enabled" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Scheduler Enabled
                  </label>
                  <div className="flex items-center mt-1">
                    <input
                      id="scheduler_enabled"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={configValues.scheduler_enabled === "true"}
                      disabled={!isEditing}
                      onChange={(e) => handleConfigChange('scheduler_enabled', e.target.checked ? "true" : "false")}
                    />
                    <span className="ml-2">
                      {configValues.scheduler_enabled === "true" ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="price_update_frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price Update Frequency (minutes)
                  </label>
                  <input
                    id="price_update_frequency"
                    type="number"
                    value={configValues.price_update_frequency || ""}
                    disabled={!isEditing}
                    onChange={(e) => handleConfigChange('price_update_frequency', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="metrics_update_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Metrics Update Time (HH:MM)
                  </label>
                  <input
                    id="metrics_update_time"
                    type="time"
                    value={configValues.metrics_update_time || ""}
                    disabled={!isEditing}
                    onChange={(e) => handleConfigChange('metrics_update_time', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="history_update_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    History Update Time (HH:MM)
                  </label>
                  <input
                    id="history_update_time"
                    type="time"
                    value={configValues.history_update_time || ""}
                    disabled={!isEditing}
                    onChange={(e) => handleConfigChange('history_update_time', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="portfolio_snapshot_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Portfolio Snapshot Time (HH:MM)
                  </label>
                  <input
                    id="portfolio_snapshot_time"
                    type="time"
                    value={configValues.portfolio_snapshot_time || ""}
                    disabled={!isEditing}
                    onChange={(e) => handleConfigChange('portfolio_snapshot_time', e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}