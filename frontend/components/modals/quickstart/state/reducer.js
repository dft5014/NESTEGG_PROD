// QuickStart Modal - Unified State Management
import { VIEWS, ASSET_TYPES, generateId } from '../utils/constants';

// ============================================================================
// ACTION TYPES
// ============================================================================

export const ActionTypes = {
  // Navigation
  SET_VIEW: 'SET_VIEW',
  SET_IMPORT_METHOD: 'SET_IMPORT_METHOD',
  GO_BACK: 'GO_BACK',

  // Accounts
  SET_EXISTING_ACCOUNTS: 'SET_EXISTING_ACCOUNTS',
  TRACK_RECENT_ACCOUNT: 'TRACK_RECENT_ACCOUNT',
  ADD_ACCOUNT: 'ADD_ACCOUNT',
  UPDATE_ACCOUNT: 'UPDATE_ACCOUNT',
  DELETE_ACCOUNT: 'DELETE_ACCOUNT',
  DUPLICATE_ACCOUNT: 'DUPLICATE_ACCOUNT',
  SET_ACCOUNTS: 'SET_ACCOUNTS',
  CLEAR_ACCOUNTS: 'CLEAR_ACCOUNTS',

  // Positions
  ADD_POSITION: 'ADD_POSITION',
  UPDATE_POSITION: 'UPDATE_POSITION',
  DELETE_POSITION: 'DELETE_POSITION',
  DUPLICATE_POSITION: 'DUPLICATE_POSITION',
  SET_POSITIONS: 'SET_POSITIONS',
  CLEAR_POSITIONS: 'CLEAR_POSITIONS',
  UPDATE_POSITION_STATUS: 'UPDATE_POSITION_STATUS',
  TOGGLE_POSITION_SECTION: 'TOGGLE_POSITION_SECTION',
  BULK_IMPORT_POSITIONS: 'BULK_IMPORT_POSITIONS',

  // Liabilities
  ADD_LIABILITY: 'ADD_LIABILITY',
  UPDATE_LIABILITY: 'UPDATE_LIABILITY',
  DELETE_LIABILITY: 'DELETE_LIABILITY',
  DUPLICATE_LIABILITY: 'DUPLICATE_LIABILITY',
  SET_LIABILITIES: 'SET_LIABILITIES',
  CLEAR_LIABILITIES: 'CLEAR_LIABILITIES',
  UPDATE_LIABILITY_STATUS: 'UPDATE_LIABILITY_STATUS',

  // Selection
  TOGGLE_SELECT: 'TOGGLE_SELECT',
  SELECT_ALL: 'SELECT_ALL',
  DESELECT_ALL: 'DESELECT_ALL',
  DELETE_SELECTED: 'DELETE_SELECTED',

  // Search
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  CLEAR_SEARCH_RESULTS: 'CLEAR_SEARCH_RESULTS',
  SET_SEARCHING: 'SET_SEARCHING',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',

  // UI State
  SET_LOADING: 'SET_LOADING',
  SET_SUBMITTING: 'SET_SUBMITTING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  TOGGLE_HELP: 'TOGGLE_HELP',
  TOGGLE_KEYBOARD_SHORTCUTS: 'TOGGLE_KEYBOARD_SHORTCUTS',
  SET_ACTIVE_DROPDOWN: 'SET_ACTIVE_DROPDOWN',

  // Success State
  SET_SUCCESS_DATA: 'SET_SUCCESS_DATA',
  CLEAR_SUCCESS_DATA: 'CLEAR_SUCCESS_DATA',

  // Import
  SET_IMPORT_FILE: 'SET_IMPORT_FILE',
  SET_IMPORT_PROGRESS: 'SET_IMPORT_PROGRESS',
  SET_IMPORT_DATA: 'SET_IMPORT_DATA',
  SET_IMPORT_TARGET: 'SET_IMPORT_TARGET',
  CLEAR_IMPORT: 'CLEAR_IMPORT',

  // Persistence
  RESTORE_DRAFT: 'RESTORE_DRAFT',
  MARK_CLEAN: 'MARK_CLEAN',

  // Reset
  RESET_ALL: 'RESET_ALL'
};

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialState = {
  // Navigation
  currentView: VIEWS.welcome,
  viewHistory: [],
  importMethod: null,

  // Existing data from API
  existingAccounts: [],
  existingAccountsLoading: false,
  recentAccountIds: [], // Track recently used accounts for dropdown

  // Account entry
  accounts: [],

  // Position entry - organized by asset type
  positions: {
    security: [],
    cash: [],
    crypto: [],
    metal: [],
    other: []
  },
  positionSections: {
    security: true,
    cash: false,
    crypto: false,
    metal: false,
    other: false
  },

  // Liability entry
  liabilities: [],

  // Selection
  selectedIds: new Set(),

  // Search state
  searchResults: {},
  isSearching: {},
  searchTerm: '',

  // UI state
  isLoading: false,
  isSubmitting: false,
  error: null,
  showHelp: false,
  showKeyboardShortcuts: false,
  activeDropdown: null,

  // Success state
  successData: null,

  // Import state
  importFile: null,
  importProgress: 0,
  importData: null,
  importTarget: null, // 'accounts' or 'positions' - set when navigating from those views

  // Persistence
  isDirty: false
};

