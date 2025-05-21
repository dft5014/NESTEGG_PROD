// utils/reportUtils.js

/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, options = {}) => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    currency = 'USD'
  } = options;
  
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};

/**
 * Format percentage value
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (value, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    includeSign = true
  } = options;
  
  if (value === null || value === undefined) return '-';
  
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(maximumFractionDigits)}%`;
};

/**
 * Format date value
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  const {
    includeYear = true,
    includeDay = true,
    monthFormat = 'short'
  } = options;
  
  if (!date) return '';
  
  const d = new Date(date);
  
  const formatOptions = {
    month: monthFormat
  };
  
  if (includeYear) formatOptions.year = 'numeric';
  if (includeDay) formatOptions.day = 'numeric';
  
  return d.toLocaleDateString('en-US', formatOptions);
};

/**
 * Process portfolio snapshots for chart display
 * @param {Array} snapshots - Raw portfolio snapshots data
 * @returns {Array} - Processed data for chart display
 */
export const processPortfolioSnapshots = (snapshots = []) => {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return [];
  }
  
  return snapshots.map(day => ({
    date: new Date(day.date),
    formattedDate: formatDate(new Date(day.date), { includeYear: false }),
    value: day.value,
    costBasis: day.cost_basis || 0,
    unrealizedGain: day.value - (day.cost_basis || 0),
    unrealizedGainPercent: day.cost_basis ? ((day.value - day.cost_basis) / day.cost_basis) * 100 : 0
  }));
};

/**
 * Calculate portfolio performance statistics
 * @param {Array} historicalData - Historical portfolio data
 * @returns {Object} - Portfolio performance statistics
 */
export const calculatePerformanceStats = (historicalData = []) => {
  if (!Array.isArray(historicalData) || historicalData.length === 0) {
    return {
      totalValue: 0,
      totalGain: 0,
      totalGainPercent: 0,
      periodChange: 0,
      periodChangePercent: 0,
      maxValue: 0,
      minValue: 0,
      volatility: 0
    };
  }
  
  const latestValue = historicalData[historicalData.length - 1].value;
  const startValue = historicalData[0].value;
  const values = historicalData.map(d => d.value);
  
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  
  // Calculate volatility (standard deviation of daily returns)
  let sumReturns = 0;
  let sumSquaredReturns = 0;
  let countReturns = 0;
  
  for (let i = 1; i < values.length; i++) {
    const dailyReturn = (values[i] - values[i-1]) / values[i-1];
    sumReturns += dailyReturn;
    sumSquaredReturns += dailyReturn * dailyReturn;
    countReturns++;
  }
  
  const meanReturn = countReturns > 0 ? sumReturns / countReturns : 0;
  const variance = countReturns > 0 ? (sumSquaredReturns / countReturns) - (meanReturn * meanReturn) : 0;
  const volatility = Math.sqrt(variance) * 100; // Convert to percentage
  
  return {
    totalValue: latestValue,
    periodChange: latestValue - startValue,
    periodChangePercent: ((latestValue - startValue) / startValue) * 100,
    maxValue,
    minValue,
    volatility
  };
};

/**
 * Calculate contribution to growth by asset type
 * @param {Object} assetTypeHistory - Historical asset type data
 * @returns {Array} - Asset type contribution data
 */
export const calculateAssetTypeContribution = (assetTypeHistory = {}) => {
  if (!assetTypeHistory || Object.keys(assetTypeHistory).length === 0) {
    return [];
  }
  
  const assetTypes = Object.keys(assetTypeHistory);
  const contributions = assetTypes.map(type => {
    const data = assetTypeHistory[type];
    if (!data || data.length < 2) return { type, contribution: 0, percentChange: 0 };
    
    const startValue = data[0].value;
    const endValue = data[data.length - 1].value;
    const contribution = endValue - startValue;
    const percentChange = (contribution / startValue) * 100;
    
    return {
      type,
      startValue,
      endValue,
      contribution,
      percentChange
    };
  });
  
  // Sort by absolute contribution
  return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
};

