import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { fetchWithAuth } from '@/utils/api';

// Fetch locks to prevent concurrent fetches
const fetchLocks = new Map();

// Initial state with full data structure
const initialState = {
  reconciliation: {
    history: [],
    pending: {},
    variances: {},
    lastReconciled: {},
    loading: false,
    submitting: false,
    error: null,
    lastFetched: null
  },
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
  // NEW: Accounts data
  accounts: {
    data: [],
    summary: null,
    loading: false,
    error: null,
    lastFetched: null,
    isStale: false
  },

  groupedPositions: {
    data: [],
    summary: null,
    loading: false,
    error: null,
    lastFetched: null,
    isStale: false,
  },

  detailedPositions: {
    data: [],
    loading: false,
    error: null,
    lastFetched: null,
    isStale: false,
},

  positionHistory: {
    data: {}, // Object keyed by identifier
    loading: {}, // Loading state per identifier
    error: {}, // Error state per identifier
    lastFetched: {}, // Last fetch time per identifier
  },

  groupedLiabilities: {
  data: [],
  summary: null,
  loading: false,
  error: null,
  lastFetched: null,
  isStale: false,
  },

  snapshots: {
    data: null,
    byDate: {},
    dates: [],
    assetTypes: [],
    loading: false,
    error: null,
    lastFetched: null,
    isStale: false
  }

};

