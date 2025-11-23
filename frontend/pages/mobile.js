// pages/mobile.js
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// Store hooks
import { usePortfolioSummary, usePortfolioTrends, useGroupedPositions } from '@/store/hooks';

// Icons
import {
  ArrowUp, ArrowDown, RefreshCw, Wallet, PieChart as PieChartIcon, TrendingUp, TrendingDown,
  Building2, Sparkles, ChevronRight, Droplet, LineChart as LineIcon, Layers, Plus, X,
  ChevronDown, ChevronUp, Home, BarChart3, Settings, DollarSign, Target, Calendar,
  Share2, Bell, AlertCircle, CheckCircle2, Info, ExternalLink, Zap, Activity
} from 'lucide-react';

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------
const timeframeOptions = [
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'ALL' },
];

const assetColors = {
  securities: '#4f46e5', // Indigo
  security: '#4f46e5',
  cash: '#10b981',       // Emerald
  crypto: '#8b5cf6',     // Purple
  metal: '#f59e0b',      // Amber
  metals: '#f59e0b',
  real_estate: '#14b8a6',// Teal
  other: '#6b7280',      // Gray
  other_assets: '#6b7280'
};

const fmtCurrency = (value, inThousands = false) => {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (inThousands) {
    const thousands = value / 1000;
    return `$${thousands.toLocaleString('en-US', {
      minimumFractionDigits: 1, maximumFractionDigits: 1
    })}k`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(value);
};

const fmtPct = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
};

const chipColor = (n) =>
  n == null ? 'text-gray-300' : n >= 0 ? 'text-green-400' : 'text-red-400';

const chipBg = (n) =>
  n == null ? 'bg-gray-600/20 text-gray-300' : n >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400';

// Slice-by-timeframe helper
const filterByTimeframe = (rows, tf) => {
  if (!Array.isArray(rows)) return [];
  const n = rows.length;
  if (tf === '1d') return n > 1 ? rows.slice(-2) : rows;
  if (tf === '1w') return rows.slice(-7);
  if (tf === '1m') return rows.slice(-30);
  if (tf === '3m') return rows.slice(-90);
  if (tf === '6m') return rows.slice(-180);
  if (tf === '1y') return rows.slice(-365);
  if (tf === 'ytd') {
    const thisYear = new Date().getFullYear();
    return rows.filter(d => {
      const dt = new Date(d.rawDate ?? d.date);
      return dt.getFullYear() === thisYear;
    });
  }
  return rows; // 'all'
};

// -----------------------------------------------------
// Pull-to-Refresh Component
// -----------------------------------------------------
const PullToRefresh = ({ onRefresh, children, isRefreshing }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    const scrollTop = containerRef.current?.scrollTop || window.scrollY;
    if (scrollTop === 0 && startY.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 120));
        setIsPulling(true);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 80) {
      onRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
    startY.current = 0;
  }, [pullDistance, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center z-50"
            style={{ height: pullDistance }}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
            >
              <RefreshCw
                className={`w-5 h-5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`}
                style={{ opacity: Math.min(pullDistance / 80, 1) }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ transform: `translateY(${isPulling ? pullDistance * 0.5 : 0}px)`, transition: isPulling ? 'none' : 'transform 0.3s ease' }}>
        {children}
      </div>
    </div>
  );
};

// -----------------------------------------------------
// Bottom Sheet Component
// -----------------------------------------------------
const BottomSheet = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-white/10 rounded-t-3xl z-[101] max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex-shrink-0 p-4 border-b border-white/10">
              <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// -----------------------------------------------------
