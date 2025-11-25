// QuickStart Modal Constants and Configuration
import {
  BarChart3, DollarSign, Coins, Gem, Home, Building,
  CreditCard, Car, GraduationCap, FileText,
  Briefcase, PiggyBank, Wallet, TrendingUp, Landmark
} from 'lucide-react';

// ============================================================================
// ASSET TYPE CONFIGURATIONS
// ============================================================================

export const ASSET_TYPES = {
  security: {
    key: 'security',
    name: 'Securities',
    description: 'Stocks, ETFs, Bonds, Mutual Funds',
    icon: BarChart3,
    color: 'blue',
    searchable: true,
    fields: [
      { key: 'account_id', label: 'Account', type: 'account', required: true, width: 'w-48' },
      { key: 'ticker', label: 'Ticker', type: 'text', required: true, searchable: true, transform: 'uppercase', width: 'w-24' },
      { key: 'name', label: 'Company', type: 'text', readOnly: true, width: 'w-48' },
      { key: 'shares', label: 'Shares', type: 'number', required: true, min: 0, step: 'any', width: 'w-28' },
      { key: 'price', label: 'Price', type: 'currency', readOnly: true, width: 'w-28' },
      { key: 'cost_basis', label: 'Cost Basis', type: 'currency', required: true, width: 'w-28' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36' }
    ]
  },
  cash: {
    key: 'cash',
    name: 'Cash',
    description: 'Savings, Checking, CDs, Money Market',
    icon: DollarSign,
    color: 'purple',
    searchable: false,
    fields: [
      { key: 'account_id', label: 'Account', type: 'account', required: true, width: 'w-48' },
      {
        key: 'cash_type',
        label: 'Type',
        type: 'select',
        required: true,
        width: 'w-36',
        options: [
          { value: 'Savings', label: 'Savings' },
          { value: 'Checking', label: 'Checking' },
          { value: 'Money Market', label: 'Money Market' },
          { value: 'CD', label: 'CD' },
          { value: 'Other', label: 'Other' }
        ]
      },
      { key: 'amount', label: 'Amount', type: 'currency', required: true, width: 'w-36' },
      { key: 'interest_rate', label: 'APY %', type: 'percent', width: 'w-24' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date', width: 'w-36' }
    ]
  },
  crypto: {
    key: 'crypto',
    name: 'Cryptocurrency',
    description: 'Bitcoin, Ethereum, and other digital assets',
    icon: Coins,
    color: 'orange',
    searchable: true,
    fields: [
      { key: 'account_id', label: 'Account', type: 'account', required: true, width: 'w-48' },
      { key: 'symbol', label: 'Symbol', type: 'text', required: true, searchable: true, transform: 'uppercase', width: 'w-24' },
      { key: 'name', label: 'Name', type: 'text', readOnly: true, width: 'w-40' },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, min: 0, step: 'any', width: 'w-32' },
      { key: 'current_price', label: 'Price', type: 'currency', readOnly: true, width: 'w-28' },
      { key: 'purchase_price', label: 'Purchase Price', type: 'currency', required: true, width: 'w-28' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36' }
    ]
  },
  metal: {
    key: 'metal',
    name: 'Precious Metals',
    description: 'Gold, Silver, Platinum, Palladium',
    icon: Gem,
    color: 'yellow',
    searchable: false,
    fields: [
      { key: 'account_id', label: 'Account', type: 'account', required: true, width: 'w-48' },
      {
        key: 'metal_type',
        label: 'Metal',
        type: 'select',
        required: true,
        width: 'w-32',
        options: [
          { value: 'Gold', label: 'Gold', symbol: 'GC=F' },
          { value: 'Silver', label: 'Silver', symbol: 'SI=F' },
          { value: 'Platinum', label: 'Platinum', symbol: 'PL=F' },
          { value: 'Palladium', label: 'Palladium', symbol: 'PA=F' }
        ]
      },
      { key: 'quantity', label: 'Quantity (oz)', type: 'number', required: true, min: 0, step: 'any', width: 'w-28' },
      { key: 'current_price_per_unit', label: 'Current $/oz', type: 'currency', readOnly: true, width: 'w-28' },
      { key: 'purchase_price', label: 'Purchase $/oz', type: 'currency', required: true, width: 'w-28' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', required: true, width: 'w-36' }
    ]
  },
  other: {
    key: 'other',
    name: 'Other Assets',
    description: 'Real estate, vehicles, collectibles',
    icon: Home,
    color: 'green',
    searchable: false,
    fields: [
      { key: 'asset_name', label: 'Asset Name', type: 'text', required: true, width: 'w-48' },
      {
        key: 'asset_type',
        label: 'Type',
        type: 'select',
        width: 'w-36',
        options: [
          { value: 'real_estate', label: 'Real Estate' },
          { value: 'vehicle', label: 'Vehicle' },
          { value: 'collectible', label: 'Collectible' },
          { value: 'other', label: 'Other' }
        ]
      },
      { key: 'current_value', label: 'Current Value', type: 'currency', required: true, width: 'w-36' },
      { key: 'cost', label: 'Cost Basis', type: 'currency', width: 'w-36' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date', width: 'w-36' }
    ]
  }
};

// ============================================================================
// LIABILITY TYPE CONFIGURATIONS
// ============================================================================

export const LIABILITY_TYPES = [
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard, color: 'blue', showCreditLimit: true },
  { value: 'mortgage', label: 'Mortgage', icon: Home, color: 'green', showOriginalAmount: true },
  { value: 'auto_loan', label: 'Auto Loan', icon: Car, color: 'purple', showOriginalAmount: true },
  { value: 'personal_loan', label: 'Personal Loan', icon: DollarSign, color: 'orange', showOriginalAmount: true },
  { value: 'student_loan', label: 'Student Loan', icon: GraduationCap, color: 'indigo', showOriginalAmount: true },
  { value: 'home_equity', label: 'Home Equity', icon: Building, color: 'teal', showOriginalAmount: true },
  { value: 'other', label: 'Other', icon: FileText, color: 'gray' }
];

export const LIABILITY_FIELDS = [
  { key: 'name', label: 'Name', type: 'text', required: true, width: 'w-44' },
  { key: 'liability_type', label: 'Type', type: 'liabilityType', required: true, width: 'w-36' },
  { key: 'institution_name', label: 'Institution', type: 'institution', required: true, width: 'w-44' },
  { key: 'current_balance', label: 'Balance', type: 'currency', required: true, width: 'w-32' },
  { key: 'original_amount', label: 'Original Amount', type: 'currency', conditional: 'showOriginalAmount', width: 'w-32' },
  { key: 'credit_limit', label: 'Credit Limit', type: 'currency', conditional: 'showCreditLimit', width: 'w-32' },
  { key: 'interest_rate', label: 'APR %', type: 'percent', width: 'w-24' }
];

// ============================================================================
// ACCOUNT CONFIGURATIONS
// ============================================================================

export const ACCOUNT_CATEGORIES = [
  { id: 'investment', name: 'Investment', icon: TrendingUp },
  { id: 'retirement', name: 'Retirement', icon: PiggyBank },
  { id: 'cash', name: 'Cash & Banking', icon: Wallet },
  { id: 'crypto', name: 'Crypto', icon: Coins },
  { id: 'other', name: 'Other', icon: Briefcase }
];

export const ACCOUNT_TYPES_BY_CATEGORY = {
  investment: [
    { value: 'brokerage', label: 'Taxable Brokerage' },
    { value: 'trust', label: 'Trust' },
    { value: 'custodial', label: 'Custodial (UTMA/UGMA)' },
    { value: 'other_investment', label: 'Other Investment' }
  ],
  retirement: [
    { value: '401k', label: '401(k)' },
    { value: '403b', label: '403(b)' },
    { value: 'ira', label: 'Traditional IRA' },
    { value: 'roth_ira', label: 'Roth IRA' },
    { value: 'sep_ira', label: 'SEP IRA' },
    { value: 'simple_ira', label: 'SIMPLE IRA' },
    { value: '457b', label: '457(b)' },
    { value: 'pension', label: 'Pension' },
    { value: 'hsa', label: 'HSA' },
    { value: 'other_retirement', label: 'Other Retirement' }
  ],
  cash: [
    { value: 'checking', label: 'Checking' },
    { value: 'savings', label: 'Savings' },
    { value: 'money_market', label: 'Money Market' },
    { value: 'cd', label: 'CD' },
    { value: 'other_cash', label: 'Other Cash' }
  ],
  crypto: [
    { value: 'crypto_exchange', label: 'Exchange Account' },
    { value: 'crypto_wallet', label: 'Wallet' },
    { value: 'other_crypto', label: 'Other Crypto' }
  ],
  other: [
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'business', label: 'Business' },
    { value: 'other', label: 'Other' }
  ]
};

export const ACCOUNT_FIELDS = [
  { key: 'accountName', label: 'Account Name', type: 'text', required: true, width: 'w-48', placeholder: 'My Retirement Account...' },
  { key: 'institution', label: 'Institution', type: 'institution', required: true, width: 'w-48' },
  { key: 'accountCategory', label: 'Category', type: 'accountCategory', required: true, width: 'w-40' },
  { key: 'accountType', label: 'Type', type: 'accountType', required: true, width: 'w-40' }
];

// ============================================================================
// STATUS CONFIGURATIONS
// ============================================================================

export const ROW_STATUS = {
  draft: { label: 'Draft', color: 'amber', bgClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  ready: { label: 'Ready', color: 'emerald', bgClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  submitting: { label: 'Saving...', color: 'blue', bgClass: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  added: { label: 'Added', color: 'indigo', bgClass: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  error: { label: 'Error', color: 'rose', bgClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400' }
};

// ============================================================================
// VIEW CONFIGURATIONS
// ============================================================================

export const VIEWS = {
  welcome: 'welcome',
  accounts: 'accounts',
  positions: 'positions',
  liabilities: 'liabilities',
  import: 'import',
  success: 'success'
};

export const IMPORT_METHODS = {
  ui: 'ui',
  excel: 'excel'
};

// ============================================================================
// METAL SYMBOL MAPPING
// ============================================================================

export const METAL_SYMBOLS = {
  Gold: 'GC=F',
  Silver: 'SI=F',
  Platinum: 'PL=F',
  Palladium: 'PA=F',
  Copper: 'HG=F'
};

// ============================================================================
// EXCEL TEMPLATE HEADERS
// ============================================================================

export const EXCEL_HEADERS = {
  accounts: ['Account Name', 'Institution', 'Account Category', 'Account Type'],
  positions: {
    security: ['Account', 'Ticker', 'Company Name', 'Shares', 'Cost Basis', 'Purchase Date'],
    cash: ['Account', 'Cash Type', 'Amount', 'Interest Rate', 'Maturity Date'],
    crypto: ['Account', 'Symbol', 'Name', 'Quantity', 'Purchase Price', 'Purchase Date'],
    metal: ['Account', 'Metal Type', 'Metal Code', 'Quantity (oz)', 'Purchase Price/oz', 'Purchase Date']
  }
};

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export const KEYBOARD_SHORTCUTS = [
  { key: 'Tab', description: 'Move to next field' },
  { key: 'Shift+Tab', description: 'Move to previous field' },
  { key: 'Enter', description: 'Add new row (when on last field)' },
  { key: 'Arrow Up/Down', description: 'Navigate between rows' },
  { key: 'Alt+Arrow Up/Down', description: 'Move row up/down' },
  { key: 'Ctrl+D', description: 'Duplicate current row' },
  { key: 'Ctrl+Delete', description: 'Delete current row' },
  { key: 'Ctrl+K', description: 'Toggle keyboard shortcuts' },
  { key: 'Ctrl+H', description: 'Toggle help panel' },
  { key: 'Escape', description: 'Close panels/dropdowns' }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getAssetTypeConfig(type) {
  return ASSET_TYPES[type] || null;
}

export function getLiabilityTypeConfig(type) {
  return LIABILITY_TYPES.find(t => t.value === type) || null;
}

export function getAccountCategoryConfig(categoryId) {
  return ACCOUNT_CATEGORIES.find(c => c.id === categoryId) || null;
}

export function getAccountTypesForCategory(categoryId) {
  return ACCOUNT_TYPES_BY_CATEGORY[categoryId] || [];
}