// Action types
export const ActionTypes = {
  FETCH_SUMMARY_START: 'FETCH_SUMMARY_START',
  FETCH_SUMMARY_SUCCESS: 'FETCH_SUMMARY_SUCCESS',
  FETCH_SUMMARY_ERROR: 'FETCH_SUMMARY_ERROR',
  MARK_DATA_STALE: 'MARK_DATA_STALE',
  RESET_STORE: 'RESET_STORE',
  // Accounts
  FETCH_ACCOUNTS_START: 'FETCH_ACCOUNTS_START',
  FETCH_ACCOUNTS_SUCCESS: 'FETCH_ACCOUNTS_SUCCESS',
  FETCH_ACCOUNTS_ERROR: 'FETCH_ACCOUNTS_ERROR',
  MARK_ACCOUNTS_STALE: 'MARK_ACCOUNTS_STALE',
  // GROUPED POSITIONS
  FETCH_GROUPED_POSITIONS_START: 'FETCH_GROUPED_POSITIONS_START',
  FETCH_GROUPED_POSITIONS_SUCCESS: 'FETCH_GROUPED_POSITIONS_SUCCESS',
  FETCH_GROUPED_POSITIONS_ERROR: 'FETCH_GROUPED_POSITIONS_ERROR',
  MARK_GROUPED_POSITIONS_STALE: 'MARK_GROUPED_POSITIONS_STALE',

  // Position History
  FETCH_POSITION_HISTORY_START: 'FETCH_POSITION_HISTORY_START',
  FETCH_POSITION_HISTORY_SUCCESS: 'FETCH_POSITION_HISTORY_SUCCESS',
  FETCH_POSITION_HISTORY_ERROR: 'FETCH_POSITION_HISTORY_ERROR',

  // Add to ActionTypes
  FETCH_GROUPED_LIABILITIES_START: 'FETCH_GROUPED_LIABILITIES_START',
  FETCH_GROUPED_LIABILITIES_SUCCESS: 'FETCH_GROUPED_LIABILITIES_SUCCESS',
  FETCH_GROUPED_LIABILITIES_ERROR: 'FETCH_GROUPED_LIABILITIES_ERROR',
  MARK_GROUPED_LIABILITIES_STALE: 'MARK_GROUPED_LIABILITIES_STALE',

  FETCH_DETAILED_POSITIONS_START: 'FETCH_DETAILED_POSITIONS_START',
  FETCH_DETAILED_POSITIONS_SUCCESS: 'FETCH_DETAILED_POSITIONS_SUCCESS',
  FETCH_DETAILED_POSITIONS_ERROR: 'FETCH_DETAILED_POSITIONS_ERROR',
  MARK_DETAILED_POSITIONS_STALE: 'MARK_DETAILED_POSITIONS_STALE',

  FETCH_SNAPSHOTS_START: 'FETCH_SNAPSHOTS_START',
  FETCH_SNAPSHOTS_SUCCESS: 'FETCH_SNAPSHOTS_SUCCESS',
  FETCH_SNAPSHOTS_ERROR: 'FETCH_SNAPSHOTS_ERROR',

  // Reconciliation actions
  FETCH_RECONCILIATION_HISTORY_START: 'FETCH_RECONCILIATION_HISTORY_START',
  FETCH_RECONCILIATION_HISTORY_SUCCESS: 'FETCH_RECONCILIATION_HISTORY_SUCCESS',
  FETCH_RECONCILIATION_HISTORY_ERROR: 'FETCH_RECONCILIATION_HISTORY_ERROR',
  SUBMIT_RECONCILIATION_START: 'SUBMIT_RECONCILIATION_START',
  SUBMIT_RECONCILIATION_SUCCESS: 'SUBMIT_RECONCILIATION_SUCCESS',
  SUBMIT_RECONCILIATION_ERROR: 'SUBMIT_RECONCILIATION_ERROR',
  UPDATE_RECONCILIATION_DATA: 'UPDATE_RECONCILIATION_DATA',
  CLEAR_RECONCILIATION_DATA: 'CLEAR_RECONCILIATION_DATA',

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
      
      // Helper function to parse JSON fields
      const parseJsonField = (field, defaultValue = []) => {
        if (typeof field === 'string') {
          try {
            return JSON.parse(field);
          } catch (e) {
            console.error(`Failed to parse field:`, e);
            return defaultValue;
          }
        }
        return field || defaultValue;
      };
      
      // Parse all JSON string fields
      const topPositionsData = parseJsonField(summary.top_liquid_positions);
      const accountDiversData = parseJsonField(summary.account_diversification);
      const topPerformersAmountData = parseJsonField(summary.top_performers_amount);
      const topPerformersPercentData = parseJsonField(summary.top_performers_percent);
      const assetPerformanceData = parseJsonField(summary.asset_performance_detail, {});
      const sectorAllocData = parseJsonField(summary.sector_allocation, {});
      const institutionAllocData = parseJsonField(summary.institution_allocation);
      const riskMetricsData = parseJsonField(summary.risk_metrics, {});
      const concentrationData = parseJsonField(summary.concentration_metrics, {});
      const dividendData = parseJsonField(summary.dividend_metrics, {});
      const taxEfficiencyData = parseJsonField(summary.tax_efficiency_metrics, {});
      const netCashBasisData = parseJsonField(summary.net_cash_basis_metrics, {});

      // Process history data to parse JSON fields in each history item
      const processedHistory = history.map(item => {
        return {
          ...item,
          // Parse JSON fields if they exist as strings
          net_cash_basis_metrics: parseJsonField(item.net_cash_basis_metrics, {}),
          risk_metrics: parseJsonField(item.risk_metrics, {}),
          concentration_metrics: parseJsonField(item.concentration_metrics, {}),
          dividend_metrics: parseJsonField(item.dividend_metrics, {}),
          tax_efficiency_metrics: parseJsonField(item.tax_efficiency_metrics, {}),
          institution_allocation: parseJsonField(item.institution_allocation, []),
          sector_allocation: parseJsonField(item.sector_allocation, {}),
          account_diversification: parseJsonField(item.account_diversification, []),
          top_liquid_positions: parseJsonField(item.top_liquid_positions, []),
          asset_performance_detail: parseJsonField(item.asset_performance_detail, {}),
        };
      });

      // Process asset performance data to multiply percentages by 100
      const processedAssetPerformance = {};
      Object.entries(assetPerformanceData).forEach(([assetType, data]) => {
        processedAssetPerformance[assetType] = { ...data };
        
        // Process time period data if it exists (like for securities)
        ['daily', 'weekly', 'monthly', 'ytd', 'quarterly', 'yearly', 'two_year', 'three_year'].forEach(period => {
          if (data[period] && data[period].percent_change !== null) {
            processedAssetPerformance[assetType][period] = {
              ...data[period],
              percent_change: data[period].percent_change * 100
            };
          }
        });
        
        // Process overall gain_loss_percent if it exists
        if (data.gain_loss_percent !== null && data.gain_loss_percent !== undefined) {
          processedAssetPerformance[assetType].gain_loss_percent = data.gain_loss_percent * 100;
        }
      });
      
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
          history: processedHistory,
          topLiquidPositions: cleanedTopPositions,
          topPerformersAmount: topPerformersAmountData,
          topPerformersPercent: topPerformersPercentData,
          accountDiversification: cleanedAccountDivers,
          assetPerformanceDetail: processedAssetPerformance,
          sectorAllocation: sectorAllocData,
          riskMetrics: riskMetricsData,
          institutionAllocation: institutionAllocData,
          concentrationMetrics: concentrationData,
          dividendMetrics: dividendData,
          taxEfficiencyMetrics: taxEfficiencyData,
          netCashBasisMetrics: netCashBasisData,
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

    // Accounts cases
    case ActionTypes.FETCH_ACCOUNTS_START:
      return {
        ...state,
        accounts: {
          ...state.accounts,
          loading: true,
          error: null
        }
      };

    case ActionTypes.FETCH_ACCOUNTS_SUCCESS:
      return {
        ...state,
        accounts: {
          ...state.accounts,
          data: action.payload.accounts || [],
          summary: action.payload.summary || null,
          loading: false,
          error: null,
          lastFetched: Date.now(),
          isStale: false
        }
      };

    case ActionTypes.FETCH_ACCOUNTS_ERROR:
      return {
        ...state,
        accounts: {
          ...state.accounts,
          loading: false,
          error: action.payload
        }
      };

    case ActionTypes.MARK_ACCOUNTS_STALE:
      return {
        ...state,
        accounts: {
          ...state.accounts,
          isStale: true
        }
      };

    case ActionTypes.RESET_STORE:
      return initialState;


    case ActionTypes.FETCH_GROUPED_POSITIONS_START:
      return {
        ...state,
        groupedPositions: {
          ...state.groupedPositions,
          loading: true,
          error: null,
        },
      };

    case ActionTypes.FETCH_GROUPED_POSITIONS_SUCCESS:
      return {
        ...state,
        groupedPositions: {
          data: action.payload.positions || [],
          summary: action.payload.summary || null,
          loading: false,
          error: null,
          lastFetched: Date.now(),
          isStale: false,
        },
      };

    case ActionTypes.FETCH_GROUPED_POSITIONS_ERROR:
      return {
        ...state,
        groupedPositions: {
          ...state.groupedPositions,
          loading: false,
          error: action.payload,
        },
      };

    case ActionTypes.MARK_GROUPED_POSITIONS_STALE:
      return {
        ...state,
        groupedPositions: {
          ...state.groupedPositions,
          isStale: true,
        },
      };

          case ActionTypes.MARK_GROUPED_POSITIONS_STALE:
      return {
        ...state,
        groupedPositions: {
          ...state.groupedPositions,
          isStale: true,
        },
      };


          // Detailed positions cases
    case ActionTypes.FETCH_DETAILED_POSITIONS_START:
      return {
        ...state,
        detailedPositions: {
          ...state.detailedPositions,
          loading: true,
          error: null
        }
      };

    case ActionTypes.FETCH_DETAILED_POSITIONS_SUCCESS:
      return {
        ...state,
        detailedPositions: {
          ...state.detailedPositions,
          data: action.payload.positions || [],
          loading: false,
          error: null,
          lastFetched: Date.now(),
          isStale: false
        }
      };

    case ActionTypes.FETCH_DETAILED_POSITIONS_ERROR:
      return {
        ...state,
        detailedPositions: {
          ...state.detailedPositions,
          loading: false,
          error: action.payload
        }
      };

    case ActionTypes.MARK_DETAILED_POSITIONS_STALE:
      return {
        ...state,
        detailedPositions: {
          ...state.detailedPositions,
          isStale: true
        }
      };


    // Position History cases
    case ActionTypes.FETCH_POSITION_HISTORY_START:
      return {
        ...state,
        positionHistory: {
          ...state.positionHistory,
          loading: {
            ...state.positionHistory.loading,
            [action.payload.identifier]: true,
          },
          error: {
            ...state.positionHistory.error,
            [action.payload.identifier]: null,
          },
        },
      };

    case ActionTypes.FETCH_POSITION_HISTORY_SUCCESS:
      return {
        ...state,
        positionHistory: {
          ...state.positionHistory,
          data: {
            ...state.positionHistory.data,
            [action.payload.identifier]: action.payload.history,
          },
          loading: {
            ...state.positionHistory.loading,
            [action.payload.identifier]: false,
          },
          error: {
            ...state.positionHistory.error,
            [action.payload.identifier]: null,
          },
          lastFetched: {
            ...state.positionHistory.lastFetched,
            [action.payload.identifier]: Date.now(),
          },
        },
      };

    case ActionTypes.FETCH_POSITION_HISTORY_ERROR:
      return {
        ...state,
        positionHistory: {
          ...state.positionHistory,
          loading: {
            ...state.positionHistory.loading,
            [action.payload.identifier]: false,
          },
          error: {
            ...state.positionHistory.error,
            [action.payload.identifier]: action.payload.error,
          },
        },
      };


      case ActionTypes.FETCH_GROUPED_LIABILITIES_START:
  return {
    ...state,
    groupedLiabilities: {
      ...state.groupedLiabilities,
      loading: true,
      error: null,
    },
  };

  case ActionTypes.FETCH_GROUPED_LIABILITIES_SUCCESS:
    return {
      ...state,
      groupedLiabilities: {
        data: action.payload.liabilities || [],
        summary: action.payload.summary || null,
        loading: false,
        error: null,
        lastFetched: Date.now(),
        isStale: false,
      },
    };

  case ActionTypes.FETCH_GROUPED_LIABILITIES_ERROR:
    return {
      ...state,
      groupedLiabilities: {
        ...state.groupedLiabilities,
        loading: false,
        error: action.payload,
      },
    };

  case ActionTypes.MARK_GROUPED_LIABILITIES_STALE:
    return {
      ...state,
      groupedLiabilities: {
        ...state.groupedLiabilities,
        isStale: true,
      },
    };


    case ActionTypes.FETCH_SNAPSHOTS_START:
      return {
        ...state,
        snapshots: { ...state.snapshots, loading: true, error: null }
      };
      
    case ActionTypes.FETCH_SNAPSHOTS_SUCCESS:
      return {
        ...state,
        snapshots: {
          ...state.snapshots,
          data: action.payload.data,
          byDate: action.payload.byDate,
          dates: action.payload.dates,
          assetTypes: action.payload.assetTypes,
          loading: false,
          error: null,
          lastFetched: Date.now(),
          isStale: false
        }
      };
      
    case ActionTypes.FETCH_SNAPSHOTS_ERROR:
      return {
        ...state,
        snapshots: {
          ...state.snapshots,
          loading: false,
          error: action.payload
        }
      };

    // Reconciliation cases
    case ActionTypes.FETCH_RECONCILIATION_HISTORY_START:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          loading: true,
          error: null
        }
      };

    case ActionTypes.FETCH_RECONCILIATION_HISTORY_SUCCESS:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          history: action.payload.history || [],
          lastReconciled: action.payload.lastReconciled || {},
          loading: false,
          error: null,
          lastFetched: Date.now()
        }
      };

    case ActionTypes.FETCH_RECONCILIATION_HISTORY_ERROR:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          loading: false,
          error: action.payload
        }
      };

    case ActionTypes.UPDATE_RECONCILIATION_DATA:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          pending: action.payload.pending || state.reconciliation.pending,
          variances: action.payload.variances || state.reconciliation.variances
        }
      };

    case ActionTypes.SUBMIT_RECONCILIATION_START:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          submitting: true,
          error: null
        }
      };

    case ActionTypes.SUBMIT_RECONCILIATION_SUCCESS:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          pending: {},
          variances: {},
          submitting: false,
          error: null
        }
      };

    case ActionTypes.SUBMIT_RECONCILIATION_ERROR:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          submitting: false,
          error: action.payload
        }
      };

    case ActionTypes.CLEAR_RECONCILIATION_DATA:
      return {
        ...state,
        reconciliation: {
          ...state.reconciliation,
          pending: {},
          variances: {}
        }
      };

    default:
      return state;
  }
};

