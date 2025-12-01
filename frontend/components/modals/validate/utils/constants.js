// ValidateModal2 - Constants and Utilities
import {
  Building2, CheckCircle, AlertTriangle, Clock,
  TrendingUp, TrendingDown, AlertCircle, Sparkles,
  Shield, Target, Search, FileSpreadsheet,
  BarChart3, DollarSign, Coins, Gem, Home
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// ============================================================================
// VALIDATION STATUS CONFIGURATIONS
// ============================================================================

export const VALIDATION_STATUS = {
  pending: {
    key: 'pending',
    label: 'Pending',
    description: 'Awaiting statement balance entry',
    icon: Clock,
    color: 'gray',
    bgClass: 'bg-gray-800/50',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-700',
    badgeClass: 'bg-gray-800 text-gray-400 border-gray-700'
  },
  matched: {
    key: 'matched',
    label: 'Matched',
    description: 'Balance matches within tolerance',
    icon: CheckCircle,
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  minor_discrepancy: {
    key: 'minor_discrepancy',
    label: 'Minor Diff',
    description: 'Small difference (<$100)',
    icon: AlertCircle,
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  major_discrepancy: {
    key: 'major_discrepancy',
    label: 'Major Diff',
    description: 'Significant difference (>$100)',
    icon: AlertTriangle,
    color: 'rose',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/20',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  },
  reconciled: {
    key: 'reconciled',
    label: 'Reconciled',
    description: 'Manually marked as reconciled',
    icon: Shield,
    color: 'indigo',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/20',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  }
};

// ============================================================================
// FILTER OPTIONS
// ============================================================================

export const FILTER_OPTIONS = [
  { value: 'all', label: 'All Accounts', icon: Building2 },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'matched', label: 'Matched', icon: CheckCircle },
  { value: 'discrepancy', label: 'Discrepancies', icon: AlertTriangle },
  { value: 'reconciled', label: 'Reconciled', icon: Shield }
];

// ============================================================================
// SORT OPTIONS
// ============================================================================

export const SORT_OPTIONS = [
  { field: 'value', direction: 'desc', label: 'Highest Value' },
  { field: 'value', direction: 'asc', label: 'Lowest Value' },
  { field: 'name', direction: 'asc', label: 'Name A-Z' },
  { field: 'name', direction: 'desc', label: 'Name Z-A' },
  { field: 'diff', direction: 'desc', label: 'Largest Difference' },
  { field: 'diff', direction: 'asc', label: 'Smallest Difference' }
];

// ============================================================================
// ASSET TYPE CONFIGURATIONS
// ============================================================================

export const ASSET_TYPE_CONFIG = {
  security: {
    key: 'security',
    label: 'Securities',
    icon: BarChart3,
    color: 'blue',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10'
  },
  cash: {
    key: 'cash',
    label: 'Cash',
    icon: DollarSign,
    color: 'purple',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10'
  },
  crypto: {
    key: 'crypto',
    label: 'Crypto',
    icon: Coins,
    color: 'orange',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10'
  },
  metal: {
    key: 'metal',
    label: 'Metals',
    icon: Gem,
    color: 'yellow',
    textClass: 'text-yellow-400',
    bgClass: 'bg-yellow-500/10'
  },
  other: {
    key: 'other',
    label: 'Other',
    icon: Home,
    color: 'green',
    textClass: 'text-green-400',
    bgClass: 'bg-green-500/10'
  }
};

// ============================================================================
// TOLERANCE THRESHOLDS
// ============================================================================

export const TOLERANCE = {
  MATCH: 1,           // $1 - considered a match
  MINOR: 100,         // $100 - minor discrepancy threshold
  PERCENT_MATCH: 0.001 // 0.1% - percentage threshold for match
};

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export const KEYBOARD_SHORTCUTS = [
  { key: 'Cmd/Ctrl + K', description: 'Focus search' },
  { key: 'Cmd/Ctrl + E', description: 'Export to CSV' },
  { key: 'Cmd/Ctrl + I', description: 'Import from statement' },
  { key: 'Escape', description: 'Close modal / Go back' },
  { key: 'Tab', description: 'Next input' },
  { key: 'Shift + Tab', description: 'Previous input' },
  { key: 'Enter', description: 'Submit / Confirm' }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get validation status for an account based on balances
 */
export function getValidationStatus(nesteggBalance, statementBalance, isReconciled = false) {
  if (isReconciled) {
    return VALIDATION_STATUS.reconciled;
  }

  if (statementBalance === null || statementBalance === undefined || statementBalance === '') {
    return VALIDATION_STATUS.pending;
  }

  const diff = Math.abs(Number(statementBalance) - Number(nesteggBalance));

  if (diff < TOLERANCE.MATCH) {
    return VALIDATION_STATUS.matched;
  }

  if (diff < TOLERANCE.MINOR) {
    return VALIDATION_STATUS.minor_discrepancy;
  }

  return VALIDATION_STATUS.major_discrepancy;
}

/**
 * Calculate difference between NestEgg and statement balance
 */
export function calculateDifference(nesteggBalance, statementBalance) {
  if (statementBalance === null || statementBalance === undefined || statementBalance === '') {
    return { amount: 0, percent: 0, hasStatement: false };
  }

  const nestegg = Number(nesteggBalance) || 0;
  const statement = Number(statementBalance) || 0;
  const amount = statement - nestegg;
  const percent = nestegg !== 0 ? (amount / nestegg) * 100 : 0;

  return {
    amount,
    percent,
    hasStatement: true,
    isPositive: amount > 0,
    isNegative: amount < 0,
    isMatch: Math.abs(amount) < TOLERANCE.MATCH
  };
}

/**
 * Get institution logo from popular brokerages
 */
export function getInstitutionLogo(institutionName) {
  if (!institutionName) return null;
  const match = popularBrokerages.find(b =>
    b.name.toLowerCase() === String(institutionName).toLowerCase()
  );
  return match?.logo || null;
}

/**
 * Format currency with hide option
 */
export function fmtCurrency(value, hideValues = false) {
  if (hideValues) return '******';
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return '$0.00';
  }
  return formatCurrency(value);
}

/**
 * Parse a string or number to a clean number
 */
export function parseNumber(val) {
  if (typeof val === 'number') return val;
  const cleaned = String(val || '').replace(/[$,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Group accounts by institution
 */
export function groupAccountsByInstitution(accounts) {
  const grouped = new Map();

  (accounts || []).forEach(account => {
    const institution = account.institution || 'Other';
    if (!grouped.has(institution)) {
      grouped.set(institution, []);
    }
    grouped.get(institution).push(account);
  });

  return grouped;
}

/**
 * Sort accounts by various criteria
 */
export function sortAccounts(accounts, sort) {
  const sorted = [...accounts];
  const { field, direction } = sort;
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    switch (field) {
      case 'value':
        return multiplier * ((a.totalValue || 0) - (b.totalValue || 0));
      case 'name':
        return multiplier * (a.name || '').localeCompare(b.name || '');
      case 'diff':
        // Would need statement balances passed in - implement in component
        return 0;
      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * Calculate summary statistics for validation session
 */
export function calculateValidationStats(accounts, statementBalances, reconciliationStatus) {
  let totalAccounts = 0;
  let pendingAccounts = 0;
  let matchedAccounts = 0;
  let discrepancyAccounts = 0;
  let reconciledAccounts = 0;
  let totalNestegg = 0;
  let totalStatement = 0;
  let totalDiff = 0;

  accounts.forEach(acc => {
    totalAccounts++;
    const nestegg = acc.totalValue || 0;
    totalNestegg += nestegg;

    const statement = statementBalances[acc.id];
    const isReconciled = reconciliationStatus[acc.id]?.reconciled;

    if (isReconciled) {
      reconciledAccounts++;
      if (statement !== undefined && statement !== null && statement !== '') {
        totalStatement += Number(statement);
        totalDiff += Number(statement) - nestegg;
      }
    } else if (statement === undefined || statement === null || statement === '') {
      pendingAccounts++;
    } else {
      totalStatement += Number(statement);
      const diff = Math.abs(Number(statement) - nestegg);
      totalDiff += Number(statement) - nestegg;

      if (diff < TOLERANCE.MATCH) {
        matchedAccounts++;
      } else {
        discrepancyAccounts++;
      }
    }
  });

  const completionRate = totalAccounts > 0
    ? ((totalAccounts - pendingAccounts) / totalAccounts) * 100
    : 0;

  return {
    totalAccounts,
    pendingAccounts,
    matchedAccounts,
    discrepancyAccounts,
    reconciledAccounts,
    totalNestegg,
    totalStatement,
    totalDiff,
    completionRate
  };
}

/**
 * Calculate institution summary statistics
 */
export function calculateInstitutionStats(accounts, statementBalances, reconciliationStatus) {
  let totalValue = 0;
  let totalStatement = 0;
  let accountsWithInput = 0;
  let matchCount = 0;
  let discrepancyCount = 0;
  let reconciledCount = 0;

  accounts.forEach(acc => {
    const nestegg = acc.totalValue || 0;
    totalValue += nestegg;

    const statement = statementBalances[acc.id];
    const isReconciled = reconciliationStatus[acc.id]?.reconciled;

    if (isReconciled) {
      reconciledCount++;
      if (statement !== undefined && statement !== null && statement !== '') {
        totalStatement += Number(statement);
        accountsWithInput++;
      }
    } else if (statement !== undefined && statement !== null && statement !== '') {
      totalStatement += Number(statement);
      accountsWithInput++;

      const diff = Math.abs(Number(statement) - nestegg);
      if (diff < TOLERANCE.MATCH) {
        matchCount++;
      } else {
        discrepancyCount++;
      }
    }
  });

  const diff = totalStatement - totalValue;
  const allInputted = accountsWithInput === accounts.length;

  let overallStatus = 'pending';
  if (reconciledCount === accounts.length) {
    overallStatus = 'reconciled';
  } else if (allInputted && discrepancyCount === 0) {
    overallStatus = 'matched';
  } else if (discrepancyCount > 0) {
    overallStatus = 'discrepancy';
  }

  return {
    totalValue,
    totalStatement,
    diff,
    accountsWithInput,
    matchCount,
    discrepancyCount,
    reconciledCount,
    accountCount: accounts.length,
    overallStatus,
    allInputted
  };
}

/**
 * Generate unique session ID
 */
export function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export validation data to CSV
 */
export function exportToCSV(accounts, statementBalances, reconciliationStatus, validationDate) {
  const rows = [[
    'Institution',
    'Account',
    'Account ID',
    'Account Type',
    'NestEgg Balance',
    'Statement Balance',
    'Difference',
    'Status',
    'Reconciled',
    'Notes'
  ]];

  const grouped = groupAccountsByInstitution(accounts);

  grouped.forEach((accts, institution) => {
    accts.forEach(acc => {
      const nestegg = acc.totalValue || 0;
      const statement = statementBalances[acc.id];
      const reconciliation = reconciliationStatus[acc.id];
      const status = getValidationStatus(nestegg, statement, reconciliation?.reconciled);
      const diff = statement !== undefined && statement !== '' ? Number(statement) - nestegg : '';

      rows.push([
        institution,
        acc.name,
        acc.id,
        acc.type || acc.accountType || '',
        nestegg.toFixed(2),
        statement !== undefined && statement !== '' ? Number(statement).toFixed(2) : '',
        diff !== '' ? diff.toFixed(2) : '',
        status.label,
        reconciliation?.reconciled ? 'Yes' : 'No',
        reconciliation?.notes || ''
      ]);
    });
  });

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `NestEgg_Validation_${validationDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse imported CSV for statement balances
 */
export function parseImportCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  const accountIdIdx = headers.findIndex(h => h.includes('account id') || h === 'id');
  const statementIdx = headers.findIndex(h =>
    h.includes('statement') || h.includes('balance') || h.includes('value')
  );

  if (accountIdIdx === -1) {
    throw new Error('Could not find Account ID column');
  }

  const balances = {};
  let importCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    const accountId = cells[accountIdIdx];
    const balance = statementIdx >= 0 ? cells[statementIdx] : null;

    if (accountId && balance !== null && balance !== '') {
      balances[accountId] = parseNumber(balance);
      importCount++;
    }
  }

  return { balances, importCount };
}
