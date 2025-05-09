import { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { fetchWithAuth } from '@/utils/api';

// Create the context
const UpdateCheckContext = createContext();

// Custom hook for using the context (this was missing proper export)
export function useUpdateCheck() {
  const context = useContext(UpdateCheckContext);
  if (!context) {
    throw new Error('useUpdateCheck must be used within an UpdateCheckProvider');
  }
  return context;
}

// Provider component (this was missing proper export)
export function UpdateCheckProvider({ children }) {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useContext(AuthContext);

  // Fetch update status
  const fetchUpdateStatus = async () => {
    try {
      if (!auth.user) return; // Only fetch if user is authenticated
      
      const response = await fetchWithAuth('/system/update_status');
      
      if (response.ok) {
        const data = await response.json();
        setUpdateStatus(data);
        setError(null);
      } else {
        console.error('Failed to fetch update status');
        setError('Failed to fetch update status');
      }
    } catch (err) {
      console.error('Error fetching update status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manually trigger updates
  const manuallyTriggerUpdate = async (updateType) => {
    try {
      if (!auth.user) return false;
      
      const response = await fetchWithAuth('/system/trigger_update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ update_type: updateType }),
      });
      
      if (response.ok) {
        // Refetch status after triggering update
        await fetchUpdateStatus();
        return true;
      } else {
        console.error('Failed to trigger update');
        return false;
      }
    } catch (err) {
      console.error('Error triggering update:', err);
      return false;
    }
  };

  // Function to fetch security statistics
  const fetchSecurityStats = async () => {
    try {
      const response = await fetchWithAuth('/market/security-statistics');
      if (!response.ok) {
        throw new Error(`Failed to fetch security statistics: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching security statistics:", error);
      throw error;
    }
  };

  // Initial fetch and setup interval
  useEffect(() => {
    if (auth.user) {
      fetchUpdateStatus();
      
      // Set up polling interval
      const interval = setInterval(fetchUpdateStatus, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [auth.user]);

  return (
    <UpdateCheckContext.Provider
      value={{
        updateStatus,
        loading,
        error,
        fetchUpdateStatus,
        manuallyTriggerUpdate,
        fetchSecurityStats
      }}
    >
      {children}
    </UpdateCheckContext.Provider>
  );
}

// Default export for the context
export default UpdateCheckContext;