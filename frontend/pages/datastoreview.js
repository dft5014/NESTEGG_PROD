import React, { useState } from 'react';
import Head from 'next/head';
import {
  RefreshCw, Database, CheckCircle, XCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

// Import all DataStore hooks
import { useAccounts } from '@/store/hooks/useAccounts';
import { useAccountPositions } from '@/store/hooks/useAccountPositions';
import { useAccountsSummaryPositions } from '@/store/hooks/addAccountsPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { useDetailedPositions } from '@/store/hooks/useDetailedPositions';

export default function DataStoreViewPage() {
  const [expandedSections, setExpandedSections] = useState({
    accounts: true,
    accountPositions: false,
    accountsSummaryPositions: true,
    portfolioSummary: false,
    groupedPositions: false,
    groupedLiabilities: false,
    detailedPositions: false
  });

  // Get all datastore data
  const accountsData = useAccounts();
  const accountPositionsData = useAccountPositions();
  const accountsSummaryPositionsData = useAccountsSummaryPositions();
  const portfolioSummaryData = usePortfolioSummary();
  const groupedPositionsData = useGroupedPositions();
  const groupedLiabilitiesData = useGroupedLiabilities();
  const detailedPositionsData = useDetailedPositions();

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
        </div>
      </div>
    </>
  );
}
