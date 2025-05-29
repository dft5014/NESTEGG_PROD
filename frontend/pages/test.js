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
        
        // Simple comparison - group by asset type
        const grouped = {};
        positions.forEach(pos => {
          const type = pos.asset_type || 'other';
          if (!grouped[type]) {
            grouped[type] = {
              assetType: type,
              positions: [],
              totalValue: 0
            };
          }
          grouped[type].positions.push(pos);
          grouped[type].totalValue += (pos.current_value || 0);
        });
        
        const comparison = Object.values(grouped);
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
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Error: {error}</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Head>
        <title>Position Comparison Minimal</title>
      </Head>
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Position Comparison (Minimal)</h1>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <p>Total Positions: {currentPositions.length}</p>
          <p>Asset Types: {comparisonData.length}</p>
        </div>
        
        {/* Simple table without any complex components */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Asset Type</th>
                <th className="px-4 py-2 text-right">Count</th>
                <th className="px-4 py-2 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((group, idx) => (
                <tr key={idx} className="border-t border-gray-700">
                  <td className="px-4 py-2 capitalize">{group.assetType}</td>
                  <td className="px-4 py-2 text-right">{group.positions.length}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(group.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Position details */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Position Details</h2>
          {comparisonData.map((group, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="text-lg font-semibold mb-2 capitalize">{group.assetType}</h3>
              <div className="bg-gray-800 rounded-lg p-4">
                {group.positions.map((pos, posIdx) => (
                  <div key={posIdx} className="flex justify-between py-1">
                    <span>{pos.ticker || pos.identifier || 'Unknown'}</span>
                    <span>{formatCurrency(pos.current_value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}