import React, { useMemo } from 'react';
import {
  ArrowLeft, Search, X, Eye, EyeOff, RefreshCw, Grid3x3,
  Loader2, Database, Building, CreditCard, ArrowUpDown,
  Download, Trash2, Layers, Wallet, Building2, FilterX
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { ACCOUNT_CATEGORIES, getGroupingOptionsForView, ASSET_TYPES } from '../config';
import EnhancedDropdown from './EnhancedDropdown';
import { FilterDropdown, AssetTypeFilter, LiabilityTypeFilter } from './Filters';
import { EditAccountForm, EditPositionForm, EditLiabilityForm } from './EditForms';
import { AccountRow, PositionRow, LiabilityRow } from './TableRows';
import AnimatedCounter from './AnimatedCounter';

/**
 * Entity manager view with table, filters, and actions
 */
const EntityManager = ({
  // View state
  currentView,
  onBack,

  // Data
  accounts,
  filteredEntities,
  groupedEntities,

  // Filtering
  searchQuery,
  setSearchQuery,
  selectedAssetTypes,
  setSelectedAssetTypes,
  selectedLiabilityTypes,
  setSelectedLiabilityTypes,
  selectedAccountFilter,
  setSelectedAccountFilter,
  selectedCategories,
  setSelectedCategories,
  selectedInstitutionFilter,
  setSelectedInstitutionFilter,
  handleSort,
  sortConfig,
  clearFilters,
  hasActiveFilters,

  // Grouping
  groupBy,
  setGroupBy,

  // Selection
  selection,
  showValues,
  setShowValues,

  // Editing
  editingItem,
  editingType,
  onEdit,
  onCancelEdit,
  onSave,

  // Actions
  onDelete,
  onDeleteSelected,
  onExport,
  onRefresh,

  // State
  loading,
  isSubmitting
}) => {
  const groupingOptions = getGroupingOptionsForView(currentView);

  // Filter options for dropdowns
  const categoryFilterOptions = useMemo(() => {
    return ACCOUNT_CATEGORIES.map(cat => ({
      value: cat.id,
      label: cat.name,
      icon: cat.icon,
      count: accounts.filter(acc => acc.category === cat.id).length
    }));
  }, [accounts]);

  const institutionFilterOptions = useMemo(() => {
    const institutions = [...new Set(accounts.map(acc => acc.institution).filter(Boolean))];
    return institutions.sort().map(inst => ({
      value: inst,
      label: inst,
      icon: Building2,
      count: accounts.filter(acc => acc.institution === inst).length
    }));
  }, [accounts]);

  const accountFilterOptions = useMemo(() => {
    return accounts.map(acc => {
      const category = ACCOUNT_CATEGORIES.find(cat => cat.id === acc.category);
      return {
        value: acc.id,
        label: acc.name || acc.account_name || `Account ${acc.id}`,
        icon: category?.icon || Wallet,
        institution: acc.institution,
        categoryName: category?.name,
        categoryColor: category?.color || 'gray'
      };
    });
  }, [accounts]);

  // Calculate stats
  const stats = useMemo(() => {
    const selectedItems = filteredEntities.filter(item => selection.isSelected(item.id));

    if (currentView === 'accounts') {
      const totalValue = selectedItems.reduce((sum, acc) =>
        sum + (parseFloat(acc.totalValue || acc.balance || 0)), 0);
      return { selected: selectedItems.length, total: filteredEntities.length, totalValue };
    } else if (currentView === 'positions') {
      const totalValue = selectedItems.reduce((sum, pos) =>
        sum + parseFloat(pos.current_value || 0), 0);
      const totalCost = selectedItems.reduce((sum, pos) =>
        sum + parseFloat(pos.total_cost_basis || 0), 0);
      return {
        selected: selectedItems.length,
        total: filteredEntities.length,
        totalValue,
        totalCost,
        gainLoss: totalValue - totalCost,
        gainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
      };
    } else {
      const totalBalance = selectedItems.reduce((sum, l) =>
        sum + (parseFloat(l.current_balance || 0)), 0);
      return { selected: selectedItems.length, total: filteredEntities.length, totalBalance };
    }
  }, [currentView, filteredEntities, selection]);

  // Render table headers
  const renderTableHeaders = () => {
    if (currentView === 'accounts') {
      return (
        <>
          <th className="px-4 py-3 text-left">
            <button
              onClick={() => handleSort('account_name')}
              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Account
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-left">
            <button
              onClick={() => handleSort('institution')}
              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Institution
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-left">
            <button
              onClick={() => handleSort('type')}
              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Type
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-right">
            <button
              onClick={() => handleSort('totalValue')}
              className="flex items-center justify-end text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Balance
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
        </>
      );
    } else if (currentView === 'positions') {
      return (
        <>
          <th className="px-4 py-3 text-left">
            <button
              onClick={() => handleSort('identifier')}
              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Asset
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-left">
            <button
              onClick={() => handleSort('account_name')}
              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Account
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-right">
            <button
              onClick={() => handleSort('quantity')}
              className="flex items-center justify-end text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Quantity
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-right">
            <button
              onClick={() => handleSort('current_value')}
              className="flex items-center justify-end text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Value
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-right">
            <button
              onClick={() => handleSort('gain_loss_amt')}
              className="flex items-center justify-end text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Gain/Loss
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
        </>
      );
    } else {
      return (
        <>
          <th className="px-4 py-3 text-left">
            <button
              onClick={() => handleSort('name')}
              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Liability
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-right">
            <button
              onClick={() => handleSort('current_balance')}
              className="flex items-center justify-end text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Balance
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-right">
            <button
              onClick={() => handleSort('interest_rate')}
              className="flex items-center justify-end text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Rate
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
          <th className="px-4 py-3 text-right">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Min Payment
            </span>
          </th>
          <th className="px-4 py-3 text-left">
            <button
              onClick={() => handleSort('due_date')}
              className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white"
            >
              Due Date
              <ArrowUpDown className="w-3 h-3 ml-1" />
            </button>
          </th>
        </>
      );
    }
  };

  // Render grouped tables
  const renderGroupedTables = () => {
    if (Object.keys(groupedEntities).length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <Database className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">No data found</p>
          <p className="text-gray-500 text-sm mt-1">
            Try adjusting your filters or grouping options
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedEntities).map(([groupName, items]) => (
          <div key={groupName} className="bg-gray-900 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">{groupName}</h3>
                <div className="text-xs text-gray-500">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={items.every(item => selection.isSelected(item.id)) && items.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selection.selectAll(items);
                          } else {
                            items.forEach(item => selection.toggleSelection(item.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-400 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </th>
                    {renderTableHeaders()}
                    <th className="px-4 py-3 text-right">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Actions
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-800">
                  {items.map((item, index) => {
                    const globalIndex = filteredEntities.findIndex(e => e.id === item.id);

                    if (currentView === 'accounts') {
                      return (
                        <AccountRow
                          key={item.id}
                          account={item}
                          index={globalIndex}
                          isSelected={selection.isSelected(item.id)}
                          onToggleSelection={(id, idx, shiftKey) =>
                            selection.toggleSelection(id, idx, shiftKey, filteredEntities)
                          }
                          onEdit={onEdit}
                          onDelete={onDelete}
                          showValues={showValues}
                        />
                      );
                    } else if (currentView === 'positions') {
                      return (
                        <PositionRow
                          key={item.id}
                          position={item}
                          index={globalIndex}
                          isSelected={selection.isSelected(item.id)}
                          onToggleSelection={(id, idx, shiftKey) =>
                            selection.toggleSelection(id, idx, shiftKey, filteredEntities)
                          }
                          onEdit={onEdit}
                          onDelete={onDelete}
                          showValues={showValues}
                        />
                      );
                    } else {
                      return (
                        <LiabilityRow
                          key={item.id}
                          liability={item}
                          index={globalIndex}
                          isSelected={selection.isSelected(item.id)}
                          onToggleSelection={(id, idx, shiftKey) =>
                            selection.toggleSelection(id, idx, shiftKey, filteredEntities)
                          }
                          onEdit={onEdit}
                          onDelete={onDelete}
                          showValues={showValues}
                        />
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            {/* Group summary */}
            <div className="bg-gray-800 px-6 py-2 border-t border-gray-700 text-xs text-gray-500">
              <div className="flex justify-between items-center">
                <span>
                  {items.length} {currentView === 'liabilities' ? (items.length === 1 ? 'liability' : 'liabilities') : (items.length === 1 ? 'item' : 'items')}
                </span>
                <span className="font-medium text-gray-300">
                  {groupBy === 'none' ? 'Total' : 'Subtotal'}: {showValues ? formatCurrency(
                    currentView === 'accounts'
                      ? items.reduce((sum, acc) => sum + (acc.totalValue || 0), 0)
                      : currentView === 'positions'
                        ? items.reduce((sum, pos) => sum + (pos.current_value || 0), 0)
                        : items.reduce((sum, liab) => sum + (liab.current_balance || 0), 0)
                  ) : '••••'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render edit form
  const renderEditForm = () => {
    if (!editingItem) return null;

    if (editingType === 'account') {
      return (
        <EditAccountForm
          account={editingItem}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      );
    } else if (editingType === 'position') {
      return (
        <EditPositionForm
          position={editingItem}
          assetType={editingItem.asset_type}
          onSave={onSave}
          onCancel={onCancelEdit}
          accounts={accounts}
        />
      );
    } else {
      return (
        <EditLiabilityForm
          liability={editingItem}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      );
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-6">
            {/* Back button */}
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentView}...`}
                className="pl-10 pr-4 py-2 w-64 text-sm bg-gray-800 text-white placeholder-gray-500 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-800 rounded"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>

            {/* Show/hide values */}
            <button
              onClick={() => setShowValues(!showValues)}
              className={`
                p-2 rounded-lg transition-all
                ${showValues ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400'}
              `}
              title={showValues ? 'Hide values' : 'Show values'}
            >
              {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Grouping dropdown */}
            <EnhancedDropdown
              title="Group By"
              options={groupingOptions}
              selectedOption={groupBy}
              onChange={setGroupBy}
              icon={Grid3x3}
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {stats.selected > 0 && (
              <div className="flex items-center space-x-3 px-4 py-2 bg-blue-500/10 rounded-lg">
                <span className="text-sm font-medium text-blue-400">
                  {stats.selected} selected
                </span>
                <button
                  onClick={onExport}
                  className="text-sm text-blue-400 hover:text-blue-400 font-medium"
                >
                  Export
                </button>
                <button
                  onClick={onDeleteSelected}
                  disabled={isSubmitting}
                  className="text-sm text-rose-400 hover:text-rose-400 font-medium"
                >
                  Delete
                </button>
              </div>
            )}

            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {currentView === 'accounts' ? (
          <div className="flex items-center justify-center space-x-3 w-full">
            <span className="text-sm text-gray-500 font-medium">Filters:</span>

            <FilterDropdown
              title="Categories"
              icon={Layers}
              options={categoryFilterOptions}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />

            <FilterDropdown
              title="Institutions"
              icon={Building2}
              options={institutionFilterOptions}
              selected={selectedInstitutionFilter}
              onChange={setSelectedInstitutionFilter}
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FilterX className="w-3 h-3 mr-1" />
                Clear Filters
              </button>
            )}
          </div>
        ) : currentView === 'positions' ? (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500 font-medium">Filters:</span>

            <AssetTypeFilter
              positions={filteredEntities}
              selectedAssetTypes={selectedAssetTypes}
              setSelectedAssetTypes={setSelectedAssetTypes}
            />

            <div className="w-px h-6 bg-gray-300" />

            <FilterDropdown
              title="Accounts"
              icon={Wallet}
              options={accountFilterOptions}
              selected={selectedAccountFilter}
              onChange={setSelectedAccountFilter}
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FilterX className="w-3 h-3 mr-1" />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500 font-medium">Filters:</span>

            <LiabilityTypeFilter
              liabilities={filteredEntities}
              selectedLiabilityTypes={selectedLiabilityTypes}
              setSelectedLiabilityTypes={setSelectedLiabilityTypes}
            />

            {selectedLiabilityTypes.size > 0 && (
              <button
                onClick={() => setSelectedLiabilityTypes(new Set())}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FilterX className="w-3 h-3 mr-1" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
          </div>
        ) : editingItem ? (
          renderEditForm()
        ) : (
          renderGroupedTables()
        )}

        {/* Grand Total when grouping */}
        {!loading && !editingItem && groupBy !== 'none' && filteredEntities.length > 0 && (
          <div className="bg-gray-900 border-t-2 border-gray-600 px-6 py-3 mt-6 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-300">
                Grand Total ({filteredEntities.length} {currentView === 'liabilities'
                  ? (filteredEntities.length === 1 ? 'liability' : 'liabilities')
                  : (filteredEntities.length === 1 ? 'item' : 'items')
                })
              </span>
              <span className="text-sm font-bold text-white">
                {showValues ? formatCurrency(
                  currentView === 'accounts'
                    ? filteredEntities.reduce((sum, acc) => sum + (acc.totalValue || 0), 0)
                    : currentView === 'positions'
                      ? filteredEntities.reduce((sum, pos) => sum + (pos.current_value || 0), 0)
                      : filteredEntities.reduce((sum, liab) => sum + (liab.current_balance || 0), 0)
                ) : '••••'}
              </span>
            </div>
          </div>
        )}

        {/* Empty states */}
        {!loading && !editingItem && filteredEntities.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64">
            {currentView === 'accounts' && <Building className="w-12 h-12 text-gray-300 mb-4" />}
            {currentView === 'positions' && <Database className="w-12 h-12 text-gray-300 mb-4" />}
            {currentView === 'liabilities' && <CreditCard className="w-12 h-12 text-gray-300 mb-4" />}
            <p className="text-gray-500 text-lg font-medium">
              No {currentView} found
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : `Add ${currentView} to get started`
              }
            </p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {stats.selected > 0 && !editingItem && (
        <div className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
              <span className="font-medium text-blue-300">
                <AnimatedCounter value={stats.selected} /> selected
              </span>
              <div className="flex items-center space-x-4 text-blue-400">
                {currentView === 'accounts' && (
                  <span>
                    Total Value: {showValues ? (
                      <AnimatedCounter value={stats.totalValue} prefix="$" />
                    ) : '••••'}
                  </span>
                )}
                {currentView === 'positions' && (
                  <>
                    <span>
                      Total Value: {showValues ? (
                        <AnimatedCounter value={stats.totalValue} prefix="$" />
                      ) : '••••'}
                    </span>
                    <span className="text-blue-400">•</span>
                    <span>
                      Cost: {showValues ? (
                        <AnimatedCounter value={stats.totalCost} prefix="$" />
                      ) : '••••'}
                    </span>
                    <span className="text-blue-400">•</span>
                    <span className={`font-medium ${stats.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stats.gainLoss >= 0 ? '+' : '-'}
                      {showValues ? (
                        <AnimatedCounter value={Math.abs(stats.gainLoss)} prefix="$" />
                      ) : '••••'}
                      <span className="text-xs ml-1">({stats.gainLossPercent.toFixed(1)}%)</span>
                    </span>
                  </>
                )}
                {currentView === 'liabilities' && (
                  <span>
                    Total Balance: {showValues ? (
                      <>-<AnimatedCounter value={stats.totalBalance} prefix="$" /></>
                    ) : '••••'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onExport}
                className="px-3 py-1.5 text-sm font-medium text-blue-400 bg-gray-900 border border-blue-500/50 rounded-lg hover:bg-blue-500/10 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-1.5" />
                Export
              </button>

              <button
                onClick={onDeleteSelected}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 inline mr-1.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 inline mr-1.5" />
                    Delete Selected
                  </>
                )}
              </button>

              <button
                onClick={() => selection.clearSelection()}
                className="text-sm text-blue-400 hover:text-blue-400 font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EntityManager;
