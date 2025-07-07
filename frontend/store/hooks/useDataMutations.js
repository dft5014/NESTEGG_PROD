// store/hooks/useDataMutations.js
import { useCallback } from 'react';
import { useDataStore } from '../DataStore';
import * as positionMethods from '@/utils/apimethods/positionMethods';

export const useDataMutations = () => {
  const { actions } = useDataStore();
  const { markDataStale, refreshData } = actions;

  /**
   * Wrapper that marks data as stale after mutation succeeds
   */
  const wrapMutation = useCallback(
    (mutationFn) => {
      return async (...args) => {
        try {
          const result = await mutationFn(...args);
          
          // Mark data as stale, which will trigger auto-refresh
          markDataStale();
          
          return result;
        } catch (error) {
          console.error('Mutation error:', error);
          throw error;
        }
      };
    },
    [markDataStale]
  );

  /**
   * Wrapper that immediately refreshes after mutation
   */
  const wrapMutationWithRefresh = useCallback(
    (mutationFn) => {
      return async (...args) => {
        try {
          const result = await mutationFn(...args);
          
          // Immediately refresh the data
          await refreshData();
          
          return result;
        } catch (error) {
          console.error('Mutation error:', error);
          throw error;
        }
      };
    },
    [refreshData]
  );

  // Wrapped position methods
  const mutations = {
    // Securities
    addSecurityPosition: wrapMutation(positionMethods.addSecurityPosition),
    updateSecurityPosition: wrapMutation(positionMethods.updatePosition),
    deleteSecurityPosition: wrapMutation(positionMethods.deletePosition),
    
    // Crypto
    addCryptoPosition: wrapMutation(positionMethods.addCryptoPosition),
    updateCryptoPosition: wrapMutation((id, data) => 
      positionMethods.updatePosition(id, data, 'crypto')
    ),
    deleteCryptoPosition: wrapMutation((id) => 
      positionMethods.deletePosition(id, 'crypto')
    ),
    
    // Cash
    addCashPosition: wrapMutation(positionMethods.addCashPosition),
    updateCashPosition: wrapMutation(positionMethods.updateCashPosition),
    deleteCashPosition: wrapMutation(positionMethods.deleteCashPosition),
    
    // Metals
    addMetalPosition: wrapMutation(positionMethods.addMetalPosition),
    updateMetalPosition: wrapMutation((id, data) => 
      positionMethods.updatePosition(id, data, 'metal')
    ),
    deleteMetalPosition: wrapMutation((id) => 
      positionMethods.deletePosition(id, 'metal')
    ),
    
    // Real Estate
    addRealEstatePosition: wrapMutation(positionMethods.addRealEstatePosition),
    updateRealEstatePosition: wrapMutation((id, data) => 
      positionMethods.updatePosition(id, data, 'realestate')
    ),
    deleteRealEstatePosition: wrapMutation((id) => 
      positionMethods.deletePosition(id, 'realestate')
    ),
    
    // Other Assets
    addOtherAsset: wrapMutation(positionMethods.addOtherAsset),
    updateOtherAsset: wrapMutation(positionMethods.updateOtherAsset),
    deleteOtherAsset: wrapMutation(positionMethods.deleteOtherAsset),
    
    // Liabilities
    addLiability: wrapMutation(positionMethods.addLiability),
    updateLiability: wrapMutation(positionMethods.updateLiability),
    deleteLiability: wrapMutation(positionMethods.deleteLiability),
  };

  return {
    mutations,
    wrapMutation,
    wrapMutationWithRefresh,
    refreshData,
    markDataStale,
  };
};