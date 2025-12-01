// Item type configuration for the Update Modal
import {
  Wallet, Banknote, CreditCard, Car, Home, Package,
  TrendingUp, Coins, CircleDollarSign, PiggyBank
} from 'lucide-react';

/**
 * Item type definitions for update modal
 */
export const ITEM_TYPES = {
  cash: {
    id: 'cash',
    name: 'Cash',
    description: 'Bank accounts, checking, savings, money market',
    icon: Banknote,
    color: {
      primary: '#10b981', // emerald
      secondary: '#059669',
      bg: 'from-emerald-600 to-emerald-700',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      light: 'bg-emerald-500/10'
    }
  },
  liability: {
    id: 'liability',
    name: 'Liability',
    description: 'Loans, mortgages, credit cards, debts',
    icon: CreditCard,
    color: {
      primary: '#f43f5e', // rose
      secondary: '#e11d48',
      bg: 'from-rose-600 to-rose-700',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      light: 'bg-rose-500/10'
    }
  },
  other: {
    id: 'other',
    name: 'Other Asset',
    description: 'Vehicles, collectibles, other valuables',
    icon: Package,
    color: {
      primary: '#8b5cf6', // violet
      secondary: '#7c3aed',
      bg: 'from-violet-600 to-violet-700',
      badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      light: 'bg-violet-500/10'
    }
  },
  security: {
    id: 'security',
    name: 'Security',
    description: 'Stocks, ETFs, mutual funds',
    icon: TrendingUp,
    color: {
      primary: '#3b82f6', // blue
      secondary: '#2563eb',
      bg: 'from-blue-600 to-blue-700',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      light: 'bg-blue-500/10'
    }
  },
  crypto: {
    id: 'crypto',
    name: 'Crypto',
    description: 'Cryptocurrencies',
    icon: Coins,
    color: {
      primary: '#f59e0b', // amber
      secondary: '#d97706',
      bg: 'from-amber-600 to-amber-700',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      light: 'bg-amber-500/10'
    }
  },
  metal: {
    id: 'metal',
    name: 'Metal',
    description: 'Gold, silver, precious metals',
    icon: CircleDollarSign,
    color: {
      primary: '#eab308', // yellow
      secondary: '#ca8a04',
      bg: 'from-yellow-600 to-yellow-700',
      badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      light: 'bg-yellow-500/10'
    }
  }
};

/**
 * Get configuration for an item type
 */
export const getItemTypeConfig = (type) => {
  const normalized = String(type || '').toLowerCase();
  return ITEM_TYPES[normalized] || ITEM_TYPES.other;
};

/**
 * Updatable item types (balance-based, no quantity)
 */
export const BALANCE_TYPES = ['cash', 'liability', 'other'];

/**
 * Quantity-based item types (securities, crypto, metals)
 */
export const QUANTITY_TYPES = ['security', 'crypto', 'metal'];

/**
 * All supported update types
 */
export const ALL_UPDATE_TYPES = [...BALANCE_TYPES, ...QUANTITY_TYPES];

/**
 * Liability subtypes for grouping
 */
export const LIABILITY_SUBTYPES = {
  credit_card: { name: 'Credit Card', icon: CreditCard },
  mortgage: { name: 'Mortgage', icon: Home },
  auto_loan: { name: 'Auto Loan', icon: Car },
  student_loan: { name: 'Student Loan', icon: PiggyBank },
  personal_loan: { name: 'Personal Loan', icon: Wallet },
  other: { name: 'Other', icon: Package }
};

export default ITEM_TYPES;