// ============================================================================
// REDUCER
// ============================================================================

export function quickStartReducer(state, action) {
  switch (action.type) {
    // ====== Navigation ======
    case ActionTypes.SET_VIEW:
      return {
        ...state,
        currentView: action.payload,
        viewHistory: [...state.viewHistory, state.currentView]
      };

    case ActionTypes.SET_IMPORT_METHOD:
      return {
        ...state,
        importMethod: action.payload
      };

    case ActionTypes.GO_BACK:
      if (state.viewHistory.length === 0) return state;
      const newHistory = [...state.viewHistory];
      const previousView = newHistory.pop();
      return {
        ...state,
        currentView: previousView,
        viewHistory: newHistory
      };

    // ====== Existing Accounts ======
    case ActionTypes.SET_EXISTING_ACCOUNTS: {
      const accounts = action.payload || [];
      // Initialize recent accounts with the first 3-5 accounts
      const recentIds = state.recentAccountIds.length > 0
        ? state.recentAccountIds
        : accounts.slice(0, 5).map(a => a.id);
      return {
        ...state,
        existingAccounts: accounts,
        existingAccountsLoading: false,
        recentAccountIds: recentIds
      };
    }

    case ActionTypes.TRACK_RECENT_ACCOUNT: {
      const accountId = action.payload;
      if (!accountId) return state;
      // Move this account to the front of recents, keep max 5
      const filtered = state.recentAccountIds.filter(id => id !== accountId);
      const newRecents = [accountId, ...filtered].slice(0, 5);
      return {
        ...state,
        recentAccountIds: newRecents
      };
    }

    // ====== Account Entry ======
    case ActionTypes.ADD_ACCOUNT:
      return {
        ...state,
        accounts: [...state.accounts, {
          id: generateId(),
          accountName: '',
          institution: '',
          accountCategory: '',
          accountType: '',
          status: 'draft',
          isNew: true,
          ...action.payload
        }],
        isDirty: true
      };

    case ActionTypes.UPDATE_ACCOUNT:
      return {
        ...state,
        accounts: state.accounts.map(acc =>
          acc.id === action.payload.id
            ? {
                ...acc,
                ...action.payload.data,
                isNew: false,
                status: getAccountStatus({ ...acc, ...action.payload.data })
              }
            : acc
        ),
        isDirty: true
      };

    case ActionTypes.DELETE_ACCOUNT:
      return {
        ...state,
        accounts: state.accounts.filter(acc => acc.id !== action.payload),
        selectedIds: new Set([...state.selectedIds].filter(id => id !== action.payload)),
        isDirty: true
      };

    case ActionTypes.DUPLICATE_ACCOUNT: {
      const accountToDupe = state.accounts.find(acc => acc.id === action.payload);
      if (!accountToDupe) return state;
      const dupeIndex = state.accounts.findIndex(acc => acc.id === action.payload);
      const duplicated = {
        ...accountToDupe,
        id: generateId(),
        accountName: `${accountToDupe.accountName} (Copy)`,
        status: 'draft',
        isNew: true
      };
      return {
        ...state,
        accounts: [
          ...state.accounts.slice(0, dupeIndex + 1),
          duplicated,
          ...state.accounts.slice(dupeIndex + 1)
        ],
        isDirty: true
      };
    }

    case ActionTypes.SET_ACCOUNTS:
      return {
        ...state,
        accounts: action.payload,
        isDirty: true
      };

    case ActionTypes.CLEAR_ACCOUNTS:
      return {
        ...state,
        accounts: [],
        isDirty: true
      };

    // ====== Position Entry ======
    case ActionTypes.ADD_POSITION: {
      const { assetType, data = {} } = action.payload;
      const newPosition = {
        id: generateId(),
        data: {
          purchase_date: new Date().toISOString().split('T')[0],
          ...data
        },
        status: 'draft',
        isNew: true,
        errors: {}
      };
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: [...state.positions[assetType], newPosition]
        },
        positionSections: {
          ...state.positionSections,
          [assetType]: true
        },
        isDirty: true
      };
    }

    case ActionTypes.UPDATE_POSITION: {
      const { assetType, id, data, errors } = action.payload;
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: state.positions[assetType].map(pos =>
            pos.id === id
              ? {
                  ...pos,
                  data: { ...pos.data, ...data },
                  errors: errors !== undefined ? errors : pos.errors,
                  isNew: false,
                  status: getPositionStatus({ ...pos, data: { ...pos.data, ...data } }, assetType)
                }
              : pos
          )
        },
        isDirty: true
      };
    }

    case ActionTypes.DELETE_POSITION: {
      const { assetType, id } = action.payload;
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: state.positions[assetType].filter(pos => pos.id !== id)
        },
        selectedIds: new Set([...state.selectedIds].filter(sid => sid !== id)),
        isDirty: true
      };
    }

    case ActionTypes.DUPLICATE_POSITION: {
      const { assetType, id } = action.payload;
      const posToDupe = state.positions[assetType].find(pos => pos.id === id);
      if (!posToDupe) return state;
      const dupeIndex = state.positions[assetType].findIndex(pos => pos.id === id);
      const duplicated = {
        ...posToDupe,
        id: generateId(),
        data: { ...posToDupe.data },
        status: 'draft',
        isNew: true
      };
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: [
            ...state.positions[assetType].slice(0, dupeIndex + 1),
            duplicated,
            ...state.positions[assetType].slice(dupeIndex + 1)
          ]
        },
        isDirty: true
      };
    }

    case ActionTypes.SET_POSITIONS:
      return {
        ...state,
        positions: action.payload,
        isDirty: true
      };

    case ActionTypes.CLEAR_POSITIONS:
      return {
        ...state,
        positions: {
          security: [],
          cash: [],
          crypto: [],
          metal: [],
          other: []
        },
        selectedIds: new Set(),
        isDirty: true
      };

    case ActionTypes.UPDATE_POSITION_STATUS: {
      const { assetType, id, status, error } = action.payload;
      return {
        ...state,
        positions: {
          ...state.positions,
          [assetType]: state.positions[assetType].map(pos =>
            pos.id === id ? { ...pos, status, error } : pos
          )
        }
      };
    }

    case ActionTypes.TOGGLE_POSITION_SECTION:
      return {
        ...state,
        positionSections: {
          ...state.positionSections,
          [action.payload]: !state.positionSections[action.payload]
        }
      };

    case ActionTypes.BULK_IMPORT_POSITIONS: {
      const imported = action.payload;
      const newPositions = { ...state.positions };

      Object.entries(imported).forEach(([assetType, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          newPositions[assetType] = [
            ...newPositions[assetType],
            ...items.map(item => {
              // Handle both formats:
              // 1. Pre-structured from Excel parser: { id, type, data: {...}, status: 'ready' }
              // 2. Raw data objects: { ticker: 'AAPL', shares: 10, ... }
              if (item.data && typeof item.data === 'object') {
                // Pre-structured format from Excel parser
                return {
                  id: item.id || generateId(),
                  data: {
                    purchase_date: new Date().toISOString().split('T')[0],
                    ...item.data
                  },
                  status: item.status || 'ready',
                  isNew: item.isNew !== false,
                  errors: item.errors || {}
                };
              } else {
                // Raw data format
                return {
                  id: generateId(),
                  data: {
                    purchase_date: new Date().toISOString().split('T')[0],
                    ...item
                  },
                  status: 'draft',
                  isNew: true,
                  errors: {}
                };
              }
            })
          ];
        }
      });

      // Expand sections with imported data
      const newSections = { ...state.positionSections };
      Object.keys(imported).forEach(type => {
        if (imported[type]?.length > 0) {
          newSections[type] = true;
        }
      });

      return {
        ...state,
        positions: newPositions,
        positionSections: newSections,
        isDirty: true
      };
    }

    // ====== Liability Entry ======
    case ActionTypes.ADD_LIABILITY:
      return {
        ...state,
        liabilities: [...state.liabilities, {
          id: generateId(),
          name: '',
          liability_type: '',
          institution_name: '',
          current_balance: '',
          original_amount: '',
          credit_limit: '',
          interest_rate: '',
          status: 'draft',
          isNew: true,
          ...action.payload
        }],
        isDirty: true
      };

    case ActionTypes.UPDATE_LIABILITY:
      return {
        ...state,
        liabilities: state.liabilities.map(lib =>
          lib.id === action.payload.id
            ? {
                ...lib,
                ...action.payload.data,
                isNew: false,
                status: getLiabilityStatus({ ...lib, ...action.payload.data })
              }
            : lib
        ),
        isDirty: true
      };

    case ActionTypes.DELETE_LIABILITY:
      return {
        ...state,
        liabilities: state.liabilities.filter(lib => lib.id !== action.payload),
        selectedIds: new Set([...state.selectedIds].filter(id => id !== action.payload)),
        isDirty: true
      };

    case ActionTypes.DUPLICATE_LIABILITY: {
      const libToDupe = state.liabilities.find(lib => lib.id === action.payload);
      if (!libToDupe) return state;
      const dupeIndex = state.liabilities.findIndex(lib => lib.id === action.payload);
      const duplicated = {
        ...libToDupe,
        id: generateId(),
        name: `${libToDupe.name} (Copy)`,
        status: 'draft',
        isNew: true
      };
      return {
        ...state,
        liabilities: [
          ...state.liabilities.slice(0, dupeIndex + 1),
          duplicated,
          ...state.liabilities.slice(dupeIndex + 1)
        ],
        isDirty: true
      };
    }

    case ActionTypes.SET_LIABILITIES:
      return {
        ...state,
        liabilities: action.payload,
        isDirty: true
      };

    case ActionTypes.CLEAR_LIABILITIES:
      return {
        ...state,
        liabilities: [],
        isDirty: true
      };

    case ActionTypes.UPDATE_LIABILITY_STATUS:
      return {
        ...state,
        liabilities: state.liabilities.map(lib =>
          lib.id === action.payload.id
            ? { ...lib, status: action.payload.status, error: action.payload.error }
            : lib
        )
      };

    // ====== Selection ======
    case ActionTypes.TOGGLE_SELECT: {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedIds: newSelected };
    }

    case ActionTypes.SELECT_ALL: {
      const allIds = new Set();
      // Add all position IDs
      Object.values(state.positions).flat().forEach(pos => allIds.add(pos.id));
      // Add all liability IDs
      state.liabilities.forEach(lib => allIds.add(lib.id));
      // Add all account IDs
      state.accounts.forEach(acc => allIds.add(acc.id));
      return { ...state, selectedIds: allIds };
    }

    case ActionTypes.DESELECT_ALL:
      return { ...state, selectedIds: new Set() };

    case ActionTypes.DELETE_SELECTED: {
      const idsToDelete = new Set(action.payload || state.selectedIds);
      return {
        ...state,
        accounts: state.accounts.filter(acc => !idsToDelete.has(acc.id)),
        positions: {
          security: state.positions.security.filter(pos => !idsToDelete.has(pos.id)),
          cash: state.positions.cash.filter(pos => !idsToDelete.has(pos.id)),
          crypto: state.positions.crypto.filter(pos => !idsToDelete.has(pos.id)),
          metal: state.positions.metal.filter(pos => !idsToDelete.has(pos.id)),
          other: state.positions.other.filter(pos => !idsToDelete.has(pos.id))
        },
        liabilities: state.liabilities.filter(lib => !idsToDelete.has(lib.id)),
        selectedIds: new Set(),
        isDirty: true
      };
    }

    // ====== Search ======
    case ActionTypes.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: {
          ...state.searchResults,
          [action.payload.key]: action.payload.results
        }
      };

    case ActionTypes.CLEAR_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: {
          ...state.searchResults,
          [action.payload]: []
        }
      };

    case ActionTypes.SET_SEARCHING:
      return {
        ...state,
        isSearching: {
          ...state.isSearching,
          [action.payload.key]: action.payload.value
        }
      };

    case ActionTypes.SET_SEARCH_TERM:
      return {
        ...state,
        searchTerm: action.payload
      };

    // ====== UI State ======
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ActionTypes.SET_SUBMITTING:
      return { ...state, isSubmitting: action.payload };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };

    case ActionTypes.TOGGLE_HELP:
      return { ...state, showHelp: !state.showHelp };

    case ActionTypes.TOGGLE_KEYBOARD_SHORTCUTS:
      return { ...state, showKeyboardShortcuts: !state.showKeyboardShortcuts };

    case ActionTypes.SET_ACTIVE_DROPDOWN:
      return { ...state, activeDropdown: action.payload };

    // ====== Success State ======
    case ActionTypes.SET_SUCCESS_DATA:
      return {
        ...state,
        successData: action.payload,
        currentView: VIEWS.success
      };

    case ActionTypes.CLEAR_SUCCESS_DATA:
      return { ...state, successData: null };

    // ====== Import ======
    case ActionTypes.SET_IMPORT_FILE:
      return { ...state, importFile: action.payload };

    case ActionTypes.SET_IMPORT_PROGRESS:
      return { ...state, importProgress: action.payload };

    case ActionTypes.SET_IMPORT_DATA:
      return { ...state, importData: action.payload };

    case ActionTypes.SET_IMPORT_TARGET:
      return { ...state, importTarget: action.payload };

    case ActionTypes.CLEAR_IMPORT:
      return {
        ...state,
        importFile: null,
        importProgress: 0,
        importData: null,
        importTarget: null
      };

    // ====== Persistence ======
    case ActionTypes.RESTORE_DRAFT:
      return {
        ...state,
        ...action.payload,
        isDirty: false
      };

    case ActionTypes.MARK_CLEAN:
      return { ...state, isDirty: false };

    // ====== Reset ======
    case ActionTypes.RESET_ALL:
      return {
        ...initialState,
        existingAccounts: state.existingAccounts
      };

    default:
      return state;
  }
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

