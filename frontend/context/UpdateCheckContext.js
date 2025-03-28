// context/UpdateCheckContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { fetchWithAuth } from '@/utils/api';

const UpdateCheckContext = createContext();

export const useUpdateCheck = () => useContext(UpdateCheckContext);

export const UpdateCheckProvider = ({ children }) => {
  const { user } = useAuth();
  const [updateStatus, setUpdateStatus] = useState({
    price_updates: { is_stale: false, in_progress: false },
    metrics_updates: { is_stale: false, in_progress: false },
    history_updates: { is_stale: false, in_progress: false },
    portfolio_snapshots: { is_stale: false, in_progress: false }
  });
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // Check for updates on initial load and periodically
  useEffect(() => {
    if (!user) return;

    const checkUpdates = async () => {
      setIsCheckingUpdates(true);
      try {
        const response = await fetchWithAuth('/system/update-status');
        if (response.ok) {
          const data = await response.json();
          setUpdateStatus(data);
          setLastChecked(new Date());
          
          // Check if any updates are stale but not in progress
          for (const [type, status] of Object.entries(data)) {
            if (status.is_stale && !status.in_progress) {
              console.log(`${type} is stale, attempting to trigger update`);
              triggerUpdate(type);
              // Only trigger one update at a time
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error checking update status:', error);
      } finally {
        setIsCheckingUpdates(false);
      }
    };

    // Check immediately on mount
    checkUpdates();
    
    // Then check every 5 minutes
    const interval = setInterval(checkUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Function to trigger an update
  const triggerUpdate = async (updateType) => {
    // Try to acquire lock
    try {
      const lockResponse = await fetchWithAuth('/system/acquire-update-lock', {
        method: 'POST',
        body: JSON.stringify({ update_type: updateType })
      });
      
      if (!lockResponse.ok) {
        console.log(`Failed to acquire lock for ${updateType}`);
        return false;
      }
      
      const lockResult = await lockResponse.json();
      if (!lockResult.lock_acquired) {
        console.log(`Lock not acquired for ${updateType}`);
        return false;
      }
      
      // Lock acquired, trigger the appropriate update
      let endpoint;
      switch (updateType) {
        case 'price_updates':
          endpoint = '/market/update-prices-v2';
          break;
        case 'metrics_updates':
          endpoint = '/market/update-metrics';
          break;
        case 'history_updates':
          endpoint = '/market/update-history';
          break;
        case 'portfolio_snapshots':
          endpoint = '/portfolios/calculate/all';
          break;
        default:
          console.error(`Unknown update type: ${updateType}`);
          return false;
      }
      
      // Set as in progress in local state
      setUpdateStatus(prev => ({
        ...prev,
        [updateType]: { ...prev[updateType], in_progress: true }
      }));
      
      // Trigger the update
      const updateResponse = await fetchWithAuth(endpoint, {
        method: 'POST'
      });
      
      // Refresh status after update
      const statusResponse = await fetchWithAuth('/system/update-status');
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setUpdateStatus(data);
      }
      
      return updateResponse.ok;
    } catch (error) {
      console.error(`Error triggering ${updateType}:`, error);
      return false;
    }
  };

  // Manual trigger function exposed to components
  const manuallyTriggerUpdate = async (updateType) => {
    return await triggerUpdate(updateType);
  };

  return (
    <UpdateCheckContext.Provider
      value={{
        updateStatus,
        isCheckingUpdates,
        lastChecked,
        manuallyTriggerUpdate
      }}
    >
      {children}
    </UpdateCheckContext.Provider>
  );
};