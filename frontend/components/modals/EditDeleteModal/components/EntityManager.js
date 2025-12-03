import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Grid3x3,
  Loader2, Database, Building2, CreditCard, ArrowUpDown,
  Download, Trash2, Layers, Wallet, FilterX, Check
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { ACCOUNT_CATEGORIES, getGroupingOptionsForView, ASSET_TYPES } from '../config';
import EnhancedDropdown from './EnhancedDropdown';
import { FilterDropdown, AssetTypeFilter, LiabilityTypeFilter } from './Filters';
import { EditAccountForm, EditPositionForm, EditLiabilityForm } from './EditForms';
import { AccountRow, PositionRow, LiabilityRow } from './TableRows';

/**
 * Animated counter for stats
 */
const AnimatedStat = ({ value, prefix = '', suffix = '', duration = 400 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    const targetValue = typeof value === 'number' ? value : 0;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * targetValue));
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };
    startTime.current = null;
    rafId.current = requestAnimationFrame(animate);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [value, duration]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

/**
 * View title config
 */
const VIEW_CONFIG = {
  accounts: {
    title: 'Manage Accounts',
    icon: Wallet,
    color: 'blue',
    emptyIcon: Building2,
    emptyText: 'No accounts found'
  },
  positions: {
    title: 'Manage Positions',
    icon: Layers,
    color: 'purple',
    emptyIcon: Database,
    emptyText: 'No positions found'
  },
  liabilities: {
    title: 'Manage Liabilities',
    icon: CreditCard,
    color: 'rose',
    emptyIcon: CreditCard,
    emptyText: 'No liabilities found'
  }
};

/**
 * Stats bar component
 */
const StatsBar = ({ stats, currentView, showValues }) => {
  const colorClasses = {
    accounts: { bg: 'from-blue-600 to-blue-700', text: 'text-blue-400' },
    positions: { bg: 'from-purple-600 to-purple-700', text: 'text-purple-400' },
    liabilities: { bg: 'from-rose-600 to-rose-700', text: 'text-rose-400' }
  };

  const c = colorClasses[currentView];

  return (
    <div className="grid grid-cols-4 gap-3 px-6 py-3 bg-gray-900/50 border-b border-gray-800">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg mb-1">
          <p className={`text-lg font-black bg-gradient-to-r ${c.bg} bg-clip-text text-transparent`}>
            <AnimatedStat value={stats.total} />
          </p>
        </div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total</p>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg mb-1">
          <p className="text-lg font-black bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent">
            <AnimatedStat value={stats.selected} />
          </p>
        </div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Selected</p>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg mb-1">
          <p className="text-lg font-black bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
            {showValues ? formatCurrency(stats.totalValue || stats.totalBalance || 0).replace(/\.\d{2}$/, '') : '••••'}
          </p>
        </div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {currentView === 'liabilities' ? 'Balance' : 'Value'}
        </p>
      </div>

      {currentView === 'positions' && (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg mb-1">
            <p className={`text-lg font-black bg-gradient-to-r ${
              (stats.gainLoss || 0) >= 0 ? 'from-emerald-600 to-emerald-700' : 'from-rose-600 to-rose-700'
            } bg-clip-text text-transparent`}>
              {showValues ? (
                <>
                  {(stats.gainLoss || 0) >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(stats.gainLoss || 0)).replace(/\.\d{2}$/, '')}
                </>
              ) : '••••'}
            </p>
          </div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Gain/Loss</p>
        </div>
      )}

      {currentView !== 'positions' && (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-800 rounded-lg mb-1">
            <p className="text-lg font-black bg-gradient-to-r from-gray-500 to-gray-600 bg-clip-text text-transparent">
              {stats.groups || 1}
            </p>
          </div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Groups</p>
        </div>
      )}
    </div>
  );
};

/**
 * Entity manager view with table, filters, and actions
 */
