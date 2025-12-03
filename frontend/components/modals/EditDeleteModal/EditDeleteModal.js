import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ArrowLeft, Edit3, Eye, EyeOff, RefreshCw, Wallet, Layers, CreditCard } from 'lucide-react';
import FixedModal from '../FixedModal';
import SelectionScreen from './components/SelectionScreen';
import EntityManager from './components/EntityManager';
import MessageToast from './components/MessageToast';
import {
  useSelectionState,
  useEntityFiltering,
  useEntityGrouping,
  useEntityData,
  useMessage
} from './hooks';
import { exportToCsv, preparePositionUpdatePayload } from './utils';
import { normalizeAssetType } from './config';

// API methods
import { updateAccount, deleteAccount } from '@/utils/apimethods/accountMethods';
import {
  updatePosition,
  deletePosition,
  updateLiability,
  deleteLiability,
  updateOtherAsset,
  deleteOtherAsset,
  updateCashPosition,
  deleteCashPosition
} from '@/utils/apimethods/positionMethods';

/**
 * EditDeleteModal - Main orchestrator component for managing entities
 *
 * Features:
 * - Multi-entity support (accounts, positions, liabilities)
 * - Selection screen with dashboard
 * - Filtering, sorting, grouping
 * - Bulk selection with shift-click
 * - Edit forms for each entity type
 * - Bulk and single delete
 * - CSV export
 * - Privacy toggle (show/hide values)
 */
