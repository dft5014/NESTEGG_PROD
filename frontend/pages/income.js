// pages/portfolio-snapshots-analysis.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/utils/api';
import { 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Save,
  FileText,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Percent,
  Clock,
  Search,
  X,
  Plus,
  Minus,
  ChevronUp,
  Info,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  Minimize2,
  BookOpen,
  Target,
  Shield,
  Zap
} from 'lucide-react';

export default function PortfolioSnapshotsAnalysis() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [unifiedPositions, setUnifiedPositions] = useState([]);
  const [displayDates, setDisplayDates] = useState([]);
  const [dateRange, setDateRange] = useState({ start: 0, end: 30 });
  const [groupBy, setGroupBy] = useState('asset_type');
  const [valueDisplay, setValueDisplay] = useState('current');
  const [showDetails, setShowDetails] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedPositions, setExpandedPositions] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState(new Set(['security', 'cash', 'crypto', 'metal', 'realestate']));
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [dateRangeOption, setDateRangeOption] = useState('last30');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [compareDate1, setCompareDate1] = useState(null);
  const [compareDate2, setCompareDate2] = useState(null);
  const [taxLots, setTaxLots] = useState({});
  const [savedViews, setSavedViews] = useState([]);
  const [currentView, setCurrentView] = useState(null);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [annotations, setAnnotations] = useState({});
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('value');
  const [showRiskMetrics, setShowRiskMetrics] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({ gain: 20, loss: -10 });
  const [viewMode, setViewMode] = useState('table'); // 'table', 'cards', 'chart'
  const [chartType, setChartType] = useState('line'); // 'line', 'bar', 'area'
  const [exportFormat, setExportFormat] = useState('csv');
  const [customColumns, setCustomColumns] = useState(['value', 'gain_loss', 'gain_loss_pct']);
  const [dataIntegrityIssues, setDataIntegrityIssues] = useState([]);
  const [performanceAttribution, setPerformanceAttribution] = useState(null);
  const chartContainerRef = useRef(null);
  
  // Enhanced date range options
  const dateRangeOptions = [
    { value: 'last7', label: 'Last 7 Days', days: 7 },
    { value: 'last14', label: 'Last 14 Days', days: 14 },
    { value: 'last30', label: 'Last 30 Days', days: 30 },
    { value: 'last90', label: 'Last 90 Days', days: 90 },
    { value: 'last180', label: 'Last 180 Days', days: 180 },
    { value: 'last365', label: 'Last Year', days: 365 },
    { value: 'ytd', label: 'Year to Date', days: 'ytd' },
    { value: 'custom', label: 'Custom Range', days: 'custom' },
    { value: 'all', label: 'All Time', days: 'all' }
  ];

  // Asset type configuration with enhanced metadata
  const assetTypeConfig = {
    security: { 
      color: '#4f46e5', 
      icon: TrendingUp, 
      label: 'Securities',
      riskLevel: 'medium'
    },
    cash: { 
      color: '#10b981', 
      icon: DollarSign, 
      label: 'Cash',
      riskLevel: 'low'
    },
    crypto: { 
      color: '#8b5cf6', 
      icon: Zap, 
      label: 'Cryptocurrency',
      riskLevel: 'high'
    },
    metal: { 
      color: '#f97316', 
      icon: Shield, 
      label: 'Precious Metals',
      riskLevel: 'medium'
    },
    realestate: { 
      color: '#ef4444', 
      icon: BookOpen, 
      label: 'Real Estate',
      riskLevel: 'low'
    },
    other: { 
      color: '#6b7280', 
      icon: Activity, 
      label: 'Other',
      riskLevel: 'medium'
    }
  };

  // Sector configuration with colors
  const sectorColors = {
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
    'Utilities': '#0284c7',
    'Unknown': '#9ca3af'
  };

  // Format utilities
  const formatCurrency = (value, compact = false) => {
    if (value === null || value === undefined || value === 0) return '-';
    
    if (compact && Math.abs(value) >= 1000) {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
      });
      return formatter.format(value);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value, showSign = true) => {
    if (value === null || value === undefined) return '-';
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr, format = 'short') => {
    const date = new Date(dateStr);
    if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (format === 'full') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } else if (format === 'time') {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  // Calculate risk metrics
  const calculateRiskMetrics = (positions, dates) => {
    if (!positions || !dates || dates.length < 2) return null;

    const metrics = {
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      concentration: {},
      correlations: {}
    };

    // Calculate daily returns
    const returns = [];
    for (let i = 1; i < dates.length; i++) {
      const prevTotal = positions.reduce((sum, pos) => {
        const prevValue = pos.values[dates[i-1]]?.value || 0;
        return sum + prevValue;
      }, 0);
      
      const currTotal = positions.reduce((sum, pos) => {
        const currValue = pos.values[dates[i]]?.value || 0;
        return sum + currValue;
      }, 0);
      
      if (prevTotal > 0) {
        returns.push((currTotal - prevTotal) / prevTotal);
      }
    }

    // Calculate volatility (standard deviation of returns)
    if (returns.length > 0) {
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      metrics.volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized

      // Sharpe Ratio (assuming risk-free rate of 2%)
      const annualizedReturn = avgReturn * 252 * 100;
      metrics.sharpeRatio = (annualizedReturn - 2) / metrics.volatility;
    }

    // Calculate concentration by asset type
    const totalValue = positions.reduce((sum, pos) => {
      const latestDate = dates[dates.length - 1];
      return sum + (pos.values[latestDate]?.value || 0);
    }, 0);

    positions.forEach(pos => {
      const latestDate = dates[dates.length - 1];
      const value = pos.values[latestDate]?.value || 0;
      const type = pos.asset_type;
      
      if (!metrics.concentration[type]) {
        metrics.concentration[type] = 0;
      }
      metrics.concentration[type] += (value / totalValue) * 100;
    });

    return metrics;
  };

  // Calculate performance attribution
  const calculatePerformanceAttribution = (positions, startDate, endDate) => {
    if (!positions || !startDate || !endDate) return null;

    const attribution = {
      byAssetType: {},
      bySector: {},
      byPosition: [],
      total: { startValue: 0, endValue: 0, change: 0, changePercent: 0 }
    };

    positions.forEach(pos => {
      const startValue = pos.values[startDate]?.value || 0;
      const endValue = pos.values[endDate]?.value || 0;
      const change = endValue - startValue;
      const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;

      // Total
      attribution.total.startValue += startValue;
      attribution.total.endValue += endValue;

      // By Asset Type
      if (!attribution.byAssetType[pos.asset_type]) {
        attribution.byAssetType[pos.asset_type] = {
          startValue: 0,
          endValue: 0,
          change: 0,
          contribution: 0
        };
      }
      attribution.byAssetType[pos.asset_type].startValue += startValue;
      attribution.byAssetType[pos.asset_type].endValue += endValue;
      attribution.byAssetType[pos.asset_type].change += change;

      // By Sector
      const sector = pos.sector || 'Unknown';
      if (!attribution.bySector[sector]) {
        attribution.bySector[sector] = {
          startValue: 0,
          endValue: 0,
          change: 0,
          contribution: 0
        };
      }
      attribution.bySector[sector].startValue += startValue;
      attribution.bySector[sector].endValue += endValue;
      attribution.bySector[sector].change += change;

      // By Position (top contributors)
      attribution.byPosition.push({
        identifier: pos.identifier,
        name: pos.name,
        startValue,
        endValue,
        change,
        changePercent,
        contribution: 0 // Will be calculated after total
      });
    });

    // Calculate total change and contributions
    attribution.total.change = attribution.total.endValue - attribution.total.startValue;
    attribution.total.changePercent = attribution.total.startValue > 0 
      ? (attribution.total.change / attribution.total.startValue) * 100 
      : 0;

    // Calculate contributions
    Object.keys(attribution.byAssetType).forEach(type => {
      attribution.byAssetType[type].contribution = 
        attribution.total.startValue > 0 
          ? (attribution.byAssetType[type].change / attribution.total.startValue) * 100
          : 0;
    });

    Object.keys(attribution.bySector).forEach(sector => {
      attribution.bySector[sector].contribution = 
        attribution.total.startValue > 0 
          ? (attribution.bySector[sector].change / attribution.total.startValue) * 100
          : 0;
    });

    attribution.byPosition.forEach(pos => {
      pos.contribution = attribution.total.startValue > 0 
        ? (pos.change / attribution.total.startValue) * 100
        : 0;
    });

    // Sort positions by absolute contribution
    attribution.byPosition.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return attribution;
  };

  // Check data integrity
  const checkDataIntegrity = useCallback(() => {
    const issues = [];
    
    if (!rawData || !unifiedPositions.length) return issues;
    
    const latestDate = displayDates[displayDates.length - 1];
    const latestSnapshot = latestDate ? rawData.snapshots_by_date[latestDate] : null;
    
    if (!latestSnapshot) return issues;

    // Check for missing positions in snapshot
    unifiedPositions.forEach(pos => {
      const key = `${pos.asset_type}|${pos.ticker || pos.identifier}|${pos.account_id}`;
      if (!latestSnapshot.positions[key]) {
        issues.push({
          type: 'missing_in_snapshot',
          severity: 'warning',
          position: pos.identifier,
          message: `Position ${pos.identifier} exists in unified but not in snapshot`
        });
      }
    });

    // Check for value discrepancies
    Object.entries(latestSnapshot.positions).forEach(([key, snapPos]) => {
      const unifiedPos = unifiedPositions.find(p => {
        const pKey = `${p.asset_type}|${p.ticker || p.identifier}|${p.account_id}`;
        return pKey === key;
      });

      if (unifiedPos) {
        const valueDiff = Math.abs((unifiedPos.current_value || 0) - snapPos.current_value);
        const percentDiff = snapPos.current_value > 0 ? (valueDiff / snapPos.current_value) * 100 : 0;

        if (percentDiff > 1) { // More than 1% difference
          issues.push({
            type: 'value_mismatch',
            severity: percentDiff > 5 ? 'error' : 'warning',
            position: snapPos.identifier,
            message: `Value mismatch for ${snapPos.identifier}: ${formatCurrency(valueDiff)} (${formatPercentage(percentDiff)})`
          });
        }
      }
    });

    // Check for stale prices
    const now = new Date();
    displayDates.forEach(date => {
      const snapshot = rawData.snapshots_by_date[date];
      if (snapshot) {
        Object.values(snapshot.positions).forEach(pos => {
          const priceAge = (now - new Date(pos.price_updated_at)) / (1000 * 60 * 60); // Hours
          if (priceAge > 48 && pos.asset_type === 'security') {
            issues.push({
              type: 'stale_price',
              severity: 'info',
              position: pos.identifier,
              message: `Price for ${pos.identifier} is ${Math.floor(priceAge)} hours old`
            });
          }
        });
      }
    });

    return issues;
  }, [rawData, unifiedPositions, displayDates]);

  // Fetch data
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
          setCompareDate1(dates[Math.max(0, dates.length - 30)]); // 30 days ago
          setCompareDate2(dates[dates.length - 1]); // Most recent

          // Initialize selected accounts
          if (snapData.summary.accounts) {
            setSelectedAccounts(new Set(snapData.summary.accounts.map(acc => acc.id.toString())));
          }
        }

        // Simulate tax lots
        const lots = {};
        unifiedData.positions?.forEach(pos => {
          const key = `${pos.asset_type}|${pos.ticker || pos.identifier}|${pos.account_id}`;
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

        // Load saved views from localStorage
        const saved = localStorage.getItem('portfolioAnalysisViews');
        if (saved) {
          setSavedViews(JSON.parse(saved));
        }

        // Simulate benchmark data (S&P 500)
        const benchmarkValues = {};
        dates.forEach((date, idx) => {
          const baseValue = 100000;
          const dailyReturn = (Math.random() - 0.5) * 0.02; // ±2% daily
          const cumulativeReturn = 1 + (idx * 0.0003) + dailyReturn; // Slight upward bias
          benchmarkValues[date] = baseValue * cumulativeReturn;
        });
        setBenchmarkData(benchmarkValues);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update data integrity issues
  useEffect(() => {
    if (rawData && unifiedPositions.length) {
      const issues = checkDataIntegrity();
      setDataIntegrityIssues(issues);
    }
  }, [rawData, unifiedPositions, checkDataIntegrity]);

  // Update performance attribution when dates change
  useEffect(() => {
    if (compareDate1 && compareDate2 && processedData.rows.length > 0) {
      const attribution = calculatePerformanceAttribution(
        processedData.rows.filter(r => r.type !== 'group' && r.type !== 'taxlot'),
        compareDate1,
        compareDate2
      );
      setPerformanceAttribution(attribution);
    }
  }, [compareDate1, compareDate2, processedData]);

  // Update visible date range
  useEffect(() => {
    if (!displayDates.length) return;

    let start, end;
    const option = dateRangeOptions.find(opt => opt.value === dateRangeOption);
    
    if (dateRangeOption === 'ytd') {
      const currentYear = new Date().getFullYear();
      const ytdIndex = displayDates.findIndex(date => new Date(date).getFullYear() === currentYear);
      start = ytdIndex >= 0 ? ytdIndex : 0;
      end = displayDates.length;
    } else if (dateRangeOption === 'all') {
      start = 0;
      end = displayDates.length;
    } else if (dateRangeOption === 'custom') {
      // Keep current range for custom
      return;
    } else if (option && typeof option.days === 'number') {
      start = Math.max(0, displayDates.length - option.days);
      end = displayDates.length;
    } else {
      start = Math.max(0, displayDates.length - 30);
      end = displayDates.length;
    }

    setDateRange({ start, end });
  }, [dateRangeOption, displayDates]);

  // Process data for display
  const processedData = useMemo(() => {
    if (!rawData || !displayDates.length) return { rows: [], totals: {}, visibleDates: [] };

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
        positionCount: 0,
        dayChange: 0,
        dayChangePercent: 0
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

    // Calculate day-over-day changes for totals
    visibleDates.forEach((date, idx) => {
      if (idx > 0) {
        const prevDate = visibleDates[idx - 1];
        const prevValue = totals[prevDate].value;
        const currValue = totals[date].value;
        totals[date].dayChange = currValue - prevValue;
        totals[date].dayChangePercent = prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0;
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
    if (groupBy === 'none') {
      // No grouping - show all positions flat
      rows.push(...allRows);
    } else {
      const grouped = {};
      
      allRows.forEach(row => {
        let groupKey, groupName;
        
        if (groupBy === 'asset_type') {
          groupKey = row.asset_type;
          groupName = assetTypeConfig[row.asset_type]?.label || row.asset_type;
        } else if (groupBy === 'account') {
          groupKey = row.account_id.toString();
          groupName = row.account_name;
        } else if (groupBy === 'sector') {
          groupKey = row.sector || 'Unknown';
          groupName = groupKey;
        } else if (groupBy === 'holding_term') {
          groupKey = row.holding_term || 'Unknown';
          groupName = groupKey;
        }

        if (!grouped[groupKey]) {
          grouped[groupKey] = {
            key: groupKey,
            name: groupName,
            type: 'group',
            children: [],
            values: {},
            institution: groupBy === 'account' ? row.institution : undefined
          };

          visibleDates.forEach(date => {
            grouped[groupKey].values[date] = {
              value: 0,
              costBasis: 0,
              gainLoss: 0,
              income: 0,
              positionCount: 0
            };
          });
        }

        grouped[groupKey].children.push(row);

        Object.entries(row.values).forEach(([date, data]) => {
          grouped[groupKey].values[date].value += data.value;
          grouped[groupKey].values[date].costBasis += data.costBasis;
          grouped[groupKey].values[date].gainLoss += data.gainLoss;
          grouped[groupKey].values[date].income += data.income;
          grouped[groupKey].values[date].positionCount += 1;
        });
      });

      // Add groups to rows
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
                  name: formatDate(lot.purchase_date, 'full')
                });
              });
            }
          });
        }
      });
    }

    return { rows, totals, visibleDates };
  }, [rawData, displayDates, dateRange, groupBy, expandedGroups, expandedPositions, searchTerm, selectedAssetTypes, selectedAccounts, valueDisplay, sortColumn, sortDirection, taxLots]);

  // Process comparison data
  const comparisonData = useMemo(() => {
    if (!rawData || !compareDate1 || !compareDate2) return { positions: [], summary: {} };

    const snapshot1 = rawData.snapshots_by_date[compareDate1];
    const snapshot2 = rawData.snapshots_by_date[compareDate2];
    if (!snapshot1 || !snapshot2) return { positions: [], summary: {} };

    const positions = [];
    const summary = {
      date1Total: 0,
      date2Total: 0,
      totalChange: 0,
      totalChangePercent: 0,
      winners: 0,
      losers: 0,
      newPositions: 0,
      closedPositions: 0
    };

    // Process all positions from both dates
    const allKeys = new Set([
      ...Object.keys(snapshot1.positions || {}),
      ...Object.keys(snapshot2.positions || {})
    ]);

    allKeys.forEach(key => {
      const pos1 = snapshot1.positions[key];
      const pos2 = snapshot2.positions[key];

      // Apply filters
      const position = pos1 || pos2;
      if (!selectedAssetTypes.has(position.asset_type)) return;
      if (!selectedAccounts.has(position.account_id.toString())) return;
      if (searchTerm && !position.identifier.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !position.name.toLowerCase().includes(searchTerm.toLowerCase())) return;

      const date1Value = pos1?.current_value || 0;
      const date2Value = pos2?.current_value || 0;
      const change = date2Value - date1Value;
      const changePercent = date1Value > 0 ? (change / date1Value) * 100 : (date2Value > 0 ? 100 : 0);

      positions.push({
        key,
        identifier: position.identifier,
        name: position.name,
        account_name: position.account_name,
        asset_type: position.asset_type,
        sector: position.sector,
        date1Value,
        date1Quantity: pos1?.quantity || 0,
        date1Price: pos1?.current_price || 0,
        date2Value,
        date2Quantity: pos2?.quantity || 0,
        date2Price: pos2?.current_price || 0,
        change,
        changePercent,
        isNew: !pos1 && pos2,
        isClosed: pos1 && !pos2,
        quantityChange: (pos2?.quantity || 0) - (pos1?.quantity || 0)
      });

      // Update summary
      summary.date1Total += date1Value;
      summary.date2Total += date2Value;
      if (change > 0) summary.winners++;
      if (change < 0) summary.losers++;
      if (!pos1 && pos2) summary.newPositions++;
      if (pos1 && !pos2) summary.closedPositions++;
    });

    summary.totalChange = summary.date2Total - summary.date1Total;
    summary.totalChangePercent = summary.date1Total > 0 
      ? (summary.totalChange / summary.date1Total) * 100 
      : 0;

    // Sort by absolute change
    positions.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return { positions, summary };
  }, [rawData, compareDate1, compareDate2, selectedAssetTypes, selectedAccounts, searchTerm]);

  // Save/Load views
  const saveCurrentView = (name) => {
    const view = {
      id: Date.now(),
      name,
      dateRange: dateRangeOption,
      groupBy,
      valueDisplay,
      selectedAssetTypes: Array.from(selectedAssetTypes),
      selectedAccounts: Array.from(selectedAccounts),
      showDetails,
      customColumns,
      compareDate1,
      compareDate2
    };

    const newViews = [...savedViews, view];
    setSavedViews(newViews);
    localStorage.setItem('portfolioAnalysisViews', JSON.stringify(newViews));
    setCurrentView(view);
  };

  const loadView = (view) => {
    setDateRangeOption(view.dateRange);
    setGroupBy(view.groupBy);
    setValueDisplay(view.valueDisplay);
    setSelectedAssetTypes(new Set(view.selectedAssetTypes));
    setSelectedAccounts(new Set(view.selectedAccounts));
    setShowDetails(view.showDetails);
    setCustomColumns(view.customColumns || ['value', 'gain_loss', 'gain_loss_pct']);
    setCompareDate1(view.compareDate1);
    setCompareDate2(view.compareDate2);
    setCurrentView(view);
  };

  const deleteView = (viewId) => {
    const newViews = savedViews.filter(v => v.id !== viewId);
    setSavedViews(newViews);
    localStorage.setItem('portfolioAnalysisViews', JSON.stringify(newViews));
    if (currentView?.id === viewId) {
      setCurrentView(null);
    }
  };

  // Export functionality
  const exportData = () => {
    const { rows, visibleDates } = processedData;
    
    if (exportFormat === 'csv') {
      // Build CSV
      let csv = 'Position,Type,Account';
      visibleDates.forEach(date => {
        csv += `,${formatDate(date, 'full')}`;
      });
      csv += '\n';

      rows.forEach(row => {
        if (row.type !== 'taxlot') {
          csv += `"${row.identifier || row.name}","${row.asset_type || 'Group'}","${row.account_name || ''}"`;
          visibleDates.forEach(date => {
            const value = row.values[date]?.value || 0;
            csv += `,${value}`;
          });
          csv += '\n';
        }
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-analysis-${formatDate(new Date().toISOString(), 'full')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Render loading state
  if (isLoading && !rawData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-300">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  // Render error state
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
  const riskMetrics = showRiskMetrics ? calculateRiskMetrics(rows.filter(r => r.type !== 'group' && r.type !== 'taxlot'), visibleDates) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Head>
        <title>Portfolio Analysis | NestEgg</title>
      </Head>

      <div className="p-4 md:p-8">
        {/* Header with Actions */}
        <div className="max-w-full mx-auto mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Portfolio Analysis Suite
              </h1>
              <p className="text-gray-400">
                Advanced portfolio analytics and position tracking
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowRiskMetrics(!showRiskMetrics)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  showRiskMetrics ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <Shield className="w-4 h-4" />
                Risk Metrics
              </button>
              <button
                onClick={() => setShowBenchmark(!showBenchmark)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  showBenchmark ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <Target className="w-4 h-4" />
                Benchmark
              </button>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors text-gray-300"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => router.push('/reports')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-300"
              >
                Back to Reports
              </button>
            </div>
          </div>
        </div>

        {/* Data Integrity Alert */}
        {dataIntegrityIssues.length > 0 && (
          <div className="max-w-full mx-auto mb-6">
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-yellow-400 font-semibold">Data Integrity Issues</h3>
              </div>
              <div className="space-y-1">
                {dataIntegrityIssues.slice(0, 3).map((issue, idx) => (
                  <p key={idx} className="text-sm text-gray-300">{issue.message}</p>
                ))}
                {dataIntegrityIssues.length > 3 && (
                  <p className="text-sm text-gray-400">
                    ...and {dataIntegrityIssues.length - 3} more issues
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Summary Cards */}
        <div className="max-w-full mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Value Card */}
            <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Value</p>
                  <DollarSign className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totals[visibleDates[visibleDates.length - 1]]?.value || 0, true)}
                </p>
                <div className="flex items-center mt-2">
                  {totals[visibleDates[visibleDates.length - 1]]?.dayChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-400 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-400 mr-1" />
                  )}
                  <span className={`text-sm ${
                    totals[visibleDates[visibleDates.length - 1]]?.dayChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(totals[visibleDates[visibleDates.length - 1]]?.dayChange || 0)}
                    {' '}
                    ({formatPercentage(totals[visibleDates[visibleDates.length - 1]]?.dayChangePercent || 0)})
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent"></div>
            </div>

            {/* Total Gain/Loss Card */}
            <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Gain/Loss</p>
                  <Percent className="w-4 h-4 text-gray-500" />
                </div>
                <p className={`text-2xl font-bold ${
                  totals[visibleDates[visibleDates.length - 1]]?.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(totals[visibleDates[visibleDates.length - 1]]?.gainLoss || 0, true)}
                </p>
                <p className={`text-sm mt-2 ${
                  totals[visibleDates[visibleDates.length - 1]]?.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatPercentage(
                    totals[visibleDates[visibleDates.length - 1]]?.costBasis > 0
                      ? (totals[visibleDates[visibleDates.length - 1]]?.gainLoss / totals[visibleDates[visibleDates.length - 1]]?.costBasis) * 100
                      : 0
                  )}
                </p>
              </div>
              <div className={`absolute inset-0 bg-gradient-to-br ${
                totals[visibleDates[visibleDates.length - 1]]?.gainLoss >= 0 
                  ? 'from-green-600/10' 
                  : 'from-red-600/10'
              } to-transparent`}></div>
            </div>

            {/* Positions Count Card */}
            <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Active Positions</p>
                  <PieChart className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {totals[visibleDates[visibleDates.length - 1]]?.positionCount || 0}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Across {selectedAccounts.size} accounts
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent"></div>
            </div>

            {/* Risk Score Card (if metrics enabled) */}
            {showRiskMetrics && riskMetrics && (
              <div className="bg-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Volatility</p>
                    <Activity className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatPercentage(riskMetrics.volatility, false)}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Sharpe: {riskMetrics.sharpeRatio.toFixed(2)}
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent"></div>
              </div>
            )}
          </div>
        </div>

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <div className="max-w-full mx-auto mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">Saved Views</h3>
                <button
                  onClick={() => {
                    const name = prompt('Enter a name for this view:');
                    if (name) saveCurrentView(name);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Save Current View
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedViews.map(view => (
                  <div
                    key={view.id}
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
                      currentView?.id === view.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <button onClick={() => loadView(view)}>
                      {view.name}
                    </button>
                    <button
                      onClick={() => deleteView(view.id)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Controls */}
        <div className="max-w-full mx-auto mb-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <label className="text-xs text-gray-400 mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search positions..."
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Date Range</label>
                <select
                  value={dateRangeOption}
                  onChange={(e) => setDateRangeOption(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group By */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Group By</label>
                <div className="flex gap-1">
                  {[
                    { value: 'asset_type', label: 'Type' },
                    { value: 'account', label: 'Account' },
                    { value: 'sector', label: 'Sector' },
                    { value: 'none', label: 'None' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setGroupBy(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm flex-1 transition-colors ${
                        groupBy === option.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">View Mode</label>
                <div className="flex gap-1">
                  {[
                    { value: 'table', icon: BarChart3, label: 'Table' },
                    { value: 'cards', icon: PieChart, label: 'Cards' },
                    { value: 'chart', icon: Activity, label: 'Chart' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setViewMode(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm flex-1 transition-colors flex items-center justify-center gap-1 ${
                        viewMode === option.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                    >
                      <option.icon className="w-4 h-4" />
                      <span className="hidden md:inline">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {/* Asset Type Filters */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Asset Types:</span>
                {Object.entries(assetTypeConfig).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => toggleAssetType(type)}
                    className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                      selectedAssetTypes.has(type)
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </button>
                ))}
              </div>

              {/* Account Filters */}
              {rawData?.summary?.accounts && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Accounts:</span>
                  {rawData.summary.accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        selectedAccounts.has(account.id.toString())
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {account.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Options */}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-700 pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                  showDetails ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {showDetails ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Details
              </button>
              <button
                onClick={() => setShowHeatMap(!showHeatMap)}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                  showHeatMap ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                <Activity className="w-4 h-4" />
                Heat Map
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
              <button
                onClick={async () => {
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
                }}
                disabled={isLoading}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load Full Year'}
              </button>
            </div>
          </div>
        </div>

        {/* Performance Attribution */}
        {performanceAttribution && (
          <div className="max-w-full mx-auto mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Performance Attribution
              <span className="text-sm font-normal text-gray-400 ml-2">
                {formatDate(compareDate1, 'full')} to {formatDate(compareDate2, 'full')}
              </span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* By Asset Type */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">By Asset Type</h3>
                <div className="space-y-3">
                  {Object.entries(performanceAttribution.byAssetType).map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: assetTypeConfig[type]?.color || '#6b7280' }}
                        />
                        <span className="text-sm text-gray-300">{assetTypeConfig[type]?.label || type}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          data.contribution >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercentage(data.contribution)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(data.change, true)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Sector */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">By Sector</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Object.entries(performanceAttribution.bySector)
                    .sort((a, b) => Math.abs(b[1].contribution) - Math.abs(a[1].contribution))
                    .slice(0, 10)
                    .map(([sector, data]) => (
                      <div key={sector} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: sectorColors[sector] || '#9ca3af' }}
                          />
                          <span className="text-sm text-gray-300">{sector}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            data.contribution >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercentage(data.contribution)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(data.change, true)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Top Contributors */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Contributors</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {performanceAttribution.byPosition
                    .slice(0, 10)
                    .map((pos, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-300">{pos.identifier}</p>
                          <p className="text-xs text-gray-500">{pos.name}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            pos.contribution >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercentage(pos.contribution)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(pos.change, true)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {viewMode === 'table' && (
          <>
            {/* Historical Position Table */}
            <div className="max-w-full mx-auto mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                Historical Position Values
                <button
                  onClick={() => setShowHeatMap(!showHeatMap)}
                  className="text-sm font-normal text-gray-400 hover:text-white"
                >
                  {showHeatMap ? 'Hide' : 'Show'} Heat Map
                </button>
              </h2>
              
              <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-900 z-10 min-w-[250px]">
                          <div className="flex items-center gap-2">
                            {groupBy === 'asset_type' && 'Asset Type / Position'}
                            {groupBy === 'account' && 'Account / Position'}
                            {groupBy === 'sector' && 'Sector / Position'}
                            {groupBy === 'none' && 'Position'}
                          </div>
                        </th>
                        {visibleDates && visibleDates.map((date, idx) => (
                          <th 
                            key={idx} 
                            onClick={() => handleDateSort(date)}
                            className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[140px] cursor-pointer hover:text-white group"
                          >
                            <div className="flex items-center justify-end gap-1">
                              {formatDate(date)}
                              {sortColumn === date && (
                                <span className="text-indigo-400">
                                  {sortDirection === 'desc' ? '↓' : '↑'}
                                </span>
                              )}
                              <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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

                        // Calculate row metrics for highlighting
                        let rowTrend = 'stable';
                        if (visibleDates.length >= 2 && row.values) {
                          const firstValue = row.values[visibleDates[0]]?.value || 0;
                          const lastValue = row.values[visibleDates[visibleDates.length - 1]]?.value || 0;
                          const changePercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
                          
                          if (changePercent > alertThresholds.gain) rowTrend = 'hot';
                          else if (changePercent < alertThresholds.loss) rowTrend = 'cold';
                        }

                        return (
                          <tr 
                            key={rowKey}
                            className={`${
                              isGroup ? 'bg-gray-850 hover:bg-gray-750' : 
                              isTaxLot ? 'bg-gray-825' :
                              'hover:bg-gray-750'
                            } transition-all duration-200 ${
                              rowTrend === 'hot' ? 'ring-1 ring-green-500/20' :
                              rowTrend === 'cold' ? 'ring-1 ring-red-500/20' : ''
                            }`}
                          >
                            <td className={`px-4 py-3 sticky left-0 ${
                              isGroup ? 'bg-gray-850' : 
                              isTaxLot ? 'bg-gray-825' :
                              'bg-gray-800'
                            } z-10`}>
                              <div className={`flex items-center ${
                                isGroup ? '' : 
                                isTaxLot ? 'pl-12' :
                                'pl-6'
                              }`}>
                                {isGroup && (
                                  <button
                                    onClick={() => toggleGroup(row.key)}
                                    className="mr-2 text-gray-400 hover:text-white transition-colors"
                                  >
                                    {expandedGroups.has(row.key) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                )}
                                {isPosition && hasLots && (
                                  <button
                                    onClick={() => togglePosition(row.key)}
                                    className="mr-2 text-gray-400 hover:text-white transition-colors"
                                  >
                                    {expandedPositions.has(row.key) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                )}
                                {!isTaxLot && (
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                                    style={{ 
                                      backgroundColor: isGroup 
                                        ? (groupBy === 'asset_type' ? assetTypeConfig[row.key]?.color || '#6b7280' : 
                                           groupBy === 'sector' ? sectorColors[row.key] || '#9ca3af' : '#6b7280')
                                        : assetTypeConfig[row.asset_type]?.color || '#6b7280'
                                    }}
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white truncate">
                                    {isGroup ? (
                                      <span className="capitalize">{row.name}</span>
                                    ) : (
                                      <span>{row.identifier}</span>
                                    )}
                                  </div>
                                  {!isGroup && !isTaxLot && (
                                    <div className="text-xs text-gray-400 truncate">
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
                                      {row.name} • {formatNumber(row.quantity, 2)} shares
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {visibleDates && visibleDates.map((date, idx) => {
                              if (isTaxLot) {
                                return (
                                  <td key={idx} className="px-4 py-3 text-right">
                                    <div className="text-sm text-gray-400">
                                      {formatCurrency(row.current_value)}
                                    </div>
                                  </td>
                                );
                              }

                              const data = row.values[date] || {};
                              const prevDate = idx > 0 ? visibleDates[idx - 1] : null;
                              const prevData = prevDate ? (row.values[prevDate] || {}) : {};

                              let primaryValue, secondaryValue, changeValue, changePercent;

                              if (valueDisplay === 'current') {
                                primaryValue = data.value;
                                secondaryValue = showDetails && data.quantity ? `${formatNumber(data.quantity, 2)} @ ${formatCurrency(data.price)}` : null;
                                changeValue = prevData.value ? data.value - prevData.value : 0;
                                changePercent = prevData.value ? ((data.value - prevData.value) / prevData.value) * 100 : 0;
                              } else if (valueDisplay === 'cost_basis') {
                                primaryValue = data.costBasis;
                                secondaryValue = showDetails && data.costPerUnit ? `@ ${formatCurrency(data.costPerUnit)}` : null;
                                changeValue = prevData.costBasis ? data.costBasis - prevData.costBasis : 0;
                                changePercent = prevData.costBasis ? ((data.costBasis - prevData.costBasis) / prevData.costBasis) * 100 : 0;
                              } else if (valueDisplay === 'gain_loss') {
                                primaryValue = data.gainLoss;
                                secondaryValue = data.gainLossPct;
                                changeValue = null;
                                changePercent = null;
                              }

                              // Heat map color
                              let cellColor = 'transparent';
                              if (showHeatMap && primaryValue) {
                                if (valueDisplay === 'gain_loss') {
                                  const intensity = Math.min(Math.abs(data.gainLossPct || 0) / 50, 1);
                                  cellColor = data.gainLoss >= 0 
                                    ? `rgba(34, 197, 94, ${intensity * 0.2})`
                                    : `rgba(239, 68, 68, ${intensity * 0.2})`;
                                } else if (changePercent !== null) {
                                  const intensity = Math.min(Math.abs(changePercent) / 10, 1);
                                  cellColor = changePercent >= 0 
                                    ? `rgba(34, 197, 94, ${intensity * 0.2})`
                                    : `rgba(239, 68, 68, ${intensity * 0.2})`;
                                }
                              }

                              return (
                                <td 
                                  key={idx} 
                                  className="px-4 py-3 text-right relative"
                                  style={{ backgroundColor: cellColor }}
                                >
                                  <div className={`text-sm font-medium ${
                                    valueDisplay === 'gain_loss' 
                                      ? (primaryValue >= 0 ? 'text-green-400' : 'text-red-400')
                                      : 'text-white'
                                  }`}>
                                    {formatCurrency(primaryValue)}
                                  </div>
                                  {secondaryValue !== null && (
                                    <div className={`text-xs mt-1 ${
                                      valueDisplay === 'gain_loss' 
                                        ? (secondaryValue >= 0 ? 'text-green-500' : 'text-red-500')
                                        : 'text-gray-500'
                                    }`}>
                                      {valueDisplay === 'gain_loss' ? formatPercentage(secondaryValue) : secondaryValue}
                                    </div>
                                  )}
                                  {showDetails && changeValue !== null && changeValue !== 0 && (
                                    <div className={`text-xs mt-1 flex items-center justify-end gap-1 ${
                                      changeValue >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {changeValue >= 0 ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                      {formatCurrency(Math.abs(changeValue))}
                                      {changePercent !== null && ` (${formatPercentage(Math.abs(changePercent), false)})`}
                                    </div>
                                  )}
                                  {/* Alert indicator */}
                                  {isPosition && changePercent !== null && (
                                    Math.abs(changePercent) > Math.abs(alertThresholds.gain) ||
                                    Math.abs(changePercent) > Math.abs(alertThresholds.loss)
                                  ) && (
                                    <div className="absolute top-1 right-1">
                                      <div className={`w-2 h-2 rounded-full ${
                                        changePercent > alertThresholds.gain ? 'bg-green-400' :
                                        changePercent < alertThresholds.loss ? 'bg-red-400' : ''
                                      } animate-pulse`} />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Total Row */}
                      <tr className="bg-gray-900 font-bold sticky bottom-0">
                        <td className="px-4 py-4 sticky left-0 bg-gray-900 z-10">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2 bg-indigo-500" />
                            <span className="text-sm text-white">Portfolio Total</span>
                            <span className="text-xs text-gray-400 ml-2">
                              ({totals[visibleDates[visibleDates.length - 1]]?.positionCount || 0} positions)
                            </span>
                          </div>
                        </td>
                        {visibleDates && visibleDates.map((date, idx) => {
                          const total = totals[date] || {};
                          const prevDate = idx > 0 ? visibleDates[idx - 1] : null;
                          const prevTotal = prevDate ? (totals[prevDate] || {}) : {};
                          
                          let dayChange = 0;
                          let dayChangePercent = 0;
                          
                          if (valueDisplay === 'current' && prevTotal.value) {
                            dayChange = total.value - prevTotal.value;
                            dayChangePercent = (dayChange / prevTotal.value) * 100;
                          }

                          return (
                            <td key={idx} className="px-4 py-4 text-right bg-gray-900">
                              <div className="text-sm text-white font-bold">
                                {valueDisplay === 'current' && formatCurrency(total.value)}
                                {valueDisplay === 'cost_basis' && formatCurrency(total.costBasis)}
                                {valueDisplay === 'gain_loss' && (
                                  <span className={total.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {formatCurrency(total.gainLoss)}
                                  </span>
                                )}
                              </div>
                              {valueDisplay === 'gain_loss' && total.costBasis > 0 && (
                                <div className={`text-xs mt-1 ${total.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {formatPercentage((total.gainLoss / total.costBasis) * 100)}
                                </div>
                              )}
                              {showDetails && valueDisplay === 'current' && dayChange !== 0 && (
                                <div className={`text-xs mt-1 ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {dayChange >= 0 ? '+' : ''}{formatCurrency(dayChange)} ({formatPercentage(dayChangePercent)})
                                </div>
                              )}
                              {showBenchmark && benchmarkData && (
                                <div className="text-xs mt-1 text-gray-500">
                                  Bench: {formatCurrency(benchmarkData[date], true)}
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

            {/* Position Comparison Table */}
            <div className="max-w-full mx-auto mb-8">
              <h2 className="text-xl font-bold text-white mb-4">
                Position Comparison Analysis
              </h2>

              {/* Date Selectors */}
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">From Date</label>
                    <select
                      value={compareDate1 || ''}
                      onChange={(e) => setCompareDate1(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {displayDates.map(date => (
                        <option key={date} value={date}>{formatDate(date, 'full')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">To Date</label>
                    <select
                      value={compareDate2 || ''}
                      onChange={(e) => setCompareDate2(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {displayDates.map(date => (
                        <option key={date} value={date}>{formatDate(date, 'full')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="bg-gray-700 rounded-lg p-3 w-full">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Period Return</span>
                        <span className={`text-lg font-bold ${
                          comparisonData.summary.totalChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatPercentage(comparisonData.summary.totalChangePercent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparison Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Winners</p>
                    <p className="text-lg font-semibold text-green-400">{comparisonData.summary.winners}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Losers</p>
                    <p className="text-lg font-semibold text-red-400">{comparisonData.summary.losers}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">New Positions</p>
                    <p className="text-lg font-semibold text-blue-400">{comparisonData.summary.newPositions}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Closed Positions</p>
                    <p className="text-lg font-semibold text-yellow-400">{comparisonData.summary.closedPositions}</p>
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
                          $ Change
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          % Change
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Qty Change
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {comparisonData.positions.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-750 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: assetTypeConfig[row.asset_type]?.color || '#6b7280' }}
                              />
                              <div>
                                <div className="text-sm font-medium text-white">{row.identifier}</div>
                                <div className="text-xs text-gray-400">
                                  {row.name} • {row.account_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm text-white">{formatCurrency(row.date1Value)}</div>
                            {row.date1Quantity > 0 && (
                              <div className="text-xs text-gray-500">
                                {formatNumber(row.date1Quantity, 2)} @ {formatCurrency(row.date1Price)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-sm text-white">{formatCurrency(row.date2Value)}</div>
                            {row.date2Quantity > 0 && (
                              <div className="text-xs text-gray-500">
                                {formatNumber(row.date2Quantity, 2)} @ {formatCurrency(row.date2Price)}
                              </div>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-medium ${
                            row.change >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {row.change >= 0 ? '+' : ''}{formatCurrency(row.change)}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-medium ${
                            row.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercentage(row.changePercent)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.quantityChange !== 0 && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                row.quantityChange > 0 
                                  ? 'bg-blue-900/50 text-blue-400' 
                                  : 'bg-orange-900/50 text-orange-400'
                              }`}>
                                {row.quantityChange > 0 ? '+' : ''}{formatNumber(row.quantityChange, 2)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.isNew && (
                              <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-full">
                                New
                              </span>
                            )}
                            {row.isClosed && (
                              <span className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded-full">
                                Closed
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
          </>
        )}

        {/* Chart View */}
        {viewMode === 'chart' && (
          <div className="max-w-full mx-auto">
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Portfolio Trends</h2>
                <div className="flex gap-2">
                  {['line', 'bar', 'area'].map(type => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-3 py-1 rounded text-sm capitalize ${
                        chartType === type 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div ref={chartContainerRef} className="h-96 flex items-center justify-center">
                <p className="text-gray-400">
                  Chart visualization would be rendered here using a charting library
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="max-w-full mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows
                .filter(row => row.type !== 'taxlot')
                .map((row, idx) => {
                  const latestDate = visibleDates[visibleDates.length - 1];
                  const firstDate = visibleDates[0];
                  const latestData = row.values[latestDate] || {};
                  const firstData = row.values[firstDate] || {};
                  const periodChange = latestData.value - firstData.value;
                  const periodChangePercent = firstData.value > 0 
                    ? (periodChange / firstData.value) * 100 
                    : 0;

                  return (
                    <div key={idx} className="bg-gray-800 rounded-xl p-6 hover:ring-2 hover:ring-indigo-500/50 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ 
                              backgroundColor: row.type === 'group'
                                ? (groupBy === 'asset_type' ? assetTypeConfig[row.key]?.color : sectorColors[row.key]) + '20'
                                : assetTypeConfig[row.asset_type]?.color + '20' || '#6b728020'
                            }}
                          >
                            {row.type === 'group' && groupBy === 'asset_type' && assetTypeConfig[row.key] ? (
                              React.createElement(assetTypeConfig[row.key].icon, {
                                className: 'w-5 h-5',
                                style: { color: assetTypeConfig[row.key].color }
                              })
                            ) : (
                              <div 
                                className="w-5 h-5 rounded-full"
                                style={{ 
                                  backgroundColor: row.type === 'group'
                                    ? (groupBy === 'asset_type' ? assetTypeConfig[row.key]?.color : sectorColors[row.key])
                                    : assetTypeConfig[row.asset_type]?.color || '#6b7280'
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              {row.type === 'group' ? row.name : row.identifier}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {row.type === 'group' 
                                ? `${row.children.length} positions`
                                : row.name
                              }
                            </p>
                          </div>
                        </div>
                        {row.sector && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                            {row.sector}
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-400">Current Value</p>
                          <p className="text-xl font-bold text-white">
                            {formatCurrency(latestData.value, true)}
                          </p>
                        </div>

                        <div className="flex justify-between">
                          <div>
                            <p className="text-xs text-gray-400">Period Change</p>
                            <p className={`text-sm font-medium ${
                              periodChange >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {periodChange >= 0 ? '+' : ''}{formatCurrency(periodChange)}
                              {' '}
                              ({formatPercentage(periodChangePercent)})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total Return</p>
                            <p className={`text-sm font-medium ${
                              latestData.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {formatPercentage(latestData.gainLossPct * 100)}
                            </p>
                          </div>
                        </div>

                        {!row.type && (
                          <div className="pt-3 border-t border-gray-700">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Qty: {formatNumber(latestData.quantity, 2)}</span>
                              <span className="text-gray-400">Price: {formatCurrency(latestData.price)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Risk Metrics Panel */}
        {showRiskMetrics && riskMetrics && (
          <div className="max-w-full mx-auto mb-8">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                Risk Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Portfolio Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-300">Annualized Volatility</span>
                      <span className="text-sm font-medium text-white">{formatPercentage(riskMetrics.volatility, false)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-300">Sharpe Ratio</span>
                      <span className="text-sm font-medium text-white">{riskMetrics.sharpeRatio.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Concentration Risk</h4>
                  <div className="space-y-2">
                    {Object.entries(riskMetrics.concentration)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([type, percent]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: assetTypeConfig[type]?.color || '#6b7280' }}
                            />
                            <span className="text-sm text-gray-300">{assetTypeConfig[type]?.label || type}</span>
                          </div>
                          <span className="text-sm font-medium text-white">{formatPercentage(percent, false)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Alert Thresholds</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-400">Gain Alert (%)</label>
                      <input
                        type="number"
                        value={alertThresholds.gain}
                        onChange={(e) => setAlertThresholds(prev => ({ ...prev, gain: parseFloat(e.target.value) }))}
                        className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Loss Alert (%)</label>
                      <input
                        type="number"
                        value={alertThresholds.loss}
                        onChange={(e) => setAlertThresholds(prev => ({ ...prev, loss: parseFloat(e.target.value) }))}
                        className="w-full mt-1 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="max-w-full mx-auto mt-12">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-gray-400">
                Last updated: {formatDate(new Date().toISOString(), 'time')}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <Activity className="w-4 h-4" />
                  Refresh Data
                </button>
                <button
                  onClick={() => router.push('/settings')}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}