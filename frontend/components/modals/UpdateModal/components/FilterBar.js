// Filter Bar Component for Update Modal
import React from 'react';
import { motion } from 'framer-motion';
import {
  Search, X, Eye, EyeOff, RefreshCw, Filter, FilterX,
  Banknote, CreditCard, Package, ArrowUpDown, Grid3x3
} from 'lucide-react';
import { SORT_OPTIONS, GROUPING_OPTIONS } from '../config';

/**
 * Toggle button for type filters
 */
const TypeToggle = ({ icon: Icon, label, active, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`
      inline-flex items-center gap-1.5 px-2.5 py-1.5
      text-xs font-medium rounded-lg border
      transition-all duration-150
      ${active
        ? `${colorClass} border-current/30`
        : 'text-gray-500 bg-gray-800/50 border-gray-700 hover:text-gray-300 hover:border-gray-600'
      }
    `}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

/**
 * Dropdown selector component
 */
const DropdownSelect = ({ icon: Icon, value, options, onChange, label }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        appearance-none pl-8 pr-8 py-1.5
        text-xs font-medium text-gray-300
        bg-gray-800 border border-gray-700 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
        cursor-pointer transition-colors duration-150
        hover:border-gray-600
      "
      aria-label={label}
    >
      {options.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
    <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
      <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

/**
 * Filter bar with search, type filters, sort, and grouping
 */
const FilterBar = ({
  // Type filters
  showCash,
  setShowCash,
  showLiabilities,
  setShowLiabilities,
  showOther,
  setShowOther,

  // Advanced filters
  hideZeros,
  setHideZeros,
  onlyChanged,
  setOnlyChanged,
  searchQuery,
  setSearchQuery,

  // Sort
  sortBy,
  setSortBy,
  sortDir,
  toggleSort,

  // Group
  groupBy,
  setGroupBy,

  // Display
  showValues,
  setShowValues,

  // Actions
  hasActiveFilters,
  clearFilters,
  onRefresh,
  isLoading
}) => {
  return (
    <div className="flex flex-col gap-3 px-6 py-3 bg-gray-900/50 border-b border-gray-800/50">
      {/* Top row: Search and main actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, institution..."
            className="
              w-full pl-9 pr-8 py-2 text-sm
              bg-gray-800 text-white placeholder-gray-500
              border border-gray-700 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
              transition-all duration-150
            "
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Type toggles */}
        <div className="flex items-center gap-1.5">
          <TypeToggle
            icon={Banknote}
            label="Cash"
            active={showCash}
            onClick={() => setShowCash(!showCash)}
            colorClass="text-emerald-400 bg-emerald-500/10"
          />
          <TypeToggle
            icon={CreditCard}
            label="Liabilities"
            active={showLiabilities}
            onClick={() => setShowLiabilities(!showLiabilities)}
            colorClass="text-rose-400 bg-rose-500/10"
          />
          <TypeToggle
            icon={Package}
            label="Other"
            active={showOther}
            onClick={() => setShowOther(!showOther)}
            colorClass="text-violet-400 bg-violet-500/10"
          />
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Sort dropdown */}
        <DropdownSelect
          icon={ArrowUpDown}
          value={sortBy}
          options={SORT_OPTIONS}
          onChange={setSortBy}
          label="Sort by"
        />

        {/* Sort direction toggle */}
        <button
          onClick={() => toggleSort(sortBy)}
          className={`
            p-1.5 rounded-lg border transition-colors duration-150
            ${sortDir === 'asc'
              ? 'text-gray-400 bg-gray-800 border-gray-700 hover:text-gray-200'
              : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
            }
          `}
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >
          <ArrowUpDown className={`w-4 h-4 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
        </button>

        {/* Group dropdown */}
        <DropdownSelect
          icon={Grid3x3}
          value={groupBy}
          options={GROUPING_OPTIONS}
          onChange={setGroupBy}
          label="Group by"
        />

        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Privacy toggle */}
          <button
            onClick={() => setShowValues(!showValues)}
            className={`
              p-2 rounded-lg border transition-all duration-150
              ${showValues
                ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                : 'text-gray-400 bg-gray-800 border-gray-700 hover:text-gray-200'
              }
            `}
            title={showValues ? 'Hide values' : 'Show values'}
          >
            {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="
              p-2 rounded-lg border border-gray-700
              text-gray-400 bg-gray-800
              hover:text-gray-200 hover:border-gray-600
              transition-colors duration-150
              disabled:opacity-50
            "
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bottom row: Advanced filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-500">Filters:</span>
        </div>

        <label className="inline-flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-200">
          <input
            type="checkbox"
            checked={hideZeros}
            onChange={(e) => setHideZeros(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500/20"
          />
          Hide zeros
        </label>

        <label className="inline-flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-200">
          <input
            type="checkbox"
            checked={onlyChanged}
            onChange={(e) => setOnlyChanged(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500/20"
          />
          Only changed
        </label>

        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearFilters}
            className="
              inline-flex items-center gap-1 px-2 py-1
              text-xs font-medium text-gray-400
              bg-gray-800 hover:bg-gray-700
              border border-gray-700 rounded-lg
              transition-colors duration-150
            "
          >
            <FilterX className="w-3 h-3" />
            Clear all
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