// Position Detail Sheet
// -----------------------------------------------------
const PositionDetailSheet = ({ position, isOpen, onClose }) => {
  if (!position) return null;

  const gainLoss = position.gain_loss || position.total_gain_loss || 0;
  const gainLossPct = (position.gain_loss_percent || position.total_gain_loss_pct || 0) * 100;
  const currentValue = position.current_value || position.total_current_value || 0;
  const costBasis = position.cost_basis || position.total_cost_basis || 0;
  const quantity = position.quantity || position.total_quantity || 0;
  const currentPrice = position.current_price || position.latest_price_per_unit || 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={position.name || position.identifier}>
      <div className="space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-gray-400 mb-1">Current Value</div>
            <div className="text-xl font-bold text-white">{fmtCurrency(currentValue)}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-gray-400 mb-1">Gain/Loss</div>
            <div className={`text-xl font-bold ${chipColor(gainLoss)}`}>
              {gainLoss >= 0 ? '+' : ''}{fmtCurrency(gainLoss)}
            </div>
            <div className={`text-xs ${chipColor(gainLossPct)}`}>
              {fmtPct(gainLossPct)}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Quantity</span>
            <span className="text-sm font-medium text-white">
              {quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Current Price</span>
            <span className="text-sm font-medium text-white">{fmtCurrency(currentPrice)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Cost Basis</span>
            <span className="text-sm font-medium text-white">{fmtCurrency(costBasis)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Avg Purchase Price</span>
            <span className="text-sm font-medium text-white">
              {fmtCurrency(quantity > 0 ? costBasis / quantity : 0)}
            </span>
          </div>
          {position.asset_type && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Asset Type</span>
              <span className="text-sm font-medium text-white capitalize">
                {position.asset_type.replace('_', ' ')}
              </span>
            </div>
          )}
          {position.sector && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Sector</span>
              <span className="text-sm font-medium text-white">{position.sector}</span>
            </div>
          )}
          {position.annual_income > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Annual Income</span>
              <span className="text-sm font-medium text-green-400">
                {fmtCurrency(position.annual_income)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-xl bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/30 px-4 py-3 text-sm font-medium text-white transition">
            View Details
          </button>
          <button className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 text-sm font-medium text-white transition">
            Edit Position
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

// -----------------------------------------------------
// Skeleton Loader
// -----------------------------------------------------
const SkeletonCard = () => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 animate-pulse">
    <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
    <div className="h-8 bg-white/10 rounded w-2/3 mb-2" />
    <div className="h-3 bg-white/10 rounded w-1/2" />
  </div>
);

// -----------------------------------------------------
// Swipeable Card Component
// -----------------------------------------------------
const SwipeableCard = ({ children, onSwipeLeft, onSwipeRight }) => {
  const [dragX, setDragX] = useState(0);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(e, { offset }) => {
        if (offset.x < -100 && onSwipeLeft) onSwipeLeft();
        if (offset.x > 100 && onSwipeRight) onSwipeRight();
        setDragX(0);
      }}
      onDrag={(e, { offset }) => setDragX(offset.x)}
      className="relative"
    >
      {children}
    </motion.div>
  );
};

// -----------------------------------------------------
// Bottom Navigation
// -----------------------------------------------------
const BottomNav = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'positions', icon: Layers, label: 'Positions' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
      <div className="grid grid-cols-4 h-16 max-w-6xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center justify-center gap-1 transition-colors relative"
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
              <span className={`text-[10px] ${isActive ? 'text-indigo-400 font-medium' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500 rounded-b-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// -----------------------------------------------------
// Mini Sparkline Component
// -----------------------------------------------------
const MiniSparkline = ({ data, color = '#6366f1' }) => {
  if (!data || data.length === 0) return null;

  const sparklineData = data.slice(-10).map((d, i) => ({ x: i, y: d.value || 0 }));

  return (
    <ResponsiveContainer width="100%" height={30}>
      <LineChart data={sparklineData}>
        <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// -----------------------------------------------------
// Floating Action Button
// -----------------------------------------------------
const FAB = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-500/50 flex items-center justify-center z-40"
    >
      <Plus className="w-6 h-6 text-white" />
    </motion.button>
  );
};

// -----------------------------------------------------
// Quick Stats Carousel
// -----------------------------------------------------
const QuickStatsCarousel = ({ summary }) => {
  const stats = [
    {
      label: 'Liquid Assets',
      value: summary?.liquidAssets || 0,
      change: summary?.periodChanges?.['1d']?.liquidAssets || 0,
      icon: Droplet,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15'
    },
    {
      label: 'Total Return',
      value: summary?.unrealizedGain || 0,
      change: summary?.unrealizedGainPercent || 0,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/15',
      isPercent: true
    },
    {
      label: 'Cash Position',
      value: summary?.altNetWorth?.netCash || 0,
      change: summary?.periodChanges?.['1d']?.netCash || 0,
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15'
    },
    {
      label: 'Total Assets',
      value: summary?.totalAssets || 0,
      change: summary?.periodChanges?.['1d']?.totalAssets || 0,
      icon: Wallet,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15'
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-4 px-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex-shrink-0 w-40 snap-start"
          >
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <span className="text-xs text-gray-400">{stat.label}</span>
              </div>
              <div className="text-lg font-bold text-white mb-1">
                {stat.isPercent ? fmtPct(stat.value) : fmtCurrency(stat.value)}
              </div>
              <div className={`text-xs ${chipColor(stat.change)}`}>
                {stat.change >= 0 ? '+' : ''}{stat.isPercent ? fmtPct(stat.change) : fmtCurrency(stat.change)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// -----------------------------------------------------
// Main Page Component
// -----------------------------------------------------
export default function MobilePortfolio() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState('1m');
  const [showK, setShowK] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showPositionDetail, setShowPositionDetail] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const {
    summary,
    topPositions,
    sectorAllocation: rawSectorAllocation,
    institutionAllocation: rawInstitutionAllocation,
    netCashBasisMetrics,
    loading,
    error,
    refresh: refreshData,
    lastFetched
  } = usePortfolioSummary();

  const { trends } = usePortfolioTrends();
  const { positions: allPositions } = useGroupedPositions();

  // Chart data (net worth)
  const chartData = useMemo(() => {
    if (!trends?.chartData) return [];
    return trends.chartData.map(d => {
      const dt = new Date(d.date);
      return {
        rawDate: d.date,
        date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: d.netWorth,
        totalAssets: d.totalAssets,
        totalLiabilities: d.totalLiabilities,
      };
    });
  }, [trends?.chartData]);

  const filteredChart = useMemo(
    () => filterByTimeframe(chartData, timeframe),
    [chartData, timeframe]
  );

  // Allocation / Mix
  const netWorthMixData = useMemo(() => {
    if (!summary) return [];
    const rows = [
      { key: 'securities', name: 'Securities', value: summary.assetAllocation?.securities?.value || 0, percentage: (summary.netWorthMix?.securities || 0) * 100, color: assetColors.securities },
      { key: 'cash', name: 'Net Cash', value: summary.altNetWorth?.netCash || 0, percentage: (summary.netWorthMix?.netCash || 0) * 100, color: assetColors.cash },
      { key: 'crypto', name: 'Crypto', value: summary.assetAllocation?.crypto?.value || 0, percentage: (summary.netWorthMix?.crypto || 0) * 100, color: assetColors.crypto },
      { key: 'metals', name: 'Metals', value: summary.assetAllocation?.metals?.value || 0, percentage: (summary.netWorthMix?.metals || 0) * 100, color: assetColors.metals },
      { key: 'real_estate', name: 'Real Estate', value: summary.altNetWorth?.realEstate || 0, percentage: (summary.netWorthMix?.realEstateEquity || 0) * 100, color: assetColors.real_estate },
      { key: 'other', name: 'Other Assets', value: summary.altNetWorth?.netOtherAssets || 0, percentage: (summary.netWorthMix?.netOtherAssets || 0) * 100, color: assetColors.other },
    ].filter(x => x.value > 0 || x.percentage > 0);
    return rows;
  }, [summary]);

  // Top positions condensed
  const topPositionsData = useMemo(() => {
    if (!topPositions) return [];
    return topPositions.slice(0, 8).map(p => ({
      name: p.name || p.identifier,
      id: p.identifier,
      value: p.current_value ?? p.value ?? 0,
      pct: (p.gain_loss_percent || 0) * 100,
      gl: p.gain_loss || 0,
      type: p.asset_type || 'security',
      fullData: p
    }));
  }, [topPositions]);

  // Institutions (top 3)
  const institutions = useMemo(() => {
    if (!rawInstitutionAllocation) return [];
    return rawInstitutionAllocation
      .slice(0, 3)
      .map(i => ({
        name: i.institution,
        percentage: (i.percentage || 0) * 100,
        color: i.primary_color || '#6B7280',
        accounts: i.account_count || 0
      }));
  }, [rawInstitutionAllocation]);

  // Day change
  const dayPct = summary?.periodChanges?.['1d']?.netWorthPercent ?? null;
  const dayAmt = summary?.periodChanges?.['1d']?.netWorthChange ?? null;

  // Tooltip for chart
  const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const v = payload[0]?.value ?? 0;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900/95 border border-gray-700 text-white px-3 py-2 rounded-lg shadow-lg"
        >
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-sm font-semibold">{fmtCurrency(v)}</div>
        </motion.div>
      );
    }
    return null;
  };

  const handlePositionClick = useCallback((position) => {
    setSelectedPosition(position.fullData || position);
    setShowPositionDetail(true);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    // Navigate to respective pages for non-home tabs
    if (tab === 'positions') router.push('/positions');
    if (tab === 'analytics') router.push('/command-center');
    if (tab === 'settings') router.push('/profile');
  }, [router]);

  // Loading state with skeleton
  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-925 to-gray-900 text-white">
        <Head>
          <title>NestEgg | Mobile</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="theme-color" content="#030712" />
        </Head>
        <main className="max-w-6xl mx-auto px-4 pb-24 pt-6">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <div className="text-red-400 font-semibold mb-2">Unable to Load Portfolio</div>
        <div className="text-gray-400 text-sm mb-6 text-center max-w-sm">{error}</div>
        <button
          onClick={refreshData}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  // Safe guards
  const netWorth = summary?.netWorth ?? 0;
  const totalAssets = summary?.totalAssets ?? 0;
  const totalLiabilities = summary?.liabilities?.total ?? 0;

  return (
    <PullToRefresh onRefresh={refreshData} isRefreshing={loading}>
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-925 to-gray-900 text-white">
        <Head>
          <title>NestEgg | Mobile Portfolio</title>
          <meta name="description" content="Your complete financial dashboard on the go" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="theme-color" content="#030712" />
          <meta name="mobile-web-app-capable" content="yes" />
        </Head>

        <main className="max-w-6xl mx-auto px-4 pb-24 pt-safe">
          {/* HERO CARD */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-6"
          >
            <div className="relative overflow-hidden rounded-2xl p-5 md:p-6 bg-gradient-to-br from-indigo-600/20 via-blue-500/10 to-purple-600/20 border border-white/10 backdrop-blur">
              {/* Decorative blobs */}
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
              <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />

              {/* Header */}
              <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/10">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-200/90">Portfolio</p>
                    <p className="text-[10px] text-gray-400">
                      {lastFetched ? new Date(lastFetched).toLocaleTimeString() : '—'}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={refreshData}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 active:bg-white/15 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Syncing…' : 'Sync'}
                </motion.button>
              </div>

              {/* Net Worth */}
              <div className="relative">
                <div className="text-xs text-gray-400 mb-1">Net Worth</div>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-3"
                >
                  {fmtCurrency(netWorth)}
                </motion.div>

                {/* Day change chip */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-full ${chipBg(dayPct)}`}>
                    {dayPct != null && dayPct >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : dayPct != null ? <ArrowDown className="w-4 h-4 mr-1" /> : null}
                    {dayPct != null ? fmtPct(dayPct) : '—'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {dayAmt != null ? `${dayAmt >= 0 ? '+' : ''}${fmtCurrency(Math.abs(dayAmt))}` : '—'} today
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* QUICK STATS CAROUSEL */}
          <section className="mt-4">
            <QuickStatsCarousel summary={summary} />
          </section>

          {/* TIMEFRAME SELECTOR */}
          <section className="mt-4">
            <div className="flex overflow-x-auto no-scrollbar gap-2 snap-x snap-mandatory pb-2">
              {timeframeOptions.map(opt => (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTimeframe(opt.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition snap-start ${
                    timeframe === opt.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-white/5 border-white/10 text-gray-300 active:bg-white/10'
                  }`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </section>

          {/* CHART */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4"
          >
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/15">
                    <Activity className="w-5 h-5 text-indigo-300" />
                  </div>
                  <h3 className="text-base font-semibold">Net Worth Trend</h3>
                </div>
                <div className="text-xs text-gray-400 uppercase">{timeframe}</div>
              </div>
              <div className="h-64 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => {
                        if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                        if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
                        return `$${v.toLocaleString()}`;
                      }}
                    />
                    <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" opacity={0.3} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#nwFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.section>

          {/* PERFORMANCE CHIPS */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-base font-semibold">Performance</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['1d', '1w', '1m', 'ytd', '1y', '3y'].map((key, idx) => {
                  const data = summary?.periodChanges?.[key];
                  const amt = data?.netWorthChange ?? null;
                  const pct = data?.netWorthPercent ?? null;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-3"
                    >
                      <div className="text-xs text-gray-400 mb-1 uppercase font-medium">{key}</div>
                      <div className={`text-base font-bold ${chipColor(pct)}`}>
                        {pct != null ? fmtPct(pct) : '—'}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {amt != null ? `${amt >= 0 ? '+' : ''}${fmtCurrency(Math.abs(amt))}` : '—'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* NET WORTH MIX */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/15">
                    <PieChartIcon className="w-5 h-5 text-blue-300" />
                  </div>
                  <h3 className="text-base font-semibold">Asset Mix</h3>
                </div>
                <button
                  onClick={() => setShowK(!showK)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 active:bg-white/10"
                >
                  {showK ? 'Show $' : 'Show k'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Donut Chart */}
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={netWorthMixData}
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        cornerRadius={8}
                        dataKey="value"
                      >
                        {netWorthMixData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-xl font-bold">{fmtCurrency(netWorth, showK)}</div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {netWorthMixData.length === 0 && (
                    <div className="text-sm text-gray-400">No allocation data</div>
                  )}
                  {netWorthMixData.map((row, idx) => (
                    <motion.div
                      key={row.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: row.color }} />
                        <span className="text-sm text-white truncate">{row.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-white">{fmtCurrency(row.value, showK)}</div>
                        <div className="text-xs text-gray-400">{row.percentage.toFixed(1)}%</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* SNAPSHOT GRID */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* Financial Snapshot */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold">Snapshot</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-400">Total Assets</span>
                  <span className="text-sm font-semibold text-white">{fmtCurrency(totalAssets)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-400">Liabilities</span>
                  <span className="text-sm font-semibold text-red-400">-{fmtCurrency(totalLiabilities)}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-400">Liquidity</span>
                    <span className="text-sm font-semibold text-blue-400">
                      {summary?.riskMetrics?.liquidity_ratio != null
                        ? `${((summary.riskMetrics.liquidity_ratio || 0) * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Flow */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-2 mb-3">
                <Droplet className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-semibold">Cash Flow</h3>
              </div>
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-1">Net Cash</div>
                <div className="text-lg font-bold text-white">
                  {fmtCurrency(netCashBasisMetrics?.net_cash_position || 0)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: 'cash_flow_1d', lbl: 'Day' },
                  { k: 'cash_flow_1w', lbl: 'Week' },
                  { k: 'cash_flow_1m', lbl: 'Month' },
                ].map(({ k, lbl }) => {
                  const flow = netCashBasisMetrics?.[k];
                  return (
                    <div key={k} className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">
                      <div className="text-[10px] text-gray-400 mb-1">{lbl}</div>
                      <div className={`text-xs font-bold ${chipColor(flow)}`}>
                        {flow != null ? `${flow >= 0 ? '+' : ''}${fmtCurrency(Math.abs(flow))}` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* TOP INSTITUTIONS */}
          {institutions.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4"
            >
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-semibold">Top Institutions</h3>
                </div>
                <div className="space-y-2">
                  {institutions.map((inst, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: inst.color }} />
                        <div>
                          <div className="text-sm font-medium text-white">{inst.name}</div>
                          <div className="text-xs text-gray-400">{inst.accounts} account{inst.accounts !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white">{inst.percentage.toFixed(1)}%</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* TOP POSITIONS */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-4"
          >
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-semibold">Top Holdings</h3>
                </div>
                <button
                  onClick={() => router.push('/positions')}
                  className="text-xs text-gray-400 hover:text-gray-200 inline-flex items-center gap-1 transition"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {topPositionsData.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">No positions</div>
              ) : (
                <div className="space-y-1.5">
                  {topPositionsData.map((p, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handlePositionClick(p)}
                      className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/15 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: assetColors[p.type] || assetColors.other }}
                        />
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-sm font-medium text-white truncate">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.id}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-sm font-semibold text-white">{fmtCurrency(p.value)}</div>
                        <div className={`text-xs font-medium ${chipColor(p.pct)}`}>
                          {fmtPct(p.pct)}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          {/* QUICK ACTIONS */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-4 mb-8"
          >
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/accounts')}
                className="rounded-xl bg-gradient-to-br from-indigo-600/70 to-indigo-500/50 hover:to-indigo-500/60 border border-indigo-400/20 px-4 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-500/20"
              >
                <Wallet className="w-5 h-5" /> Accounts
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/positions')}
                className="rounded-xl bg-gradient-to-br from-emerald-600/70 to-emerald-500/50 hover:to-emerald-500/60 border border-emerald-400/20 px-4 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
              >
                <Layers className="w-5 h-5" /> Positions
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/reports')}
                className="rounded-xl bg-gradient-to-br from-amber-600/70 to-amber-500/50 hover:to-amber-500/60 border border-amber-400/20 px-4 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20"
              >
                <TrendingUp className="w-5 h-5" /> Reports
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/command-center')}
                className="rounded-xl bg-gradient-to-br from-purple-600/70 to-purple-500/50 hover:to-purple-500/60 border border-purple-400/20 px-4 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-500/20"
              >
                <BarChart3 className="w-5 h-5" /> Analytics
              </motion.button>
            </div>
          </motion.section>
        </main>

        {/* BOTTOM NAVIGATION */}
        <BottomNav activeTab={activeTab} onChange={handleTabChange} />

        {/* FAB */}
        <FAB onClick={() => setShowQuickAdd(true)} />

        {/* POSITION DETAIL SHEET */}
        <PositionDetailSheet
          position={selectedPosition}
          isOpen={showPositionDetail}
          onClose={() => setShowPositionDetail(false)}
        />

        {/* QUICK ADD SHEET */}
        <BottomSheet isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} title="Quick Add">
          <div className="space-y-3">
            <button className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-left hover:bg-white/10 transition">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/15">
                  <Plus className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Add Position</div>
                  <div className="text-xs text-gray-400">Add stocks, crypto, or other assets</div>
                </div>
              </div>
            </button>
            <button className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-left hover:bg-white/10 transition">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Add Account</div>
                  <div className="text-xs text-gray-400">Create a new financial account</div>
                </div>
              </div>
            </button>
            <button className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-left hover:bg-white/10 transition">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/15">
                  <Target className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Set Goal</div>
                  <div className="text-xs text-gray-400">Track your financial goals</div>
                </div>
              </div>
            </button>
          </div>
        </BottomSheet>
      </div>
    </PullToRefresh>
  );
}
