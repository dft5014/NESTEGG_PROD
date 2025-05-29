// pages/position-comparison-minimal.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';

export default function PositionComparisonMinimal() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPositions, setCurrentPositions] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set(['security', 'crypto', 'cash']));
  
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
  
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };
  
  // Asset type colors
  const getAssetColor = (type) => {
    const colors = {
      security: 'from-blue-500 to-blue-600',
      cash: 'from-green-500 to-green-600',
      crypto: 'from-purple-500 to-purple-600',
      metal: 'from-orange-500 to-orange-600',
      realestate: 'from-red-500 to-red-600',
      other: 'from-gray-500 to-gray-600'
    };
    return colors[type] || colors.other;
  };
  
  // Toggle group expansion
  const toggleGroup = (assetType) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(assetType)) {
      newExpanded.delete(assetType);
    } else {
      newExpanded.add(assetType);
    }
    setExpandedGroups(newExpanded);
  };
  
  // Fetch positions
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching positions...');
        const response = await fetchWithAuth('/positions/unified');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch positions: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received positions:', data.positions?.length || 0);
        
        const positions = data.positions || [];
        setCurrentPositions(positions);
        
        // Group by asset type with calculations
        const grouped = {};
        positions.forEach(pos => {
          const type = pos.asset_type || 'other';
          if (!grouped[type]) {
            grouped[type] = {
              assetType: type,
              positions: [],
              totalValue: 0,
              totalCostBasis: 0,
              totalGainLoss: 0
            };
          }
          
          const value = pos.current_value || 0;
          const costBasis = pos.cost_basis || pos.total_cost_basis || 0;
          const gainLoss = value - costBasis;
          const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
          
          grouped[type].positions.push({
            ...pos,
            value,
            costBasis,
            gainLoss,
            gainLossPercent
          });
          
          grouped[type].totalValue += value;
          grouped[type].totalCostBasis += costBasis;
          grouped[type].totalGainLoss += gainLoss;
        });
        
        // Calculate percentages and sort
        const comparison = Object.values(grouped).map(group => ({
          ...group,
          totalGainLossPercent: group.totalCostBasis > 0 
            ? (group.totalGainLoss / group.totalCostBasis) * 100 
            : 0,
          positions: group.positions.sort((a, b) => b.value - a.value)
        })).sort((a, b) => b.totalValue - a.totalValue);
        
        setComparisonData(comparison);
        
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Calculate totals
  const grandTotals = comparisonData.reduce((acc, group) => ({
    value: acc.value + group.totalValue,
    costBasis: acc.costBasis + group.totalCostBasis,
    gainLoss: acc.gainLoss + group.totalGainLoss
  }), { value: 0, costBasis: 0, gainLoss: 0 });
  
  grandTotals.gainLossPercent = grandTotals.costBasis > 0 
    ? (grandTotals.gainLoss / grandTotals.costBasis) * 100 
    : 0;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-300">Loading positions...</p>
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Head>
        <title>Position Analysis | NestEgg</title>
      </Head>
      
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Position Analysis
              </h1>
              <p className="text-gray-400">
                Comprehensive view of your portfolio positions
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
        
        {/* Summary Cards */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Total Value</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(grandTotals.value)}</div>
              <div className="text-xs text-gray-500 mt-1">{currentPositions.length} positions</div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Cost Basis</div>
              <div className="text-2xl font-bold text-white">{formatCurrency(grandTotals.costBasis)}</div>
              <div className="text-xs text-gray-500 mt-1">Total invested</div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Gain/Loss</div>
              <div className={`text-2xl font-bold ${grandTotals.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(grandTotals.gainLoss)}
              </div>
              <div className={`text-xs ${grandTotals.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'} mt-1`}>
                {formatPercentage(grandTotals.gainLossPercent)}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
              <div className="text-gray-400 text-sm mb-1">Asset Types</div>
              <div className="text-2xl font-bold text-white">{comparisonData.length}</div>
              <div className="text-xs text-gray-500 mt-1">Diversified portfolio</div>
            </div>
          </div>
        </div>
        
        {/* Main Table */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Asset / Position
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Market Value
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cost Basis
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Gain/Loss
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Return %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {comparisonData.map((group, idx) => (
                    <React.Fragment key={idx}>
                      {/* Asset Type Header Row */}
                      <tr 
                        className={`bg-gradient-to-r ${getAssetColor(group.assetType)} bg-opacity-10 hover:bg-opacity-20 cursor-pointer transition-all`}
                        onClick={() => toggleGroup(group.assetType)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`w-1 h-8 bg-gradient-to-b ${getAssetColor(group.assetType)} rounded-full mr-3`}></div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-sm font-semibold text-white capitalize">
                                  {group.assetType}
                                </span>
                                <span className="ml-2 text-xs text-gray-400">
                                  ({group.positions.length})
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {expandedGroups.has(group.assetType) ? 'Click to collapse' : 'Click to expand'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-white">
                            {formatCurrency(group.totalValue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-sm font-semibold text-gray-300">
                            {formatCurrency(group.totalCostBasis)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`text-sm font-semibold ${group.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(group.totalGainLoss)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            group.totalGainLossPercent >= 0 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {formatPercentage(group.totalGainLossPercent)}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Individual Positions */}
                      {expandedGroups.has(group.assetType) && group.positions.map((pos, posIdx) => (
                        <tr key={posIdx} className="hover:bg-gray-750 transition-colors">
                          <td className="px-6 py-3 pl-14">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {pos.ticker || pos.identifier || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {pos.name || pos.account_name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-sm text-white">
                              {formatCurrency(pos.value)}
                            </div>
                            {pos.quantity && (
                              <div className="text-xs text-gray-500">
                                {pos.quantity} @ {formatCurrency(pos.current_price)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="text-sm text-gray-300">
                              {formatCurrency(pos.costBasis)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className={`text-sm ${pos.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatCurrency(pos.gainLoss)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className={`text-sm ${pos.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(pos.gainLossPercent)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* Grand Total Row */}
                  <tr className="bg-gray-900 font-bold">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                        <span className="text-sm text-white">Portfolio Total</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-white">
                      {formatCurrency(grandTotals.value)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-300">
                      {formatCurrency(grandTotals.costBasis)}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-semibold ${
                      grandTotals.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(grandTotals.gainLoss)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        grandTotals.gainLossPercent >= 0 
                          ? 'bg-green-900/50 text-green-400' 
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {formatPercentage(grandTotals.gainLossPercent)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}