function getAccountStatus(account) {
  if (account.status === 'added') return 'added';
  if (account.status === 'submitting') return 'submitting';
  if (account.status === 'error') return 'error';

  const isComplete = account.accountName &&
                     account.institution &&
                     account.accountCategory &&
                     account.accountType;

  return isComplete ? 'ready' : 'draft';
}

function getPositionStatus(position, assetType) {
  if (position.status === 'added') return 'added';
  if (position.status === 'submitting') return 'submitting';
  if (position.status === 'error') return 'error';

  const config = ASSET_TYPES[assetType];
  if (!config) return 'draft';

  const requiredFields = config.fields.filter(f => f.required);
  const isComplete = requiredFields.every(field => {
    const value = position.data[field.key];
    return value !== undefined && value !== null && value !== '';
  });

  return isComplete ? 'ready' : 'draft';
}

function getLiabilityStatus(liability) {
  if (liability.status === 'added') return 'added';
  if (liability.status === 'submitting') return 'submitting';
  if (liability.status === 'error') return 'error';

  const isComplete = liability.name &&
                     liability.liability_type &&
                     liability.institution_name &&
                     liability.current_balance;

  return isComplete ? 'ready' : 'draft';
}

// ============================================================================
// ACTION CREATORS
// ============================================================================

export const actions = {
  // Navigation
  setView: (view) => ({ type: ActionTypes.SET_VIEW, payload: view }),
  setImportMethod: (method) => ({ type: ActionTypes.SET_IMPORT_METHOD, payload: method }),
  goBack: () => ({ type: ActionTypes.GO_BACK }),

  // Existing Accounts
  setExistingAccounts: (accounts) => ({ type: ActionTypes.SET_EXISTING_ACCOUNTS, payload: accounts }),
  trackRecentAccount: (accountId) => ({ type: ActionTypes.TRACK_RECENT_ACCOUNT, payload: accountId }),

  // Accounts
  addAccount: (data = {}) => ({ type: ActionTypes.ADD_ACCOUNT, payload: data }),
  updateAccount: (id, data) => ({ type: ActionTypes.UPDATE_ACCOUNT, payload: { id, data } }),
  deleteAccount: (id) => ({ type: ActionTypes.DELETE_ACCOUNT, payload: id }),
  duplicateAccount: (id) => ({ type: ActionTypes.DUPLICATE_ACCOUNT, payload: id }),
  setAccounts: (accounts) => ({ type: ActionTypes.SET_ACCOUNTS, payload: accounts }),
  clearAccounts: () => ({ type: ActionTypes.CLEAR_ACCOUNTS }),

  // Positions
  addPosition: (assetType, data = {}) => ({ type: ActionTypes.ADD_POSITION, payload: { assetType, data } }),
  updatePosition: (assetType, id, data, errors) => ({ type: ActionTypes.UPDATE_POSITION, payload: { assetType, id, data, errors } }),
  deletePosition: (assetType, id) => ({ type: ActionTypes.DELETE_POSITION, payload: { assetType, id } }),
  duplicatePosition: (assetType, id) => ({ type: ActionTypes.DUPLICATE_POSITION, payload: { assetType, id } }),
  setPositions: (positions) => ({ type: ActionTypes.SET_POSITIONS, payload: positions }),
  clearPositions: () => ({ type: ActionTypes.CLEAR_POSITIONS }),
  updatePositionStatus: (assetType, id, status, error) => ({ type: ActionTypes.UPDATE_POSITION_STATUS, payload: { assetType, id, status, error } }),
  togglePositionSection: (assetType) => ({ type: ActionTypes.TOGGLE_POSITION_SECTION, payload: assetType }),
  bulkImportPositions: (data) => ({ type: ActionTypes.BULK_IMPORT_POSITIONS, payload: data }),

  // Liabilities
  addLiability: (data = {}) => ({ type: ActionTypes.ADD_LIABILITY, payload: data }),
  updateLiability: (id, data) => ({ type: ActionTypes.UPDATE_LIABILITY, payload: { id, data } }),
  deleteLiability: (id) => ({ type: ActionTypes.DELETE_LIABILITY, payload: id }),
  duplicateLiability: (id) => ({ type: ActionTypes.DUPLICATE_LIABILITY, payload: id }),
  setLiabilities: (liabilities) => ({ type: ActionTypes.SET_LIABILITIES, payload: liabilities }),
  clearLiabilities: () => ({ type: ActionTypes.CLEAR_LIABILITIES }),
  updateLiabilityStatus: (id, status, error) => ({ type: ActionTypes.UPDATE_LIABILITY_STATUS, payload: { id, status, error } }),

  // Selection
  toggleSelect: (id) => ({ type: ActionTypes.TOGGLE_SELECT, payload: id }),
  selectAll: () => ({ type: ActionTypes.SELECT_ALL }),
  deselectAll: () => ({ type: ActionTypes.DESELECT_ALL }),
  deleteSelected: (ids) => ({ type: ActionTypes.DELETE_SELECTED, payload: ids }),

  // Search
  setSearchResults: (key, results) => ({ type: ActionTypes.SET_SEARCH_RESULTS, payload: { key, results } }),
  clearSearchResults: (key) => ({ type: ActionTypes.CLEAR_SEARCH_RESULTS, payload: key }),
  setSearching: (key, value) => ({ type: ActionTypes.SET_SEARCHING, payload: { key, value } }),
  setSearchTerm: (term) => ({ type: ActionTypes.SET_SEARCH_TERM, payload: term }),

  // UI State
  setLoading: (loading) => ({ type: ActionTypes.SET_LOADING, payload: loading }),
  setSubmitting: (submitting) => ({ type: ActionTypes.SET_SUBMITTING, payload: submitting }),
  setError: (error) => ({ type: ActionTypes.SET_ERROR, payload: error }),
  clearError: () => ({ type: ActionTypes.CLEAR_ERROR }),
  toggleHelp: () => ({ type: ActionTypes.TOGGLE_HELP }),
  toggleKeyboardShortcuts: () => ({ type: ActionTypes.TOGGLE_KEYBOARD_SHORTCUTS }),
  setActiveDropdown: (id) => ({ type: ActionTypes.SET_ACTIVE_DROPDOWN, payload: id }),

  // Success
  setSuccessData: (data) => ({ type: ActionTypes.SET_SUCCESS_DATA, payload: data }),
  clearSuccessData: () => ({ type: ActionTypes.CLEAR_SUCCESS_DATA }),

  // Import
  setImportFile: (file) => ({ type: ActionTypes.SET_IMPORT_FILE, payload: file }),
  setImportProgress: (progress) => ({ type: ActionTypes.SET_IMPORT_PROGRESS, payload: progress }),
  setImportData: (data) => ({ type: ActionTypes.SET_IMPORT_DATA, payload: data }),
  setImportTarget: (target) => ({ type: ActionTypes.SET_IMPORT_TARGET, payload: target }),
  clearImport: () => ({ type: ActionTypes.CLEAR_IMPORT }),

  // Persistence
  restoreDraft: (data) => ({ type: ActionTypes.RESTORE_DRAFT, payload: data }),
  markClean: () => ({ type: ActionTypes.MARK_CLEAN }),

  // Reset
  resetAll: () => ({ type: ActionTypes.RESET_ALL })
};
