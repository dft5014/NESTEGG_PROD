// context/UpdateCheckContext.js
import { createContext, useContext, useState } from 'react';
import { fetchWithAuth } from '@/utils/api';

// Create the context
const UpdateCheckContext = createContext();

// Custom hook for using the context
export function useUpdateCheck() {
  const context = useContext(UpdateCheckContext);
  if (!context) {
    throw new Error('useUpdateCheck must be used within an UpdateCheckProvider');
  }
  return context;
}

// Provider component
export function UpdateCheckProvider({ children }) {
  // Default status - no polling needed since endpoint doesn't exist
  const [updateStatus] = useState({
    last_price_update: null,
    last_portfolio_calculation: null,
    status: 'ok'
  });
  const [loading] = useState(false);
  const [error] = useState(null);

  // Manual trigger is not implemented on backend - stub for interface compatibility
  const manuallyTriggerUpdate = async (updateType) => {
    console.log(`Manual update trigger not available (requested: ${updateType})`);
    return false;
  };

  // Function to fetch security statistics (this endpoint exists)
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

  // No polling needed - fetchSecurityStats provides real data when needed
  const fetchUpdateStatus = async () => {
    // No-op: endpoint doesn't exist, use fetchSecurityStats instead
  };

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