// pages/portfolio-snapshots-analysis.js
import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';

export default function PortfolioSnapshotsAnalysis() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [displayDates, setDisplayDates] = useState([]);
  const [dateRange, setDateRange] = useState({ start: 0, end: 10 });
  const [groupBy, setGroupBy] = useState('asset_type'); // 'asset_type', 'account', 'sector'
  const [valueDisplay, setValueDisplay] = useState('current'); // 'current', 'cost_basis', 'gain_loss'
  const [showDetails, setShowDetails] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedPositions, setExpandedPositions] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set(['security', 'cash', 'crypto', 'metal', 'realestate']));
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [dateRangeOption, setDateRangeOption] = useState('last10'); // for controlling visible dates
  
  // Date range options
  const dateRangeOptions = [
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last10', label: 'Last 10 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'all', label: 'All Dates' }
  ];
  
  // Format utilities
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    // Convert to percentage if it's a decimal
    const percentage = Math.abs(value) < 10 ? value * 100 : value;
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
  
  // Sector colors
  const getSectorColor = (sector) => {
    const colors = {
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
      'Utilities': '#0284c7'
    };
    return colors[sector] || '#9ca3af';
  };
  
  // Fetch raw snapshot data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Start with last 90 days
        const response = await fetchWithAuth('/portfolio/snapshots/raw?days=90');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch snapshots: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw data received:', data.summary);
        
        setRawData(data);
        
        // Set initial display dates
        if (data.summary.dates.length > 0) {
          const dates = data.summary.dates;
          setDisplayDates(dates);
          
          // Initialize selected accounts with all accounts
          if (data.summary.accounts) {
            setSelectedAccounts(new Set(data.summary.accounts.map(acc => acc.id.toString())));
          }
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Update visible date range based on selection
  useEffect(() => {
    if (!displayDates.length) return;
    
    let start, end;
    switch (dateRangeOption) {
      case 'last7':
        start = Math.max(0, displayDates.length - 7);
        end = displayDates.length;
        break;
      case 'last10':
        start = Math.max(0, displayDates.length - 10);
        end = displayDates.length;
        break;
      case 'last30':
        start = Math.max(0, displayDates.length - 30);
        end = displayDates.length;
        break;
      case 'all':
        start = 0;
        end = displayDates.length;
        break;
      default:
        start = Math.max(0, displayDates.length - 10);
        end = displayDates.length;
    }
    
    setDateRange({ start, end });
  }, [dateRangeOption, displayDates]);
  
  // Load all data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/portfolio/snapshots/raw?days=365');
      if (response.ok) {
        const data = await response.json();
        setRawData(data);
        setDisplayDates(data.summary.dates);
      }
    } catch (err) {
      console.error('Error loading all data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process data for display
  const processedData = useMemo(() => {
    if (!rawData || !displayDates.length) return { rows: [], totals: {} };
    
    const visibleDates = displayDates.slice(dateRange.start, dateRange.end);
    const rows = [];
    const totals = {};
    
    // Initialize totals
    visibleDates.forEach(date => {
      totals[date] = { 
        value: 0, 
        costBasis: 0, 
        gainLoss: 0,
        income: 0,
        positionCount: 0
      };
    });
    
    // Get all unique positions from visible dates
    const positionMap = new Map();
    
    visibleDates.forEach(date => {
      const snapshot = rawData.snapshots_by_date[date];
      if (snapshot && snapshot.positions) {
        Object.entries(snapshot.positions).forEach(([key, position]) => {
          // Apply filters
          if (!selectedAssetTypes.has(position.asset_type)) return;
          if (!selectedAccounts.has(position.account_id.toString())) return;
          if (searchTerm && !position.identifier.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !position.name.toLowerCase().includes(searchTerm.toLowerCase())) return;
          
          if (!positionMap.has(key)) {
            positionMap.set(key, {
              key,
              asset_type: position.asset_type,
              identifier: position.identifier,
              name: position.name,
              account_name: position.account_name,
              account_id: position.account_id,
              institution: position.institution,
              sector: position.sector,
              industry: position.industry,
              purchase_date: position.purchase_date,
              holding_term: position.holding_term,
              values: {}
            });
          }
          
          positionMap.get(key).values[date] = {
            value: position.current_value,
            costBasis: position.total_cost_basis,
            gainLoss: position.gain_loss_amt,
            gainLossPct: position.gain_loss_pct,
            quantity: position.quantity,
            price: position.current_price,
            costPerUnit: position.cost_per_unit,
            income: position.position_income,
            dividendYield: position.dividend_yield,
            positionAge: position.position_age
          };
          
          // Add to totals
          totals[date].value += position.current_value;
          totals[date].costBasis += position.total_cost_basis;
          totals[date].gainLoss += position.gain_loss_amt;
          totals[date].income += position.position_income;
          totals[date].positionCount += 1;
        });
      }
    });
    
    // Convert to array and group
    const allRows = Array.from(positionMap.values());
    
    if (groupBy === 'asset_type') {
      // Group by asset type
      const grouped = {};
      allRows.forEach(row => {
        if (!grouped[row.asset_type]) {
          grouped[row.asset_type] = {
            key: row.asset_type,
            name: row.asset_type,
            type: 'group',
            children: [],
            values: {}
          };
          
          // Initialize group totals
          visibleDates.forEach(date => {
            grouped[row.asset_type].values[date] = {
              value: 0,
              costBasis: 0,
              gainLoss: 0,
              income: 0,
              positionCount: 0
            };
          });
        }
        
        grouped[row.asset_type].children.push(row);
        
        // Add to group totals
        Object.entries(row.values).forEach(([date, data]) => {
          grouped[row.asset_type].values[date].value += data.value;
          grouped[row.asset_type].values[date].costBasis += data.costBasis;
          grouped[row.asset_type].values[date].gainLoss += data.gainLoss;
          grouped[row.asset_type].values[date].income += data.income;
          grouped[row.asset_type].values[date].positionCount += 1;
        });
      });
      
      // Sort by total current value
      const sortedGroups = Object.values(grouped).sort((a, b) => {
        const lastDate = visibleDates[visibleDates.length - 1];
        return (b.values[lastDate]?.value || 0) - (a.values[lastDate]?.value || 0);
      });
      
      sortedGroups.forEach(group => {
        rows.push(group);
        if (expandedGroups.has(group.key)) {
          // Sort children by current value
          const sortedChildren = group.children.sort((a, b) => {
            const lastDate = visibleDates[visibleDates.length - 1];
            return (b.values[lastDate]?.value || 0) - (a.values[lastDate]?.value || 0);
          });
          rows.push(...sortedChildren);
        }
      });
    } else if (groupBy === 'account') {
      // Group by account
      const grouped = {};
      allRows.forEach(row => {
        const accountKey = row.account_id.toString();
        if (!grouped[accountKey]) {
          grouped[accountKey] = {
            key: accountKey,
            name: row.account_name,
            institution: row.institution,
            type: 'group',
            children: [],
            values: {}
          };
          
          // Initialize group totals
          visibleDates.forEach(date => {
            grouped[accountKey].values[date] = {
              value: 0,
              costBasis: 0,
              gainLoss: 0,
              income: 0,
              positionCount: 0
            };
          });
        }
        
        grouped[accountKey].children.push(row);
        
        // Add to group totals
        Object.entries(row.values).forEach(([date, data]) => {
          grouped[accountKey].values[date].value += data.value;
          grouped[accountKey].values[date].costBasis += data.costBasis;
          grouped[accountKey].values[date].gainLoss += data.gainLoss;
          grouped[accountKey].values[date].income += data.income;
          grouped[accountKey].values[date].positionCount += 1;
        });
      });
      
      // Sort by account name
      const sortedGroups = Object.values(grouped).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      sortedGroups.forEach(group => {
        rows.push(group);
        if (expandedGroups.has(group.key)) {
          // Sort children by current value
          const sortedChildren = group.children.sort((a, b) => {
            const lastDate = visibleDates[visibleDates.length - 1];
            return (b.values[lastDate]?.value || 0) - (a.values[lastDate]?.value || 0);
          });
          rows.push(...sortedChildren);
        }
      });
    } else if (groupBy === 'sector') {
      // Group by sector
      const grouped = {};
      allRows.forEach(row => {
        const sector = row.sector || 'Unknown';
        if (!grouped[sector]) {
          grouped[sector] = {
            key: sector,
            name: sector,
            type: 'group',
            children: [],
            values: {}
          };
          
          // Initialize group totals
          visibleDates.forEach(date => {
            grouped[sector].values[date] = {
              value: 0,
              costBasis: 0,
              gainLoss: 0,
              income: 0,
              positionCount: 0
            };
          });
        }
        
        grouped[sector].children.push(row);
        
        // Add to group totals
        Object.entries(row.values).forEach(([date, data]) => {
          grouped[sector].values[date].value += data.value;
          grouped[sector].values[date].costBasis += data.costBasis;
          grouped[sector].values[date].gainLoss += data.gainLoss;
          grouped[sector].values[date].income += data.income;
          grouped[sector].values[date].positionCount += 1;
        });
      });
      
      // Sort by total current value
      const sortedGroups = Object.values(grouped).sort((a, b) => {
        const lastDate = visibleDates[visibleDates.length - 1];
        return (b.values[lastDate]?.value || 0) - (a.values[lastDate]?.value || 0);
      });
      
      sortedGroups.forEach(group => {
        rows.push(group);
        if (expandedGroups.has(group.key)) {
          // Sort children by current value
          const sortedChildren = group.children.sort((a, b) => {
            const lastDate = visibleDates[visibleDates.length - 1];
            return (b.values[lastDate]?.value || 0) - (a.values[lastDate]?.value || 0);
          });
          rows.push(...sortedChildren);
        }
      });
    }
    
    return { rows, totals, visibleDates };
  }, [rawData, displayDates, dateRange, groupBy, expandedGroups, searchTerm, selectedAssetTypes, selectedAccounts, valueDisplay]);
  
  // Toggle group expansion
  const toggleGroup = (key) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };
  
  // Toggle position expansion (for tax lots in future)
  const togglePosition = (key) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedPositions(newExpanded);
  };
  
  // Toggle asset type filter
  const toggleAssetType = (type) => {
    const newSelected = new Set(selectedAssetTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedAssetTypes(newSelected);
  };
  
  // Toggle account filter
  const toggleAccount = (accountId) => {
    const newSelected = new Set(selectedAccounts);
    const accountIdStr = accountId.toString();
    if (newSelected.has(accountIdStr)) {
      newSelected.delete(accountIdStr);
    } else {
      newSelected.add(accountIdStr);
    }
    setSelectedAccounts(newSelected);
  };
  
  if (isLoading && !rawData) {
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
  
  const { rows, totals, visibleDates } = processedData;
  
  // Calculate latest snapshot comparison
  const latestDate = visibleDates && visibleDates.length > 0 ? visibleDates[visibleDates.length - 1] : null;
  const latestSnapshot = latestDate && rawData ? rawData.snapshots_by_date[latestDate] : null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Head>
        <title>Portfolio Snapshots Analysis | NestEgg</title>
      </Head>
      
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="max-w-full mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Portfolio Position Analysis
              </h1>
              <p className="text-gray-400">
                Historical position data with complete details
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
        
        {/* Summary Stats */}
        {rawData && latestSnapshot && (
          <div className="max-w-full mx-auto mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
                <div className="text-gray-400 text-sm mb-1">Total Value</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(latestSnapshot.total_value)}</div>
                <div className="text-xs text-gray-500 mt-1">{latestSnapshot.position_count} positions</div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
                <div className="text-gray-400 text-sm mb-1">Cost Basis</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(latestSnapshot.total_cost_basis)}</div>
                <div className="text-xs text-gray-500 mt-1">Total invested</div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
                <div className="text-gray-400 text-sm mb-1">Gain/Loss</div>
                <div className={`text-2xl font-bold ${latestSnapshot.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(latestSnapshot.total_gain_loss)}
                </div>
                <div className={`text-xs ${latestSnapshot.total_gain_loss >= 0 ? 'text-green-500' : 'text-red-500'} mt-1`}>
                  {formatPercentage(latestSnapshot.total_gain_loss / latestSnapshot.total_cost_basis)}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-xl">
                <div className="text-gray-400 text-sm mb-1">Annual Income</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(latestSnapshot.total_income)}</div>
                <div className="text-xs text-gray-500 mt-1">Dividends & Interest</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Controls */}
        <div className="max-w-full mx-auto mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="text-xs text-gray-400">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ticker or name..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                />
              </div>
              
              {/* Group By */}
              <div>
                <label className="text-xs text-gray-400">Group By</label>
                <div className="flex gap-2">
                  {['asset_type', 'account', 'sector'].map(option => (
                    <button
                      key={option}
                      onClick={() => setGroupBy(option)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        groupBy === option
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {option.replace('_', ' ').charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Value Display */}
              <div>
                <label className="text-xs text-gray-400">Show Values</label>
                <div className="flex gap-2">
                  {[
                    { value: 'current', label: 'Market' },
                    { value: 'cost_basis', label: 'Cost' },
                    { value: 'gain_loss', label: 'Gain/Loss' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setValueDisplay(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        valueDisplay === option.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Date Range */}
              <div>
                <label className="text-xs text-gray-400">Date Range</label>
                <select
                  value={dateRangeOption}
                  onChange={(e) => setDateRangeOption(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="mt-4 space-y-2">
              {/* Asset Type Filters */}
              <div>
                <label className="text-xs text-gray-400">Asset Types</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {rawData?.summary.asset_types.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleAssetType(type)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        selectedAssetTypes.has(type)
                          ? 'bg-opacity-30 text-white'
                          : 'bg-gray-700 text-gray-500'
                      }`}
                      style={{
                        backgroundColor: selectedAssetTypes.has(type) ? getAssetColor(type) : undefined
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Account Filters */}
              <div>
                <label className="text-xs text-gray-400">Accounts</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {rawData?.summary.accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        selectedAccounts.has(account.id.toString())
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-500'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`px-3 py-1 rounded text-sm ${
                    showDetails ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  Show Details
                </button>
                <button
                  onClick={() => setExpandedGroups(new Set())}
                  className="px-3 py-1 bg-gray-700 text-gray-400 hover:text-white rounded text-sm"
                >
                  Collapse All
                </button>
              </div>
              <button
                onClick={loadAllData}
                disabled={isLoading}
                className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load Full Year'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Table */}
        <div className="max-w-full mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10 min-w-[250px]">
                      {groupBy === 'asset_type' ? 'Asset Type / Position' : 
                       groupBy === 'account' ? 'Account / Position' : 
                       'Sector / Position'}
                    </th>
                    {visibleDates && visibleDates.map((date, idx) => (
                      <th key={idx} className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[120px]">
                        {formatDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {rows.map((row, rowIdx) => {
                    const isGroup = row.type === 'group';
                    const rowKey = `${row.key}_${rowIdx}`;
                    
                    return (
                      <React.Fragment key={rowKey}>
                        <tr 
                          className={`${
                            isGroup 
                              ? 'bg-gray-850 hover:bg-gray-750 cursor-pointer' 
                              : 'hover:bg-gray-750'
                          } transition-colors`}
                          onClick={isGroup ? () => toggleGroup(row.key) : undefined}
                        >
                          <td className={`px-4 py-2 sticky left-0 ${isGroup ? 'bg-gray-850' : 'bg-gray-800'}`}>
                            <div className={`flex items-center ${isGroup ? '' : 'pl-6'}`}>
                              {isGroup && (
                                <span className="mr-2 text-gray-400">
                                  {expandedGroups.has(row.key) ? '▼' : '▶'}
                                </span>
                              )}
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ 
                                  backgroundColor: isGroup 
                                    ? (groupBy === 'asset_type' ? getAssetColor(row.key) : 
                                       groupBy === 'sector' ? getSectorColor(row.key) : '#6b7280')
                                    : getAssetColor(row.asset_type) 
                                }}
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">
                                  {isGroup ? (
                                    <span className="capitalize">{row.name}</span>
                                  ) : (
                                    <span>{row.identifier}</span>
                                  )}
                                </div>
                                {!isGroup && (
                                  <div className="text-xs text-gray-400">
                                    {row.name}
                                    {showDetails && (
                                      <span>
                                        {' • '}{row.account_name}
                                        {row.sector && ` • ${row.sector}`}
                                        {row.holding_term && ` • ${row.holding_term}`}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {isGroup && (
                                  <div className="text-xs text-gray-400">
                                    {row.children.length} positions
                                    {row.institution && ` • ${row.institution}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {visibleDates && visibleDates.map((date, idx) => {
                            const data = row.values[date] || {};
                            const prevDate = idx > 0 ? visibleDates[idx - 1] : null;
                            const prevData = prevDate ? (row.values[prevDate] || {}) : {};
                            
                            let primaryValue, secondaryValue, changeValue;
                            
                            if (valueDisplay === 'current') {
                              primaryValue = data.value;
                              secondaryValue = showDetails && data.quantity ? `${data.quantity.toFixed(2)} @ $${data.price?.toFixed(2) || '0'}` : null;
                              changeValue = prevData.value ? ((data.value - prevData.value) / prevData.value) * 100 : 0;
                            } else if (valueDisplay === 'cost_basis') {
                              primaryValue = data.costBasis;
                              secondaryValue = showDetails && data.costPerUnit ? `@ $${data.costPerUnit.toFixed(2)}` : null;
                              changeValue = prevData.costBasis ? ((data.costBasis - prevData.costBasis) / prevData.costBasis) * 100 : 0;
                            } else if (valueDisplay === 'gain_loss') {
                              primaryValue = data.gainLoss;
                              secondaryValue = data.gainLossPct;
                              changeValue = null; // Don't show change for gain/loss
                            }
                            
                            return (
                              <td key={idx} className="px-4 py-2 text-right">
                                <div className={`text-sm ${
                                  valueDisplay === 'gain_loss' 
                                    ? (primaryValue >= 0 ? 'text-green-400' : 'text-red-400')
                                    : 'text-white'
                                }`}>
                                  {formatCurrency(primaryValue)}
                                </div>
                                {secondaryValue && (
                                  <div className={`text-xs ${
                                    valueDisplay === 'gain_loss' 
                                      ? (secondaryValue >= 0 ? 'text-green-500' : 'text-red-500')
                                      : 'text-gray-500'
                                  }`}>
                                    {valueDisplay === 'gain_loss' ? formatPercentage(secondaryValue) : secondaryValue}
                                  </div>
                                )}
                                {changeValue !== null && changeValue !== 0 && showDetails && (
                                  <div className={`text-xs ${changeValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatPercentage(changeValue)}
                                  </div>
                                )}
                                {showDetails && !isGroup && data.dividendYield > 0 && (
                                  <div className="text-xs text-amber-500">
                                    Yield: {formatPercentage(data.dividendYield)}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Total Row */}
                  <tr className="bg-gray-900 font-bold">
                    <td className="px-4 py-3 sticky left-0 bg-gray-900">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2 bg-indigo-500" />
                        <span className="text-sm text-white">Portfolio Total</span>
                      </div>
                    </td>
                    {visibleDates && visibleDates.map((date, idx) => {
                      const total = totals[date] || {};
                      const prevDate = idx > 0 ? visibleDates[idx - 1] : null;
                      const prevTotal = prevDate ? (totals[prevDate] || {}) : {};
                      const change = total.value && prevTotal.value ? ((total.value - prevTotal.value) / prevTotal.value) * 100 : 0;
                      
                      return (
                        <td key={idx} className="px-4 py-3 text-right">
                          <div className="text-sm text-white">
                            {valueDisplay === 'current' && formatCurrency(total.value)}
                            {valueDisplay === 'cost_basis' && formatCurrency(total.costBasis)}
                            {valueDisplay === 'gain_loss' && (
                              <span className={total.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatCurrency(total.gainLoss)}
                              </span>
                            )}
                          </div>
                          {valueDisplay === 'gain_loss' && total.costBasis > 0 && (
                            <div className={`text-xs ${total.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPercentage(total.gainLoss / total.costBasis)}
                            </div>
                          )}
                          {valueDisplay === 'current' && change !== 0 && showDetails && (
                            <div className={`text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercentage(change)}
                            </div>
                          )}
                          {showDetails && (
                            <div className="text-xs text-gray-500">
                              {total.positionCount} positions
                            </div>
                          )}
                        </td>
                      );
                    })}
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