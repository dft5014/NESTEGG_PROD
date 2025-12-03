// ValidateModal2 - Centralized State Management
// Modern, scalable architecture for account reconciliation

// ============================================================================
// ACTION TYPES
// ============================================================================

export const ActionTypes = {
  // Navigation
  SET_VIEW: 'SET_VIEW',
  GO_BACK: 'GO_BACK',
  SET_ACTIVE_INSTITUTION: 'SET_ACTIVE_INSTITUTION',
  SET_ACTIVE_ACCOUNT: 'SET_ACTIVE_ACCOUNT',

  // Data Loading
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  SET_POSITIONS: 'SET_POSITIONS',
  SET_LOADING: 'SET_LOADING',

  // Statement Entry
  SET_STATEMENT_BALANCE: 'SET_STATEMENT_BALANCE',
  SET_BULK_STATEMENT_BALANCES: 'SET_BULK_STATEMENT_BALANCES',
  CLEAR_STATEMENT_BALANCES: 'CLEAR_STATEMENT_BALANCES',

  // Position Validation
  SET_POSITION_STATEMENT: 'SET_POSITION_STATEMENT',
  SET_BULK_POSITION_STATEMENTS: 'SET_BULK_POSITION_STATEMENTS',
  CLEAR_POSITION_STATEMENTS: 'CLEAR_POSITION_STATEMENTS',

  // Reconciliation Status
  MARK_RECONCILED: 'MARK_RECONCILED',
  UNMARK_RECONCILED: 'UNMARK_RECONCILED',
  TOGGLE_RECONCILED: 'TOGGLE_RECONCILED',
  BULK_MARK_RECONCILED: 'BULK_MARK_RECONCILED',

  // UI State
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_FILTER: 'SET_FILTER',
  TOGGLE_EXPAND_INSTITUTION: 'TOGGLE_EXPAND_INSTITUTION',
  EXPAND_ALL_INSTITUTIONS: 'EXPAND_ALL_INSTITUTIONS',
  COLLAPSE_ALL_INSTITUTIONS: 'COLLAPSE_ALL_INSTITUTIONS',
  SET_HIDE_VALUES: 'SET_HIDE_VALUES',
  SET_SORT: 'SET_SORT',

  // Import Integration
  SET_IMPORT_MODAL_OPEN: 'SET_IMPORT_MODAL_OPEN',
  SET_IMPORT_ACCOUNT: 'SET_IMPORT_ACCOUNT',
  APPLY_IMPORT_RESULTS: 'APPLY_IMPORT_RESULTS',

  // Session
  SET_VALIDATION_DATE: 'SET_VALIDATION_DATE',
  SET_NOTES: 'SET_NOTES',
  SET_SESSION_ID: 'SET_SESSION_ID',

  // Persistence
  RESTORE_SESSION: 'RESTORE_SESSION',
  MARK_DIRTY: 'MARK_DIRTY',
  MARK_CLEAN: 'MARK_CLEAN',

  // Reset
  RESET_ALL: 'RESET_ALL'
};

// ============================================================================
// VIEW CONSTANTS
// ============================================================================

