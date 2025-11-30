import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing multi-select state with shift-click support
 */
export const useSelectionState = () => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  /**
   * Toggle selection of an item, with optional shift-click range selection
   */
  const toggleSelection = useCallback((id, index, withShift = false, items = []) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);

      if (withShift && lastSelectedIndex !== null && index !== undefined) {
        // Range selection with shift key
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        for (let i = start; i <= end; i++) {
          if (items[i]) {
            newSet.add(items[i].id);
          }
        }
      } else {
        // Single toggle
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      }

      return newSet;
    });

    if (!withShift) {
      setLastSelectedIndex(index);
    }
  }, [lastSelectedIndex]);

  /**
   * Select all items in the provided list
   */
  const selectAll = useCallback((items) => {
    setSelectedItems(new Set(items.map(item => item.id)));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setLastSelectedIndex(null);
  }, []);

  /**
   * Check if an item is selected
   */
  const isSelected = useCallback((id) => selectedItems.has(id), [selectedItems]);

  /**
   * Get count of selected items
   */
  const selectedCount = useMemo(() => selectedItems.size, [selectedItems]);

  /**
   * Get array of selected IDs
   */
  const selectedIds = useMemo(() => Array.from(selectedItems), [selectedItems]);

  return {
    selectedItems,
    selectedCount,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected
  };
};

export default useSelectionState;
