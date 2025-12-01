// UpdateModal - Main exports
// Modern balance update interface for NestEgg

// Main Modal
export { default as UpdateModal } from './UpdateModal';
export { default } from './UpdateModal';

// Button components (for navbar integration)
export { UpdateButton, UpdateButtonV2 } from './UpdateButton';

// Hooks (for advanced usage)
export {
  useUpdateData,
  useUpdateFiltering,
  useUpdateDrafts,
  useUpdateSubmit,
  useMessage
} from './hooks';

// Config (for advanced usage)
export {
  ITEM_TYPES,
  getItemTypeConfig,
  BALANCE_TYPES,
  QUANTITY_TYPES,
  SORT_OPTIONS,
  FILTER_OPTIONS,
  GROUPING_OPTIONS,
  getSortFn
} from './config';

// Components (for advanced usage/composition)
export {
  CurrencyInput,
  AnimatedCounter,
  AnimatedCurrency,
  AnimatedPercent,
  StatsBar,
  InstitutionCard,
  UpdateRow,
  ActionBar,
  MessageToast,
  FilterBar
} from './components';

// Views (for advanced usage/composition)
export {
  SelectionDashboard,
  UpdateManager
} from './views';
