// Hook for filtering and sorting in the Update Modal
import { useState, useMemo, useCallback } from 'react';
import { getSortFn } from '../config';

/**
 * Hook for filtering and sorting update rows
 */
export const useUpdateFiltering = (rows, drafts = {}) => {
  // Filter state
  const [showCash, setShowCash] = useState(true);
  const [showLiabilities, setShowLiabilities] = useState(true);
  const [showOther, setShowOther] = useState(true);
  const [hideZeros, setHideZeros] = useState(false);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  // Sort state
  const [sortBy, setSortBy] = useState('institution');
  const [sortDir, setSortDir] = useState('asc');

  // Group state
  const [groupBy, setGroupBy] = useState('institution');

  // Toggle sort
  const toggleSort = useCallback((key) => {
    if (sortBy === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }, [sortBy]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setShowCash(true);
    setShowLiabilities(true);
    setShowOther(true);
    setHideZeros(false);
    setOnlyChanged(false);
    setSearchQuery('');
    setSelectedInstitution(null);
  }, []);

  // Has active filters
  const hasActiveFilters = useMemo(() => {
    return !showCash || !showLiabilities || !showOther ||
           hideZeros || onlyChanged ||
           searchQuery.length > 0 || selectedInstitution !== null;
  }, [showCash, showLiabilities, showOther, hideZeros, onlyChanged, searchQuery, selectedInstitution]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let list = [...rows];

    // Type filters
    if (!showCash) list = list.filter(r => r._kind !== 'cash');
    if (!showLiabilities) list = list.filter(r => r._kind !== 'liability');
    if (!showOther) list = list.filter(r => r._kind !== 'other');

    // Institution filter
    if (selectedInstitution) {
      list = list.filter(r => r.institution === selectedInstitution);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.identifier || '').toLowerCase().includes(q) ||
        (r.institution || '').toLowerCase().includes(q) ||
        (r.sub || '').toLowerCase().includes(q)
      );
    }

    // Compute deltas for each row
    list = list.map(r => {
      const draft = drafts[r._key];
      const stmt = draft != null ? Number(draft) : r.currentValue;
      const diff = stmt - r.currentValue;
      const pct = r.currentValue !== 0
        ? (diff / Math.abs(r.currentValue)) * 100
        : (stmt !== 0 ? 100 : 0);
      const hasChanged = stmt !== r.currentValue;

      return { ...r, stmt, diff, pct, hasChanged };
    });

    // Hide zeros filter
    if (hideZeros) {
      list = list.filter(r => !(r.currentValue === 0 && drafts[r._key] == null));
    }

    // Only changed filter
    if (onlyChanged) {
      list = list.filter(r => r.hasChanged);
    }

    // Sort
    const sortFn = getSortFn(sortBy);
    if (sortFn) {
      list.sort((a, b) => sortFn(a, b, sortDir, drafts));
    }

    return list;
  }, [rows, showCash, showLiabilities, showOther, selectedInstitution,
      searchQuery, hideZeros, onlyChanged, drafts, sortBy, sortDir]);

  // Group rows
  const groupedRows = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Items': filteredRows };
    }

    const groups = {};

    filteredRows.forEach(row => {
      let groupKey;

      switch (groupBy) {
        case 'institution':
          groupKey = row.institution || 'Unknown';
          break;
        case 'type':
          groupKey = row._kind === 'cash' ? 'Cash' :
                     row._kind === 'liability' ? 'Liabilities' : 'Other Assets';
          break;
        case 'account':
          groupKey = row.sub || row.institution || 'Unknown Account';
          break;
        default:
          groupKey = 'All Items';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    // Sort groups by total value
    const sortedEntries = Object.entries(groups).sort(([, a], [, b]) => {
      const totalA = a.reduce((sum, r) => sum + Math.abs(r.currentValue), 0);
      const totalB = b.reduce((sum, r) => sum + Math.abs(r.currentValue), 0);
      return totalB - totalA;
    });

    return Object.fromEntries(sortedEntries);
  }, [filteredRows, groupBy]);

  // Stats
  const stats = useMemo(() => {
    let cash = 0, liab = 0, other = 0, changed = 0, delta = 0;

    for (const r of filteredRows) {
      if (r._kind === 'cash') cash += r.currentValue;
      else if (r._kind === 'liability') liab += r.currentValue;
      else other += r.currentValue;

      if (r.hasChanged) {
        changed++;
        delta += r.diff;
      }
    }

    return {
      totalCount: filteredRows.length,
      cash,
      liabilities: liab,
      other,
      net: cash + other - liab,
      changedCount: changed,
      delta
    };
  }, [filteredRows]);

  return {
    // Filtered/sorted data
    filteredRows,
    groupedRows,
    stats,

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
    selectedInstitution,
    setSelectedInstitution,

    // Sorting
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    toggleSort,

    // Grouping
    groupBy,
    setGroupBy,

    // Utilities
    hasActiveFilters,
    clearFilters
  };
};

export default useUpdateFiltering;
