// store/hooks/useSnapshots.js
import { useEffect } from 'react';
import { useDataStore } from '../DataStore';

export const useSnapshots = () => {
  const { state, actions } = useDataStore();
  const { snapshots } = state;
  const { fetchSnapshotsData } = actions;

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