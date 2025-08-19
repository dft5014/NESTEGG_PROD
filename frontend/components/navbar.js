// components/Navbar.js
import { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { QuickStartButton } from '@/components/QuickStartModal';
import { AuthContext } from '@/context/AuthContext';
import {
  User, Settings, LogOut, HelpCircle, Shield, Clock,
  ChevronDown, Activity, Plus,
  TrendingUp, TrendingDown
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { QuickReconciliationButton } from '@/components/modals/QuickReconciliationModal';
import { QuickEditDeleteButton } from '@/components/modals/QuickEditDeleteModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useGroupedPositions } from '@/store/hooks/useGroupedPositions';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { formatCurrency, formatStockPrice } from '@/utils/formatters';
import { useDataStore } from '@/store/DataStore';

// ---- Layout constants (keep header heights in one place)
const NAV_BAR_H = 64;    // 16 * 4px
const TICKER_H  = 32;    // 8  * 4px
const HEADER_TOTAL_H = NAV_BAR_H + TICKER_H; // 96

// ---- rAF throttle helper
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

  const {
    positions,
    loading: positionsLoading,
  } = useGroupedPositions();

  const {
    summary: portfolioSummary,
    loading: summaryLoading
  } = usePortfolioSummary();

  // When user has no positions, show small sample set
  const sampleStocks = [
    { symbol: 'AAPL', price: 182.52, changePercent: 1.30, isUp: true },
    { symbol: 'GOOGL', price: 142.18, changePercent: -0.86, isUp: false },
    { symbol: 'MSFT', price: 378.91, changePercent: 1.22, isUp: true },
    { symbol: 'AMZN', price: 156.33, changePercent: 2.10, isUp: true },
    { symbol: 'TSLA', price: 238.45, changePercent: -2.32, isUp: false },
    { symbol: 'META', price: 456.78, changePercent: 1.99, isUp: true },
    { symbol: 'NVDA', price: 678.90, changePercent: 1.85, isUp: true },
    { symbol: 'BTC',  price: 64230.50, changePercent: 1.96, isUp: true },
  ];

  // Map your grouped positions into ticker items
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
        isUp: (pos.value_1d_change_pct || 0) >= 0
      }));
  }, [positions]);

  const hasPositions = userStocks.length > 0;
  const isLoading = positionsLoading || summaryLoading;
  const items = hasPositions ? userStocks : sampleStocks;

  // Render list 3x for seamless loop
  const tickerContent = useMemo(() => [...items, ...items, ...items], [items]);

  // Measure track width after first render and when items change
  const measure = useCallback(() => {
    if (trackRef.current && containerRef.current) {
      const trackWidth = trackRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      contentWidthRef.current = trackWidth > 0 ? trackWidth / 3 : containerWidth; // single copy width
    }
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, tickerContent.length]);

  // Pause when tab is hidden
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

    // Advance by 0.6px per frame (~36px/s @60fps) – subtle and smooth
    posRef.current -= 0.6;
    const singleWidth = contentWidthRef.current || 1000;

    // Reset translate when a full copy has scrolled past
    if (Math.abs(posRef.current) >= singleWidth) {
      posRef.current += singleWidth;
    }

    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${posRef.current}px)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Start loop on mount
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

      <div
        ref={trackRef}
        className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap will-change-transform"
        style={{ transform: 'translateX(0px)' }}
      >
        {tickerContent.map((stock, index) => (
          <div
            key={`${stock.symbol}-${index}`}
            className="inline-flex items-center gap-3 px-6 border-r border-gray-800"
          >
            <div>
              <span className="font-semibold text-gray-300">{stock.symbol}</span>
              {stock.name && (
                <span className="text-xs text-gray-500 ml-1">({String(stock.name).slice(0, 15)}…)</span>
              )}
            </div>
            <span className="text-gray-400">
              {stock.price !== null && stock.price !== undefined ? formatStockPrice(stock.price) : 'N/A'}
            </span>

            {typeof stock.value === 'number' && (
              <span className="text-gray-400">{formatCurrency(stock.value)}</span>
            )}

            <span
              className={`flex items-center text-sm ${stock.isUp ? 'text-green-400' : 'text-red-400'}`}
              title="1D change"
            >
              {stock.isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {`${stock.dayChangePercent !== undefined
                ? (stock.dayChangePercent >= 0 ? '+' : '') + stock.dayChangePercent.toFixed(1)
                : (stock.changePercent >= 0 ? '+' : '') + (stock.changePercent ?? 0).toFixed(1)
              }%`}
            </span>
          </div>
        ))}
      </div>

      {/* Right-side portfolio summary */}
      {!isLoading && hasPositions && portfolioSummary && (
        <div className="absolute right-4 top-0 h-full flex items-center bg-gray-950 pl-4 z-50">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded">
              <span className="text-gray-400">Portfolio:</span>
              <span className={`font-medium ${portfolioSummary.periodChanges?.['1d']?.netWorthPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolioSummary.periodChanges?.['1d']?.netWorthPercent >= 0 ? '+' : ''}
                {portfolioSummary.periodChanges?.['1d']?.netWorthPercent?.toFixed(2) || '0.00'}% Today
              </span>
            </div>
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
      {/* Fixed header block: nav + ticker (z-40) */}
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