export const VIEWS = {
  overview: 'overview',           // Institution cards overview
  institution: 'institution',     // Single institution detail
  account: 'account',            // Single account with positions
  analysis: 'analysis',          // Analysis and insights
  import: 'import',              // Import statement integration
  summary: 'summary'             // Final summary/completion
};

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialState = {
  // Navigation
  currentView: VIEWS.overview,
  viewHistory: [],
  activeInstitution: null,
  activeAccount: null,

  // Data
  accounts: [],
  positions: [],
  isLoading: false,
  lastRefresh: null,

  // Statement Entry (account_id -> statement balance)
  statementBalances: {},

  // Position-level validation (position_id -> { quantity, value })
  positionStatements: {},

  // Reconciliation tracking (account_id -> { reconciled: bool, timestamp, notes })
  reconciliationStatus: {},

  // UI State
  searchQuery: '',
  filter: 'all', // 'all', 'pending', 'matched', 'discrepancy', 'reconciled'
  expandedInstitutions: new Set(),
  hideValues: false,
  sort: { field: 'value', direction: 'desc' },

  // Import integration
  importModalOpen: false,
  importAccount: null,

  // Session
  validationDate: new Date().toISOString().split('T')[0],
  sessionNotes: '',
  sessionId: null,

  // Persistence
  isDirty: false
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateSessionId() {
  return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// REDUCER
// ============================================================================

export function validateReducer(state, action) {
  switch (action.type) {
    // ====== Navigation ======
    case ActionTypes.SET_VIEW:
      return {
        ...state,
        currentView: action.payload,
        viewHistory: [...state.viewHistory, state.currentView]
      };

    case ActionTypes.GO_BACK: {
      if (state.viewHistory.length === 0) {
        return { ...state, currentView: VIEWS.overview };
      }
      const newHistory = [...state.viewHistory];
      const previousView = newHistory.pop();
      return {
        ...state,
        currentView: previousView,
        viewHistory: newHistory
      };
    }

    case ActionTypes.SET_ACTIVE_INSTITUTION:
      return {
        ...state,
        activeInstitution: action.payload,
        activeAccount: null
      };

    case ActionTypes.SET_ACTIVE_ACCOUNT:
      return {
        ...state,
        activeAccount: action.payload
      };

    // ====== Data Loading ======
    case ActionTypes.SET_ACCOUNTS:
      return {
        ...state,
        accounts: action.payload || [],
        lastRefresh: new Date().toISOString()
      };

    case ActionTypes.SET_POSITIONS:
      return {
        ...state,
        positions: action.payload || []
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    // ====== Statement Entry ======
    case ActionTypes.SET_STATEMENT_BALANCE: {
      const { accountId, balance } = action.payload;
      return {
        ...state,
        statementBalances: {
          ...state.statementBalances,
          [accountId]: balance
        },
        isDirty: true
      };
    }

    case ActionTypes.SET_BULK_STATEMENT_BALANCES:
      return {
        ...state,
        statementBalances: {
          ...state.statementBalances,
          ...action.payload
        },
        isDirty: true
      };

    case ActionTypes.CLEAR_STATEMENT_BALANCES:
      return {
        ...state,
        statementBalances: {},
        isDirty: true
      };

    // ====== Position Validation ======
    case ActionTypes.SET_POSITION_STATEMENT: {
      const { positionId, data } = action.payload;
      return {
        ...state,
        positionStatements: {
          ...state.positionStatements,
          [positionId]: data
        },
        isDirty: true
      };
    }

    case ActionTypes.SET_BULK_POSITION_STATEMENTS:
      return {
        ...state,
        positionStatements: {
          ...state.positionStatements,
          ...action.payload
        },
        isDirty: true
      };

    case ActionTypes.CLEAR_POSITION_STATEMENTS:
      return {
        ...state,
        positionStatements: {},
        isDirty: true
      };

    // ====== Reconciliation Status ======
    case ActionTypes.MARK_RECONCILED: {
      const { accountId, notes } = action.payload;
      return {
        ...state,
        reconciliationStatus: {
          ...state.reconciliationStatus,
          [accountId]: {
            reconciled: true,
            timestamp: new Date().toISOString(),
            notes: notes || ''
          }
        },
        isDirty: true
      };
    }

    case ActionTypes.UNMARK_RECONCILED: {
      const newStatus = { ...state.reconciliationStatus };
      delete newStatus[action.payload];
      return {
        ...state,
        reconciliationStatus: newStatus,
        isDirty: true
      };
    }

    case ActionTypes.TOGGLE_RECONCILED: {
      const accountId = action.payload;
      const isReconciled = state.reconciliationStatus[accountId]?.reconciled;
      if (isReconciled) {
        const newStatus = { ...state.reconciliationStatus };
        delete newStatus[accountId];
        return { ...state, reconciliationStatus: newStatus, isDirty: true };
      }
      return {
        ...state,
        reconciliationStatus: {
          ...state.reconciliationStatus,
          [accountId]: {
            reconciled: true,
            timestamp: new Date().toISOString(),
            notes: ''
          }
        },
        isDirty: true
      };
    }

    case ActionTypes.BULK_MARK_RECONCILED: {
      const accountIds = action.payload;
      const newStatus = { ...state.reconciliationStatus };
      accountIds.forEach(id => {
        newStatus[id] = {
          reconciled: true,
          timestamp: new Date().toISOString(),
          notes: ''
        };
      });
      return {
        ...state,
        reconciliationStatus: newStatus,
        isDirty: true
      };
    }

    // ====== UI State ======
    case ActionTypes.SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload
      };

    case ActionTypes.SET_FILTER:
      return {
        ...state,
        filter: action.payload
      };

    case ActionTypes.TOGGLE_EXPAND_INSTITUTION: {
      const institution = action.payload;
      const expanded = new Set(state.expandedInstitutions);
      if (expanded.has(institution)) {
        expanded.delete(institution);
      } else {
        expanded.add(institution);
      }
      return {
        ...state,
        expandedInstitutions: expanded
      };
    }

    case ActionTypes.EXPAND_ALL_INSTITUTIONS: {
      const allInstitutions = new Set(
        state.accounts.map(acc => acc.institution || 'Other')
      );
      return {
        ...state,
        expandedInstitutions: allInstitutions
      };
    }

    case ActionTypes.COLLAPSE_ALL_INSTITUTIONS:
      return {
        ...state,
        expandedInstitutions: new Set()
      };

    case ActionTypes.SET_HIDE_VALUES:
      return {
        ...state,
        hideValues: action.payload
      };

    case ActionTypes.SET_SORT:
      return {
        ...state,
        sort: action.payload
      };

    // ====== Import Integration ======
    case ActionTypes.SET_IMPORT_MODAL_OPEN:
      return {
        ...state,
        importModalOpen: action.payload
      };

    case ActionTypes.SET_IMPORT_ACCOUNT:
      return {
        ...state,
        importAccount: action.payload
      };

    case ActionTypes.APPLY_IMPORT_RESULTS: {
      const { accountId, statementBalance, positionUpdates } = action.payload;
      return {
        ...state,
        statementBalances: {
          ...state.statementBalances,
          [accountId]: statementBalance
        },
        positionStatements: {
          ...state.positionStatements,
          ...positionUpdates
        },
        isDirty: true
      };
    }

    // ====== Session ======
    case ActionTypes.SET_VALIDATION_DATE:
      return {
        ...state,
        validationDate: action.payload,
        isDirty: true
      };

    case ActionTypes.SET_NOTES:
      return {
        ...state,
        sessionNotes: action.payload,
        isDirty: true
      };

    case ActionTypes.SET_SESSION_ID:
      return {
        ...state,
        sessionId: action.payload || generateSessionId()
      };

    // ====== Persistence ======
    case ActionTypes.RESTORE_SESSION:
      return {
        ...state,
        ...action.payload,
        expandedInstitutions: new Set(action.payload.expandedInstitutions || []),
        isDirty: false
      };

    case ActionTypes.MARK_DIRTY:
      return {
        ...state,
        isDirty: true
      };

    case ActionTypes.MARK_CLEAN:
      return {
        ...state,
        isDirty: false
      };

    // ====== Reset ======
    case ActionTypes.RESET_ALL:
      return {
        ...initialState,
        sessionId: generateSessionId()
      };

    default:
      return state;
  }
}

// ============================================================================
// ACTION CREATORS
// ============================================================================

export const actions = {
  // Navigation
  setView: (view) => ({ type: ActionTypes.SET_VIEW, payload: view }),
  goBack: () => ({ type: ActionTypes.GO_BACK }),
  setActiveInstitution: (inst) => ({ type: ActionTypes.SET_ACTIVE_INSTITUTION, payload: inst }),
  setActiveAccount: (acc) => ({ type: ActionTypes.SET_ACTIVE_ACCOUNT, payload: acc }),

  // Data
  setAccounts: (accounts) => ({ type: ActionTypes.SET_ACCOUNTS, payload: accounts }),
  setPositions: (positions) => ({ type: ActionTypes.SET_POSITIONS, payload: positions }),
  setLoading: (loading) => ({ type: ActionTypes.SET_LOADING, payload: loading }),

  // Statement Entry
  setStatementBalance: (accountId, balance) => ({
    type: ActionTypes.SET_STATEMENT_BALANCE,
    payload: { accountId, balance }
  }),
  setBulkStatementBalances: (balances) => ({
    type: ActionTypes.SET_BULK_STATEMENT_BALANCES,
    payload: balances
  }),
  clearStatementBalances: () => ({ type: ActionTypes.CLEAR_STATEMENT_BALANCES }),

  // Position Validation
  setPositionStatement: (positionId, data) => ({
    type: ActionTypes.SET_POSITION_STATEMENT,
    payload: { positionId, data }
  }),
  setBulkPositionStatements: (statements) => ({
    type: ActionTypes.SET_BULK_POSITION_STATEMENTS,
    payload: statements
  }),
  clearPositionStatements: () => ({ type: ActionTypes.CLEAR_POSITION_STATEMENTS }),

  // Reconciliation
  markReconciled: (accountId, notes) => ({
    type: ActionTypes.MARK_RECONCILED,
    payload: { accountId, notes }
  }),
  unmarkReconciled: (accountId) => ({
    type: ActionTypes.UNMARK_RECONCILED,
    payload: accountId
  }),
  toggleReconciled: (accountId) => ({
    type: ActionTypes.TOGGLE_RECONCILED,
    payload: accountId
  }),
  bulkMarkReconciled: (accountIds) => ({
    type: ActionTypes.BULK_MARK_RECONCILED,
    payload: accountIds
  }),

  // UI
  setSearchQuery: (query) => ({ type: ActionTypes.SET_SEARCH_QUERY, payload: query }),
  setFilter: (filter) => ({ type: ActionTypes.SET_FILTER, payload: filter }),
  toggleExpandInstitution: (inst) => ({ type: ActionTypes.TOGGLE_EXPAND_INSTITUTION, payload: inst }),
  expandAllInstitutions: () => ({ type: ActionTypes.EXPAND_ALL_INSTITUTIONS }),
  collapseAllInstitutions: () => ({ type: ActionTypes.COLLAPSE_ALL_INSTITUTIONS }),
  setHideValues: (hide) => ({ type: ActionTypes.SET_HIDE_VALUES, payload: hide }),
  setSort: (sort) => ({ type: ActionTypes.SET_SORT, payload: sort }),

  // Import
  setImportModalOpen: (open) => ({ type: ActionTypes.SET_IMPORT_MODAL_OPEN, payload: open }),
  setImportAccount: (account) => ({ type: ActionTypes.SET_IMPORT_ACCOUNT, payload: account }),
  applyImportResults: (results) => ({ type: ActionTypes.APPLY_IMPORT_RESULTS, payload: results }),

  // Session
  setValidationDate: (date) => ({ type: ActionTypes.SET_VALIDATION_DATE, payload: date }),
  setNotes: (notes) => ({ type: ActionTypes.SET_NOTES, payload: notes }),
  setSessionId: (id) => ({ type: ActionTypes.SET_SESSION_ID, payload: id }),

  // Persistence
  restoreSession: (data) => ({ type: ActionTypes.RESTORE_SESSION, payload: data }),
  markDirty: () => ({ type: ActionTypes.MARK_DIRTY }),
  markClean: () => ({ type: ActionTypes.MARK_CLEAN }),

  // Reset
  resetAll: () => ({ type: ActionTypes.RESET_ALL })
};