/**
 * Process asset allocation data for chart display
 * @param {Object} assetAllocation - Asset allocation data
 * @param {Object} colorMap - Asset type color mapping
 * @returns {Array} - Processed asset allocation data
 */
export const processAssetAllocation = (assetAllocation = {}, colorMap = {}) => {
  if (!assetAllocation || Object.keys(assetAllocation).length === 0) {
    return [];
  }
  
  return Object.entries(assetAllocation).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: data.value,
    percentage: data.percentage * 100,
    color: colorMap[type.toLowerCase()] || colorMap.other
  }));
};

/**
 * Process custom report data based on configuration
 * @param {Array} historicalData - Historical portfolio data
 * @param {Object} config - Custom report configuration
 * @returns {Array} - Processed custom report data
 */
export const processCustomReportData = (historicalData = [], config = {}) => {
  let data = [...historicalData];
  
  // Apply filters if needed
  if (config.filterAssetTypes && config.filterAssetTypes.length > 0) {
    // In a real scenario, we would apply proper filtering
    // This is a simplified simulation
    const multiplier = 0.8;
    data = data.map(day => ({
      ...day,
      value: day.value * multiplier,
      costBasis: day.costBasis * multiplier,
      unrealizedGain: day.unrealizedGain * multiplier
    }));
  }
  
  // Apply grouping
  if (config.groupBy && config.groupBy !== 'day') {
    const step = config.groupBy === 'week' ? 7 : 30;
    data = data.filter((_, index) => index % step === 0);
  }
  
  // Add benchmark data if needed
  if (config.compareWithBenchmark) {
    // Simulate benchmark data
    const benchmarkOffset = Math.random() * 0.2 - 0.1; // Random offset between -10% and +10%
    data = data.map((day, index) => {
      const benchmarkValue = day.value * (1 + benchmarkOffset + (index / data.length) * 0.05);
      return {
        ...day,
        benchmark: benchmarkValue,
        benchmarkPercent: ((benchmarkValue / data[0].value) - 1) * 100
      };
    });
  }
  
  // Calculate percentage changes if needed
  if (config.percentageView) {
    const baseValue = data[0].value;
    const baseBenchmark = data[0].benchmark;
    
    data = data.map(day => ({
      ...day,
      percentChange: ((day.value / baseValue) - 1) * 100,
      benchmarkPercentChange: config.compareWithBenchmark ? 
        ((day.benchmark / baseBenchmark) - 1) * 100 : 0
    }));
  }
  
  return data;
};

/**
 * Get a consistent color from a string
 * @param {string} str - String to generate color from
 * @param {Object} opts - Color options
 * @returns {string} - HSL color string
 */
export const getColorFromString = (str, opts = {}) => {
  const { hue, saturation = 70, lightness = 50 } = opts;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use provided hue or generate from hash
  const h = hue !== undefined ? hue : Math.abs(hash) % 360;
  return `hsl(${h}, ${saturation}%, ${lightness}%)`;
};

// Asset type colors
export const assetColors = {
  security: '#4f46e5', // Indigo
  cash: '#10b981',    // Emerald
  crypto: '#8b5cf6',  // Purple
  bond: '#ec4899',    // Pink
  metal: '#f97316',   // Orange
  currency: '#3b82f6', // Blue
  realestate: '#ef4444', // Red
  other: '#6b7280'    // Gray
};

// Sector colors
export const sectorColors = {
  'Technology': '#6366f1',
  'Financial Services': '#0ea5e9',
  'Healthcare': '#10b981',
  'Consumer Cyclical': '#f59e0b',
  'Communication Services': '#8b5cf6',
  'Industrials': '#64748b',
  'Consumer Defensive': '#14b8a6',
  'Energy': '#f97316',
  'Basic Materials': '#f43f5e',
  'Real Estate': '#84cc16',
  'Utilities': '#0284c7',
  'Unknown': '#9ca3af'
};