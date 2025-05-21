// utils/portfolioService.js
import { fetchWithAuth } from './api';

/**
 * Portfolio API Service
 * Provides methods for accessing portfolio data and analytics
 */
export const portfolioService = {
  /**
   * Fetch portfolio snapshots with specified parameters
   * @param {Object} params - Query parameters
   * @param {string} params.timeframe - Time period (1d, 1w, 1m, 3m, 6m, 1y, all)
   * @param {string} params.groupBy - Group results by (day, week, month)
   * @param {boolean} params.includeCostBasis - Include cost basis data
   * @returns {Promise<Object>} - Portfolio snapshot data
   */
  async getPortfolioSnapshots(params = {}) {
    const {
      timeframe = '3m',
      groupBy = 'day',
      includeCostBasis = true
    } = params;
    
    const queryParams = new URLSearchParams({
      timeframe,
      group_by: groupBy,
      include_cost_basis: includeCostBasis
    }).toString();
    
    const response = await fetchWithAuth(`/portfolio/snapshots?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio snapshots: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Fetch historical asset allocation data
   * @param {Object} params - Query parameters
   * @param {string} params.timeframe - Time period
   * @param {string} params.groupBy - Group results by
   * @returns {Promise<Object>} - Historical asset allocation data
   */
  async getAssetAllocationHistory(params = {}) {
    const {
      timeframe = '1y',
      groupBy = 'week'
    } = params;
    
    const queryParams = new URLSearchParams({
      timeframe,
      group_by: groupBy,
      data_type: 'asset_allocation'
    }).toString();
    
    const response = await fetchWithAuth(`/portfolio/history?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch asset allocation history: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Fetch position count history
   * @param {Object} params - Query parameters
   * @param {string} params.timeframe - Time period
   * @returns {Promise<Object>} - Position count history data
   */
  async getPositionCountHistory(params = {}) {
    const {
      timeframe = '1y'
    } = params;
    
    const queryParams = new URLSearchParams({
      timeframe,
      metric: 'position_count'
    }).toString();
    
    const response = await fetchWithAuth(`/portfolio/metrics?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch position count history: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Fetch top movers in the portfolio
   * @param {Object} params - Query parameters
   * @param {string} params.timeframe - Time period
   * @param {number} params.limit - Maximum number of positions to return
   * @returns {Promise<Array>} - Top movers data
   */
  async getTopMovers(params = {}) {
    const {
      timeframe = '1m',
      limit = 10
    } = params;
    
    const queryParams = new URLSearchParams({
      timeframe,
      limit,
      sort_by: 'percent_change',
      sort_order: 'desc'
    }).toString();
    
    const response = await fetchWithAuth(`/portfolio/positions/movers?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top movers: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Fetch portfolio performance compared to benchmarks
   * @param {Object} params - Query parameters
   * @param {string} params.timeframe - Time period
   * @param {string} params.benchmark - Benchmark to compare against (SP500, NASDAQ, etc.)
   * @returns {Promise<Object>} - Performance comparison data
   */
  async getBenchmarkComparison(params = {}) {
    const {
      timeframe = '1y',
      benchmark = 'SP500'
    } = params;
    
    const queryParams = new URLSearchParams({
      timeframe,
      benchmark
    }).toString();
    
    const response = await fetchWithAuth(`/portfolio/benchmark?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch benchmark comparison: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Fetch portfolio analytics
   * @param {Object} params - Query parameters
   * @param {string} params.timeframe - Time period
   * @returns {Promise<Object>} - Portfolio analytics data
   */
  async getPortfolioAnalytics(params = {}) {
    const {
      timeframe = '1y'
    } = params;
    
    const queryParams = new URLSearchParams({
      timeframe
    }).toString();
    
    const response = await fetchWithAuth(`/portfolio/analytics?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio analytics: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Generate a custom report based on provided configuration
   * @param {Object} config - Report configuration
   * @returns {Promise<Object>} - Custom report data
   */
  async generateCustomReport(config = {}) {
    const response = await fetchWithAuth('/portfolio/reports/custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate custom report: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Save a custom report configuration
   * @param {Object} config - Report configuration to save
   * @returns {Promise<Object>} - Saved report data
   */
  async saveCustomReport(config = {}) {
    const response = await fetchWithAuth('/portfolio/reports/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save custom report: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Get saved custom reports
   * @returns {Promise<Array>} - List of saved reports
   */
  async getSavedReports() {
    const response = await fetchWithAuth('/portfolio/reports/saved');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch saved reports: ${response.statusText}`);
    }
    
    return await response.json();
  }
};

export default portfolioService;