// Data Table Component for QuickStart Modal
// Reusable inline-editable table with keyboard navigation
import React, { useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { SecuritySearchInput, InstitutionSearchInput } from './SearchableInput';
import { formatCurrency } from '@/utils/formatters';

// Row animation variants
const rowVariants = {
  initial: { opacity: 0, y: -10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: -20, scale: 0.95 }
};

export default function DataTable({
  fields,
  rows,
  selectedIds = new Set(),
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleSelect,
  onSelectAll,
  accounts = [],
  recentAccountIds = [],
  searchResults = {},
  isSearching = {},
  onSearch,
  onSelectSearchResult,
  institutions = [],
  liabilityTypes = [],
  accountCategories = [],
  accountTypesByCategory = {},
  showCheckboxes = true,
  showActions = true,
  showStatus = true,
  showRowNumbers = true,
  emptyMessage = 'No items yet. Click the button above to add one.',
  className = ''
}) {
  const cellRefs = useRef({});

  // Check if all visible rows are selected
  const allSelected = rows.length > 0 && rows.every(row => selectedIds.has(row.id));
  const someSelected = rows.some(row => selectedIds.has(row.id));

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e, rowId, fieldIndex, rowIndex) => {
    const field = fields[fieldIndex];
    if (!field) return;

    switch (e.key) {
      case 'Tab':
        // Let default tab behavior work
        break;

      case 'Enter':
        if (!e.shiftKey && fieldIndex === fields.length - 1) {
          // On last field, could trigger add new row
          // Parent component handles this via onAddRow prop
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (e.altKey && onDuplicate) {
          // Move row down - not implemented here, parent handles
        } else if (rowIndex < rows.length - 1) {
          const nextRow = rows[rowIndex + 1];
          const nextKey = `${nextRow.id}-${field.key}`;
          cellRefs.current[nextKey]?.focus();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          const prevRow = rows[rowIndex - 1];
          const prevKey = `${prevRow.id}-${field.key}`;
          cellRefs.current[prevKey]?.focus();
        }
        break;

      case 'Delete':
        if ((e.ctrlKey || e.metaKey) && onDelete) {
          e.preventDefault();
          onDelete(rowId);
        }
        break;

      case 'd':
        if ((e.ctrlKey || e.metaKey) && onDuplicate) {
          e.preventDefault();
          onDuplicate(rowId);
        }
        break;
    }
  }, [fields, rows, onDelete, onDuplicate]);

  // Render cell based on field type
  const renderCell = useCallback((row, field, rowIndex) => {
    const rowId = row.id;
    const value = row.data?.[field.key] ?? row[field.key] ?? '';
    const cellKey = `${rowId}-${field.key}`;
    const error = row.errors?.[field.key];

    // Common input classes
    const inputClass = `
      w-full px-2 py-1.5 text-sm bg-gray-800 border rounded
      transition-all duration-200
      ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-gray-700 focus:border-blue-500'}
      ${field.readOnly ? 'opacity-60 cursor-not-allowed bg-gray-800/50' : ''}
      focus:ring-2 focus:ring-blue-500/20 focus:outline-none
      text-white placeholder-gray-500
    `;

    // Handle update
    const handleChange = (newValue) => {
      if (field.transform === 'uppercase') {
        newValue = String(newValue).toUpperCase();
      }
      onUpdate(rowId, { [field.key]: newValue });
    };

    switch (field.type) {
      case 'text':
        if (field.searchable) {
          return (
            <SecuritySearchInput
              value={value}
              onChange={(val) => {
                handleChange(val);
                if (onSearch && val.length >= 1) {
                  onSearch(rowId, field.key, val);
                }
              }}
              onSelect={(result) => onSelectSearchResult?.(rowId, result)}
              searchResults={searchResults[rowId] || []}
              isSearching={isSearching[rowId] || false}
              placeholder={field.placeholder || field.label}
              disabled={field.readOnly}
              className={field.width || 'w-full'}
            />
          );
        }
        return (
          <input
            ref={el => cellRefs.current[cellKey] = el}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            placeholder={field.placeholder || field.label}
            readOnly={field.readOnly}
            className={`${inputClass} ${field.width || 'w-full'}`}
          />
        );

      case 'number':
        return (
          <input
            ref={el => cellRefs.current[cellKey] = el}
            type="number"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            placeholder={field.placeholder || '0'}
            readOnly={field.readOnly}
            min={field.min}
            max={field.max}
            step={field.step || 'any'}
            className={`${inputClass} ${field.width || 'w-24'}`}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              ref={el => cellRefs.current[cellKey] = el}
              type="number"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
              placeholder="0.00"
              readOnly={field.readOnly}
              step="0.01"
              min="0"
              className={`${inputClass} pl-6 ${field.width || 'w-28'}`}
            />
          </div>
        );

      case 'percent':
        return (
          <div className="relative">
            <input
              ref={el => cellRefs.current[cellKey] = el}
              type="number"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
              placeholder="0.0"
              readOnly={field.readOnly}
              step="0.1"
              min="0"
              max="100"
              className={`${inputClass} pr-6 ${field.width || 'w-24'}`}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
          </div>
        );

      case 'date':
        return (
          <input
            ref={el => cellRefs.current[cellKey] = el}
            type="date"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            readOnly={field.readOnly}
            className={`${inputClass} ${field.width || 'w-36'}`}
          />
        );

      case 'select':
        return (
          <select
            ref={el => cellRefs.current[cellKey] = el}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            disabled={field.readOnly || field.disabled}
            className={`${inputClass} cursor-pointer ${field.width || 'w-36'} [&>option]:bg-gray-800 [&>option]:text-white`}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'account': {
        const recentAccounts = accounts.filter(acc => recentAccountIds.includes(acc.id));
        const otherAccounts = accounts.filter(acc => !recentAccountIds.includes(acc.id));

        return (
          <select
            ref={el => cellRefs.current[cellKey] = el}
            value={value}
            onChange={(e) => handleChange(parseInt(e.target.value) || '')}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            className={`${inputClass} cursor-pointer ${field.width || 'w-48'} [&>option]:bg-gray-800 [&>option]:text-white [&>optgroup]:bg-gray-900 [&>optgroup]:text-gray-400`}
          >
            <option value="">Select account...</option>
            {recentAccounts.length > 0 && (
              <optgroup label="⭐ Recent">
                {recentAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name || acc.name} {acc.institution ? `(${acc.institution})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {otherAccounts.length > 0 && (
              <optgroup label={recentAccounts.length > 0 ? "All Accounts" : "Accounts"}>
                {otherAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name || acc.name} {acc.institution ? `(${acc.institution})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        );
      }

      case 'institution':
        return (
          <InstitutionSearchInput
            value={value}
            onChange={handleChange}
            institutions={institutions}
            placeholder={field.placeholder || 'Search institution...'}
            className={field.width || 'w-44'}
          />
        );

      case 'liabilityType':
        return (
          <select
            ref={el => cellRefs.current[cellKey] = el}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            className={`${inputClass} cursor-pointer ${field.width || 'w-36'} [&>option]:bg-gray-800 [&>option]:text-white`}
          >
            <option value="">Select type...</option>
            {liabilityTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        );

      case 'accountCategory':
        return (
          <select
            ref={el => cellRefs.current[cellKey] = el}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            className={`${inputClass} cursor-pointer ${field.width || 'w-40'} [&>option]:bg-gray-800 [&>option]:text-white`}
          >
            <option value="">Select category...</option>
            {accountCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        );

      case 'accountType':
        const category = row.data?.accountCategory || row.accountCategory;
        const typeOptions = accountTypesByCategory[category] || [];
        return (
          <select
            ref={el => cellRefs.current[cellKey] = el}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            disabled={!category}
            className={`${inputClass} cursor-pointer ${field.width || 'w-40'} disabled:opacity-50 [&>option]:bg-gray-800 [&>option]:text-white`}
          >
            <option value="">{category ? 'Select type...' : 'Category first'}</option>
            {typeOptions.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            ref={el => cellRefs.current[cellKey] = el}
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowId, fields.indexOf(field), rowIndex)}
            placeholder={field.placeholder || ''}
            readOnly={field.readOnly}
            className={`${inputClass} ${field.width || 'w-full'}`}
          />
        );
    }
  }, [
    fields, onUpdate, accounts, institutions, liabilityTypes,
    accountCategories, accountTypesByCategory, searchResults,
    isSearching, onSearch, onSelectSearchResult, handleKeyDown
  ]);

  // Get row status
  const getRowStatus = (row) => {
    return row.status || 'draft';
  };

  // Get row border color based on status
  const getRowBorderClass = (row) => {
    const status = getRowStatus(row);
    const isNew = row.isNew;

    if (isNew) return 'border-blue-500/50 ring-1 ring-blue-500/20';
    if (status === 'ready') return 'border-emerald-500/30';
    if (status === 'added') return 'border-indigo-500/30';
    if (status === 'error') return 'border-rose-500/30';
    return 'border-gray-700';
  };

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          {showRowNumbers && (
            <div className="w-8 flex-shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
              #
            </div>
          )}
          {showCheckboxes && (
            <div className="w-8 flex-shrink-0">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={() => onSelectAll?.(!allSelected)}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500/20"
              />
            </div>
          )}
          {fields.map(field => (
            <div
              key={field.key}
              className={`text-xs font-semibold text-gray-400 uppercase tracking-wider ${field.width || 'flex-1'}`}
            >
              {field.label}
              {field.required && <span className="text-rose-400 ml-0.5">*</span>}
            </div>
          ))}
          {showStatus && (
            <div className="w-20 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Status
            </div>
          )}
          {showActions && (
            <div className="w-20 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">
              Actions
            </div>
          )}
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-800">
        <AnimatePresence mode="popLayout">
          {rows.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-12 text-center"
            >
              <p className="text-gray-500">{emptyMessage}</p>
            </motion.div>
          ) : (
            rows.map((row, rowIndex) => (
              <motion.div
                key={row.id}
                variants={rowVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className={`
                  px-4 py-2 flex items-center gap-3
                  border-l-2 ${getRowBorderClass(row)}
                  hover:bg-gray-800/30 transition-colors
                `}
              >
                {/* Row Number */}
                {showRowNumbers && (
                  <div className="w-8 flex-shrink-0 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs font-medium text-gray-400 border border-gray-700">
                      {rowIndex + 1}
                    </span>
                  </div>
                )}

                {/* Checkbox */}
                {showCheckboxes && (
                  <div className="w-8 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => onToggleSelect?.(row.id)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                {/* Fields */}
                {fields.map(field => (
                  <div key={field.key} className={field.width || 'flex-1'}>
                    {renderCell(row, field, rowIndex)}
                  </div>
                ))}

                {/* Status */}
                {showStatus && (
                  <div className="w-20">
                    <StatusBadge status={getRowStatus(row)} size="xs" />
                  </div>
                )}

                {/* Actions */}
                {showActions && (
                  <div className="w-20 flex items-center justify-center space-x-1">
                    {onDuplicate && (
                      <button
                        onClick={() => onDuplicate(row.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                        title="Duplicate (Ctrl+D)"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                        title="Delete (Ctrl+Delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Collapsible section wrapper for position types
export function CollapsibleSection({
  title,
  icon: Icon,
  count = 0,
  totalCount,  // Optional: for showing filtered count (e.g., "3 of 10")
  value = 0,
  isExpanded,
  onToggle,
  color = 'blue',
  children
}) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    green: 'text-green-400 bg-green-500/10'
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-800 hover:bg-gray-800/80 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {Icon && <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[0]}`} />}
          <span className="font-semibold text-white">{title}</span>
          {count > 0 && (
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${colorClasses[color]}`}>
              {totalCount ? `${count}/${totalCount}` : count}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {count > 0 && value > 0 && (
            <span className="text-sm text-gray-400">
              {formatCurrency(value)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