const EditDeleteModal = ({
  isOpen,
  onClose,
  initialView = null,  // Optional: 'accounts', 'positions', 'liabilities'
  onDataChange = null  // Optional callback when data changes
}) => {
  // View state
  const [currentView, setCurrentView] = useState(initialView || null);
  const [showValues, setShowValues] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing state
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState(null);

  // Grouping state
  const [groupBy, setGroupBy] = useState('none');

  // Data hook
  const {
    accounts,
    positions,
    liabilities,
    portfolioSummary,
    getLoadingState,
    refreshAllData
  } = useEntityData(isOpen);

  // Selection hook
  const selection = useSelectionState();

  // Message hook
  const { message, showSuccess, showError, clearMessage } = useMessage();

  // Get current entities based on view
  const getCurrentEntities = useCallback(() => {
    switch (currentView) {
      case 'accounts':
        return accounts;
      case 'positions':
        return positions;
      case 'liabilities':
        return liabilities;
      default:
        return [];
    }
  }, [currentView, accounts, positions, liabilities]);

  // Filtering hook (initialized with current entities)
  const filtering = useEntityFiltering(
    getCurrentEntities(),
    currentView,
    accounts
  );

  // Grouping hook
  const { groupedEntities } = useEntityGrouping(
    filtering.filteredEntities,
    currentView,
    groupBy,
    accounts
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentView(initialView || null);
      setEditingItem(null);
      setEditingType(null);
      setGroupBy('none');
      selection.clearSelection();
      filtering.clearFilters();
    }
  }, [isOpen, initialView]);

  // Handle view selection from selection screen
  const handleSelectView = useCallback((view) => {
    setCurrentView(view);
    selection.clearSelection();
    filtering.clearFilters();
    setGroupBy('none');
  }, [selection, filtering]);

  // Handle back to selection screen
  const handleBack = useCallback(() => {
    setCurrentView(null);
    setEditingItem(null);
    setEditingType(null);
    selection.clearSelection();
    filtering.clearFilters();
    setGroupBy('none');
  }, [selection, filtering]);

  // Handle edit
  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setEditingType(currentView === 'accounts' ? 'account' :
                   currentView === 'positions' ? 'position' :
                   'liability');
  }, [currentView]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingItem(null);
    setEditingType(null);
  }, []);

  // Handle save
  const handleSave = useCallback(async (updatedData) => {
    setIsSubmitting(true);

    try {
      if (editingType === 'account') {
        await updateAccount(editingItem.id, updatedData);
        showSuccess('Account updated successfully');
      } else if (editingType === 'position') {
        const assetType = normalizeAssetType(editingItem.asset_type);

        // Transform internal format to API format for ALL asset types
        const apiPayload = preparePositionUpdatePayload(updatedData, assetType);

        // Route to correct API based on asset type
        if (assetType === 'otherAssets') {
          await updateOtherAsset(parseInt(editingItem.id), apiPayload);
        } else if (assetType === 'cash') {
          await updateCashPosition(editingItem.id, apiPayload);
        } else {
          // security, crypto, metal
          await updatePosition(editingItem.id, apiPayload, assetType);
        }
        showSuccess('Position updated successfully');
      } else if (editingType === 'liability') {
        await updateLiability(editingItem.id, updatedData);
        showSuccess('Liability updated successfully');
      }

      // Refresh data
      await refreshAllData();

      // Clear editing state
      setEditingItem(null);
      setEditingType(null);

      // Notify parent of data change
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error saving:', error);
      showError(error.message || 'Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, editingType, refreshAllData, showSuccess, showError, onDataChange]);

  // Handle single delete
  const handleDelete = useCallback(async (item) => {
    const itemType = currentView === 'accounts' ? 'account' :
      currentView === 'positions' ? 'position' : 'liability';
    const itemName = item.name || item.identifier || item.asset_name || 'this item';

    if (!window.confirm(`Delete ${itemType} "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (currentView === 'accounts') {
        await deleteAccount(item.id);
        showSuccess('Account deleted successfully');
      } else if (currentView === 'positions') {
        const assetType = normalizeAssetType(item.asset_type);

        // Route to correct API based on asset type
        if (assetType === 'otherAssets') {
          await deleteOtherAsset(parseInt(item.id));
        } else if (assetType === 'cash') {
          await deleteCashPosition(item.id);
        } else {
          // security, crypto, metal
          await deletePosition(item.id, assetType);
        }
        showSuccess('Position deleted successfully');
      } else if (currentView === 'liabilities') {
        await deleteLiability(item.id);
        showSuccess('Liability deleted successfully');
      }

      // Refresh data
      await refreshAllData();

      // Notify parent of data change
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error deleting:', error);
      showError(error.message || 'Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentView, refreshAllData, showSuccess, showError, onDataChange]);

  // Handle bulk delete
  const handleDeleteSelected = useCallback(async () => {
    const selectedCount = selection.selectedCount;

    if (selectedCount === 0) return;

    const itemType = currentView === 'accounts' ? 'account' :
      currentView === 'positions' ? 'position' : 'liability';

    if (!window.confirm(`Delete ${selectedCount} ${itemType}${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedIds = selection.selectedIds;
      const entities = getCurrentEntities();
      const itemsToDelete = entities.filter(item => selectedIds.includes(item.id));

      let successCount = 0;
      let errorCount = 0;

      for (const item of itemsToDelete) {
        try {
          if (currentView === 'accounts') {
            await deleteAccount(item.id);
          } else if (currentView === 'positions') {
            const assetType = normalizeAssetType(item.asset_type);

            // Route to correct API based on asset type
            if (assetType === 'otherAssets') {
              await deleteOtherAsset(parseInt(item.id));
            } else if (assetType === 'cash') {
              await deleteCashPosition(item.id);
            } else {
              await deletePosition(item.id, assetType);
            }
          } else if (currentView === 'liabilities') {
            await deleteLiability(item.id);
          }
          successCount++;
        } catch (error) {
          console.error(`Error deleting item ${item.id}:`, error);
          errorCount++;
        }
      }

      // Refresh data
      await refreshAllData();

      // Clear selection
      selection.clearSelection();

      // Show result message
      if (errorCount === 0) {
        showSuccess(`Successfully deleted ${successCount} item${successCount > 1 ? 's' : ''}`);
      } else {
        showError(`Deleted ${successCount} item${successCount > 1 ? 's' : ''}, ${errorCount} failed`);
      }

      // Notify parent of data change
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      showError(error.message || 'Failed to delete selected items');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentView, selection, getCurrentEntities, refreshAllData, showSuccess, showError, onDataChange]);

  // Handle export
  const handleExport = useCallback(() => {
    const selectedIds = selection.selectedIds;
    const entities = getCurrentEntities();
    const selectedItems = selectedIds.length > 0
      ? entities.filter(item => selectedIds.includes(item.id))
      : entities;

    if (selectedItems.length === 0) {
      showError('No items to export');
      return;
    }

    try {
      exportToCsv(selectedItems, currentView);
      showSuccess(`Exported ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error exporting:', error);
      showError('Failed to export data');
    }
  }, [currentView, selection, getCurrentEntities, showSuccess, showError]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refreshAllData();
    showSuccess('Data refreshed');
  }, [refreshAllData, showSuccess]);

  // Get loading state for current view
  const loading = getLoadingState(currentView);

  // View configuration
  const viewConfig = useMemo(() => ({
    accounts: { title: 'Manage Accounts', icon: Wallet, color: 'blue' },
    positions: { title: 'Manage Positions', icon: Layers, color: 'purple' },
    liabilities: { title: 'Manage Liabilities', icon: CreditCard, color: 'rose' }
  }), []);

  // Get item count for current view
  const itemCount = useMemo(() => {
    if (!currentView) return 0;
    if (currentView === 'accounts') return accounts.length;
    if (currentView === 'positions') return positions.length;
    if (currentView === 'liabilities') return liabilities.length;
    return 0;
  }, [currentView, accounts.length, positions.length, liabilities.length]);

  // Custom header content
  const headerContent = useMemo(() => {
    const config = currentView ? viewConfig[currentView] : null;
    const IconComponent = config?.icon;

    return (
      <>
        {/* Left side - Title */}
        <div className="flex items-center gap-3">
          {currentView && (
            <button
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${
            !currentView ? 'from-purple-600 to-pink-600' :
            config?.color === 'blue' ? 'from-blue-600 to-indigo-700' :
            config?.color === 'purple' ? 'from-purple-600 to-pink-700' :
            'from-rose-600 to-orange-700'
          }`}>
            {currentView && IconComponent ? (
              <IconComponent className="w-5 h-5 text-white" />
            ) : (
              <Edit3 className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {currentView ? config?.title : 'Edit & Delete Manager'}
            </h2>
            <p className="text-xs text-gray-400">
              {currentView ? `${itemCount} items` : 'Select what you\'d like to manage'}
            </p>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowValues(!showValues)}
            className={`p-2 rounded-lg transition-all ${
              showValues ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title={showValues ? 'Hide values' : 'Show values'}
          >
            {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </>
    );
  }, [currentView, viewConfig, itemCount, showValues, loading, handleBack, handleRefresh]);

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="max-w-6xl"
      disableBackdropClose={true}
      headerContent={headerContent}
    >
      <div className="relative flex flex-col h-[80vh]">
        {/* Selection Screen or Entity Manager */}
        {!currentView ? (
          <SelectionScreen
            portfolioSummary={portfolioSummary}
            accounts={accounts}
            positions={positions}
            liabilities={liabilities}
            onSelectView={handleSelectView}
            showValues={showValues}
          />
        ) : (
          <EntityManager
            // View state
            currentView={currentView}
            onBack={handleBack}

            // Data
            accounts={accounts}
            filteredEntities={filtering.filteredEntities}
            groupedEntities={groupedEntities}

            // Filtering
            searchQuery={filtering.searchQuery}
            setSearchQuery={filtering.setSearchQuery}
            selectedAssetTypes={filtering.selectedAssetTypes}
            setSelectedAssetTypes={filtering.setSelectedAssetTypes}
            selectedLiabilityTypes={filtering.selectedLiabilityTypes}
            setSelectedLiabilityTypes={filtering.setSelectedLiabilityTypes}
            selectedAccountFilter={filtering.selectedAccountFilter}
            setSelectedAccountFilter={filtering.setSelectedAccountFilter}
            selectedCategories={filtering.selectedCategories}
            setSelectedCategories={filtering.setSelectedCategories}
            selectedInstitutionFilter={filtering.selectedInstitutionFilter}
            setSelectedInstitutionFilter={filtering.setSelectedInstitutionFilter}
            handleSort={filtering.handleSort}
            sortConfig={filtering.sortConfig}
            clearFilters={filtering.clearFilters}
            hasActiveFilters={filtering.hasActiveFilters}

            // Grouping
            groupBy={groupBy}
            setGroupBy={setGroupBy}

            // Selection
            selection={selection}
            showValues={showValues}
            setShowValues={setShowValues}

            // Editing
            editingItem={editingItem}
            editingType={editingType}
            onEdit={handleEdit}
            onCancelEdit={handleCancelEdit}
            onSave={handleSave}

            // Actions
            onDelete={handleDelete}
            onDeleteSelected={handleDeleteSelected}
            onExport={handleExport}
            onRefresh={handleRefresh}

            // State
            loading={loading}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Message Toast */}
        <MessageToast message={message} onClear={clearMessage} />
      </div>
    </FixedModal>
  );
};

export default EditDeleteModal;
