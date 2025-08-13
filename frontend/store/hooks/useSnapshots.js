// store/hooks/useSnapshots.js
import { useEffect } from 'react';
import { useDataStore } from '../DataStore';

export const useSnapshots = () => {
  const { state, actions } = useDataStore();
  const { snapshots } = state;
  const { fetchSnapshotsData } = actions;

  // Fetch on mount if not already loaded
  useEffect(() => {
    if (!snapshots.data && !snapshots.lastFetched && !snapshots.loading && !snapshots.error) {
      console.log('[useSnapshots] Auto-fetching snapshots data');
      fetchSnapshotsData();
    }
  }, []); // Empty deps - only run once on mount

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