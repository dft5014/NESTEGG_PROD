// pages/portfolio-snapshots-table.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';

export default function PortfolioSnapshotsTable() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshotData, setSnapshotData] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [positionRows, setPositionRows] = useState([]);
  
  // Format utilities
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Asset type colors
  const getAssetColor = (type) => {
    const colors = {
      security: '#4f46e5',
      cash: '#10b981',
      crypto: '#8b5cf6',
      metal: '#f97316',
      realestate: '#ef4444',
      other: '#6b7280'
    };
    return colors[type] || colors.other;
  };
  
  // Fetch snapshot data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all snapshots
        const response = await fetchWithAuth('/portfolio/snapshots?timeframe=all&group_by=day&include_positions=true');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch snapshots: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw snapshot data:', data);
        setSnapshotData(data);
        
        // Extract dates from daily snapshots
        if (data.performance?.daily) {
          const dates = data.performance.daily.map(d => d.date);
          // Take last 10 dates for display
          setSelectedDates(dates.slice(-10));
        }
        
        // Extract unique positions across all snapshots
        const positionMap = new Map();
        
        // If we have position-level data in snapshots
        if (data.position_snapshots) {
          data.position_snapshots.forEach(snapshot => {
            snapshot.positions?.forEach(pos => {
              const key = `${pos.asset_type}_${pos.ticker || pos.identifier}`;
              if (!positionMap.has(key)) {
                positionMap.set(key, {
                  asset_type: pos.asset_type,
                  identifier: pos.ticker || pos.identifier,
                  name: pos.name || pos.ticker || pos.identifier,
                  values: {}
                });
              }
              positionMap.get(key).values[snapshot.date] = pos.market_value || pos.value || 0;
            });
          });
        } else if (data.performance?.daily) {
          // If no position-level data, create from daily totals
          // This is a simplified view showing just asset type totals
          const assetTypes = data.asset_allocation ? Object.keys(data.asset_allocation) : ['security', 'cash', 'crypto', 'metal'];
          
          assetTypes.forEach(assetType => {
            const key = `${assetType}_TOTAL`;
            positionMap.set(key, {
              asset_type: assetType,
              identifier: 'TOTAL',
              name: `${assetType.charAt(0).toUpperCase() + assetType.slice(1)} Total`,
              values: {}
            });
            
            // Calculate values for each date
            data.performance.daily.forEach(day => {
              const dayTotal = day.value || 0;
              const assetAllocation = data.asset_allocation?.[assetType];
              if (assetAllocation && dayTotal > 0) {
                // Proportional calculation based on current allocation
                const proportion = assetAllocation.percentage || 0;
                positionMap.get(key).values[day.date] = dayTotal * proportion;
              }
            });
          });
        }
        
        // Convert map to array and sort
        const rows = Array.from(positionMap.values()).sort((a, b) => {
          if (a.asset_type !== b.asset_type) {
            return a.asset_type.localeCompare(b.asset_type);
          }
          return a.identifier.localeCompare(b.identifier);
        });
        
        setPositionRows(rows);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-300">Loading snapshot data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-red-400 text-lg font-semibold mb-2">Error Loading Data</h2>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Calculate column totals
  const columnTotals = {};
  selectedDates.forEach(date => {
    columnTotals[date] = positionRows.reduce((sum, row) => {
      return sum + (row.values[date] || 0);
    }, 0);
  });
  
  // Group rows by asset type
  const groupedRows = {};
  positionRows.forEach(row => {
    if (!groupedRows[row.asset_type]) {
      groupedRows[row.asset_type] = [];
    }
    groupedRows[row.asset_type].push(row);
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Head>
        <title>Portfolio Snapshots | NestEgg</title>
      </Head>
      
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Portfolio Snapshots - Raw Data
              </h1>
              <p className="text-gray-400">
                Direct view of portfolio snapshot data by date
              </p>
            </div>
            <button
              onClick={() => router.push('/reports')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Back to Reports
            </button>
          </div>
        </div>
        
        {/* Debug Info */}
        {snapshotData && (
          <div className="max-w-7xl mx-auto mb-6 bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Data Structure:</h3>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Daily snapshots: {snapshotData.performance?.daily?.length || 0}</p>
              <p>Position snapshots available: {snapshotData.position_snapshots ? 'Yes' : 'No'}</p>
              <p>Asset types: {Object.keys(snapshotData.asset_allocation || {}).join(', ')}</p>
              <p>Date range: {selectedDates[0]} to {selectedDates[selectedDates.length - 1]}</p>
            </div>
          </div>
        )}
        
        {/* Main Table */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10">
                      Asset Type / Position
                    </th>
                    {selectedDates.map((date, idx) => (
                      <th key={idx} className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[120px]">
                        {formatDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {Object.entries(groupedRows).map(([assetType, rows]) => (
                    <React.Fragment key={assetType}>
                      {/* Asset Type Header */}
                      <tr className="bg-gray-850">
                        <td className="px-6 py-3 sticky left-0 bg-gray-850">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: getAssetColor(assetType) }}
                            />
                            <span className="text-sm font-semibold text-white capitalize">
                              {assetType}
                            </span>
                          </div>
                        </td>
                        {selectedDates.map((date, idx) => {
                          const total = rows.reduce((sum, row) => sum + (row.values[date] || 0), 0);
                          return (
                            <td key={idx} className="px-6 py-3 text-right">
                              <span className="text-sm font-semibold text-gray-300">
                                {formatCurrency(total)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                      
                      {/* Individual Positions */}
                      {rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-gray-750 transition-colors">
                          <td className="px-6 py-2 pl-12 sticky left-0 bg-gray-800">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {row.identifier}
                              </div>
                              <div className="text-xs text-gray-400">
                                {row.name}
                              </div>
                            </div>
                          </td>
                          {selectedDates.map((date, idx) => {
                            const value = row.values[date] || 0;
                            return (
                              <td key={idx} className="px-6 py-2 text-right">
                                <span className="text-sm text-white">
                                  {formatCurrency(value)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* Grand Total Row */}
                  <tr className="bg-gray-900 font-bold">
                    <td className="px-6 py-4 sticky left-0 bg-gray-900">
                      <span className="text-sm text-white">Portfolio Total</span>
                    </td>
                    {selectedDates.map((date, idx) => (
                      <td key={idx} className="px-6 py-4 text-right">
                        <span className="text-sm text-white">
                          {formatCurrency(columnTotals[date])}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Raw JSON Data (for debugging) */}
          <details className="mt-8">
            <summary className="cursor-pointer text-gray-400 hover:text-white">
              View Raw JSON Data
            </summary>
            <pre className="mt-4 p-4 bg-gray-800 rounded-lg overflow-x-auto text-xs text-gray-300">
              {JSON.stringify(snapshotData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}