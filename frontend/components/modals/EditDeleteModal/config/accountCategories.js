import { Briefcase, Building, DollarSign, Hash, Shield } from 'lucide-react';

/**
 * Account categories configuration
 */
export const ACCOUNT_CATEGORIES = [
  { id: 'brokerage', name: 'Brokerage', icon: Briefcase, color: 'blue' },
  { id: 'retirement', name: 'Retirement', icon: Building, color: 'indigo' },
  { id: 'cash', name: 'Cash / Banking', icon: DollarSign, color: 'green' },
  { id: 'cryptocurrency', name: 'Cryptocurrency', icon: Hash, color: 'orange' },
  { id: 'metals', name: 'Metals Storage', icon: Shield, color: 'yellow' }
];

/**
 * Account types by category
 */
export const ACCOUNT_TYPES_BY_CATEGORY = {
  brokerage: ['Individual', 'Joint', 'Custodial', 'Trust', 'Other Brokerage'],
  retirement: [
    'Traditional IRA', 'Roth IRA', '401(k)', 'Roth 401(k)',
    'SEP IRA', 'SIMPLE IRA', '403(b)', 'Pension', 'HSA', 'Other Retirement'
  ],
  cash: [
    'Checking', 'Savings', 'High Yield Savings',
    'Money Market', 'Certificate of Deposit (CD)', 'Other Cash'
  ],
  cryptocurrency: [
    'Exchange Account', 'Hardware Wallet', 'Software Wallet',
    'Cold Storage', 'Other Crypto'
  ],
  metals: [
    'Home Storage', 'Safe Deposit Box', 'Third-Party Vault',
    'Allocated Storage', 'Unallocated Storage', 'Other Metals'
  ],
  real_estate: [
    'Primary Residence', 'Vacation Home', 'Rental Property',
    'Commercial Property', 'Land', 'REIT', 'Other Real Estate'
  ]
};

/**
 * Get category from account type
 */
export const getCategoryFromType = (accountType) => {
  for (const [category, types] of Object.entries(ACCOUNT_TYPES_BY_CATEGORY)) {
    if (types.includes(accountType)) {
      return category;
    }
  }
  return '';
};

/**
 * Get category config by ID
 */
export const getCategoryConfig = (categoryId) => {
  return ACCOUNT_CATEGORIES.find(c => c.id === categoryId) || {
    id: 'unknown',
    name: 'Unknown',
    icon: Building,
    color: 'gray'
  };
};

/**
 * Get available account types for a category
 */
export const getAccountTypesForCategory = (categoryId) => {
  return ACCOUNT_TYPES_BY_CATEGORY[categoryId] || [];
};

/**
 * Get all account types across all categories
 */
export const getAllAccountTypes = () => {
  return Object.values(ACCOUNT_TYPES_BY_CATEGORY).flat();
};
