import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';
import { 
  Calendar, 
  ChevronDown, 
  ChevronRight,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Grid,
  Table,
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  Search,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Report = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentPositions, setCurrentPositions] = useState([]);
  const [historicalSnapshots, setHistoricalSnapshots] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
  const [selectedGrouping, setSelectedGrouping] = useState('identifier'); // Changed from 'ticker'
  const [selectedMetric, setSelectedMetric] = useState('market_value');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedPositions, setExpandedPositions] = useState(new Set());
  const [viewMode, setViewMode] = useState('overview'); // overview, comparison, detail, custom
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set(['security', 'cash', 'crypto', 'metal']));
  const [compareDate1, setCompareDate1] = useState(null);
  const [compareDate2, setCompareDate2] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [darkMode, setDarkMode] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');

  const timeframeOptions = [
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: '1y', label: '1 Year' },
    { value: 'ytd', label: 'YTD' },
    { value: 'all', label: 'All Time' }
  ];

  const groupingOptions = [
    { value: 'identifier', label: 'Ticker/Identifier' },
    { value: 'asset_type', label: 'Asset Class' },
    { value: 'account', label: 'Account' },
    { value: 'sector', label: 'Sector' },
    { value: 'industry', label: 'Industry' }
  ];

  const metricOptions = [
    { value: 'market_value', label: 'Market Value' },
    { value: 'cost_basis', label: 'Cost Basis' },
    { value: 'gain_loss', label: 'Gain/Loss' },
    { value: 'gain_loss_pct', label: 'Gain/Loss %' },
    { value: 'income', label: 'Income' }
  ];

  // Asset type colors
  const getAssetColor = (type) => {
    const colors = {
      security: '#3b82f6',
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

  useEffect(() => {
    fetchData();
  }, [selectedTimeframe]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current positions
      const positionsResponse = await fetchWithAuth('/api/positions/unified');
      if (positionsResponse.ok) {
        const data = await positionsResponse.json();
        setCurrentPositions(data.positions || []);
      }

      // Fetch historical snapshots
      const days = selectedTimeframe === '1d' ? 1 : 
                   selectedTimeframe === '1w' ? 7 :
                   selectedTimeframe === '1m' ? 30 :
                   selectedTimeframe === '3m' ? 90 :
                   selectedTimeframe === '6m' ? 180 :
                   selectedTimeframe === '1y' ? 365 :
                   selectedTimeframe === 'ytd' ? getDaysYTD() :
                   365;

      const snapshotsResponse = await fetchWithAuth(`/api/portfolio/snapshots/raw?days=${days}`);
      if (snapshotsResponse.ok) {
        const data = await snapshotsResponse.json();
        setHistoricalSnapshots(data);
        
        // Set initial compare dates
        if (data.summary?.dates?.length > 0) {
          const dates = data.summary.dates;
          setCompareDate1(dates[0]);
          setCompareDate2(dates[dates.length - 1]);
          
          // Initialize selected accounts
          if (data.summary.accounts) {
            setSelectedAccounts(new Set(data.summary.accounts.map(acc => acc.id.toString())));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysYTD = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Process and group data
  const getGroupedData = useMemo(() => {
    const positions = currentPositions.filter(position => {
      if (!selectedAssetTypes.has(position.asset_type)) return false;
      if (!selectedAccounts.has(position.account_id?.toString())) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          position.identifier?.toLowerCase().includes(search) ||
          position.name?.toLowerCase().includes(search) ||
          position.ticker?.toLowerCase().includes(search)
        );
      }
      return true;
    });

    const grouped = {};
    
    positions.forEach(position => {
      let groupKey;
      switch (selectedGrouping) {
        case 'identifier':
          groupKey = position.identifier || position.ticker || 'Cash/Other';
          break;
        case 'asset_type':
          groupKey = position.asset_type || 'Other';
          break;
        case 'account':
          groupKey = position.account_name || 'Unknown Account';
          break;
        case 'sector':
          groupKey = position.sector || 'Other';
          break;
        case 'industry':
          groupKey = position.industry || 'Other';
          break;
        default:
          groupKey = 'All';
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          key: groupKey,
          name: groupKey,
          positions: [],
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalIncome: 0,
          totalQuantity: 0,
          avgPrice: 0,
          avgCost: 0
        };
      }

      grouped[groupKey].positions.push(position);
      grouped[groupKey].totalValue += position.current_value || 0;
      grouped[groupKey].totalCostBasis += position.total_cost_basis || 0;
      grouped[groupKey].totalGainLoss += position.gain_loss_amt || 0;
      grouped[groupKey].totalIncome += position.position_income || 0;
      
      // For identifier grouping, sum quantities
      if (selectedGrouping === 'identifier') {
        grouped[groupKey].totalQuantity += position.quantity || 0;
      }
    });

    // Calculate averages for identifier groups
    Object.values(grouped).forEach(group => {
      if (selectedGrouping === 'identifier' && group.totalQuantity > 0) {
        group.avgPrice = group.totalValue / group.totalQuantity;
        group.avgCost = group.totalCostBasis / group.totalQuantity;
      }
    });

    return grouped;
  }, [currentPositions, selectedGrouping, selectedAssetTypes, selectedAccounts, searchTerm]);

  // Get trend data for charts
  const getTrendData = useMemo(() => {
    if (!historicalSnapshots.snapshots_by_date) return null;

    const dates = Object.keys(historicalSnapshots.snapshots_by_date).sort();
    const data = dates.map(date => {
      const snapshot = historicalSnapshots.snapshots_by_date[date];
      return {
        date,
        marketValue: snapshot.total_value,
        costBasis: snapshot.total_cost_basis,
        gainLoss: snapshot.total_gain_loss,
        income: snapshot.total_income
      };
    });

    return {
      labels: data.map(d => formatDate(d.date)),
      datasets: [
        {
          label: 'Market Value',
          data: data.map(d => d.marketValue),
          borderColor: darkMode ? 'rgb(96, 165, 250)' : 'rgb(59, 130, 246)',
          backgroundColor: darkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        selectedMetric === 'cost_basis' && {
          label: 'Cost Basis',
          data: data.map(d => d.costBasis),
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          fill: true,
          tension: 0.4
        }
      ].filter(Boolean)
    };
  }, [historicalSnapshots, selectedMetric, darkMode]);

  // Get allocation data for doughnut chart
  const getAllocationData = useMemo(() => {
    const grouped = getGroupedData;
    const labels = Object.keys(grouped).slice(0, 8); // Top 8 for visibility
    const data = labels.map(label => grouped[label].totalValue);
    const colors = selectedGrouping === 'asset_type' 
      ? labels.map(label => getAssetColor(label))
      : selectedGrouping === 'sector'
      ? labels.map(label => getSectorColor(label))
      : [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
          'rgb(245, 158, 11)',
          'rgb(6, 182, 212)'
        ];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: darkMode ? '#1f2937' : '#fff'
      }]
    };
  }, [getGroupedData, selectedGrouping, darkMode]);

  // Process comparison data between dates
  const getComparisonData = useCallback(() => {
    if (!compareDate1 || !compareDate2 || !historicalSnapshots.snapshots_by_date) return null;

    const snapshot1 = historicalSnapshots.snapshots_by_date[compareDate1];
    const snapshot2 = historicalSnapshots.snapshots_by_date[compareDate2];

    if (!snapshot1 || !snapshot2) return null;

    const comparison = {};
    
    // Process all positions from both dates
    const allKeys = new Set([
      ...Object.keys(snapshot1.positions || {}),
      ...Object.keys(snapshot2.positions || {})
    ]);

    allKeys.forEach(key => {
      const pos1 = snapshot1.positions[key];
      const pos2 = snapshot2.positions[key];
      
      if (pos1 || pos2) {
        comparison[key] = {
          key,
          identifier: pos1?.identifier || pos2?.identifier,
          name: pos1?.name || pos2?.name,
          account_name: pos1?.account_name || pos2?.account_name,
          asset_type: pos1?.asset_type || pos2?.asset_type,
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
        };
      }
    });

    return Object.values(comparison)
      .filter(item => {
        if (!selectedAssetTypes.has(item.asset_type)) return false;
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          return (
            item.identifier?.toLowerCase().includes(search) ||
            item.name?.toLowerCase().includes(search)
          );
        }
        return true;
      })
      .sort((a, b) => Math.abs(b.deltaValue) - Math.abs(a.deltaValue));
  }, [compareDate1, compareDate2, historicalSnapshots, selectedAssetTypes, searchTerm]);

  // Process multi-date snapshot data for detail view
  const getDetailViewData = useMemo(() => {
    if (!historicalSnapshots.snapshots_by_date || viewMode !== 'detail') return null;

    const dates = Object.keys(historicalSnapshots.snapshots_by_date).sort();
    const visibleDates = dates.slice(-10); // Last 10 dates for display
    const positionMap = new Map();

    // Build position map with all dates
    visibleDates.forEach(date => {
      const snapshot = historicalSnapshots.snapshots_by_date[date];
      if (snapshot?.positions) {
        Object.entries(snapshot.positions).forEach(([key, position]) => {
          if (!selectedAssetTypes.has(position.asset_type)) return;
          if (!selectedAccounts.has(position.account_id?.toString())) return;
          if (searchTerm && !position.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !position.name?.toLowerCase().includes(searchTerm.toLowerCase())) return;

          if (!positionMap.has(key)) {
            positionMap.set(key, {
              key,
              identifier: position.identifier,
              name: position.name,
              account_name: position.account_name,
              asset_type: position.asset_type,
              sector: position.sector,
              values: {}
            });
          }

          positionMap.get(key).values[date] = {
            value: position.current_value,
            quantity: position.quantity,
            price: position.current_price,
            gainLoss: position.gain_loss_amt,
            gainLossPct: position.gain_loss_pct
          };
        });
      }
    });

    return {
      dates: visibleDates,
      positions: Array.from(positionMap.values())
    };
  }, [historicalSnapshots, viewMode, selectedAssetTypes, selectedAccounts, searchTerm]);

  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const renderOverviewTable = () => {
    const grouped = getGroupedData;
    const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].totalValue - a[1].totalValue);

    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  {selectedGrouping.replace('_', ' ')}
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Quantity
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Market Value
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Cost Basis
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Gain/Loss
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Gain/Loss %
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Income
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {sortedGroups.map(([groupKey, groupData]) => (
                <React.Fragment key={groupKey}>
                  <tr 
                    className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer transition-colors`} 
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      <div className="flex items-center">
                        {expandedGroups.has(groupKey) ? (
                          <ChevronDown className="h-4 w-4 mr-2 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
                        )}
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ 
                            backgroundColor: selectedGrouping === 'asset_type' 
                              ? getAssetColor(groupKey)
                              : selectedGrouping === 'sector'
                              ? getSectorColor(groupKey)
                              : '#6b7280'
                          }}
                        />
                        {groupKey}
                        <span className={`ml-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({groupData.positions.length} {groupData.positions.length === 1 ? 'position' : 'positions'})
                        </span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {selectedGrouping === 'identifier' && groupData.totalQuantity > 0 ? formatNumber(groupData.totalQuantity, 4) : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {formatCurrency(groupData.totalValue)}
                      {showDetails && selectedGrouping === 'identifier' && groupData.avgPrice > 0 && (
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          @ {formatCurrency(groupData.avgPrice)}
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {formatCurrency(groupData.totalCostBasis)}
                      {showDetails && selectedGrouping === 'identifier' && groupData.avgCost > 0 && (
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          @ {formatCurrency(groupData.avgCost)}
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                      groupData.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(groupData.totalGainLoss)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                      groupData.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {groupData.totalCostBasis > 0 
                        ? formatPercent(groupData.totalGainLoss / groupData.totalCostBasis)
                        : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {formatCurrency(groupData.totalIncome)}
                    </td>
                  </tr>
                  {expandedGroups.has(groupKey) && (
                    <>
                      {groupData.positions.map((position, idx) => (
                        <tr key={`${groupKey}-${idx}`} className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                          <td className={`px-6 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} pl-14`}>
                            <div>
                              <div className="font-medium">{position.identifier || 'Cash'}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {position.name} • {position.account_name}
                                {position.purchase_date && ` • ${formatFullDate(position.purchase_date)}`}
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                            {position.quantity ? formatNumber(position.quantity, 4) : '-'}
                          </td>
                          <td className={`px-6 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                            {formatCurrency(position.current_value)}
                            {showDetails && position.current_price && (
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                @ {formatCurrency(position.current_price)}
                              </div>
                            )}
                          </td>
                          <td className={`px-6 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                            {formatCurrency(position.total_cost_basis)}
                            {showDetails && position.cost_per_unit && (
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                @ {formatCurrency(position.cost_per_unit)}
                              </div>
                            )}
                          </td>
                          <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${
                            position.gain_loss_amt >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(position.gain_loss_amt)}
                          </td>
                          <td className={`px-6 py-3 whitespace-nowrap text-sm text-right ${
                            position.gain_loss_pct >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercent(position.gain_loss_pct)}
                          </td>
                          <td className={`px-6 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                            {formatCurrency(position.position_income)}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <tr>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  Total
                </td>
                <td className="px-6 py-4"></td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'} text-right`}>
                  {formatCurrency(Object.values(grouped).reduce((sum, g) => sum + g.totalValue, 0))}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'} text-right`}>
                  {formatCurrency(Object.values(grouped).reduce((sum, g) => sum + g.totalCostBasis, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                  {formatCurrency(Object.values(grouped).reduce((sum, g) => sum + g.totalGainLoss, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                  {(() => {
                    const totalGain = Object.values(grouped).reduce((sum, g) => sum + g.totalGainLoss, 0);
                    const totalBasis = Object.values(grouped).reduce((sum, g) => sum + g.totalCostBasis, 0);
                    return totalBasis > 0 ? formatPercent(totalGain / totalBasis) : '-';
                  })()}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'} text-right`}>
                  {formatCurrency(Object.values(grouped).reduce((sum, g) => sum + g.totalIncome, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderComparisonTable = () => {
    const comparisonData = getComparisonData();
    if (!comparisonData) return null;

    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        <div className={`p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Comparison: {formatFullDate(compareDate1)} vs {formatFullDate(compareDate2)}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Position
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`} colSpan="2">
                  Quantity
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`} colSpan="2">
                  Market Value
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Change
                </th>
                <th className={`px-6 py-3 text-center text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  Status
                </th>
              </tr>
              <tr>
                <th></th>
                <th className={`px-3 py-2 text-right text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Start</th>
                <th className={`px-3 py-2 text-right text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>End</th>
                <th className={`px-3 py-2 text-right text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Start</th>
                <th className={`px-3 py-2 text-right text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>End</th>
                <th className={`px-3 py-2 text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Value Δ</th>
                <th></th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {comparisonData.map((item, idx) => {
                const hasChanged = item.date1Quantity !== item.date2Quantity || item.deltaValue !== 0;

                return (
                  <tr key={idx} className={hasChanged ? (darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50') : ''}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      <div>
                        <div className="font-medium">{item.identifier}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.name}</div>
                      </div>
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {item.date1Quantity ? formatNumber(item.date1Quantity, 4) : '-'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {item.date2Quantity ? formatNumber(item.date2Quantity, 4) : '-'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {item.date1Value ? formatCurrency(item.date1Value) : '-'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} text-right`}>
                      {item.date2Value ? formatCurrency(item.date2Value) : '-'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm text-center font-medium ${
                      item.deltaValue >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.deltaValue !== 0 ? (
                        <>
                          {formatCurrency(item.deltaValue)}
                          <div className="text-xs">
                            {item.deltaPercent !== 0 ? `(${item.deltaPercent.toFixed(2)}%)` : ''}
                          </div>
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      {item.isNew && (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                      {item.isSold && (
                        <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded-full">
                          Sold
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDetailView = () => {
    const detailData = getDetailViewData;
    if (!detailData) return null;

    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider sticky left-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} z-10`}>
                  Position
                </th>
                {detailData.dates.map(date => (
                  <th 
                    key={date}
                    className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider min-w-[120px] cursor-pointer hover:${darkMode ? 'text-gray-200' : 'text-gray-700'}`}
                    onClick={() => {
                      setSortColumn(date);
                      setSortDirection(sortColumn === date && sortDirection === 'desc' ? 'asc' : 'desc');
                    }}
                  >
                    {formatDate(date)}
                    {sortColumn === date && (
                      <span className="ml-1">
                        {sortDirection === 'desc' ? <ChevronDown className="inline h-3 w-3" /> : <ChevronUp className="inline h-3 w-3" />}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
              {detailData.positions.map(position => (
                <tr key={position.key} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className={`px-4 py-2 sticky left-0 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getAssetColor(position.asset_type) }}
                      />
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {position.identifier}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {position.name} • {position.account_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  {detailData.dates.map(date => {
                    const data = position.values[date];
                    if (!data) {
                      return <td key={date} className="px-4 py-2 text-center text-gray-400">-</td>;
                    }

                    return (
                      <td key={date} className="px-4 py-2 text-right">
                        <div className={`text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                          {selectedMetric === 'market_value' && formatCurrency(data.value)}
                          {selectedMetric === 'gain_loss' && (
                            <span className={data.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(data.gainLoss)}
                            </span>
                          )}
                          {selectedMetric === 'gain_loss_pct' && (
                            <span className={data.gainLossPct >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatPercent(data.gainLossPct)}
                            </span>
                          )}
                        </div>
                        {showDetails && (
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatNumber(data.quantity, 2)} @ ${formatNumber(data.price, 2)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCustomReportBuilder = () => {
    const availableDates = historicalSnapshots.summary?.dates || [];
    const accounts = historicalSnapshots.summary?.accounts || [];
    const assetTypes = historicalSnapshots.summary?.asset_types || [];

    return (
      <div className="space-y-6">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Custom Report Builder</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Start Date
              </label>
              <select
                className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={dateRange.start || ''}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              >
                <option value="">Select start date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{formatFullDate(date)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                End Date
              </label>
              <select
                className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={dateRange.end || ''}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              >
                <option value="">Select end date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{formatFullDate(date)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Comparison Date
              </label>
              <select
                className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={compareDate2 || ''}
                onChange={(e) => setCompareDate2(e.target.value)}
              >
                <option value="">Select comparison date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{formatFullDate(date)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Filter by Accounts
              </label>
              <div className={`space-y-2 max-h-32 overflow-y-auto border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} rounded-md p-2`}>
                {accounts.map(account => (
                  <label key={account.id} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedAccounts.has(account.id.toString())}
                      onChange={(e) => {
                        const newSelected = new Set(selectedAccounts);
                        if (e.target.checked) {
                          newSelected.add(account.id.toString());
                        } else {
                          newSelected.delete(account.id.toString());
                        }
                        setSelectedAccounts(newSelected);
                      }}
                    />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{account.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Filter by Asset Types
              </label>
              <div className="space-y-2">
                {assetTypes.map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedAssetTypes.has(type)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedAssetTypes);
                        if (e.target.checked) {
                          newSelected.add(type);
                        } else {
                          newSelected.delete(type);
                        }
                        setSelectedAssetTypes(newSelected);
                      }}
                    />
                    <span className={`text-sm capitalize ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => {
                  // Generate custom report logic here
                  console.log('Generating custom report...');
                }}
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <RefreshCw className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin mx-auto`} />
          <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Portfolio Report - NestEgg</title>
      </Head>

      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow mb-6 p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Portfolio Report</h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-md ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button
                  className={`inline-flex items-center px-4 py-2 border ${darkMode ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  onClick={() => window.print()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button
                  className={`inline-flex items-center px-4 py-2 border ${darkMode ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  onClick={fetchData}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <nav className="-mb-px flex space-x-8">
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'overview'
                      ? `${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600'}`
                      : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300`
                  }`}
                  onClick={() => setViewMode('overview')}
                >
                  <Grid className="h-5 w-5 inline-block mr-2" />
                  Overview
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'comparison'
                      ? `${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600'}`
                      : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300`
                  }`}
                  onClick={() => setViewMode('comparison')}
                >
                  <Table className="h-5 w-5 inline-block mr-2" />
                  Comparison
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'detail'
                      ? `${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600'}`
                      : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300`
                  }`}
                  onClick={() => setViewMode('detail')}
                >
                  <TrendingUp className="h-5 w-5 inline-block mr-2" />
                  Historical Detail
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'custom'
                      ? `${darkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-600'}`
                      : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300`
                  }`}
                  onClick={() => setViewMode('custom')}
                >
                  <BarChart3 className="h-5 w-5 inline-block mr-2" />
                  Custom Report
                </button>
              </nav>
            </div>
          </div>

          {/* Controls */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow mb-6 p-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ticker or name..."
                    className={`w-full pl-10 pr-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <Search className={`absolute left-3 top-2.5 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Timeframe
                </label>
                <select
                  className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                >
                  {timeframeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Group By
                </label>
                <select
                  className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={selectedGrouping}
                  onChange={(e) => setSelectedGrouping(e.target.value)}
                >
                  {groupingOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Metric
                </label>
                <select
                  className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                >
                  {metricOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end space-x-2">
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    showDetails
                      ? 'bg-blue-600 text-white'
                      : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`
                  }`}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <Grid className="h-4 w-4 inline-block mr-1" />
                  Details
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Asset Types:</span>
              {['security', 'cash', 'crypto', 'metal'].map(type => (
                <button
                  key={type}
                  onClick={() => {
                    const newSelected = new Set(selectedAssetTypes);
                    if (newSelected.has(type)) {
                      newSelected.delete(type);
                    } else {
                      newSelected.add(type);
                    }
                    setSelectedAssetTypes(newSelected);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedAssetTypes.has(type)
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Charts - Show in Overview mode */}
          {viewMode === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Portfolio Trend</h3>
                <div className="h-64">
                  {getTrendData && (
                    <Line
                      data={getTrendData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                              color: darkMode ? '#e5e7eb' : '#374151'
                            }
                          }
                        },
                        scales: {
                          x: {
                            ticks: {
                              color: darkMode ? '#9ca3af' : '#6b7280'
                            },
                            grid: {
                              color: darkMode ? '#374151' : '#e5e7eb'
                            }
                          },
                          y: {
                            ticks: {
                              callback: function(value) {
                                return ' + value.toLocaleString();
                              },
                              color: darkMode ? '#9ca3af' : '#6b7280'
                            },
                            grid: {
                              color: darkMode ? '#374151' : '#e5e7eb'
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  Allocation by {selectedGrouping.replace('_', ' ')}
                </h3>
                <div className="h-64">
                  <Doughnut
                    data={getAllocationData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: 'right',
                          labels: {
                            color: darkMode ? '#e5e7eb' : '#374151'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tables based on view mode */}
          {viewMode === 'overview' && renderOverviewTable()}
          {viewMode === 'comparison' && renderComparisonTable()}
          {viewMode === 'detail' && renderDetailView()}
          {viewMode === 'custom' && renderCustomReportBuilder()}

          {/* Live vs Snapshot Comparison - Show in comparison mode */}
          {viewMode === 'comparison' && currentPositions.length > 0 && historicalSnapshots.snapshots_by_date && (
            <div className="mt-8">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
                Live Positions vs Latest Snapshot
                <span className={`text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'} ml-2`}>
                  Real-time data compared to {formatFullDate(Object.keys(historicalSnapshots.snapshots_by_date).sort().pop())}
                </span>
              </h2>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Position
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Live Value
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Snapshot Value
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                          Difference
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                      {(() => {
                        const latestDate = Object.keys(historicalSnapshots.snapshots_by_date).sort().pop();
                        const latestSnapshot = historicalSnapshots.snapshots_by_date[latestDate];
                        const differences = [];

                        currentPositions.forEach(pos => {
                          const key = `${pos.asset_type}|${pos.identifier || pos.ticker}|${pos.account_id}`;
                          const snapPos = latestSnapshot?.positions?.[key];
                          
                          if (snapPos && Math.abs(pos.current_value - snapPos.current_value) > 0.01) {
                            differences.push({
                              identifier: pos.identifier || pos.ticker,
                              name: pos.name,
                              account_name: pos.account_name,
                              liveValue: pos.current_value,
                              liveQuantity: pos.quantity,
                              snapValue: snapPos.current_value,
                              snapQuantity: snapPos.quantity,
                              diff: pos.current_value - snapPos.current_value
                            });
                          }
                        });

                        return differences
                          .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
                          .slice(0, 10)
                          .map((item, idx) => (
                            <tr key={idx} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                              <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div>
                                  <div className="text-sm font-medium">{item.identifier}</div>
                                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {item.name} • {item.account_name}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div className="text-sm">{formatCurrency(item.liveValue)}</div>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {formatNumber(item.liveQuantity, 2)} shares
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div className="text-sm">{formatCurrency(item.snapValue)}</div>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {formatNumber(item.snapQuantity, 2)} shares
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-right text-sm ${
                                item.diff >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(item.diff)}
                                <div className="text-xs">
                                  {item.snapValue > 0 ? `(${((item.diff / item.snapValue) * 100).toFixed(2)}%)` : ''}
                                </div>
                              </td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Report;