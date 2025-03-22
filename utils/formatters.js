// utils/formatters.js
export const formatCurrency = (value) => {
  if (value === undefined || value === null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0.00%';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
};

export const getGainLossColor = (value) => {
  if (value === 0) return 'text-gray-500';
  return value > 0 ? 'text-green-600' : 'text-red-600';
};