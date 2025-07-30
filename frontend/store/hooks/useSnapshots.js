// store/hooks/useSnapshots.js
import { useContext, useEffect } from 'react';
import { DataStoreContext } from '../DataStore';

export const useSnapshots = () => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useSnapshots must be used within a DataStoreProvider');
  }

  const { snapshots, fetchSnapshotsData } = context;

  // Fetch on mount if not already loaded
  useEffect(() => {
    if (!snapshots.data && !snapshots.loading && !snapshots.error) {
      fetchSnapshotsData();
    }
  }, [snapshots.data, snapshots.loading, snapshots.error, fetchSnapshotsData]);

  return {
    snapshots: snapshots.data,
    snapshotsByDate: snapshots.byDate,
    dates: snapshots.dates,
    assetTypes: snapshots.assetTypes,
    isLoading: snapshots.loading,
    error: snapshots.error,
    refetch: fetchSnapshotsData,
    lastFetched: snapshots.lastFetched
  };
};