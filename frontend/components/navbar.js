// components/Navbar.js
import { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

import { QuickStartButton } from '@/components/QuickStartModal';
import { QuickReconciliationButton } from '@/components/modals/QuickReconciliationModal';
import { QuickEditDeleteButton } from '@/components/modals/QuickEditDeleteModal';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';

import EggMascot from '@/components/EggMascot';

import { AuthContext } from '@/context/AuthContext';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useDataStore } from '@/store/DataStore';

import {
  User, Settings, LogOut, HelpCircle, Shield, Clock,
  ChevronDown, Activity, Plus, TrendingUp, TrendingDown
} from 'lucide-react';

import { formatCurrency, formatStockPrice } from '@/utils/formatters';

// ---- Layout constants
const NAV_BAR_H = 64;      // 16 * 4px
const TICKER_H  = 32;      // 8  * 4px
const HEADER_TOTAL_H = NAV_BAR_H + TICKER_H; // 96

// ---- rAF-throttled scroll state setter
function useRafScroll(cb) {
  const ticking = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => {
          cb();
          ticking.current = false;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [cb]);
}

// ---------------------- StockTicker ----------------------
const StockTicker = () => {
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const contentWidthRef = useRef(0);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const { positions, loading: positionsLoading, error: positionsError } = useGroupedPositions();
  const { actions } = useDataStore();

  // Nudge a fetch if we truly have nothing (defensive)
  useEffect(() => {
    if (!positionsLoading && (!positions || positions.length === 0)) {
      actions?.fetchGroupedPositionsData?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsLoading]);

  const { summary: portfolioSummary, loading: summaryLoading } = usePortfolioSummary();

  // Sample data if user has no positions
  const sampleStocks = [
    { symbol: 'AAPL',  price: 182.52, changePercent: 1.30, isUp: true },
    { symbol: 'GOOGL', price: 142.18, changePercent: -0.86, isUp: false },
    { symbol: 'MSFT',  price: 378.91, changePercent: 1.22, isUp: true },
    { symbol: 'AMZN',  price: 156.33, changePercent: 2.10, isUp: true },
    { symbol: 'TSLA',  price: 238.45, changePercent: -2.32, isUp: false },
    { symbol: 'META',  price: 456.78, changePercent: 1.99, isUp: true },
    { symbol: 'NVDA',  price: 678.90, changePercent: 1.85, isUp: true },
    { symbol: 'BTC',   price: 64230.50, changePercent: 1.96, isUp: true },
  ];

  // Map grouped positions for ticker
  const userStocks = useMemo(() => {
    if (!positions || positions.length === 0) return [];
    return positions
      .filter(pos =>
        pos.asset_type === 'security' ||
        pos.asset_type === 'crypto' ||
        pos.asset_type === 'metal'
      )
      .sort((a, b) => (b.total_current_value || 0) - (a.total_current_value || 0))
      .slice(0, 10)
      .map(pos => ({
        symbol: pos.identifier,
        name: pos.name,
        value: pos.total_current_value,
        price: pos.latest_price_per_unit,
        dayChangePercent: (pos.value_1d_change_pct || 0),
        weekChangePercent: (pos.value_1w_change_pct || 0),
        ytdChangePercent: (pos.value_ytd_change_pct || 0),
        totalGainLossPercent: typeof pos.total_gain_loss_pct === 'number' ? pos.total_gain_loss_pct * 100 : null,
        isUp1d: (pos.value_1d_change_pct || 0) >= 0,
        isUp1w: (pos.value_1w_change_pct || 0) >= 0,
        isUpYtd: (pos.value_ytd_change_pct || 0) >= 0,
        isUpTotal: (pos.total_gain_loss_pct || 0) >= 0,
      }));
  }, [positions]);

  const hasPositions = userStocks.length > 0;
  const isLoading = positionsLoading || summaryLoading;
  const items = hasPositions ? userStocks : sampleStocks;

  // Render list 3x for seamless loop
  const tickerContent = useMemo(() => [...items, ...items, ...items], [items]);

  // Measure width of one loop copy
  const measure = useCallback(() => {
    if (trackRef.current && containerRef.current) {
      const trackWidth = trackRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      // since we render content 3x, a single copy is trackWidth / 3
      contentWidthRef.current = trackWidth > 0 ? trackWidth / 3 : containerWidth;
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, tickerContent.length]);

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      pausedRef.current = document.visibilityState !== 'visible';
      if (!pausedRef.current && rafRef.current == null) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation loop
  const tick = useCallback(() => {
    if (prefersReducedMotion.current) return;
    if (pausedRef.current) { rafRef.current = null; return; }

    // advance ~36px/s @ 60fps
    posRef.current -= 0.6;
    const singleWidth = contentWidthRef.current || 1000;

    if (Math.abs(posRef.current) >= singleWidth) {
      posRef.current += singleWidth; // loop
    }

    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${posRef.current}px)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!prefersReducedMotion.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [tick]);

  const onMouseEnter = () => { pausedRef.current = true; };
  const onMouseLeave = () => {
    pausedRef.current = false;
    if (!rafRef.current && !prefersReducedMotion.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  // Helpers for right-side performance capsule
  const getPeriod = useCallback((key) => {
    return portfolioSummary?.periodChanges?.[key] ?? null;
  }, [portfolioSummary]);

  const renderChip = useCallback((label, data, fallbackAmt = null, fallbackPct = null) => {
    const amt = data?.netWorthChange ?? fallbackAmt ?? null;
    const pct = data?.netWorthPercent ?? fallbackPct ?? null;
    const up  = typeof pct === 'number' ? pct >= 0 : (typeof amt === 'number' ? amt >= 0 : null);
    const color = up == null ? 'text-gray-300' : up ? 'text-green-400' : 'text-red-400';

    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded" title={label}>
        <span className="text-gray-400">{label}:</span>
        <span className={`font-medium ${color}`}>
          {amt != null ? `${amt >= 0 ? '+' : ''}${formatCurrency(Math.abs(amt)).replace('$','')}` : '—'}
        </span>
        <span className="text-gray-500">/</span>
        <span className={`font-medium ${color}`}>
          {typeof pct === 'number' ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
        </span>
      </div>
    );
  }, []);

  const totalValue = useMemo(() => {
    return (
      portfolioSummary?.totals?.netWorth ??
      portfolioSummary?.netWorth ??
      portfolioSummary?.currentNetWorth ??
      null
    );
  }, [portfolioSummary]);

  return (
    <div
      ref={containerRef}
      className="relative h-8 bg-gray-950 border-t border-gray-800 overflow-hidden z-40"
      role="region"
      aria-label="Live market ticker"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-10">
          <div className="text-gray-400 text-sm">Loading portfolio data…</div>
        </div>
      )}

      {/* Scrolling track */}
      <div
        ref={trackRef}
        className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap will-change-transform"
        style={{ transform: 'translateX(0px)' }}
      >
        {tickerContent.map((stock, index) => (
          <div
            key={`${stock.symbol}-${index}`}
            className="inline-flex items-center gap-4 px-6 border-r border-gray-800"
          >
            {/* Symbol + optional name */}
            <div>
              <span className="font-semibold text-gray-300">{stock.symbol}</span>
              {stock.name && (
                <span className="text-xs text-gray-500 ml-1">({String(stock.name).slice(0, 15)}…)</span>
              )}
            </div>

            {/* Labeled Market Price */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Price:</span>
              <span className="text-gray-300">
                {stock.price !== null && stock.price !== undefined ? formatStockPrice(stock.price) : 'N/A'}
              </span>
            </div>

            {/* Labeled Value when available (user positions only) */}
            {typeof stock.value === 'number' && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Value:</span>
                <span className="text-gray-300">{formatCurrency(stock.value)}</span>
              </div>
            )}

            {/* 1D change (or sample % if no positions) */}
            <span
              className={`flex items-center text-sm ${
                (hasPositions ? stock.isUp1d : stock.isUp) ? 'text-green-400' : 'text-red-400'
              }`}
              title="1D change"
            >
              {(hasPositions ? stock.isUp1d : stock.isUp)
                ? <TrendingUp className="w-3 h-3 mr-1" />
                : <TrendingDown className="w-3 h-3 mr-1" />
              }
              {(() => {
                const pct = hasPositions ? stock.dayChangePercent : stock.changePercent;
                if (typeof pct === 'number') return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
                return '—';
              })()}
            </span>

            {/* Optional: 1W / YTD / Total chips inside each row (can be commented if too dense) */}
            {hasPositions && (
              <>
                <span
                  className={`hidden md:flex items-center text-sm ${
                    stock.isUp1w ? 'text-green-400' : 'text-red-400'
                  }`}
                  title="1W change"
                >
                  {stock.isUp1w ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {typeof stock.weekChangePercent === 'number'
                    ? `${stock.weekChangePercent >= 0 ? '+' : ''}${stock.weekChangePercent.toFixed(1)}%`
                    : '—'}
                </span>
                <span
                  className={`hidden lg:flex items-center text-sm ${
                    stock.isUpYtd ? 'text-green-400' : 'text-red-400'
                  }`}
                  title="YTD change"
                >
                  {stock.isUpYtd ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {typeof stock.ytdChangePercent === 'number'
                    ? `${stock.ytdChangePercent >= 0 ? '+' : ''}${stock.ytdChangePercent.toFixed(1)}%`
                    : '—'}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Right-side portfolio performance capsule */}
      {!isLoading && hasPositions && portfolioSummary && (
        <div className="absolute right-4 top-0 h-full flex items-center bg-gray-950 pl-4 z-50">
          <div className="flex items-center gap-3 text-sm">
            {/* Total Value */}
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded">
              <span className="text-gray-400">Total Value:</span>
              <span className="font-semibold text-gray-200">
                {totalValue != null ? formatCurrency(totalValue) : '—'}
              </span>
            </div>

            {/* Multi-period chips */}
            {renderChip('1D',  getPeriod('1d'))}
            {renderChip('1W',  getPeriod('1w'))}
            {renderChip('YTD', getPeriod('ytd'))}
            {renderChip(
              'Gain/Loss',
              getPeriod('total'),
              portfolioSummary?.totals?.totalGainLossAmt ?? null,
              (typeof portfolioSummary?.totals?.totalGainLossPct === 'number'
                ? portfolioSummary?.totals?.totalGainLossPct
                : null)
            )}
          </div>
        </div>
      )}

      {/* Gradient masks */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-gray-950 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-gray-950 to-transparent" />
    </div>
  );
};

// ---------------------- Navbar ----------------------
const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountError, setAccountError] = useState(null);
  const { logout, user } = useContext(AuthContext);
  const router = useRouter();

  // Toggle scrolled with rAF throttling
  useRafScroll(() => {
    setScrolled(window.scrollY > 10);
  });

  // Load accounts once
  const loadAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    setAccountError(null);
    try {
      const response = await fetchAccounts();
      setAccounts(response.data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setAccountError('Failed to load accounts');
      setAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.user-dropdown')) {
        setIsDropdownOpen(false);
      }
      if (isManualAddOpen && !event.target.closest('.manual-add-dropdown')) {
        setIsManualAddOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, isManualAddOpen]);

  const getInitials = useCallback(() => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }, [user]);

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email || 'User';

  return (
    <>
      {/* Fixed header block: nav + ticker */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          role="navigation"
          aria-label="Primary"
          className={`transition-all duration-300 ${
            scrolled
              ? 'bg-gray-900/95 backdrop-blur-md shadow-lg'
              : 'bg-gradient-to-r from-gray-900 via-gray-850 to-blue-900'
          }`}
        >
          {/* Top bar (64px) */}
          <div className="h-16 px-4 flex items-center justify-between">

              {/* Left side - Eggbert Mascot */}
              <div className="flex items-center gap-3">
                <Link href="/" aria-label="Home">
                  <motion.div whileHover={{ scale: 1.1, rotate: -2 }}>
                    <EggMascot variant="navbar" portfolioValue={portfolioSummary?.netWorth ?? 0} userTenureDays={user?.tenure_days ?? 0} />
                  </motion.div>
                </Link>
              </div>
            {/* Center-aligned Quick Actions */}
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 ml-20">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <QuickStartButton />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <QuickEditDeleteButton />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <QuickReconciliationButton />
                </motion.div>

                {/* Manual Add Dropdown */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative manual-add-dropdown"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add New</span>
                    <motion.div animate={{ rotate: isManualAddOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {isManualAddOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50"
                      >
                        <AddAccountButton
                          fetchAccounts={loadAccounts}
                          className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors"
                        />
                        <AddPositionButton
                          accounts={accounts}
                          fetchPositions={() => {}}
                          className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>

            {/* Right side - User Menu */}
            <div className="relative user-dropdown">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-700"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                    {getInitials()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white">{displayName}</p>
                  <p className="text-xs text-gray-400">Premium Member</p>
                </div>
                <motion.div animate={{ rotate: isDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50"
                  >
                    {/* User info header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg">
                          {getInitials()}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">{displayName}</p>
                          <p className="text-sm text-blue-100 truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Market Data Status */}
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-gray-300">Market Data</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UpdateStatusIndicator />
                          <span className="text-xs text-green-400">Live</span>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                      <Link href="/profile">
                        <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                          <User className="w-5 h-5" />
                          <span>Profile</span>
                        </motion.div>
                      </Link>

                      <Link href="/admin">
                        <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                          <Shield className="w-5 h-5" />
                          <span>Admin Panel</span>
                        </motion.div>
                      </Link>

                      <Link href="/settings">
                        <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                          <Settings className="w-5 h-5" />
                          <span>Settings</span>
                        </motion.div>
                      </Link>

                      <Link href="/scheduler">
                        <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                          <Clock className="w-5 h-5" />
                          <span>Scheduler</span>
                        </motion.div>
                      </Link>

                      <Link href="/help">
                        <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                          <HelpCircle className="w-5 h-5" />
                          <span>Help & Support</span>
                        </motion.div>
                      </Link>

                      <div className="border-t border-gray-700 mt-2 pt-2">
                        <motion.button
                          whileHover={{ x: 4 }}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-all text-red-400 hover:text-red-300"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Logout</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Ticker (32px) inside the same fixed nav */}
          <StockTicker />
        </motion.nav>
      </div>

      {/* Spacer to push page content below fixed header */}
      <div style={{ height: HEADER_TOTAL_H }} aria-hidden />

      {/* Optional: page-wide skip link target */}
      <a id="content" className="sr-only">Main content</a>
    </>
  );
};

export default Navbar;
