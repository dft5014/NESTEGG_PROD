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
      const summary = action.payload.summary || {};
      const history = action.payload.history || [];
      
      // Parse top_liquid_positions if it's a string
      let topPositionsData = summary.top_liquid_positions || [];
      if (typeof topPositionsData === 'string') {
        try {
          topPositionsData = JSON.parse(topPositionsData);
        } catch (e) {
          console.error('Failed to parse top_liquid_positions:', e);
          topPositionsData = [];
        }
      }
      
      // Parse account_diversification if it's a string
      let accountDiversData = summary.account_diversification || [];
      if (typeof accountDiversData === 'string') {
        try {
          accountDiversData = JSON.parse(accountDiversData);
        } catch (e) {
          console.error('Failed to parse account_diversification:', e);
          accountDiversData = [];
        }
      }
      
      // Clean and process top positions
      const cleanedTopPositions = (Array.isArray(topPositionsData) ? topPositionsData : [])
        .filter(position => position.current_value !== null && position.current_value > 0)
        .sort((a, b) => b.current_value - a.current_value)
        .map(position => ({
          ...position,
          name: position.name || position.identifier,
          gain_loss_percent: position.gain_loss_percent || 0,
          sector: position.sector || 'Unknown',
          percentage: position.percentage || 0
        }));
      
      // Clean account diversification data
      const cleanedAccountDivers = (Array.isArray(accountDiversData) ? accountDiversData : [])
        .filter(account => account.value !== null && account.value > 0)
        .sort((a, b) => b.value - a.value);

      return {
        ...state,
        portfolioSummary: {
          ...state.portfolioSummary,
          data: summary,
          history: history,
          topLiquidPositions: cleanedTopPositions,
          topPerformersAmount: summary.top_performers_amount || [],
          topPerformersPercent: summary.top_performers_percent || [],
          accountDiversification: cleanedAccountDivers,
          assetPerformanceDetail: summary.asset_performance_detail || {},
          sectorAllocation: summary.sector_allocation || {},
          riskMetrics: summary.risk_metrics || {},
          institutionAllocation: summary.institution_allocation || [],
          concentrationMetrics: summary.concentration_metrics || {},
          dividendMetrics: summary.dividend_metrics || {},
          taxEfficiencyMetrics: summary.tax_efficiency_metrics || {},
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