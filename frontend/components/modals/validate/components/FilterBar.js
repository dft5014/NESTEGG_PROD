// FilterBar - Search, filter, and action controls
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ChevronDown, ChevronRight, Download, Upload,
  RefreshCw, Eye, EyeOff, ArrowUpDown, BarChart3, Loader2,
  Building2, CheckCircle, AlertTriangle, Clock, Shield,
  X, FileSpreadsheet
} from 'lucide-react';
import { FILTER_OPTIONS, SORT_OPTIONS } from '../utils/constants';

// Dropdown menu component
function Dropdown({ trigger, children, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute top-full mt-2 z-50
              ${align === 'right' ? 'right-0' : 'left-0'}
              bg-gray-900 border border-gray-700 rounded-xl shadow-xl
              min-w-[200px] py-2
            `}
          >
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Filter button with icon
function FilterButton({ active, icon: Icon, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-200
        ${active
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`
          px-1.5 py-0.5 rounded-full text-xs
          ${active ? 'bg-white/20' : 'bg-gray-700'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

// Main FilterBar component
export default function FilterBar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  hideValues,
  onToggleHideValues,
  onExpandAll,
  onCollapseAll,
  onExport,
  onImportCSV,
  onRefresh,
  isLoading,
  filterCounts = {},
  className = ''
}) {
  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCSV(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onImportCSV]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Row - Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search institutions... (Cmd+K)"
            className="
              w-full pl-10 pr-4 py-2.5 rounded-lg border
              bg-gray-800 border-gray-700 text-white placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
              text-sm
            "
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Expand/Collapse */}
          <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={onExpandAll}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              title="Expand all"
            >
              <ChevronDown className="w-4 h-4" />
              <span className="hidden sm:inline">Expand</span>
            </button>
            <div className="w-px h-6 bg-gray-700" />
            <button
              onClick={onCollapseAll}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              title="Collapse all"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline">Collapse</span>
            </button>
          </div>

          {/* Hide Values Toggle */}
          <button
            onClick={onToggleHideValues}
            className={`
              p-2.5 rounded-lg border transition-colors
              ${hideValues
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
            title={hideValues ? 'Show values' : 'Hide values'}
          >
            {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Import CSV */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="
              px-3 py-2.5 rounded-lg border text-sm font-medium
              bg-emerald-600/10 border-emerald-500/30 text-emerald-400
              hover:bg-emerald-600/20 transition-colors
              flex items-center gap-2
            "
            title="Import statement balances from CSV"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Export */}
          <button
            onClick={onExport}
            className="
              px-3 py-2.5 rounded-lg border text-sm font-medium
              bg-indigo-600/10 border-indigo-500/30 text-indigo-400
              hover:bg-indigo-600/20 transition-colors
              flex items-center gap-2
            "
            title="Export to CSV (Cmd+E)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="
              p-2.5 rounded-lg border text-sm font-medium
              bg-gray-800 border-gray-700 text-gray-400
              hover:text-white hover:bg-gray-700 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Refresh accounts"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Row - Filter Pills */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterButton
            active={filter === 'all'}
            icon={Building2}
            label="All"
            count={filterCounts.all}
            onClick={() => onFilterChange('all')}
          />
          <FilterButton
            active={filter === 'pending'}
            icon={Clock}
            label="Pending"
            count={filterCounts.pending}
            onClick={() => onFilterChange('pending')}
          />
          <FilterButton
            active={filter === 'matched'}
            icon={CheckCircle}
            label="Matched"
            count={filterCounts.matched}
            onClick={() => onFilterChange('matched')}
          />
          <FilterButton
            active={filter === 'discrepancy'}
            icon={AlertTriangle}
            label="Discrepancies"
            count={filterCounts.discrepancy}
            onClick={() => onFilterChange('discrepancy')}
          />
          <FilterButton
            active={filter === 'reconciled'}
            icon={Shield}
            label="Reconciled"
            count={filterCounts.reconciled}
            onClick={() => onFilterChange('reconciled')}
          />
        </div>

        {/* Sort Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors">
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">Sort</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          }
        >
          {(close) => (
            <div className="py-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={`${option.field}-${option.direction}`}
                  onClick={() => {
                    onSortChange({ field: option.field, direction: option.direction });
                    close();
                  }}
                  className={`
                    w-full text-left px-4 py-2 text-sm
                    ${sort.field === option.field && sort.direction === option.direction
                      ? 'bg-indigo-600/20 text-indigo-400'
                      : 'text-gray-300 hover:bg-gray-800'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </Dropdown>
      </div>
    </div>
  );
}

// Quick tip banner component
export function QuickTipBanner({ onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
    >
      <FileSpreadsheet className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-indigo-300 mb-1">Quick Workflow Tip</p>
        <p className="text-xs text-indigo-400/80">
          Export your accounts to CSV, fill in statement balances in Excel, then import back to populate all balances at once.
          Or click the import icon on any account to validate against a brokerage statement.
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-indigo-400/60 hover:text-indigo-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
