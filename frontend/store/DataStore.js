import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { fetchWithAuth } from '@/utils/api';

// Initial state with full data structure
const initialState = {
  portfolioSummary: {
    // Core metrics
    data: null,
    // Historical trend data
    history: [],
    // Rich JSON fields
    topLiquidPositions: [],
    topPerformersAmount: [],
    topPerformersPercent: [],
    accountDiversification: [],
    assetPerformanceDetail: {},
    sectorAllocation: {},
    riskMetrics: {},
    institutionAllocation: [],
    concentrationMetrics: {},
    dividendMetrics: {},
    taxEfficiencyMetrics: {},
    // Meta
    loading: false,
    error: null,
    lastFetched: null,
    isStale: false,
  },
};

// Action types
export const ActionTypes = {
  FETCH_SUMMARY_START: 'FETCH_SUMMARY_START',
  FETCH_SUMMARY_SUCCESS: 'FETCH_SUMMARY_SUCCESS',
  FETCH_SUMMARY_ERROR: 'FETCH_SUMMARY_ERROR',
  MARK_DATA_STALE: 'MARK_DATA_STALE',
  RESET_STORE: 'RESET_STORE',
};

// Reducer
const dataStoreReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.FETCH_SUMMARY_START:
      return {
        ...state,
        portfolioSummary: {
          ...state.portfolioSummary,
          loading: true,
          error: null,
        },
      };

    case ActionTypes.FETCH_SUMMARY_SUCCESS:
      // CRITICAL: Deep clone the summary to prevent ANY mutations
      const rawSummary = action.payload.summary || {};
      const summary = JSON.parse(JSON.stringify(rawSummary)); // Deep clone
      const history = action.payload.history || [];
      
      // Helper function to safely parse JSON fields
      const safeJsonParse = (fieldValue, defaultValue = []) => {
        if (typeof fieldValue === 'string') {
          try {
            return JSON.parse(fieldValue);
          } catch (e) {
            console.error('Failed to parse JSON field:', e);
            return defaultValue;
          }
        }
        return fieldValue || defaultValue;
      };
      
      // Parse JSON fields from the cloned summary
      const topLiquidPositions = safeJsonParse(summary.top_liquid_positions);
      const topPerformersAmount = safeJsonParse(summary.top_performers_amount);
      const topPerformersPercent = safeJsonParse(summary.top_performers_percent);
      const accountDiversification = safeJsonParse(summary.account_diversification);
      const sectorAllocation = safeJsonParse(summary.sector_allocation, {});
      const institutionAllocation = safeJsonParse(summary.institution_allocation);
      const riskMetrics = safeJsonParse(summary.risk_metrics, {});
      const concentrationMetrics = safeJsonParse(summary.concentration_metrics, {});
      const dividendMetrics = safeJsonParse(summary.dividend_metrics, {});
      const taxEfficiencyMetrics = safeJsonParse(summary.tax_efficiency_metrics, {});
      const netCashBasisMetrics = safeJsonParse(summary.net_cash_basis_metrics, {});
      
      // Parse and process asset_performance_detail
      let assetPerformanceDetail = safeJsonParse(summary.asset_performance_detail, {});
      
      // Process asset performance to multiply ONLY percent_change and gain_loss_percent by 100
      const processedAssetPerformance = {};
      Object.entries(assetPerformanceDetail).forEach(([assetType, data]) => {
        processedAssetPerformance[assetType] = { ...data };
        
        // Process time period data
        ['daily', 'weekly', 'monthly', 'ytd', 'quarterly', 'yearly', 'two_year', 'three_year'].forEach(period => {
          if (data[period] && typeof data[period] === 'object') {
            processedAssetPerformance[assetType][period] = { ...data[period] };
            if (data[period].percent_change !== null && data[period].percent_change !== undefined) {
              processedAssetPerformance[assetType][period].percent_change = data[period].percent_change * 100;
            }
          }
        });
        
        // Process gain_loss_percent but NOT percentage (which is portfolio mix)
        if (data.gain_loss_percent !== null && data.gain_loss_percent !== undefined) {
          processedAssetPerformance[assetType].gain_loss_percent = data.gain_loss_percent * 100;
        }
      });
      
      // Clean and process top positions
      const cleanedTopPositions = (Array.isArray(topLiquidPositions) ? topLiquidPositions : [])
        .filter(position => position && position.current_value !== null && position.current_value > 0)
        .sort((a, b) => b.current_value - a.current_value)
        .map(position => ({
          ...position,
          name: position.name || position.identifier,
          gain_loss_percent: position.gain_loss_percent || 0,
          sector: position.sector || 'Unknown',
          percentage: position.percentage || 0
        }));
      
      // Clean account diversification
      const cleanedAccountDivers = (Array.isArray(accountDiversification) ? accountDiversification : [])
        .filter(account => account && account.value !== null && account.value > 0)
        .sort((a, b) => b.value - a.value);
      
      // Filter institution allocation
      const cleanedInstitutionAlloc = (Array.isArray(institutionAllocation) ? institutionAllocation : [])
        .filter(inst => inst && inst.value > 0)
        .sort((a, b) => b.value - a.value);

      return {
        ...state,
        portfolioSummary: {
          ...state.portfolioSummary,
          data: rawSummary,  // Use the ORIGINAL, unmutated summary
          history: history,
          topLiquidPositions: cleanedTopPositions,
          topPerformersAmount: topPerformersAmount,
          topPerformersPercent: topPerformersPercent,
          accountDiversification: cleanedAccountDivers,
          assetPerformanceDetail: processedAssetPerformance,
          sectorAllocation: sectorAllocation,
          riskMetrics: riskMetrics,
          institutionAllocation: cleanedInstitutionAlloc,
          concentrationMetrics: concentrationMetrics,
          dividendMetrics: dividendMetrics,
          taxEfficiencyMetrics: taxEfficiencyMetrics,
          netCashBasisMetrics: netCashBasisMetrics,
          loading: false,
          error: null,
          lastFetched: Date.now(),
          isStale: false,
        },
      };

    case ActionTypes.FETCH_SUMMARY_ERROR:
      return {
        ...state,
        portfolioSummary: {
          ...state.portfolioSummary,
          loading: false,
          error: action.payload,
        },
      };

    case ActionTypes.MARK_DATA_STALE:
      return {
        ...state,
        portfolioSummary: {
          ...state.portfolioSummary,
          isStale: true,
        },
      };

    case ActionTypes.RESET_STORE:
      return initialState;

    default:
      return state;
  }
};

