import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';
import { 
  CalendarIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FilterIcon,
  DownloadIcon,
  RefreshIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PlusIcon,
  MinusIcon,
  ViewGridIcon,
  TableIcon,
  ChartBarIcon
} from '@heroicons/react/outline';
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
  const [selectedGrouping, setSelectedGrouping] = useState('asset_type');
  const [selectedMetric, setSelectedMetric] = useState('market_value');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [compareDate, setCompareDate] = useState(null);
  const [baseDate, setBaseDate] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // overview, comparison, custom
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });

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
    { value: 'asset_type', label: 'Asset Class' },
    { value: 'account', label: 'Account' },
    { value: 'ticker', label: 'Ticker/Identifier' },
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

  const getGroupedData = useMemo(() => {
    const positions = compareMode && compareDate && historicalSnapshots.snapshots_by_date?.[compareDate]
      ? Object.values(historicalSnapshots.snapshots_by_date[compareDate].positions)
      : currentPositions;

    const grouped = {};
    
    positions.forEach(position => {
      let groupKey;
      switch (selectedGrouping) {
        case 'asset_type':
          groupKey = position.asset_type || 'Other';
          break;
        case 'account':
          groupKey = position.account_name || 'Unknown Account';
          break;
        case 'ticker':
          groupKey = position.identifier || 'Cash/Other';
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
          positions: [],
          totalValue: 0,
          totalCostBasis: 0,
          totalGainLoss: 0,
          totalIncome: 0
        };
      }

      grouped[groupKey].positions.push(position);
      grouped[groupKey].totalValue += position.current_value || 0;
      grouped[groupKey].totalCostBasis += position.total_cost_basis || 0;
      grouped[groupKey].totalGainLoss += position.gain_loss_amt || 0;
      grouped[groupKey].totalIncome += position.position_income || 0;
    });

    return grouped;
  }, [currentPositions, historicalSnapshots, selectedGrouping, compareMode, compareDate]);

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
      labels: data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Market Value',
          data: data.map(d => d.marketValue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
  }, [historicalSnapshots, selectedMetric]);

  const getAllocationData = useMemo(() => {
    const grouped = getGroupedData;
    const labels = Object.keys(grouped);
    const data = labels.map(label => grouped[label].totalValue);
    const colors = [
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
        borderColor: '#fff'
      }]
    };
  }, [getGroupedData]);

  const getComparisonData = useCallback(() => {
    if (!compareMode || !baseDate || !compareDate) return null;

    const baseSnapshot = historicalSnapshots.snapshots_by_date?.[baseDate];
    const compareSnapshot = historicalSnapshots.snapshots_by_date?.[compareDate];

    if (!baseSnapshot || !compareSnapshot) return null;

    const comparison = {};
    
    // Process base positions
    Object.entries(baseSnapshot.positions).forEach(([key, position]) => {
      comparison[key] = {
        base: position,
        compare: null,
        identifier: position.identifier,
        name: position.name,
        asset_type: position.asset_type
      };
    });

    // Process compare positions
    Object.entries(compareSnapshot.positions).forEach(([key, position]) => {
      if (comparison[key]) {
        comparison[key].compare = position;
      } else {
        comparison[key] = {
          base: null,
          compare: position,
          identifier: position.identifier,
          name: position.name,
          asset_type: position.asset_type
        };
      }
    });

    return Object.values(comparison);
  }, [compareMode, baseDate, compareDate, historicalSnapshots]);

  const toggleRowExpansion = (groupKey) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedRows(newExpanded);
  };

  const renderValueCell = (value, previousValue = null) => {
    const change = previousValue !== null ? value - previousValue : null;
    const changePercent = previousValue !== null && previousValue !== 0 
      ? (change / previousValue) * 100 
      : null;

    return (
      <div className="flex flex-col">
        <span className="font-medium">{formatCurrency(value)}</span>
        {showDetails && change !== null && (
          <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        )}
      </div>
    );
  };

  const renderOverviewTable = () => {
    const grouped = getGroupedData;
    const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].totalValue - a[1].totalValue);

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {selectedGrouping.replace('_', ' ')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Market Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Basis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain/Loss
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain/Loss %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Income
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedGroups.map(([groupKey, groupData]) => (
                <React.Fragment key={groupKey}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRowExpansion(groupKey)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {expandedRows.has(groupKey) ? (
                          <ChevronDownIcon className="h-4 w-4 mr-2 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 mr-2 text-gray-400" />
                        )}
                        {groupKey}
                        <span className="ml-2 text-xs text-gray-500">({groupData.positions.length})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {renderValueCell(groupData.totalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(groupData.totalCostBasis)}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(groupData.totalIncome)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <button className="text-blue-600 hover:text-blue-900">
                        <TableIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(groupKey) && (
                    <>
                      {groupData.positions.map((position, idx) => (
                        <tr key={`${groupKey}-${idx}`} className="bg-gray-50">
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 pl-14">
                            <div>
                              <div className="font-medium">{position.identifier || 'Cash'}</div>
                              <div className="text-xs text-gray-500">{position.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {renderValueCell(position.current_value)}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(position.total_cost_basis)}
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
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(position.position_income)}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                            <span className="text-xs text-gray-400">{position.account_name}</span>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(Object.values(grouped).reduce((sum, g) => sum + g.totalValue, 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(Object.values(grouped).reduce((sum, g) => sum + g.totalIncome, 0))}
                </td>
                <td></td>
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="text-lg font-medium">
            Comparison: {baseDate} vs {compareDate}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">
                  Quantity
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">
                  Market Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan="2">
                  Gain/Loss
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
              </tr>
              <tr>
                <th></th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Base</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Compare</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Base</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Compare</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Base</th>
                <th className="px-3 py-2 text-right text-xs text-gray-500">Compare</th>
                <th className="px-3 py-2 text-center text-xs text-gray-500">Value Δ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparisonData.map((item, idx) => {
                const valueChange = (item.compare?.current_value || 0) - (item.base?.current_value || 0);
                const hasChanged = item.base && item.compare && (
                  item.base.quantity !== item.compare.quantity ||
                  item.base.current_value !== item.compare.current_value
                );

                return (
                  <tr key={idx} className={hasChanged ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{item.identifier}</div>
                        <div className="text-xs text-gray-500">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.base ? formatNumber(item.base.quantity, 4) : '-'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.compare ? formatNumber(item.compare.quantity, 4) : '-'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.base ? formatCurrency(item.base.current_value) : '-'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.compare ? formatCurrency(item.compare.current_value) : '-'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm text-right ${
                      item.base?.gain_loss_amt >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.base ? formatCurrency(item.base.gain_loss_amt) : '-'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm text-right ${
                      item.compare?.gain_loss_amt >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.compare ? formatCurrency(item.compare.gain_loss_amt) : '-'}
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-sm text-center font-medium ${
                      valueChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {valueChange !== 0 ? formatCurrency(valueChange) : '-'}
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

  const renderCustomReportBuilder = () => {
    const availableDates = historicalSnapshots.summary?.dates || [];
    const accounts = historicalSnapshots.summary?.accounts || [];
    const assetTypes = historicalSnapshots.summary?.asset_types || [];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Custom Report Builder</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customDateRange.start || ''}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
              >
                <option value="">Select start date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customDateRange.end || ''}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
              >
                <option value="">Select end date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comparison Date
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={compareDate || ''}
                onChange={(e) => setCompareDate(e.target.value)}
              >
                <option value="">Select comparison date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Accounts
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                {accounts.map(account => (
                  <label key={account.id} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAccounts([...selectedAccounts, account.id]);
                        } else {
                          setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                        }
                      }}
                    />
                    <span className="text-sm">{account.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Asset Types
              </label>
              <div className="space-y-2">
                {assetTypes.map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedAssetTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssetTypes([...selectedAssetTypes, type]);
                        } else {
                          setSelectedAssetTypes(selectedAssetTypes.filter(t => t !== type));
                        }
                      }}
                    />
                    <span className="text-sm capitalize">{type}</span>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshIcon className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
          <p className="mt-2 text-gray-600">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Portfolio Report - NestEgg</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Portfolio Report</h1>
              <div className="flex space-x-2">
                <button
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => window.print()}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={fetchData}
                >
                  <RefreshIcon className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setViewMode('overview')}
                >
                  <ViewGridIcon className="h-5 w-5 inline-block mr-2" />
                  Overview
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'comparison'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setViewMode('comparison')}
                >
                  <TableIcon className="h-5 w-5 inline-block mr-2" />
                  Comparison
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    viewMode === 'custom'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setViewMode('custom')}
                >
                  <ChartBarIcon className="h-5 w-5 inline-block mr-2" />
                  Custom Report
                </button>
              </nav>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeframe
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group By
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {viewMode === 'comparison' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Date
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={baseDate || ''}
                    onChange={(e) => setBaseDate(e.target.value)}
                  >
                    <option value="">Select date</option>
                    {historicalSnapshots.summary?.dates?.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-end space-x-2">
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    showDetails
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <ViewGridIcon className="h-4 w-4 inline-block mr-1" />
                  Details
                </button>
                <button
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    compareMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setCompareMode(!compareMode)}
                >
                  <TableIcon className="h-4 w-4 inline-block mr-1" />
                  Compare
                </button>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Portfolio Trend</h3>
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
                          position: 'bottom'
                        }
                      },
                      scales: {
                        y: {
                          ticks: {
                            callback: function(value) {
                              return '$' + value.toLocaleString();
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Allocation by {selectedGrouping.replace('_', ' ')}</h3>
              <div className="h-64">
                <Doughnut
                  data={getAllocationData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'right'
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tables */}
          {viewMode === 'overview' && renderOverviewTable()}
          {viewMode === 'comparison' && renderComparisonTable()}
          {viewMode === 'custom' && renderCustomReportBuilder()}
        </div>
      </div>
    </>
  );
};

export default Report;