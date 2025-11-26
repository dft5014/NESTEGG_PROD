import { CreditCard, Home, Package, Wallet, FileText, Building, Banknote } from 'lucide-react';

/**
 * Liability type configuration
 */
export const LIABILITY_TYPES = {
  credit_card: {
    label: 'Credit Card',
    icon: CreditCard,
    color: 'rose'
  },
  mortgage: {
    label: 'Mortgage',
    icon: Home,
    color: 'blue'
  },
  auto_loan: {
    label: 'Auto Loan',
    icon: Package,
    color: 'amber'
  },
  personal_loan: {
    label: 'Personal Loan',
    icon: Wallet,
    color: 'purple'
  },
  student_loan: {
    label: 'Student Loan',
    icon: FileText,
    color: 'indigo'
  },
  home_equity: {
    label: 'Home Equity',
    icon: Building,
    color: 'teal'
  },
  other: {
    label: 'Other',
    icon: Banknote,
    color: 'gray'
  }
};

/**
 * Get liability type config with fallback
 */
export const getLiabilityTypeConfig = (liabilityType) => {
  return LIABILITY_TYPES[liabilityType] || {
    label: 'Unknown',
    icon: Banknote,
    color: 'gray'
  };
};

/**
 * Get liability type options for dropdowns
 */
export const getLiabilityTypeOptions = () => {
  return Object.entries(LIABILITY_TYPES).map(([key, config]) => ({
    value: key,
    label: config.label,
    icon: config.icon
  }));
};