// Context
const DataStoreContext = createContext(null);

// Provider
export const DataStoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dataStoreReducer, initialState);
  const hasInitialized = useRef(false);
  const phase2Timeout = useRef(null);
  const phase3Timeout = useRef(null);

  // Listen for logout events to clear the store
  useEffect(() => {
    const handleLogout = () => {
      console.log('[DataStore] Clearing store on logout');
      dispatch({ type: ActionTypes.RESET_STORE });
      hasInitialized.current = false; // Reset initialization flag
    };

    // Listen for the custom logout event
    window.addEventListener('auth-logout', handleLogout);

    // Also listen for storage events (in case logout happens in another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue === null) {
        console.log('[DataStore] Token removed, clearing store');
        handleLogout();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-logout', handleLogout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch portfolio data
  const fetchPortfolioData = useCallback(async (force = false) => {
    // Skip if already loading (prevent duplicate fetches)
    if (state.portfolioSummary.loading) {
      console.log('[DataStore] Skip portfolio fetch - already loading');
      return Promise.resolve(); // Return resolved promise instead of undefined
    }

    // Skip if data is fresh (< 1 minute) unless forced
    const fiveMinutesAgo = Date.now() - 300000;
    if (!force && 
        state.portfolioSummary.lastFetched && 
        state.portfolioSummary.lastFetched > fiveMinutesAgo && 
        !state.portfolioSummary.isStale) {
      console.log('[DataStore] Portfolio data is fresh, skipping fetch');
      return Promise.resolve();
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
  }, []); // Remove all dependencies to prevent recreation


  // Fetch accounts data
  const fetchAccountsData = useCallback(async (force = false) => {
    // Prevent duplicate fetches during initial load
    if (state.accounts.loading && !force) {
      console.log('[DataStore] Skipping accounts fetch - already loading');
      return Promise.resolve();
    }

    const oneMinuteAgo = Date.now() - 60000;
    if (!force && 
        state.accounts.lastFetched && 
        state.accounts.lastFetched > oneMinuteAgo && 
        !state.accounts.isStale) {
      return;
    }

    dispatch({ type: ActionTypes.FETCH_ACCOUNTS_START });

    try {
      const response = await fetchWithAuth('/datastore/accounts/summary?snapshot_date=latest');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts data');
      }
      
      const data = await response.json();
      
      dispatch({
        type: ActionTypes.FETCH_ACCOUNTS_SUCCESS,
        payload: data
      });
    } catch (error) {
      console.error('Error fetching accounts data:', error);
      dispatch({
        type: ActionTypes.FETCH_ACCOUNTS_ERROR,
        payload: error.message
      });
    }
  }, [state.accounts.loading, state.accounts.lastFetched, state.accounts.isStale]);

  const fetchSnapshotsData = useCallback(async (days = 90, force = false) => {
    if (state.snapshots.loading && !force) return;

    const oneMinuteAgo = Date.now() - 60000;
    if (!force && 
        state.snapshots.lastFetched && 
        state.snapshots.lastFetched > oneMinuteAgo && 
        !state.snapshots.isStale) {
      return;
    }

    dispatch({ type: ActionTypes.FETCH_SNAPSHOTS_START });

    try {
      // Fetch summary data and position details in parallel
      const [summaryResponse, positionsResponse] = await Promise.all([
        fetchWithAuth('/portfolio/net_worth_summary/datastore?include_history=true'),
        fetchWithAuth(`/datastore/positions/detail?days=${days}`)
      ]);

      if (!summaryResponse.ok || !positionsResponse.ok) {
        throw new Error('Failed to fetch snapshot data');
      }

      const summaryData = await summaryResponse.json();
      const positionsData = await positionsResponse.json();

      // Group positions by date
      const positionsByDate = {};
      const assetTypes = new Set();
      
      positionsData.positions.forEach(pos => {
        const date = pos.snapshot_date;
        if (!positionsByDate[date]) {
          positionsByDate[date] = {};
        }
        
        // Track asset types
        assetTypes.add(pos.item_type);
        
        // Key by unified_id
        const key = pos.unified_id || `${pos.item_type}|${pos.identifier}|${pos.inv_account_id}`;
        positionsByDate[date][key] = pos;
      });

      // Build snapshots combining summary and position data
      const snapshots_by_date = {};
      const dates = [];
      
      summaryData.history.forEach(dayData => {
        const date = dayData.date;
        dates.push(date);
        
        snapshots_by_date[date] = {
          snapshot_date: date,
          total_value: dayData.total_assets || dayData.net_worth,
          total_cost_basis: dayData.net_cash_basis_metrics?.total_cost_basis || 0,
          total_gain_loss: dayData.unrealized_gain || 0,
          position_count: Object.keys(positionsByDate[date] || {}).length,
          positions: positionsByDate[date] || {}
        };
      });

      // Also include latest summary data
      const latestDate = summaryData.summary.snapshot_date;
      if (!snapshots_by_date[latestDate] && positionsByDate[latestDate]) {
        snapshots_by_date[latestDate] = {
          snapshot_date: latestDate,
          total_value: summaryData.summary.total_assets,
          total_cost_basis: summaryData.summary.net_cash_basis_metrics?.total_cost_basis || 0,
          total_gain_loss: summaryData.summary.total_unrealized_gain || 0,
          position_count: Object.keys(positionsByDate[latestDate] || {}).length,
          positions: positionsByDate[latestDate] || {}
        };
        dates.push(latestDate);
      }

      dispatch({
        type: ActionTypes.FETCH_SNAPSHOTS_SUCCESS,
        payload: {
          data: Object.values(snapshots_by_date),
          byDate: snapshots_by_date,
          dates: dates.sort(),
          assetTypes: Array.from(assetTypes)
        }
      });
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      dispatch({
        type: ActionTypes.FETCH_SNAPSHOTS_ERROR,
        payload: error.message
      });
    }
  }, [state.snapshots.loading, state.snapshots.lastFetched, state.snapshots.isStale]);

  // Fetch detailed positions (individual, not grouped)
  const fetchDetailedPositionsData = useCallback(async (force = false) => {
    // Skip if already loading or recently fetched (unless forced)
    if (!force && (state.detailedPositions.loading || 
        (state.detailedPositions.lastFetched && 
        Date.now() - state.detailedPositions.lastFetched < 60000))) {
      return;
    }

    dispatch({ type: ActionTypes.FETCH_DETAILED_POSITIONS_START });

    try {
      const response = await fetchWithAuth('/datastore/positions/detail?snapshot_date=latest');
      
      if (response.ok) {
        const data = await response.json();
        dispatch({ 
          type: ActionTypes.FETCH_DETAILED_POSITIONS_SUCCESS, 
          payload: data 
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching detailed positions:', error);
      dispatch({ 
        type: ActionTypes.FETCH_DETAILED_POSITIONS_ERROR, 
        payload: error.message 
      });
    }
  }, [state.detailedPositions.loading, state.detailedPositions.lastFetched]);


  const fetchGroupedPositionsData = useCallback(async (force = false) => {
    if (state.groupedPositions.loading && !force) return;

    const oneMinuteAgo = Date.now() - 60000;
    if (!force && 
        state.groupedPositions.lastFetched && 
        state.groupedPositions.lastFetched > oneMinuteAgo && 
        !state.groupedPositions.isStale) {
      return;
    }

    dispatch({ type: ActionTypes.FETCH_GROUPED_POSITIONS_START });

    try {
      const response = await fetchWithAuth('/datastore/positions/grouped?snapshot_date=latest');
      if (!response.ok) {
        throw new Error(`Failed to fetch grouped positions: ${response.status}`);
      }
      
      const data = await response.json();
      
      dispatch({
        type: ActionTypes.FETCH_GROUPED_POSITIONS_SUCCESS,
        payload: data
      });
    } catch (error) {
      console.error('Error fetching grouped positions:', error);
      dispatch({
        type: ActionTypes.FETCH_GROUPED_POSITIONS_ERROR,
        payload: error.message,
      });
    }
  }, [state.groupedPositions.loading, state.groupedPositions.lastFetched, state.groupedPositions.isStale]);

    // Fetch position history for a specific identifier
  const fetchPositionHistory = useCallback(async (identifier, days = 90, force = false) => {
    if (!identifier) return;

    // Check if already loading
    if (state.positionHistory.loading[identifier] && !force) return;

    // Check if data is fresh (< 5 minutes for history)
    const fiveMinutesAgo = Date.now() - 300000;
    if (!force && 
        state.positionHistory.lastFetched[identifier] && 
        state.positionHistory.lastFetched[identifier] > fiveMinutesAgo) {
      return;
    }

    dispatch({ 
      type: ActionTypes.FETCH_POSITION_HISTORY_START,
      payload: { identifier }
    });

    try {
      const response = await fetchWithAuth(
        `/datastore/positions/history/${encodeURIComponent(identifier)}?days=${days}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch position history: ${response.status}`);
      }
      
      const data = await response.json();
      
      dispatch({
        type: ActionTypes.FETCH_POSITION_HISTORY_SUCCESS,
        payload: {
          identifier,
          history: data.history || [],
        }
      });
    } catch (error) {
      console.error('Error fetching position history:', error);
      dispatch({
        type: ActionTypes.FETCH_POSITION_HISTORY_ERROR,
        payload: {
          identifier,
          error: error.message,
        }
      });
    }
  }, [state.positionHistory.loading, state.positionHistory.lastFetched]);

  // liabilities fetch
  const fetchGroupedLiabilitiesData = useCallback(async (force = false) => {
    if (state.groupedLiabilities.loading && !force) return;

    const oneMinuteAgo = Date.now() - 60000;
    if (!force && 
        state.groupedLiabilities.lastFetched && 
        state.groupedLiabilities.lastFetched > oneMinuteAgo && 
        !state.groupedLiabilities.isStale) {
      return;
    }

    dispatch({ type: ActionTypes.FETCH_GROUPED_LIABILITIES_START });

    try {
      const response = await fetchWithAuth('/datastore/liabilities/grouped?snapshot_date=latest');
      if (!response.ok) {
        throw new Error(`Failed to fetch grouped liabilities: ${response.status}`);
      }
      
      const data = await response.json();
      
      dispatch({
        type: ActionTypes.FETCH_GROUPED_LIABILITIES_SUCCESS,
        payload: data
      });
    } catch (error) {
      console.error('Error fetching grouped liabilities:', error);
      dispatch({
        type: ActionTypes.FETCH_GROUPED_LIABILITIES_ERROR,
        payload: error.message,
      });
    }
  }, [state.groupedLiabilities.loading, state.groupedLiabilities.lastFetched, state.groupedLiabilities.isStale]);



  // Refresh all data sources
  const refreshData = useCallback(async (force = true) => {
    await Promise.all([
      fetchPortfolioData(force),
      fetchAccountsData(force),
      fetchGroupedPositionsData(force),
    ]);
  }, [fetchPortfolioData, fetchAccountsData, fetchGroupedPositionsData]);

  // Auto-refresh stale grouped positions
  useEffect(() => {
    if (state.groupedPositions.isStale && !state.groupedPositions.loading) {
      fetchGroupedPositionsData();
    }
  }, [state.groupedPositions.isStale, state.groupedPositions.loading, fetchGroupedPositionsData]);

  // Mark data as stale
  const markDataStale = useCallback(() => {
    dispatch({ type: ActionTypes.MARK_DATA_STALE })
    dispatch({ type: ActionTypes.MARK_ACCOUNTS_STALE });
    dispatch({ type: ActionTypes.MARK_GROUPED_POSITIONS_STALE });
  }, []);

  // Mark accounts as stale
  const markAccountsStale = useCallback(() => {
    dispatch({ type: ActionTypes.MARK_ACCOUNTS_STALE });
  }, []);

  // Initial load - only fetch if we have no data
// Progressive loading strategy - fetch data in phases
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    // Phase 1: Critical data (immediate - needed for portfolio page and navbar)
    const phase1 = setTimeout(() => {
      console.log('[DataStore] Phase 1: Loading critical data...');
      
      if (!state.portfolioSummary.data && !state.portfolioSummary.loading) {
        fetchPortfolioData();
      }
      if (!state.groupedPositions.data && !state.groupedPositions.loading) {
        console.log('[DataStore] Phase 1: Fetching grouped positions for navbar ticker');
        fetchGroupedPositionsData();  // THIS IS CRITICAL FOR THE TICKER
      }
    }, 100);
    
    // Phase 2: Likely needed soon (1 second delay)
    phase2Timeout.current = setTimeout(() => {
      console.log('[DataStore] Phase 2: Pre-fetching likely needed data...');
      
      // Quick modals might need these
      if (!state.accounts.data && !state.accounts.loading) {
        fetchAccountsData();
      }
      if (!state.groupedLiabilities.data && !state.groupedLiabilities.loading) {
        fetchGroupedLiabilitiesData();
      }
    }, 1000);
    
    // Phase 3: Nice to have (3 seconds delay)
    phase3Timeout.current = setTimeout(() => {
      console.log('[DataStore] Phase 3: Pre-fetching modal data...');
      
      // Pre-fetch for QuickEdit modal
      if (!state.detailedPositions.data && !state.detailedPositions.loading) {
        fetchDetailedPositionsData();
      }
      // Could add snapshots here if needed
      // if (!state.snapshots.data && !state.snapshots.loading) {
      //   fetchSnapshotsData();
      // }
    }, 3000);
    
    // Cleanup
    return () => {
      clearTimeout(phase1);
      if (phase2Timeout.current) clearTimeout(phase2Timeout.current);
      if (phase3Timeout.current) clearTimeout(phase3Timeout.current);
    };
  }, []); // Run once

  // Auto-refresh stale data
  useEffect(() => {
    if (state.portfolioSummary.isStale && !state.portfolioSummary.loading) {
      console.log('[DataStore] Refreshing stale portfolio data');
      fetchPortfolioData();
    }
  }, [state.portfolioSummary.isStale, state.portfolioSummary.loading]); // Remove fetchPortfolioData from deps

// Auto-refresh stale accounts
  useEffect(() => {
    if (state.accounts.isStale && !state.accounts.loading) {
      fetchAccountsData();
    }
  }, [state.accounts.isStale, state.accounts.loading]); // Removed fetchAccountsData from deps

  const value = {
    state,
    actions: {
      fetchPortfolioData,
      fetchAccountsData,
      fetchGroupedPositionsData, 
      fetchPositionHistory,
      markDataStale,
      markAccountsStale,
      refreshData,  
      fetchGroupedLiabilitiesData,
      fetchDetailedPositionsData,
      fetchSnapshotsData,
      refreshAccounts: () => fetchAccountsData(true),
      refreshGroupedPositions: () => fetchGroupedPositionsData(true),
      refreshGroupedLiabilities: () => fetchGroupedLiabilitiesData(true),
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