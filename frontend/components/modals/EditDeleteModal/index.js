// Main export
export { default as EditDeleteModal } from './EditDeleteModal';
export { default } from './EditDeleteModal';

// Button components (for navbar integration)
export { QuickEditDeleteButton, LiabilityEditDeleteButton } from './components/Buttons';

// Hooks (for advanced usage)
export {
  useSelectionState,
  useEntityFiltering,
  useEntityGrouping,
  useEntityData,
  useMessage
} from './hooks';

// Config (for advanced usage)
export {
  ASSET_TYPES,
  normalizeAssetType,
  getAssetTypeConfig,
  LIABILITY_TYPES,
  getLiabilityTypeConfig,
  ACCOUNT_CATEGORIES,
  getCategoryConfig,
  getGroupingOptionsForView
} from './config';

// Components (for advanced usage)
export { default as SelectionScreen } from './components/SelectionScreen';
export { default as EntityManager } from './components/EntityManager';