// Context
const DataStoreContext = createContext(null);

// Provider
export const DataStoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dataStoreReducer, initialState);

  // Fetch portfolio data
  const fetchPortfolioData = useCallback(async (force = false) => {
    // Skip if loading
    if (state.portfolioSummary.loading && !force) return;

    // Skip if data is fresh (< 1 minute) unless forced
    const oneMinuteAgo = Date.now() - 60000;
    if (!force && 
        state.portfolioSummary.lastFetched && 
        state.portfolioSummary.lastFetched > oneMinuteAgo && 
        !state.portfolioSummary.isStale) {
      return;
    }

    dispatch({ type: ActionTypes.FETCH_SUMMARY_START });

    try {
      const response = await fetchWithAuth('/portfolio/net_worth_summary/datastore?include_history=true');
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data');
      }
      
      const data = await response.json();
      
      dispatch({
        type: ActionTypes.FETCH_SUMMARY_SUCCESS,
        payload: data,
      });
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      dispatch({
        type: ActionTypes.FETCH_SUMMARY_ERROR,
        payload: error.message,
      });
    }
  }, [state.portfolioSummary.loading, state.portfolioSummary.lastFetched, state.portfolioSummary.isStale]);

  // Mark data as stale
  const markDataStale = useCallback(() => {
    dispatch({ type: ActionTypes.MARK_DATA_STALE });
  }, []);

  // Initial load
  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Auto-refresh stale data
  useEffect(() => {
    if (state.portfolioSummary.isStale && !state.portfolioSummary.loading) {
      fetchPortfolioData();
    }
  }, [state.portfolioSummary.isStale, state.portfolioSummary.loading, fetchPortfolioData]);

  const value = {
    state,
    actions: {
      fetchPortfolioData,
      markDataStale,
      refreshData: () => fetchPortfolioData(true),
    },
  };

  return (
    <DataStoreContext.Provider value={value}>
      {children}
    </DataStoreContext.Provider>
  );
};

// Base hook
export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useDataStore must be used within DataStoreProvider');
  }
  return context;
};