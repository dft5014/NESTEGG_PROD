// QuickStart Modal V2 - Clean Data Entry Experience
// Main exports for the new unified modal

// Main Modal
export { default as QuickStartModalV2, QuickStartModalV2Button } from './QuickStartModalV2';

// State Management
export { quickStartReducer, initialState, actions, ActionTypes } from './state/reducer';

// Utilities
export * from './utils/constants';
export * from './utils/excelUtils';

// Components
export { default as StatusBadge } from './components/StatusBadge';
export { default as StatsBar } from './components/StatsBar';
export { default as SearchableInput, InstitutionSearchInput, SecuritySearchInput } from './components/SearchableInput';
export { default as DataTable, CollapsibleSection } from './components/DataTable';

// Hooks
export { default as useSecuritySearch } from './hooks/useSecuritySearch';
export { default as useBulkSubmit } from './hooks/useBulkSubmit';
export { default as useLocalPersistence } from './hooks/useLocalPersistence';

// Views (for custom compositions)
export { default as WelcomeView } from './views/WelcomeView';
export { default as AccountsView } from './views/AccountsView';
export { default as PositionsView } from './views/PositionsView';
export { default as LiabilitiesView } from './views/LiabilitiesView';
export { default as ImportView } from './views/ImportView';
export { default as SuccessView } from './views/SuccessView';
