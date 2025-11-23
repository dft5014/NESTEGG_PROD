// utils/formatters.js

/**
 * Formats a numeric value as a US Dollar currency string.
 * Handles null/undefined inputs.
 * Allows overriding default fraction digits.
 * @param {number | null | undefined} value - The numeric value to format.
 * @param {object} [options] - Formatting options.
 * @param {number} [options.minimumFractionDigits=0] - Minimum decimal places.
 * @param {number} [options.maximumFractionDigits=0] - Maximum decimal places.
 * @param {boolean} [options.compact=false] - Use compact notation (e.g., $1.2M instead of $1,234,567).
 * @returns {string} - The formatted currency string (e.g., "$1,234").
 */
export const formatCurrency = (value, options = {}) => {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0, compact = false } = options;

  if (value === undefined || value === null || isNaN(Number(value))) {
    // Return $0 for invalid inputs, adjusting decimals based on minimum required
    return `$0${minimumFractionDigits > 0 ? '.' + '0'.repeat(minimumFractionDigits) : ''}`;
  }

  const numValue = Number(value);

  // Use compact notation if requested
  if (compact) {
    const absValue = Math.abs(numValue);
    if (absValue >= 1_000_000_000) {
      return `$${(numValue / 1_000_000_000).toFixed(1)}B`;
    } else if (absValue >= 1_000_000) {
      return `$${(numValue / 1_000_000).toFixed(1)}M`;
    } else if (absValue >= 1_000) {
      return `$${(numValue / 1_000).toFixed(0)}k`;
    }
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits,
  }).format(numValue);
};

/**
 * Formats a numeric value (expected as a decimal, e.g., 0.25 for 25%) as a percentage string.
 * Handles null/undefined inputs.
 * Allows overriding default fraction digits.
 * @param {number | null | undefined} value - The numeric value (decimal form) to format.
 * @param {object} [options] - Formatting options.
 * @param {number} [options.minimumFractionDigits=2] - Minimum decimal places.
 * @param {number} [options.maximumFractionDigits=2] - Maximum decimal places.
 * @returns {string} - The formatted percentage string (e.g., "25.00%").
 */
export const formatPercentage = (value, options = {}) => {
 const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

  if (value === undefined || value === null || isNaN(Number(value))) {
     // Return 0.00% for invalid inputs, adjusting decimals based on minimum required
    return `0.${'0'.repeat(minimumFractionDigits)}%`;
  }

  // Intl.NumberFormat with style 'percent' expects a decimal value (e.g., 0.25 for 25%)
  // No need to divide by 100 here if the input 'value' is already the decimal representation.
  // If your input value is like '25' meaning 25%, you would divide by 100 here.
  // Assuming input 'value' is the decimal representation (e.g., gainLossPercent / 100).
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits,
  }).format(Number(value));
};

/**
 * Returns a Tailwind CSS class string for styling gain/loss values.
 * @param {number | null | undefined} value - The numeric value to check.
 * @returns {string} - Tailwind CSS class ('text-green-500', 'text-red-500', 'text-gray-500').
 */
export const getGainLossColor = (value) => {
  const numValue = Number(value); // Ensure it's treated as a number
  if (isNaN(numValue) || numValue === 0) {
      return 'text-gray-500'; // Use a neutral color for zero or invalid input
  }
  // Adjusted colors slightly for better contrast on dark backgrounds potentially
  return numValue > 0 ? 'text-green-500' : 'text-red-500';
};

/**
 * Formats a date string or Date object into a readable format (MM/DD/YYYY).
 * Handles null/undefined or invalid date inputs.
 * @param {string | Date | null | undefined} dateInput - The date string (e.g., ISO format) or Date object.
 * @param {object} [options] - Options for Intl.DateTimeFormat (e.g., { year: 'numeric', month: 'short', day: 'numeric' })
 * @returns {string} - The formatted date string (e.g., "4/3/2025") or 'N/A'.
 */
export const formatDate = (dateInput, options = {}) => {
  if (!dateInput) return 'N/A';

  try {
    const date = new Date(dateInput);
    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    const defaultOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone: 'UTC' // Assume UTC if timezone not specified, prevents off-by-one day issues
    };

    // Merge default options with provided options
    const finalOptions = { ...defaultOptions, ...options };


    return new Intl.DateTimeFormat('en-US', finalOptions).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'N/A'; // Return 'N/A' if formatting fails
  }
};

/**
 * Formats a number with specified fraction digits, useful for quantities like shares.
 * Handles null/undefined inputs.
 * @param {number | null | undefined} value - The numeric value to format.
 * @param {object} [options] - Formatting options.
 * @param {number} [options.minimumFractionDigits=0] - Minimum decimal places.
 * @param {number} [options.maximumFractionDigits=4] - Maximum decimal places (allow more for shares).
 * @param {boolean} [options.useGrouping=true] - Whether to use thousand separators.
 * @returns {string} - The formatted number string (e.g., "1,234.5678").
 */
export const formatNumber = (value, options = {}) => {
  const { minimumFractionDigits = 0, maximumFractionDigits = 4, useGrouping = true } = options;

  if (value === undefined || value === null || isNaN(Number(value))) {
     // Return 0 for invalid inputs, adjusting decimals based on minimum required
    return `0${minimumFractionDigits > 0 ? '.' + '0'.repeat(minimumFractionDigits) : ''}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'decimal', // Use 'decimal' for plain numbers
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits,
    useGrouping: useGrouping,
  }).format(Number(value));
};

/**
 * Formats a numeric value as a share price with exactly two decimal places.
 * Always displays the dollar sign and two decimal places (e.g., $X.XX)
 * @param {number | null | undefined} value - The numeric value to format.
 * @returns {string} - The formatted share price string (e.g., "$12.34").
 */
export const formatSharePrice = (value) => {
  if (value === undefined || value === null || isNaN(Number(value))) {
    // Return $0.00 for invalid inputs
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
};

/**
 * Format a stock price with 2 decimal places and thousand separators
 * @param {number} value - The price value to format
 * @returns {string} - Formatted price string (e.g., "$1,234.56")
 */
export const formatStockPrice = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a stock price without currency symbol
 * @param {number} value - The price value to format
 * @returns {string} - Formatted price string (e.g., "1,234.56")
 */
export const formatStockPriceNoCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};