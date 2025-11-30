import {
  List, Building2, Wallet, Grid3x3, BarChart2, PieChart, CreditCard
} from 'lucide-react';

/**
 * Grouping options for accounts view
 */
export const ACCOUNT_GROUPING_OPTIONS = [
  { id: 'none', name: 'No Grouping', icon: List },
  { id: 'institution', name: 'By Institution', icon: Building2 },
  { id: 'category', name: 'By Category', icon: PieChart }
];

/**
 * Grouping options for positions view
 */
export const POSITION_GROUPING_OPTIONS = [
  { id: 'asset_type', name: 'By Asset Type', icon: BarChart2 },
  { id: 'account', name: 'By Account', icon: Wallet },
  { id: 'institution', name: 'By Institution', icon: Building2 },
  { id: 'account_institution', name: 'By Account & Institution', icon: Grid3x3 }
];

/**
 * Grouping options for liabilities view
 */
export const LIABILITY_GROUPING_OPTIONS = [
  { id: 'none', name: 'No Grouping', icon: List },
  { id: 'liability_type', name: 'By Type', icon: CreditCard }
];

/**
 * Get grouping options for a specific view
 */
export const getGroupingOptionsForView = (view) => {
  switch (view) {
    case 'accounts':
      return ACCOUNT_GROUPING_OPTIONS;
    case 'positions':
      return POSITION_GROUPING_OPTIONS;
    case 'liabilities':
      return LIABILITY_GROUPING_OPTIONS;
    default:
      return [];
  }
};

/**
 * Get default grouping for a view
 */
export const getDefaultGrouping = (view) => {
  switch (view) {
    case 'accounts':
      return 'none';
    case 'positions':
      return 'asset_type';
    case 'liabilities':
      return 'none';
    default:
      return 'none';
  }
};
