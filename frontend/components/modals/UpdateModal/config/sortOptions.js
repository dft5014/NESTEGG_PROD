// Sort and filter configuration for the Update Modal
import {
  Building2, ArrowUpDown, Clock, DollarSign, Percent, Tag
} from 'lucide-react';

/**
 * Sort options for the update table
 */
export const SORT_OPTIONS = [
  {
    id: 'institution',
    name: 'Institution',
    icon: Building2,
    sortFn: (a, b, dir) => {
      const instA = (a.institution || '').toLowerCase();
      const instB = (b.institution || '').toLowerCase();
      return dir === 'asc'
        ? instA.localeCompare(instB)
        : instB.localeCompare(instA);
    }
  },
  {
    id: 'name',
    name: 'Name',
    icon: Tag,
    sortFn: (a, b, dir) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return dir === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }
  },
  {
    id: 'value',
    name: 'Value',
    icon: DollarSign,
    sortFn: (a, b, dir) => {
      const valA = Math.abs(a.currentValue || 0);
      const valB = Math.abs(b.currentValue || 0);
      return dir === 'asc' ? valA - valB : valB - valA;
    }
  },
  {
    id: 'delta',
    name: 'Change ($)',
    icon: ArrowUpDown,
    sortFn: (a, b, dir, drafts) => {
      const getDelta = (item) => {
        const draft = drafts?.[item._key];
        if (draft == null) return 0;
        return draft - item.currentValue;
      };
      const deltaA = getDelta(a);
      const deltaB = getDelta(b);
      return dir === 'asc' ? deltaA - deltaB : deltaB - deltaA;
    }
  },
  {
    id: 'pct',
    name: 'Change (%)',
    icon: Percent,
    sortFn: (a, b, dir, drafts) => {
      const getPct = (item) => {
        const draft = drafts?.[item._key];
        if (draft == null || item.currentValue === 0) return 0;
        return ((draft - item.currentValue) / Math.abs(item.currentValue)) * 100;
      };
      const pctA = getPct(a);
      const pctB = getPct(b);
      return dir === 'asc' ? pctA - pctB : pctB - pctA;
    }
  },
  {
    id: 'updated',
    name: 'Last Updated',
    icon: Clock,
    sortFn: (a, b, dir) => {
      const getTime = (item) => {
        const ts = item.lastUpdate || item.last_update;
        if (!ts) return dir === 'asc' ? Infinity : -Infinity;
        const d = new Date(ts);
        return isNaN(d.getTime()) ? (dir === 'asc' ? Infinity : -Infinity) : d.getTime();
      };
      const timeA = getTime(a);
      const timeB = getTime(b);
      return dir === 'asc' ? timeA - timeB : timeB - timeA;
    }
  },
  {
    id: 'type',
    name: 'Type',
    icon: Tag,
    sortFn: (a, b, dir) => {
      const typeA = (a._kind || '').toLowerCase();
      const typeB = (b._kind || '').toLowerCase();
      return dir === 'asc'
        ? typeA.localeCompare(typeB)
        : typeB.localeCompare(typeA);
    }
  }
];

/**
 * Filter visibility options
 */
export const FILTER_OPTIONS = {
  showCash: { id: 'showCash', label: 'Cash/Checking', default: true },
  showLiabilities: { id: 'showLiabilities', label: 'Liabilities', default: true },
  showOther: { id: 'showOther', label: 'Other Assets', default: true },
  hideZeros: { id: 'hideZeros', label: 'Hide Zero Balances', default: false },
  onlyChanged: { id: 'onlyChanged', label: 'Only Changed', default: false }
};

/**
 * Grouping options for the update table
 */
export const GROUPING_OPTIONS = [
  { id: 'none', name: 'No Grouping' },
  { id: 'institution', name: 'By Institution' },
  { id: 'type', name: 'By Type' },
  { id: 'account', name: 'By Account' }
];

/**
 * Get sort function by ID
 */
export const getSortFn = (sortId) => {
  const option = SORT_OPTIONS.find(o => o.id === sortId);
  return option?.sortFn || SORT_OPTIONS[0].sortFn;
};

export default SORT_OPTIONS;