const EntityManager = ({
  currentView,
  onBack,
  accounts,
  filteredEntities,
  groupedEntities,
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
  groupBy,
  setGroupBy,
  selection,
  showValues,
  setShowValues,
  editingItem,
  editingType,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onDeleteSelected,
  onExport,
  onRefresh,
  loading,
  isSubmitting
}) => {
  const config = VIEW_CONFIG[currentView];
  const groupingOptions = getGroupingOptionsForView(currentView);
  const IconComponent = config.icon;

  // Filter options
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
    const groups = Object.keys(groupedEntities).length;

    if (currentView === 'accounts') {
      const totalValue = filteredEntities.reduce((sum, acc) =>
        sum + (parseFloat(acc.totalValue || acc.balance || 0)), 0);
      return { selected: selectedItems.length, total: filteredEntities.length, totalValue, groups };
    } else if (currentView === 'positions') {
      const totalValue = filteredEntities.reduce((sum, pos) =>
        sum + parseFloat(pos.current_value || 0), 0);
      const totalCost = filteredEntities.reduce((sum, pos) =>
        sum + parseFloat(pos.total_cost_basis || 0), 0);
      return {
        selected: selectedItems.length,
        total: filteredEntities.length,
        totalValue,
        totalCost,
        gainLoss: totalValue - totalCost,
        gainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
        groups
      };
    } else {
      const totalBalance = filteredEntities.reduce((sum, l) =>
        sum + (parseFloat(l.current_balance || 0)), 0);
      return { selected: selectedItems.length, total: filteredEntities.length, totalBalance, groups };
    }
  }, [currentView, filteredEntities, groupedEntities, selection]);

  // Table headers
  const renderTableHeaders = () => {
    const headerClass = "flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors";

    if (currentView === 'accounts') {
      return (
        <>
          <th className="px-4 py-3 text-left"><button onClick={() => handleSort('account_name')} className={headerClass}>Account <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-left"><button onClick={() => handleSort('institution')} className={headerClass}>Institution <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-left"><button onClick={() => handleSort('type')} className={headerClass}>Type <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-right"><button onClick={() => handleSort('totalValue')} className={`${headerClass} justify-end`}>Balance <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
        </>
      );
    } else if (currentView === 'positions') {
      return (
        <>
          <th className="px-4 py-3 text-left"><button onClick={() => handleSort('identifier')} className={headerClass}>Asset <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-left"><button onClick={() => handleSort('account_name')} className={headerClass}>Account <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-right"><button onClick={() => handleSort('quantity')} className={`${headerClass} justify-end`}>Qty <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-right"><button onClick={() => handleSort('current_value')} className={`${headerClass} justify-end`}>Value <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-right"><button onClick={() => handleSort('gain_loss_amt')} className={`${headerClass} justify-end`}>Gain/Loss <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
        </>
      );
    } else {
      return (
        <>
          <th className="px-4 py-3 text-left"><button onClick={() => handleSort('name')} className={headerClass}>Liability <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-right"><button onClick={() => handleSort('current_balance')} className={`${headerClass} justify-end`}>Balance <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-right"><button onClick={() => handleSort('interest_rate')} className={`${headerClass} justify-end`}>Rate <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
          <th className="px-4 py-3 text-right"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min Payment</span></th>
          <th className="px-4 py-3 text-left"><button onClick={() => handleSort('due_date')} className={headerClass}>Due Date <ArrowUpDown className="w-3 h-3 ml-1" /></button></th>
        </>
      );
    }
  };

  // Render grouped tables
  const renderGroupedTables = () => {
    if (Object.keys(groupedEntities).length === 0) {
      const EmptyIcon = config.emptyIcon;
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-64"
        >
          <div className="p-4 bg-gray-800/50 rounded-2xl mb-4">
            <EmptyIcon className="w-12 h-12 text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg font-medium">{config.emptyText}</p>
          <p className="text-gray-500 text-sm mt-1">
            {hasActiveFilters ? 'Try adjusting your filters' : `Add ${currentView} to get started`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </motion.div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(groupedEntities).map(([groupName, items], groupIdx) => (
          <motion.div
            key={groupName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.05 }}
            className="bg-gray-900/70 rounded-xl border border-gray-800 overflow-hidden"
          >
            {/* Group header */}
            <div className="bg-gray-800/50 px-4 py-2.5 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200">{groupName}</h3>
                <span className="px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-700/50 rounded-full">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/30">
                  <tr>
                    <th className="w-12 px-4 py-2.5">
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
                        className="w-4 h-4 text-indigo-500 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500/20 focus:ring-offset-0"
                      />
                    </th>
                    {renderTableHeaders()}
                    <th className="px-4 py-2.5 text-right">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
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

            {/* Group footer */}
            <div className="bg-gray-800/30 px-4 py-2 border-t border-gray-700/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">{items.length} items</span>
                <span className="font-medium text-gray-300">
                  {showValues ? formatCurrency(
                    currentView === 'accounts'
                      ? items.reduce((sum, acc) => sum + (acc.totalValue || 0), 0)
                      : currentView === 'positions'
                        ? items.reduce((sum, pos) => sum + (pos.current_value || 0), 0)
                        : items.reduce((sum, liab) => sum + (liab.current_balance || 0), 0)
                  ) : '••••'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Render edit form
  const renderEditForm = () => {
    if (!editingItem) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="bg-gray-900/70 rounded-xl border border-gray-700 p-6"
      >
        {editingType === 'account' && (
          <EditAccountForm account={editingItem} onSave={onSave} onCancel={onCancelEdit} />
        )}
        {editingType === 'position' && (
          <EditPositionForm position={editingItem} assetType={editingItem.asset_type} onSave={onSave} onCancel={onCancelEdit} accounts={accounts} />
        )}
        {editingType === 'liability' && (
          <EditLiabilityForm liability={editingItem} onSave={onSave} onCancel={onCancelEdit} />
        )}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar - now at the top */}
      <StatsBar stats={stats} currentView={currentView} showValues={showValues} />

      {/* Search and filters bar */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <div className="px-6 py-3 bg-gray-900/50">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentView}...`}
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>

            <div className="h-6 w-px bg-gray-700" />

            {/* Grouping */}
            <EnhancedDropdown
              title="Group By"
              options={groupingOptions}
              selectedOption={groupBy}
              onChange={setGroupBy}
              icon={Grid3x3}
            />

            <div className="h-6 w-px bg-gray-700" />

            {/* Filters */}
            {currentView === 'accounts' && (
              <>
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
              </>
            )}

            {currentView === 'positions' && (
              <>
                <AssetTypeFilter
                  positions={filteredEntities}
                  selectedAssetTypes={selectedAssetTypes}
                  setSelectedAssetTypes={setSelectedAssetTypes}
                />
                <FilterDropdown
                  title="Accounts"
                  icon={Wallet}
                  options={accountFilterOptions}
                  selected={selectedAccountFilter}
                  onChange={setSelectedAccountFilter}
                />
              </>
            )}

            {currentView === 'liabilities' && (
              <LiabilityTypeFilter
                liabilities={filteredEntities}
                selectedLiabilityTypes={selectedLiabilityTypes}
                setSelectedLiabilityTypes={setSelectedLiabilityTypes}
              />
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                <FilterX className="w-3 h-3 mr-1.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} currentView={currentView} showValues={showValues} />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64"
            >
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Loading {currentView}...</p>
            </motion.div>
          ) : editingItem ? (
            renderEditForm()
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {renderGroupedTables()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selection action bar */}
      <AnimatePresence>
        {stats.selected > 0 && !editingItem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex-shrink-0 px-6 py-3 bg-indigo-500/10 border-t border-indigo-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                    <Check className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-indigo-300">
                    {stats.selected} selected
                  </span>
                </div>

                {showValues && currentView === 'positions' && (
                  <div className="text-sm text-gray-400">
                    Value: <span className="text-white font-medium">{formatCurrency(
                      filteredEntities
                        .filter(item => selection.isSelected(item.id))
                        .reduce((sum, pos) => sum + (pos.current_value || 0), 0)
                    )}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onExport}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
                </button>

                <button
                  onClick={onDeleteSelected}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1.5" />
                  )}
                  Delete
                </button>

                <button
                  onClick={() => selection.clearSelection()}
                  className="px-3 py-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EntityManager;
