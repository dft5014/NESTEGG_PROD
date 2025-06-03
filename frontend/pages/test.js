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
  const [unifiedPositions, setUnifiedPositions] = useState([]);
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
  const [dateRangeOption, setDateRangeOption] = useState('last10');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [compareDate1, setCompareDate1] = useState(null);
  const [compareDate2, setCompareDate2] = useState(null);
  const [taxLots, setTaxLots] = useState({});
  
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
    // No need to multiply by 100 - data already in percentage format
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
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
  
  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch snapshot data
        const snapResponse = await fetchWithAuth('/portfolio/snapshots/raw?days=90');
        if (!snapResponse.ok) {
          throw new Error(`Failed to fetch snapshots: ${snapResponse.status}`);
        }
        const snapData = await snapResponse.json();
        setRawData(snapData);
        
        // Fetch unified positions
        const unifiedResponse = await fetchWithAuth('/positions/unified');
        if (!unifiedResponse.ok) {
          throw new Error(`Failed to fetch unified positions: ${unifiedResponse.status}`);
        }
        const unifiedData = await unifiedResponse.json();
        setUnifiedPositions(unifiedData.positions || []);
        
        // Set initial display dates and compare dates
        if (snapData.summary.dates.length > 0) {
          const dates = snapData.summary.dates;
          setDisplayDates(dates);
          setCompareDate1(dates[0]); // First date
          setCompareDate2(dates[dates.length - 1]); // Most recent date
          
          // Initialize selected accounts
          if (snapData.summary.accounts) {
            setSelectedAccounts(new Set(snapData.summary.accounts.map(acc => acc.id.toString())));
          }
        }
        
        // Simulate tax lots for positions
        const lots = {};
        unifiedData.positions?.forEach(pos => {
          const key = `${pos.asset_type}|${pos.ticker || pos.identifier}|${pos.account_id}`;
          // Simulate 1-3 tax lots per position
          const numLots = Math.floor(Math.random() * 3) + 1;
          lots[key] = Array.from({ length: numLots }, (_, i) => ({
            id: `${key}_lot_${i}`,
            purchase_date: new Date(Date.now() - Math.random() * 1000 * 24 * 60 * 60 * 1000).toISOString(),
            quantity: pos.quantity / numLots,
            cost_basis: (pos.cost_basis || pos.total_cost_basis || 0) / numLots,
            current_value: (pos.current_value || 0) / numLots
          }));
        });
        setTaxLots(lots);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Update visible date range
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
  
  // Sort dates
  const handleDateSort = (date) => {
    if (sortColumn === date) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortColumn(date);
      setSortDirection('desc');
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
    
    // Convert to array and sort if needed
    let allRows = Array.from(positionMap.values());
    
    // Apply column sort if active
    if (sortColumn && visibleDates.includes(sortColumn)) {
      allRows.sort((a, b) => {
        const aValue = a.values[sortColumn]?.value || 0;
        const bValue = b.values[sortColumn]?.value || 0;
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      });
    }
    
    // Group data
    if (groupBy === 'asset_type') {
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
        
        Object.entries(row.values).forEach(([date, data]) => {
          grouped[row.asset_type].values[date].value += data.value;
          grouped[row.asset_type].values[date].costBasis += data.costBasis;
          grouped[row.asset_type].values[date].gainLoss += data.gainLoss;
          grouped[row.asset_type].values[date].income += data.income;
          grouped[row.asset_type].values[date].positionCount += 1;
        });
      });
      
      Object.values(grouped).forEach(group => {
        rows.push(group);
        if (expandedGroups.has(group.key)) {
          group.children.forEach(child => {
            rows.push(child);
            // Add tax lots if position is expanded
            const posKey = child.key;
            if (expandedPositions.has(posKey) && taxLots[posKey]) {
              taxLots[posKey].forEach((lot, idx) => {
                rows.push({
                  ...lot,
                  type: 'taxlot',
                  parentKey: posKey,
                  identifier: `Lot ${idx + 1}`,
                  name: formatFullDate(lot.purchase_date)
                });
              });
            }
          });
        }
      });
    } else if (groupBy === 'account') {
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
        
        Object.entries(row.values).forEach(([date, data]) => {
          grouped[accountKey].values[date].value += data.value;
          grouped[accountKey].values[date].costBasis += data.costBasis;
          grouped[accountKey].values[date].gainLoss += data.gainLoss;
          grouped[accountKey].values[date].income += data.income;
          grouped[accountKey].values[date].positionCount += 1;
        });
      });
      
      Object.values(grouped).forEach(group => {
        rows.push(group);
        if (expandedGroups.has(group.key)) {
          group.children.forEach(child => {
            rows.push(child);
            // Add tax lots if position is expanded
            const posKey = child.key;
            if (expandedPositions.has(posKey) && taxLots[posKey]) {
              taxLots[posKey].forEach((lot, idx) => {
                rows.push({
                  ...lot,
                  type: 'taxlot',
                  parentKey: posKey,
                  identifier: `Lot ${idx + 1}`,
                  name: formatFullDate(lot.purchase_date)
                });
              });
            }
          });
        }
      });
    } else if (groupBy === 'sector') {
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
        
        Object.entries(row.values).forEach(([date, data]) => {
          grouped[sector].values[date].value += data.value;
          grouped[sector].values[date].costBasis += data.costBasis;
          grouped[sector].values[date].gainLoss += data.gainLoss;
          grouped[sector].values[date].income += data.income;
          grouped[sector].values[date].positionCount += 1;
        });
      });
      
      Object.values(grouped).forEach(group => {
        rows.push(group);
        if (expandedGroups.has(group.key)) {
          group.children.forEach(child => {
            rows.push(child);
            // Add tax lots if position is expanded
            const posKey = child.key;
            if (expandedPositions.has(posKey) && taxLots[posKey]) {
              taxLots[posKey].forEach((lot, idx) => {
                rows.push({
                  ...lot,
                  type: 'taxlot',
                  parentKey: posKey,
                  identifier: `Lot ${idx + 1}`,
                  name: formatFullDate(lot.purchase_date)
                });
              });
            }
          });
        }
      });
    }
    
    return { rows, totals, visibleDates };
  }, [rawData, displayDates, dateRange, groupBy, expandedGroups, expandedPositions, searchTerm, selectedAssetTypes, selectedAccounts, valueDisplay, sortColumn, sortDirection, taxLots]);
  
  // Process unified vs snapshot comparison
  const unifiedVsSnapshotData = useMemo(() => {
    if (!unifiedPositions.length || !rawData) return [];
    
    const latestDate = displayDates[displayDates.length - 1];
    const latestSnapshot = latestDate ? rawData.snapshots_by_date[latestDate] : null;
    if (!latestSnapshot) return [];
    
    const comparisonMap = new Map();
    
    // Add unified positions
    unifiedPositions.forEach(pos => {
      const key = `${pos.asset_type}|${pos.ticker || pos.identifier}|${pos.account_id}`;
      comparisonMap.set(key, {
        key,
        identifier: pos.ticker || pos.identifier,
        name: pos.name,
        account_name: pos.account_name,
        asset_type: pos.asset_type,
        unifiedValue: pos.current_value || 0,
        unifiedQuantity: pos.quantity || 0,
        unifiedPrice: pos.current_price || 0,
        snapshotValue: 0,
        snapshotQuantity: 0,
        snapshotPrice: 0,
        deltaValue: 0,
        deltaPercent: 0
      });
    });
    
    // Match with snapshot positions
    Object.entries(latestSnapshot.positions).forEach(([key, pos]) => {
      if (comparisonMap.has(key)) {
        const item = comparisonMap.get(key);
        item.snapshotValue = pos.current_value;
        item.snapshotQuantity = pos.quantity;
        item.snapshotPrice = pos.current_price;
        item.deltaValue = item.unifiedValue - item.snapshotValue;
        item.deltaPercent = item.snapshotValue > 0 ? (item.deltaValue / item.snapshotValue) * 100 : 0;
      }
    });
    
    return Array.from(comparisonMap.values())
      .filter(item => Math.abs(item.deltaValue) > 0.01) // Only show positions with differences
      .sort((a, b) => Math.abs(b.deltaValue) - Math.abs(a.deltaValue));
  }, [unifiedPositions, rawData, displayDates]);
  
  // Process date comparison data
  const dateComparisonData = useMemo(() => {
    if (!rawData || !compareDate1 || !compareDate2) return [];
    
    const snapshot1 = rawData.snapshots_by_date[compareDate1];
    const snapshot2 = rawData.snapshots_by_date[compareDate2];
    if (!snapshot1 || !snapshot2) return [];
    
    const comparisonMap = new Map();
    
    // Process all positions from both dates
    const allKeys = new Set([
      ...Object.keys(snapshot1.positions || {}),
      ...Object.keys(snapshot2.positions || {})
    ]);
    
    allKeys.forEach(key => {
      const pos1 = snapshot1.positions[key];
      const pos2 = snapshot2.positions[key];
      
      if (pos1 || pos2) {
        const identifier = pos1?.identifier || pos2?.identifier;
        const name = pos1?.name || pos2?.name;
        const accountName = pos1?.account_name || pos2?.account_name;
        const assetType = pos1?.asset_type || pos2?.asset_type;
        
        comparisonMap.set(key, {
          key,
          identifier,
          name,
          account_name: accountName,
          asset_type: assetType,
          date1Value: pos1?.current_value || 0,
          date1Quantity: pos1?.quantity || 0,
          date1Price: pos1?.current_price || 0,
          date2Value: pos2?.current_value || 0,
          date2Quantity: pos2?.quantity || 0,
          date2Price: pos2?.current_price || 0,
          deltaValue: (pos2?.current_value || 0) - (pos1?.current_value || 0),
          deltaPercent: pos1?.current_value > 0 
            ? (((pos2?.current_value || 0) - pos1.current_value) / pos1.current_value) * 100 
            : (pos2?.current_value > 0 ? 100 : 0),
          isNew: !pos1 && pos2,
          isSold: pos1 && !pos2
        });
      }
    });
    
    return Array.from(comparisonMap.values())
      .sort((a, b) => b.date2Value - a.date2Value);
  }, [rawData, compareDate1, compareDate2]);
  
  // Toggle functions
  const toggleGroup = (key) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };
  
  const togglePosition = (key) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedPositions(newExpanded);
  };
  
  const toggleAssetType = (type) => {
    const newSelected = new Set(selectedAssetTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedAssetTypes(newSelected);
  };
  
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
                  onClick={() => {
                    setExpandedGroups(new Set());
                    setExpandedPositions(new Set());
                  }}
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
        
        {/* Main Historical Table */}
        <div className="max-w-full mx-auto mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Historical Position Values</h2>
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10 min-w-[250px]">
                      {groupBy === 'asset_type' ? 'Asset Type / Position / Tax Lot' : 
                       groupBy === 'account' ? 'Account / Position / Tax Lot' : 
                       'Sector / Position / Tax Lot'}
                    </th>
                    {visibleDates && visibleDates.map((date, idx) => (
                      <th 
                        key={idx} 
                        onClick={() => handleDateSort(date)}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[120px] cursor-pointer hover:text-white"
                      >
                        <div className="flex items-center justify-end gap-1">
                          {formatDate(date)}
                          {sortColumn === date && (
                            <span className="text-indigo-400">
                              {sortDirection === 'desc' ? '↓' : '↑'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {rows.map((row, rowIdx) => {
                    const isGroup = row.type === 'group';
                    const isTaxLot = row.type === 'taxlot';
                    const isPosition = !isGroup && !isTaxLot;
                    const rowKey = row.key || `${row.parentKey}_${rowIdx}`;
                    const hasLots = isPosition && taxLots[row.key] && taxLots[row.key].length > 1;
                    
                    return (
                      <tr 
                        key={rowKey}
                        className={`${
                          isGroup ? 'bg-gray-850 hover:bg-gray-750' : 
                          isTaxLot ? 'bg-gray-825' :
                          'hover:bg-gray-750'
                        } transition-colors`}
                      >
                        <td className={`px-4 py-2 sticky left-0 ${
                          isGroup ? 'bg-gray-850' : 
                          isTaxLot ? 'bg-gray-825' :
                          'bg-gray-800'
                        }`}>
                          <div className={`flex items-center ${
                            isGroup ? '' : 
                            isTaxLot ? 'pl-12' :
                            'pl-6'
                          }`}>
                            {isGroup && (
                              <button
                                onClick={() => toggleGroup(row.key)}
                                className="mr-2 text-gray-400 hover:text-white"
                              >
                                {expandedGroups.has(row.key) ? '▼' : '▶'}
                              </button>
                            )}
                            {isPosition && hasLots && (
                              <button
                                onClick={() => togglePosition(row.key)}
                                className="mr-2 text-gray-400 hover:text-white"
                              >
                                {expandedPositions.has(row.key) ? '▼' : '▶'}
                              </button>
                            )}
                            {!isTaxLot && (
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ 
                                  backgroundColor: isGroup 
                                    ? (groupBy === 'asset_type' ? getAssetColor(row.key) : 
                                       groupBy === 'sector' ? getSectorColor(row.key) : '#6b7280')
                                    : getAssetColor(row.asset_type) 
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-white">
                                {isGroup ? (
                                  <span className="capitalize">{row.name}</span>
                                ) : (
                                  <span>{row.identifier}</span>
                                )}
                              </div>
                              {!isGroup && !isTaxLot && (
                                <div className="text-xs text-gray-400">
                                  {row.name}
                                  {showDetails && (
                                    <span>
                                      {' • '}{row.account_name}
                                      {row.sector && ` • ${row.sector}`}
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
                              {isTaxLot && (
                                <div className="text-xs text-gray-400">
                                  {row.name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {visibleDates && visibleDates.map((date, idx) => {
                          if (isTaxLot) {
                            // Tax lots show static values
                            return (
                              <td key={idx} className="px-4 py-2 text-right">
                                <div className="text-sm text-gray-400">
                                  {formatCurrency(row.current_value)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {row.quantity.toFixed(2)} shares
                                </div>
                              </td>
                            );
                          }
                          
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
                            changeValue = null;
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
                            </td>
                          );
                        })}
                      </tr>
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
                              {formatPercentage((total.gainLoss / total.costBasis) * 100)}
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
        
        {/* Unified vs Snapshot Comparison */}
        {unifiedVsSnapshotData.length > 0 && (
          <div className="max-w-full mx-auto mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Live Positions vs Latest Snapshot
              <span className="text-sm font-normal text-gray-400 ml-2">
                Differences between real-time data and {formatFullDate(displayDates[displayDates.length - 1])}
              </span>
            </h2>
            <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Live Value
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Snapshot Value
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Difference
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Change %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {unifiedVsSnapshotData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-white">{row.identifier}</div>
                            <div className="text-xs text-gray-400">
                              {row.name} • {row.account_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-white">{formatCurrency(row.unifiedValue)}</div>
                          <div className="text-xs text-gray-500">
                            {row.unifiedQuantity.toFixed(2)} @ ${row.unifiedPrice.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm text-gray-300">{formatCurrency(row.snapshotValue)}</div>
                          <div className="text-xs text-gray-500">
                            {row.snapshotQuantity.toFixed(2)} @ ${row.snapshotPrice.toFixed(2)}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm ${
                          row.deltaValue >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(row.deltaValue)}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm ${
                          row.deltaPercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercentage(row.deltaPercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Date Comparison Table */}
        <div className="max-w-full mx-auto">
          <h2 className="text-xl font-bold text-white mb-4">Position Comparison Between Dates</h2>
          
          {/* Date Selectors */}
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">From Date</label>
                <select
                  value={compareDate1 || ''}
                  onChange={(e) => setCompareDate1(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                >
                  {displayDates.map(date => (
                    <option key={date} value={date}>{formatFullDate(date)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">To Date</label>
                <select
                  value={compareDate2 || ''}
                  onChange={(e) => setCompareDate2(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                >
                  {displayDates.map(date => (
                    <option key={date} value={date}>{formatFullDate(date)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Comparison Table */}
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {compareDate1 && formatDate(compareDate1)}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {compareDate2 && formatDate(compareDate2)}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Change %
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {dateComparisonData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-white">{row.identifier}</div>
                          <div className="text-xs text-gray-400">
                            {row.name} • {row.account_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-white">{formatCurrency(row.date1Value)}</div>
                        {row.date1Quantity > 0 && (
                          <div className="text-xs text-gray-500">
                            {row.date1Quantity.toFixed(2)} @ ${row.date1Price.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-white">{formatCurrency(row.date2Value)}</div>
                        {row.date2Quantity > 0 && (
                          <div className="text-xs text-gray-500">
                            {row.date2Quantity.toFixed(2)} @ ${row.date2Price.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${
                        row.deltaValue >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(row.deltaValue)}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${
                        row.deltaPercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(row.deltaPercent)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.isNew && (
                          <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                        {row.isSold && (
                          <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">
                            Sold
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}