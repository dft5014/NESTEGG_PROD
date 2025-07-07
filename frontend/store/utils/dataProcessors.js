// store/utils/dataProcessors.js

/**
 * Format currency values for display
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format percentage values
 */
export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%';
  return `${value > 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Process asset allocation data for charts
 */
export const processAssetAllocation = (allocation) => {
  if (!allocation) return [];
  
  return Object.entries(allocation)
    .filter(([_, data]) => data.value > 0)
    .map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: data.value,
      percentage: data.percentage * 100,
      count: data.count || 0,
    }))
    .sort((a, b) => b.value - a.value);
};

/**
 * Process sector allocation from JSON
 */
export const processSectorAllocation = (sectorData) => {
  if (!sectorData) return [];
  
  return Object.entries(sectorData)
    .filter(([_, data]) => data.value > 0)
    .map(([sector, data]) => ({
      name: sector || 'Unknown',
      value: data.value,
      percentage: (data.percentage || 0) * 100,
      positionCount: data.position_count || 0,
    }))
    .sort((a, b) => b.value - a.value);
};

/**
 * Get period label
 */
export const getPeriodLabel = (period) => {
  const labels = {
    '1d': '1 Day',
    '1w': '1 Week', 
    '1m': '1 Month',
    '3m': '3 Months',
    'ytd': 'Year to Date',
    '1y': '1 Year',
  };
  return labels[period] || period;
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Calculate risk score based on metrics
 */
export const calculateRiskScore = (riskMetrics) => {
  if (!riskMetrics) return 'Unknown';
  
  const debtRatio = riskMetrics.debt_to_asset_ratio || 0;
  const cashPercentage = riskMetrics.cash_percentage || 0;
  const volatility = riskMetrics.volatility_estimate || 0;
  
  // Simple risk scoring
  if (debtRatio > 0.5 || volatility > 0.3) return 'High';
  if (debtRatio > 0.3 || volatility > 0.2 || cashPercentage < 0.1) return 'Medium';
  return 'Low';
};