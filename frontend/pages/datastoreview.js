import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  RefreshCw, Database, CheckCircle, XCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp, Terminal
} from 'lucide-react';

// Import all DataStore hooks
import { useAccounts } from '@/store/hooks/useAccounts';
import { useAccountPositions } from '@/store/hooks/useAccountPositions';
import { useAccountsSummaryPositions } from '@/store/hooks/addAccountsPositions';
import { useAccountTrends } from '@/store/hooks/useAccountTrends';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';
import { useSnapshots } from '@/store/hooks/useSnapshots';
import { usePositionHistory } from '@/store/hooks/usePositionHistory';

export default function DataStoreViewPage() {
  const [expandedSections, setExpandedSections] = useState({
    accounts: true,
    accountPositions: false,
    accountsSummaryPositions: true,
    portfolioSummary: false,
    portfolioTrends: false,
    groupedPositions: false,
    groupedLiabilities: false,
    detailedPositions: false,
    snapshots: false,
    accountTrends: false,
    positionHistory: false,
    logs: true
  });
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);
  const logCountRef = useRef(0);

  // State for parametrized hooks
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedPositionIdentifier, setSelectedPositionIdentifier] = useState(null);

  // Helper to add logs
  const addLog = (hookName, type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: logCountRef.current++,
      timestamp,
      hookName,
      type, // 'info', 'success', 'error', 'warning'
      message,
      data
    };

    console.log(`[DataStoreView - ${hookName}] ${message}`, data || '');
    setLogs(prev => [...prev, logEntry].slice(-100)); // Keep last 100 logs
  };

  // Get all datastore data
  const accountsData = useAccounts();
  const accountPositionsData = useAccountPositions();
  const accountsSummaryPositionsData = useAccountsSummaryPositions();
  const portfolioSummaryData = usePortfolioSummary();
  const portfolioTrendsData = usePortfolioTrends();
  const groupedPositionsData = useGroupedPositions();
  const groupedLiabilitiesData = useGroupedLiabilities();
  const detailedPositionsData = useDetailedPositions();
  const snapshotsData = useSnapshots();

  // Parametrized hooks - only call if parameter is selected
  const accountTrendsData = useAccountTrends(selectedAccountId);
  const positionHistoryData = usePositionHistory(selectedPositionIdentifier, { enabled: !!selectedPositionIdentifier });

  // Log initial mount
  useEffect(() => {
    addLog('PAGE', 'info', 'DataStoreView mounted - observing all hooks');
  }, []);

  // Monitor Accounts
  useEffect(() => {
    addLog('useAccounts', 'info', `State changed - Loading: ${accountsData.loading}, Error: ${!!accountsData.error}, Data: ${accountsData.accounts?.length || 0} items, Stale: ${accountsData.isStale}`, {
      loading: accountsData.loading,
      error: accountsData.error,
      dataCount: accountsData.accounts?.length,
      isStale: accountsData.isStale,
      lastFetched: accountsData.lastFetched
    });
  }, [accountsData.loading, accountsData.error, accountsData.accounts, accountsData.isStale, accountsData.lastFetched]);

  // Monitor Account Positions
  useEffect(() => {
    addLog('useAccountPositions', 'info', `State changed - Loading: ${accountPositionsData.loading}, Error: ${!!accountPositionsData.error}, Data: ${accountPositionsData.positions?.length || 0} items, Stale: ${accountPositionsData.isStale}`, {
      loading: accountPositionsData.loading,
      error: accountPositionsData.error,
      dataCount: accountPositionsData.positions?.length,
      isStale: accountPositionsData.isStale,
      lastFetched: accountPositionsData.lastFetched
    });
  }, [accountPositionsData.loading, accountPositionsData.error, accountPositionsData.positions, accountPositionsData.isStale, accountPositionsData.lastFetched]);

  // Monitor Accounts Summary Positions (NEW)
  useEffect(() => {
    const type = accountsSummaryPositionsData.error ? 'error' : accountsSummaryPositionsData.loading ? 'warning' : 'success';
    addLog('useAccountsSummaryPositions', type, `State changed - Loading: ${accountsSummaryPositionsData.loading}, Error: ${!!accountsSummaryPositionsData.error}, Data: ${accountsSummaryPositionsData.positions?.length || 0} items, Stale: ${accountsSummaryPositionsData.isStale}`, {
      loading: accountsSummaryPositionsData.loading,
      error: accountsSummaryPositionsData.error,
      dataCount: accountsSummaryPositionsData.positions?.length,
      isStale: accountsSummaryPositionsData.isStale,
      lastFetched: accountsSummaryPositionsData.lastFetched,
      summary: accountsSummaryPositionsData.summary
    });
  }, [accountsSummaryPositionsData.loading, accountsSummaryPositionsData.error, accountsSummaryPositionsData.positions, accountsSummaryPositionsData.isStale, accountsSummaryPositionsData.lastFetched]);

  // Monitor Portfolio Summary
  useEffect(() => {
    addLog('usePortfolioSummary', 'info', `State changed - Loading: ${portfolioSummaryData.loading}, Error: ${!!portfolioSummaryData.error}, Has Data: ${!!portfolioSummaryData.summary}, Stale: ${portfolioSummaryData.isStale}`, {
      loading: portfolioSummaryData.loading,
      error: portfolioSummaryData.error,
      hasData: !!portfolioSummaryData.summary,
      isStale: portfolioSummaryData.isStale,
      lastFetched: portfolioSummaryData.lastFetched
    });
  }, [portfolioSummaryData.loading, portfolioSummaryData.error, portfolioSummaryData.summary, portfolioSummaryData.isStale, portfolioSummaryData.lastFetched]);

  // Monitor Grouped Positions
  useEffect(() => {
    addLog('useGroupedPositions', 'info', `State changed - Loading: ${groupedPositionsData.loading}, Error: ${!!groupedPositionsData.error}, Data: ${groupedPositionsData.positions?.length || 0} items, Stale: ${groupedPositionsData.isStale}`, {
      loading: groupedPositionsData.loading,
      error: groupedPositionsData.error,
      dataCount: groupedPositionsData.positions?.length,
      isStale: groupedPositionsData.isStale,
      lastFetched: groupedPositionsData.lastFetched
    });
  }, [groupedPositionsData.loading, groupedPositionsData.error, groupedPositionsData.positions, groupedPositionsData.isStale, groupedPositionsData.lastFetched]);

  // Monitor Grouped Liabilities
  useEffect(() => {
    addLog('useGroupedLiabilities', 'info', `State changed - Loading: ${groupedLiabilitiesData.loading}, Error: ${!!groupedLiabilitiesData.error}, Data: ${groupedLiabilitiesData.liabilities?.length || 0} items, Stale: ${groupedLiabilitiesData.isStale}`, {
      loading: groupedLiabilitiesData.loading,
      error: groupedLiabilitiesData.error,
      dataCount: groupedLiabilitiesData.liabilities?.length,
      isStale: groupedLiabilitiesData.isStale,
      lastFetched: groupedLiabilitiesData.lastFetched
    });
  }, [groupedLiabilitiesData.loading, groupedLiabilitiesData.error, groupedLiabilitiesData.liabilities, groupedLiabilitiesData.isStale, groupedLiabilitiesData.lastFetched]);

  // Monitor Detailed Positions
  useEffect(() => {
    addLog('useDetailedPositions', 'info', `State changed - Loading: ${detailedPositionsData.loading}, Error: ${!!detailedPositionsData.error}, Data: ${detailedPositionsData.positions?.length || 0} items, Stale: ${detailedPositionsData.isStale}`, {
      loading: detailedPositionsData.loading,
      error: detailedPositionsData.error,
      dataCount: detailedPositionsData.positions?.length,
      isStale: detailedPositionsData.isStale,
      lastFetched: detailedPositionsData.lastFetched
    });
  }, [detailedPositionsData.loading, detailedPositionsData.error, detailedPositionsData.positions, detailedPositionsData.isStale, detailedPositionsData.lastFetched]);

  // Monitor Portfolio Trends
  useEffect(() => {
    addLog('usePortfolioTrends', 'info', `State changed - Loading: ${portfolioTrendsData.loading}, Error: ${!!portfolioTrendsData.error}, Has Trends: ${!!portfolioTrendsData.trends}`, {
      loading: portfolioTrendsData.loading,
      error: portfolioTrendsData.error,
      hasTrends: !!portfolioTrendsData.trends,
      trendsLength: portfolioTrendsData.trends?.chartData?.length
    });
  }, [portfolioTrendsData.loading, portfolioTrendsData.error, portfolioTrendsData.trends]);

  // Monitor Snapshots
  useEffect(() => {
    addLog('useSnapshots', 'info', `State changed - Loading: ${snapshotsData.isLoading}, Error: ${!!snapshotsData.error}, Has Data: ${!!snapshotsData.snapshots}, Dates: ${snapshotsData.dates?.length || 0}`, {
      loading: snapshotsData.isLoading,
      error: snapshotsData.error,
      hasData: !!snapshotsData.snapshots,
      datesCount: snapshotsData.dates?.length,
      lastFetched: snapshotsData.lastFetched
    });
  }, [snapshotsData.isLoading, snapshotsData.error, snapshotsData.snapshots, snapshotsData.dates, snapshotsData.lastFetched]);

  // Monitor Account Trends (parametrized)
  useEffect(() => {
    if (selectedAccountId) {
      addLog('useAccountTrends', 'info', `State changed - Account: ${selectedAccountId}, Loading: ${accountTrendsData.loading}, Error: ${!!accountTrendsData.error}, Trends: ${accountTrendsData.accountTrends?.length || 0}`, {
        accountId: selectedAccountId,
        loading: accountTrendsData.loading,
        error: accountTrendsData.error,
        trendsCount: accountTrendsData.accountTrends?.length,
        metrics: accountTrendsData.metrics
      });
    }
  }, [selectedAccountId, accountTrendsData.loading, accountTrendsData.error, accountTrendsData.accountTrends, accountTrendsData.metrics]);

  // Monitor Position History (parametrized)
  useEffect(() => {
    if (selectedPositionIdentifier) {
      addLog('usePositionHistory', 'info', `State changed - Identifier: ${selectedPositionIdentifier}, Loading: ${positionHistoryData.loading}, Error: ${!!positionHistoryData.error}, History: ${positionHistoryData.history?.length || 0}`, {
        identifier: selectedPositionIdentifier,
        loading: positionHistoryData.loading,
        error: positionHistoryData.error,
        historyCount: positionHistoryData.history?.length,
        lastFetched: positionHistoryData.lastFetched
      });
    }
  }, [selectedPositionIdentifier, positionHistoryData.loading, positionHistoryData.error, positionHistoryData.history, positionHistoryData.lastFetched]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const DataStoreSection = ({ title, hookName, data, loading, error, lastFetched, refresh, isStale }) => {
    const isExpanded = expandedSections[hookName];
    const dataArray = Array.isArray(data) ? data : (data ? [data] : []);
    const hasData = dataArray.length > 0 || (data && Object.keys(data).length > 0);

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4">
        {/* Header */}
        <div
          className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => toggleSection(hookName)}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

            {/* Status Badges */}
            {loading && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Loading
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                <XCircle className="w-3 h-3" />
                Error
              </span>
            )}
            {!loading && !error && hasData && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                <CheckCircle className="w-3 h-3" />
                Loaded
              </span>
            )}
            {!loading && !error && !hasData && (
              <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                <AlertCircle className="w-3 h-3" />
                No Data
              </span>
            )}
            {isStale && (
              <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                <AlertCircle className="w-3 h-3" />
                Stale
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {lastFetched && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {new Date(lastFetched).toLocaleTimeString()}
              </span>
            )}
            {refresh && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refresh();
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-4 text-xs text-gray-600">
          <div>
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Stale:</strong> {isStale ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Has Error:</strong> {error ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Has Data:</strong> {hasData ? 'Yes' : 'No'}
          </div>
          {Array.isArray(data) && (
            <div>
              <strong>Count:</strong> {data.length}
            </div>
          )}
          {lastFetched && (
            <div>
              <strong>Last Fetched:</strong> {Math.round((Date.now() - lastFetched) / 1000)}s ago
            </div>
          )}
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-4">
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Loading State */}
            {loading && !hasData && (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>Loading data...</p>
              </div>
            )}

            {/* Data Display */}
            {!loading && hasData && (
              <div className="space-y-4">
                {/* Count Info */}
                {Array.isArray(data) && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-900">
                      <strong>Total Items:</strong> {data.length}
                    </p>
                  </div>
                )}

                {/* Raw Data */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Raw Data:</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>

                {/* Sample Item (for arrays) */}
                {Array.isArray(data) && data.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">First Item:</h3>
                    <pre className="bg-gray-900 text-yellow-400 p-4 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(data[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* No Data State */}
            {!loading && !hasData && !error && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No data available</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const SummarySection = ({ title, data }) => {
    if (!data) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
        <pre className="bg-gray-900 text-cyan-400 p-4 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  const ParametrizedHookSection = ({
    title,
    hookName,
    options,
    selectedValue,
    onSelectChange,
    data,
    loading,
    error,
    lastFetched,
    refresh,
    parameterLabel,
    noSelectionMessage
  }) => {
    const isExpanded = expandedSections[hookName];
    const dataArray = Array.isArray(data) ? data : (data ? [data] : []);
    const hasData = dataArray.length > 0 || (data && Object.keys(data).length > 0);

    return (
      <div className="bg-white rounded-lg border-2 border-purple-200 shadow-sm overflow-hidden mb-4">
        {/* Header */}
        <div
          className="p-4 bg-purple-50 border-b-2 border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
          onClick={() => toggleSection(hookName)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <Database className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

              {/* Status Badges */}
              {loading && selectedValue && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Loading
                </span>
              )}
              {error && selectedValue && (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  <XCircle className="w-3 h-3" />
                  Error
                </span>
              )}
              {!loading && !error && hasData && selectedValue && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Loaded
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Selector Bar */}
        <div className="px-4 py-3 bg-purple-100 border-b border-purple-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {parameterLabel}
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedValue || ''}
              onChange={(e) => onSelectChange(e.target.value || null)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select {parameterLabel} --</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {refresh && selectedValue && (
              <button
                onClick={() => refresh()}
                className="p-2 hover:bg-purple-200 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-purple-600" />
              </button>
            )}
          </div>
        </div>

        {/* Metadata Bar */}
        {selectedValue && (
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-4 text-xs text-gray-600">
            <div>
              <strong>Selected:</strong> {selectedValue}
            </div>
            <div>
              <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Has Error:</strong> {error ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Has Data:</strong> {hasData ? 'Yes' : 'No'}
            </div>
            {Array.isArray(data) && (
              <div>
                <strong>Count:</strong> {data.length}
              </div>
            )}
            {lastFetched && (
              <div>
                <strong>Last Fetched:</strong> {Math.round((Date.now() - lastFetched) / 1000)}s ago
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {isExpanded && (
          <div className="p-4">
            {/* No Selection State */}
            {!selectedValue && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{noSelectionMessage}</p>
              </div>
            )}

            {/* Error Display */}
            {selectedValue && error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Loading State */}
            {selectedValue && loading && !hasData && (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>Loading data...</p>
              </div>
            )}

            {/* Data Display */}
            {selectedValue && !loading && hasData && (
              <div className="space-y-4">
                {/* Count Info */}
                {Array.isArray(data) && (
                  <div className="p-3 bg-purple-50 rounded border border-purple-200">
                    <p className="text-sm text-purple-900">
                      <strong>Total Items:</strong> {data.length}
                    </p>
                  </div>
                )}

                {/* Raw Data */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Raw Data:</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>

                {/* Sample Item (for arrays) */}
                {Array.isArray(data) && data.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">First Item:</h3>
                    <pre className="bg-gray-900 text-yellow-400 p-4 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(data[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* No Data State */}
            {selectedValue && !loading && !hasData && !error && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>No data available for selected {parameterLabel.toLowerCase()}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const LogsSection = () => {
    const isExpanded = expandedSections.logs;

    const getLogColor = (type) => {
      switch (type) {
        case 'error': return 'text-red-400';
        case 'warning': return 'text-yellow-400';
        case 'success': return 'text-green-400';
        default: return 'text-gray-300';
      }
    };

    const getLogBg = (type) => {
      switch (type) {
        case 'error': return 'bg-red-900/20';
        case 'warning': return 'bg-yellow-900/20';
        case 'success': return 'bg-green-900/20';
        default: return '';
      }
    };

    return (
      <div className="bg-white rounded-lg border-2 border-blue-300 shadow-lg overflow-hidden mb-6">
        {/* Header */}
        <div
          className="p-4 bg-blue-50 border-b-2 border-blue-300 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => toggleSection('logs')}
        >
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Real-Time Logs</h2>
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
              {logs.length} logs
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLogs([]);
              }}
              className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-100 transition-colors"
            >
              Clear Logs
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Logs Content */}
        {isExpanded && (
          <div className="bg-gray-950 p-4 max-h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No logs yet. Logs will appear as hooks update.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded ${getLogBg(log.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 shrink-0">{log.timestamp}</span>
                      <span className="text-blue-400 shrink-0 font-semibold">[{log.hookName}]</span>
                      <span className={`${getLogColor(log.type)} flex-1`}>{log.message}</span>
                    </div>
                    {log.data && (
                      <div className="mt-1 ml-28 text-gray-400 text-[10px] overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>DataStore View | NestEgg</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DataStore View</h1>
            <p className="text-gray-600">
              Real-time view of all DataStore hooks and their data
            </p>
          </div>

          {/* Real-Time Logs */}
          <LogsSection />

          {/* Accounts */}
          <DataStoreSection
            title="useAccounts"
            hookName="accounts"
            data={accountsData.accounts}
            loading={accountsData.loading}
            error={accountsData.error}
            lastFetched={accountsData.lastFetched}
            isStale={accountsData.isStale}
            refresh={accountsData.refresh}
          />
          {accountsData.summary && (
            <SummarySection title="Accounts Summary" data={accountsData.summary} />
          )}

          {/* Account Positions */}
          <DataStoreSection
            title="useAccountPositions"
            hookName="accountPositions"
            data={accountPositionsData.positions}
            loading={accountPositionsData.loading}
            error={accountPositionsData.error}
            lastFetched={accountPositionsData.lastFetched}
            isStale={accountPositionsData.isStale}
            refresh={accountPositionsData.refreshData}
          />
          {accountPositionsData.summary && (
            <SummarySection title="Account Positions Summary" data={accountPositionsData.summary} />
          )}

          {/* Accounts Summary Positions - NEW! */}
          <DataStoreSection
            title="useAccountsSummaryPositions (NEW)"
            hookName="accountsSummaryPositions"
            data={accountsSummaryPositionsData.positions}
            loading={accountsSummaryPositionsData.loading}
            error={accountsSummaryPositionsData.error}
            lastFetched={accountsSummaryPositionsData.lastFetched}
            isStale={accountsSummaryPositionsData.isStale}
            refresh={accountsSummaryPositionsData.refresh}
          />
          {accountsSummaryPositionsData.summary && (
            <SummarySection
              title="Accounts Summary Positions Summary"
              data={accountsSummaryPositionsData.summary}
            />
          )}
          {accountsSummaryPositionsData.metrics && (
            <SummarySection
              title="Accounts Summary Positions Metrics"
              data={accountsSummaryPositionsData.metrics}
            />
          )}

          {/* Portfolio Summary */}
          <DataStoreSection
            title="usePortfolioSummary"
            hookName="portfolioSummary"
            data={portfolioSummaryData.summary}
            loading={portfolioSummaryData.loading}
            error={portfolioSummaryData.error}
            lastFetched={portfolioSummaryData.lastFetched}
            isStale={portfolioSummaryData.isStale}
            refresh={portfolioSummaryData.refresh}
          />

          {/* Grouped Positions */}
          <DataStoreSection
            title="useGroupedPositions"
            hookName="groupedPositions"
            data={groupedPositionsData.positions}
            loading={groupedPositionsData.loading}
            error={groupedPositionsData.error}
            lastFetched={groupedPositionsData.lastFetched}
            isStale={groupedPositionsData.isStale}
            refresh={groupedPositionsData.refresh}
          />
          {groupedPositionsData.summary && (
            <SummarySection title="Grouped Positions Summary" data={groupedPositionsData.summary} />
          )}

          {/* Grouped Liabilities */}
          <DataStoreSection
            title="useGroupedLiabilities"
            hookName="groupedLiabilities"
            data={groupedLiabilitiesData.liabilities}
            loading={groupedLiabilitiesData.loading}
            error={groupedLiabilitiesData.error}
            lastFetched={groupedLiabilitiesData.lastFetched}
            isStale={groupedLiabilitiesData.isStale}
            refresh={groupedLiabilitiesData.refresh}
          />
          {groupedLiabilitiesData.summary && (
            <SummarySection title="Grouped Liabilities Summary" data={groupedLiabilitiesData.summary} />
          )}

          {/* Detailed Positions */}
          <DataStoreSection
            title="useDetailedPositions"
            hookName="detailedPositions"
            data={detailedPositionsData.positions}
            loading={detailedPositionsData.loading}
            error={detailedPositionsData.error}
            lastFetched={detailedPositionsData.lastFetched}
            isStale={detailedPositionsData.isStale}
            refresh={detailedPositionsData.refresh}
          />

          {/* Portfolio Trends */}
          <DataStoreSection
            title="usePortfolioTrends"
            hookName="portfolioTrends"
            data={portfolioTrendsData.trends}
            loading={portfolioTrendsData.loading}
            error={portfolioTrendsData.error}
            lastFetched={null}
            isStale={false}
            refresh={null}
          />

          {/* Snapshots */}
          <DataStoreSection
            title="useSnapshots"
            hookName="snapshots"
            data={snapshotsData.snapshots}
            loading={snapshotsData.isLoading}
            error={snapshotsData.error}
            lastFetched={snapshotsData.lastFetched}
            isStale={false}
            refresh={snapshotsData.refetch}
          />
          {snapshotsData.snapshotsByDate && Object.keys(snapshotsData.snapshotsByDate).length > 0 && (
            <SummarySection
              title="Snapshots By Date (first 3 dates)"
              data={Object.entries(snapshotsData.snapshotsByDate).slice(0, 3).reduce((acc, [key, val]) => {
                acc[key] = val;
                return acc;
              }, {})}
            />
          )}

          {/* Account Trends - Parametrized */}
          <ParametrizedHookSection
            title="useAccountTrends (Parametrized)"
            hookName="accountTrends"
            options={accountsData.accounts?.map(acc => ({
              value: acc.id || acc.account_id,
              label: `${acc.name || acc.account_name} (${acc.institution}) - ${acc.id || acc.account_id}`
            })) || []}
            selectedValue={selectedAccountId}
            onSelectChange={setSelectedAccountId}
            data={accountTrendsData.accountTrends}
            loading={accountTrendsData.loading}
            error={accountTrendsData.error}
            lastFetched={null}
            refresh={null}
            parameterLabel="Account"
            noSelectionMessage="Please select an account from the dropdown to view trends"
          />
          {selectedAccountId && accountTrendsData.metrics && (
            <SummarySection title="Account Trends Metrics" data={accountTrendsData.metrics} />
          )}

          {/* Position History - Parametrized */}
          <ParametrizedHookSection
            title="usePositionHistory (Parametrized)"
            hookName="positionHistory"
            options={groupedPositionsData.positions?.map(pos => ({
              value: pos.identifier,
              label: `${pos.name || pos.identifier} (${pos.asset_type})`
            })) || []}
            selectedValue={selectedPositionIdentifier}
            onSelectChange={setSelectedPositionIdentifier}
            data={positionHistoryData.history}
            loading={positionHistoryData.loading}
            error={positionHistoryData.error}
            lastFetched={positionHistoryData.lastFetched}
            refresh={positionHistoryData.refresh}
            parameterLabel="Position"
            noSelectionMessage="Please select a position from the dropdown to view history"
          />

          {/* Note on useDataMutations */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">Note: useDataMutations</h3>
            <p className="text-sm text-yellow-700">
              <strong>useDataMutations()</strong> returns mutation functions (add/update/delete operations), not display data.
              It cannot be visualized in this view.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
